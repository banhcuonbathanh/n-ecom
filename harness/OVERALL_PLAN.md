# OVERALL_PLAN.md — Master Build Plan (BE · FE · DevOps)

> **TL;DR:** The owner pointed at `reference/docs/system/08_pages` (2026-07-17): the target
> product is the **restaurant table-ordering platform** — public landing, QR→guest-JWT
> customer ordering with live tracking, staff POS/KDS/cashier, and a 13-page admin suite.
> This file is the master plan for building it on the already-decided stack
> (`PLAN.md §Stack`: Go 1.26 + Gin + sqlc + MySQL 9.7 + Redis 8 · Next 16 + TS strict ·
> Compose + Caddy + GH Actions) and the already-decided architecture (F-5/F-6/F-8).
> Visual companion: `harness/diagrams/overall-plan.html`. Roadmap detail lives here;
> task rows are registered into `TASKS.md` when each phase opens (TASKS.md stays the
> single source of task status).
>
> ⚠️ **FLAG — scope pivot.** The harness previously planned a *generic* e-commerce v1
> (admin/staff deferred). The reference is the restaurant platform. This plan treats the
> reference as the north star and re-homes every existing ⬜ task row (§8 reconciliation
> map — nothing is orphaned). Silence = accepted; say so if the reference was only
> inspiration for the generic shop.

---

## 1. Product definition — what we are building

One dine-in restaurant platform, four surfaces, one Go API, one Next.js app:

| Surface | Who | Pages (v-target) | Auth |
|---|---|---|---|
| **Public** | anyone | landing `/`, welcome, introduction 🔮, legal | none |
| **Customer** | dine-in guest (QR) / online guest | table-QR airlock `/table/:id`, menu + product/combo detail, favourites (device-local), checkout (online path), order list/detail (live), tracking, settings, profile 🔮 | guest JWT (2 h) |
| **Staff** | chef · cashier · staff | login, register, KDS `/kds`, POS `/pos`, cashier payment `/cashier/payment/:id` | staff JWT + role |
| **Admin** | manager · admin | overview (live floor), summary/reports, products/combos/categories/toppings CRUD, staff CRUD, task board + todo, ingredients + storage 🔮, marketing, training | staff JWT, manager+ |

Core loop: **customer scans table QR → orders from phone → kitchen cooks on KDS →
cashier takes payment → admin watches the floor and the numbers.** Everything else
serves that loop.

Roles (RBAC hierarchy, BE-enforced): `customer(guest) < chef ≈ cashier < staff < manager < admin`.

Sources: `reference/docs/system/08_pages/PAGES_INDEX.md` (page inventory),
`00_overview/SYSTEM_OVERVIEW.md` (actors), digested 2026-07-17 by 4 Explore subagents.

## 2. What changes vs. the old generic-e-com scope

| Generic e-com plan (Session 0) | Restaurant platform (this plan) |
|---|---|
| Guest **cart in DB** (cookie token, CC-1/CC-2) | Cart is **FE-only** (Zustand, persisted keys) — the first server write is `POST /orders` |
| Checkout = address + shipping | Checkout = QR table confirm (dine-in) or name/phone (online) — no shipping |
| Lifecycle `placed→confirmed→shipped→delivered` | `pending→confirmed→preparing→ready→delivered` (+`cancelled`, later `paid`) with **item-level progress** (`qty_served`) |
| Customer accounts (A-1..A-3) | **Staff** accounts + RBAC now; customer accounts stay 🔮 (online ordering phase) |
| No realtime | Realtime is core: SSE for customers/admin popup, WS for staff boards, fan-out via Redis pub/sub |
| Admin deferred | Admin is a third of the product (13 pages) |

Unchanged: the stack, the 4-layer BE rules (`BE_STATE.md`), FE state rules (`FE_STATE.md`),
the component/alignment gates (`ARCHITECTURE.md`), the design system (F-7), the error
envelope, git policy, and the task loop.

## 3. Backend plan

### 3.1 Domain modules (replaces the 5 generic domains)

Strict layering per `BE_STATE.md` (`handler → service → repository → sqlc/db`); one
domain = one handler/service/repository triple. Ten domains, phased:

| Domain | Owns | Phase |
|---|---|---|
| `catalog` | categories, products, toppings, product_toppings, combos, combo_items | C |
| `tables` | tables, qr_token, table status | T |
| `auth` | staff login/refresh/logout, guest JWT mint, RBAC middleware | T (guest) · S (staff) |
| `orders` | orders, order_items, state machine, combo expansion, order numbers | O |
| `realtime` | SSE/WS endpoints, Redis pub/sub hub, event contract | R |
| `payments` | payments, cash completion, gateway webhooks | S (cash) · P (gateways) |
| `staff` | staff CRUD, roles, activation | AD |
| `analytics` | summary, top dishes, staff performance (read-only, raw SQL) | AD |
| `inventory` | ingredients, product_ingredients, stock_movements | AD |
| `workforce` | staff_tasks, training guides/progress | AD |

Platform packages stay as F-6/F-8 defined: `platform/{cache,config,logging,db,http}` —
only `platform/cache` touches the Redis client.

### 3.2 Schema (MySQL 9.7, goose-style numbered migrations — tool picked in F-3)

Conventions (from the reference, kept): `CHAR(36)` UUID PKs, `created_at/updated_at`
everywhere, soft delete via `deleted_at` (+ every query filters it), money as
`DECIMAL(10,0)` VND, snake_case plural tables, index every FK + status columns.
~22 tables, introduced by phase — catalog 6 (C), tables + order_sequences (T),
orders + order_items (O), staff + refresh_tokens (S), payments (S),
ingredients/stock 3 (AD), tasks + training 4 (AD), file_attachments (AD).

Field-name law (drift in the old system caused real bugs — these are canonical):
`price` (not base_price), `image_path` relative (not image_url), `created_by`
(not staff_id), `gateway_data` (not webhook_payload), payment status `completed`
(not success), **no `order_items.status` column** — item status is *derived* from
`qty_served` vs `quantity`.

### 3.3 API surface (~85 routes under `/api/v1`, grouped by auth tier)

Auth tiers: public · auth (any JWT) · chef+ · cashier+ · manager+ · admin ·
HMAC (webhooks). Route groups set auth once (`AtLeast(role)` middleware); stricter
routes nest a sub-group. Full inventory: reference `02_spec/API_SPEC.md`; per-phase
endpoint lists land in each task's plan page. Highlights:

- **Public:** catalog GETs (`/products`, `/products/:id`, `/categories`, `/toppings`,
  `/combos`), `POST /auth/guest`, `POST /auth/login`, `/health`, `/metrics`.
- **Guest (auth):** `POST /orders`, `GET /orders/:id`, `POST /orders/:id/items`,
  `PATCH /orders/items/:id/quantity`, `DELETE /orders/:id`, `DELETE /orders/items/:id`,
  SSE `GET /orders/:id/events`, `GET /sse/order-monitor/:id`.
- **Staff:** `GET /orders` + `/orders/live` + `/orders/history`,
  `PATCH /orders/:id/status`, `PATCH /orders/items/:id` (serve), `POST /payments`,
  `GET /tables`, WS `GET /ws/orders-live`.
- **Manager+/admin:** full CRUD on catalog/staff/tasks/ingredients/training,
  analytics GETs, SSE `GET /sse/admin`. All DELETEs admin-only.

Error contract: **our Session-0 envelope wins** — `{"error":{code,message,details}}`
(the reference's flat `{"error","message","details"}` is NOT adopted; docs-vs-code
rule 5). The reference's error-code *catalog* (TOKEN_EXPIRED, TABLE_HAS_ACTIVE_ORDER,
ORDER_NOT_READY, PAYMENT_ALREADY_EXISTS, CANCEL_THRESHOLD, …) extends the F-8 enum
when the owning phase opens; one Go file + one TS file own the enum (F-8 rule).

### 3.4 Auth design (reconciles reference with our F-5 decision)

- **Our httpOnly-cookie JWT decision stands** (F-5) — and it beats the reference's
  memory-token + `?token=` WS hack: cookies ride along on SSE and WS handshakes
  automatically, so **no token in query strings or logs** (kills the old SEC-02 bug).
- Staff: access JWT (short TTL) + refresh token (httpOnly cookie, hash stored in DB,
  max 5 sessions LRU). Guest: stateless 2 h JWT minted from a 64-char table
  `qr_token`; carries `table_id`; ownership of orders enforced **by table**.
  Online guests get a table-less variant (`POST /auth/guest/online`) — with an
  ownership rule that actually works for `table_id IS NULL` orders (old bug: guest
  couldn't read own online order).
- RBAC: `AtLeast(role)` middleware from a single role-hierarchy table; `is_active`
  check via Redis cache (fail-open), invalidated on deactivation.
- Rate limits from day one on `POST /auth/login` **and** `POST /auth/guest`
  (the reference spec'd 5/min/IP but never built it).

### 3.5 Realtime design (build once, correctly — the old system's weakest area)

Backbone: **Redis pub/sub → SSE (customers, admin popup) + WS (staff boards)**.
This shape is the reference's best call — it makes the BE horizontally scalable —
but four defects get fixed by design:

1. **Snapshot-on-connect:** every SSE/WS subscription first emits current state read
   from MySQL, then streams deltas (old system lost status changes during disconnects).
2. **One event contract:** event names + payload shapes live in ONE Go file and ONE
   TS file (generated/mirrored); every consumer handles every published event
   (old system: `item_updated`/`item_cancelled`/`order_status_changed` published but
   silently ignored by half the consumers).
3. **Ownership + role gates on streams:** guests may subscribe only to their own
   order/table; WS staff feed requires chef+ (old system: any JWT could watch the
   whole floor).
4. **Separate Redis clients** for cache vs pub/sub (pool exhaustion under SSE load)
   and `retry:` directive on SSE (thundering-herd reconnects).

Channels: `order:{id}` (per-order), `orders:kds` (staff board), `orders:admin`
(admin popup), `queue:broadcast` + `tables:broadcast` (monitor). One WS provider on
the FE dashboard shell = one socket per browser session.

### 3.6 Redis policy (extends the F-6 proposal — same philosophy)

Cache-aside only, always wipeable, MySQL is the sole source of truth, fail-open.
Cached: 5-min-TTL catalog keys (`product:{id}`, `products:list`, `toppings:list`,
`combos:list`, `categories:list`) + `auth:staff:{id}` active flag. Write path DELs
keys, never updates in place — and the invalidation map is a table in the catalog
task's doc, covering the old blind spot (topping write must also bust `product:{id}`).
Never cached: orders, payments, analytics, inventory. Non-cache uses: login/guest
rate-limit counters, `order:seq:{date}` order-number counter (DB fallback), pub/sub.

### 3.7 Business rules (v2 — supersede §Business rules 1–5 in PLAN.md when O opens)

1. Order lifecycle: `pending → confirmed → preparing → ready → delivered`
   (+ terminal `cancelled`); invalid transition = 422. Transition permission matrix
   per role (create: customer/cashier · confirm: cashier+ · cook: chef ·
   ready: auto when all items served, or chef · delivered: via payment).
2. Item progress = `qty_served` (0 = pending, partial = preparing, full = done);
   order auto-`ready` when all items done. `RecalculateTotalAmount` runs inside the
   same tx after **every** order_items mutation.
3. Cancel: ❓ **CLARIFY before O phase** — owner's target rule ("any time before
   payment") vs the old code's "<30 % served" threshold. Plan default: owner's target
   rule, item-level and order-level, stock-free (no inventory decrement at order time
   in a restaurant).
4. One active order per table: ❓ **CLARIFY before O phase** — hard 409 block vs the
   old informational `table_busy` flag (which silently allowed parallel orders and
   left dead FE branches). Plan default: hard block + "join existing order" UX.
5. Price snapshot: order lines freeze name + unit price server-side at creation; the
   wire never carries client prices. Combos expand to a header row (`unit_price=0`)
   + component rows (`combo_ref_id`).
6. Payments: only when order `ready`; one payment row per order (UNIQUE, retries
   UPDATE); webhooks verify HMAC **before** any DB read, are idempotent, and verify
   amount vs DB. No hard delete on payments. Cash completes synchronously.

## 4. Frontend plan

Rules of the road are already decided and unchanged: `FE_STATE.md` (server state →
TanStack Query, one API client, `ui`-slice Zustand, URL owns filters, 3-tier
loading/error) and the F-7 design system (tokens, CVA buttons, commerce patterns).
This plan adds the restaurant page map on top.

### 4.1 Shells

- **Customer shell** — mobile-first, fixed bottom tab bar (Menu · Orders · Favourites
  · Tracking · Settings).
- **Dashboard shell** — wraps `/kds`, `/pos`, `/cashier/*`, `/admin/*`; owns the ONE
  WebSocket provider per session.
- **Admin shell** — nested in dashboard shell: tab nav + AuthGuard/RoleGuard
  (manager+), theme toggle.

### 4.2 State additions (extend, not replace, FE_STATE.md)

- `cart` store (Zustand, persisted): line items keyed `product_<id>_<sortedToppingIds>`,
  tableId/tableName, activeOrderId. **Cart is client-only** — no BE cart endpoints.
- `favourites` store (persisted, device-local v1 — no account sync).
- Guest/staff session: httpOnly cookies (F-5) — never JS-readable, no auth store
  persistence problem (the old "F5 wipes the session, re-scan the QR" bug disappears).
- POS cart = component state (deliberately not the customer cart store).
- SSE/WS hooks: `useOrderSSE`, `useOrderMonitorSSE`, `useOrdersWS` — all built on the
  one event-contract file, all handle every event type (gate: a new published event
  type fails CI if a consumer switch doesn't handle it).

### 4.3 Page build order

Pages ride their phase (map in §8): menu + detail pages in C, QR airlock in T,
checkout/order/tracking in O–R, staff screens in S, admin suite in AD. Every page
follows the reference's 6-file doc set pattern only *after* it exists — wireframes
in the reference are the visual contract to build against (mobile-first customer,
desktop staff/admin).

## 5. DevOps plan

Two-stage go-live, one pipeline — the reference's shape, minus its gaps:

- **Stage A (LAN):** full compose stack on the owner's Mac; phones on shop Wi-Fi hit
  `http://<mac-ip>`; QR stickers carry `http://<mac-ip>/table/<qr_token>`. Everything
  real except public TLS + payment webhooks.
- **Stage B (VPS):** same images + `docker-compose.prod.yml` on a small VPS
  (2 vCPU/2 GB, SG region), domain + Caddy auto-TLS; push-to-main auto-deploy.

**Compose stack (10 services):** mysql · redis · be (distroless multi-stage) ·
fe (Next standalone) · caddy (the only public entry — `/api/*`, `/uploads/*`,
`/health` → be:8080; else → fe:3000) · swagger · prometheus · grafana · loki ·
promtail. F-2 builds the first 5; observability joins in OPS phase.

**CI/CD (starts in F-4, grows):** push → lint + `go test` **and FE build/test**
(old CI was BE-only) → build images tagged by commit SHA → GHCR → SSH deploy →
health-check → **auto-rollback** to previous tag on failure (keep two prod tags).
Prove rollback once before go-live.

**Monitoring:** Prometheus scrapes `/metrics` (req rate, 5xx %, p95) + the two alert
rules (HighErrorRate, SlowResponseTime) + **Alertmanager with a real notification
channel** (old gap: alerts nobody saw). Loki/promtail for logs, Grafana provisioned
read-only. Nightly `mysqldump | gzip`, 14-day retention.

**Hard-won compose gotchas (inherited as rules):** `NEXT_PUBLIC_API_URL` is baked at
FE build time and must point at **Caddy**, not `:8080` (the old system's browser
bypassed the proxy entirely); `ACME_EMAIL` never empty; MySQL creds freeze into the
volume at first init; DB/Redis ports never public in Stage B. Env-var names get ONE
canonical list in `ENVIRONMENT.md` (the reference had two conflicting sets).

## 6. Lessons register — the old system's defects this plan designs against

Compressed from ~40 per-page bug docs; each becomes an alignment gate or an explicit
task AC in its phase. Never rebuild: **the unauthenticated dev shell-exec route**
(`POST /api/dev/run` — 🔴 the single worst finding).

| # | Old defect | Our rule |
|---|---|---|
| 1 | SSE events published but not consumed; event-name drift (`order.status` vs `order_status_changed`) | one generated event contract, exhaustive consumer switches (§3.5) |
| 2 | No snapshot/replay on stream (re)connect | snapshot-on-connect everywhere (§3.5) |
| 3 | Streams without ownership/role checks | gates on every channel (§3.5) |
| 4 | `TABLE_HAS_ACTIVE_ORDER` documented, never returned — 3 dead FE branches | decide rule 4 (§3.7) before O; no speculative FE error branches (gate: FE handles only codes BE emits) |
| 5 | Cache-invalidation blind spots (topping edit → stale product) | invalidation map is part of the catalog task's AC (§3.6) |
| 6 | FE-only validation (phone regex, password length mismatch) | BE validates everything; Zod mirrors BE, never replaces it |
| 7 | Thin write DTOs (`POST /orders` → `{id}` → "Đơn #undefined") | writes return the full object the UI renders |
| 8 | Manager sees admin-only DELETE buttons → 403 | FE role-gates every action it renders |
| 9 | Non-transactional multi-writes (stock movement, combo items) | service-owned tx boundaries (F-8) cover every multi-write |
| 10 | Missing endpoints behind live UI (profile, task edit, KDS serve 404) | a page ships only when its endpoints exist (task deps enforce) |
| 11 | Public register mints active staff accounts | register disabled or invite-gated; roles only via admin |
| 12 | Synthetic data shown as real (perf score = 0, marketing mock) | stubs are labeled in UI or not built |
| 13 | Token in WS query string, logged | cookie auth (§3.4) |
| 14 | No rate limit on guest mint | rate limits day one (§3.4) |

## 7. Deferred / planned (unchanged unless owner says otherwise)

- **Payment gateways** (VNPay/MoMo/ZaloPay + webhooks) — Phase P, after cash flow works.
- **Online customer accounts** (register/login, profile, pickup/delivery, cart-merge) —
  post-v1 phase; the old A-3 cart-merge rule returns here.
- **AI assistant** — still deferred (Session 0).
- 🔮 reference pages: introduction, admin storage (+ forecast migration), admin bottom
  nav, POS order-on-behalf, training progress-tracking half, real marketing ledger —
  all land in the latest phases, owner-prioritized.

## 8. Phased roadmap + reconciliation with TASKS.md

Phase order and rationale: foundation → catalog (feeds every surface) → tables/guest
auth (unlocks ordering) → orders (the core loop) → realtime (makes it live) → staff
screens (kitchen + cashier close the loop) → admin (management) → payments/ops/online.
Task rows are registered into TASKS.md when each phase opens; sizing rule (1 session,
1–2 files, 1 AC) still governs — the bullets below are phase scopes, not final rows.

| Phase | Scope (→ future task rows) | Old rows re-homed |
|---|---|---|
| **F** (now) | F-2 skeleton · F-3 DB/migrations · F-4 error contract + API client + CI | F-2, F-3, F-4 unchanged — still next |
| **C — Menu catalog** | catalog schema + seed (products/categories/toppings/combos) · BE list/detail + cache-aside · BE toppings/combos · FE menu page · FE product detail · FE combo detail + favourites | C-1 (schema grows toppings/combos tables), C-2, C-3, C-4, C-5 all kept, restaurant-skinned |
| **T — Tables & guest auth** | tables schema + QR tokens · `POST /auth/guest` (+ online variant) + guest-JWT cookie + rate limit · `/table/:id` airlock page + cart store | CC-1/CC-2 **superseded** (no BE cart — cart is client-side; guest identity = JWT not cart-cookie) |
| **O — Ordering core** | orders schema + state machine · `POST /orders` (snapshot, combo expansion, tx) · order read/cancel/item-edit · FE checkout (QR modal + online form) · FE order list/detail | CC-3→FE cart UI here · CC-4→`POST /orders` · CC-5→checkout flow · O-1/O-2/O-3 kept with the new state machine |
| **R — Realtime** | pub/sub platform pkg + event contract · SSE order events + monitor (snapshot-on-connect) · FE tracking page + live order detail | new (was nothing) |
| **S — Staff core** | staff schema + auth + RBAC middleware · login page · KDS (WS board + serve flow) · POS · cashier payment (cash) | A-1→staff auth · A-2→login page · A-3 deferred to online-accounts phase |
| **AD — Admin suite** | overview (dual-channel live floor) · summary/analytics · catalog CRUD ×4 · staff CRUD · tasks (with the missing PATCH/DELETE!) · ingredients + movements · training · marketing | un-defers the ⛔ Admin row |
| **P — Payments** | gateway clients + webhooks (HMAC-first, idempotent) · QR payment UX · proof upload | un-defers the ⛔ Payment row |
| **OPS — Go-live** | observability services + Alertmanager · Stage A runbook · CI deploy + rollback proof · Stage B VPS + TLS · backups | new |
| **ON — Online ordering** 🔮 | customer accounts, profile BE, pickup/delivery, cart merge (old rule 5) | A-3 lands here |

Verification pattern per phase (unchanged discipline): BE tasks → curl transcripts in
`VERIFICATION.md`; FE tasks → screenshots; realtime tasks → two-client event
transcripts; every task keeps the checkpoint→receipt loop.

## 9. Open decisions for the owner (non-blocking, defaults chosen)

1. ⚠️ **The pivot itself** (§TL;DR) — silence = restaurant platform is the product.
2. ❓ **Cancel rule** (§3.7-3) — default: cancellable any time before payment.
3. ❓ **One-order-per-table** (§3.7-4) — default: hard block + join-order UX.
4. 💡 **Vietnamese-first UI copy** (the reference is fully Vietnamese) — default: yes,
   VN strings with an i18n-ready constants file, no framework until needed.
5. 💡 **Staff register page**: reference has public self-registration (a security
   hole) — default: not built; admin creates staff accounts.

---

*Written by F-9 (2026-07-17) from a 4-agent digest of `reference/docs/system/`.
One fact one home: stack → `PLAN.md` · layers/state → `ARCHITECTURE.md`/`FE_STATE.md`/
`BE_STATE.md` · tokens → design-system.html · task status → `TASKS.md`. This file owns
the product scope, the phase roadmap, and the lessons register.*
