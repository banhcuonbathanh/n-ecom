# SPEC_INDEX — Master Spec Registry

> Single source of truth for all feature specs.
> **One row per spec.** Status, version, owner phase, and gap summary in one place.
> For rules on how to write/update specs → [`SPEC_GUIDE.md`](SPEC_GUIDE.md)
> For task-level status → [`docs/tasks/MASTER_TASK.md`](../tasks/MASTER_TASK.md)

---

## Status Lifecycle

```
Draft → Approved → In Dev → Built → Verified → Archived
```

| Status | Meaning |
|---|---|
| `Draft` | Being written — not yet reviewed with owner |
| `Approved` | Owner confirmed — ready for implementation |
| `In Dev` | Implementation in progress |
| `Built` | Code complete — not yet end-to-end tested |
| `Verified` | Tested + AC confirmed in running system |
| `Archived` | Superseded or feature removed |

---

## Naming Convention

```
Spec_{N}_{Domain}_{Version}.md
```

- `N` = two-digit number (01, 02 … 99)
- `Domain` = PascalCase, no spaces
- `Version` = vX.Y (increment minor for additions, major for rewrites)
- Example: `Spec_01_Auth_v2.md`

> **Current files use mixed naming** (Spec1_ vs Spec_2_ vs Spec_Admin_). Do not rename existing files — it breaks git history. Apply the convention to new specs only.

---

## Spec Registry

| ID | File | Domain | Version | Status | Phase | Gaps Open |
|---|---|---|---|---|---|---|
| 01 | [Spec1_Auth_Updated_v2.md](Spec1_Auth_Updated_v2.md) | Auth & Middleware | v2.0 | ✅ Verified | Phase 4 | 0 (Gap 5 & 6 resolved in v2.0) |
| 02 | [Spec_2_Products_API_v2_CORRECTED.md](Spec_2_Products_API_v2_CORRECTED.md) | Products API | v2.0 | ✅ Verified | Phase 4 | 0 (corrections applied from SPEC_CORRECTION_SHEET_v1.0) |
| 03 | [Spec_3_Menu_Checkout_UI_v2.md](Spec_3_Menu_Checkout_UI_v2.md) | Menu & Checkout UI | v2.0 | ✅ Verified | Phase 5 | 0 |
| 04 | [Spec_4_Orders_API.md](Spec_4_Orders_API.md) | Orders API | v1.0 | ✅ Verified | Phase 4 | 0 |
| 05 | [Spec_5_Payment_Webhooks.md](Spec_5_Payment_Webhooks.md) | Payment + Webhooks | v1.0 | ✅ Verified | Phase 4 | 0 |
| 06 | [Spec_6_QR_POS.md](Spec_6_QR_POS.md) | QR Ordering & POS | v1.0 | ✅ Verified | Phase 4+5 | 0 |
| 07 | [Spec_7_Staff_Management.md](Spec_7_Staff_Management.md) | Staff Management | v1.0 | ✅ Verified | Phase 4+8 | 0 |
| 08 | _(not created)_ | _(reserved / skipped)_ | — | ⬜ N/A | — | — |
| 09 | [Spec_9_Admin_Dashboard_Pages.md](Spec_9_Admin_Dashboard_Pages.md) | Admin Dashboard (Overview + Marketing) | v1.0 | ✅ Verified | Phase 8 | 0 |
| 09a | [Spec_Admin_Categories.md](Spec_Admin_Categories.md) | Admin: Categories CRUD | v1.0 | ✅ Verified | Phase 8 | 0 |
| 09b | [overview/INDEX.md](overview/INDEX.md) | Admin Overview — Developer Brief | v1.0 | 🔵 In Dev | Phase 9 | 0 |

**Totals:** 10 specs · 9 Verified · 1 In Dev · 0 open gaps

---

## Gap Log (cross-spec)

Gaps that were found during implementation and resolved in a later spec version.

| Gap ID | Spec | Description | Resolution | Version Resolved |
|---|---|---|---|---|
| GAP-01-5 | Spec 01 | "1 token per device" not implementable — no device_id in schema | Replaced with multi-token Option A policy | v2.0 |
| GAP-01-6 | Spec 01 | is_active behavior undefined — JWT valid 24h but account disabled | Added Redis cache check + ACCOUNT_DISABLED 401 | v2.0 |
| GAP-02-C | Spec 02 | Corrections from SPEC_CORRECTION_SHEET_v1.0 applied | Spec rewritten as CORRECTED version | v2.0 |

---

## Spec Coverage by Domain

| Domain | Spec ID | BE covered | FE covered |
|---|---|---|---|
| Auth | 01 | ✅ | ✅ (via Spec 03 FE auth flow) |
| Products | 02 | ✅ | ✅ (via Spec 03) |
| Menu & Checkout | 03 | — | ✅ |
| Orders | 04 | ✅ | ✅ (via Spec 03 SSE) |
| Payment | 05 | ✅ | ✅ (via Spec 06 POS) |
| QR + POS | 06 | ✅ | ✅ |
| Staff Management | 07 | ✅ | ✅ |
| Admin: Overview + Marketing | 09 | ✅ | ✅ |
| Admin: Categories | 09a | ✅ | ✅ |
| **Admin: Analytics · Ingredients · Tasks · Training** | — | ⬜ no spec yet — built ad-hoc | ⬜ no spec yet — built ad-hoc |
| **Phase 7 Testing** | — | ⬜ no spec yet | ⬜ no spec yet |

> **Gap:** The following are built but have **no spec** — write them when next touched:
> - Phase 7 (Testing + Go-Live) → `Spec_10_Testing_GoLive.md`
> - Admin Analytics · Ingredients · Tasks · Training pages (Spec 09 covers **only** Overview + Marketing)

---

## How to Add a New Spec

1. Copy [`SPEC_TEMPLATE.md`](SPEC_TEMPLATE.md) → rename using the convention above
2. Fill in all required sections (see template header for checklist)
3. Add a row to this index with status `Draft`
4. Get owner approval → change status to `Approved`
5. Add task rows to [`docs/tasks/MASTER_TASK.md`](../tasks/MASTER_TASK.md)
6. Update status here as implementation progresses

---

_Last updated: 2026-05-12_
