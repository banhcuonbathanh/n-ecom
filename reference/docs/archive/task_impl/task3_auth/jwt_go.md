| 🔑  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN — AUTH
pkg/jwt/jwt.go  ·  v1.1  ·  Tháng 4/2026
Go · JWT · HMAC-SHA256 |
| --- |

| 💡 Minor rename: newUUID() → newJTI() — the value is 32-char random hex, not UUID v4 format. Naming now matches actual behaviour. No logic changes. |
| --- |

## § Changes from v1.0
| Symbol | Change |
| --- | --- |
| ⚠️ RENAME | newUUID() renamed to newJTI() — no logic change, clarity only |
| ✓ NO CHANGE | All other functions unchanged from v1.0 |

## § Code
| // pkg/jwt/jwt.go
// JWT generation and verification for BanhCuon system.
// Ref: MASTER.docx §6 — Access: 24h in-memory, Refresh: 30d httpOnly cookie.
// Payload: sub (staff_id), role, jti (random hex for blacklist), exp.
package jwt
 
import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"
 
	"github.com/golang-jwt/jwt/v5"
)
 
// Claims is the JWT payload. jti is used for Redis blacklist on logout.
type Claims struct {
	jwt.RegisteredClaims
	Role string `json:"role"`
}
 
// TokenPair holds the signed access token string and the raw refresh token.
type TokenPair struct {
	AccessToken  string
	RefreshToken string // raw random hex — hash with SHA256 before persisting to DB
}
 
var (
	ErrTokenExpired   = errors.New("token expired")
	ErrTokenInvalid   = errors.New("token invalid")
	ErrTokenBlacklist = errors.New("token revoked")
)
 
func accessTTL() time.Duration {
	if v := os.Getenv("JWT_ACCESS_TTL"); v != "" {
		if secs, err := strconv.Atoi(v); err == nil {
			return time.Duration(secs) * time.Second
		}
	}
	return 24 * time.Hour
}
 
func refreshTTL() time.Duration {
	if v := os.Getenv("JWT_REFRESH_TTL"); v != "" {
		if secs, err := strconv.Atoi(v); err == nil {
			return time.Duration(secs) * time.Second
		}
	}
	return 30 * 24 * time.Hour
}
 
func secret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		panic("JWT_SECRET env var is not set — refusing to start")
	}
	return []byte(s)
}
 
// GenerateTokenPair creates a signed access token and a random refresh token.
func GenerateTokenPair(staffID, role string) (*TokenPair, error) {
	// ✅ RENAME: newUUID() → newJTI() — clearer intent; value is random hex, not UUID v4.
	jti, err := newJTI()
	if err != nil {
		return nil, fmt.Errorf("jwt.GenerateTokenPair generate jti: %w", err)
	}
 
	now := time.Now()
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   staffID,
			ID:        jti,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(accessTTL())),
		},
		Role: role,
	}
 
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(secret())
	if err != nil {
		return nil, fmt.Errorf("jwt.GenerateTokenPair sign: %w", err)
	}
 
	rawRefresh, err := generateRandomHex(32)
	if err != nil {
		return nil, fmt.Errorf("jwt.GenerateTokenPair generate refresh: %w", err)
	}
 
	return &TokenPair{AccessToken: signed, RefreshToken: rawRefresh}, nil
}
 
// ParseClaims verifies the token signature and expiry.
// Caller must additionally check Redis blacklist for logout:{jti}.
func ParseClaims(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return secret(), nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrTokenInvalid
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, ErrTokenInvalid
	}
	return claims, nil
}
 
func RefreshTTL() time.Duration { return refreshTTL() }
func AccessTTL() time.Duration  { return accessTTL() }
 
// BlacklistKey returns the Redis key for a revoked jti: logout:{jti}
func BlacklistKey(jti string) string  { return "logout:" + jti }
func SessionKey(staffID string) string { return "session:" + staffID }
 
// ✅ RENAME: newUUID → newJTI — value is 32-char random hex, not UUID v4 format.
// Name now accurately reflects what it generates.
func newJTI() (string, error) { return generateRandomHex(16) }
 
func generateRandomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
} |
| --- |
