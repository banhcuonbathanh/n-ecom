
**SOFTWARE REQUIREMENTS SPECIFICATION**
SRS v1.0
He Thong Quan Ly Quan Banh Cuon

| Document Type | Software Requirements Specification (SRS) |
| --- | --- |
| Version | 1.0 |
| Date | Thang 4 / 2026 |
| Status | Approved for Development |
| Standard | IEEE 830 (adapted) |
| Project | BanhCuon Restaurant Management System — Phase 1 |
| Prepared By | BA Team, Tech Lead, Product Owner |
| Reviewed By | CTO / Engineering Manager |

# 1. INTRODUCTION
## 1.1 Purpose
Tai lieu SRS nay mo ta day du cac yeu cau phan mem cho He Thong Quan Ly Quan Banh Cuon. No phuc vu nhu nen tang ky thuat cho qua trinh thiet ke, phat trien, kiem thu va chap nhan he thong. Tat ca cac ben lien quan (BA, Dev, QA, stakeholders) su dung tai lieu nay de dam bao thi cong dung huong.

## 1.2 Scope
He thong bao gom cac phan he:
- Customer Portal: dat hang online, chon topping/combo, thanh toan QR (VNPay/MoMo/ZaloPay/COD), theo doi don realtime qua SSE
- QR Table Ordering: khach quet QR tai ban → tu dong nhan ban → dat mon → theo doi bep
- Kitchen Display System (KDS): man hinh bep realtime dung WebSocket, color-code 3 muc do khan cap
- POS System: thu ngan tao don offline, xu ly thanh toan, in hoa don
- Management Dashboard: bao cao doanh thu, CRUD san pham/kho/nhan su
- Infrastructure: Docker Compose, Caddy HTTPS, CI/CD

## 1.3 Definitions & Abbreviations
| Term / Abbrev | Definition |
| --- | --- |
| KDS | Kitchen Display System — man hinh bep hien thi don hang realtime |
| POS | Point of Sale — he thong ban hang tai quay thu ngan |
| SSE | Server-Sent Events — giao thuc push mot chieu tu server den browser |
| JWT | JSON Web Token — token xac thuc co chu ky so, TTL 24h (access) / 30d (refresh) |
| RBAC | Role-Based Access Control — phan quyen theo vai tro: admin > manager > staff > chef|cashier |
| HMAC | Hash-based Message Authentication Code — ky so xac thuc webhook tu payment gateway |
| sqlc | Tool sinh type-safe Go code tu cac cau query SQL (thay cho ORM) |
| DXA | Document Xtended Attribute — don vi do luong trong DOCX (1440 DXA = 1 inch) |
| QR Token | CHAR(64) ngau nhien gan cho moi ban, tich hop vao QR code de xac dinh ban so |
| object_path | Duong dan tuong doi cua file trong storage bucket. Full URL = STORAGE_BASE_URL + object_path |
| UUID | Universally Unique Identifier v4, CHAR(36) — dung lam PK cho tat ca bang |

## 1.4 References
- BanhCuon_BRD_v1.docx — Business Requirements Document
- Execution_plan.docx (MASTER.docx) — Single Source of Truth cho business rules va config
- BanhCuon_DB_SCHEMA_SUMMARY.md — Database schema reference
- Spec_1 through Spec_5 — Domain-level specifications
- IEEE 830-1998 — Recommended Practice for Software Requirements Specifications

# 2. OVERALL DESCRIPTION
## 2.1 Product Perspective
He thong la mot ung dung web day du (full-stack) trien khai tren VPS rieng, khong phu thuoc cloud vendor. Kien truc gom:
- Frontend: Next.js 14 App Router, chay tren port 3000, giao tiep voi BE qua REST API va WebSocket/SSE
- Backend: Go 1.22 + Gin, chay tren port 8080, xu ly tat ca business logic
- Database: MySQL 8.0 luu du lieu quan he, Redis Stack luu cache/pub-sub/bloom-filter
- Reverse Proxy: Caddy tu dong cap HTTPS certificate, route /api/* → BE, /* → FE
- Payment Gateways: VNPay, MoMo, ZaloPay thong qua webhook callbacks

## 2.2 Product Functions (Summary)
| Functional Area | Key Capabilities |
| --- | --- |
| F1 — Authentication | Dang nhap bcrypt, JWT dual-token, RBAC 6 roles, multi-session, is_active check |
| F2 — Menu Management | CRUD categories/products/toppings/combos. Redis cache 5p. Soft delete. image_path (object_path) |
| F3 — Online Ordering | Customer flow: /menu → ToppingModal → cart Zustand → /checkout → POST /orders → SSE tracking |
| F4 — QR Table Ordering | QR scan → /auth/guest → table_id vao cart → flow giong online, them source=qr |
| F5 — Order State Machine | pending→confirmed→preparing→ready→delivered. Cancel < 30% done. 1 ban 1 active order. |
| F6 — KDS | WebSocket fullscreen, color-code 3 muc, click cycle item, flag 🚩, sound alert |
| F7 — POS | Cashier 2-cot layout, tao don offline, 4 payment methods, in hoa don Window.print() |
| F8 — Payment | VNPay/MoMo/ZaloPay QR + COD. HMAC verify. Idempotency. WS broadcast payment_success. |
| F9 — File Upload | POST /files/upload → luu object_path. is_orphan=1. Cleanup job 6h xoa orphan > 24h. |
| F10 — Realtime | WebSocket hub (KDS/live orders). SSE Redis Pub/Sub (order tracking). Exponential backoff. |

## 2.3 User Classes & Characteristics
| Role | Access Channel | Tech Proficiency | Special Constraints |
| --- | --- | --- | --- |
| customer | Mobile browser, QR scan | Low — touch-first UI | Anonymous/guest; token in-memory only |
| chef | Dedicated KDS monitor | Low — fullscreen, large touch | No keyboard needed; sound alert khi don moi |
| cashier | POS terminal/tablet | Medium | Offline-capable; in hoa don can printer |
| staff | KDS + POS | Medium | Gop quyen cua chef va cashier |
| manager | Desktop browser | High | Truy cap dashboard, reports, CRUD |
| admin | Desktop browser (secure) | High — IT staff | Full system access; nen gioi han IP |

## 2.4 Operating Environment
- Server: Linux VPS (Ubuntu 22.04+), Docker Compose 5 services
- Browser: Chrome 90+, Firefox 90+, Safari 15+, Edge 90+
- Mobile: iOS 14+ / Android 11+ (khach quet QR, chef KDS tablet)
- Network: HTTPS bat buoc (Caddy auto TLS). WebSocket wss:// tren production.
- Database: MySQL 8.0.16+ (can check constraint support), Redis Stack 7+

## 2.5 Assumptions & Dependencies
- Migration chay thanh cong theo thu tu: 001 → 002 → 003 → 004 → 005 → 006 → 007
- VNPay / MoMo / ZaloPay sandbox credentials duoc cap truoc khi test payment
- STORAGE_BASE_URL env var duoc cau hinh truoc khi FE render anh san pham
- Domain A record tro dung IP truoc khi khoi dong Caddy (de auto TLS hoat dong)
- Redis Stack (khong phai Redis don gian) de co Bloom Filter va Pub/Sub

# 3. SYSTEM FEATURES (FUNCTIONAL REQUIREMENTS)
Moi requirement co dinh dang: [ID] [Priority: MUST/SHOULD/COULD] [Description] [Rationale]
## 3.1 SF-AUTH — Authentication & Session Management
| ID | Pri | Requirement | Rationale / Note |
| --- | --- | --- | --- |
| SF-AUTH-01 | MUST | He thong phai xac thuc staff qua POST /api/v1/auth/login bang username+password. bcrypt cost=12. | Security baseline |
| SF-AUTH-02 | MUST | Sai credential: KHONG phan biet 'username sai' hay 'mat khau sai'. Luon tra ErrInvalidCredentials (401 AUTH_001). | Chong username enumeration |
| SF-AUTH-03 | MUST | Rate limit login: Redis key login_fail:{ip}, max 5 lan/phut, khoa 15 phut. Vuot nguong → 429 COMMON_003. | Chong brute force |
| SF-AUTH-04 | MUST | Access token: JWT HMAC-SHA256, TTL 24h, payload { staff_id, role, jti, exp }. Luu Zustand in-memory. KHONG localStorage. | Chong XSS |
| SF-AUTH-05 | MUST | Refresh token: 30 ngay, httpOnly cookie. Token hash SHA256 luu DB. Redis la fast-path, DB la fallback. | Persistence qua F5 |
| SF-AUTH-06 | MUST | Multi-session: moi login tao key moi auth:refresh:{staff_id}:{hash_prefix}. Logout chi xoa key session hien tai. | Nhieu thiet bi |
| SF-AUTH-07 | MUST | Middleware: parse JWT → verify algorithm (phai la HMAC-SHA256) → check blacklist → check is_active (Redis 5p cache). | Algorithm confusion attack prevention |
| SF-AUTH-08 | MUST | Admin deactivate staff: xoa cache auth:staff:{id} ngay → hieu luc trong vong < 1 request. Khong doi 5 phut. | Kha nang thu hoi quyen ngay |
| SF-AUTH-09 | MUST | POST /auth/guest { table_id } → tra access token ngan han cho khach QR. Token luu Zustand, cart kem table_id. | QR flow requirement |
| SF-AUTH-10 | SHOULD | Max 5 active sessions per staff. Khi > 5 → xoa session cu nhat (last_used_at ASC). | Resource management |

## 3.2 SF-PRD — Product & Menu Management
| ID | Pri | Requirement | Rationale / Note |
| --- | --- | --- | --- |
| SF-PRD-01 | MUST | GET /categories, /products, /toppings, /combos la public (khong can auth). Redis cache 5 phut, invalidate khi co CRUD. | SEO + performance |
| SF-PRD-02 | MUST | Field naming chinh xac: products.price (KHONG base_price), toppings.price (KHONG price_delta), products.image_path (KHONG image_url). | Dong bo voi migration |
| SF-PRD-03 | MUST | CRUD Manager+: tao/sua/xoa categories, products, toppings, combos. Soft delete: set is_active=false, khong xoa vat ly. | Audit trail |
| SF-PRD-04 | MUST | is_available: toggle nhanh het mon hom nay. is_active: an vinh vien. Ca 2 filter o public endpoint va KDS. | UX linh hoat |
| SF-PRD-05 | MUST | image_path luu duong dan tuong doi (object_path). Full URL = STORAGE_BASE_URL env var + image_path. FE tu ghep. | De doi storage provider |
| SF-PRD-06 | MUST | Khong co slug column trong bat ky bang nao (categories, products, combos). KHONG auto-generate slug. | Migration 002/004 khong co slug |
| SF-PRD-07 | MUST | Combo expand: combo_items la static template. Khi dat hang, BE expand thanh order_items rieng le kem combo_ref_id. | Bep nhin thay tung mon |
| SF-PRD-08 | MUST | Topping snapshot: luu gia tai thoi diem dat hang vao order_items.toppings_snapshot JSON, doc lap voi gia hien tai. | Gia khong doi sau khi dat |

## 3.3 SF-ORD — Order Management
| ID | Pri | Requirement | Rationale / Note |
| --- | --- | --- | --- |
| SF-ORD-01 | MUST | State machine bat buoc: pending→confirmed→preparing→ready→delivered. KHONG skip. Vi pham → 422 ORDER_004. | Business integrity |
| SF-ORD-02 | MUST | 1 ban max 1 ACTIVE order (status IN pending, confirmed, preparing, ready). Vi pham → 409 ORDER_001. | Tranh don trung ban |
| SF-ORD-03 | MUST | Order number: ORD-YYYYMMDD-NNN. Redis INCR order_seq:{YYYYMMDD} TTL 2 ngay. Fallback: order_sequences table. | Sequential, con nguoi doc duoc |
| SF-ORD-04 | MUST | POST /orders KHONG co payment_method trong payload. FE luu vao Zustand. source: online|qr|pos. | Orders va payments tach biet |
| SF-ORD-05 | MUST | Combo expand trong DB transaction: tat ca order_item rows (parent + sub-items) trong 1 atomic operation. | Data consistency |
| SF-ORD-06 | MUST | Cancel rule: SUM(qty_served)/SUM(quantity) < 0.30. Vi pham → 409 ORDER_002. | Business rule tu MASTER §4.2 |
| SF-ORD-07 | MUST | total_amount DENORMALIZED — service PHAI goi recalculateTotalAmount(orderId) sau moi mutation de tranh drift. | Payment accuracy |
| SF-ORD-08 | MUST | order_items: KHONG co status column, KHONG co flagged column. Derive status tu qty_served: 0=pending, 0<x<qty=preparing, x=qty=done. | Migration 005 v1.2 |
| SF-ORD-09 | MUST | Customer chi xem duoc don cua minh (JWT claim match voi order guest token). Cashier+ xem duoc tat ca don. | Privacy |
| SF-ORD-10 | MUST | orders.created_by (FK → staff, co the NULL). KHONG phai staff_id. | Migration 005 column name |

## 3.4 SF-PAY — Payment Processing
| ID | Pri | Requirement | Rationale / Note |
| --- | --- | --- | --- |
| SF-PAY-01 | MUST | Payment chi tao khi order.status='ready'. Truoc do → 409 PAYMENT_001. Cashier khong bypass duoc. | MASTER §4.3 R-PAY-01 |
| SF-PAY-02 | MUST | UNIQUE(order_id): retry phai UPDATE row hien co (attempt_count++), KHONG INSERT moi. Idempotency. | Double-charge prevention |
| SF-PAY-03 | MUST | Webhook: verify HMAC TRUOC bat ky logic nao. VNPay: HMAC-SHA512 sorted params. MoMo/ZaloPay: HMAC-SHA256. | MASTER §4.2 R-PAY-03 |
| SF-PAY-04 | MUST | Verify amount: so sanh webhook amount voi payment.amount trong DB. Lech → log + reject (khong update status). | Chong gian lan so tien |
| SF-PAY-05 | MUST | Payment status: pending/completed/failed/refunded. KHONG dung 'success'. gateway_data luu raw payload. | Migration 006 v1.2 schema |
| SF-PAY-06 | MUST | Hard delete payments bi chan. Chi dung deleted_at (soft delete). Audit compliance. | Legal / financial audit |
| SF-PAY-07 | MUST | Sau webhook completed: broadcast WS event payment_success { order_id, payment_id, amount, method } toi cashier. | Realtime UX |
| SF-PAY-08 | MUST | COD: payment.status=completed + order.status=delivered ngay lap tuc (khong can webhook). Cashier xac nhan thu tien. | Offline flow |
| SF-PAY-09 | MUST | VNPay response: RspCode=00 (plain text, khong phai JSON). MoMo/ZaloPay: theo format cua tung gateway. | Gateway spec compliance |

## 3.5 SF-RT — Realtime Communication
| ID | Pri | Requirement | Rationale / Note |
| --- | --- | --- | --- |
| SF-RT-01 | MUST | WebSocket KDS: wss://{host}/api/v1/ws/kds. Auth: ?token={jwt} query param. Hub pattern, 1 goroutine/client. | WS browser khong support custom header |
| SF-RT-02 | MUST | WebSocket heartbeat: server ping moi 30s. Client phai pong trong 10s. Khong pong → dong ket noi. | Phat hien client mat ket noi |
| SF-RT-03 | MUST | SSE Order Tracking: GET /api/v1/orders/:id/events. Auth: Authorization Bearer header. KHONG dung query param cho token. | Security: token trong URL bi log |
| SF-RT-04 | MUST | SSE heartbeat: ': keep-alive' comment moi 15 giay. Ngan reverse proxy dong ket noi. | Proxy timeout prevention |
| SF-RT-05 | MUST | SSE Redis channel: order:{order_id}:events (KHONG phai order:{order_id}:channel). Publish tu BE khi item/order thay doi. | MASTER §8 key schema |
| SF-RT-06 | MUST | FE reconnect: maxAttempts=5, baseDelay=1000ms, x2 moi lan, maxDelay=30000ms. Hien banner sau 3 lan that bai. | Dong nhat WS va SSE reconnect config |
| SF-RT-07 | MUST | WS KDS message types: new_order | item_updated | order_cancelled | order_flagged. JSON: { type, payload }. | Frontend contract |
| SF-RT-08 | MUST | SSE event types: order_status_changed | item_progress | order_completed. FE xu ly tung type rieng. | Frontend contract |

## 3.6 SF-FILE — File Upload & Management
| ID | Pri | Requirement | Rationale / Note |
| --- | --- | --- | --- |
| SF-FILE-01 | MUST | POST /api/v1/files/upload → luu file, tra object_path. Gioi han 10MB, chi chap nhan image/* va application/pdf. | FILE_001, FILE_002 error codes |
| SF-FILE-02 | MUST | Upload moi: is_orphan=1 (chua link). Sau khi lien ket voi entity → is_orphan=0 + set entity_type + entity_id. | Tranh file rac |
| SF-FILE-03 | MUST | Cleanup job moi 6 gio: xoa file co is_orphan=1 AND created_at < NOW() - 24h. Chay goroutine rieng, co panic recover. | Tiet kiem storage |

# 4. EXTERNAL INTERFACE REQUIREMENTS
## 4.1 User Interface Requirements
| UI Requirement | Detail |
| --- | --- |
| Responsive | Mobile-first (min 360px). Customer pages phai dung tren iOS 14+ / Android 11+. |
| Design Tokens | KHONG hardcode HEX. Dung CSS variable / Tailwind class tu MASTER §2. Primary: #FF7A1A. Action button: #1F3864. |
| KDS Fullscreen | background #0A0F1E, khong co navbar. Color-code: trang (<10p), vang (10-20p), do (>20p hoac flag). |
| Loading States | Dung <Skeleton> component (shadcn). KHONG dung spinner tru button submit. Empty state phai co message + action. |
| Error Feedback | API error → toast.error(message). Form validation error → inline text do ngay duoi field. |
| Currency Format | Moi gia tien hien thi qua formatVND(). Output: '45.000 ₫'. KHONG hien thi so thap phan. |

## 4.2 Software Interface Requirements
| Interface | Specification |
| --- | --- |
| MySQL 8.0 | Driver: Go standard database/sql + github.com/go-sql-driver/mysql. Context timeout 5s cho moi query. |
| Redis Stack 7+ | Client: go-redis/v9. Bloom filter (RF.ADD, RF.EXISTS), Pub/Sub, String, Counter. KHONG dung redis-cli trong code. |
| VNPay Gateway | HMAC-SHA512. Sort params alphabetically (tru vnp_SecureHash). Response format: RspCode=00 (plain text). |
| MoMo Gateway | HMAC-SHA256. Signature string theo MoMo docs. Endpoint: sandbox test-payment.momo.vn. |
| ZaloPay Gateway | HMAC-SHA256 voi key1. Endpoint: sb-openapi.zalopay.vn/v2/create. |
| Caddy Reverse Proxy | Auto TLS (ACME). Route /api/* → backend:8080, /* → frontend:3000. WebSocket upgrade tu dong. |

## 4.3 Communication Interface Requirements
- HTTPS bat buoc tren production cho tat ca giao tiep (REST, WebSocket wss://, SSE)
- WebSocket: RFC 6455. Ping/Pong heartbeat. Gorilla WebSocket library (Go).
- SSE: text/event-stream Content-Type. Cache-Control: no-cache. Connection: keep-alive.
- REST: JSON request/response. Content-Type: application/json. CORS origin tu env var.
- Payment webhook: HTTPS callback URL (Caddy). Gateway goi POST den /api/v1/webhooks/{gateway}.

# 5. SYSTEM QUALITY ATTRIBUTES
## 5.1 Performance Requirements
| Attribute | Requirement | Measurement |
| --- | --- | --- |
| API Latency | REST endpoints thua man nguong nay | P95 < 200ms (ngoai tru external payment API call) |
| Cache Hit | Public product endpoints co cache hit cao | > 80% trong gio cao diem |
| WS Latency | KDS nhan order event sau khi tao don | < 100ms end-to-end (same datacenter) |
| DB Timeout | Context timeout cho moi DB call | 5s cho queries, 10s cho external API |
| Concurrent WS | KDS hub ho tro nhieu client dong thoi | >= 10 concurrent WS connections (Phase 1) |

## 5.2 Security Requirements
| Requirement | Implementation Detail |
| --- | --- |
| Token Security | Access token: Zustand in-memory. Refresh token: httpOnly cookie. KHONG localStorage. KHONG URL query param cho token. |
| Password Storage | bcrypt cost=12 (~200ms). KHONG reversible hash. KHONG plain text. |
| Webhook Security | HMAC signature verify TRUOC logic. Reject sai signature voi 422 PAYMENT_002. Log tat ca failed attempts. |
| SQL Injection | sqlc generated parameterized queries. KHONG string concatenation trong SQL. KHONG raw query voi user input. |
| Secrets Management | KHONG hardcode secret trong code. Tat ca tu env vars. .env trong .gitignore. Pre-commit hook kiem tra. |
| Algorithm Confusion | Verify t.Method == jwt.SigningMethodHMAC truoc khi parse JWT. Reject neu la 'none' hoac RS256. |

## 5.3 Reliability Requirements
- Background jobs (cleanup, payment timeout): chay trong goroutine rieng. Bat buoc co panic recover. Log moi error.
- Payment webhook: idempotent — goi nhieu lan cho cung payment_id chi xu ly mot lan (check status truoc).
- Database transaction: combo expand va inventory deduction phai trong DB transaction. Rollback khi bat ky buoc that bai.
- Bloom filter: fast-path existence check truoc DB query. DB la fallback (KHONG chi phu thuoc Redis).

## 5.4 Maintainability
- sqlc: tat ca DB access qua sqlc generated code. KHONG ORM, KHONG raw SQL voi user input.
- Middleware order: Logger → Recovery → CORS → RateLimit → Auth → RoleCheck → Handler.
- Error wrap: dung fmt.Errorf('context: %w', err) — tranh mat stack trace.
- Context propagation: truyen ctx qua moi layer (handler → service → repository).
- Migration: KHONG sua file migration da chay. Them thay doi qua migration file moi (NNN+1).

# 6. CONSTRAINTS & COMPLIANCE
## 6.1 Development Constraints
| Constraint | Detail |
| --- | --- |
| Migration Order | 001_auth → 002_products → 003_tables → 004_combos → 005_orders → 006_payments → 007_files. Bat buoc theo thu tu nay. |
| No ECC Pattern | Khong dung Error-Code-Constant pattern ma dung fmt.Errorf wrap. Tat ca error codes trong MASTER §7. |
| sqlc Only | Khong GORM, khong sqlx, khong bun. Chi sqlc voi database/sql standard library. |
| No Slug | Khong co slug column trong categories, products, combos. Khong auto-generate slug. API khong expose slug field. |
| Payment Confirm | Phai confirm truoc khi chay bat ky code payment nao — anh huong tien that. |

## 6.2 Documentation Requirements
- MASTER.docx la single source of truth. KHONG duplicate business rule sang spec file.
- migration SQL la DDL source of truth. Spec chi reference, KHONG lap lai CREATE TABLE.
- API_CONTRACT.docx phai sync voi moi endpoint moi truoc khi implement.
- Moi thay doi env var: update .env.example + MASTER §9 + thong bao team.

BanhCuon System — SRS v1.0 — Thang 4/2026 — Confidential