---
page: client_order_page
type: open questions + risks
updated: 2026-05-28
---

# Concerns — Client Order Tracking Page

> Scratchpad for the owner + developer. Not a polished spec. Free to edit.

---

## SSE & Realtime

- SSE disconnect + reconnect gap is not resolved: if bếp completes 2 items while the customer's phone is offline, the `còn×N` badge will be stale until the next event. `refetchOnWindowFocus: true` is the mitigation — but is that enough on iOS Safari where background tabs lose the EventSource entirely?
- iOS Safari kills EventSource when the screen locks. Is there a `visibilitychange` reconnect handler planned? This is the same gap as `client_tracking`.
- If the SSE stream is replaced with polling as a fallback (every 10s), does that conflict with `staleTime: 0` on the query? Need to confirm there's no double-fetch.

---

## Cancel Logic

- The spec says customers can "huỷ từng món bất kỳ lúc nào" — but what happens if the kitchen has already started preparing that item? Does the backend reject the cancel or silently succeed?
- If cancel fails (API 4xx), the UI must NOT remove the item. Is this rollback behavior implemented in the mutation's `onError` handler?
- The "Huỷ toàn bộ đơn hàng" button appears only when `progress < 30%`. Is this 30% threshold configurable from the admin side, or hardcoded? Should it be in the spec?
- After the whole-order cancel succeeds, where does the customer land? Back to menu? A confirmation screen? Not defined yet.

---

## Zone 6 — "Thêm món" (Add More)

- When the customer taps "＋ Thêm món", does it open the menu with `activeOrderId` set so new items are added to the existing order, or does it create a new separate order?
- If new items are added to the same order, how does the progress bar update? Does `partsTotal` grow? The wireframe doesn't address this.
- If the table_id is null (takeaway), Zone 6 is hidden. But can a takeaway customer have their order partially delivered and then want to add more? Edge case, but needs a decision.

---

## Progress Bar

- `progressPercent = (qtyServedTotal / qtyTotal) * 100` — but does this count by item quantity or by order line? If a combo has 3 sub-items and 1 is served, is progress 1/3 or 0/1?
- The 30% threshold for Zone 5 (cancel whole order) is based on `progressPercent`. If calculated by sub-item count vs. order lines, the threshold behaves differently. Need to align with BE.

---

## Money Display

- Zone 3 shows "Đã dùng (X phần)" and "Còn lại (Y phần chưa ra)". What does "phần" mean here — number of line items, or number of individual servings (`qtyServed` sum)? The Vietnamese is ambiguous.
- "Đã dùng" is money for already-served portions. If a combo is partially served (2 of 3 sub-items), does its price count as "used" proportionally, or only when the full combo is done?

---

## Modal A — Order Confirmed

- Modal A auto-opens on SSE `order_confirmed`. What if the customer dismisses it and misses it? Is the estimated wait time available elsewhere on the page?
- If the user refreshes the page after `order_confirmed` has already fired, Modal A should NOT auto-open again. Is there a "seen" flag in localStorage or session?

---

## Skeleton & Loading

- `<OrderPageSkeleton />` is not yet built (marked ❌ in tech_description.md). Without it, the page shows a blank screen on every cold visit (Pattern B). This is a **blocker before shipping**.
- Should the skeleton mimic the exact layout (nav + order card + table + money card) or is a generic spinner acceptable?

---

## Navigation

- Back button (`←`) — where does it go? Menu? Order history? If the customer came from the menu, `router.back()` works. But if they opened the link directly (deep link from SSE notification), there is no history. Need a defined fallback URL.

---

## WIREFRAME_INDEX.md

- Row 21 links to `order_ver2.excalidraw` as the visual reference. But there is also `order.excalidraw` and `flow-customer-ordering-pages.excalidraw`. Which is the canonical visual? The index entry should be clarified.
