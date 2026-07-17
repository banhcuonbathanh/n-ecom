# Claude Guidelines — Admin — Categories

> Read this before implementing the Admin — Categories page.

---

## Spec Summary

- Desktop admin CRUD page for managing product categories (danh mục)
- Zone A: sticky AdminTopNav — "Quản trị hệ thống" header + 8-tab navigation (Danh mục active)
- Zone B: PageHeader — live count "Danh mục (5)" + primary "+ Thêm danh mục" CTA
- Zone C: CategoryTable (GET /api/v1/categories) — 2 columns (Tên danh mục, Thứ tự), per-row Sửa + Xóa
- Zone D: Modal Thêm danh mục (POST /api/v1/categories) — name required, sort_order optional
- Zone E: Modal Sửa danh mục (PATCH /api/v1/categories/:id) — pre-filled form, orange active border

Key constraint: **Delete confirmation behaviour is undecided** — check conccern.md and confirm with owner before implementing the Xóa button.

---

## Shared Components — Reuse Checklist

| Component needed | Reuse from | Notes |
|-----------------|------------|-------|
| `AdminTopNav` | `src/components/shared/AdminTopNav.tsx` | Verify it exists before creating — likely already built for other admin pages |
| `Button` | `src/components/ui/Button.tsx` | Use for Sửa, Xóa, Lưu, Hủy, + Thêm danh mục |
| `Modal` / `Dialog` | `src/components/ui/Modal.tsx` | Wrap both AddCategoryModal and EditCategoryModal |
| `Input` | `src/components/ui/Input.tsx` | Name + sort_order fields in both modals |
| `Table` / `TableRow` | `src/components/ui/Table.tsx` | CategoryTable base structure |

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|---------------|-----|
| Categories list | TanStack Query `['categories']` | Server data; invalidated on every mutation |
| Add modal open/close | Local `useState<boolean>` in `page.tsx` | No cross-page sharing; local is simpler |
| Edit target category | Local `useState<Category \| null>` in `page.tsx` | Passed as prop to EditCategoryModal; null = closed |
| Form values (add) | RHF local state inside `AddCategoryModal` | Reset on close; isolated from edit form |
| Form values (edit) | RHF local state inside `EditCategoryModal` | Seeded from `category` prop via `defaultValues` |

---

## Performance Checklist

- [ ] Code split: App Router handles automatically per route — no manual lazy() needed
- [ ] Images: no images on this page
- [ ] Lists: category list < 50 rows expected — no virtualization needed
- [ ] API calls: TanStack Query only — zero `useEffect + fetch` combos
- [ ] Animations: modal open/close — check `prefers-reduced-motion` before adding transitions

---

## Cross-Page Notes

- **State shared with other pages**: `['categories']` query key is also referenced by the Products page (products belong to a category). Any mutation here that invalidates `['categories']` may also affect product filtering UX on the Products page — test after implementing.
- **Navigation from this page**: AdminTopNav tabs → Tổng quan, Tổng kết, Sản phẩm, Combo, Topping, Nhân viên, Kho nguyên liệu, Marketing
- **Navigation to this page**: AdminTopNav "Danh mục" tab from any admin page

---

## Non-Obvious Implementation Notes

1. **Edit modal seeding**: `EditCategoryModal` receives the full `Category` object as prop — pass it as `defaultValues` to `useForm`. Do NOT fire a separate `GET /api/v1/categories/:id` inside the modal; the list data is already fresh.

2. **Sort client-side**: The list query may return categories in any order. Always sort by `sort_order` ascending on the client after fetch: `[...data].sort((a, b) => a.sort_order - b.sort_order)`. Do not mutate the array in place.

3. **valueAsNumber for sort_order**: Use `register('sort_order', { valueAsNumber: true })` in RHF to avoid string-to-number coercion bugs. Without this, the input returns `"0"` (string) and Zod `.number()` will reject it.

4. **Count in title**: Derive from `categories.length` after the query resolves — do not make a separate count API call. While loading, render "Danh mục (–)" or a skeleton.

5. **AdminTopNav activeTab**: Pass `activeTab="categories"` (or the enum value for "Danh mục") — the orange underline on the tab must be data-driven, not hardcoded CSS in the nav.

6. **DELETE and 409**: If `DELETE /api/v1/categories/:id` returns 409 (category has products), show a toast error and leave the row in the table. Do NOT remove the row optimistically before the response arrives.

7. **Modal reset on close**: Call `reset()` inside the modal's `onClose` handler so the form is blank/fresh the next time it opens. For EditModal, reset happens automatically because `defaultValues` changes when a new `category` prop is passed — but confirm this with `useEffect` if the modal stays mounted.

---
*Created: 2026-05-25*
