# Scenario — A New Account Registers

> **TL;DR:** ✅ implemented · one concrete run through `/register` end-to-end, grounded in the
> page's single traced endpoint (`POST /auth/register`) and its cross-page handoff. The twist this
> scenario exists to surface: whoever registers gets a **cashier** account and lands on `/pos` —
> there is no customer self-signup here ([REGISTER_BUGS.md](REGISTER_BUGS.md) Bug 1).
> Anchor: [staff_register_be.md](staff_register_be.md) · FE: [staff_register.md](staff_register.md) ·
> crosspage: [staff_register_crosspage_dataflow.md](staff_register_crosspage_dataflow.md) ·
> loading: [staff_register_loading.md](staff_register_loading.md).

---

## Cast & setting

- **Mai**, a new hire, opens `/register` on a shop tablet to make her own account.
- **The browser** — Next.js client, Zustand auth store (memory-only), axios `api-client`.
- **The BE** — `authH.Register` → `AuthService.Register` → MySQL `staff` table.

## Timeline (beat by beat)

1. **Mai lands on `/register`.** The card paints instantly — no spinner, no fetch
   (`register/page.tsx:62-127`; see [loading](staff_register_loading.md)). She is not logged in, so
   the mount redirect-guard (`page.tsx:35-37`) does nothing.
2. **She fills the form.** `Tên đăng nhập` = `mai`, `Mật khẩu` = `banhcuon123`, `Xác nhận mật khẩu`
   = `banhcuon123`. Zod refines `password === confirm` live (`page.tsx:13-20`).
3. **She taps "Đăng ký".** RHF flips `isSubmitting` → button shows "Đang tạo tài khoản…" and
   disables (`page.tsx:120-123`). `register('mai','banhcuon123')` POSTs `{username, password}` only —
   `confirm` never leaves the browser (`auth.api.ts:26-30`).
4. **BE creates the account.** `AuthService.Register` finds no existing `mai`
   (`auth_service.go:206`), bcrypt-hashes the password, and INSERTs a `staff` row:
   `role="cashier"`, `full_name="mai"` (= the username), `is_active=1`
   (`auth_service.go:219`, `auth_repo.go:87-88`). `issueTokens` mints an access token + a refresh
   token, enforcing the max-5-sessions cap (`auth_service.go:228-244`).
5. **BE responds `201`.** Sets the httpOnly `refresh_token` cookie (`auth_handler.go:156`) and
   returns `{access_token, user{id, username:"mai", full_name:"mai", role:"cashier", email:""}}`
   (`auth_handler.go:162-173`).
6. **FE logs Mai in and redirects.** `setAuth(user, access_token)` writes the in-memory session
   (`page.tsx:49`), then `router.push(redirectByRole["cashier"])` → **`/pos`** (`page.tsx:50`,
   map at `page.tsx:23-29`). Mai expected a customer experience; she gets the cashier POS.

### Alternate beat — username taken

If `mai` already exists, `Register` returns `ErrUsernameTaken` → `409 USERNAME_TAKEN`
(`auth_service.go:208`, `staff_service.go:33`). The FE catches it and sets an inline error on the
`username` field: "Tên đăng nhập đã tồn tại" (`page.tsx:54-55`). The button re-enables; no redirect.

## Under the hood

- **A — cross-component:** N/A. A single form card; RHF holds field state locally, no shared store
  across widgets.
- **B — cross-page:** the register leaves three artifacts of different lifetimes (durable `staff`
  row, httpOnly refresh cookie, memory-only auth session) → full detail in
  [staff_register_crosspage_dataflow.md](staff_register_crosspage_dataflow.md).
- **C — FE→BE send:** one call, `POST /auth/register {username,password}` → traced in
  [staff_register_be.md](staff_register_be.md).
- **D — BE→FE / live:** none — no SSE/WS on this page. The only response is the `201` body + cookie.
- **E — loading & caching:** no fetch on mount, no Redis; only the submit-in-flight button state →
  [staff_register_loading.md](staff_register_loading.md).
- **F — monitoring:** the new row is visible to managers at `/admin/staff`; there is no other audit
  signal on this path (`❓ UNVERIFIED` whether register writes an `audit_logs` entry — none seen in
  `Register`).

## Mental model

> `/register` is a **staff account factory disguised as a generic signup** — it always produces an
> active cashier and drops you at the POS. Treat it as the open door it is until Bug 1 is resolved.
