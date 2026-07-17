# Customer Order List — `/order`

> **TL;DR:** ✅ implemented · guest (local-only read) · "Đơn hàng của bạn" history list built from
> the localStorage order cache (every submitted order is cached under an `ORDER_CACHE` key).
> Tapping a card opens `OrderDetailSheet`; active orders show a served-progress bar.

---

## ASCII Wireframe

```
┌────────────────────────────────────────────────┐
│ 📋 Đơn hàng của bạn            🗑 Xoá lịch sử  │ ← header
├────────────────────────────────────────────────┤
│ ┃ Bàn 03  #BC-0042  [preparing]   105.000đ  ▸ │ ← order card (border-l primary)
│ ┃ ▓▓▓▓▓▓▓▓░░░░░░░░  (progress, active only)   │
│ ┃ 3/6 phần đã ra              12 phút trước   │
│ ┃ Bánh cuốn thịt · Canh mọc · Trà đá          │
├────────────────────────────────────────────────┤
│ ┃ Mang về  #BC-0038  [delivered]   42.000đ  ▸ │
│ ┃ 4/4 phần đã ra               2 giờ trước    │
├────────────────────────────────────────────────┤
│            (empty state)                       │
│         🛍  Chưa có đơn hàng nào               │
│   Quét mã QR tại bàn để bắt đầu đặt món        │
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ← ClientBottomNav (shell)
└────────────────────────────────────────────────┘
  Overlay: OrderDetailSheet (slide-up detail for the tapped order)
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| Header + clear | inline JSX in `order/page.tsx` | — |
| Order cards | inline JSX + `components/shared/StatusBadge` | localStorage keys prefixed `STORAGE_KEYS.ORDER_CACHE`, sorted by `created_at` desc |
| Progress bar | inline bar | `qty_served / quantity` over display items (combo headers filtered out) |
| Detail overlay | `features/order/components/OrderDetailSheet` | `GET /orders/:id` |
| Empty state | inline JSX | — |

## Key Interactions

- Tap a card → opens `OrderDetailSheet` for that order id.
- **Xoá lịch sử** → removes all `ORDER_CACHE` localStorage entries and empties the list.
- Progress bar shown only while `status ∉ {delivered, cancelled}`.

## Business Logic Used

- Order cache write/read + display-item filtering (combo header rows excluded) →
  [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (order cache, combo display rules)
- Status set + meanings → [../02_spec/BUSINESS_RULES.md §2.1 State Machine](../02_spec/BUSINESS_RULES.md#21-state-machine-happy-path)
- Derived item status (`qty_served`) → [../02_spec/BUSINESS_RULES.md §2.4](../02_spec/BUSINESS_RULES.md#24-item-status-derived--no-column)
