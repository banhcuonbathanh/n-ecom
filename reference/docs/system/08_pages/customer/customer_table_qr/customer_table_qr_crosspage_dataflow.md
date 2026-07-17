# Customer Table QR — Cross-Page Data Flow

> **TL;DR:** ✅ implemented · `/table/:tableId` is a **session-minting airlock**, not an
> order-data page. Its entire job is to exchange one 64-char QR token for a guest JWT + table
> binding, plant both into in-memory Zustand, and immediately hand off to `/menu`. Every customer
> page downstream depends on what this page leaves behind — and what it leaves behind is
> **100 % memory-only**: the guest token and the table binding both die on F5, tab close, or
> app restart. An F5 anywhere in the customer flow forces a QR re-scan.
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/table/[tableId]/page.tsx` · `fe/src/features/auth/auth.store.ts` ·
> `fe/src/store/cart.ts` · `fe/src/lib/api-client.ts` · `fe/src/lib/storage-keys.ts` ·
> `fe/src/app/(shop)/menu/page.tsx` · `fe/src/features/menu/components/TableConfirmModal.tsx` ·
> `fe/src/app/(shop)/checkout/page.tsx` · `fe/src/app/(shop)/order/[id]/page.tsx` ·
> `fe/src/app/(shop)/tracking/page.tsx` · `fe/src/hooks/useOrderSSE.ts` ·
> `be/pkg/jwt/jwt.go`.
>
> Siblings:
> page → [customer_table_qr.md](customer_table_qr.md) ·
> BE → [customer_table_qr_be.md](customer_table_qr_be.md) ·
> loading → [customer_table_qr_loading.md](customer_table_qr_loading.md) ·
> scenario → [SCENARIO_TABLE_SCAN.md](SCENARIO_TABLE_SCAN.md) ·
> bugs → [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md).

---

## 0. The Whole Picture on One Diagram

```
  ┌────────────────────────── ONE BROWSER TAB ──────────────────────────────────┐
  │                                                                              │
  │  /table/:tableId        ──── THE WRITE ──── BROWSER MEMORY HUB              │
  │  (airlock page)                             ┌──────────────────────────────┐ │
  │                                             │  useAuthStore (NO persist)   │ │
  │  page.tsx:18            POST /auth/guest    │  ├─ user: { id:'', role:     │ │
  │  ─────────────────────────────────────▶ BE  │  │   'customer', full_name:  │ │
  │                                        │    │  │   'Bàn <name>' }          │ │
  │  page.tsx:29-31  ◀── access_token + table ──┘  │  └─ accessToken: <jwt>    │ │
  │  setAuth(guestUser, access_token)           │  (memory-only; no persist)   │ │
  │  setTableId(table.id)                       ├──────────────────────────────┤ │
  │  setTableName(table.name)                   │  useCartStore (partialize)   │ │
  │                                             │  ├─ tableId   ← NOT persisted│ │
  │                          router.replace     │  ├─ tableName ← NOT persisted│ │
  │  page.tsx:32 ──────────────────────────────▶│  ├─ items[]  ← NOT persisted│ │
  │                '/menu'                      │  ├─ orderNote  ← persisted   │ │
  │                                             │  └─ activeOrderId ← persisted│ │
  │                                             └──────────────────────────────┘ │
  │                                                         │                    │
  │  DOWNSTREAM PAGES read the hub:                         │                    │
  │  ├─ /menu — reads tableId (confirms order) + token (POST /orders)            │
  │  ├─ /checkout — reads tableId + items + token (POST /orders)                 │
  │  ├─ /order/:id — reads token (GET /orders/:id, SSE events)                   │
  │  └─ /tracking — reads activeOrderId + token (GET /orders/:id, SSE)           │
  │                                                                              │
  │  ┌─── localStorage (survives F5) ────────────────────────────────────────┐  │
  │  │  cart-config-v3  →  { orderNote, activeOrderId }  (ONLY these two)   │  │
  │  │  order_cache_<id> →  last fetched Order snapshot  (set by /order/:id)│  │
  │  └───────────────────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────────────────────┘
                       ↕  THE WIRE
  ┌──────────────────────── SERVER HUB ─────────────────────────────────────────┐
  │  MySQL: tables row (validated by qr_token)                                  │
  │  MySQL: orders row (created LATER by POST /orders from /menu or /checkout)  │
  │  Redis pub/sub: SSE fan-out for order status / item progress (post-order)   │
  │  Guest JWT: stateless, 2 h, sub="guest", role="customer", table_id=<uuid>   │
  │  (No server-side session; no refresh token for guests.)                     │
  └──────────────────────────────────────────────────────────────────────────────┘
```

**LEGEND:** ▓ localStorage (survives F5) · ░ memory (dies on F5)

**There is no order-level server hub from this page.** The server hub for order events (SSE, DB
row) is created only when `POST /orders` fires from `/menu` or `/checkout` — not here. The
cross-page machinery for live order tracking is documented once, in
[../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md).

---

## 1. The Moment of Handoff — What This Page Leaves Behind

`page.tsx` runs a single `useEffect` (`page.tsx:16-44`) triggered by `params.tableId`. On a
successful `POST /auth/guest` response, three writes happen in sequence before `router.replace`:

```
  POST /auth/guest ──────────────────▶ BE (jwt.go:73-92: 2h guest JWT, sub="guest",
         │                                role="customer", table_id=<uuid>)
         │ ◀── { access_token, table: { id, name } }
         │
         ├─ ① setAuth(guestUser, access_token)   →  useAuthStore  ░ MEMORY ONLY
         │      auth.store.ts:12: bare create(), no persist middleware
         │
         ├─ ② setTableId(table.id)               →  useCartStore  ░ MEMORY ONLY
         │      cart.ts:91; partialize (cart.ts:153) excludes tableId
         │
         ├─ ③ setTableName(table.name)            →  useCartStore  ░ MEMORY ONLY
         │      cart.ts:92; partialize (cart.ts:153) excludes tableName
         │
         └─ router.replace('/menu')               (page.tsx:32)
```

| # | Write | Call site | Store | Persisted? | Who reads it downstream |
|---|---|---|---|---|---|
| ① | `setAuth(guestUser, access_token)` | `page.tsx:29` | `useAuthStore` (`auth.store.ts:13`) | **No** — plain `create()`, no `persist` (`auth.store.ts:12`) | `api-client.ts:12` injects token on every request; every downstream page with auth |
| ② | `setTableId(table.id)` | `page.tsx:30` | `useCartStore` (`cart.ts:91`) | **No** — excluded by `partialize` (`cart.ts:153`) | `/menu` checkout branch; `/checkout` source field |
| ③ | `setTableName(table.name)` | `page.tsx:31` | `useCartStore` (`cart.ts:92`) | **No** — excluded by `partialize` (`cart.ts:153`) | `TableConfirmModal` display; **lost on F5** |

**The guest JWT is the sole auth credential for all downstream pages.** The `api-client` request
interceptor reads it at call time (`api-client.ts:11-14`):

```js
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

The JWT carries `table_id` in its claims (`be/pkg/jwt/jwt.go:87`), so the BE always knows which
table an order belongs to even after the FE `tableId` Zustand field is gone. But `tableName`
("Bàn A1") is **FE-only, memory-only** — the BE has no `table_name` field in the JWT; after F5
the display name is gone and the guest must re-scan to restore it.

After the three store writes, `router.replace('/menu')` (`page.tsx:32`) discards the
`/table/:tableId` history entry so the browser back-button cannot return to the airlock.

**JWT detail** (handler → service → jwt.go trace) lives in
[customer_table_qr_be.md](customer_table_qr_be.md) — not restated here.

---

## 2. The Dead Branch — `TABLE_HAS_ACTIVE_ORDER` Redirect

`page.tsx:36-38` catches `TABLE_HAS_ACTIVE_ORDER` from `POST /auth/guest` and redirects to
`/order/:active_order_id`. **This branch is permanently dead:**

- `AuthService.GuestLogin` (`be/internal/service/auth_service.go:281-303`) only calls
  `GetTableByQRToken` + `GenerateGuestToken` — it performs **no active-order lookup** and can
  only return `ErrNotFound` (404) or a wrapped 500.
- `ErrTableHasActiveOrder` (`be/internal/service/errors.go:30`) is defined but **never returned
  anywhere in the BE** — confirmed by `grep -rn "ErrTableHasActiveOrder"`: only the definition
  line appears. The order-create service path (`order_service.go:262`) returns a `tableBusy bool`
  flag (informational) with a 201, not an error.

**Consequence for re-scan:** a guest who scans the QR of a table that already has an active
order gets a **fresh guest token** and lands on `/menu` — not routed to the existing order. They
will create an independent order. The BE explicitly allows multiple concurrent orders per table
(`order_service.go:256-275`); `tableBusy=true` is informational and never blocks creation.

See [TABLE_QR_BUGS.md Bug 1](TABLE_QR_BUGS.md) for root-cause analysis and fix options.

> ⚠️ **DRIFT:** `checkout/page.tsx:79` and `TableGrid.tsx:107` also handle `TABLE_HAS_ACTIVE_ORDER`,
> both written on the assumption the BE emits it. Those FE branches are dead for the same reason.

---

## 3. Downstream Surface 1 — `/menu`

**File:** `fe/src/app/(shop)/menu/page.tsx`

The menu page reads two things from the hub this page created:

**3a. `tableId` — determines order path at checkout**

`menu/page.tsx:36` `const { tableId, items } = useCartStore()`. At the checkout tap:
`tableId ? setConfirmOpen(true) : router.push('/checkout')`. When `tableId` is set (QR flow),
`TableConfirmModal` fires; when absent (online flow), the form-based `/checkout` page fires.

**3b. Guest JWT — authorises `POST /orders`**

Catalog fetches (`GET /categories`, `GET /products`, `GET /combos`) are **public** — no auth
header needed. The JWT is required only when `POST /orders` fires. `api-client.ts:11-14`
attaches `Authorization: Bearer <token>` automatically.

`TableConfirmModal` (`features/menu/components/TableConfirmModal.tsx:14, 19-26`) reads
`cart.tableId` and `cart.items`, passes both to `buildOrderItemsPayload` and posts to `/orders`
with `source: 'qr'`.

For the full order-create → SSE fan-out → downstream tracking story, see
[../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md).

---

## 4. Downstream Surface 2 — `/checkout`

**File:** `fe/src/app/(shop)/checkout/page.tsx`

`/checkout` is reached when `tableId` is **null** at checkout time (online order path). However,
if a guest navigates directly to `/checkout` while `tableId` is still set in the cart, the page
reads it and posts `table_id: cart.tableId ?? null` and
`source: cart.tableId ? 'qr' : 'online'` (`checkout/page.tsx:53-54`).

The `TABLE_HAS_ACTIVE_ORDER` handler on `checkout/page.tsx:79` catches that error code and
redirects to the existing order. This handler is **dead** for the same reason as §2: the BE
never emits that error code (the order-create path returns 201 with `table_busy: true` instead).

The guest JWT powers `api-client.ts`'s `Authorization` header for `POST /orders` and the
subsequent `GET /orders/:id` that seeds the order cache (`checkout/page.tsx:66-70`).

---

## 5. Downstream Surface 3 — `/order/:id`

**File:** `fe/src/app/(shop)/order/[id]/page.tsx`

`/order/:id` uses `useOrderSSE(params.id)` (`order/[id]/page.tsx:41`). That hook
(`hooks/useOrderSSE.ts:30`) reads `useAuthStore(state => state.accessToken)` and attaches it
as the `Authorization: Bearer` header for:
- the initial `GET /orders/:id` REST snapshot (`useOrderSSE.ts:55-57`), and
- the SSE stream `GET /orders/:id/events` (`useOrderSSE.ts:70`).

No `tableId` is needed on this page; the order UUID in the URL is the only routing key. The
order cache (`localStorage` key `order_cache_<id>`, `STORAGE_KEYS.ORDER_CACHE`,
`storage-keys.ts:4`) is seeded by `TableConfirmModal` or `/checkout` and read by
`useOrderSSE.ts:35-38` for instant first-paint before the SSE connects.

The page also calls `setTableId` + `setActiveOrderId` at the "Add more dishes" button
(`order/[id]/page.tsx:573`) — it re-sets `tableId` from the order's `table_id` field so the
guest can return to `/menu` in QR mode.

---

## 6. Downstream Surface 4 — `/tracking`

**File:** `fe/src/app/(shop)/tracking/page.tsx`

`/tracking` reads `useCartStore(s => s.activeOrderId)` (`tracking/page.tsx:18`). This value
is **persisted** (`partialize` includes `activeOrderId`, `cart.ts:153`) and therefore survives
a single F5 — but the guest JWT in `useAuthStore` does **not** survive. So after a reload:

- `activeOrderId` is present (from localStorage).
- `accessToken` is `null`.
- `GET /orders/:id` and the SSE stream both get 401.

The tracking page handles 401 from the SSE hook (`tracking/page.tsx:90-107`): it renders
"Phiên làm việc hết hạn — Vui lòng quét lại mã QR để tiếp tục." This is the user-visible
consequence of the memory-only guest session.

---

## 7. Multi-Device: Each Scan Gets Its Own Guest Session

The guest session (JWT + tableId) lives entirely in one browser tab. There is no server-side
session, no `BroadcastChannel`, and no cross-tab Zustand sync. A second device scanning the
same QR code gets a **separate fresh guest JWT** for the same `table_id`.

**Concurrent orders:** the BE explicitly **allows** multiple concurrent orders per table.
`order_service.go:256-275` (`CreateOrder`) checks for an existing active order only to set the
informational `tableBusy bool` flag — it **never blocks creation**. The handler returns
`201` with `{ "table_busy": true }` (`order_handler.go:121`), not an error. Each phone that
scans the QR creates its own independent order.

> `ErrTableHasActiveOrder` (`errors.go:30`) is defined but never returned anywhere in the BE
> — it would only matter if `GuestLogin` or `CreateOrder` emitted it, and neither does.

Live order state (status changes, item progress) is shared via SSE — any device holding a valid
JWT and the order UUID can subscribe to `GET /orders/:id/events`. The SSE fan-out is documented
in [../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md).

---

## 8. Reload (F5) Behavior Per Page

Because the guest JWT is memory-only (`auth.store.ts:12`) and `tableId`/`tableName` are
excluded from `partialize` (`cart.ts:153`), a hard reload at **any** customer page severs the
session. The only survivor in `cart-config-v3` is `{ orderNote, activeOrderId }`.

| Page | Survives F5 | Lost on F5 | User experience |
|---|---|---|---|
| `/table/:tableId` | — (this IS the session-mint step) | — | Spinner re-appears; QR token re-sent to BE; new JWT minted; redirects to `/menu`. No data loss because no downstream state exists yet. |
| `/menu` | ▓ `orderNote`, ▓ `activeOrderId` | ░ Guest JWT, ░ `tableId`, ░ `tableName`, ░ `items[]` | Cart empty; QR mode gone; catalog loads (GETs are public). Checkout tap goes to `/checkout` (online path), not `TableConfirmModal`. Effectively anonymous. |
| `/checkout` | ▓ `orderNote`, ▓ `activeOrderId` | ░ Guest JWT, ░ `tableId`, ░ `items[]` | `itemCount() === 0` guard redirects to `/menu` immediately (`checkout/page.tsx:37`). |
| `/order/:id` | ▓ `order_cache_<id>` snapshot | ░ Guest JWT | `useOrderSSE` reads cache for instant first-paint; REST + SSE both get 401; `api-client.ts:27-34` detects `sub=guest` → `clearAuth()` + `window.location.href = '/menu'`. Customer is kicked to `/menu`. |
| `/tracking` | ▓ `activeOrderId` | ░ Guest JWT | 401 → "Phiên làm việc hết hạn" screen (`tracking/page.tsx:90-107`). Directs user to re-scan QR. |

> **The single most important durability fact:** F5 at any point in the customer flow severs
> the session. This is by design — there is no "resume session" flow. The physical QR code on
> the table is always the entry point.

---

## 9. Durability Matrix — What Survives What

| Datum | Lives in | Survives F5? | Survives new device? | Lost when |
|---|---|---|---|---|
| `user`, `accessToken` (guest JWT) | ░ `useAuthStore` (memory, no persist) | ❌ | ❌ | F5, tab close, `clearAuth()` — `auth.store.ts:12` |
| `tableId`, `tableName` | ░ `useCartStore` (memory, not in `partialize`) | ❌ | ❌ | F5, tab close, `clearCart()` — `cart.ts:153` |
| `items[]`, `paymentMethod` | ░ `useCartStore` (memory, not in `partialize`) | ❌ | ❌ | F5, tab close, `clearCart()` — `cart.ts:153` |
| `orderNote`, `activeOrderId` | ▓ `localStorage` `cart-config-v3` (via `partialize`) | ✅ | ❌ (per-browser) | Manual clear, `clearCart()`, key version bump |
| `order_cache_<id>` snapshot | ▓ `localStorage` key `order_cache_<id>` | ✅ | ❌ (per-browser) | Manual clear, key change |
| `table_id` (in JWT claims) | ▓ Guest JWT payload (`be/pkg/jwt/jwt.go:87`) | ❌ (token is memory-only) | ❌ | Same as JWT above |
| BE `tables` row | MySQL (durable) | ✅ | ✅ | Owner delete |
| BE `orders` row | MySQL (durable, created at `POST /orders`) | ✅ | ✅ | Owner delete |
| Guest JWT validity | Stateless, 2h TTL (`jwt.go:84`) | n/a — only in memory | n/a | Expiry; F5 (token only in memory) |

**The mental model:** this page writes only to browser memory. The server hub for cross-page
order state (the `orders` DB row + Redis pub/sub + SSE) does not exist yet when this page runs —
it is created later by `POST /orders` from `/menu` or `/checkout`. See
[../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md)
for the full order-lifecycle cross-page story.

---

## 10. Source & Rule Map

| Fact | Source | Line(s) |
|---|---|---|
| `POST /auth/guest` call | `fe/src/app/table/[tableId]/page.tsx` | 18 |
| `setAuth(guestUser, access_token)` | `fe/src/app/table/[tableId]/page.tsx` | 29 |
| `setTableId(table.id)` | `fe/src/app/table/[tableId]/page.tsx` | 30 |
| `setTableName(table.name)` | `fe/src/app/table/[tableId]/page.tsx` | 31 |
| `router.replace('/menu')` | `fe/src/app/table/[tableId]/page.tsx` | 32 |
| Dead `TABLE_HAS_ACTIVE_ORDER` catch | `fe/src/app/table/[tableId]/page.tsx` | 36-38 |
| `useAuthStore` — bare `create()`, no `persist` | `fe/src/features/auth/auth.store.ts` | 12 |
| `setAuth` method | `fe/src/features/auth/auth.store.ts` | 15 |
| `setTableId` / `setTableName` actions | `fe/src/store/cart.ts` | 91-92 |
| `clearCart` also wipes `tableId`/`tableName` | `fe/src/store/cart.ts` | 89 |
| `partialize` — only `orderNote` + `activeOrderId` persisted | `fe/src/store/cart.ts` | 153 |
| localStorage key `cart-config-v3` | `fe/src/lib/storage-keys.ts` | 5 |
| localStorage key prefix `order_cache_` | `fe/src/lib/storage-keys.ts` | 4 |
| No guest-token key in STORAGE_KEYS | `fe/src/lib/storage-keys.ts` | 1-7 (entire file — no such key) |
| Token injected into every request | `fe/src/lib/api-client.ts` | 11-14 |
| Guest 401 → `clearAuth()` + redirect `/menu` | `fe/src/lib/api-client.ts` | 27-34 |
| `tableId` read on `/menu` checkout branch | `fe/src/app/(shop)/menu/page.tsx` | 36, 49 |
| `TableConfirmModal` reads `cart.tableId` + `cart.items` | `fe/src/features/menu/components/TableConfirmModal.tsx` | 14, 19-26 |
| `/checkout` reads `cart.tableId` for `source` field | `fe/src/app/(shop)/checkout/page.tsx` | 53-54 |
| `/checkout` `TABLE_HAS_ACTIVE_ORDER` handler (dead — same root cause as §2) | `fe/src/app/(shop)/checkout/page.tsx` | 79 |
| `useOrderSSE` reads `accessToken` for REST + SSE | `fe/src/hooks/useOrderSSE.ts` | 30, 55-57, 70 |
| SSE order cache: read on mount | `fe/src/hooks/useOrderSSE.ts` | 35-38 |
| `/tracking` reads `activeOrderId` (persisted) | `fe/src/app/(shop)/tracking/page.tsx` | 18 |
| `/tracking` 401 → "phiên hết hạn" screen | `fe/src/app/(shop)/tracking/page.tsx` | 90-107 |
| JWT `sub=guest`, `role=customer`, `table_id`, 2h expiry | `be/pkg/jwt/jwt.go` | 73-92 |
| `GenerateGuestToken` sets `table_id` in claims | `be/pkg/jwt/jwt.go` | 87 |
| `CreateOrder` — `tableBusy` is informational, never blocks | `be/internal/service/order_service.go` | 256-275 |
| Handler returns 201 with `table_busy` flag (not error) | `be/internal/handler/order_handler.go` | 106, 121 |
| `ErrTableHasActiveOrder` defined but never returned | `be/internal/service/errors.go` | 30 |
| Order-level cross-page flow (SSE, multi-device, order cache) | [../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md) | — |
| Dead-branch root cause + fix options | [TABLE_QR_BUGS.md Bug 1](TABLE_QR_BUGS.md) | — |
