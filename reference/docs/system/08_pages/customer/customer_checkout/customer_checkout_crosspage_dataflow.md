# Customer Checkout — Cross-Page Data Flow (the order, after `/checkout` submits it)

> **What this is:** the **cross-page** companion to the BE anchor
> [customer_checkout_be.md](customer_checkout_be.md).
> That file traced the two endpoints (`POST /orders` + `GET /orders/:id`) from handler to SQL.
> This file answers the next question: **once `/checkout` POSTs the order and navigates away, how is
> that order's data shared across the pages and devices that outlive the form — the order detail
> page, the order list, the admin floor, and the KDS?**
>
> The core insight: `/checkout` is **strictly a write page**. It leaves behind exactly two durable
> artifacts — **the BE order row** (MySQL-persisted, the shared hub for all devices) and
> **`order_cache_<id>`** in localStorage (the in-browser fast-path). Every other page reads one or
> both of these; `/checkout` itself is gone the moment `router.replace` fires.
>
> Status: **✅ implemented** (dine-in / `source:'qr'` path). The **`source:'online'`** branch is
> **🔮 PLANNED** — Bug 3 in [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md) blocks it.
>
> Traced from source on branch `experience_claude.md_system_1`:
> [`fe/src/app/(shop)/checkout/page.tsx`](../../../../../fe/src/app/(shop)/checkout/page.tsx) ·
> [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) ·
> [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) ·
> [`fe/src/lib/order-payload.ts`](../../../../../fe/src/lib/order-payload.ts) ·
> [`fe/src/hooks/useOrderSSE.ts`](../../../../../fe/src/hooks/useOrderSSE.ts) ·
> [`fe/src/hooks/useOrderMonitorSSE.ts`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts) ·
> [`fe/src/app/(shop)/order/[id]/page.tsx`](../../../../../fe/src/app/(shop)/order/%5Bid%5D/page.tsx) ·
> [`fe/src/app/(shop)/order/page.tsx`](../../../../../fe/src/app/(shop)/order/page.tsx) ·
> [`fe/src/features/order/components/OrderDetailSheet.tsx`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx) ·
> [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts)
>
> Siblings:
> [customer_checkout.md](customer_checkout.md) ·
> [customer_checkout_be.md](customer_checkout_be.md) ·
> [customer_checkout_loading.md](customer_checkout_loading.md) ·
> [SCENARIO_CHECKOUT_ORDER.md](SCENARIO_CHECKOUT_ORDER.md) ·
> [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md)
>
> *Note: there is no `customer_checkout_crosscomponent_dataflow.md` — the page has only one
> interactive widget (the checkout form) and no shared-store coordination between widgets; N/A.*

---

## 0. The whole picture on one diagram

```
   ┌────────────────────────── ONE PHONE (the guest's browser/session) ─────────────────────────┐
   │                                                                                             │
   │                  ┌────────────────── in-browser hub ──────────────────┐                    │
   │                  │  order_cache_<id>  localStorage   "what is order X?" │                   │
   │                  │  activeOrderId     cart store     "which am I following?"                │
   │                  │                                    NOTE: /checkout clears this to null   │
   │                  │  <id>              the URL         "shareable / reloadable"              │
   │                  └──────────────────────────────────────────────────────┘                  │
   │                     ▲ write(onSuccess)                                                      │
   │                     │                                                                       │
   │   /checkout ─POST──┘                                                                        │
   │     │  cart.clearCart()      (items/tableId/tableName/activeOrderId/paymentMethod → gone)   │
   │     │  order_cache_<id>=JSON (tries GET /orders/:id first; falls back to minimal body)      │
   │     │  router.replace ──▶  /order/<id>     ──▶  /order (list, bottom nav)                  │
   │     │                       detail + SSE                                                    │
   │     │                       └── "Thêm món" ──▶ /menu?add_to_order=<id>                     │
   │     │                       └── "Theo dõi bàn" ──▶ /tracking (monitor SSE)                 │
   │     │                                                                                       │
   └─────────────────────────────────┬─────────────────────────────────────────────────────────┘
                                      │
   ═══════════════════ THE WIRE — the BE is the real hub ═══════════════════════════════════════
                                      │
                         ┌────────────▼────────────┐
                         │   one  order  row        │   MySQL (durable) + Redis (pub/sub)
                         │   order.id  ·  status    │
                         └──┬───────────────────┬───┘
         customer side       │                  │       staff / admin side
   ◀── GET /orders/:id ──────┤                  ├──── new_order ping ──▶ /sse/admin
   ◀── SSE /orders/:id/events┤                  ├──── orders WS ───────▶ item_progress · status
   ◀── SSE /sse/order-monitor/:id               └──── GET /orders/:id ─▶ ['orders','live'] cache
        (queue · ETA · floor)                        (admin shares NO browser state w/ customer)
```

```
   LEGEND   ──▶ navigation / HTTP        ◀── SSE/WS push (server → browser)
            ▓ localStorage (per-browser, survives F5)   ░ memory (dies on F5)
```

**Key difference from `/menu`'s QR path:** `/checkout` does **not** call `setActiveOrderId` after
success — `clearCart()` wipes `activeOrderId` to `null`
([`cart.ts:89`](../../../../../fe/src/store/cart.ts#L89)). This means `/tracking` (which reads
`activeOrderId`) shows "no order" after a checkout navigation, until the guest explicitly taps
"Theo dõi bàn" from `/order/<id>`.

---

## 1. The status lifecycle every page renders against

All downstream pages render the same `OrderStatus` enum
([`order.ts:29-36`](../../../../../fe/src/types/order.ts)):

```
                     (staff confirm)     (KDS start)     (all items served)   (staff bill)
   POST /orders             │                │                  │                  │
        │       pending ─────────▶ confirmed ──▶ preparing ──────▶ ready ───────────▶ delivered
        │          │                                                                      │
        │          └────────────────────── cancelled ◀── (staff/guest cancel)             ▼
        │                                                                                paid
        ▼                                                                          (after payment)
   item-level (per OrderItem.qty_served):  pending(0) ──▶ preparing(0<n<qty) ──▶ done(n≥qty)
                                           └─ deriveItemStatus() drives progress bars ──┘
                                              ([order.ts:9-13])
```

| Status | Set by | Customer sees on `/order/<id>` | In admin `['orders','live']`? |
|---|---|---|---|
| `pending` | `POST /orders` | "chờ xác nhận" badge | ✅ active |
| `confirmed` | staff | modal "Nhà hàng đã nhận đơn!" + ETA | ✅ active |
| `preparing` | KDS | progress bar fills | ✅ active |
| `ready` | KDS | modal "Đến lượt bàn của bạn!" | ✅ active |
| `delivered` | staff | completed banner; SSE stops | ✅ (then dropped) |
| `cancelled` | staff or guest | "đã bị huỷ" modal; SSE stops | ❌ filtered out |
| `paid` | cashier | history only | ❌ filtered out |

> The SSE loop in `useOrderSSE` stops on `order_cancelled` or `order_completed`
> ([`useOrderSSE.ts:100-102`](../../../../../fe/src/hooks/useOrderSSE.ts#L100),
> [`useOrderSSE.ts:118-121`](../../../../../fe/src/hooks/useOrderSSE.ts#L118)).

---

## 2. The moment of handoff — what `/checkout` leaves behind

This is the seam. On `201` from `POST /orders`, `onSuccess` at
[`checkout/page.tsx:61-76`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L61) performs
exactly these operations before navigating:

```
   POST /orders ───────────▶ 201 { id, table_busy }
        │
        │   ① try GET /orders/:id ──▶ fullOrder   (best-effort — may 403 on online path, Bug 3)
        │     fallback → use minimal { id, table_busy } body from the 201
        │   ② localStorage["order_cache_<id>"] = JSON(fullOrder or minimal)   ▓ survives F5
        │      ([checkout/page.tsx:68-71])
        │   ③ cart.clearCart()                                                 ░ wipes everything
        │      ([checkout/page.tsx:73]  →  [cart.ts:89])
        ▼
   router.replace('/order/<id>')        (replace, not push → back-button skips /checkout)
   ([checkout/page.tsx:75])
```

**What the store looks like the instant before navigation:**

```
   ┌─────────────────────────────────────────────────────────────────────┐
   │ ▓ localStorage["order_cache_<id>"] = {                               │
   │       id, order_number:"#A12", status:"pending",                     │
   │       source:"online"|"qr", table_id:null|"<uuid>",                  │
   │       customer_name, customer_phone, total_amount, items:[ … ] }     │
   │                                                                       │
   │ ░ cart store (ALL cleared):                                           │
   │       items=[]  tableId=null  tableName=null                          │
   │       activeOrderId=null   paymentMethod=null   orderNote=''          │
   │                                                                       │
   │ ▓ cart store (persisted, CART_CONFIG key — "cart-config-v3"):        │
   │       { orderNote:'', activeOrderId:null }   ← both reset            │
   │       ([cart.ts:153] — partialize keeps only orderNote + activeOrderId)│
   └─────────────────────────────────────────────────────────────────────┘
```

| # | Write | Where it lands | Who reads it next | Source |
|---|---|---|---|---|
| ① | `GET /orders/:id` (best-effort) | HTTP response → consumed by ② | prefills cache with full order | [`checkout/page.tsx:66-67`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L66) |
| ② | `order_cache_<id> = JSON(order)` | ▓ localStorage | `/order/<id>` (instant paint) · `/order` list (history) | [`checkout/page.tsx:68`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L68) |
| ③ | `clearCart()` | ░ cart store (all fields) | nothing — intentional destruction | [`checkout/page.tsx:73`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L73) |

> **Why `router.replace`, not `router.push`?** The back-button from `/order/<id>` would re-surface
> the checkout form with an empty cart, which would immediately redirect to `/menu` (empty-cart
> guard, [`checkout/page.tsx:37`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L37)). Using
> `replace` removes `/checkout` from history entirely.

> **Critical difference from `/menu`'s `TableConfirmModal`:** the modal sets `setActiveOrderId(id)`
> after the order is created, so `/tracking` immediately knows which order to follow.
> **`/checkout` does not** — `clearCart()` resets `activeOrderId` to `null`. The guest must tap
> "Theo dõi bàn" on `/order/<id>` to set the pointer explicitly.

---

## 3. `order_cache_<id>` — the in-browser order record (a self-refreshing cache)

`STORAGE_KEYS.ORDER_CACHE = "order_cache_"` ([`storage-keys.ts:3`](../../../../../fe/src/lib/storage-keys.ts));
the full key is the prefix plus the order id. Written in **two** places from the checkout path and
read in **two** downstream pages:

```
   WRITERS (from /checkout path)         READERS
   ─────────────────────────────         ────────────────────────────────────────
   /checkout onSuccess ─────────────┐    ┌── /order/<id>   seed on mount (useOrderSSE)
   useOrderSSE  (every SSE delta) ──┼──▶ ▓ │
                                    │  order_   └── /order (list)  scan ALL keys (no network!)
                                    └─ cache_<id>
```

**The self-refresh loop:** `useOrderSSE` does not just read the cache on mount — it writes the
updated order back on every state change
([`useOrderSSE.ts:41-46`](../../../../../fe/src/hooks/useOrderSSE.ts#L41)):

```
   /order/<id> mounts
      │  ① read order_cache_<id>  ──▶ setState  ──▶ INSTANT paint (no spinner for first frame)
      │  ② GET /orders/:id        ──▶ setState  ──▶ writes back ──▶ ▓ cache refreshed
      │  ③ SSE delta arrives      ──▶ setState  ──▶ writes back ──▶ ▓ cache refreshed
      ▼
   order_cache_<id> is now FRESHER than when /checkout wrote it
```

The `/order` **list** page makes **no network call at all**
([`order/page.tsx:10-24`](../../../../../fe/src/app/(shop)/order/page.tsx#L10)) — it reads all
`order_cache_*` localStorage keys, parses them, and sorts newest-first:

```
   ▓ order_cache_<A>  status:preparing  3/5 served  ┐
   ▓ order_cache_<B>  status:delivered  5/5 served  ┼─ loadCachedOrders() scans, parses, sorts ──▶
   ▓ order_cache_<C>  status:pending    0/4 served  ┘     "Đơn hàng của bạn"  (newest first)
        │
        └─ "Xoá lịch sử" removes ALL order_cache_* keys ([order/page.tsx:41-51])
```

> The cached object is the full `Order` shape
> ([`order.ts:38-52`](../../../../../fe/src/types/order.ts)): `id · order_number · status · source ·
> table_id · table_name · customer_name · customer_phone · total_amount · note · created_at ·
> items[]`. The list filters combo headers (`combo_id && !combo_ref_id`) before computing served
> counts and derives progress from `Σ qty_served / Σ quantity`
> ([`order/page.tsx:91-94`](../../../../../fe/src/app/(shop)/order/page.tsx#L91)).

---

## 4. `/order/<id>` — the order detail / live page (C10, primary downstream surface)

The order id travels **in the URL** (`router.replace('/order/<id>')`), so this page is fully
shareable and reloadable without any store. It is driven by `useOrderSSE(params.id)`
([`order/[id]/page.tsx:41`](../../../../../fe/src/app/(shop)/order/%5Bid%5D/page.tsx#L41)) in
three phases:

```
   t0  mount          t1  ~0ms (sync)        t2  REST returns         t3+  live
   ──────────         ─────────────────       ────────────────         ─────────────────────
   read ▓ cache  ──▶  INSTANT paint      ──▶  GET /orders/:id    ──▶  SSE /orders/:id/events
   (may be stale)     (no spinner if hit)     authoritative snap       deltas patch state
        │                                          │                         │
        │                                     404 ─┴─▶ "không tìm thấy"     ├─ order_status_changed
        │                                                                    ├─ item_progress (qty_served)
        │                                                                    ├─ order_cancelled → STOP
        └──────────── all three write back to ▓ cache ────────────────────  └─ order_completed → STOP
```

> **SSE channel does not send an initial snapshot** — only Redis pub/sub relays. The REST fetch at
> t2 is mandatory to seed state before listening for deltas
> ([`useOrderSSE.ts:51-57`](../../../../../fe/src/hooks/useOrderSSE.ts#L51)).
> Reconnect: exponential backoff, max 5 attempts, banner shown after 3
> ([`useOrderSSE.ts:16-21`](../../../../../fe/src/hooks/useOrderSSE.ts#L16)).

**⚠️ Online path (Bug 3):** For a `source:'online'` order (`table_id = NULL`) with a guest token,
`GET /orders/:id` at t2 returns **403** — the BE ownership guard matches on `claims.TableID` and
there is no table to match ([`order_service.go:116-120`](../../../../../be/internal/service/order_service.go#L116)).
The error is swallowed by `useOrderSSE` (non-404 → continue), but the page never gets an
authoritative snapshot. See [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md) Bug 3.

**This page is the fork point** back into the rest of the customer flow:

| Button | Condition shown | Action | Cross-page effect | Source |
|---|---|---|---|---|
| **Theo dõi bàn** | `isActive && order.table_id` | `setActiveOrderId(params.id); push('/tracking')` | promotes this order to the tracked one | [`order/[id]/page.tsx:563-569`](../../../../../fe/src/app/(shop)/order/%5Bid%5D/page.tsx#L563) |
| **Thêm món** | `order.table_id && isActive` | `setTableId(table_id); setActiveOrderId(id); push('/menu?add_to_order=<id>')` | re-enters menu in append mode | [`order/[id]/page.tsx:572-576`](../../../../../fe/src/app/(shop)/order/%5Bid%5D/page.tsx#L572) |
| **Đặt thêm món** | `order.table_id && !isActive` | `setTableId(table_id); setActiveOrderId(null); push('/menu')` | re-enters menu for a new order | [`order/[id]/page.tsx:572-576`](../../../../../fe/src/app/(shop)/order/%5Bid%5D/page.tsx#L572) |
| **Huỷ toàn bộ đơn** | `canCancelOrder` (progress<30 && status∈{confirmed,preparing}) | `DELETE /orders/:id` → `push('/menu')` | order → cancelled; fan-out over SSE | [`order/[id]/page.tsx:63-66`](../../../../../fe/src/app/(shop)/order/%5Bid%5D/page.tsx#L63) |

> **`?add_to_order=<id>` closes the loop.** On `/menu`, the add-to-order mode intercepts the cart's
> POST to target the existing order id instead of creating a new one. The order id flows:
> `/checkout` → `/order/<id>` → back to `/menu` via the URL param.

---

## 5. `/order` — the order list (C9, no network calls, reads cache only)

The list page at `/order` makes **zero network calls**. It reads all `order_cache_*` keys from
localStorage on mount and sorts newest-first
([`order/page.tsx:10-24`](../../../../../fe/src/app/(shop)/order/page.tsx#L10)):

```
   useEffect(() => setOrders(loadCachedOrders()), [])
        │
        └─ scans localStorage for keys starting with "order_cache_"
           parses each entry as Order, sorts by created_at descending
```

Tapping a card opens `OrderDetailSheet` with the selected `orderId`
([`order/page.tsx:151-156`](../../../../../fe/src/app/(shop)/order/page.tsx#L151)).
`OrderDetailSheet` uses the same `useOrderSSE` hook as `/order/<id>` — it reads from cache,
re-fetches via REST, then opens the SSE channel
([`OrderDetailSheet.tsx:45`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx#L45)).

The sheet has a "Thêm món" button that navigates to `/menu`, but it is **gated on
`order.table_id`** ([`OrderDetailSheet.tsx:403`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx#L403)).
There is no "Theo dõi bàn" button in the sheet — that lives only on `/order/<id>`.

| Datum | Source | Freshness |
|---|---|---|
| Order list cards on page load | `order_cache_*` localStorage scan | As fresh as last time `/order/<id>` or `/checkout` wrote the cache |
| Order status / items in detail sheet | `useOrderSSE` → cache + REST + SSE | Live — same update loop as full detail page |

---

## 6. `/tracking` — live monitoring (reads `activeOrderId`, NOT set by `/checkout`)

`/tracking` is reached from the bottom nav with **no id in its path**. It reads `activeOrderId`
from the persisted cart store. Because `/checkout` calls `clearCart()` — which resets
`activeOrderId` to `null` ([`cart.ts:89`](../../../../../fe/src/store/cart.ts#L89)) — the tracking
page shows the **empty state** immediately after a checkout navigation, until the guest taps
"Theo dõi bàn" on `/order/<id>`.

Once `activeOrderId` is set, `/tracking` opens a **second, different SSE channel**:

```
   ┌──────────────────────────────────────┬──────────────────────────────────────────┐
   │  /order/<id>          useOrderSSE      │  /tracking      useOrderMonitorSSE        │
   ├──────────────────────────────────────┼──────────────────────────────────────────┤
   │  channel: /orders/:id/events          │  channel: /sse/order-monitor/:id          │
   │  scope:   THIS order's lifecycle      │  scope:   this order + the whole floor    │
   │  id from: URL param                   │  id from: activeOrderId (persisted store) │
   │  events:  order_status_changed        │  data.type: 'order.status'               │
   │           item_progress               │             'queue.update' (position/ETA) │
   │           order_cancelled / _completed│             'tables.status' (floor)       │
   │                                       │             'items_added' / 'item_updated' │
   │  seeds:   ▓ cache + REST              │              / 'item_cancelled' → refetch  │
   │  on 401:  retries (up to 5)           │  on 401/403: PERMANENT stop — no retry    │
   └──────────────────────────────────────┴──────────────────────────────────────────┘
```

Sources: [`useOrderSSE.ts:63-122`](../../../../../fe/src/hooks/useOrderSSE.ts#L63) ·
[`useOrderMonitorSSE.ts:42-89`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts#L42).

A `401`/`403` on the monitor channel is treated as permanent — the retry loop stops and
`isUnauthorized = true` is set; the guest must re-scan the QR code to get a fresh token
([`useOrderMonitorSSE.ts:53-58`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts#L53)).

---

## 7. Admin / staff — the server is the only shared hub

The admin floor and KDS share **no browser state** with the customer. No `order_cache_<id>`, no
`activeOrderId`, no cart — those live only in the guest's phone. The admin learns about the order
purely from the BE row, keyed by the same `order.id`:

```
   ┌──── guest phone ────┐         ┌──── BE (the hub) ────┐         ┌──── admin device ────┐
   │  POST /orders ──────┼────────▶│   order row created  │         │                      │
   │  (from /checkout)   │         │   (status:pending)   │──ping──▶│ /sse/admin           │
   │                     │         │                      │         │   new_order {id,...} │
   │                     │         │                      │◀────────┤ GET /orders/:id      │
   │                     │         │                      │         │   → ['orders','live']│
   │  ◀── SSE patches ───┼─────────│        │             │──WS────▶│ orders WS:           │
   │     /orders/:id/…   │         │        ▼             │         │   item_progress      │
   │                     │         │  staff taps KDS ─────┼────────▶│   order_status_change│
   └─────────────────────┘         └──────────────────────┘         └──────────────────────┘
```

The admin event pipeline on order creation (`order_service.go:348-350`):
1. `new_order` published to Redis → `/sse/admin` pushes a lightweight ping to admin browser
2. Admin calls `GET /orders/:id`, inserts into `['orders','live']` TanStack cache (only if ACTIVE)
3. Subsequent mutations fan out via orders WS: `item_progress` / `order_status_changed`

> **No Redis read-cache** on either checkout endpoint — both `POST /orders` and `GET /orders/:id`
> hit MySQL directly. Redis is pub/sub fan-out only. Source:
> [customer_checkout_be.md § Caching & Invalidation](customer_checkout_be.md#caching--invalidation).

---

## 8. Multi-device sync — one staff tap, all screens move

A single staff action fans out to all surfaces with no browser-to-browser path — always
`device → BE → (Redis) → device`:

```
   STAFF taps "served +1" on item X (order A)
        │
        ▼
   PATCH /orders/A/items/X ──▶ BE: order_items.qty_served++ ──▶ Redis publish
        │                                                          │
        │          ┌────────────────────────────────────────────────────────┐
        ▼          ▼                                     ▼                   ▼
   ADMIN floor  CUSTOMER /order/<id>              CUSTOMER /tracking   (other guests'
   orders WS:   SSE item_progress                 SSE items_* ──▶      /tracking floor
   ['orders',   → setOrder(qty_served++)           refetch              queue.update)
   'live'] patch → ▓ order_cache_A written back    GET /orders/A
   progress bar  → progress bar moves              OrderDetailCard
   moves                                           moves
```

---

## 9. Cancellation / reverse flows

### 9a. Customer cancels their own order (from `/order/<id>`)

```
   GUEST on /order/<id>
        │  canCancelOrder = progress < 30 && status ∈ {confirmed, preparing}
        │  ([order/[id]/page.tsx:233])
        ▼
   confirm modal → cancelOrderMutation
        │  DELETE /orders/:id ─────────────────────────▶ status=cancelled
        │                                                │── order_cancelled ──▶ admin floor:
        │◀── success → toast "Đã huỷ đơn hàng"           │   (Redis publish)       drop from live
        │    router.push('/menu')                        │                          → CancelLog
        ▼
   ([order/[id]/page.tsx:64-65])
```

The customer who cancels is redirected to `/menu` immediately and never sees the "đã bị huỷ"
modal — that modal is for cancels that arrive **while they are watching** (9b).

⚠️ **DRIFT (owner decision 2026-06-12):** The target cancel rule is *"customer can cancel any time
until payment completes"*, but the code still gates on `progress < 30 && {confirmed, preparing}`
([`order/[id]/page.tsx:233`](../../../../../fe/src/app/(shop)/order/%5Bid%5D/page.tsx#L233)).
See `docs/system/07_business_logic/LOGIC_FE.md §5 DRIFT` / `LOGIC_BE.md §3`.

### 9b. Admin cancels — the customer finds out over SSE

```
   ADMIN floor                      BE / Redis              CUSTOMER (passively watching)
   ───────────                      ──────────              ─────────────────────────────
   PATCH /orders/:id/status ───────▶ status=cancelled
   { status: "cancelled" }          │── order_cancelled ──▶ /order/<id> useOrderSSE:
        │ optimistic update          │   (Redis publish)      • setOrder(status=cancelled)
        │ → drop from ['orders',     │                        • notification{kind:'cancelled'}
        │   'live'] (not ACTIVE)     │                        • SSE loop STOPS
        │ → CancelLog / Zone F       │                        • ▓ order_cache_<id> written
        │                            │── (order.status) ─────▶ /tracking useOrderMonitorSSE:
        │                            │                          • setOrderStatus('cancelled')
        ▼                            │
   live floor no longer shows it     │           MODAL: "Đơn hàng đã bị huỷ —
                                     │            Nhà hàng đã huỷ đơn của bạn."
                                     │            ([order/[id]/page.tsx:617-626])
```

### 9c. Where a cancel lands on every surface

| Surface | Channel | Effect of cancel |
|---|---|---|
| `/order/<id>` (initiator) | mutation success | toast + `router.push('/menu')` |
| `/order/<id>` (watcher) | SSE `order_cancelled` | "đã bị huỷ" modal; SSE stops; ▓ cache updated |
| `/tracking` | SSE `data.type:'order.status'` | `orderStatus` → `cancelled` |
| `/order` (list) | ▓ cache (next visit) | card shows `cancelled` badge; no progress bar |
| Admin floor | WS `order_status_changed` | dropped from `['orders','live']` → CancelLog |

---

## 10. End-to-end timeline — the order across all pages and devices

```
 Guest     /checkout       in-browser hub        /order/<id>   /tracking       BE / Redis     Admin
  │        (form)          (▓ cache, store)       (useOrderSSE) (monitorSSE)                   floor
  │            │                  │                   │             │             │              │
  ├ submit ──▶ POST /orders ───────────────────────────────────────────────────▶ create row     │
  │            │                  │                   │             │        201 │── new_order─▶│
  │            │  try GET /orders/:id ──────────────────────────────────────────▶ read row      │
  │            │  ① order_cache_<id>=JSON ──────────────────────────────────────┤ ▓ written     │
  │            │  ③ clearCart() (activeOrderId=null)  │             │             │◀GET→live cache│
  │            │  router.replace ──────────────────▶ mount          │             │              │
  │            │                  │  read ▓ cache ─▶ instant paint  │             │              │
  │            │                  │  GET /orders/:id ───────────────────────────▶ snapshot      │
  │            │                  │  open SSE /orders/:id/events ◀─────────────── (idle)         │
  │            │                  │                   │             │             │              │
  │ (staff confirm)────────────────────────────────────────────────────────────▶ status=confirmed│
  │            │                  │  order_status_changed ◀────────────────────── publish ─────▶│ WS
  │            │                  │◀── ▓ cache written back          │             │              │
  │            │                  │  modal "Nhà hàng đã nhận đơn!"   │             │              │
  │            │                  │                   │             │             │              │
  ├ "Theo dõi bàn" ───────────────│  setActiveOrderId(id) ──────────────────────────────────────│
  │            │                  │  router.push('/tracking') ──────────────────▶ mount          │
  │            │                  │        useOrderMonitorSSE        │             │              │
  │            │                  │        open /sse/order-monitor/:id ◀─────────── queue.update │
  │            │                  │                   │  position 2 · ~3 min       │              │
  │ (staff served+1)───────────────────────────────────────────────────────────▶ qty_served++   │
  │            │                  │  item_progress ◀──┤             │             │── publish ──▶│
  │            │                  │◀── ▓ cache updated │  bars move  │ items_* ──▶│              │
  │            │                  │                   │             │ refetch card│              │
  │ (staff delivered)──────────────────────────────────────────────────────────▶ status=delivered│
  │            │                  │  order_completed ─▶ SSE STOPS   │             │ dropped live │
  ▼  later: /order (list) reads ALL ▓ order_cache_* → shows history, no network call.
```

---

## 11. Reload (F5) behavior per page

| Page | Has URL id? | Source of truth on reload | Result |
|---|---|---|---|
| `/checkout` | no | cart items (░ memory) | empty cart → `useEffect` redirects to `/menu` ([`checkout/page.tsx:37`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L37)) |
| `/order/<id>` | YES | ▓ `order_cache_<id>` → REST → SSE | full recovery; id in URL |
| `/order` (list) | no | ▓ all `order_cache_*` keys | full history recovers |
| `/tracking` | no | ▓ `activeOrderId` (persisted) | recovers only if "Theo dõi bàn" was tapped after checkout; otherwise empty state |
| Admin floor | no | REST GET (no localStorage) | re-fetches from BE |

> **The checkout-specific gotcha:** after a checkout navigation, `activeOrderId` is `null` (cleared
> by `clearCart()`). If the guest reloads `/tracking` before tapping "Theo dõi bàn", they see the
> empty state even though `/order/<id>` recovers fine from the URL.

---

## 12. Durability matrix

| Datum | Lives in | Survives F5? | Survives new device? | Scope |
|---|---|---|---|---|
| `items`, `tableId`, `tableName`, `paymentMethod` | ░ cart store (memory, not in `partialize`) | ❌ | ❌ | `/menu` / `/checkout` only, pre-POST |
| `orderNote` | ▓ cart store (persisted) | ✅ ([`cart.ts:153`](../../../../../fe/src/store/cart.ts#L153)) | ❌ | `/menu` / `/checkout` form default |
| `activeOrderId` | ▓ cart store (persisted) | ✅ | ❌ | `/tracking` pointer — **null after `/checkout`** until guest taps "Theo dõi bàn" |
| `order_cache_<id>` | ▓ localStorage | ✅ | ❌ (per-browser) | `/order/<id>` instant paint + `/order` list |
| order id | the URL | ✅ | ✅ (shareable) | `/order/<id>`, `?add_to_order=` |
| **the order row** | **BE (MySQL + Redis)** | ✅ | ✅ | **every page, every device** |

> **Mental model in one line:** `/checkout` is a write-only gate — it creates the BE row, primes the
> localStorage cache, wipes the cart, and steps aside. From that moment, the BE order row is the
> single source of truth; every downstream page (customer detail, order list, admin floor) keeps its
> own copy fresh from its own channel — they agree because they all descend from that one row.

---

## 13. Source & rule map

| Topic | Source of truth |
|---|---|
| BE endpoint traces (POST /orders, GET /orders/:id) | [customer_checkout_be.md](customer_checkout_be.md) |
| Known code bugs (payment radio, TABLE_HAS_ACTIVE_ORDER, 403 online path) | [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md) |
| Page zones / wireframe | [customer_checkout.md](customer_checkout.md) |
| FE loading states | [customer_checkout_loading.md](customer_checkout_loading.md) |
| Checkout scenario narrative | [SCENARIO_CHECKOUT_ORDER.md](SCENARIO_CHECKOUT_ORDER.md) |
| QR / menu path cross-page flow (twin of this doc) | [../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md) |
| `Order` / `OrderItem` / `OrderStatus` / `deriveItemStatus` types | [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts) |
| Cart store (fields, persist, `partialize`, `clearCart`) | [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) |
| localStorage key constants (`ORDER_CACHE`, `CART_CONFIG`) | [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) |
| Order items payload builder | [`fe/src/lib/order-payload.ts`](../../../../../fe/src/lib/order-payload.ts) |
| Customer order SSE (detail + self-refresh cache loop) | [`fe/src/hooks/useOrderSSE.ts`](../../../../../fe/src/hooks/useOrderSSE.ts) |
| Customer monitor SSE (queue / floor, permanent-auth-failure path) | [`fe/src/hooks/useOrderMonitorSSE.ts`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts) |
| Cancel rule + DRIFT (cancel-anytime vs current progress-gate) | `docs/system/07_business_logic/LOGIC_FE.md §5` · `LOGIC_BE.md §3` |
| Realtime config (channels, reconnect policy) | `docs/core/MASTER_v1.2.md §5` |
| Object model: Order fields, DTO/DB mapping | `docs/system/08_pages/02_spec/object/OBJECT_MODEL_ORDER.md` |
