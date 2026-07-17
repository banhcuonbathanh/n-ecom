# Staff Login — `/login`

> **TL;DR:** ✅ implemented · public → staff JWT · Centered card with username/password form
> (RHF + Zod). On success stores the user + access token in the auth store (memory only) and
> redirects by role: chef→`/kds`, cashier→`/pos`, manager/admin→`/admin`, customer→`/menu`.
> Dev shortcut: `/dev-login` auto-logs-in a seeded account (spinner page, dev only).

---

## ASCII Wireframe

```
┌────────────────────────────────────────────────┐
│                                                │
│        ┌──────────────────────────────┐        │
│        │      Quán Bánh Cuốn          │        │ ← display heading
│        │   Đăng nhập để tiếp tục      │        │
│        │                              │        │
│        │ Tên đăng nhập                │        │
│        │ [__________________________] │        │
│        │  ⚠ Tối thiểu 3 ký tự         │        │ ← inline Zod error
│        │                              │        │
│        │ Mật khẩu                     │        │
│        │ [__________________________] │        │
│        │  ⚠ Tên đăng nhập hoặc mật    │        │ ← API error surfaces here
│        │     khẩu không đúng          │        │
│        │                              │        │
│        │ [       Đăng nhập         ]  │        │ ← submit (primary, full width)
│        │                              │        │
│        │ Chưa có tài khoản? Đăng ký   │        │ ← link → /register
│        └──────────────────────────────┘        │
│                                                │
└────────────────────────────────────────────────┘
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| Card + form | inline JSX in `(auth)/login/page.tsx` with `Input`/`Label`/`Button` atoms | RHF + Zod (`username ≥ 3`, `password ≥ 6`) |
| Submit | `features/auth/auth.api.login` | `POST /auth/login` → `useAuthStore.setAuth` |
| Register link | `Link` | → `/register` |

## Key Interactions

- Submit → on success `setAuth(user, access_token)` (Zustand memory, refresh token is an HTTP-only
  cookie) → redirect by role map.
- Error codes mapped to messages: `INVALID_CREDENTIALS`/`AUTH_001` → wrong credentials;
  `ACCOUNT_DISABLED` → account disabled; anything else → generic retry.
- Already logged in (store has `user`) → immediate role-based redirect away from this page.

## Business Logic Used

- Token storage rule (access in memory, never localStorage) → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (auth store, interceptor)
- JWT config (24 h access + 30 d refresh cookie) → [../02_spec/BUSINESS_RULES.md §5.1 Token Config](../02_spec/BUSINESS_RULES.md#51-token-config)
- Role → home-page mapping → [../02_spec/BUSINESS_RULES.md §1 RBAC](../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy)
