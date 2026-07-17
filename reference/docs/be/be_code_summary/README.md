# BE Code Summary — Index

> **Read these instead of the source.** This folder mirrors `be/` so a session can answer
> "what's the route / field / env var / DTO" without grepping Go files.
> When code changes, update the matching file here (each says how to re-generate).

| File | Answers | Source mirrored |
|---|---|---|
| [`BE_STRUCTURE.md`](BE_STRUCTURE.md) | Folder tree · layer rules · **Route Table (87 routes)** · background jobs · realtime · RBAC | `be/cmd/server/main.go`, folder layout |
| [`CODEBASE_GRAPH_BE.md`](CODEBASE_GRAPH_BE.md) | Per-domain handler→service→repo→DB graph · service & repository method indexes | `be/internal/**` |
| [`DB_SCHEMA_SUMMARY.md`](DB_SCHEMA_SUMMARY.md) | Every table, column, type, FK · Redis keys · field-name gotchas | `be/migrations/001–015` |
| [`BE_ENV_CONFIG.md`](BE_ENV_CONFIG.md) | Every env var · purpose · default · where read | `os.Getenv` calls |
| [`BE_API_DTO.md`](BE_API_DTO.md) | Per-endpoint request/response shapes · per-endpoint error codes · response envelope | handler binding structs + `service/errors.go` |

## Which file for which question

- "Does endpoint X exist / what auth?" → `BE_STRUCTURE.md` Route Table
- "What fields does the request/response have?" → `BE_API_DTO.md`
- "What error codes can it return?" → `BE_API_DTO.md` (catalog + per-endpoint)
- "What's the DB column / type / FK?" → `DB_SCHEMA_SUMMARY.md`
- "What env var configures Y?" → `BE_ENV_CONFIG.md`
- "What does this service/repo expose?" → `CODEBASE_GRAPH_BE.md` indexes

## Staleness

All files carry a "Last generated" line. After a BE change, re-run the verification at the top of
each file (mostly: `grep`/route-count diff against `main.go`). The `/codebase-graph be` skill
regenerates the structure + graph docs.
