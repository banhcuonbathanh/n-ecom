> UX/UI review for Admin — Marketing. Filled from excalidraw review.

---

## ✅ UX Strengths

1. **Single-page overview** — All marketing data (budget, breakdown, effectiveness, timeline) is on one page. No need to navigate between views for a complete picture.
2. **Color-coded KPI cards** — Green for positive (Còn lại), orange for consumed (Đã chi), indigo for projection (ROI). Color meaning is consistent and learnable quickly.
3. **Inline progress bars in the table** — Each spend category has a visual progress bar alongside numeric values, reducing cognitive load when scanning multiple rows.
4. **Campaign timeline anchors context** — Zone F gives time-based context to the budget numbers. Users can see where in the campaign they are and what's coming next.
5. **Donut chart + legend side-by-side with table** — The chart reinforces the table data visually without requiring a separate view or scroll.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Zone B — "+ Nhập chi tiêu" | Button is present in excalidraw but the target form/modal is not designed | Design the add-spend modal before implementing this button; stub it with a toast in the meantime |
| Zone C — ROI card | "Dựa trên 2.000 khách/tháng" badge text is 30+ characters — may truncate on smaller desktop screens | Shorten to "~2.000 khách/tháng" or use tooltip for full text |
| Zone D — Table columns on tablet | Side-by-side table + chart will break at 768px — chart gets pushed below table or squeezed | Add `overflow-x: auto` on the table container and stack chart below table on < 1024px |
| Zone D — No edit/delete on rows | Spend rows are read-only in the current design; there's no way to correct a wrong entry | Confirm with owner: add edit/delete icons per row or keep read-only (noting this is a concern in conccern.md) |
| Zone E — "Điểm hài lòng dự kiến" | The metric is labeled "dự kiến" (projected) but there is no indication of how it's calculated | Add a tooltip or info icon explaining the calculation: "Dựa trên chất lượng sản phẩm + trải nghiệm + KM" |
| Zone E — Followers progress | Progress bar at 30% is quite low visually — could be discouraging | Consider adding a milestone marker at 50% on the bar as a psychological mid-point |
| Zone F — Timeline is static | Campaign timeline shows hardcoded 5 weeks — no way to see "where are we now" relative to today | Add a "today" indicator on the timeline if the campaign is live |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Zone C cards — spacing | 4 cards span full 1085px with equal width; on smaller desktops (1024px) they may feel cramped | Use `grid-cols-4` with `gap-4`; allow cards to shrink to min-width 200px |
| Zone D — Progress bar colors | Each spend category uses a different progress bar color (orange, blue, purple, green, cyan) — 5 different colors may be hard to recall | Consider using a single consistent color (e.g., brand orange) for all progress bars; save distinct colors for the chart legend only |
| Zone E — LoveScore card heights | 3 cards in Zone E have inconsistent content height (card 2 has a progress bar, cards 1 and 3 don't) | Fix card height with `min-h` so all three align at the same height |
| Zone A — Nav item density | 9 nav items in the top bar; at 1024px width some labels may be cut off | Consider abbreviating "Kho nguyên liệu" → "Kho NL" or using a collapsible nav at < 1280px |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|------------------|--------|
| Zone B | Date picker + Export + Add Spend buttons | All three present | ✅ Aligned |
| Zone B | Add Spend opens a form | Button only; no modal drawn | ⚠️ Modal spec missing — write before implementing |
| Zone C | 4 KPI cards | 4 cards with correct labels and values | ✅ Aligned |
| Zone D | Table + chart side by side | Table ~62% width, chart ~38% width | ✅ Aligned |
| Zone D | API: GET /api/v1/admin/marketing/spend | Endpoint annotated in zone label | ✅ Referenced — needs BE contract |
| Zone E | 3 effectiveness metrics | 3 cards (cost, followers, satisfaction) | ✅ Aligned |
| Zone F | 5-week timeline | 5 milestones drawn | ✅ Aligned — but static, no "today" marker |
| — | No modals | No modal frames in excalidraw | ✅ Confirmed — Add Spend modal is out of scope |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets ≥ 44px for all buttons (Xuất BC, Nhập chi tiêu, date picker trigger)
- [ ] Donut chart: add `aria-label` describing the data (e.g., "Biểu đồ phân bổ ngân sách: 37% đã chi")
- [ ] Progress bars: add `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] Screen reader labels on icon-only elements (if any icons without visible text are added)
- [ ] Keyboard: Tab → Enter → Esc work on date picker
- [ ] `prefers-reduced-motion` respected — no auto-animating chart segments
- [ ] Color is not the only indicator — progress bars also show the percentage number in text

---

## 🚀 Recommended Next Steps

1. Design and spec the "+ Nhập chi tiêu" modal — it's the primary data-entry action on this page and is currently undefined
2. Define `GET /api/v1/admin/marketing/spend` response contract in `docs/contract/API_CONTRACT_v1.2.md`
3. Register `DateRangePicker`, `KPICard`, and `ProgressBar` in `shared/_INDEX_SHARING_COMPONENT.md` before building (already done in this scaffold)
4. Confirm Recharts is available in `package.json` before building `BudgetDonutChart`
5. Design mobile/tablet breakpoint layout for Zone D (table + chart stacked)

---
*Review date: 2026-05-26*
*Reviewed by: —*
