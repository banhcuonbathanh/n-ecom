# Admin Overview — So Sánh Hình Vẽ (Doc ① · Code ② · Đề xuất ③)

> **Trạng thái ảnh chụp: ⏳ CHƯA CHỤP** — stack chưa chạy. Phần ②/③ dưới đây vẽ từ **code thực tế**
> (đọc nguồn, không nhớ); cột 📷 để `⏳ chưa chụp — cần \`docker compose up -d --build fe\` + Playwright`.
> Cột 💬 **để trống** — đó là phần của bạn; lần chạy sau mình đọc feedback rồi sửa.
>
> Branch: `experience_claude.md_system_1_test_iphon2_change_code`. **Code thắng.**
> Chi tiết đầy đủ → [COMPARISON_DOC_VS_CODE_DETAILED.md](COMPARISON_DOC_VS_CODE_DETAILED.md) ·
> [bản VI](COMPARISON_DOC_VS_CODE_DETAILED_VI.md).

---

## 🔴 Zone B — WaitingSection
Nguồn code: `WaitingSection.tsx:9,40-270` · wiring `page.tsx:309-324`

### ① Doc đang vẽ (`admin_overview.md:25-27`)

```
│ B  WaitingSection — TẤT CẢ đơn active (pending→delivered)        │
│    ┌ Bàn 03 #BC-42 [pending] 2m  [Xác nhận][Kiểm tra][Huỷ] ┐     │
│    └ Bàn 01 #BC-40 [preparing] 14m  [→ ready] …            ┘     │
```
→ Doc hứa: hiển thị **mọi** đơn active từ `pending` tới `preparing`, và mỗi dòng có nút **[Huỷ]**.

### ② Code render THẬT

```
┌────────────────────────────────────────────────────────────────┐
│ Danh sách bàn cần chuẩn bị          ◀── tiêu đề thật,           │
│ 2 bàn · 3 loại món · 9 phần còn lại     KHÔNG phải "tất cả đơn"  │
│                                            (WaitingSection.tsx:101)│
├──── Bàn │ Trạng thái │ Mã đơn │ Thời gian │ Còn lại │ Thao tác ──┤
│ Bàn 03 ▼│ [pending]  │ BC-42  │ 2 phút    │ phở ×2  │ [🔍][Xác nhận]│
│ Bàn 05 ▼│ [pending]  │ BC-43  │ 5 phút    │ …       │ [🔍][Xác nhận]│
└────────────────────────────────────────────────────────────────┘
   ▲ CHỈ status === 'pending' (PREP_STATUSES, WaitingSection.tsx:9,55)
   ▲ confirmed/preparing/ready/delivered KHÔNG bao giờ xuất hiện ở đây
   ▲ Thao tác = 🔍 Kiểm tra (:186) + 1 nút advance (:195-200) — KHÔNG có [Huỷ]
```

### ③ Đề xuất sửa doc

```
│ B  WaitingSection — "Danh sách bàn cần chuẩn bị" (CHỈ pending)   │
│    ┌ Bàn 03 #BC-42 [pending] 2m   [🔍 Kiểm tra][Xác nhận] ┐      │
│    └ Bàn 05 #BC-43 [pending] 5m   [🔍 Kiểm tra][Xác nhận] ┘      │
│    (đơn đã Xác nhận biến mất khỏi zone này ngay lập tức)         │
```
🔴 **FLAG (chỉ là drift tài liệu, không phải bug code):** doc vẽ sai phạm vi + thêm nút [Huỷ] không
tồn tại. Sửa cả comment `page.tsx:309` ("all active orders" → "pending only").

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng:** ảnh sẽ chứng minh header "Danh sách bàn cần chuẩn bị" + chỉ có dòng `pending` + không có nút Huỷ |  |

---

## 🔴 Zone D — TableList (nút trên đơn `delivered`)
Nguồn code: `TableList.tsx:364-388` · wiring `page.tsx:376-378`

### ① Doc đang vẽ (`admin_overview.md:32-34, 51`)

```
│ D  Danh sách bàn                    [☰ list | ▦ grid] toggle     │
│    TableList / TableGrid — mỗi bàn: đơn active, trạng thái,      │
│    hành động (thanh toán xong / huỷ)                             │
```
→ Doc hứa: mỗi bàn có hành động "thanh toán xong / huỷ"; cả hai view list & grid.

### ② Code render THẬT (đơn `delivered`)

```
┌──── Bàn │ Thời gian │ Thao tác ───────────────────────────────┐
│ Bàn 02  │ 18 phút   │ [Đã thanh toán 💰]  [Huỷ ✕]             │
└─────────────────────────────────────────────────────────────┘
   ▲ [Đã thanh toán] → PaymentModal → POST /payments (đúng)
   ▲ [Huỷ ✕] → onCancel → handleAction(id,'cancelled')
              → PATCH /orders/:id/status {cancelled}
              ✗ BE validTransitions: delivered → CHỈ {paid}
                (order_service.go:524-529) → 409 INVALID_STATUS_TRANSITION
              ✗ toast chung "Không thể cập nhật trạng thái" giấu nguyên nhân
   ▲ Lưu ý: TableGrid (view ▦) KHÔNG nhận onPaymentDone/onCancel
            (page.tsx:381-390) → grid không pay/huỷ được
```

### ③ Đề xuất sửa doc + code

```
│ D  TableList (view ☰ mặc định): đơn delivered → [Đã thanh toán 💰]│
│    (KHÔNG có [Huỷ] — delivered chỉ đi tới paid)                  │
│    TableGrid (view ▦): chỉ xem + advance, KHÔNG pay/huỷ          │
```
🔴 **FLAG bug code thật:** xoá/disable nút [Huỷ] trên đơn `delivered` (`TableList.tsx:378-385`) —
phải đăng ký MASTER_TASK trước khi sửa. Cancel chỉ hợp lệ từ `pending`/`confirmed`/`preparing`.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng:** bấm [Huỷ] trên đơn delivered → toast lỗi (network 409) |  |

---

## 🟡 Zone A — Thẻ thống kê thứ 4
Nguồn code: `StatCards.tsx:44-49`

### ① Doc đang vẽ (`admin_overview.md:21-23`)

```
│ A ┌Bàn đang phục vụ┐┌Món chờ làm┐┌Món đang làm┐┌Khẩn cấp/Cảnh báo┐│
│   │   4 / 6 bàn    ││     7     ││     3      ││       1        ││
│   └────────────────┘└───────────┘└────────────┘└────────────────┘│
```
→ Doc vẽ thẻ thứ 4 là **một** số ("1").

### ② Code render THẬT

```
┌Khẩn cấp / Cảnh báo──────┐
│        1 / 2            │  ◀── render `{urgent} / {warning}` (StatCards.tsx:44-49)
│  >20 phút / 10–20 phút  │  ◀── sub-text 2 ngưỡng, không phải 1 số
└─────────────────────────┘
```

### ③ Đề xuất sửa doc

```
│┌Khẩn cấp/Cảnh báo┐  →  hiển thị "X / Y"  (khẩn cấp >20' / cảnh báo 10–20')│
││     1 / 2       │                                                       │
│└─────────────────┘                                                       │
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright |  |

---

## 🟡 Zone E/F — PaidLog & CancelLog (accordion thu gọn)
Nguồn code: `PaidLog.tsx:15-16`, `CancelLog.tsx:15`

### ① Doc đang vẽ (`admin_overview.md:36-37`)

```
│ E  PaidLog — đơn đã thanh toán hôm nay                           │
│ F  CancelLog — đơn đã huỷ hôm nay                                │
```
→ Doc vẽ E/F như **section luôn hiển thị**, mở sẵn.

### ② Code render THẬT

```
┌─────────────────────────────────────────────────────────────┐
│ ▸ Đơn đã thanh toán hôm nay              [badge: n]          │  ◀── useState(false)
└─────────────────────────────────────────────────────────────┘     PaidLog.tsx:16
┌─────────────────────────────────────────────────────────────┐     (đóng mặc định)
│ ▸ Đơn đã huỷ hôm nay                     [badge: n]          │  ◀── CancelLog.tsx:15
└─────────────────────────────────────────────────────────────┘
   ▲ Phải BẤM header mới mở; query ['orders','history'] enabled:open (PaidLog.tsx:21)
   ▲ badge đếm = 0 cho tới khi mở lần đầu (lazy fetch)
```

### ③ Đề xuất sửa doc

```
│ E ▸ PaidLog (accordion, đóng mặc định) — bấm để mở + fetch lazy │
│ F ▸ CancelLog (accordion, đóng mặc định) — cùng query history   │
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| B WaitingSection | Vẽ lại là hàng chờ "pending only", xoá nút [Huỷ] khỏi wireframe; sửa comment `page.tsx:309` | — (component đúng; chỉ comment lệch) |
| D TableList delivered | Ghi rõ delivered chỉ có [Đã thanh toán]; grid không pay/huỷ | 🔴 Xoá/disable [Huỷ] trên `delivered` (`TableList.tsx:378-385`) |
| A StatCards | Đổi thẻ thứ 4 thành "X / Y" | — |
| E/F Logs | Vẽ là accordion đóng mặc định | — |
