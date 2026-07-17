# Optimization Findings — friction points + what was implemented

> 8 friction points observed this session. Each is a place where better files would have saved investigation steps.
> Items 2, 3, 4 were implemented this session (owner-approved). The rest are candidates for the owner to decide on.

## Implemented this session ✅

### #2 — No map of "where order items get serialized"
- **Problem:** I had to grep to discover 2 serializers (`orderJSON` in `order_handler.go`, `buildItemsJSON`/`GroupOrderJSON` in `group_service.go`). One was under-built — that scattering was a silent cause of the page divergence.
- **Fix applied:** Added a "Where order items get serialized" table to `docs/be/be_code_summary/BE_API_DTO.md §Orders` — each serializer, which pages it feeds, its per-item fields, plus "touch ALL when adding an item field." Also updated the stale `POST /orders` + `/orders/:id/items` request rows for the OC contract (filling + combo_items).

### #3 — Combo pricing invariant was undocumented
- **Problem:** "Header row = label, price 0; sub-items carry the money; never count both" had to be reverse-engineered from FE read views + a DB query. Its absence allowed the double-count bug.
- **Fix applied:** New row in `docs/tasks/MASTER_TASK.md` Critical Rules, next to "total_amount drift." Links to the BE_API_DTO detail.

### #4 — 5 order-POST entry points with divergent payloads (no doc)
- **Problem:** This is the structural root of the whole bug. menu / checkout / CartDrawer add-to-order / POS / TableGrid each built `items[]` differently.
- **Fix applied:** Consolidated the 3 cart-driven paths into one `src/lib/order-payload.ts` builder, then added a rule to `fe/CLAUDE.md` Critical Pointers: "all cart→order payloads MUST go through `order-payload.ts`." Now enforceable in review.

## Candidates (not yet implemented — owner to decide)

### #1 — `db-migration` skill hardcodes "highest migration = 009"
- Real next was 016. **Suggestion:** replace the static number with an instruction: "run `ls be/migrations | tail -1` to find the next number." Stale numbers cost a verification step and erode doc trust.

### #5 — FE cart types and BE DTOs drifted
- `combo_items` in the cart dropped `product_id` (type only had `product_name`), but the BE contract needs it. **Suggestion:** a note pairing the cart shape with the order-create contract, or a shared/generated type.

### #6 — No local verification cheatsheet
- I had to grep `seed/main.go` for the manager password (`Admin@123`), and a guest-ownership check blocked my verification GET (had to use a staff token). **Suggestion:** a tiny doc with seed credentials, table qr_tokens, and "use a staff token to GET any order."

### #7 — Doc lag in `CLAUDE.md`
- Branch name + "Done this session" block were stale (referenced already-finished P-ARCH; wrong branch). **Suggestion:** `/handoff` should always reconcile branch + current-work; when wrong, my first read of the session starts from a false premise.

### #8 — Two pre-existing failing FE tests
- `clearCart`/orderNote drift and a `CART_CONFIG` storage-key mismatch — unrelated to this work but add noise to every test run. **Suggestion:** fix the test/impl drift so "2 failures" doesn't become the normal baseline.

## Suggested priority order for the candidates

1. **#1** (trivial, high-trust-impact) — fix the migration-number staleness.
2. **#6** (saves verification time every session) — local verification cheatsheet.
3. **#8** (removes recurring noise) — fix the 2 drifting tests.
4. **#7** (process) — tighten `/handoff` reconciliation.
5. **#5** (larger) — align cart types with the order contract.
