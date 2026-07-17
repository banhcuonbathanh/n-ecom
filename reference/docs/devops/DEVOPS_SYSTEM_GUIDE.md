# DevOps System Guide — Hệ Thống Quản Lý Quán Bánh Cuốn

> **Version:** v1.0 · 2026-04-30
> **Purpose:** Single self-contained manual for all DevOps work. Every DevOps session starts here.
> **Rule:** This file = everything you need. Do NOT touch BE/FE source code — that belongs to their owners.

---

## 0 — Project Snapshot

**System:** QR ordering + KDS + POS for a Vietnamese food stall.

**Stack:** Docker Compose · Go 1.25 BE · Next.js 14 FE · MySQL 8.0 · Redis Stack 7 · Caddy · GitHub Actions

**Ports (local):** BE=8080 · FE=3000 · MySQL=3306 · Redis=6379 · RedisInsight=8001

**Ownership (strict):**

| DevOps Owns | DO NOT Touch |
|---|---|
| `docker-compose.yml` | `be/` source code |
| `Dockerfile.be` · `Dockerfile.fe` | `fe/` source code |
| `Caddyfile` | `be/migrations/` SQL files |
| `.env.example` (never `.env`) | `docs/` (Lead + BA) |
| `.github/workflows/deploy.yml` | — |
| `scripts/migrate.sh` | — |

---

## 1 — Epics (Build Order)

| Epic | Name | Status | Blocks |
|---|---|---|---|
| **DO-1** | Dockerfile.be — Go multi-stage | 🔄 ~80% done | Full stack |
| **DO-2** | Dockerfile.fe — Next.js standalone | 🔄 ~80% done | Full stack |
| **DO-3** | docker-compose.yml — 5 services | 🔄 ~80% done | Full stack |
| **DO-4** | `.env.example` + `scripts/migrate.sh` | ⬜ pending | BE startup |
| **DO-5** | Caddyfile — HTTPS reverse proxy | ⬜ pending | Production |
| **DO-6** | `.github/workflows/deploy.yml` — CI/CD | ⬜ pending | Go-live |

---

## 2 — docker-compose Stack

5 services, startup order enforced via `depends_on` + `condition: service_healthy`:

```
mysql (healthcheck: mysqladmin ping)
  └── redis (healthcheck: redis-cli ping)
        └── backend (wait-for-db → migrate → start server)
              └── frontend (depends on backend)
                    └── caddy (reverse proxy, auto TLS)
```

```yaml
services:
  mysql:
    image: mysql:8.0
    environment: { MYSQL_DATABASE: banhcuon, ... }
    healthcheck: { test: mysqladmin ping }
    volumes: [mysql_data:/var/lib/mysql]

  redis:
    image: redis/redis-stack:latest   # Redis + RedisBloom + RedisTimeSeries
    healthcheck: { test: redis-cli ping }

  backend:
    build: { context: ./be, dockerfile: Dockerfile.be }
    depends_on: { mysql: { condition: service_healthy }, redis: { condition: service_healthy } }
    env_file: .env
    command: ["/scripts/migrate.sh"]   # script ends with exec /app/server

  frontend:
    build: { context: ./fe, dockerfile: Dockerfile.fe }
    depends_on: [backend]
    environment: { NEXT_PUBLIC_API_URL: http://backend:8080 }

  caddy:
    image: caddy:2-alpine
    volumes: [./Caddyfile:/etc/caddy/Caddyfile]
    ports: ["80:80", "443:443"]
```

---

## 3 — Dockerfile Patterns

### Dockerfile.be (Go multi-stage)

```dockerfile
# Stage 1: build
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Stage 2: run (distroless for minimal attack surface)
FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/server /app/server
COPY --from=builder /app/scripts /scripts
EXPOSE 8080
CMD ["/app/server"]
```

### Dockerfile.fe (Next.js standalone)

```dockerfile
# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: run (standalone output)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

> `next.config.js` must have `output: "standalone"` for this to work.

---

## 4 — scripts/migrate.sh

```bash
#!/bin/sh
set -e

# Wait for MySQL to be ready
until mysqladmin ping -h"$DB_HOST" --silent; do
  echo "Waiting for MySQL..."
  sleep 2
done

# Run goose migrations
goose -dir /migrations mysql "$DB_DSN" up

# Start the server
exec /app/server
```

---

## 5 — .env.example

```bash
# Database
DB_DSN=user:pass@tcp(mysql:3306)/banhcuon?parseTime=true
DB_HOST=mysql

# Redis
REDIS_URL=redis://redis:6379

# JWT (generate: openssl rand -hex 32)
JWT_SECRET=REPLACE_WITH_RANDOM_256BIT_HEX
JWT_EXPIRY_ACCESS=86400
JWT_EXPIRY_REFRESH=2592000

# Storage
STORAGE_BASE_URL=https://cdn.banhcuon.vn
STORAGE_PATH=/var/www/uploads

# VNPay (from VNPay merchant portal)
VNPAY_TMN_CODE=REPLACE
VNPAY_HASH_SECRET=REPLACE

# Server
PORT=8080
GIN_MODE=release
```

> **Rule:** When adding a new env var → update `.env.example` + notify all devs. NEVER commit `.env`.

---

## 6 — Caddyfile

```caddy
banhcuon.vn {
    reverse_proxy /api/* backend:8080
    reverse_proxy /* frontend:3000
}
```

> Domain A record must point to server IP before starting Caddy (auto TLS via Let's Encrypt).

---

## 7 — CI/CD Pipeline (.github/workflows/deploy.yml)

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & push images
        run: |
          docker build -t banhcuon-be:${{ github.sha }} -f be/Dockerfile.be ./be
          docker build -t banhcuon-fe:${{ github.sha }} -f fe/Dockerfile.fe ./fe
      - name: SSH deploy
        run: |
          ssh deploy@${{ secrets.SERVER_IP }} \
            "cd /opt/banhcuon && docker compose pull && docker compose up -d"
```

> Only deploy when all tests pass. Rollback: `docker pull <previous-sha> && docker compose up -d`.

---

## 8 — Working Protocol

| Situation | Action |
|---|---|
| Add env var | Update `.env.example` + `docs/core/MASTER_v1.2.md §8` + notify team |
| Port conflict local | BE=8080 · FE=3000 · MySQL=3306 · Redis=6379 |
| MySQL data volume | NEVER delete `mysql_data` without backup in production |
| SSL certs | Caddy manages automatically — check domain DNS first |
| BE/FE code change | `docker compose up -d --build be` or `--build fe` |

---

## 9 — Local Dev Quick Commands

```bash
# First time
cp .env.example .env
openssl rand -hex 32   # paste into JWT_SECRET in .env

# Start full stack
docker compose up -d

# Check status
docker compose ps
docker compose logs -f be

# Rebuild after code change
docker compose up -d --build be
docker compose up -d --build fe

# Stop
docker compose down
docker compose down -v   # also wipes volumes (CAREFUL in prod)
```

---

## 10 — Docs to Read Per Epic

| Epic | Read Before Starting |
|---|---|
| DO-1, DO-2 | This guide §3 · `docs/devops/DOCKER_GUIDE.md` |
| DO-3 | This guide §2 · `docs/devops/DOCKER_GUIDE.md` |
| DO-4 | This guide §4 · §5 · `docs/core/MASTER_v1.2.md §8` |
| DO-5 | This guide §6 |
| DO-6 | This guide §7 |
