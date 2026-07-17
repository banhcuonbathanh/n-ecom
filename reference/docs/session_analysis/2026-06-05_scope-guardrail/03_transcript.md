# Transcript — Scope Guardrail discussion (2026-06-05)

Verbatim conversation (owner asks reproduced as typed; AI replies condensed to their substance).

---

## Owner
> so far everything is good now, but some time i ask you to do something more you may misunderstand and change some code i do not want that. i want you give me 1 proposal to make sure make it less happen or if it happen we can comeback on previous code

## AI — Proposal: "Checkpoint + Scope Contract"
Two layers:

**Layer 1 — Recover (git safety net).** Before any task, make a checkpoint commit:
`git add -A && git commit -m "checkpoint: before <task name>"`. If the AI touches code the owner didn't want, revert with `git reset --hard HEAD~1`. Always one command from the previous state. Noted the branch currently has 5 uncommitted files piled up → that's exactly why there's no clean rollback point.

**Layer 2 — Prevent (scope contract).** Before editing, list the exact files to be changed and why, and touch only those. If a file not on the list must change mid-task → STOP and ask first.

Why the combo: Layer 2 catches most cases before damage; Layer 1 makes anything that slips through reversible in one command. Offered to write it into CLAUDE.md + make the first checkpoint commit.

---

## Owner
> yes please update 2 above and update leson learn as well

## AI
- Added "Scope Guardrail" block to CLAUDE.md under "Every Task: 7 Steps".
- Added Weakness 12 to LESSONS_LEARNED_v3.md (two-layer rule table + root cause).
- Attempted the checkpoint commit + line-count check → **commit denied**, so left it for the owner.
- Flagged CLAUDE.md is 250 lines, over its own 150-line cap (pre-existing).

---

## Owner
> git add -A && git commit -m "checkpoint: scope guardrail rule + lesson 12" i do above
> i still want to see our disccion again, to discussion, to analysy what is cause of gong wrong

## AI — Root-cause analysis
Core problem: owner asks for A, AI delivers A + B + C. Five causes:

1. **AI fills ambiguity with its own guesses** — under-specified requests get the "most helpful" reading instead of a question.
2. **"Helpful" bias fights "minimum solution"** — improves nearby code while editing, against the Surgical rule.
3. **ALIGN confirmed intent, not the exact files** — approval of *what* ≠ approval of *where*; AI drifts into adjacent files.
4. **Chained edits with no stop point** — fix 1 → reveals 2 → fix inline → touches 3.
5. **No cheap undo** — uncommitted work piled up, so over-reach had to be un-picked manually.

Mapping: Causes 2/3/4 blocked by the scope contract; Cause 5 by the checkpoint; **Cause 1 still depends partly on the owner** (clearer requests = less guessing).

**AI's question back:** which bit hardest — Cause 1 (misread a vague request) or Cause 2 ("improved" untouched code)? They need slightly different defenses.

---

## Owner
> docs/session_analysis — paste above conversation into above folder follow guiline in readme

## AI
Created `2026-06-05_scope-guardrail/` with 00_README, 01_action_log, 02_working_patterns, 03_transcript (this file); added the index row.
