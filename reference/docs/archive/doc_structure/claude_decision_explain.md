File created. Now here's the complete written explanation of everything the diagram shows:

How Claude Makes Every Decision: FE · BE · DevOps
The 3-tier document system
The core insight is one fact, one home. Every authoritative piece of information lives in exactly one place:

What	Authoritative source	Never duplicated to
Field names (price not base_price)	DB_SCHEMA_SUMMARY.md	CLAUDE.md, handlers
Endpoint signatures	API_CONTRACT_v1.2.md	Service layer
Error codes	ERROR_CONTRACT_v1.1.md	Hard-coded strings
Business rules	MASTER_v1.2.md §4	Spec files
Task status	TASKS.md	Anything else
Tầng 1 (always read): CLAUDE.md → TASKS.md → IMPLEMENTATION_WORKFLOW.md — session state, task list, process. Every session.

Tầng 2 (read relevant sections only): MASTER §2-6, API_CONTRACT, ERROR_CONTRACT, DB_SCHEMA — cross-cutting facts, read only the sections that apply to the current task.

Tầng 3 (read current domain only): BE_SYSTEM_GUIDE → then Spec for the specific domain (Spec1=Auth, Spec4=Orders, etc.). Never read all specs at once.

docs/qui_trinh/ — NEVER during coding. BRD, SRS, FSD, UX/UI Design, Legal, Marketing, Data Seeding. These were read once when the project started and distilled into Tầng 2+3 docs. Re-reading them during a coding session means reading unprocessed versions of facts already extracted into structured references.

How tasks are born

User business need
    ↓
docs/qui_trinh/BanhCuon_BRD_v1.md       (WHAT: objectives, scope, user types)
    ↓
docs/qui_trinh/BanhCuon_SRS_v1.md       (HOW: features, business rules BR-001+, AC, NFR)
docs/qui_trinh/BanhCuon_FSD_v1.md       (HOW: module detail, interactions)
docs/qui_trinh/BanhCuon_UXUI_Design_v1  (UX: page flows, color palette)
    ↓ [human distillation — one-time]
docs/MASTER_v1.2.md                      (cross-cutting: RBAC, biz rules, JWT, design tokens, realtime)
docs/contract/API_CONTRACT_v1.2.md       (all endpoints, request/response shapes)
docs/contract/ERROR_CONTRACT_v1.1.md     (error codes, respondError pattern)
docs/task/BanhCuon_DB_SCHEMA_SUMMARY.md (tables, fields, types)
docs/spec/Spec1-9                        (domain-specific implementation specs)
    ↓
For BE: read spec → identify handlers/services/queries → write task rows
For FE: Step 0 (spec → wireframe → decompose) → write task rows with spec_ref + draw_ref
    ↓
docs/TASKS.md rows (⬜ → 🔄 → ✅)
    ↓
Code (following 7-step loop)
The 7-step loop — what I actually do per step
Step 1 READ is the most document-intensive. In order: task row → domain spec → MASTER (only relevant sections) → DB_SCHEMA (verify every field name) → ERROR_CONTRACT → API_CONTRACT. Red flags stop me: TBD in spec → ❓ CLARIFY, docs contradict → ⚠️ FLAG, unresolved dep → 🔴 STOP.

Step 2 PLAN produces a written plan: files to create/modify, approach step-by-step, risks. Auth/payment tasks get an explicit caution flag. Multi-table mutations get a transaction in the plan.

Step 3 ALIGN asks the user only when: security-sensitive task, plan deviates from spec, or open risk from Step 2. Not triggered by file count or line count.

Step 4 IMPLEMENT follows strict rules with zero exceptions. BE: handler → service → repository → db — no business logic in handlers, no gin in service, no raw DB in service. FE: Zustand for tokens (never localStorage), TanStack Query for server data, api-client.ts only, formatVND() always, Tailwind tokens always.

Step 5 SELF-REVIEW is a mandatory checklist, not optional. Security: JWT algorithm check, no username enumeration, HMAC first on webhooks. Correctness: state machine validation, idempotency, recalculateTotalAmount() after order_items mutation, soft-delete filter.

Step 6 TEST: go build ./... + npm run build must be zero errors before marking done.

Step 7 DONE: TASKS.md always. CLAUDE.md Current Work if direction changed. LESSONS_LEARNED only for non-obvious patterns and mistakes — not routine completions.

BE vs FE decision questions
BE design questions (in order):

Which spec section defines this endpoint?
Which MASTER sections apply? (RBAC/§3, biz rules/§4, realtime/§5, JWT/§6)
Which sqlc query? Verify field names in DB_SCHEMA_SUMMARY.
What error codes? Verify in ERROR_CONTRACT.
Auth or payment? → extra caution rules.
Need a transaction? (multi-table = always yes)
Need Redis? (always set TTL)
WS broadcast side effects? (list them in plan)
FE design questions (in order):

Step 0 FIRST: spec → wireframe → decompose → task rows (before any code)
What is each zone's data source? (TanStack vs Zustand vs SSE vs WS)
Which API endpoint? Verify in API_CONTRACT.
What RBAC guard? From MASTER §3.
Realtime data? From MASTER §5 for SSE/WS config.
Tailwind tokens? From MASTER §2. Never hex.
DevOps questions: only engage when Phase 6 tasks or infra changes. Questions: which service affected, routing change (Caddyfile), new migration (goose), new env var (.env.example + compose), CI/CD update.

What's important vs not
Critical (never skip):

Read DB_SCHEMA_SUMMARY before every query — field name bugs are the #1 silent failure
HMAC before any body read on webhooks — security
Zustand not localStorage for tokens — security
Wireframe before FE task rows — layout correctness
spec_ref + draw_ref on FE tasks — traceability
Update TASKS.md after every task — session continuity
Not critical (can be lightweight):

Step 3 ALIGN on straightforward, non-security tasks — skip it
LESSONS_LEARNED on routine completions — skip it
Reading all of MASTER — only read the sections that apply
Never do:

Read docs/qui_trinh/ during coding
Read all specs at once
Put business logic in handlers
Store access tokens in localStorage
Use hex colors in className
Hard DELETE instead of soft-delete
The Excalidraw diagram is at docs/doc_structure/claude_decision_workflow.excalidraw — open it in VS Code with the Excalidraw extension or paste the file contents at excalidraw.com. It contains all five sections: session start protocol, document reading order (3-tier), 7-step execution loop, domain decision rules (BE/FE/DevOps), and the task creation pipeline from BRD through to code