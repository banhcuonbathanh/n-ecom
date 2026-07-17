| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
CASE STUDY PROMPT TOOLKIT
Tất cả Domain Prompts — Auth · Products · Orders & KDS · Payments · Files · Staff
CLAUDE_CASESTUDY_PROMPTS.docx  ·  v1.1  ·  ECC-Free  ·  Tháng 4 / 2026 |
| --- |

| ℹ️  File này chứa tất cả prompts để tạo Case Study cho 6 domains của BanhCuon System.
Đọc CLAUDE_CASESTUDY.docx §1–§4 trước khi dùng bất kỳ prompt nào.
Auth Case Study đã done — dùng BanhCuon_Auth_CaseStudy_EXPLAINED_v1_2.docx làm reference model.
Thứ tự tạo case study PHẢI theo MASTER.docx §0.2 — task dependency order. |
| --- |

## §0 — Cách Dùng File Này

| Trigger | Action |
| --- | --- |
| Muốn tạo case study domain X | Copy prompt tương ứng trong §1–§6 → paste vào Claude với đầy đủ project files attached |
| Muốn thêm flow vào case study có sẵn | Đọc CLAUDE_CASESTUDY.docx §1 → đọc existing case study → dùng prompt trong cột Extension |
| Muốn verify case study đủ chưa | Đối chiếu với CLAUDE_CASESTUDY.docx §2.2 checklist — 8 checks bắt buộc |
| Domain chưa có BE code | DỪNG — đợi BE task done. MASTER.docx §0.2 là thứ tự bắt buộc |

## §0.1 — Thứ Tự Thực Hiện (Bắt Buộc Theo MASTER.docx §0.2)

| # | Domain | Dependency (BE Task) | Priority | Status |
| --- | --- | --- | --- | --- |
| 1 | Auth & JWT (§1) | BE Task 3 — Auth API | 🔴 DONE | ✓ Done |
| 2 | Products & Menu (§2) | BE Task 5 — Products API | 🟠 HIGH | ☐ Todo |
| 3 | Orders & KDS (§3) | BE Task 7 — Orders API + WS | 🟠 HIGH | ☐ Todo |
| 4 | Payments (§4) | BE Task 8 — Payments | 🟡 MED | ☐ Todo |
| 5 | Files & Uploads (§5) | BE Task 12 — File upload | 🟡 MED | ☐ Todo |
| 6 | Staff Management (§6) | BE Task (staff CRUD) | 🟢 LOW | ☐ Todo |

## §0.2 — Quality Gate: Checklist Truoc Khi Dung Bat Ky Prompt
*v1.1 NEW — Verify truoc khi chay bat ky prompt trong §1–§6. Dung nhu checklist 2 phut. Neu bat ky item nao FAIL → DUNG, giai quyet truoc.*
| # | Check | PASS → Lam Gi | FAIL → Lam Gi |
| --- | --- | --- | --- |
| QG1 | BE task tuong ung co trong §0.1 cot 'Status' la ✓ Done chua? | Tiep tuc | 🔴 DUNG — doi BE task done. Case study thieu code thuc te = vo nghia |
| QG2 | Migration SQL cua domain da chay thanh cong tren dev env chua? (goose status) | Tiep tuc | 🔴 DUNG — schema co the thay doi. Case study sai toan bo neu dua tren DDL cu |
| QG3 | Open Questions lien quan den domain co status 'OPEN' trong Auth CaseStudy §8 khong? | Neu khong → tiep tuc | ⚠️ Resolve OQ truoc. Dac biet QG3 cho §6 Staff: OQ-001 customer role phai duoc BA arbitrate truoc |
| QG4 | Domain co conflict voi MASTER.docx §4 business rules khong? Doc lai §4 truoc. | Tiep tuc | 🔴 DUNG — notify BA + Lead, update MASTER §4 truoc khi case study |
| QG5 | File output cua domain nay da ton tai chua? (xem §7 checklist) | Tao moi | Rebuild — doc lai existing file de avoid duplicate effort |

| ✅  §1 — Auth & JWT
CLAUDE_CASESTUDY.docx — Reference Model | BanhCuon_Auth_CaseStudy_EXPLAINED_v1_2.docx |
| --- |

| ✓ DONE — Dùng làm reference model cho tất cả domain khác |
| --- |

| ℹ️  Auth Case Study đã hoàn chỉnh trong BanhCuon_Auth_CaseStudy_EXPLAINED_v1_2.docx.
Prompt bên dưới chỉ dùng khi cần tạo lại hoặc thêm flows mới.
Mọi domain khác PHẢI copy structure từ Auth Case Study. |
| --- |

### Prompt — Tạo / Rebuild Auth Case Study

| Tạo case study đầy đủ cho domain Auth của hệ thống BanhCuon.
 
Đọc trước: MASTER.docx §3 (RBAC), §6 (JWT config), §7 (error codes),
§8 (Redis keys), migrations/001_auth.sql (v1.2), docs/specs/001_auth.docx.
 
Cấu trúc bắt buộc (7 sections):
- Section 0: Module overview — file structure, responsibilities, core design decisions
- Section 1: Data flows
  1.1 POST /auth/login
  1.2 POST /auth/refresh
  1.3 POST /auth/logout
  1.4 GET /auth/me
- Section 2: Reference tables — RBAC matrix, JWT config, Redis keys
- Section 3: Case studies (happy path) — CS1–CS6
- Section 4: Security threat model table
- Section 5: QR Guest Session extension design
- Section 6: Edge case studies CS7–CS9
 
Case studies required:
CS1: Login thành công — chef đăng nhập, nhận access + refresh token
CS2: Login fail — sai password 5 lần → rate limit 15 phút (login_fail:{ip})
CS3: Token refresh — access token hết hạn, dùng httpOnly cookie refresh
CS4: Logout — add jti vào Redis blacklist, xóa refresh token DB
CS5: Session cap — login device thứ 6 → xóa session cũ nhất (last_used_at ASC)
CS6: RBAC fail — chef cố gắng truy cập manager endpoint → AUTH_003 403
CS7-CS9: QR Guest flow — anonymous customer quét QR → table-scoped JWT
 
Format: real data trong step tables.
Layer names: Client → Gin Router → RateLimit MW → AuthRequired MW → RBAC MW
             → AuthHandler → AuthService → AuthRepo → pkg/jwt → pkg/bcrypt
             → MySQL → Redis
Output: BanhCuon_Auth_CaseStudy_v1_0.docx |
| --- |

| 🛒  §2 — Products & Menu
Tạo sau khi BE Task 5 hoàn thành | 7 flows · 6 case studies |
| --- |

| 🟠 HIGH PRIORITY — Tạo sau Auth |
| --- |

### §2.1 — Case Studies Required

| CS # | Mô Tả |
| --- | --- |
| CS1 | Customer xem menu — GET /products, bloom filter EXISTS → DB query → cache result |
| CS2 | Cache hit — GET /products lần 2 → Redis hit, không query DB |
| CS3 | Manager tạo sản phẩm mới — upload ảnh (object_path), set price DECIMAL(10,0) |
| CS4 | Chef thử POST /products → RBAC MW: role 'chef' < required 'manager' → 403 AUTH_003 |
| CS5 | Admin xóa toàn bộ combo — combo_items CASCADE, products RESTRICT (order_items ref) |
| CS6 | Topping snapshot — lúc đặt hàng, toppings_snapshot JSON capture price hiện tại |

### §2.2 — Prompt — Tạo Case Study Products

| Tạo case study đầy đủ cho domain Products & Menu của hệ thống BanhCuon.
 
Đọc trước:
- MASTER.docx §2 (design tokens), §3 (RBAC), §4 (business rules),
  §7 (error codes), §8 (Redis keys — bloom:product_ids)
- migrations/002_products.sql (v1.1) — tables: categories, products, toppings, product_toppings
- migrations/004_combos.sql (v1.1) — tables: combos, combo_items
- docs/specs/002_products.docx — endpoints, AC, sqlc queries
- API_CONTRACT.docx §3 — Products endpoints
 
File structure (Section 0):
- internal/handler/product_handler.go
  → ListProducts, GetProduct, CreateProduct, UpdateProduct, DeleteProduct,
    ListCategories, ListToppings, ListCombos
- internal/service/product_service.go
  → availability check, cache invalidation, combo expand logic
- internal/repository/product_repo.go
  → sqlc wrappers: GetProducts (filtered), GetComboWithItems, GetProductWithToppings
- be/pkg/redis/bloom.go
  → Bloom filter: Exists("product_ids", product_id)
- internal/middleware/rbac.go
  → Public GET (no auth), AtLeast("manager") cho CUD
 
Data flows (Section 1):
1.1 GET /api/v1/products — List products (public, no auth)
1.2 GET /api/v1/products/:id — Get single product with toppings
1.3 POST /api/v1/products — Create product (manager only)
1.4 PATCH /api/v1/products/:id — Update product
1.5 DELETE /api/v1/products/:id — Soft delete (deleted_at)
1.6 GET /api/v1/combos/:id — Get combo with items (expansion template)
1.7 GET /api/v1/categories — List categories
 
Case studies (Section 3):
CS1: Customer xem menu — bloom filter EXISTS → DB query → cache result
CS2: Cache hit — GET /products lần 2 → Redis hit, không query DB
CS3: Manager tạo sản phẩm mới — upload ảnh (object_path), price DECIMAL(10,0)
CS4: Chef thử POST /products → RBAC: role "chef" < "manager" → 403 AUTH_003
CS5: Admin xóa combo — combo_items CASCADE, products RESTRICT
CS6: Topping snapshot — toppings_snapshot JSON capture price tại order time
 
Security threat model (Section 4):
- Unauthorized CUD: RBAC MW enforce AtLeast("manager")
- Price manipulation: price từ DB, không từ client request body
- Bloom false positive: bloom.Exists()=true nhưng DB miss → PRODUCT_001 404
- Object path traversal: validate object_path không chứa "../"
 
Format: real data trong step tables
  (product_id="pho-cuon-uuid", price=35000, category_id="banh-cuon-cat-uuid")
Output: BanhCuon_Products_CaseStudy_v1_0.docx

Flag bat ky risk nao ban phat hien ngoai scope prompt nay — dung bo qua. |
| --- |

| 📋  §3 — Orders & KDS
Domain phức tạp nhất | State machine · Combo expand · WebSocket · SSE | 7 flows · 7 case studies |
| --- |

| 🟠 HIGH PRIORITY — Tạo sau Products |
| --- |

| 🚨 Key Design Decisions phải document rõ trong Section 0:
  D-005: Combo expand xảy ra tại CREATE time (không phải display time) — MASTER.docx §4.1
  chk_oi_item_type: 3 valid row types, ghost rows bị reject tại DB layer (005_orders.sql v1.2)
  total_amount DENORMALIZED: phải gọi RecalculateTotalAmount() sau mọi order_items mutation |
| --- |

### §3.1 — Case Studies Required

| CS # | Mô Tả |
| --- | --- |
| CS1 | Customer online đặt 2 món + 1 combo → combo expand → WS broadcast → SSE publish |
| CS2 | QR table order — source='qr', table-scoped JWT, created_by=NULL |
| CS3 | Chef update qty_served: 0→1→2 (100%) → order ready → SSE order_complete |
| CS4 | Cancel OK — SUM(qty_served)=1 / SUM(qty)=4 = 25% < 30% → cancel allowed |
| CS5 | Cancel blocked — ratio=50% >= 30% → ORDER_002 422 |
| CS6 | Race condition — 2 concurrent POST /orders cùng table → ORDER_001 409 cho request thứ 2 |
| CS7 | Chef flag order 🚩 → WS broadcast order_flagged → KDS highlight đỏ urgent |

### §3.2 — Prompt — Tạo Case Study Orders & KDS

| Tạo case study đầy đủ cho domain Orders & KDS của hệ thống BanhCuon.
 
Đọc trước:
- MASTER.docx §4.1 (Order State Machine), §4.2 (Cancel Rule: SUM(qty_served)/SUM(quantity) < 0.30),
  §4.5 (One Active Order Rule), §5.1 (WebSocket config), §5.2 (SSE config),
  §7 (error codes: ORDER_001–004)
- migrations/005_orders.sql (v1.2) — order_sequences, orders, order_items
  (chk_oi_item_type constraint, total_amount drift risk)
- migrations/003_tables.sql (v1.2) — tables: tables (qr_token, status)
- docs/specs/003_orders_kds.docx — endpoints, AC, sqlc queries
- API_CONTRACT.docx §4 — Orders endpoints
 
File structure (Section 0):
- internal/handler/order_handler.go
  → CreateOrder, GetOrder, ListOrders, CancelOrder, UpdateOrderStatus
- internal/handler/order_item_handler.go
  → UpdateQtyServed (chef), FlagOrderItem
- internal/service/order_service.go
  → State machine, cancel rule, combo expand at create time,
    One Active Order Rule, RecalculateTotalAmount
- internal/repository/order_repo.go
  → sqlc: CreateOrderWithItems (TX), GetActiveOrderByTableID, RecalculateTotalAmount
- internal/websocket/hub.go (System Dev)
  → Broadcast new_order / item_updated / order_cancelled / order_flagged
- internal/sse/handler.go (System Dev)
  → SSE stream: subscribe order:{order_id}:events Redis channel
 
Data flows (Section 1):
1.1 POST /api/v1/orders — Create order (3 variants: online / qr / pos)
1.2 GET /api/v1/orders/:id — Get order with items
1.3 PATCH /api/v1/orders/:id/cancel — Cancel (state machine + 30% rule)
1.4 PATCH /api/v1/order-items/:id/qty — Chef update qty_served
1.5 PATCH /api/v1/orders/:id/status — Status transition (cashier/chef)
1.6 WebSocket — KDS broadcast on new_order event
1.7 GET /api/v1/orders/:id/stream — SSE order tracking
 
Case studies (Section 3):
CS1: Customer online đặt 2 món + 1 combo "Combo Bánh Cuốn"
  → BE expand combo_items thành 2 order_item sub-rows (combo_ref_id set)
  → RecalculateTotalAmount → WS broadcast new_order → SSE publish pending
CS2: QR table order — JWT has table_id claim → source='qr', created_by=NULL
CS3: Chef update qty_served: qty=2 → qty_served=1 → qty_served=2
  → all items 100% → status=ready → SSE order_complete
CS4: Cancel OK — ratio=25% < 30% → cancelled → refund trigger nếu đã paid
CS5: Cancel blocked — ratio=50% >= 30% → ORDER_002 422
CS6: Race condition — 2 concurrent POST /orders cùng table_id
  → TX1 COMMIT, TX2 INSERT fails → ORDER_001 409
CS7: Chef flag 🚩 → WS broadcast order_flagged → KDS highlight urgent
 
Security threat model (Section 4):
- Race condition: SELECT+INSERT trong TX SERIALIZABLE + One Active Order Rule
- Customer xem order người khác: validate order.created_by == claims.StaffID
- Chef cancel: RequireRole("cashier" minimum) cho cancel endpoint
- qty_served > quantity: DB CHECK constraint — DB layer enforcement
- total_amount drift: RecalculateTotalAmount() mandatory + unit tests
 
🚨 Phải document rõ trong Section 0:
- D-005: Combo expand tại CREATE time
- chk_oi_item_type: 3 valid row types
- total_amount DENORMALIZED: recalculate sau mọi mutation
 
Format: real data
  (order_id="ord-abc-uuid", order_number="ORD-20260420-001",
   table_id="table-05-uuid", combo_id="combo-bc-uuid", amount=95000)
Output: BanhCuon_Orders_CaseStudy_v1_0.docx

Flag bat ky risk nao ban phat hien ngoai scope prompt nay — dung bo qua. |
| --- |

| 💳  §4 — Payments
HMAC verify là critical | Idempotency + retry flow | 6 flows · 6 case studies |
| --- |

| 🟡 MEDIUM PRIORITY — Tạo sau Orders |
| --- |

| 🚨 R-PAY-03 (MASTER.docx §4.3): Verify HMAC signature TRƯỚC KHI xử lý bất kỳ callback nào.
🚨 UNIQUE(order_id): retry phải UPDATE existing row, KHÔNG INSERT new row.
⚠️ VNPay webhook response format: RspCode=00 (không phải JSON) — phải implement đúng. |
| --- |

### §4.1 — Case Studies Required

| CS # | Mô Tả |
| --- | --- |
| CS1 | Tạo VNPay payment — chỉ khi order.status=ready → INSERT pending → SET timeout 15min Redis |
| CS2 | VNPay webhook OK — HMAC-SHA512 verify → ResponseCode=00 → status=completed |
| CS3 | Invalid signature → HMAC mismatch → RspCode=97 → PAYMENT_002 422 |
| CS4 | Duplicate webhook (idempotency) — status đã completed → SKIP → return RspCode=00 |
| CS5 | Payment timeout — Redis keyspace expired → status=failed → attempt_count tracked |
| CS6 | Cash COD flow — INSERT pending → cashier confirm → status=completed (no webhook) |

### §4.2 — Prompt — Tạo Case Study Payments

| Tạo case study đầy đủ cho domain Payments của hệ thống BanhCuon.
 
Đọc trước:
- MASTER.docx §4.3 (Payment Rules: chỉ tạo khi order.status=ready,
  verify signature trước xử lý, idempotency, 4 phương thức),
  §7 (PAYMENT_001, PAYMENT_002), §8 (Redis: payment_timeout:{id} TTL 15 phút)
- migrations/006_payments.sql (v1.2)
  — UNIQUE(order_id), attempt_count, refunded_amount, deleted_at
- docs/specs/004_payments.docx — endpoints, AC, sqlc queries
- API_CONTRACT.docx §5 — Payments endpoints
- CLAUDE_SYSTEM.docx §4 — VNPay HMAC-SHA512 verify algorithm
 
File structure (Section 0):
- internal/handler/payment_handler.go
  → CreatePayment, GetPayment, HandleVNPayWebhook,
    HandleMoMoCallback, HandleZaloPayCallback, ConfirmCash
- internal/service/payment_service.go
  → Create guard (order.status=ready), idempotency check,
    timeout trigger, refund on cancel
- internal/payment/vnpay.go (System Dev)
  → CreatePaymentURL(), VerifyWebhook() HMAC-SHA512
- internal/payment/momo.go (System Dev)
  → CreatePayment(), VerifyCallback() HMAC-SHA256
- internal/payment/zalopay.go (System Dev)
  → CreateOrder(), VerifyCallback() HMAC-SHA256
- internal/jobs/payment_timeout.go (System Dev)
  → Redis keyspace __keyevent@0__:expired → mark failed
 
Data flows (Section 1):
1.1 POST /api/v1/payments — Create payment (guard: order.status=ready)
1.2 POST /payments/vnpay/webhook — HMAC verify → update
1.3 POST /payments/momo/callback — MoMo callback
1.4 POST /payments/zalopay/callback — ZaloPay callback
1.5 POST /api/v1/payments/:id/confirm-cash — Cashier confirm COD
1.6 Redis keyspace → payment_timeout.go — background job
 
Retry flow (document trong Section 5):
- UNIQUE(order_id) → retry = UPDATE (không INSERT)
- UPDATE SET status='pending', attempt_count=attempt_count+1,
  gateway_ref=?, expires_at=NOW()+15min WHERE order_id=? AND status='failed'
 
Case studies (Section 3):
CS1: Tạo VNPay payment (order ORD-20260420-001, amount=95000)
  → INSERT payments (pending, attempt_count=1)
  → SET payment_timeout:{id} TTL=900s → return VNPay URL
CS2: VNPay webhook → sort params → HMAC-SHA512 → compare vnp_SecureHash
  → match + ResponseCode='00' → check status=pending
  → UPDATE status=completed, paid_at=NOW(), gateway_data={raw}
CS3: Webhook invalid signature → HMAC mismatch
  → return RspCode=97 (format VNPay, không phải JSON) → PAYMENT_002 422
CS4: Duplicate webhook — verify OK → check status='completed'
  → SKIP update → return RspCode=00 (idempotent)
CS5: payment_timeout Redis key expires → keyspace notification
  → fetch payment → status=pending → UPDATE status=failed, attempt_count++
CS6: Cash COD — method=cash → INSERT pending (no expires_at)
  → POST confirm-cash → UPDATE status=completed, paid_at=NOW()
 
Security threat model (Section 4):
- Webhook giả mạo: HMAC verify TRƯỚC mọi DB operation (R-PAY-03)
- Replay attack: idempotency (completed → skip)
- Double payment: UNIQUE(order_id) → PAYMENT_001 409
- Amount tampering: amount từ DB order.total_amount, không từ webhook
 
Format: real data
  (payment_id="pay-xyz-uuid", order_id="ord-abc-uuid", amount=95000,
   vnp_TxnRef="ORD-20260420-001-1745123456", vnp_ResponseCode="00")
Output: BanhCuon_Payments_CaseStudy_v1_0.docx

Flag bat ky risk nao ban phat hien ngoai scope prompt nay — dung bo qua. |
| --- |

| 📁  §5 — Files & Uploads
Orphan cleanup job là core feature | 4 flows · 4 case studies |
| --- |

| 🟡 MEDIUM PRIORITY — Song song với Payments |
| --- |

### §5.1 — Case Studies Required

| CS # | Mô Tả |
| --- | --- |
| CS1 | Upload ảnh bill — multipart 2MB → is_orphan=1 → return {file_id, object_path} |
| CS2 | Upload 15MB → middleware size check trước khi đọc body → FILE_001 413 |
| CS3 | Cleanup job tick 06:00 — SELECT orphan > 24h → DELETE batch → log |
| CS4 | Link file vào order — entity_type='order', entity_id set, is_orphan=0 |

### §5.2 — Prompt — Tạo Case Study Files

| Tạo case study đầy đủ cho domain Files & Uploads của hệ thống BanhCuon.
 
Đọc trước:
- MASTER.docx §7 (FILE_001: >10MB, FILE_002: wrong type),
  §9 (STORAGE_BASE_URL, STORAGE_BUCKET)
- migrations/007_files.sql (v1.1)
  — file_attachments (object_path, is_orphan, entity_type, entity_id,
    idx_files_orphan_age, idx_files_entity)
- BanhCuon_Project.docx §4.2 — Soft delete với is_orphan
- CLAUDE_SYSTEM.docx §5 — be/internal/jobs/file_cleanup.go mỗi 6h
 
File structure (Section 0):
- internal/handler/file_handler.go
  → UploadFile (multipart), GetFile, LinkFileToEntity, DeleteFile
- internal/service/file_service.go
  → validate size/type, store to bucket, INSERT is_orphan=1,
    link: UPDATE entity_type+entity_id+is_orphan=0
- internal/repository/file_repo.go
  → sqlc: InsertFile, LinkFile, GetOrphanFiles
- internal/jobs/file_cleanup.go
  → goroutine mỗi 6h, panic recover mandatory:
    DELETE WHERE is_orphan=1 AND created_at < NOW()-24h
- Storage layer: object_path = relative bucket path
  Full URL = STORAGE_BASE_URL + object_path (env var)
 
Data flows (Section 1):
1.1 POST /api/v1/files/upload — Multipart, trả file_id + object_path
1.2 POST /api/v1/files/:id/link — Link tới entity (order/payment/staff)
1.3 Cleanup job — file_cleanup.go goroutine, 6h interval
1.4 Full URL construction — STORAGE_BASE_URL + object_path
 
Case studies (Section 3):
CS1: Cashier upload ảnh bill (image/jpeg, 2MB)
  → validate OK → store to bucket → INSERT (is_orphan=1, entity_type=NULL)
  → return {file_id, object_path}
CS2: Upload 15MB → middleware check size > 10MB
  → reject FILE_001 413 TRƯỚC KHI đọc request body
CS3: Cleanup job tick (06:00) — goroutine wakes
  → SELECT WHERE is_orphan=1 AND created_at < NOW()-24h
  → DELETE batch → log "Cleaned N orphan files"
CS4: Cashier link ảnh vào order
  → POST /files/{id}/link {entity_type:"order", entity_id:"ord-abc-uuid"}
  → verify order exists → UPDATE is_orphan=0, entity_type, entity_id
 
Edge cases (Section 5):
- File linked nhưng entity bị soft delete: orphan detection strategy?
- Polymorphic link (không hard FK): application-level integrity
 
Security threat model (Section 4):
- Path traversal: validate object_path không chứa "../"
- MIME spoofing: check magic bytes, không chỉ Content-Type header
- Unauthorized access: file chỉ accessible bởi owner hoặc manager+
- Bucket public vs private: serve qua signed URL hoặc proxy
 
Format: real data
  (file_id="file-xyz-uuid", object_path="uploads/2026/04/bill-abc.jpg",
   size_bytes=2097152, uploaded_by="cashier-uuid")
Output: BanhCuon_Files_CaseStudy_v1_0.docx

Flag bat ky risk nao ban phat hien ngoai scope prompt nay — dung bo qua. |
| --- |

| 👥  §6 — Staff Management
Phase 1 cuối cùng | 5 flows · 5 case studies |
| --- |

| 🟢 LOW PRIORITY — Phase 1 cuối cùng |
| --- |

| 🔴 BLOCKING (OQ-001): staff.role ENUM co 'customer' — CHUA resolve. Clarify voi BA truoc khi dung prompt nay. Ket qua BA arbitrate: neu customer=anonymous → remove 'customer' khoi ENUM + handle via Guest JWT. Update prompt §6.2 sau khi co decision. Ref: Auth CaseStudy v1.3 §8 OQ-001.
Clarify với BA trước khi implement RequireRole() middleware.
Ref: migrations/001_auth.sql NOTE + MASTER.docx §3 — RBAC. |
| --- |

### §6.1 — Case Studies Required

| CS # | Mô Tả |
| --- | --- |
| CS1 | Manager tạo account chef mới → bcrypt hash → INSERT staff (no password_hash in response) |
| CS2 | Admin đổi role cashier → manager → validate target_role <= requester_role |
| CS3 | Deactivate account chef đang online → is_active=0 → revoke sessions → next call 401 |
| CS4 | Manager thử set role → admin → target > requester → 403 AUTH_003 |
| CS5 | Xem active sessions — SELECT refresh_tokens ORDER BY last_used_at DESC (v1.2 column) |

### §6.2 — Prompt — Tạo Case Study Staff Management

| Tạo case study đầy đủ cho domain Staff Management của hệ thống BanhCuon.
 
Đọc trước:
- MASTER.docx §3 (RBAC: admin ⊃ manager ⊃ staff ⊃ chef|cashier),
  §6 (JWT config, Redis blacklist), §7 (AUTH_001-003)
- migrations/001_auth.sql (v1.2)
  — staff (role ENUM, is_active, deleted_at),
    refresh_tokens (last_used_at v1.2, session cap max 5)
- docs/specs/006_staff.docx — endpoints, AC
- API_CONTRACT.docx §6 — Staff endpoints
 
⚠️ FLAG trước khi implement:
  🔴 BLOCKING (OQ-001): staff.role ENUM co 'customer' — CHUA resolve. Doc Auth CaseStudy §8 OQ-001. Clarify voi BA truoc khi implement. Khong generate case study nay cho den khi co BA decision.
  Online/QR customers không có staff account.
  Recommend: remove 'customer' từ ENUM, handle via QR JWT (table-scoped).
  Document decision trong Section 0 + Section 5. Clarify với BA.
 
File structure (Section 0):
- internal/handler/staff_handler.go
  → ListStaff, GetStaff, CreateStaff, UpdateStaff, DeactivateStaff, ChangeRole
- internal/service/staff_service.go
  → HashPassword (bcrypt cost=12), role change validation
    (cannot set role > own role), deactivate cascade (revoke sessions)
- internal/repository/staff_repo.go
  → sqlc: CreateStaff, UpdateRole, GetActiveStaff, DeactivateStaff
- internal/middleware/rbac.go
  → AtLeast("manager") cho Create/Deactivate
  → AtLeast("admin") cho ChangeRole
 
Data flows (Section 1):
1.1 POST /api/v1/staff — Create staff account (manager+)
1.2 PATCH /api/v1/staff/:id/role — Change role (admin only)
1.3 PATCH /api/v1/staff/:id/deactivate — Deactivate + revoke sessions
1.4 GET /api/v1/staff — List staff (manager+, filter by role)
1.5 GET /api/v1/staff/:id — Get staff profile
 
Case studies (Section 3):
CS1: Manager tạo account chef
  → POST /staff {username:"chef_linh", role:"chef", full_name:"Nguyễn Thị Linh"}
  → validate role <= creator (manager >= chef OK)
  → bcrypt hash password → INSERT → return staff (NO password_hash)
CS2: Admin đổi role cashier → manager
  → PATCH /staff/{id}/role {role:"manager"}
  → validate: requester=admin, target 'manager' <= admin OK
  → UPDATE role (session không cần revoke — role UP = more perms)
CS3: Deactivate chef đang online
  → UPDATE is_active=0 → DELETE refresh_tokens WHERE staff_id=?
  → (opt) add JTIs to Redis blacklist
  → chef next call → AuthRequired MW: is_active=0 → 401 AUTH_001
CS4: Manager set role → admin
  → RBAC: requester=manager, target=admin > manager
  → 403 AUTH_003 "Cannot grant role higher than your own"
CS5: Active sessions view
  → GET /staff/:id/sessions → SELECT refresh_tokens
    WHERE staff_id=? AND expires_at > NOW() ORDER BY last_used_at DESC
 
Edge cases (Section 5):
⚠️ customer role ambiguity: recommend removal from ENUM
- Self-deactivate prevention: block account locking itself out
- Last admin protection: block if only admin remaining
 
Security threat model (Section 4):
- Role escalation: service validate target_role <= requester_role
- Deactivated bypass: AuthRequired MW checks is_active=1 every request
- Password exposure: NEVER return password_hash, không log
- Self-deactivate: service block own account deactivation
- Last admin lockout: block deactivate if last active admin
 
Format: real data
  (staff_id="staff-linh-uuid", username="chef_linh", role="chef", is_active=1)
Output: BanhCuon_Staff_CaseStudy_v1_0.docx

Flag bat ky risk nao ban phat hien ngoai scope prompt nay — dung bo qua. |
| --- |

## §7 — Summary: Output Files Checklist

| # | Domain | Output File | Min CS | Status |
| --- | --- | --- | --- | --- |
| 1 | Auth & JWT | BanhCuon_Auth_CaseStudy_v1_0.docx | CS1–CS9 (9) | ✓ Done |
| 2 | Products & Menu | BanhCuon_Products_CaseStudy_v1_0.docx | CS1–CS6 (6) | ☐ Todo |
| 3 | Orders & KDS | BanhCuon_Orders_CaseStudy_v1_0.docx | CS1–CS7 (7) | ☐ Todo |
| 4 | Payments | BanhCuon_Payments_CaseStudy_v1_0.docx | CS1–CS6 (6) | ☐ Todo |
| 5 | Files & Uploads | BanhCuon_Files_CaseStudy_v1_0.docx | CS1–CS4 (4) | ☐ Todo |
| 6 | Staff Management | BanhCuon_Staff_CaseStudy_v1_0.docx | CS1–CS5 (5) | ☐ Todo |

| 🍜  BanhCuon System  ·  CLAUDE_CASESTUDY_PROMPTS.docx  ·  v1.1  ·  All Domain Prompts  ·  Tháng 4/2026 |
| --- |
