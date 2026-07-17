> Scratchpad: open questions, risks, undecided items for Admin — Tổng quan.

---

## Open Questions

- [ ] **WS reconnect strategy**: What happens when WS drops and reconnects? Does BE replay missed events, or do we need to re-fetch the full order list? If no replay, the store could be stale for the reconnect window.
- [ ] **`/ws/orders-live` endpoint**: Does it exist on the BE? The spec references it but the API contract should confirm the exact URL, auth header (JWT in query param vs. header?), and event schema.
- [ ] **`item_progress` event schema**: WS pushes `item_progress` to update `qtyServed`. What is the full event shape? `{ orderId, itemId, qtyServed }` assumed — needs BE confirmation.
- [ ] **`table_status` event**: Does the WS also push table status changes (when a table goes from occupied → empty)? Or does Zone D poll the REST endpoint?
- [ ] **Route**: Is the route `/admin/overview` or just `/admin` (root redirect)? The tab bar shows "Tổng quan" as the first tab — it might be `/admin` with a default tab.
- [ ] **Role visibility**: Should `staff` role (kitchen/waiter) see this page without admin/manager privileges? The description says kitchen staff and waiters use it — but `RoleGuard(['admin', 'manager'])` would block them. Clarify RBAC.
- [ ] **Status change authorization**: Can any staff member change order status (e.g., kitchen marks "Sẵn sàng"), or is it role-restricted? API contract should enforce, but FE needs to know which buttons to hide per role.
- [ ] **"Thanh toán (POS)" button**: Zone B description mentions this for "Đã giao" → POS flow. Does clicking this navigate to `/admin/pos/:tableId` or open a modal?
- [ ] **VIP order definition**: What makes an order VIP? Is it a flag on the table (`tables.is_vip = true`) or set at order creation time? Affects how `isVip` is populated in `PrepOrder`.

## Risks

- **WS + REST race condition**: If the initial REST fetch (`['admin', 'overview', 'orders']`) returns slightly stale data and a WS event arrives before hydration is complete, we could briefly show incorrect counts in Zone A. Solution: seed the store from REST first, then start WS listener.
- **30s interval drift**: Each `PrepListCard` timer re-renders every 30s independently. With many concurrent orders, this could cause staggered re-renders. Consider a single page-level interval that updates all elapsed times at once.
- **`UrgencyBorderTimer` on large order lists**: If Zone B has 10+ orders, every 30s tick re-renders all cards. Use `React.memo` aggressively or debounce the timer.
- **Mobile layout**: `admin-overview-mobile.excalidraw` exists but has not been mapped to this spec. Zone B cards stacked vertically on mobile need a separate layout pass.

## Undecided

- Which API endpoint provides the initial order list for WS hydration? `/api/v1/admin/orders?status=active` is assumed but not confirmed in API contract.
- Should `useOverviewStore` persist across navigation (Zustand persist plugin) or reset on unmount? Leaning toward reset — stale order data from a previous session is worse than a brief loading state.
- Skeleton design for `OverviewSkeleton.tsx` — not yet designed. Needed before Pattern B page ships.

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-27*
