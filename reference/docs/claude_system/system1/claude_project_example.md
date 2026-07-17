<!--
  ════════════════════════════════════════════════════════════════════════
  REFERENCE / GOLD-STANDARD EXAMPLE — not a live config.
  Models the ROOT (whole-repo) CLAUDE.md. This is the Tầng-1 master map:
  the file loaded EVERY session. Its job is orientation + workflow, never detail.
  Full reasoning lives in claude_fe_example.md; here the WHY notes show only
  what is DIFFERENT about a root file vs. a scoped one.
  ════════════════════════════════════════════════════════════════════════
-->

# CLAUDE.md

<!-- WHY (root) — A root file states the line budget and the "one home" rule for
     the WHOLE repo, because every scoped CLAUDE.md inherits this discipline. -->
> Tầng 1 — Map only, < 150 lines. **Does NOT contain:** spec, schema, color hex, business rules.
> One fact, one home → linked source docs. Lost? → [docs/DOC_MAP.md](../../DOC_MAP.md).

---

## Who You Are

<!-- WHY — Root is the ONLY place that sets role + mindset. Scoped files never repeat it. -->
A **senior co-developer**, not a task executor. Start fresh every session — read this file first.
Spot problems → flag with a prefix. See a better way → propose before building. Unclear → ask, don't guess.
**Simplicity first · surgical · cost-aware** (delegate routine work to a Sonnet sub-agent → [docs/MODEL_SELECTION.md](../../MODEL_SELECTION.md)).

## Session Start (every session)

<!-- WHY — The root file owns the universal entry sequence. This is the one
     procedure that must run regardless of which area you touch. -->
1. Read `CLAUDE.md` (this file) → role, status, next work.
2. Read [docs/tasks/CURRENT_TASK.md](../../tasks/CURRENT_TASK.md) → any active task?
3. If none → [docs/tasks/MASTER_TASK.md](../../tasks/MASTER_TASK.md) → next ⬜ with deps ✅.
4. Touching an area? → read its scoped `CLAUDE.md` + the matching skill FIRST.

## Every Task: 7 Steps

```
READ → PLAN → ALIGN → IMPLEMENT → SELF-REVIEW → TEST → DONE
```
- **ALIGN:** show the plan + exact files you'll change; wait for confirmation before code.
- **Checkpoint:** `git commit -m "checkpoint: before <task>"` before IMPLEMENT (one-command rollback).
- Detail per step → [docs/IMPLEMENTATION_WORKFLOW.md](../../IMPLEMENTATION_WORKFLOW.md).

## Proactive Flags

`💡 SUGGESTION` · `⚠️ FLAG` · `🚨 RISK` · `🔴 STOP` · `❓ CLARIFY` · `🔄 REDIRECT`

## Project Overview

<!-- WHY — One paragraph + the stack. Enough to orient; details live in TECH_OVERVIEW. -->
**QR ordering + POS + kitchen display** for a banh-cuon stall.
BE: Go 1.25 · Gin · sqlc · MySQL 8 · Redis. FE: Next.js 14 · TS · Tailwind · Zustand · TanStack Query.
Infra: Docker Compose · Caddy · GitHub Actions.

## Where to read what

<!-- WHY — The root's most valuable table: a one-hop router to every area + cross-cutting truth.
     It POINTS only. No value (endpoint, hex, rule) is ever copied here. -->

| Going to work on… | Read first |
|---|---|
| Anything (how Claude is driven) | [docs/claude_system/CONTEXT_MAP.md](../CONTEXT_MAP.md) |
| Frontend (`fe/src/**`) | [fe/CLAUDE.md](../../../fe/CLAUDE.md) → `frontend-nextjs` skill |
| Backend (`be/**`) | [docs/be/BE_DOC_INDEX.md](../../be/BE_DOC_INDEX.md) → `backend-go` skill |
| DevOps / infra | [docs/claude/CLAUDE_DEVOPS.md](../../claude/CLAUDE_DEVOPS.md) |
| Business rules · RBAC · JWT · realtime | [docs/core/MASTER_v1.2.md](../../core/MASTER_v1.2.md) §4 / §3 / §6 / §5 |
| Endpoints · error codes | [API_CONTRACT_v1.2.md](../../contract/API_CONTRACT_v1.2.md) · [ERROR_CONTRACT_v1.1.md](../../contract/ERROR_CONTRACT_v1.1.md) |

## Commands

```bash
cd be && sqlc generate && cd .. && go build ./...
cd fe && npm run dev                 # :3000
docker compose up -d                 # full stack
docker compose up -d --build be|fe   # after code change
```
Ports: **BE 8080 · FE 3000 · MySQL 3306 · Redis 6379**

## Current Work

<!-- WHY — The ONE volatile section. Kept tiny and pointed at MASTER_TASK as the
     single source of truth, so the map itself rarely needs editing. -->
> Single source of truth → [docs/tasks/MASTER_TASK.md](../../tasks/MASTER_TASK.md).
- **Branch:** `<current>` · **Phase:** `<n>` · **Next:** `<task id from MASTER>`.

<!--
  WHAT'S DIFFERENT ABOUT A ROOT CLAUDE.md (vs. the scoped fe/be examples):
  • It is the ONLY file that sets identity, the session-start sequence, the
    7-step workflow, and the flag system. Scoped files NEVER repeat these.
  • Its key asset is the "Where to read what" router — one hop to every area.
    A root file that tried to also TEACH each area would balloon past 150 lines
    and duplicate the scoped files. It routes; it does not instruct.
  • "Current Work" is the only volatile part. Keep it 2–3 lines and defer to
    MASTER_TASK.md, so day-to-day status churn doesn't force edits to the map.
-->
