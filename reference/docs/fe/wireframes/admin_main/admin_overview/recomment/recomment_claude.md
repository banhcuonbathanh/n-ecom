# Claude Guidelines — Admin — Tổng quan

> Read this before implementing the Admin Overview page.

---

## Spec Summary

- Real-time operations dashboard: Floor Manager, Kitchen Staff, Waiters
- Zone A: 4 KPI stat cards derived from live order data (30s interval + WS push)
- Zone B: prep queue — per-table order cards, color-coded by status, inline status change
- Zone C: serving tracker — "Tổng cần làm" aggregate + per-table tổng/ra/còn
- Zone D: empty table grid — REST-fetched, WS-invalidated
- WS endpoint: `/ws/orders-live` — primary data feed

Key constraint: **All meaningful data is real-time (WebSocket)**. Do not try to use ISR or RSC prefetch here — there is no shareable static cache for live order data.

---

## Shared Components — Reuse Checklist

> Copy all rows marked `new (shared)` from the Component Specifications table.
> Register in `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md` before implementation starts.

| Component | Tier | File | Register in Index? |
|-----------|------|------|--------------------|
| `UrgencyBorderTimer` | Tier 2 — shared | `shared/UrgencyBorderTimer.tsx` | ✅ Yes — usable by KDS page and any order-time alerting page |

All other new components (`PrepListCard`, `StatusChangeDropdown`, `ServingSection`, etc.) are local to `/admin/overview/components/` — do not register them in the shared index.

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|---------------|-----|
| Live order list | `useOverviewStore.liveOrders` (Zustand) | Multiple zones (A, B, C) read different derived views of the same order array |
| Empty tables | TanStack Query `['admin', 'tables']` | REST data, WS invalidates rather than patching — simpler than storing in Zustand |
| Auth / role | `useAuthStore` | Cross-page standard |
| Elapsed time tick | `useState` + `useEffect` interval in `OverviewClient.tsx` | Single 30s timer for the whole page — drives re-renders of urgency borders |
| Dropdown open state | `useState` local in `PrepListCard` | Not shared; no store needed |

**Do not** create per-card interval timers. One interval at the page root, re-renders propagate down via store selector.

---

## WS Integration Notes

```typescript
// useOverviewWebSocket.ts
// Connect on mount, disconnect on unmount. Auto-reconnect on close.
// Events to handle:
//   'order_update'   → { orderId, status, elapsedMinutes } → store.updateOrderStatus()
//   'item_progress'  → { orderId, itemId, qtyServed }      → store.updateQtyServed()
//   'table_status'   → { tableId, status }                 → queryClient.invalidateQueries(['admin', 'tables'])
//   'connected'      → set store.connected = true
//   'disconnected'   → set store.connected = false → show ConnectionErrorBanner

// On WS reconnect: re-fetch ['admin', 'overview', 'orders'] to re-seed the store
// This handles any missed events during the disconnect window
```

---

## Performance Checklist

- [ ] `React.memo` on `PrepListCard` and `TableServingCard` — they receive stable order objects and should not re-render on unrelated store changes
- [ ] Derived selectors (`prepOrders`, `servingOrders`, `statCards`) must be computed outside the store using `useMemo` or Zustand `computed` — do not store derived state
- [ ] Lists > 10: Zone B may have many order cards — add `key={order.orderId}` and ensure stable references
- [ ] Images: no images on this page — n/a
- [ ] Animations: `UrgencyBorderTimer` — wrap `animate-pulse` in `@media (prefers-reduced-motion: no-preference)` check

---

## Cross-Page Notes

- State shared with other pages: `useAuthStore` (all admin pages)
- Navigation from this page: Zone B "Thanh toán (POS)" → `/admin/pos/:tableId`
- Navigation to this page: from any admin nav tab — tab bar is in `AdminTopNav`
- `useOverviewStore` is page-local — clear on unmount, do not persist to localStorage

---

## Non-Obvious Implementation Notes

1. **Sort Zone B by urgency first**: the most urgent orders (>20min, red border) must be at the top — not insertion order. Implement as a selector: `sort((a, b) => b.elapsedMinutes - a.elapsedMinutes)`.
2. **`DishSummaryRow` aggregation**: aggregate across all `prepOrders.flatMap(o => o.items)`, group by `productName`, sum `qty - qtyServed` (remaining), collect unique `tableLabel` values. This is a pure computed operation — no API call needed.
3. **`TableServingCard` "Hoàn thành" state**: when `còn === 0`, do not remove the card — show it with a green checkmark and grey text. Removing it mid-session is disorienting.
4. **Zone D cards**: `emptyTables` comes from `useQuery(['admin', 'tables'])` filtered to `status === 'empty'`. The `table_status` WS event invalidates this query — no need to patch Zustand manually.
5. **ConnectionErrorBanner**: import from `shared/ConnectionErrorBanner.tsx` (already exists in Tier 2). Show when `useOverviewStore.connected === false`. It renders as a fixed top banner — make sure it doesn't conflict with the sticky nav (`z-30` on nav, `z-40` on banner).

---
*Created: 2026-05-27*
