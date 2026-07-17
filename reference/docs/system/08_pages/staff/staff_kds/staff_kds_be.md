# KDS — Kitchen Display — `/kds` · Backend View

> **TL;DR:** every BE endpoint the KDS board calls, traced handler → service → repository →
> SQL, with auth, the WebSocket feed, and the events it consumes. Traced from source on branch
> `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/order_handler.go` ·
> `be/internal/service/order_service.go` · `be/internal/repository/order_repo.go` ·
> `be/internal/db/orders.sql.go` · `be/internal/websocket/handler.go` ·
> `be/internal/middleware/rbac.go`.
>
> FE view + zones → [staff_kds.md](staff_kds.md) ·
> Order write pipeline / object model → [../../../02_spec/object/OBJECT_MODEL_ORDER.md](../../../02_spec/object/OBJECT_MODEL_ORDER.md) ·
> Realtime channels → [../../../03_be/REALTIME_SSE.md](../../../03_be/REALTIME_SSE.md) ·
> **Code bugs found this run → [KDS_BUGS.md](KDS_BUGS.md)**

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `GET /orders` | authMW + `AtLeast("chef")` | `orderH.ListLive` | `SearchActiveOrders`→`ListActiveOrders` | raw `ListActiveOrders` + N×`GetOrderItemsByOrderID` + N×`GetTableByID` | — (none) |
| 2 | `GET /orders/:id` | authMW (no role gate) | `orderH.Get` | `GetOrder` | `GetOrderByID` + `GetOrderItemsByOrderID` | — (none) |
| 3 | `PATCH /orders/:id/status` | authMW + `AtLeast("chef")` | `orderH.UpdateStatus` | `UpdateOrderStatus` | `UpdateOrderStatus` (`:exec`) | — (publishes) |
| 4 | `PATCH /orders/:orderId/items/:itemId/status` | **n/a — no such route (404)** | — | — | — | — |
| 5 | WS `GET /ws/orders-live?token=` | **`?token=` JWT only — no authMW, no role gate** | `ws.LiveHandler` | — | — | subscribes `orders:kds` |

Route registration: `/orders` group `be/cmd/server/main.go:230-240` (`orderR.Use(authMW)` at `:231`);
item routes `:249-251`; WS group `:337-339`. All under `/api/v1`.

> **Endpoint 4 is a code bug, not a real endpoint.** The KDS tap-to-serve mutation
> (`fe/src/app/(dashboard)/kds/page.tsx:160-161`) PATCHes the 5-segment path
> `/orders/<orderId>/items/<itemId>/status`, which matches **no** registered route → Gin 404. The
> dedicated item-serve endpoint is `PATCH /orders/items/:id` (`UpdateItemServed`, `main.go:250`),
> a 3-segment path keyed by **item id only**, expecting body `{qty_served:<int>}`. See
> [KDS_BUGS.md](KDS_BUGS.md) Bug 1. It is documented in §4 below as the *intended* target.

## Auth Model on This Page

- **Reads/writes (1–3) all require `authMW`** (any valid JWT). `GET /orders` and
  `PATCH /orders/:id/status` additionally gate on `AtLeast("chef")`; `GET /orders/:id` has **no
  extra role gate** (`main.go:236`).
- **`AtLeast("chef")` = level 2** (`rbac.go:12-19,52-59`: customer 1 · chef 2 · cashier 2 ·
  staff 3 · manager 4 · admin 5). Roles that pass: **chef, cashier, staff, manager, admin**;
  `customer` is blocked.
- **The WebSocket has no `authMW` and no role gate.** The `/ws` group is registered with **zero
  middleware** (`main.go:337`); auth is a `?token=` query param parsed inside `wsHandler`
  (`websocket/handler.go:31-40`) — the parsed claims are **discarded** (`_, err := ParseToken`),
  so any signature-valid, unexpired JWT — **including a `customer` guest token** — can subscribe
  to `orders:kds`. Shared cross-page concern with A1 Overview (see Flags).
- KDS uses a staff/chef JWT, so the `customer`-only table-ownership guard on `GetOrder`
  (`order_service.go:116-120`) never fires for this page.

## Per-Endpoint Detail

### 1 · `GET /orders` (initial board load)

- FE calls it once on mount with **no query params** (`kds/page.tsx:104`).
- Handler `ListLive` (`order_handler.go:140-151`) reads only `c.Query("q")` (empty here);
  serializes via `orderJSON` (`order_handler.go:318-389`).
- Service `SearchActiveOrders` (`order_service.go:194-213`) → `ListActiveOrders`
  (`order_service.go:146-171`): repo `ListActiveOrders` (raw SQL, `order_repo.go:184-207`) returns
  statuses `pending, confirmed, preparing, ready, delivered` ordered `created_at ASC`; then a
  **per-order N+1**: `GetOrderItemsByOrderID` (items) + `GetTableByID` (table name) for each order
  (`order_service.go:154,164`).
- `item_status` is derived per item via `itemStatus(qty_served, quantity)` →
  `pending`/`preparing`/`done` (`order_service.go:750-758`). The KDS ignores it and recomputes
  `còn ×N` from `quantity - qty_served` (`kds/page.tsx:199,228`).
- **No Redis read cache** — the order service `rdb` interface only exposes `Incr`/`Expire`/
  `Publish` (`order_service.go:21-24`); every call hits MySQL.
- KDS narrows the result client-side to `{pending, confirmed, preparing}` (`ACTIVE_STATUSES`,
  `kds/page.tsx:93,110`) — so `ready`/`delivered` orders returned by the BE are dropped from the
  board on first render.

### 2 · `GET /orders/:id` (on `new_order` WS event)

- On a `new_order` WS message the KDS refetches the **single** order
  (`kds/page.tsx:118-128`) and prepends it (dedup by id), then beeps.
- Handler `Get` (`order_handler.go:125-137`) → service `GetOrder` (`order_service.go:106-143`):
  `GetOrderByID` + `GetOrderItemsByOrderID` + a `tableRepo.GetTableByID` for `table_name`. No
  Redis. Response shape identical to one element of §1 (`orderJSON`).
- Table-ownership guard applies to `customer` role only (`order_service.go:116-120`) — irrelevant
  for the chef JWT.

### 3 · `PATCH /orders/:id/status` (inline status picker)

- The picker sends `{status:'ready'}` for **both** *✓ Phục vụ* and *🛍 Mang đi*
  (`kds/page.tsx:260,266`), and `{status:'cancelled'}` for *Huỷ* (`:272`). On success the FE
  removes the card locally (`kds/page.tsx:168-172`).
- Handler `UpdateStatus` (`order_handler.go:167-182`): binds `{status string `binding:"required"`}`,
  reads `c.Param("id")`, returns `200 {message}`; bind error → `400 INVALID_INPUT`.
- Service `UpdateOrderStatus` (`order_service.go:~520-554`) validates against `validTransitions`
  (`order_service.go:524-530`):
  `pending→{confirmed,cancelled}` · `confirmed→{preparing,cancelled}` ·
  `preparing→{ready,cancelled}` · `ready→{delivered}` · `delivered→{paid}`. Invalid transition →
  **`409 INVALID_STATUS_TRANSITION`** (`order_service.go:543-545`). Matches
  [BUSINESS_RULES §2.2](../../../02_spec/BUSINESS_RULES.md#22-transition-permissions).
- ⚠️ Consequence for KDS: `→ready` is valid **only from `preparing`**. A card still in
  `confirmed` (or `pending`) → *Phục vụ* returns **409** and the card stays. See Flags.
- Repo `UpdateOrderStatus` (`orders.sql.go:434-442`): `UPDATE orders SET status=?, updated_at=NOW()
  WHERE id=? AND deleted_at IS NULL`.
- **Publishes** `order_status_changed` `{order_id, status}` to `order:<id>` **and** `orders:kds`
  (`order_service.go:552` → `publishOrderEvent` `:806-819`, `orders:kds` at `:818`). The KDS's own
  WS handler then drops the card when `status ∉ ACTIVE_STATUSES` (`kds/page.tsx:149-154`) — so a
  *Huỷ* (`cancelled`) is removed via `order_status_changed`, **not** `order_cancelled` (that type
  is only emitted by the DELETE-cancel path, `order_service.go:593`).

### 4 · `PATCH /orders/items/:id` — the *intended* item-serve target (FE never reaches it)

> The KDS tap calls the wrong path (§Endpoints note + [KDS_BUGS.md](KDS_BUGS.md) Bug 1). This
> documents the endpoint the tap *should* hit.

- Route `v1.PATCH("/orders/items/:id", authMW, middleware.AtLeast("chef"), orderH.UpdateItemServed)`
  (`main.go:250`) — keyed by **item id**, chef+.
- Handler `UpdateItemServed` (`order_handler.go:241-252`) binds `{qty_served int32 `binding:"min=0"`}`
  (`order_handler.go:236`) — an **absolute SET**, not an increment.
- Service `UpdateItemServed` (`order_service.go:701-723`): rejects `qty_served<0 || >quantity` with
  `ErrInvalidInput` (`:710`); `UpdateQtyServed` (`:714`); `maybeAutoReady(order)` (`:719`) flips the
  order to `ready` + publishes `order_status_changed{ready}` once **all** items are fully served
  (`order_service.go:726-746`); then `publishItemEvent` (`:722`).
- `publishItemEvent` (`order_service.go:998-1010`) emits `item_progress`
  `{order_id,item_id,qty_served,quantity,item_status}` to `order:<id>` **and** `orders:kds`
  (`:1009`). This is the event the KDS `item_progress` handler (`kds/page.tsx:129-144`) consumes —
  it works for events produced by **other** clients, but never by the KDS tap itself (404).

### 5 · WS `GET /ws/orders-live?token=` (live feed)

- The dashboard layout wraps every staff page in one `OrdersWSProvider`
  (`fe/src/app/(dashboard)/layout.tsx:1-4`) → one WS per browser session, connecting to
  `${API}/ws/orders-live?token=<accessToken>` (`OrdersWSContext.tsx:35-38`) with exponential
  backoff reconnect (`:53-57`).
- `LiveHandler` = `wsHandler(hub, rdb, "orders:kds")` (`websocket/handler.go:22-24`); it subscribes
  the client to the Redis channel **`orders:kds`** (`handler.go:67`) and forwards each pub/sub
  payload to the socket verbatim (unmarshal→remarshal no-op, `handler.go:73-78`).
- `KDSHandler` (`/ws/kds`, `main.go:338`) is the **identical** `wsHandler` on the **same**
  `orders:kds` channel (`handler.go:17-19`) — but **no FE connects to it**; the KDS page uses
  `/ws/orders-live`. `/ws/kds` is effectively dead code on this branch.
- **Events the KDS consumes** (all arrive on `orders:kds`):

  | FE-handled type (`kds/page.tsx`) | Producer (`order_service.go`) | KDS action |
  |---|---|---|
  | `new_order` (`:118-128`) | `:348` (order create) | refetch `GET /orders/:id`, prepend, beep |
  | `item_progress` (`:129-144`) | `:722`→`:1009` (`UpdateItemServed`) | bump `qty_served` on the item |
  | `order_cancelled` (`:145-148`) | `:593` (DELETE cancel) | remove card |
  | `order_status_changed` (`:149-154`) | `:552`, `:745` (status / auto-ready) | remove card if status ∉ active |

- **Also published to `orders:kds` but IGNORED by the KDS** (no `case`): `items_added` (`:516`),
  `item_cancelled` (`:642`), `item_updated` (`:696`). Harmless but means an added item or a
  per-item cancel does **not** live-update the board until a full refetch.

## Caching & Invalidation

- **No Redis read cache on any KDS endpoint.** Redis here is pub/sub fan-out only (`orders:kds`,
  `order:<id>`) plus the order-number sequence counter (`order_service.go:777`). Every REST read
  hits MySQL.
- Client cache: `GET /orders` is a TanStack query with `staleTime: 30_000` (`kds/page.tsx:106`);
  after first load the board is driven entirely by WS deltas held in local `useState`
  (`kds/page.tsx:97-157`), not by re-queries.

## Error Behaviour

- Bind failures on `PATCH …/status` → `400 INVALID_INPUT` via `respondError`
  ([ERROR_SPEC.md](../../../02_spec/ERROR_SPEC.md)).
- Invalid transition → `409 INVALID_STATUS_TRANSITION` (`order_service.go:543-545`); the FE shows
  `toast.error('Không thể thay đổi trạng thái')` (`kds/page.tsx:173`) and the card stays.
- The item-tap mutation 404s (Bug 1) → `toast.error('Không thể cập nhật món')` (`kds/page.tsx:162`)
  every time; `qty_served` never advances from the KDS.
- WS drop → `OrdersWSProvider` sets `connected=false` and reconnects with backoff
  (`OrdersWSContext.tsx:53-57`); there is **no visible banner** on the KDS page itself.

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **Tap-to-serve hits a non-existent route (404)** | FE PATCHes `/orders/:orderId/items/:itemId/status` (`kds/page.tsx:160-161`); no such route exists — the real one is `PATCH /orders/items/:id` with `{qty_served}` (`main.go:250`). Compounded: the FE body is `{}` (would SET `qty_served=0` even if routed). Item progress is **unservable from the KDS**. 🔴 → [KDS_BUGS.md](KDS_BUGS.md) Bug 1. |
| 2 | **Card header shows the table UUID, not the table name** | KDS renders `Bàn ${order.table_id}` (`kds/page.tsx:214`) — `table_id` is a UUID. The response already carries the resolved `table_name` (`order_handler.go` `orderJSON`), which the KDS ignores. 🟠 → [KDS_BUGS.md](KDS_BUGS.md) Bug 2. |
| 3 | **`→ready` only valid from `preparing`** | *Phục vụ*/*Mang đi* send `ready`; from `confirmed` or `pending` that's a `409 INVALID_STATUS_TRANSITION` (`order_service.go:524-545`). There is no "Start cooking" (`confirmed→preparing`) control on the KDS, so a freshly-confirmed order cannot be advanced from this screen without first moving to `preparing` elsewhere. |
| 4 | **WS has no role gate** | `/ws/orders-live` (and `/ws/kds`) carry no `authMW`/role check; any valid JWT incl. a `customer` guest token can subscribe to `orders:kds` (`main.go:337`, `handler.go:31-40`). Shared cross-page concern with A1 Overview — see [BE_DOC_TRACKER.md](../../BE_DOC_TRACKER.md) Cross-Page Concerns. |
| 5 | **`/ws/kds` is dead code** | The dedicated KDS socket exists and is identical to `/ws/orders-live` (same `orders:kds` channel) but no FE connects to it (`layout.tsx` wires only `OrdersWSProvider`→`/ws/orders-live`). REALTIME_SSE.md labels `/ws/kds` "Kitchen Display Screen" — minor doc inaccuracy, annotated. |
| 6 | **Three `orders:kds` events are ignored** | `items_added`, `item_cancelled`, `item_updated` reach the socket but have no KDS `case` (`kds/page.tsx:116-155`) — added/removed items don't live-update the board. |
| 7 | **`filling` is not in the response** | Migration `016` added `order_items.filling`, migration `017_drop_order_item_filling.sql` dropped it; the sqlc model + `orderJSON` carry no `filling`. KDS derives the canh "có/không rau" variant from `toppings_snapshot` (`kds/page.tsx:81-91`), so it is unaffected — but the root `CLAUDE.md` still lists the column as live (project-doc drift). |
