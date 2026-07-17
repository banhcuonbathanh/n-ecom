# ASPECT 2 — Data Fetching & Server State

All API calls route correctly through `lib/api-client.ts` (no raw `fetch` or direct `axios` in components — the only `fetch()` call is in the dev-only `DevPanel`). TanStack Query is used consistently for every server-state query. SSE hooks are solid: they use `fetchEventSource` with exponential backoff, proper `AbortController` cleanup on unmount, and parse errors are silently swallowed. The main pain points are: no central query-key registry (keys are inline strings everywhere, leading to drift in two real places), two cross-domain invalidation gaps, and a silent token-queue failure in the 401-refresh interceptor that can cause requests to be silently dropped.

---

## Findings

### DF-1 — 🔴 Critical — `api-client.ts` refresh interceptor drops queued requests when multiple 401s fire simultaneously

**File:** `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/lib/api-client.ts` lines 17–55

**Problem:** `isRefreshing` is a module-level boolean flag. When the token expires and multiple concurrent requests all receive 401, only the **first** request triggers a refresh; every subsequent one skips the `if (!isRefreshing)` block, sets `original._retry = true`, and immediately calls `return api(original)` **before** the new token is written into the store. Those retries therefore hit the server again with the stale (or empty) token, receive a second 401, and now `_retry` is already `true` so they are rejected permanently. In practice, on the POS and admin-overview pages that fire 3–5 concurrent queries on load, only the first request will succeed after a token refresh; the rest will fail silently.

**Fix:** Replace the bare `isRefreshing` bool with a `Promise`-based queue. While refresh is in flight, push subsequent failing requests onto a pending-queue array and resolve them (replay) once the new token is set, or reject them all if the refresh call itself fails. Standard pattern:
```ts
let refreshPromise: Promise<string> | null = null
// in the 401 handler:
original._retry = true
if (!refreshPromise) {
  refreshPromise = api.post('/auth/refresh')
    .then(r => { const t = r.data.data.access_token; useAuthStore.getState().setAccessToken(t); return t })
    .finally(() => { refreshPromise = null })
}
return refreshPromise.then(() => api(original))
```

---

### DF-2 — 🟠 Major — Admin category mutations do not invalidate the client-facing `['categories']` cache

**Files:**
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/admin/categories/page.tsx` lines 49, 66
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(shop)/menu/page.tsx` line 53
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/pos/page.tsx` line 40

**Problem:** The admin categories page fetches under key `['admin', 'categories']` and only invalidates that key on create/update/delete. The menu and POS pages fetch under `['categories']` (no `'admin'` prefix) — a **different cache entry** pointing to the same endpoint. After an admin creates or renames a category, the menu and POS pages keep showing the stale list (staleTime 5 min). A cashier won't see new categories until they hard-reload.

**Fix:** After each `saveMut` / `deleteMut` success, also invalidate the client cache:
```ts
qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
qc.invalidateQueries({ queryKey: ['categories'] })          // add this line
```
Or, better long-term, normalise both pages to the same key (requires a shared query-key registry — see DF-3).

---

### DF-3 — 🟠 Major — `['products', id]` (detail) collides with `['products', categoryId, searchQuery]` (list) — TanStack Query will match list invalidations and vice-versa

**Files:**
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/hooks/useProductDetail.ts` line 7
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(shop)/menu/page.tsx` line 66
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/pos/page.tsx` line 46

**Problem:** `useProductDetail` uses `['products', id]`. The menu page uses `['products', selectedCategory, searchQuery]`. TanStack Query's partial-match invalidation (`invalidateQueries({ queryKey: ['products'] })`) matches **all** of these. More critically, when `selectedCategory` happens to be a string that looks like a product UUID (any user-navigated route), TanStack Query may return the list entry from the cache as the product detail. This is a structural collision; while it hasn't caused a visible bug yet (the `staleTime: 5min` masks it), it is a ticking clock.

**Fix:** Add a discriminator segment:
- Product detail: `['product', id]` (singular)
- Product list: `['products', selectedCategory, searchQuery]`

Update `useProductDetail` and any invalidation at `['admin', 'products']` → also invalidate `['product']` prefix.

---

### DF-4 — 🟠 Major — Toppings mutation does not invalidate `['admin', 'products']`, so ProductFormModal shows stale topping list

**Files:**
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/admin/toppings/_components/ToppingFormModal.tsx` line 50
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/admin/products/_components/ProductFormModal.tsx` line 45

**Problem:** `ToppingFormModal` only invalidates `['admin', 'toppings']` on save. `ProductFormModal` fetches toppings via `['admin', 'toppings']` — this part is fine. However, when a topping is renamed or its availability toggled, the `['admin', 'products']` cache (staleTime 30 s) keeps showing the old topping name embedded in each product's `toppings[]` array until the product list naturally re-fetches. For the admin reviewing a product edit, the topping drop-down can show a name that no longer matches the current BE state.

**Fix:** In `ToppingFormModal` `onSuccess`, add:
```ts
qc.invalidateQueries({ queryKey: ['admin', 'products'] })
```

---

### DF-5 — 🟠 Major — No central query-key registry; ad-hoc string arrays across 20+ files cause silent drift

**Problem:** Every query key is typed as an inline string array at the call site. The audit found:
- `['categories']` (3 places) vs `['admin', 'categories']` (3 places) — same endpoint, different consumers
- `['orders', 'history']` is written in `HistoryLog.tsx`, `PaidLog.tsx`, `CancelLog.tsx`, and `overview/page.tsx` — all fine for now but any rename drifts silently
- `['admin', 'tasks', staffId, date]` vs `['admin', 'tasks', 'stats', date]` — the `'stats'` vs UUID sentinel value pattern is fragile

**Fix:** Create `src/lib/query-keys.ts` exporting typed factory functions:
```ts
export const QK = {
  categories:    () => ['categories']          as const,
  adminCategories: () => ['admin', 'categories'] as const,
  productDetail: (id: string) => ['product', id] as const,
  products:      (cat?: string | null, q?: string) => ['products', cat ?? null, q ?? ''] as const,
  // ...etc
} as const
```
Then replace inline arrays everywhere with `QK.categories()`.

---

### DF-6 — 🟡 Minor — KDS page stores orders in local `useState` rather than the TanStack Query cache; WS updates mutate local state not the cache

**File:** `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/kds/page.tsx` lines 97–157

**Problem:** KDS seeds from `useQuery` (`['orders', 'kds-initial']`) then copies data into a separate `useState<Order[]>`. All subsequent WS mutations target the local state. This means `queryClient.invalidateQueries({ queryKey: ['orders', 'kds-initial'] })` from any other part of the app does nothing at runtime, and the KDS data is permanently decoupled from the Query cache after mount. This is acceptable if KDS is only updated via WS (which is the case today), but it is an architectural inconsistency that will cause stale data if the WS is momentarily disconnected and the user refreshes the tab.

**Fix:** Either use `queryClient.setQueryData` to mutate `['orders', 'kds-initial']` on each WS event (consistent with how `useOverviewWS` manages `['orders', 'live']`), or document this as intentional and add a `refetch` button.

---

### DF-7 — 🟡 Minor — SSE hooks use `process.env.NEXT_PUBLIC_API_URL` directly instead of the centralised `api` base URL

**Files:**
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/hooks/useOrderSSE.ts` line 70
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/hooks/useOrderMonitorSSE.ts` line 49
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx` line 68

**Problem:** The SSE/WS URL is assembled from `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'` inline. If the `api-client` instance's `baseURL` is ever changed (e.g. via a runtime config), the SSE hooks will silently connect to the wrong URL. The `api-client.ts` already has the single source of truth for this value.

**Fix:** Export `const API_BASE_URL = ...` from `api-client.ts` and import it in the SSE hooks.

---

## What's already good

- Every component-level data fetch uses `useQuery` or `useMutation` — zero raw `fetch()`/`useEffect` API calls in page components.
- `api-client.ts` injects Bearer token via request interceptor, handles 401 with refresh + redirect, and correctly identifies guest tokens to skip refresh.
- All three SSE hooks (`useOrderSSE`, `useAdminSSE`, `useOrderMonitorSSE`) implement exponential backoff with a hard cap, proper `AbortController` cleanup on unmount, and silent parse-error recovery.
- The shared `OrdersWSContext` provides a single WS connection per session for all staff pages (KDS, POS, overview) — no duplicate connections.
- Query stale times are sensibly set: static data (products, categories) at 5 min, real-time data (staff, live-orders) at 0–15 s.
- Mutation pending states are surfaced (buttons disabled, spinners) across almost all mutation paths.
