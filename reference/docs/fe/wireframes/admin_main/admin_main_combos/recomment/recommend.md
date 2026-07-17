> UX/UI review for Admin — Combo. Filled from excalidraw review (Flow A).

---

## ✅ UX Strengths

1. **Inline savings transparency** — showing both combo price and retail sum with a red savings badge makes the value proposition immediately visible to admins and end customers.
2. **Product chip display** — orange badge chips per product in the table row are compact and scannable; the admin can verify combo contents at a glance without opening a detail view.
3. **Auto savings calculation in modal** — the green savings note updates live as the admin types the price, removing mental arithmetic and reducing pricing errors.
4. **Shared add/edit modal** — reusing one `ComboFormModal` for both flows keeps the UX consistent; admins learn one interaction pattern, not two.
5. **Role-scoped delete** — hiding the "Xóa" button for non-Admin roles prevents accidental deletion without a separate permission screen.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Delete flow | No confirmation dialog visible in excalidraw | Add a simple "Xác nhận xóa combo?" dialog before executing delete — combo deletion is irreversible |
| Random combo button | Button drawn but no behavior defined | Either hide it (not yet built) or disable it with a tooltip "Tính năng đang phát triển" to avoid confusion |
| Edit modal title | Excalidraw only shows "Thêm combo mới" title | Change title to "Sửa combo" when `mode === "edit"` so the admin knows which mode they're in |
| Empty search state | No empty search state shown in modal | Add inline "Không tìm thấy sản phẩm phù hợp" text when product search returns 0 results |
| Product qty lower bound | No disabled state shown for − button at qty=1 | Disable − button when qty = 1 to prevent 0-quantity items in the combo |
| Savings note when 0 | Not shown when combo price ≥ retail sum | This is handled correctly — just document that no savings note = no error, simply no discount applied |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Strikethrough price | Depends on API returning price history; unclear if this field exists | Confirm API contract before building; use `—` as fallback if no history |
| Savings badge color | Red (`#fee2e2` / `#dc2626`) used for savings — red typically signals an error | Consider green (`#dcfce7` / `#16a34a`) for savings to read as a positive benefit; red is kept for errors |
| "Sửa" button style | White bg, gray border — low contrast against the white table row | Add a subtle blue tint (`variant="outline"` with `text-blue-600`) to differentiate from "Xóa" visually |
| Combo count in title | "Combo (2)" — the count is in parentheses | Keep as-is; this pattern matches the Categories page and is consistent across admin pages |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|-----------------|--------|
| Zone D — Edit | `mode="edit"` with pre-filled fields | Only add modal drawn | Implement edit mode as same component; update title to "Sửa combo" when editing |
| Zone C — Old price | Strikethrough old price column | Drawn as a separate line below current price | Implement as stacked price cell: current price top, strikethrough below |
| Zone A — Sticky | Sticky top-0 z-20 | Dark nav bar drawn at y=0 | Confirm `sticky` class is applied; test with scrollable combo list |
| Zone D — Min items | Min 2 products | Not explicitly labeled in excalidraw | Add Zod validation + disabled state on submit button |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets ≥ 44px — action buttons "Sửa" / "Xóa" are 44×24px in excalidraw; increase height to 36px minimum
- [ ] Screen reader labels on savings badge (currently a styled text, needs `aria-label`)
- [ ] Keyboard: Tab → moves through table rows → Enter opens edit modal → Esc closes modal
- [ ] `prefers-reduced-motion`: modal open/close animation should respect this
- [ ] Product qty `−` button: needs `aria-label="Giảm số lượng [product name]"` for screen readers

---

## 🚀 Recommended Next Steps

1. Confirm API returns `unit_price` per `ComboItem` and old price history field — both are needed before building Zone C and Zone D savings note
2. Decide on delete confirmation approach (dialog vs. inline) and document in `conccern.md`
3. Change savings badge color from red to green to avoid the "error" cognitive association
4. Increase "Sửa" / "Xóa" button height to 36px minimum for accessibility compliance
5. Add `aria-label` to all icon-only and badge elements

---

*Review date: 2026-05-26*
*Reviewed by: —*
