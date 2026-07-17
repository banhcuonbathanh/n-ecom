# Project Task Tracker — Hệ Thống Quản Lý Quán Bánh Cuốn

> **Version:** v1.1 · 2026-05-03
> **Rule:** Update status here after every task. ⬜ = not started · 🔄 = in progress · ✅ = done · 🔴 = blocked
> **Before starting any task:** `git checkout -b feature/<task-id>-<short-name>` (e.g. `feature/p1-8-order-groups`), then follow `docs/IMPLEMENTATION_WORKFLOW.md` — READ → PLAN → ALIGN → IMPLEMENT → REVIEW → TEST → DONE

---

## FE Task Format (v1.1 — applies to Phase 9+)

> **Rule:** Every new FE task row MUST have `spec_ref` and `draw_ref`. Tasks without these fields are not ready to start.
> **Before creating FE task rows:** Run Step 0 in `IMPLEMENTATION_WORKFLOW.md` — DRAW wireframe first, then decompose.

| ID | Domain | Task | Status | spec_ref | draw_ref |
|---|---|---|---|---|---|
| template | FE | Description of what to build | ⬜ | `Spec_X §Y.Z` | `wireframes/page.md zone-N` |

**`spec_ref`** — exact section in the spec that defines this component's behaviour (e.g. `Spec_9 §3.2`)
**`draw_ref`** — wireframe file + zone label (e.g. `wireframes/overview.md zone-B`)

If you cannot fill `spec_ref` → the spec is missing a section → flag ❓ CLARIFY before proceeding.
If you cannot fill `draw_ref` → no wireframe exists yet → run Step 0b DRAW first.

---

---

## Phase Status Overview

| Phase | Status | Progress |
|---|---|---|
| Phase 0 — Docs & Architecture | ✅ COMPLETE | 100% |
| Phase 1 — DB Migrations (001–008) | ✅ COMPLETE | 100% |
| Phase 2 — Feature Specs | ✅ COMPLETE | 100% (7/7) |
| Phase 3 — sqlc + Project Setup | ✅ COMPLETE | 100% (sqlc generated + field names verified) |
| Phase 4 — Backend Implementation | ✅ COMPLETE | 100% (all domains coded + all AC verified and fixed) |
| Phase 5 — Frontend Implementation | ✅ COMPLETE | 100% (5.1 auth + 5.2 menu/cart + 5.3 checkout/SSE + 5.4 KDS + 5.5 POS/Payment ✅) |
| Phase 6 — DevOps / Infrastructure | ✅ COMPLETE | 100% |
| Phase 7 — Testing & Go-Live | ⬜ NOT STARTED | 0% |
| Phase 8 — Admin Dashboard | ✅ COMPLETE | 100% (FE pages built + BE staff endpoints implemented) |
| Phase 9 — Overview Real API + Extraction | ⬜ NOT STARTED | 0% (9-1→9-8 pending) |
| Phase 10 — Summary Dashboard | ✅ COMPLETE | 100% (BE analytics + FE components 10-1→10-14) |
| Phase UX — Customer Flow Improvements | ✅ COMPLETE | 100% (UX-1→UX-3) |

---

## Phase 0 — Docs & Architecture (Addendum)

> **Doc Restructuring — 2026-04-30:** Replaced navigation-only index files with comprehensive system guides.

| ID | Status | Task | Notes |
|---|---|---|---|
| P0-A1 | ✅ | Create `docs/be/BE_SYSTEM_GUIDE.md` — comprehensive BE manual (8 epics · business rules · auth flow · error codes · DI pattern · code patterns · per-epic reading list) | Supersedes BE_DOC_INDEX.md as primary guide |
| P0-A2 | ✅ | Create `docs/fe/FE_SYSTEM_GUIDE.md` — comprehensive FE manual (8 epics · design tokens · TS conventions · auth/token rules · all code patterns · per-epic reading list) | Supersedes FE_DOC_INDEX.md as primary guide |

---

## Phase 1 — DB Migrations (Addendum)

> **Migration 008 — Multi-table Group support**

| ID | Status | Task | Notes |
|---|---|---|---|
| P1-8 | ✅ | Run migration `008_order_groups.sql` — adds `group_id CHAR(36) NULL` + index to `orders` table | See [008_order_groups.sql.md](task/task1_database/Ver%202/008_order_groups.sql.md) |

---

## Phase 2 — Feature Specs

> **Owner:** BA · **Dependency:** none · **Blocks:** Phase 4.6 (QR endpoint), Phase 5 (table page)

| ID | Status | Task | Spec Ref |
|---|---|---|---|
| P2-1 | ✅ | Write `docs/spec/Spec_6_QR_POS.md` — QR token decode flow, guest auth, table assignment, offline POS edge cases, active-order-on-scan conflict, multi-table group, staff-orders-for-customer, per-item toppings | Spec 6 |
| P2-2 | ✅ | Write `docs/spec/Spec_7_Staff_Management.md` — CRUD staff, deactivation, cache invalidation, manager cannot deactivate own account | Spec 7 |

---

## Phase 3 — sqlc + Project Setup

> **Owner:** DB Dev · **Dependency:** Phase 1 ✅ · **Blocks:** Phase 4 entirely

| ID | Status | Task | Notes |
|---|---|---|---|
| P3-1 | ✅ | Install sqlc CLI and run `sqlc generate` → creates `be/internal/db/` (models + querier) | `cd be && sqlc generate` |
| P3-2 | ✅ | Verify generated struct field names — must match schema: `price` not `base_price`, `image_path` not `image_url`, `created_by` not `staff_id`, `gateway_data` not `webhook_payload`, payment status `completed` not `success` | Read `docs/be/DB_SCHEMA_SUMMARY.md` |

---

## Phase 4 — Backend Implementation

> **Dependency:** Phase 3 ✅ · **Order is strict:** 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6
> **Spec refs:** Spec1 (Auth) · Spec2 (Products) · Spec4 (Orders) · Spec5 (Payments)

### Task 4.1 — Auth Backend 🔴 MUST BE FIRST

| ID | Status | Task | AC |
|---|---|---|---|
| 4.1-1 | ✅ | `be/pkg/redis/pubsub.go` — Publish, Subscribe, Unsubscribe wrappers | — |
| 4.1-2 | ✅ | `be/pkg/redis/bloom.go` — Add, Exists (for `bloom:order_exists`, `bloom:product_ids`) | — |
| 4.1-3 | ✅ | `be/internal/repository/auth_repo.go` — Wrap all sqlc auth queries (GetStaffByUsername, GetStaffByID, CreateRefreshToken, GetRefreshToken, DeleteRefreshToken, DeleteRefreshTokensByStaff, SetStaffActive, ListActiveSessionsByStaff) | — |
| 4.1-4 | ✅ | `be/internal/service/auth_service.go` — Login (rate limit check → bcrypt → access token → refresh token → max 5 sessions), Refresh, Logout, GetMe, GuestLogin, DeactivateStaff, ReactivateStaff | Spec1 AC |
| 4.1-5 | ✅ | `be/internal/middleware/auth.go` — parse Bearer, JWT validate, set claims/staff_id/role in context, httpOnly cookie helpers | Spec1 AC |
| 4.1-6 | ✅ | `be/internal/handler/auth_handler.go` — POST /login (httpOnly cookie), POST /refresh, POST /logout, GET /me, POST /guest | Spec1 AC |
| 4.1-AC | ✅ | Verify all Acceptance Criteria from Spec1: wrong-password same error, 6th login → 429, dual sessions, single logout, admin deactivate → 401, is_active Redis cache hit, error format `{"error":"AUTH_001","message":"..."}` | Spec1 |

### Task 4.2 — Products Backend

> **Dependency:** 4.1 auth middleware working

| ID | Status | Task | AC |
|---|---|---|---|
| 4.2-1 | ✅ | `be/internal/repository/product_repo.go` — Wrap all sqlc product/category/topping/combo queries | — |
| 4.2-2 | ✅ | `be/internal/service/product_service.go` — CRUD products/categories/toppings/combos + Redis cache (TTL 5min, invalidate on every write) | Spec2 AC |
| 4.2-3 | ✅ | `be/internal/handler/product_handler.go` — All 20+ endpoints: GET public endpoints, POST/PATCH/DELETE require Manager+ (RequireRole(4)) | Spec2 AC |
| 4.2-AC | ✅ | Verify: `price` field (not `price_delta`), `category_id`+`sort_order` in combos, soft delete, `is_available` filter, Redis invalidated on write, IDs are UUID strings, `image_path` is relative path | Spec2 |

### Task 4.3 — Orders Backend

> **Dependency:** 4.2 products working

| ID | Status | Task | AC |
|---|---|---|---|
| 4.3-1 | ✅ | `be/internal/repository/order_repo.go` — Wrap all sqlc order queries | — |
| 4.3-2 | ✅ | `be/internal/service/order_service.go` — CreateOrder (1-table-1-active check, combo expansion in TX, order_seq from Redis, WS publish), CancelOrder (30% rule, SSE publish), UpdateItemStatus (qty_served cycle, auto-ready), GetOrder (customer visibility check), UpdateOrderStatus (state machine validation) | Spec4 AC |
| 4.3-3 | ✅ | `be/internal/sse/handler.go` — SSE headers (`text/event-stream`, `X-Accel-Buffering: no`), Redis pub/sub subscribe, initial state event, 15s heartbeat | Spec4 AC |
| 4.3-4 | ✅ | `be/internal/handler/order_handler.go` — POST /orders, GET /orders, GET /orders/:id, PATCH /orders/:id/status, DELETE /orders/:id, PATCH items/:itemId/status, PATCH items/:itemId/flag, GET /orders/:id/events (SSE) | Spec4 AC |
| 4.3-5 | ✅ | `be/internal/service/group_service.go` — full implementation: CreateGroup, AddToGroup, GetGroupOrders, RemoveFromGroup, DisbandGroup, HasOrderInGroup; ErrAlreadyGrouped sentinel added | Spec4 §12 |
| 4.3-6 | ✅ | `be/internal/handler/group_handler.go` — full handlers: CreateGroup, GetGroup, AddToGroup, RemoveFromGroup, DisbandGroup; routes wired in main.go with correct RBAC (Cashier+ create/add/remove, Manager+ disband) | Spec4 §12 |
| 4.3-7 | ✅ | `be/internal/sse/group_handler.go` — StreamGroup: subscribes to Redis `group:{id}`, sends full snapshot on connect + on every event, 15s heartbeat | Spec4 §12.4 |
| 4.3-AC | ✅ | Verify: combo expansion creates parent+sub-items, 1-table-1-active → 409, invalid state transition rejected, chef click → SSE to customer, cancel <30% success, cancel ≥30% → 422, customer cannot see other orders, WS `new_order` on create, SSE heartbeat 15s, group AC-G1 through AC-G8 | Spec4 |

### Task 4.4 — WebSocket Hub

> **Dependency:** 4.3 orders working

| ID | Status | Task | AC |
|---|---|---|---|
| 4.4-1 | ✅ | `be/internal/websocket/hub.go` — Hub struct with sync.RWMutex, Run() goroutine (register/unregister/broadcast), ping 30s/pong deadline 10s | — |
| 4.4-2 | ✅ | `be/internal/websocket/client.go` — Client struct, readPump (read deadline 60s), writePump (write deadline 10s) | — |
| 4.4-3 | ✅ | `be/internal/websocket/handler.go` — HTTP upgrade, JWT auth via `?token=` query param, register client with Hub | — |
| 4.4-4 | ✅ | Register WS routes in main.go: `WS /api/v1/ws/kds` (Chef+), `WS /api/v1/ws/orders-live` (Cashier+) | — |

### Task 4.5 — Payments Backend

> **Dependency:** 4.3 orders working · ⚠️ Always confirm before running payment code — real money

| ID | Status | Task | AC |
|---|---|---|---|
| 4.5-1 | ✅ | `be/internal/payment/vnpay.go` — CreatePaymentURL, VerifyWebhook (HMAC-SHA512: remove hash key → sort → concat → compare) | Spec5 AC |
| 4.5-2 | ✅ | `be/internal/payment/momo.go` — CreatePayment, VerifyCallback (HMAC-SHA256) | Spec5 AC |
| 4.5-3 | ✅ | `be/internal/payment/zalopay.go` — CreateOrder, VerifyCallback (HMAC-SHA256) | Spec5 AC |
| 4.5-4 | ✅ | `be/internal/repository/payment_repo.go` + `be/internal/service/payment_service.go` — create, get, update status, idempotency check | Spec5 AC |
| 4.5-5 | ✅ | `be/internal/handler/payment_handler.go` — POST /payments (verify order.status=ready), GET /payments/:id, POST /webhooks/vnpay (HMAC first, idempotent, VNPay response format), POST /webhooks/momo, POST /webhooks/zalopay | Spec5 AC |
| 4.5-6 | ✅ | `be/internal/jobs/payment_timeout.go` — polling ticker every 1min (⚠️ implemented as polling, NOT Redis keyspace notifications as spec said — simpler, no Redis config needed) | — |
| 4.5-AC | ✅ | Verify: payment rejected when order≠ready, COD immediate complete, QR returns qr_code_url, bad HMAC → rejected no DB change, duplicate webhook → no-op, amount mismatch → reject, raw webhook stored in gateway_data, WS broadcasts payment_success | Spec5 |

### Task 4.6 — Remaining Endpoints

> **Dependency:** 4.1 auth working · P2-1 Spec6 written

| ID | Status | Task | AC |
|---|---|---|---|
| 4.6-1 | ✅ | `GET /api/v1/tables/qr/:token` — Query tables WHERE qr_token=? AND is_active=1 AND deleted_at IS NULL, return table_id/name/capacity | Spec6 |
| 4.6-2 | ✅ | `POST /api/v1/files/upload` — Multipart, validate size ≤10MB (FILE_001), mime = image/* or PDF (FILE_002), save file, create orphan record, return `{id, object_path}` | — |
| 4.6-3 | ✅ | `be/internal/jobs/file_cleanup.go` — Ticker every 6h, DELETE orphan files > 24h old, wrapped in goroutine with `defer recover()` | — |
| 4.6-4 | ✅ | Wire all routes + DI in `be/cmd/server/main.go` — graceful shutdown (SIGTERM), health check endpoint `/health` | — |

---

## Phase 5 — Frontend Implementation

> **Dependency:** Phase 4.1 auth ✅ + API_CONTRACT exists · **Order:** 5.1 → 5.2 → 5.3 → 5.4 → 5.5
> **Critical rules:** No localStorage for tokens · No hardcoded colors · All IDs are string (UUID) · Server state → TanStack Query · Client state → Zustand · Forms → RHF+Zod

### Task 5.1 — Auth Flow

| ID | Status | Task | AC |
|---|---|---|---|
| 5.1-1 | ✅ | `fe/src/lib/api-client.ts` — Axios instance, request interceptor (attach Bearer from Zustand), response interceptor (401 → refresh → retry once, 2nd 401 → clear store → redirect /login), withCredentials: true | Spec1 FE AC |
| 5.1-2 | ✅ | `fe/src/features/auth/auth.store.ts` — Zustand: `user`, `accessToken` (memory only, never localStorage), setAuth, clearAuth | Spec1 FE AC |
| 5.1-3 | ✅ | `fe/src/features/auth/auth.api.ts` — login, logout, refreshToken, getMe | — |
| 5.1-4 | ✅ | `fe/src/app/(auth)/login/page.tsx` — RHF + Zod (username min 3, password min 6), role-based redirect (chef→/kds, cashier→/pos, manager/admin→/dashboard, customer→/menu), inline error on wrong credentials | Spec1 FE AC |
| 5.1-5 | ✅ | `fe/src/components/guards/AuthGuard.tsx` — On mount: if no token → try getMe() → if fails → redirect /login | — |
| 5.1-6 | ✅ | `fe/src/components/guards/RoleGuard.tsx` — Role value compare, show 403 page (not redirect) if insufficient | — |
| 5.1-AC | ✅ | Verify: token never in localStorage (DevTools check), F5 → silent session restore, 401 → auto refresh → retry, 2nd 401 → /login, wrong role → 403 page | Spec1 FE |

### Task 5.2 — Menu & Cart

> **Dependency:** 5.1 auth + 4.2 products API working

| ID | Status | Task | AC |
|---|---|---|---|
| 5.2-1 | ✅ | `fe/src/types/product.ts` — Topping, Product, ComboItem, Combo interfaces (NO slug, NO base_price, NO image_url, NO price_delta) | Spec3 |
| 5.2-2 | ✅ | `fe/src/types/order.ts` + `fe/src/types/cart.ts` — CartItem, Order, OrderItem, itemStatus derive function | Spec4 |
| 5.2-3 | ✅ | `fe/src/store/cart.ts` — CartStore: items, tableId, paymentMethod, addItem (dedup same product+toppings → increment qty), removeItem, updateQty, clearCart, setTableId, setPaymentMethod, computed: total, itemCount | Spec3 |
| 5.2-4 | ✅ | `fe/src/components/menu/CategoryTabs.tsx` — Sticky, horizontal scroll mobile, active = `border-b-2 border-primary` | Spec3 |
| 5.2-5 | ✅ | `fe/src/components/menu/ProductCard.tsx` — image_path, name, formatVND(price) in orange, "+Thêm" button, "Hết" badge if !is_available | Spec3 |
| 5.2-6 | ✅ | `fe/src/components/menu/ToppingModal.tsx` — Checkbox list, `+{price}₫` per topping, footer total = product.price + sum(selected topping prices) | Spec3 |
| 5.2-7 | ✅ | `fe/src/components/menu/ComboModal.tsx` — Combo image, combo_items list with quantities, confirm button | Spec3 |
| 5.2-8 | ✅ | `fe/src/components/menu/CartDrawer.tsx` — Slide-in from right, qty stepper, total, "Thanh toán" → /checkout | Spec3 |
| 5.2-9 | ✅ | `fe/src/app/(shop)/menu/page.tsx` — TanStack Query for products, CategoryTabs, ProductCard grid, CartDrawer. Also created `EmptyState.tsx` (replaces 5.3-4 partial) | Spec3 AC |
| 5.2-10 | ✅ | `fe/src/app/table/[tableId]/page.tsx` — POST /auth/guest {qr_token} → store token in Zustand (not localStorage) → cartStore.setTableId(table.id) → redirect /menu | Spec6 |

### Task 5.3 — Checkout & Order Tracking

> **Dependency:** 5.2 cart + 4.3 orders API working
> ⚠️ **Before starting:** run `cd fe && npm install sonner @microsoft/fetch-event-source` — needed for toast + SSE hook

| ID | Status | Task | AC |
|---|---|---|---|
| 5.3-1 | ✅ | `fe/src/app/(shop)/checkout/page.tsx` — Guard: empty cart → redirect /menu. RHF + Zod schema (customer_name, phone regex, note, payment_method enum). Submit: setPaymentMethod → POST /orders (NO payment_method in body, HAS source field) → clearCart → redirect `/order/${id}` | Spec3 AC |
| 5.3-2 | ✅ | `fe/src/hooks/useOrderSSE.ts` — SSE to `/orders/:id/events`, Authorization Bearer header (not query param), exponential backoff (maxAttempts=5, base=1s, max=30s), set connectionError after 3 fails | Spec3 AC |
| 5.3-3 | ✅ | `fe/src/app/(shop)/order/[id]/page.tsx` — useOrderSSE, progress bar `Math.round((totalServed/totalQty)*100)%`, item list with StatusBadge, cancel button only if `<30% && status!=='delivered'`, confirm modal before DELETE /orders/:id, ConnectionErrorBanner after 3 fails | Spec3 AC |
| 5.3-4 | ✅ | `fe/src/components/shared/StatusBadge.tsx`, `ConnectionErrorBanner.tsx` (`EmptyState.tsx` ✅ done in 5.2-9) | — |
| 5.3-AC | ✅ | Verify: POST payload has no payment_method field + has source field, SSE uses Bearer not query param, token from Zustand (not localStorage), progress bar updates real-time, cancel button <30% only, banner after 3 SSE fails, all prices use formatVND() | Spec3 |

### Task 5.4 — KDS Screen

> **Dependency:** 4.4 WebSocket hub working

| ID | Status | Task | AC |
|---|---|---|---|
| 5.4-1 | ✅ | `fe/src/app/(dashboard)/kds/page.tsx` — Full-screen bg `#0A0F1E`, WS `/ws/kds?token={accessToken}`, same WS_RECONNECT config as SSE. Cards: table+order number, timestamp, elapsed time, item list (sub-items only, not combo header). Color: <10min normal, 10-20min yellow border, >20min or flagged red border. Click item → PATCH status cycle. Flag → PATCH flag toggle. Sound alert on new_order (Web Audio API). | Spec4 FE |

### Task 5.5 — POS & Payment UI

> **Dependency:** 4.5 payments backend working

| ID | Status | Task | AC |
|---|---|---|---|
| 5.5-1 | ✅ | `fe/src/app/(dashboard)/pos/page.tsx` — 2-column layout (menu browse left, order summary right), RoleGuard Cashier+, POST /orders with `customer_name="Khách tại quán"` / `customer_phone="0000000000"`, navigate to payment page when order.status = 'ready' | Spec5 FE |
| 5.5-2 | ✅ | `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx` — Show order total, QR image from POST /payments response, subscribe WS `payment_success`, on success: toast → window.print() → redirect /pos. COD button → immediate. Optional proof upload via PATCH /payments/:id/proof. Print: `@media print { .no-print { display: none } }` | Spec5 FE AC |

---

## Phase 6 — DevOps / Infrastructure

> **Can run in parallel with Phase 4** · Owner: DevOps · Ref: `docs/claude/CLAUDE_DEVOPS.md`

| ID | Status | Task | Notes |
|---|---|---|---|
| 6-1 | ✅ | `.env.example` — All vars matched to actual code: DB_DSN, REDIS_ADDR, JWT_SECRET, JWT_ACCESS_TTL, JWT_REFRESH_TTL, STORAGE_*, VNPAY_BASE_URL, MOMO_*, ZALOPAY_*, WEBHOOK_BASE_URL, CORS_ORIGINS, PORT, NEXT_PUBLIC_API_URL | MASTER §9 |
| 6-2 | ✅ | `scripts/migrate.sh` — Wait for MySQL (mysqladmin ping loop), run `goose -dir /migrations mysql "$DB_DSN" up`, exec server | — |
| 6-3 | ✅ | `Caddyfile` — Route `/api/*` and `/webhooks/*` and `/health` → be:8080, everything else → fe:3000 | — |
| 6-4 | ✅ | Updated `docker-compose.yml` — Added Caddy service (ports 80+443), caddy_data + caddy_config volumes. MySQL + Redis healthchecks were already present. | — |
| 6-5 | ✅ | `.github/workflows/deploy.yml` — Trigger: push to main. Steps: test → build+push images (ghcr.io) → SSH deploy + health-check rollback | — |
| 6-6 | ✅ | `README.md` — Updated: accurate phase status, quick start, full env vars table, migration commands, port map | — |

---

## Phase 7 — Testing & Go-Live

> **Dependency:** Phase 4 + Phase 5 substantially complete

### Unit Tests

| ID | Status | Task | Test Cases |
|---|---|---|---|
| 7-1 | ⬜ | `be/internal/service/auth_service_test.go` | TestLogin_WrongPassword, TestLogin_RateLimitAfter5Fails, TestMultiSessionLogin, TestLogoutSingleSession, TestAccountDisabledImmediate, TestTokenRotation |
| 7-2 | ⬜ | `be/internal/service/order_service_test.go` | TestCreateOrder_ComboExpand, TestCreateOrder_DuplicateTable, TestCancelOrder_Under30Percent, TestCancelOrder_Over30Percent, TestItemStatusCycle, TestAutoReadyWhenAllItemsDone |
| 7-3 | ⬜ | `be/internal/handler/payment_handler_test.go` | TestVNPayWebhook_ValidSignature, TestVNPayWebhook_InvalidSignature, TestVNPayWebhook_Idempotent, TestCreatePayment_OrderNotReady |
| 7-4 | ⬜ | `fe/src/store/cart.store.test.ts` + `fe/src/lib/utils.test.ts` | TestAddSameItemIncreasesQty, TestRemoveItem, TestClearCart, TestTotalCalculation, TestFormatVND, TestFormatPercent |

### Integration & Sandbox Tests

| ID | Status | Task |
|---|---|---|
| 7-5 | ⬜ | Integration test suite — all API endpoints against test DB, SSE reconnect behavior, WS reconnect exponential backoff |
| 7-6 | ✅ | `scripts/seed.sql` — 3+ categories, 10+ products, 5+ toppings, 2+ combos, 4 staff accounts (chef/cashier/manager/admin, bcrypt hashed), 5+ tables with qr_token values |
| 7-7 | ⬜ | Payment sandbox — VNPay + MoMo via ngrok. Test: full QR flow, signature rejection, double-webhook idempotency, amount mismatch rejection |

### UAT & Compliance

| ID | Status | Task |
|---|---|---|
| 7-8 | ⬜ | `docs/UAT_Plan.md` — Test cases per spec, stakeholder sign-off checklist, bug severity P0/P1/P2 |
| 7-9 | ⬜ | Compliance: `/privacy-policy` page, `/terms` page, cookie consent banner. Verify PCI-DSS: card numbers never stored |

### Go-Live

| ID | Status | Task |
|---|---|---|
| 7-10 | ⬜ | DNS A record → VPS IP, Caddy SSL auto-cert, set all prod env vars (never commit .env), `goose up` on prod DB, run seed, test login + order + payment |
| 7-11 | ⬜ | Monitoring: error rate alert >5% → notify, response time alert >500ms → notify, log aggregation (Docker logs → Loki or CloudWatch) |
| 7-12 | ⬜ | Rollback plan documented: `docker pull {previous-image-tag} && docker compose up -d`. Post-launch SLA: P0=4h, P1=24h, P2=72h |

---

## Phase 8 — Admin Dashboard (Manager+)

> **Dependency:** Phase 4 (BE CRUD endpoints) + Phase 5 (auth flow) ✅
> **Role:** Manager+ for products/categories/toppings/staff. Admin-only for staff delete.
> **Ref:** `docs/spec/Spec_2_Products_API_v2_CORRECTED.md` · `docs/spec/Spec_7_Staff_Management.md`

### Frontend — Admin Pages (✅ Built)

| ID | Status | Task | Notes |
|---|---|---|---|
| 8-1 | ✅ | `fe/src/types/staff.ts` — Staff, StaffRole, StaffListResponse interfaces | — |
| 8-2 | ✅ | `fe/src/features/admin/admin.api.ts` — CRUD API for categories, products, toppings, staff | Manager+ endpoints only |
| 8-3 | ✅ | `fe/src/app/(dashboard)/admin/layout.tsx` — Tab nav (Sản phẩm · Danh mục · Topping · Nhân viên), AuthGuard + RoleGuard(Manager+) | — |
| 8-4 | ✅ | `fe/src/app/(dashboard)/admin/page.tsx` — redirect → /admin/products | — |
| 8-5 | ✅ | `fe/src/app/(dashboard)/admin/products/page.tsx` — List + Add/Edit modal (RHF+Zod) + Delete confirm + Toggle availability | Spec2 AC |
| 8-6 | ✅ | `fe/src/app/(dashboard)/admin/categories/page.tsx` — List + Add/Edit modal + Delete | Spec2 AC |
| 8-7 | ✅ | `fe/src/app/(dashboard)/admin/toppings/page.tsx` — List + Add/Edit modal + Delete | Spec2 AC |
| 8-8 | ✅ | `fe/src/app/(dashboard)/admin/staff/page.tsx` — List + Add modal (with password) + Edit modal + Activate/Deactivate toggle + Delete (Admin only) | Spec7 AC |

### Backend — Staff Endpoints (✅ Complete)

> **Note:** Products/categories/toppings CRUD already exist from Phase 4.2. Staff endpoints implemented from scratch (no sqlc queries existed).

| ID | Status | Task | Notes |
|---|---|---|---|
| 8-9 | ✅ | Verify/implement `GET /api/v1/staff` — list with pagination, role filter | Spec7 §4 |
| 8-10 | ✅ | Verify/implement `POST /api/v1/staff` — create staff (Manager+ creates role ≤ own-1) | Spec7 §4 |
| 8-11 | ✅ | Verify/implement `PATCH /api/v1/staff/:id` — update full_name, role, phone, email | Spec7 §4 |
| 8-12 | ✅ | Verify/implement `PATCH /api/v1/staff/:id/status` — activate/deactivate + Redis cache invalidation | Spec7 §5 |
| 8-13 | ✅ | Verify/implement `DELETE /api/v1/staff/:id` — soft delete (Admin only, not last admin) | Spec7 §4 |

### AC (Acceptance Criteria)

| # | Kịch Bản | Kết Quả Mong Đợi |
|---|---|---|
| AC-8-1 | Manager truy cập /admin/products | Thấy danh sách sản phẩm, nút + Thêm |
| AC-8-2 | Manager thêm sản phẩm mới | Sản phẩm xuất hiện trong danh sách, cache invalidated |
| AC-8-3 | Manager toggle availability | Badge đổi màu ngay, PATCH /products/:id/availability gọi thành công |
| AC-8-4 | Manager thêm nhân viên role=chef | Tài khoản tạo thành công, hiện trong danh sách |
| AC-8-5 | Manager deactivate nhân viên | Badge đổi sang "Vô hiệu", PATCH /staff/:id/status thành công |
| AC-8-6 | Manager cố deactivate chính mình | Nút disabled, không gọi API |
| AC-8-7 | Non-manager truy cập /admin | RoleGuard hiện "Không có quyền truy cập" |
| AC-8-8 | Admin xóa nhân viên | Nút Xóa chỉ hiện với Admin, confirm dialog trước khi xóa |

### Admin Dashboard Addendum — Overview + Marketing (2026-05-03)

| ID | Status | Task | Notes |
|---|---|---|---|
| 8-14 | ✅ | `fe/src/app/(dashboard)/admin/overview/page.tsx` — Live floor view: stat cards · "N bàn chờ xác nhận" section with Phục vụ/Mang đi/Huỷ action buttons · Kiểm tra toggle → PrepPanel with per-table dish detail + remaining summary · All-tables grid with urgency color borders · WS real-time via `/ws/orders-live` | Spec 9 §2 |
| 8-15 | ✅ | `fe/src/app/(dashboard)/admin/marketing/page.tsx` — QR code generator (10 tables, copy/SVG/print) + product catalogue display | Spec 9 §3 |
| 8-16 | ✅ | `fe/src/features/admin/admin.api.ts` — Added `updateOrderStatus()` + `listLiveOrders()` + `listTables()` functions | Used by overview page |
| 8-17 | ✅ | Admin layout tab nav updated — added Tổng quan + Marketing tabs | `fe/src/app/(dashboard)/admin/layout.tsx` |

---

## Phase 9 — Overview Page (Real API + Component Extraction)

> **Spec:** `Spec_9 §2` · **Wireframe:** `docs/fe/wireframes/overview.md`
> **Dependency:** Phase 8 ✅ · Phase 4 ✅ (BE endpoints live)
> **Goal:** Replace `USE_MOCK = true` with real API + WS; extract inline components to files; verify all 6 zones match spec.

| ID | Domain | Task | Status | spec_ref | draw_ref |
|---|---|---|---|---|---|
| 9-1 | FE | `admin.api.ts` — verify `listTables`, `listLiveOrders`, `updateOrderStatus` use real axios calls (no mock path) | ⬜ | `Spec_9 §2.1 §4` | `wireframes/overview.md ZoneF` |
| 9-2 | FE | `useOverviewWS` hook — WS connect/reconnect (exponential backoff) + 6 message type handlers → mutate TanStack Query cache | ⬜ | `Spec_9 §2.1` | `wireframes/overview.md ZoneF` |
| 9-3 | FE | `StatCards` component — 4 stat cards derived from live orders (tables served · pending items · preparing items · urgency >20min/10–20min) | ⬜ | `Spec_9 §2.2` | `wireframes/overview.md ZoneA` |
| 9-4 | FE | `WaitingCard` + `WaitingSection` — pending order cards with Kiểm tra toggle + 3 action buttons (disabled while loadingIds) | ⬜ | `Spec_9 §2.4` | `wireframes/overview.md ZoneB` |
| 9-5 | FE | `PrepPanel` — conditional panel (checkedTableIds.size > 0), collapsible per-table sections + Tổng cần làm summary sorted by remaining qty desc | ⬜ | `Spec_9 §2.5` | `wireframes/overview.md ZoneC` |
| 9-6 | FE | `OrderDetail` — progress bar + 3 mini counters + item list with status dots + Hoàn thành (ready→delivered) / Huỷ / Kiểm tra buttons | ⬜ | `Spec_9 §2.6` | `wireframes/overview.md ZoneE` |
| 9-7 | FE | `TableCard` + `TableGrid` — urgency border (gray/orange/yellow/red), occupied-first sort vi-VN locale, empty state icon | ⬜ | `Spec_9 §2.3 §2.6` | `wireframes/overview.md ZoneD` |
| 9-8 | FE | `overview/page.tsx` — assemble all zones, flip `USE_MOCK=false`, wire `useOverviewWS`, 30s timer tick for urgency recompute | ⬜ | `Spec_9 §2` | `wireframes/overview.md` |

---

## Phase 10 — Restaurant Summary Dashboard

> **Spec:** `docs/spec/Spec_10_Summary_Dashboard.md` (to be written before 10-3)
> **Wireframe:** `docs/fe/wireframes/summary.md` · **Excalidraw:** `docs/fe/wireframes/summary.excalidraw`
> **Dependency:** Phase 4 ✅ · Phase 8 ✅ · Phase 9 (can run in parallel)
> **Route:** `/admin/summary` · **Role:** Manager+
> **Goal:** Single page showing customers served, dishes sold, staff performance, and ingredient stock alerts. New DB tables for ingredient tracking.

### Step order (7-step workflow applies to each task)

```
Step 0 (DONE): Wireframe drawn → docs/fe/wireframes/summary.excalidraw
Step 1: DB migration (10-1)
Step 2: sqlc generate (10-2)
Step 3: BE analytics endpoints (10-3, 10-4, 10-5)
Step 4: FE API layer (10-6)
Step 5: FE shared state (10-7)
Step 6: FE components (10-8 → 10-12)
Step 7: FE page assembly (10-13, 10-14)
```

### Backend — DB + API

| ID | Domain | Task | Status | spec_ref | draw_ref |
|---|---|---|---|---|---|
| 10-1 | BE | Migration `009_ingredients.sql` — `ingredients(id,name,unit,current_stock,min_stock,cost_per_unit)` + `product_ingredients(product_id,ingredient_id,qty_used)` + `stock_movements(id,ingredient_id,type ENUM('in','out','adjustment'),quantity,note,created_by)` | ✅ | `Spec_10 §2.1` | — |
| 10-2 | BE | Raw SQL repos used instead of sqlc (staff_repo pattern) — `analytics_repo.go` + `ingredient_repo.go` | ✅ | `Spec_10 §2.1` | — |
| 10-3 | BE | `analytics_service.go` + `analytics_handler.go` — `GET /api/v1/admin/summary?range=`, `GET /api/v1/admin/top-dishes?limit=&range=`, `GET /api/v1/admin/staff-performance?range=` | ✅ | `Spec_10 §2.2` | — |
| 10-4 | BE | `ingredient_service.go` + `ingredient_handler.go` — CRUD ingredients + `GET /api/v1/admin/ingredients/low-stock` + `POST /api/v1/admin/stock-movements` | ✅ | `Spec_10 §2.3` | — |
| 10-5 | BE | Wired routes in `main.go` — all under `/api/v1/admin/` with Manager+ auth middleware | ✅ | `Spec_10 §2.4` | — |

### Frontend — Components

| ID | Domain | Task | Status | spec_ref | draw_ref |
|---|---|---|---|---|---|
| 10-6 | FE | `admin.api.ts` — add `getSummary`, `getTopDishes`, `getStaffPerformance`, `getLowStock`, `postStockMovement` | ✅ | `Spec_10 §1.1` | `wireframes/summary.md ZoneA` |
| 10-7 | FE | `summary.store.ts` — Zustand `summaryRange` atom (today/week/month) + `RangeSelector` toggle button | ✅ | `Spec_10 §1.1` | `wireframes/summary.md ZoneA` |
| 10-8 | FE | `SummaryKPICards` — 4 stat cards with skeleton loading, range-aware | ✅ | `Spec_10 §1.2` | `wireframes/summary.md ZoneA` |
| 10-9 | FE | `TopDishesList` — ranked list top 5, horizontal % bar, revenue per dish | ✅ | `Spec_10 §1.3` | `wireframes/summary.md ZoneB` |
| 10-10 | FE | `StaffPerfTable` — sortable table, chef rows show `—` for revenue | ✅ | `Spec_10 §1.4` | `wireframes/summary.md ZoneC` |
| 10-11 | FE | `StockAlertList` — 🔴/🟡 rows, stock bar, filter ≤ min_stock * 1.2 | ✅ | `Spec_10 §1.5` | `wireframes/summary.md ZoneD` |
| 10-12 | FE | `StockInModal` — RHF+Zod, readonly ingredient, POST stock-movement, invalidate on success | ✅ | `Spec_10 §1.6` | `wireframes/summary.md ZoneE` |
| 10-13 | FE | `summary/page.tsx` assembled + "Tổng kết" + "Kho nguyên liệu" tabs added to `admin/layout.tsx` | ✅ | `Spec_10 §1` | `wireframes/summary.md` |
| 10-14 | FE | `/admin/ingredients/page.tsx` — full list with stock bar, status badge, Nhập/Xuất + Sửa + Xóa (admin) | ✅ | `Spec_10 §1.7` | `wireframes/summary.md ZoneD` |

### AC (Acceptance Criteria)

| # | Kịch Bản | Kết Quả Mong Đợi |
|---|---|---|
| AC-10-1 | Manager mở /admin/summary | Thấy 4 KPI cards với số liệu hôm nay |
| AC-10-2 | Chuyển sang "Tuần này" | Tất cả 4 cards + Top Dishes + Staff cập nhật theo range mới |
| AC-10-3 | Top Dishes hiển thị | 5 món bán chạy, bar width tỉ lệ % đúng |
| AC-10-4 | Staff table hiển thị | Chef role hiện `—` cho cột doanh thu |
| AC-10-5 | Có nguyên liệu dưới min | StockAlertList hiện dòng đỏ, nút Nhập hàng visible |
| AC-10-6 | Click Nhập hàng | Modal mở, tên nguyên liệu pre-filled, không thể chỉnh sửa |
| AC-10-7 | Nhập số lượng + confirm | POST thành công, modal đóng, danh sách stock reload |
| AC-10-8 | Nguyên liệu đủ hàng | Không hiện trong StockAlertList |
| AC-10-9 | Non-manager truy cập | RoleGuard chặn, hiện "Không có quyền truy cập" |

---

## Phase UX — Customer Order Flow Improvements

> **Dependency:** Phase 5 ✅ · Ad-hoc fixes requested post-delivery

| ID | Type | Mô Tả | Status | Spec Ref |
|---|---|---|---|---|
| UX-1 | FE | `order/[id]/page.tsx` + `cart.ts` — "Thêm món" button: restores `tableId` + saves `activeOrderId`, navigates to /menu | ✅ | — |
| UX-2 | FE | `CartDrawer.tsx` + `cart.ts` — `activeOrderId` field in cart store; "Xem đơn hàng" button in drawer header when active order exists | ✅ | — |
| UX-3 | BE+FE | `order_service.go` — inject `tableRepo`, add `table_name` to `OrderDetails`; `order/[id]/page.tsx` — show `Bàn {table_name}` (human-readable) not UUID; "Mang về" for online orders | ✅ | — |

---

## Critical Rules (Never Forget)

| Rule | Detail |
|---|---|
| No localStorage for tokens | Access token in Zustand memory only. Refresh token in httpOnly cookie. |
| No hardcoded colors | Use Tailwind classes (`text-orange-500`) not `#FF7A1A` |
| No hardcoded env vars | Always `os.Getenv()` in Go, `process.env.` in Next.js |
| Verify HMAC first | Payment webhooks: signature check is FIRST operation, before any DB access |
| Idempotent webhooks | Check `payment.status` before updating — gateways call multiple times |
| UUID strings not integers | All IDs are `string` in TypeScript, `string` in Go (CHAR(36)) |
| Correct field names | `price` not `base_price` · `image_path` not `image_url` · `created_by` not `staff_id` · `gateway_data` not `webhook_payload` · payment status `completed` not `success` |
| total_amount drift | Call `recalculateTotalAmount()` after EVERY order_items mutation |
| No order_items.status column | Derive from `qty_served` (0=pending, 0<x<qty=preparing, x=qty=done) |
| Payment only when ready | POST /payments must reject if `order.status ≠ 'ready'` |
| 1 table 1 active order | Check before INSERT into orders |
| Soft delete everywhere | `deleted_at` — never hard DELETE. All queries: `WHERE deleted_at IS NULL` |
