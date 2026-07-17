# Customer Checkout — `/checkout` · Backend View

> **TL;DR:** the **non-table / online** order-submit path. Exactly **2 endpoints**, both `authMW`:
> one write (`POST /orders`) and one read (`GET /orders/:id`, the post-create re-fetch). It is the
> twin of the QR `TableConfirmModal` path on `/menu` — same two endpoints, but checkout sends
> `customer_name` + `customer_phone` + `note` and defaults `source:'online'` when no table is bound.
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/order_handler.go` ·
> `be/internal/service/order_service.go` · `be/internal/service/errors.go`.
>
> FE view + zones → [customer_checkout.md](customer_checkout.md) ·
> Order write pipeline + DTO/DB mapping → [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) ·
> Twin (QR path) trace → [../customer_menu/customer_menu_be.md](../customer_menu/customer_menu_be.md) ·
> ⚠️ **Code bugs found this run** → [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md).

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `POST /orders` | authMW (guest JWT or staff) | `orderH.Create` (`order_handler.go:69`) | `CreateOrder` (`order_service.go:262`) | tx `CreateOrderWithItems` (insert order + item rows) | — (no read cache; pub/sub fan-out only) |
| 2 | `GET /orders/:id` | authMW | `orderH.Get` (`order_handler.go:125`) | `GetOrder` (`order_service.go:106`) | `GetOrderByID` + `GetOrderItemsByOrderID` + `GetTableByID` | — |

Route registration: `be/cmd/server/main.go:230-237` — the whole `/orders` group is gated by
`orderR.Use(authMW)`; `POST ""` and `GET /:id` carry **no extra role middleware** (any valid JWT,
including a guest token, passes). All under `/api/v1`.

This page calls **no catalog GETs** — the cart it submits was already built on `/menu`. There are
no writes other than `POST /orders` (no `POST /orders/:id/items`; checkout always creates a fresh
order).

---

## Auth Model on This Page

- Both endpoints sit under `orderR.Use(authMW)` (`main.go:231`) — a token is mandatory. The catalog
  was public, but **submitting requires a JWT**.
- **`created_by` rule** (`order_handler.go:88-92`): if `claims.Role == "customer"` the staff id is
  blanked → `created_by` stored NULL. A staff JWT (POS/cashier reuse) stores the staff subject.
- **Guest ownership is by table, not id** (`order_handler.go:126-130`): on `GET /orders/:id`,
  `callerID` for a customer is set to `claims.TableID` (the table the guest JWT was minted for), and
  `GetOrder` then enforces `o.TableID == callerID` (`order_service.go:116-120`).
  - ⚠️ **Consequence for the `online` branch:** an order created with `source:'online'` has
    `table_id = NULL`, so for a **customer-role** caller `!o.TableID.Valid` is true →
    `GetOrder` returns **`ErrForbidden` (403)**. The post-create re-fetch (endpoint 2) and the
    `/order/:id` page therefore 403 for a guest token on a table-less order. This is latent today
    (no wired customer-login / online entry yet — page is 🔮 PLANNED for online ordering) — see
    [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md) Bug 3. Staff JWTs bypass the check (`callerRole != "customer"`).

---

## Per-Endpoint Detail

### 1 · `POST /orders` (the submit)

FE sends (`checkout/page.tsx:49-58`): `customer_name`, `customer_phone`, `note` (or `null`),
`table_id: cart.tableId ?? null`, `source: cart.tableId ? 'qr' : 'online'`, and
`items: buildOrderItemsPayload(cart.items)` (the single shared cart→payload builder,
`fe/src/lib/order-payload.ts:27`). **`payment_method` is NOT in the body** — see Flags.

Handler `Create` (`order_handler.go:69-122`):
- Binds `createOrderReq` — `source` is `binding:"required,oneof=online qr pos"`, `items`
  `required,min=1` (`order_handler.go:59-66`). `customer_name`/`customer_phone`/`note` are
  **not** validated server-side (no `binding` tags) — the phone/name regex is FE-only
  (`page.tsx:16-17`).
- Per-item XOR guard: each item must have exactly one of `product_id` / `combo_id`
  (`order_handler.go:77-86`).
- Maps to `service.CreateOrderInput` and calls `svc.CreateOrder` (`order_handler.go:106-114`).
- On success returns **`201` `{data:{id, table_busy}}`** (`order_handler.go:121`).

Service `CreateOrder` (`order_service.go:262-353`):
- Re-asserts `len(items) >= 1` (`:265`).
- **One-active-order is informational only** (`:270-275`): if the table already has an active order
  it sets `tableBusy = true` but **still creates a parallel order** — it never returns an error.
- Builds rows: standalone products via `buildProductRow` (`:355`, snapshots `name` + `unit_price`
  server-side — client prices never trusted), combos via `expandCombo` (`:389`) into a **header row
  with `unit_price = 0`** plus sub-item rows carrying `combo_ref_id` (combo price lives on the
  sub-items so `recalculateTotalAmount`'s row-sum doesn't double-count — OC epic, `:398-412`).
- `source` string → enum (`:312-318`, default `OrdersSourceOnline`); `customer_name` /
  `customer_phone` / `note` / `created_by` wrapped via `nullStr` (`:305-310`, `:325-328`).
- Inserts inside `CreateOrderWithItems` with up to 3 retries on the `uq_orders_order_number`
  unique-violation (`:332-346`), then publishes `new_order` + admin event + monitor broadcast
  (`:348-350`).

> **`payment_method` has nowhere to land:** the `orders` table has **no `payment_method` column**
> ([../../02_spec/DB_SCHEMA.md](../../02_spec/DB_SCHEMA.md) line 138 — "`source` … ⚠️ NOT
> `payment_method`"). Payment method is captured later on the cashier payment screen (S5) as a
> `payments` row. See Flags + [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md) Bug 1.

### 2 · `GET /orders/:id` (post-submit re-fetch)

After a `201`, FE re-fetches the full order and caches it in localStorage under
`STORAGE_KEYS.ORDER_CACHE` + the order id (`order_cache_<id>`, `page.tsx:66-68`), then
`router.replace('/order/:id')` (`page.tsx:75`). On a re-fetch failure it falls back to caching the
minimal `{id, table_busy}` body (`page.tsx:69-71`).

Handler `Get` (`order_handler.go:125-137`) → service `GetOrder` (`order_service.go:106-143`):
- `GetOrderByID` (`:107`); `sql.ErrNoRows` → `ErrNotFound` (→ 404).
- **Table-ownership guard** for customers (`:116-120`) — see Auth Model above.
- Loads items (`GetOrderItemsByOrderID`, `:122`), derives each `item_status` from
  `qty_served` vs `quantity` (`itemStatus`, `:131`), resolves `table_name` via `GetTableByID`
  (`:135-140`).
- Serialized by `orderJSON` (`order_handler.go:318-389`) — full `OrderJSON` shape (key fields →
  [../../02_spec/API_SPEC.md](../../02_spec/API_SPEC.md) line 82; full DTO/DB mapping →
  [OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md)).

---

## Caching & Invalidation

- **No Redis read-cache on either endpoint.** `CreateOrder` writes straight to MySQL; `GetOrder`
  reads straight from MySQL. Redis here is pub/sub fan-out only (`new_order` to KDS/admin + monitor
  broadcast, `order_service.go:348-350`) — nothing this page reads back.
- The only client-side cache is **localStorage** `order_cache_<id>` written in `onSuccess`
  (`page.tsx:68`) — consumed by `/order` (C9) and `/order/:id` (C10) for an instant first paint
  before their own SSE/REST refresh. Cross-page detail →
  [customer_checkout_crosspage_dataflow.md](customer_checkout_crosspage_dataflow.md).

---

## Error Behaviour

- **Bind / validation failures** → `400 INVALID_INPUT` via `respondError`
  (`order_handler.go:71-73`, `77-85`) — pattern → [../../02_spec/ERROR_SPEC.md](../../02_spec/ERROR_SPEC.md).
- **Service errors** → `handleServiceError` mapping: `ErrNotFound` → 404, `ErrForbidden` → 403,
  combo-membership / empty-items `AppError` → 400.
- **FE error handling** (`page.tsx:77-87`): a single `onError` checks for
  `error === 'TABLE_HAS_ACTIVE_ORDER'` and would redirect to `/order/:active_order_id`; **all other
  errors → `toast.error(message)`**.
  - 🚨 The `TABLE_HAS_ACTIVE_ORDER` branch is **dead** — `CreateOrder` never returns that code
    (`ErrTableHasActiveOrder` is defined in `errors.go:30` but **referenced nowhere**; the table-busy
    case returns `201` + `table_busy:true` instead). See Flags + [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md)
    Bug 2.

---

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **`payment_method` is collected but never sent** | The radio (`page.tsx:24-29,184-194`) writes the choice to `cart.setPaymentMethod` (`page.tsx:47`), then `onSuccess` calls `cart.clearCart()` which wipes it (`cart.ts:89`). It is **not** in the `POST /orders` body and there is no `orders.payment_method` column — payment method is set at the cashier (S5). Picking VNPay/MoMo/ZaloPay does nothing different from Cash. 🔮 PLANNED online-payment, unwired. → [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md) Bug 1. |
| 2 | **`TABLE_HAS_ACTIVE_ORDER` error branch is dead** | `ErrTableHasActiveOrder` (`errors.go:30`) is never returned by `CreateOrder` — the busy-table case returns `201` + `data.table_busy:true` (`order_handler.go:121`) and creates a **parallel order**. Checkout neither hits its redirect branch (the error never fires) **nor** reads `table_busy` from the success body, so it silently creates a duplicate with **no notice** — unlike the menu `TableConfirmModal` which at least toasts on `table_busy`. → [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md) Bug 2. |
| 3 | **Online (`table_id`-null) order is unreadable by a guest token** | `GetOrder`'s customer ownership guard (`order_service.go:116-120`) forbids a customer-role caller whose `claims.TableID` doesn't match the order's table; a `source:'online'` order has `table_id = NULL`, so the post-create re-fetch and `/order/:id` both 403 for a guest token. Latent — no wired online entry today. → [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md) Bug 3. |
| 4 | **`customer_name` / `customer_phone` / `note` are not server-validated** | The handler binds them with no rules (`order_handler.go:62-64`); the min-2-name + `^(0|\+84)[0-9]{9}$` phone regex is FE-only (`page.tsx:16-17`). A non-browser client can post an empty name/garbage phone and the order is accepted. |
| 5 | **Checkout never uses `POST /orders/:id/items`** | Unlike the menu's add-to-order mode, checkout always creates a fresh order; `cart.activeOrderId` is ignored on this page. |
