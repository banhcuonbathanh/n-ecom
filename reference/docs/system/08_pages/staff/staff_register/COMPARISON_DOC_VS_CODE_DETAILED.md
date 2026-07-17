# Comparison — Doc vs. Code · `/register` (staff_register)

> **Scope:** audit the `staff_register` doc-set against the running FE/BE code on the current branch,
> across 5 axes: ① component visuals · ② cross-component dataflow · ③ cross-page dataflow · ④ loading
> behaviour · ⑤ FE⇄BE data model.
> **Read-only — no code or docs were changed.** Only this file, its VI mirror, the visual mockup, and
> `COMPARISON_TRACKER.md` are written.
> **Method:** small single-page form (129 lines) — audited **inline** (no subagents needed); every
> 🔴 re-verified by hand against source.
> **Branch:** `experience_claude.md_system_1_test_iphon2_change_code` · **Date:** 2026-06-22
> **Verdict in one line:** a **high-fidelity, source-faithful doc-set** (peer of `customer_welcome` /
> `customer_profile` / `admin_combos`) — it documents the code *including* its one security bug. There
> is **no doc-vs-code contradiction**; the lone 🔴 is a CODE bug the doc already flags.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals (`staff_register.md`) | **Near-perfect** — every FE `file:line` exact, ASCII matches the 3-field card | 0 | 0 | 2 |
| 2 — Cross-component dataflow | **N/A (correctly declared)** — single form card, RHF-local state, no page store | 0 | 0 | 1 |
| 3 — Cross-page dataflow (`_crosspage_dataflow.md`) | **Accurate** — 3-artifact handoff + no-persist store confirmed | 0 | 1 | 1 |
| 4 — Loading (`_loading.md`) | **Accurate** — fetch-free form, only `isSubmitting` button state | 0 | 0 | 1 |
| 5 — FE⇄BE data model (`_be.md`) | **Accurate behaviourally; `main.go` route lines stale +13** | 1 | 4 | 1 |
| **Total** | **No doc-vs-code contradiction** | **1** | **5** | **6** |

---

## 🔴 RAISE-MY-VOICE headline findings (hand-verified)

**1. Public `POST /auth/register` mints an active `cashier` staff account — and the FE `customer` redirect is dead. (CODE bug; the doc already documents it — `REGISTER_BUGS.md` Bug 1.)**
Re-verified end-to-end from source on this branch:
- **Route is public** — `authR.POST("/register", authH.Register)` at [`main.go:169`](../../../../../be/cmd/server/main.go#L169), in the `/auth` group ([`main.go:167`](../../../../../be/cmd/server/main.go#L167)), registered **before** the `protected` sub-group ([`main.go:173-174`](../../../../../be/cmd/server/main.go#L173)) → no `authMW`, no role gate.
- **Role + active are hardcoded** — `CreateStaffForRegister(ctx, newUUID(), username, hash, username, "cashier")` ([`auth_service.go:219`](../../../../../be/internal/service/auth_service.go#L219)); the repo INSERT bakes `is_active` to `1` ([`auth_repo.go:87-88`](../../../../../be/internal/repository/auth_repo.go#L87)).
- **FE `customer` branch is unreachable** — `redirectByRole` maps `customer:'/menu'` ([`register/page.tsx:28`](../../../../../fe/src/app/%28auth%29/register/page.tsx#L28)) but BE returns `role:"cashier"` always (`auth_handler.go:169`), so a successful register always lands on `/pos` ([`register/page.tsx:48-50`](../../../../../fe/src/app/%28auth%29/register/page.tsx#L48)).

**Why it matters:** anyone on the internet can self-mint POS/staff access with just a username + password — no approval, no verification, no rate-limit. BUSINESS_RULES §1 says staff accounts are manager-created via `/admin/staff`. This is a **product/security decision**, not a mechanical fix (delete the route · make it `customer`-only · or gate behind `AtLeast("manager")`) — must be MASTER-registered + ALIGNed before any code change.

> **This is the only 🔴, and it is a code bug the doc-set already records correctly.** No doc claim
> contradicts the code on this page.

---

## Dead / unreachable components found

- **`redirectByRole.customer:'/menu'`** ([`register/page.tsx:28`](../../../../../fe/src/app/%28auth%29/register/page.tsx#L28)) — dead branch; BE never returns `role:"customer"` from `/auth/register`. (🟡 — doc-documented: `staff_register.md` Flag 3 + `_be.md` Auth Model.)
- No other dead code on this page. No zero-import components (it is one self-contained `page.tsx`).

---

## Area 1 — Component visuals (`staff_register.md` ASCII + Zones vs `register/page.tsx`)

**Verdict: near-perfect.** Every FE line-cite in the wireframe is exact and the ASCII matches the real 3-field card. No visual drift.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| ASCII trace range | "lines 62–128" | form/card spans `register/page.tsx:62-127`, file ends `:129` | 🟢 | none — accurate |
| Provenance branch | (header cites old branch implicitly) | actual branch `…_test_iphon2_change_code` | 🟢 | refresh provenance line |

**Verified-matching (all exact):** `h1` "Quán Bánh Cuốn" `:65-67`; subtitle "Tạo tài khoản mới" `:68`; `Tên đăng nhập` Label `:72-74` + Input `autoComplete="username"` `:75-80` + error `:81-83`; `Mật khẩu` Label `:87-89` + Input `type=password` `autoComplete="new-password"` `:90-95` + error `:96-98`; `Xác nhận mật khẩu` Label `:103-105` + Input `:106-111` + error `:112-115`; submit Button `disabled={isSubmitting}` `:118-124`, label flips to "Đang tạo tài khoản…" `:123`. Zod schema = exactly 3 fields (`username` min 3 · `password` min 6 · `confirm` refine `=== password`) `:13-20`. **No "Họ tên" field** and **no `/login` link** — both correctly stated by the doc and confirmed in code.

---

## Area 2 — Cross-component dataflow

**Verdict: N/A — correctly declared.** The page is a single form card; RHF holds all field state locally (`useForm` `:39-44`); the only external store is the global `useAuthStore` (`:33`), which is a cross-*page* concern (Area 3), not cross-component. `SCENARIO_REGISTER.md` §"Under the hood — A" says exactly this.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Shared store across widgets | "N/A — single form card, RHF local, no shared store" | only `useAuthStore` (global), no page-level store; RHF local `register/page.tsx:39-44` | 🟢 | none — accurate |

---

## Area 3 — Cross-page dataflow (`_crosspage_dataflow.md` vs auth.store + redirect)

**Verdict: accurate.** The three-artifact handoff (durable `staff` row · httpOnly refresh cookie · memory-only Zustand session) and the no-persist F5 matrix are all confirmed in code.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Auth store has **no persist** → dies on F5 | "no `persist` middleware … memory only" | `useAuthStore = create(...)` plain, no `persist` ([`auth.store.ts:12-18`](../../../../../fe/src/features/auth/auth.store.ts#L12)) | 🟢 | none — accurate |
| Handoff writes | `setAuth(newUser, access_token)` then `router.push` | `register/page.tsx:49-50`; `setAuth` `auth.store.ts:15` | 🟢 | none — accurate |
| Refresh-cookie set on success | `SetRefreshCookie` httpOnly | `auth_handler.go:156` | 🟢 | none — accurate |
| F5-on-`/pos` re-auth path | "❓ UNVERIFIED here — owned by app shell / api-client interceptor" | not on this page; honest gap | 🟢 | resolve on `staff_login` run |
| Redirect always `/pos` | "always cashier → `/pos`" | BE returns `cashier` (`auth_handler.go:169`); map `register/page.tsx:25` | 🟡 | tied to Bug 1 (dead `customer` branch) |

---

## Area 4 — Loading & in-flight (`_loading.md` vs `register/page.tsx`)

**Verdict: accurate.** Fetch-free form: no `loading.tsx`, no `useQuery`, no Suspense — the only "loading" is the submit-in-flight button driven by RHF `isSubmitting`.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| No fetch on mount / no spinner | "no `useQuery`, renders immediately" | client component, no query; card `register/page.tsx:62-127` | 🟢 | none — accurate |
| Submit-in-flight button | label → "Đang tạo tài khoản…", `disabled` | `register/page.tsx:120-123` | 🟢 | none — accurate |
| Mount redirect-guard flash | `useEffect if(user) push(...)` | `register/page.tsx:35-37` | 🟢 | none — accurate |

---

## Area 5 — FE⇄BE data model (`_be.md` vs handler / service / repo / main.go)

**Verdict: behaviourally accurate; the only drift is the recurring `main.go` route-line offset (+13).** Handler/service/repo line-cites are all exact; the Bug-1 finding and the four Flags hold.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Route registration line | `main.go:156` (route), group `:154`, protected `:159-164` | route `main.go:169`, group `:167`, protected `:173-174` (**+13**) | 🟡 | re-cite route lines (or cite group + handler name) |
| Handler `Register` | `auth_handler.go:142` | exact — `auth_handler.go:142-174` | 🟢 | none |
| Service `Register` | `auth_service.go:205` | exact — `auth_service.go:205-225` | 🟢 | none |
| Repo INSERT | `auth_repo.go:86`, `is_active=1` baked | exact — `auth_repo.go:86-93`, `:88` `is_active`→`1` | 🟢 | none |
| **Flag 2 — wireframe shows "Họ tên"** | "`staff_register.md` shows a 'Họ tên' field the real page doesn't render — doc drift" | the **current** `staff_register.md:43` explicitly states **"No 'Họ tên' field"** — the wireframe is already corrected | 🟡 | `_be.md` Flag 2's wireframe-mention is itself **stale**; drop or rephrase it |
| Flag 4 — response omits `phone` | register user object omits `phone` (Login includes it) | confirmed: register `auth_handler.go:165-171` (no `phone`); Login/Me `:124-131` (has `phone`) | 🟡 | doc accurate — asymmetry is real |
| Flag 5 — no rate limiting | `/auth` routes unthrottled; `ratelimit.go` unwired | confirmed: 0 ratelimit refs in `main.go` (grep) | 🟡 | doc accurate — real gap |
| Flag 2 — `full_name = username` | service passes `username` as `full_name` | confirmed `auth_service.go:219` | 🟢 | doc accurate (by design) |
| Flag 6 — `confirm` never sent | only `{username,password}` POSTed | confirmed `auth.api.ts:30` | 🟢 | doc accurate (by design) |
| Error: USERNAME_TAKEN → 409 | `ErrUsernameTaken` = AppError 409 | confirmed `auth_service.go:208` → `staff_service.go:33` | 🟢 | doc accurate |

**Verified-matching:** `registerRequest` binding `min=3`/`min=6` (`auth_handler.go:135-138`); `201 Created` + `{access_token, user{id,username,full_name,role,email}}` (`auth_handler.go:162-173`); `GetStaffByUsername` existence check + `errors.Is(sql.ErrNoRows)` guard (`auth_service.go:206-212`) — **not** the `==`-vs-`errors.Is` 404→500 trap seen on admin_ingredients; bcrypt hash (`:214`); `issueTokens` max-5-sessions cap (`:236-244`).

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug (product/security decision) | Decide intent for public `/auth/register` (delete route · make `customer`-only · or gate behind `AtLeast("manager")`); then remove the dead FE `customer` redirect branch | `be/cmd/server/main.go:169` · `be/internal/service/auth_service.go:219` · `fe/src/app/(auth)/register/page.tsx:28` |
| 2 | 🟡 Doc fix | Update `_be.md` `main.go` route cites +13 (route `:156→:169`, group `:154→:167`, protected `:159-164→:173-174`) | `staff_register_be.md` |
| 3 | 🟡 Doc fix | Remove/rephrase `_be.md` Flag 2's stale claim that the wireframe shows "Họ tên" — the wireframe (`staff_register.md:43`) already says it does not | `staff_register_be.md` |
| 4 | 🟢 Doc fix | Refresh stale provenance branch (`…_system_1` → `…_test_iphon2_change_code`) across the doc-set | all 6 doc files |

> Per CLAUDE.md: the doc fixes (#2–#4) are **one** ALIGNed doc task; the code change (#1) must be
> registered in `docs/tasks/MASTER_TASK.md` and ALIGNed **before any file is touched** — it is a
> product/security decision, not a mechanical fix.
