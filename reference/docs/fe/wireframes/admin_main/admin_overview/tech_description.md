## Technical Architecture — Admin — Tổng quan

### Page Structure
- Zones: Nav (sticky) · A (4 StatCards) · B (PrepList — order cards) · C (ServingSection — aggregate + per-table) · D (EmptyTableGrid)
- Device target: desktop (1180px primary); see `admin-overview-mobile.excalidraw` for mobile layout
- Sticky zones: Nav (top-0 z-30)
- Modals: none — Zone B has inline `StatusChangeDropdown` (popover, not a full modal)

### RBAC & Auth Rules

| Rule | Value |
|------|-------|
| **Route protection** | `AuthGuard` + `RoleGuard(['admin', 'manager'])` |
| **Allowed roles** | Admin · Manager (Kitchen/Floor Managers) |
| **Auth state used** | `useAuthStore.user.role` — guard check only |
| **Conditional UI by role** | Admin sees all status change actions; Manager sees all except financial totals in Zone C |
| **Unauthorized redirect** | `/admin/login` |

### Tech Stack

```
React (Next.js App Router)
├── State: Zustand (useOverviewStore) — live order data from WS
├── Data: TanStack Query (['admin', 'tables']) — initial REST + WS invalidation
├── Real-time: WebSocket /ws/orders-live — primary data feed for Zones A, B, C
├── Styling: Tailwind CSS (desktop grid, urgency border classes)
└── Types: TypeScript strict — PrepOrder · ServingOrder · TableServing · EmptyTable
```

### Key Implementation Patterns

1. **Component Architecture** — Page is a single `'use client'` component tree. No RSC split needed (all data is real-time and user-session-specific). `page.tsx` is a thin wrapper with guards.

2. **State Management**
```typescript
interface OverviewState {
  connected: boolean
  liveOrders: PrepOrder[]
  tables: EmptyTable[]
  setOrders: (orders: PrepOrder[]) => void
  updateOrderStatus: (orderId: string, status: OrderStatus) => void
  updateQtyServed: (orderId: string, itemId: string, qtyServed: number) => void
  setTables: (tables: EmptyTable[]) => void
}
// Derived selectors — computed outside store, not stored:
// prepOrders   = liveOrders.filter(pending | confirmed | preparing | ready)
// servingOrders = liveOrders.filter(preparing | ready)
// statCards    = { activeTables, waitingCount, preparingCount, urgentCount }
```

3. **Data Fetching** — Two tracks:
   - REST initial: `useQuery(['admin', 'overview', 'orders'])` on mount → seeds `useOverviewStore.liveOrders`
   - WS real-time: `useOverviewWebSocket('/ws/orders-live')` → patches store via `updateOrderStatus` / `updateQtyServed`
   - Tables: `useQuery(['admin', 'tables'])` → REST; WS `table_status` event invalidates this key

4. **Performance** — Zone A stat cards re-render every 30s via `useEffect` timer for elapsed-time accuracy. Zone B and C re-render only on WS message (store update). Use `React.memo` on `PrepListCard` and `TableServingCard` — they receive stable order objects.

5. **Urgency Timer**
   - `UrgencyBorderTimer` takes `elapsedMinutes` and returns a border class: `border-red-500` (>20) · `border-yellow-400` (10–20) · `border-orange-400` (<10) · `border-gray-200` (none)
   - `elapsedMinutes` is re-computed every 30s via the interval in the page root

6. **Edge Cases** — WS disconnect shows `ConnectionErrorBanner`. If an incoming WS event references an `orderId` not in `liveOrders`, trigger a silent refetch of `['admin', 'overview', 'orders']`.

### Rendering Strategy

| Layer | What | Why |
|---|---|---|
| **ISR** | N/A | All data is real-time — no static cache |
| **RSC** | N/A | All data is session-specific (WS) |
| **Client** (`'use client'`) | Zones A · B · C · D · Nav | WebSocket + Zustand + interval timers |

> **Pattern B — Full Client.** All meaningful data is pushed via WebSocket; no sharable static cache exists for this page.
> Gap: Initial page load shows skeleton until REST hydration + WS connection complete (~500ms). Define `<OverviewSkeleton />` to cover this gap.

Register this page in `docs/fe/wireframes/shared/_INDEX_RENDERING_STRATEGY.md` after implementing.

### File Organization

```
src/
├── app/admin/overview/
│   ├── page.tsx                    # thin wrapper: AuthGuard + RoleGuard + OverviewClient
│   └── components/                 # local — overview-only components
│       ├── OverviewClient.tsx      # 'use client' root — owns WS hook + store init
│       ├── PrepStatCards.tsx       # Zone A — 4 × KPICard
│       ├── PrepListSection.tsx     # Zone B — wrapper + header
│       ├── PrepListCard.tsx        # Zone B — single order card
│       ├── StatusChangeDropdown.tsx# Zone B — inline status action popover
│       ├── ServingSection.tsx      # Zone C — wrapper + summary
│       ├── DishSummaryRow.tsx      # Zone C — per-dish aggregate row
│       ├── TableServingCard.tsx    # Zone C — per-table tổng/ra/còn
│       ├── EmptyTableGrid.tsx      # Zone D — grid wrapper
│       ├── EmptyTableCard.tsx      # Zone D — single table card
│       └── OverviewSkeleton.tsx    # Pattern B skeleton (required)
├── hooks/
│   └── useOverviewWebSocket.ts    # WS connection + event handlers
└── store/
    └── overviewStore.ts            # useOverviewStore (Zustand)
```

### State Contract

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useOverviewStore` | `liveOrders` · `tables` · `connected` | `setOrders` · `updateOrderStatus` · `updateQtyServed` · `setTables` | Created on mount, cleared on unmount | KDS page reads same order data via separate WS channel |
| `useAuthStore` | `user.role` | — | Persistent across pages | — |

### Critical Implementation Notes
- Zone A urgency count: `urgentCount = liveOrders.filter(o => o.elapsedMinutes > 20).length` — recomputed every 30s, not per WS event (timer is the driver here)
- Status change API: `PATCH /api/v1/admin/orders/:id/status` body `{ status: OrderStatus }` — optimistic update in store, rollback on error
- Zone B sort order: urgent (>20min) first → by elapsed time descending → VIP last within same urgency tier
- `DishSummaryRow` deduplication: same `productName` across multiple orders is summed; table labels listed comma-separated
- `TableServingCard` remaining = `totalItems - servedItems`; show 0 as "Hoàn thành" (all served)
