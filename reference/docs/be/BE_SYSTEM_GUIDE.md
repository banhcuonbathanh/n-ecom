# BE System Guide — Hệ Thống Quản Lý Quán Bánh Cuốn

> **Version:** v1.1 · 2026-05-10
> **Purpose:** Single self-contained manual for all Backend work. Every BE session starts here.
> **Rule:** This file + the spec listed per epic = everything you need. Do NOT read all docs at once.

---

## 0 — Project Snapshot

**System:** QR ordering + Kitchen Display (KDS) + POS + payment webhooks for a Vietnamese food stall.

**Stack:** Go 1.25 · Gin · sqlc · MySQL 8.0 · Redis Stack 7 · Goose migrations · Docker Compose

**Architecture (strict, no exceptions):**
```
HTTP → handler → service → repository → db (sqlc-generated)
                              ↕
                           pkg/ (jwt · bcrypt · redis)
```

| Layer | Owns | Must NOT contain |
|---|---|---|
| `handler/` | gin.Context · bind JSON · call service · return response | Business logic · DB queries |
| `service/` | Business logic · state machine · error mapping | gin imports · direct DB calls |
| `repository/` | sqlc wrappers · transaction helpers | Business rules · HTTP concepts |
| `db/` | sqlc-generated — DO NOT edit manually | — |
| `middleware/` | Auth · RBAC · rate limit | Business logic |
| `pkg/` | Reusable utilities (jwt · bcrypt · redis) | Imports from internal/ |

**Ports:** BE=8080 · MySQL=3306 · Redis=6379

---

## 1 — Big Tasks (Epics) — The 8-Step Build Plan

> Work in order. Each epic unlocks the next. Do not skip.

| Epic | Name | Status | Blocks |
|---|---|---|---|
| **BE-1** | Foundation & Infrastructure | ✅ COMPLETE | — |
| **BE-2** | Authentication System | ✅ COMPLETE | — |
| **BE-3** | Product Catalog API | ✅ COMPLETE | — |
| **BE-4** | Order Management + SSE | ✅ COMPLETE | — |
| **BE-5** | Real-time WebSocket Hub | ✅ COMPLETE | — |
| **BE-6** | Payment Processing | ✅ COMPLETE | — |
| **BE-7** | Supporting APIs (QR · Files) | ✅ COMPLETE | — |
| **BE-8** | Testing & Hardening | ⬜ NOT STARTED | Go-Live |

---

## 2 — Current Scaffold State

### ✅ Done — do not recreate

All backend files are implemented. Key files:

| File | What exists |
|---|---|
| `be/cmd/server/main.go` | DI wiring + all routes + graceful shutdown |
| `be/internal/db/` | sqlc-generated (models.go · querier.go · *.sql.go) |
| `be/internal/handler/` | auth · product · order · payment · file · table · group handlers |
| `be/internal/service/` | auth · product · order · payment · file · table · group · analytics · ingredient services |
| `be/internal/repository/` | auth · product · order · payment · file · table · staff · analytics · ingredient repos |
| `be/internal/middleware/` | auth.go · rbac.go |
| `be/internal/sse/` | handler.go · group_handler.go |
| `be/internal/websocket/` | hub.go · client.go · handler.go |
| `be/internal/payment/` | vnpay.go · momo.go · zalopay.go |
| `be/internal/jobs/` | payment_timeout.go · file_cleanup.go |
| `be/pkg/` | jwt · bcrypt · redis (pubsub · bloom · client) |
| `be/migrations/001–009` | All DB migrations including ingredients (009) |

---

## 3 — RBAC: Role Values

| Role | Value | Permissions |
|---|---|---|
| customer | 1 | POST /orders (own table) · GET /orders/:id (own) |
| chef | 2 | Chef+ endpoints · PATCH item qty_served |
| cashier / staff | 3 | Cashier+ endpoints · POST /payments · GET /orders/live |
| manager | 4 | Manager+ endpoints · CRUD products · create staff |
| admin | 5 | All endpoints · delete products/staff |

**Hierarchy:** customer < chef < cashier < staff < manager < admin

---

## 4 — Business Rules (Single Source)

### 4.1 — Order State Machine

```
Happy path:  pending → confirmed → preparing → ready → delivered
Cancel path: pending / confirmed / preparing → cancelled  (if < 30% served)
```

| Transition | From | To | Condition | Who |
|---|---|---|---|---|
| Create | — | pending | No active order on same table | customer · cashier |
| Confirm | pending | confirmed | Auto or manual | cashier · manager |
| Start cooking | confirmed | preparing | Chef accepts | chef · staff |
| Complete | preparing | ready | All items done | chef · staff |
| Deliver | ready | delivered | Cashier confirms | cashier |
| Cancel | pending/confirmed/preparing | cancelled | SUM(qty_served)/SUM(quantity) < 0.30 | customer (own) · manager |

### 4.2 — Cancel Rule

```
cancel_allowed = SUM(qty_served) / SUM(quantity) < 0.30
```

- Rejected if ≥ 30% already served → `422 CANCEL_THRESHOLD` (business rule violation, not resource conflict)
- Successful cancel → trigger payment refund if already paid

> ⚠️ **Lesson:** Use `422 UnprocessableEntity` not `409 Conflict` for cancel threshold. Semantic: 409 = resource state conflict, 422 = business rule violation. Cancel threshold is a business rule.

### 4.3 — item_status (DERIVED — no DB column, no migration 008)

**Decision: Approach B.** Status is computed from `qty_served` everywhere. Never a stored column.

```go
// Go (service layer)
func itemStatus(qtyServed, quantity int32) string {
    switch {
    case qtyServed == 0:          return "pending"
    case qtyServed < quantity:    return "preparing"
    default:                      return "done"
    }
}
```

```sql
-- SQL filter (use qty_served math, NOT a status column)
-- pending:   WHERE qty_served = 0
-- preparing: WHERE qty_served > 0 AND qty_served < quantity
-- done:      WHERE qty_served = quantity
```

### 4.4 — Payment Rules

| Rule | Detail |
|---|---|
| Payment creation | Only when `order.status = 'ready'` |
| Methods | vnpay · momo · zalopay · cash |
| Webhook order | HMAC verify → ALWAYS first, before any DB read |
| Idempotency | Check `payment.status` before any write — gateways call multiple times |
| Cash | Cashier confirms manually — no webhook |

### 4.5 — One Active Order Rule

**Rule:** 1 table → max 1 order with status IN (pending, confirmed, preparing, ready).
Check before INSERT into orders → `409 TABLE_HAS_ACTIVE_ORDER` if violated.

---

## 5 — Auth & JWT Config

### Token Config

| Token | TTL | Storage | Notes |
|---|---|---|---|
| Access Token (Staff) | 24 hours | Zustand memory (never localStorage) | Sent in `Authorization: Bearer` |
| Refresh Token (Staff) | 30 days | httpOnly cookie | Browser auto-sends |
| Guest JWT (QR Customer) | 2 hours | Zustand memory (never localStorage) | Stateless — not saved in DB |
| Redis blacklist | = remaining access TTL | `logout:{jti}` key | Logout → add jti |

### JWT Payload (Staff)

```json
{
  "sub":  "<staff_uuid>",
  "role": "cashier",
  "jti":  "<uuid>",
  "exp":  1234567890
}
```

### Guest JWT Payload

```json
{
  "sub":      "guest",
  "role":     "customer",
  "table_id": "<table_uuid>",
  "jti":      "<uuid>",
  "exp":      now + 7200
}
```

**Guest rules:** No refresh · No DB storage · Rate limit: 5 req/min · Scope: POST /orders + GET /orders/:id (own only)

### Login Flow (key steps)

1. Check `login_fail:{ip}` in Redis → if ≥ 5 → `429 RATE_LIMIT_EXCEEDED`
2. `GetStaffByUsername` → if not found → run fake bcrypt to waste ~80ms (timing attack prevention)
3. `bcrypt.Verify` → if fail → `IncrLoginFail` → `401 INVALID_CREDENTIALS`
4. Generate TokenPair (JWT + 32-byte hex refresh)
5. DB Transaction: count sessions ≥ 5 → delete oldest (LRU) → INSERT SHA256(refresh) token
6. `SetRefreshCookie(raw)` → HttpOnly · Secure · SameSite=Strict
7. `ResetLoginFail` → clear counter
8. Return `access_token` + user object

### Auth Middleware Pipeline (every protected request)

```
extractBearer → ParseClaims → check Redis blacklist → inject to context → RBAC check
```

**CRITICAL:** Wrong password AND wrong username → same error (`INVALID_CREDENTIALS`). No enumeration.

---

## 6 — API Contract Summary

**Base URL:** `http://localhost:8080/api/v1` (dev) · Caddy proxies in prod

**Response format (success):**
```json
{ "data": { ... }, "message": "optional" }
```

**Response format (error):**
```json
{ "error": "SCREAMING_SNAKE_CODE", "message": "Tiếng Việt", "details": {} }
```

**All IDs:** UUID string (CHAR 36) — never integer.

### Endpoint Map

| Method | Endpoint | Role |
|---|---|---|
| POST | /auth/login | Public |
| POST | /auth/refresh | Public |
| POST | /auth/logout | Any auth |
| GET | /auth/me | Any auth |
| POST | /auth/guest | Public (rate-limited) |
| GET | /products | Public |
| GET | /products/:id | Public |
| POST | /products | Manager+ |
| PUT | /products/:id | Manager+ |
| DELETE | /products/:id | Admin |
| GET | /categories | Public |
| GET | /toppings | Public |
| GET | /combos | Public |
| POST | /orders | Customer+ |
| GET | /orders/live | Staff+ |
| GET | /orders/:id | Owner / Staff+ |
| PATCH | /orders/:id/status | Chef+ |
| PATCH | /orders/items/:id | Chef+ |
| DELETE | /orders/:id | Owner / Manager+ |
| GET | /orders/:id/events | Owner / Staff+ (SSE) |
| POST | /orders/group | Staff+ |
| GET | /orders/group/:id | Staff+ |
| POST | /payments | Cashier+ |
| POST | /payments/webhook/vnpay | Public (HMAC signed) |
| POST | /payments/webhook/momo | Public (HMAC signed) |
| POST | /payments/webhook/zalopay | Public (HMAC signed) |
| GET | /tables | Staff+ |
| POST | /tables | Manager+ |
| PATCH | /tables/:id | Manager+ |
| GET | /tables/qr/:token | Public (rate-limited) |
| POST | /files/upload | Staff+ |
| DELETE | /files/:id | Staff+ |
| GET | /ws/kds | Chef+ (WS, ?token=) |
| GET | /ws/orders-live | Staff+ (WS, ?token=) |

---

## 7 — Error Code Registry

| HTTP | Code | When |
|---|---|---|
| 400 | INVALID_INPUT | Missing field · wrong type · bad format |
| 401 | MISSING_TOKEN | No Authorization header |
| 401 | TOKEN_EXPIRED | JWT exp passed |
| 401 | TOKEN_INVALID | Bad signature or format |
| 401 | ACCOUNT_DISABLED | is_active=false in DB |
| 401 | INVALID_CREDENTIALS | Wrong username or password |
| 401 | REFRESH_TOKEN_INVALID | Refresh expired or revoked |
| 403 | FORBIDDEN | Valid token, insufficient role |
| 404 | NOT_FOUND | Resource not in DB |
| 409 | TABLE_HAS_ACTIVE_ORDER | 1 table → 1 active order rule violated |
| 409 | ORDER_NOT_READY | Payment created when order ≠ ready |
| 409 | CANCEL_THRESHOLD | Cancel when ≥ 30% already served |
| 409 | PRODUCT_IN_USE | Delete product in active order |
| 409 | PAYMENT_ALREADY_EXISTS | Duplicate payment creation |
| 422 | UNSUPPORTED_FILE_TYPE | MIME not in allowlist |
| 422 | FILE_TOO_LARGE | File > 10MB |
| 429 | RATE_LIMIT_EXCEEDED | > 60 req/min/IP (login: 5 fails) |
| 500 | INTERNAL_ERROR | Unexpected server error — never expose details |

---

## 8 — Code Patterns (copy-paste ready)

### 8.1 — respondError (always use this, never gin.H{} directly)

```go
// be/internal/handler/respond.go
respondError(c, http.StatusNotFound, "NOT_FOUND", "Không tìm thấy tài nguyên")

respondError(c, http.StatusConflict, "TABLE_HAS_ACTIVE_ORDER",
    "Bàn đã có đơn đang xử lý",
    gin.H{"table_id": tableID, "active_order_id": orderID})
```

### 8.2 — AppError unwrapping (handler → service boundary)

```go
result, err := svc.DoSomething(ctx, input)
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

### 8.3 — Context timeout (always pass ctx)

```go
ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
defer cancel()
result, err := repo.GetSomething(ctx, id)
```

### 8.4 — Soft delete filter (all list queries)

```sql
WHERE deleted_at IS NULL     -- or
WHERE is_active = 1
```

### 8.5 — SSE headers (order tracking)

```go
c.Header("Content-Type", "text/event-stream")
c.Header("Cache-Control", "no-cache")
c.Header("X-Accel-Buffering", "no")
// Heartbeat every 15s:
fmt.Fprintf(c.Writer, ": keep-alive\n\n")
c.Writer.Flush()
```

### 8.6 — WebSocket auth (query param, NOT header)

```go
// WS: browser WS API cannot set custom headers
token := c.Query("token")  // ?token=<access_token>
// Verify JWT then upgrade
```

### 8.7 — DB field names (critical — wrong names break sqlc)

| Wrong | Correct |
|---|---|
| `base_price` | `price` |
| `image_url` | `image_path` (relative, assemble URL in response) |
| `webhook_payload` | `gateway_data` |
| `staff_id` | `created_by` |
| payment `success` | payment `completed` |
| `id: int` | `id: string` (CHAR 36 UUID) |

### 8.8 — recalculateTotalAmount (call after EVERY order_items mutation)

```go
// Must be called inside the same transaction after any INSERT/UPDATE on order_items
err = repo.RecalculateTotalAmount(ctx, tx, orderID)
```

### 8.9 — sqlc generate after every migration ADD/DROP COLUMN

```bash
# After any migration that adds or removes columns:
cd be && sqlc generate
```

Without this, `db.Model` structs miss the new field, `SELECT *` scans fail, compile errors appear. Run it immediately — before writing any code that references the new column.

### 8.10 — binding:"min=0" not "required,min=0" for numeric fields

```go
// ❌ WRONG — rejects price=0 with 400 INVALID_INPUT
type createToppingRequest struct {
    Price int64 `binding:"required,min=0"`
}

// ✅ CORRECT — allows price=0 (valid free topping)
type createToppingRequest struct {
    Price int64 `binding:"min=0"`
}
```

`required` on a numeric type in go-playground/validator means non-zero. Use it only for strings (non-empty) or pointers (non-nil).

### 8.11 — Middleware must receive dependencies explicitly

```go
// ❌ WRONG — is_active check silently skipped because Redis not injected
func AuthRequired() gin.HandlerFunc { ... }

// ✅ CORRECT — dependency injected, compile-time interface check
type IsActiveChecker interface {
    IsStaffActive(ctx context.Context, staffID string) (bool, error)
}
func AuthRequired(checker IsActiveChecker) gin.HandlerFunc { ... }
```

Middleware that needs Redis or a service must receive it as a parameter — never rely on package-level globals.

### 8.12 — Guest JWT: never store "guest" in a FK column

```go
// ❌ WRONG — "guest" is not a valid staff.id → FK constraint fails → 500
createdBy := claims.Subject  // = "guest" for customers

// ✅ CORRECT — store NULL for guest orders
var callerID string
if claims.Role != "customer" {
    callerID = claims.Subject
}
// pass callerID → service sets created_by = NULL when empty
```

Ownership check for guest orders uses `order.table_id` (from JWT `claims.TableID`), not `created_by`.

### 8.13 — Payment service must call gateway to get URL

```go
// Pattern: validate → DB record → call gateway → return URL
// Step 1: Validate order.status == "ready"
// Step 2: Create DB payment record (status = "pending")
// Step 3: Call gateway API → get QR URL / redirect URL
// Step 4: Return URL to caller
// If gateway fails: log error + return partial result — do NOT rollback payment record
```

A payment record with no gateway call means FE receives an empty QR URL. The DB record and the gateway call are both required.

### 8.14 — Webhook verification order (non-negotiable)

```go
// Step order is mandatory — never reorder:
// 1. HMAC verify signature
// 2. Amount verify: if gatewayAmount != dbPayment.Amount → reject AMOUNT_MISMATCH
// 3. Idempotency check: if payment.Status == "completed" → return 200 no-op
// 4. Update DB payment status
```

Amount verification after HMAC catches financial fraud where attacker sends valid HMAC with `amount=1`.

### 8.15 — WS payload: grep BE before writing FE handler

```bash
# Check what BE actually marshals — spec may be out of sync
grep -n "json.Marshal\|PublishEvent\|broadcast" be/internal/service/payment_service.go
```

Spec may declare `payment_id` but BE may only publish `order_id`. Match on what the code marshals, not what the spec says.

---

## 9 — DI Wiring Pattern (main.go skeleton)

> Use this exact structure when building main.go. Add domain blocks as each epic completes.

```go
func main() {
    // 1. Config
    jwtSecret  := os.Getenv("JWT_SECRET")
    dbDSN      := os.Getenv("DB_DSN")
    redisAddr  := os.Getenv("REDIS_ADDR")
    storageURL := os.Getenv("STORAGE_BASE_URL")

    // 2. DB
    sqlDB, _ := sql.Open("mysql", dbDSN)
    queries  := db.New(sqlDB)

    // 3. Redis
    rdb := redis.NewClient(&redis.Options{Addr: redisAddr})

    // 4. Repos
    authRepo    := repository.NewAuthRepo(queries)
    productRepo := repository.NewProductRepo(queries)
    orderRepo   := repository.NewOrderRepo(queries)
    paymentRepo := repository.NewPaymentRepo(queries)
    fileRepo    := repository.NewFileRepo(queries)
    tableRepo   := repository.NewTableRepo(queries)

    // 5. Services (inject interfaces, not concrete types)
    authSvc    := service.NewAuthService(authRepo, rdb, jwtSecret)
    productSvc := service.NewProductService(productRepo, rdb, storageURL)
    orderSvc   := service.NewOrderService(orderRepo, rdb, productSvc)   // ProductLookup
    paymentSvc := service.NewPaymentService(paymentRepo, orderSvc, orderSvc)
    fileSvc    := service.NewFileService(fileRepo, storageURL)
    tableSvc   := service.NewTableService(tableRepo, rdb, jwtSecret)
    groupSvc   := service.NewGroupService(orderRepo, rdb)

    // 6. Middleware + Hub
    hub    := websocket.NewHub()
    go hub.Run()
    authMW := middleware.NewAuthMiddleware(rdb, jwtSecret)

    // 7. Handlers
    authH    := handler.NewAuthHandler(authSvc)
    productH := handler.NewProductHandler(productSvc)
    orderH   := handler.NewOrderHandler(orderSvc)
    paymentH := handler.NewPaymentHandler(paymentSvc)
    fileH    := handler.NewFileHandler(fileSvc)
    tableH   := handler.NewTableHandler(tableSvc)
    groupH   := handler.NewGroupHandler(groupSvc)

    // 8. Routes
    // Middleware order: Logger → Recovery → CORS → RateLimit → Auth → RBAC → Handler
    r := gin.New()
    r.Use(gin.Logger(), gin.Recovery(), middleware.CORS())
    r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

    v1 := r.Group("/api/v1")

    // Auth
    authR := v1.Group("/auth")
    authR.POST("/login", authH.Login)
    authR.POST("/refresh", authH.Refresh)
    authR.POST("/guest", authH.Guest)
    authR.Use(authMW.RequireAuth())
    authR.POST("/logout", authH.Logout)
    authR.GET("/me", authH.Me)

    // Products
    prodR := v1.Group("/products")
    prodR.GET("", productH.List)
    prodR.GET("/:id", productH.Get)
    prodR.Use(authMW.RequireAuth())
    prodR.POST("", middleware.RequireRole(4), productH.Create)
    prodR.PUT("/:id", middleware.RequireRole(4), productH.Update)
    prodR.DELETE("/:id", middleware.RequireRole(5), productH.Delete)
    v1.GET("/categories", productH.ListCategories)
    v1.GET("/toppings", productH.ListToppings)
    v1.GET("/combos", productH.ListCombos)

    // Orders
    orderR := v1.Group("/orders").Use(authMW.RequireAuth())
    orderR.POST("", orderH.Create)
    orderR.GET("/live", middleware.RequireRole(3), orderH.ListLive)
    orderR.GET("/:id", orderH.Get)
    orderR.PATCH("/:id/status", middleware.RequireRole(2), orderH.UpdateStatus)
    orderR.DELETE("/:id", orderH.Cancel)
    orderR.GET("/:id/events", orderH.SSEStream)
    orderR.POST("/group", middleware.RequireRole(3), groupH.CreateGroup)
    orderR.GET("/group/:id", groupH.GetGroup)
    v1.PATCH("/orders/items/:id", authMW.RequireAuth(), middleware.RequireRole(2), orderH.UpdateItemServed)

    // Payments
    payR := v1.Group("/payments").Use(authMW.RequireAuth(), middleware.RequireRole(3))
    payR.POST("", paymentH.Create)
    v1.POST("/payments/webhook/vnpay", paymentH.VNPayWebhook)
    v1.POST("/payments/webhook/momo", paymentH.MoMoWebhook)
    v1.POST("/payments/webhook/zalopay", paymentH.ZaloPayWebhook)

    // Tables
    tableR := v1.Group("/tables")
    tableR.GET("/qr/:token", tableH.DecodeQR)
    tableR.Use(authMW.RequireAuth())
    tableR.GET("", middleware.RequireRole(3), tableH.List)
    tableR.POST("", middleware.RequireRole(4), tableH.Create)
    tableR.PATCH("/:id", middleware.RequireRole(4), tableH.Update)

    // Files
    fileR := v1.Group("/files").Use(authMW.RequireAuth(), middleware.RequireRole(3))
    fileR.POST("/upload", fileH.Upload)
    fileR.DELETE("/:id", fileH.Delete)

    // WebSocket
    wsR := v1.Group("/ws")
    wsR.GET("/kds", middleware.WSAuth(jwtSecret, 2), websocket.KDSHandler(hub))
    wsR.GET("/orders-live", middleware.WSAuth(jwtSecret, 3), websocket.LiveHandler(hub))

    r.Run(":" + os.Getenv("PORT"))
}
```

---

## 10 — Epic-by-Epic Implementation Guide

### BE-1 — Foundation & Infrastructure

**Goal:** All infrastructure plumbing works before writing any domain code.

**Tasks:**
- Run migration `008_order_groups.sql` → adds `group_id CHAR(36) NULL` + index to `orders`
  - File: `docs/task/task1_database/Ver 2/008_order_groups.sql.md`
- Create `.env.example` with all vars: `DB_DSN · REDIS_ADDR · JWT_SECRET · JWT_ACCESS_TTL · JWT_REFRESH_TTL · STORAGE_BASE_URL · VNPAY_* · MOMO_* · ZALOPAY_* · PORT · CORS_ORIGINS`
- Create `scripts/migrate.sh` — wait for MySQL (ping loop) → `goose up` → exec server
- Update `docker-compose.yml` — MySQL health check · Redis health check · Caddy service

**Verify:** `docker compose up -d && curl localhost:8080/health` → `{"status":"ok"}`

---

### BE-2 — Authentication System ← NEXT BLOCKER

**Goal:** Complete auth so FE can start. All 5 routes working.

**Read first (in order):**
1. `docs/contract/API_CONTRACT_v1.2.md` §2 — request/response shapes
2. `docs/spec/Spec1_Auth_Updated_v2.md` — business logic + sqlc queries
3. `docs/core/MASTER_v1.2.md` §6 — JWT config + Guest token rules
4. This file §5 — Auth rules summary

**Create:** `be/internal/handler/auth_handler.go`

**5 handlers to implement:**

```go
// POST /auth/login
func (h *AuthHandler) Login(c *gin.Context) {
    // 1. ShouldBindJSON → validate username (min 3) + password (min 8)
    // 2. svc.Login(ctx, username, password)
    // 3. Set httpOnly cookie: SetRefreshCookie(c, tokenPair.RefreshToken)
    // 4. Return 200: { data: { access_token, user: { id, username, full_name, role, email } } }
}

// POST /auth/refresh
func (h *AuthHandler) Refresh(c *gin.Context) {
    // 1. Read cookie: c.Cookie("refresh_token")
    // 2. svc.Refresh(ctx, rawRefreshToken)
    // 3. Return 200: { data: { access_token } }
}

// POST /auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
    // 1. Read claims from context (injected by auth middleware)
    // 2. Read cookie: c.Cookie("refresh_token")
    // 3. svc.Logout(ctx, jti, rawRefreshToken)
    // 4. ClearRefreshCookie(c)
    // 5. Return 204
}

// GET /auth/me
func (h *AuthHandler) Me(c *gin.Context) {
    // 1. staffID := StaffIDFromContext(c)
    // 2. svc.GetMe(ctx, staffID)
    // 3. Return 200: { data: { id, username, full_name, role, email, phone, is_active } }
}

// POST /auth/guest
func (h *AuthHandler) Guest(c *gin.Context) {
    // 1. ShouldBindJSON → validate qr_token (required, len 64)
    // 2. svc.GuestLogin(ctx, qrToken) → returns { access_token, expires_in, table }
    // 3. Return 200: { data: { access_token, expires_in, table: { id, name, capacity, status } } }
}
```

**Cookie helpers:**
```go
func SetRefreshCookie(c *gin.Context, raw string) {
    c.SetCookie("refresh_token", raw, 30*24*3600, "/api/v1/auth",
        "", true, true) // Secure=true, HttpOnly=true
}
func ClearRefreshCookie(c *gin.Context) {
    c.SetCookie("refresh_token", "", -1, "/api/v1/auth", "", true, true)
}
```

**Critical rules:**
- Wrong password AND wrong username → same error (`INVALID_CREDENTIALS`) — no enumeration
- HMAC algorithm check: verify `t.Method == jwt.SigningMethodHMAC` before parsing
- SHA256-hash refresh token before storing in DB; raw token goes to cookie only
- `is_active` cache: Redis key `staff:active:{id}` TTL 5min → fallback to DB

**Acceptance Criteria:**
- Wrong password → `INVALID_CREDENTIALS` (not "user not found")
- 6th login attempt → `429 RATE_LIMIT_EXCEEDED`
- Two sessions from different devices both work
- Logout from device A does NOT log out device B
- Admin deactivates staff → staff's next request returns `401 ACCOUNT_DISABLED`
- Error format exactly: `{"error":"INVALID_CREDENTIALS","message":"..."}`

---

### BE-3 — Product Catalog API

**Goal:** All product/category/topping/combo endpoints. Redis cache TTL 5min.

**Read first:**
1. `docs/contract/API_CONTRACT_v1.2.md` §3
2. `docs/spec/Spec_2_Products_API_v2_CORRECTED.md`
3. `docs/be/DB_SCHEMA_SUMMARY.md` — field names section

**Create:**
- `be/internal/repository/product_repo.go` — wrap sqlc product/category/topping/combo queries
- `be/internal/service/product_service.go` — CRUD + Redis cache (TTL 5min, invalidate on write)
- `be/internal/handler/product_handler.go` — 20+ endpoints

**Critical rules:**
- `image_path` stored in DB (relative), `image_url` assembled in response: `STORAGE_BASE_URL + "/" + image_path`
- Redis cache keys for products: `product:{id}` + `products:list` — TTL 5min, invalidate on every write
- Soft delete: set `is_active=false` — never hard DELETE; filter `WHERE is_active=1` in all list queries
- `price` field name (not `base_price`) — verify from DB schema
- Public endpoints (GET list, GET by id) require NO auth

---

### BE-4 — Order Management + SSE

**Goal:** Full order lifecycle + SSE stream for real-time order tracking.

**Read first:**
1. `docs/contract/API_CONTRACT_v1.2.md` §4 + §10.2
2. `docs/spec/Spec_4_Orders_API.md`
3. This file §4 — Business rules

**Create:**
- `be/internal/repository/order_repo.go`
- `be/internal/service/order_service.go`
- `be/internal/handler/order_handler.go`
- `be/internal/sse/handler.go`
- `be/internal/service/group_service.go`
- `be/internal/handler/group_handler.go`
- `be/internal/sse/group_handler.go`

**Critical rules:**
- `order_items.status` does NOT exist as DB column — derive from `qty_served`
- `recalculateTotalAmount()` must be called after every `order_items` mutation
- Combo expansion: 1 parent row (combo_id set, product_id NULL) + N sub-item rows (combo_ref_id=parent.id)
- 1 table, 1 active order: check before CreateOrder → `409 TABLE_HAS_ACTIVE_ORDER`
- SSE headers: `text/event-stream` + `X-Accel-Buffering: no` + heartbeat every 15s

**SSE event format:**
```
event: order_status_changed
data: {"type":"order_status_changed","data":{"order_id":"...","status":"preparing"}}

event: item_progress
data: {"type":"item_progress","data":{"order_id":"...","item_id":"...","qty_served":1,"quantity":2,"item_status":"preparing","progress_pct":50}}

: keep-alive
```

---

### BE-5 — Real-time WebSocket Hub

**Goal:** WS hub for KDS (chef screen) and live orders monitor.

**Read first:**
1. `docs/contract/API_CONTRACT_v1.2.md` §10.1
2. `docs/core/MASTER_v1.2.md` §5.1 — reconnect config

**Create:**
- `be/internal/websocket/hub.go` — Hub with `sync.RWMutex`, Run() goroutine
- `be/internal/websocket/client.go` — readPump + writePump
- `be/internal/websocket/handler.go` — HTTP upgrade + JWT verify via `?token=`

**Critical rules:**
- WS auth via `?token=` query param (browser WS cannot set custom headers)
- Hub uses `sync.RWMutex` for client map — no direct map access outside lock
- All goroutines must have `defer recover()` to prevent panics from crashing server
- Ping 30s / pong deadline 10s / read deadline 60s

**WS event types:** `new_order · order_updated · item_progress · order_completed · payment_success`

---

### BE-6 — Payment Processing

**Goal:** 3 payment gateways + cash + webhook verification.

**Read first:**
1. `docs/contract/API_CONTRACT_v1.2.md` §5
2. `docs/spec/Spec_5_Payment_Webhooks.md`
3. This file §4.4 — Payment rules

**Create:**
- `be/internal/payment/vnpay.go` — CreatePaymentURL · VerifyWebhook (HMAC-SHA512)
- `be/internal/payment/momo.go` — CreatePayment · VerifyCallback (HMAC-SHA256)
- `be/internal/payment/zalopay.go` — CreateOrder · VerifyCallback (HMAC-SHA256)
- `be/internal/repository/payment_repo.go`
- `be/internal/service/payment_service.go`
- `be/internal/handler/payment_handler.go`
- `be/internal/jobs/payment_timeout.go` — Redis keyspace notification → mark pending→failed

**Critical rules:**
- Webhook: HMAC verification is ALWAYS first operation — before reading any body fields
- Idempotency: check `payments.status` before any DB write — if already `completed`, return 200 no-op
- VNPay HMAC: remove hash key from params → sort alphabetically → concat → SHA512
- Field name: `gateway_data` (not `webhook_payload`), status `completed` (not `success`)
- Payment rejected if `order.status ≠ 'ready'` → `409 ORDER_NOT_READY`

---

### BE-7 — Supporting APIs (QR / Tables / File Upload)

**Goal:** QR decode, table management, file upload + orphan cleanup.

**Read first:**
1. `docs/contract/API_CONTRACT_v1.2.md` §6 + §7
2. `docs/spec/Spec_6_QR_POS.md` — QR + guest JWT flow
3. `docs/core/MASTER_v1.2.md` §6.4 — Guest token rules

**Create:**
- `be/internal/repository/table_repo.go`
- `be/internal/service/table_service.go`
- `be/internal/handler/table_handler.go`
- `be/internal/repository/file_repo.go`
- `be/internal/service/file_service.go`
- `be/internal/handler/file_handler.go`
- `be/internal/jobs/file_cleanup.go` — ticker every 6h, delete orphan files > 24h

**Critical rules:**
- QR endpoint: rate limit 10 req/min per IP
- Guest auth endpoint: rate limit 5 req/min per IP
- File upload: max 10MB, allowed MIME: `image/jpeg · image/png · image/webp`
- Orphan files: set `is_orphan=true` on DELETE, cleanup job runs every 6h

---

### BE-8 — Testing & Hardening

**Goal:** Unit tests for service layer, integration test for all API endpoints.

**Create:**
- `be/internal/service/auth_service_test.go` — TestLogin_WrongPassword · TestRateLimit · TestMultiSession · TestAccountDisabled · TestTokenRotation
- `be/internal/service/order_service_test.go` — TestComboExpand · TestDuplicateTable · TestCancelUnder30 · TestCancelOver30 · TestAutoReady
- `be/internal/handler/payment_handler_test.go` — TestVNPayWebhook_Valid · TestVNPayWebhook_BadHMAC · TestIdempotentWebhook

**Verify:** `go test ./be/internal/service/... -v`

---

## 11 — Commands Reference

```bash
# Generate sqlc
cd be && sqlc generate

# Run migrations
goose -dir be/migrations mysql "$DB_DSN" up

# Build + test
go build ./...
go test ./be/internal/service/...

# Docker
docker compose up -d
docker compose up -d --build be
docker compose logs -f be
docker compose down -v

# Local BE only
cd be && go run ./cmd/server
```

---

## 12 — What to Read for Each Session

> Open this file → find your epic → read ONLY the docs listed for that epic → implement.

| Starting task | Read this first | Then read |
|---|---|---|
| auth_handler.go | This file §5 + §8 | `Spec1_Auth_Updated_v2.md` |
| product handler | This file §4 + §7 | `Spec_2_Products_API_v2_CORRECTED.md` |
| order handler | This file §4 + §9 | `Spec_4_Orders_API.md` |
| payment handler | This file §4.4 + §7 | `Spec_5_Payment_Webhooks.md` |
| tables / QR | This file §5 + §7 | `Spec_6_QR_POS.md` |
| error response | This file §7 | `ERROR_CONTRACT_v1.1.md` |
| any endpoint | This file §6 | `API_CONTRACT_v1.2.md` §(relevant section) |

---

*BanhCuon System · BE System Guide · v1.1 · 2026-05-10*
