# Customer Order Detail — So Sánh Chi Tiết Tài Liệu vs. Code (4 Mảng)

> **Phạm vi:** rà soát sâu bộ tài liệu `customer_order_detail` so với code thật của trang `/order/:id`
> theo các trục áp dụng: (1) giao diện component · (3) luồng dữ liệu cross-page Zustand/SSE · (4) hành
> vi loading · (5) mô hình dữ liệu FE⇄BE. **Mảng 2 (luồng cross-component) là N/A** — trang này không có
> `_crosscomponent_dataflow.md`, và hầu như toàn bộ được render từ một file (`order/[id]/page.tsx`)
> cùng hook `useOrderSSE`, nên các tương tác store của nó thuộc cross-page (Mảng 3).
> **Chỉ đọc — KHÔNG sửa code hoặc tài liệu.** Thực hiện **trực tiếp** (không dùng sub-agent): trang chỉ
> gồm hai file nguồn (`page.tsx` 783 dòng + `useOrderSSE.ts` 160 dòng`) + các atom dùng chung, đã đọc
> đầy đủ vào context — tách agent chỉ đọc lại những gì đã truy vết. Các mục 🔴 đã được **tự tay kiểm
> chứng lại** (kèm grep dẫn inline).
> Nhánh được kiểm tra: `experience_claude.md_system_1_test_iphon2_change_code`.
> Ngày: 2026-06-21.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 · Giao diện component | **Wireframe (`.md`) là file lỗi thời** — code phong phú hơn bản vẽ | 0 | 5 | 4 |
| 3 · Luồng cross-page | **Chính xác** — partialize, cache, nav writes, bảng SSE đều khớp | 0 | 0 | nhiều ✅ |
| 4 · Hành vi loading | **Gần như hoàn hảo** — skeleton, các nhánh, reconnect đều xác nhận | 0 | 0 | 1 |
| 5 · Mô hình dữ liệu FE⇄BE | Chính xác; Flags 1–5 của `_be.md` vẫn đúng; 1 khoảng trống model (`filling`) | 0 | 2 | vài ✅ |
| (cross-cutting) Lỗi code | **2 lỗi FE đã được ghi nhận — xác nhận lại** (tài liệu đúng) | 2 | 1 | — |

> **Điểm nổi bật của lần rà soát này:** khác với `customer_menu`, bộ tài liệu này **không có mâu thuẫn
> 🔴 nào giữa tài liệu và code**. 2 mục 🔴 dưới đây là **lỗi CODE mà bộ tài liệu đã ghi nhận trung
> thực** trong `ORDER_DETAIL_BUGS.md` + Flags 1–2 của `_be.md` — tức là tài liệu *đúng/đồng thuận*,
> không bị lệch. Sự lệch chỉ giới hạn ở wireframe ASCII/Zones của `customer_order_detail.md` (Mảng 1).

**🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng — lỗi CODE, tài liệu đã đúng):**
1. **Chỉnh số lượng không phản ánh live.** Stepper gọi `PATCH /orders/items/:id/quantity`; BE
   publish `type:"item_updated"` (`order_service.go:696`), nhưng `onmessage` switch của `useOrderSSE`
   **không có case `item_updated`** (`useOrderSSE.ts:83-123` chỉ xử lý `order_init`,
   `order_status_changed`, `order_cancelled`, `item_progress`, `order_completed`). `invalidateQueries({queryKey:['order',params.id]})` trong `onSuccess` của mutation (`page.tsx:59`) là **no-op** — không có `useQuery(['order',…])` nào tồn tại ở bất kỳ đâu. Số lượng mới + tổng tiền tính lại chỉ xuất hiện sau khi tải lại trang. (Nhà tài liệu: `ORDER_DETAIL_BUGS.md` Bug 1 · `_be.md` Flag 1.)
2. **Món bị huỷ vẫn hiện trên màn hình.** `DELETE /orders/items/:id` publish `type:"item_cancelled"`
   (`order_service.go:642`); `useOrderSSE` **không có case `item_cancelled`** (`useOrderSSE.ts:83-123`),
   và các mutation huỷ không re-seed (`page.tsx:68-77`). Hàng đó vẫn còn cho đến khi tải lại trang. `items_added` liên quan (`order_service.go:516`) là **khoảng trống tương tự** (🟡) — một thiết bị còn mở sẽ không thấy các món được thêm qua "Thêm món". Tương phản: `useOrderMonitorSSE` (hook `/tracking`) **có xử lý** cả ba (`useOrderMonitorSSE.ts:84-86`). (Nhà tài liệu: `ORDER_DETAIL_BUGS.md` Bug 2 · `_be.md` Flag 2.)

**Code đã chết / không thể chạm tới:**
- **Case SSE `order_init` là code chết** (`useOrderSSE.ts:84-85`). Không có publisher nào emit `order_init` — `grep 'publishOrderEvent(ctx, "'` trên `order_service.go` chỉ trả về `new_order`, `items_added`,
  `order_status_changed`(×2), `order_cancelled`, `item_cancelled`, `item_updated`. SSE handler gửi `connected`, không bao giờ gửi `order_init` (`sse/handler.go:50`). Snapshot REST seed state thay thế.
  (`_be.md` Flag 5 đã nghi ngờ điều này — nay **xác nhận là code chết**.)
- **`row.notes` được tính nhưng không bao giờ được render.** Memo tóm tắt thu thập ghi chú theo sản phẩm vào `SummaryRow.notes` (`page.tsx:35,111,127-128`), nhưng JSX của bảng tóm tắt (`page.tsx:434-499`) chỉ render `row.toppings` — `row.notes` không bao giờ được đọc. Giá trị tính toán chết.

---

## Mảng 1 — Giao Diện Component

**Kết luận:** ASCII + bảng Zones của `customer_order_detail.md` là file ít được bảo trì nhất trong bộ.
Trang live render nhiều hơn wireframe vẽ (tổng tiền trong header order-card, toggle ẩn/hiện,
nút "Theo dõi bàn", fallback mang về), và một số nhãn/nguồn bị vẽ sai. Không có lỗi nguồn dữ liệu nào thuộc hạng `MenuHeader` — tất cả đều là lệch wireframe-copy.

| Component | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| **Nav right slot** | ASCII vẽ `[StatusBadge]`; hàng bảng Zones "Nav + status → `components/shared/StatusBadge`" (`customer_order_detail.md:20,55`) | Nav right slot là **pill kết nối** "LIVE" / "MẤT KẾT NỐI" (`page.tsx:282-292`). `StatusBadge` thực ra nằm **bên trong order card** (`page.tsx:308`), không phải ở nav | 🟡 | Vẽ lại nav: phải = pill LIVE/MẤT KẾT NỐI; chuyển StatusBadge vào hàng order-card. (`_loading.md` đã ghi đúng pill này.) |
| **Order-card header** | `┃ Bàn 03  #BC-0042  [preparing]  12 phút` (`customer_order_detail.md:23`) | Cũng render **`total_amount`** (`formatVND`, `page.tsx:310`) và **toggle thu gọn `Ẩn`/`Hiện`** (`page.tsx:312-318`); ô bàn fallback thành **"Mang về"** khi `table_name` null (`page.tsx:304-306`) | 🟡 | Thêm tổng tiền + toggle thu gọn + fallback "Mang về" vào ASCII. |
| **DishRow** | `● Bánh cuốn thịt · thịt  ra 1/1  ✓` / `● Canh mọc · có rau  còn 1 [Huỷ]` (`customer_order_detail.md:26-28`) | Topping render dạng **chip pill** `+ {name}` bên dưới tên, không phải inline "· thịt" (`page.tsx:711-724`); `note`/filling theo từng món **KHÔNG được render** trong DishRow; phía phải hiện ba phân đoạn `tổng ×N · ra ×N · còn ×N` / `✓ xong` (`page.tsx:739-756`); stepper nằm dòng riêng với nhãn "Số lượng:" (`page.tsx:726-736`) | 🟡 | Vẽ lại DishRow: chip topping bên dưới tên; bỏ nhãn "· filling" theo từng món (chỉ tổng hợp — xem hàng tiếp theo); hiện các phân đoạn `tổng/ra/còn` + `✓ xong`. |
| **Nhãn filling theo từng món ("· thịt"/"· có rau")** | ASCII đặt filling trên từng hàng món; footer "2 có rau · 1 không rau" (`customer_order_detail.md:26-29`) | Tách thành hai nơi mang dữ liệu: **nhân ("thịt") → `toppings_snapshot`** chip bên dưới tên (có render, `page.tsx:711-724`); **canh "có rau" → `note`**, chỉ render **dạng tổng hợp** dòng `noteCounts` bên dưới danh sách món (`page.tsx:391-400`), không bao giờ theo từng hàng | 🟡 | Tài liệu: nhân = chip topping; canh-rau = footer tổng hợp, không phải hậu tố theo từng món. |
| **Bảng tóm tắt** | Header "Tổng hợp món (toggle)"; footer "Còn lại / Tổng" (`customer_order_detail.md:31,35-36`) | Nhãn header là **"Chi tiết món"** (`page.tsx:413`); cột `Tên món · SL · Ra · Còn · Đơn giá · Tổng` (`page.tsx:423-431`); footer là **"Tổng tiền còn lại"** + **"Tổng tất cả món"** (`page.tsx:505,510`); nút **"Huỷ"** theo từng sản phẩm bên phải khi remaining>0 (`page.tsx:484-497`) | 🟡 | Sửa nhãn header + footer; ghi chú nút Huỷ theo từng hàng. |
| **Nút dưới cùng** | Chỉ `[Huỷ đơn hàng]` + `[+ Gọi thêm món]` (`customer_order_detail.md:43-44`) | Nút **"Theo dõi bàn"** (`MapPin`, `page.tsx:563-569`) render bên trái nút thêm khi `isActive`; nhãn nút thêm là **"Thêm món"** / **"Đặt thêm món"** (không phải "Gọi thêm món") và cả hàng bị gating theo `order.table_id` (`page.tsx:560-581`) | 🟢 | Thêm "Theo dõi bàn"; sửa nhãn nút thêm + điều kiện gating `table_id`. |
| **Nhãn tóm tắt tiền** | "Đã ăn / Chưa ra / Tổng cộng" (`customer_order_detail.md:38-40`) | "Đã dùng (N phần) / Còn lại (N phần chưa ra) / Tổng cộng" (`page.tsx:521-533`); hàng "Còn lại" chỉ render khi `remainingAmount > 0` (`page.tsx:525`) | 🟢 | Cập nhật nhãn + ghi chú hàng có điều kiện. |
| **Dấu xong / header combo** | món xong = `✓`; combo = chỉ tên (`customer_order_detail.md:25,26`) | xong = **"✓ xong"** (`page.tsx:754`); header combo hiện **số "{n} món"** + chevron (`page.tsx:343-348`) | 🟢 | Cosmetic. |
| **Banner hoàn tất** | `✓ banner "Đơn đã hoàn tất" (delivered only)` (`customer_order_detail.md:42`) | Chữ thật: **"Đơn hàng đã hoàn thành"** + subtitle, thẻ xanh, chỉ trạng thái `delivered` (`page.tsx:539-547`) | 🟢 | Sửa cosmetic chữ. |

**Đã xác nhận khớp:** thanh tiến trình (`page.tsx:321-324`), nhóm combo thu gọn được (`page.tsx:336-376`),
gating nút huỷ-toàn-bộ-đơn theo `canCancelOrder` (`page.tsx:550-557`), modal thông báo
confirmed/ready/cancelled (`page.tsx:587-637`), modal xác nhận huỷ (`page.tsx:640-674`), và
**`ClientBottomNav`** — hàng bottom-tab-bar trong tài liệu là **đúng**: được render một lần bởi shell
`(shop)/layout.tsx:12`, không phải bởi trang.

---

## Mảng 3 — Luồng Cross-Page (Zustand + SSE)

**Kết luận:** `customer_order_detail_crosspage_dataflow.md` là **chính xác end-to-end** — mọi field
store, key, quy tắc persist, navigation write, và claim về xử lý SSE đều trace sạch. Một trong hai
mục `❓ UNVERIFIED` tự ghi nhận của nó nay có thể được **giải quyết**.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Publisher `order_init` (tài liệu `❓ UNVERIFIED`, ghi chú §6) | "có thể là code chết" | **Xác nhận là code chết** — không có `publishOrderEvent(ctx,"order_init",…)` nào ở bất kỳ đâu (grep `order_service.go`); handler chỉ gửi `connected` (`sse/handler.go:50`) | 🟢 | Nâng cấp ghi chú tài liệu từ ❓ thành "xác nhận là code chết"; đánh dấu case FE để xoá. |
| Whitelist partialize | `{ orderNote, activeOrderId }` | đúng như vậy (`cart.ts:153`) | 🟢 | Không cần làm. |
| `setTableId` chỉ trong bộ nhớ / `setActiveOrderId` được persist / `clearCart` reset `activeOrderId` | như tài liệu | `cart.ts:91,93,89` — `setTableId` không có trong partialize; `clearCart` set `activeOrderId:null` | 🟢 | Không cần làm. |
| Storage keys | `ORDER_CACHE='order_cache_'`, `CART_CONFIG='cart-config-v3'` | đúng như vậy (`storage-keys.ts:3,6`) | 🟢 | Không cần làm. |
| 3 navigation-button writes (Theo dõi bàn / Thêm món / Đặt thêm món) | bảng write trong §2b | khớp `page.tsx:560-581`: "Theo dõi bàn" chỉ set `activeOrderId`; "Thêm món" set `tableId`+`activeOrderId`; "Đặt thêm món" set `tableId`+`activeOrderId=null` | 🟢 | Không cần làm. |
| Bảng SSE event (§6) — đã xử lý vs bị bỏ qua | `item_cancelled`/`item_updated`/`items_added` chưa xử lý; phần còn lại đã xử lý | đúng như vậy — switch tại `useOrderSSE.ts:83-123` | 🟢 | Không cần làm (đây là bề mặt lỗi; xem phần headlines). |
| `useOrderMonitorSSE` xử lý `item_updated`+`item_cancelled` (ghi chú §3) | như tài liệu | `useOrderMonitorSSE.ts:84-86` cũng xử lý `items_added` | 🟢 | Không cần làm. |

> `❓ UNVERIFIED` thứ hai của tài liệu (liệu `/menu` có guard `activeOrderId` đã-bị-huỷ sau khi huỷ
> toàn bộ đơn hay không, ghi chú §7) là **ngoài phạm vi trang này** — nó thuộc về `/menu`. Giữ nguyên.

---

## Mảng 4 — Hành Vi Loading

**Kết luận:** `customer_order_detail_loading.md` là **gần như hoàn hảo** — thứ tự ưu tiên ba nhánh,
cấu trúc skeleton (từng dòng), pill kết nối, `ConnectionErrorBanner`, và các hằng số reconnect đều
khớp. Không có lệch hành vi nào.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Thứ tự ưu tiên nhánh | `isNotFound` → skeleton `!order` → live | đúng như vậy (`page.tsx:155,175,270`) | ✅ | — |
| Các phần skeleton | nav + order card + table + money + button | đúng như vậy (`page.tsx:177-227`) | ✅ | — |
| Hằng số reconnect | maxAttempts 5 · baseDelay 1000 · maxDelay 30000 · showBannerAfter 3 | đúng như vậy (`useOrderSSE.ts:16-21`) | ✅ | — |
| Chữ trên pill kết nối | "LIVE" / "MẤT KẾT NỐI" | đúng như vậy (`page.tsx:282-292`) | ✅ | — |
| `invalidateQueries` no-op (Flag 2) | code chết | xác nhận (`page.tsx:59`, không có `useQuery`) | ✅ | — |
| Danh sách nguồn của `_loading.md` dẫn `(shop)/loading.tsx` cho route spinner | route-level spinner tồn tại | shell nay dùng padding `pb-[calc(72px+…)]` trong `(shop)/layout.tsx`; `loading.tsx` vẫn là route spinner (chưa xác minh lần này — không nằm trên đường trace đã kiểm tra) | 🟢 | Tuỳ chọn: xác nhận lại hình dạng `(shop)/loading.tsx` trong lần rà soát sau. |

---

## Mảng 5 — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** `customer_order_detail_be.md` là một **file mạnh, trace từ source** — bảng 5 endpoint,
mô hình auth-by-table, các phần caching/error, và Flags 1–5 đều chính xác và vẫn đúng. Một khoảng
trống FE model xuất hiện xung quanh `filling`.

| Object.Attr | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| `OrderItem.filling` | Narrative OC-1/OC-4 của CLAUDE.md nói cột `filling` tồn tại và "order/[id] DishRow renders filling" | **Cột `filling` đã bị xoá** — `016_add_order_item_filling.sql` rồi `017_drop_order_item_filling.sql`. FE `OrderItem` **không có field `filling`** (chỉ có `note`, `types/order.ts:24`); serializer không phát `filling` (`order_handler.go`, chỉ có `Note`+toppings_snapshot); `page.tsx` grep → 0 hit `filling`. **Nhân (thịt/mộc nhĩ) đã được backfill vào `toppings_snapshot`** → render dạng chip ở DishRow (`page.tsx:711-724`); **canh "có rau"/"không rau" nằm trong `note`** → chỉ hiện dạng tổng hợp `noteCounts` (`page.tsx:391-400`). Cùng phát hiện với `customer_order_list` 🔴 #1 | 🟡 | Sửa tài liệu: narrative OC của CLAUDE.md + mọi claim "renders filling" đã cũ — ghi nhân nằm ở `toppings_snapshot`, canh-rau ở `note`; không có field `filling`. |
| Render `note` | note theo từng món được ngụ ý trong wireframe | `note` chỉ render dạng tổng hợp (`page.tsx:391-400`); được thu thập vào `row.notes` nhưng **không bao giờ hiện** (`page.tsx:127-128` vs JSX `:434-499`) | 🟡 | Sửa tài liệu (Mảng 1) + đánh dấu `row.notes` là giá trị tính toán chết (Dọn code). |
| Endpoint `patchOrderItemQty` | `PATCH /orders/items/:id/quantity` body `{quantity}` | đúng như vậy (`api-client.ts:72-73`) | 🟢 | Không cần làm. |
| Bộ 5 endpoint + `item_updated` độc nhất của trang này | như tài liệu | các dòng `publishOrderEvent` xác nhận 696/642/516/552/593/348/745 (`order_service.go`) | 🟢 | Không cần làm. |
| Hình dạng `OrderItem` | `id, product_id?, combo_id?, combo_ref_id?, name, quantity, qty_served, unit_price, note?, toppings_snapshot?, flagged` | đúng như vậy (`types/order.ts:15-27`) — bao gồm `flagged: boolean` | 🟢 | Không cần làm (`flagged` không được đọc bởi zone nào của Mảng 1; vô hại). |

**Đã xác nhận khớp:** bảng 5 endpoint của `_be.md`, cổng ownership auth-by-table, cờ no-ownership-check + no-replay (3–4), và cờ dead-end `item_updated`/`item_cancelled` (1–2, 5) — tất cả đã xác nhận so với `useOrderSSE.ts` + grep `order_service.go`.

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code | Thêm case `item_updated` vào `useOrderSSE` (re-fetch `GET /orders/:id` hoặc patch) để chỉnh số lượng phản ánh live; xoá `invalidateQueries` chết | `fe/src/hooks/useOrderSSE.ts`, `fe/src/app/(shop)/order/[id]/page.tsx:59` |
| 2 | 🔴 Lỗi code | Thêm case `item_cancelled` (và đón `items_added`) vào `useOrderSSE` để huỷ/thêm phản ánh live — một bản sửa re-fetch-on-unhandled-event đóng cả ba; cũng sửa overlay C9 | `fe/src/hooks/useOrderSSE.ts` |
| 3 | 🟡 Sửa tài liệu | Viết lại lệch Mảng 1 trong `customer_order_detail.md`: pill nav (không phải StatusBadge), order-card tổng tiền + thu gọn + "Mang về", DishRow chip + `tổng/ra/còn` + không có filling theo từng món, "Chi tiết món"/nhãn footer tóm tắt, nút "Theo dõi bàn", nhãn money-card | `customer_order_detail.md` |
| 4 | 🟡 Dọn code | Xoá case SSE `order_init` chết + giá trị tính toán `row.notes` chết | `useOrderSSE.ts:84-85`, `order/[id]/page.tsx:35,111,127-128` |
| 5 | 🟡 Sửa model | Quyết định về `filling`: thêm vào FE type `OrderItem` + render, hoặc ghi nhận là đã gấp vào `note` | `fe/src/types/order.ts`, `customer_order_detail.md` / `_be.md` |
| 6 | 🟢 Lỗi nhỏ tài liệu | Giải quyết `❓` `order_init` §6 của `_crosspage_dataflow.md` → "xác nhận là code chết"; tuỳ chọn xác nhận lại `(shop)/loading.tsx` | bộ tài liệu |

> Theo `CLAUDE.md` (MASTER trước + scope contract): các bản sửa tài liệu (#3, #5-doc, #6) là **một**
> task; mỗi thay đổi code (#1, #2, #4, #5-code) phải được đăng ký vào `MASTER_TASK.md` trước khi chạm
> vào bất kỳ file nào. Lỗi #1–#2 đã được theo dõi trong `ORDER_DETAIL_BUGS.md` nhưng **chưa có trong `MASTER_TASK.md`**.
