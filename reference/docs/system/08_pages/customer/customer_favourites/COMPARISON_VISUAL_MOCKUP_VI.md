# So Sánh Hình Ảnh Theo Zone — Favourites Suite (`/menu/favourites` · `/save` · `/sets`)

> **Trạng thái ảnh chụp:** ⏳ CHƯA CHỤP — stack đang tắt. Phần ②/③ ASCII bên dưới được dựng trực tiếp
> từ code (`file:line`), không phải từ tài liệu. Để chụp thật cần `docker compose up -d --build fe` +
> Playwright (viewport iPhone 390×844, mẫu theo `e2e/tests/capture-menu-zones.spec.ts`).
> **Read-only** — không sửa code, không sửa doc-set; chỉ phơi bày drift.
> Code wins — branch `experience_claude.md_system_1_test_iphon2_change_code` · ngày 2026-06-21.
> Cột 💬 luôn để trống — đó là chỗ bạn (chủ) tự điền; mình phản hồi ở lần chạy sau.

---

## 🔴 Zone 1 — FavouriteItemCard (nút `[+ Giỏ]` ma + va chạm footer)
Nguồn code: `FavouriteItemCard.tsx:8-89` · `FavouritesFooter.tsx:12-30` · `ClientBottomNav.tsx:48`

### ① Doc đang vẽ (`customer_favourites.md:13-29`)

```
/menu/favourites
┌──────────────────────────┐
│ [←] Yêu Thích   [Lưu bộ] │ ←TopNav (góc phải = nút "Lưu bộ")
├──────────────────────────┤
│ [Tất cả][Món][Combo]     │ ←Filter Tabs (không có số đếm)
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ ♥ Bánh cuốn thịt     │ │ ←Item Card
│ │   35.000đ  [+ Giỏ]   │ │     ↑ nút "[+ Giỏ]" thêm MỘT món vào giỏ
│ └──────────────────────┘ │
├──────────────────────────┤
│ FavouritesFooter         │
│ [Thêm tất cả vào giỏ]    │ ←footer là thanh đáy SẠCH, 1 nút
└──────────────────────────┘
  (ClientBottomNav "bỏ qua cho gọn" — customer_favourites.md:32-34)
```

### ② Code render THẬT

```
/menu/favourites
┌──────────────────────────┐
│ [←]  ❤ Yêu thích    🛒②  │ ◀── góc phải = ICON GIỎ (showCart), KHÔNG có "Lưu bộ"
│                          │     (FavouritesTopNav.tsx:26-37, page.tsx:126)
├──────────────────────────┤
│ [Tất cả(3)][Món lẻ(2)]   │ ◀── nhãn "Món lẻ" + số đếm (N)
│ [Combo(1)]               │     (FavouriteFilterTabs.tsx:18,37)
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ [Món lẻ] Bánh cuốn ♥ │ │ ◀── badge loại + tim ĐỎ ĐẦY (= nút XOÁ, onRemove)
│ │ 35.000đ/phần         │ │     KHÔNG có "[+ Giỏ]" (FavouriteItemCard.tsx:8-12,46-52)
│ │              [- 1 +]  │ │ ◀── chỉ có QuantityStepper (FavouriteItemCard.tsx:82-88)
│ └──────────────────────┘ │
├──────────────────────────┤
│ 📋 Xem các set đã lưu(N)→│ ◀── footer THẬT có 3 nút (FavouritesFooter.tsx:13-30)
│ 💾 Lưu thành set mới...   │
│ ╔══════════════════════╗ │
│ ║🛒 Thêm tất cả vào giỏ ║ │ ◀── CTA chính nằm ở ĐÁY footer…
├──┤▓▓▓▓ ClientBottomNav ▓├─┤ ◀── …bị nav che (cả 2 đều fixed bottom-0 z-20;
│ [Menu][Đơn][❤][Theo][⚙] │     nav vẽ SAU → đè lên — ClientBottomNav.tsx:48)
└──────────────────────────┘
```

### ③ Đề xuất sửa doc

```
/menu/favourites
┌──────────────────────────┐
│ [←]  ❤ Yêu thích    🛒②  │  TopNav: cart badge (không phải [Lưu bộ])
├──────────────────────────┤
│ [Tất cả(3)][Món lẻ(2)]   │  Tabs: nhãn "Món lẻ" + đếm (N)
│ [Combo(1)]               │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ [Món lẻ] Bánh cuốn ♥ │ │  ♥ đỏ = XOÁ; KHÔNG vẽ [+ Giỏ]
│ │ 35.000đ/phần  [- 1 +] │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ 📋 Xem set(N) 💾 Lưu set  │  footer 3 nút
│ 🛒 Thêm tất cả vào giỏ    │
├──────────────────────────┤
│ [Menu][Đơn][❤][Theo][⚙] │  VẼ luôn ClientBottomNav (đừng bỏ qua)
└──────────────────────────┘
```
> 🔴 **FLAG code bug:** `FavouritesFooter` (`fixed bottom-0 z-20`, `FavouritesFooter.tsx:12`) và
> `ClientBottomNav` (`fixed bottom-0 z-20`, `ClientBottomNav.tsx:48`) cùng đáy, cùng z-index → nav
> (sibling sau trong `(shop)/layout.tsx:10-13`) đè lên đáy footer, che nút CTA "🛒 Thêm tất cả vào
> giỏ hàng". Cần offset footer lên trên nav 72px hoặc nâng z-index. **Đăng ký MASTER trước khi sửa.**
> 🔴 **FLAG doc bug:** nút `[+ Giỏ]` mỗi card (và tương tác `customer_favourites.md:53`) KHÔNG tồn tại
> trong code — chỉ có thêm hàng loạt qua footer (`page.tsx:97-122`).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![FavouriteItemCard + footer thật](./screenshots/list_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** card không có nút [+ Giỏ]; CTA "Thêm tất cả" bị ClientBottomNav che ở đáy |  |

---

## 🔴 Zone 2 — Save page (`/menu/favourites/save`) footer bị nav che
Nguồn code: `save/page.tsx:78-122` · `ClientBottomNav.tsx:48`

### ① Doc đang vẽ (`customer_favourites.md:14-24`, panel giữa)

```
/menu/favourites/save
┌──────────────────────────┐
│ [←] Lưu bộ yêu thích     │ ←TopNav
├──────────────────────────┤
│ Tên bộ: [___________]    │ ←ZB
├──────────────────────────┤
│ Danh sách món trong bộ   │ ←ZC
│ • Bánh cuốn thịt   ×1    │
│ • Canh mọc         ×2    │
├──────────────────────────┤
│ [ Lưu bộ ]  [ Huỷ ]      │ ←ZD (Lưu trái, Huỷ phải — thanh đáy sạch)
└──────────────────────────┘
```

### ② Code render THẬT

```
/menu/favourites/save
┌──────────────────────────┐
│ [←]  💾 Lưu thành set mới │ ◀── tiêu đề khác (save/page.tsx:80)
├──────────────────────────┤
│ Đặt tên cho set này:     │ ◀── label khác (save/page.tsx:84)
│ [vd: Set cuối tuần...___]│     (placeholder save/page.tsx:89)
├──────────────────────────┤
│ Tóm tắt:                 │ ◀── FavouritesSummaryList "Tóm tắt:" (FavouritesSummaryList.tsx:14)
│ ▸ Bánh cuốn thịt × 1     │
│ Tổng: 35.000đ            │
├──────────────────────────┤
│ ╔════════╗ ╔═══════════╗ │ ◀── ZD: "Huỷ" (TRÁI) + "💾 Lưu set này" (PHẢI)
│ ║  Huỷ   ║ ║💾 Lưu set ║ │     (save/page.tsx:104-118) — thứ tự ngược doc
├─┤▓▓▓ ClientBottomNav ▓▓├─┤ ◀── footer save chỉ ~68px, nav ~56-72px đè GẦN HẾT
│ [Menu][Đơn][❤][Theo][⚙] │     → 2 nút "Huỷ/Lưu set này" bị che (save/page.tsx:103 fixed bottom-0 z-20)
└──────────────────────────┘
```

### ③ Đề xuất sửa doc

```
/menu/favourites/save
┌──────────────────────────┐
│ [←]  💾 Lưu thành set mới │
├──────────────────────────┤
│ Đặt tên cho set này:     │
│ [vd: Set cuối tuần...___]│
├──────────────────────────┤
│ Tóm tắt:                 │
│ ▸ Bánh cuốn thịt × 1     │
│ Tổng: 35.000đ            │
├──────────────────────────┤
│ [  Huỷ  ] [💾 Lưu set này]│  Huỷ trái, Lưu phải
├──────────────────────────┤
│ [Menu][Đơn][❤][Theo][⚙] │  VẼ ClientBottomNav + footer phải nằm TRÊN nav
└──────────────────────────┘
```
> 🔴 **FLAG code bug:** footer save (`save/page.tsx:103`, `fixed bottom-0 z-20`, cao ~68px) bị
> `ClientBottomNav` (~56-72px) đè gần như toàn bộ → 2 nút "Huỷ"/"💾 Lưu set này" khó/không bấm được.
> Cùng gốc với Zone 1. **Đăng ký MASTER trước khi sửa.**

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![Save footer thật](./screenshots/save_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** thanh "Huỷ / Lưu set này" bị ClientBottomNav che |  |

---

## 🟡 Zone 3 — SetCard (`/menu/favourites/sets`) — nút hành động khác doc
Nguồn code: `sets/components/SetCard.tsx:16-104`

### ① Doc đang vẽ (`customer_favourites.md:16-25`, panel phải)

```
/menu/favourites/sets
┌──────────────────────────┐
│ [←] Bộ đã lưu            │ ←TopNav
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ Bộ "Sáng thứ 7"      │ │
│ │ 3 món · 88.000đ      │ │
│ │ [Thêm vào giỏ] [Xoá] │ │ ←chỉ 2 nút: Thêm vào giỏ + Xoá
│ └──────────────────────┘ │
└──────────────────────────┘
```

### ② Code render THẬT

```
/menu/favourites/sets
┌──────────────────────────┐
│ [←]  📋 Các set của tôi  🛒│ ◀── tiêu đề khác (sets/page.tsx:102)
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ 📋 Sáng thứ 7        │ │ ◀── tên có prefix 📋, không có chữ "Bộ" (SetCard.tsx:49)
│ │ ▸ Bánh cuốn × 1      │ │ ◀── liệt kê tối đa 5 món (SetCard.tsx:55)
│ │ 3 món · 88.000đ      │ │ ◀── đếm từ snapshot set.items.length (SetCard.tsx:79)
│ │ [🛒 Áp dụng][✏][🗑]  │ │ ◀── "Áp dụng" + RENAME(bút) + XOÁ(thùng rác)
│ └──────────────────────┘ │     (SetCard.tsx:81-101) — doc thiếu nút rename
└──────────────────────────┘
```

### ③ Đề xuất sửa doc

```
┌──────────────────────────┐
│ [←]  📋 Các set của tôi  🛒│
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ 📋 Sáng thứ 7        │ │
│ │ ▸ Bánh cuốn × 1      │ │
│ │ 3 món · 88.000đ      │ │
│ │ [🛒 Áp dụng][✏][🗑]  │ │  "Áp dụng" (không phải "Thêm vào giỏ") + thêm nút ✏ rename
│ └──────────────────────┘ │
└──────────────────────────┘
```
> 🟡 Không có code bug — chỉ là drift nhãn/thiếu nút trong doc: "Thêm vào giỏ"→"Áp dụng", và doc bỏ
> sót hành động **rename** (đổi tên inline ngay trên card, `SetCard.tsx:32-50,89`).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![SetCard thật](./screenshots/sets_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** card có 3 nút (Áp dụng + ✏ rename + 🗑 xoá), không phải 2 |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| 1 — FavouriteItemCard + footer | Bỏ `[+ Giỏ]`; sửa TopNav (🛒 badge), tabs ("Món lẻ"+đếm), vẽ 3 nút footer + ClientBottomNav | 🔴 Sửa va chạm `FavouritesFooter` ↔ `ClientBottomNav` (offset/z-index) |
| 2 — Save footer | Sửa tiêu đề/label/thứ tự nút; vẽ ClientBottomNav | 🔴 Sửa va chạm footer save ↔ `ClientBottomNav` (cùng gốc Zone 1) |
| 3 — SetCard | "Thêm vào giỏ"→"Áp dụng"; thêm nút rename | — (không có code bug) |
