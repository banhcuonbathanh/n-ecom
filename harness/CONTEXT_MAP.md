# CONTEXT_MAP.md — Context Management (Primitive 3)

> The context window is finite. This file decides **what to load and what to skip**
> for each task type, so attention stays on the task instead of drowning in docs.

---

## Routing table — task type → read ONLY these

| Task type | Read | Skip |
|---|---|---|
| New BE endpoint | `BE_STATE.md` + `BE_PLAYBOOK.md` + `PLAN.md §Stack §Architecture` + domain section + the page plan under `harness/plans/` if the endpoint serves a planned page + `TOOLS.md` if AI-related | FE docs |
| New FE page/component | `FE_STATE.md` + `PLAN.md §Architecture (FE)` + domain section + the page plan under `harness/plans/` if one exists (menu: `plans/customer_menu/customer_menu_PLAN.md`; orders/tracking: `plans/customer_orders_tracking/customer_orders_tracking_PLAN.md`) | BE internals (use API contract only) |
| **Realtime (SSE/WS, pub/sub)** | `OVERALL_PLAN.md §3.5` (the design + the 4 fixed defects) + `BE_STATE.md` + `plans/customer_orders_tracking/customer_orders_tracking_PLAN.md` §3.1 #2/§3.3/§3.5 (the monitor-stream contract + event→reaction map — the first consumer of the event contract) | catalog/cache docs |
| DB migration | `DB_SCHEMA.md` (canonical tables/columns) + `PLAN.md §File map (db)` + `BE_PLAYBOOK.md §1–2` (sqlc workflow + migration checklist) + migration skill in `SKILLS.md` | everything else |
| Bug fix | `STATE.md` (recent decisions) + the failing area's PLAN section | unrelated domains |
| Infra / DevOps | `DEVOPS.md` + `ENVIRONMENT.md` | domain specs |
| Docs / planning | `TASKS.md` + `STATE.md` | code |

## Rules

1. **Summaries over source.** As the codebase grows, maintain per-domain code
   summaries (routes, DTOs, schema) and read those instead of grepping source.
   Open source files only when you need exact lines to edit.
2. **Compaction target.** Finished work is summarized into `STATE.md` and dropped
   from active context. Never carry a whole session's history forward — carry the
   3-line checkpoint.
3. **One fact, one home.** Never duplicate a fact into a second file — link to it.
   Duplicated facts drift; drifted docs poison the AI's context.
4. **When lost, come back here** — not to a full-tree scan.

## Doc inventory

> Every doc in the project gets a row. If a doc has no row, it is either new
> (add it) or dead (delete it).

| Doc | Purpose | Owner of truth for |
|---|---|---|
| `CLAUDE.md` | Agent identity + workflow | rules of engagement |
| `README.md` (root) | Repo intro: the 10-primitive model + bootstrap guide + folder layout | nothing — orientation; on any conflict CLAUDE.md and harness files win |
| `harness/CONTEXT_MAP.md` | This file | doc routing + the doc inventory itself |
| `harness/PROMPTS.md` | Owner kickoff prompts | copy-paste prompts for the next sessions |
| `harness/PLAN.md` | Architecture | stack, domains, business rules, file map |
| `harness/ARCHITECTURE.md` | Components & alignment (F-6) | component inventory, layer contracts, FE↔BE contract, Redis policy, alignment gates |
| `harness/diagrams/architecture.html` | Visual mirror of ARCHITECTURE.md | nothing — on any conflict the markdown wins |
| `harness/TASKS.md` | Task list | statuses, deps, ACs |
| `harness/STATE.md` | Checkpoint log | decisions, resume point |
| `harness/VERIFICATION.md` | Receipts | proof of done |
| `harness/ENVIRONMENT.md` | Dev env | commands, ports, env vars |
| `harness/TOOLS.md` | Tools/MCP | tool schemas + gating rules |
| `harness/SUBAGENTS.md` | Delegation | when to spawn |
| `harness/SKILLS.md` | Playbooks | recurring procedures |
| `harness/diagrams/build-plan.html` | Visual A→Z overview (architecture, BE/FE roles, wireframes, design system) | nothing — orientation snapshot from Session 0; on any conflict PLAN.md/TASKS.md win |
| `harness/FE_STATE.md` | FE state & loading design (F-5) + FE code-convention rules (F-12, from `reference/docs/fe`) | state ownership, cache/invalidation map, loading/error tiers, FE folder layout, FE code conventions (§9 rules 8–14) |
| `harness/diagrams/fe-state-loading.html` | Visual companion to FE_STATE.md | nothing — snapshot; FE_STATE.md wins |
| `harness/BE_STATE.md` | BE state & data design (F-8) | BE state ownership, transaction policy, error-code enum, validation tiers, BE folder layout |
| `harness/BE_PLAYBOOK.md` | BE engineering playbook (F-11, from `reference/docs/be`) | goose+sqlc workflow, migration-file standard, Go/Gin gotcha rules, caching-discipline adds, BE build order, seed/smoke rule, code-summary (BE_SUMMARY.md) discipline |
| `harness/diagrams/task-F-11.html` | Per-task visual plan page for F-11 (incl. reference gap analysis) | nothing — plan snapshot; TASKS.md/BE_PLAYBOOK.md win |
| `harness/diagrams/be-state-data.html` | Visual companion to BE_STATE.md | nothing — snapshot; BE_STATE.md wins |
| `harness/diagrams/design-system.html` | Design system reference (F-7): tokens, button deep-dive, component specimens | design tokens + component visual specs until code exists (C-4 onward, code wins) |
| `harness/diagrams/task-F-2.html` | Per-task visual plan page for F-2 | nothing — plan snapshot; TASKS.md/PLAN.md win |
| `harness/diagrams/task-F-8.html` | Per-task visual plan page for F-8 | nothing — plan snapshot; TASKS.md/PLAN.md win |
| `harness/OVERALL_PLAN.md` | Master build plan (F-9): restaurant-platform scope from `reference/08_pages`, BE/FE/DevOps plans, phased roadmap | product scope, phase roadmap, lessons register (⚠ pivot pending owner; PLAN.md §Stack + TASKS.md statuses still win in their lanes) |
| `harness/diagrams/overall-plan.html` | Visual companion to OVERALL_PLAN.md | nothing — snapshot; OVERALL_PLAN.md wins |
| `harness/diagrams/task-F-9.html` | Per-task visual plan page for F-9 | nothing — plan snapshot; TASKS.md/PLAN.md win |
| `harness/diagrams/task-F-12.html` | Per-task visual plan page for F-12 | nothing — plan snapshot; TASKS.md/FE_STATE.md win |
| `harness/DEVOPS.md` | DevOps operations (F-13): image patterns, CI/CD + tagging, rollback + SLA, Stage A/B go-live runbook, backups, pre-deploy gates, D-rules | deploy/rollback/backup procedures + DevOps hard rules (commands/ports/env vars stay in ENVIRONMENT.md; strategy in OVERALL_PLAN §5) |
| `harness/diagrams/devops.html` | Visual companion to DEVOPS.md | nothing — snapshot; DEVOPS.md wins |
| `harness/diagrams/task-F-13.html` | Per-task visual plan page for F-13 | nothing — plan snapshot; TASKS.md/DEVOPS.md win |
| `harness/diagrams/task-F-14.html` | Per-task visual plan page for F-14 (docs alignment sweep; records the no-folder-moves decision) | nothing — plan snapshot; TASKS.md/CONTEXT_MAP.md win |
| `harness/plans/PAGE_PLAN_GUIDE.md` | How to build a page-plan set (the 4-doc recipe distilled from customer_menu/F-15): naming, per-doc structure, shared HTML skeleton, build order, registration + quality checklist | page-plan *format & process* only — page rules stay in their owning docs |
| `harness/plans/customer_menu/PLAN.md` | Consolidated FE+BE build plan for the customer menu page (F-15, from `reference/…/customer/customer_menu`) | menu-page scope, FE/BE contract slice, behavior spec, TASKS.md row mapping (rules stay in their owning docs; TASKS.md owns status) |
| `harness/plans/customer_menu/plan.html` | Visual companion to the menu-page plan (page anatomy, component tree, BE contract, dataflow) | nothing — snapshot; the folder's PLAN.md wins |
| `harness/plans/customer_menu/how-it-works.html` | Runtime walkthrough visual: end-to-end sequences (first load / 3-tier loading, add-to-cart, state hubs, POST /orders through Gin→MySQL, Redis cache-aside) | nothing — snapshot; the folder's PLAN.md wins |
| `harness/plans/customer_menu/customer_menu_mockup-1.html` | Mockup #1 — interactive high-fidelity render of the `/menu` page (C-4 preview): design-system components on the dark/orange shell, real seed catalog, worked example, 3 floating action buttons | nothing — snapshot; the folder's PLAN.md + `design-system.html` win |
| `harness/diagrams/task-F-15.html` | Per-task visual plan page for F-15 (customer-menu build plan) | nothing — plan snapshot; TASKS.md + `harness/plans/customer_menu/PLAN.md` win |
| `harness/plans/customer_favourites/customer_favourites_PLAN.md` | Consolidated FE+BE build plan for the customer favourites suite — 3 routes `/menu/favourites` + `/save` + `/sets` (F-24, from `reference/…/customer/customer_favourites`) | favourites-suite scope, FE-only store shapes (`FavouriteItem`/`FavouriteSet`), behavior spec, TASKS.md row mapping. **BE contract is read-only and owned by the menu plan §3** — this file points at it, never restates it |
| `harness/plans/customer_favourites/customer_favourites_plan.html` | Visual companion to the favourites plan (3-route anatomy, component tree, state ownership, the 2-GET/zero-write BE contract, resolve+prune dataflow, behavior grid, task mapping) | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/plans/customer_favourites/customer_favourites_how-it-works.html` | Runtime walkthrough visual: warm-vs-cold first load + the 4 named branches, the resolve/auto-prune pass, favourites-store internals (persisted tree vs session-only cart), cross-page hand-offs, the read path, shared cache life | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/plans/customer_favourites/customer_favourites_mockup-1.html` | Mockup #1 — interactive high-fidelity render of the favourites hub (C-6 preview): 3 segmented views (Yêu thích · Bộ đã lưu · Tự tạo suất) on the dark/orange customer shell, save-as-set modal, worked example (3 favourites · 2 sets); deferred C-7 proposals badged `💡 ĐỀ XUẤT` | nothing — snapshot; the folder's `_PLAN.md` + `design-system.html` win |
| `harness/plans/admin_ingredients/admin_ingredients_PLAN.md` | Consolidated FE+BE build plan for the admin ingredients page `/admin/ingredients` — "Kho nguyên liệu" (F-21, from `reference/…/admin/admin_ingredients`) | ingredients-page scope, its 8-endpoint BE contract + wire shapes, status-derivation ladder, 20-behavior spec, AD-INV task mapping, defects designed out (rules stay in their owning docs; `DB_SCHEMA.md` owns the tables, `TASKS.md` owns status) |
| `harness/plans/admin_ingredients/admin_ingredients_plan.html` | Visual companion to the ingredients plan (page anatomy, component tree, state ownership, the 8-endpoint contract + RBAC split, dataflow, behavior grid, defects, task mapping) | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/plans/admin_ingredients/admin_ingredients_how-it-works.html` | Runtime walkthrough visual: first load + the 5 named branches, posting a stock movement (success + over-draw reject), **inside the locked tx** (vs the reference's non-transactional version), concurrent double-`out`, read-time status derivation, why inventory is never cached | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/plans/admin_ingredients/admin_ingredients_mockup-1.html` | Mockup #1 — high-fidelity render of `/admin/ingredients` on the **neutral F-7 design-system tokens** (admin surface, not the customer dark/orange shell): table with the 5 seed rows + status badges, admin-vs-manager action variants, both modals incl. error states, all 5 render branches | nothing — snapshot; the folder's `_PLAN.md` + `design-system.html` win |
| `harness/plans/customer_orders_tracking/customer_orders_tracking_PLAN.md` | Consolidated FE+BE build plan for the merged customer `/orders` screen — "Đơn hàng & Theo dõi" (F-25, from `reference/…/customer/customer_orders_tracking` reconciled with its two parent pages `customer_tracking` + `customer_order_list`/`_detail`) | the `/orders` page's scope, its realtime contract slice (the one monitor-SSE stream + event→reaction map), the 2 cancel writes, 15-behavior spec, 6 named loading branches, TASKS.md row mapping incl. the new R-1 row (rules stay in their owning docs; `DB_SCHEMA.md §4.3` owns order columns; the menu plan owns `POST /orders/:id/items`) |
| `harness/plans/customer_orders_tracking/customer_orders_tracking_plan.html` | Visual companion to the orders-&-tracking plan (page anatomy, component tree, state ownership, BE + realtime contract, behavior grid, loading branches, task mapping) | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/plans/customer_orders_tracking/customer_orders_tracking_how-it-works.html` | Runtime walkthrough visual: first load (cache instant-paint → GET → SSE snapshot), the live-stream handshake + exhaustive event switch, queue/ETA single-source derivation, the rollup math, the cancel write path through every layer, a two-client chef→customer sequence | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/plans/customer_orders_tracking/customer_orders_tracking_mockup-1.html` | Mockup #1 — high-fidelity render of the merged `/orders` screen on the dark/orange customer shell: the 5 zones, the summary⇄detail centerpiece with the Bàn 04 worked example (103.000 đ · 7 loại), history list, whole-floor queue, plus the cancel/notification modals and the SSE-down + no-active-order states | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/DB_SCHEMA.md` | Canonical DB design (F-16, adopted from `reference/docs/system/02_spec/object`) | schema conventions, field-name law, every table/column spec, mismatch-flag rulings (migrations implement it; once code exists, code wins per rule 5) |
| `harness/diagrams/task-F-16.html` | Per-task visual plan page for F-16 (DB schema adoption) | nothing — plan snapshot; TASKS.md/DB_SCHEMA.md win |
| `harness/README.md` | Folder index: summary + link per harness file | nothing — navigation only; on any conflict the linked file wins |
| `templates/` | Copy-paste templates: `TASK_TEMPLATE.md` (task rows) + `SCENARIO_TEMPLATE.md` | row/AC formats for TASKS.md registration |
| `reference/docs/` | **Read-only north-star corpus** (867 files, restaurant platform; owner-committed 2026-07-18 `00f77d0`) — own index: `reference/docs/DOC_MAP.md`. Tasks cite into it, never edit it; adopted facts move to a harness doc (F-9/F-11/F-12/F-13 pattern) | nothing for this project — on any conflict the harness doc that adopted the fact wins |
| `personal/` | Owner's scratch space — not project material (Session 0b). `personal.md` gitignored; `command.md` tracked (⚠ flagged F-14, owner to confirm) | nothing — never read by tasks |
