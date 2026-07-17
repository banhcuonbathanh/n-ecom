> UX/UI review for Admin — Nhân viên. Filled from excalidraw review.

---

## ✅ UX Strengths

1. **Zero extra API calls for stats:** Zone B derives all four KPI cards from the same `GET /admin/staff` query — no waterfall, no spinner on the stats bar.
2. **Immediate client-side filtering:** Zone C filters update Zone D on each keystroke — no "Search" button, no round trip. Feels instant.
3. **Role-colored visual hierarchy:** Avatar background + role badge + text color are all coordinated per role (red = Bếp, blue = Thu ngân, green = NV, purple = QL) — scannable at a glance without reading text.
4. **Tabbed detail drawer reduces page navigation:** M2 surfaces performance, schedule, and responsibilities in tabs without leaving the list page — saves context switching.
5. **Quản lý Xóa guard is implicit:** Hiding (not disabling) the Xóa button for Manager rows is the right call — disabled buttons invite confusion about why they can't be clicked.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Zone B — role breakdown card | "Bếp:2 · Thu ngân:2 · NV:3 · QL:1" is compact text, hard to parse at a glance | Add a small color dot or mini bar per role for quicker visual parsing |
| Zone C — filter reset | No clear way to reset all filters at once in the excalidraw | Add a "Xoá bộ lọc" link/button that appears when any filter is active |
| Zone D — status toggle | Status badge looks static (no click affordance visible in excalidraw) | Add a subtle hover underline or cursor-pointer cue to signal it's clickable; or make toggle explicit via "Sửa" only |
| Zone D — actions overflow | 3 buttons (Chi tiết / Sửa / Xóa) at 44px each in a 216px column is tight | Consider a "..." dropdown action menu for the action column to save space and scale to future actions |
| M1 — shift chips minimum | No visual indicator of "min 1 shift required" rule | Add inline helper text: "Chọn ít nhất 1 ca làm việc" below the chip group |
| M2 — tab content placeholder | Hiệu suất, Lịch, Trách nhiệm tabs are faded in excalidraw suggesting they're incomplete | Decide before implementation: are these tabs v1 scope or post-MVP? If post-MVP, disable tabs with "Sắp có" label instead of fading |
| Xóa confirm | No confirm UI shown in excalidraw | Use an inline confirmation popover (not full modal): "Xóa [Tên]? [Huỷ] [Xác nhận]" |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Progress bar in table | Orange progress bar on white background is subtle at low values (45%) | Consider adding text label "45%" always visible, not just on hover |
| Zone A header card | Same `card` pattern as other admin pages — consistent ✅ | No change needed |
| Modal M1 — 9 fields | Form is dense — 2 columns for most rows creates a visually complex layout | Group fields into logical sections with subtle dividers: Identity / Role & Shifts / Contact |
| Modal M2 — avatar | 60×60 avatar shows initials, colored by role — works well ✅ | Keep; ensure fallback for null name (show "?" initial) |
| Badge colors for roles | Each role has a distinct color scheme — ✅ consistent with table avatars | Enforce the same palette in `Badge` variant props: no ad-hoc color classes |
| Pagination | Orange active page button matches brand ✅ | Keep |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says (`admin-main-staff.md`) | Excalidraw Shows | Action |
|------|-----------------------------------|------------------|--------|
| Zone A | Title "Nhân viên (8)" + orange CTA | ✅ Matches | None |
| Zone B | 4 stat cards | ✅ Matches — all 4 visible | None |
| Zone C | Search + Vai trò + Trạng thái | ✅ Matches — placeholder text visible | None |
| Zone D | 7-column table (columns listed in spec) | ✅ Matches — all columns present | None |
| Zone E | Pagination | ✅ Matches — ← 1 2 → shown | None |
| M1 — password | Spec says password field present | ✅ In excalidraw | Note: should be hidden in Edit mode — confirm in M1 implementation |
| M1 — job_title | Listed in spec as new field | ✅ "Vị trí công việc" visible in excalidraw | None |
| M2 — tab structure | Spec: Thông tin / Hiệu suất / Lịch / Trách nhiệm | ✅ All 4 tabs visible in excalidraw | Confirm which tabs are v1 scope vs. post-MVP |
| Zone D — checkbox column | Not in spec or excalidraw | ❌ Not shown | Skip — bulk actions not needed in v1 |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets ≥ 44px — all 3 action buttons in Zone D must meet this (currently drawn at 22px height — needs `min-h-[44px]` in impl)
- [ ] Screen reader labels on avatar initials: `aria-label="NV - Nhân viên"` or full name
- [ ] Keyboard: Tab through table rows → Enter to open detail; Esc to close modals
- [ ] Role badge must not rely on color alone — text label is already present ✅
- [ ] `prefers-reduced-motion` — skip progress bar fill animation
- [ ] Disabled state: if Xóa is hidden (not disabled), ensure keyboard focus doesn't land on a ghost element

---

## 🚀 Recommended Next Steps

1. **Resolve concern #1 (pagination strategy)** before writing any query code — this determines whether Stats Bar needs a separate summary endpoint
2. **Decide M2 tab scope** — mark Hiệu suất / Lịch / Trách nhiệm as v1 or post-MVP; if post-MVP, stub with "Sắp có" and disable tab click
3. **Confirm Xóa = soft delete** (status → inactive) or hard delete — impacts DB schema and the Vô hiệu count logic
4. **Build `Pagination` shared component first** before implementing Zone E — register in `_INDEX_SHARING_COMPONENT.md` immediately after
5. **Test `useMemo` filter performance** with 50+ staff records on staging before ship

---
*Review date: 2026-05-26*
*Reviewed by: —*
