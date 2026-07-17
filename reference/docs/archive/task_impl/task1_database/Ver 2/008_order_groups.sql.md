# 🍜 HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
## 🗄️ DATABASE MIGRATION
### 008_order_groups.sql · v1.0 · Tháng 4/2026
**Table affected:** `orders` · **Change:** ADD `group_id` column (Option A — linked orders)

---

> **Context:** Hỗ trợ nhóm khách ngồi nhiều bàn — mỗi bàn vẫn có order riêng, nhưng share cùng `group_id` để cashier và khách hàng xem tổng hợp. Không merge order, không thay đổi bất kỳ business rule nào hiện có.

---

## Thiết Kế

| Quyết Định | Chi Tiết |
|---|---|
| Không tạo bảng `order_groups` riêng | `group_id` UUID lưu trực tiếp trên `orders` — đủ để JOIN, không cần bảng trung gian |
| `group_id` do BE tạo | `uuid.New()` khi cashier gọi `POST /orders/group` |
| 1 order = 1 group | Không thể ở 2 group cùng lúc — `group_id` là scalar column |
| Unlink = set NULL | `PATCH /orders/group/:id` → set `group_id = NULL` cho order cần tách |
| Không FK | `group_id` tự-referential trong cùng bảng `orders` — không cần FK constraint |

---

## SQL Migration

```sql
-- +goose Up
-- +goose StatementBegin

-- ============================================================
-- MIGRATION: 008_order_groups
-- Thêm group_id vào bảng orders để hỗ trợ nhóm bàn (Option A).
--
-- Thiết kế:
--   group_id CHAR(36) NULL — shared UUID cho tất cả orders cùng nhóm.
--   NULL = order độc lập (không thuộc nhóm nào).
--   Non-NULL = order là thành viên của nhóm group_id đó.
--
-- Không có FK vì group_id không trỏ tới bảng riêng —
-- application layer kiểm tra tính hợp lệ khi add/remove order.
--
-- Index: idx_orders_group_id — hỗ trợ:
--   SELECT * FROM orders WHERE group_id = ? (lấy tất cả orders trong group)
--
-- Không ảnh hưởng bất kỳ business rule hiện có (state machine,
-- 1-table-1-active, cancel 30% rule, payment flow).
-- ============================================================

ALTER TABLE orders
    ADD COLUMN group_id CHAR(36) NULL DEFAULT NULL
        COMMENT 'Shared UUID for multi-table group (Option A). NULL = standalone order.',
    ADD INDEX idx_orders_group_id (group_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE orders
    DROP INDEX idx_orders_group_id,
    DROP COLUMN group_id;

-- +goose StatementEnd
```

---

## Verify After Migration

```sql
-- Kiểm tra column tồn tại
SHOW COLUMNS FROM orders LIKE 'group_id';

-- Kiểm tra index
SHOW INDEX FROM orders WHERE Key_name = 'idx_orders_group_id';

-- Test: tạo 2 orders cùng group_id (simulate)
UPDATE orders SET group_id = UUID() WHERE id IN ('order-uuid-1', 'order-uuid-2');
SELECT id, table_id, group_id FROM orders WHERE group_id IS NOT NULL LIMIT 5;
```

---

> 🍜 BanhCuon System · 008_order_groups.sql · v1.0 · Tháng 4/2026
