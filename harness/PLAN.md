# PLAN.md — Architecture & Context Delivery (Primitive 2)

> This file delivers concrete context so the AI never guesses: stack, domains,
> architecture, and an **exact file map**. Code references must be exact paths —
> a fresh session opens precisely the right files instead of grepping.
> Session 0 (2026-07-16) filled every decision block; new domains add sections here first.

---

## Stack

✅ Decided 2026-07-16 (Session 0, F-1):

| Layer | Choice | Notes |
|---|---|---|
| Backend | Go 1.26 + Gin + sqlc + MySQL 9.7 LTS + Redis 8 | Restaurant-project baseline; versions bumped to verified-latest 2026-07-17 (was Go 1.25 / MySQL 8) |
| Frontend | Next.js 16 App Router + TS strict + Tailwind 4 + Zustand 5 + TanStack Query 5 + RHF 7/Zod 4 | SSR for catalog SEO; majors verified latest 2026-07-17 — F-2 pins exact versions |
| Infra | Docker Compose + Caddy + GitHub Actions | CI = build + test on push (F-4) |
| Payments | ⏸ DEFERRED — no gateway in v1 | Orders are COD/manual-confirmation; revisit when Payment phase opens |
| AI features | ⏸ DEFERRED — AI assistant not in v1 | When added: Anthropic API, model via env, key BE-only |

## Architecture rules (fixed once decided — violations are bugs)

- BE layering (strict): `handler → service → repository → db`. No layer skipping.
  Full design (state ownership, transaction policy, error codes, validation tiers):
  `harness/BE_STATE.md`.
- FE state (strict): server state → query library · client state → store ·
  forms → schema-validated · all API calls through one client module.
  Full design (state ownership, cache map, loading/error tiers): `harness/FE_STATE.md`.
- One error contract: every endpoint returns the same error envelope (decided Session 0):

  ```json
  {
    "error": {
      "code": "VALIDATION_FAILED",
      "message": "Quantity must be at least 1",
      "details": [{ "field": "quantity", "issue": "min" }]
    }
  }
  ```

  `code` = stable machine-readable SCREAMING_SNAKE enum · `message` = human-readable ·
  `details` = optional array for per-field issues. HTTP status carries the class
  (400/401/403/404/409/422/500); `code` carries the specific reason.
- All shared constants (storage keys, event names, status enums) live in ONE file each.

## Domains (MVP scope)

✅ Decided 2026-07-16 (Session 0, F-1):

- [x] Catalog — products, categories, search, product detail
- [x] Cart — add/update/remove, guest cart, merge on login
- [x] Checkout — address, shipping method, order placement
- [x] Orders — lifecycle (placed → confirmed → shipped → delivered / cancelled), tracking
- [x] Accounts — register/login, JWT, profile, order history
- ~~Payment~~ — ⏸ deferred; v1 orders are COD/manual-confirmation
- ~~Admin~~ — ⏸ deferred; v1 seeds/manages products via SQL scripts
- ~~AI assistant~~ — ⏸ deferred to a later phase

## Business rules (single source)

Proposed in Session 0 — owner may adjust before the affected task starts; a change
here after code lands is a task of its own.

1. **Order lifecycle (v1, no payment gateway):**
   `placed → confirmed → shipped → delivered`, terminal alternative `cancelled`.
   "confirmed" = manual/COD confirmation; a `paid` status is added when Payment lands.
2. **Cancel window:** customer may cancel while status ∈ {placed, confirmed};
   never after `shipped`.
3. **Stock:** decremented at order placement (there is no payment step in v1);
   restored in full on cancellation. Placement fails atomically if any line lacks stock.
4. **Price snapshot:** order lines freeze unit price + product name at checkout —
   never re-read live price for an existing order.
5. **Guest cart:** identified by an opaque cookie token, 30-day expiry. On login it is
   merged into the account cart: quantities summed per product, capped at available stock.

## File map

> Update this table whenever a new module lands. Exact paths only.

Planned layout — becomes real in F-2; update rows to exact files as modules land.

| Area | Path | What lives there |
|---|---|---|
| Backend | `be/` | Go module: `cmd/api/main.go`, `internal/{handler,service,repository}/`, `db/` |
| Migrations | `be/db/migrations/` | numbered SQL up/down pairs (F-3 picks the tool) |
| sqlc | `be/db/queries/` + `be/internal/repository/` (generated) | SQL sources and generated code |
| Frontend | `fe/` | Next.js app: `src/app/` routes, `src/lib/api/` (the ONE API client), `src/stores/` |
| Shared constants | `be/internal/domain/constants.go` · `fe/src/lib/constants.ts` | status enums, storage keys, event names — one file per side |
| Infra | `docker-compose.yml` + `Caddyfile` + `.github/workflows/` | dev stack + CI |

## Diagrams

Keep sequence/architecture diagrams next to this file (`harness/diagrams/`),
one file per flow (e.g. `checkout-flow.md` with a Mermaid diagram). Link them here.

- `harness/ARCHITECTURE.md` — components & alignment blueprint (F-6): component
  inventory, layer contracts, FE↔BE interaction, Redis policy, alignment gates.
  Visual mirror: `harness/diagrams/architecture.html`
  (live copy: https://claude.ai/code/artifact/1e7d1660-696b-47af-ac13-da5896b51447).
- `harness/diagrams/build-plan.html` — visual A→Z overview from Session 0
  (architecture, BE/FE roles, build order, page wireframes, design-system proposal).
  Open in a browser. Live copy: https://claude.ai/code/artifact/fde30858-c763-47f8-9f0c-2f9ac3a53bd4
  Snapshot, not a source of truth — this file and TASKS.md win on any conflict.
- `harness/diagrams/fe-state-loading.html` — F-5 visual companion to `harness/FE_STATE.md`
  (state ownership, data flow, cache map, loading/error tiers). Live copy:
  https://claude.ai/code/artifact/2343defd-c86f-4e79-a785-5b4138508c15
  Snapshot — `FE_STATE.md` wins on any conflict.
- `harness/diagrams/be-state-data.html` — F-8 visual companion to `harness/BE_STATE.md`
  (BE state ownership, request flow, transaction map, error-code table, folder layout).
  Live copy: https://claude.ai/code/artifact/57b53522-8b43-4db6-b6a4-f6e88b59f341
  Snapshot — `BE_STATE.md` wins on any conflict.
