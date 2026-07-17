# LESSONS REFLECTION AUDIT
> How every lesson in `LESSONS_LEARNED_v3.md` is enforced in this project — and where the gaps are.
> Audited: 2026-05-10 · Auditor: Claude (Sonnet 4.6)
> Method: Read LESSONS_LEARNED_v3.md end-to-end → trace each rule/anti-pattern → locate enforcement file + line → flag gaps.

---

## HOW TO READ THIS DOCUMENT

Each section below maps a lesson source → its enforcement mechanism → where in the project to find it → and whether the enforcement is **automatic**, **procedural** (relies on discipline), or **missing**.

| Symbol | Meaning |
|---|---|
| ✅ AUTO | Enforced by a file/checklist Claude reads every session — hard to miss |
| ⚠️ PROC | Enforced by procedure — relies on Claude following the step, catchable in self-review |
| ❌ GAP | Lesson documented but no enforcement mechanism exists — risk of regression |

---

## STEP 1 — Verification Method

Before writing this document, I read the following files in full:

1. `docs/base/LESSONS_LEARNED_v3.md` — the source of all lessons
2. `CLAUDE.md` — the session-start file Claude reads first
3. `docs/IMPLEMENTATION_WORKFLOW.md` — the 7-step operating manual
4. `docs/PROCEDURE_INDEX.md` — the procedure lookup table before every task

I then cross-referenced every rule, anti-pattern, and weakness from LESSONS_LEARNED against the content of these three enforcement files. Where a rule appears verbatim or by clear paraphrase in an enforcement file, it is marked ✅ AUTO or ⚠️ PROC. Where no enforcement exists, it is marked ❌ GAP.

---

## STEP 2 — Audit Results

### SECTION A — Workflow Rules (§0.1–0.5)

| Lesson | Where Enforced | Status |
|---|---|---|
| Claude is a senior coworker — reads spec before coding, flags bugs, explains decisions | `CLAUDE.md` §"Before every task" procedure check + `IMPLEMENTATION_WORKFLOW.md` Steps 1–3 | ✅ AUTO |
| Standard 6-step session loop: START → ALIGN → IMPLEMENT → SELF-REVIEW → REVIEW → HANDOFF | `IMPLEMENTATION_WORKFLOW.md` defines all 7 steps with goals and rules | ✅ AUTO |
| Prefix system (💡 SUGGESTION / ⚠️ FLAG / 🚨 RISK / 🔴 STOP / ❓ CLARIFY / 🔄 REDIRECT) | `CLAUDE.md` line 12 lists all 6 prefixes. `LESSONS_LEARNED_v3.md §0.3` has the full table | ✅ AUTO |
| Edge case X → ask before coding, not after | `IMPLEMENTATION_WORKFLOW.md` Step 3 ALIGN — "When to always ask" table | ⚠️ PROC |
| Bug found outside current scope → flag 🚨 RISK anyway | `IMPLEMENTATION_WORKFLOW.md` Step 1 READ "Red flags" section | ⚠️ PROC |
| Two docs conflict → ⚠️ FLAG, ask for source of truth | `IMPLEMENTATION_WORKFLOW.md` Step 1 READ "Red flags" + `TASKS.md` wins rule in `CLAUDE.md` | ✅ AUTO |
| Task too large → break down before starting | `IMPLEMENTATION_WORKFLOW.md` Step 2 PLAN rules: "tasks with 3+ files or crossing two layers → break down" | ⚠️ PROC |
| /handoff at session end | `CLAUDE.md` §Commands + `IMPLEMENTATION_WORKFLOW.md` Step 7 checklist | ✅ AUTO |

---

### SECTION B — Weakness Mitigations (§0.6)

#### Weakness 1 — Duplicate Phase State (CLAUDE.md vs TASKS.md)

| Lesson | Enforcement | Status |
|---|---|---|
| TASKS.md is single source of task truth | `CLAUDE.md` Phase Status table note: "when CLAUDE.md and TASKS.md disagree, TASKS.md wins" | ✅ AUTO |
| CLAUDE.md Phase Status is quick-glance only, always update TASKS.md first | `IMPLEMENTATION_WORKFLOW.md` Step 7.1 table: "Whole phase just finished → update TASKS.md + CLAUDE.md both" | ✅ AUTO |

**Gap check:** CLAUDE.md is exactly 150 lines (verified: `wc -l CLAUDE.md = 150`). At the line limit but not over. ✅

---

#### Weakness 2 — No Automated Enforcement

| Lesson | Enforcement | Status |
|---|---|---|
| Self-review checklist is the only backstop — treat it as mandatory | `IMPLEMENTATION_WORKFLOW.md` Step 5 SELF-REVIEW — full checklist with security/correctness/concurrency/FE sections | ✅ AUTO |
| Long-term: add `grep -r "localStorage" fe/src/` CI check | No CI grep check exists for localStorage | ❌ GAP |
| Long-term: `go vet ./...` + custom linter for gin in service layer | No custom linter rule exists | ❌ GAP |
| Long-term: pre-commit hook `wc -l CLAUDE.md → fail if > 150` | No pre-commit hook configured for CLAUDE.md size | ❌ GAP |

**Action required for gaps:** These three CI/lint checks are explicitly called out as "long-term" in LESSONS_LEARNED §0.6 Weakness 2. They are not yet implemented. Until they are, the only safety net is Step 5 SELF-REVIEW.

---

#### Weakness 3 — Document Staleness with No Signal

| Lesson | Enforcement | Status |
|---|---|---|
| Add `> Last verified: YYYY-MM-DD` to each Layer 2 and Layer 3 doc | `IMPLEMENTATION_WORKFLOW.md` has version date (v1.1 · 2026-05-10). `PROCEDURE_INDEX.md` has "Last updated: 2026-05-10" | ⚠️ PROC |
| At end of each phase, reconcile specs against API contract and schema | No automated reconciliation step — only flagged as a habit | ❌ GAP |

**Gap note:** The spec files (Spec1–Spec9) and `MASTER_v1.2.md` do not all have explicit "last verified" dates. This is a known gap from LESSONS_LEARNED §0.6 Weakness 3 — not yet resolved.

---

#### Weakness 4 — Uneven Task Granularity

| Lesson | Enforcement | Status |
|---|---|---|
| Tasks expected to take > 90 min → break before starting | `IMPLEMENTATION_WORKFLOW.md` Step 2 PLAN rules: "tasks with 3+ distinct files or crossing two service layers → break down" | ⚠️ PROC |
| Signal for splitting: 3+ files to create, or crosses two service layers | Documented in `LESSONS_LEARNED_v3.md §7.5` Split Signals table | ⚠️ PROC |

---

#### Weakness 5 — Navigation-only index files

| Lesson | Enforcement | Status |
|---|---|---|
| Replace DOC_INDEX.md with comprehensive system guides | `docs/be/BE_SYSTEM_GUIDE.md` and `docs/fe/FE_SYSTEM_GUIDE.md` exist and are referenced in `CLAUDE.md` | ✅ AUTO |
| Each guide is the single entry point for its side | `IMPLEMENTATION_WORKFLOW.md` Step 1 READ: "Not sure which doc to open? → see DOC_MAP.md" | ✅ AUTO |

---

#### Weakness 6 — FE tasks without a visual model

| Lesson | Enforcement | Status |
|---|---|---|
| Step 0 FE Pre-Task Phase: READ SPEC → DRAW Wireframe → DECOMPOSE → WRITE TASK ROWS | `IMPLEMENTATION_WORKFLOW.md` Step 0 (entire section, steps 0a–0d) | ✅ AUTO |
| FE task row must have `spec_ref` field | `IMPLEMENTATION_WORKFLOW.md` Step 0c: "A task with no spec_ref is not ready to start" | ✅ AUTO |
| FE task row must have `draw_ref` field | `IMPLEMENTATION_WORKFLOW.md` Step 0c DECOMPOSE table format includes `draw_ref` column | ✅ AUTO |
| Wireframe saved to `docs/fe/wireframes/[page].md` | `IMPLEMENTATION_WORKFLOW.md` Step 0b: "Save to: docs/fe/wireframes/[page-name].md" | ✅ AUTO |
| New FE page type in PROCEDURE_INDEX → STOP, ask user first | `PROCEDURE_INDEX.md` row #9: "New FE page with no spec → STOP → ask user" | ✅ AUTO |

---

#### Weakness 7 — Spec skipped during READ phase

| Lesson | Enforcement | Status |
|---|---|---|
| If task touches a domain with a spec → read spec BEFORE forming any plan (hard stop) | `IMPLEMENTATION_WORKFLOW.md` Step 1 "Spec gate (blocking)" — explicit YES/NO rule | ✅ AUTO |
| Domains requiring spec read: Auth · Products · Menu/Checkout · Orders · Payment · QR/POS · Staff · Admin Dashboard | `CLAUDE.md` §"READ step — spec check rule" lists all 8 domains + skip cases | ✅ AUTO |
| Skip spec read only for: infra, test setup, pure refactor, tooling | `CLAUDE.md` §"READ step" + `IMPLEMENTATION_WORKFLOW.md` Step 1 spec gate | ✅ AUTO |

---

#### Weakness 8 — No procedure check before reading code

| Lesson | Enforcement | Status |
|---|---|---|
| Before READ: run procedure check (Is task in TASKS.md? Is there a spec? If neither → STOP and ask) | `CLAUDE.md` §"Before every task — procedure check (runs before READ)" — 3-step check | ✅ AUTO |
| Full procedure-to-task mapping | `docs/PROCEDURE_INDEX.md` — 12 task types with required procedure for each | ✅ AUTO |
| "Neither task in TASKS.md nor spec exists" → ask user, do NOT read files first | `PROCEDURE_INDEX.md` rows #3, #9, #10 → "STOP → ask user" | ✅ AUTO |

---

### SECTION C — Phase 4 Anti-Patterns (§1.2 + §6)

Every anti-pattern from §1.2 and the Phase 4 table is traced here to its enforcement location.

| Anti-Pattern | Correct Approach | Enforced Where | Status |
|---|---|---|---|
| ALTER TABLE without `sqlc generate` | Run `sqlc generate` immediately after any ADD/DROP COLUMN migration | `IMPLEMENTATION_WORKFLOW.md` Step 6 TEST table: "DB migration (ADD/DROP COLUMN) → run sqlc generate immediately" | ✅ AUTO |
| goose not available locally | Use `docker exec mysql ...` workaround + manually insert goose_db_version | `LESSONS_LEARNED_v3.md §1.2` (documented, not automated) | ⚠️ PROC |
| Middleware without injected dependency | `AuthRequired(checker IsActiveChecker)` — dependency via parameter, not global | `IMPLEMENTATION_WORKFLOW.md` Step 4 BE rules: "Middleware that needs Redis/service must receive it as constructor parameter" | ✅ AUTO |
| Response field name drift (`image_url` vs `image_path`) | Field name in JSON = field name in DB column. No renaming in handler. | `IMPLEMENTATION_WORKFLOW.md` Step 4 "Field names to verify" table | ✅ AUTO |
| Service calls wrong query (ListProducts vs ListProductsAvailable) | When adding filtered query, update service to use it immediately | `IMPLEMENTATION_WORKFLOW.md` Step 5 SELF-REVIEW correctness: "All DB-mutating operations use the correct query variant" | ⚠️ PROC |
| Status code conflict between two docs | TASKS.md wins. Semantic: 422 = business rule, 409 = resource state conflict | `CLAUDE.md` + `IMPLEMENTATION_WORKFLOW.md` Step 1 READ: "two docs contradict → ⚠️ FLAG, TASKS.md wins" | ✅ AUTO |
| Payment service creates record but never calls gateway | Pattern: validate → create DB record → call gateway → return URL | `IMPLEMENTATION_WORKFLOW.md` Step 4 BE rules (payment section in SELF-REVIEW) | ⚠️ PROC |
| Webhook does not verify amount | Verify `gatewayAmount == dbAmount` after HMAC, before updating DB | `IMPLEMENTATION_WORKFLOW.md` Step 4 BE: "After webhook HMAC: verify gatewayAmount == dbPayment.Amount" | ✅ AUTO |
| WS event payload doesn't match spec | Grep BE service for actual marshal payload before writing FE handler | `IMPLEMENTATION_WORKFLOW.md` Step 5 SELF-REVIEW frontend: "After receiving order_status_changed, always fetch order" | ⚠️ PROC |
| WS event doesn't include new status | Don't guess status from event type — always fetch order after event | `IMPLEMENTATION_WORKFLOW.md` Step 5 SELF-REVIEW frontend section | ✅ AUTO |
| FE Docker image not rebuilt after adding new page | After any new FE page: `docker compose up -d --build fe` | `IMPLEMENTATION_WORKFLOW.md` Step 6 TEST: "New FE page/component → docker compose up -d --build fe" | ✅ AUTO |
| HTTP method mismatch (PATCH vs PUT) | FE uses PATCH for partial updates. Verify against BE route registration. | `IMPLEMENTATION_WORKFLOW.md` Step 5 SELF-REVIEW frontend + Step 4 FE rules | ✅ AUTO |
| `binding:"required"` on int field rejects 0 | Use `binding:"min=0"` not `binding:"required,min=0"` for numeric fields | `IMPLEMENTATION_WORKFLOW.md` Step 4 BE rules: "`binding:\"min=0\"` not `\"required,min=0\"`" | ✅ AUTO |
| Admin page calls `/products` instead of `/products/all` | Admin must use `/products/all` (Manager+) not public endpoint | `IMPLEMENTATION_WORKFLOW.md` Step 5 SELF-REVIEW frontend: "Admin API calls use `/products/all`" | ✅ AUTO |
| Guest JWT `sub="guest"` stored in FK column | `role == "customer"` → `created_by = NULL`. Guest ownership check via `table_id` not `created_by` | `IMPLEMENTATION_WORKFLOW.md` Step 4 BE rules: "Guest JWT: store NULL in created_by FK column" | ✅ AUTO |
| `map[string]string` passed as `json.RawMessage` | `json.Marshal(params)` first before passing to function expecting `json.RawMessage` | `LESSONS_LEARNED_v3.md §6` Phase 4 table (documented, not in workflow) | ❌ GAP |
| Named return using `error` keyword as variable name | Always name error return: `(served int64, total int64, err error)` | `LESSONS_LEARNED_v3.md §6` Phase 4 table (documented, not in workflow) | ❌ GAP |
| Copy to provide "full context" in each spec | Write reference, never copy. One fact, one home. | `docs/base/LESSONS_LEARNED_v3.md §5 Rule 1` + document hierarchy in `CLAUDE.md` | ✅ AUTO |
| CLAUDE.md > 150 lines | Extract to MASTER or spec. Enforce via `wc -l CLAUDE.md`. | `CLAUDE.md` header: "Max 150 dòng". Currently exactly 150 lines. | ⚠️ PROC |

---

### SECTION D — Architecture Rules (§2)

| Lesson | Enforced Where | Status |
|---|---|---|
| 3-tier document hierarchy: CLAUDE.md (map) → docs/core (shared facts) → docs/spec (domain) | `CLAUDE.md` §"Document Map (3 Tầng)" + `LESSONS_LEARNED_v3.md §2.1` | ✅ AUTO |
| Each type of information has exactly one home (DDL → migrations, tokens → MASTER, rules → MASTER) | `CLAUDE.md` Single Sources table + `LESSONS_LEARNED_v3.md §2.2` table | ✅ AUTO |
| BE layer order strict: handler → service → repository → db | `IMPLEMENTATION_WORKFLOW.md` Step 4 BE rules: "No business logic in handlers. No DB queries in services." | ✅ AUTO |
| FE state: server → TanStack Query · client → Zustand · forms → RHF+Zod | `CLAUDE.md` §Architecture + `IMPLEMENTATION_WORKFLOW.md` Step 4 FE rules | ✅ AUTO |
| Access token in Zustand only — never localStorage | `IMPLEMENTATION_WORKFLOW.md` Step 4 FE: "Access token: Zustand in-memory ONLY — never localStorage" | ✅ AUTO |

---

### SECTION E — Spec & Task Chain Rules (§7)

| Lesson | Enforced Where | Status |
|---|---|---|
| 4-level chain: BRD → SRS → Spec → Task (every task traceable to BRD) | `LESSONS_LEARNED_v3.md §7.1` transformation chain (documented) + `PROCEDURE_INDEX.md` | ⚠️ PROC |
| Spec section completeness test (Gate 3) — 8 required elements | `LESSONS_LEARNED_v3.md §7.3` Gate 3 checklist | ⚠️ PROC |
| FE task row format requires `spec_ref` + `draw_ref` | `IMPLEMENTATION_WORKFLOW.md` Step 0c + `LESSONS_LEARNED_v3.md §7.4` | ✅ AUTO |
| Split by behavior boundary, not file count | `LESSONS_LEARNED_v3.md §7.5` Split Signals table | ⚠️ PROC |
| Chain break protocol: no spec_ref → ❓ CLARIFY, not in BRD → 🔴 STOP | `PROCEDURE_INDEX.md` "No Procedure Exists" protocol + `LESSONS_LEARNED_v3.md §7.6` | ✅ AUTO |
| 8 quality gates Claude runs per task | `LESSONS_LEARNED_v3.md §7.7` (documented). Partially enforced by IMPLEMENTATION_WORKFLOW.md 7-step loop. | ⚠️ PROC |

---

## STEP 3 — Gap Summary

### Gaps that are acknowledged as "long-term" in LESSONS_LEARNED (known, accepted)

| Gap | Risk Level | Mitigation Until Fixed |
|---|---|---|
| No `grep -r "localStorage" fe/src/` CI check | Medium | Step 5 SELF-REVIEW frontend checklist |
| No `go vet` + custom linter for gin in service layer | Medium | Step 5 SELF-REVIEW architecture checklist |
| No pre-commit hook for `wc -l CLAUDE.md > 150` | Low | Manual check — currently at exactly 150 lines |
| No automated phase-end reconciliation (spec vs API contract) | Medium | ⚠️ FLAG rule when doc conflict detected at Step 1 |

### Gaps that are undocumented anti-patterns (not wired into workflow files)

| Gap | Where the Lesson Lives | Fix |
|---|---|---|
| `map[string]string` → `json.RawMessage` without `json.Marshal` | `LESSONS_LEARNED_v3.md §6` Phase 4 table only | Add to `IMPLEMENTATION_WORKFLOW.md` Step 4 BE rules |
| Named return using `error` keyword as identifier | `LESSONS_LEARNED_v3.md §6` Phase 4 table only | Add to `IMPLEMENTATION_WORKFLOW.md` Step 4 BE rules |
| Spec staleness: no "last verified" date on Spec1–Spec9 files | `LESSONS_LEARNED_v3.md §0.6 Weakness 3` | Add `> Last verified:` header to each spec file |

---

## STEP 4 — Enforcement Coverage Score

| Category | Total Lessons | ✅ AUTO | ⚠️ PROC | ❌ GAP |
|---|---|---|---|---|
| §0 Workflow rules | 8 | 5 | 3 | 0 |
| §0.6 Weakness mitigations | 14 | 9 | 2 | 3 |
| §1.2 + §6 Anti-patterns | 18 | 12 | 4 | 2 |
| §2 Architecture | 5 | 5 | 0 | 0 |
| §7 Spec & Task chain | 6 | 2 | 4 | 0 |
| **Total** | **51** | **33 (65%)** | **13 (25%)** | **5 (10%)** |

**Overall:** 65% of lessons are automatically enforced through files Claude reads every session. 25% rely on procedural discipline (checkable via SELF-REVIEW). 10% are documented but have no enforcement mechanism yet.

---

## STEP 5 — How Each Lesson Carries Forward

The enforcement chain works like this:

```
LESSONS_LEARNED_v3.md
  → (distilled into) →
    CLAUDE.md (session start — procedure check, prefix system, spec gate, TASKS.md wins rule)
    IMPLEMENTATION_WORKFLOW.md (7-step loop — every rule has a step that catches it)
    PROCEDURE_INDEX.md (task-type lookup — prevents reading code before requirements)
      → (runtime enforcement) →
        Step 1 READ — spec gate blocks planning without spec
        Step 4 IMPLEMENT — field name table, BE/FE rules prevent common mistakes
        Step 5 SELF-REVIEW — security/correctness/FE checklist catches what Step 4 missed
        Step 6 TEST — sqlc generate, Docker rebuild, build verification
        Step 7 DONE — LESSONS_LEARNED updated when new patterns discovered
```

**The loop is closed:** When a new mistake is discovered in Step 5 or Step 7, it goes into LESSONS_LEARNED, then gets promoted to IMPLEMENTATION_WORKFLOW.md so it becomes AUTO for the next session.

---

## STEP 6 — Recommended Fixes for Remaining Gaps

Listed in priority order (highest risk first):

1. **Add two Go anti-patterns to IMPLEMENTATION_WORKFLOW.md Step 4 BE rules:**
   - `json.Marshal(params)` before passing to `json.RawMessage` parameters
   - Named error return: always `(... err error)` not `(... error)`

2. **Add `> Last verified: 2026-05-10` to spec files** (Spec1–Spec9 + MASTER_v1.2.md) — prevents stale doc being treated as authoritative.

3. **Add CI check** (when Phase 7 CI work begins): `grep -r "localStorage" fe/src/ || exit 0` in GitHub Actions — auto-fail if token ever lands in localStorage.

4. **Add pre-commit hook** for `wc -l CLAUDE.md` — prevents CLAUDE.md from growing past 150 lines without a warning.

---

> `docs/base/LESSONS_REFLECTION_AUDIT.md` · Audited 2026-05-10 · Re-audit after Phase 7 begins.
