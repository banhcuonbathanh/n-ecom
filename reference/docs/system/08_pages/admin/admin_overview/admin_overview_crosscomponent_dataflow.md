# Admin Overview — Cross-Component Data Flow (order BC-42 advances pending → confirmed)

> **Status:** ✅ implemented
> **What this is:** a deep zoom on one concrete action on `/admin/overview` —
> *staff taps "Xác nhận" on order BC-42 (pending → confirmed)* — told from the page's point of view.
> It answers one question: **how do the many widgets on this single page share that status change
> without prop-drilling?**
>
> The short answer: the single shared hub is the **TanStack Query cache entry `['orders','live']`**,
> mutated in place via `queryClient.setQueryData`. Local React state (`loadingIds`,
> `checkedTableIds`, `kiemTraIds`, `searchQuery`, `viewMode`, `popupOrder`) is owned entirely by
> `page.tsx` and passed down by props. No Zustand store is involved on this page.
>
> Traced from source on branch `experience_claude.md_system_1`:
> - [`fe/src/app/(dashboard)/admin/overview/page.tsx`](../../../../../fe/src/app/(dashboard)/admin/overview/page.tsx)
> - [`fe/src/features/admin/components/StatCards.tsx`](../../../../../fe/src/features/admin/components/StatCards.tsx)
> - [`fe/src/features/admin/components/WaitingSection.tsx`](../../../../../fe/src/features/admin/components/WaitingSection.tsx)
> - [`fe/src/features/admin/components/PrepPanel.tsx`](../../../../../fe/src/features/admin/components/PrepPanel.tsx)
> - [`fe/src/features/admin/components/TableList.tsx`](../../../../../fe/src/features/admin/components/TableList.tsx)
> - [`fe/src/features/admin/components/TableGrid.tsx`](../../../../../fe/src/features/admin/components/TableGrid.tsx)
> - [`fe/src/features/admin/components/PaidLog.tsx`](../../../../../fe/src/features/admin/components/PaidLog.tsx)
> - [`fe/src/features/admin/components/CancelLog.tsx`](../../../../../fe/src/features/admin/components/CancelLog.tsx)
> - [`fe/src/features/admin/overview.helpers.ts`](../../../../../fe/src/features/admin/overview.helpers.ts)
> - [`fe/src/hooks/useOverviewWS.ts`](../../../../../fe/src/hooks/useOverviewWS.ts)
> - [`fe/src/context/OrdersWSContext.tsx`](../../../../../fe/src/context/OrdersWSContext.tsx)
> - [`fe/src/hooks/useAdminSSE.ts`](../../../../../fe/src/hooks/useAdminSSE.ts)
> - [`fe/src/features/admin/admin.api.ts`](../../../../../fe/src/features/admin/admin.api.ts)
> - [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts)
>
> Siblings:
> [admin_overview.md](admin_overview.md) ·
> [admin_overview_be.md](admin_overview_be.md) ·
> [admin_overview_crosspage_dataflow.md](admin_overview_crosspage_dataflow.md) ·
> [admin_overview_loading.md](admin_overview_loading.md) ·
> [SCENARIO_OVERVIEW_FLOOR.md](SCENARIO_OVERVIEW_FLOOR.md)

---

## 0. The action, in one line

> Staff taps **"Xác nhận"** on order BC-42 (status `pending`): `page.tsx:handleAction` patches the
> BE, optimistically writes `status: 'confirmed'` into `queryClient.setQueryData(['orders','live'],
> ...)`, and every widget that reads that cache entry re-renders instantly — no prop ever travels
> widget-to-widget.

### The whole picture on one screen

```
                    /admin/overview  (the page)
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌──────────────┐  ← A  StatCards                                       │
│  │ Bàn đang    │  reads orders[] → occupied count                       │
│  │ phục vụ: 3  │  reads orders[] → urgent/warning counts                │
│  │ Món chờ: 7  │  reads orders[].items → totalPending/Preparing         │
│  └──────────────┘                                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │ B  WaitingSection  (pending orders, table-linked)           │        │
│  │  Bàn 5 · pending · BC-42  [🔍 Kiểm tra] [Xác nhận ──────►]──── WRITES ──┐ │
│  └─────────────────────────────────────────────────────────────┘        │ │
│                                                                         │ │
│  ┌─────────────────────────────────────────────────────────────┐        │ │
│  │ C  PrepPanel  (kiemTraIds gate: shown only if > 0)          │        │ │
│  │  aggregates pending kitchen items from orders[]             │        │ │
│  └─────────────────────────────────────────────────────────────┘        │ │
│                                                                         │ │
│  ┌─────────────────────────────────────────────────────────────┐        │ │
│  │ D  TableList / TableGrid (toggle viewMode)                  │        │ │
│  │  Bàn 5 · confirmed 〉  (re-renders after cache update)       │        │ │
│  └─────────────────────────────────────────────────────────────┘        │ │
│                                                                         │ │
│  ┌──────────────────────────────────────┐                               │ │
│  │ E  PaidLog   (lazy: ['orders','history'])                   │        │ │
│  │ F  CancelLog (lazy: ['orders','history'])                   │        │ │
│  └──────────────────────────────────────┘                               │ │
│                                                                         │ │
└─────────────────────────────────────────────────────────────────────────┘ │
                                                                            │
                  ┌─────────────────────────────────────────────────────┐   │
                  │         TanStack Query cache                        │◄──┘
                  │  ['orders','live']   ← the ONE shared hub           │
                  │    Order[]  (raw from GET /orders/live + WS/SSE)    │
                  │                                                     │
                  │  ['tables']          ← table metadata               │
                  │    Table[]  (staleTime 60s)                         │
                  │                                                     │
                  │  ['orders','history']← lazy (PaidLog / CancelLog)  │
                  │    Order[]  enabled only when panel opens           │
                  └─────────────────────────────────────────────────────┘
                       ▲ writes (handleAction / WS / SSE)
                       │ reads (filtered + derived, then passed as props)
                       └─ page.tsx is the only bridge between cache and widgets
```

**Read it like this:** widgets do NOT read the TanStack Query cache directly. `page.tsx` owns all
three `useQuery` calls and derives `orders`, `tableOrders`, `filteredOrders`, `filteredTables`,
`filteredTableOrders`, and `tableMap` from the cache. These derived arrays are passed **down by
props**. Writes (status mutations) flow **up** via `onAction` callbacks, land in `handleAction` in
`page.tsx`, which calls `queryClient.setQueryData` — a single point of truth. The WS and SSE
channels are the only other writers; they call `queryClient.setQueryData` too, from
`useOverviewWS` and `handleNewOrder`.

---

## 1. The cast of components

| Zone | Component | Source file | Reads / writes for BC-42 |
|---|---|---|---|
| A  | `StatCards` | `components/StatCards.tsx:22` | reads `orders[]` + `tables[]` (props) — recomputes `occupied`, `urgent`, `totalPending`, `totalPreparing` |
| B  | `WaitingSection` | `components/WaitingSection.tsx:40` | reads `filteredOrders[]` (prop); fires `onAction(BC-42, 'confirmed')` when staff taps button |
| C  | `PrepPanel` | `components/PrepPanel.tsx:25` | conditionally rendered (`kiemTraIds.size > 0`, `page.tsx:327`); reads a sub-slice of `filteredOrders[]` filtered by `kiemTraIds` and `status === 'pending'` |
| D (list) | `TableList` | `components/TableList.tsx:253` | reads `filteredTables[]` + `filteredTableOrders[]` (props); `onPaymentDone` calls `setQueryData(['orders','live'])` directly via closure from page — the only place besides `handleAction` where a child triggers a live-cache write |
| D (grid) | `TableGrid` | `components/TableGrid.tsx:79` | reads `filteredTables[]` + `filteredOrders[]` (props); fires `onAction` — same as TableList |
| E  | `PaidLog` | `components/PaidLog.tsx:15` | owns its **own** `useQuery(['orders','history'])` (lazy, enabled only when `open=true`); no props from page except none — it is self-contained |
| F  | `CancelLog` | `components/CancelLog.tsx:15` | same pattern as PaidLog — own `useQuery(['orders','history'])` |
| — | `NewOrderPopup` | inline in `page.tsx:31` | reads `popupOrder` (local state); fires `handleConfirmPopup` which also calls `setQueryData(['orders','live'])` |
| — | `ConnectionErrorBanner` | `components/shared/ConnectionErrorBanner` | reads `wsConnected` (bool from `useOverviewWS`) |

**The pattern:** all active-floor widgets (A, B, C, D) receive their data via props from `page.tsx`.
PaidLog and CancelLog are self-contained islands that manage their own server state. Zero props pass
between peer widgets.

---

## 2. The single source: TanStack Query cache `['orders','live']`

`page.tsx` mounts a single `useQuery` for live orders at line 130:

```ts
const { data: rawOrders = [] } = useQuery<Order[]>({
  queryKey: ['orders', 'live'],
  queryFn:  () => listLiveOrders(),        // GET /orders/live
  staleTime: 15_000,
})
```
`page.tsx:130-134`

This is the module's **one poll source**. `staleTime: 15_000` means TanStack Query will not
re-fetch more often than every 15 s on a background focus — but WS and SSE push beats arrive
between polls and mutate the cache in-place (see §3).

### 2.1 The exact cache shapes (traced)

**`['orders','live']` entry** — an `Order[]` array. Each `Order` is:

```ts
interface Order {
  id:             string
  order_number:   string
  status:         OrderStatus           // 'pending'|'confirmed'|'preparing'|'ready'|'delivered'|'cancelled'|'paid'
  source:         'online' | 'qr' | 'pos'
  table_id:       string | null
  table_name?:    string | null
  customer_name:  string | null
  customer_phone: string | null
  total_amount:   number
  note:           string | null
  created_at:     string
  updated_at?:    string
  items:          OrderItem[]
}
```
`fe/src/types/order.ts:38-52`

Each `OrderItem` carries:

```ts
interface OrderItem {
  id:               string
  product_id:       string | null
  combo_id:         string | null
  combo_ref_id:     string | null      // null + combo_id != null → combo header row (filtered by isKitchenItem)
  name:             string
  quantity:         number
  qty_served:       number             // used by itemCounts() for StatCards and PrepPanel
  unit_price:       number
  note:             string | null
  toppings_snapshot: ToppingSnapshotEntry[] | null
  flagged:          boolean
}
```
`fe/src/types/order.ts:15-27`

**`['tables']` entry** — a `Table[]` array:

```ts
interface Table {
  id:        string
  name:      string
  capacity:  number
  status:    'available' | 'occupied' | 'reserved'
  qr_token?: string
}
```
`fe/src/features/admin/admin.api.ts:159-165`

**`['orders','history']` entry** — same `Order[]` shape, lazy; only loaded when `PaidLog` or
`CancelLog` opens (`enabled: open` at `PaidLog.tsx:21` and `CancelLog.tsx:21`).

### 2.2 Derived arrays computed in page.tsx before props are passed

```ts
const ACTIVE       = new Set(['pending','confirmed','preparing','ready','delivered'])
const TABLE_ACTIVE = new Set(['pending','confirmed','preparing','ready','delivered'])

const orders      = rawOrders.filter(o => ACTIVE.has(o.status))       // page.tsx:135
const tableOrders = rawOrders.filter(o => TABLE_ACTIVE.has(o.status)) // page.tsx:136
```

Then `filteredOrders`, `filteredTables`, `filteredTableOrders` are derived from `searchQuery`
(local state, page.tsx:203-241). These are the arrays actually handed to widgets.

### 2.3 Why children never call useQuery for live orders

No widget calls `useQuery(['orders','live'])` itself. They receive the already-filtered arrays as
props. This means a `setQueryData` call in `handleAction` causes `page.tsx` to re-render, its
derived arrays to recompute, and new props to flow down to every mounted child — a single update
fan-out with no duplication risk.

---

## 3. Order BC-42 advances pending → confirmed, step by step

### Step 1 — Staff taps "Xác nhận" in WaitingSection

`WaitingSection` renders a `nextAction` button for `status === 'pending'`:
```ts
case 'pending': return { label: 'Xác nhận', nextStatus: 'confirmed', … }
```
`WaitingSection.tsx:16`

The button calls the `onAction` prop:
```ts
onClick={() => onAction(order.id, next.nextStatus)}
```
`WaitingSection.tsx:196`

`onAction` is wired directly to `page.tsx:handleAction`:
```tsx
<WaitingSection … onAction={handleAction} … />
```
`page.tsx:310`

### Step 2 — page.tsx marks BC-42 as loading

```ts
async function handleAction(orderId: string, status: string) {
  setLoadingIds(prev => new Set(prev).add(orderId))   // BC-42 enters loadingIds
```
`page.tsx:174-175`

`loadingIds` is a `Set<string>` held in local React state (`page.tsx:109`). It is passed as a
prop to `WaitingSection`, `TableList`, and `TableGrid`. When those receive the updated prop, they
disable the button and show a spinner for BC-42 only.

### Step 3 — PATCH /orders/BC-42/status fires

```ts
await updateOrderStatus(orderId, status)
```
`page.tsx:177`

`updateOrderStatus` is:
```ts
export const updateOrderStatus = (id: string, status: string): Promise<void> =>
  api.patch(`/orders/${id}/status`, { status })
```
`admin.api.ts:178-179`

This is a real network call — not fire-and-forget. The optimistic update (Step 4) happens in the
`try` block after the await succeeds, not before. ❓ UNVERIFIED: whether the BE returns the updated
order body (not consumed here — only status 2xx is checked).

### Step 4 — Optimistic write to `['orders','live']` cache

```ts
queryClient.setQueryData<Order[]>(['orders', 'live'], prev =>
  (prev ?? []).map(o =>
    o.id !== orderId ? o : { ...o, status: status as Order['status'] }
  )
)
```
`page.tsx:179-183`

This is the **write** that fans out. TanStack Query detects the mutation, marks the cache entry
as updated, and schedules React re-renders for every subscriber of that key. Here the only
subscriber is `page.tsx` itself (via `useQuery` at line 130). `page.tsx` re-runs its derived
computations and passes new props down.

### Step 5 — Fan-out: every widget re-renders

After the `setQueryData`, `page.tsx` re-renders with:

- `rawOrders` — BC-42 now has `status: 'confirmed'` (inside the cache entry)
- `orders` — still includes BC-42 (confirmed is in ACTIVE)
- `filteredOrders` — same (search unchanged)

Each widget receives updated props:

| Widget | What changes |
|---|---|
| `StatCards` | `totalPending` drops (BC-42's items no longer all `qty_served=0`… ❓ UNVERIFIED: item-level qty_served unchanged here, only order status changed; StatCards counts item qty_served, not order status — so pending count may not change at this step) |
| `WaitingSection` | `PREP_STATUSES = new Set(['pending'])` (`WaitingSection.tsx:9`) — BC-42 is no longer `pending`, so **it disappears from WaitingSection immediately** |
| `PrepPanel` | receives `filteredOrders.filter(o => kiemTraIds.has(o.id) && o.status === 'pending')` (`page.tsx:329`) — BC-42 falls off this list too if it was in kiemTraIds |
| `TableList` | BC-42's row status badge changes from "Chờ xác nhận" → "Đã xác nhận" |
| `TableGrid` | same — border urgency colour from `urgencyBorder()` persists (based on `created_at`, not status) |
| `PaidLog` / `CancelLog` | unaffected — lazy, separate cache key |

### Step 6 — WS confirms (or reconciles)

Shortly after the PATCH, the BE pushes a `order_status_changed` WS message to all subscribers on
`/ws/orders-live`. `useOverviewWS` receives it:

```ts
case 'order_status_changed':
case 'order_updated': {
  if (!msg.status) break
  if (!ACTIVE.has(msg.status)) {
    mutateOrders(prev => prev.filter(o => o.id !== msg.order_id))
  } else {
    mutateOrders(prev =>
      prev.map(o => o.id === msg.order_id ? { ...o, status: msg.status as Order['status'] } : o)
    )
  }
  break
}
```
`useOverviewWS.ts:51-63`

`mutateOrders` calls `queryClient.setQueryData<Order[]>(['orders','live'], ...)` (`useOverviewWS.ts:15-17`).
If the optimistic update was correct (it is for a normal confirm), the WS message is idempotent —
no visible change. If for any reason they diverged, the WS value wins (it overwrites).

### Step 7 — loadingIds cleared

```ts
} finally {
  setLoadingIds(prev => { const s = new Set(prev); s.delete(orderId); return s })
}
```
`page.tsx:186-188`

BC-42 leaves `loadingIds`. The "..." spinner in WaitingSection (if BC-42 were still visible) and
TableList disappears. But because BC-42 left WaitingSection in Step 5 (pending filter), this only
matters for TableList/Grid.

---

## 4. Three layers of state — what belongs where

The page explicitly mixes three layers. Knowing which layer a piece of data lives in is the
whole discipline:

| Data | Layer | Lives in | File:line | Why |
|---|---|---|---|---|
| Live orders (active floor) | **Server state** | TanStack Query `['orders','live']` | `page.tsx:130-134` | shared across WS/SSE/poll; always BE-authoritative |
| Table metadata | **Server state** | TanStack Query `['tables']` | `page.tsx:124-128` | changes rarely, stale 60 s |
| Today's paid/cancelled orders | **Server state** | TanStack Query `['orders','history']` | `PaidLog.tsx:18-23`, `CancelLog.tsx:18-23` | lazy; only loaded on demand |
| Which orders are loading | **Local state** | `loadingIds: Set<string>` | `page.tsx:109` | ephemeral UI only; no server meaning |
| Which tables are "checked" | **Local state** | `checkedTableIds: Set<string>` | `page.tsx:110` | floor-check toggle; no server meaning |
| Which orders are in "Kiểm tra" prep view | **Local state** | `kiemTraIds: Set<string>` | `page.tsx:115` | gates PrepPanel rendering; no server meaning |
| Search input | **Local state** | `searchQuery: string` | `page.tsx:113` | filters derived arrays; not persisted |
| Table view mode (list vs grid) | **Local state** | `viewMode: 'grid'|'list'` | `page.tsx:114` | UI preference; not persisted |
| New-order popup | **Local state** | `popupOrder: Order \| null` | `page.tsx:111` | SSE-triggered; dismissed after confirm |
| Sort direction inside WaitingSection | **Local state** | `sortKey, sortDir` in WaitingSection | `WaitingSection.tsx:43-44` | widget-internal, never shared |
| Expanded row in WaitingSection | **Local state** | `expandedId` in WaitingSection | `WaitingSection.tsx:45` | widget-internal |
| Paying / detail drawer in TableList | **Local state** | `payingEntry, detailEntry` in TableList | `TableList.tsx:257-258` | widget-internal modals |
| WS connection status | **Derived (context)** | `wsConnected` from `useOverviewWS()` | `page.tsx:139` | boolean read from `OrdersWSContext`; displayed as banner |

> **The rule of thumb:** if more than one widget needs it → pass from page via props (it lives in
> `page.tsx` as local state or in the TanStack Query cache). If it is "this widget's UI right now"
> → component-local `useState`. If it comes from the BE and lives beyond a navigation → TanStack
> Query. This page has **no Zustand store** — it is entirely server state + page-local state.

---

## 5. Cross-component vs cross-page boundary

This file covers cross-**component** (many widgets, one page). Cross-**page** (how the admin
overview's writes propagate to KDS, customer tracking, and other devices) is covered in
[admin_overview_crosspage_dataflow.md](admin_overview_crosspage_dataflow.md).

| Scope | Mechanism | Survives F5? | For BC-42 |
|---|---|---|---|
| **Cross-component** (widgets on `/admin/overview`) | TanStack Query cache `['orders','live']` — page.tsx owns `useQuery`, passes derived arrays as props | No (in-memory; refetch on mount) | status patch fans out to StatCards, WaitingSection, TableList, PrepPanel instantly |
| **Cross-page** (KDS on other device, customer tracking, another admin tab) | WS `OrdersWSContext` pushes `order_status_changed` to all connected clients | Yes (WS reconnects and receives any missed status from the next poll) | KDS re-renders its queue; customer `/order/:id` SSE updates status badge |

The two real-time channels serve different roles:

- **SSE** (`useAdminSSE`) is admin-only, fires **`new_order`** events to trigger the popup. It does
  **not** push status changes — those come from WS.
- **WS** (`OrdersWSContext` + `useOverviewWS`) is the general-purpose live channel; it reconciles
  the live cache after optimistic updates.

---

## 6. Gotchas worth remembering

- **WaitingSection filters only `pending`** (`PREP_STATUSES = new Set(['pending'])`, `WaitingSection.tsx:9`),
  so confirming an order makes it vanish from Zone B immediately even before the WS echo arrives.
  This is intentional: WaitingSection is the "needs action" queue.

- **PrepPanel is gated by `kiemTraIds.size > 0` and order must still be `pending`** (`page.tsx:327-329`).
  Confirming an order removes it from PrepPanel even if the 🔍 button was pressed. Staff will see
  PrepPanel shrink or disappear.

- **`setQueryData` is synchronous** — it updates the in-memory cache entry and schedules React
  re-renders in the same tick. The WS echo that arrives ≈200 ms later applies the same mutation
  idempotently. If the PATCH fails (step 3 throws), `setQueryData` is **never called** (it is
  inside the `try` block, after `await`), so no stale optimistic state leaks.

- **StatCards `totalPending`/`totalPreparing` counts items, not orders.** `itemCounts()` reads
  `item.qty_served` vs `item.quantity` (`overview.helpers.ts:11-22`). Advancing order status
  (`pending → confirmed`) does NOT change `qty_served` — item-level progress is a separate WS
  event (`item_progress`). So `totalPending` may not drop immediately when an order is confirmed.

- **`isKitchenItem()` filters combo header rows** (`overview.helpers.ts:7-9`). A combo order
  item with `combo_id != null && combo_ref_id === null` is the header row (₫0 placeholder), not
  displayed or counted in kitchen views. This filter is applied in StatCards, WaitingSection,
  PrepPanel, and the inline expanded views in TableList.

- **PaidLog and CancelLog share the same cache key `['orders','history']`** (`PaidLog.tsx:19`,
  `CancelLog.tsx:19`). Opening either one fetches the data; the other re-uses the same cached
  result (staleTime 30 s). Paying an order in TableList calls
  `queryClient.invalidateQueries({ queryKey: ['orders','history'] })` (`page.tsx:374`) to force a
  refetch and show the newly paid order.

- **Two real-time channels coexist.** For a new order arriving, both SSE (`handleNewOrder`,
  `page.tsx:142-153`) and WS (`useOverviewWS` `new_order` branch, `useOverviewWS.ts:21-30`) can
  insert the order into `['orders','live']`. Both guard with `prev.find(o => o.id === order.id)
  ? prev : [order, ...prev]`, so a duplicate insertion is safe. The popup is triggered by SSE only
  (`setPopupOrder(order)`, `page.tsx:150`); WS does not trigger the popup.

- **`handleConfirmPopup` is a parallel path** to `handleAction`. It directly PATCHes and writes
  `setQueryData(['orders','live'])` (`page.tsx:162-167`) without going through `handleAction`. This
  means `loadingIds` is NOT set for popup-confirm — only `popupLoading` (a separate local state,
  `page.tsx:112`) is set.

---

## 7. The whole action on one timeline (sequence view)

```
  Staff         WaitingSection      page.tsx            Cache ['orders','live']    WS / SSE        BE
    │                │                  │                        │                    │              │
    │    tap "Xác nhận" on BC-42        │                        │                    │              │
    ├──────────────►│                  │                        │                    │              │
    │          onAction(BC-42,'confirmed')                       │                    │              │
    │                ├─────────────────►│                        │                    │              │
    │                │         setLoadingIds add BC-42           │                    │              │
    │                │                  │── prop update ─────────┤                    │              │
    │                │                  │  (loadingIds updated)  │                    │              │
    │          [spinner shows]          │                        │                    │              │
    │                │          PATCH /orders/BC-42/status ──────┼────────────────────┼─────────────►│
    │                │                  │                        │                    │  200 OK      │
    │                │          setQueryData(['orders','live'])   │                    │◄─────────────│
    │                │                  ├── map BC-42.status ──►│                    │              │
    │                │                  │    → 'confirmed'       │                    │              │
    │                │◄────── re-render (prop: filteredOrders) ──┤                    │              │
    │    BC-42 disappears (not pending)  │                        │                    │              │
    │                │         setLoadingIds del BC-42            │                    │              │
    │                │                  │                        │                    │              │
    │                │                  │                        │  order_status_changed push        │
    │                │                  │                        │◄───────────────────┤              │
    │                │          useOverviewWS.setQueryData        │                    │              │
    │                │                  ├── map BC-42.status ──►│                    │              │
    │                │                  │    (idempotent)        │                    │              │
    │                │◄────── re-render (no visible change) ─────┤                    │              │
    ▼                                                                                               │
  (TableList / StatCards also re-rendered at each cache update — see §3 Step 5)
```

**New-order arrival (parallel flow, different trigger):**

```
  BE emits new_order SSE event ──► useAdminSSE.onNewOrder ──► api.get(/orders/NEW_ID)
                                     ──► setQueryData(['orders','live']) prepend order
                                     ──► setPopupOrder(order)           show popup
  BE emits new_order WS event  ──► useOverviewWS new_order branch ──► api.get(/orders/NEW_ID)
                                     ──► setQueryData(['orders','live']) (dedup guard)
```

---

## 8. Source & rule map

| Topic | Source of truth | File:line |
|---|---|---|
| Page zones / wireframe / object model | [admin_overview.md](admin_overview.md) | — |
| BE endpoints, auth, caching, errors | [admin_overview_be.md](admin_overview_be.md) | — |
| Live orders query (the hub) | `page.tsx` | `page.tsx:130-134` |
| Tables query | `page.tsx` | `page.tsx:124-128` |
| ACTIVE status set | `page.tsx` | `page.tsx:26-27`, `useOverviewWS.ts:8` |
| `handleAction` (optimistic write) | `page.tsx` | `page.tsx:174-189` |
| `handleConfirmPopup` (popup path) | `page.tsx` | `page.tsx:158-172` |
| `handleNewOrder` (SSE → cache + popup) | `page.tsx` | `page.tsx:142-153` |
| `onPaymentDone` (TableList → cache filter + history invalidate) | `page.tsx` | `page.tsx:370-375` |
| WS connection + subscribe pattern | `OrdersWSContext.tsx` | `OrdersWSContext.tsx:22-75` |
| WS cache mutator | `useOverviewWS.ts` | `useOverviewWS.ts:14-73` |
| SSE for new_order popup | `useAdminSSE.ts` | `useAdminSSE.ts:17-60` |
| `isKitchenItem` filter | `overview.helpers.ts` | `overview.helpers.ts:7-9` |
| `itemCounts` (StatCards pending/preparing) | `overview.helpers.ts` | `overview.helpers.ts:11-22` |
| `toppingLabel` (PrepPanel nhân / rau) | `overview.helpers.ts` | `overview.helpers.ts:54-68` |
| `summarizePending` (WaitingSection row merge) | `overview.helpers.ts` | `overview.helpers.ts:81-94` |
| `elapsedMins` / `urgencyBorder` (time urgency) | `overview.helpers.ts` | `overview.helpers.ts:3-5`, `96-101` |
| WaitingSection pending-only filter | `WaitingSection.tsx` | `WaitingSection.tsx:9` |
| PrepPanel kiemTraIds gate | `page.tsx` | `page.tsx:327-333` |
| PaidLog/CancelLog lazy history fetch | `PaidLog.tsx`, `CancelLog.tsx` | `PaidLog.tsx:18-23`, `CancelLog.tsx:18-23` |
| `Order` type | `fe/src/types/order.ts` | `order.ts:38-52` |
| `OrderItem` type | `fe/src/types/order.ts` | `order.ts:15-27` |
| `Table` type / `listLiveOrders` / `listTodayHistory` / `updateOrderStatus` / `createPayment` | `admin.api.ts` | `admin.api.ts:159-183` |
| State layers (Query / Zustand / useState) project rule | [04_fe/STATE_MANAGEMENT.md](../../../04_fe/STATE_MANAGEMENT.md) | — |
| Cross-page propagation (WS fan-out to other devices) | [admin_overview_crosspage_dataflow.md](admin_overview_crosspage_dataflow.md) | — |
| Loading states for this page | [admin_overview_loading.md](admin_overview_loading.md) | — |
| Full floor narrative | [SCENARIO_OVERVIEW_FLOOR.md](SCENARIO_OVERVIEW_FLOOR.md) | — |

---

> **One-line mental model:** on `/admin/overview`, the TanStack Query cache entry
> `['orders','live']` is the single thing every zone displays — `page.tsx` owns the one
> `useQuery`, derives filtered arrays, passes them down by props, and is the only writer
> (via `setQueryData` in `handleAction`); WS and SSE are the two other writers that reconcile
> the same cache from the server side, keeping all zones in sync across devices without any
> Zustand store or prop-drilling between peer widgets.
