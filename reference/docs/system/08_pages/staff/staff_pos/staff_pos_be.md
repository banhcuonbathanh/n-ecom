# Staff POS — `/pos` · Backend View

> **TL;DR:** ✅ implemented · every BE endpoint the POS page calls, traced handler → service →
> repository → SQL, with auth, caching, realtime and error behaviour. Traced from source on branch
> `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/product_handler.go` ·
> `be/internal/service/product_service.go` · `be/internal/handler/order_handler.go` ·
> `be/internal/service/order_service.go` · `be/internal/websocket/handler.go` ·
> `fe/src/context/OrdersWSContext.tsx` · `fe/src/app/(dashboard)/pos/page.tsx`.
>
> FE view + zones → [staff_pos.md](staff_pos.md) ·
> Order write pipeline (DTO + DB mapping) → [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) ·
> Shared catalog/order BE detail → [../../customer/customer_menu/customer_menu_be.md](../../customer/customer_menu/customer_menu_be.md)

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `GET /categories` | public | `productH.ListCategories` | `ListCategories` | `ListCategories` (active only) | `categories:list` (5 min) |
| 2 | `GET /products` | public | `productH.ListProducts` | `ListProducts` | `ListProductsAvailable` (`is_available=1`) | `products:list` (5 min) |
| 3 | `POST /orders` | authMW (cashier JWT) | `orderH.Create` | `CreateOrder` | tx: `CreateOrder` + `CreateOrderItem`×N + `RecalculateTotalAmount` | — |
| 4 | `GET /orders/:id` | authMW | `orderH.Get` | `GetOrder` | `GetOrderByID` + `GetOrderItemsByOrderID` + table join | — |
| 5 | `GET /ws/orders-live?token=` (WS) | `?token=` parsed in handler — **no authMW, no role gate** | `ws.LiveHandler` → `wsHandler(…, "orders:kds")` | — | Redis `Subscribe("orders:kds")` | pub/sub fan-out only |

Route registration: products/categories groups `be/cmd/server/main.go:167-197`; orders group
`:230-246` (POST `:232`, GET `/:id` `:236`); WS group `:337-339` (`/orders-live` `:339`). All under `/api/v1`.

---

## Auth Model on This Page

- **Page guard (FE):** `AuthGuard` + `RoleGuard minRole=CASHIER` (`pos/page.tsx:25-26`) — a cashier-or-higher
  staff JWT is always present. None of the calls below is made anonymously.
- **Catalog GETs (1–2) are fully public** — no `authMW` on the GET routes (`main.go:168,186`). They are
  the *same* shared catalog endpoints the customer `/menu` (C1) uses; POS just calls them with a staff
  token that the public route ignores.
- **`POST /orders` (3) requires `authMW` only — no role gate** (`main.go:231-232`). The cashier JWT passes.
  Because `claims.Role != "customer"`, the handler keeps `callerID = claims.Subject`
  (`order_handler.go:88-92`), so **POS orders are stamped with the cashier's staff UUID in `created_by`**
  — unlike customer QR/online orders, which store `NULL`.
- **`GET /orders/:id` (4) requires `authMW` only — no role gate** (`main.go:236`). The table-ownership
  guard in `GetOrder` fires **only when `callerRole == "customer"`** (`order_service.go:116-120`); a staff
  cashier bypasses it and may read **any** order id.
- **`GET /ws/orders-live` (5) has NO `authMW` and NO role gate** (`main.go:337` group has no `.Use`).
  Auth is a `?token=` query param parsed inside `wsHandler` via `jwtpkg.ParseToken` (`websocket/handler.go:31-47`)
  — it validates signature/expiry only, **not role and not is_active**. Any valid JWT (including a customer
  guest token) can subscribe. See Flags + the shared Cross-Page Concern.

---

## Per-Endpoint Detail

### 1 · `GET /categories`

- Public route (`main.go:186`). Handler `ListCategories` (`product_handler.go:169-190`) reads no params and
  serializes inline: `id, name, description, sort_order, is_active`.
- Service `ListCategories` (`product_service.go:344-357`): Redis `categories:list` hit → return; miss →
  repo `ListCategories` (`is_active=1 AND deleted_at IS NULL`, `query/products.sql:1-4`) → cache set (5 min TTL,
  `productCacheTTL` `product_service.go:21`).
- Feeds the `CategoryTabs` component (reused from `features/menu`).

### 2 · `GET /products`

- Public route (`main.go:168`). Handler `ListProducts` (`product_handler.go:42-54`) — **reads no query params**
  (no `c.Query` call anywhere). Serializer `productJSON` (`product_handler.go:443`): `id, name, price,
  description, image_path, is_available, sort_order, category_id, category_name, toppings[]`.
- Service `ListProducts` (`product_service.go:164-191`): Redis `products:list` hit → return; miss → repo
  `ListProductsAvailable` (`is_available=1 AND deleted_at IS NULL`, `query/products.sql:35-38`), toppings
  resolved per product via the junction, then cache set (5 min).
- **The POS sends `?category_id=<uuid>` when a tab is selected (`pos/page.tsx:48`), but the BE ignores it**
  — see Flag 1. A wired-but-unused `ListProductsByCategoryAvailable` query exists (`query/products.sql:30-33`)
  but is connected to no handler/service.

### 3 · `POST /orders` (the "Tạo Đơn" button)

FE sends (`pos/page.tsx:92-97`): `source:'pos'`, `customer_name:'Khách tại quán'`,
`customer_phone:'0000000000'`, **no `table_id`**, `items: cart.map(i => ({ product_id, quantity }))` — built
inline, **bypassing `lib/order-payload.ts`** (Flag 2).

BE behaviour (full DTO + DB mapping → [OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md)):

- Binds `createOrderReq` (`order_handler.go:59-66`): `source` validated `oneof=online qr pos` → `'pos'` passes;
  `items` min 1. Each item must be product XOR combo.
- `created_by`: handler sets `callerID = claims.Subject` for staff (`order_handler.go:88-92`) → stored as a
  non-NULL `created_by` (`order_service.go:328`). **This is the staff cashier's UUID.**
- `source` mapped to `db.OrdersSourcePos` (`order_service.go:312-318`). **No POS-specific branch beyond the
  stored enum** — POS orders start `status='pending'` like every source (status hardcoded in the insert SQL;
  no skip-confirm, no auto-ready). The "waiting for kitchen" screen is purely FE.
- `customer_name` / `customer_phone`: stored as-is via `nullStr` (`order_service.go:325-326`) — the literals
  `'Khách tại quán'` / `'0000000000'` are non-empty so both persist verbatim (Flag 3).
- **`table_id` absent** → `in.TableID == ""`, so the table-busy lookup (`order_service.go:269-275`) is skipped
  entirely (`GetActiveOrderByTable` never runs) and `table_id` is stored NULL (`:301-304`). `table_busy` is
  always `false` for a POS order, so the one-active-order concept does not apply here.
- Prices/snapshots are **server-trusted**: `buildProductRow` reads `GetProductSnapshot` for name + `unit_price`
  (`order_service.go:355-369`); the FE sends no prices. Combo expansion (`expandCombo`) exists but is never hit
  — the POS grid offers products only (no combo_id sent).
- `total_amount` = `RecalculateTotalAmount` (`SUM(unit_price*quantity)`, `orders.sql.go:364`) inside the tx.
- `order_number` from Redis `INCR order:seq:YYYYMMDD` with a timestamp fallback (`order_service.go:774-786`).
- Persisted atomically in one tx: `CreateOrder` + `CreateOrderItem`×N + `RecalculateTotalAmount`
  (`order_repo.go:77-120`). Response: `201 {data:{id, table_busy:false}}` (`order_handler.go:121`).
- On create, publishes `new_order` to `order:<id>` + `orders:kds`, an admin event to `orders:admin`, and a
  monitor broadcast (`order_service.go:348-350`).

### 4 · `GET /orders/:id` (WS-triggered re-fetch)

- Called inside the WS subscription callback (`pos/page.tsx:62`) on every `order_status_changed` for the active
  order, to read the fresh `status` and redirect when it is `ready`.
- Handler `Get` (`order_handler.go:125-137`): staff `callerID = claims.Subject`; serializer `orderJSON`.
- Service `GetOrder` (`order_service.go:106-143`): repo `GetOrderByID` → `GetOrderItemsByOrderID` → optional
  table-name join. The ownership guard (`:116-120`) is **customer-only**, so the cashier reads the order freely.
- No Redis read-cache on this path.

### 5 · `GET /ws/orders-live` (the auto-redirect signal)

- Provided once per browser session by `OrdersWSProvider` in the `(dashboard)` layout shell; the POS page
  consumes it via `useOrdersWSContext().subscribe` (`pos/page.tsx:54-70`).
- FE builds `wss?://{NEXT_PUBLIC_API_URL}/ws/orders-live?token=<accessToken>` (`OrdersWSContext.tsx:35-38`),
  with exponential-backoff reconnect capped at 30 s (`:53-58`). Message shape `WsMsg = {type, order_id,
  item_id?, qty_served?, status?}` (`:5-11`).
- BE: `LiveHandler` → `wsHandler(hub, rdb, "orders:kds")` (`websocket/handler.go:22-23`) subscribes to the
  **`orders:kds`** Redis channel and forwards every event to the socket (`:67-81`).
- POS reacts only to `msg.type === 'order_status_changed' && msg.order_id === activeOrder.id`
  (`pos/page.tsx:58-67`). The publisher emits exactly `{type:"order_status_changed", order_id, status}` to
  `orders:kds` (`order_service.go:552,745` → struct `orderEvent` `:788-795` → `Publish("orders:kds")` `:818`).
  **Field names match** (`type` / `order_id`) — the POS WS path is wired correctly (this is **not** the
  `order.status`-vs-`order_status_changed` SSE mismatch that breaks the customer `/tracking` badge; that is a
  different hook + channel).
- `status:'ready'` reaches POS either from a chef `PATCH /orders/:id/status` (`order_service.go:552`) or from
  `maybeAutoReady` when the last item is served (`:745`).

---

## Caching & Invalidation

- **Catalog (1–2):** shared 5-min TTL `productCacheTTL` (`product_service.go:21`); keys `products:list` +
  `categories:list`. FE TanStack `staleTime` is also 5 min (`pos/page.tsx:42,50`) → worst-case ~10 min
  end-to-end staleness. Invalidation is write-triggered by admin product/category writes
  (`invalidateProductCaches`, `product_service.go:709-717`) — the POS itself never writes catalog caches.
- **Orders (3–4):** no read-cache. `POST /orders` only touches Redis for the `order:seq:*` counter and the
  pub/sub publishes; `GET /orders/:id` hits MySQL directly.
- **WS (5):** Redis `orders:kds` is pub/sub fan-out only — ephemeral, no retention. A status change that lands
  while the POS socket is disconnected is **not replayed** on reconnect (no snapshot in `wsHandler`); the POS
  relies on the next event or a manual button. Cache-read helpers swallow Redis errors (catalog survives a
  Redis outage); a WS/Redis outage degrades only the auto-redirect, not order creation.

---

## Error Behaviour

- **Bind failures** (`POST /orders`): missing/invalid `source`, empty `items`, or product⊕combo violation →
  `400 INVALID_INPUT` via `respondError` (`order_handler.go:72,79,83`). FE shows toast `"Không thể tạo đơn hàng"`
  (`pos/page.tsx:103`) — it does not surface the specific code.
- **Service errors:** `handleServiceError` maps `*AppError` to its status/code; unknown product →
  `404 NOT_FOUND` from `GetProductSnapshot`; anything untyped → `500 COMMON_002`.
- **`GET /orders/:id`:** not-found → `404`; customer-ownership fail → `403` (cannot occur for the cashier).
- **Catalog GETs:** failures fall through to empty arrays (`pos/page.tsx:41,49` default `[]`) — no retry UI on POS.
- **WS:** missing/invalid `?token=` → `401 MISSING_TOKEN` / `TOKEN_INVALID` before upgrade
  (`websocket/handler.go:32-47`); FE auto-reconnects with backoff.

---

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **`GET /products` ignores `category_id` → POS category tabs are a no-op** | POS sends `?category_id=` (`pos/page.tsx:48`) but the handler reads no query params (`product_handler.go:42-54`) and the service/query take no filter (`product_service.go:164`, `query/products.sql:35-38`). Switching tabs re-keys the TanStack query but returns the *same* full available list. A `ListProductsByCategoryAvailable` query exists (`query/products.sql:30-33`) but is unwired. **Same root as the customer menu** ([customer_menu_be.md Flag 1](../../customer/customer_menu/customer_menu_be.md)) — now confirmed on a 2nd page → see Cross-Page Concerns. |
| 2 | **POS bypasses `lib/order-payload.ts`** | The page builds `items` inline as `{product_id, quantity}` only (`pos/page.tsx:96`), violating the project mandate that *all* cart→order payloads go through `buildOrderItemsPayload` (`fe/CLAUDE.md`). Consequence: POS cannot send `topping_ids`, `note`, `filling`, or combos — it is a **products-only, no-topping** order builder. Functionally correct for that narrow flow, but a maintainability/consistency divergence (already noted on the BE_DOC_TRACKER S4 row). |
| 3 | **Placeholder customer identity persisted verbatim** | Every POS order stores `customer_name='Khách tại quán'` + `customer_phone='0000000000'` (`order_service.go:325-326`) — non-empty, so not NULLed. A literal fake phone lands in the DB on every walk-in; harmless but worth knowing for reporting/analytics. |
| 4 | **WS `/ws/orders-live` has no role gate** | Auth is `?token=` validated for signature/expiry only — no role, no is_active check (`websocket/handler.go:31-47`; `main.go:337` group has no `.Use(authMW)`). Any valid JWT (incl. a customer guest token) can subscribe to the live feed. Cashier use is fine; the gap is cross-cutting → see Cross-Page Concerns (shared with A1 Overview + S3 KDS). |
| 5 | **`order_status_changed` reaches POS via `orders:kds`, not `order:<id>`** | `/ws/orders-live` subscribes to `orders:kds` (`websocket/handler.go:23`), the same channel as `/ws/kds`. The POS auto-redirect therefore depends on the *broadcast* KDS channel, not the per-order channel. No replay on reconnect (Caching note) — a `ready` that fires during a disconnect is missed until the next event or a manual "Đến thanh toán" tap. |
| 6 | 🟠 **POS waiting card + toast show "Đơn #undefined"** — code bug | `POST /orders` returns only `{id, table_busy}` (`order_handler.go:121`), but POS consumes it as a full `Order` and reads `.order_number` (`pos/page.tsx:101,111`) with **no follow-up `GET /orders/:id`** (menu/checkout do that GET; POS doesn't). → [POS_BUGS.md Bug 1](POS_BUGS.md). |
| 7 | 🟡 **"Tạo đơn mới" orphans the active order** — code gap | Clears local `activeOrder` with no `DELETE /orders/:id` (`pos/page.tsx:124`); a mistaken POS order can only be cancelled from `/admin/overview`. May be intended → product decision. → [POS_BUGS.md Bug 2](POS_BUGS.md). |

> ⚠️ Code bugs (not stale docs) live in **[POS_BUGS.md](POS_BUGS.md)** — the doc skill does not fix
> app code. Logged in the [LOGIC Decision Log (2026-06-16)](../../07_business_logic/LOGIC_INDEX.md#decision-log).
