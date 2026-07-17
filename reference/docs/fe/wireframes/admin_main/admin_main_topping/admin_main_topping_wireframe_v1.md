---
page: admin_main_topping
route: /admin/toppings
created: 2026-05-27
status: Draft
---

# Page: Admin — Topping
**Route:** `/admin/toppings`
**Version:** v1
**Status:** Draft

## Spec Summary

- Desktop CRUD page for managing toppings (paid or free add-ons for bánh cuốn dishes)
- Zone A: shared `AdminTopNav` — "Topping" tab active with orange underline indicator
- Zone B: `ToppingPageHeader` — title "Topping" + count badge (23) + "+ Thêm topping" CTA button
- Zone C: `ToppingTable` — columns: Tên topping · Áp dụng cho sản phẩm · Giá thêm · Trạng thái · Thao tác (Sửa + Xóa per row)
- Zone D: `ToppingFormModal` — 3-field add/edit form: tên topping (text), giá thêm (number, 0 = Miễn phí), trạng thái (toggle). Title switches "Thêm topping" / "Sửa topping". APIs: POST/PATCH `/api/v1/admin/toppings[/:id]`
- Toppings link to products via "Áp dụng cho sản phẩm" column — shows "Chưa gắn sản phẩm" or product name pill tags
- Query key `['admin', 'toppings']` already registered (staleTime 60s) — reuse; do not create a new key

---

## 📐 Visual Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Zone A — AdminNav  ← sticky top-0 z-50                                                      │
│ bg-[#1e293b]  h-[52px]                                                                       │
│ ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Quản trị hệ thống  │ Tổng quan  Tổng kết  Sản phẩm  Combo  Danh mục  [Topping]  Nhân  │ │
│ │                    │                                            ^^^^^^^^           viên  │ │
│ │                    │                                           (orange)  Kho NL  Mktg  │ │
│ └─────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                    ▔▔▔▔▔▔ (orange underline)                                │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Zone B — PageHeader  bg-[#f8fafc]  h-[60px]                                                  │
│  Topping  [23]                                               [+ Thêm topping]               │
│   h1 18px  badge orange                                       btn orange h-[36px]            │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Zone C — ToppingTable  bg-white  scrollable                                                  │
│ ┌────────────────┬─────────────────────────────┬──────────┬────────────┬───────────────┐   │
│ │ Tên topping    │ Áp dụng cho sản phẩm         │ Giá thêm │ Trạng thái │ Thao tác      │   │
│ ├────────────────┼─────────────────────────────┼──────────┼────────────┼───────────────┤   │
│ │ Chả quế        │ Chưa gắn sản phẩm            │ +8.000đ  │ [Có sẵn]  │ [Sửa] [x]    │   │
│ ├────────────────┼─────────────────────────────┼──────────┼────────────┼───────────────┤   │
│ │ Giò lụa        │ Chưa gắn sản phẩm            │ +10.000đ │ [Có sẵn]  │ [Sửa] [x]    │   │
│ ├────────────────┼─────────────────────────────┼──────────┼────────────┼───────────────┤   │
│ │ Hành phi       │ [Bánh Cuốn Thập Cẩm]         │ Miễn phí │ [Có sẵn]  │ [Sửa] [x]    │   │
│ ├────────────────┼─────────────────────────────┼──────────┼────────────┼───────────────┤   │
│ │ Tôm tươi       │ Chưa gắn sản phẩm            │ +15.000đ │ [Có sẵn]  │ [Sửa] [x]    │   │
│ ├────────────────┼─────────────────────────────┼──────────┼────────────┼───────────────┤   │
│ │ Trứng chiên    │ Chưa gắn sản phẩm            │ +5.000đ  │ [Có sẵn]  │ [Sửa] [x]    │   │
│ ├────────────────┴─────────────────────────────┴──────────┴────────────┴───────────────┤   │
│ │            ... 18 topping khác · cuộn để xem thêm                                    │   │
│ └───────────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

 ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  Zone D — AddEditModal (overlay)
 │  ┌────────────────────────────────────────┐    │
 │  │ Thêm topping                        ×  │    │  → "Sửa topping" when editing
 │  ├────────────────────────────────────────┤    │
 │  │  Tên topping *                          │    │
 │  │  [ Nhập tên topping...              ]  │    │  Input required
 │  │                                          │    │
 │  │  Giá thêm (đ)                            │    │
 │  │  [ 0                                ]   │    │  0 = Miễn phí
 │  │                                          │    │
 │  │  Trạng thái                              │    │
 │  │  [●──] Có sẵn                            │    │  Toggle — green = available
 │  │                                          │    │
 │  │  POST /api/v1/admin/toppings             │    │
 │  │  PATCH /api/v1/admin/toppings/:id        │    │
 │  ├────────────────────────────────────────┤    │
 │  │  [    Hủy    ]   [    Lưu topping    ] │    │
 │  └────────────────────────────────────────┘    │
 └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

Data: GET /api/v1/admin/toppings → TanStack Query ['admin', 'toppings']
      DELETE /api/v1/admin/toppings/:id
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| A | `AdminTopNav` | Always visible | sticky top-0 z-50 |
| B | `ToppingPageHeader` | Always visible | static (below nav) |
| C | `ToppingTable` | Always visible; `EmptyState` when list is empty | static, scrollable body |
| D | `ToppingFormModal` | Shown when addModalOpen=true or editTopping≠null | fixed overlay, z-50 |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| B | Derived from topping list length | Computed from `data.length` | `['admin', 'toppings']` | Count badge reads list length |
| C | `GET /api/v1/admin/toppings` | TanStack Query, invalidate on mutation | `['admin', 'toppings']` | Full list, client-side display; staleTime 60s |
| D (save) | `POST /api/v1/admin/toppings` | Mutation → invalidate `['admin', 'toppings']` | — | Create flow |
| D (edit) | `PATCH /api/v1/admin/toppings/:id` | Mutation → invalidate `['admin', 'toppings']` | — | Edit flow; pre-fills form with selected topping |
| C (delete) | `DELETE /api/v1/admin/toppings/:id` | Mutation → invalidate `['admin', 'toppings']` | — | Confirm before delete |
| A | `useAuthStore.user.role` | Zustand | N/A | Guards page access |

---

## 🧩 Component Specifications

> Before filling this table: read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md`.
> Mark each row with one of: `✅ reuse` · `new (local)` · `new (shared)`

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|-----------------|
| A | `AdminTopNav` | ✅ reuse | `components/shared/AdminTopNav.tsx` | `activeTab: 'topping'` |
| — | `AuthGuard` | ✅ reuse | `components/guards/AuthGuard.tsx` | — |
| — | `RoleGuard` | ✅ reuse | `components/guards/RoleGuard.tsx` | `allowedRoles: ['admin', 'manager']` |
| B | `ToppingPageHeader` | new (local) | `app/admin/toppings/components/ToppingPageHeader.tsx` | `count: number · onAdd: () => void` |
| C | `ToppingTable` | new (local) | `app/admin/toppings/components/ToppingTable.tsx` | `toppings: Topping[] · onEdit: (t: Topping) => void · onDelete: (id: string) => void` |
| C | `Badge` | ✅ reuse | `components/ui/badge.tsx` | `variant="success"` (Có sẵn) · `variant="secondary"` (Hết) |
| C | `Button` | ✅ reuse | `components/ui/button.tsx` | `variant="outline" size="sm"` (Sửa) · `variant="destructive" size="icon-sm"` (Xóa) |
| C | `EmptyState` | ✅ reuse | `components/shared/EmptyState.tsx` | `message="Chưa có topping nào"` |
| D | `ToppingFormModal` | new (local) | `app/admin/toppings/components/ToppingFormModal.tsx` | `open: boolean · topping?: Topping · onClose: () => void` |
| D | `Input` | ✅ reuse | `components/ui/input.tsx` | name, price fields |
| D | `Label` | ✅ reuse | `components/ui/label.tsx` | form labels |
| D | `Button` | ✅ reuse | `components/ui/button.tsx` | `variant="outline"` (Hủy) · `variant="default"` (Lưu) |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
interface Topping {
  id: string               // UUID
  name: string             // "Chả quế", "Hành phi", etc.
  extraPrice: number       // 0 = free (Miễn phí); positive = added cost in VND
  isAvailable: boolean     // true = "Có sẵn"
  productIds?: string[]    // UUIDs of products this topping is linked to (can be empty)
  productNames?: string[]  // Display names for "Áp dụng cho sản phẩm" column
}

interface ToppingFormValues {
  name: string
  extraPrice: number       // 0 allowed (Miễn phí)
  isAvailable: boolean
}

// Zod schema for ToppingFormModal
const toppingSchema = z.object({
  name: z.string().min(1, 'Tên topping không được để trống'),
  extraPrice: z.number().min(0, 'Giá không được âm'),
  isAvailable: z.boolean(),
})
```

### Query Configuration

```typescript
// hooks/useToppingQueries.ts

export function useToppings() {
  return useQuery({
    queryKey: ['admin', 'toppings'],
    queryFn: () => apiFetch('/api/v1/admin/toppings'),
    staleTime: 60_000,
  })
}

export function useCreateTopping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ToppingFormValues) =>
      apiFetch('/api/v1/admin/toppings', { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'toppings'] }),
  })
}

export function useUpdateTopping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ToppingFormValues }) =>
      apiFetch(`/api/v1/admin/toppings/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'toppings'] }),
  })
}

export function useDeleteTopping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/admin/toppings/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'toppings'] }),
  })
}
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| Empty topping list | `data.length === 0` | Show `<EmptyState>` | "Chưa có topping nào — nhấn + Thêm topping để bắt đầu" |
| Network error on load | `isError === true` | Show error banner | "Không tải được danh sách topping. Thử lại?" with retry button |
| Delete fails (server error) | `onError` callback | Toast error | "Xóa topping thất bại. Vui lòng thử lại." |
| Save/edit fails | `onError` callback | Show error in modal | Keep modal open, show inline error message |
| Topping linked to products | `productIds.length > 0` | Allow delete with warning | "Topping này đang áp dụng cho [N] sản phẩm. Xóa sẽ gỡ liên kết. Tiếp tục?" |
| Duplicate topping name | Server 400/409 | Surface error in form | "Tên topping đã tồn tại" under the name field |
| Very long topping name | CSS overflow | `truncate` class on name cell | Show full name in tooltip on hover |
| Price = 0 | extraPrice === 0 | Format as "Miễn phí" in table | Green text instead of "+0đ" |

---

## 🧪 Testing & QA Checklist

### Functional Tests

- [ ] Zone A: AdminTopNav renders with "Topping" tab active (orange, underlined)
- [ ] Zone B: Count badge reflects actual number of toppings from API
- [ ] Zone B: Clicking "+ Thêm topping" opens Zone D modal in "add" mode
- [ ] Zone C: Table renders all toppings from `GET /api/v1/admin/toppings`
- [ ] Zone C: "Áp dụng cho sản phẩm" shows product pill tags when linked, "Chưa gắn sản phẩm" (muted) when not
- [ ] Zone C: Giá thêm shows "Miễn phí" (green) when extraPrice = 0; "+N.000đ" otherwise
- [ ] Zone C: Trạng thái badge — green "Có sẵn" vs secondary "Hết"
- [ ] Zone C: Clicking "Sửa" opens Zone D modal pre-filled with that topping's data, title = "Sửa topping"
- [ ] Zone C: Clicking [x] shows delete confirmation; confirming calls DELETE and invalidates query
- [ ] Zone D: Form validates — name required, price ≥ 0
- [ ] Zone D: "Lưu topping" (add mode) calls POST, closes modal, table refreshes
- [ ] Zone D: "Lưu topping" (edit mode) calls PATCH with topping id, closes modal, table refreshes
- [ ] Zone D: "Hủy" closes modal without saving; form state resets

### Edge Case Tests

- [ ] Empty list → EmptyState shown, not an empty table
- [ ] Network error → error state displayed
- [ ] Delete topping linked to products → warning dialog shown
- [ ] Duplicate name submission → form error shown without closing modal
- [ ] Price = 0 → "Miễn phí" rendered in table

### Accessibility Tests

- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] Keyboard navigation works (Tab → Enter → Esc closes modal)
- [ ] Focus trapped inside modal when open
- [ ] Focus visible on all interactive elements

### Cross-Device Tests

- [ ] Desktop (1280px+) — primary target
- [ ] Tablet (768px) — table should still be usable (horizontal scroll acceptable)
- [ ] Mobile (375px) — table can scroll horizontally

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| TOPPING-1 | FE | Wireframe + zone table | ✅ | wireframes/admin_main/admin_main_topping/admin_main_topping_wireframe_v1.md |
| TOPPING-2 | FE | `ToppingPageHeader` component | ⬜ | Zone B |
| TOPPING-3 | FE | `ToppingTable` component + row actions | ⬜ | Zone C |
| TOPPING-4 | FE | `ToppingFormModal` (add/edit, RHF+Zod) | ⬜ | Zone D |
| TOPPING-5 | FE | `useToppingQueries` hook (GET/POST/PATCH/DELETE) | ⬜ | Data Sources |
| TOPPING-6 | FE | `page.tsx` — ISR + HydrationBoundary + assemble zones | ⬜ | All zones |

---

## 📝 Changelog

**v1 (2026-05-27)**
- Initial scaffold based on `admin-topping.excalidraw`
- Zones documented: A (AdminNav) · B (PageHeader) · C (ToppingTable) · D (ToppingFormModal)
- Query key `['admin', 'toppings']` reused from existing index (staleTime 60s)

---

*Last Updated: 2026-05-27*
*Approved by: —*
*Next Review: After zone content reviewed with owner*
