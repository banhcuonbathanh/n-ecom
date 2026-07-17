# BE Quality Audit — Index

> Date: 2026-06-11 · Branch: `experience_claude.md_system_1` · Scope: `be/` (Go backend)
> 35 findings: 🔴 3 CRITICAL · 🟠 10 MAJOR · 🟡 17 MINOR · 💡 5 SUGGESTION

## Aspects checked (what each report covers)

| File | ID prefix | Aspects |
|---|---|---|
| [01_structure_patterns.md](01_structure_patterns.md) | S- | Layer boundaries (handler→service→repo→db) · response helper consistency · AppError unwrapping · DTO binding tags · DI/testability · transaction patterns · context timeouts · SSE/WS goroutine hygiene · duplication/dead code |
| [02_logic_business_rules.md](02_logic_business_rules.md) | L- | Order status state machine · 1-table-1-active-order · cancel threshold · total_amount recalc on every order_items mutation · combo/filling (OC epic) rules · payment idempotency + amount verification · race conditions · money math (int64 VND) |
| [03_database_schema_queries.md](03_database_schema_queries.md) | D- | Index coverage vs actual queries · data types (money, UUID PK, NULLability) · FKs + ON DELETE · ENUM/status consistency · migration hygiene · N+1 patterns · SELECT scope/LIMIT/pagination · row locking (FOR UPDATE) |
| [04_caching_performance.md](04_caching_performance.md) | C- | Redis usage map · menu/hot-path caching strategy · DB pool config · per-request work cacheable · Redis pool/timeout/degradation · pub/sub fanout + reconnect · cache invalidation · quick wins |
| [05_security.md](05_security.md) | SEC- | JWT (alg pinning, TTL, secret) · refresh rotation/revocation · is_active enforcement · RBAC per route + IDOR · SQL injection · file upload (MIME/size/path traversal) · mass assignment · webhook signature/replay · rate limiting · error/info leakage · CORS/headers · secrets + log hygiene · bcrypt cost |

## Fix order (apply one by one, top to bottom)

**🔴 Critical — fix first:**
1. **S-01** WS hub mutates map under RLock — data race (`internal/websocket/hub.go`)
2. **L-01** Cash payment leaves order stuck at `ready`, never reaches `paid` (`internal/service/payment_service.go`)
3. **L-02** Webhook double-completion race — no row lock (overlaps **D-02**, one fix covers both)

**🟠 Major — correctness:**
4. **S-02** POS live feed subscribed to `orders:kds` channel (copy-paste bug)
5. **D-01** `ListActiveOrders` omits `group_id` → always NULL in admin floor monitor
6. **S-03** `binding:"required"` on price fields rejects price=0
7. **L-04** `CreateGroup` not atomic — same order can join two groups
8. **L-03** 1-table-1-active-order not enforced — ⚠️ owner decision needed (spec says 409)

**🟠 Major — security & infra:**
9. **S-04 + SEC-03** WS endpoints: no RBAC, no is_active check (one fix covers both)
10. **SEC-02** WS JWT in query param logged by gin.Logger
11. **SEC-01** No rate limit on /auth/register (bcrypt CPU DoS)
12. **C-01** Redis client: no pool size/timeouts — exhausts under lunch-rush SSE load

**🟡 Minor / 💡 Suggestion:** work through each report's remaining findings after the above.

## Overlapping findings (don't fix twice)
- **L-02 ≈ D-02** — payment row locking (same fix)
- **S-04 ≈ SEC-03** — WebSocket RBAC/is_active (same fix)
- **S-02** and **SEC-02/SEC-03** all touch `internal/websocket/handler.go` — batch them in one pass

## How this audit was produced
3 parallel review agents (structure+logic · DB+caching · security), each reading actual source — every finding cites a verified `file:line`. Each report ends with a "What is GOOD" section: patterns to keep, not fix.
