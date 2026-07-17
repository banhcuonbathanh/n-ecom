# PLAN 11-1 — AI Service Scaffold

> **TL;DR:** Stand up a new stateless **Python FastAPI** service `ai:8000`, add it to Docker Compose,
> route `/ai/*` to it in Caddy, and have it validate the **same JWT** the Go BE issues. This is the
> foundation every other AI feature plugs into. No AI logic yet — just the lane + auth + health.

---

## Goal

A running `ai` service reachable at `https://<host>/ai/*` through Caddy, that:
- boots in Compose alongside `be`/`fe`/`mysql`/`redis`/`caddy`,
- exposes `GET /ai/health` → `200`,
- validates a Go-issued JWT (shared HMAC secret) and rejects bad/expired tokens with the project's error envelope shape,
- holds the `ANTHROPIC_API_KEY` (never exposed to FE).

## Scope — files

| File | Change |
|---|---|
| `ai/` (new dir) | FastAPI app: `main.py`, `auth.py` (JWT verify), `config.py`, `requirements.txt`, `Dockerfile` |
| `docker-compose.yml` | add `ai` service (build `./ai`, port 8000, env `ANTHROPIC_API_KEY`, `JWT_SECRET`, `REDIS_URL`, `BE_URL`) |
| `Caddyfile` | add `/ai/*` → `ai:8000` route (before the catch-all `→ fe`) |
| `.env.example` | add `ANTHROPIC_API_KEY=` |

> Scope contract: touch ONLY the above. The shared `JWT_SECRET` must match the Go BE's signing key —
> read it, do not invent a new one.

## Approach

1. FastAPI + `uvicorn`; `anthropic` SDK; `pyjwt` for verify; `redis` client.
2. `auth.py`: dependency that reads `Authorization: Bearer`, verifies HS256 with `JWT_SECRET`, exposes
   claims (`sub`, `role`, `table_id`). Guest tokens allowed for chat; staff-only for CV.
3. Mirror the BE error envelope so FE error mapping ([ERROR_SPEC](../02_spec/ERROR_SPEC.md)) still works.
4. Caddy route mirrors the existing `/api/*` block.

## Acceptance Criteria

- [ ] `docker compose up -d ai` → service healthy.
- [ ] `GET /ai/health` via Caddy → `200`.
- [ ] Request with a valid staff JWT passes the auth dependency; missing/expired → `401` in envelope format.
- [ ] `ANTHROPIC_API_KEY` present in container, absent from any FE bundle.

## Dependencies

None (foundation task). Blocks 11-2, 11-3, 11-4.

## Open Decisions

- Decision §4.3 (where the API key lives) — default `.env` + Compose env, matching existing secrets.
