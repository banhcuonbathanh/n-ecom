# Admin Categories — So Sánh Chi Tiết Tài Liệu vs. Code (5 Mảng)

> **Phạm vi:** rà soát sâu (chỉ đọc) bộ tài liệu `/admin/categories` so với code FE/BE thật theo 5 trục:
> ① giao diện component · ② luồng dữ liệu cross-component · ③ luồng dữ liệu cross-page ·
> ④ hành vi loading · ⑤ mô hình dữ liệu FE⇄BE.
> **Chỉ đọc — KHÔNG sửa code hay tài liệu.** File này chỉ ghi nhận chênh lệch.
> Thực hiện bởi 1 sub-agent Sonnet (Mảng 5 · FE⇄BE) + orchestrator trực tiếp truy vết (giao diện/cross-page/loading);
> các mục 🔴 đã được **tự tay kiểm chứng lại** dựa trên source.
> **Code là chuẩn.** Mọi ô "Code thực tế" đều có dẫn chứng `file:line` từ branch hiện tại
> `experience_claude.md_system_1_test_iphon2_change_code`. Ngày: 2026-06-21.
>
> **Kết luận: bộ tài liệu ít lệch, trung thực với code.** Không có mâu thuẫn nào giữa tài liệu và code.
> Mục 🔴 duy nhất là một **lỗi code FE thật** (manager thấy nút "Xóa" → 403 im lặng) mà bộ tài liệu
> **đã ghi chính xác** (`CATEGORIES_BUGS.md`, `admin_categories.md` Flag 7, `_be.md` Flag 7,
> `SCENARIO_CATEGORY_CRUD.md` beat 09:38). Chênh lệch tài liệu thật duy nhất là **số dòng `main.go` bị lỗi thời (+14)**
> và **tên branch nguồn đã cũ** trên cả sáu file tài liệu.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Giao diện component | ✅ Chính xác — ASCII + zones + tương tác khớp `page.tsx` | 0 | 0 | 3 |
| ② Luồng cross-component | ✅ Không áp dụng theo thiết kế — single client component, không có shared store (tài liệu đã nói rõ) | 0 | 0 | 1 |
| ③ Luồng cross-page | ✅ Chính xác — tất cả dẫn chứng dòng FE query **chính xác tuyệt đối**; xác nhận tabs là cosmetic | 0 | 1 | 2 |
| ④ Hành vi loading | ✅ Chính xác — cả 4 lớp + các nhánh khớp, dẫn chứng dòng chính xác | 0 | 0 | 2 |
| ⑤ Mô hình dữ liệu FE⇄BE | ✅ BE hoàn toàn đúng; chỉ có block route `main.go` bị lỗi thời +14 | 1 | 2 | 5 |
| **Tổng** | **Ít lệch, trung thực với code** | **1** | **3** | **13** |

> Mục 🔴 là một **lỗi code** đã có hồ sơ — không phải lỗi tài liệu. Không có phát hiện nào chỉ từ so sánh:
> mọi flag code bên dưới đều đã được ghi trong bộ tài liệu trang.

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng)

### 🔴 #1 — Manager thấy nút "Xóa" nhưng `DELETE /categories/:id` chỉ dành cho admin → 403 im lặng, thông báo sai (**lỗi code FE thật; tài liệu đúng**)

- **FE render "Xóa" cho mọi hàng, không kiểm tra role** — `page.tsx:131-136` (`onClick={() => handleDelete(c.id, c.name)}`); `handleDelete` → `deleteMut.mutate(id)` (`page.tsx:79-82`).
- **BE chặn DELETE sau tầng admin** — `adm := catR.Group(""); adm.Use(authMW, middleware.AtLeast("admin")); adm.DELETE("/:id", …)` tại **`main.go:207-210`** (bộ tài liệu dẫn chứng lỗi thời `main.go:193-196`/`:194-196`). JWT của `manager` → **403** trước khi handler chạy.
- **`onError` chỉ xử lý riêng 409** — mọi status khác (kể cả 403) đều rơi vào catch-all `toast.error('Không thể xóa danh mục')` (`page.tsx:69-76`). Lỗi quyền render thành thông báo lỗi chung chung.
- **Tại sao quan trọng:** manager vào được trang này (admin shell guard `minRole=MANAGER`, `layout.tsx:30`), thấy nút đỏ có thể bấm nhưng luôn thất bại với thông báo sai. Cùng lớp lỗi với A12 Training Bug 2 và nút DELETE admin-only trên A3 Products.
- **Trạng thái:** ✅ đã được ghi lại — `CATEGORIES_BUGS.md` Bug 1, `admin_categories.md` Flag 7, `admin_categories_be.md` Flag 7 + bảng Error, `SCENARIO_CATEGORY_CRUD.md` 09:38. **Đây là bản sửa code (FE), không phải sửa tài liệu**, và chưa có trên `MASTER_TASK.md`.

> **Không có 🔴 nào khác.** Agent Mảng 5 ban đầu đề xuất ba mục 🔴 (FE thiếu `description`+`is_active` trong type `Category`; `createCategory`/`updateCategory` không bao giờ gửi `description`). Sau khi tự kiểm chứng, những điều này là **Flags đúng theo thiết kế, tài liệu đã ghi** (`admin_categories.md` Flag 1 + Flag 3, `_be.md` Flag 1 + Flag 3): BE trả về/chấp nhận các field đó, FE cố ý bỏ qua, và tài liệu nói đúng như vậy. **Hạ cấp xuống 🟢 / đúng theo thiết kế — không mâu thuẫn.**

---

## Code chết / không thể truy cập

**Không có.** Không có component nào zero-import, không có modal nào không thể truy cập. `page.tsx` là một single self-contained client component (danh sách + modal RHF trong một file); `CategoryTabs` (component tiêu thụ downstream) đang hoạt động trên `/menu` và `/pos`. Nút `Xóa` *có thể truy cập nhưng không hoạt động đối với manager* (🔴 #1) — đó là lỗi guard, không phải code chết.

---

## Mảng ① — Giao Diện Component

**Kết luận:** ✅ Chính xác. Wireframe ASCII, bảng Zones, và Key Interactions trong `admin_categories.md` đều khớp với render thật trong `page.tsx`. Tài liệu còn tự sửa một wireframe cũ trước đó (Flag 2 của chính nó). Chỉ có một vài dẫn chứng dòng lệch 1.

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| A Header | `Danh mục (N)` + `[+ Thêm danh mục]`, `page.tsx:86-94` | `<h2>Danh mục ({categories.length})</h2>` `page.tsx:87` + button `page.tsx:88-93` | 🟢 | Không cần làm |
| B Cột bảng | "Tên danh mục", "Thứ tự", cột action trống; nút chữ "Sửa"/"Xóa" | `<thead>` `page.tsx:111-116`; hàng `page.tsx:119-140`; "Sửa" `page.tsx:129`, "Xóa" `page.tsx:135` | 🟢 | Không cần làm |
| Sắp xếp phía client | `[...categories].sort((a,b)=>a.sort_order-b.sort_order)` `page.tsx:119` | chính xác tại `page.tsx:119` | 🟢 | Không cần làm |
| Trạng thái rỗng | "Chưa có danh mục nào" `page.tsx:141-147` | chính xác tại `page.tsx:141-147` | 🟢 | Không cần làm |
| Dẫn chứng trạng thái lỗi | `page.tsx:99-107` | khoảng thực `page.tsx:98-107` (lệch 1) | 🟢 | Chỉnh lại thành `:98-107` |
| Modal form | tiêu đề thêm/sửa, các field name + sort_order, `[Huỷ][Lưu]`, "Đang lưu..." `page.tsx:153-198` | chính xác `page.tsx:153-198`; tiêu đề `:157-159`; "Đang lưu..." `:192` | 🟢 | Không cần làm |
| Xác nhận xóa | `confirm('Xóa danh mục "<name>"?')` tự nhiên `page.tsx:80` | chính xác `page.tsx:80` | 🟢 | Không cần làm |
| Lưu 409 → inline | `setError('name', …'Tên danh mục đã tồn tại.')` `page.tsx:55-57` | `page.tsx:55-56`; catch-all toast `'Có lỗi xảy ra'` `page.tsx:58` | 🟢 | Không cần làm |

**Khớp đã xác minh:** header, tương tác thêm/sửa/xóa (`openAdd` `:32-36`, `openEdit` `:37-41`, `handleDelete` `:79-82`), cấu trúc bảng, các nhánh rỗng/loading/lỗi, các field modal, "Thử lại" `refetch()` `page.tsx:101-106`.

---

## Mảng ② — Luồng Cross-Component

**Kết luận:** ✅ Không áp dụng theo thiết kế, và bộ tài liệu đã nói rõ. `page.tsx` là một **single client component**: toàn bộ state là `useState` cục bộ (`editItem`/`showModal`, `page.tsx:19-20`) + một RHF instance + một TanStack query. Không có **Zustand store dùng chung, không có sub-component trao đổi dữ liệu** — nên không có gì để vẽ. Không tồn tại file `admin_categories_crosscomponent_dataflow.md` (đúng theo PAGE_FOLDER_GUIDE: chỉ cần khi có ≥3 widget tương tác với shared store).

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Không có shared store / không có luồng cross-component | "N/A for this page" (`SCENARIO_CATEGORY_CRUD.md` §A) | xác nhận — chỉ `useState` cục bộ `page.tsx:18-26` | 🟢 | Không cần làm |

---

## Mảng ③ — Luồng Cross-Page

**Kết luận:** ✅ Chính xác. Mọi dẫn chứng dòng FE query downstream đều **chính xác tuyệt đối**, mô hình truyền thông qua Redis-invalidation đúng (không SSE/WS, không localStorage), và mối lo "cosmetic tabs" cross-page được xác nhận tại handler. Chỉ có dẫn chứng route `main.go` trong source map là lỗi thời.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| FE write invalidations | `qc.invalidateQueries(['admin','categories'])` save `:49` / delete `:66` | chính xác — `page.tsx:49`, `page.tsx:66` | 🟢 | Không cần làm |
| Query `/menu` của khách | `['categories']`, `staleTime:5*60*1000`, `menu/page.tsx:52-56` | chính xác `menu/page.tsx:52-56` | 🟢 | Không cần làm |
| Query POS | `['categories']`, `staleTime:5*60*1000`, `pos/page.tsx:39-43` | chính xác `pos/page.tsx:39-43` | 🟢 | Không cần làm |
| Query ProductFormModal | `['categories']`, `queryFn:listCategories`, `staleTime:60_000`, `:39-43` | chính xác `ProductFormModal.tsx:39-43`; empty guard `:137-139`; save `disabled` `:277` | 🟢 | Không cần làm |
| Render `CategoryTabs` | tab buttons `:24-36` | chính xác map `CategoryTabs.tsx:24-36` (component `:10-40`) | 🟢 | Không cần làm |
| Tabs cosmetic (lo ngại cross-page) | `GET /products` bỏ qua `category_id` → tabs là cosmetic | xác nhận: `ListProducts` `product_handler.go:42-43` gọi `svc.ListProducts(ctx)` **không có params**; POS truyền `category_id` (`pos/page.tsx:48`) nhưng bị bỏ qua | 🟢 | Không cần làm (tồn tại trước, đã ghi trong BE_DOC_TRACKER) |
| Dẫn chứng `invalidateProductCaches` | `product_service.go:709-717` | xác nhận `:709-717`, xóa cả hai key khi `id=""` | 🟢 | Không cần làm |
| Dẫn chứng route `main.go` (source map) | "Category routes … `main.go:185-197`" + `:373` | thực tế `main.go:198-210` (+13/+14) | 🟡 | Chỉnh lại thành `:198-210` |

**Khớp đã xác minh:** cả ba consumer `['categories']` downstream, lý do side-effect products-list `enrichProduct`, ma trận durability, bảng hành vi F5, "không realtime".

---

## Mảng ④ — Hành Vi Loading

**Kết luận:** ✅ Chính xác. Cả bốn lớp loading và ba nhánh nội dung chính khớp code với dẫn chứng dòng chính xác.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Lớp 1 — AuthGuard blank | `if (!user) return null` `AuthGuard.tsx:23` | chính xác `AuthGuard.tsx:23` | 🟢 | Không cần làm |
| Lớp 2 — RoleGuard chặn | `roleValue < minRole` → "Không có quyền truy cập trang này" `RoleGuard.tsx:16-20` | chính xác `RoleGuard.tsx:16-20`; bọc với `minRole={Role.MANAGER}` `layout.tsx:30` | 🟢 | Không cần làm |
| Lớp 3 — spinner route | vòng spin cam `h-8 w-8 … border-t-orange-500` `admin/loading.tsx:1-7` | chính xác `admin/loading.tsx:3-4` | 🟢 | Không cần làm |
| Lớp 4 — page query | `['admin','categories']`, `listCategories`, `staleTime:60_000`, `page.tsx:22-26` | chính xác `page.tsx:22-26` | 🟢 | Không cần làm |
| Các nhánh nội dung | isLoading→"Đang tải..." `:96-97`; isError→card `:98-107`; success table `:108-151` | chính xác | 🟢 | Không cần làm |
| Đang lưu in-flight | "Đang lưu..." + `disabled={saveMut.isPending}` `page.tsx:189-192` | chính xác `page.tsx:189-192` | 🟢 | Không cần làm |
| Xóa không có visual in-flight | không spinner/làm mờ khi xóa | xác nhận `page.tsx:79-82` (chỉ `confirm` + toast) | 🟢 | Không cần làm |

**Khớp đã xác minh:** thứ tự các lớp loading, khoảng trống plain-text không có skeleton (Flag 1), không có optimistic UI (Flag 2), không có `loading.tsx` trong thư mục categories (Flag 5).

---

## Mảng ⑤ — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** ✅ BE hoàn toàn đúng và gần như mọi dẫn chứng dòng Go đều chính xác. Chênh lệch thật **duy nhất** là block route `main.go`, vì file đã tăng thêm — tài liệu dẫn chứng `:184-197`, thực tế là `:198-210` (**+14**). Các dẫn chứng handler/service/repo/sqlc đều chính xác.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Route group `catR` | `v1.Group("/categories")` `main.go:184` | thực tế `main.go:198` (**+14**) | 🟡 | Chỉnh lại block route thành `:198-210` |
| GET public / POST·PATCH manager / DELETE admin | `:186` / `:188-191` / `:193-196` | GET `:199`; mgr `AtLeast("manager")` `:201-205`; adm `AtLeast("admin")` `:207-210` — **auth gates đúng** | 🟡 | Chỉnh lại số dòng, không sửa gì khác |
| Handler `ListCategories` serialize 5 field | `gin.H{id,name,description,sort_order,is_active}` `:181-187` | xác nhận, kết thúc `:188` (lệch 1) | 🟢 | Chỉnh lại thành `:181-188` |
| NULL `description`→"" | `:177-180` | chính xác | 🟢 | Không cần làm |
| `CreateCategory` 201 `{data:{id}}` | `:199-215`, trả về `:214` | chính xác | 🟢 | Không cần làm |
| `UpdateCategory` 200 message | `:224-239`, "Cập nhật danh mục thành công" | chính xác text `:238` | 🟢 | Không cần làm |
| Comment handler "PUT" vs route PATCH | Flag 5 — comment lỗi thời | xác nhận `product_handler.go:223` ghi PUT; route là PATCH `main.go:204` | 🟢 | (code) sửa comment thành PATCH |
| `DeleteCategory` 204 | `c.Status(http.StatusNoContent)` `:247` | chính xác `:247` | 🟢 | Không cần làm |
| Các method Service | `ListCategories` `:344-357`, `CreateCategory` `:365-379` (inval `:377`), `UpdateCategory` `:387-406` (inval `:404`), `DeleteCategory` `:408-427` (inval `:425`) | tất cả chính xác | 🟢 | Không cần làm |
| Raw SQL Repo | `GetCategoryByName` `:119-126`; `CountProductsByCategory` `:128-134` (chỉ products, không combo) | tất cả chính xác; xác nhận combo-blindness (Flag 6) | 🟢 | Không cần làm |
| sqlc queries | `CreateCategory` `:23-26` (is_active=1), `ListCategories` `:306-310`, `SoftDeleteCategory` `:623-626`, `UpdateCategory` `:678-682` (full replace) | tất cả chính xác | 🟢 | Không cần làm |
| Errors | `ErrNotFound` `:28`, `ErrCategoryHasProducts` `:37`, `ErrCategoryNameConflict` `:38` | xác nhận (tài liệu ghi `:28,37-38`) | 🟢 | Không cần làm |
| FE `Category` type bỏ qua `description`+`is_active` | Flag 1 — đúng theo thiết kế | xác nhận `types/product.ts:1-5` | 🟢 | Không cần làm (đúng theo thiết kế) |
| `createCategory`/`updateCategory` không bao giờ gửi `description` | Flag 3 — đúng theo thiết kế | xác nhận `admin.api.ts:10-14` | 🟢 | Không cần làm (đúng theo thiết kế) |

**Khớp đã xác minh:** mọi status code + body của handler, cả bốn method service với khoảng dòng chính xác, `invalidateProductCaches` `:709-717`, tất cả raw-SQL repo, tất cả bốn sqlc query, cả ba sentinel error, flag write-once `is_active` (Flag 4), guard xóa mù combo (Flag 6).

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code (FE) | Ẩn/vô hiệu hóa "Xóa" khi `role !== 'admin'` (ưu tiên) **hoặc** thêm nhánh 403 vào delete `onError` với thông báo rõ ràng. Đã có hồ sơ tại `CATEGORIES_BUGS.md` Bug 1 — **chưa có trên `MASTER_TASK.md`**. Cân nhắc gộp với A12 Training Bug 2 + A3 Products (cùng root). | `fe/src/app/(dashboard)/admin/categories/page.tsx:131-136` (hoặc `:69-76`) |
| 2 | 🟡 Sửa tài liệu | Chỉnh lại các dẫn chứng route categories trong `main.go` từ `:184-197`/`:193-196`/`:194-196` → **`:198-210`/`:207-210`** trong `_be.md`, `admin_categories.md` (Flag 7), `CATEGORIES_BUGS.md`, `admin_categories_crosspage_dataflow.md` (source map), `SCENARIO_CATEGORY_CRUD.md` (sources). | 5 file tài liệu |
| 3 | 🟢 Sửa tài liệu | Cập nhật tên branch nguồn trên cả sáu file tài liệu: `experience_claude.md_system_1` → `experience_claude.md_system_1_test_iphon2_change_code`. | 6 file tài liệu |
| 4 | 🟢 Sửa tài liệu | Chỉnh lại lệch 1 dòng: trạng thái lỗi `:99-107`→`:98-107`; handler serialize `:181-187`→`:181-188`. | `admin_categories.md`, `_be.md` |
| 5 | 🟢 Code (tùy chọn) | Sửa comment lỗi thời `// UpdateCategory handles PUT …` thành PATCH (đã ghi Flag 5). | `be/internal/handler/product_handler.go:223` |

> **Ghi chú CLAUDE.md:** các bản sửa tài liệu (#2–#4) là một doc task được ALIGN. Mỗi thay đổi **code** (#1, #5) phải được đăng ký vào `docs/tasks/MASTER_TASK.md` và được ALIGN **trước khi chạm vào bất kỳ file nào** — audit này không thay đổi gì.
