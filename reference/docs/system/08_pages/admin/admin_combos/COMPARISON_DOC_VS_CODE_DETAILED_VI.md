# Admin Combos — Tài Liệu vs. Code (Kiểm Toán Chi Tiết)

> **Phạm vi:** bộ tài liệu trang `/admin/combos` (`admin_combos.md`, `admin_combos_be.md`,
> `admin_combos_crosspage_dataflow.md`, `admin_combos_loading.md`, `SCENARIO_COMBOS_CRUD.md`,
> `COMBOS_BUGS.md`) đối chiếu với code FE/BE đang chạy trên nhánh
> `experience_claude.md_system_1_test_iphon2_change_code`.
> **5 trục:** ① hình ảnh component · ② luồng dữ liệu liên-component · ③ luồng dữ liệu liên-trang ·
> ④ hành vi loading · ⑤ mô hình dữ liệu FE⇄BE.
> **Chỉ đọc — không sửa code hay tài liệu.** Thực hiện trực tiếp (3 agent fan-out gặp giới hạn phiên;
> orchestrator đã trace lại từng claim bằng tay từ source). Các mục 🔴, nếu có, được xác minh thủ công.
> **Không tồn tại file cross-component-dataflow** cho trang này (trang là một component `'use client'`
> với `useState` cục bộ — chính tài liệu ghi nhận Trục ② là N/A), nên trục ② được gộp vào ①/③.
> Ngày: 2026-06-21.

---

## Tóm Tắt Điều Hành

| Trục | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Hình ảnh component (`admin_combos.md` ASCII + Zones) | **Trung thực** — mọi Zone `file:line` khớp `page.tsx`; chỉ là trừu tượng hoá ASCII | 0 | 0 | 3 |
| ② Luồng dữ liệu liên-component | **N/A** — một component, `useState` cục bộ; tài liệu ghi đúng là N/A | 0 | 0 | 0 |
| ③ Luồng dữ liệu liên-trang (`_crosspage_dataflow.md`) | **Chính xác** — mô hình khoá chia sẻ `combos:list` được xác nhận đầu-cuối | 0 | 1 | 1 |
| ④ Hành vi loading (`_loading.md`) | **Chính xác** — guards, query gates, trạng thái modal đều xác nhận | 0 | 1 | 1 |
| ⑤ Mô hình dữ liệu FE⇄BE (`admin_combos_be.md` + Object Model) | **Chính xác** — mọi endpoint, binding, SQL, cache đều xác nhận | 0 | 1 | 2 |
| **Bug code** (`COMBOS_BUGS.md` — đã ghi sẵn, không phải drift) | **Cả 4 được tái xác nhận trong code hiện tại** | — | — | — |

**Kết luận:** **Không có mâu thuẫn 🔴 giữa tài liệu và code.** Đây là bộ tài liệu trace-từ-source độ
chính xác cao — ngang tầm `customer_combo_detail` và `admin_summary`. Tài liệu mô tả đúng code đang chạy,
*kể cả* các bug của nó. 4 bug code được liệt kê trong `COMBOS_BUGS.md` là **thật và vẫn còn**, nhưng
tài liệu đã ghi nhận chúng trung thực, nên chúng **không** phải lỗi tài liệu. Drift thực sự duy nhất là
về provenance: số dòng route `main.go` cũ (~+13) và sai thư mục của `providers.tsx`.

---

## NHỮNG PHÁT HIỆN PHẢI LÊN TIẾNG 🔴

**Không có.** Không có claim nào trong tài liệu bị code phủ định. Mọi khẳng định hành vi trong bộ tài
liệu — danh sách chỉ-available, hardcode `is_available=1`, PATCH nulls `image_path`/`category_id`,
nuốt lỗi item insert, bất đối xứng validation create/update, cache chia sẻ `combos:list` — đều được
trace lại tới source và **đúng**.

### ⚠️ Bug code được tái xác nhận (thật, nhưng tài liệu đã ghi sẵn — sửa cần đăng ký MASTER)

Đây là bug **code**, lại nổi lên qua kiểm toán này. Chúng không phải drift tài liệu — `COMBOS_BUGS.md`
và các Flag trong `_be.md`/scenario mô tả chúng đúng. Liệt kê ở đây để giữ chúng hiện diện:

1. **Danh sách combo admin chỉ-available — combo ẩn không quản lý được** (Bug 1). Service `ListCombos`
   gọi query repo chỉ-available `ListCombosAvailable`
   ([product_service.go:505](../../../../../be/internal/service/product_service.go#L505)); query
   `ListCombos` không lọc tồn tại nhưng **chết**
   ([products.sql:107-110](../../../../../be/query/products.sql#L107)). Combo **không có `/combos/all`**
   manager (khác với `/products/all` của product), nên bất kỳ combo `is_available=0` nào sẽ biến mất
   khỏi bảng. Tiềm ẩn hôm nay (không đường dẫn nào set `is_available=0`). Sửa BE.
2. **`PATCH /combos/:id` nulls `image_path` + `category_id` mỗi lần sửa** (Bug 2). Handler
   `updateComboRequest` **không có** field `image_path`/`category_id`
   ([product_handler.go:400-406](../../../../../be/internal/handler/product_handler.go#L400)); service
   dựng `UpdateComboParams` **bỏ** `ImagePath` (zero → NULL) và `CategoryID=""` → NULL
   ([product_service.go:603-610](../../../../../be/internal/service/product_service.go#L603)); SQL set
   **cả hai** cột bất kể ([products.sql:132-135](../../../../../be/query/products.sql#L132)). Tiềm ẩn
   (form không gửi field nào). Sửa BE.
3. **Item insert không có transaction & nuốt lỗi FK** (Bug 3). Cả hai đường ghi đều loop
   `CreateComboItem` và chỉ `slog.Warn` khi lỗi
   ([create :563](../../../../../be/internal/service/product_service.go#L563) /
   [update :618](../../../../../be/internal/service/product_service.go#L618)) — một `product_id` sai
   bị bỏ trong khi header vẫn trả 2xx. Sửa BE.
4. **`POST /combos` validation lỏng hơn `PATCH`** (Bug 4). Create bind `price min=0` và **không** có
   tối thiểu số item
   ([product_handler.go:359-365](../../../../../be/internal/handler/product_handler.go#L359)); update
   bind `price min=1` + `items required,min=2`
   ([:401-405](../../../../../be/internal/handler/product_handler.go#L401)). API chấp nhận combo
   miễn-phí/không-item khi create (FE chặn ≥2, `page.tsx:173`). Sửa BE.

---

## Code chết / không thể với tới

- **Không có UI chết trong trang này.** Mọi nhánh trong `page.tsx` đều với tới được.
- **Query BE chết:** `ListCombos` (`products.sql:107-110`) — danh sách combo không lọc, **không caller**
  (method service tên `ListCombos` gọi `ListCombosAvailable` thay vào đó). Gốc của Bug 1.
- **Field response chết:** `GET /combos` trả `is_available`
  ([product_handler.go:349](../../../../../be/internal/handler/product_handler.go#L349)) và `listCombos`
  map nó ([admin.api.ts:137](../../../../../fe/src/features/admin/admin.api.ts#L137)), nhưng trang này
  **không bao giờ render hay toggle** — không có cột/toggle availability (tài liệu Flag 1/2, đã xác nhận).
- **Tham số service chết:** `UpdateComboInput.CategoryID` được service đọc
  (`product_service.go:595-597`) nhưng **không bao giờ được handler set** — gốc của Bug 2.
- **Type raw trùng lặp (không chết):** trang admin dùng `RawCombo` cục bộ
  ([admin.api.ts:122-126](../../../../../fe/src/features/admin/admin.api.ts#L122)) trong khi `ComboRaw`
  chia sẻ ([types/product.ts:36-46](../../../../../fe/src/types/product.ts#L36)) được customer
  menu/favourites/combo-detail dùng — hai định nghĩa cho cùng một shape wire. Ghi chú liên-trang,
  không phải drift của trang này.

---

## Trục ① — Hình ảnh component

**Kết luận:** Trung thực. Mọi Zone và anchor ASCII trong `admin_combos.md` ánh xạ tới `page.tsx` thật.
ASCII là trừu tượng hoá trung thực của DOM render; khoảng cách duy nhất là về thẩm mỹ (ký tự checkbox
ASCII thay cho checkbox SVG tuỳ biến, dòng mô tả mà ASCII bỏ qua).

| Component / Chủ đề | Tài liệu nói (`admin_combos.md`) | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Anchor trace wireframe | "Traced from `page.tsx:233-342`" + modal `:345-552` | `return` mở `page.tsx:233`; Zone B `:235-253`; Zone C `:255-342`; modal `:345-552` | 🟢 | không |
| Header Zone B `Combo (N)` | đếm `combos.length`, `page.tsx:236-253` | `<h2>Combo ({combos.length})</h2>` [page.tsx:237](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L237>) | 🟢 | không |
| Nút 🎲 Random combo | inline → `handleRandomCombos`, 3× song song `Promise.allSettled`, `:239-245, 194-228` | nút [page.tsx:239-245](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L239>); handler `:194-229` (allSettled `:207`) | 🟢 | không |
| + Thêm combo → `openAdd` | mở modal `'add'`, `:246-252, 78-84` | [page.tsx:246-251](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L246>); `openAdd` `:78-84` | 🟢 | không |
| Zone C ComboTable | `<table>`, `:261-342`; retail/savings phía client | hàng `page.tsx:274-338`; `rowRetail`/`rowSavings` `:275-279` | 🟢 | không |
| Cell Sản phẩm — chip | resolve qua `productMap`, fallback `product_id`, `:288-301` | `{p?.name ?? item.product_id} ×{qty}` [page.tsx:294](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L294>) | 🟢 | không |
| Cell Actions — Sửa luôn / Xóa chỉ-admin | `:318-335`, Xóa gated `isAdmin` | Sửa `:320-325`; `{isAdmin && …Xóa}` `:326-333` | 🟢 | không |
| Zone D ComboFormModal | RHF+Zod, `:344-552`; Lưu disabled `<2` item | modal `:345-552`; disabled `isPending || selectedItems<2` `:543` | 🟢 | không |
| Hàng picker ASCII `[☐]`/`[☑]` | ký tự checkbox ASCII + giá + stepper | code render **checkbox SVG tuỳ biến** (`:422-430`) + **dòng mô tả** tuỳ chọn (`:441-443`) mà ASCII bỏ; stepper chỉ khi checked `:445-469` | 🟢 | ASCII là gần đúng — chấp nhận được |
| Gợi ý giá / hint tiết kiệm | 90% làm tròn 1.000đ `:503-505`; savings `:515-519` | `Math.round(retailTotal*0.9/1000)*1000` [page.tsx:504](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L504>); savings `:515-519` | 🟢 | không |

**Đã xác nhận khớp:** EmptyState (`icon="🍱"`, message), grid 2-cột tên/mô tả, nút "Bỏ chọn tất cả",
khối selected-summary (`Tổng giá lẻ`), footer `Huỷ bỏ`/`Lưu combo`, và handler Escape-để-đóng đều khớp
chính xác các dòng được trích.

---

## Trục ③ — Luồng dữ liệu liên-trang

**Kết luận:** Chính xác. Sơ đồ toàn cảnh, câu chuyện khoá chia sẻ `combos:list`, mô hình pull-only
(không SSE/WS), và handoff expand-tại-order-time đều đúng với source.

| Chủ đề | Tài liệu nói (`_crosspage_dataflow.md`) | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Writes chỉ Del `combos:list` | `invalidateComboCaches` chỉ Del `combos:list`, `product_service.go:723-725` | `s.rdb.Del(ctx, cacheKeyCombos)` [product_service.go:723-724](../../../../../be/internal/service/product_service.go#L723); `cacheKeyCombos="combos:list"` `:27` | 🟢 | không |
| TTL 5 phút | `productCacheTTL`, `product_service.go:21` | `const productCacheTTL = 5 * time.Minute` [product_service.go:21](../../../../../be/internal/service/product_service.go#L21) | 🟢 | không |
| List rebuild từ `ListCombosAvailable` | chỉ-available, `product_service.go:505` | `s.repo.ListCombosAvailable(ctx)` [product_service.go:505](../../../../../be/internal/service/product_service.go#L505) | 🟢 | không |
| FE `invalidateQueries(['admin','combos'])` mỗi mutation | `page.tsx:140,156,166` | create `:140`, edit `:156`, delete `:166`, random `:222` | 🟢 | không |
| Không SSE/WS trên trang này | pull-only | không import WS/SSE trong `page.tsx` (đã xác nhận) | 🟢 | không |
| `staleTime` toàn cục 60s | `providers.tsx:8` | giá trị + dòng đúng, nhưng đường dẫn thật là **`fe/src/lib/providers.tsx:8`** không phải `fe/src/app/providers.tsx` | 🟡 | sửa thư mục trong trích dẫn |
| Trích `main.go` route trong source map | (refs BE chung) | combos routes nay ở `main.go:228-240` (xem Trục ⑤) | 🟢 | refresh lần chạy sau |

**Đã xác nhận khớp:** ma trận bền vững, hành vi F5/reload, luồng ngược cancellation/`SoftDeleteCombo`
(không guard in-use), và timeline đầu-cuối đều nhất quán với code service BE.

---

## Trục ④ — Hành vi loading

**Kết luận:** Chính xác. 4 lớp loading, gating per-query, và trạng thái pending modal đều xác nhận với
các component guard và `page.tsx`.

| Chủ đề | Tài liệu nói (`_loading.md`) | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| AuthGuard render `null` cho tới `getMe()` | màn hình trắng; redirect `/login` khi fail; ref `attempted.current`; `:7-24,19,23` | `if (!user) return null` [AuthGuard.tsx:23](../../../../../fe/src/components/guards/AuthGuard.tsx#L23); redirect `:19`; ref `:12` | 🟢 | không |
| Text access-denied của RoleGuard | `<div className="text-urgent p-8 text-center font-body">Không có quyền truy cập trang này</div>` `:16-20` | khớp chính xác [RoleGuard.tsx:16-22](../../../../../fe/src/components/guards/RoleGuard.tsx#L16) | 🟢 | không |
| Layout bọc AuthGuard `:29` + RoleGuard MANAGER `:30` | — | `<AuthGuard>` `:29`, `<RoleGuard minRole={Role.MANAGER}>` [layout.tsx:30](<../../../../../fe/src/app/(dashboard)/admin/layout.tsx#L30>) | 🟢 | không |
| Spinner route `h-64`/`h-8 w-8`/`border-t-orange-500` `:1-7` | — | chính xác [admin/loading.tsx:1-7](<../../../../../fe/src/app/(dashboard)/admin/loading.tsx#L1>) | 🟢 | không |
| Query combos gate Zone C qua `isLoading` `:54-57` | — | `const { data: combos=[], isLoading }` [page.tsx:54-57](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L54>) | 🟢 | không |
| Query products không `isLoading`/`isError`, default `[]` `:58-61` | — | `const { data: products=[] }` [page.tsx:58-61](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L58>) | 🟢 | không |
| Nhánh chính: `Đang tải...` / EmptyState / bảng `:256-259` | text loading thường `:257` | chính xác [page.tsx:256-259](<../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx#L256>) | 🟢 | không |
| Nút Save `Đang lưu...` disabled `isPending||<2` `:543-546` | — | chính xác `:543-546`; `isPending` `:231` | 🟢 | không |
| EmptyState icon mặc định `'🍜'`, `py-16`, `text-4xl`+`text-muted-fg text-sm` `:6-13` | — | chính xác [EmptyState.tsx:6-13](../../../../../fe/src/components/shared/EmptyState.tsx#L6) | 🟢 | không |
| `staleTime` toàn cục 60s `providers.tsx:8` | — | giá trị/dòng đúng, sai thư mục → `fe/src/lib/providers.tsx:8` | 🟡 | sửa thư mục trong trích dẫn |

**Đã xác nhận khớp:** khoảng-trống chip-hiện-UUID-khi-load (Flag 1), loading text-thường-không-skeleton
(Flag 2), khoảng-trống picker-rỗng-trong-modal (Flag 4), khoảng-trống AuthGuard-trắng-khi-F5 (Flag 5),
và khoảng-trống không-pending-delete-cấp-hàng (Flag 6) đều thật và được mô tả đúng.

---

## Trục ⑤ — Mô hình dữ liệu FE⇄BE

**Kết luận:** Chính xác. Mọi endpoint, cổng auth, struct binding, câu SQL, khoá cache, và đường lỗi
trong `admin_combos_be.md` đều xác nhận với source. Object Model trong `admin_combos.md` khớp các type TS
field-cho-field. Chỉ số dòng route `main.go` bị drift.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Anchor handler (`ListCombos`/`CreateCombo`/`UpdateCombo`/`DeleteCombo`/`ListAllProducts`) | `:327/:374/:409/:433/:57` | chính xác: [product_handler.go:327,374,409,433,57](../../../../../be/internal/handler/product_handler.go#L327) | 🟢 | không |
| Binding `createComboRequest` | `price required,min=0`, không item-min, có `image_path`+`category_id` `:359-365` | chính xác [product_handler.go:358-366](../../../../../be/internal/handler/product_handler.go#L358) | 🟢 | không |
| Binding `updateComboRequest` | `price min=1`, `items required,min=2`, **không** image_path/category_id `:400-406` | chính xác [product_handler.go:400-406](../../../../../be/internal/handler/product_handler.go#L400) | 🟢 | không |
| Shape JSON `ListCombos` | item `{id,product_id,quantity}`, không `unit_price`/toppings `:337-341` | chính xác [product_handler.go:337-352](../../../../../be/internal/handler/product_handler.go#L337) | 🟢 | không |
| Service `ListCombos`→`ListCombosAvailable`, TTL 5p | `:497-517,505,21,515` | chính xác [product_service.go:497-517](../../../../../be/internal/service/product_service.go#L497) | 🟢 | không |
| SQL `CreateCombo` hardcode `is_available=1` | `products.sql:128-130` | `VALUES (?,?,?,?,?,?, 1, ?)` [products.sql:129-130](../../../../../be/query/products.sql#L129) | 🟢 | không |
| SQL `UpdateCombo` set `category_id` + `image_path` | `products.sql:132-135` | `SET category_id=?, … image_path=?, …` [products.sql:132-135](../../../../../be/query/products.sql#L132) | 🟢 | không |
| Service `UpdateCombo` bỏ `ImagePath`, NULL category | `:595-610` | params thiếu `ImagePath`; `catID=""→NULL` [product_service.go:603-610](../../../../../be/internal/service/product_service.go#L603) | 🟢 | không |
| `SoftDeleteCombo` không guard in-use, không check tồn tại | `:571-577` | chính xác [product_service.go:571-577](../../../../../be/internal/service/product_service.go#L571) | 🟢 | không |
| `GET /combos` public; `/products/all` manager+ | `main.go:216`, `:171-173`/`:173` | combos GET nay `main.go:229`; `/products/all` nay `main.go:186` (group `:180-195`) | 🟢 | refresh trích `main.go` (~+13) |
| Route group combos | `main.go:215-227` (POST/PATCH `:218-222`, DELETE `:223-227`) | group `main.go:228-240` (mgr `:231-235`, adm `:237-239`) | 🟢 | refresh trích `main.go` |
| Object Model — type `Combo`/`ComboItem` | `types/product.ts:49-59` / `:27-33` | chính xác [product.ts:27-33,49-59](../../../../../fe/src/types/product.ts#L27) | 🟢 | không |
| Object Model — `CreateComboInput`/`RawCombo`/`listCombos` | `admin.api.ts:112-119/:122-126/:128-146` | chính xác [admin.api.ts:112-146](../../../../../fe/src/features/admin/admin.api.ts#L112) | 🟢 | không |
| Flag 3 — dòng set `product_name:''` | `admin.api.ts:143` | thực tế [admin.api.ts:142](../../../../../fe/src/features/admin/admin.api.ts#L142) | 🟢 | lệch 1 |
| Nhánh provenance trong mọi header tài liệu | `experience_claude.md_system_1` | nhánh thực tế `…_test_iphon2_change_code` | 🟢 | refresh lần chạy sau |
| `errors.go` `ErrNotFound` | `:28` | xác nhận trên `errors.go` | 🟡 | trích lại nếu drift (xem ghi chú) |

> Ghi chú về `errors.go:28`: đường PATCH-trên-thiếu → `ErrNotFound` → 404 được xác nhận trong service
> (`product_service.go:589-593` trả `ErrNotFound`). Dòng chính xác trong `errors.go` chưa được mở lại
> trong lượt này — để 🟡 `❓` chỉ cho số dòng; hành vi đã được xác minh.

**Đã xác nhận khớp:** bảng 5-endpoint (cột auth, handler, service, repo, cache), mục caching &
invalidation, mục error-behaviour (bind→400, untyped→500, missing→404, delete→204), và cả 7 Flag đều
chính xác với source.

---

## Danh Sách Hành Động Hợp Nhất (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🟡 Sửa tài liệu | Sửa đường dẫn `providers.tsx` → **`fe/src/lib/providers.tsx:8`** (giá trị 60s/dòng đúng) | `admin_combos_loading.md`, `_crosspage_dataflow.md`, `SCENARIO_COMBOS_CRUD.md` |
| 2 | 🟢 Sửa tài liệu | Refresh số dòng route `main.go` cũ (~+13): group combos `:215-227→:228-240`, GET `:216→:229`, POST/PATCH `:218-222→:231-235`, DELETE `:223-227→:237-239`, group products `:167-182→:180-195`, `/products/all` `:171/:173→:186` | `admin_combos_be.md`, `COMBOS_BUGS.md` |
| 3 | 🟢 Sửa tài liệu | Sửa lệch-1: `product_name:''` ở `admin.api.ts:142` (tài liệu nói `:143`) | `admin_combos.md` Flag 3 |
| 4 | 🟢 Sửa tài liệu | Refresh nhánh provenance trong cả 6 header tài liệu → `experience_claude.md_system_1_test_iphon2_change_code` | toàn bộ doc-set |
| 5 | 🔴 Bug code | Bug 1 — nối list admin tới all-combos (`GET /combos/all` manager+ mới) hoặc xoá query `ListCombos` chết | `product_service.go`, `products.sql`, `main.go` |
| 6 | 🔴 Bug code | Bug 2 — luồng `image_path`+`category_id` qua `updateComboRequest`/`UpdateComboInput`/`UpdateComboParams` (hoặc COALESCE trong SQL) | `product_handler.go`, `product_service.go`, `products.sql` |
| 7 | 🟡 Bug code | Bug 3 — bọc header+items combo trong tx; trả lỗi item-insert thay vì `slog.Warn`-và-nuốt | `product_service.go` |
| 8 | 🟡 Bug code | Bug 4 — siết `createComboRequest` thành `price min=1` + `items required,min=2` | `product_handler.go` |

> Theo CLAUDE.md: sửa tài liệu (#1–4) là **một** task đã ALIGN; mỗi thay đổi code (#5–8) phải được đăng ký
> trong `docs/tasks/MASTER_TASK.md` **trước khi** chạm bất kỳ file nào. Kiểm toán này không thay đổi gì.
</content>
