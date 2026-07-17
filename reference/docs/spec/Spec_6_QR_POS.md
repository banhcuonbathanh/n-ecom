# 📱 HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
## SPEC 6 — QR Ordering & POS (Point of Sale)
> **Version:** v1.0 · Branch: `feat/6-qr-pos` · Phụ thuộc: Spec 1 (Auth) · Spec 4 (Orders)
> **Model:** Sonnet · Tháng 4/2026

---

## 1. Mục Tiêu

Cho phép khách hàng tại bàn tự đặt món bằng cách quét QR code, không cần nhân viên trực tiếp nhận. Cashier quản lý POS để xác nhận, gộp đơn và xử lý thanh toán. Kitchen Display System (KDS) hiển thị đơn realtime cho bếp.

---

## 2. Phạm Vi

| Phần | Nội Dung |
|---|---|
| QR Flow | Decode QR token → xác định bàn → cấp Guest JWT → customer đặt món |
| POS | Cashier tạo/sửa đơn thủ công, confirm thanh toán tiền mặt |
| KDS | Kitchen display realtime qua WebSocket — chef nhận và cập nhật qty_served |
| Offline POS | Cashier có thể tạo đơn khi mạng yếu (optimistic local state) |
| Không thuộc spec này | Payment gateway integration (Spec 5), Staff CRUD (Spec 7) |

---

## 3. QR Token Flow

### 3.1 Cấu trúc QR Code

Mỗi bàn có 1 QR code vật lý in sẵn, encode URL dạng:

```
https://<domain>/table/<table_id>/qr?token=<qr_token>
```

| Field | Loại | Mô Tả |
|---|---|---|
| `table_id` | CHAR(36) UUID | ID bàn trong DB — không đổi |
| `qr_token` | VARCHAR(64) | Random token 32 bytes hex — có thể rotate bởi manager |

### 3.2 QR Token trong DB (003_tables.sql)

```sql
tables (
  id           CHAR(36) PK,
  name         VARCHAR(50) NOT NULL,    -- "Bàn 01", "Bàn VIP 1"
  capacity     INT NOT NULL DEFAULT 4,
  qr_token     CHAR(64) UNIQUE NOT NULL, -- rotate khi cần
  is_active    TINYINT(1) DEFAULT 1,
  created_at   DATETIME,
  updated_at   DATETIME
)
```

### 3.3 QR Scan Flow (Step-by-step)

```
Customer quét QR
    ↓
GET /api/v1/tables/qr/:qr_token
    ↓
BE: validate qr_token → lấy table_id, table_name, capacity
    ↓
BE: check table.is_active = 1 → reject nếu bàn không active
    ↓
Response: { table_id, table_name, has_active_order: bool }
    ↓
FE: Hiển thị màn hình menu /table/:table_id
    ↓
FE gọi POST /api/v1/auth/guest { qr_token }
    ↓
BE: verify qr_token → issue Guest JWT (TTL 2h, stateless)
    ↓
Customer dùng Guest JWT để POST /api/v1/orders
```

### 3.4 Conflict: Active Order On Scan

Khi customer quét QR và bàn đã có đơn active:

| Trường hợp | Xử lý |
|---|---|
| `has_active_order = true`, order thuộc guest này | FE redirect về trang theo dõi đơn đang có |
| `has_active_order = true`, order thuộc session khác | FE hiển thị thông báo "Bàn đang có đơn — liên hệ nhân viên" + nút "Gọi nhân viên" |
| `has_active_order = false` | FE hiển thị menu → cho phép đặt |

> **Rule:** 1 bàn tối đa 1 active order (pending/confirmed/preparing/ready) — xem MASTER §4.5

### 3.5 QR Token Rotation

| Sự Kiện | Hành Động |
|---|---|
| Manager nghi ngờ QR bị lộ | Manager gọi POST /api/v1/tables/:id/rotate-qr |
| BE tạo qr_token mới, lưu DB | In QR mới cho bàn đó |
| QR cũ | Không còn hợp lệ ngay lập tức (token không match DB) |

---

## 4. API Endpoints — QR & Tables

### GET /api/v1/tables/qr/:qr_token
> **Auth:** Public (không cần token)
> **Rate limit:** 10 req/min per IP

**Response 200:**
```json
{
  "data": {
    "table_id": "uuid",
    "table_name": "Bàn 05",
    "capacity": 4,
    "has_active_order": false
  }
}
```

**Response 404:**
```json
{ "error": "TABLE_NOT_FOUND", "message": "QR không hợp lệ hoặc bàn không tồn tại" }
```

**Response 403:**
```json
{ "error": "TABLE_INACTIVE", "message": "Bàn này tạm thời không hoạt động" }
```

---

### POST /api/v1/auth/guest
> **Auth:** Public
> **Rate limit:** 5 req/min per IP

**Request Body:**
```json
{ "qr_token": "abc123..." }
```

**Response 200:**
```json
{
  "data": {
    "access_token": "<guest JWT>",
    "expires_in": 7200,
    "table_id": "uuid",
    "table_name": "Bàn 05"
  }
}
```

**Guest JWT Payload** (xem MASTER §6.4):
```json
{
  "sub":      "guest",
  "role":     "customer",
  "table_id": "<table UUID>",
  "jti":      "<UUID>",
  "exp":      "now + 7200"
}
```

---

### POST /api/v1/tables/:id/rotate-qr
> **Auth:** Manager+ (RequireRole ≥ 5)

**Response 200:**
```json
{
  "data": {
    "table_id": "uuid",
    "new_qr_token": "newtoken...",
    "qr_url": "https://domain/table/uuid/qr?token=newtoken..."
  }
}
```

---

### GET /api/v1/tables
> **Auth:** Staff+ (RequireRole ≥ 3)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Bàn 01",
      "capacity": 4,
      "is_active": true,
      "active_order": { "id": "uuid", "status": "preparing", "total_amount": 95000 }
    }
  ]
}
```

---

## 5. POS — Point of Sale

### 5.1 Màn Hình POS (Cashier)

Cashier truy cập `/cashier` — giao diện gồm 3 panel:

| Panel | Nội Dung |
|---|---|
| Trái | Danh sách bàn với trạng thái (empty / has_order / ready_to_pay) |
| Giữa | Chi tiết đơn hàng của bàn đang chọn |
| Phải | Danh sách menu để thêm món thủ công |

### 5.2 Cashier Actions

| Action | Endpoint | Điều Kiện |
|---|---|---|
| Tạo đơn thủ công (không qua QR) | POST /api/v1/orders | `created_by_role = "cashier"`, `source = "pos"` |
| Thêm món vào đơn đang có | POST /api/v1/orders/:id/items | Order status ∈ {pending, confirmed} |
| Xác nhận đơn | PATCH /api/v1/orders/:id/status → confirmed | Từ pending |
| Gộp 2 bàn | POST /api/v1/orders/merge | Manager+ only |
| Tách bàn | POST /api/v1/orders/split | Manager+ only |
| Confirm thanh toán tiền mặt | POST /api/v1/payments — method: cod | Order status = ready |
| In hóa đơn | GET /api/v1/orders/:id/receipt | PDF/thermal format |

### 5.3 Offline POS Edge Case

Khi cashier mất mạng ngắn hạn:

| Bước | Hành Động |
|---|---|
| 1 | FE phát hiện mất kết nối → hiển thị banner "Offline mode" |
| 2 | Cashier vẫn tạo được đơn thủ công (optimistic local state) |
| 3 | FE queue các action vào IndexedDB |
| 4 | Khi có mạng lại → sync queue lên BE tuần tự |
| 5 | Nếu conflict (bàn đã có đơn) → FE thông báo, yêu cầu cashier giải quyết thủ công |

> **Giới hạn offline:** Chỉ tạo đơn mới và thêm món — không thể xử lý thanh toán khi offline.

---

## 6. Kitchen Display System (KDS)

### 6.1 Màn Hình KDS

Chef truy cập `/kitchen` — WebSocket connection tới BE.

```
FE connect: ws://be/ws/kitchen
BE broadcast khi: order tạo mới / item qty_served thay đổi / order status thay đổi
```

### 6.2 WebSocket Message Format

**Khi có đơn mới:**
```json
{
  "type": "ORDER_NEW",
  "data": {
    "order_id": "uuid",
    "table_name": "Bàn 05",
    "items": [
      { "id": "uuid", "name": "Bánh Cuốn Thịt", "quantity": 2, "qty_served": 0, "note": "" }
    ],
    "created_at": "2026-04-29T10:00:00Z"
  }
}
```

**Khi item được cập nhật:**
```json
{
  "type": "ITEM_UPDATE",
  "data": {
    "order_id": "uuid",
    "item_id": "uuid",
    "qty_served": 1,
    "quantity": 2,
    "derived_status": "preparing"
  }
}
```

### 6.3 Chef Actions

| Action | Endpoint | Mô Tả |
|---|---|---|
| Tăng qty_served | PATCH /api/v1/orders/:id/items/:item_id | `{ "qty_served_delta": 1 }` — cộng dồn, không set tuyệt đối |
| Mark toàn item done | PATCH /api/v1/orders/:id/items/:item_id | `{ "qty_served": <quantity> }` — set bằng quantity |

> BE auto-check: nếu tất cả items `qty_served = quantity` → order.status tự động chuyển `ready` → broadcast tới cashier.

### 6.4 item_status Derive (xem MASTER §4.1.1)

| qty_served | Derived Status | KDS Card Color |
|---|---|---|
| = 0 | pending | `#1F2937` (dark) |
| > 0 và < quantity | preparing | `#FCD34D` (yellow) |
| = quantity | done | `#3DB870` (green) |

---

## 6. Staff Orders on Behalf of Customer

### 6.1 Khi Nào Dùng?

| Tình Huống | Mô Tả |
|---|---|
| Khách không có điện thoại | Không thể quét QR — cashier đặt hộ qua POS |
| Khách không muốn tự đặt | Muốn gọi nhân viên như truyền thống |
| Khách không quen dùng điện thoại | Người cao tuổi, trẻ em |
| Đông khách, cần xử lý nhanh | Cashier tạo đơn ngay tại bàn |

### 6.2 Flow — Cashier Đặt Hộ Khách

```
Cashier mở POS → chọn bàn (VD: Bàn 03)
        ↓
[Tạo đơn mới] → POST /api/v1/orders
        ↓
Request body:
{
  "table_id":      "<table-uuid>",
  "source":        "pos",              ← PHÂN BIỆT với qr/online
  "created_by":    "<cashier-uuid>",   ← staff_id của cashier
  "customer_name": "Khách Bàn 3",     ← tùy chọn, có thể để null
  "customer_phone": null,              ← NULL được phép
  "note":          "Ít cay, thêm hành",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2,
      "unit_price": 45000,
      "topping_snapshot": [
        { "id": "uuid", "name": "Chả lụa", "price": 10000 }
      ],
      "note": "Không hành"
    }
  ]
}
        ↓
Đơn tạo thành công, broadcast tới KDS
        ↓
Cashier theo dõi đơn trực tiếp trên POS (không qua SSE điện thoại khách)
        ↓
Khi order = ready → cashier thông báo khách trực tiếp
```

### 6.3 Khác Biệt Với QR Flow

| Tiêu Chí | QR Flow (Guest) | Staff-Ordered (POS) |
|---|---|---|
| `source` | `qr` | `pos` |
| `created_by` | NULL (tự đặt) | staff UUID (cashier) |
| `customer_name/phone` | NULL | NULL (không bắt buộc) |
| Tracking | Khách tự xem SSE | Cashier xem trên POS |
| Auth token | Guest JWT | Staff JWT |
| KDS hiển thị | Như nhau | Như nhau |

### 6.4 Topping Per-Item — Format Chuẩn

Mỗi item trong `items[]` có thể có toppings riêng. Ví dụ: 2 tô bánh cuốn, 1 tô có chả lụa, 1 tô không:

```json
"items": [
  {
    "product_id": "uuid-banh-cuon",
    "quantity": 1,
    "unit_price": 45000,
    "topping_snapshot": [
      { "id": "uuid-cha-lua", "name": "Chả lụa", "price": 10000 }
    ],
    "note": "Có chả lụa"
  },
  {
    "product_id": "uuid-banh-cuon",
    "quantity": 1,
    "unit_price": 35000,
    "topping_snapshot": [],
    "note": "Không topping"
  }
]
```

> **Lưu ý quan trọng:** `topping_snapshot[].price` là giá tuyệt đối của topping (từ `toppings.price` trong DB), **KHÔNG phải delta**. `unit_price` của item = `product.price + SUM(topping.price)` — FE tính trước khi gửi. BE verify lại trước khi lưu.

---

## 7. Multi-Table Group (POS Flow)

### 7.1 Khi Nào Dùng?

Một nhóm khách đông ngồi trải dài 2–3 bàn (VD: Bàn 05 + Bàn 07). Mỗi bàn tự đặt qua QR hoặc cashier đặt hộ → cashier link 2 bàn thành 1 group để:
- Tính bill chung cho cả nhóm
- Khách ở Bàn 05 thấy được tình trạng cả 2 bàn
- Cashier quản lý 1 nhóm thay vì 2 đơn rời

### 7.2 Flow — Cashier Tạo Group

```
Cả 2 bàn đã có active order
        ↓
Cashier POS: chọn "Nhóm bàn" → chọn Bàn 05 + Bàn 07
        ↓
POST /api/v1/orders/group
{ "order_ids": ["uuid-ban-05", "uuid-ban-07"] }
        ↓
BE: set group_id = <new UUID> trên cả 2 orders (migration 008)
        ↓
Response: group_id + combined view
        ↓
Broadcast SSE group_created → khách 2 bàn nhận thông báo
```

### 7.3 Customer View — Tracking Group

Khi khách Bàn 05 mở trang theo dõi đơn:

```
FE: GET /orders/:id → response có group_id != null
        ↓
FE: subscribe GET /orders/group/:groupId/events (SSE)
        ↓
Hiển thị:
┌──────────────────────────────────────────┐
│  Nhóm bàn: BÀN 05 + BÀN 07   [ĐANG LÀM] │
│──────────────────────────────────────────│
│  🪑 Bàn 05                               │
│  Bánh Cuốn Thịt x2   ████░░ 1/2 đang làm│
│  Nước chanh x1        ░░░░░ Chờ          │
│──────────────────────────────────────────│
│  🪑 Bàn 07                               │
│  Bánh Cuốn Tôm x3    ░░░░░ Chờ          │
│  Trà đá x2            ████  Xong ✓      │
│──────────────────────────────────────────│
│  Tổng nhóm:  180.000 đ                   │
│  Bàn 05:      95.000 đ                   │
│  Bàn 07:      85.000 đ                   │
└──────────────────────────────────────────┘
```

### 7.4 Group Payment Options (POS)

| Tùy Chọn | Hành Động Cashier | Endpoint |
|---|---|---|
| **Thanh toán chung** | Một QR / một bill toàn nhóm | `POST /payments/group/:groupId { method }` |
| **Thanh toán riêng** | Xử lý từng bàn riêng như bình thường | `POST /payments` cho từng order |

> **Điều kiện thanh toán chung:** TẤT CẢ orders trong group phải có `status = ready` — không thể trả bill khi có bàn chưa xong.

### 7.5 Unlink / Tách Group

```
Manager POS: chọn group → "Tách bàn" → chọn Bàn 07
        ↓
DELETE /api/v1/orders/group/:groupId/orders/:orderId
        ↓
BE: set orders.group_id = NULL cho Bàn 07
        ↓
Khách Bàn 05: SSE group_updated → chỉ thấy Bàn 05 của mình
Khách Bàn 07: quay về theo dõi đơn riêng /orders/:id
```

---

## 8. Business Rules

| Mã | Rule | Chi Tiết |
|---|---|---|
| QR-001 | 1 bàn 1 active order | Reject POST /orders nếu bàn đang có order IN (pending, confirmed, preparing, ready) |
| QR-002 | Guest JWT validate table_id | table_id trong JWT phải match table_id trong request body khi source='qr' |
| QR-003 | Guest không có refresh | Hết 2h → customer quét lại QR — không có endpoint /auth/refresh cho guest |
| QR-004 | QR token rate limit | 10 req/min per IP trên GET /tables/qr/:token |
| POS-001 | Cashier thêm món: chỉ khi pending/confirmed | Đơn đang preparing trở đi → không thêm món — phải tạo đơn mới |
| POS-002 | Merge order: chỉ Manager+ | Gộp bàn ảnh hưởng doanh thu — cần quyền cao hơn |
| POS-003 | Offline sync conflict | Khi sync thất bại → không tự động overwrite — flag để cashier resolve |
| KDS-001 | qty_served không giảm | qty_served chỉ tăng — không thể undo (nếu nhầm → cashier handle thủ công) |
| KDS-002 | Auto ready | Khi SUM(qty_served) = SUM(quantity) trên toàn bộ items của order → order.status = ready |

---

## 9. Acceptance Criteria

| # | Kịch Bản | Kết Quả Mong Đợi |
|---|---|---|
| AC-1 | Customer quét QR hợp lệ, bàn trống | Hiển thị menu, cấp Guest JWT thành công |
| AC-2 | Customer quét QR hợp lệ, bàn đang có đơn | Thông báo "Bàn đang có đơn", không cấp JWT mới để tạo đơn |
| AC-3 | Customer quét QR không hợp lệ (token sai) | 404 TABLE_NOT_FOUND |
| AC-4 | Guest JWT hết hạn (sau 2h), customer đặt món | 401 TOKEN_EXPIRED, FE hướng dẫn quét lại QR |
| AC-5 | Guest table_id trong JWT ≠ table_id trong request | 403 FORBIDDEN |
| AC-6 | Cashier tạo đơn thủ công từ POS | Đơn tạo thành công, `source = "pos"`, broadcast tới KDS |
| AC-7 | Chef cập nhật qty_served cho tất cả items | order.status tự động chuyển `ready`, cashier nhận thông báo |
| AC-8 | Manager rotate QR token | QR cũ ngay lập tức không hợp lệ, QR mới hoạt động |
| AC-9 | Cashier offline tạo đơn → sync khi có mạng | Đơn được tạo trên BE, không duplicate |
| AC-10 | 2 đơn offline sync cùng lúc cho 1 bàn | Conflict detected, cashier thấy thông báo để resolve |
| AC-11 | Cashier tạo đơn hộ khách không có điện thoại | Đơn tạo thành công với source=pos, customer_phone=null |
| AC-12 | 2 sản phẩm cùng loại nhưng khác topping trong 1 đơn | 2 order_items riêng với topping_snapshot khác nhau |
| AC-13 | Cashier link Bàn 05 + Bàn 07 thành group | group_id được set, combined view hiển thị cả 2 bàn |
| AC-14 | Khách Bàn 05 mở tracking sau khi được group | Thấy items của Bàn 05 và Bàn 07, labeled theo bàn |
| AC-15 | Chef done item ở Bàn 07 | SSE push tới khách Bàn 05 và Bàn 07 (cùng group stream) |
| AC-16 | Cashier tách Bàn 07 khỏi group | Khách Bàn 07 quay về xem đơn riêng, không thấy Bàn 05 nữa |
| AC-17 | Thanh toán chung cả nhóm khi Bàn 07 chưa ready | 422 GROUP_NOT_ALL_READY |

---

## 10. Lỗi & Error Codes

| HTTP | Error Code | Khi Nào |
|---|---|---|
| 404 | TABLE_NOT_FOUND | qr_token không tồn tại trong DB |
| 403 | TABLE_INACTIVE | table.is_active = 0 |
| 409 | TABLE_HAS_ACTIVE_ORDER | POST /orders khi bàn đã có active order |
| 403 | TABLE_MISMATCH | table_id trong JWT ≠ table_id trong request |
| 422 | INVALID_QTY_SERVED | qty_served_delta < 0 hoặc qty_served > quantity |
| 403 | INSUFFICIENT_ROLE | Thao tác cần quyền cao hơn (group/split/rotate) |
| 409 | ORDER_ALREADY_GROUPED | Order đã thuộc group khác — gỡ khỏi group cũ trước |
| 422 | GROUP_NOT_ALL_READY | Thanh toán chung khi có order chưa ready |
| 403 | GROUP_ACCESS_DENIED | Guest token không thuộc order nào trong group |

---

> 🍜 BanhCuon System · Spec 6 QR & POS · v1.0 · Tháng 4/2026
