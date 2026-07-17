# So Sánh — Tài Liệu vs. Code · `staff_cashier_payment` (`/cashier/payment/:id`)

> **Phạm vi:** rà soát toàn bộ bộ tài liệu `staff_cashier_payment/` so với code đang chạy trên nhánh
> hiện tại, trên 4 trục áp dụng — ① giao diện component, ③ luồng dữ liệu cross-page, ④ hành vi loading,
> ⑤ mô hình dữ liệu FE⇄BE. **Khu vực 2 (luồng cross-component) không áp dụng** — trang này không sở hữu
> Zustand store dùng chung; toàn bộ client state là `useState` cục bộ (`method`, `payment`) + TanStack
> `['order', id]` + một lần đọc `useAuthStore` (chỉ `accessToken`). Không có file `_crosscomponent_dataflow.md`.
> **Chỉ đọc — KHÔNG sửa code hoặc bộ tài liệu trang.** Mọi khẳng định BE/FE được truy vết lại từ nguồn
> (1 file FE + 6 file Go) bởi Opus orchestrator inline (trang đơn file; không cần fan-out audit); mọi 🔴
> đã được **tự tay kiểm chứng lại**. Ngày: 2026-06-22.
>
> **Kết luận một dòng:** đây là một **bộ tài liệu độ chính xác cao, trung thực với nguồn** — nó ghi lại
> code *kể cả các lỗi của nó* (ngang hàng với `customer_checkout` / `customer_combo_detail` / `admin_combos`).
> **Không có mâu thuẫn tài liệu-vs-code**: mọi lệch lạc đều là (a) tài liệu *đúng khi* gắn cờ lỗi code thật,
> hoặc (b) số dòng `main.go` lỗi thời + tên nhánh provenance cũ. Hai 🔴 bên dưới là
> **lỗi code mà tài liệu đã ghi lại**, được nêu lên ở đây vì chúng phá vỡ thanh toán với mọi phương thức.

---

## Tóm Tắt Điều Hành

| Khu vực | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Giao diện component (`staff_cashier_payment.md` ASCII + Zones) | ✅ Chính xác — wireframe được vẽ rõ ràng "đúng như code tồn tại" kể cả ghi chú dead-state | 0 | 1 | 3 |
| ③ Luồng cross-page (`_crosspage_dataflow.md`) | ✅ Chính xác — write-and-close, fan-out `orders:kds`, ma trận F5 đều đúng; 3 `❓ UNVERIFIED` thành thật | 0 | 1 | 1 |
| ④ Loading (`_loading.md`) | ✅ Chính xác — guard, không có `loading.tsx`, guard `isLoading\|\|!order`, trạng thái tương tác đều khớp | 0 | 2 | 1 |
| ⑤ Mô hình dữ liệu FE⇄BE (`_be.md` + Object Model) | ✅ Chính xác — lệch FE `Payment` vs response mỏng từ BE CHÍNH LÀ phát hiện trung tâm của tài liệu, được ghi đúng | 2 | 2 | 2 |
| **Tổng** | **Trung thực với nguồn; không có mâu thuẫn** | **2** | **6** | **7** |

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng)

> Cả hai đều là **lỗi code mà tài liệu đã ghi lại** ([PAYMENT_BUGS.md](PAYMENT_BUGS.md) Bug 1 + Bug 2,
> `_be.md` Flags 1-2). Chúng **không phải lỗi tài liệu** — được nêu lên vì cộng lại chúng có nghĩa là
> **thanh toán không thể hoàn thành từ màn hình này với bất kỳ phương thức nào.** Đã kiểm chứng lại từng
> dòng bên dưới.

### 🔴 #1 — Response `POST /payments` thiếu `status`/`amount`/`method` → màn hình trắng sau khi tạo (Bug 2)

- **Thực tế code (đã tự kiểm chứng):** handler chỉ trả về `{data:{id, pay_url, qr_code_url}}` —
  [`payment_handler.go:44-48`](../../../../be/internal/handler/payment_handler.go#L44). FE
  interface `Payment` mong đợi `status`/`amount`/`method`
  ([`page.tsx:16-23`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L16)) và
  `setPayment(data)` lưu object mỏng đó ([`page.tsx:114-115`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L114)).
  Với `payment.status === undefined`: nhánh cash success `data.status === 'completed'`
  ([`page.tsx:116`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L116)) không bao giờ kích hoạt;
  WS effect return sớm tại `payment.status !== 'pending'`
  ([`page.tsx:64`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L64)) nên socket
  không bao giờ mở; guard render QR `payment.status === 'pending' && payment.qr_code_url`
  ([`page.tsx:249`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L249)) là false.
  **Kết quả: với mọi phương thức, picker biến mất và không có gì thay thế nó** (`else null`, `page.tsx:280`).
- **Tại sao quan trọng:** mọi thanh toán qua gateway (VNPay/MoMo/ZaloPay) — không có QR, không có WS, không có auto-print/redirect.
- **Con đường sửa mà code đã lộ sẵn:** `GET /payments/:id` ([`main.go:270`](../../../../be/cmd/server/main.go#L270))
  trả về `db.Payment` đầy đủ ([`payment_handler.go:52-59`](../../../../be/internal/handler/payment_handler.go#L52)) — mở rộng response tạo (BE) hoặc re-fetch sau khi tạo (FE).

### 🔴 #2 — Nút cash gửi `method:'cod'`; BE binding yêu cầu `'cash'` → 400 với phương thức mặc định (Bug 1)

- **Thực tế code (đã tự kiểm chứng):** FE `PaymentMethod = 'vnpay'|'momo'|'zalopay'|'cod'`, mặc định `'cod'`
  ([`page.tsx:14,52`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L14)); mutation
  post `{order_id, method:'cod'}` ([`page.tsx:111-113`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L111)).
  BE binding là `oneof=vnpay momo zalopay cash` —
  [`payment_handler.go:25`](../../../../be/internal/handler/payment_handler.go#L25); `cod` ∉ tập hợp →
  `ShouldBindJSON` thất bại → `400 INVALID_INPUT` ([`payment_handler.go:31-34`](../../../../be/internal/handler/payment_handler.go#L31)).
  DB enum cũng là `cash` (`db.PaymentsMethodCash`, được dùng tại `payment_service.go:81,98`).
- **Tại sao quan trọng:** cash là phương thức **mặc định + được dùng nhiều nhất** → trang trả 400 ngay lần
  nhấn đầu tiên của thu ngân với hầu hết đơn hàng; toast chung "Không thể tạo thanh toán" không gợi ý gì.
- **Sửa:** một dòng FE — `'cod'` → `'cash'` trong type, giá trị mặc định, và key `METHOD_LABELS`
  (giữ nguyên nhãn "Tiền mặt"). Không cần sửa BE.

---

## Component Chết / Không Thể Chạm Tới

- **Khối QR-pending** (`page.tsx:249-279`) — không thể chạm tới hiện nay: guard render `payment.status === 'pending'`
  không bao giờ true vì response tạo thiếu `status` (🔴 #1). Bao gồm QR `<img>`, text
  "⏳ Đang chờ thanh toán...", **và** input upload proof.
- **WS listener** (`page.tsx:63-108`) — không bao giờ kết nối: effect return sớm tại `payment.status !== 'pending'`
  (`page.tsx:64`), cùng nguyên nhân gốc với 🔴 #1.
- **Mutation proof-upload** (`page.tsx:125-135`) — chết kép: (a) `PATCH /payments/:id/proof` **không có
  route, handler, service, query hay column** nào trong `be/` (grep `proof` → 0 kết quả non-test;
  payments group chỉ expose `POST ""`, `GET "/:id"`, 3 webhook — `main.go:267-275`) → 404; (b) input
  nằm trong khối QR không thể chạm tới. Tài liệu đánh giá đây là Bug 3 / 🟡 (bị chặn bởi Bug 2).
- **Pending UI `uploadProof.isPending`** (`page.tsx:275-277`) — nằm trong khối QR chết → không bao giờ hiển thị.

---

## Khu vực ① — Giao Diện Component

**Kết luận:** ✅ Chính xác. ASCII trong `staff_cashier_payment.md` được vẽ rõ ràng "đúng như các zone TỒN TẠI
trong code" (ghi chú header của nó) với State A / B / C và các ghi chú dead-state khớp với thực tế.

| Component / Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Nhãn picker phương thức "Tiền mặt" | nhãn "Tiền mặt", value `'cod'` | `METHOD_LABELS.cod = 'Tiền mặt'` nhưng BE muốn `'cash'` (`page.tsx:31`, `payment_handler.go:25`) — nhãn là dấu hiệu nhận biết Bug 1 | 🟡 | xử lý bởi 🔴 #2 (FE `cod`→`cash`) |
| Thứ tự/grid picker phương thức | 2×2: `[Tiền mặt][VNPay]` / `[MoMo][ZaloPay]` | `grid grid-cols-2` trên `Object.entries(METHOD_LABELS)` thứ tự cod,vnpay,momo,zalopay (`page.tsx:220-234`) — khớp | 🟢 | — |
| Khối QR State B được ghi chú "DEAD" | "⚠️ DEAD TODAY (Bug 2)" | đúng vậy — guard `page.tsx:249` không bao giờ true | 🟢 | — |
| Success State C được ghi chú "DEAD" | "⚠️ DEAD TODAY (Bug 2 prevents both triggers)" | nhánh cash `page.tsx:116` + WS `page.tsx:88-92` đều chết | 🟢 | — |
| Các field card hóa đơn | Đơn#/Bàn/Khách/items/Tổng cộng + "Phương thức" có điều kiện | `page.tsx:166-213`; hàng `table_id` có điều kiện (`:177`), `customer_name` ẩn nếu `'Khách tại quán'` (`:183`), hàng "Phương thức" chỉ hiện `if payment` (`:205`) | 🟢 | — |

**Đã xác nhận khớp:** header (`← Quay lại` + `Thanh Toán Đơn #{order_number}`, `page.tsx:152-162`);
`.no-print` trên header/controls, receipt in được (`page.tsx:148`); logic nhãn nút xác nhận
(`page.tsx:242-246`).

---

## Khu vực ③ — Luồng Cross-Page

**Kết luận:** ✅ Chính xác. `_crosspage_dataflow.md` đúng khi xác định trang này là terminal *write-and-close*:
hai MySQL write (`payments` row + `orders.status → paid` qua `MarkOrderPaid`) và một Redis publish tới
`orders:kds`. Các ma trận F5/durability khớp với thực tế all-`useState`.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Kênh `payment_success` | publish tới `orders:kds` (dùng chung KDS/POS/admin floor) | `s.rdb.Publish(ctx, "orders:kds", …{"type":"payment_success",…})` (`payment_service.go:270-271`); `LiveHandler` + `KDSHandler` đều subscribe `orders:kds` (`websocket/handler.go:18,23`) | 🟢 | — (Flag 4 deployment-coupling, quyết định của owner) |
| POS / KDS / admin-floor xử lý `payment_success` | 3× `❓ UNVERIFIED` — "không truy vết được handler; có thể bị bỏ qua" | gắn cờ thành thật, không khẳng định; nhất quán với các nhánh WS chết đã ghi ở admin_overview | 🟡 | giải quyết `❓` trong lần chạy tương lai của staff_pos / staff_kds / admin_overview |
| Đường dẫn return-URL webhook | `/api/v1/payments/webhook/vnpay` | khớp route `v1.POST("/payments/webhook/vnpay", …)` (`main.go:273`) + builder `payment_service.go:103` | 🟢 | — |

**Đã xác nhận khớp:** gate state machine `ready OR delivered` (`order_service.go:50`); output `paid`
qua `MarkOrderPaid` (`order_service.go:86`); bảng reverse-flow huỷ/timeout; bất biến "không có
mũi tên browser→browser".

---

## Khu vực ④ — Hành Vi Loading

**Kết luận:** ✅ Chính xác. `_loading.md` truy vết đúng 4 lớp loading và việc các trạng thái "waiting"
QR/WS không thể chạm tới (Bug 2).

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Không có error state khi `GET /orders/:id` thất bại | guard `isLoading \|\| !order` → "Đang tải…" vĩnh viễn khi 404/lỗi mạng | đúng `page.tsx:137-143`; query không có nhánh `isError` (`page.tsx:56-60`) | 🟡 | FE — thêm nhánh error/retry (cũng là `_be.md` Flag 7) |
| Thiếu `orderId` → spinner kẹt | `enabled:!!orderId` → query không bao giờ kích hoạt → kẹt | `page.tsx:59`; `!order` vẫn true | 🟡 | FE — guard route không hợp lệ |
| Không có `loading.tsx` cấp route cho `cashier/` | không có trong `(dashboard)`/`cashier/`; `admin/` có, không kế thừa | đã xác nhận (không có `cashier/loading.tsx`) | 🟢 | — |

**Đã xác nhận khớp:** AuthGuard màn hình trắng (`AuthGuard.tsx:23`) → RoleGuard `minRole=CASHIER`
(`page.tsx:40`) → order query → trạng thái pending tương tác (nút tạo "Đang xử lý…" `page.tsx:242`,
WS backoff `min(1000*2**attempts,30_000)` `page.tsx:98`).

---

## Khu vực ⑤ — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** ✅ Chính xác, và đây là nơi tài liệu chứng tỏ giá trị — lệch giữa FE `Payment` interface và
response mỏng của `POST /payments` là phát hiện trung tâm, được ghi lại đúng (= 🔴 #1).

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Hình dạng response `POST /payments` | mỏng `{id, pay_url, qr_code_url}` — thiếu status/amount/method | `payment_handler.go:44-48` đã xác nhận | 🔴 | 🔴 #1 |
| FE `cod` vs BE `cash` | mismatch → 400 | `page.tsx:14` vs `payment_handler.go:25` đã xác nhận | 🔴 | 🔴 #2 |
| `PATCH /payments/:id/proof` có tồn tại không? | "route không tồn tại" | grep `proof` trong `be/` → 0 kết quả non-test; chỉ `POST ""`,`GET /:id`,3 webhook (`main.go:267-275`) | 🟡 | BE build hoặc FE gỡ bỏ (Bug 3, bị chặn bởi 🔴 #1) |
| Staff bypass quyền sở hữu `GET /orders/:id` | staff token đọc bất kỳ đơn nào; customer bị chặn bởi bàn | `order_handler.go:127-130` (staff `callerID=claims.Subject`); guard `order_service.go:116-120` | 🟢 | — |
| `completePayment` cho `ready` (không phải `delivered`) | lệch status — `MarkOrderPaid` chỉ `delivered→paid`, lỗi bị nuốt | `order_service.go:83-86` trả về lỗi; `payment_service.go:265-267` warn-swallows | 🟡 | BE (Flag 6) |
| Gate role WS `/ws/orders-live` | không có — `?token=` được parse rồi bỏ qua; bất kỳ JWT nào cũng subscribe được | `websocket/handler.go:31-47` (kết quả `ParseToken` bị `_`-discard tại `:40`) | 🟡 | BE — thêm role check (Flag 5, cross-page) |

**Đã xác nhận khớp:** idempotency `409 PAYMENT_ALREADY_EXISTS` cho payment đang tồn tại không phải `failed`
(`payment_service.go:71-75`); amount = `order.TotalAmount`, client không bao giờ gửi nó
(`payment_service.go:89`); 15 phút `expires_at` chỉ cho gateway (`:80-83`); gateway URL im lặng trống khi
build thất bại (`:108-110,122,133` — Flag 8); `GetPayment` trả về `db.Payment` đầy đủ (`payment_service.go:142-151`).

---

## Lệch Lạc Chỉ Trong Tài Liệu (provenance)

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức |
|---|---|---|---|
| `main.go` orders group | `:230-246`; `GET /:id` `:236` | group thực tế `:243-244`, `GET /:id` **`:249`** | 🟢 |
| `main.go` payments group | group/auth `:254-257`; `POST ""` `:256`; `GET /:id` `:257`; webhooks `:254-262` | thực tế `payR` `:267`, `.Use` `:268`, `POST ""` **`:269`**, `GET /:id` **`:270`**, webhooks `:273-275` | 🟢 |
| `main.go` WS group | `:337-339`; `/orders-live` `:339` | thực tế `wsR` `:350`, `/kds` `:351`, `/orders-live` **`:352`** | 🟢 |
| Phạm vi `completePayment` | `:252-273` | thực tế `:252-274` (lệch một) | 🟢 |
| Nhánh provenance | cả 5 file trích dẫn `experience_claude.md_system_1` | nhánh thực tế `experience_claude.md_system_1_test_iphon2_change_code` | 🟢 |

**Lưu ý (không có va chạm ở đây):** không giống `customer_checkout` / `customer_favourites` / `customer_product_detail`,
trang này nằm trong nhóm `(dashboard)`, **không phải** `(shop)` — **không có `ClientBottomNav`** và không có
footer `fixed bottom-0`; header + controls là `.no-print` inline. Pattern va chạm sticky-footer dùng chung
**không áp dụng** ở đây.

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code | Mở rộng response `POST /payments` để bao gồm `status`/`amount`/`method` (hoặc FE re-fetch `GET /payments/:id` sau khi tạo) — bỏ chặn QR + WS + cash-success trong một thay đổi | `be/internal/handler/payment_handler.go:44-48` (hoặc `fe/.../page.tsx:114`) |
| 2 | 🔴 Lỗi code | FE `'cod'` → `'cash'` trong type `PaymentMethod`, giá trị mặc định, key `METHOD_LABELS` (giữ nguyên nhãn "Tiền mặt") | `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx:14,30-35,52` |
| 3 | 🟡 Lỗi code | Thêm nhánh `isError`/retry vào `GET /orders/:id` (và guard `orderId` không hợp lệ) để id xấu không kẹt mãi ở "Đang tải…" | `fe/.../page.tsx:137-143` |
| 4 | 🟡 Lỗi code | Build `PATCH /payments/:id/proof` (route+handler+service+column) **hoặc** gỡ bỏ UI proof-upload | `be/cmd/server/main.go:267-275` / `fe/.../page.tsx:264-278` |
| 5 | 🟡 Lỗi code | Sửa lệch status Flag 6 — cho phép `MarkOrderPaid` từ `ready`, hoặc nổi lỗi bị nuốt | `be/internal/service/order_service.go:83-86`, `payment_service.go:265-267` |
| 6 | 🟡 Lỗi code | Thêm gate role vào WS `/ws/orders-live` sau khi parse JWT (cross-page: KDS/POS/admin floor) | `be/internal/websocket/handler.go:40-47` |
| 7 | 🟢 Sửa tài liệu | Cập nhật số dòng `main.go` lỗi thời (~+13) trong `_be.md` / `_crosspage_dataflow.md` và phạm vi `completePayment` lệch một; cập nhật nhánh provenance thành `experience_claude.md_system_1_test_iphon2_change_code` trên cả 5 file | 5 file trong bộ tài liệu |

> **Ghi chú `CLAUDE.md`:** sửa tài liệu (hàng 7) là một task. **Mỗi thay đổi code (hàng 1-6) phải được
> đăng ký vào `docs/tasks/MASTER_TASK.md` và ALIGNED trước khi chạm vào bất kỳ file nào** — skill này
> chỉ đọc và không bắt đầu bất kỳ sửa chữa nào. PAYMENT_BUGS.md đã khuyến nghị hàng 1+2 trước tiên
> (một thay đổi BE + một dòng FE).
