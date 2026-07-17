# So Sánh Trực Quan — Doc vs. Code · `/introduction`

> **Trạng thái ảnh chụp:** ⏳ CHƯA CHỤP — cần `docker compose up -d --build fe` + Playwright (stack đang
> tắt). Phần ② (code render thật) và ③ (đề xuất sửa) được dựng trực tiếp từ source trên branch
> `experience_claude.md_system_1_test_iphon2_change_code`; cột 📷 để trống chờ chụp. Ngày: 2026-06-23.
>
> Chỉ vẽ những zone có **drift trực quan thật** (các mục 🟡 ở Khu vực 1). Các zone Map / Hours / Contact
> / CTA khớp tài liệu nên không vẽ lại ở đây. Cột 💬 **luôn để trống** — chủ quán tự điền, lần chạy sau
> mình phản hồi.

---

## 🟡 Zone — Top nav (`page.tsx:20-36`)
Nguồn code: `fe/src/app/introduction/page.tsx:20-36`

### ① Doc đang vẽ (`customer_introduction.md:14` + Zones `:47`)
```
┌────────────────────────────────────────────────┐
│ [←] Giới Thiệu             [Xem Thực Đơn]      │ ← Zones table ghi: CustomerTopNav (shared, reuse)
└────────────────────────────────────────────────┘
```

### ② Code render THẬT
```
┌────────────────────────────────────────────────┐
│ [←] Giới Thiệu          [ 🔲 Xem Thực Đơn ]    │ ◀── <nav> sticky tự viết trong page.tsx:20-36
└────────────────────────────────────────────────┘     KHÔNG dùng CustomerTopNav.
                                                        • back-link → /welcome (ArrowLeft) page.tsx:22-28
                                                        • Button → /menu (icon QrCode) page.tsx:29-34
                                                        CustomerTopNav là 'use client' + có icon giỏ hàng
                                                        + cần onBack callback (CustomerTopNav.tsx:1,7,29)
                                                        → không hợp trang Server tĩnh có CTA "Xem Thực Đơn"
```

### ③ Đề xuất sửa doc
Bỏ dòng "CustomerTopNav (shared, reuse)" khỏi bảng Zones — code dùng `<nav>` server tĩnh riêng là **đúng**,
việc tái dùng `CustomerTopNav` không khả thi.
🟡 Đây là **drift tài liệu**, KHÔNG phải bug code.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng:** nav phải hiện back-link "Giới Thiệu" trái + Button "Xem Thực Đơn" phải |  |

---

## 🟡 Zone — Hero (`IntroHero.tsx`)
Nguồn code: `fe/src/features/introduction/IntroHero.tsx:8-35`

### ① Doc đang vẽ (`customer_introduction.md:16-17`)
```
├────────────────────────────────────────────────┤
│ HERO PHOTO (full-width restaurant photo)       │
│   Bánh Cuốn Bà Hoa — Từ 1995                   │
├────────────────────────────────────────────────┤
```

### ② Code render THẬT
```
├────────────────────────────────────────────────┤
│            ┌──────────────────┐                │ ◀── KHÔNG phải ảnh thật — là khối placeholder
│            │   ★ (mờ)         │                │     IntroHero.tsx:11-17
│            │ "Ảnh quán toàn   │                │     (Star icon + "Ảnh quán toàn cảnh sẽ
│            │  cảnh sẽ thêm…"  │                │      được thêm vào đây")
│            └──────────────────┘                │
│        [ ★ Quán Bánh Cuốn Truyền Thống ]       │ ◀── Badge (ASCII bỏ sót) IntroHero.tsx:20-23
│            Bánh Cuốn Bà Hoa                     │ ◀── h1 IntroHero.tsx:24-28
│            Từ 1995                              │
│   Gần 30 năm gìn giữ hương vị… (subtitle)      │ ◀── subtitle (ASCII bỏ sót) IntroHero.tsx:29-31
├────────────────────────────────────────────────┤
```

### ③ Đề xuất sửa doc
Vẽ hero thành **khối placeholder** (chưa có ảnh thật — đã flag tại `IntroHero.tsx:5-6`), thêm Badge
"Quán Bánh Cuốn Truyền Thống" + dòng subtitle.
🟡 Drift tài liệu — placeholder là cố ý, KHÔNG phải bug.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng:** hero là khối placeholder có icon ★ + chữ "Ảnh quán toàn cảnh sẽ được thêm", có Badge + subtitle |  |

---

## 🟡 Zone — Hình Ảnh / Gallery (`IntroGallery.tsx`)
Nguồn code: `fe/src/features/introduction/IntroGallery.tsx:9,25-34`

### ① Doc đang vẽ (`customer_introduction.md:23-26`)
```
│ Hình Ảnh — photo gallery                       │
│ ┌─────┐ ┌─────┐ ┌─────┐                        │  ← 3 ảnh, "(swipeable on mobile)"
│ │ img │ │ img │ │ img │  (swipeable on mobile) │
│ └─────┘ └─────┘ └─────┘                        │
```

### ② Code render THẬT
```
│ [ Hình Ảnh ]  Không Gian Quán                  │ ◀── Badge + h2 IntroGallery.tsx:16-19
│ "Một vài khoảnh khắc tại quán…"                │
│ ┌─────┐ ┌─────┐ ┌─────┐                        │ ◀── 6 ô placeholder (KHÔNG phải 3)
│ │ 🖼  │ │ 🖼  │ │ 🖼  │                        │     PLACEHOLDER_COUNT = 6  IntroGallery.tsx:9
│ └─────┘ └─────┘ └─────┘                        │     grid tĩnh grid-cols-2 sm:grid-cols-3
│ ┌─────┐ ┌─────┐ ┌─────┐                        │     IntroGallery.tsx:25  — KHÔNG vuốt (no carousel)
│ │ 🖼  │ │ 🖼  │ │ 🖼  │                        │     Lightbox = phase-2, chưa làm (:7)
│ └─────┘ └─────┘ └─────┘                        │
```

### ③ Đề xuất sửa doc
Vẽ lại lưới **6 ô placeholder** (2/3 cột), bỏ chữ "swipeable" (không có carousel trong code), thêm
Badge + h2 "Không Gian Quán".
🟡 Drift tài liệu — KHÔNG phải bug; lightbox phase-2 chưa làm là đúng tài liệu.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng:** lưới 6 ô placeholder tĩnh, không vuốt được |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| Top nav | Bỏ "CustomerTopNav (shared, reuse)" khỏi bảng Zones | — (code đúng) |
| Hero | Vẽ thành placeholder + thêm Badge/subtitle | — (placeholder cố ý) |
| Gallery | 6 ô tĩnh, bỏ "swipeable", thêm Badge/h2 | — (code đúng) |
| **Toàn trang** | Lật trạng thái 🔮 PLANNED → ✅ (đã build & ship) | **Thêm entry point tới `/introduction`** (link từ `/welcome`) hoặc ghi rõ là cố ý để tối — cần quyết định sản phẩm |

> ⚠️ Drift trực quan = **sửa doc**, một task ALIGNed. Việc thêm link entry-point là **gap code/sản phẩm**
> — phải đăng ký `MASTER_TASK.md` trước khi đụng file. Audit này không sửa gì.
