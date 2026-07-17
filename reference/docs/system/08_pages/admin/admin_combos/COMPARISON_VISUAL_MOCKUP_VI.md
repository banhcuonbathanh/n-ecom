# Admin Combos — So Sánh Hình Ảnh (Mockup theo Zone)

> **Trạng thái ảnh chụp:** ⏳ **CHƯA CHỤP** — stack chưa chạy. ASCII ②/③ được dựng trực tiếp từ
> `page.tsx` đang chạy trên nhánh `experience_claude.md_system_1_test_iphon2_change_code`. Để chụp ảnh
> thật: `docker compose up -d --build fe` + Playwright (viewport admin desktop, đăng nhập manager →
> `/admin/combos`).
> **Mức drift hình ảnh: rất thấp** — không Zone nào sai về cấu trúc. Chỉ là trừu tượng hoá ASCII (ký tự
> checkbox, dòng mô tả bị bỏ). Cột 💬 luôn để trống — của chủ dự án điền.
> Ngày: 2026-06-21. Nguồn code: `fe/src/app/(dashboard)/admin/combos/page.tsx`.

---

## 🟢 Zone B — PageHeader (đếm + 2 nút)
Nguồn code: `combos/page.tsx:235-253`

### ① Doc đang vẽ (`admin_combos.md:22`)
```
│ B  Combo (3)              [🎲 Random combo]  [+ Thêm combo]              │
```

### ② Code render THẬT
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Combo (3)                       [🎲 Random combo]  [+ Thêm combo]        │
│  ▲ <h2> combos.length  page.tsx:237        ▲ purple-100   ▲ orange-500    │
│                                            page.tsx:239    page.tsx:246    │
│  • 🎲 disabled khi randomLoading → label "Đang tạo..."  (page.tsx:241-244) │
└──────────────────────────────────────────────────────────────────────────┘
```

### ③ Đề xuất sửa doc
Không cần — ASCII khớp cấu trúc thật (đếm trái, 2 nút phải). Có thể ghi chú thêm: nút 🎲 đổi nhãn
"Đang tạo..." khi `randomLoading`. Không có bug code phía sau.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![PageHeader thật](./screenshots/zoneB_header_real.png)<br>⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright |  |

---

## 🟢 Zone C — ComboTable (bảng + cột Giá lẻ/Tiết kiệm tính phía client)
Nguồn code: `combos/page.tsx:261-342`

### ① Doc đang vẽ (`admin_combos.md:24-30`)
```
│ Tên combo       Sản phẩm trong combo   Giá combo  Giá lẻ  Tiết kiệm           │
│ Combo Gia Đình  [BC thịt ×2][Canh ×1]  70.000đ    85.000đ  -15.000đ [Sửa][Xóa]│
│ Combo Tiết Kiệm [BC mọc nhi ×1]        42.000đ      —        —      [Sửa]      │
```

### ② Code render THẬT
```
┌─────────────┬───────────────────────┬──────────┬─────────┬──────────┬──────────┐
│ Tên combo   │ Sản phẩm trong combo  │ Giá combo│ Giá lẻ  │ Tiết kiệm│          │
├─────────────┼───────────────────────┼──────────┼─────────┼──────────┼──────────┤
│ Combo Gia   │ (BC thịt ×2)(Giò ×1)  │ 70.000đ  │ 85.000đ │ -15.000đ │[Sửa][Xóa]│
│ Đình        │  ▲ chip = productMap  │ ▲formatVND│▲rowRetail│▲green nếu│ ▲Xóa chỉ │
│ (mô tả nếu  │  fallback product_id  │          │ Σ p.price│  >0      │  khi      │
│  có) :284   │  page.tsx:294 ◀UUID   │          │ ×qty :275│  :310    │ isAdmin  │
│             │  nếu products chưa load│          │ "—" nếu 0│  "—" nếu │  :326    │
│             │                       │          │  :307    │  ≤0 :315 │          │
└─────────────┴───────────────────────┴──────────┴─────────┴──────────┴──────────┘
  • rowRetail & rowSavings tính 100% phía client từ productMap (page.tsx:275-279)
    — BE không gửi 2 cột này.
  • Rỗng → <EmptyState icon="🍱" .../> (page.tsx:259)
```

### ③ Đề xuất sửa doc
Không cần sửa cấu trúc — ASCII đúng. Có thể làm rõ: "Giá lẻ"/"Tiết kiệm" tính **phía client** từ
`productMap`; chip sản phẩm hiện **raw UUID** thoáng qua nếu query `['admin','products']` chưa settle
(`page.tsx:294`). FLAG 🔴 không có ở Zone này (đây là loading-gap đã ghi ở `_loading.md` Flag 1, không
phải bug render).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![ComboTable thật](./screenshots/zoneC_table_real.png)<br>⏳ chưa chụp — cần stack + Playwright |  |

---

## 🟢 Zone D — ComboFormModal (picker sản phẩm)
Nguồn code: `combos/page.tsx:344-552` (picker `:411-473`)

### ① Doc đang vẽ (`admin_combos.md:40-43`)
```
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ [☐] Bánh cuốn thịt             35.000đ                   │ │
│ │ [☑] Canh mọc nhi               10.000đ   [−] 1 [+]       │ │
│ └──────────────────────────────────────────────────────────┘ │
```

### ② Code render THẬT
```
┌────────────────────────────────────────────────────────────────┐
│ ⬜ Bánh cuốn thịt                              35.000đ          │
│  ▲ checkbox SVG tuỳ biến (KHÔNG phải ký tự ☐)  ▲ formatVND      │
│    page.tsx:422-430                              page.tsx:438    │
│    (mô tả ngắn truncate nếu product.description — page.tsx:441) │  ◀ ASCII bỏ dòng này
│────────────────────────────────────────────────────────────────│
│ ✅ Canh mọc nhi (nền orange-50)                10.000đ [−] 1 [+]│
│  ▲ checked: bg + tick SVG trắng     stepper chỉ hiện khi checked │
│    page.tsx:434                      page.tsx:445-469 (− disabled khi =1)│
└────────────────────────────────────────────────────────────────┘
  • Toàn hàng click được → toggleProduct (page.tsx:419); vùng stepper stopPropagation (page.tsx:448)
  • Danh sách = uniqueProducts (de-dup theo product.name, page.tsx:190-192)
```

### ③ Đề xuất sửa doc
ASCII `[☐]`/`[☑]` là gần đúng chấp nhận được, nhưng có thể ghi chú: checkbox là **SVG tuỳ biến** (ô bo
góc + tick), mỗi hàng có **dòng mô tả** tuỳ chọn, và **toàn hàng** click được (không chỉ ô checkbox).
Không có bug code phía sau Zone này.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ![ComboFormModal picker thật](./screenshots/zoneD_modal_real.png)<br>⏳ chưa chụp — cần stack + Playwright |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| B — PageHeader | Không bắt buộc (tuỳ chọn: ghi chú nhãn "Đang tạo..." khi `randomLoading`) | — |
| C — ComboTable | Không bắt buộc (tuỳ chọn: làm rõ Giá lẻ/Tiết kiệm tính phía client; chip có thể hiện UUID khi loading) | — (loading-gap đã ghi `_loading.md` Flag 1, không phải bug render) |
| D — ComboFormModal | Không bắt buộc (tuỳ chọn: ghi chú checkbox SVG + dòng mô tả + toàn hàng click được) | — |

> **Không Zone nào có drift hình ảnh thật.** Mọi đề xuất ở đây là tinh chỉnh ASCII tuỳ chọn, không phải
> sửa bắt buộc. Các bug code thật của trang (Bug 1–4) nằm ở BE, không phải tầng render — xem
> `COMPARISON_DOC_VS_CODE_DETAILED.md` + `COMBOS_BUGS.md`.
</content>
