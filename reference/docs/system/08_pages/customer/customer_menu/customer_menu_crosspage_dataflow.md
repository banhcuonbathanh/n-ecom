# Customer Menu — Cross-Page Data Flow (the order, after it leaves `/menu`)

> **What this is:** the **cross-page** companion to
> [customer_menu_crosscomponent_dataflow.md](customer_menu_crosscomponent_dataflow.md).
> That file answered *"how do the widgets on one page share data?"* — this one answers the next
> question: **once `/menu` POSTs the order, how is that order's data shared across the pages that
> outlive the cart — the order detail page, the order list, the live tracking page, and the admin
> floor?**
>
> The trap this file clears up: there is **no single store** spanning these pages. **Two separate
> hubs** do the work, and they live in different places —
> - an **in-browser hub** (`order_cache_<id>` in localStorage + `activeOrderId` in the persisted
>   cart store + the order id in the URL) that ties together the **customer's own** pages, and
> - a **server hub** (the one BE `order` row, same `order.id`) that is the **only** thing connecting
>   the customer's browser to the **staff/admin** devices.
>
> Traced from source on branch `experience_claude.md_system_1_test_iphon2_change_code`:
> [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) ·
> [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts) ·
> [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) ·
> [`fe/src/hooks/useOrderSSE.ts`](../../../../../fe/src/hooks/useOrderSSE.ts) ·
> [`fe/src/hooks/useOrderMonitorSSE.ts`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts) ·
> [`fe/src/hooks/useOverviewWS.ts`](../../../../../fe/src/hooks/useOverviewWS.ts) ·
> [`fe/src/hooks/useAdminSSE.ts`](../../../../../fe/src/hooks/useAdminSSE.ts).

---

## 0. The whole picture on one diagram

```
   ┌───────────────────────── ONE PHONE (the guest's browser/session) ─────────────────────────┐
   │                                                                                            │
   │                  ┌──────────────────── in-browser hub ────────────────────┐               │
   │                  │  order_cache_<id>   localStorage   "what is order X?"   │               │
   │                  │  activeOrderId      cart store     "which am I following?"              │
   │                  │  <id>               the URL        "shareable / reloadable"             │
   │                  └────────────────────────────────────────────────────────┘               │
   │                     ▲ write(201)      ▲ read(all)        ▲ read(active)                     │
   │                     │                 │                  │                                  │
   │   /menu ─POST──────┘                  │                  │                                  │
   │     │  clearCart()                    │                  │                                  │
   │     │  setActiveOrderId(id)      /order (list)       /tracking                              │
   │     │  router.replace ──▶  /order/<id> ──"Theo dõi"──▶ (reads activeOrderId)                │
   │     │                       detail + SSE                                                    │
   │     └─ "Đặt thêm" ─▶ /menu?add_to_order=<id>   (cart writes back onto the SAME order)       │
   │                                                                                            │
   └────────────────────────────────────┬───────────────────────────────────────────────────┘
                                         │
   ═══════════════════════ THE WIRE — the BE is the real hub ═══════════════════════════════════
                                         │
                            ┌────────────▼────────────┐
                            │   one  order  row        │   MySQL (durable) + Redis (pub/sub)
                            │   order.id  ·  status    │
                            └──┬───────────────────┬───┘
            customer side      │                   │       staff / admin side
   ◀── GET /orders/:id ────────┤                   ├──── new_order ping ──▶ /sse/admin
   ◀── SSE /orders/:id/events ─┤                   ├──── orders WS ───────▶ item_progress · status
   ◀── SSE /sse/order-monitor/:id                  └──── GET /orders/:id ─▶ ['orders','live'] cache
        (queue · ETA · floor)                            (admin shares NO browser state w/ customer)
```

**Read it like this:** everything *inside the box* is one phone — three customer pages reading two
browser-local keys + the URL. Everything *below the double line* is the BE. The admin floor never
sees the customer's `order_cache` or `activeOrderId`; the **only** datum it shares with the guest is
`order.id`, and it re-fetches the row itself.

```
   LEGEND   ──▶ navigation / HTTP        ◀── SSE/WS push (server → browser)
            ▓ localStorage (per-browser, survives F5)   ░ memory (dies on F5)
```

---

## 1. The status lifecycle every page renders against

All five pages render the **same** `OrderStatus` enum ([`order.ts:29`](../../../../../fe/src/types/order.ts)).
Knowing this one machine explains every badge, every SSE event, and every "is this order still
active?" filter downstream:

```
                       (staff confirm)     (KDS start)      (all items served)   (handed to guest)
   POST /orders                │                │                  │                   │
        │      pending ───────────▶ confirmed ─────▶ preparing ───────▶ ready ───────────▶ delivered
        │         │                                                                         │
        │         │                                                                         ▼
        │         └──────────────────── cancelled ◀── (staff/guest cancel, any active state)
        │                                                                                  paid
        ▼                                                                          (after payment)
   item-level (per OrderItem.qty_served):   pending(0) ─▶ preparing(0<n<qty) ─▶ done(n≥qty)
                                            └─ deriveItemStatus() drives the progress bars ─┘
```

| Status | Set by | Customer sees | In admin `['orders','live']`? |
|---|---|---|---|
| `pending` | `POST /orders` | "chờ xác nhận" | ✅ active |
| `confirmed` | staff | toast "đã xác nhận" + ETA | ✅ active |
| `preparing` | KDS | progress bar fills | ✅ active |
| `ready` | KDS | toast "sẵn sàng" | ✅ active |
| `delivered` | staff | order closes, SSE stops | ✅ active *(then dropped)* |
| `cancelled` | staff/guest | toast "đã huỷ", SSE stops | ❌ filtered out |
| `paid` | payment | history only | ❌ filtered out |

> The admin `ACTIVE` set is literally `{pending, confirmed, preparing, ready, delivered}`
> ([`useOverviewWS.ts:8`](../../../../../fe/src/hooks/useOverviewWS.ts)) — any transition **out** of
> it removes the card from the live floor. The customer's `useOrderSSE` instead **stops** its SSE
> loop on `cancelled`/`delivered` ([`useOrderSSE.ts:98-122`](../../../../../fe/src/hooks/useOrderSSE.ts)).

---

## 2. The moment of handoff — what `/menu` leaves behind

This is the seam. The cross-component doc ends at
[its Step 9](customer_menu_crosscomponent_dataflow.md#step-9--handoff-and-forget); this file begins
there. On `201`, `TableConfirmModal` (or `/checkout`) does exactly **three writes**, then navigates:

```
   POST /orders ───────────▶ 201 { id, order_number, status:"pending", items[], total_amount }
        │
        │   ① localStorage["order_cache_<id>"] = JSON(order)      ▓ survives F5, per-browser
        │   ② clearCart()  — empties DRAFT (items/payment/note)   ░ KEEPS tableId/tableName/activeOrderId
        │   ③ setActiveOrderId("<id>")                            ▓ persisted (partialize) — recovery pointer
        ▼
   router.replace('/order/<id>')        (replace, not push → back-button can't re-submit)
```

```
   STORE / STORAGE THE INSTANT BEFORE NAVIGATION
   ┌────────────────────────────────────────────────────────────────────┐
   │ ▓ localStorage["order_cache_<id>"] = {                              │
   │       id, order_number:"#A12", status:"pending",                    │
   │       table_name:"04", total_amount:103000, items:[ … ] }           │
   │                                                                      │
   │ ░ cart store (memory):   items=[]   tableId+tableName KEPT (identity)│
   │ ▓ cart store (persisted, CART_CONFIG v5):                           │
   │       { orderNote, activeOrderId:"<id>" }   ← persisted survivors    │
   └────────────────────────────────────────────────────────────────────┘
```

| # | Write | Where it lands | Who reads it later | Source |
|---|---|---|---|---|
| ① | `order_cache_<id> = JSON(order)` | ▓ localStorage | `/order/<id>` (instant paint) **+** `/order` list (history) | [`TableConfirmModal.tsx:37`](../../../../../fe/src/features/menu/components/TableConfirmModal.tsx) |
| ② | `clearCart()` | ░ cart store memory | empties only the **draft** (`items`/`paymentMethod`/`orderNote`); **keeps** `tableId`/`tableName`/`activeOrderId` (overrides Invariant 5) | [`cart.ts:89`](../../../../../fe/src/store/cart.ts) |
| ③ | `setActiveOrderId(<id>)` | ▓ cart store, persisted | `/tracking` (no URL id — see §5) **+** `/menu` `ActiveOrderRecoveryBanner` (order-recovery) | [`cart.ts:93,153`](../../../../../fe/src/store/cart.ts) |

> **Why two keys, not one?** `order_cache_<id>` answers *"what is this specific order?"* (keyed by
> id — many can coexist). `activeOrderId` answers *"which order is the guest currently on?"* (exactly
> one). It now serves **two** readers: `/tracking` (reached with no id in its path) and the `/menu`
> recovery banner (resume "gọi thêm" after navigating away). The pointer is cleared on terminal status
> (`paid`/`cancelled`) by the `/order/:id` page.

---

## 3. `order_cache_<id>` — the in-browser order record (a self-refreshing cache)

`STORAGE_KEYS.ORDER_CACHE = "order_cache_"` ([`storage-keys.ts:3`](../../../../../fe/src/lib/storage-keys.ts));
the full key is the prefix + the order id. It is written in **three** places and read in **two**, and
it is the single mechanism that lets an order survive a reload or a tab switch.

```
   WRITERS                                READERS
   ─────────────────────                  ─────────────────────────────────
   TableConfirmModal  (201) ──┐           ┌── /order/<id>   seed on mount     (useOrderSSE)
   /checkout          (201) ──┼──▶ ▓ ──┤
   useOrderSSE  (every delta) ┘  order_   └── /order (list) scan ALL keys     (no network!)
                                 cache_<id>
```

**The self-refresh loop** — this is the subtle part. `useOrderSSE` doesn't just *read* the cache;
it **writes the merged order back on every state change** ([`useOrderSSE.ts:41-46`](../../../../../fe/src/hooks/useOrderSSE.ts)):

```
   ┌─────────────────────────────────────────────────────────────────────┐
   │  /order/<id> mounts                                                   │
   │     │  ① read order_cache_<id>  ──▶ setState  ──▶ INSTANT paint ▓     │
   │     │  ② GET /orders/:id        ──▶ setState  ──▶ writes back ──▶ ▓   │
   │     │  ③ SSE delta arrives      ──▶ setState  ──▶ writes back ──▶ ▓   │
   │     ▼                                                                 │
   │  order_cache_<id> is now FRESHER than when /menu wrote it             │
   └─────────────────────────────────────────────────────────────────────┘
```

That is why the `/order` **list** — which makes **no network call at all**
([`order/page.tsx:10-24`](../../../../../fe/src/app/(shop)/order/page.tsx)) — still shows reasonably
fresh statuses, progress bars, and served counts: it is reading the snapshots the detail page last
persisted. The list iterates **every** `order_cache_*` key, parses each, and sorts newest-first:

```
   ▓ order_cache_<A>  status:preparing  3/5 served  ┐
   ▓ order_cache_<B>  status:delivered  5/5 served  ┼─ loadCachedOrders() scans, parses, sorts ─▶
   ▓ order_cache_<C>  status:pending    0/4 served  ┘     "Đơn hàng của bạn"  (newest first)
        │
        └─ "Xoá lịch sử" removes ALL order_cache_* keys  ([order/page.tsx:41-51])
```

> **The cached object is the full `Order`** ([`order.ts:38`](../../../../../fe/src/types/order.ts)):
> `id · order_number · status · source · table_name · total_amount · items[]`. The list filters
> combo headers (`combo_id && !combo_ref_id`) before counting, and derives progress from
> `Σ qty_served / Σ quantity` ([`order/page.tsx:91-94`](../../../../../fe/src/app/(shop)/order/page.tsx)).

---

## 4. `/order/<id>` — the order detail / live page (id travels in the URL)

The order id is carried **in the path** (`router.replace('/order/<id>')`), so this page is fully
shareable / reloadable without the store. It is driven by `useOrderSSE(params.id)`
([`order/[id]/page.tsx:41`](../../../../../fe/src/app/(shop)/order/[id]/page.tsx)) in three phases:

```
   t0  mount         t1  ~50ms            t2  REST returns        t3+  live
   ──────────        ─────────            ────────────────        ─────────────────
   read ▓ cache  ──▶ INSTANT paint   ──▶  GET /orders/:id    ──▶  SSE /orders/:id/events
   (may be stale)    (no spinner)         authoritative snap       deltas patch in place
        │                                      │                        │
        │                                 404 ─┴─▶ "không tìm thấy"      ├─ order_status_changed
        │                                                               ├─ item_progress (qty_served)
        └──────────────── all three write back to ▓ cache ──────────────┼─ order_cancelled  → STOP
                                                                         └─ order_completed  → STOP
```

> The SSE channel relays Redis pub/sub **only** and never emits an initial snapshot, so the page must
> seed itself via REST first — that's why phase ② exists ([`useOrderSSE.ts:51-62`](../../../../../fe/src/hooks/useOrderSSE.ts)).
> Reconnect is exponential backoff, max 5 attempts, banner after 3 ([`useOrderSSE.ts:16-21`](../../../../../fe/src/hooks/useOrderSSE.ts)).

This page is also the **fork point** back into the other pages:

```
                         ┌─ "Theo dõi" ───▶ setActiveOrderId(id) ──▶ router.push('/tracking')
   /order/<id>  ─────────┼─ follow toggle ─▶ setActiveOrderId(isActive ? id : null)
                         ├─ "Đặt thêm món" ▶ router.push('/menu?add_to_order=<id>')  ──┐
                         └─ "Huỷ đơn" ─────▶ cancel mutation ──▶ router.push('/menu')   │
                                                                                        │
   /menu  ◀───────────────── re-enter in APPEND mode (AddToOrderBanner) ◀───────────────┘
          cart POSTs onto THIS order instead of creating one
```

| Button | Action | Cross-page effect | Source |
|---|---|---|---|
| **Theo dõi** | `setActiveOrderId(id); push('/tracking')` | promotes this order to "the followed one" | [line 564](../../../../../fe/src/app/(shop)/order/[id]/page.tsx) |
| follow toggle | `setActiveOrderId(isActive ? id : null)` | set/clear the tracked order | [line 574](../../../../../fe/src/app/(shop)/order/[id]/page.tsx) |
| **Đặt thêm món** | `push('/menu?add_to_order=<id>')` | re-enter `/menu` in append mode | [line 575](../../../../../fe/src/app/(shop)/order/[id]/page.tsx) |
| **Huỷ đơn** | cancel mutation → `setActiveOrderId(null)` → `push('/menu')` | order → `cancelled`, fans out over SSE; pointer cleared | [line 65](../../../../../fe/src/app/(shop)/order/[id]/page.tsx) |

> **`?add_to_order=<id>` closes the loop.** It sends data *back* into `/menu`: the order id flows
> menu → order → **back to menu**, and the cart's POST targets the existing order. There are now **two**
> ways to re-enter append mode: (1) the explicit **"Đặt thêm món"** button (id via the URL), and (2) the
> `ActiveOrderRecoveryBanner` on `/menu` reading the persisted `activeOrderId` (no QR re-scan, no URL id
> needed). See [customer_menu.md → Key Interactions](customer_menu.md#key-interactions).

---

## 5. `/tracking` — live monitoring (no URL id, reads `activeOrderId`)

`/tracking` is reached from the bottom nav with **no id in its path**, so unlike `/order/<id>` it
**cannot** read the URL — it reads the persisted pointer instead
([`tracking/page.tsx:18`](../../../../../fe/src/app/(shop)/tracking/page.tsx)):

```
   ▓ cart store (persisted) ── activeOrderId ──▶ /tracking
                                    │
                                    ├─ null  ──▶ "Chưa có đơn đang theo dõi"  [Về trang menu]
                                    └─ "<id>" ─▶ useOrderMonitorSSE("<id>")  ──▶ live floor view
```

That single read is why Step ② of the handoff (§2) persisted `activeOrderId` at all. With the id in
hand, the page opens a **second, different** SSE channel — and this is a point worth drawing out,
because the two customer pages watch the **same order over two different channels**:

```
   ┌──────────────────────────────────────────┬──────────────────────────────────────────┐
   │  /order/<id>          useOrderSSE          │  /tracking        useOrderMonitorSSE       │
   ├──────────────────────────────────────────┼──────────────────────────────────────────┤
   │  channel: /orders/:id/events              │  channel: /sse/order-monitor/:id          │
   │  scope:   THIS order's lifecycle          │  scope:   this order + the WHOLE floor    │
   │  id from: URL param                       │  id from: activeOrderId (store)           │
   │  events:  order_status_changed            │  events:  order.status                    │
   │           item_progress                   │           queue.update (position/ETA)     │
   │           order_cancelled / _completed    │           tables.status (floor)           │
   │                                           │           items_added/updated/cancelled    │
   │  seeds:   ▓ order_cache + REST            │           → itemsChangedAt → refetch       │
   │  on 401:  retries                         │  on 401/403: PERMANENT stop → "quét lại QR"│
   └──────────────────────────────────────────┴──────────────────────────────────────────┘
```

What the monitor channel carries that the detail page never needs ([`useOrderMonitorSSE.ts:63-89`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts)):

| SSE `data.type` | Computes | Renders |
|---|---|---|
| `order.status` | own order status | TableInfoBanner badge |
| `queue.update` | `position = idx+1`, `total`, `ETA = idx*3` min | TableInfoBanner + WholeFloorPrepList |
| `tables.status` | per-table `serving/waiting/empty` | floor queue |
| `items_added` / `item_updated` / `item_cancelled` | `itemsChangedAt = Date.now()` ⇒ refetch `GET /orders/:id` | OrderDetailCard |

> See [customer_tracking.md](../customer_tracking/customer_tracking.md) for the full zone breakdown.
> A `401`/`403` here means the **guest JWT (2 h) expired** and is treated as permanent — the retry
> loop stops and the page shows "quét lại mã QR" ([`useOrderMonitorSSE.ts:54-58`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts)).

---

## 6. Admin / staff — the server is the only shared hub

Here is the part that surprises people: **the admin floor shares no browser state with the customer.**
No `order_cache`, no `activeOrderId`, no cart — those keys live in the guest's phone. The admin learns
about the same order purely from the **BE**, keyed off the same `order.id`:

```
   ┌──── guest phone ────┐         ┌──── BE (the hub) ────┐         ┌──── admin device ────┐
   │  POST /orders ──────┼────────▶│   order row created  │         │                      │
   │                     │         │   (status:pending)   │──ping──▶│ /sse/admin           │
   │                     │         │        │             │         │   new_order {id,…}   │
   │                     │         │        │             │◀────────┤ GET /orders/:id      │
   │                     │         │        │             │         │   → ['orders','live']│
   │  ◀── SSE patches ───┼─────────┤        │             │──WS────▶│ orders WS:           │
   │     /orders/:id/…   │         │        ▼             │         │   item_progress      │
   │     /sse/order-mon… │         │  staff taps KDS ─────┼────────▶│   order_status_changed
   └─────────────────────┘         └──────────────────────┘         └──────────────────────┘
```

| Step | Admin mechanism | File |
|---|---|---|
| 1. order is born | `/sse/admin` pushes a lightweight `new_order` ping (`order_id`, `order_number`, `table_id`) | [`useAdminSSE.ts:30-48`](../../../../../fe/src/hooks/useAdminSSE.ts) |
| 2. hydrate | admin `GET /orders/:id`, inserts into the `['orders','live']` TanStack cache (only if `ACTIVE`) | [`useOverviewWS.ts:22-31`](../../../../../fe/src/hooks/useOverviewWS.ts) |
| 3. live patches | orders **WS** relays `item_progress` / `order_status_changed` / `order_updated`; non-active statuses dropped | [`useOverviewWS.ts:33-66`](../../../../../fe/src/hooks/useOverviewWS.ts) |

**Two consequences worth remembering:**
- The customer's `order_cache_<id>` and the admin's `['orders','live']` entry are **independent
  copies** of the same row, each kept fresh by its **own** realtime channel. They never read each
  other; they only agree because they both descend from the one BE order.
- Staff actions mutate the **BE** row, which fans back out to the customer — and that is best seen as
  one diagram (next section).

---

## 7. Multi-device sync — one staff tap, three screens move

This is the cross-page flow at its widest: a single staff action on the KDS updates the admin floor
**and** both customer pages, with **no browser-to-browser path** — always BE → SSE/WS fan-out.

```
   STAFF taps "served +1" on item X (order A)
        │
        ▼
   PATCH /orders/A/items/X   ──▶  BE updates order_items.qty_served  ──▶  Redis publish
        │                                                                    │
        │                          ┌─────────────────────────────────────────┼───────────────────────┐
        ▼                          ▼                                         ▼                         ▼
   ADMIN floor                CUSTOMER /order/A                       CUSTOMER /tracking          (other guests'
   orders WS: item_progress   SSE item_progress                      SSE items_* → refetch        /tracking floor
   → ['orders','live'] patch  → setOrder(qty_served++)               GET /orders/A                queue.update)
   → progress bar moves       → ▓ order_cache_A written back         → OrderDetailCard moves      → WholeFloorPrepList
                              → progress bar moves                                                  re-sorts
```

```
   THE INVARIANT:  no arrow goes phone → phone or phone → admin directly.
                   Every cross-device update is  device → BE → (Redis) → device.
                   The BE order row is the single source; SSE/WS are just its loudspeakers.
```

---

## 8. Cancellation — two initiators, two endpoints, one fan-out

A cancel is the most instructive cross-page event because **who** cancels changes the *endpoint*, the
*gate*, and *what the guest sees* — yet it all converges on the same `order_cancelled` broadcast.

```
   ┌──────────────────────────────────────┬──────────────────────────────────────────┐
   │  CLIENT cancels (from /order/<id>)    │  ADMIN cancels (from admin floor)          │
   ├──────────────────────────────────────┼──────────────────────────────────────────┤
   │  endpoint: DELETE /orders/:id         │  endpoint: PATCH /orders/:id/status        │
   │            (item: DELETE              │            { status: "cancelled" }         │
   │             /orders/items/:id)        │                                            │
   │  gate (FE): progress < 30% AND        │  gate (FE): status ∈                       │
   │             status ∈ {confirmed,      │             {confirmed, preparing, ready}  │
   │                       preparing}      │             ← admin CAN cancel `ready`     │
   │  after:    router.push('/menu')       │  after:    optimistic ['orders','live']    │
   │            (guest leaves the page)    │            then WS confirms                │
   │  guest sees: just a toast "Đã huỷ"    │  guest sees: "Nhà hàng đã huỷ đơn của bạn" │
   │              (never the modal below)  │              modal — pushed via SSE        │
   └──────────────────────────────────────┴──────────────────────────────────────────┘
```

> **Why two different endpoints for "the same thing"?** The client uses **DELETE** (it owns the order
> and asks to remove it); the admin uses **PATCH status** (a staff state transition, same verb used
> for `confirmed`/`ready`). Both land the BE row in `status = cancelled` and publish the **same**
> `order_cancelled` to `order:{id}` + `orders:kds` — so the fan-out is identical regardless of who
> pulled the trigger.

### 8a. Client cancels their own order

```
   GUEST on /order/<id>                                    BE / Redis            other screens
   ───────────────────                                     ──────────            ─────────────
   "Huỷ toàn bộ đơn hàng"   (button shows only if          │                     │
        │                    progress<30 && confirmed/      │                     │
        │                    preparing — [page.tsx:233,550])│                     │
        ▼                                                   │                     │
   confirm modal → cancelOrderMutation                      │                     │
        │  DELETE /orders/:id ───────────────────────────▶ status=cancelled       │
        │                                                   │── order_cancelled ──▶ admin floor:
        │◀── 201 → toast "Đã huỷ đơn hàng"                  │   (publish)           │  ACTIVE.has(cancelled)=false
        │    router.push('/menu')  ░ guest leaves           │                     │  → drop from live cache
        ▼                                                   │                     │  → appears in CancelLog
   (per-item variant: DELETE /orders/items/:id —            │                     │
    cancelItemMutation / cancelMultiMutation for the        │                     │
    "Huỷ N món còn lại" combo case — [page.tsx:68-76])      │                     │
```

- The customer who cancels is **redirected to `/menu`** and never sees the "đã bị huỷ" modal — that
  screen is for cancels that arrive *while they are watching* (see 8b).
- A `CANCEL_THRESHOLD` error (BE rejects because ≥ 30% served) surfaces as a toast
  ([`order/[id]/page.tsx:66`](../../../../../fe/src/app/(shop)/order/[id]/page.tsx)).
- ⚠️ **DRIFT (owner decision 2026-06-12):** the target rule is *"customer can cancel any time until
  payment completes"*, but the code still enforces `progress < 30% && {confirmed, preparing}`. The FE
  here mirrors the **old** rule — see [LOGIC_FE §5 DRIFT](../../../07_business_logic/LOGIC_FE.md) /
  [LOGIC_BE §3](../../../07_business_logic/LOGIC_BE.md#3--cancel-rule--drift).

### 8b. Admin cancels — the customer finds out over SSE

This is the cross-device case in full: the guest is passively watching when staff pulls the order.

```
   ADMIN floor                         BE / Redis                  CUSTOMER (passively watching)
   ───────────                         ──────────                  ─────────────────────────────
   OrderDetail "Huỷ"  (shows if        │                           │
     status ∈ confirmed/preparing/     │                           │
     ready — [OrderDetail.tsx:29])     │                           │
        │ onAction(id,'cancelled')     │                           │
        ▼                              │                           │
   handleAction → updateOrderStatus    │                           │
     PATCH /orders/:id/status ───────▶ status=cancelled            │
        │ optimistic: ['orders','live']│── order_cancelled ────────▶ /order/<id> useOrderSSE:
        │   patched, WS confirms then  │   (publish to order:{id})  │   • setOrder(status=cancelled)
        │   drops it (not ACTIVE)      │                           │   • notification{kind:'cancelled'}
        │ → moves to Zone F/CancelLog  │                           │   • SSE loop STOPS  ([useOrderSSE.ts:98])
        │                              │                           │   • ▓ order_cache_<id> written back
        │                              │── (order.status) ─────────▶ /tracking useOrderMonitorSSE:
        │                              │                           │   • TableInfoBanner → cancelled
        ▼                              │                           ▼
   live floor no longer shows it       │              MODAL: "Đơn hàng đã bị huỷ —
                                       │               Nhà hàng đã huỷ đơn của bạn.
                                       │               Vui lòng liên hệ nhân viên."  [page.tsx:622]
```

- The "Nhà hàng đã huỷ đơn của bạn" modal is the customer-facing tell that **someone else** cancelled
  — it is driven by the `order_cancelled` SSE event, not by the guest's own action.
- Admin's gate includes `ready`, so staff can cancel an order the customer's own UI would have
  blocked. The endpoints differ (PATCH vs DELETE) but the resulting status and fan-out are identical.
- On the admin side the cancelled order leaves `['orders','live']` (fails the `ACTIVE` filter) and
  surfaces in **CancelLog** / Zone F, which simply filters `status === 'cancelled'`
  ([`CancelLog.tsx:25`](../../../../../fe/src/features/admin/components/CancelLog.tsx)).

### 8c. Where a cancel lands on every surface

| Surface | Channel | Effect of `order_cancelled` |
|---|---|---|
| `/order/<id>` (initiator) | mutation success | toast + `router.push('/menu')` |
| `/order/<id>` (watcher) | SSE `order_cancelled` | "đã bị huỷ" modal, SSE stops, ▓ cache updated |
| `/tracking` | SSE `order.status` | TableInfoBanner → `cancelled` |
| `/order` (list) | ▓ cache (next visit) | card shows `cancelled` badge, no progress bar |
| admin floor | WS `order_status_changed` | dropped from `['orders','live']` → CancelLog / Zone F |

---

## 9. End-to-end timeline — the order across all pages and devices

```
 Guest         /menu          in-browser hub        /order/<id>      /tracking        BE / Redis        Admin
  │            (cart)         (▓ cache, store)        (useOrderSSE)   (monitorSSE)                       floor
  │              │                  │                     │              │                │              │
  ├ Thanh toán ─▶ POST /orders ─────┼─────────────────────┼──────────────┼──────────────▶ create row    │
  │              │                  │                     │              │           201 │── new_order ─▶│
  │              │◀─ ① order_cache_<id>=JSON ◀────────────┼──────────────┼────────────────┤              │
  │              │◀─ ② clearCart() (keeps id)─┐           │              │                │◀ GET /orders/:id
  │              │◀─ ③ setActiveOrderId(id)  │            │              │                │   → live cache
  │              │   router.replace ─────────┼──────────▶ mount          │                │              │
  │              │                  │  read ▓ cache ─────▶ instant paint  │                │              │
  │              │                  │        GET /orders/:id ───────────────────────────▶ snapshot       │
  │              │                  │        open SSE /orders/:id/events ◀──────────────── (idle)         │
  │              │                  │                     │              │                │              │
  │ (staff confirm) ───────────────┼─────────────────────┼──────────────┼───────────────▶ status=confirmed
  │              │                  │   order_status_changed ◀───────────┼──────────────── publish ─────▶│ WS patch
  │              │                  │◀── ▓ cache written back             │                │              │
  │              │                  │        toast "đã xác nhận + ETA"    │                │              │
  │              │                  │                     │              │                │              │
  ├ "Theo dõi" ─┼──────────────────┤ setActiveOrderId(id)│              │                │              │
  │              │                  │   router.push('/tracking') ───────▶ mount           │              │
  │              │                  │        read activeOrderId ─────────▶ useOrderMonitorSSE             │
  │              │                  │        open /sse/order-monitor/:id ◀──────────────── queue.update ─▶│
  │              │                  │                     │   position 2/5 · ~6 phút       │              │
  │ (staff served+1) ──────────────┼─────────────────────┼──────────────┼───────────────▶ qty_served++  │
  │              │                  │   item_progress ◀───┤              │                │── publish ──▶│ WS
  │              │                  │                     │  items_* ◀───┤ refetch GET /orders/:id        │
  │              │                  │                     │   bars move  │  card moves    │              │
  │              │                  │                     │              │                │              │
  │ (staff delivered) ─────────────┼─────────────────────┼──────────────┼───────────────▶ status=delivered
  │              │                  │   order_completed ──▶ SSE STOPS    │                │ dropped from │
  │              │                  │                     │              │                │ live cache   │
  ▼  later: /order (list) reads ALL ▓ order_cache_* → shows history, no network call.
```

---

## 10. Reload (F5) behavior — what each page does on a cold load

Because the split between ▓ (localStorage, survives) and ░ (memory, dies) is the whole game, here is
exactly what each page recovers after a hard refresh:

```
   PAGE            HAS URL id?   SOURCE OF TRUTH ON RELOAD            RESULT
   ─────────────   ───────────   ──────────────────────────────────  ──────────────────────────
   /menu           no            ▓ persisted: orderNote+activeOrderId  items ░ gone, BUT recovery banner
                                                                       resumes the live order (activeOrderId)
   /order/<id>     YES           ▓ order_cache → REST → SSE            full recovery (id in URL)
   /order (list)   no            ▓ all order_cache_* keys             full history recovers
   /tracking       no            ▓ activeOrderId (persisted)          recovers the active order
   admin floor     no            REST GET (no localStorage)           re-fetches from BE
```

> **The one gotcha:** `/tracking` has neither a URL id nor its own cache — it relies entirely on
> `activeOrderId` surviving in `partialize`. Since `activeOrderId` is now set on **order creation**
> (not only by "Theo dõi"), it is normally present after placing an order; it goes null only once the
> order is terminal (`paid`/`cancelled`) or the guest cleared storage — then `/tracking` shows the
> empty-state fallback even though `/order/<id>` would still work from the URL.

---

## 11. Durability matrix — what survives what

| Datum | Lives in | Survives F5? | Survives new device? | Scope |
|---|---|---|---|---|
| `items` | ░ cart store (memory) | ❌ (not in `partialize`) | ❌ | `/menu` only, pre-POST (cleared on POST) |
| `tableId`, `tableName` | ░ cart store (memory) | ❌ (not in `partialize`) | ❌ | survive `clearCart()` in-session → enable `/menu` order-recovery; lost on F5 |
| `order_cache_<id>` | ▓ localStorage | ✅ | ❌ (per-browser) | `/order/<id>` + `/order` list |
| `activeOrderId` | ▓ cart store, persisted | ✅ ([`cart.ts:153`](../../../../../fe/src/store/cart.ts)) | ❌ | `/tracking` pointer **+** `/menu` recovery banner |
| order id | the URL | ✅ | ✅ (shareable link) | `/order/<id>`, `?add_to_order=` |
| **the order row** | **BE (MySQL + Redis)** | ✅ | ✅ | **every page, every device** |

> **The mental model in one line:** within one phone, three customer pages coordinate through
> `order_cache_<id>` + `activeOrderId` + the URL id; across devices, the **BE order row is the only
> hub**, and every page (customer detail, customer tracking, admin floor) keeps its own copy fresh
> from its own SSE/WS channel — they agree because they all descend from that single row.

---

## 12. Source & rule map

| Topic | Source of truth |
|---|---|
| On-page (cross-component) flow | [customer_menu_crosscomponent_dataflow.md](customer_menu_crosscomponent_dataflow.md) |
| Page zones / wireframe / object model | [customer_menu.md](customer_menu.md) |
| BE endpoints, auth, caching, errors | [customer_menu_be.md](customer_menu_be.md) |
| Tracking page zones + monitor SSE | [../customer_tracking/customer_tracking.md](../customer_tracking/customer_tracking.md) |
| Full lunch-rush narrative | [SCENARIO_LUNCH_RUSH.md](SCENARIO_LUNCH_RUSH.md) |
| `Order` / `OrderItem` / status types | [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts) |
| Cart store (fields, persist, `partialize`) | [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) |
| localStorage key constants | [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) |
| Customer order SSE | [`fe/src/hooks/useOrderSSE.ts`](../../../../../fe/src/hooks/useOrderSSE.ts) |
| Customer monitor (queue/floor) SSE | [`fe/src/hooks/useOrderMonitorSSE.ts`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts) |
| Admin live orders WS + new-order SSE | [`fe/src/hooks/useOverviewWS.ts`](../../../../../fe/src/hooks/useOverviewWS.ts) · [`useAdminSSE.ts`](../../../../../fe/src/hooks/useAdminSSE.ts) |
| Realtime config (channels, reconnect) | [../../../02_spec/BUSINESS_RULES.md §6](../../../02_spec/BUSINESS_RULES.md#6-realtime-config) |
