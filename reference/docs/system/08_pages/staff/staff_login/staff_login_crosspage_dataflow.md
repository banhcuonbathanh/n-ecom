# Staff Login — Cross-Page Data Flow (the auth session, after `/login` mints it)

> **What this is:** the **cross-page** companion to [staff_login.md](staff_login.md).
> That file answers *"what is on the login page?"* — this one answers the next question:
> **once `POST /auth/login` succeeds, how does the auth session live across the other pages
> and devices that outlive it?**
>
> The handoff here is the **AUTH SESSION**, not an order. Login mints exactly two credentials:
> an **access token** (JWT, memory only, 24 h) and a **refresh_token httpOnly cookie** (30 d,
> path-scoped to `/api/v1/auth`). Every authenticated page in the app depends on one or both.
>
> Status: ✅ implemented. Traced from source on branch `experience_claude.md_system_1`:
> [`fe/src/app/(auth)/login/page.tsx`](../../../../../fe/src/app/(auth)/login/page.tsx) ·
> [`fe/src/features/auth/auth.store.ts`](../../../../../fe/src/features/auth/auth.store.ts) ·
> [`fe/src/features/auth/auth.api.ts`](../../../../../fe/src/features/auth/auth.api.ts) ·
> [`fe/src/lib/api-client.ts`](../../../../../fe/src/lib/api-client.ts) ·
> [`fe/src/types/auth.ts`](../../../../../fe/src/types/auth.ts) ·
> [`fe/src/components/guards/AuthGuard.tsx`](../../../../../fe/src/components/guards/AuthGuard.tsx) ·
> [`fe/src/components/guards/RoleGuard.tsx`](../../../../../fe/src/components/guards/RoleGuard.tsx) ·
> [`be/internal/handler/auth_handler.go`](../../../../../be/internal/handler/auth_handler.go) ·
> [`be/internal/middleware/auth.go`](../../../../../be/internal/middleware/auth.go) ·
> [`be/pkg/jwt/jwt.go`](../../../../../be/pkg/jwt/jwt.go)
>
> Siblings: [staff_login.md](staff_login.md) · [staff_login_be.md](staff_login_be.md) ·
> [staff_login_loading.md](staff_login_loading.md) · [SCENARIO_STAFF_LOGIN.md](SCENARIO_STAFF_LOGIN.md) ·
> [LOGIN_BUGS.md](LOGIN_BUGS.md)

---

## 0. The whole picture on one diagram

```
   ┌───────────────────────── ONE STAFF BROWSER ─────────────────────────────────────────┐
   │                                                                                       │
   │   /login  ──POST /auth/login──▶  200 OK                                               │
   │       │                         { access_token, user{ id, username, full_name, role } }│
   │       │                                                                               │
   │       │  ① setAuth(user, access_token)  ──▶  ░ Zustand memory (NO persist)           │
   │       │  ② refresh_token cookie  ──────────▶  ▓ httpOnly cookie, path=/api/v1/auth   │
   │       │  ③ router.push(redirectByRole[role])                                         │
   │       │                                                                               │
   │       ▼                                                                               │
   │  ┌────────────────────────────────────────────────────────────────────────────────┐  │
   │  │              ░ Zustand auth store  (in-memory hub)                              │  │
   │  │  user { id, username, full_name, role, is_active }  accessToken: string|null   │  │
   │  └──────┬─────────────────────────────────────────────────────────────────────────┘  │
   │         │                                                                             │
   │  reads  │  every axios request ──▶ api-client.ts request interceptor                 │
   │         │     IF accessToken  ──▶ Authorization: Bearer <token>                      │
   │         │                                                                             │
   │  reads  │  AuthGuard.tsx: if !user → call GET /auth/me → setAuth or push('/login')   │
   │  reads  │  RoleGuard.tsx: roleValue = Role[user.role.toUpperCase()] → < minRole?     │
   │         │                     → "Không có quyền truy cập trang này"                  │
   │         │                                                                             │
   │  ▓ httpOnly cookie  (survives F5, new tab, 30 d)                                     │
   │       │                                                                               │
   │       └──▶ POST /auth/refresh  ──▶  new access_token  ──▶  setAccessToken()          │
   │       └──▶ POST /auth/logout   ──▶  revoke session + ClearRefreshCookie              │
   │                                                                                       │
   └───────────────────────────────────────────────────────────────────────────────────────┘

   LEGEND
     ░ memory — wiped by F5 / new tab / window close
     ▓ httpOnly cookie — survives F5; cleared only by logout or 30-day TTL
```

---

## 1. The two credentials login leaves behind

`POST /auth/login` succeeds and `auth_handler.go:43-60` emits exactly two credentials. They have
different lifetimes, different scopes, and are read by different parts of the app.

### 1.1 — The access token (memory, 24 h)

Written by `login/page.tsx:47`:

```ts
const { user, access_token } = await login(values.username, values.password)
setAuth(user, access_token)                            // login/page.tsx:47
```

`setAuth` calls `set({ user, accessToken })` in `auth.store.ts:15` — **no** `persist` middleware,
**no** localStorage. The token lives exclusively in Zustand's in-memory store.

Every outgoing API request reads it via the request interceptor at `api-client.ts:11-14`:

```ts
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

The BE validates it in `middleware/auth.go:34-66` (`AuthRequired`): extracts the Bearer header,
calls `jwtpkg.ParseToken`, then checks `is_active` from the Redis cache (`auth:staff:<id>`, 5 min
TTL) — the cache was proactively warmed during login (`auth_service.go:135`).

TTL: default 24 h, overridable via `JWT_ACCESS_TTL` env (`jwt.go:31-38`).

### 1.2 — The refresh_token cookie (httpOnly, 30 d)

Written by `middleware.SetRefreshCookie(c, result.RefreshToken)` at `auth_handler.go:43`:

```go
// SetRefreshCookie — auth.go:101-105
c.SetCookie("refresh_token", rawToken, maxAge, "/api/v1/auth", "", secure, true)
//                                             ^^^^^^^^^^^^^^ path-scoped
//                                                                         ^^^^ httpOnly
```

Cookie attributes (`auth.go:101-105`):
- Name: `refresh_token`
- Path: `/api/v1/auth` — sent **only** to `/api/v1/auth/*` (refresh, logout), never leaked to data
  endpoints.
- `httpOnly=true` — JS cannot read it; XSS cannot steal it.
- `maxAge` = `RefreshTTL()` = `JWT_REFRESH_TTL` env or 30 days (`jwt.go:40-48`).
- `secure` = true only when `request.TLS != nil || X-Forwarded-Proto == "https"` (allows plain
  HTTP in integration tests).

> ⚠️ FLAG (from `staff_login_be.md` Flag 4): `SetRefreshCookie`'s comment claims `SameSite=Strict`
> (`auth.go:98`) but `c.SetCookie(...)` does not pass a `SameSite` argument — Gin emits no
> `SameSite` attribute. ❓ UNVERIFIED whether a global default is applied elsewhere. If not,
> SameSite is browser-default (Lax in modern browsers).

---

## 2. The moment of handoff — what login leaves behind and who picks it up

```
   POST /auth/login  ──▶  200 OK

       ① setAuth(user, access_token)          writes ░ Zustand auth.store
       ② Set-Cookie: refresh_token=<raw>      writes ▓ httpOnly cookie
       ③ router.push(redirectByRole[role])    navigates away from /login
```

The redirect table is defined at `login/page.tsx:20-26`:

```ts
const redirectByRole: Record<string, string> = {
  chef:     '/kds',
  cashier:  '/pos',
  manager:  '/admin',
  admin:    '/admin',
  customer: '/menu',
}
```

Each downstream route receives the auth store already populated — no second login. The flow is
synchronous: `setAuth` runs before `router.push`, so the next page mounts with a non-null `user`.

| Role | Home route | Guard that checks it |
|---|---|---|
| `chef` | `/kds` | `AuthGuard` (any staff), `RoleGuard(minRole=CHEF)` ❓ UNVERIFIED |
| `cashier` | `/pos` | `AuthGuard`, `RoleGuard(minRole=CASHIER)` ❓ UNVERIFIED |
| `manager` | `/admin` | `AuthGuard`, `RoleGuard(minRole=MANAGER)` ❓ UNVERIFIED |
| `admin` | `/admin` | `AuthGuard`, `RoleGuard(minRole=MANAGER)` ❓ UNVERIFIED |
| `customer` | `/menu` | none (customer login is unusual — QR flow is the normal path) |

> Role values from `types/auth.ts:1-9`: `CUSTOMER=1, CHEF=2, CASHIER=3, MANAGER=4, ADMIN=5`.
> Exact `minRole` values used on each layout are ❓ UNVERIFIED (would require reading each layout
> file). The RBAC hierarchy → [BUSINESS_RULES §1 RBAC](../../02_spec/BUSINESS_RULES.md).

---

## 3. AuthGuard — the session rehydration gate

Every protected page wraps its content in `<AuthGuard>` (`fe/src/components/guards/AuthGuard.tsx`).
This is the mechanism that bridges a cold-load (where `accessToken` is `null`) to a valid session
via the refresh cookie.

```
   PAGE MOUNTS (e.g. /kds after F5)
        │
        ├─ user != null (memory still warm)?  ──▶ render children immediately
        │
        └─ user == null  ──▶ AuthGuard effect (AuthGuard.tsx:14-21):
               attempted.current = true
               call GET /auth/me
                    │
                    ├─ 200 OK  ──▶ setAuth(u, accessToken ?? '')   ──▶ render children
                    │               (access token already in memory from interceptor refresh)
                    │
                    └─ error  ──▶ router.push('/login')
```

`GET /auth/me` itself requires a valid Bearer token. If `accessToken` is null (after F5), the
request interceptor sends no `Authorization` header, the BE returns `401`, and the **response
interceptor** (`api-client.ts:19-58`) fires the token-refresh sequence (see §4) before the
`getMe()` call retries. In other words: F5 → `AuthGuard` calls `GET /auth/me` → interceptor
detects 401 → calls `POST /auth/refresh` using the cookie → new access token → `GET /auth/me`
retries → success → `setAuth` → page renders.

`AuthGuard` renders `null` while `user == null` (`AuthGuard.tsx:23`), preventing a flash of
unauthenticated content.

---

## 4. The 401 / token-refresh flow (the interceptor)

The response interceptor at `api-client.ts:19-58` handles every `401` from a non-auth endpoint:

```
   ANY REQUEST  ──▶  401 Unauthorized (access token expired or missing)
        │
        ├─ url includes /auth/login or /auth/register?  ──▶ reject (don't retry login)
        │
        ├─ sub == 'guest'?  ──▶ clearAuth() + redirect /menu  (guest JWT: QR flow, not staff)
        │                                                        (api-client.ts:27-35)
        │
        └─ staff 401 (NOT _retry already):
               original._retry = true
               if !isRefreshing:
                   isRefreshing = true
                   POST /auth/refresh  ──▶  (cookie sent automatically, path-scoped)
                        │
                        ├─ 200 { data: { access_token } }
                        │    setAccessToken(data.data.access_token)   (api-client.ts:44)
                        │    isRefreshing = false
                        │    retry original request
                        │
                        └─ error  ──▶  clearAuth()
                                        is guest context (tableId set)?
                                            yes  ──▶ redirect /menu
                                            no   ──▶ redirect /login  (api-client.ts:49)
```

The `isRefreshing` flag (`api-client.ts:17`) is a module-level boolean. It prevents concurrent
refresh races but does **not** queue the inflight requests — if a second request fires during
refresh, it is retried blindly after the first refresh resolves (`api-client.ts:55`).

`POST /auth/refresh` on the BE (`auth_handler.go:65-81`):
1. `RefreshTokenFromCookie(c)` reads the `refresh_token` cookie (`middleware/auth.go:90-96`).
2. `svc.Refresh(ctx, raw)` verifies the raw token's SHA-256 hash against `refresh_tokens` table,
   checks it is not expired, updates `last_used_at`.
3. Returns a new `access_token` (24 h JWT). The refresh token itself is **not** rotated — the same
   cookie stays until logout or 30-day TTL.

---

## 5. RoleGuard — horizontal access control on authenticated pages

After `AuthGuard` ensures `user != null`, pages that require a minimum role wrap content in
`<RoleGuard minRole={Role.X}>` (`fe/src/components/guards/RoleGuard.tsx`):

```ts
// RoleGuard.tsx:10-24
const roleValue = user
  ? (Role[user.role.toUpperCase() as keyof typeof Role] ?? 0)
  : 0

if (roleValue < minRole) {
  return <div …>Không có quyền truy cập trang này</div>
}
return <>{children}</>
```

`Role` enum values (from `types/auth.ts:1-9`): `CUSTOMER=1 · CHEF=2 · CASHIER=3 · MANAGER=4 · ADMIN=5`.

RoleGuard is **purely in-memory** — it reads `user.role` from the Zustand store that login
populated. It makes no network call. The BE enforces the same RBAC with `authMW` + role-check
middleware; RoleGuard is the FE defence-in-depth layer only.

---

## 6. F5 / new tab — what survives, what is lost

```
   F5 (hard refresh) or new tab:
   ┌──────────────────────────────────────────────────────────────────┐
   │  ░ Zustand auth store  →  wiped  (user=null, accessToken=null)   │
   │  ▓ refresh_token cookie → SURVIVES  (httpOnly, set by BE)        │
   └──────────────────────────────────────────────────────────────────┘

   What happens next (for a protected page):
     1. Page mounts, AuthGuard sees user=null → calls GET /auth/me
     2. api-client request interceptor: accessToken=null → no Authorization header
     3. BE returns 401
     4. api-client response interceptor: POST /auth/refresh (cookie sent automatically)
     5. New access_token returned → setAccessToken() writes back to ░ memory
     6. GET /auth/me retried with new token → 200 OK → setAuth(user, token)
     7. AuthGuard renders children — page appears, no visible re-login
```

The key insight: **the cookie is the persistence layer**. In-memory access tokens are ephemeral by
design (`MASTER_v1.2.md §6` rule: never store tokens in localStorage). The cookie is what lets
`POST /auth/refresh` succeed silently, making F5 feel instant to the user.

A new tab behaves identically to F5 — cookies are shared across tabs in the same origin; the
Zustand store is not.

---

## 7. Logout — the reverse flow

The FE calls `logout()` from `auth.api.ts:12-13`:

```ts
export const logout = (): Promise<void> =>
  api.post('/auth/logout').then(r => r.data)
```

BE `auth_handler.go:86-102`:
1. `RefreshTokenFromCookie(c)` extracts the cookie.
2. `svc.Logout(ctx, raw, staffID)` deletes the `refresh_tokens` row (revokes only THIS session;
   other sessions' refresh tokens remain valid — multi-device policy).
3. `middleware.ClearRefreshCookie(c)` (`auth.go:108-110`): sets `maxAge=-1` on the cookie,
   instructing the browser to delete it immediately.

After logout the FE should call `clearAuth()` on the store (sets `user=null, accessToken=null`).
❓ UNVERIFIED whether the logout call site (❓ location not read this session) calls `clearAuth()`
before or after `router.push('/login')`. If it only pushes, the store stays stale until the next
`AuthGuard` mount.

Additionally, logout invalidates the Redis `auth:staff:<id>` is_active cache via
`delIsActiveCache` (`auth_service.go:378-383`) so that any stale access token the user still holds
from another session will fail the `is_active` check on its next request.

```
   POST /auth/logout
       │
       ├─ BE: delete refresh_tokens row (this session only)
       ├─ BE: Set-Cookie: refresh_token=; maxAge=-1   (browser deletes cookie)
       ├─ BE: del auth:staff:<id>  (Redis — invalidates is_active cache)
       │
       FE should:
       └─ clearAuth()  (wipes ░ memory)
          router.push('/login')
```

---

## 8. Durability matrix — what survives what

| Datum | Lives in | Survives F5? | Survives new tab? | Survives 24 h? | Survives 30 d? | Scope |
|---|---|---|---|---|---|---|
| `user` (profile object) | ░ Zustand memory | ❌ | ❌ | ❌ | ❌ | single tab, until refresh |
| `accessToken` (JWT, 24 h) | ░ Zustand memory | ❌ | ❌ | ❌ (expires) | ❌ | single tab |
| `refresh_token` (httpOnly cookie, 30 d) | ▓ browser cookie store | ✅ | ✅ (shared) | ✅ | ❌ (expires) | same origin, all tabs |
| staff row + refresh_tokens table | BE (MySQL) | ✅ | ✅ | ✅ | ✅ (until logout/eviction) | all devices |
| `auth:staff:<id>` is_active cache | BE (Redis, 5 min TTL) | ✅ | ✅ | ✅ | ✅ | BE only |
| `ratelimit:login:<ip>` | BE (Redis, 60 s TTL) | ✅ | ✅ | ✅ (until TTL) | — | BE only |

> **The mental model in one line:** the access token is ephemeral (memory, 24 h) — lose it on F5;
> the refresh cookie is durable (httpOnly, 30 d) — F5 is transparent because the interceptor
> silently mints a new access token from the cookie before any guarded page notices.

---

## 9. What this page does NOT cross-page-share

The following things live only for the duration of the `/login` page and are discarded on redirect:

- The `username` and `password` form values — React Hook Form local state, gone on unmount.
- The `isSubmitting` flag — same.
- The `setError` state — same.

There is no SSE, no WebSocket, no localStorage written, no cart state touched. Login's
cross-page footprint is exactly the two credentials described in §1.

---

## 10. Source & rule map

| Topic | Source of truth |
|---|---|
| Login page zones + form | [staff_login.md](staff_login.md) |
| BE endpoint detail (handler→service→repo→SQL) | [staff_login_be.md](staff_login_be.md) |
| Loading / in-flight states | [staff_login_loading.md](staff_login_loading.md) |
| Login narrative scenario | [SCENARIO_STAFF_LOGIN.md](SCENARIO_STAFF_LOGIN.md) |
| Known code bugs (password min mismatch, dead error codes) | [LOGIN_BUGS.md](LOGIN_BUGS.md) |
| Token TTLs, RBAC hierarchy, auth rules | [../../02_spec/BUSINESS_RULES.md](../../02_spec/BUSINESS_RULES.md) |
| `User` type shape | [`fe/src/types/auth.ts`](../../../../../fe/src/types/auth.ts) |
| Zustand auth store (fields, no persist) | [`fe/src/features/auth/auth.store.ts`](../../../../../fe/src/features/auth/auth.store.ts) |
| Axios interceptor (token attach + 401 refresh) | [`fe/src/lib/api-client.ts`](../../../../../fe/src/lib/api-client.ts) |
| AuthGuard (session rehydration) | [`fe/src/components/guards/AuthGuard.tsx`](../../../../../fe/src/components/guards/AuthGuard.tsx) |
| RoleGuard (horizontal access control) | [`fe/src/components/guards/RoleGuard.tsx`](../../../../../fe/src/components/guards/RoleGuard.tsx) |
| SetRefreshCookie / ClearRefreshCookie / RefreshTokenFromCookie | [`be/internal/middleware/auth.go`](../../../../../be/internal/middleware/auth.go) |
| AccessTTL / RefreshTTL / ParseToken | [`be/pkg/jwt/jwt.go`](../../../../../be/pkg/jwt/jwt.go) |
| Refresh + Logout handlers | [`be/internal/handler/auth_handler.go`](../../../../../be/internal/handler/auth_handler.go) |
