# NEW PROJECT BOOTSTRAP GUIDE

> For any new project: replace `[PROJECT]`, `[STACK]`, `[TEAM]` placeholders throughout.
> Derived from BanhCuon `LESSONS_LEARNED_v3.md` · v1.0 · May 2026
> Visual: `docs/doc_structure/new_project_guide/new_project_boottrap_guide.excalidraw`

---

## Part 0 — My Commentary: What This System Is Actually About

> These are the real insights. Everything else in this guide flows from them.

### 0.1 The Core Problem (Why Docs Are Not Optional)

Claude's context **resets every session**. There is no persistent memory between conversations.
This means docs ARE Claude's long-term memory. The quality of your docs = the quality of Claude's output. If the spec is ambiguous, Claude will guess — and the guess will be wrong in production. If the CLAUDE.md is bloated, Claude will miss the important parts.

**The rule:** Every fact Claude needs must live in a document. If it is not written, Claude will invent it.

### 0.2 The Most Common Failure Mode (And How to Prevent It)

The single most expensive failure is: **code is written, tests pass, but the feature was never requested or was built wrong**.

This happens when:

- A task has no `spec_ref` → developer guesses the contract
- A spec has no SRS rule → business logic is invented
- An SRS feature is not in BRD scope → the team builds something nobody agreed to

The 4-level chain (BRD → SRS → Spec → Task) exists entirely to prevent this. Every task must trace back to an agreed-on business need. Break in chain = 🔴 STOP.

### 0.3 CLAUDE.md Per Member? No. Per Role + Subdirectory? Yes.

**Do NOT create one CLAUDE.md per person.** There is only one `CLAUDE.md` per directory.

**The correct pattern:**

```
/CLAUDE.md          ← project rules + current work (all roles, always loaded, <150 lines)
/be/CLAUDE.md       ← BE rules only (auto-loaded when working in /be/)
/fe/CLAUDE.md       ← FE rules only (auto-loaded when working in /fe/)
/infra/CLAUDE.md    ← DevOps rules only
```

Claude Code automatically reads CLAUDE.md from the current directory AND all parent directories. So a BE developer working in `/be/` gets: root CLAUDE.md + be/CLAUDE.md. No manual "read this file first" needed. Less noise per session. FE devs never see BE linter rules.

This is the most important structural improvement over the BanhCuon approach.

### 0.4 Claude Is the Implementer, Not the Designer

The system works best when:

- **Humans write** BRD, SRS, and Spec
- **Claude reads** Spec and implements

The moment Claude is asked to design the spec AND implement it in the same session, quality degrades. Claude will optimize for internal consistency, not for business requirements that exist in your head.

**The signal:** If Claude can't point to a specific spec section for what it's building → it's guessing.

### 0.5 Controlling Claude's Work Quality and Quantity

**Quality control (preventing wrong output):**

- Gate system: can't start without a complete spec (Gate 3)
- Self-review checklist: Claude checks its own work before marking done (Step 5)
- /handoff discipline: forces explicit summary → catches drift

**Quantity control (preventing runaway scope):**

- TASKS.md is the queue — nothing gets built without a task row
- Task rows require `spec_ref` → prevents scope creep
- Task size rule: one session = one independently verifiable unit
- No task row = no work. Period.

### 0.6 The /handoff Command Is the Single Most Important Habit

Without /handoff: every session starts from zero, loses context, risks re-doing work.
With /handoff: Claude updates Current Work, documents what was done, lists follow-ups.

Make it non-negotiable. End every session with /handoff. No exceptions.

### 0.7 How Knowledge Accumulates Over Time

Knowledge flows in one direction:

```
Bug/Pattern discovered in session
    → Claude or dev notes it
        → Gets added to LESSONS_LEARNED.md after phase
            → Next session Claude reads it
                → Bug doesn't repeat
```

The LESSONS_LEARNED doc is the only place for "things we discovered that aren't obvious from the code." Everything else is in the code or the spec.

---

## Part 1 — Team Roles and Claude Code Ownership

| Role      | What They Own                    | Claude File (auto-loaded)                    | Quality Gate Responsibility               |
| --------- | -------------------------------- | -------------------------------------------- | ----------------------------------------- |
| BA / PM   | BRD · SRS                        | `docs/claude/CLAUDE_BA.md` (ref from root)   | Gate 1 (scope) · Gate 2 (rules)           |
| Tech Lead | MASTER · Spec · TASKS            | `docs/claude/CLAUDE_LEAD.md` (ref from root) | Gate 3 (contract) · Gate 7 (phase review) |
| BE Dev    | `be/` handlers · services · repo | `be/CLAUDE.md` (auto-loaded)                 | Gate 5 self-review · `go build`           |
| FE Dev    | `fe/` components · pages · hooks | `fe/CLAUDE.md` (auto-loaded)                 | Gate 5 self-review · `npm run build`      |
| DevOps    | Docker · CI/CD · Caddyfile       | `infra/CLAUDE.md` (auto-loaded)              | Gate 6 (CI green)                         |

**One person can play multiple roles** — but must switch context explicitly. Example: if the Tech Lead is also the BE Dev, they use LEAD.md context when writing specs and be/CLAUDE.md context when implementing.

**Roles Claude Code does NOT replace:**

- BA/PM: deciding what to build and why
- Tech Lead: resolving conflicts, approving migrations, cross-cutting decisions
- End-user testing: Claude cannot test UX, only code correctness

---

## Part 2 — Document Architecture (3-Tier, Inherited from LESSONS_LEARNED)

```
TIER 1 — Session loader (Claude reads every session)
  /CLAUDE.md                    ← max 150 lines, pointers only, current work
  /be/CLAUDE.md                 ← BE-specific rules (<80 lines)
  /fe/CLAUDE.md                 ← FE-specific rules (<80 lines)
  /infra/CLAUDE.md              ← DevOps rules (<60 lines)

TIER 2 — Shared facts (read when needed, cross-cutting)
  docs/MASTER.md                ← §1 stack · §2 design tokens · §3 RBAC
                                   §4 biz rules · §5 realtime · §6 JWT · §7 errors
  docs/contract/API_CONTRACT.md ← all endpoints (table format, no prose)
  docs/contract/ERROR_CONTRACT.md ← error codes + respondError pattern
  docs/task/DB_SCHEMA.md        ← field names + types (SINGLE SOURCE)

TIER 3 — Domain specs (read only for current domain)
  docs/spec/Spec_1_auth.md
  docs/spec/Spec_2_products.md
  ...etc

  docs/be/BE_SYSTEM_GUIDE.md    ← BE primary guide: patterns · rules · DI
  docs/fe/FE_SYSTEM_GUIDE.md    ← FE primary guide: patterns · rules · state
  docs/fe/wireframes/           ← FE page wireframes (required before any FE task)

ORIGIN DOCUMENTS (read once at project start, never during coding)
  docs/qui_trinh/BRD_v1.md      ← WHY + WHO + scope
  docs/qui_trinh/SRS_v1.md      ← WHAT + rules + AC + NFR
  docs/qui_trinh/Project_Checklist.md ← AC per task
```

**The one rule: One fact, one home. No copies, only references.**

**Staleness rule (Weakness 3 from LESSONS_LEARNED):** Every Tier 2 and Tier 3 doc must have this line at the top:
```
> Last verified: YYYY-MM-DD against [spec version / migration / code commit]
```
At the end of each phase: open each spec → verify it still matches API_CONTRACT + DB_SCHEMA. If mismatch → ⚠️ FLAG before starting next phase.

**Enforcement (Weakness 2 — automated checks):**
```bash
# In scripts/audit.sh — run after every phase:
wc -l CLAUDE.md              # FAIL if > 150 lines
grep -r "localStorage" fe/src/  # FAIL if found (XSS risk)
go vet ./...                    # FAIL if any vet error
# Optional: scan for content appearing in > 1 doc (duplicate fact detector)
```
Pre-commit hook: `wc -l CLAUDE.md` → fail if > 150 lines.

| Type of Information             | Single Source             | Everywhere Else            |
| ------------------------------- | ------------------------- | -------------------------- |
| DB column definitions (DDL)     | `migrations/*.sql`        | `→ see migration file`     |
| Design tokens (colors, spacing) | `MASTER.md §2`            | `→ MASTER.md §2`           |
| RBAC roles + hierarchy          | `MASTER.md §3`            | reference only             |
| Business rules                  | `MASTER.md §4`            | reference only             |
| Error codes + format            | `ERROR_CONTRACT.md`       | reference only             |
| API endpoints                   | `API_CONTRACT.md`         | specs reference by section |
| Domain spec detail              | `docs/spec/Spec_N.md`     | nowhere else               |
| Current work / branch           | `CLAUDE.md §Current Work` | updated after /handoff     |
| Patterns discovered in bugs     | `LESSONS_LEARNED.md`      | sessions use via memory    |

---

## Part 3 — Per-Role Claude Session Procedure

### BA / PM — Session Protocol

> ⚠ Insight 0.4 applied: BA/PM output (BRD + SRS) is the INPUT for Tech Lead spec writing. Nothing gets specified or coded until this is done. Claude cannot replace this step — it does not know what the business needs unless you write it.

**Start:**

1. Read BRD Phase scope table — what is in scope for this phase?
2. Read SRS for the feature being specified — what rules exist?
3. Open `docs/TASKS.md` — are there any ⬜ tasks waiting for a spec?

**Work loop:**

```
Write/update BRD or SRS section
    → Gate 1 check: feature in scope?
    → Gate 2 check: rules numbered + AC defined?
    → Confirm: SRS section is complete BEFORE handing to Tech Lead
       (Tech Lead will not write a spec without numbered rules + AC — that is Gate 2)
    → Hand off to Tech Lead for spec creation
```

**End:**

- Update BRD/SRS `> Last verified: YYYY-MM-DD` line at top of file
- Note any features moved to backlog in BRD §Future Phases
- If any pattern was discovered (ambiguous rule caused rework, etc.) → note for LESSONS_LEARNED
- Run `/handoff` so next session loads correct context

**Quality gate (before marking your work done):**

- [ ] Every business rule has a number (BR-001, BR-002…)
- [ ] Every scenario has AC (given/when/then)
- [ ] Out-of-scope items explicitly listed
- [ ] No feature in the spec without a BRD scope entry
- [ ] Tech Lead confirmed SRS section is sufficient to write spec (Gate 2 passed)

---

### Tech Lead — Session Protocol

> ⚠ Insight 0.4 applied: Tech Lead writes specs. Claude reads specs and codes. Never ask Claude to design a spec and implement it in the same session — it will optimize for internal consistency, not business requirements.
>
> ⚠ Conflict rule (Weakness 1): When CLAUDE.md and TASKS.md disagree, **TASKS.md wins**. CLAUDE.md §Phase Status is a summary only — always update TASKS.md first.

**Start:**

1. Read `CLAUDE.md` — what's current work, what phase?
2. Read `docs/TASKS.md` — what's blocked, what's next?
3. Identify: am I writing a spec, reviewing a PR, or unblocking a dev?

**Work loop (spec writing):**

```
Read BRD §scope + SRS §rules for domain
    → Gate 3: write spec section (must have: endpoint table, state machine,
              request/response shape, validation rules, side effects, out-of-scope boundary)
    → STOP: is Gate 3 passed? (dev can implement with ZERO questions?)
       If NO → spec is incomplete → do not create task rows yet
    → Gate 4: decompose spec into task rows (split by behavior boundary, not file)
       Task size rule: if a task has 3+ distinct files OR will take >90 min → break into sub-tasks
       Signal for break: "this only works when 3 other tasks are also done" = too large
    → Add task rows to TASKS.md with spec_ref filled
    → Update API_CONTRACT.md immediately after any new endpoint is designed
```

**End:**

- Update `CLAUDE.md §Current Work` (summary only — detail in TASKS.md)
- Add `> Last verified: YYYY-MM-DD` to any spec section just written
- If any structural decision was made (auth strategy, error code, DB pattern) → log in MASTER.md §ADR
- If pattern discovered that prevents bugs → note for LESSONS_LEARNED
- Run `/handoff`

**Quality gate (before spec is ready for devs):**

- [ ] Every endpoint has: method · path · role · request · response · status · side effects
- [ ] Developer can implement with ZERO questions reading only this spec section
- [ ] Every task row has `spec_ref` pointing to a specific spec section
- [ ] FE task rows also have `draw_ref` pointing to a wireframe zone
- [ ] No task row created for a spec section that hasn't passed Gate 3
- [ ] API_CONTRACT.md updated with any new endpoint
- [ ] TASKS.md is authoritative — CLAUDE.md phase status matches (or TASKS.md wins if conflict)

---

### BE Developer — Session Protocol

**Start (in `/be/` directory):**

1. `be/CLAUDE.md` auto-loaded — BE rules, patterns, architecture layers
2. Root `CLAUDE.md` also loaded — phase status, commands
3. Read `docs/TASKS.md` — find next ⬜ BE task with all deps ✅

**Work loop (7 steps — no exceptions):**

```
① READ    — read spec section (spec_ref) + DB_SCHEMA + ERROR_CONTRACT
② PLAN    — identify files to create/modify, note dependencies
③ ALIGN   — flag ❓ CLARIFY for any ambiguity before writing a line
④ IMPLEMENT — code handler → service → repository (strict layer order)
⑤ SELF-REVIEW — mental audit: happy path · error path · auth · race condition · security
⑥ TEST    — go build ./... + run unit tests for new logic
⑦ DONE    — mark task ✅ in TASKS.md, update CLAUDE.md Current Work
```

**End:** Run /handoff. Note any discovered patterns for LESSONS_LEARNED.

**Quality gate checklist (Step 5 — mandatory):**

- [ ] Handler: no business logic — only bind, call service, respond
- [ ] Service: no gin imports, no direct DB calls
- [ ] Repository: uses sqlc queries only, no raw SQL unless documented
- [ ] Error codes: all from ERROR_CONTRACT, no invented codes
- [ ] Auth: middleware attached to route (not skipped)
- [ ] After any migration: `sqlc generate` run before writing any code using new columns
- [ ] No `.env` values hardcoded
- [ ] Middleware that needs external state (Redis, DB) receives it as a parameter — never as a global closure. Pattern: `AuthRequired(checker IsActiveChecker)` — verify interface at compile time (anti-pattern: middleware silently skips is_active check because it has no Redis access)
- [ ] Response field names match DB column names exactly — do not rename in JSON serialization. FE prepends storage URLs, BE returns relative paths (anti-pattern: `image_url` in response when DB column is `image_path`)
- [ ] HTTP method in route registration matches FE api.ts — verify both sides before committing. Use PATCH for partial updates, not PUT. (anti-pattern: FE calls `api.patch()` but BE registers `router.PUT()` → 404)
- [ ] If a filtered query exists (e.g. `ListProductsAvailable`), service layer MUST call that query, not the unfiltered version — even if both exist in sqlc output

---

### FE Developer — Session Protocol

**Start (in `/fe/` directory):**

1. `fe/CLAUDE.md` auto-loaded — FE rules, state layer rules, component patterns
2. Root `CLAUDE.md` also loaded — phase status
3. Read `docs/TASKS.md` — find next ⬜ FE task with all deps ✅

**Pre-task Step 0 (mandatory before any task rows):**

```
0a READ SPEC  — read domain spec end-to-end, mark every screen + data source
0b DRAW       — ASCII or Excalidraw wireframe, label every zone [ComponentName]
                Note data source per zone. Note interactions (button → which API)
0c DECOMPOSE  — 1 component = 1 task row. Shared components first, page.tsx last
0d ALIGN      — show wireframe to Tech Lead/user before writing code
```

**Work loop:** Same 7 steps as BE, but use FE quality gate below.

**End:** Run /handoff. If new UI pattern discovered, note for LESSONS_LEARNED.

**Quality gate checklist (Step 5 — mandatory):**

- [ ] Auth token: Zustand store only — never localStorage, never sessionStorage
- [ ] Server state: TanStack Query — no useState for API data
- [ ] Form: RHF + Zod — no manual validation logic
- [ ] Colors: design token classes only — no hex strings in className
- [ ] API calls: through `lib/api-client.ts` — never raw fetch/axios
- [ ] After adding new pages/components: `docker compose up -d --build fe` (Tailwind JIT scans at build time — new classes won't exist in old image)
- [ ] Admin pages call admin/manager-only endpoints, NOT public endpoints. Public endpoints filter by `is_available=1` or similar — admin needs all records. (anti-pattern: admin product list calls `GET /products` which hides unavailable items)
- [ ] HTTP method in api.ts matches BE route registration — PATCH vs PUT, verify both files before PR. (anti-pattern: FE uses `api.patch()` but BE registered `router.PUT()` → all edit calls return 404)
- [ ] WS/SSE event payload: grep the actual BE publish/marshal code to verify field names — do not trust spec alone. Spec and impl can drift. (anti-pattern: spec says `payment_id` in event, BE publishes `order_id` only → compile error in FE handler)

---

### DevOps — Session Protocol

> ⚠ Insight 0.1 applied: If infra config isn't documented in the task or spec, Claude will guess port numbers, service names, and env var names. Write the infra spec (compose service name, Caddy route, required env vars) before opening a DevOps Claude session.

**Start (in `/infra/` directory):**

1. `infra/CLAUDE.md` auto-loaded — compose, Caddy, CI/CD rules
2. Root `CLAUDE.md` for phase status
3. Read task row in `docs/TASKS.md` — what service/config is being added?

**Work loop:**

```
① READ     — read infra task + any relevant spec section for the service
② PLAN     — identify: compose service name, ports, env vars, Caddy route, CI job
③ ALIGN    — ❓ CLARIFY if any env var name or port is ambiguous (don't guess)
④ IMPLEMENT — write/update Docker, Caddyfile, CI workflow, .env.example
⑤ TEST     — docker compose up -d → verify all services healthy + Caddy routes work
⑥ DONE    — mark task ✅, update CLAUDE.md
```

**End:**

- Update `infra/CLAUDE.md` if new pattern was established (new service naming convention, new CI pattern)
- If migration tooling workaround was needed (e.g., goose not in container → raw SQL fallback) → note in LESSONS_LEARNED
- Run `/handoff`

**Quality gate:**

- [ ] No secrets in compose files — all via `.env` (never committed)
- [ ] `.env.example` updated with any new env var (with placeholder value, not real value)
- [ ] All services have healthcheck defined
- [ ] Caddyfile reverse proxy routes verified (correct upstream host:port)
- [ ] Every migration file has both `-- +goose Up` and `-- +goose Down` sections
- [ ] CI workflow: build and test run on PR, not just on merge to main
- [ ] FE Docker image rebuilt after any new page/component added (`docker compose up -d --build fe`)

---

## Part 4 — Doc Interaction and Knowledge Flow

### Who Writes What

| Doc             | Written By                  | Read By                | Updated When                |
| --------------- | --------------------------- | ---------------------- | --------------------------- |
| BRD             | BA + Owner                  | Everyone (once)        | New phase scope agreed      |
| SRS             | BA + Tech Lead              | Lead + Claude (Step 1) | New business rule added     |
| MASTER.md       | Tech Lead                   | All Claude sessions    | Any shared rule changes     |
| API_CONTRACT    | Tech Lead (BE proposes)     | BE Dev + FE Dev        | Each new endpoint           |
| ERROR_CONTRACT  | Tech Lead                   | BE + FE Claude         | New error domain added      |
| DB_SCHEMA       | Tech Lead (from migrations) | All devs               | After each migration        |
| Spec N          | Tech Lead                   | Dev + Claude           | Per domain feature          |
| be/CLAUDE.md    | Lead + BE Dev               | BE Claude (auto)       | New BE pattern found        |
| fe/CLAUDE.md    | Lead + FE Dev               | FE Claude (auto)       | New FE pattern found        |
| TASKS.md        | Lead / Lead Dev             | Dev + Claude           | After every task done/start |
| LESSONS_LEARNED | All (via Lead)              | Future sessions        | Post-phase retrospective    |
| CLAUDE.md root  | Lead                        | All Claude             | After /handoff              |

### Update Triggers (When to Update Each Doc)

| Trigger                      | Update These Docs                                       |
| ---------------------------- | ------------------------------------------------------- |
| New business rule identified | SRS → MASTER.md §4 → relevant Spec section              |
| New API endpoint designed    | API_CONTRACT → Spec section for that domain             |
| Migration file added/changed | DB_SCHEMA.md (run sqlc generate first)                  |
| Bug found in session         | Note pattern → LESSONS_LEARNED at phase end             |
| New BE pattern discovered    | be/CLAUDE.md                                            |
| New FE pattern discovered    | fe/CLAUDE.md                                            |
| Task completed               | TASKS.md status → CLAUDE.md Current Work (via /handoff) |
| Phase ends                   | Full reconciliation: spec vs API_CONTRACT vs code vs DB |

### Staleness Prevention

Every Tier 2 and Tier 3 doc should have at the top:

```markdown
> Last verified: YYYY-MM-DD against [what]
```

At the end of each phase:

1. Open each spec → verify it still matches API_CONTRACT and DB_SCHEMA
2. If mismatch → update spec OR raise ⚠️ FLAG before starting next phase work

---

## Part 5 — Day 0 Bootstrap Sequence (New Project)

> Spend Day 0-1 on steps 1-9. Do NOT write code until step 9 is done.

### Step 1: Decide (Before Any Files)

- [ ] Define team roles (who is BA, who is Lead, who is BE/FE/DevOps)
- [ ] Define tech stack (BE language/framework, FE framework, DB, cache, infra)
- [ ] Define phases (what is Phase 1 vs Phase 2 vs Phase 3)
- [ ] Define user roles (RBAC — who can do what)

### Step 2: Create Folder Structure

```bash
mkdir -p docs/{spec,contract,task,qui_trinh,be,fe/wireframes,base,onboarding,claude,doc_structure}
mkdir -p be/{cmd/server,internal/{db,handler,service,repository,middleware},migrations,query,pkg}
mkdir -p fe/src/{app,components/ui,features,hooks,lib,store,types}
mkdir -p infra scripts
touch CLAUDE.md be/CLAUDE.md fe/CLAUDE.md infra/CLAUDE.md
touch docs/TASKS.md docs/MASTER.md docs/IMPLEMENTATION_WORKFLOW.md
touch docs/contract/API_CONTRACT.md docs/contract/ERROR_CONTRACT.md
touch docs/task/DB_SCHEMA.md docs/base/LESSONS_LEARNED.md
```

### Step 3: Write MASTER.md First (9 Sections)

```markdown
# MASTER.md

§1 Tech Stack + Architecture Decisions
§2 Design Tokens (colors, spacing — single source)
§3 RBAC (roles, hierarchy, permissions)
§4 Business Rules (numbered BR-001, BR-002...)
§5 Realtime (SSE/WS config, reconnect strategy)
§6 Auth (JWT config, token strategy, refresh pattern)
§7 Error Codes (format, code list)
§8 API Conventions (versioning, request/response shape)
§9 ADR (Architecture Decision Records — key decisions with rationale)
```

### Step 4: Write Root CLAUDE.md (Lean — Max 150 Lines)

Template:

```markdown
# CLAUDE.md

> TẦNG 1 — Map only, <150 lines. NO spec, schema, or business rules here.
> Rule: /handoff updates §Current Work after every session.

## Claude Workflow

Commands: /handoff to close · /doc-check for audit
Every task: READ → PLAN → ALIGN → IMPLEMENT → SELF-REVIEW → TEST → DONE

| File                            | Purpose                   |
| ------------------------------- | ------------------------- |
| docs/TASKS.md                   | Master task list          |
| docs/MASTER.md                  | Shared architecture facts |
| docs/IMPLEMENTATION_WORKFLOW.md | 7-step process detail     |
| docs/base/LESSONS_LEARNED.md    | Session guide + patterns  |

## Project Overview

[PROJECT]: [one-line description]

- Backend: [STACK]
- Frontend: [STACK]
- Infra: [STACK]

## Phase Status

| Phase                  | Status | Blocking |
| ---------------------- | ------ | -------- |
| Phase 0 — Architecture | ⬜     | —        |

## Commands

[project-specific commands]

## Architecture

[2-3 line summary of layers]

## Current Work

- Status: Phase 0 starting
- Branch: main
- Next: Write MASTER.md and BRD
```

### Step 5: Write Role-Specific CLAUDE Files

**`be/CLAUDE.md` template:**

```markdown
# BE CLAUDE.md — [PROJECT] Backend

> Auto-loaded when working in /be/ directory. BE rules only.
> Combines with root CLAUDE.md.

## Architecture Layers (strict order)

handler → service → repository → db (sqlc generated)

- Handler: bind request, call service, respond — NO business logic
- Service: business logic — NO gin imports, NO direct DB
- Repository: sqlc wrappers + transaction helpers only

## Key Rules

- After any migration: run `sqlc generate` before writing code
- Error codes: always from ERROR_CONTRACT.md
- Auth: middleware wraps routes — never skip
- Soft delete: always filter is_deleted=false in queries
- [PROJECT-SPECIFIC rules here]

## Entry Point for Tasks

Read BE_SYSTEM_GUIDE.md before any task. Spec for current domain only.
```

**`fe/CLAUDE.md` template:**

```markdown
# FE CLAUDE.md — [PROJECT] Frontend

> Auto-loaded when working in /fe/ directory. FE rules only.

## State Layers (strict)

- Server state: TanStack Query
- Client state: Zustand
- Forms: RHF + Zod
- API calls: lib/api-client.ts ONLY

## Key Rules

- Auth token: Zustand store ONLY — never localStorage
- No hex colors in className — use design token classes
- After adding pages: rebuild Docker image (Tailwind JIT)
- FE tasks need wireframe (draw_ref) before starting
- [PROJECT-SPECIFIC rules here]

## Entry Point for Tasks

Read FE_SYSTEM_GUIDE.md + wireframe for current feature first.
```

### Step 6: Write API Contract + DB Migrations

- Write `docs/contract/API_CONTRACT.md` — all planned endpoints as a table
- Write `docs/contract/ERROR_CONTRACT.md` — error codes + format
- Write first migrations (`be/migrations/001_*.sql`) — DDL is the real design
- Write `docs/task/DB_SCHEMA.md` — overview of tables (no DDL, reference migrations)

### Step 7: Write BRD + SRS

- BRD: WHY + WHO + what is Phase 1 scope
- SRS: numbered business rules (BR-001...) + AC + NFR
- These are the source of truth for specs. Write them carefully. Never rush.

### Step 8: Write First Spec (Gate 1-3 Checklist)

For each spec section, verify before writing task rows:

```
Gate 1 (SCOPE):
□ Feature in BRD Phase 1 scope?
□ User roles defined?

Gate 2 (RULES):
□ SRS has numbered rules for this feature?
□ AC defined (given/when/then)?

Gate 3 (CONTRACT):
□ Endpoint table: method · path · role · request · response · status · side effects
□ State machine (if stateful): all transitions + conditions
□ Field names verified in DB_SCHEMA.md?
□ Dev can implement with ZERO guessing?

Gate 4 (SPLIT):
□ One domain per section?
□ One protocol per section (not SSE + WS together)?
```

### Step 9: Write First Task Rows (Gate 4 Checklist)

```
For ALL tasks:
□ Has spec_ref pointing to exact spec section?
□ All dependencies ✅?
□ Independently verifiable (go build or npm build proves it alone)?
□ Description specific enough to know when "done"?

For FE tasks (extra):
□ Step 0 complete (spec read, wireframe drawn, decomposed, aligned)?
□ draw_ref filled (wireframe file + zone)?
```

---

## Part 6 — Bootstrap Prompt for Claude Code (Copy-Paste)

Use this prompt at the start of a new project to have Claude Code set up the document structure:

```
I'm starting a new project called [PROJECT_NAME].

Tech stack:
- Backend: [e.g. Go 1.24, Gin, sqlc, MySQL 8.0, Redis]
- Frontend: [e.g. Next.js 14 App Router, TypeScript, Tailwind, Zustand, TanStack Query]
- Infra: [e.g. Docker Compose, Caddy, GitHub Actions]

Team roles:
- BA/PM: [name or "me"]
- Tech Lead: [name or "me"]
- BE Dev: [name or "me"]
- FE Dev: [name or "me"]
- DevOps: [name or "me"]

Phase 1 scope: [list 4-6 core features]
User roles (RBAC): [e.g. customer, staff, manager, admin]

Please bootstrap the project using the NEW_PROJECT_BOOTSTRAP_GUIDE at
docs/doc_structure/NEW_PROJECT_BOOTSTRAP_GUIDE.md.

Run the Day 0 Bootstrap Sequence (Part 5) in order:
1. Create the full folder structure (Step 2)
2. Create CLAUDE.md root with our tech stack filled in (Step 4)
3. Create be/CLAUDE.md and fe/CLAUDE.md from templates (Step 5)
4. Create MASTER.md with the 9 section headers (Step 3)
5. Create blank API_CONTRACT.md, ERROR_CONTRACT.md, DB_SCHEMA.md (Step 6)
6. Create docs/TASKS.md with Phase 0 task rows
7. Create docs/IMPLEMENTATION_WORKFLOW.md (7-step process)
8. Create the onboarding docs for each role in docs/onboarding/

Do NOT write any spec or code yet. Just the foundation documents.
```

---

## Part 7 — Quality Gates Summary (8 Checkpoints)

| Gate | Name         | Owner      | Checks                                | Blocks What         |
| ---- | ------------ | ---------- | ------------------------------------- | ------------------- |
| G1   | SCOPE        | BA/PM      | Feature in BRD Phase 1?               | Spec creation       |
| G2   | RULES        | BA + Lead  | SRS has numbered rules + AC?          | Spec creation       |
| G3   | CONTRACT     | Tech Lead  | Spec section complete (all fields)?   | Task creation       |
| G4   | VERIFY       | Dev + Lead | Task independently verifiable?        | Implementation      |
| G5   | SELF-REVIEW  | Claude     | 8-point checklist passes?             | Marking done        |
| G6   | CI/CD        | Automated  | Build + lint + tests green?           | Merge to main       |
| G7   | PHASE REVIEW | Tech Lead  | All tasks ✅, docs reconciled?        | Next phase start    |
| G8   | LESSONS      | Team       | Patterns captured in LESSONS_LEARNED? | Project memory loss |

**G5 — Claude Self-Review Checklist (applies to all implementations):**

```
□ Happy path: does the core case work?
□ Error path: what happens when input is wrong, DB fails, or service is down?
□ Auth: is the correct role enforced?
□ Race condition: is there any shared state that could conflict?
□ Security: SQL injection, XSS, HMAC verify, amount verify?
□ Duplicate: is idempotency handled for non-idempotent operations?
□ Side effects: are all spec-listed side effects implemented?
□ Docs: does the implementation match the spec contract?
```

---

## Part 8 — How to Update Knowledge Over Time

### Session-Level (every session)

- `/handoff` updates CLAUDE.md Current Work
- Claude notes any discovered patterns or bugs in its response

### Phase-Level (at phase end)

- Tech Lead runs a reconciliation pass: spec vs API_CONTRACT vs code vs DB
- Any discovered pattern added to `LESSONS_LEARNED.md` with context
- "Last verified" dates updated on all Tier 2/3 docs

### Project-Level (at milestones)

- Run `/doc-check` to audit for stale docs
- Major architectural decisions go into MASTER.md §9 ADR
- LESSONS_LEARNED becomes the input for the NEXT project's bootstrap

### Rule: LESSONS_LEARNED gets a new entry when

1. A bug was found that a rule would have prevented
2. A pattern is discovered that speeds up implementation
3. A weakness in the workflow is identified with a mitigation
4. An anti-pattern is confirmed by two or more incidents

**What NOT to put in LESSONS_LEARNED:**

- Code snippets (those live in the code)
- Decisions that are already in MASTER.md ADR
- Task-specific context (that lives in the task description)
- Anything that's "obvious from reading the code"

---

## Appendix A — File Templates Checklist

When bootstrapping a new project, create these files in order:

```
Priority 1 (Day 0 — before any code):
□ CLAUDE.md root                         ← lean, <150 lines
□ be/CLAUDE.md                           ← BE rules
□ fe/CLAUDE.md                           ← FE rules
□ docs/MASTER.md                         ← 9 sections
□ docs/TASKS.md                          ← task list (start with Phase 0 tasks)
□ docs/IMPLEMENTATION_WORKFLOW.md        ← 7-step process
□ docs/base/LESSONS_LEARNED.md           ← start with this guide's lessons

Priority 2 (Day 1 — before any spec):
□ docs/contract/API_CONTRACT.md          ← endpoint tables
□ docs/contract/ERROR_CONTRACT.md        ← error codes
□ docs/task/DB_SCHEMA.md                 ← field names (after migrations written)
□ docs/qui_trinh/BRD_v1.md              ← WHY + scope
□ docs/qui_trinh/SRS_v1.md              ← WHAT + rules + AC

Priority 3 (Day 2+ — before any implementation):
□ docs/be/BE_SYSTEM_GUIDE.md            ← BE patterns + epics
□ docs/fe/FE_SYSTEM_GUIDE.md            ← FE patterns + epics
□ docs/spec/Spec_1_[domain].md          ← first domain spec (after BRD+SRS done)

Priority 4 (per onboarding):
□ docs/onboarding/LEAD.md
□ docs/onboarding/BE_DEV.md
□ docs/onboarding/FE_DEV.md
□ docs/onboarding/DEVOPS.md
```

---

## Appendix B — The 3 Rules to Remember

If you forget everything else, remember these:

### Rule 1 — "One Fact, One Home"

Every piece of information has exactly one authoritative location. Everything else is a reference (`→ see MASTER.md §4`).

### Rule 2 — "CLAUDE.md Is a Map, Not a Territory"

CLAUDE.md root must stay under 150 lines. It points to where things live. It does not contain what they say.

### Rule 3 — "No Spec, No Task. No Task, No Code."

The chain is: BRD → SRS → Spec → Task → Code. Skip any link = wrong thing built.
Every task must have a `spec_ref`. Every spec must trace to an SRS rule. Every SRS rule must trace to BRD scope.

---

_Visual reference: `docs/doc_structure/team_claude_workflow.excalidraw`_
_Knowledge source: `docs/base/LESSONS_LEARNED_v3.md`_
_v1.0 · May 2026 · Derived from BanhCuon project retrospective_

What was created
NEW_PROJECT_BOOTSTRAP_GUIDE.md (26KB) — The complete reusable playbook:

Part 0: My commentary — the real insights behind why the system works
Part 1: Team roles + Claude file ownership table
Part 2: 3-tier document architecture
Part 3: Per-role session procedure (BA / Lead / BE / FE / DevOps)
Part 4: Doc interaction + knowledge flow (who writes, who reads, update triggers)
Part 5: Day 0 bootstrap sequence (9 steps, folder structure, file templates)
Part 6: Copy-paste bootstrap prompt for Claude Code
Part 7: 8 quality gates summary
Part 8: How knowledge accumulates over time
team_claude_workflow.excalidraw (51KB) — 5-frame visual diagram:

Team Structure + doc ownership (with the subdirectory CLAUDE.md insight)
4-Level Doc Chain (BRD→SRS→Spec→Task) with gates
Session Loop + Self-Review checklist + prefix system
Day 0 Bootstrap Sequence (4-block grid)
8 Quality Gates (color coded: blue=human / orange=Claude / green=auto)
My key thinking (the things not obvious from just reading docs)
CLAUDE.md per subdirectory, not per person. This is the biggest structural improvement. Claude Code auto-loads CLAUDE.md from current dir upward — so be/CLAUDE.md loads automatically for BE work, fe/CLAUDE.md for FE work. No "read this file first" instructions. Less noise = better output.

Claude is the implementer, not the designer. When Claude writes the spec AND codes it in the same session, quality degrades — it optimizes for internal consistency, not business requirements. Humans write BRD/SRS. Claude reads specs and codes.

Docs are Claude's only long-term memory. Context resets every session. If a rule isn't written, Claude invents it. The entire doc architecture exists to ensure Claude never has to guess.

Quality is built-in at each step, not added at the end. The 8-gate system prevents "code is done but wrong thing built" — the most expensive failure. Gate 1 catches it at scope, Gate 3 at spec, Gate 5 at self-review. Code review (Gate 7) is a safety net, not the primary mechanism.

/handoff is the single most important habit. Without it, every session starts from zero.
