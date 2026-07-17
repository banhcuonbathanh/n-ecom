| ⚙️  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN — AUTH
internal/service/auth_service.go  ·  v1.1  ·  Tháng 4/2026
Go · JWT · Redis · bcrypt |
| --- |

| 🚨 RISK FIXED (x2): (1) Login rate limiting added — login_fail:{ip} counter per MASTER §4 / CLAUDE_DB §5. (2) nullableString custom type removed — plain strings passed to CreateSessionParams, fixing type mismatch. fmt.Printf replaced with slog. |
| --- |

## § Changes from v1.0
| Symbol | Change |
| --- | --- |
| 🔴 FIX | Login(): rate limit check added (GetLoginFailCount → ErrRateLimited if >= 5) |
| 🔴 FIX | Login(): IncrLoginFail() called on every failed attempt (no-user, inactive, wrong-pw) |
| 🔴 FIX | Login(): ResetLoginFail() called on successful login |
| 🔴 FIX | Login(): nullableString removed — CreateSessionParams uses plain strings now |
| 🔴 FIX | hashRaw() removed — now uses pkg/crypto.HashToken() (shared) |
| ✅ NEW | ErrRateLimited sentinel added — COMMON_003, HTTP 429 |
| ✅ NEW | AuthRepo interface: GetLoginFailCount / IncrLoginFail / ResetLoginFail methods added |
| ⚠️ FIX | fmt.Printf in Logout + ValidateAccessToken → slog.WarnContext |

## § Code
| // internal/service/auth_service.go
// Auth service: login, refresh, logout, me.
// Ref: MASTER.docx §4.3, §6 — Token Config + Business Rules.
// Ref: MASTER.docx §7  — Error codes: AUTH_001, AUTH_002, AUTH_003.
package service
 
import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"time"
 
	"banhcuon/be/internal/db"
	"banhcuon/be/internal/repository"
	bcryptpkg "banhcuon/be/pkg/bcrypt"
	crypto "banhcuon/be/pkg/crypto"   // ✅ FIX: shared hash — replaces hashRaw()
	jwtpkg "banhcuon/be/pkg/jwt"
)
 
// AppError carries a machine-readable code, HTTP status, and user-facing message.
type AppError struct {
	Code    string
	Status  int
	Message string
}
 
func (e *AppError) Error() string { return fmt.Sprintf("%s: %s", e.Code, e.Message) }
 
var (
	ErrInvalidCredentials = &AppError{"AUTH_001", http.StatusUnauthorized, "Thông tin đăng nhập không hợp lệ"}
	ErrTokenExpired       = &AppError{"AUTH_001", http.StatusUnauthorized, "Token đã hết hạn"}
	ErrTokenInvalid       = &AppError{"AUTH_001", http.StatusUnauthorized, "Token không hợp lệ"}
	ErrTokenRevoked       = &AppError{"AUTH_001", http.StatusUnauthorized, "Token đã bị thu hồi"}
	ErrRefreshInvalid     = &AppError{"AUTH_002", http.StatusUnauthorized, "Refresh token không hợp lệ hoặc đã hết hạn"}
	ErrForbidden          = &AppError{"AUTH_003", http.StatusForbidden, "Không đủ quyền truy cập"}
	ErrRateLimited        = &AppError{"COMMON_003", http.StatusTooManyRequests, "Quá nhiều lần thử. Vui lòng thử lại sau 15 phút."}
)
 
// AuthRepo is the interface AuthService depends on.
type AuthRepo interface {
	GetByUsername(ctx context.Context, username string) (db.GetStaffByUsernameRow, error)
	GetByID(ctx context.Context, id string) (db.GetStaffByIDRow, error)
	CreateSession(ctx context.Context, params repository.CreateSessionParams) error
	GetSessionByRawToken(ctx context.Context, rawToken string) (db.GetRefreshTokenByHashRow, error)
	TouchSession(ctx context.Context, rawToken string) error
	RevokeSession(ctx context.Context, rawToken string) error
	RevokeAllSessions(ctx context.Context, staffID string) error
	BlacklistJTI(ctx context.Context, jti string, remainingTTL time.Duration) error
	IsJTIBlacklisted(ctx context.Context, jti string) (bool, error)
	// ✅ NEW: rate limit methods — ref: MASTER.docx §4, CLAUDE_DB.docx §5
	GetLoginFailCount(ctx context.Context, ip string) (int64, error)
	IncrLoginFail(ctx context.Context, ip string) error
	ResetLoginFail(ctx context.Context, ip string) error
}
 
type AuthService struct {
	repo AuthRepo
}
 
func NewAuthService(repo AuthRepo) *AuthService {
	return &AuthService{repo: repo}
}
 
type LoginInput struct {
	Username  string
	Password  string
	UserAgent string
	IPAddress string
}
 
type LoginOutput struct {
	AccessToken  string
	RefreshToken string
	Staff        StaffSummary
}
 
type StaffSummary struct {
	ID       string
	Username string
	Role     string
	FullName string
}
 
// ✅ FIX: Login now enforces rate limiting per MASTER.docx §4 / CLAUDE_DB.docx §5.
// login_fail:{ip} counter — max 5 failures/minute, lock 15 minutes.
// Always returns ErrInvalidCredentials for both "user not found" and "wrong password"
// to prevent username enumeration.
const maxLoginFails = 5
 
func (s *AuthService) Login(ctx context.Context, input LoginInput) (*LoginOutput, error) {
	// ── Rate limit check ─────────────────────────────────────────────────────
	if input.IPAddress != "" {
		fails, err := s.repo.GetLoginFailCount(ctx, input.IPAddress)
		if err != nil {
			// Redis down: log and continue (fail-open to avoid Redis outage = login outage)
			slog.WarnContext(ctx, "login rate limit check failed (fail-open)", "error", err)
		} else if fails >= maxLoginFails {
			return nil, ErrRateLimited
		}
	}
 
	// ── Credential verification ───────────────────────────────────────────────
	staff, err := s.repo.GetByUsername(ctx, input.Username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Timing-safe: run bcrypt on a fake hash to prevent timing oracle.
			_ = bcryptpkg.Verify("$2a$12$invalidhashtowastesametime00000000000000000000000000000", input.Password)
			_ = s.repo.IncrLoginFail(ctx, input.IPAddress)  // count failed attempt
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("Login GetByUsername: %w", err)
	}
 
	if !staff.IsActive {
		_ = s.repo.IncrLoginFail(ctx, input.IPAddress)
		return nil, ErrInvalidCredentials
	}
 
	if err := bcryptpkg.Verify(staff.PasswordHash, input.Password); err != nil {
		_ = s.repo.IncrLoginFail(ctx, input.IPAddress)
		return nil, ErrInvalidCredentials
	}
 
	// ── Success path ──────────────────────────────────────────────────────────
	// Clear rate limit counter on successful login.
	_ = s.repo.ResetLoginFail(ctx, input.IPAddress)
 
	pair, err := jwtpkg.GenerateTokenPair(staff.ID, string(staff.Role))
	if err != nil {
		return nil, fmt.Errorf("Login GenerateTokenPair: %w", err)
	}
 
	expiresAt := time.Now().Add(jwtpkg.RefreshTTL())
	tokenHash := crypto.HashToken(pair.RefreshToken)  // ✅ FIX: use shared pkg/crypto
 
	if err := s.repo.CreateSession(ctx, repository.CreateSessionParams{
		StaffID:   staff.ID,
		TokenHash: tokenHash,
		UserAgent: input.UserAgent,  // ✅ FIX: plain string, not custom interface
		IPAddress: input.IPAddress,
		ExpiresAt: expiresAt,
	}); err != nil {
		return nil, fmt.Errorf("Login CreateSession: %w", err)
	}
 
	return &LoginOutput{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		Staff: StaffSummary{
			ID: staff.ID, Username: staff.Username,
			Role: string(staff.Role), FullName: staff.FullName,
		},
	}, nil
}
 
type RefreshOutput struct {
	AccessToken string
}
 
// Refresh validates the refresh token cookie and issues a new access token.
// Stamps last_used_at for stale session detection (ref: 001_auth.sql v1.2).
func (s *AuthService) Refresh(ctx context.Context, rawRefreshToken string) (*RefreshOutput, error) {
	row, err := s.repo.GetSessionByRawToken(ctx, rawRefreshToken)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRefreshInvalid
		}
		return nil, fmt.Errorf("Refresh GetSession: %w", err)
	}
 
	if time.Now().After(row.ExpiresAt) {
		return nil, ErrRefreshInvalid
	}
 
	// Stamp last_used_at in background — failure is non-fatal (best-effort audit).
	go func() {
		_ = s.repo.TouchSession(context.Background(), rawRefreshToken)
	}()
 
	staff, err := s.repo.GetByID(ctx, row.StaffID)
	if err != nil {
		return nil, fmt.Errorf("Refresh GetByID: %w", err)
	}
	if !staff.IsActive {
		return nil, ErrRefreshInvalid
	}
 
	pair, err := jwtpkg.GenerateTokenPair(staff.ID, string(staff.Role))
	if err != nil {
		return nil, fmt.Errorf("Refresh GenerateTokenPair: %w", err)
	}
	return &RefreshOutput{AccessToken: pair.AccessToken}, nil
}
 
// Logout revokes the current session and blacklists the JTI.
// Ref: MASTER.docx §8 — logout:{jti} Redis key.
func (s *AuthService) Logout(ctx context.Context, rawRefreshToken string, claims *jwtpkg.Claims) error {
	if err := s.repo.RevokeSession(ctx, rawRefreshToken); err != nil {
		// ✅ FIX: use slog instead of fmt.Printf
		slog.WarnContext(ctx, "Logout RevokeSession non-fatal", "error", err)
	}
	remaining := time.Until(claims.ExpiresAt.Time)
	if remaining > 0 {
		if err := s.repo.BlacklistJTI(ctx, claims.ID, remaining); err != nil {
			return fmt.Errorf("Logout BlacklistJTI: %w", err)
		}
	}
	return nil
}
 
// Me returns the current staff profile (fresh from DB, not just from claims).
func (s *AuthService) Me(ctx context.Context, staffID string) (*StaffSummary, error) {
	staff, err := s.repo.GetByID(ctx, staffID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrTokenInvalid
		}
		return nil, fmt.Errorf("Me GetByID: %w", err)
	}
	if !staff.IsActive {
		return nil, ErrTokenInvalid
	}
	return &StaffSummary{
		ID: staff.ID, Username: staff.Username,
		Role: string(staff.Role), FullName: staff.FullName,
	}, nil
}
 
// ValidateAccessToken verifies signature + expiry + Redis blacklist.
// Fails open on Redis error — Redis outage should NOT take down auth.
func (s *AuthService) ValidateAccessToken(ctx context.Context, tokenStr string) (*jwtpkg.Claims, error) {
	claims, err := jwtpkg.ParseClaims(tokenStr)
	if err != nil {
		if errors.Is(err, jwtpkg.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrTokenInvalid
	}
	blacklisted, err := s.repo.IsJTIBlacklisted(ctx, claims.ID)
	if err != nil {
		// ✅ FIX: slog instead of fmt.Printf
		slog.WarnContext(ctx, "ValidateAccessToken blacklist check failed (fail-open)", "error", err)
		return claims, nil
	}
	if blacklisted {
		return nil, ErrTokenRevoked
	}
	return claims, nil
} |
| --- |
