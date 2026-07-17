# LOGIC_DEVOPS — Infra-Coupled Business Logic

> **TL;DR:** The business logic that lives in infrastructure: fixed ports, the
> rebuild-after-change rule, Caddy's SSE/WS proxy requirements (no buffering, 15 s heartbeat),
> Redis's three roles (blacklist · pub/sub · cache), the goose → sqlc migration sequence, env
> touchpoints, and webhook exposure. Anything not actually configured is marked 🔮 PLANNED.
> **Mandate:** consult + update this file before changing any infra-coupled logic →
> [LOGIC_INDEX.md](LOGIC_INDEX.md).

---

## 1 — Ports (fixed contract)

Source: [TECH_STACK §6](../00_overview/TECH_STACK.md#6-ports-local--docker).

| Service | Port |
|---|---|
| FE (Next.js) | **3000** |
| BE (Go/Gin — REST + WS + SSE) | **8080** |
| MySQL | **3306** |
| Redis | **6379** |
| RedisInsight | **8001** |
| Swagger UI | **8090** |
| Caddy (production HTTPS) | **443 / 80** |

FE default API base is `http://localhost:8080/api/v1` (`NEXT_PUBLIC_API_URL` override). Changing
a port is a logic change — it breaks the FE base URL, the Caddyfile routes, and QR URLs; route it
through this file first.

---

## 2 — Docker Compose Rebuild Rule

Services: `be`, `fe`, `mysql`, `redis`, `caddy`, `swagger`
([TECH_STACK §5](../00_overview/TECH_STACK.md#5-infra--devops-layer)).

- **After any BE or FE code change:** `docker compose up -d --build be fe` — the containers run
  built images; a plain restart serves stale code.
- `docker compose down -v` wipes the MySQL volume — dev only, never as a "fix".
- One `docker compose up -d` brings up the full stack; BE runs auto-migration on start
  ([BE_CODE_SUMMARY §1](../03_be/BE_CODE_SUMMARY.md) — `cmd/server/main.go`).

---

## 3 — Caddy Proxy — SSE/WS Requirements

Caddy terminates TLS and routes `/api/` → BE :8080, everything else → FE :3000
([TECH_STACK §5](../00_overview/TECH_STACK.md#5-infra--devops-layer)). Realtime constraints the
proxy must respect ([REALTIME_SSE](../03_be/REALTIME_SSE.md)):

| # | Requirement | Why |
|---|---|---|
| 1 | **No response buffering** on SSE routes — BE sends `X-Accel-Buffering: no` + `Cache-Control: no-cache`; the proxy must stream, not buffer | Buffered SSE = customer sees nothing until disconnect |
| 2 | **Heartbeat `: keep-alive` every 15 s** from BE must reach the client | Prevents proxy idle-timeout from killing tracking streams |
| 3 | Proxy idle/read timeouts on `/api/v1/orders/:id/events`, `/api/v1/sse/*` must exceed the heartbeat interval | Same |
| 4 | WebSocket upgrade must be proxied for `/api/v1/ws/kds` and `/api/v1/ws/orders-live` | KDS/POS realtime |
| 5 | WS auth rides in `?token=` query param — ⚠️ it appears in access logs (known audit issue SEC-02); production logging should redact it | Token leakage |

---

## 4 — Redis Roles

One Redis instance, three distinct roles ([REDIS_CACHE](../03_be/REDIS_CACHE.md) ·
[REALTIME_SSE §1](../03_be/REALTIME_SSE.md)). All roles **fail open** — a Redis outage degrades
performance/realtime, never correctness; MySQL is always the source of truth.

| Role | Keys / channels | Behaviour if Redis is down |
|---|---|---|
| Auth blacklist + staff-active cache + rate limit | `logout:{jti}` · `auth:staff:{id}` · `ratelimit:login:{ip}` | Fail open (staff stays active, logins allowed) |
| Pub/Sub fanout (SSE + WS) | `order:{id}` · `group:{id}` · `orders:kds` · `orders:admin` · `queue:broadcast` · `tables:broadcast` | Events lost for that instant; SSE snapshot restores on reconnect |
| Catalog cache + order sequence | `product:*`, `*:list` (5-min TTL) · `order:seq:{date}` | Cache miss → DB; sequence falls back to DB `order_sequences` |

Restarting Redis drops all SSE/WS subscriptions at once (thundering-herd reconnect — audit C-03).
Do it off-peak.

---

## 5 — Migration Sequence (goose + sqlc)

Source: [BE_CODE_SUMMARY §4](../03_be/BE_CODE_SUMMARY.md#4--where-sqlc-lives).

```
1. New goose migration in be/migrations/ (DDL only, versioned 001–017+)
2. goose -dir be/migrations mysql "$DB_DSN" up
3. cd be && sqlc generate          ← MANDATORY after any column add/remove
4. go build ./...                  ← catches scan/compile breakage immediately
5. docker compose up -d --build be
```

- Skipping `sqlc generate` after a schema change causes `SELECT *` scan failures — the most
  common BE breakage.
- `be/internal/db/` is generated — never hand-edited, never hand-fixed to "make it build".
- BE auto-migrates on container start, so deploy order is: image with new migration first, then
  any FE that depends on the new field.

---

## 6 — Webhook Exposure

Payment gateways (VNPay / MoMo / ZaloPay) must reach the BE webhooks
(`POST /api/v1/payments/webhook/{gateway}` — public routes, HMAC-verified, see
[PAYMENT_FLOW](../01_flow/PAYMENT_FLOW.md) and [LOGIC_BE §6](LOGIC_BE.md#6--payment-rules)).

| Env | Exposure |
|---|---|
| Production | Public `WEBHOOK_BASE_URL` through Caddy (HTTPS) |
| Local sandbox 🔮 PLANNED | ngrok tunnel → `WEBHOOK_BASE_URL=<ngrok URL>` — sandbox testing not yet performed |

Infra rule: webhook routes bypass auth middleware by design — security is the HMAC check inside
the handler. Never put them behind a login wall, and never strip/rewrite the query string or body
in the proxy (HMAC is computed over them).

---

## 7 — Env Config Touchpoints

Key vars ([BE_TECH_SUMMARY §5](../03_be/BE_TECH_SUMMARY.md)):

| Var | Logic it carries |
|---|---|
| `DB_DSN` | MySQL connection (required) |
| `REDIS_ADDR` | Redis (default `redis:6379`) |
| `JWT_SECRET` | HMAC signing — rotating it invalidates **all** live tokens (staff + guest) |
| `JWT_ACCESS_TTL` | Staff access lifetime (default 86400 s) — pairs with the FE refresh interceptor |
| `WEBHOOK_BASE_URL` | Public callback base for gateways (required for online pay) |
| `VNPAY_*` / `MOMO_*` / `ZALOPAY_*` | Gateway credentials + HMAC keys |
| `CORS_ORIGINS` | Allowed FE origin (default `http://localhost:3000`) |
| `STORAGE_BASE_URL` / `STORAGE_BASE_PATH` | Image URL prefix / upload disk root |
| `NEXT_PUBLIC_API_URL` (FE) | BE base URL — must track port/proxy changes (§1) |

Adding an env var = update `.env.example` + this table in the same change.

---

## 8 — Backup / Rollback Expectations

| Concern | State |
|---|---|
| Code rollback | ✅ Git checkpoint commit before every task (`checkpoint: before <task>`) → `git reset --hard` + `docker compose up -d --build be fe` |
| Schema rollback | ✅ goose `down` migrations exist per version — but data written by the new code is not auto-reverted; plan data handling per migration |
| MySQL data backup | 🔮 PLANNED — no automated backup job is documented in this handbook; do not assume one exists |
| Redis persistence | Not relied upon — every key is rebuildable from MySQL or is ephemeral ([§4](#4--redis-roles)); Redis loss is acceptable by design |
| Monitoring | Prometheus `/metrics` endpoint exposed by BE ([BE_CODE_SUMMARY §3](../03_be/BE_CODE_SUMMARY.md)); alerting setup 🔮 PLANNED (not documented here) |
