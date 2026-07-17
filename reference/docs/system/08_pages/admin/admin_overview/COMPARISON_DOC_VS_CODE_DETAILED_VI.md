# Admin Overview — So Sánh Chi Tiết Tài Liệu vs. Code (5 Mảng)

> **Phạm vi:** rà soát sâu bộ tài liệu trang `/admin/overview` so với **code FE/Go đang chạy thật**
> trên nhánh `experience_claude.md_system_1_test_iphon2_change_code`. Năm trục:
> ① giao diện component · ② luồng dữ liệu cross-component · ③ luồng dữ liệu cross-page · ④ hành vi loading ·
> ⑤ mô hình dữ liệu FE⇄BE. **Chỉ đọc — KHÔNG sửa code hoặc tài liệu.** Thực hiện bởi 5 agent Sonnet
> chạy song song; mọi mục 🔴 đã được **tự tay kiểm chứng lại** theo `file:line` đã dẫn.
>
> **Code thắng.** Mọi ô "Code thực tế" đều được truy từ source, không phải từ trí nhớ. Toàn bộ bộ
> tài liệu mang nhánh gốc cũ `experience_claude.md_system_1` — lần rà soát này đối chiếu lại với
> nhánh hiện tại `..._test_iphon2_change_code`, do đó hầu hết số dòng đã dịch chuyển (xem Mảng 5).
>
> Ngày: 2026-06-21.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Giao diện component | **Lệch** — Zone B vẽ sai; TableGrid thiếu hành động | 2 | 4 | nhiều |
| ② Luồng cross-component | **Chính xác** — một lỗi prop chết | 1 | 3 | nhiều |
| ③ Luồng cross-page | **Chính xác** — xác nhận bug delivered→cancelled + nhánh WS chết | 1 | 2 | nhiều |
| ④ Hành vi loading | **Chính xác** — chỉ lệch dải dòng | 0 | 3 | nhiều |
| ⑤ Mô hình dữ liệu FE⇄BE | **Chuỗi đúng, hai mùi code thật** | 2 | 4 | nhiều |

**Tổng: 🔴 6 (gộp lại còn 4 lỗi gốc riêng biệt) · 🟡 16 · 🟢 ~30 (chủ yếu là số dòng cũ + nhánh nguồn).**

Các tài liệu BE-view, loading và dataflow trung thực đáng kể — vấn đề hệ thống duy nhất của chúng là
**`file:line` cũ** (tài liệu được viết ở nhánh trước; chỉ riêng routes trong main.go đã dịch ~+13 dòng).
Các phát hiện ảnh hưởng thật sự đến sản phẩm tập trung ở **Mảng 1 (Zone B bị vẽ là thứ nó không phải)**
và **Mảng 5 (hai đường code chết FE mang theo: `amount` bóng ma, sự kiện WS chết)** — cộng thêm
**bug 409 delivered→cancelled** mà ba tài liệu riêng đã cắm cờ và code vẫn còn ship.

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng)

1. **Zone B được vẽ là "tất cả đơn active (pending→delivered)" có nút `[Huỷ]` — code chỉ render
   đơn `pending` và không có nút Huỷ.**
   ASCII trong `admin_overview.md:26-27` ghi *"WaitingSection — TẤT CẢ đơn active (pending→delivered)"*
   với nút hàng `[Xác nhận][Kiểm tra][Huỷ]`, và bảng Zones (`admin_overview.md:49`) gán nhãn
   Zone B là "all active orders". Nhưng `WaitingSection.tsx:9` là `PREP_STATUSES = new Set(['pending'])`
   và `WaitingSection.tsx:55` lọc `PREP_STATUSES.has(o.status) && o.table_id && tableMap.has(...)`
   — confirmed/preparing/ready/delivered không bao giờ xuất hiện. Các nút hàng duy nhất là 🔍 Kiểm tra
   (`WaitingSection.tsx:186`) và một nút advance-status (`WaitingSection.tsx:195-200`) —
   **không có Huỷ**. Header thật là "Danh sách bàn cần chuẩn bị" (`WaitingSection.tsx:101`). Comment JSX
   `{/* Zone B — all active orders */}` của trang (`page.tsx:309`) tự nó cũng gây hiểu nhầm. *Tại sao
   quan trọng:* wireframe hứa hẹn một hàng đợi và hành động huỷ không tồn tại; người đọc tin vào
   một bản vẽ sai.

2. **Zone D cho phép nút "Huỷ" trên đơn `delivered`, nhưng `delivered → cancelled` không phải
   transition BE hợp lệ — mỗi lần bấm đều 409.** `TableList.tsx:378-385` render nút đỏ **Huỷ ✕** khi
   `order.status === 'delivered'`, nối dây `onCancel?.(order.id)` → `page.tsx:376-378`
   `handleAction(orderId, 'cancelled')` → `PATCH /orders/:id/status {cancelled}`. Map `validTransitions`
   phía BE (`order_service.go:524-529`) có `delivered: {paid}` mà thôi — không có `cancelled`.
   PATCH trả về `409 INVALID_STATUS_TRANSITION` (`order_service.go:544`) và catch toast chung
   "Không thể cập nhật trạng thái" (`page.tsx:184-185`) che giấu nguyên nhân. *Đã cắm cờ trong
   `admin_overview_be.md` Flag 2 + `admin_overview_crosspage_dataflow.md` §7 — vẫn còn trong code.*
   Đơn delivered chỉ có thể chuyển sang `paid`.

3. **`useOverviewWS` xử lý hai sự kiện WS mà BE không bao giờ publish — các nhánh chết.**
   `useOverviewWS.ts:52` (`case 'order_updated'`) và `useOverviewWS.ts:67` (`case 'order_completed'`)
   là các `switch` case còn sống. Grep BE cho thấy các sự kiện duy nhất được publish vào `orders:kds` là
   `order_status_changed` (`order_service.go:552,745`), `order_cancelled` (`order_service.go:593`),
   `payment_success` (`payment_service.go:270`), cộng thêm họ `item_*` — **không bao giờ** có `order_updated`
   hay `order_completed`. Cả hai nhánh không thể đạt được trên nhánh này. (`admin_overview_be.md` Flag 4
   đã đoán điều này với `order_updated`; xác nhận ở đây, và `order_completed` cũng chết.)

4. **FE gửi `amount` bóng ma trong `POST /payments` mà BE âm thầm bỏ qua.**
   `admin.api.ts:181` type `createPayment(body: { order_id; method; amount: number })` và
   `TableList.tsx:289-293` truyền `amount: order.total_amount`. Struct bind phía BE `createPaymentReq`
   (`payment_handler.go:23-26`) chỉ có `OrderID` + `Method` — không có `amount` — và tính phí
   từ `order.TotalAmount` phía server (`payment_service.go:89`). Field FE là hành lý thừa tạo ấn tượng
   sai rằng client kiểm soát số tiền tính phí. (`admin_overview_be.md` Flag 3.)

---

## Mã Chết / Không Thể Chạm Tới

- **`useOverviewWS.ts:52` `case 'order_updated'`** — BE không bao giờ publish type này → không thể đạt.
- **`useOverviewWS.ts:67` `case 'order_completed'`** — BE không bao giờ publish type này → không thể đạt.
  (`order_cancelled` trong cùng case label `:66` *là* thật và được xử lý đúng.)
- **`TableList.tsx:246,248`** — prop `checkedTableIds` và `onToggleCheck` được khai báo trong
  `TableListProps` nhưng **không được destructure** trong phần hiện thực (`TableList.tsx:253-254`), do đó
  trang truyền chúng (`page.tsx:367-369`) và chúng bị âm thầm bỏ. Không có hành vi checkbox trong TableList.
- **`admin.api.ts:181` `amount: number`** — được gửi trong mọi lần thanh toán tiền mặt, bị bỏ qua bởi bind BE.

---

## Mảng ① — Giao Diện Component

**Kết luận:** Lệch. Zone B là nơi sai nhiều nhất (được vẽ như hàng đợi nhiều trạng thái có nút huỷ
nhưng thực tế không có); TableGrid âm thầm thiếu hành động thanh toán/huỷ mà tài liệu nói Zone D có.

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Phạm vi Zone B | "TẤT CẢ đơn active (pending→delivered)" (`admin_overview.md:26,49`) | `PREP_STATUSES = new Set(['pending'])` — chỉ pending; cần `table_id` (`WaitingSection.tsx:9,55`); header "Danh sách bàn cần chuẩn bị" (`WaitingSection.tsx:101`) | 🔴 | Vẽ lại Zone B đúng là hàng đợi xác nhận pending-only; sửa comment `page.tsx:309` |
| Nút `[Huỷ]` Zone B | wireframe hàng `[Xác nhận][Kiểm tra][Huỷ]` (`admin_overview.md:26`) | chỉ có 🔍 (`WaitingSection.tsx:186`) + advance (`:195-200`); không có nút huỷ | 🔴 | Xoá `[Huỷ]` khỏi wireframe Zone B |
| Hành động TableGrid Zone D | "TableList / TableGrid — … hành động (thanh toán xong / huỷ)" (`admin_overview.md:51`) | trang chỉ truyền `onPaymentDone`/`onCancel` cho `TableList` (`page.tsx:370-379`); `TableGrid` không nhận cái nào (`page.tsx:381-390`) → grid không thể thanh toán/huỷ | 🟡 | Làm rõ trong tài liệu rằng thanh toán/huỷ chỉ ở chế độ **list**, hoặc nối dây vào TableGrid |
| Thẻ thứ 4 Zone A | giá trị đơn "1" dưới "Khẩn cấp/Cảnh báo" (`admin_overview.md:21-22`) | render tỷ lệ `{urgent} / {warning}` + sub-text ">20 phút / 10–20 phút" (`StatCards.tsx:44-49`) | 🟡 | Cập nhật wireframe thành "X / Y" |
| Zone E/F luôn hiện | ASCII vẽ E (PaidLog) + F (CancelLog) là section cố định (`admin_overview.md:36-37`) | cả hai là **accordion thu gọn** mặc định (`PaidLog.tsx:16`, `CancelLog.tsx:15` `useState(false)`) | 🟡 | Vẽ E/F là accordion thu gọn |
| Cổng trạng thái Huỷ Zone D | "hành động … huỷ" ngụ ý bất kỳ hàng active nào | Huỷ chỉ render trên `delivered` (`TableList.tsx:368,378-385`) | 🟡 | Ghi chú Huỷ chỉ xuất hiện tại `delivered` (và xem headline #2 — nó 409) |
| NewOrderPopup | "Đơn hàng mới!" + `[Bỏ qua]` + `[✓ Xác nhận nhận đơn]` + món + tổng | chính xác: `page.tsx:49,85-88,92-94`; lọc kitchen-item `page.tsx:42`; tổng `page.tsx:78` | 🟢 | khớp |
| Zone C PrepPanel | "xem món + filling trước khi nhận", cổng pending∩kiemTra | filling qua `toppingLabel` (`PrepPanel.tsx:157-161`, `overview.helpers.ts:54-68`); cổng `page.tsx:327-329` | 🟢 | khớp |

**Đã xác nhận khớp:** nhãn thẻ thống kê Zone A & nguồn dữ liệu, Zone C PrepPanel (cổng + cột filling + nút advance-all), toggle list/grid Zone D, cột E/F & nguồn dữ liệu shared-query, NewOrderPopup (tiêu đề + cả hai nút + tổng + lọc kitchen-item), thanh tìm kiếm, vị trí ConnectionErrorBanner, timer 30 giây.

---

## Mảng ② — Luồng Cross-Component

**Kết luận:** Chính xác. Mô hình shared-hub (`['orders','live']` qua `setQueryData`, không Zustand,
props xuống / callback lên) đúng từng field. Một lỗi prop chết.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| TableList dùng `checkedTableIds` | bảng state §4 ngụ ý TableList tiêu thụ `checkedTableIds` | được khai báo `TableList.tsx:246,248` nhưng **không destructure** (`:253-254`); bị âm thầm bỏ | 🔴 | Xoá các prop (và phần truyền phía trang ở `page.tsx:367-369`) hoặc hiện thực checkbox |
| Dẫn case `order_status_changed` | `useOverviewWS.ts:51-63` | thực tế `useOverviewWS.ts:51-64` | 🟡 | cập nhật dẫn thành `:51-64` |
| Dẫn provider `OrdersWSContext` | `OrdersWSContext.tsx:22-75` | provider chạy tới `:82` (`useOrdersWSContext` ở `:77-81`) | 🟡 | cập nhật dẫn thành `:22-82` |
| `now` trong tóm tắt state | danh sách §0 bỏ sót `now` | `now` là state tại `page.tsx:108` (refresh 30 giây) | 🟡 | thêm `now` vào danh sách tóm tắt §0 |
| Hub chung `['orders','live']` | một hub, mutate qua `setQueryData` | `page.tsx:130-134,147,163,179`; `useOverviewWS.ts:16` | 🟢 | khớp |
| Không Zustand trên trang này | đã khẳng định | xác nhận — không có import zustand trong page hay children | 🟢 | khớp |
| Hình dạng `Order`/`OrderItem`/`Table` | dẫn tại `order.ts:38-52`, `:15-27`, `admin.api.ts:159-165` | khớp từng field (không có `filling` thêm vào `OrderItem`) | 🟢 | khớp |
| Dải dòng helper | `overview.helpers.ts` 7-9/11-22/54-68/81-94/3-5/96-101 | tất cả chính xác | 🟢 | khớp |

**Đã xác nhận khớp:** pattern single-hub `['orders','live']`, tất cả 8 biến state cục bộ của trang
(kể cả `now` tại `:108`), không Zustand, cả ba hình dạng type, tất cả bảy dải helper,
block optimistic-write của `handleAction` (`page.tsx:174-189`), đường song song `handleConfirmPopup`
(`:158-172`), `PREP_STATUSES` (`WaitingSection.tsx:9`), lấy lịch sử lazy cho PaidLog/CancelLog.

---

## Mảng ③ — Luồng Cross-Page

**Kết luận:** Chính xác. Luận điểm "không ghi trình duyệt, hàng BE là bàn giao duy nhất bền vững"
đứng vững (grep xác nhận không có localStorage/persist). Tài liệu cũng xác nhận độc lập bug
delivered→cancelled và làm nổi các nhánh WS chết.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| delivered Huỷ → 409 | cắm cờ bẫy (`crosspage §7`, `TableList.tsx:378-385`) | xác nhận `TableList.tsx:378-384` → `page.tsx:376-378` → transition BE không hợp lệ (`order_service.go:524-529`) | 🔴 | Vô hiệu/xoá Huỷ trên `delivered`; xem headline #2 |
| Các case switch WS được liệt kê | tài liệu đặt tên `new_order`, `item_progress`, `order_status_changed` | cũng sống: `order_updated` (`:52`), `order_cancelled` (`:66`), `order_completed` (`:67`) — hai cái chết (headline #3) | 🟡 | Tài liệu phải liệt kê tất cả 6 case + đánh dấu các case chết |
| Tập `TABLE_ACTIVE` trùng lặp | tài liệu chỉ đề cập `ACTIVE` | `page.tsx:27` định nghĩa `TABLE_ACTIVE` giống hệt `ACTIVE`; feed `tableOrders` (`:136`) | 🟡 | Ghi chú tập thứ hai trùng lặp (ứng cử viên đơn giản hoá) |
| Không localStorage / persist | "không ghi trình duyệt nào sống qua trang" | grep sạch khắp page + hooks + context; `storage-keys.ts` không có key overview | 🟢 | khớp |
| `ACTIVE` ép hai lần | `useOverviewWS.ts:8` + `page.tsx:26,135` | chính xác | 🟢 | khớp |
| Patch `item_progress` | vá `qty_served` | `useOverviewWS.ts:34-48` | 🟢 | khớp |
| Lỗi PATCH = chỉ toast, không rollback | đã khẳng định | `page.tsx:184-185` catch chỉ là toast | 🟢 | khớp |
| `onPaymentDone` drop+invalidate | `page.tsx:370-374` | chính xác | 🟢 | khớp |
| Đơn mới qua SSE+WS, dedup theo id | cả hai prepend, popup chỉ SSE | `page.tsx:142-153` + `useOverviewWS.ts:21-30` | 🟢 | khớp |

**Đã xác nhận khớp:** luận điểm không persist, ép ACTIVE kép, `item_progress` /
`order_status_changed` patch-vs-drop, SSE popup + dedup, không rollback khi lỗi, `onPaymentDone`,
nối dây `onCancel`.

---

## Mảng ④ — Hành Vi Loading

**Kết luận:** Chính xác. Mọi staleTime, cổng `enabled`, chuỗi empty-state, hợp đồng guard và
tri-state WS đều đúng. Chỉ có các nit là dẫn multi-line trỏ vào chuỗi single-line.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Dẫn empty của PaidLog | "60-62" | dòng đơn `PaidLog.tsx:61` | 🟡 | cập nhật dẫn thành `:61` |
| Dẫn in-flight của CancelLog | "51-52" | dòng đơn `CancelLog.tsx:52` | 🟡 | cập nhật dẫn thành `:52` |
| Dẫn empty của CancelLog | "53-55" | dòng đơn `CancelLog.tsx:54` | 🟡 | cập nhật dẫn thành `:54` |
| staleTimes 60k/15k/30k | đã khẳng định | `page.tsx:127,133`; `PaidLog.tsx:22`/`CancelLog.tsx:22` | 🟢 | khớp |
| `['orders','history']` `enabled: open` | lazy trong cả hai log | `PaidLog.tsx:21`, `CancelLog.tsx:21` | 🟢 | khớp |
| AuthGuard null/getMe/login | `:23/:17/:19` | chính xác | 🟢 | khớp |
| RoleGuard MANAGER đồng bộ | `RoleGuard.tsx:16`, `layout.tsx:30` | chính xác | 🟢 | khớp |
| Tri-state WS + banner-khi-false | `OrdersWSContext.tsx:24,47,53` + `page.tsx:249` | chính xác | 🟢 | khớp |
| Không có `overview/loading.tsx` | chỉ có `admin/loading.tsx` | xác nhận (spinner cam `loading.tsx:4`) | 🟢 | khớp |

**Đã xác nhận khớp:** tất cả staleTimes, tất cả cổng `enabled`, mọi chuỗi empty/in-flight,
cả hai hợp đồng guard, mapping null/true/false của WS, SSE không trả state + reconnect (tối đa 30 giây, 10
lần thử), TableList `return null` khi rỗng, không có `loading.tsx` ở cấp overview.

---

## Mảng ⑤ — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** Các chuỗi handler→service→repo, cổng auth, `validTransitions`, payment DTO và
định tuyến SSE/WS đều đúng. **Mọi `file:line` đều cũ** (routes dịch ~+13 trong main.go) và
hai mùi code thật tồn tại (`amount` bóng ma, sự kiện WS chết).

| Endpoint/Flag | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| `amount` bóng ma (Flag 3) | "amount bị BE bỏ qua" | FE DTO có `amount` (`admin.api.ts:181`), được gửi (`TableList.tsx:292`); BE bind không có (`payment_handler.go:23-26`) | 🔴 | Xoá `amount` khỏi type FE & lời gọi |
| Sự kiện WS chết (Flag 4) | đoán `order_updated`/`order_completed` là legacy | xác nhận chết: BE không publish cái nào (grep `order_service.go`/`payment_service.go`); case FE `useOverviewWS.ts:52,67` | 🔴 | Xoá hai case chết |
| Số dòng route main.go | group :231, /live :234, /history :235, /:id :236, /:id/status :237, tables :265-270, payments :254-256, sse :331, ws :337-339 | thực tế: group :243, /live :247, /history :248, /:id :249, /:id/status :250, tables :278-284, payments :267-269, sse :344, ws :350-352 | 🟡 | Dẫn lại tất cả số dòng main.go |
| Alias chef `GET /orders` | không đề cập | `main.go:246` `GET ""` `AtLeast("chef")` → cùng handler `ListLive` | 🟡 | Thêm hàng alias |
| FE `Table` bỏ `is_active` | type liệt kê 5 field | BE trả `is_active` (`table_handler.go:41`); FE type bỏ (`admin.api.ts:159-165`) | 🟡 | Thêm `is_active?` vào FE `Table` nếu cần |
| WS không có cổng role (Flag 5) | bất kỳ token hợp lệ nào kết nối được | nhóm `main.go:350-352` không có authMW; handler chỉ parse token (`websocket/handler.go:40-46`) | 🟡 | đã xác nhận; quyết định chính sách |
| Cổng auth 1–8 | role per-endpoint | tất cả đúng (cashier/cashier/cashier/any/chef/cashier/manager/none) | 🟢 | khớp |
| `validTransitions` | pending→confirmed\|cancelled … delivered→paid | chính xác (`order_service.go:524-529`) | 🟢 | khớp |
| Luồng thanh toán tiền mặt | amount=TotalAmount, completePayment, publish payment_success | `payment_service.go:89,99,270-271` | 🟢 | khớp |
| Lịch sử không có items (Flag 6) | `ListTodayHistory` không lấy items | xác nhận (`order_service.go:174-190`) | 🟢 | khớp |

**Đã xác nhận khớp:** tất cả 8 cổng auth endpoint, chuỗi đầy đủ handler→service→repo, bảng
`validTransitions`, payment DTO (không có field amount), cột SQL `GET /tables`, SSE-admin chỉ publish `new_order`,
WS subscribe `orders:kds`, lịch sử không trả items.

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code | Vô hiệu/xoá nút **Huỷ** trên đơn `delivered` (luôn 409) | `fe/.../TableList.tsx:378-385` + `page.tsx:376-378` |
| 2 | 🔴 Dọn code | Xoá các case WS chết `order_updated` + `order_completed` | `fe/src/hooks/useOverviewWS.ts:52,67` |
| 3 | 🔴 Dọn code | Bỏ `amount` bóng ma khỏi type `createPayment` + call site | `fe/.../admin.api.ts:181`, `TableList.tsx:292` |
| 4 | 🔴 Dọn code | Xoá `checkedTableIds`/`onToggleCheck` thừa khỏi `TableList` (hoặc hiện thực) | `fe/.../TableList.tsx:246,248` + `page.tsx:367-369` |
| 5 | 🔴 Sửa tài liệu | Vẽ lại Zone B đúng là hàng đợi xác nhận pending-only; xoá nút `[Huỷ]` khỏi wireframe | `admin_overview.md:21-49` |
| 6 | 🟡 Sửa tài liệu | Dẫn lại tất cả `file:line` cũ (routes main.go +13, dải WS/PaidLog/CancelLog/provider) + cập nhật nhánh nguồn thành `..._test_iphon2_change_code` | tất cả 5 file `admin_overview_*.md` |
| 7 | 🟡 Sửa tài liệu | Ghi chú TableGrid thiếu thanh toán/huỷ; vẽ E/F là accordion thu gọn; sửa thẻ Zone A "X / Y" | `admin_overview.md` |
| 8 | 🟡 Sửa tài liệu | Liệt kê tất cả 6 case switch WS (đánh dấu 2 cái chết); ghi chú `TABLE_ACTIVE` trùng lặp + alias `GET /orders` chef | `admin_overview_crosspage_dataflow.md`, `admin_overview_be.md` |

> **Ghi chú CLAUDE.md:** các bản sửa tài liệu (hàng 5–8) là một task ALIGN. Mỗi thay đổi **code**
> (hàng 1–4) phải được đăng ký thành hàng riêng trong `docs/tasks/MASTER_TASK.md` **trước khi chạm
> vào bất kỳ file nào** — lần rà soát này không thay đổi gì.
