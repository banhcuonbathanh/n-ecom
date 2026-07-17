# SPEC_{NN} — {Domain Name}

> **Copy this file.** Rename to `Spec_{NN}_{Domain}_v1.0.md`. Fill every section.
> Delete all `<!-- comment -->` blocks before marking Approved.
> Required sections: §1–§8. Optional: §9, §10.

---

## §1 Header

| Field | Value |
|---|---|
| **Spec ID** | `{NN}` |
| **Domain** | {Domain name} |
| **Version** | v1.0 |
| **Status** | `Draft` |
| **Branch** | `feature/spec-{NN}-{domain-slug}` |
| **Author** | {name or model} |
| **Date** | {YYYY-MM-DD} |
| **Dependencies** | Spec_{dep1} ({reason}), Spec_{dep2} ({reason}) |
| **Phase** | Phase {X} — {phase name} |
| **MASTER_TASK rows** | _{add after rows are created}_ |

<!-- STATUS OPTIONS: Draft · Approved · In Dev · Built · Verified · Archived -->
<!-- DEPENDENCIES: list every other spec this one relies on, and why -->

---

## §2 Context

<!-- 3–5 sentences. What problem does this solve? What already exists that this builds on or replaces? -->

{Describe the feature/domain and why it exists in this system.}

**What exists today:** {none / describe current state}
**What this spec adds:** {brief summary of new behaviour}

---

## §3 Scope

**In scope:**
- {bullet 1}
- {bullet 2}

**Out of scope (explicitly):**
- {anything a reader might assume is included but isn't}
- {neighbouring features handled in a different spec}

---

## §4 Rules & Constraints

<!-- Business rules, RBAC requirements, error handling, rate limits, edge cases.
     Cross-reference MASTER_v1.2.md §3 (RBAC) and §4 (business rules) instead of duplicating. -->

### 4.1 RBAC

| Role | Permission |
|---|---|
| `admin` | {full access / read-only / no access} |
| `manager` | {…} |
| `cashier` | {…} |
| `chef` | {…} |
| `staff` | {…} |

<!-- Reference: MASTER_v1.2.md §3 for role hierarchy -->

### 4.2 Business Rules

<!-- List every rule that isn't obvious from the API contract alone. -->

| Rule | Behaviour |
|---|---|
| {rule name} | {exact behaviour — not vague} |

### 4.3 Error Handling

<!-- Reference ERROR_CONTRACT_v1.1.md. Don't copy error codes — link them. -->

| Scenario | HTTP | Error Code |
|---|---|---|
| {scenario} | {4xx/5xx} | `{ERROR_CODE}` — see `ERROR_CONTRACT_v1.1.md` |

### 4.4 Edge Cases

- {edge case 1 — what happens}
- {edge case 2 — what happens}

---

## §5 API / Data Contract

<!-- BE specs: list every endpoint. FE specs: list every API call made by the UI.
     Shapes must match API_CONTRACT_v1.2.md exactly. Never invent new endpoints here — add them to the contract first. -->

### 5.1 Endpoints

#### `{METHOD} /api/v1/{resource}`

```
{METHOD} /api/v1/{resource}
Authorization: Bearer <access_token>
Role: {minimum role}

Request body:
{
  "field": "type"   // description
}

Response 200:
{
  "data": { ... }
}
```

<!-- Add one block per endpoint. -->

### 5.2 Data Models

```ts
interface {ModelName} {
  id:         string   // UUID
  // ...
}
```

---

## §6 Acceptance Criteria

<!-- Each row = one testable scenario. Trigger → Expected. No vague rows.
     Minimum: one AC per endpoint + one for each error path + one for each edge case in §4.4 -->

| # | Scenario | Expected |
|---|---|---|
| AC-1 | {trigger — what the user or system does} | {exact observable outcome} |
| AC-2 | {…} | {…} |

---

## §7 Gap Log

<!-- Document every unknown or ambiguity found while writing this spec.
     Never leave a gap unlabelled. Resolve before marking Built.
     Gap ID format: GAP-{spec_id}-{sequence} e.g. GAP-03-1 -->

| Gap ID | Severity | Description | Status | Resolution |
|---|---|---|---|---|
| — | — | No open gaps | — | — |

<!-- SEVERITY: 🔴 High (blocks impl) · 🟡 Medium (workaround exists) · 🟢 Low (cosmetic) -->
<!-- STATUS: 🔴 Open · ✅ Resolved -->

---

## §8 Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| v1.0 | {YYYY-MM-DD} | {author} | Initial draft |

---

## §9 Test Plan _(optional)_

<!-- Which ACs map to which test type. -->

| AC | Test Type | Notes |
|---|---|---|
| AC-1 | Unit | {service/function to test} |
| AC-2 | Integration | {endpoint + real DB} |
| AC-3 | Manual (Playwright) | {step-by-step scenario} |

---

## §10 Source Docs _(optional)_

| Need | File | Section |
|---|---|---|
| RBAC roles | `docs/core/MASTER_v1.2.md` | §3 |
| Business rules | `docs/core/MASTER_v1.2.md` | §4 |
| Realtime config | `docs/core/MASTER_v1.2.md` | §5 |
| JWT rules | `docs/core/MASTER_v1.2.md` | §6 |
| API shapes | `docs/contract/API_CONTRACT_v1.2.md` | §{N} |
| Error codes | `docs/contract/ERROR_CONTRACT_v1.1.md` | — |
| DB field names | `docs/be/DB_SCHEMA_SUMMARY.md` | — |
| BE patterns | `docs/be/BE_SYSTEM_GUIDE.md` | — |
| FE patterns | `docs/fe/FE_SYSTEM_GUIDE.md` | — |

---

_Spec_{NN}_{Domain} · v1.0 · {date}_
