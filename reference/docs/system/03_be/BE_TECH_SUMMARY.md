# BE Tech Summary

> **TL;DR**
> Go 1.25 + Gin HTTP server. Strict 4-layer architecture: `handler → service → repository → db (sqlc)`.
> MySQL 8.0 for data; Redis Stack for catalog cache, rate limiting, order-number sequencing, and realtime pub/sub.
> JWT-based auth (staff: 24 h access + 30 d httpOnly refresh; guest: 2 h stateless).
> All service errors flow through `AppError` → `respondError` — never raw `err.Error()` to clients.

---

## 1 — Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Language | Go | 1.25 |
| HTTP framework | Gin | latest |
| DB driver + query gen | sqlc + `database/sql` | latest |
| DB | MySQL | 8.0 |
| Cache + pub/sub | Redis Stack | 7 |
| DB migrations | Goose | — |
| Password hashing | bcrypt | cost = 12 |
| JWT | `golang-jwt/jwt` | HMAC-SHA256 |
| Container | Docker Compose | — |
| Reverse proxy | Caddy | — |
| Metrics | Prometheus (`promhttp`) | — |

Ports (dev): **BE=8080 · MySQL=3306 · Redis=6379 · RedisInsight=8001**

---

## 2 — Layer Architecture (strict — no exceptions)

```
HTTP request
    │
    ▼
┌─────────────┐   bind JSON, validate, call service, respondJSON/respondError
│  handler/   │   (Gin layer — no business logic, no direct DB)
└──────┬──────┘
       │
       ▼
┌─────────────┐   business logic, state machines, error mapping (AppError), Redis
│  service/   │   (no gin imports, fully unit-testable)
└──────┬──────┘
       │
       ▼
┌──────────────┐  sqlc wrappers + DB transactions — no business rules
│ repository/  │
└──────┬───────┘
       │
       ▼
┌─────────────┐   sqlc-generated — DO NOT EDIT BY HAND
│   db/ (sqlc)│   models.go · querier.go · *.sql.go
└─────────────┘
```

| Layer | Allowed imports | Forbidden |
|---|---|---|
| `handler/` | `service/`, `middleware/`, gin | `repository/`, `db/` directly |
| `service/` | `repository/`, `pkg/`, stdlib | gin, `db/` directly |
| `repository/` | `db/`, stdlib | `service/`, `handler/` |
| `pkg/` | stdlib only | anything in `internal/` |

---

## 3 — Middleware Chain (every request)

```
gin.Logger → gin.Recovery → CORS → [AuthRequired] → [AtLeast(role)] → Handler
```

- `middleware/auth.go` — `AuthRequired`: extract Bearer token → `jwt.ParseToken` → pin HMAC algorithm → check Redis logout blacklist (`logout:{jti}`) → call `IsStaffActive` (Redis cache, fail-open) → inject claims into `gin.Context`.
- `middleware/rbac.go` — `AtLeast("role")`: compare JWT `role` claim against required level. Role hierarchy: `guest(0) < chef(2) < cashier/staff(3) < manager(4) < admin(5)`.
- WebSocket: JWT passed via `?token=` query param (browser WS API cannot set custom headers); auth is handled inside the WS handler before upgrade.

---

## 4 — Auth & JWT Setup

| Token | TTL | Storage | Notes |
|---|---|---|---|
| Staff access token | 24 h (env `JWT_ACCESS_TTL`) | Zustand memory (never localStorage) | `Authorization: Bearer` header |
| Staff refresh token | 30 d (env `JWT_REFRESH_TTL`) | httpOnly cookie, SameSite=Strict | Raw token in cookie; SHA-256 hash stored in DB |
| Guest JWT (QR customer) | 2 h | Zustand memory | Stateless — not in DB, no refresh. `sub='guest'`, carries `table_id` |

JWT payload (staff): `{ sub: <staff_uuid>, role: "cashier", jti: <uuid>, exp: ... }`

Guest rules: no refresh, scope limited to `POST /orders` + `GET /orders/:id` own table only. Re-scan QR when expired.

Max sessions per staff: 5. On login, oldest session deleted (LRU by `last_used_at`).

---

## 5 — Env Config (key vars)

| Var | Required | Default | Purpose |
|---|---|---|---|
| `DB_DSN` | yes | — | MySQL DSN |
| `REDIS_ADDR` | no | `redis:6379` | Redis address (main wiring) |
| `JWT_SECRET` | yes | — | HMAC signing secret |
| `JWT_ACCESS_TTL` | no | `86400` (s) | Access token lifetime |
| `STORAGE_BASE_URL` | no | — | Prefix for `image_path` in product responses |
| `STORAGE_BASE_PATH` | no | `/uploads` | Disk root for uploaded files |
| `WEBHOOK_BASE_URL` | yes (online pay) | — | Public URL for payment gateway callbacks |
| `CORS_ORIGINS` | no | `http://localhost:3000` | Allowed origin |

Payment gateway vars (all required only when that gateway is enabled): `VNPAY_TMN_CODE` / `VNPAY_HASH_SECRET` / `VNPAY_BASE_URL` (`internal/payment/vnpay.go`) · `MOMO_PARTNER_CODE` / `MOMO_ACCESS_KEY` / `MOMO_SECRET_KEY` / `MOMO_ENDPOINT` (`internal/payment/momo.go`) · `ZALOPAY_APP_ID` / `ZALOPAY_ENDPOINT` (`internal/payment/zalopay.go` — ⚠️ no `ZALOPAY_KEY1/KEY2` HMAC secret env; confirm the ZaloPay HMAC path before relying on it in prod). Test vars: `TEST_DB_DSN`, `TEST_REDIS_ADDR` (`internal/testhelper/testhelper.go`).

---

## 6 — Request Flow: Worked Example (`POST /api/v1/orders`)

```
1. Gin router matches POST /api/v1/orders
2. middleware/auth.go: AuthRequired
   a. Extract Bearer token from header
   b. jwt.ParseToken → verify HMAC, decode claims
   c. Check Redis: GET logout:{jti} — if hit → 401
   d. IsStaffActive(claims.sub) → Redis GET auth:staff:{id} (5 min TTL, fail-open)
   e. Inject claims into gin.Context
3. handler/order_handler.go: Create
   a. c.ShouldBindJSON(&req) — validate items ≥ 1, source in enum
   b. Call service.CreateOrder(ctx, req)
4. service/order_service.go: CreateOrder
   a. Check table: repo.GetActiveOrderByTable → 409 TABLE_HAS_ACTIVE_ORDER if active
   b. For each item: productSvc.GetProductSnapshot (Redis → DB)
   c. generateOrderNumber: Redis INCR order:seq:{YYYYMMDD} (DB fallback)
   d. repo.CreateOrderWithItems inside DB transaction
   e. repo.RecalculateTotalAmount inside same transaction
   f. Publish SSE event: rdb.Publish("order:{id}", payload)
5. handler: respondJSON(c, 201, gin.H{"data": gin.H{"id": order.ID}})
```

---

## 7 — Key Patterns

### respondError (always use — never raw `gin.H`)

```go
respondError(c, http.StatusNotFound, "NOT_FOUND", "Không tìm thấy tài nguyên")
respondError(c, http.StatusConflict, "TABLE_HAS_ACTIVE_ORDER",
    "Bàn đã có đơn đang xử lý",
    gin.H{"table_id": tableID, "active_order_id": orderID})
```

### AppError unwrapping (handler ← service boundary)

```go
if err != nil {
    var appErr *service.AppError
    if errors.As(err, &appErr) {
        respondError(c, appErr.Status, appErr.Code, appErr.Message)
    } else {
        respondError(c, 500, "INTERNAL_ERROR", "Lỗi máy chủ nội bộ")
    }
    return
}
```

### DTO mapping rule

- DB field names are authoritative: `price` (not `base_price`), `image_path` (not `image_url`), `created_by` (not `staff_id`), `gateway_data` (not `webhook_payload`), payment status `completed` (not `success`).
- Assemble public URL in the handler: `STORAGE_BASE_URL + "/" + image_path`.

### Transaction usage

DB transactions are used for multi-step order mutations. Pattern: `repo.BeginTx → work → RecalculateTotalAmount → Commit`. Any error → `Rollback`. Only `repository/` opens transactions; `service/` passes `ctx` with tx embedded.

### recalculateTotalAmount (mandatory after every order_items mutation)

```go
err = repo.RecalculateTotalAmount(ctx, tx, orderID)
```

Must be called inside the same transaction after any INSERT/UPDATE/DELETE on `order_items`. The `total_amount` column is denormalized — skipping this causes payment to charge the wrong amount.

---

## Deep Dive Sources

| Topic | File |
|---|---|
| Full folder tree + route table | `BE_CODE_SUMMARY.md §1 + §3` (same folder) |
| All env vars | §5 above |
| Layer rules + patterns | §2 + §7 above |
| JWT + Guest token rules | `../02_spec/BUSINESS_RULES.md` |
| RBAC rules | `../02_spec/BUSINESS_RULES.md` |
| Error format + respondError | `../02_spec/ERROR_SPEC.md` |
