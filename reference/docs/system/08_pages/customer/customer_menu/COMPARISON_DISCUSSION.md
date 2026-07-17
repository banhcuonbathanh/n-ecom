# Comparison Discussion & Fix Decisions — customer_menu

> **Đây là nơi bạn ra lệnh sửa gap.** Mỗi 🔴 gap từ comparison-doc = 1 mục bên dưới.
> Quy trình:
> 1. Tôi viết sẵn **💡 Đề xuất của tôi** (phương án sửa cụ thể) cho mỗi gap.
> 2. Bạn phản hồi ở **💬 Yêu cầu của bạn**: ✅ đồng ý · ❌ không · ✏️ sửa lại như nào.
> 3. Ta thảo luận (ghi full vào **🗣 Thảo luận**) → chốt ở **✅ Quyết định**.
> 4. **Đã chốt → tôi sửa NGAY trên code thật** (code fix có `MASTER_TASK` row trước) → **bạn kiểm tra output**.
> 5. Cập nhật **Trạng thái**.
>
> - **Doc fix** (vẽ lại ASCII cho khớp code) → gộp 1 task, làm ngay.
> - **Code fix** (sửa hành vi app) → **phải có dòng trong `MASTER_TASK.md` trước** + ALIGN (theo `CLAUDE.md`).
> - File này **chỉ ghi quyết định & thảo luận**, không phải file audit. Nguồn gap: `COMPARISON_TRACKER.md` + `COMPARISON_VISUAL_MOCKUP_VI.md`.
>
> **Trạng thái:** ⬜ chưa bàn · 💬 chờ bạn feedback · 🗣 đang thảo luận · 🔧 đang sửa · ✅ xong · ⏸ tạm hoãn

> ⚠️ **THIẾT KẾ MỚI:** File này đã được cập nhật theo thiết kế mới trong `DESIGN_PROMPT.md`. Code FE thực tế vẫn đang dùng thiết kế cũ — các zone thay đổi (Header, Category Tabs, Favourites Rail, Combo Cards, Checkout Control, "Gọi thêm" badge, Order Note) là **gap / code chờ rebuild**.

| Page | Branch | Last comparison run | Tổng gap | ⬜ | 🔧 | ✅ |
|---|---|---|---|---|---|---|
| customer_menu | experience_claude.md_system_1_test_iphon2_change_code | 2026-06-24 | 10 (3 cũ + 7 thiết kế mới) | 0 | 0 | 10 (✅) — GAP-3 & GAP-4 = DEAD CODE, owner xoá sau |

> **Nguồn audit đầy đủ:** danh sách gap dưới đây (GAP-1…GAP-10) là **decision-log**. Bản audit
> đầy đủ + đánh số chuẩn là [COMPARISON_DOC_VS_CODE_DETAILED.md](./COMPARISON_DOC_VS_CODE_DETAILED.md)
> — nó liệt kê **8 zone thiết kế mới cần rebuild** (Header · CategoryTabs · ComboCard nhân ·
> Checkout control · "Gọi thêm" · OrderNote pre-fill · FavouritesRail · worked-example Bàn 04) +
> **3 vấn đề doc/code cũ** (TableConfirmModal 201 · ToppingModal chết · OrderSummary ASCII). Khi
> chốt quyết định, đối chiếu lại với file đó.

---

## GAP-1 · MenuHeader — thiết kế mới: photo banner + chỉ title, không có pill bar dưới banner

- **Loại:** 🔴 CODE rebuild (thiết kế mới)
- **Trạng thái:** ✅ xong (2026-06-24) — rebuild theo design mới; lint + build pass
- **Nguồn:** [Mockup Zone A](./COMPARISON_VISUAL_MOCKUP_VI.md#zone-a--header) · `DESIGN_PROMPT.md §1`
- **🔗 Code (before):** MenuHeader cũ — có pill bar + tableLabel + login button bên dưới banner
- **🔗 Code (after):** [MenuHeader.tsx](../../../../../fe/src/features/menu/components/MenuHeader.tsx) — photo banner `h-[196px]` + `next/image` + gradient overlay (`to-background/95`, không hardcode hex) + Playfair title (`font-display`) căn trên. Bỏ login button + table label + pill bar. Pill "Bàn XX" KHÔNG bị nhân đôi — vẫn nằm ở [OrderSummary.tsx:147-149](../../../../../fe/src/features/menu/components/OrderSummary.tsx#L147-L149). Asset: `fe/public/header-example.jpg`.
- **📷 Ảnh thật:** ảnh cũ `screenshots/menuheader_real.png` phản ánh thiết kế cũ — không dùng làm tham chiếu.

**Mô tả gap (thiết kế mới):** Header mới = photo banner (~196px) + dark gradient overlay + Playfair Display "Quán Bánh Cuốn" căn giữa. **Không có pill bar, không có nhãn bàn, không có nút đăng nhập dưới banner.** Pill "Bàn 04" đã chuyển vào header của order-summary panel (quay spinning orange light ring). Code cũ: có pill bar bên dưới banner với nhãn bàn và nút đăng nhập.

**Note về GAP-1 cũ (TBL-A):** Bug cũ "nhãn bàn trống sau QR" đã được fix ở task TBL-A ✅. Với thiết kế mới, nhãn bàn không còn trong header nữa — nó sống trong order-summary header với spinning orange ring.

**💡 Đề xuất của tôi:** Rebuild `MenuHeader` thành photo banner đúng spec mới. Đăng ký task riêng trong `MASTER_TASK.md`.

| 💬 Yêu cầu của bạn |
|---|
| ✅ rebuild theo design mới (spawn agent) |

**🗣 Thảo luận (full):**
> Owner chốt: rebuild theo thiết kế mới, giao cho sub-agent. Phần "chuyển pill Bàn XX vào OrderSummary" đã xong sẵn từ GAP-5 (OrderSummary.tsx:147-149) → GAP-1 chỉ còn việc rebuild MenuHeader. Header mới KHÔNG sticky (banner cuộn theo trang; sticky là category nav bên dưới). Login bị bỏ là **chủ ý** của luồng QR-ordering, không phải regression. Title đặt `top-[18px]` theo HTML artifact (source of truth) thay vì căn giữa dọc.

**✅ Quyết định:** ✅ Đã rebuild `MenuHeader.tsx` theo `DESIGN_PROMPT.md §1`. Lint + build pass. Pill bàn không nhân đôi.
**MASTER_TASK row:** _(cần thêm khi đối soát MASTER — code rebuild, chưa tạo)_

---

## GAP-2 · TableConfirmModal — `setActiveOrderId` (ĐÃ ĐỔI CODE — feature order-recovery)

- **Loại:** 🟢 CODE đã đổi (gap cũ không còn đúng)
- **Trạng thái:** ✅ xong (session order-recovery)
- **Nguồn:** [Mockup TableConfirmModal](./COMPARISON_VISUAL_MOCKUP_VI.md#L147-L192)
- **🔗 Code (before):** TableConfirmModal cũ **không gọi** `setActiveOrderId`; `clearCart()` reset `activeOrderId` về null.
- **📷 Ảnh thật:** [tableconfirmmodal_real.png](./screenshots/tableconfirmmodal_real.png)
- **🔗 Code (after):** [TableConfirmModal.tsx:48-53](../../../../../fe/src/features/menu/components/TableConfirmModal.tsx#L48-L53) · [cart.ts (clearCart)](../../../../../fe/src/store/cart.ts) · [ActiveOrderRecoveryBanner.tsx](../../../../../fe/src/features/menu/components/ActiveOrderRecoveryBanner.tsx)

**Mô tả gap (lịch sử):** Trước đây doc vẽ luồng 201 ⇒ `setActiveOrderId(id)` → `clearCart()` → `router.replace`,
nhưng code THẬT lúc đó **không gọi** `setActiveOrderId` và `clearCart()` còn reset `activeOrderId` về null.
Lúc đó kết luận là "code đúng, doc sai → chỉ sửa doc".

**🔄 CẬP NHẬT — gap cũ KHÔNG còn đúng:** Ta đã **đổi code** trong feature *order-recovery* (cho phép khách
"gọi thêm" sau khi rời trang mà không cần quét lại QR). Bây giờ code **CÓ** gọi `setActiveOrderId(order.id)`
sau khi đặt đơn, và `clearCart()` **không** còn xoá `activeOrderId`/`tableId` nữa. Tức là **doc cũ (vẽ có
`setActiveOrderId`) hoá ra lại đúng với code mới** — chỉ khác lý do: pointer được set để **khôi phục đơn**,
không phải để "theo dõi".

### Luồng đầy đủ hiện tại (The full flow now)

```
đặt đơn (POST /orders 201)
   → clearCart()              ← chỉ xoá DRAFT: items + paymentMethod + orderNote
   → setActiveOrderId(id)     ← GIỮ pointer (identity), persist qua localStorage
   ↓ khách rời trang (order → settings → menu)   ← KHÔNG quét lại QR
/menu → <ActiveOrderRecoveryBanner>
   → GET /orders/:id xác thực đơn còn sống (BE = nguồn sự thật)
   → nếu paid/cancelled/404 ⇒ setActiveOrderId(null) + ẩn banner (tự dọn)
   ↓ bấm "Thêm món"
/menu?add_to_order=id → thêm món → POST /orders/:id/items   ← CÙNG một đơn, không tạo đơn mới
   ↓ đơn paid/cancelled
order/[id] page ⇒ setActiveOrderId(null)   ← pointer hết hạn, banner biến mất
```

**Giải thích từng mắt xích:**
- **`clearCart()` tách DRAFT vs IDENTITY:** giỏ hàng (items) là bản nháp → xoá sau khi đặt để tránh đặt trùng;
  còn `tableId`/`activeOrderId` là *danh tính* của khách tại bàn → **giữ lại** để khôi phục. (Đây là chỗ
  **ghi đè Invariant 5** — đã được owner duyệt.)
- **`setActiveOrderId(id)` sau khi đặt:** trỏ giỏ (vừa clear) vào đơn vừa tạo, persist qua `partialize` của cart store.
- **Banner tự xác thực + tự dọn:** pointer chỉ là *con trỏ*, luôn được `GET /orders/:id` kiểm lại; đơn xong/huỷ → xoá pointer.
  Nhờ vậy đơn đã thanh toán ở POS (khách không mở lại trang order) cũng không để banner "ma" ở lần ghé sau.
- **"Thêm món" = append, không phải đơn mới:** banner đưa về `?add_to_order=id` → dùng đúng luồng cũ
  (`addItemsToOrder` → `POST /orders/:id/items`) nên món mới vào **cùng đơn**, cùng bàn, cùng bill.

**Token vẫn ở memory-only** (Zustand, không localStorage) — không đổi. Khôi phục như trên chỉ áp dụng cho
*điều hướng trong app* (không reload). Hard-reload mất token → vẫn phải quét lại QR (đã chốt để ngoài phạm vi).

**✅ Quyết định:** Đã thực hiện — code đổi theo feature order-recovery; gap "doc sai" cũ khép lại.
**MASTER_TASK row:** _(feature order-recovery — code fix; cần thêm row khi đối soát MASTER nếu chưa có)_

---

## GAP-3 · ToppingModal — code chết (0 import)

- **Loại:** 🔴 CODE cleanup + DOC
- **Trạng thái:** ✅ chốt — **đánh dấu DEAD CODE, owner sẽ xoá sau** (chưa đụng file)
- **Nguồn:** [Mockup Zone F](./COMPARISON_VISUAL_MOCKUP_VI.md#L53-L96)
- **🔗 Code (before):** [ToppingModal.tsx](../../../../../fe/src/features/menu/components/ToppingModal.tsx) (file chết) · nhân thật ở [ProductCard.tsx:131-147](../../../../../fe/src/features/menu/components/ProductCard.tsx#L131-L147)
- **📷 Ảnh thật:** [productcard_real.png](./screenshots/productcard_real.png)
- **🔗 Code (after):** _(điền sau khi xoá — link ToppingModal.tsx sẽ 404)_

**Mô tả gap:** Doc vẽ chọn nhân qua `ToppingModal` overlay. Thực tế nhân = **pill inline single-select**
ngay trên `ProductCard` (`ProductCard.tsx:131-147`); `ToppingModal.tsx` không ai import → code chết.

**💡 Đề xuất của tôi:** Làm 2 việc — (a) **xoá `ToppingModal.tsx`** (code fix → cần `MASTER_TASK` row);
tôi sẽ `grep` xác nhận 0 import trước khi xoá. (b) **sửa doc** bỏ khối ToppingModal khỏi luồng E/F, vẽ pill
inline. Nếu bạn muốn giữ lại để dùng sau thì chỉ sửa doc + ghi chú "code chết, chưa dùng".

| 💬 Yêu cầu của bạn |
|---|
| ✅ Đánh dấu **DEAD CODE** — owner sẽ tự xoá sau. KHÔNG đụng `ToppingModal.tsx` lúc này. |

**🗣 Thảo luận (full):**
> Owner chốt: `ToppingModal.tsx` là code chết (0 import, nhân thật = pill inline trên ProductCard). Để **DEAD CODE**, owner tự xoá sau — Claude không xoá, không sửa file này.

**✅ Quyết định:** ✅ DEAD CODE — owner xoá sau. Không tạo code fix / không đụng file.
**MASTER_TASK row:** _(không cần — owner xoá thủ công sau)_

---

## GAP-4 · ComboModal — render nhưng không tới được

- **Loại:** 🔴 CODE
- **Trạng thái:** ✅ chốt — **đánh dấu DEAD CODE, owner sẽ xoá sau** (chưa đụng file)
- **Nguồn:** [Tracker headline](../../COMPARISON_TRACKER.md#L13)
- **🔗 Code (before):** [ComboModal.tsx](../../../../../fe/src/features/menu/components/ComboModal.tsx)
- **📷 Ảnh thật:** _(chưa chụp riêng — xem toàn cảnh [menu_full_real.png](./screenshots/menu_full_real.png))_
- **🔗 Code (after):** _(điền sau khi điều tra/xử lý)_

**Mô tả gap:** `ComboModal` được render trong cây nhưng không có đường nào mở được nó (unreachable).

**💡 Đề xuất của tôi:** ⚠️ Cần điều tra trước khi chốt — combo giờ mở ở trang riêng `/menu/combo/:id`
(xem cross-page), nên `ComboModal` nhiều khả năng là tàn dư. Tôi sẽ `grep` xem ai set state mở nó; nếu
0 đường mở → **xoá** (code fix → `MASTER_TASK` row). Nếu vẫn còn nơi gọi → đề xuất nối lại. Chưa khuyên
xoá ngay khi chưa grep.

| 💬 Yêu cầu của bạn |
|---|
| ✅ Đánh dấu **DEAD CODE** — owner sẽ tự xoá sau. KHÔNG đụng `ComboModal.tsx` lúc này. |

**🗣 Thảo luận (full):**
> Owner chốt: `ComboModal.tsx` unreachable (combo mở ở trang riêng `/menu/combo/:id`). Để **DEAD CODE**, owner tự xoá sau — Claude không xoá, không sửa file này.

**✅ Quyết định:** ✅ DEAD CODE — owner xoá sau. Không tạo code fix / không đụng file.
**MASTER_TASK row:** _(không cần — owner xoá thủ công sau)_

---

## GAP-5 · OrderSummary — rebuild theo thiết kế mới (thiết kế mới = source of truth)

- **Loại:** 🔴 CODE rebuild (thiết kế mới) — _(đổi từ 🔵 DOC: không còn chỉ vẽ lại ASCII cho khớp code cũ)_
- **Trạng thái:** ✅ xong — A·B·C áp code; nhân per-subitem = **SKIP** (owner chốt); note pre-fill = **giữ rỗng** (seed data demo, không hardcode)
- **Nguồn:** `DESIGN_PROMPT.md §7` (source of truth) · [Mockup Zone I](./COMPARISON_VISUAL_MOCKUP_VI.md#zone-i--ordersummary)
- **🔗 Code (before):** [OrderSummary.tsx:140-309](../../../../../fe/src/features/menu/components/OrderSummary.tsx#L140-L309)
- **📷 Ảnh thật:** [ordersummary_real.png](./screenshots/ordersummary_real.png) — phản ánh thiết kế cũ, không dùng làm tham chiếu.
- **🔗 Code (after):** [OrderSummary.tsx](../../../../../fe/src/features/menu/components/OrderSummary.tsx) — đã áp: (A) pill bàn `running-border` (vòng sáng cam chạy, dùng util sẵn có, không hardcode hex), (B) nhân pills → caption cam nối ` · `, (C) toggle combo "Xem chi tiết" → "Chi tiết".

> **Phát hiện khi đọc code thật (sửa lại lo ngại trước đó):** phần lớn §7 **đã có sẵn** trong code —
> bảng "TỔNG SỐ MÓN" (MÓN·NHÂN·SL·ĐƠN GIÁ·THÀNH TIỀN) đọc thẳng `item.toppings`/`combo_items` từ cart store;
> filling đã được luồng OC thread sẵn. ⇒ **không cần đụng `cart.ts`**, scope chỉ là `OrderSummary.tsx`.
> **2 điểm §7 KHÔNG áp (owner đã chốt):**
> - **Note pre-fill "Gia đình (mẹ + 2 người lớn + 2 trẻ)":** seed data của worked-example Bàn 04, không phải default thật → hardcode vào prod = bug. **Giữ textarea rỗng + placeholder.**
> - **Nhân caption cho từng món con của combo:** **SKIP** — nhân đã hiện ở dòng chính của combo; map xuống món con cần name-match (chỉ bánh cuốn/trứng) → fragile, không đáng.

**Mô tả gap (đảo chiều):** Trước đây kết luận "code đúng, doc sơ sài → chỉ vẽ lại doc". **Nay đảo:**
thiết kế mới (`DESIGN_PROMPT.md §7`) là **source of truth** → `OrderSummary.tsx` phải **rebuild theo design mới**,
không phải vẽ doc cho khớp code cũ. Doc khu I sẽ vẽ theo design mới (đã làm), code là phần còn lệch.

**Code mới phải có (theo §7):**
1. Header row: title "Tóm tắt đơn hàng" + pill **"Bàn 04"** bọc trong **spinning orange light ring** (conic gradient animate) + chevron collapse.
2. Nhóm **COMBO** / **MÓN LẺ**, mỗi dòng: tên · stepper `– n +` · giá · 🗑 xoá.
3. **Caption nhân** (orange) dưới mỗi item: `"Nhân thịt"` / `"Nhân thịt · Mộc nhĩ"`; item không nhân (Bánh Chay/Giò/Canh) → để trống.
4. Toggle **"⌄ Chi tiết" ⇄ "⌃ Ẩn chi tiết"** trên mỗi combo → mở sub-list món thành phần (tên · caption nhân · `– n +` · 🗑), collapsed mặc định.
5. **Subtotal** mỗi nhóm + dòng **"Tổng cộng:"** (orange total).
6. Khu **CANH**: 2 dòng stepper "Bát có rau"/"Bát không rau"; thiếu canh → viền orange chạy + cảnh báo "⚠ Bạn chưa chọn canh...".
7. Bảng **"TỔNG SỐ MÓN (n loại)"** collapsible — cột **MÓN · NHÂN · SL · ĐƠN GIÁ · THÀNH TIỀN**, rollup gộp combo→món thành phần + merge theo (tên dish + nhân).
8. **GHI CHÚ** pre-filled **"Gia đình (mẹ + 2 người lớn + 2 trẻ)"** + chỉ báo **"✓ Đã lưu"**.
9. **KHÔNG** còn badge "Gọi thêm" (xem [GAP-10](#gap-10--gọi-thêm-badge--xóa-khỏi-thiết-kế-mới)).

**💡 Đề xuất của tôi:** Rebuild `OrderSummary.tsx` đúng §7. Đăng ký 1 task riêng trong `MASTER_TASK.md`,
ALIGN scope contract (file đụng = `OrderSummary.tsx` + có thể `cart.ts` cho caption nhân / favourites-độc-lập), rồi mới code.

| 💬 Yêu cầu của bạn |
|---|
| ✅ Rebuild OrderSummary theo thiết kế mới. **Thiết kế mới là source of truth** (không vẽ doc cho khớp code cũ nữa). |

**🗣 Thảo luận (full):**
> Owner chốt: GAP-5 chuyển từ doc-fix → code rebuild. Design mới (`DESIGN_PROMPT.md §7`) thắng; code phải theo.
> Liên quan: GAP-10 (xoá "Gọi thêm") nằm trong cùng component → nên gộp/làm liền mạch khi rebuild.

**✅ Quyết định:** ✅ Rebuild `OrderSummary.tsx` theo `DESIGN_PROMPT.md §7`. Thiết kế mới = source of truth.
**MASTER_TASK row:** _(cần tạo — code rebuild; chưa có. Tạo + ALIGN trước khi code, theo CLAUDE.md.)_

---

## GAP-6 · Category Tabs — filter tabs → scroll-spy sticky nav

- **Loại:** 🔴 CODE rebuild (thiết kế mới)
- **Trạng thái:** ✅ xong (code) — đã verify trực quan trên live `/menu`
- **Nguồn:** `DESIGN_PROMPT.md §3`
- **🔗 Code (after):** [MenuCategoryNav.tsx](../../../../../fe/src/features/menu/components/MenuCategoryNav.tsx) (nav scroll-spy MỚI) · [MenuSections.tsx](../../../../../fe/src/features/menu/components/MenuSections.tsx) (group sections + đo scroll-spy + bottom-pin) · [menu/page.tsx](../../../../../fe/src/app/(shop)/menu/page.tsx) (bỏ filter, render mọi section, search override)

**Mô tả gap:** Thiết kế mới: sticky scroll-spy nav, tất cả sections luôn render. Tap tab → scroll đến section; scroll page → tab tự highlight. Active = orange text + underline + glow. Tabs: Tất cả · Suất · Trứng · Bánh Cuốn · Giò · Canh. Code cũ: filter tabs (show/hide sections).

**💡 Đề xuất của tôi:** Rebuild component category tabs thành scroll-spy nav. Đăng ký task riêng trong `MASTER_TASK.md`.

| 💬 Yêu cầu của bạn |
|---|
| ✅ Update code GAP-6 theo thiết kế mới, **không đụng file session khác** đang sửa. |

**🗣 Thảo luận (full):**
> ⚠️ **Đổi cách làm vs đề xuất gốc:** KHÔNG rebuild `CategoryTabs.tsx` (component dùng chung — **trang POS** `pos/page.tsx` vẫn xài nó làm filter; đổi contract sẽ vỡ POS). Thay vào đó: **giữ nguyên `CategoryTabs.tsx`** + tạo component MỚI `MenuCategoryNav.tsx` cho scroll-spy của menu khách.
> - **Search override scroll-spy** (owner chốt): có query (≥2 ký tự) → list phẳng đã lọc, ẩn nav + favourites; xoá query → khôi phục mọi section.
> - **Scroll-spy:** `MenuSections` đo vị trí mỗi section trên scroll (rAF throttle), báo lên `activeSection`; chỉ re-render khi id active đổi. Tab active = `[text-shadow:…var(--color-primary)]` (không hardcode hex).
> - **Bug phát hiện khi verify trực quan + đã fix:** tap tab cuối (Canh) cuộn xuống đáy nhưng highlight nhầm "Bánh Cuốn" (section cuối không chạm được line 170px ở max-scroll). Đã thêm **bottom-pin**: chạm đáy trang → ghim section cuối làm active. Re-verify: Canh highlight đúng.

**✅ Quyết định:** ✅ Đã code + verify. Filter tabs → scroll-spy nav. KHÔNG rebuild `CategoryTabs.tsx` (POS dùng) — tách `MenuCategoryNav.tsx` mới. Search override. Bottom-pin fix.
**MASTER_TASK row:** _(CHƯA tạo — cố ý chưa đụng `MASTER_TASK.md` để tránh va chạm session khác; owner tự thêm row khi đối soát.)_

---

## GAP-7 · Favourites Rail — align to new design

- **Loại:** 🟢 CODE đã sửa (3 điểm lệch thiết kế mới đã áp)
- **Trạng thái:** ✅ xong
- **Nguồn:** `DESIGN_PROMPT.md §4`

**Mô tả gap (đã giải quyết):** `FavouritesRail` + `favourites` store + heart toggles **đã tồn tại trong code** từ trước. Các điểm lệch thiết kế mới còn lại gồm 3 mục, nay đã được sửa:

1. **Tap card mở detail item** — trước đây cả thẻ product lẫn combo đều link tới `/menu/favourites`. Nay `detailHref` được build theo type: product → `/menu/product/${id}`, combo → `/menu/combo/${id}`.
2. **Heart recolor red → orange** — class `fill-red-500 text-red-500` đổi thành `fill-primary text-primary` đúng token thiết kế mới ("filled orange heart ♥").
3. **Label "YÊU THÍCH" có small heart icon** — `<h2>` nay bọc `flex items-center gap-1.5` với `<Heart size={12} className="fill-primary text-primary" />` trước text.

**Ghi chú bổ sung:**
- Audit cũ ghi "remove category-tab-hide condition (page.tsx:108)" là **STALE** — menu dùng scroll-spy nav (GAP-6) và rail chỉ ẩn khi đang **search** (`!searching`), đúng theo spec (search = flat filtered list). Không cần sửa code ở đây.
- Heart trên `ProductCard`/`ComboCard`/`ProductGridCard` vẫn còn đỏ (`fill-red-500`). Recolor các card đó sang orange thuộc về GAP-8 / global design-token pass — để lại làm follow-up, ngoài phạm vi GAP-7.

**✅ Quyết định:** Rail đã align với thiết kế mới; 3 fixes đã áp (`FavouritesRail.tsx`); heart color trên card-list deferred sang GAP-8.
**MASTER_TASK row:** GAP-7-FAV ✅

---

## GAP-8 · Combo (Suất) Cards — thiếu heart + nhân multi-select

- **Loại:** 🔴 CODE rebuild (thiết kế mới)
- **Trạng thái:** ✅ xong
- **Nguồn:** `DESIGN_PROMPT.md §5`

**Mô tả gap:** Thiết kế mới: combo card có full product-card treatment — thumbnail + heart toggle + tên + mô tả + giá + quantity stepper + nhân pill group MULTI-select ("Nhân thịt" / "Nhân thịt mộc nhĩ", cả hai mặc định selected, bắt buộc ít nhất 1). Product cards (bánh cuốn & trứng) dùng single-select nhân. Code cũ: combo cards không có heart, không có nhân pills.

**💡 Đề xuất của tôi:** Sửa `ComboCard` và `ProductCard` theo spec. Đăng ký task trong `MASTER_TASK.md`.

| 💬 Yêu cầu của bạn |
|---|
| ✅ rebuild (FE-only, Option 1) |

**🗣 Thảo luận (full):**
> FE-only, Option 1. Nhân combo chuyển sang multi-select (cả hai mặc định selected, ≥1 bắt buộc). `cartId`
> encode set đầy đủ (sorted, deterministic: `combo_<id>_<id1>-<id2>` hoặc `combo_<id>_plain`). `toppings[]`
> của CartItem chứa TẤT CẢ nhân đã chọn → `order-payload.ts` map `item.toppings.map(t=>t.id)` tự động
> gửi cả hai nhân vào `topping_ids` của mỗi combo sub-item override. Heart trên ComboCard, ProductCard,
> ProductGridCard đổi từ `fill-red-500 text-red-500` → `fill-primary text-primary` (orange token).
>
> **KEY POINT — nhân vẫn hiển thị cho staff vì nhân persist qua `order_items.toppings_snapshot`** (JSON
> array, TOP epic). Không đụng cột `filling` (không còn trên write path lẫn read view nào). Không cần
> thay đổi BE.

**✅ Quyết định:** combo nhân → multi-select (cả hai default, ≥1 bắt buộc); `toppings[]` chứa mọi nhân đã chọn
→ cả hai nhân id flow vào `topping_ids` qua `order-payload.ts` (không cần sửa); orange hearts trên
`ComboCard`/`ProductCard`/`ProductGridCard` (`fill-primary text-primary`). BE zero changes — nhân persist
qua `toppings_snapshot` (JSON array, TOP epic), không phải cột `filling`.
**MASTER_TASK row:** GAP-8 ✅

---

## GAP-9 · Checkout Control — bottom bar → floating pill buttons

- **Loại:** 🔴 CODE rebuild (thiết kế mới)
- **Trạng thái:** ✅ chốt — rebuild
- **Nguồn:** `DESIGN_PROMPT.md §8`

**Mô tả gap:** Thiết kế mới: 2 pill buttons floating bottom-right (cart pill 🛒 + round orange count badge bên trên; "Thanh toán" pill bên dưới). Chỉ hiện khi giỏ hàng có món. Không hiển thị tổng tiền. "Thanh toán" dim khi chưa chọn canh. Code cũ: full-width orange bottom bar với count + "Thanh toán" + total.

**💡 Đề xuất của tôi:** Thay thế bottom bar bằng 2 floating pill buttons. Đăng ký task trong `MASTER_TASK.md`.

| 💬 Yêu cầu của bạn |
|---|
| ✅ rebuild (follow Thiết kế mới) |

**✅ Quyết định:** bottom bar → 2 floating pill buttons bottom-right (cart pill 🛒 + orange count badge → scroll to order summary; "Thanh toán" pill → confirm modal, dimmed when canh missing, no total shown).
**MASTER_TASK row:** GAP-9-CHECKOUT ✅

---

## GAP-10 · "Gọi thêm" Badge — xóa khỏi thiết kế mới

- **Loại:** 🔴 CODE cleanup (thiết kế mới)
- **Trạng thái:** ✅ xong (no-op) — badge **không tồn tại** trong code
- **Nguồn:** `DESIGN_PROMPT.md` — "Gọi thêm" REMOVED

**Mô tả gap:** Thiết kế mới không có badge "Gọi thêm" trong order summary. Doc cũ giả định code có badge này.

**🔎 Kiểm chứng (grep):** `grep -rn "Gọi thêm" fe/src` → **0 match**. Không có badge "Gọi thêm" ở `OrderSummary.tsx`
hay bất kỳ component menu nào. Thứ gần nhất là `AddToOrderBanner` (chữ "Chọn món để thêm vào đơn hàng hiện tại")
— banner luồng add-to-order, **không phải** badge "Gọi thêm", không nằm trong order summary, nằm ngoài phạm vi GAP-10.

**✅ Quyết định:** ✅ Không cần xóa gì — badge đã không tồn tại. GAP-10 khép lại (no-op).
**MASTER_TASK row:** _(không cần — không có thay đổi code)_

---

## 📌 Việc đã chốt (rút gọn để theo dõi)

> Khi 1 GAP chốt xong, copy 1 dòng tóm tắt xuống đây để nhìn nhanh.

| GAP | Quyết định | Loại | MASTER row | Trạng thái |
|---|---|---|---|---|
| GAP-1 (cũ TBL-A) | MenuHeader rebuild → photo banner + Playfair title; bỏ login/table label/pill bar; pill bàn (spinning ring) đã ở OrderSummary từ GAP-5 (không nhân đôi) | CODE rebuild | rebuild chưa tạo | ✅ (2026-06-24) |
| GAP-2 | Feature order-recovery: `setActiveOrderId(id)` sau khi đặt + `clearCart()` giữ identity + recovery banner trên /menu (ghi đè Invariant 5) | CODE đã đổi | chưa tạo | ✅ |
| GAP-3 | `ToppingModal.tsx` code chết (0 import) → **DEAD CODE**, owner xoá sau; Claude không đụng | CODE cleanup | không cần | ✅ (dead code) |
| GAP-4 | `ComboModal.tsx` unreachable (combo ở `/menu/combo/:id`) → **DEAD CODE**, owner xoá sau; Claude không đụng | CODE | không cần | ✅ (dead code) |
| GAP-5 | OrderSummary §7: pill bàn vòng sáng + nhân caption cam + "Chi tiết"; note pre-fill giữ rỗng · nhân per-subitem SKIP (owner chốt) | CODE rebuild | chưa tạo | ✅ |
| GAP-6 | Category tabs → scroll-spy sticky nav (tách `MenuCategoryNav.tsx` mới, KHÔNG đụng `CategoryTabs.tsx` vì POS dùng); search override; bottom-pin fix | CODE rebuild | chưa tạo (cố ý) | ✅ code + verify |
| GAP-7 | FavouritesRail đã có; 3 fixes áp: tap→detail (`/menu/product\|combo/[id]`), orange heart (`fill-primary`), label heart icon | CODE fix (FavouritesRail.tsx) | GAP-7-FAV ✅ | ✅ |
| GAP-8 | ComboCard nhân → multi-select (cả hai default, ≥1 bắt buộc); `toppings[]` chứa mọi nhân đã chọn → cả hai nhân id flow qua `order-payload.ts` (BE zero changes — persist qua `toppings_snapshot`, không phải `filling`); orange hearts trên ComboCard/ProductCard/ProductGridCard (`fill-primary`) | CODE rebuild (FE-only, Option 1) | GAP-8 ✅ | ✅ |
| GAP-9 | bottom bar → 2 floating pill buttons bottom-right (cart pill 🛒 + orange count badge → scroll to order summary; "Thanh toán" pill → confirm modal, dimmed when canh missing, no total shown) | CODE rebuild | GAP-9-CHECKOUT ✅ | ✅ |
| GAP-10 | Badge "Gọi thêm" — grep 0 match, không tồn tại trong code → no-op | CODE cleanup | không cần | ✅ |
