# Customer Order Detail — Cross-Page Data Flow (`/order/:id`)

> **Status:** ✅ implemented. `/order/:id` is the **standalone live-order page** — it owns the URL
> id, runs a full REST + SSE pipeline on mount, and is the primary writer of `order_cache_<id>`
> during an active order session. Its writes outlive the page and are consumed by the `/order` list,
> the `/tracking` page, and every other device watching the same order through the server hub.
>
> Traced from source on branch `experience_claude.md_system_1`:
> [`fe/src/app/(shop)/order/[id]/page.tsx`](../../../../../fe/src/app/(shop)/order/[id]/page.tsx) ·
> [`fe/src/hooks/useOrderSSE.ts`](../../../../../fe/src/hooks/useOrderSSE.ts) ·
> [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) ·
> [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) ·
> [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts) ·
> [`be/internal/sse/handler.go`](../../../../../be/internal/sse/handler.go) ·
> [`be/internal/service/order_service.go`](../../../../../be/internal/service/order_service.go)
>
> BE endpoints + auth → [customer_order_detail_be.md](customer_order_detail_be.md) ·
> FE view + zones → [customer_order_detail.md](customer_order_detail.md) ·
> Loading states → [customer_order_detail_loading.md](customer_order_detail_loading.md) ·
> Narrative → [SCENARIO_ORDER_DETAIL.md](SCENARIO_ORDER_DETAIL.md) ·
> List-page twin (cache reader) → [../customer_order_list/customer_order_list_crosspage_dataflow.md](../customer_order_list/customer_order_list_crosspage_dataflow.md) ·
> Order object model → [../../../02_spec/object/OBJECT_MODEL_ORDER.md](../../../02_spec/object/OBJECT_MODEL_ORDER.md)

---

## 0. The whole picture on one diagram

```
   ┌────────────────────── ONE PHONE (the guest's browser/session) ─────────────────────────────┐
   │                                                                                              │
   │           ┌─────────────────────── in-browser hub ──────────────────────────┐               │
   │           │  order_cache_<id>   localStorage   "what is order X right now?" │               │
   │           │  activeOrderId      cart store     "which order is still live?"  │               │
   │           └─────────────────────────────────────────────────────────────────┘               │
   │                   ▲ read on mount (instant paint)                                           │
   │                   │ write on every SSE delta (via [order] effect)                           │
   │                                                                                              │
   │   /order/:id  ────────────────────────────────────────────────────────────┐                 │
   │   (this page)                                                              │                 │
   │     │  useOrderSSE(params.id)                                              │                 │
   │     │    ① read order_cache_<id> → instant paint     (useOrderSSE.ts:33-38) │                │
   │     │    ② GET /orders/:id       → setOrder(data)    (useOrderSSE.ts:55-57) │                │
   │     │    ③ SSE /orders/:id/events → delta patches    (useOrderSSE.ts:64-131)│                │
   │     │       each setOrder() → writes ▓ order_cache_<id>  (useOrderSSE.ts:41-46)             │
   │     │                                                                      │                 │
   │     │   "Thêm món" tap (order.table_id truthy, isActive true)             │                 │
   │     │     setTableId(order.table_id!)          ░ cart store (memory)       │                 │
   │     │     setActiveOrderId(params.id)          ▓ cart store (persisted)    │                 │
   │     │     router.push('/menu?add_to_order=:id')                            │                 │
   │     │                                                                      │                 │
   │     │   "Đặt thêm món" tap (order.table_id truthy, !isActive)             │                 │
   │     │     setTableId(order.table_id!)          ░ cart store (memory)       │                 │
   │     │     setActiveOrderId(null)               ▓ cart store (persisted)    │                 │
   │     │     router.push('/menu')                                             │                 │
   │     │                                                                      │                 │
   │     │   "Theo dõi bàn" tap (order.table_id truthy, isActive true)         │                 │
   │     │     setActiveOrderId(params.id)          ▓ cart store (persisted)    │                 │
   │     │     router.push('/tracking')                                         │                 │
   │     │                                                                      │                 │
   │     │   "Huỷ toàn bộ" tap → DELETE /orders/:id → onSuccess: router.push('/menu')           │
   │     │   "Huỷ món" tap     → DELETE /orders/items/:id                      │                 │
   │     │   Stepper change    → PATCH /orders/items/:id/quantity               │                 │
   │     └────────────────────────────────────────────────────────────────────┘                  │
   │                                                                                              │
   │   /order (list)        reads ALL order_cache_* on mount — scan, no network                  │
   │   /tracking            reads activeOrderId from cart store on mount                         │
   │   /menu                reads activeOrderId → AddToOrderBanner; tableId → knows table        │
   │                                                                                              │
   └──────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                               │
   ══════════════════ THE WIRE — the BE row is the only cross-device hub ═══════════════════════════
                                               │
                              ┌────────────────▼────────────────┐
                              │      one  orders  row            │  MySQL (durable)
                              │      order.id  ·  status         │
                              │      + order_items[]             │
                              └──┬──────────────────────────┬───┘
                                 │  Redis pub/sub            │
         guest phone ◀───────────┤  order:<id>              ├────────────────▶ staff / admin
         GET /orders/:id         │  orders:kds              │   GET /orders/:id
         SSE /orders/:id/events  │  orders:admin            │   KDS WS · admin WS
                                 └──────────────────────────┘
```

```
   LEGEND   ──▶ navigation / HTTP        ◀── SSE push (server → browser)
            ▓ localStorage (per-browser, survives F5)   ░ memory (dies on F5)
```

> **The key difference from the `/order` list:** unlike the list page (which never opens a network
> connection and only reads the cache), `/order/:id` **owns the URL id** and always runs a fresh
> `GET /orders/:id` + SSE pipeline on mount. It is the freshest customer-facing view of any order
> and the primary SSE-driven writer of `order_cache_<id>` during an active session.

---

## 1. The status lifecycle every page renders against

All pages share the same `OrderStatus` union
([`fe/src/types/order.ts:29-36`](../../../../../fe/src/types/order.ts)):

```
   POST /orders
        │      pending ──(staff confirm)──▶ confirmed ──(KDS start)──▶ preparing
        │         │                                                         │
        │         └──── cancelled ◀────────────────────── (staff/guest)    │
        │                                                                   ▼
        │                                                   ready ──(KDS done)──▶ delivered
        ▼                                                                         ▼
   item-level: (qty_served):  pending(0) ──▶ preparing(0<n<qty) ──▶ done(n≥qty)  paid
               deriveItemStatus() (types/order.ts:9-13) drives progress bars
```

`isActive` on this page:
[`page.tsx:232`](../../../../../fe/src/app/(shop)/order/[id]/page.tsx) →
`order.status !== 'delivered' && order.status !== 'cancelled'`

`canCancelOrder` (whole-order cancel button visibility):
[`page.tsx:233`](../../../../../fe/src/app/(shop)/order/[id]/page.tsx) →
`progress < 30 && (order.status === 'confirmed' || order.status === 'preparing')`

For the full per-status rendering table, see
[customer_order_detail.md](customer_order_detail.md) (Zones table) and
[ORDER_DETAIL_BUGS.md](ORDER_DETAIL_BUGS.md) (live-update gaps).

---

## 2. The moment of handoff — what this page leaves behind

This page writes two kinds of handoff on every SSE delta and on every outgoing navigation.

### 2a. Persistent cache write (`order_cache_<id>`)

`useOrderSSE` writes the full `Order` JSON to `localStorage` on every `setOrder()` call via the
`[order, orderId]` effect:

```typescript
// useOrderSSE.ts:41-46
useEffect(() => {
  if (!order) return
  try {
    localStorage.setItem(cacheKey(orderId), JSON.stringify(order))
  } catch {}
}, [order, orderId])
```

`cacheKey(id)` = `STORAGE_KEYS.ORDER_CACHE + id` = `"order_cache_" + id`
([`useOrderSSE.ts:9`](../../../../../fe/src/hooks/useOrderSSE.ts) ·
[`storage-keys.ts:3`](../../../../../fe/src/lib/storage-keys.ts)).

This write happens on:
- Seed from `GET /orders/:id` on mount ([`useOrderSSE.ts:55-57`](../../../../../fe/src/hooks/useOrderSSE.ts))
- Every SSE delta that calls `setOrder(...)` ([`useOrderSSE.ts:83-121`](../../../../../fe/src/hooks/useOrderSSE.ts))

The `/order` list page reads this exact key on its next mount via `loadCachedOrders()` — see
[`customer_order_list_crosspage_dataflow.md §3`](../customer_order_list/customer_order_list_crosspage_dataflow.md).

### 2b. Cart store writes (outgoing navigation)

All three navigation buttons on `/order/:id` write into the cart store before pushing the route
([`page.tsx:560-583`](../../../../../fe/src/app/(shop)/order/[id]/page.tsx)):

| Button | Condition | `setTableId` | `setActiveOrderId` | `router.push` |
|---|---|---|---|---|
| "Theo dõi bàn" | `order.table_id && isActive` | — | `params.id` ▓ | `/tracking` |
| "Thêm món" | `order.table_id` (always rendered) when `isActive` | `order.table_id!` ░ | `params.id` ▓ | `/menu?add_to_order=:id` |
| "Đặt thêm món" | `order.table_id` (always rendered) when `!isActive` | `order.table_id!` ░ | `null` ▓ | `/menu` |

`setTableId` is memory-only (not in `partialize`):
[`cart.ts:153`](../../../../../fe/src/store/cart.ts):
`(s) => ({ orderNote: s.orderNote, activeOrderId: s.activeOrderId })`.

`setActiveOrderId` is persisted under key `STORAGE_KEYS.CART_CONFIG = 'cart-config-v3'`
([`storage-keys.ts:5`](../../../../../fe/src/lib/storage-keys.ts) ·
[`cart.ts:128`](../../../../../fe/src/store/cart.ts)).

```
   STORE STATE WRITTEN BEFORE EACH NAVIGATION
   ──────────────────────────────────────────────────────────────────────────
   "Theo dõi bàn"  →  ▓ activeOrderId = params.id   (persisted)
   "Thêm món"      →  ▓ activeOrderId = params.id   (persisted)
                      ░ tableId       = order.table_id  (memory)
   "Đặt thêm món"  →  ▓ activeOrderId = null         (persisted)
                      ░ tableId       = order.table_id  (memory)
   ──────────────────────────────────────────────────────────────────────────
```

Note: the "Theo dõi bàn" path does **not** call `setTableId`. It only writes `activeOrderId` to
point `/tracking` at the right order. `tableId` in the cart is whatever was last written — if the
user came straight to `/order/:id` via URL and never visited `/menu`, `tableId` may be `null`.
`/tracking` does not need `tableId`; it only reads `activeOrderId`.

---

## 3. Downstream surface: `/tracking` (table queue monitor)

`/tracking` reads `activeOrderId` from the persisted cart store on mount. After the "Theo dõi bàn"
tap, `activeOrderId` is set to `params.id` ([`page.tsx:564`](../../../../../fe/src/app/(shop)/order/[id]/page.tsx)),
so `/tracking` immediately knows which order to show in the queue.

`/tracking` drives its own SSE connection (`useOrderMonitorSSE`) — it does **not** share the
`order:<id>` channel used by this page. Cross-device sync for `/tracking` goes through the server hub.

> `useOrderMonitorSSE` (unlike `useOrderSSE`) already handles both `item_updated` and
> `item_cancelled` event types — the gap described in [ORDER_DETAIL_BUGS.md](ORDER_DETAIL_BUGS.md)
> is specific to `useOrderSSE`.

---

## 4. Downstream surface: `/menu` (add-more-dishes re-entry)

When the guest taps "Thêm món" from this page, `/menu` mounts with:

- `activeOrderId` set → `AddToOrderBanner` appears, cart POSTs items onto the **same** order
- `tableId` set in memory → `TableConfirmModal` knows which table to bind the new order to
- URL carries `?add_to_order=:id` → the order id is in the query string as an explicit hint

The `/menu` page reads `STORAGE_KEYS.CART_CONFIG` (persisted store) for `activeOrderId` and the
in-memory cart store for `tableId`. If the user reloads `/menu` after the "Thêm món" tap:
- `activeOrderId` survives (persisted) → `AddToOrderBanner` still shown
- `tableId` is lost (memory) → table may need to be re-selected
- `items` are lost (memory) → cart is empty, user must re-add dishes

---

## 5. Downstream surface: `/order` list (the cache reader)

The `/order` list page reads `order_cache_<id>` on mount (no network). Because `/order/:id` writes
the cache on every SSE delta, any card for this order on the list page will show the most recently
SSE-written status — but **only if the list page mounts or re-mounts after this page wrote the cache**.

The list page's `loadCachedOrders()` runs once in `useEffect([], [])`:
`order/page.tsx:10-24` (see sibling doc
[`customer_order_list_crosspage_dataflow.md §3`](../customer_order_list/customer_order_list_crosspage_dataflow.md)).
It does not re-scan on focus or interval. After `/order/:id` updates the cache via SSE, the list
card is stale until the list page is re-mounted (navigated away and back, or F5).

---

## 6. SSE event table — what `useOrderSSE` handles and what it misses

The SSE channel `order:<id>` is subscribed in
[`be/internal/sse/handler.go:42`](../../../../../be/internal/sse/handler.go).
The `extractEventType` function parses the `type` field of each Redis payload
([`be/internal/sse/group_handler.go:87-95`](../../../../../be/internal/sse/group_handler.go)).

Events published by `order_service.go` to `order:<id>` and their FE handling:

| BE publishes | At line | FE case in `useOrderSSE` | Cross-page effect |
|---|---|---|---|
| `new_order` | `order_service.go:348` | — (no case) | ❓ UNVERIFIED whether this reaches the per-order channel at all vs. only `orders:admin` |
| `items_added` | `order_service.go:516` | — (no case) | ❓ UNVERIFIED — items_added arrives when another device adds to the same order; unhandled means no live update |
| `order_status_changed` | `order_service.go:552, 745` | ✅ handled `useOrderSSE.ts:87-95` | patches `status`; triggers `confirmed`/`ready`/`cancelled` notification modal; ▓ cache written |
| `order_cancelled` | `order_service.go:593` | ✅ handled `useOrderSSE.ts:98-103` | patches `status: 'cancelled'`; triggers notification; `stopped=true`; SSE loop ends; ▓ cache written |
| `item_cancelled` | `order_service.go:642` | ❌ **not handled** | item row stays on screen; cache NOT updated; see [ORDER_DETAIL_BUGS.md Bug 2](ORDER_DETAIL_BUGS.md) |
| `item_updated` | `order_service.go:696` | ❌ **not handled** | quantity change invisible live; dead `invalidateQueries` at `page.tsx:59`; see [ORDER_DETAIL_BUGS.md Bug 1](ORDER_DETAIL_BUGS.md) |
| `order_completed` | `order_service.go` (via `order_status_changed` when status=`delivered`) | ✅ handled `useOrderSSE.ts:118-122` | patches `status: 'delivered'`; `stopped=true`; SSE loop ends; ▓ cache written |
| `item_progress` | `order_service.go:1000` (via `publishItemEvent`) | ✅ handled `useOrderSSE.ts:104-116` | patches `qty_served` on matching item; progress bar advances; ▓ cache written |

> Note: `order_init` case at `useOrderSSE.ts:84-85` handles data seeded by the SSE server on
> connect (`handler.go:50`) but the server only sends a `connected` event, not `order_init`. The
> `order_init` case may be dead code — the REST snapshot at `useOrderSSE.ts:55-57` seeds state
> instead. ❓ UNVERIFIED: whether any publisher calls `publishOrderEvent(ctx, "order_init", ...)`.

Also published to `orders:kds` (kitchen board) on every `publishOrderEvent` call:
[`order_service.go:818`](../../../../../be/internal/service/order_service.go). This is the
separate KDS channel; `/order/:id` does not subscribe to it.

---

## 7. Cancel flows — initiators, mutations, and fan-out

Three mutations on this page cancel parts of an order
([`page.tsx:63-77`](../../../../../fe/src/app/(shop)/order/[id]/page.tsx)):

| Mutation | API call | `onSuccess` | Cross-page effect |
|---|---|---|---|
| `cancelOrderMutation` | `DELETE /orders/:id` | `toast.success` + `router.push('/menu')` | BE publishes `order_cancelled` → SSE streams on all devices watching this order; ▓ cache not explicitly updated (SSE handles it if event arrives before nav); admin sees order drop from live floor |
| `cancelItemMutation` | `DELETE /orders/items/:id` | `toast.success` + `setCancelTarget(null)` | BE publishes `item_cancelled` → **unhandled** in `useOrderSSE`; item row stays on screen; ▓ cache not updated |
| `cancelMultiMutation` | `Promise.all(DELETE /orders/items/:id[])` | `toast.success` + `setCancelTarget(null)` | Same gap as above — each delete publishes `item_cancelled`, all unhandled |

**Whole-order cancel — full cross-page fan-out:**

```
   GUEST (on /order/:id)                BE / Redis              Other screens
   ─────────────────────                ──────────              ─────────────
   "Huỷ toàn bộ đơn hàng"
     (canCancelOrder = progress<30
      && status∈{confirmed,preparing}
      — page.tsx:233)
         │
         ▼ DELETE /orders/:id ─────────▶ status=cancelled        order_cancelled published to:
         │  onSuccess:                   RecalculateTotalAmount   → order:<id>  (this page & overlay)
         │    toast.success              publishOrderEvent         → orders:kds  (kitchen board)
         │    router.push('/menu')   ◀──                          → admin floor removes order
         │                                                         (admin re-fetches via own SSE)
         ▼
   this page unmounts → ▓ order_cache_<id> has last SSE-written status
   /menu mounts with activeOrderId=null (not reset here — clearCart not called)
```

> Note: `cancelOrderMutation.onSuccess` at
> [`page.tsx:65`](../../../../../fe/src/app/(shop)/order/[id]/page.tsx) calls
> `router.push('/menu')` — it does **not** call `clearCart()` or `setActiveOrderId(null)`.
> If `activeOrderId` was set before navigating to this page (e.g. from a "Theo dõi bàn" flow),
> it remains in the persisted store after a cancel. `/menu` would then show `AddToOrderBanner`
> for a cancelled order. ❓ UNVERIFIED: whether `/menu` guards against an already-cancelled
> `activeOrderId` or simply lets the next POST fail with an error.

---

## 8. Multi-device sync — one tap, N screens move

The server hub (`order:<id>` Redis pub/sub channel) is the only mechanism that synchronises multiple
devices watching the same order. No browser state is shared.

```
   Device A (guest's phone — /order/:id)       Device B (2nd tab or another phone)
   ──────────────────────────────────────       ────────────────────────────────────
   SSE open: order:<id>                         SSE open: order:<id>
             │                                            │
   Staff taps KDS "mark item served"                      │
             │                                            │
             ▼ item_progress event                        ▼ item_progress event
   qty_served++ → progress bar                  qty_served++ → progress bar
   ▓ order_cache_<id> updated                   ▓ order_cache_<id> updated (its own LS)
```

**What does NOT propagate live to a second device:**
- Quantity edits (stepper) → `item_updated` event unhandled in both devices' `useOrderSSE` ([ORDER_DETAIL_BUGS.md Bug 1](ORDER_DETAIL_BUGS.md))
- Item cancels → `item_cancelled` event unhandled in both devices' `useOrderSSE` ([ORDER_DETAIL_BUGS.md Bug 2](ORDER_DETAIL_BUGS.md))

In both cases, Device B's view of the order is only corrected when it reloads (which triggers a
fresh `GET /orders/:id` seed at `useOrderSSE.ts:55-57`).

---

## 9. Reload (F5) behavior per page

| Page | Has URL id? | Source of truth on reload | Outcome |
|---|---|---|---|
| `/order/:id` (this page) | ✅ YES — id in route params | ① ▓ `order_cache_<id>` read instantly (stale paint); ② `GET /orders/:id` corrects within ~50ms; ③ SSE reconnects | Full recovery; stale data visible for ~50ms then replaced |
| `/order` (list) | ❌ no | ▓ all `order_cache_*` keys scanned on mount; no network | Cards show last SSE-written status from any previous overlay or `/order/:id` visit |
| `/tracking` | ❌ no | ▓ `activeOrderId` from persisted cart store | Reconnects if `activeOrderId` set; empty state if null |
| `/menu` | ❌ no | ▓ `activeOrderId` (persisted) + cart items ░ (wiped) | `AddToOrderBanner` shows if `activeOrderId` set; cart is empty |
| admin floor | ❌ no | REST GET — no localStorage | Re-fetches own copy; no dependency on customer-side cache |

> **`/order/:id` F5 advantage over the list:** the URL id means the hook always knows which order
> to fetch, regardless of whether a cache entry exists. On the list page, cards exist only if a
> previous visit wrote `order_cache_<id>` — orders opened by URL but never listed won't appear
> on the list page until they create a cache entry.

---

## 10. Durability matrix — what survives what

| Datum | Lives in | Survives F5? | Survives new device/browser? | Who reads it next |
|---|---|---|---|---|
| `order_cache_<id>` (full Order JSON) | ▓ `localStorage` | ✅ | ❌ per-browser | `/order` list · `useOrderSSE` seed on mount |
| `activeOrderId` | ▓ cart store (`partialize`) under `CART_CONFIG` key | ✅ | ❌ per-browser | `/tracking` · `/menu` AddToOrderBanner |
| `tableId` | ░ cart store (memory only) | ❌ | ❌ | `/menu` table binding |
| `items`, `tableName`, `orderNote` | ░ cart store (memory) or ▓ (`orderNote` only) | `orderNote` ✅ only | ❌ | `/menu` / `/checkout` pre-POST |
| order id | URL param (`/order/:id`) + `?add_to_order=:id` | ✅ (shareable link) | ✅ (anyone with the URL) | `useOrderSSE` · any page that reads the URL |
| SSE connection state | ░ React ref (`abortRef`) | ❌ | ❌ | — (re-established on every mount) |
| **the orders row** | **BE — MySQL (durable) + Redis (pub/sub cache)** | ✅ | ✅ | **every page, every device** |

---

## 11. End-to-end timeline (all pages + devices)

```
 Guest         /order/:id            in-browser hub      /order list      /tracking        BE / Redis
  │            (this page)           (▓ cache + store)   (no network)     (SSE monitor)
  │                 │                      │                  │                │                │
  │ arrives at URL  │                      │                  │                │                │
  │                 │ read ▓ cache ─────────────────────────────────────────────────            │
  │                 │ instant paint (stale)│                  │                │                │
  │                 │ GET /orders/:id ─────────────────────────────────────────────────────────▶│
  │                 │◀── data.data ──────────────────────────────────────────────────────────── │
  │                 │ setOrder(data.data) ─▶ ▓ cache written  │                │                │
  │                 │ open SSE ─────────────────────────────────────────────────────────────────▶│
  │                 │◀── connected ─────────────────────────────────────────────────────────────│
  │                 │                      │                  │                │                │
  │ (staff taps KDS)│                      │                  │                │                │
  │                 │◀── item_progress ─────────────────────────────────────────────────────────│ publish order:<id>
  │                 │ qty_served++         │                  │                │                │
  │                 │ ▓ cache updated      │  (stale cards)   │                │                │
  │                 │                      │                  │                │                │
  │ (staff confirms)│                      │                  │                │                │
  │                 │◀── order_status_changed (confirmed) ────────────────────────────────────── publish order:<id>
  │                 │ status='confirmed'   │                  │                │                │
  │                 │ notification modal   │                  │                │                │
  │                 │ ▓ cache updated      │                  │                │                │
  │                 │                      │                  │                │                │
  │ tap "Theo dõi bàn"                     │                  │                │                │
  │                 │ setActiveOrderId(id) ▶ ▓ cart updated   │                │                │
  │                 │ router.push('/tracking')                 │                │                │
  │                 │                      │                  │   mounts       │                │
  │                 │                      │                  │   reads ▓ activeOrderId         │
  │                 │                      │                  │   SSE monitor opens ────────────▶│
  │                 │                      │                  │                │                │
  │ (later: browse /order list)            │                  │                │                │
  │                 │                      │ loadCachedOrders()                │                │
  │                 │                      ├─────────────────▶│ scans ▓ keys   │                │
  │                 │                      │                  │ card shows last cached status    │
```

---

## 12. Source & rule map

| Topic | Source of truth |
|---|---|
| FE view + zones + interactions | [customer_order_detail.md](customer_order_detail.md) |
| BE endpoints, auth, caching, errors, flags | [customer_order_detail_be.md](customer_order_detail_be.md) |
| Loading states (skeleton, SSE banner, isNotFound) | [customer_order_detail_loading.md](customer_order_detail_loading.md) |
| Narrative scenario | [SCENARIO_ORDER_DETAIL.md](SCENARIO_ORDER_DETAIL.md) |
| Known FE live-update bugs | [ORDER_DETAIL_BUGS.md](ORDER_DETAIL_BUGS.md) |
| List-page twin (cache reader, overlay model) | [../customer_order_list/customer_order_list_crosspage_dataflow.md](../customer_order_list/customer_order_list_crosspage_dataflow.md) |
| `Order` / `OrderItem` / `OrderStatus` types | [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts) |
| Cart store (fields, persist, `partialize`) | [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) |
| localStorage key constants | [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) |
| SSE hook (cache read/write + event handling) | [`fe/src/hooks/useOrderSSE.ts`](../../../../../fe/src/hooks/useOrderSSE.ts) |
| Page component (mutations + nav buttons) | [`fe/src/app/(shop)/order/[id]/page.tsx`](../../../../../fe/src/app/(shop)/order/[id]/page.tsx) |
| BE SSE fan-out (Redis subscribe loop) | [`be/internal/sse/handler.go`](../../../../../be/internal/sse/handler.go) |
| BE publish (per-order + KDS channels) | [`be/internal/service/order_service.go`](../../../../../be/internal/service/order_service.go) |
| Business logic — cancel rules | [`docs/system/07_business_logic/LOGIC_INDEX.md`](../../../07_business_logic/LOGIC_INDEX.md) |
| Order object model (field home) | [../../../02_spec/object/OBJECT_MODEL_ORDER.md](../../../02_spec/object/OBJECT_MODEL_ORDER.md) |
