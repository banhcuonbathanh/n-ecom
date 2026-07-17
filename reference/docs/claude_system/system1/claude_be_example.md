<!--
  ════════════════════════════════════════════════════════════════════════
  REFERENCE / GOLD-STANDARD EXAMPLE — not a live config.
  Models a scoped BACKEND CLAUDE.md (be/CLAUDE.md). Same 6 principles as the
  FE example; WHY notes here show only what is BE-specific.
  ════════════════════════════════════════════════════════════════════════
-->

# be/CLAUDE.md

> Tầng 1 — BE map only. **Does NOT contain:** SQL, DTO field lists, error strings, business rules.
> Scope: the Go API service. Parent map → [../CLAUDE.md](../CLAUDE.md).

<!-- WHY (BE gate) — BE has TWO mandatory reads: the navigation index AND the skill.
     The index answers "where do I read X"; the skill carries the coding rules. -->
> **MANDATORY before any code:** read [docs/be/BE_DOC_INDEX.md](../docs/be/BE_DOC_INDEX.md)
> (the "where do I read X" map), then the `backend-go` skill. Read code summaries —
> **do not grep Go source** unless you need exact line numbers.

---

## Read before code

| Need | File | Section |
|---|---|---|
| Routes / handlers that exist | [docs/be/be_code_summary/](../docs/be/be_code_summary/) | routes |
| DTO shapes (request/response) | [docs/be/be_code_summary/](../docs/be/be_code_summary/) | DTOs |
| Error codes + `respondError` pattern | [ERROR_CONTRACT_v1.1.md](../docs/contract/ERROR_CONTRACT_v1.1.md) | — |
| DB field names (single source) | [DB_SCHEMA_SUMMARY.md](../docs/be/be_code_summary/DB_SCHEMA_SUMMARY.md) | — |
| Endpoint contract | [API_CONTRACT_v1.2.md](../docs/contract/API_CONTRACT_v1.2.md) | per domain |
| Business rules (order/payment/cancel) | [MASTER_v1.2.md](../docs/core/MASTER_v1.2.md) | §4 |

## Architecture (strict)

<!-- WHY — The defining BE invariant: the one-way layer flow. State it; never violate it. -->
```
handler → service → repository → db   (sqlc generated — never hand-write SQL in a handler)
```
Each layer calls only the one below it. No skipping, no upward calls.

## Critical pointers (the traps)

<!-- WHY — BE traps are about the generate-step and the contract, not styling. -->
- After any `.sql` change → `cd be && sqlc generate` BEFORE `go build`. Stale generated code = confusing errors. (Migrations → use the `db-migration` skill.)
- Field names come from [DB_SCHEMA_SUMMARY.md](../docs/be/be_code_summary/DB_SCHEMA_SUMMARY.md) — one source. Do not guess column names.
- All errors go through the `respondError` pattern — never `c.JSON` an ad-hoc error shape.
- IDs are UUID strings end-to-end (DB → DTO → API), matching the FE contract.

## Commands

```bash
cd be && sqlc generate && cd .. && go build ./...
go test ./be/internal/service/... -run TestLogin
goose -dir be/migrations mysql "$DB_DSN" up
docker compose up -d --build be
```

## Root context

Parent map → [../CLAUDE.md](../CLAUDE.md) · contract truth → API_CONTRACT / ERROR_CONTRACT · how-to → `backend-go` skill.

<!--
  WHAT'S DIFFERENT ABOUT A BE CLAUDE.md (vs. the FE example):
  • Two mandatory pre-reads, not one: the BE_DOC_INDEX (navigation) + the skill
    (rules). FE folds navigation into the skill; BE keeps a separate index.
  • The headline invariant is the LAYER FLOW (handler→service→repo→db), the way
    FE's headline is the STATE split (server/client/forms). Each area leads with
    its own architectural spine.
  • The signature trap is process, not appearance: "run sqlc generate after .sql
    changes." Compare FE's "no hardcoded hex." Lead with the trap your stack
    actually trips on.
  • Still POINTS, never restates: column names live in DB_SCHEMA_SUMMARY, error
    shapes in ERROR_CONTRACT — this file only says where.
-->
