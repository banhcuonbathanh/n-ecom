# Go-Live Runbook — Hệ Thống Quản Lý Quán Bánh Cuốn

> **Task:** P7-10 · **Owner:** DevOps · **Completed:** 2026-05-31
>
> Run this document top-to-bottom on first production deploy.
> Subsequent deploys are automatic (push to `main` triggers CI/CD).

---

## Prerequisites

| Item | Detail |
|---|---|
| VPS | Ubuntu 22.04+ · min 2 vCPU, 2 GB RAM, 20 GB disk |
| Domain | DNS managed (Cloudflare, GoDaddy, etc.) |
| GitHub repo | `main` branch is deployable |
| Docker | v24+ with Compose plugin (`docker compose version`) |

---

## Step 1 — VPS Initial Setup

SSH into VPS as root, then:

```bash
# Install Docker (official script)
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu   # replace 'ubuntu' with your sudo user

# Firewall — only allow SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Create deploy directory
mkdir -p /opt/banhcuon
chown ubuntu:ubuntu /opt/banhcuon
```

> **Security:** ports 3306 (MySQL), 6379 (Redis), 8080 (BE), 3000 (FE) are NOT opened.
> All traffic flows through Caddy (80/443) only.

---

## Step 2 — DNS A Record

In your DNS provider, add:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `yourdomain.com` | `<VPS_IP>` | 300 |
| A | `www.yourdomain.com` | `<VPS_IP>` | 300 |

Verify propagation before continuing (Caddy needs DNS to resolve for ACME):

```bash
dig +short yourdomain.com       # should return VPS IP
curl -I http://yourdomain.com   # should reach VPS (may 502 before app is running)
```

---

## Step 3 — GitHub Secrets

In the GitHub repository → **Settings → Secrets → Actions**, add:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | VPS IP or `yourdomain.com` |
| `DEPLOY_USER` | SSH user (e.g. `ubuntu`) |
| `DEPLOY_KEY` | SSH private key (generate: `ssh-keygen -t ed25519`) |
| `DEPLOY_PATH` | `/opt/banhcuon` |
| `NEXT_PUBLIC_API_URL` | `https://yourdomain.com/api/v1` — **must end with `/api/v1`** (FE api-client/SSE append paths to it) |

Add the SSH public key to `~/.ssh/authorized_keys` on the VPS.

---

## Step 4 — Clone Repo + Configure Env

On the VPS (as deploy user):

```bash
cd /opt/banhcuon

# Clone repo
git clone https://github.com/YOUR_ORG/YOUR_REPO.git .

# Create production .env from template
cp .env.example .env
```

Edit `.env` and fill **every** `CHANGE_ME` value:

```bash
# Critical — generate a real secret:
JWT_SECRET=$(openssl rand -hex 32)

# Production values:
CADDY_HOST=yourdomain.com
ACME_EMAIL=admin@yourdomain.com
CORS_ORIGINS=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1   # must end with /api/v1
WEBHOOK_BASE_URL=https://yourdomain.com
STORAGE_BASE_URL=https://yourdomain.com/uploads

# Set strong DB passwords:
MYSQL_ROOT_PASSWORD=<strong-random-password>
MYSQL_PASSWORD=<strong-random-password>
DB_DSN=banhcuon:<MYSQL_PASSWORD>@tcp(mysql:3306)/banhcuon?parseTime=true&charset=utf8mb4
```

> **Payment gateways (P7-7):** Fill `VNPAY_*`, `MOMO_*`, `ZALOPAY_*` once you have
> production credentials from each gateway. Until then, leave as `CHANGE_ME` —
> the app starts without them; payment endpoints will return errors.

---

## Step 5 — First-Time Boot

```bash
cd /opt/banhcuon

# Pull images (use latest for first deploy, CI/CD tags by SHA after)
export BE_IMAGE=ghcr.io/YOUR_ORG/YOUR_REPO/be:latest
export FE_IMAGE=ghcr.io/YOUR_ORG/YOUR_REPO/fe:latest

# Authenticate to GHCR (needed to pull private packages)
echo "<GITHUB_PAT>" | docker login ghcr.io -u <GITHUB_USERNAME> --password-stdin

# Start full stack (migrations run automatically via migrate.sh)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build

# Verify all containers are healthy
docker compose ps
docker compose logs be --tail 50
```

Expected output from `docker compose ps`:

```
NAME        STATUS          PORTS
mysql       running (healthy)
redis       running (healthy)
be          running
fe          running
caddy       running
```

---

## Step 6 — Run Database Migrations

Migrations run automatically on BE startup via `be/entrypoint.sh` (goose up, then server).
Verify they completed:

```bash
docker compose logs be | grep "entrypoint"
# Expected: "[entrypoint] migrations up to date, starting server"
```

If migrations failed, check and run manually:

```bash
docker compose exec be sh -c "goose -dir /migrations mysql \"\$DB_DSN\" status"
docker compose exec be sh -c "goose -dir /migrations mysql \"\$DB_DSN\" up"
```

---

## Step 7 — Seed Data

Run once on first deploy to create staff accounts and initial menu:

```bash
docker compose exec -T mysql \
  mysql -ubanhcuon -p"${MYSQL_PASSWORD}" banhcuon \
  < scripts/seed.sql
```

Default staff credentials (change passwords after first login):

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |
| `manager1` | `manager123` | Manager |
| `chef1` | `chef1234` | Chef |
| `cashier1` | `cashier123` | Cashier |

---

## Step 8 — Verify SSL Certificate

Caddy auto-provisions a Let's Encrypt certificate. Allow ~60 seconds after first start, then:

```bash
curl -v https://yourdomain.com/health 2>&1 | grep -E "SSL|issuer|expire|HTTP"
```

Expected: `SSL connection using TLS 1.3` + `issuer: C=US; O=Let's Encrypt`

If Caddy fails to get a cert, check:

```bash
docker compose logs caddy
# Common issues:
#   - DNS A record not propagated yet (wait, then restart caddy)
#   - Port 80 blocked by firewall (ufw status)
#   - ACME rate limit hit (max 5 certs/domain/week)
```

---

## Step 9 — Smoke Test

```bash
BASE_URL=https://yourdomain.com ./scripts/smoke_test.sh
```

Expected: `X passed, 0 failed`

Manual verification checklist:

- [ ] `https://yourdomain.com` loads the menu page
- [ ] QR scan → menu → add item → checkout works end-to-end
- [ ] `/admin` login with `admin` / `admin123` succeeds
- [ ] `/kds` shows orders for `chef1`
- [ ] `/pos` accessible for `cashier1`
- [ ] WebSocket real-time updates work on KDS/Overview

---

## Step 10 — Subsequent Deploys (Automated)

Every push to `main` triggers the CI/CD pipeline:

1. **Test** — `go test ./be/...`
2. **Build & Push** — BE + FE images tagged with commit SHA → GHCR
3. **Deploy** — SSH to VPS, pull images, `docker compose up --no-build`
4. **Health check** — waits 15s, hits `/health`; auto-rollback to `.env.deployed` on failure

Monitor a deploy:

```bash
# On GitHub → Actions tab → latest Deploy workflow run
# On VPS:
docker compose logs -f be
```

---

## Rollback (Manual)

```bash
cd /opt/banhcuon

# Option A: rollback to last successful deploy (written by CI/CD)
set -a && . .env.deployed && set +a
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build be fe caddy

# Option B: rollback to a specific commit SHA
export BE_IMAGE=ghcr.io/YOUR_ORG/YOUR_REPO/be:<previous-sha>
export FE_IMAGE=ghcr.io/YOUR_ORG/YOUR_REPO/fe:<previous-sha>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build be fe caddy
```

---

## Useful Commands (Production)

```bash
# View logs
docker compose logs -f be
docker compose logs -f caddy

# Restart a service
docker compose restart be

# Check disk usage (volumes)
docker system df -v

# Backup MySQL data
docker compose exec mysql sh -c \
  'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" banhcuon' > backup_$(date +%Y%m%d).sql

# Update .env and reload (non-image changes)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build
```

---

## SLA (Post-Launch)

| Severity | Response | Examples |
|---|---|---|
| P0 — Site down | 4 hours | All users blocked, BE crash |
| P1 — Feature broken | 24 hours | Payment fails, orders not reaching KDS |
| P2 — Degraded | 72 hours | Minor UI bug, slow page load |
