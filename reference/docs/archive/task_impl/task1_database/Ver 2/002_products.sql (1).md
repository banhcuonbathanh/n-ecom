| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🗄️  DATABASE MIGRATION
002_products.sql  ·  v1.1  ·  ECC-Free  ·  Tháng 4 / 2026
Tables: categories · products · toppings · product_toppings  |  v1.1: No structural changes |
| --- |

| ℹ️  Không có thay đổi cấu trúc. categories.id được FK từ combos (004_combos.sql). Included để hoàn chỉnh bộ v1.1. |
| --- |

**§  Changes from v1.0**
| 🔧  FIXED: No structural changes from v1.0. File included for completeness of the full v1.1 migration set. |
| --- |

**§  SQL Migration**
| -- +goose Up
-- +goose StatementBegin
 
-- ============================================================
-- TABLE: categories
-- Danh mục sản phẩm (Bánh Cuốn, Nước Uống, v.v.)
-- v1.1: No structural changes.
--   categories.id is referenced by:
--     products.category_id (this file)
--     combos.category_id   (004_combos.sql — v1.1 new FK)
-- ============================================================
CREATE TABLE categories (
    id           CHAR(36)     NOT NULL DEFAULT (UUID()),
    name         VARCHAR(100) NOT NULL,
    description  TEXT         NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    is_active    TINYINT(1)   NOT NULL DEFAULT 1,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at   DATETIME     NULL,
    PRIMARY KEY (id),
    INDEX idx_categories_sort_order  (sort_order),
    INDEX idx_categories_is_active   (is_active),
    INDEX idx_categories_deleted_at  (deleted_at)
);
 
-- ============================================================
-- TABLE: products
-- image_path: lưu object_path (không phải full URL).
--   Full URL = STORAGE_BASE_URL + object_path.
-- price: DECIMAL(10,0) — VND, tránh float rounding.
-- Ref: BanhCuon_Project.docx §4.2 — Key Design Decisions
-- ============================================================
CREATE TABLE products (
    id           CHAR(36)      NOT NULL DEFAULT (UUID()),
    category_id  CHAR(36)      NOT NULL,
    name         VARCHAR(150)  NOT NULL,
    description  TEXT          NULL,
    price        DECIMAL(10,0) NOT NULL,
    image_path   VARCHAR(500)  NULL,               -- object_path, NOT full URL
    is_available TINYINT(1)    NOT NULL DEFAULT 1,
    sort_order   INT           NOT NULL DEFAULT 0,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at   DATETIME      NULL,
    PRIMARY KEY (id),
    INDEX idx_products_category_id  (category_id),
    INDEX idx_products_is_available (is_available),
    INDEX idx_products_sort_order   (sort_order),
    INDEX idx_products_deleted_at   (deleted_at),
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories (id)
        ON DELETE RESTRICT
);
 
-- ============================================================
-- TABLE: toppings
-- ============================================================
CREATE TABLE toppings (
    id           CHAR(36)      NOT NULL DEFAULT (UUID()),
    name         VARCHAR(100)  NOT NULL,
    price        DECIMAL(10,0) NOT NULL DEFAULT 0,
    is_available TINYINT(1)    NOT NULL DEFAULT 1,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at   DATETIME      NULL,
    PRIMARY KEY (id),
    INDEX idx_toppings_is_available (is_available),
    INDEX idx_toppings_deleted_at   (deleted_at)
);
 
-- ============================================================
-- TABLE: product_toppings — Junction: product <-> topping (M:N)
-- ============================================================
CREATE TABLE product_toppings (
    product_id   CHAR(36) NOT NULL,
    topping_id   CHAR(36) NOT NULL,
    PRIMARY KEY (product_id, topping_id),
    INDEX idx_pt_topping_id (topping_id),
    CONSTRAINT fk_pt_product
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT fk_pt_topping
        FOREIGN KEY (topping_id) REFERENCES toppings (id) ON DELETE CASCADE
);
 
-- +goose StatementEnd
 
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS product_toppings;
DROP TABLE IF EXISTS toppings;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
-- +goose StatementEnd |
| --- |

🍜  BanhCuon System  ·  002_products.sql  ·  v1.1  ·  Tháng 4/2026