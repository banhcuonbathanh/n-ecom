> UX/UI review for Client — Theo Dõi Đơn Hàng. Filled from excalidraw review.

---

## ✅ UX Strengths

1. **Information hierarchy is correct** — Queue position (the most anxious question) is in Zone B at the top, immediately visible. Customer doesn't have to scroll to find out "when do I eat?"
2. **Contextual queue list** — Showing all 5 orders (not just your own) gives the customer empathy for the wait instead of frustration. Seeing two orders ahead turn "Đã phục vụ" feels like progress.
3. **Table map as ambient awareness** — Zone E transforms a passive wait into an interesting real-time view of the restaurant. Reduces the feeling of being ignored.
4. **Minimal navigation surface** — Bottom nav has exactly 3 actions (Menu / Yêu Thích / Làm Mới), no overwhelming options. Correct for a monitoring context.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Zone B — delivered state | Excalidraw only shows "Đang chuẩn bị" state. No final "Đã phục vụ" state is drawn. | Design and implement a green Zone B variant: "✅ Đơn của bạn đã được phục vụ — Thưởng thức bữa ăn!" with a subtle confetti/checkmark animation |
| Zone B — urgency signal | When queue position = 1, nothing distinguishes it from position = 3. | Add a pulse animation to the ETA badge when `queuePosition === 1`: amber → brighter amber, 1s cycle. Also change copy to "Đơn tiếp theo được phục vụ!" |
| Zone D — scroll behavior | 5 rows may exceed viewport height on small phones (375px). Rows below the fold are invisible. | Consider capping Zone D height at ~200px with `overflow-y-auto` and a subtle scroll shadow at the bottom |
| Zone D — time format | "~10 phút" and "~15 phút" are in Zone D but Zone B shows a different format: "Chờ khoảng ~5 phút". | Standardize copy: use "~5 phút" everywhere without "Chờ khoảng" prefix — shorter is better in a list context |
| Zone E — color-blind accessibility | Table status uses red/orange/green colors only. No shape or label differentiation. | Add short text labels inside each cell ("Phục vụ", "Chờ", "Trống") alongside color. Or use border-width (thick = active, thin = empty) as a secondary indicator |
| Zone E — current table highlight | T.04 uses a red border + "[BÀN BẠN]" label. Red = "waiting" (negative connotation). | Consider using a blue/indigo border for [BÀN BẠN] to distinguish "this is your table" from "this table is in bad status" |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Zone A background | Very dark (#1e293b) makes the LIVE badge harder to read on some screens | Ensure badge has `min-w-[72px]` and font-weight 600 for legibility |
| Zone D queue rows | Current order row has amber border (strokeWidth: 2) — may look too subtle on actual screen pixels | Use `ring-2 ring-amber-400` in Tailwind instead of border — ring renders outside the box and is more visible |
| Zone E cell size | 119px wide × 48px tall in excalidraw. On 375px mobile this leaves only ~8px padding between cells. | Use a 3-column grid with `gap-2` and `min-h-[56px]` per cell for better touch targets and readability |
| Zone F button widths | Three equal-width buttons (~122px each) in a 420px container. On 375px they'll be slightly cramped. | Use `flex-1` layout so buttons fill available width naturally at any viewport |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|------------------|--------|
| B | `ConnectionErrorBanner` should appear on SSE disconnect | Not drawn | Implement `ConnectionErrorBanner` above Zone A on disconnect (z-30) |
| B | Delivered state needs a design | Only "preparing" state shown | Design green delivered variant before MON-2 starts |
| D | Scroll behavior for > 5 orders is undefined | Exactly 5 rows drawn | Define: max 5 visible, scrollable, or paginated — decide before MON-4 |
| E | Table data should come from DB (not hardcoded) | 12 static table cells (T.01–T.12) | `TableLayoutMap` must accept dynamic `tables: TableStatus[]` prop |
| — | Route is undefined | No route label in excalidraw | Confirm route with owner before wiring navigation |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets ≥ 44px — all cells in Zone E and all nav buttons in Zone F
- [ ] Screen reader: `aria-live="polite"` on Zone B status text so status changes are announced
- [ ] Screen reader: Zone E cells must have `aria-label="Bàn T.04, trạng thái: Chờ món"` (not just color)
- [ ] Keyboard: Tab → reaches Zone F nav buttons; Enter activates them
- [ ] `prefers-reduced-motion`: skip pulse animation on Zone B ETA badge
- [ ] iOS Safari: `visibilitychange` handler must re-open EventSource when page becomes visible (iOS kills SSE in background)

---

## 🚀 Recommended Next Steps

1. Confirm the FE route with the owner — unblock all navigation wiring (see conccern.md)
2. Design the Zone B "delivered" state before development starts
3. Decide Zone D scroll behavior (max 5 or scrollable list)
4. Confirm BE SSE endpoint exists for customer monitoring — check `docs/spec/Spec_4_Orders_API.md`
5. Audit Zone E for color-blind accessibility — add text labels inside cells

---
*Review date: 2026-05-27*
*Reviewed by: —*
