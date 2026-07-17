# Go-Live System — Two Stages, One Pipeline

> **TL;DR:** Go-live happens in two stages. **Stage A** (✅ live since 2026-06-11) runs the
> full production compose stack on the owner's Mac, serving phones over shop Wi-Fi —
> everything real except HTTPS and payment webhooks. **Stage B** moves the same stack to a
> VPS with a domain; after the first manual deploy, every push to `main` deploys
> automatically (test → build GHCR images → SSH deploy → health check → auto-rollback).
> Steps live in the runbooks — this file is the map.

---

## Stage Model

```
Stage A — Mac LAN test server (✅ running)          Stage B — VPS production (⬜ pending D-6→D-8)
─────────────────────────────────────────          ─────────────────────────────────────────────
docker compose up on owner's Mac                    same compose + docker-compose.prod.yml
clients: phones on shop Wi-Fi → http://<mac-ip>     clients: anywhere → https://<domain>
QR: http://<mac-ip>/table/<qr_token>                QR re-generated with FE_HOST=https://<domain>
no TLS · no payment webhooks (no public URL)        Caddy auto-TLS · webhooks live (unblocks P7-7)
deploy: git pull + compose --build (manual)         deploy: push to main → CI/CD (automatic)
```

- **Stage A details + gotchas:** [`docs/devops/DEPLOY_RUNBOOK.md`](../../devops/DEPLOY_RUNBOOK.md) §Stage A — and [MAC_TEST_SERVER_PLAN.md](MAC_TEST_SERVER_PLAN.md) for ongoing operation.
- **Stage B step-by-step:** [`docs/GOLIVE_RUNBOOK.md`](../../GOLIVE_RUNBOOK.md) (10 steps, run top-to-bottom once), with corrections in DEPLOY_RUNBOOK §Stage B (notably: `NEXT_PUBLIC_API_URL` **must end `/api/v1`**).

---

## CI/CD Pipeline (Stage B, after first deploy)

Push to `main` →

1. **Test** — `go test ./be/...`
2. **Build & push** — BE + FE images tagged by commit SHA → GHCR (`ghcr.io/pythongdev/...`)
3. **Deploy** — SSH to VPS, pull images, `docker compose up --no-build`
4. **Health check** — wait 15 s, hit `/health`; on failure **auto-rollback** to the images recorded in `.env.deployed`

Required GitHub secrets (5): `DEPLOY_HOST` · `DEPLOY_USER` · `DEPLOY_KEY` · `DEPLOY_PATH` · `NEXT_PUBLIC_API_URL` (the FE build arg — must end `/api/v1`).

---

## Rollback

Canonical: [`docs/devops/ROLLBACK_PLAN.md`](../../devops/ROLLBACK_PLAN.md). Essentials:

- **Decision tree:** deployment in last 4 h? → rollback; involves a DB migration? → variant with `goose down`, else code-only image swap.
- **Code-only rollback:** re-point `BE_IMAGE`/`FE_IMAGE` at the previous SHA (or `source .env.deployed`) → `docker compose up -d --no-build be fe caddy`.
- **Precondition:** previous two production image tags always kept in GHCR.
- **Drill:** prove rollback once before real go-live by deploying a deliberately broken `/health` (DEPLOY_RUNBOOK §B3).

---

## Ongoing Ops & SLA

| Concern | Mechanism |
|---|---|
| Backups | Nightly 03:00 cron `mysqldump | gzip`, keep 14 days (DEPLOY_RUNBOOK §B4) |
| Monitoring access | Grafana :3001 / Prometheus :9090 firewalled on VPS — reach via SSH tunnel |
| Incident response | P0 site-down: 4 h · P1 feature broken: 24 h · P2 degraded: 72 h (ROLLBACK_PLAN §1) |
| Migrations | Run automatically at BE container start (`be/entrypoint.sh`: goose up → server) |
| Seed | Once per fresh DB: `scripts/seed.sql` + `scripts/seed_real_menu.sql`; default accounts in GOLIVE_RUNBOOK §7 |
| Smoke test | `BASE_URL=<url> ./scripts/smoke_test.sh` → expect 8 passed, 0 failed |

---

## Invariants That Have Already Bitten Us

(Full table: DEPLOY_RUNBOOK §A3 — these caused real downtime on 2026-06-11.)

1. `NEXT_PUBLIC_API_URL` ends with `/api/v1` and is **baked into the FE image at build time** → any change needs `docker compose up -d --build fe`.
2. `ACME_EMAIL` must never be an empty string (Caddy parse error → crash loop).
3. MySQL credentials freeze into `mysql_data` at first init — changing passwords later means wiping the volume + re-seed.
4. All client traffic goes through Caddy only; DB/Redis/BE/FE ports are never exposed publicly in Stage B.

---

## Deep Dive Sources

- [`docs/devops/DEPLOY_RUNBOOK.md`](../../devops/DEPLOY_RUNBOOK.md) — Stage A + Stage B deltas (most recent)
- [`docs/GOLIVE_RUNBOOK.md`](../../GOLIVE_RUNBOOK.md) — Stage B 10-step first deploy
- [`docs/devops/ROLLBACK_PLAN.md`](../../devops/ROLLBACK_PLAN.md) — SLA + rollback procedures
- `.github/workflows/` — the actual pipeline definition
