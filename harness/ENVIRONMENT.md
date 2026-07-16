# ENVIRONMENT.md — Execution Environment (Primitive 5)

> The bounded reality where things actually run: containers, ports, env vars, secrets.
> Single source for all commands — CLAUDE.md points here, never duplicates.

---

## Dev stack

✅ Decided Session 0: Docker Compose, one service per component. Ports below are the
plan; F-2 makes them real (fix this table if F-2 changes anything — rule 5).

| Service | Port | Notes |
|---|---|---|
| caddy | 80 | reverse proxy, single dev entrypoint → `/api/*` → be, rest → fe |
| backend (be) | 8080 | Go + Gin, internal; reached via caddy |
| frontend (fe) | 3000 | Next.js dev server, internal; reached via caddy |
| db | 3306 | MySQL 8, exposed to host for GUI clients |
| cache | 6379 | Redis |

## Commands

```bash
# Planned for the decided stack — F-2/F-3 confirm each one works, then remove this note.
docker compose up -d                 # full stack
docker compose up -d --build be      # rebuild backend after code changes
docker compose up -d --build fe      # rebuild frontend
docker compose logs -f be            # tail backend logs

# Backend (run inside be/ or via the be container)
go build ./... && go vet ./...       # build check
go test ./...                        # tests
sqlc generate                        # regen repository code after query changes

# Frontend (run inside fe/)
npm run dev                          # local dev outside compose
npm run build && npm run lint        # build + lint check

# Migrations — tool decided in F-3; record exact up/down commands here then.
```

## Environment variables

| Var | Where it lives | Rule |
|---|---|---|
| `DB_DSN` | `.env` (gitignored) + `.env.example` (committed, no values) | every new var goes in BOTH |
| `REDIS_ADDR` | `.env` + `.env.example` | same |
| `JWT_SECRET` | `.env` + `.env.example` (empty value) | backend only; Accounts phase |
| `NEXT_PUBLIC_API_BASE_URL` | `fe` env | the ONLY var the FE gets; everything else is BE-side |
| AI keys (e.g. `ANTHROPIC_API_KEY`) | backend env ONLY (when AI phase opens) | must never reach the frontend or the repo |

## Secrets rules (non-negotiable)

1. `.env` is gitignored from commit #1. `.env.example` mirrors keys with empty values.
2. No secret in code, compose files, logs, or docs — env vars only.
3. Payment gateway keys: sandbox keys in dev, live keys only in production env.
4. Verification receipts (curl transcripts, screenshots) must be scrubbed of tokens
   before logging to `VERIFICATION.md`.

## Isolation rules for the AI

- All destructive commands (volume wipes, `down -v`, data resets) → ask first.
- Test against the compose stack, not against any production URL.
- Browser verification runs against localhost only.
