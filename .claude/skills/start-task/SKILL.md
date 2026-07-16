---
name: start-task
description: Open a task the harness way — register it in harness/TASKS.md if missing, read only the docs CONTEXT_MAP.md routes to, take a checkpoint commit, and produce a scope contract (exact files + why) for owner ALIGN before any code is written. Usage: /start-task <short task description>.
---

# /start-task — open a task

Run these steps in order. Do not write any application code during this skill.

## 1. Classify
State in one line: bug fix / new feature / refactor / infra / docs, and which
phase/domain it belongs to.

## 2. Register
Check `harness/TASKS.md` for a matching row.
- Missing → draft a row using `templates/TASK_TEMPLATE.md`, show it, **wait for owner
  confirmation** before continuing.
- Present → quote the row (ID, AC, deps). If any dep is not ✅ → 🔴 STOP and report.

## 3. Size check
1–2 files + 1 clear AC → proceed. 3+ files or 3+ scenarios → propose a split into
sub-task rows first; wait for confirmation.

## 4. Read (routed, minimal)
Open `harness/CONTEXT_MAP.md`, follow the row for this task type, and read ONLY
those docs. List what you read.

## 5. Checkpoint
`git add -A && git commit -m "checkpoint: before <task-id>"` — guarantees one-command
rollback.

## 6. Scope contract → ALIGN
Present:
- exact files to be changed/created, one line of why each
- the AC restated in your own words
- any 💡/⚠️ flags spotted while reading

Then **stop and wait** for the owner's explicit go. Only after that, implement —
touching only the listed files. Need another file mid-task? STOP and ask first.
