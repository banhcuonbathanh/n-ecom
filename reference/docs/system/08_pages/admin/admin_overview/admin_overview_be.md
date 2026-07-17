# Admin Overview — `/admin/overview` · Backend View

> **TL;DR:** every BE endpoint the live-floor command centre calls, traced handler → service →
> repository → SQL, with auth, caching, realtime and error behaviour. Traced from source on branch
> `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/order_handler.go` ·
> `be/internal/service/order_service.go` · `be/internal/repository/order_repo.go` ·
> `be/internal/handler/table_handler.go` · `be/internal/repository/table_repo.go` ·
> `be/internal/handler/payment_handler.go` · `be/internal/service/payment_service.go` ·
> `be/internal/sse/admin_handler.go` · `be/internal/websocket/handler.go`.
>
> FE view + zones → [admin_overview.md](admin_overview.md) ·
> Live data flow across widgets → [admin_overview_crosscomponent_dataflow.md](admin_overview_crosscomponent_dataflow.md) ·
> Order write pipeline → [../../../02_spec/object/OBJECT_MODEL_ORDER.md](../../../02_spec/object/OBJECT_MODEL_ORDER.md) ·
> RBAC + transitions → [../../../02_spec/BUSINESS_RULES.md](../../../02_spec/BUSINESS_RULES.md)

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis |
|---|---|---|---|---|---|---|
| 1 | `GET /tables` | authMW + `AtLeast("cashier")` | `tableH.ListTables` | — (handler→repo, no service) | `tableRepo.ListTables` (raw SQL) | — |
| 2 | `GET /orders/live` | authMW + `AtLeast("cashier")` | `orderH.ListLive` | `SearchActiveOrders` → `ListActiveOrders` | `order_repo.ListActiveOrders` (raw SQL) + `GetOrderItemsByOrderID` | — |
| 3 | `GET /orders/history` | authMW + `AtLeast("cashier")` | `orderH.ListHistory` | `ListTodayHistory` | `order_repo.ListTodayHistory` (raw SQL) | — |
| 4 | `GET /orders/:id` | authMW (any role) | `orderH.Get` | `GetOrder` | `GetOrderByID` + `GetOrderItemsByOrderID` (sqlc) | — |
| 5 | `PATCH /orders/:id/status` | authMW + `AtLeast("chef")` | `orderH.UpdateStatus` | `UpdateOrderStatus` | `UpdateOrderStatus` (sqlc) | pub/sub only |
| 6 | `POST /payments` | authMW + `AtLeast("cashier")` | `paymentH.Create` | `CreatePayment` → `completePayment` → `MarkOrderPaid` | `CreatePayment` · `GetPaymentByOrderID` · `UpdatePaymentStatus` + `UpdateOrderStatus` (sqlc) | pub/sub `orders:kds` |
| 7 | `GET /sse/admin` (SSE) | authMW + `AtLeast("manager")` | `sse.StreamAdmin` | — (subscribes Redis) | — | sub `orders:admin` |
| 8 | `GET /ws/orders-live?token=` (WS) | `?token=` query → `ParseToken` in handler (**no `authMW`**) | `ws.LiveHandler` | — (subscribes Redis) | — | sub `orders:kds` |

Route registration: orders group `orderR := v1.Group("/orders")` with `orderR.Use(authMW)`
(`main.go:231`) → `/live` `main.go:234`, `/history` `main.go:235`, `/:id` `main.go:236`,
`/:id/status` `main.go:237`. Tables `main.go:265-270`. Payments `main.go:254-256`. SSE
`main.go:331`. WS `main.go:337-339`. All under `/api/v1`.

---

## Auth Model on This Page

- **The whole page is staff-only.** It lives under the admin shell
  (`(dashboard)/admin/layout.tsx` → AuthGuard + RoleGuard `minRole=MANAGER`), so the human is
  always a manager/admin. At the BE the individual endpoints are gated more loosely than the shell:
  - **Reads 1–3** require `AtLeast("cashier")` — cashier / chef / staff / manager / admin
    (`main.go:234-235`, `main.go:269`). The `customer` role (level 1) is blocked.
  - **`GET /orders/:id` (4)** is the loosest — `authMW` only, **no role gate** (`main.go:236`).
    Ownership is enforced in the service: a `customer`-role caller is restricted to its own
    `table_id` (`order_service.go:116-119`); staff callers see any order.
  - **`PATCH /orders/:id/status` (5)** requires `AtLeast("chef")` (`main.go:237`). No per-caller
    check inside the service — any chef+ caller may set any *valid* next status, including
    `cancelled`.
  - **`POST /payments` (6)** requires `AtLeast("cashier")` (`main.go:255`).
- **Realtime auth differs per channel:**
  - **SSE `/sse/admin` is the only endpoint on this page gated to `AtLeast("manager")`**
    (`main.go:331`) — Bearer token in the `Authorization` header (`useAdminSSE.ts:33`).
  - **WS `/ws/orders-live` has no `authMW` on its route group** (`main.go:337`); the handler reads
    `?token=` and calls `ParseToken` itself (`websocket/handler.go:31-47`). Any *authenticated*
    JWT (any role, including `customer`) passes — see Flags.

---

## Per-Endpoint Detail

### 1 · `GET /tables`

- No service layer by design — `TableHandler` holds the repo directly
  (`table_handler.go:18`, comment line 22). Handler `ListTables` (`table_handler.go:28-46`) reads
  no query params.
- Repo `tableRepo.ListTables` (`table_repo.go:39-56`) is **raw SQL** (no sqlc):
  `SELECT id, name, qr_token, capacity, status, is_active FROM tables WHERE deleted_at IS NULL
  ORDER BY name ASC`.
- Response per table: `id, name, capacity, status, is_active, qr_token`. No cache — hits MySQL on
  every request (FE softens this with a 60 s TanStack `staleTime`, `page.tsx:127`).

### 2 · `GET /orders/live` (Zone B feed — `['orders','live']`)

- Handler `ListLive` (`order_handler.go:140-151`) reads exactly one query param, `q`
  (`c.Query("q")`, line 141); serializes with `orderJSON()`. The FE's `listLiveOrders()` passes no
  `q` on this page (`admin.api.ts:172-173`), so search is client-side here.
- Service `SearchActiveOrders` (`order_service.go:194-213`) calls `ListActiveOrders`
  (`order_service.go:146-171`), then if `q != ""` filters in-memory (case-insensitive contains on
  `order_number`, `id`, `customer_name`, `table_name`).
- Repo `ListActiveOrders` (`order_repo.go:184-207`) is **raw SQL**:
  `WHERE status IN ('pending','confirmed','preparing','ready','delivered') AND deleted_at IS NULL
  ORDER BY created_at ASC`. Each order is then enriched N+1 with items
  (`GetOrderItemsByOrderID`, sqlc `orders.sql.go:174-215`) and `table_name` (`GetTableByID`).
- The FE re-filters this list to the same five `ACTIVE` statuses client-side (`page.tsx:26,135`),
  so any future status drift is double-guarded.
- No Redis cache (FE `staleTime` 15 s, `page.tsx:133`).

### 3 · `GET /orders/history` (Zones E + F — `['orders','history']`)

- Handler `ListHistory` (`order_handler.go:154-165`) reads **no** params; serializes with
  `orderJSON()`.
- Service `ListTodayHistory` (`order_service.go:174-190`) enriches only `table_name` — it does
  **not** fetch `order_items`, so every history order's `items` array is `[]` (fine: PaidLog /
  CancelLog render order-level fields only).
- Repo `ListTodayHistory` (`order_repo.go:209-232`) is **raw SQL**:
  `WHERE status IN ('cancelled','paid') AND deleted_at IS NULL AND DATE(updated_at) = CURDATE()
  ORDER BY updated_at DESC`. "Today" = the order's **`updated_at`** date (when it became paid /
  cancelled), in MySQL server time.
- One request feeds both logs: `PaidLog` filters `status === 'paid'`, `CancelLog` filters
  `status === 'cancelled'` from the shared `['orders','history']` cache. Both queries are
  `enabled: open` (lazy — fire only when the accordion is expanded, `PaidLog.tsx:18-23`,
  `CancelLog.tsx:18-23`).

### 4 · `GET /orders/:id` (new-order popup)

- Fired by `useAdminSSE` and `useOverviewWS` on a `new_order` event (`page.tsx:144`,
  `useOverviewWS.ts:23`) to fetch the full order before showing `NewOrderPopup`.
- Handler `Get` (`order_handler.go:125-137`): reads `c.Param("id")`; for a `customer` role it
  overrides the caller id with `claims.TableID`. Service `GetOrder` (`order_service.go:106-143`)
  loads the order (`GetOrderByID`, sqlc `orders.sql.go:119-145`), enforces customer ownership,
  fetches items (`GetOrderItemsByOrderID`), derives each item's `ItemStatus`
  (`pending`/`preparing`/`done` from `qty_served` vs `quantity`), and joins `table_name`.
- No cache.

### 5 · `PATCH /orders/:id/status` (confirm · advance · cancel)

- Every status button on this page routes here: popup **✓ Xác nhận** (`page.tsx:162`),
  Zone B/D **advance** buttons via `handleAction` → `updateOrderStatus` (`admin.api.ts:178`),
  and Zone D **Huỷ** → `handleAction(id,'cancelled')`.
- Handler `UpdateStatus` (`order_handler.go:172-183`) binds `{ "status": "<string>" }` (required);
  no caller/claims check at handler level.
- Service `UpdateOrderStatus` (`order_service.go:533-555`) validates against `validTransitions`
  (`order_service.go:524-530`):

  ```
  pending   → confirmed | cancelled
  confirmed → preparing | cancelled
  preparing → ready     | cancelled
  ready     → delivered
  delivered → paid
  ```

  `paid` and `cancelled` are terminal. An invalid transition returns
  `409 INVALID_STATUS_TRANSITION` (`order_service.go:544`).
- On success it writes via sqlc `UpdateOrderStatus`
  (`UPDATE orders SET status=?, updated_at=NOW() WHERE id=? AND deleted_at IS NULL`,
  `orders.sql.go:434-443`) then **publishes**: `order_status_changed` to `order:<id>` (SSE),
  `orders:kds` (WS), plus a monitor broadcast to `queue:broadcast` / `tables:broadcast`
  (`order_service.go:552-553`). No total recalc on a status change.
- ⚠ The FE shows a **Huỷ** button on **`delivered`** orders (`TableList.tsx:378-385`) but
  `delivered → cancelled` is not a valid transition — that click 409s. See Flags.

### 6 · `POST /payments` (Zone D "Đã thanh toán 💰" → cash)

- FE `createPayment` sends `{ order_id, method:'cash', amount }` (`TableList.tsx:289-293`).
- Handler `Create` (`payment_handler.go:29`) binds `createPaymentReq` =
  `{ order_id (required), method (required, oneof=vnpay momo zalopay cash) }`. **`amount` is not
  in the DTO and is ignored** — see Flags. Responds `201 { id, pay_url, qr_code_url }`.
- Service `CreatePayment` (`payment_service.go:63`): validates order state via
  `GetOrderForPayment` (status must be `ready` **or** `delivered`, `order_service.go:42-50`);
  idempotency guard via `GetPaymentByOrderID`; inserts a `pending` payment row with
  `Amount = order.TotalAmount` (`payment_service.go:89`). For `method=cash` it calls
  `completePayment` synchronously (`payment_service.go:99`): sets payment `completed` + `paid_at`,
  then `MarkOrderPaid` → `UpdateOrderStatus(paid)` (requires order `delivered`,
  `order_service.go:75-86`), then publishes `{"type":"payment_success","order_id":…}` to
  `orders:kds` (`payment_service.go:270-271`).
- After success the FE drops the order from `['orders','live']` and invalidates
  `['orders','history']` so Zone E refreshes (`page.tsx:370-374`).
- VNPay / MoMo / ZaloPay use the same `Create` entry but return a redirect URL and complete later
  via public webhooks (`main.go:260-262`) — not used by this cash-only page.

### 7 · `GET /sse/admin` (new-order doorbell)

- `sse.StreamAdmin(rdb)` (`admin_handler.go:15`) sets SSE headers, emits an initial
  `event: connected` frame, subscribes to Redis `orders:admin`, and relays each message as
  `event: <type>\ndata: <payload>`; 15 s `: keep-alive` heartbeat (`admin_handler.go:26-49`).
- Only `new_order` flows on this channel, published by `publishAdminOrderEvent`
  (`order_service.go:821-829`) from `CreateOrder` (`order_service.go:349`). Payload:
  `{ type:"new_order", order_id, order_number, table_id }` (`order_service.go:788-795`).
- FE `useAdminSSE` listens only for the `new_order` event name (`useAdminSSE.ts:40`).

### 8 · `GET /ws/orders-live?token=` (live cache mutations)

- `ws.LiveHandler` shares `wsHandler` (`websocket/handler.go:17-88`): auth via `?token=` +
  `ParseToken`, then each client gets its **own** Redis subscription to `orders:kds`
  (`handler.go:18,23,70-81`). Both `/ws/kds` and `/ws/orders-live` consume the same channel.
- Provided once per browser by `OrdersWSContext` and consumed by `useOverviewWS`, which mutates
  the `['orders','live']` TanStack cache per message type (`useOverviewWS.ts:19-71`).
- Messages published to `orders:kds` (`publishOrderEvent` → `order_service.go:818`):
  `new_order` (`:348`), `order_status_changed` (`:552`, `:745`), `order_cancelled` (`:593`),
  `items_added` (`:516`), `item_cancelled` (`:642`), `item_updated` (`:696`), plus
  `item_progress` (`itemEvent`, `:1009`) and `payment_success`
  (`payment_service.go:271`). Shapes: `orderEvent` `{ type, order_id, status?, order_number?,
  table_id? }` (`order_service.go:789-795`); `itemEvent` `{ type, order_id, item_id, qty_served,
  quantity, item_status }` (`order_service.go:797-804`).

---

## Caching & Invalidation

- **No Redis read/write cache anywhere on this page.** Every read endpoint (tables, orders/live,
  orders/history, orders/:id) hits MySQL directly; Redis is used **only** as a pub/sub bus for the
  SSE and WS channels (`orders:admin`, `orders:kds`, `order:<id>`, `queue:broadcast`,
  `tables:broadcast`).
- Staleness is purely a FE concern via TanStack `staleTime`: tables 60 s (`page.tsx:127`),
  orders/live 15 s (`page.tsx:133`), orders/history 30 s (`PaidLog.tsx:22`). The WS channel makes
  the live board effectively realtime regardless of `staleTime`.
- Writes invalidate **client cache**, not server cache: a paid order is removed from
  `['orders','live']` and `['orders','history']` is invalidated (`page.tsx:370-374`); status
  changes are applied optimistically and reconciled by the WS push.

---

## Error Behaviour

- Bind failures → `400 INVALID_INPUT` via `respondError()`
  (pattern → [../../../02_spec/ERROR_SPEC.md](../../../02_spec/ERROR_SPEC.md)).
- Invalid status transition → `409 INVALID_STATUS_TRANSITION` (`order_service.go:544`). The FE
  `handleAction` catch shows a toast "Không thể cập nhật trạng thái. Vui lòng thử lại."
  (`page.tsx:184-185`) — it does **not** distinguish a 409 from a network error.
- Payment on a non-`ready`/`delivered` order → `ErrOrderNotReady`; a duplicate →
  `ErrPaymentAlreadyExists` (`payment_service.go:65,71-75`). FE shows
  "Thanh toán thất bại. Vui lòng thử lại." (`TableList.tsx:297`).
- `GET /orders/:id` failures inside the SSE/WS handlers are swallowed (`catch { /* skip */ }`,
  `page.tsx:152`, `useOverviewWS.ts:30`) — a missed popup, never a thrown error.
- SSE reconnects with capped exponential backoff up to 10 attempts (`useAdminSSE.ts:28,50-53`);
  WS disconnect surfaces `ConnectionErrorBanner` when `useOverviewWS()` returns `false`
  (`page.tsx:249`).

---

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **Zone B feed is `GET /orders/live`, not `GET /orders`** | The handler/service pair is `ListLive` → `SearchActiveOrders` (`order_handler.go:140`). A twin route `GET /orders` (`main.go:233`, `AtLeast("chef")`) maps to the same handler, but the FE calls `/orders/live` (`admin.api.ts:172`). The FE sibling [admin_overview.md](admin_overview.md) Zones table labels Zone B's source `GET /orders` — corrected here. |
| 2 | **`delivered → cancelled` is impossible, but the UI offers it** | `validTransitions` has no `delivered → cancelled` (`order_service.go:524-530`), yet `TableList` renders a **Huỷ** button on `delivered` orders (`TableList.tsx:378-385`) that PATCHes `cancelled` → guaranteed `409`. The generic catch toast hides the real cause. A delivered order can only go to `paid`. |
| 3 | **`POST /payments` ignores the FE `amount`** | The DTO is `{ order_id, method }` only (`payment_handler.go:23-26`); the amount is taken server-side from `order.total_amount` (`payment_service.go:89`). The `amount` the FE sends (`TableList.tsx:291`) is dead weight — harmless but misleading. |
| 4 | **WS handles two event types the BE never emits** | `useOverviewWS` switches on `order_updated` and `order_completed` (`useOverviewWS.ts:51-52,67`), but the BE publishes neither string — status changes arrive as `order_status_changed` and completion as `order_cancelled`/`payment_success`. Those two FE branches are dead on this branch. ❓ Whether they are legacy names is UNVERIFIED. |
| 5 | **WS `/ws/orders-live` has no role gate** | The route group carries no `authMW` (`main.go:337`); the handler only requires a parseable JWT (`websocket/handler.go:31-47`). Any authenticated user — including a `customer`-role guest token — can open the live floor feed. SSE `/sse/admin` is correctly `AtLeast("manager")`; the WS is not. |
| 6 | **`orders/history` returns no items** | `ListTodayHistory` never fetches `order_items` (`order_service.go:174-190`), so paid/cancelled orders arrive with `items: []`. PaidLog/CancelLog don't need them, but don't reuse this payload for an item-level view. |
| 7 | **`q` search param on `/orders/live` is unused here** | `ListLive` supports server-side `q` filtering (`order_handler.go:141`), but this page passes none and filters client-side (`page.tsx:203-216`). The BE filter path is exercised only if a caller adds `?q=`. |
