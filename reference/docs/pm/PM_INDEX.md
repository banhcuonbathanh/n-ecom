# PM Index — All Process Documents
> **Purpose:** Authoritative map of every process and AI-management document in this project.
> When you want to know HOW we work (not WHAT we're building), find it here.
> **Rule:** If you add a new process doc anywhere in the repo, add a row to this index.
> **Version:** v1.0 · 2026-04-30

---

## Task management (`docs/tasks/`) — NEW v1.0 · 2026-05-11

| File | Purpose | When to read |
|---|---|---|
| [../tasks/GUIDE.md](../tasks/GUIDE.md) | Task format rules, session sizing rule, ownership codes, start/end protocol | Before picking any new task |
| [../tasks/MASTER.md](../tasks/MASTER.md) | All tasks — phase overview + full pending task list with Owner, Deps, Sessions, Status | Every session — find next ⬜ task here |
| [../tasks/CURRENT.md](../tasks/CURRENT.md) | One active task — what is being worked on right now | Start + end of every session |
| [../tasks/TEMPLATE.md](../tasks/TEMPLATE.md) | Copy-paste templates for phases, tasks, sub-tasks, bug fixes, new features | When adding any new task row |

---

## Docs physically in this folder (`docs/pm/`)

| File | Purpose | When to read |
|---|---|---|
| [PROJECT_AI_MANAGEMENT.md](PROJECT_AI_MANAGEMENT.md) | Workflow quality audit, session management protocols, phase gates, AI prompting guide, decision log, recovery playbook | Start of every new phase; when something goes wrong |
| [HOW_CLAUDE_WORKS_HERE.md](HOW_CLAUDE_WORKS_HERE.md) | Plain-English explanation of the entire system — boot sequence, 7-step loop, signal prefix system, single-source-of-truth rule | Onboarding a new AI session; when Claude behavior is confusing |
| [SESSION_GUIDE.md](SESSION_GUIDE.md) | Per-session execution guide — which docs to give Claude for each task, dependency chain, blocker decisions | Start of any coding session |
| [CHANGE_REQUEST_PROCESS.md](CHANGE_REQUEST_PROCESS.md) | 6-step CR process — Minor/Medium/Major classification, impact assessment, sign-off workflow | Any time a requirement changes after SRS was approved |
| [PM_INDEX.md](PM_INDEX.md) | This file | When looking for any process doc |

### Prompt templates (`docs/pm/prompts/`)

| File | Purpose |
|---|---|
| [prompts/PROMPT_menu_page.md](prompts/PROMPT_menu_page.md) | Full Claude Code prompt for implementing `/menu` page (Next.js 14, React Query, cart store) |
| [prompts/PROMPT_order_tracking.md](prompts/PROMPT_order_tracking.md) | Full Claude Code prompt for implementing `/order/[id]` tracking page (SSE, progress bar, cancel flow) |
| [prompts/CLAUDE_CASESTUDY_PROMPTS.md](prompts/CLAUDE_CASESTUDY_PROMPTS.md) | Prompt patterns extracted from case studies — reusable Claude invocation templates |

---

## Process docs kept in their current location (cross-referenced — do not move)

These are too heavily referenced by path in `CLAUDE.md` and `IMPLEMENTATION_WORKFLOW.md` to relocate safely. They are listed here so this index is complete.

### Core workflow (docs/)

| File | Purpose | Why it stays here |
|---|---|---|
| [../IMPLEMENTATION_WORKFLOW.md](../IMPLEMENTATION_WORKFLOW.md) | 7-step quality loop detail — READ→PLAN→ALIGN→IMPLEMENT→SELF-REVIEW→TEST→DONE | Referenced by path in `CLAUDE.md` |
| [../TASKS.md](../TASKS.md) | Master task tracker — phase status, task queue, acceptance criteria, dependencies | Referenced by path in `CLAUDE.md`; living doc updated every session |

### Durable knowledge (docs/base/)

| File | Purpose | When to read |
|---|---|---|
| [../base/LESSONS_LEARNED_v3.md](../base/LESSONS_LEARNED_v3.md) | Session workflow philosophy, prefix signal system, known weaknesses, "one fact one home" architecture | When starting a new task; after any mistake to log the anti-pattern |

### Role guides — how each AI "role" operates (docs/claude/)

| File | Role | Read when |
|---|---|---|
| [../claude/CLAUDE_LEAD (1).md](../claude/CLAUDE_LEAD%20(1).md) | Tech Lead — architecture decisions, owns MASTER.docx and API_CONTRACT | Sprint planning; architecture questions |
| [../claude/CLAUDE_BE.md](../claude/CLAUDE_BE.md) | Backend Developer — package structure, auth patterns, working protocol | Starting any Phase 4 task |
| [../claude/CLAUDE_FE.md](../claude/CLAUDE_FE.md) | Frontend Developer — folder structure, state management rules, design tokens | Starting any Phase 5 task |
| [../claude/CLAUDE_SYSTEM.md](../claude/CLAUDE_SYSTEM.md) | System Developer — WebSocket hub, payment gateway integration | Tasks 4.4 and 4.5 |
| [../claude/CLAUDE_DB (1).md](../claude/CLAUDE_DB%20(1).md) | DB Developer — migration conventions, Redis key schema | Phase 1 and Phase 3 tasks |
| [../claude/CLAUDE_DEVOPS.md](../claude/CLAUDE_DEVOPS.md) | DevOps — Docker, Caddy, CI/CD pipeline | Phase 6 tasks |
| [../claude/CLAUDE_BA.md](../claude/CLAUDE_BA.md) | Business Analyst — spec ownership, cross-team communication | Phase 2 tasks; writing new specs |
| [../claude/TEAM_HANDBOOK (1).md](../claude/TEAM_HANDBOOK%20(1).md) | Team structure, ownership matrix, branch naming, PR checklist | Onboarding; resolving ownership disputes |
| [../claude/CLAUDE_CASESTUDY.md](../claude/CLAUDE_CASESTUDY.md) | Implementation patterns and reference code from case studies | When implementing a complex pattern for the first time |

### Case studies — learning by example (docs/archive/case_study/)

| File | Domain | Read when |
|---|---|---|
| [../case_study/BanhCuon_Auth_CaseStudy_EXPLAINED_v1_3_me.p.md](../case_study/BanhCuon_Auth_CaseStudy_EXPLAINED_v1_3_me.p.md) | Auth — login/refresh/logout flows, 9 real scenarios, RBAC, guest token | Before implementing any auth task (4.1-x) |
| [../case_study/BanhCuon_FE_CaseStudy_v1.0.md](../case_study/BanhCuon_FE_CaseStudy_v1.0.md) | Frontend — component patterns, state management examples | Before implementing Phase 5 tasks |
| [../case_study/BanhCuon_Products_CaseStudy_v1_1.md](../case_study/BanhCuon_Products_CaseStudy_v1_1.md) | Products — CRUD patterns, Redis caching examples | Before implementing task 4.2 |

### General process reference (docs/requirements/)

| File | Purpose | When to read |
|---|---|---|
| [../qui_trinh/BanhCuon_Project_Checklist.md](../qui_trinh/BanhCuon_Project_Checklist.md) | Detailed per-phase checklist with AC per task — older format, superseded by `TASKS.md` for status tracking but still useful for AC detail | Phase planning; verifying AC completeness |
| [../qui_trinh/Tong_Hop_Quy_Trinh_v2.md](../qui_trinh/Tong_Hop_Quy_Trinh_v2.md) | Generic e-commerce project process template (BA→TL→Dev→QA flow, SRS structure, testing phases) | Reference when setting up a new project from scratch; not BanhCuon-specific |

---

## What does NOT belong in this folder

| Type | Correct location | Example |
|---|---|---|
| Feature specs | `docs/spec/` | Spec1_Auth_Updated_v2.md |
| API / error contracts | `docs/contract/` | API_CONTRACT_v1.2.md |
| DB schema reference | `docs/task/` | BanhCuon_DB_SCHEMA_SUMMARY.md |
| Shared business facts (RBAC, rules, tokens) | `docs/core/MASTER_v1.2.md` | §3 RBAC hierarchy |
| Business requirements / SRS | `docs/requirements/` | BanhCuon_SRS_v1.md |
| Project entry point | repo root | CLAUDE.md |

---

*BanhCuon System · PM Index · v1.0 · 2026-04-30*
*Update this file whenever a process doc is added, moved, or retired.*
