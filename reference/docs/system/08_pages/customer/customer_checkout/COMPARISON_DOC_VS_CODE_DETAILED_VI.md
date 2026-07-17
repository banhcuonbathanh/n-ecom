# Checkout `/checkout` — So Sánh Chi Tiết Tài Liệu vs. Code

> **Phạm vi:** rà soát sâu bộ tài liệu trang `/checkout` so với code FE/BE thực tế đang chạy trên
> nhánh `experience_claude.md_system_1_test_iphon2_change_code`. Các trục được kiểm tra: **(1) giao diện
> component · (3) luồng dữ liệu cross-page · (4) hành vi loading/error · (5) mô hình dữ liệu FE⇄BE.**
> Mảng 2 (cross-component) **không áp dụng** — trang là một `page.tsx` đơn đọc `useCartStore` trực tiếp,
> không có đồ thị component nội bộ và không có `_crosscomponent_dataflow.md`.
>
> **Chỉ đọc — KHÔNG sửa code hoặc tài liệu.** Thực hiện bởi 3 sub-agent Sonnet chạy song song (Mảng
> 3/4/5); Mảng 1 + mọi mục 🔴 đã được **tự tay kiểm chứng lại** bởi Opus orchestrator (grep +
> `file:line` trích dẫn inline). **Code thắng:** mọi ô "Code thực tế" đều được truy vết từ nguồn, không
> dựa vào trí nhớ.
>
> Ngày: 2026-06-23 (chạy lại — cùng branch; cả 3 🔴 đã được kiểm chứng lại bằng tay trên source
> thật và **không thay đổi**: footer collision `checkout/page.tsx:203` + `ClientBottomNav.tsx:48` +
> `(shop)/layout.tsx:12`; `payment_method` 0 hit grep trong handler/service; `ErrTableHasActiveOrder`
> chỉ 1 hit grep = định nghĩa `errors.go:30`. Code không đổi từ lần chạy 2026-06-22.)

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Giao diện component | Phần lớn trung thực; **một lỗi va chạm footer chưa được ghi** + lệch bố cục payment-zone | 1 | 1 | 1 |
| 3 — Luồng cross-page | **Trung thực** — mọi field persist, cache key, route handoff đều khớp | 0 | 2 | 1 |
| 4 — Loading / error | **Trung thực** — các lỗi được xác nhận lại, trích dẫn trong phạm vi ±1 dòng | 0 | 1 | 2 |
| 5 — Mô hình FE⇄BE | **Trung thực kể cả các lỗi** — 2 lỗi code đã được ghi lại, xác nhận lại | 2 | 1 | 2 |
| **Tổng** | **Lệch ít, bộ tài liệu trung thực với nguồn; các 🔴 là lỗi code, không phải tài liệu sai** | **3** | **5** | **6** |

**Kết luận một dòng:** bộ tài liệu checkout là gương phản chiếu độ chính xác cao của code — nó ghi lại
code *kể cả* các lỗi (ngang hàng với `customer_combo_detail` / `customer_order_detail` / `admin_combos`).
Mâu thuẫn **tài liệu-vs-code** duy nhất là wireframe vẽ submit bar và bottom-nav xếp chồng gọn gàng
trong khi thực tế chúng **va chạm nhau** (🔴 #1, chưa từng được ghi lại). Hai 🔴 còn lại là lỗi code
thật mà tài liệu đã gắn cờ.

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng)

1. **🔴 Va chạm footer — submit bar bị che bởi `ClientBottomNav` (MỚI · lỗi code chưa được ghi +
   lệch tài liệu).** Submit bar cố định là `fixed bottom-0 left-0 right-0` **không có z-index**
   (`checkout/page.tsx:203`). Shell khách hàng dùng chung render `ClientBottomNav` là **sibling sau**
   (`(shop)/layout.tsx:12`), và nav đó là `fixed bottom-0 left-0 right-0 z-20`
   (`ClientBottomNav.tsx:48`). Cả hai đều chiếm `bottom: 0`; với `z-20` > `z-auto` **và** thứ tự DOM
   sau, nav vẽ đè lên **CTA chính "Đặt hàng · {total}"** — điều khiển quan trọng nhất trên trang.
   Wireframe (`customer_checkout.md:43-45`) vẽ chúng như hai thanh xếp chồng gọn gàng, nên tài liệu
   cũng sai ở đây. **Đây đúng là cùng class** với 🔴 của `customer_product_detail` và
   `customer_favourites` (xem Cross-Page Concerns trong `COMPARISON_TRACKER.md`). Cả
   `customer_checkout.md` lẫn `CHECKOUT_BUGS.md` đều không đề cập. **Tại sao quan trọng:** người dùng
   có thể không thể bấm "Đặt hàng" — lỗi hiển thị chặn checkout. *Sửa:* đẩy thanh lên trên nav ~72px
   (`bottom-[calc(72px+env(safe-area-inset-bottom))]`) hoặc đặt `z-30`.

2. **🔴 `payment_method` được thu thập nhưng không bao giờ gửi — radio trang trí (lỗi code · tài liệu
   đã ghi, xác nhận lại).** Nhóm radio ghi lựa chọn vào `cart.setPaymentMethod` (`page.tsx:47`) và
   Zod validate `z.enum(['vnpay','momo','zalopay','cash'])` (`page.tsx:19`), nhưng field **vắng mặt
   trong payload POST** (`page.tsx:49-56`) và **không có cột `orders.payment_method`** — grep
   `payment_method` trong `order_handler.go` + `order_service.go` trả về **không kết quả**. Chọn
   VNPay/MoMo/ZaloPay không khác gì Cash; phương thức thanh toán được thu thập sau ở quầy thu ngân
   (S5). Radio hoàn toàn là trang trí. *Tài liệu:* `customer_checkout.md` Flag 1 +
   `customer_checkout_be.md` Flag 1 + `CHECKOUT_BUGS.md` Bug 1 — tất cả đều chính xác. *Tại sao quan
   trọng:* khách chọn "VNPay" với kỳ vọng thanh toán online bị âm thầm chuyển sang thanh toán tiền mặt
   khi nhận hàng.

3. **🔴 Nhánh `TABLE_HAS_ACTIVE_ORDER` chết + `table_busy` không được đọc → tạo đơn trùng âm thầm
   (lỗi code · tài liệu đã ghi, xác nhận lại).** `ErrTableHasActiveOrder` (`errors.go:30`) là **lần
   xuất hiện duy nhất** của symbol đó trong toàn bộ `be/` (grep) — nó **không bao giờ được return**.
   `CreateOrder` xử lý bàn bận như thông tin tham khảo: set `tableBusy = true`
   (`order_service.go:270-275`) và **vẫn tạo đơn song song**, trả về `201 {data:{id, table_busy}}`
   (`order_handler.go:121`). Vậy nhánh `onError` của FE kiểm tra `error === 'TABLE_HAS_ACTIVE_ORDER'`
   (`page.tsx:79-84`) không thể chạm tới, **và** `onSuccess` không bao giờ đọc `table_busy` từ body
   201 (`page.tsx:61-76`). Kết quả: checkout âm thầm tạo **đơn trùng không có thông báo** — khác với
   menu `TableConfirmModal` ít nhất còn toast khi `table_busy`. *Tài liệu:* `customer_checkout.md`
   Flag 2 + `_be.md` Flag 2 + `CHECKOUT_BUGS.md` Bug 2 — tất cả đều chính xác.

> Lưu ý — **`customer_introduction`** được yêu cầu trong cùng lô nhưng **DỪNG, không tập nào được
> viết**: nó là 🔮 PLANNED không có `page.tsx`/route/`features/introduction/` (xác nhận bằng
> `find`+`grep`), nên so sánh sẽ là suy đoán. Ghi lại ở đây để tra cứu nguồn gốc.

---

## Code Chết / Không Thể Chạm Tới

- **`ErrTableHasActiveOrder`** (`be/internal/service/errors.go:30`) — được định nghĩa, **không được
  return ở đâu** trong `be/` (grep: chỉ một kết quả duy nhất = định nghĩa). Sentinel hoàn toàn chết.
- **Nhánh `onError` `TABLE_HAS_ACTIVE_ORDER`** (`checkout/page.tsx:79-84`) — code FE viết đúng nhưng
  không thể chạm tới vì BE không bao giờ phát ra code đó.
- **Lời gọi `cart.setPaymentMethod(form.payment_method)`** (`checkout/page.tsx:47`) — một **ghi chết**:
  giá trị bị xóa bởi `clearCart()` khi thành công (`cart.ts:89`), **không** có trong `partialize`
  (`cart.ts:153`), và **không bao giờ được đọc lại** từ store bởi bất kỳ page/hook nào. Phương thức
  thanh toán quan trọng cũng không bao giờ đến được BE (xem 🔴 #2).

---

## Mảng 1 — Giao Diện Component

**Kết luận:** wireframe khớp với render từng zone-for-zone **ngoại trừ** footer (🔴 #1) và thứ tự
tùy chọn/bố cục payment-method zone (🟡).

| Component / Zone | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Submit bar vs bottom-nav | Wireframe vẽ `[ Đặt hàng · 80.000đ ]` rồi `ClientBottomNav` như hai thanh xếp chồng gọn gàng (`customer_checkout.md:43-45`) | Submit bar `fixed bottom-0 … ` **không có z-index** (`page.tsx:203`); shell nav `fixed bottom-0 … z-20` là sibling sau (`ClientBottomNav.tsx:48`, `(shop)/layout.tsx:12`) → nav đè lên CTA | 🔴 | Đẩy bar lên `bottom-[calc(72px+env(safe-area-inset-bottom))]` hoặc `z-30`; vẽ lại wireframe để thể hiện việc sửa chồng lấn |
| Payment method zone | ASCII vẽ **grid 2×2**, Cash đầu tiên: `(•) 💵 Tiền mặt COD  ( ) 💳 VNPay / ( ) 📱 MoMo  ( ) 🏦 ZaloPay` (`customer_checkout.md:40-41`) | Danh sách dọc một cột (`space-y-3`, một `<label>` mỗi hàng, `page.tsx:184-194`); thứ tự tùy chọn là **VNPay, MoMo, ZaloPay, Cash** (`PAYMENT_OPTIONS`, `page.tsx:24-29`) — Cash đứng **cuối** dù là mặc định (`page.tsx:42`) | 🟡 | Vẽ lại thành danh sách dọc; sửa thứ tự tùy chọn để khớp với code |
| Sticky header | `[← Quay lại]  Xác Nhận Đơn Hàng` (`customer_checkout.md:25`) | `← Quay lại` + `Xác Nhận Đơn Hàng`, `sticky top-0 z-10` (`page.tsx:96-104`) | 🟢 | Khớp |
| Order summary card | `ĐƠN HÀNG CỦA BẠN` + `Nx name … price`, `+ toppings`, `Tổng cộng` (`customer_checkout.md:27-32`) | `Đơn hàng của bạn` (viết hoa qua CSS) + `{qty}x {name}`, `+ toppings.join(', ')`, `Tổng cộng` (`page.tsx:108-133`) | 🟢 | Khớp |
| Contact card | `THÔNG TIN LIÊN HỆ` — Họ tên / Số điện thoại / Ghi chú (`customer_checkout.md:34-37`) | RHF inputs `customer_name`/`customer_phone`/`note` (`page.tsx:141-177`) | 🟢 | Khớp |

**Khớp đúng đã xác nhận:** header, order summary, contact card render đúng như bản vẽ.

---

## Mảng 3 — Luồng Cross-Page

**Kết luận:** **trung thực** — mọi `file:line` trong `customer_checkout_crosspage_dataflow.md` đều trỏ
đúng dòng hiện tại. Không có mâu thuẫn.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Ghi store `setPaymentMethod` | được ghi rồi bị xóa, "không đọc lại cross-page" | `page.tsx:47` ghi; `clearCart` xóa (`cart.ts:89`); không có trong `partialize` (`cart.ts:153`); **không bao giờ đọc lại** — một ghi chết | 🟡 | Tài liệu chính xác nhưng nói nhẹ; có thể ghi chú là ghi vô nghĩa |
| Key `CART_CONFIG` vs persist version | key literal `'cart-config-v3'` (`storage-keys.ts:6`) | `storage-keys.ts:6` = `'cart-config-v3'`, nhưng `cart.ts:129` `version: 5` — hậu tố `-v3` đóng băng, vô hại (Zustand migrate trên số nguyên) | 🟡 | Một dòng ghi chú trong tài liệu; không phải lỗi code |
| Guard giỏ trống | `useEffect` → `router.replace('/menu')` | `page.tsx:36-38` chính xác (+ early-return đồng bộ `:92`) | 🟢 | Khớp |
| Ghi `ORDER_CACHE` | `order_cache_<id>` localStorage trong `onSuccess` | `STORAGE_KEYS.ORDER_CACHE='order_cache_'` (`storage-keys.ts:3`), ghi tại `page.tsx:68` | 🟢 | Khớp |
| `clearCart` → `router.replace('/order/:id')` | cả hai khi thành công | `page.tsx:73,75` | 🟢 | Khớp |
| Whitelist `partialize` | chỉ `orderNote` + `activeOrderId` persist; `items`/`tableId`/`tableName`/`paymentMethod` chỉ trong phiên | `cart.ts:153` chính xác | 🟢 | Khớp |
| Suy ra `source` | `cart.tableId ? 'qr' : 'online'` | `page.tsx:54` | 🟢 | Khớp |
| Builder duy nhất `buildOrderItemsPayload` | dùng chung bởi menu/combo/checkout | `order-payload.ts:27`, import tại `page.tsx:13,55`; comment `order-payload.ts:16-18` xác nhận | 🟢 | Khớp |

**Khớp đúng đã xác nhận:** tất cả 10 điểm kiểm tra đều pin đúng dòng; không có trích dẫn lỗi thời trong tài liệu này.

---

## Mảng 4 — Hành Vi Loading / Error

**Kết luận:** **trung thực** — không có skeleton load ban đầu (không có `useQuery`; cart là Zustand đồng
bộ); tất cả 3 lỗi đã ghi được xác nhận lại; chỉ lệch trích dẫn ±1 dòng.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Lỗi 3 — online order 403 khi re-fetch | `source:'online'` ⇒ `table_id NULL` ⇒ `GetOrder` customer guard 403 re-fetch sau khi tạo | `order_service.go:116-119` `if callerRole=="customer" { if !o.TableID.Valid \|\| … != callerID { return ErrForbidden }}`; NULL table set tại `order_service.go:301-304`; lỗi re-fetch bị nuốt `page.tsx:69-71` — **tiềm ẩn** (chưa có entry online được nối dây) | 🟡 | Đóng lại khi online-ordering ra mắt; gán quyền sở hữu theo claim tài khoản khách hàng, không phải `TableID` |
| Không có skeleton ban đầu | trang không có `useQuery`; cart từ Zustand đồng bộ | `page.tsx:7` chỉ import `useMutation`; không có `useQuery` trong file | 🟢 | Khớp |
| Fast path giỏ trống | `return null` + redirect `useEffect` | `page.tsx:92` + `:36-38` | 🟢 | Khớp |
| Trạng thái submit pending | disabled + "Đang đặt hàng..." | `page.tsx:207-212` | 🟢 | Khớp |
| onSuccess GET try/catch fallback | cache đơn đầy đủ, fallback về body tối giản | `page.tsx:61-75` | 🟢 | Khớp |
| Toast onError | `toast.error(message ?? 'Đặt hàng thất bại')` | `page.tsx:86` | 🟢 | Khớp |
| Trích dẫn lệch ±1 | `page.tsx:79-83`; `order_service.go:116-120` | thực tế `:79-84` và `:115-120` | 🟢 | Cập nhật trích dẫn ±1 |

**Xác nhận lại các lỗi:** Lỗi 1 (payment_method) **còn đúng**; Lỗi 2 (nhánh chết) **còn đúng**; Lỗi 3
(online 403) **còn đúng, tiềm ẩn**.

---

## Mảng 5 — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** **trung thực kể cả các lỗi.** Mọi binding tag, quy tắc auth, nhánh service, hình dạng
response, và hai điểm tìm thấy dead-code đều khớp nguồn. Chỉ số dòng route trong `main.go` là lỗi thời.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| `payment_method` không bao giờ gửi | radio trang trí; không có cột; không có trong body | `page.tsx:49-56` payload bỏ qua; `order_handler.go:59-66` struct không có field; grep `payment_method` trong handler+service = 0 kết quả | 🔴 | Bỏ tùy chọn non-cash hoặc gắn nhãn "sắp có" cho đến khi BE thanh toán online tồn tại (lỗi code, cần row trong MASTER) |
| `TABLE_HAS_ACTIVE_ORDER` chết + dup âm thầm | sentinel không được return; bàn bận → đơn song song + 201 | `errors.go:30` kết quả duy nhất (grep); `order_service.go:270-275` thông tin tham khảo; `order_handler.go:121` `201 {id,table_busy}`; FE `page.tsx:79-84` chết, `table_busy` không đọc trong `onSuccess` | 🔴 | Xóa nhánh chết FE; đọc `data.table_busy` trong `onSuccess` để toast (lỗi code, cần row trong MASTER) |
| name/phone/note không validate phía server | handler bind không có rules; regex chỉ ở FE | `order_handler.go:62-64` không có tag `binding:`; FE regex `page.tsx:16-17` | 🟡 | Thêm validation phía server nếu non-browser client quan trọng |
| 2 endpoint, cả hai dùng authMW | `POST /orders` + `GET /orders/:id` dưới `orderR.Use(authMW)` | `main.go:243-249` (group `:243`, `authMW :244`, `POST "" :245`, `GET /:id :249`) | 🟢 | tài liệu trích dẫn `:230-237` — lỗi thời, cần cập nhật |
| Quy tắc `created_by` | customer → trống → NULL; staff → được lưu | `order_handler.go:88-92` | 🟢 | Khớp |
| Binding `source` | `required,oneof=online qr pos`; items `required,min=1` | `order_handler.go:61,65` | 🟢 | Khớp |
| Guard XOR mỗi item | đúng một trong product_id/combo_id | `order_handler.go:77-86` | 🟢 | Khớp |
| Combo header `unit_price=0` | OC epic | `order_service.go:402-411` (tài liệu trích dẫn `:398-412`, lệch ~4) | 🟢 | Cập nhật trích dẫn |
| Guard quyền sở hữu GetOrder | customer caller `callerID=claims.TableID`, enforce `o.TableID==callerID` | `order_handler.go:128-129` + `order_service.go:116-119` | 🟢 | Khớp |
| Không có Redis read-cache | chỉ fan-out pub/sub | `CreateOrder`/`GetOrder` thẳng tới MySQL; chỉ `publish*` tới Redis | 🟢 | Khớp |
| Xử lý `sql.ErrNoRows` | mapping 404 | `order_service.go:109` dùng `errors.Is(err, sql.ErrNoRows)` — **không** dùng `==` bẫy 404→500 như đã thấy ở admin_ingredients | 🟢 | Khớp (tốt) |

**Khớp đúng đã xác nhận:** endpoints, authMW, `created_by`, mọi binding tag, guard XOR, logic thông
tin tableBusy, hình dạng 201, guard quyền sở hữu, không đọc Redis, combo header unit_price=0.

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code | Đẩy submit bar lên trên nav 72px (`bottom-[calc(72px+env(safe-area-inset-bottom))]`) hoặc `z-30` để CTA "Đặt hàng" không bị đè | `fe/src/app/(shop)/checkout/page.tsx:203` |
| 2 | 🔴 Lỗi code | Dừng việc gửi payment method vô nghĩa: ẩn tùy chọn non-cash (hoặc gắn nhãn "sắp có") cho đến khi BE thanh toán online tồn tại; xóa ghi `cart.setPaymentMethod` chết | `checkout/page.tsx:24-29,47,184-194` |
| 3 | 🔴 Lỗi code | Xóa nhánh `onError` `TABLE_HAS_ACTIVE_ORDER` không thể chạm tới; đọc `data.table_busy` trong `onSuccess` và toast cho khách hàng (ngang bằng với menu `TableConfirmModal`) | `checkout/page.tsx:61-84` |
| 4 | 🔴 Sửa tài liệu | Vẽ lại footer wireframe để thể hiện đúng mối quan hệ submit-bar/nav (và cách sửa) | `customer_checkout.md:43-45` |
| 5 | 🟡 Sửa tài liệu | Vẽ lại payment zone thành danh sách dọc với thứ tự tùy chọn thực tế (VNPay, MoMo, ZaloPay, Cash) | `customer_checkout.md:40-41` |
| 6 | 🟡 Sửa tài liệu | Cập nhật số dòng route `main.go` lỗi thời `:230-237 → :243-249`; combo header `:398-412 → :402-411`; trích dẫn lệch ±1 `page.tsx:79-83→:79-84`, `order_service.go:116-120→:115-120` | `customer_checkout_be.md`, `CHECKOUT_BUGS.md` |
| 7 | 🟡 Code (tiềm ẩn) | Khi online-ordering ra mắt, sửa 403 table_id-null bằng cách gắn quyền sở hữu `GetOrder` với claim tài khoản khách hàng | `order_service.go:116-119` |
| 8 | 🟢 Sửa tài liệu | Ghi chú về `CART_CONFIG='cart-config-v3'` vs persist `version: 5` vô hại; cập nhật provenance branch trong header `_be.md` | `_crosspage_dataflow.md`, `customer_checkout_be.md` |

> **Ghi chú `CLAUDE.md`:** sửa tài liệu (#4-6, #8) là một task ALIGNED. Mỗi thay đổi **code** (#1-3,
> #7) phải được đăng ký vào `docs/tasks/MASTER_TASK.md` trước khi chạm vào bất kỳ file nào — audit này
> chỉ phát hiện lệch lạc, không sửa chúng.
