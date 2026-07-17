---
page: admin_main_storage
route: /admin/storage
created: 2026-05-26
status: Draft
---

# Page: Admin — Kho nguyên liệu
**Route:** `/admin/storage`
**Version:** v1
**Status:** Draft

## Spec Summary

- Desktop admin page for managing restaurant ingredient inventory (Kho nguyên liệu)
- Table view: STT · Tên nguyên liệu · Đơn vị · Số lượng tồn · Ngày nhập · Hạn sử dụng · Trạng thái · Thao tác
- Status badge system: **Còn hàng** (green) · **Sắp hết hạn** (amber + full-row orange background `#fff7ed`)
- Low-stock quantity and near-expiry date rendered in red text to signal urgency
- Add/Edit modal (Zone E) with 6 fields including a warning threshold that drives badge logic
- Threshold field: "Ngưỡng cảnh báo" — system flags ingredient as low-stock when `quantity ≤ warningThreshold`

---

## 📐 Visual Wireframe

```
┌────────────────────────────────────────────────────────────────────┐  ← sticky top-0 z-20
│ Zone A — AdminTopNav                                               │
│  Quản trị hệ thống                           [Tên NV] [Đăng xuất] │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ Zone B — AdminNavTabs (within AdminTopNav, activeTab="storage")    │
│  Tổng quan  Tổng kết  Sản phẩm  Combo  Danh mục  Topping          │
│  Nhân viên  ▶Kho nguyên liệu◀  Marketing                          │
│             ─────────────────── ← orange underline                 │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ Zone C — StoragePageHeader                                         │
│  Kho nguyên liệu          [🔍 Tìm nguyên liệu...]  [+Thêm NL]    │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ Zone D — IngredientTable                                           │
│ ┌─────┬──────────────────┬────────┬──────────┬───────────┬──────────────┬────────────────┬──────────┐ │
│ │ STT │ Tên nguyên liệu  │ Đơn vị │ Số lượng │ Ngày nhập │ Hạn SD       │ Trạng thái     │ Thao tác │ │
│ ├─────┼──────────────────┼────────┼──────────┼───────────┼──────────────┼────────────────┼──────────┤ │
│ │  1  │ Gạo tẻ           │ kg     │    50    │15/05/2026 │ 17/08/2026   │ [Còn hàng ✓]  │[Sửa][Xóa]│ │
│ │  2  │ Bột năng         │ kg     │    30    │14/05/2026 │ 10/11/2026   │ [Còn hàng ✓]  │[Sửa][Xóa]│ │
│ │  3  │ Mộc nhĩ          │ kg     │     8    │10/05/2026 │ 09/06/2026   │ [Còn hàng ✓]  │[Sửa][Xóa]│ │
│ │ 4⚠  │ Tôm tươi         │ kg     │   2🔴   │19/05/2026 │ 22/05/2026🔴 │ [Sắp hết hạn] │[Sửa][Xóa]│ │  ← full-row orange bg #fff7ed
│ └─────┴──────────────────┴────────┴──────────┴───────────┴──────────────┴────────────────┴──────────┘ │
└────────────────────────────────────────────────────────────────────┘

                     ┌────────────────────────────────────────┐
                     │ Zone E — IngredientFormModal            │
                     │  Thêm nguyên liệu                [✕]  │
                     │ ────────────────────────────────────   │
                     │  Tên nguyên liệu *                      │
                     │  [Nhập tên nguyên liệu...             ] │
                     │                                         │
                     │  Đơn vị *           Số lượng ban đầu *  │
                     │  [kg          ▾]    [0                ] │
                     │                                         │
                     │  Ngưỡng cảnh báo *  (?) tooltip         │
                     │  [0                                   ] │
                     │  hint: cảnh báo khi tồn kho dưới mức này│
                     │                                         │
                     │  Ngày nhập kho *    Số ngày bảo quản *  │
                     │  [dd/mm/yyyy     ]  [90         ] ngày  │
                     │ ────────────────────────────────────   │
                     │                      [Hủy]   [Lưu]     │
                     └────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| A | `AdminTopNav` | Always | sticky top-0 z-20 |
| B | AdminNavTabs (within `AdminTopNav`) | Always | below Zone A, activeTab="storage" |
| C | `StoragePageHeader` | Always | static, below Zone B |
| D | `IngredientTable` | Always; `EmptyState` when list is empty | static, scrollable content |
| E | `IngredientFormModal` | Opens on "+ Thêm" click or "Sửa" row action | fixed overlay, centered |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| A | `useAuthStore.user` | Zustand | N/A | Display name + logout |
| B | `useAuthStore.role` | Zustand | N/A | Active tab highlight only |
| C | Local `useState` (searchQuery) | Controlled input | N/A | Client-side filter over fetched list |
| D | TanStack Query → `GET /api/v1/admin/ingredients` | Invalidate on mutation | `['admin', 'ingredients']` | staleTime 60s; full list, client-side filter |
| E | RHF + Zod (form state) | Local to modal | N/A | POST (add) / PUT (edit) → invalidate `['admin', 'ingredients']` |

---

## 🧩 Component Specifications

> Read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md` before editing this table.

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|-----------------|
| A | `AdminTopNav` | ✅ reuse | `components/shared/AdminTopNav.tsx` | `activeTab: AdminTab` |
| B | AdminNavTabs | ✅ reuse | within `AdminTopNav` | `activeTab="storage"` |
| C | `StoragePageHeader` | new (local) | `app/admin/storage/components/StoragePageHeader.tsx` | `searchQuery: string · onSearch: (q: string) => void · onAddClick: () => void` |
| D | `IngredientTable` | new (local) | `app/admin/storage/components/IngredientTable.tsx` | `ingredients: Ingredient[] · onEdit: (item: Ingredient) => void · onDelete: (id: string) => void` |
| D | `Badge` | ✅ reuse | `components/ui/badge.tsx` | `variant: 'success' \| 'warning'` — Còn hàng / Sắp hết hạn |
| D | `Button` | ✅ reuse | `components/ui/button.tsx` | `variant: 'outline'` — Sửa (indigo) / Xóa (destructive) |
| D | `EmptyState` | ✅ reuse | `components/shared/EmptyState.tsx` | `message="Chưa có nguyên liệu nào"` |
| E | `IngredientFormModal` | new (local) | `app/admin/storage/components/IngredientFormModal.tsx` | `open: boolean · mode: 'add' \| 'edit' · ingredient?: Ingredient · onClose: () => void` |
| E | `Input` | ✅ reuse | `components/ui/input.tsx` | standard |
| — | `AuthGuard` | ✅ reuse | `components/guards/AuthGuard.tsx` | — |
| — | `RoleGuard` | ✅ reuse | `components/guards/RoleGuard.tsx` | `allowedRoles: ['admin', 'manager']` (TBC) |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
type IngredientStatus = 'in_stock' | 'low_stock' | 'expiring_soon' | 'out_of_stock'

interface Ingredient {
  id: string
  name: string
  unit: string                // 'kg' | 'g' | 'lít' | 'cái' | etc.
  quantity: number
  warningThreshold: number    // flag when quantity <= this value
  importDate: string          // ISO date string 'YYYY-MM-DD'
  expiryDate: string          // computed server-side: importDate + shelfDays
  shelfDays: number
  status: IngredientStatus    // computed server-side
  createdAt: string
  updatedAt: string
}

interface IngredientFormData {
  name: string
  unit: string
  initialQuantity: number
  warningThreshold: number
  importDate: string          // submit as ISO, display as dd/mm/yyyy
  shelfDays: number           // displayed with suffix "ngày"
}

// Zod schema
const ingredientSchema = z.object({
  name: z.string().min(1, 'Tên nguyên liệu không được trống'),
  unit: z.string().min(1, 'Chọn đơn vị'),
  initialQuantity: z.number().min(0, 'Số lượng không âm'),
  warningThreshold: z.number().min(0, 'Ngưỡng không âm'),
  importDate: z.string().min(1, 'Chọn ngày nhập'),
  shelfDays: z.number().int().min(1, 'Số ngày bảo quản tối thiểu là 1'),
})
```

### Query Configuration

```typescript
// hooks/useIngredientQueries.ts
export function useIngredients() {
  return useQuery({
    queryKey: ['admin', 'ingredients'],
    queryFn: () => apiFetch('/api/v1/admin/ingredients'),
    staleTime: 60_000,
  })
}

export function useCreateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: IngredientFormData) =>
      apiFetch('/api/v1/admin/ingredients', { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ingredients'] }),
  })
}

export function useUpdateIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IngredientFormData> }) =>
      apiFetch(`/api/v1/admin/ingredients/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ingredients'] }),
  })
}

export function useDeleteIngredient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/admin/ingredients/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ingredients'] }),
  })
}
```

### Row Highlighting Logic

```typescript
// IngredientTable row className
const rowClass = (item: Ingredient) =>
  item.status === 'expiring_soon' ? 'bg-orange-50 border-orange-200' : ''

// Quantity text color
const qtyClass = (item: Ingredient) =>
  item.quantity <= item.warningThreshold ? 'text-red-600 font-medium' : 'text-slate-800'
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| Empty ingredient list | `data.length === 0` | Render `<EmptyState>` | "Chưa có nguyên liệu nào. Nhấn '+ Thêm nguyên liệu' để bắt đầu." |
| Network error on load | TanStack Query `isError` | Show error banner | "Không tải được danh sách. Thử lại." |
| Duplicate ingredient name | 409 from API | Show field-level error in modal | "Nguyên liệu này đã tồn tại." |
| Delete ingredient in use | 422 from API | Toast error | "Không thể xóa: nguyên liệu đang được sử dụng." |
| Ingredient quantity = 0 | `status: 'out_of_stock'` | Render Badge `urgent` | "Hết hàng" badge (red) |
| Search returns no results | Filtered `data.length === 0` | Render `<EmptyState>` | "Không tìm thấy nguyên liệu nào." |
| Date format mismatch | Form validation | Zod schema blocks submit | "Ngày không hợp lệ." inline error |
| 403 — wrong role | API response | Redirect via `RoleGuard` | Redirect to `/admin` |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Zone C: search input filters Zone D table by ingredient name (case-insensitive)
- [ ] Zone C: "+ Thêm nguyên liệu" opens IngredientFormModal in `add` mode
- [ ] Zone D: "Sửa" button opens IngredientFormModal in `edit` mode with pre-filled values
- [ ] Zone D: "Xóa" button triggers confirmation and deletes ingredient on confirm
- [ ] Zone D: rows with `status: 'expiring_soon'` render with orange background
- [ ] Zone D: low-quantity values render in red text
- [ ] Zone E: all 6 fields validate on submit (required + type)
- [ ] Zone E: successful submit invalidates `['admin', 'ingredients']` and closes modal
- [ ] Zone E: "Hủy" button closes modal without saving
- [ ] Zone E: "Số ngày bảo quản" field shows "ngày" suffix at all times

### Edge Case Tests
- [ ] Empty list → EmptyState rendered with CTA
- [ ] Search → no results → EmptyState rendered
- [ ] Duplicate name → field-level error "Nguyên liệu này đã tồn tại."
- [ ] Delete in-use ingredient → toast "Không thể xóa"
- [ ] Network error → error banner shown

### Accessibility Tests
- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] Modal trap focus within Zone E while open (Tab, Shift+Tab)
- [ ] Esc key closes modal
- [ ] Warning threshold tooltip is accessible via keyboard focus
- [ ] Badge colours not the only signal (text label present)

### Cross-Device Tests
- [ ] Desktop 1280px+ — table all 8 columns visible
- [ ] 1024px — check if table scrolls horizontally
- [ ] Modal centered and fully visible at 1280px

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| ARCH-S1 | FE | Scaffold folder + wireframe spec | ✅ | wireframes/admin_main/admin_main_storage/admin_main_storage_wireframe_v1.md |
| ARCH-S2 | FE | Implement StoragePageHeader | ⬜ | Zone C |
| ARCH-S3 | FE | Implement IngredientTable with row highlighting | ⬜ | Zone D |
| ARCH-S4 | FE | Implement IngredientFormModal (6-field RHF form) | ⬜ | Zone E |
| ARCH-S5 | FE | Wire query hooks + page.tsx ISR | ⬜ | hooks/useIngredientQueries.ts |

---

## 📝 Changelog

**v1 (2026-05-26)**
- Initial scaffold based on `storage.excalidraw`
- Zones documented: A (AdminTopNav) · B (NavTabs) · C (StoragePageHeader) · D (IngredientTable) · Modal E (IngredientFormModal)
- Status badge system: Còn hàng · Sắp hết hạn · (Hết hàng TBC)
- Row highlighting logic documented (orange bg for expiring_soon)
- TypeScript interfaces + query hooks drafted

---

*Last Updated: 2026-05-26*
*Approved by: —*
*Next Review: After business rules confirmed (RBAC, duplicate handling, stock=0 state)*
