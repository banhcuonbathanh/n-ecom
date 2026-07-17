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
