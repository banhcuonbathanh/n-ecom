# Onboarding — DevOps Engineer

> Read this first. Then open `docs/devops/DEVOPS_SYSTEM_GUIDE.md` and go.

---

## Your Stack

Docker Compose · Dockerfile (Go multi-stage + Next.js standalone) · Caddy (auto TLS) · GitHub Actions · MySQL 8.0 · Redis Stack 7

## Your Entry Point

**`docs/devops/DEVOPS_SYSTEM_GUIDE.md`** — start every session here. It has the full epic list, docker-compose spec, Dockerfile patterns, Caddy config, and CI/CD pipeline.

## What You Own

```
docker-compose.yml
Dockerfile.be · Dockerfile.fe
Caddyfile
.env.example          ← template only, NEVER the real .env
scripts/migrate.sh
.github/workflows/deploy.yml
```

You do NOT touch `be/` or `fe/` source code.

## Your First 3 Tasks (in order)

1. **DO-4** — Create `.env.example` (all vars from `docs/core/MASTER_v1.2.md §8`) + `scripts/migrate.sh` (wait-for-mysql → goose up → exec server)
2. **DO-5** — Write `Caddyfile` (route `/api/*` → backend:8080, `/*` → frontend:3000, auto TLS)
3. **DO-6** — Write `.github/workflows/deploy.yml` (build + push image + SSH deploy, only when tests pass)

> DO-1, DO-2, DO-3 (Dockerfiles + compose) are ~80% done. Verify they work end-to-end first.

## Key Rules

| Rule | Why |
|---|---|
| NEVER commit `.env` | Secrets must stay out of git |
| Add env var → update `.env.example` + `MASTER_v1.2.md §8` + notify team | Single source of truth |
| NEVER delete `mysql_data` volume without backup | Production data loss |
| Deploy only when tests pass | CI gate |
| Rollback = `docker pull <previous-sha> && docker compose up -d` | Fast recovery |

## Local Dev Quick Start

```bash
cp .env.example .env
openssl rand -hex 32   # paste into JWT_SECRET in .env
docker compose up -d
docker compose ps      # all services should show running
docker compose logs -f be
```

## Ports

BE=8080 · FE=3000 · MySQL=3306 · Redis=6379 · RedisInsight=8001
