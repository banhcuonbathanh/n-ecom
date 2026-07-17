# Public Landing (`/`) — Code Bugs Found During the BE Trace

> **TL;DR:** 3 code bugs surfaced while tracing the landing page on branch
> `experience_claude.md_system_1`. **These are *code* bugs, not stale docs** — a doc edit cannot fix
> them; only an app-code change can, and the `/page-doc-set` skill does not touch app code. They are
> recorded here for the owner to register + ALIGN before any fix.
> BE anchor → [public_landing_be.md](public_landing_be.md) ·
> Decision Log entry → [../../../07_business_logic/LOGIC_INDEX.md](../../../07_business_logic/LOGIC_INDEX.md).

---

## Severity at a Glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | `/api/dev/run` runs host shell commands with no auth + no prod guard | 🔴 High | Next.js route reachable from public `/` (cross-cutting: any browser) | FE (Next) |
| 2 | Hero "Thử Menu Khách" + Footer "Demo Khách" link to `/table/1` → 400 error screen | 🟠 Med | Landing CTAs → C3 `/table/:tableId` | FE |
| 3 | SimulateBtn `TABLE_HAS_ACTIVE_ORDER` branch is dead | 🟡 Low | SimulateBtn (cross-cutting: shared root with C3 + C8) | FE (or BE product decision) |

---

## Bug 1 — `/api/dev/run` executes shell commands with no authentication and no production guard

**Severity:** 🔴 High (security) · **Fix side:** FE (Next.js)

**Symptom.** Anyone who can reach the landing page `/` can POST to the Next.js route
`/api/dev/run` and trigger one of three host shell commands — re-seed the database or rebuild the BE
/ FE containers — with no login required.

**Root cause.** The route handler `POST /api/dev/run`
([`fe/src/app/api/dev/run/route.ts:13-33`](../../../../../fe/src/app/api/dev/run/route.ts)) validates
only that `cmd` is one of the whitelisted keys (`seed` / `build-be` / `build-fe`,
[`route.ts:7-11`](../../../../../fe/src/app/api/dev/run/route.ts)) and then `exec`s the mapped
command on the host (`exec(command, { cwd: REPO_ROOT, timeout: 300_000 }, …)`,
[`route.ts:23`](../../../../../fe/src/app/api/dev/run/route.ts)). There is **no authentication, no
`process.env.NODE_ENV !== 'production'` gate, and no CSRF check**. The trigger UI (DevPanel) is
rendered unconditionally on the public landing page
([`fe/src/app/page.tsx:102-106`](../../../../../fe/src/app/page.tsx),
[`fe/src/components/shared/DevPanel.tsx:30-34`](../../../../../fe/src/components/shared/DevPanel.tsx)).
The command set is fixed (not arbitrary RCE), but re-seeding the DB or kicking a rebuild on demand,
unauthenticated, is a denial-of-service / data-loss vector if this ever ships to a reachable
environment.

**Suggested fix (smallest safe change).** Gate the route on environment at the top of the handler:
`if (process.env.NODE_ENV === 'production') return NextResponse.json({error:'disabled'},{status:404})`,
**and/or** require a staff session (the route currently reads no auth). Pair it with hiding `DevPanel`
behind the same env check in `page.tsx`. This is a Next.js-side change only — no Go BE involvement.

---

## Bug 2 — Hero + Footer "demo customer" CTAs point at an invalid QR token (`/table/1`)

**Severity:** 🟠 Med · **Fix side:** FE

**Symptom.** The Hero's secondary CTA **"Thử Menu Khách"** and the Footer's **"Demo Khách"** link
both navigate to `/table/1`. Instead of opening the customer menu, the visitor lands on the
`/table/:tableId` error screen ("Mã bàn không hợp lệ hoặc đã hết hạn. Vui lòng quét lại QR.").
The *table cards* in TableGrid work (they use real 64-char tokens); only these two generic shortcuts
are broken.

**Root cause.** The CTAs hardcode `<Link href="/table/1">`
([`fe/src/app/page.tsx:135`](../../../../../fe/src/app/page.tsx) Hero,
[`page.tsx:305`](../../../../../fe/src/app/page.tsx) CTA section,
[`page.tsx:326`](../../../../../fe/src/app/page.tsx) Footer). The `/table/:tableId` page sends
`params.tableId` verbatim as the `qr_token` to `POST /auth/guest`, which binds
`qr_token` with `binding:"required,len=64"` — **any length ≠ exactly 64 chars fails binding → 400**
(consumer/producer traced in
[customer_table_qr_be.md §1 + Error Behaviour](../../customer/customer_table_qr/customer_table_qr_be.md)).
`"1"` is 1 char → 400 → the page's generic error screen
([`fe/src/app/table/[tableId]/page.tsx`](../../../../../fe/src/app/table/%5BtableId%5D/page.tsx) error
branch). So the most prominent "try the customer flow" buttons dead-end.

**Suggested fix.** Point the demo CTAs at a real seeded table token (the same 64-char value used by
"Bàn 01" in `page.tsx:47`), or route them to a picker, or make `/table/1` resolve a known demo table
server-side. FE-only.

---

## Bug 3 — SimulateBtn `TABLE_HAS_ACTIVE_ORDER` branch is dead (shared root with C3 + C8)

**Severity:** 🟡 Low · **Fix side:** FE (or a BE product decision)

**Symptom.** "Giả lập khách" on a table that already has an open order is *meant* to detect
`TABLE_HAS_ACTIVE_ORDER` and jump to the existing order
([`fe/src/app/TableGrid.tsx:107-113`](../../../../../fe/src/app/TableGrid.tsx)). That branch never
fires — instead a **second parallel demo order** is created and the user is navigated to the new one.

**Root cause.** `ErrTableHasActiveOrder`
([`be/internal/service/errors.go:30`](../../../../../be/internal/service/errors.go)) is **defined but
returned by no code path in `be/`** (grep → definition only). `CreateOrder`
([`be/internal/service/order_service.go:269-275`](../../../../../be/internal/service/order_service.go))
treats a busy table as informational (`tableBusy=true`) and **never blocks creation**; the handler
returns `201` + `table_busy`
([`be/internal/handler/order_handler.go:121`](../../../../../be/internal/handler/order_handler.go)).
SimulateBtn reads `resp.data.error` (looking for the dead code) and `resp.data.message`, but **not**
`data.table_busy`, so the busy state is invisible. This is the **same dead-branch root** documented
for C3 ([TABLE_QR_BUGS.md Bug 1](../../customer/customer_table_qr/TABLE_QR_BUGS.md)) and C8
([CHECKOUT_BUGS.md Bug 2](../../customer/customer_checkout/CHECKOUT_BUGS.md)) — three FE consumers,
zero live producers.

**Suggested fix.** A product decision (already open from C3/C8): either enforce the one-active-order
guard in `CreateOrder` (return `ErrTableHasActiveOrder` / 409) so all three FE branches become live,
**or** remove the dead branches and surface `table_busy`. For this demo page specifically, the
current behaviour (make a new order, go to it) is acceptable, so it is the lowest-priority of the
three call sites.

---

## Next Step

None of these are on [`docs/tasks/MASTER_TASK.md`](../../../../../docs/tasks/MASTER_TASK.md) yet. Per
CLAUDE.md, a fix must be **registered + ALIGNed** before any code change. **Recommended first: Bug 1**
(🔴 — a one-line env guard removes a real unauthenticated-RCE-adjacent surface before go-live). Bug 2
is a quick, high-visibility FE fix. Bug 3 folds into the existing cross-page one-active-order decision.
