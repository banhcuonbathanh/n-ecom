# CLIENT QR FLOW — Single Source of Truth

> **MANDATORY:** Any code that touches the client QR → menu → order → tracking flow MUST reference this file and preserve every rule below. Do NOT change this flow without updating this doc first and getting owner approval.

---

## Flow Overview

```
QR Scan → /table/:qr_token
    ↓
POST /auth/guest { qr_token }
    ↓
Guest JWT (memory only) + tableId set in cart store
    ↓
Redirect → /menu
    ↓
Browse products / combos → add to cart
    ↓
"Thanh toán" button (bottom bar, appears when cart has items)
    ↓  [tableId present]          [no tableId — walk-in]
TableConfirmModal            →    /checkout page
(no name/phone required)
    ↓
POST /orders → order created
    ↓
Cache order in localStorage (order_cache_<id>)
    ↓
Redirect → /order/<id>     ← order detail (no login required)
    ↓
/order                     ← order list  (reads localStorage cache)
    ↓
/tracking                  ← live tracking via SSE (needs activeOrderId in cart store)
```

---

## Step-by-Step Rules (DO NOT CHANGE)

### Step 1 — QR Entry Point
- URL pattern: `/table/:qr_token` — handled by `fe/src/app/table/[tableId]/page.tsx`
- Calls: `POST /api/v1/auth/guest` with `{ qr_token }`
- On success: receives `{ access_token, table: { id, name } }`
  - Store `access_token` in **Zustand memory ONLY** — NEVER localStorage
  - Store `table.id` → `cartStore.tableId`
  - Store `table.name` → `cartStore.tableName`
  - Redirect to `/menu`
- On error `TABLE_HAS_ACTIVE_ORDER`: redirect to `/order/<active_order_id>` or `/menu`
- On other error: show inline error, no redirect

### Step 2 — Menu
- Page: `fe/src/app/(shop)/menu/page.tsx`
- No login required — guest JWT authorizes API calls via axios interceptor
- Client browses products and combos, adds to cart (Zustand + cart persist)
- Header shows "Đơn hàng" button → navigates to `/order`

### Step 3 — Checkout (QR path — TableConfirmModal)
- Triggered by "Thanh toán" button when `cartStore.tableId` is present
- Shows `TableConfirmModal` — popup with: item list, total, optional note field
- **NO name or phone input** — staff handles customer identity
- Submits: `POST /api/v1/orders` with:
  ```json
  {
    "customer_name": "",
    "customer_phone": "",
    "note": "<optional>",
    "table_id": "<from cartStore.tableId>",
    "source": "qr",
    "items": [...]
  }
  ```
- On success:
  - Fetch full order from `GET /orders/<id>` and cache to `localStorage[order_cache_<id>]`
  - Call `cartStore.clearCart()` (clears items + tableId + tableName + activeOrderId)
  - `window.location.replace('/order/<id>')`
- On error `TABLE_HAS_ACTIVE_ORDER`: redirect to `/order/<active_order_id>` or `/order`

### Step 4 — Order Detail (`/order/:id`)
- Page: `fe/src/app/(shop)/order/[id]/page.tsx`
- **No login required** — guest JWT in memory is enough; order data also cached in localStorage
- Uses `useOrderSSE(orderId)` for real-time updates via SSE
- Client can view item-by-item status, cancel items/order (subject to business rules)
- Can add more items → navigates to `/menu?add_to_order=<id>`

### Step 5 — Order List (`/order`)
- Page: `fe/src/app/(shop)/order/page.tsx`
- **No login required** — reads from `localStorage` keys prefixed `order_cache_`
- Shows all past orders with status, progress, item preview
- Tapping an order → opens `OrderDetailSheet` with full order detail

### Step 6 — Tracking (`/tracking`)
- Page: `fe/src/app/(shop)/tracking/page.tsx`
- **No login required**
- Reads `activeOrderId` from `cartStore` (persisted in `STORAGE_KEYS.CART_CONFIG`)
- Uses `useOrderMonitorSSE` for live updates
- Shows table map, service queue, order status

---

## State & Storage Rules

| Data | Where Stored | Why |
|---|---|---|
| Guest JWT (access_token) | Zustand memory (auth store) | Security — never localStorage |
| tableId + tableName | Zustand cart store (NOT persisted) | Cleared on clearCart |
| activeOrderId | Zustand cart store **persisted** via `STORAGE_KEYS.CART_CONFIG` | Survives page refresh for tracking |
| Order cache | `localStorage[STORAGE_KEYS.ORDER_CACHE + id]` | Powers /order list without login |
| drinkConfig + orderNote | `localStorage[STORAGE_KEYS.CART_CONFIG]` | Survives page refresh |

**All localStorage keys MUST come from `src/lib/storage-keys.ts`.** Never hardcode strings.

---

## Key Files — Must Read Before Touching This Flow

| File | Role |
|---|---|
| `fe/src/app/table/[tableId]/page.tsx` | QR entry: calls /auth/guest, sets auth + table |
| `fe/src/app/(shop)/menu/page.tsx` | Menu + TableConfirmModal + order submit |
| `fe/src/app/(shop)/order/[id]/page.tsx` | Order detail with SSE |
| `fe/src/app/(shop)/order/page.tsx` | Order list from localStorage cache |
| `fe/src/app/(shop)/tracking/page.tsx` | Live tracking page |
| `fe/src/store/cart.ts` | Cart state: tableId, activeOrderId, items |
| `fe/src/lib/storage-keys.ts` | ALL localStorage key constants |
| `fe/src/hooks/useOrderSSE.ts` | SSE hook for order detail |
| `fe/src/hooks/useOrderMonitorSSE.ts` | SSE hook for tracking page |
| `fe/src/lib/api-client.ts` | Axios instance with guest JWT interceptor |
| `docs/core/MASTER_v1.2.md §6.4` | Guest JWT spec and rules |
| `docs/core/MASTER_v1.2.md §4.5` | One active order per table rule |

---

## Invariants — Never Break These

1. **No login prompt** — the client never sees a login page during the QR flow.
2. **No name/phone input** on QR path — `TableConfirmModal` only has note (optional).
3. **Guest JWT is memory-only** — never write it to localStorage or a cookie.
4. **Order list works offline** — it reads localStorage cache, no API call needed.
5. **`clearCart()` resets tableId** — after order submit, tableId is gone until next QR scan.
6. **One active order per table** — `TABLE_HAS_ACTIVE_ORDER` error redirects to that order, never shows a generic error.
7. **`activeOrderId` persists** across page reloads (stored in `CART_CONFIG` key) so `/tracking` survives a refresh.

---

## Backend Endpoints Used in This Flow

| Step | Method | Endpoint | Notes |
|---|---|---|---|
| QR auth | POST | `/api/v1/auth/guest` | Body: `{ qr_token }`. Returns guest JWT + table info |
| Load menu | GET | `/api/v1/products` | Public, no auth needed |
| Load combos | GET | `/api/v1/combos` | Public, no auth needed |
| Submit order | POST | `/api/v1/orders` | Requires guest JWT. source="qr" |
| Order detail | GET | `/api/v1/orders/:id` | Requires guest JWT |
| Order SSE | GET | `/api/v1/orders/:id/stream` | Requires guest JWT |
| Monitor SSE | GET | `/api/v1/orders/monitor/stream` | Requires guest JWT |
