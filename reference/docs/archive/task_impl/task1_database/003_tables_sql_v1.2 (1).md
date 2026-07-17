| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🗄️  DATABASE MIGRATION
003_tables.sql  ·  v1.2  ·  ECC-Free  ·  Tháng 4 / 2026

Tables: tables  │  v1.2: +status column (available/occupied/reserved/inactive) |
| --- |

| ℹ️  FILE MỚI trong v1.1. Phải chạy TRƯỚC 005_orders.sql (orders.table_id FK → tables.id). Chạy sau 002_products.sql. |
| --- |

## §  Changes from v1.1
| ✅  NEW: tables.status ENUM('available','occupied','reserved','inactive') NOT NULL DEFAULT 'available'. Phase 1 uses available/inactive only. Phase 2 adds occupied (auto-managed from order state) and reserved (pre-booking). Rationale: table occupancy cannot be fully modeled by querying active orders alone — blocked, cleaning, and reserved states require an explicit column. |
| --- |

| ✅  NEW: idx_tables_status index — supports fast queries for available tables on seating/QR flow. |
| --- |

| ⚠️  NOTE: In Phase 1, 'occupied' status is NOT auto-updated from order state (that is a Phase 2 concern). Phase 1 code should only use 'available' and 'inactive'. Do not build logic that relies on 'occupied' being accurate until Phase 2 is implemented. |
| --- |

## §  SQL Migration
| -- +goose Up
-- +goose StatementBegin

-- ============================================================
-- TABLE: tables
-- NEW in v1.1 — bảng này bị thiếu trong v1.0.
--
-- v1.2: Added status column.
--   Phase 1 uses: 'available' and 'inactive' only.
--   Phase 2 will use: 'occupied' (when active order exists) and 'reserved'.
--   Rationale: deriving table occupancy purely from active orders cannot
--   represent blocked/reserved/cleaning states. Explicit status column
--   allows future Phase 2 reservation flow without schema migration.
--
--   Status transitions (Phase 1):
--     available ↔ inactive  (manager toggles via PATCH /api/v1/tables/:id)
--   Status transitions (Phase 2 addition):
--     available → occupied  (auto: when order created for table)
--     occupied  → available (auto: when order delivered/cancelled)
--     available → reserved  (manager pre-books table)
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
-- capacity: số người tối đa — used by Phase 2 reporting.
-- ============================================================
CREATE TABLE tables (
    id         CHAR(36)    NOT NULL DEFAULT (UUID()),
    name       VARCHAR(50) NOT NULL,               -- e.g. "Ban 01", "Ban VIP 02"
    qr_token   CHAR(64)    NOT NULL,               -- random hex, URL-safe, unique
    capacity   INT         NOT NULL DEFAULT 4,     -- max persons
    status     ENUM(
                 'available',  -- open, ready for orders
                 'occupied',   -- has active order (Phase 2: auto-managed)
                 'reserved',   -- pre-booked (Phase 2)
                 'inactive'    -- closed/blocked by manager
               )           NOT NULL DEFAULT 'available', -- v1.2 NEW
    is_active  TINYINT(1)  NOT NULL DEFAULT 1,     -- false = table removed from system
    created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME    NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_tables_qr_token (qr_token),   -- must be unique to resolve correct table
    UNIQUE INDEX uq_tables_name     (name),        -- no duplicate table names
    INDEX idx_tables_status         (status),      -- v1.2 NEW
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

🍜  BanhCuon System  ·  003_tables.sql  ·  v1.2  ·  Tháng 4/2026