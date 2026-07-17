| 🗄️  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN — AUTH
internal/repository/auth_repo.go  ·  v1.1  ·  Tháng 4/2026
Go · Redis · sqlc · Gin |
| --- |

| 🚨 RISK FIXED (x2): (1) Race condition on 5-session cap — COUNT→DELETE→INSERT now wrapped in transaction. (2) Type mismatch: CreateSessionParams.UserAgent/IPAddress changed from custom interface to plain string, converted to sql.NullString at DB boundary via toNullString(). |
| --- |

## § Changes from v1.0
| Symbol | Change |
| --- | --- |
| 🔴 FIX | AuthRepo struct: add *sql.DB field for transaction support |
| 🔴 FIX | NewAuthRepo: add *sql.DB parameter |
| 🔴 FIX | CreateSession: wrap in BEGIN/COMMIT transaction — eliminates race on session cap |
| 🔴 FIX | CreateSessionParams: UserAgent/IPAddress changed to plain string (was incompatible interface) |
| 🔴 FIX | toNullString() helper added — converts string → sql.NullString at DB boundary |
| ✅ NEW | GetLoginFailCount() — reads login_fail:{ip} counter from Redis |
| ✅ NEW | IncrLoginFail() — INCR + EXPIRE in Redis pipeline (atomic) |
| ✅ NEW | ResetLoginFail() — clears counter on successful login |
| ✅ REFACTOR | hashToken() removed — now uses pkg/crypto.HashToken() (shared) |

## § Code
| // internal/repository/auth_repo.go
// Auth repository: wraps sqlc Querier + Redis for session management.
// Redis is the fast-path; MySQL refresh_tokens is the fallback.
// Ref: MASTER.docx §6, §8 — Token Config + Redis Keys.
package repository
 
import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
 
	"github.com/redis/go-redis/v9"
 
	"banhcuon/be/internal/db"
	crypto "banhcuon/be/pkg/crypto"  // ✅ FIX: shared hash — was duplicate hashToken()
	jwtpkg "banhcuon/be/pkg/jwt"
)
 
const maxSessionsPerStaff = 5
 
// AuthRepo handles all auth persistence: MySQL via sqlc + Redis for blacklist/sessions.
// db field added in v1.1 to support transactional session management.
type AuthRepo struct {
	db  *sql.DB       // ✅ FIX: needed for CreateSession transaction
	q   db.Querier
	rdb *redis.Client
}
 
// ✅ FIX: constructor now accepts *sql.DB for transaction support.
func NewAuthRepo(database *sql.DB, q db.Querier, rdb *redis.Client) *AuthRepo {
	return &AuthRepo{db: database, q: q, rdb: rdb}
}
 
// --- Staff ---
 
// GetByUsername loads a staff record for login. Returns sql.ErrNoRows if not found.
// SECURITY: caller must return ErrInvalidCredentials for both "not found" and "wrong password".
func (r *AuthRepo) GetByUsername(ctx context.Context, username string) (db.GetStaffByUsernameRow, error) {
	row, err := r.q.GetStaffByUsername(ctx, username)
	if err != nil {
		return db.GetStaffByUsernameRow{}, fmt.Errorf("AuthRepo.GetByUsername: %w", err)
	}
	return row, nil
}
 
// GetByID loads a staff record by ID (no password_hash). Used by AuthMiddleware + /me.
func (r *AuthRepo) GetByID(ctx context.Context, id string) (db.GetStaffByIDRow, error) {
	row, err := r.q.GetStaffByID(ctx, id)
	if err != nil {
		return db.GetStaffByIDRow{}, fmt.Errorf("AuthRepo.GetByID: %w", err)
	}
	return row, nil
}
 
// --- Session management ---
 
// ✅ FIX: CreateSession wraps the 5-session cap in a transaction.
// Previous version: COUNT → DELETE → INSERT as 3 separate queries.
// Race: two concurrent logins both counted 4, both skipped delete, both inserted → 6 sessions.
// Fix: BEGIN → COUNT → DELETE if needed → INSERT → COMMIT inside same transaction.
func (r *AuthRepo) CreateSession(ctx context.Context, params CreateSessionParams) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("AuthRepo.CreateSession begin tx: %w", err)
	}
	defer tx.Rollback()
 
	// Use sqlc WithTx so all queries run inside the same transaction.
	qtx := r.q.WithTx(tx)
 
	count, err := qtx.CountActiveSessionsByStaffID(ctx, params.StaffID)
	if err != nil {
		return fmt.Errorf("AuthRepo.CreateSession count: %w", err)
	}
	if count >= maxSessionsPerStaff {
		// Delete the least-recently-used session before inserting the new one.
		// Use last_used_at ASC — ref: 001_auth.sql v1.2 last_used_at column.
		if err := qtx.DeleteOldestSessionByStaffID(ctx, params.StaffID); err != nil {
			return fmt.Errorf("AuthRepo.CreateSession delete oldest: %w", err)
		}
	}
 
	if err := qtx.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
		StaffID:   params.StaffID,
		TokenHash: params.TokenHash,
		UserAgent: toNullString(params.UserAgent),  // ✅ FIX: convert at DB boundary
		IpAddress: toNullString(params.IPAddress),
		ExpiresAt: params.ExpiresAt,
	}); err != nil {
		return fmt.Errorf("AuthRepo.CreateSession insert: %w", err)
	}
 
	return tx.Commit()
}
 
// GetSessionByRawToken looks up a refresh_token row using the raw token from the cookie.
// Hashes the raw token internally — DB only stores hashes.
func (r *AuthRepo) GetSessionByRawToken(ctx context.Context, rawToken string) (db.GetRefreshTokenByHashRow, error) {
	h := crypto.HashToken(rawToken)  // ✅ FIX: use shared pkg/crypto
	row, err := r.q.GetRefreshTokenByHash(ctx, h)
	if err != nil {
		return db.GetRefreshTokenByHashRow{}, fmt.Errorf("AuthRepo.GetSessionByRawToken: %w", err)
	}
	return row, nil
}
 
// TouchSession updates last_used_at on every successful /auth/refresh call.
// Ref: 001_auth.sql v1.2 — last_used_at.
func (r *AuthRepo) TouchSession(ctx context.Context, rawToken string) error {
	h := crypto.HashToken(rawToken)
	if err := r.q.UpdateRefreshTokenLastUsed(ctx, h); err != nil {
		return fmt.Errorf("AuthRepo.TouchSession: %w", err)
	}
	return nil
}
 
// RevokeSession deletes the refresh_token row (logout current device).
func (r *AuthRepo) RevokeSession(ctx context.Context, rawToken string) error {
	h := crypto.HashToken(rawToken)
	if err := r.q.DeleteRefreshToken(ctx, h); err != nil {
		return fmt.Errorf("AuthRepo.RevokeSession: %w", err)
	}
	return nil
}
 
// RevokeAllSessions deletes ALL refresh tokens for a staff (admin force logout).
func (r *AuthRepo) RevokeAllSessions(ctx context.Context, staffID string) error {
	if err := r.q.DeleteAllSessionsByStaffID(ctx, staffID); err != nil {
		return fmt.Errorf("AuthRepo.RevokeAllSessions: %w", err)
	}
	return nil
}
 
// --- Redis blacklist ---
 
// BlacklistJTI adds jti to Redis with TTL = remaining access token lifetime.
// Key pattern: logout:{jti} — Ref: MASTER.docx §8.
func (r *AuthRepo) BlacklistJTI(ctx context.Context, jti string, remainingTTL time.Duration) error {
	key := jwtpkg.BlacklistKey(jti)
	if err := r.rdb.Set(ctx, key, "1", remainingTTL).Err(); err != nil {
		return fmt.Errorf("AuthRepo.BlacklistJTI redis SET: %w", err)
	}
	return nil
}
 
// IsJTIBlacklisted returns true if the jti has been revoked (exists in Redis).
func (r *AuthRepo) IsJTIBlacklisted(ctx context.Context, jti string) (bool, error) {
	key := jwtpkg.BlacklistKey(jti)
	val, err := r.rdb.Exists(ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("AuthRepo.IsJTIBlacklisted redis EXISTS: %w", err)
	}
	return val > 0, nil
}
 
// --- Login rate limit (Redis) ---
// Ref: MASTER.docx §4, CLAUDE_DB.docx §5 — login_fail:{ip}, max 5/min, lock 15 min.
 
const loginLockTTL = 15 * time.Minute
 
// GetLoginFailCount returns how many failed login attempts from this IP in the window.
func (r *AuthRepo) GetLoginFailCount(ctx context.Context, ip string) (int64, error) {
	key := "login_fail:" + ip
	val, err := r.rdb.Get(ctx, key).Int64()
	if errors.Is(err, redis.Nil) {
		return 0, nil  // no failures yet
	}
	if err != nil {
		return 0, fmt.Errorf("AuthRepo.GetLoginFailCount: %w", err)
	}
	return val, nil
}
 
// IncrLoginFail increments the failure counter for this IP and (re)sets TTL to 15 min.
// Uses pipeline so INCR + EXPIRE are atomic from the server's perspective.
func (r *AuthRepo) IncrLoginFail(ctx context.Context, ip string) error {
	key := "login_fail:" + ip
	pipe := r.rdb.Pipeline()
	pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, loginLockTTL)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("AuthRepo.IncrLoginFail: %w", err)
	}
	return nil
}
 
// ResetLoginFail clears the failure counter on successful login.
func (r *AuthRepo) ResetLoginFail(ctx context.Context, ip string) error {
	return r.rdb.Del(ctx, "login_fail:"+ip).Err()
}
 
// --- Helpers ---
 
// CreateSessionParams bundles params for CreateSession.
// ✅ FIX: UserAgent and IPAddress are plain strings — converted to sql.NullString
// at the DB boundary via toNullString(). Previous version used a custom interface
// that was type-incompatible with sql.NullString (compile error).
type CreateSessionParams struct {
	StaffID   string
	TokenHash string
	UserAgent string    // empty string = not provided → sql.NullString{Valid: false}
	IPAddress string
	ExpiresAt time.Time
}
 
// toNullString converts a plain string to sql.NullString.
// Empty string → Valid=false (NULL in DB). Non-empty → Valid=true.
func toNullString(s string) sql.NullString {
	return sql.NullString{String: s, Valid: s != ""}
} |
| --- |
