---
name: finish-task
description: Close a task with the Definition-of-Done gate — verify acceptance criteria are demonstrated, a receipt is logged in harness/VERIFICATION.md, only scoped files changed, and STATE.md + TASKS.md are updated. Refuses to declare DONE until every box is checked. Usage: /finish-task <task-id>.
---

# /finish-task — Definition of Done gate

Walk this checklist explicitly, quoting evidence for each box. If ANY box fails,
the task is NOT done — say exactly what is missing and stop.

## Gate checklist

1. **AC demonstrated** — restate the AC from `harness/TASKS.md`; point to the concrete
   proof that each criterion holds (not "implemented", but "here is it working").
2. **Receipt logged** — a dated entry for this task ID exists in
   `harness/VERIFICATION.md` with at least one receipt type (build/test/curl/screenshot).
   Missing → produce it NOW, then log it.
3. **Scope respected** — `git diff --name-only <checkpoint>..HEAD` matches the scope
   contract from /start-task. Extra files → explain each or revert it.
4. **No drift left behind** — if the change made any harness/PLAN/TOOLS doc stale,
   the doc was fixed in this task. Note fixes in STATE.md.
5. **State updated** —
   - `harness/TASKS.md`: row → ✅ with receipt reference
   - `harness/STATE.md`: checkpoint entry (done / decisions / next)
   - `harness/PROMPTS.md`: consumed prompt removed; next task's prompt present

## Output

End with a 5-line summary: task ID · what shipped · receipt pointer · files touched ·
the exact next task.
