# Admin Products — So Sánh Mockup Trực Quan (Doc vs. Code)

> **Trạng thái ảnh chụp: ⏳ CHƯA CHỤP** — stack chưa chạy (Playwright/`docker compose` không khả
> dụng trong phiên này). Phần ②/③ ASCII dưới đây được dựng **trực tiếp từ code** trên branch
> `experience_claude.md_system_1_test_iphon2_change_code`; cột 📷 để `⏳ chưa chụp`. Không chặn file vì
> thiếu ảnh, không bịa ảnh.
>
> Mỗi zone: ① doc đang vẽ · ② code render THẬT · ③ đề xuất sửa. Cột 💬 **để trống** — đó là phần của
> bạn; phiên sau tôi đọc lại và phản hồi. Bản đầy đủ: [EN](COMPARISON_DOC_VS_CODE_DETAILED.md) ·
> [VI](COMPARISON_DOC_VS_CODE_DETAILED_VI.md).

---

## 🔴 Zone B — ProductsTable (bảng sản phẩm)
Nguồn code: `ProductsTable.tsx:29-118`

### ① Doc đang vẽ (`admin_products.md:18-23`)

```
┌──────────────────────────────────────────────────────────┐
│ [img] Tên           Danh mục    Giá      Còn hàng  HĐ    │
│ [▣] Bánh cuốn thịt  Bánh cuốn   35.000đ  ● bật   [✎][🗑] │
│ [▣] Canh mọc        Canh        10.000đ  ● bật   [✎][🗑] │
│ [▣] BC tôm          Bánh cuốn   45.000đ  ○ tắt   [✎][🗑] │
└──────────────────────────────────────────────────────────┘
   5 cột: img · Tên · Danh mục · Giá · Còn hàng · HĐ
```

### ② Code render THẬT

```
┌──────────────────────────────────────────────────────────────────────────┐
│ (img) Tên sản phẩm   Danh mục   Topping        Giá      Trạng thái   (HĐ) │ ◀── 7 <th>  ProductsTable.tsx:34-40
│ [🍜] Bánh cuốn thịt  Bánh cuốn  [Hành phi][+2] 35.000đ  (Đang bán)  Sửa Xóa│ ◀── cột Topping :37,67-83
│ [🍜] Canh mọc        Canh       —              10.000đ  (Đang bán)  Sửa Xóa│ ◀── badge "Đang bán/Hết hàng" :92
│ [🍜] BC tôm          Bánh cuốn  [Tôm tươi]     45.000đ  (Hết hàng)  Sửa Xóa│ ◀── nút text "Sửa"/"Xóa" :101,107
└──────────────────────────────────────────────────────────────────────────┘
   • Cột "Topping" (◀ doc KHÔNG vẽ) — pill tối đa 2 + chip "+N more"  ProductsTable.tsx:67-83
   • Header cột trạng thái = "Trạng thái" (doc ghi "Còn hàng")        ProductsTable.tsx:39
   • Badge bấm được (onClick → onToggle) — KHÔNG phải công tắc        ProductsTable.tsx:87-93
```

### ③ Đề xuất sửa doc

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [img] Tên sản phẩm  Danh mục  Topping       Giá     Trạng thái  HĐ        │
│ [🍜] Bánh cuốn thịt Bánh cuốn (Hành phi +2) 35.000đ (Đang bán)  Sửa  Xóa  │
└──────────────────────────────────────────────────────────────────────────┘
```
🔴 **FLAG (chỉ là doc drift, không phải bug code):** thêm cột **Topping**, đổi header
"Còn hàng"→"Trạng thái", đổi nhãn badge "● bật/○ tắt"→"Đang bán/Hết hàng", đổi `[✎][🗑]`→nút text
`Sửa`/`Xóa`.
🔴 **Bug code liên quan (Bug 1):** badge "Đang bán/Hết hàng" bấm vào **luôn 400** — `PATCH
/products/:id/availability` (`main.go:189`) trỏ vào `UpdateProduct` đòi `name/price/category_id`. Đăng
ký MASTER trước khi sửa. Chi tiết: [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #1.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![ProductsTable thật](./screenshots/zoneB_table_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** bảng có 7 cột, cột Topping hiển thị pill |  |

---

## 🔴 Zone C — ProductFormModal (modal thêm/sửa)
Nguồn code: `ProductFormModal.tsx:126-287`

### ① Doc đang vẽ (`admin_products.md:25-26`)

```
┌─────────────────────────────────────────────┐
│ ProductFormModal                            │
│   tên                                       │
│   danh mục ▾                                │
│   giá                                       │
│   mô tả                                     │
│   ảnh (upload)                              │
│   topping checkboxes                        │
│   ◉ công tắc còn hàng       ◀── doc vẽ      │
│              [Lưu] [Huỷ]                    │
└─────────────────────────────────────────────┘
```

### ② Code render THẬT

```
┌─────────────────────────────────────────────┐
│ Thêm / Sửa sản phẩm                         │ ◀── tiêu đề  :130-132
│   Danh mục      ▾                           │ ◀── :137
│   Tên sản phẩm                              │ ◀── :155
│   Mô tả (tuỳ chọn)                          │ ◀── :165
│   Hình ảnh   [preview][Chọn/Đổi ảnh]        │ ◀── upload riêng (uploadFile)  :174,89
│   ┌ Giá (₫) ┐ ┌ Thứ tự ┐                    │ ◀── grid 2 cột; "Thứ tự" doc KHÔNG vẽ  :217-236
│   Topping áp dụng  ☑ Hành phi (Miễn phí)    │ ◀── :239
│   (KHÔNG có công tắc còn hàng)              │ ◀── không tồn tại; schema :15-22 / payload :104 không có is_available
│              [Huỷ] [Lưu]                    │ ◀── :268,275
└─────────────────────────────────────────────┘
```

### ③ Đề xuất sửa doc

```
┌─────────────────────────────────────────────┐
│ Thêm / Sửa sản phẩm                         │
│   Danh mục ▾ · Tên · Mô tả · Hình ảnh       │
│   Giá (₫) + Thứ tự · Topping checkboxes     │
│              [Huỷ] [Lưu]                    │
└─────────────────────────────────────────────┘
   (BỎ "công tắc còn hàng" — không có trong modal)
```
🔴 **FLAG doc drift:** modal **không có** "công tắc còn hàng"; bỏ khỏi wireframe. Thêm field
**"Thứ tự"** (`sort_order`, `:229`), sửa thứ tự field, ghi rõ ảnh là **uploadFile riêng** (không phải
multipart trong save).
🔴 **Hệ quả thật (Bug 1 + thiếu công tắc):** vì badge ở bảng hỏng *và* modal không có công tắc →
**không có đường UI nào đang hoạt động để đặt `is_available`** trên trang này.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![ProductFormModal thật](./screenshots/zoneC_modal_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** modal không có toggle còn hàng; có field "Thứ tự" |  |

---

## 🟡 Zone A — ProductPageHeader (nút seed thiếu trong wireframe)
Nguồn code: `ProductPageHeader.tsx:11-25`

### ① Doc đang vẽ (`admin_products.md:16`)

```
│ A  Sản phẩm (24)                    [+ Thêm sản phẩm]  │   ◀── chỉ 1 nút
```

### ② Code render THẬT

```
│ Sản phẩm (24)        [🌱 Dữ liệu mẫu]  [+ Thêm sản phẩm] │ ◀── 2 nút  ProductPageHeader.tsx:13-24
│                       ↑ doc KHÔNG vẽ nút seed này        │
```

### ③ Đề xuất sửa doc

```
│ Sản phẩm (24)        [🌱 Dữ liệu mẫu]  [+ Thêm sản phẩm] │
```
🟡 **FLAG doc drift:** thêm nút `🌱 Dữ liệu mẫu` vào Zone A của wireframe (`onSeed`/`seedLoading`,
`page.tsx:120`).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![Header thật](./screenshots/zoneA_header_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** header có 2 nút (seed + thêm) |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| B — ProductsTable | Thêm cột Topping; header "Trạng thái"; nhãn badge "Đang bán/Hết hàng"; nút text Sửa/Xóa | **Bug 1** — wire `ToggleProductAvailability` để badge hoạt động |
| C — ProductFormModal | Bỏ "công tắc còn hàng"; thêm field "Thứ tự"; ghi rõ uploadFile riêng | (gắn với Bug 1 — nếu chọn đặt availability từ modal thì cần thêm field + Bug 2) |
| A — ProductPageHeader | Thêm nút `🌱 Dữ liệu mẫu` vào wireframe | — |
