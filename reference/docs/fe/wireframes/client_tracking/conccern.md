> Scratchpad: open questions, risks, undecided items for Client — Theo Dõi Đơn Hàng.

---

## Open Questions

- [ ] What is the confirmed FE route for this page? The excalidraw has no route label. Best guess is `/(shop)/tracking` but it could be `/(shop)/order-status` or `/(shop)/theo-doi`. Needs confirmation from owner before routing is wired up.
- [ ] How does the page know which `orderId` to load? Current assumption: `useSettingsStore.activeOrderId` is written at checkout. If the guest refreshes the page or navigates away, is `activeOrderId` still in localStorage? What's the fallback if it's missing?
- [ ] Does the SSE endpoint `/api/v1/sse/order-monitor/:id` exist on the BE? The existing SSE spec (flow-realtime.excalidraw) focuses on KDS — unclear if a customer-facing monitor endpoint is implemented in Phase 4.
- [ ] What is the full list of `OrderStatus` values that can appear in Zone B? The excalidraw shows "Đang chuẩn bị" but doesn't show what comes before (pending / confirmed) or after (delivered). Need the full state machine from `docs/spec/Spec_4_Orders_API.md`.
- [ ] Zone D shows exactly 5 rows in the excalidraw. Is 5 the hard maximum, or can the queue grow longer with a scroll? Needs UX decision.
- [ ] Zone E shows 12 tables (T.01–T.12). Are the table IDs/labels static or pulled from the DB? If a restaurant adds a T.13, does this map auto-expand or need a config change?
- [ ] What happens when `status === 'delivered'`? The excalidraw doesn't show this final state. Does Zone B change content? Does the page stay open or redirect somewhere (e.g., payment page)?

## Risks

- SSE reconnect on mobile: iOS Safari aggressively kills background EventSource connections when the screen locks. The backoff reconnect logic must handle re-opening the connection on `visibilitychange` (page becomes visible again).
- `guestToken` exposure in the SSE URL query string (`?token=...`) may be logged by proxies. Consider using a short-lived SSE token separate from the main `guestToken`, or pass via Authorization header if the SSE client supports it.
- Table map (Zone E) re-renders the full 12-cell grid on every `tables.status` SSE push. Without `React.memo` on `TableMapCell`, this will cause unnecessary repaints. Must be addressed before testing on low-end devices.

## Undecided

- Should "Làm Mới" show a loading spinner while SSE reconnects, or just silently re-establish the connection?
- Should Zone C (order detail) also update if the order gets a new item added mid-session (e.g., staff adds an item from POS)? Currently assumed static after initial fetch.
- Color-blind accessibility: the Zone E table map relies on red/orange/green color alone. Should a shape/icon indicator be added for accessibility compliance?

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-27*
