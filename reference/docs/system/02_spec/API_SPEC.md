# API Specification — Condensed Endpoint Table

> **TL;DR**
> All endpoints under base path `/api/v1`. Auth: `Authorization: Bearer <access_token>`.
> Success: `{"data": ...}`. Error: `{"error": "CODE", "message": "...", "details": {...}?}`.
> All IDs are UUID strings (CHAR 36). Currency in VND integer (no decimals).
> Full DTO shapes: request/response structs in `be/internal/handler/*_handler.go` (Go source).

---

## Conventions

| Symbol | Meaning |
|---|---|
| public | No token required |
| auth | Any valid JWT (staff or guest) |
| cashier+ | Role: cashier, staff, manager, admin |
| chef+ | Role: chef, cashier, staff, manager, admin |
| manager+ | Role: manager, admin |
| admin | Role: admin only |
| HMAC | Public endpoint, but HMAC signature verified server-side |

---

## Auth

| Method | Path | Purpose | Auth | Key Request Fields | Key Response Fields |
|---|---|---|---|---|---|
| POST | `/auth/login` | Staff login | public | `username` (min 3), `password` (min 8) | `access_token`, `user{id,username,full_name,role,email}` + refresh cookie |
| POST | `/auth/register` | Create staff account (role hardcoded `cashier`) | public | `username`, `password` | `access_token`, `user{id,username,full_name,role,email}` + refresh cookie |
| POST | `/auth/refresh` | Rotate access token | public | (refresh cookie) | `access_token` |
| POST | `/auth/guest` | Guest JWT from QR token | public | `qr_token` (len 64) | `access_token`, `expires_in`, `table{id,name,capacity,status}` |
| POST | `/auth/logout` | Revoke session | auth | (refresh cookie) | 204 |
| GET | `/auth/me` | Current user profile | auth | — | `id`, `username`, `full_name`, `role`, `is_active` |

---

## Products / Catalog

| Method | Path | Purpose | Auth | Key Request Fields | Key Response Fields |
|---|---|---|---|---|---|
| GET | `/products` | List available products | public | — | `[ProductJSON]` |
| GET | `/products/all` | List all products incl. unavailable | manager+ | — | `[ProductJSON]` |
| GET | `/products/:id` | Get single product | public | — | `ProductJSON` |
| POST | `/products` | Create product | manager+ | `name`, `price`, `category_id`, `topping_ids[]` | `id` |
| PATCH | `/products/:id` | Update product | manager+ | any field; `topping_ids` optional | `message` |
| PATCH | `/products/:id/availability` | Toggle availability | manager+ | `is_available` | `message` |
| DELETE | `/products/:id` | Soft-delete product | admin | — | `message` |
| GET | `/categories` | List categories | public | — | `[{id,name,description,sort_order,is_active}]` |
| POST | `/categories` | Create category | manager+ | `name`, `sort_order` (`description` optional) | `id` |
| PATCH | `/categories/:id` | Update category | manager+ | `name`, `sort_order` (`description` optional; full replace) | `message` |
| DELETE | `/categories/:id` | Delete category | admin | — | `204` (no body) |
| GET | `/toppings` | List toppings | public | — | `[{id,name,price,is_available}]` |
| POST | `/toppings` | Create topping | manager+ | `name`, `price` | `id` |
| PATCH | `/toppings/:id` | Update topping | manager+ | `name`, `price`, `is_available` | `message` |
| DELETE | `/toppings/:id` | Delete topping | admin | — | `message` |
| GET | `/combos` | List combos | public | — | `[ComboJSON]` |
| POST | `/combos` | Create combo | manager+ | `name`, `price`, `items:[{product_id,quantity}]` | `id` |
| PATCH | `/combos/:id` | Update combo | manager+ | `name`, `price`, `items` (min 2) | `message` |
| DELETE | `/combos/:id` | Delete combo | admin | — | `message` |

`ProductJSON`: `{id, name, price, description, image_path→full URL, category_id, is_available, sort_order, toppings:[...]}`

---

## Orders

| Method | Path | Purpose | Auth | Key Request Fields | Key Response Fields |
|---|---|---|---|---|---|
| POST | `/orders` | Place new order | auth | `source(online\|qr\|pos)`, `table_id?`, `items[{product_id XOR combo_id, quantity, topping_ids[], note, combo_items?}]` | `id` |
| GET | `/orders/live` | Active orders list | cashier+ | — | `[OrderJSON]` |
| GET | `/orders/history` | Completed/cancelled orders | cashier+ | — | `[OrderJSON]` |
| GET | `/orders/:id` | Get single order | auth | — | `OrderJSON` |
| PATCH | `/orders/:id/status` | Advance order status | chef+ | `status` | `message` |
| DELETE | `/orders/:id` | Cancel order | auth | — | `message` |
| GET | `/orders/:id/events` | SSE stream for order | auth | — | SSE stream |
| POST | `/orders/:id/items` | Add items to open order | auth | `items[{...}]` (same schema as POST /orders) | updated totals |
| PATCH | `/orders/items/:id/quantity` | Update item quantity | auth | `quantity` (min 1) | `message` |
| PATCH | `/orders/items/:id` | Mark item(s) served | chef+ | `qty_served` | `message` |
| DELETE | `/orders/items/:id` | Remove item from order | auth | — | `message` |

`OrderJSON` (key fields): `id`, `order_number`, `status`, `source`, `table_id`, `total_amount`, `items[{id, product_id, combo_id, combo_ref_id, name, unit_price, quantity, qty_served, item_status, toppings_snapshot, note}]`

> **Full Order shape across all layers (FE ⇄ BE ⇄ DB) → single home: [OBJECT_MODEL_ORDER.md](object/OBJECT_MODEL_ORDER.md)** (Rule #9). The line above is the endpoint-contract subset only.

**Combo row convention:** combo expands to 1 header row (`combo_id` set, `unit_price=0`) + N sub-item rows (`combo_ref_id`=header id). Never charge the header — it is a label only. FE hides rows where `combo_id && !combo_ref_id`.

**item_status** is derived (not a DB column): `qty_served=0` → `pending`; `0<qty_served<quantity` → `preparing`; `qty_served=quantity` → `done`.

---

## Order Groups

| Method | Path | Purpose | Auth | Key Request Fields | Key Response Fields |
|---|---|---|---|---|---|
| POST | `/orders/group` | Group ≥ 2 orders | cashier+ | `order_ids[]` (min 2) | `group_id` |
| GET | `/orders/group/:id` | Get group orders | auth | — | `[OrderJSON]` |
| POST | `/orders/group/:id/orders` | Add order to group | cashier+ | `order_id` | updated group |
| DELETE | `/orders/group/:id/orders/:orderId` | Remove order from group | cashier+ | — | `message` |
| DELETE | `/orders/group/:id` | Disband group | manager+ | — | `message` |
| GET | `/orders/group/:id/events` | SSE for group | auth | — | SSE stream |

---

## Payments

| Method | Path | Purpose | Auth | Key Request Fields | Key Response Fields |
|---|---|---|---|---|---|
| POST | `/payments` | Create payment | cashier+ | `order_id`, `method(vnpay\|momo\|zalopay\|cash)` | `{...payment, pay_url?}` |
| GET | `/payments/:id` | Get payment | cashier+ | — | payment object |
| POST | `/payments/webhook/vnpay` | VNPay webhook | HMAC | gateway body | `{RspCode, Message}` |
| POST | `/payments/webhook/momo` | MoMo webhook | HMAC | gateway JSON | 204 / result object |
| POST | `/payments/webhook/zalopay` | ZaloPay webhook | HMAC | gateway form | `{return_code, return_message}` |

Payment requires `order.status = ready` **or** `delivered` (`order_service.go:50` — both pass the gate). Webhook order: HMAC verify → amount verify → idempotency check → update DB. Webhooks always return 200-class to gateway even on logical failure.

> ⚠️ The `POST /payments` "Key Response Fields" above is the **intended** contract; the current code returns only the thin `{id, pay_url, qr_code_url}` (no `status`/`amount`/`method`) — see [08_pages/staff/staff_cashier_payment/PAYMENT_BUGS.md](../08_pages/staff/staff_cashier_payment/PAYMENT_BUGS.md) Bug 2.

---

## QR / Tables

| Method | Path | Purpose | Auth | Key Request Fields | Key Response Fields |
|---|---|---|---|---|---|
| GET | `/tables/qr/:token` | Decode QR → table info | public | — | `{id, name, capacity, status}` |
| GET | `/tables` | List tables | cashier+ | — | `[table]` |
| POST | `/tables` | Create table + QR | manager+ | `name`, `capacity` | `{id, qr_token}` |
| PATCH | `/tables/:id` | Update table | manager+ | `name`, `capacity`, `is_active?` | `message` |

---

## Staff

| Method | Path | Purpose | Auth | Key Request Fields | Key Response Fields |
|---|---|---|---|---|---|
| GET | `/staff` | List staff | manager+ | — | `[StaffJSON]` |
| POST | `/staff` | Create staff account | manager+ | `username`, `password`, `full_name`, `role`, `shifts[]`, `phone` | `StaffJSON` |
| GET | `/staff/:id` | Get staff detail | manager+ | — | `StaffDetailJSON` |
| PATCH | `/staff/:id` | Update staff | manager+ | any field (all optional `*`) | `StaffDetailJSON` |
| PATCH | `/staff/:id/status` | Activate/deactivate | manager+ | `is_active` | updated object |
| DELETE | `/staff/:id` | Delete staff | admin | — | `message` (blocked if last admin) |

---

## Admin — Analytics

| Method | Path | Purpose | Auth | Query Params | Key Response Fields |
|---|---|---|---|---|---|
| GET | `/admin/summary` | Revenue + order metrics | manager+ | `?range=today\|week\|month` | `{customers, dishes_sold, revenue, active_tables}` (`active_tables` is live, range-agnostic) |
| GET | `/admin/top-dishes` | Top-selling dishes | manager+ | `?range`, `?limit` (default 5) | `[{name, qty, pct, revenue}]` (`pct` = share of returned top-N) |
| GET | `/admin/staff-performance` | Staff KPIs | manager+ | `?range` | per-staff order/revenue stats |

---

## Admin — Ingredients

Note: uses **camelCase** JSON keys unlike the rest of the API (`importDate`, `shelfDays`). Quantities are floats (3 decimal places).

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/admin/ingredients` | List all ingredients | manager+ |
| GET | `/admin/ingredients/low-stock` | Ingredients below threshold | manager+ |
| POST | `/admin/ingredients` | Create ingredient | manager+ |
| GET | `/admin/ingredients/:id` | Get ingredient | manager+ |
| PATCH | `/admin/ingredients/:id` | Update ingredient | manager+ |
| DELETE | `/admin/ingredients/:id` | Delete ingredient | admin |
| GET | `/admin/ingredients/:id/movements` | Stock movement log | manager+ |
| POST | `/admin/stock-movements` | Record stock movement | manager+ |

---

## Admin — Tasks, Training, Marketing

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/admin/tasks/stats` | Task stats by date | manager+ |
| GET | `/admin/tasks` | Tasks for a staff member | manager+ |
| POST | `/admin/tasks` | Create task | manager+ |
| GET | `/admin/training/guides` | List training guides | manager+ |
| POST | `/admin/training/guides` | Create guide | manager+ |
| PATCH | `/admin/training/guides/:id` | Update guide | manager+ |
| DELETE | `/admin/training/guides/:id` | Delete guide | admin |
| GET | `/admin/training/guides/:id/progress` | Guide completion progress | manager+ |
| GET | `/admin/training/staff/:sId/progress/:gId` | Staff guide detail | manager+ |
| PATCH | `/admin/training/staff/:sId/progress/:gId` | Add manager notes | manager+ |
| GET | `/admin/marketing/spend` | Campaign spend data (static) | manager+ |

---

## Files + Realtime

| Method | Path | Purpose | Auth | Notes |
|---|---|---|---|---|
| POST | `/files/upload` | Upload image | cashier+ | `multipart/form-data`, field `file`, max 10 MB, JPEG/PNG/WebP only |
| GET | `/sse/admin` | Admin floor monitor SSE | manager+ | SSE stream |
| GET | `/sse/order-monitor/:id` | Extended floor monitor SSE | auth | SSE stream |
| GET | `/ws/kds` | KDS WebSocket | JWT `?token=` | WebSocket upgrade |
| GET | `/ws/orders-live` | POS live feed WebSocket | JWT `?token=` | WebSocket upgrade |

---

## Deep Dive Sources

| Topic | File |
|---|---|
| Full DTO shapes (request + response field-by-field) | `be/internal/handler/*_handler.go` (Go source) |
| Route → handler mapping (full table) | `../03_be/BE_CODE_SUMMARY.md §3` |
| Browsable spec | Swagger UI at :8090 (`docker compose up swagger`) |
