**🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN**
**CLAUDE CODE SESSION GUIDE**
Task Order & Doc Map  ·  v1.0  ·  Tháng 4/2026

**Purpose: **For every Claude Code session, follow this document top-to-bottom. Each task tells you: (1) the exact docs to paste into Claude Code, and (2) the correct order. Never start a phase before its dependencies are complete.

# 0 — Always Include (Every Session)
| Always Include In Every Session

These 3 docs go into every Claude Code prompt, regardless of task:

CLAUDE.md  — the map: pointers, code rules, current branch
MASTER.docx §4  — business rules: order, cancel, payment, inventory
ERROR_CONTRACT_v1.1.docx  — all error codes, response format, handler pattern

Then add the task-specific docs listed in each task below. |
| --- |

# 1 — Dependency Chain (Follow This Order)
Never skip phases. Each phase depends on the previous being complete.

| Resolve Issue #5 + Issue #7
        ↓
Phase 0  →  Write missing docs: API_CONTRACT v1.2, Spec 6, Spec 7
Phase 1  →  COMPLETE (all migrations done — optional 008 if Issue #5 = Approach A)
Phase 2  →  COMPLETE (all specs done — Spec 6 + 7 are Phase 0 tasks above)
        ↓
Phase 3  →  sqlc.yaml + query/*.sql files + project scaffolding
        ↓
Phase 4  →  Backend: 4.1 Auth → 4.2 Products → 4.3 Orders → 4.4 WS → 4.5 Payments → 4.6 Other
Phase 6  →  DevOps (can run PARALLEL with Phase 4)
        ↓
Phase 5  →  Frontend: 5.1 Auth → 5.2 Menu+Cart → 5.3 Checkout+SSE → 5.4 KDS → 5.5 POS
        ↓
Phase 7  →  Testing + UAT + Go-Live |
| --- |

# 2 — Blockers (Resolve FIRST — Before Any Code)
These 2 decisions block multiple phases. Nothing can proceed until they are resolved.
| #5 | Decide order_items status approach
Approach A: Add migration 008 with status ENUM ('pending','preparing','done') + flagged BOOLEAN column.
Approach B: Derive status from qty_served (0=pending, 0<x<qty=preparing, x=qty=done) — no migration needed.
Affects: Spec 3 TypeScript types, Spec 4 BE logic, KDS UI, all order_items sqlc queries.
Docs to give Claude:
005_orders.sql  — current order_items schema
Spec_4_Orders_API.docx  — KDS + item status logic
MASTER.docx §4.1  — order state machine |
| --- | --- |

| #7 | Define POST /auth/guest endpoint (QR customer auth)
Need to specify: token TTL, stored in refresh_tokens table or not, rate limit strategy.
Blocks: fe/app/table/[tableId]/page.tsx — the QR scan entry point is completely blocked without this.
Once resolved: add to API_CONTRACT v1.2, then BE Dev implements, then FE Dev can proceed.
Docs to give Claude:
API_CONTRACT.docx  — add the guest endpoint here once decided
Spec1_Auth_Updated_v2.docx  — auth patterns reference
001_auth.sql  — refresh_tokens schema to decide storage |
| --- | --- |

# 3 — Phase 0: Missing Documents to Write
| Phase 0 | Architecture & Documentation — 90% Complete | 2 MISSING |
| --- | --- | --- |

*These 2 documents are missing and block FE work. Write them before any coding starts.*

| 0.1 | Write API_CONTRACT.docx v1.2 — full endpoint table (ALL 6 specs) | FIRST |
| --- | --- | --- |
|  | Docs to give Claude Code: API_CONTRACT_v1.1.docx  — current version to extend — use as template Spec1_Auth_Updated_v2.docx  — auth endpoints Spec_2_Products_API_v2_CORRECTED.docx  — products endpoints Spec_4_Orders_API.docx  — orders endpoints + SSE Spec_5_Payment_Webhooks.docx  — payment endpoints + webhooks ERROR_CONTRACT_v1.1.docx  — error codes for each endpoint MASTER.docx §3  — RBAC roles — required for each endpoint's role column  Tip: Give Claude all 5 existing specs + current API_CONTRACT. Ask it to generate a complete endpoint table covering all specs with correct roles. Note: Must add: POST /auth/guest (Issue #7), GET /orders/:id/events (SSE), WS /ws/kds, WS /ws/orders-live | Docs to give Claude Code: API_CONTRACT_v1.1.docx  — current version to extend — use as template Spec1_Auth_Updated_v2.docx  — auth endpoints Spec_2_Products_API_v2_CORRECTED.docx  — products endpoints Spec_4_Orders_API.docx  — orders endpoints + SSE Spec_5_Payment_Webhooks.docx  — payment endpoints + webhooks ERROR_CONTRACT_v1.1.docx  — error codes for each endpoint MASTER.docx §3  — RBAC roles — required for each endpoint's role column  Tip: Give Claude all 5 existing specs + current API_CONTRACT. Ask it to generate a complete endpoint table covering all specs with correct roles. Note: Must add: POST /auth/guest (Issue #7), GET /orders/:id/events (SSE), WS /ws/kds, WS /ws/orders-live |

| 0.2 | Write Spec_6_QR_POS.docx — QR Tại Bàn + POS offline | HIGH |
| --- | --- | --- |
|  | Docs to give Claude Code: 003_tables.sql  — qr_token schema — CHAR(64), unique per table 005_orders.sql  — orders + table_id FK MASTER.docx §4.5  — one active order rule CLAUDE_FE_v13.docx  — /cashier POS spec section API_CONTRACT.docx §6  — tables endpoints Note: Must cover: QR token decode flow, guest auth flow, table assignment, what happens if table already has active order when QR is scanned, POS offline edge cases | Docs to give Claude Code: 003_tables.sql  — qr_token schema — CHAR(64), unique per table 005_orders.sql  — orders + table_id FK MASTER.docx §4.5  — one active order rule CLAUDE_FE_v13.docx  — /cashier POS spec section API_CONTRACT.docx §6  — tables endpoints Note: Must cover: QR token decode flow, guest auth flow, table assignment, what happens if table already has active order when QR is scanned, POS offline edge cases |

| 0.3 | Write Spec_7_Staff_Management.docx — Staff CRUD, schedules, training | MED |
| --- | --- | --- |
|  | Docs to give Claude Code: 001_auth.sql  — staff table schema MASTER.docx §3  — RBAC roles + hierarchy CLAUDE_FE_v13.docx  — /staff page spec section ERROR_CONTRACT_v1.1.docx  — error codes Note: Must cover: manager cannot deactivate their own account, cache invalidation when staff is deactivated, session revoke on deactivation | Docs to give Claude Code: 001_auth.sql  — staff table schema MASTER.docx §3  — RBAC roles + hierarchy CLAUDE_FE_v13.docx  — /staff page spec section ERROR_CONTRACT_v1.1.docx  — error codes Note: Must cover: manager cannot deactivate their own account, cache invalidation when staff is deactivated, session revoke on deactivation |

# 4 — Phase 3: sqlc + Project Setup
| Phase 3 | sqlc Queries + Project Scaffolding | READY |
| --- | --- | --- |

*Dependency: Phase 1 complete (all migrations ✓) + Issue #5 resolved.*

| 3.1 | Create sqlc.yaml + query/auth.sql → run sqlc generate | FIRST |
| --- | --- | --- |
|  | Docs to give Claude Code: SQLC_SETUP.docx  — sqlc.yaml config + all 8 auth queries with full annotations 001_auth.sql  — staff + refresh_tokens DDL — sqlc reads this as input schema BanhCuon_DB_SCHEMA_SUMMARY.md  — field name source of truth — verify generated code  Tip: Always run go build ./... after sqlc generate to catch compile errors before moving to next task. Note: Run: sqlc generate from project root. Verify output in be/internal/db/ — no base_price, image_url, staff_id, webhook_payload | Docs to give Claude Code: SQLC_SETUP.docx  — sqlc.yaml config + all 8 auth queries with full annotations 001_auth.sql  — staff + refresh_tokens DDL — sqlc reads this as input schema BanhCuon_DB_SCHEMA_SUMMARY.md  — field name source of truth — verify generated code  Tip: Always run go build ./... after sqlc generate to catch compile errors before moving to next task. Note: Run: sqlc generate from project root. Verify output in be/internal/db/ — no base_price, image_url, staff_id, webhook_payload |

| 3.2 | Write query/products.sql + query/orders.sql + query/payments.sql + query/files.sql | FIRST |
| --- | --- | --- |
|  | Docs to give Claude Code: SQLC_SETUP.docx  — sqlc annotation patterns (:one, :many, :exec) + yaml config 002_products.sql + 004_combos.sql  — products domain DDL → query/products.sql 003_tables.sql + 005_orders.sql  — orders domain DDL → query/orders.sql 006_payments.sql  — payments DDL → query/payments.sql 007_files.sql  — files DDL → query/files.sql BanhCuon_DB_SCHEMA_SUMMARY.md  — verify all field names match  Tip: After each query file: run sqlc generate + go build to verify. Fix before moving to next query file. Note: One query file per session. Do NOT write all in one prompt. | Docs to give Claude Code: SQLC_SETUP.docx  — sqlc annotation patterns (:one, :many, :exec) + yaml config 002_products.sql + 004_combos.sql  — products domain DDL → query/products.sql 003_tables.sql + 005_orders.sql  — orders domain DDL → query/orders.sql 006_payments.sql  — payments DDL → query/payments.sql 007_files.sql  — files DDL → query/files.sql BanhCuon_DB_SCHEMA_SUMMARY.md  — verify all field names match  Tip: After each query file: run sqlc generate + go build to verify. Fix before moving to next query file. Note: One query file per session. Do NOT write all in one prompt. |

| 3.3 | Initialize Go 1.22 module + create be/ folder structure | FIRST |
| --- | --- | --- |
|  | Docs to give Claude Code: MASTER.docx §1 §9  — tech stack versions + all env vars for go.mod dependencies BanhCuon_Project_Checklist.md Phase 3  — exact folder structure: cmd/, internal/, pkg/  Tip: Install: gin, golang-jwt/jwt/v5, go-redis/v9, shopspring/decimal, go-sql-driver/mysql, golang.org/x/crypto | Docs to give Claude Code: MASTER.docx §1 §9  — tech stack versions + all env vars for go.mod dependencies BanhCuon_Project_Checklist.md Phase 3  — exact folder structure: cmd/, internal/, pkg/  Tip: Install: gin, golang-jwt/jwt/v5, go-redis/v9, shopspring/decimal, go-sql-driver/mysql, golang.org/x/crypto |

| 3.4 | Initialize Next.js 14 project + create fe/src/ folder structure | FIRST |
| --- | --- | --- |
|  | Docs to give Claude Code: CLAUDE_FE_v13.docx  — full folder structure + exact package list MASTER.docx §2  — design tokens for Tailwind config (colors as CSS vars)  Tip: Run: npx create-next-app@14 fe --typescript --tailwind --app --src-dir. Then install: zustand @tanstack/react-query axios react-hook-form zod @hookform/resolvers | Docs to give Claude Code: CLAUDE_FE_v13.docx  — full folder structure + exact package list MASTER.docx §2  — design tokens for Tailwind config (colors as CSS vars)  Tip: Run: npx create-next-app@14 fe --typescript --tailwind --app --src-dir. Then install: zustand @tanstack/react-query axios react-hook-form zod @hookform/resolvers |

# 5 — Phase 4: Backend Implementation
| Phase 4 | Backend — 6 Tasks in Strict Order | AFTER PHASE 3 |
| --- | --- | --- |

*Rule: Auth middleware must be working before ANY other task starts. Never hardcode env vars — always os.Getenv().*

## Task 4.1 — Auth Backend
| 4.1 | pkg/jwt + pkg/bcrypt + middleware/auth.go + middleware/rbac.go + auth_service + auth_handler | FIRST |
| --- | --- | --- |
|  | Docs to give Claude Code: Spec1_Auth_Updated_v2.docx  — FULL spec — Gap 5 token rotation + Gap 6 is_active resolved MASTER.docx §3  — RBAC roles + role hierarchy values MASTER.docx §6  — JWT config: TTL, storage, payload fields, interceptor pattern MASTER.docx §8  — Redis keys: session:{id}, logout:{jti}, rate:{ip}, login_fail:{ip} ERROR_CONTRACT_v1.1.docx  — AUTH_* error codes + handler pattern (respondError helper) 001_auth.sql  — staff + refresh_tokens DDL SQLC_SETUP.docx §3-4  — generated Querier interface — use this for auth_repo.go API_CONTRACT.docx §2  — auth endpoints request/response shapes  Tip: Start with pkg/jwt + pkg/bcrypt (no dependencies). Then middleware. Then service. Then handler. Do NOT do all in one session. Note: SECURITY CRITICAL: Verify t.Method == jwt.SigningMethodHMAC BEFORE parsing token (algorithm confusion attack) Note: Login must return same error for wrong username AND wrong password — never reveal which Note: is_active check: Redis cache TTL 5min — NOT a DB query on every request | Docs to give Claude Code: Spec1_Auth_Updated_v2.docx  — FULL spec — Gap 5 token rotation + Gap 6 is_active resolved MASTER.docx §3  — RBAC roles + role hierarchy values MASTER.docx §6  — JWT config: TTL, storage, payload fields, interceptor pattern MASTER.docx §8  — Redis keys: session:{id}, logout:{jti}, rate:{ip}, login_fail:{ip} ERROR_CONTRACT_v1.1.docx  — AUTH_* error codes + handler pattern (respondError helper) 001_auth.sql  — staff + refresh_tokens DDL SQLC_SETUP.docx §3-4  — generated Querier interface — use this for auth_repo.go API_CONTRACT.docx §2  — auth endpoints request/response shapes  Tip: Start with pkg/jwt + pkg/bcrypt (no dependencies). Then middleware. Then service. Then handler. Do NOT do all in one session. Note: SECURITY CRITICAL: Verify t.Method == jwt.SigningMethodHMAC BEFORE parsing token (algorithm confusion attack) Note: Login must return same error for wrong username AND wrong password — never reveal which Note: is_active check: Redis cache TTL 5min — NOT a DB query on every request |

## Task 4.2 — Products Backend
| 4.2 | product_repo + product_service (with Redis cache) + product_handler | HIGH |
| --- | --- | --- |
|  | Docs to give Claude Code: Spec_2_Products_API_v2_CORRECTED.docx  — full spec — schema drift fixed, UUID IDs, correct field names 002_products.sql + 004_combos.sql  — products + combos + toppings DDL API_CONTRACT.docx §3  — all products endpoints + request/response schemas MASTER.docx §3  — RBAC — Manager+ for write, Public for read MASTER.docx §8  — Redis cache keys: products:list:{filter}, products:{id} ERROR_CONTRACT_v1.1.docx  — PRODUCT_001  Tip: Cache product list in Redis TTL 5min. Invalidate on create/update/delete. Note: Correct field names: price (NOT base_price), image_path (NOT image_url), created_by (NOT staff_id) | Docs to give Claude Code: Spec_2_Products_API_v2_CORRECTED.docx  — full spec — schema drift fixed, UUID IDs, correct field names 002_products.sql + 004_combos.sql  — products + combos + toppings DDL API_CONTRACT.docx §3  — all products endpoints + request/response schemas MASTER.docx §3  — RBAC — Manager+ for write, Public for read MASTER.docx §8  — Redis cache keys: products:list:{filter}, products:{id} ERROR_CONTRACT_v1.1.docx  — PRODUCT_001  Tip: Cache product list in Redis TTL 5min. Invalidate on create/update/delete. Note: Correct field names: price (NOT base_price), image_path (NOT image_url), created_by (NOT staff_id) |

## Task 4.3 — Orders Backend (Most Complex — 3 Sub-sessions)
| 4.3a | order_service: CreateOrder + combo expand logic | HIGH |
| --- | --- | --- |
|  | Docs to give Claude Code: Spec_4_Orders_API.docx  — combo expand spec — parent row + sub-items with combo_ref_id 005_orders.sql  — order_items CHECK constraint (3 valid item types) MASTER.docx §4.1 §4.5  — state machine + one-active-order rule ERROR_CONTRACT_v1.1.docx  — ORDER_001 (table has active order) Note: CRITICAL: total_amount is DENORMALIZED — call recalculateTotalAmount() after every order_items mutation. Silent drift causes wrong payment amount. | Docs to give Claude Code: Spec_4_Orders_API.docx  — combo expand spec — parent row + sub-items with combo_ref_id 005_orders.sql  — order_items CHECK constraint (3 valid item types) MASTER.docx §4.1 §4.5  — state machine + one-active-order rule ERROR_CONTRACT_v1.1.docx  — ORDER_001 (table has active order) Note: CRITICAL: total_amount is DENORMALIZED — call recalculateTotalAmount() after every order_items mutation. Silent drift causes wrong payment amount. |

| 4.3b | order_service: CancelOrder + UpdateItemStatus + state transitions | HIGH |
| --- | --- | --- |
|  | Docs to give Claude Code: Spec_4_Orders_API.docx  — cancel rule + state machine transitions MASTER.docx §4.1 §4.2  — state machine + cancel formula: SUM(qty_served)/SUM(quantity) < 0.30 ERROR_CONTRACT_v1.1.docx  — ORDER_002 (cancel threshold), ORDER_004 (invalid transition) Note: If inventory deduction fails during UpdateItemStatus: ROLLBACK entire transaction — return 409 (NOT 500) | Docs to give Claude Code: Spec_4_Orders_API.docx  — cancel rule + state machine transitions MASTER.docx §4.1 §4.2  — state machine + cancel formula: SUM(qty_served)/SUM(quantity) < 0.30 ERROR_CONTRACT_v1.1.docx  — ORDER_002 (cancel threshold), ORDER_004 (invalid transition) Note: If inventory deduction fails during UpdateItemStatus: ROLLBACK entire transaction — return 409 (NOT 500) |

| 4.3c | SSE handler (be/internal/sse/handler.go) + order_handler | HIGH |
| --- | --- | --- |
|  | Docs to give Claude Code: MASTER.docx §5.2  — SSE config: heartbeat every 15s, Redis channel pattern, event types API_CONTRACT.docx §4 §10.2  — orders endpoints + SSE event payloads ERROR_CONTRACT_v1.1.docx  — ORDER_003 (not found) Note: X-Accel-Buffering: no header required for nginx. Send initial order state as order_init event on connect. | Docs to give Claude Code: MASTER.docx §5.2  — SSE config: heartbeat every 15s, Redis channel pattern, event types API_CONTRACT.docx §4 §10.2  — orders endpoints + SSE event payloads ERROR_CONTRACT_v1.1.docx  — ORDER_003 (not found) Note: X-Accel-Buffering: no header required for nginx. Send initial order state as order_init event on connect. |

## Task 4.4 — WebSocket Hub
| 4.4 | pkg/redis/pubsub.go + bloom.go + websocket/hub.go + ws handler + 3 WS endpoints | MED |
| --- | --- | --- |
|  | Docs to give Claude Code: MASTER.docx §5.1  — WS config: ping 30s, reconnect backoff, message format {type, payload} API_CONTRACT.docx §10.1  — WS event types per role (chef vs cashier vs manager) MASTER.docx §3  — RBAC — WS /kds = Chef+, /orders-live = Cashier+, /payments = Cashier+ MASTER.docx §8  — Redis pub/sub channel keys, bloom filter keys BanhCuon_Project_Checklist.md Task 4.4  — hub.go struct + ping/pong pattern Note: Auth: read JWT from ?token= query param (WebSocket browser cannot set custom headers) | Docs to give Claude Code: MASTER.docx §5.1  — WS config: ping 30s, reconnect backoff, message format {type, payload} API_CONTRACT.docx §10.1  — WS event types per role (chef vs cashier vs manager) MASTER.docx §3  — RBAC — WS /kds = Chef+, /orders-live = Cashier+, /payments = Cashier+ MASTER.docx §8  — Redis pub/sub channel keys, bloom filter keys BanhCuon_Project_Checklist.md Task 4.4  — hub.go struct + ping/pong pattern Note: Auth: read JWT from ?token= query param (WebSocket browser cannot set custom headers) |

## Task 4.5 — Payments Backend
| 4.5 | be/internal/payment/vnpay.go + momo.go + zalopay.go + payment_handler + payment_timeout job | MED |
| --- | --- | --- |
|  | Docs to give Claude Code: Spec_5_Payment_Webhooks.docx  — FULL gateway spec: HMAC verify steps for each gateway 006_payments.sql  — payments DDL — attempt_count, refunded_amount, soft delete MASTER.docx §4.3  — payment rules: timing, idempotency, gateway ref, tiền mặt API_CONTRACT.docx §5  — payment endpoints + webhook endpoints (PUBLIC, no JWT auth) ERROR_CONTRACT_v1.1.docx  — PAYMENT_001-002 MASTER.docx §9  — VNPAY_TMN_CODE, VNPAY_HASH_SECRET, MOMO_*, ZALOPAY_* env vars  Tip: ALWAYS confirm before running payment code. Use sandbox credentials only (VNPAY sandbox.vnpayment.vn). Note: WEBHOOK: Verify HMAC signature is FIRST operation — before any DB access. Reject immediately if invalid. Note: IDEMPOTENCY: If payment.status already 'completed' → return 200 immediately, do NOT re-process Note: VNPay webhook response format: {"RspCode": "00", "Message": "Confirm Success"} — exact format required | Docs to give Claude Code: Spec_5_Payment_Webhooks.docx  — FULL gateway spec: HMAC verify steps for each gateway 006_payments.sql  — payments DDL — attempt_count, refunded_amount, soft delete MASTER.docx §4.3  — payment rules: timing, idempotency, gateway ref, tiền mặt API_CONTRACT.docx §5  — payment endpoints + webhook endpoints (PUBLIC, no JWT auth) ERROR_CONTRACT_v1.1.docx  — PAYMENT_001-002 MASTER.docx §9  — VNPAY_TMN_CODE, VNPAY_HASH_SECRET, MOMO_*, ZALOPAY_* env vars  Tip: ALWAYS confirm before running payment code. Use sandbox credentials only (VNPAY sandbox.vnpayment.vn). Note: WEBHOOK: Verify HMAC signature is FIRST operation — before any DB access. Reject immediately if invalid. Note: IDEMPOTENCY: If payment.status already 'completed' → return 200 immediately, do NOT re-process Note: VNPay webhook response format: {"RspCode": "00", "Message": "Confirm Success"} — exact format required |

## Task 4.6 — Remaining Endpoints
| 4.6 | GET /tables/qr/:token + POST /files/upload + file_cleanup job | MED |
| --- | --- | --- |
|  | Docs to give Claude Code: Spec_6_QR_POS.docx  — QR flow spec — write this in Phase 0 first 003_tables.sql  — qr_token CHAR(64), is_active, status columns 007_files.sql  — file_attachments DDL — is_orphan, entity_type, entity_id API_CONTRACT.docx §6 §7  — tables + files endpoints ERROR_CONTRACT_v1.1.docx  — FILE_001 (too large >10MB), FILE_002 (wrong mime type) Note: Cleanup job: runs every 6h via time.Ticker. Wrap in goroutine with defer recover() — panic must not crash server. | Docs to give Claude Code: Spec_6_QR_POS.docx  — QR flow spec — write this in Phase 0 first 003_tables.sql  — qr_token CHAR(64), is_active, status columns 007_files.sql  — file_attachments DDL — is_orphan, entity_type, entity_id API_CONTRACT.docx §6 §7  — tables + files endpoints ERROR_CONTRACT_v1.1.docx  — FILE_001 (too large >10MB), FILE_002 (wrong mime type) Note: Cleanup job: runs every 6h via time.Ticker. Wrap in goroutine with defer recover() — panic must not crash server. |

# 6 — Phase 5: Frontend Implementation
| Phase 5 | Frontend — 5 Tasks in Strict Order | AFTER Phase 4.1 |
| --- | --- | --- |

*Dependency: Task 4.1 auth backend working + API_CONTRACT.docx v1.2 exists. FE cannot test without working BE.*

**Critical FE rules:**
- NEVER store access token in localStorage — Zustand in-memory only
- NEVER hardcode color HEX — use Tailwind classes matching MASTER §2 tokens
- Server state → TanStack Query. Client state → Zustand. Forms → React Hook Form + Zod
- All IDs are string (UUID) — never number

## Task 5.1 — Auth Flow
| 5.1 | lib/api-client.ts + features/auth/auth.store.ts + auth.api.ts + login page + AuthGuard + RoleGuard | HIGH |
| --- | --- | --- |
|  | Docs to give Claude Code: Spec1_Auth_Updated_v2.docx  — FE sections + Acceptance Criteria CLAUDE_FE_v13.docx  — interceptor pattern + auth store spec + role redirect map MASTER.docx §6.3  — FE interceptor: 401→refresh→retry once→redirect login API_CONTRACT.docx §2  — auth endpoints + response shapes (access_token, user object) ERROR_CONTRACT_v1.1.docx §4  — FE error interceptor code — case TOKEN_EXPIRED, ACCOUNT_DISABLED MASTER.docx §2  — design tokens for login page styling  Tip: On page refresh: accessToken = null. App must call GET /auth/me on mount — refresh cookie auto-sends and restores session silently. Note: Token MUST be in Zustand memory only — validate by checking DevTools Application → no token in localStorage or sessionStorage | Docs to give Claude Code: Spec1_Auth_Updated_v2.docx  — FE sections + Acceptance Criteria CLAUDE_FE_v13.docx  — interceptor pattern + auth store spec + role redirect map MASTER.docx §6.3  — FE interceptor: 401→refresh→retry once→redirect login API_CONTRACT.docx §2  — auth endpoints + response shapes (access_token, user object) ERROR_CONTRACT_v1.1.docx §4  — FE error interceptor code — case TOKEN_EXPIRED, ACCOUNT_DISABLED MASTER.docx §2  — design tokens for login page styling  Tip: On page refresh: accessToken = null. App must call GET /auth/me on mount — refresh cookie auto-sends and restores session silently. Note: Token MUST be in Zustand memory only — validate by checking DevTools Application → no token in localStorage or sessionStorage |

## Task 5.2 — Menu & Cart
| 5.2 | types/product.ts + lib/utils.ts + store/cart.ts + menu page + ToppingModal + ComboModal + CartDrawer | HIGH |
| --- | --- | --- |
|  | Docs to give Claude Code: Spec_3_Menu_Checkout_UI_v2.docx  — full customer flow spec + component list + AC CLAUDE_FE_v13.docx  — /menu section + component conventions + cart store spec API_CONTRACT.docx §3  — GET /products response schema — field names are critical MASTER.docx §2  — design tokens: Primary #FF7A1A for price/accent, #1F3864 for buttons BanhCuon_DB_SCHEMA_SUMMARY.md  — correct field names — NO slug, NO base_price, NO image_url, NO price_delta  Tip: addItem in cart store: if same product+toppings combo exists → increment qty instead of duplicating row. Note: table/[tableId] page is BLOCKED until Issue #7 resolved. Skip it, implement all other menu components first. | Docs to give Claude Code: Spec_3_Menu_Checkout_UI_v2.docx  — full customer flow spec + component list + AC CLAUDE_FE_v13.docx  — /menu section + component conventions + cart store spec API_CONTRACT.docx §3  — GET /products response schema — field names are critical MASTER.docx §2  — design tokens: Primary #FF7A1A for price/accent, #1F3864 for buttons BanhCuon_DB_SCHEMA_SUMMARY.md  — correct field names — NO slug, NO base_price, NO image_url, NO price_delta  Tip: addItem in cart store: if same product+toppings combo exists → increment qty instead of duplicating row. Note: table/[tableId] page is BLOCKED until Issue #7 resolved. Skip it, implement all other menu components first. |

## Task 5.3 — Checkout & Order Tracking
| 5.3 | checkout/schema.ts + checkout/page.tsx + hooks/useOrderSSE.ts + order/[id]/page.tsx | HIGH |
| --- | --- | --- |
|  | Docs to give Claude Code: Spec_3_Menu_Checkout_UI_v2.docx  — checkout + SSE tracking spec + AC MASTER.docx §5.2  — SSE config: reconnect maxAttempts:5, baseDelay:1000ms, maxDelay:30000ms API_CONTRACT.docx §4 §10.2  — POST /orders payload schema + SSE event payloads MASTER.docx §4.2  — cancel rule <30% — controls cancel button visibility ERROR_CONTRACT_v1.1.docx  — ORDER_002 for cancel rejection handling CLAUDE_FE_v13.docx  — WS_RECONNECT config constant + useOrderSSE hook pattern  Tip: Show ConnectionErrorBanner after 3 failed SSE reconnect attempts. Cancel button only visible when progress < 30% AND status != delivered. Note: POST /orders payload must NOT include payment_method field. Must include source field (qr/online/pos). Note: SSE auth: Authorization: Bearer header (NOT query param — SSE supports headers) | Docs to give Claude Code: Spec_3_Menu_Checkout_UI_v2.docx  — checkout + SSE tracking spec + AC MASTER.docx §5.2  — SSE config: reconnect maxAttempts:5, baseDelay:1000ms, maxDelay:30000ms API_CONTRACT.docx §4 §10.2  — POST /orders payload schema + SSE event payloads MASTER.docx §4.2  — cancel rule <30% — controls cancel button visibility ERROR_CONTRACT_v1.1.docx  — ORDER_002 for cancel rejection handling CLAUDE_FE_v13.docx  — WS_RECONNECT config constant + useOrderSSE hook pattern  Tip: Show ConnectionErrorBanner after 3 failed SSE reconnect attempts. Cancel button only visible when progress < 30% AND status != delivered. Note: POST /orders payload must NOT include payment_method field. Must include source field (qr/online/pos). Note: SSE auth: Authorization: Bearer header (NOT query param — SSE supports headers) |

## Task 5.4 — KDS Screen
| 5.4 | app/(dashboard)/kds/page.tsx — full-screen, color-code, WS, click cycle, flag, sound alert | MED |
| --- | --- | --- |
|  | Docs to give Claude Code: Spec_4_Orders_API.docx  — KDS FE sections + item status cycle + flag behavior CLAUDE_FE_v13.docx  — /kitchen spec + color-code table MASTER.docx §2  — KDS color coding: <10min=#1F2937, 10-20min=#FCD34D, >20min or flagged=#FC8181 MASTER.docx §5.1  — WS reconnect config (same WS_RECONNECT constant as SSE) API_CONTRACT.docx §10.1  — WS event types received by chef: new_order, item_updated, order_cancelled  Tip: Full-screen layout, background #0A0F1E, NO navbar. WS auth: ?token={accessToken} query param. Sound: Web Audio API on new_order event. | Docs to give Claude Code: Spec_4_Orders_API.docx  — KDS FE sections + item status cycle + flag behavior CLAUDE_FE_v13.docx  — /kitchen spec + color-code table MASTER.docx §2  — KDS color coding: <10min=#1F2937, 10-20min=#FCD34D, >20min or flagged=#FC8181 MASTER.docx §5.1  — WS reconnect config (same WS_RECONNECT constant as SSE) API_CONTRACT.docx §10.1  — WS event types received by chef: new_order, item_updated, order_cancelled  Tip: Full-screen layout, background #0A0F1E, NO navbar. WS auth: ?token={accessToken} query param. Sound: Web Audio API on new_order event. |

## Task 5.5 — POS Cashier + Payment UI
| 5.5 | app/(dashboard)/pos/page.tsx + cashier/payment/[id]/page.tsx + print receipt | MED |
| --- | --- | --- |
|  | Docs to give Claude Code: Spec_5_Payment_Webhooks.docx  — POS UI + payment flow spec — QR display, COD flow CLAUDE_FE_v13.docx  — /cashier spec — 2-column layout, role guard API_CONTRACT.docx §5  — POST /payments response: qr_code_url field MASTER.docx §4.3  — payment rules: COD = immediate, QR = pending then wait WS event MASTER.docx §2  — design tokens  Tip: Subscribe to WS event payment_success with matching payment_id. On success: toast → window.print() → redirect /pos. Print: @media print hide .no-print elements. | Docs to give Claude Code: Spec_5_Payment_Webhooks.docx  — POS UI + payment flow spec — QR display, COD flow CLAUDE_FE_v13.docx  — /cashier spec — 2-column layout, role guard API_CONTRACT.docx §5  — POST /payments response: qr_code_url field MASTER.docx §4.3  — payment rules: COD = immediate, QR = pending then wait WS event MASTER.docx §2  — design tokens  Tip: Subscribe to WS event payment_success with matching payment_id. On success: toast → window.print() → redirect /pos. Print: @media print hide .no-print elements. |

# 7 — Phase 6: DevOps / Infrastructure
| Phase 6 | Docker + Caddy + CI/CD — Parallel with Phase 4 | PARALLEL OK |
| --- | --- | --- |

| 6.1 | Dockerfile.be (Go multi-stage) + Dockerfile.fe (Next.js standalone) + docker-compose.yml + Caddyfile | MED |
| --- | --- | --- |
|  | Docs to give Claude Code: MASTER.docx §1 §9  — tech stack versions + all env vars list BanhCuon_Project_Checklist.md Phase 6  — exact Dockerfile templates + docker-compose service definitions CLAUDE_DEVOPS.docx  — DevOps role + stack config + health check patterns  Tip: Go build: CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server. Next.js: add output: 'standalone' to next.config.js. Note: docker-compose: 5 services (mysql, redis, backend, frontend, caddy). Each needs healthcheck. Backend depends_on mysql + redis HEALTHY. | Docs to give Claude Code: MASTER.docx §1 §9  — tech stack versions + all env vars list BanhCuon_Project_Checklist.md Phase 6  — exact Dockerfile templates + docker-compose service definitions CLAUDE_DEVOPS.docx  — DevOps role + stack config + health check patterns  Tip: Go build: CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server. Next.js: add output: 'standalone' to next.config.js. Note: docker-compose: 5 services (mysql, redis, backend, frontend, caddy). Each needs healthcheck. Backend depends_on mysql + redis HEALTHY. |

| 6.2 | .env.example + scripts/migrate.sh + .github/workflows/deploy.yml + README.md | MED |
| --- | --- | --- |
|  | Docs to give Claude Code: MASTER.docx §9  — ALL env vars with examples and comments BanhCuon_Project_Checklist.md Phase 6  — migrate.sh template + deploy.yml steps Note: NEVER commit .env — only .env.example with REPLACE placeholder values | Docs to give Claude Code: MASTER.docx §9  — ALL env vars with examples and comments BanhCuon_Project_Checklist.md Phase 6  — migrate.sh template + deploy.yml steps Note: NEVER commit .env — only .env.example with REPLACE placeholder values |

# 8 — Phase 7: Testing, UAT & Go-Live
| Phase 7 | Testing + Go-Live — After Phase 4 + 5 | LAST |
| --- | --- | --- |

| 7.1 | BE unit tests: auth_service_test.go + order_service_test.go + payment_handler_test.go | MED |
| --- | --- | --- |
|  | Docs to give Claude Code: Spec1_Auth_Updated_v2.docx  — AC section = test cases for auth (login, refresh, logout, rate limit) Spec_4_Orders_API.docx  — AC section = test cases for orders (combo expand, cancel rule, state machine) Spec_5_Payment_Webhooks.docx  — AC section = test cases for payments (HMAC verify, idempotency) MASTER.docx §4  — business rules = expected behaviors = what to assert BanhCuon_Project_Checklist.md Phase 7  — exact test function names listed  Tip: Test interface: auth_repo.go uses db.Querier interface from sqlc — mock this for service unit tests. | Docs to give Claude Code: Spec1_Auth_Updated_v2.docx  — AC section = test cases for auth (login, refresh, logout, rate limit) Spec_4_Orders_API.docx  — AC section = test cases for orders (combo expand, cancel rule, state machine) Spec_5_Payment_Webhooks.docx  — AC section = test cases for payments (HMAC verify, idempotency) MASTER.docx §4  — business rules = expected behaviors = what to assert BanhCuon_Project_Checklist.md Phase 7  — exact test function names listed  Tip: Test interface: auth_repo.go uses db.Querier interface from sqlc — mock this for service unit tests. |

| 7.2 | FE unit tests (cart.store, utils) + seed.sql + UAT_Plan.docx + go-live checklist | MED |
| --- | --- | --- |
|  | Docs to give Claude Code: CLAUDE_FE_v13.docx  — component specs = test targets BanhCuon_Project_Checklist.md Phase 7  — exact test names + seed data requirements + go-live checklist All Specs 1-7  — AC for each spec = UAT test cases  Tip: Payment sandbox: use ngrok (ngrok http 8080) to expose local webhook to VNPay/MoMo/ZaloPay sandbox. Note: Seed: 3+ categories, 10+ products, 5+ toppings, 2+ combos, 4 staff accounts (chef/cashier/manager/admin), 5+ tables with qr_token values | Docs to give Claude Code: CLAUDE_FE_v13.docx  — component specs = test targets BanhCuon_Project_Checklist.md Phase 7  — exact test names + seed data requirements + go-live checklist All Specs 1-7  — AC for each spec = UAT test cases  Tip: Payment sandbox: use ngrok (ngrok http 8080) to expose local webhook to VNPay/MoMo/ZaloPay sandbox. Note: Seed: 3+ categories, 10+ products, 5+ toppings, 2+ combos, 4 staff accounts (chef/cashier/manager/admin), 5+ tables with qr_token values |

# 9 — Critical Rules — Never Forget
| Rule | Detail |
| --- | --- |
| No localStorage for tokens | Access token in Zustand memory ONLY. Refresh token in httpOnly cookie ONLY. |
| No hardcoded colors | Use Tailwind classes (e.g. text-orange-500), NOT hex #FF7A1A directly in code. |
| No hardcoded env vars | Always os.Getenv() in Go. Always process.env.NEXT_PUBLIC_* in Next.js. |
| Verify HMAC first | Payment webhooks: signature check is FIRST operation, BEFORE any DB access. |
| Idempotent webhooks | Check payment.status before updating — gateways call webhooks multiple times. |
| UUID strings not integers | All IDs are string in TypeScript, string in Go (CHAR(36)). Never number/int. |
| Correct field names | price NOT base_price. image_path NOT image_url. created_by NOT staff_id. gateway_data NOT webhook_payload. completed NOT success (payment status). |
| total_amount drift | Call recalculateTotalAmount() after EVERY order_items mutation. Silent drift = wrong payment. |
| order_items status | Derive from qty_served UNLESS Issue #5 resolves to Approach A (migration 008). |
| Payment only when ready | POST /payments must reject with 409 if order.status ≠ 'ready'. |
| 1 table 1 active order | Check before INSERT into orders. Use composite index idx_orders_table_status. |
| Soft delete everywhere | Use deleted_at — NEVER hard DELETE. Query: always add WHERE deleted_at IS NULL. |
| No ECC | This is an ECC-Free project. Do not use ECC constructs anywhere. |
| sqlc only | No raw query strings. All DB access through sqlc generated code. |
| Wrap errors with context | fmt.Errorf("createOrder: %w", err) — always wrap with operation name. |

# 10 — Field Name Quick Reference
*Common mistakes. Always verify sqlc generated code uses these names.*

| Table | WRONG (never use) | CORRECT (always use) |
| --- | --- | --- |
| products | ✗ base_price, image_url, slug | ✓ price, image_path |
| orders | ✗ staff_id (creator) | ✓ created_by |
| payments | ✗ webhook_payload, success (status) | ✓ gateway_data, completed (status) |
| order_items | ✗ price_delta, image_url | ✓ unit_price, toppings_snapshot |
| file_attachments | ✗ file_url, entity_uuid | ✓ object_path, entity_id |
| all tables | ✗ integer ID (1, 2, 3) | ✓ UUID string CHAR(36) |

🍜 BanhCuon System  ·  Claude Code Session Guide  ·  v1.0  ·  Tháng 4/2026
*Follow phases in order. Resolve blockers first. One task = one Claude Code session.*