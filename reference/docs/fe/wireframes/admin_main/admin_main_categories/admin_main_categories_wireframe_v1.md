---
page: admin_main_categories
route: /admin/categories
created: 2026-05-25
status: Draft
---

# Page: Admin — Categories
**Route:** `/admin/categories`
**Version:** v1
**Status:** Draft

## Spec Summary

- Desktop admin CRUD page for managing product categories (danh mục)
- Zone A: sticky AdminTopNav — "Quản trị hệ thống" header + 8-tab navigation, Danh mục tab active with orange underline
- Zone B: PageHeader — title "Danh mục (5)" shows live count + primary "+ Thêm danh mục" CTA (orange button)
- Zone C: CategoryTable (GET /api/v1/categories) — 2 columns (Tên danh mục, Thứ tự), 5 data rows, per-row Sửa + Xóa inline actions
- Zone D: Modal Thêm danh mục (POST /api/v1/categories) — form: Tên danh mục (required), Thứ tự (default 0) + Lưu / Hủy
- Zone E: Modal Sửa danh mục (PATCH /api/v1/categories/:id) — same form pre-filled with existing values, inputs highlighted with orange focus ring
- No delete confirmation modal in excalidraw — direct DELETE /api/v1/categories/:id or confirm dialog TBD (see conccern.md)

---

## 📐 Visual Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Zone A — AdminTopNav                                  ← sticky top-0 z-20   │
│ ┌────────────────────────────────────────────────────────────────────────┐   │
│ │  Quản trị hệ thống                                                     │   │
│ └────────────────────────────────────────────────────────────────────────┘   │
│  Tổng quan  Tổng kết  Sản phẩm  Combo  [Danh mục]  Topping  Nhân viên  ...  │
│                                           ──────── (orange underline)        │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Zone B — PageHeader                                                          │
│   Danh mục (5)                                    [ + Thêm danh mục ]       │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Zone C — CategoryTable  [GET /api/v1/categories]                             │
│ ┌──────────────────────────────────┬──────────┬────────────────────────────┐ │
│ │ Tên danh mục                     │ Thứ tự   │                            │ │
│ ├──────────────────────────────────┼──────────┼────────────────────────────┤ │
│ │ banh cuon                        │ 0        │      [ Sửa ]  [ Xóa ]      │ │
│ │ Bánh Cuốn                        │ 1        │      [ Sửa ]  [ Xóa ]      │ │
│ │ Mắn Phảy                         │ 2        │      [ Sửa ]  [ Xóa ]      │ │
│ │ Đặc Uống                         │ 3        │      [ Sửa ]  [ Xóa ]      │ │
│ │ Combo                            │ 4        │      [ Sửa ]  [ Xóa ]      │ │
│ └──────────────────────────────────┴──────────┴────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

Zone D — Modal: Thêm danh mục  [POST /api/v1/categories]
┌─────────────────────────────────────────┐
│  Thêm danh mục                       ×  │
│  ───────────────────────────────────    │
│  Tên danh mục *                         │
│  ┌───────────────────────────────────┐  │
│  │  Nhập tên danh mục...             │  │
│  └───────────────────────────────────┘  │
│  Thứ tự                                 │
│  ┌─────────────┐                        │
│  │  0          │                        │
│  └─────────────┘                        │
│                                         │
│                   [ Lưu ]   [ Hủy ]     │
└─────────────────────────────────────────┘

Zone E — Modal: Sửa danh mục  [PATCH /api/v1/categories/:id]
┌─────────────────────────────────────────┐
│  Sửa danh mục                        ×  │
│  ───────────────────────────────────    │
│  Tên danh mục *                         │
│  ┌───────────────────────────────────┐  │
│  │  Bánh Cuốn        (orange border) │  │
│  └───────────────────────────────────┘  │
│  Thứ tự                                 │
│  ┌─────────────┐                        │
│  │  1          │  (orange border)       │
│  └─────────────┘                        │
│                                         │
│                   [ Lưu ]   [ Hủy ]     │
└─────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| A | `AdminTopNav` | Always visible | sticky top-0 z-20 |
| B | `CategoryPageHeader` | Always visible | static, below Zone A |
| C | `CategoryTable` | Always visible; empty state when list is empty | static, scrollable |
| D | `AddCategoryModal` | Opens when "+ Thêm danh mục" is clicked | fixed overlay z-50 |
| E | `EditCategoryModal` | Opens when "Sửa" is clicked on a row | fixed overlay z-50 |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| C | TanStack Query → GET /api/v1/categories | invalidateQueries on mutation success | `['categories']` | staleTime: 60s; sort by sort_order asc client-side |
| B (count) | Derived from categories array length | Re-renders with Zone C data | `['categories']` | count = categories.length |
| D | Local RHF form state | POST → invalidate `['categories']` → close modal | — | sort_order default = 0 |
| E | RHF form seeded from selected Category object | PATCH → invalidate `['categories']` → close modal | — | selectedCategory held in local useState |

---

## 🧩 Component Specifications

| Zone | Component | File | Props / Interface |
|------|-----------|------|-----------------|
| A | `AdminTopNav` | `src/components/shared/AdminTopNav.tsx` | `activeTab: AdminTab` |
| B | `CategoryPageHeader` | `src/app/admin/categories/components/CategoryPageHeader.tsx` | `count: number; onAdd: () => void` |
| C | `CategoryTable` | `src/app/admin/categories/components/CategoryTable.tsx` | `categories: Category[]; onEdit: (c: Category) => void; onDelete: (id: string) => void` |
| D | `AddCategoryModal` | `src/app/admin/categories/components/AddCategoryModal.tsx` | `open: boolean; onClose: () => void` |
| E | `EditCategoryModal` | `src/app/admin/categories/components/EditCategoryModal.tsx` | `open: boolean; category: Category \| null; onClose: () => void` |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
interface Category {
  id: string;           // UUID
  name: string;         // Tên danh mục
  sort_order: number;   // Thứ tự (0-based display order)
  created_at: string;
  updated_at: string;
}

interface CategoryFormValues {
  name: string;         // required, non-empty
  sort_order: number;   // default 0
}
```

### Query Configuration

```typescript
// Fetch list
const { data: categories } = useQuery({
  queryKey: ['categories'],
  queryFn: () => apiClient.get<Category[]>('/api/v1/categories'),
  staleTime: 60_000,
});

// Mutations — all invalidate ['categories'] on success
const createCategory = useMutation({
  mutationFn: (body: CategoryFormValues) => apiClient.post('/api/v1/categories', body),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
});

const updateCategory = useMutation({
  mutationFn: ({ id, ...body }: CategoryFormValues & { id: string }) =>
    apiClient.patch(`/api/v1/categories/${id}`, body),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
});

const deleteCategory = useMutation({
  mutationFn: (id: string) => apiClient.delete(`/api/v1/categories/${id}`),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
});
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| Empty category list | `categories.length === 0` | Render empty state component | "Chưa có danh mục nào. Nhấn '+ Thêm danh mục' để bắt đầu." |
| Network error on load | TanStack Query `isError` | Log error | "Không thể tải danh mục. Vui lòng thử lại." + retry button |
| Duplicate category name | 409 from POST/PATCH | Set RHF field error on `name` | "Tên danh mục đã tồn tại." below name input |
| Delete category with products | 409/422 from DELETE | Show toast, do NOT close table | "Không thể xóa — danh mục đang có sản phẩm." |
| Sort order conflict | Server returns reordered list | Invalidate + refetch | Table reflects server sort_order |
| 403 Unauthorized | 403 from any mutation | Redirect to /admin/login | Toast: "Phiên đăng nhập hết hạn." |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Zone A: AdminTopNav renders; "Danh mục" tab has orange underline active state
- [ ] Zone B: Count in title matches `categories.length`; "+ Thêm danh mục" opens Zone D modal
- [ ] Zone C: Table renders all rows with Tên danh mục + Thứ tự columns; rows sorted by sort_order asc
- [ ] Zone C: "Sửa" button opens Zone E modal pre-filled with that row's data
- [ ] Zone C: "Xóa" button triggers delete flow (confirm or direct — resolve from conccern.md)
- [ ] Zone D: Name required validation fires on empty submit; POST succeeds; count in Zone B updates
- [ ] Zone E: Pre-filled values match selected row; PATCH succeeds; table reflects updated values

### Edge Case Tests
- [ ] Empty list shows empty state message
- [ ] Duplicate name shows inline error on Lưu
- [ ] Delete category with products shows error toast; row is NOT removed
- [ ] Network offline shows error state in Zone C with retry button

### Accessibility Tests
- [ ] All buttons min-h-[44px] min-w-[44px]
- [ ] Modal focus trap: Tab cycles inside modal only; Esc closes
- [ ] Modal title announced on open (aria-labelledby)
- [ ] Keyboard: Tab → Enter on Sửa/Xóa works without mouse

### Cross-Device Tests
- [ ] Desktop 1280px+ — primary target
- [ ] Tablet 768px — table scrolls horizontally if columns overflow
- [ ] Mobile 375px — admin not primary target but layout must not break

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| CAT-1 | FE | Scaffold page + CategoryTable (Zone B + C) | ⬜ | admin_main/admin_main_categories/admin_main_categories_wireframe_v1.md |
| CAT-2 | FE | AddCategoryModal (Zone D) | ⬜ | admin_main/admin_main_categories/admin_main_categories_wireframe_v1.md |
| CAT-3 | FE | EditCategoryModal (Zone E) | ⬜ | admin_main/admin_main_categories/admin_main_categories_wireframe_v1.md |
| CAT-4 | FE | Delete flow (confirm behaviour TBD — see conccern.md) | ⬜ | admin_main/admin_main_categories/admin_main_categories_wireframe_v1.md |

---

## 📝 Changelog

**v1 (2026-05-25)**
- Initial scaffold based on categories.excalidraw
- Zones documented: A (AdminTopNav), B (PageHeader), C (CategoryTable), D (AddModal), E (EditModal)
- Sample data rows from excalidraw: banh cuon (0), Bánh Cuốn (1), Mắn Phảy (2), Đặc Uống (3), Combo (4)

---

*Last Updated: 2026-05-25*
*Approved by: —*
*Next Review: After delete confirmation behaviour decided (see conccern.md)*
