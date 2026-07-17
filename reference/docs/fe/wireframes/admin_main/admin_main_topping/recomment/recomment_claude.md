# Claude Guidelines — Admin — Topping

> Read this before implementing Admin — Topping (`/admin/toppings`).

---

## Spec Summary

- Desktop CRUD page for managing toppings (paid or free add-ons for bánh cuốn dishes)
- Zone A: shared `AdminTopNav` — "Topping" tab active
- Zone B: `ToppingPageHeader` — title + count badge + "+ Thêm topping" CTA
- Zone C: `ToppingTable` — 5-column table with inline Sửa/Xóa actions per row
- Zone D: `ToppingFormModal` — 3-field add/edit modal (name · price · status toggle)
- Rendering: Pattern A (ISR 60s + RSC prefetch + client zones)

Key constraint: query key `['admin', 'toppings']` is **shared** with Admin — Products. Mutations here invalidate that page's topping dropdown — this is intentional. Do not create a new query key.

---

## Shared Components — Reuse Checklist

> No `new (shared)` components from this page — all new components are local to `/admin/toppings/`.

| Component | Tier | File | Register in Index? |
|-----------|------|------|--------------------|
| `AdminTopNav` | Tier 2 | `components/shared/AdminTopNav.tsx` | Already registered |
| `AuthGuard` | Tier 4 | `components/guards/AuthGuard.tsx` | Already registered |
| `RoleGuard` | Tier 4 | `components/guards/RoleGuard.tsx` | Already registered |
| `Button` | Tier 1 | `components/ui/button.tsx` | Already registered |
| `Badge` | Tier 1 | `components/ui/badge.tsx` | Already registered |
| `Input` | Tier 1 | `components/ui/input.tsx` | Already registered |
| `Label` | Tier 1 | `components/ui/label.tsx` | Already registered |
| `EmptyState` | Tier 2 | `components/shared/EmptyState.tsx` | Already registered |

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|----------------|-----|
| Topping list | TanStack Query `['admin', 'toppings']` | Server data; shared with Admin — Products; staleTime 60s |
| Auth / role | Zustand `useAuthStore` | Cross-page auth guard |
| Add modal open | `useState` local | Boolean, no cross-page use |
| Selected topping (edit) | `useState` local | `Topping \| null`; cleared on modal close |
| Form values | RHF + Zod | Scoped to `ToppingFormModal`; never lifted to Zustand |

---

## Performance Checklist

- [ ] Code split: App Router automatic per page
- [ ] Images: no images on this page
- [ ] Lists > 20: if topping count exceeds 50, consider `Pagination` component (already shared) — confirm with owner
- [ ] API calls: TanStack Query only — no `useEffect`+fetch combos
- [ ] Animations: `prefers-reduced-motion` — no animations defined, already satisfied

---

## Cross-Page Notes

- **State shared with Admin — Products:** `['admin', 'toppings']` cache is read by `ProductFormModal` for the topping checkbox list. Mutations from this page will trigger re-fetch there. Do not change the query key.
- **Navigation from this page:** AdminTopNav tabs — Sản phẩm, Combo, Danh mục, etc.
- **Navigation to this page:** AdminTopNav "Topping" tab from any other admin page.
- **Product-topping linking:** Done from Admin — Products (`ProductFormModal`), NOT from this page. `ToppingFormModal` has no product picker.

---

## Non-Obvious Implementation Notes

1. **Modal mode detection via prop, not separate modals.** Use a single `ToppingFormModal` with an optional `topping?: Topping` prop. When `topping` is defined → edit mode (title "Sửa topping", form pre-filled). When undefined → add mode (title "Thêm topping", empty form). This avoids duplicating modal markup.

2. **RHF form must reset on every open.** Use `useEffect(() => { form.reset(defaultValues) }, [topping])` where `defaultValues` depends on mode. Failing to reset leaves stale values from the previous modal session — the #1 modal bug in this project.

3. **extraPrice = 0 is valid, not an error.** Zod schema must use `z.number().min(0)`, not `z.number().min(1)`. Display `extraPrice === 0` as "Miễn phí" in the table (green text). Do not display "+0đ".

4. **`['admin', 'toppings']` is pre-hydrated by `page.tsx`.** The client component receives the cache immediately — `isLoading` should be false on first render (Pattern A). If you see a loading flash, check that `prefetchQuery` in `page.tsx` uses the exact same key and `queryFn`.

5. **Delete confirmation is required.** The excalidraw shows only a [x] button — no dialog. Add a confirmation step before calling `DELETE`. If the API returns 409 (topping linked to products), surface a human-readable error: "Topping này đang dùng cho [N] sản phẩm. Xóa sẽ gỡ liên kết. Tiếp tục?" — do not show raw API error text.

6. **"Áp dụng cho sản phẩm" is read-only.** The column shows which products use each topping, but editing this linkage is the responsibility of Admin — Products. Do not add any product picker or link editor to `ToppingFormModal` or `ToppingTable`.

7. **VND formatting.** Price is stored as an integer in VND. Display as `+${price.toLocaleString('vi-VN')}đ` (e.g. "+8.000đ"). Confirm with BE that the field is stored as integer cents or whole VND — do not assume.

8. **`AdminTopNav` activeTab prop.** Pass `activeTab="topping"` (or whatever the enum value is — check `AdminTopNav.tsx` `AdminTab` type before implementing).

---
*Created: 2026-05-27*
