# Working Patterns — why the AI changes code the owner didn't ask for

The core problem in one line: **owner asks for A, AI delivers A + B + C**, where B/C were never requested.

## The 5 root causes

### Cause 1 — AI fills ambiguity with its own guesses
A request like "do a bit more" / "also fix this" is under-specified. There are 3–4 valid readings. Instead of stopping to ask *which one*, the AI picks the most "helpful" reading and acts.
**Failure mode:** treats vagueness as permission to use its own judgment about scope, when vagueness should trigger a question.
**Defense:** behavioral — the AI must ask. Partly depends on the owner giving clearer asks too.

### Cause 2 — "Helpful" bias fights "minimum solution"
While editing a file, the AI sees nearby improvable code and "helpfully" fixes it (error handling, renames, refactors) — even though `CLAUDE.md` says *"Surgical: touch only what the task requires."*
**Failure mode:** the helpful instinct overrides a known rule in the moment of editing.
**Defense:** scope contract — "touch only listed files."

### Cause 3 — ALIGN confirmed *intent*, not *the exact files*
Old ALIGN was prose ("I'll add the filling label"). The owner approves the *what*, but it never pinned down *which files* get opened. The AI then drifts into adjacent files.
**Failure mode:** approval of *what* ≠ approval of *where*.
**Defense:** scope contract — exact file list at ALIGN.

### Cause 4 — Chained edits with no stop point
Fix thing 1 → reveals thing 2 → fix inline → touches thing 3. Each step feels reasonable; the chain carries the AI far from the original request without re-confirming.
**Failure mode:** rides the chain to the end instead of stopping at the first out-of-scope step.
**Defense:** scope contract — STOP at the first file not on the list.

### Cause 5 — No cheap undo, so mistakes compound
Work piled up as uncommitted changes, so there was no clean point to return to. Over-reach then had to be un-picked manually (messy, error-prone) instead of reverted.
**Failure mode:** recover gap.
**Defense:** git — checkpoint commit before every task.

## Mapping causes → fixes

| Cause | Fixed by | Layer | Structurally blocked? |
|---|---|---|---|
| 1 — fill ambiguity with guesses | Ask before acting on vague requests | behavioral | No — needs owner's help too |
| 2 — helpful bias | "touch only listed files" | scope contract | Yes |
| 3 — intent ≠ files | exact file list in ALIGN | scope contract | Yes |
| 4 — chained edits | STOP if file not on list | scope contract | Yes |
| 5 — no undo | checkpoint commit | git recover | Yes |

## Takeaway for doc tuning
Causes 2/3/4/5 are now blocked by the Scope Guardrail rule + checkpoint discipline. **Cause 1 is the residual risk** — it cannot be fully fixed by a rule because it lives in how requests are phrased. The open question to the owner (which cause bit hardest) decides whether to invest more in Cause-1 defenses (e.g. a "restate scope in one sentence before I act" habit) or trust the structural fixes already in place.
