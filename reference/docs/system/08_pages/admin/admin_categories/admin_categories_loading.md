# Admin Categories — Loading States

> **TL;DR:** ✅ implemented · how `/admin/categories` behaves while data is in flight. Two layers:
> (1) an outer blank-screen gate from `AuthGuard` + `RoleGuard` wrapping the entire admin shell, and
> (2) the single `useQuery(['admin','categories'])` inside the page, which drives a plain-text
> "Đang tải..." line — **no skeleton**. `staleTime: 60_000` means revisits within 60 s show cached
> data instantly with no spinner. Mutations (save/delete) have minimal in-flight feedback: save
> shows "Đang lưu..." in the modal button; delete shows nothing.
>
> Page overview → [admin_categories.md](admin_categories.md) · BE view → [admin_categories_be.md](admin_categories_be.md)
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(dashboard)/admin/layout.tsx` · `fe/src/app/(dashboard)/admin/loading.tsx` ·
> `fe/src/components/guards/AuthGuard.tsx` · `fe/src/components/guards/RoleGuard.tsx` ·
> `fe/src/app/(dashboard)/admin/categories/page.tsx` · `fe/src/features/admin/admin.api.ts:7-8`

---

## Loading Layers (outer → inner)

```
1. Auth resolution  → AuthGuard renders null (blank screen) while Zustand user is absent, then
                       fires getMe(); on failure redirects to /login.
2. Role check       → RoleGuard renders "Không có quyền truy cập" if role < MANAGER.
3. Route navigation → AdminLoading (orange spinner) — Next.js App Router, shared across /admin/*.
4. Page query       → categories useQuery isLoading → plain-text "Đang tải..."
```

No `loading.tsx` exists inside `fe/src/app/(dashboard)/admin/categories/`; there is only
`page.tsx`. The route-level spinner lives one level up at `fe/src/app/(dashboard)/admin/loading.tsx`.

### Layer 1 — AuthGuard · `fe/src/components/guards/AuthGuard.tsx:23`

`AuthGuard` wraps the entire `(dashboard)/admin/layout.tsx` (layout.tsx:29). While `user` is
absent from the Zustand auth store it returns `null` — a **blank white/black screen**. On mount
it fires `getMe()` (`auth.api.ts`); on success it calls `setAuth` and re-renders children; on
failure it pushes to `/login`. There is no spinner, no skeleton, no message — just nothing.

- Relevant line: `if (!user) return null` — `AuthGuard.tsx:23`
- This gate holds until the `getMe()` round-trip completes (or the store already has a user from
  a prior render in this session).

### Layer 2 — RoleGuard · `fe/src/components/guards/RoleGuard.tsx:16-20`

Immediately after `AuthGuard` passes, `RoleGuard(minRole=Role.MANAGER)` computes the user's
numeric role value. If `roleValue < minRole` it renders a **full-page error message**:

```
<div className="text-urgent p-8 text-center font-body">
  Không có quyền truy cập trang này
</div>
```

`RoleGuard.tsx:17-20`. This is not a spinner — it is a permanent block for CASHIER/WAITER roles.
If the user is MANAGER or ADMIN the guard is transparent and renders `{children}` immediately
(synchronous; no async step).

### Layer 3 — Route-level spinner · `fe/src/app/(dashboard)/admin/loading.tsx:1-7`

Next.js App Router renders this file for **all `/admin/*` routes** during navigation. It shows a
centered spin ring inside a `h-64` flex container:

- `h-8 w-8` ring · `animate-spin` · `border-4 border-gray-200 border-t-orange-500`
- Shared by every admin page; not specific to categories.
- In practice this spinner appears only during the first client-side navigation into the admin
  shell; subsequent tab changes within `/admin/` are instant (CSR routing).

### Layer 4 — Per-query state · `fe/src/app/(dashboard)/admin/categories/page.tsx:22-26`

One `useQuery` drives the entire page:

| Property | Value | Source |
|---|---|---|
| `queryKey` | `['admin', 'categories']` | page.tsx:23 |
| `queryFn` | `listCategories` → `GET /categories` | page.tsx:24; admin.api.ts:7-8 |
| `staleTime` | `60_000` ms (1 minute) | page.tsx:25 |
| Default value | `[]` (via destructuring default) | page.tsx:22 |

**staleTime effect:** any revisit to this page within 60 s serves cached data synchronously — the
query does not enter `isLoading`, no spinner appears, the table renders immediately on mount.

---

## Main content branch · `page.tsx:96-151`

The page renders exactly one of three states in priority order. There is no combined
"page-loading" gate outside the main content region — the header (`<h2>`) and "+ Thêm danh mục"
button (page.tsx:86-94) are **always** rendered regardless of query state.

| Priority | Condition | Renders | Source |
|---|---|---|---|
| 1 | `isLoading === true` | `<p className="text-gray-500 text-sm">Đang tải...</p>` | page.tsx:96-97 |
| 2 | `isError === true` | Error card with "Không thể tải danh mục. Vui lòng thử lại." + "Thử lại" button | page.tsx:98-107 |
| 3 (success) | otherwise | The category table; if `categories.length === 0` → empty row | page.tsx:108-151 |

### Loading state — plain text (not a skeleton) · `page.tsx:96-97`

```tsx
{isLoading ? (
  <p className="text-gray-500 text-sm">Đang tải...</p>
) : ...
```

A single `<p>` tag. No skeleton cards, no pulse placeholders, no shimmer. The page header and
action button remain fully visible while this renders.

### Error state · `page.tsx:98-107`

```tsx
<div className="bg-card rounded-xl shadow-sm p-10 text-center">
  <p className="text-muted-fg text-sm mb-3">Không thể tải danh mục. Vui lòng thử lại.</p>
  <button onClick={() => refetch()} ...>Thử lại</button>
</div>
```

"Thử lại" calls `refetch()` directly (page.tsx:102), which re-triggers the `listCategories`
query. While the retry is in flight, `isLoading` becomes true and the page switches back to the
plain-text loading state (priority 1).

### Empty-state (success, zero rows) · `page.tsx:141-147`

When the query succeeds but `categories.length === 0`, the table renders with a single spanning
row:

```tsx
<tr>
  <td colSpan={3} className="px-4 py-10 text-center text-muted-fg">
    Chưa có danh mục nào
  </td>
</tr>
```

This is a success state, not a loading state. The "+ Thêm danh mục" button is still available.

---

## Mutation in-flight states

### Save modal — "Đang lưu..." · `page.tsx:189-192`

While `saveMut.isPending` is true the submit button shows `"Đang lưu..."` and is disabled
(`disabled={saveMut.isPending}`, opacity 50%):

```tsx
<button type="submit" disabled={saveMut.isPending} ...>
  {saveMut.isPending ? 'Đang lưu...' : 'Lưu'}
</button>
```

The modal stays open during the mutation. On `onSuccess` `invalidateQueries(['admin','categories'])`
fires (page.tsx:49), which causes `isLoading` to become true briefly while the list refetches
before the table re-renders with updated data.

### Delete — no in-flight visual · `page.tsx:79-82`, `page.tsx:63-77`

Delete uses `window.confirm()` (page.tsx:80) then calls `deleteMut.mutate(id)`. There is **no
per-row spinner, no row dimming, no disabled state** on the Xóa button during the delete
mutation. The only feedback is the toast after `onSuccess` / `onError` (page.tsx:65-76).

---

## Search/interaction gating

This page has **no search input and no filter controls**. The single query fires unconditionally
on mount (no `enabled` condition). There is nothing to gate.

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **Plain text instead of skeleton** | `isLoading` renders `<p>Đang tải...</p>` — not a skeleton grid. The gold-standard customer menu page uses responsive pulse-placeholder cards. The difference is visible on slow connections: the layout shifts from a single text line to the full table. |
| 2 | **No optimistic UI on create / edit / delete** | All three mutations use `invalidateQueries` on success (page.tsx:49, 65). The list momentarily shows `isLoading` (plain text) while refetching. There is no optimistic insert/remove. |
| 3 | **Delete has no in-flight visual** | A slow DELETE request gives the user no feedback besides the `window.confirm` dialog that already closed. If the mutation is slow or fails silently before the error toast, the user may double-click. |
| 4 | **AuthGuard renders null (blank screen)** | During the `getMe()` round-trip the admin shell renders nothing — no skeleton, no progress bar, no "Đang xác thực..." message. On a slow network this is a multi-second blank screen. `AuthGuard.tsx:23`. |
| 5 | **No `loading.tsx` in `/admin/categories/`** | The route-level spinner is one directory up at `/admin/loading.tsx`. A `loading.tsx` file directly in the `categories/` folder would show the spinner only for this page's navigation; the current setup shares the spinner across all admin routes. This is intentional but worth noting. |

---

## Sibling files

- [admin_categories.md](admin_categories.md) — page overview, zones, wireframe
- [admin_categories_be.md](admin_categories_be.md) — BE endpoints traced handler → service → repo → SQL
- [admin_categories_crosspage_dataflow.md](admin_categories_crosspage_dataflow.md) — how category data flows to other pages (products, menu, combos)
- [SCENARIO_CATEGORY_CRUD.md](SCENARIO_CATEGORY_CRUD.md) — end-to-end narrative (create → edit → delete)
