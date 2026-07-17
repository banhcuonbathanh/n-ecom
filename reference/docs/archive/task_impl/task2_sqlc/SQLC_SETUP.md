| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🗄️  SQLC CONFIGURATION
MySQL · Go 1.22 · sqlc v1.x · github.com/shopspring/decimal
SQLC_SETUP.docx  ·  v1.0  ·  ECC-Free  ·  Tháng 4 / 2026
Files: sqlc.yaml · query/auth.sql  │  Output: be/internal/db/ |
| --- |

| ℹ️  Task 01 (migrations/001–007.sql) phải HOÀN THÀNH TRƯỚC khi chạy sqlc — schema SQL là input bắt buộc. Sau khi tạo xong 2 files này, chạy sqlc generate từ root để sinh code Go vào be/internal/db/. BE Dev dùng package này trong internal/repository/auth_repo.go (Task 03). |
| --- |

**§  Section 1 — Overview: Task 02 Produces**

| File | Path | Mô Tả |
| --- | --- | --- |
| sqlc.yaml | sqlc.yaml (root) | Config: engine, schema, query dir, Go output path, type overrides |
| query/auth.sql | query/auth.sql | sqlc-annotated queries cho staff + refresh_tokens (8 queries) |
| [generated] db.go | be/internal/db/db.go | DBTX interface + New() constructor — sinh tự động |
| [generated] models.go | be/internal/db/models.go | Staff, RefreshToken Go structs — sinh tự động |
| [generated] auth.sql.go | be/internal/db/auth.sql.go | Tất cả 8 typed query methods + Querier interface |

**§  Section 2 — File 1: sqlc.yaml**

| Đặt tại root project (cùng cấp với be/ và migrations/). Chạy sqlc generate từ root — không từ bên trong be/. |
| --- |

| version: "2"
sql:
  - engine: "mysql"
    queries: "query/"
    schema:  "migrations/"
    gen:
      go:
        package: "db"
        out:     "be/internal/db"

        # Querier interface → mock trong service unit tests (Task 03)
        emit_interface: true

        # Pointer return trên JOIN results
        emit_result_struct_pointers: true

        # sql.NullString, sql.NullTime cho nullable columns
        # (email, phone, last_used_at, deleted_at đều NULL trong schema)
        null_style: "sql"

        overrides:
          # DECIMAL(10,0) → shopspring/decimal (tránh float rounding — D-003)
          - db_type: "decimal"
            go_type: "github.com/shopspring/decimal.Decimal"

          # tinyint(1) → bool (is_active, is_available, is_orphan)
          - db_type: "tinyint(1)"
            go_type: "bool"

          # json → json.RawMessage (toppings_snapshot, gateway_data)
          - db_type: "json"
            go_type: "encoding/json.RawMessage" |
| --- |

**Lý Do Các Overrides**

| Override | DB Type | Lý Do |
| --- | --- | --- |
| shopspring/decimal | DECIMAL(10,0) | Giá VND không có số thập phân — float64 gây rounding bug (D-003 trong Decision Log) |
| bool | tinyint(1) | MySQL dùng tinyint(1) cho boolean — sqlc mặc định map sang int8, không phải bool |
| json.RawMessage | json | Giữ raw JSON bytes — service layer tự unmarshal khi cần (toppings_snapshot, gateway_data) |

**§  Section 3 — File 2: query/auth.sql**

| Ref schema: migrations/001_auth.sql v1.2  ·  Tables: staff + refresh_tokens  ·  8 queries |
| --- |

| Query Name | Return | Dùng Bởi |
| --- | --- | --- |
| GetStaffByUsername | :one | Login() — load record trước bcrypt compare |
| GetStaffByID | :one | AuthMiddleware, /auth/me handler |
| CreateRefreshToken | :exec | Login() — tạo session mới sau auth thành công |
| GetRefreshTokenByHash | :one | /auth/refresh — validate cookie token |
| UpdateRefreshTokenLastUsed | :exec | /auth/refresh — stamp last_used_at mỗi lần refresh |
| DeleteRefreshToken | :exec | /auth/logout — thu hồi session hiện tại |
| CountActiveSessionsByStaffID | :one | Login() — check trước khi tạo session (max 5) |
| DeleteOldestSessionByStaffID | :exec | Login() — gọi khi count >= 5, xóa session cũ nhất |
| DeleteAllSessionsByStaffID | :exec | Admin force logout / deactivate account |

**Staff Queries**

| -- ============================================================
-- TABLE: staff
-- ============================================================

-- name: GetStaffByUsername :one
-- Dùng bởi: Login() — load staff record trước bcrypt compare
-- QUAN TRỌNG: KHÔNG tiết lộ "username không tồn tại" vs "sai password"
--   → cả 2 trường hợp đều trả ErrInvalidCredentials (MASTER §7, CLAUDE_BE §4)
SELECT id, username, password_hash, role, full_name, email, phone, is_active
FROM   staff
WHERE  username = ?
  AND  deleted_at IS NULL
LIMIT  1;


-- name: GetStaffByID :one
-- Dùng bởi: AuthMiddleware (set vào gin.Context), /auth/me handler
-- KHÔNG trả password_hash — không bao giờ expose hash ra ngoài service layer
SELECT id, username, role, full_name, email, phone, is_active
FROM   staff
WHERE  id = ?
  AND  deleted_at IS NULL
LIMIT  1; |
| --- |

**Refresh Token Queries**

| -- ============================================================
-- TABLE: refresh_tokens
-- ============================================================

-- name: CreateRefreshToken :exec
-- Dùng bởi: Login() — insert session mới sau auth thành công
-- SECURITY: token_hash = SHA256(raw_token)
--   Raw token → httpOnly cookie  |  Hash → DB (KHÔNG lưu raw)
--   Ref: MASTER.docx §6 — Token Config
INSERT INTO refresh_tokens (
    id, staff_id, token_hash, user_agent, ip_address, expires_at
) VALUES (
    UUID(),
    sqlc.arg(staff_id),
    sqlc.arg(token_hash),
    sqlc.arg(user_agent),
    sqlc.arg(ip_address),
    sqlc.arg(expires_at)
);


-- name: GetRefreshTokenByHash :one
-- Dùng bởi: /auth/refresh — validate incoming cookie token
-- Trả full row để service check expires_at + staff_id
SELECT id, staff_id, token_hash, expires_at, last_used_at
FROM   refresh_tokens
WHERE  token_hash = ?
LIMIT  1;


-- name: UpdateRefreshTokenLastUsed :exec
-- Dùng bởi: /auth/refresh — stamp last_used_at mỗi lần refresh thành công
-- Bật tính năng stale session detection (001_auth.sql v1.2)
UPDATE refresh_tokens
SET    last_used_at = NOW()
WHERE  token_hash = sqlc.arg(token_hash);


-- name: DeleteRefreshToken :exec
-- Dùng bởi: /auth/logout — thu hồi session hiện tại
DELETE FROM refresh_tokens
WHERE  token_hash = sqlc.arg(token_hash); |
| --- |

| -- name: CountActiveSessionsByStaffID :one
-- Dùng bởi: Login() — enforce max 5 sessions per staff
-- "Active" = chưa expired (rows đã xóa không còn tồn tại)
SELECT COUNT(*) AS session_count
FROM   refresh_tokens
WHERE  staff_id   = sqlc.arg(staff_id)
  AND  expires_at > NOW();


-- name: DeleteOldestSessionByStaffID :exec
-- Dùng bởi: Login() — gọi TRƯỚC CreateRefreshToken khi count >= 5
-- Xóa session ít được dùng nhất (COALESCE: nếu chưa dùng lần nào → dùng created_at)
DELETE FROM refresh_tokens
WHERE id = (
    SELECT id FROM (
        SELECT id
        FROM   refresh_tokens
        WHERE  staff_id   = sqlc.arg(staff_id)
          AND  expires_at > NOW()
        ORDER  BY COALESCE(last_used_at, created_at) ASC
        LIMIT  1
    ) AS oldest
);


-- name: DeleteAllSessionsByStaffID :exec
-- Dùng bởi: Admin "force logout" hoặc khi deactivate tài khoản
DELETE FROM refresh_tokens
WHERE  staff_id = sqlc.arg(staff_id); |
| --- |

**§  Section 4 — Generated Output (be/internal/db/)**

| Sau khi chạy sqlc generate, sqlc sinh 3 files Go trong be/internal/db/. BE Dev KHÔNG sửa các files này — chỉ sửa source SQL rồi re-generate. |
| --- |

| Generated File | Nội Dung |
| --- | --- |
| be/internal/db/db.go | DBTX interface (chấp nhận *sql.DB hoặc *sql.Tx) + New(db DBTX) *Queries constructor |
| be/internal/db/models.go | Go structs: Staff, RefreshToken — field types map theo overrides trong sqlc.yaml |
| be/internal/db/auth.sql.go | 9 typed methods trên *Queries struct + Querier interface (emit_interface: true) |

**Querier Interface (từ emit_interface: true)**

| // be/internal/db/auth.sql.go — interface sinh tự động
type Querier interface {
    CountActiveSessionsByStaffID(ctx context.Context, staffID string) (int64, error)
    CreateRefreshToken(ctx context.Context, arg CreateRefreshTokenParams) error
    DeleteAllSessionsByStaffID(ctx context.Context, staffID string) error
    DeleteOldestSessionByStaffID(ctx context.Context, staffID string) error
    DeleteRefreshToken(ctx context.Context, tokenHash string) error
    GetRefreshTokenByHash(ctx context.Context, tokenHash string) (RefreshToken, error)
    GetStaffByID(ctx context.Context, id string) (GetStaffByIDRow, error)
    GetStaffByUsername(ctx context.Context, username string) (GetStaffByUsernameRow, error)
    UpdateRefreshTokenLastUsed(ctx context.Context, tokenHash string) error
}

// BE Dev dùng interface này trong auth_repo.go để mock trong tests:
// type AuthRepo struct { q db.Querier } |
| --- |

**§  Section 5 — Dependencies**

| Package | Install | Ghi Chú |
| --- | --- | --- |
| sqlc CLI | go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest | Chạy sqlc generate từ root project |
| shopspring/decimal | go get github.com/shopspring/decimal | Type override cho DECIMAL(10,0) — tránh float rounding (D-003) |
| golang-jwt/jwt/v5 | go get github.com/golang-jwt/jwt/v5 | BE Dev cần cho Task 03 pkg/jwt/jwt.go |
| gin-gonic/gin | go get github.com/gin-gonic/gin | HTTP framework — main.go + handler layer |
| go-sql-driver/mysql | go get github.com/go-sql-driver/mysql | MySQL driver cho database/sql |

**§  Section 6 — Thứ Tự Thực Hiện**

| # 1. Đảm bảo Task 01 đã xong (migrations/001–007.sql tồn tại)

# 2. Tạo 2 files của Task 02
#    sqlc.yaml     → root/
#    query/auth.sql → root/query/

# 3. Cài sqlc nếu chưa có
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# 4. Cài shopspring/decimal override
cd be && go get github.com/shopspring/decimal

# 5. Chạy generate từ root (không phải từ be/)
cd .. && sqlc generate

# 6. Kiểm tra output
ls be/internal/db/
# Expected: db.go  models.go  auth.sql.go

# 7. Build check — không được có compile error
cd be && go build ./... |
| --- |

**§  Section 7 — Current Work Status**

- ✓  migrations/001–007.sql — Task 01 hoàn thành, tất cả Phase 1 tables
- sqlc.yaml — config tại root project (Section 2)
- query/auth.sql — 9 queries cho staff + refresh_tokens (Section 3)
- sqlc generate — verify output be/internal/db/ (Section 6)
- go build ./... — đảm bảo generated code compile sạch

| Sau khi Task 02 xong → Task 03: BE Auth — BE Dev implement pkg/jwt/ + pkg/bcrypt/ + internal/repository/auth_repo.go dùng Querier interface ở trên. |
| --- |

| 🍜  BanhCuon System  ·  SQLC_SETUP.docx  ·  v1.0  ·  Task 02  ·  Tháng 4/2026 |
| --- |
