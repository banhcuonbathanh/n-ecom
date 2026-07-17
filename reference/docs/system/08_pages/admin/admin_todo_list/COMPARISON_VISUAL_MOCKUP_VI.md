# So Sánh Hình Ảnh — `/admin/todo-list` (Admin To-Do List)

> **Trạng thái ảnh chụp:** ⏳ **CHƯA CHỤP** — stack đang tắt. Phần ② / ③ dưới đây dựng ASCII
> **thẳng từ code** trên nhánh `experience_claude.md_system_1_test_iphon2_change_code`; cột 📷 để
> `⏳ chưa chụp` cho tới khi chạy `docker compose up -d --build fe` + Playwright (viewport iPhone
> 390×844, đăng nhập manager → `/admin/todo-list`).
>
> Trang này **drift hình ảnh rất ít** — toàn bộ là cosmetic (🟡): tiêu đề cột bảng việc bị viết
> tắt, và nhãn nút submit ở chế độ sửa không được vẽ. Không có 🔴 hình ảnh. Cột 💬 luôn để trống —
> đó là phần của chủ sở hữu điền; mình phản hồi ở lần chạy sau. Ngày: 2026-06-24.

---

## 🟡 Zone 1 — Bảng việc View B (`TodoTaskTable`)
Nguồn code: `TodoTaskTable.tsx:26-80`

### ① Doc đang vẽ (`admin_todo_list.md:41-45`)
```
(md+) ┌──────────────────────────────────────────────────────┐
      │ Tên         │ Ưu tiên  │ Khung giờ   │ Trạng thái │ HĐ│
      │ Vệ sinh bếp │ 🔴 Cao   │ 08:00–09:00 │ [quá hạn]  │ ✏️│
      │ Kiểm kê     │ 🟡 TB    │ 2026-06-14  │ [chờ]      │ ✏️│
      └──────────────────────────────────────────────────────┘
```

### ② Code render THẬT
```
┌────────────────────────────────────────────────────────────────┐
│ Tên         │ Ưu tiên │ Khung giờ   │ Trạng thái │ Hành động   │ ◀── header "Hành động",
│ Vệ sinh bếp │ 🔴 Cao  │ 08:00 – 09:00│ [quá hạn]  │     ✏️      │     KHÔNG phải "HĐ"
│  mô tả phụ… │         │             │            │             │     (TodoTaskTable.tsx:35)
│ Kiểm kê     │ 🟡 TB   │ 2026-06-14  │ [chờ]      │     ✏️      │ ◀── ✏️ canh phải, min 44×44
└────────────────────────────────────────────────────────────────┘
  • Cột "Hành động" chỉ hiện khi canEdit=true (TodoTaskTable.tsx:35,63)
  • "Khung giờ" = dueTimeStart – dueTimeEnd, fallback dueDate (TodoTaskTable.tsx:56-58)
  • [Trạng thái] = <TaskStatusBadge> thật (TodoTaskTable.tsx:61) — không phải text thuần
  • Hàng overdue nền đỏ; tên hàng completed gạch ngang (TodoTaskTable.tsx:42,45)
```

### ③ Đề xuất sửa doc
```
      │ Tên │ Ưu tiên │ Khung giờ │ Trạng thái │ Hành động │   ◀── đổi "HĐ" → "Hành động"
```
> Không có lỗi code ở zone này — chỉ là chữ viết tắt trong ASCII. 🟡 doc-fix thuần.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần có:** header cột thứ 5 hiển thị "Hành động", và cột Trạng thái là badge màu |  |

---

## 🟡 Zone 2 — Modal Tạo/Sửa (`CreateEditTaskModal`) ở chế độ SỬA
Nguồn code: `CreateEditTaskModal.tsx:59-194`

### ① Doc đang vẽ (`admin_todo_list.md:56-65`)
```
┌────────────────────────────────────────────────┐
│ Tạo công việc mới / Sửa công việc          [✕] │
│ Tên công việc *  [..............................] │
│ Giao cho *       [Chọn nhân viên ▾]             │
│ Ưu tiên *        [🟡 Trung bình ▾]              │
│ Ngày hạn *  [──────────]  Giờ hạn * [──:──]    │
│ Bắt đầu (tùy chọn) [──:──]  Kết thúc [──:──]  │
│ Mô tả            [..............................] │
│                          [Hủy] [Lưu công việc]  │
└────────────────────────────────────────────────┘
```

### ② Code render THẬT (mode='edit', editTask != null)
```
┌────────────────────────────────────────────────┐
│ Sửa công việc                              [✕] │ ◀── tiêu đề đổi theo mode (:69)
│ Tên công việc *  [Vệ sinh bếp................]  │
│ Giao cho *       [Nguyễn A ▾]                   │
│ Ưu tiên *        [🔴 Cao ▾]                     │
│ Ngày hạn *  [2026-06-14]  Giờ hạn * [08:00]    │
│ Bắt đầu (tuỳ chọn) [08:00]  Kết thúc (tuỳ chọn) [09:00] │ ◀── "Kết thúc (tuỳ chọn)" (:153)
│ Mô tả            [.............................] │     — ASCII bỏ "(tuỳ chọn)"
│                          [Hủy] [Cập nhật]       │ ◀── nhãn "Cập nhật" KHÔNG phải
└────────────────────────────────────────────────┘     "Lưu công việc" (:187)
  • KHÔNG có ô <textarea> cho `notes` — dù schema/reset/payload đều mang `notes`
    (CreateEditTaskModal.tsx:80-193) → `notes` luôn = undefined (Flag 4)
  • Khi isSubmitting: nhãn nút = "Đang lưu..." (:187)
```

### ③ Đề xuất sửa doc
```
│ Bắt đầu (tuỳ chọn) [──:──]  Kết thúc (tuỳ chọn) [──:──] │
│                          [Hủy] [Lưu công việc / Cập nhật] │  ◀── ghi cả 2 nhãn theo mode
```
> 🔴 **Lỗi code phía sau (BUG 1, không phải drift):** nút **Cập nhật** chạy
> `createTask.mutate(...)` → `POST /admin/tasks` (`TodoPageClient.tsx:68`) → **tạo bản sao**, không
> cập nhật. Không có `PATCH /admin/tasks/:id` (`main.go:320-322`) và không có nút xoá. Phải đăng ký
> MASTER trước khi sửa. Xem `TODO_BUGS.md` Bug 1.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần có:** mở ✏️ một task → tiêu đề "Sửa công việc", nút submit ghi "Cập nhật", không có ô nhập "Ghi chú/notes" |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| Zone 1 — Bảng việc | Đổi ASCII `HĐ` → `Hành động` (`admin_todo_list.md:42`) | — (không có lỗi code) |
| Zone 2 — Modal sửa | Thêm nhãn `Cập nhật` + `Kết thúc (tuỳ chọn)` vào ASCII; ghi chú `notes` không có ô nhập | 🔴 BUG 1: thêm `PATCH /admin/tasks/:id` + nối nhánh edit (`handleModalSubmit`); BE + FE — **MASTER row bắt buộc** |
