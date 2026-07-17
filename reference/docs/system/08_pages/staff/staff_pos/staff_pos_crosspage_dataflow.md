# Staff POS — Cross-Page Data Flow (the order, after it leaves `/pos`)

> **What this is:** ✅ implemented · the **cross-page** companion to [staff_pos.md](staff_pos.md).
> Once `/pos` POSTs an order, **how is that order shared across the pages and devices that outlive
> the POS screen** — the cashier payment page, the KDS board, and the admin overview floor?
>
> The defining difference from the customer flow: **POS keeps nothing in localStorage.** The
> `activeOrder` state that bridges the "waiting for kitchen" screen is pure `useState` — wiped on F5
> or page close. The only cross-page hub that survives is the **server order row** (MySQL + Redis
> pub/sub). Every downstream surface independently re-fetches it from BE.
>
> Traced from source on branch `experience_claude.md_system_1`:
> [`fe/src/app/(dashboard)/pos/page.tsx`](../../../../../fe/src/app/(dashboard)/pos/page.tsx) ·
> [`fe/src/context/OrdersWSContext.tsx`](../../../../../fe/src/context/OrdersWSContext.tsx) ·
> [`fe/src/app/(dashboard)/layout.tsx`](../../../../../fe/src/app/(dashboard)/layout.tsx) ·
> [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) ·
> [`fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx`](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx) ·
> [`fe/src/app/(dashboard)/kds/page.tsx`](../../../../../fe/src/app/(dashboard)/kds/page.tsx) ·
> [`fe/src/hooks/useOverviewWS.ts`](../../../../../fe/src/hooks/useOverviewWS.ts) ·
> [`fe/src/hooks/useAdminSSE.ts`](../../../../../fe/src/hooks/useAdminSSE.ts) ·
> [`be/internal/service/order_service.go`](../../../../../be/internal/service/order_service.go) ·
> [`be/internal/websocket/handler.go`](../../../../../be/internal/websocket/handler.go) ·
> [`be/internal/db/orders.sql.go`](../../../../../be/internal/db/orders.sql.go) ·
> BE facts → [staff_pos_be.md](staff_pos_be.md).
>
> Siblings: [staff_pos.md](staff_pos.md) · [staff_pos_be.md](staff_pos_be.md) ·
> [staff_pos_loading.md](staff_pos_loading.md) · [SCENARIO_POS_ORDER.md](SCENARIO_POS_ORDER.md) ·
> Downstream: [../staff_cashier_payment/staff_cashier_payment.md](../staff_cashier_payment/staff_cashier_payment.md) ·
> [../staff_kds/staff_kds.md](../staff_kds/staff_kds.md) ·
> [../../admin/admin_overview/admin_overview.md](../../admin/admin_overview/admin_overview.md)

---

## 0. The whole picture on one diagram

```
   ┌───────────────────────── ONE STAFF BROWSER (the cashier's device) ──────────────────────────────┐
   │                                                                                                    │
   │                  ┌──────────────── in-browser hub (POS) ──────────────────┐                       │
   │                  │  activeOrder   ░ useState (memory ONLY)                  │                       │
   │                  │                NO localStorage write at all              │                       │
   │                  └────────────────────────────────────────────────────────┘                       │
   │                     ▲ set on 201         ▲ read on WS event                                        │
   │                     │                    │                                                           │
   │  /pos ──POST /orders┘                    │ order_status_changed (status='ready')                    │
   │     │  setActiveOrder(order)              │── router.push('/cashier/payment/:id')                    │
   │     │  setCart([])   ░ in-memory only                                                               │
   │     │                                                                                               │
   │     ├── "Đến thanh toán" (manual) ──────────────────────────────────────▶ /cashier/payment/:id      │
   │     └── "Tạo đơn mới" ──────────▶ setActiveOrder(null)  (resets waiting screen only, no BE call)   │
   │                                                                                                    │
   │      shared WS — one socket per browser opened by (dashboard) layout                              │
   │      OrdersWSProvider  →  wss://.../ws/orders-live?token=...                                       │
   │      Redis channel subscribed: orders:kds  (handler.go:23 · layout.tsx:4)                         │
   └───────────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                                │
   ════════════════════════════ THE WIRE — the BE order row is the real hub ═════════════════════════════
                                                │
                               ┌────────────────▼─────────────────┐
                               │        one  order  row             │   MySQL (durable) + Redis (pub/sub)
                               │  id · status='pending'             │
                               │  source='pos' · table_id=NULL      │
                               │  created_by=<cashier UUID>         │
                               └──┬──────────────────────────────┬──┘
                  cashier side    │                               │         KDS / admin side
   ◀── GET /orders/:id ───────────┤                               ├──── new_order ──▶ orders:kds WS
   ◀── WS payment_success ────────┤                               ├──── new_order ──▶ orders:admin SSE
        (cashier payment opens     │                               ├──── order_status_changed ──▶ all WS subs
         its own WS to orders:kds) │                               │
                                   │   staff/chef acts on KDS       │
                                   │   PATCH /orders/:id/status ────┘ (fan-out triggers auto-redirect on /pos)
```

```
   LEGEND
   ──▶   navigation / HTTP call
   ◀──   WS/SSE push (server → browser)
   ░     memory only — dies on F5 / page close
   ▓     localStorage — survives F5
   ⚠️   POS has NO ▓ writes; all POS state is ░
```

**Read it like this:** the POS cashier's browser holds no persistent order state. The `activeOrder`
object (post-201) is pure React memory. The only datum that survives the POS screen is the **order
id embedded in the URL** when the cashier navigates to `/cashier/payment/:id`. The BE order row
is the single hub connecting every downstream page and every other device.

---

## 1. The status lifecycle every page renders against

All pages consume the same `OrderStatus` union
([`fe/src/types/order.ts:29-37`](../../../../../fe/src/types/order.ts)). For a POS order the
lifecycle has a narrower customer-facing concern — no table assignment, no floor tracking — but
every server-side transition is still published over Redis to every subscriber.

```
   POST /orders (source='pos', table_id=NULL)
        │
        ▼
   pending ──── (staff confirm on /kds) ──▶ confirmed ──── (chef starts) ──▶ preparing
                                                                                   │
                                                                    (all items served via KDS)
                                                                            maybeAutoReady fires
                                                                                   ▼
   POS auto-redirect ◀── WS order_status_changed (status='ready') ─────────── ready
        │  router.push('/cashier/payment/:id')
        ▼
   /cashier/payment/:id
        │
        └──── POST /payments { method } ──▶  paid   (order archived, leaves ACTIVE set)
```

| Status | Who sets it | POS sees (WS) | Cashier payment sees | KDS sees | Admin overview sees |
|---|---|---|---|---|---|
| `pending` | `POST /orders` (sql.go:27) | "⏳ Bếp đang chuẩn bị..." | `GET /orders/:id` on mount | `new_order` → ticket appears | `new_order` ping → `GET /orders/:id` → live cache |
| `confirmed` | staff on KDS | WS fires — but POS only reacts to `ready`; `confirmed` is silently swallowed | order status badge updates | ticket header updates | WS patch to `['orders','live']` |
| `preparing` | KDS | same as `confirmed` — no POS action | progress reflects item `qty_served` | item progress updates | WS patch |
| `ready` | KDS `maybeAutoReady` or manual | **auto-redirect** `router.push('/cashier/payment/:id')` (pos/page.tsx:66) | page destination after redirect | ticket removed from `ACTIVE_STATUSES` | WS patch |
| `paid` | payment webhook | (POS has navigated away; no subscription) | `window.print(); router.push('/pos')` (payment/[id]/page.tsx:91,119) | not shown (`ACTIVE_STATUSES` is `{pending,confirmed,preparing}`) | drops from `['orders','live']` |
| `cancelled` | staff (admin or KDS) | WS fires `order_status_changed`; POS re-fetches; `status !== 'ready'` → no redirect; cashier stuck on waiting screen | page shows stale cancelled order (no auto-navigate) | ticket removed | dropped → CancelLog |

> **`confirmed` and `preparing` are transparent to POS.** The subscription at `pos/page.tsx:58-67`
> checks `msg.type !== 'order_status_changed'` and `msg.order_id !== orderId` — only then re-fetches.
> After re-fetch it checks `order.status === 'ready'`. All intermediate events arrive but produce no
> action on the POS waiting screen.

---

## 2. The moment of handoff — what `/pos` leaves behind

This is the seam. The cross-component doc ends at cart submit. This file begins after `201`.

On `POST /orders` success (`pos/page.tsx:98-103`):

```
   POST /orders ──────────────▶ 201 { id, order_number, status:'pending', items[], total_amount }
        │
        │   ① setActiveOrder(order)    ░ useState — lives only while the POS tab is open
        │   ② setCart([])              ░ useState — empties cart in memory
        │   ③ toast.success(…)         no storage write of any kind
        ▼
   "Waiting for kitchen" screen renders  (still at /pos route — no router.push yet)
```

```
   STORAGE STATE THE INSTANT AFTER 201
   ┌───────────────────────────────────────────────────────────────┐
   │ ░ activeOrder = { id, order_number, status:'pending', … }      │  ← ONLY thing carrying the order id
   │ ░ cart        = []                                             │
   │                                                               │
   │ ▓ localStorage: NO write — zero keys added or changed         │  confirmed: storage-keys.ts has no
   │                                                               │  POS-specific key; pos/page.tsx has
   │                                                               │  no localStorage.setItem call
   └───────────────────────────────────────────────────────────────┘
```

`fe/src/lib/storage-keys.ts` defines exactly five keys:
`COOKIE_CONSENT`, `ORDER_CACHE`, `FAVOURITES`, `CUSTOMER_SETTINGS`, `CART_CONFIG` — none for POS.

| # | Write | Where it lands | Who reads it later | Source |
|---|---|---|---|---|
| ① | `setActiveOrder(order)` | ░ `useState` in `POSContent` | same component — WS handler (line 57), "Đến thanh toán" button (line 118) | `pos/page.tsx:99` |
| ② | `setCart([])` | ░ `useState` in `POSContent` | re-renders the empty order summary panel | `pos/page.tsx:100` |
| ③ | `order.id` in URL | `/cashier/payment/:id` path | `params.id` in `cashier/payment/[id]/page.tsx:49` — the only cross-page consumer | `pos/page.tsx:66` (auto) · `pos/page.tsx:118` (manual) |

> **Why no localStorage?** POS is a staff-internal fire-and-forget terminal, not a recoverable
> customer session. Staff losing the active order on F5 is acceptable — they can find it on
> `/admin/overview` or navigate directly to `/cashier/payment/:id`. Avoiding localStorage prevents
> leftover walk-in order ids that would never be cleaned up.

---

## 3. The shared WS — one socket per browser session, multiple subscribers

`OrdersWSProvider` is mounted once at `(dashboard)/layout.tsx:4`, wrapping every page inside the
`(dashboard)` route segment (KDS, cashier, admin overview, POS). A single WebSocket connection to
`ws://.../ws/orders-live?token=...` (which the BE subscribes to `orders:kds`,
`be/internal/websocket/handler.go:23`) is shared via React context. Individual pages attach and
detach handlers without opening additional sockets.

```
   (dashboard)/layout.tsx:4
       └── <OrdersWSProvider>         ← one socket: wss://.../ws/orders-live?token=...
                                         BE channel: orders:kds  (handler.go:18,23)
               ├── /pos/page.tsx            subscribe: auto-redirect handler  (pos/page.tsx:54-70)
               ├── /kds/page.tsx            subscribe: KDS tile updates        (kds/page.tsx:114)
               ├── /admin/overview/…        subscribe via useOverviewWS        (useOverviewWS.ts:10-19)
               └── /cashier/payment/[id]    opens its OWN dedicated WS         (payment/[id]/page.tsx:63-108)
                                            (same orders:kds channel, separate socket, for payment_success)
```

**POS subscription lifecycle** (`pos/page.tsx:55-70`):
- `useEffect` dependencies: `[subscribe, activeOrder, router]`
- When `activeOrder` is `null` (no order yet, or after "Tạo đơn mới") the effect returns early
  at line 56 — no handler is registered
- When `activeOrder` is set (post-201), the handler subscribes: on `order_status_changed` for
  `msg.order_id === activeOrder.id`, it re-fetches `GET /orders/:id` and redirects on `ready`
- Each `useEffect` re-run unregisters the previous handler (returned cleanup) before registering
  the new one — no leaks

**The cashier payment page opens its own WS** (`payment/[id]/page.tsx:63-108`), independent of the
shared `OrdersWSProvider` — it builds the connection inline solely to listen for `payment_success`.
This is a second parallel socket on the same `orders:kds` channel, active only while a payment is
`pending`.

---

## 4. `/cashier/payment/:id` — the downstream handoff target

POS hands off by placing the **order id in the URL** — either automatically via the WS redirect
(`pos/page.tsx:66`) or manually via "Đến thanh toán" (`pos/page.tsx:118`).

```
   /pos  ────── router.push('/cashier/payment/<id>') ──────▶  /cashier/payment/[id]
                            order id in URL                           │
                                                                      │ useQuery(['order', orderId])
                                                                      │   GET /orders/:id          (payment/[id]/page.tsx:56-60)
                                                                      │   ← authoritative snapshot
                                                                      │
                                                                      ├─ user selects payment method
                                                                      │
                                                                      ├─ POST /payments { order_id, method }    (line 112)
                                                                      │     ← returns Payment { id, status, qr_code_url }
                                                                      │
                                                                      ├─ COD → status='completed' immediately
                                                                      │         window.print(); router.push('/pos')   (line 119)
                                                                      │
                                                                      └─ QR methods → status='pending'
                                                                                  open dedicated WS listening for payment_success
                                                                                  on success: window.print(); router.push('/pos')  (line 91)
```

What the cashier payment page does NOT inherit from POS:
- No cart data — it fetches the order fresh from `GET /orders/:id`
- No `activeOrder` state — it reads `params.id` from the URL (`payment/[id]/page.tsx:49`)
- No POS-managed WS subscription — it opens its own socket independently

**Return path:** after successful payment, `router.push('/pos')` returns the cashier to `/pos`
with a fresh mount — `activeOrder = null`, cart empty, ready for the next order. There is no
"last order" memory on the POS side.

---

## 5. KDS — the order appears as a new ticket

KDS (`/kds`) subscribes to the shared `OrdersWSProvider` (`kds/page.tsx:114`). On `POST /orders`
from POS, the BE publishes `new_order` to `orders:kds` (`order_service.go:348`).

KDS initial load seeds its local `useState<Order[]>` by calling `GET /orders` and filtering to
`ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'preparing'])` (`kds/page.tsx:93, 102-110`).
Subsequent WS events patch that local state in memory.

```
   POS: POST /orders ─────▶ BE: CreateOrder ─────▶ Redis PUBLISH orders:kds { type:'new_order', order_id }
                                                          │
                                         ┌────────────────▼─────────────────────────────────────────────┐
                                         │  WS fan-out to every subscriber of orders-live connection      │
                                         │  ├── /kds: 'new_order' → GET /orders/:id → new tile           │
                                         │  │         beep() fires (kds/page.tsx:125)                    │
                                         │  ├── /pos: 'new_order' arrives but type !== 'order_status_    │
                                         │  │          changed' → silently dropped (pos/page.tsx:59)     │
                                         │  └── /admin/overview (useOverviewWS): same new_order path     │
                                         └───────────────────────────────────────────────────────────────┘
```

POS orders arrive at KDS with these distinguishing fields:
- `source = 'pos'` (`db.OrdersSourcePos`, order_service.go:317)
- `table_id = NULL` — KDS header shows no table label (KDS renders `order.table_id ? 'Bàn X' : 'Mang về'`, kds/page.tsx:214)
- `customer_name = 'Khách tại quán'` (hardcoded literal, pos/page.tsx:93)
- `created_by = <cashier UUID>` (non-NULL, set via `CreateOrderInput.CreatedBy`, order_service.go:224)

For full KDS rendering and ticket lifecycle see [../staff_kds/staff_kds.md](../staff_kds/staff_kds.md).

---

## 6. Admin Overview — the order lands in the live cache via two channels

Admin overview (`/admin/overview`) receives orders through two separate mechanisms:

1. `useAdminSSE` — SSE on `orders:admin`; fires `new_order` ping with `{ order_id, order_number, table_id }`
   (`useAdminSSE.ts:30-43`)
2. `useOverviewWS` — subscribes to the shared `OrdersWSProvider` WS; also receives `new_order`
   on `orders:kds` (`useOverviewWS.ts:21-30`)

Both paths call `GET /orders/:id` and insert the result into `['orders','live']` TanStack cache
if the order status is in `ACTIVE = {pending, confirmed, preparing, ready, delivered}`
(`useOverviewWS.ts:8, 25-29`).

```
   POS: POST /orders ─────▶ BE publish ──┬──▶ orders:admin SSE: new_order { id, order_number, table_id:null }
                                          │         │
                                          │         └──▶ useAdminSSE onNewOrder → GET /orders/:id
                                          │                   → inserts into ['orders','live'] cache
                                          │
                                          └──▶ orders:kds WS: new_order
                                                    └──▶ useOverviewWS: same hydrate path (redundant — no harm)
```

Because `table_id = NULL`, POS orders do not appear in any table-slot / floor-grid zones that QR
orders occupy. They appear in the flat active-order list, identifiable by `source = 'pos'` and the
`Khách tại quán` customer name.

For full admin overview zone breakdown see
[../../admin/admin_overview/admin_overview.md](../../admin/admin_overview/admin_overview.md).

---

## 7. Multi-device sync — one kitchen action, two staff devices move

```
   CHEF on KDS taps "served +1" on item X (POS order A)
        │
        ▼
   PATCH /orders/A/items/X ──▶ BE: qty_served++
                                   maybeAutoReady checks all items (order_service.go:727-745)
                                   ──▶ Redis PUBLISH orders:kds { type:'item_progress', order_id, item_id, qty_served }
        │
        │                ┌───────────────────────────────────────────────────────────────────────┐
        ▼                ▼                              ▼                                        ▼
   KDS device        POS device                   Admin overview                          other staff
   progress bar      WS receives item_progress    WS patch:                               (same)
   updates           type !== 'order_status_      ['orders','live'] item qty_served++
                     changed' → swallowed silently (useOverviewWS.ts:34-48)
```

When `maybeAutoReady` fires (all items done) — `order_service.go:745`:
```
   BE: PUBLISH orders:kds { type:'order_status_changed', order_id:'A', status:'ready' }
        │
        └──▶ POS WS handler (pos/page.tsx:58-67):
                 msg.type === 'order_status_changed' ✓
                 msg.order_id === activeOrder.id ✓
                 GET /orders/A → order.status === 'ready' ✓
                 router.push('/cashier/payment/A')   ← AUTOMATIC REDIRECT
```

```
   THE INVARIANT: no arrow goes device → device directly.
                  Every cross-device update is  device → BE → Redis pub/sub → device.
                  The BE order row is the single source; WS is its loudspeaker.
```

---

## 8. Cancellation / reverse flows

POS has no cancel button for the order it just created. Cancellation of a POS order can only come
from two surfaces:
1. **Admin overview** — `PATCH /orders/:id/status { status:'cancelled' }`
2. **KDS** — `patchOrderStatus` mutation (`kds/page.tsx:165-174`) can set any status including
   `cancelled` via the status-menu dropdown on each ticket

```
   ┌──────────────────┬─────────────────────────────────┬──────────────────────────────────────────┐
   │  WHO             │  ENDPOINT                        │  POS effect                               │
   ├──────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤
   │ Admin / KDS      │ PATCH /orders/:id/status         │ WS event arrives:                         │
   │ staff            │   { status:'cancelled' }         │ type='order_status_changed'               │
   │                  │                                  │ POS re-fetches → status !== 'ready'       │
   │                  │                                  │ → no auto-redirect                        │
   │                  │                                  │ → cashier stuck on waiting screen         │
   │                  │                                  │   until they tap "Tạo đơn mới"           │
   ├──────────────────┼─────────────────────────────────┼──────────────────────────────────────────┤
   │ Cashier (POS)    │ NONE — POS has no cancel button  │ "Tạo đơn mới" (pos/page.tsx:125)         │
   │                  │                                  │ calls setActiveOrder(null) only           │
   │                  │                                  │ NO cancel request sent to BE              │
   │                  │                                  │ → order row stays 'pending' (orphaned)    │
   └──────────────────┴─────────────────────────────────┴──────────────────────────────────────────┘
```

> **⚠️ FLAG — "Tạo đơn mới" orphans the active BE order.** When the cashier taps "Tạo đơn mới"
> (`pos/page.tsx:125`: `setActiveOrder(null)`), local state resets but no cancel request is sent.
> The pending order persists in MySQL and stays in the admin live cache until manually cancelled
> by staff. This is a known gap — owner to decide if a cancel mutation should wire to this button.

### Where a cancel lands on each surface

| Surface | Channel | Effect of `order_status_changed` (status=cancelled) |
|---|---|---|
| POS (active waiting screen) | WS `order_status_changed` | re-fetch fires; `status !== 'ready'` → no redirect; cashier sees no UI change (stuck on waiting screen) |
| `/cashier/payment/:id` | no handler for cancel events — WS only watches `payment_success` | page shows stale order; no auto-navigate away |
| KDS | WS `order_status_changed` | ticket removed: `!ACTIVE_STATUSES.has(msg.status)` → filter (kds/page.tsx:150-152) |
| Admin overview | WS `order_cancelled` or `order_status_changed` | dropped from `['orders','live']` → CancelLog zone (useOverviewWS.ts:66-68) |

---

## 9. End-to-end timeline — the POS order across all pages and devices

```
 Cashier       /pos              BE / Redis               /kds (chef)       Admin            /cashier/payment/:id
   │           (POSContent)                                                  overview               │
   │              │                   │                       │                 │                   │
   ├ Tạo Đơn ──▶ POST /orders ─────────┼───────────────────────┼─────────────────┼───────────────────┤
   │              │                   │  INSERT status='pending'│                 │                   │
   │              │                   │  source='pos'          │                 │                   │
   │              │                   │  table_id=NULL          │                 │                   │
   │              │◀── 201 {id,…} ────┤── PUBLISH orders:kds ──▶ new ticket       │                   │
   │              │  setActiveOrder   │── PUBLISH orders:admin ──────────────────▶ new_order ping     │
   │              │  setCart([])      │                         │   GET /orders/:id────────────────▶  │
   │              │                   │                         │   → live cache  │                   │
   │              │                   │                         │                 │                   │
   │              │  "⏳ Bếp đang     │                         │                 │                   │
   │              │  chuẩn bị..."     │                         │                 │                   │
   │              │                   │                         │                 │                   │
   │   (chef starts) ─────────────────┼─────────────────────────▶ PATCH confirmed │                   │
   │              │  WS: confirmed    │  status='confirmed'     │  ────────────────▶ WS patch          │
   │              │  → no action      │  PUBLISH orders:kds     │                 │                   │
   │              │                   │                         │                 │                   │
   │   (chef marks ready) ────────────┼─────────────────────────▶ PATCH ready     │                   │
   │              │  WS: ready        │  status='ready'         │  ────────────────▶ WS patch          │
   │              │  GET /orders/:id  │  PUBLISH orders:kds     │                 │                   │
   │              │  status='ready' ──┤                         │                 │                   │
   │              │  router.push ─────┼─────────────────────────┼─────────────────┼─────────────────▶ mount
   │              │  ('/cashier/      │                         │                 │   GET /orders/:id │
   │              │   payment/:id')   │                         │                 │   receipt renders │
   │              │                   │                         │                 │                   │
   │  (cashier selects COD) ──────────┼─────────────────────────┼─────────────────┼── POST /payments ─┤
   │              │                   │  payment row created     │                 │  { method:'cod' } │
   │              │                   │  status='completed'      │                 │                   │
   │              │                   │  PUBLISH orders:kds      │                 │◀── 201 Payment    │
   │              │                   │   payment_success        │                 │  window.print()   │
   │              │                   │                         │                 │  router.push('/pos')
   │              │                   │                         │                 │                   │
   │              │  ░ activeOrder=null (fresh mount — no memory)│                 │                   │
   │              │  ░ cart=[]                                   │                 │                   │
   ▼              ▼  cashier starts next order                   ▼                 ▼                   ▼
```

---

## 10. Reload (F5) behavior per page

The POS stack is almost entirely memory-based. The split between `░` (dies on F5) and `▓`
(survives) is stark compared to the customer flow.

| Page | URL has order id? | State on reload | Outcome |
|---|---|---|---|
| `/pos` (cart phase) | no | ░ cart wiped, ░ selectedCategory reset | blank cart — cashier re-selects items |
| `/pos` (waiting for kitchen) | no | ░ activeOrder wiped | back to blank cart — WS never replays the `201`; cashier must find the order via admin or navigate to `/cashier/payment/:id` manually |
| `/cashier/payment/:id` | YES (`:id` in URL) | `useQuery(['order', orderId])` re-fetches `GET /orders/:id` | full recovery — order data reloads from BE; ░ payment state lost but cashier can restart POST /payments |
| `/kds` | no | `GET /orders` on mount, filter `ACTIVE_STATUSES` (kds/page.tsx:102-110) | tickets re-render from active orders; no localStorage dependency |
| `/admin/overview` | no | `['orders','live']` TanStack cache cold — BE re-fetched on `new_order` events | live cache repopulated; no localStorage dependency |

> **The POS-specific gotcha:** after `/pos` reloads during the "waiting for kitchen" phase, the
> cashier has no in-browser pointer to the pending order. The order still exists on the BE. Recovery
> options: (a) check `/admin/overview` for the pending POS order, or (b) navigate directly to
> `/cashier/payment/<id>` if the id was noted. There is no recovery UI on `/pos` itself.

---

## 11. Durability matrix — what survives what

| Datum | Lives in | Survives F5? | Survives new device? | Scope |
|---|---|---|---|---|
| `cart` items, prices | ░ `useState` | ❌ | ❌ | `/pos` only, pre-POST |
| `selectedCategory` | ░ `useState` | ❌ | ❌ | `/pos` only |
| `activeOrder` (full Order object) | ░ `useState` | ❌ | ❌ | `/pos` only, post-POST waiting screen |
| order id (in redirect URL) | the URL `/cashier/payment/:id` | ✅ (bookmarkable) | ✅ (shareable) | `/cashier/payment/[id]` only |
| `payment`, `method` | ░ `useState` | ❌ | ❌ | `/cashier/payment/[id]` only |
| **the order row** | **BE (MySQL)** | ✅ | ✅ | every page, every device |
| Redis pub/sub events | ephemeral | ❌ (no replay on reconnect) | ❌ | in-flight only; missed during disconnect |

> **The mental model in one line:** `/pos` is a fire-and-forget terminal — it writes one server
> row, hands off the id in the URL, and remembers nothing. Every downstream page (cashier payment,
> KDS, admin overview) keeps itself fresh from its own BE fetch or WS subscription, independently
> of the POS that created the order.

---

## 12. Source & rule map

| Topic | Source of truth |
|---|---|
| POS on-page (cross-component) flow | [staff_pos.md](staff_pos.md) |
| All BE endpoints (POST /orders, GET /orders/:id, WS) | [staff_pos_be.md](staff_pos_be.md) |
| Order object fields and status enum | [`fe/src/types/order.ts:29-52`](../../../../../fe/src/types/order.ts) · [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) |
| No POS localStorage write — confirmed | [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) · [`pos/page.tsx:98-103`](../../../../../fe/src/app/(dashboard)/pos/page.tsx) |
| POS WS subscription (auto-redirect at `ready`) | [`fe/src/app/(dashboard)/pos/page.tsx:54-70`](../../../../../fe/src/app/(dashboard)/pos/page.tsx) |
| Shared WS provider (one socket per browser session) | [`fe/src/context/OrdersWSContext.tsx`](../../../../../fe/src/context/OrdersWSContext.tsx) |
| Layout mounts `OrdersWSProvider` | [`fe/src/app/(dashboard)/layout.tsx:4`](../../../../../fe/src/app/(dashboard)/layout.tsx) |
| WS BE handler — subscribes `orders:kds` | [`be/internal/websocket/handler.go:18-24`](../../../../../be/internal/websocket/handler.go) |
| `publishOrderEvent` — dual publish to `order:<id>` + `orders:kds` | [`be/internal/service/order_service.go:806-819`](../../../../../be/internal/service/order_service.go) |
| `publishAdminOrderEvent` — publish to `orders:admin` | [`be/internal/service/order_service.go:821-829`](../../../../../be/internal/service/order_service.go) |
| `maybeAutoReady` — auto `status=ready` on last served item | [`be/internal/service/order_service.go:727-745`](../../../../../be/internal/service/order_service.go) |
| Order insert hardcodes `status='pending'` | [`be/internal/db/orders.sql.go:26-27`](../../../../../be/internal/db/orders.sql.go) |
| KDS initial load query + `ACTIVE_STATUSES` | [`fe/src/app/(dashboard)/kds/page.tsx:93,102-110`](../../../../../fe/src/app/(dashboard)/kds/page.tsx) |
| Cashier payment page — WS for `payment_success`, return to `/pos` | [`fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx:63-91,119`](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx) |
| Admin overview live-cache WS handler | [`fe/src/hooks/useOverviewWS.ts`](../../../../../fe/src/hooks/useOverviewWS.ts) |
| Admin overview SSE new-order hook | [`fe/src/hooks/useAdminSSE.ts`](../../../../../fe/src/hooks/useAdminSSE.ts) |
| Realtime channel config + reconnect backoff | [staff_pos_be.md](staff_pos_be.md) |
| Loading states per page in this flow | [staff_pos_loading.md](staff_pos_loading.md) |
| End-to-end walk-in scenario | [SCENARIO_POS_ORDER.md](SCENARIO_POS_ORDER.md) |
