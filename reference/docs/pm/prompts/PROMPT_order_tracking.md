You are a Frontend Developer for a Vietnamese Bánh Cuốn restaurant management system.

Tech stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Zustand · TanStack Query

Build the Order Tracking page at `/order/[id]` as a single HTML file (dark theme, mobile-first).

---

## Design tokens
Primary/Accent: #FF7A1A
Dark Background: #0A0F1E
Card Background: #1F2937
Success/Green: #3DB870
Warning/Yellow: #FCD34D
Error/Red: #FC8181
Gray Text: #9CA3AF

---

## Page layout (top → bottom)
1. Sticky topbar — logo "🍜 Bánh Cuốn" + order number right-aligned
2. SSE realtime pill (green dot + "SSE đang kết nối")
3. Order header — title, status badge, meta row (table/time/customer/source), note box
4. Progress card — large % number, gradient fill track, 5-step status stepper
5. Summary card — list all items with individual cancel buttons (see rules below)
6. Payment total card — line items, refund row if any cancelled, grand total

---

## Order data model
- Standalone items: id, name, icon, qty, unitPrice, served, cancelled
- Combo header: name, totalPrice — shown as collapsible group (chevron toggle)
- Combo sub-items: belong to a combo header via comboRefId, each has qty/served/cancelled

Example order:
- 🍜 Bánh Cuốn Thịt Heo ×2 · 45.000₫ (standalone)
- 🥟 Chả Giò (3 cái) ×1 · 35.000₫ (standalone)
- 🎁 Combo Gia Đình · 120.000₫
└ 🦐 Bánh Cuốn Nhân Tôm ×2
└ 🥛 Nước Cốt Dừa ×2
└ 🍮 Chè Đậu Đỏ ×1

---

## Per-item cancel buttons (CRITICAL REQUIREMENT)
Each row in the summary card must have its own "Huỷ" button on the right side.

Rules:
- Standalone item → "Huỷ" button (cancels that item)
- Combo sub-item  → "Huỷ" button (cancels only that sub-item)
- Combo header    → "Huỷ combo" button (cancels ALL pending sub-items at once)

Button states:
- pending=0 & served=qty  → button hidden (fully served)
- pending=0 & cancelled>0 → button shows "Đã huỷ" disabled grey
- pending>0               → button shows "Huỷ" active red style

When any "Huỷ" button is clicked → show a small confirm dialog:
- Title: "Huỷ [item name]?" or "Huỷ toàn bộ combo?"
- Body: how many portions will be cancelled
- Shows estimated refund amount in green
- Two buttons: "Giữ lại" (cancel) · "Xác nhận huỷ" (confirm)
- On confirm: cancelled += pending(id), re-render

---

## Served badge per item (right side, above cancel button)
- served=0, cancelled=0         → grey   "Chưa ra"
- 0 < served < qty              → yellow "X/Y ra"
- served=qty, cancelled=0       → green  "Ra đủ"
- cancelled>0, served=0, pend=0 → red    "Đã huỷ"
- cancelled>0, pend>0           → yellow "X huỷ · Y còn"

Also show a 50px mini progress bar below the badge.

---

## Cancel eligibility logic
cancel_allowed for an item = pending(id) > 0
pending(id) = max(0, qty - served - cancelled)

When ALL pending items are 0 → the order status does not change to "cancelled"
(partial cancel only — full cancellation is a separate flow)

---

## SSE realtime (simulate with buttons)
SSE events update the view without page reload:
- item_update  → increases qtyServed for a specific item
- order_update → changes order status
- order_complete → all items served, status = delivered

Include demo sim buttons at the bottom:
"Ra 1 món lẻ" | "Ra 1 món combo" | "Ra đủ combo" | "Chuyển status" | "↺ Reset"

---

## Payment total card
Show line items:
- Each standalone item: name ×qty → price (strikethrough if fully cancelled)
- Combo header: combo name ×1 → combo price
- If any cancellations exist: show green "Hoàn lại ước tính → −Xₓ₫" row
- Final row: "Tổng cộng" or "Còn lại" (if refund exists) → grand total in accent color

---

## Additional UI rules
- Status stepper: 5 steps (Chờ xác nhận → Đã xác nhận → Đang làm → Sẵn sàng → Đã giao)
Completed steps = green check dot, active step = orange dot, future = grey
- Combo group is collapsible (chevron toggle), open by default
- Cancelled item row dims to 55% opacity
- Show cancelled note under item name: "X phần đã huỷ · Y chưa ra"
- No modal/bottom-sheet for cancel selection — buttons are inline on each row
- Confirm dialog is a small centered overlay (NOT bottom sheet)
- Status badge colors: pending=grey, confirmed=blue, preparing=yellow, ready=green, delivered=teal, cancelled=red

Deliver as a single self-contained HTML file. No external dependencies.
All state managed in plain JS. Include demo sim controls at bottom.