# Checkout `/checkout` — So Sánh Hình Vẽ (Doc vs Code) · Tiếng Việt

> Mỗi zone: ① tài liệu đang vẽ · ② code render THẬT (ASCII từ source) · ③ đề xuất sửa.
> Chỉ liệt kê các zone **có drift hình vẽ thật** (zone khác đã khớp — xem
> [COMPARISON_DOC_VS_CODE_DETAILED.md](COMPARISON_DOC_VS_CODE_DETAILED.md) Mảng 1).
> Branch: `experience_claude.md_system_1_test_iphon2_change_code` · Ngày: 2026-06-23 (chạy lại —
> 2 zone drift kiểm chứng lại trên source, không đổi từ 2026-06-22).
>
> **📷 Trạng thái ảnh chụp: ⏳ CHƯA CHỤP** — stack chưa chạy. Cần
> `docker compose up -d --build fe` + Playwright (iPhone 390×844) để chụp. ASCII ②/③ dựng thẳng từ
> code, không bịa ảnh. Cột 💬 luôn để trống — của chủ dự án điền.

---

## 🔴 Zone Submit Bar — `Fixed Submit` đè bởi `ClientBottomNav`
Nguồn code: `checkout/page.tsx:203-214` · `ClientBottomNav.tsx:48` · `(shop)/layout.tsx:11-12`

### ① Doc đang vẽ (`customer_checkout.md:43-45`)
```
├────────────────────────────────────────────────┤
│      [ Đặt hàng · 80.000đ ]                    │ ← fixed submit bar
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ← ClientBottomNav (shell)
└────────────────────────────────────────────────┘
```
Tài liệu vẽ 2 thanh **xếp chồng sạch sẽ**: submit bar ở trên, bottom-nav ở dưới.

### ② Code render THẬT
```
        ┌──────────────────────────────────────┐
        │     [ Đặt hàng · 80.000đ ]          │ ◀── page.tsx:203  fixed bottom-0  (KHÔNG z-index → z-auto)
        ├──────────────────────────────────────┤
        │ [Menu][Đơn Hàng][Yêu Thích][...][...] │ ◀── ClientBottomNav.tsx:48  fixed bottom-0 z-20
        └──────────────────────────────────────┘     render SAU submit bar trong (shop)/layout.tsx:12

   Cả hai cùng `bottom: 0`. nav (z-20 + sibling sau) → ĐÈ LÊN nút "Đặt hàng":

        ┌──────────────────────────────────────┐
        │ [Menu][Đơn Hàng][Yêu Thích][...][...] │ ◀── nav phủ lên CTA → người dùng có thể không bấm được
        └──────────────────────────────────────┘
```
Submit bar **không có z-index** (`page.tsx:203`), nav có `z-20` (`ClientBottomNav.tsx:48`) và là
sibling đứng **sau** trong shell (`(shop)/layout.tsx:12`) → nav vẽ đè lên nút "Đặt hàng".

### ③ Đề xuất sửa doc
```
├────────────────────────────────────────────────┤
│   [ Đặt hàng · 80.000đ ]   ← bottom-[72px]     │ ← submit bar đẩy LÊN trên nav
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ← ClientBottomNav z-20
└────────────────────────────────────────────────┘
```
> **FLAG 🔴 (code bug — CHƯA được tài liệu nào ghi):** đây là **lỗi che CTA checkout**, cùng class với
> 🔴 của `customer_product_detail` + `customer_favourites`. Sửa code: cho submit bar
> `bottom-[calc(72px+env(safe-area-inset-bottom))]` hoặc `z-30`. Sửa doc: vẽ lại đúng quan hệ.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** nút "Đặt hàng" bị thanh nav dưới che một phần/toàn bộ |  |

---

## 🟡 Zone Phương Thức Thanh Toán — thứ tự + layout khác
Nguồn code: `checkout/page.tsx:180-198` · `PAYMENT_OPTIONS page.tsx:24-29`

### ① Doc đang vẽ (`customer_checkout.md:40-41`)
```
│ PHƯƠNG THỨC THANH TOÁN                         │
│ (•) 💵 Tiền mặt COD   ( ) 💳 VNPay             │   ← lưới 2×2, Tiền mặt ĐỨNG ĐẦU
│ ( ) 📱 MoMo           ( ) 🏦 ZaloPay           │
```

### ② Code render THẬT
```
│ Phương thức thanh toán                         │ ◀── page.tsx:181 (uppercase qua CSS)
│ ( ) 💳 VNPay                                   │ ◀── PAYMENT_OPTIONS[0]  page.tsx:25
│ ( ) 📱 MoMo                                    │ ◀── [1] page.tsx:26
│ ( ) 🏦 ZaloPay                                 │ ◀── [2] page.tsx:27
│ (•) 💵 Tiền mặt COD                            │ ◀── [3] page.tsx:28  (default 'cash' page.tsx:42)
```
Render là **list dọc 1 cột** (`space-y-3`, mỗi `<label>` 1 hàng — `page.tsx:184-194`), KHÔNG phải
lưới 2×2. Thứ tự: VNPay → MoMo → ZaloPay → **Tiền mặt (cuối)**, dù Tiền mặt mới là lựa chọn mặc định.

### ③ Đề xuất sửa doc
```
│ Phương thức thanh toán                         │
│ ( ) 💳 VNPay                                   │
│ ( ) 📱 MoMo                                    │
│ ( ) 🏦 ZaloPay                                 │
│ (•) 💵 Tiền mặt COD   ← mặc định               │
```
> **FLAG 🔴 (code bug đã được ghi — `_be.md` Flag 1 / `CHECKOUT_BUGS.md` Bug 1):** radio này chỉ là
> **trang trí** — `payment_method` ghi vào `cart.setPaymentMethod` (`page.tsx:47`) nhưng KHÔNG nằm
> trong payload POST (`page.tsx:49-56`), không có cột `orders.payment_method`. Chọn VNPay/MoMo/ZaloPay
> không khác gì Tiền mặt.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** list dọc 1 cột, Tiền mặt ở cuối + được chọn sẵn |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| Submit Bar | Vẽ lại footer đúng quan hệ submit-bar/nav (`customer_checkout.md:43-45`) | 🔴 Đẩy submit bar lên trên nav (`page.tsx:203`) — `bottom-[72px]` hoặc `z-30` |
| Phương thức TT | Vẽ lại list dọc + đúng thứ tự (`customer_checkout.md:40-41`) | 🔴 Ẩn lựa chọn non-cash (hoặc gắn "sắp có") + bỏ dead write `cart.setPaymentMethod` (`page.tsx:24-29,47`) |
