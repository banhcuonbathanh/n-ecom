# Admin Toppings — Đối Chiếu Hình Ảnh (Doc vs. Code render)

> **Phạm vi:** vẽ lại từng zone của `/admin/toppings`: ① doc đang vẽ · ② code render THẬT (ASCII từ
> source) · ③ đề xuất sửa. Trace từ code trên nhánh
> `experience_claude.md_system_1_test_iphon2_change_code`. **Chỉ đọc — không sửa code/doc.**
> Trang này gần như **không có drift hình ảnh thật** — chỉ chữ viết tắt trong ASCII (🟢); không có
> zone 🔴/🟡 nào. Chỉ Zone Table có khác biệt đáng vẽ.
>
> **Trạng thái ảnh chụp:** ⏳ CHƯA CHỤP — cần `docker compose up -d --build fe` + Playwright
> (390×844, đăng nhập manager → `/admin/toppings`). Cột 📷 để trống tới khi stack lên.
> Cột 💬 luôn để trống — của chủ sở hữu điền; lần chạy sau sẽ phản hồi.

---

## 🟢 Zone Table — `ToppingTable`
Nguồn code: `ToppingTable.tsx:27-92`

### ① Doc đang vẽ (`admin_toppings.md:17-22`)

```
┌──────────────────────────────────────────────────────────────┐ ← ToppingTable
│ Tên topping  Áp dụng cho SP   Giá thêm  Trạng thái  Hành động │
│ Chả lụa      BC thịt, BC tôm  +10.000đ  [Có sẵn]    [Sửa][Xóa]│
│ Hành phi     BC thịt          +5.000đ   [Có sẵn]    [Sửa][Xóa]│
│ Rau          Chưa gắn SP      Miễn phí  [Hết]       [Sửa][Xóa]│
└──────────────────────────────────────────────────────────────┘
```

### ② Code render THẬT

```
┌──────────────────────────────────────────────────────────────────────┐
│ Tên topping  Áp dụng cho sản phẩm   Giá thêm   Trạng thái   (trống)   │ ◀── th cuối KHÔNG có nhãn
│                                                                        │     `<th className="px-4 py-3" />` (ToppingTable.tsx:36)
│ Chả lụa      [BC thịt][BC tôm]      +10.000đ   [Có sẵn]    [Sửa][Xóa] │ ◀── chip xanh (ToppingTable.tsx:50-54)
│ Hành phi     [BC thịt]              +5.000đ    [Có sẵn]    [Sửa][Xóa] │     giá cam +formatVND (:63)
│ Rau          Chưa gắn sản phẩm      Miễn phí   [Hết]       [Sửa][Xóa] │ ◀── "Chưa gắn sản phẩm" (:57)
└──────────────────────────────────────────────────────────────────────┘     "Miễn phí" xanh lá (:62) · Badge muted "Hết" (:66-68)
```

Khác biệt duy nhất so với doc: (1) cột 2 đầy đủ là **"Áp dụng cho sản phẩm"** (doc viết tắt "SP");
(2) cột 5 **không có tiêu đề** — doc vẽ nhãn "Hành động" nhưng `<th>` thứ 5 trống (`:36`); (3) ô chưa
gắn là **"Chưa gắn sản phẩm"** (doc viết tắt "SP"). Mọi thứ khác (chip xanh, tách màu giá xanh-lá/cam,
Badge trạng thái, nút Sửa/Xóa) khớp chính xác.

### ③ Đề xuất sửa doc

```
┌──────────────────────────────────────────────────────────────────────┐
│ Tên topping  Áp dụng cho sản phẩm   Giá thêm   Trạng thái             │ ← bỏ nhãn "Hành động"
│ Chả lụa      [BC thịt][BC tôm]      +10.000đ   [Có sẵn]    [Sửa][Xóa] │
│ Rau          Chưa gắn sản phẩm      Miễn phí   [Hết]       [Sửa][Xóa] │
└──────────────────────────────────────────────────────────────────────┘
```

> FLAG 🟢: Không có bug code — chỉ chữ viết tắt trong ASCII. Sửa doc: "SP"→"sản phẩm" (2 chỗ), bỏ
> tiêu đề cột "Hành động" (cột hành động không có nhãn header trong code).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** bảng topping thật để xác nhận header cột 5 trống + chữ cột 2 đầy đủ |  |

---

## ✅ Zone Header — `ToppingPageHeader` (KHỚP, không drift)
Nguồn code: `ToppingPageHeader.tsx:6-17`

### ① Doc vẽ (`admin_toppings.md:15`) · ② Code render — **giống hệt**

```
│ Topping (6)                                    [+ Thêm topping]  │
```

Code: `Topping ({count})` (count động từ `toppings.length`) + nút cam `+ Thêm topping`
(`ToppingPageHeader.tsx:9-15`). Không cần sửa.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp |  |

---

## ✅ Zone Form Modal — `ToppingFormModal` (KHỚP, không drift)
Nguồn code: `ToppingFormModal.tsx:66-132`

### ① Doc vẽ (`admin_toppings.md:24-25`) · ② Code render — **giống hệt**

```
┌──────────────────────────────┐
│ Thêm topping              ×   │
├──────────────────────────────┤
│ Tên topping *                │
│ [____________________]       │
│ Giá thêm (đ)                 │
│ [0__________________]        │
│ 0 = Miễn phí                 │
│ Trạng thái                   │
│ (●——) Có sẵn                 │ ← toggle xanh lá / muted
│   [Hủy]      [Lưu topping]   │
└──────────────────────────────┘
```

Khớp: tiêu đề "Thêm topping"/"Sửa topping" (`:71`), "Tên topping *" (`:77`), "Giá thêm (đ)" + chú
thích "0 = Miễn phí" (`:87,94`), toggle Trạng thái Có sẵn/Hết (`:99-111`), nút [Hủy][Lưu topping]
(`:120,127`, đổi "Đang lưu..." khi pending). Không cần sửa.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| Table | 🟢 "SP"→"sản phẩm" (2 chỗ); bỏ nhãn cột "Hành động" (`admin_toppings.md:17-21`) | — (tuỳ chọn: thêm `disabled` nút Xóa khi `deleteMut.isPending`) |
| Header | — (khớp) | — |
| Form Modal | — (khớp) | — (tuỳ chọn: bỏ nhánh 409 chết `ToppingFormModal.tsx:55-57`) |
