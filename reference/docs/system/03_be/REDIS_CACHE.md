# Redis Caching Strategy

> **TL;DR**
> Redis is a pure accelerator — every cached value has an authoritative copy in MySQL.
> One pattern only: **cache-aside (lazy)**. Read = miss → DB → backfill. Write = mutate DB → `Del` keys.
> Six cache keys (all 5-min TTL), two counters, and seven pub/sub channels.
> All Redis touchpoints **fail open** — a Redis outage degrades performance, never correctness.

---

## 1 — The Only Pattern: Cache-Aside (Lazy)

No write-through, no write-behind, no cache-update-in-place.

**Read path:**
```
1. GET cache key → hit? → unmarshal JSON → return
2. miss → query DB
3. SET key = JSON, TTL
4. return DB value
```

**Write path (any mutation):**
```
1. Mutate MySQL (source of truth)
2. DEL the affected cache keys   ← always delete, never update
```

Next read repopulates lazily. Simpler and race-safe.

---

## 2 — What Is Cached

| Key Pattern | Type | TTL | Backfilled by | Invalidated by |
|---|---|---|---|---|
| `product:{id}` | String (JSON) | 5 min | `GetProduct` on miss | any product write |
| `products:list` | String (JSON) | 5 min | `ListProducts` on miss | product **or** topping write |
| `toppings:list` | String (JSON) | 5 min | `ListToppings` on miss | topping write |
| `combos:list` | String (JSON) | 5 min | `ListCombos` on miss | combo write |
| `categories:list` | String (JSON) | 5 min | `ListCategories` on miss | product **or** category write |
| `auth:staff:{id}` | String `'active'`/`'disabled'` | 5 min | `IsStaffActive` on miss | staff (de)activation via `staffActiveKey(id)` helper |

Invalidation is explicit: `product_service.go` calls `invalidateProductCaches` on every product write, which Dels `products:list` + `categories:list` + `product:{id}`. **Category writes** (`Create`/`Update`/`DeleteCategory`) also call `invalidateProductCaches(ctx,"")` → Del `products:list` + `categories:list` (no `product:{id}` when `id==""`). Topping write also Dels `products:list` (products embed toppings in their response).

### Must NEVER be cached

Orders, order items, payments, analytics/summary, ingredients, staff list, tables, training, tasks. These are write-heavy, money-critical, or low-traffic — the staleness risk is not worth it. Do not add caching here without a measured reason.

---

## 3 — Non-Cache Redis Usage (Same Instance)

| Use | Key / Channel | Type | TTL | Notes |
|---|---|---|---|---|
| Login rate limit | `ratelimit:login:{ip}` | Counter | 60 s | INCR; `> 5` → `429 RATE_LIMIT_EXCEEDED`; fail-open |
| Order-number sequence | `order:seq:{YYYYMMDD}` | Counter | 25 h | INCR → `ORD-YYYYMMDD-NNN`; DB `order_sequences` is the fallback |
| SSE order tracking | `order:{id}` | Pub/Sub channel | ephemeral | Published by `order_service`, subscribed by `sse/handler.go` |
| SSE group tracking | `group:{id}` | Pub/Sub channel | ephemeral | Published by `group_service`, subscribed by `sse/group_handler.go` |
| KDS WebSocket fanout | `orders:kds` | Pub/Sub channel | ephemeral | Published by `order_service` + `payment_service` |
| Admin SSE floor monitor | `orders:admin` | Pub/Sub channel | ephemeral | Published by `order_service`, subscribed by `sse/admin_handler.go` |
| Order-monitor queue | `queue:broadcast` | Pub/Sub channel | ephemeral | Subscribed by `sse/monitor_handler.go` |
| Table state broadcast | `tables:broadcast` | Pub/Sub channel | ephemeral | Subscribed by `sse/monitor_handler.go` |

---

## 4 — Fail-Open Behavior (when Redis is unavailable)

| Touchpoint | Redis error | Behavior |
|---|---|---|
| `IsStaffActive` | Redis down | **Return `true`** — fail open; a blip must not lock out all staff |
| `checkLoginRateLimit` | Redis down | **Allow the request** — don't block logins on cache outage |
| Product cache read | Redis down or miss | Treat as miss → query DB → no backfill attempt on error |
| Product cache write invalidation | Redis down | Log warning, continue — DB already mutated, next read repopulates |
| Order sequence counter | Redis down | Fall back to DB `order_sequences` INSERT ON DUPLICATE KEY |

**Trade-off to know:** Fail-open on `is_active` and rate-limit means a Redis outage briefly weakens those two controls (a just-disabled staff could act until their token expires; login throttling lapses). This is the deliberate choice here — availability over strictness. Change both spots if a project needs fail-closed.

---

## 5 — Known Issues (from audit)

| ID | Severity | Issue |
|---|---|---|
| C-01 | Major | Redis client created with zero pool/timeout config — single client shared by cache ops and long-lived SSE pub/sub subscriptions. May exhaust pool under concurrent SSE load. Fix: separate pub/sub client from cache client. |
| C-02 | Minor | DB pool lopsided (`MaxOpen=25` / `MaxIdle=5`). Fix: set `MaxIdleConns=25`. |
| C-03 | Minor | SSE handlers return on closed pub/sub channel without `retry:` directive to client. Fix: add `retry: 2000` directive. |
| C-04 | Suggestion | `pkg/redis/bloom.go` has zero call sites — dead code. Delete or wire up. |

---

## 6 — Reuse Checklist (porting to another project)

1. Keep Redis as accelerator-only — every key needs an authoritative DB copy.
2. Cache-aside only: read→miss→DB→backfill; write→mutate DB→`Del`. No write-through.
3. Cache read-heavy + rarely-changing data (catalog, feature flags). Leave money/write-heavy on DB.
4. Decide fail-open vs fail-closed **per touchpoint**, document it.
5. Invalidate by deleting keys, never by updating cached values in place.
6. Use one TTL constant per cache family.
7. Use a **separate Redis client** for pub/sub subscriptions (long-lived connections) vs. cache GET/SET.

---

## Deep Dive Sources

| Topic | File |
|---|---|
| Strategy narrative + fail-open reasoning | this file (§1 + §4) — in-handbook source |
| Redis key table (verified against code) | §2–§3 above |
| Cache implementation | `be/internal/service/product_service.go` (`invalidateProductCaches`) + `pkg/redis/` |
| Realtime pub/sub architecture | `docs/system/03_be/REALTIME_SSE.md` |
