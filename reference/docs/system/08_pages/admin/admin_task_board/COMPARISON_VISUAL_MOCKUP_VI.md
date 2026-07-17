# Admin Task Board — So Sánh Hình Vẽ Theo Zone (VI)

> **Trạng thái ảnh: ⏳ CHƯA CHỤP** — stack chưa chạy. Mỗi zone dưới đây có ① ASCII tài liệu đang vẽ ·
> ② ASCII code render THẬT (trace `file:line`) · ③ đề xuất sửa. Cột 📷 để trống chờ chụp thật bằng
> `docker compose up -d --build fe` + Playwright. Cột 💬 là của bạn — mình phản hồi ở lần chạy sau.
> Chỉ liệt kê các zone có drift hình thật (Zone C/D/E — các 🔴 của Vùng 1). Nhánh:
> `experience_claude.md_system_1_test_iphon2_change_code`. Ngày: 2026-06-24.

---

## 🔴 Zone C — StaffTaskFilterBar
Nguồn code: `StaffTaskFilterBar.tsx:31-58` · `page.tsx:84`

### ① Doc đang vẽ (`admin_task_board.md:17`)
```
┌──────────────────────────────────────────────────────────────────┐
│ C  [📅 12/06/2026 ▾]  (filters)                                  │
└──────────────────────────────────────────────────────────────────┘
```

### ② Code render THẬT
```
┌──────────────────────────────────────────────────────────────────┐
│ C  [📅 2026-06-24]  [Vai trò: Tất cả ▾]  [Trạng thái: Tất cả ▾]   │
│    [🔍 Tìm theo tên nhân viên...........]                          │
└──────────────────────────────────────────────────────────────────┘
    ◀── 4 control, không phải 1 (StaffTaskFilterBar.tsx:31-58)
    ◀── role/status/search nuôi useMemo lọc client (page.tsx:49-59)
    ◀── option status (pending/in_progress/completed/overdue) gần như CHẾT:
        chỉ nhánh 'overdue' chạy, mà overdue luôn false (Bug 1+4)
```

### ③ Đề xuất sửa doc
```
│ C  [📅 ngày]  [Vai trò ▾]  [Trạng thái ▾]  [🔍 Tìm tên]          │
```
> 🔴 FLAG (code, đăng ký MASTER trước): bộ lọc Trạng thái chết (Bug 4) — bỏ 3 option
> pending/in_progress/completed, hoặc bổ sung dữ liệu mỗi-status; `overdue` vô dụng đến khi Bug 1 fix.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** thanh lọc có 4 control |  |

---

## 🔴 Zone D — KPI Cards (inline trong page.tsx)
Nguồn code: `page.tsx:87-109` · `KPICard.tsx`

### ① Doc đang vẽ (`admin_task_board.md:19-20`)
```
┌Tổng việc┐ ┌Chờ làm┐ ┌Đang làm┐ ┌Hoàn thành┐
│   18    │ │   5   │ │   4    │ │    9     │
```

### ② Code render THẬT
```
┌Tổng công việc hôm nay┐ ┌Hoàn thành┐ ┌Đang thực hiện┐ ┌Quá hạn┐
│        18            │ │  9   [✓] │ │     4        │ │ 0  [!]│
└─────────────────────┘ └──────────┘ └──────────────┘ └───────┘
   ◀── nhãn thật: "Tổng công việc hôm nay / Hoàn thành / Đang thực hiện / Quá hạn"
       (page.tsx:89,93,99,104) — KHÔNG có thẻ "Chờ làm"
   ◀── "Hoàn thành" có badge ✓ success; "Quá hạn" có badge ! danger (page.tsx:95-96,106-107)
   ◀── trên DB thật: Hoàn thành/Đang thực hiện/Quá hạn = 0 VĨNH VIỄN (Bug 1)
```

### ③ Đề xuất sửa doc
```
┌Tổng công việc hôm nay┐ ┌Hoàn thành ✓┐ ┌Đang thực hiện┐ ┌Quá hạn !┐
│        18            │ │     0       │ │      0       │ │    0    │
```
> 🔴 FLAG (code, đăng ký MASTER trước): 3 KPI cuối luôn 0 vì status không bao giờ rời `pending`
> (Bug 1 — không có `UPDATE staff_tasks` / không route đổi status). Vẽ "0" cho đúng thực tế DB.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** 4 nhãn thật + 3 thẻ cuối = 0 |  |

---

## 🔴 Zone E — StaffTaskTable
Nguồn code: `StaffTaskTable.tsx:60-160` · `ExpandedTaskList.tsx` (Zone F bên trong)

### ① Doc đang vẽ (`admin_task_board.md:22-28`)
```
┌──────────────────────────────────────────────────────────┐
│ ▸ chef01      5 việc   2 hoàn thành                      │
│ ▾ cash02      4 việc   3 hoàn thành                      │
│    · Kiểm kê nguyên liệu   [đang làm]   21:00            │
│    · Lau quầy thu ngân     [hoàn thành] 18:00            │
│ ▸ manager     2 việc   1 hoàn thành                      │
└──────────────────────────────────────────────────────────┘
```

### ② Code render THẬT
```
┌────────────┬────────┬─────────┬─────────┬───────┬────────────┬──────────────────────┐
│ Nhân viên  │ Vai trò│ Được giao│ Hoàn thành│ Tỷ lệ %│ Chất lượng │ Thao tác             │
├────────────┼────────┼─────────┼─────────┼───────┼────────────┼──────────────────────┤
│ ▸ chef01   │ [Đầu bếp]│   5    │    0    │  0%   │ ★ 0.0 /5.0 │ [Xem việc] [Giao việc]│
│ ▾ cash02 ! │ [Thu ngân]│  4    │    0    │  0%   │ ★ 0.0 /5.0 │ [Ẩn]      [Giao việc]│
│   └─ Zone F: Tên · Ưu tiên · Giờ · Trạng thái · Ghi chú (ExpandedTaskList.tsx:39-44)  │
└────────────┴────────┴─────────┴─────────┴───────┴────────────┴──────────────────────┘
   ◀── 7 cột, không phải 2 (StaffTaskTable.tsx:64-71)
   ◀── cột "Chất lượng ★" = qualityScore BỊA = completionRate/20 (QualityStars :29-39, Bug 2)
   ◀── "Tỷ lệ %" / "Hoàn thành" luôn 0 (Bug 1); "!" + nền cam khi hasOverdue (:82-97, dead)
   ◀── mỗi dòng có nút Xem công việc/Ẩn + Giao việc (:122-139)
   ◀── Zone F (ExpandedTaskList) là 5 cột, doc vẽ 3 + thiếu dòng trong bảng Zones
```

### ③ Đề xuất sửa doc
```
│ Nhân viên │ Vai trò │ Được giao │ Hoàn thành │ Tỷ lệ % │ Chất lượng │ Thao tác        │
│ ▸ chef01  │ Đầu bếp │     5     │     0      │   0%    │ ★ 0.0/5.0  │ Xem · Giao việc │
│   Zone F (mở rộng): Tên · Ưu tiên · Giờ(dải HH:MM–HH:MM) · Trạng thái · Ghi chú       │
```
> 🔴 FLAG (code, đăng ký MASTER trước): cột "Chất lượng" (Bug 2) và "Hoàn thành/Tỷ lệ %" (Bug 1) là
> dữ liệu không có thật — hoặc bỏ cột, hoặc làm cho status di chuyển được. Lỗi mở rộng không có nút retry.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** bảng 7 cột + dòng mở rộng 5 cột |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| C — FilterBar | Vẽ 4 control (date/role/status/search) | Bỏ 3 option lọc status chết (Bug 4) |
| D — KPI Cards | 4 nhãn thật, xóa "Chờ làm", vẽ 3 thẻ cuối = 0 | Thêm đường chuyển status để KPI khác 0 (Bug 1) |
| E — StaffTable | Vẽ bảng 7 cột + thao tác; Zone F 5 cột + thêm vào bảng Zones; bỏ "inline retry" | Bỏ cột Chất lượng bịa (Bug 2); (Bug 1 nuôi Hoàn thành/Tỷ lệ); thêm nút retry mở rộng |
