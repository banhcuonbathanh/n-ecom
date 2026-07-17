# Customer Order List — Cross-Page Data Flow (the `order_cache_*` hub)

> **What this is:** the **cross-page** companion to
> [customer_order_list.md](customer_order_list.md). That file answers *"what does the `/order` list
> page look like and what does it render?"* — this one answers the follow-on question: **how is the
> order data that the list reads shared across the pages that wrote it (`/menu`, `/checkout`) and the
> pages that will read it again (`OrderDetailSheet` overlay, `/order/:id`, `/tracking`, admin
> floor)?**
>
> Status: ✅ implemented. The in-browser hub (`order_cache_<id>` localStorage prefix + `activeOrderId`
> persisted in the cart store) is the mechanism that ties every customer page together. The server
> hub (one BE `orders` row + Redis `order:<id>` pub/sub) is the mechanism that ties all devices.
>
> Traced from source on branch `experience_claude.md_system_1`:
> [`fe/src/app/(shop)/order/page.tsx`](../../../../../fe/src/app/(shop)/order/page.tsx) ·
> [`fe/src/features/order/components/OrderDetailSheet.tsx`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx) ·
> [`fe/src/hooks/useOrderSSE.ts`](../../../../../fe/src/hooks/useOrderSSE.ts) ·
> [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) ·
> [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) ·
> [`fe/src/features/menu/components/TableConfirmModal.tsx`](../../../../../fe/src/features/menu/components/TableConfirmModal.tsx) ·
> [`fe/src/app/(shop)/checkout/page.tsx`](../../../../../fe/src/app/(shop)/checkout/page.tsx) ·
> [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts).
>
> BE endpoints + auth + SSE channel → [customer_order_list_be.md](customer_order_list_be.md) ·
> FE view + zones → [customer_order_list.md](customer_order_list.md) ·
> Loading states → [customer_order_list_loading.md](customer_order_list_loading.md) ·
> Narrative → [SCENARIO_ORDER_HISTORY.md](SCENARIO_ORDER_HISTORY.md) ·
> Standalone twin detail page → [../customer_order_detail/customer_order_detail.md](../customer_order_detail/customer_order_detail.md)

---

## 0. The whole picture on one diagram

```
   ┌────────────────────────── ONE PHONE (the guest's browser/session) ───────────────────────────┐
   │                                                                                               │
   │                ┌─────────────────── in-browser hub ─────────────────────┐                    │
   │                │  order_cache_<id>   localStorage   "what is order X?"   │                    │
   │                │  activeOrderId      cart store     "which to re-order?" │                    │
   │                └─────────────────────────────────────────────────────────┘                    │
   │                    ▲ write (POST 201)           ▲ read (all keys)                             │
   │                    │  + immediate GET           │                                             │
   │   /menu ──POST─────┘                            │                                             │
   │     │  TableConfirmModal:                  /order (this list)                                 │
   │     │   ① localStorage["order_cache_<id>"] = JSON   ─────────────────▶ loadCachedOrders()    │
   │     │   ② clearCart() wipes items/tableId           ──▶ NO network call — pure cache read     │
   │     │   router.replace("/order/<id>")               ──▶ tap card → OrderDetailSheet overlay  │
   │     │                                                                        │                │
   │   /checkout ─POST──────────────────────────────────────────────────────┐    │                │
   │     │  same ①② pattern                                                 │    │                │
   │     │  router.replace("/order/<id>")                                   ┘    │                │
   │     │                                                               opens sheet w/ orderId    │
   │     │                                                                        │                │
   │     │                                    ┌── GET /orders/:id ────────────────┤                │
   │     │                                    │   setOrder(data.data) ──▶ writes ▓ cache           │
   │     │                                    │   open SSE /orders/:id/events                      │
   │     │                                    │   SSE deltas ──▶ setOrder(...) ──▶ writes ▓ cache  │
   │     │                                    │                                    │               │
   │     │         OrderDetailSheet "Thêm món"│                                    │               │
   │     └──────── setTableId(order.table_id) ◀──────────────────────────────────┘                │
   │              setActiveOrderId(orderId)                                                        │
   │              router.push('/menu')   ── re-enters /menu in APPEND mode                        │
   │                                                                                               │
   └──────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                           │
   ══════════════════════ THE WIRE — the BE is the only cross-device hub ═══════════════════════════
                                           │
                              ┌────────────▼────────────┐
                              │   one  orders  row       │   MySQL (durable) + Redis (pub/sub)
                              │   order.id  ·  status    │
                              └──┬───────────────────┬───┘
              customer side      │                   │       staff / admin side
   ◀── GET /orders/:id ──────────┤                   ├──── new_order SSE ping ──▶ /sse/admin
   ◀── SSE /orders/:id/events ───┤                   ├──── orders WS patches ──▶ /admin/*
                                 └───────────────────┘     (admin re-fetches its own copy)
```

```
   LEGEND   ──▶ navigation / HTTP        ◀── SSE push (server → browser)
            ▓ localStorage (per-browser, survives F5)   ░ memory (dies on F5)
```

> **The key insight for `/order` (the list):** it is the **only** customer page that never opens a
> network connection at all — it reads `order_cache_<id>` entries that other pages (the submit paths
> and the `OrderDetailSheet` SSE loop) wrote before it. This means its cards can be stale:
> the status shown is the last value any page persisted to the cache, not a live BE read.
> Cards refresh only when their `OrderDetailSheet` overlay is opened. See
> [customer_order_list_be.md Flag #1](customer_order_list_be.md#flags).

---

## 1. The status lifecycle every customer page renders against

All pages render the same `OrderStatus` union
([`fe/src/types/order.ts:29-36`](../../../../../fe/src/types/order.ts)):

```
   POST /orders
        │      pending ──(staff confirm)──▶ confirmed ──(KDS start)──▶ preparing
        │         │                                                         │
        │         └──── cancelled ◀────────────────────── (staff/guest)    │
        │                                                                   ▼
        │                                                   ready ──(KDS)──▶ delivered
        ▼                                                                         ▼
   item-level  (qty_served):   pending(0) ──▶ preparing(0<n<qty) ──▶ done(n≥qty) paid
               deriveItemStatus() drives progress bars
```

| Status | Who sets it | `/order` list card shows | `OrderDetailSheet` SSE stops? |
|---|---|---|---|
| `pending` | `POST /orders` 201 | "chờ xác nhận" badge + active progress | ❌ continues |
| `confirmed` | staff | badge updates (from cache) | ❌ continues |
| `preparing` | KDS | badge updates (from cache) | ❌ continues |
| `ready` | KDS | badge updates (from cache) | ❌ continues |
| `delivered` | staff | no progress bar (`isActive = false`) | ✅ `order_completed` → `stopped=true` |
| `cancelled` | staff or guest | no progress bar (`isActive = false`) | ✅ `order_cancelled` → `stopped=true` |
| `paid` | payment | no progress bar | ✅ (delivered → paid, loop already stopped) |

> `isActive` on the list is derived inline: `order.status !== 'delivered' && order.status !== 'cancelled'`
> ([`order/page.tsx:95`](../../../../../fe/src/app/(shop)/order/page.tsx)).
> The `OrderDetailSheet` uses the identical expression
> ([`OrderDetailSheet.tsx:134`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx)).

---

## 2. The moment of handoff — what the submit pages leave behind

This is the seam that feeds the `/order` list. Both `/menu` (`TableConfirmModal`) and `/checkout`
run the identical pattern on a successful `POST /orders`:

```
   POST /orders ────────────────▶ 201 { id, order_number, status:"pending", items[], total_amount }
        │
        │   ① GET /orders/<id>  (immediate refetch for the enriched full shape)
        │         └──▶ localStorage["order_cache_<id>"] = JSON(fullOrder)   ▓ survives F5
        │              (falls back to the raw 201 body if the GET fails)
        │   ② clearCart()                                                   ░ wipes items/tableId/tableName
        ▼
   router.replace("/order/<id>")     (replace, not push → back-button cannot re-submit)
```

**Where each write happens in source:**

| Write | Source file | Line |
|---|---|---|
| `localStorage["order_cache_<id>"] = JSON(fullOrder)` | `TableConfirmModal.tsx` | `:37` |
| `localStorage["order_cache_<id>"] = JSON(fullOrder)` | `checkout/page.tsx` | `:68` |
| `clearCart()` (wipes `items`, `tableId`, `tableName`, `activeOrderId`, `paymentMethod`, `orderNote`) | `cart.ts` | `:89` |

> **Note:** `clearCart()` at `cart.ts:89` also clears `activeOrderId`. The `/menu` submit path
> does **not** call `setActiveOrderId` before navigating — unlike the cross-page model file for
> `customer_menu` (which described `setActiveOrderId(id)` as a handoff step). On this page's flow,
> `activeOrderId` is left `null` after order submit. Only `OrderDetailSheet`'s "Thêm món" button
> writes `activeOrderId`.
> ❓ UNVERIFIED: whether a "add to order" flow from `/menu`'s `TableConfirmModal` for an existing
> order also calls `setActiveOrderId` before navigating.

```
   STORE / STORAGE THE INSTANT BEFORE router.replace
   ┌──────────────────────────────────────────────────────────────────────┐
   │ ▓ localStorage["order_cache_<id>"] = {                               │
   │       id, order_number:"#A12", status:"pending",                     │
   │       table_id:"...", table_name:"03", total_amount:105000,          │
   │       items:[…], created_at:"…" }                                    │
   │                                                                      │
   │ ░ cart store (memory after clearCart): items=[] tableId=null         │
   │ ▓ cart store (persisted, CART_CONFIG v3 key "cart-config-v3"):       │
   │     orderNote: ""    activeOrderId: null                             │
   │     (partialize → only these two survive F5)                        │
   └──────────────────────────────────────────────────────────────────────┘
```

> `partialize` definition at
> [`cart.ts:153`](../../../../../fe/src/store/cart.ts): `(s) => ({ orderNote: s.orderNote, activeOrderId: s.activeOrderId })`.
> The persisted key is `STORAGE_KEYS.CART_CONFIG = 'cart-config-v3'`
> ([`storage-keys.ts:5`](../../../../../fe/src/lib/storage-keys.ts)).

---

## 3. `order_cache_<id>` — the in-browser hub the list page reads

`STORAGE_KEYS.ORDER_CACHE = "order_cache_"` ([`storage-keys.ts:3`](../../../../../fe/src/lib/storage-keys.ts));
full key = prefix + order UUID. Three writers, two readers, no network on the `/order` list itself:

```
   WRITERS                                                    READERS
   ─────────────────────────────────                          ──────────────────────────────────────
   TableConfirmModal  (POST 201 → GET) ──┐                   ┌── /order (list)  loadCachedOrders()
   checkout/page.tsx  (POST 201 → GET) ──┼──▶ ▓             │     scans ALL order_cache_* keys
   useOrderSSE        (every SSE delta) ─┘  order_cache_<id> └── useOrderSSE  cacheKey(id) on mount
```

**Writers in detail:**

| Writer | When | Lines |
|---|---|---|
| `TableConfirmModal.tsx` | POST 201 success; tries GET first, falls back to raw order body | `:35-39` |
| `checkout/page.tsx` | POST 201 success; same try/fallback pattern | `:64-70` |
| `useOrderSSE` | every `setOrder()` call via effect `[order, orderId]` | `:41-46` |

**The list page reader** — `loadCachedOrders()` at
[`order/page.tsx:10-24`](../../../../../fe/src/app/(shop)/order/page.tsx):

```typescript
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i)
  if (!key?.startsWith(STORAGE_KEYS.ORDER_CACHE)) continue
  orders.push(JSON.parse(localStorage.getItem(key)))
}
orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
```

- Called once in `useEffect([], [])` → runs on mount only. No re-scan on focus or interval.
- Returns all orders newest-first by `created_at`.
- Combo-header items (`combo_id && !combo_ref_id`) are filtered before computing
  `totalQty` / `totalServed` / `progress`
  ([`order/page.tsx:91-94`](../../../../../fe/src/app/(shop)/order/page.tsx)).

**The `clearAll` writer** — `clearAll()` at
[`order/page.tsx:41-51`](../../../../../fe/src/app/(shop)/order/page.tsx) iterates all localStorage
keys, removes every one that starts with `ORDER_CACHE`, then calls `setOrders([])`. It only appears
on the list page; no other page bulk-deletes cache entries.

---

## 4. The `OrderDetailSheet` overlay — the live updater of the cache

Tapping any card on `/order` sets `selectedOrderId` and renders `OrderDetailSheet`
([`order/page.tsx:151-156`](../../../../../fe/src/app/(shop)/order/page.tsx)). This is where the
network calls begin — the list itself never fetches.

The overlay is powered by `useOrderSSE(orderId)`, which runs a three-phase pipeline:

```
   t0  mount                t1 ~50ms               t2 REST returns      t3+  live
   ──────────────           ───────────────        ─────────────────    ──────────────────────
   read ▓ cache    ──▶      INSTANT paint      ──▶  GET /orders/:id ──▶  SSE /orders/:id/events
   (stale is fine)          (no spinner needed)     setOrder(data.data)   delta events patch state
        │                                                │                       │
        │                                          writes ▓ cache               writes ▓ cache
        │                                               (via [order] effect)   (via [order] effect)
```

After the overlay opens, every SSE delta (`order_status_changed`, `item_progress`,
`order_cancelled`, `order_completed`) causes `setOrder(...)`, which triggers the effect at
[`useOrderSSE.ts:41-46`](../../../../../fe/src/hooks/useOrderSSE.ts) to persist the updated order
back into `order_cache_<id>`. **This is the self-refresh loop that keeps the list cards reasonably
fresh after an overlay visit.**

SSE events handled by `useOrderSSE`
([`useOrderSSE.ts:83-123`](../../../../../fe/src/hooks/useOrderSSE.ts)):

| SSE `evt.event` | State mutation | Cross-page effect |
|---|---|---|
| `order_init` | `setOrder(data)` | ▓ cache written |
| `order_status_changed` | `setOrder(…status)` + `setNotification(…)` | ▓ cache written; notification modal shown |
| `item_progress` | `setOrder(…qty_served++)` per item | ▓ cache written; progress bar advances |
| `order_cancelled` | `setOrder(…cancelled)`; `stopped=true` | ▓ cache written; SSE loop stops; notification modal |
| `order_completed` | `setOrder(…delivered)`; `stopped=true` | ▓ cache written; SSE loop stops |
| `item_cancelled` | **not handled** (no case in switch) | ❌ — see Flag §A below |

Reconnect: exponential backoff, base 1 s, max 30 s, max 5 attempts; banner shows after 3 failures
([`useOrderSSE.ts:16-21`](../../../../../fe/src/hooks/useOrderSSE.ts)).

---

## 5. The "Thêm món / Đặt thêm món" handoff — re-entering `/menu`

The most consequential cross-page write from the `/order` list page's overlay is the "Thêm món"
button, which sends the user back to `/menu` with the order still active.

Rendered when `order.table_id` is truthy
([`OrderDetailSheet.tsx:403`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx)):

```tsx
<button onClick={() => {
  setTableId(order.table_id!)          // ① writes cart store (memory + persisted via clearCart)
  setActiveOrderId(isActive ? orderId : null)  // ② persisted — survives F5
  router.push('/menu')                 // ③ navigate
}}>
  {isActive ? 'Thêm món' : 'Đặt thêm món'}
</button>
```

Source: [`OrderDetailSheet.tsx:405-409`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx).

| Write | Store field | Persisted? | Who reads it | Effect |
|---|---|---|---|---|
| `setTableId(order.table_id!)` | `tableId` (memory only — not in `partialize`) | ❌ | `/menu` `AddToOrderBanner`, `TableConfirmModal` | `/menu` knows which table → shows "Đặt thêm" banner |
| `setActiveOrderId(isActive ? orderId : null)` | `activeOrderId` (persisted) | ✅ | `/menu` `AddToOrderBanner` | `/menu` can POST items onto the existing order |
| `router.push('/menu')` | — | — | `/menu` | navigation; back-button returns to `/order` list |

```
   /order (list) ──tap card──▶ OrderDetailSheet overlay
                                    │
                                    ├─ "Thêm món"  (order still active)
                                    │     setTableId(table_id)          ░ cart store — memory
                                    │     setActiveOrderId(orderId)     ▓ cart store — persisted
                                    │     router.push('/menu')
                                    │                                    │
                                    │     /menu mounts with:             │
                                    │       AddToOrderBanner shown       │
                                    │       cart POSTs to SAME order ───▶│ PATCH or POST w/ active_order_id
                                    │
                                    └─ "Đặt thêm món" (order delivered/cancelled)
                                          setTableId(table_id)
                                          setActiveOrderId(null)    ← null because !isActive
                                          router.push('/menu')
                                          /menu starts a FRESH order
```

> **Why `setTableId` but not `setTableName`?** `setTableId` is sufficient for the order payload's
> `table_id` field. `tableName` is cosmetic (display label) and will be refreshed from the cart's
> table-select flow if the user picks a different table. The overlay does not call `setTableName`.
> ❓ UNVERIFIED: whether `/menu` can display a table name in the `AddToOrderBanner` without
> `tableName` being set — it may fall back to an id-only label or re-fetch.

---

## 6. Cancel flows — from `/order` list to the BE and back

The list page itself has **no cancel UI** — cancels are launched from inside the `OrderDetailSheet`
overlay. There are three cancel mutations in the overlay:

```
   cancelOrderMutation   → DELETE /orders/:id            (whole order)
   cancelItemMutation    → DELETE /orders/items/:id      (one item)
   cancelMultiMutation   → Promise.all([DELETE /orders/items/:id, …])  (combo remaining)
```

Source: [`OrderDetailSheet.tsx:59-73`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx).

**Cancel whole order — the cross-page fan-out:**

```
   GUEST (in overlay)                    BE / Redis               Other screens
   ──────────────────                    ──────────               ─────────────
   "Huỷ toàn bộ đơn hàng"
    (shown only if canCancelOrder:
     progress < 30 && isActive —
     OrderDetailSheet.tsx:135)
        │
        ▼ DELETE /orders/:id ──────────▶ status=cancelled         order_cancelled published
        │  onSuccess:                    SoftDeleteOrder           ──▶ admin WS: drops from live cache
        │    toast.success("Đã huỷ")    RecalcTotalAmount          ──▶ SSE: any other overlay
        │    onClose()                  publishOrderEvent           open on this order sees modal
        ▼
   overlay closes → /order list re-renders
   (loadCachedOrders was called on mount; card still shows
    old status until user does F5 or re-opens the overlay)
```

> **Cache staleness after self-cancel:** when the guest cancels and the overlay closes via `onClose()`,
> the list cards are NOT re-scanned. The `order_cache_<id>` entry for the cancelled order still has
> the last SSE-written status (which `useOrderSSE` set to `cancelled` via `order_cancelled` event
> before `stopped=true`). So on next render the card will show `cancelled` — but only if `useOrderSSE`
> had time to handle the event before the mutation's `onSuccess` closed the overlay. If `onClose()`
> fires first, the card may show a stale earlier status until the overlay is re-opened.

**Cancel item — the gap:**

`item_cancelled` is emitted by the BE (`order_service.go:642`, per [customer_order_list_be.md Flag #2](customer_order_list_be.md#flags))
but **there is no `item_cancelled` case** in `useOrderSSE`'s `onmessage` switch
([`useOrderSSE.ts:83-123`](../../../../../fe/src/hooks/useOrderSSE.ts)). After a successful
`cancelItemMutation`, the toast fires but the item list in the overlay does **not** remove the
cancelled item live — it relies on the user seeing the toast and the item disappearing on the next
`GET /orders/:id` (i.e. the next time the overlay is opened fresh). The `order_cache_<id>` entry
is not updated until the next `order_status_changed` or `item_progress` SSE event refreshes the
whole order object.

---

## 7. Admin / staff — the server is the only shared hub

The list page, its cards, and the `OrderDetailSheet` overlay are purely customer-side. The admin
floor shares **no browser state** with them. The only datum that crosses the boundary is
`order.id`, and the admin re-fetches the full row itself.

```
   ┌────── guest phone ─────┐       ┌────── BE (the hub) ──────┐       ┌───── admin device ──────┐
   │  POST /orders ──────────┼──────▶│   order row created      │       │                         │
   │                         │       │   status:pending          │──────▶│ /sse/admin new_order    │
   │  OrderDetailSheet SSE ◀─┼───────┤   Redis order:<id>        │◀──────┤ GET /orders/:id         │
   │  order_status_changed   │       │                           │       │   → ['orders','live']   │
   │  item_progress          │       │   staff taps KDS ─────────┼──────▶│ orders WS patches       │
   │  order_cancelled        │       │   qty_served++            │       │   item_progress         │
   └─────────────────────────┘       └──────────────────────────┘       └─────────────────────────┘
```

A staff-side cancel (`PATCH /orders/:id/status { status:"cancelled" }`) fans back to the guest
via the `order_cancelled` SSE event on `order:<id>`. The guest's overlay shows the "Đơn hàng đã bị
huỷ — Nhà hàng đã huỷ đơn của bạn" modal
([`OrderDetailSheet.tsx:454-458`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx));
the `order_cache_<id>` entry is updated to `cancelled`; the SSE loop stops. The `/order` list card
shows `cancelled` on the next mount.

---

## 8. End-to-end timeline — `/order` list in the full order lifecycle

```
 Guest      /menu or /checkout    in-browser hub       /order (list)      OrderDetailSheet     BE / Redis
  │            (submit path)      (▓ cache + store)    (no network)       overlay (SSE)
  │                 │                   │                    │                    │                │
  ├ "Đặt hàng" ────▶│ POST /orders ─────┼────────────────────┼────────────────────┼───────────────▶ create row
  │                 │                   │                    │                    │            201 │
  │                 │ GET /orders/<id> ──┼────────────────────┼────────────────────┼───────────────▶ snapshot
  │                 │◀──────────────────┤                    │                    │                │
  │                 │ ① localStorage["order_cache_<id>"] = fullOrder              │                │
  │                 │ ② clearCart()     │                    │                    │                │
  │                 │ router.replace("/order/<id>") ─────────┼────────────────────▶ (not list — detail)
  │                 │                   │                    │                    │                │
  │ (later visits /order list)          │                    │                    │                │
  │                 │                   │  loadCachedOrders()│                    │                │
  │                 │                   ├───────────────────▶│ scan all           │                │
  │                 │                   │                    │ order_cache_* keys │                │
  │                 │                   │                    │ sort newest-first  │                │
  │                 │                   │                    │ render cards       │                │
  │                 │                   │                    │                    │                │
  │ (tap card)      │                   │                    │──setSelectedOrderId─▶ mount         │
  │                 │                   │  read ▓ cache ─────┼────────────────────▶ instant paint  │
  │                 │                   │  GET /orders/:id ──┼────────────────────┼───────────────▶ snapshot
  │                 │                   │◀── setOrder ───────┼────────────────────┤                │
  │                 │                   │  open SSE /orders/:id/events                             │
  │                 │                   │                    │                    │                │
  │ (staff confirm) │                   │                    │                    │                │
  │                 │                   │  order_status_changed ◀─────────────────┼───────────────── publish
  │                 │                   │◀── setOrder ───────┼────────────────────┤                │
  │                 │                   │  ▓ cache written   │                    │                │
  │                 │                   │                    │  card now stale    │                │
  │                 │                   │                    │  (no re-scan)      │                │
  │                 │                   │                    │                    │                │
  │ (tap "Thêm món")│                   │                    │                    │                │
  │                 │◀────────────────── setTableId + setActiveOrderId            │                │
  │                 │◀────────────────── router.push('/menu')                     │                │
  │ /menu AddToOrderBanner             │                    │                    │                │
  │ cart POSTs to SAME order ──────────┼────────────────────┼────────────────────┼───────────────▶ PATCH/append
  │                 │                   │                    │                    │                │
  │ (later: F5 on /order list)          │                    │                    │                │
  ▼ loadCachedOrders() re-scans ────────┤ full history from ▓                                     │
                                         cache (all orders, newest-first)
```

---

## 9. Reload (F5) behavior per page

| Page | Has URL id? | Source of truth on reload | Result |
|---|---|---|---|
| `/menu` | no | ▓ persisted: `orderNote` + `activeOrderId` | cart EMPTY (items ░ gone); `AddToOrderBanner` appears if `activeOrderId` set |
| `/checkout` | no | ░ `cart.items` — memory | redirects to `/menu` (`cart.itemCount() === 0 → router.replace('/menu')`) |
| `/order` (this list) | no | ▓ all `order_cache_*` keys | full history recovers; no network call |
| `OrderDetailSheet` overlay | id from parent `selectedOrderId` state | ░ state lost on F5 | overlay disappears (state resets); list re-renders from cache |
| `/order/:id` (standalone twin) | YES | ▓ `order_cache_<id>` → REST → SSE | full recovery (id in URL) |
| `/tracking` | no | ▓ `activeOrderId` (persisted) | recovers if `activeOrderId` set; empty-state otherwise |
| admin floor | no | REST GET (no localStorage) | re-fetches from BE |

> **The `/order` list's F5 advantage:** because it reads only localStorage, it is the **most
> resilient** customer page to a hard reload — every card that was ever opened in an overlay
> (and thus refreshed by `useOrderSSE`) reappears immediately with its last-known status.

---

## 10. Durability matrix — what survives what

| Datum | Lives in | Survives F5? | Survives new device/browser? | Scope |
|---|---|---|---|---|
| `order_cache_<id>` (full Order JSON) | ▓ `localStorage` | ✅ | ❌ per-browser | `/order` list cards + `useOrderSSE` seed |
| `activeOrderId` | ▓ cart store, `partialize` | ✅ | ❌ per-browser | `/menu` AddToOrderBanner + `/tracking` pointer |
| `items`, `tableId`, `tableName` | ░ cart store, memory only | ❌ | ❌ | `/menu` and `/checkout` pre-POST only |
| `selectedOrderId` (which overlay is open) | ░ React state | ❌ | ❌ | `/order` list — which sheet is visible |
| order id | the URL (`/order/<id>`) | ✅ | ✅ (shareable) | standalone twin `/order/:id` + `?add_to_order=` |
| **the orders row** | **BE (MySQL + Redis)** | ✅ | ✅ | **every page, every device** |

> **The mental model in one line:** within one phone, the `/order` list is a **passive mirror** of
> whatever `order_cache_*` entries other pages wrote — it never fetches, it only scans; freshness
> comes for free when the overlay's SSE loop writes back. Across devices, the BE order row is the
> only hub, and every page (customer overlay, standalone detail, admin floor) refreshes its own
> copy from its own realtime channel.

---

## 11. Flags / Drift

### Flag A — `item_cancelled` SSE event unhandled FE-side

`useOrderSSE.ts:83-123` has no `item_cancelled` case. The BE publishes `item_cancelled` on
`DELETE /orders/items/:id` (`order_service.go:642`). The overlay's `cancelItemMutation` fires the
toast but the item row is not removed live; `order_cache_<id>` is not updated until the next
`setOrder()` call from another event. Referenced in
[customer_order_list_be.md Flag #2](customer_order_list_be.md#flags).

### Flag B — `isNotFound` returned but never consumed by `OrderDetailSheet`

`useOrderSSE` returns `isNotFound` (`useOrderSSE.ts:159`) but `OrderDetailSheet` destructures only
`{ order, progress, connectionError, notification, clearNotification }`
([`OrderDetailSheet.tsx:45`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx)).
Opening a card for a soft-deleted or foreign-table order leaves the overlay on the "Đang tải đơn
hàng..." spinner indefinitely. Referenced in
[customer_order_list_be.md Flag #3](customer_order_list_be.md#flags).

### Flag C — list cards not refreshed after overlay closes

`loadCachedOrders()` is called once in `useEffect([], [])` at mount
([`order/page.tsx:37-39`](../../../../../fe/src/app/(shop)/order/page.tsx)). Closing the overlay
(setting `selectedOrderId = null`) does **not** trigger a re-scan. If the user opens a card,
waits for the SSE to update the cache, then closes — the list card still shows the **old** cached
status until the page is reloaded or re-mounted.

### Flag D — `filling` field absent from `fe/src/types/order.ts`

The OC-1 migration added `order_items.filling` (thit/moc_nhi/NULL) and OC-4 wired admin views
(`toppingLabel` reads `filling`), but `OrderItem` in `fe/src/types/order.ts` has **no `filling`
field** (`order.ts:15-27`). The `DishRow` in `OrderDetailSheet` therefore cannot display filling
info. This is a code-vs-spec drift.

### Flag E — `clearAll` on the list page does not clear `activeOrderId`

`clearAll()` at [`order/page.tsx:41-51`](../../../../../fe/src/app/(shop)/order/page.tsx) removes
every `order_cache_*` key from localStorage but does **not** call `setActiveOrderId(null)`. If the
guest clears history but has an `activeOrderId` persisted in the cart store, `/tracking` will still
attempt to open an SSE stream for an order whose cache entry no longer exists.

---

## 12. Source & rule map

| Topic | Source of truth |
|---|---|
| FE view + zones + interactions | [customer_order_list.md](customer_order_list.md) |
| BE endpoints, auth, caching, errors, flags | [customer_order_list_be.md](customer_order_list_be.md) |
| Loading states (spinner, empty state, SSE banner) | [customer_order_list_loading.md](customer_order_list_loading.md) |
| Narrative scenario | [SCENARIO_ORDER_HISTORY.md](SCENARIO_ORDER_HISTORY.md) |
| Standalone twin page `/order/:id` | [../customer_order_detail/customer_order_detail.md](../customer_order_detail/customer_order_detail.md) |
| `Order` / `OrderItem` / `OrderStatus` types | [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts) |
| Cart store (fields, persist, `partialize`) | [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) |
| localStorage key constants | [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) |
| Order submit (QR path) | [`fe/src/features/menu/components/TableConfirmModal.tsx`](../../../../../fe/src/features/menu/components/TableConfirmModal.tsx) |
| Order submit (online/checkout path) | [`fe/src/app/(shop)/checkout/page.tsx`](../../../../../fe/src/app/(shop)/checkout/page.tsx) |
| SSE hook (cache read/write + event handling) | [`fe/src/hooks/useOrderSSE.ts`](../../../../../fe/src/hooks/useOrderSSE.ts) |
| Overlay component (mutations + cart-store handoff) | [`fe/src/features/order/components/OrderDetailSheet.tsx`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx) |
| List page (loadCachedOrders + clearAll) | [`fe/src/app/(shop)/order/page.tsx`](../../../../../fe/src/app/(shop)/order/page.tsx) |
| Business logic — cancel rule + drift | [`docs/system/07_business_logic/LOGIC_BE.md`](../../../07_business_logic/LOGIC_BE.md) |
| Customer menu cross-page model (the wider order lifecycle) | [../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md) |
