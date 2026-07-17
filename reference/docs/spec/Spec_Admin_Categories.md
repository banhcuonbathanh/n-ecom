# 🗂️ HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
## SPEC — Admin: Quản Lý Danh Mục (`/admin/categories`)
> **Version:** v1.0 · Route: `/admin/categories` · Phụ thuộc: Spec 1 (Auth), API_CONTRACT §categories
> **Model:** Sonnet · Tháng 5/2026

---

## 1. Mục Tiêu

Cho phép Admin/Manager tạo, sửa, xóa, sắp xếp danh mục sản phẩm (Bánh Cuốn, Chả, Combo, ...).
Danh mục hiển thị trên trang `/menu` cho khách hàng dưới dạng tab lọc — thứ tự `sort_order` quyết định thứ tự tab.

---

## 2. RBAC

| Role | Xem | Thêm | Sửa | Xóa |
|---|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `manager` | ✅ | ✅ | ✅ | ✅ |
| `cashier` / `chef` / `staff` | ❌ | ❌ | ❌ | ❌ |

> Guard: `RoleGuard` yêu cầu role ≥ `manager`. Redirect về `/dashboard` nếu không đủ quyền.

---

## 3. Data Model

```ts
interface Category {
  id:         string   // UUID
  name:       string   // max 100 ký tự
  sort_order: number   // integer, mặc định 0 — thứ tự nhỏ hơn hiển thị trước
  created_at: string   // ISO 8601
}
```

---

## 4. API Endpoints

| Method | Endpoint | Auth | Mô Tả |
|---|---|---|---|
| GET | `/api/v1/categories` | Public | List tất cả categories (đã sort theo sort_order) |
| POST | `/api/v1/categories` | Bearer (manager+) | Tạo danh mục mới |
| PATCH | `/api/v1/categories/:id` | Bearer (manager+) | Cập nhật name / sort_order |
| DELETE | `/api/v1/categories/:id` | Bearer (manager+) | Xóa danh mục (lỗi nếu còn sản phẩm) |

### POST / PATCH body
```json
{ "name": "Bánh Cuốn", "sort_order": 1 }
```
- `name`: required cho POST, optional cho PATCH
- `sort_order`: optional, default 0

### Response 200 (GET list)
```json
{ "data": [ { "id": "...", "name": "Bánh Cuốn", "sort_order": 1, "created_at": "..." } ] }
```

---

## 5. UI Layout

```
┌────────────────────────────────────────────────────┐
│  Danh mục (N)                    [+ Thêm danh mục] │  ← Header row
├────────────────────────────────────────────────────┤
│  Tên danh mục        Thứ tự          Hành động     │  ← Table header (bg-gray-50)
├────────────────────────────────────────────────────┤
│  Bánh Cuốn              1            [Sửa] [Xóa]   │
│  Chả                    2            [Sửa] [Xóa]   │
│  Combo                  3            [Sửa] [Xóa]   │
│  ...                                               │
├────────────────────────────────────────────────────┤
│  (empty state) "Chưa có danh mục nào"              │  ← khi list rỗng
└────────────────────────────────────────────────────┘
```

### Modal Thêm / Sửa
```
┌─────────────────────────────┐
│  Thêm danh mục              │  ← title thay đổi khi edit
├─────────────────────────────┤
│  Tên danh mục *             │
│  [ input text            ]  │
│                             │
│  Thứ tự hiển thị            │
│  [ input number          ]  │
├─────────────────────────────┤
│  [    Huỷ    ] [   Lưu   ]  │
└─────────────────────────────┘
```

---

## 6. Component Tree

```
CategoriesPage (app/(dashboard)/admin/categories/page.tsx)
├── Header row: title + "Thêm" button
├── LoadingSkeleton           ← khi isLoading
├── Table (bg-white rounded-xl shadow-sm)
│   ├── thead: Tên | Thứ tự | (actions)
│   └── tbody: categories.map → CategoryRow
│       ├── name cell
│       ├── sort_order cell (text-center)
│       └── actions: [Sửa] [Xóa]
├── EmptyState                ← khi categories.length === 0
└── CategoryModal             ← controlled by showModal state
    ├── RHF form (Zod schema)
    ├── Field: name (text input)
    ├── Field: sort_order (number input)
    └── Actions: Huỷ | Lưu
```

---

## 7. State & Data Fetching

```ts
// React Query
queryKey: ['admin', 'categories']
queryFn:  listCategories()           // GET /categories
staleTime: 0                         // luôn refetch khi focus (admin data)

// Local state
editItem: Category | null            // null = add mode, set = edit mode
showModal: boolean
```

### Mutations
| Action | API | onSuccess |
|---|---|---|
| Save (add) | POST /categories | invalidate ['admin','categories'] + toast "Đã thêm danh mục" |
| Save (edit) | PATCH /categories/:id | invalidate ['admin','categories'] + toast "Đã cập nhật danh mục" |
| Delete | DELETE /categories/:id | invalidate ['admin','categories'] + toast "Đã xóa danh mục" |

---

## 8. Validation (Zod Schema)

```ts
z.object({
  name:       z.string().min(1, 'Nhập tên danh mục').max(100),
  sort_order: z.coerce.number().int().default(0),
})
```

---

## 9. Error Handling

| Lỗi | Toast |
|---|---|
| Network / 5xx | "Có lỗi xảy ra" |
| DELETE 409 (còn sản phẩm) | "Không thể xóa danh mục" |
| DELETE confirm | `window.confirm('Xóa danh mục "..."?')` trước khi gọi API |

---

## 10. Design Tokens

> Không hardcode hex — dùng Tailwind token từ `tailwind.config.ts`

| Element | Token |
|---|---|
| Primary button (Thêm, Lưu) | `bg-orange-500 hover:bg-orange-600 text-white` |
| Delete button | `border-red-200 text-red-600 hover:bg-red-50` |
| Table header | `bg-gray-50 text-gray-600` |
| Table row hover | `hover:bg-gray-50` |
| Input focus ring | `focus:ring-orange-500` |
| Modal overlay | `bg-black/50` |

---

## 11. Thay Đổi Cần Làm (TODO)

> Ghi vào đây những gì bạn muốn thay đổi — sau đó Claude sẽ implement theo spec.

<!-- EXAMPLE:
- [ ] Thêm cột "Số sản phẩm" trong table hiển thị có bao nhiêu sản phẩm thuộc danh mục này
- [ ] Đổi delete confirm từ window.confirm → modal đẹp hơn
- [ ] Thêm drag-and-drop để sắp xếp lại sort_order
- [ ] Skeleton loading thay vì text "Đang tải..."
-->

