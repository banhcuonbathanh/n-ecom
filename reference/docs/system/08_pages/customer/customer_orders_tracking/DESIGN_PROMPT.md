# Design Prompt — Customer Orders & Tracking Page (`/orders`)

> Paste the block below into Claude (design / artifact mode). It **merges two real pages** —
> `/tracking` (live monitoring of your active order + whole-floor queue) and `/order` (your order
> history list + rich detail sheet) — into one screen. It is written from the **real running-app
> renders** (the ② "code render THẬT" panels of each page's `COMPARISON_VISUAL_MOCKUP_VI.md`) plus
> the page specs, so the output matches the live components, not the idealized wireframe ASCII.

---

## PROMPT (copy from here)

Design a **mobile-first "My Orders & Live Tracking" screen** for a Vietnamese bánh cuốn (rice-roll) restaurant QR-ordering app. This single screen does two jobs at once: (1) it lets a customer see **their own order — in summary and in full detail** (dishes, toppings, prices, cooking progress), and (2) it shows a **live floor queue of every other order right now** — each order's number and table number, with status — so the customer knows where they stand. Build it as a single self-contained HTML+Tailwind (or React) artifact at an **iPhone width of 390px**. All copy is in Vietnamese — keep it exactly as given.

### Visual system (match precisely — identical to the menu page)
- **Theme:** dark. Page background near-black `#0b0f17`; cards/panels a slightly lighter slate `#1b2230` / `#222b3a`, `rounded-xl`, 1px hairline borders `#2a3344`.
- **Primary accent:** warm orange `#f97316` (active states, prices, the live "bàn bạn" highlight ring, primary buttons, progress-bar fill).
- **Text:** primary `#e5e7eb` (near-white); secondary/muted `#8b95a7` (labels, captions, "time ago"). Prices are orange and bold.
- **Currency format:** `105.000 ₫` (dot thousands separator, the **₫** symbol with a space before it). Right-aligned. Zero-priced soup shows `0 ₫`.
- **Font:** clean sans-serif (Inter/system) for everything. Order numbers (`BC-0042`) in a slightly condensed/mono-ish weight.
- **Status badges (StatusBadge)** — a small rounded pill, colored by status, with a **Vietnamese label** (never the raw English status):
  - `pending` → **"Chờ xác nhận"** (amber)
  - `confirmed` → **"Đã xác nhận"** (blue)
  - `preparing` → **"Đang làm"** / in the live queue **"Đang chuẩn bị"** (orange)
  - `ready` → **"Sẵn sàng phục vụ"** (green)
  - `delivered` → **"Đã giao"** (muted slate)
  - `cancelled` → **"Đã huỷ"** (red)
- Generous touch targets, comfortable vertical rhythm, no harsh shadows. The whole screen is one vertical scroll.

### Layout, top → bottom

1. **Sticky top bar.** A thin sticky bar: left, the title **"Đơn hàng & Theo dõi"**; right, a **live-connection pill** — a small dot + label that is **"● Đang theo dõi"** (orange dot) when the realtime stream is connected, or **"○ Mất kết nối"** (muted dot) when it drops. Directly under it, a full-width **connection-error banner** **"⚠ Mất kết nối — đang thử lại..."** that appears the moment the stream goes down (animated/subtle, dismissible-looking but auto-managed).

2. **Active-order banner (TableInfoBanner) — only when the customer has an active order.** A slate card with a **square "BÀN / 03" tile** on the left (orange-tinted), and on the right:
   - line 1: **"Trạng thái:"** + the StatusBadge + an ETA suffix **"~8 phút"**.
   - line 2: **"Vị trí hàng chờ: #2 trong 5 đơn"**.
   - line 3 (only when ETA > 0): **"Chờ ~8 phút"**; when the customer is **#1** in line this ETA **gently blinks/pulses**.
   - **Delivered branch:** when the order's status is `delivered`, replace the whole right side with a friendly **"Đơn của bạn đã được phục vụ — Cảm ơn!"** (no queue/ETA).
   - A small **"👁 Ẩn bàn của bạn"** toggle sits just above this banner — tapping it collapses the personal section (steps 2–3) for privacy on a shared screen; toggles to **"👁 Hiện bàn của bạn"**.

3. **Your order — summary ⇄ detail (the merged centerpiece).** This is the heart of the page: a card that defaults to a **rich itemized summary** of the placed order and expands to the **full live-cooking detail**. Put a **"Chi tiết ⌄"** ⇄ **"Ẩn chi tiết ⌃"** toggle in its header. **This page shows a *placed* order, so quantities are read-only `×n` badges (no `– n +` steppers), the 🗑 delete becomes a "Huỷ" cancel action that only appears while cancel is still allowed (active order, item not yet served), and the order-note is read-only.**

   - **Summary (default) — the "Tóm tắt đơn hàng" panel.** A collapsible card showing the whole order. The worked example below is the real **Bàn 04 family order (mẹ + 2 người lớn + 2 trẻ)**: **COMBO** = 1 Suất Đầy Đủ Trứng Chín + 2 Suất Giò; **MÓN LẺ** = 2 Bánh Trứng Vàng + 2 Bánh Chay + 4 Canh có rau + 2 Canh không rau = **103.000 ₫**. Its header row shows the title **"Tóm tắt đơn hàng"** plus a **"Bàn 04"** pill wrapped in a slowly **spinning orange light ring** (animated conic gradient), and a chevron to collapse/expand:
     - **Grouped lines COMBO and MÓN LẺ**, each item row: name, read-only **`×n`** quantity, price, and (when cancel is allowed) a **🗑/Huỷ** action.
       - **COMBO:** *Suất Đầy Đủ Trứng Chín* `×1` 30.000 ₫ · *Suất Giò* `×2` 50.000 ₫.
       - **MÓN LẺ:** *Bánh Trứng Vàng* `×2` 18.000 ₫ · *Bánh Chay* `×2` 5.000 ₫ · *Canh có rau* `×4` 0 ₫ · *Canh không rau* `×2` 0 ₫.
     - **Topping / nhân under each item.** Beneath every item name, show its filling/topping in a small **orange caption** (e.g. *"Nhân thịt"*, or *"Nhân thịt · Mộc nhĩ"* when both). Items with no nhân (Bánh Chay, Giò, Canh) show nothing there.
     - **"Chi tiết" (detail) toggle — especially for combos.** Each **combo** row has a small chevron / text button **"⌄ Chi tiết"** (collapsed) ⇄ **"⌃ Ẩn chi tiết"** (expanded). Tapping it expands an indented sub-list of the combo's component dishes — each sub-row showing the dish name, its own nhân caption and a read-only `×n` quantity:
       - *Suất Đầy Đủ Trứng Chín* → `Bánh Trứng Chín ×1 · Bánh Cuốn ×3 · Giò ×1 · Canh có rau ×1`.
       - *Suất Giò* → `Giò ×1 · Bánh Cuốn ×4 · Canh có rau ×1` (per suất). Collapsed by default; the orange group **"Subtotal: 80.000 ₫"** stays visible either way.
     - A muted **"Subtotal"** under each group (**COMBO: 80.000 ₫** · **MÓN LẺ: 23.000 ₫**), then a bold **"Tổng cộng:"** row with the orange total **103.000 ₫**.
     - A **"TỔNG SỐ MÓN (n loại)"** collapsible detail table — toggled by a **"⌄ Hiện / ⌃ Ẩn"** button — with columns **MÓN · NHÂN · SL · ĐƠN GIÁ · THÀNH TIỀN**. This is an **aggregated rollup of every dish in the whole order**: it flattens all combos into their component dishes, merges them with the individual items, and **sums quantities of rows that share the same dish name AND the same nhân/topping** into a single row. `(n loại)` = the number of distinct dish+topping rows after merging.
       - Worked example (Bàn 04, both combos carrying both nhân → *Nhân thịt · Mộc nhĩ*) — **7 loại**:
         `Bánh Trứng Chín · Nhân thịt · Mộc nhĩ ×1` · `Bánh Cuốn · Nhân thịt · Mộc nhĩ ×11` (3 from the full suất + 8 from 2× Suất Giò) · `Giò ×3` (1 + 2) · `Canh có rau ×7` (1 + 2 from combos + 4 individual) · `Bánh Trứng Vàng · Nhân thịt ×2` · `Bánh Chay ×2` · `Canh không rau ×2`.
       - Note how merging works: the **Canh có rau** from both suất *and* the 4 individual bowls collapse into one **×7** row; but **Bánh Trứng Vàng** is a different dish from the combos' Bánh Trứng Chín, so it stays its own row.
       - The **NHÂN** column shows each row's topping in orange; rows with no nhân (Giò, Canh, Bánh Chay) show **—**. SL is the merged total quantity.
     - A **"GHI CHÚ"** order-note line, read-only on this placed order, showing what the customer wrote — **"Gia đình (mẹ + 2 người lớn + 2 trẻ)"** — with a small **"✓ Đã lưu"** indicator.
   - **Detail (expanded)** — reveal the rich three-card detail (this is the old `OrderDetailSheet`, now inline) showing the **live cooking progress** for the same order:
     - **Card A — "Chi tiết món"** (with its own progress bar): a **served-progress bar** `▓▓▓▓▓▓▓▓▓▓░░░░░░` (orange fill = `qty_served / quantity` across all display items), then one **DishRow** per dish:
       **"• Bánh cuốn thịt   tổng ×2  ra ×1  còn ×1  [Huỷ]"** — i.e. total qty, served qty, remaining qty, and a **"Huỷ"** button (shown only while the item still has unserved units). Under each DishRow, render the dish's **nhân + ghi chú** as a small caption when present, e.g. **"↳ Nhân thịt · 'ít hành'"**. Close with **"3/6 phần đã ra"**.
     - **Card B — summary table**, columns **MÓN · SL · RA · CÒN · ĐƠN GIÁ · TỔNG · _** (last col = a small **"Huỷ"** per row). A served row shows a **✓** in the CÒN column instead of a count. Footer two rows: **"Tổng tiền còn lại … 45.000 ₫"** and **"Tổng tất cả món … 110.000 ₫"**.
     - **Card C — money totals:** **"Đã dùng (3 phần) … 65.000 ₫"** · **"Còn lại (3 phần chưa ra) … 45.000 ₫"** · bold **"Tổng cộng … 105.000 ₫"**.
     - **Action buttons under the detail:** an outlined-red **"Huỷ toàn bộ đơn hàng"** — shown **only when cancel is still allowed** (active order AND less than 30% served); and a solid-orange **"+ Thêm món"** — shown only for a dine-in order (has a table). When status is `delivered`, replace the actions with a calm banner **"Đơn hàng đã hoàn thành"**.

4. **Your order history ("Đơn hàng của bạn").** Below your active order, the list of **all your orders** (newest first). Section header **"📋 Đơn hàng của bạn"** with a **"🗑 Xoá lịch sử"** text button on the right. Each card has an **orange left border** (`border-l-4`) and shows:
   - top row: **"Bàn 03"** (or **"Mang về"** when there's no table) + order number **"BC-0042"** + StatusBadge + line total **"105.000 ₫"** + a chevron **"▸"**.
   - a **thin progress bar** (`h-1`, orange) — **active orders only** (hidden once `delivered`/`cancelled`).
   - meta row: **"3/6 phần đã ra"** left, **"12 phút trước"** (relative time) right.
   - a one-line dish preview: **"Bánh cuốn thịt · Canh mọc · Trà đá"** (first 3 display items + **"+N món"** if more).
   - Tapping a card **expands that order's full detail inline** (the same three-card detail from step 3) — or, if you prefer, opens it as a slide-up sheet. Re-tapping the active order's own card is a no-op (it's already shown above).
   - **Empty state** (no orders cached): a centered **🛍** + **"Chưa có đơn hàng nào"** + **"Quét mã QR tại bàn để bắt đầu đặt món"**.

5. **Whole-floor live queue ("Hàng chờ phục vụ") — the "see everyone else" zone.** A slate card listing **every active order in the whole restaurant right now**, so the customer sees the queue they're part of. Header: **"Hàng chờ phục vụ"** + a count pill **"[3 bàn]"**. Then numbered rows, sorted by who ordered first:
   - **"①  Bàn 01   [Đang chuẩn bị]        #0039"** — position number + table label + StatusBadge + the order-number suffix on the right.
   - **"②  Bàn 03 (bàn bạn)   [Chờ xác nhận]   #0042"** — **the customer's own row is highlighted** with a **soft orange ring/left-border** and the tag **"(bàn bạn)"**.
   - **"③  Bàn 05   [Sẵn sàng phục vụ]      #0041"**.
   - Only **active** statuses appear here (`pending · confirmed · preparing · ready`); delivered/cancelled drop off. Takeaway orders show **"Mang về"** as their label instead of a table. No progress bars in this list — just **position + label + badge + order number**. The list updates live as orders advance.

6. **Bottom navigation (shell, 5 tabs).** Icons + Vietnamese labels: **Menu** (fork/knife), **Đơn Hàng** (receipt — **active here**, orange with an orange top indicator), **Yêu Thích** (heart), **Theo Dõi** (location pin), **Cài Đặt** (gear). Inactive tabs muted. (Since this screen merges Đơn Hàng + Theo Dõi, you may show **both** as active-tinted, but keep **Đơn Hàng** as the primary highlight.)

### Live / realtime behaviour — wire this up
- A single live stream drives: the **top-bar connection pill**, the **active-order status badge + queue position/ETA**, the **per-dish served progress**, and the **whole-floor queue**. When it's connected show **"● Đang theo dõi"**; on drop, flip to **"○ Mất kết nối"** and show the **⚠ banner** immediately, then quietly reconnect.
- The **queue position (`#2`)** and **ETA (`~8 phút`)** are derived from the order's index in the live floor queue (position = index + 1; ETA ≈ index × 3 min) — compute them from the same list rendered in step 5, so the banner and the floor list always agree.
- Your **own order detail refreshes** when items are added/changed/cancelled (e.g. staff adds a dish from the POS); the served counts and progress bars move accordingly.

### Fallback / empty screens (full-screen, centered, each = icon + message + a "Về trang menu" button)
- **No active order** (customer hasn't ordered): friendly empty state pointing them to the menu — but **still render the history list (step 4) and the whole-floor queue (step 5)** below, since those don't need an active order.
- **Order not found (404):** **"Đơn hàng không tồn tại"**.
- **Session expired (401, guest token timed out):** **"Phiên làm việc hết hạn — quét lại mã QR tại bàn"**.

### Overlays to include
1. **Cancel-confirm modal.** Centered dark modal (`rounded-2xl`, slate `#161d29`): title **"Xác nhận huỷ"**, a short warning line, and two buttons — outlined **"Quay lại"** left, solid-red **"Huỷ đơn"** right. (Used by both "Huỷ toàn bộ đơn hàng" and per-dish "Huỷ".)
2. **Notification modal.** A small centered modal that pops when the order changes status — e.g. **"Đơn của bạn đã được xác nhận"** (confirmed), **"Món của bạn đã sẵn sàng!"** (ready), or **"Đơn đã bị huỷ"** (cancelled) — with a single **"Đã hiểu"** button.

### Notes
- Everything is dark-mode; the only bright color is the orange accent. Keep it calm and high-contrast.
- Make the **summary⇄detail order card (step 3)** and the **whole-floor live queue (step 5)** the most polished elements — they are the two signature jobs of this merged screen.
- Use placeholder/emoji food thumbnails if no images are available.
- Keep combo header rows (priced `0 ₫`) **out** of every visible dish list and out of the progress math.

## (end prompt)

---

### Source of truth (behaviour, not visuals)
This merged prompt is assembled from the two real pages — follow these for any ambiguity:

- **Tracking half** (active order banner · per-dish progress · whole-floor queue · live stream):
  [`../customer_tracking/customer_tracking.md`](../customer_tracking/customer_tracking.md) ·
  real render → [`../customer_tracking/COMPARISON_VISUAL_MOCKUP_VI.md`](../customer_tracking/COMPARISON_VISUAL_MOCKUP_VI.md) ·
  BE surface → [`../customer_tracking/customer_tracking_be.md`](../customer_tracking/customer_tracking_be.md)
- **Order-list half** (history cards · 3-card detail · cancel rules):
  [`../customer_order_list/customer_order_list.md`](../customer_order_list/customer_order_list.md) ·
  real render → [`../customer_order_list/COMPARISON_VISUAL_MOCKUP_VI.md`](../customer_order_list/COMPARISON_VISUAL_MOCKUP_VI.md) ·
  BE surface → [`../customer_order_list/customer_order_list_be.md`](../customer_order_list/customer_order_list_be.md)

> ⚠️ **Known live-code gaps to keep in mind (don't design around them as if fixed):** on `/tracking`
> the status badge only advances on item changes (the `order.status` SSE case never matches), and
> per-item cooking progress isn't pushed live; on `/order` the `DishRow` currently hides nhân/note.
> This prompt **designs the intended UX** (badge live, nhân/note shown) — flag to the owner before
> wiring those to real code. Detail: each folder's `TRACKING_BUGS.md`.
