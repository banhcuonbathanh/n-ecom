# Rollback Plan — Hệ Thống Quản Lý Quán Bánh Cuốn

> **Version:** v1.0 · 2026-05-31
> **Owner:** DevOps
> **Dependency:** Requires image tags pushed during go-live (P7-10)
> **Related:** `DEVOPS_SYSTEM_GUIDE.md` · `DOCKER_GUIDE.md`

---

## 1 — Post-Launch SLA

| Severity | Definition | Response Time | Resolution Time |
|---|---|---|---|
| **P0** | System down — orders cannot be placed or paid | 15 min acknowledge | **4 hours** |
| **P1** | Major feature broken — KDS, POS, or payment degraded | 30 min acknowledge | **24 hours** |
| **P2** | Minor feature broken — non-critical UI bug, cosmetic | Best effort | **72 hours** |

**P0 trigger examples:** BE container crash loop · DB unreachable · payment webhook 500 · all order creation fails  
**P1 trigger examples:** KDS not updating · POS cannot print · SSE disconnects on all clients  
**P2 trigger examples:** Wrong table label displayed · Topping price rounding off by 1đ · UI misalignment

---

## 2 — Image Tagging Convention

Tag every production build before deploy. This is the pre-condition for fast rollback.

```bash
# On CI (GitHub Actions) — tag format: v{semver} or sha-{short-sha}
docker tag banhcuon-be:latest banhcuon-be:v1.2.3
docker tag banhcuon-fe:latest banhcuon-fe:v1.2.3

# Push both tags to registry
docker push ghcr.io/pythongdev/banhcuon-be:v1.2.3
docker push ghcr.io/pythongdev/banhcuon-fe:v1.2.3
docker push ghcr.io/pythongdev/banhcuon-be:latest
docker push ghcr.io/pythongdev/banhcuon-fe:latest
```

Keep the **previous two** production tags available in the registry at all times.

---

## 3 — Rollback Decision Tree

```
Incident detected
       │
       ▼
Was a deployment in the last 4 hours?
       │ YES                        │ NO
       ▼                            ▼
Run rollback procedure         Investigate root cause
(Section 4)                    (not a deployment issue)
       │
       ▼
Does the incident involve a DB migration?
       │ YES                        │ NO
       ▼                            ▼
Section 4B (with goose down)   Section 4A (code only)
```

---

## 4A — Code-Only Rollback (no migration involved)

Use this when the new code introduced a bug but no new migration was run.

```bash
# 1. SSH into the VPS
ssh ubuntu@<VPS_IP>
cd /opt/banhcuon

# 2. Identify the previous tag
docker images | grep banhcuon-be   # find the previous tag e.g. v1.2.2

# 3. Update docker-compose.yml to pin the previous tag
#    Change:  image: ghcr.io/pythongdev/banhcuon-be:latest
#    To:      image: ghcr.io/pythongdev/banhcuon-be:v1.2.2
#    Same for banhcuon-fe

# 4. Pull the previous image
docker pull ghcr.io/pythongdev/banhcuon-be:v1.2.2
docker pull ghcr.io/pythongdev/banhcuon-fe:v1.2.2

# 5. Restart only the affected service(s)
docker compose up -d be fe

# 6. Verify health
curl -f http://localhost:8080/health   # → {"status":"ok"}
docker compose ps                       # all services running
docker compose logs --tail=50 be

# 7. Smoke test (< 2 minutes)
# - Open http://localhost:3000 in browser
# - Scan a QR code and add 1 item to verify order creation works
# - Check KDS receives the order
```

**Expected recovery time: < 5 minutes.**

---

## 4B — Rollback with DB Migration

Use this when a migration was run alongside the bad deployment.

> ⚠️ **STOP** — Before running `goose down`, check if orders were placed after the migration.
> If yes: notify the owner before proceeding — data may need manual rescue first.

```bash
# 1. SSH into the VPS
ssh ubuntu@<VPS_IP>
cd /opt/banhcuon

# 2. Check current migration version
docker compose exec be goose -dir /migrations mysql "${DB_DSN}" status

# 3. Roll back exactly one migration
docker compose exec be goose -dir /migrations mysql "${DB_DSN}" down

# 4. Verify the DB is at the expected version
docker compose exec be goose -dir /migrations mysql "${DB_DSN}" status

# 5. Follow steps 3–7 from Section 4A to roll back the code image

# 6. Verify no FK or schema errors in logs
docker compose logs --tail=100 be | grep -i "error\|panic\|fatal"
```

**Expected recovery time: 10–20 minutes (longer due to DB verification step).**

---

## 5 — Full Stack Restart (non-rollback, for stuck services)

Use this when a service is unhealthy but the current image version is correct.

```bash
# Restart a single service
docker compose restart be
docker compose restart fe

# Full restart (preserves data volumes)
docker compose down && docker compose up -d

# Nuclear option: wipe everything (only if DB data is disposable / seeded)
docker compose down -v && docker compose up -d
```

---

## 6 — Post-Rollback Verification Checklist

Run this after every rollback before declaring the incident resolved.

| Check | Command / Action | Expected |
|---|---|---|
| BE health | `curl -f http://localhost:8080/health` | `{"status":"ok"}` |
| All containers up | `docker compose ps` | All `running` |
| No error logs | `docker compose logs --tail=50 be` | No `panic`/`fatal` |
| DB reachable | `docker compose exec mysql mysqladmin ping -u banhcuon -pbanhcuonpass` | `mysqld is alive` |
| Redis reachable | `docker compose exec redis redis-cli ping` | `PONG` |
| FE loads | Open `https://<domain>` in browser | Menu page loads |
| Order creation | QR scan → add item → checkout | Order confirmed, SSE fires |
| KDS display | New order appears in KDS | ✅ |

---

## 7 — Incident Communication Template

Send this to stakeholders within **15 minutes** of a P0:

```
[P0 INCIDENT — Bánh Cuốn System]
Time detected: HH:MM (GMT+7)
Impact: <describe what is broken>
Status: Rollback in progress / Under investigation
ETA: <best estimate>
Next update in: 30 minutes
```

Resolution message:

```
[RESOLVED — Bánh Cuốn System]
Time resolved: HH:MM (GMT+7)
Root cause: <one sentence>
Action taken: Rolled back to v{previous-tag}
Post-mortem: Scheduled for <date>
```

---

## 8 — Escalation Contacts

| Role | Contact | When |
|---|---|---|
| DevOps on-call | (owner TBD) | P0 · P1 at any hour |
| BE lead | (owner TBD) | DB rollback decisions |
| Owner / Product | (owner TBD) | P0 customer-facing issues |

---

## 9 — Pre-Deploy Checklist (prevent needing rollback)

Run this before every production deployment:

- [ ] Image tag created and pushed (`v{semver}`)
- [ ] Previous tag still in registry (don't overwrite)
- [ ] `docker compose config` shows no YAML errors
- [ ] Migrations tested on staging DB first
- [ ] Health check endpoint responds on staging build
- [ ] `git tag v{semver}` pushed to GitHub (traceability)
