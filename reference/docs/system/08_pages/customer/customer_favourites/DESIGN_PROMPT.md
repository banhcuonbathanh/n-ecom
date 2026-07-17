# Design Prompt — Customer Favourites Page (`/menu/favourites`)

> Paste the block below into Claude (design / artifact mode) to **see** this page. It reuses the
> exact visual system of the menu prompt so the output matches the live app, then folds in the
> **"tự tạo suất" (custom-combo builder)** idea for this design step.
> Items tagged **💡 IDEA** are my proposed additions beyond today's code — keep or drop per taste.

---

## PROMPT (copy from here)

Design a **mobile-first "Favourites" (Yêu Thích) hub** for a Vietnamese bánh cuốn (rice-roll) QR-ordering app. It is the screen where a returning customer re-orders "the usual" without hunting the menu: they see hearted dishes and combos, they can **build and save their own custom combo**, and they can push a saved combo up to the top of the menu for one-tap re-select. Build it as a single self-contained HTML+Tailwind (or React) artifact at an **iPhone width of 390px**. All copy is Vietnamese — keep it exactly as given.

### Visual system (match the menu page precisely)
- **Theme:** dark. Page background near-black `#0b0f17`; cards/panels slightly lighter slate `#1b2230` / `#222b3a`, `rounded-xl`, 1px hairline borders `#2a3344`.
- **Primary accent:** warm orange `#f97316` (buttons, prices, active states, hearts, steppers).
- **Text:** primary `#e5e7eb` (near-white), secondary/muted `#8b95a7`. Prices are orange + bold.
- **Currency format:** `35.000 đ` (dot thousands separator, lowercase `đ`, space before it), right-aligned. Zero-priced items (canh) show `0 đ`.
- **Font:** clean sans-serif (Inter/system) for body; page title may use **Playfair Display** serif to echo the menu header.
- Generous touch targets, comfortable vertical rhythm, no harsh shadows. Only bright color is the orange accent.

### Top-level layout
1. **Top nav bar (sticky).** Left: a back chevron **[←]**. Center: title **"❤ Yêu Thích"**. Right: a **cart icon 🛒** with a round orange count badge (e.g. **2**). Tapping the cart goes to the cart.
2. **Segmented tabs (sticky, under the top nav).** Three segments — **"Yêu thích" · "Bộ đã lưu" · "Tự tạo suất"** — that switch the view below. Active segment = orange text + orange underline; others muted. Default active = **Yêu thích**.
3. **Bottom navigation (shell, 5 tabs).** Icons + Vietnamese labels: **Menu** (fork/knife), **Đơn Hàng** (receipt), **Yêu Thích** (heart, **active = orange** here), **Theo Dõi** (location pin), **Cài Đặt** (gear). Fixed at the very bottom. **Any content footer / CTA must sit ABOVE this nav (add ~72px bottom padding) — never hidden behind it.**

---

### VIEW A — "Yêu thích" (the hearted list)
The default view. Shows every item the customer hearted on the menu (products *and* combos, mixed).

- **Filter chips row:** **"Tất cả (3)"** · **"Món lẻ (2)"** · **"Combo (1)"** — each with a live count; active chip is solid orange, others outline. Filters the list below.
- **Favourite cards (vertical list).** Each card (full width, slate, rounded):
  - **Left:** square food thumbnail (~72px, rounded) — use an emoji/placeholder if no image.
  - **Top-left of the card:** a small type **badge** — **"Món lẻ"** or **"Combo"** — muted pill.
  - **Middle:** item **name** in bold (e.g. **"Bánh Cuốn Thịt"**, **"Combo Đầy Đặn"**), then the orange **price** with a muted **"/phần"** suffix (e.g. **"35.000 đ/phần"**). For a combo, a 1-line muted component summary (*"1 bánh trứng + 3 bánh cuốn + 1 giò + canh"*).
  - **Right / corner:** a **filled orange heart ♥** — tapping it **un-favourites** and removes the card (this is the remove control, not an add-to-cart).
  - **Bottom-right:** a **quantity stepper** — round outline **`–`**, the number (default **1**), round **orange-filled `+`**.
- Render 3 real favourites: **Bánh Cuốn Thịt** — Món lẻ — 4.000 đ · **Bánh Trứng Vàng** — Món lẻ — 9.000 đ · **Combo Đầy Đặn** — Combo — 42.000 đ.
- **Auto-prune note (show as a dismissible toast at first paint):** *"Một số món không còn phục vụ đã được xoá khỏi danh sách yêu thích."* — a dish removed from the menu silently drops out.
- **Canh — quick-add block.** Under the favourite cards, a muted header **"Canh — thêm nhanh"** then two compact rows — **"🥣 Canh có rau · 0 đ"** and **"🍲 Canh không rau · 0 đ"** — each with a small orange **"＋ Thêm"** button on the right. Tapping it adds one soup straight to the cart (bumps the top-nav 🛒 badge) and the button flashes **"✓ Đã thêm"** for ~1s, then reverts. This block always shows regardless of the active filter chip.
- **Live total row (in the footer, above the CTA):** a single line **"n món"** on the left and **"Tổng: <orange total> đ"** on the right — the sum of every favourite card's `qty × price`, recomputed live when a stepper changes or a card is un-favourited. (Default seed: **4 món · 59.000 đ**.) The quick-add canh above is 0 đ and adds straight to cart, so it does not change this line.
- **Footer (above the bottom nav):** just the live-total row, then the primary full-width orange CTA **"🛒 Thêm tất cả vào giỏ"** (bulk-adds every listed favourite to the cart, additively). **No "Xem set đã lưu" / "Lưu thành set" buttons here** — saved sets are reached only via the top segmented tab.
- **Empty state:** a big outline heart, muted line *"Chưa có món yêu thích nào"*, sub-line *"Chạm ♡ trên món ở trang Menu để lưu vào đây"*, and an orange **"Xem Menu"** button.

---

### VIEW B — "Bộ đã lưu" (saved sets)
A saved "set" is a named snapshot of favourites the customer re-applies in one tap.

- **Set cards (vertical list).** Each card:
  - Title with a **📋** prefix (e.g. **"📋 Sáng thứ 7"**).
  - Up to 5 component lines, indented: **"▸ Bánh cuốn × 1"**, **"▸ Canh mọc × 2"**, … (if more, a muted *"+2 món nữa"*).
  - A summary line: **"3 món · 88.000 đ"** (item count from the snapshot + summed price, orange).
  - Action row: **"🛒 Áp dụng"** (orange, re-adds the whole set to the cart, silently skipping items no longer on the menu) · **"✏"** (rename inline) · **"🗑"** (delete the set).
  - 💡 IDEA — a small toggle **"📌 Ghim lên Menu"** on each set: when on, this set surfaces as a quick-select card at the top of the menu (the YÊU THÍCH rail), so next visit it's one tap from the menu itself. Show the pin filled orange when active.
- Render 2 sets: **📋 Sáng thứ 7** (3 món · 88.000 đ) and **📋 Cả nhà** (5 món · 152.000 đ, pinned).
- **Empty state:** muted *"Chưa có bộ nào được lưu"* + hint to save one from the Yêu thích view.

---

### VIEW C — 💡 IDEA — "Tự tạo suất" (custom-combo builder)
This is the design-step highlight: let the customer **assemble their own combo**, price it live, name it, and save it (it then appears in Yêu thích/Bộ đã lưu and — if pinned — in the menu for quick select). Treat this as a proposal to react to.

- **Intro line:** muted *"Tự chọn thành phần cho suất của riêng bạn"*.
- **Component picker — grouped stepper rows.** Group headers (muted uppercase): **BÁNH CUỐN · TRỨNG · GIÒ · CANH**. Each row = dish name + unit price on the left, a `– n +` stepper on the right (default 0). Real items:
  - **BÁNH CUỐN:** Bánh Cuốn Thịt (4.000 đ) · Bánh Cuốn Mộc Nhĩ (4.000 đ) · Bánh Chay (2.500 đ).
  - **TRỨNG:** Bánh Trứng Tái (9.000 đ) · Bánh Trứng Chín (9.000 đ) · Bánh Trứng Vàng (9.000 đ).
  - **GIÒ:** Giò (9.000 đ).
  - **CANH:** Bát canh có rau (0 đ) · Bát canh không rau (0 đ).
- **Default nhân for bánh cuốn.** A header **"Nhân mặc định (bánh cuốn)"** then a pill group **"Nhân thịt" / "Nhân thịt mộc nhĩ"** that sets the filling for the bánh-cuốn components (default **Nhân thịt** selected; at least one must stay selected; both = a mixed suất). Selected pill = solid orange. Followed by a hint: *"Riêng **trứng** chọn nhân & thêm ghi chú ở từng món bên dưới."* Bánh Chay, Giò, Canh take no nhân.
- **Per-egg options (trứng only).** Each trứng row (Bánh Trứng Chín / Bánh Trứng Tái), when its qty > 0, expands an attached panel underneath the stepper with:
  - **Nhân:** a single-select pill group **"Nhân thịt" / "Nhân mộc nhĩ"** (default *Nhân thịt*).
  - **Ghi chú:** a small free-text input (placeholder *"vd: nhân để ngoài bánh, ít hành..."*) — for anything not covered by a structured option (e.g. where to put the filling). Kept as a **note the kitchen staff reads** on the order ticket; **no new DB field** required.
  Setting the stepper back to 0 collapses the panel.
- **Live summary bar (sticky at the bottom of this view, above the nav):** shows **"n món"** on the left and the running **total in orange** on the right (sum of chosen components), plus an orange **"Lưu suất này"** button. Disabled/dimmed until at least 1 component is chosen.
- **Save flow:** tapping **"Lưu suất này"** opens the **Save modal** (below) pre-filled with the built list.
- 💡 IDEA — a subtle line under the total: *"Suất tự tạo sẽ xuất hiện trong Yêu thích; bật 📌 để ghim lên Menu"*.

---

### OVERLAY — Save-as-set modal
A centered dark modal (`rounded-2xl`, slate `#161d29`), reused by both "Lưu thành set mới" (View A) and "Lưu suất này" (View C):
- Title **"💾 Lưu thành set mới"**.
- Label **"Đặt tên cho set này:"** + a text input, placeholder **"vd: Set cuối tuần..."**.
- A **"Tóm tắt:"** block listing the items being saved — **"▸ Bánh cuốn thịt × 1"**, … — and a muted **"Tổng: 35.000 đ"**.
- 💡 IDEA — a checkbox row **"📌 Ghim lên Menu để chọn nhanh"** (off by default).
- Two buttons at the bottom: outlined **"Huỷ"** on the left, solid-orange **"💾 Lưu set này"** on the right. (Keep Huỷ left / Lưu right.)

### Notes
- Everything dark-mode; only bright color is orange. Keep it calm and high-contrast.
- Make the favourite card, the segmented tabs, and the custom-combo summary bar pixel-faithful — they're the signature elements.
- Ensure the bottom content CTA never collides with the fixed bottom nav (a real bug in today's build — leave clear space).
- Use placeholder/emoji food thumbnails if no images are available.

## (end prompt)

---

### Grounding (for me, not part of the prompt)
- Behaviour source of truth: [`customer_favourites.md`](customer_favourites.md) · scenario: [`SCENARIO_FAVOURITES.md`](SCENARIO_FAVOURITES.md).
- Visual system copied from the menu prompt: [`../customer_menu/DESIGN_PROMPT.md`](../customer_menu/DESIGN_PROMPT.md).
- Zone-level doc-vs-code drift (real bugs, e.g. footer hidden behind nav): [`COMPARISON_VISUAL_MOCKUP_VI.md`](COMPARISON_VISUAL_MOCKUP_VI.md).
- Rendered mockup this prompt mirrors: [`claude_design/favourites.html`](claude_design/favourites.html) — **source of truth for visuals**.
- **What's real today vs. NEW (not built — register a MASTER_TASK row before coding):**
  - _Exists in code:_ favourites list (heart-remove + stepper), saved sets (apply/rename/delete), save-as-set modal.
  - _NEW — FE only:_ canh quick-add block + live-total row in the favourites list; dropping the two footer buttons; "Tự tạo suất" builder shell with per-egg nhân pills + a **free-text note** per trứng; 📌 "Ghim lên Menu" pinning.
  - _Dropped:_ structured egg placement (trong / ngoài bánh) — handled instead by the free-text note above so kitchen staff can read it; **no BE/DB change**.
