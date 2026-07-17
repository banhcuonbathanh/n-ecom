<!--
  ════════════════════════════════════════════════════════════════════════
  REFERENCE / GOLD-STANDARD EXAMPLE — not a live config.
  Models a scoped DEVOPS / INFRA CLAUDE.md. Same 6 principles; WHY notes show
  what is infra-specific. DevOps has no "skill", so the file leans more on the
  runbook + the artifact files themselves as source of truth.
  ════════════════════════════════════════════════════════════════════════
-->

# CLAUDE.devops.md  (or: infra/CLAUDE.md)

> Tầng 1 — Infra map only. **Does NOT contain:** secret values, full Caddy/compose configs, env values.
> Scope: Docker Compose, Caddy, CI/CD, migrations-in-deploy. Parent map → [../CLAUDE.md](../CLAUDE.md).

<!-- WHY (devops gate) — No skill exists for infra, so the gate is the runbook +
     the convention that the artifact files (compose/Caddyfile/.env.example) are
     themselves the source of truth — the CLAUDE.md must not copy them. -->
> **MANDATORY before any change:** read [docs/GOLIVE_RUNBOOK.md](../docs/GOLIVE_RUNBOOK.md)
> and the file you are about to edit. The artifact files ARE the source of truth — this map only routes.

---

## Read before changing infra

| Need | File |
|---|---|
| Service topology, ports, volumes | `docker-compose.yml` |
| Reverse proxy / TLS / routing | `Caddyfile` |
| Required env vars (names only, never values) | `.env.example` |
| Migration step in deploy | [scripts/migrate.sh](../scripts/migrate.sh) + `db-migration` skill |
| Go-live / rollback / monitoring procedure | [docs/GOLIVE_RUNBOOK.md](../docs/GOLIVE_RUNBOOK.md) |
| Realtime infra (SSE/WS proxy, timeouts) | [MASTER_v1.2.md](../docs/core/MASTER_v1.2.md) §5 |

## Critical pointers (the traps)

<!-- WHY — Infra traps are about safety + reversibility, the highest-stakes area.
     Front-load the irreversible-action guards. -->
- **Never commit secret values.** `.env.example` holds key *names* only; real values live outside git.
- `docker compose down -v` deletes volumes (DB + Redis data). Confirm with the owner before running it.
- Proxy must allow long-lived connections for SSE/WS (no aggressive idle timeout) → MASTER §5.
- Rebuild a single service after code change: `docker compose up -d --build be|fe` — don't rebuild the whole stack blindly.
- Migrations run via `migrate.sh` / goose, never by editing the DB by hand.

## Commands

```bash
docker compose up -d                 # full stack
docker compose up -d --build be|fe   # rebuild one service
docker compose logs -f be            # tail logs
docker compose down                  # stop (keeps volumes)
docker compose down -v               # ⚠️ stop + DELETE data — confirm first
```

## Root context

Parent map → [../CLAUDE.md](../CLAUDE.md) · realtime config → MASTER §5 · procedures → GOLIVE_RUNBOOK.

<!--
  WHAT'S DIFFERENT ABOUT A DEVOPS CLAUDE.md (vs. fe/be examples):
  • No skill backs it, so the "how-to" source is the RUNBOOK plus the artifact
    files themselves. The principle is unchanged — the map must not copy the
    compose/Caddy/env contents, only point at them.
  • Its traps are about REVERSIBILITY and SECRETS, not field names or styling —
    the destructive `down -v` and "never commit secrets" lead, because the cost
    of getting them wrong is data loss or a leak, not a bug.
  • The command list deliberately flags the dangerous command inline (⚠️), since
    in infra the difference between two commands can be "deletes the database."
-->
