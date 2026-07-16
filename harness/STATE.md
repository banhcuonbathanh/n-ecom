# STATE.md — Durable State / Checkpoint Log (Primitive 6)

> The workbench. Any session — after a crash, compaction, or handoff — resumes from
> THIS file, not from memory. Update it before ending every session (checkpoint discipline).
> Newest entry on top. Keep each checkpoint ≤ 10 lines; archive old entries yearly.

---

## Current resume point

- **Status:** ✅ F-5 done — FE state & loading design documented. F-6 (component/alignment
  architecture doc) registered 🔄 by owner, not started by agent.
- **Next:** F-2 (dev stack skeleton) — prompt ready in `PROMPTS.md`. F-6 also open.
- **Open decisions:** none blocking. Deferred (not open): payment gateway, Admin, AI assistant.

---

## Checkpoint log

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
