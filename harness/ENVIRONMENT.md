# ENVIRONMENT.md — Execution Environment (Primitive 5)

> The bounded reality where things actually run: containers, ports, env vars, secrets.
> Single source for all commands — CLAUDE.md points here, never duplicates.

---

## Dev stack

⬜ DECIDE in Session 0 (suggested: Docker Compose, one service per component).

| Service | Port | Notes |
|---|---|---|
| backend | ⬜ | |
| frontend | ⬜ | |
| db | ⬜ | |
| cache | ⬜ | |

## Commands

```bash
# ⬜ fill with real commands once the stack exists — examples:
docker compose up -d                 # full stack
docker compose up -d --build be|fe   # after code changes
docker compose logs -f be
# build / test / migrate commands per stack choice
```

## Environment variables

| Var | Where it lives | Rule |
|---|---|---|
| `⬜ DB_DSN` etc. | `.env` (gitignored) + `.env.example` (committed, no values) | every new var goes in BOTH |
| AI keys (e.g. `ANTHROPIC_API_KEY`) | backend env ONLY | must never reach the frontend or the repo |

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
