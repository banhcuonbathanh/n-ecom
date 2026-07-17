# FLOW 02 — Client QR Flow

> No login required at any step. Guest JWT authorizes all API calls transparently.

---

## Diagram

```
/table/:qr_token
    │
    ├─ TABLE_HAS_ACTIVE_ORDER → /order/<active_id>   (skip menu)
    │
    └─ OK →
        │
        /menu   (browse products + combos)
            │
            Cart has items → "Thanh toán" button appears
            │
            ├─ cartStore.tableId PRESENT → TableConfirmModal popup
            │       │  note field only — NO name/phone
            │       └─ confirm →
            │
            └─ no tableId (walk-in) → /checkout page
                    │
                    POST /orders { source:"qr"|"walkin", items, table_id }
                        │
                        ├─ TABLE_HAS_ACTIVE_ORDER → redirect /order/<id>
                        │
                        └─ OK →
                            GET /orders/:id → cache to localStorage[order_cache_<id>]
                            cartStore.clearCart()
                            window.location.replace('/order/<id>')
                                │
                                /order/:id   (real-time via SSE, no login)
                                    │  useOrderSSE hook
                                    │  item-by-item status
                                    │  can cancel items (< 30% rule)
                                    │  can add more → /menu?add_to_order=<id>
                                    │
                                /order       (list — reads localStorage cache, no API)
                                    │
                                /tracking    (live map via SSE, reads activeOrderId from cartStore)
```

---

## Step-by-Step Rules

### Step 1 — QR Entry
- Handled by `FLOW_01_ENTRY_POINTS.md`

### Step 2 — Menu
- Page: `fe/src/app/(shop)/menu/page.tsx`
- No login required — guest JWT authorizes via axios interceptor
- Browse products and combos, add to cart (Zustand + cart persist)
- Header "Đơn hàng" button → `/order`

### Step 3 — Checkout (QR path — TableConfirmModal)
- Triggered by "Thanh toán" when `cartStore.tableId` is present
- `TableConfirmModal` shows: item list, total, optional note
- **NO name or phone input** — staff handles customer identity
- Submits:
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
  - Fetch full order via `GET /orders/<id>` → cache to `localStorage[order_cache_<id>]`
  - `cartStore.clearCart()` — clears items, tableId, tableName, activeOrderId
  - `window.location.replace('/order/<id>')`
- On `TABLE_HAS_ACTIVE_ORDER` → redirect to `/order/<active_id>`

### Step 4 — Order Detail (`/order/:id`)
- No login required — guest JWT in memory is enough
- Uses `useOrderSSE(orderId)` for real-time updates via SSE
- Client can view item-by-item status
- Cancel items/order subject to [FLOW_07_CANCEL.md](FLOW_07_CANCEL.md)
- Add more items → `/menu?add_to_order=<id>`

### Step 5 — Order List (`/order`)
- No login required — reads from `localStorage` keys prefixed `order_cache_`
- Shows all past orders with status, progress, item preview
- Tap an order → `OrderDetailSheet` with full detail

### Step 6 — Tracking (`/tracking`)
- No login required
- Reads `activeOrderId` from `cartStore` (persisted in `STORAGE_KEYS.CART_CONFIG`)
- Uses `useOrderMonitorSSE` for live updates
- Shows table map, service queue, order status

---

## State & Storage

| Data | Where Stored | Why |
|---|---|---|
| Guest JWT | Zustand auth store (memory only) | Security — never localStorage |
| tableId + tableName | Zustand cart store (NOT persisted) | Cleared on clearCart |
| activeOrderId | Zustand cart store **persisted** via `STORAGE_KEYS.CART_CONFIG` | Survives page refresh for tracking |
| Order cache | `localStorage[STORAGE_KEYS.ORDER_CACHE + id]` | Powers /order list without login |
| drinkConfig + orderNote | `localStorage[STORAGE_KEYS.CART_CONFIG]` | Survives page refresh |

---

## Backend Endpoints

| Step | Method | Endpoint | Notes |
|---|---|---|---|
| QR auth | POST | `/api/v1/auth/guest` | Returns guest JWT + table info |
| Load menu | GET | `/api/v1/products` | Public, no auth |
| Load combos | GET | `/api/v1/combos` | Public, no auth |
| Submit order | POST | `/api/v1/orders` | Requires guest JWT, source="qr" |
| Order detail | GET | `/api/v1/orders/:id` | Requires guest JWT |
| Order SSE | GET | `/api/v1/orders/:id/stream` | Requires guest JWT |
| Monitor SSE | GET | `/api/v1/orders/monitor/stream` | Requires guest JWT |

---

## Invariants — Never Break

1. No login prompt — customer never sees a login page
2. No name/phone input on QR path — `TableConfirmModal` has note only
3. Guest JWT is memory-only — never write to localStorage or cookie
4. Order list works offline — reads localStorage cache, no API call
5. `clearCart()` resets tableId — gone until next QR scan
6. One active order per table — `TABLE_HAS_ACTIVE_ORDER` redirects, never generic error
7. `activeOrderId` persists across page reloads — `/tracking` survives refresh

---

## Key Files

| File | Role |
|---|---|
| `fe/src/app/table/[tableId]/page.tsx` | QR entry |
| `fe/src/app/(shop)/menu/page.tsx` | Menu + TableConfirmModal + order submit |
| `fe/src/app/(shop)/order/[id]/page.tsx` | Order detail with SSE |
| `fe/src/app/(shop)/order/page.tsx` | Order list from localStorage cache |
| `fe/src/app/(shop)/tracking/page.tsx` | Live tracking page |
| `fe/src/store/cart.ts` | tableId, activeOrderId, items |
| `fe/src/lib/storage-keys.ts` | All localStorage key constants |
| `fe/src/hooks/useOrderSSE.ts` | SSE hook for order detail |
| `fe/src/hooks/useOrderMonitorSSE.ts` | SSE hook for tracking page |
| `fe/src/lib/api-client.ts` | Axios with guest JWT interceptor |

---

## Related Flows

- [FLOW_01_ENTRY_POINTS.md](FLOW_01_ENTRY_POINTS.md) — QR auth step detail
- [FLOW_07_CANCEL.md](FLOW_07_CANCEL.md) — cancel rules for customer
- [FLOW_10_FLOW_INTERSECTION.md](FLOW_10_FLOW_INTERSECTION.md) — where this flow meets staff flow
