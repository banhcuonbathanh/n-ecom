# KDS — Kitchen Display — Cross-Page Data Flow (how orders reach and leave the board)

> **What this is:** the **cross-page** companion to
> [staff_kds.md](staff_kds.md).
> That file answered *"what does the KDS board look like?"* — this one answers the structural
> question: **since the KDS holds ALL of its state in local React `useState` and persists nothing,
> how do orders arrive from other pages, advance through the kitchen, and fan back out to every
> other surface?**
>
> The KDS is a **live consumer, not an originator of durable state.** It does not create orders,
> it does not write to localStorage, and it has no Zustand store. Its only writes are `PATCH`
> mutations that mutate the **shared server order row** — the real cross-page hub. That row, plus
> the Redis `orders:kds` pub/sub channel, is how the KDS fits into the wider system.
>
> ✅ Implemented. Traced from source on branch `experience_claude.md_system_1`.
> Sources:
> [`fe/src/app/(dashboard)/kds/page.tsx`](../../../../../fe/src/app/(dashboard)/kds/page.tsx) ·
> [`fe/src/context/OrdersWSContext.tsx`](../../../../../fe/src/context/OrdersWSContext.tsx) ·
> [`fe/src/hooks/useOverviewWS.ts`](../../../../../fe/src/hooks/useOverviewWS.ts) ·
> [`be/internal/service/order_service.go`](../../../../../be/internal/service/order_service.go) ·
> [`be/internal/websocket/handler.go`](../../../../../be/internal/websocket/handler.go) ·
> [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts)
>
> Sibling files:
> [staff_kds.md](staff_kds.md) ·
> [staff_kds_be.md](staff_kds_be.md) ·
> [staff_kds_loading.md](staff_kds_loading.md) ·
> [SCENARIO_KDS_COOK.md](SCENARIO_KDS_COOK.md) ·
> [KDS_BUGS.md](KDS_BUGS.md)

---

## 0. The whole picture on one diagram

```
   ┌───────────────── ORIGINATORS (pages that CREATE orders) ──────────────────┐
   │                                                                            │
   │  Customer /menu     →  POST /orders  ┐                                    │
   │  Customer /checkout →  POST /orders  ├─▶  BE creates row (status:pending) │
   │  Staff /pos         →  POST /orders  ┘                                    │
   └────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │  publishOrderEvent("new_order", orderID)
                                  │  publishAdminOrderEvent(orderID, …)
                                  ▼
   ┌──────── SERVER HUB ─────────────────────────────────────────────────────────┐
   │                                                                              │
   │   MySQL orders row (id · status · items[qty_served])        ← durable       │
   │   Redis pub/sub:                                                             │
   │     "orders:kds"   ← ALL order events (new_order · item_progress ·          │
   │                       order_status_changed · order_cancelled)                │
   │     "order:<id>"   ← per-order events (same payload — for customer SSE)     │
   │     "orders:admin" ← new_order only (for admin SSE/useAdminSSE)             │
   └──────────────────────────────────────────────────────────────────────────────┘
                │                               │
                │  WS /ws/orders-live           │  WS /ws/kds  (same handler,
                │  (LiveHandler → orders:kds)   │   same channel)
                ▼                               ▼
   ┌──── ADMIN /admin/overview ────┐   ┌──── STAFF /kds ───────────────────────┐
   │  useOverviewWS (hooks/)       │   │  useOrdersWSContext (context/)         │
   │  TanStack ['orders','live']   │   │  local useState<Order[]> page.tsx:97   │
   │  ▓ server state (no persist)  │   │  ░ MEMORY ONLY — dies on F5            │
   └───────────────────────────────┘   └────────────────────────────────────────┘
                                                        │
                             KDS writes ────────────────┤
                             PATCH /orders/:id/status   │ → publishOrderEvent
                             (e.g. status:"ready")      │   → orders:kds fan-out
                             PATCH /orders/items/:id    │ → publishItemEvent
                             (intended; currently 404 — │   → orders:kds fan-out
                              see KDS_BUGS.md Bug 1)    │
                                                        ▼
                                             fan-out recipients:
                                             KDS board itself  (via WS)
                                             Admin live floor  (via WS)
                                             Customer /order/<id>  (via SSE order:<id>)
                                             Customer /tracking    (via SSE order-monitor)
```

```
   LEGEND
   ▓  = TanStack Query cache (server state, no localStorage, dies on F5 but refetchable)
   ░  = React useState  (memory, dies on F5, re-seeded from GET /orders)
   ──▶ navigation / HTTP POST       ◀── SSE/WS push (server → browser)
   THE WIRE = the one BE MySQL order row + Redis pub/sub fan-out
```

**Read it like this.** Orders are born on three different originator pages. Each POST publishes
`new_order` to `orders:kds` (and a separate ping to `orders:admin`). The shared WS connection
(`OrdersWSContext`) receives it on every dashboard tab — KDS and the admin overview — and each
subscriber independently re-fetches `GET /orders/:id` to hydrate. When the KDS advances an order
(status or item qty), the BE publishes back to `orders:kds`; the same WS loop delivers the delta to
**every connected dashboard tab** (N KDS screens, N admin overviews) and simultaneously to the
**customer's SSE channels**. No browser ever talks directly to another browser; all paths go through
THE WIRE.

---

## 1. The status lifecycle every page renders against

All pages render the same `OrderStatus` type. Full lifecycle definition and status-transition rules
live at:
[`../../../02_spec/object/OBJECT_MODEL_ORDER.md`](../../../02_spec/object/OBJECT_MODEL_ORDER.md) ·
[`../../../07_business_logic/BUSINESS_RULES.md`](../../../07_business_logic/BUSINESS_RULES.md)

The KDS sees a **strict subset**: it holds only orders whose status is in `ACTIVE_STATUSES =
{pending, confirmed, preparing}` ([`kds/page.tsx:93`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L93)):

```
   POST /orders → pending ──▶ confirmed ──▶ preparing ──▶ ready ──▶ delivered
                                                                │
                                    cancelled ◀────────────────┘  (any active state)
                                    paid (after payment — not shown on KDS)

   KDS board renders:   pending ✅  ·  confirmed ✅  ·  preparing ✅
   KDS drops from board: ready · delivered · cancelled  (via WS events or status filter)

   Per-item within an order:
     qty_served=0         → "còn ×N" (pending)
     0 < qty_served < qty → progress (preparing)
     qty_served ≥ qty     → strikethrough ✓ (done)
     maybeAutoReady fires when ALL items are done → order_status_changed:"ready"
     → WS event → KDS filters it out (ready ∉ ACTIVE_STATUSES)
```

| Status transition | Who triggers it | How KDS learns | KDS board effect |
|---|---|---|---|
| `pending` (new) | Any originator POST | `new_order` WS → refetch `GET /orders/:id` | Card prepended, beep |
| `confirmed` | Staff (admin overview confirm) | `order_status_changed` WS | Badge updates, stays on board |
| `preparing` | Staff / KDS or admin status pick | `order_status_changed` WS | Badge updates, stays on board |
| `ready` | KDS (`patchOrderStatus`) or `maybeAutoReady` | `order_status_changed` WS (status=ready → ∉ ACTIVE) | Card removed |
| `cancelled` | Guest or staff | `order_cancelled` WS | Card removed |
| `delivered` / `paid` | Cashier / payment | `order_status_changed` WS (∉ ACTIVE) | Card removed |

---

## 2. The moment of handoff — what the KDS leaves behind

> **This section is fundamentally different for the KDS compared to an originator page like
> `/menu`.** The KDS *has no browser-side moment of handoff*. It holds NO localStorage keys, NO
> persisted Zustand slices, NO URL-embedded ids that carry forward. When the KDS writes, it
> writes to the **server** (PATCH mutations → MySQL row). That server mutation is the handoff; the
> downstream pages learn about it over the WS/SSE wire.

```
   KDS WRITES ──────────────────────────────────────────────────────────────────────────────────
   │
   ├─ PATCH /orders/:id/status  { status: "ready" | "cancelled" }
   │       page.tsx:165-174 · patchOrderStatus mutation
   │       → UpdateOrderStatus service (order_service.go:533-555)
   │       → MySQL: orders.status updated
   │       → publishOrderEvent("order_status_changed", orderID, {Status:newStatus})
   │          ├─ Redis "order:<id>"   → customer SSE /orders/:id/events
   │          └─ Redis "orders:kds"  → WS → all KDS + admin floor
   │
   └─ PATCH /orders/items/:id  { qty_served: N }      ← INTENDED; currently 404, see KDS_BUGS.md Bug 1
           page.tsx:159-163 · patchItemStatus mutation  (broken: calls wrong path /orders/:id/items/:id/status)
           → UpdateItemServed service (order_service.go:701-723) [when correctly wired]
           → MySQL: order_items.qty_served updated
           → publishItemEvent("item_progress", …)  (order_service.go:998-1009)
              ├─ Redis "order:<id>"   → customer SSE
              └─ Redis "orders:kds"  → WS → all KDS + admin floor
           → maybeAutoReady: if all items done → UpdateOrderStatus("ready") → publishOrderEvent
```

**Nothing the KDS leaves in the browser survives the tab close or F5.** The `statusMenus` and
`flagged` Sets ([`kds/page.tsx:99-100`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L99)) are
pure UI ephemera — they control inline pickers and highlight borders and have no server-side
representation.

**Storage written by KDS: none.** Confirmed: `STORAGE_KEYS` has no KDS entry
([`storage-keys.ts:1-7`](../../../../../fe/src/lib/storage-keys.ts)).

---

## 3. Downstream surface — Admin live floor (`/admin/overview`)

The admin overview is on the **same WS channel** as the KDS (`orders:kds`), via the same shared
`OrdersWSContext` / `useOverviewWS`. Both are under the `(dashboard)` layout, which wraps its
children in `<OrdersWSProvider>` ([`(dashboard)/layout.tsx:1-4`](../../../../../fe/src/app/(dashboard)/layout.tsx)). One WebSocket connection per browser session is shared across all tabs.

```
   KDS:  patchOrderStatus → BE → orders:kds publish
                                        │
                                        ▼  (same WS, same event)
   Admin overview: useOverviewWS.ts (hooks/useOverviewWS.ts:10-75)
     switch(msg.type):
       'order_status_changed' → if status ∈ ACTIVE → update ['orders','live'] entry
                             → if status ∉ ACTIVE (e.g. ready → cashier flow) → drop from list
       'order_cancelled'      → drop from ['orders','live']
       'item_progress'        → patch qty_served in ['orders','live'] entry
```

Key difference in the admin `ACTIVE` set vs KDS: admin keeps `{pending, confirmed, preparing,
**ready**, **delivered**}` ([`useOverviewWS.ts:8`](../../../../../fe/src/hooks/useOverviewWS.ts#L8))
— so when the KDS marks an order `ready`, the admin overview **keeps it** (for cashier handoff)
while the KDS board drops it.

Also on `new_order`: admin receives a **separate** ping via `"orders:admin"` Redis channel →
`useAdminSSE` (SSE, not WS) which shows a toast. The KDS receives the same `new_order` over
`orders:kds`. These are two independent delivery paths for the same logical event.

---

## 4. Downstream surface — POS (`/pos`)

The POS page also subscribes to `useOrdersWSContext()` ([`pos/page.tsx:10,54`](../../../../../fe/src/app/(dashboard)/pos/page.tsx#L10)):

```
   KDS marks order "ready" → order_status_changed:{status:"ready"} → orders:kds
                                │
                                ▼
   POS: subscribes via useOrdersWSContext().subscribe (pos/page.tsx:54)
        updates its own local state to reflect status change
        (cashier can then proceed to payment for ready orders)
```

The POS and KDS share the same physical WS socket but register separate subscriber callbacks.
They never share React state directly; each manages its own local `useState`.

---

## 5. Downstream surface — Customer pages (SSE, separate wire)

When the KDS advances an order, the customer feels it over a **completely separate channel**
(`order:<id>` Redis → customer SSE `/orders/:id/events` or `/sse/order-monitor/:id`). The
customer's phone is **never** on `orders:kds`.

```
   KDS: PATCH /orders/:id/status → BE → publishOrderEvent
        → Redis "order:<id>"    ← customer /order/<id> page useOrderSSE
        → Redis "orders:kds"    ← KDS/admin WS  (orthogonal channel)

   Customer /order/<id>:  useOrderSSE receives order_status_changed
     • status → "preparing": progress bar animates
     • status → "ready":  toast "sẵn sàng phục vụ", SSE continues
     • status → "cancelled": modal "đã huỷ", SSE stops

   Customer /tracking:  useOrderMonitorSSE receives order.status
     • TableInfoBanner badge updates in real-time
     • WholeFloorPrepList re-sorts (queue.update pushed by publishMonitorBroadcast)
```

`publishMonitorBroadcast` is called on every `UpdateOrderStatus`
([`order_service.go:553`](../../../../../be/internal/service/order_service.go#L553)) — it rebuilds
the queue+tables snapshot and pushes it to `order-monitor:<tableId>` channels, so the customer
tracking page's ETA and queue position update whenever the KDS touches any order.

Full customer-side SSE mechanic: [../customer_menu/customer_menu_crosspage_dataflow.md §5–§7](../customer_menu/customer_menu_crosspage_dataflow.md).

---

## 6. Multi-device sync — N KDS screens, one event

Because `orders:kds` is a Redis broadcast channel, **every tab subscribed to it** receives the
same event simultaneously. In practice this means:

```
   Kitchen screen 1 (KDS)  ┐
   Kitchen screen 2 (KDS)  ├─ all subscribe to orders:kds via OrdersWSContext
   Admin overview device   ┘

   Staff taps "ready" on screen 1:
     PATCH /orders/:id/status → BE → Redis publish "orders:kds" {order_status_changed, status:ready}
        │
        ├─▶ screen 1 KDS WS onmessage → setOrders filter (removes card) [page.tsx:150-153]
        ├─▶ screen 2 KDS WS onmessage → setOrders filter (removes card) — SAME EVENT
        └─▶ admin overview WS onmessage → useOverviewWS patch (keeps card, badge → ready)
```

The fan-out is guaranteed by Redis pub/sub — not by any FE broadcast or shared store. Each browser
maintains its own independent WS connection through `OrdersWSContext`; they stay in sync only
because they are all downstream of the same Redis channel.

**Idempotency:** The KDS `new_order` handler deduplicates by `order.id` before prepending
([`kds/page.tsx:121-123`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L121)). `order_status_changed`
simply maps over the existing array and drops non-ACTIVE orders, so receiving the same event
twice is harmless.

---

## 7. Cancellation / reverse flows

An order can be cancelled from three places; all converge on the same `order_cancelled` event
to `orders:kds`:

```
   ┌─────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
   │ Guest cancels               │ Admin cancels                │ KDS cancels                  │
   ├─────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
   │ DELETE /orders/:id          │ PATCH /orders/:id/status     │ PATCH /orders/:id/status     │
   │ CancelOrder service         │ {status:"cancelled"}          │ {status:"cancelled"}          │
   │ order_service.go:557-594    │ UpdateOrderStatus svc        │ page.tsx:272                  │
   │                             │ order_service.go:533-555     │                              │
   ├─────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
   │ publishOrderEvent           │ publishOrderEvent            │ publishOrderEvent            │
   │ ("order_cancelled", id)     │ ("order_status_changed",     │ ("order_status_changed",     │
   │ → order:<id> + orders:kds   │  id, {Status:"cancelled"})   │  id, {Status:"cancelled"})   │
   │                             │ → order:<id> + orders:kds    │ → order:<id> + orders:kds    │
   └─────────────────────────────┴──────────────────────────────┴──────────────────────────────┘
```

> **Note:** guest `DELETE` publishes `order_cancelled`; admin/KDS `PATCH status=cancelled`
> publishes `order_status_changed` with `status:"cancelled"`. The KDS handles both events and drops
> the card in both cases ([`kds/page.tsx:145-153`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L145)).
> The admin overview (`useOverviewWS`) also handles both events as drops
> ([`useOverviewWS.ts:51-68`](../../../../../fe/src/hooks/useOverviewWS.ts#L51)).

| Surface | Event received | Effect |
|---|---|---|
| KDS board | `order_cancelled` OR `order_status_changed:{status:cancelled}` | `setOrders filter(o.id !== msg.order_id)` — card removed |
| Admin floor | same events | dropped from `['orders','live']` → CancelLog / Zone F |
| Customer `/order/<id>` | `order_cancelled` via SSE `order:<id>` | "đã bị huỷ" modal if admin cancelled; toast+navigate if self-cancelled |
| Customer `/tracking` | `order.status` via SSE monitor | TableInfoBanner → cancelled |

---

## 8. End-to-end timeline — from order birth to KDS completion

```
 Originator       BE / Redis          orders:kds WS        KDS board           Admin floor
   │                  │                     │                   │                   │
   ├─ POST /orders ──▶│ create row          │                   │                   │
   │  (status:pending)│ publishOrderEvent   │                   │                   │
   │                  │ ("new_order", id) ──┼──── broadcast ───▶│ new_order handler │ new_order handler
   │                  │ publishAdminOrder   │   (orders:kds)    │ GET /orders/:id   │ (via orders:admin
   │                  │ (orders:admin)      │                   │ → prepend card    │  useAdminSSE ping)
   │                  │                     │                   │ beep()            │ GET /orders/:id
   │                  │                     │                   │                   │ → ['orders','live']
   │                  │                     │                   │                   │
   │  (staff confirm via admin)             │                   │                   │
   │                  │◀─ PATCH status ─────────────────────────────────────────────┤
   │                  │ "confirmed"         │                   │                   │
   │                  │ publishOrderEvent ──┼──── broadcast ───▶│ order_status_changed
   │                  │                     │                   │ → badge: confirmed│
   │                  │                     │                   │ (still on board)  │
   │                  │                     │                   │                   │
   │  (KDS: mark "preparing")               │                   │                   │
   │                  │◀─ PATCH status ─────┼───────────────────┤                   │
   │                  │ "preparing"         │                   │                   │
   │                  │ publishOrderEvent ──┼──── broadcast ───▶│ badge: preparing  │ patch badge
   │                  │                     │                   │                   │
   │  [item serves — currently 404 Bug 1]   │                   │                   │
   │                  │                     │                   │                   │
   │  (KDS: mark "ready")                   │                   │                   │
   │                  │◀─ PATCH status ─────┼───────────────────┤                   │
   │                  │ "ready"             │                   │                   │
   │                  │ publishOrderEvent ──┼──── broadcast ───▶│ status ∉ ACTIVE   │ status ∈ ACTIVE
   │                  │                     │   order_status_changed → card REMOVED │ badge:ready,stays
   │                  │                     │                   │                   │ (cashier can pay)
   │                  │                     │                   │                   │
   │  (cashier payment → delivered → paid)  │                   │                   │
   │                  │ publishOrderEvent ──┼──── broadcast ───▶│ (already gone)    │ dropped from live
   │                  │                     │                   │                   │
```

---

## 9. Reload (F5) behavior

The KDS is the starkest example of an entirely memory-resident page:

```
   PAGE          HAS URL id?  BROWSER STORAGE                ON F5
   ──────────    ───────────  ──────────────────────────────  ───────────────────────────────────────
   /kds          no           NONE — no localStorage, no      Board empties completely (useState=[])
                              persisted Zustand                → GET /orders refetches (staleTime:30s)
                                                              → WS re-subscribes (OrdersWSProvider
                                                                re-connects via (dashboard)/layout)
                                                              → statusMenus/flagged Sets reset to ∅
                              ░ All UI state gone             (no half-open pickers, no flags)

   /admin/overview  no        NONE (server state only)        TanStack cache cold-starts
                                                              → useOverviewWS re-subscribes
   /order/<id>  YES (URL)     ▓ order_cache_<id> in           Full recovery — reads cache instantly,
                              localStorage                     then GET /orders/:id, then SSE resumes
   /tracking    no            ▓ activeOrderId persisted       Recovers if activeOrderId is set
```

**Beep on reload:** the KDS uses a Web Audio `AudioContext`
([`kds/page.tsx:9-26`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L9)) stored in a `useRef`.
After F5 the ref is fresh — any `new_order` event that arrives while the page was down and replays
via GET /orders initial load does **not** trigger a beep (the beep fires only on live WS
`new_order` events, not on the initial GET hydration).

---

## 10. Durability matrix

| Datum | Lives in | Survives F5? | Survives new device? | Scope |
|---|---|---|---|---|
| `orders` board state | ░ React `useState` (`kds/page.tsx:97`) | ❌ | ❌ | `/kds` only, reconstructed from GET /orders + WS |
| `statusMenus` (open pickers) | ░ React `useState` (`page.tsx:99`) | ❌ | ❌ | `/kds` only |
| `flagged` (⚑ inspection set) | ░ React `useState` (`page.tsx:100`) | ❌ | ❌ | `/kds` only |
| WS connection | ░ `OrdersWSContext` / `useEffect` (`context/OrdersWSContext.tsx:32`) | ❌ (reconnects) | ❌ | all `(dashboard)` pages |
| **order row** | **MySQL orders table** | ✅ | ✅ | **every page, every device** |
| `orders:kds` Redis channel | Redis pub/sub | ❌ (no replay) | N/A | delivery only — no history |

> **The mental model in one line:** the KDS is a dumb display of the server's truth — it holds
> nothing of its own beyond the current render. The BE MySQL row is the only durable hub; the KDS
> is just one of several loudspeakers wired to it via `orders:kds`.

---

## 11. Security / role note

The WS endpoint (`/ws/orders-live`) has **no authMW and no role gate** on the route group
([`main.go:337`](../../../../../be/cmd/server/main.go#L337)). Auth is a `?token=` query param
parsed inside `wsHandler` ([`websocket/handler.go:40`](../../../../../be/internal/websocket/handler.go#L40)),
but the JWT claims are **discarded** (`_, err := jwtpkg.ParseToken(token)`). Any signature-valid,
unexpired JWT — including a **customer guest token** — can subscribe to `orders:kds` and receive
every order event on the restaurant floor.

This is a **cross-page security concern** shared with the admin overview (also on `orders:kds`
via `LiveHandler`). Logged in [staff_kds_be.md Flags §Flags](staff_kds_be.md#flags).

The HTTP mutations (`PATCH /orders/:id/status`, `PATCH /orders/items/:id`) are properly gated
behind `authMW + AtLeast("chef")` — a guest token cannot advance order status over REST even if
it can receive WS events.

---

## 12. Source & rule map

| Topic | Source of truth |
|---|---|
| KDS page zones / wireframe / object model | [staff_kds.md](staff_kds.md) |
| BE endpoints, auth, caching, WS events | [staff_kds_be.md](staff_kds_be.md) |
| Known code bugs (item-serve 404 · UUID label) | [KDS_BUGS.md](KDS_BUGS.md) |
| Order object model / status enum fields | [`../../../02_spec/object/OBJECT_MODEL_ORDER.md`](../../../02_spec/object/OBJECT_MODEL_ORDER.md) |
| Realtime channels (SSE + WS config, reconnect) | [`../../../03_be/REALTIME_SSE.md`](../../../03_be/REALTIME_SSE.md) |
| Business rules (cancel gate, auto-ready, 30% rule) | [`../../../07_business_logic/BUSINESS_RULES.md`](../../../07_business_logic/BUSINESS_RULES.md) |
| Customer-side crosspage flow (SSE fan-out detail) | [`../customer_menu/customer_menu_crosspage_dataflow.md`](../customer_menu/customer_menu_crosspage_dataflow.md) |
| KDS loading states | [staff_kds_loading.md](staff_kds_loading.md) |
| Narrative scenario (cook walk-through) | [SCENARIO_KDS_COOK.md](SCENARIO_KDS_COOK.md) |
| Shared WS context | [`fe/src/context/OrdersWSContext.tsx`](../../../../../fe/src/context/OrdersWSContext.tsx) |
| Admin overview WS subscriber | [`fe/src/hooks/useOverviewWS.ts`](../../../../../fe/src/hooks/useOverviewWS.ts) |
| Board state (useState, ACTIVE_STATUSES) | [`fe/src/app/(dashboard)/kds/page.tsx:93-157`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L93) |
| publishOrderEvent (channels + line refs) | [`be/internal/service/order_service.go:806-819`](../../../../../be/internal/service/order_service.go#L806) |
| publishItemEvent | [`be/internal/service/order_service.go:998-1009`](../../../../../be/internal/service/order_service.go#L998) |
| maybeAutoReady | [`be/internal/service/order_service.go:726-746`](../../../../../be/internal/service/order_service.go#L726) |
| WS handler (channel subscription, no role gate) | [`be/internal/websocket/handler.go:17-88`](../../../../../be/internal/websocket/handler.go#L17) |
| Storage keys (KDS has none) | [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) |
