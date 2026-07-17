# Staff Register — `/register`

> **TL;DR:** ✅ implemented · public · A centered-card registration form (RHF + Zod, `Input`/`Label`/`Button`
> atoms). Submits `{ username, password }` to `POST /auth/register`; on success the BE always
> creates an **active cashier account** (role hardcoded on BE — see [staff_register_be.md](staff_register_be.md)),
> so a successful register **always redirects to `/pos`**. The "mainly serves a PLANNED customer path"
> claim in the old doc was wrong — BE never returns `role=customer` from this endpoint.
> Security note: the endpoint is completely public and unguarded → [REGISTER_BUGS.md](REGISTER_BUGS.md) Bug 1.
> BE detail → [staff_register_be.md](staff_register_be.md) · Bugs → [REGISTER_BUGS.md](REGISTER_BUGS.md)

---

## ASCII Wireframe

Traced from [`(auth)/register/page.tsx`](../../../../../fe/src/app/(auth)/register/page.tsx) (lines 62–128).

```
┌────────────────────────────────────────────────┐
│            (full-screen centered bg)           │
│        ┌──────────────────────────────┐        │
│        │      Quán Bánh Cuốn          │ ← h1 (line 65-67)
│        │      Tạo tài khoản mới       │ ← subtitle p (line 68)
│        │                              │
│        │ Tên đăng nhập                │ ← Label "username" (line 72-74)
│        │ [__________________________] │ ← Input id="username" (line 75-80)
│        │  ⚠ inline error              │ ← errors.username (line 81-83)
│        │                              │
│        │ Mật khẩu                     │ ← Label "password" (line 87-89)
│        │ [**************************] │ ← Input type="password" (line 90-95)
│        │  ⚠ inline error              │ ← errors.password (line 96-98)
│        │                              │
│        │ Xác nhận mật khẩu            │ ← Label "confirm" (line 103-105)
│        │ [**************************] │ ← Input type="password" (line 106-111)
│        │  ⚠ inline error              │ ← errors.confirm (line 112-115)
│        │                              │
│        │ [        Đăng ký          ]  │ ← Button submit (line 118-124)
│        │   (→ "Đang tạo tài khoản…"  │   while isSubmitting (line 123)
│        │    while isSubmitting)       │
│        └──────────────────────────────┘
└────────────────────────────────────────────────┘
```

**No "Họ tên" / full_name field** — the Zod schema (lines 13–20) has exactly three fields:
`username`, `password`, `confirm`. No login link is rendered anywhere in the card (page.tsx ends
at line 129 — there is no `Link` to `/login`).

---

## Zones

| Zone | Component | Data source |
|---|---|---|
| Outer shell | Inline `div.min-h-screen` in `(auth)/register/page.tsx:63` | — |
| Card | Inline `div.bg-card.rounded-2xl` (`page.tsx:64`) | — |
| Title / subtitle | `h1` (line 65) + `p` (line 68) — static strings | — |
| Form | Inline `<form>` with RHF `handleSubmit` (`page.tsx:70`) | RHF + Zod schema (lines 13–20) |
| Tên đăng nhập field | `Input` atom, id=`username`, `autoComplete="username"` (`page.tsx:75–83`) | RHF field `username`, min 3 chars |
| Mật khẩu field | `Input` atom, type=`password`, `autoComplete="new-password"` (`page.tsx:90–98`) | RHF field `password`, min 6 chars |
| Xác nhận field | `Input` atom, type=`password`, `autoComplete="new-password"` (`page.tsx:106–115`) | RHF field `confirm`; Zod refine: must === `password` |
| Submit button | `Button` atom, `disabled={isSubmitting}` (`page.tsx:118–124`) | Label flips to "Đang tạo tài khoản…" while `isSubmitting` |

`confirm` is **client-only** — it is validated by Zod and never sent to BE (`page.tsx:48` sends
only `values.username, values.password`).

---

## Key Interactions

- **On mount**: if `user` is already set in `useAuthStore`, `useEffect` (lines 35–37) immediately
  calls `router.push(redirectByRole[user.role] ?? '/dashboard')`.
- **Submit flow**: RHF validates; on pass, calls `register(values.username, values.password)`
  (`auth.api.ts:26–30`, `POST /auth/register { username, password }`). On success:
  `setAuth(newUser, access_token)` writes to the auth store; `router.push(redirectByRole[newUser.role])`
  redirects. Because BE hardcodes `role="cashier"`, the redirect **always lands on `/pos`**.
- **`USERNAME_TAKEN` error**: `setError('username', { message: 'Tên đăng nhập đã tồn tại' })`
  (line 55) — surfaces inline under the username field.
- **Other errors**: `setError('confirm', { message: 'Đã xảy ra lỗi, vui lòng thử lại' })` (line 57).
- **No login link** is rendered anywhere on this page.

Role redirect map (lines 23–29):

| role | destination |
|---|---|
| `chef` | `/kds` |
| `cashier` | `/pos` |
| `manager` | `/admin` |
| `admin` | `/admin` |
| `customer` | `/menu` |
| (unknown) | `/dashboard` |

Since BE always creates `role="cashier"`, a successful register always goes to `/pos`.

---

## Business Logic Used

- Auth store shape (`user`, `accessToken`, `setAuth`, `clearAuth`) →
  [../../../07_business_logic/LOGIC_FE.md](../../../07_business_logic/LOGIC_FE.md)
- RBAC role hierarchy (cashier is lowest staff role) →
  [../../../02_spec/BUSINESS_RULES.md §1 RBAC](../../../02_spec/BUSINESS_RULES.md)
- JWT / token rules (access token in Zustand memory only, never localStorage) →
  [../../../02_spec/BUSINESS_RULES.md §5 JWT / Auth Rules](../../../02_spec/BUSINESS_RULES.md)

---

## Object Model

This page creates a `User` + issues an `access_token` on the happy path.

> Full `User`/`Staff` shape (all layers: DB → BE → FE) lives in
> [../../../02_spec/object/OBJECT_MODELS.md](../../../02_spec/object/OBJECT_MODELS.md) — not restated here (Rule #9).

**FE register response shape** (traced from `auth.api.ts:21–30`):

```ts
interface RegisterResponse {
  user:         User          // role is always "cashier" (BE-hardcoded)
  access_token: string        // short-lived JWT, stored in Zustand memory only
}
```

`auth.store.ts:12–18` stores exactly these two fields (`user`, `accessToken`) in Zustand. No
localStorage write at any point.

### Flags / Known Mismatches

| # | Issue | Detail |
|---|---|---|
| 1 | **Public endpoint mints active cashier** | `POST /auth/register` is completely unguarded — any caller on the internet can create a cashier account. → [REGISTER_BUGS.md](REGISTER_BUGS.md) Bug 1 |
| 2 | **`confirm` field never sent** | Zod validates `confirm === password` client-side; only `{ username, password }` is POSTed (`auth.api.ts:30`). Correct by design but easy to miss when reading the form. |
| 3 | **`customer` entry in redirect map is dead code** | `redirectByRole` (page.tsx:23–29) contains `customer → /menu` but BE never returns `role=customer` from `/auth/register`, so that branch never fires on this page. |
