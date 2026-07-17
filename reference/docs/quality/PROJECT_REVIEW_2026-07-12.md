# Project-Level Review & Suggestions — 2026-07-12

> **Scope:** the whole repo — repo hygiene, docs system, task backlog, testing debt, process.
> **Deliberately excluded:** code-level findings, already covered by the two sibling reports from today:
> - BE code → [`QA_BE_REPORT_2026-07-12.md`](QA_BE_REPORT_2026-07-12.md) (6 findings → Phase QA-BE registered)
> - FE sessions → [`FE_QUALITY_REVIEW_2026-07-12.md`](FE_QUALITY_REVIEW_2026-07-12.md) (4 findings + paste-ready fix prompts)
>
> Nothing here is registered in MASTER_TASK yet — every suggestion needs owner ALIGN first (per CLAUDE.md rule).

---

## Summary — 8 suggestions, ranked

| # | Suggestion | Severity | Effort |
|---|---|---|---|
| 1 | CLAUDE.md "Current Work" is stale and now **factually wrong** (filling column) | 🔴 misleads every new session | 0.2 |
| 2 | Verification debt is piling up — 4 "code-complete but never verified" items | 🔴 unknown real quality | — (prioritize P7-5.4) |
| 3 | 6 phases open in parallel — backlog needs a close-out sweep + ordering | 🟠 process | 0.3 |
| 4 | Repo root clutter: ~13 screenshots + 10 one-shot commit scripts + scratch files | 🟠 hygiene | 0.3 |
| 5 | Broken pointer: MASTER_TASK P-FEQA-2 → `docs/fe/quality_audit/` (doesn't exist) | 🟠 broken nav | 0.1 |
| 6 | Tests live in 3 places; `fe/src/__tests__/` is a stale never-run duplicate; 2 known-failing FE tests | 🟡 test debt | 0.5 |
| 7 | Quality docs now span 3 folders with no index — add a `docs/quality/README.md` | 🟡 nav | 0.2 |
| 8 | Drift needs one registry file instead of scattered session notes | 🟡 process | 0.3 |

---

## 1. 🔴 CLAUDE.md "Current Work" is stale — and part of it is now wrong

Read by every fresh session as ground truth, but:

- **Branch:** `CLAUDE.md:256` says `feature/fe-wireframe-build`; the actual branch is `docs/customer-menu-alignment`.
- **Factually wrong:** `CLAUDE.md:258-261` still describes the OC epic's `order_items.filling` column (migration 016) as the live design — but **migration `017_drop_order_item_filling.sql` dropped that column**, and `018_add_order_delivery_fields.sql` has landed since. A session that trusts this paragraph will code against a column that no longer exists.
- **Header:** "Phase Status (April 2026)" — 3 months old; QA-BE, DEPLOY, CHAT, FAV, P-FEQA phases don't appear at all.

**Suggestion:** rewrite the Current Work block (≤10 lines) as part of the next `/handoff`, and make "Current Work matches MASTER_TASK + actual branch" an explicit checklist item in the handoff skill. Long-term: keep Current Work down to *status + next 3 tasks + pointer to MASTER* so it goes stale slower.

## 2. 🔴 Verification debt — the recurring theme across every report today

Four separate items are all the same disease: *code shipped, gate skipped*:

| Item | State |
|---|---|
| FAV-5 (Suất tự tạo menu section) | code-complete since 2026-07-06, browser verify still pending |
| CHAT-6 live E2E | blocked on owner setting `ANTHROPIC_API_KEY` |
| Payment HMAC (vnpay·momo·zalopay) | zero tests, right before P7-7 sandbox (→ QA-BE-4) |
| P7-5.4 Playwright E2E | ⬜ not started — the one suite that would catch regressions across all of the above |

**Suggestion:** treat **P7-5.4 as the highest-leverage next task** — one E2E suite retires the FAV-5 manual verify, gives CHAT a harness, and is the prerequisite for P7-7/P7-8. Order: QA-BE wave (prompt is ready) → P7-5.4 → FAV-5 close-out rides along → P7-7.

## 3. 🟠 Six phases open in parallel

Currently 🔄: P7, DEPLOY (stage B), P-FEQA-2, CHAT (6/8/9/11), FAV-5, plus QA-BE ⬜ registered today. That contradicts the project's own one-active-task discipline and is exactly how FAV-5-style "pending verify" items get lost.

**Suggestion:** a 15-minute owner triage: for each open phase decide *close now / next / park*. Concretely — FAV-5 and P-FEQA-2 are closable within one session each; DEPLOY stage B and CHAT-6 are owner-blocked (mark 🔴 blocked, not 🔄, so they stop looking active); QA-BE + P7 are the real work queue.

## 4. 🟠 Repo root clutter

At repo root: **13 PNG screenshots** (`fav-*.png`, `cartbar-*.png`, `menu-*.png`, `suat-*.png`, …), **10 one-shot `commit-*.sh` scripts** (workaround for Claude's blocked git — but they're keepers-forever now), plus scratch files `note.md`, `guid.md`, `menu-snap*.yml`, `dev.sh`, `tree.sh`, an empty `test-results/` dir. `.gitignore` ignores none of the PNGs.

**Suggestion (one small task):**
1. Add to `.gitignore`: `/*.png` (root only), `commit-*.sh`, `e2e/test-results/`, `e2e/playwright-report/`.
2. Delete already-run commit scripts and stale screenshots (verify screenshots referenced by docs first — none appear to be).
3. Move `note.md` / `guid.md` content into their proper docs home or delete.
4. Going forward: screenshots → `.playwright-mcp/` or the scratchpad, never root.

## 5. 🟠 Broken pointer in MASTER_TASK

`docs/tasks/MASTER_TASK.md` (P-FEQA-2 row) tells the next session to apply findings from **`docs/fe/quality_audit/SUMMARY.md`** — that folder does not exist. The audit actually lives at **`docs/quality/quality_audit/SUMMARY.md`**. A session picking up P-FEQA-2 dead-ends immediately.

**Suggestion:** one-line fix in MASTER_TASK. While there, grep MASTER_TASK for other `docs/` paths and spot-check they resolve.

## 6. 🟡 Test layout is confusing and carries 2 known failures

- Canonical FE flow tests live inside **`docs/work_flow/`** (`client-qr-flow.test.ts`, `staff-order-flow.test.ts`) — tests inside a docs folder is surprising to anyone (and any tool) that looks in `fe/`.
- **`fe/src/__tests__/`** holds duplicates of those same two files that vitest never runs — pure trap.
- 2 FE tests are known-failing (orderNote/clearCart + CART_CONFIG key), noted as "pre-existing" for weeks. Known-red tests train everyone to ignore red.
- `e2e/` has its own package.json/config — fine — but its `test-results/` + `playwright-report/` output dirs aren't gitignored.

**Suggestion:** (a) delete `fe/src/__tests__/` duplicates; (b) either move the flow tests under `fe/` with vitest config updated, or leave them but add a README in `docs/work_flow/` saying "these are the live tests, run via `npm test`"; (c) fix or explicitly skip-with-comment the 2 failing tests so the suite is green.

## 7. 🟡 Quality docs need an index

Quality material now spans: `docs/quality/` (2 reports + 1 prompt + this file), `docs/quality/be_audit/` (6 files), `docs/quality/quality_audit/` (11 FE files). No README explains which is current, which is superseded, or how they relate to Phase QA-BE / P-FEQA-2.

**Suggestion:** add `docs/quality/README.md` — one table: file/folder · what it covers · date · status (active / applied / superseded) · linked MASTER phase. Update it whenever a new report lands (add to the quality-check skill's output steps).

## 8. 🟡 One drift registry instead of scattered notes

Verified doc-vs-code drift currently lives in session notes, memory, and individual reports: filling column dropped (mig 017) vs docs, rate-limit middleware documented but absent (QA-BE-3), MASTER phase-index vs row contradictions (FAV), `AGENT_OS_check.md`, orphaned `SaveSuatModal`, dead `ToppingModal`/`ComboModal` (GAP-3/4, owner will delete later), and now #1 and #5 above.

**Suggestion:** create `docs/DRIFT.md` — one row per verified drift: what docs say · what code does · which wins · fix task (if any). The 7-step workflow's SELF-REVIEW step already asks about drift; give it a single place to write the answer. Cheap to maintain, and it stops re-discovering the same drift every audit.

---

## Suggested execution order (after owner ALIGN)

1. **#1 + #5** — fix CLAUDE.md Current Work + MASTER pointer (one docs session, ~0.3)
2. **QA-BE wave** — already prompt-ready ([`QA_BE_PROMPT.md`](QA_BE_PROMPT.md))
3. **P7-5.4 E2E** — retires FAV-5 verify + gives CHAT/payment a harness (#2)
4. **#4 + #6 + #7** — hygiene sweep, one session
5. **#3 triage + #8 DRIFT.md** — owner decisions, 30 min

---

*Generated 2026-07-12 · branch `docs/customer-menu-alignment` · complements QA_BE_REPORT + FE_QUALITY_REVIEW of the same date*
