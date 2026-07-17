---
page: client_tracking
route: /(shop)/tracking
created: 2026-05-27
status: Draft
---

# Page: Client — Theo Dõi Đơn Hàng (Order Monitor)
**Route:** `/(shop)/tracking`
**Version:** v1
**Status:** Draft

## Spec Summary

- Mobile-only SSE-powered page — customer reads live order progress without polling
- Zone B surfaces the single most important stat: queue position + ETA for the customer's table
- Zone C is a full receipt view so the customer can verify order accuracy before food arrives
- Zone D shows the live service queue (5 orders visible) so the customer understands their wait context
- Zone E gives ambient restaurant awareness via a 3×4 color-coded table grid
- Zone F (bottom nav) provides access to Menu and Favourites from any client page

---

## 📐 Visual Wireframe

```
┌──────────────────────────────────────────────────┐  ← sticky top-0 z-20
│  [A] Theo Dõi Đơn Hàng — Bánh Cuốn  [● LIVE]   │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  [B] Bàn của bạn                                 │
│  ┌──────────┐  Trạng thái: Đang chuẩn bị món ăn  │
│  │ Bàn T.04 │                            ~5 phút │
│  └──────────┘                                    │
│  Vị trí hàng chờ: #3 trong 5 đơn | Chờ ~5 phút  │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  [C] Chi tiết đơn hàng: #ORD-042                 │
│  #ORD-042 · Bàn T.04 · Đặt lúc 14:31:05         │
│  x1  Combo Bánh Cuốn Thịt              65,000đ   │
│    + Chả lụa x2 · Hành phi x1 · Nước mắm thêm   │
│  ─────────────────────────────────────────────── │
│  x2  Bánh Cuốn Chay                    45,000đ   │
│  ─────────────────────────────────────────────── │
│  x2  Nước mía                          20,000đ   │
│  ═════════════════════════════════════════════   │
│  Tổng cộng · 5 sản phẩm               130,000đ   │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  [D] Hàng chờ phục vụ  ( Vị trí #3 / 5 )        │
│  ┌──────────────────────────────────────────────┐ │
│  │ [Đã phục vụ]    #ORD-040 · Bàn T.02 · 5 món │ │
│  ├──────────────────────────────────────────────┤ │
│  │ [Đang phục vụ]  #ORD-041 · Bàn T.07 · 4 món │ │
│  ├──────────────────────────────────────────────┤ │
│  │ [Đang chuẩn bị] #ORD-042 · T.04 · 5 sp      │ │
│  │                        [< Đơn của bàn]       │ │  ← highlighted row
│  ├──────────────────────────────────────────────┤ │
│  │ [Đang chờ]      #ORD-043 · Bàn T.09 · ~10'  │ │
│  ├──────────────────────────────────────────────┤ │
│  │ [Đang chờ]      #ORD-044 · Bàn T.08 · ~15'  │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  [E] Sơ đồ bàn hiện tại                          │
│  🟠=phục vụ · 🔴=chờ món · 🟢=trống              │
│  ┌────────────┬────────────┬────────────┐        │
│  │ T.01 🟠    │ T.02 🟠    │ T.03 🟢    │        │
│  │ Phục vụ·3  │ Phục vụ·5  │ Trống      │        │
│  ├────────────┼────────────┼────────────┤        │
│  │ T.04 🔴 ★  │ T.05 🟠    │ T.06 🟢    │        │
│  │ [BÀN BẠN]  │ Phục vụ·2  │ Trống      │        │
│  │ Chờ món    │            │            │        │
│  ├────────────┼────────────┼────────────┤        │
│  │ T.07 🟠    │ T.08 🔴    │ T.09 🔴    │        │
│  │ Phục vụ·4  │ Chờ món    │ Chờ món    │        │
│  ├────────────┼────────────┼────────────┤        │
│  │ T.10 🟠    │ T.11 🔴    │ T.12 🟠    │        │
│  │ Phục vụ·6  │ Chờ món    │ Phục vụ·1  │        │
│  └────────────┴────────────┴────────────┘        │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐  ← sticky bottom-0 z-20
│  [F]  [   Menu   ]  [Yêu Thích]  [  Làm Mới  ]  │
└──────────────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| A | `MonitoringTopBar` | Always | sticky top-0 z-20 |
| A | `ConnectionErrorBanner` | When `sseConnected === false` | fixed top-0 z-30 (above Zone A) |
| B | `TableInfoBanner` | After initial data load | static |
| C | `OrderDetailCard` | After initial data load | static, scrollable |
| D | `ServiceQueueList` | After initial data load | static, scrollable |
| E | `TableLayoutMap` | After initial data load | static, scrollable |
| F | `ClientBottomNav` | Always | sticky bottom-0 z-20 |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| A | — | — | — | LIVE badge reflects `sseConnected` state |
| B | SSE event `queue.update` | Push (SSE) | SSE — no TQ key | `useSettingsStore.guestToken` identifies session |
| C | `GET /api/v1/orders/:id` → SSE delta | Initial fetch + SSE delta | `['order', orderId]` | staleTime 0 — SSE keeps data fresh |
| D | SSE event `queue.update` | Push (SSE) | SSE — no TQ key | Full 5-row queue pushed each update |
| E | SSE event `tables.status` | Push (SSE) | SSE — no TQ key | Full table grid pushed each status change |
| F | — | — | — | "Làm Mới" re-connects SSE on click |

---

## 🧩 Component Specifications

> Before filling this table: read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md`.
> Mark each row with one of: `✅ reuse` · `new (local)` · `new (shared)`

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|-----------------|
| A | `MonitoringTopBar` | new (local) | `app/(shop)/tracking/components/MonitoringTopBar.tsx` | `sseConnected: boolean` |
| A | `ConnectionErrorBanner` | ✅ reuse | `shared/ConnectionErrorBanner.tsx` | shown when `sseConnected === false` |
| B | `TableInfoBanner` | new (local) | `app/(shop)/tracking/components/TableInfoBanner.tsx` | `tableLabel · status · queuePosition · queueTotal · estimatedMinutes` |
| B | `StatusBadge` | ✅ reuse | `shared/StatusBadge.tsx` | `status: OrderStatus` (preparing / serving) |
| C | `OrderDetailCard` | new (local) | `app/(shop)/tracking/components/OrderDetailCard.tsx` | `order: OrderDetail` |
| D | `ServiceQueueList` | new (local) | `app/(shop)/tracking/components/ServiceQueueList.tsx` | `queue: QueueItem[] · currentOrderId: string` |
| D | `ServiceQueueItem` | new (local) | `app/(shop)/tracking/components/ServiceQueueItem.tsx` | `item: QueueItem · isCurrentOrder: boolean` |
| D | `StatusBadge` | ✅ reuse | `shared/StatusBadge.tsx` | reused inside `ServiceQueueItem` |
| E | `TableLayoutMap` | new **(shared)** | `shared/TableLayoutMap.tsx` | `tables: TableStatus[] · highlightTableId?: string` |
| F | `ClientBottomNav` | new **(shared)** | `shared/ClientBottomNav.tsx` | `activeTab: 'menu' \| 'favourites' \| 'refresh' · onRefresh?: () => void` |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
// Zone C — order detail (initial API fetch)
interface OrderDetail {
  id: string           // "ORD-042"
  tableLabel: string   // "T.04"
  placedAt: string     // "14:31:05"
  items: OrderItem[]
  total: number        // 130000
  itemCount: number    // 5
}

interface OrderItem {
  name: string         // "Combo Bánh Cuốn Thịt"
  qty: number
  price: number        // 65000
  toppings: string[]   // ["Chả lụa x2", "Hành phi x1", "Nước mắm thêm x1"]
}

// Zone D — queue item (SSE event payload)
interface QueueItem {
  orderId: string
  tableLabel: string
  status: OrderStatus    // pending | preparing | serving | delivered
  itemCount: number
  estimatedMinutes?: number  // only for "pending" rows
}

// Zone E — table status (SSE event payload)
interface TableStatus {
  id: string             // "T.01"
  status: 'serving' | 'waiting' | 'empty'
  orderCount?: number    // for serving tables
}

// SSE events
type SSEEvent =
  | { type: 'order.status'; orderId: string; status: OrderStatus }
  | { type: 'queue.update'; queue: QueueItem[]; position: number; total: number; estimatedMinutes: number }
  | { type: 'tables.status'; tables: TableStatus[] }
```

### Query Configuration

```typescript
// Zone C — initial order detail fetch
useQuery({
  queryKey: ['order', orderId],
  queryFn: () => fetchOrder(orderId, guestToken),
  staleTime: 0,              // SSE keeps data fresh — always re-fetch on mount
  refetchOnWindowFocus: false,
})

// SSE hook (custom — not TanStack Query)
function useOrderMonitorSSE(orderId: string, guestToken: string) {
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
  const [queueData, setQueueData] = useState<QueueState | null>(null)
  const [tableStatuses, setTableStatuses] = useState<TableStatus[]>([])
  const [sseConnected, setSseConnected] = useState(false)

  useEffect(() => {
    const es = new EventSource(
      `/api/v1/sse/order-monitor/${orderId}?token=${guestToken}`
    )
    es.onopen = () => setSseConnected(true)
    es.onmessage = (e) => {
      const event: SSEEvent = JSON.parse(e.data)
      if (event.type === 'order.status') setOrderStatus(event.status)
      if (event.type === 'queue.update') setQueueData(event)
      if (event.type === 'tables.status') setTableStatuses(event.tables)
    }
    es.onerror = () => setSseConnected(false)
    return () => es.close()
  }, [orderId, guestToken])

  return { orderStatus, queueData, tableStatuses, sseConnected }
}
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| SSE disconnects mid-session | `EventSource.onerror` | Set `sseConnected = false`; auto-reconnect with exponential backoff | `ConnectionErrorBanner` shown at top |
| Order already delivered | `status === 'delivered'` | Switch Zone B to delivered state | "Đơn của bạn đã được phục vụ — Cảm ơn!" (green) |
| Order not found / 404 | HTTP 404 from `GET /orders/:id` | Show full-page error | "Đơn hàng không tồn tại. Vui lòng quét lại mã QR." |
| Guest token expired / 401 | HTTP 401 | Redirect to QR scan entry | "Phiên làm việc hết hạn — quét lại mã QR." |
| Queue position 1 (next) | `queuePosition === 1` | Highlight Zone B with urgency | Pulse animation on ETA badge |
| Empty table map | `tables.length === 0` on SSE | Show skeleton grid | `EmptyState` with "Đang tải sơ đồ bàn..." |
| "Làm Mới" tapped | `onClick` on `ClientBottomNav` | Close + re-open EventSource | Brief "Đang kết nối lại..." status text in Zone A |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Zone A: LIVE badge green when SSE connected; grey + text "Mất kết nối" when disconnected
- [ ] Zone A: `ConnectionErrorBanner` appears within 1s of SSE error event
- [ ] Zone B: Table label, status, queue position, and ETA update on `queue.update` SSE event
- [ ] Zone C: Order items, toppings, and total render correctly from initial API fetch
- [ ] Zone D: Current order row (#ORD-042) has amber border + "< Đơn của bàn" button
- [ ] Zone D: All 5 queue rows render correct status badges and update on `queue.update`
- [ ] Zone E: Table T.04 highlighted with red border + [BÀN BẠN] label
- [ ] Zone E: All 12 table cells update color on `tables.status` SSE event
- [ ] Zone F: "Menu" → `/(shop)/menu`; "Yêu Thích" → `/(shop)/menu/favourites`
- [ ] Zone F: "Làm Mới" re-connects SSE

### Edge Case Tests
- [ ] SSE disconnect → banner shows; auto-reconnect after 3s / 6s / 12s backoff
- [ ] `status === 'delivered'` → Zone B switches to green delivered state
- [ ] `queuePosition === 1` → pulse animation on Zone B ETA badge
- [ ] HTTP 404 on order fetch → full-page error, not blank screen

### Accessibility Tests
- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Focus visible on all interactive elements
- [ ] SSE status changes announced via `aria-live="polite"` on Zone B status text

### Cross-Device Tests
- [ ] Mobile viewport (375px) — primary target
- [ ] Tablet viewport (768px)
- [ ] Desktop (1280px+)

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| MON-1 | FE | Wireframe + zone table | ✅ | wireframes/client_tracking/client_tracking_wireframe_v1.md |
| MON-2 | FE | MonitoringTopBar + TableInfoBanner + ConnectionErrorBanner wiring | ⬜ | Zone A, B |
| MON-3 | FE | OrderDetailCard — initial fetch via `['order', orderId]` | ⬜ | Zone C |
| MON-4 | FE | ServiceQueueList + ServiceQueueItem + useOrderMonitorSSE hook | ⬜ | Zone D |
| MON-5 | FE | TableLayoutMap shared component — register in shared index | ⬜ | Zone E |
| MON-6 | FE | ClientBottomNav shared component — register in shared index | ⬜ | Zone F |
| MON-7 | FE | Page assembly + skeleton + error boundary | ⬜ | page.tsx |

---

## 📝 Changelog

**v1 (2026-05-27)**
- Initial scaffold based on `restaurant-monitor.excalidraw`
- Zones: A (Header + LIVE) · B (Bàn của bạn) · C (Chi tiết đơn #ORD-042) · D (Hàng chờ 5 rows) · E (Sơ đồ bàn 3×4 grid) · F (Bottom Nav)
- 2 new shared components identified: `TableLayoutMap` · `ClientBottomNav`
- New TanStack Query key: `['order', orderId]` — staleTime 0, SSE-driven updates

---

*Last Updated: 2026-05-27*
*Approved by: —*
*Next Review: After SSE endpoint confirmed with BE*
