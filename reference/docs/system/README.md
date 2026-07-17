# System Handbook — Hệ Thống Quản Lý Quán Bánh Cuốn

> **TL;DR:** This folder is the **single entry point** to understand the whole system — both FE and BE —
> in under 30 minutes, then start developing a new page or endpoint that fits the existing design,
> shared components, and data flow. Every file starts with its own TL;DR; read those first.
> The folder structure itself is a **reusable template** for other projects → see
> [05_dev_guide/FOLDER_TEMPLATE.md](05_dev_guide/FOLDER_TEMPLATE.md).

> **🤖 Agents start here:** [AGENT_OS.md](AGENT_OS.md) is the single entry point — a routing table
> that maps every task type to the docs to READ, the SKILL to run, the VERIFY gate, and the doc to
> UPDATE on done. Run `/start-task` to open a task and `/finish-task` to close it against the
> Definition of Done. Humans reading for understanding can continue with the folder map below.

---

## What This System Is (30 seconds)

A restaurant management system for a Vietnamese bánh cuốn shop:

- **Customers** scan a table QR → browse menu → order → track live status → pay (cash / VNPay / MoMo)
- **Staff** run KDS (kitchen display), POS, confirm/cancel orders, take payment
- **Admin/owner** manage products, staff, tables/QR, live floor overview, marketing

**Stack:** Go 1.25 + Gin + sqlc + MySQL 8 + Redis Stack (BE) · Next.js 14 App Router + TypeScript + Tailwind + Zustand + TanStack Query (FE) · SSE/WS realtime · Docker Compose + Caddy.

---

## Folder Map — Read in This Order

| # | Folder | What's inside | Read when |
|---|---|---|---|
| `00_overview/` | [SYSTEM_OVERVIEW](00_overview/SYSTEM_OVERVIEW.md) · [TECH_STACK](00_overview/TECH_STACK.md) · [SCALABILITY_REVIEW](00_overview/SCALABILITY_REVIEW.md) | What the system does, actors, architecture diagram, stack tables, end-to-end request topology + scalability/performance assessment | **Always first** — 10 min |
| `01_flow/` | [FLOW_INDEX](01_flow/FLOW_INDEX.md) · [CLIENT_FLOW](01_flow/CLIENT_FLOW.md) · [STAFF_FLOW](01_flow/STAFF_FLOW.md) · [ORDER_STATE_MACHINE](01_flow/ORDER_STATE_MACHINE.md) · [PAYMENT_FLOW](01_flow/PAYMENT_FLOW.md) | How every journey works end-to-end, with sequence/state diagrams | Before touching any feature in that flow |
| `02_spec/` | [API_SPEC](02_spec/API_SPEC.md) · [DB_SCHEMA](02_spec/DB_SCHEMA.md) · [ERROR_SPEC](02_spec/ERROR_SPEC.md) · [BUSINESS_RULES](02_spec/BUSINESS_RULES.md) | Contracts: every endpoint, every table, every error code, every rule | While coding — keep open as reference |
| `03_be/` | [BE_TECH_SUMMARY](03_be/BE_TECH_SUMMARY.md) · [BE_CODE_SUMMARY](03_be/BE_CODE_SUMMARY.md) · [REDIS_CACHE](03_be/REDIS_CACHE.md) · [REALTIME_SSE](03_be/REALTIME_SSE.md) | BE layers, route map, caching strategy, SSE/WS architecture | Any BE task |
| `04_fe/` | [FE_TECH_SUMMARY](04_fe/FE_TECH_SUMMARY.md) · [FE_CODE_SUMMARY](04_fe/FE_CODE_SUMMARY.md) · [STATE_MANAGEMENT](04_fe/STATE_MANAGEMENT.md) · [LOADING_PATTERNS](04_fe/LOADING_PATTERNS.md) · [DESIGN_SYSTEM](04_fe/DESIGN_SYSTEM.md) · [DATA_COMMUNICATION](04_fe/DATA_COMMUNICATION.md) | FE conventions: state rules, loading UX, design tokens, shared components, data flow | Any FE task |
| `05_dev_guide/` | [NEW_PAGE_GUIDE](05_dev_guide/NEW_PAGE_GUIDE.md) · [NEW_ENDPOINT_GUIDE](05_dev_guide/NEW_ENDPOINT_GUIDE.md) · [WIREFRAME_STANDARD](05_dev_guide/WIREFRAME_STANDARD.md) · [FOLDER_TEMPLATE](05_dev_guide/FOLDER_TEMPLATE.md) | How to build a new page / a new BE endpoint the right way · wireframe folder standard · how to reuse this handbook structure in another project | Before starting a new page / endpoint / new project |
| `06_test_build/` | [menu_page/](06_test_build/menu_page/README.md) — reference rebuild of `/menu` (FE+BE, not wired in) + [DEV_PLAN](06_test_build/menu_page/DEV_PLAN.md) template + [DIFF_VS_CURRENT](06_test_build/menu_page/DIFF_VS_CURRENT.md) test results | Proof that this handbook can drive a page build; DEV_PLAN is the Phase 2b template | When writing a DEV_PLAN / auditing handbook gaps |
| `07_business_logic/` | [LOGIC_INDEX](07_business_logic/LOGIC_INDEX.md) · [LOGIC_BE](07_business_logic/LOGIC_BE.md) · [LOGIC_FE](07_business_logic/LOGIC_FE.md) · [LOGIC_DEVOPS](07_business_logic/LOGIC_DEVOPS.md) | **Canonical business-logic home** — per-layer invariants, ⚠️ DRIFT entries, owner Decision Log | **Before changing ANY logic or flow** — consult + update first (Rule #8) |
| `08_pages/` | [PAGES_INDEX](08_pages/PAGES_INDEX.md) | Page inventory + ASCII drawings for every screen (existing + planned) | Before building or changing any page |
| `09_devops/` | [DEVOPS_INDEX](09_devops/DEVOPS_INDEX.md) · [GO_LIVE](09_devops/GO_LIVE.md) · [MONITORING](09_devops/MONITORING.md) · [MAC_TEST_SERVER_PLAN](09_devops/MAC_TEST_SERVER_PLAN.md) | How the system is **run**: 2-stage go-live (Mac → VPS), monitoring stack, Mac-as-test-server operation plan | Any deploy/ops/monitoring task |
| `10_caching/` | [CACHING_INDEX](10_caching/CACHING_INDEX.md) · [CACHE_FLOW_E2E](10_caching/CACHE_FLOW_E2E.md) | **Cross-layer caching design** — layer map (TanStack → HTTP → Redis → MySQL), end-to-end read/write/invalidation flows, staleness budgets, realtime bypass | Adding a cache key, tuning staleTime, or debugging stale data |

---

## Reading Paths by Role

**"I'm new — just give me the picture" (15 min)**
1. [00_overview/SYSTEM_OVERVIEW.md](00_overview/SYSTEM_OVERVIEW.md)
2. [01_flow/FLOW_INDEX.md](01_flow/FLOW_INDEX.md) — look at the intersection map
3. Skim the TL;DR blocks of every other file

**"I'm building a new FE page" (the most common task)**
1. [04_fe/DESIGN_SYSTEM.md](04_fe/DESIGN_SYSTEM.md) — tokens + shared component catalog (reuse, never re-style)
2. [04_fe/STATE_MANAGEMENT.md](04_fe/STATE_MANAGEMENT.md) — where each piece of state lives (strict rules)
3. [04_fe/DATA_COMMUNICATION.md](04_fe/DATA_COMMUNICATION.md) — how the page talks to BE and other pages
4. Follow [05_dev_guide/NEW_PAGE_GUIDE.md](05_dev_guide/NEW_PAGE_GUIDE.md) step by step

**"I'm building/changing a BE endpoint"**
1. [03_be/BE_TECH_SUMMARY.md](03_be/BE_TECH_SUMMARY.md) — layer rules (handler → service → repository → sqlc)
2. [02_spec/API_SPEC.md](02_spec/API_SPEC.md) + [02_spec/ERROR_SPEC.md](02_spec/ERROR_SPEC.md) — match existing contracts
3. [03_be/BE_CODE_SUMMARY.md](03_be/BE_CODE_SUMMARY.md) — "add a new endpoint" checklist
4. Touching cached data? → [03_be/REDIS_CACHE.md](03_be/REDIS_CACHE.md) — invalidation triggers

**"I'm touching orders / payment / cancel"**
1. [01_flow/ORDER_STATE_MACHINE.md](01_flow/ORDER_STATE_MACHINE.md) — transitions + who is allowed
2. [02_spec/BUSINESS_RULES.md](02_spec/BUSINESS_RULES.md) — the rules summary
3. The relevant flow doc in `01_flow/`

---

## Data Model Map — FE ↔ BE ↔ DB

Where to see the object models: what FE sends to BE, what BE returns, and how it's stored.
**Start at [02_spec/object/OBJECT_MODELS.md](02_spec/object/OBJECT_MODELS.md)** — the index of every model's single home file (each shows all layers side-by-side with a real example). The table below is the per-concern breakdown.
Reading path for any page: **08_pages/\<page\>.md** (which endpoints) → **OBJECT_MODELS.md** (full shape, all layers) → **API_SPEC.md** (key fields) → **DB_SCHEMA.md**.

| What you want to see | Where | What it gives you |
|---|---|---|
| FE → BE request models | [02_spec/API_SPEC.md](02_spec/API_SPEC.md) | Per-endpoint **Key Request Fields** column |
| BE → FE response models | [02_spec/API_SPEC.md](02_spec/API_SPEC.md) | Per-endpoint **Key Response Fields** column + error envelope |
| Full DTO shapes (every field, exact types) | [../be/be_code_summary/BE_API_DTO.md](../be/be_code_summary/BE_API_DTO.md) · [../api/openapi.yaml](../api/openapi.yaml) (Swagger UI :8090) — *outside this handbook* | Complete request/response structs — API_SPEC shows only key fields |
| DB object models (tables, columns) | [02_spec/DB_SCHEMA.md](02_spec/DB_SCHEMA.md) | Every table/column, migrations 001–017, conventions (UUID PKs, soft delete, VND DECIMAL) |
| Per page → which endpoints it calls | [08_pages/](08_pages/PAGES_INDEX.md) — Zones table in each page doc; per-page **Backend View** `<page>_be.md` (e.g. [customer_menu_be.md](08_pages/customer/customer_menu/customer_menu_be.md)) traces each endpoint handler → service → repo → SQL | Component → endpoint mapping (no field shapes — follow into API_SPEC) |
| Inventory / stock object model (Ingredient, stock movements, BOM) | [02_spec/object/OBJECT_MODEL_INGREDIENT.md](02_spec/object/OBJECT_MODEL_INGREDIENT.md) | All layers side-by-side: `ingredients`, `stock_movements`, `product_ingredients` DB + `toIngredientJSON` BE serializer + FE `Ingredient` type; STOR forecast plan in §4 |
| How FE sends/stores data (transport) | [04_fe/DATA_COMMUNICATION.md](04_fe/DATA_COMMUNICATION.md) | api-client, token storage, localStorage keys, SSE/WS, `order-payload.ts` rule |
| FE-side state shapes (cart, auth stores) | [04_fe/FE_CODE_SUMMARY.md](04_fe/FE_CODE_SUMMARY.md) | Zustand store state shape detail |

---

## Non-Negotiable Rules (apply to every page, every endpoint)

1. **Same design everywhere** — new pages use the tokens + shared components in [DESIGN_SYSTEM.md](04_fe/DESIGN_SYSTEM.md). No one-off colors, no inline hex.
2. **Strict state homes** — server data → TanStack Query · cross-page → Zustand · component-local → useState · forms → RHF+Zod. See [STATE_MANAGEMENT.md](04_fe/STATE_MANAGEMENT.md).
3. **Strict BE layers** — handler → service → repository → db (sqlc). No layer skipping. See [BE_TECH_SUMMARY.md](03_be/BE_TECH_SUMMARY.md).
4. **One write path for orders** — all order POSTs go through `fe/src/lib/order-payload.ts`.
5. **localStorage keys** only in `fe/src/lib/storage-keys.ts`.
6. **Errors** follow [ERROR_SPEC.md](02_spec/ERROR_SPEC.md) format on BE and the code→message mapping on FE.
7. **Cache invalidation** — any BE write to cached data must trigger the invalidation listed in [REDIS_CACHE.md](03_be/REDIS_CACHE.md).
8. **Business logic lives in [07_business_logic/](07_business_logic/LOGIC_INDEX.md)** — any change to logic or flow MUST consult and update it first.
9. **One model, one home** — every object model has exactly one home file under [02_spec/object/OBJECT_MODELS.md](02_spec/object/OBJECT_MODELS.md), showing all layers (FE ⇄ BE ⇄ DB) with a real example. Every other doc links to that home and never re-lists the model's fields. See [OBJECT_MODELS.md — The Rule](02_spec/object/OBJECT_MODELS.md#the-rule-one-model--one-home).
10. **Close the drift loop** — before building or changing any page, check its row in [COMPARISON_TRACKER](08_pages/COMPARISON_TRACKER.md). After the change, if the page's wireframe/doc-set no longer matches the code, update the doc **in the same task** — a task is not DONE while its page doc contradicts the code. Every tracker 🔴 must end as either a MASTER_TASK row (code bug) or a doc-fix commit (doc drift) in the tracker's `Fixed?` column.

---

## How This Handbook Stays Useful

- Every file is a **summary that links to its deep-dive sources inside this handbook** (`docs/system/` is self-contained). When summary and code disagree → **the code wins** — fix the summary AND log the drift in the [LOGIC_INDEX Decision Log](07_business_logic/LOGIC_INDEX.md#decision-log).
- Update the relevant file here whenever a flow, contract, or convention changes — it's the first thing the next developer reads.
- Reusing this structure for a new project → [05_dev_guide/FOLDER_TEMPLATE.md](05_dev_guide/FOLDER_TEMPLATE.md).
