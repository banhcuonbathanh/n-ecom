# Suggestions + Commands — what to do, in order

> Date: 2026-07-15. Ordered by payoff. Each item says the exact command or session prompt to use.

---

## P1 — Close the drift loop (biggest payoff)

**P1-1. Turn open 🔴 findings into MASTER_TASK rows.**
One session, no coding. Prompt to give Claude:

```
Read docs/system/08_pages/COMPARISON_TRACKER.md. List every 🔴 CODE bug that is still open,
grouped by root cause (e.g. all fixed-footer z-index collisions = 1 task). Draft MASTER_TASK
rows for the top 10, sized < 100k tokens each. Show me the rows — do not code anything.
```

Known groups already visible in the tracker (Claude should verify each is still open):
- Fixed-footer z-index collision — same root on 3 pages: product_detail, favourites, checkout
- Checkout: `payment_method` collected but never sent; `TABLE_HAS_ACTIVE_ORDER` never returned → silent duplicate order
- Menu: `TableConfirmModal` local note discards `cart.orderNote` (data loss)
- POS: "Đơn #undefined" (`POST /orders` returns only `{id, table_busy}`)
- KDS: tap-to-serve PATCHes a route that doesn't exist → 404 every tap; `/kds` has no RoleGuard
- Admin products: no working UI path to set availability (badge 400s + no modal switch)
- Admin ingredients: whole Nhập/Xuất stock feature unreachable; missing-id → 500 not 404
- Task board / todo: edit always creates a duplicate (no UPDATE path for `staff_tasks`)

**P1-2. Fix the docs that lie in the other direction.**
`customer_menu.md` still says "NEW DESIGN — code pending rebuild" for things already built.
Prompt: `Refresh customer_menu.md: remove stale "pending rebuild" markers per COMPARISON_TRACKER row 2026-06-25. Doc edits only.`

**P1-3. Add a "Fixed?" column to COMPARISON_TRACKER.**
Rule going forward: a 🔴 may only be closed by a MASTER_TASK row ID + commit. Then the tracker
becomes a dashboard instead of a graveyard.

## P2 — Discipline (the 2026-06-11 audit already said this; still true)

| # | Do | How |
|---|---|---|
| P2-1 | **Stop garbage commits** (`sdf`, `dfg` in current log) | Always let Claude write the message: `checkpoint: before <task>` / `fix(scope): ...` — never type it yourself |
| P2-2 | Refresh root CLAUDE.md "Current Work" | It still narrates the OC epic (filling column — since **dropped** by migration 017) and branch `feature/fe-wireframe-build`; actual branch is `docs/customer-menu-alignment`. Prompt: `Update CLAUDE.md Current Work + Phase table to match MASTER_TASK and today's branch; trim file back under 150 lines.` |
| P2-3 | End every session with `/handoff` | It syncs CURRENT_TASK / MASTER_TASK / CLAUDE.md so the next session doesn't start on stale facts |
| P2-4 | Run `/quality-check 5` every ~5 sessions | Catches skipped steps and CSS-safety issues early |

## P3 — Small structure additions (see 03_NEW_SYSTEM_PLAN.md)

- P3-1: Adopt [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) (created today) — dump questions there, ask Claude to answer at session start.
- P3-2: Do **not** create a third doc system. Add missing pieces inside `docs/system/`.
- P3-3: Later, archive superseded docs listed in [CLEANUP_LOG](../claude_system/CLEANUP_LOG.md) to `docs/archive/`.

---

## Command cheat sheet — "when → what to run"

| Situation | Command |
|---|---|
| Start any task | `/start-task <description>` — routes reading via AGENT_OS, registers MASTER row, checkpoint commit, scope contract |
| Finish a task | `/finish-task <task-id>` — Definition-of-Done gate |
| End a session | `/handoff` — sync all task/status docs |
| "Is this page's doc still true?" / suspect spec-vs-build drift | `/comparison-doc <page-folder>` — the exact tool for your favourites complaint |
| Mid-session "are my docs stale?" | `/doc-check` (read-only, prioritized fix list) |
| "Was recent work good quality?" | `/quality-check 3` |
| Build/verify a page from its wireframe | `/dev-page <page-folder>` |
| New page from scratch | `/wireframe <page>` → `/excalidraw <page>` → `/dev-page <page>` |
| Update page doc-set after big changes | `/page-doc-set <page-folder>` |
| Visual system map | `/codebase-graph` |

**The loop that keeps everything true:**

```
/start-task → work → /finish-task → /handoff
        ↑                                |
        └── /comparison-doc + /doc-check findings → new MASTER rows ──┘
```
