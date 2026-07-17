# Action Log — OC Epic (Phase 0 → latest)

> Primary raw data. Every meaningful action in order, with the reasoning behind it.
> Format: **what I did** / **why**. Code omitted by design — this is about the thinking.

---

## Phase 0 — Understanding the request (no tools yet)

The owner gave 4 screenshots + 3 URLs and said pic 2 ≠ pic 1; wants all pages consistent.

**Decision before touching anything:** This was a *diagnosis* request, not yet an implementation request. `CLAUDE.md` rule — "task not on the list → register first, align before code." So I split the work deliberately: investigate → diagnose → get owner decision → register → only then code. This shaped the whole session.

---

## Phase 1 — Investigation (trace the data path end-to-end)

Mental model: data flows **menu preview → checkout payload → BE → DB → read views**. A page mismatch means data is lost at one hop. So I traced the whole pipe before concluding.

| Action | Why |
|---|---|
| Read `OrderSummary.tsx` + `cart.ts` (parallel) | Pic 1 is rendered here; needed to see how the "Tổng số món" preview is computed + how the cart stores items/filling/combo edits. |
| Read `menu/page.tsx` + located order files | The checkout payload is the single most important file — where the preview is either sent or lost. |
| Read `types/cart.ts` + `order/[id]/page.tsx` | Confirm `filling` exists on the cart item; understand how the order page reads/renders. |
| Grep BE for `filling` + read `expandCombo` | Confirm root cause on the BE side: no `filling` column anywhere; combos rebuilt from canonical template (ignoring edits). |
| Read `order_service.go` expandCombo + handler DTO | Confirm canonical expansion + that filling isn't stored. |

**Conclusion:** The preview shows 3 things the checkout never transmits — filling, edited combo contents, the canh có/không-rau split. Pics 2/3/4 all read the real DB order, so they agree with each other; only the preview lies.

**Why I then stopped and asked 2 questions (AskUserQuestion):** The *fix scope* depended entirely on intent I couldn't derive from code — "make BE store all this" is a multi-session epic; "make preview honest" is a one-file change. Guessing wrong wastes a lot of work. Q1: direction (BE honors preview vs make preview honest vs investigate-first). Q2: is filling a real per-order attribute or a browse-only label.

**Owner answers:** Make backend honor it; filling is a real per-order attribute.

---

## Phase 2 — Registration & planning

| Action | Why |
|---|---|
| Grep exact schema/DTO surface (order_items columns, CreateOrderItemInput, handler model) | Write a breakdown with real file names + accurate sizing, not hand-waving. |
| Presented OC-1→OC-4 breakdown + flags | Process requires showing plan + waiting. Pre-flagged 2 risks already seen: multiple POST entry points; dedicated column vs `note`. |
| (Owner: "add to master, top priority, solve first") | — |
| Read `MASTER_TASK.md`, then edited it (2 edits) | Needed exact format before inserting; added an overview row + a full detailed OC section. |

---

## Phase 3 — OC-1 (the `filling` column)

| Action | Why |
|---|---|
| Invoked `db-migration` skill | Migrations have a required sequence in this repo; the skill encodes it. |
| Verified the next migration number | **Skill said "highest is 009" — real next was 016.** Caught by listing the folder, but shouldn't have had to. (→ friction #1) |
| Read INSERT query, repo struct, generated model, original DDL | Place the column consistently + find every call site needing the new field. |
| Wrote migration 016, edited query + repo struct + 2 insert sites | The change. |
| `sqlc generate` → `go build` → `goose up` → verified column + constraint in live MySQL → ran tests | Verify at every layer: generated code compiles, migration actually applied, constraint actually enforces. Don't trust "should work." |
| Updated `MASTER_TASK` OC-1 → ✅ | Rule: update status after every task. |

---

## Phase 4 — OC-2 (the contract) — the pivotal phase

| Action | Why |
|---|---|
| Read `CreateOrder`, `expandCombo`, `ComboSnapshot`, handler DTO | Map the full create path before changing it. |
| **Queried the actual pic-2 order in the DB** | The 42k/72k numbers didn't add up from the FE story alone, so I looked at raw rows. |
| → Found a **pre-existing combo double-count** | Header row stored bundle price AND sub-items stored their prices; `total_amount` summed every row. Bigger bug than the 3 I came for — and the real driver of 72k. |
| Grep FE read views for combo-header handling | Decide the *correct* fix: every read view already hides the header → header price should be 0 (not sub-items). Let existing convention dictate the fix. |
| Queried combo price vs sum-of-parts for ALL combos | Check whether any combo is discounted (would make "header=0" wrong). All sum-of-parts → safe. Flagged discount case for future. |
| Implemented contract: filling + `combo_items` overrides + validation; header price = 0; both `/orders` and `/orders/:id/items` | Core change, applied to both endpoints since they share `expandCombo`. |
| Found a **2nd under-built serializer** (`buildItemsJSON` for admin overview) + filled it | It omitted the very fields the FE helper reads — another silent consistency cause. |
| Added 2 unit tests; updated `API_CONTRACT`; flagged `openapi.yaml` has no `/orders` paths | Lock behavior; document contract; surface the pre-existing doc gap instead of silently scaffolding a huge section. |
| Rebuilt BE → **live smoke test** (guest token → real POST → DB inspect) → cleaned up test order | Prove end-to-end against running stack, not just unit tests. Leave no test garbage in the DB. |
| Full BE suite; updated `MASTER_TASK` OC-2 | — |

---

## Phase 5 — OC-3 (the FE payload)

| Action | Why |
|---|---|
| Grep ALL order-POST entry points → found 5 | Flagged this risk earlier — fix one, miss another, and consistency re-breaks. Enumerate first. |
| Read checkout, CartDrawer, api-client | Understand each payload shape. |
| **Discovered cart `combo_items` had no `product_id`** (type only had `product_name`) | BE overrides need it. So OC-3 had to thread `product_id` through the cart type + every add-to-cart site. |
| Checked favourites add-combo (no combo_items) + ProductCard filling | Map all combo→cart and product→cart paths; found ProductCard topping-path dropped filling. |
| Built a single shared `lib/order-payload.ts`; wired menu + checkout + add-to-order through it | The structural root cause was *divergent payload builders*. One shared builder makes future drift impossible. |
| Threaded `product_id` into cart type + ComboCard + combo detail; added filling to ProductCard topping path | Supporting changes the builder needs. |
| Typecheck (found 2 pre-existing unrelated test errors) | — |
| Added builder unit test; **had to move it** so vitest's `include` glob picks it up; ran → 5 pass | Lock canh-split/filling/override logic. Test-location glob cost one extra step. (→ friction) |
| Rebuilt FE; updated `MASTER_TASK` OC-3 | — |

---

## Phase 6 — OC-4 (read views) + verification

| Action | Why |
|---|---|
| Read `overview.helpers` `toppingLabel` → rewrote to read real `filling` + `note` | One helper feeds both admin views (pics 3 & 4) — single edit fixes both. Previously it *guessed* nhân/rau from toppings. |
| Confirmed WaitingSection + PrepPanel both route through `toppingLabel`/`summarizePending` | Verify the single edit propagates. |
| Added `filling` to `OrderItem` type + `fillingLabel()`; updated order page DishRow + KDS variant | Render the variant on every read surface. |
| Made `filling` optional after typecheck failure | Old cached orders + test fixtures lack it; required would break them. Let the compiler reveal the blast radius. |
| Ran FE suite (2 pre-existing failures, unrelated) | — |
| Rebuilt FE → **live GET as manager** → confirmed `filling` flows through read JSON, total 20k correct → cleaned up | Final proof of the read path the FE consumes. (Used staff token because guest-ownership check blocked the GET — friction.) |
| Updated `MASTER_TASK` (epic ✅) + `CLAUDE.md` Current Work | Keep source-of-truth docs honest. |

---

## Phase 7 — Live browser (interrupted by owner)

| Action | Why |
|---|---|
| Queried for a free table (no active order) → Bàn 2 | Need a clean table to place a fresh order through the real UI. |
| Loaded Playwright tools; navigated to `/table/<qr_token>` → redirected to `/menu` | Establish the guest session to drive a full visual click-through. |
| (Owner interrupted here) | — |

---

## Phase 8 — Retrospective + doc improvements (this analysis)

| Action | Why |
|---|---|
| Owner asked for a full action list + how I think → produced the walkthrough | So owner can optimize files to support the AI. |
| Owner approved implementing optimization items 2, 3, 4 | — |
| Checked BE doc structure; placed serializer map in `BE_API_DTO.md §Orders` | "One fact, one home" — that file already documents `OrderJSON`. |
| Added combo-pricing invariant to `MASTER_TASK.md` Critical Rules | Sits with other data invariants (total_amount drift, no status column). |
| Added single-builder rule to `fe/CLAUDE.md` Critical Pointers | FE architectural rule belongs with FE must-dos. |
| Owner asked to save this discussion as raw data → created this folder | — |
