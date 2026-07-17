# TECH_OVERVIEW — Hệ Thống Quản Lý Quán Bánh Cuốn

> **Per-spec tech descriptions.** For the overall system architecture, project layout, stack,
> and conventions, see [`CLAUDE.md`](../CLAUDE.md) (map) and [`docs/be/BE_DOC_INDEX.md`](be/BE_DOC_INDEX.md) (BE navigation).
> Scope source for this file: `docs/spec/*` + `docs/spec/SPEC_INDEX.md`. Keep in sync when specs change.

---

## Per-Spec Tech Descriptions

### Spec 1 — Auth & Middleware  ·  `API §2`
Go/Gin middleware layer issuing JWT access + refresh tokens with rotation (multi-token
"Option A"). Gin middleware enforces RBAC per route; `is_active=false` accounts are rejected
with `ACCOUNT_DISABLED` 401 via a Redis cache check. Foundation spec — every other domain
depends on it.
**Depends on:** —

### Spec 2 — Products API (Backend)  ·  `API §3`
CRUD for products, categories, toppings, and combos on Go/Gin/sqlc/MySQL with a 5-minute
Redis cache. UUID `CHAR(36)` keys; canonical field names (`price` not `base_price`,
`image_path`, no slug). Pure data layer feeding the Menu UI (Spec 3) and Orders API (Spec 4).
**Depends on:** Spec 1

### Spec 3 — Menu & Checkout UI (Frontend)  ·  `API §3 · §4`
Three-page customer flow `/menu → /checkout → /order/[id]` on Next.js 14. Zustand `CartStore`,
`ToppingModal` + `ComboModal` for customization, RHF+Zod checkout form. Live order tracking via
`useOrderSSE` (Bearer-header SSE with exponential-backoff reconnect).
**Depends on:** Spec 2

### Spec 4 — Orders API (Backend)  ·  `API §4 · §10.2`
Core business logic. Order state machine, combo expansion, `total_amount` recalculation on every
mutation. Pushes realtime updates over SSE (customer tracking) and WebSocket (KDS + live floor),
fanned out through Redis Pub/Sub.
**Depends on:** Specs 1 + 2

### Spec 5 — Payment + Webhooks  ·  `API §5`
Four payment methods: VNPay, MoMo, ZaloPay QR, and cash COD. Webhook handlers verify provider
callbacks via HMAC signatures; payment status tracked to `completed`, pushed to the POS over
WebSocket; includes Cashier POS UI + invoice printing.
⚠️ Touches real money — always confirm before running payment code.
**Depends on:** Spec 4

### Spec 6 — QR Ordering & POS  ·  `API §6`
QR token → decode → resolve table → issue Guest JWT → customer self-orders. Cashier POS confirms,
merges grouped orders, and triggers payment. KDS renders kitchen orders in real time.
**Depends on:** Specs 1 + 4

### Spec 7 — Staff Management  ·  `API §8`
Full staff CRUD with RBAC hierarchy (Manager manages lower roles; Admin manages everyone including
Managers): create accounts, assign roles, activate/deactivate, manage login sessions. RBAC sourced
from MASTER §3.
**Depends on:** Spec 1

### Spec 9 — Admin Dashboard: Overview + Marketing  ·  `API §9`
Next.js admin shell (Manager+ via `AuthGuard` + `RoleGuard`). **Overview** = live floor view +
order management over WebSocket; **Marketing** = QR code & catalogue generation.
*(Covers only these two pages.)*
**Depends on:** Specs 1 + 4

### Spec 9a — Admin: Categories  ·  `API §3`
Category CRUD where `sort_order` drives the customer `/menu` filter-tab order. Manager+ access.
**Depends on:** Spec 1

---

## Coverage Gaps (built, no spec yet)

- Admin **Analytics · Ingredients · Tasks · Training** pages — built ad-hoc; Spec 9 covers only Overview + Marketing.
- **Phase 7 — Testing & Go-Live** — no spec (`Spec_10_Testing_GoLive.md` to be written).

> Tracked in `docs/spec/SPEC_INDEX.md` → Spec Coverage by Domain.
