> UX/UI review for Admin — Staff Task Board. Filled from excalidraw review (Flow A).

---

## ✅ UX Strengths

1. **Orange overdue highlight is instant.** The orange row background on `hasOverdue: true` rows eliminates the need to expand every row to find problems. A manager scanning the table in 2 seconds knows exactly who needs attention.

2. **Expandable rows keep the table clean.** Showing task details only on demand (expand ▼) keeps Zone E compact at a glance — all staff visible without scrolling — while still providing full task detail when needed.

3. **Contextual Assign button reduces friction.** Each row has its own "Assign" button which pre-fills the Staff Member field in CreateTaskModal. This is significantly better than a global "+ Add Task" that requires re-selecting the staff from a full list.

4. **KPI row gives zero-click daily overview.** Total · Completed · In Progress · Overdue counts are visible on page load without any interaction. The colour coding (green/indigo/red) makes the numbers scannable rather than readable.

5. **Quality score ★/5.0 as a visible performance signal.** Including quality score in the staff table (alongside completion rate %) gives a two-dimensional performance view without requiring a separate report page.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Zone E — overdue detail | Overdue row is highlighted but no count of overdue tasks is shown on the row itself — user must expand to count | Add a small `! N overdue` badge next to staff name or in the Rate % column. Reduces expand overhead for triage |
| Zone F — no edit action | Tasks are shown in Zone F but there is no "Edit" or "Mark Complete" button per task row — Zone F is read-only per current excalidraw | Add at minimum a "Mark as done" button per task row. Edit action can be a secondary icon. See conccern.md for open question |
| Zone C — single date only | FilterBar has a single date input, not a date range | Confirm this is intentional (task board is a daily view). If multi-day summaries are needed, add a date range toggle. Do not add complexity speculatively |
| Zone D — no loading state | 4 KPI cards have no skeleton/placeholder defined | Define `KPICardSkeleton` (grey pulse box, same dimensions). Show on initial load before query resolves |
| Zone E — completion rate colour | Rate % is shown as raw number (75%, 100%, 22%) with no colour coding in Zone E — only the overdue row gets colour | Consider colouring Rate % text: green ≥ 80%, yellow 50–79%, red < 50%. Small signal, high readability gain |
| Modal M1 — no date field pre-fill | CreateTaskModal "Due Date & Time" defaults to `2026-05-24 14:00` (hardcoded in excalidraw) | Default to the currently selected filter date + a sensible time (e.g. end of shift at 17:00). Avoids manual date entry in most cases |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Zone E — role badge colours | Kitchen = orange, Cashier = indigo, Server = green — consistent with badge variant choices, but not documented | Document the `Badge` variant mapping in tech_description.md so other pages reuse the same colours |
| Zone F — task sub-table header | Header row uses orange (`#c2410c` text on `#fff7ed`) — readable but low contrast for small text | Test at WCAG AA: `#c2410c` on `#fff7ed` is ~4.1:1 — marginal for 11px font. Consider bold or slightly larger font on the sub-table header |
| Zone D — KPI card value size | Font 28px for numbers (32, 18, 10, 4) — prominent, good | Keep consistent; do not reduce for responsiveness on tablet |
| General — orange CTA button | "+ Add Task" is solid orange (#f97316) — matches brand accent, appropriate for primary CTA | Ensure `Button` component `variant="warning"` or a dedicated `variant="brand"` maps to this exact token rather than hardcoding hex |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|-----------------|--------|
| F | Tasks can be edited (confirmed by owner) | No edit button on task rows in Zone F | Add edit action to Zone F spec before STB-3 starts |
| E | Completion rate colour-coded | Rate % shown as plain text (75%, 100%, 22%) with no colour in excalidraw | Decide and document colour rule in spec; low-effort UX win |
| M1 | Staff Member dropdown required | Excalidraw shows "Select staff member ▾" placeholder | Confirm dropdown data source is `['admin', 'staff']` cache — yes, confirmed in spec |
| C | Search field label-less in excalidraw | Placeholder "Search staff name..." is used as the label | Add a visible `Label` above the search field for accessibility (screen readers need explicit labels) |
| B | "+ Add Task" button | Orange button at far right of breadcrumb bar | Correct — but Zone B is sticky; ensure the button doesn't overlap with sticky Zone A on smaller desktops (< 1100px) |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets ≥ 44px for "View Tasks", "Assign", "Hide Tasks" buttons (Zone E)
- [ ] `aria-expanded="true/false"` on the expand toggle button per staff row (Zone E)
- [ ] `aria-label` on role badge chips (e.g. `aria-label="Role: Kitchen"`)
- [ ] `aria-label` on TaskStatusBadge and TaskPriorityBadge (e.g. `aria-label="Priority: High"`)
- [ ] Keyboard: `Tab` → navigate rows, `Enter` → expand row, `Esc` → close Modal M1
- [ ] `prefers-reduced-motion`: no animations currently in spec — no issue. If skeleton shimmer is added later, gate it behind this media query
- [ ] Screen reader: Zone D KPI cards need `role="status"` or `aria-live="polite"` since they update via `refetchInterval`
- [ ] Modal M1: focus trap inside modal while open; focus returns to "Assign" button on close

---

## 🚀 Recommended Next Steps

1. Resolve the "Edit task" open question (conccern.md) before starting STB-3 — it changes the Zone F component interface
2. Build `TaskStatusBadge` and `TaskPriorityBadge` first (shared components) — they're consumed by both Zone E and Zone F
3. Define `StaffTaskBoardSkeleton` before implementing the page — Pattern B requires it
4. Add completion rate colour rule to the spec (green/yellow/red thresholds) — 30-minute design decision with high daily visibility payoff
5. Add `aria-expanded` to the expandable row toggle — accessibility requirement, not optional

---

*Review date: 2026-05-26*
*Reviewed by: —*
