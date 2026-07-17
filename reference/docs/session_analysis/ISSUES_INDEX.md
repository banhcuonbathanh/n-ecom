# `session_analysis/` — Issues Index

> **What this file is:** a one-stop summary of every **issue / risk / solution** captured across the session folders below — plus a **codebase-impact** read on each: did it touch source code or not, how deep, and whether changing one page ripples to other pages.
>
> **Source of truth:** each row is summarized **from the actual files in each session folder** (`00_README.md` + `03_optimization_findings.md` / `02_working_patterns.md`). Open the linked folder for the full raw data. This file is a map, not a replacement.
>
> Keep this in sync: when a new dated folder is added under `session_analysis/`, add its session block here.

---

## Legend — Codebase Impact

| Tag | Meaning |
|---|---|
| 🟢 **Doc-only** | No source code touched — docs / specs / process rules only. |
| 🟡 **Shallow** | Source touched, but isolated to 1–2 files in one layer; no cross-page effect. |
| 🟠 **Cross-layer** | Touches multiple files across layers (e.g. FE hook + BE service + DB). |
| 🔴 **Cross-page** | A change here ripples to **multiple pages/views** — must verify all of them. |

| Status | Meaning |
|---|---|
| ✅ Fixed | Solution implemented this session. |
| 🔧 Candidate | Diagnosed, fix proposed, **not yet done** — owner to decide. |
| ⚠️ Flagged | Surfaced but intentionally left untouched (out of scope / pre-existing). |

---

## Session blocks

### 1. [`2026-06-05_oc-epic/`](2026-06-05_oc-epic/) — Order Consistency (menu preview ≠ saved order)
**Touched code: YES — 🔴 Cross-page.** The deepest session. A single order-create change rippled across **menu → checkout → CartDrawer add-to-order → order/[id] → admin Overview (WaitingSection + PrepPanel) → KDS**. Touched DB (migration 016) → contract → FE payload builder → all read views.

| # | Issue | Risk | Solution | Impact |
|---|---|---|---|---|
| OC-1 | Menu preview promised customization (`filling` Thịt/Mộc nhĩ, canh có/không rau) the BE never stored. | Customer sees one thing, kitchen/admin/order page see another → wrong food served. | `filling` column added (mig. 016) + sqlc; contract honors `filling` + `combo_items`. | 🔴 Cross-page |
| OC-2 | **Combo double-count bug** — combo header price summed *with* its sub-items. | Wrong total (reported **72.000đ** instead of **42.000đ**); billing error. | Header `unit_price`=0; sub-items carry money. `total_amount` correct. | 🟠 Cross-layer |
| OC-3 | **5 order-POST entry points** built `items[]` differently (menu / checkout / add-to-order / POS / TableGrid). | Structural root of the divergence; every new field can drift again. | 3 cart-driven paths consolidated into one `src/lib/order-payload.ts`; rule added to `fe/CLAUDE.md`. | 🔴 Cross-page |
| OC-4 | Read views didn't render `filling`. | Saved order/admin/KDS show "không nhân" regardless of choice. | DishRow + WaitingSection + PrepPanel + KDS now read real `filling`+`note`. | 🔴 Cross-page |
| — | Combo pricing invariant undocumented ("header=label price 0; sub-items carry money"). | Allowed the double-count bug to exist silently. | ✅ Added to `MASTER_TASK.md` Critical Rules. | 🟢 Doc-only |
| — | No map of "where order items get serialized" (2 serializers, one under-built). | Scattered serializers = silent cause of page divergence. | ✅ Table added to `be_code_summary/BE_API_DTO.md §Orders`. | 🟢 Doc-only |
| — | FE cart `combo_items` dropped `product_id` (BE contract needs it). | Type/contract drift → future combo bugs. | 🔧 Candidate — shared/generated type or paired note. | 🟡 Shallow |
| — | `db-migration` skill hardcodes "highest migration = 009" (real next was 016). | Stale number costs a verify step, erodes doc trust. | 🔧 Candidate — replace with `ls be/migrations \| tail -1`. | 🟢 Doc-only |
| — | 2 pre-existing failing FE tests (`clearCart`/orderNote, `CART_CONFIG` key). | "2 failures" becomes the normal baseline = noise. | ⚠️ Flagged — unrelated to OC, left as-is. | 🟡 Shallow |
| — | `CLAUDE.md` doc lag (stale branch + "Done this session"). | Session starts from a false premise. | 🔧 Candidate — `/handoff` should reconcile branch + current work. | 🟢 Doc-only |
| — | No local verification cheatsheet (seed creds, qr_tokens, staff-token GET). | Re-grep `seed/main.go` every session; guest-ownership blocks GETs. | 🔧 Candidate — tiny verification doc. | 🟢 Doc-only |

---

### 2. [`2026-06-05_scope-guardrail/`](2026-06-05_scope-guardrail/) — Why the AI changes code the owner didn't ask for
**Touched code: NO — 🟢 Doc-only.** Process/discipline fix. Edited only `CLAUDE.md` + `LESSONS_LEARNED_v3.md`. No source code.

| # | Issue (root cause) | Risk | Solution | Impact |
|---|---|---|---|---|
| C1 | AI fills ambiguous requests ("do a bit more") with its own guess instead of asking. | Delivers A+B+C when only A was asked. **Residual risk** — can't be fully fixed by a rule. | Behavioral: must ask on vague asks (also needs clearer owner asks). | 🟢 Doc-only |
| C2 | "Helpful" bias overrides "minimum solution" — fixes nearby code while editing. | Unwanted refactors/renames in untouched code. | ✅ Scope contract: "touch only listed files." | 🟢 Doc-only |
| C3 | ALIGN confirmed *intent*, not *exact files*. | Approval of *what* ≠ approval of *where* → drifts into adjacent files. | ✅ Scope contract: exact file list at ALIGN. | 🟢 Doc-only |
| C4 | Chained edits with no stop point (fix 1 → reveals 2 → fix inline → touches 3). | Rides the chain far from the original request. | ✅ Scope contract: STOP at first file not on list. | 🟢 Doc-only |
| C5 | No cheap undo — work piled up uncommitted. | Over-reach un-picked by hand (messy, error-prone). | ✅ Git checkpoint commit before every task. | 🟢 Doc-only |
| — | `CLAUDE.md` is 250 lines, over its own 150-line cap. | Pre-existing bloat. | ⚠️ Flagged — out of scope. | 🟢 Doc-only |

---

### 3. [`2026-06-05_client-order-data-trace/`](2026-06-05_client-order-data-trace/) — Client Order Page data-flow trace
**Touched code: NO — 🟢 Doc-only** (read-only append to a reference doc). But the trace **surfaced live code discrepancies** — these are real candidates that *would* touch code if actioned.

| # | Issue | Risk | Solution | Impact |
|---|---|---|---|---|
| A1 | FE SSE branches `order_init` + `order_completed` are **dead** — BE never publishes them (`delivered` arrives via `order_status_changed`). Reference doc M1 wrongly claims the event exists. | Doc is actively misleading; dead FE code. | 🔧 Candidate (**P1**) — delete dead branches OR have BE emit `order_completed`; fix M1 section. | 🟡 Shallow (if actioned) |
| A2 | `queryClient.invalidateQueries(['order', id])` on qty-update is a **no-op** — nothing populates that key; page reads from `useOrderSSE` useState. | Dead code; misleads future readers about state source. | 🔧 Candidate (**P2**) — remove, or migrate page to TanStack Query. | 🟡 Shallow |
| A3 | Page violates the stated rule "server state → TanStack Query" — uses bespoke SSE+useState+localStorage. | Not necessarily wrong (SSE needs custom handling) but confuses future readers. | 🔧 Candidate (**P3**) — carve an explicit SSE exception in `fe/CLAUDE.md`. | 🟢 Doc-only |
| B1 | MASTER-first ambiguity for **doc-only tasks** — rule is framed in code/token terms; read-only doc append fell in a grey zone (registration skipped). | Per-task hesitation; unclear discipline. | 🔧 Candidate — one line in CLAUDE.md MASTER rule clarifying pure-doc edits. | 🟢 Doc-only |
| B2 | Tracing this page needed reading **7 files across FE+BE** — no single doc maps the order data flow. | Every future data-flow question re-traces from scratch. | 🔧 Candidate — promote the "Data Management — FE & BE" section into a reusable spot (link from `CLIENT_QR_FLOW.md`). | 🟢 Doc-only |

---

## Cross-cutting takeaways

- **The only code-touching session was OC**, and it was 🔴 cross-page by nature — the lesson is that **order data is a cross-page concern**: one payload/serializer feeds menu, order page, admin Overview, and KDS at once. Always verify all of them together.
- **`order-payload.ts` is now the single funnel** for cart→order payloads (OC-3). Any new order field must go through it + touch all serializers (OC `BE_API_DTO §Orders` map).
- **Two sessions were pure process/doc** (scope-guardrail, data-trace) — they touched no source but produced the Scope Guardrail rule and surfaced real dead-code candidates (A1/A2) worth a follow-up task.
- **Recurring doc-debt theme** across sessions: stale `CLAUDE.md` (branch, line cap), stale skill numbers (migration 009), and no verification cheatsheet — all 🟢 doc-only, all cheap, all erode trust until fixed.
