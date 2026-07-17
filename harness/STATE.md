# STATE.md — Durable State / Checkpoint Log (Primitive 6)

> The workbench. Any session — after a crash, compaction, or handoff — resumes from
> THIS file, not from memory. Update it before ending every session (checkpoint discipline).
> Newest entry on top. Keep each checkpoint ≤ 10 lines; archive old entries yearly.

---

## Current resume point

- **Status:** ✅ F-7 done — design system reference page (diagrams/design-system.html):
  tokens, button deep-dive, full component inventory.
- **Next:** F-2 (dev stack skeleton) — prompt ready in `PROMPTS.md`.
- **Open decisions:** Redis policy is a 💡 proposal (ARCHITECTURE.md §4) — silence =
  accepted, locks in when C-2 starts. Brand-primary hue is a 💡 proposal
  (design-system.html §8) — owner may swap before C-4. ⚠ FLAG: uncommitted owner edit
  in architecture.html (`--muted` → #0066ff) left in the working tree — confirm or revert.
  Deferred (not open): payment gateway, Admin, AI.

---

## Checkpoint log

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
