# Customer Tracking — So Sánh Hình Vẽ (Doc vs. Code) 🇻🇳

> **Trạng thái ảnh chụp:** ⏳ CHƯA CHỤP — cần `docker compose up -d --build fe` + Playwright (iPhone
> 390×844, flow QR → đặt món → `/tracking`). ASCII ② và ③ dưới đây được dựng **trực tiếp từ code**
> trên branch `experience_claude.md_system_1_test_iphon2_change_code`, không phải từ doc.
> Mỗi zone: ① doc đang vẽ · ② code render THẬT · ③ đề xuất sửa. Cột 💬 để **chủ dự án** tự điền.
> Đây là audit **chỉ đọc** — không sửa code, không sửa doc-set của trang.

---

## 🔴 Zone 1 — OrderDetailCard
Nguồn code: `OrderDetailCard.tsx:18-77`

### ① Doc đang vẽ (`customer_tracking.md:22-25`, Zones `:47`)
```
┌────────────────────────────────────────────┐
│ OrderDetailCard                            │ ← "items + progress of own order"
│ • Bánh cuốn thịt   ra 1/2                  │
│ • Canh mọc         còn 1                   │
└────────────────────────────────────────────┘
```

### ② Code render THẬT
```
┌────────────────────────────────────────────┐
│ Chi tiết đơn hàng: #BC-0042                 │ ◀── order_number (OrderDetailCard.tsx:27-29)
│ BC-0042 · Bàn 03 · Đặt lúc 19:42:05         │ ◀── created_at formatTime (:30-32)
├────────────────────────────────────────────┤
│ x2  Bánh cuốn thịt              42.000 ₫    │ ◀── x{quantity} + name + unit_price*qty (:41-60)
│     + Mọc nhĩ · + Chả                       │ ◀── toppings_snapshot (:46-56)
│ x1  Canh mọc                    15.000 ₫    │
├────────────────────────────────────────────┤
│ Tổng cộng · 3 sản phẩm          57.000 ₫    │ ◀── totalQty + total_amount (:67-74)
└────────────────────────────────────────────┘
```
> KHÔNG có "ra 1/2" / "còn 1": component không render `qty_served` / tiến độ nấu. Nó hiển thị
> **số lượng × tên × topping × giá** + dòng tổng. Combo header (₫0) bị lọc (`:19-21`).

### ③ Đề xuất sửa doc
Vẽ lại ASCII thành danh sách món có **giá** + dòng **tổng cộng** (như ②) và sửa ô Zones từ
"items + progress" → "items + prices".
> 🔴 **FLAG (code):** tiến độ nấu theo từng món không tồn tại ở đây; mà dù có thêm, Flag 1+2 khiến
> nó cũng không cập nhật realtime. Đăng ký MASTER trước nếu muốn thêm tiến độ.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![OrderDetailCard thật](./screenshots/orderdetailcard_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** card hiển thị giá từng dòng + tổng, KHÔNG có "ra 1/2" |  |

---

## 🔴 Zone 2 — WholeFloorPrepList
Nguồn code: `WholeFloorPrepList.tsx:13-86`

### ① Doc đang vẽ (`customer_tracking.md:27-32`)
```
┌────────────────────────────────────────────┐
│ WholeFloorPrepList — hàng đợi toàn quán    │
│ 1. Bàn 01  ▓▓▓▓░░                          │
│ 2. Bàn 03  ▓▓░░░░   ← bạn                  │
│ 3. Mang về ░░░░░░                          │
└────────────────────────────────────────────┘
```

### ② Code render THẬT
```
┌────────────────────────────────────────────┐
│ Hàng chờ phục vụ                  [3 bàn]   │ ◀── header + count activeItems (:27-32)
├────────────────────────────────────────────┤
│ ①  Bàn 01   [Đang chuẩn bị]          #0039 │ ◀── pos# + tableLabel + StatusBadge + suffix (:56-79)
│ ②  Bàn 03 (bàn bạn)  [Chờ xác nhận]  #0042 │ ◀── isOwn → viền primary + "(bàn bạn)" (:53,64-68)
│ ③  Bàn 05   [Sẵn sàng phục vụ]       #0041 │
└────────────────────────────────────────────┘
```
> KHÔNG có thanh tiến độ `▓▓▓▓░░`. Mỗi dòng = **số thứ tự + nhãn bàn + StatusBadge
> (`statusColors`/`statusLabel`) + đuôi số đơn**. Không có dòng "Mang về" riêng; sắp xếp theo
> `createdAt` tăng dần (`:16-22`); chỉ hiện status active `pending/confirmed/preparing/ready` (`:6,17`).

### ③ Đề xuất sửa doc
Vẽ lại ASCII thành các dòng có **StatusBadge** (như ②), bỏ thanh `▓▓▓▓░░` và dòng "Mang về".
> 🔴 **FLAG (doc):** thanh tiến độ trong wireframe chưa bao giờ được code — đây là drift hình vẽ thuần.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![WholeFloorPrepList thật](./screenshots/wholefloorpreplist_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** các dòng có badge trạng thái, KHÔNG có thanh fill; dòng "bàn bạn" có viền cam |  |

---

## 🟡 Zone 3 — TableInfoBanner
Nguồn code: `TableInfoBanner.tsx:12-61`

### ① Doc đang vẽ (`customer_tracking.md:17-21`)
```
┌────────────────────────────────────────────┐
│ Bàn 03 · [preparing]                       │
│ Vị trí hàng đợi: 2/5 · ước tính ~8 phút    │
└────────────────────────────────────────────┘
```

### ② Code render THẬT
```
┌────────────────────────────────────────────┐
│ ┌────┐  Trạng thái: [Đang chuẩn bị] ~8 phút │ ◀── ô Bàn + label + StatusBadge + ETA (:18-41)
│ │ BÀN│  Vị trí hàng chờ: #2 trong 5 đơn      │ ◀── "hàng chờ" (không phải "hàng đợi") (:44-49)
│ │ 03 │             | Chờ ~8 phút             │ ◀── ETA chỉ hiện khi >0 (:50-52)
│ └────┘                                       │
└────────────────────────────────────────────┘
   (khi status = 'delivered' → "Đơn của bạn đã được phục vụ — Cảm ơn!")  ◀── nhánh riêng (:24-27)
```
> Khác biệt nhỏ: ô **"Bàn"** tách riêng + nhãn **"Trạng thái:"** + `StatusBadge`; chữ là
> **"hàng chờ"** không phải "hàng đợi"; có **nhánh `delivered`** mà ASCII không vẽ; ETA `~X phút`
> chỉ hiện khi `estimatedMinutes > 0`, nhấp nháy khi `queuePosition === 1` (`:33-41`).

### ③ Đề xuất sửa doc
Sửa chữ ASCII: "hàng đợi" → "hàng chờ", thêm dòng trạng thái `delivered`.
> (Không có bug code — đây là drift chữ/cấu trúc hình vẽ.)

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![TableInfoBanner thật](./screenshots/tableinfobanner_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** ô "Bàn" tách riêng + nhãn "Trạng thái:" + dòng "hàng chờ" |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| 1 · OrderDetailCard | Vẽ lại ASCII = list giá + tổng; sửa ô Zones "items + prices" | (tuỳ chọn) thêm tiến độ nấu — chặn bởi Flag 1+2 |
| 2 · WholeFloorPrepList | Vẽ lại ASCII = dòng StatusBadge; bỏ thanh fill + "Mang về" | — |
| 3 · TableInfoBanner | Sửa "hàng đợi"→"hàng chờ"; thêm nhánh `delivered` | — |
| (chung) | — | Flag 1 (1 dòng FE): `case 'order_status_changed'` trong `useOrderMonitorSSE.ts:67` |
