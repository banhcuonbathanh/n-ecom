# Customer Menu — So Sánh Hình Ảnh Theo Zone (Doc vs Code)

> Mỗi zone có drift hình ảnh thật được vẽ ở 3 lớp: **① Doc đang vẽ** · **② Code render THẬT** · **③ Đề
> xuất sửa**. Nguồn sự thật là CODE — mọi ASCII ở ② trích từ file thật (có `file:line`).
> Branch: `docs/customer-menu-alignment`. Ngày: 2026-06-25.
>
> 📷 **Trạng thái ảnh chụp: ⏳ CHƯA CHỤP** — cần `docker compose up -d --build fe` + Playwright
> (mẫu: `e2e/tests/capture-menu-zones.spec.ts`, viewport iPhone 390×844). ASCII ở dưới vẽ từ code, không
> chờ ảnh. Cột 💬 Feedback luôn để trống — của chủ dự án điền, mình phản hồi ở lần chạy sau.

---

## 🔴 Zone Banner — RestaurantBanner (banner thừa)
Nguồn code: `RestaurantBanner.tsx:3-21` · `page.tsx:131`

### ① Doc đang vẽ (`customer_menu.md` — Zones table)
```
(Zones table chỉ ghi "Banner · RestaurantBanner — static")
DESIGN_PROMPT.md: KHÔNG có zone banner thứ hai — chỉ 1 photo header (MenuHeader).
```

### ② Code render THẬT
```
┌────────────────────────────────────────┐
│ [photo cover + Playfair "Quán Bánh Cuốn"] │ ← MenuHeader (h-196px)  ✅ đúng design
├────────────────────────────────────────┤
│ [BANNER THỨ HAI h-44]                   │ ← RestaurantBanner  ◀── page.tsx:131
│   "Bánh cuốn tươi — ngon mỗi ngày"      │     img /restaurant-banner.jpg (THIẾU file →
│                                          │     onError ẩn img → fallback gradient xám)
└────────────────────────────────────────┘     ◀── RestaurantBanner.tsx:10-14
```

### ③ Đề xuất sửa
```
Bỏ <RestaurantBanner /> khỏi page.tsx:131 (design chỉ có 1 banner) —
HOẶC chính thức thêm zone này vào DESIGN_PROMPT + ship asset /restaurant-banner.jpg.
🔴 FLAG (code/chủ dự án): hiện đang là 1 dải gradient thừa, không khớp design.
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![RestaurantBanner thật](./screenshots/banner_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright |  |

---

## 🔴 Zone E — ComboSection (tiêu đề sai)
Nguồn code: `ComboSection.tsx:16` · `MenuSections.tsx:29`

### ① Doc đang vẽ (`customer_menu.md:28,33`)
```
│ SUẤT                                    │ ← E ComboSection
│ ┌──────────────────────────────────┐    │
│ │ ♡ [img] Suất Đầy Đủ 30.000đ – 0 +│   │
```

### ② Code render THẬT
```
Tab nav:  [Tất cả][Suất][Trứng]...      ◀── MenuSections.tsx:29  label = 'Suất'
                  └─ tab ghi "Suất"
Section heading dưới đây lại ghi:
│ COMBO                                   │ ◀── ComboSection.tsx:16  <h2>Combo</h2>
│ ┌──────────────────────────────────┐    │     ← KHÔNG khớp tab, KHÔNG khớp DESIGN_PROMPT ("SUẤT")
│ │ ♡ [img] Suất Đầy Đủ ... – 0 +    │   │
```

### ③ Đề xuất sửa
```
Đổi <h2>Combo</h2> → <h2>SUẤT</h2> tại ComboSection.tsx:16.
🔴 FLAG (code bug): lệch 3 chiều — tab "Suất" / heading "Combo" / design "SUẤT".
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![ComboSection thật](./screenshots/combo_section_real.png)<br>⏳ chưa chụp |  |

---

## 🔴 Zone I — OrderSummary (ghi chú & note disconnect)
Nguồn code: `OrderSummary.tsx:300-304` · `TableConfirmModal.tsx:15,23`

### ① Doc đang vẽ (`customer_menu.md:225,228`)
```
│ GHI CHÚ: [Gia đình (mẹ + 2 người lớn + 2 trẻ)] │ ← pre-filled (doc nói)
```

### ② Code render THẬT
```
OrderSummary:
│ GHI CHÚ: [____________________________] │ ◀── OrderSummary.tsx:300  value={orderNote}
│          placeholder "Nhập ghi chú..."  │     KHỞI TẠO RỖNG (không pre-fill)
│          ──▶ ⚡ setOrderNote → store.orderNote
                                            │
Khi bấm "Thanh toán" → TableConfirmModal:   │
│ GHI CHÚ bếp: [______________]           │ ◀── TableConfirmModal.tsx:15  useState('')
│          ──▶ POST note = local note      │     ← KHÔNG đọc store.orderNote!
                                            │     store.orderNote (gõ ở OrderSummary) BỊ BỎ QUA
```

### ③ Đề xuất sửa
```
A) Doc: bỏ giá trị pre-fill "Gia đình..." — note khởi tạo RỖNG (chủ dự án đã chốt).
B) 🔴 FLAG (code bug — mất dữ liệu): TableConfirmModal phải seed note từ cart.orderNote
   (useState(cart.orderNote)) hoặc bỏ textarea ở modal và gửi cart.orderNote khi POST.
   Hiện note khách gõ ở OrderSummary bị mất khỏi đơn.
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![OrderSummary note thật](./screenshots/order_summary_note_real.png)<br>⏳ chưa chụp |  |

---

## 🟡 Zone C — MenuCategoryNav (marker doc lỗi thời)
Nguồn code: `MenuCategoryNav.tsx:13-36` · `page.tsx:147-153`

### ① Doc đang vẽ (`customer_menu.md:25,138,287`)
```
│ [Tất cả][Suất][Trứng][Bánh Cuốn][Giò][Canh] │ ← C CategoryTabs (⚠️ NEW DESIGN — code pending rebuild)
Zones table: component = `features/menu/CategoryTabs`
```

### ② Code render THẬT
```
│ [Tất cả][Suất][Trứng][Bánh Cuốn][Giò][Canh] │ ◀── page.tsx:9 import MenuCategoryNav (KHÔNG phải CategoryTabs)
         └─ active: chữ cam + gạch chân + glow   ◀── MenuCategoryNav.tsx:23-27  scroll-spy ĐÃ XÂY
   CategoryTabs.tsx vẫn tồn tại nhưng là component LỌC của trang POS (/pos), không phải /menu.
```

### ③ Đề xuất sửa
```
Doc: đổi Zones table CategoryTabs → MenuCategoryNav; XÓA marker "code pending rebuild" (đã xây xong).
(Không phải code bug — chỉ doc lỗi thời.)
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![MenuCategoryNav thật](./screenshots/category_nav_real.png)<br>⏳ chưa chụp |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| Banner · RestaurantBanner | ghi rõ trạng thái zone | 🔴 bỏ banner thừa khỏi `page.tsx:131` (hoặc adopt + ship asset) |
| E · ComboSection | — | 🔴 `ComboSection.tsx:16` "Combo" → "SUẤT" |
| I · OrderSummary note | bỏ claim pre-fill (note rỗng) | 🔴 `TableConfirmModal.tsx:15` seed từ `cart.orderNote` (sửa mất dữ liệu) |
| C · MenuCategoryNav | đổi tên zone + xóa marker | — (code đã đúng) |
| D/I/J khác | xóa các marker "code pending rebuild" còn lại | — (code đã đúng) |
