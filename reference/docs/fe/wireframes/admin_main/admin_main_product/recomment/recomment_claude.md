# Claude Guidelines — Admin — Products

> Read this before implementing `/admin/products`.

---

## Spec Summary

- CRUD page for managing all menu products
- Two zones (PageHeader + ProductsTable) + one modal (ProductFormModal — Add/Edit)
- Three data sources: `['admin', 'products']` · `['categories']` · `['admin', 'toppings']`
- Rendering: Pattern A — ISR + RSC + HydrationBoundary (all data is admin-shared, not user-specific)

Key constraint: `['admin', 'products']` is a shared query key already used by Admin — Combos. Mutations on this page will also stale that page's product search cache. This is intentional — do not create a separate key.

---

## Shared Components — Reuse Checklist

No `new (shared)` components from this page — all reused components are already registered in `_INDEX_SHARING_COMPONENT.md`.

| Component | Tier | File | Already registered? |
|-----------|------|------|---------------------|
| `AdminTopNav` | Tier 2 shared | `shared/AdminTopNav.tsx` | ✅ yes |
| `AuthGuard` | Tier 4 guard | `guards/AuthGuard.tsx` | ✅ yes |
| `RoleGuard` | Tier 4 guard | `guards/RoleGuard.tsx` | ✅ yes |
| `Button` | Tier 1 atom | `ui/button.tsx` | ✅ yes |
| `Badge` | Tier 1 atom | `ui/badge.tsx` | ✅ yes |
| `EmptyState` | Tier 2 shared | `shared/EmptyState.tsx` | ✅ yes |

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|----------------|-----|
| Product list | TanStack Query `['admin', 'products']` | Shared server cache; stale on mutation |
| Category list (form) | TanStack Query `['categories']` | Pre-fetched in RSC; read-only in form |
| Topping list (form) | TanStack Query `['admin', 'toppings']` | Pre-fetched in RSC; read-only in modal |
| Auth / role | Zustand `useAuthStore` | Persistent across admin session |
| Modal open / mode | `useState` in `ProductsPageClient` | UI-only, no cross-page sharing needed |
| Selected product (edit) | `useState<Product \| null>` | Passed as `product` prop to modal |
| Form values | RHF + Zod inside `ProductFormModal` | Form state is modal-local; reset on close |

---

## Performance Checklist

- [ ] Code split: App Router automatic per page ✅
- [ ] Images: `next/image` for product thumbnails — set `width={36} height={36}` to match table row size
- [ ] Product list: if > 100 items expected, add pagination or `@tanstack/react-virtual`
- [ ] Topping list in modal: rendered from pre-hydrated cache — no spinner needed if RSC prefetch hits
- [ ] API calls: TanStack Query only — no `useEffect + fetch` patterns
- [ ] Animations: modal open/close respects `prefers-reduced-motion`

---

## Cross-Page Notes

- **State shared with other pages:** `['admin', 'products']` cache shared with Admin — Combos (product search inside ComboFormModal). Mutations here invalidate that cache automatically — expected behavior.
- **`['categories']`** shared with Menu and Admin — Categories. Any category added on Admin — Categories page appears in the form dropdown here after cache invalidation.
- **Navigation from this page:** AdminTopNav links to all other admin pages
- **Navigation to this page:** AdminTopNav "Sản phẩm" tab from any admin page

---

## Non-Obvious Implementation Notes

1. **ProductFormModal — mode detection:** The modal title changes ("Thêm sản phẩm" vs "Sửa sản phẩm") based on `mode` prop. Use `useEffect(() => { if (product) reset(product) }, [product])` to populate RHF on edit open. Call `reset()` on modal close to avoid stale values on next add.

2. **Topping checkbox state in form:** RHF watches `topping_ids: string[]`. The "N topping đã chọn" counter is a computed value — `watch('topping_ids').length`. Do not store it separately.

3. **Image upload flow:** `ProductFormModal` shows an image preview box (64×64). The workflow is: user selects file → show local `URL.createObjectURL` preview → on form submit, upload the file first (separate API call) → get back `image_url` → include in the main product POST/PATCH payload. Never send the raw file blob in the product form body.

4. **`['admin', 'products']` staleTime is 30s** — if a product is edited and the user navigates away then back within 30s, the old data may still show. This is acceptable for an admin page. Do not reduce staleTime for perceived freshness — use `invalidateQueries` after mutation instead.

5. **Delete guard:** Check if `product.toppings` is the right proxy for "in active order" — it is not. The server will return a 409 if the product is in an active order. Handle 409 in the delete `onError` callback and display the error message inline in the table, not as a toast.

6. **AdminTopNav `activeTab` value:** Check what string the `AdminTopNav` component expects for this page. Looking at other pages — categories uses `"categories"`, training uses `"training"`. Use `"products"` and confirm the nav renders the orange underline correctly.

---

*Created: 2026-05-26*
