# Onboarding — Backend Developer

> Read this first. Then open `docs/be/BE_SYSTEM_GUIDE.md` and go.

---

## Your Stack

Go 1.25 · Gin · sqlc · MySQL 8.0 · Redis Stack 7 · Goose · Docker Compose

## Your Entry Point

**`docs/be/BE_SYSTEM_GUIDE.md`** — start every session here. It has the full epic list, scaffold state, code patterns, and what to read per domain.

## Architecture (memorize this)

```
HTTP → handler → service → repository → db (sqlc-generated)
                               ↕
                            pkg/ (jwt · bcrypt · redis)
```

Never skip a layer. Handler calls service. Service calls repository. Repository calls sqlc.

## Phase Status (as of 2026-05-06)

| Phase | Status |
|---|---|
| Phase 1 — DB Migrations | ✅ COMPLETE |
| Phase 3 — sqlc + Project Setup | ✅ COMPLETE |
| Phase 4 — Backend | ✅ COMPLETE — all domains + AC verified |
| Phase 6 — DevOps | ✅ COMPLETE |
| Phase 7 — Testing + Go-Live | ⬜ NEXT — see `docs/TASKS.md` |

**Next tasks:** open `docs/TASKS.md` → Phase 7 section → first ⬜ task with all dependencies ✅.

## What's Already Done (do not recreate)

- `be/internal/db/` — sqlc-generated (do not edit)
- All handlers: auth, products, orders, payments, QR/POS, staff, admin
- All services: auth, product, order, payment, staff, admin
- All repositories: same domains
- `be/internal/middleware/auth.go` + `rbac.go` — done
- `be/pkg/jwt/` · `bcrypt/` · `redis/` — done
- All migrations 001–011 — done
- Docker Compose + Caddyfile + CI/CD — done

## Key Rules

| Rule | Why |
|---|---|
| Handler must NOT contain business logic | Put it in service |
| Service must NOT import gin | Keeps it testable |
| Always use `respondError()` from `handler/respond.go` | Error format contract |
| DB field names from `docs/be/DB_SCHEMA_SUMMARY.md` | Single source of truth |
| Error codes from `docs/contract/ERROR_CONTRACT_v1.1.md` | Never invent new codes |
| All IDs are `string` (UUID CHAR(36)) | Never use `int` for IDs |
| Redis writes must have TTL | Never store without expiry |
| Multi-table mutations: use a transaction | Prevent partial writes |

## How Tasks Are Created (read before writing any new task row)

New task rows must follow the 4-level transformation chain:

```
BRD (scope) → SRS (rules) → Spec (contract) → Task row (verifiable unit)
```

Full rules: **`docs/base/LESSONS_LEARNED_v3.md` Phần 7** (§7.1 chain · §7.3 spec gates · §7.4 task checklist · §7.5 split signals)

Visual: `docs/doc_structure/task/spec_task_chain.excalidraw`

**Key task creation rules for BE:**
- 1 task = 1 independently verifiable unit (`go build ./...` proves it)
- Split when: different business rule, different protocol (SSE ≠ WS), mandatory side effect
- Every task must have a `spec_ref` traceable back to a spec section

## How Claude Works (useful for pairing sessions)

Claude reads docs in this order each session:
1. `CLAUDE.md` → session state
2. `docs/TASKS.md` → next task
3. Spec for the domain → implementation contract
4. `MASTER_v1.2.md` §3/§4/§6 → RBAC + business rules + JWT

Visual: `docs/doc_structure/claude_decision_workflow.excalidraw`

## Branch Naming

`feature/spec-001-auth` · `fix/auth-refresh-token-null`

## Useful Commands

```bash
cd be && go build ./...
go test ./be/internal/service/... -run TestLogin
goose -dir be/migrations mysql "$DB_DSN" up
docker compose logs -f be
docker compose up -d --build be
cd be && sqlc generate       # after any migration change
```
