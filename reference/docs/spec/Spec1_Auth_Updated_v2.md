| 🔐
HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
SPEC 1 — Auth & Middleware (Updated v2.0) |
| --- |
| Model: Opus · Branch: feat/1-auth-middleware · Gap 5 & Gap 6 Fixes · Token Policy & is_active Behavior |

| ℹ️  Đây là bản cập nhật Spec 1 với 2 sections được làm rõ:
    • Gap 5 (🟡 Trung Bình): Token Rotation Policy — thay thế "1 per device" không implement được
    • Gap 6 (🟡 Trung Bình): is_active Behavior — define rõ hành vi khi account bị disable
    Merge vào specs/1.md (Spec_1_Auth_Middleware.docx) hiện tại. |
| --- |

# 🟡 [CẬP NHẬT] Section 9 — Security Rules (Thay Thế Hoàn Toàn)
| 🟡 Gap 5 — "1 token per device" trong Section 9 cũ không implement được vì thiếu device_id trong schema.
   Section này thay thế hoàn toàn Security Rules cũ với policy rõ ràng.
   Xóa toàn bộ Section 9 cũ và thay bằng content dưới đây. |
| --- |

| Rule | Giá Trị / Hành Vi | Lý Do |
| --- | --- | --- |
| Access Token TTL | 24h — JWT HMAC-SHA256 | Cân bằng UX và security. FE tự refresh khi 401. |
| Refresh Token TTL | 30 ngày — lưu httpOnly cookie | Đủ dài để không phải login lại thường xuyên |
| Token Rotation Policy | Option A: Multi-token (xem chi tiết bên dưới) | Phase 1 — đơn giản nhất, không cần schema changes |
| Password Hashing | bcrypt cost 12 | Balance security vs performance (cost 12 ≈ 200ms) |
| CORS Allowed Origins | Lấy từ env ALLOWED_ORIGINS (không hardcode) | Dễ config theo môi trường dev/staging/prod |
| Rate Limit — Login | 5 req/min per IP | Chống brute force login |
| Rate Limit — General | 60 req/min per IP (ulule/limiter v3) | Chống DDoS và abuse |
| Token Revocation | Logout: xóa Redis key của session đang dùng | Ngay lập tức revoke mà không cần blacklist |
| JWT Algorithm | HMAC-SHA256 — verify t.Method trước khi parse | Ngăn algorithm confusion attack (none/RS256) |
| is_active Check | Redis cache 5 phút — check mỗi request (xem Section 10) | Admin disable staff → tối đa 5 phút lag |

## 9.1 Token Rotation Policy — Phase 1: Option A (Multi-token)
| ⚠️  Thay thế "1 per device" (không implement được — thiếu device_id trong schema):
   Phase 1: Option A — Multi-token
   • Mỗi login tạo 1 refresh token mới, token cũ vẫn valid đến khi expire (30d)
   • Nhiều thiết bị = nhiều token active cùng lúc (không cần device tracking)
   • Logout = xóa đúng key của session đang dùng, không ảnh hưởng session khác |
| --- |

// Token Rotation — Phase 1: Multi-token (Option A)

// === LOGIN: tạo key mới ===
func (s *AuthService) Login(ctx context.Context, username, password string) (*LoginResult, error) {
// ... validate credentials ...

refreshToken := generateSecureRandom(32)
tokenHash := sha256hex(refreshToken)[:16]  // 16 char prefix dùng làm key suffix

// Key: auth:refresh:{staff_id}:{hash_prefix} — nhiều key per staff OK
key := fmt.Sprintf("auth:refresh:%d:%s", staff.ID, tokenHash)
redis.Set(ctx, key, "valid", 30*24*time.Hour)

return &LoginResult{AccessToken: issueJWT(staff), RefreshToken: refreshToken}, nil
}

// === REFRESH: verify và issue token mới ===
func (s *AuthService) Refresh(ctx context.Context, staffID uint64, refreshToken string) (string, error) {
tokenHash := sha256hex(refreshToken)[:16]
key := fmt.Sprintf("auth:refresh:%d:%s", staffID, tokenHash)

val, err := redis.Get(ctx, key).Result()
if err == redis.Nil { return "", ErrTokenRevoked }
if err != nil { return "", ErrInternalError }

// Issue new access token (refresh token giữ nguyên — không rotate)
staff, _ := repo.GetStaffByID(ctx, staffID)
return issueJWT(staff), nil
}

// === LOGOUT: chỉ xóa key của session hiện tại ===
func (s *AuthService) Logout(ctx context.Context, staffID uint64, refreshToken string) error {
tokenHash := sha256hex(refreshToken)[:16]
key := fmt.Sprintf("auth:refresh:%d:%s", staffID, tokenHash)
return redis.Del(ctx, key).Err()  // Chỉ xóa 1 key — session khác vẫn active
}

// === Phase 2 (tương lai): Option B — Single-token ===
// Mỗi login revoke TẤT CẢ token cũ:
// keys, _ := redis.Keys(ctx, fmt.Sprintf("auth:refresh:%d:*", staffID)).Result()
// redis.Del(ctx, keys...)
// Không implement Phase 1 — ghi chú để upgrade sau.

# 🟡 [MỚI] Section 10 — is_active Behavior Trong AuthMiddleware
| 🟡 Gap 6 — Không có spec nào mention behavior khi admin disable staff.
   Security gap: JWT còn valid 24h nhưng is_active=false → middleware vẫn cho qua.
   Fix: check is_active sau khi validate JWT, dùng Redis cache 5 phút để tránh DB query. |
| --- |

Vấn đề: JWT access token có TTL 24h. Nếu admin set is_active=false vào lúc 10:00, staff vẫn access được đến 10:00 hôm sau nếu không check is_active.
Giải pháp: Thêm bước 4.5 vào AuthMiddleware — check is_active từ Redis cache. Cache TTL 5 phút → max 5 phút lag giữa khi admin disable và khi có hiệu lực.

| Tình Huống | Hành Vi | Response |
| --- | --- | --- |
| is_active=true (normal) | Pass → set context → c.Next() | 200 OK (handler chạy bình thường) |
| is_active=false (bị disable) | AbortWithStatusJSON → return | 401 ACCOUNT_DISABLED |
| Staff không tìm thấy trong DB | AbortWithStatusJSON → return | 401 ACCOUNT_DISABLED |
| Redis cache hit, value="active" | Skip DB query → c.Next() | 200 OK (performance optimization) |
| Redis cache hit, value khác "active" | AbortWithStatusJSON → return | 401 ACCOUNT_DISABLED |
| Redis cache miss | Query DB → set cache → check is_active | Tùy theo is_active value |
| Admin deactivate (clear cache ngay) | DEL auth:staff:{id} → cache miss ngay lần tiếp | Hiệu lực ngay lập tức (<1 request lag) |

// AuthMiddleware — Thêm Bước 4.5 (is_active check)
// Đặt SAU khi validate JWT signature thành công:

func JWT(secret string) gin.HandlerFunc {
return func(c *gin.Context) {
// Bước 1-4: Parse và validate JWT (giữ nguyên từ Spec 1 cũ)
token, claims, err := parseAndValidateJWT(c, secret)
if err != nil { respondError(c, 401, "TOKEN_INVALID", "Token không hợp lệ"); return }

// Bước 4.5: Check is_active — MỚI
cacheKey := fmt.Sprintf("auth:staff:%d", claims.StaffID)
cachedVal, cacheErr := rdb.Get(c.Request.Context(), cacheKey).Result()

if cacheErr == redis.Nil {
// Cache miss → query DB
staff, dbErr := staffRepo.GetStaffByID(c.Request.Context(), claims.StaffID)
if dbErr != nil || !staff.IsActive {
respondError(c, 401, "ACCOUNT_DISABLED", "Tài khoản đã bị vô hiệu hóa")
return
}
// Set cache: "active" | "disabled"
val := "active"
if !staff.IsActive { val = "disabled" }
rdb.Set(c.Request.Context(), cacheKey, val, 5*time.Minute)

} else if cacheErr != nil || cachedVal != "active" {
// Cache hit nhưng không phải "active", hoặc Redis error
respondError(c, 401, "ACCOUNT_DISABLED", "Tài khoản đã bị vô hiệu hóa")
return
}

// Bước 5: Set context (giữ nguyên)
c.Set("staff_id", claims.StaffID)  // type: uint64
c.Set("role", claims.Role)          // type: string
c.Next()
}
}

// staffService.Deactivate() — xóa cache ngay khi admin disable
func (s *StaffService) Deactivate(ctx context.Context, staffID uint64) error {
if err := repo.SetStaffActive(ctx, staffID, false); err != nil { return err }
// Xóa cache → tức thời có hiệu lực (không cần đợi 5 phút)
rdb.Del(ctx, fmt.Sprintf("auth:staff:%d", staffID))
return nil
}

# 🔴 [CẬP NHẬT] Section 12 — Acceptance Criteria (Bổ Sung)
Thêm vào danh sách acceptance criteria hiện có (giữ nguyên các criteria cũ):

| # | Criteria Mới | Verify Bằng |
| --- | --- | --- |
| AC-08 | Token rotation: Login 2 lần → 2 token khác nhau → cả 2 đều valid | POST /auth/login ×2, dùng cả 2 refresh token → đều 200 |
| AC-09 | Logout chỉ revoke session hiện tại, không ảnh hưởng session khác | Login 2 session, logout 1 → session 2 vẫn refresh được |
| AC-10 | Admin deactivate staff → tối đa 5 phút (hoặc ngay lập tức nếu clear cache) staff bị reject | Set is_active=false → DEL cache → request tiếp theo → 401 ACCOUNT_DISABLED |
| AC-11 | is_active check không gây N+1 DB query (dùng cache) | 10 requests liên tiếp → chỉ 1 DB query (kiểm tra DB slow query log) |
| AC-12 | Error response PHẢI theo format ERROR_CONTRACT.md | Mọi 4xx/5xx response đều có "error" và "message" fields |

# 🔴 [CẬP NHẬT] Section 11 — Test Cases (Bổ Sung)
Thêm vào test cases hiện có:

| Test | Input | Expected Output |
| --- | --- | --- |
| TestMultiSessionLogin | Login admin 2 lần với 2 client | 2 refresh tokens khác nhau, cả 2 đều valid khi dùng /auth/refresh |
| TestLogoutSingleSession | Login 2 sessions, logout session 1 | Session 1: /auth/refresh → 401. Session 2: /auth/refresh → 200 (vẫn valid) |
| TestAccountDisabledImmediate | Admin set is_active=false → DEL Redis cache → request với JWT cũ | 401 ACCOUNT_DISABLED |
| TestAccountDisabledWithCache | Admin set is_active=false (không DEL cache) → request ngay sau | 200 OK (cache TTL 5 min) → sau 5 phút: 401 |
| TestReactivateAccount | Admin set is_active=false → is_active=true → request | 200 OK (cache refresh sau 5 phút) |
| TestErrorResponseFormat | Bất kỳ request nào gây 4xx/5xx | Response body có "error" (SCREAMING_SNAKE) và "message" fields |

| 📌 Các sections KHÔNG thay đổi trong Spec 1:
   Section 1 (Mục Tiêu), Section 2 (Phạm Vi), Section 3 (RBAC Roles),
   Section 4 (Database Tables), Section 5 (API Endpoints), Section 6 (JWT Payload),
   Section 7 (Middleware), Section 8 (Frontend), Section 10 (File Structure)

🍜 BanhCuon System · Spec 1 Auth Update v2.0 · Gap 5 & 6 Fix · Tháng 4 / 2026 |
| --- |
