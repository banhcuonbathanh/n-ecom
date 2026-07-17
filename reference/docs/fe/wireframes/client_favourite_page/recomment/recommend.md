> UX/UI review for Client — Favourites. Filled from excalidraw review.

---

## ✅ UX Strengths

1. **Inline quantity adjustment** — The −/qty/+ stepper on each card avoids the need to open a separate edit modal. Fast, direct, and expected on mobile.
2. **Topping breakdown visible** — Showing topping names and per-topping prices in the item card gives customers full price transparency before adding to cart. Reduces checkout surprises.
3. **"Set" pattern is distinctive** — Allowing customers to save named sets is a strong differentiator. The flow (favourites → save set → sets list → apply) is clear and logical.
4. **Empty state on Screen 3** — The "Chưa có set nào" state includes a helpful hint and a CTA back to the favourites page, so users know exactly what to do.
5. **Footer CTA hierarchy** — Zone D correctly uses outlined orange for secondary (save set) and filled orange for primary (add all to cart), following standard button hierarchy.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Screen 1 ZC — empty state | No empty state defined for when `items.length === 0` | Add an empty state (icon ♡ + "Chưa có món yêu thích" + CTA "Về thực đơn") so users aren't confused by a blank scroll zone |
| Screen 1 ZD — "Lưu thành set mới" | Button is visible even when favourites list is empty | Disable or hide this button when `items.length === 0` — can't save an empty set |
| Screen 3 ZB — rename flow | ✏ button has no defined interaction | Clarify in `conccern.md`: inline edit (simpler) or modal (safer for long names) |
| Screen 2 ZC — total calculation | The excalidraw shows 265,000₫ total but the older `favourites.md` showed 360,000₫ | Reconcile: excalidraw is source of truth (265k). Update old notes. |
| Screen 1 ZB — tab hiding | If favourites list is empty, showing the tabs (Tất cả/Món lẻ/Combo) is misleading | Hide ZB when `items.length === 0` |
| Screen 3 ZB — delete confirmation | 🗑 taps directly delete with no confirm | Add a brief confirm step (snackbar with Undo, or confirm dialog) — set deletion is irreversible |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| `FavouriteItemCard` image area | Dashed placeholder in excalidraw — no image fallback defined | Implement `next/image` with a food-icon fallback for missing images |
| COMBO badge | Orange (#f97316) same color as primary CTAs — may feel "clickable" | Use a distinct tint (e.g. `#ea580c` bg with white text) or add a pill shape to distinguish it from buttons |
| ZD footer on Screen 1 | Footer has 3 elements (link + 2 buttons) in a tight 138px height | Verify on 375px that all 3 touch targets meet 44px minimum height — the link row may be too small |
| Screen 3 SetCard — items preview | Shows full item breakdown inside the card — may be too verbose for a "list" screen | Consider a collapsed preview (first 2 items + "và X món khác" if > 2) with an expand toggle |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|------------------|--------|
| S1 ZC | Item cards show toppings per item | ✅ Shown — green topping lines visible | No change |
| S1 ZD | Footer has link + 2 buttons | ✅ Matches | No change |
| S2 ZC | Total: 265,000₫ | ✅ Excalidraw shows 265,000₫ | Old `favourites.md` had wrong total (360k) — use excalidraw value |
| S3 ZB | Set cards have Áp dụng + ✏ + 🗑 | ✅ Matches | No change |
| S3 ZC | Empty state with CTA "← Về Yêu thích" | ✅ Shown | No change |
| S1 ZC | Empty state (no favourites) | ❌ Not defined in excalidraw | **Action:** Add empty state component for this case |
| S2 ZB | Rename UI | ❌ ✏ button shown but no rename UI drawn | **Action:** Define rename interaction before implementing |

---

## ♿ Accessibility & Edge Cases

- [ ] ♥ button: `aria-label="Xoá khỏi yêu thích"` — icon-only, must have label
- [ ] Qty stepper: `aria-label="Giảm số lượng"` / `"Tăng số lượng"` — icon buttons
- [ ] Qty value: `role="spinbutton"` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax`
- [ ] "−" button disabled state: `disabled` + visually greyed at `qty === 1`
- [ ] Tab navigation: ZB filter tabs must be keyboard-accessible (`role="tablist"`, `role="tab"`)
- [ ] Touch targets: verify ♥ button (36×36 in excalidraw) — pad to 44×44 minimum
- [ ] `prefers-reduced-motion`: stepper +/− tap should not animate if motion is disabled

---

## 🚀 Recommended Next Steps

1. **Resolve `conccern.md` items** before implementation: store migration strategy, rename UI, applySet navigation
2. **Implement `QuantityStepper`** as the first shared component — it unblocks both `FavouriteItemCard` and future cart/checkout usage
3. **Extend `useFavouritesStore`** with the new shape and write a migration guard before touching any UI
4. **Add Screen 1 ZC empty state** — missing from excalidraw but essential for new users
5. **Add delete confirmation** on 🗑 in Screen 3 before shipping

---
*Review date: 2026-05-27*
*Reviewed by: —*
