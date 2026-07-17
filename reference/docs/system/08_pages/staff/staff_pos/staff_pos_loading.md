# Staff POS — `/pos` · Loading States

> **TL;DR:** ✅ implemented · how `/pos` behaves while data is in flight. Three effective layers:
> (0) **AuthGuard/RoleGuard gate** — renders `null` until staff JWT is confirmed (then
> `RoleGuard` renders an access-denied message for roles below CASHIER);
> (1) **no route-level spinner** — there is no `loading.tsx` anywhere in the `(dashboard)` route
> group or the `pos/` sub-folder; (2) **two silent `useQuery` hooks** that default to `[]` and
> render nothing special while fetching — no skeleton, no per-query spinner, no error-retry UI.
> The only visible "loading" feedback is the **`createOrder.isPending` button label** ("Đang tạo...")
> during order submission.
> Page overview → [staff_pos.md](staff_pos.md) · BE view → [staff_pos_be.md](staff_pos_be.md) ·
> Cross-page flow → [staff_pos_crosspage_dataflow.md](staff_pos_crosspage_dataflow.md) ·
> Scenario → [SCENARIO_POS_ORDER.md](SCENARIO_POS_ORDER.md)

> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(dashboard)/pos/page.tsx` · `fe/src/components/guards/AuthGuard.tsx` ·
> `fe/src/components/guards/RoleGuard.tsx` · `fe/src/features/menu/components/CategoryTabs.tsx`.

---

## Loading Layers (outer → inner)

```
0. Auth gate       → AuthGuard renders null until Zustand user confirmed or getMe() resolves
                     RoleGuard renders access-denied text if role < CASHIER
1. Route nav       → NO spinner — (dashboard)/loading.tsx does NOT exist
2. POS page mounts → NO <Suspense> boundary
3. POSContent runs → 2 useQuery hooks fire; NEITHER drives a skeleton or spinner
4. "Tạo Đơn" btn  → createOrder.isPending: button label → "Đang tạo...", button disabled
```

### 0 — AuthGuard / RoleGuard gate · `AuthGuard.tsx:7-25` · `RoleGuard.tsx:10-24`

`POSPage` is always wrapped in both guards (`pos/page.tsx:25-29`):

```tsx
// pos/page.tsx:25-29
<AuthGuard>
  <RoleGuard minRole={Role.CASHIER}>
    <POSContent />
  </RoleGuard>
</AuthGuard>
```

**AuthGuard** (`AuthGuard.tsx:7-25`):

- On mount, reads `useAuthStore(s => s.user)`.
- If `user` is already in Zustand memory (e.g. session is live), renders children immediately — **zero delay**.
- If `user === null`, fires `getMe()` (one `GET /auth/me` call) on the first mount (`attempted.current` ref prevents double-call).
  - On success: calls `setAuth(u, token)` → Zustand user populates → re-render → children shown.
  - On failure: `router.push('/login')` — user is redirected.
- **While `user === null`:** `return null` (`AuthGuard.tsx:23`). The page renders a **blank white screen** — no spinner, no skeleton, no "loading" text.

**RoleGuard** (`RoleGuard.tsx:10-24`):

- Runs after `AuthGuard` confirms a user is present.
- Compares `Role[user.role.toUpperCase()]` against `minRole = Role.CASHIER`.
- If the role value is below `CASHIER`: renders `<div className="text-urgent p-8 text-center font-body">Không có quyền truy cập trang này</div>` (`RoleGuard.tsx:18-20`).
- If the role passes: renders children — `POSContent` mounts.
- **No loading state** — this check is synchronous against the already-resolved Zustand store.

### 1 — Route-level spinner · `(dashboard)/loading.tsx`

**Does not exist.** `fe/src/app/(dashboard)/` contains only `admin/`, `cashier/`, `kds/`,
`layout.tsx`, `orders/`, and `pos/`. There is no `loading.tsx` at the dashboard group level and no
`pos/loading.tsx` inside the pos sub-folder. Navigation into `/pos` (e.g. from the login redirect
or a sidebar link) shows **no route-level spinner** — the browser displays blank until the page JS
hydrates.

Note: the customer `(shop)/` group has `(shop)/loading.tsx` (orange ring spinner). The staff
`(dashboard)/` group has no equivalent. The only `loading.tsx` present under `(dashboard)/` is
`admin/loading.tsx` — scoped to the admin sub-tree only.

The `(dashboard)/layout.tsx` wraps everything in `<OrdersWSProvider>` — this is a context mount,
not a loading boundary. It does not render any loading UI.

### 2 — Suspense boundary

**None.** `POSPage` wraps `POSContent` in `<AuthGuard>` + `<RoleGuard>` (`pos/page.tsx:24-30`), not
in a `<Suspense>`. There is no `useSearchParams` or other hook in `POSContent` that would require
one.

### 3 — Per-query states · `pos/page.tsx:39-51`

The page fires two `useQuery` calls. **Neither** destructures `isLoading` or `isError`.

| Query | `queryKey` | Default | Loading UI | staleTime | Notes |
|---|---|---|---|---|---|
| Categories | `['categories']` | `[]` (`pos/page.tsx:39`) | **none** | 5 min | `CategoryTabs` renders only "Tất cả" tab while `categories === []` (`CategoryTabs.tsx:14-23`) |
| Products | `['products', selectedCategory]` | `[]` (`pos/page.tsx:45`) | **none** | 5 min | Product grid renders an **empty `<div className="grid…">`** — zero cells, no pulse placeholder |

On a revisit within 5 minutes, TanStack returns cached data immediately — no loading window at all.

On a cold load the grid is momentarily empty. There is **no skeleton, no spinner, and no error state**
— the queries fall through silently to `[]` on any failure (`.then(r => r.data?.data ?? r.data ?? [])`,
`pos/page.tsx:41,49`).

### 4 — Mutation pending state · `pos/page.tsx:206-211`

The `createOrder` `useMutation` (`pos/page.tsx:90-104`) exposes `isPending`:

```
pos/page.tsx:207  disabled={cart.length === 0 || createOrder.isPending}
pos/page.tsx:211  {createOrder.isPending ? 'Đang tạo...' : 'Tạo Đơn →'}
```

While the `POST /orders` request is in flight:
- The "Tạo Đơn →" button label changes to **"Đang tạo..."**.
- The button is `disabled` + `opacity-40 cursor-not-allowed` (Tailwind classes, `pos/page.tsx:209`).
- No spinner element, no overlay — text label change only.

---

## Main content branch

The POS page has **two top-level render paths**, not a priority-ordered state table inside a single
`<main>` region.

### Path A — "Waiting for kitchen" screen · `pos/page.tsx:107-133`

When `activeOrder !== null`, the entire page is replaced by a centred card:

```
pos/page.tsx:107  if (activeOrder) {
pos/page.tsx:109    <div className="flex flex-col items-center justify-center min-h-screen …">
pos/page.tsx:110-132  <bg-card rounded-2xl> showing order number + "⏳ Bếp đang chuẩn bị..." + 2 buttons
```

This is **not a loading state in the data-fetching sense** — it is a UI-state branch that replaces
the full order-building layout after a successful `POST /orders`. `activeOrder` is set by the
`onSuccess` callback (`pos/page.tsx:98-100`). The page stays in this state until either:

- The WS delivers `order_status_changed` with the matching `order_id` → the handler calls
  `GET /orders/:id` (`pos/page.tsx:62`) → if `order.status === 'ready'` → `router.push` to
  `/cashier/payment/:id` (`pos/page.tsx:64-67`). No visible spinner during the `GET /orders/:id`
  call — the page stays on the waiting card.
- The cashier taps "Đến thanh toán" manually (same route, `pos/page.tsx:118`).
- The cashier taps "Tạo đơn mới" → `setActiveOrder(null)` (`pos/page.tsx:125`), returning to Path B.

For WS and endpoint detail see [staff_pos_be.md](staff_pos_be.md).

### Path B — Order-building layout · `pos/page.tsx:135-224`

Normal two-column layout. States in priority order for the left (product) pane:

| Order | Condition | Renders |
|---|---|---|
| 1 | `products` query fetching + cache empty | **Empty grid** — `<div className="grid grid-cols-2 …">` with zero children (`pos/page.tsx:150-165`) |
| 2 | `products.length === 0` after fetch | Same empty grid — no empty-state message |
| 3 | `products.length > 0` | Product cards rendered via `.map()` (`pos/page.tsx:151-164`) |

Right (order pane) — `cart.length === 0` shows the placeholder text:

```
pos/page.tsx:176-177  <p className="text-muted-fg text-sm text-center mt-10">Chọn món từ menu</p>
```

Otherwise renders the cart item list with quantity controls.

### Skeleton / empty-state details

**No skeleton.** The product grid renders zero-child grid markup while `products` is empty (loading
or genuinely empty). There are no `animate-pulse` placeholder cards anywhere in `pos/page.tsx` or
`CategoryTabs.tsx`. The empty grid takes up no visible space — the page looks incomplete rather than
"loading".

`CategoryTabs` renders a single "Tất cả" button while `categories === []`, then re-renders to add
category buttons once the query resolves (`CategoryTabs.tsx:14-23, 24-38`). This causes a minor
**layout shift** in the tab strip when categories arrive.

---

## Search / interaction gating

There is **no search input and no interaction that withholds a fetch** on this page.

The `products` query has no `enabled:` key in its `useQuery` config (`pos/page.tsx:45-51`) — it is
always enabled. Selecting a category tab calls `setSelectedCategory` (`pos/page.tsx:144-147`), which
changes the `queryKey` from `['products', null]` to `['products', '<uuid>']` and triggers a new
fetch. Note: the BE response may not filter by `category_id` — see [staff_pos_be.md](staff_pos_be.md)
Flag 1 for the unwired `ListProductsByCategoryAvailable` root cause.

The "Tạo Đơn" button is gated by `cart.length === 0 || createOrder.isPending` (`pos/page.tsx:207`),
which withholds the mutation (not a data fetch) — covered in Layer 4 above.

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **Blank screen during auth resolve** | `AuthGuard` renders `null` while `getMe()` is in flight (`AuthGuard.tsx:23`). On a cold load (no Zustand user in memory), the cashier sees a blank white screen with no feedback — no spinner, no skeleton, no "signing in" text. Duration is one network round-trip to `GET /auth/me`. |
| 2 | **No route-level spinner for `(dashboard)`** | `(dashboard)/loading.tsx` does not exist. Navigation into `/pos` (and every other dashboard page) has no shell spinner during JS loading. Contrast: `(shop)/loading.tsx` provides an orange ring for customer pages. |
| 3 | **No product skeleton** | Cold load renders a blank grid. There are no `animate-pulse` placeholder cards. A cashier briefly sees an empty POS with only the "Tất cả" tab and no products. |
| 4 | **No error UI for catalog queries** | Both `categories` and `products` queries default to `[]` on failure (`pos/page.tsx:41,49`). A network error or 5xx from BE renders identically to an empty catalog — the cashier sees a blank product grid with no indication that something went wrong and no retry button. |
| 5 | **Category tab shift on load** | `CategoryTabs` renders only "Tất cả" until `categories` resolves. Once the query returns, dynamic tab buttons are injected — a visible width shift in the tab strip. No placeholder tabs are shown. |
| 6 | **"Waiting for kitchen" screen has no timeout or error path** | After `POST /orders` succeeds, the page waits indefinitely for a WS `order_status_changed` → `ready` event. If the WS is disconnected and the status fires during the outage it is not replayed. The only recovery is the manual "Đến thanh toán" button (`pos/page.tsx:118`). For details see [staff_pos_be.md](staff_pos_be.md). |
| 7 | **WS-triggered GET /orders/:id has no visible spinner** | When the WS event fires, `api.get('/orders/:orderId')` is awaited (`pos/page.tsx:62`) before `router.push`. The "waiting for kitchen" card remains static during this call — there is no indicator that a redirect is imminent. |
