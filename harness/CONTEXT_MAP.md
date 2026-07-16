# CONTEXT_MAP.md — Context Management (Primitive 3)

> The context window is finite. This file decides **what to load and what to skip**
> for each task type, so attention stays on the task instead of drowning in docs.

---

## Routing table — task type → read ONLY these

| Task type | Read | Skip |
|---|---|---|
| New BE endpoint | `PLAN.md §Stack §Architecture` + domain section + `TOOLS.md` if AI-related | FE docs |
| New FE page/component | `PLAN.md §Architecture (FE)` + domain section | BE internals (use API contract only) |
| DB migration | `PLAN.md §File map (db)` + migration skill in `SKILLS.md` | everything else |
| Bug fix | `STATE.md` (recent decisions) + the failing area's PLAN section | unrelated domains |
| Infra / DevOps | `ENVIRONMENT.md` | domain specs |
| Docs / planning | `TASKS.md` + `STATE.md` | code |

## Rules

1. **Summaries over source.** As the codebase grows, maintain per-domain code
   summaries (routes, DTOs, schema) and read those instead of grepping source.
   Open source files only when you need exact lines to edit.
2. **Compaction target.** Finished work is summarized into `STATE.md` and dropped
   from active context. Never carry a whole session's history forward — carry the
   3-line checkpoint.
3. **One fact, one home.** Never duplicate a fact into a second file — link to it.
   Duplicated facts drift; drifted docs poison the AI's context.
4. **When lost, come back here** — not to a full-tree scan.

## Doc inventory

> Every doc in the project gets a row. If a doc has no row, it is either new
> (add it) or dead (delete it).

| Doc | Purpose | Owner of truth for |
|---|---|---|
| `CLAUDE.md` | Agent identity + workflow | rules of engagement |
| `harness/PLAN.md` | Architecture | stack, domains, business rules, file map |
| `harness/TASKS.md` | Task list | statuses, deps, ACs |
| `harness/STATE.md` | Checkpoint log | decisions, resume point |
| `harness/VERIFICATION.md` | Receipts | proof of done |
| `harness/ENVIRONMENT.md` | Dev env | commands, ports, env vars |
| `harness/TOOLS.md` | Tools/MCP | tool schemas + gating rules |
| `harness/SUBAGENTS.md` | Delegation | when to spawn |
| `harness/SKILLS.md` | Playbooks | recurring procedures |
| `harness/diagrams/build-plan.html` | Visual A→Z overview (architecture, BE/FE roles, wireframes, design system) | nothing — orientation snapshot from Session 0; on any conflict PLAN.md/TASKS.md win |
