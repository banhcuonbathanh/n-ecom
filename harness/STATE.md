# STATE.md — Durable State / Checkpoint Log (Primitive 6)

> The workbench. Any session — after a crash, compaction, or handoff — resumes from
> THIS file, not from memory. Update it before ending every session (checkpoint discipline).
> Newest entry on top. Keep each checkpoint ≤ 10 lines; archive old entries yearly.

---

## Current resume point

- **Status:** ✅ F-15 (customer-menu FE+BE build plan — `harness/plans/customer_menu/`
  PLAN.md + plan.html; first entry in the new per-page plans area).
- **Next:** F-2 (dev stack skeleton) — prompt ready in `PROMPTS.md`; unchanged by F-9
  (skeleton is identical for the restaurant scope). C-4/C-5 now read
  `plans/customer_menu/PLAN.md` first (CONTEXT_MAP routing updated).
  New ⚠ for owner: customer-shell theme = reference dark/orange (default) vs F-7
  blue — decide before C-4 (PLAN.md §7).
- **Open decisions:** ⚠ **Scope pivot** (OVERALL_PLAN.md §9.1): reference = restaurant
  platform, adopted as north star — silence = accepted. ❓ Cancel rule + ❓ one-order-
  per-table (OVERALL_PLAN.md §3.7) — defaults chosen, lock in when O phase opens.
  💡 Redis policy (ARCHITECTURE.md §4) locks in at C-2 · 💡 brand hue before C-4 ·
  💡 VN-first copy + 💡 no public staff register (OVERALL_PLAN.md §9). ⚠ `personal/
  command.md` tracked in git despite the Session-0b personal-stays-out decision
  (owner committed it in `dda8ccc` — say "untrack it" to fix).
  Deferred: payment gateways (→ P phase), AI.

---

## Checkpoint log

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
