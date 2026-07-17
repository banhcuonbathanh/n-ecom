---
page: Theo Dõi Đơn Hàng (guest order monitoring — read-only) — VISUAL SHORT SPEC v2
route: /(shop)/tracking/page.tsx   # URL /tracking
created: 2026-06-11
status: companion to Tracking_Status_Routing_Reference.md (canonical) — diagram-first summary
reads_with: ./Tracking_Status_Routing_Reference.md   # full as-built detail lives there
supersedes: ./Tracking_TEMPLATE_visual_spec.md
---

# Theo Dõi Đơn Hàng — v2 Visual Spec (the short one)

> **Read this to *understand* the page in 5 minutes.** For exact classes, props, line
> numbers → [Tracking_Status_Routing_Reference.md](./Tracking_Status_Routing_Reference.md) (canonical — ⚠️ dated 2026-06-07, predates the v2 page changes below).
>
> **What the page is:** a seated guest's live window into the kitchen. They arrive from
> `order/[id]` ("Theo dõi đơn" sets `activeOrderId` then pushes `/tracking`) or via the
> bottom-nav "Theo Dõi" tab. One HTTP GET loads the receipt; one SSE connection streams the
> whole-floor queue. **Read-only:** the guest changes **nothing** from here.

> **Changed from v1 (all verified in code 2026-06-11):**
> - **Zone E (TableLayoutMap / sơ đồ bàn) is GONE** from this page — `tables.status` data is
>   still received by the hook but the page discards it (§8 R6).
> - **Zone D is now `WholeFloorPrepList`** — whole-floor active queue (table + status pill +
>   order suffix), own row highlighted by `orderId` match. The old `ServiceQueueList` /
>   `ServiceQueueItem` are imported by **nothing** → dead files (§8 R4).
> - **Bottom nav moved to the layout.** `ClientBottomNav` renders from `(shop)/layout.tsx`
>   on every client page — 5 tabs (Menu · Đơn Hàng · Yêu Thích · Theo Dõi · Cài Đặt).
>   The **"Làm Mới" button is gone** and `reconnect()` now has no caller (§8 R5).
> - New **"Ẩn/Hiện bàn của bạn"** toggle (Eye/EyeOff) — collapses Zones B + C.
> - BE now sends an **initial snapshot on connect** (`queue.update` + `tables.status`) —
>   Zone D no longer waits for the next status change to first paint.

---

## 1 · Component Map

`page.tsx` is **both** shell and brain — Pattern B, one `'use client'` component. It runs the
single order query and the SSE hook; live state lives **inside the hook**, the page just
consumes its return values and passes props down. **Zones never talk to each other.**

```
TrackingPage (page.tsx)               ← 'use client' brain (no Suspense/RSC split)
│   useQuery(['order', orderId])  +  useOrderMonitorSSE(orderId)   (hooks/useOrderMonitorSSE.ts)
│
├─ MonitoringTopBar ........... A    Soup icon + title + LIVE/Mất kết nối pill (sticky top-0 z-20)
├─ ConnectionErrorBanner ...... —    "⚠️ Mất kết nối — đang thử lại..." only when !sseConnected (fixed top z-50)
├─ [Ẩn/Hiện bàn của bạn] ...... —    Eye/EyeOff toggle → showTable (collapses B + C)
├─ TableInfoBanner ............ B    table chip + StatusBadge + queue pos/ETA; green "đã phục vụ" on delivered
├─ OrderDetailCard ............ C    the receipt — combo headers hidden, toppings from toppings_snapshot
└─ WholeFloorPrepList ......... D    whole-floor active queue ("N bàn"), own row = primary border + "(bàn bạn)"

(layout, NOT this page)
└─ ClientBottomNav ............ F    (shop)/layout.tsx — Menu · Đơn Hàng · Yêu Thích · Theo Dõi · Cài Đặt
```

**How it actually lays out (mobile, 375px — the only target):**

```
┌════════════════════════════════════════════┐ ← fixed top z-50, only when !sseConnected
│ ⚠️ Mất kết nối — đang thử lại...            │   ConnectionErrorBanner (overlays A)
└════════════════════════════════════════════┘
┌──────────────────────────────────────────────┐ ◄ A  sticky top-0 z-20
│ 🍜 Theo Dõi Đơn Hàng · Bánh Cuốn    ● LIVE  │   success pill / grey "Mất kết nối"
├──────────────────────────────────────────────┤
│ 👁 Ẩn bàn của bạn                            │   toggle — hides B + C below       ▲
├──────────────────────────────────────────────┤ ◄ B (showTable)                    │
│ ┌──────┐  Trạng thái: [Đang chuẩn bị] ~3'   │   StatusBadge + ETA                │
│ │ BÀN  │  Vị trí hàng chờ: #2 trong 4 đơn   │   (pulse on ETA when position 1)   │ scroll
│ │ T.04 │  | Chờ ~3 phút                      │                                    │ body
│ └──────┘                                     │                                    │ (B/C/D
├──────────────────────────────────────────────┤ ◄ C (showTable)                    │  stack,
│ Chi tiết đơn hàng: #ORD-20260611-0007        │                                    │  one
│ ORD-…-0007 · Bàn T.04 · Đặt lúc 14:31:05    │                                    │  flow)
│  x1 Bánh Trứng Chín     + Nhân thịt   9,000đ │   combo HEADERS hidden — children  │
│  x3 Bánh Cuốn           + Nhân thịt  12,000đ │   + món lẻ + canh rows only        │
│  x2 Canh                + Rau mùi tàu     0đ │                                    │
│  ─────────────────────────────────────────── │                                    │
│  Tổng cộng · 6 sản phẩm            21,000đ   │   total_amount from BE             │
├──────────────────────────────────────────────┤ ◄ D  always (when queue non-empty) │
│ Hàng chờ phục vụ                    (4 bàn)  │                                    │
│  ① T.02  [Đang chuẩn bị]              #0004  │   sorted createdAt asc             │
│ ┃② T.04  (bàn bạn) [Chờ xác nhận]    #0007┃◄┼── own row: primary border + bg     │
│  ③ T.09  [Đã xác nhận]                #0008  │                                    │
│  ④ T.08  [Chờ xác nhận]               #0009  │                                    ▼
├──────────────────────────────────────────────┤ ◄ F  fixed bottom-0 z-20 — FROM LAYOUT
│ [Menu] [Đơn Hàng] [Yêu Thích] [●Theo Dõi] [Cài Đặt]
└──────────────────────────────────────────────┘
```

> Z-order top→bottom: ConnectionErrorBanner (50) > A & F (20) > scroll body. The page's
> signature live cue — the own queue row in D — now **works** (matched by `orderId`, not
> table name; the old C2 bug died with the table map).

**The golden rule (this page's variant):** there is no in-page *writer* store — the **SSE hook
is the single writer**. Pushes land in the hook's own `useState`; the page re-renders from the
hook's return values. The only page-local state is the `showTable` toggle.

```
   useOrderMonitorSSE (fetch-event-source)
            │ onmessage → setQueueData / setItemsChangedAt / (setOrderStatus: dead, §6f)
            ▼
   hook state ──returned──► page.tsx ──props──► TableInfoBanner (B) · WholeFloorPrepList (D)
            │                                   MonitoringTopBar (A, sseConnected)
            └─ itemsChangedAt ──useEffect──► refetch(['order', orderId]) ──► OrderDetailCard (C)
```

---

## 2 · Shared Components (reuse before you build)

> Registry: [`../shared/_INDEX_SHARING_COMPONENT.md`](../shared/_INDEX_SHARING_COMPONENT.md)

```
ALREADY SHARED (used here)            OWNED here (local)              DRIFT
┌─────────────────────────────┐      ┌───────────────────────┐      ┌────────────────────────────┐
│ StatusBadge (shared) — B    │      │ MonitoringTopBar      │      │ WholeFloorPrepList status  │
│ ConnectionErrorBanner — top │      │ TableInfoBanner       │      │ pills use admin overview.  │
│ ClientBottomNav (layout) — F│      │ OrderDetailCard       │      │ helpers statusColors() =   │
└─────────────────────────────┘      │ WholeFloorPrepList    │      │ raw palette (bg-green-100…)│
                                     └───────────────────────┘      │ not design tokens          │
                                                                    └────────────────────────────┘
DEAD (imported by nothing — safe to delete):
  tracking/components/ServiceQueueList.tsx · ServiceQueueItem.tsx
  tracking/components/useOrderMonitorSSE.ts   ← old copy; the live hook is hooks/useOrderMonitorSSE.ts
```

---

## 3 · Loading Strategy

```
COLD VISIT (Pattern B = full client; all data is guest-specific, no RSC/ISR prefetch)

  blank ──► inline skeleton ──► content
            (animate-pulse, in page.tsx — no separate component)
            sticky bar + 3 card placeholders + bottom bar

  mutually-exclusive full-page branches (each with [Về trang menu] → /menu):
  ┌──────────────────────────────────────────────────────────────┐
  │ no activeOrderId  → "Không có đơn hàng đang hoạt động"        │
  │ fetch 404/error   → "Đơn hàng không tồn tại"                  │
  │ SSE 401/403       → "Phiên làm việc hết hạn"                  │
  │ loading           → skeleton                                   │
  │ else              → Zones A–D                                  │
  └──────────────────────────────────────────────────────────────┘
```

> First-paint gap is mostly closed: BE sends a `queue.update` + `tables.status` **snapshot
> immediately on connect** (monitor_handler.go:59-65), so Zone D fills as soon as the SSE
> opens (~200–400ms after mount) instead of waiting for the next floor status change.

---

## 4 · Local Data Management (in-page state)

Three layers. **Global → Zustand (read-only here). Live → the hook's internal `useState`.
Page-local UI → one `useState` in page.tsx.**

```
GLOBAL (Zustand, read-only on this page)
┌────────────────┬──────────────────────────────────────────────┐
│ useCartStore   │ activeOrderId  → the ONLY input this page needs│
│ useAuthStore   │ accessToken    → SSE Bearer header (in hook)   │
└────────────────┴──────────────────────────────────────────────┘

HOOK-INTERNAL (useState inside useOrderMonitorSSE, returned to the page)
┌──────────────────┬──────────────────────────────┬──────────────────────────┐
│ queueData        │ queue[] + position + total + ETA│ B (pos/ETA), D (rows)  │
│ sseConnected     │ LIVE vs Mất kết nối           │ A, ConnectionErrorBanner │
│ isUnauthorized   │ permanent SSE 401/403         │ full-page empty state    │
│ itemsChangedAt   │ ticks → refetch order         │ C (via useQuery refetch) │
│ orderStatus      │ 🚨 NEVER SET — dead case §6f  │ (B falls back to GET)    │
│ tableStatuses    │ ⚠️ set but UNUSED by the page  │ — (no Zone E anymore)    │
│ reconnect()      │ ⚠️ returned but NO caller      │ — (Làm Mới removed)      │
└──────────────────┴──────────────────────────────┴──────────────────────────┘

PAGE-LOCAL (useState in page.tsx)
┌──────────────────┬──────────────────────────────┬──────────────────────────┐
│ showTable        │ Ẩn/Hiện bàn của bạn toggle    │ B + C visibility          │
└──────────────────┴──────────────────────────────┴──────────────────────────┘
```

No form library — this page has no inputs. `effectiveStatus = orderStatus ?? order.status`,
and since `orderStatus` is never set (§6f), Zone B's status is **always the GET's value**.

### 4a · Inside the SSE hook — the page's data engine

```
useOrderMonitorSSE  (hooks/useOrderMonitorSSE.ts)
├── fetch-event-source  GET /sse/order-monitor/{orderId}, Authorization: Bearer accessToken
├── reconnect()  ........ aborts stream, resets attempts, bumps reconnectKey — ⚠️ no caller
├── backoff  ............ exponential 1s→2s→4s… cap 30s, max 5 attempts, then SILENT stop
├── 401/403 on open  .... AuthError sentinel → isUnauthorized (permanent, no retry)
└── position/ETA  ....... computed CLIENT-side on every queue.update:
                          idx = queue.findIndex(orderId); position = idx+1;
                          estimatedMinutes = idx > 0 ? idx*3 : 0
```

> ⚠️ `position` / `estimatedMinutes` are FE-derived — BE sends `position: 0`,
> `estimatedMinutes: 0` in every queue payload (order_service.go:924-928).

---

## 5 · Cross-Page Data (what survives, what doesn't)

```
┌────────────┬──────────────────┬─────────────────────────────────────────────┐
│ store      │ localStorage      │ persisted?                                   │
├────────────┼──────────────────┼─────────────────────────────────────────────┤
│ useCartStore│ cart-config-v3   │ PARTIAL → { orderNote, activeOrderId } only  │
│ useAuthStore│ —                │ MEMORY only (accessToken)                    │
└────────────┴──────────────────┴─────────────────────────────────────────────┘
```

`activeOrderId` is the only input — taken from `useCartStore`, **not** URL params (guests
have no auth; a shared URL must not leak/spoof an order). The `tracking/[id]/` folder exists
but is **empty** — no page.

**Handoff order/[id] → tracking (two writers):**

```
order/[id] "Theo dõi đơn" button (order/[id]/page.tsx:564)
   │ setActiveOrderId(params.id) → router.push('/tracking')
order/[id] passive sync on load (page.tsx:574)
   │ setActiveOrderId(isActive ? params.id : null)   ← also how a finished order CLEARS it
   ▼
useCartStore.activeOrderId ──read──► /tracking  GET /orders/{id} + open SSE
   │
   └─ item events (items_added/item_updated/item_cancelled) → itemsChangedAt → refetch → Zone C repaints
```

`clearCart()` (runs after placing a new order) nulls `activeOrderId`; the redirect to
`/order/:id` immediately re-sets it via the passive sync, so the bottom-nav "Theo Dõi" tab
keeps working. SSE auth = `useAuthStore.accessToken` as a `Bearer` header (memory only).

---

## 6 · Backend — Load · Send · Receive · Errors

**The GET goes through ONE axios instance** (`lib/api-client.ts`) — token attached out,
401 handled back. The SSE uses `@microsoft/fetch-event-source` with a manual
`Authorization: Bearer` header (separate path from axios).

```
            ┌──────────────────────── lib/api-client.ts (axios) ─────────────────────────┐
useQuery  → │ REQUEST interceptor:  add  Authorization: Bearer <accessToken>             │ → BE
            │ RESPONSE interceptor: on 401 → refresh / redirect (see §6d)                │ ← BE
            └────────────────────────────────────────────────────────────────────────────┘
SSE hook  → fetch-event-source(GET /sse/order-monitor/{id}, Bearer accessToken)  (own path)
```

### 6a · LOADING (reads) — TanStack Query (one query only)

```
       useQuery(['order', orderId])               queryFn = api.get(`/orders/${id}`).then(r => r.data.data)
┌──────────────────────────────────────────┐
│ ['order', orderId]   enabled: !!orderId   │   staleTime 0 · refetchOnWindowFocus false
└──────────────────────────────────────────┘   retry 3× EXCEPT on 404 (custom retry fn)

  Everything else is SSE push, NOT a query:
  queue.update                       → setQueueData      (snapshot at connect + every change)
  tables.status                      → setTableStatuses  (received, then discarded — no Zone E)
  items_added/item_updated/item_cancelled → itemsChangedAt → refetch(['order']) → Zone C
```

The GET response is the standard order shape (combo header `unit_price 0` + children linked
by `combo_ref_id`, nhân in `toppings_snapshot` — full worked example in
[menu_spec_v3_visual.md §6f](../client_menu_page_v2/menu_spec_v3_visual.md)). `OrderDetailCard`
**hides combo header rows** (`filter(i => !(i.combo_id && !i.combo_ref_id))`) and renders
children + món lẻ + canh flat; "Tổng cộng" = BE `total_amount`, item count = Σ displayed qty.

### 6b/6c · SENDING — none

**This page is read-only.** No `useMutation`, no POST/PATCH — and since "Làm Mới" was
removed, not even a manual reconnect. There are no mutation callbacks to document.

### 6d · 401 / auth errors

```
HTTP GET 401 (axios)         → global interceptor: guest → back to /menu · staff → refresh/login
SSE 401/403 (fetch-evt-src)  → AuthError → isUnauthorized = true (permanent, no retry)
                               → full-page "Phiên làm việc hết hạn" + [Về trang menu]
```

### 6e · Error surfaces — don't confuse them

| Where | Trigger | What the user sees |
|---|---|---|
| **Query error** (read) | `GET /orders/{id}` 404/error | full-page "Đơn hàng không tồn tại" |
| **SSE disconnect** | stream error | `ConnectionErrorBanner` + grey "Mất kết nối" pill; backoff retry ×5 then **silent stop** (R5) |
| **SSE 401/403** | expired/invalid token on stream | full-page "Phiên làm việc hết hạn" (permanent) |
| **HTTP 401** | expired token on the GET | axios interceptor — no in-page UI |

### 6f · SSE event map (the high-value bit — FE switch vs what BE actually publishes)

```
BE Redis channels subscribed by /sse/order-monitor/{id} (monitor_handler.go:46-47):
   order:{id} · queue:broadcast · tables:broadcast
Snapshot on connect: queue.update + tables.status written directly to the stream.
FE dispatches on data.type (JSON field), not the SSE event: line.
```

| FE `case` (hook) | Effect | BE actually publishes? |
|-----------------|--------|------------------------|
| `order.status` | `setOrderStatus` | 🚨 **NO** — BE emits `order_status_changed` (order_service.go:552). The monitor_handler.go header comment *claims* `order.status` — the BE comment is wrong too. |
| `queue.update` | `setQueueData` | ✅ snapshot at connect + on create + every status change |
| `tables.status` | `setTableStatuses` | ✅ same — but the page never renders it (R6) |
| `items_added` / `item_updated` / `item_cancelled` | `itemsChangedAt` → refetch | ✅ yes (order_service.go:516,642,696) |
| (no FE case) | dropped | `connected`, `new_order`, `order_status_changed`, `order_cancelled` |

**`queue.update` wire shape** (traced from `buildMonitorPayloads`, order_service.go:866-928 —
shape-verified against source, not a live capture):

```jsonc
{
  "type": "queue.update",
  "queue": [
    { "orderId": "6c39ea8a-…", "tableLabel": "Bàn 2", "status": "preparing",
      "itemCount": 16, "orderNumber": "ORD-20260611-0007", "createdAt": "2026-06-11T07:31:05Z",
      "dishes": [ /* FULL OrderItem lines incl. toppings_snapshot — FE renders NONE of this (R3) */ ] }
  ],
  "position": 0,            // always 0 — FE derives its own (§4a)
  "total": 4,
  "estimatedMinutes": 0     // always 0 — FE derives idx*3
}
```

`WholeFloorPrepList` keeps only `status ∈ {pending, confirmed, preparing, ready}` rows
(delivered/paid/cancelled drop off the list), sorts by `createdAt` asc, and renders
position · `tableLabel` · status pill (`overview.helpers` statusLabel/statusColors) ·
`#<orderNumber suffix>`. Own row = `orderId === activeOrderId` → primary border + "(bàn bạn)".

---

## 7 · Subpages

None. `tracking/[id]/` exists but is **empty** — `orderId` comes from the cart store, not the
URL. Zone F navigation is the layout-level `ClientBottomNav` (all 5 client tabs).

---

## 8 · Top Risks (re-audited 2026-06-11)

```
STILL OPEN
🚨 R1  Zone B status NEVER advances live — FE listens for `order.status`, BE emits
       `order_status_changed` → dead case. effectiveStatus falls back to the GET, which only
       refetches on ITEM events. Meanwhile Zone D rows repaint fresh status from queue.update
       → the SAME order can show two different statuses on screen. The green "đã phục vụ"
       state may never appear live. (was v1-C1; fix = match the event name on either side)
⚠️ R2  order_cancelled has no FE case → guest gets no live signal their order was cancelled;
       Zone B keeps the stale status, Zone D row just vanishes. (was v1-C3)
⚠️ R5  reconnect() has NO caller since "Làm Mới" was removed — after 5 failed attempts the
       SSE stops silently while the banner still says "đang thử lại...". Only remounting
       the page reconnects.
⚠️ R3  BE ships full `dishes[]` (every item line + toppings_snapshot, whole floor) in EVERY
       queue.update; the FE renders none of it — payload weight grows with floor size.
⚠️ R4  Dead code: tracking/components/ServiceQueueList.tsx + ServiceQueueItem.tsx + the OLD
       tracking/components/useOrderMonitorSSE.ts (live hook = hooks/useOrderMonitorSSE.ts);
       empty tracking/[id]/ folder.
⚠️ R6  tables.status is subscribed, parsed and stored on every broadcast, then discarded —
       no Zone E exists anymore. Either drop the case or drop the channel subscription.

RESOLVED (since v1)
✅ C2  "BÀN BẠN ★" highlight — table map removed; own-row highlight in Zone D now matches by
       orderId (WholeFloorPrepList.tsx:43) and works.
✅ C4  Per-row queue ETA — rows no longer show an ETA, so the dead BE field stopped mattering.
✅ (gap) First-paint lag for queue data — BE snapshot-on-connect closed it.
```

---

*Short visual companion to the canonical [Tracking_Status_Routing_Reference.md](./Tracking_Status_Routing_Reference.md).
Diagrams summarize; line-traced detail lives there (⚠️ canonical is dated 2026-06-07 and still
describes the v1 page — table map, ServiceQueueList, Làm Mới). Supersedes
`Tracking_TEMPLATE_visual_spec.md`.*
