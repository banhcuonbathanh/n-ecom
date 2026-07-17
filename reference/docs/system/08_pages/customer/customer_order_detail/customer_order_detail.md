# Customer Order Detail — `/order/:id`

> **TL;DR:** ✅ implemented · guest JWT · The richest customer page: live order view over SSE
> (`useOrderSSE`) with per-dish progress, collapsible combo groups, a per-product summary table
> with cancel buttons, money summary (eaten vs remaining), cancel-whole-order, and "add more
> dishes" (returns to `/menu?add_to_order=:id`).
>
> **Backend view** (every endpoint traced) → [customer_order_detail_be.md](customer_order_detail_be.md) ·
> Cross-page/device data flow → [customer_order_detail_crosspage_dataflow.md](customer_order_detail_crosspage_dataflow.md) ·
> Loading behaviour → [customer_order_detail_loading.md](customer_order_detail_loading.md) ·
> Narrative → [SCENARIO_ORDER_DETAIL.md](SCENARIO_ORDER_DETAIL.md) ·
> **Live code bugs → [ORDER_DETAIL_BUGS.md](ORDER_DETAIL_BUGS.md)**

---

## ASCII Wireframe

```
┌────────────────────────────────────────────────┐
│ [←] Theo Dõi Đơn Hàng            [StatusBadge] │ ← sticky nav
│ ⚠ ConnectionErrorBanner (if SSE down)          │
├────────────────────────────────────────────────┤
│ ┃ Bàn 03  #BC-0042  [preparing]    12 phút     │ ← order card
│ ┃ ▓▓▓▓▓▓▓▓░░░░░░░░ (progress bar)              │
│ ┃ ▼ Combo Đầy Đặn (collapsible group)          │
│ ┃   ● Bánh cuốn thịt · thịt   ra 1/1  ✓        │ ← DishRow (per item)
│ ┃   ● Canh mọc · có rau       còn 1  [Huỷ]     │
│ ┃ ● Trà đá [−1+]              còn 2  [Huỷ]     │ ← QuantityStepper while pending
│ ┃ 3/6 phần đã ra · 2 có rau · 1 không rau      │
├────────────────────────────────────────────────┤
│ ▼ Tổng hợp món (toggle)                        │ ← summary table
│   Món          SL  Đã ra  Còn  Đơn giá  Tổng   │
│   Bánh cuốn…    2    1     1   35.000  70.000  │
│   + chả lụa · ghi chú…           [Huỷ phần còn]│
│   ───────────────────────────────────────────  │
│   Còn lại: 45.000đ        Tổng: 105.000đ       │
├────────────────────────────────────────────────┤
│ Đã ăn:       60.000đ                           │ ← money summary card
│ Chưa ra:     45.000đ                           │
│ Tổng cộng:  105.000đ                           │
├────────────────────────────────────────────────┤
│ ✓ banner "Đơn đã hoàn tất" (delivered only)    │
│ [ Huỷ đơn hàng ]   (only while cancellable)    │
│ [ + Gọi thêm món ]                             │
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ← ClientBottomNav (shell)
└────────────────────────────────────────────────┘
  Overlays: order-notification modal (staff updated order) · cancel-confirm modal
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| Nav + status | inline header + `components/shared/StatusBadge` | `useOrderSSE(id)` (order + progress + notification) |
| SSE banner | `components/shared/ConnectionErrorBanner` | `connectionError` from hook |
| Order card + dish rows | local `DishRow` component in `order/[id]/page.tsx` | SSE order items; combo groups via `combo_ref_id` |
| Qty stepper | `components/shared/QuantityStepper` | `PATCH /orders/items/:id/quantity` (`patchOrderItemQty`) |
| Summary table | inline JSX (grouped by `product_id`) | derived `summaryRows` memo |
| Money summary | inline JSX | derived eaten/remaining amounts |
| Cancel modal | inline confirm modal | `DELETE /orders/:id` · `DELETE /orders/items/:id` |
| Add more | inline button | → `/menu?add_to_order=:id` |

## Key Interactions

- SSE pushes item progress/status — rows tick to ✓ as the kitchen serves (`qty_served`).
- **[Huỷ]** per dish / per product group → confirm modal → `DELETE /orders/items/:id`
  (multi-delete for "remaining combo items").
- **Huỷ đơn hàng** → confirm modal → `DELETE /orders/:id` → toast → `/menu`.
  Shown only when `progress < 30%` and status ∈ {confirmed, preparing} — ⚠ DRIFT: target rule
  (owner 2026-06-12) is "cancel any time before payment"; code still enforces < 30 %.
- Quantity stepper on not-yet-served items → `PATCH /orders/items/:id/quantity`. ⚠ The new qty does
  **not** reflect live — the `onSuccess` `invalidateQueries(['order',id])` is a no-op (order lives in
  `useOrderSSE` `useState`, no such query) and the BE's `item_updated` SSE event is unhandled → reload
  needed. See [ORDER_DETAIL_BUGS.md](ORDER_DETAIL_BUGS.md) Bug 1.
- **+ Gọi thêm món** → `/menu?add_to_order=:id` (cart posts onto this order).
- Staff-side changes raise a notification modal (`notification` from the SSE hook).

## Business Logic Used

- Cancel rules (< 30 % vs target) → [../02_spec/BUSINESS_RULES.md §3 Cancel Rules](../02_spec/BUSINESS_RULES.md#3-cancel-rules)
- Item status derived from `qty_served` → [../02_spec/BUSINESS_RULES.md §2.4](../02_spec/BUSINESS_RULES.md#24-item-status-derived--no-column)
- Combo header filtering + grouping → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (combo display, SSE hook)
- SSE auth (Bearer header) + reconnect → [../02_spec/BUSINESS_RULES.md §6 Realtime Config](../02_spec/BUSINESS_RULES.md#6-realtime-config)
