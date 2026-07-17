# Customer Settings — So Sánh Trực Quan (Doc vs. Code Render Thật)

> So sánh từng zone: ① tài liệu đang vẽ · ② code render THẬT (ASCII truy từ source) · ③ đề xuất sửa.
> **Code thắng.** Trang chỉ có một zone nội dung thật (form cài đặt) nên chỉ một block.
> **Trạng thái ảnh:** ⏳ **CHƯA CHỤP** — cần `docker compose up -d --build fe` + Playwright (iPhone
> 390×844). Cột 💬 luôn để trống cho chủ dự án điền.
> **Branch:** `experience_claude.md_system_1_test_iphon2_change_code` · **Ngày:** 2026-06-21

---

## 🔴 Zone — Form Cài Đặt (tên · nhãn bàn · nút lưu)
Nguồn code: `menu/settings/page.tsx:35-76`

### ① Doc đang vẽ (`customer_settings.md:11-25`)

```
┌────────────────────────────────────────────────┐
│ [←]  Cài đặt                                   │ ← header (back + title)
├────────────────────────────────────────────────┤
│ Tên của bạn                                    │
│ [ Nguyễn Văn A_____________ ]                  │ ← name input
│                                                │
│ Nhãn bàn                                       │
│ [ Bàn 03___________________ ]                  │ ← table label input
│                                                │
│ [ 💾 Lưu ]                                     │ ← save button
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ← ClientBottomNav (shell)
└────────────────────────────────────────────────┘
```

### ② Code render THẬT

```
┌────────────────────────────────────────────────┐
│ [←]  Cài đặt                                   │ ◀── page.tsx:30,32 (ArrowLeft + "Cài đặt")
├────────────────────────────────────────────────┤
│ Tên hiển thị                                   │ ◀── page.tsx:39  (KHÔNG phải "Tên của bạn")
│ [ Ví dụ: Anh Minh__________ ]                  │ ◀── page.tsx:41-48 (controlled, useState local)
│ Hiển thị trong giỏ hàng và xác nhận đơn.       │ ◀── page.tsx:49  (helper — doc không vẽ)
│                                                │
│ Nhãn bàn                                       │ ◀── page.tsx:55
│ [ Ví dụ: Bàn 3_____________ ]                  │ ◀── page.tsx:57-64
│ Hiển thị trong header menu và giỏ hàng.        │ ◀── page.tsx:65  (helper — doc không vẽ)
│                                                │
│ [ 💾  Lưu cài đặt ]                            │ ◀── page.tsx:69-75 (Save icon + "Lưu cài đặt")
│   └─ sau khi bấm → "💾 Đã lưu!" trong 2s       │ ◀── page.tsx:74 + 17-18 (KHÔNG điều hướng)
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ◀── ClientBottomNav.tsx:58-98 (khớp)
└────────────────────────────────────────────────┘
```

### ③ Đề xuất sửa doc

```
┌────────────────────────────────────────────────┐
│ [←]  Cài đặt                                   │
├────────────────────────────────────────────────┤
│ Tên hiển thị                                   │
│ [ Ví dụ: Anh Minh__________ ]                  │
│ Hiển thị trong giỏ hàng và xác nhận đơn.       │
│                                                │
│ Nhãn bàn                                       │
│ [ Ví dụ: Bàn 3_____________ ]                  │
│ Hiển thị trong header menu và giỏ hàng.        │
│                                                │
│ [ 💾  Lưu cài đặt ]  → "Đã lưu!" (2s), ở lại   │
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │
└────────────────────────────────────────────────┘
```

> 🔴 **FLAG (lệch tài liệu, KHÔNG phải lỗi code):** `customer_settings.md:37` ghi nút Lưu "navigates
> back". Thực tế `handleSave` (`page.tsx:14-19`) chỉ ghi store + hiện "Đã lưu!" 2 giây, **không điều
> hướng**. Điều hướng duy nhất là mũi tên back (`page.tsx:26`).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** màn `/menu/settings` với nhãn "Tên hiển thị", 2 dòng helper-text, nút "Lưu cài đặt"; và state sau khi bấm Lưu hiện "Đã lưu!" mà URL vẫn là `/menu/settings` |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| Form Cài Đặt | Nhãn "Tên hiển thị"; 2 dòng helper-text; nút "💾 Lưu cài đặt" + state "Đã lưu!"; bỏ "navigates back" ở Key Interactions | Không — 🔴 là lệch tài liệu, code đúng |
