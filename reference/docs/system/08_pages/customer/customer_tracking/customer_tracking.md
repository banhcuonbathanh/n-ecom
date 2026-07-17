# Customer Tracking — `/tracking`

> **TL;DR:** ✅ implemented · guest JWT · Live "monitoring" view for the customer's active order
> (`useCartStore.activeOrderId`): table banner with queue position + ETA, order detail card, and a
> whole-floor prep queue so the customer sees where they stand. Realtime via `useOrderMonitorSSE`.

---

## ASCII Wireframe

```
┌────────────────────────────────────────────────┐
│ MonitoringTopBar          ● live / ○ mất kết nối│ ← sticky top bar
│ ⚠ ConnectionErrorBanner (if SSE down)          │
├────────────────────────────────────────────────┤
│ 👁 Ẩn bàn của bạn (toggle)                     │
│ ┌────────────────────────────────────────────┐ │
│ │ Bàn 03 · [preparing]                       │ │ ← TableInfoBanner
│ │ Vị trí hàng đợi: 2/5 · ước tính ~8 phút    │ │
│ └────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────┐ │
│ │ OrderDetailCard                            │ │ ← items + progress of own order
│ │ • Bánh cuốn thịt   ra 1/2                  │ │
│ │ • Canh mọc         còn 1                   │ │
│ └────────────────────────────────────────────┘ │
├────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐ │
│ │ WholeFloorPrepList — hàng đợi toàn quán    │ │
│ │ 1. Bàn 01  ▓▓▓▓░░                          │ │
│ │ 2. Bàn 03  ▓▓░░░░   ← bạn                  │ │
│ │ 3. Mang về ░░░░░░                          │ │
│ └────────────────────────────────────────────┘ │
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ← ClientBottomNav (shell)
└────────────────────────────────────────────────┘
  Full-screen fallbacks: no active order · order 404 · session expired (401)
  — each with icon + message + [Về trang menu]
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| Top bar | `tracking/components/MonitoringTopBar` | `sseConnected` from `useOrderMonitorSSE` |
| SSE banner | `components/shared/ConnectionErrorBanner` | same hook |
| Table banner | `tracking/components/TableInfoBanner` | order status + `queueData` (position/total/ETA) |
| Own order | `tracking/components/OrderDetailCard` | `GET /orders/:id` (TanStack Query, refetched on `itemsChangedAt`) |
| Floor queue | `tracking/components/WholeFloorPrepList` | `queueData.queue` from SSE |

## Key Interactions

- **Ẩn/Hiện bàn của bạn** toggle → collapses the personal section (privacy on shared screens).
- SSE events update status/queue live; items added from POS/staff trigger an order refetch.
- No `activeOrderId` in the cart store → fallback screen with **Về trang menu**.
- 401 (guest JWT expired) → "Phiên làm việc hết hạn — quét lại mã QR".

## Business Logic Used

- Active-order pointer in cart store → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (cart store, SSE monitor hook)
- Queue/ETA semantics + SSE config → [../02_spec/BUSINESS_RULES.md §6 Realtime Config](../02_spec/BUSINESS_RULES.md#6-realtime-config)
- Guest JWT lifetime (2 h) drives the 401 path → [../02_spec/BUSINESS_RULES.md §5 JWT / Auth Rules](../02_spec/BUSINESS_RULES.md#5-jwt--auth-rules)
