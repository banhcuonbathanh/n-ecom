# Customer Order Detail — `/order/:id` · Backend View

> **TL;DR:** the standalone live-order page. It calls the **same 4 endpoints** as the `/order` list's
> `OrderDetailSheet` overlay (C9) — REST snapshot + SSE stream + 2 cancel writes — **plus a 5th the
> overlay never calls: `PATCH /orders/items/:id/quantity`** (the per-dish QuantityStepper). Unlike
> C9, the page is its own `order/[id]/page.tsx` driven directly by `useOrderSSE(params.id)` (no
> overlay). Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/order_handler.go` ·
> `be/internal/service/order_service.go` · `be/internal/sse/handler.go` ·
> `fe/src/app/(shop)/order/[id]/page.tsx` · `fe/src/hooks/useOrderSSE.ts` · `fe/src/lib/api-client.ts`.
>
> FE view + zones → [customer_order_detail.md](customer_order_detail.md) ·
> Order object shape (all layers) → [../../../02_spec/object/OBJECT_MODEL_ORDER.md](../../../02_spec/object/OBJECT_MODEL_ORDER.md) ·
> The list twin `/order` that shares the first 4 endpoints → [../customer_order_list/customer_order_list_be.md](../customer_order_list/customer_order_list_be.md) ·
> Cross-page data hub → [customer_order_detail_crosspage_dataflow.md](customer_order_detail_crosspage_dataflow.md) ·
> Loading behaviour → [customer_order_detail_loading.md](customer_order_detail_loading.md) ·
> **Live code bugs found this run → [ORDER_DETAIL_BUGS.md](ORDER_DETAIL_BUGS.md)**

---

## Endpoints Used by This Page

All five are reached directly from the standalone page — `useOrderSSE(params.id)` opens #1 + #2;
the cancel buttons fire #3 + #4; the per-dish QuantityStepper fires #5 (via
`patchOrderItemQty`, `api-client.ts:72-73`).

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `GET /orders/:id` | authMW | `orderH.Get` (`order_handler.go:125`) | `GetOrder` (`order_service.go:106`) | `GetOrderByID` + `GetOrderItemsByOrderID` + `GetTableByID` | — |
| 2 | `GET /orders/:id/events` (SSE) | authMW | `sse.StreamOrder` (`sse/handler.go:21`) | — (relays Redis pub/sub) | — | Redis pub/sub channel `order:<id>` |
| 3 | `DELETE /orders/:id` (cancel order) | authMW | `orderH.Cancel` (`order_handler.go:186`) | `CancelOrder` (`order_service.go:558`) | `SumQtyServedAndQuantity` + `SoftDeleteOrder` | publishes `order:<id>` + `orders:kds` |
| 4 | `DELETE /orders/items/:id` (cancel item / "cancel remaining") | authMW | `orderH.CancelItem` (`order_handler.go:200`) | `CancelOrderItem` (`order_service.go:598`) | `DeleteOrderItem` + `RecalculateTotalAmount` | publishes `order:<id>` + `orders:kds` |
| 5 | `PATCH /orders/items/:id/quantity` (stepper) | authMW | `orderH.UpdateItemQuantity` (`order_handler.go:218`) | `UpdateOrderItemQuantity` (`order_service.go:648`) | `UpdateItemQuantity` + `RecalculateTotalAmount` | publishes `order:<id>` + `orders:kds` |

Route registration: `be/cmd/server/main.go:230-251` — the `orderR := v1.Group("/orders")` group with
`orderR.Use(authMW)` at `:231` covers #1 (`:236`), #2 (`:239`), #3 (`:238`); #4 is
`v1.DELETE("/orders/items/:id", authMW, orderH.CancelItem)` at `:251`; #5 is
`v1.PATCH("/orders/items/:id/quantity", authMW, orderH.UpdateItemQuantity)` at `:249`. All under `/api/v1`.

> **Endpoint-set diff vs C9 `/order`:** the list page's `OrderDetailSheet` calls only #1–#4
> ([customer_order_list_be.md](../customer_order_list/customer_order_list_be.md)). #5 is **unique to
> this standalone page** — the overlay has no quantity stepper. Trace once for #1–#4 (covered by the
> C9 doc, same branch); this file owns #5.

---

## Auth Model on This Page

- **Every endpoint is behind `authMW`** — the `/orders` group applies it to all routes
  (`main.go:231`); #4 and #5 carry `authMW` directly (`main.go:249,251`). **No role gate on any of the
  five** — a **guest JWT** (minted by `/table/:tableId`: `sub="guest"`, `role="customer"`, carries
  `table_id`) satisfies all five.
- **Ownership is by table, not by user.** For `role == "customer"` every write/read handler swaps
  `callerID` to `claims.TableID` (`order_handler.go:128-130` Get · `:189-191` Cancel · `:203-205`
  CancelItem · `:225-228` UpdateItemQuantity); the service rejects with `ErrForbidden` (403) when the
  order's `table_id` ≠ the caller's (`order_service.go:116-120` Get, `:568-572` Cancel, `:616-620`
  CancelItem, `:670-674` UpdateItemQuantity). A guest can only touch orders at their own table.
- **SSE auth** is validated by `authMW` *before* `StreamOrder` runs; the FE passes the token as an
  `Authorization: Bearer` header, not a query param (`useOrderSSE.ts:72`). The SSE handler itself does
  **no ownership check** — see Flags.

> **Sibling-route gotcha:** `PATCH /orders/items/:id` (no `/quantity`) is a **different** endpoint —
> `orderH.UpdateItemServed`, gated `AtLeast("chef")` (`main.go:250`) — used by KDS, **not** this page.
> This page calls only the `/quantity` variant, which is `authMW`-only.

---

## Per-Endpoint Detail

### 1 · `GET /orders/:id` (snapshot — seeds the page)

- `useOrderSSE` fetches this once on mount to seed state before listening for SSE deltas
  (`useOrderSSE.ts:54-62`): `const { data } = await api.get('/orders/'+orderId)` → `setOrder(data.data)`.
- Service `GetOrder` (`order_service.go:106-143`): `GetOrderByID` → 404 `ErrNotFound` on `sql.ErrNoRows`;
  customer ownership gate; `GetOrderItemsByOrderID`; each item enriched with a **derived** `item_status`
  via `itemStatus(qty_served, quantity)` (no status column — see
  [../../../02_spec/BUSINESS_RULES.md §2.4](../../../02_spec/BUSINESS_RULES.md#24-item-status-derived--no-column));
  optional `GetTableByID` for `table_name` (soft-fails to `""`).
- Serialized by `orderJSON(o)` under `{ "data": … }` (`order_handler.go:136`). Field shape →
  [OBJECT_MODEL_ORDER §2.7](../../../02_spec/object/OBJECT_MODEL_ORDER.md).
- **No Redis caching** — straight MySQL read every call. (Field reference: [API_SPEC.md `OrderJSON`](../../../02_spec/API_SPEC.md).)

### 2 · `GET /orders/:id/events` (SSE — live patches)

- After the snapshot, `useOrderSSE` opens the stream with `fetchEventSource(.../orders/${id}/events)`
  (`useOrderSSE.ts:69-130`) and reconnects with exponential backoff (max 5 attempts, banner after 3 —
  `RECONNECT`, `useOrderSSE.ts:16-21`).
- `StreamOrder` (`sse/handler.go:21-70`) subscribes to Redis channel `order:<id>`, sends an initial
  `event: connected` (`:50`), relays every pub/sub payload verbatim with its `type` as the SSE event
  name (`extractEventType`, `:61`), and emits a `: keep-alive` comment every 15 s (`heartbeatInterval`,
  `:14,65`). It does **no DB read** — only future deltas, never a status replay on (re)connect (shared
  C9/C10/C11 concern — see [BE_DOC_TRACKER Cross-Page Concerns](../../BE_DOC_TRACKER.md)).
- FE-handled event names (`useOrderSSE.ts:83-123`): `order_init`, `order_status_changed`,
  `order_cancelled`, `item_progress`, `order_completed`. The producer fans every order event to both
  `order:<id>` **and** `orders:kds` via `publishOrderEvent` (`order_service.go:806-819`). **Two emitted
  types are NOT in the FE switch** — `item_cancelled` (#4) and `item_updated` (#5) — see Flags + the
  BUGS file.

### 3 · `DELETE /orders/:id` (cancel whole order)

- Fired from the page's "Huỷ toàn bộ đơn hàng" button, gated FE-side by
  `canCancelOrder = progress < 30 && (status==='confirmed' || status==='preparing')` (`page.tsx:233`);
  mutation `cancelOrderMutation` = `api.delete('/orders/'+id)` (`page.tsx:63-67`). On success → toast +
  `router.push('/menu')`. Returns `204 No Content`.
- Service `CancelOrder` (`order_service.go:558-595`): ownership gate; status must be
  `pending|confirmed|preparing` else `ErrCancelThreshold` (422); **server-side 30 % rule** —
  `SumQtyServedAndQuantity`, reject if `served/total ≥ 0.30`; then `SoftDeleteOrder` and
  `publishOrderEvent("order_cancelled", …)`. Rule home →
  [../../../07_business_logic/LOGIC_BE.md](../../../07_business_logic/LOGIC_BE.md) ·
  [../../../02_spec/BUSINESS_RULES.md](../../../02_spec/BUSINESS_RULES.md). ⚠ The FE `< 30 %` gate is a
  DRIFT from the owner's "cancel any time before payment" target (2026-06-12) — both FE gate and BE
  rule still enforce 30 %.

### 4 · `DELETE /orders/items/:id` (cancel one item — and "cancel remaining")

- One mutation cancels a single item (`cancelItemMutation`, `page.tsx:68-72`); a second batches it with
  `Promise.all(ids.map(id => api.delete('/orders/items/'+id)))` for "huỷ N món còn lại của combo"
  (`cancelMultiMutation`, `page.tsx:73-77`). Each call returns `204`.
- Service `CancelOrderItem` (`order_service.go:598-644`): loads item → its order; ownership gate;
  order must be active (`pending|confirmed|preparing`); **rejects an already-served item**
  (`qty_served >= quantity` → `ErrCancelThreshold`, `:630-632`); `DeleteOrderItem` then
  `RecalculateTotalAmount` to fix the denormalized `orders.total_amount`;
  `publishOrderEvent("item_cancelled", …)` (`:642`).

### 5 · `PATCH /orders/items/:id/quantity` (per-dish QuantityStepper) — **unique to this page**

- The stepper shows only on not-yet-served items of an active order
  (`canStepper = isActive && item.qty_served === 0`, `page.tsx:695`). `onChange` →
  `updateQtyMutation.mutate({itemId, qty})` (`page.tsx:361,385`) → `patchOrderItemQty(itemId, qty)` =
  `api.patch('/orders/items/'+itemId+'/quantity', {quantity})` (`api-client.ts:72-73`).
- Handler `UpdateItemQuantity` (`order_handler.go:218-234`): binds `{quantity}` (`binding:"required,min=1"`,
  `:213-215`) → 400 `INVALID_INPUT` on bind failure; customer `callerID`→`TableID`; calls the service;
  returns `200 { "message": "Cập nhật số lượng thành công" }`.
- Service `UpdateOrderItemQuantity` (`order_service.go:648-698`): `qty < 1` → `ErrInvalidInput`;
  `GetOrderItemByID` → 404; `GetOrderByID` → 404; ownership gate; order must be active
  (`pending|confirmed|preparing` else `ErrCancelThreshold`, `:677-681`); **rejects once serving has
  started** (`qty_served > 0` → `ErrCancelThreshold`, `:684-686`); `UpdateItemQuantity`
  (`order_repo.go:242` → `orders.sql.go:423` `UpdateItemQuantity :exec`); `RecalculateTotalAmount`
  (`order_repo.go:246` → `orders.sql.go:364`); `publishOrderEvent("item_updated", …)` (`:696`).
- **No Redis read-cache.** ⚠ The `onSuccess` invalidation (`page.tsx:59`) and the emitted
  `item_updated` event both fail to refresh the page live — see Flags + [ORDER_DETAIL_BUGS.md](ORDER_DETAIL_BUGS.md).

---

## Caching & Invalidation

- **No Redis read-cache** on any of the five endpoints — orders are always read live from MySQL
  (unlike the menu catalog GETs). The only client-side staleness is the **localStorage** order cache
  (`order_cache_<id>`, `STORAGE_KEYS.ORDER_CACHE`), which `useOrderSSE` re-writes on every state change
  and reads on mount for instant paint (`useOrderSSE.ts:9,33-46`).
- Redis is purely **pub/sub fan-out**, not a cache: every write publishes to `order:<id>` (the per-order
  SSE channel) **and** `orders:kds` (the kitchen board) via `publishOrderEvent`
  (`order_service.go:814-818`). Publish failures are logged and swallowed — the DB write still succeeds.
- **TanStack Query is not the order's source here.** `updateQtyMutation.onSuccess` invalidates
  `['order', params.id]` (`page.tsx:59`), but the order lives in `useOrderSSE`'s `useState`, and **no
  `useQuery(['order', …])` exists anywhere** — so the invalidation is a no-op (BUGS file, Bug 1).

---

## Error Behaviour

- `GET /orders/:id` → `404 NOT_FOUND` (unknown/soft-deleted id) or `403 FORBIDDEN` (guest reads another
  table's order). `useOrderSSE` special-cases the 404 (`setIsNotFound(true)`, `:60`) and the page
  **renders a full-page "Không tìm thấy đơn hàng"** (`page.tsx:41,155-173`) — so the C9 "spinner forever"
  flag does **not** apply here (the standalone page reads `isNotFound`; the overlay didn't).
- Cancel + quantity endpoints → `422 CANCEL_THRESHOLD` ("Không thể huỷ khi đã phục vụ từ 30% trở lên")
  past the 30 % rule / already-served item (cancel) or once `qty_served > 0` (quantity);
  `403`/`404` as above; `400 INVALID_INPUT` on a bad `{quantity}` body. All mapped by
  `handleServiceError`. FE surfaces them as a `sonner` toast (`page.tsx:60,66,71,76`).
- SSE: a non-2xx `onopen` throws → backoff reconnect; after 3 failed attempts the
  `ConnectionErrorBanner` shows and the header pill flips to "MẤT KẾT NỐI" (`useOrderSSE.ts:134` →
  `page.tsx:282-295`).

---

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **`item_updated` not handled FE-side → quantity edits don't reflect live (CODE BUG)** | The stepper fires #5, BE publishes `type:"item_updated"` (`order_service.go:696`), but `useOrderSSE`'s switch has **no `item_updated` case** (`useOrderSSE.ts:83-123`); and the `onSuccess` `invalidateQueries(['order', params.id])` is a **no-op** (no such `useQuery` exists). The new qty + recalculated total only appear after a full reload. → [ORDER_DETAIL_BUGS.md](ORDER_DETAIL_BUGS.md) Bug 1. |
| 2 | **`item_cancelled` not handled FE-side (CODE BUG, shared with C9)** | `DELETE /orders/items/:id` emits `item_cancelled` (`order_service.go:642`) but `useOrderSSE` has no case for it — a cancelled item stays on screen until reload. Same root as C9 Flag 2. → [ORDER_DETAIL_BUGS.md](ORDER_DETAIL_BUGS.md) Bug 2. |
| 3 | **SSE handler does no ownership check (shared with C9)** | `StreamOrder` only requires a valid token via `authMW`; it never verifies the order's `table_id` matches the caller (`sse/handler.go:21-70`). Any authenticated client that knows an order id can subscribe to its live channel. The REST `GET`/`DELETE`/`PATCH` paths *do* enforce ownership. |
| 4 | **No status replay on (re)connect (shared C9/C10/C11)** | `StreamOrder` does no DB read — it relays only future deltas. A status change while a phone is disconnected is lost on the order channel; the badge is correct only because of the separate `GET /orders/:id` fetch on mount. Fix lives in the handler. See [BE_DOC_TRACKER Cross-Page Concerns](../../BE_DOC_TRACKER.md). |
| 5 | **Three emitted SSE-event names are dead-ends for `useOrderSSE`** | `publishOrderEvent` emits six types (`order_service.go:348,516,552,593,642,696,745`): `new_order`, `items_added`, `order_status_changed`, `order_cancelled`, `item_cancelled`, `item_updated`. `useOrderSSE`'s switch consumes `order_status_changed`/`order_cancelled`/`order_completed`/`item_progress` (+ a dead `order_init` case — **no code path ever publishes `order_init`**), but **ignores `item_updated` (#5), `item_cancelled` (#4), and `items_added`** (emitted when "Thêm món" appends items from `/menu` — `order_service.go:516`). The first two are this page's own writes → [ORDER_DETAIL_BUGS.md](ORDER_DETAIL_BUGS.md); `items_added` means a sibling device adding dishes won't update this page live either. Note `useOrderMonitorSSE.ts:85-86` (the `/tracking` hook) *does* handle `item_updated`+`item_cancelled`, so the gap is specific to the order-detail hook. |
| 6 | **FE Zone-table imprecision (doc, fixed)** | The page doc's Zones row listed the stepper endpoint as `PATCH /orders/items/:id`; the real route is `PATCH /orders/items/:id/quantity` (`main.go:249`). Corrected in `customer_order_detail.md` this run. |
