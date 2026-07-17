# Admin Ingredients — Đối Chiếu Hình Vẽ (Doc vs. Code render thật)

> **Trạng thái ảnh chụp:** ⏳ CHƯA CHỤP — stack đang tắt (`localhost:3000` DOWN). ASCII ②/③ dưới đây
> dựng **từ code**, không phải từ trí nhớ. Muốn có ảnh thật: `docker compose up -d --build fe` rồi
> chụp `/admin/ingredients` (đăng nhập manager+) bằng Playwright.
> Branch: `experience_claude.md_system_1_test_iphon2_change_code` · Ngày: 2026-06-21 · Read-only.
> Cột 💬 luôn để trống — của bạn điền, lần sau mình đọc lại.

---

## 🔴 Zone 1 — IngredientTable (bảng nguyên liệu)
Nguồn code: `IngredientTable.tsx:52-111`

### ① Doc đang vẽ (`admin_ingredients.md:18-24`)
```
┌──────────────────────────────────────────────────────────────┐
│ Nguyên liệu    Đơn vị   Tồn kho    Hành động                 │
│ Bột gạo        kg       25.5       [Nhập/Xuất] [✎] [🗑]      │
│ Thịt heo xay   kg        8.0       [Nhập/Xuất] [✎] [🗑]      │
│ Mộc nhĩ        kg        2.3       [Nhập/Xuất] [✎] [🗑]      │
└──────────────────────────────────────────────────────────────┘
   (4 cột · nút Nhập/Xuất + 2 icon ✎ 🗑)
```

### ② Code render THẬT
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ STT  Tên nguyên liệu  Đơn vị  Số lượng tồn  Ngày nhập  Hạn SD   Trạng thái  Thao tác│ ◀── 8 CỘT (IngredientTable.tsx:57-64)
│  1   Bột gạo          kg            25.5     12/06/2026 10/09/26 [Còn hàng✓] [Sửa][Xóa]│ ◀── StatusBadge :16-28 · nút TEXT :94,102
│ ⚠2   Thịt heo xay     kg             8.0     12/06/2026 15/06/26 [Sắp hết hạn][Sửa][Xóa]│ ◀── hàng expiring tô cam + ⚠ (:31-33,71-73)
│  3   Mộc nhĩ          kg             2.3     12/06/2026 10/09/26 [Sắp hết] [Sửa][Xóa]│ ◀── KHÔNG có nút "Nhập/Xuất"
└──────────────────────────────────────────────────────────────────────────────────┘
   Xóa → confirm() gốc của trình duyệt (IngredientTable.tsx:98)
```
Các cột doc bỏ sót hoàn toàn: **STT · Ngày nhập · Hạn SD · Trạng thái (badge)**.

### ③ Đề xuất sửa doc
```
Vẽ lại bảng 8 cột: STT · Tên nguyên liệu · Đơn vị · Số lượng tồn · Ngày nhập ·
Hạn SD · Trạng thái(badge) · Thao tác[Sửa][Xóa]. Bỏ "Nhập/Xuất" + icon ✎🗑.
```
> 🔴 **FLAG (code bug):** không có nút "Nhập/Xuất" trên hàng → `StockMoveModal` không bao giờ mở
> được (xem Zone 2). Đăng ký MASTER trước khi sửa code.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Sẽ chứng minh:** bảng thật có 8 cột + badge trạng thái, không có nút Nhập/Xuất |  |

---

## 🔴 Zone 2 — StockMoveModal (Nhập / Xuất / Điều chỉnh) — CODE CHẾT
Nguồn code: `page.tsx:28-104` (component) · `page.tsx:218-220` (nhánh render chết)

### ① Doc đang vẽ (`admin_ingredients.md:27-33`)
```
┌─StockMoveModal─────────────────┐
│ Điều chỉnh kho — Bột gạo       │
│ Loại: [Nhập (+) ▾]             │
│ Số lượng (kg): [____]          │
│ Ghi chú: [________]            │
│        [Huỷ] [✓ Xác nhận]      │
└────────────────────────────────┘
   (doc coi đây là tính năng lõi: "Nhập/Xuất → StockMoveModal → posts a movement")
```

### ② Code render THẬT
```
   (không có gì hiển thị)
   ◀── modal chỉ mở khi modal === 'move' (page.tsx:218)
   ◀── nhưng KHÔNG nơi nào set modal='move'
   ◀── chỉ có setModal('add') :182 và setModal('edit') :204
   ◀── comment tự thú: "kept for Nhập/Xuất flow, outside main spec" (page.tsx:19)
   ⇒ StockMoveModal + postStockMovement (admin.api.ts:276) + BE POST /admin/stock-movements = CHẾT
```

### ③ Đề xuất sửa doc
```
Hoặc (A) thêm nút mở modal → set modal='move'; hoặc (B) gỡ modal chết + xoá
mục Nhập/Xuất khỏi Zones row 4 + Key Interactions. Hiện kho chỉ đổi được qua
initialQuantity lúc tạo mới.
```
> 🔴 **FLAG (code bug):** tính năng tồn kho lõi không truy cập được từ UI. Đăng ký MASTER trước.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần stack lên<br>⚠ **Sẽ chứng minh:** không có nút nào mở được StockMoveModal trên trang thật |  |

---

## 🟡 Zone 3 — StoragePageHeader (tiêu đề + tìm + thêm)
Nguồn code: `StoragePageHeader.tsx:9-38`

### ① Doc đang vẽ (`admin_ingredients.md:16`)
```
│ Kho nguyên liệu   🔍[Tìm nguyên liệu...]    [+ Thêm nguyên liệu] │
```

### ② Code render THẬT
```
│ Kho nguyên liệu   🔍[Tìm nguyên liệu...]    [+ Thêm NL] │ ◀── nhãn nút "+ Thêm NL" (StoragePageHeader.tsx:35)
```

### ③ Đề xuất sửa doc
```
Đổi nhãn nút trong ASCII: "[+ Thêm nguyên liệu]" → "[+ Thêm NL]".
```

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp<br>⚠ **Sẽ chứng minh:** nút thật ghi "+ Thêm NL" |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| 1 — IngredientTable | Vẽ lại bảng 8 cột + badge trạng thái + hàng ⚠; nút text "Sửa"/"Xóa" | (kèm Zone 2) thêm nút "Nhập/Xuất" nếu muốn giữ tính năng |
| 2 — StockMoveModal | Bỏ/điều kiện hoá mục Nhập/Xuất ở Zones + Key Interactions | Wire `setModal('move')` **hoặc** xoá `StockMoveModal` + `postStockMovement` chết |
| 3 — StoragePageHeader | Đổi nhãn nút "+ Thêm NL" | — |
