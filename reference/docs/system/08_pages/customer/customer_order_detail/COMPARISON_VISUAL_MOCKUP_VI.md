# Customer Order Detail — Mockup Trực Quan: Doc vs. Code vs. Đề Xuất Sửa + Feedback

> **Quy trình:** mỗi zone có **① Doc đang vẽ · ② Code render thật (ASCII) · ③ Đề xuất sửa**, kèm
> **📷 Ảnh chụp thật** và **💬 Feedback của bạn**. Bạn điền feedback vào ô đó → tôi chỉnh sửa theo.
>
> **Trạng thái ảnh chụp thật:** ⏳ CHƯA CHỤP. Stack chưa chạy lúc audit (2026-06-21). ASCII ② và ③ dưới
> đây dựng **từ code** (`fe/src/app/(shop)/order/[id]/page.tsx` — đã đọc toàn bộ 783 dòng), không phải
> từ doc. Muốn ảnh thật: bật `docker compose up -d --build fe` + Playwright (mẫu spec:
> `e2e/tests/capture-menu-zones.spec.ts`, viewport iPhone 390×844, luồng QR thật vào `/order/<id>`).
> Branch: `experience_claude.md_system_1_test_iphon2_change_code`. File này chỉ đọc — không sửa code/doc app.

---

## 🟡 Zone — Nav header (StatusBadge vs LIVE pill)

Nguồn code: `page.tsx:273-293` · StatusBadge thật ở `page.tsx:308` (trong order card)

### ① Doc đang vẽ (`customer_order_detail.md:20, 55`)
```
┌────────────────────────────────────────────────┐
│ [←] Theo Dõi Đơn Hàng            [StatusBadge] │  ◀── doc: StatusBadge ở góc phải nav
└────────────────────────────────────────────────┘
```

### ② Code render THẬT — góc phải là pill kết nối, không phải StatusBadge
```
┌────────────────────────────────────────────────┐
│ [←] Theo Dõi Đơn Hàng              ● LIVE      │  ◀── pill xanh (page.tsx:282-292)
└────────────────────────────────────────────────┘      mất kết nối → ● MẤT KẾT NỐI (đỏ)
   • StatusBadge KHÔNG nằm ở nav — nó nằm trong order card (page.tsx:308)
   • Pill này đã được _loading.md mô tả đúng; chỉ .md (wireframe) vẽ sai
```

### ③ Đề xuất sửa doc
```
┌────────────────────────────────────────────────┐
│ [←] Theo Dõi Đơn Hàng              ● LIVE      │  ◀── pill realtime (LIVE / MẤT KẾT NỐI)
└────────────────────────────────────────────────┘
   • Đưa [StatusBadge] xuống hàng order card (bên cạnh số đơn).
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Sẽ chứng minh:** góc phải nav là pill "LIVE", StatusBadge nằm trong order card. |  |

---

## 🟡 Zone — Order-card header (thiếu tổng tiền + nút Ẩn/Hiện)

Nguồn code: `page.tsx:303-319`

### ① Doc đang vẽ (`customer_order_detail.md:23`)
```
┃ Bàn 03  #BC-0042  [preparing]    12 phút
```

### ② Code render THẬT — có thêm tổng tiền + nút thu gọn + fallback "Mang về"
```
┃ Bàn 03  #BC-0042  [preparing]   105.000đ  12 phút   [Ẩn ⌃]
│  ▲          ▲           ▲           ▲         ▲          ▲
│  │          │           │           │         │          └ nút thu/mở dish list (page.tsx:312-318)
│  │          │           │           │         └ elapsed (page.tsx:311)
│  │          │           │           └ total_amount formatVND (page.tsx:310)  ◀── DOC THIẾU
│  │          │           └ StatusBadge (page.tsx:308)
│  │          └ order_number (page.tsx:307)
│  └ "Bàn {table_name}"  HOẶC  "Mang về" nếu table_name null (page.tsx:304-306)  ◀── DOC THIẾU
```

### ③ Đề xuất sửa doc
```
┃ Bàn 03 (hoặc "Mang về")  #BC-0042  [StatusBadge]  105.000đ  12 phút  [Ẩn ⌃]
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp<br>⚠ **Sẽ chứng minh:** hàng header có tổng tiền `105.000đ` và nút `Ẩn/Hiện`. |  |

---

## 🟡 Zone — DishRow (topping chip, không có "· filling" trên từng dòng)

Nguồn code: `page.tsx:681-772` (component `DishRow`)

### ① Doc đang vẽ (`customer_order_detail.md:26-28`)
```
┃   ● Bánh cuốn thịt · thịt   ra 1/1  ✓
┃   ● Canh mọc · có rau       còn 1  [Huỷ]
┃ ● Trà đá [−1+]              còn 2  [Huỷ]
```

### ② Code render THẬT
```
┃ ● Bánh cuốn thịt                tổng ×2 · ra ×1 · còn ×1   [Huỷ]
┃    ( + nhân thịt )  ( + hành phi 5.000đ )   ◀── topping = chip pill DƯỚI tên (page.tsx:711-724)
┃                                              ◀── KHÔNG có "· thịt"/"· có rau" trên dòng món
┃ ● Canh mọc                       ra ×1            ✓ xong   ◀── done = "✓ xong" (page.tsx:754)
┃ ● Trà đá                                                   ◀── khi qty_served===0 → hiện stepper:
┃    Số lượng: [ − ] 2 [ + ]                      [Huỷ]      ◀── stepper riêng 1 dòng + nhãn "Số lượng:"
   • item.note (filling "có rau") KHÔNG render ở DishRow — chỉ gom ở dòng aggregate phía dưới list
     ("3/6 phần đã ra · có rau ×2" — page.tsx:391-400)
```

### ③ Đề xuất sửa doc
```
┃ ● Bánh cuốn thịt              tổng ×N · ra ×N · còn ×N  [Huỷ]
┃    ( + topping )( + topping )                          ◀── chip pill, single line dưới tên
┃ ● <món đã xong>                       ra ×N      ✓ xong
┃ ● <món chưa ra>  Số lượng: [−] n [+]            [Huỷ]   ◀── stepper khi qty_served===0
   FLAG: filling ("có rau") chỉ hiện AGGREGATE dưới list, không trên từng dòng món.
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp<br>⚠ **Sẽ chứng minh:** topping là chip pill dưới tên; bên phải là `tổng×/ra×/còn×`; không có "· filling" trên dòng món. |  |

---

## 🟡 Zone — Summary table + bottom buttons (nhãn sai + thiếu "Theo dõi bàn")

Nguồn code: `page.tsx:406-516` (bảng) · `page.tsx:549-583` (nút)

### ① Doc đang vẽ (`customer_order_detail.md:31-44`)
```
▼ Tổng hợp món (toggle)
  Món          SL  Đã ra  Còn  Đơn giá  Tổng
  ───────────────────────────────────────────
  Còn lại: 45.000đ        Tổng: 105.000đ
...
[ Huỷ đơn hàng ]
[ + Gọi thêm món ]
```

### ② Code render THẬT
```
▼ Chi tiết món                              [Ẩn ⌃]   ◀── nhãn "Chi tiết món", KHÔNG "Tổng hợp món" (page.tsx:413)
  Tên món       SL  Ra  Còn  Đơn giá  Tổng
  Bánh cuốn…    2   1   ×1   35.000   70.000   [Huỷ]  ◀── nút Huỷ/dòng khi còn>0 (page.tsx:484-497)
  ──────────────────────────────────────────────
  Tổng tiền còn lại            45.000đ    ◀── chỉ hiện khi >0 (page.tsx:503)
  Tổng tất cả món             105.000đ    ◀── nhãn "Tổng tất cả món" (page.tsx:510)
...
[ Huỷ toàn bộ đơn hàng ]                   ◀── chỉ khi canCancelOrder (page.tsx:550)
┌──────────────────────┬──────────────────────┐
│ 📍 Theo dõi bàn      │ ✚ Thêm món          │  ◀── "Theo dõi bàn" DOC THIẾU (page.tsx:563-569)
└──────────────────────┴──────────────────────┘      nút phải: "Thêm món"/"Đặt thêm món" (không "Gọi thêm món")
   • cả hàng nút gate trên order.table_id (page.tsx:560)
```

### ③ Đề xuất sửa doc
```
▼ Chi tiết món                              [Ẩn]
  Tên món  SL  Ra  Còn  Đơn giá  Tổng   [Huỷ/dòng]
  Tổng tiền còn lại  <tiền>   ·   Tổng tất cả món  <tổng>
...
[ Huỷ toàn bộ đơn hàng ]   (chỉ khi canCancelOrder)
[ 📍 Theo dõi bàn ]  [ ✚ Thêm món / Đặt thêm món ]   (gate trên order.table_id)
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp<br>⚠ **Sẽ chứng minh:** header "Chi tiết món", footer "Tổng tất cả món", có nút "Theo dõi bàn" + "Thêm món". |  |

---

## Tổng hợp việc cần làm (từ các mockup trên)

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| Nav header | Vẽ pill LIVE/MẤT KẾT NỐI ở phải; StatusBadge xuống order card | — |
| Order-card header | Thêm total_amount + nút Ẩn/Hiện + fallback "Mang về" | — |
| DishRow | Topping chip dưới tên; bỏ "· filling" trên dòng; thêm stepper riêng dòng | 🟡 Bỏ `row.notes` chết (gom mà không render) |
| Summary + buttons | Nhãn "Chi tiết món"/"Tổng tất cả món"; thêm "Theo dõi bàn"; sửa "Thêm món" | 🔴 `item_updated`/`item_cancelled` chưa xử lý trong `useOrderSSE` (sửa live-update) |

> Theo `CLAUDE.md`: phần sửa doc gộp 1 task; mỗi sửa code phải có dòng trong `MASTER_TASK.md` trước.
> 2 bug 🔴 đã ghi sẵn ở `ORDER_DETAIL_BUGS.md` (Bug 1 + Bug 2) nhưng CHƯA có trên `MASTER_TASK.md`.
