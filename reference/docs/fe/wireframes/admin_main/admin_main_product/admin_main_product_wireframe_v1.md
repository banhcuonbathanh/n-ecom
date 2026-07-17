---
page: admin_main_product
route: /admin/products
created: 2026-05-26
status: Draft
---

# Page: Admin — Products
**Route:** `/admin/products`
**Version:** v1
**Status:** Draft

## Spec Summary

- Admin CRUD page for managing all menu products (bánh cuốn, đồ uống, món thêm, v.v.)
- Table lists products with thumbnail, name, category, topping badges, price, and availability status
- Status "Đang bán" (green) or "Hết hàng" (gray) — managed via the Edit modal
- `ProductFormModal` handles both Add and Edit flows with shared form: category, name, description, image upload, price, sort order, topping assignment
- Topping checkboxes show name + price delta (Miễn phí / +X ₫) — data from `['admin', 'toppings']`
- "🌱 Dữ liệu mẫu" button seeds sample products for dev/testing purposes

---

## 📐 Visual Wireframe

```
╔═══════════════════════════════════════════════════════════════════════════════════════ sticky top-0 z-20 ═╗
║  Nav — AdminTopNav                                                                                        ║
║  Quản trị hệ thống  │ Tổng quan │ Tổng kết │ [■ Sản phẩm ■] │ Combo │ Danh mục │ Topping │ Nhân viên    ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════════╝

  Zone A — PageHeader
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Sản phẩm (15)                                                  [🌱 Dữ liệu mẫu]  [+ Thêm sản phẩm]     │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  Zone B — ProductsTable  (GET /admin/products)
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🖼  │ Tên sản phẩm            │ Danh mục    │ Topping                   │ Giá        │ Trạng thái │ Act  │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  🖼  │ Bánh cuốn nhân tôm      │ Bánh cuốn   │ [Hành phi] [Rượu cà tẩm]  │ 45.000 ₫   │ [Đang bán]  │ [Sửa][Xóa] │
│  🖼  │ Trà đá                  │ Đồ uống     │ —                          │ 10.000 ₫   │ [Đang bán]  │ [Sửa][Xóa] │
│  🖼  │ Bánh cuốn đặc biệt      │ Bánh cuốn   │ [Hành phi] [+4 more]       │ 65.000 ₫   │ [Đang bán]  │ [Sửa][Xóa] │
│  🖼  │ Nem rán                 │ Món thêm    │ —                          │ 35.000 ₫   │ [Hết hàng]  │ [Sửa][Xóa] │
│       ── 11 sản phẩm khác (same row pattern) ──                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  Modal M1 — ProductFormModal (shared for Add and Edit)
  ┌────────────────────────────────────────────┐
  │  Thêm sản phẩm                        [×]  │
  ├────────────────────────────────────────────┤
  │  Danh mục *                                │
  │  ┌──────────────────────────────────────┐  │
  │  │ -- Chọn danh mục --               ▾  │  │
  │  └──────────────────────────────────────┘  │
  │  Tên sản phẩm *                            │
  │  ┌──────────────────────────────────────┐  │
  │  │ Bánh cuốn nhân tôm                   │  │
  │  └──────────────────────────────────────┘  │
  │  Mô tả (tuỳ chọn)                          │
  │  ┌──────────────────────────────────────┐  │
  │  │                                      │  │
  │  └──────────────────────────────────────┘  │
  │  Hình ảnh                                  │
  │  ┌──────┐  [Chọn ảnh]                      │
  │  │  🖼  │  Chưa có ảnh                     │
  │  └──────┘                                  │
  │  Giá (₫) *         Thứ tự                  │
  │  ┌────────────┐  ┌────────────┐            │
  │  │ 0          │  │ 0          │            │
  │  └────────────┘  └────────────┘            │
  │  Topping áp dụng                           │
  │  ┌──────────────────────────────────────┐  │
  │  │ ☐ Hành phi                Miễn phí   │  │
  │  │ ☑ Trứng chiên             +5.000 ₫   │  │
  │  │ ☐ Giò lụa                 +10.000 ₫  │  │
  │  │ 1 topping đã chọn                    │  │
  │  └──────────────────────────────────────┘  │
  │       [Huỷ]              [Lưu]             │
  └────────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| Nav | `AdminTopNav` | Always | sticky top-0 z-20 |
| A | `ProductPageHeader` | Always | static |
| B | `ProductsTable` | Always; `EmptyState` when 0 products | static, scrollable |
| M1 | `ProductFormModal` | When "Thêm sản phẩm" or "Sửa" clicked | modal overlay, centered |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| Nav | `useAuthStore.user` | Zustand | N/A | Drives active tab highlight |
| B | TanStack Query → `GET /api/v1/admin/products` | Invalidate on POST/PATCH/DELETE | `['admin', 'products']` | staleTime 30s |
| M1 | TanStack Query → `GET /api/v1/categories` | Read-only — form select | `['categories']` | staleTime 60s; shared with Menu |
| M1 | TanStack Query → `GET /api/v1/admin/toppings` | Read-only — checkbox list | `['admin', 'toppings']` | staleTime 60s; NEW key |

---

## 🧩 Component Specifications

> Before filling this table: read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md`.
> Mark each row with one of: `✅ reuse` · `new (local)` · `new (shared)`

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|-------------------|
| Nav | `AdminTopNav` | ✅ reuse | `shared/AdminTopNav.tsx` | `activeTab="products"` |
| — | `AuthGuard` | ✅ reuse | `guards/AuthGuard.tsx` | Wraps page content |
| — | `RoleGuard` | ✅ reuse | `guards/RoleGuard.tsx` | `allowedRoles={['admin', 'manager']}` |
| A | `ProductPageHeader` | new (local) | `app/admin/products/_components/ProductPageHeader.tsx` | `count: number · onAdd: () => void · onSeed: () => void` |
| B | `ProductsTable` | new (local) | `app/admin/products/_components/ProductsTable.tsx` | `products: Product[] · onEdit: (p: Product) => void · onDelete: (id: string) => void` |
| B | `Badge` | ✅ reuse | `ui/badge.tsx` | `variant="success"` Đang bán · `variant="secondary"` Hết hàng |
| B | `EmptyState` | ✅ reuse | `shared/EmptyState.tsx` | `message="Chưa có sản phẩm nào"` |
| M1 | `ProductFormModal` | new (local) | `app/admin/products/_components/ProductFormModal.tsx` | `mode: 'add' \| 'edit' · product?: Product · open: boolean · onClose: () => void` |
| M1 | `Button` | ✅ reuse | `ui/button.tsx` | Huỷ: `variant="outline"` · Lưu: `variant="default"` (orange) |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
interface Product {
  id: string           // UUID
  category_id: string
  category_name: string
  name: string
  description?: string
  image_url?: string
  price: number        // VND, integer
  sort_order: number
  status: 'available' | 'out_of_stock'
  toppings: ProductTopping[]
}

interface ProductTopping {
  id: string
  name: string
  extra_price: number  // 0 = Miễn phí
}

interface Topping {
  id: string
  name: string
  extra_price: number
}

interface ProductFormValues {
  category_id: string
  name: string
  description?: string
  image_url?: string
  price: number
  sort_order: number
  topping_ids: string[]
}
```

### Query Configuration

```typescript
// Products list
useQuery({ queryKey: ['admin', 'products'], queryFn: fetchAdminProducts, staleTime: 30_000 })

// Category dropdown (modal form)
useQuery({ queryKey: ['categories'], queryFn: fetchCategories, staleTime: 60_000 })

// Topping checkbox list (modal form)
useQuery({ queryKey: ['admin', 'toppings'], queryFn: fetchAdminToppings, staleTime: 60_000 })

// Mutations — all invalidate ['admin', 'products'] on success
const addMutation    = useMutation({ mutationFn: createProduct, onSuccess: invalidateProducts })
const editMutation   = useMutation({ mutationFn: updateProduct, onSuccess: invalidateProducts })
const deleteMutation = useMutation({ mutationFn: deleteProduct, onSuccess: invalidateProducts })
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| Empty product list | `products.length === 0` | Render `EmptyState` | "Chưa có sản phẩm nào" with add CTA |
| Image upload fails | Upload API 4xx / network | Field-level error | "Không thể tải ảnh lên. Vui lòng thử lại." |
| Form submit — network error | Mutation `onError` | Keep modal open | Toast: "Lưu không thành công, vui lòng thử lại" |
| Duplicate product name | Server 409 | Map to `name` field error | "Tên sản phẩm đã tồn tại" |
| Delete product in active order | Server 409 conflict | Show inline error | "Sản phẩm đang có đơn hàng đang xử lý, không thể xoá" |
| Category list empty (form) | `categories.length === 0` | Disable submit | "Chưa có danh mục nào. Vui lòng thêm danh mục trước." |
| Topping list empty (form) | `toppings.length === 0` | Hide topping section | "Chưa có topping nào được thiết lập." |
| No image selected | `image_url === undefined` | Allow submit | Show 🖼 placeholder thumbnail in table |
| Price = 0 | Zod validation | Block submit | "Giá sản phẩm phải lớn hơn 0" |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Zone B: Table renders all rows with image / name / category / topping badges / price / status
- [ ] Zone B: Topping column — max 2 badge pills shown, overflow as "+N more"
- [ ] Zone B: Status badge — "Đang bán" = green, "Hết hàng" = gray
- [ ] Zone A: "+ Thêm sản phẩm" opens M1 in add mode (blank form)
- [ ] Zone B: "Sửa" opens M1 in edit mode, pre-fills form with existing product data
- [ ] Zone B: "Xóa" triggers confirm dialog → confirms → deletes → table refreshes
- [ ] M1: Zod validation — name required, category required, price > 0
- [ ] M1: Image upload shows preview after file selected
- [ ] M1: Topping checkboxes — checked count displayed as "N topping đã chọn"
- [ ] M1: "Lưu" — POST on add mode · PATCH on edit mode · modal closes · table refreshes

### Edge Case Tests
- [ ] Empty product list → EmptyState renders with add button
- [ ] Submit with network error → modal stays open, toast shown
- [ ] Submit duplicate name → name field error shown
- [ ] Delete product with active orders → inline error shown, product remains

### Accessibility Tests
- [ ] All interactive elements `min-h-[44px] min-w-[44px]`
- [ ] Keyboard: Tab through form · Enter submits · Esc closes modal
- [ ] Focus trap active inside modal
- [ ] Screen reader labels on image placeholders

### Cross-Device Tests
- [ ] Desktop viewport (1280px+) — full table columns visible
- [ ] Modal fits viewport on 1280px+

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| PROD-1 | FE | Wireframe + zone table | ✅ | wireframes/admin_main/admin_main_product/admin_main_product_wireframe_v1.md |
| PROD-2 | FE | `ProductPageHeader` + `ProductsTable` (Zone A + B) | ⬜ | Zone A, Zone B |
| PROD-3 | FE | `ProductFormModal` — Add + Edit + topping checkboxes | ⬜ | Modal M1 |
| PROD-4 | FE | API integration — products · categories · toppings | ⬜ | All zones |

---

## 📝 Changelog

**v1 (2026-05-26)**
- Initial scaffold from `admin-products.excalidraw`
- Zones documented: Nav (AdminTopNav sticky) + Zone A (PageHeader) + Zone B (ProductsTable) + Modal M1 (ProductFormModal)
- Data sources: `['admin', 'products']` · `['categories']` · `['admin', 'toppings']` (new key)

---

*Last Updated: 2026-05-26*
*Approved by: —*
*Next Review: After RBAC rules confirmed with owner*
