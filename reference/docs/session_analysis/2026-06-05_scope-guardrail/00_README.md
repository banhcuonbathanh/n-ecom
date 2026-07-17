# Session Analysis — Scope Guardrail (preventing unwanted code changes)

> Raw data for the owner to analyze later. Captured 2026-06-05.
> Purpose: understand how the AI worked, to optimize docs/CLAUDE.md.
> Meta/process material — NOT curated project docs. Safe to archive/delete.

## What happened this session (one paragraph)
The owner raised a recurring pain: when he asks for "a bit more" on top of a task, the AI sometimes misunderstands scope and edits code he did not want changed — and there was no clean point to roll back to. We agreed a two-layer fix ("Checkpoint + Scope Contract"): a git checkpoint commit before every task (one-command rollback) + an exact file list confirmed at ALIGN (touch only those files, STOP if a new file is needed). We wrote the rule into `CLAUDE.md` and added Weakness 12 to `LESSONS_LEARNED_v3.md`. The owner then asked for a deeper root-cause discussion of *why* the AI over-reaches, which is captured here.

## Original request (verbatim intent)
1. "some time i ask you to do something more you may misunderstand and change some code i do not want that. i want you give me 1 proposal to make sure make it less happen or if it happen we can comeback on previous code"
2. "yes please update 2 above and update leson learn as well" (update CLAUDE.md + checkpoint commit + lessons learned)
3. "i still want to see our disccion again, to discussion, to analysy what is cause of gong wrong" (root-cause analysis)
4. "paste above converssation into above folder follow guiline in readme" (this folder)

## Files in this folder
| File | Contents |
|---|---|
| 00_README.md | This index. |
| 01_action_log.md | Primary raw data: every action, what + why. |
| 02_working_patterns.md | The 5 root causes of scope creep + how each fix maps to them. |
| 03_transcript.md | Verbatim conversation (owner asks + AI replies). |

## Outcome summary
- **Shipped:** Scope Guardrail rule in [CLAUDE.md](../../../CLAUDE.md) (under "Every Task: 7 Steps") + Weakness 12 in [LESSONS_LEARNED_v3.md](../../base/LESSONS_LEARNED_v3.md).
- **Committed:** owner ran `git add -A && git commit -m "checkpoint: scope guardrail rule + lesson 12"` himself (AI's commit attempt was denied).
- **Flagged (not fixed):** `CLAUDE.md` is 250 lines, over its own 150-line cap — pre-existing, out of scope.
- **Open question to owner:** which cause bit hardest — Cause 1 (misread vague request) or Cause 2 ("improved" untouched code)? Determines which defense to harden next.
