# `docs/session_analysis/` — Guide

> **What this folder is:** raw, time-stamped material about *how the AI co-developer worked* on a piece of work — action logs, reasoning, friction points, optimization ideas. The owner analyzes these later to tune `CLAUDE.md` + `docs/` so future sessions run faster.
>
> **What this folder is NOT:** curated project docs, specs, business rules, or AI memory. Nothing here is a source of truth for the product. It is scratch/analysis material — safe to move, archive, or delete after it has been mined for improvements. The "one fact, one home" rule does **not** apply here (this is allowed to be messy and duplicative).

---

## When to add an entry

Add one whenever a session produced a non-obvious *working pattern* worth analyzing — e.g.:
- A bug hunt that crossed many files/layers (good for seeing how investigation flows).
- A multi-task epic (good for seeing how registration → align → implement → verify plays out).
- Anything where docs felt stale, missing, or slowed the work down (capture the friction while it's fresh).

Skip it for trivial one-file changes — there's nothing to analyze.

---

## Naming convention

One **dated subfolder per analyzed session/topic**:

```
docs/session_analysis/YYYY-MM-DD_<short-slug>/
```

- `YYYY-MM-DD` = the date the work was done (so entries sort chronologically).
- `<short-slug>` = kebab-case topic, usually the epic/task id. e.g. `2026-06-05_oc-epic`.

If one topic spans multiple days, keep the start date and note the range inside `00_README.md`.

---

## Standard file layout (recommended)

Inside each dated subfolder:

| File | Required? | Contents |
|---|---|---|
| `00_README.md` | ✅ | One-paragraph context, the original request (verbatim intent), an index of the other files, and the outcome. Start here. |
| `01_action_log.md` | ✅ | **The primary raw data.** Every meaningful action in order, each with *what I did* / *why*. Code omitted — this is about the thinking. Group by phase. |
| `02_working_patterns.md` | optional | Behavioral patterns observed (what to design docs around) + the inverse (what slowed the work). |
| `03_optimization_findings.md` | optional | Friction points → concrete doc/file fixes. Mark which were implemented (and where) vs. candidates, with a priority order. |
| `NN_*.md` | optional | Anything else raw: pasted transcripts, screenshots, DB dumps, notes. Number-prefix to keep order. |

Freeform raw dumps are fine — the 4-file layout is a recommendation, not a gate. The only hard requirement is `00_README.md` so the entry is self-describing.

---

## How to add an entry (steps)

1. Create `docs/session_analysis/YYYY-MM-DD_<slug>/`.
2. Copy the skeleton below into `00_README.md` and fill it in.
3. Drop in `01_action_log.md` (and optionally 02/03, or any raw material).
4. Add a row to the **Index** table at the bottom of this file.

### Copy-paste skeleton for `00_README.md`

```markdown
# Session Analysis — <Topic / Epic name>

> Raw data for the owner to analyze later. Captured YYYY-MM-DD.
> Purpose: understand how the AI worked, to optimize docs/CLAUDE.md.
> Meta/process material — NOT curated project docs. Safe to archive/delete.

## What happened this session (one paragraph)
<...>

## Original request (verbatim intent)
<paste the owner's ask + any URLs/screenshots described>

## Files in this folder
| File | Contents |
|---|---|
| 00_README.md | This index. |
| 01_action_log.md | Primary raw data: every action, what + why. |
| ... | ... |

## Outcome summary
- <what shipped / decisions made / what was verified>
```

---

## Index of entries

| Date | Folder | Topic | Status |
|---|---|---|---|
| 2026-06-05 | [`2026-06-05_oc-epic/`](2026-06-05_oc-epic/) | OC (Order Consistency) epic — menu preview ≠ saved order; combo double-count fix | analyzed-pending |
| 2026-06-05 | [`2026-06-05_scope-guardrail/`](2026-06-05_scope-guardrail/) | Why AI changes code the owner didn't ask for — 5 root causes + Checkpoint/Scope Contract fix | raw |
| 2026-06-05 | [`2026-06-05_client-order-data-trace/`](2026-06-05_client-order-data-trace/) | Tracing Client Order Page data flow (FE useSSE+REST+localStorage / BE Redis pub-sub→SSE) into the reference doc; found 2 dead-code discrepancies | raw |

> Status values: `raw` (just captured) · `analyzed-pending` (read, improvements not yet applied) · `actioned` (improvements applied, can archive).
