# Realtime — SSE & WebSocket Architecture

> **TL;DR**
> Two realtime channels: **SSE** (HTTP streaming, for order tracking + floor monitor) and **WebSocket** (for KDS + POS live feed).
> Both use Redis Pub/Sub as the fanout layer — BE publishes events, handlers subscribe and stream to clients.
> SSE reconnect: browser retries automatically (add `retry: 2000` directive for guaranteed 2-second recovery).
> WebSocket auth via `?token=` query param (browser WS API cannot set headers).

---

## 1 — Architecture Overview

```
Service layer (order_service, payment_service, group_service)
    │  rdb.Publish(channel, payload)
    ▼
Redis Pub/Sub
    │
    ├── order:{id}          → SSE  → GET /api/v1/orders/:id/events          (guest/customer tracks order)
    ├── group:{id}          → SSE  → GET /api/v1/orders/group/:id/events     (cashier group view)
    ├── orders:admin        → SSE  → GET /api/v1/sse/admin                   (admin floor monitor)
    ├── queue:broadcast     → SSE  → GET /api/v1/sse/order-monitor/:id       (order queue broadcast)
    ├── tables:broadcast    → SSE  → GET /api/v1/sse/order-monitor/:id       (table state broadcast)
    ├── orders:kds          → WS   → GET /api/v1/ws/kds                      (KDS new-order feed)
    └── orders:kds + more   → WS   → GET /api/v1/ws/orders-live              (POS live feed)
```

---

## 2 — SSE Endpoints

| Endpoint | Auth | Redis Channel(s) | Subscribers | Source file |
|---|---|---|---|---|
| `GET /api/v1/orders/:id/events` | auth | `order:{id}` | Guest/customer tracking their own order | `sse/handler.go` |
| `GET /api/v1/orders/group/:id/events` | auth | `group:{id}` | Cashier watching a multi-table group | `sse/group_handler.go` |
| `GET /api/v1/sse/admin` | manager+ | `orders:admin` | Admin floor monitor (live order counts, table states) | `sse/admin_handler.go` |
| `GET /api/v1/sse/order-monitor/:id` | auth | `queue:broadcast` + `tables:broadcast` | Extended floor monitor with queue + table snapshots | `sse/monitor_handler.go` |

### SSE Response Headers (required)

```go
c.Header("Content-Type", "text/event-stream")
c.Header("Cache-Control", "no-cache")
c.Header("X-Accel-Buffering", "no")   // prevents Nginx/Caddy from buffering the stream
```

### SSE Event Format

```
event: order_status_changed
data: {"type":"order_status_changed","data":{"order_id":"<uuid>","status":"preparing"}}

event: item_progress
data: {"type":"item_progress","data":{"order_id":"<uuid>","item_id":"<uuid>","qty_served":1,"quantity":2,"item_status":"preparing","progress_pct":50}}

: keep-alive
```

Heartbeat sent every 15 seconds to keep the connection alive through proxies:
```go
fmt.Fprintf(c.Writer, ": keep-alive\n\n")
c.Writer.Flush()
```

---

## 3 — WebSocket Endpoints

| Endpoint | Auth | Channel | Subscribers | Source file |
|---|---|---|---|---|
| `GET /api/v1/ws/kds` | JWT via `?token=` (no role gate) | `orders:kds` | _(intended: KDS — but **no FE connects here**; dead code on this branch)_ | `websocket/handler.go` (KDSHandler) |
| `GET /api/v1/ws/orders-live` | JWT via `?token=` (no role gate) | `orders:kds` | **KDS board (`/kds`), POS, and admin live floor** — all dashboard pages share one `OrdersWSProvider` → this route | `websocket/handler.go` (LiveHandler) |

> ⚠️ Both handlers are the **identical** `wsHandler` on the **same** `orders:kds` channel
> (`websocket/handler.go:17-23`), and neither has `authMW`/role gate — auth is the `?token=` JWT
> parsed in-handler, claims discarded (`handler.go:31-40`), so any valid JWT incl. a `customer`
> guest token can subscribe. The real KDS page (`/kds`) uses **`/ws/orders-live`** via the shared
> `(dashboard)/layout.tsx` `OrdersWSProvider`, **not** `/ws/kds`. Traced `/page-doc-set staff_kds`
> 2026-06-17 → [08_pages/staff/staff_kds/staff_kds_be.md](../08_pages/staff/staff_kds/staff_kds_be.md).

### WebSocket Auth Pattern

Browser WebSocket API cannot set custom headers. JWT is passed via query param:
```
GET /api/v1/ws/kds?token=<access_jwt>
```
The handler parses and verifies the JWT before upgrading the connection. The JWT is logged by `gin.Logger` in the request URL — this is a known security issue (SEC-02 in audit); the `?token=` should be redacted from logs in production.

### WebSocket Event Types

| Type | Published by | When |
|---|---|---|
| `new_order` | `order_service` | New order created |
| `order_updated` | `order_service` | Order status changed |
| `item_progress` | `order_service` | `qty_served` updated on an item |
| `order_completed` | `order_service` | Order reaches `ready` status |
| `payment_success` | `payment_service` | Payment webhook confirmed |

### WebSocket Hub

`websocket/hub.go` — `Hub` struct with `sync.RWMutex` protecting the client map. `hub.Run()` runs in its own goroutine. All client goroutines have `defer recover()` to prevent panics from crashing the server.

Ping/pong config: ping every 30 s · pong deadline 10 s · read deadline 60 s.

---

## 4 — How BE Publishes Events

All publish calls go through `pkg/redis/pubsub.go`:
```go
// In service layer:
rdb.Publish(ctx, "order:"+orderID, payload)
rdb.Publish(ctx, "orders:kds", payload)
rdb.Publish(ctx, "orders:admin", payload)
```

Publish is fire-and-forget. If Redis is unavailable, the event is lost for that instant (fail-open). The SSE handler on the next reconnect calls a snapshot function to restore current state.

---

## 5 — Client Reconnect Behavior

| Client type | Reconnect mechanism | Notes |
|---|---|---|
| Browser SSE | Automatic (browser built-in retry, default 3 s) | Add `retry: 2000\n\n` in the first event to set 2 s interval |
| `StreamOrderMonitor` | Snapshot replayed on every fresh connect | Correct pattern — prevents flash of empty content |
| WebSocket | Client-side reconnect logic required | Server does not auto-reconnect; clients must implement backoff |

Known issue (C-03 in audit): SSE handlers do not send a `retry:` directive. On Redis restart all SSE clients disconnect simultaneously, creating a thundering-herd reconnect. Fix: add `retry: 2000` directive immediately after the first connected event.

---

## 6 — What Each Subscriber Sees

| Role | Endpoint | Purpose |
|---|---|---|
| Guest / Customer | `GET /orders/:id/events` | Track own order: `pending → confirmed → preparing → ready` |
| Cashier | `GET /orders/group/:id/events` | Multi-table group status updates |
| Chef | `GET /ws/kds` | New orders + item progress (real-time kitchen display) |
| Cashier / POS | `GET /ws/orders-live` | Live order feed for POS screen |
| Admin / Manager | `GET /sse/admin` | Floor monitor: active orders, table states |
| Admin / Manager | `GET /sse/order-monitor/:id` | Extended monitor with queue + table snapshots |

---

## Deep Dive Sources

| Topic | File |
|---|---|
| SSE/WS config (reconnect, heartbeat) | `../02_spec/BUSINESS_RULES.md §6` |
| SSE + WS contract (event types) | `../02_spec/API_SPEC.md` (SSE/WS rows) |
| Realtime hub implementation | `be/internal/sse/` + `be/internal/websocket/` (Go source) |
| Redis pub/sub channels | `REDIS_CACHE.md §3` (same folder) |
| Cache strategy + fail-open reasoning | `REDIS_CACHE.md` (same folder) |
