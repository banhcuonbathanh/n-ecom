# Register — Cross-Page Data Flow

> **TL;DR:** ✅ implemented · what `/register` leaves behind once it redirects away. The page makes
> one write (`POST /auth/register`) that produces **three** artifacts with very different lifetimes:
> a **persistent `staff` row** in MySQL (outlives everything), an **httpOnly `refresh_token` cookie**
> (outlives the tab, ~refresh-TTL), and an **in-memory auth session** in Zustand (dies on F5). It
> then redirects by role — always to `/pos`, because the account is a cashier.
> Anchor: [staff_register_be.md](staff_register_be.md) · FE view: [staff_register.md](staff_register.md) ·
> loading: [staff_register_loading.md](staff_register_loading.md) · scenario: [SCENARIO_REGISTER.md](SCENARIO_REGISTER.md) ·
> **bug:** [REGISTER_BUGS.md](REGISTER_BUGS.md) (Bug 1 — the session minted here is a cashier).

---

## 0. The whole picture on one diagram

```
        /register page (mounted, transient)
                 │  POST /auth/register {username,password}
                 ▼
   ┌─────────────────────────  THE WIRE  ─────────────────────────┐
   │                                                              │
   ▼ (1) MySQL                 ▼ (2) httpOnly cookie     ▼ (3) JS memory
 staff row                   refresh_token              Zustand auth store
 role=cashier, is_active=1   path=/api/v1/auth          {user, accessToken}
 (PERMANENT)                 maxAge=RefreshTTL          (NO persist → dies on F5)
                             (survives tab close)
                 │
                 ▼ router.push(redirectByRole[role])  → always /pos (cashier)
        every downstream staff surface (POS, KDS shell, /admin if manager+)
        reads the in-memory accessToken for Authorization: Bearer
```

Three hubs, three lifetimes — this is the whole cross-page story of a register.

## 1. The moment of handoff — what this page leaves behind

On a successful submit (`register/page.tsx:46-50`):

1. **BE writes the durable row.** `AuthService.Register` → `CreateStaffForRegister` INSERTs a
   `staff` row with `role="cashier"`, `full_name=username`, `is_active=1`
   (`auth_service.go:219`, `auth_repo.go:87-88`). This is the **only artifact that truly outlives
   the session** — it is what lets the new user `/login` again later.
2. **BE sets the refresh cookie.** `SetRefreshCookie` writes `refresh_token` (httpOnly, `path=/api/v1/auth`,
   `maxAge=RefreshTTL`, `secure` only under TLS/`X-Forwarded-Proto=https`) (`auth_handler.go:156`,
   `middleware/auth.go:101-104`). It survives a tab close and is the basis for silent
   `POST /auth/refresh` later. JS cannot read it.
3. **FE writes the in-memory session.** `setAuth(newUser, access_token)` populates the Zustand
   store (`register/page.tsx:49`, `auth.store.ts:15`). The store has **no `persist` middleware**
   (`auth.store.ts:12-18`) — so the access token and user live in JS memory only.
4. **FE redirects.** `router.push(redirectByRole[newUser.role] ?? '/dashboard')`
   (`register/page.tsx:50`). Since BE always returns `cashier`, the landing page is always `/pos`.

## 2. Downstream surfaces — who reads what

| Surface | Reads | Notes |
|---|---|---|
| `/pos` (immediate redirect) | in-memory `accessToken` → `Authorization: Bearer` on every API call | the only landing page for a fresh register (cashier) |
| `/kds`, `/cashier/*`, `/admin/*` shells | same in-memory auth session + `RoleGuard` | a cashier passes the dashboard shell but is gated out of `/admin/*` (manager+) |
| `/login` (later, any device) | the **persistent `staff` row** | the durable outcome — the account can authenticate from anywhere after the in-memory session is gone |
| `POST /auth/refresh` | the `refresh_token` cookie | mints a new access token without re-login, until the cookie/TTL expires |

The access-token-in-memory-only rule is owned by
[BUSINESS_RULES §5 (JWT / Auth)](../../../02_spec/BUSINESS_RULES.md) — not restated here.

## 3. Reload (F5) / durability matrix

| Artifact | Survives redirect | Survives F5 / new tab | Survives tab close |
|---|---|---|---|
| `staff` row (MySQL) | ✅ | ✅ | ✅ (permanent) |
| `refresh_token` cookie | ✅ | ✅ | ✅ until `maxAge`/expiry |
| Zustand `{user, accessToken}` | ✅ (SPA nav) | ❌ wiped (no persist) | ❌ |

**Consequence:** after an F5 on `/pos`, the in-memory access token is gone. Whether the app
silently re-authenticates depends on a `/auth/refresh`-on-boot path reading the surviving cookie —
that behaviour is owned by the app shell / `api-client` interceptor, **not** by this page
(`❓ UNVERIFIED here` — see [staff_login.md] / the login BE doc when traced). What this page
guarantees is only the three writes above.

## 4. Source & rule map

- Handoff writes: `register/page.tsx:46-50` · `auth.store.ts:12-18` (no persist) ·
  `auth.api.ts:26-30`.
- BE durable row + cookie: `auth_service.go:205-225` · `auth_repo.go:86-93` ·
  `auth_handler.go:156,162-173` · `middleware/auth.go:101-104`.
- Cashier-only outcome (the cross-page identity): [REGISTER_BUGS.md](REGISTER_BUGS.md) Bug 1.
- Token lifetime rules: [BUSINESS_RULES §5](../../../02_spec/BUSINESS_RULES.md).
