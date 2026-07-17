# Scalability & Performance Review — End-to-End Data Flow

> **TL;DR**
> Reverse proxy is **Caddy, not nginx**, and it does **TLS + routing only — no response cache**.
> All caching is application-level (TanStack L1 in the browser, Redis L2 on the BE).
> The standout design decision is realtime fan-out through **Redis pub/sub**, which makes the
> Go/Gin BE **horizontally scalable for free**. For a single bánh cuốn stall, scalability is **not**
> the binding constraint — the real risks are two correctness/config gaps, not throughput.
> Layer-by-layer caching detail → [../10_caching/CACHING_INDEX.md](../10_caching/CACHING_INDEX.md) ·
> full topology drawing → [system_data_flow.excalidraw](system_data_flow.excalidraw).

---

## 1 — Request Topology (what actually happens at runtime)

```
                          ┌─────────────────────────────────────────┐
  Browser / QR phone      │              CADDY  :80/:443             │
  (customer, staff,  ───► │  TLS termination + reverse proxy ONLY    │
   admin, KDS)            │  (NO response cache — no Cache-Control)  │
                          │   /api/*      → be:8080                  │
                          │   /webhooks/* → be:8080  (VNPay/MoMo)    │
                          │   /uploads/*  → be:8080  (product imgs)  │
                          │   /health     → be:8080                  │
                          │   everything else → fe:3000 (Next.js)    │
                          └───────────────┬──────────────┬──────────┘
                                          │              │
                       ┌──────────────────▼───┐     ┌────▼──────────┐
                       │   FE  Next.js 14      │     │  BE  Go/Gin   │
                       │   :3000               │     │  :8080        │
                       │   renders pages;      │     │  handler →    │
                       │   browser then calls  │     │  service →    │
                       │   the API for data    │     │  repository → │
                       └───────────────────────┘     │  sqlc/db      │
                                                      └──┬────────┬───┘
                                  cache-aside + pub/sub  │        │
                              ┌───────────────────▼──┐  ┌─▼──────────┐
                              │  REDIS (redis-stack) │  │  MySQL 8   │
                              │  1) CACHE (L2):       │  │  single    │
                              │     products:list     │  │  instance  │
                              │     toppings/combos/  │  │  (source   │
                              │     categories — 5m   │  │  of truth) │
                              │  2) PUB/SUB realtime: │  └────────────┘
                              │     order:<id>        │
                              │     orders:kds        │
                              │     orders:admin      │
                              │     queue/tables:bcast│
                              └──────────┬────────────┘
                                         │ fan-out
                          ┌──────────────▼───────────────┐
                          │ SSE streams (order tracking,  │
                          │ admin, monitor) + WS hub (KDS)│
                          │ each client = 1 goroutine +   │
                          │ 1 Redis Subscribe, 15s ♥beat  │
                          └───────────────────────────────┘

Side stack: Prometheus → Grafana + Loki/promtail (metrics & logs)
```

Redis plays **two distinct roles** with opposite scaling characteristics:

| Role | Path | Code | Scaling behaviour |
|---|---|---|---|
| **Cache** (read) | menu/products/toppings/combos/categories, cache-aside, 5-min TTL, write-invalidated | [`be/internal/service/product_service.go`](../../../be/internal/service/product_service.go) (`productCacheTTL`, `invalidateProductCaches`) | Cuts DB load on the read-hot catalog path |
| **Pub/Sub** (realtime) | order/queue/table events published on write, fanned out to SSE/WS subscribers | [`order_service.go`](../../../be/internal/service/order_service.go) `PUBLISH` · [`sse/handler.go`](../../../be/internal/sse/handler.go) `Subscribe` | **Decouples writers from readers → BE scales horizontally** |

---

## 2 — Is the design OK for scalability / performance?

**Architecturally: yes — sound and the right shape.** Honest framing: for one food stall, a single
BE + Redis + MySQL handles hundreds of concurrent diners with headroom. The topology is closer to
**over-built** (full Prometheus/Grafana/Loki) than under-built. So the assessment below weights
**real correctness/config risks** over theoretical throughput.

### Good decisions (keep)

- **Cache-aside on the read-hot catalog path** with write-invalidation — the correct pattern. Detail
  → [../10_caching/CACHE_FLOW_E2E.md](../10_caching/CACHE_FLOW_E2E.md).
- **Pub/Sub as the realtime backbone is the standout call.** Fan-out goes through Redis, not in
  process — so N BE instances behind Caddy each subscribe to Redis and every event still reaches
  every client. This is what makes the BE horizontally scalable; most implementations get this wrong.
- **Go/Gin goroutines** make thousands of idle SSE/WS connections cheap.

### 🚨 Real risks (these matter more than scale)

| # | Risk | Why it bites (code-confirmed) | Direction |
|---|---|---|---|
| 1 | **Pub/Sub is fire-and-forget → order status lost on reconnect** | Redis pub/sub has no persistence/replay, and **neither SSE handler replays the order's own current status on connect.** `StreamOrder` ([`sse/handler.go:50`](../../../be/internal/sse/handler.go#L50)) emits only `connected`, then loops on the channel ([handler.go:53-67](../../../be/internal/sse/handler.go#L53-L67)) — no DB read (`rdb` is its only dep). `StreamOrderMonitor` ([`sse/monitor_handler.go:59-65`](../../../be/internal/sse/monitor_handler.go#L59-L65)) snapshots **only** the queue + tables broadcast payloads, **not** the `order:<id>` status. So a status change during a disconnect window is gone on both paths; the client only stays correct because it separately fetched `GET /orders/:id`. | On (re)connect, read current order state from the repo and emit it before streaming deltas — both handlers. |
| 2 | **Caddy is bypassed by the browser today** | [`fe/src/lib/api-client.ts:7`](../../../fe/src/lib/api-client.ts#L7) `baseURL = process.env.NEXT_PUBLIC_API_URL ?? '…'`; [`docker-compose.yml:77,82`](../../../docker-compose.yml#L77) inlines `NEXT_PUBLIC_API_URL=http://localhost:8080` into the browser bundle → the browser calls BE **directly on :8080**, not through Caddy. In prod that defeats TLS + single entry (prod overlay tells you to firewall :8080, which would then break the app). | Point the FE origin at Caddy so `/api/*` routes through the proxy (already wired). Config gap, not redesign. |
| 3 | **One Redis connection per SSE/WS client** | Each subscriber opens its own `rdb.Subscribe` ([handler.go:42](../../../be/internal/sse/handler.go#L42)). **Connection count — not CPU — is the ceiling.** Fine at stall scale; watch Redis `maxclients` if screens fan out. | Acceptable now; revisit only at many concurrent screens. |

### ⚠️ Minor

- **BE serves product images** (`/uploads/*` → be:8080). CDN/object-storage territory at scale; fine at stall scale.
- **MySQL single instance** — correct call; do **not** add replicas you don't need.
- **No Caddy-level HTTP caching** — not needed given the Redis app-cache, but long cache headers on static FE assets would be free wins.
- **API base-URL prefix mismatch** — [`docker-compose.yml:77,82`](../../../docker-compose.yml#L77) sets `NEXT_PUBLIC_API_URL=http://localhost:8080` (no path), but the code fallback is `http://localhost:8080/api/v1` ([`api-client.ts:7`](../../../fe/src/lib/api-client.ts#L7)). Since the env var wins when set, the `/api/v1` prefix is dropped under compose — either request paths already carry `/api/v1`, or there's a latent routing bug. Worth a 2-min trace of one assembled request path; separate from #2.

---

## 3 — Bottom Line

The topology is well-chosen and genuinely scalable **where it counts** (BE horizontal via Redis
pub/sub). The work is **not** "make it scale" — it's tightening two gaps: **SSE reconnect
state-replay (#1)** and **routing the browser through Caddy (#2)**.

---

## Deep Dive Sources

| Topic | File |
|---|---|
| Full data-flow drawing (4 channels) | [system_data_flow.excalidraw](system_data_flow.excalidraw) |
| What the system does, actors, stack | [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) · [TECH_STACK.md](TECH_STACK.md) |
| Cross-layer caching design (L1/L2/L3) | [../10_caching/CACHING_INDEX.md](../10_caching/CACHING_INDEX.md) · [../10_caching/CACHE_FLOW_E2E.md](../10_caching/CACHE_FLOW_E2E.md) |
| Redis keys / TTL / fail-open / pub-sub channels | [../03_be/REDIS_CACHE.md](../03_be/REDIS_CACHE.md) |
| SSE/WS realtime architecture | [../03_be/REALTIME_SSE.md](../03_be/REALTIME_SSE.md) |
| Run/deploy/monitoring | [../09_devops/DEVOPS_INDEX.md](../09_devops/DEVOPS_INDEX.md) |
| Code | `Caddyfile` (routes, no cache) · `docker-compose.yml` (services) · `be/internal/service/product_service.go` (L2) · `be/internal/service/order_service.go` (publish) · `be/internal/sse/handler.go` (stream) |
