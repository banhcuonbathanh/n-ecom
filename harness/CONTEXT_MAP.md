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
| `harness/plans/customer_order_detail/customer_order_detail_SUPPLEMENT.md` | **Supplement, not a plan** (F-19). Records the owner ruling (2026-07-19) that `/order/:id` is **merged away** — order detail is a view inside `/orders` — and owns only the three items that merge left unhomed | 🚨 the deep-link gap (`/orders` is reachable only via client-side `activeOrderId`; shared link / 2nd phone / cleared store cannot reach a live order — `?id=` fix recommended) · ⚠ the dropped quantity stepper (`PATCH /orders/items/:id/quantity`) recorded as a decision · ⚠ the menu-plan redirect drift. **The detail view's contract is owned by `plans/customer_orders_tracking/`** — this file never restates it |
| `harness/plans/customer_order_detail/customer_order_detail_PLAN.md` | Stub only — says there is no plan here and points at the supplement + the `/orders` plan | nothing; exists so the folder can't be mistaken for an unfinished plan set |
| `harness/plans/admin_staff/admin_staff_PLAN.md` | Consolidated FE+BE build plan for the admin staff-roster page `/admin/staff` — the staff-account lifecycle origin (F-23, from `reference/…/admin/admin_staff`) | staff-page scope, its 6-endpoint manager+ contract + wire shapes, the RBAC role-level table (⚠ proposed — promotes to `OVERALL_PLAN.md §3` at S phase), the 4 guards, 20-behavior spec, S/AD task mapping, 17 defects designed out (`DB_SCHEMA.md §4.4` owns the `staff` columns; `BE_STATE.md §4` owns the error enum; `TASKS.md` owns status) |
| `harness/plans/admin_staff/admin_staff_plan.html` | Visual companion to the staff plan (page anatomy, component tree, state ownership + cache map, the 6-endpoint contract + wire shapes, guards & error mapping, the 5 render branches, behavior grid, defects, task mapping) | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/plans/admin_staff/admin_staff_how-it-works.html` | Runtime walkthrough visual: first load + the 5 named branches, debounced server-side filtering, `POST /staff` through every layer with the 4 guards in order + the error rail, PATCH's omitted-vs-null-vs-value semantics, and **the side-effect fan-out** (MySQL + `DEL auth:staff:<id>` + refresh-token revoke → immediate lockout, with the multi-device pull-vs-push asymmetry) | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/plans/admin_staff/admin_staff_mockup-1.html` | Mockup #1 — high-fidelity render of `/admin/staff` on the **neutral F-7 design-system tokens** (admin surface, not the customer dark/orange shell): roster table with seed rows + role/status badges, the self-row and above-your-level disabled-action states, add/edit modal incl. the field-level `username taken` error, detail drawer, plus all 5 render branches | nothing — snapshot; the folder's `_PLAN.md` + `design-system.html` win |
| `harness/plans/admin_training/admin_training_PLAN.md` | Consolidated FE+BE build plan for the admin staff-training page `/admin/training` — "Đào tạo nhân viên" (F-26, from `reference/…/admin/admin_training` + the `admin_main_training` wireframe set) | training-page scope, its 10-endpoint contract (guide CRUD + the roster-first progress reads + **the staff-facing watch/quiz write path the reference never built**), derived 4-state completion status, 12-behavior spec, AD-T1…AD-T6 task mapping, 19 defects designed out (`DB_SCHEMA.md §4.7` owns the tables once AD-T1 promotes them; `BE_STATE.md §4` owns the error enum; `TASKS.md` owns status) |
| `harness/plans/admin_training/admin_training_plan.html` | Visual companion to the training plan (page anatomy + the authoring/tracking split, component tree, state ownership incl. "no Zustand here", the 10-endpoint contract + schema boxes + wire shapes, dataflow + 5 render branches, 12-behavior grid, defects, task mapping) | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/plans/admin_training/admin_training_how-it-works.html` | Runtime walkthrough visual: first load + the 5 named branches, the guide-authoring loop (invalidate→refetch), **the roster LEFT JOIN that makes the completion table truthful from day one** (vs the reference's permanently-empty INNER JOIN), the staff watch/quiz write path inside one tx with the 409 attempts-exhausted rail, the manager-notes upsert path, and why training is never cached | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/plans/admin_training/admin_training_mockup-1.html` | Mockup #1 — high-fidelity render of `/admin/training` on the **neutral F-7 design-system tokens** (admin surface, not the customer dark/orange shell): role tabs, job-guide card grid incl. the "Nháp" draft card, the completion-tracking table on the 12-chef worked example with **four visually distinct status badges** (the reference collapsed two into one), plus both modals | nothing — snapshot; the folder's `_PLAN.md` + `design-system.html` win |
| `harness/plans/admin_toppings/admin_toppings_PLAN.md` | Consolidated FE+BE build plan for the admin toppings page `/admin/toppings` — topping CRUD covering both the paid add-ons and the ₫0 nhân fillings (F-29, from `reference/…/admin/admin_toppings` + the `admin_main_topping` wireframe set) | toppings-page scope, its 5-endpoint contract (the public/`all` role-scoped split + the server-joined `products[]`), the 3-target cache fan-out, wire shapes in DB names, 16-behavior spec, AD-TOP-1…3 task mapping, 12 defects designed out (`DB_SCHEMA.md §4.1` owns the `toppings`/`product_toppings` columns — this plan ⚠ *requests* a `UNIQUE(name)` amendment there, it does not write one; `BE_STATE.md §4` owns the error enum; `admin_products` F-27 owns the product↔topping picker; `TASKS.md` owns status) |
| `harness/plans/admin_toppings/admin_toppings_plan.html` | Visual companion to the toppings plan (page anatomy, component tree, state ownership + the deliberately-shared query key, the 5-endpoint contract + schema boxes + cache map + wire shapes, dataflow, 16-behavior grid, defects, task mapping, decisions/flags) | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/plans/admin_toppings/admin_toppings_how-it-works.html` | Runtime walkthrough visual: the pull-only big picture (no SSE/WS for catalog data), first load through **one** query and its 4 named branches (vs the reference's ungated second query), the save round-trip drawn as an SVG sequence, the delete transaction (soft delete + junction purge, ids captured *before* the purge), the cache fan-out table answering "when does the customer see my new price?", and the two state hubs | nothing — snapshot; the folder's `_PLAN.md` wins |
| `harness/plans/admin_toppings/admin_toppings_mockup-1.html` | Mockup #1 — high-fidelity render of `/admin/toppings` on the **neutral F-7 design-system tokens** (admin surface, not the customer dark/orange shell): the 7-row seed table with ₫0 "Miễn phí" vs paid rows, product chips, in-flight disabled Xóa, the add/edit modal incl. the real `409` duplicate-name error, both delete-dialog variants, plus the loading/empty/error branches | nothing — snapshot; the folder's `_PLAN.md` + `design-system.html` win |
| `harness/DB_SCHEMA.md` | Canonical DB design (F-16, adopted from `reference/docs/system/02_spec/object`) | schema conventions, field-name law, every table/column spec, mismatch-flag rulings (migrations implement it; once code exists, code wins per rule 5) |
| `harness/diagrams/task-F-16.html` | Per-task visual plan page for F-16 (DB schema adoption) | nothing — plan snapshot; TASKS.md/DB_SCHEMA.md win |
| `harness/README.md` | Folder index: summary + link per harness file | nothing — navigation only; on any conflict the linked file wins |
| `templates/` | Copy-paste templates: `TASK_TEMPLATE.md` (task rows) + `SCENARIO_TEMPLATE.md` | row/AC formats for TASKS.md registration |
| `reference/docs/` | **Read-only north-star corpus** (867 files, restaurant platform; owner-committed 2026-07-18 `00f77d0`) — own index: `reference/docs/DOC_MAP.md`. Tasks cite into it, never edit it; adopted facts move to a harness doc (F-9/F-11/F-12/F-13 pattern) | nothing for this project — on any conflict the harness doc that adopted the fact wins |
| `personal/` | Owner's scratch space — not project material (Session 0b). `personal.md` gitignored; `command.md` tracked (⚠ flagged F-14, owner to confirm) | nothing — never read by tasks |
