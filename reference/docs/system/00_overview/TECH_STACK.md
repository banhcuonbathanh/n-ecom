# Tech Stack — Hệ Thống Quản Lý Quán Bánh Cuốn

> **TL;DR:** Go/Gin backend with sqlc + MySQL + Redis Stack. Next.js 14 App Router frontend with
> Zustand + TanStack Query. Deployed via Docker Compose behind Caddy (auto-HTTPS). Realtime is
> split: WebSocket for staff dashboards, SSE for customer order tracking.

---

## 1. Backend Layer

| Technology | Version | Role | Why |
|---|---|---|---|
| **Go** | 1.25 | Language | High performance, small binary, strong concurrency for WS/SSE hubs |
| **Gin** | latest | HTTP framework | Minimal overhead, mature middleware ecosystem |
| **sqlc** | latest | SQL → Go code generator | Type-safe DB queries from `.sql` files; no ORM magic, no raw strings |
| **database/sql** | stdlib | DB driver interface | Pairs with sqlc; supports `*sql.Tx` for transactions |
| **MySQL** | 8.0 | Primary relational DB | ACID, FK constraints, UUID-keyed tables; VND prices as `DECIMAL(10,0)` |
| **Redis Stack** | 7 | Cache + Pub/Sub + Bloom filter | JWT blacklist, staff active-check cache (5 min TTL), SSE fan-out |
| **Goose** | latest | DB migration tool | Versioned SQL migrations in `be/migrations/` |
| **shopspring/decimal** | latest | Decimal arithmetic | Avoids float64 rounding errors on VND prices |
| **bcrypt** | stdlib | Password hashing | cost=12; login errors are non-differentiating (same message for bad user vs bad pass) |

---

## 2. Frontend Layer

| Technology | Version | Role | Why |
|---|---|---|---|
| **Next.js** | 14 (App Router) | React framework | SSR + client components; file-system routing maps to domain flows naturally |
| **TypeScript** | strict | Language | Strict mode enforced; reduces runtime errors in cart/order logic |
| **Tailwind CSS** | v3 | Styling | Utility-first; design token config in `tailwind.config.ts`; avoids CSS specificity wars |
| **Zustand** | v4 | Client state | Lightweight; stores: `authStore` (tokens, memory-only), `cartStore` (cart + tableId) |
| **TanStack Query** | v5 | Server state | All API GET data goes through Query (cache + stale-while-revalidate + invalidate) |
| **React Hook Form + Zod** | latest | Forms + validation | Schema-driven; validates before submit; inline error display |
| **axios** | latest | HTTP client | Interceptor handles: attach Bearer token, 401 → refresh → retry, guest redirect |

---

## 3. Realtime Layer

| Protocol | Endpoint(s) | Who Uses It | Why |
|---|---|---|---|
| **WebSocket** | `/ws/kds?token=` | Chef (KDS) | Push new orders instantly; browser WS API cannot set headers → `?token=` query param |
| **WebSocket** | `/ws/orders-live?token=` | Cashier, Manager, Payment page | POS order updates + `payment_success` events |
| **SSE** | `/api/v1/orders/:id/stream` | Customer (order detail) | Browser `EventSource` supports headers; Bearer token OK |
| **SSE** | `/api/v1/orders/monitor/stream` | Customer (tracking) | Same; subscription to active order's Redis channel |
| **SSE** | `/api/v1/admin/events` | Manager (overview) | Combined with WS for dual realtime on floor view |

Reconnect config (shared): exponential backoff 1 s → 2 s → 4 s … max 30 s, 5 attempts; banner after 3 failures.

---

## 4. Auth Layer

| Concern | Mechanism | Detail |
|---|---|---|
| Staff access token | JWT (HMAC-SHA256) | 24 h TTL; stored in Zustand memory only (never localStorage) |
| Staff refresh token | Random 32 bytes → SHA256 hex → httpOnly cookie | 30 d TTL; JS cannot read it |
| Guest JWT (customer) | Stateless JWT | 2 h TTL; `sub="guest"`, `table_id` claim; no DB row, no refresh |
| JWT blacklist | Redis `logout:{jti}` | Added on logout; checked before every authenticated request |
| Staff active check | Redis `auth:staff:{id}` (5 min TTL) | Instant effect when admin deactivates — cache invalidated immediately |
| RBAC | Gin middleware | `RequireRole(...)`, `AtLeastRole(...)`, `RequireOwner()` — never hardcoded in handlers |

---

## 5. Infra / DevOps Layer

| Technology | Version | Role | Why |
|---|---|---|---|
| **Docker** | latest | Containerisation | Single `docker compose up` spins full stack |
| **Docker Compose** | v2 | Orchestration | Services: `be`, `fe`, `mysql`, `redis`, `caddy`, `swagger` |
| **Caddy** | v2 | Reverse proxy + HTTPS | Auto TLS; routes `/api/` → BE, `/` → FE; zero cert config |
| **GitHub Actions** | — | CI/CD | Lint + build + test on push; deploy on merge to main |
| **Goose** | — | Migration runner | `migrate.sh` runs on deploy before server start |

---

## 6. Ports (local / Docker)

| Service | Port | Notes |
|---|---|---|
| Frontend (Next.js) | **3000** | `npm run dev` or `docker compose up fe` |
| Backend (Go/Gin) | **8080** | REST + WS |
| MySQL | **3306** | — |
| Redis | **6379** | — |
| RedisInsight (UI) | **8001** | Debug Redis in browser |
| Swagger UI | **8090** | `docker compose up swagger`; serves the OpenAPI spec (endpoint summary: `../02_spec/API_SPEC.md`) |
| Caddy (HTTPS) | **443 / 80** | Production only |

---

## 7. Repo Layout

```
/
├── be/                          ← Go backend
│   ├── go.mod
│   └── internal/
│       ├── db/                  ← sqlc generated (DO NOT edit manually)
│       ├── handler/             ← Gin route handlers
│       ├── service/             ← Business logic
│       └── repository/          ← Wraps sqlc Querier
├── fe/                          ← Next.js frontend
│   ├── src/
│   │   ├── app/                 ← App Router pages
│   │   ├── components/          ← Shared + UI atoms
│   │   ├── hooks/               ← Shared query/SSE/WS hooks
│   │   ├── store/               ← Zustand stores
│   │   └── lib/                 ← api-client, utils, storage-keys
│   └── package.json
├── migrations/                  ← Goose SQL migrations (DDL source of truth)
├── query/                       ← SQL queries for sqlc
├── sqlc.yaml                    ← sqlc config (root level)
├── docker-compose.yml
├── Caddyfile
└── docs/                        ← All project documentation
    └── system/                  ← THIS handbook (self-contained)
```

---

## Deep Dive Sources

| Topic | File |
|---|---|
| System description (full) | `SYSTEM_OVERVIEW.md` (same folder) |
| Per-spec tech notes | `../03_be/BE_TECH_SUMMARY.md` + `../04_fe/FE_TECH_SUMMARY.md` |
| BE code conventions | `../03_be/BE_TECH_SUMMARY.md` |
| FE code conventions | `../04_fe/FE_TECH_SUMMARY.md` |
| Docker / infra setup | `docker-compose.yml` + `Caddyfile` (repo root) — summary in §5 above |
| OpenAPI spec | `../02_spec/API_SPEC.md` — browse via Swagger UI at :8090 |
