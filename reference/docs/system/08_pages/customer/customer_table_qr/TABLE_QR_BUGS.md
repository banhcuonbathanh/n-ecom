# Table QR Landing — Known Code Bugs (found during `/page-doc-set customer_table_qr`)

> **TL;DR:** 2 code-level issues surfaced while tracing `/table/:tableId` against source on branch
> `experience_claude.md_system_1`. These are **code** mismatches/robustness gaps, not stale docs —
> the doc skill does not touch app code. Neither is fixed yet. Logged in
> [../../../07_business_logic/LOGIC_INDEX.md Decision Log (2026-06-15)](../../../07_business_logic/LOGIC_INDEX.md#decision-log)
> and flagged in [customer_table_qr_be.md Flags 1 & (no-timeout)](customer_table_qr_be.md).
>
> Source files: `fe/src/app/table/[tableId]/page.tsx` · `fe/src/lib/api-client.ts` ·
> `be/internal/service/auth_service.go` · `be/internal/service/errors.go`.

---

## Severity at a glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | FE handles `TABLE_HAS_ACTIVE_ORDER` from `POST /auth/guest`, but the endpoint never emits it → dead "auto-join existing order" path. The error code is in fact **never returned anywhere in `be/`**, and `CreateOrder` allows concurrent orders per table (no guard at all). | 🟡 Low — dead UX path; **wider finding:** the one-active-order rule (BUSINESS_RULES §2.3) is unenforced in code | `/table/:tableId` re-scan + all 3 FE consumers of the code (`TableGrid.tsx:107`, `checkout/page.tsx:79`) — cross-cutting | BE (implement guard/auto-rejoin) **or** FE (remove dead branches) — needs product decision |
| 2 | No request timeout + no unmount abort → spinner can hang forever; setState on unmounted component | 🟡 Low — robustness | `/table/:tableId` (and any page using the shared axios client, for timeout) | FE |

---

## Bug 1 — 🟡 Dead `TABLE_HAS_ACTIVE_ORDER` branch on guest login

**Symptom.** A diner who re-scans the QR of a table that **already has a live order** is NOT routed
to that order. The FE has code that intends to redirect them to `/order/:active_order_id`, but it
never runs — they get a fresh guest session and land on `/menu` instead. They can then create a
**second independent order on the same table** — there is no guard to stop them (see below).

**Root cause — a consumer branch with no producer.**
- The FE catches the guest-login error and special-cases `TABLE_HAS_ACTIVE_ORDER`, redirecting to
  the active order:
  [`page.tsx:36-38`](../../../../../fe/src/app/table/[tableId]/page.tsx#L36).
- But `AuthService.GuestLogin`
  ([`auth_service.go:281-303`](../../../../../be/internal/service/auth_service.go#L281)) only does
  `GetTableByQRToken` + `GenerateGuestToken` — it performs **no active-order lookup** and can return
  only `ErrNotFound` (404) or a wrapped 500. It **never** returns `ErrTableHasActiveOrder`.
- `ErrTableHasActiveOrder` ([`errors.go:30`](../../../../../be/internal/service/errors.go#L30)) is
  **defined but never returned anywhere in `be/`** — confirmed by `grep -rn "ErrTableHasActiveOrder" be/`
  (only the definition line appears). So the *other* two FE consumers of this code are **also dead**:
  [`TableGrid.tsx:107`](../../../../../fe/src/app/TableGrid.tsx#L107) and
  [`checkout/page.tsx:79`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L79).
- `CreateOrder` ([`order_service.go:256-275`](../../../../../be/internal/service/order_service.go#L256))
  treats an existing active order as **informational only** (a `tableBusy bool` flag) and, per its
  own comment, "never blocks creation" — the handler returns `201` with `table_busy: true`
  ([`order_handler.go:121`](../../../../../be/internal/handler/order_handler.go#L121)), **not** a 409.
  So the one-active-order rule in [BUSINESS_RULES §2.3](../../../02_spec/BUSINESS_RULES.md#23-one-active-order-per-table)
  ("Server returns 409 `TABLE_HAS_ACTIVE_ORDER` if violated") is **unenforced in code** — a
  cross-cutting drift flagged to the owner and annotated in §2.3.

**Suggested fix (needs a product decision — register + ALIGN first).**
- **Option A (BE, better UX, likely the original intent):** in `GuestLogin`, after resolving the
  table, look up an active order for that table; if one exists, return `ErrTableHasActiveOrder` with
  `details.active_order_id` so the FE auto-joins it. This realises the "scan → see your running
  order" flow the FE already anticipates and aligns with BUSINESS_RULES §2.3.
- **Option B (FE, smallest):** delete the dead branch (`page.tsx:36-38`) so the code stops implying
  a behaviour that does not exist.

Recommend **Option A** if the owner wants scan-to-rejoin; otherwise Option B to keep the code honest.

---

## Bug 2 — 🟡 No request timeout, no unmount abort

**Symptom.** If `POST /auth/guest` hangs (slow network, BE stall), the page shows the
"Đang tải menu…" spinner **forever** — there is no timeout, no error fallback, no retry. Separately,
navigating away mid-flight can call `setError`/`router.replace` on an unmounted component.

**Root cause.**
- The shared axios client is created with **no `timeout`**:
  [`api-client.ts:6-9`](../../../../../fe/src/lib/api-client.ts#L6) (`axios.create({ baseURL,
  withCredentials })` — no `timeout` key, no timeout interceptor).
- The page's `useEffect` ([`page.tsx:16-44`](../../../../../fe/src/app/table/[tableId]/page.tsx#L16))
  has **no cleanup / `AbortController`**, so an in-flight promise resolves against a possibly
  unmounted component.

**Suggested fix (FE).** Add a sane `timeout` to the axios client (affects all calls — verify no
long-poll/SSE relies on the absence), and/or wrap this call with an `AbortController` cleaned up in
the effect's return. Low priority — the happy path is sub-second.

---

## Next step

Neither bug is on `docs/tasks/MASTER_TASK.md`. Per CLAUDE.md a fix task must be registered + ALIGNed
before any code change. Recommended first: **Bug 1**, but it needs the owner's product call
(auto-rejoin vs. remove the dead branch) before it can be sized.
