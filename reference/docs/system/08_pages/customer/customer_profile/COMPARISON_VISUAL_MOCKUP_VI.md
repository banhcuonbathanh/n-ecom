# So Sánh Trực Quan — Trang Thông Tin Khách Hàng (`/profile`)

> **Trạng thái ảnh chụp:** ⏳ **CHƯA CHỤP** — stack chưa chạy (cần `docker compose up -d --build fe`
> + Playwright, viewport iPhone 390×844). Phần ②/③ bên dưới được dựng **từ code** (đã trace `file:line`),
> không phải từ ảnh. Cột 📷 để trống chờ chụp; cột 💬 **luôn để trống** — đó là phần của chủ dự án điền,
> mình sẽ phản hồi ở lần chạy sau.
>
> Chỉ vẽ những zone **có lệch trực quan thật** (Area 1 = 🟡). Các zone C/D/E khớp tài liệu 100% nên
> không vẽ lại ở đây — xem [COMPARISON_DOC_VS_CODE_DETAILED_VI.md](COMPARISON_DOC_VS_CODE_DETAILED_VI.md).
> Nhánh: `experience_claude.md_system_1_test_iphon2_change_code`.

---

## 🟡 Zone B — ProfileAvatarHeader
Nguồn code: `fe/src/app/(shop)/profile/components/ProfileAvatarHeader.tsx:12-43`

### ① Doc đang vẽ (`customer_profile.md:22-25`)
```
┌────────────────────────────────────────────────┐
│            ┌──────────┐                        │
│            │  avatar  │  Nguyễn Văn A          │ ← avatar & tên NẰM CẠNH NHAU (ngang)
│            │  [📷🚫]  │  ✓ Thành viên          │
│            └──────────┘                        │
└────────────────────────────────────────────────┘
```

### ② Code render THẬT
```
┌────────────────────────────────────────────────┐
│                  ┌──────────┐                   │
│                  │  avatar  │ ◀── flex flex-col items-center
│                  │   (👤)   │     (ProfileAvatarHeader.tsx:12)
│                  └────[📷🚫]┘     camera badge: absolute bottom-0 right-0,
│                                    opacity-50 cursor-not-allowed (:29-34)
│                  Nguyễn Văn A    ◀── tên NẰM DƯỚI avatar, căn giữa (:37-38)
│                  ✓ Thành viên     ◀── chỉ hiện khi isMember===true (:39-41)
│                                       — hôm nay KHÔNG BAO GIỜ true (fetch 404)
└────────────────────────────────────────────────┘
```

### ③ Đề xuất sửa doc
```
┌────────────────────────────────────────────────┐
│                  ┌──────────┐                   │
│                  │  avatar  │                   │  cột dọc, căn giữa
│                  └────[📷🚫]┘                   │  (badge camera góc dưới-phải)
│                  Nguyễn Văn A                   │  tên dưới avatar
│                  ✓ Thành viên                   │  (chỉ khi isMember)
└────────────────────────────────────────────────┘
```
> 🟡 **Chỉ lệch hình vẽ** — code xếp avatar + tên theo **cột dọc căn giữa** (`flex flex-col
> items-center`), ASCII tài liệu vẽ chúng **nằm ngang cạnh nhau**. Không phải lỗi code. Lưu ý liên đới:
> badge "✓ Thành viên" hiện không bao giờ hiện vì `profile.isMember` đến từ fetch luôn 404 (xem
> Bug backend ở dưới).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Sẽ chứng minh:** avatar + tên xếp dọc căn giữa, badge camera mờ (disabled) |  |

---

## 🟡 Zone A — CustomerTopNav (tiêu đề căn giữa)
Nguồn code: `fe/src/components/shared/CustomerTopNav.tsx:13-39`

### ① Doc đang vẽ (`customer_profile.md:20`)
```
┌────────────────────────────────────────────────┐
│ [←] Thông Tin Khách Hàng                       │ ← ngụ ý tiêu đề CĂN TRÁI cạnh mũi tên
└────────────────────────────────────────────────┘
```

### ② Code render THẬT
```
┌────────────────────────────────────────────────┐
│ [←]        Thông Tin Khách Hàng           [   ] │
│  ▲              ▲                            ▲   │
│  │              │                            │   │
│ nút back   flex-1 text-center           spacer rỗng
│ (:15-21)   (CustomerTopNav.tsx:23)      (:37, aria-hidden)
│                                                  │
│ nền: bg-[#1e293b] ◀── hex cứng (:14) — vi phạm design-token
└────────────────────────────────────────────────┘
```

### ③ Đề xuất sửa doc
```
┌────────────────────────────────────────────────┐
│ [←]        Thông Tin Khách Hàng           [ ]   │  tiêu đề CĂN GIỮA
└────────────────────────────────────────────────┘  (back trái · spacer phải)
```
> 🟡 **Lệch hình vẽ nhẹ** — tiêu đề `flex-1 text-center` (căn giữa), không phải căn trái cạnh mũi tên.
> 🟢 **Ghi chú liên-component (ngoài phạm vi trang này):** `bg-[#1e293b]` là **hex cứng**
> (`CustomerTopNav.tsx:14`) — vi phạm rule design-token của fe/CLAUDE.md, nhưng nằm trong component
> dùng chung `CustomerTopNav`, không thuộc sở hữu của trang profile → cần fix ở phía chủ component nav.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Sẽ chứng minh:** tiêu đề căn giữa header, nền xanh đậm |  |

---

## 🔴 Bug backend đứng sau trang (không có zone để vẽ — nhưng phải nêu)
Nguồn code: `fe/src/hooks/useCustomerProfile.ts:30,48` · `be/cmd/server/main.go:161`

> 🔴 **Lỗi CODE (tài liệu đã ghi đúng — chỉ xác minh lại):** cả `GET` và `PUT /customer/profile`
> **không tồn tại** trong backend. `grep -rniE "customer/profile" be/` → **KHÔNG có gì**;
> `main.go:161` không mount group `/customer` nào. Mọi lần tải trang đều rơi vào nhánh 404 → form
> rỗng + nút **"Tạo hồ sơ"** bật sáng, nhưng mọi lần lưu đều thất bại với toast
> **"Không thể lưu — kiểm tra kết nối"** (sai bản chất — thực ra là thiếu endpoint).
> Chi tiết: [PROFILE_BUGS.md](PROFILE_BUGS.md) Bug 1 · [customer_profile_be.md](customer_profile_be.md)
> Flags 1–2. **Đây là việc code (build BE hoặc quyết định sản phẩm), phải đăng ký MASTER_TASK trước.**

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| Zone B — Avatar | Vẽ lại ASCII thành cột dọc căn giữa (`customer_profile.md:22-25`) | — |
| Zone A — TopNav | Ghi chú tiêu đề căn giữa (`customer_profile.md:20`) | (liên-component) `bg-[#1e293b]` hex cứng → đổi sang token ở `CustomerTopNav.tsx:14` |
| Backend (toàn trang) | — (tài liệu đã đúng) | 🔴 Build `/customer/profile` BE **hoặc** gate trang; rồi mới sửa toast 404 (`useCustomerProfile.ts:54-56`) |
