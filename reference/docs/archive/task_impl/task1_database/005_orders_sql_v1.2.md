| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🗄️  DATABASE MIGRATION
005_orders.sql  ·  v1.2  ·  ECC-Free  ·  Tháng 4 / 2026

Tables: order_sequences · orders · order_items  │  v1.2: +chk_oi_item_type constraint, total_amount drift documented |
| --- |

| ℹ️  Renamed 004_orders.sql → 005_orders.sql. Requires: 001_auth.sql · 002_products.sql · 003_tables.sql · 004_combos.sql. |
| --- |

## §  Changes from v1.1
| 🚨  RISK FIXED: order_items — added chk_oi_item_type CHECK constraint. Previously, a row with product_id=NULL AND combo_id=NULL AND combo_ref_id=NULL (ghost row) or with both product_id and combo_id set (ambiguous row) could be inserted successfully. The constraint enforces the three valid item types at DB layer, not just application layer. |
| --- |

| 🚨  RISK DOCUMENTED: orders.total_amount denormalization — service layer MUST call recalculateTotalAmount(orderId) after every order_items mutation. Silent drift causes payment to charge wrong amount. Mitigation options: (A) MySQL AFTER INSERT/UPDATE/DELETE trigger on order_items, or (B) enforce via unit tests on every code path that mutates order_items. |
| --- |

| ⚠️  NOTE: chk_oi_item_type constraint — MySQL 8.0.16+ required for CHECK constraints to be enforced (not just parsed). Verify MySQL version before deploying. MySQL 5.7 parses but does NOT enforce CHECK. |
| --- |

## §  SQL Migration
| -- +goose Up
-- +goose StatementBegin

-- ============================================================
-- TABLE: order_sequences
-- Fallback counter khi Redis miss.
-- Primary path: Redis INCR order_seq:{YYYYMMDD} TTL 2 ngày.
-- Fallback: INSERT ... ON DUPLICATE KEY UPDATE last_seq = last_seq + 1
-- No changes from v1.1.
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
-- v1.1: fk_orders_table FK added (was missing in v1.0).
-- v1.2: No structural changes.
--
-- IMPORTANT: total_amount is DENORMALIZED.
--   Must be recalculated at service layer after EVERY order_items mutation
--   (add item, remove item, update quantity, combo expand).
--   Call recalculateTotalAmount(orderId) after all mutations.
--   Drift risk: if any code path skips recalculate, payment will charge
--   the wrong amount silently. Service layer tests MUST cover this path.
--   Mitigation: consider MySQL AFTER INSERT/UPDATE/DELETE trigger on
--   order_items if silent drift is unacceptable in production.
--
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
    -- DENORMALIZED: recalculate via recalculateTotalAmount(orderId) after
    -- every order_items mutation. See note above for drift risk.
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
    CONSTRAINT fk_orders_table
        FOREIGN KEY (table_id) REFERENCES tables (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_orders_created_by
        FOREIGN KEY (created_by) REFERENCES staff (id)
        ON DELETE SET NULL
);

-- ============================================================
-- TABLE: order_items
-- v1.1: qty_served CHECK (>= 0 AND <= quantity) added.
-- v1.2: chk_oi_item_type CHECK constraint added.
--
-- Item type rules (enforced by DB constraint — not just application):
--   Standalone product : product_id NOT NULL, combo_id IS NULL,     combo_ref_id IS NULL
--   Combo header line  : combo_id   NOT NULL, product_id IS NULL,   combo_ref_id IS NULL
--   Combo sub-item     : product_id NOT NULL, combo_ref_id NOT NULL, combo_id IS NULL
--
--   Any row violating these three cases is invalid. The CHECK constraint
--   prevents ghost rows (all three NULL) and ambiguous rows (both
--   product_id and combo_id set) at the DB layer, not just application layer.
--
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
                                    CHECK (qty_served >= 0 AND qty_served <= quantity), -- v1.1
    toppings_snapshot JSON          NULL,          -- snapshot array of selected toppings
    note              TEXT          NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_oi_order_id     (order_id),
    INDEX idx_oi_product_id   (product_id),
    INDEX idx_oi_combo_id     (combo_id),
    INDEX idx_oi_combo_ref_id (combo_ref_id),
    -- v1.2 NEW: enforce item type validity at DB layer
    -- Prevents ghost rows (all NULL) and ambiguous rows (both product+combo set)
    CONSTRAINT chk_oi_item_type CHECK (
        -- Case 1: Standalone product
        (product_id IS NOT NULL AND combo_id IS NULL     AND combo_ref_id IS NULL)
        OR
        -- Case 2: Combo header line
        (combo_id   IS NOT NULL AND product_id IS NULL   AND combo_ref_id IS NULL)
        OR
        -- Case 3: Combo sub-item (expanded from combo header)
        (product_id IS NOT NULL AND combo_ref_id IS NOT NULL AND combo_id IS NULL)
    ),
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

🍜  BanhCuon System  ·  005_orders.sql  ·  v1.2  ·  Tháng 4/2026