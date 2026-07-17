## Technical Architecture — Client — Theo Dõi Đơn Hàng

### Page Structure
- Zones: A (Header + LIVE badge) · B (Table identity + queue ETA) · C (Order detail receipt) · D (Live service queue 5 rows) · E (3×4 table layout map) · F (Bottom nav)
- Device target: mobile (420px primary; responsive up to 1280px)
- Sticky zones: A (top-0 z-20) · F (bottom-0 z-20) · ConnectionErrorBanner (top-0 z-30, conditional)
- Modals: none

### RBAC & Auth Rules

| Rule | Value |
|------|-------|
| **Route protection** | Guest-token guard (via `useSettingsStore.guestToken`) |
| **Allowed roles** | Guest (QR session only) |
| **Auth state used** | `useSettingsStore.guestToken` · `useSettingsStore.tableLabel` |
| **Conditional UI by role** | None — page is read-only for all guests |
| **Unauthorized redirect** | QR scan entry page if `guestToken` is missing or 401 returned |

### Tech Stack

```
React (Next.js App Router)
├── State: Zustand (useSettingsStore) — tableLabel · guestToken
├── Data: TanStack Query (['order', orderId]) — initial order fetch only
├── Realtime: native EventSource (SSE) — queue · tables · order status
├── Styling: Tailwind CSS (mobile-first, sticky header/footer pattern)
└── Types: TypeScript interfaces for OrderDetail · QueueItem · TableStatus · SSEEvent
```

### Key Implementation Patterns

1. **Component Architecture** — Page is a single `'use client'` component (Pattern B). No RSC split needed — all data is user-specific (guestToken) and real-time. Local zones are small enough to avoid code-splitting.

2. **State Management**

```typescript
// Global (Zustand)
const { guestToken, tableLabel } = useSettingsStore()

// Local (useState inside page)
const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
const [queueData, setQueueData]     = useState<QueueState | null>(null)
const [tableStatuses, setTableStatuses] = useState<TableStatus[]>([])
const [sseConnected, setSseConnected]   = useState(false)

// Server cache (TanStack Query — initial fetch only)
const { data: order } = useQuery({
  queryKey: ['order', orderId],
  queryFn: () => fetchOrder(orderId, guestToken),
  staleTime: 0,
  refetchOnWindowFocus: false,
})
```

3. **Data Fetching Strategy** — One HTTP GET for initial order detail (Zone C). All subsequent updates come via SSE. The SSE hook (`useOrderMonitorSSE`) manages the EventSource lifecycle and dispatches to local state. Do not use `useQuery` for queue or table data — they are push-only from the server.

4. **SSE Reconnect** — Use exponential backoff (3s → 6s → 12s → 24s cap) on `EventSource.onerror`. Show `ConnectionErrorBanner` immediately on disconnect; hide it on reconnect. The "Làm Mới" button in Zone F provides a manual reconnect escape hatch.

5. **Performance Optimizations** — `TableLayoutMap` renders 12 cells; memoize with `React.memo` on `TableMapCell` to avoid re-rendering the entire grid on every SSE event. Use `useCallback` on the SSE dispatch handlers.

6. **Edge Case Handling** — `status === 'delivered'` triggers a visual transformation of Zone B (green state, "Đã phục vụ" copy). `queuePosition === 1` adds a pulse CSS animation to the ETA badge via a conditional Tailwind class.

### Rendering Strategy

| Layer | What | Why |
|---|---|---|
| **ISR** | N/A | All data is user-specific (guestToken) — no shared cache possible |
| **RSC** | N/A | Pattern B — full client, no server-side prefetch |
| **Client** (`'use client'`) | Zones A · B · C · D · E · F (entire page) | SSE + Zustand require client runtime |

> Gap: Initial order detail (`['order', orderId]`) causes a brief loading flash on cold visit — show `<MonitoringSkeleton />` until the query resolves. The SSE connection typically opens 200–400ms after mount — queue/table data may lag by one tick on first render.

Register this page in `docs/fe/wireframes/shared/_INDEX_RENDERING_STRATEGY.md` after implementing.

### File Organization

```
src/
├── app/(shop)/tracking/
│   ├── page.tsx                          ← 'use client' root; owns SSE hook + query
│   └── components/
│       ├── MonitoringTopBar.tsx
│       ├── TableInfoBanner.tsx
│       ├── OrderDetailCard.tsx
│       ├── ServiceQueueList.tsx
│       ├── ServiceQueueItem.tsx
│       └── MonitoringSkeleton.tsx        ← required for Pattern B
├── components/
│   ├── shared/
│   │   ├── TableLayoutMap.tsx            ← new shared; also used by admin/pos
│   │   └── ClientBottomNav.tsx           ← new shared; used by all client pages
│   └── ui/
│       └── (existing atoms)
├── hooks/
│   └── useOrderMonitorSSE.ts             ← top-level; NOT inside page folder
└── store/
    └── settings.ts                       ← existing; no changes needed
```

### State Contract

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useSettingsStore` | `guestToken` · `tableLabel` | — | Written at QR session start; read-only on this page | `/(shop)/menu` reads same store for cart |

### Critical Implementation Notes
- `orderId` is derived from `useSettingsStore.activeOrderId` — do NOT read from URL params (guests have no auth, URL can be shared/spoofed)
- SSE endpoint must validate `guestToken` server-side before streaming; reject 401 immediately
- `TableLayoutMap` cell size must be at least 44px touch target — use `min-h-[44px]` per cell for tap accessibility
- `ClientBottomNav` "Làm Mới" action closes the current EventSource and calls `useOrderMonitorSSE`'s reconnect; do not use `router.refresh()` as that loses all local SSE state
- The highlighted queue row (amber border on Zone D) must remain stable — do not re-sort the queue list on each SSE push (keep server order, only update status fields)
