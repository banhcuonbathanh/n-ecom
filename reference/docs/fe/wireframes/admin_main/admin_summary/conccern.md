> Scratchpad: open questions, risks, undecided items for Admin — Tổng Kết Ngày.

---

## Open Questions

- [ ] **Aggregate endpoint design** — Is `GET /api/v1/admin/summary?date=` a single heavy query hitting multiple tables, or is it pre-computed and cached (e.g. in Redis) after each day ends? Heavy real-time joins on a busy day could be slow.
- [ ] **"Giờ Hoạt Động" metric** — How is this calculated? Is there a formal shift clock-in/clock-out system, or is it derived from the first and last order of the day?
- [ ] **Peak hour annotation (★)** — Is the top-2-by-volume logic computed by the backend, or does the FE need to sort `hourlyRevenue` and flag the top 2 itself? The spec says backend, but needs API contract confirmation.
- [ ] **Inventory alerts source** — Does Zone 7 data come from the same `/summary` endpoint, or from a separate inventory/storage API (`/api/v1/admin/ingredients`)? If separate, it needs its own query key and error boundary.
- [ ] **Payment split data** — Does the existing orders table record payment method per order (cash / vnpay / momo)? If payment method is only stored in the payment transactions table, the join needs to be confirmed with the BE team.
- [ ] **Staff performance — multi-staff orders** — If two staff members both interact with the same order, whose stats does it count toward? Is it the last modifier, the creator, or split?
- [ ] **Shift log permissions** — Can a Manager delete their own shift notes? Or is it truly append-only for all roles including Admin? Needs a policy decision before the BE endpoint is built.
- [ ] **"Đơn Bị Hủy" in Zone 4 vs Zone 5** — Zone 5 shows total cancelled count (3). Zone 4 shows the most-cancelled menu item (Bánh Cuốn Thập Cẩm — 3 hủy). Are these the same 3 orders? Need to confirm whether "most cancelled item" refers to line items within any order, or just the primary item of a fully cancelled order.
- [ ] **Tablet layout** — The spec says "responsive at 768px". Are 2-column zones (Zone 2, Zone 4) stacked vertically on tablet, or do they shrink? No design exists for tablet yet.

## Risks

- **Heavy aggregate query** — If the summary endpoint runs live joins across orders + order_items + payments + staff_sessions on every page load, it will be slow at peak hours. Consider a nightly compute job or Redis cache keyed by `date`.
- **Chart library not in stack** — Recharts / Tremor may not yet be installed in the FE. Adding a chart library is a non-trivial dependency — confirm before SUM-4 starts.
- **`AdminSingleDatePicker` is new (shared)** — Must be registered in `_INDEX_SHARING_COMPONENT.md` and built before any page that needs single-date filtering. Do not inline a duplicate picker in this page.

## Undecided

- Whether `StaffPerformanceTable` sorts server-side (BE returns rows sorted by `ordersHandled` desc) or client-side (FE sorts the received array). Server-side is cleaner and avoids a sort on every render.
- Whether Zone 7 (inventory alerts) should show a "refresh" button for manual re-fetch, or rely purely on TanStack Query's background refetch.
- Whether `AddShiftNoteModal` should show the author's name after posting (already in `ShiftLogEntry.authorName`) or keep it anonymous in the UI.

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-27*
