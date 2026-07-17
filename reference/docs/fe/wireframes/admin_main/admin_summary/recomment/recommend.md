> UX/UI review for Admin — Tổng Kết Ngày. Filled from excalidraw review + spec analysis.

---

## ✅ UX Strengths

1. **Top-down information hierarchy** — Most critical data (revenue KPIs) is at the top; operational detail (shift log) is at the bottom. Matches how a manager naturally scans a report.
2. **Date picker positioned correctly** — Top-right corner, visually paired with the page title. Orange accent makes it discoverable without dominating the layout.
3. **Peak hour annotation (★)** — Marking the top-2 revenue hours in the bar chart eliminates the need to manually compare bar heights. Actionable insight at a glance.
4. **Dual-panel Zone 4** — Top-5 sellers and low-performers side by side lets a manager instantly compare what's working vs. what needs attention in the same visual group.
5. **Badge-first inventory alerts** — "Hết Hàng" / "Sắp Hết" badges before the ingredient name let the manager scan severity without reading full text.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Zone 1 — Delta context | Delta shows "↑ +12% so với hôm qua" but gives no reference value (e.g., yesterday was 3,795,000₫) | Add a small secondary line showing yesterday's absolute value on hover or always-visible below the delta |
| Zone 2 — Chart interaction | The bar chart in the excalidraw is static. No tooltip is drawn for individual bars | Add a hover tooltip showing exact revenue amount and order count for each hour |
| Zone 3 — Channel cards | Cards are visually colour-coded (indigo for QR, orange for POS, grey for delivery) but the grey "Giao Hàng" card lacks visual weight — could be mistaken for disabled | Use a blue or teal accent for Giao Hàng instead of grey |
| Zone 5 — Cancelled orders | "Hết món (2), Khách đổi ý (1)" is very compact in a small KPI card — may be truncated at smaller viewport widths | Move cancel reasons to a tooltip or a small expandable row below the KPI card |
| Zone 6 — No total row | The staff table shows 3 rows but no summary total row (total orders, total revenue) | Add a "Tổng" footer row to the staff table for quick validation against Zone 1 figures |
| Zone 8 — Shift log density | Log entries have no visual separator between author and timestamp | Prefix each entry with a styled "HH:MM" chip and author initials avatar for better scanability |
| Empty state — Zone 4 | When no orders exist, "Không có dữ liệu" is shown but the two-panel layout collapses awkwardly | Use a single centered EmptyState spanning both panels when `topSelling.length === 0` |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| KPI card delta colour | Green/red delta colour relies on the `valueColor` prop of `KPICard`. "Giờ Hoạt Động" has no delta — its sub-text uses `#64748b` (slate). Ensure `KPICard` does not render a delta row when `badge` is absent | Confirm `KPICard` renders correctly with no `badge` prop — test with the Giờ Hoạt Động card |
| Bar chart peak bar colour | Excalidraw shows peak bars in a darker orange (`#f97316` solid vs `#fed7aa` light). Ensure this is implemented in `HourlyRevenueChart` and not just a visual note in the drawing | Use `fill={item.isPeak ? '#f97316' : '#fed7aa'}` per bar |
| Pie chart placeholder | Excalidraw shows `[ PIE ]` as a greyed rectangle — the actual chart needs an accessible legend. Ensure legend text contrast meets WCAG AA | Use `stroke="#ffffff"` between pie slices; legend font `text-sm text-slate-700` |
| Zone 6 header row | Orange header (`#fed7aa` background, `#c2410c` text) matches marketing page's header pattern. Ensure consistent header styling across admin table pages | Reuse the same `thead` class pattern from `admin_main_staff_task_boad` |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|-----------------|--------|
| Zone 1 | 4 KPI cards with delta vs. yesterday | ✅ Drawn correctly — 4 cards with delta text | None |
| Zone 2 | Bar chart + pie chart side by side | ✅ Drawn correctly — ~2/3 bar + 1/3 pie split | None |
| Zone 3 | 3 channel cards | ✅ Drawn correctly — indigo · orange · grey | Consider replacing grey with a non-neutral colour |
| Zone 4 | Top-5 list + slow items + most cancelled | ✅ Drawn correctly — two panels | Add a total row or visual separator between slow items and cancelled section |
| Zone 5 | 4 KPI cards — kitchen ops | ✅ Drawn correctly — cancel reasons inline in card sub-text | Move reasons to tooltip at small widths |
| Zone 6 | Staff table | ✅ Drawn correctly — 3 sample rows, orange header | Missing: total footer row |
| Zone 7 | Inventory alert list | ✅ Drawn correctly — badge + description | None |
| Zone 8 | Shift log + add button | ✅ Drawn correctly — 2 log rows + orange button | Spec says button is hidden for past dates — not shown in excalidraw (only shows today's view) |
| M1 | AddShiftNoteModal | ❌ Not drawn in excalidraw | Design needed before SUM-9 implementation |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets ≥ 44px for date picker trigger and "+ Thêm Ghi Chú" button
- [ ] Screen reader labels on chart elements (`aria-label="Doanh thu 09h: 320,000₫"`)
- [ ] Keyboard: Tab → date picker opens → arrow keys → Enter to select
- [ ] Modal: focus trapped on open; Esc closes; focus returns to trigger button
- [ ] `prefers-reduced-motion`: chart animations (bar grow, pie draw) must respect this
- [ ] Colour-only information: delta ↑↓ direction must not rely solely on colour — the arrow symbol (↑ ↓) carries the meaning, which is correct

---

## 🚀 Recommended Next Steps

1. **Design M1 (AddShiftNoteModal)** — not drawn in excalidraw. Needs a quick sketch before SUM-9 can start.
2. **Confirm aggregate endpoint contract** — resolve whether `/summary` is pre-computed or live-join before any BE work starts (see conccern.md).
3. **Confirm chart library** — decide on Recharts vs. Tremor before SUM-4 starts; install it and add to `package.json`.
4. **Add total row to Zone 6** — small design decision that prevents manager confusion when staff revenue doesn't obviously sum to Zone 1 total.
5. **Design tablet breakpoint** — 768px single-column layout not yet defined; needed before any responsive implementation.

---
*Review date: 2026-05-27*
*Reviewed by: Claude*
