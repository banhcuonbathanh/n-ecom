| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🗄️  DATABASE MIGRATION
005_orders.sql  ·  v1.1  ·  ECC-Free  ·  Tháng 4 / 2026
Tables: order_sequences · orders · order_items  |  v1.1: +table FK, qty_served CHECK  |  (was 004_orders.sql) |
| --- |

| ℹ️  Renamed 004_orders.sql → 005_orders.sql. Requires: 001_auth.sql · 002_products.sql · 003_tables.sql · 004_combos.sql. |
| --- |

**§  Changes from v1.0**
| 🔧  FIXED: orders.table_id: FK constraint added → tables(id) ON DELETE RESTRICT. Was completely unconstrained in v1.0 (no tables table existed). Down migration also updated. |
| --- |

| 🔧  FIXED: order_items.qty_served: CHECK (qty_served >= 0 AND qty_served <= quantity) added. Prevents chef setting qty_served > quantity which would break cancel rule (§4.2). |
| --- |

| ⚠️  NOTE: orders.total_amount is denormalized — service layer MUST call recalculateTotalAmount(orderId) after every order_items mutation. Drift risk documented in SQL comment. |
| --- |

**§  SQL Migration**
| -- +goose Up
-- +goose StatementBegin
 
-- ============================================================
-- TABLE: order_sequences
-- Fallback counter khi Redis miss.
-- Primary path: Redis INCR order_seq:{YYYYMMDD} TTL 2 ngày.
-- Fallback: INSERT ... ON DUPLICATE KEY UPDATE last_seq = last_seq + 1
-- No changes from v1.0.
-- ============================================================
CREATE TABLE order_sequences (
    id       INT  NOT NULL AUTO_INCREMENT,
    date_key DATE NOT NULL,
    last_seq INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_order_seq_date (date_key)
);
 
-- ============================================================
-- TABLE: orders
-- v1.1 Changes:
--   + fk_orders_table: FOREIGN KEY table_id → tables(id)
--     Was completely unconstrained in v1.0 (no tables table existed).
--     Requires 003_tables.sql to run first.
--   + total_amount denormalization note added.
--     Service MUST call recalculate after order_items mutation.
-- State machine: MASTER.docx §4.1
-- One Active Order Rule: MASTER.docx §4.5
-- ============================================================
CREATE TABLE orders (
    id             CHAR(36)      NOT NULL DEFAULT (UUID()),
    order_number   VARCHAR(30)   NOT NULL,         -- ORD-YYYYMMDD-NNN
    table_id       CHAR(36)      NULL,             -- NULL = online/delivery; FK → tables(id)
    status         ENUM(
                     'pending',
                     'confirmed',
                     'preparing',
                     'ready',
                     'delivered',
                     'cancelled'
                   )             NOT NULL DEFAULT 'pending',
    source         ENUM(
                     'online',
                     'qr',
                     'pos'
                   )             NOT NULL DEFAULT 'online',
    customer_name  VARCHAR(100)  NULL,
    customer_phone VARCHAR(20)   NULL,
    note           TEXT          NULL,
    -- IMPORTANT: total_amount is denormalized. Must be recalculated
    --   at service layer after every order_items add/remove/update.
    --   Call recalculateTotalAmount(orderId) after mutations.
    total_amount   DECIMAL(10,0) NOT NULL DEFAULT 0,
    created_by     CHAR(36)      NULL,             -- FK staff.id; NULL = customer self-order
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at     DATETIME      NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_orders_order_number   (order_number),
    INDEX idx_orders_table_id             (table_id),
    INDEX idx_orders_status               (status),
    INDEX idx_orders_source               (source),
    INDEX idx_orders_created_by           (created_by),
    INDEX idx_orders_created_at           (created_at),
    INDEX idx_orders_deleted_at           (deleted_at),
    -- Composite: One Active Order check
    -- WHERE table_id = ? AND status IN (...) AND deleted_at IS NULL
    INDEX idx_orders_table_status         (table_id, status),
    CONSTRAINT fk_orders_table            -- v1.1 NEW: was missing in v1.0
        FOREIGN KEY (table_id) REFERENCES tables (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_orders_created_by
        FOREIGN KEY (created_by) REFERENCES staff (id)
        ON DELETE SET NULL
);
 
-- ============================================================
-- TABLE: order_items
-- v1.1 Changes:
--   + qty_served: added CHECK (qty_served >= 0 AND qty_served <= quantity)
--     Prevents qty_served > quantity which breaks cancel rule:
--     SUM(qty_served)/SUM(quantity) < 0.30
-- Ref: MASTER.docx §4.2 — Cancel Rule
-- ============================================================
CREATE TABLE order_items (
    id                CHAR(36)      NOT NULL DEFAULT (UUID()),
    order_id          CHAR(36)      NOT NULL,
    product_id        CHAR(36)      NULL,          -- NULL if combo header line
    combo_id          CHAR(36)      NULL,          -- NULL if standalone product
    combo_ref_id      CHAR(36)      NULL,          -- self-ref: NULL=standalone/header, FK=sub-item
    name              VARCHAR(200)  NOT NULL,      -- snapshot: name at order time
    unit_price        DECIMAL(10,0) NOT NULL,      -- snapshot: price at order time
    quantity          INT           NOT NULL DEFAULT 1 CHECK (quantity > 0),
    qty_served        INT           NOT NULL DEFAULT 0
                                    CHECK (qty_served >= 0 AND qty_served <= quantity), -- v1.1 FIXED
    toppings_snapshot JSON          NULL,          -- snapshot array of selected toppings
    note              TEXT          NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_oi_order_id     (order_id),
    INDEX idx_oi_product_id   (product_id),
    INDEX idx_oi_combo_id     (combo_id),
    INDEX idx_oi_combo_ref_id (combo_ref_id),
    CONSTRAINT fk_oi_order
        FOREIGN KEY (order_id)     REFERENCES orders      (id) ON DELETE CASCADE,
    CONSTRAINT fk_oi_product
        FOREIGN KEY (product_id)   REFERENCES products    (id) ON DELETE RESTRICT,
    CONSTRAINT fk_oi_combo
        FOREIGN KEY (combo_id)     REFERENCES combos      (id) ON DELETE RESTRICT,
    CONSTRAINT fk_oi_combo_ref
        FOREIGN KEY (combo_ref_id) REFERENCES order_items (id) ON DELETE CASCADE
);
 
-- +goose StatementEnd
 
-- +goose Down
-- +goose StatementBegin
ALTER TABLE order_items DROP FOREIGN KEY fk_oi_combo_ref;
DROP TABLE IF EXISTS order_items;
-- v1.1: must drop table FK before dropping orders
ALTER TABLE orders DROP FOREIGN KEY fk_orders_table;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS order_sequences;
-- +goose StatementEnd |
| --- |

🍜  BanhCuon System  ·  005_orders.sql  ·  v1.1  ·  Tháng 4/2026