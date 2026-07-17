# harness/ — Index

> Navigation only. Each file below is the **single owner** of its facts — this index
> links and summarizes, it never duplicates content (one fact, one home).
> What to read per task type: [CONTEXT_MAP.md](CONTEXT_MAP.md).
> Adding/removing/repurposing any file in this folder? Update this index AND the
> [CONTEXT_MAP.md](CONTEXT_MAP.md) doc inventory in the same change (CLAUDE.md Hard Rule 6).

## Core docs

| File | Primitive | Summary |
|---|---|---|
| [PLAN.md](PLAN.md) | 2 · Context Delivery | Architecture source of truth: decided stack (Go 1.26/Gin/sqlc/MySQL 9.7/Redis 8 · Next 16/TS/Tailwind 4), architecture rules, error envelope, MVP domains, business rules, exact file map. |
| [CONTEXT_MAP.md](CONTEXT_MAP.md) | 3 · Context Management | Routing table: task type → which docs to read and which to skip. Also holds the full doc inventory. When lost, start here. |
| [TOOLS.md](TOOLS.md) | 4 · Tool Interface | Dev-time tool rules (file tools, Bash, MCP) and the runtime-tool pattern for future AI features: typed schema, whitelist, confirm-gated writes, service-layer-only. |
| [ENVIRONMENT.md](ENVIRONMENT.md) | 5 · Execution Environment | Dev stack layout (compose services + ports: caddy 80, BE 8080, FE 3000, MySQL 3306, Redis 6379) and the single source for all commands. |
| [STATE.md](STATE.md) | 6 · Durable State | Checkpoint log, newest on top. Current resume point, open decisions, and per-session done/decided/next entries. Every session resumes from this file. |
| [TASKS.md](TASKS.md) | 7 · Orchestration | Master task list by phase (F Foundation → Catalog → Cart/Checkout → Orders) with deps, acceptance criteria, status, receipt links. F-1/5/6/7 ✅; next: F-2. |
| [PROMPTS.md](PROMPTS.md) | 7 · Orchestration | Copy-paste kickoff prompts for the owner — one standing prompt plus a queued prompt per remaining task (F-2, F-3, F-4). |
| [SUBAGENTS.md](SUBAGENTS.md) | 8 · Sub-agents | When to delegate (search, review, doc generation, research) vs. never ("session is long" is not a reason), standing auto-delegation rules, narrow-brief rules. |
| [SKILLS.md](SKILLS.md) | 9 · Skills & Procedures | Installed slash commands (`/start-task`, `/finish-task`, `/handoff`) and inline playbooks: add-an-endpoint, add-a-migration, add-a-runtime-tool, fix-a-bug. |
| [VERIFICATION.md](VERIFICATION.md) | 10 · Verification | Receipt log — evidence (build/test/curl/screenshot/migration round-trip) required before any task is marked ✅. |

## Design docs (expanded from PLAN.md)

| File | Summary |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | F-6 blueprint: 5 runtime containers, BE 4-layer contracts (handler→service→repository→db), FE↔BE interaction, Redis disposable-cache policy, alignment-enforcement gates. |
| [FE_STATE.md](FE_STATE.md) | F-5 design: the 5 kinds of FE state and their single owners (TanStack Query / searchParams / RHF+Zod / Zustand / cookie session), cache & invalidation map, loading/error tiers, FE folder layout. |
| [BE_STATE.md](BE_STATE.md) | F-8 design: the 4 kinds of BE state and their single owners (MySQL / Redis / context / config — in-process mutable banned), request flow, transaction policy, error-code enum, validation tiers, BE folder layout. |
| [OVERALL_PLAN.md](OVERALL_PLAN.md) | F-9 master build plan: restaurant-platform product scope (4 surfaces, ~30 pages), BE domain/API/realtime plan, FE shells + page map, DevOps two-stage go-live, lessons register, phased roadmap reconciled with TASKS.md. |

## diagrams/ — visual companions (markdown wins on any conflict)

| File | Mirrors | Summary |
|---|---|---|
| [build-plan.html](diagrams/build-plan.html) | PLAN.md + TASKS.md | Owner's main dashboard: A→Z overview, task chips, findings, §Next-task report. |
| [architecture.html](diagrams/architecture.html) | ARCHITECTURE.md | Visual component/layer/interaction diagrams. |
| [fe-state-loading.html](diagrams/fe-state-loading.html) | FE_STATE.md | Visual state-ownership and loading-tier diagrams. |
| [design-system.html](diagrams/design-system.html) | — (F-7 deliverable) | Design system reference: tokens, button deep-dive, full component specimens, component→file→task map. |
| [task-F-2.html](diagrams/task-F-2.html) | TASKS.md row F-2 | Per-task visual plan page for F-2 (owner rule 2026-07-17). |
| [be-state-data.html](diagrams/be-state-data.html) | BE_STATE.md | Visual BE state-ownership, request-flow, transaction and error-code diagrams. |
| [task-F-8.html](diagrams/task-F-8.html) | TASKS.md row F-8 | Per-task visual plan page for F-8 (owner rule 2026-07-17). |
| [overall-plan.html](diagrams/overall-plan.html) | OVERALL_PLAN.md | Visual master plan: core loop, architecture, domain table, realtime design, DevOps pipeline, phase roadmap, open decisions. |
| [task-F-9.html](diagrams/task-F-9.html) | TASKS.md row F-9 | Per-task visual plan page for F-9 (owner rule 2026-07-17). |
