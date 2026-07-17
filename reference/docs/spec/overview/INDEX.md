# Developer Brief — `/admin/overview` (Tổng quan sàn)

> **Version:** v1.0 · 2026-05-04
> **Route:** `GET /admin/overview`
> **Role:** Manager+ (enforced by `AdminLayout` AuthGuard + RoleGuard)
> **Source specs:** `Spec_9 §2` · `API_CONTRACT_v1.2.md §4 §6 §10` · `MASTER_v1.2.md §5`
> **Wireframe:** `docs/fe/wireframes/overview.md`
> **Task rows:** `docs/TASKS.md §Phase 9` (9-1 → 9-8)

---

## 1. What To Build

A live floor view for managers. Shows all tables, live orders, urgency signals, and action buttons to confirm/cancel/complete orders. Real-time updates via WebSocket.

**Current state of the file:** `USE_MOCK = true` — all data is hardcoded. Goal: flip to `false` and wire all zones to real API + WS.

---

## 2. Page File

```
fe/src/app/(dashboard)/admin/overview/page.tsx
```

All components are currently inline in `page.tsx`. Task 9-2 through 9-7 extract each into its own file under:

```
fe/src/features/admin/overview/
  useOverviewWS.ts       ← Task 9-2
  StatCards.tsx          ← Task 9-3
  WaitingSection.tsx     ← Task 9-4
  PrepPanel.tsx          ← Task 9-5
  OrderDetail.tsx        ← Task 9-6
  TableCard.tsx          ← Task 9-7
  TableGrid.tsx          ← Task 9-7
```

---

## 3. API Endpoints

### 3.1 GET /api/v1/tables

```
GET /api/v1/tables
Authorization: Bearer <access_token>
Role: Staff+

Response 200:
{
  "data": [
    { "id": "7f3d...", "name": "Bàn 01", "capacity": 4, "status": "available" },
    ...
  ],
  "pagination": { "page": 1, "limit": 20, "total": 8, "total_pages": 1 }
}
```

TanStack Query key: `['tables']` · staleTime: `60_000`

### 3.2 GET /api/v1/orders/live

```
GET /api/v1/orders/live?page=1&limit=100
Authorization: Bearer <access_token>
Role: Staff+

Response 200:
{
  "data": [<Order>, ...],
  "pagination": { ... }
}
```

Order object shape:
```ts
interface Order {
  id:             string       // UUID
  order_number:   string       // e.g. "ORD-001"
  status:         'pending' | 'confirmed' | 'preparing' | 'ready'
  source:         'qr' | 'pos'
  table_id:       string | null
  customer_name:  string | null
  customer_phone: string | null
  total_amount:   number
  note:           string | null
  created_at:     string       // ISO 8601
  items:          OrderItem[]
}

interface OrderItem {
  id:               string
  product_id:       string
  combo_id:         string | null
  combo_ref_id:     string | null
  name:             string
  quantity:         number
  qty_served:       number      // derive status from this — NO status column
  unit_price:       number
  note:             string | null
  topping_snapshot: unknown | null
  flagged:          boolean
}
```

> `item_status` is NOT stored — derive it:
> - `qty_served === 0` → pending (grey dot)
> - `0 < qty_served < quantity` → preparing (yellow dot)
> - `qty_served === quantity` → done (green dot)

TanStack Query key: `['orders', 'live']` · staleTime: `15_000`

Active statuses kept in UI: `pending | confirmed | preparing | ready`

### 3.3 PATCH /api/v1/orders/:id/status

```
PATCH /api/v1/orders/:id/status
Authorization: Bearer <access_token>
Role: Chef+ (Chef / Cashier / Manager / Admin)

Request body:
{ "status": "confirmed" }

Response 200: updated order object
```

Valid transitions triggered from this page:
| From | To | Trigger |
|---|---|---|
| `pending` | `confirmed` | "Phục vụ" or "Mang đi" button |
| `pending` | `cancelled` | "Huỷ" on WaitingCard |
| `confirmed` or `preparing` | `cancelled` | "Huỷ" in OrderDetail |
| `ready` | `delivered` | "Hoàn thành" in OrderDetail |

---

## 4. WebSocket

```
ws://{host}/api/v1/ws/orders-live?token=<access_token>
Role: Staff+
Auth: query param — WS cannot set headers
```

### 4.1 Reconnect Config (mandatory — from MASTER §5)

```ts
const WS_RECONNECT = {
  maxAttempts:     5,
  baseDelay:       1000,   // ms — doubles each retry
  maxDelay:        30000,  // ms cap
  showBannerAfter: 3,      // failed attempts before showing "Mất kết nối" banner
}
```

### 4.2 Message Types → Cache Mutations

| `type` | Payload shape | Action on TanStack Query cache |
|---|---|---|
| `new_order` | full `Order` object | append to `['orders','live']` data |
| `item_progress` | `{ order_id, item_id, qty_served, quantity, item_status, progress_pct }` | update matching item's `qty_served` in cache |
| `order_status_changed` | `{ order_id, status }` | update order status; remove if status not in ACTIVE set |
| `order_updated` | full `Order` object | replace order in cache |
| `order_cancelled` | `{ order_id }` | remove order from cache |
| `order_completed` | `{ order_id }` | remove order from cache |

> `ACTIVE = new Set(['pending', 'confirmed', 'preparing', 'ready'])`

---

## 5. Component Tree & Data Flow

```
overview/page.tsx
│
├── [ZoneA] StatCards
│   └── props: orders[]
│   └── computes: tablesServed · pendingItems · preparingItems · urgencyCount
│
├── [ZoneB] WaitingSection   (shown if pendingOrders.length > 0)
│   └── props: orders[], tables[], loadingIds, onAction, checkedTableIds, onToggleCheck
│   └── WaitingCard × N     (one per pending order)
│       ├── Kiểm tra toggle → toggles checkedTableIds (Set<string>)
│       └── 3 action buttons → onAction(orderId, 'confirmed'|'cancelled')
│           disabled while loadingIds.has(orderId)
│
├── [ZoneC] PrepPanel        (shown if checkedTableIds.size > 0)
│   └── props: checkedTableIds, orders[], tables[]
│   └── Per-table section (collapsible) × checkedTableIds.size
│       └── dish rows: dot + name + còn ×N / ✓ xong + note
│   └── Tổng cần làm summary
│       └── one row per distinct dish, sorted by remaining qty desc
│
└── [ZoneD] TableGrid
    └── props: tables[], orders[], loadingIds, onAction, checkedTableIds, onToggleCheck
    └── sorted: occupied first, then alpha vi-VN locale
    └── TableCard × N
        ├── empty → icon + "Chưa có đơn"
        └── occupied → border-{gray|orange|yellow|red}-400 by urgency
            └── [ZoneE] OrderDetail
                ├── order header (number + status badge + elapsed mins)
                ├── progress bar (servedQty / totalQty × 100%)
                ├── 3 mini counters: Chờ / Đang làm / Đã ra
                ├── item list with status dots
                ├── Kiểm tra toggle
                ├── Hoàn thành (only when status === 'ready') → 'delivered'
                └── Huỷ (when status in confirmed|preparing|ready) → 'cancelled'
```

---

## 6. Client State

```ts
// Page-level state (useState in page.tsx)
const [checkedTableIds, setCheckedTableIds] = useState<Set<string>>(new Set())
const [loadingIds, setLoadingIds]           = useState<Set<string>>(new Set())
const [now, setNow]                         = useState<number>(Date.now())

// now ticks every 30s via setInterval → triggers urgency recompute
```

No Zustand store for this page — all state is component-local.

---

## 7. Urgency Logic

Urgency is computed from `elapsedMins(order.created_at, now)`:

| Condition | TableCard border | StatCard label |
|---|---|---|
| No active order | `border-gray-200` | — |
| elapsed < 10 min | `border-orange-400` | normal |
| elapsed 10–20 min | `border-yellow-400` | Cảnh báo |
| elapsed > 20 min | `border-red-400` | Khẩn cấp |

```ts
function elapsedMins(createdAt: string, now: number): number {
  return Math.floor((now - new Date(createdAt).getTime()) / 60_000)
}
```

---

## 8. Item Status Derivation (no status column)

```ts
function itemCounts(items: OrderItem[]) {
  const kitchen = items.filter(isKitchenItem) // exclude combo headers
  let pending = 0, preparing = 0, done = 0, totalQty = 0, servedQty = 0
  for (const it of kitchen) {
    totalQty  += it.quantity
    servedQty += it.qty_served
    if (it.qty_served === 0)              pending++
    else if (it.qty_served < it.quantity) preparing++
    else                                  done++
  }
  return { pending, preparing, done, totalQty, servedQty }
}

function isKitchenItem(item: OrderItem): boolean {
  return !(item.combo_id !== null && item.combo_ref_id === null)
}
```

---

## 9. StatCards Derivation

```ts
// From orders[] where status in ACTIVE:
const tablesServed  = new Set(orders.map(o => o.table_id).filter(Boolean)).size
const pendingItems  = orders.flatMap(o => o.items).filter(it => it.qty_served === 0).length
const preparingItems = orders.flatMap(o => o.items).filter(it => it.qty_served > 0 && it.qty_served < it.quantity).length
const urgentCount   = orders.filter(o => elapsedMins(o.created_at, now) > 20).length
const warningCount  = orders.filter(o => { const m = elapsedMins(o.created_at, now); return m >= 10 && m <= 20 }).length
// 4th card shows: `${urgentCount} / ${warningCount}`
```

---

## 10. PrepPanel — Tổng cần làm Logic

```ts
// checkedOrders = orders where table_id is in checkedTableIds
// Per-dish summary across all checked orders:
const summary = new Map<string, { tables: string[], remaining: number }>()
for (const order of checkedOrders) {
  const tableName = tableById[order.table_id]?.name ?? '?'
  for (const item of order.items.filter(isKitchenItem)) {
    const remaining = item.quantity - item.qty_served
    if (remaining <= 0) continue
    if (!summary.has(item.name)) summary.set(item.name, { tables: [], remaining: 0 })
    const entry = summary.get(item.name)!
    entry.tables.push(tableName)
    entry.remaining += remaining
  }
}
// Sort by remaining desc
const rows = [...summary.entries()].sort((a, b) => b[1].remaining - a[1].remaining)
```

---

## 11. Task Rows (Phase 9)

| ID | Task | Status |
|---|---|---|
| 9-1 | `admin.api.ts` — verify real axios calls for `listTables`, `listLiveOrders`, `updateOrderStatus` | ⬜ |
| 9-2 | `useOverviewWS` hook — WS connect/reconnect + 6 message type cache mutations | ⬜ |
| 9-3 | `StatCards` component | ⬜ |
| 9-4 | `WaitingCard` + `WaitingSection` | ⬜ |
| 9-5 | `PrepPanel` (conditional + collapsible + Tổng cần làm) | ⬜ |
| 9-6 | `OrderDetail` (progress bar + counters + item list + action buttons) | ⬜ |
| 9-7 | `TableCard` + `TableGrid` (urgency border + occupied-first sort) | ⬜ |
| 9-8 | `overview/page.tsx` — assemble, flip `USE_MOCK=false`, wire WS, 30s timer | ⬜ |

Full rows with `spec_ref` and `draw_ref`: `docs/TASKS.md §Phase 9`

---

## 12. Acceptance Criteria

| # | Scenario | Expected |
|---|---|---|
| AC-1 | Page loads with real API | Stat cards show live counts; tables grid renders all tables |
| AC-2 | New order arrives via WS | WaitingSection gains a new card without page refresh |
| AC-3 | Click "Phục vụ" on pending order | Button disables, PATCH fires, card disappears from WaitingSection |
| AC-4 | Click "Kiểm tra" on a table | PrepPanel appears; Tổng cần làm shows correct remaining qty |
| AC-5 | Check multiple tables | PrepPanel aggregates dishes across all checked tables, sorted by qty |
| AC-6 | Click "Hoàn thành" on ready order | PATCH → `delivered`, card leaves the grid |
| AC-7 | WS disconnects | Reconnect banner shown after 3 failed attempts; auto-retries with backoff |
| AC-8 | Table > 20 min with no service | TableCard border is red-400; urgency stat card increments |
| AC-9 | All items served on a checked table | PrepPanel shows "Tất cả món đã ra hết." for that table |
| AC-10 | Timer ticks at 30s | Border colors update without user action |

---

## 13. Source Docs (read when needed)

| Need | File | Section |
|---|---|---|
| Full API shapes | `docs/contract/API_CONTRACT_v1.2.md` | §4 (Orders) · §6 (Tables) · §10 (WS) |
| WS/SSE reconnect config | `docs/core/MASTER_v1.2.md` | §5 |
| RBAC roles | `docs/core/MASTER_v1.2.md` | §3 |
| Order business rules (cancel threshold) | `docs/core/MASTER_v1.2.md` | §4 |
| Error codes → toast messages | `docs/contract/ERROR_CONTRACT_v1.1.md` | — |
| Wireframe (ASCII layout) | `docs/fe/wireframes/overview.md` | — |
| FE patterns (api-client, auth token) | `docs/fe/FE_SYSTEM_GUIDE.md` | — |
