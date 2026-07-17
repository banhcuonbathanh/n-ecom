# Scenario — A Manager Works the Live Floor (`/admin/overview`)

> **TL;DR**
> Status: ✅ implemented (all beats traced to source on branch `experience_claude.md_system_1`)
> Purpose: one concrete run through `/admin/overview` — a manager at the command centre from the
> first QR order arriving to a paid table freed, including the 409 trap on a delivered order.
> Sources traced: `fe/src/app/(dashboard)/admin/overview/page.tsx` ·
> `fe/src/features/admin/components/TableList.tsx` ·
> `fe/src/features/admin/components/WaitingSection.tsx` ·
> `fe/src/features/admin/components/PaidLog.tsx` ·
> `fe/src/hooks/useAdminSSE.ts` · `fe/src/hooks/useOverviewWS.ts` ·
> `be/internal/handler/order_handler.go` · `be/internal/service/order_service.go` ·
> `be/internal/handler/payment_handler.go` · `be/internal/service/payment_service.go` ·
> [`admin_overview_be.md`](admin_overview_be.md)
>
> Siblings: [`admin_overview.md`](admin_overview.md) ·
> [`admin_overview_be.md`](admin_overview_be.md) ·
> [`admin_overview_crosscomponent_dataflow.md`](admin_overview_crosscomponent_dataflow.md) ·
> [`admin_overview_crosspage_dataflow.md`](admin_overview_crosspage_dataflow.md) ·
> [`admin_overview_loading.md`](admin_overview_loading.md)
>
> Customer side of this same lunch: [../../customer/customer_menu/SCENARIO_LUNCH_RUSH.md](../../customer/customer_menu/SCENARIO_LUNCH_RUSH.md)

---

## The Cast

| Who | Role in the system | What they do this session |
|---|---|---|
| **Nguyễn Quản Lý** | `manager` — RoleGuard `minRole=MANAGER` passes | Watching `/admin/overview`, the only human in this scenario |
| **Lê Đầu Bếp** | `chef` on the KDS (`/staff/kds`) | Advances dishes via `PATCH /orders/:id/status`; shares the same WS channel |
| Bàn 03 guest | `customer` (QR scan) | Places an order via the menu flow |

> For how the *guest* placed the order from their phone (scan → menu → cart → confirm), see
> [../../customer/customer_menu/SCENARIO_LUNCH_RUSH.md §11:40](../../customer/customer_menu/SCENARIO_LUNCH_RUSH.md).
> This scenario zooms in on the *manager's* screen from the moment the order fires into the system.

---

## Setting

A quiet Saturday morning. Two tables (`Bàn 01`, `Bàn 03`) already have active orders. Nguyễn
Quản Lý opens `/admin/overview` in a desktop browser and waits. A green animated dot in the
page header signals "Live" (`page.tsx:269`).

**Initial board state when the page mounts:**

| Zone | What is visible |
|---|---|
| Zone A — stat cards | 2 active orders, 2 occupied tables |
| Zone B — WaitingSection | 2 rows (Bàn 01 `pending`, Bàn 03 `confirmed`) |
| Zone D — TableList | 6 table rows; 2 occupied with left-border urgency colour, 4 `Trống` |
| Zone E — PaidLog | collapsed (lazy — `enabled: open`, `PaidLog.tsx:21`) |

---

## Timeline

### T+0:00 — Board loads

The page fires two parallel TanStack Query fetches on mount (`page.tsx:124-134`):

```
GET /api/v1/tables       queryKey: ['tables']      staleTime 60 s  (page.tsx:127)
GET /api/v1/orders/live  queryKey: ['orders','live'] staleTime 15 s  (page.tsx:133)
```

Both hit MySQL directly — no Redis read cache anywhere on this page
(`admin_overview_be.md §Caching`). The two responses paint Zone A, B, and D in under 200 ms.

Simultaneously, two persistent connections open:

- **SSE** `GET /sse/admin` — `useAdminSSE` (`useAdminSSE.ts:31`) sends `Authorization: Bearer
  <token>` header; the BE (`admin_handler.go:15`) subscribes to Redis channel `orders:admin` and
  emits an initial `event: connected` frame, then a 15-second keep-alive heartbeat.
- **WS** `GET /ws/orders-live?token=<jwt>` — `useOverviewWS` subscribes via `OrdersWSContext`
  (`useOverviewWS.ts:19`); auth is handled by `ParseToken` inside the handler
  (`websocket/handler.go:31-47`), not by `authMW`. The WS subscribes to Redis channel
  `orders:kds`.

Both channels are now open and idle. The 30-second timer tick (`page.tsx:119`) keeps elapsed-time
urgency colours fresh without any network call.

---

### T+0:45 — New order arrives (SSE doorbell fires)

The Bàn 03 guest (who was browsing the menu on their phone) taps "Đặt hàng." The BE
`CreateOrder` service writes the order to MySQL, then calls `publishAdminOrderEvent`
(`order_service.go:349, 821-829`), publishing to Redis `orders:admin`:

```json
{ "type": "new_order", "order_id": "<uuid>", "order_number": "ORD-20260614-007", "table_id": "<uuid Bàn 03>" }
```

The SSE stream delivers this to `useAdminSSE`; the hook filters for `evt.event === 'new_order'`
(`useAdminSSE.ts:40`) and calls `handleNewOrder(data)` (`page.tsx:142`).

`handleNewOrder` fires `GET /orders/<uuid>` (`page.tsx:144`) — a one-off REST fetch to get the
full order with items before showing the popup. On success it:

1. Patches the TanStack cache: `queryClient.setQueryData(['orders','live'], prev => [order, ...prev])`
   (`page.tsx:147-149`) — the order is immediately visible in Zone B and D even before the manager
   acts.
2. Sets `popupOrder = order` (`page.tsx:150`) — the `NewOrderPopup` modal renders over the board.

The popup (`page.tsx:31-100`) shows the indigo header with order number + table badge, lists each
kitchen item (combo header rows filtered out: `order.items.filter(i => !(i.combo_id !== null &&
i.combo_ref_id === null))`, `page.tsx:42`), displays total, and offers two buttons: **Bỏ qua**
and **✓ Xác nhận nhận đơn**.

> The same `new_order` event also arrives on the WS `orders:kds` channel (`order_service.go:348`);
> `useOverviewWS` handles it too (`useOverviewWS.ts:21-30`) with another `GET /orders/:id` fetch
> and the same cache-prepend. The guard `prev.find(o => o.id === order.id) ? prev : [order, ...prev]`
> (`useOverviewWS.ts:27`) prevents a duplicate if both paths race.

---

### T+0:47 — Manager clicks ✓ Xác nhận

Nguyễn Quản Lý taps the blue confirm button. `handleConfirmPopup` fires (`page.tsx:158`):

```
PATCH /api/v1/orders/<uuid>/status   { "status": "confirmed" }
```

**Optimistic update (before response):** `queryClient.setQueryData` flips the order's status to
`confirmed` in `['orders','live']` immediately (`page.tsx:163-166`), so Zone B and D update with
no wait.

**On the wire:** `UpdateStatus` handler (`order_handler.go:172-183`) binds `{ status: "confirmed"
}`, delegates to `UpdateOrderStatus` service (`order_service.go:533-555`). The service checks
`validTransitions`:

```
pending → confirmed  ✅  (order_service.go:524-530)
```

MySQL `UPDATE orders SET status='confirmed', updated_at=NOW() WHERE id=?` is written
(`orders.sql.go:434-443`). The service then publishes `order_status_changed` to both
`order:<id>` (the guest's SSE) and `orders:kds` (WS/KDS channel) (`order_service.go:552-553`).

**WS reconciliation:** `useOverviewWS` receives `order_status_changed` with `status='confirmed'`;
since `confirmed` is in `ACTIVE`, it maps the order in place (`useOverviewWS.ts:51-63`). The
optimistic write is already there, so this is a no-op diff — no flicker.

`setPopupLoading(false); setPopupOrder(null)` closes the modal (`page.tsx:169-171`). Zone B now
shows Bàn 03 with a `confirmed` badge.

---

### T+2:15 — Kitchen advances the order: confirmed → preparing → ready

Lê Đầu Bếp, watching the KDS at `/staff/kds`, taps the advance button on the Bàn 03 order.
The KDS fires the same endpoint:

```
PATCH /api/v1/orders/<uuid>/status   { "status": "preparing" }
```

The BE publishes `order_status_changed { status: "preparing" }` to `orders:kds`.
`useOverviewWS` on the manager's tab receives the WS message and calls
`queryClient.setQueryData(['orders','live'], ...)` — no HTTP round-trip needed, the cache
updates in place (`useOverviewWS.ts:54-63`). Zone B badge flips to `Đang làm`. The
`item_progress` events that follow (as the chef increments `qty_served`) also travel on
`orders:kds` and update each item's `qty_served` inside the live cache
(`useOverviewWS.ts:34-48`), so the "Còn lại" column in Zone B counts down live.

A few minutes later the chef marks `ready`. The same WS path fires again:
`order_status_changed { status: "ready" }`. Zone B badge turns green ("Sẵn sàng").

---

### T+4:00 — Manager advances: ready → delivered

Nguyễn Quản Lý clicks the green "Đã giao" badge in Zone D (`TableList.tsx:393-400`). The
`StatusBadge` component calls `onAction(order.id, 'delivered')` (`TableList.tsx:396`) which
routes to `handleAction` in the page (`page.tsx:174`):

```
PATCH /api/v1/orders/<uuid>/status   { "status": "delivered" }
```

The transition `ready → delivered` is valid (`order_service.go:527`). The optimistic cache
write flips the status immediately (`page.tsx:179-182`). On success Zone D shows Bàn 03 with
two buttons side by side: **Đã thanh toán 💰** (green) and **Huỷ** (red) — this is the
`delivered` branch of `StatusBadge` (`TableList.tsx:368-386`).

---

### T+4:05 — The 409 trap: manager tries Huỷ on a delivered order

Curious whether cancellation is possible at this stage, Nguyễn Quản Lý clicks the red **Huỷ**
button on the delivered Bàn 03 order (`TableList.tsx:378-385`).

`handleAction(orderId, 'cancelled')` fires:

```
PATCH /api/v1/orders/<uuid>/status   { "status": "cancelled" }
```

The BE service checks `validTransitions`:

```
delivered → cancelled   ✗  NOT in the map (order_service.go:524-530)
```

The service returns `409 INVALID_STATUS_TRANSITION` (`order_service.go:544`). The optimistic
write was already applied by `handleAction` (`page.tsx:179-182`) before the response came
back — the board momentarily shows `cancelled`.

The `catch` block fires (`page.tsx:184-185`):

```ts
toast.error('Không thể cập nhật trạng thái. Vui lòng thử lại.')
```

The toast is **generic** — it does not distinguish a 409 from a network error. The optimistic
`cancelled` status is now stuck in the cache. **The WS reconciliation path saves it:** the BE
published nothing (the write failed), so no `order_status_changed` arrives. The next
`staleTime: 15s` refetch of `['orders','live']` (`page.tsx:133`) restores the correct
`delivered` status from MySQL.

> **Flag 2 from `admin_overview_be.md`:** `delivered → cancelled` is not a valid transition, but
> the UI offers the Huỷ button on every `delivered` order. The root cause: `nextStatus()` in
> `TableList.tsx:10-17` correctly returns `null` for `delivered` (no advance button), but the
> `delivered` branch hardcodes both buttons regardless of transition validity. A delivered order
> can only go to `paid` — either via the payment flow or `delivered → paid` inside
> `MarkOrderPaid` (`order_service.go:75-86`).

---

### T+4:30 — Manager opens Zone D table row, clicks Đã thanh toán 💰

The Bàn 03 guest has settled up in cash. Nguyễn Quản Lý locates the row in Zone D (list mode)
and clicks the green **Đã thanh toán 💰** pill (`TableList.tsx:372-376`). This sets
`payingEntry = { order, table }` which mounts the `PaymentModal` component
(`TableList.tsx:304-311`).

The modal (`TableList.tsx:22-108`) shows:

- Table name + "Xác nhận thanh toán tiền mặt" header in green
- `total_amount` in large text
- Two checkboxes: "Khách đã đưa tiền" + "Nhân viên đã nhận đủ tiền"
- Confirm button disabled until both are checked (`canConfirm = clientPaid && staffReceived && !loading`, `TableList.tsx:42`)

Nguyễn checks both boxes and taps "Xác nhận thu tiền." `handlePaymentConfirm` fires
(`TableList.tsx:286-299`):

```
POST /api/v1/payments   { order_id: "<uuid>", method: "cash", amount: 42000 }
```

**Note on `amount`:** the FE sends `amount: order.total_amount` (`TableList.tsx:291`) but the
BE DTO (`createPaymentReq`) has no `amount` field (`payment_handler.go:23-26`); it is silently
ignored. The server takes the amount from `order.total_amount` (`payment_service.go:89`). See
Flag 3 in `admin_overview_be.md`.

**BE cash path (synchronous):** `CreatePayment` (`payment_service.go:63`) validates the order
status is `ready` or `delivered` (`order_service.go:42-50`), inserts a `pending` payment row,
then calls `completePayment` immediately (`payment_service.go:99`): sets payment → `completed`,
`paid_at = NOW()`, then calls `MarkOrderPaid` which transitions the order
`delivered → paid` (`order_service.go:75-86`), then publishes `payment_success` to `orders:kds`
(`payment_service.go:270-271`).

**FE on 201:** `onPaymentDone(orderId)` fires (`TableList.tsx:294`), which in `page.tsx:370-374`:

```ts
queryClient.setQueryData<Order[]>(['orders', 'live'], prev =>
  (prev ?? []).filter(o => o.id !== orderId)          // drop from live board
)
queryClient.invalidateQueries({ queryKey: ['orders', 'history'] })  // Zone E will refetch
```

`setPayingEntry(null)` closes the modal. `toast.success('Đã thu tiền thành công')` fires
(`TableList.tsx:296`). Bàn 03 row in Zone D instantly reverts to `Trống`.

**WS reconciliation:** the `payment_success` event arrives on `orders:kds`. `useOverviewWS`
handles it under `case 'order_status_changed'`? No — `payment_success` is not in the switch
(`useOverviewWS.ts:19-71`). The filter done by `onPaymentDone` already removed the order;
the WS event is silently unhandled. No duplicate removal, no state leak.

---

### T+4:35 — Manager expands Zone E to review the day's paid orders

Nguyễn Quản Lý clicks the "Đơn đã thanh toán hôm nay" accordion header (`PaidLog.tsx:29`).
`setOpen(true)` enables the query:

```
GET /api/v1/orders/history   queryKey: ['orders','history']   staleTime 30 s  (PaidLog.tsx:22)
```

The query was already invalidated by `onPaymentDone` one second ago (`page.tsx:374`), so it
refetches immediately. `ListTodayHistory` (`order_repo.go:209-232`) returns all orders with
`status IN ('cancelled','paid')` where `DATE(updated_at) = CURDATE()`. `PaidLog` filters
`o.status === 'paid'` (`PaidLog.tsx:25`) and renders a table showing table name, order number,
total, creation time, payment time (`order.updated_at`), and note. Bàn 03's order is now row
one.

> **Flag 6 (`admin_overview_be.md`):** `ListTodayHistory` never fetches `order_items`, so every
> order in Zone E arrives with `items: []`. PaidLog only displays order-level fields, so this is
> fine today — but never reuse this payload for an item-level component.

---

## Under the Hood

### A — How widgets on this page share data without prop-drilling

The `['orders','live']` TanStack Query cache is the single shared bus. Every write — the SSE
`new_order` prepend (`page.tsx:147`), the optimistic status update (`page.tsx:179`), the
`onPaymentDone` filter (`page.tsx:371`), and the WS `setQueryData` calls in `useOverviewWS` —
all target the same `['orders','live']` key. `StatCards`, `WaitingSection`, `PrepPanel`,
`TableList`, and `TableGrid` all read from the filtered `orders` / `tableOrders` derived arrays
in the page (`page.tsx:135-136`), so a single cache mutation fans out to every zone with zero
prop chasing.

Full data-sharing map: [`admin_overview_crosscomponent_dataflow.md`](admin_overview_crosscomponent_dataflow.md)

### B — How data crosses pages and devices

When the manager confirms a `pending` order here, the BE publishes `order_status_changed` to
`order:<id>` (the guest's SSE channel). The guest's `/order/<id>` tracking page receives
`order_status_changed { status: "confirmed" }` via `useOrderSSE` and updates its status badge
— same DB write, two different realtime paths.

The `delivered → paid` write is the terminal event: it removes the order from all live views
and moves it to `orders/history` (Zone E). The `tables` row's `status` flips back to
`available` — the `GET /tables` refetch after the next `staleTime: 60s` (or on the next
mount) reflects this.

Full cross-page + cross-device map: [`admin_overview_crosspage_dataflow.md`](admin_overview_crosspage_dataflow.md)

### C — FE → BE sends on this page

| Beat | Endpoint | Request body | Notes |
|---|---|---|---|
| Page mount | `GET /tables` | — | `admin_overview_be.md §1` |
| Page mount | `GET /orders/live` | — | `admin_overview_be.md §2` |
| SSE/WS `new_order` | `GET /orders/:id` | — | `admin_overview_be.md §4`; errors swallowed (`page.tsx:152`) |
| Popup confirm | `PATCH /orders/:id/status` | `{ status: 'confirmed' }` | `admin_overview_be.md §5` |
| Zone B/D advance | `PATCH /orders/:id/status` | `{ status: '<next>' }` | same handler; optimistic write first |
| Zone D Huỷ (delivered) | `PATCH /orders/:id/status` | `{ status: 'cancelled' }` | 409 → generic toast; cache stuck until refetch |
| Zone D Đã thanh toán | `POST /payments` | `{ order_id, method:'cash', amount }` | `amount` ignored server-side (`admin_overview_be.md §Flag 3`) |
| Zone E expand | `GET /orders/history` | — | lazy; fires only when accordion opens |

Full endpoint traces: [`admin_overview_be.md`](admin_overview_be.md)

### D — BE → FE receives / live updates

Two channels deliver unsolicited data to this page:

**SSE `orders:admin`** (`useAdminSSE.ts:31, 40`): carries only `new_order`. Reconnects with
exponential backoff up to 10 attempts (`useAdminSSE.ts:28`). Token in `Authorization: Bearer`
header; requires `AtLeast("manager")` (`main.go:331`).

**WS `orders:kds`** (`useOverviewWS.ts:19`): carries `new_order`, `item_progress`,
`order_status_changed`, `order_cancelled`, `order_completed`, `items_added`, `item_cancelled`,
`item_updated`, `payment_success`. Auth via `?token=` query param; `ParseToken` only, no role
gate — see Flag 5 in `admin_overview_be.md`. WS disconnect surfaces `ConnectionErrorBanner`
(`page.tsx:249`).

> ❓ UNVERIFIED: `useOverviewWS` switches on `order_updated` and `order_completed`
> (`useOverviewWS.ts:51,67`) but the BE publishes neither string (`order_service.go:789-804`,
> `payment_service.go:270`). Whether these are legacy event names that were renamed is not
> confirmed in source — see `admin_overview_be.md §Flag 4`.

Full realtime detail: [`admin_overview_be.md §7-8`](admin_overview_be.md)

### E — Loading and caching

On mount, both fetches show skeleton states (❓ UNVERIFIED — loading UI for individual zones
not traced here; see [`admin_overview_loading.md`](admin_overview_loading.md)).

Once warm:
- `['tables']` stale after 60 s (`page.tsx:127`); WS `tables:broadcast` may trigger a
  reconcile, but the page does not subscribe to it directly — the staleTime window is the
  effective refresh rate for table `status` changes.
- `['orders','live']` stale after 15 s (`page.tsx:133`), but the WS channel makes it
  effectively push-realtime for order mutations; the 15 s poll is a safety net only.
- `['orders','history']` stale after 30 s (`PaidLog.tsx:22`), lazy (`enabled: open`),
  invalidated by `onPaymentDone`.

No Redis read caches are used — every REST response is a fresh MySQL read. Redis is pub/sub only
on this page. Full caching strategy: [`admin_overview_loading.md`](admin_overview_loading.md)

### F — Monitoring

Any `PATCH /orders/:id/status` burst (e.g. the manager advancing several tables quickly) appears
as a req/s spike on Grafana `:3001`. If the optimistic-update → 409 cycle on a delivered order
is happening at volume, the 5xx Error Rate panel will show it before the toast count makes it
obvious. See the shared monitoring stack in
[`../../09_devops/MONITORING.md`](../../09_devops/MONITORING.md).

---

## Flags Surfaced by This Scenario

| # | Flag | Where it bites |
|---|---|---|
| 1 | **Optimistic update not rolled back on 409** | `handleAction` writes the new status before the PATCH resolves; on error it shows a toast but does not revert the cache. The WS reconciliation or the 15 s `staleTime` refetch corrects it, but the UI is transiently wrong. |
| 2 | **Huỷ button on delivered orders always 409s** | `delivered → cancelled` is not in `validTransitions`. The button should be hidden or disabled for delivered orders. (`TableList.tsx:378-385` + `order_service.go:524-530`) |
| 3 | **`POST /payments` `amount` field is dead weight** | `TableList.tsx:291` sends `amount`; `payment_handler.go:23-26` ignores it. Harmless but misleading. |
| 4 | **`order_updated` / `order_completed` WS cases are dead** | `useOverviewWS.ts:51,67` switch cases never match any BE-published event name — see `admin_overview_be.md §Flag 4`. |
| 5 | **WS `/ws/orders-live` has no role gate** | Any parseable JWT (including `customer` role) can open the live floor feed. (`main.go:337`, `websocket/handler.go:31-47`) |

---

## The One-Line Mental Model

> The manager's board is a **reactive projection of `['orders','live']`**: two fetch channels
> (SSE for new-order popups, WS for everything else) mutate that one cache key, and every zone
> on the page reads the same filtered slice — confirm, advance, and pay all PATCH the same
> endpoint, with optimistic writes reconciled by the WS push.
