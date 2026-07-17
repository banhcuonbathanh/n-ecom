| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
CASE STUDY & DATA FLOW — TEMPLATE GUIDE
Hướng dẫn tạo Case Study cho bất kỳ Domain nào · Auth là reference model
CLAUDE_CASESTUDY.docx  ·  v1.0  ·  ECC-Free  ·  Tháng 4 / 2026 |
| --- |

| ℹ️  Tài liệu này là SESSION POINTER cho Claude khi tạo Case Study mới. Đọc §1 (cấu trúc bắt buộc) → §2 (checklist) → §3 (mapping domain) → §4 (ví dụ nhân bản) trước khi viết bất kỳ case study nào. Auth Case Study (BanhCuon_Auth_CaseStudy_EXPLAINED_v1_2.docx) là REFERENCE MODEL — mọi domain mới phải follow cùng pattern. |
| --- |

**§0 — ****Role & Khi Nào Dùng File Này**

File này được Claude đọc khi nhận yêu cầu: **"tạo case study cho Products / Orders / Payments / KDS / ..."**

| Trigger | Claude Làm Gì |
| --- | --- |
| "Tạo case study cho [domain]" | Đọc file này §1–§3 → đọc spec domain → tạo docx theo template §4 |
| "Thêm flow mới vào case study X" | Đọc file này §1 → đọc existing case study → append section mới |
| "Data flow của [endpoint] là gì?" | Đọc §1.2 (Data Flow template) → draft inline, hỏi confirm trước khi tạo file |
| "Case study [domain] bị thiếu edge case" | Đọc §2 checklist → identify gap → append Case Study section |

| ⚠️  Không bao giờ tạo case study mà không đọc spec domain tương ứng (docs/specs/NNN_*.docx). Spec là source of business logic — case study minh họa spec, không thay thế spec. |
| --- |

**§1 — ****Cấu Trúc Bắt Buộc Của Mọi Case Study**

Mọi domain case study PHẢI có đủ 7 sections sau, theo đúng thứ tự này. Auth Case Study là reference model cho tất cả.

**§1.1 — 7 Sections Bắt Buộc (theo thứ tự)**
| # | Section | Nội Dung Bắt Buộc | Reference (Auth) |
| --- | --- | --- | --- |
| 0 | Tổng Quan Module | Module làm gì? File structure + trách nhiệm. Thiết kế cốt lõi (tại sao chọn approach này). | Section 0 — Auth Overview |
| 1 | Data Flow Chi Tiết | 1 subsection per endpoint/flow. Mỗi flow: explanation box + sequence table (# / Layer / Action / Result). | Section 1 — Login / Auth / Refresh / Logout |
| 2 | Reference Tables | Constants, enums, config, middleware — tra cứu nhanh không cần đọc code. | Section 2 — RBAC Reference |
| 3 | Case Studies (Happy Path) | Minimum 3 case studies. Mỗi CS: header box (Actor, Kịch bản) + explanation box + step table. | Section 3 — CS 1-6 |
| 4 | Security / Risk Considerations | Threat model table: Mối đe dọa | Biện pháp bảo vệ + implementation. | Section 4 — Security |
| 5+ | Edge Cases / Extension Design | Complex design decisions. Schema changes cần thiết. "Tại sao không làm X?" | Section 5 — QR Guest Session |
| 6+ | Case Studies (Edge Cases) | Case studies cho phần extension. Cùng format với Section 3. | Section 6 — CS 7-9 |

**§1.2 — Template Cho Mỗi Data Flow (Section 1.x)**
| 💡  RULE: Mọi flow phải có ĐỦ 3 thành phần: (1) Explanation box — "tại sao", (2) Sequence steps table — "cái gì xảy ra từng bước", (3) Inline note cho bước phức tạp. Không được bỏ qua explanation box. |
| --- |

**Format chuẩn cho mỗi 1.x subsection:**

| ## 1.x — [Tên Flow]: [METHOD] [/endpoint] |
| --- |
|  |
| ┌─ EXPLANATION BOX ──────────────────────────────────────────────────────────┐ |
| │ [Tên Flow] — Tại Sao [Flow Này] Quan Trọng?                               │ |
| │                                                                             │ |
| │ [3–5 câu giải thích: bối cảnh, tại sao thiết kế như vậy, trade-off]       │ |
| │                                                                             │ |
| │ ĐIỂM THEN CHỐT: [1–2 câu về điều quan trọng nhất developer phải biết]     │ |
| └─────────────────────────────────────────────────────────────────────────────┘ |
|  |
| ┌─ SEQUENCE TABLE ────────────────────────────────────────────────────────────┐ |
| │ # | Layer / Actor | Action | Result / Output                               │ |
| │ ──┼───────────────┼────────┼──────────────────────────────────────────────│ |
| │ 1 | Client        | ...    | ...                                           │ |
| │ 2 | Handler       | ...    | ...                                           │ |
| │ 3 | Service       | ...    | ...                                           │ |
| │ 4 | Repository    | ...    | ...                                           │ |
| │ 5 | DB/Redis      | ...    | ...                                           │ |
| └─────────────────────────────────────────────────────────────────────────────┘ |

**§1.3 — Template Cho Mỗi Case Study (Section 3.x)**
**Format chuẩn cho mỗi Case Study:**

| | Case Study N — [Tên Ngắn Gọn]: [Mô tả hành động]                          | |
| --- |
| | Actor: [Role/System] · [Layer chain: Handler → Service → DB → ...]         | |
| | Kịch bản: [1–2 câu mô tả tình huống cụ thể, có data thật (username, ID)]  | |
|  |
| ┌─ EXPLANATION BOX ──────────────────────────────────────────────────────────┐ |
| │ Điều Gì Xảy Ra Trong Case Study N?                                         │ |
| │                                                                             │ |
| │ [Giải thích tại sao case study này quan trọng]                             │ |
| │ [Highlight step đặc biệt cần chú ý]                                        │ |
| │ [Kết quả cuối cùng và ý nghĩa]                                             │ |
| └─────────────────────────────────────────────────────────────────────────────┘ |
|  |
| ┌─ STEP TABLE ────────────────────────────────────────────────────────────────┐ |
| │ # | Layer / Actor | Action | Result / Output                               │ |
| └─────────────────────────────────────────────────────────────────────────────┘ |

**§2 — ****Checklist Trước Khi Viết Case Study**

**§2.1 — Đọc Trước Khi Bắt Đầu**
**Trước khi viết bất kỳ dòng nào, Claude PHẢI đọc đủ các file này:**

| Phải Đọc | Lấy Gì |
| --- | --- |
| MASTER.docx (Execution_plan.docx) §4 | Business rules của domain — cancel rule, state machine, payment rules |
| docs/specs/NNN_[domain].docx | Acceptance criteria, BE logic, FE logic, sqlc queries |
| migrations/NNN_[domain].sql | Actual schema — column names, constraints, FKs |
| API_CONTRACT.docx §[domain section] | Exact endpoint URLs, request/response shape |
| BanhCuon_Auth_CaseStudy_EXPLAINED_v1_2.docx | Reference model — copy structure, adapt content |

**§2.2 — Checklist Nội Dung**
| ✓ | Check | Mô Tả | Failure Consequence |
| --- | --- | --- | --- |
| ☐ | Section 0 có file structure | Liệt kê tất cả files với trách nhiệm — developer biết sửa file nào | Developer không biết code ở đâu |
| ☐ | Mỗi endpoint có 1 Data Flow | CRUD = Create / Read / Update / Delete — mỗi cái là 1 subsection 1.x | Missing flows = incomplete reference |
| ☐ | Explanation box trước mỗi flow | "Tại sao" trước "cái gì" — context trước sequence steps | Developer hiểu cơ học nhưng không hiểu design |
| ☐ | Minimum 3 case studies happy path | CS1: basic success, CS2: validation/error, CS3: concurrent/edge | Not enough coverage |
| ☐ | Minimum 1 security case study | Authorization failure, injection attempt, rate limit, spoofing | Security gaps not documented |
| ☐ | Actual data trong case studies | Dùng real IDs, real values (order_number, amount, status) | Abstract = less useful |
| ☐ | Threat model table trong §4 | Mọi Mối đe dọa | Biện pháp | Implementation reference | Security not documented |
| ☐ | References đến MASTER / spec | Mỗi business rule phải cite nguồn: "MASTER.docx §4.x" | Creates duplicate truth |

**§2.3 — Số Lượng Case Studies Theo Domain**
| Domain | Minimum Case Studies (+ lý do) |
| --- | --- |
| Auth | CS1: Login OK · CS2: Login fail + timing attack · CS3: Token refresh · CS4: Logout + blacklist · CS5: Session cap · CS6: RBAC fail · CS7-9: QR Guest |
| Products & Menu | CS1: List menu (cache hit) · CS2: List menu (cache miss, DB) · CS3: Create product (manager) · CS4: Unauthorized create (chef tries) · CS5: Combo expand preview |
| Orders & KDS | CS1: Customer đặt đơn online · CS2: QR table order · CS3: POS cashier order · CS4: Chef update qty_served · CS5: Cancel order OK (<30%) · CS6: Cancel blocked (>=30%) · CS7: KDS WebSocket broadcast |
| Payments | CS1: Create VNPay payment · CS2: VNPay webhook verify OK · CS3: Invalid signature rejected · CS4: Duplicate webhook (idempotency) · CS5: Payment timeout · CS6: Cash COD flow |
| Files | CS1: Upload image OK · CS2: File too large (413) · CS3: Orphan cleanup job · CS4: Link file to order |
| Staff Management | CS1: Manager tạo account chef · CS2: Admin đổi role · CS3: Deactivate account mid-session |

**§3 — ****Domain Mapping — Section 0 Cho Mỗi Domain**

| 💡  Section 0 (Module Overview) là phần khác nhau nhiều nhất giữa các domains. Phần còn lại (Data Flow format, Case Study format, Security format) giống hệt Auth. |
| --- |

**§3.1 — Products & Menu Domain**
| File | Trách Nhiệm Chính |
| --- | --- |
| internal/handler/product_handler.go | ListProducts, GetProduct, CreateProduct, UpdateProduct, DeleteProduct, ListCategories, ListToppings, ListCombos |
| internal/service/product_service.go | Business logic: availability check, price validation, combo expand logic, cache invalidation |
| internal/repository/product_repo.go | sqlc wrappers: GetProducts (filtered), GetComboWithItems, GetProductWithToppings |
| be/pkg/redis/bloom.go | Bloom filter: Exists(product_id) — fast check trước DB query |
| internal/middleware/rbac.go (reused) | AtLeast("manager") cho CUD operations. Public GET (no auth required) |

| ℹ️  Key Design: Products GET là PUBLIC endpoint (không cần auth). CUD (Create/Update/Delete) cần AtLeast("manager"). Bloom filter kiểm tra existence trước DB query — MASTER.docx §8 Redis Keys. |
| --- |

**§3.2 — Orders & KDS Domain**
| File | Trách Nhiệm Chính |
| --- | --- |
| internal/handler/order_handler.go | CreateOrder, GetOrder, ListOrders, CancelOrder, UpdateOrderStatus |
| internal/handler/order_item_handler.go | UpdateQtyServed (chef action), FlagOrderItem |
| internal/service/order_service.go | State machine transitions, cancel rule (SUM qty_served / SUM quantity < 30%), combo expand at create time, One Active Order Rule |
| internal/repository/order_repo.go | sqlc: CreateOrderWithItems (TX), GetActiveOrderByTableID, RecalculateTotalAmount |
| internal/websocket/hub.go (System Dev) | Broadcast new_order / item_updated / order_cancelled to KDS clients |
| internal/sse/handler.go (System Dev) | SSE stream: subscribe to order:{order_id}:events Redis channel |

| ℹ️  Key Design: Combo expand xảy ra tại CREATE time — BE expand combo_items thành order_items với combo_ref_id. Chef thấy individual items, không phải combo label. MASTER.docx §4.1 D-005. |
| --- |

**§3.3 — Payments Domain**
| File | Trách Nhiệm Chính |
| --- | --- |
| internal/handler/payment_handler.go | CreatePayment, GetPayment, HandleVNPayWebhook, HandleMoMoCallback, HandleZaloPayCallback |
| internal/service/payment_service.go | Create (chỉ khi order.status=ready), idempotency check, timeout trigger, refund on cancel |
| internal/payment/vnpay.go (System Dev) | CreatePaymentURL, VerifyWebhook (HMAC-SHA512 verify TRƯỚC xử lý) |
| internal/payment/momo.go (System Dev) | CreatePayment, VerifyCallback (HMAC-SHA256) |
| internal/payment/zalopay.go (System Dev) | CreateOrder, VerifyCallback (HMAC-SHA256) |
| internal/jobs/payment_timeout.go (System Dev) | Redis keyspace notification → mark payment failed sau 15 phút |

| 🚨  Key Design: UNIQUE(order_id) constraint → retry phải UPDATE, không INSERT. Verify signature TRƯỚC KHI xử lý bất kỳ callback nào — MASTER.docx §4.3 R-PAY-03. |
| --- |

**§3.4 — State Machines Cần Document Trong Case Studies**
**Các domain sau có State Machine — PHẢI có Data Flow cho mỗi transition:**

| Domain | State Machine Transitions Phải Document |
| --- | --- |
| Orders | pending→confirmed→preparing→ready→delivered, Cancel path (3 states → cancelled) |
| Payments | pending→completed, pending→failed, completed→refunded |
| Tables (Phase 2) | available→occupied→available, available→reserved→available, any→inactive |
| Files | is_orphan=1 (upload) → is_orphan=0 (linked) → deleted (cleanup job) |

**§4 — ****Quy Trình Nhân Bản Case Study Mới**

**Làm theo 6 bước này theo đúng thứ tự. Không skip bước nào.**

**Bước 1 — Đọc Đúng Tài Liệu (15 phút)**
| Đọc File | Ghi Chú Lại Gì |
| --- | --- |
| docs/specs/NNN_[domain].docx | Tất cả endpoints, business rules, AC, sqlc queries |
| migrations/NNN_[domain].sql | Table names, column names, constraints, FKs, indexes |
| MASTER.docx §4 — Business Rules | State machine, cancel rules, payment rules, timing |
| API_CONTRACT.docx §[section] | Request body, response shape, error codes |
| MASTER.docx §6 — Error Codes | Tất cả error codes domain này có thể trả về |

**Bước 2 — Sketch Data Flows**
Trước khi code docx, list ra TẤT CẢ flows cần document:

| Ví dụ cho Orders domain: |
| --- |
| Flow 1.1 — POST /api/v1/orders (Create Order — Customer online) |
| Flow 1.2 — POST /api/v1/orders (Create Order — QR tại bàn) |
| Flow 1.3 — POST /api/v1/orders (Create Order — POS cashier) |
| Flow 1.4 — GET  /api/v1/orders/:id (Get Order) |
| Flow 1.5 — PATCH /api/v1/orders/:id/cancel (Cancel Order) |
| Flow 1.6 — PATCH /api/v1/order-items/:id/qty (Chef update qty_served) |
| Flow 1.7 — WebSocket: KDS broadcast on new order |

**Bước 3 — Sketch Case Studies**
Với mỗi flow, xác định ít nhất 1 happy path + 1 error/edge case:

| Ví dụ cho Orders domain: |
| --- |
| CS1 (happy): Customer đặt 2 món + 1 combo → combo expand → KDS broadcast |
| CS2 (happy): Chef update qty_served từng món → 100% done → order ready |
| CS3 (error): Cancel order khi 35% done → ORDER_002 blocked |
| CS4 (edge):  2 request tạo order cùng table cùng lúc → race condition → ORDER_001 |
| CS5 (edge):  QR customer đặt order → same flow nhưng source='qr', created_by=NULL |
| CS6 (security): Chef thử cancel order → 403 AUTH_003 (cashier/manager only) |

**Bước 4 — Fill Sequence Tables**
| 🚨  CRITICAL: Mỗi row trong sequence table phải có ACTUAL data — không dùng placeholder. Ví dụ: "order_number='ORD-20260420-001'" không phải "[order_number]". Real values làm case study useful. |
| --- |

**Format cho sequence table rows:**
| # | Layer / Actor | Action | Result / Output |
| --- | --- | --- | --- |
| 1 | Customer FE | POST /api/v1/orders { table_id: "table-05-uuid", items: [{product_id: "pho-uuid", qty: 2}, {combo_id: "combo-bc-uuid", qty: 1}] } | JSON body đến Gin router |
| 2 | OrderHandler | ShouldBindJSON(&createOrderReq) — validate required fields, items not empty | CreateOrderInput hợp lệ hoặc 400 COMMON_001 |
| 3 | OrderService | CheckActiveOrder(table_id): SELECT COUNT(*) FROM orders WHERE table_id=? AND status IN (pending,confirmed,preparing,ready) AND deleted_at IS NULL | COUNT=0 → proceed hoặc ORDER_001 409 |
| 4 | OrderService | ExpandCombo(combo-bc-uuid): SELECT combo_items WHERE combo_id=? → 2 sub-items (banh-cuon-uuid qty=2, cha-lua-uuid qty=1) | combo header row + 2 sub-item rows |
| 5 | OrderRepo (TX) | BEGIN TX: GenerateOrderNumber → "ORD-20260420-001". INSERT orders. INSERT order_items (3 rows). RecalculateTotalAmount. COMMIT. | Order created. total_amount=95000 VND |

**Bước 5 — Write Explanation Boxes**
Mỗi explanation box phải trả lời 3 câu hỏi:

| Câu Hỏi | Ví Dụ (Orders — Create Order) |
| --- | --- |
| Tại sao flow này tồn tại? | "CreateOrder là entry point của toàn bộ order lifecycle. Mọi subsequent operation (KDS, payment, tracking) phụ thuộc vào order được tạo đúng." |
| Điểm then chốt developer phải biết? | "Combo expand xảy ra tại CREATE time, không phải display time. Chef thấy individual items, không thấy combo label — đây là design decision D-005 trong MASTER." |
| Trade-off / tại sao không làm X? | "total_amount được denormalized (không tính lại mỗi request) vì performance. Trade-off: service PHẢI gọi RecalculateTotalAmount sau mọi mutation — xem 🚨 RISK trong 005_orders.sql." |

**Bước 6 — Fill Security / Threat Model Table**
**Mỗi domain có security risks riêng. Ví dụ cho Orders:**

| Mối Đe Dọa | Biện Pháp Bảo Vệ + Implementation |
| --- | --- |
| Race condition: 2 orders cùng table cùng lúc | SELECT COUNT(*) + INSERT trong TX với SERIALIZABLE isolation. One Active Order Rule — ORDER_001 cho request thứ 2. |
| Customer tạo order cho table không phải của mình (QR) | claims.TableID == request.table_id trong OrderHandler. Guest JWT là table-scoped. |
| Chef tự tăng qty_served vượt quantity | DB constraint: CHECK (qty_served >= 0 AND qty_served <= quantity) trong order_items — DB layer enforcement. |
| total_amount drift (payment sai số tiền) | RecalculateTotalAmount() bắt buộc sau mọi mutation. Unit test cover tất cả code paths. Option: MySQL trigger. |
| Cancel sau khi 30%+ done | Formula: SUM(qty_served)/SUM(quantity) >= 0.30 → ORDER_002 422. Tính tại service layer, validated trước khi update. |

**§5 — ****Naming & File Conventions**

| Item | Convention + Ví Dụ |
| --- | --- |
| Tên file | BanhCuon_[Domain]_CaseStudy_v[N]_[M].docx — Ví dụ: BanhCuon_Orders_CaseStudy_v1_0.docx |
| Section numbering | Section 0 = Overview, Section 1 = Data Flows, Section 2 = Reference, Section 3+ = Case Studies. Extension features thêm Section 5, 6, 7. |
| Case study numbering | CS1, CS2, ... liên tục qua toàn document. Extension CSs tiếp tục đánh số (CS7, CS8 trong Auth extension section). |
| Data flow numbering | 1.1, 1.2, ... liên tục. Mỗi endpoint = 1 subsection. Variants (online/QR/POS) = 1.1, 1.2, 1.3 riêng. |
| Version naming | v1.0 = first version. v1.1 = thêm edge cases. v1.2 = thêm extension design. v2.0 = restructure. |
| Language | Tiếng Việt cho explanation text. Technical terms (function names, SQL, errors) giữ tiếng Anh. Sequence tables = song ngữ OK. |

**§6 — ****Quick Reference — Tên Layer Chuẩn Trong Sequence Tables**

**Dùng đúng tên này trong cột "Layer / Actor" của sequence tables để consistent:**

| Layer / Actor Name | Khi Nào Dùng |
| --- | --- |
| Client / Customer FE / Chef Browser / Cashier POS | Request bắt đầu từ browser hoặc FE app |
| Gin Router | URL matching, trước middleware |
| RateLimit MW | Rate limiting middleware (trước auth) |
| AuthRequired MW | JWT verification middleware |
| RBAC MW | Role check middleware (sau AuthRequired) |
| [Domain]Handler | Ví dụ: OrderHandler, ProductHandler, PaymentHandler |
| [Domain]Service | Ví dụ: OrderService, AuthService. Business logic layer. |
| [Domain]Repo | Ví dụ: OrderRepo. DB access layer. |
| AuthRepo (Redis) | Khi repo call đến Redis (rate limit, cache, pub/sub) |
| AuthRepo (TX) | Khi repo chạy trong DB transaction |
| pkg/jwt | JWT generate / parse operations |
| pkg/bcrypt | Password hash / verify operations |
| pkg/crypto | SHA256 hash operations |
| MySQL / DB | Raw DB operations (sqlc generated) |
| Redis | Direct Redis operations |
| VNPay / MoMo / ZaloPay | External payment gateway callbacks |
| WebSocket Hub | KDS broadcast operations |
| SSE Handler | Server-sent events stream operations |
| Attacker | Security case studies — external threat actor |
| [Phone1] / [Device] | Security case studies — specific device being evicted |

**§7 — ****Domains Cần Tạo Case Study (Phase 1)**

| Domain | Spec File | Priority | Status |
| --- | --- | --- | --- |
| Auth | docs/specs/001_auth.docx | ✅ Done | BanhCuon_Auth_CaseStudy_EXPLAINED_v1_2.docx |
| Products & Menu | docs/specs/002_products.docx | 🟠 HIGH | ☐ Chưa tạo — tạo sau khi BE Task 5 done |
| Orders & KDS | docs/specs/003_orders_kds.docx | 🟠 HIGH | ☐ Chưa tạo — tạo sau khi BE Task 7 done |
| Payments | docs/specs/004_payments.docx | 🟡 MED | ☐ Chưa tạo — tạo sau khi BE Task 8 done |
| QR + POS | docs/specs/005_qr_pos.docx | 🟡 MED | ☐ QR flow đã covered trong Auth CS §5-7 |
| Staff Management | docs/specs/006_staff.docx | 🟢 LOW | ☐ Chưa tạo — Phase 1 sau cùng |

| ⚠️  Thứ tự tạo case study PHẢI theo MASTER.docx §0.2 — task order. Không tạo case study cho domain chưa có working BE code vì sẽ không verify được behavior. |
| --- |

🍜  BanhCuon System  ·  **CLAUDE_CASESTUDY.docx**  ·  v1.0  ·  Template Guide for All Domains  ·  Tháng 4/2026