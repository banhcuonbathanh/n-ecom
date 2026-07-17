# Caching — Layer Map (FE → BE → DB)

> **TL;DR**
> The system has exactly **two caches**: TanStack Query in the browser (L1) and Redis on the BE (L2).
> MySQL (L3) is always the source of truth. There is **no HTTP cache layer** — Caddy and the BE set
> no `Cache-Control` headers, so every stale FE query produces a real request to the BE.
> Zustand/localStorage is client **state**, not a cache of server data — don't confuse the two.
> End-to-end read/write/invalidation flows with diagrams → [CACHE_FLOW_E2E.md](CACHE_FLOW_E2E.md).

---

## 1 — The Layer Stack

```
┌─ Browser tab ──────────────────────────────────────────────────────────┐
│  L1  TanStack Query cache                                              │
│      in-memory, per-tab, keyed by queryKey                             │
│      staleTime: 60 s default · 5 min for catalog (products/combos/…)   │
│                                                                        │
│  (not a cache) Zustand persist → localStorage                          │
│      cart note, favourites, settings — CLIENT-originated state only    │
└────────────────────────────│───────────────────────────────────────────┘
                             │  HTTP — no Cache-Control anywhere
                             │  (Caddyfile has no header/cache directives;
                             │   BE sets none) → every request reaches Gin
┌─ BE (Go + Gin) ────────────▼───────────────────────────────────────────┐
│  L2  Redis cache-aside                                                 │
│      catalog keys only · 5-min TTL · fail-open                         │
│      read: miss → DB → backfill · write: mutate DB → DEL keys          │
└────────────────────────────│───────────────────────────────────────────┘
┌─ MySQL 8 ──────────────────▼───────────────────────────────────────────┐
│  L3  Source of truth — always authoritative, never bypassed on writes  │
└────────────────────────────────────────────────────────────────────────┘
```

Realtime data (order status, KDS, admin floor) **bypasses both caches**: Redis pub/sub → SSE/WS →
`queryClient.setQueryData` patches L1 directly, no HTTP round-trip. See
[CACHE_FLOW_E2E.md §4](CACHE_FLOW_E2E.md#4--realtime-bypass-orders-are-pushed-not-cached).

---

## 2 — Who Owns What

| Layer | Lives in | What is cached | TTL / freshness | Invalidated by | Canonical doc |
|---|---|---|---|---|---|
| L1 TanStack Query | Browser memory (per tab) | Every API response the page queries | `staleTime` 60 s default; 5 min catalog | `invalidateQueries` on mutation success; SSE/WS `setQueryData` | [04_fe/STATE_MANAGEMENT.md](../04_fe/STATE_MANAGEMENT.md) |
| — Zustand persist | `localStorage` | Nothing server-side — cart note, favourites, settings | until cleared | app code only | [04_fe/STATE_MANAGEMENT.md](../04_fe/STATE_MANAGEMENT.md) |
| — HTTP | Caddy / browser HTTP cache | **Nothing** — no `Cache-Control` configured | — | — | `Caddyfile` (no header directives) |
| L2 Redis | Redis Stack container | 6 catalog/auth keys (`product:{id}`, `products:list`, …) | 5 min (`productCacheTTL`) | `invalidateProductCaches` → `DEL` on every write | [03_be/REDIS_CACHE.md](../03_be/REDIS_CACHE.md) |
| L3 MySQL | MySQL container | — (source of truth) | — | — | [02_spec/DB_SCHEMA.md](../02_spec/DB_SCHEMA.md) |

**One fact, one home:** the Redis key table, fail-open rules, and pub/sub channels live in
[REDIS_CACHE.md](../03_be/REDIS_CACHE.md); FE query keys and staleTime overrides live in
[STATE_MANAGEMENT.md](../04_fe/STATE_MANAGEMENT.md). This folder only owns the **cross-layer view** —
how the layers compose and the rules that span them.

---

## 3 — Cross-Layer Rules (the ones no single layer doc states)

1. **Two-sided invalidation.** A write to cached data is incomplete until BOTH happen:
   BE service `DEL`s the Redis keys (handbook Rule #7) **and** the FE mutation's `onSuccess`
   calls `invalidateQueries` for the matching query key. Miss either side and one layer serves stale data.
2. **Worst-case staleness adds up.** For a client that did NOT perform the write:
   FE staleTime + Redis TTL (catalog: 5 + 5 = up to **10 min** stale). Acceptable for catalog;
   this is exactly why orders/payments are never Redis-cached.
3. **Never cache money or live state.** Orders, payments, analytics → no Redis key, short FE
   staleTime, freshness via push (SSE/WS). The "must NEVER be cached" list is in
   [REDIS_CACHE.md §2](../03_be/REDIS_CACHE.md).
4. **Caches fail open, truth stays in MySQL.** Redis down = slower, never wrong.
   Any new cached value MUST have an authoritative DB copy and a fail-open code path.
5. **localStorage is not a cache.** It persists client-originated state (cart note, favourites).
   Never write server data into Zustand persist "to cache it" — that's L1's job, with staleness control.

---

## Deep Dive Sources

| Topic | File |
|---|---|
| End-to-end read/write/invalidation flows (diagrams) | [CACHE_FLOW_E2E.md](CACHE_FLOW_E2E.md) |
| Excalidraw drawing — all three flows on one canvas | [caching_flow.excalidraw](caching_flow.excalidraw) |
| Redis keys, TTLs, fail-open, pub/sub channels | [../03_be/REDIS_CACHE.md](../03_be/REDIS_CACHE.md) |
| FE query keys, staleTime overrides, Zustand persist rules | [../04_fe/STATE_MANAGEMENT.md](../04_fe/STATE_MANAGEMENT.md) |
| SSE/WS realtime architecture | [../03_be/REALTIME_SSE.md](../03_be/REALTIME_SSE.md) |
| Cache implementation | `be/internal/service/product_service.go` (`productCacheTTL`, `invalidateProductCaches`) · `fe/src/lib/providers.tsx` (QueryClient defaults) |
