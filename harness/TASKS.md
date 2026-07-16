# TASKS.md — Master Task List / Orchestration (Primitive 7)

> Single source of truth for what exists, what's done, and what's next.
> Every task gets a row BEFORE work starts. Statuses: ⬜ todo · 🔄 in progress ·
> ✅ done (receipt logged) · ⛔ blocked.
> Sizing rule: one task = one session (< 100k tokens). 3+ files or 3+ scenarios → split.

---

## Phase F — Foundation

| ID | Task | Deps | AC (acceptance criteria) | Status | Receipt |
|---|---|---|---|---|---|
| F-1 | Session 0: decide stack + MVP domains, fill PLAN.md | — | No `⬜ DECIDE` left in PLAN.md §Stack/§Domains | ⬜ | |
| F-2 | Repo + dev stack skeleton (compose, hello-world BE+FE, healthcheck) | F-1 | `docker compose up` → BE health 200, FE renders | ⬜ | |
| F-3 | DB + migration tooling + first migration | F-2 | migrate up/down clean; schema doc started | ⬜ | |
| F-4 | Error contract + API client + CI (build+test on push) | F-2 | one endpoint returns the envelope; CI green | ⬜ | |

## Phase 1 — Catalog

| ID | Task | Deps | AC | Status | Receipt |
|---|---|---|---|---|---|
| ⬜ | register during Session 0 planning | | | | |

## Phase 2 — Cart & Checkout

| ID | Task | Deps | AC | Status | Receipt |
|---|---|---|---|---|---|
| ⬜ | | | | | |

## Phase 3 — Orders & Payment

| ID | Task | Deps | AC | Status | Receipt |
|---|---|---|---|---|---|
| ⬜ | | | | | |

## Phase 4 — Accounts · Admin · AI assistant

| ID | Task | Deps | AC | Status | Receipt |
|---|---|---|---|---|---|
| ⬜ | | | | | |

---

## Rules

1. New work with no row here → STOP, register first (`templates/TASK_TEMPLATE.md`),
   confirm with owner, then start.
2. ✅ requires: AC demonstrated + receipt row in `VERIFICATION.md` + `STATE.md` updated.
3. A blocked task records WHY in its row and gets a flag in the session summary.
