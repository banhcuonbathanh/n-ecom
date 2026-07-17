# Staff Login `/login` — So Sánh Hình Vẽ (Doc ① · Code ② · Đề Xuất ③)

> **Trạng thái ảnh chụp: ⏳ CHƯA CHỤP** — stack chưa chạy trong phiên này (cần
> `docker compose up -d --build fe` + Playwright). Phần ②/③ ASCII dựng **từ code thật** trên branch
> `experience_claude.md_system_1_test_iphon2_change_code`; cột 📷 để trống chờ chụp.
>
> Trang `/login` chỉ có **một zone** (thẻ đăng nhập canh giữa) — không có modal, không có nhiều vùng,
> nên file này chỉ một block. Drift duy nhất là **chỗ hiển thị lỗi dưới ô Mật khẩu**: wireframe vẽ
> thông báo lỗi API vào đúng vị trí lẽ ra là lỗi Zod, và **không** vẽ thông báo Zod `min(6)` thật.
> Đây là 🟡 (sửa doc), **không** phải lỗi code. Toàn trang không có 🔴.

---

## 🟡 Zone 1 — Login Card
Nguồn code: `fe/src/app/(auth)/login/page.tsx:62-119`

### ① Doc đang vẽ (`staff_login.md:12-34`)

```
┌──────────────────────────────┐
│      Quán Bánh Cuốn          │ ← display heading
│   Đăng nhập để tiếp tục      │
│                              │
│ Tên đăng nhập                │
│ [__________________________] │
│  ⚠ Tối thiểu 3 ký tự         │ ← inline Zod error (đúng)
│                              │
│ Mật khẩu                     │
│ [__________________________] │
│  ⚠ Tên đăng nhập hoặc mật    │ ← VẼ SAI: đây là lỗi API,
│     khẩu không đúng          │    không phải lỗi Zod của ô này
│                              │
│ [       Đăng nhập         ]  │
│                              │
│ Chưa có tài khoản? Đăng ký   │ ← → /register
└──────────────────────────────┘
```

### ② Code render THẬT

```
┌──────────────────────────────┐   ◀── div.bg-card rounded-2xl max-w-sm  (page.tsx:64)
│      Quán Bánh Cuốn          │   ◀── h1 font-display text-2xl center   (page.tsx:65-67)
│   Đăng nhập để tiếp tục      │   ◀── p text-muted-fg center            (page.tsx:68)
│                              │
│ Tên đăng nhập                │   ◀── Label htmlFor=username            (page.tsx:72-74)
│ [__________________________] │   ◀── Input register('username')       (page.tsx:75-80)
│  ⚠ Tối thiểu 3 ký tự         │   ◀── errors.username (Zod min(3))      (page.tsx:81-83, schema :15)
│                              │
│ Mật khẩu                     │   ◀── Label htmlFor=password            (page.tsx:87-89)
│ [__________________________] │   ◀── Input type=password               (page.tsx:90-96)
│  ⚠ Tối thiểu 6 ký tự         │   ◀── errors.password (Zod min(6))      (page.tsx:97-99, schema :16)
│     ─ hoặc, sau khi submit ─ │       cùng một <p>, message đổi qua API error:
│  ⚠ Tên đăng nhập hoặc mật    │   ◀── setError('password',…) khi BE trả  (page.tsx:52-53)
│     khẩu không đúng          │       INVALID_CREDENTIALS/ACCOUNT_DISABLED
│                              │
│ [       Đăng nhập         ]  │   ◀── Button, đổi 'Đang đăng nhập…' khi  (page.tsx:102-108)
│                              │       isSubmitting (disabled:opacity-60)
│ Chưa có tài khoản? Đăng ký   │   ◀── Link href=/register               (page.tsx:111-115)
└──────────────────────────────┘
```

### ③ Đề xuất sửa doc

Wireframe nên tách **hai nguồn lỗi** dùng chung một slot dưới ô Mật khẩu:

```
│ Mật khẩu                     │
│ [__________________________] │
│  ⚠ Tối thiểu 6 ký tự         │ ← lỗi Zod (client, trước khi gửi)
│  ⚠ Tên đăng nhập hoặc mật    │ ← lỗi API (sau khi BE trả 401) — cùng <p>,
│     khẩu không đúng          │    không hiển thị đồng thời
```

> ⚠️ FLAG 🟡 (sửa doc, không phải code): wireframe `staff_login.md` đặt message lỗi API vào ô lẽ ra
> là lỗi Zod, và bỏ sót message Zod `min(6)` thật (`'Tối thiểu 6 ký tự'`, `page.tsx:16`). Code render
> đúng — cùng `errors.password` `<p>` (`page.tsx:97-99`), nội dung đổi theo nguồn lỗi.
> **Lưu ý liên quan (Bug 1, code, đã đăng ở `LOGIN_BUGS.md`):** Zod cho phép `password ≥ 6`
> (`page.tsx:16`) nhưng BE bind `min=8` (`auth_handler.go:24`) → mật khẩu 6–7 ký tự lọt client, BE
> trả `400 INVALID_INPUT`, FE rơi vào message chung. Sửa code cần **đăng ký MASTER trước**.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Sẽ chứng minh:** thẻ canh giữa, slot lỗi dưới ô Mật khẩu hiển thị lỗi Zod khi nhập sai client, và đổi sang lỗi API sau khi submit sai |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| Zone 1 — Login Card | Tách slot lỗi: vẽ thêm dòng Zod `Tối thiểu 6 ký tự`, ghi rõ dòng còn lại là lỗi API (`staff_login.md:12-34`) | (tuỳ chọn) Bug 1 — nâng Zod login `.min(6)`→`.min(8)` cho khớp BE (`(auth)/login/page.tsx:16`) |
