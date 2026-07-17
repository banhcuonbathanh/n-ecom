# So Sánh Hình Ảnh (Visual Mockup) — `customer_welcome` (`/welcome`)

> So sánh từng zone: ① tài liệu đang vẽ · ② code render THẬT (ASCII trace từ `page.tsx`) · ③ đề xuất
> sửa doc. Đây là trang **tĩnh, độ drift gần bằng 0** — chỉ **một** zone có drift dữ liệu thật (Giờ mở
> cửa, 🟡); các zone còn lại chỉ chênh ở mức rút gọn wireframe (🟢). Không có bug code trên trang này.
>
> 📷 **Trạng thái ảnh chụp: ⏳ CHƯA CHỤP** — cần `docker compose up -d --build fe` + Playmaker/Playwright
> (viewport iPhone 390×844, mở `/welcome`). ②/③ dưới đây viết từ code, không phụ thuộc ảnh.
> Nhánh: `experience_claude.md_system_1_test_iphon2_change_code` · Ngày: 2026-06-22.

---

## 🟡 Zone — Giờ Mở Cửa (Hours)
Nguồn code: `page.tsx:27-30` (hằng `hours`) + `page.tsx:172-187` (render)

### ① Doc đang vẽ (`customer_welcome.md:36-39`)
```
┌─🕐 Giờ Mở Cửa───┐
│ T2–T6 06:30–21h │
│ T7–CN 06:00–21h │   ◀── cả hai đóng "21h"
└─────────────────┘
```

### ② Code render THẬT
```
┌─[🕐] Giờ Mở Cửa──────────────────┐
│ Thứ 2 – Thứ 6        06:30 – 21:00 │ ◀── hours[0] (page.tsx:28)
│ Thứ 7 – Chủ Nhật     06:00 – 21:30 │ ◀── hours[1] (page.tsx:29) — đóng 21:30, KHÔNG phải 21:00
└───────────────────────────────────┘
   render: hours.map(...) (page.tsx:180-185)
```

### ③ Đề xuất sửa doc
```
┌─🕐 Giờ Mở Cửa──────────┐
│ T2–T6   06:30 – 21:00  │
│ T7–CN   06:00 – 21:30  │ ◀── giữ đúng :30 cuối tuần
└────────────────────────┘
```
> FLAG 🟡 (chỉ doc, KHÔNG phải bug code): ASCII làm tròn cả hai giờ đóng thành "21h", che mất việc
> cuối tuần đóng **21:30**. Code (`page.tsx:29`) là nguồn đúng. Không cần đăng ký MASTER (chỉ sửa doc).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![Hours zone thật](./screenshots/hours_real.png)<br>⚠ **Bằng chứng:** ảnh sẽ chứng minh hàng "Thứ 7 – Chủ Nhật" hiển thị "06:00 – 21:30" |  |

---

## 🟢 Zone — Hero (chỉ chênh hình thức)
Nguồn code: `page.tsx:54-88`

### ① Doc đang vẽ (`customer_welcome.md:16-19`)
```
              HERO (gradient)
   ⭐ Quán Bánh Cuốn Truyền Thống Từ 1995
   Hương Vị Bánh Cuốn — Đúng Vị Hà Nội
   [ Đặt Món Ngay ]  [ Tìm Hiểu Thêm ↓ ]
```

### ② Code render THẬT
```
              HERO (gradient-hero)
   [⭐ Quán Bánh Cuốn Truyền Thống Từ 1995]  ◀── Badge+Star (page.tsx:57-60)
   Hương Vị Bánh Cuốn                         ◀── h1, "Bánh Cuốn" tô primary
   Đúng Vị Hà Nội                             ◀── <br/> xuống dòng (KHÔNG có "—") page.tsx:62-66
   "Bánh cuốn tráng tay mỗi sáng…"            ◀── <p> mô tả (page.tsx:68-71) — ASCII không vẽ
   [🔳 Đặt Món Ngay →/menu]  [Tìm Hiểu Thêm →]
        page.tsx:74-79              page.tsx:80-85 (<a href="#about">)
```

### ③ Đề xuất sửa doc
```
   Hương Vị Bánh Cuốn
   Đúng Vị Hà Nội                  ◀── xuống dòng, bỏ dấu "—"
   (1 đoạn mô tả ngắn bên dưới)
   [ Đặt Món Ngay ]  [ Tìm Hiểu Thêm ↓ ]
```
> FLAG 🟢: thuần hình thức — doc dùng "—" còn code xuống dòng; ASCII bỏ đoạn `<p>` mô tả. Không bug.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![Hero zone thật](./screenshots/hero_real.png)<br>⚠ **Bằng chứng:** ảnh sẽ chứng minh tiêu đề xuống dòng (không gạch ngang) + có đoạn mô tả |  |

---

## 🟢 Zone — Món Đặc Trưng (tên món rút gọn)
Nguồn code: `page.tsx:122-161`

### ① Doc đang vẽ (`customer_welcome.md:27-33`)
```
Món Đặc Trưng — 3 dish cards
┌────────┐ ┌────────┐ ┌────────┐
│ [img]  │ │ [img]  │ │ [img]  │
│ Nhân   │ │ Tôm    │ │ Chay   │
│ Thịt   │ │ Thịt   │ │        │
└────────┘ └────────┘ └────────┘
   [ Xem Toàn Bộ Thực Đơn → ]
```

### ② Code render THẬT
```
[Thực Đơn Nổi Bật]  Món Đặc Trưng           ◀── Badge + h2 + phụ đề (page.tsx:125-129, không vẽ)
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ [ChefHat ph]    │ │ [ChefHat ph]    │ │ [ChefHat ph]    │
│ Bánh Cuốn       │ │ Bánh Cuốn       │ │ Bánh Cuốn       │
│ Nhân Thịt  [ĐB] │ │ Tôm Thịt  [BC]  │ │ Chay      [Chay]│ ◀── tên ĐẦY ĐỦ + Badge tag
│ <desc 1 dòng>   │ │ <desc>          │ │ <desc>          │
└─────────────────┘ └─────────────────┘ └─────────────────┘
        dishes.map(...) (page.tsx:131-150) — nguồn: hằng dishes (page.tsx:9-25)
        [ Xem Toàn Bộ Thực Đơn → ] →/menu (page.tsx:153-158)
```

### ③ Đề xuất sửa doc
```
[Thực Đơn Nổi Bật]  Món Đặc Trưng
┌────────────┐ ┌────────────┐ ┌────────────┐
│ [img ph]   │ │ [img ph]   │ │ [img ph]   │
│ B.Cuốn     │ │ B.Cuốn     │ │ B.Cuốn     │
│ Nhân Thịt  │ │ Tôm Thịt   │ │ Chay       │
│ [tag Badge]│ │ [tag Badge]│ │ [tag Badge]│
└────────────┘ └────────────┘ └────────────┘
   [ Xem Toàn Bộ Thực Đơn → ]
```
> FLAG 🟢: doc rút gọn tên ("Nhân Thịt" vs "Bánh Cuốn Nhân Thịt") + bỏ Badge section/tag. Không bug.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![Dishes zone thật](./screenshots/dishes_real.png)<br>⚠ **Bằng chứng:** ảnh sẽ chứng minh tên đầy đủ "Bánh Cuốn …" + Badge tag góc card |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| Giờ Mở Cửa (🟡) | Sửa ASCII: T7–CN `06:00 – 21:30` (không phải "21h") | — (không có bug code) |
| Hero (🟢) | Bỏ dấu "—", thêm ghi chú có đoạn mô tả | — |
| Món Đặc Trưng (🟢) | Dùng tên đầy đủ "Bánh Cuốn …" + ghi chú Badge tag | — |

> Cả 3 đều là việc **sửa doc** trong một task ALIGNed. Trang `/welcome` **không có bug code** nào để
> đăng ký MASTER.
