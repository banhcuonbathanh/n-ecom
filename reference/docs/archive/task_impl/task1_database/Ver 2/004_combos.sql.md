| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🗄️  DATABASE MIGRATION
004_combos.sql  ·  v1.1  ·  ECC-Free  ·  Tháng 4 / 2026
Tables: combos · combo_items  |  v1.1: +category_id, +sort_order  |  (was 003_combos.sql) |
| --- |

| ℹ️  Renamed 003_combos.sql → 004_combos.sql to accommodate new 003_tables.sql. Requires 002_products.sql (categories FK). |
| --- |

**§  Changes from v1.0**
| 🔧  FIXED: combos.category_id CHAR(36) NULL — FK to categories(id) ON DELETE SET NULL. Groups combos by category on menu, consistent with products. NULL = uncategorized. |
| --- |

| 🔧  FIXED: combos.sort_order INT NOT NULL DEFAULT 0 — consistent with products.sort_order. Allows controlled display order on menu page. |
| --- |

| ⚠️  NOTE: File renamed from 003_combos.sql → 004_combos.sql. Update goose_db_version table if migrations were already applied to any environment. |
| --- |

**§  SQL Migration**
| -- +goose Up
-- +goose StatementBegin
 
-- ============================================================
-- TABLE: combos
-- v1.1 Changes:
--   + category_id CHAR(36) NULL: FK → categories(id)
--     Allows combos to be grouped by category on the menu page,
--     consistent with how products are organized.
--     NULL = uncategorized combo. ON DELETE SET NULL (safe).
--   + sort_order INT NOT NULL DEFAULT 0
--     Consistent with products.sort_order — controls display order.
-- (was 003_combos.sql — renamed to 004_combos.sql in v1.1)
-- Ref: MASTER.docx §4.1 — D-005 Combo expand at order time
-- ============================================================
CREATE TABLE combos (
    id           CHAR(36)      NOT NULL DEFAULT (UUID()),
    category_id  CHAR(36)      NULL,               -- v1.1 NEW: FK to categories
    name         VARCHAR(150)  NOT NULL,
    description  TEXT          NULL,
    price        DECIMAL(10,0) NOT NULL,
    image_path   VARCHAR(500)  NULL,               -- object_path, NOT full URL
    is_available TINYINT(1)    NOT NULL DEFAULT 1,
    sort_order   INT           NOT NULL DEFAULT 0, -- v1.1 NEW: consistent with products
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at   DATETIME      NULL,
    PRIMARY KEY (id),
    INDEX idx_combos_category_id  (category_id),   -- v1.1 NEW
    INDEX idx_combos_is_available (is_available),
    INDEX idx_combos_sort_order   (sort_order),    -- v1.1 NEW
    INDEX idx_combos_deleted_at   (deleted_at),
    CONSTRAINT fk_combos_category
        FOREIGN KEY (category_id) REFERENCES categories (id)
        ON DELETE SET NULL                         -- delete category does NOT delete combo
);
 
-- ============================================================
-- TABLE: combo_items
-- Định nghĩa tĩnh: combo gồm những products nào.
-- Template only — khi đặt hàng, BE expand vào order_items.
-- ============================================================
CREATE TABLE combo_items (
    id         CHAR(36) NOT NULL DEFAULT (UUID()),
    combo_id   CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    quantity   INT      NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_combo_items_combo_id   (combo_id),
    INDEX idx_combo_items_product_id (product_id),
    CONSTRAINT fk_ci_combo
        FOREIGN KEY (combo_id)   REFERENCES combos   (id) ON DELETE CASCADE,
    CONSTRAINT fk_ci_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
);
 
-- +goose StatementEnd
 
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS combo_items;
DROP TABLE IF EXISTS combos;
-- +goose StatementEnd |
| --- |

🍜  BanhCuon System  ·  004_combos.sql  ·  v1.1  ·  Tháng 4/2026