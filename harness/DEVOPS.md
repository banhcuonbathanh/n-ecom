# DEVOPS.md — DevOps Operations (F-13)

> How this system is packaged, shipped, rolled back, and kept alive.
> Adapted from `reference/docs/devops/` (4 files → this one), re-based onto our
> decided stack (PLAN.md §Stack) and the F-9 DevOps plan.
>
> **Truth boundaries (one fact, one home):**
> - Dev **commands, ports, env-var list** → [`ENVIRONMENT.md`](ENVIRONMENT.md) — never repeated here.
> - DevOps **strategy** (why two stages, target service list) → [`OVERALL_PLAN.md`](OVERALL_PLAN.md) §5.
> - This doc owns the **operational layer**: image patterns, pipeline, tagging,
>   rollback, runbooks, backups, deploy gates.
> - Visual companion: [`diagrams/devops.html`](diagrams/devops.html) — on any conflict this markdown wins.

---

## 1. DevOps surface — the files DevOps tasks own

A DevOps task's scope contract draws from this list and nothing else (BE/FE source
belongs to BE/FE tasks):

| File | Purpose | Lands in |
|---|---|---|
| `docker-compose.yml` | dev stack (5 services) | F-2 |
| `docker-compose.prod.yml` | prod overrides: GHCR images, restart policy, no source mounts | OPS |
| `be/Dockerfile.dev` · `fe/Dockerfile.dev` | hot-reload dev images | F-2 |
| `be/Dockerfile` · `fe/Dockerfile` | production images (§3) | F-4 (CI needs them) |
| `deploy/Caddyfile` | routing + auto-TLS (§4) | F-2 dev · OPS prod block |
| `.env.example` | key mirror of `.env` (rules in `ENVIRONMENT.md`) | F-2, grows per task |
| `.github/workflows/ci.yml` | test pipeline (§5) | F-4 |
| `.github/workflows/deploy.yml` | build → push → deploy → verify (§5) | OPS |
| `scripts/backup.sh` + VPS cron | nightly dump (§8) | OPS |

## 2. Compose stack & startup order

Dev = 5 services now (F-2); observability (prometheus · grafana · loki · promtail ·
swagger) joins in the OPS phase — the 10-service target is OVERALL_PLAN §5's fact.

Startup is a healthcheck chain, not a prayer:

```
mysql (healthcheck: mysqladmin ping)
  └─▶ redis (healthcheck: redis-cli ping)        [depends_on: service_healthy]
        └─▶ be   (waits for both healthy; prod: migrate → exec server)
              └─▶ fe (depends_on: be)
                    └─▶ caddy — the ONLY service with public ports
```

Rules:
- Every stateful service gets a named volume (`mysql_data`, `caddy_data`).
- `restart: unless-stopped` in prod overrides — the stack survives VPS reboots.
- In Stage B, MySQL/Redis publish **no host ports** (OVERALL_PLAN §5 gotcha → rule here).
- Redis is plain `redis:8` — disposable cache only (ARCHITECTURE.md §4); no
  redis-stack modules, no persistence requirements, safe to wipe any time.

## 3. Production image patterns

Versions are pinned by PLAN.md §Stack (Go 1.26 · MySQL 9.7 LTS · Redis 8 · Next 16);
exact pin lands in each Dockerfile when F-2/F-4 write them.

**`be/Dockerfile` — Go multi-stage, distroless runtime:**

```dockerfile
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/server /app/server
EXPOSE 8080
CMD ["/app/server"]
```

**`fe/Dockerfile` — Next 16 standalone, 3 stages (deps → build → run):**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL        # baked at build time — see Hard Rule D1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- `next.config.*` must set `output: "standalone"`.
- Migrations run on BE container start (entrypoint: wait-for-db → migrate up →
  `exec` server). Tool = goose (planned with sqlc in the F-11 BE playbook; F-3
  produces the working receipt and the exact commands land in `ENVIRONMENT.md`).

## 4. Caddy routing

One public entry, same shape in dev and prod (route facts from OVERALL_PLAN §5):

```caddy
{$CADDY_HOST} {
    reverse_proxy /api/*     be:8080
    reverse_proxy /uploads/* be:8080
    reverse_proxy /health    be:8080
    reverse_proxy /*         fe:3000
}
```

- Dev: `CADDY_HOST=:80` (no TLS). Stage A LAN: same. Stage B: `CADDY_HOST=<domain>`
  → Caddy auto-provisions Let's Encrypt TLS.
- DNS A record must point at the VPS **before** first prod start (ACME challenge).
- `ACME_EMAIL` must be a real, non-empty address (Hard Rule D2).

## 5. CI/CD pipeline & image tagging

Two workflows, grown in two steps:

**`ci.yml` (F-4):** on every push/PR → BE `go vet` + `go test ./...` **and** FE
`npm run lint` + `npm run build`. Both lanes from day 1 — the reference CI was
BE-only and FE breakage shipped silently (lessons register).

**`deploy.yml` (OPS):** on push to `main`, after CI passes:

```
test (reuse ci.yml) ─▶ build be+fe images ─▶ push GHCR ─▶ ssh deploy ─▶ verify
                        tags: sha-<short>         │        compose pull   curl /health
                        + latest                  │        up -d          ├─ ok → record tag in .env.deployed
                                                  ▼                      └─ fail → auto-rollback to previous tag
                        ghcr.io/banhcuonbathanh/n-ecom-be
                        ghcr.io/banhcuonbathanh/n-ecom-fe
```

Tagging rules:
1. Every prod image is tagged `sha-<short-sha>` (immutable) **and** `latest`.
2. The **previous two** deployed tags stay in GHCR — they are the rollback path.
3. The currently-deployed tag is recorded on the VPS (`.env.deployed`) by the
   pipeline; auto-rollback and manual rollback both read it.
4. Go-live releases additionally get a git tag `v<semver>` for traceability.

GitHub secrets (values never in the repo): `SERVER_IP`, `SSH_KEY`,
`NEXT_PUBLIC_API_BASE_URL` (FE build arg — full URL **through Caddy**, see D1).

## 6. Rollback

**Decision tree:**

```
incident
  ├─ deploy in the last 4h? ── no ─▶ not a deploy issue → investigate (§9 severity)
  └─ yes
      ├─ migration in that deploy? ── no ─▶ 6A code-only  (target < 5 min)
      └─ yes ──────────────────────────────▶ 6B with-migration (10–20 min)
```

**6A — code-only** (on the VPS):
1. `cd /opt/n-ecom` → read previous tag from `.env.deployed` history.
2. Pin compose to that tag (`IMAGE_TAG=sha-<prev>`), `docker compose pull be fe`.
3. `docker compose up -d be fe` → run the post-rollback checklist (below).

**6B — with-migration:**
> ⚠️ STOP first: were orders written after the deploy? If yes, tell the owner
> before touching the schema — data may need rescue first.
1. `goose status` → note current version.
2. `goose down` exactly one migration; `goose status` to confirm.
3. Continue with 6A for the code image.
4. Tail BE logs for FK/schema errors before declaring done.

**Post-rollback checklist** (all must pass before the incident closes):
`/health` 200 via Caddy · `docker compose ps` all running · no `panic|fatal` in BE
logs · MySQL ping + Redis ping OK · FE homepage renders · one end-to-end order
round-trip succeeds.

**Non-rollback restarts** (right image, stuck service): `docker compose restart <svc>`;
full `down` + `up -d` keeps volumes. `down -v` is destructive — Stage B: only with a
verified backup in hand; anywhere: ask-first rule in `ENVIRONMENT.md` applies.

## 7. Two-stage go-live runbook

Stage definitions and rationale: OVERALL_PLAN §5. Operational steps:

**Stage A — production-like on the owner's Mac (LAN):**
1. Mac LAN IP: `ipconfig getifaddr en0`; give the Mac a DHCP reservation in the router.
2. `.env`: real secrets + every public URL var pointing at `http://<mac-ip>`
   (through Caddy); `CADDY_HOST=:80`.
3. `docker compose up -d --build` → seed → smoke-test from a phone on shop Wi-Fi.
4. Not covered by Stage A: public TLS, GHCR/CI deploy path, payment webhooks
   (webhooks are P-phase anyway — v1 is COD).
5. macOS gotcha: if phones can't reach the Mac, check the macOS firewall allows
   Docker and that phone + Mac share the same SSID/VLAN.

**Stage B — VPS go-live:**
1. Owner buys: VPS 2 vCPU / 2 GB / Ubuntu LTS, **Singapore region** (~$10–12/mo) +
   domain (~$10/yr). A records `@`/`www` → VPS IP before first start.
2. Generate **fresh** secrets on the VPS — never reuse Stage A values.
3. Set the GitHub secrets (§5) → merge to `main` → pipeline deploys.
4. Seed once; verify `/health` and one real order over HTTPS.
5. **Prove rollback before announcing go-live:** deploy a deliberately broken
   commit, watch auto-rollback restore the previous tag, revert the commit.
6. Install the backup cron (§8) and confirm the first dump exists.

## 8. Backups & monitoring ops

- **Nightly MySQL dump** (VPS cron 03:00): `mysqldump | gzip` into
  `/opt/n-ecom/backups/`, **14-day retention**; restore drill once before go-live
  (a backup that was never restored is a hope, not a backup).
- Redis is never backed up — disposable by policy (ARCHITECTURE.md §4).
- Uploaded images (`/uploads`): included in the nightly cron via `tar` of the
  uploads volume, same retention.
- Monitoring (OPS phase): Prometheus alert rules **route to a real channel via
  Alertmanager** — an unread alert equals no alert (lessons register). Grafana and
  Prometheus ports stay firewalled; access via SSH tunnel only.

## 9. Severity & incident protocol

Sized for a one-owner shop — no on-call rota, the agent + owner are the whole team:

| Sev | Definition | Acknowledge | Resolve target |
|---|---|---|---|
| **P0** | Orders cannot be placed (BE crash-loop, DB down, checkout 5xx) | ASAP | 4 h |
| **P1** | Major feature degraded (search dead, images broken, admin locked out) | same day | 24 h |
| **P2** | Cosmetic / non-critical bug | logged | 72 h |

P0 protocol: rollback first (§6), diagnose after. Message the owner within 15 min:
what broke, impact, rollback ETA, next update time. Post-incident: one-paragraph
root cause + the rule/gate that prevents recurrence goes into `STATE.md`.

## 10. Pre-deploy checklist & hard rules

**Before every prod deploy** (CI enforces what it can; the agent checks the rest):

- [ ] CI green — BE tests **and** FE build.
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml config` parses.
- [ ] New migrations ran up **and down** cleanly on a scratch DB.
- [ ] New env vars are in `.env.example` + `ENVIRONMENT.md` table + set on the VPS.
- [ ] Previous image tag still in GHCR (rollback path alive).
- [ ] `/health` verified on the freshly built image before traffic hits it.

**Hard rules (D-rules — cite by ID in reviews):**

| ID | Rule | Origin |
|---|---|---|
| D1 | `NEXT_PUBLIC_API_BASE_URL` is **baked into the FE image at build time** and must point **through Caddy** (`http(s)://<host>/api/...`), never `:8080` direct. Changing it = rebuild `fe`, not restart. | reference gotcha ×2 |
| D2 | `ACME_EMAIL` is never empty — an empty value crash-loops Caddy on a Caddyfile parse error. | reference gotcha |
| D3 | MySQL credentials freeze into `mysql_data` at first init; changing them later means wiping the volume (backup → wipe → re-migrate → re-seed). | reference gotcha |
| D4 | Never `down -v` / delete `mysql_data` in Stage B without a same-day verified backup. | reference rule |
| D5 | DB and Redis ports are never published on the VPS; only Caddy 80/443 face the internet. | OVERALL_PLAN §5 |
| D6 | Every env var lives in exactly one canonical list (`ENVIRONMENT.md`); `.env` never enters git; images and logs never contain secrets. | ENVIRONMENT.md §Secrets |
| D7 | No deploy without a tested rollback path: previous tag in GHCR + `.env.deployed` current. | ROLLBACK_PLAN adapted |
| D8 | Prod deploys go through the pipeline — no hand-built images on the VPS (the one exception: executing a §6 rollback). | new |
