# LOGIC_FE — Frontend Business Logic Invariants

> **TL;DR:** FE business logic = strict state homes (TanStack / Zustand / useState / RHF+Zod),
> ONE order write path (`fe/src/lib/order-payload.ts`), centralized storage keys, error-code →
> UI-action mapping, and the redirect/reconnect behaviours that keep client and server in sync.
> FE never *enforces* a business rule — it mirrors the BE's rules for UX. One ⚠️ DRIFT (cancel UX)
> and four 🔮 PLANNED pages/flows. **Mandate:** consult + update this file before changing any FE
> logic → [LOGIC_INDEX.md](LOGIC_INDEX.md).

---

## 1 — State Homes (strict)

Full decision table + patterns: [STATE_MANAGEMENT](../04_fe/STATE_MANAGEMENT.md) ·
store inventory: [FE_CODE_SUMMARY](../04_fe/FE_CODE_SUMMARY.md).

| Data kind | Home | Never |
|---|---|---|
| Server data (products, orders, …) | TanStack Query (`useQuery`/`useMutation` + `invalidateQueries`) | `useState + useEffect + fetch` |
| Cross-page client state (auth, cart, favourites) | Zustand stores in `fe/src/store/` | prop drilling, Context |
| Component-local UI state | `useState` | Zustand |
| Forms | RHF + Zod | `useState` per field |
| URL filters (admin tables) | `useSearchParams` | Zustand |

Security invariants:
- **Tokens are memory-only** — `useAuthStore` has no `persist()`. Session restore on reload =
  `GET /auth/me` via the httpOnly refresh cookie ([DATA_COMMUNICATION](../04_fe/DATA_COMMUNICATION.md)).
- Cart `items[]` are session-only; only `orderNote` + `activeOrderId` persist
  (`STORAGE_KEYS.CART_CONFIG`).
- POS cart is **component `useState`** — intentionally dies with the component; do not move it
  to Zustand/localStorage ([STAFF_FLOW invariants](../01_flow/STAFF_FLOW.md#invariants--never-break)).

---

## 2 — Single Order Write Path

**Every** cart → `POST /orders` body is built by `buildOrderItemsPayload()` in
`fe/src/lib/order-payload.ts` — the only place that knows combo mapping, canh splitting, and
filling handling ([DATA_COMMUNICATION — Order Payload Builder](../04_fe/DATA_COMMUNICATION.md#order-payload-builder)).

The three POST paths that MUST use it:

| # | Path | Trigger |
|---|---|---|
| 1 | `TableConfirmModal` (menu page) | QR table order |
| 2 | `/checkout` page | Walk-in / online checkout |
| 3 | Add-to-order ("Đặt thêm món") | `activeOrderId` set → `POST /orders/:id/items` |

**Never build `items[]` inline in a page.** Divergence here makes the saved order differ from the
menu preview (root cause of the OC epic). A fourth POST path (🔮 online ordering, §9) must also
go through this builder.

---

## 3 — Storage Keys Rule

All localStorage key strings come from `fe/src/lib/storage-keys.ts` (`STORAGE_KEYS`) — **no
hardcoded key strings anywhere**. Key table + who reads what:
[DATA_COMMUNICATION — localStorage keys](../04_fe/DATA_COMMUNICATION.md#page-to-page-data-localstorage-keys).
Adding a key = add it to `STORAGE_KEYS` first, then use the constant.

---

## 4 — Error Code → Message Mapping Duty

Codes + format: [ERROR_SPEC](../02_spec/ERROR_SPEC.md). The FE owns turning each code into a UI
action — in the axios interceptor (`fe/src/lib/api-client.ts`) for cross-cutting codes, in the
page for domain codes:

| Code | FE action |
|---|---|
| 401 + guest token | `clearAuth()` → re-entry via QR (guests cannot refresh) |
| 401 + staff token | Silent `POST /auth/refresh` → retry **once**; never redirect to `/login` on first 401 |
| `FORBIDDEN` (403) | Toast "Không có quyền…" |
| `INVALID_INPUT` | Map `details.fields[]` → RHF `setError()` per field |
| `TABLE_HAS_ACTIVE_ORDER` | Redirect to `details.active_order_id` (§6) — never a generic error |
| `CANCEL_THRESHOLD` | Explain the cancel block (see §5 DRIFT) |
| `ORDER_NOT_READY` | Block navigation to payment for non-ready orders |

New BE error codes require a mapping decision here — an unmapped code falls through to a generic
toast, which is a logic gap.

---

## 5 — Cancel UX — DRIFT

⚠️ **DRIFT (owner decision 2026-06-12):** target = customer can cancel **any time until payment
completes**. Current code (BE and FE) still follows the < 30% rule. See
[Decision Log](LOGIC_INDEX.md#decision-log) and [LOGIC_BE §3](LOGIC_BE.md#3--cancel-rule--drift).

| | Current FE behaviour ✅ | Target FE behaviour ⚠️ (pending — blocked on BE change) |
|---|---|---|
| Cancel button on `/order/:id` | Hidden/disabled when ≥ 30% served or status `ready`/`delivered` | Always offered until payment `completed` |
| On `CANCEL_THRESHOLD` error | Show "cannot cancel" message | Should become unreachable for customers pre-payment |

Do **not** ship the always-offer UX before the BE guard changes — the button would just produce
409s. When BE lands, update both layer files and flip the Decision Log row to ✅.

---

## 6 — One Active Order — Redirect Rules

- `TABLE_HAS_ACTIVE_ORDER` (on QR scan or order create) → **redirect to the existing
  `/order/:active_order_id`** (or `/order`), never a generic error
  ([CLIENT_FLOW](../01_flow/CLIENT_FLOW.md)).
- After successful order create: cache order to `localStorage[ORDER_CACHE + id]`, set
  `activeOrderId`, `clearCart()` (wipes items + tableId), then navigate to `/order/:id`.
- `activeOrderId` persists across reloads (in `CART_CONFIG`) — powers `/tracking` and the
  add-to-order banner on `/menu`.
- `/order` list reads **only** the localStorage cache — no API call.

---

## 7 — SSE/WS Reconnect Behaviours

Hooks + endpoints: [DATA_COMMUNICATION — Realtime](../04_fe/DATA_COMMUNICATION.md#realtime-sse) ·
config: [BUSINESS_RULES §6](../02_spec/BUSINESS_RULES.md#6-realtime-config).

| # | Invariant |
|---|---|
| 1 | SSE auth = `Authorization: Bearer` header (`@microsoft/fetch-event-source`); WS auth = `?token=` query param — never swap them |
| 2 | Reconnect: exponential backoff 1s → 2s → 4s … max 30s, **5 attempts**; show `<ConnectionErrorBanner>` after 3 failures |
| 3 | On (re)connect the customer stream receives `order_init` — treat it as the snapshot; no extra GET |
| 4 | `useOrderSSE` patches local `useState<Order>` + localStorage cache; `useOverviewWS` patches the `['orders','live']` query cache via `setQueryData` — pick the right one of the two patterns |
| 5 | `order_cancelled` event on `/order/:id` → redirect customer to `/menu` |
| 6 | POS listens for `order_status_changed{ready}` → auto-redirect to `/cashier/payment/:id`; `payment_success` → toast → print → `/pos` |

---

## 8 — Role → Screen Routing

Shared role definitions: [BUSINESS_RULES §1](../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy) ·
flow: [STAFF_FLOW](../01_flow/STAFF_FLOW.md).

| Role | Post-login redirect | Guarded by |
|---|---|---|
| `chef` | `/kds` | `AuthGuard` + `RoleGuard` |
| `cashier` / `staff` | `/pos` | same |
| `manager` / `admin` | `/admin/overview` | same |
| `customer` (guest) | `/menu` (after QR scan — **never sees a login page**) | guest JWT presence |

`RoleGuard` renders 403 when `role_value < minRole` — it mirrors BE middleware, it does not
replace it.

---

## 9 — Planned Pages & Flows 🔮

Owner decisions of 2026-06-12 — **not built yet**; see [Decision Log](LOGIC_INDEX.md#decision-log).
Page inventory + ASCII drawings live in [../08_pages/PAGES_INDEX.md](../08_pages/PAGES_INDEX.md)
(being created in parallel).

| Page / flow | Route | Logic notes |
|---|---|---|
| Welcome 🔮 | `/welcome` | Public landing/entry page |
| Introduction 🔮 | `/introduction` | Public info page |
| Online ordering 🔮 | register/login → menu → order → track | Customer **account** auth (not guest JWT); order write path still via `order-payload.ts` (§2); cart rules from §1 apply |
| POS on-behalf UI 🔮 | inside `/pos` | Cashier orders for phone-less customers; POS cart stays component state (§1) |
| Admin Storage 🔮 | `/admin/storage` | Ingredient/inventory management UI over the **existing** BE ingredient endpoints ([LOGIC_BE §11.3](LOGIC_BE.md#11--planned-domains-)); manager+ via `RoleGuard` |

Before building any of these: follow the routing table in
[LOGIC_INDEX.md](LOGIC_INDEX.md#routing-table--im-changing-x-what-must-i-read) and update this
section (🔮 → ✅) as part of the build.

---

## 10 — Inventory / Storage UI

Object model: [../02_spec/object/OBJECT_MODEL_INGREDIENT.md](../02_spec/object/OBJECT_MODEL_INGREDIENT.md) ·
Page: [../08_pages/admin/admin_storage/admin_storage.md](../08_pages/admin/admin_storage/admin_storage.md) ·
BE invariants: [LOGIC_BE §12](LOGIC_BE.md#12--inventory--storage-domain).

### 10.1 Current live rules ✅

| # | Rule |
|---|---|
| 1 | **Stock is never edited directly** in the UI. The only write path for changing stock is `StockMoveModal` → `POST /admin/stock-movements` (type `in` / `out` / `adjustment`). A direct stock-edit field on the ingredient form is a bug. |
| 2 | **Low-stock / status badges** mirror the BE status tiers (§12.1 #3): `out_of_stock` → red badge "Hết hàng"; `expiring_soon` → orange badge "Sắp hết hạn"; `low_stock` → yellow badge "Sắp hết"; `in_stock` → green badge "Còn hàng". Badge logic is presentational only — the authoritative status comes from the API response field, never re-computed on the FE. |
| 3 | **Query key / invalidation pattern:** ingredient list → `['ingredients']`; detail → `['ingredients', id]`; stock movements → `['stock-movements', ingredientId]`. Any mutation (create / update / delete ingredient, record movement) calls `invalidateQueries(['ingredients'])` — reuse the same pattern as admin product CRUD. |
| 4 | **RBAC guard:** `/admin/storage` is guarded by `RoleGuard` at `manager` level — same as other `/admin/*` routes (§8). FE guard is UX only; BE enforces the rule. |

### 10.2 Planned: Forecast columns ("STOR") 🔮

> **Not built.** Code wins — do not add these columns or the form field until the `avg_daily_usage`
> migration lands and the BE serializes the forecast fields. Decision Log:
> [LOGIC_INDEX.md — 2026-06-13 entries](LOGIC_INDEX.md#decision-log).

| # | Planned rule |
|---|---|
| 1 | **"Tổng số lượng nhập" column** — display `totalImported` from the API response (Σ `in` movements). Read-only. |
| 2 | **"Sử dụng mỗi ngày" column + form field** — display and edit `avg_daily_usage`. Rendered as a number input (DECIMAL, min 0) in the ingredient create/edit form. Label: "Sử dụng mỗi ngày". |
| 3 | **"Dự kiến hết" column** — display `runoutDate` formatted as a date string (`dd/MM/yyyy`). When the API returns `null` (i.e., `avg_daily_usage = 0`) render "—" (em-dash, not an empty cell). |
| 4 | **"Dự kiến còn X ngày"** — optionally display `daysRemaining` alongside `runoutDate` as secondary text. When `null` → omit entirely. |
| 5 | Forecast values are **read-only derived display** — never allow the user to edit `daysRemaining` or `runoutDate` directly. Only `avg_daily_usage` is editable. |
