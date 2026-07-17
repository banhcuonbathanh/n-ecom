# DevOps Index — Deploy, Monitoring, Go-Live

> **TL;DR:** This folder is the handbook view of how the system is **run** (not built):
> the two-stage go-live path (Mac LAN test server → VPS), the monitoring stack
> (Prometheus + Grafana + Loki, already in `docker-compose.yml`), and the plan for
> operating the owner's Mac as a real-operation test server.
> Step-by-step runbooks live outside the handbook and stay canonical — this folder
> summarizes and links, never copies steps.

---

## Files in This Folder

| File | What it answers | Read when |
|---|---|---|
| [GO_LIVE.md](GO_LIVE.md) | How the system reaches production: Stage A (Mac) → Stage B (VPS), CI/CD pipeline, rollback, SLA | Before any deploy work |
| [MONITORING.md](MONITORING.md) | What is observed and how: services, ports, dashboards, alert rules, log pipeline | Diagnosing an incident · changing alerting |
| [MAC_TEST_SERVER_PLAN.md](MAC_TEST_SERVER_PLAN.md) | Plan to run the owner's Mac as a production-like test server for real operation experience | Setting up / operating the Mac server |

---

## Canonical Sources (deep dives — steps live there, not here)

| Doc | Role |
|---|---|
| [`docs/devops/DEPLOY_RUNBOOK.md`](../../devops/DEPLOY_RUNBOOK.md) | **Stage A (Mac LAN) setup + gotchas** · Stage B deltas. Most recent, battle-tested 2026-06-11 |
| [`docs/GOLIVE_RUNBOOK.md`](../../GOLIVE_RUNBOOK.md) | Stage B (VPS) first deploy, top-to-bottom: VPS setup → DNS → secrets → boot → seed → SSL → smoke test |
| [`docs/devops/ROLLBACK_PLAN.md`](../../devops/ROLLBACK_PLAN.md) | SLA tiers, image tagging, rollback decision tree (code-only vs. with-migration) |
| [`docs/devops/DEVOPS_SYSTEM_GUIDE.md`](../../devops/DEVOPS_SYSTEM_GUIDE.md) | Compose/Dockerfile/Caddy/CI patterns + DevOps ownership rules |
| [`docs/devops/DOCKER_GUIDE.md`](../../devops/DOCKER_GUIDE.md) | Docker specifics |
| [`monitoring/`](../../../monitoring/) (repo root) | Live configs: `prometheus.yml` · `alert-rules.yml` · `loki-config.yml` · `promtail-config.yml` · Grafana provisioning + dashboard |

> **Conflict rule (same as the rest of the handbook):** if a summary here disagrees with
> a runbook or a config file in `monitoring/` / `docker-compose.yml` → **the runbook/config wins**;
> fix the summary and log the drift in [07_business_logic/LOGIC_INDEX.md](../07_business_logic/LOGIC_INDEX.md).

---

## The Full Stack at a Glance (from `docker-compose.yml`)

| Service | Port (host) | Purpose |
|---|---|---|
| `mysql` | 3306 | Data (volume `mysql_data` — never delete without backup) |
| `redis` | 6379 | Cache + realtime pub/sub (Redis Stack) |
| `be` | 8080 | Go API — entrypoint runs goose migrations, then server |
| `fe` | 3000 | Next.js standalone |
| `caddy` | 80/443 | Single entry point: `/api/*`, `/webhooks/*`, `/health`, `/uploads/*` → be · `/*` → fe |
| `swagger` | 8090 | OpenAPI UI |
| `prometheus` | 9090 | Metrics scrape + alert rules |
| `grafana` | 3001 | Dashboards (provisioned) |
| `loki` | 3100 | Log store |
| `promtail` | — | Ships container logs → Loki |

---

## Deep Dive Sources

- `docker-compose.yml` + `docker-compose.prod.yml` (repo root)
- `docs/claude/CLAUDE_DEVOPS.md` — DevOps role charter
- [07_business_logic/LOGIC_DEVOPS.md](../07_business_logic/LOGIC_DEVOPS.md) — DevOps-layer invariants
