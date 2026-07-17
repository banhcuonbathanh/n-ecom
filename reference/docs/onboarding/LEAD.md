# Onboarding — Tech Lead

> Your job: keep MASTER_v1.2.md accurate, unblock the team within 4h, review all migrations before merge, own the spec-to-task chain.

---

## Your Entry Points (check in this order each session)

1. **`docs/TASKS.md`** — current phase status + next tasks per role
2. **`docs/core/MASTER_v1.2.md`** — single source of truth for all architecture decisions
3. **`docs/contract/API_CONTRACT_v1.2.md`** — all endpoints (review before approving BE PRs)
4. **`docs/be/BE_SYSTEM_GUIDE.md`** · **`docs/fe/FE_SYSTEM_GUIDE.md`** — epic status per role

## Current Phase Status (as of 2026-05-06)

| Phase | Status |
|---|---|
| Phase 0 — Architecture & Docs | ✅ COMPLETE |
| Phase 1 — DB Migrations | ✅ COMPLETE |
| Phase 2 — Feature Specs | ✅ COMPLETE (7/7) |
| Phase 3 — sqlc + Project Setup | ✅ COMPLETE |
| Phase 4 — Backend | ✅ COMPLETE |
| Phase 5 — Frontend | ✅ COMPLETE |
| Phase 6 — DevOps | ✅ COMPLETE |
| Phase 8 — Admin Dashboard | ✅ COMPLETE |
| Phase 7 — Testing + Go-Live | ⬜ NEXT |
| Phase 9 — Live data wiring | ⬜ NEXT |

## What You Own

| File | Rule |
|---|---|
| `docs/core/MASTER_v1.2.md` | Only Lead commits directly. All arch decisions live here. |
| `docs/contract/API_CONTRACT_v1.2.md` | BE proposes → Lead confirms before implementation |
| `docs/TASKS.md` | Update after every task completion |
| All migrations (`be/migrations/*.sql`) | Review + approve before any dev runs them |
| All spec files (`docs/spec/Spec_*.md`) | Write + own. No spec = no task. |

You do NOT write application code unless it's a pairing session.

## How to Write a Spec (4-Gate checklist)

Every spec section must pass all 4 gates before task rows can be created:

**Gate 1 — SCOPE CHECK**
- [ ] Feature appears in BRD Phase 1 scope (`docs/requirements/BanhCuon_BRD_v1.md`)
- [ ] User roles are defined (maps to RBAC in MASTER §3)
- [ ] Out-of-scope items explicitly listed in the spec

**Gate 2 — RULE CHECK**
- [ ] All business rules numbered (BR-001, BR-002…) and sourced from SRS
- [ ] Acceptance criteria defined per endpoint or per component
- [ ] NFR constraints noted (latency, concurrency) if they affect implementation

**Gate 3 — CONTRACT COMPLETENESS**
- [ ] Every endpoint has: method + path + role + request shape + field types + validation rules + response shape + status code + side effects
- [ ] Every state machine has: all transitions + conditions + invalid transition behavior
- [ ] Out-of-scope items noted ("Payment processing → Spec_5, not here")
- [ ] A dev reading ONLY this section can implement it with zero guessing

**Gate 4 — SPLIT CHECK**
- [ ] Each spec section has single ownership (one RBAC domain, one protocol)
- [ ] Mixed-ownership sections split into separate specs (e.g. orders ≠ payments)

Full rules with examples: **`docs/base/LESSONS_LEARNED_v3.md` Phần 7** (§7.1–§7.3)

Visual: `docs/doc_structure/task/spec_task_chain.excalidraw`

## How to Review a Task Row

Before any task row is accepted into `docs/TASKS.md`:

- [ ] Has an `ID` traceable to a spec section
- [ ] Has a `spec_ref` (FE tasks: **required**; BE tasks: strongly preferred)
- [ ] FE tasks: also has a `draw_ref` pointing to a wireframe zone
- [ ] Dependencies listed and all ✅ before the task can start
- [ ] The task is independently verifiable (can pass `go build ./...` or `npm run build` alone)
- [ ] Not too large: if it only works when 3 other tasks are also done → split it

Split signals (when to split one task into two): **`docs/base/LESSONS_LEARNED_v3.md` §7.5**

## How to Review a PR

| Check | Where |
|---|---|
| Handler layer has no business logic | `be/internal/handler/` |
| Service layer has no gin imports | `be/internal/service/` |
| Error codes match contract | `docs/contract/ERROR_CONTRACT_v1.1.md` |
| DB field names match schema | `docs/be/DB_SCHEMA_SUMMARY.md` |
| FE state in correct layer | `docs/fe/FE_SYSTEM_GUIDE.md §0` |
| No `.env` committed | `git diff` |
| Migration has rollback | `be/migrations/*.sql` — check for `-- +goose Down` |
| FE: no token in localStorage | check `store/*.ts` files |
| FE: no hex colors in className | check component files |
| Task traced back to spec | `spec_ref` field in TASKS.md row |

## Conflict Resolution

| Situation | Rule |
|---|---|
| Spec vs MASTER.docx conflict | MASTER wins. Notify BA to update spec. |
| TASKS.md vs CLAUDE.md conflict | TASKS.md wins. |
| Decision affecting > 1 role | Lead arbitrates, logs in Decision Log (MASTER §ADR) |
| Blocking gap from dev | Respond within 4h during work hours |
| Task has no spec_ref | ❓ CLARIFY before allowing work to start |
| Task cannot be traced to BRD | 🔴 STOP — feature was never agreed on |

## Key Architecture Decisions (do not re-debate)

| # | Decision | Rationale |
|---|---|---|
| D-001 | sqlc over GORM | Type-safety, no ORM magic — see MASTER §7.1 |
| D-002 | UUID v4 for PKs | No sequence leak, easy cross-env merge |
| D-003 | DECIMAL(10,0) for VND prices | No float rounding issues |
| D-004 | Access token in memory (Zustand) | Prevent XSS via localStorage |
| D-005 | Combo expand at order time | Kitchen sees actual dishes, not combo names |

## Diagram References

| Visual | Purpose |
|---|---|
| `docs/doc_structure/task/spec_task_chain.excalidraw` | BRD→SRS→Spec→Task transformation chain |
| `docs/doc_structure/claude_decision_workflow.excalidraw` | How Claude reads docs + makes decisions per session |
| `docs/workflow.excalidraw` | Claude execution workflow v1.1 (7-step loop + FE Pre-Task Phase) |

## Branch + Commit Convention

```
feature/spec-001-auth
fix/auth-refresh-token-null
chore/docker-compose-redis-stack
```
