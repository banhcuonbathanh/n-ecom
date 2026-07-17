| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🗄️  DATABASE MIGRATION
007_files.sql  ·  v1.1  ·  ECC-Free  ·  Tháng 4 / 2026
Tables: file_attachments  |  v1.1: +entity_type, +entity_id columns  |  (was 006_files.sql) |
| --- |

| ℹ️  Renamed 006_files.sql → 007_files.sql. Requires 001_auth.sql. Cleanup job: file_cleanup.go every 6h deletes WHERE is_orphan=1 AND created_at < NOW() - INTERVAL 24 HOUR. |
| --- |

**§  Changes from v1.0**
| 🔧  FIXED: file_attachments.entity_type VARCHAR(50) NULL — 'order'|'payment'|'staff'|NULL. Records which domain owns this file after linking (is_orphan flips to 0). |
| --- |

| 🔧  FIXED: file_attachments.entity_id CHAR(36) NULL — polymorphic reference (not hard FK). Application constraint: when is_orphan=0, both entity_type and entity_id must be set. |
| --- |

| ✅  NEW: idx_files_entity (entity_type, entity_id) index — supports: SELECT * FROM file_attachments WHERE entity_type = 'order' AND entity_id = ? |
| --- |

| ⚠️  NOTE: File renamed from 006_files.sql → 007_files.sql. |
| --- |

**§  SQL Migration**
| -- +goose Up
-- +goose StatementBegin
 
-- ============================================================
-- TABLE: file_attachments
-- v1.1 Changes:
--   + entity_type VARCHAR(50) NULL: loại entity được link tới.
--     Values: 'order' | 'payment' | 'staff' | NULL
--     NULL means file is still orphan (is_orphan = 1).
--   + entity_id CHAR(36) NULL: ID of linked entity.
--     Intentionally NOT a hard FK (polymorphic — multiple tables).
--     Application-level constraint:
--       when is_orphan = 0 → entity_type AND entity_id MUST be set.
--       when is_orphan = 1 → both NULL (not yet linked).
--   + idx_files_entity (entity_type, entity_id): supports query
--       SELECT * FROM file_attachments
--       WHERE entity_type = 'order' AND entity_id = ?
--
-- Cleanup job: file_cleanup.go every 6h
--   DELETE WHERE is_orphan = 1 AND created_at < NOW() - INTERVAL 24 HOUR
-- Ref: BanhCuon_Project.docx §4.2 — Soft delete with is_orphan
--      CLAUDE_SYSTEM.docx §5 — be/internal/jobs/file_cleanup.go
-- ============================================================
CREATE TABLE file_attachments (
    id            CHAR(36)     NOT NULL DEFAULT (UUID()),
    object_path   VARCHAR(500) NOT NULL,           -- relative path in storage bucket
    original_name VARCHAR(255) NOT NULL,           -- original filename from user
    mime_type     VARCHAR(100) NOT NULL,           -- e.g. image/jpeg, application/pdf
    size_bytes    BIGINT       NOT NULL DEFAULT 0,
    uploaded_by   CHAR(36)     NULL,               -- FK staff.id; NULL = anonymous
    is_orphan     TINYINT(1)   NOT NULL DEFAULT 1, -- 1 = not linked → eligible cleanup
    entity_type   VARCHAR(50)  NULL,               -- v1.1 NEW: 'order'|'payment'|'staff'
    entity_id     CHAR(36)     NULL,               -- v1.1 NEW: ID of linked entity
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_files_uploaded_by  (uploaded_by),
    INDEX idx_files_is_orphan    (is_orphan),
    INDEX idx_files_orphan_age   (is_orphan, created_at),    -- cleanup job query
    INDEX idx_files_entity       (entity_type, entity_id),   -- v1.1 NEW: entity lookup
    CONSTRAINT fk_files_uploaded_by
        FOREIGN KEY (uploaded_by) REFERENCES staff (id)
        ON DELETE SET NULL
);
 
-- +goose StatementEnd
 
-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS file_attachments;
-- +goose StatementEnd |
| --- |

🍜  BanhCuon System  ·  007_files.sql  ·  v1.1  ·  Tháng 4/2026