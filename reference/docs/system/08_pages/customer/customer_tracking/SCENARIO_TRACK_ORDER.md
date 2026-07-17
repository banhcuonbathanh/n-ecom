# Scenario — Watching Your Order Through the Kitchen

> **What this is:** a single, concrete run through `/tracking` — the guest at Bàn 03 taps "Theo Dõi"
> and observes their order move from `pending` to `ready`, then sees staff mark it served. The page is
> **read-only**: the guest issues no writes here; they only observe. Object shapes and endpoint internals
> live in their home files — this scenario links to those, never re-states them.
>
> Status: ✅ implemented (branch `experience_claude.md_system_1`).
> Sources traced: `fe/src/app/(shop)/tracking/page.tsx` · `fe/src/hooks/useOrderMonitorSSE.ts` ·
> `fe/src/app/(shop)/tracking/components/` · `fe/src/store/cart.ts` ·
> `be/internal/handler/order_handler.go` · `be/internal/service/order_service.go` ·
> `be/internal/sse/monitor_handler.go`.
>
> Siblings: [customer_tracking.md](customer_tracking.md) · [customer_tracking_be.md](customer_tracking_be.md) ·
> [customer_tracking_crosscomponent_dataflow.md](customer_tracking_crosscomponent_dataflow.md) ·
> [customer_tracking_loading.md](customer_tracking_loading.md) ·
> Shared context: [../customer_menu/SCENARIO_LUNCH_RUSH.md](../customer_menu/SCENARIO_LUNCH_RUSH.md)

---

## The cast

| Who | Role in this scenario |
|---|---|
| **Guest** (anonymous) | Placed an order from `/menu` at Bàn 03; now watching `/tracking` on their phone |
| **Lê Đầu Bếp** (`chef1`) | Incrementing `qty_served` on the KDS as each dish comes off the line |
| **Phạm Thu Ngân** (`cashier1`) | Will mark the order `delivered` from the POS when the food is put on the table |

## The floor (this moment)

It is 12:01. Five other tables are active. Bàn 03 just joined the queue as position #3.
For the full floor snapshot at peak, see
[SCENARIO_LUNCH_RUSH.md — 12:04 peak snapshot](../customer_menu/SCENARIO_LUNCH_RUSH.md#-peak-snapshot--1204-the-busiest-moment).
This scenario zooms in on Bàn 03 only — from the moment the guest taps the Tracking tab to the
moment the `delivered` badge lights up.

**What the guest ordered:** 2× Suất Đầy Đủ Trứng Tái (`ORD-20260613-016`, total ₫60,000).
How that order was *created* is covered in the menu scenario; this doc starts after the order exists.

---

## The timeline — minute by minute

### 12:01:00 — Order just confirmed; guest taps "Theo Dõi"

After `POST /orders` returned `201 { data: { id: "<orderId>" } }`, the menu page set
`useCartStore.activeOrderId = "<orderId>"` and called `clearCart()` (`store/cart.ts:89`). The cart is
now empty. `activeOrderId` was written into `localStorage` via the `partialize` function
(`cart.ts:153`: only `orderNote` and `activeOrderId` survive a reload).

The guest taps the bottom-nav "Theo Dõi" tab. The browser navigates to `/tracking`.

**What `page.tsx` does on mount** (`page.tsx:18`):

```
orderId = useCartStore(s => s.activeOrderId)   // reads "<orderId>" from persisted store
```

Two things fire in parallel:

1. **TanStack Query** `['order', orderId]` — issues `GET /api/v1/orders/<orderId>` with
   `staleTime: 0` (`page.tsx:21-34`). The request carries the guest's `Bearer` token via the
   Axios interceptor (`fe/src/lib/api-client.ts`).

2. **`useOrderMonitorSSE(orderId)`** (`page.tsx:37`) — opens
   `GET /sse/order-monitor/<orderId>` via `@microsoft/fetch-event-source`
   (`useOrderMonitorSSE.ts:48-50`), also with `Authorization: Bearer`.

While both are in flight, `isLoading && !order` is true → the page renders the
**animate-pulse skeleton** (`page.tsx:111-123`): a grey top-bar stub, two card-shaped blocks, and a
bottom-bar stub. No spinner; no blank screen.

### 12:01:01 — REST response arrives; page paints

`GET /orders/<orderId>` resolves in ~50 ms. The handler (`order_handler.go:125-137`) calls
`svc.GetOrder`, which:

1. Fetches `orders` row via `repo.GetOrderByID` — MySQL single-row read (`order_service.go:106`).
2. Checks caller ownership: `callerRole == "customer"` → `callerID = claims.TableID` (Bàn 03's UUID);
   if `order.table_id ≠ callerID` → `403 ErrForbidden` (`order_handler.go:128-130`,
   `order_service.go:116-120`). Here they match — no error.
3. Fetches all `order_items` rows; derives `ItemStatus` from `qty_served` vs `quantity` (there is no
   `order_items.status` column — `order_service.go` comment).
4. Resolves `table_name` via `tableRepo.GetTableByID` (best-effort; ignored on error).

Response shape → `Order` type (`fe/src/types/order.ts:38-52`). Status at this point: `pending`.

The page now has `order` in state. It renders four zones:

- **`MonitoringTopBar`** (`components/MonitoringTopBar.tsx`) — sticky header: title "Theo Dõi Đơn
  Hàng", and a pill showing "Mất kết nối" (grey, not pulsing) because the SSE is not yet open
  (`sseConnected=false` at this instant).
- **`TableInfoBanner`** — Bàn 03 card, `StatusBadge status="pending"`, queue position null (SSE
  hasn't delivered `queue.update` yet, so `queueData` is null).
- **`OrderDetailCard`** — the 2× Trứng Tái combo, with the combo header row filtered out
  (`displayItems` skips rows where `combo_id && !combo_ref_id`, `OrderDetailCard.tsx:19-21`), so the
  guest sees only the sub-items and standalone dishes, not the ₫0 header row.
- **`WholeFloorPrepList`** — not yet rendered (the `queueData` guard at `page.tsx:156` is false).

### 12:01:01 — SSE connects; initial snapshot arrives

`onopen` fires with `status 200` → `attemptsRef.current = 0`, `setSseConnected(true)`
(`useOrderMonitorSSE.ts:60-61`). The "Mất kết nối" pill flips to a **pulsing green "LIVE"** dot
(`MonitoringTopBar.tsx:26-38`).

Immediately after the SSE opens, the BE handler calls `orderSvc.MonitorSnapshot` and pushes **two
frames** before waiting for any Redis pub/sub message (`monitor_handler.go:59-65`):

**Frame 1 — `queue.update`:**

```jsonc
// monitor_handler.go:62, via buildMonitorPayloads (order_service.go:834-977)
{
  "type": "queue.update",
  "queue": [
    { "orderId": "<Bàn01Id>", "tableLabel": "Bàn 01", "orderNumber": "ORD-…-014", "status": "ready",    "createdAt": "…" },
    { "orderId": "<Bàn02Id>", "tableLabel": "Bàn 02", "orderNumber": "ORD-…-015", "status": "preparing","createdAt": "…" },
    { "orderId": "<Bàn03Id>", "tableLabel": "Bàn 03", "orderNumber": "ORD-…-016", "status": "pending",  "createdAt": "…" },
    // … other active tables …
  ],
  "total": 5,
  "position": 0,        // ← BE always sends 0 here (Flag 3)
  "estimatedMinutes": 0 // ← BE always sends 0 here (Flag 3)
}
```

The hook receives it and computes position FE-side (`useOrderMonitorSSE.ts:70-79`):

```typescript
const idx = queue.findIndex(q => q.orderId === orderId)   // idx = 2 (0-based)
setQueueData({
  queue,
  position:         idx >= 0 ? idx + 1 : 0,  // → 3
  total:            data.total ?? 0,           // → 5
  estimatedMinutes: idx > 0 ? idx * 3 : 0,    // → 6 min (2 × 3)
})
```

`TableInfoBanner` now shows: `#3 trong 5 đơn | Chờ ~6 phút`.
`WholeFloorPrepList` now renders — all five active tables sorted oldest-first; Bàn 03's row is
**highlighted** (blue border, `isOwn = true`, `WholeFloorPrepList.tsx:43`).

**Frame 2 — `tables.status`:**

```jsonc
{ "type": "tables.status",
  "tables": [
    { "tableId": "…", "tableLabel": "Bàn 01", "status": "serving" },
    { "tableId": "…", "tableLabel": "Bàn 02", "status": "waiting" },
    { "tableId": "…", "tableLabel": "Bàn 03", "status": "waiting" },
    // …
  ]
}
```

The hook stores this in `tableStatuses` (`useOrderMonitorSSE.ts:82-83`). At present, no component on
`/tracking` renders `tableStatuses` directly — it is available via the hook return value but
`page.tsx` does not pass it to any child. `❓ UNVERIFIED: whether a future zone renders tableStatuses
on /tracking, or whether it is only consumed by the admin floor monitor that reuses the same SSE
stream.`

### 12:03 — Lê Đầu Bếp starts cooking; `items_added` / `item_updated` events arrive

The chef confirms the order on the KDS. The BE transitions `orders.status` from `pending` →
`preparing` and publishes two things:

1. `order_status_changed` on channel `order:<id>` (`order_service.go:552`, `:745`).
2. A `publishMonitorBroadcast` goroutine fires after the transition, pushing new `queue.update` +
   `tables.status` snapshots to `queue:broadcast` / `tables:broadcast` (`order_service.go:553`,
   `982-989`).

**What the guest's page receives:**

- `queue.update` arrives → `setQueueData` → `WholeFloorPrepList` re-renders, Bàn 03's badge flips
  from "Chờ xác nhận" to "Đang chuẩn bị".
- `order_status_changed` also arrives on `order:<id>` — **but the hook has no `case 'order_status_changed'`**;
  it only handles `case 'order.status'` (`useOrderMonitorSSE.ts:67`). Because the BE publishes
  `order_status_changed` but the hook listens for `order.status`, **the status badge does not advance
  via this event**. See Flag 1 in [customer_tracking_be.md](customer_tracking_be.md). The status
  badge stays `pending` until an item event triggers a refetch.

Shortly after, as the chef starts incrementing `qty_served` per dish, the BE publishes:
- `item_progress` on `order:<id>` — **not consumed** by the hook (no `item_progress` case,
  `useOrderMonitorSSE.ts:66-89`). See Flag 2 in [customer_tracking_be.md](customer_tracking_be.md).
  The per-dish progress bar in `OrderDetailCard` does not update live; it only refreshes on a full
  refetch.

### 12:05 — Chef marks the first dish `qty_served = quantity`; `item_updated` fires

When the chef taps "served" for the first Trứng Tái sub-item, the BE calls `publishOrderEvent(ctx,
"item_updated", …)` on channel `order:<id>` (`order_service.go:696`). The SSE stream carries it to
the guest:

```
onmessage → data.type === 'item_updated'
→ setItemsChangedAt(Date.now())       // useOrderMonitorSSE.ts:87
```

Back in `page.tsx`, the `useEffect` at line `40-42` fires:

```typescript
useEffect(() => {
  if (itemsChangedAt) refetch()
}, [itemsChangedAt, refetch])
```

This triggers a fresh `GET /orders/<orderId>` — a full MySQL read (no Redis cache, no HTTP cache;
`staleTime: 0`). The response now carries `status: "preparing"` and the updated `qty_served` values.
The status badge on `TableInfoBanner` advances to "Đang chuẩn bị". `OrderDetailCard` re-renders
with the new served counts.

This is the **only mechanism** by which the status badge on `/tracking` advances — a `GET` refetch
triggered by an `items_*` event. A status transition with no accompanying item event does not
move the badge in real time (Flag 1).

### 12:07 — All items served; order status → `ready`; `item_updated` fires again

The chef marks the last sub-item `qty_served = quantity`. The BE:

1. Detects all items served → transitions `orders.status` to `ready`.
2. Publishes `order_status_changed` on `order:<id>`.
3. Publishes `item_updated` on `order:<id>` (for the last item).
4. Fires `publishMonitorBroadcast` → new `queue.update` snapshots.

The guest's page receives `item_updated` → `refetch()` → REST response now carries `status: "ready"`.
`TableInfoBanner` shows "Sẵn sàng". Queue position in `WholeFloorPrepList` still shows Bàn 03
(still active until payment). The `estimatedMinutes` show `0` for position #1 (`idx = 0 → idx * 3 =
0`; the ETA formula at `useOrderMonitorSSE.ts:77` emits 0 when the order is first in queue).

### 12:08 — Staff carries food to the table; cashier marks `delivered`

Phạm Thu Ngân confirms delivery from the POS. The BE transitions `orders.status` to `delivered` and
publishes `order_status_changed` on `order:<id>` + a broadcast.

On the guest's phone, the next `item_updated` / `items_added` / `item_cancelled` event (if any) will
trigger another refetch and show `delivered`. If no item event follows, the status badge stays
`ready` until the next natural refetch or reload (Flag 1 again — pure status transitions are invisible
to this page in real time).

When the refetch does arrive with `status: "delivered"`:
- `effectiveStatus = orderStatus ?? order?.status` becomes `"delivered"`.
- `TableInfoBanner.isDelivered` → renders the green "Đơn của bạn đã được phục vụ — Cảm ơn!" message
  (`TableInfoBanner.tsx:13-14,27-28`).
- `WholeFloorPrepList` filters `ACTIVE_STATUSES: ['pending','confirmed','preparing','ready']` —
  `delivered` is not in the list, so Bàn 03 disappears from the floor queue
  (`WholeFloorPrepList.tsx:6`).

The SSE stream remains open (there is no `order_completed` / close event in the monitor channel).
The guest sees a quiet screen: their own "served" banner at the top, an empty or shorter floor queue
below.

### What if the SSE drops mid-scenario?

If Wi-Fi flickers at 12:04, `onerror` throws, the catch block increments `attemptsRef.current` and
waits `Math.min(1000 * 2^(n-1), 30000)` ms before retrying
(`useOrderMonitorSSE.ts:100-107`). After 3 failed attempts `sseConnected` stays `false` →
`MonitoringTopBar` shows "Mất kết nối" (grey, no pulse) and `<ConnectionErrorBanner>` renders below
it (`page.tsx:129`). After 5 attempts the loop stops (`useOrderMonitorSSE.ts:43,102`). The
`GET /orders/:id` query is not affected — TanStack Query continues to serve cached data; the page
is stale but not broken.

---

## Under the hood — how the data moves on `/tracking`

> Everything here is the concrete version of *this page's* beat. Rules live in their home docs.
> Full cross-component wiring → [customer_tracking_crosscomponent_dataflow.md](customer_tracking_crosscomponent_dataflow.md).

### A. Cross-component data sharing (one page, many widgets)

Four components share a single data source, no prop-drilling between siblings:

```
useOrderMonitorSSE ──→ queueData    ──→ TableInfoBanner   (position, ETA, status)
                   └──→ sseConnected ──→ MonitoringTopBar  (LIVE / Mất kết nối pill)
                   └──→ sseConnected ──→ <ConnectionErrorBanner> (appears on false)
                   └──→ itemsChangedAt → refetch()
                                           └──→ OrderDetailCard  (fresh order data)
                                           └──→ TableInfoBanner  (status after refetch)
useCartStore       ──→ activeOrderId ──→ page.tsx (the pointer to which order to show)
TanStack Query     ──→ order         ──→ OrderDetailCard, TableInfoBanner, WholeFloorPrepList
```

Full wiring detail → [customer_tracking_crosscomponent_dataflow.md](customer_tracking_crosscomponent_dataflow.md).

### B. Cross-page data — `/tracking` as a read-only consumer

`/tracking` is the **downstream** page in the QR journey: `/table/:id` → `/menu` → `/tracking`.
It receives, never sends, cross-page state:

| What | From where | Mechanism | Survives F5? |
|---|---|---|---|
| `activeOrderId` | `/menu` after `POST /orders` | `useCartStore.setActiveOrderId` → persisted via `partialize` to `STORAGE_KEYS.CART_CONFIG` (`cart.ts:153`) | ✅ yes — re-read on reload |
| Guest `accessToken` | `/table/:id` (QR scan → guest JWT) | `useAuthStore` — memory only, never localStorage | ❌ no — restored by `GET /auth/me` on next load |
| Floor queue / table statuses | BE SSE initial snapshot + live pub/sub | `useOrderMonitorSSE` | ❌ session only |

`/tracking` writes **nothing** back to cross-page state. It does not set `activeOrderId`, does not
update the cart, does not modify any order. It is a pure observer.

For the full order lifecycle and handoff from `/menu`, see
[../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md).

### C. FE → BE outbound calls

There are **exactly two** outbound calls from `/tracking`, both reads:

| # | Call | When | Auth |
|---|---|---|---|
| 1 | `GET /api/v1/orders/<orderId>` | On mount + on `itemsChangedAt` change | `Bearer` (guest JWT, Axios interceptor) |
| 2 | `GET /api/v1/sse/order-monitor/<orderId>` (long-lived) | On mount; reconnects on drop | `Authorization: Bearer` header (`useOrderMonitorSSE.ts:51`) |

**The guest issues no writes from `/tracking`.** There is no `POST`, `PATCH`, or `DELETE` call
anywhere on this page. All item/order mutations (chef: `qty_served` increments; cashier: status
transitions) happen on the staff-side pages (KDS / POS / Admin), not here.

### D. BE → FE receive / live events

The SSE stream (`/sse/order-monitor/<orderId>`) pushes events from two Redis channels:

| Channel | Events | Effect on this page |
|---|---|---|
| `order:<id>` | `order_status_changed` | **Ignored** — hook has no matching case (`order.status` ≠ `order_status_changed`). See Flag 1 in [customer_tracking_be.md](customer_tracking_be.md). |
| `order:<id>` | `items_added`, `item_updated`, `item_cancelled` | `setItemsChangedAt(Date.now())` → triggers `refetch()` → full REST re-read from MySQL |
| `order:<id>` | `item_progress` | **Not consumed** — no case in the hook switch. See Flag 2 in [customer_tracking_be.md](customer_tracking_be.md). |
| `queue:broadcast` | `queue.update` | `setQueueData` → FE computes `position` / `estimatedMinutes` from the queue array (Flag 3 in [customer_tracking_be.md](customer_tracking_be.md)) |
| `tables:broadcast` | `tables.status` | `setTableStatuses` — stored in hook, not currently rendered on this page |

Initial snapshot: on SSE connect the BE pushes one `queue.update` + one `tables.status` frame before
any pub/sub message (`monitor_handler.go:59-65`), so the floor list renders without waiting for the
next write.

**The `order_status_changed` gotcha** (Flag 1, summarised here for the narrative):
The BE emits `order_status_changed` on status transitions. The hook listens for `order.status`.
These strings never match. The status badge on `/tracking` therefore advances **only when a
`GET /orders/:id` refetch fires** — which only happens when an `items_*` event arrives. A pure
`pending → preparing → ready` transition that happens to coincide with no item event will not update
the badge live. This is a code-vs-hook mismatch, not a doc decision — flagged, not silently fixed.

### E. Loading + caching

See [customer_tracking_loading.md](customer_tracking_loading.md) for the full loading state machine.
Key points for this scenario:

- **No skeleton wait on re-render.** Once `order` is in TanStack Query cache, every refetch shows
  the previous data while the new fetch is in flight (`page.tsx:111`: guard is `isLoading && !order`,
  so an already-populated `order` never triggers the skeleton again).
- **No Redis cache on `GET /orders/:id`.** Every call hits MySQL:
  `GetOrderByID` + `GetOrderItemsByOrderID` + `GetTableByID` (`order_service.go:106-143`). Fine at
  stall scale; noted for load awareness.
- **No HTTP cache.** `staleTime: 0` + no `Cache-Control` from BE/Caddy → every `refetch()` is a
  real network round-trip.
- **Queue/ETA are FE-derived.** `queue.update` carries the raw `queue[]` array; position and ETA are
  computed locally (`useOrderMonitorSSE.ts:70-79`). No caching; recomputed on every `queue.update`
  frame.

### F. Monitoring (SSE connection health)

`/tracking` surfaces SSE health through two UI signals:

| Signal | When | Component |
|---|---|---|
| Green "LIVE" pulse | `sseConnected = true` | `MonitoringTopBar` — pill with `animate-pulse` dot (`MonitoringTopBar.tsx:34`) |
| Grey "Mất kết nối" | `sseConnected = false` | `MonitoringTopBar` pill (`MonitoringTopBar.tsx:38`) |
| `<ConnectionErrorBanner>` | `!sseConnected` | Renders below the top bar (`page.tsx:129`) |

Reconnect logic: exponential backoff `1s → 2s → 4s → 8s → 16s` (capped at 30s), max 5 attempts
(`useOrderMonitorSSE.ts:7-12,100-107`). After 5 failures the loop stops; the page shows stale queue
data but the REST query continues to serve `order` from cache. The guest's own order data is never
lost — only the live floor updates stall.

Server-side: the BE sends a `: keep-alive` comment every 15s (`handler.go:14`,
`monitor_handler.go:78-80`). The stream closes on `ctx.Done()` (client disconnect or server
shutdown); no explicit "close" frame is emitted.

---

## The whole beat on one timeline

```
guest taps "Theo Dõi"
  → orderId read from useCartStore (persisted activeOrderId)         [B: cross-page handoff]
  → skeleton renders (isLoading && !order)                           [E: loading]
  → GET /orders/:id (MySQL, no cache)  ─────────────────────────────[C: outbound REST]
  → SSE GET /sse/order-monitor/:id opens                             [C: outbound SSE]
      ↓ onopen → sseConnected=true → LIVE pill lights up             [F: health]
      ↓ initial snapshot → queue.update + tables.status              [D: receive]
          → queueData set; position/ETA computed FE-side             [D + Flag 3]
  → REST resolves: order{status:"pending"} → page paints             [E: no-skeleton after]
      TableInfoBanner (#3 trong 5 đơn · ~6 phút · pending)          [A: cross-component]
      OrderDetailCard (sub-items, no combo header rows)              [A]
      WholeFloorPrepList (5 tables, Bàn03 highlighted)               [A]
  ─ chef starts cooking ─────────────────────────────────────────────────────────────────
  → BE publishes order_status_changed on order:<id>                  [D: arrives but ignored]
  → BE publishes queue.update broadcast                              [D: consumed]
      → WholeFloorPrepList status badge flips to "preparing"
  → BE publishes item_progress (chef increments qty_served)          [D: ignored — Flag 2]
  → BE publishes item_updated (dish fully served)                    [D: consumed → refetch]
      → refetch() GET /orders/:id → order{status:"preparing"}
      → status badge advances (only via refetch, not via SSE status) [D: Flag 1]
  ─ last dish served → order status → ready ─────────────────────────────────────────────
  → item_updated → refetch → order{status:"ready"}
      → TableInfoBanner: "Sẵn sàng"
  ─ cashier marks delivered ─────────────────────────────────────────────────────────────
  → next item_updated (or next refetch trigger) → order{status:"delivered"}
      → TableInfoBanner: "Đơn của bạn đã được phục vụ — Cảm ơn!"
      → WholeFloorPrepList: Bàn 03 disappears (delivered not in ACTIVE_STATUSES)
  ─ SSE stays open; guest sees a quiet screen ───────────────────────────────────────────
```

---

## Flags surfaced by this scenario

These are code-level mismatches, not doc decisions. All traced to source; not silently fixed.

| # | Flag | Detail | Reference |
|---|---|---|---|
| 1 | **Status badge does not advance via SSE status event** | BE emits `order_status_changed`; hook listens for `order.status` — strings never match; badge advances only via `GET` refetch triggered by item events | [customer_tracking_be.md Flag 1](customer_tracking_be.md) |
| 2 | **`item_progress` is published but not consumed** | Per-item cooking progress (`qty_served` increments) reaches the SSE stream but the hook has no `item_progress` case — progress bar only refreshes on full `items_*` refetch | [customer_tracking_be.md Flag 2](customer_tracking_be.md) |
| 3 | **Queue position / ETA are FE-derived** | BE `buildMonitorPayloads` sends `position:0, estimatedMinutes:0` in `queue.update`; FE derives them from the queue array index (`idx+1`, `idx*3`) | [customer_tracking_be.md Flag 3](customer_tracking_be.md) |
| 4 | **`tableStatuses` not rendered on `/tracking`** | The hook returns `tableStatuses` from `tables.status` events but `page.tsx` does not pass it to any child component — it is stored but invisible to the guest | `page.tsx:36` / `useOrderMonitorSSE.ts:120` |

---

## The one-line mental model

> `/tracking` is a **read-only observer**: it holds one REST snapshot + one SSE stream; item events
> trigger refetches that advance the status badge; pure status transitions are invisible until the
> next item event; queue position and ETA are computed locally from the floor snapshot — the page
> itself never writes a byte to the server.
