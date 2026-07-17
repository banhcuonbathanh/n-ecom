# Register — `/register` · Backend View

> **TL;DR:** the single BE endpoint the register page calls, traced handler → service →
> repository → SQL, with auth, error behaviour and flags. Traced from source on branch
> `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (route) · `be/internal/handler/auth_handler.go` ·
> `be/internal/service/auth_service.go` · `be/internal/repository/auth_repo.go`.
>
> FE view + zones → [staff_register.md](staff_register.md) ·
> Auth/JWT rules → [../../../02_spec/BUSINESS_RULES.md §5](../../../02_spec/BUSINESS_RULES.md) ·
> RBAC roles → [../../../02_spec/BUSINESS_RULES.md §1](../../../02_spec/BUSINESS_RULES.md) ·
> **Code bugs → [REGISTER_BUGS.md](REGISTER_BUGS.md)**

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `POST /auth/register` | **public** | `authH.Register` (`auth_handler.go:142`) | `AuthService.Register` (`auth_service.go:205`) | `CreateStaffForRegister` raw SQL INSERT (`auth_repo.go:86`) + `GetStaffByUsername`/`GetStaffByID` | — (no cache) |

Route registration: `be/cmd/server/main.go:156` — `authR.POST("/register", authH.Register)`, in the
`/api/v1/auth` group (`main.go:154`). It sits **outside** the `protected` sub-group (`main.go:159-164`),
so it carries **no `authMW`**.

This page makes **exactly one BE call** (one write). No reads on mount; no Redis; no realtime.

---

## Auth Model on This Page

- **Fully public.** `POST /auth/register` has no `authMW` and no role gate (`main.go:156`). Any
  unauthenticated caller can create an account.
- **The account created is a STAFF `cashier`, not a customer.** The service hardcodes
  `role="cashier"` and `is_active=1` (`auth_service.go:219`, `auth_repo.go:87-88`) — there is no
  role parameter and no email-verification / approval step. On success the caller is immediately
  issued a staff access token + refresh cookie and is logged in.
- **No self-service `customer` registration exists on this path.** The FE redirect map includes a
  `customer: '/menu'` branch (`register/page.tsx:23-29`), but BE never returns `role:"customer"`
  here, so that branch is dead — every successful register routes to `/pos` (cashier).
  See [REGISTER_BUGS.md](REGISTER_BUGS.md) Bug 1.
- Per [DB_SCHEMA.md §Auth](../../../02_spec/DB_SCHEMA.md): `staff.role` ENUM default is `cashier`,
  matching the hardcoded value. Staff accounts are otherwise created by managers via `/admin/staff`
  (`StaffService` — separate path), which is the documented norm.

---

## Per-Endpoint Detail

### 1 · `POST /auth/register`

**FE sends** (`register/page.tsx:46-50` → `auth.api.ts:26-30`): `{ username, password }` only.
The form also collects `confirm` (password re-entry) but it is **client-only** — Zod checks
`password === confirm` (`register/page.tsx:13-20`) and the value is never sent. There is **no
`full_name`** field on the form or in the request body.

**Handler** `Register` (`auth_handler.go:142-174`):
- Binds `registerRequest{ Username required,min=3 · Password required,min=6 }`
  (`auth_handler.go:135-138`). Bind failure → `400 INVALID_INPUT` (`auth_handler.go:144-147`).
- Calls `svc.Register(ctx, req.Username, req.Password, c.ClientIP(), c.GetHeader("User-Agent"))`
  (`auth_handler.go:150`).
- On success: `SetRefreshCookie` (httpOnly refresh token cookie, `auth_handler.go:156`) then
  **`201 Created`** with `data.access_token` + `data.user{ id, username, full_name, role, email }`
  (`auth_handler.go:162-173`). Note the user object omits `phone` (Login includes it — see Flag 4).

**Service** `Register` (`auth_service.go:205-225`):
1. `GetStaffByUsername(username)` — if it returns no error (row exists) → `ErrUsernameTaken`
   (`auth_service.go:206-209`); any non-`sql.ErrNoRows` error → wrapped 500.
2. `bcryptpkg.Hash(password)` (`auth_service.go:214`).
3. `CreateStaffForRegister(newUUID(), username, hash, username, "cashier")` — **`full_name` is set
   to the username** and **`role` is hardcoded `"cashier"`** (`auth_service.go:219`).
4. `issueTokens(ctx, staff, ip, ua)` (`auth_service.go:224`) — generates the access token
   (`jwtpkg.GenerateAccessToken`, `auth_service.go:229`), mints a refresh token, and enforces the
   **max-5-active-sessions** cap (delete oldest if at limit, `auth_service.go:236-244`).

**Repository** `CreateStaffForRegister` (`auth_repo.go:86-93`): a **raw SQL `INSERT`** (not a sqlc
query) —
`INSERT INTO staff (id, username, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())` — then re-reads the row via `GetStaffByID`. `is_active=1`
is baked into the SQL, so the account is usable immediately.

---

## Caching & Invalidation

None. The register flow neither reads nor writes Redis. The new `staff` row is not cached anywhere;
subsequent logins read it from MySQL via `GetStaffByUsername`.

---

## Error Behaviour

| Condition | Where | Result |
|---|---|---|
| Missing/short `username` or `password` | bind tags `min=3`/`min=6` (`auth_handler.go:136-137`) | `400 INVALID_INPUT` |
| Username already exists | `auth_service.go:206-208` → `ErrUsernameTaken` (`staff_service.go:33` = AppError 409 `USERNAME_TAKEN`) | `409 USERNAME_TAKEN` |
| bcrypt / DB failure | `auth_service.go:215-222` (wrapped `%w`) | `500` via `handleServiceError` |

**FE handling** (`register/page.tsx:51-59`): reads `err.response.data.error`; on `USERNAME_TAKEN`
sets an inline error on the `username` field ("Tên đăng nhập đã tồn tại"); any other code → generic
"Đã xảy ra lỗi, vui lòng thử lại" on the `confirm` field. The `USERNAME_TAKEN` match is correct
against the BE code. Zod blocks `password !== confirm` and the `min` lengths client-side before any
request is made.

---

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **Public endpoint mints an active `cashier` staff account** | `role` is hardcoded `"cashier"` + `is_active=1` with no approval/verification (`auth_service.go:219`, `auth_repo.go:87-88`). A public, unauthenticated `POST /auth/register` therefore grants POS/staff access to anyone. Security concern + FE/BE intent mismatch (FE's `customer:'/menu'` redirect is dead). → [REGISTER_BUGS.md](REGISTER_BUGS.md) Bug 1. |
| 2 | **`full_name` is set to the `username`** | The form has no name field; the service passes `username` as `full_name` (`auth_service.go:219`). So the created staff row's display name equals its login name until edited via `/admin/staff`. The FE wireframe in [staff_register.md](staff_register.md) shows a "Họ tên" field that the real `page.tsx` does not render — doc drift (refreshed this run). |
| 3 | **API_SPEC was stale** | `API_SPEC.md` claimed the request takes `full_name` and the response returns only `id`. Code: request is `{username, password}`; response is `201` + `{access_token, user{id,username,full_name,role,email}}` + a refresh cookie. Corrected this run (see Decision Log). |
| 4 | **Response omits `phone`** | The register user object serializes `id, username, full_name, role, email` (`auth_handler.go:166-171`) but not `phone`, whereas `Login`/`Me` include `phone` (`auth_handler.go:125-131`). Harmless for a fresh account (phone is NULL) but asymmetric. |
| 5 | **No rate limiting** | Like all `/auth` routes, register has no rate-limit middleware (`middleware/ratelimit.go` exists but is unwired in `main.go`). A public account-creation endpoint with no throttle is abusable — same gap noted for the catalog GETs in [customer_menu_be.md Flag 2](../../customer/customer_menu/customer_menu_be.md). |
| 6 | **`confirm` never reaches BE** | Password confirmation is a pure client-side Zod refinement (`register/page.tsx:17-20`); only `username`+`password` are POSTed. |
