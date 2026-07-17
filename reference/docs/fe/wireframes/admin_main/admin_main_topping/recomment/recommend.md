> UX/UI review for Admin — Topping. Filled from excalidraw review.

---

## ✅ UX Strengths

1. **Clean 5-column table layout** — The table columns (Tên · Áp dụng · Giá · Trạng thái · Thao tác) are well-ordered: identity first, context second, value third, status fourth, actions last. This matches standard CRUD admin table conventions.

2. **"Miễn phí" differentiation** — Row 3 (Hành phi) shows "Miễn phí" in green instead of "+0đ". This is a small but meaningful UX decision — it signals intent rather than showing a potentially confusing zero value.

3. **Orange brand consistency** — The active tab underline, count badge, "Thêm topping" CTA, and modal "Lưu topping" button all use the same orange (#f97316). Consistent with the rest of the admin design system.

4. **Modal is minimal** — 3 fields only (name, price, status toggle). Avoids feature creep. The decision to keep product-topping linking separate (on the Products page) keeps this form focused.

5. **Count badge in header** — Badge "23" gives the admin an at-a-glance count without needing to scroll or count rows manually.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Zone C — "Chưa gắn sản phẩm" | Shown in muted grey across 4 of 5 rows. It looks like a warning but is actually just an informational state. | Consider adding a subtle info icon (ℹ) next to "Chưa gắn sản phẩm" with a tooltip explaining how to link: "Gắn topping với sản phẩm từ trang Sản phẩm". Without this, admins may not know where to go. |
| Zone C — No search/filter | 23+ toppings with no way to search or filter by name or status. | For v1 a single search input above the table (filter by name client-side) would cover 90% of use cases. Low effort, high value. |
| Zone C — Delete button is small | The [x] trash button is small (20×14px text). Not accessible. | Replace with an icon button (`size="icon-sm"` variant="destructive") at minimum 40×40px touch target. |
| Zone C — No sort | Table order is undefined. Items appear in creation order which may not be useful after many additions. | Default sort by name A→Z. Show a sort indicator on "Tên topping" column header. |
| Zone D — No price unit hint | The "Giá thêm (đ)" label tells the unit but the input has no suffix. A user might type 8000 or 8.000 unsure. | Add a suffix "đ" inside the input, or a helper text "Nhập số nguyên, ví dụ: 8000" below the field. |
| Zone D — Status toggle on add | Default toggle is "Có sẵn" (on). This is correct for most cases but there's no visual label for the "off" (Hết hàng) state. | Add a second label for the off state: toggle shows "Có sẵn" when on and "Hết hàng" when off. |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Zone B — Count badge | Badge uses `#fff7ed` bg + `#c2410c` text. At 40px width for "23" it looks fine, but for "123" it may overflow. | Use `min-w-[40px] px-2` to allow the badge to grow with content. |
| Zone C — Action column | "Sửa" button (blue, 56×26px) and "[x]" text (20×14px) are mismatched in size. | Use consistent button sizes: `Button variant="outline" size="sm"` for Sửa and `Button variant="destructive" size="icon-sm"` for delete — both at 32px height minimum. |
| Zone C — Row hover state | No hover state shown in excalidraw. | Add `hover:bg-slate-50` on table rows for visual feedback. |
| Zone D — Modal width | Modal card is 400px wide, good for 3 fields. | Confirm modal doesn't exceed 90vw on 768px tablets; add `max-w-[400px] w-full mx-4` to the card. |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|------------------|--------|
| Zone B | Count badge reflects `data.length` | Static "23" (example) | Implement as dynamic — derived from query result length |
| Zone C | Delete with confirmation | [x] text only — no confirmation dialog shown | Must add: `window.confirm` or `ConfirmDialog` before DELETE |
| Zone D | Title switches "Thêm" / "Sửa" based on mode | Excalidraw only shows "Thêm topping" title | Implement modal title as conditional: `topping ? 'Sửa topping' : 'Thêm topping'` |
| Zone D | Missing: "Áp dụng cho sản phẩm" not a field in modal | Not shown in excalidraw | Confirmed: product linking is on the Products page. No product field in this modal. |
| Zone C | "Có sẵn" badge = green; "Hết" badge = ? | Only "Có sẵn" (green) shown in excalidraw | Define "Hết" badge style: `variant="secondary"` (grey) or `variant="warning"` (yellow). Decide before building. |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets ≥ 44px — especially the [x] delete button (currently too small in excalidraw)
- [ ] Screen reader labels on icon-only buttons — delete button needs `aria-label="Xóa topping"`
- [ ] Keyboard: Tab → Enter → Esc closes modal; focus returns to the triggering button
- [ ] Focus trapped inside modal when open — use `@radix-ui/react-dialog` or equivalent
- [ ] `prefers-reduced-motion` — no animations in this page so this is already satisfied
- [ ] Long topping names — truncate with `truncate` class on the name cell; show full name in `title` tooltip

---

## 🚀 Recommended Next Steps

1. Confirm the 3 open UX questions in `conccern.md` (delete permission, pagination vs. scroll, search bar) before implementation starts
2. Define the "Hết hàng" badge style (grey vs. yellow) in the design system before building `ToppingTable`
3. Add a `min-h-[44px]` constraint to the delete button in the implementation spec
4. Add a brief "Gắn topping với sản phẩm từ trang Sản phẩm" tooltip on the "Chưa gắn sản phẩm" text in Zone C

---
*Review date: 2026-05-27*
*Reviewed by: —*
