# Customer Tracking — So Sánh Tài Liệu vs. Code (Audit Chi Tiết) 🇻🇳

> **Phạm vi:** rà soát chỉ đọc tài liệu vs. code thật của trang `/tracking` theo 5 trục — giao diện
> component, luồng dữ liệu cross-component, luồng dữ liệu cross-page, hành vi loading, và mô hình dữ
> liệu FE⇄BE. **Chỉ đọc — KHÔNG sửa code hay tài liệu trong quá trình audit này.**
> Thực hiện bằng cách truy vết FE trực tiếp + kiểm chứng BE từ source; mọi 🔴 đã được **tự tay kiểm
> chứng lại** theo source trên branch `experience_claude.md_system_1_test_iphon2_change_code`.
> **Code là nguồn đúng:** mỗi ô "Code thực tế" là một khẳng định về code đang chạy, kèm `file:line`.
> Loại trừ: `SCENARIO_TRACK_ORDER.md` (nhịp tường thuật, không phải trục cấu trúc) và bản đồ
> `.excalidraw` không được audit ở đây. Ngày: 2026-06-21 (làm mới — đã kiểm chứng lại toàn bộ phát
> hiện; **phát hiện code chết mới được thêm:** `ServiceQueueList` + `ServiceQueueItem` không có tham
> chiếu nào, đã bị thay thế bởi `WholeFloorPrepList`).
>
> **Kết quả nổi bật (hiếm gặp):** bộ tài liệu *dạng văn bản* (`_be.md`, `_loading.md`,
> `_crosscomponent_dataflow.md`, `TRACKING_BUGS.md`) **chính xác bất thường** — được truy vết từ
> source và đã ghi lại các lỗi code đang chạy của trang dưới dạng Flag. **Lệch tài liệu thật sự**
> mà audit này phát hiện tập trung ở **wireframe ASCII trong `customer_tracking.md` (Mảng 1)**, vẽ
> UI (tiến độ nấu theo món, thanh tiến độ theo sàn) mà các component thật không bao giờ render.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Giao diện component | ⚠️ Lệch thật — wireframe vẽ UI tiến độ mà code không bao giờ render | 2 | 2 | 2 |
| 2 — Luồng cross-component | ✅ Chính xác; một tự mâu thuẫn bên trong file | 0 | 1 | 1 |
| 3 — Luồng cross-page | ✅ Đúng theo thiết kế (không có file crosspage; consumer chỉ đọc) | 0 | 0 | 1 |
| 4 — Hành vi loading | ✅ Chính xác, từng dòng | 0 | 1 | 1 |
| 5 — Mô hình dữ liệu FE⇄BE + Flags | ✅ Chính xác; số dòng tài liệu bị lệch; Flag 1 = lỗi code đang chạy | 1 | 3 | 2 |
| **Tổng** | | **3** | **7** | **7** |

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng)

1. **🔴 (Lệch tài liệu) `OrderDetailCard` KHÔNG render tiến độ nấu theo từng món — wireframe nói dối.**
   `customer_tracking.md:23-25` ASCII vẽ `• Bánh cuốn thịt   ra 1/2` / `• Canh mọc   còn 1`, và
   bảng Zones (`customer_tracking.md:47`) gọi là *"items + progress of own order"*. Component thật
   render `x{quantity}` + tên + toppings + **giá dòng** + **footer tổng cộng** —
   **không có trường tiến độ nào** (`OrderDetailCard.tsx:36-64`, tổng tại `:67-74`). Không có
   rendering `qty_served`/`ra n/m` nào ở bất kỳ đâu trong component. **Tại sao quan trọng:** lời hứa
   "xem món mình đang được nấu" của trang được vẽ trong tài liệu nhưng vắng mặt trong code — và ngay
   cả nếu được thêm vào, các Flag 1–2 dưới đây có nghĩa là tiến độ không thể cập nhật live.

2. **🔴 (Lệch tài liệu) `WholeFloorPrepList` render badge trạng thái, KHÔNG phải thanh tiến độ.**
   `customer_tracking.md:29-31` ASCII vẽ `1. Bàn 01  ▓▓▓▓░░` thanh tiến độ và một hàng `3. Mang về ░░░░░░`.
   Component thật render, mỗi hàng: số vị trí, `tableLabel`, một **`StatusBadge`**
   (`statusColors`/`statusLabel`), và hậu tố số đơn — không có ký hiệu thanh tiến độ, không có hàng
   "Mang về" riêng (`WholeFloorPrepList.tsx:42-82`); header là `Hàng chờ phục vụ` + số đếm `{N} bàn`
   (`:27-32`). **Tại sao quan trọng:** giao diện hàng đợi sàn mà tài liệu hứa hẹn (fill-bar) chưa
   bao giờ được xây.

3. **🔴 (Lỗi code, đã được ghi lại) Badge trạng thái live bị chết — SSE event `order.status` không bao giờ kích hoạt.**
   Hook FE chuyển nhánh theo `case 'order.status'` (`useOrderMonitorSSE.ts:67-69`), nhưng **không có
   code BE nào publish type đó**. Mỗi chuyển đổi trạng thái publish `type:"order_status_changed"` trên
   `order:<id>` (`order_service.go:552`, `:745`, qua `publishOrderEvent` `:806-818`). Grep toàn repo
   tìm `"order.status"` chỉ thấy trong một **comment** (`monitor_handler.go:17`) — không bao giờ được
   marshal. Vì vậy `orderStatus` vẫn là `null` và badge rơi về snapshot `GET /orders/:id` cuối cùng
   (`page.tsx:44`), chỉ tiến lên khi một event `items_*` tình cờ kích hoạt refetch. **Đây là lỗi sản
   phẩm thật** — `_be.md` Flag 1 + `TRACKING_BUGS.md` Bug 1 ghi lại đúng; nêu lại ở đây vì đây là
   lỗi live hàng đầu trên trang.

---

## Mã Chết / Không Thể Truy Cập

- **`ServiceQueueList.tsx` + `ServiceQueueItem.tsx`** (toàn bộ file) — **không có import ngoài nào** (grep:
  `ServiceQueueList` chỉ xuất hiện trong định nghĩa của chính nó; `ServiceQueueItem` chỉ trong
  `ServiceQueueList.tsx:1,28` + định nghĩa của chính nó). Trang render `WholeFloorPrepList` cho hàng đợi sàn
  (`page.tsx:12,157`), không bao giờ dùng `ServiceQueueList`. Hai file này là một triển khai hàng đợi sàn
  **cũ hơn, đã bị thay thế** còn sót lại trong cây (`ServiceQueueList` header "Bàn đang phục vụ",
  `ServiceQueueItem` render `StatusBadge` + `#orderId.slice(0,8)` + `itemCount món` + `~Xʹ` + chip `< Đơn của bàn`).
  **Mới được phát hiện trong lần làm mới này — không có trong lần chạy trước.** 🟡 Dọn code: xóa cả hai file.
- **`RECONNECT.showBannerAfter = 3`** (`useOrderMonitorSSE.ts:11`) — được định nghĩa, **không bao giờ được tham chiếu**.
  `ConnectionErrorBanner` hiện ngay khi `!sseConnected` (`page.tsx:129`), không phải sau 3
  lần thử. Hằng số chết.
- **Giá trị trả về `tableStatuses`** (`useOrderMonitorSSE.ts:120`, được cấp bởi `tables.status` tại `:81-82`) —
  `page.tsx:36` **không** destructure nó; không có widget nào render nó. BE push snapshot `tables:broadcast`
  nhưng bị **bỏ qua trên trang này** (hook được chia sẻ với admin floor monitor, vì vậy nó chết *trên `/tracking`*, không phải toàn cục).
- **Giá trị trả về `reconnect()`** (`useOrderMonitorSSE.ts:30-36, 120`) — không được destructure trong
  `page.tsx`; không có nút "Thử lại" nào. Banner chỉ hiển thị.

---

## Mảng 1 — Giao Diện Component

**Kết luận:** ⚠️ Lệch thật. Wireframe ASCII trong `customer_tracking.md` mang tính khát vọng — hai vùng
vẽ UI (tiến độ theo món, thanh tiến độ sàn) mà code không bao giờ render; một vùng đúng về cấu trúc
nhưng copy bị lệch; hai vùng phong phú hơn trong code so với tài liệu.

| Component | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| `OrderDetailCard` | ASCII hiện tiến độ nấu theo từng món `ra 1/2` / `còn 1`; bảng Zones = "items + progress of own order" (`customer_tracking.md:23-25,47`) | Render `x{quantity}` + tên + toppings + **giá dòng** + footer tổng; **không có tiến độ** (`OrderDetailCard.tsx:36-64,67-74`) | 🔴 | Vẽ lại ASCII thành danh sách dòng có giá + tổng; sửa hàng Zones thành "items + prices" |
| `WholeFloorPrepList` | ASCII hiện thanh tiến độ `▓▓▓▓░░` mỗi bàn + một hàng `Mang về` (`customer_tracking.md:29-31`) | Số vị trí + `tableLabel` + `StatusBadge` + hậu tố đơn; header `Hàng chờ phục vụ` + `{N} bàn` (`WholeFloorPrepList.tsx:27-82`) | 🔴 | Vẽ lại ASCII thành các hàng badge trạng thái, bỏ thanh tiến độ |
| `TableInfoBanner` | ASCII `Bàn 03 · [preparing]` + `Vị trí hàng đợi: 2/5 · ước tính ~8 phút` (`customer_tracking.md:18-20`) | Ô `Bàn` riêng + nhãn `Trạng thái:` + `StatusBadge` + `~X phút`; dòng hàng chờ `Vị trí hàng chờ: #N trong M đơn \| Chờ ~X phút`; **thêm trạng thái `delivered`** "Đơn của bạn đã được phục vụ — Cảm ơn!" không có trong ASCII (`TableInfoBanner.tsx:13,24-54`) | 🟡 | Sửa copy ("hàng đợi"→"hàng chờ"), thêm nhánh `delivered` vào ASCII |
| `MonitoringTopBar` | ASCII một dòng: `MonitoringTopBar  ● live / ○ mất kết nối` (`customer_tracking.md:13`) | Icon soup + tiêu đề "Theo Dõi Đơn Hàng" + subtitle "Bánh Cuốn" + pill LIVE/"Mất kết nối" (`MonitoringTopBar.tsx:13-39`) | 🟢 | Tuỳ chọn: ghi chú tiêu đề/subtitle trong ASCII |
| `ConnectionErrorBanner` | ASCII `⚠ ConnectionErrorBanner (if SSE down)` (`customer_tracking.md:14`) | Thanh đỏ cố định "⚠️ Mất kết nối — đang thử lại..." (`ConnectionErrorBanner.tsx:1-7`) | 🟢 | Khớp |

**Khớp đã xác minh:** danh mục vùng (5 component), ngữ nghĩa dấu chấm của `MonitoringTopBar`, hành vi
`ConnectionErrorBanner`, và toggle `showTable` (`page.tsx:134-140`, ASCII dòng 16) đều khớp.

---

## Mảng 2 — Luồng Dữ Liệu Cross-Component

**Kết luận:** ✅ Chính xác. `customer_tracking_crosscomponent_dataflow.md` truy vết đúng luồng
orchestrator → prop-drill fan-out (nguồn, hình dạng return, giá trị derived, props từng bước). Một **tự
mâu thuẫn bên trong**: file mô tả event `order.status` như thể nó hoạt động ở §2.1 + Step 5, rồi
phủ nhận đúng đắn điều đó ở §6 gotchas của chính mình.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Diễn giải `order.status` | §2.1 comment "orderStatus set by SSE event type 'order.status'"; Step 5 "BE publishes a `order.status` event… SSE wins" (`_crosscomponent_dataflow.md:112,265-277`) | Event không bao giờ đến (Flag 1); §6 của cùng file (`:365-372`) đã nói đúng điều này | 🟡 | Thêm chú thích "(never fires — see Flag 1)" vào §2.1 + Step 5 để khớp với §6 |
| Nguồn, hình dạng return, bản đồ prop | page đọc `activeOrderId` (`:18`), chạy query (`:21-34`) + SSE (`:36-37`), merge `effectiveStatus`/`tableLabel` (`:44-45`), prop-drill tới 4 widget | Tất cả xác nhận nguyên văn (`page.tsx:18,21-37,44-45,143-160`) | 🟢 | Không cần làm |
| Khóa persist `activeOrderId` | persist qua `STORAGE_KEYS.CART_CONFIG`, `cart.ts:153` partialize (`:183`) | `page.tsx:18` đọc `useCartStore(s=>s.activeOrderId)` ✅; dòng `cart.ts:153` partialize chính xác **không được mở lại** trong lần chạy này | ❓ | Kiểm chứng lại dòng partialize nếu cần dựa vào |

**Khớp đã xác minh:** các bảng prop (§1), bảng ba lớp state (§4), ranh giới cross-component vs
cross-page (§5), và timeline trình tự (§7) đều khớp với code.

---

## Mảng 3 — Luồng Dữ Liệu Cross-Page

**Kết luận:** ✅ Đúng theo thiết kế. **Không có** `customer_tracking_crosspage_dataflow.md`, và điều đó
là cố ý và đã được ghi lại: `/tracking` là consumer chỉ đọc, **không bao giờ ghi
`activeOrderId`** và không bàn giao gì; vòng đời cross-page được sở hữu bởi
`customer_menu_crosspage_dataflow.md` (`_crosscomponent_dataflow.md:342-359`).

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| `/tracking` ghi `activeOrderId`? | "never writes `activeOrderId`" (`_crosscomponent_dataflow.md:354`) | `page.tsx` chỉ đọc nó (`:18`); không có lời gọi `setActiveOrderId`/`clearCart` trong trang hoặc các component của nó | 🟢 | Không cần làm |

**Mối lo ngại cross-page (ghi vào TRACKER):** `customer_menu_crosspage_dataflow.md:271,284` liệt kê
`order.status` là event wire thật — nó ghi lại *kỳ vọng bị hỏng* của FE, không phải wire thực tế. Liên quan đến
`customer_menu` + `customer_tracking`; gốc rễ là cùng một sự không khớp Flag 1 (`TRACKING_BUGS.md:46-48`).

---

## Mảng 4 — Hành Vi Loading

**Kết luận:** ✅ Chính xác, từng dòng. `customer_tracking_loading.md` ánh xạ đúng 5 lớp,
5 nhánh ưu tiên, skeleton, và các trạng thái partial-data.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Bottom-nav skeleton | `❓ UNVERIFIED` liệu placeholder `fixed bottom-0 h-14` của skeleton có đối ứng live không (`_loading.md:221`) | Skeleton vẽ nó (`page.tsx:120`); bottom nav live là shell `ClientBottomNav` của `(shop)`, không phải trang (`page.tsx:125-164` chỉ có `pb-20`) — vậy placeholder mô phỏng nav shell, **cố ý** | 🟡 | Giải quyết ❓: "mirrors the `(shop)` shell bottom nav" |
| 5 nhánh ưu tiên + skeleton + query opts | `!orderId` / `isError&&!order` / `isUnauthorized` / `isLoading&&!order` / live; `staleTime:0`, `enabled:!!orderId`, retry bỏ qua 404 | Tất cả xác nhận (`page.tsx:48,69,90,111,125`; `:27,29,30-33`) | 🟢 | Không cần làm |

**Khớp đã xác minh:** ghi chú spinner route-level `(shop)/loading.tsx`, cổng Zustand, lớp SSE-không-chặn,
cờ code chết `showBannerAfter`, và bảng trạng thái partial-data đều khớp.

---

## Mảng 5 — Mô Hình Dữ Liệu FE⇄BE + Flags

**Kết luận:** ✅ Nội dung chính xác; chỉ có **số dòng được trích dẫn bị lệch** (tài liệu BE được viết
trên branch cũ hơn). Cả 6 Flag đều đúng so với source hiện tại (BE được xác minh bởi agent Sonnet đọc
`order_service.go`, `monitor_handler.go`, `main.go`, `order_handler.go`, `group_handler.go`).

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Flag 1 — không khớp `order.status` | FE nghe `order.status`; BE phát `order_status_changed` → badge bị cũ | ✅ Xác nhận: publisher tại `order_service.go:552,:745`; `"order.status"` chỉ trong comment `monitor_handler.go:17`; FE `useOrderMonitorSSE.ts:67` | 🔴 | Sửa code (1 dòng FE) — đăng ký vào MASTER trước |
| Flag 2 — `item_progress` không được tiêu thụ | BE phát `item_progress`; hook không có case | ✅ `publishItemEvent` phát `"item_progress"` (`order_service.go:998-1009`); không có case FE (`useOrderMonitorSSE.ts:66-89`) | 🟡 | Sửa code (FE) |
| Flag 3 — placeholder position/ETA | BE gửi `position:0`, `estimatedMinutes:0`; FE tính toán | ✅ `buildMonitorPayloads` để `Position`/`EstimatedMinutes` ở 0 (`order_service.go:876-928`); FE tính `idx+1`, `idx*3` (`useOrderMonitorSSE.ts:75-77`) | 🟡 | Bỏ field stub BE hoặc tính phía server |
| Flag 4 — SSE không kiểm tra quyền sở hữu | `StreamOrderMonitor` chỉ kiểm tra `:id` không rỗng | ✅ Xác nhận `monitor_handler.go:28-35`; không có cổng role/quyền sở hữu; REST read có guard `ErrForbidden` (`order_service.go:116-119`) | 🟡 | Ghi chú sự bất đối xứng; quyết định sản phẩm |
| Số dòng tài liệu | routes `main.go:236`/`:334`; handler `:125-137` | Bị lệch: `main.go:243-249` / `:347`; handler `:125-136` | 🟢 | Làm mới tham chiếu số dòng `_be.md` |
| Object model / bảng event | `GET /orders/:id` → Order+items+table_name; bảng event ánh xạ case FE → channel | ✅ Khớp FE `types/order.ts:38-52,56-72`; handler `order_handler.go:125-136`; fallback `extractEventType` là `group_updated` (`group_handler.go:87-95`) | 🟢 | Không cần làm |

**Khớp đã xác minh:** mô hình auth (cả hai route `authMW`, không có cổng role), guard quyền sở hữu REST,
khẳng định không có Redis-cache, `heartbeatInterval = 15s` (`handler.go:14`), và trace từng endpoint.

---

## Danh Sách Việc Cần Làm (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code | Sửa Flag 1: khớp với publisher — `case 'order_status_changed'` set `orderStatus` | `fe/src/hooks/useOrderMonitorSSE.ts:67` |
| 2 | 🔴 Sửa tài liệu | Vẽ lại ASCII `OrderDetailCard` thành danh sách dòng có giá + tổng; bỏ "progress" khỏi hàng Zones | `customer_tracking.md:23-25,47` |
| 3 | 🔴 Sửa tài liệu | Vẽ lại ASCII `WholeFloorPrepList` thành các hàng badge trạng thái; bỏ thanh `▓▓▓▓░░` + hàng `Mang về` | `customer_tracking.md:29-31` |
| 4 | 🟡 Code | Flag 2: thêm case `item_progress` (tăng `itemsChangedAt`); Bug 4: nối dây hoặc xóa `tableStatuses`/`reconnect`/`showBannerAfter` | `fe/src/hooks/useOrderMonitorSSE.ts` |
| 4b | 🟡 Code (dọn dẹp) | Xóa cặp hàng đợi sàn cũ không được tham chiếu (0 import; `WholeFloorPrepList` là cái đang dùng) | `fe/src/app/(shop)/tracking/components/ServiceQueueList.tsx` + `ServiceQueueItem.tsx` |
| 5 | 🟡 Sửa tài liệu | Thêm chú thích "(never fires — Flag 1)" vào crosscomponent §2.1 + Step 5; sửa copy ASCII `TableInfoBanner` + thêm trạng thái `delivered` | `customer_tracking_crosscomponent_dataflow.md:112,265-277` · `customer_tracking.md:18-20` |
| 6 | 🟡 Sửa tài liệu | Làm mới số dòng `_be.md` (`main.go:243-249`/`:347`, handler `:125-136`); giải quyết ❓ `_loading.md:221` (shell bottom nav) | `customer_tracking_be.md` · `customer_tracking_loading.md:221` |
| 7 | 🟡 Code | Flag 3: bỏ field stub BE `position`/`estimatedMinutes` hoặc tính phía server | `be/internal/service/order_service.go:876-928` |

> **Quy tắc CLAUDE.md:** các sửa tài liệu (hàng 2,3,5,6) là một task ALIGN. Mỗi thay đổi **code** (hàng 1,4,7)
> phải được đăng ký vào `docs/tasks/MASTER_TASK.md` và ALIGN **trước khi chạm vào bất kỳ file nào** —
> audit này chỉ phát hiện lệch; không sửa gì cả.
