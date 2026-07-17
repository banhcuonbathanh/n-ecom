---
page: client_order_page
type: UX/UI review
updated: 2026-05-28
audience: Developer + designer
---

# UX/UI Review — Client Order Tracking Page

> Structured code-review style. Based on `client_order_page_wireframe_v1.md` and `order_ver2.excalidraw`.

---

## ✅ UX Strengths

1. **Realtime transparency without effort** — SSE-driven updates mean customers never need to refresh. The `● LIVE` pill makes the connection state visible, reducing anxiety about stale data.
2. **Granular per-item tracking** — `tổng×N · ra×N · còn×N` per row gives customers exactly the information they need to know what's coming and what arrived.
3. **Progressive disclosure via collapse** — Zone 1 card and combo sections can be collapsed (`↕`), keeping the page clean when customers only need the money summary.
4. **Contextual action buttons** — Zone 5 (cancel whole) and Zone 6 (add more) appear only when they're meaningful (< 30% progress / dine-in). No dead UI.
5. **Dual cancel path** — Both per-item cancel and whole-order cancel are reachable, with Modal B providing a confirmation step that prevents accidental cancellations.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| **SSE LIVE pill** | Small green pill in the nav may be missed by users who don't know what it means. | Add a one-time tooltip on first visit: "● Xanh = trang đang cập nhật tự động" (dismiss after 3s). |
| **còn×N badge** | "còn×N" is compact but unfamiliar to non-tech users. | Display as "Bếp đang làm: N phần" in a small text label instead of a badge when space allows. |
| **Progress bar** | Orange progress bar shows overall progress but doesn't indicate estimated remaining time. | Add estimated minutes remaining below the bar: "~5 phút còn lại" derived from `elapsedMinutes` + average service rate. |
| **Cancel confirmation wording** | Modal B's confirm button is "Xác nhận huỷ". The word "huỷ" alone can feel destructive. | Change to "Huỷ món này" (item) or "Huỷ toàn bộ đơn" (whole) to be specific about scope. |
| **Zone 4 (completion banner)** | Green banner just says "đã hoàn thành". Customer may not know what to do next. | Add a clear CTA: "Gọi nhân viên để thanh toán" with a secondary action "Đặt thêm" if table_id exists. |
| **Mobile scroll depth** | Zones 2 and 3 (summary table + money card) require scrolling. Many users may never see them. | Consider sticking Zone 3 (money card) to the bottom as a persistent summary bar. Show Tổng cộng at a glance. |
| **Empty order edge case** | If the order has 0 items (edge), Zone 1 shows nothing inside the card. | Add an explicit empty state inside OrderCard: `<EmptyState message="Chưa có món nào" />` |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| **✓ xong label** | Green "✓ xong" is shown inline next to topping chips, which can blend in. | Use a green `Badge` component (`variant='success'`) with text "Đã ra đủ" for clearer visual hierarchy. |
| **Huỷ button sizing** | Per the QA checklist, `Huỷ` buttons must be `min-h-[44px]`. In a dense item row, this may force too much vertical padding. | Use `variant='destructive' size='sm'` with `min-h-[44px]` enforced via wrapper `div`. See `components/ui/button.tsx`. |
| **ToppingChip display** | Topping chips with `+ price` can overflow in narrow rows. | Limit to 2 chips visible, "+ N thêm" overflow label. Tooltip on tap to show all. |
| **Progress bar color** | Orange progress bar is on-brand. But at 100% (all served) it should switch to green to signal completion. | `progressPercent === 100 → bg-green-500 / border-green-500`. Match Zone 4 completion banner color. |
| **Zone 3 font size** | "Tổng cộng" uses `font-size: 18` per wireframe. This is not a Tailwind default. | Use `text-lg` (18px) and `font-semibold`. Confirm this matches the design token in `globals.css`. |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|------------------|--------|
| Nav | `sticky top-0 z-20` | Top nav bar with back arrow + LIVE pill | ✅ Aligned |
| Zone 1 progress bar | Orange, percentage-based | Orange horizontal bar | ✅ Aligned |
| Zone 1 collapse | `↕` toggle | `↕` visible in top-right of card | ✅ Aligned |
| Zone 2 table | Columns: TÊN MÓN · SL · RA · CÒN · ĐƠN · TỔNG | Same columns visible | ✅ Aligned |
| Zone 5 button | `red outline button` | Red outline visible | ✅ Aligned |
| Zone 6 button | `orange filled button` | Orange button visible | ✅ Aligned |
| Modal A | Auto-opens on SSE `order_confirmed` | Not shown in excalidraw (event-triggered) | ⚠️ Add a static frame showing Modal A open state for dev reference |
| Modal B | Cancel confirm with item name | Not shown in excalidraw | ⚠️ Add a static frame showing Modal B with item cancel and whole-order cancel states |

---

## ♿ Accessibility & Edge Case Notes

- **Qty stepper** (`−  qty  +`) must have `role="spinbutton"` + `aria-valuenow` + `aria-label="Số lượng [tên món]"`. Disable `−` at qty = 1.
- **Modal A and B**: require `role="dialog"` + `aria-labelledby` pointing to the modal title. Both must trap focus and close on Esc.
- **LIVE pill**: Add `aria-label="Kết nối realtime đang hoạt động"` for screen readers.
- **`còn×N` badge**: Add `aria-label="Còn N phần chưa ra"` — the `×` symbol is not read by all screen readers.
- **iOS Safari**: EventSource is killed when screen locks. The `● LIVE` pill should switch to red within 5s of disconnect. Ensure `visibilitychange` triggers reconnect.

---

## 🚀 Recommended Next Steps

1. **Build `<OrderPageSkeleton />`** — this is a blocker. Pattern B means blank screen without it. Prioritize over other enhancements.
2. **Add Modal A and B frames to excalidraw** — the static states for both modals are missing from the visual reference. Add before dev starts.
3. **Align cancel wording with restaurant owner** — confirm whether "huỷ từng món" is allowed after kitchen starts preparing.
4. **Define "Thêm món" navigation target** — does it add to existing order or create new? Decision needed before Zone 6 is built.
5. **Prototype sticky Zone 3 money bar** — test on iPhone SE (375px) whether a sticky money summary at the bottom improves UX without clashing with Zone 5/6 buttons.

---

*Review based on wireframe v1 (2026-05-27). Update when excalidraw modals are added.*
