# AGENT_OS — The Single Entry Point for Any Agent

> **TL;DR (read this first, every task):** This is the **router**. You do not start a task by
> guessing which doc to read — you look it up here. For your task type, this file tells you
> exactly: (1) what to READ, (2) which SKILL to run, (3) what to UPDATE before the task is DONE.
> The OS is the loop: **Classify → Read → Plan → Align → Build → Verify → Log → Done.**
> If a step has no row here, follow [§ No Route Exists](#-no-route-exists). One model, one home —
> this file owns *routing*, not content; every cell links to the doc that owns the detail.

> **Status: canonical.** This file is the agent entry point for the handbook. It does not override
> [CLAUDE.md](../../CLAUDE.md), [PROCEDURE_INDEX](../PROCEDURE_INDEX.md), or the [README](README.md) —
> it collapses their navigation logic into one routing table and binds each task type to a skill and
> a closing gate. The loop is executed by two skills: `/start-task` (Classify → checkpoint → scope
> contract) and `/finish-task` (the Definition of Done gate).

---

## The 5 Layers (what an Agent OS is)

An agent needs five things to work without being babysat. You already have all five — this file
just names them and points at their home.

| # | Layer | Question it answers | Home (already exists) |
|---|---|---|---|
| 1 | **Standards** | *How* do we build? | [02_spec/](02_spec/) · [03_be/](03_be/) · [04_fe/](04_fe/) · [README § Non-Negotiable Rules](README.md#non-negotiable-rules-apply-to-every-page-every-endpoint) |
| 2 | **Product** | *What* are we building & why? | [00_overview/SYSTEM_OVERVIEW.md](00_overview/SYSTEM_OVERVIEW.md) · [../tasks/MASTER_TASK.md](../tasks/MASTER_TASK.md) · [07_business_logic/LOGIC_INDEX.md](07_business_logic/LOGIC_INDEX.md) |
| 3 | **Specs** | What's the contract for *this* feature? | [../spec/](../spec/) · [08_pages/](08_pages/PAGES_INDEX.md) doc-sets |
| 4 | **Workflow** | What loop do I run on *every* task? | [CLAUDE.md 7-step](../../CLAUDE.md) · [../PROCEDURE_INDEX.md](../PROCEDURE_INDEX.md) · the skills below |
| 5 | **Memory / Feedback** | What did we learn / where did code drift? | [07_business_logic/LOGIC_INDEX.md § Decision Log](07_business_logic/LOGIC_INDEX.md#decision-log) · [../base/LESSONS_LEARNED_v3.md](../base/LESSONS_LEARNED_v3.md) |

---

## The OS Loop (every task, no exceptions)

```
1. CLASSIFY   → find your row in the Routing Table below
2. READ       → only the docs that row names (not the whole handbook)
3. PLAN       → check ../PROCEDURE_INDEX.md for the procedure
4. ALIGN      → show plan + exact file list (scope contract); wait for owner OK
5. BUILD      → checkpoint commit first; touch only the listed files
6. VERIFY     → run the row's verification gate
7. LOG        → update the row's "Update on done" target
8. DONE       → only when the Definition of Done (below) is fully met
```

This is the same 7-step workflow in [CLAUDE.md](../../CLAUDE.md) with two explicit bookends:
**Classify** at the front (so you read the *right* docs) and **Log** at the back (so the loop closes).

---

## Routing Table — task type → READ → SKILL → UPDATE

Find your task. The columns are the only files you touch in each phase.

| Task type | READ (Standards + Spec) | SKILL to run | VERIFY gate | UPDATE on done |
|---|---|---|---|---|
| **New FE page** | [04_fe/DESIGN_SYSTEM](04_fe/DESIGN_SYSTEM.md) · [STATE_MANAGEMENT](04_fe/STATE_MANAGEMENT.md) · [DATA_COMMUNICATION](04_fe/DATA_COMMUNICATION.md) · its [01_flow/](01_flow/FLOW_INDEX.md) doc · [05_dev_guide/NEW_PAGE_GUIDE](05_dev_guide/NEW_PAGE_GUIDE.md) | `/wireframe` → `/excalidraw` → `/dev-page` | `/dev-page` Phase 4 (screenshot vs. excalidraw + click-test) | [08_pages/PAGES_INDEX](08_pages/PAGES_INDEX.md) + page doc-set |
| **Change existing FE page** | the page's `08_pages/<page>/` doc-set · [04_fe/](04_fe/) rule that applies | `/dev-page` (audit→gapfill) · `frontend-nextjs` rules | `/dev-page` Phase 4 + `/quality-check` | page doc-set + [LOGIC_FE](07_business_logic/LOGIC_FE.md) if logic changed |
| **New BE endpoint** | [03_be/BE_TECH_SUMMARY](03_be/BE_TECH_SUMMARY.md) · [02_spec/API_SPEC](02_spec/API_SPEC.md) · [ERROR_SPEC](02_spec/ERROR_SPEC.md) · [BE_CODE_SUMMARY](03_be/BE_CODE_SUMMARY.md) | `backend-go` rules | `go build ./...` + service test | [02_spec/API_SPEC](02_spec/API_SPEC.md) · page `<page>_be.md` |
| **DB / schema change** | [02_spec/DB_SCHEMA](02_spec/DB_SCHEMA.md) + migrations | `db-migration` | `sqlc generate` + `go build ./...` | [02_spec/DB_SCHEMA](02_spec/DB_SCHEMA.md) |
| **Orders / payment / cancel** | [01_flow/ORDER_STATE_MACHINE](01_flow/ORDER_STATE_MACHINE.md) · [02_spec/BUSINESS_RULES](02_spec/BUSINESS_RULES.md) · [07_business_logic/](07_business_logic/LOGIC_INDEX.md) | `order-flow` (read FIRST) | service test + flow walk-through | [LOGIC_INDEX Decision Log](07_business_logic/LOGIC_INDEX.md#decision-log) |
| **Caching / stale data** | [10_caching/CACHING_INDEX](10_caching/CACHING_INDEX.md) · [03_be/REDIS_CACHE](03_be/REDIS_CACHE.md) | `backend-go` | invalidation-trigger check | [03_be/REDIS_CACHE](03_be/REDIS_CACHE.md) |
| **Realtime (SSE/WS)** | [03_be/REALTIME_SSE](03_be/REALTIME_SSE.md) · [02_spec/API_SPEC §10](02_spec/API_SPEC.md) | `backend-go` / `frontend-nextjs` | live event test | affected page doc-set |
| **Bug fix** | the domain spec/page doc-set (if any) + the code | domain skill (`backend-go`/`frontend-nextjs`/`order-flow`) | `/verify` on the live app | [LOGIC Decision Log](07_business_logic/LOGIC_INDEX.md#decision-log) if behaviour changed |
| **Refactor (no new behaviour)** | the existing code only | — | existing tests still green | — (no spec read needed) |
| **DevOps / infra / CI** | [09_devops/DEVOPS_INDEX](09_devops/DEVOPS_INDEX.md) + compose/config | `update-config` if settings.json | the relevant up/build/deploy command | [09_devops/](09_devops/DEVOPS_INDEX.md) doc |
| **Page documentation** | [08_pages/PAGE_FOLDER_GUIDE](08_pages/) standard | `/page-doc-set` · `/status-routing-reference` | doc-set completeness vs. code | [08_pages/PAGES_INDEX](08_pages/PAGES_INDEX.md) + README/BE_DOC_TRACKER |
| **AI feature (chatbot/voice/CV)** | [11_ai/README](11_ai/README.md) + the layer-1 Standards | (plan first) | per-plan AC | [11_ai/](11_ai/README.md) plan file |
| **Close a session** | — | `/handoff` (or `/hand-off`) | git status clean check | TASKS / CLAUDE.md / LESSONS |

> Full task-type → procedure detail (specs vs. no-spec, in-TASKS vs. not) lives in
> [../PROCEDURE_INDEX.md](../PROCEDURE_INDEX.md). This table adds the **skill** and **verify/log**
> columns that turn a procedure into a closed loop.

---

## Definition of Done (the closing gate)

A task is **not DONE** until every box is checked. This is what turns the handbook into an *OS*:
the loop is only closed when feedback is written back.

- [ ] Acceptance criteria from the spec / wireframe are met and demonstrated.
- [ ] The **VERIFY gate** for the task row ran and passed (test / `/dev-page` Phase 4 / `/verify`).
- [ ] Only the files in the **scope contract** were changed (no adjacent edits).
- [ ] The task's **UPDATE-on-done** target was written (spec / page doc / Decision Log).
- [ ] If code disagreed with a doc → **code wins**: doc fixed **and** a ⚠️ DRIFT entry added to the
      [LOGIC Decision Log](07_business_logic/LOGIC_INDEX.md#decision-log) (Rule #8).
- [ ] [../tasks/MASTER_TASK.md](../tasks/MASTER_TASK.md) row status updated.

> This gate is executed by the **`/finish-task`** skill — it runs the checklist, finds the right
> UPDATE target from the routing table, and refuses to declare DONE until every box is checked.
> The opening half of the loop (Classify → checkpoint → scope contract) is **`/start-task`**.

---

## No Route Exists

If your task type has no row above **and** no row in [../PROCEDURE_INDEX.md](../PROCEDURE_INDEX.md):

1. **Do not read code or specs yet.** Prefix `❓ CLARIFY` and ask the owner: what does it do, which
   flow/screen, what existing code/API it reuses.
2. Co-create the AC and decide if a new spec/wireframe is needed.
3. Register the task in [../tasks/MASTER_TASK.md](../tasks/MASTER_TASK.md) (`< 100k` token rule —
   split if it spans 3+ files or 3+ scenarios).
4. Add the new task type as a row **here** and in [../PROCEDURE_INDEX.md](../PROCEDURE_INDEX.md).
5. Then run the OS loop from step 2 (READ).

---

## How This File Stays Honest

- It owns **routing only** — never copy spec/schema/rule content into this table; link to the home.
- When a new skill or doc folder is added → add/adjust one row here in the same change.
- When the loop fails (agent read the wrong doc, skipped verify, forgot to log) → that's a routing
  gap: fix the row here and note it in [../base/LESSONS_LEARNED_v3.md](../base/LESSONS_LEARNED_v3.md).
