# Admin Combos — Loading States

> **TL;DR:** ✅ implemented · how `/admin/combos` behaves while data is in flight. Three layers:
> (1) `AuthGuard` renders `null` (blank screen) until `getMe()` resolves, then `RoleGuard minRole=MANAGER`
> blocks with an access-denied message if the role is insufficient; (2) a `loading.tsx` spinner
> covers the entire `/admin/*` route group during Next.js navigation; (3) inside the page, **only
> the `combos` query gates the main table** via `isLoading` — the `products` query has no guard and
> defaults to `[]`, meaning combo rows may briefly display raw product UUIDs as names.
>
> Page overview → [admin_combos.md](admin_combos.md) · BE view → [admin_combos_be.md](admin_combos_be.md)
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(dashboard)/admin/layout.tsx` · `fe/src/app/(dashboard)/admin/loading.tsx` ·
> `fe/src/components/guards/AuthGuard.tsx` · `fe/src/components/guards/RoleGuard.tsx` ·
> `fe/src/app/(dashboard)/admin/combos/page.tsx` · `fe/src/features/admin/admin.api.ts` ·
> `fe/src/components/shared/EmptyState.tsx`

---

## Loading Layers (outer → inner)

```
1. AuthGuard          → renders null (blank) until getMe() resolves; redirects to /login on failure
2. RoleGuard          → renders access-denied text if role < MANAGER; children invisible until role clears
3. Route navigation   → AdminLoading spinner covers the full (dashboard)/admin/* route group
4. Page mounts        → two TanStack queries fire; only combos query drives a visible loading state
```

### Layer 1 — AuthGuard · `fe/src/components/guards/AuthGuard.tsx:7-24`

`AdminLayout` wraps all children in `<AuthGuard>` (`layout.tsx:29`). On mount, if `user` is `null`
in `useAuthStore`, the guard calls `getMe()` (`auth.api`) once (`attempted.current` ref prevents
duplicate calls). While that request is in flight:

- **Renders `null`** — the page is completely blank (`AuthGuard.tsx:23`).
- On success: calls `setAuth(user, token)` → Zustand `user` becomes non-null → guard renders
  children.
- On failure (any error): `router.push('/login')` (`AuthGuard.tsx:19`).

No spinner, no skeleton — the blank window is covered in practice by the route-level `loading.tsx`
(layer 3) during navigation, but on a hard refresh the blank gap is real until `getMe()` returns.

### Layer 2 — RoleGuard · `fe/src/components/guards/RoleGuard.tsx:10-24`

Nested inside `AuthGuard`. Once `user` is set, `RoleGuard` checks
`Role[user.role.toUpperCase()]` against `minRole = Role.MANAGER` (`layout.tsx:30`).

- Role hierarchy resolution: `Role` enum → numeric value (`RoleGuard.tsx:13`).
- If `roleValue < minRole` → renders `<div className="text-urgent p-8 text-center font-body">Không có quyền truy cập trang này</div>` (`RoleGuard.tsx:16-20`). No redirect.
- If role passes → renders `children` (the full admin shell + combos page).

Staff (cashier/KDS) roles below MANAGER hit this gate and see the access-denied text.

### Layer 3 — Route-level spinner · `fe/src/app/(dashboard)/admin/loading.tsx:1-7`

Next.js App Router renders `AdminLoading` for the **entire `(dashboard)/admin/*` route group**
during server-side navigation (link clicks, programmatic `router.push`). Shape:

- `h-64` centered flex container · `h-8 w-8` `animate-spin` ring · `border-t-orange-500`.
- Identical visual to the `(shop)/loading.tsx` spinner — just a different module.
- No `loading.tsx` exists under `admin/combos/` specifically — only one at `admin/loading.tsx`.

### Layer 4 — Per-query states · `fe/src/app/(dashboard)/admin/combos/page.tsx`

The page fires two `useQuery` calls on mount:

| Query | `queryKey` | `queryFn` | Default | `isLoading` destructured? | Loading UI |
|---|---|---|---|---|---|
| Combos | `['admin','combos']` | `listCombos` → `GET /combos` | `[]` | **yes** (`isLoading`) | `<p>Đang tải...</p>` plain text |
| Products | `['admin','products']` | `listProducts` → `GET /products/all` | `[]` | **no** | none — silent `[]` fallback |

- Combos query: `page.tsx:54-57`. `isLoading` is destructured and used to gate Zone C.
- Products query: `page.tsx:58-61`. No `isLoading` or `isError` is destructured; the default `[]`
  means `productMap` starts as `{}` and silently grows once the response arrives.

Caching detail (staleTime, cache keys, TTL) lives in [admin_combos_be.md](admin_combos_be.md).

---

## Main Content Branch (Zone C — ComboTable)

The table region (`page.tsx:256-342`) renders exactly one of three states, in priority order:

| Priority | Condition | Renders | Source |
|---|---|---|---|
| 1 | `isLoading` (combos query) | `<p className="text-muted-fg text-sm">Đang tải...</p>` | `page.tsx:256-257` |
| 2 | `!isLoading && combos.length === 0` | `<EmptyState icon="🍱" message="Chưa có combo nào. Nhấn + Thêm combo để bắt đầu." />` | `page.tsx:258-259` |
| 3 | otherwise | Full `<table>` with combo rows | `page.tsx:261-342` |

`EmptyState` renders a `py-16` centered column: `text-4xl` icon + `text-muted-fg text-sm` message
(`fe/src/components/shared/EmptyState.tsx:6-13`).

**Critical:** only `isLoading` from the combos query is checked. When combos have resolved but
products have not, the page falls straight to state 3 (the table). Combo rows render product names
as `p?.name ?? item.product_id` (`page.tsx:294`) — so each product chip briefly shows a raw UUID
until the products query settles.

Zone B (header row with "Combo (N)" count + action buttons) is **outside** the branch — always
rendered, always visible (`page.tsx:236-253`).

### EmptyState component · `fe/src/components/shared/EmptyState.tsx`

- Props: `icon?: string` (default `'🍜'`), `message: string`.
- Called here with `icon="🍱"`, `message="Chưa có combo nào. Nhấn + Thêm combo để bắt đầu."`.
- `py-16` padding, flex-col centered, no skeleton animation.

---

## Modal Loading States (Zone D — ComboFormModal)

The modal is gated by local state (`modalMode !== null`, `page.tsx:345`), not by a fetch — it
mounts synchronously when the user clicks "+ Thêm combo" or "Sửa".

### Product picker inside the modal · `page.tsx:411-473`

The product picker (`uniqueProducts.map(...)`) renders from the `products` query result that was
fetched at page mount. There is no in-modal fetch. Two edge cases:

- **Products still loading when modal opens:** `uniqueProducts` is `[]` (`products` default)
  → the picker container renders but is empty. No loading indicator, no message. The user sees a
  blank bordered scroll area until the products query completes.
- **Products already resolved:** normal — the picker immediately shows all products.

Because both queries fire at page mount and the modal is user-triggered (not auto-opened), the
products-still-loading window is narrow in practice — but it exists on slow connections or hard
refresh.

### Mutation pending states

| Action | Pending indicator | Disabled? | Source |
|---|---|---|---|
| Save (create or edit) | Button label changes to `'Đang lưu...'` | `disabled` when `isPending` or `selectedItems < 2` | `page.tsx:543-546` |
| 🎲 Random combo | Button label changes to `'Đang tạo...'` | `disabled` when `randomLoading` | `page.tsx:241-244` |
| Delete | Native `confirm()` dialog, then fires `deleteMut.mutate(id)` | No pending UI on the row | `page.tsx:184-187` |

`isPending` is `createMut.isPending || editMut.isPending` (`page.tsx:231`). `randomLoading` is a
plain `useState<boolean>` toggled around `Promise.allSettled` (`page.tsx:52, 199, 228`).

Delete has no optimistic update and no row-level pending indicator; the row disappears only after
`onSuccess` triggers `qc.invalidateQueries(['admin','combos'])` and the refetch settles
(`page.tsx:163-170`).

---

## Search / Interaction Gating

There is no search input on this page. The combos query has no `enabled` condition — it always
fires on mount (`page.tsx:54-57`). The products query likewise fires unconditionally (`page.tsx:58-61`).

The "🎲 Random combo" button is gated by `uniqueProducts.length < 2` at runtime
(`page.tsx:195-198`) — if products have not resolved yet, `uniqueProducts` is `[]` and the button
shows an error toast rather than a loading state.

---

## Flags / Known Gaps

| # | Gap | Detail | Source |
|---|---|---|---|
| 1 | **Products query has no loading guard** | When combos resolve before products (slow network or N+1 on products/all), Zone C renders the table immediately. Each product chip shows the raw UUID string (`item.product_id`) until products settle. No warning to the user. | `page.tsx:291-294` — `p?.name ?? item.product_id` |
| 2 | **Plain text loading, no skeleton** | `isLoading` renders `<p>Đang tải...</p>` — plain text, no animated placeholder. The table height collapses to a single line during load, causing a layout shift when data arrives. | `page.tsx:257` |
| 3 | **Loading vs empty is distinguishable** | `isLoading` (true during first fetch) and `combos.length === 0` (post-fetch) are separate branches — the UI correctly distinguishes "still fetching" from "fetched, but nothing exists." | `page.tsx:256-259` |
| 4 | **Empty product picker in modal** | If the user opens "+ Thêm combo" before the products query returns, the product picker is a blank scrollable box with no message. No spinner, no "loading products…" text. | `page.tsx:410-473` — `uniqueProducts` derived from `products = []` default |
| 5 | **AuthGuard blank gap on hard refresh** | On `F5`, `user` is `null` in Zustand (memory-only store); `AuthGuard` renders `null` while `getMe()` is in flight. The admin `loading.tsx` spinner is NOT shown during this window (it only fires on navigation, not on initial mount). | `AuthGuard.tsx:23` · `layout.tsx:29` |
| 6 | **Delete has no row-level pending UI** | After `confirm()`, the row stays visible until the invalidate + refetch cycle completes. On slow connections the user may click "Xóa" a second time. | `page.tsx:163-170` |
