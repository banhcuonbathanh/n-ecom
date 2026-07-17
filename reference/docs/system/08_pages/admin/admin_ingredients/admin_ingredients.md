# Admin Ingredients — `/admin/ingredients`

> **TL;DR:** ✅ implemented · manager+ · "Kho nguyên liệu" — ingredient CRUD plus a stock-movement
> modal (Nhập/Xuất/Điều chỉnh). This page is the implemented core that the 🔮 PLANNED
> `/admin/storage` page (see [admin_storage.md](../admin_storage/admin_storage.md)) will extend with low-stock
> warnings and menu-availability linking.

---

## ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ (admin shell: tab nav)                                           │
├──────────────────────────────────────────────────────────────────┤
│ Kho nguyên liệu   🔍[Tìm nguyên liệu...]    [+ Thêm nguyên liệu] │ ← StoragePageHeader
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────┐ │ ← IngredientTable
│ │ Nguyên liệu    Đơn vị   Tồn kho    Hành động                 │ │
│ │ Bột gạo        kg       25.5       [Nhập/Xuất] [✎] [🗑]      │ │
│ │ Thịt heo xay   kg        8.0       [Nhập/Xuất] [✎] [🗑]      │ │
│ │ Mộc nhĩ        kg        2.3       [Nhập/Xuất] [✎] [🗑]      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│  (loading: 5 pulsing rows · search miss: "Không tìm thấy…")      │
└──────────────────────────────────────────────────────────────────┘
  Overlays:
  ┌─IngredientFormModal────────┐   ┌─StockMoveModal─────────────────┐
  │ Tên, đơn vị, …  [Lưu][Huỷ] │   │ Điều chỉnh kho — Bột gạo       │
  └────────────────────────────┘   │ Loại: [Nhập (+) ▾]             │
                                   │ Số lượng (kg): [____]          │
                                   │ Ghi chú: [________]            │
                                   │        [Huỷ] [✓ Xác nhận]      │
                                   └────────────────────────────────┘
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| Header + search | `ingredients/_components/StoragePageHeader` | local search state (client-side filter) |
| Table | `ingredients/_components/IngredientTable` | `GET` via `listIngredients` (`['admin','ingredients']`, 60 s stale) |
| Form modal | `ingredients/_components/IngredientFormModal` (dynamic import) | `createIngredient` / `updateIngredient` |
| Stock modal | local `StockMoveModal` in page file (RHF + Zod) | `postStockMovement { ingredient_id, type: in/out/adjustment, quantity, note }` |

## Key Interactions

- **+ Thêm nguyên liệu** → form modal (add); 409 → "Nguyên liệu này đã tồn tại".
- Row **✎** → form modal (edit) · Row **🗑** → delete; 422 → "đang được sử dụng" (in a recipe).
- **Nhập/Xuất** → StockMoveModal → posts a movement, invalidates the list (stock recalculated
  server-side from movements).
- Search filters by name client-side.

## Business Logic Used

- Stock = sum of movements (in/out/adjustment), never edited directly →
  [../02_spec/BUSINESS_RULES.md](../02_spec/BUSINESS_RULES.md) (inventory rules, see §2 Order Rules for consumption linkage)
- Low-stock thresholds surface today on `/admin/summary` (Cảnh báo tồn kho) →
  [admin_summary.md](../admin_summary/admin_summary.md)
- Admin CRUD pattern (query keys, invalidation, toasts) → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (admin CRUD pattern)
