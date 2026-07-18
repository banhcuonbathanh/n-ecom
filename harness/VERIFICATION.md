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
