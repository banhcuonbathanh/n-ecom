| 🛒  QUY TRÌNH PHÁT TRIỂN WEBSITE BÁN HÀNG ONLINE |
| --- |
| Tổng Hợp Quy Trình Phát Triển Website Bán Hàng Online v2.0  ·  Cập nhật & Bổ sung Đầy Đủ  ·  Tháng 4/2026  ·  Tác giả: Z.ai |

| ℹ️  Tài liệu này là bản cập nhật toàn diện, bổ sung ERD chi tiết, API contract chuẩn, quy trình Change Request kèm template, phân công Testing rõ ràng, timeline thực tế và Definition of Done cho từng deliverable. Mọi nội dung được viết bằng tiếng Việt chuẩn. |
| --- |

# PHẦN 1 — GIAI ĐOẠN BUSINESS ANALYST (BA)
Sau khi gặp và làm việc với khách hàng, Business Analyst (BA) thu thập, phân tích và trình bày yêu cầu kinh doanh theo định dạng có cấu trúc. Tài liệu bàn giao cho Technical Lead gồm nhiều thành phần quan trọng. Đây là nền tảng của toàn bộ dự án — nếu phần này không chặt chẽ, mọi bước phía sau đều bị ảnh hưởng nghiêm trọng.

## 1.1  Tài Liệu Đặc Tả Yêu Cầu Nghiệp Vụ (BRD)
BRD là tài liệu đầu tiên, xác định rõ mục tiêu kinh doanh, phạm vi dự án và đối tượng người dùng. BRD giúp toàn bộ team hiểu đúng hướng sản phẩm trước khi bắt đầu thiết kế kỹ thuật.

| Mục BRD | Nội Dung Cần Có | Người Phê Duyệt |
| --- | --- | --- |
| Mục tiêu kinh doanh | Tăng doanh số, mở rộng thị trường, tự động hóa quản lý đơn hàng và kho hàng, nâng cao trải nghiệm khách hàng | Khách hàng + PM |
| Phạm vi dự án | Giai đoạn 1 (MVP): chức năng cốt lõi đưa sản phẩm ra thị trường nhanh nhất. Giai đoạn 2: bổ sung tính năng nâng cao | Khách hàng + PM |
| Đối tượng người dùng | Khách mua hàng (end-user), Admin (quản trị viên), Nhân viên kho, Kế toán — mỗi đối tượng có nhu cầu và quyền truy cập khác nhau | BA + PM |
| Ràng buộc dự án | Ngân sách, timeline, công nghệ bắt buộc, tích hợp hệ thống hiện có, yêu cầu pháp lý | Khách hàng + TL |
| Tiêu chí thành công | Định nghĩa rõ ràng: tỷ lệ chuyển đổi, thời gian tải trang, tỷ lệ lỗi chấp nhận được | Khách hàng + PM |

## 1.2  Tài Liệu Đặc Tả Yêu Cầu Chức Năng (SRS/FSD) — Quan Trọng Nhất
SRS là tài liệu kỹ thuật hóa tất cả các yêu cầu chức năng. Đây là cơ sở để Backend, Frontend và QA làm việc. SRS cần được khách hàng duyệt ký trước khi bắt đầu code.

### Module Khách Hàng (End-User)
| Tính Năng | Mô Tả Chi Tiết | Ưu Tiên |
| --- | --- | --- |
| Đăng ký / Đăng nhập | Email + mật khẩu, đăng nhập qua Google / Facebook (OAuth2) | 🔴 MUST |
| Tìm kiếm & Lọc sản phẩm | Tìm kiếm theo tên, lọc theo danh mục / giá / thương hiệu / đánh giá, sắp xếp | 🔴 MUST |
| Xem chi tiết sản phẩm | Hình ảnh slider, mô tả, đánh giá, biến thể (size/màu), tình trạng kho | 🔴 MUST |
| Giỏ hàng | Thêm / xóa / sửa số lượng, lưu giỏ hàng khi đăng xuất, hiển thị tổng tiền realtime | 🔴 MUST |
| Thanh toán | COD, chuyển khoản ngân hàng, ví điện tử (MoMo / VNPay / ZaloPay), thẻ tín dụng | 🔴 MUST |
| Theo dõi đơn hàng | Lịch sử đơn, trạng thái giao hàng realtime, nhận email / SMS thông báo | 🔴 MUST |
| Quản lý tài khoản | Cập nhật thông tin cá nhân, sổ địa chỉ, đổi mật khẩu | 🟠 HIGH |
| Đánh giá sản phẩm | Rating (1–5 sao), bình luận có ảnh, phản hồi từ người bán | 🟡 MED |

### Module Quản Trị (Admin)
| Tính Năng | Mô Tả Chi Tiết | Ưu Tiên |
| --- | --- | --- |
| Quản lý sản phẩm | Thêm / sửa / xóa sản phẩm, biến thể (size/màu), giá, tồn kho, hình ảnh | 🔴 MUST |
| Quản lý danh mục | CRUD danh mục, thương hiệu, thuộc tính sản phẩm | 🔴 MUST |
| Quản lý đơn hàng | Xem, duyệt, hủy, cập nhật trạng thái vận chuyển, xuất hóa đơn | 🔴 MUST |
| Quản lý khách hàng | Danh sách, phân nhóm, lịch sử mua, chặn tài khoản | 🟠 HIGH |
| Quản lý khuyến mãi | Mã giảm giá, flash sale, combo, điều kiện áp dụng, thời hạn | 🟠 HIGH |
| Báo cáo & Thống kê | Doanh thu theo ngày/tháng, sản phẩm bán chạy, khách hàng mới, tỷ lệ hoàn hàng | 🟠 HIGH |
| Phân quyền nhân viên | Vai trò: Admin, Sale, Kho, Kế toán — RBAC chi tiết | 🟠 HIGH |

### Quy Tắc Nghiệp Vụ (Business Rules) — Phải Liệt Kê Đầy Đủ
| ⚠️  Business Rules là phần nhiều BA hay bỏ qua, dẫn đến Developer phải đoán ý và xử lý sai. Liệt kê cụ thể TỪNG quy tắc là điểm cộng cực lớn khi bàn giao tài liệu. |
| --- |

| Mã Quy Tắc | Quy Tắc | Điều Kiện Chi Tiết |
| --- | --- | --- |
| BR-001 | Miễn phí vận chuyển | Đơn hàng có tổng giá trị từ 500.000 VND trở lên (trước khuyến mãi) |
| BR-002 | Không hủy đơn khi đang vận chuyển | Không cho phép hủy đơn khi trạng thái là "Đã giao đơn vị vận chuyển" trở đi |
| BR-003 | Tồn kho không âm | Hệ thống PHẢI kiểm tra tồn kho trước khi xác nhận đơn — block đơn nếu hết hàng |
| BR-004 | Một mã giảm giá mỗi đơn | Khách hàng chỉ được dùng tối đa 1 mã giảm giá cho mỗi đơn hàng |
| BR-005 | Thời hạn hoàn tiền | Hoàn tiền chỉ xử lý trong vòng 7 ngày kể từ ngày khách nhận hàng thành công |
| BR-006 | Timeout thanh toán online | Giao dịch tự động hủy sau 15 phút nếu khách chưa hoàn tất thanh toán |
| BR-007 | Khóa tài khoản sau đăng nhập sai | Khóa tạm thời 15 phút sau 5 lần đăng nhập sai liên tiếp |

### Tiêu Chí Chấp Nhận (Acceptance Criteria) — Bổ Sung Bắt Buộc
| ℹ️  Acceptance Criteria (AC) giúp Developer và QA biết chính xác khi nào một tính năng được xem là "hoàn thành". Thiếu AC là nguyên nhân chính dẫn đến tranh cãi khi nghiệm thu. |
| --- |

**Ví dụ AC cho chức năng Thanh Toán:**
| Kịch Bản | Điều Kiện | Kết Quả Mong Đợi |
| --- | --- | --- |
| Thanh toán thành công | API gateway trả về mã 200, số dư đủ, thẻ còn hạn | Trạng thái đơn chuyển sang "Đã thanh toán", khách nhận email xác nhận trong vòng 30 giây |
| Thanh toán thất bại — hết hạn thẻ | Thẻ hết hạn hoặc bị từ chối | Hiển thị thông báo lỗi cụ thể, cho phép thử lại, KHÔNG trừ tiền |
| Thanh toán timeout | API thanh toán không phản hồi sau 15 giây | Hệ thống tự động hủy giao dịch, thông báo cho người dùng, đơn về trạng thái "Chờ thanh toán" |
| Thanh toán trùng lặp (double-click) | Người dùng click "Thanh toán" 2 lần nhanh | Chỉ tạo 1 giao dịch, idempotency key ngăn giao dịch thứ 2 |

## 1.3  Yêu Cầu Phi Chức Năng (NFR)
| Loại NFR | Yêu Cầu | Ngưỡng Đo Lường |
| --- | --- | --- |
| Hiệu năng | Thời gian tải trang, API response time | Tải trang < 3 giây (LCP), API response < 500ms (p95) |
| Khả năng chịu tải | Concurrent users | Chịu tải 1.000 người dùng đồng thời không degradation |
| Bảo mật | Chống tấn công phổ biến | HTTPS bắt buộc, chống SQL Injection, XSS, CSRF, bcrypt cost=12 |
| Sao lưu dữ liệu | Backup & Recovery | Backup hàng ngày, lưu 30 ngày, backup off-site, RTO < 4 giờ |
| Đa nền tảng | Responsive | Hoạt động tốt trên Mobile (iOS/Android), Tablet, Desktop |
| SEO | Khả năng tìm kiếm | URL thân thiện, meta tag, sitemap.xml, structured data Schema.org |
| Khả dụng (Availability) | Uptime | SLA 99.5% = tối đa ~3.6 giờ downtime/tháng |

## 1.4  Sơ Đồ & Mô Hình Hóa
| Loại Sơ Đồ | Mục Đích | Công Cụ Gợi Ý |
| --- | --- | --- |
| Use Case Diagram | Xác định tác nhân và chức năng tương tác, phạm vi hệ thống | draw.io, Lucidchart, PlantUML |
| Activity Diagram | Mô tả luồng xử lý: đặt hàng, hoàn tiền, đổi trả | draw.io, Miro |
| ERD (sơ lược) | Quan hệ giữa User–Order–Product–Payment (xem §2.3 cho chi tiết) | dbdiagram.io, MySQL Workbench |
| User Flow / Journey Map | Hành trình khách hàng từ trang chủ → thanh toán thành công | Figma, Miro |
| State Machine Diagram | Vòng đời trạng thái đơn hàng: pending → processing → shipped → delivered / cancelled | draw.io, PlantUML |

## 1.5  Thiết Kế UX/UI — Quy Trình Đúng
| ⚠️  Nhiều dự án bỏ qua bước UX Review và Design System, dẫn đến Frontend tự chế UI không đồng bộ giữa các trang, trải nghiệm người dùng kém và mất nhiều thời gian sửa chữa sau này. |
| --- |

| Bước | Tên Bước | Người Thực Hiện | Output |
| --- | --- | --- | --- |
| 1 | Wireframe (khung sườn) | BA phối hợp UX/UI Designer | Wireframe các trang chính: Home, Product, Cart, Checkout — tập trung vào luồng điều hướng và bố cục thông tin |
| 2 | UX Review | UX/UI Designer | Đánh giá User Journey: hành trình từ xem sản phẩm đến thanh toán có mượt không? Có bước nào gây nhầm lẫn không? |
| 3 | Design System | UX/UI Designer | Bộ component đồng bộ: Button, Input, Color Palette, Typography, Icon set, Spacing system — cơ sở để Frontend phát triển UI nhất quán |
| 4 | High-Fidelity Mockup | UX/UI Designer | Mockup chi tiết từng trang, có annotation giải thích trạng thái, hover, error state, empty state |
| 5 | Prototype & Handoff | UX/UI Designer → Frontend | Prototype click-through cho stakeholder duyệt, Figma handoff với exported assets và spacing specs |

# PHẦN 2 — GIAI ĐOẠN TECHNICAL LEAD
Sau khi nhận tài liệu từ BA, Technical Lead chuyển hóa thành giải pháp kỹ thuật. Mỗi quyết định ở bước này ảnh hưởng trực tiếp đến khả năng mở rộng, bảo mật và hiệu năng của hệ thống.

## 2.1  Lựa Chọn Công Nghệ (Tech Stack)
| Tầng (Layer) | Công Nghệ | Lý Do Chọn |
| --- | --- | --- |
| Frontend | ReactJS / Next.js 14 (App Router) + TypeScript + Tailwind CSS | SSR tốt cho SEO, hệ sinh thái lớn, TypeScript giúp bắt lỗi sớm |
| Backend | Node.js (NestJS) hoặc Go (Gin) | NestJS: cấu trúc rõ ràng, nhiều developer. Go: hiệu năng cao khi cần throughput lớn |
| Database chính | MySQL 8.0 (dữ liệu quan hệ) | Ổn định, hỗ trợ tốt JSON column, CHECK constraint từ v8.0.16+ |
| Cache / Queue | Redis Stack 7 | Session, rate limiting, pub/sub realtime, Bloom filter |
| File Storage | AWS S3 hoặc MinIO (self-hosted) | Lưu ảnh sản phẩm, tài liệu — tách khỏi database |
| Web Server | Nginx (Reverse Proxy) + Docker + Docker Compose | Dễ scale, tái sản xuất môi trường, Nginx load balancing |
| CI/CD | GitHub Actions hoặc GitLab CI | Tự động test, build, deploy khi push code |

## 2.2  Kiến Trúc Hệ Thống
| 🚨  CẢNH BÁO KIẾN TRÚC: Đề xuất Microservices cho giai đoạn 1 (MVP) trong 13 tuần là over-engineering. Microservices tốn ít nhất 4–6 tuần setup hạ tầng (API Gateway, Message Queue, distributed tracing). Hãy dùng Modular Monolith cho giai đoạn 1. |
| --- |

| Tiêu Chí | Modular Monolith (Giai đoạn 1) | Microservices (Giai đoạn 2+) |
| --- | --- | --- |
| Thời gian setup | 1–2 tuần | 4–6 tuần |
| Hạ tầng cần thiết | 1 DB, 1 server, Nginx | API Gateway, Message Queue, Service Discovery, distributed tracing |
| Triển khai (Deploy) | Đơn giản: 1 process | Phức tạp: nhiều service độc lập, mỗi service 1 pipeline |
| Quy mô team phù hợp | 3–5 developer | 8+ developer (mỗi service cần team riêng) |
| Khả năng mở rộng | Vertical scaling (nâng cấu hình server) | Horizontal scaling theo từng module độc lập |
| Debug & Monitoring | Đơn giản: 1 log source, 1 dashboard | Phức tạp: cần distributed tracing (Jaeger, Zipkin) |
| Chuyển đổi sang MS | Có thể tách module thành service khi cần, không phải viết lại | N/A |

| ✅  Chiến lược đúng: Dùng Modular Monolith (User Module, Product Module, Order Module, Payment Module) trong giai đoạn 1. Khi traffic vượt 10.000 request/phút hoặc team lớn hơn 8 người, tách từng module thành Microservice — code đã có ranh giới rõ ràng nên chỉ cần thêm API Gateway và đổi function call thành API call. |
| --- |

## 2.3  Thiết Kế Cơ Sở Dữ Liệu (ERD Chi Tiết)
| ℹ️  Bảng dưới là thiết kế chi tiết đủ để Developer viết migration SQL trực tiếp. Ghi rõ kiểu dữ liệu, constraint, index và lý do thiết kế — không để Developer phải đoán mò. |
| --- |

**▌ ****Bảng: users — Tài khoản người dùng**
| Cột | Kiểu Dữ Liệu | Constraint | Mô Tả |
| --- | --- | --- | --- |
| id | CHAR(36) | PK, DEFAULT (UUID()) | UUID v4, primary key |
| email | VARCHAR(100) | UNIQUE, NOT NULL, INDEX | Email đăng nhập, duy nhất |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash, cost=12 |
| full_name | VARCHAR(100) | NOT NULL | Tên hiển thị |
| phone | VARCHAR(20) | NULL, INDEX | Số điện thoại (tùy chọn) |
| role | ENUM('customer','staff','admin') | NOT NULL, DEFAULT customer | Phân quyền RBAC |
| is_active | TINYINT(1) | NOT NULL, DEFAULT 1 | 0 = tài khoản bị khóa |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thời gian tạo |
| deleted_at | DATETIME | NULL, INDEX | Soft delete — query WHERE deleted_at IS NULL |

**▌ ****Bảng: products — Sản phẩm**
| Cột | Kiểu Dữ Liệu | Constraint | Mô Tả |
| --- | --- | --- | --- |
| id | CHAR(36) | PK, DEFAULT (UUID()) |  |
| category_id | CHAR(36) | FK → categories.id, NOT NULL, INDEX | Danh mục chứa sản phẩm |
| name | VARCHAR(150) | NOT NULL, INDEX | Tên sản phẩm |
| slug | VARCHAR(160) | UNIQUE, NOT NULL | URL thân thiện, tự sinh từ name |
| description | TEXT | NULL | Mô tả chi tiết |
| price | DECIMAL(15,0) | NOT NULL, CHECK (price >= 0) | Giá gốc (VND), tránh float rounding |
| sale_price | DECIMAL(15,0) | NULL | Giá khuyến mãi, NULL = không sale |
| stock | INT | NOT NULL, DEFAULT 0, CHECK (stock >= 0) | Tồn kho tổng (không có biến thể) |
| image_path | VARCHAR(500) | NULL | object_path trong storage, ghép URL khi serve |
| is_available | TINYINT(1) | NOT NULL, DEFAULT 1 | 0 = tạm ngừng bán |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP |  |
| deleted_at | DATETIME | NULL, INDEX | Soft delete |

**▌ ****Bảng: orders — Đơn hàng**
| Cột | Kiểu Dữ Liệu | Constraint | Mô Tả |
| --- | --- | --- | --- |
| id | CHAR(36) | PK, DEFAULT (UUID()) |  |
| order_number | VARCHAR(30) | UNIQUE, NOT NULL, INDEX | ORD-YYYYMMDD-NNN, tự sinh |
| user_id | CHAR(36) | FK → users.id, NULL (cho phép đặt ẩn danh) | Khách đăng nhập hay không |
| status | ENUM('pending','confirmed','processing','shipped','delivered','cancelled') | NOT NULL, DEFAULT pending | Trạng thái đơn hàng |
| total_amount | DECIMAL(15,0) | NOT NULL, DEFAULT 0 | ⚠️ DENORMALIZED — phải recalculate sau mỗi thay đổi order_items |
| discount_amount | DECIMAL(15,0) | NOT NULL, DEFAULT 0 | Tổng giảm giá từ mã khuyến mãi |
| shipping_fee | DECIMAL(15,0) | NOT NULL, DEFAULT 0 | Phí vận chuyển, 0 nếu miễn phí |
| shipping_address | JSON | NOT NULL | Snapshot địa chỉ tại thời điểm đặt |
| payment_method | ENUM('cod','bank_transfer','momo','vnpay','zalopay','credit_card') | NOT NULL |  |
| note | TEXT | NULL | Ghi chú đơn hàng |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP, INDEX |  |
| deleted_at | DATETIME | NULL | Soft delete |

**▌ ****Quan hệ giữa các bảng chính**
| Quan Hệ | Kiểu | Chi Tiết | ON DELETE |
| --- | --- | --- | --- |
| users → orders | 1 : N | Một user có nhiều đơn hàng | SET NULL (giữ lại đơn hàng khi xóa user) |
| categories → products | 1 : N | Một danh mục chứa nhiều sản phẩm | RESTRICT (không xóa danh mục có sản phẩm) |
| products → order_items | 1 : N | Một sản phẩm xuất hiện trong nhiều order_item | RESTRICT |
| orders → order_items | 1 : N | Một đơn có nhiều dòng sản phẩm | CASCADE |
| orders → payments | 1 : 1 | Một đơn hàng có tối đa 1 bản ghi payment | RESTRICT |
| products → product_images | 1 : N | Một sản phẩm có nhiều ảnh | CASCADE |
| products ↔ product_variants | 1 : N | Biến thể theo size/màu, có stock riêng | CASCADE |

## 2.4  Thiết Kế API (Contract)
| ℹ️  Mỗi endpoint phải định nghĩa đủ: Request body (field, type, required), Response schema (success & error), HTTP status code và ví dụ. Thiếu bất kỳ phần nào → Frontend không thể làm việc độc lập. |
| --- |

**▌ ****Tổng hợp endpoints chính**
| Method | Endpoint | Mô Tả | Role |
| --- | --- | --- | --- |
| POST | /api/auth/register | Đăng ký tài khoản mới | Public |
| POST | /api/auth/login | Đăng nhập, trả access + refresh token | Public |
| POST | /api/auth/refresh | Làm mới access token bằng refresh cookie | Public |
| POST | /api/auth/logout | Hủy refresh token, clear cookie | Any Auth |
| GET | /api/products | Danh sách sản phẩm (filter, sort, page) | Public |
| GET | /api/products/:slug | Chi tiết sản phẩm | Public |
| POST | /api/products | Tạo sản phẩm mới | Admin |
| PUT | /api/products/:id | Cập nhật sản phẩm | Admin |
| DELETE | /api/products/:id | Soft-delete sản phẩm | Admin |
| GET | /api/cart | Lấy giỏ hàng hiện tại | Auth |
| POST | /api/cart/items | Thêm sản phẩm vào giỏ | Auth |
| DELETE | /api/cart/items/:id | Xóa sản phẩm khỏi giỏ | Auth |
| POST | /api/orders | Tạo đơn hàng từ giỏ hàng | Auth |
| GET | /api/orders/:id | Chi tiết đơn hàng | Owner / Admin |
| PATCH | /api/orders/:id/status | Cập nhật trạng thái đơn | Admin |
| POST | /api/payments/webhook/vnpay | Webhook IPN từ VNPay (signed) | Public (signed) |

**▌ ****Chi tiết: POST /api/orders — Tạo đơn hàng**
| Thành Phần | Nội Dung |
| --- | --- |
| Request Body | items[]: [{product_id: UUID, variant_id: UUID|null, quantity: int > 0}] shipping_address: {name, phone, address, ward, district, province} payment_method: "cod" | "momo" | "vnpay" | "zalopay" | "bank_transfer" coupon_code: string (tùy chọn) |
| Response 201 | {"data": {"id": "UUID", "order_number": "ORD-20260415-001", "status": "pending", "total_amount": 450000, "discount_amount": 0, "shipping_fee": 30000, "items": [...], "created_at": "ISO8601"}} |
| Response 400 | {"error": "INVALID_INPUT", "message": "Dữ liệu đầu vào không hợp lệ", "details": {"items[0].quantity": "Số lượng phải lớn hơn 0"}} |
| Response 409 | {"error": "STOCK_INSUFFICIENT", "message": "Sản phẩm Áo Thun XL chỉ còn 2 chiếc trong kho", "details": {"product_id": "...", "available": 2, "requested": 5}} |
| Response 422 | {"error": "COUPON_EXPIRED", "message": "Mã giảm giá SUMMER2026 đã hết hạn sử dụng"} |

**▌ ****Chuẩn hóa Error Response — áp dụng TOÀN BỘ API**
| HTTP Code | Error Code | Khi Nào Dùng |
| --- | --- | --- |
| 400 | INVALID_INPUT | Thiếu field bắt buộc, sai kiểu dữ liệu, giá trị không hợp lệ |
| 401 | MISSING_TOKEN | Không có Authorization header trên endpoint cần auth |
| 401 | TOKEN_EXPIRED | JWT hết hạn (Access Token: 15 phút) → FE tự gọi /auth/refresh |
| 401 | INVALID_CREDENTIALS | Đăng nhập sai username hoặc mật khẩu |
| 401 | ACCOUNT_LOCKED | Khóa 15 phút sau 5 lần đăng nhập sai |
| 403 | FORBIDDEN | Token hợp lệ nhưng role không đủ quyền truy cập endpoint |
| 404 | NOT_FOUND | Resource không tồn tại trong DB |
| 409 | STOCK_INSUFFICIENT | Đặt hàng khi số lượng tồn kho không đủ |
| 409 | ORDER_NOT_CANCELLABLE | Không thể hủy đơn ở trạng thái hiện tại |
| 422 | COUPON_EXPIRED | Mã giảm giá hết hạn hoặc đã sử dụng |
| 429 | RATE_LIMIT_EXCEEDED | Vượt giới hạn request (100 req/phút/IP) |
| 500 | INTERNAL_ERROR | Lỗi server không xác định — log server-side, KHÔNG expose chi tiết cho client |

## 2.5  Bảo Mật & Triển Khai
| ⚠️  Phiên bản cũ ghi Access Token TTL là "15 phút" ở một nơi và "24 giờ" ở nơi khác — gây nhầm lẫn khi implement. Tài liệu này thống nhất: Access Token = 15 phút, Refresh Token = 7 ngày. KHÔNG thay đổi mà không cập nhật tất cả các nơi liên quan. |
| --- |

| Hạng Mục | Giải Pháp | Chi Tiết Kỹ Thuật |
| --- | --- | --- |
| JWT & Session | Access Token + Refresh Token | Access Token TTL: 15 phút (lưu trong memory / httpOnly cookie). Refresh Token TTL: 7 ngày (httpOnly cookie, Secure, SameSite=Strict). KHÔNG dùng localStorage — dễ bị XSS đánh cắp |
| Rate Limiting | Giới hạn theo IP | 100 request/phút/IP. Đăng nhập: 5 lần sai → khóa 15 phút. Trả 429 với Retry-After header |
| Mã hóa mật khẩu | bcrypt | Salt rounds = 12, không lưu mật khẩu plain text dưới bất kỳ hình thức nào |
| Input Validation | Chống XSS & SQL Injection | Sanitize HTML input, dùng parameterized queries (ORM hoặc prepared statements), validate tất cả field đầu vào |
| CORS | Chỉ domain được ủy quyền | Whitelist domain: production domain + staging domain. KHÔNG dùng wildcard (*) trên production |
| HTTPS | TLS bắt buộc mọi môi trường | Caddy hoặc Let's Encrypt auto-renew cert, HTTP redirect sang HTTPS, HSTS header |
| Backup DB | Tự động hàng ngày | Backup 00:00 mỗi ngày, lưu 30 ngày, backup off-site (S3 khác region). Test restore định kỳ mỗi tháng |
| Monitoring | Log tập trung + Alert | Alert khi error rate > 5% hoặc response time p95 > 2 giây. Stack: Grafana + Loki + Prometheus |
| Deploy Strategy | Blue-Green Deployment | Zero-downtime deployment. Rollback trong vòng 5 phút nếu health check thất bại |

## 2.6  Kế Hoạch & Phân Chia Công Việc
| 🚨  RỦI RO TIMELINE: 13 tuần cho đầy đủ Backend + Frontend + Admin phức tạp + tích hợp 3 bên (Thanh toán, SMS, Giao hàng) + QA load test + UAT là rất căng. Khuyến nghị: Giảm scope MVP, tăng thêm 2–3 tuần cho testing, ưu tiên chất lượng hơn tốc độ. |
| --- |

**▌ ****Timeline thực tế đề xuất: 16 tuần**
| Tuần | Mốc Quan Trọng | Sản Phẩm Bàn Giao | DoD (Definition of Done) |
| --- | --- | --- | --- |
| 1–2 | Hoàn thành thiết kế kỹ thuật | Architecture doc, ERD chi tiết, API Spec v1 | Tech Lead và BA duyệt ký. API Spec được team Backend & Frontend xác nhận không có điểm mơ hồ |
| 3–4 | Demo MVP cơ bản (xem & thêm giỏ hàng) | Module Auth + Product + Cart (chức năng cơ bản) | User có thể đăng ký, đăng nhập, tìm sản phẩm, thêm vào giỏ hàng. Unit test coverage > 60% |
| 5–8 | Hoàn thành chức năng MVP | Module Order + Payment + Admin Panel | Đặt hàng end-to-end thành công. Ít nhất 1 cổng thanh toán hoạt động. Admin CRUD sản phẩm và đơn hàng |
| 9–11 | Internal Testing & Bug Fixing | Test report, danh sách bug đã fix | Không còn bug Critical hoặc High. Load test 1.000 CCU thành công. Security scan qua |
| 12–13 | UAT với khách hàng | UAT report, go-live checklist | Khách hàng ký nghiệm thu. Danh sách bug UAT đã fix hoặc có kế hoạch xử lý sau launch |
| 14–15 | Chuẩn bị Go-Live & Data Migration | Dữ liệu sản phẩm đã import, domain và SSL sẵn sàng | Website chạy trên production với dữ liệu thực. Smoke test qua. Monitoring dashboard hoạt động |
| 16 | Go-Live + Hỗ trợ Post-Launch | Website production, tài liệu vận hành | Khách hàng tự vận hành được Admin panel. Tài liệu bàn giao đầy đủ |

## 2.7  Quy Định Kỹ Thuật (Coding Standards & Git Flow)
| Hạng Mục | Quy Định | Lý Do |
| --- | --- | --- |
| Code Style | ESLint + Prettier config, naming convention nhất quán (camelCase cho biến, PascalCase cho component, UPPER_CASE cho constant) | Code dễ đọc, dễ review, giảm tranh cãi về style |
| Git Flow | main (production), develop (staging), feature/* (development), hotfix/* (sửa lỗi khẩn cấp trên prod) | Quy trình rõ ràng, tránh merge trực tiếp vào main |
| Pull Request | Yêu cầu ít nhất 1 reviewer approve trước khi merge. Template PR có checklist: self-review, test, screenshot | Phát hiện bug sớm, chia sẻ kiến thức trong team |
| Commit Message | Conventional Commits: feat/fix/chore/refactor/test/docs: mô tả ngắn (ví dụ: feat: add payment webhook handler) | Changelog tự động, lịch sử commit có ý nghĩa |
| No Hardcode | Config → env var. URL → env var. Secret → secret manager. KHÔNG hardcode trong code | Bảo mật, dễ thay đổi giữa môi trường |
| Migration = DDL | CREATE TABLE, ALTER TABLE chỉ trong file migration. KHÔNG sửa trực tiếp DB production | Môi trường tái hiện được, rollback dễ dàng |

# PHẦN 3 — TÓM TẮT DÒNG CHẢY TÀI LIỆU
| Vai Trò | Nhận Từ | Sản Xuất | Giao Cho | DoD Bàn Giao |
| --- | --- | --- | --- | --- |
| Khách hàng | Yêu cầu kinh doanh (brain dump) | BRD (phối hợp BA) | Business Analyst | BRD được cả hai bên ký duyệt |
| Business Analyst | BRD từ khách hàng | SRS, Wireframes, NFR, AC, Use Case Diagram | Technical Lead + UX/UI Designer | SRS được TL và KH duyệt ký. Mọi AC có đủ kịch bản pass/fail |
| UX/UI Designer | Wireframes từ BA | Design System, High-Fidelity Mockups, Prototype | Frontend Team | Mockup có annotation đầy đủ. Design System export assets sẵn sàng |
| Technical Lead | SRS từ BA | Architecture, ERD chi tiết, API Spec, Kế hoạch Sprint, Git Flow | Toàn bộ Dev Team | ERD có kiểu dữ liệu và constraint. API Spec có request/response/error schema |
| Backend Team | SRS, ERD, API Spec | API endpoint + Business Logic + Unit Test | Frontend Team, QA | API chạy trên staging. Unit test coverage > 70% cho business logic. Swagger doc cập nhật |
| Frontend Team | Mockups, API Spec, Design System | UI + API Integration + E2E Test | QA, Khách hàng | Responsive đúng design. Không có console error. Accessibility cơ bản pass |
| QA Team | SRS, AC, Business Rules, API Spec | Test Cases + Bug Report + Test Report | Dev Teams, PM | 100% test case pass. Không còn bug Critical/High. Load test báo cáo đã xong |
| DevOps Team | Architecture, Deployment Plan | CI/CD Pipeline + Infrastructure + Monitoring | Dev Teams | Pipeline tự động pass. Monitoring dashboard hoạt động. SSL cert hợp lệ |

# PHẦN 4 — LƯU Ý QUAN TRỌNG CHO KHÁCH HÀNG
| # | Lưu Ý | Rủi Ro Nếu Bỏ Qua |
| --- | --- | --- |
| 1 | Duyệt tài liệu kỹ trước khi Dev bắt đầu code. Mọi thay đổi sau khi duyệt SRS sẽ được xử lý qua Quy trình Change Request (Phần 5) | Thay đổi giữa chừng tốn gấp 3–10 lần chi phí so với thay đổi trước khi code |
| 2 | Tham gia UAT nghiêm túc — dành tối thiểu 2–3 ngày kiểm thử từng chức năng theo UAT Plan | Phát hiện sai lệch sau Go-Live tốn kém hơn nhiều, ảnh hưởng trực tiếp đến doanh thu |
| 3 | Chuẩn bị dữ liệu sản phẩm từ Sprint 2 (không chờ đến trước Go-Live) | Website Go-Live nhưng không có sản phẩm để hiển thị = thất bại |
| 4 | Yêu cầu bàn giao đầy đủ: Source code, Database schema, API doc, Hướng dẫn Admin, Tài liệu vận hành | Phụ thuộc hoàn toàn vào đơn vị phát triển cho mọi thay đổi nhỏ |
| 5 | Thỏa thuận rõ về bảo trì sau Launch: SLA xử lý sự cố (Critical: 4 giờ, Normal: 24 giờ), chi phí nâng cấp, phiên bản được hỗ trợ | Khi gặp sự cố production không biết liên hệ ai, mất bao lâu để fix |
| 6 | Giữ kênh liên lạc thường xuyên với BA/PM để cập nhật tiến độ và điều chỉnh kịp thời | Phát hiện sai hướng muộn → phải làm lại nhiều |

# PHẦN 5 — QUY TRÌNH QUẢN LÝ THAY ĐỔI (CHANGE REQUEST)
Thực tế cho thấy khách hàng luôn có thay đổi yêu cầu trong quá trình phát triển. Cần có quy trình rõ ràng để kiểm soát thay đổi — tránh tình trạng "thêm nhỏ thôi" tích lũy thành scope creep không kiểm soát được.

## 5.1  Phân Loại Thay Đổi
| Loại | Ví Dụ | Người Xử Lý | Thời Gian Đánh Giá | Cần Duyệt Timeline? |
| --- | --- | --- | --- | --- |
| Nhỏ (Minor) | Đổi màu button, đổi nội dung văn bản, đổi thứ tự hiển thị | Dev tự xử lý | < 1 ngày | Không |
| Vừa (Medium) | Thêm 1 trường thông tin, đổi luồng xử lý 1 bước, thêm 1 báo cáo đơn giản | Tech Lead đánh giá | 1–2 ngày | Có thể — Tech Lead quyết định |
| Lớn (Major) | Thêm module mới, đổi luồng nghiệp vụ chính, tích hợp hệ thống thứ 3 mới | BA + Tech Lead đánh giá | 3–5 ngày | Bắt buộc — KH phải duyệt sau khi nhận báo cáo impact |

## 5.2  Quy Trình Change Request (6 Bước)
| Bước | Hành Động | Người Thực Hiện | Output |
| --- | --- | --- | --- |
| 1 — Lập phiếu CR | Mô tả rõ thay đổi yêu cầu, lý do thay đổi và mức độ ưu tiên (bằng template §5.3) | KH hoặc BA | Phiếu CR với mã CR-YYYY-NNN |
| 2 — Đánh giá impact | Đánh giá tác động đến timeline, chi phí, kiến trúc và các module liên quan | Tech Lead + BA | Báo cáo impact: công sức (giờ), ảnh hưởng sprint nào |
| 3 — Phân loại | Phân loại Minor / Medium / Major theo bảng §5.1 | Tech Lead | CR được gán loại và mức độ ưu tiên |
| 4 — Phê duyệt | Minor: Tech Lead. Medium: PM. Major: Khách hàng sau khi nhận báo cáo impact | Đúng cấp phê duyệt | CR status: Approved / Rejected / Deferred |
| 5 — Cập nhật tài liệu | Cập nhật SRS, API Spec, Backlog theo thay đổi đã duyệt. Thông báo cho Dev team | BA + Tech Lead | Tài liệu phiên bản mới, backlog cập nhật |
| 6 — Theo dõi & Đóng CR | Theo dõi tiến độ implement trong Jira/Trello, verify hoàn thành, đóng CR | PM + QA | CR status: Closed, Test case cập nhật |

## 5.3  Template Phiếu Change Request
| Trường | Nội Dung Cần Điền |
| --- | --- |
| Mã CR | CR-2026-001 (tự sinh theo thứ tự) |
| Ngày yêu cầu | DD/MM/YYYY |
| Người yêu cầu | Tên, vai trò, email |
| Mô tả thay đổi | Hiện tại hệ thống đang làm gì? Cần thay đổi thành gì? Tại sao cần thay đổi? |
| Màn hình / Module bị ảnh hưởng | Liệt kê cụ thể: trang nào, endpoint nào, bảng DB nào |
| Mức độ ưu tiên | Critical / High / Medium / Low — và lý do |
| Deadline mong muốn | Ngày cần hoàn thành (nếu có) và lý do (ví dụ: campaign marketing) |
| Tiêu chí chấp nhận (AC) | Khi nào CR này được xem là hoàn thành? |
| Phê duyệt | Chữ ký / xác nhận của người có thẩm quyền theo phân loại §5.1 |

# PHẦN 6 — BỔ SUNG KỸ THUẬT
## 6.1  Chiến Lược Testing
| ℹ️  Phân công rõ ràng: Backend tự viết Unit Test. QA viết Integration Test và E2E Test. DevOps tích hợp vào CI/CD. Không phân công = không ai làm. |
| --- |

| Loại Test | Người Viết | Công Cụ | Mục Tiêu | Khi Chạy |
| --- | --- | --- | --- | --- |
| Unit Test | Backend Dev | Jest (Node.js) / go test (Go) | Business logic: tính giá, kiểm kho, áp mã giảm giá. Coverage > 70% cho service layer | Mỗi lần commit (pre-commit hook) |
| Integration Test | QA phối hợp Backend | Postman / Newman / Supertest | Test API endpoint với DB thực tế. Mọi endpoint trong API Spec phải có test case | Mỗi PR → staging |
| E2E Test (End-to-End) | QA | Cypress hoặc Playwright | Luồng đầy đủ: đặt hàng COD, thanh toán MoMo, hủy đơn, hoàn tiền. Chạy tự động thay cho regression test bằng tay | Trước khi merge vào main |
| Load Test | QA phối hợp DevOps | k6 hoặc Locust | 1.000 CCU, 100 đơn/phút — không degradation, response time p95 < 500ms | Sprint 9–11 (Internal Testing) |
| Security Scan | DevOps + QA | OWASP ZAP hoặc Trivy | Kiểm tra OWASP Top 10: SQLi, XSS, CSRF, broken auth, exposed secrets | Định kỳ mỗi sprint |
| Visual Regression | QA Frontend | Percy hoặc Chromatic | Phát hiện thay đổi UI không mong muốn sau khi sửa code | Mỗi PR có thay đổi CSS / component |

## 6.2  Quy Trình Nhập Dữ Liệu (Data Seeding & Migration)
| ⚠️  Website Go-Live mà không có dữ liệu sản phẩm = thất bại. Đây là công việc thường bị bỏ qua trong kế hoạch sprint — hãy đưa vào Sprint 4 (sau khi Admin panel hoàn thành), trước UAT 2 tuần. |
| --- |

- Nguồn dữ liệu: Khách hàng cung cấp file Excel/CSV chứa danh sách sản phẩm, hoặc nhập tay qua Admin panel. Xác định rõ ai nhập và thời hạn chuẩn bị dữ liệu từ Sprint 2.
- Import tool: Dev xây dựng công cụ import hỗ trợ: mapping cột linh hoạt, validation (kiểm tra dữ liệu hợp lệ), báo cáo lỗi theo dòng, phát hiện sản phẩm trùng lặp.
- Data migration plan (nếu có hệ thống cũ): Mapping cấu trúc dữ liệu, xử lý dữ liệu không nhất quán, verify toàn vẹn sau migrate, chạy thử trên môi trường staging trước.
- Kiểm định: Sau import, chạy SQL query kiểm tra tổng số sản phẩm, ảnh còn thiếu, giá âm hoặc NULL, tồn kho âm.

## 6.3  Tích Hợp Marketing & Analytics
| Công Cụ | Mục Đích | Khi Nào Tích Hợp |
| --- | --- | --- |
| Google Analytics 4 (GA4) | Theo dõi lưu lượng truy cập, hành vi người dùng, tỷ lệ chuyển đổi | Sprint 5–6 (trước UAT) |
| Google Tag Manager (GTM) | Quản lý tập trung các tracking snippet — thêm/sửa tracking mà không cần sửa code | Sprint 5 (cài đặt sớm) |
| Facebook Pixel + CAPI | Theo dõi sự kiện từ Facebook Ads, tạo Custom Audience và Lookalike Audience. Server-side (CAPI) để chống mất dữ liệu do ad blocker | Sprint 7–8 |
| Server-side Conversion Tracking | Gửi dữ liệu chuyển đổi trực tiếp từ server đến GA4 và Facebook — chống mất dữ liệu | Sprint 8 |
| SEO on-page | Structured data Schema.org, sitemap.xml tự động cập nhật, canonical URL | Sprint 3–4 (song song Frontend) |

## 6.4  Pháp Lý & Compliance
| Hạng Mục | Nội Dung | Bắt Buộc / Khuyến Nghị |
| --- | --- | --- |
| Chính sách bảo mật (Privacy Policy) | Mô tả rõ: thu thập dữ liệu gì, mục đích gì, lưu trữ bao lâu, chia sẻ với ai. Tuân thủ Nghị định 13/2023/NĐ-CP của Việt Nam về bảo vệ dữ liệu cá nhân | BẮT BUỘC trước Go-Live |
| Điều khoản dịch vụ (Terms of Service) | Quy định quyền và nghĩa vụ của khách hàng và nhà cung cấp: chính sách đổi trả, bảo hành, giải quyết tranh chấp | BẮT BUỘC trước Go-Live |
| PCI-DSS (cơ bản) | KHÔNG lưu thông tin thẻ tín dụng trên server. Dùng tokenization qua payment gateway (VNPay, MoMo, Stripe). Hiển thị badge "Thanh toán an toàn" | BẮT BUỘC nếu có tích hợp thẻ |
| Cookie Consent | Hiển thị banner xin phép sử dụng cookie trước khi tracking. Lưu trữ sự đồng ý của người dùng | KHUYẾN NGHỊ |
| Hóa đơn điện tử | Tích hợp phát hành hóa đơn GTGT điện tử theo quy định Bộ Tài chính Việt Nam (nếu cần) | Tùy theo loại hình kinh doanh |

# PHẦN 7 — TỔNG KẾT & ĐIỂM CẢI TIẾN SO VỚI V1.0
| # | Điểm Cải Tiến | Lý Do | Mức Ưu Tiên |
| --- | --- | --- | --- |
| 1 | Kiến trúc: Modular Monolith thay vì Microservices cho giai đoạn 1 | Microservices là over-engineering cho MVP trong 13 tuần, tốn 4–6 tuần setup hạ tầng | 🔴 CAO |
| 2 | Thêm vai trò UX/UI Designer với quy trình UX Review và Design System | Frontend tự chế UI dẫn đến không đồng bộ, trải nghiệm người dùng kém | 🔴 CAO |
| 3 | Thêm Quy trình Change Request với Template phiếu CR (Phần 5) | Khách hàng luôn thay đổi yêu cầu — cần quy trình kiểm soát để không mất kiểm soát dự án | 🔴 CAO |
| 4 | Thống nhất JWT TTL: Access Token = 15 phút, Refresh Token = 7 ngày (một nguồn duy nhất) | Phiên bản cũ có mâu thuẫn "15 phút" và "24 giờ" tại hai nơi khác nhau | 🔴 CAO |
| 5 | ERD chi tiết với kiểu dữ liệu, constraint, index và lý do thiết kế | ERD cũ chỉ liệt kê tên bảng và cột — Developer không thể viết migration trực tiếp | 🟠 CAO |
| 6 | API Spec với request body, response schema (success & error) và ví dụ cụ thể | Spec cũ chỉ có method + endpoint — Frontend không thể làm việc độc lập | 🟠 CAO |
| 7 | Timeline thực tế: 16 tuần với DoD rõ ràng cho từng milestone | Phiên bản cũ vừa cảnh báo "13 tuần là căng" vừa đưa 13 tuần làm kế hoạch chính thức | 🟠 CAO |
| 8 | Phân công Testing rõ ràng: ai viết loại test nào, dùng công cụ gì, khi nào chạy | Phiên bản cũ đề xuất các loại test nhưng không nói ai thực hiện | 🟡 TRUNG BÌNH |
| 9 | Bổ sung Acceptance Criteria với ví dụ cụ thể cho từng tính năng | Thiếu AC là nguyên nhân chính tranh cãi giữa Dev, QA và khách hàng khi nghiệm thu | 🟡 TRUNG BÌNH |
| 10 | Bổ sung Data Seeding / Migration plan với checklist kiểm định | Website Go-Live mà không có dữ liệu sản phẩm là thất bại | 🟡 TRUNG BÌNH |
| 11 | Chuẩn hóa Error Response format áp dụng toàn bộ API | Thiếu chuẩn hóa dẫn đến FE phải xử lý nhiều format lỗi khác nhau | 🟡 TRUNG BÌNH |

| ✅  Tài liệu này là phiên bản nâng cấp toàn diện, đủ để dùng làm SOP nội bộ cho team phát triển. Hãy điều chỉnh tech stack, timeline và quy mô team cho phù hợp với từng dự án cụ thể. |
| --- |

| 🛒  Quy Trình Phát Triển Website Bán Hàng Online  ·  v2.0  ·  Tác giả: Z.ai  ·  Tháng 4/2026 |
| --- |
