# Monitoring — Metrics, Logs, Alerts

> **TL;DR:** Monitoring ships inside the same `docker-compose.yml` as the app — nothing to
> install separately. Prometheus (:9090) scrapes the BE's `/metrics` every 15 s and evaluates
> 2 alert rules; Promtail tails all container logs into Loki (:3100); Grafana (:3001) is
> auto-provisioned with both datasources and one dashboard ("BanhCuon — API Monitoring").
> Configs live in [`monitoring/`](../../../monitoring/) at repo root — **edit there, never here**.

---

## Architecture

```
be (:8080) ──/metrics──▶ prometheus (:9090) ──rules──▶ alerts (HighErrorRate, SlowResponseTime)
                              │
all containers ──logs──▶ promtail ──▶ loki (:3100)
                              │             │
                              └──────┬──────┘
                                     ▼
                             grafana (:3001)
                     dashboard: "BanhCuon — API Monitoring"
```

| Component | Port | Config file | Notes |
|---|---|---|---|
| Prometheus | 9090 | `monitoring/prometheus.yml` | Scrapes `be:8080/metrics` + itself, every 15 s |
| Alert rules | — | `monitoring/alert-rules.yml` | Loaded by Prometheus, evaluated every 30 s |
| Loki | 3100 | `monitoring/loki-config.yml` | Log store; WAL dir pinned (see gotcha below) |
| Promtail | — | `monitoring/promtail-config.yml` | Ships Docker container logs → Loki |
| Grafana | **3001** | `monitoring/grafana/provisioning/` | Datasources (Prometheus default + Loki) and dashboard provisioned read-only |

---

## Alert Rules (the only two — keep it this way until real traffic says otherwise)

| Alert | Fires when | For | Severity |
|---|---|---|---|
| `HighErrorRate` | 5xx > **5%** of requests over 5 min (excludes `/metrics`, `/health`) | 1 min | critical |
| `SlowResponseTime` | API **p95 latency > 500 ms** over 5 min | 2 min | warning |

Both are defined in `monitoring/alert-rules.yml` against the BE's `http_requests_total` /
`http_request_duration_seconds` metrics. No Alertmanager is wired yet — alerts are visible
in Prometheus UI and on the Grafana dashboard's "Active Alerts" panel.

---

## Dashboard Panels ("BanhCuon — API Monitoring")

1. **Request Rate (req/s)** · 2. **5xx Error Rate (%)** · 3. **p95 Response Time (ms)** ·
4. **Active Alerts** · 5. **Container Logs** (Loki)

Access: `http://<host>:3001` locally / on the Mac test server. On the VPS (Stage B) the
monitoring ports are firewalled — use an SSH tunnel: `ssh -L 3001:localhost:3001 <user>@<vps>`.

---

## Incident Triage (where to look, in order)

1. **Grafana :3001** — is error rate or p95 spiking? Which window?
2. **Container Logs panel** (or `docker compose logs -f be`) — find the failing request / panic.
3. **Prometheus :9090 → Alerts** — what fired, since when.
4. Map severity → response via the SLA table in [`docs/devops/ROLLBACK_PLAN.md`](../../devops/ROLLBACK_PLAN.md) §1; deployment in last 4 h → rollback decision tree.

---

## Known Gotcha

- **Loki crash-loops with `permission denied` on `/tmp/loki/...`** — the volume is
  root-owned but Loki runs as uid 10001. Fix:
  `docker run --rm -v clauderestaurant_loki_data:/tmp/loki alpine chown -R 10001:10001 /tmp/loki`
  (WAL dir is pinned in `loki-config.yml`). Source: DEPLOY_RUNBOOK §A3.

---

## Deep Dive Sources

- [`monitoring/`](../../../monitoring/) — all live configs (single source of truth)
- `docker-compose.yml` — service definitions + ports
- [`docs/devops/DEPLOY_RUNBOOK.md`](../../devops/DEPLOY_RUNBOOK.md) §A3, §B4 — gotchas + VPS access
- [`docs/devops/ROLLBACK_PLAN.md`](../../devops/ROLLBACK_PLAN.md) — SLA + what each severity means
