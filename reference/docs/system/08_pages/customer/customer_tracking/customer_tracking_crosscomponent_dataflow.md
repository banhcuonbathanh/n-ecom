# Customer Tracking — Cross-Component Data Flow (the SSE fan-out, in depth)

> **What this is:** a deep zoom on how the widgets on the `/tracking` page share data without
> a centralised Zustand cart. Unlike `/menu` (store-first, zero prop-drilling), `/tracking` is
> **orchestrator-first**: the page (`page.tsx`) reads three sources — `useCartStore.activeOrderId`,
> `useOrderMonitorSSE`, and the TanStack `['order', orderId]` query — then **prop-drills** the
> results down to each read-only widget. The cross-component story here is *one SSE hook fans
> out to N widgets via the page orchestrator.*
>
> Status: ✅ implemented (branch `experience_claude.md_system_1`).
>
> Sibling files in this set:
> - [customer_tracking.md](customer_tracking.md) — zones, wireframe, object model
> - [customer_tracking_be.md](customer_tracking_be.md) — BE endpoints, SSE event types, Flags
> - [customer_tracking_loading.md](customer_tracking_loading.md) — in-flight behaviour
> - [SCENARIO_TRACK_ORDER.md](SCENARIO_TRACK_ORDER.md) — narrative beat
>
> Traced from source on branch `experience_claude.md_system_1`:
> [`fe/src/app/(shop)/tracking/page.tsx`](../../../../../fe/src/app/(shop)/tracking/page.tsx) ·
> [`fe/src/hooks/useOrderMonitorSSE.ts`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts) ·
> [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) ·
> [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts)

---

## 0. The SSE fan-out, in one line

> The page reads one `orderId` from the persisted cart store, opens an SSE connection via
> `useOrderMonitorSSE`, fetches the full order snapshot via TanStack Query, then prop-drills
> every derived value into four read-only widgets — none of which know about each other.

### The whole picture on one screen

```
                  ┌─────────────────────────────────────────────┐
                  │  useCartStore (Zustand, persisted)           │
                  │    activeOrderId: string | null  ──────────┐ │
                  └────────────────────────────────────────────┼─┘
                                                               │ orderId
                  ┌────────────────────────────────────────────▼─────┐
                  │             page.tsx  (the orchestrator)          │
                  │                                                    │
                  │  ┌──────────────────────────────┐                 │
                  │  │  useOrderMonitorSSE(orderId) │                 │
                  │  │  returns:                    │                 │
                  │  │    orderStatus  ─────────────┼── effectiveStatus (line 44)
                  │  │    queueData    ─────────────┼── TableInfoBanner · WholeFloorPrepList
                  │  │    sseConnected ─────────────┼── MonitoringTopBar · ConnectionErrorBanner
                  │  │    isUnauthorized ────────────┼── full-page guard (line 90)
                  │  │    itemsChangedAt ────────────┼── triggers refetch() (line 41)
                  │  └──────────────────────────────┘                 │
                  │                                                    │
                  │  ┌──────────────────────────────┐                 │
                  │  │  useQuery(['order', orderId]) │                 │
                  │  │  returns:                     │                 │
                  │  │    order (Order | undefined)  ┼── OrderDetailCard · effectiveStatus fallback
                  │  │    isLoading / isError        ┼── branch guards (lines 69, 111)
                  │  └──────────────────────────────┘                 │
                  │                                                    │
                  │  useState(showTable)  ──────────────────────────── toggle "Ẩn/Hiện bàn"
                  └───────┬────────────┬───────────┬────────────┬─────┘
                          │            │           │            │
                          ▼            ▼           ▼            ▼
               MonitoringTopBar  TableInfoBanner  OrderDetailCard  WholeFloorPrepList
               (sseConnected)    (tableLabel,     (order)          (queue,
                                  status,                           currentOrderId)
                                  queuePosition,
                                  queueTotal,
                                  estimatedMinutes)
```

**Read it like this:** arrows flow *down* from the orchestrator to widgets as props.
No widget talks to another widget. The orchestrator is the only hub.

---

## 1. The cast of components

Widgets that participate in a live tracking session and what each one receives:

| Widget | File | Props received | What it renders |
|---|---|---|---|
| `MonitoringTopBar` | `components/MonitoringTopBar.tsx:7` | `sseConnected: boolean` | "LIVE" / "Mất kết nối" pill |
| `ConnectionErrorBanner` | `components/shared/ConnectionErrorBanner.tsx:1` | *(none — shown/hidden by `!sseConnected` in page)* | Fixed red bar at top |
| `TableInfoBanner` | `components/TableInfoBanner.tsx:12` | `tableLabel`, `status`, `queuePosition`, `queueTotal`, `estimatedMinutes` | Table card + queue position + ETA |
| `OrderDetailCard` | `components/OrderDetailCard.tsx:18` | `order: Order` | Line items, totals, order number |
| `WholeFloorPrepList` | `components/WholeFloorPrepList.tsx:13` | `queue: QueueItem[]`, `currentOrderId: string` | Floor queue; highlights "bàn bạn" |

**The toggle:** `showTable` (page-local `useState`) gates whether `TableInfoBanner` and
`OrderDetailCard` are rendered at all (`page.tsx:141–153`). It is local state — no widget
receives it as a prop.

**The pattern:** 5 widgets, all props from page, **zero cross-widget communication**.

---

## 2. The single source

The page has **three** cooperating sources, not one. The orchestrator merges them:

| Source | What it provides | Consumed by (via page) |
|---|---|---|
| `useCartStore(s => s.activeOrderId)` (`page.tsx:18`) | The `orderId` pointer — the pivot for both other sources | All widgets (indirect; orderId unlocks the other two) |
| `useOrderMonitorSSE(orderId)` (`page.tsx:36–37`) | Live push state: `orderStatus`, `queueData`, `sseConnected`, `isUnauthorized`, `itemsChangedAt` | `MonitoringTopBar`, `ConnectionErrorBanner`, `TableInfoBanner` (queue fields), `WholeFloorPrepList` |
| `useQuery(['order', orderId])` (`page.tsx:21–34`) | Polled snapshot: full `Order` object with `items`, `total_amount`, `status`, `table_name` | `OrderDetailCard`, `effectiveStatus` fallback, `tableLabel` |

### 2.1 Exact traced shape of `useOrderMonitorSSE` return value

```ts
// useOrderMonitorSSE.ts:120
return {
  orderStatus:    OrderStatus | null,   // set by SSE event type 'order.status' (line 68)
  queueData:      QueueState | null,    // set by SSE event type 'queue.update' (line 70-79)
  tableStatuses:  MonitorTableStatus[], // set by SSE event type 'tables.status' (line 82) — NOT forwarded to any widget on /tracking
  sseConnected:   boolean,             // true after successful onopen (line 61); false on error/disconnect
  isUnauthorized: boolean,             // true on HTTP 401/403 from SSE endpoint (line 55)
  itemsChangedAt: number | null,       // Date.now() on 'items_added' | 'item_updated' | 'item_cancelled' (line 87)
  reconnect:      () => void,          // manual re-connect; resets attemptsRef + reconnectKey (line 30-36)
}
```

`queueData` shape — traced from `useOrderMonitorSSE.ts:73-78` and `types/order.ts:67-72`:

```ts
// QueueState (types/order.ts:67)
interface QueueState {
  queue:            QueueItem[]   // full floor queue as received from BE 'queue.update' event
  position:         number        // 1-based: queue.findIndex(q => q.orderId === orderId) + 1; 0 if not found
  total:            number        // data.total from SSE payload (line 76)
  estimatedMinutes: number        // idx > 0 ? idx * 3 : 0  (line 77) — hardcoded 3 min/order
}
```

`QueueItem` shape — traced from `types/order.ts:56-65`:

```ts
interface QueueItem {
  orderId:          string
  tableLabel:       string
  status:           OrderStatus
  itemCount:        number
  estimatedMinutes?: number
  orderNumber?:     string
  createdAt?:       string
  dishes?:          OrderItem[]
}
```

### 2.2 Selectors / derived values computed in page.tsx

```ts
// page.tsx:44-45
const effectiveStatus = orderStatus ?? order?.status      // SSE-live if available; query fallback otherwise
const tableLabel      = order?.table_name ?? order?.table_id ?? '?'  // display label for TableInfoBanner
```

These two lines are the only "merging logic" in the whole page. Everything else is a straight
prop pass-down.

---

## 3. The SSE fan-out, step by step — who writes, who reads

> **Watch the orchestrator mediate.** Each step shows which source changes and which props
> the page forwards to which widgets.

### Step 1 — Page mounts: `activeOrderId` gates everything

`page.tsx:18` reads `useCartStore(s => s.activeOrderId)`.

- If `null` → the page renders a full-screen "Không có đơn hàng đang hoạt động" guard and
  returns early (line 48-66). No hooks downstream fire with a meaningful argument.
- If a valid UUID → `orderId` is set; the query and SSE hook both activate.

```
useCartStore.activeOrderId = "<uuid>"
       │
       └── page.tsx: orderId = "<uuid>"
           ├── useQuery(['order', '<uuid>'])  — fires immediately (enabled: true)
           └── useOrderMonitorSSE('<uuid>')   — opens SSE connection
```

The `activeOrderId` field is **persisted** in localStorage (key: `STORAGE_KEYS.CART_CONFIG`,
`cart.ts:153`) so a page reload restores the pointer without a re-scan.

### Step 2 — SSE connects: `sseConnected` flips to `true`

Inside `useOrderMonitorSSE.ts:61` the `onopen` callback calls `setSseConnected(true)`.
The hook returns the new value; the page receives it; two props update:

```
useOrderMonitorSSE → sseConnected: true
       │
       └── page.tsx (line 127):  <MonitoringTopBar sseConnected={true} />
           → top bar shows green "LIVE" pill
       └── page.tsx (line 129):  {!sseConnected && <ConnectionErrorBanner />}
           → banner hidden
```

No other widget is affected by this prop.

### Step 3 — Query returns: `order` snapshot populates detail card

`useQuery` resolves with `GET /orders/<orderId>` response (`page.tsx:23-25`).

```
useQuery(['order', orderId]) → order: Order
       │
       ├── page.tsx (line 44):  effectiveStatus = orderStatus ?? order.status
       │                         (orderStatus is still null — SSE hasn't sent 'order.status' yet)
       │
       ├── page.tsx (line 45):  tableLabel = order.table_name ?? order.table_id ?? '?'
       │
       ├── page.tsx (line 143): <TableInfoBanner
       │                             tableLabel={tableLabel}
       │                             status={effectiveStatus}    ← order.status here
       │                             queuePosition={null}        ← queueData not yet arrived
       │                             queueTotal={null}
       │                             estimatedMinutes={null} />
       │
       └── page.tsx (line 150): <OrderDetailCard order={order} />
```

`OrderDetailCard` receives the **full `Order` object** from the query — it does **not** receive
any SSE-derived values. Its display is entirely static once the query resolves.

### Step 4 — SSE sends `queue.update`: queue props fan out

BE publishes a `queue.update` event (see [customer_tracking_be.md](customer_tracking_be.md)).
`useOrderMonitorSSE.ts:70-79` computes `queueData`:

```ts
// useOrderMonitorSSE.ts:71-78
const queue = (data.queue ?? []) as QueueItem[]
const idx   = queue.findIndex(q => q.orderId === orderId)
setQueueData({
  queue,
  position:         idx >= 0 ? idx + 1 : 0,
  total:            data.total ?? 0,
  estimatedMinutes: idx > 0 ? idx * 3 : 0,
})
```

The page then fans this out to two widgets:

```
useOrderMonitorSSE → queueData: QueueState
       │
       ├── page.tsx (line 146-149): <TableInfoBanner
       │                                queuePosition={queueData.position}
       │                                queueTotal={queueData.total}
       │                                estimatedMinutes={queueData.estimatedMinutes} />
       │     → shows "#2 trong 5 đơn | Chờ ~3 phút"
       │
       └── page.tsx (line 157-160): <WholeFloorPrepList
                                        queue={queueData.queue}
                                        currentOrderId={orderId} />
             → renders all active floor orders; highlights own table
```

`WholeFloorPrepList` identifies the guest's own row by `item.orderId === currentOrderId`
(`WholeFloorPrepList.tsx:43`). It does **not** receive `effectiveStatus` — it reads
`item.status` from each `QueueItem` directly.

### Step 5 — SSE sends `order.status`: `effectiveStatus` switches to live

BE publishes a `order.status` event with `{ type: "order.status", status: "preparing" }`.
`useOrderMonitorSSE.ts:67-69` fires `setOrderStatus("preparing")`.

```
useOrderMonitorSSE → orderStatus: "preparing"
       │
       └── page.tsx (line 44): effectiveStatus = "preparing" ?? order.status
                                              = "preparing"   (SSE wins)
           └── <TableInfoBanner status="preparing" />
               → badge updates to "Đang chuẩn bị"
```

`OrderDetailCard` is **unaffected** — it only receives `order` (from the query), not
`effectiveStatus`. The status badge in `TableInfoBanner` updates; the order detail card
does not.

### Step 6 — SSE sends `items_added` | `item_updated` | `item_cancelled`: refetch fires

`useOrderMonitorSSE.ts:84-88` sets `itemsChangedAt = Date.now()`.
`page.tsx:40-42` watches it:

```ts
// page.tsx:40-42
useEffect(() => {
  if (itemsChangedAt) refetch()
}, [itemsChangedAt, refetch])
```

This forces `useQuery` to re-fetch `GET /orders/<orderId>`. When the new snapshot arrives,
`OrderDetailCard` re-renders with the updated `order.items`.

```
SSE: items_added / item_updated / item_cancelled
  → useOrderMonitorSSE: itemsChangedAt = Date.now()
  → page.tsx useEffect: refetch()
  → useQuery re-fetches
  → order: Order (updated)
  → OrderDetailCard re-renders
```

### Step 7 — `showTable` toggle: local UI state gates two widgets

The page-local `useState(true)` at `page.tsx:19` controls whether `TableInfoBanner` and
`OrderDetailCard` render at all (lines 141-153). No widget receives this state; it is purely
a conditional in the JSX:

```ts
// page.tsx:141-153
{showTable && (
  <>
    <TableInfoBanner ... />
    {order && <OrderDetailCard order={order} />}
  </>
)}
```

Toggling "Ẩn bàn của bạn" updates only this local flag.

---

## 4. Three layers of state

| Data | Layer | Lives in | Why |
|---|---|---|---|
| `activeOrderId` pointer | **Persisted client state** | `useCartStore` (Zustand + localStorage) | Survives reload; needed to re-attach to the correct SSE stream and query |
| `order: Order` snapshot (items, total, status) | **Server state** | TanStack Query `['order', orderId]` | Comes from BE; cacheable; refetched on `itemsChangedAt` |
| `orderStatus`, `queueData`, `sseConnected`, `isUnauthorized`, `itemsChangedAt` | **Hook-local reactive state** | `useOrderMonitorSSE` (`useState` x5, `page.tsx:36-37`) | Live push from BE SSE; not shared across pages; not persisted |
| `showTable` toggle | **Page-local UI state** | `useState` in `page.tsx:19` | Single widget concern; never exits the page |

> **The rule of thumb (applied here):** persisted pointer → Zustand; server data → TanStack
> Query; live push → hook-local `useState` inside the SSE hook; one-widget UI → `useState`
> in the page. Nothing SSE-derived is placed in a global store.

---

## 5. Cross-component vs cross-page (explicit boundary)

This file covers **cross-component** scope (one page, multiple widgets). The cross-**page**
lifecycle — how `activeOrderId` was set by `/menu`, how the order object travels to admin/KDS
screens, and what happens after payment — belongs to `/menu`'s crosspage doc, because `/tracking`
is a **read-only consumer** with no handoff of its own:

| Scope | Mechanism | Survives F5? | On `/tracking` |
|---|---|---|---|
| **Cross-component** (widgets on one page) | Page orchestrator prop-drills SSE + query values | n/a (in-render) | All five widgets |
| **Cross-page** (`/menu` → `/tracking`) | `activeOrderId` in localStorage via Zustand persist | ✅ | Received, never written |

`/tracking` **never writes `activeOrderId`**. It is set by `/menu`'s `TableConfirmModal` /
`CheckoutForm` on order creation, and cleared by `clearCart()` (either when the guest starts
a new order or the session ends). For the full cross-page lifecycle see:
[../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md)
(the order lifecycle owner — `/tracking` has no crosspage file of its own because it is read-only
and hands nothing off).

---

## 6. Gotchas worth remembering

**`orderStatus` is usually `null` — the badge comes from the query, not SSE.**
The hook only sets `orderStatus` when it receives a `type: "order.status"` event
(`useOrderMonitorSSE.ts:67`). The BE publishes status changes as `order_status_changed`
(see [customer_tracking_be.md](customer_tracking_be.md) Flag 1) — that event type is **not**
matched by the current switch. As a result `orderStatus` stays `null` in practice, and
`effectiveStatus = orderStatus ?? order?.status` resolves to `order?.status` (the query
snapshot). The `TableInfoBanner` status badge is driven by the **query**, not SSE, even
though the page has SSE wired. Cited as Flag 1 in [customer_tracking_be.md](customer_tracking_be.md).

**`tableStatuses` is computed but never forwarded.**
`useOrderMonitorSSE` returns `tableStatuses: MonitorTableStatus[]` (line 120), updated by
`tables.status` events (line 82). Page.tsx does not destructure it (line 36) and no widget
receives it. This field is effectively unused on `/tracking`.

**`reconnect()` is returned but not exposed to the UI.**
The hook's `reconnect` callback (`useOrderMonitorSSE.ts:30-36`) is not destructured in
`page.tsx:36`. There is no "Thử lại" button — the `ConnectionErrorBanner` is display-only.
Manual reconnect would require adding the button and wiring `reconnect` through.

**ETA is hardcoded at 3 min/order, not server-driven.**
`estimatedMinutes` is `idx * 3` (`useOrderMonitorSSE.ts:77`). The `QueueItem.estimatedMinutes`
field in `types/order.ts:61` exists but is not used here.

**`OrderDetailCard` filters combo header rows.**
`OrderDetailCard.tsx:19-21` filters `displayItems` by `!(i.combo_id && !i.combo_ref_id)` — this
removes the ₫0 combo parent row, showing only the exploded children. This logic is local to the
component; the `order` prop arrives unmodified.

**`showTable` is `true` on mount — first paint always shows the table section.**
There is no persisted preference; the toggle resets on every navigation.

**`activeOrderId` survives reload; SSE does not.**
After F5, `orderId` is restored from localStorage, but the SSE connection must re-establish
from scratch (the hook's `useEffect` re-runs). During the gap, `sseConnected = false` and
`ConnectionErrorBanner` briefly appears.

---

## 7. The whole fan-out on one timeline (sequence view)

```
 Guest            page.tsx            useOrderMonitorSSE       useQuery          Widgets
   │                │                        │                     │                │
   ├─ navigate ─▶   │                        │                     │                │
   │   /tracking    │                        │                     │                │
   │                ├─ read activeOrderId ───┤                     │                │
   │                │   from useCartStore    │                     │                │
   │                │                        │                     │                │
   │                ├─────────────────────── useOrderMonitorSSE(orderId) ──────────▶│
   │                │                        │  fetchEventSource   │                │
   │                │                        │  (SSE open)         │                │
   │                │                        ├── sseConnected=true ──────────────────┤
   │                │                        │                     │                │ MonitoringTopBar: LIVE
   │                │                        │                     │                │ ConnectionErrorBanner: hidden
   │                │                        │                     │                │
   │                ├─ useQuery(['order',id]) ──────────────────── GET /orders/id ──▶│
   │                │                        │                     │◀─ 200 {order} ─┤
   │                │                        │                     │                │ OrderDetailCard: renders items
   │                │                        │                     │                │ TableInfoBanner: status=order.status
   │                │                        │                     │                │ (effectiveStatus = null ?? order.status)
   │                │                        │                     │                │
   │  ─── BE pushes queue.update ──────────▶ │                     │                │
   │                │                        ├── queueData={queue, position, total} │
   │                │                        │              estimatedMinutes         │
   │                ├─ queueData ────────────┤                     │                │ TableInfoBanner: queue position + ETA
   │                │                        │                     │                │ WholeFloorPrepList: floor queue
   │                │                        │                     │                │
   │  ─── BE pushes order.status ──────────▶ │                     │                │
   │           (type:"order.status")          │                     │                │
   │                │                        ├── orderStatus="preparing"            │
   │                ├─ effectiveStatus ───────┤                     │                │ TableInfoBanner: badge → "Đang chuẩn bị"
   │                │                        │                     │                │
   │  ─── BE pushes items_added ───────────▶ │                     │                │
   │                │                        ├── itemsChangedAt=Date.now()          │
   │                ├─ useEffect refetch() ──────────────────────── GET /orders/id ──▶│
   │                │                        │                     │◀─ 200 {order} ─┤
   │                │                        │                     │                │ OrderDetailCard: re-renders
   │                │                        │                     │                │
   │  tap "Ẩn bàn" ─▶                       │                     │                │
   │                ├─ setShowTable(false) ──┤                     │                │ TableInfoBanner: unmounted
   │                │   (local useState)     │                     │                │ OrderDetailCard: unmounted
   ▼                                                                                  (all SSE + query still running)
```

---

## 8. Source & rule map

| Topic | Source of truth |
|---|---|
| Page zones / wireframe / object model | [customer_tracking.md](customer_tracking.md) |
| BE endpoints, SSE event types, Flags | [customer_tracking_be.md](customer_tracking_be.md) |
| Loading states and skeleton | [customer_tracking_loading.md](customer_tracking_loading.md) |
| Narrative beat (scenario) | [SCENARIO_TRACK_ORDER.md](SCENARIO_TRACK_ORDER.md) |
| Cross-page lifecycle (order origin + handoff) | [../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md) |
| Cart store (`activeOrderId` field, persist config) | [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) — `partialize` at line 153 |
| SSE hook (full return shape, reconnect logic) | [`fe/src/hooks/useOrderMonitorSSE.ts`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts) |
| Page orchestrator (prop-drill map) | [`fe/src/app/(shop)/tracking/page.tsx`](../../../../../fe/src/app/(shop)/tracking/page.tsx) |
| `Order`, `QueueState`, `QueueItem`, `MonitorTableStatus` shapes | [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts) lines 29-79 |
| State management rule (Query / Zustand / useState) | `docs/fe/FE_DOC_INDEX.md §3` |

---

> **One-line mental model:** on `/tracking`, *`useCartStore.activeOrderId` is the pivot — it
> activates the SSE hook and the query; the page orchestrator merges their outputs into
> `effectiveStatus` and prop-drills everything down to four read-only widgets; no widget
> talks to another.*
