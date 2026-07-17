# TASKS.md — Master Task List / Orchestration (Primitive 7)

> Single source of truth for what exists, what's done, and what's next.
> Every task gets a row BEFORE work starts. Statuses: ⬜ todo · 🔄 in progress ·
> ✅ done (receipt logged) · ⛔ blocked.
> Sizing rule: one task = one session (< 100k tokens). 3+ files or 3+ scenarios → split.

---

## Phase F — Foundation

| ID | Task | Deps | AC (acceptance criteria) | Status | Receipt |
|---|---|---|---|---|---|
| F-1 | Session 0: decide stack + MVP domains, fill PLAN.md | — | No `⬜ DECIDE` left in PLAN.md §Stack/§Domains | ✅ | VERIFICATION.md 2026-07-16 |
| F-2 | Repo + dev stack skeleton (compose, hello-world BE+FE, healthcheck) | F-1 | `docker compose up` → BE health 200, FE renders | ⬜ | |
| F-3 | DB + migration tooling + first migration | F-2 | migrate up/down clean; schema doc started | ⬜ | |
| F-4 | Error contract + API client + CI (build+test on push) | F-2 | one endpoint returns the envelope; CI green | ⬜ | |
| F-5 | FE state & loading architecture doc (`harness/FE_STATE.md` + diagram) | F-1 | Doc covers 4 state kinds, loading/error policy, cache map, folder layout; HTML diagram renders | ✅ | VERIFICATION.md 2026-07-17 |
| F-6 | Component & alignment architecture doc (`harness/ARCHITECTURE.md` + `harness/diagrams/architecture.html`) | F-1 | Doc covers component inventory + responsibilities, layer contracts, FE↔BE and Redis interaction, alignment-enforcement gates; HTML diagram renders | ✅ | VERIFICATION.md 2026-07-17 |
| F-7 | Design system reference page (`harness/diagrams/design-system.html`) — tokens + button deep-dive + all component specimens | F-1, F-5 | Page covers tokens (color/type/spacing/radius/shadow), button anatomy/6 variants/3 sizes/5-state matrix, forms, feedback, overlays, nav, commerce patterns; HTML renders both themes | ✅ | VERIFICATION.md 2026-07-17 |
| F-8 | BE state & data architecture doc (`harness/BE_STATE.md` + diagram) — FE_STATE.md's backend counterpart | F-1, F-6 | Doc covers BE state kinds w/ owners, request data flow, transaction policy, error-code enum + mapping, validation tiers, folder layout, hard BE rules; HTML diagram renders | ✅ | VERIFICATION.md 2026-07-17 |
| F-9 | Overall build plan from `reference/docs/system/08_pages` — BE + FE + DevOps master plan (`harness/OVERALL_PLAN.md` + `harness/diagrams/overall-plan.html`) | F-1 | Plan covers all 4 role surfaces (public/customer/staff/admin), BE service/endpoint map, FE page/phase map, DevOps pipeline, phased task breakdown reconciled with existing TASKS.md phases; MD complete + HTML renders | 🔄 | |

## Phase 1 — Catalog

| ID | Task | Deps | AC | Status | Receipt |
|---|---|---|---|---|---|
| C-1 | Catalog schema: products + categories migration + SQL seed script | F-3 | migrate up/down clean; seed inserts ≥ 10 products across ≥ 3 categories | ⬜ | |
| C-2 | BE: product list (paging + category filter) + product detail endpoints | C-1, F-4 | curl transcripts: list page 2, filtered list, detail, 404 in error envelope | ⬜ | |
| C-3 | BE: category list + product search (LIKE-based v1) | C-2 | curl: categories; search hits + empty result | ⬜ | |
| C-4 | FE: product list page (grid, category filter, paging) | C-2 | screenshot: grid renders seeded products; filter works | ⬜ | |
| C-5 | FE: product detail page | C-4 | screenshot: detail renders name/price/stock from API | ⬜ | |

## Phase 2 — Cart & Checkout

| ID | Task | Deps | AC | Status | Receipt |
|---|---|---|---|---|---|
| CC-1 | Cart schema (guest cart via cookie token) migration | C-1 | migrate up/down clean; token uniqueness enforced | ⬜ | |
| CC-2 | BE: cart endpoints (get / add / update qty / remove) | CC-1 | curl: full add→update→remove round-trip; stock-cap rejection in envelope | ⬜ | |
| CC-3 | FE: cart page + add-to-cart from product pages | CC-2, C-5 | screenshot: badge count updates; cart page edits quantities | ⬜ | |
| CC-4 | BE: checkout — address + order placement (price snapshot, atomic stock decrement) | CC-2, O-1 | curl: place order → order id; stock decremented; insufficient-stock rejection | ⬜ | |
| CC-5 | FE: checkout flow (address form → place order → confirmation) | CC-4 | screenshot: order placed from UI, confirmation shows order id | ⬜ | |

## Phase 3 — Orders (Payment ⏸ deferred)

| ID | Task | Deps | AC | Status | Receipt |
|---|---|---|---|---|---|
| O-1 | Orders schema: orders + order_lines + status enum migration | C-1 | migrate up/down clean; lifecycle enum matches PLAN.md §Business rules | ⬜ | |
| O-2 | BE: my-orders list + order detail + cancel (window per rule 2, stock restore) | O-1, CC-4 | curl: list, detail, cancel `placed` OK, cancel `shipped` rejected in envelope | ⬜ | |
| O-3 | FE: order history + order detail with status tracking | O-2 | screenshot: history lists orders; detail shows status + lines | ⬜ | |
| — | Payment gateway integration | ⏸ | deferred Session 0 — no gateway in v1 (COD); re-scope when phase opens | ⛔ | |

## Phase 4 — Accounts (Admin · AI assistant ⏸ deferred)

| ID | Task | Deps | AC | Status | Receipt |
|---|---|---|---|---|---|
| A-1 | Users schema + BE register/login (bcrypt, JWT) + auth middleware | F-3 | curl: register, login → JWT, protected route 401 without / 200 with token | ⬜ | |
| A-2 | FE: register/login pages + session handling in the API client | A-1 | screenshot: login → logged-in header state; token attached to API calls | ⬜ | |
| A-3 | Cart merge on login + orders tied to account (order history per user) | A-1, CC-2, O-2 | curl: guest cart merges per PLAN.md rule 5; my-orders scoped to the user | ⬜ | |
| — | Admin (product CRUD, order mgmt, dashboard) | ⏸ | deferred Session 0 — v1 manages products via SQL scripts | ⛔ | |
| — | AI assistant (shopping chat) | ⏸ | deferred Session 0 | ⛔ | |

---

## Rules

1. New work with no row here → STOP, register first (`templates/TASK_TEMPLATE.md`),
   confirm with owner, then start.
2. ✅ requires: AC demonstrated + receipt row in `VERIFICATION.md` + `STATE.md` updated.
3. A blocked task records WHY in its row and gets a flag in the session summary.
