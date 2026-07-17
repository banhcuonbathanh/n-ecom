> UX/UI review for Admin — Tổng quan. Based on excalidraw `admin-overview.excalidraw`.

---

## ✅ UX Strengths

1. **Color-coded status system** — The 5-state border system (grey/blue/green/red/purple) is immediately scannable across a busy screen. No need to read text to understand urgency.
2. **Aggregate summary at Zone C top** — The "Tổng cần làm" bar gives kitchen staff a single number to monitor without scanning individual table cards.
3. **Inline status change** — The ▼ dropdown on PrepListCard avoids modal overhead for the most frequent action (changing order status). Zero navigation cost.
4. **Zone D empty table map** — Keeping empty tables visible on the same screen as active orders lets front-of-house manage seating without switching views.
5. **Live indicator** — The green "● Live" pill in the nav tab bar signals connection status passively, reducing staff anxiety about data freshness.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Zone A — Urgency card | Red card only shows count (1 / 0) — no direct link to the urgent order | Add a subtle "Xem →" link inside the card that scrolls to the first urgent card in Zone B |
| Zone B — Sort order | Excalidraw shows orders in insertion order — urgent ones could be buried | Sort: urgent (>20min, red) first → VIP second → by elapsed time descending |
| Zone B — Card height | VIP cards (Bàn 05) with 4+ dishes are very tall — could push other cards off screen | Add expand/collapse on cards with >3 dishes; show collapsed by default |
| Zone C — Per-table "còn=0" | When a table has served all items, it still shows in Zone C | Add "Hoàn thành" state card or auto-remove from Zone C when còn=0 |
| Zone C — Column widths | "tổng / ra / còn" columns in table cards have no header labels visible | Add micro-labels (T · R · C) inside each card header |
| Zone D — Empty state | When all tables are occupied, Zone D disappears entirely | Show a placeholder "Tất cả bàn đang có khách" message so the zone is always visible |
| Nav — Tab overflow | 9 tabs on a 1180px wide nav could wrap or truncate on 1024px screens | Test at 1024px; consider condensing "Kho nguyên liệu" → "Kho" |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Zone A — Urgency card value "1 / 0" | Two numbers without clear labels confuse first-time readers | Render as two stacked lines: `1 khẩn cấp` (red) and `0 cảnh báo` (yellow) |
| Zone B — Timer display "⏱ 12 phút" | Elapsed time is static text — it will fall out of sync unless re-rendered | Drive from `UrgencyBorderTimer` with 30s interval tick |
| Zone C — VIP table card | Shows `535.000 đ` — total amount without label | Add label "Tổng tạm tính:" for clarity |
| Zone B/C — Button sizes | Action buttons (Bắt đầu làm, Sẵn sàng, etc.) should be min 44px height | Enforce `min-h-[44px]` on all action buttons per WCAG touch target |
| "● Live" pill | Green dot is a Unicode character — may render differently across OS | Replace with a CSS-animated green circle (`animate-pulse`) for reliability |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|-----------------|--------|
| Zone A — Card 1 | "5 / 6 bàn" | Shows "5" large + "/ 6 bàn" small below | ✅ Aligned |
| Zone A — Card 4 | Red background for urgency | Red stroke + light red fill | ✅ Aligned |
| Zone B — Color coding | 5 states: grey/blue/green/red/purple | Cards exist but color labels are text annotations, not visual fills in excalidraw | Implement as border color classes, not background |
| Zone B — Workflow legend | Status lifecycle at bottom of page | Shown in original description but not explicitly in excalidraw elements | Add as a collapsible "?" tooltip or footer section |
| Zone C — Section header | "Tổng quan sàn" with live badge | Present in excalidraw as `sec-bg` + `sec-live` elements | ✅ Aligned |
| Zone D — Empty tables | Shows 1 table (Bàn VIP) | Slots 2-6 show "—" (placeholder for occupied tables — not rendered) | Only render tables with `status === 'empty'` |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets: all action buttons must be `min-h-[44px] min-w-[44px]`
- [ ] Urgency must not rely on color alone: add `aria-label="Khẩn cấp: đơn hàng bàn 04 đã quá 20 phút"` on red cards
- [ ] `StatusChangeDropdown` must be keyboard accessible: Tab to open, arrow keys to select, Enter to confirm, Esc to close
- [ ] `ConnectionErrorBanner` must be announced to screen readers via `role="alert"`
- [ ] Elapsed time counter must update via `aria-live="polite"` or `aria-label` update so screen readers catch changes
- [ ] `prefers-reduced-motion` — suppress the "● Live" pulse animation

---

## 🚀 Recommended Next Steps

1. Confirm WS endpoint schema with BE team before starting `useOverviewWebSocket.ts`
2. Clarify RBAC — decide if `staff` role can access this page (see conccern.md)
3. Design `OverviewSkeleton.tsx` alongside the main layout — don't defer it
4. Implement `UrgencyBorderTimer` as a shared component first (OV-7) — it unblocks both Zone B and C cards
5. Run usability test with kitchen staff: verify Zone B color system is readable in kitchen lighting conditions

---
*Review date: 2026-05-27*
*Reviewed by: —*
