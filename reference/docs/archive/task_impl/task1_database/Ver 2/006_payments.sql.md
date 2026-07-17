| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🗄️  DATABASE MIGRATION
006_payments.sql  ·  v1.1  ·  ECC-Free  ·  Tháng 4 / 2026
Tables: payments  |  v1.1: gateway_ref VARCHAR 100→150  |  (was 005_payments.sql) |
| --- |

| ℹ️  Renamed 005_payments.sql → 006_payments.sql. Requires 005_orders.sql (orders FK). Payment created only when order.status = ready. Ref: MASTER.docx §4.3. |
| --- |

**§  Changes from v1.0**
| 🔧  FIXED: payments.gateway_ref: VARCHAR(100) → VARCHAR(150). VNPay vnp_TxnRef: ≤100 chars. MoMo orderId and ZaloPay app_trans_id can exceed 100. 150 provides safe margin. |
| --- |

| ⚠️  NOTE: File renamed from 005_payments.sql → 006_payments.sql. |
| --- |

**§  SQL Migration**
| -- +goose Up
-- +goose StatementBegin
 
-- ============================================================
-- TABLE: payments
-- v1.1 Changes:
--   + gateway_ref: VARCHAR(100) → VARCHAR(150)
--     VNPay vnp_TxnRef: up to 100 chars OK.
--     MoMo orderId and ZaloPay app_trans_id may exceed 100.
--     150 provides safe margin without over-allocating.
--     Verify max lengths against each gateway's documentation
--     before going live with sandbox → production switch.
-- 4 phương thức: VNPay QR | MoMo QR | ZaloPay QR | Cash COD
-- Ref: MASTER.docx §4.3 — Payment Rules
--      CLAUDE_SYSTEM.docx §4 — Gateway Integration
-- ============================================================
CREATE TABLE payments (
    id           CHAR(36)      NOT NULL DEFAULT (UUID()),
    order_id     CHAR(36)      NOT NULL,
    method       ENUM(
                   'vnpay',
                   'momo',
                   'zalopay',
                   'cash'
                 )             NOT NULL,
    status       ENUM(
                   'pending',    -- tạo xong, chờ khách thanh toán
                   'completed',  -- thanh toán thành công
                   'failed',     -- timeout hoặc lỗi gateway
                   'refunded'    -- đã hoàn tiền sau cancel order
                 )             NOT NULL DEFAULT 'pending',
    amount       DECIMAL(10,0) NOT NULL,
    gateway_ref  VARCHAR(150)  NULL,              -- v1.1: 100→150. vnp_TxnRef/orderId/app_trans_id
    gateway_data JSON          NULL,              -- raw webhook payload (audit trail)
    expires_at   DATETIME      NULL,              -- NULL for cash; 15 min for online payment
    paid_at      DATETIME      NULL,              -- gateway confirm timestamp
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_payments_order_id  (order_id),  -- 1 order = 1 payment
    INDEX idx_payments_status          (status),
    INDEX idx_payments_method          (method),
    INDEX idx_payments_expires_at      (expires_at),  -- background job: payment_timeout.go
    INDEX idx_payments_created_at      (created_at),
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

🍜  BanhCuon System  ·  006_payments.sql  ·  v1.1  ·  Tháng 4/2026