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

### H-4 — Findings capture is unconditional (CLAUDE.md Hard Rule 7) · 2026-07-24
**AC:** CLAUDE.md carries Hard Rule 7 and stays < 120 lines; `FINDINGS.md §capture rule` covers task-less sessions; the CHECKPOINT step and the Proactive-Flags table point at the rule instead of restating it.
**Receipt:**
```
$ wc -l < CLAUDE.md
119                     # under the <120 cap (was 120 — reclaimed the stray "---" + the
                        # Proactive-Flags sentence Rule 7 now owns)

$ sed -n "116,119p" CLAUDE.md
7. **No finding stays in chat.** Every flag raised anywhere in a session — in a task, a review,
   or a one-off answer with no task at all — gets its own `F#` row in `harness/FINDINGS.md`
   before that session ends; the owner reads that file later (owner rule 2026-07-24). Said in
   chat only = dropped. Lifecycle + the ≥2 kaizen rule live in that file.

$ grep -n "Hard Rule 7" CLAUDE.md harness/FINDINGS.md
CLAUDE.md:51:  + **log every flag raised this task to `harness/FINDINGS.md`** (Hard Rule 7; …)
harness/FINDINGS.md:23:## The capture rule (CLAUDE.md Hard Rule 7)

$ grep -c "Every flag raised → a tracked row" CLAUDE.md
0                       # the old duplicate sentence is gone — one fact, one home
```
**Result:** ✅ — the capture rule was previously bound to CHECKPOINT, so a session with no task (a question, a doc review, plain chat) had nowhere to land a flag. Hard Rule 7 makes capture unconditional and `FINDINGS.md §capture rule` gained the no-task clause (`Task` = `chat`).
**Collision note:** registered as `H-3` first — another session already owns `H-3` (route-ownership map). Caught by the receipt grep, renumbered to `H-4`; evidence appended to [F25](FINDINGS.md) (`concurrent-taskids`), which predicts exactly this.

### F-34 — Menu build-readiness gap registration · 2026-07-24
**AC:** every gap named in the read-through has a ledger row with a plan default and a named closing artifact; `T-3` exists with deps + AC; `H-3` registered and linked from the graduating findings; no new facts duplicated into the plan docs.
**Receipt:**
```
$ python3 <gap-detection + registration check, run from harness/>
— gap detection (re-runnable) —
routes owned by a plan folder: /table/[id] -> 3 mentions, 0 owning file maps   → F38
setTable action in FE_PLAN §5.2                : 0        (identity never written) → F38
checkout page-plan folder                      : 0 folders                        → F39
combos is_active (PLAN §3.5) vs is_available   : 2 vs 2   (both spellings live)    → F40
static /uploads handler named in a task row    : 0                                → F41
FE test runner in PLAN §Stack                  : 0        (T-2 AC needs one)       → F42

— registration check —
F38 row in FINDINGS.md: True     F-34 row in TASKS.md: True
F39 row in FINDINGS.md: True     T-3  row in TASKS.md: True
F40 row in FINDINGS.md: True     H-3  row in TASKS.md: True
F41 row in FINDINGS.md: True
F42 row in FINDINGS.md: True
every new F# has a plan default (Home/action non-empty): True
```
**Result:** ✅ — 5 findings registered (F38 🚨 · F39–F42 ⚠️), each with a default so no slice blocks on a ruling. **F38 is the one that would have stalled a session**: `/table/[id]` is the menu's *default* entry (QR path) yet no plan folder, no task row, and no store action ever wrote `tableId`/`tableName` — `TableConfirmModal` would have read an identity nothing sets. Registered as **T-3**, which also adds the missing `setTable()` to `FE_PLAN §5.2`. The `unowned-route` slug now has **two** members (F38, F39) plus the adjacent `unowned-shell` (F36) → the ≥2 kaizen rule fired → **H-3** registered: a route-ownership map, and a `PAGE_PLAN_GUIDE` rule that a page plan must name the owners of its **in/out-links**, not only its own files. That is the actual root cause — four finished plan sets, each internally complete, with the routes *between* them owned by nobody.
**Scope note:** ledger + task rows only. The plan docs were deliberately **not** edited — F40's field-name fix lands when C-3's curl receipt freezes the shape (gate 8), and the ledger owns the finding until then (one fact, one home). No per-task HTML page for this one: the read-through *was* the plan, and the owner approved it in-session ([F16](FINDINGS.md) ceremony budget).

### F-33 — HTML companion sync (customer_menu plan set) · 2026-07-24
**AC:** no HTML companion states a fact its `_PLAN.md`/build plans contradict — zero live `isSoupName` occurrences, task labels match the reconciled TASKS.md rows, each page's doc-set navigation names the FE + BE build plans, zero dead relative links, tag balance clean, `_plan.html`/`_how-it-works.html` keep both themes while `_mockup-1.html` stays single-theme by design.
**Receipt:**
```
$ python3 -c "<sync check over the 3 companions>"
  PASS customer_menu_plan.html        stale_isSoupName=0 dead_links=0 unclosed=0 tag_err=0 theme_ok=True BE=1 FE=3
  PASS customer_menu_how-it-works.html stale_isSoupName=0 dead_links=0 unclosed=0 tag_err=0 theme_ok=True BE=2 FE=2
  PASS customer_menu_mockup-1.html    stale_isSoupName=0 dead_links=0 unclosed=0 tag_err=0 theme_ok=True BE=1 FE=1
ALL GREEN

$ grep -c ">C-4</span>" customer_menu_plan.html
0                       # every bare C-4 label replaced by C-4a / C-4b / C-6 / T-2 / O-0F

$ <dead-link scan, before → after>
4 → 0                   # href="PLAN.md" ×2 and href="plan.html" ×2 — pre-slug-prefix rename
                        # leftovers, the same drift class F-30 fixed in the index rows
```
**Result:** ✅ — 4 `isSoupName` references retired to `isCanhProduct()` with an F34 citation (one deliberate mention survives, inside the "the original string match broke on any admin rename" explanation, and the checker excludes it by context). `plan.html`'s file map + legend + task-mapping table rebuilt onto C-4a/C-4b/C-6/C-5/T-1/T-2/O-0/O-0F, and its "C-4 may split" note now reads as done. All three pages link the two build spines. **4 dead links found and fixed** — not in the task scope, but broken links in the owner's own plan set, so fixed in place per Hard Rule 5.
**Scope note:** the F-33 AC as first written required "all 3 render both themes". That was wrong — customer mockups are deliberately single-theme (the customer shell *is* dark/orange; `customer_favourites` and `customer_orders_tracking` mockups are the same). AC corrected in TASKS.md rather than forcing a theme toggle onto a page whose design is the theme.

### F-31 — Customer-menu frontend build plan · 2026-07-24
**AC:** `customer_menu_FE_PLAN.md` is a pure delta on the menu plan's §4 behavior spec (links owning docs, restates neither the behaviors nor the FE rules); every slice maps to a TASKS.md row with a named receipt; the three decisions gating C-4 (F01 theme, F02 deep-link, F12 glyph) are named with a plan default so no slice is blocked; `PAGE_PLAN_GUIDE §12` defines when a page needs one; indexes updated per Hard Rule 6.
**Receipt:**
```
$ ls harness/plans/customer_menu/
customer_menu_BE_PLAN.md
customer_menu_FE_PLAN.md
customer_menu_PLAN.md
customer_menu_how-it-works.html
customer_menu_mockup-1.html
customer_menu_plan.html

$ wc -l harness/plans/customer_menu/customer_menu_FE_PLAN.md
     387 harness/plans/customer_menu/customer_menu_FE_PLAN.md

$ python3 -c "<link checker over the 8 touched md files>"
broken relative links: 0
markdown table rows with wrong cell count (escaped pipes ignored): 0

$ python3 -c "<HTMLParser tag-balance over the 2 touched html files>"
harness/diagrams/task-F-31.html   : unclosed=[] errors=[]
harness/diagrams/build-plan.html  : unclosed=[] errors=[]

$ grep -c "^| F3[4-7] " harness/FINDINGS.md
4                       # F34 canh-by-name · F35 keys.ts drift · F36 unowned shell · F37 append source

$ grep -c "FE_PLAN" harness/CONTEXT_MAP.md harness/README.md harness/plans/PAGE_PLAN_GUIDE.md
harness/CONTEXT_MAP.md:3            # routing row + inventory row + guide pointer
harness/README.md:2
harness/plans/PAGE_PLAN_GUIDE.md:4  # §10 backlog cell + §12 doc kind
```
**Result:** ✅ — 6 slices (§3) ↔ 6 task rows (§8) ↔ 6 receipt rows (§9), all cross-checked. §5.1 file tree is the scope contract for every FE task. 4 findings raised. Slice→receipt coverage verified by hand: FE-M1↔C-4a, FE-M2↔C-4b, FE-M3↔C-6, FE-M4↔T-2, FE-M5↔C-5, FE-M6↔O-0F.

### F-32 — Build-readiness reconciliation · 2026-07-24
**AC:** no TASKS.md row contradicts its owning plan; T-1 + O-0 (+ the FE twins T-2/O-0F) exist as rows with deps + ACs; `DB_SCHEMA §4.3` carries `orders.guest_id` → F27 closes; `PLAN.md §Domains/§Business rules` carry dated supersession notes; findings updated.
**Receipt:**
```
$ grep -c "^| T-1 |\|^| T-2 |\|^| O-0 |\|^| O-0F |\|^| C-4a |\|^| C-4b |" harness/TASKS.md
6                       # all four new rows + the C-4 split registered

$ grep -n "guest_id" harness/DB_SCHEMA.md
109:| `guest_id` | CHAR(36) NULL, **INDEX** | Added 2026-07-24 (F-32, closing finding F27) …

$ grep -o "^| F27 .*✅ closed" harness/FINDINGS.md
| F27 | 2026-07-24 | F-30 | 🚨 | schema-amend-request | … | ✅ closed

$ grep -ci "LIKE-based\|category filter" harness/TASKS.md
0                       # generic-shop catalog wording gone (C-1/C-3/C-4/C-5 rewritten)

$ grep -c "⛔" harness/TASKS.md
7                       # CC-1…CC-5 superseded + payment + admin, all with successor pointers

$ python3 -c "<dep-graph check: every non-⛔ row's deps resolve to a live row>"
dangling deps: 0        # A-3's dep on the superseded CC-2 found and fixed in the same pass
```
**Result:** ✅ — C-1 (menu-complete seed AC + the 0-row canh proof), C-3 (repurposed to combos), C-4 (split a/b), C-5 (retitled), O-1 (`order_items`, not `order_lines`), Phase 2 ⛔ superseded with successor pointers, Phase T created, four rows registered. **F27 closed** — the online-order path is unblocked. `PLAN.md` §Domains + §Business rules carry per-rule supersession notes pointing at the owning docs (Hard Rule 5).

### F-30 — Customer-menu backend build plan · 2026-07-24
**AC:** `harness/plans/customer_menu/customer_menu_BE_PLAN.md` is a pure delta on the menu plan's §3 contract (links owning docs, restates neither the contract nor the rules); every build slice maps to a TASKS.md row (existing or drafted) with a named receipt; every doc-vs-doc conflict found gets a plan default **and** an `F#` row in FINDINGS.md; indexes updated per Hard Rule 6.
**Receipt:**
```
$ ls harness/plans/customer_menu/
customer_menu_BE_PLAN.md        customer_menu_how-it-works.html
customer_menu_PLAN.md           customer_menu_mockup-1.html
customer_menu_plan.html

$ wc -l < harness/plans/customer_menu/customer_menu_BE_PLAN.md
521

$ grep -o 'BE-M[1-6]' …/customer_menu_BE_PLAN.md | sort -u | tr '\n' ' '   # 6 slices, all
BE-M1 BE-M2 BE-M3 BE-M4 BE-M5 BE-M6                                        #   §3 spine,
                                                                           #   §8 rows,
                                                                           #   §9 receipts

$ grep -o '(\.\./\.\./[A-Za-z_]*\.md)' …/customer_menu_BE_PLAN.md | sort | uniq -c | sort -rn
  15 (../../DB_SCHEMA.md)      11 (../../BE_STATE.md)     5 (../../ARCHITECTURE.md)
  12 (../../BE_PLAYBOOK.md)     7 (../../OVERALL_PLAN.md)  5 (../../FINDINGS.md)
   2 (../../TASKS.md)           2 (../../ENVIRONMENT.md)   1 (../../VERIFICATION.md)
                               # 60 outbound links to owning docs = links, not restatement

$ grep -c '^| F2[6-9] \|^| F3[0-3] ' harness/FINDINGS.md    # the 8 findings, one row each
8

$ for f in harness/CONTEXT_MAP.md harness/README.md harness/TASKS.md \
>          harness/plans/customer_menu/customer_menu_PLAN.md; do
>   printf "%-52s " "$f"; grep -c 'customer_menu_BE_PLAN' "$f"; done
harness/CONTEXT_MAP.md                               2   # routing row + doc-inventory row
harness/README.md                                    1   # plans/ index row
harness/TASKS.md                                     1   # F-30 row
…/customer_menu_PLAN.md                              2   # TL;DR pointer + §3 boundary note
```
Same change also fixed three stale `CONTEXT_MAP`/`README` rows still naming the pre-slug-prefix files (`plans/customer_menu/PLAN.md`, `plan.html`, `how-it-works.html`) — doc drift, Hard Rule 5. Docs-only change; committed to `main`.
**Findings raised:** F26–F33 (see FINDINGS.md). Headline: **F27 🚨** — online orders have no ownership column (`orders.guest_id`), so a table-less guest cannot read the order they just placed; this is the exact old-system bug `OVERALL_PLAN §3.4` promises to fix, and it blocks the online path of the order-create slice until `DB_SCHEMA §4.3` is amended.

### H-1 — Findings ledger + improvement loop · 2026-07-22
**AC:** `harness/FINDINGS.md` exists with the status-lifecycle + ≥2-root-cause kaizen protocol and a seeded ledger; CLAUDE.md CHECKPOINT step + Harness Map reference it while staying < 120 lines; CONTEXT_MAP routing + doc inventory and README carry rows (Hard Rule 6).
**Receipt:**
```
$ test -f harness/FINDINGS.md && grep -c '^| F[0-9]' harness/FINDINGS.md   # seeded ledger rows
14
$ wc -l < CLAUDE.md                                                        # must be < 120
119
$ for f in CLAUDE.md harness/CONTEXT_MAP.md harness/README.md harness/TASKS.md; do \
>   printf "%-24s " "$f"; grep -c 'FINDINGS.md' "$f"; done                 # every index wired
CLAUDE.md                3
harness/CONTEXT_MAP.md   3     # routing (Bug fix + Docs/planning) + doc-inventory row
harness/README.md        1
harness/TASKS.md         1     # H-1 row, Phase H
```
Ledger seeded from the open flags previously only in STATE.md (deep-link 🚨, task-id collisions, theme × schema-amend pairs already at the ≥2 kaizen threshold). Docs-only change; committed to `main`.

### F-27 / F-28 — Admin products + combos page-plan sets (8 docs) · 2026-07-22
**AC:** Each folder holds `<slug>_PLAN.md` (source of truth: FE+BE contract, write/CRUD endpoints, cache-invalidation map, behavior spec, TASKS-row mapping, defects-designed-out) + `_plan.html` + `_how-it-works.html` + `_mockup-1.html`, all rendering both themes on the neutral F-7 admin tokens; combos cross-links products for the shared contract (re-derives nothing); indexes updated per Hard Rule 6.
**Receipt:**
```
$ ls harness/plans/admin_products/ harness/plans/admin_combos/
harness/plans/admin_products/:
admin_products_PLAN.md          admin_products_how-it-works.html
admin_products_mockup-1.html    admin_products_plan.html

harness/plans/admin_combos/:
admin_combos_PLAN.md            admin_combos_how-it-works.html
admin_combos_mockup-1.html      admin_combos_plan.html

$ # every HTML carries all four theme-token blocks (light default + prefers-color-scheme
$ #   + data-theme=dark + data-theme=light) → both-theme guaranteed
$ for f in harness/plans/admin_products/*.html harness/plans/admin_combos/*.html; do
>   printf "%-56s " "$f"; grep -c 'prefers-color-scheme\|data-theme="dark"\|data-theme="light"\|^  :root {' "$f"; done
harness/plans/admin_products/admin_products_how-it-works.html  4
harness/plans/admin_products/admin_products_mockup-1.html      4
harness/plans/admin_products/admin_products_plan.html          4
harness/plans/admin_combos/admin_combos_how-it-works.html      4
harness/plans/admin_combos/admin_combos_mockup-1.html          4
harness/plans/admin_combos/admin_combos_plan.html              4

$ # no customer dark/orange shell hex on the admin surface (the one hit below is prose
$ #   inside a <code> caption explaining the neutral-tokens choice, not a color value)
$ grep -l '#0b0f17\|#f97316' harness/plans/admin_products/*.html harness/plans/admin_combos/*.html
harness/plans/admin_products/admin_products_plan.html

$ # each HTML footer names its PLAN.md as the source of truth that wins on conflict
$ grep -lc 'wins on any conflict' harness/plans/admin_products/*.html harness/plans/admin_combos/*.html | wc -l
6
```
**Content:** admin_products_PLAN.md — 8 endpoints (availability toggle on its own handler fixing the ref's permanent-400 bug; admin-only DELETE; uncached `GET /products/all`), cache map incl. the new product-write→`combos:list` cross-DEL, 5 render branches, 12 behaviors, **13 reference defects designed out**. admin_combos_PLAN.md — new `GET /combos/all` with server-side item join, one-transaction item writes, new active toggle, guarded delete, the product-dependency edge cases, 12 behaviors, **~20 defects designed out**. Owner decisions applied: `is_active` (not `is_available`); worked example Suất Đầy Đủ 30.000 = retail (savings shows `—` on seed). Hard-Rule-6 rows added to CONTEXT_MAP §Doc inventory (8) + README §plans/ (8).
**Verdict:** AC met — F-27 + F-28 marked ✅ in TASKS.md. (Task ids renumbered from F-17/F-18 after a parallel session claimed F-17 = admin_overview.)

### F-20 — Admin to-do-list page-plan set (`/admin/todo-list`, 4 docs) · 2026-07-21
**AC:** Folder holds `admin_todo_list_PLAN.md` (source of truth: FE+BE contract with the one owned endpoint `PATCH /admin/tasks/:id`, 12-behavior spec, AD-3…AD-5 task mapping, 14 reference defects designed out) + `_plan.html` + `_how-it-works.html` + `_mockup-1.html`, all rendering both themes on the neutral F-7 tokens; reference's empty≡loading≡error conflation designed out with named branches; the shared `/admin/tasks` contract is **linked** to `admin_task_board_PLAN.md` (F-22) + `DB_SCHEMA.md §4.7`, not re-derived; indexes updated per Hard Rule 6.
**Receipt:**
```
$ ls harness/plans/admin_todo_list/
admin_todo_list_PLAN.md              admin_todo_list_how-it-works.html
admin_todo_list_mockup-1.html        admin_todo_list_plan.html

$ # HTML well-formedness (python html.parser) + both-theme + source-of-truth footer
OK parse: admin_todo_list_plan.html          PLAN.md-refs=2  dark-media=1  theme-toggle=1
OK parse: admin_todo_list_how-it-works.html  PLAN.md-refs=2  dark-media=1  theme-toggle=1
OK parse: admin_todo_list_mockup-1.html      PLAN.md-refs=2  dark-media=2  theme-toggle=2

$ # tag balance
plan.html:          <section 9/9   <div 114/114
how-it-works.html:  <section 7/7   <div 59/59
mockup-1.html:      <section 0/0   <div 112/112
```
**Notes:** Hard Rule 6 — 4 rows added to `CONTEXT_MAP.md §Doc inventory` + 4 to `README.md §plans/`.
Reconciliation headline: the reference's todo-list and its sibling task-board (F-22) are ~80% the
same page; this plan owns only task **authoring** (the modal + `PATCH /admin/tasks/:id`, which
un-breaks the reference's 🔴 duplicate-on-edit bug) and links everything else. ⚠ FLAG raised for
the owner: consider merging the two pages into one `/admin/tasks` screen before AD-4 (FE-only
decision, nothing blocked either way). ⚠ TASKS.md id churn: registered as **F-20** after parallel
sessions took F-19; two `F-17` rows and duplicate `F-18` also present in the shared file (pre-existing).

### F-22 — Admin task-board page-plan set (`/admin/staff/task-board`, 4 docs) · 2026-07-19
**AC:** the 4-doc page-plan set per `PAGE_PLAN_GUIDE.md` in `harness/plans/admin_task_board/`
(MD source of truth + 3 both-theme HTML on neutral F-7 tokens), all 4 reference bugs designed
out, `staff_tasks` promoted out of the `DB_SCHEMA.md §4.7` stub, indexes updated (Hard Rule 6).
**Receipt:**
```
$ ls harness/plans/admin_task_board/
  admin_task_board_PLAN.md  admin_task_board_plan.html
  admin_task_board_how-it-works.html  admin_task_board_mockup-1.html

$ python3  # tag balance + anchor resolution, per file
  plan.html          div 59/59  section 9/9  table 9/9  svg 0/0   anchors: all resolve
  how-it-works.html  div 29/29  section 7/7  table 1/1  svg 1/1   anchors: all resolve
  mockup-1.html      div 88/88  section 0/0  table 4/4  svg 0/0   anchors: all resolve

$ # both theme mechanisms present in every HTML
  prefers-color-scheme + :root[data-theme="dark"] + :root[data-theme="light"]  ✓ all 4 files
$ # self-contained: external refs (http/@import/cdn) per file →  0 / 0 / 0 / 0

$ python3  # mockup seed arithmetic reconciles KPI row ↔ staff table
  tasks 5+4+3+4+2+0 = 18   done 2+3+2+1+1+0 = 9   overdue 1+1 = 2   ✓ matches the 4 KPIs
  no "Chất lượng ★/5.0" column rendered (dropped by decision)  ✓

$ grep -c 'staff_tasks .full. (F-22)' harness/DB_SCHEMA.md   # promoted out of the stub →  1
```
**Notes:** admin surface → neutral F-7 tokens (not the customer dark/orange shell). All 13
reference findings (`TASK_BOARD_BUGS` ×4 + 9 doc'd gaps) sit in PLAN §6 with countermeasures.
Central correction: `overdue` is derived read-side, not stored, and a new
`PATCH /admin/tasks/:id/status` makes the status lifecycle reachable — the reference's write-once
`pending` left 3 of 4 KPIs permanently zero. Doc task → committed to `main`. Three builder
sub-agents were spawned but landed nothing (session-limit / process-exit); the 3 HTML companions
were authored inline instead.

### F-21 — Admin-ingredients page-plan set (`/admin/ingredients`, 4 docs) · 2026-07-19
**AC:** Folder holds `admin_ingredients_PLAN.md` (source of truth: 8-endpoint BE contract w/ manager+/admin-only DELETE split, wire shapes using DB names per DB_SCHEMA ruling 6, status-derivation ladder, 20-behavior spec, AD-INV task mapping, 9 reference defects designed out) + `_plan.html` + `_how-it-works.html` + `_mockup-1.html`, all rendering both themes on the neutral F-7 tokens; zero rule duplication (links owning docs); indexes updated per Hard Rule 6.
**Receipt:**
```
$ ls harness/plans/admin_ingredients/
admin_ingredients_PLAN.md            admin_ingredients_how-it-works.html
admin_ingredients_mockup-1.html      admin_ingredients_plan.html

$ for f in harness/plans/admin_ingredients/*.html; do
    echo "$(basename $f): doctype=$(grep -c '<!DOCTYPE html>' $f) body=$(grep -c '</body>' $f) \
darktoggle=$(grep -c 'data-theme="dark"' $f) lighttoggle=$(grep -c 'data-theme="light"' $f) \
footer=$(grep -c 'wins on any conflict' $f)"; done
admin_ingredients_how-it-works.html: doctype=1 body=1 darktoggle=1 lighttoggle=1 footer=1
admin_ingredients_mockup-1.html:     doctype=1 body=1 darktoggle=1 lighttoggle=1 footer=1
admin_ingredients_plan.html:         doctype=1 body=1 darktoggle=1 lighttoggle=1 footer=1

$ for f in harness/plans/admin_ingredients/*.html; do
    echo "$(basename $f): <div>=$(grep -o '<div' $f | wc -l) </div>=$(grep -o '</div>' $f | wc -l)"; done
admin_ingredients_how-it-works.html: <div>=38 </div>=38   (balanced)
admin_ingredients_mockup-1.html:     <div>=109 </div>=109 (balanced)
admin_ingredients_plan.html:         <div>=72 </div>=72   (balanced)
```
Each HTML: single doctype + closing body, both `prefers-color-scheme` and `data-theme`
toggle overrides (renders in both themes), footer names the `.md` as source of truth, all
`<div>` balanced. Seed data (Bột gạo 25.500→23.000 kg worked example; 5 rows covering all 4
statuses) consistent across all four docs. Per-task plan page `diagrams/task-F-21.html`
published; CONTEXT_MAP + README each carry 4 new rows (Hard Rule 6).
**Reconciliation delivered:** wire uses DB names not the reference's `quantity`/`warningThreshold`
renames (DB_SCHEMA ruling 6); stock movement + create wrapped in one locked tx with an opening
`in` movement (fixes reference flags #1/#2, invariant `Σ movements == current_stock`); over-draw
rejected not silently clamped (ruling 8); 🗑 admin-only; 5 named render branches; `created_by`
serialized; `cost_per_unit` exposed (ruling 7). ⚠ requests a `UNIQUE(name)` schema amendment
(flagged for owner, not self-applied — DB_SCHEMA owns tables).
**Verdict:** AC met — marked ✅ in TASKS.md.

### F-25 — Customer orders-&-tracking page-plan set (merged `/orders`, 4 docs) · 2026-07-19
**AC:** Folder holds `customer_orders_tracking_PLAN.md` (source of truth: FE+BE contract incl. the single monitor-SSE stream + 2 cancel writes, 15-behavior spec, 6 named loading branches, TASKS.md row mapping, 14 defects designed out) + `_plan.html` + `_how-it-works.html` + `_mockup-1.html`, all rendering both themes (mockup on the customer dark/orange shell); zero rule duplication (links owning docs); indexes updated per Hard Rule 6.
**Receipt:**
```
$ ls harness/plans/customer_orders_tracking/
customer_orders_tracking_PLAN.md            customer_orders_tracking_how-it-works.html
customer_orders_tracking_mockup-1.html      customer_orders_tracking_plan.html

$ wc -l harness/plans/customer_orders_tracking/*
    465 customer_orders_tracking_PLAN.md          # canonical, 8 sections, slug-prefixed
    958 customer_orders_tracking_plan.html        # 9 sections (anatomy…tasks+flags)
   1028 customer_orders_tracking_how-it-works.html # 7 runtime sequences, 6 inline SVG lanes
    921 customer_orders_tracking_mockup-1.html    # 5 zones + 4 state frames + StatusBadge strip

$ checks
plan/how-it-works: :root(light) + prefers-color-scheme + data-theme[dark]+[light]  (theme toggle wins both ways)
mockup: hard-coded dark/orange shell (#0b0f17/#1b2230/#222b3a/#2a3344/#f97316) — identical in light+dark viewers
money glyph in UI: đ throughout (0 đ for canh); the only ₫ are prose in the §7 glyph-flag deviation note
<section> balanced (plan 9/9, how-it-works 7/7); no external css/js/font/img; wide blocks in overflow-x:auto
each HTML footer: "snapshot of customer_orders_tracking_PLAN.md, which wins on any conflict"
worked example consistent across all docs: Bàn 04 · 103.000 đ · 7 loại
```
Built with 2 Explore agents (digest of the tracking + order_list + order_detail corpora) + 2 builder agents (the 3 HTML companions). Registered per Hard Rule 6: 4 rows in CONTEXT_MAP.md §Doc inventory + a new "Realtime" routing row + 4 rows in README.md §plans/.
Also registered a new **Phase R** in TASKS.md (R-1 realtime platform + monitor SSE; R-2 FE live half) and **split O-3** (was one row for two ACs — static half stays O-3, live half → R-2).
Reconciliation highlights (§3.4/§6): reference order-in-`useState` → TanStack Query (SSE only triggers refetch) · duplicate OrderDetailSheet+`/order/:id` → one inline detail component (kills the 🔴 404-wedge) · FE-invented queue position/ETA → BE-computed (one event contract) · `order.status` name drift → exhaustive consumer switch (CI-gated) · ungated SSE → own-order/table gate · `{data:…}` on GET but bare on POST → never wrap success · "Xoá lịch sử" orphaned `activeOrderId` → clears the pointer · hidden nhân/note → rendered from `toppings_snapshot`.
Open flags for owner (§7): ⚠ cancel rule 3-way (ref `<30%` vs owner "before payment" — plan defaults owner's, one `canCancel` predicate, lock before O-2) · ⚠ money glyph `đ` vs `₫` (one `formatVND()`; plan defaults menu's `đ`) · ⚠ route reconciliation (menu plan redirects to `/order/<id>`; this screen is `/orders` via `activeOrderId` — recommend menu handoff → `/orders`, not edited here) · ❓ `item_progress` smooth-patch vs refetch (confirm at R-1).

### F-23 — Admin-staff page-plan set (4 docs, one folder) · 2026-07-19
**AC:** Folder holds `admin_staff_PLAN.md` (source of truth: 6-endpoint manager+ FE+BE contract, the 4 guards, reference error codes mapped onto the BE_STATE §4 9-code enum, 20-behavior spec, S/AD task mapping, 17 reference defects designed out) + `_plan.html` + `_how-it-works.html` + `_mockup-1.html`, all rendering both themes (mockup on the neutral F-7 admin tokens, NOT the customer dark/orange shell); every reference flag gets an adopt/fix/drop ruling; zero rule duplication (links owning docs); indexes updated per Hard Rule 6.
**Receipt:**
```
$ ls harness/plans/admin_staff/
admin_staff_PLAN.md            admin_staff_how-it-works.html
admin_staff_mockup-1.html      admin_staff_plan.html

$ wc -l harness/plans/admin_staff/*
    496 admin_staff_PLAN.md              # canonical, 8 sections, slug-prefixed
    923 admin_staff_plan.html            # 9 sections (anatomy…tasks)
    902 admin_staff_how-it-works.html    # 7 sequences (map/load/filter/write/patch/fanout/durability)
    781 admin_staff_mockup-1.html        # roster + 2 overlay panels + all 5 render branches

$ for f in harness/plans/admin_staff/*.html; do check; done
each: <!doctype> ✓  </html> ✓  <script src>/http/@import: 0
theme: :root(light) + prefers-color-scheme + data-theme[dark] + data-theme[light]  (3 blocks each, in sync)
wide content (tables, SVG sequence lanes, roster) wrapped in overflow-x:auto; body overflow-x:hidden
customer-orange bleed (#f97316/#0b0f17/#1b2230): 0 in every file  (admin = neutral F-7 tokens)
each HTML footer: "snapshot of admin_staff_PLAN.md, which wins on any conflict"
```
Registered per Hard Rule 6: 4 rows in CONTEXT_MAP.md §Doc inventory + 4 rows in README.md §plans/.
Reconciliation highlights (§3.4/§6): raw-SQL repo → goose+sqlc · client 100-row cap → server-side
paging (URL-owned per FE_STATE §9.2) · unrevoked refresh tokens → same-tx delete on deactivate/delete ·
soft-delete UNIQUE trap → `<username>#deleted-<id>` rename · `performance_score:0` phantom → dropped ·
loading≡empty≡no-match conflation → 5 named branches · stuck detail drawer → named error branch.
Open flags for owner: ⚠ shared `CONFLICT` code needs a `details[].issue` discriminator (or 2 new enum
codes) · ⚠ RBAC role-level table needs a permanent home (proposed OVERALL_PLAN §3) · ❓ no password-reset
path anywhere in the reference — assumed v1 gap (admin resets via DB) unless S-4 adds it.
**Verdict:** AC met — F-23 is a planning deliverable (no runnable code); receipt is the 4-file render check above.

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
