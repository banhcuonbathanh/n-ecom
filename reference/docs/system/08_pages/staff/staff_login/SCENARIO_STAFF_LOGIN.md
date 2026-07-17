# Scenario — Staff Sign-In on the POS Tablet

> **TL;DR:** ✅ implemented · one concrete run through `/login` end-to-end — a cashier starting her
> shift, a wrong-password fumble, success, and an F5 mid-shift — grounded in the single endpoint
> this page calls (`POST /auth/login`). Traced on branch `experience_claude.md_system_1`.
> Sources: `fe/src/app/(auth)/login/page.tsx` · `fe/src/features/auth/auth.{api,store}.ts` ·
> `be/internal/handler/auth_handler.go` · `be/internal/service/auth_service.go` ·
> `be/internal/middleware/auth.go` · `be/pkg/jwt/jwt.go`.
>
> Endpoint internals → [staff_login_be.md](staff_login_be.md) ·
> Session across pages/devices → [staff_login_crosspage_dataflow.md](staff_login_crosspage_dataflow.md) ·
> In-flight UI → [staff_login_loading.md](staff_login_loading.md) ·
> Error-message caveats → [LOGIN_BUGS.md](LOGIN_BUGS.md)

---

## Cast

- **Hương** — cashier. Knows her username (`cashier`) and password. Her role routes her to `/pos`.
- **The POS tablet** — a shared browser at the front counter. Whoever logged in last is gone (auth
  store is memory-only — no persisted session).
- **The BE** — Gin server; mints the JWT + refresh cookie, throttles by IP, caches `is_active`.

## Setting

11:00, start of the lunch shift. The tablet shows `/login` (the previous user's in-memory session
was wiped by a refresh at close last night). Hương needs to be on the POS board before the first
QR order lands.

---

## Timeline

**11:00 — Hương opens `/login`.** Centered card, two fields, "Đăng nhập" button. No spinner, no
data fetch — the page renders instantly (it calls nothing on mount; see
[staff_login_loading.md](staff_login_loading.md)). The auth store has no `user`, so the
already-logged-in redirect effect (`login/page.tsx:33-35`) does nothing.

**11:00:15 — She fat-fingers the password.** RHF+Zod checks client-side first: `username ≥ 3`,
`password ≥ 6` (`login/page.tsx:14-17`). Both pass, so the form submits `POST /auth/login`
(`auth.api.ts:9-10`). The BE runs the gauntlet (`auth_service.go:69-142`): rate-limit OK →
`GetStaffByUsername('cashier')` finds the row → `bcrypt.Verify` **fails** → `ErrInvalidCredentials`
→ `401 INVALID_CREDENTIALS`. The FE maps that code (`login/page.tsx:52-53`) to an inline error
under the password field: **"Tên đăng nhập hoặc mật khẩu không đúng."** No oracle — a wrong
*username* would show the exact same message.

**11:00:30 — She retypes correctly and submits.** This time:
1. **Rate limit** — `INCR ratelimit:login:<ip>` (`auth_service.go:351`); still well under 5/min, so
   it passes. (Had she botched it 5+ times in a minute, beat would end in `429 RATE_LIMIT_EXCEEDED`
   — which the FE currently shows only as a generic error, [LOGIN_BUGS.md](LOGIN_BUGS.md) Bug 2.)
2. **Lookup + verify** — `GetStaffByUsername` → `bcrypt.Verify` succeeds.
3. **is_active** — checked *after* bcrypt (`:90`, avoids a timing oracle); she's active.
4. **Mint tokens** — access JWT (`sub=<id>`, `role=cashier`, 24 h, `jwt.go:51-69`) returned in the
   body; refresh token (32 random bytes) → its SHA-256 hash persisted, the raw token set as the
   httpOnly `refresh_token` cookie scoped to `/api/v1/auth` (`auth.go:101-105`).
5. **Session bookkeeping** — `CountActiveSessionsByStaff`; if she already had 5 sessions the oldest
   is evicted (`:104-112`). `SET auth:staff:<id>="active"` TTL 5 min (`:135`) so her first POS
   request hits cache, not MySQL.

**11:00:31 — Redirect.** The FE receives `{ user{ id,username,full_name,role,email }, access_token }`,
calls `setAuth(user, token)` into Zustand **memory** (`login/page.tsx:47`, `auth.store.ts:15`), and
routes by role: `cashier → /pos` (`redirectByRole`, `login/page.tsx:20-26,48`). She's on the board.

**13:40 — Mid-shift F5.** Hương reloads to clear a stuck modal. The **in-memory access token is
gone** (no persist), but the **refresh cookie survives** the reload. The axios interceptor /
AuthGuard re-mints a fresh access token via `POST /auth/refresh` (cookie-only) without her
re-typing anything — or, if that path isn't wired for her route, she bounces back to `/login`. The
durability detail (what survives F5 vs new tab vs 24 h vs 30 d) lives in
[staff_login_crosspage_dataflow.md](staff_login_crosspage_dataflow.md).

---

## Under the Hood

- **A · Cross-component:** N/A — `/login` is a single RHF form; no widgets share a store. The only
  state crossing a boundary is the *write* to the auth store on success.
- **B · Cross-page:** the session minted here is the auth every other staff/admin page consumes
  (access token in memory + refresh cookie). Full map →
  [staff_login_crosspage_dataflow.md](staff_login_crosspage_dataflow.md).
- **C · FE→BE send:** exactly one call — `POST /auth/login { username, password }`
  ([staff_login_be.md](staff_login_be.md) §Per-Endpoint Detail).
- **D · BE→FE receive:** `{ access_token, user{id,username,full_name,role,email} }` + a `Set-Cookie:
  refresh_token`. No realtime on this page.
- **E · Loading & caching:** no read-cache; the only "loading" is the disabled "Đang đăng nhập…"
  button ([staff_login_loading.md](staff_login_loading.md)). The endpoint *writes* two Redis keys
  (`ratelimit:login:<ip>`, `auth:staff:<id>`), both fail-open.
- **F · Monitoring:** failed logins surface as `401`/`429` in the access log; the rate-limit counter
  is the throttle signal. No dedicated dashboard.

**Mental model:** `/login` is a one-shot token vending machine — one POST in, a memory token + a
cookie out, then the role decides which door it opens.

---

## Aside — the dev shortcut

`/dev-login?role=cashier` calls the **same** `POST /auth/login` with a seeded username and the
hardcoded password `Admin@123` (`dev-login/page.tsx:31`), then auto-redirects — a full-screen
spinner instead of a form. Dev-only; same BE path, same token mint.
