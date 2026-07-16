# PLAN.md — Architecture & Context Delivery (Primitive 2)

> This file delivers concrete context so the AI never guesses: stack, domains,
> architecture, and an **exact file map**. Code references must be exact paths —
> a fresh session opens precisely the right files instead of grepping.
> Fill every `⬜ DECIDE` block in Session 0, together.

---

## Stack

⬜ DECIDE — record final choices here. Suggested starting point (proven on the
restaurant project, adjust freely):

| Layer | Choice | Notes |
|---|---|---|
| Backend | ⬜ (e.g. Go 1.25 + Gin + sqlc + MySQL 8 + Redis) | |
| Frontend | ⬜ (e.g. Next.js App Router + TS strict + Tailwind + Zustand + TanStack Query + RHF/Zod) | |
| Infra | ⬜ (e.g. Docker Compose + Caddy + GitHub Actions) | |
| Payments | ⬜ (gateway + sandbox) | |
| AI features | ⬜ (Anthropic API — model via env, key BE-only) | |

## Architecture rules (fixed once decided — violations are bugs)

- BE layering (strict): `handler → service → repository → db`. No layer skipping.
- FE state (strict): server state → query library · client state → store ·
  forms → schema-validated · all API calls through one client module.
- One error contract: every endpoint returns the same error envelope. Define it in
  Session 0 and record it here.
- All shared constants (storage keys, event names, status enums) live in ONE file each.

## Domains (MVP scope)

⬜ DECIDE — check what is in v1, strike what is not:

- [ ] Catalog — products, categories, search, product detail
- [ ] Cart — add/update/remove, guest cart, merge on login
- [ ] Checkout — address, shipping method, order placement
- [ ] Orders — lifecycle (placed → paid → shipped → delivered / cancelled), tracking
- [ ] Payment — gateway integration, webhooks, refunds
- [ ] Accounts — register/login, JWT, profile, order history
- [ ] Admin — product CRUD, order management, dashboard
- [ ] AI assistant — shopping chat (reuse the confirm-gated tool pattern)

## Business rules (single source)

⬜ Fill as decided. Examples of the kind of rule that MUST live here, not in code comments:
- When can a customer cancel an order? (status window)
- What happens to stock on order placement vs. payment?
- Price snapshot: order lines freeze price at checkout — never re-read live price.

## File map

> Update this table whenever a new module lands. Exact paths only.

| Area | Path | What lives there |
|---|---|---|
| ⬜ | ⬜ | ⬜ |

## Diagrams

Keep sequence/architecture diagrams next to this file (`harness/diagrams/`),
one file per flow (e.g. `checkout-flow.md` with a Mermaid diagram). Link them here.
