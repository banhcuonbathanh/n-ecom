# So Sánh Trực Quan — `/register` (staff_register)

> **Trạng thái ảnh chụp:** ⏳ CHƯA CHỤP — cần `docker compose up -d --build fe` + Playwright (iPhone
> 390×844) điều hướng tới `/register`. ASCII ②/③ dưới đây được dựng **từ code**, không phải từ ảnh.
> **Branch:** `experience_claude.md_system_1_test_iphon2_change_code` · **Ngày:** 2026-06-22
> **Lưu ý:** trang này gần như **không có drift trực quan** — ASCII trong `staff_register.md` khớp
> chính xác code. Chỉ có **một zone** (thẻ form căn giữa). Cột 💬 để trống cho chủ dự án điền.

---

## 🟢 Zone 1 — Thẻ đăng ký (Register Card)
Nguồn code: `register/page.tsx:62-127`

### ① Doc đang vẽ (`staff_register.md:17-41`)

```
┌────────────────────────────────────────────────┐
│            (full-screen centered bg)           │
│        ┌──────────────────────────────┐        │
│        │      Quán Bánh Cuốn          │ ← h1
│        │      Tạo tài khoản mới       │ ← subtitle
│        │ Tên đăng nhập                │
│        │ [__________________________] │
│        │  ⚠ inline error              │
│        │ Mật khẩu                     │
│        │ [**************************] │
│        │  ⚠ inline error              │
│        │ Xác nhận mật khẩu            │
│        │ [**************************] │
│        │  ⚠ inline error              │
│        │ [        Đăng ký          ]  │
│        └──────────────────────────────┘
└────────────────────────────────────────────────┘
```

### ② Code render THẬT

```
┌────────────────────────────────────────────────┐
│   div.min-h-screen.bg-background (căn giữa)    │ ◀── page.tsx:63
│        ┌──────────────────────────────┐        │
│        │      Quán Bánh Cuốn          │ ◀── h1  page.tsx:65-67
│        │      Tạo tài khoản mới       │ ◀── p   page.tsx:68
│        │                              │
│        │ Tên đăng nhập                │ ◀── Label page.tsx:72-74
│        │ [__________________________] │ ◀── Input autoComplete="username" :75-80
│        │  ⚠ {errors.username.message} │ ◀── chỉ hiện khi lỗi  :81-83
│        │                              │
│        │ Mật khẩu                     │ ◀── Label page.tsx:87-89
│        │ [**************************] │ ◀── Input type=password :90-95
│        │  ⚠ {errors.password.message} │ ◀── :96-98
│        │                              │
│        │ Xác nhận mật khẩu            │ ◀── Label page.tsx:103-105
│        │ [**************************] │ ◀── Input type=password :106-111
│        │  ⚠ {errors.confirm.message}  │ ◀── :112-115
│        │                              │
│        │ [        Đăng ký          ]  │ ◀── Button :118-124
│        └──────────────────────────────┘     ▲ KHÔNG có link "/login"; KHÔNG có "Họ tên"
└────────────────────────────────────────────────┘     (form kết thúc :127, file :129)
```

Trạng thái nút khi gửi (RHF `isSubmitting`, `page.tsx:120-123`):

```
idle        → [        Đăng ký          ]   (enabled)
submitting  → [   Đang tạo tài khoản…    ]   (disabled, opacity-60)
success     → (không đổi UI) → setAuth → router.push → /pos   (luôn /pos, vì BE trả role=cashier)
error       → nút bật lại; lỗi inline: USERNAME_TAKEN → field username, còn lại → field confirm
```

### ③ Đề xuất sửa doc

Không cần sửa ASCII — **doc đã vẽ đúng**. Chỉ ghi chú thêm trạng thái nút submit (idle/submitting)
nếu muốn đầy đủ.

🔴 **FLAG (bug code, không phải lỗi vẽ):** đăng ký thành công luôn tạo tài khoản **cashier** active
và đẩy về `/pos` — endpoint công khai (`main.go:169`, ngoài nhóm `protected`), role hardcode
`"cashier"` (`auth_service.go:219`), `is_active=1` (`auth_repo.go:88`). Nhánh redirect `customer→/menu`
(`page.tsx:28`) là **code chết**. Đây là quyết định sản phẩm/bảo mật — phải đăng ký MASTER trước.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng:** thẻ form 3 trường + nút "Đăng ký", không có "Họ tên", không có link "/login" |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| 1 — Thẻ đăng ký | Không cần sửa ASCII; (tùy chọn) thêm ghi chú trạng thái nút submit | 🔴 Quyết định ý định cho `/auth/register` (xóa route · chỉ `customer` · hoặc gate `AtLeast("manager")`) + xóa nhánh redirect `customer` chết |
