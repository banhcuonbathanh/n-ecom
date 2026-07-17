# Staff Login — `/login` · Backend View

> **TL;DR:** the single BE endpoint the staff login page calls (`POST /auth/login`), traced
> handler → service → repository → SQL, with auth, the two Redis writes it makes (login
> rate-limit + is_active cache), and error behaviour. Traced from source on branch
> `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/auth_handler.go` ·
> `be/internal/service/auth_service.go` · `be/internal/db/auth.sql.go` ·
> `be/internal/middleware/auth.go` · `be/pkg/jwt/jwt.go` · `be/internal/service/errors.go`.
>
> FE view + zones → [staff_login.md](staff_login.md) ·
> Session handoff (token/cookie across pages) → [staff_login_crosspage_dataflow.md](staff_login_crosspage_dataflow.md) ·
> In-flight states → [staff_login_loading.md](staff_login_loading.md) ·
> Code bugs found this run → [LOGIN_BUGS.md](LOGIN_BUGS.md) ·
> Token/RBAC rules → [../../02_spec/BUSINESS_RULES.md](../../02_spec/BUSINESS_RULES.md)

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis |
|---|---|---|---|---|---|---|
| 1 | `POST /auth/login` | **public** | `authH.Login` | `AuthService.Login` | `GetStaffByUsername` · `CountActiveSessionsByStaff` · `DeleteOldestSessionByStaff` · `CreateRefreshToken` | **writes** `ratelimit:login:<ip>` (60 s) + `auth:staff:<id>` (5 min) — no read-cache |

Route registration: `be/cmd/server/main.go:154-155` — `authR := v1.Group("/auth")` then
`authR.POST("/login", authH.Login)`. Under `/api/v1`, **no `authMW`** (public group; `authMW` is
only applied to the `protected` sub-group at `main.go:160-163` for `/logout` + `/me`).

> This is the **only** endpoint the page hits. The "already logged in → redirect" effect
> (`login/page.tsx:33-35`) reads the Zustand auth store in memory — no BE call. The dev-only
> `/dev-login` helper calls the **same** `POST /auth/login` with a seeded username + hardcoded
> password `Admin@123` (`dev-login/page.tsx:31`).

---

## Auth Model on This Page

- **`POST /auth/login` is fully public** — it is the token-minting entry point, so it cannot
  itself require a token. No `authMW`, no role gate.
- On success the BE issues **two** credentials (`auth_handler.go:43-60`):
  1. a **staff access token** (JWT, HS256, `sub=<staffID>`, `role=<role>`, TTL 24 h default) in
     the JSON body — the FE stores it in Zustand memory only (`auth.store.ts:15`), never
     localStorage.
  2. a **refresh token** in an httpOnly cookie `refresh_token` (raw token; only its SHA-256 hash
     is persisted in `refresh_tokens`).
- **Role drives the post-login redirect** (FE-side, `login/page.tsx:20-26`): `chef→/kds`,
  `cashier→/pos`, `manager|admin→/admin`, `customer→/menu`. The BE does not redirect; it only
  returns `user.role`. Role hierarchy → [BUSINESS_RULES §1 RBAC](../../02_spec/BUSINESS_RULES.md).
- **Guest JWT is unrelated to this page** — that is minted by `POST /auth/guest` on
  `/table/:tableId` (see [customer_table_qr_be.md](../../customer/customer_table_qr/customer_table_qr_be.md)).

---

## Per-Endpoint Detail

### 1 · `POST /auth/login`

**Handler** `authH.Login` (`auth_handler.go:29-61`):

- Binds `loginRequest{ username (required,min=3), password (required,min=8) }`
  (`auth_handler.go:22-25`). Bind failure → `400 INVALID_INPUT`.
- Calls `svc.Login(ctx, username, password, c.ClientIP(), c.GetHeader("User-Agent"))`
  (`auth_handler.go:37`) — the client IP and User-Agent are passed for rate-limiting + session
  bookkeeping.
- On success: `middleware.SetRefreshCookie(c, result.RefreshToken)` (`auth_handler.go:43`), then
  `200 OK` with body `{ data: { access_token, user{ id, username, full_name, role, email } } }`
  (`auth_handler.go:49-60`). `email` is `""` when the DB column is NULL (`:45-48`).

**Service** `AuthService.Login` (`auth_service.go:69-142`) — strict order:

1. **Rate limit** `checkLoginRateLimit(ctx, ipAddr)` (`:71`, impl `:346-365`): Redis
   `INCR ratelimit:login:<ip>`; on the first hit sets a 60 s TTL; `count > 5` → `ErrRateLimitExceeded`
   (`429 RATE_LIMIT_EXCEEDED`). **Fail-open** — a Redis error allows the login (`:352-356`). Empty
   IP skips the check (`:347-349`). *This is the project's only live rate limiter and it is
   service-level, not middleware* — see Flags.
2. **Fetch staff** `repo.GetStaffByUsername` (`:76`). `sql.ErrNoRows` → `ErrInvalidCredentials`
   (`401 INVALID_CREDENTIALS`) — same error as a wrong password (no user-enumeration oracle).
3. **Verify password** `bcryptpkg.Verify(staff.PasswordHash, password)` (`:85`) → fail →
   `ErrInvalidCredentials`.
4. **is_active check AFTER bcrypt** (`:90`) → if `!staff.IsActive` → `ErrAccountDisabled`
   (`401 ACCOUNT_DISABLED`). Ordered after bcrypt deliberately, to avoid a timing oracle on
   disabled accounts.
5. **Issue access token** `jwtpkg.GenerateAccessToken(staff.ID, role)` (`:95`; impl
   `jwt.go:51-69`, HS256, `JWT_SECRET`, TTL `AccessTTL()` = `JWT_ACCESS_TTL` env or 24 h).
6. **New refresh token** `newRefreshToken()` (`:101`; impl `:387-395`) — 32 crypto-random bytes,
   base64url raw to the client, SHA-256 hash to the DB.
7. **Max 5 concurrent sessions** (`:104-112`): `CountActiveSessionsByStaff`; if `>= 5`,
   `DeleteOldestSessionByStaff` (oldest by `last_used_at ASC`). A delete failure is logged, not
   fatal.
8. **Persist refresh token** `repo.CreateRefreshToken` (`:123-132`) with `token_hash`, `user_agent`,
   `ip_address`, `expires_at = now + RefreshTTL()` (30 d default).
9. **Proactively cache is_active** `setIsActiveCache(staff.ID, true)` (`:135`; impl `:367-376`):
   `SET auth:staff:<id> = "active"` TTL 5 min, so the first authenticated request after login hits
   the cache instead of MySQL. Key via `staffActiveKey` (`:43-45`).

**Repo / SQL** `GetStaffByUsername` (`auth.sql.go:138-165`):
`SELECT … FROM staff WHERE username = ? AND deleted_at IS NULL LIMIT 1` — soft-deleted staff are
invisible to login (they 401 as INVALID_CREDENTIALS). Other queries: `CountActiveSessionsByStaff`,
`DeleteOldestSessionByStaff`, `CreateRefreshToken` (refresh-token table writes).

**Refresh cookie** `SetRefreshCookie` (`middleware/auth.go:101-105`): name `refresh_token`,
`httpOnly=true`, path `/api/v1/auth`, `maxAge = RefreshTTL()`, `secure` set only when TLS or
`X-Forwarded-Proto: https` (so integration tests over plain HTTP work). Scoped path means the
cookie is sent **only** to `/api/v1/auth/*` (refresh/logout), not to every API call.

---

## Caching & Invalidation

This page makes **no cached reads** — login always hits MySQL for the staff row. It only *writes*
two Redis keys as side effects:

| Key | Type | TTL | Written here | Read by | Invalidated by |
|---|---|---|---|---|---|
| `ratelimit:login:<ip>` | counter | 60 s | every login attempt (`auth_service.go:351`) | the same `checkLoginRateLimit` | TTL only (window expiry) |
| `auth:staff:<id>` | `"active"`/`"disabled"` | 5 min | on success (`:135`) | `IsStaffActive` in `authMW` on every later request (`:317-334`) | staff (de)activation `delIsActiveCache` (`:378-383`); Logout |

Both are **fail-open**: a Redis outage disables rate-limiting and serves `is_active=true` rather
than locking everyone out (`:323-326`, `:352-356`). Documented in
[REDIS_CACHE.md](../../03_be/REDIS_CACHE.md) rows `auth:staff:{id}` + `ratelimit:login:{ip}`.

---

## Error Behaviour

| Trigger | Service error | HTTP | Code | FE handling (`login/page.tsx:49-58`) |
|---|---|---|---|---|
| Body fails bind (missing field, `password` < 8, `username` < 3) | — (handler) | 400 | `INVALID_INPUT` | falls through → generic "Đã xảy ra lỗi, vui lòng thử lại" |
| Unknown username / wrong password | `ErrInvalidCredentials` (`errors.go:24`) | 401 | `INVALID_CREDENTIALS` | "Tên đăng nhập hoặc mật khẩu không đúng" |
| Account `is_active = 0` | `ErrAccountDisabled` (`errors.go:25`) | 401 | `ACCOUNT_DISABLED` | "Tài khoản đã bị vô hiệu hoá" |
| > 5 attempts/min/IP | `ErrRateLimitExceeded` (`errors.go:26`) | 429 | `RATE_LIMIT_EXCEEDED` | falls through → generic message |
| Untyped/internal | wrapped `%w` | 500 | `COMMON_002` | falls through → generic message |

All service `AppError`s pass through `handleServiceError` (`respond.go:24-36`), which preserves the
status + code. Error codes match [ERROR_SPEC.md](../../02_spec/ERROR_SPEC.md) lines 38/42/43/58.

---

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **FE password min (6) < BE password min (8)** | FE Zod allows `password ≥ 6` (`login/page.tsx:16`) but the handler binding requires `min=8` (`auth_handler.go:24`). A 6–7-char password passes the client form, gets a `400 INVALID_INPUT` from the BE, and the FE maps that unknown code to a **generic** "Đã xảy ra lỗi" — the user never learns the real reason. → [LOGIN_BUGS.md](LOGIN_BUGS.md) Bug 1. |
| 2 | **FE error map is dead/incomplete** | The FE checks for `AUTH_001` (`login/page.tsx:52`) but the BE never emits it (it returns `INVALID_CREDENTIALS`), and it has no branch for `RATE_LIMIT_EXCEEDED` or `INVALID_INPUT` — both fall through to the generic message. So a throttled or under-length-password user sees no specific feedback. → [LOGIN_BUGS.md](LOGIN_BUGS.md) Bug 2. |
| 3 | **Login rate-limit is service-level, not middleware** | Unlike the guest path (`POST /auth/guest`, which BUSINESS_RULES §5.2 notes has **no** rate limiter), `POST /auth/login` **is** throttled — but inside `AuthService.Login` via Redis INCR (`auth_service.go:346-365`), not by any `middleware/`. `be/internal/middleware/ratelimit.go` referenced elsewhere is unused for this route. So the control is real but lives where a middleware audit would miss it. |
| 4 | **Cookie SameSite — comment says Strict, code sets none** | `SetRefreshCookie`'s comment claims `SameSite=Strict` (`auth.go:98`) but it calls `c.SetCookie(...)`, which does **not** set a SameSite attribute — Gin emits the browser default. ❓ UNVERIFIED whether a global `SameSite` default is configured elsewhere; if not, the cookie's SameSite is unset. Path is correctly scoped to `/api/v1/auth`. |
| 5 | **`email` returned but undocumented** | The login response includes `user.email` (`auth_handler.go:57`), but API_SPEC's response column listed only `{id,username,full_name,role}`. **Corrected this run** — API_SPEC now lists `email`. The FE `User` type / store ignores it for the redirect; only `role` is used. |
