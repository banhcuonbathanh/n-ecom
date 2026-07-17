# Scenario — Order History Revisit (`/order`)

> **TL;DR:** status ✅ implemented. One customer, one already-placed order at Bàn 03, one
> bottom-nav tap that opens `/order` — a localStorage-rendered list → a live-streaming detail
> sheet → one item cancel → back to the menu. Every beat is traced to running source on branch
> `experience_claude.md_system_1`. Field shapes → [../../02_spec/object/OBJECT_MODEL_ORDER.md].
>
> Sibling files: [customer_order_list.md] · [customer_order_list_be.md] ·
> [customer_order_list_crosspage_dataflow.md] · [customer_order_list_loading.md] ·
> twin detail page → [../customer_order_detail/customer_order_detail.md]
>
> Surrounding lunch-rush context (how the order was originally placed, combo payload, canh split)
> → [../../customer_menu/SCENARIO_LUNCH_RUSH.md §11:55]. This scenario zooms on what happens
> *after* that order exists in the system.

---

## The Cast

| Who | Device | Role in this beat |
|---|---|---|
| **Hoa** | Mobile, browser tab still open from ordering | Customer at Bàn 03 — guest JWT in `useAuthStore` memory, order already committed to DB and cached in `localStorage` |
| **Lê Đầu Bếp** | KDS screen (staff) | Incrementing `qty_served` on each dish as it leaves the kitchen — triggers SSE events that Hoa's phone receives |

---

## Setting

12 minutes after Hoa placed `ORD-20260613-016` at **Bàn 03** (2× Suất Đầy Đủ Trứng Tái, ₫60,000).
The order is `status: confirmed`. One Bánh Cuốn has been served (`qty_served = 1` on that item).
Hoa minimised the browser and now returns to check progress.

The last time the `/order` page loaded, `useOrderSSE` wrote the order to `localStorage` under
`order_cache_<id>` (`useOrderSSE.ts:41-46`). That cached JSON is the starting point for this
entire beat.

---

## Timeline

### T+0:00 — Hoa taps "Đơn Hàng" in the bottom nav

The tab navigates to `/order`. This is the `OrderListPage` component
(`fe/src/app/(shop)/order/page.tsx:33`).

On mount, a single `useEffect` fires (`page.tsx:37-39`):

```ts
useEffect(() => {
  setOrders(loadCachedOrders())
}, [])
```

`loadCachedOrders()` iterates `localStorage`, collects every key that starts with
`STORAGE_KEYS.ORDER_CACHE` (`"order_cache_"`, `storage-keys.ts:3`), parses each JSON blob, and
sorts descending by `created_at` (`page.tsx:10-24`). **No network call is made.** The page calls
zero BE endpoints at this stage — confirmed by the absence of any `api.*` call in `page.tsx`.

Hoa's single cached order surfaces immediately as a card.

---

### T+0:01 — The order card renders from the cache

The card loop (`page.tsx:90-147`) renders for each `Order` in `orders[]`. For
`ORD-20260613-016`:

- Combo header rows are **filtered out** before progress is computed:
  ```ts
  const displayItems = (order.items ?? []).filter(i => !(i.combo_id && !i.combo_ref_id))
  // page.tsx:91 — combo headers (combo_id set, combo_ref_id null) are display-only noise
  ```
- `totalQty` / `totalServed` are summed over `displayItems` (`page.tsx:92-93`), so the progress
  bar reflects real dish counts, not the ₫0 header.
- `isActive = order.status !== 'delivered' && order.status !== 'cancelled'` (`page.tsx:95`).
  The card shows the progress bar and served-count footer.

The card shows: "Bàn 03 · ORD-20260613-016 · [confirmed] · ₫60,000" + a progress bar at
whatever percentage was baked into the last cached snapshot.

> ⚠️ **Flag 1 (from [customer_order_list_be.md] §Flags #1):** the card's progress bar and
> served count are **stale** — they reflect the last time `useOrderSSE` wrote to cache, not the
> current DB state. If the chef served another portion since the app was backgrounded, the card
> will be behind until the detail sheet is opened.

---

### T+0:03 — Hoa taps the card

```ts
onClick={() => setSelectedOrderId(order.id)}
// page.tsx:100
```

React sets `selectedOrderId` to the order's UUID. The `OrderDetailSheet` mounts
(`page.tsx:151-156`):

```tsx
{selectedOrderId && (
  <OrderDetailSheet
    orderId={selectedOrderId}
    onClose={() => setSelectedOrderId(null)}
  />
)}
```

`OrderDetailSheet` immediately calls `useOrderSSE(orderId)` (`OrderDetailSheet.tsx:45`).

---

### T+0:03 — useOrderSSE: instant paint from cache

On mount, `useOrderSSE` runs its first `useEffect` (`useOrderSSE.ts:33-38`):

```ts
useEffect(() => {
  try {
    const cached = localStorage.getItem(cacheKey(orderId))
    if (cached) setOrder(JSON.parse(cached))
  } catch {}
}, [orderId])
```

`cacheKey(id)` = `"order_cache_" + id` (`useOrderSSE.ts:9`). The cached `Order` object paints
the sheet immediately — no spinner, no network round-trip. Hoa sees the dish list, the progress
bar, and the total before any HTTP request fires.

Loading detail → [customer_order_list_loading.md].

---

### T+0:04 — useOrderSSE: REST snapshot fetch

The second `useEffect` (`useOrderSSE.ts:48-150`) runs `connect()`. The first thing it does is a
REST GET:

```ts
const { data } = await api.get(`/orders/${orderId}`)
if (!stopped) setOrder(data.data)
// useOrderSSE.ts:56-57
```

This hits **Endpoint 1: `GET /orders/:id`** (`customer_order_list_be.md §1`):

- Handler: `orderH.Get` at `order_handler.go:125`
- Ownership check: for `callerRole == "customer"`, `callerID` is swapped to `claims.TableID`
  (`order_handler.go:128-130`); service rejects with `ErrForbidden` if `order.table_id ≠ callerID`
  (`order_service.go:116-120`).
- Service: `GetOrder` (`order_service.go:106`) runs three queries: `GetOrderByID` + `GetOrderItemsByOrderID`
  + optional `GetTableByID`. Item statuses are derived from `qty_served` vs `quantity` — no status
  column exists on `order_items`.
- No Redis cache — straight MySQL read every call.

The fresh snapshot overwrites the cached state in `setOrder(data.data)`. Now the sheet reflects
the true current `qty_served` counts, including the Bánh Cuốn that was served while Hoa's tab was
minimised. The progress bar updates visually.

The second `useEffect` in `useOrderSSE` (`useOrderSSE.ts:41-46`) writes the fresh `Order` back
to `localStorage`, keeping the cache current for the next cold-open.

---

### T+0:05 — useOrderSSE: SSE stream opens

Immediately after the REST call (still inside `connect()`), `useOrderSSE` opens an SSE connection:

```ts
await fetchEventSource(
  `${...NEXT_PUBLIC_API_URL}/orders/${orderId}/events`,
  { headers: { Authorization: `Bearer ${token ?? ''}` }, signal: ctrl.signal, … }
)
// useOrderSSE.ts:69-130
```

This hits **Endpoint 2: `GET /orders/:id/events`**.

The BE handler is `sse.StreamOrder` (`sse/handler.go:21`). It:

1. Subscribes to Redis channel `"order:<id>"` (`sse/handler.go:42`).
2. Sends the initial confirmation immediately: `event: connected\ndata: {"order_id":"<id>"}\n\n`
   (`sse/handler.go:50-51`).
3. Enters a select loop: relay every Redis message verbatim, and emit `: keep-alive` every 15 s
   (`heartbeatInterval` = `15 * time.Second`, `sse/handler.go:14`, loop at `:53-68`).

Auth note: `authMW` validates the `Bearer` token before `StreamOrder` ever runs (comment at
`sse/handler.go:20`). The handler itself performs **no ownership check** — any authenticated
client with a valid token and a known order id can subscribe (Flag 4 in `customer_order_list_be.md`).

The FE's `onopen` callback resets `attemptsRef.current = 0` and `setConnectionError(false)`
(`useOrderSSE.ts:76-78`). The stream is live.

---

### T+0:08 — Chef serves a dish; Hoa's phone moves in real time

The chef taps "Ra 1 phần" on the KDS for one Suất Đầy Đủ Trứng Tái sub-item (e.g., Bánh Trứng
Tái). The BE increments `qty_served` and calls `publishOrderEvent` (`order_service.go:806-819`):

```go
func (s *OrderService) publishOrderEvent(ctx context.Context, eventType, orderID string, extras ...orderEvent) {
    evt := orderEvent{Type: eventType, OrderID: orderID}
    // ... fill extras (status, order_number, table_id) ...
    payload, _ := json.Marshal(evt)
    channel := fmt.Sprintf("order:%s", orderID)
    s.rdb.Publish(ctx, channel, string(payload))   // → customer's SSE stream
    s.rdb.Publish(ctx, "orders:kds", string(payload))  // → kitchen board fan-out
}
// order_service.go:806-819
```

`StreamOrder` relays the payload with its `type` field as the SSE event name
(`sse/handler.go:61-63`). The event arrives on Hoa's phone:

```
event: item_progress
data: {"type":"item_progress","order_id":"<uuid>","item_id":"<item-uuid>","qty_served":1,...}
```

The `onmessage` handler in `useOrderSSE` catches `case 'item_progress':` (`useOrderSSE.ts:104-117`):

```ts
case 'item_progress':
  setOrder(prev =>
    prev ? {
      ...prev,
      items: prev.items.map(i =>
        i.id === data.item_id ? { ...i, qty_served: data.qty_served } : i
      ),
    } : prev
  )
  break
```

The single item's `qty_served` is patched in-place. The `progress` memo (`useOrderSSE.ts:152-157`)
recomputes across all items (including combo header rows whose `quantity` counts). The progress bar
in `OrderDetailSheet` re-renders — Hoa sees the bar advance without any network round-trip.

The second `useEffect` (`useOrderSSE.ts:41-46`) writes the updated `Order` back to
`localStorage` — so the list card will also show the correct count next time the page mounts.

Cross-component data flow detail → [customer_order_list_crosspage_dataflow.md].

---

### T+0:12 — Hoa decides to cancel one not-yet-served item

Hoa scrolls the dish list in the sheet. One Suất Đầy Đủ Trứng Tái sub-item — say "Giò" — still
shows "còn ×2". She taps the "Huỷ" button next to it.

```tsx
// DishRow — OrderDetailSheet.tsx:532-536
{remaining > 0 && isActive ? (
  <button onClick={onCancel} …>Huỷ</button>
) : …}
```

`onCancel` sets `cancelTarget`:

```ts
setCancelTarget({ type: 'item', itemId: item.id, itemName: item.name })
// OrderDetailSheet.tsx:266
```

A confirmation modal appears (`OrderDetailSheet.tsx:471-505`). Hoa taps "Xác nhận huỷ"
→ `handleConfirm()` runs → `cancelItemMutation.mutate(cancelTarget.itemId)`
(`OrderDetailSheet.tsx:126-131`).

This fires **Endpoint 4: `DELETE /orders/items/:id`** (`customer_order_list_be.md §4`):

```ts
mutationFn: (id: string) => api.delete(`/orders/items/${id}`)
// OrderDetailSheet.tsx:65
```

BE path (`order_service.go:598-644`):

1. Load the item → its parent order.
2. Ownership gate: `callerRole == "customer"` → compare `order.table_id` to `claims.TableID`
   (`order_service.go:616-620`). Hoa's guest JWT carries Bàn 03's `table_id` — check passes.
3. Status gate: order must be `pending | confirmed | preparing` (`order_service.go:623-627`). It is
   `confirmed` — passes.
4. Already-served guard: `item.QtyServed >= item.Quantity` → `ErrCancelThreshold` (422)
   (`order_service.go:630-632`). Giò has `qty_served = 0` — check passes.
5. `DeleteOrderItem` removes the row (`order_service.go:634`).
6. `RecalculateTotalAmount` re-sums `SUM(unit_price × quantity)` over remaining items and updates
   `orders.total_amount` (`order_service.go:638`). The total drops by `Giò.unit_price × quantity`.
7. `publishOrderEvent("item_cancelled", order.id)` fans out to `order:<id>` and `orders:kds`
   (`order_service.go:642`, `publishOrderEvent:814-818`).

The FE `onSuccess` handler toasts "Đã huỷ món" and clears `cancelTarget`
(`OrderDetailSheet.tsx:66-67`).

> ⚠️ **Flag 2 (from [customer_order_list_be.md] §Flags #2):** the BE emits
> `type: "item_cancelled"` via `publishOrderEvent`, but `useOrderSSE`'s `onmessage` switch has
> **no `item_cancelled` case** (`useOrderSSE.ts:83-123`). The event arrives but is silently ignored.
> The sheet does **not** remove the cancelled item from the displayed list in real time — the local
> mutation's toast is the only visible feedback. The item vanishes only after the next full snapshot
> (sheet close + reopen, or a page reload). Until then, the DishRow still shows "còn ×2" with a
> greyed-out Huỷ button (because the FE `cancelItemMutation` marks it as `isPending`, not because
> the item is gone).

The BE-side cancel *does* recalculate `orders.total_amount` correctly. The next `GET /orders/:id`
(on sheet reopen) will reflect the updated total.

---

### T+0:16 — Hoa taps "Thêm món" to add more dishes

The "Thêm món" button is shown when `order.table_id` is set (`OrderDetailSheet.tsx:403`):

```tsx
{order.table_id && (
  <button
    onClick={() => {
      setTableId(order.table_id!)
      setActiveOrderId(isActive ? orderId : null)
      router.push('/menu')
    }}
    …
  >
    {isActive ? 'Thêm món' : 'Đặt thêm món'}
  </button>
)}
// OrderDetailSheet.tsx:403-415
```

`order.status === 'confirmed'` → `isActive = true` → label is "Thêm món".

Three things happen before `router.push('/menu')`:

1. `setTableId(order.table_id!)` — writes Bàn 03's `table_id` into `useCartStore`
   (`cart.ts:91`; persists only as in-memory Zustand, not to `localStorage`).
2. `setActiveOrderId(orderId)` — marks the existing order as in-flight
   (`cart.ts:93`); this value is persisted via `partialize` under
   `STORAGE_KEYS.CART_CONFIG` = `"cart-config-v3"` (`cart.ts:152-153`, `storage-keys.ts:5`).
3. `router.push('/menu')` — navigates. The cart is still empty; the menu page picks up
   `activeOrderId` from the store and changes its "Đặt hàng" flow to "Đặt thêm" (add-to-order),
   which uses `POST /orders/:id/items` instead of `POST /orders`.

Cross-page handoff detail → [customer_order_list_crosspage_dataflow.md].

The SSE stream for the current order is still open (the `useEffect` cleanup only runs on
`OrderDetailSheet` unmount). Navigating away unmounts the sheet, which calls
`abortRef.current?.abort()` (`useOrderSSE.ts:148`) and terminates the stream cleanly.

---

## Under the Hood

### A. Cross-component data flow (one sheet, many widgets)

All widgets inside `OrderDetailSheet` share a single `Order` value from `useOrderSSE`. There is no
prop-drilling between `DishRow`, the progress bar, the money summary, the "Huỷ" buttons, and the
"Thêm món" button — they all derive from the same `order` reference returned by the hook.

```
useOrderSSE(orderId) ─── order ──▶  progress bar (progress memo)
                     └── order ──▶  DishRow list (displayRows memo)
                     └── order ──▶  summaryRows (summaryMap memo)
                     └── order ──▶  money totals (eatenAmount / remainingAmount)
                     └── order ──▶  isActive guard (status check)
                     └── order ──▶  "Thêm món" button (table_id check)
```

The `useMemo` at `OrderDetailSheet.tsx:75-124` recomputes all derived values in one pass whenever
`order` changes. An `item_progress` SSE event triggers one `setOrder` call → one memo recompute →
all widgets re-render in lockstep.

Detail → [customer_order_list_crosspage_dataflow.md].

### B. Cross-page data flow

| State | Mechanism | Survives F5? |
|---|---|---|
| Order snapshot | `localStorage` key `"order_cache_<id>"` (`STORAGE_KEYS.ORDER_CACHE + id`) | ✅ |
| `activeOrderId` | `useCartStore` partialised under `STORAGE_KEYS.CART_CONFIG` (`"cart-config-v3"`) | ✅ |
| `tableId` in cart store | `useCartStore` in-memory only | ❌ — lost on reload; restored by the menu's QR scan |
| Guest access token | `useAuthStore` in-memory only (never localStorage — XSS rule) | ❌ — re-minted by `GET /auth/me` |

When Hoa taps "Thêm món", the menu page sees `activeOrderId !== null` in the cart store and knows
it should post to `POST /orders/:id/items` rather than create a new order.

Detail → [customer_order_list_crosspage_dataflow.md].

### C. FE → BE sends in this scenario

| Beat | Endpoint | Called from | Auth |
|---|---|---|---|
| Sheet open (T+0:04) | `GET /orders/:id` | `useOrderSSE.ts:56` | Bearer guest JWT |
| SSE stream open (T+0:05) | `GET /orders/:id/events` | `useOrderSSE.ts:69` | Bearer guest JWT |
| Item cancel (T+0:12) | `DELETE /orders/items/:id` | `OrderDetailSheet.tsx:65` | Bearer guest JWT |

The list page itself (`order/page.tsx`) makes **zero** BE calls. All three calls above go through
the single Axios instance `api` (`lib/api-client.ts`), which injects the `Authorization: Bearer`
header via request interceptor.

### D. BE → FE receive / live updates

| SSE event | Payload fields used | FE handler | Effect |
|---|---|---|---|
| `connected` | `order_id` | (no case in switch — ignored) | No-op; stream is open |
| `item_progress` | `item_id`, `qty_served` | `useOrderSSE.ts:104-117` | Patches one item's `qty_served`; progress memo recomputes; bar moves |
| `order_status_changed` | `status`, `eta?` | `useOrderSSE.ts:87-96` | Updates `order.status`; triggers `notification` modal on `confirmed`/`ready`/`cancelled` |
| `order_cancelled` | — | `useOrderSSE.ts:98-103` | Sets status `cancelled`; fires notification modal; sets `stopped=true`; aborts stream |
| `order_completed` | — | `useOrderSSE.ts:118-122` | Sets status `delivered`; sets `stopped=true`; aborts stream |
| `item_cancelled` | *(emitted by BE at `order_service.go:642`)* | **no case** | ❓ UNVERIFIED effect — event arrives but switch falls through silently; see Flag 2 |

Heartbeat: the BE emits `: keep-alive` every 15 s (`sse/handler.go:14,65`). The FE's
`fetchEventSource` library handles it transparently — no FE code handles it.

Redis fan-out: `publishOrderEvent` always writes to both `order:<id>` (customer SSE) **and**
`orders:kds` (kitchen/admin board) (`order_service.go:814-818`). The `item_progress` event that
moves Hoa's progress bar also updates the KDS display for the chef simultaneously.

### E. Loading + caching

Loading strategy detail → [customer_order_list_loading.md].

Summary for this scenario:

| Moment | What renders | Latency |
|---|---|---|
| Bottom nav tap → `/order` mounts | Cards from `localStorage` (`STORAGE_KEYS.ORDER_CACHE`) | ~0 ms — no network |
| Card tap → sheet mounts | Cached `Order` from `localStorage` via `useOrderSSE.ts:33-38` | ~0 ms — no network |
| REST snapshot arrives (T+0:04) | Fresh `Order` overwrites state; progress bar corrects | 1 network hop |
| SSE `item_progress` event | Surgical patch on one item; no full refetch | push — no poll |

There is **no Redis read-cache** on any of the four endpoints; orders always hit MySQL directly
(`customer_order_list_be.md §Caching`). Redis is used only as pub/sub fan-out.

The list page has **no loading spinner and no skeleton**. If `localStorage` is empty, it renders the
empty-state illustration immediately (`order/page.tsx:75-87`). There is no `loading.tsx` for the
`/order` route — confirmed by absence of that file in `fe/src/app/(shop)/order/`.

> ❓ UNVERIFIED: whether a `loading.tsx` or `Suspense` wrapper exists for the `(shop)` layout
> that would add a spinner at the route level before `OrderListPage` renders. The page component
> itself is `'use client'` and renders synchronously from cache.

### F. Monitoring

All three BE calls in this scenario are visible in the Grafana dashboard at `:3001` (dashboard
"BanhCuon — API Monitoring"):

- `GET /orders/:id` — counted in Request Rate; p95 is the key metric (straight MySQL read, no
  cache).
- `DELETE /orders/items/:id` — counted in Request Rate; a spike of 422s in Error Rate indicates
  customers hitting the already-served or status guard.
- The SSE connection is a long-lived HTTP GET; it appears as one request in the rate panel and
  holds a goroutine for its duration.

Alerting rules (exactly two): `HighErrorRate` (5xx > 5% over 5 min → critical) and
`SlowResponseTime` (p95 > 500 ms over 5 min → warning). Neither is likely to fire for a single
item-cancel, but a burst of concurrent SSE streams could surface in p95.

Monitoring config → `monitoring/` (never edit the docs copy; the running config lives there).

---

## Flags Surfaced by This Scenario

| # | Flag | Source |
|---|---|---|
| 1 | **List cards are stale until the sheet is opened.** `order/page.tsx` renders directly from `localStorage` with no refresh — a card's progress can lag if `qty_served` changed on another device since last cache write. | `customer_order_list_be.md §Flags #1` |
| 2 | **`item_cancelled` SSE event is silently dropped.** `order_service.go:642` emits it; `useOrderSSE.ts:83-123` has no `item_cancelled` case. The cancelled item stays visible in the sheet until next snapshot. | `customer_order_list_be.md §Flags #2` |
| 3 | **A 404 leaves the sheet on the spinner forever.** `useOrderSSE` sets `isNotFound` (`useOrderSSE.ts:60`) but `OrderDetailSheet.tsx:45` does not destructure that value — the spinner at `OrderDetailSheet.tsx:206-212` never resolves. | `customer_order_list_be.md §Flags #3` |
| 4 | **SSE has no ownership check.** `StreamOrder` verifies the token but not the order's `table_id` (`sse/handler.go:21-70`). Any authenticated client that knows the order id can subscribe to its live channel. | `customer_order_list_be.md §Flags #4` |

---

## The One-Line Mental Model

> The `/order` page is a **localStorage photo album** that upgrades one card at a time — tap a
> card and that order comes alive: a REST snapshot corrects the stale photo, then an SSE stream
> patches it dish-by-dish until the customer either cancels or walks away to order more.
