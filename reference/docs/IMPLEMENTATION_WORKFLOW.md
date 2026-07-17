# Implementation Workflow — Quality Process

> **Version:** v1.0 · 2026-04-29
> **Purpose:** Every task in `docs/TASKS.md` MUST follow these steps in order. No skipping.
> **Why:** Ensures spec alignment before coding, catches risks early, and produces verifiable output.

---

## The 7-Step Loop

```
READ → PLAN → ALIGN → IMPLEMENT → SELF-REVIEW → TEST → DONE
```

Every task, every time. Steps 1–3 happen before a single line of code is written.

---

## Step 0 — FE Pre-Task Phase (FE pages only)

> **When to run:** Before creating task rows for any new FE page or multi-component feature.
> **Skip if:** The task is a bug fix, a minor change to an existing component, or a BE-only task.

### The FE Pre-Task flow

```
READ SPEC → DRAW Wireframe → DECOMPOSE Components → WRITE TASK ROWS (with spec_ref)
```

All four steps happen **before touching code or writing task rows in TASKS.md**.

---

### Step 0a — READ SPEC

Read the relevant spec (e.g. `Spec_9_Admin_Dashboard_Pages.md`) end-to-end.

Mark every **screen**, **component**, and **data source** mentioned. If a section is missing or says "TBD" — flag ❓ CLARIFY before proceeding.

---

### Step 0b — DRAW Wireframe

Create a page-level wireframe **before identifying components**. The wireframe:

- Labels every visible zone: `[ComponentName]`
- Notes the data source per zone: `GET /orders/live`, SSE stream, Zustand store, etc.
- Notes interactions: button → which API call, toggle → which state change
- Identifies shared vs. page-specific components

**Format:** ASCII wireframe in a markdown file **or** an Excalidraw frame.

**Save to:** `docs/fe/wireframes/[page-name].md` (or `.excalidraw`)

**Example (ASCII):**

```
┌─────────────────────────────────────────────┐
│  [PageHeader]  title + breadcrumbs          │
├──────────────────┬──────────────────────────┤
│  [OrderList]     │  [PrepPanel]             │
│  GET /orders/live│  per-table dish status   │
│  SSE stream      │  computed from OrderList │
├──────────────────┴──────────────────────────┤
│  [ActionBar]  buttons → PATCH /orders/:id   │
└─────────────────────────────────────────────┘
```

---

### Step 0c — DECOMPOSE

From the wireframe, extract one task row per distinct component or concern:

1. **Shared/base components first** — components used by multiple pages
2. **API layer** — api.ts functions for this feature
3. **Page-specific components** — leaf components (cards, panels, modals)
4. **Page assembly** — the page.tsx that composes everything

**Each task row MUST include `spec_ref` and `draw_ref`:**

```
| ID   | Domain | Task                              | Status | spec_ref              | draw_ref                      |
|------|--------|-----------------------------------|--------|-----------------------|-------------------------------|
| 9-1  | FE     | PrepPanel component               | ⬜     | Spec_9 §3.2           | wireframes/overview.md zone-B |
| 9-2  | FE     | ActionBar (Phục vụ/Mang đi/Huỷ)  | ⬜     | Spec_9 §3.3           | wireframes/overview.md zone-C |
| 9-3  | FE     | overview/page.tsx — assemble      | ⬜     | Spec_9 §3             | wireframes/overview.md        |
```

**Rule:** A task with no `spec_ref` is not ready to start. Stop and trace it back to the spec first.

---

### Step 0d — ALIGN on wireframe (optional but recommended)

Before coding, show the wireframe + task breakdown to the user and confirm:
- Correct zones identified?
- Any component missing or misnamed?
- Spec_ref correct for each task?

---

## Step 1 — READ

**Goal:** Understand all constraints before touching code.

**Spec gate (blocking):**
> Does this task touch Auth · Products · Menu/Checkout · Orders · Payment · QR/POS · Staff · Admin Dashboard?
> **YES → read the domain spec before doing anything else. No plan, no code until spec is read.**
> Spec doesn't cover the feature? → read `docs/requirements/BanhCuon_SRS_v1.md` then `BanhCuon_FSD_v1.md`.
> NO (infra, test setup, pure refactor, tooling) → spec read not required.
> Not sure which doc to open? → see `docs/DOC_MAP.md`.

**What to read (in order):**

1. The task row in `docs/TASKS.md` — confirm ID, dependencies, AC reference
2. **Domain spec** (Spec1–Spec9) — **mandatory if spec gate above is YES**
3. `docs/core/MASTER_v1.2.md` sections relevant to the task:
   - §2 design tokens if writing UI
   - §3 RBAC if writing auth/role checks
   - §4 business rules if writing orders/payments/cancel logic
   - §5 realtime config if writing SSE/WS
   - §6 JWT config if writing auth
4. `docs/be/DB_SCHEMA_SUMMARY.md` — verify field names before writing any query or struct
5. `docs/contract/ERROR_CONTRACT_v1.1.md` — verify error codes before writing any error response
6. `docs/contract/API_CONTRACT_v1.2.md` — verify endpoint signatures before writing handler

**Output of this step:** A clear mental model of what the task requires and what constraints apply.

**Red flags that require stopping:**
- A spec section is missing or says "TBD" → flag ❓ CLARIFY before proceeding
- Two documents contradict each other → flag ⚠️ FLAG and ask which is source of truth
- The task has an unresolved dependency → flag 🔴 STOP, do not proceed

---

## Step 2 — PLAN

**Goal:** Produce a written plan before coding.

**A good plan includes:**

```
Task: [ID from TASKS.md]
Files to CREATE: [list with full paths]
Files to MODIFY: [list with full paths + what changes]
Approach:
  - [Step-by-step logic for the main function/handler/component]
  - [How it connects to adjacent layers]
Risks / Questions:
  - [Any ambiguity, edge case, or security concern]
Dependencies checked:
  - [Confirm prior tasks are ✅ in TASKS.md before starting]
```

**Rules:**
- Never plan to create a file that already exists without noting what will change
- If the task touches payments or auth — note it explicitly and add extra caution in the plan
- If the task requires a DB query not in `query/*.sql` — add writing that query to the plan
- If the task generates side effects (WS broadcast, Redis write, job trigger) — list all of them

---

## Step 3 — ALIGN

**Goal:** Confirm the plan with the user before writing code.

**When to always ask:**
- The task is security-sensitive (auth, payments, webhook verification, RBAC)
- The plan deviates from the spec in any way
- There is an open risk or question from Step 2
- The spec is ambiguous on an edge case that affects the implementation

**When you can proceed without asking:**
- The plan is a straightforward implementation of a clearly-defined spec with no ambiguity
- No security concern, no spec deviation, no open risks

**What NOT to use as the trigger:** line count or file count alone. A 200-line function
that is fully specified needs no confirmation. A 30-line auth middleware with a subtle
edge case does. The signal is ambiguity + security risk, not size.

**Output:** User approval or correction of the plan. Adjust plan before coding if feedback given.

---

## Step 4 — IMPLEMENT

**Goal:** Write the code exactly as planned.

**Rules during implementation:**

### General
- Follow BE layer order strictly: `handler` calls `service`, `service` calls `repository`, `repository` calls `db` (sqlc)
- No business logic in handlers. No DB queries in services (use repository). No gin imports in service layer.
- All IDs are `string` (UUID CHAR(36)) — never `int`
- All errors returned to HTTP layer use the respondError pattern from `docs/contract/ERROR_CONTRACT_v1.1.md`
- No hardcoded env vars — always `os.Getenv()` in Go, `process.env.` in Next.js

### Backend (Go)
- Wrap all sqlc queries in repository layer — never call db queries directly from service
- Redis operations: always set TTL — never store without expiry
- Every DB-mutating operation that spans multiple tables: use a transaction
- Auth middleware must be applied before RBAC middleware
- Webhook handlers: HMAC verification is ALWAYS the first operation — before reading any body fields
- After webhook HMAC: verify `gatewayAmount == dbPayment.Amount` before updating DB (financial fraud prevention)
- Middleware that needs Redis/service must receive it as a constructor parameter — no global closures
- `binding:"min=0"` not `binding:"required,min=0"` for numeric fields that can validly be zero
- Guest JWT: when `role == "customer"`, store `NULL` in `created_by` FK column — never store the literal string `"guest"`

### Frontend (TypeScript/Next.js)
- Access token: Zustand in-memory store ONLY — never localStorage, never sessionStorage
- Refresh token: httpOnly cookie only (set by BE, read automatically by browser)
- All price displays: use `formatVND()` from `lib/utils.ts`
- All server state: TanStack Query. All client/UI state: Zustand. All forms: RHF + Zod
- No color hex values in className — use Tailwind tokens matching MASTER §2

### Field names to verify before committing
| Wrong | Correct |
|---|---|
| `base_price` | `price` |
| `image_url` | `image_path` |
| `staff_id` | `created_by` |
| `webhook_payload` | `gateway_data` |
| `success` (payment status) | `completed` |
| `price_delta` | `price` (on toppings) |

---

## Step 5 — SELF-REVIEW

**Goal:** Audit the code before presenting it.

**Run through this checklist mentally after every implementation:**

### Security
- [ ] No JWT algorithm confusion — verify `t.Method == jwt.SigningMethodHMAC` before parsing
- [ ] No username enumeration — wrong password and wrong username return the same error
- [ ] Payment webhook: HMAC verified before any DB read/write
- [ ] No SQL injection — all queries use sqlc parameterized statements (no raw string concat)
- [ ] No sensitive data in logs (passwords, tokens, gateway keys)
- [ ] CORS origins read from env var, not hardcoded

### Correctness
- [ ] Happy path works as per spec
- [ ] All error paths return correct error code from ERROR_CONTRACT
- [ ] State machine transitions validated (no skipping states)
- [ ] 1-table-1-active-order check in place before CreateOrder
- [ ] Payment idempotency: check existing status before updating
- [ ] `recalculateTotalAmount()` called after every order_items mutation
- [ ] Soft delete: `deleted_at` set, not hard DELETE. All queries filter `WHERE deleted_at IS NULL`

### Concurrency
- [ ] WebSocket Hub uses sync.RWMutex for client map access
- [ ] No race conditions on Redis INCR operations (Redis is single-threaded, safe)
- [ ] Goroutines have `defer recover()` to prevent panics from crashing server

### Frontend
- [ ] No token in localStorage (check all store.ts files)
- [ ] No hardcoded color hex values
- [ ] All IDs typed as `string`, never `number`
- [ ] SSE/WS token passed via Authorization Bearer header, not query param (except WS which must use query param because browser WebSocket API cannot set custom headers)
- [ ] Admin API calls use `/products/all` (Manager+) not `/products` (public, filtered) for product management
- [ ] HTTP method matches between FE api calls and BE route registrations (PATCH for partial updates, not PUT)

### Acceptance Criteria
- [ ] Every AC item from the spec for this task can be verified by reading the code

---

## Step 6 — TEST

**Goal:** Verify the implementation actually works before marking done.

**Minimum tests required per task type:**

| Task Type | Minimum Verification |
|---|---|
| BE service | Run `go build ./...` — zero errors. Run or write unit test for the main logic path. |
| BE handler | Run `go build ./...`. Manually verify with curl or a test if possible. |
| FE component | `npm run build` — zero TypeScript errors. Check in browser if dev server available. |
| FE page | `npm run build` + open in browser, test golden path, check browser console for errors. |
| DB query | Run `sqlc generate` — no errors. Verify generated types match schema. |
| DB migration (ADD/DROP COLUMN) | **Run `cd be && sqlc generate` immediately after migration** before writing any code that uses the new column. Without this, structs miss the field and compile errors appear. |
| New FE page/component (Docker) | Run `docker compose up -d --build fe` — Tailwind JIT scans source at build time; new classes purged if image not rebuilt. |
| DevOps / Docker | `docker compose up -d --build [service]` — container starts and passes health check. |

**For auth tasks:**
- Test wrong password returns same error as wrong username
- Test rate limiting activates after 5 fails

**For payment tasks:**
- Test HMAC rejection with tampered params
- Test idempotency by calling webhook twice

**For order tasks:**
- Test 1-table-1-active check
- Test state machine rejects invalid transitions

**If tests cannot be run** (e.g., no DB connection in current environment):
- State this explicitly: "Tests could not be run because [reason]"
- List the exact test commands to run later

---

## Step 7 — DONE

**Goal:** Leave the project in a clean, updated state. Three documents may need updating — know which one fits each type of change.

---

### 7.1 — Which doc to update?

| What happened during the task | Update this doc | What to write |
|---|---|---|
| Task completed, in progress, or blocked | `docs/TASKS.md` | Change ⬜ → ✅ / 🔄 / 🔴. Add a note if blocked. **Always do this.** |
| Whole phase just finished | `docs/TASKS.md` + `CLAUDE.md` Phase Status table | Change phase row to ✅ COMPLETE in both files |
| Current work state changed (what's done, what's next) | `CLAUDE.md` → Current Work section | Update "Done" and "Next" bullets. Keep it to 3–5 bullets max. |
| New gap, risk, or follow-up task discovered | `docs/TASKS.md` | Add new row with ⬜ status and a note on what was found |
| A mistake was made and then corrected (wrong field name, wrong pattern, spec drift) | `docs/base/LESSONS_LEARNED_v3.md` | Add to the relevant anti-pattern section — describe what went wrong, why, and the correct approach |
| A non-obvious architectural decision was made or confirmed | `docs/base/LESSONS_LEARNED_v3.md` | Add under §2 "Quy Tắc Nhà Của Từng Loại Thông Tin" or §1 "Pattern Nguy Hiểm" as appropriate |
| A spec was found to be ambiguous or wrong, and was clarified | The spec file itself + `docs/contract/API_CONTRACT_v1.2.md` if it was an endpoint | Update the spec file. Do NOT copy the clarification into CLAUDE.md — CLAUDE.md is a pointer, not a spec. |

---

### 7.2 — Decision rule (one sentence)

> **CLAUDE.md** = current state of the project (what's done, what's next).
> **LESSONS_LEARNED** = durable knowledge about patterns and mistakes (what future Claude sessions should know forever).
> **TASKS.md** = task status (always updated after every task).

If you are unsure which doc to update, ask: "Is this about the state of *this* project right now, or about a pattern that applies to *any* future work?" State → CLAUDE.md. Pattern → LESSONS_LEARNED.

---

### 7.3 — Checklist

- [ ] `docs/TASKS.md` — task status updated (⬜ → ✅ or 🔴 with note)
- [ ] `CLAUDE.md` → Current Work — "Done" and "Next" bullets current
- [ ] `CLAUDE.md` → Phase Status — updated if a phase completed
- [ ] `docs/base/LESSONS_LEARNED_v3.md` — updated if a pattern, mistake, or architectural decision was discovered (skip if task was routine)
- [ ] Any new follow-up tasks added to `docs/TASKS.md`
- [ ] Run `/handoff` if closing the session

---

## Common Failure Modes (What Goes Wrong Without This Workflow)

| Failure | Root Cause | Prevented By |
|---|---|---|
| Wrong field names (`base_price` instead of `price`) | Coded without reading schema | Step 1 READ |
| Payment webhook processes twice | No idempotency check | Step 5 SELF-REVIEW |
| Token stored in localStorage | Skipped FE rules | Step 4 IMPLEMENT rules |
| Handler contains business logic | Ignored layer architecture | Step 4 IMPLEMENT rules |
| Wrong error code returned | Did not read ERROR_CONTRACT | Step 1 READ |
| JWT algorithm confusion vulnerability | No algorithm check | Step 5 SELF-REVIEW security |
| State machine allows pending→ready skip | Not validated in service | Step 5 SELF-REVIEW correctness |
| Colors hardcoded as hex in CSS | Ignored MASTER §2 | Step 4 IMPLEMENT rules |
| Task done but TASKS.md not updated | Skipped Step 7 | Step 7 DONE |
| FE component discovered mid-coding (e.g. PrepPanel) | No wireframe before tasking | Step 0b DRAW |
| FE task has no spec traceability | No spec_ref on task row | Step 0c DECOMPOSE |
| FE page built wrong layout | Task created before drawing | Step 0b DRAW |
| FE task done but refers to wrong spec section | spec_ref not verified | Step 0c DECOMPOSE |
| Plan contradicts spec (e.g. wrong trigger for ToppingModal) | Spec not read before planning | Step 1 READ — spec gate |
| Migration run but new column missing from Go struct | Forgot `sqlc generate` after migration | Step 6 TEST |
| Admin edit form returns 404 | FE uses `api.patch()` but BE has `router.PUT()` registered | Step 5 SELF-REVIEW + Step 4 method check |
| Admin product list incomplete (misses unavailable items) | Using `/products` (public) instead of `/products/all` (Manager+) | Step 4 IMPLEMENT FE rules |
| New Tailwind classes invisible in Docker | Tailwind JIT purges classes not in image at build time; image not rebuilt | Step 6 TEST (rebuild fe image) |
| Webhook accepts wrong amount without rejecting | Amount verification skipped, only HMAC verified | Step 5 SELF-REVIEW security |
| Guest order INSERT fails with FK error | "guest" string stored in `created_by` FK column | Step 4 IMPLEMENT BE rules |
| Middleware skips Redis check silently | Dependency not injected into middleware constructor | Step 2 PLAN (list all constructor deps) |
| Form with price=0 rejected with 400 | `binding:"required"` on numeric field rejects zero | Step 5 SELF-REVIEW correctness |

---

## Quick Reference — Session Start

When starting a new session, do this before anything else:

```
1. Read CLAUDE.md → Current Work section (what was done last session, what's next)
2. Read docs/TASKS.md → find the next ⬜ task with all dependencies ✅
3. Check the task has no 🔴 BLOCKED dependency
4. Begin the 7-step loop for that task
```

---

*BanhCuon System · Implementation Workflow · v1.1 · 2026-05-10*
