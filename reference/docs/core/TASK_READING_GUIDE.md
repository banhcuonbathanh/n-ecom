# Task Reading Guide — Docs Required Per Task

> **Purpose:** Before starting any task, read every doc listed under it. No skipping.
> **Process:** After reading, follow `docs/IMPLEMENTATION_WORKFLOW.md` (7 steps: READ → PLAN → ALIGN → IMPLEMENT → SELF-REVIEW → TEST → DONE).
> **Source of truth for task status:** `docs/TASKS.md`

---

## Phase 1 — DB Migrations

---

### Task P1-8 — Run migration `008_order_groups.sql`
**File:** `be/migrations/008_order_groups.sql`
**Status:** ⬜

**Docs to read before starting:**
- `docs/task/task1_database/Ver 2/008_order_groups.sql.md` — migration spec (adds `group_id CHAR(36) NULL` + index to `orders`)
- `docs/be/DB_SCHEMA_SUMMARY.md` — verify `orders` table field names before altering

**Key concern:** Migration is additive (nullable column + index) — safe to run on existing data. Verify `goose` version tag matches existing migration sequence.

---

## Phase 4 — Backend Implementation

---

### Task 4.1-6 — `be/internal/handler/auth_handler.go`
**Status:** ⬜ — MUST BE DONE FIRST (blocks all of P4 + P5)

**Docs to read before starting:**
- `docs/spec/Spec1_Auth_Updated_v2.md` — all 5 endpoints + AC (POST /login, POST /refresh, POST /logout, GET /me, POST /guest)
- `docs/contract/API_CONTRACT_v1.2.md` — endpoint signatures, request/response shapes
- `docs/contract/ERROR_CONTRACT_v1.1.md` — error format `{"error":"AUTH_001","message":"..."}`
- `docs/be/BE_SYSTEM_GUIDE.md` §10 Epic BE-2 — handler code patterns, DI wiring

**Key concerns:**
- `POST /login` sets httpOnly cookie (refresh token) + returns access token in body
- Wrong username and wrong password MUST return the same error (no username enumeration)
- Rate limit: 6th failed login → 429 (check auth_service.go for existing logic)

---

### Task 4.1-AC — Verify Spec1 Acceptance Criteria
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec1_Auth_Updated_v2.md` — full AC checklist
- `docs/contract/ERROR_CONTRACT_v1.1.md` — confirm every error response matches contract

**Key concerns:**
- Wrong-password and wrong-username return same error ✓
- 6th login → 429 ✓
- Dual sessions (two devices logged in simultaneously) ✓
- Single logout (only current session invalidated) ✓
- Admin deactivate → 401 on next request ✓
- `is_active` Redis cache hit (not DB hit) ✓
- Error format exactly `{"error":"AUTH_001","message":"..."}` ✓

---

### Task 4.2-1 — `be/internal/repository/product_repo.go`
**Status:** ⬜ — requires 4.1 auth middleware working

**Docs to read before starting:**
- `docs/be/DB_SCHEMA_SUMMARY.md` — product/category/topping/combo field names (`price` not `base_price`, `image_path` not `image_url`)
- `docs/spec/Spec_2_Products_API_v2_CORRECTED.md` — which sqlc queries are needed
- `docs/be/BE_SYSTEM_GUIDE.md` — repository layer rules (wrap all sqlc, no business logic here)

**Key concerns:**
- Wrap every sqlc query — never call `db.*` directly from service layer
- All queries must filter `WHERE deleted_at IS NULL` (soft delete)

---

### Task 4.2-2 — `be/internal/service/product_service.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_2_Products_API_v2_CORRECTED.md` — CRUD rules, cache TTL, invalidation triggers
- `docs/core/MASTER_v1.2.md §3` — RBAC: which roles can write (Manager+ = role value 4+)
- `docs/be/DB_SCHEMA_SUMMARY.md` — field name verification
- `docs/be/BE_SYSTEM_GUIDE.md` — service layer rules (no gin, no DB calls, use repo)

**Key concerns:**
- Redis cache TTL = 5 min on every read
- Cache invalidated on every write (create/update/delete)
- Soft delete: set `deleted_at`, never hard DELETE

---

### Task 4.2-3 — `be/internal/handler/product_handler.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_2_Products_API_v2_CORRECTED.md` — all 20+ endpoints + AC
- `docs/contract/API_CONTRACT_v1.2.md` — endpoint signatures
- `docs/contract/ERROR_CONTRACT_v1.1.md` — error codes for product domain
- `docs/core/MASTER_v1.2.md §3` — RBAC: GET endpoints are public; POST/PATCH/DELETE require `RequireRole(4)` (Manager+)
- `docs/be/BE_SYSTEM_GUIDE.md` — handler patterns, DI wiring

**Key concerns:**
- Public GET endpoints: no auth middleware
- Mutating endpoints: auth middleware + RBAC middleware applied
- `is_available` filter on public list endpoint

---

### Task 4.2-AC — Verify Spec2 Acceptance Criteria
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_2_Products_API_v2_CORRECTED.md` — full AC checklist
- `docs/be/DB_SCHEMA_SUMMARY.md` — field name cross-check

**Key concerns:**
- `price` field present (not `price_delta`) ✓
- `category_id` + `sort_order` in combos ✓
- Soft delete working ✓
- `is_available` filter working ✓
- Redis invalidated on write ✓
- IDs are UUID strings ✓
- `image_path` is relative path ✓

---

### Task 4.3-1 — `be/internal/repository/order_repo.go`
**Status:** ⬜ — requires 4.2 products working

**Docs to read before starting:**
- `docs/be/DB_SCHEMA_SUMMARY.md` — orders/order_items field names (no `order_items.status` column — derive from `qty_served`)
- `docs/spec/Spec_4_Orders_API.md` — which queries are needed
- `docs/be/BE_SYSTEM_GUIDE.md` — repository layer rules

**Key concerns:**
- `order_items` has NO `status` column — derive: `qty_served=0` → pending, `0<qty_served<qty` → preparing, `qty_served=qty` → done
- All queries filter `WHERE deleted_at IS NULL`

---

### Task 4.3-2 — `be/internal/service/order_service.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_4_Orders_API.md` — full order lifecycle, combo expansion, state machine, cancel rule
- `docs/core/MASTER_v1.2.md §4` — business rules: 1-table-1-active, 30% cancel threshold, `recalculateTotalAmount()` call requirement
- `docs/core/MASTER_v1.2.md §5` — realtime: WS `new_order` on create, SSE on status change
- `docs/be/DB_SCHEMA_SUMMARY.md` — orders + order_items field names
- `docs/be/BE_SYSTEM_GUIDE.md` — service patterns, transaction rules

**Key concerns:**
- 1-table-1-active-order check BEFORE INSERT
- Combo expansion runs inside a DB transaction (parent item + all sub-items)
- `order_seq` comes from Redis INCR (not DB sequence)
- `recalculateTotalAmount()` called after EVERY order_items mutation
- Cancel: `<30%` served → allow; `≥30%` → 422

---

### Task 4.3-3 — `be/internal/sse/handler.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_4_Orders_API.md` — SSE event shapes, which events are sent
- `docs/core/MASTER_v1.2.md §5` — SSE config: headers, heartbeat interval (15s), backoff settings
- `docs/contract/API_CONTRACT_v1.2.md §10` — SSE endpoint signature

**Key concerns:**
- Headers: `Content-Type: text/event-stream`, `X-Accel-Buffering: no`, `Cache-Control: no-cache`
- Send initial state event on connect
- 15s heartbeat (comment line `: heartbeat`)
- Redis pub/sub subscribe on connect, unsubscribe on disconnect

---

### Task 4.3-4 — `be/internal/handler/order_handler.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_4_Orders_API.md` — all endpoints + AC
- `docs/contract/API_CONTRACT_v1.2.md` — endpoint signatures
- `docs/contract/ERROR_CONTRACT_v1.1.md` — order error codes
- `docs/be/BE_SYSTEM_GUIDE.md` — handler patterns

**Key concerns:**
- Customer can only GET their own order (visibility check in handler or service)
- SSE endpoint `GET /orders/:id/events` — delegate to `sse/handler.go`
- State machine: invalid transitions must be rejected at service layer (not handler)

---

### Task 4.3-5 — `be/internal/service/group_service.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_4_Orders_API.md §12` — full group spec: CreateGroup, AddOrder, RemoveOrder, GetGroup, Disband, combined_status logic
- `docs/core/MASTER_v1.2.md §4` — business rules for group payment
- `docs/be/DB_SCHEMA_SUMMARY.md` — `orders.group_id` field (added in migration 008)

**Key concerns:**
- Validate all order_ids are active AND ungrouped before assigning `group_id`
- `combined_status` logic: computed from all orders in group
- RemoveOrder sets `group_id = NULL`

---

### Task 4.3-6 — `be/internal/handler/group_handler.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_4_Orders_API.md §12` — group endpoint definitions
- `docs/contract/API_CONTRACT_v1.2.md` — endpoint signatures
- `docs/contract/ERROR_CONTRACT_v1.1.md` — error codes

**Key concerns:**
- `POST /payments/group/:id` — triggers group payment, validate group exists and all orders are ready

---

### Task 4.3-7 — `be/internal/sse/group_handler.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_4_Orders_API.md §12.4` — group SSE spec
- `docs/core/MASTER_v1.2.md §5` — SSE config

**Key concerns:**
- Query all order IDs in group → subscribe ALL Redis channels simultaneously
- Send full group snapshot on every event (not partial update)

---

### Task 4.3-AC — Verify Spec4 Acceptance Criteria
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_4_Orders_API.md` — AC checklist (including AC-G1 through AC-G8 for groups)
- `docs/core/MASTER_v1.2.md §4` — business rule verification

**Key concerns:**
- Combo expansion creates parent + sub-items ✓
- 1-table-1-active → 409 ✓
- Invalid state transition rejected ✓
- Chef click → SSE event to customer ✓
- Cancel <30% succeeds, ≥30% → 422 ✓
- Customer cannot see other orders ✓
- WS `new_order` on create ✓
- SSE heartbeat every 15s ✓

---

### Task 4.4-1 — `be/internal/websocket/hub.go`
**Status:** ⬜ — requires 4.3 orders working

**Docs to read before starting:**
- `docs/core/MASTER_v1.2.md §5` — WS config: ping/pong intervals, message types
- `docs/spec/Spec_4_Orders_API.md` — what events the hub must broadcast
- `docs/be/BE_SYSTEM_GUIDE.md` — concurrency patterns for hub

**Key concerns:**
- `sync.RWMutex` on client map (read lock for broadcasts, write lock for register/unregister)
- Ping every 30s, pong deadline 10s
- `Run()` goroutine is the single point of truth — never mutate client map outside it

---

### Task 4.4-2 — `be/internal/websocket/client.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/core/MASTER_v1.2.md §5` — WS deadlines
- `docs/be/BE_SYSTEM_GUIDE.md` — client pump patterns

**Key concerns:**
- `readPump`: read deadline 60s, pong handler resets deadline
- `writePump`: write deadline 10s per message
- Always call `hub.Unregister` on disconnect

---

### Task 4.4-3 — `be/internal/websocket/handler.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/core/MASTER_v1.2.md §5 + §6` — WS auth via `?token=` query param (browser WS API cannot set headers)
- `docs/contract/API_CONTRACT_v1.2.md` — WS endpoint signatures
- `docs/be/BE_SYSTEM_GUIDE.md` — upgrade pattern

**Key concerns:**
- Auth via `?token=` query param ONLY (not Authorization header — browser WS limitation)
- Validate JWT before upgrading connection
- Register client with Hub after upgrade

---

### Task 4.4-4 — Register WS routes in `be/cmd/server/main.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/contract/API_CONTRACT_v1.2.md` — WS endpoint paths
- `docs/core/MASTER_v1.2.md §3` — RBAC: `/ws/kds` requires Chef+, `/ws/orders-live` and `/ws/payments` require Cashier+

**Key concerns:**
- Three WS routes: `WS /api/v1/ws/kds`, `WS /api/v1/ws/orders-live`, `WS /api/v1/ws/payments`
- RBAC middleware applied at route level

---

### Task 4.5-1 — `be/internal/payment/vnpay.go`
**Status:** ⬜ — requires 4.3 orders working. ⚠️ Real money — confirm before running

**Docs to read before starting:**
- `docs/spec/Spec_5_Payment_Webhooks.md` — VNPay: URL creation params, HMAC-SHA512 verification algorithm (remove hash key → sort → concat → compare)
- `docs/contract/ERROR_CONTRACT_v1.1.md` — payment error codes

**Key concerns:**
- HMAC-SHA512: remove `vnp_SecureHash` and `vnp_SecureHashType` from params BEFORE sorting
- Sort keys alphabetically, concat as query string, hash with secret key
- Verification is ALWAYS first operation — before any DB access

---

### Task 4.5-2 — `be/internal/payment/momo.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_5_Payment_Webhooks.md` — MoMo: CreatePayment params, HMAC-SHA256 verification signature string format

**Key concerns:**
- Signature string field order is fixed (not sorted) — follow spec exactly
- Test with MoMo sandbox before production

---

### Task 4.5-3 — `be/internal/payment/zalopay.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_5_Payment_Webhooks.md` — ZaloPay: CreateOrder params, HMAC-SHA256 verification

**Key concerns:**
- ZaloPay `app_trans_id` format: `yymmdd_orderid`
- Callback verification: hash `data` field with key2 (not key1)

---

### Task 4.5-4 — `be/internal/repository/payment_repo.go` + `be/internal/service/payment_service.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_5_Payment_Webhooks.md` — payment lifecycle, idempotency requirement
- `docs/be/DB_SCHEMA_SUMMARY.md` — payments table fields (`gateway_data` not `webhook_payload`, status `completed` not `success`)
- `docs/core/MASTER_v1.2.md §4` — business rule: payment only allowed when `order.status = 'ready'`

**Key concerns:**
- Idempotency check: read `payment.status` before any update
- `gateway_data` stores raw webhook payload (JSON blob)
- Status values: `pending`, `completed`, `failed` — never `success`

---

### Task 4.5-5 — `be/internal/handler/payment_handler.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_5_Payment_Webhooks.md` — all endpoints + webhook AC
- `docs/contract/API_CONTRACT_v1.2.md` — endpoint signatures
- `docs/contract/ERROR_CONTRACT_v1.1.md` — payment error codes
- `docs/be/BE_SYSTEM_GUIDE.md` — handler patterns

**Key concerns:**
- Webhook handlers: HMAC verification is the VERY FIRST operation (before `c.ShouldBindJSON`)
- VNPay webhook response format is different from standard JSON (VNPay-specific)
- `POST /payments`: reject if `order.status ≠ 'ready'`
- `PATCH /payments/:id/proof`: file upload, store `object_path`

---

### Task 4.5-6 — `be/internal/jobs/payment_timeout.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_5_Payment_Webhooks.md` — payment timeout rules
- `docs/core/MASTER_v1.2.md §5` — Redis keyspace notification config

**Key concerns:**
- Listen for Redis keyspace events (`KEA` config required)
- On key expiry: mark payment `pending → failed`, publish WS event
- Wrap in goroutine with `defer recover()` to prevent crash

---

### Task 4.5-AC — Verify Spec5 Acceptance Criteria
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_5_Payment_Webhooks.md` — full AC checklist

**Key concerns:**
- Payment rejected when order ≠ ready ✓
- COD → immediate `completed` ✓
- QR returns `qr_code_url` ✓
- Bad HMAC → rejected, no DB change ✓
- Duplicate webhook → no-op ✓
- Amount mismatch → reject ✓
- Raw webhook stored in `gateway_data` ✓
- WS broadcasts `payment_success` ✓

---

### Task 4.6-1 — `GET /api/v1/tables/qr/:token`
**Status:** ⬜ — requires 4.1 auth working + Spec6 written

**Docs to read before starting:**
- `docs/spec/Spec_6_QR_POS.md` — QR token decode flow, table lookup logic
- `docs/contract/API_CONTRACT_v1.2.md` — endpoint signature
- `docs/be/DB_SCHEMA_SUMMARY.md` — tables table field names

**Key concerns:**
- Query: `WHERE qr_token = ? AND is_active = 1 AND deleted_at IS NULL`
- Return: `table_id`, `name`, `capacity`
- 404 if token not found or table inactive

---

### Task 4.6-2 — `POST /api/v1/files/upload`
**Status:** ⬜

**Docs to read before starting:**
- `docs/contract/API_CONTRACT_v1.2.md` — upload endpoint signature
- `docs/contract/ERROR_CONTRACT_v1.1.md` — FILE_001 (size), FILE_002 (mime type)

**Key concerns:**
- Max size: 10MB → FILE_001 if exceeded
- Allowed mime: `image/*` or `application/pdf` → FILE_002 if wrong
- Create orphan record on upload (cleanup job handles stale ones)
- Return `{id, object_path}` — never full URL

---

### Task 4.6-3 — `be/internal/jobs/file_cleanup.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/be/BE_SYSTEM_GUIDE.md` — job/goroutine patterns

**Key concerns:**
- Ticker every 6h
- Delete orphan file records older than 24h
- Also delete actual files from storage
- Wrap in goroutine with `defer recover()`

---

### Task 4.6-4 — Wire all routes + DI in `be/cmd/server/main.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/be/BE_SYSTEM_GUIDE.md` — full DI wiring order, graceful shutdown pattern
- `docs/contract/API_CONTRACT_v1.2.md` — complete route list

**Key concerns:**
- Graceful shutdown: listen for SIGTERM, drain connections, close DB + Redis
- Health check endpoint: `GET /health` returns 200 (no auth)
- Middleware order: CORS → auth → RBAC (never reversed)

---

## Phase 5 — Frontend Implementation

---

### Task 5.1-1 — `fe/src/lib/api-client.ts`
**Status:** ⬜ — requires P4.1 fully done

**Docs to read before starting:**
- `docs/spec/Spec1_Auth_Updated_v2.md` — FE AC: refresh flow, 401 retry, redirect behavior
- `docs/core/MASTER_v1.2.md §6` — JWT: access token in memory, refresh via httpOnly cookie
- `docs/fe/FE_SYSTEM_GUIDE.md` — api-client patterns, interceptor logic

**Key concerns:**
- `withCredentials: true` (sends httpOnly cookie automatically)
- Request interceptor: attach `Bearer {accessToken}` from Zustand
- Response interceptor: 401 → call refresh → retry once → if 2nd 401 → `clearAuth()` + redirect `/login`
- Never read or write tokens to localStorage

---

### Task 5.1-2 — `fe/src/features/auth/auth.store.ts`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec1_Auth_Updated_v2.md` — what's stored in auth state
- `docs/fe/FE_SYSTEM_GUIDE.md` — Zustand store patterns

**Key concerns:**
- `accessToken`: in-memory ONLY (Zustand), never localStorage
- `user`: role, id, username stored for RBAC checks
- `setAuth(user, token)`, `clearAuth()` — these are the only mutations

---

### Task 5.1-3 — `fe/src/features/auth/auth.api.ts`
**Status:** ⬜

**Docs to read before starting:**
- `docs/contract/API_CONTRACT_v1.2.md` — auth endpoint signatures (POST /login, POST /refresh, POST /logout, GET /me)
- `docs/spec/Spec1_Auth_Updated_v2.md` — request/response shapes

**Key concerns:**
- All calls go through `api-client.ts` (not raw fetch/axios)
- `refreshToken()` called by interceptor — must NOT trigger another 401 loop

---

### Task 5.1-4 — `fe/src/app/(auth)/login/page.tsx`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec1_Auth_Updated_v2.md` — login form AC, role-based redirect rules
- `docs/core/MASTER_v1.2.md §2` — design tokens: colors, font sizes (use Tailwind classes, no hex)
- `docs/core/MASTER_v1.2.md §3` — RBAC role values: chef → `/kds`, cashier → `/pos`, manager/admin → `/dashboard`, customer → `/menu`
- `docs/fe/FE_SYSTEM_GUIDE.md` — RHF + Zod form patterns

**Key concerns:**
- Zod schema: `username` min 3 chars, `password` min 6 chars
- Inline error on wrong credentials (below the field, not toast)
- Role-based redirect AFTER successful login

---

### Task 5.1-5 — `fe/src/components/guards/AuthGuard.tsx`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec1_Auth_Updated_v2.md` — silent session restore flow (F5 behavior)
- `docs/fe/FE_SYSTEM_GUIDE.md` — guard patterns

**Key concerns:**
- On mount: if no token in Zustand → call `GET /me` → if success → `setAuth()` → continue; if fail → redirect `/login`
- Show loading spinner while `GET /me` is in flight (no flash of content)

---

### Task 5.1-6 — `fe/src/components/guards/RoleGuard.tsx`
**Status:** ⬜

**Docs to read before starting:**
- `docs/core/MASTER_v1.2.md §3` — role hierarchy and numeric values
- `docs/fe/FE_SYSTEM_GUIDE.md` — guard patterns

**Key concerns:**
- Show a 403 page (not redirect) if role is insufficient
- Compare role values numerically (higher value = more permissions)

---

### Task 5.1-AC — Verify Spec1 FE Acceptance Criteria
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec1_Auth_Updated_v2.md` — FE AC section

**Key concerns:**
- Token never in localStorage (check DevTools → Application → Local Storage) ✓
- F5 → silent session restore (no redirect to login if session valid) ✓
- 401 → auto refresh → retry ✓
- 2nd 401 → redirect `/login` ✓
- Wrong role → 403 page (not redirect) ✓

---

### Task 5.2-1 — `fe/src/types/product.ts`
**Status:** ⬜ — requires 5.1 auth + 4.2 products API

**Docs to read before starting:**
- `docs/be/DB_SCHEMA_SUMMARY.md` — exact field names from DB (single source of truth)
- `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` — UI-facing product shape
- `docs/spec/Spec_2_Products_API_v2_CORRECTED.md` — API response shapes

**Key concerns:**
- NO `slug`, NO `base_price`, NO `image_url`, NO `price_delta`
- Use `price`, `image_path`
- All IDs are `string` (UUID), never `number`

---

### Task 5.2-2 — `fe/src/types/order.ts` + `fe/src/types/cart.ts`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_4_Orders_API.md` — order/order_item shapes
- `docs/be/DB_SCHEMA_SUMMARY.md` — field names

**Key concerns:**
- `itemStatus` is derived (no `status` column): `qty_served=0` → `pending`, `0<x<qty` → `preparing`, `x=qty` → `done`
- `CartItem` needs: `productId`, `name`, `price`, `qty`, `toppings[]`, `comboId?`

---

### Task 5.2-3 — `fe/src/store/cart.ts`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` — cart behavior: dedup, total, clear on order submit
- `docs/fe/FE_SYSTEM_GUIDE.md` — Zustand store patterns

**Key concerns:**
- `addItem`: if same `productId` + same toppings already in cart → increment qty (dedup)
- `total` is computed (sum of `item.price * qty + topping prices`)
- `setTableId` and `setPaymentMethod` stored in cart (needed at checkout)
- `clearCart()` called after successful `POST /orders`

---

### Task 5.2-4 — `fe/src/components/menu/CategoryTabs.tsx`
**Status:** ⬜

**Docs to read before starting:**
- `docs/core/MASTER_v1.2.md §2` — design tokens: active tab = `border-b-2 border-orange-500`
- `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` — category tab behavior

**Key concerns:**
- Sticky positioning (stays at top when scrolling)
- Horizontal scroll on mobile (no line wrap)
- Active state uses Tailwind class `border-orange-500` — not hex `#FF7A1A`

---

### Task 5.2-5 — `fe/src/components/menu/ProductCard.tsx`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` — card layout, badge rules
- `docs/core/MASTER_v1.2.md §2` — price color = `text-orange-500`
- `docs/be/DB_SCHEMA_SUMMARY.md` — `image_path` (not `image_url`)

**Key concerns:**
- `image_path` is a relative path — prefix with storage base URL for `<img src>`
- `formatVND(price)` for all price displays
- "Hết" badge shown when `!is_available` (disable "+Thêm" button too)

---

### Task 5.2-6 — `fe/src/components/menu/ToppingModal.tsx`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` — topping modal behavior + price calculation
- `docs/be/DB_SCHEMA_SUMMARY.md` — topping field: `price` (not `price_delta`)

**Key concerns:**
- Footer total = `product.price + sum(selected topping prices)`
- `formatVND()` on all price displays
- Topping `price` field — never `price_delta`

---

### Task 5.2-7 — `fe/src/components/menu/ComboModal.tsx`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` — combo modal layout
- `docs/spec/Spec_2_Products_API_v2_CORRECTED.md` — combo_items shape (`category_id`, `sort_order`, `quantity`)

**Key concerns:**
- Show combo image + all combo_items with their quantities
- Confirm adds combo as a single cart item (not individual products)

---

### Task 5.2-8 — `fe/src/components/menu/CartDrawer.tsx`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` — drawer layout, stepper behavior
- `docs/core/MASTER_v1.2.md §2` — design tokens

**Key concerns:**
- Slide in from right
- Qty stepper: min 1 (use `removeItem` when reaching 0)
- Total uses `formatVND()`
- "Thanh toán" button navigates to `/checkout`

---

### Task 5.2-9 — `fe/src/app/(shop)/menu/page.tsx`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` — page AC
- `docs/fe/FE_SYSTEM_GUIDE.md` — TanStack Query patterns for server state

**Key concerns:**
- TanStack Query for product list (not Zustand — server state)
- CategoryTabs filters shown products by category
- CartDrawer overlay (not separate page)

---

### Task 5.2-10 — `fe/src/app/table/[tableId]/page.tsx`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_6_QR_POS.md` — QR scan → guest auth flow
- `docs/contract/API_CONTRACT_v1.2.md` — `POST /auth/guest` signature
- `docs/fe/FE_SYSTEM_GUIDE.md` — token storage rules

**Key concerns:**
- `POST /auth/guest` → store access token in Zustand (NOT localStorage)
- `cartStore.setTableId(tableId)` after auth
- Redirect to `/menu`

---

### Task 5.3-1 — `fe/src/app/(shop)/checkout/page.tsx`
**Status:** ⬜ — requires 5.2 cart + 4.3 orders API

**Docs to read before starting:**
- `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` — checkout form AC, POST /orders payload shape
- `docs/contract/API_CONTRACT_v1.2.md` — `POST /orders` request body
- `docs/fe/FE_SYSTEM_GUIDE.md` — RHF + Zod patterns

**Key concerns:**
- Guard: empty cart → redirect `/menu`
- POST /orders body has `source` field but NO `payment_method` field
- Zod schema: `customer_name`, `phone` regex `^0[0-9]{9}$`, `note?`, `payment_method` enum
- On success: `clearCart()` → redirect `/order/${id}`

---

### Task 5.3-2 — `fe/src/hooks/useOrderSSE.ts`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` — SSE reconnect AC, error banner threshold
- `docs/core/MASTER_v1.2.md §5` — SSE config: maxAttempts=5, base=1s, max=30s
- `docs/contract/API_CONTRACT_v1.2.md §10` — SSE endpoint

**Key concerns:**
- Auth via `Authorization: Bearer {token}` header — NOT query param (SSE endpoint, not WS)
- Exponential backoff: `min(base * 2^attempt, maxRetry)` — base=1s, max=30s
- Set `connectionError = true` after 3 consecutive fails
- SSE via `EventSource` does not support custom headers — use `fetch` with `ReadableStream` instead

---

### Task 5.3-3 — `fe/src/app/(shop)/order/[id]/page.tsx`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` — order tracking page AC, progress bar formula
- `docs/core/MASTER_v1.2.md §4` — cancel rule: <30% served

**Key concerns:**
- Progress bar: `Math.round((totalServed / totalQty) * 100)%`
- Cancel button: only shown if `qty_served/qty < 0.3 && status !== 'delivered'`
- Show confirm modal before DELETE /orders/:id
- `ConnectionErrorBanner` shown after 3 SSE fails
- Item status derived from `qty_served` (no status field)

---

### Task 5.3-4 — Shared components: `StatusBadge`, `ConnectionErrorBanner`, `EmptyState`
**Status:** ⬜

**Docs to read before starting:**
- `docs/core/MASTER_v1.2.md §2` — design tokens: badge colors mapped to Tailwind classes
- `docs/fe/FE_SYSTEM_GUIDE.md` — component patterns

**Key concerns:**
- StatusBadge: use Tailwind color classes, not hex
- All text in Vietnamese

---

### Task 5.3-AC — Verify Spec3 Checkout + Tracking Acceptance Criteria
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` — full AC checklist

**Key concerns:**
- POST payload has NO `payment_method` field + HAS `source` field ✓
- SSE uses Bearer header (not query param) ✓
- Token from Zustand (not localStorage) ✓
- Progress bar updates real-time ✓
- Cancel button only when <30% served ✓
- ConnectionErrorBanner after 3 SSE fails ✓
- All prices use `formatVND()` ✓

---

### Task 5.4-1 — `fe/src/app/(dashboard)/kds/page.tsx`
**Status:** ⬜ — requires 4.4 WebSocket hub working

**Docs to read before starting:**
- `docs/spec/Spec_4_Orders_API.md` — KDS FE section: card layout, color thresholds, item click behavior
- `docs/core/MASTER_v1.2.md §2` — dark bg token (KDS uses dark theme)
- `docs/core/MASTER_v1.2.md §5` — WS config: reconnect behavior, `?token=` query param
- `docs/fe/FE_SYSTEM_GUIDE.md` — WS hook patterns

**Key concerns:**
- WS auth via `?token={accessToken}` query param (browser WS API limitation)
- Cards: elapsed time color — `<10min` normal, `10–20min` yellow border, `>20min or flagged` red border
- Show sub-items only (not combo header) on KDS cards
- Sound alert on `new_order` event (Web Audio API)
- Item click → PATCH status cycle → optimistic UI update

---

### Task 5.5-1 — `fe/src/app/(dashboard)/pos/page.tsx`
**Status:** ⬜ — requires 4.5 payments backend working

**Docs to read before starting:**
- `docs/spec/Spec_5_Payment_Webhooks.md` — POS FE section
- `docs/core/MASTER_v1.2.md §3` — RBAC: Cashier+ required
- `docs/fe/FE_SYSTEM_GUIDE.md` — RoleGuard usage

**Key concerns:**
- `RoleGuard` wraps page (Cashier+)
- POST /orders: `customer_name="Khách tại quán"`, `customer_phone="0000000000"`
- Navigate to payment page when `order.status === 'ready'`

---

### Task 5.5-2 — `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_5_Payment_Webhooks.md` — cashier payment page FE AC
- `docs/core/MASTER_v1.2.md §5` — WS: subscribe `payment_success` event
- `docs/fe/FE_SYSTEM_GUIDE.md` — WS hook + print patterns

**Key concerns:**
- Show QR image from `POST /payments` response `qr_code_url`
- Subscribe WS `payment_success` → toast → `window.print()` → redirect `/pos`
- Print CSS: `@media print { .no-print { display: none } }`
- COD button → immediate (no QR needed)
- Optional proof upload via `PATCH /payments/:id/proof`

---

## Phase 6 — DevOps / Infrastructure

---

### Task 6-1 — `.env.example`
**Status:** ⬜ — can run now (parallel with Phase 4)

**Docs to read before starting:**
- `docs/core/MASTER_v1.2.md §9` — complete list of all env vars (DB, Redis, JWT, Storage, VNPay, MoMo, ZaloPay, CORS, PORT)
- `docs/claude/CLAUDE_DEVOPS.md` — DevOps conventions

**Key concerns:**
- Every var must have a placeholder value + inline comment explaining format
- Never commit actual secrets — `.env.example` has fake values only

---

### Task 6-2 — `scripts/migrate.sh`
**Status:** ⬜

**Docs to read before starting:**
- `docs/claude/CLAUDE_DEVOPS.md` — migration script pattern

**Key concerns:**
- Wait loop: `mysqladmin ping` until MySQL ready (avoid race with compose startup)
- Run: `goose -dir /migrations mysql "$DB_DSN" up`
- Then `exec` the server binary (replace shell process, not subshell)

---

### Task 6-3 — `Caddyfile`
**Status:** ⬜

**Docs to read before starting:**
- `docs/claude/CLAUDE_DEVOPS.md` — Caddy config patterns
- `docs/contract/API_CONTRACT_v1.2.md` — path prefixes (`/api/*`, `/webhooks/*`)

**Key concerns:**
- `/api/*` and `/webhooks/*` → `backend:8080`
- Everything else → `frontend:3000`
- Caddy handles SSL auto-cert (no manual cert management)

---

### Task 6-4 — Update `docker-compose.yml`
**Status:** ⬜

**Docs to read before starting:**
- `docs/claude/CLAUDE_DEVOPS.md` — compose health check patterns

**Key concerns:**
- MySQL health check: `mysqladmin ping -h localhost -u root -p$$MYSQL_ROOT_PASSWORD`
- Redis health check: `redis-cli ping`
- Caddy service: ports 80 + 443
- `depends_on` ordering: db + redis must be healthy before be starts

---

### Task 6-5 — `.github/workflows/deploy.yml`
**Status:** ⬜

**Docs to read before starting:**
- `docs/claude/CLAUDE_DEVOPS.md` — CI/CD pipeline spec

**Key concerns:**
- Trigger: push to `main` only
- Steps: checkout → build images → push registry → SSH deploy → rollback step if deploy fails
- Rollback: `docker compose pull {previous-tag} && docker compose up -d`

---

### Task 6-6 — `README.md`
**Status:** ⬜

**Docs to read before starting:**
- `docs/claude/CLAUDE_DEVOPS.md` — what to document

**Key concerns:**
- Local dev: `docker compose up -d`
- Port map: BE=8080, FE=3000, MySQL=3306, Redis=6379, RedisInsight=8001
- Migration commands, sqlc generate, .env.example setup

---

## Phase 7 — Testing & Go-Live

---

### Task 7-1 — `be/internal/service/auth_service_test.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec1_Auth_Updated_v2.md` — AC that maps to test cases
- `be/internal/service/auth_service.go` — the code under test

**Test cases required:**
- `TestLogin_WrongPassword` — same error as wrong username
- `TestLogin_RateLimitAfter5Fails` — 6th attempt → rate limit error
- `TestMultiSessionLogin` — two devices logged in simultaneously
- `TestLogoutSingleSession` — only current token invalidated
- `TestAccountDisabledImmediate` — disabled account → 401 on next request
- `TestTokenRotation` — refresh returns new access token

---

### Task 7-2 — `be/internal/service/order_service_test.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_4_Orders_API.md` — AC that maps to test cases
- `docs/core/MASTER_v1.2.md §4` — business rules under test

**Test cases required:**
- `TestCreateOrder_ComboExpand` — combo creates parent + sub-items
- `TestCreateOrder_DuplicateTable` — 1-table-1-active → 409
- `TestCancelOrder_Under30Percent` — succeeds
- `TestCancelOrder_Over30Percent` — 422
- `TestItemStatusCycle` — qty_served progression
- `TestAutoReadyWhenAllItemsDone` — order auto-transitions to ready

---

### Task 7-3 — `be/internal/handler/payment_handler_test.go`
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_5_Payment_Webhooks.md` — webhook AC

**Test cases required:**
- `TestVNPayWebhook_ValidSignature` — processes and updates payment
- `TestVNPayWebhook_InvalidSignature` — rejects, no DB change
- `TestVNPayWebhook_Idempotent` — duplicate call is no-op
- `TestCreatePayment_OrderNotReady` — rejects when order.status ≠ ready

---

### Task 7-4 — `fe/src/store/cart.store.test.ts` + `fe/src/lib/utils.test.ts`
**Status:** ⬜

**Docs to read before starting:**
- `fe/src/store/cart.ts` — the store under test
- `fe/src/lib/utils.ts` — `formatVND()` and other utils

**Test cases required:**
- `TestAddSameItemIncreasesQty` — dedup logic
- `TestRemoveItem`
- `TestClearCart`
- `TestTotalCalculation` — includes topping prices
- `TestFormatVND` — correct Vietnamese dong formatting
- `TestFormatPercent`

---

### Task 7-5 — Integration test suite
**Status:** ⬜

**Docs to read before starting:**
- `docs/contract/API_CONTRACT_v1.2.md` — all endpoints to cover
- `docs/core/MASTER_v1.2.md §5` — SSE/WS reconnect behavior to test

**Key concerns:**
- Run against a real test DB (never mock the DB)
- Cover SSE reconnect with exponential backoff
- Cover WS reconnect

---

### Task 7-6 — `scripts/seed.sql`
**Status:** ⬜

**Docs to read before starting:**
- `docs/be/DB_SCHEMA_SUMMARY.md` — table schemas for seed data

**Key concerns:**
- 3+ categories, 10+ products, 5+ toppings, 2+ combos
- 4 staff accounts: chef/cashier/manager/admin with bcrypt-hashed passwords
- 5+ tables with valid `qr_token` values

---

### Task 7-7 — Payment sandbox testing
**Status:** ⬜

**Docs to read before starting:**
- `docs/spec/Spec_5_Payment_Webhooks.md` — sandbox test scenarios

**Key concerns:**
- Use ngrok to expose local webhook endpoints
- Test: full QR flow end-to-end
- Test: signature rejection (tampered params)
- Test: double-webhook idempotency (call webhook endpoint twice with same payload)
- Test: amount mismatch rejection

---

### Task 7-8 — `docs/UAT_Plan.md`
**Status:** ⬜

**Docs to read before starting:**
- `docs/requirements/BanhCuon_Project_Checklist.md` — AC per spec (one source for UAT criteria)
- All 7 Spec files — extract test cases per domain

**Key concerns:**
- Test cases mapped to Spec AC
- Stakeholder sign-off checklist
- Bug severity levels: P0 (system down), P1 (feature broken), P2 (minor)

---

### Task 7-9 — Compliance pages
**Status:** ⬜

**Docs to read before starting:**
- (No spec doc — standard requirements)

**Key concerns:**
- `/privacy-policy` page
- `/terms` page
- Cookie consent banner
- Verify PCI-DSS: card numbers never stored, never logged

---

### Task 7-10 — Go-Live
**Status:** ⬜

**Docs to read before starting:**
- `docs/claude/CLAUDE_DEVOPS.md` — deployment checklist

**Key concerns:**
- DNS A record → VPS IP
- Caddy SSL auto-cert (requires port 80 open for ACME challenge)
- All prod env vars set (never `.env` committed to git)
- `goose up` on prod DB before starting services
- Run seed, then test: login → create order → payment

---

### Task 7-11 — Monitoring
**Status:** ⬜

**Docs to read before starting:**
- `docs/claude/CLAUDE_DEVOPS.md` — monitoring spec

**Key concerns:**
- Error rate alert: >5% → notify
- Response time alert: >500ms → notify
- Log aggregation: Docker logs → Loki or CloudWatch

---

### Task 7-12 — Rollback plan
**Status:** ⬜

**Docs to read before starting:**
- `docs/claude/CLAUDE_DEVOPS.md`

**Key concerns:**
- Document: `docker pull {previous-image-tag} && docker compose up -d`
- Post-launch SLA: P0=4h, P1=24h, P2=72h
- Rollback procedure tested in staging before go-live

---

## Quick Reference — Docs by Domain

| Domain | Primary spec | Supporting docs |
|---|---|---|
| Auth (BE) | `docs/spec/Spec1_Auth_Updated_v2.md` | MASTER §3 §6, ERROR_CONTRACT, BE_SYSTEM_GUIDE |
| Auth (FE) | `docs/spec/Spec1_Auth_Updated_v2.md` | MASTER §6, FE_SYSTEM_GUIDE |
| Products | `docs/spec/Spec_2_Products_API_v2_CORRECTED.md` | MASTER §3, DB_SCHEMA, ERROR_CONTRACT |
| Menu UI | `docs/spec/Spec_3_Menu_Checkout_UI_v2.md` | MASTER §2, FE_SYSTEM_GUIDE |
| Orders (BE) | `docs/spec/Spec_4_Orders_API.md` | MASTER §4 §5, DB_SCHEMA, BE_SYSTEM_GUIDE |
| Orders (FE) | `docs/spec/Spec_4_Orders_API.md` | MASTER §5, FE_SYSTEM_GUIDE |
| Payments | `docs/spec/Spec_5_Payment_Webhooks.md` | MASTER §4, ERROR_CONTRACT, BE_SYSTEM_GUIDE |
| QR + POS | `docs/spec/Spec_6_QR_POS.md` | API_CONTRACT, DB_SCHEMA |
| Staff Mgmt | `docs/spec/Spec_7_Staff_Management.md` | MASTER §3, BE_SYSTEM_GUIDE |
| DevOps | `docs/claude/CLAUDE_DEVOPS.md` | MASTER §9 |
| DB schema | `docs/be/DB_SCHEMA_SUMMARY.md` | — |
| Error codes | `docs/contract/ERROR_CONTRACT_v1.1.md` | — |
| API signatures | `docs/contract/API_CONTRACT_v1.2.md` | — |

---

*BanhCuon System · Task Reading Guide · v1.0 · 2026-04-30*
