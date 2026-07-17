# Customer Order List — `/order` · Backend View

> **TL;DR:** the order-history **list page itself makes zero BE calls** — it reads every card from
> the localStorage order cache (`STORAGE_KEYS.ORDER_CACHE`). The backend surface appears **only via
> the `OrderDetailSheet` overlay** that opens when a card is tapped: a REST snapshot + an SSE live
> stream, plus two cancel writes. Traced from source on branch `experience_claude.md_system_1`
> (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/order_handler.go` ·
> `be/internal/service/order_service.go` · `be/internal/sse/handler.go`.
>
> FE view + zones → [customer_order_list.md](customer_order_list.md) ·
> Order object shape (all layers) → [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) ·
> The standalone twin page `/order/:id` reuses the **same** overlay + endpoints →
> [../customer_order_detail/customer_order_detail.md](../customer_order_detail/customer_order_detail.md) ·
> Cross-page cache hub → [customer_order_list_crosspage_dataflow.md](customer_order_list_crosspage_dataflow.md) ·
> Loading behaviour → [customer_order_list_loading.md](customer_order_list_loading.md) ·
> Live code bugs found this run → [TRACKING_BUGS.md](TRACKING_BUGS.md)

---

## Endpoints Used by This Page

All four are reached **only through the `OrderDetailSheet` overlay** (`fe/src/features/order/components/OrderDetailSheet.tsx`)
and its `useOrderSSE` hook (`fe/src/hooks/useOrderSSE.ts`). The list grid (`order/page.tsx`) calls none.

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `GET /orders/:id` | authMW | `orderH.Get` (`order_handler.go:125`) | `GetOrder` (`order_service.go:106`) | `GetOrderByID` + `GetOrderItemsByOrderID` + `GetTableByID` | — |
| 2 | `GET /orders/:id/events` (SSE) | authMW | `sse.StreamOrder` (`sse/handler.go:21`) | — (relays Redis pub/sub) | — | Redis pub/sub channel `order:<id>` |
| 3 | `DELETE /orders/:id` (cancel order) | authMW | `orderH.Cancel` (`order_handler.go:186`) | `CancelOrder` (`order_service.go:558`) | `SumQtyServedAndQuantity` + `SoftDeleteOrder` | publishes to `order:<id>` + `orders:kds` |
| 4 | `DELETE /orders/items/:id` (cancel item) | authMW | `orderH.CancelItem` (`order_handler.go:200`) | `CancelOrderItem` (`order_service.go:598`) | `DeleteOrderItem` + `RecalculateTotalAmount` | publishes to `order:<id>` + `orders:kds` |

Route registration: `be/cmd/server/main.go:230-239` (the `orderR := v1.Group("/orders")` group with
`orderR.Use(authMW)` at `:231`) and `:251` (`v1.DELETE("/orders/items/:id", authMW, orderH.CancelItem)`).
All under `/api/v1`.

---

## Auth Model on This Page

- **The list page needs no token at all** — it is a pure localStorage read (`order/page.tsx:10-24`).
  A customer who has never authenticated still sees an (empty) list.
- **Every overlay endpoint is behind `authMW`** — the `/orders` group applies `authMW` to all routes
  (`main.go:231`), and `DELETE /orders/items/:id` carries `authMW` directly (`main.go:251`). The
  **guest JWT** minted by `/table/:tableId` (`sub` is the literal `"guest"`, `role="customer"`,
  carries `table_id`) satisfies all four.
- **Ownership is by table, not by user.** For `role == "customer"`, the handlers swap `callerID` to
  `claims.TableID` (`order_handler.go:128-130` Get · `:189-191` Cancel · `:203-205` CancelItem) and
  the service rejects with `ErrForbidden` (403) when the order's `table_id` ≠ the caller's
  (`order_service.go:116-120`, `:568-572`, `:616-620`). A guest can therefore only read/cancel
  orders placed at their own table.
- **SSE auth** is validated by `authMW` *before* `StreamOrder` runs (the handler comment notes this,
  `sse/handler.go:20`); the FE passes the token as an `Authorization: Bearer` header, not a query
  param (`useOrderSSE.ts:71`). The SSE handler itself does **no ownership check** — see Flags.

---

## Per-Endpoint Detail

### 1 · `GET /orders/:id` (snapshot — seeds the sheet)

- `useOrderSSE` fetches this once on open to seed state before listening for SSE deltas
  (`useOrderSSE.ts:54-62`): `const { data } = await api.get('/orders/'+orderId)` → `setOrder(data.data)`.
- Service `GetOrder` (`order_service.go:106-143`): `GetOrderByID` → 404 `ErrNotFound` on `sql.ErrNoRows`;
  customer ownership gate; `GetOrderItemsByOrderID`; each item enriched with a **derived** `ItemStatus`
  via `itemStatus(qty_served, quantity)` (no status column — see
  [../../02_spec/BUSINESS_RULES.md §2.4](../../02_spec/BUSINESS_RULES.md#24-item-status-derived--no-column));
  optional `GetTableByID` for `table_name` (soft-fails to `""`).
- Serialized by `orderJSON(o)` (`order_handler.go:136`) under `{ "data": … }`. Field shape →
  [OBJECT_MODEL_ORDER §2.7](../../02_spec/object/OBJECT_MODEL_ORDER.md).
- **No Redis caching** — straight MySQL read every call.

### 2 · `GET /orders/:id/events` (SSE — live patches)

- After the snapshot, `useOrderSSE` opens the stream with `fetchEventSource(.../orders/${id}/events)`
  (`useOrderSSE.ts:69-130`) and reconnects with exponential backoff (max 5 attempts, banner after 3).
- `StreamOrder` (`sse/handler.go:21-70`) subscribes to Redis channel `order:<id>`, sends an initial
  `event: connected`, relays every pub/sub payload verbatim with its `type` as the SSE event name
  (`extractEventType`, `sse/group_handler.go:87`), and emits a `: keep-alive` comment every 15 s
  (`heartbeatInterval`, `sse/handler.go:14`).
- FE-handled event names (`useOrderSSE.ts:83-123`): `order_init`, `order_status_changed`,
  `order_cancelled`, `item_progress`, `order_completed`. The producer side emits these from
  `publishOrderEvent` (`order_service.go:806-819`), which fans the same payload to both `order:<id>`
  **and** `orders:kds`.

### 3 · `DELETE /orders/:id` (cancel whole order)

- Fired from the sheet's "Huỷ toàn bộ đơn hàng" button, gated FE-side by `canCancelOrder = progress < 30 && isActive`
  (`OrderDetailSheet.tsx:135`); mutation at `:59-63`. Returns `204 No Content`.
- Service `CancelOrder` (`order_service.go:558-595`): ownership gate; status must be
  `pending|confirmed|preparing` else `ErrCancelThreshold` (422); **server-side 30 % rule** —
  `SumQtyServedAndQuantity`, reject if `served/total ≥ 0.30` (`:582-588`); then `SoftDeleteOrder`
  and `publishOrderEvent("order_cancelled", …)`. Rule home →
  [../../07_business_logic/LOGIC_BE.md](../../07_business_logic/LOGIC_BE.md) ·
  [../../02_spec/BUSINESS_RULES.md](../../02_spec/BUSINESS_RULES.md).

### 4 · `DELETE /orders/items/:id` (cancel one item — and "cancel remaining")

- One mutation cancels a single item (`OrderDetailSheet.tsx:64-68`); a second batches it with
  `Promise.all(ids.map(id => api.delete('/orders/items/'+id)))` for "huỷ N món còn lại của combo"
  (`:69-73`). Each call returns `204`.
- Service `CancelOrderItem` (`order_service.go:598-644`): loads item → its order; ownership gate;
  order must be in an active state; **rejects an already-served item** (`qty_served >= quantity` →
  `ErrCancelThreshold`, `:630-632`); `DeleteOrderItem` then `RecalculateTotalAmount` to fix the
  denormalized `orders.total_amount`; `publishOrderEvent("item_cancelled", …)`.

---

## Caching & Invalidation

- **No Redis read-cache** on any of these endpoints — orders are always read live from MySQL
  (unlike the menu catalog GETs). Staleness on this page comes only from the **localStorage** order
  cache (`order_cache_<id>`), which `useOrderSSE` re-writes on every state change
  (`useOrderSSE.ts:41-46`).
- Redis is used here purely as a **pub/sub fan-out**, not a cache: writes publish to `order:<id>`
  (the per-order SSE channel) and `orders:kds` (the kitchen board) via `publishOrderEvent`
  (`order_service.go:814-818`). Publish failures are logged and swallowed — the write still succeeds.

---

## Error Behaviour

- `GET /orders/:id` → `404 NOT_FOUND` when the id is unknown/soft-deleted (`ErrNotFound`,
  `errors.go:28`); `403 FORBIDDEN` when a guest reads another table's order (`ErrForbidden`,
  `errors.go:29`). `useOrderSSE` special-cases the 404 (`setIsNotFound(true)`, `useOrderSSE.ts:60`)
  but **the sheet never reads `isNotFound`** — see Flags.
- Cancel endpoints → `422 CANCEL_THRESHOLD` ("Không thể huỷ khi đã phục vụ từ 30% trở lên",
  `errors.go:32`) when past the 30 % rule or the item is already served; `403`/`404` as above. All
  mapped by `handleServiceError`. FE surfaces them as a `sonner` toast
  (`OrderDetailSheet.tsx:62,67,72`).
- SSE: a non-2xx `onopen` throws → backoff reconnect; after 3 failed attempts the
  `ConnectionErrorBanner` shows (`useOrderSSE.ts:134` → `OrderDetailSheet.tsx:202`).

---

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **The list page calls no BE — it trusts the localStorage cache** | `order/page.tsx` renders `total_amount`, `status`, `qty_served` straight from cached JSON. If an order changed on another device since it was last cached, the **card is stale until its detail sheet is opened** (the sheet's `GET /orders/:id` + SSE refresh it). The card grid has no fetch/refresh of its own. |
| 2 | **`item_cancelled` SSE event is not handled FE-side** | `publishOrderEvent` emits `type:"item_cancelled"` on `DELETE /orders/items/:id` (`order_service.go:642`), but `useOrderSSE`'s switch has **no `item_cancelled` case** (`useOrderSSE.ts:83-123`). A cancelled item is not removed live; the sheet relies on the local mutation's toast and only reconciles on the next snapshot/reload. |
| 3 | **A 404 leaves the sheet on the spinner forever** | `useOrderSSE` returns `isNotFound`, but `OrderDetailSheet` destructures only `{ order, progress, connectionError, notification, clearNotification }` (`OrderDetailSheet.tsx:45`) — not `isNotFound`. Opening a card for a deleted/foreign order shows "Đang tải đơn hàng..." indefinitely (`OrderDetailSheet.tsx:206-212`). |
| 4 | **SSE handler does no ownership check** | `StreamOrder` only requires a valid token via `authMW`; it never verifies the order's `table_id` matches the caller (`sse/handler.go:21-70`). Any authenticated client that knows an order id can subscribe to its live channel. The REST `GET`/`DELETE` paths *do* enforce ownership. |
| 5 | **Shared endpoints with `/order/:id`** | All four endpoints + the `OrderDetailSheet`/`useOrderSSE` pair are identical to the standalone detail page `customer_order_detail` (C10). Trace once, applies to both — see Cross-Page Concerns in [BE_DOC_TRACKER.md](../../BE_DOC_TRACKER.md). |
