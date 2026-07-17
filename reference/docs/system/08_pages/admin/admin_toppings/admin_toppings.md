# Admin Toppings — `/admin/toppings`

> **TL;DR:** ✅ implemented · manager+ · Topping CRUD: header with add button, topping table
> (name, price, which products use it), form modal. Toppings attach to products and surface in the
> `ToppingSelector` on `/menu/product/:id`.

---

## ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ (admin shell: tab nav)                                           │
├──────────────────────────────────────────────────────────────────┤
│ Topping (6)                                    [+ Thêm topping]  │ ← ToppingPageHeader
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────┐ │ ← ToppingTable
│ │ Tên topping  Áp dụng cho SP   Giá thêm  Trạng thái  Hành động │ │
│ │ Chả lụa      BC thịt, BC tôm  +10.000đ  [Có sẵn]    [Sửa][Xóa]│ │
│ │ Hành phi     BC thịt          +5.000đ   [Có sẵn]    [Sửa][Xóa]│ │
│ │ Rau          Chưa gắn SP      Miễn phí  [Hết]       [Sửa][Xóa]│ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
  Overlay: topping form modal — tên *, giá thêm (0 = Miễn phí),
           trạng thái (toggle Có sẵn/Hết)  [Hủy][Lưu topping]
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| Header | `toppings/_components/ToppingPageHeader` | topping count |
| Table | `toppings/_components/ToppingTable` | `listToppings` (`['admin','toppings']` → `GET /toppings`) + `listProducts` (`['admin','products']` → `GET /products/all`) for the "Áp dụng cho sản phẩm" column |
| Form modal | `toppings/_components/ToppingFormModal` | `createTopping` (name, price) / `updateTopping` (name, price, is_available); `deleteTopping` mutation lives on the page |

> Endpoints traced to Go source → [admin_toppings_be.md](admin_toppings_be.md).

## Key Interactions

- **+ Thêm topping** → modal · **Sửa** → edit (modal pre-filled, can toggle Có sẵn/Hết) · **Xóa** →
  JS `confirm()` (warns it will unlink N products) then `DELETE /toppings/:id`. **Delete is NOT
  rejected server-side for in-use toppings** — the BE soft-deletes unconditionally (see
  [admin_toppings_be.md Flag 3](admin_toppings_be.md)). All writes invalidate `['admin','toppings']`.
- **Create always inserts `is_available=1`** (the BE hardcodes it; the modal's status toggle only
  takes effect on edit) → [admin_toppings_be.md §3](admin_toppings_be.md).
- Product↔topping assignment happens on the product form (`/admin/products`), not here.

## Business Logic Used

- Topping price snapshot copied into `toppings_snapshot` at order time (price edits don't change
  past orders) → [../02_spec/BUSINESS_RULES.md §2 Order Rules](../02_spec/BUSINESS_RULES.md#2-order-rules)
- The "Rau" topping doubles as the canh có/không-rau variant marker on KDS →
  [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (KDS variant rules)
- Admin CRUD pattern → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (admin CRUD pattern)
