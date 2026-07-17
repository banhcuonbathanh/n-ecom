# Claude Guidelines — Admin — Kho nguyên liệu

> Read this before implementing the Admin — Storage page.

---

## Spec Summary

- Desktop admin CRUD page for restaurant ingredient inventory
- Table view with 8 columns including expiry tracking and low-stock warnings
- Row-level visual highlighting: `bg-orange-50` for `status === 'expiring_soon'`
- Quantity and expiry date rendered in red text when threshold is breached
- Single modal (Zone E) handles both Add and Edit flows via `mode` prop
- 6-field form: Tên · Đơn vị · Số lượng ban đầu · Ngưỡng cảnh báo · Ngày nhập · Số ngày bảo quản

**Key constraint:** `expiryDate` and `status` are computed server-side. Do not re-derive them in the client — trust the API response and render accordingly.

---

## Shared Components — Reuse Checklist

> No `new (shared)` components from this page. All reuses are from existing index.

| Component | Tier | File | Register in Index? |
|-----------|------|------|--------------------|
| `AdminTopNav` | Tier 2 | `components/shared/AdminTopNav.tsx` | Already registered |
| `Button` | Tier 1 | `components/ui/button.tsx` | Already registered |
| `Badge` | Tier 1 | `components/ui/badge.tsx` | Already registered |
| `Input` | Tier 1 | `components/ui/input.tsx` | Already registered |
| `EmptyState` | Tier 2 | `components/shared/EmptyState.tsx` | Already registered |
| `AuthGuard` | Tier 4 | `components/guards/AuthGuard.tsx` | Already registered |
| `RoleGuard` | Tier 4 | `components/guards/RoleGuard.tsx` | Already registered |

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|---------------|-----|
| Ingredient list | TanStack Query `['admin', 'ingredients']` | Server data, shared cache, invalidated on mutation |
| Search query | `useState` in `StoragePageClient` | Local UI state, no persistence needed |
| Modal open / mode | `useState` in `StoragePageClient` | Ephemeral UI state |
| Selected ingredient for edit | `useState` in `StoragePageClient` | `Ingredient \| null`, cleared on modal close |
| Form data | RHF in `IngredientFormModal` | Form-scoped; reset on modal open |
| Auth / role | Zustand `useAuthStore` | Cross-page global store |

---

## Performance Checklist

- [ ] Code split: App Router automatic per page
- [ ] Images: none on this page — N/A
- [ ] Lists > 20: confirm pagination strategy with owner before shipping; add `<Pagination>` if needed
- [ ] API calls: TanStack Query only — no `useEffect + fetch`
- [ ] Animations: modal open/close — check `prefers-reduced-motion`
- [ ] Search: 300ms debounce on `searchQuery` input to avoid excessive `useMemo` re-runs

---

## Cross-Page Notes

- State shared with other pages: `useAuthStore` (all admin pages)
- Navigation from this page: tab bar → any admin page
- Navigation to this page: admin tab bar → "Kho nguyên liệu" tab

---

## Non-Obvious Implementation Notes

1. **`mode` + `selectedIngredient` must be set atomically** before opening the modal. Pattern:
   ```typescript
   const handleEdit = (item: Ingredient) => {
     setModalMode('edit')
     setSelectedIngredient(item)
     setModalOpen(true)
   }
   // NOT: setModalOpen(true) first — race condition will render wrong initial values
   ```

2. **`shelfDays` display suffix** — the "ngày" label after the number input is a static label rendered OUTSIDE the `<Input>` component, not inside it. Use a flex row: `<Input /> <span className="text-slate-500 ml-2 self-center">ngày</span>`.

3. **Row warning bg + hover conflict** — define `hover:bg-orange-100` on warning rows specifically so hover feedback is still visible on the orange `bg-orange-50` base. If you use a generic `hover:bg-slate-50` class it will override the warning colour and look like a bug.

4. **Badge variant mapping:**
   ```typescript
   const badgeVariant = (status: IngredientStatus) => ({
     in_stock: 'success',
     low_stock: 'warning',
     expiring_soon: 'warning',
     out_of_stock: 'urgent',   // TBC — confirm with owner
   })[status] ?? 'secondary'
   ```

5. **Date input format** — `<input type="date">` returns ISO `YYYY-MM-DD`; the excalidraw shows `dd/mm/yyyy`. Submit as ISO to the API; display as `dd/MM/yyyy` using `format(parseISO(date), 'dd/MM/yyyy')` (date-fns).

6. **`IngredientFormModal` reset** — call `form.reset()` inside `useEffect([open])` when `open` becomes `false` so the form doesn't show stale data if the user opens Add immediately after closing an Edit.

---
*Created: 2026-05-26*
