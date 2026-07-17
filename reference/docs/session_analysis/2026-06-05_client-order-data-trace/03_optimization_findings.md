# Optimization Findings — Client Order Page data-flow trace

> Friction points → concrete fixes. Plus the discrepancies found while tracing (these are product-doc/code issues, surfaced here for the owner to route).

## A. Discrepancies found in the page's code vs its reference doc

These are **factual**, traced to code — candidates for a real fix in the product, not just process notes.

| # | Finding | Evidence | Suggested route | Priority |
|---|---|---|---|---|
| A1 | FE SSE branches `order_init` and `order_completed` are **dead** — BE never publishes either string. `delivered` arrives via `order_status_changed {status:"delivered"}`. | grep `be/internal/` = 0 matches; `useOrderSSE.ts:84,118` vs `order_service.go` publishers | Decide: delete the dead FE branches, OR have BE emit `order_completed` for clarity. Either way, **fix the M1 section (line ~123) of the reference doc** which claims the event exists. | P1 (doc is actively misleading) |
| A2 | `queryClient.invalidateQueries(['order', id])` on qty-update success is a **no-op** — nothing populates that query key; the page reads from `useOrderSSE` useState. | `page.tsx:59` vs `useOrderSSE.ts` (state, not Query) | Either remove the dead invalidation, or migrate the page to TanStack Query to match the project's stated FE architecture rule. | P2 |
| A3 | Page violates the stated rule "server state → TanStack Query" (fe/CLAUDE.md). It's a bespoke SSE+useState+localStorage hook. | fe/CLAUDE.md "Architecture (Strict)" vs `useOrderSSE.ts` | Not necessarily wrong (SSE needs custom handling) — but the rule should carve out an explicit exception for SSE-driven pages so future readers aren't confused. | P3 |

## B. Process friction (doc/workflow tuning)

| # | Friction | Fix candidate | Priority |
|---|---|---|---|
| B1 | **MASTER-first ambiguity for doc-only tasks.** CLAUDE.md says register *any* task before touching *any* file, but is framed in code/token terms. A read-only append to an existing reference doc fell in a grey zone — I skipped registration. Was that right? | Add one line to CLAUDE.md's MASTER rule clarifying whether pure-doc edits (no code, no new file) need a row. Reduces per-task hesitation. | P2 |
| B2 | **Tracing this page required reading 7 files across FE+BE** because no single doc maps the order data flow. The work I just wrote could itself become that map. | Consider promoting the "Data Management — FE & BE" section pattern into a reusable spot (e.g. linked from `CLIENT_QR_FLOW.md`) so the next data-flow question doesn't re-trace from scratch. | P3 |
| B3 | First `grep --include=*.go` failed under zsh glob expansion — small wasted turn. | Known zsh gotcha; prefer `grep -rn ... --include='*.go'` quoted, or rg. Minor. | P4 |

## C. What went smoothly (keep doing)
- The reference doc's **`file:line` tracing convention** made the target format obvious and forced every new claim to be verifiable — high-quality output with low guesswork. Worth keeping as the house style for these docs.
- **Reading the target file first** before any tracing meant the appended section matched tone/structure on the first try (no rework).
