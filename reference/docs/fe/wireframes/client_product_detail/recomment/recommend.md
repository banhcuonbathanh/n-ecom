> UX/UI review for Client — Chi tiết sản phẩm. Filled from excalidraw review.

---

## ✅ UX Strengths

1. **Single-scroll layout** — All information (image → info → toppings → quantity → CTA) flows top-to-bottom without tabs or accordions; cognitive load is minimal.
2. **Persistent CTA** — Zone E sticky bottom ensures "Thêm vào giỏ hàng" is always reachable regardless of scroll position — reduces missed add-to-cart actions.
3. **Real-time total** — Price in Zone C and Zone E updates synchronously on every topping/quantity change; no confirmation step needed.
4. **2-column topping grid** — Efficient use of mobile width; 4 toppings fit without scrolling (for typical product with ≤6 toppings).
5. **Inline topping selection** — Unlike the menu's ToppingModal bottom-sheet, the inline approach removes a modal dismiss step and keeps context visible (hero image + price remain in view while selecting).

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Zone C — topping total | Total line shows raw maths ("45,000 + 10,000 = 55,000 ₫") which is slightly verbose | Simplify to "Tổng cộng: 55,000 ₫" — remove the addend breakdown, it's redundant with individual prices shown on each card |
| Zone E — CTA label | "Thêm vào giỏ hàng · 55,000 ₫" uses a middle dot separator; may be unclear to first-time users | Consider "Thêm vào giỏ — 55,000 ₫" with em-dash, or display total below the main text as a secondary line |
| Zone D — Stepper placement | Quantity stepper is left-aligned for the label but the controls (−/1/+) are right-aligned — creates a wide gap | Keep the current layout (matches standard mobile UX); no change needed |
| Out-of-stock state | Excalidraw does not show the unavailable state | Design and test the disabled CTA + "Hết hàng" badge state explicitly; ensure contrast ratio ≥ 4.5:1 on greyed CTA |
| No topping state | When `toppings.length === 0`, Zone C disappears — page is shorter | Consider adding a light placeholder line "Không có topping" or just let the layout collapse naturally (current approach is fine) |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Topping card selected state | Selected card uses orange border + filled checkbox (from excalidraw) | Ensure the orange outline is 2px to meet contrast requirements; test against the `#fff7ed` background |
| Zone B price color | Price uses `#f97316` (orange-500) | Consistent with menu page pricing — no change needed |
| Skeleton zones | Excalidraw shows plain grey rectangles | Implement `animate-pulse` with rounded corners matching each zone's actual shape for a polished loading experience |
| Hero image ratio | Fixed 390×220px in excalidraw | Use `aspect-[16/9]` with `w-full` instead of fixed px — adapts better to different screen widths |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec_3 §4 Says | Excalidraw Shows | Action |
|------|---------------|-----------------|--------|
| C — topping price | "price_delta" field name mentioned in some places | Excalidraw explicitly notes "price field, not price_delta" | Use `price` field — excalidraw is authoritative; update Spec_3 if needed |
| E — post-add navigation | Not specified in excalidraw | — | Confirm with owner: `router.back()` vs. stay on page with confirmation toast |
| C — max topping count | Not documented | Not shown | Add to conccern.md; ask owner before implementing |
| NAV — cart badge | Excalidraw shows "🛒 3" (emoji + count) | — | Replace emoji with an SVG cart icon for crisp rendering at all DPIs |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets ≥ 44px — Stepper buttons are 40×40px in excalidraw (just below target); implement as `min-h-[44px] min-w-[44px]`
- [ ] Topping checkboxes: wrap in `<label>` so the full card (not just the checkbox) is the tap target
- [ ] Screen reader labels: `aria-label` on cart button, stepper buttons, CTA button
- [ ] Keyboard: Tab through toppings → Tab to stepper → Tab to CTA → Enter to add
- [ ] `prefers-reduced-motion`: disable `animate-pulse` skeleton when reduced-motion preferred

---

## 🚀 Recommended Next Steps

1. Confirm the post-add navigation: `router.back()` vs. stay on page (conccern.md question)
2. Confirm max quantity / max toppings constraints with restaurant owner
3. Design the out-of-stock state explicitly (not in excalidraw) before CPD-3
4. Replace cart emoji 🛒 with SVG icon in `CustomerTopNav`
5. Use `aspect-[16/9]` instead of fixed `h-[220px]` in Zone A for responsive sizing

---
*Review date: 2026-05-27*
*Reviewed by: —*
