# Admin Categories — So Sánh Hình Vẽ (Doc vs. Code render thật)

> **Trạng thái ảnh chụp: ⏳ CHƯA CHỤP** — stack chưa chạy. ASCII ② (code render thật) và ③ (đề xuất)
> được dựng trực tiếp từ source `page.tsx` trên branch
> `experience_claude.md_system_1_test_iphon2_change_code`; cột 📷 để `⏳ chưa chụp` cho tới khi chạy
> `docker compose up -d --build fe` + Playwright (mẫu: `e2e/tests/capture-menu-zones.spec.ts`,
> viewport iPhone 390×844 — nhưng đây là trang admin desktop nên dùng viewport rộng).
>
> **Lưu ý quan trọng:** trang `/admin/categories` gần như **KHÔNG có visual drift** — ASCII trong
> `admin_categories.md` đã khớp với code render thật (doc đã tự sửa wireframe cũ, xem Flag 2). Vì vậy
> file này chỉ minh hoạ 2 zone chính (Bảng + Modal) để xác nhận khớp, và 1 điểm 🔴 **không phải lỗi vẽ**
> mà là lỗi guard (nút "Xóa" hiện cho manager nhưng `DELETE` chỉ admin → 403 thầm lặng).
>
> Nguồn: `fe/src/app/(dashboard)/admin/categories/page.tsx` ·
> EN đầy đủ → [COMPARISON_DOC_VS_CODE_DETAILED.md](COMPARISON_DOC_VS_CODE_DETAILED.md)

---

## 🟢 Zone B — Bảng danh mục (khớp)
Nguồn code: `page.tsx:108-151`

### ① Doc đang vẽ (`admin_categories.md:32-40`)
```
┌────────────────────────────────────────────────────────────┐
│ Tên danh mục              Thứ tự                           │
│ Bánh cuốn                   1          [Sửa]  [Xóa]       │
│ Canh                        2          [Sửa]  [Xóa]       │
│ Đồ uống                     3          [Sửa]  [Xóa]       │
│ Combo                       4          [Sửa]  [Xóa]       │
│     Chưa có danh mục nào   ← empty state                  │
└────────────────────────────────────────────────────────────┘
```

### ② Code render THẬT
```
┌────────────────────────────────────────────────────────────┐
│ Tên danh mục          Thứ tự                               │ ◀── thead page.tsx:111-116
│                       (canh giữa)        (cột rỗng)        │     cột 3 không có header
│ ──────────────────────────────────────────────────────────│
│ Bánh cuốn               1            [Sửa]      [Xóa]     │ ◀── rows page.tsx:119-140
│ Canh                    2            [Sửa]      [Xóa]     │     sort client-side :119
│ Đồ uống                 3            [Sửa]      [Xóa]     │     [Sửa] :125-130 (border)
│ Combo                   4            [Sửa]      [Xóa]     │     [Xóa] :131-136 (đỏ)
│                                                            │
│            Chưa có danh mục nào                            │ ◀── empty colSpan=3 :141-147
└────────────────────────────────────────────────────────────┘
   Data: useQuery(['admin','categories']) → listCategories → GET /categories
```

### ③ Đề xuất sửa doc
**Không cần sửa nội dung** — ASCII doc đã khớp. Chỉ tinh chỉnh line-cite lẻ (error state `:99-107`→`:98-107`).
**FLAG 🔴 (lỗi code, không phải lỗi vẽ):** nút **[Xóa]** (`page.tsx:131-136`) render cho MỌI vai trò,
nhưng `DELETE /categories/:id` chỉ cho admin (`main.go:207-210`, `AtLeast("admin")`). Manager bấm → 403
→ rơi vào catch-all `toast.error('Không thể xóa danh mục')` (`page.tsx:73-74`). Xem
[CATEGORIES_BUGS.md](CATEGORIES_BUGS.md) Bug 1.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Sẽ chứng minh:** cột "Thứ tự" canh giữa, cột hành động canh phải, nút [Xóa] đỏ hiện cho cả manager |  |

---

## 🟢 Zone — Form Modal (Thêm / Sửa) (khớp)
Nguồn code: `page.tsx:153-198`

### ① Doc đang vẽ (`admin_categories.md:42-49`)
```
┌────────────────────────────────┐
│ Thêm danh mục / Sửa danh mục  │
│ Tên danh mục: [____________]  │
│ Thứ tự hiển thị: [_________]  │
│           [Huỷ]       [Lưu]   │
│  (submitting → "Đang lưu...")  │
└────────────────────────────────┘
```

### ② Code render THẬT
```
┌──────────────────────────────────────┐
│ Thêm danh mục   ▕ hoặc ▏  Sửa danh mục│ ◀── title :157-159 (editItem ? Sửa : Thêm)
├──────────────────────────────────────┤
│ Tên danh mục                          │ ◀── label :163
│ [ Bánh cuốn, Bún bò...              ] │ ◀── input register('name') :164-168
│   (lỗi Zod đỏ nếu rỗng :169)          │     placeholder thật
│                                        │
│ Thứ tự hiển thị                       │ ◀── label :172
│ [ 0                                 ] │ ◀── input type=number register('sort_order') :173-177
│                                        │
│ [    Huỷ    ]   [      Lưu      ]     │ ◀── Huỷ :180-186 · Lưu :187-193
│                  (disabled khi pending,│     "Đang lưu..." khi saveMut.isPending :192
│                   "Đang lưu...")       │
└──────────────────────────────────────┘
   overlay: fixed inset-0 bg-black/50 z-50 :154
```

### ③ Đề xuất sửa doc
**Không cần sửa** — modal doc khớp code (2 field name + sort_order, nút Huỷ/Lưu, trạng thái "Đang lưu...").

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Sẽ chứng minh:** modal có đúng 2 field (Tên + Thứ tự), không có field mô tả, nút Lưu cam |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| B Bảng | Tinh chỉnh line-cite lẻ (`:98-107`); cập nhật `main.go:207-210` cho Bug 1 | 🔴 Ẩn/disable nút [Xóa] khi `role !== 'admin'` (hoặc thêm nhánh 403) — `page.tsx:131-136` |
| Modal | Không cần | Không cần |

> Cột 💬 để trống cho chủ sở hữu điền — sẽ phản hồi ở lần chạy sau.
