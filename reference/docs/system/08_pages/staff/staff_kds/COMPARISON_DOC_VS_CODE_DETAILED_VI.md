# KDS (Màn Hình Bếp) — So Sánh Chi Tiết Tài Liệu vs. Code

> **Phạm vi:** đối chiếu bộ tài liệu `staff_kds` (`staff_kds.md`, `staff_kds_be.md`,
> `staff_kds_crosspage_dataflow.md`, `staff_kds_loading.md`, `KDS_BUGS.md`, `SCENARIO_KDS_COOK.md`)
> với code đang chạy trên nhánh `experience_claude.md_system_1_test_iphon2_change_code`.
> 5 trục: ① giao diện component · ② luồng dữ liệu cross-component (**KHÔNG ÁP DỤNG — không có
> Zustand/store dùng chung; toàn bộ state là `useState` cục bộ**) · ③ luồng dữ liệu cross-page ·
> ④ hành vi loading · ⑤ mô hình dữ liệu FE⇄BE.
> **Chỉ đọc — không sửa code hay tài liệu.** Tạo bởi 2 agent Sonnet song song (Area 1, 3) +
> orchestrator trace tay (Area 4, 5); mọi 🔴 đều được kiểm chứng lại bằng tay với source.
> Code là nguồn chân lý — khi tài liệu và code mâu thuẫn, code thắng và mâu thuẫn đó CHÍNH LÀ phát
> hiện. Ngày: 2026-06-22.

---

## Tóm Tắt Điều Hành

| Khu vực | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Giao diện component | Wireframe chính xác; thiếu vài chi tiết nhỏ (thanh/chữ màu urgency, caret đổi chiều) | 0 | 2 | 11 |
| ② Luồng cross-component | **KHÔNG ÁP DỤNG** — KDS không có Zustand store, không selector dùng chung, không localStorage; toàn bộ state là `useState` cục bộ | — | — | — |
| ③ Luồng cross-page | Một mâu thuẫn thật (claim badge); phần còn lại là bản đồ trung thực, trace từ source | 1 | 2 | 5 |
| ④ Hành vi loading | `staff_kds_loading.md` chính xác tuyệt đối; một ❓ nay đã được giải đáp (không có auth guard) | 0 | 1 | 4 |
| ⑤ Mô hình dữ liệu FE⇄BE | `_be.md` mô tả code *bao gồm cả bug*; số dòng route bị lệch | 0 | 2 | 6 |

**Kết luận chung.** Giống `customer_combo_detail` / `customer_order_detail` / `admin_combos`, bộ
tài liệu KDS là **bản phản chiếu trung thực, mô tả code bao gồm cả các bug** — `KDS_BUGS.md`, các Flag
trong `_be.md`, và `staff_kds.md` §5 đã nêu mọi lỗi code thật. **Mâu thuẫn doc-vs-code thật sự DUY
NHẤT** nằm ở `staff_kds_crosspage_dataflow.md §1`, nơi tài liệu nói KDS cập nhật badge trạng thái đơn
trực tiếp khi nhận `order_status_changed`; code không hề làm vậy. Mọi mục 🔴 còn lại bên dưới là
**bug code mà tài liệu đã ghi đúng** và audit kiểm chứng lại, không phải lỗi tài liệu.

---

## NHỮNG PHÁT HIỆN PHẢI LÊN TIẾNG (đã kiểm chứng tay)

1. **🔴 TÀI LIỆU LỆCH — KDS KHÔNG cập nhật badge trạng thái trực tiếp; `crosspage §1` nói có.**
   `staff_kds_crosspage_dataflow.md:128-129` (bảng §1) nói event `order_status_changed` cho
   `confirmed` và `preparing` → *"Badge updates, stays on board."* Code trong handler WS
   (`kds/page.tsx:149-154`) chỉ **xoá** card khi `status ∉ ACTIVE_STATUSES`; **không bao giờ sửa
   `o.status`** cho một transition còn active. Nên khi đơn chuyển `confirmed → preparing` lúc đang nằm
   trên board, badge vẫn **cũ** cho tới lần `GET /orders` kế (staleTime 30s) hoặc F5. Đây là mâu thuẫn
   doc-vs-code thật **đồng thời** là một khoảng hở cập-nhật-trực-tiếp nhỏ. *(Mục Key-Interactions ở
   `staff_kds.md:98-99` thì chính xác — nó chỉ mô tả ca xoá card; chỗ nói quá nằm ở bảng cross-page.)*

2. **🔴 BUG CODE (tài liệu đã ghi) — chạm-để-phục-vụ trúng 404; không thể phục vụ món từ KDS.**
   `onClick` của dòng món PATCH vào path **5 đoạn** `/orders/${orderId}/items/${itemId}/status`
   (`kds/page.tsx:160-161`) với body rỗng `{}`. **Không có route nào như vậy** — đã xác nhận: các
   route món chỉ là 3 đoạn `/orders/items/:id/quantity` (`main.go:262`), `/orders/items/:id`
   (`main.go:263`, `UpdateItemServed`, `AtLeast("chef")`), DELETE `/orders/items/:id` (`main.go:264`)
   → Gin 404 → mỗi lần chạm là `toast.error('Không thể cập nhật món')`. Hành động cốt lõi của KDS
   (đánh dấu đã phục vụ một phần) bị chết, và `maybeAutoReady` không bao giờ kích hoạt được từ thao
   tác của bếp. Ghi tại `KDS_BUGS.md` Bug 1 / `staff_kds_be.md` Flag 1 — kiểm chứng lại, vẫn đúng.

3. **🔴 BẢO MẬT (tài liệu đã ghi) — WS trực tiếp không có cổng vai trò; token khách (guest) có thể
   subscribe `orders:kds`.** Group `/ws` được đăng ký với **không middleware nào** (`main.go:350-352`);
   auth là query param `?token=` parse bên trong `wsHandler` và claim bị **vứt bỏ**
   (`_, err := jwtpkg.ParseToken(token)`, `websocket/handler.go:40`). Bất kỳ JWT hợp lệ chữ ký, chưa
   hết hạn — kể cả token `customer` guest — đều nhận mọi event đơn hàng trên sàn. Đây là mối lo
   cross-page chung với `admin_overview` (cùng kênh). Ghi tại `staff_kds_be.md` Flag 4 /
   `staff_kds_crosspage_dataflow.md §11` — kiểm chứng lại.

> **Đã loại bỏ sau kiểm chứng tay:** một agent Area-1 nêu 🔴 cho rằng ASCII vẽ inline status picker
> *dưới* hàng nút Kiểm tra/Trạng thái còn code render *trên*. Đọc lại cả hai: ASCII
> (`staff_kds.md:33-36`) vẽ khối picker **trên** hàng nút, và JSX render picker (`:257-278`) **trên**
> hàng nút (`:280-304`). Chúng **khớp** — không mâu thuẫn. (Ghi lại để lần refresh sau không nêu lại.)

---

## Code chết / không thể chạm tới

- **Endpoint `/ws/kds` chết** — đăng ký tại `main.go:351` (`KDSHandler`), giống hệt `LiveHandler`
  (`/ws/orders-live`, `:352`) trên cùng kênh `orders:kds` (`websocket/handler.go:17-24`); không FE
  nào kết nối tới (`OrdersWSContext.tsx:38` dùng `/ws/orders-live`). `staff_kds_be.md` Flag 5 đã ghi. 🟢
- **Ba event `orders:kds` không có handler KDS** — `items_added` (`order_service.go:516`),
  `item_cancelled` (`:642`), `item_updated` (`:696`) tới socket nhưng switch KDS
  (`kds/page.tsx:117-155`) không có `case` → bị bỏ qua âm thầm. `staff_kds.md`/`_be.md` Flag 6 đã ghi. 🟡
- **`useOverviewWS.ts:52,67` nhánh chết** `order_updated` / `order_completed` — subscriber **admin
  overview** trên *cùng* kênh `orders:kds` có hai case mà BE không bao giờ publish (grep `be/` = 0).
  Switch của chính KDS không có nhánh này; đây là mối lo cross-page đã đánh dấu cho lần chạy staff_kds
  trong tracker (admin_overview headline #3). 🟢
- **`deriveItemStatus()` (`fe/src/types/order.ts:9-13`) được export nhưng KDS tự tính lại logic y hệt
  inline** (`kds/page.tsx:199,228,229`). Export thừa nhỏ. `staff_kds.md` §5 Flag 4. 🟢

---

## Khu vực ① — Giao diện component

**Kết luận:** ASCII wireframe + bảng Zones trong `staff_kds.md` chính xác. Hai chi tiết giao diện nhỏ
bị thiếu trong hình vẽ; header `table_id`-UUID là bug code tài liệu đã ghi, không phải lệch.

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Nhãn bàn trên header card | Tài liệu đã đánh dấu là bug: render `order.table_id` (UUID), lẽ ra `table_name` (`staff_kds.md:25,62,170`) | `kds/page.tsx:214` `order.table_id ? \`Bàn ${order.table_id}\` : 'Mang về'` — render UUID, bỏ qua `table_name` | 🟠 | **Bug code (tài liệu đã ghi), không phải lệch.** Sửa code: `Bàn ${order.table_name ?? order.table_id}` (xem `KDS_BUGS.md` Bug 2) |
| Thanh dọc màu urgency | Khối màu viền (`staff_kds.md:43-47`) chỉ mô tả `urgencyBorderClass` | Một thanh `w-1 h-5` màu bên trái nhãn bàn render trên mọi card qua `urgencyBarClass(mins)` (`kds/page.tsx:212`, hàm `:39-43`) | 🟡 | Thêm thanh urgency vào hàng header ASCII |
| Màu chữ thời gian trôi qua | Không nhắc trong khối màu viền | Chữ "{mins} phút" được tô màu qua `urgencyTextClass(mins)` (`kds/page.tsx:220`, hàm `:45-49`) | 🟡 | Ghi chú màu chữ thời gian trong tài liệu |
| Caret Trạng thái | ASCII chỉ vẽ `Trạng thái ▼` (`staff_kds.md:36,67`) | Caret đổi chiều: `Trạng thái {isStatusOpen ? '▲' : '▼'}` (`kds/page.tsx:301`) | 🟢 | Thêm ghi chú đổi ▲/▼ |
| Thứ tự picker vs hàng nút | ASCII vẽ picker trên hàng nút (`staff_kds.md:33-36`) | Picker `:257-278` render trên hàng nút `:280-304` | 🟢 | **Khớp** — đã loại 🔴 của agent |

**Đã xác minh khớp:** grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
(`kds/page.tsx:194`); tiêu đề "KDS — Bếp" (`:192`); empty-state "Không có đơn nào đang chờ 🍜"
(`:185`); các trường header order_number/status-badge/elapsed (`:211-222`); dòng món name +
nhãn `kdsVariant` + `còn ×N`/`✓` (`:227-248`); dòng tổng "N món · M phần còn lại" (`:251-253`);
nhãn picker `✓ Phục vụ`/`🛍 Mang đi`/`Huỷ` và payload `{status:'ready'}` y hệt cho cả hai nút phục vụ
(`:260,266,272`); 🔍 Kiểm tra toggle cục bộ ép `border-urgent` (`:206-208,283-291`); map nhãn status
badge (`:51-61`).

---

## Khu vực ③ — Luồng dữ liệu cross-page

**Kết luận:** bản đồ cross-page là mô tả trung thực, trace từ source, về fan-out `orders:kds`. Mâu
thuẫn duy nhất là claim "badge updates" ở §1 (headline #1). Một khoảng hở code thật lộ ra: auto-ready
bỏ qua monitor broadcast.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| `order_status_changed` cho transition active | Bảng §1: `confirmed`/`preparing` → "Badge updates, stays on board" (`crosspage:128-129`) | Handler chỉ xoá card khi `status ∉ ACTIVE`; không bao giờ sửa `o.status` cho transition active (`kds/page.tsx:149-154`) → badge cũ tới khi refetch/F5 | 🔴 | Sửa tài liệu thành "card vẫn ở; badge KHÔNG cập nhật trực tiếp (cũ tới khi refetch 30s/F5)" — và/hoặc thêm nhánh patch status trong code |
| `maybeAutoReady` → monitor broadcast | §5/§8 ngụ ý queue `/tracking` của khách cập nhật mỗi khi KDS đẩy bất kỳ đơn nào; `publishMonitorBroadcast` "gọi mỗi `UpdateOrderStatus`" (`crosspage:243-246`) | `maybeAutoReady` gọi `s.repo.UpdateOrderStatus` **trực tiếp** (`order_service.go:744`) rồi chỉ `publishOrderEvent` (`:745`) — **bỏ qua** `publishMonitorBroadcast` ở tầng service tại `:553` | 🟡 | Khoảng hở code (ảnh hưởng customer_tracking, không phải render KDS): thêm `publishMonitorBroadcast` trong `maybeAutoReady`, hoặc thu hẹp claim tài liệu về path status tường minh |
| Ba event `orders:kds` bị bỏ qua | §0 danh sách kênh thiếu `items_added`/`item_cancelled`/`item_updated`; Flag 6 ghi chúng bị bỏ qua | Publish tại `order_service.go:516/642/696`; không có `case` KDS (`kds/page.tsx:117-155`) | 🟡 | Khoảng hở cập nhật trực tiếp tài liệu đã ghi; thêm ba type vào danh sách kênh §0 (ghi: FE bỏ qua) |
| Nhánh chết admin `useOverviewWS` | Không có trong tài liệu KDS (mối lo cross-page) | `useOverviewWS.ts:52,67` `order_updated`/`order_completed` — BE không publish (grep `be/`=0) | 🟢 | Dọn dẹp cross-page (admin_overview headline #3); switch KDS không có nhánh này |
| WS không cổng vai trò | §11: `?token=` parse, claim bị vứt; mọi JWT subscribe (`main.go:337`, `handler.go:40`) | Xác nhận `main.go:350-352` (không middleware), `handler.go:40` `_, err := jwtpkg.ParseToken` | 🟢 (lệch dòng `:337→:350`) | Bug bảo mật ghi đúng (headline #3) |
| `/ws/kds` chết | Flag 5: đăng ký, giống hệt, không ai dùng | `main.go:351` `KDSHandler`; FE dùng `/ws/orders-live` (`OrdersWSContext.tsx:38`) | 🟢 | Tài liệu đúng |

**Đã xác minh khớp:** URL WS `/ws/orders-live?token=` (`OrdersWSContext.tsx:38`);
`(dashboard)/layout.tsx` chỉ bọc `<OrdersWSProvider>` (4 dòng); KDS xử lý đúng
`new_order`/`item_progress`/`order_cancelled`/`order_status_changed` (`kds/page.tsx:117-155`);
dedup theo id khi `new_order` (`:122-123`); `ACTIVE_STATUSES={pending,confirmed,preparing}` (`:93`);
admin `ACTIVE` thêm `ready`,`delivered` (`useOverviewWS.ts:8`); POS subscribe (`pos/page.tsx:142`);
không có storage key KDS (`storage-keys.ts:1-7`); `publishOrderEvent` → `order:<id>` + `orders:kds`
(`order_service.go:814-818`); `publishItemEvent` (`:998-1009`); guest `DELETE`→`order_cancelled`
(`:593`) vs PATCH cancel→`order_status_changed` (`:552`).

---

## Khu vực ④ — Hành vi loading

**Kết luận:** `staff_kds_loading.md` chính xác tuyệt đối — mọi claim đều được kiểm chứng lại với
`kds/page.tsx`. Một `❓ UNVERIFIED` trung thực của file (vị trí auth guard) nay đã được giải đáp.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Auth guard tầng route | §1 `❓ UNVERIFIED` — "chưa trace được vị trí auth guard thật" | `(dashboard)/layout.tsx` chỉ render `<OrdersWSProvider>` (4 dòng) — **không AuthGuard/RoleGuard**; `kds/page.tsx` cũng không. /kds render cho bất kỳ ai; bảo vệ chỉ là 401 của api-client khi `GET /orders` (`AtLeast("chef")`) | 🟡 | **Giải đáp ❓:** không có route guard phía client; ghi chú điều này (và người không có quyền sẽ thấy empty-state, không bị redirect) |

**Đã xác minh khớp:** `isLoading`/`isError` không bao giờ được destructure — chỉ `data`
(`kds/page.tsx:102`); loading = rỗng = lỗi đều render "Không có đơn nào đang chờ 🍜" (`:182-188`);
`staleTime: 30_000` (`:105`); `useEffect` seed `if (!initial) return` (`:108-111`); `connected`
không được dùng (`:114` chỉ destructure `subscribe`); inline new-order `GET /orders/:id` với `catch{}`
âm thầm (`:118-128`); không có `loading.tsx` cho `(dashboard)/` hay `kds/` — chỉ tồn tại
`(shop)/loading.tsx` + `(dashboard)/admin/loading.tsx`; không skeleton.

---

## Khu vực ⑤ — Mô hình dữ liệu FE⇄BE

**Kết luận:** `staff_kds_be.md` mô tả đúng mọi endpoint, serializer, và các bug; lệch duy nhất là số
dòng `main.go` đã cũ — một trong số đó nay trỏ vào **sai route**.

| Endpoint/Trường/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Dòng route `UpdateItemServed` | `_be.md` ghi `PATCH /orders/items/:id` tại `main.go:250` | `:250` nay là `PATCH /:id/status` (UpdateStatus); `UpdateItemServed` ở `main.go:263` | 🟡 | Hơn cả mỹ phẩm — cite nay trỏ sai route; cập nhật thành `:263` |
| Số dòng khối route `/orders` | group `:230-240`, authMW `:231`, WS `:337-339` | group `:243`, authMW `:244`, `GET ""` ListLive+chef `:246`, `GET /:id` (không cổng vai trò) `:249`, `PATCH /:id/status`+chef `:250`, group WS `:350-352` | 🟢 | Cập nhật số dòng (~+13) |
| Có route món 5 đoạn không? | Bug 1: không có route đó | Xác nhận — chỉ có `:262-264` route món 3 đoạn; `/orders/:orderId/items/:itemId/status` không khớp gì → 404 | 🟢 | Tài liệu đúng (headline #2) |
| Trường serializer | `table_name` resolve + trả về; `item_status` derived; `flagged` không bao giờ emit | `order_handler.go:377` `table_name`, `:367` `item_status`, `:384` `created_by`; FE `OrderItem.flagged` (`order.ts:26`) không bao giờ serialize → luôn `undefined` | 🟢 | Tài liệu đúng (§3/§5); `item_status`/`created_by` là extra chỉ-BE không có trong type FE |
| `validTransitions` | chỉ `preparing→ready`; sai → 409 | map `order_service.go`: `pending→{confirmed,cancelled}`, `confirmed→{preparing,cancelled}`, `preparing→{ready,cancelled}`, `ready→{delivered}`, `delivered→{paid}` | 🟢 | Tài liệu đúng (Flag 3) |
| Ngữ nghĩa `UpdateItemServed` | bind `{qty_served}` min=0, SET tuyệt đối, từ chối `>quantity` | `order_service.go:701-723` SET qua `UpdateQtyServed`, từ chối `<0\|\|>quantity` → `ErrInvalidInput`; id thiếu → `errors.Is(sql.ErrNoRows)→ErrNotFound` (404 đúng) | 🟢 | Tài liệu đúng; **không** dính bẫy 404→500 của admin_ingredients |
| Cột `filling` | Flag 7: thêm bởi 016, drop bởi 017; không có trong response | grep `filling` trong `be/internal/db|service|handler` = 0 | 🟢 | Tài liệu đúng |

**Đã xác minh khớp:** cổng `AtLeast("chef")` trên `GET /orders` (`main.go:246`) và `PATCH /:id/status`
(`:250`); `GET /:id` không có cổng vai trò phụ (`:249`); `UpdateItemServed` cổng chef (`:263`); hình
dạng serializer (`order_handler.go:318-389`); derivation `itemStatus()`; `maybeAutoReady` chỉ chuyển
khi `status==preparing` và mọi món đã phục vụ (`order_service.go:726-746`).

---

## Danh Sách Hành Động Tổng Hợp (theo ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Bug code | Trỏ chạm-để-phục-vụ về `PATCH /orders/items/:id` với `{qty_served: min(qty_served+1, quantity)}`; truyền `item.qty_served`+`item.quantity` | `fe/src/app/(dashboard)/kds/page.tsx:159-163` |
| 2 | 🔴 Bug code (bảo mật) | Thêm `authMW` + cổng vai trò cho group `/ws` (hoặc kiểm tra claim đã parse trong `wsHandler`) | `be/cmd/server/main.go:350-352`, `be/internal/websocket/handler.go:40` |
| 3 | 🟠 Bug code | Render `order.table_name ?? order.table_id` trên header card | `fe/src/app/(dashboard)/kds/page.tsx:214` |
| 4 | 🔴 Sửa tài liệu | Sửa bảng `crosspage §1`: `order_status_changed` trạng thái active giữ card nhưng **không** cập nhật badge trực tiếp | `staff_kds_crosspage_dataflow.md:128-129` |
| 5 | 🟡 Khoảng hở code | Thêm `publishMonitorBroadcast` trong `maybeAutoReady` để `/tracking` của khách re-sort khi auto-ready | `be/internal/service/order_service.go:726-746` |
| 6 | 🟡 Khoảng hở code | Thêm `case` KDS (hoặc refetch-on-unhandled-event) cho `items_added`/`item_cancelled`/`item_updated` | `fe/src/app/(dashboard)/kds/page.tsx:117-155` |
| 7 | 🟡 Sửa tài liệu | Sửa cite `UpdateItemServed` trong `_be.md` `:250→:263`; cập nhật dòng route `/orders` (~+13); thêm thanh/chữ màu urgency + caret flip vào `staff_kds.md`; ghi không có route guard trong `_loading.md` | bộ tài liệu |
| 8 | 🟢 Dọn code | Gỡ endpoint chết `/ws/kds` và nhánh chết `order_updated`/`order_completed` trong `useOverviewWS` | `main.go:351`, `useOverviewWS.ts:52,67` |

> Theo CLAUDE.md: các sửa tài liệu (#4, #7) là **một** task tài liệu đã ALIGN; **mỗi** thay đổi code
> (#1, #2, #3, #5, #6, #8) phải được đăng ký trong `docs/tasks/MASTER_TASK.md` và ALIGN **trước khi**
> chạm vào bất kỳ file nào. Skill này không thay đổi gì — chỉ phơi bày drift.
