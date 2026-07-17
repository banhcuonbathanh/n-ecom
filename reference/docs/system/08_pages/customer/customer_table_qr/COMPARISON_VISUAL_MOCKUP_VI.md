# So Sánh Hình Ảnh Theo Zone — `customer_table_qr` (`/table/:tableId`)

> **Trang này chỉ có 2 trạng thái hiển thị** (không có content zone cố định): **Spinner** (mặc định,
> khi `POST /auth/guest` đang chạy) và **Màn hình lỗi** (khi token sai/hết hạn/bàn bị xoá). Cả hai đều
> **khớp chính xác** với ASCII trong `customer_table_qr.md` — không có drift hình ảnh. File này ghi lại
> đối chiếu ①doc · ②code thật · ③đề xuất cho từng zone để hoàn thiện bộ 3 file.
>
> **Trạng thái ảnh chụp:** ⏳ **CHƯA CHỤP** — stack chưa chạy (`docker compose up -d --build fe` +
> Playwright). ASCII ②/③ dựng thẳng từ source `page.tsx`; cột 📷 để `⏳ chưa chụp`. Không bịa ảnh.
> Cột 💬 luôn để trống — của chủ sở hữu điền, lần chạy sau mình phản hồi.
>
> Branch: `experience_claude.md_system_1_test_iphon2_change_code` · Ngày: 2026-06-21 · Nguồn:
> `fe/src/app/table/[tableId]/page.tsx` (đã đọc toàn bộ 67 dòng).

---

## 🟢 Zone 1 — Spinner (trạng thái mặc định, đang tải)
Nguồn code: `fe/src/app/table/[tableId]/page.tsx:61-66`

### ① Doc đang vẽ (`customer_table_qr.md:20-34`)
```
┌──────────────────────────────┐
│                              │
│                              │
│         ◌                    │
│   (spinner, border-primary,  │
│    border-t-transparent,     │
│    animate-spin)             │
│                              │
│     Đang tải menu…           │
│                              │
└──────────────────────────────┘
   page.tsx:62-66 (spinner)
```

### ② Code render THẬT
```
┌──────────────────────────────┐   ◀── min-h-screen bg-background, flex-col
│                              │       items-center justify-center gap-4
│                              │       (page.tsx:62)
│            ◌                 │   ◀── w-10 h-10 border-4 border-primary
│        (animate-spin)         │       border-t-transparent rounded-full
│                              │       animate-spin (page.tsx:63)
│       Đang tải menu…          │   ◀── text-muted-fg text-sm (page.tsx:64)
│                              │
└──────────────────────────────┘
```
✅ Khớp chính xác — class, copy, layout đều đúng như doc vẽ.

### ③ Đề xuất sửa doc
Không cần sửa hình. ⚠️ FLAG 🟡 (code, không phải doc): không có `timeout`/`AbortController`
(`api-client.ts:6-9` + `page.tsx:16-44`) → spinner có thể treo vô hạn nếu `POST /auth/guest` bị treo.
Đây là bug code đã ghi ở `TABLE_QR_BUGS.md` Bug 2, không phải drift hình ảnh.

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** spinner full-screen + copy "Đang tải menu…" ngay sau khi mở `/table/<token>` |  |

---

## 🟢 Zone 2 — Màn hình lỗi (token sai / hết hạn / bàn bị xoá)
Nguồn code: `fe/src/app/table/[tableId]/page.tsx:46-59`

### ① Doc đang vẽ (`customer_table_qr.md:22-32`)
```
┌──────────────────────────────┐
│             ⚠️               │ ← inline JSX page.tsx:49-50
│  Mã bàn không hợp lệ hoặc    │
│  đã hết hạn. Vui lòng quét   │
│  lại QR.                     │
│                              │
│      Vào menu  (button)      │ ← page.tsx:51-56
└──────────────────────────────┘
```

### ② Code render THẬT
```
┌──────────────────────────────┐   ◀── min-h-screen bg-background flex-col
│             ⚠️               │       items-center justify-center px-6 gap-4
│                              │       (page.tsx:48)
│  Mã bàn không hợp lệ hoặc    │   ◀── span text-4xl ⚠️ (page.tsx:49)
│  đã hết hạn. Vui lòng quét   │   ◀── p text-urgent text-center text-sm
│  lại QR.                     │       {error} (page.tsx:50)
│                              │
│       Vào menu               │   ◀── button text-primary text-sm underline
│       (underline link)        │       onClick → router.replace('/menu')
└──────────────────────────────┘       (page.tsx:51-56)
```
✅ Khớp chính xác. Copy lỗi luôn là chuỗi cố định `'Mã bàn không hợp lệ hoặc đã hết hạn. Vui lòng quét
lại QR.'` cho **mọi** lỗi (400/404/500) — `page.tsx:40`.

### ③ Đề xuất sửa doc
Không cần sửa hình. ⚠️ FLAG (code, không phải doc): nút chỉ có "Vào menu" — **không có retry** quét lại
QR (`page.tsx:51-56`); một lỗi 500/mạng thoáng qua buộc khách phải quét lại sticker vật lý
(`TABLE_QR_BUGS.md` Bug 2 / `customer_table_qr_loading.md` Gap 3).

| 📷 Ảnh chụp thật | 💬 Feedback của bạn |
|---|---|
| ⏳ chưa chụp — cần `docker compose up -d --build fe` + Playwright<br>⚠ **Bằng chứng cần chụp:** mở `/table/sai-token` → màn ⚠️ + copy lỗi + link "Vào menu" |  |

---

## Tổng hợp việc cần làm

| Zone | Sửa doc | Sửa code (đăng ký MASTER trước) |
|---|---|---|
| Zone 1 — Spinner | Không (hình khớp) | 🟡 Thêm `timeout` + `AbortController` chống treo spinner (`api-client.ts:6`, `page.tsx:16-44`) — Bug 2 |
| Zone 2 — Màn lỗi | Không (hình khớp) | 🟡 (tuỳ chọn) Thêm nút "Thử lại" gọi lại QR exchange thay vì chỉ "Vào menu" |

> Bộ hình của trang này **không có drift** — hình doc = code render. Mọi việc cần làm đều là **bug
> code** đã được doc-set ghi nhận trung thực, không phải sửa tài liệu. Theo CLAUDE.md, mỗi thay đổi code
> phải đăng ký `MASTER_TASK.md` + ALIGN trước khi chạm file. Audit này không sửa gì.
