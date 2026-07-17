# SPEC_GUIDE — Rules for Writing and Completing Specs

> How to create, update, review, and close a spec.
> Read this before writing any new spec or modifying an existing one.

---

## 1. When to Write a Spec

Write a spec **before any code** when the work:
- Introduces a new domain or subsystem (new BE service, new FE section)
- Changes an API contract that other specs depend on
- Defines rules that apply across multiple tasks (auth rules, payment flow, RBAC)

**Skip a spec** when the work is:
- Pure infra / DevOps (Dockerfile, CI pipeline, env vars)
- Test setup with no new behaviour
- Pure refactor that doesn't change observable behaviour
- A small bug fix contained within one file

---

## 2. Required Sections (every spec must have all of these)

```
§1  Header block        — ID, domain, version, status, dependencies, branch
§2  Context / Why       — what problem this solves, what already exists
§3  Scope               — what IS in scope, what is NOT in scope
§4  Rules & Constraints — business rules, RBAC, error handling, edge cases
§5  API / Data Contract — endpoints, request/response shapes, error codes
§6  Acceptance Criteria — numbered AC list, one testable scenario per row
§7  Gap Log             — known unknowns and their resolution status
§8  Changelog           — version history with date and what changed
```

Optional but encouraged:
- `§9  Test Plan` — which AC to cover in unit vs integration tests
- `§10 Source Docs` — cross-references to API_CONTRACT, MASTER, DB_SCHEMA

---

## 3. Definition of Done (per status level)

### Draft → Approved
- [ ] All 8 required sections present and non-empty
- [ ] Every AC is testable (has a concrete trigger and expected result)
- [ ] All dependencies listed (which other specs this relies on)
- [ ] Owner has read and confirmed in conversation

### Approved → In Dev
- [ ] Task rows added to `docs/tasks/MASTER_TASK.md`
- [ ] Each task row references this spec ID
- [ ] SPEC_INDEX.md status updated to `In Dev`

### In Dev → Built
- [ ] All task rows in MASTER_TASK.md marked ✅
- [ ] Code compiles and runs without errors
- [ ] SPEC_INDEX.md status updated to `Built`

### Built → Verified
- [ ] Every AC in §6 manually confirmed in running system (or covered by automated test)
- [ ] No open gaps in §7
- [ ] SPEC_INDEX.md status updated to `Verified`

### Verified → Archived
- [ ] Spec has been superseded by a newer version, OR feature was removed
- [ ] A note in §8 Changelog explains why it was archived
- [ ] SPEC_INDEX.md row updated, old file kept (never deleted — git history)

---

## 4. How to Update an Existing Spec

**Minor update (add a rule, fix a typo, clarify wording):**
- Edit the file in place
- Bump the minor version (v1.0 → v1.1)
- Add a Changelog entry with date and what changed
- Do NOT change the filename

**Major update (new sections, different contract, breaking changes):**
- Bump the major version (v1.x → v2.0)
- Add a summary at the top: `> **v2.0 NOTE:** replaces §X — reason`
- Add a full Changelog entry
- Do NOT create a new file — update in place, bump version in filename only if it was already versioned in the name

**When a gap is found during implementation:**
1. Add it to §7 Gap Log immediately (don't wait for a full rewrite)
2. Assign it a Gap ID: `GAP-{spec_id}-{sequence}` (e.g., `GAP-01-7`)
3. Mark it `🔴 Open` until resolved
4. When resolved, update the row to `✅ Resolved` with the version it was fixed in
5. Copy the resolved gap to SPEC_INDEX.md Gap Log table

---

## 5. Acceptance Criteria Rules

Each AC row must have:
- **Scenario** — one sentence describing the trigger (user action, API call, system event)
- **Expected** — one sentence describing the exact observable outcome

**Good AC:**
> AC-3 | Staff submits login with correct credentials | `200 OK` + `access_token` in body + `refresh_token` in httpOnly cookie

**Bad AC (too vague):**
> AC-3 | Login works | User is logged in

AC must be **testable by a human in a running system** without needing to read the code.

---

## 6. Naming & File Placement

```
docs/spec/Spec_{NN}_{Domain}_{vX.Y}.md
```

- Place all specs flat in `docs/spec/` — no subdirectories except `overview/` (developer briefs)
- Developer briefs (detailed implementation notes for a single page/component) go in `docs/spec/overview/`
- Register every new file in `SPEC_INDEX.md` immediately

---

## 7. Cross-References (what to link, what not to)

**Always link:**
- Dependencies: `> Phụ thuộc: Spec_01 (Auth), Spec_04 (Orders)`
- API contract section: `API_CONTRACT_v1.2.md §4`
- DB schema field names: `DB_SCHEMA_SUMMARY.md`
- RBAC rules: `MASTER_v1.2.md §3`

**Never duplicate:**
- Don't copy error codes from ERROR_CONTRACT — link to it
- Don't copy RBAC rules — reference MASTER §3
- Don't copy field definitions from DB_SCHEMA — reference it

One fact, one home. A spec defines **behaviour**. Shared facts live in the contract/core docs.

---

## 8. Spec Review Checklist (before marking Approved)

Run through this before asking for owner confirmation:

- [ ] Does every AC have a clear trigger + expected result?
- [ ] Is every dependency on another spec explicitly listed?
- [ ] Are all edge cases covered (empty state, error state, auth failure)?
- [ ] Does §5 API Contract match `API_CONTRACT_v1.2.md` exactly (no invented endpoints)?
- [ ] Does §4 Rules match `MASTER_v1.2.md §4` for business rules?
- [ ] Is the scope section explicit about what is NOT covered?
- [ ] Is the Gap Log empty, or are all gaps documented and assigned?

---

_Last updated: 2026-05-12_
