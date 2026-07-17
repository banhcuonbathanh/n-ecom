# LOGIC_BE — Backend Business Logic Invariants

> **TL;DR:** The server is the **only** enforcer of business rules — FE checks are UX hints, never
> security. All logic lives in `service/` (handler parses, repository stores). This file lists the
> per-domain invariants the BE must never break, the one ⚠️ DRIFT (cancel rule), and the 🔮 PLANNED
> domains. Shared rule definitions: [../02_spec/BUSINESS_RULES.md](../02_spec/BUSINESS_RULES.md).
> **Mandate:** consult + update this file before changing any BE logic →
> [LOGIC_INDEX.md](LOGIC_INDEX.md).

---

## 1 — Where BE Logic Lives

| Layer | Logic allowed | Reference |
|---|---|---|
| `handler/` | None — bind/validate JSON, call service, `respondError` | [BE_TECH_SUMMARY §2](../03_be/BE_TECH_SUMMARY.md) |
| `service/` | **All** business rules, state machines, AppError mapping, Redis publish | same |
| `repository/` | None — sqlc wrappers + transactions only | same |
| `middleware/` | Auth + RBAC only (`AuthRequired`, `AtLeast`) | §7–§8 below |

A business rule found in a handler or repository is a bug — move it to the service.

---

## 2 — Order State Machine Enforcement

Shared definition: [BUSINESS_RULES §2](../02_spec/BUSINESS_RULES.md#2-order-rules) ·
diagram + full transition table: [ORDER_STATE_MACHINE](../01_flow/ORDER_STATE_MACHINE.md).

BE invariants:

| # | Invariant |
|---|---|
| 1 | All transitions are **server-enforced** in `order_service` — an invalid transition returns **422**, never silently corrected |
| 2 | Only the transitions in the [transition table](../01_flow/ORDER_STATE_MACHINE.md#transition-table) exist; role checks per row (customer/cashier/chef/staff/manager) |
| 3 | `ready` is reached **automatically** when all items hit `qty_served = quantity`, or manually by chef/staff |
| 4 | `delivered` is only reached **via payment completion** (`POST /payments` path) — never by a direct status PATCH |
| 5 | Item status is **derived** from `qty_served` — there is no `status` column on `order_items`; never add one |
| 6 | `delivered` and `cancelled` are terminal — no transition out |

---

## 3 — Cancel Rule — DRIFT

⚠️ **DRIFT (owner decision 2026-06-12):** Customers can cancel their meal/order at **ANY time
before payment completes**. This replaces the "< 30% served" customer cancel rule.
**Current code still enforces the old rule — BE change pending.** See
[Decision Log](LOGIC_INDEX.md#decision-log).

| | Current code behaviour ✅ (what's enforced today) | Target rule ⚠️ (owner decision, pending) |
|---|---|---|
| Customer cancel window | `SUM(qty_served)/SUM(quantity) < 0.30` AND status in `pending/confirmed/preparing` | Any time until payment `completed` (includes `ready`) |
| Cancel at `ready` | Blocked regardless of ratio | Allowed (until payment completes) |
| Error on block | `CANCEL_THRESHOLD` (see [ERROR_SPEC §3](../02_spec/ERROR_SPEC.md)) | Only blocked when payment already `completed` / order `delivered` |
| Staff cancel | Same < 30% gate | TBD with owner when implementing — do not assume |

Until the BE change lands: **code wins** — implement against the current behaviour, but do not
write new code that hard-bakes the 30% assumption deeper (keep the guard in one place:
`order_service` cancel guard). Refund duty is unchanged: cancelling an order that has a payment
row triggers the refund flow ([BUSINESS_RULES §3](../02_spec/BUSINESS_RULES.md#3-cancel-rules)).

---

## 4 — One Active Order Per Table

Shared definition: [BUSINESS_RULES §2.3](../02_spec/BUSINESS_RULES.md#2-order-rules).

- Checked in `CreateOrder` **before** any insert: active = status in
  (`pending`,`confirmed`,`preparing`,`ready`) and `deleted_at IS NULL`.
- Violation → `409 TABLE_HAS_ACTIVE_ORDER` with `details.active_order_id` — the FE relies on
  that field to redirect ([LOGIC_FE §6](LOGIC_FE.md#6--one-active-order--redirect-rules)); never omit it.
- `delivered` / `cancelled` never block a new order.

---

## 5 — Combo Expansion + recalculateTotalAmount

Shared definition: [BUSINESS_RULES §2.5](../02_spec/BUSINESS_RULES.md#2-order-rules) ·
row-shape table: [ORDER_STATE_MACHINE — combo rows](../01_flow/ORDER_STATE_MACHINE.md#combo-item-rows).

| # | Invariant |
|---|---|
| 1 | Combo = 1 header row (`combo_id` set, `unit_price = 0`) + N sub-item rows (`combo_ref_id` = header ID) |
| 2 | Header price is **always 0** — sub-items carry the money. Pricing the header double-counts the combo (the OC-2 bug) |
| 3 | `recalculateTotalAmount()` runs **inside the same transaction** after **every** `order_items` mutation (create, add items, qty change, item cancel) — `orders.total_amount` is denormalized; skipping this charges the wrong amount |
| 4 | `filling` (thit / moc_nhi / NULL) and `combo_items` overrides from the request payload are honored on create — never dropped |
| 5 | Product price/name are snapshotted at order time (`GetProductSnapshot`) — later catalog edits must not change existing orders |

---

## 6 — Payment Rules

Shared definition: [BUSINESS_RULES §4](../02_spec/BUSINESS_RULES.md#4-payment-rules) ·
sequence diagrams: [PAYMENT_FLOW](../01_flow/PAYMENT_FLOW.md).

| # | Invariant |
|---|---|
| 1 | Payment create only when `order.status = "ready"` — otherwise `ORDER_NOT_READY` |
| 2 | `UNIQUE(order_id)` — one payment row per order; retries **UPDATE** the row (`attempt_count++`), never INSERT (`PAYMENT_ALREADY_EXISTS`) |
| 3 | Webhooks: **HMAC verify FIRST** — before any DB query or business logic |
| 4 | Webhook idempotency: if `payment.status = "completed"` already → ack and exit; webhooks repeat |
| 5 | Webhook amount must equal `payment.amount` in DB — mismatch is rejected |
| 6 | COD completes synchronously: payment `completed` + order `delivered` in one call |
| 7 | Successful payment → order `delivered` + publish `payment_success` (WS) — both, always |
| 8 | Soft delete only (`deleted_at`) — payments are an audit trail; raw webhook body saved to `gateway_data`, never exposed via API |

---

## 7 — RBAC Middleware Rules

Shared definition: [BUSINESS_RULES §1](../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy).

- Role checks happen **only** in middleware (`RequireRole`, `AtLeastRole`/`AtLeast`,
  `RequireOwner`) wired at route registration — **never hardcoded inside handlers**.
- Hierarchy values: `guest(0) < chef(2) < cashier/staff(3) < manager(4) < admin(5)`
  ([BE_TECH_SUMMARY §3](../03_be/BE_TECH_SUMMARY.md)). `customer` is isolated from the staff tree.
- Ownership rule: a customer/guest may only read/cancel **their own** order (table claim in the
  guest JWT); staff roles act on any order per the cancel table.
- Per-route auth levels are the single list in
  [BE_CODE_SUMMARY §3 — Route Table](../03_be/BE_CODE_SUMMARY.md#3--route-table-87-routes-prefix-apiv1-unless-noted).
  Adding a route without an explicit auth level is a bug.

---

## 8 — JWT / Guest Token Rules

Shared definition: [BUSINESS_RULES §5](../02_spec/BUSINESS_RULES.md#5-jwt--auth-rules).

| # | Invariant |
|---|---|
| 1 | HMAC-SHA256 only — pin the algorithm when parsing (block algorithm confusion) |
| 2 | Every authenticated request: signature → Redis blacklist `logout:{jti}` → `is_active` check (Redis `auth:staff:{id}` 5-min cache, **fail-open**) |
| 3 | Guest JWT: 2 h, stateless, `sub="guest"`, carries `table_id`; **no refresh, no DB row** — expiry means rescan QR |
| 4 | Guest scope: create order + read own table's order only |
| 5 | Staff refresh token: stored as SHA-256 hash in DB; raw value only in the httpOnly cookie |
| 6 | Logout = add `jti` to Redis blacklist with remaining-TTL expiry |
| 7 | Deactivating a staff must `DEL auth:staff:{id}` for near-instant lockout |
| 8 | Rate limit `POST /auth/guest` and login: 5 req/min/IP (Redis counter, fail-open) |

---

## 9 — Cache Invalidation Triggers

Full strategy + key table: [REDIS_CACHE](../03_be/REDIS_CACHE.md).

| # | Invariant |
|---|---|
| 1 | Cache-aside only: write = mutate MySQL → `DEL` keys. Never update a cached value in place |
| 2 | Any **product** write → Del `products:list` + `categories:list` + `product:{id}` (`invalidateProductCaches`) |
| 3 | Any **topping** write → Del `toppings:list` + `products:list` (products embed toppings) |
| 4 | Any **combo** write → Del `combos:list` · category write → covered by product invalidation set |
| 5 | Staff (de)activation → Del `auth:staff:{id}` |
| 6 | **Never cache:** orders, order items, payments, analytics, ingredients, staff list, tables, training, tasks |
| 7 | All Redis touchpoints fail open — Redis outage degrades performance, never correctness |

---

## 10 — Realtime Event Publishing Duties

Architecture + channel map: [REALTIME_SSE](../03_be/REALTIME_SSE.md) ·
config: [BUSINESS_RULES §6](../02_spec/BUSINESS_RULES.md#6-realtime-config).

The **service layer** owns publishing — a state change without its event leaves screens stale:

| State change (service) | Must publish | Channel(s) |
|---|---|---|
| Order created | `new_order` | `orders:kds` (+ admin channel) |
| Order status changed | `order_status_changed` / `order_updated` | `order:{id}` (SSE) + `orders:kds` (WS) + `orders:admin` |
| `qty_served` updated | `item_progress` | `order:{id}` + `orders:kds` |
| Order → ready | `order_completed` (WS naming) | `orders:kds` |
| Order cancelled | `order_cancelled` | `order:{id}` + `orders:kds` |
| Payment webhook OK | `payment_success` | WS live feed (`payment_service`) |

Publish is fire-and-forget (fail-open); SSE handlers replay a snapshot on reconnect, and the
customer stream sends `order_init` immediately on connect.

---

## 11 — Planned Domains 🔮

Owner decisions of 2026-06-12 — **none of this is in code**; see
[Decision Log](LOGIC_INDEX.md#decision-log). When implementing, design here first, then update
this section to ✅.

### 11.1 Online-ordering customer accounts 🔮
- Customers register/login and order from home (no table QR). Implies: customer account table +
  auth endpoints beyond the current stateless guest JWT, an order `source` for online orders,
  and order ownership by account instead of `table_id` claim.
- Open questions to settle before coding: fulfilment model (pickup/delivery), how
  one-active-order-per-table applies (it shouldn't, for online), payment timing.

### 11.2 POS on-behalf ordering 🔮
- Cashier logs in / creates a session and orders **on behalf of a customer with no phone**.
- Implies: a POS path that attaches the order to a customer identity (or anonymous walk-in)
  while keeping the cashier as `created_by` for audit.

### 11.3 Storage / inventory domain (Admin Storage) 🔮 (BE partially ✅)
- BE ingredient CRUD + stock movements **already exist** (`/admin/ingredients*`,
  `/admin/stock-movements`, `INVENTORY_INSUFFICIENT` error — see
  [BE_CODE_SUMMARY §3](../03_be/BE_CODE_SUMMARY.md)).
- 🔮 The planned `/admin/storage` page may need new aggregate/reporting endpoints — verify against
  the existing routes before adding any.

---

## 12 — Inventory / Storage Domain

Object model: [../02_spec/object/OBJECT_MODEL_INGREDIENT.md](../02_spec/object/OBJECT_MODEL_INGREDIENT.md) ·
Page: [../08_pages/admin/admin_storage/admin_storage.md](../08_pages/admin/admin_storage/admin_storage.md) ·
RBAC: manager+ (`AtLeast(manager)`) on all ingredient + stock-movement endpoints.

### 12.1 Current live invariants ✅

| # | Invariant |
|---|---|
| 1 | **Stock is always derived** — `current_stock = Σ stock_movements` where `type='in'` or `type='adjustment'` adds to total and `type='out'` subtracts; result floored at 0. Owners **never** edit `current_stock` directly; every change goes through a movement record. |
| 2 | **Low-stock threshold (×1.2):** an ingredient is "sắp hết" when `current_stock <= min_stock * 1.2` (used in `ListLowStock`). |
| 3 | **Status tiers** (evaluated in this priority order in the handler serializer): `out_of_stock` (`stock == 0`) → `expiring_soon` (`expiryDate < today + 7 days`) → `low_stock` (`stock <= min_stock`) → `in_stock`. Each tier is mutually exclusive; the first matching tier wins. |
| 4 | **Expiry formula:** `expiryDate = import_date + shelf_days` (calendar days). Default `shelf_days = 90` when not provided. |
| 5 | **Soft delete everywhere:** all queries filter `deleted_at IS NULL`; no hard-deletes on ingredients or movements. |
| 6 | **Recipe link (BOM):** `product_ingredients.qty_used` maps a product to the ingredients it consumes. Schema present. Consumption-on-order-create is **not** auto-wired — ingredient stock is NOT decremented automatically when an order is placed today. |
| 7 | A business rule found in a handler (e.g., status tier logic) is a bug — move it to `ingredient_service`. |

### 12.2 Planned: Run-out Forecast ("STOR") 🔮

> **Not in code.** Code wins — do not assume any column, endpoint, or UI exists until the migration
> lands. Object model ref: [../02_spec/object/OBJECT_MODEL_INGREDIENT.md](../02_spec/object/OBJECT_MODEL_INGREDIENT.md).
> Decision Log: [LOGIC_INDEX.md — 2026-06-13 entries](LOGIC_INDEX.md#decision-log).

| # | Planned rule |
|---|---|
| 1 | **avg_daily_usage column:** new `ingredients.avg_daily_usage DECIMAL(10,3) DEFAULT 0` — a **manual** per-ingredient estimate set by the owner. Chosen over auto-from-history and auto-from-orders×recipe (deterministic; works with zero order history). |
| 2 | **totalImported:** `Σ stock_movements WHERE type = 'in'` for the ingredient. On ingredient create, the initial quantity is recorded as an `'in'` movement so the total is complete from day one. |
| 3 | **daysRemaining:** `avg_daily_usage > 0 ? floor(current_stock / avg_daily_usage) : null`. |
| 4 | **runoutDate:** `avg_daily_usage > 0 ? today + daysRemaining days : null`. When `avg_daily_usage = 0` → both fields are `null`; the serializer emits `null` (FE renders "—"). |
| 5 | Forecast derivation belongs in the **service serializer** (`ingredient_service`), not the handler or repository — consistent with §12.1 #7. |
