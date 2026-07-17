# Admin Ingredients — Doc vs. Code (Đối Chiếu Chi Tiết)

> **Phạm vi:** rà soát bộ tài liệu `/admin/ingredients` (`admin_ingredients.md` + `admin_ingredients_be.md`)
> so với code FE/BE thực tế đang chạy. Các trục được kiểm tra: **Khu vực 1 — Giao diện component & tương tác** và
> **Khu vực 5 — Mô hình dữ liệu FE⇄BE & hành vi BE**. Các khu vực 2–4 (luồng dữ liệu cross-component / cross-page /
> loading) **không có file tài liệu** trong thư mục này, do đó không có gì để so sánh — trạng thái React
> cục bộ và trạng thái loading được gộp vào Khu vực 1.
> **Chỉ đọc — KHÔNG sửa code hay tài liệu.** Thực hiện bởi 1 sub-agent Sonnet BE-trace song song + tracing FE inline;
> **mọi mục 🔴 đã được tự tay kiểm chứng lại** từ nguồn. Branch:
> `experience_claude.md_system_1_test_iphon2_change_code`. Stack chưa chạy → chưa có screenshot.
> Ngày: 2026-06-21.

---

## Tóm Tắt Điều Hành

| Khu vực | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Giao diện component & tương tác | **Lệch nặng về giao diện** — tài liệu FE (`admin_ingredients.md`) chưa bao giờ được cập nhật sau khi bảng mở rộng lên 8 cột và trigger Nhập/Xuất bị bỏ | 2 | 3 | 3 |
| 5 — Mô hình dữ liệu FE⇄BE & hành vi BE | **`_be.md` rất sát nguồn** (mọi line-cite theo endpoint đều chính xác, mọi SQL body đều khớp) — nhưng che giấu một lỗi thực sự về error-mapping và một claim FK sai | 1 | 3 | 6 |

**Tổng kết:** tài liệu BE-view là một trong những tài liệu trung thực với nguồn nhất trong repo; tài liệu FE-view đã lệch nặng. Hai **lỗi code thật** được phát hiện (không chỉ là tài liệu lỗi thời): một tính năng stock-movement chết và một lỗi ánh xạ lỗi 404→500 bị hỏng.

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng)

1. **🔴 LỖI CODE — toàn bộ tính năng "Nhập / Xuất / Điều chỉnh" stock-movement không thể truy cập từ UI.**
   Tài liệu đặt nó là tính năng chính của trang (`admin_ingredients.md:27-33` vẽ `StockMoveModal`;
   hàng 4 của bảng Zones và gạch đầu dòng Key-Interactions "**Nhập/Xuất** → StockMoveModal → posts a movement"
   mô tả nó là cốt lõi). Trong code, `StockMoveModal` tồn tại (`page.tsx:28-104`) và được kiểm soát bởi
   `modal === 'move'` (`page.tsx:218`), **nhưng không có gì bao giờ set `modal` thành `'move'`** — các setter
   duy nhất là `setModal('add')` (`page.tsx:182`) và `setModal('edit')` (`page.tsx:204`). `IngredientTable`
   chỉ expose props `onEdit`/`onDelete` (`IngredientTable.tsx:4-8`) — **không có nút "Nhập/Xuất" ở đâu cả**.
   Chính comment của component thừa nhận: *"kept for Nhập/Xuất flow, outside main spec"* (`page.tsx:19`).
   Vậy `StockMoveModal` + `postStockMovement` (`admin.api.ts:276`) + endpoint BE `POST /admin/stock-movements`
   đều chết từ trang này. Tồn kho chỉ có thể thay đổi qua `initialQuantity` lúc tạo mới.

2. **🔴 LỆCH TÀI LIỆU — IngredientTable là lưới 8 cột; tài liệu vẽ 4 cột.** Header thực tế
   (`IngredientTable.tsx:57-64`): **STT · Tên nguyên liệu · Đơn vị · Số lượng tồn · Ngày nhập · Hạn SD ·
   Trạng thái · Thao tác**. ASCII tài liệu (`admin_ingredients.md:19-22`) chỉ vẽ **Nguyên liệu · Đơn
   vị · Tồn kho · Hành động**. Các cột tài liệu không hề đề cập: chỉ số (STT), ngày nhập (Ngày nhập),
   hạn sử dụng (Hạn SD), và một **status badge** (`StatusBadge` — Còn hàng/Sắp hết/Sắp hết hạn/Hết
   hàng, `IngredientTable.tsx:16-28`) kèm highlight hàng sắp hết hạn (`rowClass`, `:31-33`).

3. **🔴 LỖI CODE — `GET`/`PATCH /admin/ingredients/:id` với id không tồn tại trả về 500, không phải 404 như tài liệu mô tả.**
   `_be.md` §3/§5 + bảng Error-Behaviour khẳng định `sql.ErrNoRows → 404 INGREDIENT_NOT_FOUND`.
   Nhưng `GetIngredientByID` wrap lỗi với `%w` (`ingredient_repo.go:147`:
   `fmt.Errorf("ingredient: get: %w", err)`), trong khi service kiểm tra bằng **`==`**, không phải `errors.Is`
   (`ingredient_service.go:69`). Một lỗi đã wrap không bao giờ `== sql.ErrNoRows`, nên nhánh 404 bị bỏ qua;
   `handleServiceError` chỉ map `*service.AppError` (`respond.go:24-36`) và rơi xuống
   **500 `COMMON_002`**. `UpdateIngredient` thừa hưởng bug này qua pre-check `GetIngredient`
   (`ingredient_service.go:89`). Chỉ **DELETE** trả về 404 đúng, vì `SoftDeleteIngredient`
   trả raw `sql.ErrNoRows` không wrap (`ingredient_repo.go:216`).

---

## Code Chết / Không Thể Truy Cập

- **`StockMoveModal`** (`page.tsx:28-104`) + nhánh trigger của nó (`page.tsx:218-220`) — không thể truy cập;
  không có code nào set `modal='move'` (phát hiện chính #1).
- **`postStockMovement`** (`admin.api.ts:276-277`) — không có caller nào hoạt động (chỉ `StockMoveModal` chết import nó).
- **Toast 409** "Nguyên liệu này đã tồn tại." (`page.tsx:129-131`) — nhánh chết phòng thủ: bảng
  `ingredients` **không có UNIQUE trên `name`** (`009_ingredients.sql:2-14`), nên BE không bao giờ emit 409.
- **Toast 422** "đang được sử dụng." (`page.tsx:155-157`) — nhánh chết phòng thủ: không có guard
  in-use ở tầng service (`ingredient_service.go:107-114`) và FK là CASCADE (xem Khu vực 5 #2), nên BE không bao giờ emit 422.
- **Các endpoint BE không có FE caller** (handler đã nối dây, không có export `admin.api.ts`): `GET
  /ingredients/:id` (chỉ dùng nội bộ), `GET /ingredients/:id/movements`, và `getLowStock`
  (`admin.api.ts:264`) được gọi bởi `/admin/summary`, không phải trang này. Không phải BE chết — chỉ là không dùng ở đây.

---

## Khu Vực 1 — Giao Diện Component & Tương Tác

**Kết luận:** tài liệu FE chưa bao giờ theo dõi việc thiết kế lại bảng hay trigger Nhập/Xuất bị bỏ. Hai 🔴 + các cosmetic nút/nhãn bên dưới.

| Component / Chủ đề | Tài liệu nói (`admin_ingredients.md`) | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| **Trigger StockMoveModal** | Hàng 4 Zones + Key-Interactions: nút "**Nhập/Xuất**" trên mỗi hàng mở `StockMoveModal` | Không có nút như vậy; `modal='move'` không bao giờ được set (`page.tsx:182,204` chỉ set add/edit); nhánh `page.tsx:218` chết; `IngredientTable` chỉ có `onEdit`/`onDelete` (`IngredientTable.tsx:4-8`) | 🔴 | Hoặc nối một action "Nhập/Xuất" (set `modal='move'`) hoặc xóa modal chết + bỏ tính năng khỏi tài liệu |
| **Cột IngredientTable** | 4 cột: Nguyên liệu · Đơn vị · Tồn kho · Hành động (`:19-22`) | 8 cột: STT · Tên nguyên liệu · Đơn vị · Số lượng tồn · Ngày nhập · Hạn SD · Trạng thái · Thao tác (`IngredientTable.tsx:57-64`) | 🔴 | Vẽ lại ASCII với đủ 8 cột + status badge |
| **Status badge** | không vẽ | `StatusBadge` Còn hàng✓/Sắp hết/Sắp hết hạn/Hết hàng (`IngredientTable.tsx:16-28`); hàng sắp hết hạn được highlight + ⚠ trên STT (`:31-33,71-73`) | 🟡 | Thêm badge + trạng thái hàng ⚠ vào tài liệu |
| **Nút hành động hàng** | bộ ba icon `[Nhập/Xuất] [✎] [🗑]` (`:21`) | nút text "Sửa" / "Xóa" (`IngredientTable.tsx:94,102`); xóa qua `confirm()` native (`:98`); không có Nhập/Xuất | 🟡 | Tài liệu: nút text, hai action, dialog confirm() |
| **Nhãn nút thêm** | "+ Thêm nguyên liệu" (`:16`) | "+ Thêm NL" (`StoragePageHeader.tsx:35`) | 🟡 | Nhãn tài liệu → "+ Thêm NL" |
| **Bố cục header** | title + search + add (`:16`) | khớp: "Kho nguyên liệu" + search "Tìm nguyên liệu..." + add (`StoragePageHeader.tsx:12,26,35`) | 🟢 | — |
| **Trạng thái loading** | "5 hàng pulsing" (`:24`) | các block pulse `[...Array(5)]` (`page.tsx:191-195`) | 🟢 | — |
| **Empty khi tìm không có kết quả** | "Không tìm thấy…" (`:24`) | "Không tìm thấy nguyên liệu nào." (`page.tsx:197-199`); lọc client theo name (`page.tsx:173`) | 🟢 | — |

**Đã xác nhận khớp:** bộ ba header, client-side name filter, skeleton 5 hàng, chữ search-miss, bộ field của form-modal (name/unit/initialQuantity/warningThreshold/importDate/shelfDays — `IngredientFormModal.tsx:8-15`), và dynamic import của `IngredientFormModal` (`page.tsx:15-17`) đều khớp tài liệu.

---

## Khu Vực 5 — Mô Hình Dữ Liệu FE⇄BE & Hành Vi BE

**Kết luận:** `admin_ingredients_be.md` **rất trung thực với nguồn** — mọi line-cite handler/service/repo theo endpoint đều chính xác, mọi SQL body được trích dẫn đều khớp, và logic tính status là đúng. Hai vấn đề thực chất: lỗi ánh xạ 404→500 (phát hiện chính #3) và một claim FK sai.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| **404 với id không tồn tại** | `GetIngredient`/`UpdateIngredient` map `sql.ErrNoRows → 404 INGREDIENT_NOT_FOUND` | repo wrap `%w` (`ingredient_repo.go:147`); service dùng `==` không phải `errors.Is` (`ingredient_service.go:69`); `handleServiceError` không có fallback ErrNoRows (`respond.go:24-36`) → **500 COMMON_002**. DELETE OK (raw ErrNoRows, `ingredient_repo.go:216`) | 🔴 | Code: dùng `errors.Is` trong service HOẶC trả raw `sql.ErrNoRows` không wrap từ repo. Khi đó tài liệu sẽ đúng |
| **FK DELETE in-use** | "nếu FK `product_ingredients` là RESTRICT, MySQL 1451 → 500" | FK là **`ON DELETE CASCADE`** trên cả `product_ingredients` + `stock_movements` (`009_ingredients.sql:22-23,38`) — không bao giờ là RESTRICT; **và** delete là soft `UPDATE deleted_at` (`ingredient_repo.go:208-210`), nên CASCADE không bao giờ kích hoạt. Hành vi thực tế: soft-delete âm thầm để lại các hàng `product_ingredients` trỏ đến nguyên liệu ẩn | 🟡 | Sửa lý luận trong tài liệu: không có 1451, không có cascade khi soft-delete; vấn đề thực là dangling refs, không phải 500 |
| **Line block route** | `main.go:293–313` | route ingredients `main.go:312–318`; group `adminR` `:307`; sub-group DELETE chỉ admin `admIngR` `:323–328` | 🟡 | Tài liệu → `main.go:307–328` |
| **Phạm vi sub-group DELETE** | `admIngR` chỉ bọc ingredient DELETE | `admIngR` cũng bọc `DELETE /training/guides/:id` (`main.go:323-328`) | 🟡 | Ghi chú sub-group dùng chung với training |
| **Branch provenance** | header: `experience_claude.md_system_1` | branch hiện tại `experience_claude.md_system_1_test_iphon2_change_code` | 🟢 | Cập nhật header |
| **Type FE `Ingredient`** | mirror `toIngredientJSON` (không có `costPerUnit`) | `admin.api.ts:223-235` khớp chính xác; `cost_per_unit` vắng mặt cả hai phía | 🟢 | — |
| **Input Create/Update/Movement** | per handler binding | `CreateIngredientInput`/`UpdateIngredientInput`/`StockMovementInput` (`admin.api.ts:237-259`) khớp handler tags | 🟢 | — |
| **Tính toán Status** | out_of_stock(0) > expiring_soon(<now+7d) > low_stock(≤min) > in_stock | chính xác (`ingredient_handler.go:14-26`) | 🟢 | — |
| **SQL body (cả 8)** | trích dẫn theo endpoint | tất cả khớp (`ingredient_repo.go` 102-272); `GREATEST(0, stock-qty)` cho `out` (`:231-238`) | 🟢 | — |
| **Movement không dùng transaction** | Flag #2: insert + UPDATE riêng biệt, không có txn | đã xác nhận (`ingredient_repo.go:221-248`) | 🟢 | — |
| **`created_by` không serialize** | Flag #3 | đã xác nhận: scan, bỏ qua trong `gin.H` (`ingredient_handler.go:213-220`) | 🟢 | — |

**Đã xác nhận khớp:** tất cả 8 path/verb/tên handler+service+repo theo endpoint, mọi SQL được trích dẫn, mô hình RBAC (adminR `authMW`+`AtLeast("manager")`; DELETE `AtLeast("admin")`), `StaffIDFromContext` → `created_by`, không cache Redis, và khoảng trống `initialQuantity`-direct-write / no-initial-movement (Flag #1) đều chính xác theo nguồn.

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code | Quyết định: nối trigger "Nhập/Xuất" (`setModal('move')`) **hoặc** xóa `StockMoveModal` chết + `postStockMovement` | `fe/.../ingredients/page.tsx`, `admin.api.ts` |
| 2 | 🔴 Lỗi code | Sửa ánh xạ 404: dùng `errors.Is(err, sql.ErrNoRows)` trong service (hoặc trả raw từ repo) | `be/internal/service/ingredient_service.go:69,101`, `repository/ingredient_repo.go:147` |
| 3 | 🔴 Sửa tài liệu | Vẽ lại ASCII bảng (8 cột + status badge + hàng ⚠); sửa hàng 4 Zones + Key-Interactions để bỏ/điều kiện hóa Nhập/Xuất | `admin_ingredients.md` |
| 4 | 🟡 Sửa tài liệu | Sửa "known gap" về FK (CASCADE không phải RESTRICT; soft-delete → dangling refs, không phải 1451/500) | `admin_ingredients_be.md` |
| 5 | 🟡 Sửa tài liệu | Block route `293–313 → 307–328`; ghi chú `admIngR` cũng bọc `DELETE /training/guides/:id`; cập nhật branch provenance | `admin_ingredients_be.md` |
| 6 | 🟡 Sửa tài liệu | Nhãn nút "+ Thêm NL"; action hàng là text "Sửa"/"Xóa" + confirm() | `admin_ingredients.md` |
| 7 | 🟢 Dọn code | Xóa nhánh toast 409/422 chết (BE không bao giờ emit) — hoặc thêm guard BE nếu muốn giữ quy tắc | `page.tsx:129-131,155-157` |

> **Ghi chú CLAUDE.md:** các sửa tài liệu (#3–#6) là một task được ALIGN; mỗi thay đổi code (#1, #2, #7) phải được
> đăng ký vào `docs/tasks/MASTER_TASK.md` **trước khi chạm vào bất kỳ file nào**. Audit này không thay đổi gì.
