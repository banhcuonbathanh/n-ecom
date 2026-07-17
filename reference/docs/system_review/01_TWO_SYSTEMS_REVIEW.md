# Review of the 2 Systems — good or not?

> Date: 2026-07-15. Evidence-based — every claim points to a real file.
> Short answer: **both are good systems. The weakness is the same in both: drift.**
> The design is top-tier; the maintenance loop is broken.

---

## System 1 — `docs/claude_system/` (the meta system)

**What it is:** documents *how Claude itself is driven* — what loads, in what order, how to
write a CLAUDE.md, which skills exist, what is stale. Plus `system1/` gold-standard example
CLAUDE.md files and `usage_review/` (a self-audit from 2026-06-11).

### Good ✅

| # | What | Why it matters |
|---|---|---|
| 1 | CONTEXT_MAP answers "what does Claude read for FE/BE/DevOps work" | This is exactly the "index so Claude has necessary info" you asked for — it already exists |
| 2 | `system1/` examples explain **WHY** each CLAUDE.md section exists | Reusable for any future project |
| 3 | `usage_review/` self-audit is honest (system 8.5/10, discipline 6/10) | Rare — most people never audit their own setup |
| 4 | CLEANUP_LOG tracks stale docs instead of silently deleting | Safe retirement path |

### Weak ❌

| # | Problem | Evidence |
|---|---|---|
| 1 | The audit found problems **13 months of sessions ago and they still exist**: meaningless commits (`sdf`, `dfg` in current git log), CLAUDE.md over its own 150-line limit, stale "Current Work" | [usage_review/02_AUDIT.md](../claude_system/usage_review/02_AUDIT.md) B1/B2 — compare with `git log` today |
| 2 | It **describes** rules but nothing **enforces** them (except the rule-reminder hook) | An audit that produces no task rows changes nothing |
| 3 | usage_review is a snapshot (2026-06-11), never refreshed | Scores may be wrong now |

**Verdict: 8/10 design · keep as-is.** Don't grow it. Its findings need to become MASTER_TASK rows, not more prose.

---

## System 2 — `docs/system/` (the System Handbook)

**What it is:** the self-contained handbook — overview, flows, specs, BE/FE summaries,
dev guides, business logic, per-page doc-sets with doc-vs-code comparisons, DevOps, caching, AI plans.
Entry point for agents = [AGENT_OS.md](../system/AGENT_OS.md).

### Good ✅

| # | What | Why it matters |
|---|---|---|
| 1 | **Already contains almost everything you asked for today** — see [03_NEW_SYSTEM_PLAN.md](03_NEW_SYSTEM_PLAN.md) mapping | Flows = `01_flow/` · BE index = `03_be/` · FE index = `04_fe/` · DevOps index = `09_devops/DEVOPS_INDEX.md` |
| 2 | 9 Non-Negotiable Rules in README (one write path, storage-keys, error spec, one-model-one-home) | Real architecture guardrails, not vague advice |
| 3 | `08_pages/` per-page doc-sets + **COMPARISON_TRACKER** — every page audited doc-vs-code with `file:line` proof | This is *exactly* the tool for your "menu spec vs built favourites differ" complaint — and it already caught it |
| 4 | `07_business_logic/` is the canonical logic home + Decision Log + DRIFT entries | "Code wins → fix the summary AND log the drift" is the right rule |
| 5 | AGENT_OS routing table + `/start-task` + `/finish-task` | Task type → what to read → verify gate → what to update |

### Weak ❌

| # | Problem | Evidence |
|---|---|---|
| 1 | **Findings pile up, fixes don't happen.** ~25 pages audited, ~40 🔴 findings total; most 🔴 code bugs from the 2026-06-2x runs are still open (favourites footer z-index collision, checkout `payment_method` never sent, POS "Đơn #undefined", KDS tap-to-serve 404s, stock-movement UI unreachable, availability toggle always 400s…) | [COMPARISON_TRACKER.md](../system/08_pages/COMPARISON_TRACKER.md) — no "fixed on <date>" column, no link to MASTER_TASK rows |
| 2 | **Doc drift goes both directions.** `customer_menu.md` still carries "⚠️ NEW DESIGN — code pending rebuild" markers for things already built (tracker: "DRIFT FLIPPED") — so the spec lies to the next reader | Tracker row `customer_menu`, 2026-06-25 |
| 3 | Stale `file:line` cites everywhere (`main.go` routes +13 lines in ~15 doc-sets) — cheap individually, together they erode trust in the handbook | Every tracker row's 🟢 column |
| 4 | The tracker itself is unreadable — single rows of 300+ words; you can't see "what is still broken" at a glance | COMPARISON_TRACKER.md row format |
| 5 | No home for **owner questions** — your "questions that pop into my head" have nowhere to land, so they get lost between sessions | Nothing like an OPEN_QUESTIONS file exists |

**Verdict: 8.5/10 design · the best folder in the repo.** But value decays every week the
🔴 findings stay unfixed. It needs a *closing loop*, not more content.

---

## The shared root cause (both systems)

```
audit/comparison finds a problem
        ↓
written into a doc  ✅  (both systems do this well)
        ↓
becomes a MASTER_TASK row  ❌  ← THE BROKEN STEP
        ↓
gets fixed → doc updated  ❌
```

Your complaint today — "spec in FE menu page but built favourites page is different, this is
not good" — is the perfect example: the system **already found it** (customer_favourites 🔴 #1:
wireframe draws a per-card `[+ Giỏ]` button that does not exist in `FavouriteItemCard.tsx`;
🔴 #2: footer z-index collision hides the CTA). It found it **3+ weeks of work ago**. Nothing routed it
to a task, so to you it still feels like "Claude doesn't understand my project." Claude
understands; the pipeline from *finding* → *fix* is missing.

→ Fixes, in priority order: [02_SUGGESTIONS_AND_COMMANDS.md](02_SUGGESTIONS_AND_COMMANDS.md)
