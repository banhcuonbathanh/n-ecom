# Profile — Known Code Bugs (found during `/page-doc-set customer_profile`)

> **TL;DR:** 1 primary code bug (with a low-severity offshoot) surfaced while tracing `/profile`
> against source on branch `experience_claude.md_system_1`. The page's two endpoints —
> `GET` and `PUT /customer/profile` — **are not implemented in the backend**, so the page can load
> but never persist. These are **code** problems, not stale docs: the handbook correctly omits the
> endpoint (it doesn't exist); only the page doc over-promised. The doc skill does not touch app
> code — fixing this needs a BE implementation (or an explicit "FE-only / disabled" decision).
> Logged in
> [../../07_business_logic/LOGIC_INDEX.md Decision Log (2026-06-15)](../../07_business_logic/LOGIC_INDEX.md#decision-log)
> and flagged in [customer_profile_be.md Flags 1–2](customer_profile_be.md).
>
> Source files: `be/cmd/server/main.go` · `fe/src/hooks/useCustomerProfile.ts` ·
> `fe/src/app/(shop)/profile/page.tsx` · `fe/src/lib/api-client.ts`.

---

## Severity at a glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | `GET`/`PUT /customer/profile` are unimplemented — page loads in "new profile" mode and Save always fails | 🟠 Medium — core action (save) permanently dead; page ships looking functional | `/profile` only | **BE** (build the endpoints) — or product decision to disable the page |
| 2 | Save failure is mislabelled `"Không thể lưu — kiểm tra kết nối"` (implies network, not a missing feature) | 🟡 Low — misleading UX | `/profile` only | FE (1 line) — only matters until Bug 1 is fixed |

---

## Bug 1 — 🟠 The profile endpoints do not exist in the backend

**Symptom.** A customer opens `/profile`, sees an empty form with a **"Tạo hồ sơ"** button, fills it
in, taps save, and gets a red toast `"Không thể lưu — kiểm tra kết nối"`. Nothing is ever saved. On
the next visit the form is empty again. The page *looks* like a working account screen but persists
nothing.

**Root cause — no route, no handler, no query.**
- The FE calls `GET /customer/profile`
  ([`useCustomerProfile.ts:30`](../../../../../fe/src/hooks/useCustomerProfile.ts#L30)) and
  `PUT /customer/profile`
  ([`useCustomerProfile.ts:48`](../../../../../fe/src/hooks/useCustomerProfile.ts#L48)), resolved
  against baseURL `…/api/v1`
  ([`api-client.ts:7`](../../../../../fe/src/lib/api-client.ts#L7)) →
  `GET|PUT /api/v1/customer/profile`.
- The router registers `v1 := r.Group("/api/v1")`
  ([`main.go:148`](../../../../../be/cmd/server/main.go#L148)) with child groups `auth`, `products`,
  `categories`, `toppings`, `combos`, `orders`, `payments`, `tables`, `staff`, `admin`
  ([`main.go:154-311`](../../../../../be/cmd/server/main.go#L154)). **There is no `/customer` group
  and no `/profile` route on any group.** A repo-wide grep for `profile` in `be/` matches only the
  staff `GET /auth/me` handler ([`auth_handler.go:105`](../../../../../be/internal/handler/auth_handler.go#L105));
  grep for `customer/profile`, `CustomerProfile`, `customer_profile` matches **nothing** — no handler,
  no service, no sqlc query, no migration/table.
- There is **no custom `NoRoute` handler** in `be/`, so both requests get Gin's default
  `404 page not found` (plain text — not the project JSON error envelope).

**What the FE does with the 404 (partly graceful, partly not).**
- The GET 404 is *handled deliberately*: `is404` flips the page into create mode — empty form, save
  bar enabled, label "Tạo hồ sơ"
  ([`page.tsx:19,69-74`](../../../../../fe/src/app/(shop)/profile/page.tsx#L19)). `retry` skips 404
  so there's no request storm ([`useCustomerProfile.ts:34-38`](../../../../../fe/src/hooks/useCustomerProfile.ts#L34)).
- The PUT 404 is *not* graceful: `onSuccess` (invalidate + `setCustomerName` + success toast) never
  runs; only `onError` fires
  ([`useCustomerProfile.ts:49-56`](../../../../../fe/src/hooks/useCustomerProfile.ts#L49)). So the
  save is a guaranteed failure and the would-be cross-page write
  (`settings.customerName`) never happens.

**Why this is groundwork, not an accident.** The page doc TL;DR calls it "groundwork for the
🔮 PLANNED online customer account (order from home)" — the FE was built ahead of the backend. That's
a legitimate strategy, but as shipped the page presents a fully interactive save flow that can never
succeed, which is worse than hiding it.

**Suggested fix.** Either (a) **build the BE** — a `customer` route group with
`GET /customer/profile` + `PUT /customer/profile`, a `customer_profiles` table + sqlc queries, and a
`customer`-role JWT (distinct from the staff hierarchy — see
[../../../02_spec/BUSINESS_RULES.md](../../../02_spec/BUSINESS_RULES.md) §1/§5); or (b) **product
decision** to gate the page behind a "coming soon" state until the online-account epic starts. Both
are real tasks — neither is a doc edit, and per CLAUDE.md a fix must be registered in
`docs/tasks/MASTER_TASK.md` + ALIGNed before any code is written.

---

## Bug 2 — 🟡 Save error message blames the network

**Symptom.** When save fails (which, given Bug 1, is *always*), the toast says
`"Không thể lưu — kiểm tra kết nối"` — telling the user to check their connection when the real cause
is that the feature has no backend.

**Root cause.** `useUpdateProfile.onError` returns one generic message regardless of status
([`useCustomerProfile.ts:54-56`](../../../../../fe/src/hooks/useCustomerProfile.ts#L54)). A 404
(endpoint missing) is indistinguishable from a network drop to the user.

**Suggested fix (FE, low priority).** This only matters until Bug 1 is resolved; once the endpoints
exist, the generic message is fine. If desired now, branch on `err.response?.status` to show a
distinct "tính năng chưa khả dụng" message for 404. Not worth doing independently of Bug 1.

---

## Next step

Neither bug is on [`docs/tasks/MASTER_TASK.md`](../../../../tasks/MASTER_TASK.md) yet. Per CLAUDE.md,
a fix must be **registered + ALIGNed** before any code change. **Recommended highest-impact item:**
Bug 1 — decide build-vs-disable for the customer profile backend; Bug 2 folds into whichever path is
chosen. Do not start either fix unprompted.
