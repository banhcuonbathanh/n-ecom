# PAGE_PLAN_GUIDE.md — how to build a page-plan set

> **What this is.** The recipe for producing the four documents that plan a single
> page, the way `customer_menu/` did (F-15). Copy this pattern for every new page —
> `checkout`, `order_tracking`, `admin_products`, … — and you get a consistent,
> owner-readable plan set every time.
> **One fact one home:** this guide owns the *format and process* for page plans.
> The *rules* a plan must obey still live in their owning docs (`FE_STATE.md`,
> `BE_STATE.md`, `design-system.html`, `OVERALL_PLAN.md`) — a plan **links** them,
> never restates them.

---

## 1. The doc set — four files, one folder

Every planned page gets its own folder `harness/plans/<page>/` holding four files.
Three are visual (HTML, both-theme), one is the canonical text.

| # | File | Kind | Owns | Read/made when |
|---|---|---|---|---|
| 1 | `<page>_PLAN.md` | text (source of truth) | scope · FE+BE contract · behavior spec · TASKS.md row mapping · defects designed out · decisions | **first** — everything else renders this |
| 2 | `<page>_plan.html` | visual: *the plan* | a picture of #1 — anatomy, component tree, BE contract, dataflow, behavior grid, task mapping | after #1 is stable |
| 3 | `<page>_how-it-works.html` | visual: *runtime* | end-to-end sequences — first load, add-to-cart, state hubs, the write path through every layer, cache life | after #1, once the contract is firm |
| 4 | `<page>_mockup-N.html` | visual: *the UI* | high-fidelity wireframe/preview of the actual screen on the real shell + seed data | any time; `-1`, `-2`, … per variant |

**Golden rule:** the `.md` is the only source of truth. The three HTML files are
**snapshots** — when they disagree with the `.md`, the `.md` wins (state this in each
HTML footer). Never put a fact in HTML that isn't in the `.md`.

**Naming law:** every file is prefixed with the folder/page slug
(`customer_menu_PLAN.md`, not `PLAN.md`) so a file is identifiable when opened alone
in an editor tab. Slug is `snake_case`. Mockups are numbered `_mockup-1`, `_mockup-2`.

---

## 2. Before you write — digest the source

A page plan is a *reconciliation*, not an invention:

1. **Gather the source** — reference docs, an old implementation, a design prompt,
   owner notes. Note the source path + date in the `.md` TL;DR (F-15 used a 2-agent
   digest of `reference/…/customer_menu`).
2. **Reconcile against the harness rules** — for every reference decision, check the
   owning doc (§table above). Where they conflict, **the harness wins** and you record
   *why* under "Not adopted" / "Decisions". This is the highest-value part of the plan.
3. **Mine the reference's own defects** — anything dead, disabled, or buggy in the
   source becomes a row in "Reference defects designed out" with your countermeasure.

---

## 3. Doc 1 — `<page>_PLAN.md` (the canonical plan)

Mirror the customer_menu section order. Not every page needs every section — drop
what doesn't apply, keep the numbering stable so plans read alike.

```
# <Page> — Consolidated FE + BE Build Plan (<F-##>)
> TL;DR: one-paragraph what/why + links to the two/three HTML companions
        + source path & digest date + the "one fact one home" line.

1. What the page is        — entry paths, core loop, in/out links
2. Alignment              — table: concern → owning doc (READ, don't restate)
3. BE plan
   3.1 Endpoints          — table: # · route · auth · phase/task · behavior
   3.2 Schema depended on  — tables/columns (link DB_SCHEMA.md for full specs)
   3.3 Cache map          — write → DEL keys (the invalidation AC)
   3.4 Not adopted        — reference choices rejected + why
   3.5 Wire shapes        — request/response JSON per endpoint (the object gallery)
4. FE plan
   4.1 Route + file map   — exact paths under fe/src/app + components + stores/queries
   4.2 State ownership     — table: data → kind → owner (instance of FE_STATE §1)
   4.3 Loading strategy    — the 3 tiers + the named render branches
   4.4 Page behaviors      — the numbered spec the AC will test
5. Task mapping           — table: TASKS.md row → this plan's slice → receipt type
6. Reference defects designed out — table: finding → countermeasure
7. Decisions + flags       — ✅ decided · ⚠️ FLAG · 💡 SUGGESTION · ❓ CLARIFY
8. Verify plan            — per-task receipts → harness/VERIFICATION.md
--- footer: who wrote it, when, from what; "rules live in the docs in §2".
```

Style: link owning docs, never copy their rules. Every rejected/kept choice gets a
reason. Behaviors in §4.4 are numbered because they become acceptance criteria.

---

## 4. The shared HTML skeleton (docs 2 & 3)

`_plan.html` and `_how-it-works.html` share one skeleton — same tokens, same section
pattern, both themes. Fastest path: **copy `customer_menu_plan.html` and gut the body.**
The pieces that must stay identical:

### 4.1 Theme tokens (copy verbatim — three blocks kept in sync)

`:root` (light default) + `@media (prefers-color-scheme: dark)` + explicit
`:root[data-theme="dark"]` / `:root[data-theme="light"]` overrides so the artifact
theme toggle wins in both directions. Core token set:

```
--paper --surface --ink --muted --line --accent --accent-soft
--done --done-soft --amber --amber-soft   (+ --red/--violet for sequence diagrams)
--sans --body --mono
```

`how-it-works.html` adds `--red`/`--violet` (+ soft variants) for error paths and a
second actor lane, plus SVG `<marker>` arrowheads (`mi/mm/mr/ma/mo/mg`) tinted per token.

### 4.2 Page shell + section pattern

```html
<body><div class="page">
  <header>
    <a class="back" href="../../diagrams/build-plan.html">← build-plan.html</a>
    <div class="eyebrow">ecom-core · restaurant platform · <kind> · <date></div>
    <h1>…</h1>
    <p class="lede">…</p>
    <div class="facts"> <div class="fact"><span class="k">…</span><span class="v">…</span></div> …</div>
  </header>
  <nav class="topnav"><a href="#s1">01 …</a> … </nav>

  <section id="s1">
    <div class="sec-head"><span class="sec-num">01</span><h2>…</h2></div>
    …
  </section>
  …
  <footer>Written by … · snapshot of <page>_PLAN.md, which wins on any conflict.</footer>
</div></body>
```

### 4.3 Reusable components (already in the skeleton CSS)

`.golden` (blue call-out, the key takeaway) · `.flag` (amber, a risk) ·
`.chip.done/.amber/.plan` (status) · `.t.c/.tt/.o` (phase task tags) ·
`.table-wrap > table` (scrolls on narrow) · `pre.diagram` (mono ASCII diagram) ·
`.flow > .fnode + .farrow` (left-to-right pipeline) · `.strip > .snode` (phase strip) ·
`.bgrid > .bcard` (behavior cards) · `.schema > .tbl` (DB table boxes).

**Responsive law (artifact rules):** body never scrolls sideways; wide content
(tables, diagrams, phone frames) scrolls inside its own `overflow-x:auto` box.

---

## 5. Doc 2 — `<page>_plan.html` (visualize the plan)

A section-per-concern picture of the `.md`. customer_menu's nine, reuse what fits:

```
01 Page anatomy      — phone wireframe + numbered callouts (mockup-lite)
02 Component tree     — the §4.1 file map, each node tagged with its owning task
03 State ownership    — the §4.2 table + the cart-id scheme + "how state crosses"
04 BE contract       — endpoints table + schema boxes + cache map + wire shapes
05 Dataflow          — read path + the 3 loading tiers + the write handoff
06 Behaviors spec     — the §4.4 behaviors as a .bgrid of cards (the AC)
07 Defects designed out — §6 as a table
08 Task mapping       — §5 table + a phase .strip showing build order
09 Decisions + flags  — §7 + the verify plan
```

---

## 6. Doc 3 — `<page>_how-it-works.html` (visualize the runtime)

Not *what we'll build* but *what happens when it runs* — numbered end-to-end
sequences, drawn. customer_menu's seven, adapt to the page:

```
01 Big picture        — the whole machine on one screen; entry paths; traffic kinds
02 First load        — the 3-tier loading strategy, step by step; the render branches
03 The core client action — (add-to-cart) what happens with zero network
04 Key store internals — the domain model + a "how the tool actually works" primer
05 State across components & pages — the hubs, drawn as a route neighborhood
06 The write path     — POST … through every layer (client → Gin → sqlc → MySQL, in tx)
07 Cache/Redis life   — cache-aside, invalidation fan-out, fail-open, staleness bound
```

Lean on inline `<svg>` sequence diagrams (actor lanes + the `<marker>` arrowheads) and
`.flow`/`.fnode` pipelines. This doc is where "what a combo becomes at each hop"–style
transformations get drawn.

---

## 7. Doc 4 — `<page>_mockup-N.html` (visualize the UI)

A high-fidelity render of the actual screen — the C-4 preview an owner can eyeball.

- **Uses the real customer shell palette, NOT the theme tokens** — the customer surface
  is locked to the reference dark + orange (`#0b0f17` bg / `#1b2230` surface / `#f97316`
  accent / Georgia-serif title; see PLAN §7 FLAG). It must look the same in the viewer's
  light and dark theme, so it hard-codes those hex values (see the `.phone`/`.ph-*`
  block in `customer_menu_plan.html` for the component kit). Staff/admin mockups instead
  use `design-system.html`'s neutral F-7 tokens.
- Render **real seed data** and the **worked example** (Bàn 04 · 103.000 đ · badge 13)
  so numbers are consistent across every doc and screenshot.
- Number `-1`, `-2`, … for alternates; keep each standalone.

---

## 8. Build order & registration

1. **Write `<page>_PLAN.md`** — digest → reconcile → the 8 sections.
2. **Render `_plan.html`** from it (copy the skeleton, fill sections).
3. **Render `_how-it-works.html`** once the contract is firm.
4. **Render `_mockup-N.html`** for the UI preview.
5. **Register (Hard Rule 6 — same change):** add a row for **every** new file to
   `harness/CONTEXT_MAP.md §Doc inventory` **and** `harness/README.md §plans/`.
   Point CONTEXT_MAP §Routing rows ("New FE page/component", "New BE endpoint") at the
   new folder so future tasks find it.
6. **Commit** to `main` (doc change, Hard Rule 3) and note it in `STATE.md`.

---

## 9. Quality checklist (before you call a set done)

- [ ] All four files prefixed with the page slug; folder is `harness/plans/<page>/`.
- [ ] `.md` is the only source of truth; each HTML footer says so.
- [ ] Every reference decision is either adopted or in "Not adopted"/"Decisions" **with a reason**.
- [ ] Rules are **linked** to their owning doc, never restated (§2 alignment table exists).
- [ ] §4.4 behaviors are numbered → they map to acceptance criteria in §5/§8.
- [ ] Both HTML themes render (light + dark, prefers-color-scheme + data-theme toggle).
- [ ] No horizontal page scroll; wide blocks scroll inside their own box.
- [ ] Mockup uses the correct shell palette + real seed data + the worked example.
- [ ] CONTEXT_MAP + README rows added for every new file (Hard Rule 6).
- [ ] Verify-plan receipt logged in `harness/VERIFICATION.md`.

---

## 10. Page backlog — every page to plan

The 34 pages defined in the reference (`reference/docs/system/08_pages/`), grouped by
surface. `✅` has a plan set under `harness/plans/<slug>/`; `⬜` is unplanned. Each row
is a candidate `harness/plans/<slug>/` folder — make its 4-doc set with this guide.

### 🛒 Customer (14)

| slug | plan set |
|---|---|
| `customer_menu` | ✅ F-15 |
| `customer_welcome` | ⬜ |
| `customer_table_qr` | ⬜ QR airlock — mints the guest JWT the menu consumes |
| `customer_product_detail` | ⬜ partly pre-scoped as `/menu/product/[id]` (menu plan C-5) |
| `customer_combo_detail` | ⬜ partly pre-scoped as `/menu/combo/[id]` (menu plan C-5) |
| `customer_checkout` | ⬜ online path — `source:'online'`, name/phone |
| `customer_orders_tracking` | ⬜ |
| `customer_tracking` | ⬜ |
| `customer_order_detail` | ⬜ |
| `customer_order_list` | ⬜ |
| `customer_favourites` | ⬜ |
| `customer_profile` | ⬜ |
| `customer_settings` | ⬜ |
| `customer_introduction` | ⬜ |

### 👨‍🍳 Staff (5)

`staff_login` · `staff_pos` · `staff_kds` · `staff_cashier_payment` · `staff_register`
— all ⬜. Staff/admin surfaces use the neutral F-7 `design-system.html` tokens, **not**
the customer dark/orange shell (§7).

### 🛠️ Admin (13)

`admin_overview` ✅ **F-17** · `admin_summary` · `admin_products` · `admin_categories` ·
`admin_combos` · `admin_toppings` · `admin_ingredients` · `admin_storage` ·
`admin_staff` · `admin_marketing` · `admin_training` · `admin_task_board` ·
`admin_todo_list` — all ⬜.

### 🌐 Public (2)

`public_landing` · `public_legal` — both ⬜.

**Suggested order** (cheapest first — most contract shared with the done menu plan):
`customer_table_qr` → `customer_product_detail` / `customer_combo_detail` →
`customer_checkout` → `customer_orders_tracking` / `customer_order_detail`. When a page
is already partly scoped inside another plan (the two `*_detail` pages live in the menu
plan's §4.1), **cross-link, don't re-derive.**

---

*Written 2026-07-19, distilled from the F-15 customer_menu page-plan set. This guide
owns the page-plan format; page rules live in the docs named in §2 of any plan.*
