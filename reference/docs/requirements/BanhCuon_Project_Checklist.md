# 🍜 BanhCuon Project — Complete Step & Document Checklist
> **Version:** v1.0 · Tháng 4/2026  
> **Purpose:** Master checklist — follow this file top-to-bottom. Do NOT skip phases.  
> **Rule:** Each phase has dependencies. Never start a phase before its dependencies are ✅.

---

## 📊 Overall Progress

| Phase | Name | Status | Progress |
|---|---|---|---|
| Phase 0 | Architecture & Documentation | ✅ COMPLETE | 100% |
| Phase 1 | Database Migrations (001–008) | ✅ COMPLETE | 100% |
| Phase 2 | Feature Specs (BA) | ✅ COMPLETE | 100% (7/7 done) |
| Phase 3 | sqlc + Project Setup | ✅ COMPLETE | 100% |
| Phase 4 | Backend Implementation | ✅ COMPLETE | 100% |
| Phase 5 | Frontend Implementation | ✅ COMPLETE | 100% (5.1–5.5) |
| Phase 6 | DevOps / Infrastructure | ✅ COMPLETE | 100% |
| Phase 7 | Testing, UAT & Go-Live | ⬜ NOT STARTED | 0% |
| Phase 8 | Admin Dashboard (Manager+) | 🔄 IN PROGRESS | 50% (FE ✅, BE staff endpoints ⬜) |

---

## 🔴 BLOCKERS — Resolve These First (Before Any Code)

> These 2 issues block multiple phases. Resolve with Lead + BA before proceeding.

- [ ] **Issue #5** — Decide `order_items.status` + `flagged` approach:
  - **Approach A:** Add `migration 008` with status ENUM + flagged BOOLEAN columns
  - **Approach B:** Derive status from `qty_served` (0=pending, 0<x<qty=preparing, x=qty=done)
  - Affects: Spec 3 TypeScript types, Spec 4 BE logic, KDS UI, order_items queries
  - **Owner:** Lead decides → BA updates Spec 3 + Spec 4 → DB Dev writes migration if Approach A

- [ ] **Issue #7** — Define and add `POST /api/v1/auth/guest` to API_CONTRACT v1.2:
  - Need to specify: token TTL, stored in `refresh_tokens` table or not, rate limit
  - Affects: `fe/app/table/[tableId]/page.tsx` — completely blocked without this endpoint
  - **Owner:** Lead → add to API_CONTRACT → BE Dev implements → FE Dev unblocked

---

## ✅ Phase 0 — Architecture & Documentation

> **Status:** 90% complete. Most docs exist. 2 items still missing.

### Documents Already Created ✓

- [x] `MASTER.docx` (Execution_plan.docx) v1.1 — Tech stack, design tokens, RBAC, business rules, realtime config, error codes, Redis keys, env vars
- [x] `TEAM_HANDBOOK.docx` v1.1 — Ownership matrix, cross-team rules, branch convention, feature checklist
- [x] `CLAUDE_LEAD.docx` v1.1 — Lead session pointer, decision log, sprint planning
- [x] `CLAUDE_BE.docx` v1.0 — BE Dev role, package structure, working protocol
- [x] `CLAUDE_FE.docx` v1.0 — FE Dev role, folder structure, working protocol
- [x] `CLAUDE_DB.docx` v1.1 — DB Dev role, migration conventions, Redis key schema
- [x] `CLAUDE_SYSTEM.docx` v1.0 — System Dev role, WebSocket hub, payment gateway integration
- [x] `CLAUDE_BA.docx` v1.0 — BA role, spec ownership, cross-team communication
- [x] `CLAUDE_DEVOPS.docx` v1.0 — DevOps role, docker-compose stack, .env.example template
- [x] `LESSONS_LEARNED_v3.docx` — Documentation architecture + Claude workflow guide
- [x] `BanhCuon_DB_SCHEMA_SUMMARY.md` v1.2 — Single-page schema reference for all Phase 1 migrations
- [x] `FRONTEND_TechDoc.docx` — 9 Phase 1 pages spec, design system, component conventions

### Still Missing ⬜

- [ ] **`API_CONTRACT.docx`** — Full endpoint table covering all 6 specs
  - Must include: all auth endpoints, products, orders (CRUD + SSE + WS), payments (webhooks), files, tables/QR
  - Must add: `POST /auth/guest` (Issue #7), `GET /orders/:id/events` SSE, `WS /ws/kitchen`, `WS /ws/orders-live`
  - **Owner:** Lead writes. BE Dev proposes new endpoints. FE Dev cannot work without this.

- [ ] **`DB_SCHEMA.docx`** — Formal overview document (summary.md exists but Lead needs the docx for PR reviews)
  - Content: key design decisions, relationship overview, index strategy, Redis key schema
  - **Owner:** DB Dev drafts → Lead reviews

---

## ✅ Phase 1 — Database Migrations

> **Status:** 100% complete. All 7 migration files created and verified.  
> **Tool:** Goose — `-- +goose Up` / `-- +goose Down` blocks in each file.

### Migration Files ✓

- [x] `migrations/001_auth.sql` — `staff` table (role ENUM, bcrypt hash, is_active), `refresh_tokens` (token_hash SHA256, last_used_at)
- [x] `migrations/002_products.sql` — `categories`, `products` (price DECIMAL, image_path), `toppings`, `product_toppings` junction
- [x] `migrations/003_tables.sql` — `tables` (qr_token CHAR(64), status ENUM, is_active)
- [x] `migrations/004_combos.sql` — `combos` (category_id FK, sort_order), `combo_items` (static template)
- [x] `migrations/005_orders.sql` — `order_sequences` fallback, `orders` (source ENUM, created_by FK), `order_items` (combo_ref_id self-ref, CHECK constraint for 3 item types)
- [x] `migrations/006_payments.sql` — `payments` (method ENUM, status='completed' NOT 'success', attempt_count, gateway_data, soft delete)
- [x] `migrations/007_files.sql` — `file_attachments` (is_orphan flag, entity_type + entity_id polymorphic)

### Still Missing ⬜

- [ ] `sqlc.yaml` — Configure sqlc to generate Go code from migrations
  - Point to: `migrations/` directory, output to `be/internal/db/`
  - **Owner:** DB Dev — **required before Phase 3 can begin**

- [ ] `migrations/008_order_item_status.sql` *(conditional — only if Issue #5 resolves to Approach A)*
  - Add: `status ENUM('pending','preparing','done') DEFAULT 'pending'` to `order_items`
  - Add: `flagged TINYINT(1) DEFAULT 0` to `order_items`
  - **Owner:** DB Dev → Lead review → merge

---

## 🔄 Phase 2 — Feature Specs (BA-Owned)

> **Status:** 5/7 specs written. 2 specs need AC detail. 2 pending decisions blocking code.  
> **Rule:** Each spec must have complete Acceptance Criteria before devs begin coding that feature.

### Specs Written ✓

- [x] `docs/specs/Spec1_Auth_Updated_v2.docx` — Auth & Middleware (Gap 5 token rotation + Gap 6 is_active resolved)
- [x] `docs/specs/Spec_2_Products_API_v2_CORRECTED.docx` — Products CRUD (schema drift fixed, UUID IDs, field names corrected)
- [x] `docs/specs/Spec_3_Menu_Checkout_UI_v2.docx` — Frontend customer flow (localStorage→Zustand fix, SSE endpoint corrected)
- [x] `docs/specs/Spec_4_Orders_API.docx` — Orders, state machine, SSE, WebSocket
- [x] `docs/specs/Spec_5_Payment_Webhooks.docx` — Payment gateways (VNPay/MoMo/ZaloPay), HMAC verify, POS UI

### Specs Still Needed ⬜

- [ ] `docs/specs/Spec_6_QR_POS.docx` — QR Tại Bàn + POS offline
  - Must cover: QR token decode flow (`GET /tables/qr/:token`), guest auth flow, table assignment, offline POS edge cases
  - Must cover: what happens if table already has active order when QR is scanned
  - **Owner:** BA writes → Lead reviews → BE Dev + FE Dev implement

- [ ] `docs/specs/Spec_7_Staff_Management.docx` — Staff Management
  - Must cover: CRUD staff accounts, schedules, training modules, deactivation flow, cache invalidation
  - Must cover: manager cannot deactivate their own account
  - **Owner:** BA writes → Lead reviews

---

## ⬜ Phase 3 — sqlc Queries + Project Setup

> **Dependency:** Phase 1 ✅ complete + Issue #5 resolved  
> **Owner:** DB Dev (sqlc queries) + Lead (project scaffolding)

### DB Dev Tasks

- [ ] Create `sqlc.yaml` in project root
  - Config: `engine: mysql`, `emit_json_tags: true`, `emit_prepared_queries: false`
  - Input: `migrations/*.sql`, Output: `be/internal/db/`

- [ ] Write `query/auth.sql`
  - `GetStaffByUsername` — :one, filter deleted_at IS NULL
  - `GetStaffByID` — :one, used by middleware is_active check
  - `CreateRefreshToken` — :exec, insert with expires_at
  - `GetRefreshToken` — :one, by token_hash
  - `DeleteRefreshToken` — :exec, by token_hash (logout)
  - `DeleteRefreshTokensByStaff` — :exec, by staff_id (admin revoke all sessions)
  - `SetStaffActive` — :exec, update is_active + updated_at
  - `ListActiveSessionsByStaff` — :many, for max-5-sessions enforcement

- [ ] Write `query/products.sql`
  - `ListCategories` — :many, WHERE is_active=1 AND deleted_at IS NULL, ORDER BY sort_order
  - `ListProductsWithToppings` — :many, LEFT JOIN toppings, filter by category_id (optional) + is_available
  - `GetProductByID` — :one, with toppings JOIN
  - `CreateProduct` — :one, returns id
  - `UpdateProduct` — :exec
  - `SoftDeleteProduct` — :exec, set deleted_at=NOW()
  - `ToggleProductAvailability` — :exec, set is_available
  - `GetComboWithItems` — :one, JOIN combo_items + products
  - `ListCombos` — :many, WHERE is_active=1, with items expand
  - `CreateCombo` / `UpdateCombo` / `SoftDeleteCombo` — :exec

- [ ] Write `query/orders.sql`
  - `CreateOrder` — :one, returns id + order_number
  - `CreateOrderItem` — :exec (called N times in transaction)
  - `GetActiveOrderByTable` — :one, WHERE table_id=? AND status IN ('pending','confirmed','preparing','ready') AND deleted_at IS NULL
  - `GetOrderWithItems` — :one, JOIN order_items
  - `UpdateOrderStatus` — :exec, with updated_at
  - `GetOrderItemsByOrderID` — :many
  - `UpdateOrderItemStatus` — :exec, update qty_served + status (if Approach A)
  - `SumQtyServedAndQuantity` — :one, SUM(qty_served), SUM(quantity) for cancel check
  - `RecalculateTotalAmount` — :exec, UPDATE orders SET total_amount = (SELECT SUM...)

- [ ] Write `query/payments.sql`
  - `CreatePayment` — :one, returns id
  - `GetPaymentByOrderID` — :one
  - `GetPaymentByID` — :one
  - `UpdatePaymentStatus` — :exec, set status + gateway_ref + gateway_data + paid_at
  - `UpdatePaymentProofImage` — :exec, set proof_image_url via file_attachments

- [ ] Write `query/files.sql`
  - `CreateFileAttachment` — :one, is_orphan=1 by default
  - `LinkFileToEntity` — :exec, set is_orphan=0 + entity_type + entity_id
  - `DeleteOrphanFiles` — :exec, WHERE is_orphan=1 AND created_at < NOW()-24h

- [ ] Run `sqlc generate` and verify:
  - All generated struct field names match `BanhCuon_DB_SCHEMA_SUMMARY.md` column names
  - No `base_price`, `price_delta`, `image_url`, `staff_id`, `webhook_payload` — these are wrong names
  - Correct names: `price`, `image_path`, `created_by`, `gateway_data`

### Lead / BE Dev Project Setup

- [ ] Initialize Go 1.22 module: `go mod init github.com/yourorg/banhcuon`
  - Install deps: `github.com/gin-gonic/gin`, `github.com/golang-jwt/jwt/v5`, `github.com/redis/go-redis/v9`, `github.com/sqlc-dev/sqlc`, `golang.org/x/crypto`

- [ ] Create Go project structure:
  ```
  be/
  ├── cmd/server/main.go          ← entry point, DI wiring, route registration
  ├── internal/
  │   ├── handler/                ← HTTP handlers (gin.Context only, no business logic)
  │   ├── service/                ← business logic (testable, no gin dependency)
  │   ├── repository/             ← sqlc wrappers
  │   ├── middleware/             ← auth.go, rbac.go, ratelimit.go
  │   ├── model/                  ← request/response DTOs
  │   ├── websocket/              ← hub.go, client.go, handler.go
  │   ├── sse/                    ← handler.go
  │   ├── payment/                ← vnpay.go, momo.go, zalopay.go
  │   └── jobs/                   ← payment_timeout.go, file_cleanup.go
  └── pkg/
      ├── jwt/jwt.go
      ├── bcrypt/bcrypt.go
      └── redis/                  ← client.go, pubsub.go, bloom.go
  ```

- [ ] Initialize Next.js 14 project:
  ```bash
  npx create-next-app@14 fe --typescript --tailwind --app --src-dir --import-alias "@/*"
  cd fe
  npm install zustand @tanstack/react-query axios react-hook-form zod @hookform/resolvers
  npm install -D @types/node
  ```

- [ ] Create FE project structure:
  ```
  fe/src/
  ├── app/
  │   ├── (auth)/login/page.tsx
  │   ├── (shop)/menu/page.tsx
  │   ├── (shop)/checkout/page.tsx
  │   ├── (shop)/order/[id]/page.tsx
  │   ├── table/[tableId]/page.tsx
  │   └── (dashboard)/
  │       ├── kds/page.tsx
  │       ├── pos/page.tsx
  │       └── orders/live/page.tsx
  ├── components/
  │   ├── ui/                     ← Button, Input, Modal, Badge, Skeleton
  │   ├── menu/                   ← ProductCard, ToppingModal, ComboModal, CategoryTabs, CartDrawer
  │   ├── shared/                 ← StatusBadge, EmptyState, ConnectionErrorBanner
  │   └── guards/                 ← AuthGuard.tsx, RoleGuard.tsx
  ├── features/
  │   ├── auth/auth.store.ts + auth.api.ts
  │   └── orders/orders.store.ts + orders.api.ts
  ├── hooks/useOrderSSE.ts
  ├── store/cart.ts
  ├── lib/api-client.ts + utils.ts
  └── types/product.ts + order.ts + cart.ts
  ```

- [ ] Setup GitHub repository:
  - Create branches: `main` (production), `develop` (staging)
  - Add `.gitignore` — include `.env`, `node_modules/`, `dist/`, compiled binaries
  - Add branch protection rules on `main`

---

## ⬜ Phase 4 — Backend Implementation

> **Dependency:** Phase 3 ✅ complete (sqlc generated, project structure ready)  
> **Order:** Auth → Products → Orders → Payments → System/Realtime  
> **Critical rule:** NEVER hardcode env vars. Always `os.Getenv()`. NEVER start without auth middleware working.

### Task 4.1 — Auth Backend (Spec 1) 🔴 FIRST

- [ ] `be/pkg/redis/client.go` — Redis Stack connection, health check, singleton pattern
  ```go
  // Example structure
  func NewRedisClient(url string) (*redis.Client, error)
  func HealthCheck(ctx context.Context, rdb *redis.Client) error
  ```

- [ ] `be/pkg/jwt/jwt.go`
  - `GenerateAccessToken(staffID, role string, secret string, ttl time.Duration) (string, error)`
  - `ParseToken(tokenStr string, secret string) (*Claims, error)`
  - **Critical:** verify `t.Method == jwt.SigningMethodHMAC` BEFORE parsing to prevent algorithm confusion attack
  - Claims struct must include: `StaffID string`, `Role string`, `jti string` (for blacklist)

- [ ] `be/pkg/bcrypt/bcrypt.go`
  - `HashPassword(password string) (string, error)` — cost=12
  - `ComparePassword(hash, password string) bool`

- [ ] `be/internal/repository/auth_repo.go`
  - Wrap all sqlc-generated auth queries
  - `GetStaffByUsername(ctx, username) (*db.Staff, error)`
  - `CreateRefreshToken(ctx, params db.CreateRefreshTokenParams) error`
  - `GetRefreshToken(ctx, tokenHash string) (*db.RefreshToken, error)`
  - `DeleteRefreshToken(ctx, tokenHash string) error`
  - `GetStaffByID(ctx, staffID string) (*db.Staff, error)`
  - `SetStaffActive(ctx, staffID string, active bool) error`

- [ ] `be/internal/service/auth_service.go`
  - `Login(ctx, username, password string) (*LoginResult, error)`
    1. Check Redis `login_fail:{ip}` — if >= 5, return rate limit error
    2. GetStaffByUsername — if not found or !IsActive, return `ErrInvalidCredentials` (NEVER reveal which)
    3. ComparePassword — if fail, INCR `login_fail:{ip}` TTL 15min, return `ErrInvalidCredentials`
    4. GenerateAccessToken (24h)
    5. Generate raw refresh token (32 bytes random hex)
    6. SHA256 hash → store in Redis `auth:refresh:{staffID}:{hash_prefix}` TTL 30d
    7. Also store in DB `refresh_tokens` table (fallback)
    8. Enforce max 5 sessions: delete oldest `last_used_at` if count > 5
  - `Refresh(ctx, staffID, rawToken string) (accessToken string, error)`
  - `Logout(ctx, staffID, rawToken string) error` — delete only this session's Redis key
  - `ValidateIsActive(ctx, staffID string) error` — Redis cache `auth:staff:{id}` TTL 5min

- [ ] `be/internal/middleware/auth.go`
  - Parse `Authorization: Bearer {token}` header
  - Call `ParseToken()` — reject if invalid/expired
  - **Step 4.5:** Check `auth:staff:{staffID}` in Redis → if miss, query DB → set cache
  - If `is_active = false` → 401 `ACCOUNT_DISABLED`
  - Set `c.Set("staff_id", claims.StaffID)` and `c.Set("role", claims.Role)`

- [ ] `be/internal/middleware/rbac.go`
  - Role hierarchy values: `customer=1, chef=2, cashier=2, staff=3, manager=4, admin=5`
  - `RequireRole(minValue int) gin.HandlerFunc` — get role from context, compare value, 403 if insufficient

- [ ] `be/internal/handler/auth_handler.go`
  - `POST /api/v1/auth/login` → call service.Login() → set httpOnly cookie for refresh token → return access token
  - `POST /api/v1/auth/refresh` → read refresh token from cookie → call service.Refresh() → return new access token
  - `POST /api/v1/auth/logout` → read refresh token from cookie → call service.Logout() → clear cookie
  - `GET /api/v1/auth/me` → requires auth middleware → return staff info from context
  - `POST /api/v1/auth/guest` → resolve Issue #7 first → create ephemeral token for QR customer

- [ ] **Acceptance Criteria — Auth:**
  - [ ] Login with wrong password always returns same error message (no username enumeration)
  - [ ] 6th login attempt from same IP within 1 minute → 429 rate limit
  - [ ] Login twice → 2 different refresh tokens → both valid
  - [ ] Logout session 1 → session 2 still works
  - [ ] Admin deactivate staff → DEL Redis cache → next request → 401 ACCOUNT_DISABLED
  - [ ] is_active check does NOT query DB on every request (check Redis hit rate)
  - [ ] All error responses follow `{"error": "AUTH_001", "message": "..."}` format

---

### Task 4.2 — Products Backend (Spec 2) 🟠 HIGH

> **Dependency:** Task 4.1 auth middleware working

- [ ] `be/internal/repository/product_repo.go` — wrap sqlc queries for all product/category/topping/combo operations

- [ ] `be/internal/service/product_service.go`
  - `ListProducts(categoryID *string, available bool) ([]Product, error)`
    1. Build cache key: `products:list:{categoryID_or_all}:{available}`
    2. GET from Redis → if hit, return cached
    3. If miss: call `ListProductsWithToppings` sqlc query
    4. SET Redis cache TTL 5 minutes
    5. Return result
  - `GetProductByID(id string) (*Product, error)`
  - `CreateProduct(params CreateProductParams) (*Product, error)` — invalidate Redis cache after
  - `UpdateProduct(id string, params UpdateProductParams) error` — invalidate Redis cache after
  - `SoftDeleteProduct(id string) error` — set deleted_at, invalidate cache
  - `ToggleAvailability(id string, available bool) error` — invalidate cache
  - Same pattern for categories, toppings, combos

- [ ] `be/internal/handler/product_handler.go`
  - `GET /api/v1/categories` — public, no auth
  - `POST /api/v1/categories` — Manager+ only (RequireRole(4))
  - `PATCH /api/v1/categories/:id` — Manager+
  - `DELETE /api/v1/categories/:id` — Manager+ (soft delete)
  - `GET /api/v1/products` — public, supports `?category_id=&available=`
  - `GET /api/v1/products/:id` — public
  - `POST /api/v1/products` — Manager+
  - `PATCH /api/v1/products/:id` — Manager+
  - `DELETE /api/v1/products/:id` — Manager+
  - `PATCH /api/v1/products/:id/availability` — Manager+
  - `GET /api/v1/toppings` — public
  - `POST /api/v1/toppings` — Manager+
  - `PATCH /api/v1/toppings/:id` — Manager+
  - `DELETE /api/v1/toppings/:id` — Manager+
  - `POST /api/v1/products/:id/toppings` — Manager+ (attach toppings to product)
  - `DELETE /api/v1/products/:id/toppings/:toppingId` — Manager+
  - `GET /api/v1/combos` — public, returns items expanded
  - `GET /api/v1/combos/:id` — public
  - `POST /api/v1/combos` — Manager+
  - `PATCH /api/v1/combos/:id` — Manager+
  - `DELETE /api/v1/combos/:id` — Manager+

- [ ] **Acceptance Criteria — Products:**
  - [ ] `GET /products` returns toppings with `price` field (NOT `price_delta`)
  - [ ] `GET /combos` includes `category_id` and `sort_order` in response
  - [ ] Manager CRUD works, Chef/Cashier/Customer get 403
  - [ ] Soft delete does not remove data — product remains in DB with deleted_at set
  - [ ] `is_available=false` hides product from public GET but not from Manager GET
  - [ ] Redis cache is invalidated on every POST/PATCH/DELETE
  - [ ] All IDs in response are UUID strings (not integers)
  - [ ] `image_path` returns relative path (object_path), NOT full URL

---

### Task 4.3 — Orders Backend (Spec 4) 🟠 HIGH

> **Dependency:** Task 4.2 products working

- [ ] `be/internal/service/order_service.go`
  - `CreateOrder(ctx, params CreateOrderParams) (*Order, error)`
    1. Check Bloom filter `bloom:order_exists` — optional fast path
    2. **Check 1-table-1-active rule:** `GetActiveOrderByTable` → if exists, return 409 `ORDER_001`
    3. Generate order_number: INCR `order_seq:{YYYYMMDD}` in Redis → fallback to `order_sequences` table
    4. Start DB transaction
    5. INSERT into `orders` table
    6. For each item:
       - If `combo_id` set: query `combo_items`, insert 1 parent row + N sub-item rows (with `combo_ref_id`)
       - If `product_id` set: insert single row
    7. `RecalculateTotalAmount(orderID)` inside transaction
    8. Commit transaction
    9. Publish WS event `new_order` to `kds:channel`
    10. Set `table_order:{tableID}` in Redis TTL 24h
  - `CancelOrder(ctx, orderID, requesterRole string) error`
    1. Get order — if not found, return 404
    2. `SumQtyServedAndQuantity` — if ratio >= 0.30, return 422 `ORDER_002`
    3. UPDATE status='cancelled'
    4. Publish SSE event `order_status_changed` to `order:{orderID}:channel`
    5. DEL `table_order:{tableID}` from Redis
    6. Trigger payment refund if payment exists and status='completed'
  - `UpdateItemStatus(ctx, orderID, itemID string) (*ItemStatusResult, error)`
    1. Get current item status
    2. Cycle: pending→preparing→done
    3. If status→done: increment `qty_served`, trigger inventory deduction (Phase 2 feature)
    4. If all items done: auto UPDATE order.status='ready'
    5. Publish SSE event `item_progress` to `order:{orderID}:channel`
    6. Broadcast WS to `/ws/kitchen` and `/ws/orders-live`
    7. **If inventory deduction fails: ROLLBACK entire transaction → return 409 (not 500)**
  - `GetOrder(ctx, orderID, requesterID, requesterRole string) (*Order, error)`
    - If role=customer: verify the order belongs to this customer (guest token match)
  - `UpdateOrderStatus(ctx, orderID, newStatus, requesterRole string) error`
    - Validate state machine transitions (no skipping states)

- [ ] `be/internal/handler/order_handler.go`
  - `POST /api/v1/orders` — Customer/Cashier+, calls service.CreateOrder()
  - `GET /api/v1/orders` — Cashier+, list with filter by status/date
  - `GET /api/v1/orders/:id` — Auth, customer can only see own orders
  - `PATCH /api/v1/orders/:id/status` — Cashier+
  - `DELETE /api/v1/orders/:id` — Customer/Cashier+, calls service.CancelOrder()
  - `PATCH /api/v1/orders/:id/items/:itemId/status` — Chef+, cycle status
  - `PATCH /api/v1/orders/:id/items/:itemId/flag` — Chef+, toggle flagged
  - `GET /api/v1/orders/:id/events` — Auth, SSE stream (subscribe to Redis pub/sub channel)

- [ ] SSE Handler — `be/internal/sse/handler.go`
  ```go
  // Set headers
  c.Header("Content-Type", "text/event-stream")
  c.Header("Cache-Control", "no-cache")
  c.Header("Connection", "keep-alive")
  c.Header("X-Accel-Buffering", "no")  // important for nginx

  // Subscribe to Redis channel: "order:{orderID}:channel"
  // Send initial order state as "order_init" event
  // Stream events until order_completed or client disconnect
  // Send ": keep-alive\n\n" heartbeat every 15s to prevent proxy timeout
  ```

- [ ] **Acceptance Criteria — Orders:**
  - [ ] POST /orders creates order_items including combo expansion (parent + sub-items)
  - [ ] 1 table 1 active order — second order on same table returns 409
  - [ ] State machine blocks invalid transitions (e.g. pending→ready is rejected)
  - [ ] Chef click KDS → item status cycles → SSE event pushed to customer
  - [ ] Cancel order: < 30% served → success; >= 30% served → 409
  - [ ] Customer cannot view another customer's order
  - [ ] WS kitchen client receives `new_order` event immediately when order is created
  - [ ] SSE heartbeat sent every 15 seconds

---

### Task 4.4 — WebSocket Hub (System Dev) 🟡 MED

> **Dependency:** Task 4.3 orders working

- [ ] `be/pkg/redis/pubsub.go`
  - `Publish(ctx, channel, message string) error`
  - `Subscribe(ctx, channels ...string) *redis.PubSub`
  - `Unsubscribe(sub *redis.PubSub, channels ...string) error`

- [ ] `be/pkg/redis/bloom.go`
  - `Add(ctx, key, value string) error`
  - `Exists(ctx, key, value string) (bool, error)`
  - Used for: `bloom:order_exists`, `bloom:product_ids`

- [ ] `be/internal/websocket/hub.go`
  ```go
  type Hub struct {
      clients    map[*Client]bool
      broadcast  chan []byte
      register   chan *Client
      unregister chan *Client
      mu         sync.RWMutex
  }
  // Run() goroutine: handle register/unregister/broadcast
  // Ping every 30s, close connection if no Pong within 10s
  ```

- [ ] `be/internal/websocket/handler.go`
  - Upgrade HTTP → WebSocket
  - Auth: read `?token={jwt}` query param (WebSocket cannot set custom headers in browser)
  - Register client with Hub
  - Set read deadline 60s, write deadline 10s

- [ ] WS endpoints:
  - `WS /api/v1/ws/kds` — Chef+ only, receives: `new_order`, `item_updated`, `order_cancelled`
  - `WS /api/v1/ws/orders-live` — Cashier+, receives: `order_created`, `order_status_changed`, `item_progress`
  - `WS /api/v1/ws/payments` — Cashier+, receives: `payment_success`

---

### Task 4.5 — Payments Backend (Spec 5) 🟡 MED

> **Dependency:** Task 4.3 orders working. **⚠️ Always confirm before running payment code — real money.**

- [ ] `be/internal/payment/vnpay.go`
  - `CreatePaymentURL(orderID, amount string) (qrURL, gatewayRef string, error)`
  - `VerifyWebhook(params map[string]string, hashSecret string) bool`
    1. Remove `vnp_SecureHash` from params
    2. Sort params alphabetically by key
    3. Concatenate: `key=value&key=value`
    4. HMAC-SHA512(hashSecret, queryString)
    5. Compare with `vnp_SecureHash` — return false if mismatch

- [ ] `be/internal/payment/momo.go`
  - `CreatePayment(orderID, amount string) (qrURL, orderId string, error)`
  - `VerifyCallback(payload MoMoWebhook, secretKey string) bool` — HMAC-SHA256

- [ ] `be/internal/payment/zalopay.go`
  - `CreateOrder(orderID, amount string) (qrURL, appTransID string, error)`
  - `VerifyCallback(payload ZaloPayCallback, key1 string) bool` — HMAC-SHA256

- [ ] `be/internal/handler/payment_handler.go`
  - `POST /api/v1/payments`
    1. Get order — verify `order.status == 'ready'` → else 409
    2. Check no existing payment for order → else 409 `PAYMENT_001`
    3. If COD: create payment with status='completed', update order.status='delivered'
    4. If QR: call gateway API, create payment status='pending', return qr_code_url
  - `GET /api/v1/payments/:id` — Cashier+
  - `PATCH /api/v1/payments/:id/proof` — Cashier+, upload proof image
  - `POST /api/v1/webhooks/vnpay` — **PUBLIC, NO JWT AUTH**
    1. **Verify HMAC signature FIRST — reject if invalid (PAYMENT_002)**
    2. Verify amount matches payment.amount in DB
    3. **Idempotency:** if payment.status already 'completed' → return 200 immediately, no processing
    4. UPDATE payment: status='completed', gateway_ref, gateway_data (raw webhook), paid_at=NOW()
    5. UPDATE order.status='delivered'
    6. Broadcast WS event `payment_success` to cashier clients
    7. Return `{"RspCode": "00", "Message": "Confirm Success"}` — VNPay requires this exact format
  - `POST /api/v1/webhooks/momo` — same pattern, different signature method
  - `POST /api/v1/webhooks/zalopay` — same pattern

- [ ] `be/internal/jobs/payment_timeout.go`
  - Listen to Redis keyspace notifications for `payment_timeout:{id}` key expiry
  - On expiry: if payment.status still 'pending' → UPDATE to 'failed'

- [ ] **Acceptance Criteria — Payments:**
  - [ ] POST /payments rejected when order.status ≠ 'ready' → 409
  - [ ] COD payment: status='completed' + order.status='delivered' immediately
  - [ ] QR payment: returns qr_code_url, status='pending'
  - [ ] Webhook with wrong HMAC → rejected, no DB changes
  - [ ] Webhook called twice → second call is no-op (idempotent)
  - [ ] Amount mismatch in webhook → log + reject
  - [ ] Raw webhook body stored in `gateway_data` JSON column
  - [ ] WS broadcasts `payment_success` event after successful webhook

---

### Task 4.6 — Remaining Backend Endpoints 🟡 MED

- [ ] `GET /api/v1/tables/qr/:token`
  - Query `tables` WHERE qr_token=? AND is_active=1 AND deleted_at IS NULL
  - Return: table_id, table_name, capacity
  - Used by: FE `/table/[tableId]` page to validate QR scan

- [ ] `POST /api/v1/files/upload`
  - Accept multipart/form-data
  - Validate: file size <= 10MB (FILE_001), mime type must be image/* or application/pdf (FILE_002)
  - Save to storage, create `file_attachments` record with `is_orphan=1`
  - Return: `{ id, object_path }` — FE stores this and sends `object_path` when creating product/payment proof

- [ ] `be/internal/jobs/file_cleanup.go`
  - Run every 6 hours (use `time.Ticker`)
  - DELETE from `file_attachments` WHERE `is_orphan=1 AND created_at < NOW() - INTERVAL 24 HOUR`
  - Also delete actual files from storage
  - Wrap in goroutine with `defer recover()` — panic must not crash server

---

## ⬜ Phase 5 — Frontend Implementation

> **Dependency:** Phase 4 Task 4.1 auth ✅ working + API_CONTRACT.docx ✅ exists  
> **Critical rules:**
> - NEVER store access token in `localStorage` — Zustand in-memory only
> - NEVER hardcode color HEX — use Tailwind classes matching MASTER §2 tokens
> - Server state → TanStack Query. Client state → Zustand. Forms → React Hook Form + Zod
> - All IDs are `string` (UUID) — never `number`

### Task 5.1 — Auth Flow (Spec 1 FE) 🟠 HIGH

- [ ] `fe/src/lib/api-client.ts`
  ```typescript
  // axios instance with baseURL = process.env.NEXT_PUBLIC_API_URL
  // Request interceptor: attach Authorization: Bearer {accessToken from Zustand store}
  // Response interceptor:
  //   - on 401: call /auth/refresh → update store → retry original request ONCE
  //   - on second 401: clear store → redirect to /login
  // withCredentials: true (for httpOnly refresh token cookie)
  ```

- [ ] `fe/src/features/auth/auth.store.ts`
  ```typescript
  interface AuthStore {
    user: Staff | null
    accessToken: string | null  // IN MEMORY ONLY — never localStorage
    setAuth: (user: Staff, accessToken: string) => void
    clearAuth: () => void
  }
  // On page refresh: accessToken will be null
  // App must call GET /auth/me on mount → refresh token cookie will auto-refresh if needed
  ```

- [ ] `fe/src/features/auth/auth.api.ts`
  - `login(username, password)` → POST /auth/login → returns `{ user, accessToken }`
  - `logout()` → POST /auth/logout → clears cookie server-side
  - `refreshToken()` → POST /auth/refresh → returns new accessToken
  - `getMe()` → GET /auth/me → returns current user info

- [ ] `fe/src/app/(auth)/login/page.tsx`
  - React Hook Form + Zod schema: username (min 3), password (min 6)
  - On submit: call auth.api.login() → setAuth() → redirect by role:
    - chef → /kds
    - cashier → /pos
    - manager/admin → /dashboard
    - customer → /menu
  - Show inline error for wrong credentials

- [ ] `fe/src/components/guards/AuthGuard.tsx`
  - HOC: if no accessToken in store → try getMe() → if fails → redirect /login

- [ ] `fe/src/components/guards/RoleGuard.tsx`
  - HOC: read role from store → if role_value < required → show 403 page

- [ ] **Acceptance Criteria — Auth FE:**
  - [ ] Access token NEVER in localStorage (check DevTools Application tab)
  - [ ] After F5 (page refresh): app calls GET /auth/me → restores session silently
  - [ ] 401 response → automatic token refresh → original request retried
  - [ ] Second 401 → redirect to /login
  - [ ] Wrong role → 403 page shown, not redirect

---

### Task 5.2 — Menu & Cart (Spec 3) 🟠 HIGH

> **Dependency:** Task 5.1 auth + Task 4.2 products API working

- [ ] `fe/src/types/product.ts` — Define TypeScript interfaces:
  ```typescript
  interface Topping { id: string; name: string; price: number; is_available: boolean }
  interface Product { id: string; category_id: string; name: string; price: number;
    image_path: string | null; is_available: boolean; toppings: Topping[] }
  interface ComboItem { product_id: string; product_name: string; quantity: number }
  interface Combo { id: string; category_id: string | null; name: string; price: number;
    image_path: string | null; sort_order: number; is_available: boolean; items: ComboItem[] }
  // NOTE: NO slug field. NO base_price. NO image_url. NO price_delta.
  ```

- [ ] `fe/src/lib/utils.ts`
  - `formatVND(amount: number): string` — uses `Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'})`
  - `formatDateTime(date: string): string` — output: "14:30 · 09/04/2026"
  - `formatPercent(n: number): string` — output: "12,5%"
  - `cn(...classes: string[]): string` — clsx + tailwind-merge

- [ ] `fe/src/store/cart.ts` — Zustand CartStore:
  - State: `items: CartItem[]`, `tableId: string | null`, `paymentMethod: string | null`
  - Actions: `addItem`, `removeItem`, `updateQty`, `clearCart`, `setTableId`, `setPaymentMethod`
  - Computed: `total` (sum of unit_price × quantity), `itemCount` (sum of quantities)
  - `addItem`: if same product+toppings combo exists → increment qty instead of duplicating

- [ ] `fe/src/app/(shop)/menu/page.tsx` + components:
  - `CategoryTabs.tsx` — sticky, horizontal scroll on mobile, active tab has `border-b-2 border-orange-500`
  - `ProductCard.tsx` — image, name, `formatVND(price)` in orange, "+Thêm" button, "Hết" badge if unavailable
  - `ToppingModal.tsx` — checkbox list, each topping shows `+{price}₫`, footer shows total = product.price + sum(selected topping.price)
  - `ComboModal.tsx` — combo image (via `image_path`), list combo_items with quantities, confirm button
  - `CartDrawer.tsx` — slide-in from right, list items with qty stepper, total, "Thanh toán" → /checkout

- [ ] `fe/src/app/table/[tableId]/page.tsx`
  - **Blocked until Issue #7 resolved** (POST /auth/guest endpoint needs to be in API_CONTRACT)
  - When unblocked: call POST /auth/guest → store token in Zustand (NOT localStorage) → cartStore.setTableId() → redirect /menu

---

### Task 5.3 — Checkout & Order Tracking (Spec 3) 🟠 HIGH

> **Dependency:** Task 5.2 cart working + Task 4.3 orders API working

- [ ] `fe/src/app/(shop)/checkout/schema.ts`
  ```typescript
  const checkoutSchema = z.object({
    customer_name: z.string().min(2).max(100),
    customer_phone: z.string().regex(/^(0|\+84)[0-9]{9}$/),
    note: z.string().max(500).optional(),
    payment_method: z.enum(['vnpay', 'momo', 'zalopay', 'cash']),
  })
  ```

- [ ] `fe/src/app/(shop)/checkout/page.tsx`
  - Guard: if `cartStore.itemCount === 0` → redirect /menu
  - Show order summary from cartStore
  - Submit logic:
    1. `cartStore.setPaymentMethod(form.payment_method)` — save BEFORE API call
    2. Build POST /orders payload — **DO NOT include `payment_method`** in payload body
    3. Include `source: tableId ? 'qr' : 'online'` in payload
    4. On success: `cartStore.clearCart()` → redirect `/order/${data.id}`

- [ ] `fe/src/hooks/useOrderSSE.ts`
  ```typescript
  const WS_RECONNECT = { maxAttempts: 5, baseDelay: 1000, maxDelay: 30_000, showBannerAfter: 3 }
  export function useOrderSSE(orderId: string) {
    // Read token from Zustand (NOT localStorage)
    const token = useAuthStore(s => s.accessToken)
    // Connect to: GET /api/v1/orders/${orderId}/events
    // Auth: Authorization: Bearer header (NOT query param)
    // Events: order_status_changed, item_progress, order_completed
    // Reconnect: exponential backoff on error
    // Show connectionError banner after 3 failed attempts
  }
  ```

- [ ] `fe/src/app/(shop)/order/[id]/page.tsx`
  - Call `useOrderSSE(orderId)` on mount
  - Show progress bar: `Math.round((totalServed / totalQty) * 100)%`
  - List each order_item with StatusBadge + qty_served indicator
  - Cancel button: only visible when `progress < 30 && status !== 'delivered'`
  - Show confirmation modal before calling DELETE /orders/:id
  - Show `ConnectionErrorBanner` when SSE reconnect fails 3+ times

- [ ] **Acceptance Criteria — Customer Flow:**
  - [ ] POST /orders payload has NO `payment_method` field, HAS `source` field
  - [ ] SSE connects to `/orders/:id/events` with `Authorization: Bearer` header
  - [ ] Token read from Zustand store, NEVER from localStorage
  - [ ] Progress bar updates in real-time when SSE `item_progress` event received
  - [ ] Cancel button only visible when < 30% done
  - [ ] Reconnect banner appears after 3 failed SSE attempts
  - [ ] All price displays use `formatVND()` function

---

### Task 5.4 — KDS Screen (Spec 4 FE) 🟡 MED

> **Dependency:** Task 4.4 WebSocket hub working

- [ ] `fe/src/app/(dashboard)/kds/page.tsx`
  - Full-screen layout, `background: #0A0F1E`, no navbar
  - Connect to `WS /api/v1/ws/kds` with `?token={accessToken}`
  - WS reconnect: same `WS_RECONNECT` config as SSE
  - Each order card shows:
    - Table/order number, timestamp, elapsed time
    - List of order_items (sub-items from combo expand, not combo header)
    - Color-code by elapsed time:
      - < 10 min: card background `#1F2937` (normal)
      - 10–20 min: card border `#FCD34D` yellow (warning)
      - > 20 min OR flagged: card border `#FC8181` red (urgent)
  - Click item → PATCH /orders/:id/items/:itemId/status → cycle pending→preparing→done
  - Flag button → PATCH /orders/:id/items/:itemId/flag → toggle
  - Sound alert when `new_order` WS event received (Web Audio API)

---

### Task 5.5 — POS Cashier + Payment UI (Spec 5 FE) 🟡 MED

> **Dependency:** Task 4.5 payments backend working

- [ ] `fe/src/app/(dashboard)/pos/page.tsx`
  - 2-column layout: left = menu browse (CategoryTabs + ProductGrid), right = order summary + total
  - Role guard: Cashier/Staff/Manager/Admin only
  - Create order: use Zustand cart → POST /orders with `customer_name="Khách tại quán"`, `customer_phone="0000000000"`
  - When order.status becomes 'ready' → navigate to /cashier/payment/[id]

- [ ] `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx`
  - Show order total + payment method
  - If QR method: display `<img src={qr_code_url} />` from POST /payments response
  - Subscribe to WS event `payment_success` with matching `payment_id`
  - On `payment_success`: toast "Thanh toán thành công" → `window.print()` → redirect /pos
  - COD button: POST /payments with method='cash' → immediate success
  - Optional: upload proof image via PATCH /payments/:id/proof

- [ ] Print receipt: `@media print { .no-print { display: none } }` — only receipt content visible when printing

---

## ⬜ Phase 6 — DevOps / Infrastructure

> **Dependency:** Phase 4 + Phase 5 at least partially working  
> **Can start:** Dockerfiles and docker-compose can be written in parallel with Phase 4

- [ ] `Dockerfile.be` — Go multi-stage build:
  ```dockerfile
  # Stage 1: builder
  FROM golang:1.22-alpine AS builder
  WORKDIR /app
  COPY go.mod go.sum ./
  RUN go mod download
  COPY . .
  RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

  # Stage 2: runner (distroless for security)
  FROM gcr.io/distroless/static-debian12
  COPY --from=builder /app/server /server
  EXPOSE 8080
  CMD ["/server"]
  ```

- [ ] `Dockerfile.fe` — Next.js multi-stage build:
  ```dockerfile
  # Stage 1: deps
  FROM node:20-alpine AS deps
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci

  # Stage 2: builder
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN npm run build

  # Stage 3: runner (standalone output)
  FROM node:20-alpine AS runner
  WORKDIR /app
  ENV NODE_ENV production
  COPY --from=builder /app/.next/standalone ./
  COPY --from=builder /app/.next/static ./.next/static
  EXPOSE 3000
  CMD ["node", "server.js"]
  ```
  - Add `output: 'standalone'` to `next.config.js`

- [ ] `docker-compose.yml` — 5 services with health checks:
  ```yaml
  services:
    mysql:      image: mysql:8.0     # healthcheck: mysqladmin ping
    redis:      image: redis/redis-stack:latest  # healthcheck: redis-cli ping
    backend:    build: ./be          # depends_on: mysql (healthy), redis (healthy)
    frontend:   build: ./fe          # depends_on: [backend]
    caddy:      image: caddy:2-alpine # ports: 80:80, 443:443
  ```

- [ ] `.env.example` — all vars from MASTER §9, placeholder values, comments:
  ```env
  # Database
  DB_DSN=user:pass@tcp(mysql:3306)/banhcuon?parseTime=true
  REDIS_URL=redis://redis:6379

  # JWT (generate: openssl rand -hex 32)
  JWT_SECRET=REPLACE_WITH_RANDOM_256BIT_HEX
  JWT_ACCESS_TTL=86400     # 24 hours
  JWT_REFRESH_TTL=2592000  # 30 days

  # Storage
  STORAGE_BASE_URL=https://cdn.banhcuon.vn
  STORAGE_BUCKET=banhcuon-uploads

  # VNPay
  VNPAY_TMN_CODE=REPLACE
  VNPAY_HASH_SECRET=REPLACE
  VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

  # MoMo
  MOMO_PARTNER_CODE=REPLACE
  MOMO_ACCESS_KEY=REPLACE
  MOMO_SECRET_KEY=REPLACE
  MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create

  # ZaloPay
  ZALOPAY_APP_ID=REPLACE
  ZALOPAY_KEY1=REPLACE
  ZALOPAY_KEY2=REPLACE
  ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create

  # App
  WEBHOOK_BASE_URL=https://banhcuon.example.com
  CORS_ORIGINS=https://app.banhcuon.vn
  PORT=8080
  ```

- [ ] `scripts/migrate.sh`:
  ```bash
  #!/bin/sh
  # Wait for MySQL to be ready
  until mysqladmin ping -h mysql --silent; do
    echo "Waiting for MySQL..."
    sleep 2
  done
  # Run Goose migrations
  goose -dir /migrations mysql "$DB_DSN" up
  # Start server
  exec /app/server
  ```

- [ ] `Caddyfile`:
  ```caddyfile
  banhcuon.vn {
      handle /api/* {
          reverse_proxy backend:8080
      }
      handle /webhooks/* {
          reverse_proxy backend:8080
      }
      handle {
          reverse_proxy frontend:3000
      }
  }
  ```

- [ ] `.github/workflows/deploy.yml`:
  - Trigger: push to `main`
  - Steps: checkout → build Docker images → push to registry → SSH to VPS → `docker-compose pull && docker-compose up -d`
  - Add rollback step: `docker pull previous-image && docker-compose up -d`

- [ ] `README.md`:
  - Local dev setup (docker-compose up)
  - Port map: BE=8080, FE=3000, MySQL=3306, Redis=6379
  - How to run migrations manually
  - How to run sqlc generate
  - Environment variables guide (link to .env.example)

---

## ⬜ Phase 7 — Testing, UAT & Go-Live

> **Dependency:** Phase 4 + Phase 5 substantially complete

### Unit Tests

- [ ] BE: `auth_service_test.go`
  - TestLogin_WrongPassword → same error as wrong username
  - TestLogin_RateLimitAfter5Fails
  - TestMultiSessionLogin → 2 tokens, both valid
  - TestLogoutSingleSession → logout 1, other still works
  - TestAccountDisabledImmediate → DEL cache → 401 on next request
  - TestTokenRotation → refresh returns new access token

- [ ] BE: `order_service_test.go`
  - TestCreateOrder_ComboExpand → verify parent + sub-items created
  - TestCreateOrder_DuplicateTable → 409 on second order for same table
  - TestCancelOrder_Under30Percent → success
  - TestCancelOrder_Over30Percent → 422
  - TestItemStatusCycle → pending → preparing → done
  - TestAutoReadyWhenAllItemsDone

- [ ] BE: `payment_handler_test.go`
  - TestVNPayWebhook_ValidSignature → payment updated
  - TestVNPayWebhook_InvalidSignature → rejected, no DB change
  - TestVNPayWebhook_Idempotent → second call no-op
  - TestCreatePayment_OrderNotReady → 409

- [ ] FE: `cart.store.test.ts`
  - TestAddSameItemIncreasesQty
  - TestRemoveItem
  - TestClearCart
  - TestTotalCalculation

- [ ] FE: `utils.test.ts`
  - TestFormatVND(45000) → "45.000 ₫"
  - TestFormatPercent(12.5) → "12,5%"

### Integration Tests

- [ ] Run all API endpoints against test database
- [ ] Verify all Acceptance Criteria from each spec (Spec 1 through Spec 5)
- [ ] Test SSE reconnect behavior
- [ ] Test WS reconnect with exponential backoff

### Data Setup

- [ ] Write seed data script `scripts/seed.sql` or Go seed command:
  - 3+ categories (Bánh Cuốn, Chả, Đồ Uống)
  - 10+ products with prices and image_path placeholders
  - 5+ toppings
  - 2+ combos with items
  - 4 staff accounts: 1 chef, 1 cashier, 1 manager, 1 admin (bcrypt hashed passwords)
  - 5+ tables with qr_token values

### Payment Sandbox Testing

- [ ] Setup VNPay sandbox account at sandbox.vnpayment.vn
- [ ] Use ngrok (`ngrok http 8080`) to expose local webhook endpoint
- [ ] Test full payment flow: create QR → scan with VNPay test app → receive webhook → verify payment updated
- [ ] Test MoMo sandbox same way
- [ ] Test webhook signature rejection (tamper with params)
- [ ] Test double-webhook (idempotency)

### UAT Plan

- [ ] Create `docs/UAT_Plan.docx`:
  - Test cases for each feature matching Acceptance Criteria
  - Stakeholder sign-off checklist
  - Bug severity classification (P0/P1/P2)

### Compliance

- [ ] Add Privacy Policy page at `/privacy-policy`
- [ ] Add Terms of Service page at `/terms`
- [ ] Add Cookie Consent banner
- [ ] Verify PCI-DSS: confirm credit card numbers are NEVER stored (only gateway_ref tokens)

### Go-Live Checklist

- [ ] Domain A record pointing to production VPS IP
- [ ] Caddy starts and obtains SSL certificate automatically
- [ ] All environment variables set in production server (NEVER commit .env)
- [ ] Run `goose up` on production database
- [ ] Run seed script for initial data
- [ ] Test login, order creation, payment (with real VNPay in sandbox mode first)
- [ ] Setup monitoring: error rate alerts (>5% → notify), response time alerts (>500ms → notify)
- [ ] Setup log aggregation (Docker logs → Loki or CloudWatch)
- [ ] Rollback plan documented: `docker pull {previous-image-tag} && docker-compose up -d`
- [ ] Post-launch support SLA defined: P0 (production down) = 4h, P1 (major bug) = 24h, P2 (minor bug) = 72h

---

## 📋 Quick Reference — Dependency Order

```
Issue #5 resolved ─┐
Issue #7 resolved ─┤
                   ▼
Phase 0 (API_CONTRACT.docx) ─┐
Phase 1 (migrations ✅) ──────┤
Phase 2 (Spec 6 + 7) ────────┤
                              ▼
                   Phase 3 (sqlc + project setup)
                              │
                   ┌──────────┴──────────┐
                   ▼                     ▼
            Phase 4 (BE)          Phase 6 (DevOps)
            Task order:           (can run in parallel)
            4.1 Auth
            4.2 Products
            4.3 Orders
            4.4 WebSocket
            4.5 Payments
            4.6 Other endpoints
                   │
                   ▼
            Phase 5 (FE)
            Task order:
            5.1 Auth flow
            5.2 Menu + Cart
            5.3 Checkout + SSE
            5.4 KDS screen
            5.5 POS + Payment UI
                   │
                   ▼
            Phase 7 (Testing + Go-Live)
```

---

## 🏷️ Branch Naming Convention

```
feature/spec-001-auth
feature/spec-002-products
feature/spec-003-menu-checkout-ui
feature/spec-004-orders-api
feature/spec-005-payment-webhooks
feature/spec-006-qr-pos
feature/spec-007-staff-management
fix/auth-refresh-token-null
fix/order-cancel-30-percent
chore/docker-compose-redis-stack
chore/sqlc-setup
db/008-order-item-status       ← only if Issue #5 = Approach A
docs/api-contract-v12
```

---

## ⚠️ Critical Rules — Never Forget

| Rule | Detail |
|---|---|
| **No localStorage for tokens** | Access token in Zustand memory only. Refresh token in httpOnly cookie. |
| **No hardcoded colors** | Use Tailwind classes (e.g. `text-orange-500`) not `#FF7A1A` |
| **No hardcoded env vars** | Always `os.Getenv()` in Go, `process.env.` in Next.js |
| **Verify HMAC before any logic** | Payment webhooks: signature check is FIRST operation, before any DB access |
| **Idempotent webhooks** | Check `payment.status` before updating — gateways call webhooks multiple times |
| **UUID strings not integers** | All IDs are `string` in TypeScript, `string` in Go (CHAR(36)) |
| **field names** | `price` not `base_price`, `image_path` not `image_url`, `created_by` not `staff_id`, `gateway_data` not `webhook_payload`, `completed` not `success` (payment status) |
| **total_amount drift** | Call `recalculateTotalAmount()` after EVERY order_items mutation |
| **No order_items.status column** | Derive from `qty_served` UNLESS Issue #5 resolves to Approach A |
| **Payment only when ready** | POST /payments must reject if `order.status ≠ 'ready'` |
| **1 table 1 active order** | Check before INSERT into orders. Use composite index `idx_orders_table_status` |
| **Soft delete everywhere** | Use `deleted_at` — never hard DELETE. Query: always add `WHERE deleted_at IS NULL` |

---

*🍜 BanhCuon System · Project Checklist · v1.0 · Tháng 4/2026*  
*Follow phases in order. Resolve blockers first. Each task has its dependency listed.*
