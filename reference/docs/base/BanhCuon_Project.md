| 🍜
HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
PROJECT OVERVIEW — Mô Tả Dự Án
v11.0 · ECC-Free · Next.js 14 · Go Gin · MySQL 8.0 · Redis Stack |
| --- |

| ℹ️  Tài liệu này mô tả tổng quan dự án: bài toán, đối tượng, tech stack, database, RBAC và kiến trúc hệ thống. |
| --- |

# Section 1 — Giới Thiệu Dự Án
### 1.1 Bài Toán Cần Giải Quyết
Quán Bánh Cuốn hoạt động theo mô hình kết hợp online và offline. Trước đây quản lý hoàn toàn thủ công: nhân viên ghi tay, bếp nhận phiếu giấy, thu ngân tính tiền bằng máy tính cầm tay — dẫn đến sai sót đơn hàng, chậm trễ phục vụ, thiếu dữ liệu phân tích.
Hệ thống số hóa toàn bộ quy trình: từ lúc khách đặt món đến bếp hoàn thành, thu ngân thanh toán, quản lý kho tự động.

### 1.2 Đối Tượng Sử Dụng
| Role | Mô Tả | Chức Năng Chính |
| --- | --- | --- |
| Customer Online | Đặt qua website | Menu, topping, combo, checkout VNPay/MoMo/ZaloPay, theo dõi đơn realtime |
| Customer QR Tại Bàn | Quét QR đặt món | QR decode → nhận bàn → order → theo dõi SSE |
| Chef / Cook | Bếp | KDS full-screen, color-code 3 mức, click update, flag 🚩 |
| Cashier | Thu ngân | POS 2 cột, tạo đơn offline, 4 phương thức, in hóa đơn |
| Manager / Admin | Quản lý & Quản trị | Dashboard, Reports, CRUD sản phẩm/kho/nhân sự |

### 1.3 Tổng Quan Tính Năng Theo Phase
| Tính Năng | Mô Tả | Phase | Trạng Thái |
| --- | --- | --- | --- |
| Đặt hàng Online | Menu web, topping modal, combo, giỏ hàng Zustand | Phase 1 | 🔄 Đang làm |
| QR Tại Bàn | Quét QR → tự nhận bàn → đặt món → gửi bếp | Phase 1 | 🔄 Đang làm |
| POS Offline | Cashier tạo đơn tại quán, 4 phương thức | Phase 1 | 🔄 Đang làm |
| KDS Bếp | Màn hình realtime, color-code, sound alert | Phase 1 | 🔄 Đang làm |
| Theo Dõi Đơn | SSE realtime, tiến độ %, qty_served từng món | Phase 1 | 🔄 Đang làm |
| Quản Lý Kho | Tự động trừ kho khi done, alert gần hết | Phase 2 | 📋 Chờ |
| Dashboard & Reports | Doanh thu theo giờ/ngày/tháng, YoY | Phase 2 | 📋 Chờ |
| Nhân Sự & Training | Hồ sơ, lịch ca, khoá học, điểm số | Phase 2 | 📋 Chờ |
| Marketing | Campaign, ROI, CPA, chi phí theo danh mục | Phase 2 | 📋 Chờ |
| Computer Vision | YOLOv8 đếm món qua camera RTSP | Phase 3 | 📋 Chờ |

# Section 2 — Tech Stack & System Design
| Layer | Technology | Ghi Chú |
| --- | --- | --- |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + Zustand | SSR + client state |
| Backend | Go 1.22 + Gin + sqlc + database/sql | High performance REST + WebSocket |
| Database | MySQL 8.0 + Redis Stack 7 (Bloom filter) | Relational + cache + time-series |
| Real-time | WebSocket (Go channels) + SSE (Redis Pub/Sub) | KDS + Order tracking |
| Auth | JWT Access Token (24h) + Refresh Token (30d, httpOnly) + RBAC 6 roles |  |
| Payment | VNPay / MoMo / ZaloPay QR + Tiền mặt COD | 4 phương thức |
| Deploy | Docker + Docker Compose + Caddy (HTTPS auto) | Production VPS |
| CV (Phase 3) | Python FastAPI + YOLOv8 + OpenCV + RTSP | Đếm món qua camera |

### Order State Machine
| ℹ️  pending → confirmed → preparing → ready → delivered | cancelled

Huỷ đơn chỉ được phép khi tổng qty_served / tổng quantity < 30%. |
| --- |

### 6 Roles & RBAC
| Role | Mô Tả | Đặc Quyền Chính |
| --- | --- | --- |
| Customer | Khách online / QR tại bàn | Xem menu, đặt đơn, theo dõi đơn, huỷ (<30% done) |
| Chef / Cook | Nhân viên bếp | Xem KDS, cập nhật trạng thái món, flag 🚩 |
| Cashier | Thu ngân | Tạo đơn offline POS, xử lý thanh toán, upload ảnh |
| Staff | Nhân viên tổng hợp | Chef + Cashier + upload file |
| Manager | Quản lý quán | Staff + Dashboard, Reports, CRUD sản phẩm/kho/nhân sự |
| Admin | Quản trị hệ thống | Manager + cấu hình hệ thống, xóa data, quản lý accounts |

# Section 3 — Design System
### 3.1 Design Tokens
| Token | HEX | Dùng Cho |
| --- | --- | --- |
| Primary / Accent | #FF7A1A | Buttons chính, border highlight, giá tiền, header table |
| Dark Background | #0A0F1E | Background trang tối, section divider |
| Card Background | #1F2937 | Card, modal background |
| Success / Green | #3DB870 | Trạng thái xong, badge success |
| Warning / Yellow | #FCD34D | Ca sáng, cảnh báo, sắp hết hàng |
| Error / Red | #FC8181 | Hết hàng, huỷ đơn, urgent KDS |
| Gray Text | #9CA3AF | Text phụ, placeholder, metadata |

# Section 4 — Database Design
| Domain | Tables Chính | Mô Tả |
| --- | --- | --- |
| Auth & Staff | staff, staff_schedules, staff_training_modules, training_courses | Tài khoản, ca làm, training |
| Products | products, categories, toppings, product_toppings, combos, combo_items | Menu, combo, topping |
| Orders | orders, order_items | Đơn online + offline, combo expand, qty_served tracking |
| Payments | payments | 4 phương thức, gateway_ref, webhook |
| Inventory | inventory_items, product_recipes, inventory_logs | Kho, công thức món, lịch sử xuất nhập |
| Marketing | marketing_campaigns, marketing_costs | Campaign, chi phí, leads, ROI |
| Files | file_attachments | Orphan tracking, soft delete qua is_orphan flag |

### 4.2 Key Design Decisions
- Combo expand: lưu sub-items với combo_ref_id — bếp biết món cụ thể, track qty_served chính xác
- Lưu object_path thay full URL — migrate storage dễ dàng, chỉ đổi 1 env var STORAGE_BASE_URL
- Toppings JSONB snapshot — giá tại thời điểm đặt, không bị ảnh hưởng khi admin update
- Soft delete với is_orphan cho file uploads — cleanup job mỗi 6h, xóa sau 24h
- Bloom filter (Redis Stack) — fast existence check trước DB query
- 1 table → max 1 ACTIVE order (status IN pending/confirmed/preparing/ready)

# Section 5 — API Endpoints (Tổng Quan)
### 5.1 Auth
| Method | Endpoint | Mô Tả | Role |
| --- | --- | --- | --- |
| POST | /api/v1/auth/login | Đăng nhập, trả access + refresh token | Public |
| POST | /api/v1/auth/refresh | Làm mới access token | Public |
| POST | /api/v1/auth/logout | Xóa refresh token khỏi Redis | Any auth |
| GET | /api/v1/auth/me | Thông tin user hiện tại | Any auth |

| ℹ️  Danh sách đầy đủ endpoints → xem be/CLAUDE_BE.docx hoặc docs/API_CONTRACT.md |
| --- |

🍜 BanhCuon System · PROJECT OVERVIEW · v11.0 · ECC-Free · Thang 4 / 2026