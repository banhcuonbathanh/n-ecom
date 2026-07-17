| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🗄️  DATABASE MIGRATION
001_auth.sql  ·  v1.1  ·  ECC-Free  ·  Tháng 4 / 2026
Tables: staff · refresh_tokens  |  v1.1: +email field, customer role clarification note |
| --- |

| ℹ️  migrations/*.sql là DDL source of truth. Xem MASTER.docx §3 RBAC trước khi implement auth middleware. KHÔNG sửa migration đã chạy trên bất kỳ env nào. |
| --- |

**§  Changes from v1.0**
| 🔧  FIXED: staff.email VARCHAR(100) NULL — added for password reset flow and admin notifications (was missing in v1.0). |
| --- |

| ⚠️  NOTE: staff.role ENUM includes 'customer' — usage is ambiguous. Clarify with BA: are online/QR customers anonymous or do they need accounts? Impact on RequireRole() middleware. |
| --- |

| ⚠️  NOTE: refresh_tokens — no per-user session cap in schema. Service layer must enforce max 5 active sessions per staff_id (delete oldest on exceed). |
| --- |

**§  SQL Migration**
| -- +goose Up
-- +goose StatementBegin
 
-- ============================================================
-- TABLE: staff
-- Tài khoản nhân viên. Role hierarchy:
--   admin ⊃ manager ⊃ staff ⊃ (chef | cashier) | customer (isolated)
--
-- v1.1: Added email field for password reset / notifications.
--
-- NOTE: 'customer' role in ENUM is ambiguous.
--   Online/QR customers may be anonymous — no staff account needed.
--   Clarify with BA before implementing RequireRole() middleware:
--   if customer is anonymous, consider removing from ENUM or
--   handling via a separate sessions/guests table.
--   Ref: LESSONS_LEARNED §Issue-2 | MASTER.docx §3 — RBAC
-- ============================================================
CREATE TABLE staff (
    id            CHAR(36)     NOT NULL DEFAULT (UUID()),
    username      VARCHAR(50)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,          -- bcrypt cost=12
    email         VARCHAR(100) NULL,              -- v1.1 NEW: password reset + notifications
    role          ENUM(
                    'customer',
                    'chef',
                    'cashier',
                    'staff',
                    'manager',
                    'admin'
                  )            NOT NULL DEFAULT 'cashier',
    full_name     VARCHAR(100) NOT NULL,
    phone         VARCHAR(20)  NULL,
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at    DATETIME     NULL,              -- soft delete; query WHERE deleted_at IS NULL
    PRIMARY KEY (id),
    UNIQUE INDEX uq_staff_username (username),
    INDEX idx_staff_email      (email),           -- v1.1 NEW
    INDEX idx_staff_role       (role),
    INDEX idx_staff_is_active  (is_active),
    INDEX idx_staff_deleted_at (deleted_at)
);
 
-- ============================================================
-- TABLE: refresh_tokens
-- Lưu hashed refresh token (SHA256 trước khi insert).
-- Redis là fast-path; bảng này là fallback khi Redis miss.
--
-- NOTE: Schema has no per-user session cap.
--   Enforce at service layer in Login():
--     SELECT COUNT(*) FROM refresh_tokens WHERE staff_id = ? AND expires_at > NOW()
--     If count >= 5 → DELETE oldest row, then INSERT new token.
--   Ref: CLAUDE_BE.docx §4 — Critical Implementation Notes
-- Ref: MASTER.docx §6.1 — Token Config
-- ============================================================
CREATE TABLE refresh_tokens (
    id           CHAR(36)     NOT NULL DEFAULT (UUID()),
    staff_id     CHAR(36)     NOT NULL,
    token_hash   CHAR(64)     NOT NULL,           -- SHA256 hex of raw refresh token
    user_agent   VARCHAR(255) NULL,
    ip_address   VARCHAR(45)  NULL,               -- IPv6 max 45 chars
    expires_at   DATETIME     NOT NULL,           -- now + 30 days
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_refresh_token_hash (token_hash),
    INDEX idx_refresh_staff_id   (staff_id),
    INDEX idx_refresh_expires_at (expires_at),
    CONSTRAINT fk_refresh_staff
        FOREIGN KEY (staff_id) REFERENCES staff (id)
        ON DELETE CASCADE
);
 
-- +goose StatementEnd
 
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS staff;
-- +goose StatementEnd |
| --- |

🍜  BanhCuon System  ·  001_auth.sql  ·  v1.1  ·  Tháng 4/2026