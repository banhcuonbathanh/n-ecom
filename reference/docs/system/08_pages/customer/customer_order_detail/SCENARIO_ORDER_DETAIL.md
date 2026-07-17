# Scenario — Bàn 03 Watches Their Order Live (`/order/:id`)

> **TL;DR:** ✅ implemented · A complete run through the standalone order-detail page for one
> order at Bàn 03: page mounts from cache, SSE stream opens ("LIVE" pill), kitchen confirms →
> notification modal fires, guest edits quantity (stepper shows; update does **not** reflect
> live — Bug 1), a dish is cancelled (row stays on screen — Bug 2), guest adds more dishes, then
> watches the "Đơn hàng đã hoàn thành" banner appear at the end. Both code bugs are woven into
> the relevant beats — details in [ORDER_DETAIL_BUGS.md](ORDER_DETAIL_BUGS.md).
>
> Sources traced on branch `experience_claude.md_system_1`:
> - [`fe/src/app/(shop)/order/[id]/page.tsx`](../../../../../fe/src/app/(shop)/order/[id]/page.tsx)
> - [`fe/src/hooks/useOrderSSE.ts`](../../../../../fe/src/hooks/useOrderSSE.ts)
> - [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts)
> - [`fe/src/lib/api-client.ts`](../../../../../fe/src/lib/api-client.ts)
> - [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts)
>
> Siblings: [customer_order_detail.md](customer_order_detail.md) ·
> [customer_order_detail_be.md](customer_order_detail_be.md) ·
> [customer_order_detail_crosspage_dataflow.md](customer_order_detail_crosspage_dataflow.md) ·
> [customer_order_detail_loading.md](customer_order_detail_loading.md) ·
> [ORDER_DETAIL_BUGS.md](ORDER_DETAIL_BUGS.md)
>
> Wider order-creation context (how the order in this scenario was created): see
> [customer_menu/SCENARIO_LUNCH_RUSH.md §11:55](../customer_menu/SCENARIO_LUNCH_RUSH.md) — that
> file owns the menu → cart → POST flow; this file **zooms in** on what happens *after* the guest
> lands on `/order/:id`.

---

## Cast

| Who | Device | Role in this story |
|---|---|---|
| **Minh** | mobile phone (Bàn 03) | Guest who just placed `ORD-20260613-016` (₫60,000, 2× Suất Đầy Đủ Trứng Tái) |
| **Lê Đầu Bếp** | KDS tablet | Chef who incrementing `qty_served` per dish |
| **Phạm Thu Ngân** | POS/cashier screen | Confirms the order, watches Admin Overview; closes bill at the end |
| **Second device** | tablet on Bàn 03 | Family member watching the same `/order/:id` simultaneously |

---

## Setting

Bàn 03 · 11:55 on 2026-06-13. Minh has just tapped "Đặt hàng" on `/menu`, the order
`ORD-20260613-016` was created (`status: pending`), the cart was cleared, and the menu page called
`router.replace('/order/<id>')`. The order holds:

```
2× Suất Đầy Đủ Trứng Tái  →  exploded to:
  - header ×2 (unit_price 0)
  - Bánh Trứng Tái ×2
  - Giò ×2
  - Bánh Cuốn ×6
  - Trà đá ×2   (standalone)
  status: pending, total_amount: 60 000₫
```

---

## Minute-by-Minute Timeline

### T+0:00 — The page mounts: instant paint from localStorage, then REST snapshot

**What Minh sees:** The page renders in under 100 ms — no spinner — showing order number,
status badge (`pending`), and all dish rows. The sticky nav's connection pill shows "LIVE"
with a green pulsing dot.

**What happens under the hood:**

1. `OrderPage` mounts. `useOrderSSE(params.id)` fires its first `useEffect`
   (`useOrderSSE.ts:33-38`):
   ```ts
   const cached = localStorage.getItem(`${STORAGE_KEYS.ORDER_CACHE}${orderId}`)
   // STORAGE_KEYS.ORDER_CACHE = 'order_cache_'  (storage-keys.ts:3)
   if (cached) setOrder(JSON.parse(cached))
   ```
   The cache key is `order_cache_<id>` — written immediately after the POST response by the menu
   page before `router.replace`. Minh's order was cached there, so the component renders the
   full `Order` object synchronously. **No loading skeleton is shown.**

2. The second `useEffect` (`useOrderSSE.ts:48-150`) runs `connect()`. It fetches
   `GET /orders/:id` first (`useOrderSSE.ts:55-57`):
   ```ts
   const { data } = await api.get(`/orders/${orderId}`)
   if (!stopped) setOrder(data.data)
   ```
   This seeds the hook's `useState<Order>` with a fresh snapshot, overwriting the cached
   version if the server has newer data. Handler path: `orderH.Get` →
   `GetOrder(order_service.go:106)` → ownership gate (`table_id` = Minh's JWT claim) →
   `GetOrderItemsByOrderID` + optional `GetTableByID`. Full trace in
   [customer_order_detail_be.md §1](customer_order_detail_be.md).

3. With the snapshot set, `connect()` opens the SSE stream
   (`GET /orders/<id>/events`, `useOrderSSE.ts:69-71`):
   ```ts
   await fetchEventSource(
     `${NEXT_PUBLIC_API_URL}/orders/${orderId}/events`,
     { headers: { Authorization: `Bearer ${token ?? ''}` }, … }
   )
   ```
   `onopen` fires → `attemptsRef.current = 0` → `setConnectionError(false)` (it was already
   false). The nav pill resolves to `"LIVE"` (`page.tsx:291`).

4. The `progress` memo (`useOrderSSE.ts:152-157`) computes:
   ```ts
   const total  = order.items.reduce((s, i) => s + i.quantity, 0)
   const served = order.items.reduce((s, i) => s + i.qty_served, 0)
   // All qty_served are 0 → progress = 0%
   ```
   The progress bar is empty.

**Second device:** The family member lands on the same URL. Same `GET /orders/:id` snapshot; same
SSE stream opened in parallel. Both see identical state.

---

### T+1:30 — Kitchen confirms: `order_status_changed` SSE → notification modal

**What Minh sees:** The status badge flips from `pending` to `confirmed`. A full-screen modal
overlays the page with a green checkmark and the text **"Nhà hàng đã nhận đơn!"** with an
optional ETA line. Minh taps "Đã hiểu" to dismiss.

**What happens:**

Phạm Thu Ngân taps "Nhận đơn" on the Admin Overview. The BE runs `UpdateOrderStatus` →
publishes to Redis channel `order:<id>` with `type: "order_status_changed"`, `status: "confirmed"`,
and optionally `eta`.

Minh's `useOrderSSE` receives the event in `onmessage` (`useOrderSSE.ts:87-95`):
```ts
case 'order_status_changed':
  if (data.status) {
    setOrder(prev => prev ? { ...prev, status: data.status } : prev)
    if (data.status === 'confirmed')
      setNotification({ kind: 'confirmed', eta: data.eta })
  }
```
`setOrder` updates the badge. `setNotification` triggers the modal:
```tsx
// page.tsx:588-637 — notification modal branch
{notification.kind === 'confirmed' && (
  <>
    <h3>Nhà hàng đã nhận đơn!</h3>
    <p>{notification.eta ? `Dự kiến phục vụ trong khoảng ${notification.eta} phút.` : '…'}</p>
  </>
)}
```
Minh taps "Đã hiểu" → `clearNotification()` → `setNotification(null)` → modal unmounts
(`useOrderSSE.ts:159`).

**Second device:** Receives the same `order_status_changed` event on its own SSE connection.
Modal fires independently — each device manages its own `notification` `useState`.

---

### T+2:15 — Minh wants 2 trà đá not 1: QuantityStepper → `PATCH /orders/items/:id/quantity`

**What Minh sees:** The Trà đá row shows the `QuantityStepper` (because `qty_served === 0`).
Minh taps `+`. The stepper renders qty = 2. A success toast appears: "Đã cập nhật số lượng"
(❓ UNVERIFIED — exact toast text; the code calls `queryClient.invalidateQueries(...)` on success
but no explicit success toast is visible in the mutation; `onError` shows a toast).

**Wait — the update does NOT reflect live. This is Bug 1.**

The stepper condition (`page.tsx:695`):
```ts
const canStepper = isActive && item.qty_served === 0
```
Trà đá has `qty_served = 0` and `isActive = true`, so the stepper renders.

Minh taps `+` → `onQtyChange(2)` → `updateQtyMutation.mutate({ itemId, qty: 2 })`
(`page.tsx:361`). `mutationFn` calls `patchOrderItemQty(itemId, 2)` (`api-client.ts:72-73`):
```ts
await api.patch(`/orders/items/${itemId}/quantity`, { quantity: 2 })
```
`PATCH /orders/items/:id/quantity` hits `orderH.UpdateItemQuantity` → `UpdateOrderItemQuantity`
(`order_service.go:648`) → updates the DB row → runs `RecalculateTotalAmount` → **publishes
`item_updated` to `order:<id>` on Redis** (`order_service.go:696`).

**On the FE — two independent misses:**

1. `onSuccess` fires `queryClient.invalidateQueries({ queryKey: ['order', params.id] })`
   (`page.tsx:59`). But the order is held in `useOrderSSE`'s `useState`, **not** a
   `useQuery(['order', …])`. There is no such query key registered anywhere in the component
   tree, so this invalidation is a no-op. Nothing re-fetches.

2. `useOrderSSE`'s `onmessage` switch (`useOrderSSE.ts:83-123`) handles: `order_init`,
   `order_status_changed`, `order_cancelled`, `item_progress`, `order_completed`. There is **no
   `item_updated` case**. The SSE event the BE just published is silently dropped.

**Net effect:** Minh's screen still shows `qty = 1`. The summary table still reads `×1`. The
"Tổng cộng" stays at ₫60,000. The correct value (₫70,000) only appears after a full page reload.

**Second device:** Also sees nothing change. The `item_updated` SSE event is dropped on both
connections.

**Bug ref:** [ORDER_DETAIL_BUGS.md §Bug 1](ORDER_DETAIL_BUGS.md#bug-1--quantity-edit-never-reflects-live-dead-sse-event--dead-invalidation).

---

### T+3:45 — First dishes served: `item_progress` SSE ticks rows to ✓

**What Minh sees:** One by one, the dish rows update. Bánh Trứng Tái's "còn ×2" chip changes
to "còn ×1", then "✓ xong". The progress bar fills. The "Ra" counter in the summary table
ticks up.

**What happens:**

Lê Đầu Bếp taps a dish on the KDS. The BE increments `qty_served` for that `order_item` →
publishes `item_progress` with `{ item_id, qty_served }` to `order:<id>`.

`useOrderSSE`'s `onmessage` handles it (`useOrderSSE.ts:104-117`):
```ts
case 'item_progress':
  setOrder(prev =>
    prev
      ? {
          ...prev,
          items: prev.items.map(i =>
            i.id === data.item_id
              ? { ...i, qty_served: data.qty_served }
              : i
          ),
        }
      : prev
  )
```
The item's `qty_served` is patched in place. The `displayRows` and `progress` memos recompute
from the updated `order.items`:

```ts
// progress (useOrderSSE.ts:152-157)
const total  = order.items.reduce((s, i) => s + i.quantity, 0)
const served = order.items.reduce((s, i) => s + i.qty_served, 0)
return Math.round((served / total) * 100)
```

Progress bar advances. DishRow for that item re-renders: `remaining = item.quantity - item.qty_served`
→ if 0, shows "✓ xong" chip (`page.tsx:754`). Summary table's "Đã ra" column updates from the
`summaryRows` memo (`page.tsx:115-116`).

**Second device:** Same SSE event delivered independently; its view advances in lockstep.

---

### T+5:00 — Minh cancels one not-yet-served Giò: `DELETE /orders/items/:id`

**What Minh sees:** Minh taps "Huỷ" on the Giò DishRow. A cancel-confirm modal appears
("Huỷ món này?" / "Không thể hoàn tác."). Minh taps "Xác nhận huỷ". A success toast appears:
**"Đã huỷ món"**. The modal dismisses. **The Giò row stays on screen with its old quantity.**
This is Bug 2.

**What happens:**

Tapping "Huỷ" on a dish row with `remaining > 0 && isActive` sets
`cancelTarget = { type: 'item', itemId, itemName }` (`page.tsx:360`). The confirm modal renders
(`page.tsx:640-673`). On confirm, `handleConfirm` dispatches `cancelItemMutation.mutate(itemId)`
(`page.tsx:149`):

```ts
mutationFn: (id: string) => api.delete(`/orders/items/${id}`)
// page.tsx:69
```

BE: `orderH.CancelItem` → `CancelOrderItem(order_service.go:598)` → ownership gate → soft-deletes
the row → `RecalculateTotalAmount` → **publishes `item_cancelled` to `order:<id>`** (`order_service.go:642`).

`onSuccess` fires: `toast.success('Đã huỷ món')` → `setCancelTarget(null)` (`page.tsx:70-71`).
Modal unmounts. **No invalidation, no state update.** The `item_cancelled` SSE event arrives on
`useOrderSSE.ts:83-123`'s switch, which has no case for it — silently dropped.

**Net effect:** The Giò row remains at the old quantity. The money summary does not drop. The
cancelled amount only disappears after a full reload.

**Second device:** Also keeps showing the Giò row. `item_cancelled` is dropped on both connections.

**Bug ref:** [ORDER_DETAIL_BUGS.md §Bug 2](ORDER_DETAIL_BUGS.md#bug-2--cancelled-item-stays-on-screen-item_cancelled-unhandled).

---

### T+6:30 — Minh taps "Thêm món" → cart store + navigation to `/menu?add_to_order=:id`

**What Minh sees:** A button labelled **"Thêm món"** (label because `isActive === true`,
`page.tsx:580`). Minh taps it. The browser navigates to `/menu?add_to_order=<orderId>`.

**What happens (page.tsx:571-576):**

```tsx
onClick={() => {
  setTableId(order.table_id!)        // cart.ts:91 — writes tableId to store
  setActiveOrderId(isActive ? params.id : null)  // cart.ts:93 — writes activeOrderId
  router.push(isActive ? `/menu?add_to_order=${params.id}` : '/menu')
}}
```

`setTableId(order.table_id!)` writes the table UUID into `useCartStore.tableId` (`cart.ts:91`).
`setActiveOrderId(params.id)` writes the current order's id into `useCartStore.activeOrderId`
(`cart.ts:93`). Both are in-memory Zustand store fields. The store's `partialize`
(`cart.ts:153`) persists only `{ orderNote, activeOrderId }` to `localStorage` under
`STORAGE_KEYS.CART_CONFIG` (`= 'cart-config-v3'`, `storage-keys.ts:6`), so `activeOrderId`
survives a reload but `tableId` does not.

`router.push('/menu?add_to_order=<id>')` navigates. The menu page reads `add_to_order` from
the query string and switches from "confirm new order" mode to "add to existing order" mode —
items are sent via `POST /orders/:id/items` (covered by
[SCENARIO_LUNCH_RUSH.md](../customer_menu/SCENARIO_LUNCH_RUSH.md#C)).

The SSE stream for `/order/:id` is kept open in the background by the browser tab because the
order page is unmounted (React cleanup fires `abortRef.current?.abort()`,
`useOrderSSE.ts:146-149`) — the stream closes. When Minh navigates back to `/order/:id`, a
fresh `useOrderSSE` mount will re-open it.

---

### T+7:00 — Minh taps "Theo dõi bàn" (alternative path)

**What Minh sees:** A button labelled **"Theo dõi bàn"** (visible only while `isActive`,
`page.tsx:562`). Tapping it navigates to `/tracking`.

**What happens (page.tsx:563-564):**

```tsx
onClick={() => { setActiveOrderId(params.id); router.push('/tracking') }}
```

Only `setActiveOrderId` is called — `setTableId` is NOT called on this path. The `/tracking`
page reads `activeOrderId` from the cart store to know which order to display. Trace of the
tracking page is out of scope for this page's scenario; link:
[customer_order_detail_crosspage_dataflow.md §Tracking](customer_order_detail_crosspage_dataflow.md).

---

### T+12:00 — All dishes served: `order_completed` SSE → "Đơn hàng đã hoàn thành" banner

**What Minh sees:** The last dish's progress tick arrives. Then the banner appears:
`"Đơn hàng đã hoàn thành"` with a green `CheckCircle` icon and the sub-text "Cảm ơn bạn đã
dùng bữa! Bạn có thể đặt thêm bên dưới." (`page.tsx:539-546`). The "Huỷ đơn hàng" button
disappears. The "Thêm món" label changes to **"Đặt thêm món"** (different label, same
navigation path, `page.tsx:580`).

**What happens:**

When every `item.qty_served == item.quantity`, the KDS marks the order `delivered`. The BE
publishes `order_completed`. `useOrderSSE.ts:118-121`:

```ts
case 'order_completed':
  setOrder(prev => prev ? { ...prev, status: 'delivered' } : prev)
  stopped = true
  ctrl.abort()
```

`status` flips to `'delivered'`. `isActive` becomes `false` (`page.tsx:232`):
```ts
const isActive = order.status !== 'delivered' && order.status !== 'cancelled'
```

`canCancelOrder` also becomes `false` → the "Huỷ đơn hàng" button disappears (`page.tsx:550`).
The delivered banner renders (`page.tsx:539`). The SSE stream is cleanly closed (`ctrl.abort()`).

The updated `order` with `status: 'delivered'` is also persisted to `localStorage`
(`useOrderSSE.ts:41-45`), so a future F5 reload shows "delivered" instantly from cache before
any REST response arrives.

---

## Under the Hood

### A. Cross-component data flow (one page, many widgets)

All widgets on this page read from one source — `useOrderSSE`'s local `useState<Order>`. There
is no prop-drilling and no separate TanStack Query for the order on this page (the `invalidateQueries`
in the quantity mutation is a no-op for this reason — see Bug 1). The data flow within the page:

```
useOrderSSE(params.id)
  ├── GET /orders/:id snapshot → setOrder(data.data)    [seeded once on mount]
  └── SSE onmessage patches
        ├── order_status_changed  → setOrder({ status })  + setNotification
        ├── item_progress         → setOrder({ items: [patch qty_served] })
        ├── order_cancelled       → setOrder({ status: 'cancelled' })  + close stream
        └── order_completed       → setOrder({ status: 'delivered' })  + close stream
             ↓
         order (Order | null)   ← single source for all downstream rendering
             ↓
        useMemo [displayRows, summaryRows, progress, eatenAmount, remainingAmount…]
          ↓               ↓                  ↓
        DishRow       SummaryTable       MoneyCard
        (per item)    (grouped by        (eatenAmount /
                       product_id)        remainingAmount /
                                          total_amount)
```

Cross-component detail → [customer_order_detail_crosspage_dataflow.md](customer_order_detail_crosspage_dataflow.md).

### B. Cross-page data flow (state that outlives this page)

| What travels | Mechanism | Written by | Read by |
|---|---|---|---|
| `activeOrderId` | `useCartStore` persisted → `STORAGE_KEYS.CART_CONFIG` (`cart-config-v3`, `storage-keys.ts:6`) | `setActiveOrderId` in "Thêm món" / "Theo dõi bàn" buttons (`page.tsx:564,574`) | `/menu?add_to_order=`, `/tracking` |
| `tableId` | `useCartStore` memory (not persisted — `partialize` at `cart.ts:153`) | `setTableId` in "Thêm món" button only (`page.tsx:573`) | `/menu` |
| `order_cache_<id>` | `localStorage` written by `useOrderSSE.ts:41-45` on every `order` state change | `useOrderSSE` persistence effect | Same page on fresh mount / F5 |
| SSE stream identity | TCP connection (`Authorization: Bearer`) | `useOrderSSE.ts:69` | Closed on `order_completed` or `order_cancelled` |

Full cross-page hub → [customer_order_detail_crosspage_dataflow.md](customer_order_detail_crosspage_dataflow.md).

### C. FE → BE sends (what this page writes)

| Beat | FE call | api-client.ts | Endpoint |
|---|---|---|---|
| T+2:15 qty edit | `patchOrderItemQty(itemId, 2)` (`api-client.ts:72`) | `api.patch('/orders/items/:id/quantity', { quantity })` | `PATCH /orders/items/:id/quantity` |
| T+5:00 cancel item | `api.delete('/orders/items/:id')` (`page.tsx:69`) | direct `api.delete` | `DELETE /orders/items/:id` |
| T+6:30 cancel order (if used) | `api.delete('/orders/:id')` (`page.tsx:64`) | direct `api.delete` | `DELETE /orders/:id` |

All three go through the shared `api` Axios instance (`api-client.ts:1-30`) with the guest JWT
injected by the request interceptor. Full handler traces:
[customer_order_detail_be.md](customer_order_detail_be.md).

### D. BE → FE receive / live (SSE events on `order:<id>`)

| SSE event | Published by | Handler in `useOrderSSE` | Effect |
|---|---|---|---|
| `order_init` | BE on first subscribe (❓ UNVERIFIED — current code comment says the SSE handler relays only future deltas, `useOrderSSE.ts:51-53`) | `case 'order_init'`: full `setOrder(data)` (`useOrderSSE.ts:84-86`) | Replaces entire order state |
| `order_status_changed` | Status transitions | `case 'order_status_changed'`: patch `status` + `setNotification` (`useOrderSSE.ts:87-95`) | Badge + modal |
| `item_progress` | Chef taps KDS | `case 'item_progress'`: patch `qty_served` in `items[]` (`useOrderSSE.ts:104-117`) | Row tick + progress bar |
| `order_cancelled` | Order cancelled | `case 'order_cancelled'`: `status → 'cancelled'` + close stream (`useOrderSSE.ts:98-103`) | Status badge + stream closed |
| `order_completed` | Last dish served | `case 'order_completed'`: `status → 'delivered'` + close stream (`useOrderSSE.ts:118-122`) | Banner + stream closed |
| **`item_updated`** | `PATCH /orders/items/:id/quantity` | **NO CASE — silently dropped** | ❌ Bug 1 — qty edit invisible |
| **`item_cancelled`** | `DELETE /orders/items/:id` | **NO CASE — silently dropped** | ❌ Bug 2 — cancelled row stays |

### E. Loading strategy + caching

Three paint phases on mount, fastest to slowest:

| Phase | What renders | Source | Latency |
|---|---|---|---|
| Instant | Full order (stale) from cache | `localStorage` `order_cache_<id>` (`useOrderSSE.ts:33-38`) | < 1 ms |
| REST seed | Fresh snapshot overwrites cache | `GET /orders/:id` (network) | 50–200 ms |
| SSE live | Incremental patches | SSE stream open | ongoing |

If cache is **cold** (first visit, different device, cache cleared): the hook starts with
`order = null` → the skeleton renders (`page.tsx:175-229`) until the REST response arrives.
Full loading state detail: [customer_order_detail_loading.md](customer_order_detail_loading.md).

**Reconnect:** up to 5 attempts, exponential backoff 1 s → 30 s (`useOrderSSE.ts:16-21`).
`ConnectionErrorBanner` appears after the 3rd failed attempt (`useOrderSSE.ts:134`,
`page.tsx:295`). At attempt 5 the loop exits silently — no further reconnect.

**The `order_cache_<id>` write** happens on every `order` state change (`useOrderSSE.ts:41-45`),
so the cache always holds the most-recently-SSE-patched snapshot, even mid-order.

### F. Monitoring

All five HTTP calls from this page — the REST `GET`, the SSE connect, and the three write
mutations — appear as individual request-rate and latency data points in the Grafana dashboard
(`:3001`, "BanhCuon — API Monitoring"). SSE connections show as long-lived open requests.

Alerts: `HighErrorRate` (5xx > 5% over 5 min) and `SlowResponseTime` (p95 > 500 ms over 5 min).
A misconfigured Redis that drops pub/sub events would not trigger these alerts (no SSE error is
returned — events just stop arriving). The guest would see "LIVE" pill but a frozen view.

Monitoring architecture: [`monitoring/`](../../../../../monitoring/) (edit there, not in docs).

---

## Known Bugs in This Scenario

| Beat | Bug | Status |
|---|---|---|
| T+2:15 qty edit | **Bug 1** — `item_updated` SSE unhandled + `invalidateQueries` targets non-existent key → qty never reflects live | 🟠 Code bug — not yet on MASTER_TASK.md. See [ORDER_DETAIL_BUGS.md §Bug 1](ORDER_DETAIL_BUGS.md#bug-1--quantity-edit-never-reflects-live-dead-sse-event--dead-invalidation) |
| T+5:00 cancel item | **Bug 2** — `item_cancelled` SSE unhandled → cancelled row stays on screen | 🟡 Code bug — not yet on MASTER_TASK.md. See [ORDER_DETAIL_BUGS.md §Bug 2](ORDER_DETAIL_BUGS.md#bug-2--cancelled-item-stays-on-screen-item_cancelled-unhandled) |

---

## Flags Surfaced by This Scenario

| # | Flag | Detail |
|---|---|---|
| 1 | ❓ UNVERIFIED — `order_init` event | Code comment at `useOrderSSE.ts:51-53` says "The SSE handler only relays Redis pub/sub — it never sends `order_init`". The `onmessage` switch has a case for it (`useOrderSSE.ts:84-86`), but whether the BE actually ever emits `order_init` is not confirmed in this trace. |
| 2 | ❓ UNVERIFIED — `updateQtyMutation` success toast | `onSuccess` at `page.tsx:59` only calls `queryClient.invalidateQueries(…)` — no explicit `toast.success(...)`. Whether a success toast fires is unverified from source. The `onError` toast is confirmed at `page.tsx:60`. |
| 3 | `canCancelOrder` gate | `page.tsx:233`: `progress < 30 && (status === 'confirmed' \|\| status === 'preparing')`. A `pending` order has no "Huỷ đơn" button — staff must confirm it first. This may surprise guests who want to cancel before the kitchen sees it. |
| 4 | `setTableId` not called in "Theo dõi bàn" | `page.tsx:563-564` only calls `setActiveOrderId` — `tableId` is NOT written. If `/tracking` reads `tableId` from the cart store, it will be stale/null after a reload. |
| 5 | SSE reconnect loop exits silently | After 5 failed attempts (`useOrderSSE.ts:64,136`), the loop exits with no user prompt to reload. The "LIVE" / "MẤT KẾT NỐI" pill stays on "MẤT KẾT NỐI" but the page offers no recovery action. |

---

## The One-Line Mental Model

> `/order/:id` is a **live mirror** of a single order row: it paints instantly from
> `localStorage`, seeds from a REST snapshot, then subscribes to SSE deltas — but its two
> write paths (quantity edit, item cancel) do not yet close the loop back into that mirror,
> so both mutations are toast-only until a reload.
