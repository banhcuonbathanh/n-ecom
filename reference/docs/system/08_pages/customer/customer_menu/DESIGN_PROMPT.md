# Design Prompt — Customer Menu Page (`/menu`)

> Paste the block below into Claude (design / artifact mode). It is written from the **real running
> app screenshots** + the page spec, so the output matches the live page, not the idealized doc.

---

## PROMPT (copy from here)

Design a **mobile-first food-ordering menu page** for a Vietnamese bánh cuốn (rice-roll) restaurant. This is a QR-table ordering screen: a customer scans a QR at their table, browses the menu, builds a cart, and confirms the order in one modal. Build it as a single self-contained HTML+Tailwind (or React) artifact at an **iPhone width of 390px**. All copy is in Vietnamese — keep it exactly as given.

### Visual system (match precisely)
- **Theme:** dark. Page background near-black `#0b0f17`; cards/panels a slightly lighter slate `#1b2230` / `#222b3a` with subtle rounded corners (`rounded-xl`) and 1px hairline borders `#2a3344`.
- **Primary accent:** warm orange `#f97316` (buttons, prices, active states, the `+` add button).
- **Text:** primary `#e5e7eb` (near-white), secondary/muted `#8b95a7` (descriptions, labels). Prices are orange and bold.
- **Currency format:** `30.000 đ` (dot thousands separator, lowercase `đ`, space before it). Prices right-aligned. Zero-priced items (canh) show `0 đ`.
- **Font:** clean sans-serif (Inter/system) for body. The restaurant title uses **Playfair Display** (serif display), white with a soft text-shadow, centered over the header photo.
- **Header is a photo banner**, not a flat bar — a restaurant cover image with a dark gradient fading to near-black at the bottom (see Header below).
- Generous touch targets, comfortable vertical rhythm, no harsh shadows.

### Layout, top → bottom

1. **Header (photo banner).** A ~196px restaurant cover photo (`header-example.jpg`) with a dark top→bottom gradient overlay (transparent at top → near-black `rgba(8,11,18,0.92)` at the bottom). Centered over it, the **Playfair Display serif title "Quán Bánh Cuốn"** in white with a soft text-shadow. That is the entire header — **no pill bar, no table label, and no login button** below it. (The **"Bàn 04"** table pill lives inside the order-summary header — step 7 — not here.)

2. **Search bar.** Full-width rounded input, muted magnifier icon + placeholder **"Tìm món nhanh..."**. It sits in normal page flow (just under the restaurant banner) and is **NOT sticky** — as the customer scrolls down it scrolls out of view along with the header and banner above it.

3. **Category tabs (sticky scroll-spy nav).** A horizontally-scrolling bar of text labels matching the real menu categories: **Tất cả · Suất · Trứng · Bánh Cuốn · Giò**. (**Canh is not a browsable category** — soup is never a menu card; it is chosen only via the CANH stepper inside the order summary, step 7.) **Sticky behaviour (match exactly):** this is the **only** sticky element. Once the customer scrolls past the header / banner / search bar, those all scroll away and the category nav **pins to the very top edge of the screen (`top: 0`)** — so while scrolling the menu the tabs are the single bar fixed at the top, with no search bar above them. These are **navigation anchors, not filters** — every section always renders. Tapping a tab **scrolls** to that section, and scrolling the page **auto-highlights** the tab of the section currently in view. Active style = **orange text + orange underline + a soft orange text-glow**; others muted. The nav is **hidden entirely while a search is active** (a search shows a flat filtered list instead).

4. **Favourites rail ("YÊU THÍCH") — only renders if the customer has ≥1 favourite.** A section label **"YÊU THÍCH"** with a small heart, then a **horizontally-scrolling row of compact cards** — one per favourited item (combos *and* individual products mixed together). Each compact card: small square thumbnail, a **filled orange heart ♥** in the corner (tapping it un-favourites and removes the card from the rail), name (e.g. *Suất Giò · Bánh Chay · Suất Đầy Đủ Trứng Chín*), and the orange price. Tapping a card opens that item's detail; it's the quick-reorder shelf.

5. **SUẤT (combo) section.** Section label **"SUẤT"**. **Combo cards now get the full product-card treatment — favourites *and* toppings** (this is the signature change of this design). Same row layout as a MÓN LẺ card:
   - **Left:** square thumbnail (`96px`, rounded) with a small circular **heart (favourite) toggle** in the corner.
   - **Middle:** combo **name** (e.g. **"Suất Đầy Đủ Trứng Chín"**), a 1-line muted **description** (e.g. *"1 bánh trứng chín + 3 bánh cuốn + 1 giò + canh có rau"*), then the orange **price** (**"30.000 đ"**).
   - **Right, stacked:** a **quantity stepper** — round outline **`–`**, the number (default **0**; seeded per the step-7 worked example), round **orange-filled `+`** — and **below it a "nhân" (filling) pill group that is NOT single-select**: **"Nhân thịt"** and **"Nhân thịt mộc nhĩ"**. The customer may pick **nhân thịt**, **nhân thịt mộc nhĩ**, or **both** (each selected pill turns solid orange; selecting both = a mixed suất where its bánh cuốn/trứng are split across the two nhân); **by default only "Nhân thịt" is selected, and at least one must always stay selected** (deselecting the last one is not allowed). The chosen filling(s) set the nhân of the bánh-cuốn/trứng inside that suất, which flow into the cart and the order summary exactly like a product's nhân.
   - Render the five real suất: **Suất Đầy Đủ Trứng Tái** (30.000 đ, *"1 bánh trứng tái + 3 bánh cuốn + 1 giò + canh có rau"*), **Suất Đầy Đủ Trứng Chín** (30.000 đ, *"1 bánh trứng chín + 3 bánh cuốn + 1 giò + canh có rau"*), **Suất Giò** (25.000 đ, *"1 giò + 4 bánh cuốn + canh có rau"*), **Suất Trứng Tái** (25.000 đ, *"1 bánh trứng tái + 4 bánh cuốn + canh có rau"*), **Suất Trứng Chín** (25.000 đ, *"1 bánh trứng chín + 4 bánh cuốn + canh có rau"*).

6. **Product sections — TRỨNG · BÁNH CUỐN · GIÒ.** The individual items are grouped under muted uppercase **category section headers** (one section each, in this order). **There is no CANH section** — canh is not shown as a menu card; soup is added exclusively through the CANH stepper in the order summary (step 7). Each product card (full width, rounded, slate background) is the core repeated component:
   - **Left:** square food thumbnail (`~96px`, rounded), with a small circular **heart (favourite) toggle** in its top-right corner.
   - **Middle:** product **name** in bold (e.g. **"Bánh Cuốn Thịt"**), then a 1–2 line muted **description**.
   - **Right, stacked:** a **quantity stepper** — round outline **`–`**, the number (default **0**), round **orange-filled `+`**. Below the stepper, a **single-select "nhân" (filling) pill group** — **"Nhân thịt"** / **"Nhân thịt mộc nhĩ"** — that turns solid orange when selected. **Only the bánh-cuốn and trứng items take a nhân; Bánh Chay and Giò have NO nhân pill.**
   - Render the real menu items at their real prices:
     - **TRỨNG:** Bánh Trứng Tái (9.000 đ), Bánh Trứng Chín (9.000 đ), Bánh Trứng Vàng (9.000 đ) — each with the Nhân thịt / Nhân thịt mộc nhĩ pill group.
     - **BÁNH CUỐN:** Bánh Cuốn Thịt (4.000 đ), Bánh Cuốn Mộc Nhĩ (4.000 đ) — each with the nhân pill group; **Bánh Chay (2.500 đ)** — *bánh không*, NO nhân pill.
     - **GIÒ:** Giò (9.000 đ) — NO nhân pill.
     - **(No CANH cards.)** The two canh products (Canh có rau / Canh không rau, 0 đ) are **not rendered as menu cards**; soup is added only via the CANH stepper in the order summary (step 7), where "Bát có rau" → *Canh có rau* and "Bát không rau" → *Canh không rau*.

7. **Order summary panel ("Tóm tắt đơn hàng").** A collapsible card showing the live cart. The worked example below is the real **Bàn 04 family order** (mẹ + 2 người lớn + 2 trẻ): **COMBO** = 1 Suất Đầy Đủ Trứng Chín + 2 Suất Giò; **MÓN LẺ** = 2 Bánh Trứng Vàng + 2 Bánh Chay + 4 Canh có rau + 2 Canh không rau = **103.000 đ**. Its header row shows the title plus a **"Bàn 04"** pill wrapped in a slowly **spinning orange light ring** (animated conic gradient), and a chevron to collapse/expand:
   - Grouped lines **COMBO** and **MÓN LẺ**, each item row: name, stepper `– n +`, price, and a 🗑 delete icon.
     - **COMBO:** *Suất Đầy Đủ Trứng Chín* `– 1 +` 30.000 đ · *Suất Giò* `– 2 +` 50.000 đ.
     - **MÓN LẺ:** *Bánh Trứng Vàng* `– 2 +` 18.000 đ · *Bánh Chay* `– 2 +` 5.000 đ · *Canh có rau* `– 4 +` 0 đ · *Canh không rau* `– 2 +` 0 đ.
   - **Topping / nhân under each item.** Beneath every item name, show its selected filling/topping in a small **orange caption** (e.g. *"Nhân thịt"*, or *"Nhân thịt · Mộc nhĩ"* when both are selected). Items with no nhân (Bánh Chay, Giò, Canh) show nothing there.
   - **"Chi tiết" (detail) toggle — especially for combos.** Each **combo** row has a small chevron / text button **"⌄ Chi tiết"** (collapsed) ⇄ **"⌃ Ẩn chi tiết"** (expanded). Tapping it expands an indented sub-list of the combo's component dishes — each sub-row showing the dish name, its own nhân caption, a `– n +` stepper and a 🗑:
     - *Suất Đầy Đủ Trứng Chín* → `Bánh Trứng Chín ×1 · Bánh Cuốn ×3 · Giò ×1 · Canh có rau ×1`.
     - *Suất Giò* → `Giò ×1 · Bánh Cuốn ×4 · Canh có rau ×1` (per suất). Collapsed by default; the orange group **"Subtotal: 80.000 đ"** stays visible either way.
   - A muted **"Subtotal"** under each group (**COMBO: 80.000 đ** · **MÓN LẺ: 23.000 đ**), then a bold **"Tổng cộng:"** row with the orange total **103.000 đ**.
   - A **CANH (soup) block**: label **"CANH"**, two stepper rows **"Bát có rau" `– 4 +`** and **"Bát không rau" `– 2 +`** (the numbers are orange). If no soup is chosen this block shows a running/animated orange border + warning **"⚠ Bạn chưa chọn canh..."**.
   - A collapsible **"TỔNG SỐ MÓN (n loại)"** detail table — toggled by a **"⌄ Hiện / ⌃ Ẩn"** button — with columns **MÓN · NHÂN · SL · ĐƠN GIÁ · THÀNH TIỀN**. This is an **aggregated rollup of every dish in the whole order**: it flattens all combos into their component dishes, merges them with the individual items, and **sums quantities of rows that share the same dish name AND the same nhân/topping** into a single row. `(n loại)` = the number of distinct dish+topping rows after merging.
     - Worked example (Bàn 04, with both combos carrying both nhân → *Nhân thịt · Mộc nhĩ*) — **7 loại**:
       `Bánh Trứng Chín · Nhân thịt · Mộc nhĩ ×1` · `Bánh Cuốn · Nhân thịt · Mộc nhĩ ×11` (3 from the full suất + 8 from 2× Suất Giò) · `Giò ×3` (1 + 2) · `Canh có rau ×7` (1 + 2 from combos + 4 individual) · `Bánh Trứng Vàng · Nhân thịt ×2` · `Bánh Chay ×2` · `Canh không rau ×2`.
     - Note how merging works: the **Canh có rau** from both suất *and* the 4 individual bowls collapse into one **×7** row; but **Bánh Trứng Vàng** is a different dish from the combos' Bánh Trứng Chín, so it stays its own row.
     - The **NHÂN** column shows each row's topping in orange; rows with no nhân (Giò, Canh, Bánh Chay) show **—**. SL is the merged total quantity.
   - A **"GHI CHÚ"** order-note textarea (pre-filled with **"Gia đình (mẹ + 2 người lớn + 2 trẻ)"**) and a small **"✓ Đã lưu"** saved indicator.

8. **Floating cart + checkout buttons (bottom-right).** Not a full-width bar — **two stacked pill buttons** pinned to the bottom-right corner, above the nav, that appear **only when the cart has items**: a **cart pill** (🛒 + a round orange count badge, **13** for the Bàn 04 order) above an orange **"Thanh toán"** pill. Tapping the cart pill scrolls to the order summary; tapping **"Thanh toán"** opens the confirm modal. **No total is shown on either button.** When soup is missing the **"Thanh toán"** pill is **dimmed/disabled**.

9. **Bottom navigation (shell, 5 tabs).** Icons + Vietnamese labels: **Menu** (active = orange, fork/knife icon with orange top indicator), **Đơn Hàng** (receipt), **Yêu Thích** (heart), **Theo Dõi** (location pin), **Cài Đặt** (gear). Inactive tabs muted.

### Favourite (heart) behaviour — wire this up
- The heart toggle appears on **every product card AND every combo card** (corner of the thumbnail). Empty outline heart ♡ = not saved; tapping fills it solid orange ♥ = saved.
- Tapping a heart **does not** add to cart or open detail — it only toggles favourite state (stop event propagation).
- When the first item is favourited, the **"YÊU THÍCH" rail (step 4) appears**; it lists every favourited combo and product as compact horizontal cards. Un-favouriting (tap the filled ♥ on the card or in the rail) removes it from the rail; when the last one is removed the whole rail disappears.
- Favourites persist locally (independent of the cart) — keep them in their own state, not the cart state.

### Overlay to include: Table confirm modal
A centered dark modal (`rounded-2xl`, slate `#161d29`):
- Title **"Xác nhận đặt hàng"**.
- An itemized list, each row `n× <name>` left, orange price right — the Bàn 04 order:
  `1× Suất Đầy Đủ Trứng Chín … 30.000 đ` · `2× Suất Giò … 50.000 đ` · `2× Bánh Chay … 5.000 đ` · `2× Bánh Trứng Vàng … 18.000 đ` · `2× Canh có rau … 0 đ`.
- Hairline divider, then bold **"Tổng cộng"** + big orange total **103.000 đ**.
- A textarea placeholder **"Ghi chú cho bếp (tuỳ chọn)"**.
- Two buttons at the bottom: outlined **"Hủy"** (cancel) on the left, solid-orange **"Đặt hàng"** (place order) on the right.

### Notes
- Everything is dark-mode; the only bright color is the orange accent. Keep it calm and high-contrast.
- Make the product card and the floating checkout buttons pixel-faithful — they are the signature elements.
- Use placeholder/emoji food thumbnails if no images are available.

## (end prompt)

---

### Reference design (this prompt now mirrors the `Combo card with favorites and toppings` artifact)
- Design artifact (HTML+Tailwind): `claude_design/Combo card with favorites and toppings/Menu Ban Cuon.dc.html` — **source of truth**
- Header cover photo: `claude_design/Combo card with favorites and toppings/header-example.jpg`
- ⚠️ The `screenshots/*.png` in that folder are **stale** (older "Bàn 03 / Đăng nhập / Chả thường" design) — do not use them; follow the HTML artifact.

> Source of truth for behaviour (not visuals): [`customer_menu.md`](customer_menu.md) ·
> visual diff doc-vs-code: [`COMPARISON_VISUAL_MOCKUP_VI.md`](COMPARISON_VISUAL_MOCKUP_VI.md).
</content>
</invoke>
