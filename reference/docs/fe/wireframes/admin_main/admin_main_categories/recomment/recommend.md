> UX/UI review for Admin — Categories. Filled from excalidraw review (Flow A).

---

## ✅ UX Strengths

1. **Compact table layout** — 2-column table (Tên danh mục, Thứ tự) is simple and immediately scannable; no unnecessary columns.
2. **Inline actions** — Sửa/Xóa per row keeps the action close to the data, reducing navigation and cognitive load.
3. **Live count in title** — "Danh mục (5)" immediately shows the total without a separate summary section.
4. **Modal reuse pattern** — Add and Edit modals share the same form fields; the interaction is learnable once and applied to both.
5. **Orange focus ring in Edit modal** — Pre-filled inputs have an orange border, clearly distinguishing "editable existing data" from a blank add form.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Zone C — Delete action | "Xóa" button is red but no confirm dialog shown in excalidraw | Add confirmation step (inline popover or modal) before DELETE — destructive actions should require explicit intent |
| Zone C — Actions column | "Sửa" and "Xóa" buttons have no column header | Add a "Thao tác" header to the actions column for table completeness |
| Zone C — Sort order | "Thứ tự" column shows raw integers (0, 1, 2…) | Consider a future drag-to-reorder UX; for now, numeric input is acceptable |
| Zone D/E — Error state | No validation error state visible in excalidraw | Ensure inline field errors appear below inputs (duplicate name, empty name) |
| Zone C — Loading state | Not shown in excalidraw | Implement skeleton rows during initial fetch to avoid layout jump |
| Zone C — Empty state | Not shown in excalidraw | Design empty state message for when the category list is empty |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Table rows | Alternating white / #f8fafc — very subtle zebra stripe | Keep as is — subtle stripes reduce eye strain on lists without being distracting |
| Xóa button | #fee2e2 background + #dc2626 text | Good destructive button pattern; enforce `min-h-[44px]` for accessibility |
| Modal close button (×) | Rendered as a text element — small hit target | Wrap in a min 44×44px button container for reliable click/tap |
| "+ Thêm danh mục" button | Orange fill, right-aligned in Zone B | Good placement — consistent with other admin pages; keep |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|-----------------|--------|
| C | Actions column needs header | No header on Sửa/Xóa column | Add "Thao tác" header in implementation |
| C | Delete should have confirmation | Not shown | Decide confirm vs. direct — see conccern.md |
| A | AdminTopNav should be sticky top-0 z-20 | Zone A label present but no sticky annotation | Enforce `sticky top-0 z-20` in implementation |
| C | Loading skeleton needed | Not shown in excalidraw | Add skeleton rows component |
| C | Empty state needed | Not shown in excalidraw | Add empty state component |

---

## ♿ Accessibility & Edge Cases

- [ ] All interactive buttons: `min-h-[44px] min-w-[44px]`
- [ ] Modals: `role="dialog"` + `aria-labelledby` pointing to modal title element
- [ ] Modal focus trap: Tab cycles only inside open modal; Esc closes modal
- [ ] Screen reader: announce modal title on open (focus management or `aria-live`)
- [ ] Keyboard: all Sửa/Xóa row actions reachable via Tab + Enter — no mouse-only interactions
- [ ] `prefers-reduced-motion`: disable modal transition animations if set

---

## 🚀 Recommended Next Steps

1. Decide delete confirmation UX (confirm modal vs. inline popover) — update conccern.md when resolved
2. Add "Thao tác" header to the actions column in CategoryTable
3. Design empty state for Zone C
4. Confirm `AdminTopNav` shared component exists and accepts `activeTab` prop before starting dev
5. Implement loading skeleton rows for Zone C during initial data fetch

---
*Review date: 2026-05-25*
*Reviewed by: —*
