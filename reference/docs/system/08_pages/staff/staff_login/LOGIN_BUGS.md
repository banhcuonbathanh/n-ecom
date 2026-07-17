# Staff Login — Code Bugs Found by the BE Trace

> **TL;DR:** 2 bugs found tracing `/login` on branch `experience_claude.md_system_1`. These are
> **code** bugs (FE and BE disagree), **not** stale docs — a doc edit cannot fix them; only an
> FE code change can. Both are **low severity** (degraded error messaging, not broken auth) and
> both are **FE-side**. Logged once in the LOGIC Decision Log; the durable detail lives here.
>
> Anchor → [staff_login_be.md](staff_login_be.md) (Flags 1–2) ·
> Decision Log → [../../07_business_logic/LOGIC_INDEX.md](../../07_business_logic/LOGIC_INDEX.md)
>
> **Next step:** neither bug is on `docs/tasks/MASTER_TASK.md` yet — per CLAUDE.md a fix must be
> registered + ALIGNed before any code change. Recommended first: **Bug 2** (one-file FE map fix,
> covers the most confusing failure paths).

---

## Severity at a Glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | FE password min (6) is looser than BE min (8) → confusing generic error | 🟡 Low | `/login` + `/register` (shared Zod pattern) | FE |
| 2 | FE error map is dead/incomplete — `AUTH_001` never fires; no `RATE_LIMIT_EXCEEDED`/`INVALID_INPUT` branch | 🟡 Low | `/login` | FE |

---

## Bug 1 — FE accepts a 6–7-char password the BE rejects

**Symptom (what the user sees):** a staff member types a 6- or 7-character password. The client
form passes validation and submits. The BE returns `400 INVALID_INPUT` (binding requires `min=8`).
The FE has no branch for `INVALID_INPUT`, so it shows the catch-all "Đã xảy ra lỗi, vui lòng thử
lại" — the user is never told the password is too short.

**Root cause:**
- FE Zod schema: `password: z.string().min(6, 'Tối thiểu 6 ký tự')`
  ([`fe/src/app/(auth)/login/page.tsx:16`](../../../../../fe/src/app/(auth)/login/page.tsx#L16)).
- BE binding: `Password string \`json:"password" binding:"required,min=8"\``
  ([`be/internal/handler/auth_handler.go:24`](../../../../../be/internal/handler/auth_handler.go#L24)).

The two validators disagree by 2 characters. (Note `/register` uses BE `min=6` —
[`auth_handler.go:137`](../../../../../be/internal/handler/auth_handler.go#L137) — so the mismatch
is login-specific; the FE form is reused, deepening the inconsistency.)

**Suggested fix (smallest safe change, FE):** raise the login Zod rule to `.min(8, …)` so the
client blocks under-length passwords with an inline message before any request. (Alternatively,
align BE login `min` to 6 — but raising the FE bound is the smaller, safer change and keeps the
stricter server rule. This is a product call.)

---

## Bug 2 — FE error map checks a code the BE never sends, and misses two it does

**Symptom (what the user sees):**
- A **throttled** user (> 5 attempts/min/IP → `429 RATE_LIMIT_EXCEEDED`) sees only the generic
  "Đã xảy ra lỗi, vui lòng thử lại" — no hint they are rate-limited.
- An **under-length password** (`400 INVALID_INPUT`, Bug 1) likewise falls through to generic.
- The dedicated `AUTH_001` branch is **dead** — the BE emits `INVALID_CREDENTIALS`, never
  `AUTH_001`, so that condition only ever matches via the parallel `INVALID_CREDENTIALS` check.

**Root cause:**
- FE error map ([`fe/src/app/(auth)/login/page.tsx:49-58`](../../../../../fe/src/app/(auth)/login/page.tsx#L49-L58))
  branches on `INVALID_CREDENTIALS || AUTH_001` and `ACCOUNT_DISABLED`, else generic.
- BE codes actually emitted ([`be/internal/service/errors.go:24-26`](../../../../../be/internal/service/errors.go#L24-L26)):
  `INVALID_CREDENTIALS` (401), `ACCOUNT_DISABLED` (401), `RATE_LIMIT_EXCEEDED` (429), plus
  `INVALID_INPUT` (400) from the handler bind. `AUTH_001` is referenced nowhere in `be/`.

**Suggested fix (smallest safe change, FE):** drop the dead `AUTH_001` check and add two branches —
`RATE_LIMIT_EXCEEDED` → "Quá nhiều lần thử, vui lòng thử lại sau" and `INVALID_INPUT` → a
field-level message (covers Bug 1's user-facing gap too). One file, no BE change.

---

## Not bugs (recorded so they are not re-flagged)

- **Login rate-limit lives in the service, not middleware** — real and working
  ([`auth_service.go:346-365`](../../../../../be/internal/service/auth_service.go#L346-L365)); see
  [staff_login_be.md](staff_login_be.md) Flag 3. Contrast the guest path, which has none.
- **Cookie SameSite comment vs code** — `auth.go:98` comment says `Strict`, `c.SetCookie` sets no
  SameSite attribute. ❓ UNVERIFIED whether a global default applies; tracked as
  [staff_login_be.md](staff_login_be.md) Flag 4, not a confirmed bug.
