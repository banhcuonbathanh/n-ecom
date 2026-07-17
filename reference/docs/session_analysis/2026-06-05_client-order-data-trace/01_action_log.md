# Action Log — Client Order Page data-flow trace

> Every meaningful action in order. *What I did* / *why*. Code omitted — this is about the thinking.

## Phase 0 — Frame the task
- **Read the target `.md`** (`Client_Order_Page_Status_Routing_Reference.md`) first.
  *Why:* the request said "put info into above .md with title" — I needed the existing structure, tone, and the file:line tracing convention it already uses, so the new section would match (it traces every cell to `file:line`).
- **Decided: no MASTER_TASK row.** Judged this a read-only documentation append, not a code task → skipped registration.
  *Why:* CLAUDE.md's MASTER-first rule is framed around code/sessions sized in tokens; a doc-only append to an existing wireframe reference felt out of that scope. (Flagged in findings as a judgement call worth the owner's eye.)

## Phase 1 — Trace FE data management
- **Read `useOrderSSE.ts` in full.** *Why:* the page's data spine. Found the 3-layer model: localStorage cache → REST snapshot → SSE deltas, all held in `useState` (not TanStack Query). This was the key non-obvious finding.
- **Read `page.tsx` head (lines 1-120) + `types/order.ts`.** *Why:* to see how `order` is consumed (mutations, derived memo) and the exact `Order`/`OrderItem` shape. Spotted the `useMutation` + `invalidateQueries(['order', id])` calls and the `useCartStore` writes that don't feed render.
- **Read fe/CLAUDE.md (auto-surfaced).** *Why:* confirmed the project's stated rule "server state → TanStack Query", which the page actually violates — worth calling out as current-state vs rule.

## Phase 2 — Trace BE data management
- **Listed handlers + grepped routes.** *Why:* find where `GET /orders/:id`, `/events`, and the item PATCH/DELETE live. Initial `grep --include` failed (zsh glob), retried without it.
- **Read `order_handler.go:140-421`.** *Why:* the `Get` handler + `orderJSON()` response builder — the exact JSON shape FE receives, including guest-ownership-by-`table_id` swap and `item_status` derivation.
- **Read `main.go:228-251`.** *Why:* confirm the route table and middleware (which routes are chef+ vs guest-allowed).
- **Grepped + read `order_service.go`** publish helpers (`publishOrderEvent`, `publishItemEvent`), `itemStatus`, `maybeAutoReady`. *Why:* establish what events BE actually emits to Redis channel `order:{id}` and their payloads.
- **Read `sse/handler.go:21-70`.** *Why:* confirm the SSE endpoint is a pure Redis→SSE relay that adds no data (explains why FE must seed via REST).

## Phase 3 — Cross-check discrepancies
- **Grepped `be/internal/` for `order_init` / `order_completed`.** *Why:* FE has `case` branches for both; wanted to verify BE emits them. Result: **zero matches** → both FE branches are dead; the existing doc's M1 `order_completed` claim is wrong vs current BE. Documented as a FLAG, not a fix.

## Phase 4 — Write
- **Appended one new H1 section** to the `.md` via a single Edit (anchored on the last existing line).
  *Why one section, not scattered edits:* keeps the original Status-Routing content intact and the new data-management content self-contained under its own title, as asked.
- **Structured as 5 sub-parts:** (1) the single Order object, (2) FE management + 2 flags, (3) FE→BE mutations table, (4) BE→FE realtime table + dead-branch flag, (5) lifecycle diagram + persistence boundary. Every claim carries a `file:line`.
- **Offered** to fix the inaccurate M1 description; did not do it unprompted (scope discipline).

## Phase 5 — File the session
- **Read `session_analysis/README.md`** for the naming + layout convention, **read an existing entry** (`2026-06-05_scope-guardrail/00_README.md`) to match depth, then created this dated folder + files and added an Index row.
