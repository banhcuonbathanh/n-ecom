---
name: handoff
description: End-of-session sync — update harness/STATE.md and TASKS.md to match reality, check git status for dangling changes, and print a resume summary for the next session. Run at the end of every work session.
---

# /handoff — close the session

## 1. Reality check
- `git status` — list uncommitted changes; propose commit(s) with proper messages
  (`feat|fix|docs|chore(scope): summary`) or flag what should be reverted.
- Any task started but not finished? Its `harness/TASKS.md` row must say 🔄 with a
  one-line "where I stopped".

## 2. Sync durable state
- `harness/STATE.md` — write the checkpoint entry (done / decisions / drift / next).
  Update the "Current resume point" block at the top.
- `harness/TASKS.md` — statuses match reality; no silent ✅ without receipts.
- `harness/PROMPTS.md` — a ready prompt exists for the next task.

## 3. Loose ends
List anything the owner must know: open ⚠️ flags, blocked tasks, decisions parked,
temp files to clean.

## 4. Resume summary
Print, in this exact shape:

```
SESSION CLOSED — YYYY-MM-DD
Done:      <ids + one-liners>
Decisions: <or "none">
Next:      <task id> — start with the prompt in harness/PROMPTS.md
Flags:     <or "none">
```
