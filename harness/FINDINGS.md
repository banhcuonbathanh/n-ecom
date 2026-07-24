# FINDINGS.md — Findings Ledger & Improvement Loop (Primitive 10, verification family)

> Every finding raised with a flag prefix (`💡 ⚠️ 🚨 🔴 ❓`) gets **one row here** and is
> tracked to closure. This is the closed loop the flag taxonomy was missing: a flag is not
> "handled" by mentioning it in a report — it is handled when this ledger says `✅` or `⛔`.
>
> **One finding, one row. One home.** STATE.md may *summarize* open findings for the boss,
> but this file is the system of record — STATE links to `F#` IDs, it does not restate them.

---

## Why this exists

The harness could always *surface* a finding (the flag prefixes) and *design against* known
defects (`OVERALL_PLAN.md §6` lessons register — those are lessons from the reference corpus).
What it lacked was a place to **track a finding from our own work to resolution**, and a rule
to **turn a recurring finding into a rule change**. That is this file's job.

- Lessons register (`OVERALL_PLAN.md §6`) = defects in the *old system* we design against. Static.
- **Findings ledger (this file)** = things *we* spot while building. Live, status-tracked.
- When a finding here proves a *class* problem, it graduates into a rule (see §Kaizen).

## The capture rule (CLAUDE.md Hard Rule 7)

At **CHECKPOINT** (last step of every task), for each flag raised during the task:

1. Add a row to the ledger below with a fresh `F#` id (monotonic, never reused).
2. Set its status (almost always `🔵 open` at birth).
3. In STATE.md, reference it by id — do not paste the full finding a second time.

A task's CHECKPOINT is not complete until every flag it raised has a row. "I noticed X" with
no row is a dropped finding — the exact failure this ledger prevents.

**Sessions with no task count too** (owner rule 2026-07-24). A flag raised while answering a
question, reviewing a doc, or chatting has no CHECKPOINT to ride on — write its row here
before the session ends anyway, with `Task` = `chat` and `Session` = the day's checkpoint.

## Status lifecycle

| Status | Meaning | Exit condition |
|---|---|---|
| 🔵 open | Raised, not yet acted on | Someone starts the fix / doc change → 🟡 |
| 🟡 actioned | A fix, doc edit, or task is in flight | Change lands + is verified → ✅ |
| ✅ closed | Resolved by a **fix, a doc change, or an owner ruling** — with a pointer to the proof | terminal |
| ⛔ won't-fix | Owner ruled it out of scope / accepted the risk | terminal (records the ruling + date) |

A finding **never** closes by being mentioned again. It closes only against a concrete
artifact: a commit, a VERIFICATION receipt, a doc section, or a dated owner ruling. Put that
pointer in the **Home / action** column.

## Kaizen — findings → rule changes (the improvement system)

The point of the ledger is not bookkeeping; it is to stop the *class* of problem.

1. **Root-cause tag.** Give each finding a short root-cause slug (e.g. `concurrent-taskids`,
   `theme-ambiguity`, `schema-amend-request`). Reuse slugs across findings.
2. **The ≥2 rule.** When two or more findings share a root-cause slug, that is no longer an
   instance — it is a gap in the rules. **Register a harness task** (`H#`) whose AC is a
   change to the *rule* (CLAUDE.md, a PLAYBOOK, a schema convention, a gate) so the class
   cannot recur. Link the graduating findings to that task; close them when it verifies.
3. **Improvement sweep (at `/handoff`).** Scan `🔵`/`🟡` rows: anything stale > 3 sessions
   gets escalated to the boss in the handoff summary, and repeated root-causes get the ≥2
   check applied. This keeps the ledger from silently growing.

---

## Ledger

> Seeded 2026-07-22 (H-1) from the open flags previously scattered in STATE.md. Newest id on top.
> Severity mirrors the raising prefix: 🔴 STOP · 🚨 RISK · ⚠️ FLAG · 💡 SUGGESTION · ❓ CLARIFY.
> **Session** = the `STATE.md` checkpoint written when the flag was raised (the read-through);
> **Detail** = the plan/supplement/file section that argues it out. There is no chat transcript —
> these two are the durable record. *Line anchors are approximate (they drift as docs grow); the
> named § is the stable landmark — search for it if the line has moved.*

| ID | Date | Task | Sev | Root-cause | Summary | Status | Home / action | Session | Detail |
|---|---|---|---|---|---|---|---|---|---|
| F42 | 2026-07-24 | F-34 | ⚠️ | tooling-gap | **Two menu ACs are currently unprovable.** `T-2` demands **store unit tests** and every FE receipt in `FE_PLAN §9` is a 390×844 screenshot — but `PLAN.md §Stack` names no FE test runner and `TOOLS.md` still lists Playwright as `⬜ add as connected`. A slice cannot produce a receipt for a tool that was never pinned | 🔵 open | Plan default: pin **Vitest** (store/unit) + **Playwright** (screenshots) in `PLAN.md §Stack` and `TOOLS.md` **at F-2**, when versions get pinned anyway; close against the F-2 receipt | [Session 22 (F-34)](STATE.md) | [TASKS.md T-2 AC](TASKS.md) + [FE_PLAN §9](plans/customer_menu/customer_menu_FE_PLAN.md) |
| F41 | 2026-07-24 | F-34 | ⚠️ | unowned-pipeline | **Nothing serves the images the menu renders.** `image_path` → `buildImageURL()` (FE rule 14) → Caddy `reverse_proxy /uploads/* be:8080` ([DEVOPS.md §Caddy](DEVOPS.md)) — but no task makes the BE actually serve `/uploads`, and `C-1`'s seed AC never says where the seeded image files come from. `C-4b`'s card screenshots need both | 🔵 open | Plan default: **C-1** seeds `image_path` values + committed placeholder files; **C-2** mounts the static `/uploads` handler (one route, no upload endpoint — that belongs to `admin_products`' create flow). Close against the C-2 receipt showing a 200 on one seeded image path | [Session 22 (F-34)](STATE.md) | [BE_PLAN §4.2](plans/customer_menu/customer_menu_BE_PLAN.md) + [DEVOPS.md](DEVOPS.md) |
| F40 | 2026-07-24 | F-34 | ⚠️ | wire-contract-drift | **Combo field-name drift** (same class as F28): menu `PLAN §3.5`'s combo wire shape carries `"is_active"`, while `DB_SCHEMA §4.1` gives combos **`is_available`** and `BE_PLAN §4.3`'s `ListActiveCombos` filters on `is_available=1`. Separately, `products`/`combos` both carry `sort_order` (used in every `ORDER BY`) yet it appears in no wire shape — undecided whether the FE ever sees it | 🔵 open | Plan default: **`is_available` wins** (schema is canonical, `DB_SCHEMA §2` field-name law); `sort_order` stays **server-side only** — the FE renders the array in the order the BE returns. Amend menu `PLAN §3.5` when **C-3**'s curl receipt freezes the shape (gate 8) | [Session 22 (F-34)](STATE.md) | [PLAN §3.5](plans/customer_menu/customer_menu_PLAN.md) vs [DB_SCHEMA §4.1](DB_SCHEMA.md) |
| F39 | 2026-07-24 | F-34 | ⚠️ | unowned-route | **`/checkout` has no owner.** The menu's second checkout path (`source:'online'` + name/phone, menu `PLAN §4.4` #8) routes to `/checkout`, which `FE_PLAN §1` names *out of scope* — and no other plan folder claims it. So the **online** ordering path cannot complete even after `O-0F` ships | 🔵 open | Needs an owner ruling: either a `customer_checkout` page-plan set, or an explicit **v1 deferral** (QR-only launch — defensible for a dine-in restaurant). Ask before the O phase opens; graduates into [H-3](TASKS.md) | [Session 22 (F-34)](STATE.md) | [FE_PLAN §1](plans/customer_menu/customer_menu_FE_PLAN.md) |
| F38 | 2026-07-24 | F-34 | 🚨 | unowned-route | **The QR airlock `/table/[id]` is unowned — and it is the menu's default entry.** No plan folder covers the route, no TASKS row built it, and `cart.store.ts` lists `tableId`/`tableName` as state with **no action that writes them** (`FE_PLAN §5.2` has no `setTable`). `TableConfirmModal` would therefore read a table identity nothing ever sets, and the whole QR path stalls mid-session at `O-0F` | 🟡 actioned | **`T-3` registered** (`TASKS.md` Phase T) — the route + the `setTable(id, name)` action it adds to `FE_PLAN §5.2`. Close against the T-3 screenshot receipt | [Session 22 (F-34)](STATE.md) | [FE_PLAN §5.2](plans/customer_menu/customer_menu_FE_PLAN.md) + [PLAN §1](plans/customer_menu/customer_menu_PLAN.md) |
| F37 | 2026-07-24 | F-31 | 💡 | trust-boundary | Append mode has **two sources of truth** — the URL (`?add_to_order=<id>`, menu PLAN §4.4 #8) and the persisted store (`cart.activeOrderId`, §4.2); they disagree after a stale tab, a second phone, or a cleared store | 🔵 open | Plan default: **URL wins** when present, store is the same-device fallback (FE rule 2); close against the O-0F receipt | [Session 21 (F-31)](STATE.md#L38) | [FE_PLAN §10 F37 + §5.2](plans/customer_menu/customer_menu_FE_PLAN.md) |
| F36 | 2026-07-24 | F-31 | ⚠️ | unowned-shell | **The customer shell has no owner.** Three customer plans render "on the dark/orange shell", but no plan's file map contained `app/(customer)/layout.tsx` — and FE rule 8 forbids the raw hex a component would need to fake it. The first FE session would have had to invent an unscoped file | 🟡 actioned | `customer_menu_FE_PLAN.md` claims it — built in FE-M1/C-4a as the token-scope boundary; close against the C-4a receipt | [Session 21 (F-31)](STATE.md#L38) | [FE_PLAN §4.1/§4.2](plans/customer_menu/customer_menu_FE_PLAN.md) |
| F35 | 2026-07-24 | F-31 | ⚠️ | cache-key-drift | **`keys.ts` + FE cache policy are pre-pivot.** `FE_STATE §2` types the `products` key with `{page, category, q}` and carries a `cart: ['cart']` key; `§3` gives products 60 s and maps mutations onto `['cart']`. This page ships **no query params**, **no server cart** (client store since F-9), 5-min staleness, and needs a `combos` key that does not exist. The FE twin of F29 | 🔵 open | Build the factory as `products · product(id) · categories · combos · combo(id) · order(id)`, no params, no `cart`; 5-min `staleTime`. Amend `FE_STATE §2/§3` at C-4a | [Session 21 (F-31)](STATE.md#L38) | [FE_PLAN §4.3 + §10 F35](plans/customer_menu/customer_menu_FE_PLAN.md) |
| F34 | 2026-07-24 | F-31 | 🚨 | rule-keyed-by-name | **Canh is identified by *name* on the FE.** Menu PLAN §4.4 #4 filters soup out of lists, search and combo payloads via `isSoupName()` — a string match — while `BE_PLAN §4.2` seeds a real **CANH category** and the BE deliberately refuses name-matching in Go. Renaming a dish in `/admin/products` would silently break the canh gate, the double-canh guard (F30) and the payload builder at once | 🔵 open | Replace with `isCanhProduct(p) = p.category_id === CANH_CATEGORY_ID`, resolved once from the categories query — both sides then key off the same seeded fact; close against the T-2/O-0F receipts | [Session 21 (F-31)](STATE.md#L38) | [FE_PLAN §7.2 + §10 F34](plans/customer_menu/customer_menu_FE_PLAN.md) |
| F33 | 2026-07-24 | F-30 | ⚠️ | tx-map-drift | `BE_STATE.md §3`'s "place order" tx row locks stock rows `FOR UPDATE` (generic-shop shape); a restaurant order decrements no inventory (`OVERALL_PLAN §3.7` rule 3), so the menu's `POST /orders` tx holds writes only and reads the catalog outside it | 🔵 open | Add the restaurant row to `BE_STATE.md §3` when O opens; build to BE_PLAN §5.3 | [Session 20 (F-30)](STATE.md#L38) | [BE_PLAN §5.3 — the tx body](plans/customer_menu/customer_menu_BE_PLAN.md) |
| F32 | 2026-07-24 | F-30 | 💡 | order-number-source | `DB_SCHEMA §4.2` makes the Redis counter primary with an `order_sequences` fallback + a re-seed rule; an in-tx `ON DUPLICATE KEY UPDATE` upsert is race-free, has no re-seed failure mode, and is ample for one restaurant | 🔵 open | Plan default = DB-in-tx only, Redis counter unbuilt; confirm/deny at O phase, then reconcile `DB_SCHEMA §4.2` | [Session 20 (F-30)](STATE.md#L38) | [BE_PLAN §7.3 + §10 F32](plans/customer_menu/customer_menu_BE_PLAN.md) |
| F31 | 2026-07-24 | F-30 | ⚠️ | trust-boundary | `POST /orders` carries `table_id` + `source` in the body (menu PLAN §3.5) — authoritative-looking fields a client could point at another table | 🔵 open | Build to BE_PLAN §7.1: both derived from the guest JWT, disagreeing body value ⇒ `403`; close against the O-0 receipt | [Session 20 (F-30)](STATE.md#L38) | [BE_PLAN §7.1 — identity & trust boundary](plans/customer_menu/customer_menu_BE_PLAN.md) |
| F30 | 2026-07-24 | F-30 | ⚠️ | seed-convention | Double-canh trap: the FE strips soup from combo lines and sends it standalone, so a seeded `combo_items` template containing a canh row makes server-side expansion re-add it | 🔵 open | C-1 seed AC: templates carry no canh rows + a 0-row proof query; close against the C-1 receipt | [Session 20 (F-30)](STATE.md#L38) | [BE_PLAN §4.2 + §7.2](plans/customer_menu/customer_menu_BE_PLAN.md) |
| F29 | 2026-07-24 | F-30 | ⚠️ | cache-key-drift | `ARCHITECTURE §4` specifies `v1:{domain}:{entity}:{id}` keys @ 60 s TTL; four page plans + `OVERALL_PLAN §3.6` use `products:list` @ 5 min | 🔵 open | Plan default = short names + 5 min (matches FE `staleTime`); amend `ARCHITECTURE §4` when C-2 locks the Redis policy | [Session 20 (F-30)](STATE.md#L38) | [BE_PLAN §5.4 — key builders + TTL](plans/customer_menu/customer_menu_BE_PLAN.md) |
| F28 | 2026-07-24 | F-30 | ⚠️ | wire-contract-drift | `order_number` is `NOT NULL UNIQUE` in `DB_SCHEMA §4.3` and rendered by the FE ("Đơn #…"), but absent from the `POST /orders` 201 shape in menu PLAN §3.5 — the "Đơn #undefined" lesson's second half | 🔵 open | Include it in the create/append response DTO; menu PLAN §3.5 sample updated when C-2/O-0 receipts freeze shapes | [Session 20 (F-30)](STATE.md#L38) | [BE_PLAN §6.2 + §10 F28](plans/customer_menu/customer_menu_BE_PLAN.md) |
| F27 | 2026-07-24 | F-30 | 🚨 | schema-amend-request | **Online orders are unownable:** the table-less guest JWT identifies a guest, but `orders` has no column to store it (`DB_SCHEMA §4.3`), so `table_id IS NULL` orders fail every ownership gate — the exact old-system bug `OVERALL_PLAN §3.4` promises to fix | ✅ closed | **Closed 2026-07-24 by F-32** — `orders.guest_id CHAR(36) NULL, INDEX` written into [`DB_SCHEMA.md §4.3`](DB_SCHEMA.md) (the doc that owns it); ownership = `table_id` match **or** `guest_id` match. Migration `004` implements it; the online path of O-0 is unblocked | [Session 20 (F-30)](STATE.md#L38) | [BE_PLAN §10 F27 + §7.4 ownership gate](plans/customer_menu/customer_menu_BE_PLAN.md) |
| F26 | 2026-07-24 | F-30 | ⚠️ | wire-contract-drift | Combo line under-specified two ways: `DB_SCHEMA §7`'s payload sends a client `combo_items` override while menu PLAN §3.5 sends `combo_id + quantity + topping_ids`; and no doc says which rows a combo line's `topping_ids` land on | 🔵 open | Plan default: server expands from the DB template (client override ⇒ `422`), line toppings snapshot onto each allowed sub-item, header stays `NULL`; lock at O-0 and reconcile the two docs | [Session 20 (F-30)](STATE.md#L38) | [BE_PLAN §7.2 — expansion](plans/customer_menu/customer_menu_BE_PLAN.md) |
| F25 | 2026-07-22 | audit | 🚨 | concurrent-taskids | **Graduates F04** (≥2 met — id collisions in F-17/F-18/F-20/F-24 across ~8 sessions on one shared tree). Fix proposed: `NEXT_ID` counter at top of TASKS.md, bump+commit *before* work; one session per id; STOP+renumber on collision. **Hit again 2026-07-24 (H-4):** this session registered an `H-3` that another session had already claimed (route-ownership map) — caught at the receipt grep, renumbered to `H-4`; the collision class is still live | 🔵 open | H-2 (CLAUDE.md v2 + TASKS.md header) — owner apply/reject pending | [H-1 self-audit](STATE.md#L38) | [CLAUDE.md + TASKS.md header](../CLAUDE.md) · Kaizen note ↓ |
| F24 | 2026-07-22 | audit | 💡 | prose-noise | CLAUDE.md padded with repeated "(no exceptions)" — trimmable to buy line budget for the new rules under the <120 cap | 🔵 open | H-2 — owner apply/reject pending | [H-1 self-audit](STATE.md#L38) | [CLAUDE.md](../CLAUDE.md) |
| F23 | 2026-07-22 | audit | 💡 | cost-visibility | Token/cost spend is implicit; no per-phase accounting. Fix: `/handoff` logs approx spend per phase | 🔵 open | H-2c (`/handoff` skill) — owner apply/reject pending | [H-1 self-audit](STATE.md#L38) | [SKILLS.md — /handoff](SKILLS.md) |
| F22 | 2026-07-22 | audit | 💡 | playbook-dup | SKILLS.md playbooks risk restating BE_PLAYBOOK steps (one-fact-one-home). Fix: make them pure pointers | 🔵 open | H-2c (`SKILLS.md`) — owner apply/reject pending | [H-1 self-audit](STATE.md#L38) | [SKILLS.md](SKILLS.md) |
| F21 | 2026-07-22 | audit | ⚠️ | limit-death | Session/API-limit death loses all output — nothing committed (seen F-21/F-24/F-26 builder deaths). Fix: commit incrementally so a limit-death leaves partial receipts | 🔵 open | H-2 (IMPLEMENT step) — owner apply/reject pending | [H-1 self-audit](STATE.md#L38) | [CLAUDE.md — IMPLEMENT](../CLAUDE.md) |
| F20 | 2026-07-22 | audit | 💡 | loop-overhead | Task loop applies even to pure Q&A ("explain X", "review a doc"), forcing ceremony on no-file-change asks. Fix: a one-line loop exemption | 🔵 open | H-2 — owner apply/reject pending | [H-1 self-audit](STATE.md#L38) | [CLAUDE.md — task loop](../CLAUDE.md) |
| F19 | 2026-07-22 | audit | 🚨 | verify-before-main | Push-to-main autonomy + no standalone "code needs its VERIFY receipt before main" rule (it's buried in the git rule) risks unverified code landing. Fix: promote to standalone Hard Rule 2 | 🔵 open | H-2 (Hard Rules) — owner apply/reject pending | [H-1 self-audit](STATE.md#L38) | [CLAUDE.md — Hard Rules](../CLAUDE.md) |
| F18 | 2026-07-22 | audit | ⚠️ | rule6-honor-system | Hard Rule 6 (inventory↔file-tree invariant) is unenforced — drift already occurred (F-14 sweep). Fix: `.claude/hooks/hardrule6-check.sh` diffs inventory vs tree | 🔵 open | H-2b (new hook) — owner apply/reject pending | [H-1 self-audit](STATE.md#L38) | [CLAUDE.md — Hard Rule 6](../CLAUDE.md) |
| F17 | 2026-07-22 | audit | ⚠️ | state-bloat | STATE.md §resume-point carries ~30 lines of open decisions + 🚨 flags → drifting into a 2nd task board despite the ≤10-line rule. Fix: extract `harness/DECISIONS.md` (open/locked), STATE points at it | 🔵 open | H-2a (new DECISIONS.md) — owner apply/reject pending | [H-1 self-audit](STATE.md#L38) | [STATE.md §resume point](STATE.md#L9) |
| F16 | 2026-07-22 | audit | 🚨 | ceremony-budget | Full per-task HTML ceremony (`build-plan.html` §R **+** `task-<id>.html`) drives very high token burn; proximate death cause is the **account-level usage quota** (resets wall-clock), which the burn drains faster — killed builder sub-agents in F-21/F-22/F-23/F-26/F-27/F-28. Fix: tier REPORT — full HTML for doc/plan, lightweight `.md` + receipt for code. **Refined 2026-07-22 (chat):** ⚠ every death was on a *page-plan* (doc/plan) task whose 3 HTML files are the **deliverable**, not ceremony — so tiering only lightly helps those (drops the 2 ceremony files); its **big** payoff is the not-yet-started **code** phase (F-2/C-…) where HTML is pure overhead. **Sharper lever underneath → split candidate `subagent-spawn-waste`:** every builder sub-agent that died was recovered by *inline* authoring — the spawns are pure token overhead dying on the same cap → a SUBAGENTS.md "author HTML inline, don't spawn builders" rule (higher value than tiering, different fix). | 🔵 open | H-2 (REPORT step) + split candidate → SUBAGENTS.md; owner apply/reject pending | [H-1 self-audit](STATE.md#L38) | [CLAUDE.md — REPORT](../CLAUDE.md) · refined in 2026-07-22 chat |
| F15 | 2026-07-22 | audit | 🔴 | selfreview-vague | SELF-REVIEW is the weakest loop step — "spec followed? regressions?" is undefined for real code. Fix: concrete 5-item code gate (builds · `go vet`/`tsc` · AC re-read · scoped files only · no drive-by edits) | 🔵 open | H-2 (SELF-REVIEW step) — owner apply/reject pending | [H-1 self-audit](STATE.md#L38) | [CLAUDE.md — SELF-REVIEW](../CLAUDE.md) |
| F14 | 2026-07-22 | F-14 | ⚠️ | scope-hygiene | `personal/command.md` tracked in git despite the Session-0b "personal stays out" decision (committed in `dda8ccc`) | 🔵 open | Owner to say "untrack it"; then close against the removing commit | [Session 9 (F-14)](STATE.md#L396) | STATE + commit `dda8ccc` |
| F13 | 2026-07-19 | F-25 | ⚠️ | route-reconcile | Customer `/orders` route naming vs the two parent pages needs one canonical map before O-2 | 🔵 open | `plans/customer_orders_tracking/…_PLAN.md`; lock at O-2 | [Session 18 (F-25)](STATE.md#L116) | [orders plan — route reconciliation](plans/customer_orders_tracking/customer_orders_tracking_PLAN.md) |
| F12 | 2026-07-19 | F-25 | ⚠️ | money-glyph | Money glyph `đ` vs `₫` inconsistent; one `formatVND()` must own it (plan defaults menu's `đ`) | 🔵 open | Decide + centralise in `formatVND()`; close against the util | [Session 18 (F-25)](STATE.md#L116) | [orders plan — `formatVND()` owns the glyph](plans/customer_orders_tracking/customer_orders_tracking_PLAN.md) |
| F11 | 2026-07-19 | F-25 | ⚠️ | cancel-rule | Order-cancel rule still 3-way (ref `<30%` vs owner "before payment"); one `canCancel` predicate | 🔵 open | Lock before O-2; `OVERALL_PLAN.md §3.7` | [Session 18 (F-25)](STATE.md#L116) | [orders §7 — the `canCancel` rule](plans/customer_orders_tracking/customer_orders_tracking_PLAN.md#L68) · [OVERALL_PLAN §3.7](OVERALL_PLAN.md) |
| F10 | 2026-07-19 | F-23 | ⚠️ | rbac-home | RBAC role-level table has no permanent home (proposed for `OVERALL_PLAN.md §3` at S phase) | 🔵 open | Promote to `OVERALL_PLAN.md §3` when S opens | [Session 17 (F-23)](STATE.md#L146) | [admin_staff — RBAC note: no harness home yet](plans/admin_staff/admin_staff_PLAN.md#L68) |
| F09 | 2026-07-19 | F-23 | ⚠️ | error-enum-shape | Shared `CONFLICT` code needs a `details[].issue` discriminator vs 2 new enum codes (decide before S-4) | 🔵 open | `BE_STATE.md §4`; decide before S-4 | [Session 17 (F-23)](STATE.md#L146) | [admin_staff §3.6 — discriminator + error map](plans/admin_staff/admin_staff_PLAN.md#L139) |
| F08 | 2026-07-19 | F-29 | ⚠️ | schema-amend-request | Toppings plan **requests** a `UNIQUE(name)` amendment on `toppings` (not written — one fact one home) | 🔵 open | `DB_SCHEMA.md §4.1`; write on schema task | [Session 16 (F-29)](STATE.md#L168) | [admin_toppings — `UNIQUE(name)` it does not own](plans/admin_toppings/admin_toppings_PLAN.md#L351) |
| F07 | 2026-07-18 | F-21 | ⚠️ | schema-amend-request | Ingredients plan **requests** a `UNIQUE(name)` amendment on `ingredients` (not written here) | 🔵 open | `DB_SCHEMA.md §4.1`; write on schema task | [Session (F-21)](STATE.md#L53) | [admin_ingredients §F-1 — amendment requested](plans/admin_ingredients/admin_ingredients_PLAN.md#L358) |
| F06 | 2026-07-18 | F-21 | ⚠️ | theme-ambiguity | Admin palette undecided: reference orange/dark vs neutral F-7 tokens (over-draw reject also flippable while AD open) | 🔵 open | Decide before AD build; `design-system.html` | [Session (F-21)](STATE.md#L53) | [design-system.html — token palettes](diagrams/design-system.html) |
| F05 | 2026-07-21 | F-20/F-22 | ⚠️ | page-merge | `admin_todo_list` overlaps `admin_task_board` ~80% — owner ruling requested on merging into one `/admin/tasks` before AD-4 | 🔵 open | Owner ruling; both plans link this id | [Session 15 (F-20)](STATE.md#L74) · [19 (F-22)](STATE.md#L97) | [admin_todo_list §1.1 — the ~80% overlap FLAG](plans/admin_todo_list/admin_todo_list_PLAN.md#L47) |
| F04 | 2026-07-21 | F-20/F-24 | ⚠️ | concurrent-taskids | Task-id collisions: two rows claim F-20, two claim F-24 (parallel sessions, shared working tree) | 🔵 open | Reconcile TASKS.md ids; process fix candidate (≥2 → H#, now F25) | [Session 15 (F-20)](STATE.md#L74) · [+ F-21](STATE.md#L53) | STATE only — no owning doc yet (→ F25) |
| F03 | 2026-07-19 | F-19 | ⚠️ | merge-omission | Quantity stepper `PATCH /orders/items/:id/quantity` dropped by omission — recorded as a decision, revisit if UX needs it | 🔵 open | `customer_order_detail_SUPPLEMENT.md §2` | [Session 15 (F-19)](STATE.md#L268) | [SUPPLEMENT §2 — decision, not omission](plans/customer_order_detail/customer_order_detail_SUPPLEMENT.md#L70) |
| F02 | 2026-07-19 | F-19 | 🚨 | deep-link | `/orders` reachable only via client `activeOrderId`; shared link / 2nd phone / cleared store cannot reach a live order. Fix: `/orders?id=<uuid>` | 🔵 open | **Decide before the `/orders` FE row opens**; `…SUPPLEMENT.md §1` | [Session 15 (F-19)](STATE.md#L268) | [SUPPLEMENT §1 — deep-link table + `?id=` fix](plans/customer_order_detail/customer_order_detail_SUPPLEMENT.md#L39) |
| F01 | 2026-07-17 | F-9 | ⚠️ | theme-ambiguity | Customer-shell theme: reference dark/orange (default) vs F-7 blue — decide before C-4 | 🔵 open | `PLAN.md §7`; decide before C-4 | [Session 5 (F-9)](STATE.md#L458) | [PLAN.md §7 — brand hue / shell theme](PLAN.md) |

> **Kaizen watch:** `theme-ambiguity` (F01, F06) and `schema-amend-request` (F07, F08, F27)
> have each hit the **≥2** threshold → candidates for an `H#` rule-change task (a
> theme-decision gate; a "plans request schema amendments in a fixed place, the schema task
> drains them" rule). **2026-07-24 (F-32):** that drain rule got its first run — F27 was
> written into `DB_SCHEMA §4.3` and closed, while F07/F08 (both `UNIQUE(name)`) are still
> open with no scheduled drain, which is exactly the gap the `H#` would close.
> `cache-key-drift` also reaches ≥2 (F29 backend + **F35** frontend) — same class both sides:
> a rule doc written pre-pivot that four page plans have since overtaken.
> **New 2026-07-24 (F-30):** `wire-contract-drift` (F26, F28) reaches ≥2 on its first outing —
> both are the same class: a wire shape written in a page plan drifted from the schema/worked
> example that feeds it. Candidate rule: **the receipt is the contract** (gate 8) extended
> backwards — a plan's §wire-shapes block names the DB columns each field is snapshotted from,
> so a missing/renamed field is visible at plan time instead of at build time.
>
> **F15–F25 (2026-07-22 self-audit of CLAUDE.md + harness):** a batch of process findings whose
> proposed resolution is one harness task, **H-2 (CLAUDE.md v2)** — a tiered-REPORT loop, a
> concrete SELF-REVIEW gate, `NEXT_ID` concurrency claim, extracted `DECISIONS.md`, a Rule-6
> enforcement hook, and prose trims. `concurrent-taskids` (F04 → F25) is the clearest graduation.
> **Status: all 🔵 open, awaiting the owner's apply/reject/phase ruling — H-2 not yet registered.**
