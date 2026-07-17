# Scenario — Walk-In Lunch Counter (POS · Build → Create → Wait → Auto-Redirect)

> **Status:** ✅ implemented.
> **What this is:** a page-specific narrative that zooms on the **POS counter** beat in a busy lunch
> window — a cashier receiving two back-to-back walk-in orders, the second arriving while the first
> is still in the kitchen. Grounded in the 5 endpoints traced in
> [staff_pos_be.md](staff_pos_be.md). Zones + wireframe → [staff_pos.md](staff_pos.md) · Loading
> states → [staff_pos_loading.md](staff_pos_loading.md) · Cross-page handoff →
> [staff_pos_crosspage_dataflow.md](staff_pos_crosspage_dataflow.md).
>
> **Core single-order beat** (build → create → wait → redirect) is told at full length in
> [SCENARIO_POS_ORDER.md](SCENARIO_POS_ORDER.md). **This file zooms on a different angle:** the
> lunch rush context, the second-order concurrency problem (active order blocks the build screen),
> and the "Tạo đơn mới" escape hatch. Read this alongside the core scenario, not instead of it.
>
> Kitchen / KDS side of the story → [../staff_kds/staff_kds.md](../staff_kds/staff_kds.md).
> Broader floor context (tables, QR orders, same lunchtime) →
> [../../customer/customer_menu/SCENARIO_LUNCH_RUSH.md](../../customer/customer_menu/SCENARIO_LUNCH_RUSH.md).
> Downstream payment page → [../staff_cashier_payment/staff_cashier_payment.md](../staff_cashier_payment/staff_cashier_payment.md).

---

## The Cast

| Who | Username | Role | Job this scene |
|---|---|---|---|
| **Phạm Thu Ngân** | `cashier1` | cashier | Runs the POS terminal at the counter — takes orders, monitors the kitchen, redirects to payment |
| **Lê Đầu Bếp** | `chef1` | chef | Cooks on the KDS; marks items served, triggering `ready` status |
| Walk-in customer A | — | — | Orders at the counter; Thu Ngân acts as their voice |
| Walk-in customer B | — | — | Arrives while order A is still in the kitchen |

---

## The Setting

**Tuesday, 11:55.** The QR tables are filling up fast (see
[SCENARIO_LUNCH_RUSH.md](../../customer/customer_menu/SCENARIO_LUNCH_RUSH.md) for the floor
picture). Two regulars walk straight to the counter — no phone, no QR, no table — and order by
name. Thu Ngân is on `/pos`, already logged in as `cashier1`.

This is the POS-specific story: **no `table_id`, no QR flow, no `lib/order-payload.ts`** — just
the counter terminal, one cashier, and the shared KDS WebSocket that tells her when to move to
payment.

The `(dashboard)` layout mounted `OrdersWSProvider` the moment Thu Ngân's session started.
One WebSocket is open to `wss://…/ws/orders-live?token=<cashier JWT>`
(`OrdersWSContext.tsx:35-38`) and will stay open for the whole session regardless of which
dashboard page she is on.

---

## The Timeline

### 11:55 — Thu Ngân opens `/pos`; catalog loads

`POSContent` mounts. `AuthGuard` + `RoleGuard minRole=CASHIER` (`pos/page.tsx:25-26`) both pass
for `cashier1`.

Two TanStack Query fetches fire in parallel:

| Query key | Endpoint | Redis | FE `staleTime` |
|---|---|---|---|
| `['categories']` | `GET /categories` (public, `main.go:186`) | `categories:list` 5-min TTL | 5 min (`pos/page.tsx:42`) |
| `['products', null]` | `GET /products` (public, `main.go:168`) | `products:list` 5-min TTL | 5 min (`pos/page.tsx:50`) |

At 11:55 the cache is warm from the 09:14 session — Redis returns both keys in < 10 ms. The
two-pane layout renders: left = category tabs + product grid, right = "Chọn món từ menu" empty
state. State is fresh: `selectedCategory = null`, `cart = []`, `activeOrder = null`
(`pos/page.tsx:35-37`).

`activeOrder` is `null` → the `useEffect` WS subscriber is dormant (`pos/page.tsx:56`: `if
(!activeOrder) return`). The WS is connected but not watching any order id yet.

---

### 11:56 — Customer A orders: 3× Bánh Cuốn Thịt + 1× Canh

Thu Ngân taps **Bánh Cuốn Thịt** three times, then **Canh** once.

Each tap calls `addToCart(product)` (`pos/page.tsx:72-79`). The existing-product branch fires on
taps 2 and 3:

```
tap Bánh Cuốn Thịt  →  cart = [{ product_id: "uuid-banh", quantity: 1, price: 35000 }]
tap Bánh Cuốn Thịt  →  hit → quantity++   cart = [{ …, quantity: 2 }]
tap Bánh Cuốn Thịt  →  hit → quantity++   cart = [{ …, quantity: 3 }]
tap Canh            →  new entry           cart = [{ …banh, qty:3 }, { uuid-canh, qty:1, price:10000 }]
```

`cartTotal` recomputes inline at `pos/page.tsx:88`:
`35 000 × 3 + 10 000 × 1 = 115 000`.

No network call. No Zustand store. No `lib/order-payload.ts`. This `PosCartItem[]`
(`pos/page.tsx:16-21`) is a **page-local type**, entirely separate from the customer
`CartItem` in `useCartStore`. The right pane updates synchronously.

> ⚠️ **Flag (carried from [staff_pos_be.md Flag 2](staff_pos_be.md)):** items are built inline
> (`pos/page.tsx:96`) as `{ product_id, quantity }` only — no `topping_ids`, no `filling`, no
> `combo_id`. Thu Ngân cannot add nhân overrides or soup variants from the POS terminal.

---

### 11:56:30 — Thu Ngân taps "Tạo Đơn →"

Button is enabled: `cart.length > 0 && !createOrder.isPending` (`pos/page.tsx:207`). Label flips to
**"Đang tạo..."** (`pos/page.tsx:211`). `createOrder.mutate()` fires:

```jsonc
POST /api/v1/orders                           // api-client.ts interceptor injects Bearer header
Authorization: Bearer <cashier JWT>
{
  "customer_name":  "Khách tại quán",         // literal constant — pos/page.tsx:93
  "customer_phone": "0000000000",             // literal constant — pos/page.tsx:94
  "source":         "pos",                    // validated oneof=online|qr|pos (order_handler.go:72)
  "items": [
    { "product_id": "uuid-banh", "quantity": 3 },
    { "product_id": "uuid-canh", "quantity": 1 }
  ]
  // NO table_id — intentional for walk-in counter orders
}
```

**What the BE does** (full trace → [staff_pos_be.md §3](staff_pos_be.md)):

1. `order_handler.go:88-92` — `claims.Role != "customer"` → `callerID = claims.Subject` →
   `created_by` = cashier1 UUID. Every POS order is stamped with the cashier's identity (unlike
   QR/online orders which store `NULL`).
2. `in.TableID == ""` → `GetActiveOrderByTable` skipped → `table_id` stored `NULL`
   (`order_service.go:269-275, 301-304`).
3. `buildProductRow` → `GetProductSnapshot` resolves `name + unit_price` server-side
   (`order_service.go:355-369`). The FE-side `price` fields are display-only; the BE never reads
   them.
4. `RecalculateTotalAmount` = `SUM(unit_price × quantity)` in the same tx.
5. `order_number` from Redis `INCR order:seq:YYYYMMDD` (`order_service.go:774-786`), e.g.
   `ORD-20260617-031`.
6. Publishes `new_order` → `order:<id>` + `orders:kds` + `orders:admin`
   (`order_service.go:348-350`).
7. Returns `201 { data: { id: "uuid-order-31", table_busy: false } }` (`order_handler.go:121`).

> 🟠 **CONFIRMED BUG (Flag 6 in [staff_pos_be.md](staff_pos_be.md)):** `order_handler.go:121`
> returns only `{ id, table_busy }` — no `order_number`. The POS casts this thin object as a full
> `Order` (`pos/page.tsx:97-99`) and reads `.order_number` in the toast (`:101`) and waiting card
> (`:111`). Both render **"Đơn #undefined"**. The redirect still works (it reads `order.id`).
> Fix documented in [POS_BUGS.md Bug 1](POS_BUGS.md).

---

### 11:56:31 — Waiting screen; WS subscriber activates

`onSuccess` (`pos/page.tsx:98-103`):

```ts
setActiveOrder(order)   // order.id = "uuid-order-31"
setCart([])             // right pane cleared
toast.success('Đã tạo đơn #undefined')   // ← "undefined" is the bug above
```

The component re-renders to the waiting card branch (`pos/page.tsx:107-133`):

```
┌──────────────────────────────┐
│   Đơn #undefined             │  ← Bug 1: order_number not in response
│ ⏳ Bếp đang chuẩn bị...      │
│  Khi bếp hoàn thành, bạn     │
│  sẽ được chuyển đến thanh    │
│  toán tự động.               │
│                              │
│ [Đến thanh toán] [Tạo đơn mới] │
└──────────────────────────────┘
```

`activeOrder` is now non-null → `useEffect` dependency array `[subscribe, activeOrder, router]`
fires (`pos/page.tsx:55`). A WS handler is registered with `subscribe(fn)` and a cleanup returned.
The POS is now watching for `order_status_changed` where `msg.order_id === "uuid-order-31"`.

Simultaneously, on **the KDS screen** (`/kds`) and **Admin Overview** (`/admin/overview`), the
`new_order` publish propagated to every Redis `orders:kds` subscriber — both screens show the new
order card immediately, with no refresh.

---

### 11:57 — Customer B walks up while order A is in the kitchen

A second customer arrives at the counter. They want 2× Giò. Thu Ngân is stuck on the waiting card
— the POS **only renders the waiting card while `activeOrder !== null`** (`pos/page.tsx:107-133`).
She cannot build a new cart while waiting.

Her two options:

**Option A — tap "Đến thanh toán"** (manual escape):
`pos/page.tsx:118` → `router.push('/cashier/payment/uuid-order-31')`. Navigates immediately with no
status check. Order A is handed to the payment page; POS unmounts; the WS subscription handler for
order A is cleaned up. When Thu Ngân eventually returns to `/pos`, the component re-mounts with
`activeOrder = null` and she can build order B.

**Option B — tap "Tạo đơn mới"** (discard waiting):
`pos/page.tsx:124` → `setActiveOrder(null)`. Clears `activeOrder` locally. The WS subscription for
order A is cleaned up (the `useEffect` returns its cleanup and re-registers with `!activeOrder →
return`). **Order A in the DB is untouched** — status stays `pending`, the kitchen is still cooking
it. Thu Ngân can now build order B immediately.

> 🟡 **Flag (carried from [staff_pos_be.md Flag 7](staff_pos_be.md)):** "Tạo đơn mới" orphans
> order A. There is no `DELETE` or `PATCH /cancel` call — the pending order row remains in the DB
> and on the KDS. It can only be cancelled from `/admin/overview`. Whether this is intentional is
> an open product decision.

Thu Ngân taps **"Tạo đơn mới"** — she will handle order A's payment after the kitchen is done,
then come back for B.

---

### 11:57:10 — Thu Ngân builds order B: 2× Giò

`activeOrder` is now `null`. The component re-renders to the two-pane build screen. Thu Ngân taps
**Giò** twice:

```
cart = [{ product_id: "uuid-gio", quantity: 2, price: 9000 }]
cartTotal = 18 000
```

She taps "Tạo Đơn →". The same POST fires:

```jsonc
POST /api/v1/orders
{ "customer_name": "Khách tại quán", "customer_phone": "0000000000",
  "source": "pos",
  "items": [{ "product_id": "uuid-gio", "quantity": 2 }] }
```

→ `201 { id: "uuid-order-32", table_busy: false }`. Order B now starts `status=pending`.

The POS switches to the waiting card for order B. Two POS orders (`ORD-031` and `ORD-032`) are now
`pending` in the DB simultaneously — the cashier is implicitly juggling them by knowing which one
she is on. The system has no single-active-order constraint for the POS
(`order_service.go:269-275` only checks `GetActiveOrderByTable` when `in.TableID != ""`).

---

### 11:59 — Chef marks order A ready on KDS

Lê Đầu Bếp ticks off the last item on `ORD-20260617-031`. `maybeAutoReady` fires
(`order_service.go:745`) or he taps "Ready" explicitly → `PATCH /orders/:id/status`
(`order_service.go:552`). Either path publishes to `orders:kds`:

```json
{ "type": "order_status_changed", "order_id": "uuid-order-31", "status": "ready" }
```

---

### 11:59:02 — POS ignores order A's signal (it's watching order B)

`OrdersWSProvider` receives the WS message and fans it to every registered handler
(`OrdersWSContext.tsx:51`).

The current POS handler (`pos/page.tsx:58-67`) checks:

```
msg.type === 'order_status_changed'       ✓
msg.order_id === "uuid-order-32"          ✗  (message is for uuid-order-31)
```

The check fails — the handler exits early and **no redirect fires**. The waiting card for order B
stays on screen. Order A's `ready` signal is **silently dropped** by the POS. The KDS and Admin
Overview still receive the broadcast (they listen to all events, not one order id), so Đầu Bếp's
screen and the admin floor list update correctly.

> The POS auto-redirect is intentionally scoped to **one active order id** (`pos/page.tsx:57`).
> When the cashier uses "Tạo đơn mới" to move to a second order while the first is still in
> progress, the first order's `ready` signal is invisible to the POS. This is a natural consequence
> of the single-`activeOrder` state design.

---

### 12:01 — Chef marks order B ready

Same publish: `{ type:"order_status_changed", order_id:"uuid-order-32", status:"ready" }`.

POS handler checks:

```
msg.type === 'order_status_changed'       ✓
msg.order_id === "uuid-order-32"          ✓
```

Fires `GET /orders/uuid-order-32` (`pos/page.tsx:62`) — `order_handler.go:125-137` reads the
fresh row; `order.status === 'ready'` → true:

```ts
toast.success('Đơn đã sẵn sàng — chuyển sang thanh toán')
router.push('/cashier/payment/uuid-order-32')
```

Thu Ngân lands on the payment screen for order B. The POS unmounts; the WS handler for order B
is cleaned up. The shared `OrdersWSProvider` socket stays alive.

After paying order B, Thu Ngân navigates back to `/admin/overview` (or `/pos`), finds order A
still sitting at `ready`, and manually routes to `/cashier/payment/uuid-order-31` from the floor
list.

---

## Under the Hood

### A. Cross-Component Data Flow

`POSContent` is a single component (`pos/page.tsx:33`). All state — `selectedCategory`, `cart`,
`activeOrder` — lives in local `useState`. There is no Zustand store and no TanStack Query cache
entry for the active order. `CategoryTabs` receives props by standard parent-to-child passing;
the product grid and order pane are inline JSX.

Concurrency consequence: `activeOrder` being `null` vs. non-null is what gates the entire render
branch (`pos/page.tsx:107`). Switching between "build" and "waiting" is a pure local state flip
with no network round-trip.

Full cross-component detail → (this page has no `_crosscomponent_dataflow.md`; the page is a
single-component design with no inter-widget coordination).

### B. Cross-Page Data Flow

The POS leaves two durable artifacts when it fires `router.push('/cashier/payment/:id')`:

1. **The `orders` DB row** — `status=ready`, `source=pos`, `created_by=cashier1 UUID`,
   `table_id=NULL`. This is the source of truth for the payment page, the KDS, and the Admin
   Overview. Field definitions → [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md).

2. **The order id in the URL path** — the only in-browser hand-off. Nothing is written to
   localStorage or Zustand when the POS redirects. The payment page reads the id from
   `params.id`.

With the "Tạo đơn mới" path, order A's row remains in the DB at status `pending` or `ready`; the
POS simply stops watching it. The admin floor list still shows it; the chef's KDS still holds it.
No orphan cleanup happens automatically.

Full durability matrix and reload behaviour →
[staff_pos_crosspage_dataflow.md](staff_pos_crosspage_dataflow.md).

Downstream surfaces for both orders:

| Surface | Receives | Mechanism |
|---|---|---|
| `/cashier/payment/:id` | order id via URL | `router.push` |
| `/kds` ([staff_kds.md](../staff_kds/staff_kds.md)) | `new_order` WS event | Redis `orders:kds` pub → WS broadcast |
| `/admin/overview` ([admin_overview.md](../../admin/admin_overview/admin_overview.md)) | `new_order` WS event | Redis `orders:admin` pub → SSE/WS fan-out |

### C. FE → BE Send (what crosses the wire)

Both POS orders share the same payload shape — the **minimum valid POS order**:

```jsonc
POST /api/v1/orders
Authorization: Bearer <cashier JWT>     // api-client.ts interceptor; cashier never touches it
{
  "customer_name":  "Khách tại quán",   // pos/page.tsx:93
  "customer_phone": "0000000000",       // pos/page.tsx:94
  "source":         "pos",
  "items": [
    { "product_id": "<uuid>", "quantity": <n> }
    // NO table_id · NO topping_ids · NO combo_id · NO filling · NO per-item note
  ]
}
```

Differences from the customer QR/online payload (traced in
[customer_menu_be.md](../../customer/customer_menu/customer_menu_be.md)):

| Field | POS | QR / Online |
|---|---|---|
| `table_id` | absent → `NULL` stored | present → table-busy check runs |
| `source` | `"pos"` | `"qr"` / `"online"` |
| `customer_name/phone` | literals, stored verbatim | empty → `NULL` via `nullStr()` |
| `created_by` | cashier UUID (non-NULL) | `NULL` (customer = no staff) |
| `items` builder | inline `{ product_id, quantity }` only — `pos/page.tsx:96` | `buildOrderItemsPayload` from `lib/order-payload.ts` with toppings/combos/filling |

The POS bypasses `lib/order-payload.ts` (Flag 2 in [staff_pos_be.md](staff_pos_be.md)) — a
deliberate simplification that prevents toppings, combos, or nhân from ever reaching the counter
terminal.

### D. BE → FE Receive / Live Updates

**HTTP response** (synchronous): `POST /orders` returns `201 { data: { id, table_busy: false } }`
(`order_handler.go:121`). No `order_number`, no `status`, no `items[]`. The POS stores this thin
object as `activeOrder` — the `#undefined` bug follows directly.

**WebSocket** (async): `OrdersWSProvider` forwards events from Redis `orders:kds` to all registered
handlers. The message shape the POS subscribes to:

```ts
// WsMsg — OrdersWSContext.tsx:5-11
{
  type:        string      // "order_status_changed" — the only type POS reacts to
  order_id:    string      // compared against activeOrder.id
  status?:     string      // "ready" triggers GET + redirect
  item_id?:    string      // ignored by POS
  qty_served?: number      // ignored by POS
}
```

The BE emits exactly this field shape (`order_service.go:788-795`; publisher at `:818`). Field name
`order_id` (not `orderId`) — confirmed matching across `WsMsg` type and the BE struct
([staff_pos_be.md §5](staff_pos_be.md)).

**No replay on reconnect.** If the WS disconnects between the chef marking `ready` and the POS
reconnecting, the `order_status_changed` event is gone — `wsHandler` has no snapshot or queue
(`websocket/handler.go:67-81`). The waiting screen stays stuck until the cashier taps "Đến thanh
toán" manually (Flag 4 / [staff_pos_be.md Flag 5](staff_pos_be.md)).

**WS reconnect:** exponential backoff, delay = `min(1000 × 2^(attempts-1), 30_000)` ms,
capped at 30 s (`OrdersWSContext.tsx:53-57`).

### E. Loading States + Caching

**Catalog (on page open):** both catalog keys are warm at 11:55 (within the 5-min window from
the morning session). Redis returns in < 10 ms; TanStack `staleTime: 5 * 60 * 1000`
(`pos/page.tsx:42,50`) prevents a BE round-trip. Worst-case staleness ≈ Redis TTL + FE staleTime
= 10 min — acceptable for a menu that changes infrequently.

> ⚠️ **Flag (carried from [staff_pos_be.md Flag 1](staff_pos_be.md)):** selecting a category tab
> changes `selectedCategory` and re-keys the TanStack query to `['products', <id>]`, sending
> `GET /products?category_id=<uuid>`. The BE ignores the parameter (`product_handler.go:42-54`
> reads no query params) and returns the full available list every time. The tab is a visual
> no-op on the product list.

**"Tạo Đơn →" button:** disabled + relabelled "Đang tạo..." while `createOrder.isPending`
(`pos/page.tsx:207,211`). Prevents double-submit; no spinner on the screen otherwise.

**Waiting screen:** static text only. The `GET /orders/:id` inside the WS callback is
fire-and-forget with a silent `catch` (`pos/page.tsx:62-68`). Thu Ngân has no visual feedback if
that re-fetch fails — the redirect simply does not fire.

Full per-state loading breakdown → [staff_pos_loading.md](staff_pos_loading.md).

### F. Monitoring

The two `POST /orders` bursts at 11:56:31 and 11:57:10 show as a Request Rate spike on Grafana
(`:3001`, **BanhCuon — API Monitoring** dashboard) within the 15 s Prometheus scrape interval.

The `GET /orders/:id` re-fetch inside each WS callback adds two more data points to the rate panel.

The `new_order` publishes propagate to:

- **KDS** — `ORD-031` and `ORD-032` appear on Đầu Bếp's screen in the order they were created.
- **Admin Overview** — both cards appear in the WaitingSection / floor list live, `source=pos`,
  `table_id=NULL`.

If `POST /orders` returns 5xx, the `HighErrorRate` Prometheus alert (`5xx > 5% over 5 min`)
fires and shows on the **Active Alerts** panel. `SlowResponseTime` (`p95 > 500 ms over 5 min`)
would catch a slow DB transaction. Triage order and dashboard config →
[../../../09_devops/MONITORING.md](../../../09_devops/MONITORING.md); live configs in
`monitoring/`.

---

## A to F on One Timeline (both walk-in orders)

```
11:55   POSContent mounts
          → AuthGuard + RoleGuard pass (cashier1)                         (auth)
          → OrdersWSProvider WS already open (dashboard layout)           (D: shared WS)
          → GET /categories + GET /products (parallel, warm Redis)        (E: < 10 ms)
          → cart=[], activeOrder=null; WS subscriber dormant              (A: local state)

11:56   tap Bánh Cuốn Thịt ×3, tap Canh ×1
          → addToCart() updates local cart[]                              (A: no network)
          → cartTotal = 115 000 ₫

11:56:30 tap "Tạo Đơn →"
          → POST /orders { source:'pos', items:[banh×3, canh×1] }        (C: inline items)
          → BE: created_by=cashier1 UUID, table_id=NULL, server prices    (C: BE processes)
          → BE: publishes new_order → orders:kds + orders:admin           (F: KDS + admin live)
          → 201 { id:"uuid-order-31", table_busy:false }                  (D: thin response)

11:56:31 onSuccess: setActiveOrder({id:"uuid-order-31", …}); setCart([])
          → render → waiting card; toast "Đã tạo đơn #undefined" (Bug 1) (A: state flip)
          → useEffect fires → subscribe(fn) watching uuid-order-31        (D: WS active)

11:57   customer B arrives; Thu Ngân taps "Tạo đơn mới"
          → setActiveOrder(null)                                           (A: state flip)
          → useEffect cleanup removes WS handler for order-31             (D: un-subscribe)
          → render → build screen (order-31 still pending in DB, orphaned)(B: cross-page gap)

11:57:10 tap Giò ×2; tap "Tạo Đơn →"
          → POST /orders { source:'pos', items:[gio×2] }                  (C)
          → 201 { id:"uuid-order-32", table_busy:false }
          → setActiveOrder({id:"uuid-order-32"}); subscribe for order-32  (D: watching new id)

11:59   chef marks order-31 ready → publishes order_status_changed order-31
          → WS handler checks: order_id "uuid-order-31" ≠ "uuid-order-32" → no-op  (D: miss)
          → KDS + admin overview update; POS stays on waiting card for order-32

12:01   chef marks order-32 ready → publishes order_status_changed order-32
          → WS handler: type ✓, order_id ✓
          → GET /orders/uuid-order-32 → status 'ready'                    (D: BE re-fetch)
          → toast + router.push('/cashier/payment/uuid-order-32')         (B: cross-page)
          → POS unmounts; WS handler cleaned up; shared WS stays alive
          → order-31 still needs manual attention from admin overview
```

---

## One-Line Mental Model

> The POS is a **single-active-order cashier tool**: while one order is in the kitchen the build
> screen is locked, so a second walk-in means the cashier must choose between manual payment of
> the first or discarding the wait — and a discarded-wait order lives on in the DB as an orphan
> that only the admin overview can rescue.

---

## Flags Surfaced by This Scenario

| # | Flag | Detail | Home |
|---|---|---|---|
| 1 | **Category tabs are a visual no-op** | `GET /products?category_id=` sent (`pos/page.tsx:48`) but BE ignores the param (`product_handler.go:42-54`); full available list always returned | [staff_pos_be.md Flag 1](staff_pos_be.md) |
| 2 | **POS bypasses `lib/order-payload.ts`** | Inline `items` builder (`pos/page.tsx:96`) → no toppings, combos, filling, or per-item notes reachable from counter | [staff_pos_be.md Flag 2](staff_pos_be.md) |
| 3 | **Placeholder identity stored verbatim** | `'Khách tại quán'` / `'0000000000'` are non-empty → `nullStr()` keeps them as literal strings in every POS `orders` row | [staff_pos_be.md Flag 3](staff_pos_be.md) |
| 4 | **No WS replay on reconnect** | A `ready` event that fires during a disconnect is silently dropped; cashier must tap "Đến thanh toán" manually | [staff_pos_be.md Flag 5](staff_pos_be.md) |
| 5 | **Second-order concurrency — waiting screen locks the build screen** | While `activeOrder !== null` the entire build pane is hidden (`pos/page.tsx:107`); second walk-in forces a manual decision | This scenario |
| 6 | **"Tạo đơn mới" orphans the first order** | `setActiveOrder(null)` (`pos/page.tsx:124`) clears local state only; no `DELETE` or `PATCH /cancel`; order A stays `pending` in DB | [staff_pos_be.md Flag 7](staff_pos_be.md) |
| 7 | 🟠 CONFIRMED BUG — `POST /orders` response has no `order_number` | `order_handler.go:121` returns only `{ id, table_busy }`; `pos/page.tsx:101,111` read `.order_number` → **"Đơn #undefined"** on every POS order | [POS_BUGS.md Bug 1](POS_BUGS.md) |
