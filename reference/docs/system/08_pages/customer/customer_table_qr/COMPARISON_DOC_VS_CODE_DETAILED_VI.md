# So Sánh Chi Tiết Tài Liệu vs. Code · `customer_table_qr` (`/table/:tableId`)

> **Phạm vi:** rà soát chỉ đọc bộ tài liệu `/table/:tableId` (trang "airlock") so với code thật đang chạy. Các trục: ① Giao diện component · ③ Luồng dữ liệu cross-page · ④ Hành vi loading · ⑤ Mô hình dữ liệu FE⇄BE. **Mảng ② (luồng dữ liệu cross-component) là N/A** — đây là một component đơn 67 dòng, không có chia sẻ dữ liệu giữa các widget.
> **Chỉ đọc — KHÔNG sửa code ứng dụng và không sửa bất kỳ file tài liệu nào.** Chỉ 3 file so sánh + `COMPARISON_TRACKER.md` được ghi.
> Thực hiện bởi 1 agent Sonnet BE-trace + kiểm chứng FE nội tuyến bởi orchestrator; mọi mục 🔴 đã được **tự tay xác nhận lại** theo source.
> **Branch được kiểm tra:** `experience_claude.md_system_1_test_iphon2_change_code`. **Ngày:** 2026-06-21.
>
> **Kết luận chung:** đây là một trong những bộ tài liệu chính xác nhất được kiểm tra từ trước đến nay. Mọi claim về cross-page, loading, và BE đều truy nguyên được về code thật. **Mức độ lệch tài liệu-code gần như bằng không** — các lỗi duy nhất là số dòng cũ và tên branch provenance cũ. Các mục 🔴 bên dưới là **lỗi code thật mà bộ tài liệu đã tự ghi nhận một cách trung thực** (tài liệu tự gắn cờ chúng), không phải lỗi tài liệu.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Giao diện component | ✅ Chính xác — spinner + ASCII lỗi khớp hoàn toàn với `page.tsx` | 0 | 0 | 1 |
| ③ Luồng cross-page | ✅ Chính xác — mọi claim về store + trang downstream đều truy nguyên về code | 0 | 0 | 2 |
| ④ Hành vi loading | ✅ Chính xác — các nhánh, danh sách thư mục, không timeout đều được xác nhận | 0 | 0 | 0 |
| ⑤ Mô hình dữ liệu FE⇄BE | ✅ Chính xác — chuỗi handler→service→repo→SQL→JWT đều khớp | 0 | 0 | 3 |
| **Lỗi code cross-cutting** (tài liệu đúng, được bề mặt hóa) | ⚠️ Lỗi thật, đã được tài liệu gắn cờ | 2 | 1 | 0 |
| **Tổng** | **Bộ tài liệu trung thực; 🔴 là lỗi code, không phải lỗi tài liệu** | **2** | **1** | **6** |

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG"

> Cả hai mục 🔴 đều là **lỗi code/spec**, không phải lệch tài liệu. Bộ tài liệu đã đặt tên cho chúng — ghi lại ở đây vì TRACKER của skill phải ghi mọi mục 🔴, và mỗi mục là một khoảng trống sản phẩm/bảo mật thật sự.

1. **`TABLE_HAS_ACTIVE_ORDER` là dead end từ đầu đến cuối — quy tắc một đơn hàng active không được thực thi trong code.**
   FE xử lý đặc biệt error code này ở **3** chỗ — `table/[tableId]/page.tsx:36`,
   `(shop)/checkout/page.tsx:79`, `app/TableGrid.tsx:107` (xác nhận bằng
   `grep -rn TABLE_HAS_ACTIVE_ORDER fe/src` → đúng 3 hit đó). Nhưng `ErrTableHasActiveOrder`
   (`be/internal/service/errors.go:30`) được **định nghĩa và không bao giờ được trả về ở bất kỳ đâu trong `be/`** (grep →
   chỉ dòng định nghĩa). `AuthService.GuestLogin` (`auth_service.go:281-303`) không tra cứu đơn hàng active nào;
   `CreateOrder` (`order_service.go:256-275`) đặt một flag thông tin `tableBusy` mà
   "không bao giờ chặn việc tạo" và handler trả về `201` + `table_busy` (`order_handler.go:121`), không phải
   409. **Hệ quả:** khách quét lại bàn đang bận sẽ nhận JWT guest mới → `/menu` và có thể tạo
   **đơn hàng thứ hai đồng thời trên cùng một bàn**; quy tắc "một đơn hàng active mỗi bàn" trong BUSINESS_RULES §2.3 không được thực thi. Bộ tài liệu đã ghi nhận điều này (`TABLE_QR_BUGS.md` Bug 1). Cần quyết định sản phẩm (BE tự động rejoin vs. FE xóa nhánh chết) — đăng ký + ALIGN trước.

2. **Rate-limit của `POST /auth/guest` (BUSINESS_RULES §5.2 "5 req/min/IP") chưa được triển khai.**
   `be/internal/middleware/` chỉ chứa `auth.go`, `metrics.go`, `rbac.go` (xác nhận bằng `ls`);
   chuỗi global là `gin.Logger(), gin.Recovery(), Metrics()` + CORS (`main.go:117-118,133`). Không có
   middleware rate-limit và `GuestLogin` không có throttle trong process. Endpoint hoàn toàn public
   (`main.go:171`). File `_be.md` của trang đã gắn cờ điều này (Flag #5) — đây là **lệch spec→code trong
   `BUSINESS_RULES §5.2`**, một kiểm soát bảo mật được claim nhưng vắng mặt.

---

## Code chết / không thể chạm tới

- **Các nhánh catch `TABLE_HAS_ACTIVE_ORDER` — 3 nhánh, tất cả đều chết.**
  `table/[tableId]/page.tsx:36-38`, `(shop)/checkout/page.tsx:79-85`, `app/TableGrid.tsx:107` — BE
  không bao giờ phát ra code này (xem 🔴 #1). Mỗi nhánh là một `if` không thể chạm tới.
- **`ErrTableHasActiveOrder`** (`be/internal/service/errors.go:30`) — một giá trị lỗi được định nghĩa với không có
  `return` nào trong `be/`.
- **Lưu ý (không phải code chết):** `be/internal/repository/table_repo.go:71` có một `GetTableByQRToken` song song,
  nhưng auth service cố ý dùng SQL thô riêng `auth_repo.go:96-106`. Cả hai đều compile và có thể chạy tới;
  chỉ là cái sqlc không được dùng ở path này. Ghi chú về layering vô hại.

---

## Mảng ① — Giao Diện Component

**Kết luận:** ✅ Chính xác. Hai nhánh render trong ASCII wireframe của `customer_table_qr.md` khớp hoàn toàn
với `page.tsx` — spinner (mặc định) và màn hình lỗi.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Zone spinner | JSX inline `page.tsx:61-66`, `w-10 h-10 border-4 border-primary border-t-transparent animate-spin` + "Đang tải menu…" | Khớp hoàn toàn — `page.tsx:61-66` | 🟢 | — |
| Zone lỗi | JSX inline `page.tsx:46-59`, ⚠️ + "Mã bàn không hợp lệ…" + nút "Vào menu" → `router.replace('/menu')` | Khớp hoàn toàn — `page.tsx:46-59` (nút `:51-56`) | 🟢 | — |
| Branch provenance | tất cả header bộ tài liệu ghi branch `experience_claude.md_system_1` | Branch hiện tại là `experience_claude.md_system_1_test_iphon2_change_code` | 🟢 | Cập nhật dòng provenance ở lần chỉnh sửa tài liệu tiếp theo |

**Khớp đúng (không cần sửa):** map zone-to-`file:line` trong `customer_table_qr.md` §Zones; "không layout shell, không nav, full-screen cả hai trạng thái" (`page.tsx` không có import layout nào).

---

## Mảng ③ — Luồng Cross-Page

**Kết luận:** ✅ Chính xác. Mọi ghi store, quy tắc persist, và consumer trang downstream trong
`customer_table_qr_crosspage_dataflow.md` đều truy nguyên về code thật. Chỉ số dòng storage-key bị lệch.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| `useAuthStore` — không có `persist` | bare `create()`, không persist (`auth.store.ts:12`); `setAuth` (`:15`) | Khớp — `auth.store.ts:12` bare `create`, `setAuth` `:15`, `clearAuth` `:17` | 🟢 | — |
| `setTableId`/`setTableName` | `cart.ts:91-92`, chỉ trong bộ nhớ | Khớp — `cart.ts:91-92` | 🟢 | — |
| `clearCart` xóa binding bàn | `cart.ts:89` | Khớp — `cart.ts:89` reset `tableId,tableName,…` | 🟢 | — |
| `partialize` chỉ persist `orderNote`+`activeOrderId` | `cart.ts:153` | Khớp — `cart.ts:153` `partialize: (s) => ({ orderNote, activeOrderId })` | 🟢 | — |
| localStorage key `cart-config-v3` | `storage-keys.ts:5` | Chuỗi key đúng (`CART_CONFIG: 'cart-config-v3'`) nhưng ở **`storage-keys.ts:6`**, không phải 5 | 🟢 | Sửa ref dòng 5→6 |
| localStorage prefix `order_cache_` | `storage-keys.ts:4` | Đúng (`ORDER_CACHE: 'order_cache_'`) nhưng ở **`storage-keys.ts:3`**, không phải 4 | 🟢 | Sửa ref dòng 4→3 |
| Token được inject vào mọi request | `api-client.ts:11-14` Bearer từ `useAuthStore.getState().accessToken` | Khớp — `api-client.ts:11-14` | 🟢 | — |
| Guest 401 → `clearAuth()` + `/menu` | `api-client.ts:27-34` decode `sub`, guest → `clearAuth` + redirect | Khớp — `api-client.ts:27-37` (nhánh guest) | 🟢 | — |
| `/menu` đọc `{tableId,items}` + nhánh checkout | `menu/page.tsx:36,49` `tableId ? confirm : push('/checkout')` | Khớp — `menu/page.tsx:36,49` | 🟢 | — |
| `TableConfirmModal` post `source:'qr'` | `TableConfirmModal.tsx:14,19-26`, `buildOrderItemsPayload`, `cart.tableId`+`cart.items` | Khớp — `TableConfirmModal.tsx:14,20-26` | 🟢 | — |
| `/checkout` `table_id`/`source` | `checkout/page.tsx:53-54` `cart.tableId ?? null` / `'qr':'online'`; guard `:37`; cache `:66-70`; handler chết `:79` | Khớp — tất cả xác nhận `checkout/page.tsx:37,53-54,66-70,79` | 🟢 | — |
| `/order/:id` `useOrderSSE` + "Thêm món" | `order/[id]/page.tsx:41` SSE; `:573` setTableId+setActiveOrderId | `useOrderSSE` tại `:41` ✅; "Thêm món" set `setTableId(order.table_id!)`+`setActiveOrderId` tại `:573-575` ✅ | 🟢 | — |
| `/tracking` đọc `activeOrderId`; màn 401 | `tracking/page.tsx:18`; "Phiên làm việc hết hạn" `:90-107` | Khớp — `:18`, màn 401 `:90-107` (được điều khiển bởi `isUnauthorized` từ `useOrderMonitorSSE`, không phải `useOrderSSE`) | 🟢 | — |
| `useOrderSSE` đọc token + cache | `useOrderSSE.ts:30,35-38,55-57,70` | Khớp — token `:30`, cache `:33-38`, REST `:56`, SSE `:69-72` | 🟢 | — |

**Khớp đúng (không cần sửa):** sơ đồ "toàn cảnh" §0 (auth+cart chỉ trong bộ nhớ, chỉ `{orderNote, activeOrderId}` trong `cart-config-v3`); ma trận độ bền §9; nhánh chết §2 (xem 🔴 #1).

---

## Mảng ④ — Hành Vi Loading

**Kết luận:** ✅ Chính xác. Mọi claim loading trong `customer_table_qr_loading.md` đã được xác nhận, bao gồm
hai thực tế phủ định (không có `loading.tsx`, không có axios timeout) được kiểm chứng bằng danh sách thư mục và source.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Chỉ có `page.tsx` trong thư mục route | không có `loading.tsx`/`layout.tsx`/`error.tsx` trong `table/[tableId]/` | Xác nhận bằng `ls` — chỉ có `page.tsx` | 🟢 | — |
| `(shop)/loading.tsx` tồn tại, không bao phủ route này | `fe/src/app/(shop)/loading.tsx` tồn tại; route nằm ngoài `(shop)/` | Xác nhận bằng `ls` — file tồn tại; `/table/` ở segment gốc | 🟢 | — |
| `useState` cục bộ, không có TanStack Query | `page.tsx:14` `useState<string\|null>` | Khớp — `page.tsx:14` | 🟢 | — |
| `useEffect` dep `[params.tableId]`, không có abort | `page.tsx:16-44`, không có cleanup/AbortController | Khớp — `page.tsx:16-44`, không có return fn | 🟢 | — |
| Hai nhánh render | lỗi `:46-59`, spinner `:61-66` | Khớp | 🟢 | — |
| axios không có `timeout` | `api-client.ts:6-9` `axios.create` không có key timeout | Khớp — `api-client.ts:6-9`, axios mặc định `0` (tắt) | 🟢 | — |
| Redirect `TABLE_HAS_ACTIVE_ORDER` chết | `page.tsx:36-38` không thể chạm tới (Gap 2) | Xác nhận là chết (xem 🔴 #1) | 🟢 | — (xem 🔴 #1) |

---

## Mảng ⑤ — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** ✅ Chính xác trên mọi claim hành vi. Chuỗi handler→service→repo→SQL→JWT trong
`customer_table_qr_be.md` khớp chính xác với source; chỉ số dòng route-section trong `main.go` bị cũ
(file đã tăng thêm ~10-13 dòng kể từ khi tài liệu được viết).

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Handler `Guest` | `auth_handler.go:182-207`, bind `len=64`, serialize `access_token,expires_in,table{id,name,capacity,status}` | Khớp — handler `:182`, bind `:176-178`, response `:195-207` | 🟢 | — |
| Service `GuestLogin` | `auth_service.go:281-303`, `GetTableByQRToken`→`GenerateGuestToken`, **không có active-order check** | Khớp — `:281-303`, call `:282`, JWT `:290`, trả `ExpiresIn:7200` `:297` | 🟢 | — |
| Repo SQL thô | `auth_repo.go:96-106`, SQL viết tay `… WHERE qr_token=? AND is_active=1 AND deleted_at IS NULL LIMIT 1` | Khớp — `:96-106`, SQL `:97-98` | 🟢 | — |
| JWT mint | `jwt.go:73-92`, `sub=guest`,`role=customer`,`table_id`,`exp=+2h`, err nếu không có secret | Khớp — `:73-92` (`Subject "guest"` `:82`, `2h` `:84`, `TableID` `:88`) | 🟢 | — |
| Route là public | `main.go:158`, trên `protected` `:159-164` | Public ✅ nhưng dòng thực tế `main.go:171` (route), `:173-177` (protected) | 🟢 | Sửa ref dòng `main.go` (~+10-13) |
| Error mapping | `respond.go:24-36` ErrNotFound→404, fallback 500 COMMON_002 `:34-35` | Kết quả đúng; cơ chế là `errors.As(&AppError)` (`respond.go:25-32`), `ErrNotFound` chính nó là `*AppError{404}` (`errors.go:28`) — không phải một case hard-code | 🟢 | Làm rõ cách diễn đạt cơ chế |
| `ErrTableHasActiveOrder` không bao giờ được trả về | `errors.go:30` được định nghĩa, không bao giờ được trả về trong `be/` | Xác nhận — grep → chỉ có dòng định nghĩa | 🟢 | — (xem 🔴 #1) |
| Không có middleware rate-limit | được claim trong BUSINESS_RULES §5.2, không có trong code | Xác nhận vắng mặt (xem 🔴 #2) | 🔴 | Sửa BUSINESS_RULES §5.2 hoặc triển khai |

**Khớp đúng (không cần sửa):** các field response bị FE bỏ qua (`expires_in`,`capacity`,`status`); `is_active=0`/
soft-deleted → cùng 404; `tableBusy` thông tin + 201 (`order_service.go:256-275`,
`order_handler.go:121`).

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | Mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code (quyết định sản phẩm) | Quyết định: BE tự động rejoin (trả về `ErrTableHasActiveOrder` kèm `active_order_id`) **hoặc** FE xóa 3 nhánh chết. Thực thi (hoặc hủy bỏ trung thực) quy tắc một-đơn-hàng-active. | `be/internal/service/auth_service.go` + `order_service.go` **hoặc** `table/[tableId]/page.tsx:36`, `checkout/page.tsx:79`, `TableGrid.tsx:107` |
| 2 | 🔴 Lệch spec/code | Triển khai rate-limit §5.2 cho `POST /auth/guest`, hoặc sửa BUSINESS_RULES §5.2 cho khớp với thực tế | `be/internal/middleware/` (mới) **hoặc** `docs/.../BUSINESS_RULES.md §5.2` |
| 3 | 🟡 Độ bền code | Thêm axios `timeout` + `AbortController` vào effect airlock (spinner có thể treo mãi) | `fe/src/lib/api-client.ts:6`, `fe/src/app/table/[tableId]/page.tsx:16-44` |
| 4 | 🟢 Sửa tài liệu | Ref dòng storage-key: `cart-config-v3` 5→6, `order_cache_` 4→3 | `customer_table_qr_crosspage_dataflow.md §10` |
| 5 | 🟢 Sửa tài liệu | Ref dòng route-section `main.go` (~+10-13): 148→161, 154→167, 158→171, 159-164→173-177, CORS 126→133 | `customer_table_qr_be.md` |
| 6 | 🟢 Sửa tài liệu | Cập nhật tên branch provenance trong tất cả 6 header bộ tài liệu → `…_test_iphon2_change_code` | tất cả `customer_table_qr/*.md` |

> Theo `CLAUDE.md`: các sửa tài liệu (#4–#6) là **một** task; mỗi thay đổi **code** (#1–#3) phải được đăng ký vào
> `MASTER_TASK.md` và ALIGN **trước khi chạm vào bất kỳ file nào**. Bản kiểm tra này không thay đổi gì.
