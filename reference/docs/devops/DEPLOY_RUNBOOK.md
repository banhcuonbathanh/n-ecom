# Deploy Runbook — Mac Test Server (LAN) → VPS Go-Live

> **Task:** Phase DEPLOY (D-1…D-8) · **Owner:** DevOps · **Created:** 2026-06-11
>
> Stage A = production-like test server on the owner's Mac, clients on shop Wi-Fi.
> Stage B = real VPS + domain + HTTPS. **Stage B step-by-step lives in
> [`docs/GOLIVE_RUNBOOK.md`](../GOLIVE_RUNBOOK.md)** — this doc adds only what that one doesn't cover.

---

## How requests flow (both stages)

```
client phone ──HTTP(S)──▶ Caddy (:80/:443)
                            ├── /api/*      → be:8080
                            ├── /webhooks/* → be:8080
                            ├── /health     → be:8080
                            ├── /uploads/*  → be:8080   (product images)
                            └── /*          → fe:3000
be container start: entrypoint.sh → goose up (all migrations) → server
```

Key invariants (violating these broke things before — see Gotchas):
- `NEXT_PUBLIC_API_URL` **must end with `/api/v1`** and is **baked into the FE image at build time** → changing it requires `docker compose up -d --build fe`.
- Caddy gets `CADDY_HOST` + `ACME_EMAIL` via compose `environment:` — `ACME_EMAIL` must never be an **empty string** (Caddyfile parse error → crash loop).
- MySQL credentials are **frozen into `mysql_data` at first init**. Changing `MYSQL_PASSWORD` later requires wiping that volume (then re-seed).

---

## Stage A — Mac LAN test server

### A1. One-time setup (already done 2026-06-11)

1. Get the Mac's LAN IP: `ipconfig getifaddr en0` (was `192.168.102.9` — re-check after router restarts; give the Mac a DHCP reservation in the router if possible).
2. `.env` at repo root (gitignored; dev backup in `.env.bak.dev`): real `JWT_SECRET` / MySQL passwords, and **all 4 URL vars pointing at the Mac IP**:
   - `NEXT_PUBLIC_API_URL=http://<mac-ip>/api/v1`
   - `CORS_ORIGINS=http://<mac-ip>` · `STORAGE_BASE_URL=http://<mac-ip>/uploads` · `WEBHOOK_BASE_URL=http://<mac-ip>`
   - `CADDY_HOST=:80` · `ACME_EMAIL=<real email>`
3. Bring up everything: `docker compose up -d --build`
4. Seed (fresh DB only):
   ```bash
   docker compose exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" banhcuon < scripts/seed.sql
   docker compose exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" banhcuon < scripts/seed_real_menu.sql
   ```
5. Verify: `BASE_URL=http://<mac-ip> ./scripts/smoke_test.sh` → expect **8 passed, 0 failed**.
6. QR URLs for printing/testing (format `http://<mac-ip>/table/<qr_token>`):
   ```bash
   docker compose exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N \
     -e "SELECT CONCAT(name,'  http://<mac-ip>/table/',qr_token) FROM tables WHERE is_active=1" banhcuon
   ```
   (or `FE_HOST=http://<mac-ip> DB_DSN=<host DSN> go run ./be/cmd/qr/main.go`)

### A2. Daily operation

```bash
docker compose up -d            # start (state survives reboots — restart: unless-stopped)
docker compose logs -f be       # watch backend
docker compose down             # stop (keeps data)
```

Phones on the same Wi-Fi: scan a table QR or open `http://<mac-ip>` directly.
Staff screens (KDS/POS/Admin): `http://<mac-ip>/login` — seed accounts in `GOLIVE_RUNBOOK.md` §7.

### A3. Gotchas (each one cost time on 2026-06-11)

| Symptom | Cause | Fix |
|---|---|---|
| caddy crash-loops: `parsing caddyfile tokens for 'email'` | `ACME_EMAIL` empty/unset in caddy container | compose passes it with a non-empty fallback; keep a real value in `.env` |
| loki crash-loops: `permission denied` on `/tmp/loki/...` | volume root-owned; loki runs as uid 10001 | `docker run --rm -v clauderestaurant_loki_data:/tmp/loki alpine chown -R 10001:10001 /tmp/loki`; WAL dir pinned in `monitoring/loki-config.yml` |
| mysql healthy but BE can't connect after password change | old password frozen in `mysql_data` | `docker compose down && docker volume rm clauderestaurant_mysql_data && docker compose up -d` → entrypoint re-migrates → re-seed |
| FE calls `localhost:8080` from a phone | `NEXT_PUBLIC_API_URL` stale (baked at build) | fix `.env`, then `docker compose up -d --build fe` |
| Phone can't reach `http://<mac-ip>` | macOS firewall blocking Docker on :80, or phone on guest Wi-Fi VLAN | System Settings → Network → Firewall: allow Docker/com.docker.backend; same SSID for phone + Mac |
| login API returns 429 in tests | login rate limiter (works as intended) | wait ~1 min between repeated login attempts |

### A4. What Stage A does NOT cover

- **Payment webhooks** (VNPay/MoMo/ZaloPay) — gateways need a public HTTPS URL → deferred to **P7-7**, trivial once Stage B is live (`WEBHOOK_BASE_URL=https://<domain>`).
- HTTPS/TLS, GHCR images, CI/CD deploy path — exercised only in Stage B.

---

## Stage B — VPS go-live (D-6 → D-8)

**Follow [`docs/GOLIVE_RUNBOOK.md`](../GOLIVE_RUNBOOK.md) top-to-bottom.** Additions/decisions not in that doc:

### B1. Provider recommendation (D-6 — owner buys)

| Item | Recommendation | Why |
|---|---|---|
| VPS | Vultr or DigitalOcean, **Singapore** region, Ubuntu 24.04, **2 vCPU / 2 GB / 50 GB** (~$10–12/mo) | lowest latency to VN; 1 GB is too tight for MySQL+Redis+monitoring |
| Domain | Cloudflare Registrar or Namecheap (~$10/yr) | cheap, easy DNS; A record `@` and `www` → VPS IP **before** first `docker compose up` (Let's Encrypt needs it) |

### B2. Production `.env` deltas (vs Stage A)

Generate **new** secrets on the VPS — never reuse the Mac ones. Then per `GOLIVE_RUNBOOK.md` §4, with two corrections learned in Stage A:

- `NEXT_PUBLIC_API_URL=https://<domain>/api/v1` ← **with `/api/v1`** (GOLIVE doc says bare domain — wrong; also set the GitHub secret `NEXT_PUBLIC_API_URL` to this exact value, it's the FE build arg)
- `ACME_EMAIL` must be non-empty (see Gotchas)

### B3. First deploy & proving rollback (D-7)

1. Owner sets the 5 GitHub secrets (`GOLIVE_RUNBOOK.md` §3) and pushes/merges to `main` → pipeline tests → builds GHCR images → SSH deploy → health check.
2. Migrations now run automatically via `be/entrypoint.sh` (D-1) — verify: `docker compose logs be | grep entrypoint`.
3. Seed once (§7), regenerate QR codes with `FE_HOST=https://<domain>`, print.
4. **Prove rollback once before go-live:** deploy a deliberately broken commit (e.g. make `/health` return 500) on a branch merged to `main`, watch the pipeline restore `.env.deployed` images, then revert the commit.

### B4. Ongoing ops (D-8)

- **Nightly backup** (cron on VPS, 03:00):
  ```cron
  0 3 * * * cd /opt/banhcuon && docker compose exec -T mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" banhcuon' | gzip > /opt/banhcuon/backups/banhcuon_$(date +\%F).sql.gz && find /opt/banhcuon/backups -name '*.sql.gz' -mtime +14 -delete
  ```
- **Monitoring access:** Grafana (:3001) / Prometheus (:9090) are firewalled — reach via SSH tunnel: `ssh -L 3001:localhost:3001 <user>@<vps>` → `http://localhost:3001`.
- Incidents & SLA → `docs/devops/ROLLBACK_PLAN.md`.
