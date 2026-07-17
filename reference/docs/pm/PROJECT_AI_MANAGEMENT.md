# Project & AI Management Guide
> **Audience:** Project owner — you, working with Claude Code on this codebase.
> **Purpose:** One document that covers (1) an honest quality audit of the existing workflow,
> (2) how to run sessions effectively, (3) how to manage Claude as a senior AI coworker,
> and (4) operational protocols missing from the current system.
> **Version:** v1.0 · 2026-04-30
> **Location:** `docs/pm/` — this folder is for project management and AI management only.
> No specs, no schema, no business rules here.

---

## Part 1 — Workflow Quality Audit

An honest assessment of the existing system before adding anything to it.

### What the existing system does well

| Strength | Where it lives | Why it matters |
|---|---|---|
| 7-step loop (READ→PLAN→ALIGN→IMPLEMENT→SELF-REVIEW→TEST→DONE) | `IMPLEMENTATION_WORKFLOW.md` | Prevents the most common failure mode: coding before reading the spec |
| 3-layer document hierarchy | `CLAUDE.md` + `HOW_CLAUDE_WORKS_HERE.md` | One fact, one home — changes propagate from one place |
| Prefix signal system (💡/⚠️/🚨/🔴/❓/🔄) | `LESSONS_LEARNED_v3.md §0.3` | You know immediately how seriously to read any Claude output |
| Self-review security checklist | `IMPLEMENTATION_WORKFLOW.md §Step 5` | Catches JWT confusion, HMAC bypass, localStorage tokens before they ship |
| Dependency-ordered task queue | `docs/TASKS.md` | No phase starts before its prerequisite; clear unlock chain |
| Known weaknesses documented | `LESSONS_LEARNED_v3.md §0.6` | The system is self-aware — rare and valuable |

### Gaps identified (with severity)

The following are missing from the current system. Each gap has a severity and a fix defined later in this document.

| # | Gap | Severity | Effect if unresolved |
|---|---|---|---|
| G1 | No `/handoff` template — the command is referenced but never defined | High | Session context is lost between conversations; next session re-derives what was done |
| G2 | No phase quality gate — what exactly must be true before Phase N unblocks Phase N+1 | High | You may start Phase 4 with Phase 3 technically "done" but subtly broken |
| G3 | No decision log — when you override a 🔴 STOP or resolve a ⚠️ FLAG, nowhere records why | Medium | The same flag is raised again next session; Claude doesn't know the decision was made |
| G4 | No session sizing guide — no guidance on how much to put in one session | Medium | Sessions run over, tasks finish half-done, context gets stale mid-task |
| G5 | No recovery protocol — what to do when Claude drifts, makes a security mistake, or produces wrong output | Medium | You either restart from scratch (wasteful) or try to patch (risky) |
| G6 | No AI prompting guide — `/start [feature]` is the entry point but no guidance on what makes a good vs. bad prompt | Medium | Claude starts sessions with ambiguous scope and asks unnecessary clarifying questions |
| G7 | No context window management — no guidance on when to start fresh vs. continue | Low | Long sessions produce slower, less accurate responses as context fills |
| G8 | Duplicate phase status (CLAUDE.md + TASKS.md) — acknowledged in LESSONS_LEARNED but not eliminated | Low | Acknowledged; TASKS.md wins when they disagree |
| G9 | TEST step is under-specified — "go build" is the minimum, but what does "sufficient" look like per phase | Low | Phase passes TEST without verifying the features that matter |

---

## Part 2 — Session Management

### 2.1 Session start (every session)

Do this before typing anything else. It takes 3 minutes and prevents wasted work.

```
1. Read CLAUDE.md → Current Work section
   → Know what was finished last session and what comes next
   → If Current Work is stale (no update in > 2 sessions), run a quick state check first

2. Open docs/TASKS.md → find the first ⬜ with all dependencies ✅
   → If everything in the next phase is blocked, identify the blocker first

3. Check the DECISION LOG (Part 5 of this doc) for any open decisions
   → If a decision is needed before work can proceed, resolve it before starting

4. Size the session (see §2.2 below)
   → State the scope explicitly: "Today we're doing tasks 4.1-1 through 4.1-3"
```

### 2.2 Session sizing guide (gap G4 fix)

The goal is one session = one releasable unit. A releasable unit is something that can be marked ✅ in TASKS.md and leaves the codebase in a working state.

**Size a session around one of these:**
- One complete sub-task (e.g., 4.1-3: auth_repo.go — single file, single concern)
- One acceptance criteria block (e.g., 4.1-AC: all auth AC verified)
- One phase boundary (e.g., run sqlc generate + verify field names = P3-1 + P3-2)

**Split the session when:**
- The task touches more than 3 files that each require separate reasoning
- The task crosses two service layers (e.g., repository + service + handler in one go)
- Any step involves payment code — always one session per payment component
- You are past the 2/3 mark in the conversation and a new major task is coming

**Never do in one session:**
- An entire phase (too large — partial completion leaves the codebase broken mid-phase)
- Two unrelated features (context pollutes reasoning on the second task)
- A large task and a review/debug task (different modes of thinking)

### 2.3 Session close — `/handoff` template (gap G1 fix)

Run `/handoff` at the end of every session. Claude should produce output in this exact format. If it does not, ask for it explicitly.

```markdown
## Handoff — [Date] · [Task IDs completed]

### Done this session
- [Task ID] [File path]: [one sentence what was built]
- [Task ID] [File path]: [one sentence what was built]

### Tests run
- [command]: [result — passed / failed / skipped + reason]
- If skipped: exact commands to run later

### Open items
- [any 🔴 STOP or ⚠️ FLAG raised but not resolved — must be in Decision Log]
- [any follow-up tasks discovered — must be added to TASKS.md]

### State of the codebase right now
- `go build ./...`: [passes / fails — state the error if fails]
- Last ✅ task in TASKS.md: [ID]
- Next ⬜ task: [ID] — [dependency status]

### TASKS.md updated: [yes/no]
### CLAUDE.md Current Work updated: [yes/no]
```

Both TASKS.md and CLAUDE.md Current Work must be updated before the session is considered closed. If Claude does not update them, do it yourself — stale state is the root cause of wasted sessions.

---

## Part 3 — Phase Quality Gates (gap G2 fix)

Each phase has a specific gate condition. The next phase does not start until every item in the gate is checked.

### Gate: Phase 1 → Phase 3 (migrations must be solid before sqlc)

- [ ] All migration files exist: 001 through 008
- [ ] `goose -dir be/migrations mysql "$DB_DSN" up` runs without error
- [ ] `goose -dir be/migrations mysql "$DB_DSN" status` shows all UP
- [ ] No pending migration rows in schema_migrations table

### Gate: Phase 3 → Phase 4 (sqlc must be solid before backend)

- [ ] `sqlc generate` runs without error
- [ ] `be/internal/db/` directory exists with: `db.go`, `models.go`, `querier.go`, and query files
- [ ] All generated struct field names verified against `docs/be/DB_SCHEMA_SUMMARY.md`
- [ ] Specifically confirmed: `price` (not `base_price`), `image_path` (not `image_url`), `created_by` (not `staff_id`), `gateway_data` (not `webhook_payload`), payment status `completed` (not `success`)
- [ ] `go build ./...` passes from project root

### Gate: Phase 4.1 → Phase 4.2 (auth must work before products)

- [ ] `go build ./...` zero errors
- [ ] Login returns an access token (manual curl or unit test)
- [ ] Wrong password returns same error as wrong username (no enumeration)
- [ ] 6th login attempt returns 429
- [ ] Refresh token flow works (POST /refresh returns new access token)
- [ ] Auth middleware rejects requests with no token (401)
- [ ] Auth middleware rejects requests with expired token (401)
- [ ] is_active=false account returns 401 `ACCOUNT_DISABLED`

### Gate: Phase 4 → Phase 5 (backend must be stable before frontend)

- [ ] All Phase 4 tasks are ✅ in TASKS.md
- [ ] `go build ./...` zero errors
- [ ] `docker compose up -d` starts all services without error
- [ ] `/health` endpoint returns 200
- [ ] Auth endpoints work (curl test: login → token → me)
- [ ] At minimum one product is visible from `GET /products` (requires seed data)

### Gate: Phase 5 → Phase 7 (frontend must be stable before testing)

- [ ] `npm run build` zero TypeScript errors
- [ ] No token found in localStorage after login (DevTools check)
- [ ] Login → role-based redirect works for at least chef and cashier roles
- [ ] Menu page loads products from API (not mock data)
- [ ] Cart add + checkout flow completes without runtime error

### Gate: Phase 6 (DevOps — can run in parallel with Phase 4)

- [ ] `docker compose up -d` brings up all 5 services (mysql, redis, backend, frontend, caddy)
- [ ] All services pass health checks
- [ ] `.env.example` covers all variables in `MASTER_v1.2.md §9`
- [ ] `scripts/migrate.sh` waits for MySQL and runs goose correctly
- [ ] Caddyfile routes `/api/*` to backend and everything else to frontend

---

## Part 4 — AI Management Protocols

### 4.1 How to write an effective `/start` prompt (gap G6 fix)

A good `/start` prompt has four parts. Write them in this order.

```
/start [feature]

Context: [what was done last session in 1-2 sentences — don't make Claude re-derive it]
Scope today: [exact task IDs from TASKS.md you want to finish]
Constraint: [any decision from the Decision Log that Claude should know about]
Stop at: [explicit stopping point — "stop after auth_repo.go, don't start auth_service yet"]
```

**Good example:**
```
/start auth-backend

Context: sqlc generate was run last session, be/internal/db/ exists and field names verified.
Scope today: tasks 4.1-1 (redis/pubsub.go), 4.1-2 (redis/bloom.go), 4.1-3 (auth_repo.go only).
Constraint: max 5 sessions per staff enforced at Login time, not token creation time (Decision D-003).
Stop at: finish auth_repo.go. Do not start auth_service.go — that's next session.
```

**Bad example:**
```
/start auth
```
This forces Claude to read all auth specs, derive the current state, guess the scope, and ask clarifying questions before any work happens. That costs 10–15 minutes of re-derivation every session.

### 4.2 How to handle Claude's flags

Each flag type has a specific expected response from you. Not responding correctly causes the session to stall or the flag to recur.

| Claude says | What it means | Your correct response |
|---|---|---|
| `💡 SUGGESTION` | Optional improvement Claude noticed | Read and decide: "yes apply it" / "no, skip" / "add to TASKS.md for later" |
| `⚠️ FLAG` | Two docs conflict, spec is ambiguous | Resolve it: "use MASTER_v1.2.md §4 as truth" / "update ERROR_CONTRACT" — then record in Decision Log |
| `🚨 RISK` | Bug or security hole in the current approach | Stop and read carefully. Either: fix the approach, or consciously accept the risk and log it in Decision Log with your reasoning |
| `🔴 STOP` | Claude refuses to continue | Mandatory stop. Resolve the blocking issue. Do not ask Claude to "just do it anyway" — this always produces a worse outcome |
| `❓ CLARIFY` | Claude needs information to proceed | Answer specifically. If you don't know, say "make a reasonable decision and document the assumption in the Decision Log" |
| `🔄 REDIRECT` | Claude sees a better direction | Evaluate the trade-off. Either confirm the redirect or explain why to stay the course — Claude will accept both |

### 4.3 Recovery protocol — when Claude produces wrong output (gap G5 fix)

Recognize the failure mode first, then apply the right recovery.

**Failure mode 1: Wrong field names / wrong error codes**
- Symptom: Claude writes `base_price`, `image_url`, or returns `AUTH_ERROR` instead of `AUTH_001`
- Recovery: Do not ask Claude to "fix it". Point to the source: "Read `BanhCuon_DB_SCHEMA_SUMMARY.md` and `ERROR_CONTRACT_v1.1.md` and rewrite the affected file."
- Prevention: Make sure Step 1 READ was done. Ask Claude to quote the relevant field names from the schema before writing any query.

**Failure mode 2: Layer violation (business logic in handler)**
- Symptom: Database queries or business rules inside a handler function
- Recovery: "Move all logic below this line to a service function. The handler should only call `service.X()` and return the result."
- Prevention: At ALIGN step, have Claude write out the function signatures for handler, service, and repository before implementing any of them.

**Failure mode 3: Security rule violation (token in localStorage, missing HMAC check)**
- Symptom: `localStorage.setItem('token', ...)` or webhook handler reads payload before verifying signature
- Recovery: This is a 🚨 RISK — stop immediately. Ask Claude to explain where in the code the violation is, then rewrite only that section. Do not patch around it.
- Prevention: Self-review checklist (Step 5) must be run explicitly. Ask Claude: "Run through the Step 5 security checklist before showing me the code."

**Failure mode 4: Spec drift (Claude invents a behavior not in the spec)**
- Symptom: Code does something not documented in any spec file
- Recovery: Ask "Which line in which spec file justifies this behavior?" If Claude cannot point to one, revert to the spec. Add the clarification to the spec file.
- Prevention: At ALIGN step, ask Claude to cite the specific spec sections that govern the behavior being implemented.

**Failure mode 5: Context drift (Claude forgets an earlier decision mid-session)**
- Symptom: Claude writes code that contradicts something decided earlier in the same conversation
- Recovery: Paste the earlier decision back into the conversation: "Earlier we decided X. Your current code contradicts that. Which is correct?"
- Prevention: Check the Decision Log before the session starts. Keep decisions explicit in the conversation, not implicit.

### 4.4 Context window management (gap G7 fix)

Claude's context window fills up in long sessions. Quality degrades before it fails visibly.

**Signs that context has become a problem:**
- Claude re-reads a file it already read earlier in the session
- Claude asks a question you already answered
- Code produced in the second half of a session is less precise than the first half
- Claude starts including caveats it didn't include earlier ("I'm not sure, but...")

**What to do:**
1. If you're past ~60% of a session and starting a new task: close and start a fresh session with a proper `/start` prompt (see §4.1). The 10-minute re-start cost is less than the quality loss from a saturated context.
2. If you must continue: ask Claude to summarize the session so far in 5 bullet points, then use that summary as the context block in a continuation message.
3. Never add large files to the conversation mid-session if you can avoid it. Point to them by path and ask Claude to read them with the Read tool instead.

---

## Part 5 — Decision Log (gap G3 fix)

Record every decision made when a flag was raised and resolved. This prevents the same flag from being raised again next session.

**Format:** One row per decision. Add new rows at the top.

| ID | Date | Raised by | Flag type | Decision | Rationale |
|---|---|---|---|---|---|
| D-001 | 2026-04-30 | LESSONS_LEARNED §0.6 | ⚠️ | `TASKS.md` wins over `CLAUDE.md` when phase status disagrees | CLAUDE.md is a pointer/summary, TASKS.md is the authoritative state |
| D-002 | 2026-04-30 | LESSONS_LEARNED §0.6 | ⚠️ | Issue #5 resolved as Approach B — derive `order_items` status from `qty_served`, no ENUM column | Simpler schema, no migration 008 needed for status column; `flagged` boolean still added |
| D-003 | 2026-04-30 | LESSONS_LEARNED §0.6 | ⚠️ | Issue #7 resolved — `POST /auth/guest` added to API_CONTRACT v1.2 | Guest token is a short-TTL stateless JWT (2h), not stored in `refresh_tokens` table |

> When you add a new row: use the next ID, fill in the date, describe what Claude flagged, which flag type it was, what you decided, and why. Keep rationale to one sentence.

---

## Part 6 — Prompting Patterns (Reference)

Quick-reference patterns for common situations. Copy and adapt.

### Starting a new phase
```
/start [phase-name]

We are starting Phase [N]. Phase [N-1] gate is complete — [state the gate check that confirmed it].
First task is [TASK-ID]: [task description from TASKS.md].
Read [spec file] and [schema file] before planning.
Do not start [next task] until I confirm this one is done.
```

### Resuming a blocked task
```
/start [feature]

Task [TASK-ID] was blocked last session by [blocker]. That blocker is now resolved: [resolution].
Decision recorded in Decision Log as D-[NNN].
Resume from where we stopped: [describe state].
```

### Asking for a plan without implementation
```
Plan only — do not write any code yet.
Task: [TASK-ID]
Show me: files to create, function signatures, which spec sections govern each decision.
I will approve or redirect before you implement.
```

### Debugging a specific failure
```
[TASK-ID] is failing with: [error message or symptom]
The relevant file is [path].
Do not rewrite anything else — only fix this specific issue.
After fixing, re-run the Step 5 self-review checklist for the changed code only.
```

### Requesting a self-review before code is shown
```
Before showing me the code: run through the Step 5 self-review checklist from IMPLEMENTATION_WORKFLOW.md.
Report the result of each checklist item.
Only show me the code after the checklist passes.
```

---

## Part 7 — Health Checks

Run these periodically. They catch drift before it becomes a problem.

### Weekly (every 5–7 sessions)
```bash
# 1. Check CLAUDE.md size — must stay under 150 lines
wc -l CLAUDE.md

# 2. Verify TASKS.md is up to date with actual codebase state
# Open TASKS.md, read the last ✅ row, confirm that file exists in be/ or fe/

# 3. Check Decision Log — any decisions older than 2 weeks that affected a spec?
# If yes: update the spec file to reflect the decision

# 4. Verify no token storage violation
grep -r "localStorage" fe/src/ 2>/dev/null && echo "VIOLATION FOUND" || echo "OK"
grep -r "sessionStorage" fe/src/ 2>/dev/null && echo "VIOLATION FOUND" || echo "OK"
```

### Before starting each new phase
- Read all Layer 2 docs (MASTER, API_CONTRACT, ERROR_CONTRACT, DB_SCHEMA_SUMMARY) and confirm their `> Last verified:` date is current
- If any doc has not been verified since the last migration, do a reconciliation pass: open the doc, check each field name and endpoint against the current migrations and codebase

### Before a production deploy
- All Phase 7 testing tasks are ✅
- `grep -r "os.Getenv" be/` returns entries for all secrets (no hardcoded values)
- `.env` is in `.gitignore` and not committed (`git status --short | grep -v "^?" | grep ".env"`)
- All webhook handlers: HMAC check is the first line of logic (review manually)

---

## Part 8 — File Map (this folder)

```
docs/pm/
├── PROJECT_AI_MANAGEMENT.md       ← this file — workflow audit, session protocols, AI management
├── PM_INDEX.md                    ← master index of ALL process docs in the project
├── HOW_CLAUDE_WORKS_HERE.md       ← how Claude boots, the 7-step loop, signal system explained
├── SESSION_GUIDE.md               ← which docs to give Claude per task; dependency chain
├── CHANGE_REQUEST_PROCESS.md      ← 6-step CR process for post-SRS changes
└── prompts/
    ├── PROMPT_menu_page.md        ← full Claude prompt for /menu page
    ├── PROMPT_order_tracking.md   ← full Claude prompt for /order/[id] page
    └── CLAUDE_CASESTUDY_PROMPTS.md ← reusable Claude invocation patterns from case studies
```

**Rule for this folder:** "Is this about how we work, not what we build?" If yes → here. If no → Layer 2 or Layer 3 docs.

**Full map of all process docs** (including those kept in other folders for cross-reference reasons) → see [PM_INDEX.md](PM_INDEX.md).

---

*BanhCuon System · Project & AI Management · v1.0 · 2026-04-30*
*Next review: after Phase 4 completes — update phase gates with what was actually verified.*
