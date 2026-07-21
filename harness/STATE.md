# STATE.md — Durable State / Checkpoint Log (Primitive 6)

> The workbench. Any session — after a crash, compaction, or handoff — resumes from
> THIS file, not from memory. Update it before ending every session (checkpoint discipline).
> Newest entry on top. Keep each checkpoint ≤ 10 lines; archive old entries yearly.

---

## Current resume point

- **Status:** ✅ F-16 (canonical DB schema — `harness/DB_SCHEMA.md`, adopted from
  `reference/docs/system/02_spec/object` per owner instruction).
- **Next:** F-2 (dev stack skeleton) — prompt ready in `PROMPTS.md`; unchanged by F-9
  (skeleton is identical for the restaurant scope). C-4/C-5 now read
  `plans/customer_menu/PLAN.md` first; **F-3/C-1 and every migration task read
  `DB_SCHEMA.md` first** (CONTEXT_MAP routing updated).
  New ⚠ for owner: customer-shell theme = reference dark/orange (default) vs F-7
  blue — decide before C-4 (PLAN.md §7).
- **Open decisions:** ⚠ **Scope pivot** (OVERALL_PLAN.md §9.1): reference = restaurant
  platform, adopted as north star — silence = accepted. ❓ Cancel rule + ❓ one-order-
  per-table (OVERALL_PLAN.md §3.7) — defaults chosen, lock in when O phase opens.
  💡 Redis policy (ARCHITECTURE.md §4) locks in at C-2 · 💡 brand hue before C-4 ·
  💡 VN-first copy + 💡 no public staff register (OVERALL_PLAN.md §9). ⚠ `personal/
  command.md` tracked in git despite the Session-0b personal-stays-out decision
  (owner committed it in `dda8ccc` — say "untrack it" to fix).
  🚨 **NEW (F-19) — order deep-link gap:** `/order/:id` was merged into `/orders`, which
  picks its order from `activeOrderId` in the *persisted client store*; a shared link,
  a QR re-scan on a second phone, a private tab or a cleared store then cannot reach a
  live order. Fix recommended: `/orders?id=<uuid>`. **Decide before the `/orders` FE row
  opens** (`plans/customer_order_detail/customer_order_detail_SUPPLEMENT.md` §1).
  ⚠ quantity stepper `PATCH /orders/items/:id/quantity` dropped by omission (same file §2).
  Deferred: payment gateways (→ P phase), AI.

---

## Checkpoint log

### 2026-07-21 — Session 18 (F-25): customer orders-&-tracking page-plan set — **COMPLETE**
- Done: F-25 ✅ — owner "make me page order tracking, spawn agent as need". Picked the
  merged `/orders` screen (`customer_orders_tracking`: live tracking + history + detail in
  one scroll) over the single-order `/tracking` page — owner confirmed via question.
  Delivered `harness/plans/customer_orders_tracking/`: `_PLAN.md` (465 ln, source of truth)
  + `_plan.html` (958) + `_how-it-works.html` (1028, 6 SVG sequence lanes) + `_mockup-1.html`
  (921, dark/orange shell). 2 Explore agents digested the tracking+order_list+order_detail
  corpora; 2 builder agents wrote the HTML. Receipt in VERIFICATION.md.
- Decisions/reconciliations: order held in TanStack Query, not the SSE hook's `useState`
  (SSE only triggers refetch) · ONE inline detail component replaces the ref's duplicate
  OrderDetailSheet+`/order/:id` (kills the 🔴 404-wedge) · BE computes queue position/ETA
  (ref invented them FE-side) · exhaustive SSE event switch, CI-gated (kills the
  `order.status` name-drift bug) · GET returns bare order, never `{data:…}` · history stays
  device-local `ORDER_CACHE` v1 (no guest my-orders endpoint) · one monitor-SSE stream
  drives all four live surfaces.
- Registered: new **Phase R** in TASKS.md (R-1 realtime platform + monitor SSE; R-2 FE live
  half) — R phase had no rows; **O-3 split** (static half stays O-3, live half → R-2).
  Hard Rule 6: 4 CONTEXT_MAP inventory rows + new "Realtime" routing row + 4 README rows.
- Open flags for owner: ⚠ **cancel rule** still 3-way (ref `<30%` vs owner "before payment"
  — plan defaults owner's, one `canCancel` predicate, LOCK before O-2) · ⚠ **money glyph**
  `đ` vs `₫` (one `formatVND()`; plan defaults menu's `đ`) · ⚠ **route reconciliation**
  (menu plan redirects to `/order/<id>`; this screen is `/orders` via `activeOrderId` —
  recommend menu handoff → `/orders`; NOT edited here, stayed surgical) · ❓ `item_progress`
  smooth-patch vs refetch (confirm at R-1).
- Drift/friction: task-id collisions with parallel sessions forced F-17→F-18→F-24→**F-25**
  (shared TASKS.md id space — worth a reservation convention). `personal/command.md` flag
  stands.
- Next: unchanged upstream — F-2 (dev stack skeleton). When O/R open, O-2/O-3 + R-1/R-2
  read `plans/customer_orders_tracking/…_PLAN.md` first (CONTEXT_MAP routing updated).

### 2026-07-21 — Session 17 (F-23): admin-staff page-plan set — **COMPLETE**
- Done: F-23 ✅ — owner "make me page admin staff, spawn agent as need". Delivered
  `harness/plans/admin_staff/` 4-doc set per PAGE_PLAN_GUIDE: `admin_staff_PLAN.md`
  (canonical, 8 sections, 496 lines) + `_plan.html` (9 sec) + `_how-it-works.html` (7 seq)
  + `_mockup-1.html` (neutral F-7 admin tokens). Digested the 4 reference docs by hand
  (BE/loading/crosspage/FE); 3 builder agents rendered the HTML — each died once on an
  account session-limit and was resumed from its warm transcript. Receipt in VERIFICATION.md;
  indexes updated (TASKS.md row + CONTEXT_MAP ×4 + README ×4). Committed to `main`.
- Decisions: 6-endpoint manager+ contract (admin-only DELETE) · reference codes mapped onto
  BE_STATE §4 9-code enum via a `details[].issue` discriminator · server-side paging replaces
  the reference's 100-row client cap (URL-owned, FE_STATE §9.2) · refresh-token revoke added on
  deactivate+delete (closes the reference's unimplemented "revoke sessions") · soft-delete
  `<username>#deleted-<id>` rename (DB_SCHEMA §4.4) · `performance_score` phantom dropped · 5
  named render branches fix the loading≡empty≡no-match conflation.
- Open flags for owner: ⚠ shared `CONFLICT` code + `details.issue` discriminator vs 2 new enum
  codes (decide before S-4) · ⚠ RBAC role-level table needs a permanent home (proposed
  OVERALL_PLAN §3) · ❓ **no password-reset path exists anywhere** in the reference — assumed a
  v1 gap (admin resets via DB) unless S-4 adds `PATCH /staff/:id/password`.
- Drift / notes: heavy shared-index churn — parallel sessions renumbered my task row twice
  (F-21→F-22→F-23) and a sibling "sdfg" commit swept my mockup + index rows into history.
- Next: unchanged — F-2 (dev stack skeleton).

### 2026-07-21 — Session 16 (F-29): admin-toppings page-plan set — **COMPLETE**
- Done: F-29 ✅ — owner "make me page admin topping, spawn agent as need". Delivered
  `harness/plans/admin_toppings/` 4-doc set per PAGE_PLAN_GUIDE: `admin_toppings_PLAN.md`
  (canonical, 8 sections) + `_plan.html` + `_how-it-works.html` + `_mockup-1.html` (neutral
  F-7 admin tokens). Digested 8 reference docs + 7 wireframe docs **by hand** — the Explore
  digest agent died on an account session-limit (not a task error; no output returned).
  Receipt in VERIFICATION.md; indexes updated (TASKS.md row + CONTEXT_MAP + README ×4).
- Decisions: 5-endpoint contract with a **public `GET /toppings` (available-only) vs
  manager+ `GET /toppings/all` (products joined server-side)** role split; DELETE admin-only;
  the reference's N+1 whole-catalog fetch (used only to print one column) replaced by the
  server join; cache fan-out Dels every joined `product:<id>` (fixes the 5-min stale-price
  bug); 12 defects designed out; `['admin','toppings']` shared with the product picker on
  purpose; wire fields use DB names (`price`/`is_available`, never `extraPrice`).
- ⚠ Flags: (1) plan **requests** a `UNIQUE(name)` amendment to `DB_SCHEMA.md §4.1` for the
  409-dup fix — to be written in C-1, NOT by this docs task. (2) narrowing `GET /toppings`
  to available-only is a contract change for future readers. (3) blank-AuthGuard window is a
  shell-level gap, not page-local.
- Drift fixed / found: **task-ID collision** — `F-22` + `AD-T1/2/3` already owned by the
  parallel `admin_task_board`/`admin_training` plans; renumbered to **F-29** + `AD-TOP-1…3`
  before registering. `personal/command.md` flag still stands.
- Next: unchanged — F-2 (dev stack skeleton). Admin page-plan backlog continues
  (`admin_categories`, `admin_marketing`, `admin_storage`, public pages) per PAGE_PLAN_GUIDE §10.

### 2026-07-19 — Session (F-26): admin_training page-plan set
- Done: F-26 ✅ — owner asked "make me page admin training, spawn agents as needed."
  Delivered `harness/plans/admin_training/` per PAGE_PLAN_GUIDE: `admin_training_PLAN.md`
  (canonical, 8 §) + `_plan.html` (9 §) + `_how-it-works.html` (7 SVG sequences) +
  `_mockup-1.html` (neutral F-7 admin tokens, 12-chef worked example). Digested 13
  reference docs. CONTEXT_MAP + README Rule-6 rows added; receipt in VERIFICATION.md.
- Decisions: the reference page = working guide-authoring CMS on a **dead** tracking
  shell (no API ever wrote training_progress/quiz_attempts → 3 of 7 endpoints empty/404
  forever). Countermeasures: (1) 🚨 tracking UI **AD-T6 blocked on** the staff watch/quiz
  write path **AD-T4** — never ships inert; (2) roster-first LEFT JOIN (every assigned
  staff shows "Chưa bắt đầu" day one) replaces the ref's permanently-empty INNER JOIN;
  (3) DELETE lowered manager→ one `can()` helper (kills invisible-403); (4) 404-as-empty,
  wrapped/unwrapped payloads, two-statuses-one-icon, dead Zustand store, useState filters
  all designed out (19 defect rows). Training = AD phase, no Redis, no realtime. ❓ open:
  how `watched_percent` is measured (self-reported vs embedded player) — decide before AD-T4.
- Drift/infra: ⚠ **task-id churn** — concurrent sessions share one working tree; my row
  bounced F-20→F-25→F-26 as others claimed each id. TASKS.md still has out-of-order rows
  + earlier dup collisions (F-17 admin_overview vs admin_products). Needs a reconciliation
  sweep. ⚠ session usage limit killed the digest agent + 2 of 3 HTML builders mid-run
  (resets ~3:40am) — digest + how-it-works.html done inline; the other two builders had
  already written their files before failing.
- Next: unchanged — F-2 (dev stack skeleton). AD-phase build rows AD-T1…AD-T6 stay
  proposals in the plan until the AD phase opens (Phase-4 ⛔ Admin row un-defers then).

### 2026-07-19 — Session 15b (F-17): admin_overview page-plan set (4 docs, one folder) — **COMPLETE**
- Done: F-17 ✅ — owner "make me page admin overview". Delivered
  `harness/plans/admin_overview/` per PAGE_PLAN_GUIDE: `admin_overview_PLAN.md` (canonical,
  8 sections) + `_plan.html` + `_how-it-works.html` + `_mockup-1.html` (all both-theme,
  neutral F-7 admin tokens — NOT the customer dark/orange shell). 2 Explore agents digested
  the 10-doc reference corpus (~2,800 lines). Receipt in VERIFICATION.md; Hard-Rule-6 rows
  added (CONTEXT_MAP §Doc inventory ×4 + routing pointer, README §plans ×4, PAGE_PLAN_GUIDE
  §10 backlog admin_overview→✅). TASKS.md F-17 row inserted after F-16 (id order kept).
- Decisions (harness beats reference): one cookie-JWT manager-gated **SSE** channel replaces
  the reference's SSE-doorbell + ungated `WS ?token=` (SEC hole gone, F-5) · **no cache map**
  — orders never cached, Redis pub/sub only (BE_STATE §7) · `POST /payments` = `{order_id,
  method}` only (no client amount) · optimistic status advance **+ rollback** · N+1 live-list
  → one batched fetch. 11 reference defects designed out (4 distinct 🔴 roots + 🟡s).
- Flags: ⚠ cash path lands O/AD though gateways are P-phase · ⚠ N+1 watch at AD-1 · ❓ cancel
  rule still open (OVERALL_PLAN §3.7) — plan assumes cancel from pending/confirmed/preparing.
- Drift found: ⚠ **task-id churn under parallel sessions** — an earlier draft of
  `admin_overview_PLAN.md` was swept into a sibling's checkpoint commit (`0cb37d8`), and F-17
  had been reused for admin_products before a sibling renumbered that to F-27/F-28; verified
  F-17 is now uniquely admin_overview. `personal/command.md` flag still stands.
- Next: unchanged — F-2 (dev stack skeleton). Admin build itself waits for the AD phase; this
  is a plan-only deliverable. Sibling page-plan tasks F-27/F-28/F-19…F-26 in flight (🔄).

### 2026-07-20 — Session 15 (F-27/F-28): admin_products + admin_combos page plans — **PARTIAL**
- Done: both canonical `.md` plans written — `harness/plans/admin_products/
  admin_products_PLAN.md` (F-27) and `harness/plans/admin_combos/admin_combos_PLAN.md`
  (F-28). Products digested by me directly from the 8-doc reference corpus; combos by
  1 Explore agent. Both follow PAGE_PLAN_GUIDE §3's 8-section structure.
- **NOT done — F-27/F-28 stay 🔄:** the 6 HTML companions (`_plan`, `_how-it-works`,
  `_mockup-1` × 2 pages). Two builder agents were launched and **both failed on an
  API session limit**; no HTML was written. No receipts logged, no Hard-Rule-6 index
  rows added yet. Next session: render the 6 HTML from the two `.md` files (they are
  complete and stable), then CONTEXT_MAP + README rows + VERIFICATION receipts.
- Decisions: admin writes are pessimistic (FE rule 4) · delete = admin+, rest manager+
  · admin list reads stay uncached · `GET /combos/all` is **new** (ref had no
  manager-only combo read) · combo management read carries a **server-side join**
  (`product_name`, `unit_price`, `retail_total`, `product_deleted`) while the customer
  `GET /combos` stays ids-only — deliberate, documented divergence · combo item writes
  go in **one transaction** (ref swallowed item errors) · **product writes now also DEL
  `combos:list`** (new cross-invalidation rule, added to both plans).
- Drift fixed / found: ⚠ **task-id collision** — a parallel session registered F-17 =
  admin_overview while this session was running; my rows renumbered **F-17→F-27,
  F-18→F-28** (ids through F-26 are taken). ⚠ **`is_active` vs `is_available`** on
  combos: DB_SCHEMA §4.1 says `is_available`, customer_menu PLAN §3.5 ships
  `is_active` on the same endpoint — ruled **`is_active`**, DB_SCHEMA to be corrected
  in AD-C1. ⚠ **worked-example mismatch**: customer_menu illustrates "Suất đầy đủ" at
  55.000 but the seed catalog has Suất Đầy Đủ Trứng Chín/Tái at 30.000 and no 55.000
  combo — combos plan uses the seed-faithful numbers; menu plan needs correcting.
- 🚨 **RISK for owner (blocks AD-C4):** on our own seed data every suất is priced
  *exactly* at its retail sum, so `Tiết kiệm` is 0 on every row and the combos page's
  headline "savings" feature renders as a column of `—`. Decide: seed a genuinely
  discounted combo (plan's default — worked example uses 28.000 vs 30.000 retail), or
  drop the savings column. See `admin_combos_PLAN.md §7`.
- Next: finish the 6 HTML companions for F-27/F-28, then indexes + receipts.


### 2026-07-19 — Session 15 (F-19): order detail — merged away, supplement instead
- Done: F-19 ✅ — owner asked for an order-detail page plan. Digested the 8-doc reference
  corpus (1 Explore agent, code-traced), drafted the full 4-doc set, then **discarded it**:
  the sibling `customer_orders_tracking` plan merges `/order/:id` away *and* already
  specifies the detail view completely (~90 % overlap — `PAGE_PLAN_GUIDE §10` says
  cross-link, don't re-derive). Delivered `plans/customer_order_detail/`:
  `_SUPPLEMENT.md` (126 lines, owns only the three unhomed items) + a `_PLAN.md` stub
  saying there is no plan here. **No HTML companions, deliberately.** Hard-Rule-6 rows in
  CONTEXT_MAP + README; receipt in VERIFICATION.md.
- Decisions (both owner-ruled mid-task, before any HTML was rendered): **`/order/:id` is
  merged away** — order detail is a view inside `/orders`, homed in the orders-tracking
  plan · **F-19 ships a short supplement, not a page-plan set.**
- Drift fixed: `customer_menu_PLAN.md` §1 + §4.2 still routed the post-order handoff to
  the deleted route → dated supersession notes, redirect now `/orders` (Hard Rule 5).
- ⚠ Open for owner: 🚨 **deep-link gap** — `/orders` selects its order from
  `activeOrderId` in the *persisted client store*, so a shared link / QR re-scan on a
  second phone / private tab / cleared store **cannot reach a live order at all**.
  Recommendation `/orders?id=<uuid>` (URL wins over store; `table_id` 403 already guards
  a guessed id). **Decide before the `/orders` FE row opens.** · ⚠ quantity stepper
  (`PATCH /orders/items/:id/quantity`) dropped by omission, not by ruling.
- ⚠ Process: parallel sessions collided on task ids again (two F-17 rows mid-session,
  since renumbered F-27/F-28 by the sibling). Left alone — other sessions' in-flight rows.
- Next: unchanged — F-2 (dev stack skeleton).

### 2026-07-19 — Session 15 (F-24): customer-favourites 4-doc page-plan set
- Done: **F-24 ✅** — `harness/plans/customer_favourites/` holds the 4 slug-prefixed docs
  (`_PLAN.md` canonical + `_plan.html` + `_how-it-works.html` + `_mockup-1.html`).
  Receipt in VERIFICATION.md 2026-07-19. CONTEXT_MAP + README rows added (Hard Rule 6).
- Decisions (do not re-litigate): the favourites suite is **BE-read-only** — 2 cached
  catalog GETs, zero writes, no schema, no cache invalidation; its contract is a strict
  subset of the menu plan's, so the plan **cross-links F-15 §3** instead of re-deriving.
  Favourites persist (localStorage tree), the cart they fill does not (session-only) —
  deliberate asymmetry. `toggleFav` drops toppings/qty (v1, flagged). The DESIGN_PROMPT's
  new features (canh quick-add, live total, "Tự tạo suất" builder, 📌 Ghim lên Menu) are
  **deferred C-7**, owner-gated — badged `💡 ĐỀ XUẤT` in the mockup, not v1.
- Drift fixed / found: **⚠ TASKS.md id collisions from parallel sessions** — F-17 was
  claimed twice (admin_products + this row) so this task was renumbered **F-17 → F-24**;
  **F-18 (admin_combos vs customer_orders_tracking) and F-20 (admin_training vs
  admin_todo_list) are STILL duplicated — owner/next session must reconcile.**
  ⚠ Blanket `git add -A` is unsafe with concurrent sessions: this session's PLAN.md was
  swept into another session's checkpoint (`0cb37d8`). Suggest Hard Rule 3 gain
  "stage explicit paths" — owner to rule.
- Loose end: `harness/diagrams/task-F-24.html` (per-task page, owner rule 2026-07-17) not
  written — the 3 render agents hit the account session limit (resets 22:40 Asia/Saigon).
- Next: write `task-F-24.html`; reconcile the duplicate F-18/F-20 ids; then F-2 unchanged.

### 2026-07-19 — Session 14 (F-15 amendment): cart-store §04 (nhân/canh/combo + Zustand)
- Done: owner asked to visualize + explain what happens when a client selects nhân,
  picks canh, adds a combo, and "how zustand work" → new §04 **"Inside the cart
  store"** in `harness/plans/customer_menu/how-it-works.html`: nhân single-vs-multi
  pill mockups (line-id tail), canh stepper + canh-gate flow, combo ids-only note,
  and the Zustand mechanism — a store-anatomy SVG (STATE/ACTIONS/SELECTORS ·
  writers→set() · subscribers←selector · persist→partialize→localStorage) + a
  5-step write-cycle (set→shallow-compare→selective re-render). Sections renumbered
  04→07, topnav + 2 cross-refs updated. Re-draws PLAN.md §3.4/§4.2/§4.4 facts only —
  owns nothing. Content-only (Hard Rule 6 n/a); screenshot receipt in VERIFICATION.md.
  Committed straight to `main`.

### 2026-07-18 — Session 13 (F-15 amendment): runtime-walkthrough visual
- Done: owner asked for one combined visual of how the menu page actually works →
  new `harness/plans/customer_menu/how-it-works.html`: numbered end-to-end sequences
  for first load (3-tier loading incl. Redis hit/miss), add-to-cart (zero network),
  the two state hubs + cross-page handoffs, POST /orders through Gin→tx→MySQL with
  the error rail, and Redis cache-aside/invalidation/fail-open. Re-draws PLAN.md
  facts only — owns nothing. Rule 6 rows added (CONTEXT_MAP §Doc inventory + README);
  PLAN.md TL;DR links it. Committed straight to `main`.

### 2026-07-18 — Session 12 (F-16): canonical DB schema from reference object models
- Done: F-16 ✅ — owner pointed at `reference/docs/system/02_spec/object` ("above is
  what i want for data base please update project") → `harness/DB_SCHEMA.md`:
  conventions + field-name law MOVED here from OVERALL_PLAN §3.2 (pointer left),
  13 spec-traced tables column-complete (catalog 6 · tables/order_sequences ·
  orders/order_items w/ snapshot + combo row-type CHECK · staff · inventory 3),
  7 phase-later stubs (refresh_tokens, payments, workforce 4, file_attachments),
  ER overview, 14 mismatch-flag rulings (§6). task-F-16.html + §R report +
  Hard-Rule-6 rows (CONTEXT_MAP: DB-migration route now reads DB_SCHEMA.md first;
  README). customer_menu PLAN §3.2 re-pointed. Receipt in VERIFICATION.md.
- Decisions: real-`null` wire serialization for nullable columns (kills ref `""`
  mismatch, aligns gate 8) · staff.role enum = 5 values (`customer` dropped) ·
  phantom fields dropped (`flagged`, hardcoded `performance_score`) · ingredient
  wire uses DB names (rule 10) · ⚠ stock over-draw default = reject w/
  VALIDATION_FAILED (ref silently clamps) — owner may flip until AD opens.
- Also (same session, owner asked "any comment… does it good" → "go ahead"): schema
  review verdict good; two audit fixes folded into DB_SCHEMA.md — §4.2 counter
  re-seed rule (Redis wipe must re-seed from order_sequences, never restart at 1)
  + §4.4 soft-delete×UNIQUE rule (staff soft delete renames username to
  `<name>#deleted-<id>`; qr_token/order_number exempt). Content-only edit.
- Drift fixed / found: none new (`personal/command.md` flag stands). ⚠ `git push`
  denied in-session again (F-12/F-15 precedent) — commits local on `main`, push pending.
- Next: unchanged — F-2 (dev stack skeleton); migrations build against DB_SCHEMA.md.

### 2026-07-18 — Session 11 (F-15 amendment): state-management flow spelled out
- Done: owner asked how state moves among components/pages, then "update plan for
  state manage" → PLAN.md §4.2 + plan.html §03 extended with the cross-component
  (Query cache · Zustand stores, only two mechanisms) and cross-page (route param +
  same cache · post-201 URL/persisted-slice handoff · RSC HydrationBoundary) flows,
  plus the FE_STATE §1 decision flow for new state in C-4/C-5. Content-only edit —
  no CONTEXT_MAP/README rows touched (rule 6 n/a). Committed straight to `main`.
- Also (same session, "add loading stategy"): PLAN.md §4.3 rewritten as the full
  3-tier loading strategy (route: RSC prefetch + layout-mirroring skeletons + hover
  prefetch for details · component: 5-branch table, staleTime=TTL, refetch-on-focus
  self-heal, lazy images · mutation: none for cart, pessimistic POST /orders) +
  plan.html §05 mirrored (tier diagram + branch table). Content-only.
- Also ("how fe and be communication… how each object look like" → confirmed add):
  new PLAN.md §3.5 "Wire shapes" — JSON object gallery for all 6 endpoints (products
  with ₫0-topping join, ids-only combos, cookie-only guest mint, priceless order
  request, full 201 order object with combo_ref_id expansion, error envelope →
  ApiError), flagged as contract-pending-curl-receipts (gate 8). plan.html §04
  mirrored. Content-only.
- Next: unchanged — F-2 (dev stack skeleton); C-4/C-5 read plans/customer_menu first.

### 2026-07-18 — Session 10 (F-15): customer-menu FE+BE build plan
- Done: F-15 ✅ — owner pointed at `reference/…/customer/customer_menu` ("build above
  page, plan FE+BE, one folder + HTML"). Delivered `harness/plans/customer_menu/`:
  PLAN.md (BE: 6 endpoints, catalog schema slice, cache/invalidation map · FE: file
  map, state ownership, 12-behavior spec · defects-designed-out table · TASKS-row
  mapping C-1…C-5/T/O) + plan.html (phone-frame anatomy in reference dark/orange,
  component tree, contract, dataflow) + task-F-15.html + §R report. 2 Explore agents
  digested the 16-doc corpus; 1 builder agent wrote plan.html. Receipt in VERIFICATION.md.
- Decisions: new `harness/plans/` area = per-page consolidated plans (CONTEXT_MAP
  routing sends FE/BE tasks there when a page plan exists) · client-side filter/search
  v1, no ghost params · dead reference components never ported · cookie JWT stands ·
  ref 🔴 note-loss bug designed out · ⚠ customer-shell theme dark/orange (default)
  vs F-7 blue — owner decides before C-4.
- Drift fixed / found: none new (`personal/command.md` flag stands). ⚠ `git push`
  denied in-session (F-12 precedent) — commits local on `main`, push pending.
- Next: unchanged — F-2 (dev stack skeleton); C-4/C-5 read plans/customer_menu first.

### 2026-07-18 — Session 9 (F-14): docs alignment sweep
- Done: F-14 ✅ — owner asked "rearrange our folder and ensure all docs align"; audit
  found structure sound, indexes drifted. Fixed: CONTEXT_MAP §Doc inventory now covers
  every doc area (added rows: itself, PROMPTS.md, root README, templates/, reference/,
  personal/, task-F-14.html) · harness/README task summary un-frozen · root README
  layout gains reference/ + personal/ · TASKS.md Phase-F rows reordered F-11→12→13 ·
  stale "reference untracked" flag cleared (owner tracked the 867-file corpus in
  `00f77d0` "dfg", 2026-07-18). Receipt in VERIFICATION.md; plan page task-F-14.html.
- Decisions: **no folder moves** — reference/docs paths are load-bearing citations
  (5 harness docs + 4 task pages), diagram links welded into receipts; reference/ =
  read-only corpus, never edited by tasks.
- Drift fixed / found: the above, plus new ⚠ flag: `personal/command.md` tracked
  (`dda8ccc` "sdfg") against the Session-0b decision — left tracked, owner to confirm.
- Next: unchanged — F-2 (dev stack skeleton), per task-F-2.html.

### 2026-07-18 — Session 8 (F-13): DevOps operations doc from reference/docs/devops
- Done: F-13 ✅ — `harness/DEVOPS.md` (reference's 4 DevOps files → 1 ops doc on our
  stack: DevOps file ownership, compose/startup chain, Go-1.26-distroless + Next-16-
  standalone image patterns, CI/CD + GHCR sha-tagging w/ keep-2-tags, rollback 6A/6B
  + post-rollback checklist, Stage A/B go-live runbook, backups 03:00/14-day,
  P0–P2 SLA, pre-deploy checklist, hard rules D1–D8) + diagrams/devops.html +
  task-F-13.html. Receipt in VERIFICATION.md.
- Decisions: one doc not four (agent-operated harness) · ops facts written design-
  ahead like FE/BE_STATE · registry = ghcr.io/banhcuonbathanh/n-ecom-be/-fe ·
  reference gotchas promoted to numbered D-rules · CONTEXT_MAP Infra/DevOps route
  now reads DEVOPS.md + ENVIRONMENT.md.
- Drift fixed / found: shared-index task-id collision (renumbered F-10 → F-13);
  kept all shared-file edits additive around the two sibling sessions.
- Next: unchanged — F-2 (dev stack skeleton), per task-F-2.html; F-2/F-4/OPS now
  build against DEVOPS.md §2–§5.

### 2026-07-18 — Session 7 (F-11): BE engineering playbook from reference/docs/be
- Done: F-11 ✅ — `harness/BE_PLAYBOOK.md` (7 rule groups: goose+sqlc pipeline with the
  generate-after-every-schema-change golden rule, migration-file checklist, 9 Go/Gin
  gotcha rules each traced to an old-system bug, caching-discipline adds, BE build-order
  spine, seed+smoke rule, BE_SUMMARY.md discipline from C-2) + task-F-11.html (gap
  analysis). Receipt in VERIFICATION.md.
- Decisions: playbook = workmanship layer under BE_STATE.md's design layer — links,
  never restates · sqlc.yaml settings pre-decided for F-3 (emit_interface, empty
  slices, parameter-limit fixed once) · BE_SUMMARY.md born at C-2, updated in the same
  scope contract as any route/DTO/schema change · NOT adopted: WS `?token=` auth,
  bloom helpers, reference error registry, restaurant product facts.
- Drift fixed / found: 3-way task-id collision ("F-10" × 3 sessions) — this task
  renamed to F-11; a sibling commit swept this session's staged TASKS.md row (shared
  git index — parallel sessions share one working tree). ⚠ reference/docs/ still
  untracked (open owner flag).
- Next: unchanged — F-2 (dev stack skeleton), per task-F-2.html; F-3 now reads
  BE_PLAYBOOK.md §1–2 first (CONTEXT_MAP routing updated).

### 2026-07-18 — Session 6 (F-12): FE code-convention rules from reference/docs/fe
- Done: F-12 ✅ — FE_STATE.md §9 extended 7→14 hard rules (tokens-only, one
  `formatVND()`, DTO-exact naming + string IDs, derived-not-stored, HTTP-method
  parity, role-scoped endpoints, relative asset URLs) + ENVIRONMENT.md Tailwind-JIT
  rebuild gotcha + task-F-12.html. Receipt in VERIFICATION.md.
- Decisions: no new doc — conventions live in the rule list FE tasks already read
  (CONTEXT_MAP routes there); behavioral lessons stay in OVERALL_PLAN §6, zero
  duplication · full `['cart']` cache-map rework deferred to the T-phase cart task.
- Drift fixed / found: FE_STATE.md predated the F-9 cart pivot (server-cart wording)
  → dated supersession notes in §1/§8 · ⚠ 3-way task-id collision (three parallel
  sessions all registered "F-10") resolved: F-11 BE playbook / F-12 this / F-13 DevOps.
- Next: unchanged — F-2 (dev stack skeleton), per task-F-2.html.

### 2026-07-17 — Session 5 (F-9): overall build plan from reference/08_pages
- Done: F-9 ✅ — `harness/OVERALL_PLAN.md` (restaurant-platform scope: 4 surfaces/~30
  pages, 10 BE domains, ~85 routes, realtime design w/ 4 old-defect fixes, DevOps
  2-stage go-live, 14-row lessons register, phase roadmap F→C→T→O→R→S→AD→P→OPS→ON) +
  diagrams/overall-plan.html + task-F-9.html. 4 parallel Explore agents digested
  ~53k-line reference corpus. Receipt in VERIFICATION.md.
- Decisions: reference adopted as north star (⚠ pivot flag, silence = accepted) ·
  Session-0 error envelope + F-5 cookie-JWT + F-6/F-8 architecture all kept (cookie
  auth also fixes old WS `?token=` leak) · existing task rows re-homed not renumbered
  (CC-1/2 superseded — cart is client-side; A-3 → ON phase) · old system's bugs =
  lessons register, not requirements; dev shell-exec route never rebuilt.
- Drift fixed / found: committed dangling CLAUDE.md Hard Rule 6 text (F-8-session
  leftover, rule already in force). `reference/docs/` still untracked (open flag).
- Next: unchanged — F-2 (dev stack skeleton), per task-F-2.html.

### 2026-07-17 — Session 4 (F-8): BE state & data architecture doc
- Done: F-8 ✅ — `harness/BE_STATE.md` (4+1 BE state kinds w/ owners — in-process mutable
  state banned, request flow, tx policy: services own boundaries + 4 atomic flows,
  9-code error enum as the FE contract's other half, validation tiers, auth identity as
  explicit params, cache-aside pattern, folder layout, 8 hard BE rules) +
  `harness/diagrams/be-state-data.html` + plan page task-F-8.html (receipt in VERIFICATION.md).
- Decisions: error-code enum fixed (VALIDATION_FAILED…INTERNAL, §4 table) · stock mutates
  only inside a locked tx · handlers = shape, services = business · userID/cart-token
  reach services as parameters, never via context digging.
- Drift fixed / found: committed F-7-session leftovers found dangling in the working
  tree (harness/README.md index + CONTEXT_MAP inventory rows); ⚠ untracked
  `reference/docs/` flagged to owner (not committed — not project harness material).
- Next: unchanged — F-2 (dev stack skeleton), per task-F-2.html.

### 2026-07-17 — Stack versions bumped to verified-latest (pre-F-2)
- Done: PLAN.md §Stack updated after live version check — Go 1.25→1.26,
  MySQL 8→9.7 LTS, Redis→8; FE majors pinned (Next 16, Tailwind 4, Zustand 5,
  TanStack Query 5, RHF 7 + Zod 4). F-5/F-6 design patterns confirmed current.
- Decisions: F-2 pins exact versions in Dockerfiles/go.mod/package.json;
  Zod must be v4 (+ matching @hookform/resolvers major), not v3.
- Drift fixed / found: none (no code exists yet — doc-only bump).
- Next: unchanged — F-2 (dev stack skeleton).

### 2026-07-17 — Session 3 (F-7): design system reference page
- Done: F-7 ✅ — `harness/diagrams/design-system.html` (tokens: color/type/spacing/
  radius/shadow · button deep-dive: anatomy, 6 variants, 3 sizes + icon, 5-state
  matrix, compositions, do/don't, Tailwind→CVA mapping · forms, feedback, overlays,
  nav, commerce patterns · §8 component→file→task ownership map). Receipt in
  VERIFICATION.md; live artifact copy linked there.
- Decisions: 💡 brand primary = #2B59D9 (harness blue), danger doubles as sale color —
  owner may swap the hue any time before C-4 (one token change).
- Drift fixed / found: ⚠ uncommitted owner edit in architecture.html
  (`--muted` #5C6675 → #0066ff) — NOT committed, left for owner to confirm/revert.
- Next: F-2 (dev stack skeleton), per task-F-2.html.

### 2026-07-17 — Session 2 (F-6): components & alignment blueprint
- Done: F-6 ✅ — `harness/ARCHITECTURE.md` (5 containers, 4 layers × 5 domains +
  5 platform pkgs, FE↔BE contract, Redis policy proposal, 8 alignment gates +
  SELF-REVIEW checklist) + `harness/diagrams/architecture.html` (receipt in
  VERIFICATION.md; live copy linked in PLAN.md §Diagrams).
- Decisions: 💡 Redis = catalog cache + auth rate-limit only, always wipeable,
  only `platform/cache` imports the client — owner may veto before C-2.
- Drift fixed / found: ARCHITECTURE.md auth line aligned to F-5's httpOnly-cookie
  decision; committed Session 0d leftovers (CLAUDE.md REPORT rule, task-F-2.html)
  found dangling in the working tree.
- Next: F-2 (dev stack skeleton), per task-F-2.html.

### 2026-07-17 — Session 1 (F-5): FE state & loading design
- Done: F-5 ✅ — `harness/FE_STATE.md` (5 state kinds w/ owners, one-client data flow,
  query-key factory, cache/invalidation map, 3-tier loading/error policy, optimistic =
  cart-only, RSC prefetch+hydration for SEO, FE folder layout, 7 hard FE rules) +
  `harness/diagrams/fe-state-loading.html` (receipt in VERIFICATION.md).
- Decisions: JWT in httpOnly cookie (never JS-readable) · URL owns filter/page/search ·
  Zustand = `ui` slice only in v1 · errors branch on `ApiError.code`.
- Drift fixed / found: none. Owner added F-6 row (🔄) mid-session — untouched.
- Next: F-2 (dev stack skeleton); F-6 when owner kicks it off.

### 2026-07-17 — Session 0d: per-task visual plan pages
- Done: `harness/diagrams/task-F-2.html` published — full visual F-2 plan
  (architecture SVG, file tree, service table, startup order, hot reload, git flow,
  receipt checklist); linked from build-plan.html §R.
- Decisions: owner rule — every next task gets its own detailed HTML plan page at
  `harness/diagrams/task-<id>.html` before implementation; written into the
  CLAUDE.md loop's REPORT step.
- Drift fixed / found: none.
- Next: unchanged — F-2 (dev stack skeleton), build exactly per task-F-2.html.

### 2026-07-16 — Session 0c: remote + git autonomy
- Done: repo pushed to GitHub — `origin` = github.com/banhcuonbathanh/n-ecom,
  `main` tracks `origin/main`.
- Decisions: owner delegated all git ops (branch/commit/push) to the agent —
  CLAUDE.md Hard Rule 3 rewritten with the policy (docs → `main` direct; code
  tasks → `task/<id>-<slug>` branch, merge after receipt; push per task + handoff).
- Drift fixed / found: none.
- Next: unchanged — F-2 (dev stack skeleton).

### 2026-07-16 — Session 0b (F-1): foundation decisions
- Done: F-1 ✅ (receipt in VERIFICATION.md).
- Decisions: Go 1.25+Gin+sqlc+MySQL 8+Redis · Next.js App Router+TS strict+Tailwind+
  Zustand+TanStack Query+RHF/Zod · Compose+Caddy+GH Actions · **Payment deferred**
  (v1 = COD, lifecycle placed→confirmed→shipped→delivered/cancelled) · Admin + AI
  deferred · v1 domains = Catalog/Cart/Checkout/Orders/Accounts · error envelope
  `{"error":{code,message,details}}` · business rules 1–5 proposed in PLAN.md.
- Drift fixed / found: repo was not a git repo → `git init`, branch `main`, checkpoint
  commit `0b727a8`; `personal.md` gitignored (not project material — owner may override).
- Next: F-2 — compose stack, hello-world BE+FE, healthcheck.

### 2026-07-16 — Session 0a: core created
- ecom-core harness scaffolded from the 10-primitive model (based on the
  restaurant project's chat-feature harness).
- Decisions taken: harness structure = one file per primitive under `harness/`;
  skills = start-task / finish-task / handoff.
- Nothing built yet. No receipts yet.

<!-- TEMPLATE — copy for each session:

### YYYY-MM-DD — Session N: <one-line title>
- Done: <tasks completed, with TASKS.md ids>
- Decisions: <anything the next session must not re-litigate>
- Drift fixed / found: <doc-vs-code notes, or "none">
- Next: <the exact next action>

-->
