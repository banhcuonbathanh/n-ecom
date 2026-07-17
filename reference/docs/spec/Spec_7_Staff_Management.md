# 👥 HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
## SPEC 7 — Staff Management
> **Version:** v1.0 · Branch: `feat/7-staff-management` · Phụ thuộc: Spec 1 (Auth)
> **Model:** Sonnet · Tháng 4/2026

---

## 1. Mục Tiêu

Cung cấp CRUD đầy đủ cho nhân viên (staff): tạo tài khoản, phân quyền, kích hoạt/vô hiệu hóa, quản lý phiên đăng nhập. Manager quản lý nhân viên cấp thấp hơn; Admin quản lý tất cả kể cả Manager.

---

## 2. RBAC — Phân Quyền

> **Single source:** MASTER.docx §3. Spec này chỉ reference — không định nghĩa lại.

| Role | Level | Quyền Chính |
|---|---|---|
| `customer` | 1 | Đặt món qua QR, xem đơn của mình |
| `chef` | 2 | KDS: xem & cập nhật qty_served |
| `cashier` | 3 | POS: tạo đơn, confirm thanh toán |
| `staff` | 3 | Tương đương cashier + chef |
| `manager` | 5 | Quản lý nhân viên cấp ≤ 4, xem báo cáo, rotate QR |
| `admin` | 6 | Toàn quyền — quản lý manager, cấu hình hệ thống |

**Hierarchy rule:** Người dùng chỉ có thể tạo/sửa/vô hiệu hóa tài khoản có role ≤ role của mình − 1.

| Thao Tác | Manager (5) | Admin (6) |
|---|---|---|
| CRUD staff có role ≤ 4 (chef, cashier, staff) | ✅ | ✅ |
| CRUD manager (role = 5) | ❌ | ✅ |
| CRUD admin (role = 6) | ❌ | ❌ (không ai xóa được admin cuối) |
| Deactivate bản thân | ❌ | ❌ |

---

## 3. Database Schema (001_auth.sql)

```sql
staff (
  id            CHAR(36) PK DEFAULT (UUID()),
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,       -- bcrypt cost=12
  email         VARCHAR(100) NULL,
  role          ENUM('customer','chef','cashier','staff','manager','admin') DEFAULT 'cashier',
  full_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20) NULL,
  is_active     TINYINT(1) DEFAULT 1,         -- 0 = deactivated, middleware rejects
  created_at    DATETIME NOT NULL,
  updated_at    DATETIME NOT NULL,
  deleted_at    DATETIME NULL                 -- soft delete
)
```

**Index:** `username` (UNIQUE), `role`, `is_active`, `deleted_at`

---

## 4. API Endpoints

### GET /api/v1/staff
> **Auth:** Manager+ (RequireRole ≥ 5)
> **Mô tả:** Danh sách nhân viên (không bao gồm deleted_at IS NOT NULL)

**Query params:**
| Param | Kiểu | Mô Tả |
|---|---|---|
| `role` | string | Filter theo role: chef, cashier, staff, manager |
| `is_active` | bool | Filter active/inactive |
| `page` | int | Trang (default 1) |
| `limit` | int | Số bản ghi mỗi trang (default 20, max 100) |
| `search` | string | Tìm theo username hoặc full_name (LIKE) |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "username": "chef_an",
      "full_name": "Nguyễn Văn An",
      "role": "chef",
      "phone": "0901234567",
      "email": "an@banh.vn",
      "is_active": true,
      "created_at": "2026-04-01T08:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45 }
}
```

---

### GET /api/v1/staff/:id
> **Auth:** Manager+ hoặc chính nhân viên đó (self-read)

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "username": "chef_an",
    "full_name": "Nguyễn Văn An",
    "role": "chef",
    "phone": "0901234567",
    "email": "an@banh.vn",
    "is_active": true,
    "created_at": "2026-04-01T08:00:00Z",
    "updated_at": "2026-04-20T14:00:00Z"
  }
}
```

---

### POST /api/v1/staff
> **Auth:** Manager+ (RequireRole ≥ 5)
> **Mô tả:** Tạo tài khoản nhân viên mới

**Request Body:**
```json
{
  "username":   "cashier_linh",
  "password":   "SecurePass123!",
  "full_name":  "Trần Thị Linh",
  "role":       "cashier",
  "phone":      "0912345678",
  "email":      "linh@banh.vn"
}
```

**Validation:**
| Field | Rule |
|---|---|
| `username` | Required, 3–50 ký tự, chỉ a-z 0-9 _ -, không trùng |
| `password` | Required, tối thiểu 8 ký tự, có chữ hoa + số |
| `full_name` | Required, 2–100 ký tự |
| `role` | Required, phải ∈ {chef, cashier, staff} nếu manager tạo; ∈ {chef, cashier, staff, manager} nếu admin tạo |
| `phone` | Optional, 10–11 số |
| `email` | Optional, valid email format |

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "username": "cashier_linh",
    "role": "cashier",
    "full_name": "Trần Thị Linh",
    "is_active": true,
    "created_at": "2026-04-29T10:00:00Z"
  }
}
```

**Response 409:**
```json
{ "error": "USERNAME_TAKEN", "message": "Tên đăng nhập đã tồn tại" }
```

---

### PATCH /api/v1/staff/:id
> **Auth:** Manager+ hoặc chính nhân viên đó (self-update, role bị khóa)
> **Mô tả:** Cập nhật thông tin nhân viên

**Request Body** (tất cả optional — chỉ gửi field cần update):
```json
{
  "full_name": "Trần Thị Linh Mới",
  "phone":     "0912345679",
  "email":     "linh.new@banh.vn",
  "role":      "staff"
}
```

**Rules:**
- `role`: Chỉ Manager+ được đổi. Manager không thể đổi role ≥ 5.
- `username`: Không thể đổi sau khi tạo.
- `password`: Dùng endpoint riêng PATCH /staff/:id/password.

**Response 200:**
```json
{ "data": { "id": "uuid", "full_name": "Trần Thị Linh Mới", "updated_at": "..." } }
```

---

### PATCH /api/v1/staff/:id/password
> **Auth:** Chính nhân viên đó (đổi mật khẩu bản thân) hoặc Admin (reset cho người khác)

**Request Body:**
```json
{
  "current_password": "OldPass123!",
  "new_password":     "NewPass456!"
}
```

> Admin reset: không cần `current_password` — bỏ qua field đó.

**Response 200:**
```json
{ "message": "Mật khẩu đã được cập nhật thành công" }
```

---

### PATCH /api/v1/staff/:id/status
> **Auth:** Manager+ (RequireRole ≥ 5)
> **Mô tả:** Kích hoạt hoặc vô hiệu hóa tài khoản

**Request Body:**
```json
{ "is_active": false }
```

**Business Rules:**
- Manager không thể deactivate chính mình.
- Manager không thể deactivate tài khoản có role ≥ role manager.
- Khi `is_active` chuyển về `false`:
  1. BE update `staff.is_active = 0` trong DB
  2. BE xóa Redis key `is_active:{staff_id}` → cache miss → middleware re-check DB → trả 401 `ACCOUNT_DISABLED`
  3. Tất cả phiên đang đăng nhập của nhân viên đó bị từ chối trong vòng TTL Redis (tối đa 5 phút)

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "is_active": false,
    "updated_at": "2026-04-29T11:00:00Z"
  }
}
```

**Response 403 — self-deactivation:**
```json
{ "error": "SELF_DEACTIVATION_FORBIDDEN", "message": "Không thể vô hiệu hóa tài khoản của chính mình" }
```

**Response 403 — insufficient role:**
```json
{ "error": "INSUFFICIENT_ROLE", "message": "Không đủ quyền để thay đổi tài khoản này" }
```

---

### DELETE /api/v1/staff/:id
> **Auth:** Admin only (RequireRole = 6)
> **Mô tả:** Soft delete — set `deleted_at = NOW()`

**Rules:**
- Không thể xóa tài khoản admin cuối cùng (kiểm tra COUNT admin > 1 trước khi xóa).
- Không thể xóa chính mình.
- Sau soft delete: tài khoản không còn xuất hiện trong GET /staff, không thể đăng nhập.

**Response 200:**
```json
{ "message": "Tài khoản đã bị xóa" }
```

**Response 409:**
```json
{ "error": "LAST_ADMIN", "message": "Không thể xóa admin cuối cùng của hệ thống" }
```

---

### GET /api/v1/staff/:id/sessions
> **Auth:** Chính nhân viên đó hoặc Manager+
> **Mô tả:** Danh sách phiên đăng nhập đang active (từ refresh_tokens table)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_agent": "Mozilla/5.0...",
      "ip_address": "192.168.1.100",
      "created_at": "2026-04-29T08:00:00Z",
      "last_used_at": "2026-04-29T10:30:00Z",
      "expires_at": "2026-05-29T08:00:00Z"
    }
  ]
}
```

---

### DELETE /api/v1/staff/:id/sessions/:session_id
> **Auth:** Chính nhân viên đó hoặc Admin
> **Mô tả:** Đăng xuất một phiên cụ thể (revoke refresh token)

**Response 200:**
```json
{ "message": "Phiên đăng nhập đã bị hủy" }
```

---

### DELETE /api/v1/staff/:id/sessions
> **Auth:** Admin only
> **Mô tả:** Đăng xuất tất cả phiên (force logout toàn bộ)

**Response 200:**
```json
{ "message": "Tất cả phiên đăng nhập đã bị hủy", "count": 3 }
```

---

## 5. Cache Invalidation — is_active

Middleware kiểm tra `is_active` qua Redis trước khi cho phép request:

```
Request đến
    ↓
Middleware check Redis key: is_active:{staff_id}
    ↓ cache HIT
Giá trị = 0 → 401 ACCOUNT_DISABLED
Giá trị = 1 → tiếp tục
    ↓ cache MISS
Query DB: SELECT is_active FROM staff WHERE id = ?
    ↓
Set Redis: SETEX is_active:{staff_id} 300 {0|1}
    ↓
Xử lý như cache HIT
```

**Khi Manager deactivate nhân viên:**
```go
// 1. Update DB
UPDATE staff SET is_active = 0 WHERE id = ?

// 2. Xóa Redis key → force re-check ngay lập tức
DEL is_active:{staff_id}

// 3. Nhân viên gửi request tiếp theo → cache miss → query DB → is_active = 0 → 401
```

> **Lag tối đa:** Không có lag (key bị xóa ngay) — trừ khi Redis đang replication delay.

---

## 6. Business Rules

| Mã | Rule | Chi Tiết |
|---|---|---|
| SM-001 | Hierarchy phân quyền | Chỉ tạo/sửa/deactivate tài khoản có role ≤ role bản thân − 1 |
| SM-002 | Không self-deactivate | Manager/Admin không thể deactivate chính mình qua API |
| SM-003 | Bảo vệ admin cuối | Không thể xóa admin duy nhất còn lại |
| SM-004 | Cache invalidation ngay | Khi deactivate → xóa Redis key `is_active:{id}` ngay lập tức |
| SM-005 | Max sessions | Tối đa 5 active refresh token per staff — xóa oldest khi vượt |
| SM-006 | Password hash | bcrypt cost=12 — không lưu plain text dưới bất kỳ hình thức |
| SM-007 | Username không đổi | Sau khi tạo, username là bất biến — chỉ admin có thể delete và tạo lại |
| SM-008 | Soft delete | Không xóa vật lý — `deleted_at = NOW()` — giữ lịch sử đơn hàng tham chiếu |

---

## 7. Acceptance Criteria

| # | Kịch Bản | Kết Quả Mong Đợi |
|---|---|---|
| AC-1 | Manager tạo nhân viên role=chef | Tài khoản tạo thành công, `is_active = true` |
| AC-2 | Manager cố tạo nhân viên role=manager | 403 INSUFFICIENT_ROLE |
| AC-3 | Manager deactivate chef đang đăng nhập | Chef gửi request tiếp theo → 401 ACCOUNT_DISABLED (không lag) |
| AC-4 | Manager cố deactivate chính mình | 403 SELF_DEACTIVATION_FORBIDDEN |
| AC-5 | Admin xóa tài khoản duy nhất của admin | 409 LAST_ADMIN |
| AC-6 | Nhân viên đổi mật khẩu bản thân (current_password đúng) | 200, mật khẩu cập nhật thành công |
| AC-7 | Nhân viên đổi mật khẩu (current_password sai) | 401 INVALID_CREDENTIALS |
| AC-8 | Admin force-logout tất cả phiên của nhân viên | Tất cả refresh_tokens bị xóa, nhân viên phải login lại |
| AC-9 | GET /staff — Manager xem danh sách | Không thấy tài khoản admin/manager trong list (chỉ thấy ≤ staff) |
| AC-10 | Staff thứ 6 đăng nhập (vượt max sessions) | Session cũ nhất (last_used_at cũ nhất) bị xóa tự động |

---

## 8. Error Codes

| HTTP | Error Code | Khi Nào |
|---|---|---|
| 409 | USERNAME_TAKEN | username đã tồn tại |
| 403 | SELF_DEACTIVATION_FORBIDDEN | Manager/admin cố deactivate bản thân |
| 403 | INSUFFICIENT_ROLE | Tạo/sửa tài khoản có role ≥ bản thân |
| 409 | LAST_ADMIN | Xóa admin cuối cùng |
| 404 | STAFF_NOT_FOUND | staff_id không tồn tại hoặc đã soft-deleted |
| 401 | ACCOUNT_DISABLED | `is_active = 0` — middleware từ chối request |
| 400 | INVALID_ROLE | role không thuộc danh sách hợp lệ |

---

> 🍜 BanhCuon System · Spec 7 Staff Management · v1.0 · Tháng 4/2026
