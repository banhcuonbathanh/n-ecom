# KDS (Màn Hình Bếp) — So Sánh Trực Quan (Mockup) `/kds`

> **Cách đọc:** mỗi zone có ① tài liệu đang vẽ · ② code render THẬT (ASCII trace từ source, có
> chú thích `◀──` chỉ `file:line` + nguồn dữ liệu thật) · ③ đề xuất sửa. Cột 📷 là ảnh chụp thật,
> cột 💬 để **bạn** điền feedback (mình để trống — sẽ phản hồi ở lần chạy sau).
> **Trạng thái ảnh: ⏳ CHƯA CHỤP** — cần `docker compose up -d --build fe` + Playwright (stack đang
> không chạy trong lần audit này). ASCII ②/③ được dựng từ code, không bịa ảnh.
> Nhánh: `experience_claude.md_system_1_test_iphon2_change_code` · Ngày: 2026-06-22.
> Nguồn render duy nhất: `fe/src/app/(dashboard)/kds/page.tsx`.

---

## 🔴 Zone 1 — Order Card (header bàn + dòng món + picker + nút)
Nguồn code: `kds/page.tsx:203-305`

### ① Doc đang vẽ (`staff_kds.md:24-37`)

```
┌─────────────────────────┐
│▌ Bàn <UUID>  #BC-42     │   ← tài liệu đã ghi "shows UUID not table_name"
│  [Đã xác nhận]  12 phút │
│                         │
│  ● Bánh cuốn            │
│    · thịt   còn ×2      │
│  ● Canh mọc             │
│    · không rau  còn ×1  │
│  3 món · 3 phần còn lại │
│  ┌──inline status picker──────┐
│  │ [✓ Phục vụ] [🛍 Mang đi] [Huỷ] │
│  └────────────────────────────┘
│  [🔍 Kiểm tra]  [Trạng thái ▼]  │
└─────────────────────────┘
```

### ② Code render THẬT

```
┌──────────────────────────────────────┐
│ ▌ Bàn 5f3a8c2e-…-uuid  #BC-42  [Đã xác nhận]   12 phút │
│ ▲                      ▲       ▲                ▲       │
│ │urgencyBarClass(mins) │       │statusBadge     │urgencyTextClass(mins)
│ │ :212 (THIẾU trong doc)│order_number :216  :217-219    :220-222
│ └ order.table_id (UUID) :214  ◀── 🔴 Bug 2: KHÔNG dùng table_name
│                                                        │
│   ● Bánh cuốn · thịt              còn ×2  ◀── kdsVariant() :240-242
│   ● Canh mọc · không rau          còn ×1  (· nhãn = text-primary :241)
│        ▲ chấm done? bg-green-500 : bg-muted-fg  :237
│   3 món · 3 phần còn lại                  ◀── :251-253
│                                                        │
│   [✓ Phục vụ] [🛍 Mang đi] [Huỷ]  ◀── picker, CHỈ hiện khi isStatusOpen :257-278
│        cả hai gửi {status:'ready'} :260,266 · Huỷ {cancelled} :272
│   [🔍 Kiểm tra]   [Trạng thái ▲/▼]  ◀── hàng nút :280-304 (caret đổi chiều :301)
└──────────────────────────────────────┘
   click vào CẢ DÒNG MÓN → patchItemStatus :234 → PATCH /orders/:id/items/:id/status
                                                 ◀── 🔴 Bug 1: 404, route không tồn tại
```

### ③ Đề xuất sửa doc

```
┌──────────────────────────────────────┐
│ ▌ Bàn 03  #BC-42  [Đã xác nhận]  12 phút │   ← VẼ thanh dọc màu urgency (▌) ở đầu
│   (sau khi sửa code Bug 2: table_name)   │   ← VẼ màu chữ "12 phút" theo urgency
│   ● Bánh cuốn · thịt   còn ×2            │
│   3 món · 3 phần còn lại                 │
│   [✓ Phục vụ] [🛍 Mang đi] [Huỷ]  (chỉ khi mở picker)
│   [🔍 Kiểm tra]  [Trạng thái ▼]          │
└──────────────────────────────────────┘
```
🔴 **FLAG code Bug 1 (`kds/page.tsx:160-161`)** — click dòng món PATCH path 5-đoạn không tồn tại →
404, `còn ×N` không bao giờ giảm từ KDS. Route đúng: `PATCH /orders/items/:id` `{qty_served}`
(`main.go:263`).
🔴 **FLAG code Bug 2 (`kds/page.tsx:214`)** — header render UUID; sửa `order.table_name ?? order.table_id`.
🟡 **Doc thiếu** thanh dọc màu urgency (`:212`) và màu chữ thời gian (`:220`); caret `▼` đổi `▲` khi mở (`:301`).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![KDS card thật](./screenshots/card_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright. **Bằng chứng cần chụp:** header hiện `Bàn <uuid>` thật + thanh dọc màu + click dòng món ra toast lỗi |  |

---

## 🟡 Zone 2 — Empty / Loading state (không phân biệt được)
Nguồn code: `kds/page.tsx:182-188`

### ① Doc đang vẽ (`staff_kds.md:39`)

```
Empty-state: "Không có đơn nào đang chờ 🍜" (giữa màn hình)
```

### ② Code render THẬT

```
┌──────────────────────────────────────┐
│                                        │
│        Không có đơn nào đang chờ 🍜    │  ◀── :185 (min-h-screen flex center)
│                                        │
└──────────────────────────────────────┘
   Render cho CẢ BA tình huống (loading_md Flag 1-2):
     • query đang chạy (isLoading không đọc :102)
     • query thành công, không có đơn active
     • query lỗi (isError không đọc :102)  ◀── không phân biệt được
   Không spinner · không nút thử lại · không banner WS rớt (:114 chỉ lấy subscribe)
```

### ③ Đề xuất sửa doc

```
Doc đã đúng về CHỮ. Nên ghi chú thêm: cùng một màn này = loading = rỗng = lỗi
(loading_md đã ghi đúng — không cần sửa, chỉ tham chiếu).
```
🟡 **FLAG code (gap, không phải drift):** `kds/page.tsx:102` chỉ destructure `data` → đầu bếp không
phân biệt được board đang tải, rỗng, hay hỏng. Cũng không có auth guard tầng route
(`(dashboard)/layout.tsx` chỉ có `OrdersWSProvider`).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![KDS empty thật](./screenshots/empty_real.png)<br>⏳ chưa chụp — cần stack. **Bằng chứng cần chụp:** màn rỗng lúc tải khớp y màn rỗng khi hết đơn |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| 1 — Order Card | Vẽ thanh dọc màu urgency + màu chữ thời gian + caret ▲/▼ vào `staff_kds.md` ASCII | 🔴 Bug 1 tap-to-serve 404 (`page.tsx:159-163`) · 🟠 Bug 2 table_name (`page.tsx:214`) |
| 2 — Empty/Loading | Ghi chú loading=rỗng=lỗi không phân biệt (loading_md đã có) | 🟡 thêm `isLoading`/`isError`; cân nhắc auth guard tầng route |
| (cross) — WS badge | 🔴 Sửa `crosspage §1`: active transition KHÔNG cập nhật badge trực tiếp | 🟡 (tuỳ chọn) thêm nhánh patch status trong WS handler `page.tsx:149-154` |
