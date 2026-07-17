---
page: admin_main_combos
route: /admin/combos
created: 2026-05-26
status: Draft
---

# Page: Admin — Combo
**Route:** `/admin/combos`
**Version:** v1
**Status:** Draft

## Spec Summary

- Admin desktop page for managing product combos at `/admin/combos`
- Table lists all combos with product badge chips (orange, Name ×qty), current price, strikethrough old price, retail price sum, and red savings badge
- ComboFormModal is shared for add (empty fields) and edit (pre-filled); auto-calculates savings vs retail sum on price input
- Min 2 products per combo enforced at form validation; only Admin role can delete a combo
- "🎲 Random combo" button visible in PageHeader — no backend logic required currently

---

## 📐 Visual Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [A] AdminTopNav — sticky top-0 z-20                                         │
│ ████████████████████████████████████████████████████████████████████████████│
│  Quản trị hệ thống  Tổng quan  Tổng kết  Sản phẩm  [Combo]  Danh mục ...  │
│                                                      ────── (orange)        │
└─────────────────────────────────────────────────────────────────────────────┘
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
┌─────────────────────────────────────────────────────────────────────────────┐
│ [B] PageHeader                                                               │
│  Combo (2)                          [🎲 Random combo]  [+ Thêm combo]      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ [C] ComboTable  GET /api/v1/admin/combos                                    │
│ ┌──────────────┬─────────────────────────────┬──────────────┬──────────┬──────────┬────────┐ │
│ │ Tên combo    │ Sản phẩm trong combo        │ Giá combo    │ Giá lẻ  │ Tiết    │ Thao   │ │
│ │              │                             │(hiện/cũ)     │         │ kiệm    │ tác    │ │
│ ├──────────────┼─────────────────────────────┼──────────────┼──────────┼──────────┼────────┤ │
│ │ Combo        │ [Bánh Cuốn Thập Cẩm ×2]    │ 160.000 ₫    │180.000 ₫│[-20.000₫]│[Sửa]  │ │
│ │ Gia Đình     │ [Nem Rán ×2][Trà Đá ×2]    │ ~~175.000 ₫~~│         │          │[Xóa]  │ │
│ │ 3sp·-20k    │                             │              │         │          │        │ │
│ ├──────────────┼─────────────────────────────┼──────────────┼──────────┼──────────┼────────┤ │
│ │ Combo Đơn    │ [Bánh Cuốn Tâm ×1]         │ 60.000 ₫     │ 70.000 ₫│[-10.000₫]│[Sửa]  │ │
│ │ 2sp·-10k    │ [Nước Chanh ×1]             │ ~~65.000 ₫~~ │         │          │[Xóa]  │ │
│ └──────────────┴─────────────────────────────┴──────────────┴──────────┴──────────┴────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ [D] ComboFormModal  POST /api/v1/admin/combos  OR  PUT /api/v1/admin/combos/:id │
│ ╔══════════════════════════════════════════╗                                 │
│ ║ Thêm combo mới                      [×] ║                                 │
│ ║ ─────────────────────────────────────── ║                                 │
│ ║ Tên combo *                             ║                                 │
│ ║ [VD: Combo Gia Đình                   ] ║                                 │
│ ║                                         ║                                 │
│ ║ Mô tả                                   ║                                 │
│ ║ [Mô tả ngắn về combo (tuỳ chọn)       ] ║                                 │
│ ║                                         ║                                 │
│ ║ Sản phẩm trong combo *                  ║                                 │
│ ║ [🔍 Tìm sản phẩm...                   ] ║                                 │
│ ║ ┌──────────────────────────── [−][2][+]┐║                                 │
│ ║ │ Bánh Cuốn Thập Cẩm                   │║                                 │
│ ║ └──────────────────────────────────────┘║                                 │
│ ║ ┌──────────────────────────── [−][1][+]┐║                                 │
│ ║ │ Nem Rán                               │║                                 │
│ ║ └──────────────────────────────────────┘║                                 │
│ ║                                         ║                                 │
│ ║ Giá combo *                             ║                                 │
│ ║ [160000                  ]              ║                                 │
│ ║ ✓ Tiết kiệm 20.000 ₫ so với giá lẻ (180.000 ₫)                          ║                                 │
│ ║ ─────────────────────────────────────── ║                                 │
│ ║       [Huỷ bỏ]              [Lưu combo] ║                                 │
│ ╚══════════════════════════════════════════╝                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| A | `AdminTopNav` | Always visible | `sticky top-0 z-20` |
| B | `ComboPageHeader` | Always visible | Static, below nav |
| C | `ComboTable` | Always visible; `EmptyState` when list is empty | Static, scrollable |
| D | `ComboFormModal` | Opens on "+ Thêm combo" (add mode) or "Sửa" (edit mode, pre-filled) | Modal overlay, `z-50` |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| B | Derived from combo list length | Re-render on query change | `['admin', 'combos']` | Count in title "Combo (N)" |
| C | TanStack Query → `GET /api/v1/admin/combos` | Invalidate on POST/PUT/DELETE | `['admin', 'combos']` | Full list, no pagination shown |
| D (search) | TanStack Query → `GET /api/v1/admin/products` | Static (no live search API) | `['admin', 'products']` | Filtered client-side by search input |
| D (savings) | Computed locally | Re-computed on price input or product qty change | — | `retail_sum - combo_price` |

---

## 🧩 Component Specifications

> Before filling this table: read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md`.
> Mark each row with one of: `✅ reuse` · `new (local)` · `new (shared)`

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|-----------------|
| A | `AdminTopNav` | ✅ reuse | `components/shared/AdminTopNav.tsx` | `activeTab: "combos"` |
| — | `AuthGuard` | ✅ reuse | `components/guards/AuthGuard.tsx` | — |
| — | `RoleGuard` | ✅ reuse | `components/guards/RoleGuard.tsx` | `allowedRoles: ["admin"]` |
| — | `useAuthStore` | ✅ reuse | `store/auth.ts` | `role` for delete permission check |
| B | `ComboPageHeader` | new (local) | `app/admin/combos/_components/ComboPageHeader.tsx` | `count: number` · `onAdd: () => void` |
| B | `Button` | ✅ reuse | `components/ui/button.tsx` | `variant="outline"` (random) · `variant="default"` (add) |
| C | `ComboTable` | new (local) | `app/admin/combos/_components/ComboTable.tsx` | `combos: Combo[]` · `onEdit: (combo) => void` · `onDelete: (id) => void` |
| C | `Badge` | ✅ reuse | `components/ui/badge.tsx` | `variant="warning"` for savings chip |
| C | `EmptyState` | ✅ reuse | `components/shared/EmptyState.tsx` | `message="Chưa có combo nào"` |
| D | `ComboFormModal` | new (local) | `app/admin/combos/_components/ComboFormModal.tsx` | `mode: "add"\|"edit"` · `defaultValues?: Combo` · `open` · `onClose` · `onSuccess` |
| D | `ProductSearchList` | new (local) | `app/admin/combos/_components/ProductSearchList.tsx` | `products: Product[]` · `selected: ComboItem[]` · `onChange: (items) => void` |
| D | `Input` | ✅ reuse | `components/ui/input.tsx` | — |
| D | `Card` | ✅ reuse | `components/ui/card.tsx` | Modal card wrapper |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```ts
interface Combo {
  id: string
  name: string
  description?: string
  price: number          // combo price
  retail_sum: number     // sum of individual product prices × qty
  savings: number        // retail_sum - price
  items: ComboItem[]
  created_at: string
  updated_at: string
}

interface ComboItem {
  product_id: string
  product_name: string
  quantity: number       // min 1
  unit_price: number     // price of this product
}

interface CreateComboPayload {
  name: string           // required
  description?: string
  price: number          // required, > 0
  items: { product_id: string; quantity: number }[]  // min 2 items
}

type UpdateComboPayload = Partial<CreateComboPayload>
```

### Query Configuration

```ts
// Fetch all combos
useQuery({
  queryKey: ['admin', 'combos'],
  queryFn: () => api.get('/api/v1/admin/combos'),
  staleTime: 30_000,
})

// Fetch products for modal search
useQuery({
  queryKey: ['admin', 'products'],
  queryFn: () => api.get('/api/v1/admin/products'),
  staleTime: 60_000,
})

// Create combo
useMutation({
  mutationFn: (payload: CreateComboPayload) => api.post('/api/v1/admin/combos', payload),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'combos'] }),
})

// Update combo
useMutation({
  mutationFn: ({ id, ...payload }: UpdateComboPayload & { id: string }) =>
    api.put(`/api/v1/admin/combos/${id}`, payload),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'combos'] }),
})

// Delete combo
useMutation({
  mutationFn: (id: string) => api.delete(`/api/v1/admin/combos/${id}`),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'combos'] }),
})
```

### Savings Auto-Calculation (in modal)

```ts
const retailSum = selectedItems.reduce(
  (sum, item) => sum + item.unit_price * item.quantity,
  0
)
const savings = retailSum - watchedPrice
// Show green note only when savings > 0
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| Empty combo list | `combos.length === 0` | Render `EmptyState` | "Chưa có combo nào. Nhấn + Thêm combo để bắt đầu." |
| Product search returns nothing | `filtered.length === 0` | Show inline message | "Không tìm thấy sản phẩm phù hợp" |
| Fewer than 2 products selected | `items.length < 2` | Disable "Lưu combo" + show error | "Combo phải có ít nhất 2 sản phẩm" |
| Combo price ≥ retail sum | `savings <= 0` | Hide savings note | No savings text shown (not an error) |
| Delete — non-Admin role | `role !== "admin"` | Hide "Xóa" button entirely | Button not rendered |
| Network error on save | Mutation `onError` | Toast error | "Lưu combo thất bại. Vui lòng thử lại." |
| Network error on load | Query `isError` | Show retry UI | "Tải danh sách thất bại. Nhấn để thử lại." |
| Duplicate combo name | API 409 response | Map error to field | "Tên combo đã tồn tại" below tên input |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Zone A: AdminTopNav renders with "Combo" tab active (orange underline)
- [ ] Zone B: title shows correct count "Combo (N)" matching list length
- [ ] Zone B: "+ Thêm combo" opens ComboFormModal in add mode (empty fields)
- [ ] Zone C: table renders all combo rows with product chips, prices, savings badges
- [ ] Zone C: "Sửa" opens ComboFormModal in edit mode with all fields pre-filled
- [ ] Zone C: "Xóa" only visible to Admin role; triggers delete mutation + list refresh
- [ ] Zone D: product search filters correctly by product name (client-side)
- [ ] Zone D: qty − button disabled when qty = 1
- [ ] Zone D: savings note auto-updates on price change and product qty change
- [ ] Zone D: "Lưu combo" disabled when items < 2
- [ ] Zone D: "Lưu combo" submits POST (add) or PUT (edit) correctly
- [ ] Zone D: modal closes and list refreshes on successful save

### Edge Case Tests
- [ ] Empty combo list shows EmptyState, not an empty table
- [ ] Product search with no match shows "Không tìm thấy" inline message
- [ ] Combo price ≥ retail sum hides savings note without error
- [ ] Delete confirmation shown before executing delete mutation
- [ ] Network error on save shows toast, keeps modal open

### Accessibility Tests
- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] Keyboard navigation works (Tab, Enter, Esc to close modal)
- [ ] Focus visible on all interactive elements
- [ ] Modal traps focus when open

### Cross-Device Tests
- [ ] Desktop (1280px+) — primary target
- [ ] Tablet (768px) — table horizontally scrollable
- [ ] Mobile (375px) — out of scope for admin pages; verify no horizontal overflow

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| COMBO-1 | FE | Wireframe + zone table | ✅ | wireframes/admin_main/admin_main_combos/admin_main_combos_wireframe_v1.md |
| COMBO-2 | FE | AdminTopNav integration (Zone A) | ⬜ | Zone A |
| COMBO-3 | FE | ComboPageHeader component (Zone B) | ⬜ | Zone B |
| COMBO-4 | FE | ComboTable component (Zone C) | ⬜ | Zone C |
| COMBO-5 | FE | ComboFormModal — add mode (Zone D) | ⬜ | Zone D |
| COMBO-6 | FE | ComboFormModal — edit mode pre-fill (Zone D) | ⬜ | Zone D |
| COMBO-7 | FE | ProductSearchList with qty controls (Zone D) | ⬜ | Zone D |
| COMBO-8 | FE | Savings auto-calculation + savings note (Zone D) | ⬜ | Zone D |
| COMBO-9 | FE | Delete with role guard + confirmation (Zone C) | ⬜ | Zone C |
| COMBO-10 | FE | EmptyState + error states wiring | ⬜ | Zone C |

---

## 📝 Changelog

**v1 (2026-05-26)**
- Initial scaffold based on `admin-main-combos.excalidraw`
- Zones documented: A (AdminTopNav), B (PageHeader), C (ComboTable), D (ComboFormModal)
- Modal covers both add and edit mode (same component, `mode` prop)

---

*Last Updated: 2026-05-26*
*Approved by: —*
*Next Review: After zone content reviewed with owner*
