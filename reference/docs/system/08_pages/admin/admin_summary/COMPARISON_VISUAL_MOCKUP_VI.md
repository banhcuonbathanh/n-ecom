# So Sánh Trực Quan Theo Zone — `/admin/summary` (Tổng kết nhà hàng)

> **Trạng thái ảnh chụp:** ⏳ CHƯA CHỤP — cần `docker compose up -d --build fe` + Playwright (stack
> chưa được xác nhận chạy trong phiên này). Phần ② code-render-thật bên dưới được dựng **từ code**
> (`page.tsx`), không phải từ ảnh. Cột 📷 để `⏳ chưa chụp`.
>
> **Lưu ý:** trang này drift trực quan **rất thấp** — wireframe ASCII trong `admin_summary.md` khớp gần
> như 1-đối-1 với render. Chỉ 2 zone đáng vẽ vì có ghi chú hành vi/UX (không phải sai layout): Zone A
> (nhãn KPI tĩnh khi đổi range) và Zone D (anchor thô + tách 🔴/🟡 ở phía FE). Cột 💬 để trống cho chủ
> sở hữu điền. Nhánh: `experience_claude.md_system_1_test_iphon2_change_code`.

---

## 🟡 Zone A — `SummaryKPICards`
Nguồn code: `page.tsx:58-103`

### ① Doc đang vẽ (`admin_summary.md:24-31`)
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐
│ Khách hôm nay│ │ Món đã bán   │ │ Doanh thu    │ │Bàn đang   │
│     86       │ │    240       │ │  4.250.000đ  │ │phục vụ  3 │
│lượt đặt bàn  │ │phần đã giao  │ │thanh toán    │ │confirmed/ │
│(không hủy)   │ │(delivered)   │ │completed     │ │preparing/ │
└──────────────┘ └──────────────┘ └──────────────┘ └ready──────┘
```

### ② Code render THẬT
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐
│ Khách hôm nay│ │ Món đã bán   │ │ Doanh thu    │ │Bàn đang   │  ◀── nhãn "Khách hôm nay" CỐ ĐỊNH
│     86       │ │    240       │ │  4.250.000đ  │ │phục vụ  3 │      kể cả khi range=week/month
│lượt đặt bàn  │ │phần đã giao  │ │thanh toán    │ │confirmed/ │      (page.tsx:78 — chuỗi tĩnh)
│(không hủy)   │ │(delivered)   │ │completed     │ │preparing/ │  ◀── "(delivered)" nhưng BE đếm
└──────────────┘ └──────────────┘ └──────────────┘ └ready──────┘      delivered + paid (analytics_repo.go
                                                                       dishes_sold) — caption mô tả thiếu
   value: data?.customers ?? 0   data?.dishes_sold ?? 0   formatVND(data?.revenue ?? 0)   data?.active_tables ?? 0
                                                                  ◀── active_tables LIVE, độc lập range
                                                                      (analytics_repo.go:92-96, không lọc ngày)
```

### ③ Đề xuất sửa doc
```
Doc đã chính xác về layout — chỉ cần giữ 3 ghi chú flag (đã có trong admin_summary.md Flags 1,2,5):
  • nhãn "Khách hôm nay" tĩnh cho mọi range
  • "(delivered)" = thực ra delivered + paid
  • "Bàn đang phục vụ" là số live, đổi range không đổi giá trị
FLAG 🟡 (code, tùy chọn): cân nhắc đổi nhãn động theo range ("Khách tuần này"/"Khách tháng này")
  để khớp value — KHÔNG bắt buộc, đăng ký MASTER trước nếu làm.
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** đổi range Tuần/Tháng và xác nhận nhãn thẻ #1 vẫn là "Khách hôm nay" |  |

---

## 🟡 Zone D — `StockAlertList`
Nguồn code: `page.tsx:292-361`

### ① Doc đang vẽ (`admin_summary.md:43-49`)
```
D  Cảnh báo tồn kho                      Xem toàn bộ kho →
   🔴 Mộc nhĩ   còn 0.2 kg / min 1 kg    [ + Nhập hàng ]
      ▓▓ (red bar — below threshold)
   🟡 Tôm tươi  còn 1.1 kg / min 1 kg    [ + Nhập hàng ]
      ▓▓▓▓▓▓▓▓▓ (yellow bar — within 1.2× threshold)
```

### ② Code render THẬT
```
Cảnh báo tồn kho                         Xem toàn bộ kho →   ◀── <a href> THÔ (page.tsx:304),
                                                                  KHÔNG phải next/link → reload cả trang
🔴 Mộc nhĩ      còn 0.2 kg / min 1 kg        [ + Nhập hàng ]  ◀── isCritical = quantity < warningThreshold
   ▓▓ (bg-red-50, bar bg-red-400)                                (page.tsx:318) — TÁCH 🔴/🟡 thuần FE;
🟡 Tôm tươi     còn 1.1 kg / min 1 kg        [ + Nhập hàng ]      BE chỉ trả list <= min_stock*1.2,
   ▓▓▓▓▓▓▓ (bg-yellow-50, bar bg-yellow-400)                     không có khái niệm "vàng" vs "đỏ"

   pct = warningThreshold>0 ? min(quantity/warningThreshold*100, 100) : 100   (page.tsx:319)
   nút "+ Nhập hàng" → setModalIng(ing) → mở StockInModal overlay (page.tsx:342-358)
```

### ③ Đề xuất sửa doc
```
Doc đã chính xác về layout + đã nêu đúng "split FE-side" (Flag 3) và "<a> thô" (Flag 6).
FLAG 🟡 (code): thay <a href="/admin/ingredients"> bằng <Link> next/link để điều hướng SPA,
  tránh reload toàn trang — đăng ký MASTER trước.
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** click "Xem toàn bộ kho →" và xác nhận trình duyệt reload cả trang (không phải chuyển SPA) |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| A — `SummaryKPICards` | Không cần (flag đã đầy đủ) | Tùy chọn: nhãn động theo range |
| D — `StockAlertList` | Không cần (flag đã đầy đủ) | Thay `<a>` bằng `next/link` `<Link>` (page.tsx:304); thêm `isError` cho các `useQuery` |
