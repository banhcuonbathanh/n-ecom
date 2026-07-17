| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN   🗄️  DATABASE DEVELOPER
MySQL 8.0 · Redis Stack · Migrations · Schema Design · Performance    CLAUDE_DB.docx  ·  v1.1  ·  Tháng 4 / 2026 |
| --- |

| ℹ️  migrations/*.sql là DDL source of truth. Không spec file nào được chứa CREATE TABLE. Mọi schema thay đổi phải qua DB Dev → Lead review → merge. KHÔNG sửa migration đã chạy. |
| --- |

## §  Section 1 — Role & Responsibilities
| Trách Nhiệm | Output |  |
| --- | --- | --- |
| Design và maintain MySQL schema | migrations/NNN_*.sql (Up + Down) |  |
| Redis key schema design | DB_SCHEMA.docx §4 — Redis Key Schema |  |
| Performance: indexes, explain analyze | Index recommendations, query cost analysis |  |
| sqlc query templates cho BE Dev | Queries trong docs/specs/NNN_*.docx (B2 sections) |  |
| Migration versioning (Goose) | NNN_description.sql với Up và Down sections |  |
| Data integrity: constraints, FK, cascade | Trong migration SQL |  |

## §  Section 2 — Ownership
| Owns | Reviews (nhưng không tự merge) | Không Sửa |
| --- | --- | --- |
| migrations/001_auth.sql | DB_SCHEMA.docx (Lead owns, DB Dev edits) | be/ code (BE Dev) |
| migrations/002_products.sql | Queries trong specs/ B2 sections | fe/ code (FE Dev) |
| migrations/003_combos.sql |  | MASTER.docx (Lead) |
| migrations/004_orders.sql |  | API_CONTRACT.docx (Lead) |
| migrations/005_payments.sql |  |  |
| migrations/006_files.sql |  |  |

## §  Section 3 — DB Conventions (MASTER.docx §7.3)
| -- Naming: snake_case. Tables: plural. PKs: uuid.
-- Timestamps: tất cả tables cần created_at + updated_at.
-- Soft delete: deleted_at DATETIME NULL. Query luôn WHERE deleted_at IS NULL.
-- Indexes: mọi FK column, status, created_at, table_id.
-- Giá tiền: DECIMAL(10,0) — VND không có decimal, tránh float rounding.
-- UUID: CHAR(36). KHÔNG dùng AUTO_INCREMENT cho PK. |
| --- |

## §  Section 4 — Current Work: Migrations ✓ COMPLETE

✓  001_auth.sql — staff table (role ENUM, bcrypt hash), refresh_tokens (token_hash SHA256, expires_at index)
✓  002_products.sql — categories, products (DECIMAL price, object_path), toppings, product_toppings junction
✓  003_combos.sql — combos, combo_items (FK constraints, combo expand template)
✓  004_orders.sql — order_sequences fallback, orders (state machine ENUM, source), order_items (combo_ref_id self-ref, toppings_snapshot JSON, qty_served)
✓  005_payments.sql — payments (4 methods, gateway_data JSON, expires_at index, UNIQUE order_id)
✓  006_files.sql — file_attachments (is_orphan flag, composite index orphan+created_at for cleanup job)
☐  Create sqlc.yaml config file cho BE Dev  ← Task 02

✓  Schema design cho 6 domains (auth, products, combos, orders, payments, files) — v1.1 updated from 5→6
✓  Redis key schema documented trong DB_SCHEMA.docx §4

## §  Section 5 — Redis Key Schema (DB_SCHEMA.docx §4)
| Key Pattern | Type | TTL | Dùng Cho |
| --- | --- | --- | --- |
| refresh_token:{hash} | String | 30 ngày | Verify + revoke refresh token |
| order_seq:{YYYYMMDD} | Counter | 2 ngày | INCR tạo ORD-YYYYMMDD-NNN |
| table_order:{table_id} | String | 24h | Fast check bàn có active order |
| kds:channel | Pub/Sub | N/A | Broadcast đơn mới tới KDS |
| order:{order_id}:channel | Pub/Sub | N/A | SSE stream theo dõi đơn |
| bloom:order_exists | Bloom Filter | Permanent | Fast existence check |
| rate_limit:{ip}:{endpoint} | Counter | 1 phút | Rate limiting middleware |
| payment_timeout:{id} | String | 15 phút | Trigger timeout via keyspace notif |
| login_fail:{ip} | Counter | 15 phút | Login rate limit (max 5 lần/phút) |

## §  Section 6 — Working Protocol
| Migration đã chạy trên any env: KHÔNG sửa — tạo migration mới (NNN+1) để alter.
New column request từ BE Dev: DB Dev thiết kế + viết migration → Lead review → merge → notify BE.
Index thêm vào: EXPLAIN ANALYZE query trước khi add. Document result trong DB_SCHEMA.docx.
Tham khảo DB_SCHEMA.docx §2 trước khi add key design decision mới. |
| --- |

🍜  BanhCuon System  ·  CLAUDE_DB.docx  ·  v1.1  ·  Tháng 4/2026