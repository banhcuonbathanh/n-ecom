# Admin Toppings — Tài Liệu vs. Code (Đối Chiếu Chi Tiết)

> **Phạm vi:** bộ tài liệu trang `/admin/toppings` (`admin_toppings.md`, `_be.md`,
> `_crosspage_dataflow.md`, `_loading.md`) đối chiếu với code đang chạy thật trên nhánh
> `experience_claude.md_system_1_test_iphon2_change_code`. Bốn trục đối chiếu (trang này **không** có
> `_crosscomponent_dataflow.md` nên trục cross-component là N/A): **(1) hình ảnh component ·
> (3) luồng dữ liệu cross-page · (4) hành vi loading · (5) mô hình dữ liệu FE⇄BE.**
> **Chỉ đọc — không sửa code hay tài liệu nào.** Mọi ô "Code thực tế" đều trace từ source và trích
> `file:line`; các mục 🔴 (lần này không có) sẽ được xác minh tay. Thực hiện inline (subagent trace BE
> bị giới hạn session; orchestrator tự trace domain Go bằng tay). Ngày: 2026-06-21.

---

## Tóm Tắt Điều Hành

| Trục | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Hình ảnh component | **Trung thực** — ASCII khớp render; chỉ chữ tiêu đề cột viết tắt | 0 | 0 | 3 |
| 3 — Luồng dữ liệu cross-page | **Chính xác** — mọi claim về cache/invalidation/staleTime đều đúng | 0 | 1 | 1 |
| 4 — Hành vi loading | **Chính xác** — mọi cổng loading riêng của trang đều đúng; một link sibling chết | 0 | 1 | 1 |
| 5 — Mô hình dữ liệu FE⇄BE | **Trung thực** — handler/service/repo/SQL/migration đều khớp; chỉ dòng route `main.go` cũ | 0 | 1 | 2 |
| **Tổng** | **Bộ tài liệu ít trôi, bám sát source** | **0** | **3** | **7** |

**Kết luận:** giống `admin_summary`, `admin_staff` và `customer_combo_detail`, đây là **bộ tài liệu
trung thực, trace từ code, không có mâu thuẫn doc-vs-code nào.** Mọi endpoint, handler, service, hàm
repo, query SQL và dòng migration trong `_be.md` khớp source Go **chính xác** (số dòng
handler/service/repo/SQL/migration đều đúng). Phần `Flags` của tài liệu đã tự ghi nhận mọi điểm yếu
code thật (nhánh 409 chết, lệnh ghi availability bằng raw-SQL, `product:<id>` cũ, không chặn xoá
topping đang dùng). Drift thật duy nhất là **số dòng route trong `main.go` (~+13 cũ)** — đúng kiểu
drift hệ thống đã ghi nhận ở 5 trang trước — và một **link sibling chết** trong `_loading.md` trỏ tới
file `_crosscomponent_dataflow.md` không tồn tại.

---

## NHỮNG PHÁT HIỆN PHẢI LÊN TIẾNG 🔴

**Không có.** Không claim tài liệu nào mâu thuẫn với code. Bộ tài liệu nói đúng sự thật về trang, kể
cả các khuyết điểm. Các mục bên dưới là số dòng cũ (🟡) và chữ nghĩa (🟢), cộng với các điểm yếu code
mà tài liệu **đã tự flag** (không phải drift).

---

## Code chết / không thể chạm tới

- **Nhánh 409 trùng tên ở FE là code chết** — `ToppingFormModal.tsx:55-57` map response `409` thành
  lỗi field "Tên topping đã tồn tại", nhưng bảng `toppings` **không có unique constraint trên `name`**
  (`be/migrations/002_products.sql:41-52` — chỉ `PRIMARY KEY (id)` + 2 `KEY` index không-unique) và
  `CreateTopping` **không kiểm tra trùng** (`product_service.go:452-459`; `query/products.sql:79-81`).
  Nên BE không bao giờ trả `409` ở đây — tên trùng vẫn insert thành 2 dòng riêng. **Tài liệu đã flag**
  (`_be.md` Flag 4) — xác nhận là code chết, mức thấp.
- **Không có component chết/không-chạm khác** — cả 3 component zone (`ToppingPageHeader`,
  `ToppingTable`, `ToppingFormModal`) đều được import và render bởi `page.tsx:78-90`; modal là một
  `dynamic()` import sống (`page.tsx:10-12`).

---

## Trục 1 — Hình ảnh component

**Kết luận: trung thực.** ASCII wireframe và bảng Zones trong `admin_toppings.md` khớp render thật của
cả 3 component. Khác biệt duy nhất là chữ viết tắt trong bản vẽ ASCII.

| Component / Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| ToppingPageHeader | `Topping (6)   [+ Thêm topping]` | `Topping ({count})` + nút `+ Thêm topping` (`ToppingPageHeader.tsx:9-15`) | 🟢 | Không cần — khớp (count động) |
| Bảng — tiêu đề cột 2 | ASCII vẽ `Áp dụng cho SP` | chữ thật là `Áp dụng cho sản phẩm` (`ToppingTable.tsx:33`) | 🟢 | Viết đầy đủ trong ASCII |
| Bảng — tiêu đề cột 5 | ASCII vẽ cột tiêu đề `Hành động` | `<th>` thứ 5 **trống** (`<th className="px-4 py-3" />`, `ToppingTable.tsx:36`) — nút Sửa/Xóa nằm dưới tiêu đề trắng | 🟢 | Bỏ nhãn `Hành động` khỏi ASCII (hoặc thêm nhãn trong code) |
| Bảng — ô chưa gắn | ASCII vẽ `Chưa gắn SP` | chữ thật là `Chưa gắn sản phẩm` (`ToppingTable.tsx:57`) | 🟢 | Viết đầy đủ trong ASCII |
| Bảng — giá / trạng thái / hành động | `+10.000đ` / `Miễn phí` · `[Có sẵn]`/`[Hết]` · `[Sửa][Xóa]` | `Miễn phí` (xanh lá) / `+formatVND(price)` (cam) (`ToppingTable.tsx:60-64`); `<Badge success/muted>` "Có sẵn"/"Hết" (`:66-68`); nút Sửa + Xóa (`:72-83`) | ✅ | Không cần |
| Form modal | `tên *, giá thêm (0 = Miễn phí), trạng thái (toggle Có sẵn/Hết) [Hủy][Lưu topping]` | `Tên topping *` (`:77`), `Giá thêm (đ)` + chú thích `0 = Miễn phí` (`:87,94`), `Trạng thái` toggle Có sẵn/Hết (`:99-111`), `[Hủy][Lưu topping]` (`:120,127`) | ✅ | Không cần |
| Bảng Zones — nguồn dữ liệu | Bảng = `listToppings` (`['admin','toppings']`→`GET /toppings`) + `listProducts` (`['admin','products']`→`GET /products/all`); modal = `createTopping`/`updateTopping`, delete trên page | `page.tsx:19-29` (cả 2 query, key, staleTime), `ToppingFormModal.tsx:45-48`, `page.tsx:43-50` (deleteMut) | ✅ | Không cần — chính xác |

**Đã khớp:** chữ header + count động; cả 4 ô của dòng (name truncate, chip sản phẩm, tách màu giá,
badge trạng thái, Sửa/Xóa); tập field modal, toggle, chữ chú thích, nút; mọi mapping nguồn dữ liệu
Zones. **Key Interactions** (`+Thêm`→modal, `Sửa`→modal điền sẵn, `Xóa`→`confirm()` cảnh báo N sản
phẩm rồi `DELETE`, create luôn `is_available=1`) đều xác nhận với `page.tsx:52-69`,
`ToppingFormModal.tsx:33-40`, và BE.

---

## Trục 3 — Luồng dữ liệu cross-page

**Kết luận: chính xác.** Mọi cache key, đích invalidation, `staleTime`, và mô hình "không push
realtime" trong `_crosspage_dataflow.md` đều được xác nhận trong source Go và FE.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Invalidation khi ghi | cả 3 lệnh ghi `Del toppings:list + products:list`, **không bao giờ** `product:<id>` | `invalidateToppingCaches` = `rdb.Del(ctx, cacheKeyTopping, cacheKeyProductsList)` (`product_service.go:719-721`); `cacheKeyTopping="toppings:list"` (`:26`), `cacheKeyProductsList="products:list"` (`:25`); key `product:<id>` tạo ở `:213` không bị lệnh ghi topping chạm | ✅ | Không cần |
| `product:<id>` cũ ở C4 | trang product-detail khách phục vụ giá/availability topping cũ tới 5 phút sau khi sửa | xác nhận: lệnh ghi topping không Del `product:%s` (`:213,719-721`); TTL = `productCacheTTL = 5*time.Minute` (`:21`) | 🟡 | Điểm yếu code thật (bất đối xứng invalidation) — **tài liệu đã flag** (`_be.md` Flag 2). Fix BE sẽ Del `product:<id>` khi ghi topping; đăng ký MASTER trước. |
| Không push realtime | dữ liệu topping không có SSE/WS; chỉ pull ở lần fetch sau | không có channel topping trong lớp WS/SSE; FE không subscribe topping (`page.tsx` chỉ dùng `useQuery`) | ✅ | Không cần |
| Cache TanStack admin | `['admin','toppings']` + `['admin','products']`, stale 60s, theo từng browser | `page.tsx:20-22, 26-28` (cả 2 key, `staleTime: 60_000`) | ✅ | Không cần |
| Mutation FE + đường dẫn API | `page.tsx:19-50`, `ToppingFormModal.tsx:44-62`; `admin.api.ts:54-66` | `page.tsx:19-50` ✅, `ToppingFormModal.tsx:44-62` ✅, khối API toppings `admin.api.ts:54-66` ✅ | ✅ | Không cần |
| An toàn snapshot | sửa/xoá không bao giờ viết lại đơn cũ (`order_items.toppings_snapshot`) | quy tắc nghiệp vụ, không nằm trên code path của trang này — nhất quán với `_be.md` | ✅ | Không cần |

**Đã khớp:** toàn bộ sơ đồ §0 (dòng DB + 2 cache list Redis là hub bền), danh sách consumer §2
(`/menu`, `/pos`, form sản phẩm đều đọc `products:list`), soft-delete §4 + dòng junction còn lại, ma
trận độ bền §6.

---

## Trục 4 — Hành vi loading

**Kết luận: chính xác.** Mọi cổng loading riêng của trang, nhánh 3-trạng-thái của bảng, và các claim
mutation-pending đều chuẩn. Một link nội bộ chết.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Link sibling | `_loading.md:193` link tới `admin_toppings_crosscomponent_dataflow.md` | file đó **không tồn tại** trong folder (chỉ có `_crosspage_dataflow.md`) | 🟡 | Bỏ link chết (hoặc ghi chú trang không có doc cross-component) |
| Cổng loading bảng | `isLoading` → `<p>Đang tải...</p>` (chữ trơn, không skeleton) | `ToppingTable.tsx:15-16` — chính xác | ✅ | Không cần |
| Empty state | `EmptyState` msg "Chưa có topping nào — nhấn + Thêm topping để bắt đầu" | `ToppingTable.tsx:19-24` — chính xác | ✅ | Không cần |
| Side-load products | `['admin','products']` **không** có cổng loading (`isLoading` không đọc) → cột nháy "Chưa gắn sản phẩm" | `page.tsx:25` chỉ destructure `data` (không `isLoading`); nháy qua `ToppingTable.tsx:57` | ✅ | Không cần — doc Flag 1 |
| Map `productNames` | `useMemo` `page.tsx:31-41` | chính xác | ✅ | Không cần |
| Modal lazy load | `dynamic()` import, không có option `loading:`, `page.tsx:10-12` | chính xác | ✅ | Không cần |
| Save pending | `saveMut.isPending` → disabled + "Đang lưu..." (`ToppingFormModal.tsx:124-127`) | chính xác | ✅ | Không cần |
| Delete pending | `deleteMut.isPending` **không dùng** trong UI — nút Xóa không bao giờ disable | xác nhận: `handleDelete` (`page.tsx:52-59`) gọi `mutate` không disable nút; `deleteMut.isPending` không đọc ở đâu trong render | 🟢 | Điểm yếu nhỏ thật — **tài liệu đã flag** (`_loading.md` Flag 5); thêm `disabled` cho nút Xóa nếu muốn (đăng ký MASTER) |
| Guard dùng chung | AuthGuard `return null` (`:23`) · RoleGuard `Không có quyền…` (`:16-21`) · admin `loading.tsx` spinner · `layout.tsx` `AuthGuard`>`RoleGuard minRole=MANAGER` (`:29-30`) | AuthGuard `if (!user) return null` `:23`, `getMe()` `:17` ✅; RoleGuard `if (roleValue<minRole)` `:16`, msg `:19` ✅; `admin/loading.tsx` spinner cam ✅; `layout.tsx:29-30` ✅ | ✅ | Không cần |

**Đã khớp:** thang loading 6 lớp, bảng nhánh 3-trạng-thái, cả 2 dòng mutation-pending, "không search /
không cổng `enabled`", và "không có `loading.tsx` trong `toppings/`".

---

## Trục 5 — Mô hình dữ liệu FE⇄BE

**Kết luận: trung thực.** Mọi binding handler, hàm service, wrapper repo, query SQL và dòng migration
trong `_be.md` đều **chính xác**. Drift duy nhất là khối route `main.go` (~+13 cũ).

| Chủ đề | Tài liệu nói (file:line) | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Khối route group | toppings group `main.go:200-212`; GET `:201`; create+update `:203-206`; delete `:208-211` | group `main.go:213`; `GET ""` `:214`; `mgr` create+update `:216-219`; `adm` delete `:221-224` | 🟡 | Trích lại (~+13). Guard vẫn đúng: GET public, POST/PATCH `AtLeast("manager")`, DELETE `AtLeast("admin")` |
| Route `GET /products/all` | `main.go:173` trong `prodR` `:167`; manager guard `:171-173` | `/all` `main.go:186` trong `prodR` `:180`; `mgr.Use(authMW, AtLeast("manager"))` `:185` | 🟡 | Trích lại (~+13/+19) |
| Handlers | `ListAllProducts:57` · `ListToppings:253` · `CreateTopping:277` · `UpdateTopping:298` · `DeleteTopping:316` | `product_handler.go:57,253,277,298,316` | ✅ | Không cần — đều chính xác |
| Handler serialize | `{id,name,price(ParsePrice),is_available}` dưới `{"data"}` (`product_handler.go:259-268`) | chính xác, `:259-268`; `service.ParsePrice` ở `:264` | ✅ | Không cần |
| Struct bind | `createToppingRequest{Name req, Price min=0 int64}` `:271-274`; `updateToppingRequest{Name req, Price min=0, IsAvailable *bool}` `:291-313` | `:271-274` ✅; struct `:291-295`, handler `:298-313` ✅ | ✅ | Không cần |
| Hàm service | `ListToppings:432` · `CreateTopping:452` · `UpdateTopping:467` · `DeleteTopping:486` | `product_service.go:432,452,467,486` | ✅ | Không cần — chính xác |
| `is_available` hardcode 1 | INSERT của `CreateTopping` hardcode `is_available=1` (`products.sql:79-81`) | `INSERT INTO toppings (id,name,price,is_available) VALUES (?,?,?,1)` `products.sql:79-81` | ✅ | Không cần |
| Ghi availability raw-SQL | `UpdateToppingAvailability` là raw `ExecContext`, không phải sqlc (`product_repo.go:156-159`) | `product_repo.go:156-159` — `r.dbtx.ExecContext(... UPDATE toppings SET is_available=?, updated_at=NOW() WHERE id=? AND deleted_at IS NULL ...)` | ✅ | Không cần — doc Flag 1 |
| Query SQL | `ListToppings:64-67` · `CreateTopping:79-81` · `UpdateTopping:83-86` · `SoftDeleteTopping:88-91` | `query/products.sql:64-67, 79-81, 83-86, 88-91` — đều chính xác; `ListToppingsAvailable:69-72` xác nhận bản chỉ-available | ✅ | Không cần |
| N+1 ở `/products/all` | `ListAllProducts` lặp `GetToppingsByProductID` mỗi sản phẩm; không Redis; `enrichProduct:627` | `product_service.go:194-209` (lặp `:205`, `enrichProduct` `:206`); định nghĩa `enrichProduct` `:627` | ✅ | Không cần |
| Migration / unique | DDL toppings `002_products.sql:41-52` — không unique trên `name`; FK `ON DELETE CASCADE` `:60` | `002_products.sql:41-52` (PK id + 2 KEY không-unique, **không unique name**); `fk_product_toppings_topping … ON DELETE CASCADE` `:60` | ✅ | Không cần |
| 409 khi trùng | FE chờ 409 → BE không bao giờ gửi (không unique, không check trùng) | xác nhận chết — xem mục Code chết | 🟢 | Doc Flag 4 — chính xác; nhánh FE chết nhưng vô hại |
| Cache TTL / invalidation | `productCacheTTL=5min` `:21`; `invalidateToppingCaches:719-721` | `:21`, `:719-721` — chính xác | ✅ | Không cần |

**Đã khớp:** cả 5 dòng endpoint (auth, handler, service, repo, SQL, cache), mã response (`201`+`{id}`,
`200`+message, `204`), đường `ErrNotFound`→404 khi update, và invalidation bất đối xứng. **Trung
thực** — chỉ khối route `main.go` cũ.

---

## Danh Sách Việc Cần Làm Tổng Hợp (theo ưu tiên)

| # | Loại | Hành động | File đích |
|---|---|---|---|
| 1 | 🟡 Sửa doc | Trích lại dòng route `main.go` (~+13): toppings group `:200-212→:213-225`; `GET /products/all` `:173→:186` (`prodR` `:167→:180`, mgr guard `:171-173→:185`). Nên trích *route group + tên handler* thay vì dòng `main.go` tuyệt đối (drift lặp lại). | `admin_toppings_be.md` |
| 2 | 🟡 Sửa doc | Bỏ link sibling chết tới `admin_toppings_crosscomponent_dataflow.md` (file không tồn tại) | `admin_toppings_loading.md:193` |
| 3 | 🟢 Sửa doc | Viết đầy đủ chữ viết tắt ASCII cho khớp render: `Áp dụng cho SP`→`Áp dụng cho sản phẩm`; `Chưa gắn SP`→`Chưa gắn sản phẩm`; bỏ tiêu đề cột `Hành động` không render | `admin_toppings.md` (ASCII wireframe) |
| 4 | 🟢 Code (tuỳ chọn) | Bỏ nhánh 409 chết ở `ToppingFormModal.tsx:55-57` **hoặc** thêm unique constraint trên `toppings.name` + check trùng BE (quyết định sản phẩm) | `ToppingFormModal.tsx` / `product_service.go` / migration |
| 5 | 🟡 Code (tuỳ chọn) | Invalidate `product:<id>` khi ghi topping để fix topping cũ tới 5 phút trên product-detail khách | `product_service.go:719-721` |
| 6 | 🟢 Code (tuỳ chọn) | Disable nút Xóa khi `deleteMut.isPending` (chống xoá kép) | `toppings/page.tsx` + `ToppingTable.tsx` |

> Theo CLAUDE.md: sửa doc (#1–#3) là **một** task ALIGN; mỗi thay đổi **code** (#4–#6) phải đăng ký
> `MASTER_TASK.md` **trước khi chạm file**. Audit này không thay đổi gì.
