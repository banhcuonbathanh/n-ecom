# Claude Guidelines — Client — Theo Dõi Đơn Hàng

> Read this before implementing `/(shop)/tracking`.

---

## Spec Summary

- Mobile-only SSE-powered page — customer reads live order progress without polling
- Zone B surfaces the single most important stat: queue position + ETA for the customer's table
- Zone C is a full receipt view so the customer can verify order accuracy before food arrives
- Zone D shows the live service queue (5 orders visible) so the customer understands their wait context
- Zone E gives ambient restaurant awareness via a 3×4 color-coded table grid
- Zone F (bottom nav) provides access to Menu and Favourites from any client page

Key constraint: **all data is user-specific and real-time** — Pattern B (full client) is mandatory. There is no shared cache to ISR. The SSE hook is the primary data source; TanStack Query is used only for the initial order detail fetch.

---

## Shared Components — Reuse Checklist

> These components must be registered in `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md` before implementation starts.

| Component | Tier | File | Register in Index? |
|-----------|------|------|--------------------|
| `TableLayoutMap` | Tier 2 — Shared | `shared/TableLayoutMap.tsx` | ✅ Yes — also used by admin/overview and POS table select |
| `ClientBottomNav` | Tier 2 — Shared | `shared/ClientBottomNav.tsx` | ✅ Yes — used by all client-facing pages (Menu, Monitoring, Order) |

Existing shared components to reuse (do NOT rebuild):
- `StatusBadge` — `shared/StatusBadge.tsx` — for Zone B and Zone D status chips
- `ConnectionErrorBanner` — `shared/ConnectionErrorBanner.tsx` — for SSE disconnect
- `EmptyState` — `shared/EmptyState.tsx` — for empty table map fallback
- `useSettingsStore` — `store/settings.ts` — for `guestToken` + `tableLabel`

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|----------------|-----|
| `guestToken` · `tableLabel` | Zustand `useSettingsStore` | Written at QR session start; persisted to localStorage; crosses pages |
| `orderStatus` · `queueData` · `tableStatuses` | `useState` (local, page) | SSE push data — doesn't cross pages, no need for global store |
| `sseConnected` | `useState` (local, page) | UI-only flag for LIVE badge + error banner |
| Order detail items + total | TanStack Query `['order', orderId]` | Initial HTTP fetch; staleTime 0; SSE may delta-update via cache invalidation |
| Form state | N/A | This page has no forms |

Do not create a new Zustand store for this page. Local `useState` is sufficient for all SSE-driven state.

---

## SSE Implementation Notes

The SSE hook must handle the following correctly:

```typescript
// hooks/useOrderMonitorSSE.ts
export function useOrderMonitorSSE(orderId: string, guestToken: string) {
  // 1. Close EventSource on unmount (critical — memory leak if skipped)
  // 2. Auto-reconnect with exponential backoff: 3s → 6s → 12s → 24s
  // 3. Re-open on visibilitychange (iOS Safari kills SSE in background)
  // 4. Set sseConnected = false immediately on onerror (don't wait for retry)
  // 5. Dispatch typed SSEEvent union — use discriminated union, not switch on string
}
```

Do NOT inline the EventSource setup in `page.tsx`. Extract to `hooks/useOrderMonitorSSE.ts` so it can be tested independently and reused if a staff monitoring page is added later.

---

## Performance Checklist

- [ ] `TableMapCell` wrapped in `React.memo` — Zone E re-renders on every `tables.status` push; memoize cells to avoid 12× repaints per event
- [ ] `ServiceQueueItem` wrapped in `React.memo` — 5 rows × N events = unnecessary work without memoization
- [ ] `useCallback` on SSE dispatch handlers passed as props to memoized children
- [ ] No `useEffect + fetch` patterns — use `useQuery` for the initial order fetch, SSE hook for live data
- [ ] Images: none on this page; skip `next/image` concern
- [ ] Skeleton: `<MonitoringSkeleton />` must exist — shown while `useQuery` is loading and SSE hasn't connected yet

---

## Cross-Page Notes

- State shared with other pages: `useSettingsStore` (guestToken, tableLabel, activeOrderId) — written at checkout/QR scan, read here
- Navigation FROM this page: Menu (`/(shop)/menu`), Favourites (`/(shop)/menu/favourites`) via `ClientBottomNav`
- Navigation TO this page: from checkout completion page, or directly via QR scan → auto-load with guestToken

---

## Non-Obvious Implementation Notes

- `orderId` must come from `useSettingsStore.activeOrderId`, NOT from URL params. Guests have no auth; URL params can be shared or guessed. Using the store ensures only the session that placed the order can see its details.
- The queue list in Zone D must NOT be re-sorted client-side. The server sends the queue in service order. Re-sorting would cause the highlighted "Đơn của bàn" row to jump positions visually, creating a confusing UX.
- Zone E table T.04 has a red border + "[BÀN BẠN]" label in the excalidraw. However, red = "chờ món" status color. Consider using an indigo/blue highlight for the current-table indicator to distinguish from status meaning (see recommend.md).
- `ClientBottomNav` "Làm Mới" must call the SSE hook's `reconnect()` function, NOT `router.refresh()`. Using `router.refresh()` would trigger a full RSC revalidation + re-mount, losing all local SSE state and causing a blank screen flash.
- The LIVE badge should update within 1 frame of `sseConnected` changing state. Do not debounce this — users notice SSE disconnect within 2–3 seconds and need immediate visual feedback.

---
*Created: 2026-05-27*
