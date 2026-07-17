# BE Caching Strategy

> **Version:** v1.0 · 2026-06-05 (P-BEBLUEPRINT-3)
> **Purpose:** the cross-cutting *how/why* of Redis in this BE — the one caching narrative the other summaries don't give. Pairs with the corrected key table in [`DB_SCHEMA_SUMMARY.md → Redis Key Schema`](be_code_summary/DB_SCHEMA_SUMMARY.md#-redis-key-schema).
> **Source of truth:** `os`-grep of `be/internal/service/*.go` (every `rdb.Get/Set/Del/Incr/Expire/Publish`). This doc reflects what the code actually does, not what was once planned.

---

## 0 — One-line philosophy

**Redis is a pure accelerator, never a system of record.** Every cached value has an authoritative copy in MySQL. If Redis is empty or down, the system degrades to DB-only — it never hard-fails on a Redis outage. This is the single most important rule to preserve when reusing the BE.

---

## 1 — The only pattern: cache-aside (lazy)

There is no write-through, no write-behind. Two halves:

**Read** (e.g. `ProductService.GetProduct`):
```
1. Get cache key → hit?  → unmarshal JSON, return.
2. miss → query DB.
3. backfill: Set key = JSON, TTL.
4. return DB value.
```

**Write** (any product/topping/combo mutation):
```
1. mutate MySQL (the source of truth).
2. Del the affected cache keys.   ← invalidation = delete, never update-in-place
```

Next read repopulates lazily. We never try to keep the cache value in sync on write — we just drop it. Simpler and race-safe.

---

## 2 — What is cached (and what is deliberately not)

| Cached | Key | TTL | Backfilled by | Invalidated by |
|---|---|---|---|---|
| Single product (enriched JSON) | `product:{id}` | 5 min | `GetProduct` on miss | any product write |
| Product list | `products:list` | 5 min | list read on miss | product **or** topping write |
| Topping list | `toppings:list` | 5 min | list read on miss | topping write |
| Combo list | `combos:list` | 5 min | list read on miss | combo write |
| Category list | `categories:list` | 5 min | list read on miss | product write (category map) |
| Staff `is_active` flag | `auth:staff:{id}` | 5 min | `IsStaffActive` on miss | (de)activation — see §4 ⚠️ |

**Not cached — always hit DB:** orders, order items, payments, analytics/summary, ingredients, staff list, tables, training, tasks. These are either write-heavy, money-critical, or low-traffic, so the staleness risk isn't worth it. Don't add caching here without a reason.

> Invalidation key sets are explicit in `product_service.go`: product write Dels `products:list` + `categories:list` + `product:{id}`; topping write Dels `toppings:list` + `products:list`; combo write Dels `combos:list`.

---

## 3 — Non-cache Redis usage (same instance, different jobs)

Redis also backs two non-cache features and the realtime fan-out:

| Use | Key / channel | TTL | Notes |
|---|---|---|---|
| Login rate limit | `ratelimit:login:{ip}` | 60 s | `Incr`; TTL set on first hit; `> 5` ⇒ `RATE_LIMIT_EXCEEDED` |
| Order-number sequence | `order:seq:{YYYYMMDD}` | 25 h | `Incr` → `ORD-YYYYMMDD-NNN`; DB `order_sequences` is the fallback counter |
| Realtime fan-out (Pub/Sub) | `order:{id}` · `group:{id}` · `orders:kds` · `orders:admin` · `queue:broadcast` · `tables:broadcast` | n/a | ephemeral; SSE/WS handlers subscribe. Not cache — see [`BE_STRUCTURE.md → Realtime`](be_code_summary/BE_STRUCTURE.md#realtime-architecture) |

---

## 4 — Fail-open: behavior when Redis is unavailable

Every Redis touchpoint degrades gracefully. This is intentional and tested.

| Touchpoint | Redis error | Cache miss (`redis.Nil`) |
|---|---|---|
| `IsStaffActive` | **return `true`** (fail open — a Redis blip must not lock out every staff) | DB lookup → backfill |
| `checkLoginRateLimit` | **allow the request** (fail open — don't block logins on a cache outage) | normal counting |
| product read | treat as miss → DB | DB → backfill |
| product write invalidation | log a warning, proceed (DB already mutated) | — |

> Trade-off to know when reusing: fail-open on `is_active` and rate-limit means a Redis outage **weakens** those two controls (a just-disabled staff could act until their token expires; login throttling lapses). That is the deliberate choice here — availability over strictness. If a project needs the opposite (fail-closed), change these two spots and document it.

---

## 5 — Known gaps surfaced during this audit

1. **✅ FIXED — `is_active` invalidation key mismatch.** The staff-admin path (`SetStaffStatus`/`DeleteStaff`) previously cleared `is_active:{id}` while the auth path reads/writes `auth:staff:{id}`, so deactivating via the admin staff page didn't invalidate the real cache (staff kept passing the check for up to 5 min). All five call sites now go through a single `staffActiveKey(id)` helper in `auth_service.go` — one definition, no drift. Covered by the passing auth + payment service tests.
2. **⚠️ OPEN — Bloom filters defined but never called.** `pkg/redis/bloom.go` exposes `BFAdd`/`BFExists` with zero call sites. Either wire them into an existence-check hot path or delete the dead code; until then they are not part of the strategy.

---

## 6 — Reuse checklist (porting caching to another project)

1. Keep Redis as accelerator-only — every cached key needs an authoritative DB copy.
2. Cache-aside only: read→miss→DB→backfill; write→mutate DB→`Del` keys. No write-through.
3. Cache read-heavy + rarely-changing data (catalog, feature flags). Leave money/write-heavy paths on the DB.
4. Decide fail-open vs fail-closed **per touchpoint** and write it down (§4).
5. Invalidate by deleting keys, never by updating cached values in place.
6. One TTL constant per cache family (here: 5 min for catalog + is_active) — easy to reason about.

---

*BanhCuon System · BE Caching Strategy · v1.0 · 2026-06-05*
