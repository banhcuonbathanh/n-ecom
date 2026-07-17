| 📋  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
API CONTRACT — Tài Liệu Giao Tiếp Frontend ↔ Backend
v1.1  ·  Go Gin · REST · WebSocket · SSE · JWT · RBAC  ·  Tháng 4/2026
Thay đổi từ v1.0: UUID string IDs, bỏ "success" field, Section 11 → pointer sang ERROR_CONTRACT.docx |
| --- |

| Tài liệu này định nghĩa toàn bộ API contract giữa Frontend (Next.js 14) và Backend (Go Gin). Bao gồm: Base URL, Auth flow, Request/Response schema, và tất cả endpoints theo từng domain. Áp dụng cho Phase 1, Phase 2, và Phase 3. |
| --- |

# Section 1 — Tổng Quan & Quy Ước
## 1.1 Base URL & Ports
| Backend API  :  http://localhost:8002/api/v1      (dev)
Frontend     :  http://localhost:3000             (dev)
Production   :  https://your-domain.com/api/v1   (via Caddy) |
| --- |

## 1.2 Request Format
• Content-Type: application/json  cho tất cả JSON requests
• Content-Type: multipart/form-data  cho file upload
• Authorization: Bearer <access_token>  cho authenticated endpoints

## 1.3 Response Format
| v1.1 CHANGE: Bỏ field "success" khỏi response. Success response chỉ có "data". Error response theo ERROR_CONTRACT.docx: { "error", "message", "details" } |
| --- |

| // Success — chỉ có "data", không có "success" field
{
  "data": { ... },
  "message": "optional"
}

// Error — theo ERROR_CONTRACT.docx (SINGLE SOURCE)
{
  "error":   "SCREAMING_SNAKE_CODE",
  "message": "Thông báo tiếng Việt cho user",
  "details": {}    ← optional
} |
| --- |

## 1.4 ID Format
| v1.1 CHANGE: Tất cả IDs là UUID string (CHAR(36)) — không phải integer. Ví dụ: "id": "550e8400-e29b-41d4-a716-446655440000" |
| --- |

## 1.5 HTTP Status Codes
| HTTP Code | Ý Nghĩa |
| --- | --- |
| 200 OK | Request thành công, có data trả về |
| 201 Created | Tạo mới resource thành công |
| 204 No Content | Thành công, không có data trả về (DELETE) |
| 400 Bad Request | Input validation lỗi — kiểm tra request body |
| 401 Unauthorized | Token thiếu hoặc hết hạn — gọi /auth/refresh |
| 403 Forbidden | Token hợp lệ nhưng không đủ quyền (RBAC) |
| 404 Not Found | Resource không tồn tại |
| 409 Conflict | Business rule violation (inventory rollback, duplicate active order) |
| 422 Unprocessable | File type/size không hợp lệ |
| 429 Too Many Req | Rate limit exceeded |
| 500 Internal Err | Server error — không expose chi tiết ra client |

## 1.6 RBAC Role Hierarchy
| Customer < Chef < Cashier < Staff < Manager < Admin

Public    = Không cần token
Any auth  = Bất kỳ role nào có token hợp lệ
Chef+     = Chef, Cashier, Staff, Manager, Admin
Cashier+  = Cashier, Staff, Manager, Admin
Staff+    = Staff, Manager, Admin
Manager+  = Manager, Admin
Admin     = Admin only
Owner     = Customer chủ đơn hoặc Staff+
CV Svc    = CV Service (X-CV-Secret header) |
| --- |

## 1.7 Authentication Flow
| Access Token hết hạn sau 24h. Refresh Token lưu httpOnly cookie, hết hạn sau 30d. Khi nhận 401, FE tự gọi /auth/refresh một lần, nếu thất bại → redirect /login. |
| --- |

# Section 2 — Auth Endpoints
| Method | Endpoint | Mô Tả | Role |
| --- | --- | --- | --- |
| POST | /api/v1/auth/login | Đăng nhập — trả access token + set refresh cookie | Public |
| POST | /api/v1/auth/refresh | Làm mới access token dùng refresh cookie | Public |
| POST | /api/v1/auth/logout | Xóa refresh token khỏi Redis, clear cookie | Any auth |
| GET | /api/v1/auth/me | Thông tin user đang đăng nhập | Any auth |

### POST /auth/login — Request
| Field | Type | Required | Mô Tả |
| --- | --- | --- | --- |
| username | string | Required | Username của staff |
| password | string | Required | Password (bcrypt so sánh server-side) |

### POST /auth/login — Response 200
| {
  "data": {
    "access_token": "eyJhbGci...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",  ← UUID string
      "username": "nguyen_van_a",
      "full_name": "Nguyen Van A",
      "role": "manager",
      "email": "nva@banhcuon.vn"
    }
  }
}
// Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict |
| --- |

# Section 3 — Products & Catalog
| Method | Endpoint | Mô Tả | Role |
| --- | --- | --- | --- |
| GET | /api/v1/products | List tất cả sản phẩm active kèm toppings | Public |
| GET | /api/v1/products/:id | Chi tiết một sản phẩm | Public |
| POST | /api/v1/products | Tạo sản phẩm mới | Manager+ |
| PUT | /api/v1/products/:id | Cập nhật sản phẩm | Manager+ |
| DELETE | /api/v1/products/:id | Soft-delete — set is_active=false | Admin |
| GET | /api/v1/categories | List tất cả categories active (đã sort) | Public |
| GET | /api/v1/toppings | List tất cả toppings active | Public |
| GET | /api/v1/combos | List combos kèm combo_items expanded | Public |

### POST /products — Request Body
| Field | Type | Required | Mô Tả |
| --- | --- | --- | --- |
| name | string | Required | Tên sản phẩm |
| price | number | Required | Giá (VND) |
| category_id | string (UUID) | Required | UUID của danh mục |
| description | string | Optional | Mô tả sản phẩm |
| image_path | string | Optional | object_path từ /files/upload |
| topping_ids | string[] | Optional | Mảng topping UUIDs được phép |
| is_available | boolean | Optional | Mặc định true |

### GET /products — Response Schema
| {
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",  ← UUID string
      "name": "Bánh Cuốn Thịt",
      "price": 45000,
      "category": {
        "id": "7f3d2b1a-...",  ← UUID string
        "name": "Bánh Cuốn"
      },
      "image_url": "https://cdn.example.com/products/...",
      "toppings": [
        { "id": "a1b2c3d4-...", "name": "Chả lụa", "price": 10000 }
      ],
      "is_available": true
    }
  ]
} |
| --- |

# Section 4 — Orders
| Order State Machine: pending → confirmed → preparing → ready → delivered │ cancelled. Huỷ đơn chỉ được phép khi tổng qty_served / tổng quantity < 30%. 1 bàn chỉ được phép 1 ACTIVE order cùng lúc. |
| --- |

| Method | Endpoint | Mô Tả | Role |
| --- | --- | --- | --- |
| POST | /api/v1/orders | Tạo đơn mới (online hoặc POS offline) | Customer+ |
| GET | /api/v1/orders/:id | Chi tiết đơn — kiểm tra ownership | Owner / Staff+ |
| PATCH | /api/v1/orders/:id/status | Cập nhật status đơn | Chef+ |
| PATCH | /api/v1/orders/items/:id | Update qty_served — trigger deduct kho | Chef+ |
| DELETE | /api/v1/orders/:id | Huỷ đơn nếu < 30% done | Owner / Manager+ |
| GET | /api/v1/orders/live | List tất cả đơn đang active | Staff+ |

### POST /orders — Request Body
| Field | Type | Required | Mô Tả |
| --- | --- | --- | --- |
| table_id | string (UUID) | Optional | UUID bàn (QR/POS) — null nếu online delivery |
| source | string | Required | "online" │ "qr" │ "pos" |
| note | string | Optional | Ghi chú đơn |
| customer_name | string | Optional | Tên khách (cho online/delivery) |
| customer_phone | string | Optional | SĐT khách |
| items | array | Required | Danh sách món đặt (xem sub-schema bên dưới) |

### items[] sub-schema
| Field | Type | Required | Mô Tả |
| --- | --- | --- | --- |
| product_id | string (UUID) | Optional | UUID sản phẩm (null nếu là combo header) |
| combo_id | string (UUID) | Optional | UUID combo — BE tự expand thành sub-items |
| quantity | integer | Required | Số lượng (> 0) |
| toppings | array | Optional | [{ topping_id: UUID, quantity: int }] — snapshot giá tại thời điểm đặt |
| note | string | Optional | Ghi chú riêng cho món |

### POST /orders — Response 201
| {
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  ← UUID string
    "order_number": "ORD-20260410-001",
    "status": "pending",
    "table_id": "7f3d2b1a-...",
    "source": "qr",
    "total_amount": 145000,
    "items": [
      {
        "id": "b2c3d4e5-...",  ← UUID string
        "product_id": "c3d4e5f6-...",
        "name": "Bánh Cuốn Thịt",
        "unit_price": 45000,
        "quantity": 2,
        "qty_served": 0,
        "toppings_snapshot": [...],
        "combo_ref_id": null
      }
    ],
    "created_at": "2026-04-10T08:00:00Z"
  }
} |
| --- |

# Section 5 — Payments
| Payment chỉ được tạo khi order.status = "ready". Webhook endpoints được ký (signed) bởi gateway — BE verify signature trước khi xử lý. |
| --- |

| Method | Endpoint | Mô Tả | Role |
| --- | --- | --- | --- |
| POST | /api/v1/payments | Tạo payment cho order có status=ready | Cashier+ |
| POST | /api/v1/payments/webhook/vnpay | VNPay IPN webhook (signature verified) | Public (signed) |
| POST | /api/v1/payments/webhook/momo | MoMo webhook (signature verified) | Public (signed) |
| POST | /api/v1/payments/webhook/zalopay | ZaloPay webhook (signature verified) | Public (signed) |

### POST /payments — Request Body
| Field | Type | Required | Mô Tả |
| --- | --- | --- | --- |
| order_id | string (UUID) | Required | UUID order — phải có status = "ready" |
| method | string | Required | "vnpay" │ "momo" │ "zalopay" │ "cash" |
| amount | number | Required | Số tiền (VND) — phải khớp order.total_amount |
| proof_image_path | string | Optional | object_path ảnh xác nhận chuyển khoản |

# Section 6 — Tables
| Tables endpoint mới trong v1.1 — cần cho QR flow và POS. qr_token là CHAR(64) hex, unique per table. |
| --- |

| Method | Endpoint | Mô Tả | Role |
| --- | --- | --- | --- |
| GET | /api/v1/tables | List tất cả bàn (kèm status) | Staff+ |
| POST | /api/v1/tables | Tạo bàn mới | Manager+ |
| PATCH | /api/v1/tables/:id | Cập nhật bàn (name, capacity, status) | Manager+ |
| GET | /api/v1/tables/qr/:token | Decode QR token → trả table info + active order (nếu có) | Public |

### GET /tables/qr/:token — Response 200
| {
  "data": {
    "table": {
      "id": "7f3d2b1a-...",  ← UUID string
      "name": "Bàn 01",
      "capacity": 4,
      "status": "available"
    },
    "active_order": null  ← hoặc order object nếu đang có đơn active
  }
} |
| --- |

# Section 7 — File Upload
| Method | Endpoint | Mô Tả | Role |
| --- | --- | --- | --- |
| POST | /api/v1/files/upload | Upload ảnh/file — trả object_path để lưu vào record | Staff+ |
| DELETE | /api/v1/files/:id | Đánh dấu is_orphan=true — cleanup job xóa sau 24h | Staff+ |

### POST /files/upload — Response 201
| {
  "data": {
    "id": "88f3a2b1-...",  ← UUID string
    "object_path": "products/2026/04/image_abc123.jpg",
    "url": "https://cdn.example.com/products/2026/04/image_abc123.jpg"
  }
}
// Lưu object_path vào DB, không lưu full URL
// Full URL = STORAGE_BASE_URL + "/" + object_path |
| --- |

# Section 8 — Inventory (Phase 2)
| Inventory tự động deduct khi Chef click item done trên KDS. Mọi deduct là transaction — lỗi bất kỳ → rollback toàn bộ → 409 INVENTORY_INSUFFICIENT. |
| --- |

| Method | Endpoint | Mô Tả | Role |
| --- | --- | --- | --- |
| GET | /api/v1/inventory | Danh sách tồn kho + threshold | Manager+ |
| POST | /api/v1/inventory | Tạo nguyên liệu mới | Manager+ |
| PATCH | /api/v1/inventory/:id | Cập nhật qty / threshold / tên | Manager+ |
| DELETE | /api/v1/inventory/:id | Xóa nguyên liệu (chưa có recipe dùng) | Admin |
| GET | /api/v1/inventory/low-stock | Danh sách nguyên liệu sắp hết | Manager+ |
| GET | /api/v1/products/:id/recipe | Công thức nguyên liệu của một sản phẩm | Manager+ |
| PUT | /api/v1/products/:id/recipe | Upsert toàn bộ công thức (replace) | Manager+ |
| POST | /api/v1/inventory/:id/adjust | Điều chỉnh thủ công + ghi log | Manager+ |
| GET | /api/v1/inventory/:id/logs | Lịch sử thay đổi kho (có pagination) | Manager+ |

# Section 9 — Dashboard & Reports (Phase 2)
| Method | Endpoint | Mô Tả | Role |
| --- | --- | --- | --- |
| GET | /api/v1/dashboard/summary | 4 KPI: revenue, orders, active, low-stock | Manager+ |
| GET | /api/v1/dashboard/revenue-by-hour | Doanh thu theo 24 giờ hôm nay | Manager+ |
| GET | /api/v1/dashboard/top-products | Top 10 sản phẩm bán chạy | Manager+ |
| GET | /api/v1/reports/revenue | Revenue report với granularity | Manager+ |
| GET | /api/v1/reports/orders | Orders report có filter | Manager+ |
| GET | /api/v1/reports/products | Products report theo kỳ | Manager+ |
| GET | /api/v1/reports/revenue/export | CSV export revenue (streaming) | Manager+ |
| GET | /api/v1/reports/orders/export | CSV export orders (streaming) | Manager+ |

# Section 10 — Realtime: WebSocket & SSE
## 10.1 WebSocket — Kitchen & Live Orders
| WS Endpoint: ws://localhost:8002/ws
Auth: ?token=<access_token>  (query param)

Reconnect config (áp dụng cho mọi WS/SSE connection):
  maxAttempts : 5
  baseDelay   : 1000ms  (x2 mỗi lần — exponential backoff)
  maxDelay    : 30000ms
  showBanner  : sau 3 lần thất bại hiện "Mất kết nối" |
| --- |

### WS Event Types — Server → Client
| Event Type | Payload | Gửi tới | Mô Tả |
| --- | --- | --- | --- |
| new_order | object | Staff+ | Đơn mới vừa được tạo — KDS & /orders/live |
| order_updated | object | Staff+ | Order status thay đổi |
| item_progress | object | Staff+ | qty_served của 1 item thay đổi |
| order_completed | object | Any auth | Tất cả items done → order ready |
| low_stock | object | Manager+ | Nguyên liệu xuống dưới min_alert_level |

## 10.2 SSE — Order Tracking
| SSE Endpoint: GET /api/v1/orders/:id/events
Auth: Authorization: Bearer <access_token>  (header)
Content-Type: text/event-stream |
| --- |

### SSE item_progress Payload
| data: {
  "type": "item_progress",
  "data": {
    "order_id": "a1b2c3d4-...",  ← UUID string
    "item_id": "b2c3d4e5-...",   ← UUID string
    "qty_served": 1,
    "quantity": 2,
    "progress_pct": 50,
    "item_status": "preparing"
  }
} |
| --- |

# Section 11 — CV Integration (Phase 3)
| Method | Endpoint | Mô Tả | Role |
| --- | --- | --- | --- |
| POST | /api/v1/cv/counts | Nhận dish counts từ cv-service (X-CV-Secret) | CV Svc |
| GET | /api/v1/cv/counts | Lịch sử dish counts có pagination | Manager+ |
| GET | /api/v1/cv/snapshot | Latest JPEG snapshot từ camera bếp | Manager+ |
| GET | /api/v1/cv/health | CV service health check status | Manager+ |
| GET | /api/v1/cv/cameras | Danh sách cameras đã đăng ký | Manager+ |

# Section 12 — Error Codes
| → SINGLE SOURCE: ERROR_CONTRACT.docx

Không định nghĩa error codes trong file này.
Mọi error code, HTTP mapping, Go handler pattern, FE interceptor pattern → xem ERROR_CONTRACT.docx. |
| --- |

| v1.1 CHANGE: Section 11 (v1.0) chứa error code registry trùng với ERROR_CONTRACT.docx và MASTER.docx §7. Đã xoá để tránh 3 sources. ERROR_CONTRACT.docx là nguồn duy nhất. |
| --- |

*📋  BanhCuon System  ·  API CONTRACT  ·  v1.1  ·  Tháng 4/2026*