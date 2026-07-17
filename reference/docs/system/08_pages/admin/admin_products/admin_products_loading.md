# Admin Products — Loading States

> **TL;DR:** ✅ implemented · how `/admin/products` behaves while data is in flight. Four layers:
> (1) `AuthGuard` renders `null` (blank) until the in-memory user is known;
> (2) the shared admin route-level spinner covers navigation;
> (3) a bare `<p>Đang tải...</p>` text (no skeleton) gates the products table while the main query
> loads; (4) inline `isPending` / local-state flags gate each mutation button and the image upload.
> Page overview → [admin_products.md](admin_products.md) · BE view → [admin_products_be.md](admin_products_be.md)
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(dashboard)/admin/loading.tsx` · `fe/src/app/(dashboard)/admin/layout.tsx` ·
> `fe/src/app/(dashboard)/admin/products/page.tsx` · `_components/ProductsTable.tsx` ·
> `_components/ProductFormModal.tsx` · `_components/ProductPageHeader.tsx` ·
> `fe/src/components/guards/AuthGuard.tsx` · `fe/src/components/guards/RoleGuard.tsx` ·
> `fe/src/components/shared/EmptyState.tsx`

---

## Loading Layers (outer → inner)

```
1. AuthGuard           → renders null (blank page) until Zustand user store is hydrated
2. RoleGuard           → renders "Không có quyền…" if role < MANAGER; blocks children
3. Route navigation    → AdminLoading (centered orange spinner, whole admin shell)
4. ProductsPage mounts → products useQuery fires; ProductsTable gates on isLoading
5. Modal open          → dynamic() import of ProductFormModal; two sub-queries fire inside
```

### 1 — AuthGuard · `fe/src/components/guards/AuthGuard.tsx:23`

`AdminLayout` wraps all children in `<AuthGuard>` (`layout.tsx:29`). If `user` is `null` in the
Zustand auth store, `AuthGuard` returns `null` — the page renders a **blank white/dark
shell** with no spinner or message. Simultaneously, a `getMe()` call fires (`AuthGuard.tsx:17`);
on success the store is populated and children mount; on failure the router pushes to `/login`
(`AuthGuard.tsx:19`).

This blank-render window covers the full admin layout (nav tabs, header, page content). There is no
loading indicator at this layer.

### 2 — RoleGuard · `fe/src/components/guards/RoleGuard.tsx:16-21`

Immediately after `AuthGuard` resolves, `RoleGuard` checks `minRole={Role.MANAGER}`. If the
authenticated user's numeric role value is below `MANAGER`, it renders a centred
`"Không có quyền truy cập trang này"` message (`text-urgent p-8 text-center font-body`) and
**stops rendering the page**. This is a guard, not a loading state, but it occupies the same
window and blocks `ProductsPage` from mounting.

### 3 — Route-level spinner · `fe/src/app/(dashboard)/admin/loading.tsx:1-7`

Next.js App Router renders this file for the **entire `(dashboard)/admin/` route group** during
navigation into any admin page. It shows a centered orange spinner:

- `flex h-64 items-center justify-center` container.
- `h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500`.

Not products-specific — shared by all admin routes. No product skeleton, no layout chrome.

### 4 — Products query + table · `page.tsx:22-26`, `ProductsTable.tsx:17-18`

`ProductsPage` fires one main query on mount:

```
queryKey: ['admin', 'products']
queryFn:  listProducts
staleTime: 30_000  // 30 seconds
```

`isLoading` is passed to `<ProductsTable isLoading={isLoading} …>` (`page.tsx:125`). While
`isLoading` is `true`, `ProductsTable` returns:

```tsx
<p className="text-gray-500 text-sm">Đang tải...</p>   // ProductsTable.tsx:18
```

This is **bare text, not a skeleton**. No placeholder rows, no animated pulse. The table header
and action buttons (`ProductPageHeader`) are rendered immediately and are not gated on `isLoading`.

### 5 — ProductFormModal (dynamic import) · `page.tsx:13-15`

The modal is lazy-loaded via Next.js `dynamic()`:

```tsx
const ProductFormModal = dynamic(() =>
  import('./_components/ProductFormModal').then(m => ({ default: m.ProductFormModal }))
)   // page.tsx:13-15
```

The chunk is **not fetched until the modal is first opened** (`modal.open` becomes `true`). On the
first open, there is a brief JS-chunk-download gap with no fallback UI — `dynamic()` here has
no `loading:` option set, so React renders nothing while the chunk loads. Subsequent opens use the
cached chunk instantly.

Once mounted, `ProductFormModal` fires two sub-queries internally:

| Query | `queryKey` | `staleTime` | Empty-state fallback | Source |
|---|---|---|---|---|
| Categories | `['categories']` | 60 000 ms | `<p>Chưa có danh mục nào. Vui lòng thêm danh mục trước.</p>` | `ProductFormModal.tsx:138-139` |
| Toppings | `['admin', 'toppings']` | 60 000 ms | `<p>Chưa có topping nào được thiết lập.</p>` | `ProductFormModal.tsx:240-241` |

Neither sub-query has an explicit `isLoading` branch — both default to `[]` and render their empty
fallback until data arrives. The **Save button** is disabled (`disabled={saveMut.isPending || categories.length === 0}`) while categories are still loading (empty array), which means the form is
non-submittable until `['categories']` resolves (`ProductFormModal.tsx:277`).

---

## Main content branch · `ProductsTable.tsx:16-27`

`ProductsTable` renders exactly one of three states, in priority order:

| Order | Condition | Renders |
|---|---|---|
| 1 | `isLoading === true` | `<p className="text-gray-500 text-sm">Đang tải...</p>` |
| 2 | `products.length === 0` | `<EmptyState message="Chưa có sản phẩm nào" />` (see below) |
| 3 | otherwise | full `<table>` with one row per product |

`ProductPageHeader` (count badge + "Dữ liệu mẫu" + "Thêm sản phẩm" buttons) renders **outside**
this branch in `page.tsx:117-122` — it is always present regardless of loading state. The `count`
prop receives `products.length`, so it correctly shows `0` while loading because `data` defaults
to `[]` (`page.tsx:22`).

### Empty-state detail · `fe/src/components/shared/EmptyState.tsx:6-13`

`EmptyState` renders:

```
<div class="flex flex-col items-center justify-center py-16 gap-3">
  <span class="text-4xl">🍜</span>          ← default icon (no override passed)
  <p class="text-muted-fg text-sm">Chưa có sản phẩm nào</p>
</div>
```

Wrapped in `<div className="bg-card rounded-xl shadow-sm">` by `ProductsTable.tsx:22-26`.

---

## Mutation pending states

| Mutation | Pending signal | UI effect | Source |
|---|---|---|---|
| Delete product | `deleteMut.isPending` (not surfaced in UI) | No explicit button disable or spinner — `confirm()` dialog fires but row button has no pending state | `page.tsx:28-42, 51-53` |
| Toggle availability | `toggleMut.isPending` (not surfaced in UI) | `<Badge>` in the table row has no disabled/pending state | `page.tsx:44-48, 128` |
| Save (create/update) | `saveMut.isPending` | Submit button: `disabled` + label changes to `"Đang lưu..."` | `ProductFormModal.tsx:277-280` |
| Seed sample data | `seedLoading` (local `useState`) | "Dữ liệu mẫu" button: `disabled` + label changes to `"Đang tạo..."` | `ProductPageHeader.tsx:15-18`, `page.tsx:20, 56` |
| Image upload | `uploading` (local `useState`) | "Chọn ảnh" / "Đổi ảnh" button: `disabled` + label changes to `"Đang tải..."` | `ProductFormModal.tsx:87, 199-202` |

---

## Search / interaction gating

This page has no search bar and no `enabled` condition on the main query. `listProducts` fires
unconditionally on mount. There is no debounce or filter-driven re-fetch on this page.

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **No skeleton — bare text instead** | `ProductsTable` shows `<p>Đang tải...</p>` (`ProductsTable.tsx:18`) while the products query loads. The customer menu page uses animated pulse-skeleton cards. This is a UX gap: the table area collapses to a single line of text with no layout placeholder, causing a visible content shift when data arrives. |
| 2 | **AuthGuard renders null with no spinner** | During `getMe()` resolution, the entire admin area is blank — no loading indicator. Users on slow connections see a white/dark flash before the page appears. (`AuthGuard.tsx:23`) |
| 3 | **dynamic() modal has no fallback** | `ProductFormModal` is `dynamic()`-imported without a `loading:` option (`page.tsx:13-15`). First-open chunk download has no UI feedback. |
| 4 | **Delete and toggle mutations have no pending UI** | `deleteMut.isPending` and `toggleMut.isPending` are unused in the rendered output — row buttons do not disable or show a spinner during in-flight mutations. Double-clicks can re-trigger. |
| 5 | **Modal sub-queries have no isLoading branch** | `['categories']` and `['admin','toppings']` inside `ProductFormModal` degrade silently to empty-state text — there is no spinner or skeleton inside the modal while they load. The Save button is indirectly gated (`categories.length === 0`) but the user sees no explicit "loading categories…" indicator. |

---

## Sibling files

- [admin_products.md](admin_products.md) — page overview, zones, wireframe
- [admin_products_be.md](admin_products_be.md) — endpoint → handler → service → repo → SQL traces; caching details
- [admin_products_crosscomponent_dataflow.md](admin_products_crosscomponent_dataflow.md) — how page.tsx, ProductsTable, ProductFormModal, ProductPageHeader share state
- [admin_products_crosspage_dataflow.md](admin_products_crosspage_dataflow.md) — how product data propagates to customer menu, combos, KDS
- [SCENARIO_PRODUCT_CRUD.md](SCENARIO_PRODUCT_CRUD.md) — narrative end-to-end CRUD walkthrough
