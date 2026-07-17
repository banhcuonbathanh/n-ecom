| 🔐  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN — AUTH
pkg/crypto/hash.go  ·  NEW FILE  ·  v1.0  ·  Tháng 4/2026
Go · SHA256 · Shared Utility |
| --- |

| ✅  NEW FILE — Extracted from auth_service.go and auth_repo.go. Both files had duplicate SHA256 functions (hashRaw / hashToken). Single source in pkg/crypto prevents drift if the algorithm changes. |
| --- |

## § Changes
| Status | Description |
| --- | --- |
| ✅ NEW | pkg/crypto/hash.go — replaces hashRaw() in auth_service.go and hashToken() in auth_repo.go |
| 🗑 REMOVED | hashRaw() from auth_service.go — import pkg/crypto instead |
| 🗑 REMOVED | hashToken() from auth_repo.go — import pkg/crypto instead |

## § Code
| // pkg/crypto/hash.go
// Shared SHA256 hashing utility for auth tokens.
// Centralizes hash logic so auth_repo.go and auth_service.go
// use identical implementations — prevents silent drift.
//
// Ref: 001_auth.sql — token_hash CHAR(64) = hex(SHA256(raw_token))
// Ref: MASTER.docx §6 — refresh token stored as hash, never raw
package crypto
 
import (
	"crypto/sha256"
	"encoding/hex"
)
 
// HashToken returns hex(SHA256(raw)).
// Use for:
//   - Refresh token before DB insert:    HashToken(pair.RefreshToken)
//   - Refresh token before DB lookup:    HashToken(rawFromCookie)
//
// SECURITY: raw token is NEVER written to DB or logged.
// Consistent with 001_auth.sql: token_hash CHAR(64).
func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
} |
| --- |
