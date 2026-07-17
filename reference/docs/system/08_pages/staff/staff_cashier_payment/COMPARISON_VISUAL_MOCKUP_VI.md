# So Sánh Trực Quan — `staff_cashier_payment` (`/cashier/payment/:id`)

> Mỗi zone: ① tài liệu đang vẽ · ② code render THẬT (ASCII, có chú thích `file:line` + nguồn dữ liệu) ·
> ③ đề xuất sửa. **Chỉ audit — không sửa code, không sửa doc-set.**
> **📷 Trạng thái ảnh chụp: ⏳ CHƯA CHỤP** — full stack chưa chạy, **và** cả 3 bug khiến mọi luồng
> thanh toán không hoàn tất nên không thể chụp trạng thái QR/thành công thật. Cần
> `docker compose up -d --build be fe` + Playwright (viewport iPhone 390×844, đăng nhập role cashier,
> mở `/cashier/payment/<orderId>` của một đơn `ready`/`delivered`). Cột 💬 luôn để trống — của chủ dự án.
>
> Lưu ý: trang này thuộc nhóm `(dashboard)`, **không** phải `(shop)` → **không có** `ClientBottomNav`,
> không có footer `fixed bottom-0`; header + controls đều `.no-print`. Không dính lỗi va chạm
> sticky-footer như `customer_checkout`/`customer_favourites`.

---

## 🔴 Zone 1 — Method picker (tell trực quan của Bug 1)
Nguồn code: `cashier/payment/[id]/page.tsx:216-247`

### ① Doc đang vẽ (`staff_cashier_payment.md:40-45`)
```
│ Phương thức thanh toán             no-print      │
│  [Tiền mặt ✓]  [VNPay]                           │   default 'cod' (Bug 1: BE needs 'cash')
│  [MoMo]        [ZaloPay]                         │
├──────────────────────────────────────────────────┤
│  [ Xác nhận COD / Tạo QR MoMo / … ]  no-print   │
```

### ② Code render THẬT
```
┌──────────── Phương thức thanh toán ────────────┐  ◀── page.tsx:219 (.no-print)
│  ┌────────────┐  ┌────────────┐                │
│  │ Tiền mặt ✓ │  │   VNPay    │                │  ◀── grid-cols-2, METHOD_LABELS
│  └────────────┘  └────────────┘                │      order = cod,vnpay,momo,zalopay
│  ┌────────────┐  ┌────────────┐                │      (page.tsx:220-234)
│  │   MoMo     │  │  ZaloPay   │                │
│  └────────────┘  └────────────┘                │
└────────────────────────────────────────────────┘
   nút "Tiền mặt" mang value 'cod' ──┐
                                     ▼
   createPayment.mutate('cod')  →  POST /payments {method:'cod'}  (page.tsx:111-113)
        │
        ▼  BE binding oneof=vnpay momo zalopay **cash**  (payment_handler.go:25)
   400 INVALID_INPUT  →  toast "Không thể tạo thanh toán"  (page.tsx:122)
```

### ③ Đề xuất sửa doc
Tài liệu **đã đúng** — ASCII đã chú thích "default 'cod' (Bug 1: BE needs 'cash')". Không cần sửa doc.
🔴 **Bug code (Bug 1):** value `'cod'` không nằm trong `oneof=...cash` → cash (mặc định) luôn 400.
Sửa FE: `'cod'`→`'cash'` ở type/default/`METHOD_LABELS` (giữ nhãn "Tiền mặt") — `page.tsx:14,30-35,52`.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** picker 2×2 với "Tiền mặt" chọn sẵn, bấm → toast lỗi đỏ |  |

---

## 🔴 Zone 2 — Sau khi tạo payment: màn hình TRẮNG (Bug 2)
Nguồn code: `cashier/payment/[id]/page.tsx:216-280`

### ① Doc đang vẽ (`staff_cashier_payment.md:47-62`, State B)
```
State B — payment.status==='pending' && qr_code_url set
┌────────────────────────────────────────────┐
│ Quét mã — MoMo                             │
│  ┌──────────────┐                          │
│  │  QR image    │  (224×224 từ qr_code_url) │
│  └──────────────┘                          │
│  ⏳ Đang chờ thanh toán...                  │
│  [ Upload ảnh xác nhận (tuỳ chọn) ]        │
└────────────────────────────────────────────┘   ⚠️ DEAD TODAY (Bug 2)
```

### ② Code render THẬT (sau khi bấm tạo payment, MỌI method)
```
┌──────────── (Hoá đơn vẫn hiển thị) ───────────┐
│  Bánh Cuốn · Đơn #BC-0042 · Tổng 80.000đ      │  ◀── receipt còn nguyên (page.tsx:166-213)
└────────────────────────────────────────────────┘

        ⌀  (KHÔNG CÓ GÌ Ở ĐÂY)                      ◀── controls = `else null` (page.tsx:280)

   Vì sao trắng:
   setPayment({id, pay_url, qr_code_url})  ◀── response THIẾU status/amount/method
                                               (payment_handler.go:44-48)
   payment.status === undefined  ⇒
     • QR block guard `status==='pending'`   FALSE  (page.tsx:249)  → không QR
     • WS effect `status!=='pending'` return EARLY  (page.tsx:64)   → socket không mở
     • cash branch `status==='completed'`     FALSE  (page.tsx:116)  → không print/redirect
```

### ③ Đề xuất sửa doc
Tài liệu **đã đúng** — State B/C đều chú thích "⚠️ DEAD TODAY (Bug 2)". Không cần sửa doc.
🔴 **Bug code (Bug 2):** mở rộng response `POST /payments` để trả `status`/`amount`/`method`
(`payment_handler.go:44-48`) — hoặc FE `GET /payments/:id` sau khi tạo (`main.go:270`, trả full
`db.Payment`). Một thay đổi mở khoá cả QR + WS + nhánh cash-success.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần stack chạy<br>⚠ **Bằng chứng cần chụp:** sau khi bấm "Tạo QR MoMo", vùng dưới hoá đơn trống trơn (không QR, không spinner) |  |

---

## 🟢 Zone 3 — Receipt card (khớp chính xác)
Nguồn code: `cashier/payment/[id]/page.tsx:166-213`

### ① Doc đang vẽ (`staff_cashier_payment.md:26-38`)
```
│ │             Bánh Cuốn                      │ │
│ │         Hoá đơn thanh toán                 │ │
│ │  Đơn #   BC-0042                           │ │
│ │  Bàn     03          (if table_id)         │ │
│ │  Khách   Nguyễn A    (if not default)      │ │
│ │  2× Bánh cuốn thịt            70.000đ      │ │
│ │  Tổng cộng                    80.000đ      │ │
│ │          Cảm ơn quý khách!                 │ │
```

### ② Code render THẬT
```
┌──────────────── bg-card ───────────────────────┐  ◀── page.tsx:166
│            Bánh Cuốn  /  Hoá đơn thanh toán     │  ◀── :168-169
│  Đơn #                              BC-0042     │  ◀── order.order_number :175
│  Bàn                                03          │  ◀── chỉ khi order.table_id :177
│  Khách                              Nguyễn A    │  ◀── ẩn nếu === 'Khách tại quán' :183
│  2× Bánh cuốn thịt                  70.000đ     │  ◀── unit_price × quantity :192-196
│  Tổng cộng                          80.000đ     │  ◀── order.total_amount :202
│  Phương thức                        Tiền mặt    │  ◀── CHỈ khi `payment` (:205-210)
│             Cảm ơn quý khách!                   │  ◀── :212
└─────────────────────────────────────────────────┘
   (không có .no-print ⇒ in ra giấy; window.print() ẩn header+controls)
```

### ③ Đề xuất sửa doc
Không cần sửa — khớp chính xác. Lưu ý nhỏ: hàng "Phương thức" chỉ hiện sau khi tạo payment
(State A chưa có — doc vẽ đúng).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần stack chạy<br>⚠ **Bằng chứng cần chụp:** hoá đơn in (print preview) ẩn header + picker, chỉ còn card |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| 1 — Method picker | — (đã đúng) | 🔴 Bug 1: FE `'cod'`→`'cash'` (`page.tsx:14,30-35,52`) |
| 2 — Màn hình trắng sau create | — (đã đúng) | 🔴 Bug 2: mở rộng response `POST /payments` hoặc FE re-fetch `GET /payments/:id` |
| 3 — Receipt card | — (khớp) | — |
| (chung) | 🟢 Cập nhật line `main.go` (~+13) + branch provenance trên 5 file doc-set | — |
