# Docker Local Dev Guide

> Run the full stack (MySQL + Redis + BE + FE) locally with one command.

---

## First-time setup (do this once)

### 1. Copy the env file

```bash
cp .env.example .env
```

### 2. Set JWT_SECRET (required — app will refuse to start without it)

```bash
# Generate a secure random secret and paste it into .env
openssl rand -hex 32
```

Open `.env` and replace the `JWT_SECRET` line:

```
JWT_SECRET=<paste the output here>
```

Everything else in `.env` has safe defaults for local dev — you don't need to change them.

---

## Start everything

Run from the **project root** (where `docker-compose.yml` lives):

```bash
docker compose up -d
```

First run takes ~2–3 minutes to:
- Pull MySQL 8.0 + Redis Stack images
- Build the Go backend image
- Build the Next.js frontend image
- Run database migrations automatically

---

## Check it's running

```bash
docker compose ps
```

Expected output — all services should show `running` or `exited (0)` for migrate:

```
NAME        STATUS
mysql       running
redis       running
migrate     exited (0)    ← migrations ran successfully
be          running
fe          running
```

---

## Open in browser

| URL | What |
|---|---|
| http://localhost:3000 | Next.js frontend |
| http://localhost:8080/health | Backend health check → `{"status":"ok"}` |
| http://localhost:8001 | RedisInsight (Redis GUI) |

---

## Watch logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f be

# Frontend only
docker compose logs -f fe

# Migrations (check if they ran OK)
docker compose logs migrate
```

---

## After changing code

```bash
# Rebuild and restart only the changed service
docker compose up -d --build be     # after Go code changes
docker compose up -d --build fe     # after Next.js code changes

# Or rebuild everything
docker compose up -d --build
```

---

## Stop

```bash
# Stop containers, keep database data
docker compose down

# Stop AND wipe all data (fresh start)
docker compose down -v
```

---

## Troubleshooting

### `be` exits immediately after starting

```bash
docker compose logs be
```

Common causes:
- `JWT_SECRET` not set in `.env`
- MySQL not ready yet — run `docker compose up -d` again, migrate needs to finish first

### Migrations failed

```bash
docker compose logs migrate
```

If migration failed midway, reset and retry:

```bash
docker compose down -v
docker compose up -d
```

### Port already in use

```bash
# Find what's using the port
lsof -i :3000
lsof -i :8080
lsof -i :3306
```

Kill the process or change the host port in `docker-compose.yml` (left side of `ports: "HOST:CONTAINER"`).

### Frontend shows "cannot connect to API"

The FE image bakes `NEXT_PUBLIC_API_URL` at build time. If you changed it in `.env`:

```bash
docker compose up -d --build fe
```

---

## Useful one-liners

```bash
# Restart a single service without rebuild
docker compose restart be

# Open a shell inside the backend container
docker compose exec be sh

# Open MySQL shell
docker compose exec mysql mysql -u banhcuon -pbanhcuonpass banhcuon

# Open Redis CLI
docker compose exec redis redis-cli
```
