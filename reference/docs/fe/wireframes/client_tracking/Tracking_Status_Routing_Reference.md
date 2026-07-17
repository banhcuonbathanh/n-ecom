# Monitoring / Servicing Table (Theo Dõi Đơn Hàng) — Status Routing Reference

> Route: `fe/src/app/(shop)/tracking/page.tsx` · URL `/tracking`
> Read-only guest page. Order status **gates which zone shows what** (banner copy, queue
> rows, table-map colour) — it has **no status-changing buttons**. Live updates arrive over
> one SSE stream (`/sse/order-monitor/:id`); the initial order detail comes from one GET.
>
> **Every cell below is traced to current code.** Where BE and FE disagree, it is flagged
> 🚨/⚠️ in-line and in the Concerns section — those are live bugs, not doc gaps.

---

## Live Page Snapshot (`http://localhost:3000/tracking`, 2026-06-07)

- **Stack:** FE `:3000` → 200 OK (up). BE `:8080` reachable. `caddy` + `loki` containers were
  `restarting` at capture time (unrelated to this page).
- **Browser capture:** ❌ not taken — Playwright Chrome profile is locked
  (`mcp-chrome-ef492b3` already in use; same constraint hit on the C3 run). The render states
  below are therefore **derived from code**, not a screenshot.
- **Deterministic render states** (from [page.tsx](../../../../fe/src/app/(shop)/tracking/page.tsx)):
  - **No `activeOrderId`** (default cold visit — `cart-config-v3` has `activeOrderId: null`):
    full-screen centered empty state — ⚠️ icon, **"Không có đơn hàng đang hoạt động"**,
    "Vui lòng đặt món trước để theo dõi đơn hàng.", button **"Về trang menu"** → `/menu`.
    This is what `/tracking` shows unless you arrive from the order page (see Cross-Page).
  - **`activeOrderId` set, fetch 404 / error** → "Đơn hàng không tồn tại" empty state.
  - **SSE 401/403** → "Phiên làm việc hết hạn" empty state.
  - **Loading** → `animate-pulse` skeleton (sticky bar + 4 card placeholders + bottom nav).
  - **Loaded** → Zones A–F as in Page Layout below.

> To capture the loaded state: arrive via the order page's **"Theo dõi đơn"** button
> (`order/[id]/page.tsx:564`), which sets `activeOrderId` then pushes `/tracking`.

---

## Page Layout

Render order from [page.tsx](../../../../fe/src/app/(shop)/tracking/page.tsx) `return` (lines 127–164).

| Zone | Component | Title (literal JSX) | When visible |
|------|-----------|---------------------|--------------|
| A | `MonitoringTopBar` | "Theo Dõi Đơn Hàng — Bánh Cuốn" + LIVE/Mất kết nối pill | Always (sticky `top-0 z-20`) |
| — | `ConnectionErrorBanner` | "⚠️ Mất kết nối — đang thử lại..." | Only when `!sseConnected` (`fixed top-0 z-50`) |
| B | `TableInfoBanner` | — (no heading; "Trạng thái:" label) | `order && effectiveStatus` |
| C | `OrderDetailCard` | "Chi tiết đơn hàng: #{order_number}" | `order` present |
| D | `ServiceQueueList` | "Hàng chờ phục vụ" | `queueData && queueData.queue.length > 0` |
| E | `TableLayoutMap` | "Sơ đồ bàn hiện tại" | `tableStatuses.length > 0` |
| F | `ClientBottomNav` | Menu · Yêu Thích · Làm Mới | Always (`fixed bottom-0 z-20`) |

> Modals: none. The wireframe's "Zone B queue ETA" lives inside `TableInfoBanner` (Zone B).

---

## Order DB Statuses (`orders.status`)

Source: [DB_SCHEMA_SUMMARY.md:199](../../../be/be_code_summary/DB_SCHEMA_SUMMARY.md) —
`ENUM('pending','confirmed','preparing','ready','delivered','cancelled','paid')`. FE mirror:
`OrderStatus` in [types/order.ts:29](../../../../fe/src/types/order.ts#L29). Labels from
[StatusBadge.tsx:14](../../../../fe/src/components/shared/StatusBadge.tsx#L14).

| Status | Vietnamese label (StatusBadge) | Meaning |
|--------|-------------------------------|---------|
| `pending` | Chờ xác nhận | Order placed, awaiting staff confirm |
| `confirmed` | Đã xác nhận | Staff accepted |
| `preparing` | Đang làm | Kitchen working |
| `ready` | Sẵn sàng | Ready to serve |
| `delivered` | Đã giao | Brought to table (awaiting payment) |
| `cancelled` | Đã huỷ | Cancelled |
| `paid` | Đã thanh toán | Settled |

**Active set (BE):** `ListActiveOrders` = `pending, confirmed, preparing, ready, delivered`
([order_repo.go:184-191](../../../../be/internal/repository/order_repo.go#L184)). `cancelled`
and `paid` are **excluded** from the queue + table broadcasts.

---

## Order Statuses — Which Zone Shows the Current Guest's Order

Rows = the guest's own `orders.status`. Columns = zones that are status-sensitive.
Zone C (OrderDetailCard) is omitted: it renders for **every** status (not status-gated).

| Current order status | Label | B — TableInfoBanner | D — own row in queue | E — own table cell colour |
|----------------------|-------|---------------------|----------------------|----------------------------|
| `pending` | Chờ xác nhận | ✅ status row + ETA | ✅ (in active set) | 🔴 `waiting` |
| `confirmed` | Đã xác nhận | ✅ status row | ✅ | 🔴 `waiting` |
| `preparing` | Đang làm | ✅ status row | ✅ | 🔴 `waiting` |
| `ready` | Sẵn sàng | ✅ status row | ✅ | 🟠 `serving` |
| `delivered` | Đã giao | ✅ **green "đã được phục vụ"** banner | ✅ | 🟠 `serving` |
| `cancelled` | Đã huỷ | ✅ status row (no special copy) | ❌ not in active set | 🟢 `empty` (no active order) |
| `paid` | Đã thanh toán | ✅ status row (no special copy) | ❌ not in active set | 🟢 `empty` |

Trace: B special-case `delivered` → [TableInfoBanner.tsx:13,23](../../../../fe/src/app/(shop)/tracking/components/TableInfoBanner.tsx#L13);
D membership = `ListActiveOrders` filter; E colour mapping →
[order_service.go:917-924](../../../../be/internal/service/order_service.go#L917)
(`ready/delivered`→`serving`, `pending/confirmed/preparing`→`waiting`, else `empty`).

> 🚨 **The Zone B badge can lag the Zone D badge for the *same* order** — see Concern C1.
> Zone D rows update from `queue.update` every status change; Zone B's `effectiveStatus`
> only advances on the (never-emitted) `order.status` event or an item-event refetch.

---

## Action Buttons Per Status

**None.** This page is read-only for guests ([tech_description.md](tech_description.md):
"Conditional UI by role: None — page is read-only for all guests"). No zone contains a
status-advancing mutation. The only interactive controls are navigation, not status changes:

| Control | Zone | Action | Sends to BE? |
|---------|------|--------|--------------|
| "Menu" | F (`ClientBottomNav`) | `<Link href="/menu">` | No |
| "Yêu Thích" | F | `<Link href="/menu/favourites">` | No |
| "Làm Mới" | F | `onRefresh` → `reconnect()` (re-opens EventSource) | No (re-opens SSE only) |
| "Về trang menu" | empty/error states | `router.push('/menu')` | No |

`reconnect()` aborts the current EventSource, resets attempts, bumps `reconnectKey`
([useOrderMonitorSSE.ts:30-36](../../../../fe/src/hooks/useOrderMonitorSSE.ts#L30)) —
it does **not** call `router.refresh()` (preserves local SSE state).

---

## Per-Zone Rules

### A — `MonitoringTopBar`
- LIVE pill is `sseConnected`-driven: green `● LIVE` (pulse dot) vs grey `Mất kết nối`
  ([MonitoringTopBar.tsx:14-28](../../../../fe/src/app/(shop)/tracking/components/MonitoringTopBar.tsx#L14)).
- ⚠️ Uses hardcoded `bg-green-900/30` / `bg-gray-700/40` (not design tokens). Cosmetic.

### B — `TableInfoBanner`
- `delivered` → single green line "Đơn của bạn đã được phục vụ — Cảm ơn!"; **all other
  statuses** → `StatusBadge` + queue-position line.
- ETA badge pulses (`animate-pulse text-warning`) only when `queuePosition === 1`
  ([TableInfoBanner.tsx:32-35](../../../../fe/src/app/(shop)/tracking/components/TableInfoBanner.tsx#L32)).
- `tableLabel = order.table_name ?? order.table_id ?? '?'` (page.tsx:46).

### D — `ServiceQueueList` / `ServiceQueueItem`
- **Server order preserved** — list renders `queue` in the order BE sends
  (`ORDER BY created_at ASC`); FE never re-sorts (per tech note "do not re-sort the queue").
- Current order's row = amber left-border + "< Đơn của bàn" tag, matched by
  `item.orderId === currentOrderId` ([ServiceQueueItem.tsx:38](../../../../fe/src/app/(shop)/tracking/components/ServiceQueueItem.tsx#L38)).
- Each row: `StatusBadge` + `#orderId.slice(0,8)` + tableLabel + `itemCount món`.
- ⚠️ Per-row ETA (`~N'`) renders only if `status === 'pending' && estimatedMinutes != null`
  — but BE's `queue.update` items carry **no** `estimatedMinutes` per item
  ([order_service.go:851-882](../../../../be/internal/service/order_service.go#L851)), so this
  badge never shows (Concern C4).

### E — `TableLayoutMap`
- 3-column grid, `React`-free memo (no `React.memo` despite tech note — Concern C5).
- Colour by `MonitorTableStatus.status`: `serving`🟠 / `waiting`🔴 / `empty`🟢.
- Highlight ring + "BÀN BẠN ★" when `highlightTableId === table.id`.
  🚨 `highlightTableId = order.table_id` (UUID) but BE sets each cell `id` to the **table
  name** (`tableItem{ID: t.Name}`, [order_service.go:926](../../../../be/internal/service/order_service.go#L926))
  → never equal → highlight never renders (Concern C2).
- `orderCount` badge renders if `> 0`, but BE's `tables.status` items omit it → never shows.

---

## What Information Comes FROM BE (reads)

### GET — initial order detail (the only HTTP read)

| Query key | Endpoint | Params | staleTime | enabled | retry |
|-----------|----------|--------|-----------|---------|-------|
| `['order', orderId]` | `GET /orders/{orderId}` | `orderId` from `cart.activeOrderId` | `0` | `!!orderId` | 3× except on 404 |

[page.tsx:22-35](../../../../fe/src/app/(shop)/tracking/page.tsx#L22). Response unwrapped as
`data.data as Order`.

**`Order` fields received** ([types/order.ts:38-52](../../../../fe/src/types/order.ts#L38)):
`id · order_number · status · source · table_id · table_name? · customer_name ·
customer_phone · total_amount · note · created_at · updated_at? · items[]`.

**`OrderItem` fields** (Zone C): `id · product_id · combo_id · combo_ref_id · name ·
quantity · qty_served · unit_price · note · toppings_snapshot[] · flagged`.

### SSE — live stream (all subsequent updates)

`GET /sse/order-monitor/{orderId}` via `@microsoft/fetch-event-source`, auth
`Authorization: Bearer <useAuthStore.accessToken>`
([useOrderMonitorSSE.ts:48-62](../../../../fe/src/hooks/useOrderMonitorSSE.ts#L48)).
BE handler subscribes to 3 Redis channels: `order:{id}`, `queue:broadcast`, `tables:broadcast`
([monitor_handler.go:42-43](../../../../be/internal/sse/monitor_handler.go#L42)).

| FE `case` | Effect | BE event actually published? |
|-----------|--------|------------------------------|
| `order.status` | `setOrderStatus(data.status)` | 🚨 **NO** — BE emits `order_status_changed` (Concern C1) |
| `queue.update` | `setQueueData({queue, position, total, estimatedMinutes})` | ✅ yes (`queue:broadcast`) |
| `tables.status` | `setTableStatuses(data.tables)` | ✅ yes (`tables:broadcast`) |
| `items_added` | `setItemsChangedAt(now)` → triggers `refetch()` | ✅ yes (`order:{id}`) |
| `item_updated` | same | ✅ yes |
| `item_cancelled` | same | ✅ yes |
| (no FE case) | — | `new_order`, `order_status_changed`, `order_cancelled`, `item_progress` arrive but are **ignored** |

- `queueData.position` = `queue.findIndex(orderId) + 1`; `estimatedMinutes = idx > 0 ? idx*3 : 0`
  — **computed client-side**, not from BE ([useOrderMonitorSSE.ts:70-78](../../../../fe/src/hooks/useOrderMonitorSSE.ts#L70)).
- Reconnect: exponential backoff `1s→2s→4s…` capped 30s, max 5 attempts; `401/403` → permanent
  `isUnauthorized` (no retry).

---

## What Information Is SENT TO BE (writes)

**None.** This page issues **zero** mutations — no `useMutation`, no POST/PATCH. The guest
cannot change order or table state from here. The only "write-ish" action, "Làm Mới", merely
re-opens the SSE EventSource locally. (Per `tech_description.md`: page is read-only.)

---

## How It Manages Data CROSS-PAGE

| Store | localStorage key | Persisted? | Carries across pages | File |
|-------|------------------|-----------|----------------------|------|
| `useCartStore` | `cart-config-v3` | ✅ `partialize: {orderNote, activeOrderId}` | `activeOrderId` — **the only input** this page needs | [store/cart.ts:94,114](../../../../fe/src/store/cart.ts#L94) |
| `useAuthStore` | — | ❌ memory only | `accessToken` → SSE `Bearer` header | [features/auth/auth.store.ts](../../../../fe/src/features/auth/auth.store.ts) |

- **`orderId` source:** `useCartStore(s => s.activeOrderId)` — **not** URL params
  ([page.tsx:20](../../../../fe/src/app/(shop)/tracking/page.tsx#L20)), matching the tech note
  ("do NOT read from URL"). The `tracking/[id]/` folder exists but is **empty** (no page).
- **Entry point:** the order page sets it then navigates —
  `setActiveOrderId(params.id); router.push('/tracking')`
  ([order/[id]/page.tsx:564](../../../../fe/src/app/(shop)/order/[id]/page.tsx#L564)). So C3
  (Order) is the gateway into C4 (this page).
- **Item-change loop:** `item(s)_added|updated|cancelled` SSE → `itemsChangedAt` →
  `useEffect` → `refetch(['order', orderId])` → Zone C re-renders with fresh items/total
  ([page.tsx:41-43](../../../../fe/src/app/(shop)/tracking/page.tsx#L41)).
- **End-to-end loop:** scan QR → order on C3 → "Theo dõi đơn" sets `activeOrderId` → C4 GET
  detail (Zone C) + open SSE → queue/table pushes paint Zones B/D/E live → item events refetch
  detail. No data leaves this page.

> ⚠️ **Auth deviation from spec:** `tech_description.md` specifies guest auth via
> `useSettingsStore.guestToken`. The shipped code authenticates the SSE with
> `useAuthStore.accessToken` instead. For a true QR guest this is the guest JWT stored as
> `accessToken`; document/verify the guest-token path before relying on the wireframe text.

---

## OrderDetailCard (Zone C) — full breakdown

Source: [OrderDetailCard.tsx](../../../../fe/src/app/(shop)/tracking/components/OrderDetailCard.tsx).

| Block | Value | Source / rule |
|-------|-------|---------------|
| Header title | `Chi tiết đơn hàng: #{order.order_number}` | `order.order_number` |
| Sub-line | `{order_number} · Bàn {table_name ?? table_id ?? '?'} · Đặt lúc {time}` | `formatTime(created_at)` → `vi-VN` HH:MM:SS |
| Item filter | hides combo **header** rows: `!(combo_id && !combo_ref_id)` | line 19 — shows combo children, drops the zero-price parent |
| Per-item line | `x{quantity}  {name} …… {formatVND(unit_price * quantity)}` | line 39-61 |
| Toppings sub-line | `+ {name}` joined by `·`, `x1` suffix only when `price > 0` | from `toppings_snapshot`, filtered to `name?.trim()` (line 37) |
| Footer | `Tổng cộng · {totalQty} sản phẩm` + `formatVND(order.total_amount)` | `totalQty` = Σ qty of **displayed** items; total = server `total_amount` |

- ⚠️ Per-item amount is `unit_price * quantity` (topping prices are **not** added per line);
  the authoritative grand total is the server's `order.total_amount`, so the line sums need not
  equal the footer when toppings carry a price. (Matches C3 behaviour.)

---

## Concerns (live, code-traced)

| # | Sev | Concern | Trace |
|---|-----|---------|-------|
| C1 | 🚨 | FE listens for SSE `case 'order.status'` but BE publishes `type: "order_status_changed"`. → Zone B status badge **never advances live** (only via initial GET or an item-event refetch). Zone D shows fresh status (from `queue.update`) → same order can show two different statuses on screen. | [useOrderMonitorSSE.ts:67](../../../../fe/src/hooks/useOrderMonitorSSE.ts#L67) vs [order_service.go:543](../../../../be/internal/service/order_service.go#L543) |
| C2 | 🚨 | "BÀN BẠN ★" highlight never renders: `highlightTableId = order.table_id` (UUID) compared to cell `id` = table **name**. | [page.tsx:158](../../../../fe/src/app/(shop)/tracking/page.tsx#L158) + [TableLayoutMap.tsx:52](../../../../fe/src/components/shared/TableLayoutMap.tsx#L52) vs [order_service.go:926](../../../../be/internal/service/order_service.go#L926) |
| C3 | ⚠️ | BE emits `order_cancelled`, `new_order`, `item_progress` on the order channel — FE has **no case** for them (silently ignored). `order_cancelled` in particular gives no live signal to the guest. | onmessage switch lines 66-89 |
| C4 | ⚠️ | Per-row queue ETA (`~N'`) dead: `ServiceQueueItem` needs `item.estimatedMinutes`, BE queue items don't send it. | [order_service.go:851-882](../../../../be/internal/service/order_service.go#L851) |
| C5 | ⚠️ | `tables.status` items omit `orderCount`; the `·{orderCount}` cell never renders. Also `TableMapCell` is not `React.memo`'d despite the tech note. | order_service.go:906-909 |
| C6 | ⚠️ | Auth uses `useAuthStore.accessToken`, not the spec's `useSettingsStore.guestToken`. | useOrderMonitorSSE.ts:25,51 |

---

> Shares the order-status enum + Vietnamese labels with C3/A11/A13/A14 (Cross-Page Concern X1/X2)
> — verified identical here (single source `StatusBadge.tsx`). The `paid`-as-active question
> (X4) does **not** apply on this page: `ListActiveOrders` excludes `paid`, so a paid order
> simply drops out of the queue/table broadcasts (Zone C still renders it).
