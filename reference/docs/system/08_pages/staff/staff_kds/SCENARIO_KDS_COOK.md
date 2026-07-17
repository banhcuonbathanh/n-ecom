# Scenario — A Chef's Service Run on the KDS

> **TL;DR:** ✅ implemented (with two live bugs — see [KDS_BUGS.md](KDS_BUGS.md)).
> One concrete run through `/kds` from board-open to order-done, grounded in the real endpoints
> traced in [staff_kds_be.md](staff_kds_be.md). Date: 2026-06-17.
>
> Siblings: [staff_kds.md](staff_kds.md) · [staff_kds_be.md](staff_kds_be.md) ·
> `staff_kds_crosspage_dataflow.md` (not yet generated — see §B below) ·
> `staff_kds_loading.md` (not yet generated — see §E below) · [KDS_BUGS.md](KDS_BUGS.md).
>
> Sources traced: `fe/src/app/(dashboard)/kds/page.tsx` · `fe/src/context/OrdersWSContext.tsx` ·
> `be/internal/service/order_service.go` · `be/internal/websocket/handler.go` ·
> `staff_kds_be.md`.

---

## The cast

| Who | Role | What they do in this run |
|---|---|---|
| **Lê Đầu Bếp** (`chef1`) | chef | Opens the KDS, cooks all morning, taps items — hits the known bug |
| **Phạm Thu Ngân** (`cashier1`) | cashier | Confirms orders at the POS; the status promotion the chef needs |
| **Bàn 03 guest** | customer | Scans the QR and places a combo order |

---

## Setting

09:15 on a quiet Tuesday. The restaurant opens at 09:00. Three tables are occupied. The KDS
board (`/kds`) is Lê Đầu Bếp's entire world: a chromebook mounted above the wok, browser
in full-screen kiosk mode. The cashier is at `/admin` on a separate tablet. They share the same
Redis-backed WebSocket channel (`orders:kds`) but never need to talk face to face — the system
bridges them.

---

## Minute-by-minute

### 09:15 — Chef opens `/kds` (initial board load)

Lê Đầu Bếp wakes the screen and navigates to `/kds`. The dashboard layout
(`fe/src/app/(dashboard)/layout.tsx`) wraps every staff page in a single `OrdersWSProvider`
([`OrdersWSContext.tsx:22`](../../../../../fe/src/context/OrdersWSContext.tsx#L22)), so the
WebSocket is already connecting before the page component mounts — one socket per browser
session, shared by every staff page in the dashboard.

The KDS page component mounts and fires one HTTP query:

```
GET /api/v1/orders
Authorization: Bearer <chef JWT>
(no query params)
```

- `queryKey: ['orders', 'kds-initial']`, `staleTime: 30_000`
  ([`kds/page.tsx:103-106`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L103)).
- Handler `ListLive` → service `SearchActiveOrders` → `ListActiveOrders`
  ([`order_service.go:146-171`](../../../../../be/internal/service/order_service.go#L146));
  returns **all** non-cancelled, non-deleted orders (`pending · confirmed · preparing · ready ·
  delivered`) ordered `created_at ASC`.
- Per-order N+1: `GetOrderItemsByOrderID` + `GetTableByID` for each
  ([`order_service.go:154,164`](../../../../../be/internal/service/order_service.go#L154)). No Redis
  read cache — every call hits MySQL ([`staff_kds_be.md §1`](staff_kds_be.md#1--get-orders-initial-board-load)).

The response arrives. `useEffect` on `initial` filters client-side to
`ACTIVE_STATUSES = {pending, confirmed, preparing}`
([`kds/page.tsx:109-111`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L109)):
`ready` and `delivered` orders are silently dropped. Three cards appear.

Meanwhile the WebSocket has negotiated its upgrade:

```
GET ws://<host>/api/v1/ws/orders-live?token=<chef JWT>
```

`OrdersWSProvider` builds the URL by swapping `http` → `ws` on `NEXT_PUBLIC_API_URL`
([`OrdersWSContext.tsx:35-38`](../../../../../fe/src/context/OrdersWSContext.tsx#L35)).
`wsHandler` in `be/internal/websocket/handler.go` parses the `?token=` param
([`handler.go:31-40`](../../../../../be/internal/websocket/handler.go#L31)), validates the JWT,
then subscribes the client to the Redis pub/sub channel **`orders:kds`**
([`handler.go:67`](../../../../../be/internal/websocket/handler.go#L67)).
`setConnected(true)` fires ([`OrdersWSContext.tsx:47`](../../../../../fe/src/context/OrdersWSContext.tsx#L47)).

The KDS page subscribes to the shared WS via `useOrdersWSContext().subscribe`
([`kds/page.tsx:114`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L114)) and installs the
four-case switch ([`kds/page.tsx:117-155`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L117)).
The `connected` value is available on the context but the KDS page **never reads it** — there is
no visible banner when the WS drops (see §F).

The board shows three cards. The chef is ready.

---

### 09:22 — A new order lands (WS `new_order`)

The Bàn 03 guest finishes scanning the QR and submits: **1× Suất Giò** (combo, nhân thịt).
The `POST /orders` call at the BE completes; the service publishes to `orders:kds`
([`order_service.go:348`](../../../../../be/internal/service/order_service.go#L348)):

```json
{ "type": "new_order", "order_id": "<uuid-order-42>" }
```

Every subscriber on `orders:kds` receives this via `wsHandler`'s fan-out loop
([`handler.go:70-80`](../../../../../be/internal/websocket/handler.go#L70)).

The KDS `new_order` case fires
([`kds/page.tsx:118`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L118)):

```
GET /api/v1/orders/<uuid-order-42>
```

This is a **second HTTP round-trip** triggered by the WS event — the `new_order` message carries
only the order id; the full order shape must be fetched separately
([`kds/page.tsx:119-122`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L119)).
Handler `Get` → service `GetOrder`
([`order_service.go:106-143`](../../../../../be/internal/service/order_service.go#L106)):
`GetOrderByID` + items + table name. No Redis. No role gate beyond a valid JWT.

On success:
1. `setOrders(prev => [order, ...prev])` — the new card **prepends** to the board
   ([`kds/page.tsx:123-125`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L123)).
2. `beep()` fires — an 880 Hz Web Audio oscillator, 0.5 s decay
   ([`kds/page.tsx:10-26`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L10)).

The card arrives at `status: pending`. The chef sees it at the top-left.

---

### 09:23 — Chef taps an item line — hits Bug 1 (the broken serve)

The Suất Giò combo expanded into three kitchen-relevant items (combo header filtered out by
`isKitchenItem` — it skips rows where `combo_id !== null && combo_ref_id === null`
([`kds/page.tsx:76-77`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L76))): Giò, Bánh Cuốn
(×3), and Canh. The chef taps the **Bánh Cuốn · thịt** row.

The `patchItemStatus` mutation fires
([`kds/page.tsx:159-163`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L159)):

```
PATCH /api/v1/orders/<uuid-order-42>/items/<uuid-item-banh-cuon>/status
Body: {}
```

Gin has no route that matches this 5-segment path. The registered item route is the 3-segment
`PATCH /orders/items/:id` ([`main.go:250`](../../../../../be/cmd/server/main.go#L250)) — item id
only, no order id segment, no trailing `/status`. Gin returns **404**.

The mutation `onError` fires:
```
toast.error('Không thể cập nhật món')
```
([`kds/page.tsx:162`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L162))

The `còn ×3` counter does **not** drop. The dot stays grey. The chef taps again — same toast.

> **Bug 1** ([KDS_BUGS.md Bug 1](KDS_BUGS.md#bug-1----tap-to-serve-hits-a-404-wrong-path--wrong-body)):
> the KDS's primary action is completely broken. Even if the path were corrected, the body `{}` would
> SET `qty_served = 0` (the endpoint SETs absolutely, never increments). The `item_progress` WS events
> the KDS listens for ([`kds/page.tsx:129-144`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L129))
> are produced by `UpdateItemServed` at
> [`order_service.go:722`→`1009`](../../../../../be/internal/service/order_service.go#L722) — since
> the KDS never reaches that endpoint, those events are never originated from this screen.

The chef cannot advance items from the KDS. Lê Đầu Bếp learns to ignore the tap and use the
status picker to finish the order in bulk.

---

### 09:26 — Card crosses the 10-minute threshold (warning border)

The Suất Giò order was created at 09:16. `elapsedMins` computes
`Math.floor((Date.now() - new Date(order.created_at)) / 60_000)`
([`kds/page.tsx:28-30`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L28)).

At 09:26 the elapsed time reaches 10 minutes.

The **border and time-indicator colours** are computed on every render from the live
`elapsedMins` value:

| elapsed | border CSS class | bar class | text class |
|---|---|---|---|
| < 10 min | `border-border` | `bg-muted-fg` | `text-muted-fg` |
| 10–20 min | `border-warning` | `bg-warning` | `text-warning` |
| > 20 min | `border-urgent` | `bg-urgent` | `text-urgent` |

Source: [`kds/page.tsx:32-49`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L32).

The elapsed timer re-renders each time the `orders` state changes (a WS delta, a new card). There
is **no setInterval** — the timer only updates when the component re-renders for another reason.
❓ UNVERIFIED: whether the board re-renders often enough in a quiet period that the 10-min → 20-min
colour flip is visually timely, or whether a card can sit at the wrong colour until the next WS
event.

At 09:36 (>20 min), the same card transitions to `border-urgent` — the chef flags it manually by
tapping **🔍 Kiểm tra**, which sets the `flagged` local state set and forces `border-urgent`
regardless of elapsed time ([`kds/page.tsx:284,207`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L207)).
This is a purely local marker with no API call.

---

### 09:28 — Cashier confirms the order (status `confirmed`)

Phạm Thu Ngân, watching the `/admin` overview, confirms the pending order. That calls
`PATCH /orders/<uuid>/status` with `{ status: 'confirmed' }`. The BE service validates the
`pending → confirmed` transition ([`order_service.go:524-530`](../../../../../be/internal/service/order_service.go#L524)),
writes it, and publishes `order_status_changed { order_id, status: 'confirmed' }` to
`orders:kds` ([`order_service.go:552`](../../../../../be/internal/service/order_service.go#L552)).

The WS delivers it to the KDS. The `order_status_changed` case:

```ts
if (msg.status && !ACTIVE_STATUSES.has(msg.status)) {
  setOrders(prev => prev.filter(o => o.id !== msg.order_id))
}
```
([`kds/page.tsx:149-153`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L149))

`confirmed` **is** in `ACTIVE_STATUSES` — so the card stays and the `setOrders` filter does
nothing. The badge on the card re-renders only if the card's `order.status` field is updated —
but the KDS `order_status_changed` handler does **not** patch the status field on the local order
object. ❓ UNVERIFIED: whether the status badge on an existing card (e.g. `pending` → `confirmed`)
actually flips in the UI without a refetch. The FE state holds the original `status: 'pending'`
from the `GET /orders/:id` call at 09:22 and no code updates it.

---

### 09:31 — Chef opens the inline status picker → ✓ Phục vụ

Lê Đầu Bếp decides the order is ready (even though he couldn't tap items). He taps **Trạng thái ▼**
on the card. `setStatusMenus(prev => toggle(prev, order.id))`
([`kds/page.tsx:296`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L296)) opens the inline
picker for this card.

The chef taps **✓ Phục vụ**. The `patchOrderStatus` mutation fires
([`kds/page.tsx:165-174`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L165)):

```
PATCH /api/v1/orders/<uuid-order-42>/status
Authorization: Bearer <chef JWT>
Body: { "status": "ready" }
```

Auth: `authMW` (valid JWT required) + `AtLeast("chef")` role gate
([`staff_kds_be.md §3`](staff_kds_be.md#3--patch-ordersidstatus-inline-status-picker)).

The BE validates the transition. The order is currently `confirmed` (assumed — see
❓ UNVERIFIED above). The `validTransitions` map:

```
confirmed → {preparing, cancelled}
```
([`order_service.go:524-530`](../../../../../be/internal/service/order_service.go#L524))

`ready` is **not** a valid target from `confirmed`. The service returns:
```
409 INVALID_STATUS_TRANSITION
```
([`order_service.go:543-545`](../../../../../be/internal/service/order_service.go#L543))

The FE `onError` shows:
```
toast.error('Không thể thay đổi trạng thái')
```
([`kds/page.tsx:173`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L173))

The card stays. The valid path is:
`pending → confirmed → preparing → ready`

The KDS has no "Bắt đầu nấu" (start cooking / `preparing`) control — only *Phục vụ* (`ready`)
and *Huỷ* (`cancelled`). So the chef must ask Phạm Thu Ngân to move the order to `preparing`
first, or the cashier can do it from the admin/POS screen.

Once the cashier advances it to `preparing` via their own PATCH → `order_status_changed
{ status: 'preparing' }` arrives on the KDS WS (same path as above) → card stays (still active)
→ chef taps **✓ Phục vụ** again with `status = 'ready'`.

This time the transition is valid (`preparing → ready`):
- Repo: `UPDATE orders SET status='ready', updated_at=NOW() WHERE id=?`
  ([`staff_kds_be.md §3`](staff_kds_be.md#3--patch-ordersidstatus-inline-status-picker))
- Publishes `order_status_changed { status: 'ready' }` to `order:<id>` **and** `orders:kds`
  ([`order_service.go:552`](../../../../../be/internal/service/order_service.go#L552))

The KDS receives the `order_status_changed` event. `'ready'` is **not** in `ACTIVE_STATUSES`
→ `setOrders(prev => prev.filter(o => o.id !== msg.order_id))` removes the card
([`kds/page.tsx:150-153`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L150)).

The mutation `onSuccess` also removes it locally
([`kds/page.tsx:168-172`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L168)) — so
the card disappears on the optimistic local remove before the WS echo arrives. The WS event is a
harmless duplicate.

`toast.success('Đã cập nhật đơn')` shows. The board now has one fewer card.

The order moves to the cashier (`/cashier/payment/<uuid>`) — the cashier's page picks it up from
their own board; see `staff_cashier_payment/` folder for that story.

---

### 09:33 — Alt beat: a different card is cancelled

A guest at Bàn 01 calls the cashier and asks to cancel. The cashier calls
`DELETE /orders/<uuid-order-41>` from their admin screen. The `CancelOrder` service checks the
30%-served threshold
([`order_service.go:582-588`](../../../../../be/internal/service/order_service.go#L582)). If the
order passes (< 30% served — trivially true since `qty_served` never advanced, thanks to Bug 1),
the soft-delete runs and the service publishes:

```json
{ "type": "order_cancelled", "order_id": "<uuid-order-41>" }
```

to `orders:kds` ([`order_service.go:593`](../../../../../be/internal/service/order_service.go#L593)).

The KDS `order_cancelled` case:
```ts
case 'order_cancelled':
  setOrders(prev => prev.filter(o => o.id !== msg.order_id))
```
([`kds/page.tsx:145-148`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L145))

The Bàn 01 card is removed instantly from the board. No `toast` — silent removal.

> **Note:** if the chef had used the inline picker's **Huỷ** button on the KDS itself, that
> calls `PATCH /orders/:id/status` with `{ status: 'cancelled' }`, which goes through
> `UpdateOrderStatus` ([`staff_kds_be.md §3`](staff_kds_be.md#3--patch-ordersidstatus-inline-status-picker)).
> The cancellation event in that case arrives as `order_status_changed { status: 'cancelled' }` —
> NOT `order_cancelled` (that type is only emitted by the soft-delete / DELETE path at
> [`order_service.go:593`](../../../../../be/internal/service/order_service.go#L593)).
> Both types remove the card; the routes differ.

---

## Under the hood

### A · Cross-component state

The KDS is a **single-file component** with no sub-components and no Zustand store.
All state is local `useState`:
- `orders: Order[]` — the authoritative board
- `statusMenus: Set<string>` — which cards have the inline picker open
- `flagged: Set<string>` — which cards the chef has flagged with 🔍 Kiểm tra

There is no `_crosscomponent_dataflow.md` for this page because there are no inter-component
data flows — all state is owned by `KDSPage` directly
([`kds/page.tsx:97-100`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L97)).

The only external hook is `useOrdersWSContext()`, which provides `subscribe` from the
`OrdersWSProvider` living in the dashboard layout (a React Context, not Zustand).

### B · Cross-page state

`staff_kds_crosspage_dataflow.md` has not been generated yet. Key cross-page facts:

- The KDS shares the **same `orders:kds` Redis channel** as the Admin Overview
  (`/admin/overview`) and the `/ws/kds` endpoint (dead code — no FE connects to it;
  `staff_kds_be.md Flag 5`). A status change from any of these screens is immediately
  reflected on all others.
- When the chef marks an order `ready`, the cashier's admin overview receives the same
  `order_status_changed` WS event and updates their board.
- The KDS has no localStorage reads or writes. A tab refresh loses the board and triggers a
  fresh `GET /orders` on mount.
- After an order leaves the KDS board (`status: ready`), the next page is
  `staff_cashier_payment/` — link there for the billing story.

### C · FE → BE sends

| Call | When | Path | Body |
|---|---|---|---|
| `GET /orders` | on mount | `/api/v1/orders` | — |
| `GET /orders/:id` | on `new_order` WS | `/api/v1/orders/<id>` | — |
| `PATCH /orders/:id/status` | inline picker: ✓ Phục vụ / Mang đi / Huỷ | `/api/v1/orders/<id>/status` | `{ status }` |
| `PATCH /orders/:orderId/items/:itemId/status` | item line tap | **404 — route does not exist** | `{}` |

The intended item-serve endpoint is `PATCH /orders/items/:id` with `{ qty_served: <int> }`
([`main.go:250`](../../../../../be/cmd/server/main.go#L250)). See [KDS_BUGS.md Bug 1](KDS_BUGS.md#bug-1----tap-to-serve-hits-a-404-wrong-path--wrong-body).

### D · BE → FE live (WS events on `orders:kds`)

| Event type | Producer (service.go line) | KDS action | Code ref |
|---|---|---|---|
| `new_order` | `:348` (order create) | refetch `GET /orders/:id`, prepend card, beep | `kds/page.tsx:118-128` |
| `item_progress` | `:722`→`:1009` (`UpdateItemServed`) | bump `qty_served` on the matching item | `kds/page.tsx:129-144` |
| `order_cancelled` | `:593` (soft-delete cancel) | remove card | `kds/page.tsx:145-148` |
| `order_status_changed` | `:552` (status patch) · `:745` (auto-ready) | remove card if `status ∉ ACTIVE_STATUSES` | `kds/page.tsx:149-154` |
| `items_added` | `:516` | **ignored** — no `case` | — |
| `item_cancelled` | `:642` | **ignored** — no `case` | — |
| `item_updated` | `:696` | **ignored** — no `case` | — |

The three ignored events (`items_added`, `item_cancelled`, `item_updated`) mean that if a customer
adds a dish to an existing order or cancels a single item, the KDS board does **not** live-update
until a full refresh ([`staff_kds_be.md Flag 6`](staff_kds_be.md#flags)).

### E · Loading and caching

`staff_kds_loading.md` has not been generated yet. Key facts:

- Initial board: one `useQuery` with `staleTime: 30_000` (30 s)
  ([`kds/page.tsx:103-106`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L103)).
  After 30 s the query is considered stale, but there is no `refetchInterval` — a background
  re-fetch only happens if the component re-mounts or the window re-focuses.
- In practice the board is **WS-driven after first load**: all subsequent mutations to `orders`
  state come from `setOrders` inside the WS handler, not from re-queries.
- **No Redis read cache** on any KDS endpoint — all REST reads hit MySQL directly
  ([`staff_kds_be.md §Caching`](staff_kds_be.md#caching--invalidation)).
- Empty state: if `orders.length === 0` the page renders a centered
  `"Không có đơn nào đang chờ 🍜"` ([`kds/page.tsx:182-188`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L182)).
  This renders on first load before the HTTP query resolves too, since `initial` is `undefined`
  until the query completes and `orders` starts as `[]`.

### F · Monitoring

- **WS connection state** is available as `connected: boolean | null` from `useOrdersWSContext()`
  ([`OrdersWSContext.tsx:16`](../../../../../fe/src/context/OrdersWSContext.tsx#L16)):
  `null` = connecting, `true` = open, `false` = closed/reconnecting.
- The KDS page **never reads `connected`** — there is no banner, no indicator, no toast when the
  WS drops ([`staff_kds_be.md §Error Behaviour`](staff_kds_be.md#error-behaviour)).
- Reconnect logic: exponential backoff `Math.min(1000 × 2^(attempts-1), 30_000)` — max 30 s
  ([`OrdersWSContext.tsx:53-57`](../../../../../fe/src/context/OrdersWSContext.tsx#L53)).
- If the WS is down and a new order arrives, the KDS does not know until reconnect — no fallback
  polling.
- Grafana `be:8080/metrics` captures the PATCH and GET request counts and p95 latency. The
  kitchen's PATCH volume is near-zero during a real service because Bug 1 makes every tap a 404;
  that would appear as a small spike in 4xx rates.
  Grafana dashboard → [`docs/system/09_devops/MONITORING.md`](../../../09_devops/MONITORING.md).

---

## Flags surfaced by this scenario

| # | Flag | Ref |
|---|---|---|
| 1 | **Tap-to-serve 404s** — KDS primary action is broken; `còn ×N` never drops | [KDS_BUGS.md Bug 1](KDS_BUGS.md#bug-1----tap-to-serve-hits-a-404-wrong-path--wrong-body) |
| 2 | **Card header shows UUID, not table name** — `Bàn ${order.table_id}` renders the raw UUID | [KDS_BUGS.md Bug 2](KDS_BUGS.md#bug-2----card-header-shows-the-table-uuid-not-the-table-name) |
| 3 | **`→ ready` only valid from `preparing`** — the KDS has no "start cooking" control to move `confirmed → preparing`, so a freshly-confirmed order cannot be advanced to `ready` without cashier action | [staff_kds_be.md Flag 3](staff_kds_be.md#flags) |
| 4 | **Status badge on existing cards may not live-update** — `order_status_changed` removes non-active cards but does not patch the `status` field on staying cards; the badge text may lag | ❓ UNVERIFIED |
| 5 | **Urgency timer only re-renders on WS deltas** — border colour is not on a timer; in a quiet window a card can remain at the wrong colour class | ❓ UNVERIFIED |
| 6 | **3 WS event types silently ignored** — `items_added`, `item_cancelled`, `item_updated` reach the KDS socket but have no `case`, so per-item additions/cancels don't live-update the board | [staff_kds_be.md Flag 6](staff_kds_be.md#flags) |
| 7 | **WS drop is invisible to the chef** — `connected` is never rendered on the KDS page | [staff_kds_be.md §Error Behaviour](staff_kds_be.md#error-behaviour) |

---

## The one-line mental model

> The KDS is a **WS-first, read-on-demand board**: it seeds once from `GET /orders`, then lives
> entirely on `orders:kds` WS deltas — but its only write action (tap-to-serve) 404s, so the
> chef's path to closing an order is the bulk status picker (`ready`) after the cashier has
> advanced it to `preparing`.
