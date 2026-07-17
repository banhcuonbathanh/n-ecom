---
page: Theo Dõi Đơn Hàng (guest order monitoring — read-only) — VISUAL SHORT SPEC v1
route: /(shop)/tracking/page.tsx   # URL /tracking
created: 2026-06-09
status: companion to Tracking_Status_Routing_Reference.md (canonical) — diagram-first summary
reads_with: ./Tracking_Status_Routing_Reference.md   # full as-built detail lives there
---

# Theo Dõi Đơn Hàng — v1 Visual Spec (the short one)

> **Read this to *understand* the page in 5 minutes.** For exact classes, props, line
> numbers and payloads → [Tracking_Status_Routing_Reference.md](./Tracking_Status_Routing_Reference.md) (canonical).
>
> **What the page is:** A seated guest arrives here from the order page (`order/[id]` →
> "Theo dõi đơn" sets `activeOrderId` then pushes `/tracking`). They watch their order move
> through the kitchen — queue position + ETA, full order receipt, the shop-wide service queue,
> and a live table map. **Read-only:** one HTTP GET for the order detail, then everything else
> streams in over a single SSE connection. The guest changes **nothing** from here.

---

## 1 · Component Map

`page.tsx` is **both** shell and brain — Pattern B, one `'use client'` component. It runs the
single order query, opens the SSE hook (`useOrderMonitorSSE`), holds all page state in
`useState`, and hands data down to dumb zone components. **Zones never talk to each other.**

```
TrackingPage (page.tsx)              ← 'use client' brain (no Suspense/RSC split)
│   useQuery(['order', orderId])  +  useOrderMonitorSSE(orderId)
│
├─ MonitoringTopBar ........... A    title + LIVE/Mất kết nối pill (sticky top-0 z-20)
├─ ConnectionErrorBanner ..... —     "⚠️ Mất kết nối…" only when !sseConnected (fixed top z-50)
├─ TableInfoBanner ........... B     status badge + queue position/ETA; green "đã phục vụ" on delivered
├─ OrderDetailCard ........... C     the receipt — items, toppings, total (renders for every status)
├─ ServiceQueueList .......... D     shop-wide queue, 5 rows, own row highlighted
│   └─ ServiceQueueItem ×N
├─ TableLayoutMap ............ E     3-col table grid, colour by status (serving/waiting/empty)
└─ ClientBottomNav ........... F     Menu · Yêu Thích · Làm Mới (fixed bottom-0 z-20)

MonitoringSkeleton                   ← cold-visit loading state (Pattern B requires it)
```

**How it actually lays out (mobile, 375px — the only target):** the tree above is *hierarchy*;
this is *geography*. A and F are pinned; C/D/E are the long scroll body in between.

```
┌════════════════════════════════════════════┐ ← fixed top z-50, only when !sseConnected
│ ⚠️ Mất kết nối… đang kết nối lại            │   ConnectionErrorBanner (overlays A)
└════════════════════════════════════════════┘
┌──────────────────────────────────────────────┐ ◄ A  sticky top-0 z-20
│ Theo Dõi Đơn Hàng — Bánh Cuốn      ● LIVE   │   green pill / grey "Mất kết nối"
├──────────────────────────────────────────────┤ ◄ B  static
│ Bàn của bạn        [Bàn T.04]                │   StatusBadge + queue pos/ETA
│ Trạng thái: Đang chuẩn bị · ~5'              │   ← green "đã phục vụ" when delivered
│ Vị trí hàng chờ: #3 / 5 đơn · Chờ ~5'        │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ ▲
│ C  Chi tiết đơn #ORD-042 · Bàn T.04         │ │ scroll
│   x1 Combo Bánh Cuốn Thịt        65,000đ    │ │ body
│      + Chả lụa x2 · Hành phi · Nước mắm     │ │ (C/D/E
│   x2 Bánh Cuốn Chay              45,000đ    │ │  stack,
│   ═══════════════════════════════════════   │ │  static,
│   Tổng · 5 sản phẩm             130,000đ    │ │  one
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ │ flow)
│ D  Hàng chờ phục vụ   ( #3 / 5 )            │ │
│   [Đã phục vụ ]  #ORD-040 · T.02 · 5 món    │ │
│   [Đang p.vụ  ]  #ORD-041 · T.07 · 4 món    │ │
│  ┃[Đ. chuẩn bị]  #ORD-042 · T.04 · 5 sp ┃◄──┼─┼─ own row, amber border
│   [Đang chờ   ]  #ORD-043 · T.09            │ │
│   [Đang chờ   ]  #ORD-044 · T.08            │ │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ │
│ E  Sơ đồ bàn   🟠 p.vụ · 🔴 chờ · 🟢 trống   │ │
│   ┌──────┬──────┬──────┐                    │ │
│   │T01 🟠│T02 🟠│T03 🟢│   3-col grid       │ │
│   │T04🔴★│T05 🟠│T06 🟢│   ★ = BÀN BẠN      │ │
│   │T07 🟠│T08 🔴│T09 🔴│   colour by status │ │
│   └──────┴──────┴──────┘                    │ ▼
├──────────────────────────────────────────────┤ ◄ F  sticky bottom-0 z-20
│   [  Menu  ]   [Yêu Thích]   [ Làm Mới ]    │   Làm Mới → reconnect() SSE
└──────────────────────────────────────────────┘
```

> Z-order top→bottom: ConnectionErrorBanner (50) > A & F (20) > scroll body. The two amber-marked
> spots are the page's signature live cues — own queue row (D) and own table ★ (E) — and both are
> currently broken (Concerns C2/C1, see §8). Full pixel layout → [client_tracking_wireframe_v1.md](./client_tracking_wireframe_v1.md).

> **Not on this page:** `TableLayoutMap` and `ClientBottomNav` live in `components/shared/`
> and are reused by admin/pos and all client pages respectively. No modals on this page.

**The golden rule (this page's variant):** there is no in-page *writer* store — the **SSE hook
is the single writer**. Every push dispatches into the brain's `useState`, and React re-renders
all subscribed zones via props in one tick. No zone-to-zone calls, no event bus, no context.

```
   useOrderMonitorSSE (EventSource)
            │ onmessage → setOrderStatus / setQueueData / setTableStatuses / setItemsChangedAt
            ▼
      ┌─────────────────────┐   one setState batch re-renders every prop-fed zone
      │  page.tsx useState  │ ──────────────────────────────────────────────────┐
      └─────────────────────┘                                                    │
        │          │             │              │                                │
        ▼          ▼             ▼              ▼                                ▼
   TableInfoBanner OrderDetailCard ServiceQueueList TableLayoutMap        MonitoringTopBar
        (B)            (C)             (D)              (E)                     (A)
```

---

## 2 · Shared Components (reuse before you build)

> Registry: [`../shared/_INDEX_SHARING_COMPONENT.md`](../shared/_INDEX_SHARING_COMPONENT.md)

```
ALREADY SHARED (used here)          OWNED here but reusable           SHOULD reuse (drift)
┌────────────────────────┐         ┌────────────────────────────┐   ┌──────────────────────┐
│ StatusBadge (shared)   │         │ TableLayoutMap (shared,    │   │ MonitoringTopBar     │
│ TableLayoutMap (shared)│         │   also admin/pos)          │   │  hardcodes green/grey│
│ ClientBottomNav (shared)│        │ ClientBottomNav (shared,   │   │  pills, not tokens   │
└────────────────────────┘         │   all client pages)        │   └──────────────────────┘
                                   └────────────────────────────┘
```

⚠️ `MonitoringTopBar` uses raw `bg-green-900/30` / `bg-gray-700/40` for the LIVE pill instead
   of design-system tokens (cosmetic). `TableMapCell` is **not** `React.memo`'d despite the
   tech note saying it should be (Concern C5).

---

## 3 · Loading Strategy

```
COLD VISIT (Pattern B = full client; all data is guest-specific, no RSC/ISR prefetch)

  blank ──► MonitoringSkeleton ──► content
            (animate-pulse)
            sticky bar + 4 card placeholders + bottom nav

  inside the page, mutually-exclusive branches:
  ┌──────────────────────────────────────────────────────────────┐
  │ no activeOrderId → empty: "Không có đơn hàng đang hoạt động"   │
  │                    → button "Về trang menu" → /menu            │
  │ fetch 404/error  → empty: "Đơn hàng không tồn tại"            │
  │ SSE 401/403      → empty: "Phiên làm việc hết hạn"           │
  │ loading          → MonitoringSkeleton                          │
  │ else             → Zones A–F                                   │
  └──────────────────────────────────────────────────────────────┘
```

> Gap (from tech_description): SSE opens ~200–400ms after mount, so queue/table data may lag
> one tick on first paint — Zone C (the GET) lands first, Zones B/D/E fill in on the first push.

---

## 4 · Local Data Management (in-page state)

Two layers only. **Global mutable → Zustand. Live + page-local UI → `useState` in the brain, props down.**
Note: queue/table/status data is **push-only from SSE** — it is deliberately *not* in TanStack
Query (which is reserved for the single initial GET).

```
GLOBAL (Zustand, read-only on this page)
┌────────────────┬──────────────────────────────────────────────┐
│ useCartStore   │ activeOrderId  → the ONLY input this page needs│
│ useAuthStore   │ accessToken    → SSE Bearer header             │
└────────────────┴──────────────────────────────────────────────┘

PAGE-LOCAL (useState in page.tsx → passed by props)
┌──────────────────┬──────────────────────────┬─────────────────────────┐
│ orderStatus      │ guest's live order status │ B (TableInfoBanner)     │
│ queueData        │ queue[] + position + total│ B, D (ServiceQueueList) │
│ tableStatuses    │ per-table colour map      │ E (TableLayoutMap)      │
│ sseConnected     │ LIVE vs Mất kết nối       │ A, ConnectionErrorBanner│
│ itemsChangedAt   │ ticks → triggers refetch  │ C (via useQuery refetch)│
└──────────────────┴──────────────────────────┴─────────────────────────┘
```

No form library — this page has no inputs. Every "interaction" is a navigation link or the SSE
reconnect button.

### 4a · Inside the SSE hook — the page's data engine

```
useOrderMonitorSSE  (hooks/useOrderMonitorSSE.ts)
├── EventSource  ........ GET /sse/order-monitor/{orderId}, Authorization: Bearer accessToken
├── reconnect()  ........ aborts EventSource, resets attempts, bumps reconnectKey (Làm Mới calls this)
├── backoff  ............ exponential 1s→2s→4s… cap 30s, max 5 attempts
├── 401/403  ............ permanent isUnauthorized — no retry
└── position/ETA  ....... computed CLIENT-side: idx = queue.findIndex(orderId);
                          position = idx+1; estimatedMinutes = idx>0 ? idx*3 : 0
```

> ⚠️ `position` and `estimatedMinutes` are FE-derived, **not** BE values. The per-*row* ETA in
> Zone D is dead (BE queue items carry no `estimatedMinutes`) — Concern C4.

---

## 5 · Cross-Page Data (what survives, what doesn't)

State split by **lifetime**:

```
┌────────────┬──────────────────┬─────────────────────────────────────────────┐
│ store      │ localStorage      │ persisted?                                   │
├────────────┼──────────────────┼─────────────────────────────────────────────┤
│ useCartStore│ cart-config-v3   │ PARTIAL → { orderNote, activeOrderId } only  │
│ useAuthStore│ —                │ MEMORY only (accessToken)                    │
└────────────┴──────────────────┴─────────────────────────────────────────────┘
```

⚠️ `activeOrderId` is the only input this page reads — taken from `useCartStore`, **not** URL
params (guests have no auth; a shared URL must not leak/spoof an order). The `tracking/[id]/`
folder exists but is **empty** (no page).

**Handoff order/[id] (C3) → tracking (C4):**

```
order/[id] "Theo dõi đơn" button (order/[id]/page.tsx:564)
   │ setActiveOrderId(params.id)
   ▼
useCartStore.activeOrderId ──read──► /tracking GET /orders/{id} + open SSE
   │
   └─ item events (added/updated/cancelled) → itemsChangedAt → refetch → Zone C repaints
```

Auth-token rule: `accessToken` lives in `useAuthStore` (memory only) and is attached as the SSE
`Bearer` header. ⚠️ Spec deviation (Concern C6): tech_description specifies guest auth via
`useSettingsStore.guestToken`, but shipped code uses `useAuthStore.accessToken` — verify the
guest-token path before relying on the wireframe text.

---

## 6 · Backend — Load · Send · Receive · Errors

**The GET goes through ONE axios instance** (`lib/api-client.ts`) — it auto-attaches the token
out and auto-handles 401 back. The SSE uses `@microsoft/fetch-event-source` with a manual
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
       useQuery(['order', orderId], queryFn)              queryFn = api.get(`/orders/${id}`).then(r => r.data.data)
┌──────────────────────────────────────────┐
│ ['order', orderId]   enabled: !!orderId   │   staleTime 0, retry 3× EXCEPT on 404
└──────────────────────────────────────────┘

  Everything else is SSE push, NOT a query:
  queue.update   → setQueueData     (queue:broadcast)
  tables.status  → setTableStatuses (tables:broadcast)
  items_added/updated/cancelled → itemsChangedAt → refetch(['order', orderId]) → Zone C
```

Zone C re-fetches (not a client join) whenever an item event arrives; queue position is the only
client-side derivation. "Làm Mới" in Zone F calls `reconnect()` (re-opens SSE) — it is **not** a
query retry and does **not** call `router.refresh()`.

### 6b/6c · SENDING — none

**This page is read-only.** No `useMutation`, no POST/PATCH. The only "write-ish" control,
"Làm Mới", re-opens the local EventSource. There are no mutation callbacks to document.

### 6d · 401 / auth errors

```
HTTP GET 401 (axios)         → global interceptor: refresh → retry once → fail → clearAuth → /login
SSE 401/403 (fetch-evt-src)  → isUnauthorized = true (permanent, no retry)
                               → empty state "Phiên làm việc hết hạn"
```

### 6e · Error surfaces — don't confuse them

| Where | Trigger | What the user sees |
|---|---|---|
| **Query error** (read) | `GET /orders/{id}` 404/error | empty state "Đơn hàng không tồn tại" |
| **SSE disconnect** | EventSource onerror | `ConnectionErrorBanner` + grey "Mất kết nối" pill; auto-backoff reconnect |
| **SSE 401/403** | expired/invalid token on stream | empty state "Phiên làm việc hết hạn" (permanent) |
| **HTTP 401** | expired token on the GET | axios interceptor refresh/redirect — no in-page UI |

### 6f · SSE event map (the high-value bit)

```
BE Redis channels: order:{id} · queue:broadcast · tables:broadcast
```

| FE `case` | Effect | BE actually publishes? |
|-----------|--------|------------------------|
| `order.status` | `setOrderStatus` | 🚨 **NO** — BE emits `order_status_changed` (Concern C1) |
| `queue.update` | `setQueueData` | ✅ yes |
| `tables.status` | `setTableStatuses` | ✅ yes |
| `items_added` / `item_updated` / `item_cancelled` | `setItemsChangedAt` → refetch | ✅ yes |
| (no FE case) | ignored | `new_order`, `order_status_changed`, `order_cancelled`, `item_progress` arrive but dropped |

---

## 7 · Subpages

`tracking/[id]/` folder exists but is **empty** — no page. `orderId` comes from the cart store,
not the URL. Full detail in [Tracking_Status_Routing_Reference.md](./Tracking_Status_Routing_Reference.md).

---

## 8 · Top Risks (full list → canonical §Concerns)

```
🚨 C1  Zone B status badge never advances live — FE listens for `order.status`,
       BE emits `order_status_changed`. Zone D (queue.update) shows fresh status →
       same order can display two different statuses on screen at once.
🚨 C2  "BÀN BẠN ★" highlight never renders — highlightTableId = order.table_id (UUID)
       compared to cell id = table NAME → never equal.
⚠️ C3  order_cancelled / new_order / item_progress have no FE case → guest gets no
       live signal that their order was cancelled.
⚠️ C4  Per-row queue ETA (~N') dead — BE queue items carry no estimatedMinutes.
⚠️ C5  tables.status omits orderCount (·N badge never shows); TableMapCell not React.memo'd.
⚠️ C6  Auth uses useAuthStore.accessToken, not the spec's useSettingsStore.guestToken.
```

---

*Short visual companion to the canonical [Tracking_Status_Routing_Reference.md](./Tracking_Status_Routing_Reference.md).
Diagrams summarize; the canonical file is the line-traced source of truth.*
