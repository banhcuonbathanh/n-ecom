# Staff Login `/login` — Doc vs. Code (Detailed Audit)

> **Scope:** a read-only audit of the `staff_login` doc-set against the running FE/Go code on branch
> `experience_claude.md_system_1_test_iphon2_change_code`. Five axes attempted; **Area 2
> (cross-component dataflow) is N/A** — `/login` is a single RHF form, no shared store on the page
> (the doc-set itself says so). So **4 areas audited**: ① Component visuals · ③ Cross-page / auth
> session · ④ Loading · ⑤ FE⇄BE data model.
> **Read-only — no code and no docs were changed.** Produced by 4 parallel Sonnet agents (Area 3
> re-done by hand after its agent hit a session limit); every headline item was re-verified by the
> Opus orchestrator against source.
> **Verdict up front: no 🔴 doc-vs-code contradiction.** The set is a faithful, source-traced mirror
> (peer of `staff_register` / `staff_cashier_payment` / `customer_combo_detail`) — it documents the
> code *including* its known FE bugs. The substantive findings are (a) the doc-set was written on the
> old branch `experience_claude.md_system_1`, so all `main.go` route lines are stale **+13**; (b) two
> `❓ UNVERIFIED` claims now resolved — one of them surfacing that **`/kds` has no client-side guard at
> all**; (c) two doc-wording inaccuracies (SameSite, "AUTH_001 nowhere in be/"). Date: 2026-06-23.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Component visuals (`staff_login.md`) | Near-perfect; one wireframe conflation | 0 | 1 | 13 |
| ③ Cross-page / auth session (`_crosspage_dataflow.md`) | Highly accurate; 2 ❓ resolved (one is a real guard gap) | 0 | 2 | 3 |
| ④ Loading (`_loading.md`) | Accurate; one off-by-one | 0 | 1 | 14 |
| ⑤ FE⇄BE model (`_be.md` + `LOGIN_BUGS.md`) | Highly accurate; route lines stale, 2 wording fixes | 0 | 4 | 8 |
| **Total** | **Faithful set — no new 🔴** | **0** | **8** | **38** |

---

## 🔴 RAISE-MY-VOICE headline findings

**None — there is no hard doc-vs-code contradiction on this page.** Every endpoint, handler/service/SQL
step, store field, guard, and loading state the doc claims was confirmed against source. The items below
are the most important **🟡** findings (hand-verified), surfaced here because two of them resolve open
`❓ UNVERIFIED` questions and one is a genuine security observation:

1. **`/kds` has NO client-side guard — the doc's handoff table assumed one.** `_crosspage_dataflow.md`
   §2 lists `chef → /kds → AuthGuard (any staff), RoleGuard(minRole=CHEF) ❓ UNVERIFIED`. **Resolved:
   false.** `(dashboard)/layout.tsx:1-5` is *only* an `OrdersWSProvider`; `kds/page.tsx` /
   `kds/layout.tsx` contain **no `AuthGuard` and no `RoleGuard`** (grep → 0 hits). The KDS board has no
   client-side auth/role gate — it relies entirely on the api-client 401 interceptor
   (`api-client.ts:40-54`) firing once its first data query is rejected. By contrast the doc's *other*
   two ❓ guard assumptions are **correct**: `/pos` = `AuthGuard` + `RoleGuard(minRole=CASHIER)`
   (`pos/page.tsx:29-30`), `/admin` = `AuthGuard` + `RoleGuard(minRole=MANAGER)`
   (`(dashboard)/admin/layout.tsx:29-30`), `/cashier/payment/[id]` = same as POS
   (`cashier/payment/[id]/page.tsx:39-40`). **Same gap already logged on the `staff_kds` run.**
2. **Logout is wired only on the *customer* surface — no staff logout button exists.** The doc §7
   leaves `❓ UNVERIFIED whether the logout call site calls clearAuth()`. **Resolved:** the sole caller
   of `logout()` (`auth.api.ts:12-13`) is the customer `MenuHeader.handleLogout`
   (`features/menu/components/MenuHeader.tsx:15-22`), which calls `await logout()` then `clearAuth()`
   at `:21` (try/catch, no `router.push`). Grep finds **no** logout call on `/pos`, `/kds`, `/admin`,
   or `/cashier`. So the doc's staff-logout narrative is theoretical today — a staff member has no UI
   to end their session; only the 30-day cookie TTL or a new login (max-5-session eviction,
   `auth_service.go:104-112`) clears it.
3. **`LOGIN_BUGS.md` Bug 2 overstates: "`AUTH_001` is referenced nowhere in `be/`" is inaccurate.**
   `AUTH_001` **is** emitted by the auth middleware for *protected* routes —
   `middleware/auth.go:37,45,47` (missing / expired / invalid Bearer). The FE login error-map branch
   on `AUTH_001` (`login/page.tsx:52`) is still **dead** because `POST /auth/login` itself never
   returns it — but the doc should say "never emitted *by the login endpoint*", not "nowhere in be/".
4. **`SetRefreshCookie` SameSite — comment says `Strict`, code sets nothing (`_be.md` Flag 4 resolved).**
   `middleware/auth.go:98` comment claims `SameSite=Strict`; the call `c.SetCookie(...)` at `:104` has
   no SameSite parameter, and a grep of `be/` for `SameSite` returns **only that comment** — no global
   default is configured. So the refresh cookie's SameSite is browser-default (Lax), not Strict. Real,
   low-impact gap; the comment is a documentation lie.

---

## Dead / unreachable code found

- **`login/page.tsx:52` — the `code === 'AUTH_001'` branch is dead for login responses.** `POST
  /auth/login` only ever returns `INVALID_CREDENTIALS` / `ACCOUNT_DISABLED` / `RATE_LIMIT_EXCEEDED` /
  `INVALID_INPUT` (`errors.go:24-26` + handler bind). The `AUTH_001` side of the OR only matches via
  the parallel `INVALID_CREDENTIALS` check → it never independently fires. (`AUTH_001` is a real code,
  but it belongs to `middleware/auth.go`, not login.)
- **`redirectByRole[...] ?? '/dashboard'` fallback (`login/page.tsx:34,48`)** — the role map covers all
  five defined roles; `/dashboard` is an unreachable fallback for an undefined role string. Harmless;
  the route likely does not exist.
- No dead Go code found in the login path.

---

## Area ① — Component visuals

**Verdict:** the wireframe + Zones table in `staff_login.md` match the real JSX almost line-for-line.
Heading, sub-heading, both field labels, the username Zod error, the submit-button label + the
`isSubmitting → "Đang đăng nhập…"` swap, the register link, the `setAuth` write, and the full
`redirectByRole` map all confirmed.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Password inline-error slot | Wireframe draws "Tên đăng nhập hoặc mật khẩu không đúng" as the **inline Zod error** under Mật khẩu | That message is the **API error** set via `setError('password', …)` (`login/page.tsx:53`), not a Zod error. The real Zod password message is `'Tối thiểu 6 ký tự'` (`login/page.tsx:16`) and is **never drawn** in the wireframe | 🟡 | Wireframe should show the Zod min-6 message as a distinct ⚠ row and label the API-error row separately |
| In-flight label swap | Implied by "Đăng nhập" only | `{isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}` (`login/page.tsx:107`) | 🟢 | Code correct; doc silently omits the swap |
| Card heading / sub-heading | "Quán Bánh Cuốn" / "Đăng nhập để tiếp tục" | `page.tsx:65-67` / `:68` | 🟢 | Match |
| Field labels | "Tên đăng nhập" / "Mật khẩu" | `page.tsx:72-74` / `:87` | 🟢 | Match |
| Username Zod error | "Tối thiểu 3 ký tự" | `z.string().min(3,'Tối thiểu 3 ký tự')` `page.tsx:15` | 🟢 | Match |
| Zod min values | `username ≥ 3`, `password ≥ 6` | `page.tsx:15-16` | 🟢 | Match |
| Register link | "Chưa có tài khoản? Đăng ký" → `/register` | `<Link href="/register">` `page.tsx:112-115` | 🟢 | Match |
| Submit → login → setAuth | `auth.api.login` → `POST /auth/login` → `setAuth` | `page.tsx:46-47`, `auth.api.ts:9-10` | 🟢 | Match |
| Role redirect map | chef→/kds, cashier→/pos, manager/admin→/admin, customer→/menu | `redirectByRole` `page.tsx:20-26` | 🟢 | Match |
| Already-logged-in redirect | store has `user` → immediate role redirect | `useEffect` `page.tsx:33-35` | 🟢 | Match |
| Error map: INVALID_CREDENTIALS/ACCOUNT_DISABLED/generic | mapped to 3 messages | `page.tsx:52-58` | 🟢 | Match (dead `AUTH_001` branch noted above) |

**Verified-matching:** card layout, atom usage (`Input`/`Label`/`Button`), the `noValidate` form,
data source (RHF + `zodResolver`).

---

## Area ③ — Cross-page dataflow / the auth session

**Verdict:** the most load-bearing doc in the set, and it holds up. The two credentials (access token
in Zustand memory, refresh token in an httpOnly cookie), the request-interceptor Bearer attach, the
401→refresh→retry sequence, AuthGuard rehydration, RoleGuard, and the F5 durability matrix all match
source. Two `❓ UNVERIFIED` claims are now resolved (see headlines #1 and #2).

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `/kds` guard | `RoleGuard(minRole=CHEF)` ❓ UNVERIFIED | **No guard** — `(dashboard)/layout.tsx:1-5` is OrdersWSProvider only; `kds/page.tsx`/`kds/layout.tsx` have no `AuthGuard`/`RoleGuard` | 🟡 | Resolve doc ❓ → "/kds: no client-side guard; relies on api-client 401". Security: consider adding `RoleGuard(CHEF)` (separate ALIGNed task) |
| logout call site + `clearAuth` | ❓ UNVERIFIED whether it calls `clearAuth()` | Sole caller is customer `MenuHeader.handleLogout` (`MenuHeader.tsx:15-22`) — calls `clearAuth()` at `:21` after `logout()`; no staff logout button exists | 🟡 | Resolve doc ❓; note no staff-surface logout |
| `/pos` guard | `RoleGuard(minRole=CASHIER)` ❓ UNVERIFIED | **Confirmed** `AuthGuard`+`RoleGuard(minRole=CASHIER)` `pos/page.tsx:29-30` | 🟢 | Drop the ❓ — doc assumption correct |
| `/admin` guard | `RoleGuard(minRole=MANAGER)` ❓ UNVERIFIED | **Confirmed** `AuthGuard`+`RoleGuard(minRole=MANAGER)` `(dashboard)/admin/layout.tsx:29-30` | 🟢 | Drop the ❓ — doc assumption correct |
| auth store (no persist) | `setAuth` → `set({user,accessToken})`, no localStorage | `auth.store.ts:12-18` — no `persist`, exactly `{user,accessToken}` + setAuth/setAccessToken/clearAuth | 🟢 | Match |
| 401 / refresh interceptor | request `:11-14`; guest `sub` branch; refresh `:43-44`; redirect `:49`; retry `:55`; `isRefreshing` `:17` | `api-client.ts` — request `:11-15`, guest sub `:27-37`, refresh `:43-44`, redirect `:49`, retry `:55`, `isRefreshing` `:17` (request block off by 1 line) | 🟢 | Minor line drift only |
| AuthGuard rehydration | effect `:14-21`, `getMe`→`setAuth`, catch→`/login`, null while `!user` `:23` | `AuthGuard.tsx:14-21,23` — exact | 🟢 | Match |
| RoleGuard | `:10-24`, `Role[user.role.toUpperCase()] ?? 0`, "Không có quyền truy cập trang này" | `RoleGuard.tsx:10-24` — exact | 🟢 | Match |
| Role enum / User type | `types/auth.ts:1-9`, CUSTOMER=1…ADMIN=5; `User` has `is_active` | `types/auth.ts:1-7` (enum), `:11-17` (`User` has `id,username,full_name,role,is_active`; **no `email`**) | 🟢 | Role lines `:1-9→:1-7`; `email` omission tracked in Area 5 |

**Verified-matching:** the §0 whole-picture diagram, §1 credential lifetimes, §6 F5 matrix, §8 durability
matrix, §7 logout BE flow (`auth_handler.go` refresh/logout, `delIsActiveCache`).

**Tracker cross-page question resolved:** *does the shell silently re-auth on F5 via the surviving
cookie?* **Yes** — `withCredentials:true` (`api-client.ts:8`) sends the path-scoped `refresh_token`
cookie; a 401 triggers `POST /auth/refresh` → `setAccessToken` → retry (`:40-55`). On guarded routes
`AuthGuard.getMe()` drives this; on `/kds` (unguarded) the page's first data query drives the same
refresh. The shared, no-persist auth store + public `POST /auth/register` cashier self-mint remain as
logged on `staff_register`.

---

## Area ④ — Loading / in-flight behaviour

**Verdict:** accurate. The page genuinely fetches nothing on mount — no `useQuery`, no
`loading.tsx`, no `<Suspense>`; the only in-flight UI is the disabled submit button + label swap. The
`/dev-login` contrast (full-screen `Loader2` + `<Suspense>` for `useSearchParams`) is correct.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `DevLoginInner` spinner range | `dev-login/page.tsx:56-65` | actual `:57-64` (content matches) | 🟡 | Update line ref `:56-65→:57-64` |
| No `loading.tsx` in `(auth)/login/` or group | only `page.tsx` | confirmed — `ls (auth)/login/` = only `page.tsx`; `(auth)/` has only `login/`,`register/` | 🟢 | Match |
| No `useQuery` / `<Suspense>` on mount | none | confirmed `login/page.tsx:1-120` | 🟢 | Match |
| `isSubmitting` disable + opacity | `disabled`, `disabled:opacity-60` | `page.tsx:104-105` | 🟢 | Match |
| Already-logged-in `useEffect` flash | `:33-35` | exact | 🟢 | Match |
| `noValidate` form | `:70` | confirmed | 🟢 | Match |
| `/dev-login` Suspense + spinner | `:67-77`, `useSearchParams` `:18`, `Admin@123` `:31` | confirmed | 🟢 | Match |
| `login()` plain axios, no useMutation | `auth.api.ts:9-10` | confirmed | 🟢 | Match |

**Verified-matching:** the 5-row Flags table (no loading.tsx, redirect flash, no submit spinner,
dev-login polish, `RATE_LIMIT_EXCEEDED` has no FE message).

---

## Area ⑤ — FE⇄BE data model & endpoint trace

**Verdict:** highly accurate. Every handler/service/SQL/Redis/JWT line in `_be.md` checks out against
Go. The drift is (a) the systematic `main.go` route-line staleness (+13, the doc was traced on the old
branch), and (b) two wording fixes (`AUTH_001`, SameSite). Both `LOGIN_BUGS` bugs re-confirmed.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| LOGIN_BUGS Bug 2 phrasing | "`AUTH_001` is referenced nowhere in `be/`" | **Wrong** — emitted by `middleware/auth.go:37,45,47` for protected routes; never by `POST /auth/login` | 🟡 | Reword → "never emitted by the login endpoint" |
| `_be.md` Flag 4 — SameSite | comment says Strict, code "sets none", ❓ if global default | comment `auth.go:98`; `c.SetCookie` `:104` sets no SameSite; grep `be/` `SameSite` = only the comment → truly unset (browser default Lax) | 🟡 | Drop ❓ (resolved); fix the comment, or set `http.SameSiteStrictMode` (separate task) |
| Flag 1 / Bug 1 — FE pwd `min(6)` vs BE `min(8)` | code bug, FE-side | `login/page.tsx:16` `.min(6)` vs `auth_handler.go:24` `min=8`; register uses `min=6` `auth_handler.go:137` | 🟡 (doc documents it) | Raise FE Zod to `.min(8)` (registered task) |
| Flag 2 / Bug 2 — FE error map | dead `AUTH_001`, no `RATE_LIMIT_EXCEEDED`/`INVALID_INPUT` branch | `login/page.tsx:49-58` — confirmed | 🟡 (doc documents it) | Drop dead branch, add 2 branches |
| Flag 5 — `email` in `User` type | "FE `User` type ignores it" | `types/auth.ts:11-17` — `User` has **no `email` field** at all | 🟡 | Note the type omits `email` entirely; add `email?` if FE needs it |
| Route: `/auth` group | `main.go:154` | `:167` | 🟢 | +13 |
| Route: `POST /auth/login` | `main.go:155` | `:168` | 🟢 | +13 |
| Route: `protected` sub-group | `main.go:160-163` | `:173-177` (`/logout` `:175`, `/me` `:176`) | 🟢 | +13 |
| Handler `loginRequest` + `Login` | `auth_handler.go:22-25`, `29-61`, resp `:49-60`, email NULL `:45-48` | all exact | 🟢 | Match |
| Service `Login` gauntlet | `auth_service.go:69-142`; rate-limit `:346-365`; is_active after bcrypt `:90`; sessions `:104-112`; setIsActiveCache `:135`/`:367-376`; staffActiveKey `:43-45`; newRefreshToken `:387-395` | all exact | 🟢 | Match |
| SQL `GetStaffByUsername` | `auth.sql.go:138-165`, `WHERE username=? AND deleted_at IS NULL` | exact | 🟢 | Match |
| JWT TTLs | `jwt.go:51-69` access HS256; `AccessTTL` `:31-38` 24h; `RefreshTTL` `:40-48` 30d | exact | 🟢 | Match |
| Errors | `errors.go:24-26` INVALID_CREDENTIALS/ACCOUNT_DISABLED/RATE_LIMIT_EXCEEDED 401/401/429 | exact | 🟢 | Match |
| SetRefreshCookie | `auth.go:101-105` name/path/httpOnly/maxAge/secure-on-TLS | exact | 🟢 | Match |

**Verified-matching:** the Caching table (both Redis keys fail-open), the full Error Behaviour table,
Flag 3 (rate-limit is service-level not middleware).

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🟡 Doc fix | Resolve §2 ❓: `/kds` has **no** AuthGuard/RoleGuard (relies on api-client 401); `/pos`=`RoleGuard(CASHIER)`, `/admin`=`RoleGuard(MANAGER)` confirmed | `staff_login_crosspage_dataflow.md` §2 |
| 2 | 🔴 Code bug (decision) | Decide whether `/kds` should get a client-side `RoleGuard(CHEF)` (today only api-client 401 + BE role checks protect it) — **register in MASTER first** | `kds/page.tsx` or `(dashboard)/layout.tsx` |
| 3 | 🟡 Doc fix | Resolve §7 ❓: only `MenuHeader.handleLogout` (`:15-22`) calls `logout()`+`clearAuth()`; note no staff-surface logout button | `staff_login_crosspage_dataflow.md` §7 |
| 4 | 🟡 Doc fix | Reword `LOGIN_BUGS` Bug 2: `AUTH_001` IS emitted by `middleware/auth.go:37,45,47`; it's "never emitted by the login endpoint" | `LOGIN_BUGS.md` Bug 2 |
| 5 | 🟡 Doc fix | `_be.md` Flag 4: drop the ❓ — SameSite is confirmed unset (grep `be/` = only the comment) | `staff_login_be.md` Flag 4 |
| 6 | 🟡 Doc fix | Update all stale `main.go` route lines +13 (group `:154→:167`, login `:155→:168`, protected `:160-163→:173-177`) and refresh provenance branch | `staff_login_be.md`, `_crosspage_dataflow.md`, `SCENARIO_STAFF_LOGIN.md`, `LOGIN_BUGS.md` |
| 7 | 🟡 Doc fix | `staff_login.md` wireframe: distinguish the Zod min-6 message (`Tối thiểu 6 ký tự`) from the API error in the password slot | `staff_login.md` |
| 8 | 🟡 Doc fix | `_loading.md`: `DevLoginInner` spinner `:56-65→:57-64` | `staff_login_loading.md` |
| 9 | 🔴 Code bug | FE login password Zod `.min(6)` → `.min(8)` to match BE bind (Bug 1) — **register in MASTER first** | `(auth)/login/page.tsx:16` |
| 10 | 🔴 Code bug | FE error map: drop dead `AUTH_001` branch, add `RATE_LIMIT_EXCEEDED` + `INVALID_INPUT` (Bug 2) — **register in MASTER first** | `(auth)/login/page.tsx:49-58` |
| 11 | 🟡 Code (decision) | `SetRefreshCookie`: set `SameSite=Strict` for real, or fix the comment (Flag 4) — **register in MASTER first** | `be/internal/middleware/auth.go:98-104` |

> Per CLAUDE.md: doc fixes (#1,3,4,5,6,7,8) are one ALIGNed doc task; each **code** change (#2,9,10,11)
> must be registered in `docs/tasks/MASTER_TASK.md` and ALIGNed **before any file is touched**.
