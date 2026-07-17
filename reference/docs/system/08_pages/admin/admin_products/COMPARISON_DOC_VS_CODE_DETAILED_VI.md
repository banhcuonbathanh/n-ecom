# Admin Products — So Sánh Chi Tiết Tài Liệu vs. Code (5 Mảng)

> **Phạm vi:** rà soát sâu bộ tài liệu `/admin/products` so với code FE/BE thật trên
> branch `experience_claude.md_system_1_test_iphon2_change_code` theo 5 trục: ① giao diện component
> ② luồng dữ liệu cross-component ③ luồng dữ liệu cross-page ④ hành vi loading ⑤ mô hình dữ liệu FE⇄BE.
> **Chỉ đọc — KHÔNG sửa code và không sửa tài liệu trang.** Thực hiện bởi 5 agent Sonnet chạy song song
> (một agent mỗi mảng); mọi mục 🔴 đã được **tự tay kiểm chứng lại** so với source. Ngày: 2026-06-21.
>
> Tệp đồng hành: [Bản EN](COMPARISON_DOC_VS_CODE_DETAILED.md) ·
> [Visual mockup (VI)](COMPARISON_VISUAL_MOCKUP_VI.md). Bộ tài liệu được kiểm tra:
> [admin_products.md](admin_products.md) · [_be.md](admin_products_be.md) ·
> [_crosscomponent_dataflow.md](admin_products_crosscomponent_dataflow.md) ·
> [_crosspage_dataflow.md](admin_products_crosspage_dataflow.md) · [_loading.md](admin_products_loading.md) ·
> [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md).
>
> **Code thắng.** Mọi ô "Code thực tế" đều trích dẫn `file:line` trên branch đang kiểm tra. 3 lỗi code
> dưới đây đã được ghi trung thực trong [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) — chúng được liệt kê ở đây
> vì tracker yêu cầu mọi 🔴 đều phải được tổng hợp, không phải vì bộ tài liệu che giấu chúng.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Giao diện component | **Lệch** — wireframe thiếu cột + vẽ một control không tồn tại | 2 | 6 | 3 |
| ② Luồng cross-component | **Chính xác** — mọi claim về query/mutation/store đều xác nhận; chỉ có line off-by-one | 0 | 7 | 15+ |
| ③ Luồng cross-page | **Chính xác** — cache keys, không-SSE, snapshot đều đúng; line main.go cũ + 1 FE key chưa kiểm tra | 0 | 5 | 20+ |
| ④ Hành vi loading | **Phần lớn chính xác** — nhưng narrative "lazy-load khi mở modal" sai (2 file) | 1 | 4 | 18+ |
| ⑤ Mô hình FE⇄BE | **Chính xác** — tất cả handler/SQL/auth/bug đều đúng; mọi line main.go bị cũ (~+13) | 0 | 13 | 30+ |
| **Lỗi code (tái xác nhận, không phải drift tài liệu)** | Cả 3 lỗi từ PRODUCTS_BUGS.md vẫn thật trên branch này | 1 | 1 | — |

**Kết luận chung:** bốn tài liệu *hành vi* (`_be`, `_crosscomponent`, `_crosspage`, `_loading`) có chất
lượng cao, truy nguồn source tốt, và về bản chất là đúng — lỗi hệ thống duy nhất là các số dòng route
`main.go` bị cũ (drift +13 đã biết trong toàn dự án). Tài liệu **visual** (`admin_products.md`) mới là
nơi chứa mâu thuẫn thật sự: wireframe ASCII thiếu cột Topping và vẽ một công tắc availability bên trong
modal vốn không tồn tại (và không thể tồn tại). Tài liệu `_loading` + `_crosscomponent` cùng chia sẻ một
mental model sai: cho rằng modal được lazy-load khi mở.

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự tay kiểm chứng)

**1. 🔴 Sửa tài liệu — Wireframe thiếu hoàn toàn cột "Topping".**
`admin_products.md:18-23` vẽ bảng gồm `[img] Tên · Danh mục · Giá · Còn hàng · HĐ` (5 cột).
Bảng thật render **7 `<th>`**: `(img) · Tên sản phẩm · Danh mục · **Topping** · Giá · Trạng
thái · (actions)` (`ProductsTable.tsx:34-40`), và ô Topping render tối đa 2 pill topping +
chip tràn `+N more` (`ProductsTable.tsx:67-83`). Tài liệu cũng đặt nhãn cột trạng thái là "Còn
hàng" trong khi header code đọc **"Trạng thái"** (`ProductsTable.tsx:39`). Wireframe thiếu đi một
cột dữ liệu đầy đủ.

**2. 🔴 Sửa tài liệu — "Công tắc còn hàng" trong modal không tồn tại.**
`admin_products.md:25-26` ghi rằng form modal có "công tắc còn hàng". `ProductFormModal.tsx`
render đúng bảy control — Danh mục (`:137`), Tên (`:155`), Mô tả (`:165`), Hình ảnh (`:174`),
Giá (`:219`), Thứ tự (`:229`), Topping (`:239`) — và Huỷ/Lưu (`:268`/`:275`). **Không có
control availability nào**, và không thể có: Zod schema (`ProductFormModal.tsx:15-22`) và
payload lưu (`:104`) không có field `is_available`. **Điều này kép thêm Bug 1:** vì badge toggle
ở bảng bị hỏng (luôn 400) *và* modal không có công tắc, **không có đường UI nào đang hoạt động
để đặt availability của sản phẩm trên trang này**.

**3. 🔴 Sửa tài liệu — Modal KHÔNG được lazy-load khi mở; nó (cùng 2 sub-query) load khi page mount.**
`admin_products_loading.md:88-91` (+ Flag 3) và `admin_products_crosscomponent_dataflow.md:423-426`
đều cho rằng chunk `dynamic()` của modal và các query `['categories']` / `['admin','toppings']` không
kích hoạt cho đến khi modal được mở lần đầu. Nhưng `page.tsx:130-135` render `<ProductFormModal
open={modal.open} …>` **vô điều kiện** — nó luôn nằm trong React tree, nên `next/dynamic` fetch
chunk khi page mount và hai hook `useQuery` (`ProductFormModal.tsx:39-48`, nằm *trên*
guard `if (!open) return null` tại `:124`) cũng kích hoạt khi page mount. "Khoảng trống tải chunk
lần mở đầu" và "lần mở lạnh có thể hiện loading state ngắn cho dropdown" không xảy ra.

**4. 🔴 Lỗi code (Bug 1, tái xác nhận) — toggle availability là no-op, luôn trả 400.**
`main.go:189` nối `PATCH /products/:id/availability` tới `productH.UpdateProduct`, có
`updateProductRequest` yêu cầu `name`/`price`/`category_id` (`product_handler.go:123-131`) — body
`{is_available}`-only của FE (`admin.api.ts:51-52`) fail `ShouldBindJSON` → 400. Dù có bind được,
`UpdateProductInput` không có field `is_available` (`product_service.go:280-289`) và câu UPDATE SQL
không bao giờ chạm cột đó (`products.sql.go:723-726`). Query `ToggleProductAvailability` được tạo
sẵn (`products.sql.go:667-676`) + repo wrapper (`product_repo.go:82-84`) tồn tại nhưng **không có
service caller nào** (đã grep-verified). Chi tiết đầy đủ: [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #1.

**5. 🟡 Lỗi code (Bug 2, tái xác nhận) — `POST /products` âm thầm bỏ qua `is_available`.**
`CreateProductInput` có `IsAvailable` (`product_service.go:244`) nhưng `CreateProduct` build
`db.CreateProductParams` mà không có nó (`:260-268`), và câu INSERT hardcode `is_available = 1`
(`products.sql.go:82-83`). Tiềm ẩn (FE không bao giờ gửi field này). Chi tiết: PRODUCTS_BUGS.md #2.

**6. 🟠 Lỗi code (Bug 3, tái xác nhận) — `DELETE /products/:id` không có guard đơn hàng đang hoạt động.**
`DeleteProduct` soft-delete vô điều kiện (`product_service.go:332-339`); không có sentinel `PRODUCT_IN_USE`
nào trong `service/errors.go`. Nhánh 409 của FE ("…đang có đơn hàng…", `page.tsx:36-37`)
do đó là code chết. Các đơn hàng lịch sử vẫn an toàn (tên/giá đã snapshotted). Chi tiết: PRODUCTS_BUGS.md #3.

---

## Code Chết / Không Thể Chạm Tới

- **`ToggleProductAvailability`** — SQL (`products.sql.go:667-676`) + repo wrapper
  (`product_repo.go:82-84`) compile được nhưng **không có call site service nào** (grep toàn bộ
  `be/internal/service/`). Chết cho đến khi Bug 1 được sửa.
- **Nhánh 409 FE khi xóa** — `page.tsx:36-37` xử lý 409 mà BE không bao giờ emit (Bug 3). Chết.
- **`deleteMut.isPending` / `toggleMut.isPending`** — được TanStack Query tính toán, không bao giờ đọc
  trong JSX (`page.tsx`, `ProductsTable.tsx`). Không có guard double-click trên Xóa / badge availability.
- **Query `['products-all']` của customer menu** (`menu/page.tsx:59-63`) — fetch `/products` không có
  filter `is_available` và **không bao giờ bị invalidate** bởi bất kỳ lần ghi admin nào; chỉ cross-page,
  nêu ở đây như một khoảng staleness (xem Mảng ③).

---

## Mảng ① — Giao Diện Component

**Kết luận: Lệch.** Các tài liệu hành vi chính xác, nhưng wireframe trong `admin_products.md`
vẽ thiếu bảng và vẽ thừa modal.

| Component / Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Cột bảng | ASCII: `[img] Tên · Danh mục · Giá · Còn hàng · HĐ` (5 cột) | 7 `<th>`: `(img) · Tên sản phẩm · Danh mục · Topping · Giá · Trạng thái · (actions)` — `ProductsTable.tsx:34-40` | 🔴 | Thêm cột **Topping** vào wireframe |
| Header cột trạng thái | `Còn hàng` | `Trạng thái` — `ProductsTable.tsx:39` | 🟡 | Đổi tên cột thành `Trạng thái` |
| Công tắc availability trong modal | "công tắc còn hàng" trong form modal — `admin_products.md:26` | Không có control availability nào trong `ProductFormModal.tsx` (các field `:137`–`:239`); không có `is_available` trong schema `:15-22` hay payload `:104` | 🔴 | Xóa công tắc khỏi wireframe modal; ghi chú rằng availability (dự kiến) được đặt qua badge ở bảng |
| Loại ô availability | ASCII ngụ ý toggle/radio (`● bật / ○ tắt`) | `<Badge>` clickable với `onClick`, `cursor-pointer` — `ProductsTable.tsx:87-93` | 🟡 | Ghi chú đây là clickable Badge, không phải switch |
| Nhãn availability | `● bật` / `○ tắt` | `Đang bán` / `Hết hàng` — `ProductsTable.tsx:92` | 🟡 | Cập nhật nhãn trong wireframe |
| Nút Seed | Không có trong ASCII + Zones | `🌱 Dữ liệu mẫu` được render — `ProductPageHeader.tsx:13-18`, nối vào `page.tsx:120` | 🟡 | Thêm nút seed vào Zone A |
| Nút hành động trên hàng | `[✎]` sửa · `[🗑]` xóa (emoji) | Nút văn bản `Sửa` (`ProductsTable.tsx:101`) · `Xóa` (`:107`) | 🟡 | Dùng nhãn văn bản (hoặc ghi chú đây là text, không phải icon) |
| Thứ tự field modal | `tên · danh mục ▾ · giá · mô tả · ảnh · topping · switch` | `Danh mục → Tên → Mô tả → Hình ảnh → Giá + Thứ tự → Topping` — `ProductFormModal.tsx:137-239` | 🟡 | Sắp lại thứ tự + thêm field `Thứ tự` |
| Modal save = "multipart for image" | Zones table: `createProduct/updateProduct (multipart for image)` | Image là một lần gọi `uploadFile` **riêng biệt** (`ProductFormModal.tsx:89`); lần lưu sản phẩm là JSON (`:104-107`) | 🟡 | Ghi chú upload ảnh là lần gọi riêng; body save là JSON |
| Nhãn nút header / modal | `+ Thêm sản phẩm` · `[Lưu] [Huỷ]` | Khớp — `ProductPageHeader.tsx:24`, `ProductFormModal.tsx:273,280` | 🟢 | — |

**Đã xác nhận khớp:** văn bản đếm header "Sản phẩm (N)"; placeholder ảnh `🍜`; sub-label topping
"Miễn phí / +price"; tiêu đề modal "Sửa/Thêm sản phẩm".

---

## Mảng ② — Luồng Cross-Component

**Kết luận: Chính xác.** Mọi claim kiến trúc trong `admin_products_crosscomponent_dataflow.md` đều
được xác nhận so với source — query products (`page.tsx:22-26`, key `['admin','products']`,
`staleTime 30_000`), cả ba mutation, pattern invalidation, dynamic import, hai query cục bộ của
modal, shape kiểu `Product`, và khẳng định "không có Zustand trên trang này". Các vấn đề duy nhất là
line off-by-one cosmetic và một chi tiết bị bỏ sót.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Toast khi save | `'Đã cập nhật sản phẩm'` tĩnh | động: edit→`'Đã cập nhật sản phẩm'`, add→`'Đã thêm sản phẩm'` — `ProductFormModal.tsx:111` | 🟡 | Ghi chú cả hai nhánh |
| Disable nút Save | `disabled` khi `saveMut.isPending` | cũng disabled khi `categories.length === 0` — `ProductFormModal.tsx:277` | 🟡 | Thêm điều kiện thứ 2 |
| Block props `ProductPageHeader` | `count` tại `page.tsx:122` | block `:117-122`; `count` ở `:118` (`:122` là `seedLoading`) | 🟡 | Sửa tham chiếu line |
| Block badge toggle | `ProductsTable.tsx:88-91` | `:87-93` | 🟡 | Sửa range |
| Block nút Edit | `ProductsTable.tsx:97-100` | `:97-101` ("Sửa" tại `:101`) | 🟡 | Sửa range |
| `saveMut.onSuccess` | `:109-113` | logic `:109-112` (`:113` là `},` đóng) | 🟡 | Sửa range |
| Range JSX bảng đầy đủ | `:43-113` | `:43-116` | 🟡 | Sửa range |

**Đã xác nhận khớp:** query `page.tsx` `:22-26`; `modal` useState `:19`; `seedLoading` `:20`;
`deleteMut` `:28-42`; `toggleMut` `:44-49`; invalidations `:31,47,106`; `listProducts`/`updateProduct`
`admin.api.ts:39-40`/`45-47`; modal queries `:39-48`; dynamic import `:13-15`; nối `onEdit`
`:126`; kiểu `Product` `product.ts:14-25`; không có Zustand import ở bất cứ đâu.

---

## Mảng ③ — Luồng Cross-Page

**Kết luận: Chính xác.** Tên cache-key, nối dây invalidation, claim "không SSE/WS, không localStorage",
snapshot giá/tên trong `order_items`, và sự phân tách staleTime 5 phút vs 30 giây đều đúng. Hai nhóm
vấn đề: line route `main.go` cũ (drift +13 đã biết), và một FE cache key chưa được kiểm tra.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Query menu phụ | không đề cập | `menu/page.tsx:59-63` chạy một `['products-all']` query thứ 2 fetch `/products` **không có** `is_available` và **không bao giờ bị invalidate** bởi lần ghi admin | 🟡 | Ghi tài liệu cho key này + cửa sổ staleness của nó |
| Route `GET /products` | `main.go:168` | `main.go:181` | 🟡 | Cập nhật line |
| Route `PATCH /:id/availability` | `main.go:176` | `main.go:189` (handler `UpdateProduct` đúng) | 🟡 | Cập nhật line |
| Block query customer menu | `menu/page.tsx:59-76`, key `['products',…]` | query filtered chính `:65-77`, key `['products', selectedCategory, searchQuery]`; staleTime `:75` | 🟡 | Sửa block + key 3 phần |
| INSERT `order_items` | `orders.sql.go:55-70` | `:55-57` (SQL) + params `:60-71` | 🟢 | Nhỏ |
| Cache read `ListProducts` | "đọc products:list tại `:173`" | cache-check `:166`, DB fallback `:173` — đúng bản chất | 🟢 | Làm rõ |

**Đã xác nhận khớp:** `invalidateProductCaches` `:709-717` (Xóa `products:list` + `categories:list`
+ `product:<id>`); `invalidateToppingCaches` `:719-721`; `productCacheTTL` `:21`; create/update/delete
invalidate tại `:276/:328/:337`; `ListAllProducts` không cache `:194-209`; `ListProductsAvailable`
`is_available=1` `:467-470`; **không có product pub/sub channel** (grep); **không có localStorage** trên trang;
query POS `pos/page.tsx:45-51`; FE invalidations `page.tsx:31,47,106`.

---

## Mảng ④ — Hành Vi Loading

**Kết luận: Phần lớn chính xác** — chính xác từng dòng trên mọi state machine *ngoại trừ* narrative
dynamic-import (headline #3), vốn sai trong hai file.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Thời điểm load modal dynamic | chunk + sub-query kích hoạt khi **mở** lần đầu — `_loading.md:88-91` + Flag 3; `_crosscomponent.md:423-426` | `<ProductFormModal>` được render vô điều kiện `page.tsx:130-135`; chunk + `useQuery` `:39-48` kích hoạt khi **page mount** (phía trên guard open `:124`) | 🔴 | Viết lại: modal mount khi tải trang; chunk + dropdown query không được defer đến khi mở |
| Nhãn nút Seed | `Dữ liệu mẫu` | `🌱 Dữ liệu mẫu` (emoji) — `ProductPageHeader.tsx:18` | 🟡 | Thêm emoji |
| Line đóng `handleDelete` | `page.tsx:53` | `:54` | 🟡 | Sửa |
| Line đóng `toggleMut` | `page.tsx:48` | `:49` | 🟡 | Sửa |
| Lần set đầu `seedLoading` | `page.tsx:56` | `:57` | 🟡 | Sửa |

**Đã xác nhận khớp:** AuthGuard trả `null` (không spinner) `:23`, `getMe` `:17`, push `/login`
`:19`; thông báo RoleGuard `:16-21`; spinner route `loading.tsx:1-7` (`border-t-orange-500`); query products
`:22-26`; `<p>Đang tải...</p>` thuần (không phải skeleton) `ProductsTable.tsx:18`; trạng thái 3 pha
(loading→empty→table); EmptyState `🍜` + message `EmptyState.tsx:6-13`; sub-query empty-state của modal
`:138-139`, `:240-241`; Save disabled `:277`; gate upload `uploading` `:199,202`;
`deleteMut/toggleMut.isPending` không dùng (Flag 4 đúng).

---

## Mảng ⑤ — Mô Hình Dữ Liệu FE⇄BE

**Kết luận: Chính xác.** Mọi tên handler, method service, hành vi SQL, field DTO, cổng auth,
chi tiết caching, và cả 3 bug đều được mô tả chính xác trong `admin_products_be.md`. Lỗi hệ thống
duy nhất là số dòng route `main.go` bị cũ — toàn bộ block products/categories/toppings/
staff/files đã dịch chuyển **~+13 dòng** (drift toàn dự án; xem Cross-Page Concerns trong tracker).

| Endpoint / Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Block route Products | `main.go:167-181` | `:179-195` | 🟡 | Cập nhật |
| `mgr.Use` + `GET /all` | `main.go:172-173` | `:185-186` | 🟡 | Cập nhật |
| `PATCH /:id` / `/:id/availability` | `:175` / `:176` | `:188` / `:189` | 🟡 | Cập nhật |
| `DELETE /:id` (admin) | `:180-181` | `:192-194` | 🟡 | Cập nhật |
| Block Categories / Toppings | `:185-196` / `:200-211` | `:197-210` / `:212-225` | 🟡 | Cập nhật |
| Block Staff / Files | `:280-290` / `:326-328` | `:292-304` / `:339-341` | 🟡 | Cập nhật |
| `GET /categories` / `/toppings` public | `:186` / `:201` | `:199` / `:214` | 🟡 | Cập nhật |
| Lời gọi `buildCategoryMap` | `product_service.go:198` | `:199` | 🟡 | Cập nhật |
| FE `updateProduct` | `admin.api.ts:45-47` | `:45-46` | 🟢 | Nhỏ |
| `is_orphan=1` khi upload | `file_handler.go:81` | set trong `files.sql.go` (không thấy trong handler) | 🟢 | Trích dẫn `files.sql.go` |

**Đã xác nhận khớp (handler/service/SQL đều chính xác từng dòng):** `ListAllProducts` `product_handler.go:57-69`;
`productJSON` `:443-460` (10 field đúng); `createProductRequest` `:82-91`; `updateProductRequest`
yêu cầu name/price/category_id `:123-131`; `DeleteProduct` `:157-164`; service `ListAllProducts`
không cache N+1 `:193-209`; `CreateProduct` bỏ `is_available` `:260-268`; `UpdateProductInput` không có
availability `:280-289`; `DeleteProduct` không có guard `:332-339`; INSERT hardcode `is_available=1`
`products.sql.go:82-83`; UPDATE bỏ qua nó `:723-726`; `ToggleProductAvailability` tồn tại không nối dây
`:667-676`; không có `PRODUCT_IN_USE` trong `errors.go`; `file_handler.Upload` `:38-98`, `maxFileSize` `:19`.

**Trạng thái lỗi (grep-verified trên branch này):** Bug 1 **ĐÃ XÁC NHẬN — VẪN THẬT** · Bug 2
**ĐÃ XÁC NHẬN — VẪN THẬT** · Bug 3 **ĐÃ XÁC NHẬN — VẪN THẬT**.

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | Mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code | Nối dây toggle availability: thêm `ProductService.SetAvailability` → `repo.ToggleProductAvailability` + `invalidateProductCaches`; thêm handler binding `{is_available}` only; trỏ `main.go:189` vào nó (Bug 1) | `product_service.go`, `product_handler.go`, `main.go` |
| 2 | 🔴 Sửa tài liệu | Thêm cột **Topping** vào wireframe bảng; đổi tên header trạng thái thành `Trạng thái`; đổi nhãn badge thành `Đang bán/Hết hàng` | `admin_products.md` |
| 3 | 🔴 Sửa tài liệu | Xóa "công tắc còn hàng" không tồn tại khỏi wireframe modal; ghi chú availability được đặt qua badge ở bảng (hiện đang hỏng — link Bug 1) | `admin_products.md` |
| 4 | 🔴 Sửa tài liệu | Sửa narrative dynamic-import: modal + 2 sub-query của nó load khi **page mount**, không phải khi mở lần đầu | `admin_products_loading.md` (Flag 3 + §5), `admin_products_crosscomponent_dataflow.md` §7 |
| 5 | 🟠 Code/owner | Quyết định contract DELETE: guard đơn hàng đang hoạt động ở BE (409) vs FE xóa nhánh 409 chết (Bug 3) | `product_service.go` hoặc `page.tsx` |
| 6 | 🟡 Lỗi code | Chuyển tiếp `is_available` qua `CreateProduct` params + INSERT (cần sqlc regen) (Bug 2) | `be/db/queries/products.sql`, `product_service.go` |
| 7 | 🟡 Sửa tài liệu | Thêm nút seed vào wireframe; sửa thứ tự field modal + ghi chú "uploadFile riêng (không phải multipart)" | `admin_products.md` |
| 8 | 🟡 Sửa tài liệu | Batch-refresh các line route `main.go` cũ (~+13) và block query menu/page + key 3 phần | `admin_products_be.md`, `admin_products_crosspage_dataflow.md` |
| 9 | 🟡 Sửa tài liệu | Ghi tài liệu cho query menu `['products-all']` phụ + cửa sổ staleness của nó | `admin_products_crosspage_dataflow.md` |

> **Theo `CLAUDE.md`:** các bản sửa tài liệu (#2-4, 7-9) là một task được ALIGN; mỗi thay đổi **code**
> (#1, 5, 6) phải được đăng ký vào `docs/tasks/MASTER_TASK.md` trước khi chạm vào bất kỳ file nào.
> Audit này không bắt đầu thực hiện bất kỳ điều nào trong số đó.
