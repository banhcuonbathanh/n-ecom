---
page: client_order_page
route: /(shop)/order/[id]
created: 2026-05-27
status: Draft
---

# Page: Theo Dõi Đơn Hàng (Order Tracking)
**Route:** `/(shop)/order/[id]`
**Version:** v1
**Status:** Draft

## Spec Summary

- Khách hàng xem trạng thái đơn hàng realtime qua SSE — không cần refresh thủ công
- Zone 1 hiển thị từng món theo combo hoặc standalone, kèm số lượng còn chờ bếp (còn×N) và nút Huỷ từng món
- Zone 2 là bảng tổng hợp đầy đủ: số lượng đặt / đã ra / còn lại + đơn giá + tổng tiền
- Zone 3 tóm tắt tiền: đã dùng (món đã ra) vs còn lại (món chưa ra) vs tổng cộng
- Các zone điều kiện: C1 (mất SSE), Zone 4 (đơn hoàn thành), Zone 5 (huỷ toàn bộ), Zone 6 (thêm món)
- 2 modal: Modal A xác nhận nhà hàng nhận đơn (SSE push), Modal B xác nhận huỷ từng món

---

## 📐 Visual Wireframe

```
┌─────────────────────────────────────────┐  ← sticky top-0 z-20
│ ← Theo Dõi Đơn Hàng          ● LIVE   │  Nav
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐  ← if SSE disconnects
│ ⚠  Mất kết nối realtime –              │  Zone C1
│    Đang thử kết nối lại...             │  (red bg #fee2e2)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐  Zone 1 — Order Card
│ Bàn 5  order no: 0042 │Đang Làm│215kđ  │  (SSE realtime, collapsible ↕)
│ 11 phút                             ↕  │
│ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░  │  progress bar (orange)
│                                         │
│ COMBO A · Bánh Cuốn Tôm + Chả Giò ↕  │
├─────────────────────────────────────────┤
│  · Bánh Cuốn Tôm      tổng×2  ra×1   │
│    + Giò lụa 5kđ  + Hành phi   còn×1│Huỷ│
├─────────────────────────────────────────┤
│  · Chả Giò (combo)  tổng×1 ra×1 ✓xong│
│    + Tương hoisin                       │
├─────────────────────────────────────────┤
│  · Nước Cam           tổng×1  ra×0   │
│    Số lượng:  [−]  2  [+]    còn×1│Huỷ│
│    + Ít đường  + Nhiều đá               │
├─────────────────────────────────────────┤
│  · Bún Bò Huế (canh)  tổng×2  ra×1   │
│    + Bò viên 10kđ  + Chả cá 8kđ còn×2│Huỷ│
├─────────────────────────────────────────┤
│  3 / 7 phần đã ra                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐  Zone 2 — Dish Summary Table
│ TÊN MÓN          SL  RA CÒN  ĐƠN  TỔNG│
├─────────────────────────────────────────┤
│ Bánh Cuốn Tôm     2   1  ×1  45k  90k │
│  + Giò lụa 5kđ · + Hành phi           │
│ Chả Giò           1   0  ×1  30k  30k │
│  + Tương hoisin                        │
│ Bún Bò Huế        2   1  ×1  60k 120k │
│  + Bò viên 10kđ · + Chả cá 8kđ       │
│ Nước Cam          1   0  ×1  25k  25k │
│  + Ít đường · + Nhiều đá              │
├─────────────────────────────────────────┤
│ Tổng tiền còn lại              155,000đ│
│ Tổng tất cả món                265,000đ│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐  Zone 3 — Money Summary Card
│ Đã dùng  (3 phần)          110,000đ ✓ │
│ Còn lại  (4 phần chưa ra)  155,000đ   │
│─────────────────────────────────────────│
│ Tổng cộng                   265,000đ   │  (font-size 18)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐  Zone 4 — Completed Banner
│ ✓  Đơn hàng đã hoàn thành             │  (if status = delivered)
│    Cảm ơn! Bạn có thể đặt thêm.       │  (green border + bg #f0fdf4)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐  Zone 5 — Cancel Whole Order
│       Huỷ toàn bộ đơn hàng            │  (if progress < 30% AND active)
└─────────────────────────────────────────┘  (red outline button)

┌─────────────────────────────────────────┐  Zone 6 — Add More Dishes
│            ＋ Thêm món                  │  (if table_id exists)
└─────────────────────────────────────────┘  (orange filled button)
```

**Skeleton** (Pattern B — shown on initial load before SSE data arrives):
- Nav bar shape (grey rectangle)
- Order card shape with 3 item row stubs
- Table shape with 4 row stubs
- Money card shape with 3 line stubs
- Add More button shape

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| Nav | `OrderTrackingNav` | Always | `sticky top-0 z-20` |
| C1 | `ConnectionErrorBanner` | SSE disconnected (`sseStatus === 'error'`) | Below nav, static |
| 1 | `OrderCard` | Always (collapsible) | Static, scrollable |
| 1a | `ComboSection` (inside Zone 1) | When order has combos | Inside OrderCard |
| 1b | `OrderItemRow` (inside Zone 1) | Per item — standalone or inside combo | Inside OrderCard |
| 2 | `DishSummaryTable` | Always | Static |
| 3 | `MoneySummaryCard` | Always | Static |
| 4 | `CompletedBanner` | `order.status === 'delivered'` | Static |
| 5 | `CancelWholeOrderButton` (Zone 5) | `progress < 30% AND status === 'confirmed' \| 'preparing'` | Static |
| 6 | `AddMoreButton` (Zone 6) | `order.tableId !== null` | Static |
| Modal A | `OrderConfirmedModal` | SSE event `order_confirmed` received | Full-screen overlay |
| Modal B | `CancelConfirmModal` | Any `Huỷ` button tapped | Full-screen overlay |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| Nav | `useSettingsStore` (tableLabel) | Zustand | N/A | guestToken used for SSE auth |
| Nav LIVE badge | SSE connection status | `useOrderSSE` hook local state | N/A | green=connected · red=disconnected |
| C1 | SSE connection status | `useOrderSSE` hook | N/A | Shown on `sseStatus === 'error'` |
| 1 | `['order', orderId]` + SSE updates | Initial fetch → SSE patches | `['order', orderId]` | staleTime: 0; SSE events update query cache directly |
| 2 | Derived from Zone 1 data | Same as Zone 1 | Shared | No separate fetch |
| 3 | Computed from Zone 1 data | Same as Zone 1 | Shared | servedAmount = sum of delivered items; remainingAmount = total − served |
| 4 | `order.status` from Zone 1 data | SSE `order_delivered` event | Shared | Conditional render |
| 5 | `order.progress` + `order.status` | SSE updates | Shared | Conditional render |
| 6 | `order.tableId` from Zone 1 data | Static (set at order creation) | Shared | Conditional render |
| Modal A | SSE event `order_confirmed` | SSE push | N/A | Auto-opens on event; dismissed by user |
| Modal B | Local state `cancelTarget` | `useState` | N/A | Populated by Huỷ tap |

---

## 🧩 Component Specifications

> Read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md` before implementing.

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|------------------|
| Nav | `OrderTrackingNav` | new (local) | `app/(shop)/order/[id]/components/OrderTrackingNav.tsx` | `sseStatus: 'connected' \| 'error' \| 'connecting'` |
| C1 | `ConnectionErrorBanner` | ✅ reuse | `components/shared/ConnectionErrorBanner.tsx` | none |
| 1 | `OrderCard` | new (local) | `components/OrderCard.tsx` | `order: OrderCardData · isCollapsed: boolean · onToggle: () => void` |
| 1a | `ComboSection` | new (local) | `components/ComboSection.tsx` | `combo: ComboSectionData · onCancel: (itemId) => void · onQtyChange: (itemId, qty) => void` |
| 1b | `OrderItemRow` | new (local) | `components/OrderItemRow.tsx` | `item: OrderItemDisplay · onCancel: (itemId) => void · onQtyChange?: (itemId, qty) => void` |
| 1b | `ToppingChip` | new (local) | `components/ToppingChip.tsx` | `name: string · price?: number` |
| 1b | `QuantityStepper` | ✅ reuse | `components/shared/QuantityStepper.tsx` | `value · min · max · onChange · size='sm'` |
| 1b | `Badge` (`còn×N`) | ✅ reuse | `components/ui/badge.tsx` | `variant='warning'` |
| 1b | `Button` (`Huỷ`) | ✅ reuse | `components/ui/button.tsx` | `variant='destructive' size='sm'` |
| 1 | `StatusBadge` | ✅ reuse | `components/shared/StatusBadge.tsx` | `status: OrderStatus` |
| 2 | `DishSummaryTable` | new (local) | `components/DishSummaryTable.tsx` | `items: OrderItemDisplay[]` |
| 3 | `MoneySummaryCard` | new (local) | `components/MoneySummaryCard.tsx` | `breakdown: MoneyBreakdown` |
| 4 | `CompletedBanner` | new (local) | `components/CompletedBanner.tsx` | none |
| 5 | `Button` | ✅ reuse | `components/ui/button.tsx` | `variant='outline' className='border-red-600 text-red-600'` |
| 6 | `Button` | ✅ reuse | `components/ui/button.tsx` | `variant='default' className='bg-orange-500'` |
| Modal A | `OrderConfirmedModal` | new (local) | `components/OrderConfirmedModal.tsx` | `open: boolean · onClose: () => void · estimatedMinutes: number` |
| Modal B | `CancelConfirmModal` | new (local) | `components/CancelConfirmModal.tsx` | `target: CancelTarget · onConfirm: () => void · onCancel: () => void` |
| — | `OrderPageSkeleton` | new (local) | `components/OrderPageSkeleton.tsx` | none — Pattern B required |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
// Order status type (reuse from existing codebase)
type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

// Single item as displayed in Zone 1 and Zone 2
interface OrderItemDisplay {
  id: string
  name: string
  qtyOrdered: number      // tổng
  qtyServed: number       // ra
  qtyRemaining: number    // còn = qtyOrdered − qtyServed
  unitPrice: number
  totalPrice: number
  toppings: ToppingDisplay[]
  isInCombo: boolean
  isDone: boolean         // qtyServed === qtyOrdered
}

interface ToppingDisplay {
  name: string
  price: number           // 0 if free
}

// Combo grouping inside Zone 1
interface ComboSectionData {
  comboId: string
  comboName: string       // e.g. "COMBO A"
  items: OrderItemDisplay[]
  isCollapsed: boolean
}

// Full data for Zone 1 Order Card
interface OrderCardData {
  orderId: string
  tableLabel: string      // e.g. "Bàn 5"
  orderNumber: string     // e.g. "0042"
  status: OrderStatus
  totalPrice: number
  elapsedMinutes: number
  progressPercent: number // (qtyServedTotal / qtyTotal) * 100
  combos: ComboSectionData[]
  standaloneItems: OrderItemDisplay[]
  partsServed: number     // e.g. 3
  partsTotal: number      // e.g. 7
}

// Zone 3 money breakdown
interface MoneyBreakdown {
  servedAmount: number    // sum of delivered item prices
  remainingAmount: number // sum of undelivered item prices
  grandTotal: number
  partsServed: number
  partsRemaining: number
}

// Cancel modal target
type CancelTarget =
  | { type: 'item'; itemId: string; itemName: string }
  | { type: 'whole' }
```

### Query Configuration

```typescript
// Initial fetch — staleTime 0 because SSE is the primary update mechanism
const { data: order } = useQuery({
  queryKey: ['order', orderId],
  queryFn: () => fetchOrder(orderId),
  staleTime: 0,
  gcTime: 5 * 60 * 1000,
})

// SSE hook patches the query cache directly on each event
// useOrderSSE already exists — wire it to queryClient.setQueryData(['order', orderId], ...)

// Qty update mutation
const updateQty = useMutation({
  mutationFn: ({ itemId, qty }: { itemId: string; qty: number }) =>
    patchOrderItemQty(orderId, itemId, qty),
  onSuccess: () => queryClient.invalidateQuery({ queryKey: ['order', orderId] }),
})

// Cancel item mutation
const cancelItem = useMutation({
  mutationFn: (itemId: string) => cancelOrderItem(orderId, itemId),
  onSuccess: () => queryClient.invalidateQuery({ queryKey: ['order', orderId] }),
})

// Cancel whole order mutation
const cancelOrder = useMutation({
  mutationFn: () => cancelWholeOrder(orderId),
  onSuccess: () => queryClient.invalidateQuery({ queryKey: ['order', orderId] }),
})
```

### Local State

```typescript
const [isCardCollapsed, setIsCardCollapsed] = useState(false)
const [comboCollapsed, setComboCollapsed] = useState<Record<string, boolean>>({})
const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null)
const [showConfirmedModal, setShowConfirmedModal] = useState(false)
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| Order not found / invalid ID | API 404 | Redirect to `/` or show error page | "Không tìm thấy đơn hàng" empty state |
| SSE disconnected | `sseStatus === 'error'` | Show Zone C1, poll fallback every 10s | Zone C1 banner + auto-retry |
| All items served (progress = 100%) | `progressPercent === 100` | Zone 5 hidden; Zone 4 shown | "Đơn hàng đã hoàn thành" banner |
| Order cancelled by staff | SSE `order_cancelled` event | Show cancelled state, hide Zones 5 & 6 | Grey card with "Đơn đã bị huỷ" |
| Huỷ fails (API error) | mutation error | Toast error | "Không thể huỷ lúc này — thử lại sau" |
| Qty update fails | mutation error | Rollback optimistic update | Toast error |
| No table_id (takeaway order) | `order.tableId === null` | Zone 6 hidden | No "Thêm món" button |
| Guest token expired | API 401 | Redirect to QR scan page | "Phiên đã hết hạn — quét lại mã QR" |
| Empty order (no items) | `items.length === 0` | Show EmptyState in Zone 1 | `<EmptyState message="Chưa có món nào" />` |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] **Nav:** Back button navigates away; LIVE badge is green when SSE connected, hidden/red when disconnected
- [ ] **Zone C1:** Appears within 3s of SSE disconnect; disappears on reconnect
- [ ] **Zone 1:** Collapse/expand ↕ toggles card; combo collapse toggles combo section
- [ ] **Zone 1:** `còn×N` badge decrements correctly when SSE `item_update` arrives
- [ ] **Zone 1:** `Huỷ` button opens Modal B with correct item name
- [ ] **Zone 1:** Qty stepper updates quantity; `−` disabled at qty = 1
- [ ] **Zone 1:** `✓ xong` shown on items where `qtyServed === qtyOrdered`
- [ ] **Zone 2:** Table updates in sync with Zone 1 after SSE events
- [ ] **Zone 2:** Topping chips shown per item row
- [ ] **Zone 3:** Đã dùng / Còn lại / Tổng cộng update after each SSE item update
- [ ] **Zone 4:** Appears (and Zone 5 disappears) when `status = delivered`
- [ ] **Zone 5:** Appears only when `progress < 30%` AND status is active; tapping opens Modal B with `type: 'whole'`
- [ ] **Zone 6:** Appears for dine-in orders; navigates to menu with `activeOrderId` set
- [ ] **Modal A:** Auto-opens on SSE `order_confirmed`; closes on "Đã hiểu" tap
- [ ] **Modal B (item):** Confirm → calls cancel API → item row updates; Giữ lại → closes without action
- [ ] **Modal B (whole):** Confirm → calls cancel whole order API → page reflects cancellation

### Edge Case Tests
- [ ] 404 order ID → error page shown (no crash)
- [ ] SSE disconnect → Zone C1 visible; data not stale (last state retained)
- [ ] All items served → Zone 5 hidden, Zone 4 shown, progress bar 100%
- [ ] Takeaway order (tableId null) → Zone 6 hidden
- [ ] Cancel fails → toast error shown; modal closes; item NOT removed from UI

### Accessibility Tests
- [ ] All `Huỷ` buttons ≥ 44px touch target (`min-h-[44px]`)
- [ ] Qty stepper `role="spinbutton"` with `aria-label`
- [ ] Modal A and B have `role="dialog"` + `aria-labelledby`
- [ ] Modals trap focus; Esc closes
- [ ] LIVE badge has `aria-label="Kết nối realtime đang hoạt động"`

### Cross-Device Tests
- [ ] Mobile 375px — primary viewport
- [ ] Mobile 430px (iPhone Pro Max) — no overflow
- [ ] Tablet 768px — layout does not break

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| P-WIRE-ORDER-1 | Docs | Wireframe + zone table | ✅ | wireframes/client_order_page/client_order_page_wireframe_v1.md |
| P-WIRE-ORDER-2 | Docs | business_description.md + how_to_use.md | ✅ | — |
| P-WIRE-ORDER-3 | Docs | tech_description.md + indexes | ✅ | — |
| P-WIRE-ORDER-4 | Docs | conccern.md + recomment/ | ✅ | — |

---

## 📝 Changelog

**v1 (2026-05-27)**
- Initial scaffold based on `order_ver2.excalidraw`
- Zones documented: Nav · C1 · 1 · 2 · 3 · 4 · 5 · 6
- Modals: A (Order Confirmed SSE push) · B (Cancel Confirm)
- Owner-confirmed: route `/(shop)/order/[id]` · qty stepper live · item cancel any time · còn×N = not yet served

---

*Last Updated: 2026-05-27*
*Approved by: —*
*Next Review: After P-WIRE-ORDER-2 fills business_description + how_to_use*
