> UX/UI review for Admin — Kho nguyên liệu. Flow A: filled from excalidraw review.

---

## ✅ UX Strengths

1. **Row-level visual warning** — The full-row orange background for near-expiry items is immediately scannable. An admin can spot problems without reading every cell.
2. **Dual signal for urgency** — Both the quantity (red text) and expiry date (red text) independently signal urgency. Either alone could be missed; together they're hard to ignore.
3. **Inline actions** — "Sửa" and "Xóa" buttons per row remove the need for navigation, keeping CRUD operations fast.
4. **Threshold tooltip** — The `(?)` inline hint on "Ngưỡng cảnh báo" is exactly where the user needs it; they don't have to hunt for documentation.
5. **Consistent modal pattern** — The 6-field modal matches the pattern used in other admin pages (Products, Combos), reducing learning curve.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Search | No debounce specified | Add 300ms debounce to `searchQuery` state to avoid excessive re-renders |
| Delete confirmation | Excalidraw shows no confirmation dialog | Add a simple confirm dialog ("Xóa nguyên liệu này? Thao tác không thể hoàn tác.") before DELETE |
| Empty table | No empty state visible in excalidraw | Implement `<EmptyState>` with CTA to add first ingredient |
| Pagination | 4 rows in excalidraw — unclear for 50+ items | Decide: client-side full-list or server paginated. Add `<Pagination>` component if paginated |
| Status legend | No legend visible | Consider a small legend row above the table: "🟢 Còn hàng · 🟡 Sắp hết hạn" for first-time users |
| Unit dropdown | Single select showing "kg ▾" | Confirm the full list of units with the owner; a restricted dropdown prevents typos |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Action buttons (Sửa / Xóa) | 20px height in excalidraw — below 44px touch target | Ensure `min-h-[44px]` or group into an icon button with adequate padding |
| "Sắp hết hạn" badge width | 100px vs 72px for "Còn hàng" — inconsistent column width | Fix badge widths or align by content with `min-w` |
| Row 4 orange bg | `#fff7ed` conflicts with hover state | Define hover as `bg-orange-100` on warning rows so hover feedback is still visible |
| Modal fields row layout | Half-width fields (Đơn vị + Số lượng; Ngày nhập + Số ngày BQ) | Confirm this 2-col layout works at 1024px; may need to stack on narrower viewports |
| Tooltip "(?) cảnh báo khi tồn kho dưới mức này" | Small font (9px in excalidraw) | Render as accessible tooltip component with `aria-describedby`; min font 12px |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|------------------|--------|
| D — Status | Còn hàng · Sắp hết hạn | Both shown (3× green, 1× amber) | ✅ Aligned |
| D — Hết hàng | Inferred needed (qty = 0) | Not shown | ❓ Add to conccern.md — confirm with owner |
| D — Row actions | Sửa + Xóa | Shown as outline buttons | ✅ Aligned |
| E — Fields | 6 fields as specified | All 6 visible | ✅ Aligned |
| E — Edit mode | Inferred from "Sửa" button | Modal title says "Thêm" only | ⚠️ Confirm modal title changes to "Chỉnh sửa nguyên liệu" in edit mode |
| C — Search | Client-side filter | Placeholder "Tìm nguyên liệu..." | ✅ Aligned |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets: `min-h-[44px] min-w-[44px]` for all buttons (Sửa, Xóa, Thêm NL, Lưu, Hủy)
- [ ] Screen reader: Badge text ("Còn hàng", "Sắp hết hạn") is sufficient — no icon-only signals
- [ ] Keyboard: Tab through table actions; modal traps focus with Tab → Shift+Tab → Esc to close
- [ ] Warning threshold tooltip: use `<Tooltip>` with `aria-describedby` for keyboard users
- [ ] Row warning: orange bg is supplementary (text labels present) — passes colour-blind requirements
- [ ] `prefers-reduced-motion`: modal open/close animation should respect this setting

---

## 🚀 Recommended Next Steps

1. Confirm with owner: RBAC (Admin vs Manager permissions), "Hết hàng" status, pagination strategy
2. Confirm unit dropdown values with owner before building the select component
3. Add delete confirmation dialog design (not in excalidraw but required for safety)
4. Decide on table pagination — if > 20 rows expected, reuse `<Pagination>` (already in shared index)
5. Verify modal title changes between "Thêm nguyên liệu" and "Chỉnh sửa nguyên liệu" based on mode

---
*Review date: 2026-05-26*
*Reviewed by: —*
