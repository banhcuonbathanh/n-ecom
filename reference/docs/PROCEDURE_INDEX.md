# PROCEDURE INDEX — Task Type → Required Procedure

> Purpose: Before starting any task, Claude looks up the task type here to confirm which procedure applies.
> Rule: If the task type is not listed, follow the **"No procedure exists"** protocol at the bottom.
> Single source for procedure gaps → `docs/base/LESSONS_LEARNED_v3.md §Weakness 8`

---

## Index Table

| # | Task Type | Spec Exists? | In TASKS.md? | Procedure |
|---|---|---|---|---|
| 1 | Task listed in TASKS.md with a domain spec | ✅ | ✅ | READ spec → 7-step workflow (`docs/IMPLEMENTATION_WORKFLOW.md`) |
| 2 | Task listed in TASKS.md, no domain spec | ❌ | ✅ | READ system guide (BE: `BE_SYSTEM_GUIDE.md` / FE: `FE_SYSTEM_GUIDE.md`) → 7-step workflow |
| 3 | New feature NOT in TASKS.md, NOT in any spec | ❌ | ❌ | **STOP → ask user for requirements first** (see protocol below) |
| 4 | Bug fix in a domain that has a spec | ✅ | maybe | READ spec + read relevant code → diagnose → fix |
| 5 | Bug fix with no spec for domain | ❌ | maybe | READ relevant code → diagnose → fix |
| 6 | Refactor (no new behaviour) | — | — | READ existing code → refactor → no spec read needed |
| 7 | BE unit/integration test | — | ✅ | READ service + spec (if domain has one) → write tests |
| 8 | DevOps / infra / CI | — | — | No spec required. Read compose/config files as needed |
| 9 | New FE page with no spec | ❌ | ❌ | **STOP → ask user** → co-create spec/wireframe → add to TASKS.md → then 7-step |
| 10 | New BE endpoint with no spec | ❌ | ❌ | **STOP → ask user** → co-create spec → add to TASKS.md → then 7-step |
| 11 | UI component upgrade (existing component, new behaviour) | maybe | maybe | Check if behaviour is spec-covered → if not, ask user before coding |
| 12 | Data model / schema change | — | — | READ `BanhCuon_DB_SCHEMA_SUMMARY.md` + migrations → plan + align before any migration file |

---

## "No Procedure Exists" Protocol

When the task type is **not in this index**, or when the task is type 3 / 9 / 10:

1. **Do not read any code or spec files.**
2. Use prefix `❓ CLARIFY` and ask the user:
   - What does this feature do? (user-facing behaviour)
   - Which screen / flow does it live in?
   - Are there existing components or APIs it should reuse?
3. After the user answers → **together** define:
   - Acceptance criteria (what "done" looks like)
   - Which existing code / API it depends on
   - Whether a new spec or wireframe is needed
4. Add a row to this index table for the new task type.
5. Add a task row to `docs/TASKS.md`.
6. Then start the 7-step workflow.

---

## How to Add a New Procedure

When we co-create a procedure for a task type not yet listed:

1. Agree on the steps verbally in the session.
2. Add a row to the index table above.
3. If the procedure is more than 2 lines, create `docs/procedure/PROC_[name].md` and link it in the Procedure column.
4. Update `docs/base/LESSONS_LEARNED_v3.md` if this reveals a workflow gap.

---

> Last updated: 2026-05-10
