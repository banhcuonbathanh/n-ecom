# System Review — 2026-07-15

> **Purpose:** Owner asked: "Look at the 2 systems — good or not? Give commands + suggestions.
> Make a record I can read later. Plan a new system with: flows (FE/BE/DevOps), a place for
> questions that pop into my head, indexes per domain, and a fix for spec-vs-build drift
> (e.g. menu page design vs built favourites page are different)."

## The 2 systems reviewed

| System | What it is | Verdict |
|---|---|---|
| [docs/claude_system/](../claude_system/README.md) | **Meta system** — how Claude is configured: CONTEXT_MAP, CLAUDE_MD_GUIDE, SKILLS_REGISTRY, CLEANUP_LOG, usage_review, system1 gold-standard CLAUDE.md examples | ✅ **Good design, keep it.** Weak spot = it describes the setup but the setup drifts (CLAUDE.md over its own line limit, stale "Current Work"). |
| [docs/system/](../system/README.md) | **System Handbook** — 00_overview → 11_ai: flows, specs, BE/FE/DevOps summaries, business logic, 08_pages + comparison trackers, AGENT_OS entry point | ✅ **Very good, already 80% of what you asked for.** Weak spot = drift: comparison runs found ~40 🔴 findings and most are still not fixed, so docs lie until someone acts. |

## Files in this folder

| File | Read when |
|---|---|
| [01_TWO_SYSTEMS_REVIEW.md](01_TWO_SYSTEMS_REVIEW.md) | The full assessment — what is good, what is weak, with evidence |
| [02_SUGGESTIONS_AND_COMMANDS.md](02_SUGGESTIONS_AND_COMMANDS.md) | Prioritized fixes + "when → which command" cheat sheet |
| [03_NEW_SYSTEM_PLAN.md](03_NEW_SYSTEM_PLAN.md) | Your 4 wants mapped to what exists vs. what to add — **do NOT build a 3rd system** |
| [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) | Live file — write down any question that pops into your head; Claude answers next session |

## One-line verdict

**The systems are good — the problem is not missing structure, it is that findings and docs
are not kept in sync with code.** Building a third system would make this worse, not better.
Fix the loop: *comparison finds drift → drift becomes a MASTER_TASK row → row gets done → doc updated.*

---
*Created 2026-07-15 · branch `docs/customer-menu-alignment` · not yet registered in MASTER_TASK (owner to confirm)*
