# Task Management Guide

> **Rule:** Read this once. Then use TEMPLATE.md to copy-paste. Trust the format.
> **Version:** v1.0 · 2026-05-11

---

## 1. Task Hierarchy (3 levels max)

```
Phase  (P7)
  └── Task     (P7-1)       ← fits in 1 session, has owner + deps
        └── Sub-task (P7-1.1)  ← only when task > 1 session
```

Rules:
- Never nest deeper than 3 levels.
- A task row without sub-tasks **must** fit in 1 session (~2h).
- A parent task has **no status row** — its status is derived from sub-tasks.

---

## 2. Task Row Format

**Standard task (BE / DevOps / QA):**

| ID | Owner | Task | Deps | Sessions | Status | AC |
|---|---|---|---|---|---|---|

**FE task (requires spec + wireframe refs):**

| ID | Owner | Task | Deps | Sessions | Status | spec_ref | draw_ref |
|---|---|---|---|---|---|---|---|

### Field definitions

| Field | Allowed values | Rule |
|---|---|---|
| `ID` | `P7-1`, `P7-1.1` | Sub-tasks use dot notation |
| `Owner` | `BE` · `FE` · `BA` · `DevOps` · `QA` · `Full` | See §5 |
| `Deps` | `P6-3` or `—` | All listed deps must be ✅ before starting |
| `Sessions` | `1` | **Must be 1.** If > 1 → break into sub-tasks |
| `Status` | `⬜` `🔄` `✅` `🔴` | See §6 |
| `AC` | `Spec1 §3.2` or `—` | Where acceptance criteria live |
| `spec_ref` | `Spec_9 §2.1` | FE only — exact spec section defining behaviour |
| `draw_ref` | `wireframes/overview.md ZoneA` | FE only — wireframe file + zone |

---

## 3. Session Sizing Rule (most important)

**One session = ~2 hours of focused work.**

```
Sessions = 1   →  task is ready to start as-is
Sessions > 1   →  STOP. Break into sub-tasks BEFORE writing any code.
```

Sub-task breakdown rules:
- Each sub-task = one independently shippable unit
- Each sub-task must have a clear "done = ?" answer at session end
- Sub-tasks run in order — list them that way, add `Deps` between them
- At least 1 sub-task per parent (a parent with 0 children is not valid)

---

## 4. Session Protocol

### Start of session
1. Open `CURRENT.md` → read the active task block
2. If block is empty → open `MASTER.md` → find the next `⬜` task where all `Deps` are ✅
3. Check `Sessions` estimate → if > 1, break it down NOW before touching code
4. Fill in `CURRENT.md` (task ID, goal, branch name)
5. Create branch: `git checkout -b feature/P7-1.1-short-name`
6. Mark task `🔄` in `MASTER.md`

### End of session
1. Mark the sub-task (or task) `✅` in `MASTER.md`
2. If all sub-tasks under a parent are ✅ → mark the parent header `✅`
3. Update `CURRENT.md`:
   - **Task fully done** → clear the active block (set all fields to `—`)
   - **Partially done** → fill in `Stopped at` + `Notes` fields

---

## 5. Ownership Codes

| Code | Role |
|---|---|
| `BE` | Backend developer |
| `FE` | Frontend developer |
| `BA` | Business Analyst — spec/requirements |
| `DevOps` | Infrastructure, Docker, CI/CD |
| `QA` | Testing and verification only |
| `Full` | Requires both BE and FE in the same session |

---

## 6. Status Codes

| Code | Meaning |
|---|---|
| `⬜` | Not started |
| `🔄` | In progress — active this session |
| `✅` | Complete and verified |
| `🔴` | Blocked — reason in Notes |

---

## 7. How to Add a New Task

1. Identify task type: bug fix / new feature / refactor / infra
2. Match to existing phase → if no match, ask owner before creating a new phase
3. Write the task row using **TEMPLATE.md** as the starting point
4. Set `Sessions = 1` — if that's not honest, break into sub-tasks now
5. Starting immediately? → copy to `CURRENT.md`, mark `🔄` in `MASTER.md`
6. Backlog? → leave as `⬜`

**Task not in MASTER.md and unclear where it belongs? → STOP. Ask owner first.**
See `docs/PROCEDURE_INDEX.md` for the unknown-task protocol.

---

## 8. Proactive Flags

Use these prefixes in notes, PR descriptions, or inline when something needs attention.

| Prefix | When to use |
|---|---|
| `💡 SUGGESTION` | Better approach spotted |
| `⚠️ FLAG` | Risk or inconsistency found |
| `🚨 RISK` | Will break something if we proceed |
| `🔴 STOP` | Cannot continue without clarification |
| `❓ CLARIFY` | Ambiguous requirement |
| `🔄 REDIRECT` | Wrong direction, needs course correction |

---

## 9. File Map

| File | Purpose | Update frequency |
|---|---|---|
| `MASTER.md` | All tasks — source of truth for what exists and what's done | After every task |
| `CURRENT.md` | One active task — what's happening right now | Start + end of every session |
| `TEMPLATE.md` | Copy-paste templates — never write rows from scratch | Reference only |
| `GUIDE.md` | This file — rules and protocol | Update only when rules change |
