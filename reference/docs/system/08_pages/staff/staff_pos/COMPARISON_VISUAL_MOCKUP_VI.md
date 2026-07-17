# Staff POS `/pos` — Mockup Trực Quan: Doc vs. Code vs. Đề Xuất Sửa + Feedback

> **Quy trình:** mỗi zone có **① Doc đang vẽ · ② Code render thật (ASCII) · ③ Đề xuất sửa**, kèm
> **📷 Ảnh chụp thật** và **💬 Feedback của bạn**. Bạn điền feedback vào ô đó → tôi chỉnh sửa theo.
>
> **Trạng thái ảnh chụp thật:** ⏳ **CHƯA CHỤP** — cần `docker compose up -d --build fe` + Playwright
> (đăng nhập cashier rồi vào `/pos`, viewport iPhone 390×844). ASCII ② / ③ dưới đây dựng thẳng từ code
> trên branch `experience_claude.md_system_1_test_iphon2_change_code`, không phải từ ảnh. Ngày:
> 2026-06-23. File này chỉ đọc — không sửa code/doc app.

---

## 🔴 Zone A — Header trái + phạm vi bàn ("Đặt hộ")

Nguồn code: `pos/page.tsx:238-253`

### ① Doc đang vẽ (`staff_pos.md:15-17`)
```
┌───────────────────────────────┐
│ POS — Thu Ngân                │   ◀── chỉ có tiêu đề, KHÔNG có gì khác
├───────────────────────────────┤
│ [Tất cả][Bánh cuốn][Đồ uống]  │
```

### ② Code render THẬT
```
┌──────────────────────────────────────────────┐
│ POS — Thu Ngân        [Bàn 3]  [ Đổi bàn ]   │  ◀── chip tableName (pos/page.tsx:242-245)
├──────────────────────────────────────────────┤      + nút Chọn/Đổi bàn (:246-251)
│ [Tất cả][Bánh cuốn][Đồ uống]                 │      • chưa chọn bàn → nút ghi "Chọn bàn", không có chip
└──────────────────────────────────────────────┘      • bàn seed từ ?table_id=&table_name= (:107-108)
```

### ③ Đề xuất sửa doc
```
┌──────────────────────────────────────────────┐
│ POS — Thu Ngân        [Bàn 3]  [ Đổi bàn ]   │
└──────────────────────────────────────────────┘
   FLAG 🔴 (doc drift): TL;DR đánh dấu "Đặt hộ" là 🔮 PLANNED nhưng tính năng ĐÃ chạy thật.
            Handoff vào trang từ TableList.tsx:357 (router.push('/pos?table_id=…&table_name=…')).
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![Header POS thật](./screenshots/header_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright |  |

---

## 🔴 Zone B — TablePickerModal (hoàn toàn thiếu trong doc)

Nguồn code: `pos/page.tsx:41-97` (mở tại `:226`)

### ① Doc đang vẽ
```
(KHÔNG có — staff_pos.md không vẽ modal chọn bàn nào;
 Zones table cũng không có dòng nào cho nó)
```

### ② Code render THẬT
```
        ┌──────────── Chọn bàn — Đặt hộ ──────── [Đóng] ┐
        │ ┌──────┐ ┌──────┐ ┌──────┐                   │
        │ │ Bàn1 │ │ Bàn2 │ │ Bàn3 │   ← grid 3 cột     │  ◀── tables (GET /tables, :112-116)
        │ │ Trống│ │Có khách│ Trống│   (:62-83)         │  ◀── "Có khách" = occupiedTableIds
        │ └──────┘ └──────┘ └──────┘   (mờ + disabled)  │      (từ GET /orders/live, :117-125)
        │ ...                                            │
        ├────────────────────────────────────────────── ┤
        │   Khách vãng lai (không gắn bàn)               │  ◀── onPick(null) (:86-92)
        └────────────────────────────────────────────────┘
```

### ③ Đề xuất sửa doc
```
   Thêm 1 zone "TablePickerModal" vào staff_pos.md:
   • grid bàn 3 cột, trạng thái Trống / Có khách (bàn bận → disabled + mờ)
   • lựa chọn "Khách vãng lai (không gắn bàn)"
   • nguồn occupancy: GET /tables + GET /orders/live (hai endpoint này CŨNG thiếu trong staff_pos_be.md)
   FLAG 🔴: bỏ nhãn 🔮 PLANNED ở TL;DR.
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![TablePickerModal thật](./screenshots/tablepicker_real.png)<br>⏳ chưa chụp — cần stack chạy + Playwright |  |

---

## 🔴 Zone C — Màn chờ bếp ("Đơn #undefined")

Nguồn code: `pos/page.tsx:196-221`

### ① Doc đang vẽ (`staff_pos.md:16-26`)
```
┌──────────────────────┐
│  Đơn #BC-0042        │   ◀── doc giả định có order_number
│ ⏳ Bếp đang chuẩn bị…│
│ Khi bếp hoàn thành   │
│ sẽ tự chuyển sang    │
│ thanh toán.          │
│ [Đến thanh toán]     │   ◀── doc vẽ 2 nút XẾP DỌC
│ [Tạo đơn mới]        │
└──────────────────────┘
```

### ② Code render THẬT
```
┌──────────────────────────────────────┐
│  Đơn #undefined                      │  ◀── 🐞 order_number = undefined (pos/page.tsx:200)
│  ⏳ Bếp đang chuẩn bị...              │      POST /orders trả {id, table_busy} (order_handler.go:121)
│  Khi bếp hoàn thành, bạn sẽ được     │      → KHÔNG có order_number; toast cũng "Đã tạo đơn #undefined" (:190)
│  chuyển đến thanh toán tự động.      │
│  [ Đến thanh toán ]  [ Tạo đơn mới ] │  ◀── 2 nút NẰM NGANG (flex gap-3, :205-218)
└──────────────────────────────────────┘
```

### ③ Đề xuất sửa doc
```
┌──────────────────────────────────────┐
│  Đơn #BC-0042                        │
│  ⏳ Bếp đang chuẩn bị...              │
│  [ Đến thanh toán ]  [ Tạo đơn mới ] │   ← vẽ lại 2 nút nằm ngang
└──────────────────────────────────────┘
   FLAG 🔴 (lỗi code, đã có POS_BUGS.md Bug 1): mọi đơn POS hiện "Đơn #undefined".
            Sửa: sau POST /orders gọi GET /orders/:id rồi mới setActiveOrder (theo pattern menu/checkout).
            Đăng ký MASTER_TASK trước khi sửa code.
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![Màn chờ bếp thật](./screenshots/waiting_real.png)<br>⏳ chưa chụp — cần stack chạy + Playwright |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| A — Header / phạm vi bàn | Bỏ 🔮 PLANNED; thêm chip bàn + nút Chọn/Đổi bàn + seeding `?table_id=` vào `staff_pos.md` | — |
| B — TablePickerModal | Thêm zone modal + 2 endpoint `GET /tables` & `GET /orders/live` vào `staff_pos.md` + `staff_pos_be.md` | — |
| C — Màn chờ bếp | Vẽ 2 nút nằm ngang; ghi rõ bug "Đơn #undefined" | Bug 1 (POS_BUGS): GET `/orders/:id` sau create (FE) |
