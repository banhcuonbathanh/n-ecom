# Combo Detail — Đối Chiếu Hình Ảnh (Doc vs. Code render thật)

> **Trang:** `/menu/combo/:id` → `fe/src/app/(shop)/menu/combo/[id]/page.tsx` (217 dòng, 1 component
> inline).
> **Nhánh:** `experience_claude.md_system_1_test_iphon2_change_code` · **Ngày:** 2026-06-20.
> Mỗi zone: ① tài liệu đang vẽ · ② code render THẬT (trace từ source) · ③ đề xuất sửa.
> **Trạng thái ảnh chụp: ⏳ CHƯA CHỤP** — cần `docker compose up -d --build fe` + Playwright (stack
> chưa chạy trong session này). ASCII ②/③ vẽ từ code, không bịa ảnh.

---

## 🟡 Zone B — Tên · Badge · Giá · Mô tả
Nguồn code: `page.tsx:116-134`

### ① Doc đang vẽ (`customer_combo_detail.md:18-19`)
```
Combo Đầy Đặn                    42.000đ       ← tên · availability · giá cùng 1 dòng
1 phần bánh + 1 canh + đồ uống                 ← mô tả
```

### ② Code render THẬT
```
┌────────────────────────────────────────────┐
│ Combo Đầy Đặn                  [Hết hàng]   │ ◀── tên (flex-1) + badge cùng 1 row (page.tsx:118-127)
│                                              │     badge CHỈ khi !is_available → DEAD (Bug 1)
│ 42.000đ                                      │ ◀── giá là <p> RIÊNG, dòng dưới (page.tsx:129)
│                                              │
│ 1 phần bánh + 1 canh + đồ uống              │ ◀── mô tả, chỉ khi combo.description (page.tsx:131-133)
└────────────────────────────────────────────┘
```

### ③ Đề xuất sửa doc
```
Combo Đầy Đặn
42.000đ                                        ← giá ở DÒNG RIÊNG dưới tên
1 phần bánh + 1 canh + đồ uống
```
> FLAG 🟡 (code, Bug 1): badge "Hết hàng" (`page.tsx:122-126`) không bao giờ hiện — `GET /combos` lọc
> `is_available=1` (`products.sql.go:387`), nên combo render luôn `is_available===true`. Đăng ký
> MASTER trước khi xóa.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![Zone B thật](./screenshots/zone_b_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright. Bằng chứng cần: giá nằm dòng riêng dưới tên. |  |

---

## 🟡 Zone E — CTA footer sticky
Nguồn code: `page.tsx:176-187`

### ① Doc đang vẽ (`customer_combo_detail.md:28`)
```
┌────────────────────────────────────────────┐
│        [ Thêm vào giỏ · 42.000đ ]          │
└────────────────────────────────────────────┘
```

### ② Code render THẬT
```
┌────────────────────────────────────────────┐
│   [ Thêm vào giỏ hàng · 42.000đ ]          │ ◀── chữ "Thêm vào giỏ hàng" (page.tsx:184)
└────────────────────────────────────────────┘     total = combo.price * qty (page.tsx:56)
   khi !is_available → disabled + "Combo tạm hết"  ◀── nhánh DEAD (page.tsx:180-185), Bug 1
```

### ③ Đề xuất sửa doc
```
┌────────────────────────────────────────────┐
│   [ Thêm vào giỏ hàng · 42.000đ ]          │  ← đúng chữ trong code
└────────────────────────────────────────────┘
```
> FLAG 🟡 (code, Bug 1): nhánh `disabled={!combo.is_available}` + chữ "Combo tạm hết" (`page.tsx:180-185`)
> không bao giờ chạy (cùng gốc Bug 1).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![Zone E thật](./screenshots/zone_e_real.png)<br>⏳ chưa chụp — cần stack. Bằng chứng cần: chữ nút là "Thêm vào giỏ hàng · {total}". |  |

---

## 🟢 Zone A — Hero image
Nguồn code: `page.tsx:97-114`

### ① Doc đang vẽ (`customer_combo_detail.md:13-17`)
```
┌────────────────────────────────────────────┐
│            HERO IMAGE                      │
└────────────────────────────────────────────┘
```

### ② Code render THẬT
```
┌────────────────────────────────────────────┐
│   next/image fill object-cover (nếu có ảnh) │ ◀── page.tsx:99-107
│   ── HOẶC ──                                │
│            🍱                                │ ◀── fallback emoji khi image_path null (page.tsx:108-112)
│   + overlay bg-gradient-to-t from-bg/60     │ ◀── page.tsx:113
└────────────────────────────────────────────┘
   aspect-[4/3], nút back đè absolute top-left (page.tsx:76-82)
```

### ③ Đề xuất sửa doc
```
┌────────────────────────────────────────────┐
│   HERO IMAGE  (hoặc 🍱 nếu không có ảnh)    │
└────────────────────────────────────────────┘
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![Zone A thật](./screenshots/zone_a_real.png)<br>⏳ chưa chụp — cần stack. Bằng chứng cần: fallback 🍱 khi combo không có ảnh. |  |

---

## 🟢 Zone C — "Gồm có" (danh sách món)
Nguồn code: `page.tsx:136-151`

### ① Doc đang vẽ (`customer_combo_detail.md:21-24`)
```
Gồm có                                         ← luôn hiện
×1  Bánh cuốn nhân thịt
×1  Canh mọc
×1  Trà đá
```

### ② Code render THẬT
```
(chỉ render khi combo.items.length > 0 — page.tsx:137)
Gồm có
[×1] Bánh cuốn nhân thịt                       ◀── badge số lượng + TÊN, KHÔNG giá (page.tsx:141-148)
[×1] Canh mọc
[×1] Trà đá
   ⚠ nếu sub-product hết hàng → hiện UUID thô (page.tsx:45) = Bug 2 🟡
```

### ③ Đề xuất sửa doc
```
Gồm có   (chỉ hiện khi có item)
×1  Bánh cuốn nhân thịt   (badge + tên, không giá từng món)
×1  Canh mọc
×1  Trà đá
```
> FLAG 🟡 (code, Bug 2): khi món con bị tắt, dòng hiện UUID thay vì tên (`page.tsx:45`). Đề xuất
> fallback `'Món tạm hết'`. Đăng ký MASTER trước.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![Zone C thật](./screenshots/zone_c_real.png)<br>⏳ chưa chụp — cần stack. Bằng chứng cần: badge ×N + tên, không có giá từng món. |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| B | Giá ở dòng riêng dưới tên (`customer_combo_detail.md:18`) | Xóa badge "Hết hàng" dead (`page.tsx:122-126`) — Bug 1 |
| E | Chữ "Thêm vào giỏ hàng" (`customer_combo_detail.md:28`) | Xóa nhánh "Combo tạm hết" dead (`page.tsx:180-185`) — Bug 1 |
| A | Thêm fallback 🍱 no-image vào ASCII | — |
| C | Ghi chú render có điều kiện + không giá từng món | Fallback `'Món tạm hết'` thay UUID (`page.tsx:45`) — Bug 2 |
