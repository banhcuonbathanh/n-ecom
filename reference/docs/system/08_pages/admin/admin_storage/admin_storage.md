# Admin Storage — `/admin/storage`

> **TL;DR:** 🔮 PLANNED (owner decision 2026-06-12) · manager+ · Full inventory management page:
> stock list with quantity in/out, **low-stock warnings**, a link from ingredient availability
> to product availability on the menu (hết hàng), and a **run-out forecast** (Tổng nhập /
> Dùng/ngày / Dự kiến hết — 🔮 PLANNED STOR). Builds on the implemented
> [`/admin/ingredients`](../admin_ingredients/admin_ingredients.md) page (CRUD + stock movements already exist).
> Wireframe below is **proposed — owner to confirm**.

---

## ASCII Wireframe (proposed — owner to confirm)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ (admin shell: tab nav)                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ A  Kho hàng    🔍[Tìm...]   [+ Nhập hàng]  [+ Xuất hàng]                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ B  ⚠ CẢNH BÁO TỒN KHO THẤP                                                   │
│    ┌ Mộc nhĩ: còn 0.3 kg (< ngưỡng 1 kg)   [Nhập ngay] ┐                     │
│    └ Thịt heo: còn 1.2 kg (< ngưỡng 3 kg)  [Nhập ngay] ┘                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ C  ┌─Stock table (with forecast columns — 🔮 STOR)──────────────────────────┐│
│    │ Nguyên liệu  Tồn   Ngưỡng  Trạng thái   Tổng nhập  Dùng/ngày  Dự kiến hết │
│    │ Bột gạo     25.5    5      ● đủ          85.0 kg    2 kg      12/07/26  │
│    │ Mộc nhĩ      0.3    1      ⚠ sắp hết     12.0 kg    0.5 kg    Hôm nay! │
│    │ Tôm tươi     0.0    2      ✖ hết         8.0 kg     — [Đặt]   —        │
│    │                                          [Ẩn món]                       │
│    └──────────────────────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────────────────┤
│ D  Lịch sử nhập/xuất (movement log, newest first)                            │
│    12/06 09:10  Nhập  Bột gạo   +10 kg   "giao sáng"                         │
│    11/06 21:00  Xuất  Thịt heo  −4.5 kg  "cuối ngày"                         │
└──────────────────────────────────────────────────────────────────────────────┘
  Overlay A: link-availability confirm — "Ẩn 'BC tôm' khỏi menu vì hết Tôm tươi?" [Huỷ][Ẩn món]
  Overlay B (🔮 STOR): daily-usage edit inline — row "Dùng/ngày" cell → number input → [✓]
```

## Zones (proposed)

| Zone | Component (proposed) | Data source |
|---|---|---|
| A Header | reuse `StoragePageHeader` pattern | — |
| B Low-stock warnings | new `LowStockBanner` (extends summary-page low-stock query) | `GET` low-stock (`['admin','low-stock']`) |
| C Stock table | extended `IngredientTable` + threshold + affected-products + forecast columns | ingredients + product↔ingredient mapping; forecast fields from `avgDailyUsage` / `totalImported` / `runoutDate` (🔮 STOR) |
| D Movement log | new `StockMovementLog` | `GET /admin/ingredients/:id/movements` (newest-first, limit 50) |
| Availability link | confirm modal → product update | `PATCH` product `is_available` |
| Daily-usage edit | inline cell edit (🔮 STOR) | `PATCH /admin/ingredients/:id` with `avgDailyUsage` |

## Key Interactions (proposed)

- **+ Nhập hàng / + Xuất hàng** → stock movement modal (reuse `StockMoveModal`).
- **Nhập ngay** on a warning → pre-filled "in" movement for that ingredient.
- **Ẩn món** on an out-of-stock row → confirm → sets the affected product(s) `is_available=false`
  so they show "Hết" on `/menu` and POS; restocking offers to re-enable.
- Thresholds editable per ingredient (edit modal field).
- **🔮 STOR — Dùng/ngày inline edit:** clicking the "Dùng/ngày" cell opens a number input;
  on confirm it PATCHes `avgDailyUsage` on the ingredient; the `Dự kiến hết` cell recomputes
  immediately in the response (`runoutDate = today + floor(currentStock / avgDailyUsage)`).
  If `avgDailyUsage = 0` → show "—" with a "[Đặt]" prompt in both columns.
- **🔮 STOR — Dự kiến hết badge:** run-out date string + a colour badge for days remaining
  (green ≥ 14 d · yellow 7–13 d · red < 7 d · "Hôm nay!" for 0 d · "—" when no estimate).

## Business Logic Used

- Product availability drives menu + POS display ("Hết") →
  [../../07_business_logic/LOGIC_INDEX.md](../../../07_business_logic/LOGIC_INDEX.md)
  and [../../02_spec/BUSINESS_RULES.md §2 Order Rules](../../../02_spec/BUSINESS_RULES.md#2-order-rules)
- Existing low-stock query + ingredient CRUD to reuse →
  [../../07_business_logic/LOGIC_FE.md](../../../07_business_logic/LOGIC_FE.md) (admin CRUD pattern, low-stock)
- Manager+ gate via admin shell →
  [../../02_spec/BUSINESS_RULES.md §1 RBAC](../../../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy)
- **🔮 STOR — Run-out forecast formula:**
  `daysRemaining = floor(currentStock / avgDailyUsage)` (null when `avgDailyUsage = 0`);
  `runoutDate = today + daysRemaining` (ISO date string, null when no estimate);
  `totalImported = Σ stock_movements.quantity WHERE type = 'in'` (includes the initial 'in'
  movement created at ingredient create time). Full field spec →
  [../../02_spec/object/OBJECT_MODEL_INGREDIENT.md §4](../../../02_spec/object/OBJECT_MODEL_INGREDIENT.md)
  and migration 018 (`ingredients.avg_daily_usage DECIMAL(10,3) DEFAULT 0`).
  Tracker → [../../07_business_logic/LOGIC_INDEX.md](../../../07_business_logic/LOGIC_INDEX.md) (STOR epic).
