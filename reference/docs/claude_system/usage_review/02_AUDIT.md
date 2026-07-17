# Audit — quality of Claude usage in this repo

> Date: 2026-06-11. Evidence-based: every finding cites a file or observed behavior.
> Verdict: **system design 8.5/10 · execution discipline 6/10**.

---

## A. What you do well (keep these)

| # | Practice | Why it's good |
|---|---|---|
| A1 | **3-tier doc system** (CLAUDE.md map → shared facts → domain specs) | Matches how the context window is paid for. Most users never get here. |
| A2 | **`docs/claude_system/`** meta folder (CONTEXT_MAP, CLAUDE_MD_GUIDE, SKILLS_REGISTRY, CLEANUP_LOG) | You documented *the instruction system itself*. Extremely rare; makes the setup maintainable. |
| A3 | **Task sizing rule: < 100k tokens / 1 session** in MASTER_TASK | Directly prevents mid-session compaction failures. Best single rule in the repo. |
| A4 | **`docs/be/be_code_summary/`** — summaries instead of grepping Go source | Same knowledge at ~10× lower token cost. |
| A5 | **16 project skills**, with `frontend-nextjs` as router + 5 per-task rule files | Correct skill shape: cheap trigger, on-demand body. |
| A6 | **Single-source-of-truth discipline** ("one fact, one home") + registries (`_INDEX_*.md`) | Prevents Claude reading two conflicting versions of a fact. |
| A7 | **Scope guardrail** (checkpoint commit + scope contract + ALIGN before code) | Gives you one-command rollback and stops scope creep. |
| A8 | **deny rules** for `rm`, `rm -rf`, `git push` | Right things to hard-block. |
| A9 | **Memory used correctly** — preferences/feedback in memory, repo facts in docs | Clean split; index stays small. |
| A10 | **Session analysis + quality audits** (`docs/session_analysis/`, `/quality-check` skill) | You audit Claude's output instead of trusting it — correct posture. |

## B. What is weak (with evidence)

### B1 — Commit messages destroy your own history 🔴 biggest issue
Recent commits: `dg`, `sdgf`, `dgf`, `dfsg`. Claude reads `git log` at session start and during tasks to understand what happened — these tell it nothing. They also break your own checkpoint/rollback guardrail: you can't find "the checkpoint before task X" among four garbage messages. Your CLAUDE.md even defines branch naming conventions, but commits — the thing read far more often — have no enforced format. (Memory note `feedback_commit_messages` already flags this; it's still happening.)

### B2 — CLAUDE.md violates its own rules 🔴
- Header says "**<150 dòng**" — the file is **251 lines**.
- "Current Work" section says branch is `feature/fe-wireframe-build`; actual branch is `experience_claude.md_system_1`. Claude trusts CLAUDE.md → starts every session with a false fact.
- "Current Work" duplicates `docs/tasks/CURRENT_TASK.md` ("one fact, one home" broken by the map file itself). Same for the Phase Status table vs MASTER_TASK.md — the duplication is acknowledged in a note, but it has already drifted once and will again.

### B3 — Process weight is uniform, tasks are not 🟡
Every task — even a 1-line fix — formally requires: MASTER row → 5-step registration → 7 steps → spec reading → ALIGN wait. In practice this gets skipped (which is worse than a lighter official rule, because now the written process and the real process disagree, and Claude can't tell which one you actually want). There is no defined "small task" fast path.

### B4 — `settings.json` allowlist is a junk drawer 🟡
~10 of the allow rules are full one-off commands (a specific excalidraw JSON-validation python one-liner, specific test DSN exports, one specific curl). These will never match again exactly, so they add nothing — while general cases still prompt. Observed this session: `git log` allowed as `Bash(git log *)`, but `git -C <path> log` and compound `cd && git log` forms were **denied** → wasted turns. Also `Bash(python3 -c ' *)` and `Bash(python3)` are broader than you probably intend.

### B5 — Repo/session hygiene 🟡
Untracked screenshots at repo root (`menu-*.png`, `menu-header-nav-check*.png`), `fe/tsconfig.tsbuildinfo` tracked and constantly modified, uncommitted changes spanning two sessions. Memory note `feedback_session_close` says this is recurring. Every dangling file shows up in the git status snapshot Claude reads at session start — noise in, noise out.

### B6 — Doc sprawl + drift risk 🟡
351 markdown files in `docs/`. CLEANUP_LOG exists (good) but superseded files like `FE_DOC_INDEX.md` are still in place and must be warned about in CONTEXT_MAP instead of being moved to `docs/archive/`. Two skills exist for the same thing (`handoff` in project skills + `hand-off` in personal skills). CONTEXT_MAP says "(be/CLAUDE.md if added)" — it exists now. Each small drift is cheap; together they erode Claude's trust in the maps, which is the whole point of tier 1.

### B7 — Branch naming not followed 🟢 minor
Convention: `feature/...` · `fix/...` · `chore/...`. Actual branch: `experience_claude.md_system_1`.

## C. Scorecard

| Area | Score | Note |
|---|---|---|
| Doc architecture (3 tiers, maps, registries) | 9/10 | Best-in-class; only drift hurts it |
| Skills design | 8/10 | Right shapes; minor duplication |
| Task management (MASTER/CURRENT, sizing) | 8/10 | Sizing rule is excellent |
| Context-cost awareness | 8/10 | be_code_summary, map-only CLAUDE.md idea |
| Safety (permissions, guardrails) | 7/10 | Good deny rules; allowlist needs cleanup |
| **Git/commit discipline** | **3/10** | Meaningless messages, stale state |
| **Doc freshness (drift)** | **5/10** | CLAUDE.md stale + over its own limit |
| Process realism | 6/10 | Written process heavier than practiced process |

→ Fixes ordered by payoff: [03_IMPROVEMENTS.md](03_IMPROVEMENTS.md)
