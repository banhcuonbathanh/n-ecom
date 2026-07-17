# Cashier Payment — `/cashier/payment/:id` · Backend View

> **TL;DR:** every BE endpoint the cashier-payment page calls, traced handler → service →
> repository → SQL, with auth, caching, errors and flags. Traced from source on branch
> `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/payment_handler.go` ·
> `be/internal/service/payment_service.go` · `be/internal/handler/order_handler.go` ·
> `be/internal/service/order_service.go` · `be/internal/websocket/handler.go`.
>
> FE view + zones → [staff_cashier_payment.md](staff_cashier_payment.md) ·
> Order object shape → [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) ·
> Payment rules → [../../02_spec/BUSINESS_RULES.md §4](../../02_spec/BUSINESS_RULES.md#4-payment-rules) ·
> **Code bugs found this run → [PAYMENT_BUGS.md](PAYMENT_BUGS.md) (3 bugs — payment is broken from this screen for every method).**

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `GET /orders/:id` | authMW (no role gate); customer-only ownership guard | `orderH.Get` | `GetOrder` | `GetOrderByID` + `GetOrderItemsByOrderID` | — (no read cache) |
| 2 | `POST /payments` | authMW + `AtLeast("cashier")` | `paymentH.Create` | `CreatePayment` | `GetOrderForPayment` + `GetPaymentByOrderID` + `CreatePayment` (+ `UpdatePaymentStatus` for cash) | — (publishes only) |
| 3 | `PATCH /payments/:id/proof` | — | **NONE — route does not exist** | — | — | — |
| 4 | WS `GET /ws/orders-live?token=` | `?token=` parsed in handler; **no `authMW`, no role gate** | `ws.LiveHandler` | — | — | subscribes `orders:kds` (read-only fan-out) |

Route registration: orders group `be/cmd/server/main.go:230-246` (`orderR.Use(authMW)`,
`orderR.GET("/:id", orderH.Get)` `:236`); payments group `:254-257`
(`payR.Use(authMW, middleware.AtLeast("cashier"))`, `payR.POST("", paymentH.Create)` `:256`);
WS group `:337-339` (`wsR.GET("/orders-live", ws.LiveHandler(hub, rdb))` `:339`). All under `/api/v1`.

**Endpoint 3 has no route.** The only `/payments` routes are `POST ""`, `GET "/:id"`, and the three
public webhooks (`main.go:254-262`). There is no `proof` handler, service, query, or DB column
anywhere in `be/` (grep `proof` → 0 non-test hits) → `PATCH /payments/:id/proof` returns Gin's
default `404` (plain text, not the JSON error contract). See [PAYMENT_BUGS.md](PAYMENT_BUGS.md) Bug 3.

## Auth Model on This Page

- The page is FE-guarded by `AuthGuard` + `RoleGuard minRole=CASHIER` (`page.tsx:39-43`).
- **`GET /orders/:id`** — `authMW` only, no role gate (`main.go:236`). The service applies a
  **customer-only** ownership guard (`order_service.go:116-120`): a `customer`/guest token may read
  only its own table's order; a **cashier staff token bypasses it and reads any order**
  (`order_handler.go:128-131` sets `callerID`=`claims.Subject` for staff). Correct for the cashier.
- **`POST /payments`** — `authMW` + `AtLeast("cashier")` (`main.go:255`). Cashier, manager, admin
  pass; chef/customer 403.
- **WS `/ws/orders-live`** — carries **no `authMW` and no role gate**; auth is the `?token=` query
  param parsed inside `wsHandler` (`websocket/handler.go:31-47`), and the parsed claims are
  **discarded** — any valid JWT (incl. a customer guest token) can subscribe. Shared cross-page gap
  (see Flags + Cross-Page Concerns).

## Per-Endpoint Detail

### 1 · `GET /orders/:id` (receipt data)

- Handler `orderH.Get` (`order_handler.go:125-137`): reads `claims` from context; for staff,
  `callerID=claims.Subject`, `callerRole=claims.Role` (`:126-131`) → `svc.GetOrder` → `orderJSON(o)`.
- Service `GetOrder` (`order_service.go:106-...`): `GetOrderByID` (`sql.ErrNoRows`→`ErrNotFound`),
  ownership guard skipped for staff, then `GetOrderItemsByOrderID` enriched with derived item status.
- **No Redis** — every receipt fetch hits MySQL. FE caches it client-side under TanStack
  `queryKey:['order', orderId]` (`page.tsx:56-60`).
- FE reads `order.order_number`, `order.table_id`, `order.customer_name`, `order.items[]`
  (`quantity`/`name`/`unit_price`), `order.total_amount` (`page.tsx:160,180,192-202`).

### 2 · `POST /payments` (create payment)

- Handler `paymentH.Create` (`payment_handler.go:29-49`): binds `createPaymentReq`
  (`order_id` required; **`method binding:"required,oneof=vnpay momo zalopay cash"`** `:25`) → bind
  failure → `400 INVALID_INPUT`. Calls `svc.CreatePayment`.
- **Response is thin: `{data:{id, pay_url, qr_code_url}}`** (`payment_handler.go:44-48`) — **no
  `status`, no `amount`, no `method`.** The FE consumes it as a full `Payment` (`status`/`amount`/
  `method`) — central bug, see [PAYMENT_BUGS.md](PAYMENT_BUGS.md) Bug 2.
- Service `CreatePayment` (`payment_service.go:63-139`):
  1. `orderReader.GetOrderForPayment` (`order_service.go:42-59`) — **order must be `ready` or
     `delivered`**, else `ErrOrderNotReady` (409 `ORDER_NOT_READY`). Returns `TotalAmount` (server-trusted).
  2. Idempotency: `GetPaymentByOrderID`; if a payment exists and is not `failed` →
     `ErrPaymentAlreadyExists` (409 `PAYMENT_ALREADY_EXISTS`) (`:71-75`).
  3. `repo.CreatePayment` — `amount = order.TotalAmount` (client never sends amount); gateways get a
     15-min `expires_at`, cash gets none (`:80-93`).
  4. **`cash`** → `completePayment` immediately (`:98-99`): sets `completed` + `paid_at`,
     `MarkOrderPaid`, publishes `payment_success`. **`vnpay`/`momo`/`zalopay`** → build gateway
     pay/QR URL into `result.PayURL`/`QRCodeURL` (`:101-135`); on gateway-create failure the URL is
     **silently left empty** (warn-logged, `:108-110,122,133`).
- ⚠️ The handler's `oneof` list is **`cash`**, but the FE sends **`cod`** (`page.tsx:14,52`) for the
  cash button → bind fails → 400. Cash payment is impossible from this screen
  ([PAYMENT_BUGS.md](PAYMENT_BUGS.md) Bug 1).

### 3 · `PATCH /payments/:id/proof` (proof upload) — **does not exist**

FE `uploadProof` mutation posts multipart `image` to `/payments/:id/proof` (`page.tsx:125-135`).
**No such route, handler, service, query, or `payments.proof*` column exists** → 404 →
`onError` → toast "Upload thất bại". (Also currently unreachable: the upload UI lives inside the
QR-pending block that never renders — Bug 2.) See [PAYMENT_BUGS.md](PAYMENT_BUGS.md) Bug 3.

### 4 · WS `/ws/orders-live?token=` (await payment_success)

- FE opens a raw `WebSocket` to `…/ws/orders-live?token=<accessToken>` with exponential backoff
  (`page.tsx:63-108`), **gated on `payment && payment.status === 'pending'`** (`:64`).
- `ws.LiveHandler` (`websocket/handler.go:22-24`) → `wsHandler(..., "orders:kds")`: validates the
  `?token=` JWT (`:40`, claims then discarded), upgrades, subscribes the **`orders:kds`** Redis
  channel and forwards every message (`:67-81`).
- The `payment_success` event is published to **`orders:kds`** by `completePayment`
  (`payment_service.go:270-271`): `{"type":"payment_success","order_id":<id>}`. FE matches
  `msg.type==='payment_success' && msg.order_id===orderId` → toast → `window.print()` → `/pos`
  (`page.tsx:88-92`). Wire shape matches FE `WsMsg {type, order_id}` (`page.tsx:25-28`).
- **But the WS never connects today** because the create response omits `status`, so the
  `status==='pending'` gate is never satisfied (Bug 2). For cash there is also no WS path at all —
  `completePayment` runs synchronously inside the POST and the success would need the (missing)
  response `status==='completed'` branch.

## Caching & Invalidation

- **No Redis read-cache on any endpoint this page uses.** `GET /orders/:id` always hits MySQL;
  `POST /payments` only **publishes** to Redis (the `orders:kds` channel on completion); the WS only
  **subscribes**.
- Client cache: TanStack `['order', orderId]` for the receipt (`page.tsx:56-60`); `payment` and
  `method` are component `useState` (`page.tsx:52-53`), wiped on navigation.
- `payment_success` is published to `orders:kds` — the **same channel KDS, POS, and the admin live
  floor consume** (`LiveHandler`/`KDSHandler` both subscribe `orders:kds`, `handler.go:18,23`). Those
  pages receive `payment_success` events and ignore them.

## Error Behaviour

- `POST /payments` bind failure → `400 INVALID_INPUT` (`payment_handler.go:31-34`). The FE's `cod`
  method triggers exactly this (Bug 1) → toast "Không thể tạo thanh toán".
- Service AppErrors map by their own status via `handleServiceError`: `ErrOrderNotReady` → **409
  `ORDER_NOT_READY`** (`errors.go:31`), `ErrPaymentAlreadyExists` → **409 `PAYMENT_ALREADY_EXISTS`**
  (`errors.go:33`), `ErrNotFound` → 404. FE has no specific branch for these — all collapse to the
  generic "Không thể tạo thanh toán" toast (`page.tsx:122`).
- `GET /orders/:id` 404 → FE stays on the "Đang tải..." spinner (the query errors but the render
  guard is `isLoading || !order`, `page.tsx:137`).
- `PATCH …/proof` 404 → toast "Upload thất bại" (Bug 3).

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **`POST /payments` response omits `status`/`amount`/`method`** | Returns only `{id, pay_url, qr_code_url}` (`payment_handler.go:44-48`); FE consumes a full `Payment`. Root of [PAYMENT_BUGS.md](PAYMENT_BUGS.md) Bug 2 — QR block + WS listener never activate. |
| 2 | **FE `cod` vs BE `cash`** | `oneof=...cash` (`payment_handler.go:25`) rejects the FE's `cod` (`page.tsx:14`) → cash always 400s. [PAYMENT_BUGS.md](PAYMENT_BUGS.md) Bug 1. |
| 3 | **`PATCH /payments/:id/proof` route absent** | No handler/service/column in `be/`; FE upload 404s. [PAYMENT_BUGS.md](PAYMENT_BUGS.md) Bug 3. |
| 4 | **`payment_success` published to `orders:kds`, not a payment-specific channel** | `payment_service.go:271`. Every `/ws/orders-live` + `/ws/kds` client (KDS, POS, admin floor) receives it; only this page acts on it. A channel/shape change breaks A1/S3/S4 too — see Cross-Page Concerns. |
| 5 | **WS `/ws/orders-live` has no role gate** | `?token=` validated then discarded (`websocket/handler.go:31-47`); any JWT incl. a customer guest can subscribe. Shared gap with A1/S3/S4. |
| 6 | **`completePayment` for a `ready` (not yet `delivered`) order leaves order status unchanged** | Payment is gated to `ready` OR `delivered` (`order_service.go:50`), but `MarkOrderPaid` only advances `delivered → paid` (`:83-86`) — for a `ready` order it returns an error that `completePayment` **swallows** (warn-logged, `payment_service.go:265-267`). The payment row is `completed` but the order stays `ready` → status drift. |
| 7 | **`GET /payments/:id` (cashier+) exists but this page never calls it** | `main.go:257`. It returns the full `db.Payment` (incl. `status`/`amount`/`method`) — the natural data source to fix Bug 2 (re-fetch after create). |
| 8 | **Gateway pay/QR URL can be silently empty** | If `WEBHOOK_BASE_URL`/gateway creds are unset or the gateway call fails, `PayURL`/`QRCodeURL` stay `""` (`payment_service.go:108-110,122,133`); the FE `<img src="">` would render broken — independent of Bug 2. |
