# Register — Code Bugs

> **TL;DR:** 1 code bug found tracing `/register` on branch `experience_claude.md_system_1`.
> These are **code** bugs (FE and BE disagree, or the running code contradicts clear intent), **not
> stale docs** — the `/page-doc-set` skill does **not** fix app code, it records the bug so the
> owner can register + ALIGN a fix. Doc drift found in the same run is fixed separately (see the
> Decision Log entry in [LOGIC_INDEX.md](../../../07_business_logic/LOGIC_INDEX.md)).
> Anchor: [staff_register_be.md](staff_register_be.md) · FE view: [staff_register.md](staff_register.md).

---

## Severity at a Glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | Public `POST /auth/register` mints an **active `cashier` staff account**; FE `customer` redirect is dead | 🔴 High (security / privilege) | `/register` page + every staff surface (POS, KDS shells) — cross-cutting auth | **BE** (primary) + FE cleanup |

---

## Bug 1 — Public registration grants staff (cashier) access

**Symptom (what the user / attacker sees).** Anyone can open `/register` (or POST directly to the
public `/api/v1/auth/register`) with just a `username` + `password` and is immediately logged in as
a **cashier** — `is_active=1`, no approval, no email verification — and redirected to `/pos`. The
page is styled as a generic "Tạo tài khoản mới" form and the FE even has a `customer: '/menu'`
redirect branch, implying it produces a customer account, but it never does: every successful
registration yields a staff cashier.

**Root cause.**
- **Publisher (BE):** `AuthService.Register` hardcodes the role —
  [`auth_service.go:219`](../../../../../be/internal/service/auth_service.go#L219):
  `s.repo.CreateStaffForRegister(ctx, newUUID(), username, hash, username, "cashier")`. The repo
  INSERT bakes in `is_active=1`
  ([`auth_repo.go:87-88`](../../../../../be/internal/repository/auth_repo.go#L87)). The route is
  public — no `authMW`, no role gate
  ([`main.go:156`](../../../../../be/cmd/server/main.go#L156), outside the `protected` group at
  `main.go:159-164`).
- **Consumer (FE):** the redirect map
  [`register/page.tsx:23-29`](../../../../../fe/src/app/%28auth%29/register/page.tsx#L23) maps
  `customer:'/menu'`, but `setAuth(newUser, …)` always receives `role:"cashier"` from BE, so the
  `customer` branch is unreachable and registration always routes to `/pos`
  ([`register/page.tsx:48-50`](../../../../../fe/src/app/%28auth%29/register/page.tsx#L48)).

So the FE treats `/register` as a possibly-customer signup while the BE unconditionally creates a
staff cashier — a direct FE/BE intent mismatch **and** an unauthenticated privilege-granting
endpoint. Per [BUSINESS_RULES §1 RBAC](../../../02_spec/BUSINESS_RULES.md), staff accounts are
meant to be created by a manager via `/admin/staff` (the `StaffService` path), not self-served.

**Suggested fix (smallest safe change — owner to decide intent).** Pick one:
1. **If self-registration is not intended** → remove the public `/auth/register` route + the FE
   page (staff are created at `/admin/staff`). Smallest, closes the hole.
2. **If a customer self-account path is intended** → change `Register` to create `role="customer"`
   (the ENUM already supports it, [DB_SCHEMA §Auth](../../../02_spec/DB_SCHEMA.md)), keep the route
   public, and the FE `customer:'/menu'` redirect becomes live. Collect `full_name` on the form
   (see [staff_register_be.md](staff_register_be.md) Flag 2) and add rate limiting (Flag 5).
3. **If staff self-registration is intended** → gate the route behind `authMW` + `AtLeast("manager")`
   so only managers can create accounts (matches the documented norm).

This is a **product/security decision**, not a mechanical fix — it must be registered in
`docs/tasks/MASTER_TASK.md` and ALIGNed before any code change.

---

## Next Step

This bug is **not yet** on `docs/tasks/MASTER_TASK.md`. Per CLAUDE.md, a fix must be registered +
ALIGNed before any code change. Recommended first action: confirm with the owner **which of the
three intents** above is correct for `/register` — that decides whether the fix is "delete the
endpoint", "make it customer-only", or "gate it behind manager auth".
