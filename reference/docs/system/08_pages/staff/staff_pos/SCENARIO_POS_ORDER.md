# Scenario — A Walk-In Order on the POS

> **What this scenario walks through:** one cashier building and submitting a walk-in order end to
> end on `/pos` — from opening the page through the kitchen-waiting screen to the auto-redirect into
> payment. Grounded in the endpoints traced in [staff_pos_be.md](staff_pos_be.md).
> Zones + wireframe → [staff_pos.md](staff_pos.md) ·
> Loading states → [staff_pos_loading.md](staff_pos_loading.md) ·
> Cross-page handoff → [staff_pos_crosspage_dataflow.md](staff_pos_crosspage_dataflow.md).

---

## The Cast

| Who | Username | Role | Job this scene |
|---|---|---|---|
| **Phạm Thu Ngân** | `cashier1` | cashier | Takes the walk-in order on the POS terminal |
| **Lê Đầu Bếp** | `chef1` | chef | Cooks the order on the KDS screen, marks it ready |

---

## The Setting

A Tuesday mid-morning lull. A couple of regulars walk up to the counter; no phone, no QR code — they
just want "two Bánh Cuốn Thịt and a Canh Mọc, please." Thu Ngân is already logged in on the
cash-register browser tab at `/pos`.

---

## ⏱️ The Timeline

### 09:14 — Thu Ngân opens `/pos`

The dashboard layout (Next.js route group `(dashboard)`) renders `OrdersWSProvider` first — one
shared WebSocket opens to `wss://.../ws/orders-live?token=<cashier JWT>`
(`OrdersWSContext.tsx:35-38`). The POS page itself is wrapped in `AuthGuard` + `RoleGuard
minRole=CASHIER` (`pos/page.tsx:25-26`). Both guards pass for `cashier1`.

`POSContent` mounts. Two TanStack queries fire in parallel:

| Query | Endpoint | Cache | Result |
|---|---|---|---|
| `['categories']` | `GET /categories` (public) | Redis `categories:list` 5-min TTL; FE `staleTime` 5 min (`pos/page.tsx:42`) | Returns the active category list, e.g. `[Bánh Cuốn, Đồ Uống, …]` |
| `['products', null]` | `GET /products` (public, `selectedCategory` starts `null`) | Redis `products:list` 5-min TTL; FE `staleTime` 5 min (`pos/page.tsx:50`) | Returns all available products |

If it is the first hit of the morning (Redis cold) the BE reads MySQL then backfills the cache; for
the second tab opened within 5 minutes it serves from Redis in single-digit milliseconds.

The two-pane POS grid renders: **left** = category tabs + product cards, **right** = "Chọn món từ
menu" empty state. The three `useState` values start fresh: `selectedCategory = null`, `cart = []`,
`activeOrder = null` (`pos/page.tsx:35-37`).

> Note: `activeOrder` is `null` at this point so the `useEffect` WS subscriber is a no-op —
> `if (!activeOrder) return` (`pos/page.tsx:56`). The WS is connected but the POS is not yet
> watching any order id.

---

### 09:14:20 — Thu Ngân taps the product cards

Thu Ngân taps **Bánh Cuốn Thịt** twice and **Canh Mọc** once.

Each tap calls `addToCart(product)` (`pos/page.tsx:72-79`):

```
tap "Bánh Cuốn Thịt"  →  cart = [ { product_id: "uuid-banh", name: "Bánh Cuốn Thịt", quantity: 1, price: 35000 } ]
tap "Bánh Cuốn Thịt"  →  existing hit → quantity++
                          cart = [ { …, quantity: 2, price: 35000 } ]
tap "Canh Mọc"        →  new entry
                          cart = [ { …banh, quantity: 2 }, { product_id: "uuid-canh", name: "Canh Mọc", quantity: 1, price: 10000 } ]
```

`cartTotal` recomputes inline: `35 000 × 2 + 10 000 × 1 = 80 000` (`pos/page.tsx:88`). The right
pane updates synchronously — no network call, no debounce, no shared store. This is pure `useState`
local to `POSContent`.

> **Important:** this `PosCartItem[]` (`pos/page.tsx:16-21`) is an entirely separate type from the
> customer `CartItem` in `useCartStore`. The two never touch each other. There is no Zustand store
> and no `lib/order-payload.ts` used here (see Under the Hood §C).

---

### 09:15 — Thu Ngân taps "Tạo Đơn →"

The button is enabled because `cart.length > 0 && !createOrder.isPending`
(`pos/page.tsx:207`). The label flips to **"Đang tạo..."** while the mutation runs
(`pos/page.tsx:211`).

`createOrder.mutate()` fires one POST (`pos/page.tsx:91-97`):

```jsonc
POST /api/v1/orders
Authorization: Bearer <cashier JWT>       // injected by api-client.ts interceptor
{
  "customer_name":  "Khách tại quán",     // literal constant — pos/page.tsx:93
  "customer_phone": "0000000000",         // literal constant — pos/page.tsx:94
  "source":         "pos",
  "items": [
    { "product_id": "uuid-banh", "quantity": 2 },
    { "product_id": "uuid-canh", "quantity": 1 }
  ]
}
```

No `table_id`, no `topping_ids`, no `filling`, no `combo_id` — the POS builds `items` inline
(`pos/page.tsx:96`) and only sends `product_id + quantity`.

**What the BE does** (full trace in [staff_pos_be.md §3](staff_pos_be.md)):

1. `order_handler.go:88-92` — `callerRole != "customer"` → `callerID = claims.Subject` →
   `created_by` = cashier UUID (non-NULL, unlike QR/online orders).
2. `table_id` absent → `in.TableID == ""` → `GetActiveOrderByTable` skipped → `table_id` stored NULL.
3. `buildProductRow` → `GetProductSnapshot` resolves `name + unit_price` from DB (server-trusted prices;
   the FE-side `price` field is display-only and never accepted by the BE).
4. `RecalculateTotalAmount` = `SUM(unit_price × quantity)` inside the tx. With real DB prices:
   `35 000 × 2 + 10 000 × 1 = 80 000`.
5. `order_number` assigned from Redis `INCR order:seq:YYYYMMDD`, e.g. `ORD-20260616-042`.
6. Publishes `new_order` to `order:<id>` + `orders:kds` + `orders:admin`
   (`order_service.go:348-350`).
7. Returns `201 { data: { id: "uuid-order-42", table_busy: false } }`.

---

### 09:15:01 — Order created; POS switches to the waiting screen

`onSuccess` receives the new `Order` object (`pos/page.tsx:98-103`):

```ts
setActiveOrder(order)   // switches the render branch
setCart([])             // clears the right pane
toast.success(`Đã tạo đơn #ORD-20260616-042`)
```

Because `activeOrder` is now non-null, the component render returns the **waiting card** branch
(`pos/page.tsx:107-133`):

```
┌──────────────────────────┐
│  Đơn #ORD-20260616-042   │
│ ⏳ Bếp đang chuẩn bị...  │
│  Khi bếp hoàn thành,     │
│  bạn sẽ được chuyển đến  │
│  thanh toán tự động.     │
│                          │
│ [Đến thanh toán]  [Tạo   │
│                    đơn   │
│                    mới]  │
└──────────────────────────┘
```

Simultaneously, the `useEffect` WS subscriber fires because `activeOrder` changed
(`pos/page.tsx:55-70`). It registers a handler with `subscribe(fn)` and returns a cleanup that
removes it. From this moment the POS is watching for `order_status_changed` events that match
`msg.order_id === "uuid-order-42"`.

On the **KDS screen** (`/kds`) and **Admin Overview** (`/admin/overview`), the `new_order` publish
— which landed on `orders:kds` — is forwarded to every subscriber on that Redis channel,
including the shared WS session already open on those pages. The new card appears on both screens
live, with no page refresh.

---

### 09:17 — Lê Đầu Bếp cooks the order on KDS

Đầu Bếp sees `ORD-20260616-042` on the KDS screen. He marks each item as served (`qty_served++`).
When the last item on the order is served, `maybeAutoReady` triggers in
`order_service.go:745` — or, if he finishes manually, `PATCH /orders/:id/status` body
`{status:'ready'}` goes through `order_service.go:552`.

Either path publishes to `orders:kds`:

```json
{ "type": "order_status_changed", "order_id": "uuid-order-42", "status": "ready" }
```

---

### 09:17:03 — POS auto-redirects to `/cashier/payment/:id`

The `OrdersWSProvider` receives the WS message on its open socket (`OrdersWSContext.tsx:48-51`).
It fans the parsed `WsMsg` out to every registered handler via `handlersRef.current.forEach`.

The POS subscriber (`pos/page.tsx:58-67`) checks:

```
msg.type === 'order_status_changed'  ✓
msg.order_id === "uuid-order-42"     ✓
```

It calls `GET /orders/uuid-order-42`, verifies `order.status === 'ready'`, then:

```ts
toast.success('Đơn đã sẵn sàng — chuyển sang thanh toán')
router.push('/cashier/payment/uuid-order-42')
```

Thu Ngân is now on the payment screen. The POS page unmounts; the `useEffect` cleanup removes the
WS subscription handler. The shared WS socket itself stays alive for the rest of the dashboard
session (it belongs to `OrdersWSProvider`, not to the POS page).

If Thu Ngân does not want to wait, she can tap **"Đến thanh toán"** manually at any time
(`pos/page.tsx:118`) — this is an immediate `router.push` with no status check.

---

## Under the Hood

### A. Cross-Component Data Flow

The POS is a **single component** (`POSContent`, `pos/page.tsx:33`). All three pieces of state —
`selectedCategory`, `cart`, and `activeOrder` — live in its local `useState`. There is no shared
Zustand store, no `QueryClient` for order state, and no prop-drilling because there are no child
components that receive cart state: the product grid, the order pane, and the waiting card are all
inline JSX inside the same function.

This means cross-component dataflow (as defined by the `_crosscomponent_dataflow.md` format — "how
do multiple widgets share data through a store") is **not applicable** to this page. A separate
`staff_pos_crosscomponent_dataflow.md` would have nothing to describe: there are no widgets to
coordinate, just one component with its own local state.

`CategoryTabs` is the only imported component that receives a prop from `POSContent`
(`categories`, `selected`, `onSelect`); this is standard parent→child prop passing, not a
cross-component coordination pattern.

### B. Cross-Page Data Flow

The POS hands off to the rest of the system in two ways:

1. **The server order row.** The `orders` DB row (status `pending`, `source=pos`,
   `created_by=cashier UUID`, `table_id=NULL`) is the durable cross-page hub. It is the source of
   truth for `/cashier/payment/:id`, `/kds`, and `/admin/overview` — all three read from the same
   row. Full table → [staff_pos_crosspage_dataflow.md](staff_pos_crosspage_dataflow.md).

2. **The order id in the URL.** When `router.push('/cashier/payment/uuid-order-42')` runs, the
   payment page receives the id from the URL path; nothing else is passed in-browser
   (no localStorage, no Zustand) from POS to payment.

Downstream surfaces:

| Surface | What it receives | How |
|---|---|---|
| `/cashier/payment/:id` | order id via URL path | `router.push` |
| `/kds` | `new_order` WS event → card added live | Redis `orders:kds` pub → WS broadcast |
| `/admin/overview` | `new_order` WS event → floor list updated | Redis `orders:admin` pub → SSE/WS broadcast |

For the full cross-page durability matrix and reload behaviour →
[staff_pos_crosspage_dataflow.md](staff_pos_crosspage_dataflow.md).

### C. FE → BE Send (what crosses the wire)

```jsonc
POST /api/v1/orders
{
  "customer_name":  "Khách tại quán",
  "customer_phone": "0000000000",
  "source":         "pos",
  "items": [
    { "product_id": "<uuid>", "quantity": 2 },
    { "product_id": "<uuid>", "quantity": 1 }
  ]
}
```

Key differences from the customer QR/online payload:

- **Built inline, not via `lib/order-payload.ts`.** `pos/page.tsx:96` maps `cart` directly to
  `{ product_id, quantity }` pairs. `buildOrderItemsPayload` is never called (Flag 2 in
  [staff_pos_be.md](staff_pos_be.md)). Consequence: no `topping_ids`, no `combo_id`, no `filling`,
  no per-item `note`. The POS is a products-only, no-topping order channel.
- **No `table_id`.** POS orders are walk-in; the table-busy check is skipped server-side
  (`order_service.go:269-275`).
- **Placeholder identity literals** are stored verbatim as non-empty strings — not NULLed by
  `nullStr()` — every walk-in order in the DB shows `customer_name='Khách tại quán'`,
  `customer_phone='0000000000'` (Flag 3 in [staff_pos_be.md](staff_pos_be.md)).
- **Auth header is automatic.** The Axios interceptor in `lib/api-client.ts` injects
  `Authorization: Bearer <token>` from `useAuthStore`; Thu Ngân never touches it.

### D. BE → FE Receive / Live Updates

**HTTP response** (synchronous): `POST /orders` returns `201 { data: { id, table_busy: false } }`.
`onSuccess` receives the full `Order` object (`r.data?.data ?? r.data`, `pos/page.tsx:97`).

> 🟠 **CONFIRMED BUG (was ❓ — now resolved by reading the handler).** `order_handler.go:121` returns
> only `201 {data:{id, table_busy}}` — it does **not** use the `orderJSON` serializer, so the response
> carries **no `order_number`**. POS assigns this thin object as `order: Order` (`pos/page.tsx:97-99`)
> and reads `order.order_number` in the toast (`:101`) and the waiting card (`:111`) — both render the
> literal **"Đơn #undefined"** on every POS order. The redirect still works (it uses `order.id`).
> Full write-up + fix → [POS_BUGS.md Bug 1](POS_BUGS.md).

**WebSocket** (async): the shared `OrdersWSProvider` socket (`OrdersWSContext.tsx`) forwards events
from the `orders:kds` Redis channel to all registered handlers. The field shape the POS reads:

```ts
// WsMsg — OrdersWSContext.tsx:5-11
{
  type:        string      // "order_status_changed"
  order_id:    string      // must match activeOrder.id for the POS to act
  status?:     string      // "ready" triggers the redirect
  item_id?:    string      // not used by POS
  qty_served?: number      // not used by POS
}
```

The BE emits exactly this shape to `orders:kds` (`order_service.go:788-795`; field names
`type`/`order_id` confirmed matching — [staff_pos_be.md §5](staff_pos_be.md)).

**No replay on reconnect.** If the POS WS disconnects while the kitchen marks the order `ready`,
the `order_status_changed` event is lost. The POS will sit on the waiting screen indefinitely
until the next event on `orders:kds` re-triggers a check — or until Thu Ngân taps "Đến thanh
toán" manually. There is no snapshot or message queue in `wsHandler`
([staff_pos_be.md §Caching](staff_pos_be.md)).

### E. Loading States + Caching

**Catalog (on page open):** warm Redis cache → `GET /categories` + `GET /products` both return in
< 10 ms; the product grid renders before Thu Ngân can move her hand. Cold cache (first hit of the
day) → MySQL reads, then Redis backfill — still sub-100 ms for the product list. TanStack
`staleTime: 5 * 60 * 1000` (`pos/page.tsx:42,50`) means the catalog is re-fetched at most once
every 5 minutes, matching the Redis TTL. Worst-case staleness ≈ 10 minutes.

**"Tạo Đơn →" button:** disabled and relabelled `"Đang tạo..."` while `createOrder.isPending`
(`pos/page.tsx:207,211`). Thu Ngân cannot double-submit.

**Waiting screen:** there is no explicit loading indicator while waiting for the kitchen. The card
shows static text; the `GET /orders/:id` re-fetch inside the WS handler is fire-and-forget with a
silent `catch` (`pos/page.tsx:62-68`). The cashier has no visual signal of whether the re-fetch
succeeded or failed — she only sees the toast and the redirect.

Full per-state breakdown → [staff_pos_loading.md](staff_pos_loading.md).

### F. Monitoring

When Thu Ngân taps "Tạo Đơn →", the spike is visible in Grafana (`:3001`) on the **Request Rate**
panel within 15 seconds (Prometheus scrape interval). The `POST /orders` + the subsequent
`GET /orders/:id` both count.

The same order appears simultaneously on:

- **KDS** (`/kds`) — via `new_order` published to `orders:kds`; the order card appears before the
  toast on the POS has faded.
- **Admin Overview** (`/admin/overview`) — via `new_order` published to `orders:admin`
  ([staff_pos_be.md §3](staff_pos_be.md), `order_service.go:348-350`); the floor list and WaitingSection
  update live.

If `POST /orders` returns a 5xx, the `HighErrorRate` alert (`5xx > 5% over 5 min`) fires in
Prometheus and appears in the Grafana **Active Alerts** panel. If the BE is slow under load,
`SlowResponseTime` (`p95 > 500 ms`) would fire. See
[09_devops/MONITORING.md](../../../09_devops/MONITORING.md) for triage order.

---

## A to F on One Timeline (Thu Ngân's walk-in order)

```
09:14   POSContent mounts
          → AuthGuard + RoleGuard pass                               (role: cashier)
          → OrdersWSProvider WS already open (dashboard layout)      (D: shared WS)
          → GET /categories + GET /products (parallel)               (E: catalog cache)
          → product grid renders; cart = [], activeOrder = null      (A: local state only)

09:14:20 tap product cards × 3
          → addToCart() updates local cart[]                         (A: no network)
          → cartTotal recomputes inline (80 000 ₫)
          → WS subscriber is still no-op (activeOrder still null)    (D: not yet watching)

09:15   tap "Tạo Đơn →"
          → button → createOrder.mutate()
          → POST /orders { source:'pos', items:[…] }                 (C: inline items, no order-payload.ts)
          → BE: cashier created_by, table_id=NULL, server prices, recalc total
          → BE: publishes new_order → orders:kds + orders:admin      (F: KDS + admin update)
          → 201 { id, table_busy:false }

09:15:01 onSuccess: setActiveOrder(order); setCart([])
          → render switches to waiting card                          (A: local state flip)
          → useEffect fires → subscribe(fn) registered for orderId   (D: WS now watching)
          → KDS card + admin floor list update live                  (F: visible on other screens)

09:17   chef marks last item served on KDS
          → BE: maybeAutoReady → order.status = 'ready'
          → BE: publishes order_status_changed {status:'ready'} → orders:kds

09:17:03 WS message arrives at OrdersWSProvider
          → fans to POS handler: type matches, order_id matches      (D: WsMsg shape)
          → GET /orders/uuid-order-42 → status 'ready'
          → toast + router.push('/cashier/payment/uuid-order-42')    (B: cross-page handoff)
          → POS unmounts; WS handler cleaned up; shared WS stays open
```

---

## One-Line Mental Model

> The POS is a **self-contained, single-component** cashier tool: it builds an ephemeral local cart,
> fires one POST (products only, no toppings, no table), then blocks on a waiting screen until the
> shared KDS WebSocket delivers a `ready` signal — at which point the order id is the only thing
> handed to the payment page.

---

## Flags Surfaced by This Scenario

| # | Flag | Impact |
|---|---|---|
| 1 | **Category tabs are a display-only no-op** | POS sends `?category_id=` but BE ignores it ([staff_pos_be.md Flag 1](staff_pos_be.md)); all products are always returned regardless of tab. |
| 2 | **POS bypasses `lib/order-payload.ts`** | Inline `items` builder ([staff_pos_be.md Flag 2](staff_pos_be.md)) means no toppings, combos, filling, or per-item notes are ever reachable from the POS. |
| 3 | **Placeholder identity stored verbatim** | `'Khách tại quán'` / `'0000000000'` land in every POS order row; non-NULL and visible in reporting ([staff_pos_be.md Flag 3](staff_pos_be.md)). |
| 4 | **No replay on WS reconnect** | A `ready` event missed during a disconnect leaves the waiting screen stuck; cashier must tap "Đến thanh toán" manually ([staff_pos_be.md Flag 5](staff_pos_be.md)). |
| 5 | 🟠 CONFIRMED BUG | `POST /orders` response is thin `{id, table_busy}` (`order_handler.go:121`, no `order_number`) → waiting card + toast show **"Đơn #undefined"** on every POS order (`pos/page.tsx:101,111`). → [POS_BUGS.md Bug 1](POS_BUGS.md). |
