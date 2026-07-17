# Admin Products — `/admin/products`

> **TL;DR:** ✅ implemented · manager+ · Product CRUD: page header with add button, products table
> (name, category, price, toppings, availability), form modal with image upload and topping
> assignment. Changing products invalidates the whole `['admin']` query family so menu data stays
> consistent.

---

## ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ (admin shell: tab nav)                                           │
├──────────────────────────────────────────────────────────────────┤
│ A  Sản phẩm (24)                              [+ Thêm sản phẩm]  │ ← ProductPageHeader
├──────────────────────────────────────────────────────────────────┤
│ B  ┌──────────────────────────────────────────────────────────┐  │ ← ProductsTable
│    │ [img] Tên           Danh mục    Giá      Còn hàng  HĐ    │  │
│    │ [▣] Bánh cuốn thịt  Bánh cuốn   35.000đ  ● bật   [✎][🗑] │  │
│    │ [▣] Canh mọc        Canh        10.000đ  ● bật   [✎][🗑] │  │
│    │ [▣] BC tôm          Bánh cuốn   45.000đ  ○ tắt   [✎][🗑] │  │
│    └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
  Overlay: ProductFormModal — tên, danh mục ▾, giá, mô tả, ảnh (upload),
           topping checkboxes, công tắc còn hàng   [Lưu] [Huỷ]
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| A Header | `products/_components/ProductPageHeader` | product count |
| B Table | `products/_components/ProductsTable` | `listProducts` (`['admin','products']`) + categories + toppings for labels |
| Form modal | `products/_components/` form modal | `createProduct` / `updateProduct` (multipart for image) |

## Key Interactions

- **+ Thêm sản phẩm** → form modal (add) · **✎** → edit · **🗑** → confirm + delete.
- Availability toggle (còn hàng / hết hàng) → product hidden-or-dimmed on `/menu` and POS.
- Successful writes invalidate `['admin','products']` (and `['admin']` broadly after image upload)
  so menu queries refresh.

## Business Logic Used

- `is_available` drives customer menu (`is_available=true` filter) and POS "Hết" state →
  [../02_spec/BUSINESS_RULES.md §2 Order Rules](../02_spec/BUSINESS_RULES.md#2-order-rules)
- Price changes never rewrite existing orders (price snapshot at order time) →
  [../02_spec/BUSINESS_RULES.md §2 Order Rules](../02_spec/BUSINESS_RULES.md#2-order-rules)
- Admin CRUD pattern → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (admin CRUD pattern)
