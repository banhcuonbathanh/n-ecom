# How Claude Works in This Project

> A plain-English explanation of the system, how I read it, and how I act.
> Audience: you, the project owner — so you understand what Claude is doing and why.

---

## 1. The Core Idea

This project treats Claude not as a code-completion tool but as a **senior developer** who must read specs, follow a process, and speak up before writing a single line of code. The entire document system is designed to give Claude exactly the right information, in the right order, with no ambiguity.

The system has **three control points:**

| Control Point | File | Purpose |
|---|---|---|
| Entry point | `CLAUDE.md` | Where every session starts. Maps the project, phases, and current state. |
| Task queue | `docs/TASKS.md` | What to do next, in what order, with what dependencies. |
| Quality process | `docs/IMPLEMENTATION_WORKFLOW.md` | How to do every task — the 7-step loop. |

---

## 2. What Happens When I Start a Session

When I open this project, here is my exact boot sequence:

```
1. Read CLAUDE.md
   → Learn what phase we are in, what is done, what is next
   → See the document map (where to find specs, contracts, schema)

2. Open docs/TASKS.md
   → Find the first ⬜ task where all dependencies are ✅
   → If a task is 🔴 BLOCKED, skip it and explain why

3. Open the matching system guide for the domain of that task
   → BE task  → docs/be/BE_SYSTEM_GUIDE.md
   → FE task  → docs/fe/FE_SYSTEM_GUIDE.md
   → Infra    → docs/devops/DEVOPS_SYSTEM_GUIDE.md
   → Find the exact epic, read only the docs listed for it

4. Follow docs/IMPLEMENTATION_WORKFLOW.md for that task
   → Run the 7-step loop: READ → PLAN → ALIGN → IMPLEMENT → SELF-REVIEW → TEST → DONE
```

I do not guess what to work on. I do not jump straight to coding. The TASKS.md is the single queue I read from. The system guide for the domain is the technical reference — I do not read all docs, only what the guide lists per epic.

---

## 3. The 7-Step Loop — What I Do on Every Task

No step is skipped. The first three steps happen **before any code is written.**

### Step 1 — READ
I read all documents that govern this task:
- The task row in TASKS.md (confirm ID, dependencies, acceptance criteria)
- The relevant spec file (Spec1–Spec7) for the domain
- Sections of `docs/core/MASTER_v1.2.md` that apply (RBAC, business rules, JWT, realtime, design tokens)
- `docs/be/DB_SCHEMA_SUMMARY.md` — to get the exact field names before writing any query
- `docs/contract/ERROR_CONTRACT_v1.1.md` — to get the exact error codes before writing any error response
- `docs/contract/API_CONTRACT_v1.2.md` — to verify endpoint signatures before writing a handler

**Why this matters:** The most common bugs in this project come from NOT reading — wrong field names (`base_price` instead of `price`), wrong error codes, wrong endpoint paths. Reading first eliminates that entire class of bugs.

### Step 2 — PLAN
Before coding I write out a plan:
- What files to create or modify (with full paths)
- Step-by-step logic for the main feature
- Risks, edge cases, security concerns
- Confirmation that all dependencies in TASKS.md are ✅

### Step 3 — ALIGN
I confirm the plan with you before touching code.

I always ask when: the task is auth or payments, the plan deviates from spec, there is an open risk, or the scope is larger than expected (more than 3 files or 150 lines).

I proceed without asking when: the plan is a small, unambiguous utility under 50 lines with no security concern.

### Step 4 — IMPLEMENT
I write code exactly as planned. Key rules I follow:

**Backend (Go):**
- Layer order is strict: `handler` → `service` → `repository` → `db (sqlc)`. No shortcuts.
- No business logic in handlers. No DB queries in services.
- All IDs are `string` (UUID CHAR(36)), never `int`.
- All errors use the `respondError` pattern from ERROR_CONTRACT.
- Redis operations always have a TTL — never store without expiry.
- Webhook handlers always verify HMAC as the very first operation.

**Frontend (TypeScript/Next.js):**
- Access token: Zustand in-memory store only — never localStorage, never sessionStorage.
- All server state: TanStack Query. All UI state: Zustand. All forms: RHF + Zod.
- No color hex values in className — Tailwind tokens only.
- All price displays: `formatVND()`.

### Step 5 — SELF-REVIEW
After writing, I audit the code myself before showing it to you. I check:
- Security: JWT algorithm confusion, username enumeration, HMAC verification, no SQL injection, no secrets in logs
- Correctness: happy path, all error paths, state machine transitions, idempotency on payments, soft-delete filters
- Concurrency: mutex on WS Hub, goroutines with `defer recover()`
- Every acceptance criteria from the spec can be verified by reading the code

### Step 6 — TEST
I verify the implementation works. Minimum per task type:
- BE service → `go build ./...` zero errors + unit test for main logic
- BE handler → `go build ./...` + manual curl verification
- FE component → `npm run build` zero TypeScript errors + browser check
- DB query → `sqlc generate` no errors + verify generated types match schema

If tests cannot be run (e.g., no DB in the environment), I state that explicitly and list the exact commands to run later. I never claim "done" when tests were skipped silently.

### Step 7 — DONE
I update exactly the right documents:

| What happened | I update | What I write |
|---|---|---|
| Task completed | `docs/TASKS.md` | ⬜ → ✅ |
| Task blocked | `docs/TASKS.md` | ⬜ → 🔴 + note why |
| Whole phase done | `docs/TASKS.md` + `CLAUDE.md` Phase Status | ✅ COMPLETE in both |
| Work state changed | `CLAUDE.md` Current Work section | "Done" and "Next" bullets |
| A mistake was found and fixed | `docs/base/LESSONS_LEARNED_v3.md` | Anti-pattern + correct approach |
| Non-obvious architectural decision | `docs/base/LESSONS_LEARNED_v3.md` | Decision + why |
| Spec was ambiguous, now clarified | The spec file itself | Clarification in place |

**Decision rule for which doc to update:**
- Is this about what state the *project* is in right now? → `CLAUDE.md`
- Is this a *pattern* that should apply to all future work? → `LESSONS_LEARNED_v3.md`
- Is this a *task status*? → `TASKS.md`

---

## 4. The Document Architecture — 5 Layers

The project separates documents into five layers so Claude always knows exactly where to look:

```
Layer 1 — Navigation (always loaded)
  CLAUDE.md                               ← project map, phase status, commands, current work
  README.md                               ← big picture: stack, quick start, full doc map

Layer 2 — Onboarding (read on day 1 per role)
  docs/onboarding/BE_DEV.md              ← BE: stack, entry point, first 3 tasks, key rules
  docs/onboarding/FE_DEV.md             ← FE: stack, state ownership, first 3 tasks, key rules
  docs/onboarding/DEVOPS.md             ← DevOps: ownership, first 3 tasks, key rules
  docs/onboarding/LEAD.md               ← Lead: phase status, PR review checklist

Layer 3 — System guides (read at the start of every coding session per role)
  docs/be/BE_SYSTEM_GUIDE.md            ← BE epics, scaffold state, code patterns, per-epic reading list
  docs/fe/FE_SYSTEM_GUIDE.md            ← FE epics, scaffold state, state rules, per-epic reading list
  docs/devops/DEVOPS_SYSTEM_GUIDE.md    ← DevOps epics, Dockerfile patterns, compose spec, CI/CD

Layer 4 — Shared facts (read when needed — not all at once)
  docs/core/MASTER_v1.2.md                   ← RBAC §3, business rules §4, realtime §5, JWT §6, design tokens §2
  docs/contract/API_CONTRACT_v1.2.md    ← all endpoints
  docs/contract/ERROR_CONTRACT_v1.1.md  ← error codes + respondError pattern
  docs/be/DB_SCHEMA_SUMMARY.md ← field names (single source of truth)

Layer 5 — Domain specs (read only for that domain — listed in system guides)
  docs/spec/Spec1_Auth_Updated_v2.md
  docs/spec/Spec_2_Products_API_v2_CORRECTED.md
  docs/spec/Spec_3_Menu_Checkout_UI_v2.md
  docs/spec/Spec_4_Orders_API.md
  docs/spec/Spec_5_Payment_Webhooks.md
  docs/spec/Spec_6_QR_POS.md
  docs/spec/Spec_7_Staff_Management.md
```

**Reading order per session:** CLAUDE.md → TASKS.md (find next task) → system guide for that role (find that epic) → only the docs that epic lists → implement.

**The principle:** One fact, one home. System guides tell you *what to read* — they do not duplicate the facts inside those docs. If two documents contradict each other, surface it as `⚠️ FLAG` and ask. Do not pick one silently.

---

## 5. The Signal Prefix System

When I communicate with you, I use standard prefixes so you immediately know the urgency:

| Prefix | Level | What It Means | What You Should Do |
|---|---|---|---|
| `💡 SUGGESTION` | Info | I see a better way — optional | Read, decide whether to apply |
| `⚠️ FLAG` | Warning | Doc conflict, ambiguous spec, needs attention | Must resolve before continuing |
| `🚨 RISK` | High | Bug, security hole, production risk | Stop, read carefully, decide approach |
| `🔴 STOP` | Critical | Proceeding will cause a production bug — I refuse to continue | Resolve immediately |
| `❓ CLARIFY` | Question | I need information to proceed, spec is unclear | Answer to unblock me |
| `🔄 REDIRECT` | Change | You are going in the wrong direction — I propose a better one | Evaluate and confirm the new direction |

---

## 6. The Single-Source-of-Truth Rule

Every important fact in this project lives in exactly one document. When I need to know something, I go to that one place — not CLAUDE.md, not memory, not assumptions.

| Fact | Authoritative source |
|---|---|
| DB field names | `docs/be/DB_SCHEMA_SUMMARY.md` |
| Error codes + format | `docs/contract/ERROR_CONTRACT_v1.1.md` |
| Business rules (order, payment, cancel) | `docs/core/MASTER_v1.2.md §4` |
| RBAC roles + hierarchy | `docs/core/MASTER_v1.2.md §3` |
| Design tokens (colors, fonts) | `docs/core/MASTER_v1.2.md §2` |
| JWT config + auth rules | `docs/core/MASTER_v1.2.md §6` |
| Realtime (SSE/WS config) | `docs/core/MASTER_v1.2.md §5` + `docs/contract/API_CONTRACT_v1.2.md §10` |
| All endpoints | `docs/contract/API_CONTRACT_v1.2.md` |

If two documents give different answers, I surface it as `⚠️ FLAG` and ask you which is authoritative. I do not pick one silently.

---

## 7. How I Know What to Do Next

I follow this exact priority order:

1. **Is there a `/start [feature]` command?** → Read that feature's spec and start the 7-step loop for it.
2. **No command given?** → Open `docs/TASKS.md`, find the first `⬜` row where all dependencies are `✅`, run the 7-step loop for it.
3. **All tasks in the next phase are blocked?** → Flag `🔴 STOP`, explain which dependency is missing, suggest what needs to be done first.

I do not invent tasks. I do not jump ahead in the phase order. I do not start Phase 4 while Phase 3 is incomplete.

---

## 8. What I Will NOT Do

These are explicit constraints built into the system:

- I will not write code before reading the relevant spec, schema, and error contract
- I will not guess field names, error codes, or endpoint paths
- I will not store tokens in localStorage or sessionStorage
- I will not put business logic in HTTP handlers
- I will not write Redis operations without a TTL
- I will not process a payment webhook before verifying HMAC
- I will not mark a task done without updating TASKS.md
- I will not silently skip a failed test — I will state it explicitly
- I will not pick one of two contradicting documents — I will ask you

---

## 9. Current Project State (as of April 2026)

```
Phase 0 — Docs & Architecture    ✅ COMPLETE (+ BE/FE/DevOps system guides + onboarding added 2026-04-30)
Phase 1 — DB Migrations          🔄 87% (migration 008 pending — task P1-8)
Phase 2 — Feature Specs          ✅ COMPLETE (all 7 specs written)
Phase 3 — sqlc + Project Setup   ✅ COMPLETE (sqlc generated + field names verified)
Phase 4 — Backend                🔄 ~15% (auth infra done; auth_handler.go is next — BE-2)
Phase 5 — Frontend               ⬜ Blocked until Phase 4 auth handler done
Phase 6 — DevOps                 🔄 40% (.env.example + Caddyfile + CI pending — DO-4/5/6)
Phase 7 — Testing & Go-Live      ⬜ Not started
```

**The immediate bottlenecks (in order):**
1. `P1-8` — Run migration `008_order_groups.sql`
2. `BE-2` — Write `be/internal/handler/auth_handler.go` (5 handlers) — unblocks all of Phase 5
3. `DO-4` — Create `.env.example` + `scripts/migrate.sh` — unblocks local dev for everyone

**Where to find these tasks:** `docs/TASKS.md` → `docs/be/BE_SYSTEM_GUIDE.md §10 Epic BE-2`

---

*BanhCuon System · Claude Workflow Explanation · 2026-04-30*
