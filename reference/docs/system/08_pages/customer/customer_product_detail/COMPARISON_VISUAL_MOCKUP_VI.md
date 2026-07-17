# So Sánh Trực Quan — Doc vs. Code · `customer_product_detail` (`/menu/product/:id`)

> **Mỗi zone:** ① doc đang vẽ · ② code render THẬT (ASCII, có chú thích `file:line`) · ③ đề xuất sửa.
> Code là chân lý — mọi ② trace từ source trên nhánh
> `experience_claude.md_system_1_test_iphon2_change_code`.
> 📷 **Trạng thái ảnh chụp: ⏳ CHƯA CHỤP** — stack chưa chạy. Cần
> `docker compose up -d --build fe` + Playwright (mẫu: `e2e/tests/capture-menu-zones.spec.ts`,
> viewport iPhone 390×844) để chụp `./screenshots/<zone>_real.png`. ASCII ②/③ dưới đây dựng thẳng từ
> code, không chờ ảnh. Cột 💬 để trống — của bạn điền.

---

## 🔴 Zone E + Nav-shell — `CTAFooter` đè lên `ClientBottomNav`
Nguồn code: `CTAFooter.tsx:12`, `(shop)/layout.tsx:11-12`, `ClientBottomNav.tsx:48`

### ① Doc đang vẽ (`customer_product_detail.md:32-34`)
```
├────────────────────────────────────────────────┤
│        [ Thêm vào giỏ · 80.000đ ]              │ ← E CTAFooter (sticky)
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ← ClientBottomNav (shell)
└────────────────────────────────────────────────┘
   (doc vẽ 2 thanh XẾP CHỒNG gọn gàng, tách biệt)
```

### ② Code render THẬT
```
        ┌──────────────────────────────────────────┐
        │     [ Thêm vào giỏ hàng · 80.000đ ]      │ ◀── CTAFooter: fixed bottom-0,
        ├──────────────────────────────────────────┤      KHÔNG z-index (CTAFooter.tsx:12)
        │ [Menu][Đơn Hàng][Yêu Thích][Theo][Cài]   │ ◀── ClientBottomNav: fixed bottom-0,
        └──────────────────────────────────────────┘      z-20, shell mọi route
                  ▲                                        ((shop)/layout.tsx:12,
                  │                                         ClientBottomNav.tsx:48)
       CẢ HAI cùng ghim bottom-0 → nav (z-20) VẼ ĐÈ lên nút CTA.
       Không phải xếp chồng — là CHỒNG LẤP. pb-32 (page.tsx:90) +
       pb-[72px] (layout.tsx:11) chỉ chừa chỗ cho nội dung cuộn,
       KHÔNG tách 2 thanh fixed này khỏi nhau.
```

### ③ Đề xuất sửa doc
```
├────────────────────────────────────────────────┤
│        [ Thêm vào giỏ hàng · 80.000đ ]         │ ← E CTAFooter (fixed, bottom-[72px])
├────────────────────────────────────────────────┤  ← chừa đúng chiều cao nav
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ← ClientBottomNav (fixed bottom-0, z-20)
└────────────────────────────────────────────────┘
```
> 🔴 **FLAG (lỗi code thật, không chỉ doc lệch):** 2 thanh `fixed bottom-0` tranh nhau cùng dải đáy;
> nav `z-20` đè lên CTA không z-index → nút "Thêm vào giỏ hàng" có thể bị thanh tab che. Sửa code
> (nâng CTA lên `bottom-[72px]` HOẶC ẩn nav ở route detail) — **đăng ký MASTER trước**.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![CTA + nav thật](./screenshots/cta_nav_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright. ⚠ **Bằng chứng cần chụp:** vùng đáy để thấy CTA bị nav che tới đâu. |  |

---

## 🟡 Zone C — `ToppingSelector`
Nguồn code: `ToppingSelector.tsx:23-69`

### ① Doc đang vẽ (`customer_product_detail.md:26-28`)
```
│ Topping (chọn thêm)                            │ ← C ToppingSelector
│ ☐ Chả lụa            +10.000đ                  │   (danh sách checkbox dọc, 1 dòng/topping)
│ ☐ Hành phi            +5.000đ                  │
```

### ② Code render THẬT
```
│ Chọn topping (chọn nhiều · thêm vào giá)       │ ◀── h2 (ToppingSelector.tsx:25-27)
│ ┌──────────────┐ ┌──────────────┐             │ ◀── grid grid-cols-2 (line 29)
│ │ ☑ Chả lụa    │ │ ☐ Hành phi   │             │     card có viền, bo góc, min-h-44
│ │   +10.000đ   │ │   +5.000đ    │             │     (line 33-58); chọn → viền primary
│ └──────────────┘ └──────────────┘             │
│ Tổng: 35.000đ + 10.000đ = 45.000đ             │ ◀── dòng tổng, chỉ hiện khi đã chọn
│                                                │     (line 63-67)
```

### ③ Đề xuất sửa doc
```
│ Chọn topping (chọn nhiều · thêm vào giá)       │ ← C ToppingSelector (heading thật)
│ ┌─ ☑ Chả lụa ─┐ ┌─ ☐ Hành phi ─┐             │   lưới 2 cột, card có viền
│ │   +10.000đ  │ │   +5.000đ    │             │
│ └─────────────┘ └──────────────┘             │
│ Tổng: 35.000đ + 10.000đ = 45.000đ             │   ← dòng tổng (khi có chọn)
```
> 🟡 Chỉ lệch doc — code đúng & nhất quán. Vẽ lại zone C thành lưới 2 cột + dòng tổng, sửa heading.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![ToppingSelector thật](./screenshots/topping_real.png)<br>⏳ chưa chụp. ⚠ **Bằng chứng cần chụp:** lưới 2 cột + dòng "Tổng: …". |  |

---

## 🟡 Zone Nav + Zone E text — tiêu đề & nhãn "hết hàng"
Nguồn code: `page.tsx:52`, `CTAFooter.tsx:21`

### ① Doc đang vẽ (`customer_product_detail.md:16,57`)
```
│ [←]  Chi tiết món                              │ ← CustomerTopNav
        …
  Unavailable product → CTA disabled với state "Hết hàng"
```

### ② Code render THẬT
```
│ [←]  Chi tiết sản phẩm                         │ ◀── title="Chi tiết sản phẩm" (page.tsx:52)
        …
        [ Sản phẩm tạm hết ]                      ◀── text khi !isAvailable (CTAFooter.tsx:21)
```

### ③ Đề xuất sửa doc
```
│ [←]  Chi tiết sản phẩm                         │ ← CustomerTopNav (tiêu đề thật)
        …
  Hết hàng → CTA disabled, nhãn "Sản phẩm tạm hết"
```
> 🟡 Chỉ lệch chữ trong doc. Đổi "Chi tiết món" → "Chi tiết sản phẩm" và "Hết hàng" → "Sản phẩm tạm hết".

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![Nav + CTA hết hàng](./screenshots/nav_cta_real.png)<br>⏳ chưa chụp. ⚠ **Bằng chứng cần chụp:** tiêu đề nav + một món `is_available=false`. |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| E + Nav-shell | Vẽ CTA ở `bottom-[72px]` tách khỏi nav | ✅ **Có** — tách 2 thanh `fixed bottom-0` (CTA lên `bottom-[72px]` hoặc ẩn nav ở route detail) |
| C ToppingSelector | Vẽ lại lưới 2 cột + dòng tổng + heading thật | — (code đúng) |
| Nav + E text | Sửa "Chi tiết sản phẩm" + "Sản phẩm tạm hết" | — (code đúng) |
