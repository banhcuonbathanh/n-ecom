# BE Documentation Index — Navigation Map

> **Purpose:** the one place that answers *"where do I read X?"* for any BE work.
> **Map only** — pointers, not content. One fact, one home: each topic links to its single source.
> **Read order for a BE task:** this map → the matching code summary → (only if needed) the domain spec → source.
> **Last verified:** 2026-06-05

---

## 0 — Fastest path: "I need X → read Y"

| I need to know… | Read |
|---|---|
| Does an endpoint exist / its path / its auth level | [`be_code_summary/BE_STRUCTURE.md`](be_code_summary/BE_STRUCTURE.md) → Route Table (87 routes) |
| Request/response JSON fields for an endpoint | [`be_code_summary/BE_API_DTO.md`](be_code_summary/BE_API_DTO.md) |
| What error codes an endpoint returns | [`be_code_summary/BE_API_DTO.md`](be_code_summary/BE_API_DTO.md) (catalog + per-endpoint) |
| A DB table / column / type / FK / index | [`be_code_summary/DB_SCHEMA_SUMMARY.md`](be_code_summary/DB_SCHEMA_SUMMARY.md) |
| Redis key patterns + TTLs | [`be_code_summary/DB_SCHEMA_SUMMARY.md`](be_code_summary/DB_SCHEMA_SUMMARY.md) → Redis Key Schema |
| Caching strategy (cache-aside, invalidation, fail-open) | [`BE_CACHING_STRATEGY.md`](BE_CACHING_STRATEGY.md) |
| An env var (purpose / default / where read) | [`be_code_summary/BE_ENV_CONFIG.md`](be_code_summary/BE_ENV_CONFIG.md) |
| What a service/repo exposes (method index) | [`be_code_summary/CODEBASE_GRAPH_BE.md`](be_code_summary/CODEBASE_GRAPH_BE.md) |
| How a domain wires handler→service→repo→DB | [`be_code_summary/CODEBASE_GRAPH_BE.md`](be_code_summary/CODEBASE_GRAPH_BE.md) |
| Layer rules / folder tree / background jobs / realtime / RBAC | [`be_code_summary/BE_STRUCTURE.md`](be_code_summary/BE_STRUCTURE.md) |
| Business rules (order lifecycle, cancel, payment, refresh) | [`docs/core/MASTER_v1.2.md`](../core/MASTER_v1.2.md) §4 |
| RBAC roles + hierarchy | [`docs/core/MASTER_v1.2.md`](../core/MASTER_v1.2.md) §3 |
| JWT config + auth rules | [`docs/core/MASTER_v1.2.md`](../core/MASTER_v1.2.md) §6 |
| SSE/WS realtime config (reconnect, heartbeat) | [`docs/core/MASTER_v1.2.md`](../core/MASTER_v1.2.md) §5 + [`API_CONTRACT_v1.2.md`](../contract/API_CONTRACT_v1.2.md) §10 |
| Error format + `respondError` pattern | [`docs/contract/ERROR_CONTRACT_v1.1.md`](../contract/ERROR_CONTRACT_v1.1.md) |
| Patterns / epics / "what to read per domain" (prose) | [`BE_SYSTEM_GUIDE.md`](BE_SYSTEM_GUIDE.md) — primary BE guide |
| How the `repository → db` layer is generated (sqlc) | [`BE_SQLC_GUIDE.md`](BE_SQLC_GUIDE.md) — sqlc.yaml · query conventions · `cmd/` tools |
| Build the whole BE from an empty folder (ordered checklist) | [`BE_BUILD_FROM_ZERO.md`](BE_BUILD_FROM_ZERO.md) — scaffold spine, links each step's doc |
| End-to-end client/staff flows | [`docs/work_flow/`](../work_flow/) → `CLIENT_QR_FLOW.md` · `STAFF_ORDER_FLOW.md` · `FLOW_INDEX.md` |

---

## 1 — Code summaries (read BEFORE opening Go source)

> `docs/be/be_code_summary/` mirrors `be/` so a session answers most questions without grepping.
> Index + "which file for which question" inside its own [`README.md`](be_code_summary/README.md).

| File | Answers | Mirrors |
|---|---|---|
| [`BE_STRUCTURE.md`](be_code_summary/BE_STRUCTURE.md) | Folder tree · layer rules · **Route Table** · jobs · realtime · RBAC | `cmd/server/main.go`, layout |
| [`CODEBASE_GRAPH_BE.md`](be_code_summary/CODEBASE_GRAPH_BE.md) | Per-domain dependency graph · service + repo method indexes | `internal/**` |
| [`DB_SCHEMA_SUMMARY.md`](be_code_summary/DB_SCHEMA_SUMMARY.md) | Tables/columns/FKs · Redis keys · field-name gotchas | `migrations/001–015` |
| [`BE_ENV_CONFIG.md`](be_code_summary/BE_ENV_CONFIG.md) | Every env var · purpose · default · where read | `os.Getenv` calls |
| [`BE_API_DTO.md`](be_code_summary/BE_API_DTO.md) | Per-endpoint request/response shapes · error codes · envelope | handler structs + `service/errors.go` |

---

## 2 — Cross-cutting single sources (shared by all domains)

| Topic | File | Owner |
|---|---|---|
| All endpoints (table form) | [`docs/contract/API_CONTRACT_v1.2.md`](../contract/API_CONTRACT_v1.2.md) | BE + FE |
| Error codes + `respondError` format | [`docs/contract/ERROR_CONTRACT_v1.1.md`](../contract/ERROR_CONTRACT_v1.1.md) | BE + FE |
| Business rules · RBAC · realtime · JWT · design tokens | [`docs/core/MASTER_v1.2.md`](../core/MASTER_v1.2.md) | BE + FE |
| Primary BE prose guide (epics, rules, patterns) | [`BE_SYSTEM_GUIDE.md`](BE_SYSTEM_GUIDE.md) | BE |
| OpenAPI spec (Swagger UI :8090) | [`docs/api/openapi.yaml`](../api/openapi.yaml) | BE |

---

## 3 — Per-domain reading guide

> Read in order: **code summary first** (fields/routes/errors), then the spec only if you need *why* (business rules), then source. Specs live in `docs/spec/`.

| Domain | Spec (the "why") | Contract §  | Workflow doc |
|---|---|---|---|
| **Auth** (read first — blocks all) | [`Spec1_Auth_Updated_v2.md`](../spec/Spec1_Auth_Updated_v2.md) | API §2 · ERROR §2–3 | [`FLOW_09_AUTH_TOKENS.md`](../work_flow/FLOW_09_AUTH_TOKENS.md) |
| **Products / Categories / Toppings / Combos** | [`Spec_2_Products_API_v2_CORRECTED.md`](../spec/Spec_2_Products_API_v2_CORRECTED.md) · [`Spec_Admin_Categories.md`](../spec/Spec_Admin_Categories.md) | API §3 | — |
| **Orders + SSE + Groups** | [`Spec_4_Orders_API.md`](../spec/Spec_4_Orders_API.md) | API §4 · §10.2 | [`FLOW_08_ORDER_STATE_MACHINE.md`](../work_flow/FLOW_08_ORDER_STATE_MACHINE.md) · [`FLOW_07_CANCEL.md`](../work_flow/FLOW_07_CANCEL.md) · [`STAFF_ORDER_FLOW.md`](../work_flow/STAFF_ORDER_FLOW.md) |
| **Payments + webhooks** | [`Spec_5_Payment_Webhooks.md`](../spec/Spec_5_Payment_Webhooks.md) | API §5 | [`FLOW_06_PAYMENT.md`](../work_flow/FLOW_06_PAYMENT.md) |
| **QR / Tables** | [`Spec_6_QR_POS.md`](../spec/Spec_6_QR_POS.md) | API §6 | [`CLIENT_QR_FLOW.md`](../work_flow/CLIENT_QR_FLOW.md) · [`FLOW_04_STAFF_POS.md`](../work_flow/FLOW_04_STAFF_POS.md) |
| **Files / Upload** | — (contract only) | API §7 · ERROR §2 | — |
| **Staff management** | [`Spec_7_Staff_Management.md`](../spec/Spec_7_Staff_Management.md) | API §8 | — |
| **Admin: Overview + Marketing** | [`Spec_9_Admin_Dashboard_Pages.md`](../spec/Spec_9_Admin_Dashboard_Pages.md) | API §9 | [`FLOW_05_ADMIN_OVERVIEW.md`](../work_flow/FLOW_05_ADMIN_OVERVIEW.md) |
| **Admin: Analytics · Ingredients · Tasks · Training** | ⬜ no spec yet — built ad-hoc (see code summaries + API §9) | API §9 | — |
| **WebSocket (KDS / live)** | — | API §10.1 · MASTER §5.1 | [`FLOW_03_STAFF_KDS.md`](../work_flow/FLOW_03_STAFF_KDS.md) |

> Common field-name + rule gotchas (`price` not `base_price`, derive item status from `qty_served`, `gateway_data` not `webhook_payload`, payment `completed` not `success`, recalc `total_amount` after every mutation) are in [`DB_SCHEMA_SUMMARY.md`](be_code_summary/DB_SCHEMA_SUMMARY.md) → Critical Gotchas and MASTER_TASK Critical Rules.

---

## 4 — Layer rules & patterns (quick ref → single source)

- **Layer rules + allowed imports** → [`BE_STRUCTURE.md`](be_code_summary/BE_STRUCTURE.md) → Layer Rules. Strict chain: `handler → service → repository → db (sqlc)`.
- **`respondError` / `handleServiceError` / `AppError` mapping** → `be/internal/handler/respond.go` + `be/internal/service/errors.go` (catalog mirrored in [`BE_API_DTO.md`](be_code_summary/BE_API_DTO.md)).
- **DI wiring + route registration** → `be/cmd/server/main.go` (single source; do not duplicate the skeleton here — it rots).

---

## Maintenance

When BE code changes, update the matching `be_code_summary/` file (each has a re-generate note up top; `/codebase-graph be` regenerates structure + graph). This index changes only when a **doc is added/moved/renamed**, not on code edits.

*BanhCuon System · BE Documentation Index · v2.0 · 2026-06-05*
