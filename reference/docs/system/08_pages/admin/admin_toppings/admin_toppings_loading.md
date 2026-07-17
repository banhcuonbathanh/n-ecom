# Admin Toppings — Loading States

> **TL;DR:** ✅ implemented · how `/admin/toppings` behaves while data is in flight. Four layers:
> (1) `AuthGuard` renders `null` (blank) until the in-memory user is known;
> (2) `RoleGuard minRole=MANAGER` blocks the page with an access-denied message if role is too low;
> (3) the shared admin route-level spinner covers navigation;
> (4) a bare `<p>Đang tải...</p>` text (no skeleton) gates the toppings table while the main query
> loads. A second query (`['admin','products']`) has **no loading gate** — it populates the
> "Áp dụng cho sản phẩm" column silently, causing a brief flash until products resolve.
>
> Page overview → [admin_toppings.md](admin_toppings.md) · BE view → [admin_toppings_be.md](admin_toppings_be.md)
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(dashboard)/admin/loading.tsx` · `fe/src/app/(dashboard)/admin/layout.tsx` ·
> `fe/src/app/(dashboard)/admin/toppings/page.tsx` · `_components/ToppingTable.tsx` ·
> `_components/ToppingFormModal.tsx` · `_components/ToppingPageHeader.tsx` ·
> `fe/src/components/guards/AuthGuard.tsx` · `fe/src/components/guards/RoleGuard.tsx` ·
> `fe/src/components/shared/EmptyState.tsx`

---

## Loading Layers (outer → inner)

```
1. AuthGuard           → renders null (blank page) until Zustand user store is hydrated
2. RoleGuard           → renders "Không có quyền…" if role < MANAGER; blocks children
3. Route navigation    → AdminLoading (centered orange spinner, whole admin shell)
4. ToppingsPage mounts → ['admin','toppings'] useQuery fires; ToppingTable gates on isLoading
5. Products side-load  → ['admin','products'] fires in parallel, NO loading gate; feeds productNames map
6. Modal first open    → dynamic() import of ToppingFormModal; saveMut.isPending gates Save button
```

### 1 — AuthGuard · `fe/src/components/guards/AuthGuard.tsx:23`

`AdminLayout` wraps all children in `<AuthGuard>` (`layout.tsx:29`). If `user` is `null` in the
Zustand auth store, `AuthGuard` returns `null` — the page renders a **blank white/dark shell** with
no spinner or message. Simultaneously, a `getMe()` call fires (`AuthGuard.tsx:17`); on success the
store is populated and children mount; on failure the router pushes to `/login`
(`AuthGuard.tsx:19`).

This blank-render window covers the full admin layout including the nav tabs, header, and page
content. There is **no loading indicator** at this layer.

### 2 — RoleGuard · `fe/src/components/guards/RoleGuard.tsx:16-21`

Immediately after `AuthGuard` resolves, `RoleGuard` checks `minRole={Role.MANAGER}`
(`layout.tsx:30`). If the authenticated user's numeric role value is below `MANAGER`, it renders:

```
<div class="text-urgent p-8 text-center font-body">
  Không có quyền truy cập trang này
</div>
```

and **stops rendering `ToppingsPage`**. This is a guard, not a loading state, but it occupies the
same pre-mount window and permanently blocks non-manager roles.

### 3 — Route-level spinner · `fe/src/app/(dashboard)/admin/loading.tsx:1-7`

Next.js App Router renders this file for the **entire `(dashboard)/admin/` route group** during
navigation into any admin page. It shows a centered orange spinner:

- `flex h-64 items-center justify-center` container.
- `h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500`.

Not toppings-specific — shared by all admin routes. No topping skeleton, no layout chrome.
There is **no `loading.tsx` inside the `toppings/` folder itself** — verified by directory listing.

### 4 — Toppings query + table · `page.tsx:19-23`, `ToppingTable.tsx:15-17`

`ToppingsPage` fires one main query on mount:

```
queryKey: ['admin', 'toppings']
queryFn:  listToppings
staleTime: 60_000   // 60 seconds
```

`isLoading` is destructured (`page.tsx:19`) and passed to `<ToppingTable isLoading={isLoading} …>`
(`page.tsx:81`). While `isLoading` is `true`, `ToppingTable` returns:

```tsx
<p className="text-muted-fg text-sm">Đang tải...</p>   // ToppingTable.tsx:16
```

This is **bare text, not a skeleton**. No placeholder rows, no animated pulse. `ToppingPageHeader`
(count badge + "+ Thêm topping" button) renders outside this branch in `page.tsx:78` — it is
always present and is **not gated** on `isLoading`. While the query is in flight, the header shows
`"Topping (0)"` because `data` defaults to `[]` (`page.tsx:19`).

### 5 — Products side-load (no loading gate) · `page.tsx:25-41`

A second query fires in parallel:

```
queryKey: ['admin', 'products']
queryFn:  listProducts
staleTime: 60_000
```

This query destructures **only `data: products = []`** — `isLoading` is **not read** (`page.tsx:25`).
`products` feeds the `productNames` `Map<string, string[]>` built via `useMemo` (`page.tsx:31-41`),
which is passed to `ToppingTable` as the `productNames` prop (`page.tsx:83`).

Because there is no loading gate, `ToppingTable` renders rows immediately when the toppings query
resolves. Until the products query also resolves, `productNames` is an empty `Map`, so every row
shows `"Chưa gắn sản phẩm"` (`ToppingTable.tsx:57`). When products arrive, `useMemo` recomputes
and the column re-renders with real product names. This is a brief flash — see Flags §1.

### 6 — ToppingFormModal (dynamic import) · `page.tsx:10-12`

The modal is lazy-loaded via Next.js `dynamic()`:

```tsx
const ToppingFormModal = dynamic(() =>
  import('./_components/ToppingFormModal').then(m => ({ default: m.ToppingFormModal }))
)   // page.tsx:10-12
```

The chunk is **not fetched until the modal is first opened** (`showModal` becomes `true`,
`page.tsx:86`). No `loading:` option is set on `dynamic()`, so React renders **nothing** while the
JS chunk downloads on first open. Subsequent opens use the cached chunk instantly.

Unlike `ProductFormModal`, `ToppingFormModal` fires **no sub-queries** — it is a simple form with
three fields (name, price, isAvailable) that uses only the `saveMut` mutation
(`ToppingFormModal.tsx:44-62`). There is no data to load before the form renders.

---

## Main content branch · `ToppingTable.tsx:15-25`

`ToppingTable` renders exactly one of three states, in priority order:

| Order | Condition | Renders |
|---|---|---|
| 1 | `isLoading === true` | `<p className="text-muted-fg text-sm">Đang tải...</p>` |
| 2 | `toppings.length === 0` | `<EmptyState message="Chưa có topping nào — nhấn + Thêm topping để bắt đầu" />` (see below) |
| 3 | otherwise | full `<table>` with one row per topping |

`ToppingPageHeader` (count badge + "+ Thêm topping" button) renders **outside** this branch in
`page.tsx:78-80` — it is always present regardless of loading state. The `count` prop receives
`toppings.length`, so it correctly shows `0` while loading because `data` defaults to `[]`
(`page.tsx:19`).

### Empty-state detail · `ToppingTable.tsx:19-25`, `fe/src/components/shared/EmptyState.tsx:6-13`

`EmptyState` renders (default icon `🍜`, message overridden by caller):

```
<div class="flex flex-col items-center justify-center py-16 gap-3">
  <span class="text-4xl">🍜</span>
  <p class="text-muted-fg text-sm">Chưa có topping nào — nhấn + Thêm topping để bắt đầu</p>
</div>
```

Wrapped in `<div className="bg-card rounded-xl shadow-sm">` by `ToppingTable.tsx:20-24`.

---

## Mutation pending states

| Mutation | Pending signal | UI effect | Source |
|---|---|---|---|
| Save (create/update) | `saveMut.isPending` | Submit button: `disabled` + label changes to `"Đang lưu..."` | `ToppingFormModal.tsx:124-127` |
| Delete topping | `deleteMut.isPending` (not surfaced in UI) | No explicit button disable or spinner — `confirm()` dialog fires but the Xóa button has no pending state | `page.tsx:43-50, 79-84` |

---

## Search / interaction gating

This page has no search bar and no `enabled` condition on either query. Both `listToppings` and
`listProducts` fire unconditionally on mount. There is no debounce or filter-driven re-fetch.

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **"Áp dụng cho sản phẩm" column flashes "Chưa gắn sản phẩm"** | `['admin','products']` has no loading gate. When toppings resolve before products, every row briefly shows `"Chưa gắn sản phẩm"` then snaps to real product names when the products query settles. Both queries have `staleTime: 60_000` so the flash only occurs on a cold load. (`page.tsx:25`, `ToppingTable.tsx:57`) |
| 2 | **No skeleton — bare text instead** | `ToppingTable` shows `<p>Đang tải...</p>` (`ToppingTable.tsx:16`) while the toppings query loads. No animated pulse or placeholder rows — the table area collapses to a single line of text, causing a layout shift when data arrives. |
| 3 | **AuthGuard renders null with no spinner** | During `getMe()` resolution, the entire admin area is blank — no loading indicator. Users on slow connections see a white/dark flash before the page appears. (`AuthGuard.tsx:23`) |
| 4 | **dynamic() modal has no fallback** | `ToppingFormModal` is `dynamic()`-imported without a `loading:` option (`page.tsx:10-12`). First-open chunk download has no UI feedback. |
| 5 | **Delete mutation has no pending UI** | `deleteMut.isPending` is unused in the rendered output — the Xóa row button does not disable or show a spinner during an in-flight delete. Double-clicks can re-trigger. (`page.tsx:43-50`) |
| 6 | **No route-level loading.tsx inside toppings/** | Verified: `fe/src/app/(dashboard)/admin/toppings/loading.tsx` does **not exist**. Navigation into `/admin/toppings` is covered only by the shared `admin/loading.tsx` spinner. |

---

## Sibling files

- [admin_toppings.md](admin_toppings.md) — page overview, zones, wireframe
- [admin_toppings_be.md](admin_toppings_be.md) — endpoint → handler → service → repo → SQL traces; caching details
- [admin_toppings_crosscomponent_dataflow.md](admin_toppings_crosscomponent_dataflow.md) — how page.tsx, ToppingTable, ToppingFormModal, ToppingPageHeader share state
- [admin_toppings_crosspage_dataflow.md](admin_toppings_crosspage_dataflow.md) — how topping data propagates to customer menu, products, KDS
- [SCENARIO_TOPPING_CRUD.md](SCENARIO_TOPPING_CRUD.md) — narrative end-to-end CRUD walkthrough
