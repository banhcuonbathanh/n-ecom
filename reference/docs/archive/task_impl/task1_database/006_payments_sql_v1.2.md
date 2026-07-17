| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🗄️  DATABASE MIGRATION
006_payments.sql  ·  v1.2  ·  ECC-Free  ·  Tháng 4 / 2026

Tables: payments  │  v1.2: +attempt_count, +refunded_amount, +deleted_at |
| --- |

| ℹ️  Requires 005_orders.sql (orders FK). Payment created only when order.status = ready. Ref: MASTER.docx §4.3. UNIQUE(order_id) enforces 1 payment record per order — retries must UPDATE, not INSERT. |
| --- |

## §  Changes from v1.1
| ✅  NEW: payments.attempt_count INT NOT NULL DEFAULT 1 — incremented on each retry after failed payment. Enables retry audit trail and max-retry enforcement (e.g. block after 5 attempts). Service layer updates: status='pending', attempt_count=attempt_count+1, gateway_ref=?, expires_at=? on retry. |
| --- |

| ✅  NEW: payments.refunded_amount DECIMAL(10,0) NULL DEFAULT NULL — NULL means no refund processed. Set to full amount in Phase 1 cancel flow. Phase 2 may use partial values. Schema-ready without future migration. |
| --- |

| ✅  NEW: payments.deleted_at DATETIME NULL — soft delete for audit trail compliance. Payments must never be hard-deleted. Application layer must block hard delete; deleted_at is the only supported removal mechanism. |
| --- |

| ⚠️  NOTE: UNIQUE(order_id) means only 1 payment row per order. Retry flow must UPDATE the existing row (not INSERT). Service layer must implement idempotent upsert. Previous failed attempt details are preserved in gateway_data JSON and attempt_count — not overwritten. |
| --- |

## §  SQL Migration
| -- +goose Up
-- +goose StatementBegin

-- ============================================================
-- TABLE: payments
-- v1.1: gateway_ref VARCHAR(100) → VARCHAR(150).
-- v1.2 Changes:
--   + attempt_count INT NOT NULL DEFAULT 1
--     Incremented on every retry after a failed payment.
--     Enables: retry audit trail, max-retry guard (e.g. block after 5 fails).
--     Service layer: UPDATE payments SET status='pending', attempt_count=attempt_count+1,
--                    gateway_ref=?, expires_at=? WHERE order_id=? AND status='failed'
--
--   + refunded_amount DECIMAL(10,0) NULL DEFAULT NULL
--     NULL = no refund processed. Set when cancel triggers refund.
--     Phase 1: always equals full amount (full refund on cancel).
--     Phase 2: may be partial (e.g. cancel 1 item after partial serve).
--     Allows future partial refund without schema migration.
--
--   + deleted_at DATETIME NULL
--     Soft delete — consistent with other financial tables.
--     Payments must never be hard-deleted (audit trail requirement).
--     Hard delete is blocked via application layer; deleted_at is the
--     only supported removal mechanism.
--
-- 4 phương thức: VNPay QR │ MoMo QR │ ZaloPay QR │ Cash COD
-- Ref: MASTER.docx §4.3 — Payment Rules
--
-- IMPORTANT: UNIQUE(order_id) means 1 payment record per order.
--   On payment retry: UPDATE the existing record (status, attempt_count,
--   gateway_ref, expires_at) — do NOT INSERT a new row.
--   Service must implement idempotent upsert, not blind insert.
-- ============================================================
CREATE TABLE payments (
    id               CHAR(36)      NOT NULL DEFAULT (UUID()),
    order_id         CHAR(36)      NOT NULL,
    method           ENUM(
                       'vnpay',
                       'momo',
                       'zalopay',
                       'cash'
                     )             NOT NULL,
    status           ENUM(
                       'pending',    -- created, awaiting customer payment
                       'completed',  -- payment confirmed by gateway
                       'failed',     -- timeout or gateway error
                       'refunded'    -- refunded after order cancel
                     )             NOT NULL DEFAULT 'pending',
    amount           DECIMAL(10,0) NOT NULL,
    attempt_count    INT           NOT NULL DEFAULT 1,  -- v1.2 NEW: retry counter
    gateway_ref      VARCHAR(150)  NULL,                -- v1.1: 100→150. vnp_TxnRef/orderId/app_trans_id
    gateway_data     JSON          NULL,                -- raw webhook payload (audit trail)
    refunded_amount  DECIMAL(10,0) NULL DEFAULT NULL,  -- v1.2 NEW: NULL=no refund; set on cancel
    expires_at       DATETIME      NULL,                -- NULL for cash; 15 min for online
    paid_at          DATETIME      NULL,                -- gateway confirm timestamp
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at       DATETIME      NULL,                -- v1.2 NEW: soft delete (audit trail)
    PRIMARY KEY (id),
    UNIQUE INDEX uq_payments_order_id  (order_id),    -- 1 order = 1 payment record
    INDEX idx_payments_status          (status),
    INDEX idx_payments_method          (method),
    INDEX idx_payments_expires_at      (expires_at),  -- background job: payment_timeout.go
    INDEX idx_payments_created_at      (created_at),
    INDEX idx_payments_deleted_at      (deleted_at),  -- v1.2 NEW
    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders (id)
        ON DELETE RESTRICT
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS payments;
-- +goose StatementEnd |
| --- |

🍜  BanhCuon System  ·  006_payments.sql  ·  v1.2  ·  Tháng 4/2026