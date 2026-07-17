# BE Audit 04 — Caching & Data-Access Performance
> BE Quality Audit — 2026-06-11 — branch experience_claude.md_system_1

## Summary

Redis is used correctly for its two primary roles: cache-aside for the read-heavy product catalogue (TTL 5 min, delete-on-write invalidation) and pub/sub fanout for SSE/WebSocket real-time events. The is_active per-request check is properly cached with fail-open semantics. Three issues were found. One is **MAJOR**: the Redis client is created with zero explicit pool/timeout configuration, which means the SSE fanout (potentially dozens of concurrent long-lived pub/sub connections) and the product cache share a single default pool that may exhaust under any real concurrency. One is **MINOR**: the DB pool is lopsided (MaxOpen=25 vs MaxIdle=5) which means 20 connections are discarded after the first burst and must be re-established on the next one. One is a **SUGGESTION** about the dead Bloom filter code. No stale-data risk was found in the invalidation strategy. No dropped-message risk was found in the pub/sub loop.

Severity breakdown: 🔴 CRITICAL 0 · 🟠 MAJOR 1 · 🟡 MINOR 2 · 💡 SUGGESTION 1

---

## What Redis Is Used For Today

| Usage | Keys / Channels | Where in code |
|---|---|---|
| Product/combo/category/topping list cache | `products:list`, `toppings:list`, `combos:list`, `categories:list` | `be/internal/service/product_service.go` |
| Single product cache | `product:{id}` | `be/internal/service/product_service.go` |
| Staff is_active check cache | `auth:staff:{id}` (TTL 5 min) | `be/internal/service/auth_service.go` |
| Login rate limit | `ratelimit:login:{ip}` (TTL 60s) | `be/internal/service/auth_service.go` |
| Daily order sequence counter | `order:seq:{YYYYMMDD}` (TTL 25h) | `be/internal/service/order_service.go` |
| SSE order tracking pub/sub | `order:{id}` channel | `be/internal/sse/handler.go` |
| SSE group tracking pub/sub | `group:{id}` channel | `be/internal/sse/group_handler.go` |
| KDS WebSocket fanout | `orders:kds` channel | published in order_service + payment_service |
| Admin SSE floor monitor | `orders:admin` channel | `be/internal/sse/admin_handler.go` |
| Order-monitor floor broadcast | `queue:broadcast`, `tables:broadcast` | `be/internal/service/order_service.go` |

Redis is purely an **accelerator**: every key has an authoritative copy in MySQL. All error paths (Redis unavailable) fail open — no request is blocked because Redis is down. This is the correct design for this workload.

---

## Findings

### C-01 [🟠 MAJOR] Redis client has no pool size, timeouts, or idle settings configured

- **Where:** `be/cmd/server/main.go:65`
- **Problem:**
  ```go
  rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
  ```
  Only `Addr` is set. The `go-redis` default options are:
  - `PoolSize`: 10 × `runtime.GOMAXPROCS(0)` — on a 2-core container this is 20 connections.
  - `ReadTimeout` / `WriteTimeout`: 3 seconds each.
  - `DialTimeout`: 5 seconds.
  - `MinIdleConns`: 0 — connections are not pre-warmed; the first burst will block while establishing connections.

  This client is shared by: (a) the product cache (short-lived GET/SET), (b) `auth:staff` per-request checks, and (c) every SSE/WS pub/sub subscribe call. Each `rdb.Subscribe(ctx, ...)` in the SSE handlers takes one connection from the pool for the entire lifetime of the HTTP connection. With 20 simultaneous SSE clients (one KDS screen + 10 table QR screens + 10 admin floor monitors) the pool can be exhausted, causing all further Redis operations — including the `auth:staff` is_active check — to block for up to `PoolTimeout` (default: `ReadTimeout + 1s = 4s`) before returning an error.

- **Why it matters:** On a busy lunch rush with multiple open SSE connections the product cache will return miss-and-DB-hit instead of the cached response, and the rate limiter will silently allow excess logins (both are fail-open). More critically, the order sequence counter (`order:seq:*`) will fall back to the MySQL `order_sequences` table on every order — which is correct functionally but adds a DB write on every order.

- **Fix:** Separate the pub/sub client from the cache/counter client. `go-redis` recommends a dedicated `redis.Client` for pub/sub because subscriptions hold connections open. Add explicit settings:
  ```go
  // Cache + counters client (short-lived ops)
  cacheRdb := redis.NewClient(&redis.Options{
      Addr:         redisAddr,
      PoolSize:     20,
      MinIdleConns: 5,
      ReadTimeout:  500 * time.Millisecond,
      WriteTimeout: 500 * time.Millisecond,
  })

  // Pub/sub client (long-lived subscriptions)
  pubsubRdb := redis.NewClient(&redis.Options{
      Addr:    redisAddr,
      PoolSize: 50,  // one per concurrent SSE/WS connection + headroom
  })
  ```
  This is a wiring change only (update service constructors to accept the appropriate client).

---

### C-02 [🟡 MINOR] DB connection pool is lopsided — MaxOpen=25 / MaxIdle=5

- **Where:** `be/cmd/server/main.go:45-47`
  ```go
  sqlDB.SetMaxOpenConns(25)
  sqlDB.SetMaxIdleConns(5)
  sqlDB.SetConnMaxLifetime(5 * time.Minute)
  ```
- **Problem:** `MaxOpen=25` means up to 25 concurrent DB connections. `MaxIdle=5` means only 5 are kept alive between requests. After any burst that opens more than 5 connections (e.g. the lunch order spike), 20 connections are closed and then must be re-established on the next request. Each new MySQL connection takes ~1–5 ms on localhost. With `ConnMaxLifetime=5min` this churn happens at most once every 5 minutes, but it creates a "cold pool" penalty at the start of every burst.
- **Why it matters:** Mild latency spike at the start of each lunch/dinner rush. Not a correctness issue, but unnecessarily wastes ~5–20 ms per request for the first wave of a burst.
- **Fix:** Set `MaxIdleConns` to the same value as `MaxOpenConns`, or at minimum to half:
  ```go
  sqlDB.SetMaxOpenConns(25)
  sqlDB.SetMaxIdleConns(25)   // keep all connections warm
  sqlDB.SetConnMaxLifetime(5 * time.Minute)
  sqlDB.SetConnMaxIdleTime(2 * time.Minute) // close truly idle connections sooner
  ```

---

### C-03 [🟡 MINOR] SSE pub/sub: no reconnect handling — closed channel causes silent client disconnect

- **Where:** `be/internal/sse/handler.go:57-60`, `be/internal/sse/monitor_handler.go:71-74`
- **Problem:**
  ```go
  case msg, ok := <-msgCh:
      if !ok {
          return  // ← handler exits, HTTP response ends
      }
  ```
  `pubsub.Channel()` returns a Go channel that `go-redis` closes when the underlying Redis connection is lost (network blip, Redis restart). When `ok == false` the SSE handler simply returns, which terminates the HTTP response. The browser/client will attempt an automatic SSE reconnect (browsers retry after 3 seconds by default), but:
  1. The client receives no `retry:` directive to control the reconnect interval.
  2. During a Redis restart, every SSE client disconnects and reconnects simultaneously, creating a thundering-herd reconnect storm to both the Go server and Redis.
  3. The client has no indication that a disconnect was caused by a server-side Redis failure vs a normal order completion.
- **Why it matters:** During a Redis restart or brief network blip, all active floor-monitor, KDS, and order-tracking screens will go blank for 3+ seconds. For a kitchen display screen this is disruptive during a rush. This is not a data-corruption risk, just an availability/UX risk.
- **Fix:**
  1. Add `fmt.Fprintf(c.Writer, "retry: 2000\n\n")` immediately after the connected event to tell the browser to reconnect within 2 seconds.
  2. On `!ok`, log a warning and return (current behaviour is correct — the browser will reconnect). Do not try to re-subscribe inside the handler loop; let the reconnect flow handle it naturally.
  3. The monitor handler (`StreamOrderMonitor`) already handles the reconnect gracefully via the `snapshot` function — the initial snapshot is replayed on every connect. This is the correct pattern; extend it to `StreamOrder` and `StreamAdmin` too.

---

### C-04 [💡 SUGGESTION] Dead Bloom filter code in `pkg/redis/bloom.go` — delete or document

- **Where:** Referenced in `docs/be/be_code_summary/DB_SCHEMA_SUMMARY.md` §Redis Key Schema (note: "`BFAdd`/`BFExists` exist in `pkg/redis/bloom.go` but have zero call sites")
- **Problem:** The `bloom.go` file exists with Redis Bloom filter helpers (`BFAdd`, `BFExists`) but has zero call sites anywhere in the codebase. This is dead code.
- **Why it matters:** No runtime risk. The risk is confusion: future developers reading the DB_SCHEMA_SUMMARY note may assume Bloom filters are in use and try to reason about their effect on correctness.
- **Fix:** Delete `be/pkg/redis/bloom.go`. If there is a plan to use Bloom filters in the future (e.g. for duplicate order-number rejection), add a TODO comment in the order service instead. Do not carry dead infrastructure code.

---

## What is GOOD (keep doing)

- **Fail-open pattern is applied consistently.** Every Redis error path — is_active cache miss, rate limit INCR error, cache GET/SET error — logs a warning and allows the request to proceed. There is no Redis failure that produces a 500 to the client. This is the correct design when Redis is an accelerator, not the source of truth.
- **Cache invalidation on all write paths.** Every product/combo/topping/category mutation calls `invalidateProductCaches`, `invalidateToppingCaches`, or `invalidateComboCaches` before returning. The `products:list` cache is invalidated on both product writes AND topping writes (because the product list response embeds toppings). No stale-data path was found.
- **TTL discipline.** Product caches use 5-min TTL consistently. The is_active cache uses 5-min TTL. The order sequence counter uses 25h TTL (one day + 1h buffer). No cache key has an infinite TTL.
- **Order sequence Redis fallback.** `generateOrderNumber` (order_service.go:774-786) gracefully falls back to a timestamp-based number when Redis is unavailable. The MySQL `order_sequences` table provides a durable fallback.
- **Initial snapshot on SSE connect.** `StreamOrderMonitor` calls `snapshot(ctx)` immediately after subscribing and sends the current queue + tables state before the loop starts. This prevents the "flash of empty content" that would occur if the client had to wait for the next pub/sub event. This pattern should be extended to `StreamAdmin` (see C-03 fix suggestion).
- **Per-request is_active check is cheap.** The `IsStaffActive` path (auth_service.go:317-334) checks Redis first (O(1), ~0.1ms), falls back to DB only on cache miss, and re-populates the cache on miss. The DB query on miss hits `idx_staff_is_active`. This is a well-implemented hot-path optimization.
- **Menu path is fully cached.** `ListProducts`, `ListCombos`, `ListToppings`, `ListCategories` all check Redis before hitting MySQL. The hottest read path (every QR scan loads the menu) will almost never touch the DB. TTL is 5 min — acceptable for a menu that changes rarely.

---

## Top 5 Cheapest Changes for Biggest Latency Wins

| Rank | Change | Effort | Latency Impact |
|---|---|---|---|
| 1 | **Fix C-01** — Add Redis pool config and split pub/sub client from cache client | 1h (config + wiring change, no logic change) | Prevents pool exhaustion under concurrent SSE load; sub-millisecond improvement on cache ops |
| 2 | **Fix D-01** — Add `group_id` to `ListActiveOrders` / `ListTodayHistory` scans | 30min | Correctness fix: floor monitor GroupID display works without extra queries |
| 3 | **Fix C-02** — Set `MaxIdleConns=25` to match `MaxOpenConns` | 5min (one line) | Eliminates cold-pool reconnect latency at start of each rush |
| 4 | **Fix D-03** — Remove DATE() wrappers; use range predicates on `due_at` and `created_at` | 1h (query changes + sqlc regenerate) | Enables index range scans on analytics and task queries |
| 5 | **Fix C-03** — Add `retry: 2000` directive to SSE handlers | 15min | Guarantees sub-2s recovery for all screen types after a Redis blip |
