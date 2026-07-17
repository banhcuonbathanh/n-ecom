
**BUSINESS REQUIREMENTS DOCUMENT**
He Thong Quan Ly Quan Banh Cuon

| Document Version | 1.0 |
| --- | --- |
| Date | Thang 4 / 2026 |
| Status | Draft - Awaiting Approval |
| Project | BanhCuon Restaurant Management System - Phase 1 |
| Tech Stack | Next.js 14 | Go 1.22 + Gin | MySQL 8.0 | Redis Stack | Docker |
| Author(s) | BA Team | Tech Lead | Development Team |

# 1. EXECUTIVE SUMMARY
## 1.1 Business Problem
Quan Banh Cuon van hanh theo mo hinh ket hop online va offline. Truoc day qua trinh quan ly hoan toan thu cong: nhan vien ghi tay, bep nhan phieu giay, thu ngan tinh tien bang may tinh cam tay. Dieu nay dan den:
- Sai sot don hang do truyen dat thong tin khong chinh xac giua thu ngan va bep
- Cham tre phuc vu do khong co he thong theo doi trang thai don hang realtime
- Thieu du lieu phan tich de ra quyet dinh kinh doanh (doanh thu, san pham ban chay)
- Khong co kha nang quan ly kho nguyen lieu tu dong, dan den het hang bat ngo
- Khach hang khong the theo doi trang thai don hang, gay mat trai nghiem

## 1.2 Proposed Solution
Xay dung he thong quan ly quan an so hoa toan bo quy trinh: tu luc khach dat mon den bep hoan thanh, thu ngan thanh toan, quan ly kho tu dong. He thong bao gom:
- Customer Portal: dat hang online, chon topping/combo, thanh toan da phuong thuc, theo doi don realtime qua SSE
- QR Table Ordering: khach quet QR tai ban, tu nhan ban so, dat mon ngay tren thiet bi ca nhan
- Kitchen Display System (KDS): man hinh bep fullscreen, color-code 3 muc do khan cap, cap nhat trang thai tung mon
- POS System: thu ngan tao don offline, 4 phuong thuc thanh toan (VNPay/MoMo/ZaloPay/Tien mat)
- Management Dashboard: bao cao doanh thu, quan ly san pham/kho/nhan su

## 1.3 Project Scope
| Feature | Description | Phase | Status |
| --- | --- | --- | --- |
| Dat hang Online | Menu web, topping, combo, gio hang | Phase 1 | In Development |
| QR Tai Ban | Quet QR → nhan ban → dat mon → bep | Phase 1 | In Development |
| POS Offline | Thu ngan tao don, 4 phuong thuc thanh toan | Phase 1 | In Development |
| KDS Bep | Man hinh realtime, color-code, sound alert | Phase 1 | In Development |
| Theo Doi Don | SSE realtime, tien do %, qty_served | Phase 1 | In Development |
| Quan Ly Kho | Tu dong tru kho, alert gan het | Phase 2 | Planned |
| Dashboard & Reports | Doanh thu theo gio/ngay/thang, YoY | Phase 2 | Planned |
| Nhan Su & Training | Ho so, lich ca, khoa hoc, diem so | Phase 2 | Planned |
| Computer Vision | YOLOv8 dem mon qua camera RTSP | Phase 3 | Future |

# 2. STAKEHOLDERS & USER PERSONAS
## 2.1 Primary Stakeholders
| Stakeholder | Role | Primary Concern |
| --- | --- | --- |
| Restaurant Owner | Quyet dinh chien luoc, dang ky voi cac gateway thanh toan | ROI, tinh nang bao cao, toan ven du lieu |
| Manager | Quan ly hang ngay: nhan su, kho, bao cao | Tinh chinh xac cua du lieu, de su dung |
| Dev Team | Xay dung va bao tri he thong | Spec ro rang, it ambiguity, testable AC |
| Payment Gateways | VNPay / MoMo / ZaloPay | HMAC signature verify, callback URL, sandbox |

## 2.2 User Personas & RBAC
He thong co 6 roles voi phan cap ro rang: admin superset manager superset staff superset (chef | cashier). Customer la isolated role, khong lien quan den role hien nay.

| Role | Nguoi Dung | Chuc Nang Chinh | Kenh Truy Cap |
| --- | --- | --- | --- |
| customer | Khach online / QR tai ban | Xem menu, dat don, theo doi don, huy (<30% done) | Web browser, QR scan |
| chef | Nhan vien bep | Xem KDS, cap nhat trang thai mon, flag 🚩 | KDS screen (fullscreen) |
| cashier | Thu ngan | Tao don offline POS, xu ly thanh toan, upload anh | POS terminal |
| staff | Nhan vien tong hop | chef + cashier + upload file | KDS + POS |
| manager | Quan ly quan | staff + Dashboard, Reports, CRUD san pham/kho/nhan su | Admin dashboard |
| admin | Quan tri he thong | manager + cau hinh he thong, xoa data, quan ly accounts | Full system access |

# 3. FUNCTIONAL REQUIREMENTS
## 3.1 FR-AUTH — Authentication & Authorization
Module xac thuc nguoi dung voi JWT access token (24h) + refresh token (30 ngay, httpOnly cookie). RBAC 6 roles voi role hierarchy.

| ID | Requirement | Priority | Role |
| --- | --- | --- | --- |
| FR-AUTH-01 | He thong phai cho phep staff dang nhap bang username/password. Sai credential → khong tiet lo 'username sai' hay 'mat khau sai' (cung tra ve ErrInvalidCredentials). | MUST | Public |
| FR-AUTH-02 | Rate limit: khoa IP sau 5 lan dang nhap sai trong 1 phut, khoa 15 phut. Redis key: login_fail:{ip}. | MUST | System |
| FR-AUTH-03 | Access token luu trong Zustand store (in-memory). Tuyet doi KHONG luu localStorage (XSS risk). | MUST | FE |
| FR-AUTH-04 | Refresh token luu trong httpOnly cookie. Khi 401 → frontend tu dong goi /auth/refresh → retry request goc. | MUST | FE/BE |
| FR-AUTH-05 | Multi-session: moi login tao 1 refresh token moi, token cu van valid. Logout chi revoke session hien tai. | MUST | BE |
| FR-AUTH-06 | is_active check: admin disable staff → hieu luc toi da 5 phut (Redis cache TTL). Clear cache ngay lap tuc khi admin deactivate. | MUST | BE |
| FR-AUTH-07 | QR customer: POST /auth/guest { table_id } → tra access token ngan han. Token luu Zustand, cart gui kem table_id. | MUST | BE/FE |

## 3.2 FR-PRODUCT — Products & Menu Management
CRUD day du cho san pham, danh muc, topping va combo. Redis cache 5 phut cho public endpoints.

| ID | Requirement | Priority | Role |
| --- | --- | --- | --- |
| FR-PRD-01 | GET /products, /categories, /toppings, /combos la public endpoints (khong can auth). Redis cache 5 phut. | MUST | Public |
| FR-PRD-02 | Manager+ co the CRUD san pham, danh muc, topping, combo. Soft delete (is_active=false), khong xoa vat ly. | MUST | Manager+ |
| FR-PRD-03 | is_available (toggle nhanh het mon hom nay) vs is_active (an vinh vien). Ca hai deu filter o public endpoint. | MUST | Manager+ |
| FR-PRD-04 | Tat ca ID la CHAR(36) UUID. Field: price (khong phai base_price), image_path (object_path tuong doi, KHONG full URL). | MUST | Dev |
| FR-PRD-05 | Combo expand tai thoi diem dat hang: BE tao order_items rieng le cho tung mon trong combo, lien ket qua combo_ref_id. | MUST | BE |
| FR-PRD-06 | Topping snapshot khi dat hang: luu gia tai thoi diem dat vao topping_snapshot JSON, khong bi anh huong khi admin doi gia sau. | MUST | BE |

## 3.3 FR-ORDER — Order Management & State Machine
Core business logic cua he thong. Tat ca KDS, POS, order tracking deu phu thuoc module nay.

| ID | Requirement | Priority | Role |
| --- | --- | --- | --- |
| FR-ORD-01 | Order state machine: pending → confirmed → preparing → ready → delivered. Huy don chi duoc khi SUM(qty_served)/SUM(quantity) < 30%. | MUST | BE |
| FR-ORD-02 | 1 ban toi da 1 ACTIVE order (status IN pending, confirmed, preparing, ready). Vi pham → 409 ORDER_001. | MUST | BE |
| FR-ORD-03 | Order number format: ORD-YYYYMMDD-NNN. Primary path: Redis INCR order_seq:{YYYYMMDD} TTL 2 ngay. Fallback: order_sequences table. | MUST | BE |
| FR-ORD-04 | Combo expand trong transaction: tat ca order_item rows tao trong 1 DB transaction. Rollback neu bat ky insert nao that bai. | MUST | BE |
| FR-ORD-05 | Customer chi xem duoc don cua minh (JWT sub match voi guest token cua order). Cashier+ xem duoc tat ca. | MUST | BE |
| FR-ORD-06 | POST /orders payload khong co payment_method. FE luu vao Zustand store de dung sau khi tao payment. | MUST | FE/BE |
| FR-ORD-07 | total_amount DENORMALIZED → service PHAI goi recalculateTotalAmount(orderId) sau moi mutation de payment charge dung so tien. | MUST | BE |

## 3.4 FR-PAYMENT — Payment Processing
4 phuong thuc: VNPay / MoMo / ZaloPay QR + Tien mat COD. Webhook HMAC verification bat buoc truoc khi xu ly bat ky business logic nao.

| ID | Requirement | Priority | Role |
| --- | --- | --- | --- |
| FR-PAY-01 | Payment chi duoc tao khi order.status = 'ready'. Cashier khong the tao payment cho don pending/confirmed/preparing. → 409. | MUST | BE |
| FR-PAY-02 | UNIQUE(order_id) tren bang payments. Retry phai UPDATE row hien co, KHONG INSERT moi. Idempotency bat buoc. | MUST | BE |
| FR-PAY-03 | Webhook: verify HMAC signature TRUOC KHI xu ly bat ky logic nao. VNPay: HMAC-SHA512. MoMo: HMAC-SHA256. ZaloPay: HMAC-SHA256. | MUST | System Dev |
| FR-PAY-04 | Payment status: pending → completed (KHONG phai 'success'). Refund: updated_amount set khi huy. Hard delete bi chan, chi dung deleted_at. | MUST | BE |
| FR-PAY-05 | Webhook log: luu raw payload vao gateway_data JSON de audit. KHONG phai 'webhook_payload'. | MUST | BE |
| FR-PAY-06 | COD: Cashier xac nhan thu tien → payment.status = completed + order.status = delivered ngay lap tuc. | MUST | BE |
| FR-PAY-07 | Sau khi webhook thanh cong → broadcast WS event 'payment_success' toi cashier client. FE: toast + auto print + redirect. | MUST | System/FE |

## 3.5 FR-REALTIME — WebSocket & SSE
KDS dung WebSocket (Go channels, hub pattern). Order tracking dung SSE qua Redis Pub/Sub. Reconnect voi exponential backoff.

| ID | Requirement | Priority | Role |
| --- | --- | --- | --- |
| FR-RT-01 | WebSocket KDS: ws://{host}/api/v1/ws/kds. Auth qua query param ?token={jwt} (WS browser khong support custom header). Ping 30s, Pong timeout 10s. | MUST | System |
| FR-RT-02 | SSE Order Tracking: GET /api/v1/orders/:id/events. Auth Bearer header. Heartbeat ':keep-alive' moi 15s. Redis channel: order:{order_id}:events. | MUST | System |
| FR-RT-03 | SSE event types: order_status_changed | item_progress | order_completed. WS event types: new_order | item_updated | order_cancelled | payment_success. | MUST | System |
| FR-RT-04 | Reconnect config (FE): maxAttempts=5, baseDelay=1000ms (x2 moi lan), maxDelay=30000ms, showBannerAfter=3 lan that bai. | MUST | FE |
| FR-RT-05 | KDS color-code: trang (< 10 phut), vang (10-20 phut), do (> 20 phut hoac flag 🚩). Chef click item → cycle: pending → preparing → done. | MUST | FE |

# 4. NON-FUNCTIONAL REQUIREMENTS
## 4.1 Performance
| Category | Requirement | Metric / Target |
| --- | --- | --- |
| API Response Time | REST endpoints phai tra response nhanh cho UX tot | < 200ms cho 95th percentile (tru external calls) |
| Redis Cache | Public product endpoints cache 5 phut | Cache hit ratio > 80% trong gio cao diem |
| WebSocket Latency | KDS nhan event sau khi Chef click | < 100ms end-to-end (same LAN) |
| DB Context Timeout | Context timeout cho tat ca queries | 5s cho DB queries, 10s cho external API calls |

## 4.2 Security
| Requirement | Details |
| --- | --- |
| Token Storage | Access token: Zustand in-memory ONLY. Refresh token: httpOnly cookie. KHONG localStorage — XSS risk. |
| Password Hashing | bcrypt cost=12 (approx 200ms). KHONG store plain text hoac reversible hash. |
| HMAC Verification | Moi webhook: verify signature TRUOC bat ky business logic. VNPay: HMAC-SHA512. MoMo/ZaloPay: HMAC-SHA256. |
| Env Variables | KHONG hardcode secret keys. Tat ca tu env vars. .env trong gitignore. .env.example chi chua placeholder. |
| SQL Injection | Dung sqlc (type-safe generated code) + parameterized queries. KHONG string concatenation trong SQL. |
| CORS | Allowed origins lay tu env var CORS_ORIGINS. KHONG hardcode. Caddy xu ly HTTPS auto. |
| Rate Limiting | Login: 5 req/phut/IP. General: 60 req/phut/IP. Redis key: rate_limit:{ip}:{endpoint} TTL 1 phut. |

## 4.3 Tech Stack & Infrastructure
| Layer | Technology | Notes |
| --- | --- | --- |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + Zustand | SSR + client state. Token in-memory. |
| Backend | Go 1.22 + Gin + sqlc + database/sql | High performance REST + WebSocket. No ORM. |
| Database | MySQL 8.0 + Redis Stack 7 | Relational + cache + pub/sub + Bloom filter |
| Realtime | WebSocket (Go channels) + SSE (Redis Pub/Sub) | KDS + Order tracking |
| Auth | JWT (24h) + Refresh Token (30d, httpOnly) + RBAC | 6 roles. HMAC-SHA256. |
| Payment | VNPay / MoMo / ZaloPay QR + Tien mat COD | 4 phuong thuc. HMAC signature verify. |
| Deploy | Docker + Docker Compose + Caddy (HTTPS auto) | Production VPS. Auto TLS. |

# 5. DATABASE DESIGN OVERVIEW
## 5.1 Schema Conventions
- Primary Keys: CHAR(36) DEFAULT (UUID()) — KHONG dung AUTO_INCREMENT
- Timestamps: created_at, updated_at tren moi bang. Soft delete: deleted_at DATETIME NULL
- Currency: DECIMAL(10,0) — VND khong co decimal. KHONG FLOAT (rounding bug)
- File paths: luu object_path (tuong doi). Full URL = STORAGE_BASE_URL + object_path
- Indexes: moi FK column, status, created_at, is_active, deleted_at

## 5.2 Domain Tables Summary
| Domain | Tables | Key Design Decisions |
| --- | --- | --- |
| Auth | staff, refresh_tokens | bcrypt cost=12, SHA256 token hash, max 5 sessions/staff, last_used_at tracking |
| Products | categories, products, toppings, product_toppings | Khong co slug column. Field: price (khong phai base_price), image_path (khong phai image_url) |
| Tables | tables | qr_token CHAR(64) UNIQUE. Regenerate token = invalidate tat ca QR da in cho ban do. |
| Combos | combos, combo_items | combo_items la static template. Tai order time → BE expand thanh order_items rieng le. |
| Orders | order_sequences, orders, order_items | order_items.status KHONG TON TAI — derive tu qty_served. combo_ref_id self-ref cho combo sub-item. |
| Payments | payments | UNIQUE(order_id). Status: pending/completed (KHONG 'success'). Hard delete bi chan. |
| Files | file_attachments | is_orphan=1 khi chua link. Cleanup job 6h xoa orphan > 24h. entity_type polymorphic ref. |

## 5.3 Critical Gotchas — Tranh Sai Khi Code
Day la nhung loi thuong gap khi implement. Doc truoc khi viet bat ky DB query nao.

| SAI (se gay bug) | DUNG | Anh Huong |
| --- | --- | --- |
| id INT / uint64 | id CHAR(36) — UUID string | Moi table |
| base_price | price (products table) | Products API |
| price_delta | price (toppings table) | Toppings API |
| image_url | image_path (object_path, tuong doi) | Products, Combos |
| staff_id tren orders | created_by (FK → staff) | Orders table |
| webhook_payload | gateway_data (JSON) | Payments table |
| Payment status 'success' | 'completed' | Payments table |
| orders.payment_method | Khong ton tai — o payments.method | Orders vs Payments |
| INSERT payment khi retry | UPDATE row hien co (UNIQUE constraint) | Payment idempotency |
| order_items.status column | Khong ton tai — derive tu qty_served | Order items |
| slug tren products/categories | Khong ton tai trong bat ky migration nao | Products API |

# 6. API ENDPOINTS OVERVIEW
Tat ca endpoints co tien to /api/v1. Authentication qua Bearer token trong Authorization header (ngoai tru webhook endpoints dung HMAC signature).

## 6.1 Auth Endpoints
| Method | Path | Role | Description |
| --- | --- | --- | --- |
| POST | /auth/login | Public | Dang nhap. Rate limit 5/phut/IP. Khong tiet lo loai loi cu the. |
| POST | /auth/refresh | Public | Lam moi access token tu httpOnly cookie. |
| POST | /auth/logout | Any auth | Xoa refresh token cua session hien tai. Session khac van active. |
| GET | /auth/me | Any auth | Thong tin user hien tai (staff info + role). |
| POST | /auth/guest | Public | QR customer: POST {table_id} → access token ngan han. (can them vao API_CONTRACT v1.2) |

## 6.2 Products Endpoints
| Method | Path | Role | Description |
| --- | --- | --- | --- |
| GET | /categories | Public | Danh sach categories dang active |
| GET | /products?category_id=&available= | Public | Danh sach products kem toppings. Redis cache 5p. |
| GET | /products/:id | Public | Chi tiet product kem toppings va category. |
| POST/PATCH/DELETE | /products, /categories, /toppings, /combos | Manager+ | CRUD. Soft delete. Cache invalidate. |

## 6.3 Orders Endpoints
| Method | Path | Role | Description |
| --- | --- | --- | --- |
| POST | /orders | Customer/Cashier+ | Tao don moi. Combo expand. 1-ban-1-don check. |
| GET | /orders | Cashier+ | Danh sach orders. Filter by status, date. |
| GET | /orders/:id | Auth | Chi tiet don. Customer chi xem don cua minh. |
| PATCH | /orders/:id/status | Cashier+ | Cap nhat order status. State machine enforce. |
| DELETE | /orders/:id | Customer/Cashier+ | Huy don. Check < 30% done. → 409 neu vi pham. |
| PATCH | /orders/:id/items/:itemId/status | Chef+ | KDS click: cycle pending → preparing → done. |
| GET | /orders/:id/events | Auth | SSE stream order tracking. Bearer header. |
| WS | /ws/kds | Chef+ | WebSocket KDS. Auth qua ?token=. Hub pattern. |

## 6.4 Payment & Webhook Endpoints
| Method | Path | Role | Description |
| --- | --- | --- | --- |
| POST | /payments | Cashier+ | Tao payment. order.status PHAI = 'ready'. 409 neu sai. |
| GET | /payments/:id | Cashier+ | Payment status + QR URL. |
| POST | /webhooks/vnpay | Public (HMAC) | VNPay IPN callback. Verify signature truoc. Response: RspCode 00. |
| POST | /webhooks/momo | Public (HMAC) | MoMo IPN callback. Verify HMAC-SHA256. |
| POST | /webhooks/zalopay | Public (HMAC) | ZaloPay callback. Verify HMAC-SHA256 voi key1. |

# 7. ERROR CODES (SINGLE SOURCE)
Tat ca FE va BE phai dung error codes nay. KHONG tu dinh nghia error code rieng trong bat ky spec hay component nao.

| Code | HTTP | Description | Triggered When |
| --- | --- | --- | --- |
| AUTH_001 | 401 | Token invalid hoac expired | JWT verify fail |
| AUTH_002 | 401 | Refresh token invalid | /auth/refresh that bai |
| AUTH_003 | 403 | Khong du quyen | Role check fail (RequireRole middleware) |
| ORDER_001 | 409 | Table da co active order | Tao order khi ban busy |
| ORDER_002 | 422 | Cancel khong duoc — >= 30% done | Vi pham cancel rule |
| ORDER_003 | 404 | Order khong ton tai | Get/update order by ID |
| ORDER_004 | 422 | Status transition khong hop le | State machine violation |
| PAYMENT_001 | 409 | Payment da ton tai cho order nay | Duplicate payment attempt |
| PAYMENT_002 | 422 | Webhook signature invalid | HMAC verify fail |
| PRODUCT_001 | 404 | Product khong ton tai hoac unavailable | Add to cart |
| FILE_001 | 413 | File qua lon (> 10MB) | Upload limit exceeded |
| FILE_002 | 415 | File type khong ho tro | Non-image/pdf upload |
| COMMON_001 | 400 | Validation error | Request body invalid |
| COMMON_002 | 500 | Internal server error | Unexpected error |
| COMMON_003 | 429 | Rate limit exceeded | Too many requests |

# 8. PHASE 1 IMPLEMENTATION PLAN
Thu tu thuc hien tuan theo dependency chain. KHONG lam nguoc:
- Migration SQL truoc tien: DDL la source of truth duy nhat. sqlc can SQL de generate code.
- sqlc queries sau SQL: sau moi migration → viet query SQL tuong ung → chay sqlc generate.
- BE truoc FE: FE khong the test neu API chua co.
- Auth truoc moi feature: moi endpoint deu can JWT middleware.

| # | Task | Output | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Migration SQL — tat ca Phase 1 tables | migrations/001-007.sql | FIRST | COMPLETE |
| 2 | sqlc setup + auth queries | query/auth.sql + generated Go code | FIRST | TODO |
| 3 | BE: Auth (login/refresh/logout/me) | /api/v1/auth/* + JWT middleware + RBAC | FIRST | TODO |
| 4 | sqlc: products queries | query/products.sql + generated | HIGH | TODO |
| 5 | BE: Products & Menu | /api/v1/products/* /categories/* /toppings/* /combos/* | HIGH | TODO |
| 6 | sqlc: orders queries | query/orders.sql + generated | HIGH | TODO |
| 7 | BE: Orders (create/list/get/cancel) | /api/v1/orders/* — state machine | HIGH | TODO |
| 8 | BE: Payments (create/webhook/update) | /api/v1/payments/* — 4 phuong thuc | MED | TODO |
| 9 | BE: KDS WebSocket hub | ws://…/api/v1/ws/kds — realtime kitchen | MED | TODO |
| 10 | BE: Order tracking SSE | /api/v1/orders/:id/events — SSE + Redis Pub/Sub | MED | TODO |
| 11 | FE: Auth flow | Login page, token store, interceptor, RBAC guard | HIGH | TODO |
| 12 | FE: Menu & Online Ordering | Menu page, topping modal, Zustand cart, checkout | HIGH | TODO |
| 13 | FE: KDS Screen | Full-screen, color-code 3 muc, sound alert, flag | MED | TODO |
| 14 | FE: POS Offline | 2-column cashier POS, 4 payment methods, print | MED | TODO |
| 15 | FE: Order Tracking | SSE progress bar, qty_served per item | MED | TODO |

# 9. KEY ACCEPTANCE CRITERIA
## 9.1 Auth Module
- Login 2 lan → 2 refresh tokens khac nhau → ca 2 deu valid (multi-session)
- Logout chi revoke session hien tai, khong anh huong session khac
- Admin deactivate staff → Redis cache xoa ngay → request tiep theo tra 401 ACCOUNT_DISABLED
- is_active check khong gay N+1 DB query (10 requests → chi 1 DB query)
- Rate limit: IP bi khoa sau 5 lan login sai trong 1 phut, khoa 15 phut

## 9.2 Order Module
- POST /orders tao dung order_items ke ca combo expand (tat ca trong 1 transaction)
- 1 ban 1 active order — tra 409 ORDER_001 khi vi pham
- State machine dung thu tu — khong skip transition
- Chef click KDS → status cycle → SSE push toi customer trong < 500ms
- Huy don < 30% → success; >= 30% → 409 ORDER_002
- Customer khong xem duoc don cua nguoi khac (403 AUTH_003)

## 9.3 Payment Module
- POST /payments tu choi neu order.status != 'ready' → 409
- COD → payment.status = completed + order.status = delivered ngay lap tuc
- Webhook verify signature HMAC dung — reject neu sai (PAYMENT_002)
- Webhook idempotent — goi 2 lan khong tao 2 payment record
- Amount mismatch giua webhook va DB → log + reject webhook
- WS broadcast 'payment_success' toi cashier sau webhook thanh cong

## 9.4 Security
- Access token KHONG ton tai trong localStorage (security audit)
- Tat ca secret keys lay tu env vars — khong hardcode bat ky secret nao trong code
- Moi webhook endpoint verify HMAC truoc bat ky business logic nao
- SQL queries dung parameterized (sqlc generated) — khong string concatenation

# 10. DESIGN SYSTEM (FRONTEND)
Single source of truth cho tat ca mau sac. KHONG hardcode HEX value ngoai bang nay. Dung Tailwind class tuong ung.

| Token | HEX | CSS Variable | Dung Cho |
| --- | --- | --- | --- |
| Primary / Accent | #FF7A1A | --color-primary | Gia tien, badge highlight, border highlight |
| Action / Button | #1F3864 | --color-action | Primary button, table header, page title |
| Dark Background | #0A0F1E | --color-bg-dark | Background trang toi, section divider |
| Card Background | #1F2937 | --color-bg-card | Card, modal background |
| Success / Green | #3DB870 | --color-success | Trang thai xong, badge success, progress bar |
| Warning / Yellow | #FCD34D | --color-warning | Ca sang, canh bao, sap het hang, KDS 10-20p |
| Error / Red | #FC8181 | --color-error | Het hang, huy don, KDS > 20 phut hoac flag |
| Gray Text | #9CA3AF | --color-text-muted | Text phu, placeholder, metadata |

## 10.1 KDS Color Coding (3 Muc)
| Muc Do | Mau | HEX | Dieu Kien |
| --- | --- | --- | --- |
| Normal | Trang / Card | #1F2937 | Moi vao — cho bep nhan (< 10 phut) |
| Warning | Vang | #FCD34D | Dang cho tu 10 – 20 phut |
| Urgent | Do | #FC8181 | Dang cho > 20 phut HOAC duoc flag 🚩 |

# 11. APPENDIX — OPEN ISSUES & DECISIONS
| ID | Issue | Status | Owner |
| --- | --- | --- | --- |
| OPEN-01 | Issue #5: order_items.status + flagged columns — Approach A (them column qua migration 008) vs Approach B (derive tu qty_served). Anh huong KDS FE logic. | PENDING | Lead + BA |
| OPEN-02 | Issue #7: POST /api/v1/auth/guest chua co trong API_CONTRACT v1.1. Can dinh nghia: token TTL, luu refresh_tokens khong, rate limit truoc khi code /table/[tableId]. | PENDING | Lead |
| D-001 | Quyet dinh dung sqlc thay vi GORM: performance, type-safety, khong ORM magic. | DECIDED | Lead |
| D-002 | UUID v4 cho PK: khong bi sequence leak, de merge across envs. | DECIDED | Lead |
| D-003 | DECIMAL(10,0) cho gia VND: VND khong co decimal, tranh float rounding bug. | DECIDED | Lead |
| D-004 | Access token in-memory (Zustand): tranh luu localStorage chong XSS attack. | DECIDED | Lead |
| D-005 | Combo expand tai order time: bep thay mon cu the, track qty_served chinh xac. | DECIDED | Lead |

BanhCuon Management System — BRD v1.0 — Thang 4/2026 — Confidential