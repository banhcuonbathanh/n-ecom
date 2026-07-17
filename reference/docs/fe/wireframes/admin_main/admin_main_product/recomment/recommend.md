> UX/UI review for Admin — Products. Filled from excalidraw review.

---

## ✅ UX Strengths

1. **Single-page CRUD** — All product operations (add, edit, delete) happen in one view without navigation. No context switching.
2. **Visual product identity** — Thumbnail image in every row makes products instantly recognisable; no need to read the full name.
3. **Topping visibility in table** — Showing topping badges inline (with "+N more" overflow) gives admins a quick scan of product complexity without opening the modal.
4. **Consistent form design** — The modal uses the same field order (category → name → price → toppings) as product creation flows on other admin pages.
5. **Orange CTA hierarchy** — "+ Thêm sản phẩm" in brand orange clearly signals the primary action; "Dữ liệu mẫu" is correctly de-emphasised in gray.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Status toggle | Changing status requires opening the full Edit modal for a single field change | Add an inline status toggle (click "Đang bán" badge to flip to "Hết hàng") — much faster for kitchen staff updates during service |
| Delete confirmation | "Xóa" button is immediately visible in every row — no confirm step shown in excalidraw | Add a confirm step (dialog or inline confirm row) to prevent accidental deletions |
| Topping "+N more" | Hovering "+N more" shows nothing — user must open edit to see all toppings | Add a tooltip on hover showing all topping names |
| Price display | "Giá" column header is short with no unit hint | Add "(₫)" to header or right-align all prices consistently |
| No search/filter | All 15 products listed without any filter — will become unwieldy at 30+ products | Add a search bar in Zone A (filter by name / category) when product count grows |
| Sort order field | "Thứ tự" field default is 0 for all new products | Pre-fill with `max(sort_order) + 1` so new products appear at the bottom by default |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Image placeholder | "🖼" emoji placeholder in both table and modal is inconsistent with design system | Use a styled `<div>` with a gray background and a camera icon (consistent with other admin image fields) |
| "Hết hàng" badge | Uses gray (`#f3f4f6`), which is very similar to the table background | Use a slightly more distinct style — e.g., `badge variant="secondary"` with a light red tint to signal out-of-stock urgency |
| Actions column | "Sửa" and "Xóa" buttons are always visible — clutters every row | Consider showing actions on row hover only (standard admin table pattern) |
| Modal form fields | "Giá" and "Thứ tự" are side by side in the form — uncommon for a price field | Keep price full-width; move "Thứ tự" below or to settings section to reduce cognitive load on the primary add flow |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|------------------|--------|
| Zone B — Actions | Spec documents "Sửa" + "Xóa" per row | Excalidraw shows same — ✅ aligned | None |
| Modal M1 — Status field | Spec says status is managed via Edit modal | Modal form does NOT show a status field — status change mechanism unclear | Add a status toggle/select field to the modal form OR document that status is a separate inline action |
| Zone A — Product count | Spec: "Sản phẩm (15)" in header | Excalidraw: header shows count badge — ✅ aligned | Confirm count updates after add/delete |
| Delete confirmation | Spec expects a confirm step | Excalidraw shows no dialog | Design and implement confirm dialog before dev starts |
| RBAC on Xóa | Spec says RoleGuard for Admin + Manager | Excalidraw shows Xóa for all rows without distinction | Confirm whether Manager can delete — hide button if role insufficient |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets ≥ 44px — "Sửa" and "Xóa" buttons are 44×24px in excalidraw — height is too short, needs `min-h-[44px]`
- [ ] Keyboard: Tab → Enter on action buttons · Esc closes modal
- [ ] Focus trap inside ProductFormModal when open
- [ ] Screen reader: `aria-label` on image thumbnails ("Ảnh sản phẩm: [tên sản phẩm]")
- [ ] Empty topping list in modal — section should have a clear message, not just disappear
- [ ] `prefers-reduced-motion` — modal open/close animation should be disabled

---

## 🚀 Recommended Next Steps

1. Confirm delete confirmation pattern with owner (dialog vs. inline confirm)
2. Confirm RBAC: Manager delete permission yes/no
3. Add status field to `ProductFormModal` OR design inline status toggle
4. Decide pagination strategy before implementing `ProductsTable`
5. Confirm image upload endpoint with BE team before building `ProductFormModal`

---

*Review date: 2026-05-26*
*Reviewed by: —*
