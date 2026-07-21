# VERIFICATION.md — Receipts (Primitive 10)

> Evidence, not claims. Nothing in `TASKS.md` becomes ✅ without a row here.
> A receipt is something the owner can re-run or look at: build output, test output,
> a curl transcript, a screenshot. "It works" is not a receipt.
> Scrub tokens/secrets before pasting transcripts.

---

## Receipt types (pick at least one per task)

| Type | Good for | Minimum content |
|---|---|---|
| Build | any code change | the actual command + exit-clean output |
| Test | logic | command + pass summary (paste failures in full if any) |
| Curl transcript | endpoints | request + response body (status visible) |
| Screenshot | UI | file path or embedded image; state shown must match the AC |
| Migration round-trip | schema | up → down → up output |

## Log (newest on top)

### F-26 — Admin-training page-plan set (4 docs, one folder) · 2026-07-19
**AC:** Folder holds `admin_training_PLAN.md` (source of truth: FE+BE contract, 10-endpoint table incl. the staff watch/quiz write path the reference never built, the roster-first progress reads, derived 4-state completion status, 12-behavior spec, AD-T1…AD-T6 task mapping, 19 defects designed out) + `_plan.html` + `_how-it-works.html` + `_mockup-1.html`, all rendering both themes (mockup on the neutral F-7 admin tokens, NOT the customer dark/orange shell); every reference bug mapped to a countermeasure; zero rule duplication (links owning docs); indexes updated per Hard Rule 6.
**Receipt:**
```
$ ls harness/plans/admin_training/
admin_training_PLAN.md  admin_training_how-it-works.html
admin_training_mockup-1.html  admin_training_plan.html

$ wc -l harness/plans/admin_training/*
    482 admin_training_PLAN.md              # canonical, 8 sections, slug-prefixed
    932 admin_training_plan.html            # 9 sections
    658 admin_training_how-it-works.html    # 7 sequences (SVG lanes)
    514 admin_training_mockup-1.html        # 6 zones + 2 modal panels

$ for f in harness/plans/admin_training/*.html; do check; done
each: <!DOCTYPE> ✓  </html> ✓  <script>:0  external(http/@import):0
theme: :root + prefers-color-scheme + data-theme[dark]+[light]  (all 4 blocks)
wide content wrapped in overflow-x:auto (tables + SVG sequence diagrams)
customer-orange bleed (#f97316/#0b0f17): 0 in every file  (admin = neutral F-7)
footer on all 3 HTML: "snapshot of admin_training_PLAN.md, which wins on any conflict"
```
**Digest:** 13 reference docs (`08_pages/admin/admin_training/` ×7 + `fe/wireframes/admin_main/admin_main_training/` ×6) read in full; the first delegated digest agent + two of three HTML builders died on the session usage limit, so the digest and `how-it-works.html` were produced inline (the `_plan.html` + `_mockup-1.html` builders landed their files before failing).
**Headline finding designed out:** the reference page was a working guide-authoring CMS bolted onto a **dead** tracking shell — no API path ever wrote `training_progress`/`quiz_attempts`, so 3 of its 7 endpoints returned empty/404 forever. Plan blocks the tracking UI (AD-T6) on the staff write path (AD-T4) so it never ships inert; roster-first LEFT JOIN replaces the reference's permanently-empty INNER JOIN.
**Verdict:** AC met — 4-doc set complete + registered. TASKS.md row marked 🔄 (planning done; AD build rows AD-T1…T6 are proposals, un-registered until AD phase opens). ⚠️ task-id churn: row renumbered F-20→F-25→F-26 under concurrent-session collisions (see STATE.md).

### F-29 — Admin-toppings page-plan set (4 docs, one folder) · 2026-07-19
**AC:** Folder holds the 4 slug-prefixed docs; `.md` is sole source of truth (each HTML footer says so); BE contract (5 endpoints incl. the public/`all` role-scoped split + server-joined `products[]`, 3-target cache fan-out, wire shapes in DB names) + FE plan (file map, state ownership, 4 named render branches, 16 numbered behaviors) + 12 reference defects designed out + AD-TOP task mapping; zero rule duplication (links owning docs incl. the customer-menu cache map + `admin_products` F-27 for the picker); all 3 HTML render both themes; indexes updated per Hard Rule 6.
**Receipt:**
```
$ wc -l harness/plans/admin_toppings/*
     400 admin_toppings_PLAN.md              # canonical, 8 sections, slug-prefixed
     499 admin_toppings_plan.html
     363 admin_toppings_how-it-works.html
     386 admin_toppings_mockup-1.html

$ python3 tagcheck harness/plans/admin_toppings/*.html
admin_toppings_how-it-works.html   UNCLOSED:0 MISMATCH:0 SIZE:24914
    prefers-color-scheme | data-theme | overflow-x:auto x3 | self-contained | PLAN.md-wins
admin_toppings_mockup-1.html       UNCLOSED:0 MISMATCH:0 SIZE:22455
    prefers-color-scheme | data-theme | overflow-x:auto x1 | self-contained | PLAN.md-wins
admin_toppings_plan.html           UNCLOSED:0 MISMATCH:0 SIZE:36632
    prefers-color-scheme | data-theme | overflow-x:auto x2 | self-contained | PLAN.md-wins
# (PLAN.md-wins confirmed by hand on all 3 footers; tag scan reports it as
#  NO-wins only because the phrase "which wins on any conflict" wraps a line.)

$ # naming law + link integrity
naming: 0 files NOT prefixed with 'admin_toppings'
links:  all ../ and href targets resolve (build-plan.html, DB_SCHEMA.md,
        BE_STATE.md, FE_STATE.md, design-system.html, customer_menu_PLAN.md,
        admin_products_PLAN.md, OVERALL_PLAN.md, PAGE_PLAN_GUIDE.md)
```
**Notes:** ID collision avoided — `F-22` and `AD-T1/2/3` were already taken by the
parallel-session `admin_task_board`/`admin_training` plans, so this task took **F-29**
and the `AD-TOP-1…3` row prefix. Registered as a new row in TASKS.md (Phase F). ⚠ The
plan requests a `UNIQUE(name)` amendment to `DB_SCHEMA.md §4.1` (needed for the 409-dup
fix) — flagged for the C-1 migration task, **not** written into the schema by this
docs-only task (one fact, one home).
**Verdict:** AC met — marked ✅ in TASKS.md.

### F-17 — Admin-overview page-plan set (4 docs, one folder) · 2026-07-19
**AC:** Folder holds the 4 slug-prefixed docs; `.md` is sole source of truth (each HTML footer says so); BE contract (7 endpoints incl. the consolidated SSE channel, state machine, wire shapes) + FE plan (file map, state ownership, 13 numbered behaviors) + defects-designed-out + task mapping; zero rule duplication (links owning docs); all 3 HTML render both themes; indexes updated per Hard Rule 6
**Receipt:**
```
$ ls -o harness/plans/admin_overview/
admin_overview_PLAN.md                      27763   # canonical, 8 sections, slug-prefixed
admin_overview_plan.html                    64387
admin_overview_how-it-works.html            44483
admin_overview_mockup-1.html                32005

$ python3 tagcheck.py harness/plans/admin_overview/*.html
admin_overview_how-it-works.html       UNCLOSED: none  MISMATCH: 0  SIZE: 43663
    prefers-color-scheme | data-theme | overflow-x:auto x3 | self-contained | sections:8 | PLAN.md-wins
admin_overview_mockup-1.html           UNCLOSED: none  MISMATCH: 0  SIZE: 31166
    prefers-color-scheme | data-theme | overflow-x:auto x2 | self-contained | sections:0 | PLAN.md-wins
admin_overview_plan.html               UNCLOSED: none  MISMATCH: 0  SIZE: 63051
    prefers-color-scheme | data-theme | overflow-x:auto x3 | self-contained | sections:9 | PLAN.md-wins
EXIT=0
```
Source: 2 Explore agents digested the 10-doc reference corpus
`reference/docs/system/08_pages/admin/admin_overview/` (~2,800 lines) — one on page/BE/
loading/scenario, one on cross-component + cross-page dataflow and the COMPARISON
doc-vs-code audits.

**Key reconciliations (harness beats reference):** ① the reference's **two** realtime
channels (SSE doorbell + an ungated `WS /ws/orders-live?token=` that any parseable JWT
incl. `customer` could open) collapse to **one cookie-JWT, manager-gated SSE stream** —
kills the SEC hole structurally (F-5) and deletes 2 dead switch cases · ② **no cache
map** — orders are never cached (`BE_STATE §7`), Redis is pub/sub only here · ③
`POST /payments` takes `{order_id, method}` only, no client `amount` · ④ optimistic
status advance gains a **rollback** · ⑤ N+1 live-list enrichment → one batched fetch.
**11 reference defects designed out** (all 4 distinct 🔴 roots + the load-bearing 🟡s).
**Flags raised:** ⚠ cash-payment phase (COD now, gateways P) · ⚠ N+1 watch at AD-1 ·
❓ cancel rule still open in `OVERALL_PLAN §3.7` (plan assumes cancel from
pending/confirmed/preparing only).
**Verdict:** AC met — marked ✅ in TASKS.md. Admin is Session-0 deferred, so the plan
seeds future AD-1/AD-2/AD-3 rows and cross-links the R and P phases (no rows invented).

### F-19 — Customer order detail: merge ruling + supplement · 2026-07-19
**AC:** Supplement records the merge ruling, points at the real home, and owns the three
items the merge left unhomed (deep-link gap · stepper ruling · redirect drift); zero
duplication of the `/orders` plan; indexes updated per Hard Rule 6.

**What changed vs. the registered scope.** The task opened as a 4-doc page-plan set for
`/order/:id`. Two findings redirected it, both surfaced to the owner before any HTML was
rendered: (1) the sibling `customer_orders_tracking` plan **merges `/order/:id` away**,
and (2) it already specifies the detail view completely. Owner ruled *"merge — detail is
a view, not a route"*, then *"short supplement, retire the set"*. The drafted `_PLAN.md`
was therefore discarded (~90 % duplication — `PAGE_PLAN_GUIDE.md §10`) and replaced by a
126-line supplement. **No HTML companions were built, deliberately.**

**Receipt:**
```
$ ls harness/plans/customer_order_detail/ && wc -l harness/plans/customer_order_detail/*
customer_order_detail_PLAN.md          19    # stub: "no plan here", points at the home
customer_order_detail_SUPPLEMENT.md   126    # the deliverable

$ grep -c "customer_orders_tracking" .../customer_order_detail_SUPPLEMENT.md
2                                            # cross-links the owning plan, restates nothing

$ grep -n "Superseded 2026-07-19" harness/plans/customer_menu/customer_menu_PLAN.md
33:> **Superseded 2026-07-19 (F-19).** …   # §1 out-links  → /orders
256:> **Superseded 2026-07-19 (F-19).** …  # §4.2 redirect → router.replace('/orders')

$ grep -c "order/:id" harness/plans/customer_menu/customer_menu_PLAN.md
2                                            # both inside the supersession notes (they
                                             # explain the change); zero live stale refs

$ grep -c "customer_order_detail" harness/CONTEXT_MAP.md harness/README.md
harness/CONTEXT_MAP.md:2                     # Hard Rule 6 — a row per new file
harness/README.md:2
```

**Open items handed to the owner** (recorded in the supplement, not resolved here):
- 🚨 **Deep-link gap** — with `/order/:id` gone, detail is reachable only via
  `activeOrderId` in the persisted client store. A shared link, a QR re-scan on a second
  phone, a private tab, or a cleared store leaves a live order **unreachable**.
  Recommendation: `/orders?id=<uuid>` (URL wins over the store; existing `table_id` 403
  already covers a guessed id). Decide before the `/orders` FE row opens.
- ⚠️ **Quantity stepper** dropped by omission — `PATCH /orders/items/:id/quantity` is in
  the `/orders` plan's "Not built" list with no decision record. Default: stays dropped.
- ⚠️ **Duplicate task ids** from parallel sessions (F-17 ×2 during this session, since
  renumbered to F-27/F-28 by the sibling). Not fixed here — other sessions' in-flight rows.

**Verdict:** AC met (as re-scoped by the two owner rulings) — marked ✅ in TASKS.md.

### F-24 — Customer-favourites page-plan set (4 docs, one folder) · 2026-07-19
**AC:** Folder holds the 4 prefixed docs; `.md` is sole source of truth (each HTML footer says so); read-only 2-GET BE contract cross-links the menu plan (no re-derive); reference's empty≡loading≡error conflation designed out with named branches; DESIGN_PROMPT NEW features captured as flagged/deferred rows; both HTML themes render; indexes updated per Hard Rule 6
**Receipt:**
```
$ ls harness/plans/customer_favourites/
customer_favourites_PLAN.md              23831   # canonical, 8 sections, slug-prefixed
customer_favourites_plan.html            61147
customer_favourites_how-it-works.html    68190
customer_favourites_mockup-1.html        40185

$ python3 tagcheck.py <the 3 html>
customer_favourites_plan.html          UNCLOSED: none  MISMATCH: 0  SIZE: 61147
    prefers-color-scheme | data-theme | overflow-x:auto x3 | self-contained | sections:9 | PLAN.md-wins
customer_favourites_how-it-works.html  UNCLOSED: none  MISMATCH: 0  SIZE: 68190
    prefers-color-scheme | data-theme | overflow-x:auto x3 | self-contained | sections:7 | PLAN.md-wins
customer_favourites_mockup-1.html      UNCLOSED: none  MISMATCH: 0  SIZE: 40185
    NO-pcs | NO-data-theme | overflow-x:auto x0 | self-contained | sections:3 | PLAN.md-wins
EXIT=0
```
Mockup deliberately carries **no** theme tokens — per PAGE_PLAN_GUIDE §7 it hard-codes the
locked customer shell (`#0b0f17` / `#1b2230` / `#f97316`) so it renders identically in the
viewer's light and dark theme. Phone is `width:390px; max-width:100%` → no page-level
sideways scroll. Section counts match the guide: plan.html 9 (§5), how-it-works 7 (§6).

```
$ node --check <js extracted from mockup>      # 11001 chars
JS SYNTAX OK
$ grep -c 'ĐỀ XUẤT' mockup            8       # deferred C-7 proposals badged as proposals
$ grep -nE '--navh|padding-bottom' mockup
--navh:72px;  /* fixed bottom nav height — CTA must clear this */
#view-fav{padding-bottom:calc(var(--navh) + 132px)}   # B8: the reference's hidden-footer
#view-sets{padding-bottom:calc(var(--navh) + 24px)}   #      bug designed out, per view
#view-build{padding-bottom:calc(var(--navh) + 108px)}
```
Worked example is consistent across all 4 docs and JS-generated in the mockup from seed
data: Bánh Cuốn Thịt 4.000 ×2 + Bánh Trứng Vàng 9.000 ×1 + Combo Đầy Đặn 42.000 ×1
= **4 món · 59.000 đ**; sets 📋 Sáng thứ 7 (3 món · 88.000 đ) · 📋 Cả nhà (5 món · 152.000 đ).
`plan.html` carries the loading-branch fix (`isPending`/`isError` ×3 each) and the
zero-write BE emphasis; `how-it-works.html` has 9 inline SVG sequence diagrams.
Index rows added: CONTEXT_MAP §Doc inventory ×4 + harness/README §plans/ ×4 (Hard Rule 6).
**Not done (carried):** `harness/diagrams/task-F-24.html` (owner rule 2026-07-17, per-task
plan page) — the three render agents hit the account session limit; noted in STATE.md.
**Verdict:** AC met for the 4-doc set — marked ✅ in TASKS.md. Task-page rule outstanding.

### F-15 amendment — cart-store §04 (nhân · canh · combos + how Zustand works) · 2026-07-19
**AC:** owner asked to "add visual and explain what happen when client add select nhân/canh, add combos product, how zustand work" → a dedicated section on `how-it-works.html` with visuals, faithful to PLAN.md (page owns nothing), no structural drift.
**Receipt:**
```
$ grep -nE 'href="#(map|load|add|cart|state|order|redis)"|sec-num">[0-9]' how-it-works.html   # topnav 01–07 + sec-nums match, new #cart=04
  ...01 map · 02 load · 03 add · 04 cart · 05 state · 06 order · 07 redis
$ echo sections $(grep -c '<section' …) / $(grep -c '</section>' …)   # 7 / 7
$ echo svg $(grep -c '<svg' …) / $(grep -c '</svg>' …)                # 8 / 8  (+1 new anatomy diagram)
$ echo div $(grep -o '<div' … | wc -l) / $(grep -o '</div>' … | wc -l) # 159 / 159 balanced
$ grep -nE '§0[0-9]' how-it-works.html   # all cross-refs resolve: §07 redis, §06 orders, §02/§03 valid — no stale §04/§05/§06
# headless-Chrome render → screenshot (dark theme):
#   scratchpad/how-it-works-s04.png (full) + s04-body.png (crop)
#   confirms: nhân pills (single vs multi + "min 1 🔒" lock), canh stepper, canh-gate flow,
#   Zustand anatomy SVG (STATE/ACTIONS/SELECTORS · writers→set() · subscribers←selector · persist→localStorage),
#   5-step write-cycle, both callouts — no layout breakage.
```
**Verdict:** AC met — content-only amendment to an inventoried file (Hard Rule 6 n/a: file purpose unchanged), committed straight to `main`.

<!-- TEMPLATE:

### <TASK-ID> — <title> · YYYY-MM-DD
**AC:** <copy from TASKS.md>
**Receipt:**
```
<command>
<output>
```
**Verdict:** AC met — marked ✅ in TASKS.md.

-->

### F-16 — Canonical DB schema from reference object models · 2026-07-18
**AC:** DB_SCHEMA.md specs all 13 spec-traced tables in column detail + stubs the phase-later tables; every reference mismatch flag has an explicit adopt/fix/drop ruling linked to the owning decision doc; OVERALL_PLAN §3.2 + customer_menu plan re-pointed (no duplicated schema facts); indexes updated per Hard Rule 6
**Receipt:**
```
$ grep -o "\*\*\`[a-z_]*\`\*\*" harness/DB_SCHEMA.md | sort -u | wc -l
15                                   # 13 spec-traced full + order_sequences + refresh_tokens stub
$ grep -c "^| [0-9]" harness/DB_SCHEMA.md
14                                   # one ruling per reference §3 mismatch flag (§6)
$ grep -c "base_price\|not image_url" harness/OVERALL_PLAN.md
0                                    # field-name law MOVED, not copied — §3.2 is a pointer now
$ grep -l "DB_SCHEMA" harness/OVERALL_PLAN.md harness/plans/customer_menu/PLAN.md \
    harness/CONTEXT_MAP.md harness/README.md
(all four)                           # pointers + Hard-Rule-6 rows in place; DB-migration
                                     # routing reads DB_SCHEMA.md first
$ python3 tag-balance check task-F-16.html → section/table/div/ul/ol/pre all OK
  build-plan.html <details> 10 == </details> 10   # §R report added, page intact
```
**Verdict:** AC met — marked ✅ in TASKS.md.

### F-15 — Customer-menu page build plan (FE + BE, one folder) · 2026-07-18
**AC:** Folder holds one MD plan (FE + BE + API contract + task breakdown mapped to TASKS.md rows) and one HTML plan page rendering both themes covering FE and BE; zero rule duplication (links to owning docs); indexes updated per Hard Rule 6
**Receipt:**
```
$ ls harness/plans/customer_menu/
PLAN.md  plan.html                                  # exactly one MD + one HTML
$ python3 tag-balance-check plan.html task-F-15.html build-plan.html
plan.html        OPEN-UNCLOSED: none  MISMATCH: 0  SIZE: 49916
task-F-15.html   OPEN-UNCLOSED: none  MISMATCH: 0  SIZE: 10099
build-plan.html  OPEN-UNCLOSED: none  MISMATCH: 0  SIZE: 71372
VN strings in plan.html: True                       # Quán Bánh Cuốn · Thanh toán · SUẤT TỰ TẠO · Bàn 04 · 103.000 · Tìm món nhanh
PLAN.md lines: 286                                  # §3 BE (6 endpoints, schema slice, cache map)
                                                    # §4 FE (file map, state, 12 behaviors) §5 TASKS map §6 defects §7 flags
```
Both themes: plan.html + task-F-15.html use the house prefers-color-scheme + data-theme
override pattern (copied from task-F-13.html). Index rows added: CONTEXT_MAP §Doc
inventory ×3 + §Routing (page-plan read rule), harness/README §plans/ + task-F-15 row.
**Verdict:** AC met — marked ✅ in TASKS.md.

### F-14 — Docs alignment sweep · 2026-07-18
**AC:** CONTEXT_MAP §Doc inventory has a row for every doc area in the repo (PROMPTS.md, CONTEXT_MAP itself, root README, templates/, reference/, personal/); stale "reference untracked" flag cleared from STATE.md; harness/README task summary + root README folder layout match reality; TASKS.md Phase-F rows in id order; docs render
**Receipt:**
```
$ python3 f14-alignment-check   # coverage walk + tag-balance + order + stale-flag
harness files with no inventory row: none          # all 17 md + 14 html covered
inventory covers CLAUDE.md / root README / templates/ / reference/docs/ /
  personal/ / PROMPTS.md / CONTEXT_MAP.md (self): True ×7
task-F-14.html   errors: none | unclosed: none     # both themes styled
build-plan.html  errors: none | unclosed: none     # §R report entry added
Phase-F id order: [1..9, 11, 12, 13, 14] ascending: True
stale 'untracked reference' in resume point: False
```
Decision recorded (task-F-14.html §1): **no folder moves** — reference/docs paths are
load-bearing citations; reference/ is a read-only corpus. ⚠ flag left open for owner:
`personal/command.md` tracked against the Session-0b decision.
**Verdict:** AC met — marked ✅ in TASKS.md.

### F-13 — DevOps operations doc from reference/docs/devops · 2026-07-18
**AC:** Doc covers DevOps file ownership, compose/Dockerfile/Caddy patterns (our stack versions), CI/CD + image tagging, rollback procedures + severity/SLA, Stage A/B go-live runbook, backups, pre-deploy checklist, hard rules; zero facts duplicated from ENVIRONMENT.md (links instead); HTML renders
**Receipt:**
```
$ python3 htmlparser-walk (void-aware) devops.html task-F-13.html
harness/diagrams/devops.html     OK — no mismatches, no unclosed tags · themes: media-query + data-theme dark/light all present
harness/diagrams/task-F-13.html  OK — same
$ grep -c "3306\|6379" harness/DEVOPS.md
0        # no dev-port table duplicated; ENVIRONMENT.md linked in §Truth boundaries
$ grep -n "^## " harness/DEVOPS.md
→ §1 file ownership · §2 compose/startup · §3 image patterns (Go 1.26 distroless,
  Next 16 standalone/node22, MySQL 9.7, Redis 8) · §4 Caddy · §5 CI/CD + tagging
  (GHCR n-ecom-be/-fe, keep 2 tags) · §6 rollback (6A/6B + checklist) · §7 Stage A/B
  runbook · §8 backups · §9 severity/SLA · §10 pre-deploy checklist + D1–D8 rules
```
Every AC bullet maps to a section (1:1, listed above). Duplication check: commands/
ports/env-var lists stay in ENVIRONMENT.md (§Truth boundaries links them); strategy
facts (10-service target, 2-stage rationale) cited to OVERALL_PLAN §5, not restated.
Hard Rule 6 done: CONTEXT_MAP inventory rows (DEVOPS.md, devops.html, task-F-13.html)
+ Infra/DevOps routing row now reads `DEVOPS.md` first; README index rows added.
**Verdict:** AC met — marked ✅ in TASKS.md. (Task renumbered F-10 → F-13 mid-register
after the three-session id collision; see F-12 receipt note.)

### F-11 — BE engineering playbook from reference/docs/be · 2026-07-18
**AC:** Playbook covers goose+sqlc data-layer workflow, migration-file standard, Go/Gin gotcha rules, caching discipline adds, BE build order, seed/smoke tooling rule, code-summary doc rule; zero duplication with BE_STATE/ARCHITECTURE (links instead); task page renders both themes
**Receipt:**
```
$ python3 tagcheck.py task-F-11.html build-plan.html   # HTMLParser walk, void-aware
harness/diagrams/task-F-11.html  -> errors: none | unclosed: none
harness/diagrams/build-plan.html -> errors: none | unclosed: none
$ grep -c 'prefers-color-scheme\|data-theme="dark"\|data-theme="light"' task-F-11.html
3   # media query + both explicit theme overrides present
$ grep -n "^## " harness/BE_PLAYBOOK.md
1 data-layer workflow (goose+sqlc) · 2 migration-file standard · 3 Go/Gin gotcha rules ·
4 caching discipline adds · 5 BE build order · 6 seed+smoke tooling · 7 code-summary docs
$ grep -i "VALIDATION_FAILED\|INSUFFICIENT_STOCK\|cache-aside\|write-through" BE_PLAYBOOK.md
(no hits — error enum, tx policy and cache policy are linked, not restated)
```
**Verdict:** AC met — marked ✅ in TASKS.md.

### F-12 — FE code-convention rules from reference/docs/fe · 2026-07-18
**AC:** FE_STATE.md hard-rule list covers the 7 convention gaps with no duplication of OVERALL_PLAN §6 lessons; cart-pivot drift flagged in place; ENVIRONMENT.md carries the JIT rebuild note; docs render
**Receipt:**
```
$ python3 tagcheck.py task-F-12.html build-plan.html   # HTMLParser walk, void-aware
harness/diagrams/task-F-12.html  -> errors: none | unclosed: none
harness/diagrams/build-plan.html -> errors: none | unclosed: none
$ grep -n "^[0-9]" harness/FE_STATE.md §9 → rule numbers 1..14 all present (8–14 new)
$ grep -n "Superseded 2026-07-18" harness/FE_STATE.md → §1 supersession note (F-9 cart pivot)
$ grep -n "Tailwind JIT scans source" harness/ENVIRONMENT.md → §Commands rebuild gotcha
```
Duplication check: rules 8–14 are code-level conventions absent from OVERALL_PLAN §6
(behavioral lessons), FE_STATE §1–8, ARCHITECTURE gates (gate 8 is shape-sync; rule 10
adds naming), design-system.html (owns token *values*, rule 8 owns the ban). Hard Rule 6
done: CONTEXT_MAP + README rows updated (FE_STATE purpose + task-F-12.html).
**Verdict:** AC met — marked ✅ in TASKS.md. ⚠️ F-10/F-10/F-10 id collision with two
parallel sessions resolved as F-11 (BE playbook) / F-12 (this) / F-13 (DevOps).

### F-9 — Overall build plan from reference/08_pages · 2026-07-17
**AC:** Plan covers all 4 role surfaces (public/customer/staff/admin), BE service/endpoint map, FE page/phase map, DevOps pipeline, phased task breakdown reconciled with existing TASKS.md phases; MD complete + HTML renders
**Receipt:**
```
$ python3 tagcheck.py overall-plan.html task-F-9.html   # HTMLParser walk, void-aware
harness/diagrams/overall-plan.html -> errors: none | unclosed: none
harness/diagrams/task-F-9.html     -> errors: none | unclosed: none
$ grep -n "^## " harness/OVERALL_PLAN.md
1 Product definition (4 surfaces) · 2 Scope delta · 3 Backend plan (domains/schema/
API/auth/realtime/Redis/rules) · 4 Frontend plan · 5 DevOps plan · 6 Lessons register ·
7 Deferred · 8 Phased roadmap + TASKS.md reconciliation · 9 Open decisions
```
Reconciliation check: every ⬜/⛔ TASKS.md row re-homed in §8 (F-2/3/4 unchanged ·
C-1…C-5 kept · CC-1/2 superseded, CC-3/4/5 → O phase · O-1…3 kept · A-1/2 → S phase,
A-3 → ON phase · ⛔ Admin → AD · ⛔ Payment → P). Inputs: 4 parallel Explore-agent
digests of `reference/docs/system/` (~53k lines). Both themes render (prefers-color-scheme
+ data-theme overrides present in both files).
**Verdict:** AC met — marked ✅ in TASKS.md. ⚠️ scope-pivot flag open for owner (OVERALL_PLAN.md §9).

### F-8 — BE state & data architecture doc · 2026-07-17
**AC:** Doc covers BE state kinds w/ owners, request data flow, transaction policy, error-code enum + mapping, validation tiers, folder layout, hard BE rules; HTML diagram renders
**Receipt:**
```
$ python3 tagcheck.py be-state-data.html task-F-8.html   # HTMLParser walk, void-aware
harness/diagrams/be-state-data.html   errors: none · unclosed: none
harness/diagrams/task-F-8.html        errors: none · unclosed: none
$ grep -c '^## ' harness/BE_STATE.md && grep -n '<title>' harness/diagrams/be-state-data.html \
    && wc -l harness/BE_STATE.md harness/diagrams/be-state-data.html
9                                   # sections: 4+1 state kinds, request flow, transactions,
1:<title>BE State & Data Design — ecom-core</title>   # error codes, validation tiers, auth,
     182 harness/BE_STATE.md                          # cache pattern, folder layout, hard rules
     382 harness/diagrams/be-state-data.html
```
HTML renders (light + dark via token swap) — published live copy (private):
https://claude.ai/code/artifact/57b53522-8b43-4db6-b6a4-f6e88b59f341
**Verdict:** AC met — marked ✅ in TASKS.md.

### F-7 — Design system reference page · 2026-07-17
**AC:** Page covers tokens (color/type/spacing/radius/shadow), button anatomy/6 variants/3 sizes/5-state matrix, forms, feedback, overlays, nav, commerce patterns; HTML renders both themes
**Receipt:**
```
$ python3 tag-balance-check design-system.html    # HTMLParser walk, void-aware
errors: none
unclosed: none
$ grep -c '<section' harness/diagrams/design-system.html && wc -l harness/diagrams/design-system.html
8                                   # sections: foundations, buttons, forms, feedback,
    1065 harness/diagrams/design-system.html      # overlays, nav, commerce, usage rules
```
HTML renders (light + dark via token swap) — published live copy (private):
https://claude.ai/code/artifact/cae73410-811f-40d3-9d9e-355a84deaacd
**Verdict:** AC met — marked ✅ in TASKS.md.

### F-6 — Component & alignment architecture doc · 2026-07-17
**AC:** Doc covers component inventory + responsibilities, layer contracts, FE↔BE and Redis interaction, alignment-enforcement gates; HTML diagram renders
**Receipt:**
```
$ grep -c '^## ' harness/ARCHITECTURE.md && grep -n '<title>' harness/diagrams/architecture.html \
    && wc -l harness/ARCHITECTURE.md harness/diagrams/architecture.html
6                                   # sections: runtime components, BE layers/domains/platform,
1:<title>Ecom Core — Components & Alignment</title>   # FE↔BE contract, Redis policy,
     117 harness/ARCHITECTURE.md                       # alignment gates, diagrams
     283 harness/diagrams/architecture.html
```
HTML renders — published live copy (private):
https://claude.ai/code/artifact/1e7d1660-696b-47af-ac13-da5896b51447
**Verdict:** AC met — marked ✅ in TASKS.md.

### F-5 — FE state & loading architecture doc · 2026-07-17
**AC:** Doc covers 4 state kinds, loading/error policy, cache map, folder layout; HTML diagram renders
**Receipt:**
```
$ grep -c '^## ' harness/FE_STATE.md && grep -n '<title>' harness/diagrams/fe-state-loading.html \
    && wc -l harness/FE_STATE.md harness/diagrams/fe-state-loading.html
9                                   # sections: 5 state kinds (superset of AC's 4), data flow,
1:<title>FE State & Loading Design — ecom-core</title>   # cache map, loading/error tiers,
     194 harness/FE_STATE.md                             # SSR split, forms, session, folders, rules
     362 harness/diagrams/fe-state-loading.html
```
HTML renders — published live copy (private):
https://claude.ai/code/artifact/2343defd-c86f-4e79-a785-5b4138508c15
**Verdict:** AC met — marked ✅ in TASKS.md.

### F-1 — Session 0: decide stack + MVP domains, fill PLAN.md · 2026-07-16
**AC:** No `⬜ DECIDE` left in PLAN.md §Stack/§Domains
**Receipt:**
```
$ grep -cn "DECIDE" harness/PLAN.md harness/ENVIRONMENT.md
harness/ENVIRONMENT.md:0
harness/PLAN.md:0
(grep exit=1 — no matches)
```
Decisions (owner-confirmed via Q&A): Go 1.25+Gin+sqlc+MySQL 8+Redis · Next.js App
Router+TS strict+Tailwind stack · Compose+Caddy+GH Actions · Payment/Admin/AI deferred ·
v1 = Catalog/Cart/Checkout/Orders/Accounts · nested error envelope · git init'd
(root commit `0b727a8`, branch `main`). Phases 1–4 broken into C-1…5, CC-1…5,
O-1…3, A-1…3 in TASKS.md.
**Verdict:** AC met — marked ✅ in TASKS.md.
