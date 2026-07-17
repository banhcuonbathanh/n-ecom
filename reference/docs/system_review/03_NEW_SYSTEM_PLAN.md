# New System Plan — your 4 wants, mapped

> Date: 2026-07-15. You asked for a new folder/system with:
> (1) flows for FE / BE / DevOps · (2) a place for questions that pop into your head ·
> (3) an index per domain so Claude has the necessary info · (4) Claude must understand
> the project so spec-vs-build drift (menu design vs built favourites) stops happening.

## ⚠️ FLAG — the most important suggestion in this record

**Do not build a third documentation system.** You already built #1 (`docs/claude_system/`)
and #2 (`docs/system/`), and the repo's own rule is *"one fact, one home."* A third home
means three places to drift instead of two. **3 of your 4 wants already exist** — the plan
below adds only the genuinely missing pieces, all *inside* `docs/system/`.

## Want → what exists → what to add

### Want 1 — "flows for FE, BE, DevOps"

| Flow type | Already exists | Gap |
|---|---|---|
| Business flows (customer/staff/order/payment) | [01_flow/](../system/01_flow/FLOW_INDEX.md) — CLIENT_FLOW, STAFF_FLOW, ORDER_STATE_MACHINE, PAYMENT_FLOW | None — complete |
| FE dev flow (how to build a page) | [05_dev_guide/NEW_PAGE_GUIDE.md](../system/05_dev_guide/NEW_PAGE_GUIDE.md) + `/dev-page` skill | None |
| BE dev flow (how to add an endpoint) | [03_be/BE_CODE_SUMMARY.md](../system/03_be/BE_CODE_SUMMARY.md) "add a new endpoint" checklist | Small: no equally explicit step-list like NEW_PAGE_GUIDE — **ADD** `05_dev_guide/NEW_ENDPOINT_GUIDE.md` (1 page: migration → sqlc → repo → service → handler → route → API_SPEC row → test) |
| DevOps flow (deploy/rollback/monitor) | [09_devops/](../system/09_devops/DEVOPS_INDEX.md) — GO_LIVE, MONITORING, MAC_TEST_SERVER_PLAN | None significant |

### Want 2 — "questions that pop into my head"

Nothing existed. **ADDED today:** [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) in this folder.
How to use: any time a question appears, write one line there (Vietnamese is fine).
Next session, tell Claude: `answer the open questions in docs/system_review/OPEN_QUESTIONS.md`.
Claude moves answered ones to the Answered section with links to proof.
If it proves useful, later move it to `docs/system/OPEN_QUESTIONS.md` so it lives with the handbook.

### Want 3 — "index for BE / FE / DevOps so Claude has necessary info"

Already exists, two layers deep:

| Domain | Handbook index | Deep index |
|---|---|---|
| BE | [03_be/](../system/03_be/BE_TECH_SUMMARY.md) | [docs/be/BE_DOC_INDEX.md](../be/BE_DOC_INDEX.md) + `docs/be/be_code_summary/` (5 files) |
| FE | [04_fe/](../system/04_fe/FE_TECH_SUMMARY.md) | `frontend-nextjs` skill router + [FE_SYSTEM_GUIDE](../fe/FE_SYSTEM_GUIDE.md) |
| DevOps | [09_devops/DEVOPS_INDEX.md](../system/09_devops/DEVOPS_INDEX.md) | `devops` skill |
| Everything | [AGENT_OS.md](../system/AGENT_OS.md) routing table + [CONTEXT_MAP](../claude_system/CONTEXT_MAP.md) | — |

**Gap: none in structure.** The real issue is freshness (stale `file:line` cites, stale
"Current Work"). Adding another index would not fix that — the P1/P2 loop in
[02_SUGGESTIONS_AND_COMMANDS.md](02_SUGGESTIONS_AND_COMMANDS.md) does.

### Want 4 — "spec in menu page vs built favourites differ — not good"

The detection tool exists and already caught your exact case:
[COMPARISON_TRACKER.md](../system/08_pages/COMPARISON_TRACKER.md) row `customer_favourites`
(🔴 wireframe's per-card `[+ Giỏ]` add-to-cart does not exist in code; 🔴 footer hidden
under bottom nav) and row `customer_menu` (doc still claims designs are "pending rebuild"
that are already built).

What's missing is **enforcement**, so ADD two things:

1. **A "Fixed?" column** in COMPARISON_TRACKER — every 🔴 must end as either a MASTER_TASK
   row ID (code bug) or a doc-fix commit (doc drift). No third state.
2. **A rule in `docs/system/README.md` Non-Negotiable Rules (#10):**
   *"Before building or changing any page, check its COMPARISON_TRACKER row. After building,
   if the wireframe no longer matches, update the wireframe in the same task — a task is not
   DONE while its page doc contradicts the code."* (`/finish-task` should check this.)

## Summary of actual additions (small, surgical)

| # | Add | Where | Status |
|---|---|---|---|
| A1 | OPEN_QUESTIONS.md | this folder | ✅ 2026-07-15 |
| A2 | NEW_ENDPOINT_GUIDE.md | [docs/system/05_dev_guide/NEW_ENDPOINT_GUIDE.md](../system/05_dev_guide/NEW_ENDPOINT_GUIDE.md) | ✅ 2026-07-15 |
| A3 | "Fixed?" column + close-the-loop rule | COMPARISON_TRACKER + README **rule #10** + `/finish-task` DoD checkbox | ✅ 2026-07-15 |
| A4 | 🔴 findings → MASTER_TASK rows | `docs/tasks/MASTER_TASK.md` — new **P-FIX** phase | ✅ 2026-07-15 |

Also done 2026-07-15: **P1-2** — checked `customer_menu.md`: the stale "pending rebuild" markers were
already fixed in a prior session (2026-07-06); re-verified all 5 rebuilt features against code, refreshed
provenance dates. **P2-2** — CLAUDE.md Current Work + Phase Status refreshed (stale OC/filling narrative
removed, phase table replaced by pointer to MASTER_TASK).
**Still open (owner decision):** trimming CLAUDE.md fully under its 150-line rule (~250 → needs cutting
live process sections like "Task Not on the List" — don't do this without owner review).

Everything else you asked for already exists — the win is using it, not rebuilding it.
