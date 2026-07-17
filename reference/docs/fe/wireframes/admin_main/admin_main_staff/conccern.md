> Scratchpad: open questions, risks, undecided items for Admin — Nhân viên.

---

## Open Questions

- [ ] **Pagination: server-side or client-side?** The excalidraw shows Zone E pagination, but the current `GET /admin/staff` endpoint returns all records at once. If staff count grows beyond 50, server-side pagination is needed. The current approach (client-side filter + paginate) breaks Stats Bar correctness once server-side pagination is used — stats would only reflect the current page.
- [ ] **Performance score calculation:** The excalidraw shows a `performance_score` (0–100%) in Zone D and the Hiệu suất tab. How is it computed? Is it a stored field in the DB, derived from order history on the fly by the BE, or calculated FE-side from raw metrics?
- [ ] **Status toggle UX:** Should clicking the status badge directly toggle it (with confirm dialog), or should the user go through "Sửa" to change status? The excalidraw shows it as a badge but doesn't clarify if it's a toggle. The existing spec `Spec_7_Staff_Management.md` mentions `PATCH /admin/staff/:id/status` — so it's a dedicated endpoint.
- [ ] **Xóa vs. Vô hiệu:** The excalidraw shows both "Xóa" (delete) and status toggle. Should "Xóa" do a hard delete or a soft delete (mark inactive)? Hard delete is destructive — staff with order history should probably be soft-deleted.
- [ ] **Manager role Xóa restriction:** Is it Admin-only who can delete, or is it specifically that Managers cannot be deleted at all? The excalidraw hides Xóa for the Manager role row — but should a Manager also be unable to delete any other staff?
- [ ] **Edit password on sửa:** Should the Edit modal allow changing a password? If yes, add an optional "Đổi mật khẩu" section with current password confirmation. Currently the excalidraw hides the password field in edit mode entirely.
- [ ] **Lịch làm việc tab (M2):** The excalidraw shows "T2–T6" as working days. Is this a fixed weekly schedule or a per-day override? Who sets which days the staff works — the manager, or is it derived from shift assignments in a schedule system?
- [ ] **Hiệu suất tab data freshness:** The performance metrics (tổng đơn, đúng giờ %, ngày nghỉ) — what time range do they cover? Current month? All time? The excalidraw doesn't specify.

## Risks

- **Stats Bar accuracy with pagination:** If we later add server-side pagination, the Stats Bar (Zone B) can no longer derive accurate totals from the current page. A separate `GET /admin/staff/summary` endpoint or always-fetching the full list may be needed.
- **`performance_score` undefined on new staff:** New staff will have no order history, so `performance_score` will be undefined or 0. The progress bar must handle 0 gracefully (not crash or show as full bar).
- **Concurrent edits:** If two admins edit the same staff record simultaneously, last-write-wins. No optimistic lock in current spec.

## Undecided

- Whether `Pagination` should be a new shared component in `components/shared/Pagination.tsx` or use an existing library (shadcn/ui Pagination). Recommend: build a thin wrapper over shadcn to keep consistent styling.
- Whether to show a confirmation dialog or a confirm popover for the Xóa action (full modal vs. `window.confirm` vs. inline popover).
- The `StaffDetailDrawer` — should it be a drawer (slide from right) or a centered modal? The excalidraw shows a centered modal layout but calls it "drawer" in the existing md. Recommend: slide-in drawer for detail (less disruptive), centered modal for add/edit.

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-26*
