# Customer Order List (`/order`) — So Sánh Chi Tiết Tài Liệu vs. Code (5 Mảng)

> **Phạm vi:** rà soát chỉ đọc bộ tài liệu `customer_order_list` so với code FE/BE thật đang chạy trên
> nhánh `experience_claude.md_system_1_test_iphon2_change_code`.
> **Trục (5):** ① giao diện component · ② luồng dữ liệu cross-component · ③ luồng dữ liệu cross-page ·
> ④ hành vi loading · ⑤ mô hình dữ liệu FE⇄BE.
> **Chỉ đọc — KHÔNG sửa code hoặc tài liệu.** File này + bản VI mirror + visual mockup +
> `COMPARISON_TRACKER.md` dùng chung là những ghi chép duy nhất được tạo ra.
> **Phương pháp:** phần lõi FE (`order/page.tsx`, `OrderDetailSheet.tsx`, `useOrderSSE.ts`, `cart.ts`,
> `TableConfirmModal.tsx`, `storage-keys.ts`, `types/order.ts`) được đọc tay; bề mặt Go BE được
> truy vết bởi 1 Sonnet agent chạy song song; **mọi 🔴 đều được tự tay kiểm chứng lại** đối chiếu với file được dẫn.
> **Loại trừ:** Mảng ② (luồng cross-component) — trang này **không có** `_crosscomponent_dataflow.md`
> và không có store riêng (đọc trực tiếp localStorage), nên trục này không áp dụng.
> **Ngày:** 2026-06-20.

---

## Tóm Tắt Điều Hành

> **Tiêu đề:** đây là một trong những bộ tài liệu sát code nhất trong repo — gần như mọi `file:line`
> trong `_be.md` / `_crosspage_dataflow.md` / `_loading.md` đều chính xác, và các Flag A/B/C/E ghi chép
> đúng những lỗi thật đang sống trong code. Cuộc kiểm tra phát hiện **một lệch lạc tài liệu thực sự**
> (Flag D cũ — `filling` đã bị xoá) cùng một nhóm lệch nhỏ về số dòng / phiên bản, và **tái xác nhận
> bốn lỗi code thật** mà bộ tài liệu đã gắn cờ.

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Giao diện component | Phần lớn chính xác; overlay mô tả thiếu, DishRow ẩn nhân/ghi chú | 0 | 2 | 4 |
| ② Luồng cross-component | N/A — không có tài liệu; trang không có store riêng | — | — | — |
| ③ Luồng cross-page | Chính xác; Flag D cũ; cart version + lệch số dòng | 1 | 2 | 6 |
| ④ Hành vi loading | Hoàn toàn chính xác | 0 | 0 | 5 |
| ⑤ Mô hình dữ liệu FE⇄BE | Handler/service/SSE chính xác; lệch field serializer + lệch số dòng route | 0 | 3 | 7 |
| **Lỗi code thật đã xác nhận** (tài liệu chính xác) | A · B · C tái kiểm tra đối chiếu code | 3 | — | — |
| **Tổng** | | **4** | **7** | **22** |

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng)

1. **🔴 LỆCH TÀI LIỆU — Flag D cũ: `order_items.filling` không còn tồn tại ở bất kỳ đâu.**
   Bộ tài liệu (`_crosspage_dataflow.md` §11 Flag D + narrative "OC-4 read views render
   filling" trong `CLAUDE.md` gốc) khẳng định `filling` đã được thêm vào (OC-1, migration 016) và là
   một lệch lạc code-vs-spec vì FE type thiếu nó. **Thực tế trong code:** migration
   `017_drop_order_item_filling.sql` đã **xoá** cột — nó backfill nhân (thịt/mộc nhĩ) vào
   `toppings_snapshot` rồi `ALTER TABLE order_items DROP COLUMN filling`. Serializer **không** emit
   `filling` (`order_handler.go:358-370`); FE `OrderItem` **không có** `filling` (`order.ts:15-27`).
   Cả ba tầng nay nhất quán — qua `toppings_snapshot`, không phải `filling`. Tài liệu đang mô tả
   một thế giới hai migration trước đây. → **Sửa tài liệu:** viết lại Flag D thành "nhân là một
   topping trong `toppings_snapshot` (epic TOP, migration 017); `filling` đã xoá."

2. **🔴 LỖI CODE (tài liệu chính xác, Flag A) — sự kiện SSE `item_cancelled` không bao giờ được xử lý phía FE.**
   BE publish `type:"item_cancelled"` trên `DELETE /orders/items/:id`
   (`order_service.go:642`), nhưng `switch (evt.event)` của `useOrderSSE` chỉ có case cho `order_init`,
   `order_status_changed`, `order_cancelled`, `item_progress`, `order_completed`
   (`useOrderSSE.ts:83-123`) — **không có `item_cancelled`**. Món bị huỷ không bị xoá live; overlay
   dựa vào toast mutation cục bộ và chỉ đồng bộ lại ở snapshot/reload tiếp theo. Bộ tài liệu ghi
   chính xác → đây là **lỗi code**, không phải lỗi tài liệu.

3. **🔴 LỖI CODE (tài liệu chính xác, Flag B) — một 404 khiến sheet xoay vô tận.**
   `useOrderSSE` tính toán và trả về `isNotFound` (set tại `useOrderSSE.ts:60`, trả về tại `:159`),
   nhưng `OrderDetailSheet` chỉ destructure
   `{ order, progress, connectionError, notification, clearNotification }`
   (`OrderDetailSheet.tsx:45`) — **`isNotFound` không bao giờ được đọc**. Nhấn vào một card của đơn
   hàng đã soft-delete hoặc đơn nước ngoài không có cache sẽ hiện "Đang tải đơn hàng..." mãi mãi
   (`OrderDetailSheet.tsx:206-212`), không có lỗi và không có lối thoát ngoài nút đóng. Tài liệu
   chính xác → **sửa code**.

4. **🔴 LỖI CODE (tài liệu chính xác, Flag C) — card danh sách không bao giờ làm mới sau khi overlay cập nhật chúng.**
   `loadCachedOrders()` chạy một lần trong `useEffect([], [])` lúc mount (`order/page.tsx:37-39`).
   Đóng overlay (`setSelectedOrderId(null)`) **không** quét lại. Sau khi vòng SSE của overlay ghi
   một trạng thái mới hơn vào `order_cache_<id>`, card danh sách vẫn hiển thị **trạng thái cũ** cho
   đến khi tải lại trang. Tài liệu chính xác → **sửa code** (quét lại khi đóng overlay).

---

## Mã chết / không thể chạm tới

- **Không có FE component chết** trên trang này — `order/page.tsx`, `OrderDetailSheet`, `useOrderSSE` đều
  có thể chạm tới; `StatusBadge` và `ConnectionErrorBanner` được import và render.
- **`item_status` của BE là chết từ góc nhìn của trang này:** serializer emit `item_status`
  (`order_handler.go:367`) nhưng FE type `OrderItem` không có field đó — FE tự suy ngược trạng thái
  phía client qua `deriveItemStatus()` (`order.ts:9-13`). Field này được dùng ở nơi khác (KDS), không
  phải ở đây.
- **`+goose Down` của migration 017 về mặt chức năng là chết** — nó thêm lại schema cột `filling`
  nhưng không thể un-merge các entry topping đã được backfill (thừa nhận trong comment của chính nó).

---

## Mảng ① — Giao Diện Component

**Kết luận:** render của list page khớp khá sát với ASCII trong `customer_order_list.md`. Hai khoảng trống thực sự:
overlay `OrderDetailSheet` phong phú hơn nhiều so với mục one-line trong bảng Zones, và `DishRow` của overlay
không render nhân/topping/ghi chú.

| Component / Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Card đơn hàng | "Bàn 03 #BC-0042 [preparing] 105.000đ ▸" + progress + "3/6 phần đã ra" + thời gian + preview món | Khớp: name/order_number/`StatusBadge`/total/chevron, progress bar chỉ khi active, "{served}/{total} phần đã ra" + `timeAgo`, preview tên món với "+N món" (`order/page.tsx:104-144`) | 🟢 | — |
| Nút "Xoá lịch sử" | vẽ trong ASCII header vô điều kiện | chỉ render khi `orders.length > 0` (`order/page.tsx:63-71`) | 🟢 | ghi chú tuỳ chọn trong tài liệu |
| Trạng thái rỗng | "🛍 Chưa có đơn hàng nào / Quét mã QR…" | icon `ShoppingBag` + cùng hai dòng chữ (`order/page.tsx:75-87`) | 🟢 | — |
| Progress bar | "chỉ hiện khi status ∉ {delivered, cancelled}" | cổng `isActive` tại `order/page.tsx:95,118` | 🟢 | — |
| Overlay chi tiết (bảng Zones) | một dòng: "`OrderDetailSheet` · slide-up detail · `GET /orders/:id`" | Overlay render **ba card** (chi tiết món thu gọn được với nhóm combo + nút Huỷ từng món; bảng tổng đầy đủ Tên/SL/Ra/Còn/Đơn giá/Tổng + Huỷ; bảng tổng tiền Đã dùng/Còn lại/Tổng cộng), banner completed, nút huỷ cả đơn, nút thêm món, và **hai modal** (thông báo + xác nhận huỷ) (`OrderDetailSheet.tsx:170-508`) | 🟡 | Sửa tài liệu: mở rộng mô tả overlay / vẽ vào visual mockup |
| Nội dung `DishRow` | (chưa chỉ định) | chỉ render tên + ×qty + ×served + còn ×remaining + Huỷ (`OrderDetailSheet.tsx:510-544`) — **không bao giờ** có `toppings_snapshot` hay `note`, nên nhân và ghi chú món sau epic TOP vô hình với khách | 🟡 | Code: render `toppings_snapshot` (nhân) + `note` trong `DishRow`. ❓ UNVERIFIED liệu `name` sản phẩm đã mã hoá nhân chưa |

**Khớp đúng (đã xác nhận):** tiêu đề + icon header, border/layout card, component status badge, tính toán progress
(combo header bị lọc, `order/page.tsx:91-94`), nội dung chữ trạng thái rỗng.

---

## Mảng ③ — Luồng Cross-Page

**Kết luận:** mô hình hub `order_cache_*`, handoff submit-path, và ma trận durability đều chính xác và
được dẫn chính xác. Các Flag A/B/C/E tái xác nhận. Một flag cũ (D) và hai lệch nhỏ.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Flag D — `filling` | OC-1 thêm `filling`; thiếu trong FE type = lệch | Bị xoá bởi migration `017_drop_order_item_filling.sql`; không còn trong DB, serializer (`order_handler.go:358-370`), FE type (`order.ts:15-27`) | 🔴 | Sửa tài liệu — xem tiêu đề #1 |
| Các field của `clearCart()` | xoá items, tableId, tableName, activeOrderId, paymentMethod, orderNote @ `cart.ts:89` | chính xác: `set({ items:[], tableId:null, tableName:null, activeOrderId:null, paymentMethod:null, orderNote:'' })` (`cart.ts:89`) | 🟢 | — |
| `partialize` | `(s)=>({orderNote, activeOrderId})` @ `cart.ts:153` | chính xác (`cart.ts:153`) | 🟢 | — |
| Cart persist version | "CART_CONFIG v3" / key `cart-config-v3` | chuỗi key vẫn là `cart-config-v3` (`storage-keys.ts:6`) nhưng persist `version: 5` với các bước migrate cho v<2…v<5 (`cart.ts:129-150`) | 🟡 | Sửa tài liệu: ghi chú version là 5, tên key giữ hậu tố v3 |
| Ghi cache của `TableConfirmModal` | `:37` | `localStorage.setItem(ORDER_CACHE+id, …)` tại `TableConfirmModal.tsx:37` | 🟢 | — |
| Ghi cache của `checkout/page.tsx` | `:64-70`, `:68` | không mở lại lần chạy này | ❓ UNVERIFIED | mở `checkout/page.tsx` để xác nhận |
| Dòng `STORAGE_KEYS.CART_CONFIG` | `storage-keys.ts:5` | thực tế là `storage-keys.ts:6` (`ORDER_CACHE` là `:3` ✅) | 🟢 | lệch số dòng |
| Handoff "Thêm món" | `setTableId`+`setActiveOrderId`+`push('/menu')` @ `OrderDetailSheet.tsx:405-409` | tại `:406-408` bên trong nút `:403-415` | 🟢 | lệch nhỏ |
| Flag A — `item_cancelled` chưa xử lý | chính xác | xác nhận `useOrderSSE.ts:83-123` (không có case) vs `order_service.go:642` | 🔴 (code) | sửa code — tiêu đề #2 |
| Flag B — `isNotFound` không được dùng | chính xác | xác nhận `OrderDetailSheet.tsx:45` vs `useOrderSSE.ts:159` | 🔴 (code) | sửa code — tiêu đề #3 |
| Flag C — card không làm mới | chính xác | xác nhận `order/page.tsx:37-39` chỉ chạy khi mount | 🔴 (code) | sửa code — tiêu đề #4 |
| Flag E — `clearAll` bỏ qua `setActiveOrderId` | chính xác | xác nhận `order/page.tsx:41-51` (không có `setActiveOrderId`) | 🟢 (tài liệu chính xác) | sửa code (ưu tiên thấp) |

**Khớp đúng (đã xác nhận):** `ORDER_CACHE='order_cache_'` (`storage-keys.ts:3`), hub ba-writer/hai-reader,
quét+sắp xếp `loadCachedOrders` (`order/page.tsx:10-24`), biểu thức `isActive` tương đương
(list `:95` / sheet `:134`), ma trận durability (items/tableId/tableName chỉ trong phiên qua partialize).

---

## Mảng ④ — Hành Vi Loading

**Kết luận:** hoàn toàn chính xác — mọi khẳng định về loading đều truy vết được đến code.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| List page không có isLoading/skeleton | quét localStorage đồng bộ, empty-flash 1 frame | không có `isLoading`, `useEffect([])` → `loadCachedOrders()` (`order/page.tsx:33-39`) | 🟢 | — |
| Overlay vẽ ngay từ cache | Phase A đọc cache trước SSE | `useOrderSSE.ts:33-38` | 🟢 | — |
| REST snapshot rồi SSE | Phase B `GET /orders/:id`, Phase C SSE | `useOrderSSE.ts:54-62` / `:64-143` | 🟢 | — |
| Cấu hình reconnect | tối đa 5, base 1 s, tối đa 30 s, banner sau 3 | `RECONNECT` (`useOrderSSE.ts:16-21`); backoff `:136-140`; banner `:134` | 🟢 | — |
| Spinner `order===null` | "Đang tải đơn hàng..." | `OrderDetailSheet.tsx:206-212` | 🟢 | — |
| Vị trí `ConnectionErrorBanner` | trên vùng cuộn | `OrderDetailSheet.tsx:202` | 🟢 | — |
| Class spinner `(shop)/loading.tsx` | `h-64` / `h-8 w-8` orange ring | không mở lại lần chạy này | ❓ UNVERIFIED | mở `(shop)/loading.tsx` |

---

## Mảng ⑤ — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** các dẫn chiếu handler / service / SSE **chính xác**. Lệch nằm ở (a) tập field của
serializer order-item so với FE type `OrderItem`, và (b) lệch ~13 dòng trên các dẫn chiếu route-group.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Handler `GET /orders/:id` | `orderH.Get` @ `order_handler.go:125` | chính xác (`order_handler.go:125`) | 🟢 | — |
| Swap callerID phía customer | Get `:128-130`, Cancel `:189-191`, CancelItem `:203-205` | tất cả chính xác | 🟢 | — |
| `GetOrder` / cổng ownership | `order_service.go:106-143` / `:116-120` | chính xác | 🟢 | — |
| `CancelOrder` + quy tắc 30 % | `:558-595` / `:582-588` | chính xác | 🟢 | — |
| `CancelOrderItem` + từ chối đã phục vụ | `:598-644` / `:630-632` | chính xác | 🟢 | — |
| Fan-out `publishOrderEvent` | `:806-819` / `:814-818` | chính xác | 🟢 | — |
| `StreamOrder` + không kiểm tra ownership (Flag #4) | `sse/handler.go:21-70`, heartbeat `:14`, auth `:20` | chính xác; xác nhận không có kiểm tra `table_id` | 🟢 | — |
| Route group + authMW | `main.go:230-239`, `orderR.Use(authMW)` @ `:231` | group tại `main.go:243`, authMW `:244` (block `:243-259`) — lệch ~13 dòng | 🟡 | Sửa tài liệu: `:243-259` / authMW `:244` |
| Dòng `DELETE /orders/items/:id` | `main.go:251` | thực tế là `main.go:264`; `:251` là `DELETE /orders/:id` (Cancel) | 🟡 | Sửa tài liệu: `:264` |
| `OrderItem.flagged` phía FE | field của FE type | khai báo `flagged: boolean` (`order.ts:27`) nhưng serializer **không** emit `flagged` (`order_handler.go:358-370`) — luôn là `undefined` lúc chạy | 🟡 | đồng bộ: bỏ field FE hoặc emit phía BE |
| Extras của serializer | (không có trong FE types) | emit `item_status` (`:367`) + `created_by` (`:384`), không field nào trong `OrderItem`/`Order` FE | 🟡 | tài liệu hoặc loại bỏ; FE bỏ qua cả hai |

**Khớp đúng (đã xác nhận):** tất cả bốn endpoint + mô hình auth + caching ("không có Redis read-cache, chỉ
pub/sub fan-out") + hành vi lỗi (mapping 404/403/422) như mô tả trong `_be.md`.

---

## Danh Sách Việc Cần Làm (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Sửa tài liệu | Viết lại Flag D — `filling` bị xoá bởi migration 017; nhân nay nằm trong `toppings_snapshot` (epic TOP). Tương tự trong narrative OC-4 của `CLAUDE.md` gốc. | `customer_order_list_crosspage_dataflow.md` §11; `CLAUDE.md` |
| 2 | 🔴 Lỗi code | Thêm case `item_cancelled` vào switch của `useOrderSSE` (xoá món live) | `fe/src/hooks/useOrderSSE.ts:83-123` |
| 3 | 🔴 Lỗi code | Đọc `isNotFound` trong `OrderDetailSheet` — hiện trạng thái "không tìm thấy đơn" thay vì spinner vô tận | `fe/src/features/order/components/OrderDetailSheet.tsx:45` |
| 4 | 🔴 Lỗi code | Quét lại `loadCachedOrders()` khi overlay đóng để card phản ánh cập nhật SSE | `fe/src/app/(shop)/order/page.tsx:37-51` |
| 5 | 🟡 Thiếu trong code | Render `toppings_snapshot` (nhân) + `note` trong `DishRow` để khách thấy được những gì họ đã đặt | `fe/src/features/order/components/OrderDetailSheet.tsx:510-544` |
| 6 | 🟡 Sửa tài liệu | Sửa dẫn chiếu route: group `main.go:243-259`, authMW `:244`, `DELETE /orders/items/:id` `:264` | `customer_order_list_be.md` |
| 7 | 🟡 Sửa tài liệu | Ghi chú cart persist `version: 5` (tên key giữ hậu tố `cart-config-v3`); sửa dòng `CART_CONFIG` thành `storage-keys.ts:6` | `customer_order_list_crosspage_dataflow.md` §2 |
| 8 | 🟡 Code/contract | Đồng bộ `OrderItem.flagged` (FE khai báo, BE không emit) + `item_status`/`created_by` chỉ ở BE | `fe/src/types/order.ts`; `order_handler.go:358-388` |
| 9 | 🟢 Sửa tài liệu | `clearAll` cũng nên gọi `setActiveOrderId(null)` (Flag E) — ưu tiên thấp | `fe/src/app/(shop)/order/page.tsx:41-51` |

> **Ghi chú `CLAUDE.md`:** các sửa tài liệu (#1, #6, #7) là một task ALIGN. **Mỗi thay đổi code (#2–#5,
> #8, #9) phải được đăng ký thành một dòng trong `docs/tasks/MASTER_TASK.md` trước khi chạm vào bất kỳ
> file nào** — cuộc kiểm tra này chỉ đọc và không khởi động chúng.
