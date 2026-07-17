# Customer Tracking — `/tracking` · Backend View

> **TL;DR:** every BE surface the tracking page calls, traced handler → service → repository →
> SQL / Redis pub-sub, with auth, caching and error behaviour. Traced from source on branch
> `experience_claude.md_system_1` (NOT from docs). The page is **read-only** — it makes one REST
> read (`GET /orders/:id`) plus one long-lived SSE subscription (`GET /sse/order-monitor/:id`);
> it issues **no writes**.
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/order_handler.go` (`Get`) ·
> `be/internal/service/order_service.go` (`GetOrder`, `MonitorSnapshot`, `buildMonitorPayloads`,
> `publishOrderEvent`) · `be/internal/sse/monitor_handler.go` (`StreamOrderMonitor`) ·
> `be/internal/sse/group_handler.go` (`extractEventType`) · `be/internal/sse/handler.go`
> (`heartbeatInterval`).
>
> FE view + zones → [customer_tracking.md](customer_tracking.md) ·
> Order object shapes (all layers) → [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) ·
> Realtime channel map → [../../03_be/REALTIME_SSE.md](../../03_be/REALTIME_SSE.md) ·
> Loading behaviour → [customer_tracking_loading.md](customer_tracking_loading.md)

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis |
|---|---|---|---|---|---|---|
| 1 | `GET /orders/:id` | authMW (guest JWT OK) | `orderH.Get` | `GetOrder` | `GetOrderByID` + `GetOrderItemsByOrderID` + `GetTableByID` | — (no key cache) |
| 2 | `GET /sse/order-monitor/:id` | authMW (guest JWT OK) | `sse.StreamOrderMonitor` | `MonitorSnapshot` → `buildMonitorPayloads` | `ListActiveOrders` + `ListTables` (on connect) | pub/sub: `order:<id>` · `queue:broadcast` · `tables:broadcast` |

Route registration:
- `GET /orders/:id` → `be/cmd/server/main.go:236` (inside `orderR := v1.Group("/orders")` at
  `:230`, group-wide `orderR.Use(authMW)` at `:231`). No role gate on this row.
- `GET /sse/order-monitor/:id` → `be/cmd/server/main.go:334` (`authMW` only, no role gate).

Both under `/api/v1`. The FE composes the SSE URL as
`${NEXT_PUBLIC_API_URL}/sse/order-monitor/${orderId}`
(`fe/src/hooks/useOrderMonitorSSE.ts:49`) and the REST URL as `/orders/${orderId}`
(`fe/src/app/(shop)/tracking/page.tsx:24`).

---

## Auth Model on This Page

- **Both surfaces require `authMW`** — there is no public route here. The guest JWT minted at
  `/table/:tableId` (`sub='guest'`, `role='customer'`, carries `table_id`) passes both gates;
  neither route has an `AtLeast(...)` role check (`main.go:236`, `main.go:334`).
- **Ownership is enforced on the REST read, not the SSE stream.** `GetOrder`
  (`order_service.go:116-120`) rejects with `ErrForbidden` when `callerRole == "customer"` and the
  order's `table_id` ≠ the caller's `table_id`. The handler maps the caller id to `claims.TableID`
  for customers (`order_handler.go:128-130`) — guest ownership is by table, not by a staff user id.
- **The SSE monitor has no per-order ownership check** — once authenticated, any caller can
  subscribe to any `order:<id>` channel; the handler only validates a non-empty `:id`
  (`monitor_handler.go:28-35`). Auth is "validated upstream by middleware" only
  (`monitor_handler.go:25`). See Flag 4.
- Staff/admin JWTs also pass — the same `/sse/order-monitor/:id` route is reused by the admin
  floor monitor (REALTIME_SSE.md:135); on this customer page the subscriber is always the guest.

---

## Per-Endpoint Detail

### 1 · `GET /orders/:id` (TanStack Query `['order', orderId]`)

- Handler `Get` (`order_handler.go:125-137`): reads `claims` from context, sets `callerID =
  claims.TableID` for customers, calls `svc.GetOrder(ctx, c.Param("id"), callerID, claims.Role)`,
  serializes via `orderJSON(o)` under `{"data": …}`.
- Service `GetOrder` (`order_service.go:106-143`):
  1. `repo.GetOrderByID` → `sql.ErrNoRows` mapped to `ErrNotFound` (→ 404).
  2. Customer ownership guard (table match) → `ErrForbidden` (→ 403) on mismatch.
  3. `repo.GetOrderItemsByOrderID` → each item enriched with a derived `ItemStatus`
     (`itemStatus(qty_served, quantity)` — there is **no** `order_items.status` column; status is
     computed, per `be/CLAUDE.md`).
  4. `tableRepo.GetTableByID` resolves `table_name` (best-effort; ignored on error).
- **No Redis caching** on this path — every call hits MySQL. The FE query uses `staleTime: 0` and
  refetches on demand (`page.tsx:27`, and on `itemsChangedAt` at `page.tsx:40-42`).
- Response shape (Order + items + `table_name`) → OBJECT_MODEL_ORDER (FE `Order` type at
  `fe/src/types/order.ts:38-52`).

### 2 · `GET /sse/order-monitor/:id` (`useOrderMonitorSSE`)

- Handler `StreamOrderMonitor` (`monitor_handler.go:26-84`):
  1. Validates non-empty `:id` → `400 INVALID_INPUT` otherwise (`:29-35`).
  2. Sets SSE headers (`text/event-stream`, `no-cache`, `keep-alive`, `X-Accel-Buffering: no`)
     and `200` (`:37-41`).
  3. `rdb.Subscribe(ctx, "order:<id>", "queue:broadcast", "tables:broadcast")` (`:46-48`).
  4. Emits `event: connected` immediately (`:54-55`).
  5. **Initial snapshot** via the injected `snapshot` fn = `orderSvc.MonitorSnapshot`
     (`main.go:334`): pushes one `queue.update` + one `tables.status` frame on connect so the
     floor list and table grid render without waiting for the next status change (`:59-65`).
  6. Loop: forwards each pub/sub payload with `event: <type>` where `<type> =
     extractEventType(payload)` (`group_handler.go:87-95`, falls back to `group_updated`); sends a
     `: keep-alive` comment every `heartbeatInterval = 15s` (`handler.go:14`, `monitor_handler.go:78-80`).
- Service `MonitorSnapshot` (`order_service.go:994-996`) → `buildMonitorPayloads`
  (`order_service.go:834-977`):
  - `ListActiveOrders` (`:837`) → `repo.ListActiveOrders` + per-order `GetOrderItemsByOrderID` +
    `GetTableByID` — builds the `queue.update` payload (`type:"queue.update"`, `queue:[…]`,
    `total:len`, `position:0`, `estimatedMinutes:0` — see Flag 3).
  - `tableRepo.ListTables` (`:844`) → derives each table's `serving` / `waiting` / `empty` state
    from the highest-priority active order status (`:937-973`) → `tables.status` payload.
- **Event payloads the FE consumes** (`useOrderMonitorSSE.ts:63-89`), and what actually arrives:

  | FE switch case (`type`) | BE publisher → channel | Reaches this page? |
  |---|---|---|
  | `queue.update` | `buildMonitorPayloads` → `queue:broadcast` / snapshot | ✅ yes |
  | `tables.status` | `buildMonitorPayloads` → `tables:broadcast` / snapshot | ✅ yes |
  | `items_added` | `publishOrderEvent(ctx,"items_added",…)` → `order:<id>` (`:516`) | ✅ yes → refetch |
  | `item_updated` | `publishOrderEvent(ctx,"item_updated",…)` → `order:<id>` (`:696`) | ✅ yes → refetch |
  | `item_cancelled` | `publishOrderEvent(ctx,"item_cancelled",…)` → `order:<id>` (`:642`) | ✅ yes → refetch |
  | `order.status` | **no publisher emits `order.status`** — status changes publish `order_status_changed` (`:552`, `:745`) | ❌ **never matches** — see Flag 1 |

---

## Caching & Invalidation

- **No Redis key cache on either surface.** `GET /orders/:id` reads MySQL every time; the SSE
  handler uses Redis only as a **pub/sub transport**, not a cache.
- Channels in play:
  - `order:<id>` — per-order events (`order_status_changed`, `items_added`, `item_updated`,
    `item_cancelled`, `item_progress`), published by `publishOrderEvent` (`order_service.go:806-819`)
    and `publishItemEvent` (`:998-1010`).
  - `queue:broadcast` + `tables:broadcast` — floor-wide snapshots, published by
    `publishMonitorBroadcast` (`order_service.go:982-989`), which is fired **in a goroutine** after
    order create (`:350`) and after every status transition (`:553`) so it never blocks the write
    path.
- **Freshness:** the only authoritative order snapshot the page renders is the `GET /orders/:id`
  response; it is re-pulled on connect and whenever an `items_*` event lands. Floor queue/ETA are
  recomputed live from `queue.update` (no DB round-trip on the FE).

---

## Error Behaviour

- **REST `GET /orders/:id`** → `handleServiceError` mapping: `ErrNotFound` → `404`,
  `ErrForbidden` → `403`, else `500`. FE `retry` skips 404 (`page.tsx:30-33`) and renders the
  "Đơn hàng không tồn tại" fallback when `isError && !order` (`page.tsx:69-87`).
- **SSE auth failure** — `onopen` treats `401`/`403` as a **permanent, non-retryable** `AuthError`
  (`useOrderMonitorSSE.ts:53-58`), setting `isUnauthorized` → the page shows
  "Phiên làm việc hết hạn" (`page.tsx:90-108`). Other non-OK statuses throw a retryable error.
- **SSE transport drop** — exponential backoff (`baseDelay 1s × 2^n`, capped `30s`, max `5`
  attempts; `useOrderMonitorSSE.ts:7-12,100-107`). The `ConnectionErrorBanner` is shown the moment
  `sseConnected` goes false (`page.tsx:129`) — **immediately, not after N attempts**: the
  `RECONNECT.showBannerAfter = 3` constant (`useOrderMonitorSSE.ts:11`) is defined but never
  referenced (dead code, see Flag 6). The BE side never surfaces an error frame — it just closes
  the stream on `ctx.Done()`.
- **Bad `:id` on SSE** → `400 INVALID_INPUT` before any stream headers (`monitor_handler.go:29-35`).
- `respondError` / error-code pattern → [../../02_spec/ERROR_SPEC.md](../../02_spec/ERROR_SPEC.md).

---

## Flags

> Flags 1–4 + 6 are **live code bugs**, not stale docs — full repro / root cause / suggested fix in
> [TRACKING_BUGS.md](TRACKING_BUGS.md). Logged in the
> [LOGIC Decision Log (2026-06-14)](../../07_business_logic/LOGIC_INDEX.md#decision-log).

| # | Flag | Detail |
|---|---|---|
| 1 | **`order.status` event type never matches — live status badge is stale** | The FE monitor hook switches on `case 'order.status'` (`useOrderMonitorSSE.ts:67-69`) to set `orderStatus`, but **no BE code publishes a `order.status` type** — every status change emits `type:"order_status_changed"` on `order:<id>` (`order_service.go:552`, `:745`). So `orderStatus` stays `null` and the page falls back to `order?.status` from the last `GET /orders/:id` (`page.tsx:44`). The status badge only advances when an `items_*` event happens to trigger a refetch — a pure `pending→preparing→ready` transition with no item change does **not** update the badge live. The handler's own doc-comment (`monitor_handler.go:18`) also claims `order.status`, so both the comment and the FE are out of step with the publisher. 🚨 Code-level mismatch — flag to owner; not fixed by this doc. |
| 2 | **`item_progress` is published but not consumed here** | `publishItemEvent` emits `type:"item_progress"` on `order:<id>` (`order_service.go:998-1010`) on every qty-served increment, but the monitor hook has no `item_progress` case (`useOrderMonitorSSE.ts:66-89`). So per-item cooking progress (e.g. "ra 1/2") does **not** refetch on `/tracking`; only `items_added`/`item_updated`/`item_cancelled` do. OrderDetailCard progress is therefore as fresh as the last such event, not real-time. |
| 3 | **`position` / `estimatedMinutes` are computed FE-side, not from BE** | `buildMonitorPayloads` sends `position:0`, `estimatedMinutes:0` in the `queue.update` payload (`order_service.go:875-928` — those fields are never set). The FE derives them itself: `position = idx+1`, `estimatedMinutes = idx*3` from the queue array (`useOrderMonitorSSE.ts:70-79`). The BE numbers are placeholders; the FE is the source of truth for queue position/ETA. |
| 4 | **SSE monitor has no per-order ownership check** | Unlike `GET /orders/:id`, `StreamOrderMonitor` validates only that `:id` is non-empty (`monitor_handler.go:28-35`); any authenticated caller can subscribe to any order's channel and also receives the floor-wide `queue.update`/`tables.status` (which expose every active table). Acceptable for a shared-floor monitor, but worth noting the asymmetry vs. the REST read's `ErrForbidden` guard. |
| 5 | **No Redis cache → `GET /orders/:id` hits MySQL on every refetch** | With `staleTime: 0` and refetch-on-event, an order with frequent item changes re-queries `GetOrderByID` + `GetOrderItemsByOrderID` + `GetTableByID` each time. Fine at stall scale; noted for load awareness. |
| 6 | **`tables.status` is published but dropped on this page** | The BE pushes a `tables.status` snapshot on connect and a `tables:broadcast` frame on every status change; the hook stores it in `tableStatuses` (`useOrderMonitorSSE.ts:81-82,120`), but `page.tsx:36` does not destructure `tableStatuses` and no widget renders it — the floor table-grid is dead output on `/tracking`. (Surfaced by the cross-component + loading trace.) Likewise `reconnect()` is returned but not wired to any UI, and `RECONNECT.showBannerAfter` is unused. |
