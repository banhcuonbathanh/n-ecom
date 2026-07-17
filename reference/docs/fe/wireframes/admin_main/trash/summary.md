---
page: summary
route: /admin/summary
spec_ref: Spec_10 §1
created: 2026-05-05
---

# Wireframe — Admin Summary (Tổng kết nhà hàng)

## Data Sources

| Zone | Source | Update mechanism |
|---|---|---|
| ZoneA — KPICards | `GET /api/v1/admin/summary?range=today\|week\|month` | TanStack Query stale 60s, refetch on range change |
| ZoneB — TopDishes | `GET /api/v1/admin/top-dishes?limit=5&range=...` | TanStack Query stale 60s |
| ZoneC — StaffPerformance | `GET /api/v1/admin/staff-performance?range=...` | TanStack Query stale 60s |
| ZoneD — StockAlerts | `GET /api/v1/admin/ingredients/low-stock` | TanStack Query stale 120s |
| ZoneE — Modal | POST `/api/v1/admin/stock-movements` on confirm | invalidates ZoneD query on success |

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Nav: 🍜 Quản Lý Quán Bánh Cuốn  [Tổng kết ●]  Tổng quan · Sản phẩm   │
├──────────────────────────────────────────────────────────────────────────┤
│  Tổng kết nhà hàng         📅 [Hôm nay ●]  [Tuần này]  [Tháng này]     │
├──────────────┬──────────────┬──────────────┬──────────────────────────────┤
│ [ZoneA-1]    │ [ZoneA-2]    │ [ZoneA-3]    │ [ZoneA-4]                    │
│ Khách hôm nay│ Món đã bán   │ Doanh thu    │ Bàn đang phục vụ             │
│     42       │    187       │ 3,240,000 ₫  │    4 / 10                    │
│ unique orders│ sum(qty)     │ sum(payments)│ active orders count          │
├──────────────┴──────────────┴──────────────┴──────────────────────────────┤
│ [ZoneB — Top Dishes, x=10 w=790]  │ [ZoneC — Staff Performance, x=820 w=790] │
│ Món bán chạy                       │ Hiệu suất nhân viên                  │
│ #1 Bánh Cuốn Thịt ×42  ████ 22%   │ Tên         Vai trò  Đơn  Doanh thu  │
│ #2 Bánh Cuốn Tôm  ×38  ███  18%   │ Nguyễn A    cashier    8   480,000₫  │
│ #3 Nem Rán        ×29  ██   14%   │ Trần B      staff      6   360,000₫  │
│ #4 Gỏi Cuốn      ×21  ██   10%   │ Lê C        chef      —       —      │
│ #5 Chả Giò        ×18  █     9%   │ Phạm D      cashier    4   240,000₫  │
│ [→ Xem tất cả]                    │                                       │
├────────────────────────────────────┴───────────────────────────────────────┤
│ [ZoneD — Stock Alerts, x=10 w=1600 h=240]                                  │
│ Cảnh báo nguyên liệu tồn kho thấp                                          │
│ 🔴 Bánh Cuốn (bột)  còn 2 kg   min 5 kg  [██░░░░░░░░] 40%  [Nhập hàng]  │
│ 🟡 Thịt Lợn         còn 8 kg   min 5 kg  [████████░░] 80%  [Nhập hàng]  │
│ ✅ Nước Mắm         còn 15 L   min 3 L   [██████████] 500% (đủ hàng)    │
│ [→ Xem toàn bộ kho /admin/ingredients]                                     │
├────────────────────────────────────────────────────────────────────────────┤
│ [ZoneE — Modal: Nhập Hàng (shown when [Nhập hàng] clicked)]               │
│ ┌──────────────────────────────────────────────────────────┐               │
│ │  Nhập hàng — Bánh Cuốn (bột)                    [✕]    │               │
│ │  ────────────────────────────────────────────────────    │               │
│ │  Nguyên liệu:  Bánh Cuốn (bột)    [readonly]           │               │
│ │  Số lượng:     [________] kg                            │               │
│ │  Ghi chú:      [_________________________________]       │               │
│ │                                                         │               │
│ │              [✓ Xác nhận]       [Huỷ]                  │               │
│ └──────────────────────────────────────────────────────────┘               │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone Detail

### ZoneA — KPI StatCards

4 cards in a row. Data from single `GET /api/v1/admin/summary` response.

| Card | Metric | Derivation |
|---|---|---|
| Khách hôm nay | count of unique customers | `COUNT(DISTINCT customer_name)` from orders today |
| Món đã bán | total item quantity | `SUM(order_items.quantity)` for delivered orders today |
| Doanh thu | total revenue | `SUM(payments.amount)` where `status='completed'` today |
| Bàn đang phục vụ | active / total | orders WHERE status IN (`confirmed`,`preparing`,`ready`) |

Range selector (`Hôm nay / Tuần này / Tháng này`) is a toggle button group — changes `range` query param on all ZoneA/B/C queries simultaneously via shared Zustand `summaryRange` atom.

---

### ZoneB — Top Dishes

- Fetches top 5 by `quantity_sold` for the selected range.
- Each row: rank · product name · qty badge · horizontal bar (% of total) · revenue.
- Bar width = `(qty / total_qty) * 100%`, max bar = 100%.
- "Xem tất cả" link → `/admin/summary/dishes` (future page, just render as disabled link for now).

---

### ZoneC — Staff Performance

- Table: full_name · role · orders_handled · revenue.
- `chef` role has no payment association — show `—` for revenue.
- Sorted by `orders_handled DESC`.
- No pagination in this view (top 10 max, truncate with "...").

---

### ZoneD — Stock Alerts

- Only shows ingredients where `current_stock <= min_stock * 1.2` (within 20% of min).
- ✅ row is shown as "OK example" for visual context — in real data, only low/critical rows appear.
- Color coding:
  - 🔴 `current_stock < min_stock` — critical, red background
  - 🟡 `min_stock <= current_stock <= min_stock * 1.2` — warning, yellow background
- Each critical/warning row has `[Nhập hàng]` button → opens ZoneE modal.
- "Xem toàn bộ kho" links to `/admin/ingredients`.

---

### ZoneE — Nhập Hàng Modal

- Opened by `[Nhập hàng]` button on any stock row.
- Ingredient name is pre-filled + readonly.
- Quantity field: number input + unit label (kg / L / etc.) from ingredient record.
- On confirm: `POST /api/v1/admin/stock-movements` with `{ingredient_id, type:'in', quantity, note}`.
- On success: close modal + invalidate `['ingredients','low-stock']` TanStack Query key.
- On error: show inline error message inside modal.

---

## Components

| Zone | Component | spec_ref | Notes |
|---|---|---|---|
| ZoneA | `SummaryKPICards` | Spec_10 §1.2 | 4-card row, range-aware |
| ZoneA control | `RangeSelector` | Spec_10 §1.1 | toggle: today/week/month, Zustand atom |
| ZoneB | `TopDishesList` | Spec_10 §1.3 | ranked list + % bar |
| ZoneC | `StaffPerfTable` | Spec_10 §1.4 | sortable table |
| ZoneD | `StockAlertList` | Spec_10 §1.5 | color-coded rows + Nhập hàng button |
| ZoneE | `StockInModal` | Spec_10 §1.6 | controlled modal, RHF+Zod |
| page | `summary/page.tsx` | Spec_10 §1 | assembles all zones |

---

## Task Rows (copy into TASKS.md)

| ID | Domain | Task | Status | spec_ref | draw_ref |
|---|---|---|---|---|---|
| 10-1 | BE | Migration `009_ingredients.sql` — `ingredients` + `product_ingredients` + `stock_movements` tables | ⬜ | Spec_10 §2.1 | — |
| 10-2 | BE | sqlc queries for ingredients + stock_movements → `sqlc generate` | ⬜ | Spec_10 §2.1 | — |
| 10-3 | BE | `analytics_service.go` + `analytics_handler.go` — `GET /admin/summary`, `GET /admin/top-dishes`, `GET /admin/staff-performance` | ⬜ | Spec_10 §2.2 | — |
| 10-4 | BE | `ingredient_handler.go` — CRUD + `GET /admin/ingredients/low-stock` + `POST /admin/stock-movements` | ⬜ | Spec_10 §2.3 | — |
| 10-5 | BE | Wire new routes in `router.go` — all under `/api/v1/admin/` with Manager+ auth middleware | ⬜ | Spec_10 §2.4 | — |
| 10-6 | FE | `admin.api.ts` — add `getSummary`, `getTopDishes`, `getStaffPerformance`, `getLowStock`, `postStockMovement` | ⬜ | Spec_10 §1.1 | `wireframes/summary.md ZoneA` |
| 10-7 | FE | `RangeSelector` + Zustand `summaryRange` atom | ⬜ | Spec_10 §1.1 | `wireframes/summary.md ZoneA` |
| 10-8 | FE | `SummaryKPICards` — 4 stat cards, range-aware, skeleton loading | ⬜ | Spec_10 §1.2 | `wireframes/summary.md ZoneA` |
| 10-9 | FE | `TopDishesList` — ranked list + horizontal % bar | ⬜ | Spec_10 §1.3 | `wireframes/summary.md ZoneB` |
| 10-10 | FE | `StaffPerfTable` — sortable table, chef rows show `—` | ⬜ | Spec_10 §1.4 | `wireframes/summary.md ZoneC` |
| 10-11 | FE | `StockAlertList` — color-coded rows (red/yellow), Nhập hàng button | ⬜ | Spec_10 §1.5 | `wireframes/summary.md ZoneD` |
| 10-12 | FE | `StockInModal` — RHF+Zod modal, POST stock movement, invalidate query | ⬜ | Spec_10 §1.6 | `wireframes/summary.md ZoneE` |
| 10-13 | FE | `summary/page.tsx` — assemble all zones, add "Tổng kết" tab to admin layout | ⬜ | Spec_10 §1 | `wireframes/summary.md` |
| 10-14 | FE | `/admin/ingredients/page.tsx` — full ingredient list + stock level bar + inline edit stock | ⬜ | Spec_10 §1.7 | `wireframes/summary.md ZoneD` |
