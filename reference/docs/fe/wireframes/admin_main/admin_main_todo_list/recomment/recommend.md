> UX/UI review for Admin — Staff Task List. Flow B (spec-first) — fill details after /excalidraw.

---

## ✅ UX Strengths

1. **Single-page, no nested navigation** — All task management (view, filter, create, toggle) lives on one page. No tab-hopping reduces cognitive load for a busy manager.
2. **Optimistic checkbox** — Zero-latency feedback for the most common action (marking done). Staff feel in control even on spotty kitchen Wi-Fi.
3. **Overdue visual flag** — Red badge/row tint means overdue tasks are impossible to miss without additional reporting.
4. **Role-appropriate UI** — Staff only see their own tasks and only the checkbox interaction. No clutter from features they can't use.
5. **Responsive by design** — Staff can tick checkboxes from a mobile phone on the floor, not just from the manager's desktop.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Filter reset | No "Reset bộ lọc" button specified | Add a "Xóa bộ lọc" link next to the "Lọc" button to restore defaults with one tap |
| Filter feedback | After applying a filter, it's unclear if results are stale or fresh | Show a subtle "Đã lọc" chip or timestamp ("Cập nhật lúc 10:32") below the filter bar |
| Bulk complete | Managers may need to close out an entire shift's tasks | Consider a "Đánh dấu tất cả hoàn thành" batch action for v1.1 |
| Empty state — no tasks assigned | If a staff member has zero tasks, the empty state should be actionable for managers | `EmptyState` message should include a "+ Tạo công việc" shortcut button (not just text) |
| Pagination vs. infinite scroll | 15 tasks/page may feel choppy on mobile | Consider infinite scroll (or "Tải thêm" button) for the mobile card view to avoid tap-heavy pagination |
| Confirmation on delete | "🗑️ Xóa" with no confirmation is destructive | Add a single confirmation dialog: "Xóa công việc này?" with Hủy / Xóa |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Overdue row styling | Spec mentions "red badge/row tint" — exact treatment TBD | Use `bg-red-50` row tint + `TaskStatusBadge variant="overdue"` (already exists). Avoid full red row (too harsh). |
| Checkbox size | Default HTML checkbox is too small for touch targets | Use custom checkbox component with `min-h-[44px] min-w-[44px]` touch area, not the bare `<input type="checkbox">` |
| Mobile card layout | Card design not yet drawn | Suggested card: task title (bold, 2 lines max) + staff name + due time + status badge + actions (⋮ menu on mobile instead of row buttons) |
| Table column priority (mobile) | On small screens, can't show all columns | Priority: checkbox · title · status badge. Hide: staff name (filter implies it), created date |
| Due time display | "2026-05-27 10:00" is long | Show relative time for near-future: "Hôm nay 10:00" or "Ngày mai 08:30". Show absolute for older tasks. |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|-----------------|--------|
| A | Header + "+ Tạo" button (Manager only) | [TBD — run /excalidraw] | Confirm button position and icon |
| B | Staff dropdown + DateRangePicker + status filter + Lọc button | [TBD] | Confirm filter layout fits on mobile |
| C | Table on desktop, cards on mobile | [TBD] | Confirm table column order; add mobile card mockup |
| D | Create/Edit modal with 4 fields | [TBD] | Confirm modal width and field order |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets ≥ 44px — especially the checkbox and row action buttons
- [ ] Screen reader labels on checkbox: `aria-label="Đánh dấu hoàn thành: [task title]"`
- [ ] Modal has `role="dialog"` + `aria-labelledby` pointing to the modal title
- [ ] Keyboard: Tab through form fields → Enter to submit → Esc to close modal
- [ ] `prefers-reduced-motion` — skip optimistic animation if user has reduced motion preference
- [ ] Error state: if task toggle fails, don't silently fail — show a toast notification

---

## 🚀 Recommended Next Steps

1. Run `/excalidraw admin_main/admin_main_todo_list` to draw the visual wireframe — focus on Zone B (filter bar) and Zone D (modal) as these have the most layout decisions.
2. Confirm with owner: does this page use the same BE endpoints as the Staff Task Board, or new ones? (see conccern.md)
3. Design the mobile card (`TodoTaskCard`) before table implementation — mobile is the primary use case for staff checkbox interactions.
4. Add `TodoPageSkeleton` to the implementation plan — required for Pattern B, often forgotten until late.
5. Test the optimistic checkbox rollback scenario on a throttled network before shipping.

---
*Review date: 2026-05-27*
*Reviewed by: —*
