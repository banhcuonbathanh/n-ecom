# Context Map — what Claude reads, in what order

> The exact reading chain per work area. "Always loaded" = enters context automatically.
> Everything else is read on demand, only when the task touches it.

---

## Layer model (applies to every area)

```
1. ROUTER   — maps/indexes that tell you WHERE to go      (CLAUDE.md, skill SKILL.md, DOC_INDEX)
2. RULES    — HOW to work in this stack                   (skill rules/, system guides)
3. REGISTRY — WHAT already exists                         (_INDEX_*.md, be_code_summary/)
4. TRUTH    — the business/contract source of truth       (specs, MASTER, contracts)
```

Read top-down: never jump to TRUTH (4) without first checking the REGISTRY (3) for what already exists.

---

## FRONTEND — touching `fe/src/**`

| # | Layer | File | Loaded |
|---|---|---|---|
| 1 | Router | [CLAUDE.md](../../CLAUDE.md) | always |
| 2 | Router | [fe/CLAUDE.md](../../fe/CLAUDE.md) | in `fe/` |
| 3 | Router | [.claude/skills/frontend-nextjs/SKILL.md](../../.claude/skills/frontend-nextjs/SKILL.md) — **MANDATORY before any FE code**; has always-on invariants + task→rule map | per task |
| 4 | Rules | `.claude/skills/frontend-nextjs/rules/01-structure · 02-design · 03-data-and-state · 04-rendering-and-loading · 05-forms-auth-realtime` — read the one(s) matching the task | per task |
| 5 | Registry | `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md · _INDEX_STATE_MANAGEMENT.md · _INDEX_RENDERING_STRATEGY.md` — what exists; **update the moment you create something** | per task |
| 6 | Truth | [MASTER_v1.2.md](../core/MASTER_v1.2.md) §2 tokens · §5 realtime · §6 JWT | per concern |
| 7 | Truth | [API_CONTRACT_v1.2.md](../contract/API_CONTRACT_v1.2.md) · [ERROR_CONTRACT_v1.1.md](../contract/ERROR_CONTRACT_v1.1.md) | per concern |
| 8 | Truth | domain specs: [Spec_3 Menu/Checkout](../spec/Spec_3_Menu_Checkout_UI_v2.md) · [Spec_4 Orders](../spec/Spec_4_Orders_API.md) · [Spec_5 Payment](../spec/Spec_5_Payment_Webhooks.md) | only that domain |

**Always-on FE invariants** (from the skill — true for every FE change):
IDs are `string` UUID · no hardcoded hex (Tailwind tokens only) · no hardcoded localStorage keys (`src/lib/storage-keys.ts`) · no raw fetch/axios (`src/lib/api-client.ts`) · money via `formatVND()` · server→TanStack, client→Zustand, forms→RHF+Zod · cart→order payloads via `src/lib/order-payload.ts`.

> ⚠️ **Do NOT use** [docs/fe/FE_DOC_INDEX.md](../fe/FE_DOC_INDEX.md) — marked SUPERSEDED, replaced by the skill. See [CLEANUP_LOG.md](CLEANUP_LOG.md).

---

## BACKEND — touching `be/**`

| # | Layer | File | Loaded |
|---|---|---|---|
| 1 | Router | [CLAUDE.md](../../CLAUDE.md) | always |
| 2 | Router | [docs/be/BE_DOC_INDEX.md](../be/BE_DOC_INDEX.md) — "where do I read X" for any BE task | per task |
| 3 | Rules | skill `backend-go` (Go/Gin/sqlc patterns) + [docs/be/BE_SYSTEM_GUIDE.md](../be/BE_SYSTEM_GUIDE.md) | per task |
| 4 | Registry | `docs/be/be_code_summary/` — routes · DTOs · errors · schema · env (**read instead of grepping Go source**) | per task |
| 5 | Truth | [API_CONTRACT_v1.2.md](../contract/API_CONTRACT_v1.2.md) · [ERROR_CONTRACT_v1.1.md](../contract/ERROR_CONTRACT_v1.1.md) · [MASTER_v1.2.md](../core/MASTER_v1.2.md) §3/§4/§6 | per concern |
| 6 | Truth | domain specs (`docs/spec/Spec_1 … Spec_7`) | only that domain |

Layer contract (strict): `handler → service → repository → db (sqlc generated)`.

---

## DEVOPS / INFRA

| # | Layer | File |
|---|---|---|
| 1 | Router | [CLAUDE.md](../../CLAUDE.md) |
| 2 | Rules | [docs/claude/CLAUDE_DEVOPS.md](../claude/CLAUDE_DEVOPS.md) |
| 3 | Truth | `docker-compose.yml` · `Caddyfile` · `.env.example` · `docs/GOLIVE_RUNBOOK.md` |

---

## Cross-cutting (any area, read before code)

| Concern | Source of truth |
|---|---|
| Error codes + format | [ERROR_CONTRACT_v1.1.md](../contract/ERROR_CONTRACT_v1.1.md) |
| Business rules (order/payment/cancel) | [MASTER_v1.2.md](../core/MASTER_v1.2.md) §4 |
| RBAC roles | [MASTER_v1.2.md](../core/MASTER_v1.2.md) §3 |
| JWT / auth | [MASTER_v1.2.md](../core/MASTER_v1.2.md) §6 |
| Realtime SSE/WS | [MASTER_v1.2.md](../core/MASTER_v1.2.md) §5 + [API_CONTRACT_v1.2.md](../contract/API_CONTRACT_v1.2.md) §10 |
| Client QR flow | [docs/work_flow/CLIENT_QR_FLOW.md](../work_flow/CLIENT_QR_FLOW.md) |
| Staff order flow | [docs/work_flow/STAFF_ORDER_FLOW.md](../work_flow/STAFF_ORDER_FLOW.md) |

---

*Verify a file still exists before relying on it — this map reflects 2026-06-07.*
