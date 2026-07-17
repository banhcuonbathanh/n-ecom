# Claude Guidelines — Admin — Combo

> Read this before implementing `/admin/combos`.

---

## Spec Summary

- Admin desktop page for managing product combos at `/admin/combos`
- Table lists all combos with product badge chips (orange, Name ×qty), current + strikethrough old price, retail price, red savings badge
- `ComboFormModal` is shared for add (empty) and edit (pre-filled) via `mode` prop; auto-calculates savings vs retail sum
- Min 2 products per combo (Zod validation); only Admin role can delete
- "🎲 Random combo" button visible but no logic required

**Key constraint:** The strikethrough old price column and the savings auto-calculation both depend on specific API response fields (`previous_price` on Combo, `unit_price` on ComboItem). Confirm these exist in the API contract before writing any display code.

---

## Shared Components — Reuse Checklist

> All components for this page are either `✅ reuse` from the shared index or `new (local)`. No `new (shared)` components to register.

| Component | Tier | File | Reuse status |
|-----------|------|------|--------------|
| `AdminTopNav` | Tier 2 | `components/shared/AdminTopNav.tsx` | ✅ reuse |
| `AuthGuard` | Tier 4 | `components/guards/AuthGuard.tsx` | ✅ reuse |
| `RoleGuard` | Tier 4 | `components/guards/RoleGuard.tsx` | ✅ reuse |
| `useAuthStore` | Store | `store/auth.ts` | ✅ reuse |
| `Button` | Tier 1 | `components/ui/button.tsx` | ✅ reuse |
| `Badge` | Tier 1 | `components/ui/badge.tsx` | ✅ reuse |
| `Input` | Tier 1 | `components/ui/input.tsx` | ✅ reuse |
| `Card` | Tier 1 | `components/ui/card.tsx` | ✅ reuse |
| `EmptyState` | Tier 2 | `components/shared/EmptyState.tsx` | ✅ reuse |
| `ComboPageHeader` | local | `app/admin/combos/_components/ComboPageHeader.tsx` | new (local) |
| `ComboTable` | local | `app/admin/combos/_components/ComboTable.tsx` | new (local) |
| `ComboFormModal` | local | `app/admin/combos/_components/ComboFormModal.tsx` | new (local) |
| `ProductSearchList` | local | `app/admin/combos/_components/ProductSearchList.tsx` | new (local) |

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|---------------|-----|
| Combo list | TanStack Query `['admin', 'combos']` | Server data, invalidated on mutations |
| Product list (modal) | TanStack Query `['admin', 'products']` | Shared with other admin pages, static enough for 60s staleTime |
| Modal open/closed | `useState` in page component | Local UI state, no cross-page sharing needed |
| Edit target combo | `useState<Combo \| null>` in page component | Cleared on modal close |
| Form values | React Hook Form internal state | Controlled by `defaultValues` prop on open |
| Savings (computed) | Derived in modal via `watch()` | Not stored — recalculated on every price/qty change |

---

## Performance Checklist

- [ ] Code split: App Router automatic per page — no manual splitting needed
- [ ] Images: no product images on this page — N/A
- [ ] Lists: if combo list > 20 rows, add pagination or virtual scroll
- [ ] Product search: client-side filter is fine for < 100 products; add `useMemo` on filtered list
- [ ] Mutations: invalidate `['admin', 'combos']` on POST, PUT, DELETE — do not manually update cache
- [ ] Modal: call `form.reset(defaultValues)` on every open to prevent stale edit data

---

## Cross-Page Notes

- State shared with other pages: `useAuthStore` (role check for delete)
- Navigation from this page: TopNav links to Tổng quan · Tổng kết · Sản phẩm · Danh mục · Topping · Nhân viên · Kho · Marketing
- Navigation to this page: TopNav "Combo" tab from any admin page

---

## Non-Obvious Implementation Notes

1. **`ComboFormModal` mode switching** — the modal renders both add and edit flows. Use `mode: "add" | "edit"` prop + `defaultValues?: Combo`. Always call `form.reset(defaultValues ?? emptyDefaults)` inside a `useEffect` that watches `[open, defaultValues]` to ensure the form is clean on every open.

2. **Strikethrough price** — requires `previous_price` field from the API. Do not hardcode or compute it on the frontend. If the field is null/undefined, render only the current price with no strikethrough.

3. **Savings note direction** — the savings note in the modal (`✓ Tiết kiệm X ₫`) is computed as `retailSum - comboPrice`. Only render it when `savings > 0`. When `savings <= 0`, show nothing (not an error).

4. **Delete role guard** — `role === "admin"` check must use `useAuthStore`, not a local prop. Hiding the button client-side is sufficient for UX; the backend enforces the actual permission.

5. **Product qty in modal** — qty `−` button must be disabled when `qty === 1`, not `qty === 0`. Allowing 0 would mean the product is in the combo list but contributes nothing — this is a data integrity issue.

6. **Combo count in header** — derive from `combos.length` after the query resolves, not from a separate count API call.

---
*Created: 2026-05-26*
