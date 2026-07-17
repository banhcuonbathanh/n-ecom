| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🗄️  DATABASE MIGRATION
003_tables.sql  ·  v1.1  ·  ECC-Free  ·  Tháng 4 / 2026
Tables: tables  |  v1.1: NEW — bàn ăn cho QR flow + One Active Order Rule |
| --- |

| ℹ️  FILE MỚI: Bị thiếu trong v1.0. Phải chạy TRƯỚC 005_orders.sql (orders.table_id FK → tables.id). Chạy sau 002_products.sql. |
| --- |

**§  Changes from v1.0**
| ✅  NEW: tables table — completely new. Needed for: QR-at-table QR token resolution, orders.table_id FK enforcement, One Active Order Rule query (MASTER §4.5). |
| --- |

| ✅  NEW: qr_token CHAR(64) UNIQUE — random hex embedded in QR URL. Regenerate to invalidate printed QR codes. Generate: openssl rand -hex 32. |
| --- |

| ⚠️  NOTE: Migration renumbering required: old 003_combos.sql → 004. Old 004_orders.sql → 005. Old 005_payments.sql → 006. Old 006_files.sql → 007. |
| --- |

**§  SQL Migration**
| -- +goose Up
-- +goose StatementBegin
 
-- ============================================================
-- TABLE: tables
-- NEW in v1.1 — bảng này bị thiếu trong v1.0.
--
-- Required by:
--   - 005_orders.sql: orders.table_id FK → tables(id)
--   - One Active Order Rule (MASTER.docx §4.5):
--       WHERE table_id = ? AND status IN (pending,confirmed,preparing,ready)
--   - QR Tại Bàn flow (docs/specs/005_qr_pos.docx):
--       GET /api/v1/tables/qr/:token → trả table_id + table info
--
-- qr_token: random 64-char hex embedded in QR code URL.
--   Regenerating token invalidates all printed QR codes for that table.
--   Generate with: openssl rand -hex 32
--
-- capacity: số người tối đa — reserved cho Phase 2 reporting.
-- ============================================================
CREATE TABLE tables (
    id         CHAR(36)    NOT NULL DEFAULT (UUID()),
    name       VARCHAR(50) NOT NULL,               -- e.g. "Ban 01", "Ban VIP 02"
    qr_token   CHAR(64)    NOT NULL,               -- random hex, URL-safe, unique
    capacity   INT         NOT NULL DEFAULT 4,     -- max persons (Phase 2 reporting)
    is_active  TINYINT(1)  NOT NULL DEFAULT 1,     -- false = table closed
    created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME    NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_tables_qr_token (qr_token),    -- must be unique to resolve correct table
    UNIQUE INDEX uq_tables_name     (name),         -- no duplicate table names
    INDEX idx_tables_is_active      (is_active),
    INDEX idx_tables_deleted_at     (deleted_at)
);
 
-- +goose StatementEnd
 
-- +goose Down
-- +goose StatementBegin
-- NOTE: 005_orders.sql Down must run first (drops fk_orders_table before this)
DROP TABLE IF EXISTS tables;
-- +goose StatementEnd |
| --- |

🍜  BanhCuon System  ·  003_tables.sql  ·  v1.1  ·  Tháng 4/2026