# PROJECT_RISK_REGISTER.md — Project-Level Risk Register

> **Purpose:** track *project-level* risks (business · technical · operational · security · schedule),
> each with likelihood × impact, an owner, a mitigation, and a contingency.
>
> **One fact, one home.** This doc owns the project risk register.
> - Per-change *dev* risk (blast radius of a code edit) → `RISK_MATRIX.md` (sibling).
> - Deploy SLA + severity (P0/P1/P2) → `docs/devops/ROLLBACK_PLAN.md` (this doc reuses it, does not redefine it).
> - How to undo a bad deploy → `docs/devops/ROLLBACK_PLAN.md`.
> - First-deploy procedure → `docs/GOLIVE_RUNBOOK.md`.
>
> **Version:** v1.0 · 2026-06-06 · Owner: Owner

---

## Operating profile (the assumptions this register is scored against)

| Input | Value | Effect on scoring |
|---|---|---|
| Go-live deadline | **None fixed** | Schedule-slip risk → **Low** |
| Scale at launch | **Busy single venue** (one location, high peak volume) | Realtime/SSE + order-throughput risk → **elevated** |
| Production operator | **Owner solo** (VPS, backups, on-call) | Bus-factor / ops-continuity risk → **High, top priority** |
| Money per incident | **Low** (small orders) | Payment-error *impact* → **Medium** (volume, not size, is the concern) |

> If any of these change, re-score the affected rows. The profile is the lens — change the lens, the picture changes.

---

## How to use

1. Each risk has **L** (likelihood) and **I** (impact), each Low / Med / High.
2. **Priority** = L × I via the matrix below. Work the High rows first.
3. Every row has an **owner**, a **mitigation** (reduce L or I *before* it happens) and a **contingency** (what to do *when* it happens).
4. Review this doc at each phase boundary and after any P0/P1 incident. Update L/I/Status — never delete a closed risk, mark it `Closed` so the history stays.

### Priority matrix (L × I)

| | **I = Low** | **I = Med** | **I = High** |
|---|---|---|---|
| **L = High** | 🟡 Med | 🔴 High | 🔴 High |
| **L = Med** | 🟢 Low | 🟡 Med | 🔴 High |
| **L = Low** | 🟢 Low | 🟢 Low | 🟡 Med |

---

## Register

### 🔴 High priority

| ID | Risk | L | I | Owner | Mitigation (before) | Contingency (when it happens) | Status |
|---|---|---|---|---|---|---|---|
| R-01 | **Bus factor — solo operator.** Owner is sole person who can deploy, restore DB, or respond on-call. Illness/absence = system unrecoverable. | High | High | Owner | Write a 1-page "break-glass" runbook (VPS access, restart, restore steps) and store credentials in a password manager a trusted person can reach. Automate backups (R-02). | Hand the break-glass doc to the trusted contact; restore from last backup per `ROLLBACK_PLAN.md`. | 🔴 Open |
| R-02 | **Data loss — no verified DB backup.** A bad migration, disk failure, or `docker compose down -v` wipes orders/payments with no restore. | Med | High | Owner | Nightly automated `mysqldump` to off-VPS storage; **test a restore** at least once before go-live. Document retention. | Restore latest dump; reconcile any orders lost in the gap from POS/paper. | 🔴 Open |
| R-03 | **Realtime/SSE under load.** Busy venue → many concurrent KDS/POS clients on SSE. Connection storms or a dropped stream leave staff with a stale board mid-rush. | Med | High | BE + FE | Verify SSE auto-reconnect + a polling fallback exist; load-test SSE at expected peak client count (`MASTER_v1.2.md §5`). | Staff manually refresh KDS/POS; fall back to verbal/paper order relay until reconnect. | 🔴 Open |
| R-12 | **Silent regression from new work.** A feature added in a *later session* changes shared logic (order total, status machine, pricing, auth) and breaks an *existing* path. The app still builds and runs — no crash, no error — so the bug ships unnoticed (e.g. R-05 combo double-count: a wrong **total**, not a failure). Each fresh session starts without memory of why the old code was shaped that way. | High | High | BE + FE | **Regression safety net is the only real defence** — silent bugs can't be caught by eyeball review. (1) Build & keep a characterization test suite on the money/state-critical paths: order `total_amount` end-to-end (not stubbed — see R-05 path-to-Kill), status transitions, auth/JWT, combo/topping pricing. (2) **CI gate blocks merge on any test failure** (R-06). (3) Make "run full `go test ./...` + `npm test` and paste results" a mandatory line in SELF-REVIEW before commit/handoff — green suite, not "it runs", is the bar. (4) Funnel shared logic through one builder so there's one place to test (the `order-payload.ts` pattern from OC-3). (5) `/quality-check` + `/code-review` on the diff each session to catch logic drift the tests don't yet cover. | Identify the regressing commit via the green→red test that now fails (or `git bisect` if untested); roll back to the last good image tag (`ROLLBACK_PLAN.md`); fix forward with a test that locks the broken case before redeploy. | 🔴 Open |

### 🟡 Medium priority

| ID | Risk | L | I | Owner | Mitigation (before) | Contingency (when it happens) | Status |
|---|---|---|---|---|---|---|---|
| R-04 | **Payment webhook never arrives / arrives twice.** VNPay/MoMo webhook lost, delayed, or duplicated → order stuck unpaid or double-counted. (Per-incident money is small, but volume makes it frequent.) | Med | Med | BE | Idempotent webhook handler (already a concern in `Spec_5_Payment_Webhooks`); a reconcile job that polls provider for pending orders. Finish **P7-7 sandbox** before live payments. | Staff mark-paid manually in POS; reconcile against provider dashboard end of day. | 🟡 Open |
| R-05 | **Order state inconsistency.** Combo/topping pricing or status transitions drift between FE cart and BE (the OC epic fixed the known double-count; regressions possible). | Med | Med | BE + FE | Keep the single `order-payload.ts` builder as the only POST path; add tests on the order total + state machine (`order-flow` skill rules). | Correct the order in POS; refund/adjust manually; hot-fix and redeploy. | 🟡 Open — combo double-count **Reduced** (see Treatment log); status-transition drift untreated |
| R-06 | **Auto-deploy with no staging.** Push to `main` triggers CI/CD straight to prod. A bad merge ships to a live venue mid-service. | Med | Med | DevOps | Branch protection on `main`; deploy outside service hours; keep previous 2 image tags for instant rollback (`ROLLBACK_PLAN.md §2`). | Roll back to previous image tag per `ROLLBACK_PLAN.md`. | 🟡 Open |
| R-07 | **Incomplete pre-launch testing.** Phase 7 still open: P7-5.4 E2E, P7-7 payment sandbox, P7-8 UAT not done. Launching before these = unknown failure modes. | Med | Med | Owner | Treat P7-5.4 / P7-7 / P7-8 as go-live blockers; no production payment until P7-7 passes. | If a gap surfaces live, drop the affected feature (e.g. disable online pay, cash only) until fixed. | 🟡 Open |
| R-08 | **Redis dependency.** Sessions/realtime lean on Redis Stack. Redis down → auth or KDS/POS realtime breaks. | Low | High | DevOps | Redis in Docker with restart policy + healthcheck; monitor memory; persistence enabled. | Restart Redis container; if data lost, users re-login, streams reconnect. | 🟡 Open |

### 🟢 Low priority (watch, don't act yet)

| ID | Risk | L | I | Owner | Mitigation | Contingency | Status |
|---|---|---|---|---|---|---|---|
| R-09 | **QR ↔ table mapping wrong.** A printed QR points to the wrong table → order shows on wrong table. | Low | Med | FE + Owner | Verify each table's QR once at setup; print labels from the Marketing page only. | Staff reassign the order to the correct table in POS. | 🟢 Open |
| R-10 | **Auth/JWT expiry mid-shift.** Staff token expires during a long shift → forced re-login at a bad moment. | Low | Low | BE | Confirm refresh-token flow + sensible TTLs (`MASTER_v1.2.md §6`). | Staff re-login; order data is server-side, nothing lost. | 🟢 Open |
| R-11 | **Schedule slip.** No fixed deadline, so slipping has little cost — listed for completeness. | Low | Low | Owner | Keep MASTER_TASK current so scope is visible. | Re-prioritise; no external commitment to miss. | 🟢 Open |

---

## Risk treatment log — follow each risk to its end

> The register (above) says *what could go wrong*. This log says *what we did about it and whether it worked*.
> Open a record here the moment a risk is acted on or actually occurs. Process → `GUIDE_RISK.md`.

**The three outcomes — "is the risk killed or not?"**

| Outcome | Meaning | Residual risk | Register status |
|---|---|---|---|
| **Killed** (eliminated) | Root cause removed — the risk *can no longer occur*. | None | `Closed` |
| **Reduced** (mitigated) | L or I lowered, but the risk still exists smaller. | Yes — re-score & keep watching | `Open` (new lower priority) |
| **Accepted** | Can't reduce further; owner consciously accepts it. | Yes — documented, monitored | `Open` (Accepted) |

> A mitigation **does not** automatically kill a risk. Most mitigations only *reduce* it → a **residual risk** remains. Always re-score after treating, then decide: Killed / Reduced / Accepted.

### Treatment record template (copy per treated risk)

```
### R-NN — <risk title>
- Triggered:  <date — did it actually occur, or is this a proactive review?>
- Root cause (why it happened): <the real cause, not the symptom>
- Treatment (how it was solved):  <action taken + task id>
- Verified by: <test / drill / observation that proves the mitigation works>
- Outcome: Killed | Reduced | Accepted
- Residual risk: L=_ I=_ → <priority>      (omit if Killed)
- New status: Closed | Open(lower) | Open(Accepted)
```

### Treated risks

| ID | Date | Root cause (why) | Treatment (how) | Outcome | Residual L×I | Status |
|---|---|---|---|---|---|---|
| R-05 | 2026-06 | Combo price counted twice: the combo **header row** carried the combo price **and** each sub-item row was also priced. The total sums every row → +1 extra combo. | OC-2 forced the header price to **0** (label only; sub-items carry the money); OC-3 funneled all 3 cart→POST paths through one `order-payload.ts` builder. | **Reduced** | L=Low × I=Med → 🟢 Low | Open (lower) |

#### R-05 — Combo double-count — full treatment record

**1. What broke (the symptom)**
A real order's total showed **72,000đ** when the correct price was **42,000đ** — overcharged by 30,000đ.

**2. Why it happened (root cause)**
A combo is not one row. `expandCombo` ([be/internal/service/order_service.go:386](be/internal/service/order_service.go#L386)) splits one combo into:
- **1 header row** — just a grouping label ("Combo Gia Đình")
- **N sub-item rows** — the dishes inside, each with its own price

The order total is computed by summing **every** row. The bug: the **header row also carried the combo's price**, so the combo was counted twice:

```
ROW                       PRICE
─────────────────────────────────
header  "Combo Gia Đình"  30,000   ← BUG: a label should not carry money
  sub-item  Bánh Cuốn      …  ┐
  sub-item  Chả Lụa         …  ┘ = 42,000   ← the real combo contents
─────────────────────────────────
TOTAL                     72,000   = 42,000 + 30,000 (duplicate)
```

One sentence: **price ownership was ambiguous** — both the header and its sub-items claimed the combo's price, and a sum-every-row total added it twice.

**3. How it was solved (treatment)**
- **OC-2** — force the combo header price to **0** ([order_service.go:404](be/internal/service/order_service.go#L404)). The header is now a label only; sub-items are the single source of price. → `header(0) + 42,000 = 42,000` ✅
- **OC-3** — route all 3 cart→POST paths (menu / checkout / add-to-order) through one builder, `fe/src/lib/order-payload.ts`, so no single path can rebuild the payload wrongly.

**4. Verified by**
- The reported order recomputed correctly: **72k → 42k**.
- A unit test asserts the guard: combo header `unit_price == "0"` ([order_service_test.go:255](be/internal/service/order_service_test.go#L255)).

**5. Killed or not? → Reduced, not Killed**
- ✅ The **mechanism** (header price = 0) is enforced in code **and** covered by a test.
- ❌ The **final summed total** is **not** tested end-to-end — `recalculateTotalAmount` is stubbed in unit tests ([order_service_test.go:99](be/internal/service/order_service_test.go#L99) returns `nil`), so nothing asserts the real total adds up.

So the exact failure is guarded, but a *different* future change to the sum logic could still produce a wrong total unnoticed. → **residual remains.**

**6. Residual risk**
L=Low (one builder + header-price test make it hard to reintroduce) × I=Med (a wrong total is still real money) → **🟢 Low**.

**7. To fully KILL it (move to Closed)**
Add a test that builds a combo order and asserts the **summed `total_amount`** equals the expected price (not just the header flag). When that passes, re-score I↓ and set R-05 → `Closed`.

**Status:** Open (lower) — residual tracked, not eliminated.

---

## Review log

| Date | Reviewer | Change |
|---|---|---|
| 2026-06-06 | Owner | v1.0 — register created. Profile: no deadline · busy single venue · solo operator · low per-incident money. 3 High / 5 Med / 3 Low. |
| 2026-06-06 | Owner | Treatment log opened. R-05 combo double-count treated (OC-2/OC-3) → **Reduced**, residual 🟢 Low. Not Killed — needs a combo-total test to close. |
| 2026-06-06 | Owner | R-05 record corrected after code trace: the header-price=0 **guard is tested** (order_service_test.go:255), but the **summed total is not** (recalc stubbed). Path-to-Kill sharpened to "assert summed `total_amount`". |
| 2026-06-07 | Owner | Added **R-12 — silent regression from new work** (🔴 High). Generalises the R-05 class: later-session feature changes shared logic, app still runs, bug ships unseen. Defence = regression test net + CI gate + mandatory green-suite check in SELF-REVIEW. |
