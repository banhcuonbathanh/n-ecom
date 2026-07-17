# Staff POS `/pos` — So Sánh Chi Tiết Tài Liệu vs. Code (4 Mảng)

> **Phạm vi:** rà soát bộ tài liệu `staff_pos` (`staff_pos.md`, `staff_pos_be.md`,
> `staff_pos_crosspage_dataflow.md`, `staff_pos_loading.md`, `POS_BUGS.md`) so với code thật trên
> nhánh **`experience_claude.md_system_1_test_iphon2_change_code`**.
> Năm trục: ① giao diện component · ③ luồng dữ liệu cross-page · ④ hành vi loading · ⑤ mô hình dữ liệu FE⇄BE.
> (Trục ② luồng cross-component **không áp dụng** — trang giữ đơn hàng trong `useState` cục bộ `PosCartItem[]`,
> không dùng store chia sẻ; không có file `_crosscomponent_dataflow.md`.)
> **Chỉ đọc — không sửa code/tài liệu.** Thực hiện bởi 3 sub-agent Sonnet chạy song song (mảng 1/3/4) + orchestrator (mảng 5 inline);
> mọi mục 🔴 đã được **tự tay kiểm chứng lại** từ nguồn. Ngày: **2026-06-23**.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Giao diện component | **Lỗi thời nghiêm trọng** — toàn bộ tính năng table-picker / "Đặt hộ" thiếu trong wireframe | 5 | 7 | 6 |
| ③ Luồng cross-page | **Lỗi thời** — kiến trúc đúng hướng, nhưng giả định `table_id=NULL` hiện sai trên toàn repo | 3 | 5 | 10 |
| ④ Loading | **Phần lớn chính xác** — phủ nhận một `<Suspense>` có thật và chỉ liệt kê 2 trong 4 query | 1 | 3 | 12 |
| ⑤ Mô hình dữ liệu FE⇄BE | **Lỗi thời** — tài liệu BE viết trước khi có "Đặt hộ"; bỏ sót 2 endpoint đang dùng, khẳng định các sự kiện đã lỗi thời | 3 | 3 | 8 |

**Nguyên nhân gốc rễ của gần như toàn bộ drift:** toàn bộ bộ tài liệu được trace trên **nhánh cũ
(`experience_claude.md_system_1`)** — *trước khi* tính năng **table-picker + "Đặt hộ" (đặt hộ khách)**
được bổ sung. Tài liệu vẫn mô tả POS như một luồng walk-in thuần túy không có bàn và đánh dấu
tính năng đặt hộ là `🔮 PLANNED`. Tính năng đó nay đã được triển khai, và nó làm sai toàn bộ
giả định trung tâm của bộ tài liệu: **mọi đơn POS đều có `table_id = NULL` và `customer_name = 'Khách tại quán'`.**

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng)

1. **Toàn bộ tính năng table-picker / "Đặt hộ" là code thật, nhưng tài liệu đánh dấu `🔮 PLANNED`
   và bỏ qua hoàn toàn.** TL;DR của `staff_pos.md` ghi *"🔮 PLANNED: order on a customer's behalf"* và
   ASCII + Zones vẽ một POS hai cột đơn giản không có UI bàn. Code đã triển khai tất cả:
   `TablePickerModal` (`pos/page.tsx:41-97`), nút header "Chọn bàn / Đổi bàn" (`:246-251`), chip tên
   bàn (`:242-245`), số chỗ trống tính từ `listTables` + `listLiveOrders` (`:112-125`), và seeding
   query-param `?table_id=&table_name=` (`:107-108`). Nguồn handoff là **`TableList.tsx:357`**
   (`router.push('/pos?table_id=…&table_name=…')`). Đây là drift lớn nhất trên trang.

2. **Câu "đơn POS luôn có `table_id = NULL` và `customer_name = 'Khách tại quán'`" hiện SAI —
   và sai này kéo theo KDS + admin-overview.** Khi chọn bàn, trang gửi
   `...(tableId ? { table_id: tableId } : {})` (`pos/page.tsx:184`) và
   `customer_name: tableName ?? 'Khách tại quán'` (`:181`). Server-side, `CreateOrder` chạy tra
   cứu bàn bận (`GetActiveOrderByTable`, `order_service.go:270-273`) và lưu `table_id` thật (`:302-303`) —
   nên một đơn POS "Đặt hộ" có thể có `table_busy = true` và table khác NULL.
   `staff_pos_be.md §3` ("`table_id` absent → lookup skipped → stored NULL → `table_busy` always
   false", Flag 3), và `staff_pos_crosspage_dataflow.md §5/§6` (đơn POS "never appear in any
   table-slot/floor-grid zone") đều sai với đơn "Đặt hộ", vốn mang table thật và
   **tên bàn làm `customer_name`**.

3. **Bảng endpoint của tài liệu BE chưa đầy đủ — bỏ sót 2 trong 7 endpoint đang dùng của trang.**
   `staff_pos_be.md` mục "Endpoints Used by This Page" liệt kê 5 hàng nhưng trang cũng gọi
   **`GET /tables`** (`listTables`, `admin.api.ts:167-168`, nguồn tính chỗ trống) và **`GET /orders/live`**
   (`listLiveOrders`, `admin.api.ts:172-173`, staleTime 15s) mỗi lần mount. Cả hai đều không có trong
   tài liệu BE, bảng query của tài liệu loading, hay bản đồ nguồn cross-page.

4. **LỖI CODE (vẫn thật, đã ghi trong tài liệu): mọi đơn POS hiện "Đơn #undefined".** `POST /orders`
   chỉ trả về `{data:{id, table_busy}}` (`order_handler.go:121`) — không có `order_number`. Trang
   dùng đối tượng gọn đó như một `Order` đầy đủ và đọc `order.order_number` trong toast thành công
   (`pos/page.tsx:190`) và header thẻ waiting (`:200`); `Order.order_number` được typed là `string`
   (`types/order.ts:40`) nhưng giá trị runtime là `undefined` → cả hai render đúng literal
   `undefined`. Redirect vẫn hoạt động (dùng `id`). Đã ghi là **`POS_BUGS.md` Bug 1**;
   xác nhận lại trên nhánh này. Sửa một dòng FE: theo `POST /orders` bằng `GET /orders/:id`
   (pattern mà menu/checkout đã dùng).

> **🟡 Đáng chú ý (không đưa vào headline):** `staff_pos_loading.md §2` khẳng định "*no `<Suspense>`*",
> nhưng `pos/page.tsx:31` bọc `POSContent` trong `<Suspense fallback={null}>` (bắt buộc bởi
> `useSearchParams()`). UX không đổi (fallback là `null`), nhưng đây là mâu thuẫn trực tiếp không có
> tác động người dùng.

---

## Component Chết / Không Thể Truy Cập

- **Không có.** `POSPage`, `TablePickerModal`, và `POSContent` đều có thể truy cập. Effect WS của POS
  chỉ xử lý `order_status_changed` và im lặng bỏ qua các loại sự kiện khác đến trên socket `orders:kds`
  chia sẻ (`new_order`, `item_progress`, `order_cancelled`, …) — đây là **thiết kế có chủ ý**,
  không phải code chết (xem Mảng 3, §8 gap).

---

## Mảng ① — Giao Diện Component

**Kết luận:** lỗi thời nghiêm trọng — wireframe ra đời trước tính năng table-picker và bỏ qua
hoàn toàn; bộ khung hai cột được vẽ nhìn chung đúng hướng.

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| **TablePickerModal** | Thiếu; TL;DR đánh dấu đặt-hộ là `🔮 PLANNED` | Đã triển khai đầy đủ + render: lưới bàn 3 cột, trạng thái "Có khách"/"Trống", bàn bận bị disable, fallback "Khách vãng lai" (`pos/page.tsx:41-97`, mở tại `:226`) | 🔴 | Bỏ `🔮 PLANNED`; thêm hàng zone TablePickerModal |
| **Nút header "Chọn bàn / Đổi bàn"** | Không vẽ | Nút header luôn hiện; nhãn đổi theo `tableName` (`pos/page.tsx:246-251`) | 🔴 | Thêm vào ASCII + Key Interactions |
| **Chip tên bàn trong header** | Không đề cập | Badge `bg-primary/10` có điều kiện khi `tableName` được set (`pos/page.tsx:242-245`) | 🔴 | Ghi chip có điều kiện |
| **Seeding query-param "Đặt hộ"** | Không mô tả | `tableId`/`tableName` seeded từ `?table_id=&table_name=` (`pos/page.tsx:107-108`) | 🔴 | Thêm vào entry-points / Key Interactions |
| **Query chiếm chỗ (tables + liveOrders)** | Không có hàng Zones | `['tables']` + `['orders','live']` tạo `occupiedTableIds` (`pos/page.tsx:112-125`) | 🔴 | Thêm hai hàng Zones |
| **Số cột lưới sản phẩm** | ASCII vẽ 3 cột | `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (`pos/page.tsx:262`) | 🟡 | Thêm chú thích responsive |
| **Bố cục dòng item đơn hàng** | `35.000đ [−]2[+]` inline | Tên+giá xếp dọc bên trái, stepper bên phải (`pos/page.tsx:293-308`) | 🟡 | Vẽ lại thành hàng hai dòng |
| **Trạng thái loading "Tạo Đơn →"** | `[ Tạo Đơn → ]` | `'Đang tạo...'` + disabled khi `createOrder.isPending` (`pos/page.tsx:319-323`) | 🟡 | Ghi chú loading copy |
| **Hiển thị "Xoá đơn"** | Luôn hiện | Chỉ render khi `cart.length > 0` (`pos/page.tsx:325-333`) | 🟡 | Ghi chú có điều kiện |
| **Nhãn "Hết" khi không còn hàng** | Chỉ card mờ | Card mờ + nhãn `text-urgent` "Hết" trong card (`pos/page.tsx:264-274`) | 🟡 | Ghi thêm nhãn |
| **Bố cục nút trạng thái waiting** | Xếp dọc | Cạnh nhau `flex gap-3` (`pos/page.tsx:205-218`) | 🟡 | Vẽ lại cạnh nhau |
| **Các field POST body** | `customer_name:'Khách tại quán'` | Còn có `customer_phone:'0000000000'`, `table_id` tuỳ chọn, `customer_name = tableName ?? …` (`pos/page.tsx:181-186`) | 🟡 | Ghi đầy đủ payload |
| Copy giỏ trống `"Chọn món từ menu"` | Literal được trích dẫn | Đúng (`pos/page.tsx:289`) | 🟢 | — |
| Copy waiting card | "…sẽ tự chuyển…" | "…bạn sẽ được chuyển đến thanh toán tự động." (`pos/page.tsx:203`) | 🟢 | Copy nhỏ |
| CategoryTabs | hàng tab đơn giản | `sticky top-[108px] z-10` (`CategoryTabs.tsx:12`) | 🟢 | Chi tiết impl |
| AuthGuard / RoleGuard | đặt tên trong Zones | `getMe()`→`/login`; fallback "Không có quyền…" (`AuthGuard.tsx`, `RoleGuard.tsx:17-20`) | 🟢 | — |

**Khớp — đã xác minh:** bố cục hai cột · tái dùng `CategoryTabs` · stepper `[−]/[+]` (qty 0 xoá dòng) ·
chữ "Tạo Đơn →" · waiting card với số đơn + `⏳ Bếp đang chuẩn bị...` + hai nút ·
WS `order_status_changed` → `router.push('/cashier/payment/:id')` khi `ready` · `AuthGuard`+`RoleGuard
minRole=CASHIER` · state `PosCartItem[]` cục bộ.

---

## Mảng ③ — Luồng Cross-Page

**Kết luận:** mô hình bộ nhớ fire-and-forget, đảm bảo không-localStorage, hub WS chia sẻ, và chuỗi
handoff downstream được mô tả đúng — nhưng 3 mâu thuẫn cứng đều xuất phát từ tính năng "Đặt hộ"
chưa được mô hình hoá, và hầu hết số dòng được trích dẫn đã lỗi thời khoảng ~60-130 dòng.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| **Handoff "Đặt hộ" vào `/pos`** | Handoff có nhưng không đặt tên nguồn | Nguồn duy nhất `TableList.tsx:357`; đọc tại `pos/page.tsx:107-108` | 🟡 | Đặt tên `TableList.tsx` trong source map |
| **`table_id=NULL` cho mọi đơn POS** | §5/§6 khẳng định mọi đơn POS có `table_id=NULL` | "Đặt hộ" gửi `table_id` thật (`pos/page.tsx:184`); lưu khác NULL (`order_service.go:302-303`) | 🔴 | Tách case walk-in (NULL) vs "Đặt hộ" (table) |
| **`customer_name` luôn là `'Khách tại quán'`** | §5 literal cứng | `tableName ?? 'Khách tại quán'` (`pos/page.tsx:181`) — tên bàn được gửi khi chọn | 🔴 | Sửa §5; ghi chú ảnh hưởng tới KDS/overview |
| **Đơn POS không bao giờ hiện trong zone table-slot/floor** | §6 | Đơn "Đặt hộ" mang `table_id` → CÓ xuất hiện trong các zone đó (nguồn `TableList.tsx:357`) | 🔴 | Cập nhật §6 |
| **WS early-return khi chưa có đơn active** | `pos/page.tsx:56` | `if (!activeOrder) return` tại `pos/page.tsx:144` | 🟡 | Sửa số dòng |
| **Auto-redirect / nút thủ công** | dòng `:66 / :118 / :125` | redirect `:154`, "Đến thanh toán" `:207`, "Tạo đơn mới" `:213` | 🟡 | Sửa số dòng |
| **§8 xử lý cancel** | POS fetch lại khi cancel; `status≠ready`→không redirect | POS chỉ fetch lại khi `order_status_changed`; cancel phát `order_cancelled` → màn waiting im lặng, không fetch lại | 🟡 | Sửa §8 |
| Kênh WS / shape · `OrdersWSProvider` trong layout · payment page dùng WS riêng · không có localStorage POS | §2/§3/§4 | Đã xác nhận (`OrdersWSContext.tsx`, `(dashboard)/layout.tsx:4`, `storage-keys.ts:1-7` — không có key POS) | 🟢 | — |

**Khớp — đã xác minh:** đảm bảo không-localStorage · `OrdersWSProvider` trong dashboard layout ·
payment page mở WS riêng + trả về `router.push('/pos')` · KDS/overview set trạng thái `ACTIVE` ·
guard WS message (`pos/page.tsx:147-148`).

---

## Mảng ④ — Hành Vi Loading

**Kết luận:** bức tranh "không skeleton / im lặng-trống / màn auth trắng" là chính xác; hai
mâu thuẫn — một `<Suspense>` bị phủ nhận và bảng query thiếu sót.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| **Ranh giới `<Suspense>`** | §2: "None — not wrapped in `<Suspense>`" | `<Suspense fallback={null}>` bọc `POSContent` (`pos/page.tsx:31`), bắt buộc bởi `useSearchParams()` | 🔴 | Sửa §2 |
| **Danh sách query** | §3 chỉ liệt kê categories + products | 4 query chạy: `['tables']` 60s + `['orders','live']` 15s cũng có (`pos/page.tsx:112-121`) | 🔴 | Thêm 2 query chiếm chỗ |
| **Lỗi `createOrder`** | chưa ghi | `onError → toast.error('Không thể tạo đơn hàng')` (`pos/page.tsx:192`) | 🟡 | Ghi chú toast |
| **Default TanStack toàn cục** | chưa đề cập | `staleTime:60s, retry:1` (`lib/providers.tsx:8`) | 🟡 | Ghi chú default toàn cục |
| AuthGuard blank `return null` · RoleGuard denied render · không có `loading.tsx` · không destructure `isLoading`/`isError` · im lặng-trống khi lỗi · nút `isPending` · màn waiting · layout-shift của CategoryTabs · không có gate `enabled` | §2-§4 | Đã xác nhận (`AuthGuard.tsx:23`, `RoleGuard.tsx:17-20`, `CategoryTabs.tsx:13-38`, `pos/page.tsx:127-139,262-278,319-323`) | 🟢 | — |

**Khớp — đã xác minh:** màn auth trắng · không có `loading.tsx` route · mọi query mặc định `[]` khi
lỗi (lỗi mạng == catalog trống) · nút "Đang tạo..." disabled · waiting card thay thế layout ·
`GET /orders/:id` kích hoạt bởi WS không có spinner.

---

## Mảng ⑤ — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** `staff_pos_be.md` được trace trên nhánh trước khi có "Đặt hộ" — bảng endpoint chưa
đầy đủ và một số khẳng định hành vi đã lỗi thời. Pipeline mà tài liệu *có* mô tả (giá tin từ server,
tx nguyên tử, đánh số `order:seq`) là chính xác; tất cả số dòng `main.go` lệch ~+13.

| Endpoint/Field | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| **`GET /tables`** (chiếm chỗ) | thiếu trong bảng endpoint | `listTables` → `GET /tables` (`admin.api.ts:167-168`); nhóm `main.go:278` | 🔴 | Thêm hàng endpoint |
| **`GET /orders/live`** (chiếm chỗ) | thiếu trong bảng endpoint | `listLiveOrders` → `GET /orders/live` (`admin.api.ts:172-173`); route `main.go:247`, cashier+ | 🔴 | Thêm hàng endpoint |
| **`table_id` trong POST** | §3 "table_id absent → NULL, busy-lookup skipped, `table_busy` always false" | gửi khi chọn (`pos/page.tsx:184`); busy-lookup chạy (`order_service.go:270-273`); được lưu (`:302-303`) | 🔴 | Viết lại đoạn `table_id` trong §3 |
| **`customer_name`** | Flag 3: luôn là `'Khách tại quán'` | `tableName ?? 'Khách tại quán'` (`pos/page.tsx:181`) | 🟡 | Sửa Flag 3 |
| **Bug 1 — POST response** | Flag 6 / Bug 1: trả về `{id, table_busy}`, POS hiện "Đơn #undefined" | xác nhận `order_handler.go:121`; đọc tại `pos/page.tsx:190,200`; `order_number:string` `order.ts:40` | 🔴 | Sửa code (đăng ký MASTER) |
| **POS bỏ qua `order-payload.ts`** | Flag 2 | xác nhận inline `{product_id, quantity}` (`pos/page.tsx:185`) | 🟡 | tài liệu đúng; gap nhất quán |
| **Extras của serializer** | chưa mô hình | `orderJSON` phát `item_status`/`created_by` (`order_handler.go:358-388`) thiếu trong type FE; `OrderItem.flagged` FE (`order.ts:26`) không bao giờ được phát | 🟡 | Đồng bộ type vs serializer |
| **Số dòng route** | `/products :168`, `/categories :186`, orders group `:230`, POST `:232`, GET/:id `:236`, ws `:339` | thật: `:180`, `:198`, `:243`, `:245`, `:249`, `:352` | 🟢 | Làm mới tất cả trích dẫn `main.go` (+~13) |
| `source:'pos'`→`OrdersSourcePos` · status `pending` (không skip-confirm) · giá tin từ server · tx nguyên tử · đánh số `order:seq` · phát `new_order` · GET catalog công khai | §3 | Đã xác nhận (`order_service.go:262,278,317,322-349`) | 🟢 | — |

**Khớp — đã xác minh:** mapping enum `source:'pos'` · POS bắt đầu `pending` (màn waiting là FE-only) ·
server đọc giá qua snapshot · persist một-tx · `created_by` = UUID cashier · tên field WS khớp
(`type`/`order_id` trên `orders:kds`).

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Sửa tài liệu | Bỏ `🔮 PLANNED`; thêm TablePickerModal + "Chọn/Đổi bàn" + chip bàn + seeding "Đặt hộ" + query chiếm chỗ vào ASCII/Zones/Key-Interactions | `staff_pos.md` |
| 2 | 🔴 Sửa tài liệu | Viết lại các đoạn `table_id`/`customer_name`/`table_busy` — đơn POS CÓ THỂ mang bàn thật; sửa §3 + Flag 3 | `staff_pos_be.md` |
| 3 | 🔴 Sửa tài liệu | Thêm hàng endpoint `GET /tables` + `GET /orders/live`; làm mới tất cả số dòng route `main.go` (+~13) | `staff_pos_be.md` |
| 4 | 🔴 Sửa tài liệu | Sửa §5/§6 (đơn "Đặt hộ" POS CÓ xuất hiện trong zone table-slot/floor; KDS hiện "Bàn X"); sửa số dòng lỗi thời | `staff_pos_crosspage_dataflow.md` |
| 5 | 🔴 Sửa tài liệu | Ghi nhận `<Suspense fallback={null}>`; liệt kê đủ 4 query; ghi chú toast `onError` của `createOrder` | `staff_pos_loading.md` |
| 6 | 🔴 Lỗi code | Sửa "Đơn #undefined": theo `POST /orders` bằng `GET /orders/:id` trước `setActiveOrder` (hoặc mở rộng response POST) | `fe/src/app/(dashboard)/pos/page.tsx` (POS_BUGS Bug 1) |
| 7 | 🟡 Code/product | "Tạo đơn mới" bỏ rơi đơn active — quyết định cancel-vs-keep | `pos/page.tsx` (POS_BUGS Bug 2) |
| 8 | 🟡 Code | Đồng bộ type FE `OrderItem` vs serializer `orderJSON` (`item_status`/`created_by`/`flagged`) | `fe/src/types/order.ts` |

> Theo `CLAUDE.md`: các sửa tài liệu (1-5) là một task ALIGN; **mỗi thay đổi code (6-8) phải được
> đăng ký vào `MASTER_TASK.md` trước khi chạm vào bất kỳ file nào.** Skill này chỉ đọc và không thay đổi
> code ứng dụng hay bộ tài liệu trang.
