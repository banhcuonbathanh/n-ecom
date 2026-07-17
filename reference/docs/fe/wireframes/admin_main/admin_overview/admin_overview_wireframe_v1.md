---
page: admin_overview
route: /admin/overview
created: 2026-05-27
status: Draft
---

# Page: Admin — Tổng quan (Ordering Workflow Dashboard)
**Route:** `/admin/overview`
**Version:** v1
**Status:** Draft

## Spec Summary

- Real-time operations dashboard for Floor Manager, Kitchen Staff, and Waiters
- Zone A — 4 KPI stat cards derived from live order data, re-computed every 30s + WS push
- Zone B — prep queue: per-table order cards color-coded by status, expandable, inline status change dropdown
- Zone C — serving tracker: "Tổng cần làm" aggregate + per-dish rows + per-table tổng/ra/còn breakdown
- Zone D — empty table map: REST-fetched grid of available tables
- Status lifecycle: Đang chờ → Đang làm → Sẵn sàng → Đã giao → Thanh toán (POS)
- Urgency system: red border >20 min · yellow 10–20 min · orange <10 min · grey no order

---

## 📐 Visual Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ADMIN ORDERING WORKFLOW  ①→②→③→④→⑤→⑥  ·  purple=admin · orange=API · blue=FE              │
│ ① QR & Tables  → ② Menu CRUD  → ③ Monitor Orders  → ④ KDS Processing  → ⑤ POS  → ⑥ Reports│
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ NAV  Quản trị hệ thống                                           [logout] [avatar]          │
│─────────────────────────────────────────────────────────────────────────────────────────────│
│ [Tổng quan▾] Tổng kết  Sản phẩm  Combo  Danh mục  Topping  Nhân viên  Kho  Marketing  ● Live│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
         ↑ sticky top-0 z-30

─── Zone A — StatCards (derived from live orders · 30s setInterval tick) ────────────────────
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌────────────────────┐  │
│ │ Bàn đang phục vụ  │ │ Món chờ làm       │ │ Món đang làm      │ │ Khẩn cấp / Cảnh báo│  │
│ │ 5                 │ │ 32                │ │ 1                 │ │ 1 / 0              │  │
│ │ / 6 bàn           │ │ Chưa bắt đầu      │ │ Đang chế biến     │ │ >20 phút / 10-20ph │  │
│ └───────────────────┘ └───────────────────┘ └───────────────────┘ └──[red bg]──────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

─── Zone B — Danh sách cần chuẩn bị (PrepList · WS push) ────────────────────────────────────
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Danh sách cần chuẩn bị                                                                      │
│ 4 bàn  ·  12 loại món  ·  33 phần còn lại                                                  │
│                                                                                             │
│ ┌─────────────────────────[blue border: Đang làm]──────────────────────┐ [▼ dropdown]      │
│ │ Bàn 01  ·  Đang làm                                                  │   Sẵn sàng        │
│ │ Bánh Cuốn Thịt ×2  ·  Nem Rán ×1  ·  Cà Phê Sữa ×1                 │   Huỷ đơn         │
│ │ ⏱ 12 phút  [Expand ▾]                                               │                   │
│ └──────────────────────────────────────────────────────────────────────┘                   │
│                                                                                             │
│ ┌─────────────────────────[grey border: Đang chờ]──────────────────────┐                   │
│ │ Bàn 02  ·  Đang chờ                                                  │                   │
│ │ Bánh Cuốn Thịt ×2  ·  Trà Đá ×2                                     │                   │
│ │ ⏱ 5 phút  [Bắt đầu làm]  [Huỷ đơn]                                 │                   │
│ └──────────────────────────────────────────────────────────────────────┘                   │
│                                                                                             │
│ ┌─────────────────────────[green border: Sẵn sàng]─────────────────────┐                   │
│ │ Bàn 03  ·  Sẵn sàng                                                  │                   │
│ │ Phở ×1  ·  Nước Suối ×2                                              │                   │
│ │ ⏱ 8 phút  [Đã giao]                                                 │                   │
│ └──────────────────────────────────────────────────────────────────────┘                   │
│                                                                                             │
│ ┌─────────────────────────[red border: URGENT >20ph]───────────────────┐                   │
│ │ Bàn 04  ·  Đang làm  ⚠ 30 phút                                       │                   │
│ │ Phở ×3  ·  Bánh Cuốn Thịt ×2                                         │                   │
│ │ [Sẵn sàng]  [Huỷ đơn]                                               │                   │
│ └──────────────────────────────────────────────────────────────────────┘                   │
│                                                                                             │
│ ┌─────────────────────────[purple border: VIP]─────────────────────────┐                   │
│ │ Bàn 05  ·  Đã xác nhận — VIP                                         │                   │
│ │ Bánh Cuốn Thịt ×4  ·  Nem Rán ×2  ·  Cà Phê Sữa ×1  ·  Trà Đá ×2  │                   │
│ │ [Bắt đầu làm]  [Huỷ đơn]                                            │                   │
│ └──────────────────────────────────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

─── Zone C — Đang phục vụ (ServingSection · WS item_progress → qty_served) ─────────────────
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Tổng quan sàn                                  Tất cả bàn — cập nhật theo thời gian thực ● │
│                                                                                             │
│ Đang phục vụ                                                                               │
│ 5 bàn đang có khách                                                                        │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐   │
│ │ Tổng cần làm  ·  12 loại  ·  33 phần còn lại                                        │   │
│ │ Bánh Cuốn Thịt    Bàn 01, Bàn 02, Bàn 05                              ×8            │   │
│ │ Trà Đá            Bàn 02, Bàn 05                                       ×6            │   │
│ │ Nem Rán           Bàn 01, Bàn 05                                       ×5            │   │
│ │ Cà Phê Sữa        Bàn 05                                               ×3            │   │
│ │ ...                                                                                  │   │
│ └──────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                             │
│ Per-table breakdown:                                                                        │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──[red border]──┐ ┌─[purple]──┐   │
│ │ Bàn 01        │ │ Bàn 02        │ │ Bàn 03        │ │ Bàn 04  ⚠30ph │ │ Bàn 05 VIP│   │
│ │ tổng | ra|còn │ │ tổng | ra|còn │ │ tổng | ra|còn │ │ tổng | ra|còn │ │535.000 đ  │   │
│ │   8  |  2| 6  │ │   4  |  1| 3  │ │   3  |  3| 0  │ │   5  |  0| 5  │ │ tổng|ra|còn│  │
│ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ └───────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

─── Zone D — Bàn trống (REST · static until WS table-status event) ──────────────────────────
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Bàn trống (1)                                                                               │
│ ┌──────────────┐                                                                            │
│ │ Bàn VIP      │                                                                            │
│ │ 8 chỗ        │                                                                            │
│ │ [Trống]      │                                                                            │
│ └──────────────┘                                                                            │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

── Status Legend (bottom) ───────────────────────────────────────────────────────────────────
Đang chờ → [Bắt đầu làm] / [Huỷ đơn]
Đã xác nhận → [Bắt đầu làm] / [Huỷ đơn]
Đang làm → [Sẵn sàng] / [Huỷ đơn]
Sẵn sàng → [Đã giao]
Đã giao → [Thanh toán (POS)]
Đã huỷ (terminal)
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| Nav | `AdminTopNav` (tabs: Tổng quan active) | Always visible | sticky top-0 z-30 |
| A | `PrepStatCards` (4× `KPICard`) | Always visible | static |
| B | `PrepListSection` | Always — empty state when no active orders | static, scroll |
| B.card | `PrepListCard` | 1 card per active order (pending/confirmed/preparing) | within section |
| B.dropdown | `StatusChangeDropdown` | On "▼" click in card header | inline popover |
| C | `ServingSection` | Always — empty state when no active tables | static, scroll |
| C.summary | `DishSummaryRow` (repeating) | 1 row per dish type aggregated across all tables | within summary bar |
| C.table | `TableServingCard` (repeating) | 1 card per occupied table | grid layout |
| D | `EmptyTableGrid` | Always — EmptyState when all tables are occupied | static |
| D.card | `EmptyTableCard` | 1 card per table with status=empty | within grid |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| A | `useOverviewStore.liveOrders` (derived) | WebSocket `/ws/orders-live` push + 30s timer | N/A (WS store) | Urgency counts re-computed locally on each WS message |
| B | `useOverviewStore.prepOrders` | WebSocket push (pending · confirmed · preparing) | N/A (WS store) | Sorted: urgent first, then by elapsed time |
| C | `useOverviewStore.servingOrders` | WebSocket `item_progress` event → qty_served | N/A (WS store) | Aggregate computed from same order data as Zone B |
| D | `useOverviewStore.tables` | REST initial + WS `table_status` event | `['admin', 'tables']` | Filter: status === 'empty' |
| All | Auth | Zustand `useAuthStore` | N/A | Route guard: admin + manager only |

---

## 🧩 Component Specifications

> Before filling this table: read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md`.
> Mark each row with one of: `✅ reuse` · `new (local)` · `new (shared)`

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|-----------------|
| Nav | `AdminTopNav` | ✅ reuse | `shared/AdminTopNav.tsx` | `activeTab="overview"` |
| Nav | `AuthGuard` | ✅ reuse | `guards/AuthGuard.tsx` | wraps page |
| Nav | `RoleGuard` | ✅ reuse | `guards/RoleGuard.tsx` | `allowedRoles={['admin', 'manager']}` |
| A | `KPICard` | ✅ reuse | `shared/KPICard.tsx` | `label · value · badge · valueColor` |
| B | `StatusBadge` | ✅ reuse | `shared/StatusBadge.tsx` | `status: OrderStatus` |
| B, C | `Badge` | ✅ reuse | `ui/badge.tsx` | variant: urgent · warning · success · default |
| B, C | `Button` | ✅ reuse | `ui/button.tsx` | variant: default · destructive · ghost |
| D | `EmptyState` | ✅ reuse | `shared/EmptyState.tsx` | `message="Tất cả bàn đang có khách"` |
| B, C | `UrgencyBorderTimer` | new (shared) | `shared/UrgencyBorderTimer.tsx` | `elapsedMinutes: number · className?` — applies red/yellow/orange border class |
| B | `PrepListSection` | new (local) | `app/admin/overview/components/PrepListSection.tsx` | `orders: PrepOrder[]` |
| B | `PrepListCard` | new (local) | `app/admin/overview/components/PrepListCard.tsx` | `order: PrepOrder · onStatusChange: (orderId, status) => void` |
| B | `StatusChangeDropdown` | new (local) | `app/admin/overview/components/StatusChangeDropdown.tsx` | `orderId: string · currentStatus: OrderStatus · onSelect: (status) => void` |
| C | `ServingSection` | new (local) | `app/admin/overview/components/ServingSection.tsx` | `orders: ServingOrder[]` |
| C | `DishSummaryRow` | new (local) | `app/admin/overview/components/DishSummaryRow.tsx` | `dishName: string · tables: string[] · qty: number` |
| C | `TableServingCard` | new (local) | `app/admin/overview/components/TableServingCard.tsx` | `table: TableServing · elapsedMinutes: number` |
| D | `EmptyTableGrid` | new (local) | `app/admin/overview/components/EmptyTableGrid.tsx` | `tables: EmptyTable[]` |
| D | `EmptyTableCard` | new (local) | `app/admin/overview/components/EmptyTableCard.tsx` | `table: EmptyTable` |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

interface OrderItem {
  productId: string
  productName: string
  qty: number
  qtyServed: number
}

interface PrepOrder {
  orderId: string
  tableLabel: string
  isVip: boolean
  status: 'pending' | 'confirmed' | 'preparing' | 'ready'
  items: OrderItem[]
  elapsedMinutes: number
}

interface ServingOrder {
  orderId: string
  tableLabel: string
  isVip: boolean
  totalAmount: number
  items: OrderItem[]           // qty, qtyServed, qtyRemaining = qty - qtyServed
  elapsedMinutes: number
}

interface TableServing {
  tableLabel: string
  isVip: boolean
  totalItems: number
  servedItems: number
  remainingItems: number
  elapsedMinutes: number
  totalAmount?: number         // shown for VIP tables
}

interface EmptyTable {
  tableId: string
  tableLabel: string
  capacity: number
  status: 'empty'
}

interface DishAggregate {
  productName: string
  tables: string[]             // table labels that have this dish pending
  totalQty: number
}

// Zustand store shape
interface OverviewState {
  connected: boolean
  liveOrders: PrepOrder[]      // all active orders (source of truth)
  tables: EmptyTable[]         // empty tables only
  setOrders: (orders: PrepOrder[]) => void
  updateOrderStatus: (orderId: string, status: OrderStatus) => void
  updateQtyServed: (orderId: string, itemId: string, qtyServed: number) => void
  setTables: (tables: EmptyTable[]) => void
}

// Derived selectors (computed, not stored)
// prepOrders   = liveOrders.filter(o => ['pending','confirmed','preparing','ready'].includes(o.status))
// servingOrders = liveOrders.filter(o => ['preparing','ready'].includes(o.status))
// statCards    = derived from liveOrders (table count, waiting count, preparing count, urgent count)
```

### Query Configuration

```typescript
// Initial REST hydration (runs once on mount before WS connects)
useQuery({
  queryKey: ['admin', 'overview', 'orders'],
  queryFn: () => fetchActiveOrders(),
  staleTime: 0,                    // always re-fetch on mount — WS keeps fresh after
  refetchOnWindowFocus: false,     // WS handles updates; no polling needed
})

// Tables (REST, updated by WS table_status event)
useQuery({
  queryKey: ['admin', 'tables'],
  queryFn: () => fetchTables(),
  staleTime: 30_000,
})

// WS hook (custom)
useOverviewWebSocket({
  url: '/ws/orders-live',
  onOrderUpdate: (order) => overviewStore.updateOrderStatus(order.id, order.status),
  onItemProgress: (event) => overviewStore.updateQtyServed(event.orderId, event.itemId, event.qtyServed),
  onTableStatus: () => queryClient.invalidateQueries({ queryKey: ['admin', 'tables'] }),
})
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| WS disconnected | `connected === false` in store | Show `ConnectionErrorBanner` | Fixed banner: "Mất kết nối — dữ liệu có thể lỗi thời" |
| No active orders (Zone B empty) | `prepOrders.length === 0` | Render EmptyState | "Chưa có đơn hàng — quán đang yên tĩnh 🍜" |
| All tables occupied (Zone D empty) | `emptyTables.length === 0` | Render EmptyState | "Tất cả bàn đang có khách" |
| Urgent order (>20 min) | `elapsedMinutes > 20` | Red border + ⚠ icon | `UrgencyBorderTimer` applies `border-red-500 border-2` |
| WS event order not found in store | `orderId` not in `liveOrders` | Re-fetch `['admin', 'overview', 'orders']` | Silent background refetch |
| Network offline | `navigator.onLine === false` | Show ConnectionErrorBanner | Same as WS disconnected |
| Role unauthorized | `role` not in `['admin', 'manager']` | `RoleGuard` redirects | Redirect to `/admin/login` |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Zone A — 4 stat cards render correct values derived from mock orders
- [ ] Zone A — Urgent card shows red background when urgentCount > 0
- [ ] Zone B — PrepListCard renders with correct border color per status (blue/grey/green/red/purple)
- [ ] Zone B — Status change dropdown opens on ▼ click; correct actions shown per status
- [ ] Zone B — "Bắt đầu làm" button calls `PATCH /api/v1/admin/orders/:id/status` with `preparing`
- [ ] Zone B — "Sẵn sàng" sets status to `ready`; card moves to green border
- [ ] Zone B — "Đã giao" sets status to `delivered`; card removed from prep list
- [ ] Zone C — DishSummaryRow aggregates qty correctly across all active tables
- [ ] Zone C — TableServingCard shows tổng/ra/còn values and urgency border
- [ ] Zone D — EmptyTableCard shows correct name, capacity, "Trống" badge
- [ ] WS — incoming `order_update` event updates Zone B without page reload
- [ ] WS — `item_progress` event increments `qtyServed` in Zone C

### Edge Case Tests
- [ ] WS disconnect → ConnectionErrorBanner visible; reconnects automatically
- [ ] All orders delivered → Zone B shows EmptyState
- [ ] All tables occupied → Zone D shows EmptyState
- [ ] Order >20 min → UrgencyBorderTimer applies red border class

### Accessibility Tests
- [ ] All action buttons `min-h-[44px]` touch target
- [ ] Urgency state communicated via aria-label (not color only)
- [ ] Keyboard: Tab through cards → Enter to open dropdown → Esc to close

### Cross-Device Tests
- [ ] Desktop (1280px+) — 4-column stat cards, side-by-side table cards
- [ ] Tablet (768px) — 2-column stat cards; see `admin-overview-mobile.excalidraw` for mobile layout

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| OV-1 | FE | Wireframe + zone table | ✅ | wireframes/admin_main/admin_overview/admin_overview_wireframe_v1.md |
| OV-2 | FE | `useOverviewStore` + WS hook | ⬜ | Zone A, B, C data sources |
| OV-3 | FE | Zone A — 4 KPICards wired to store | ⬜ | Zone A |
| OV-4 | FE | Zone B — PrepListSection + PrepListCard + StatusChangeDropdown | ⬜ | Zone B |
| OV-5 | FE | Zone C — ServingSection + DishSummaryRow + TableServingCard | ⬜ | Zone C |
| OV-6 | FE | Zone D — EmptyTableGrid + EmptyTableCard | ⬜ | Zone D |
| OV-7 | FE | `UrgencyBorderTimer` shared component | ⬜ | Register in _INDEX_SHARING_COMPONENT.md |
| OV-8 | FE | page.tsx assembly + auth guards + skeleton | ⬜ | Full page |

---

## 📝 Changelog

**v1 (2026-05-27)**
- Initial scaffold based on `admin-overview.excalidraw`
- Zones documented: Nav · A (4 StatCards) · B (PrepList) · C (ServingSection) · D (EmptyTableGrid)
- WS data flow mapped: `/ws/orders-live` → `useOverviewStore` → Zones A, B, C
- Urgency timer system: red/>20min · yellow/10–20min · orange/<10min

---

*Last Updated: 2026-05-27*
*Approved by: —*
*Next Review: After WS integration verified with BE team*
