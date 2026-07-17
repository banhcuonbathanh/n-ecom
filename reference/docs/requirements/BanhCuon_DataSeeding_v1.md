# 🗃️ HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
## Quy Trình Nhập Dữ Liệu (Data Seeding & Migration)
> **Version:** v1.0 · Tháng 4/2026
> **Mục đích:** Đảm bảo website Go-Live có đủ dữ liệu thực — tránh tình trạng launch mà không có sản phẩm.

---

## 1. Tổng Quan

> **Cảnh báo:** Website Go-Live không có dữ liệu sản phẩm = thất bại hoàn toàn. Đây là công việc thường bị bỏ quên trong kế hoạch sprint.

**Mốc thời gian:**
- Khách hàng chuẩn bị dữ liệu từ: **Sprint 4** (song song với Admin panel)
- Hoàn thành nhập dữ liệu trước: **UAT + 1 tuần** (để QA và khách hàng có dữ liệu test)
- Smoke test dữ liệu production: **Ngày Go-Live**

---

## 2. Danh Mục Dữ Liệu Cần Nhập

### 2.1 Dữ Liệu Bắt Buộc (Trước UAT)

| Loại Dữ Liệu | Ví Dụ | Số Lượng Ước Tính | Ai Chuẩn Bị |
|---|---|---|---|
| Danh mục sản phẩm | Bánh Cuốn, Nước uống, Combo | 3–10 danh mục | Chủ quán |
| Sản phẩm | Bánh Cuốn Thịt, BC Tôm, Nước chanh... | 20–50 sản phẩm | Chủ quán |
| Toppings | Chả lụa, Hành phi, Tương bần... | 5–15 topping | Chủ quán |
| Combos | Combo 2 người, Combo gia đình | 3–8 combo | Chủ quán |
| Bàn (Tables) | Bàn 01–10, Bàn VIP 1–3 | 10–20 bàn | Kỹ thuật |
| Tài khoản Admin | 1 admin chính | 1 tài khoản | Kỹ thuật |
| Tài khoản Manager | 1–2 người | 1–2 tài khoản | Kỹ thuật |
| Ảnh sản phẩm | JPEG/PNG, tối thiểu 800x800px | 1 ảnh/sản phẩm | Chủ quán |

### 2.2 Dữ Liệu Tùy Chọn (Trước hoặc Sau Go-Live)

| Loại Dữ Liệu | Ghi Chú |
|---|---|
| Tài khoản nhân viên | Cashier, Chef — có thể tạo sau Go-Live |
| Dữ liệu lịch sử đơn hàng | Nếu có hệ thống cũ — xem §5 Data Migration |
| Chương trình khuyến mãi | Flash sale, combo giảm giá |

---

## 3. Định Dạng File Nhập Liệu

### 3.1 File Excel/CSV — Sản Phẩm

Khách hàng cung cấp file theo template sau (tải về từ Admin panel):

```
| Tên sản phẩm      | Danh mục     | Giá (VND) | Mô tả            | Trạng thái |
|-------------------|--------------|-----------|-------------------|------------|
| Bánh Cuốn Thịt    | Bánh Cuốn    | 35000     | Nhân thịt băm...  | Đang bán   |
| Bánh Cuốn Tôm     | Bánh Cuốn    | 45000     | Nhân tôm tươi...  | Đang bán   |
| Nước Chanh        | Nước uống    | 15000     |                   | Đang bán   |
```

**Quy tắc file:**
- Encoding: UTF-8 (có BOM cho Excel trên Windows)
- Tên sheet: "Sản phẩm"
- Không có hàng header ẩn
- Giá: số nguyên VND, không có dấu chấm/phẩy
- Tên danh mục: phải khớp chính xác với danh mục đã tạo trong hệ thống

### 3.2 Ảnh Sản Phẩm

| Yêu Cầu | Chi Tiết |
|---|---|
| Định dạng | JPEG hoặc PNG |
| Kích thước tối thiểu | 800 x 800 px (square) |
| Dung lượng tối đa | 5MB / ảnh |
| Đặt tên file | `[tên_sản_phẩm]_[số].jpg` — VD: `banh_cuon_thit_1.jpg` |
| Cung cấp | Folder zip, đặt tên theo sản phẩm |

---

## 4. Quy Trình Import

### 4.1 Bước Import Sản Phẩm

> ⚠️ **Lưu ý:** Các endpoint `/api/v1/admin/import/products` và `/api/v1/admin/files/bulk` chưa có trong API_CONTRACT_v1.2.md. Cần tạo CR hoặc thêm vào spec trước khi implement. Cho đến khi có, dùng cách thủ công qua Admin panel hoặc seed SQL (§6).

```
Bước 1: Tạo danh mục trước
    → Admin panel: Menu → Danh mục → Thêm danh mục
    → Xác nhận ID danh mục trước khi import sản phẩm

Bước 2: Validate file Excel
    → Tool kiểm tra: tên cột đúng chưa, encoding UTF-8 chưa,
      giá có phải số nguyên không, danh mục có tồn tại không

Bước 3: Import sản phẩm (dry run)
    → POST /api/v1/admin/import/products?dry_run=true  [cần spec trước khi implement]
    → Xem báo cáo: X sản phẩm hợp lệ, Y lỗi (kèm dòng lỗi)
    → Sửa file nếu có lỗi → lặp lại

Bước 4: Import thật
    → POST /api/v1/admin/import/products               [cần spec trước khi implement]
    → Lưu transaction ID để rollback nếu cần

Bước 5: Upload ảnh
    → Bulk upload qua Admin panel hoặc POST /api/v1/admin/files/bulk  [cần spec]
    → Map ảnh với sản phẩm theo tên file

Bước 6: Verify sau import (xem §4.2)
```

### 4.2 SQL Verification Queries (chạy sau import)

```sql
-- Tổng số sản phẩm đã import
SELECT COUNT(*) AS total_products FROM products WHERE deleted_at IS NULL;

-- Sản phẩm chưa có ảnh
SELECT id, name FROM products
WHERE image_path IS NULL AND deleted_at IS NULL;

-- Sản phẩm có giá = 0 hoặc NULL (lỗi dữ liệu)
SELECT id, name, price FROM products
WHERE (price = 0 OR price IS NULL) AND deleted_at IS NULL;

-- Danh mục không có sản phẩm nào
SELECT c.id, c.name
FROM categories c
LEFT JOIN products p ON p.category_id = c.id AND p.deleted_at IS NULL
WHERE p.id IS NULL AND c.deleted_at IS NULL;

-- Sản phẩm có tên trùng lặp
SELECT name, COUNT(*) as count
FROM products
WHERE deleted_at IS NULL
GROUP BY name
HAVING COUNT(*) > 1;

-- Kiểm tra tổng số bàn và QR token
SELECT id, name, qr_token IS NOT NULL AS has_qr
FROM tables
WHERE is_active = 1;
```

---

## 5. Data Migration (Nếu Có Hệ Thống Cũ)

### 5.1 Các Bước

| Bước | Hành Động | Lưu Ý |
|---|---|---|
| 1 — Mapping | Map cột DB cũ → DB mới | Xử lý field bị đổi tên, field mới bắt buộc |
| 2 — Extract | Export từ hệ thống cũ | CSV hoặc SQL dump |
| 3 — Transform | Chuẩn hóa dữ liệu | Xử lý encoding, giá trị NULL, format không nhất quán |
| 4 — Validate | Kiểm tra dữ liệu sau transform | Không có NULL bắt buộc, giá >= 0, UUID hợp lệ |
| 5 — Staging test | Chạy migration trên staging | Verify toàn vẹn, test app với dữ liệu mới |
| 6 — Production | Chạy migration production | Maintenance window — thông báo trước |
| 7 — Verify | Chạy SQL verification (§4.2) | Sign-off với chủ quán |

### 5.2 Rollback Plan

```bash
# Trước khi migration production — backup bắt buộc
mysqldump -u root -p banh_cuon > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql

# Nếu migration thất bại
mysql -u root -p banh_cuon < backup_pre_migration_*.sql
```

---

## 6. Seeding Môi Trường Dev/Staging

### 6.1 Seed Script (`be/migrations/seeds/`)

```sql
-- seed_categories.sql
INSERT INTO categories (id, name, sort_order, created_at, updated_at)
VALUES
  (UUID(), 'Bánh Cuốn', 1, NOW(), NOW()),
  (UUID(), 'Nước uống', 2, NOW(), NOW()),
  (UUID(), 'Combo', 3, NOW(), NOW());

-- seed_products.sql (chạy sau seed_categories)
INSERT INTO products (id, category_id, name, price, is_available, created_at, updated_at)
SELECT UUID(), c.id, 'Bánh Cuốn Thịt', 35000, 1, NOW(), NOW()
FROM categories c WHERE c.name = 'Bánh Cuốn';
-- ... thêm các sản phẩm khác

-- seed_staff.sql
-- Tạo bcrypt hash trước khi chạy:
--   go run be/cmd/genhash/main.go <password>
-- hoặc: htpasswd -bnBC 12 "" <password> | tr -d ':\n'
-- VD hash cho "Dev@1234": $2a$12$YourHashHere...
INSERT INTO staff (id, username, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES
  (UUID(), 'admin',    '$2a$12$REPLACE_WITH_REAL_HASH', 'Admin',            'admin',   1, NOW(), NOW()),
  (UUID(), 'manager1', '$2a$12$REPLACE_WITH_REAL_HASH', 'Nguyễn Quản Lý',  'manager', 1, NOW(), NOW()),
  (UUID(), 'cashier1', '$2a$12$REPLACE_WITH_REAL_HASH', 'Trần Thu Ngân',   'cashier', 1, NOW(), NOW()),
  (UUID(), 'chef1',    '$2a$12$REPLACE_WITH_REAL_HASH', 'Lê Đầu Bếp',     'chef',    1, NOW(), NOW());

-- seed_tables.sql
INSERT INTO tables (id, name, capacity, qr_token, is_active, created_at, updated_at)
VALUES
  (UUID(), 'Bàn 01', 4, HEX(RANDOM_BYTES(32)), 1, NOW(), NOW()),
  (UUID(), 'Bàn 02', 4, HEX(RANDOM_BYTES(32)), 1, NOW(), NOW()),
  (UUID(), 'Bàn VIP 1', 6, HEX(RANDOM_BYTES(32)), 1, NOW(), NOW());
```

### 6.2 Makefile Target

```makefile
seed-dev:
	mysql -u root -p$(DB_PASSWORD) $(DB_NAME) < be/migrations/seeds/seed_categories.sql
	mysql -u root -p$(DB_PASSWORD) $(DB_NAME) < be/migrations/seeds/seed_products.sql
	mysql -u root -p$(DB_PASSWORD) $(DB_NAME) < be/migrations/seeds/seed_staff.sql
	mysql -u root -p$(DB_PASSWORD) $(DB_NAME) < be/migrations/seeds/seed_tables.sql
	@echo "Seed hoàn tất"

truncate-seeds:
	mysql -u root -p$(DB_PASSWORD) $(DB_NAME) -e "SET FOREIGN_KEY_CHECKS=0; TRUNCATE products; TRUNCATE categories; TRUNCATE staff; TRUNCATE tables; SET FOREIGN_KEY_CHECKS=1;"
```

---

## 7. Checklist Go-Live Data

```
□ Tất cả danh mục đã tạo và có tên đúng
□ Tất cả sản phẩm đã nhập (>= 10 sản phẩm active)
□ Mọi sản phẩm có ảnh (image_path != NULL)
□ Mọi sản phẩm có giá > 0
□ Combos đã được cấu hình đúng (có items và giá)
□ Tất cả bàn đã tạo (>= số bàn thực tế)
□ Mọi bàn có qr_token và QR code đã in
□ Tài khoản admin đã tạo, mật khẩu đã đổi khỏi default
□ Tài khoản nhân viên đã tạo và test đăng nhập
□ Chạy SQL verification — 0 lỗi
□ Chủ quán đã xem và ký duyệt dữ liệu
```

---

> 🍜 BanhCuon System · Data Seeding v1.0 · Tháng 4/2026
