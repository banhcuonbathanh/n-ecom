# So Sánh — Tài Liệu vs. Code — `/admin/summary` (Tổng kết nhà hàng)

> **Phạm vi:** kiểm toán chỉ-đọc bộ tài liệu `admin_summary` đối chiếu với code FE/Go đang chạy, trên
> 4 trục áp dụng được — **Hiển thị component · Luồng dữ liệu xuyên trang · Hành vi loading · Mô hình
> dữ liệu FE⇄BE**. (Trục 2 *Luồng dữ liệu xuyên-component* **không** áp dụng — trang này không có store
> chung và không có `_crosscomponent_dataflow.md`; mỗi component tự giữ `useState`/`useQuery` cục bộ.)
> **Chỉ-đọc — không sửa code và không sửa tài liệu trang.** Thực hiện bởi 2 agent Sonnet song song
> (BE+types, FE loading/crosspage); orchestrator đọc trọn `page.tsx` và tự tay xác minh lại mọi ứng
> viên 🔴 đối chiếu source. **Code thắng.** Nhánh: `experience_claude.md_system_1_test_iphon2_change_code`.
> Ngày: 2026-06-20.

---

## Tóm Tắt Điều Hành

| Trục | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Hiển thị component | ✅ Trung thực — mọi trích dẫn dòng trong bảng Zone khớp `page.tsx` chính xác | 0 | 1 | 6 |
| 3 — Luồng dữ liệu xuyên trang | ✅ Trung thực — invalidation + bàn giao raw-anchor đã xác nhận | 0 | 1 | 5 |
| 4 — Hành vi loading | ✅ Trung thực — 6 lớp + 4 skeleton đã xác nhận; tài liệu tự nêu đúng lỗ hổng `isError` | 0 | 1 | 12 |
| 5 — Mô hình dữ liệu FE⇄BE | ✅ Trung thực về hành vi; chỉ số dòng BE + một ghi chú route lân cận đã cũ | 0 | 2 | 20+ |
| **Tổng** | **Không có 🔴 — bộ tài liệu là tấm gương trung thực của code** | **0** | **5** | **40+** |

**Kết luận một đoạn:** Đây là bộ tài liệu độ trung thực cao. Mọi trích dẫn dòng FE trong
`admin_summary.md`, `_loading.md`, và `_crosspage_dataflow.md` rơi đúng vào dòng của
[summary/page.tsx](../../../../fe/src/app/(dashboard)/admin/summary/page.tsx) mà nó tuyên bố. Mọi tuyên
bố hành vi backend — mệnh đề SQL, key serializer, việc bỏ revenue cho chef, phép tính `pct`-trên-top-N,
stock-in không transaction, chính sách không-Redis, hợp đồng kiểu FE⇄BE — đều được xác nhận đối chiếu
source Go. **Không có 🔴**: không sai nguồn dữ liệu, không thiếu lời gọi, không luồng chết, không lỗi
sản phẩm phát sinh. Drift duy nhất là **lệch dòng cơ học** (khối route BE dịch ~13 dòng kể từ khi viết
`_be.md`) cộng **một câu chưa đầy đủ** (sub-group chỉ-admin gate hai DELETE, tài liệu nêu một). Riêng
biệt, tài liệu *mô tả đúng* hai lỗ hổng chất lượng code thực tế (không xử lý `isError`; dùng `<a>` thô
thay vì `next/link`) — đó là việc code cho task tương lai, không phải drift tài liệu.

---

## NHỮNG PHÁT HIỆN PHẢI LÊN TIẾNG

**Không có.** Không có 🔴 nào được xác minh-tay cho trang này. Cả hai ứng viên 🔴 của agent đều được
kiểm tra lại đối chiếu source và hạ cấp:

- Ứng viên "không có `isError` trên cả 4 `useQuery`" là **hành vi code thực nhưng không phải drift
  tài liệu** — `_loading.md` Flag 1 đã mô tả đúng. → ghi nhận là mục chất-lượng-code 🟡 bên dưới.
- Ứng viên "dùng `<a href>` thô thay vì `next/link`" là **thực nhưng đã được ghi nhận** —
  `admin_summary.md` Flag 6 và `_crosspage_dataflow.md` §3 đều nêu. → mục chất-lượng-code 🟡.
- Ứng viên "`admIngR` gate hai route, tài liệu nói một" là một sai sót tài liệu thật nhưng trên một
  **route lân cận mà trang này không bao giờ gọi** (`DELETE /ingredients/:id`,
  `DELETE /training/guides/:id`) — không ảnh hưởng sản phẩm. → sửa tài liệu 🟡 bên dưới.

> Kết quả trung thực: tiêu đề chính là sự *vắng mặt* của một tiêu đề. Trang làm đúng như tài liệu nói.

---

## Thành phần chết / không thể truy cập

- **Không có ở FE.** `page.tsx` không có component zero-import, không có modal không truy cập được,
  không có nhánh chết. Overlay duy nhất (`StockInModal`, `page.tsx:211-290`) truy cập được qua nút
  "+ Nhập hàng" trên từng dòng (`page.tsx:342-351`).
- **Mùi-nhỏ BE (không chết, không lỗi):** `analytics_handler.go:72` dựng một giá trị `gin.H{"revenue": …}`
  chỉ được dùng làm sentinel nil/non-nil để quyết định có gắn key `revenue` cho dòng non-chef hay không
  — một `bool` sẽ rõ ràng hơn. Không ảnh hưởng hành vi. Ngoài phạm vi sửa ở đây.

---

## Trục 1 — Hiển thị component

**Kết luận:** ✅ Trung thực. Bảng Zone (`admin_summary.md:59-66`) và wireframe ASCII ánh xạ 1-đối-1 tới
các component inline thực trong `page.tsx`. Mọi khoảng dòng trích dẫn đều chính xác.

| Component / Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| `RangeSelector` | `page.tsx:24-42`, `useState` cục bộ, không Zustand | `page.tsx:24-42` — chính xác; `range` từ `useState<SummaryRange>('today')` `page.tsx:366` | 🟢 | — |
| `SummaryKPICards` | `page.tsx:58-103`, 4 thẻ KPI | `page.tsx:58-103` — chính xác; 4 khối `KPICard` | 🟢 | — |
| `TopDishesList` | `page.tsx:107-147` | `page.tsx:107-147` — chính xác | 🟢 | — |
| `StaffPerfTable` | `page.tsx:159-201` | `page.tsx:159-201` — chính xác; `—` cho revenue chef `page.tsx:192` | 🟢 | — |
| `StockAlertList` | `page.tsx:292-361`, độc lập với range | `page.tsx:292-361` — chính xác; key `['admin','low-stock']` `page.tsx:295` | 🟢 | — |
| `StockInModal` | `page.tsx:211-290`, RHF+Zod `stockSchema` `:205-209` | `page.tsx:211-290`, `stockSchema` `page.tsx:205-209` — chính xác | 🟢 | — |
| Dòng provenance wireframe ASCII | "`page.tsx:365-383`" | Render trang là `page.tsx:365-384` (dấu `}` đóng ở 384) | 🟡 | Tăng dòng cuối 383→384 |

**Đã xác nhận-khớp:** nhãn tĩnh "Khách hôm nay" (`page.tsx:78`), sub-label "(delivered)" (`page.tsx:87`),
việc tách 🔴/🟡 ở FE `isCritical = ing.quantity < ing.warningThreshold` (`page.tsx:318`) — cả ba được ghi
là Flag trong `admin_summary.md` và cả ba khớp code. Danh sách flag của tài liệu là chính xác, không
phải mong muốn.

---

## Trục 3 — Luồng dữ liệu xuyên trang

**Kết luận:** ✅ Trung thực. Lần bàn giao bền vững duy nhất (ghi stock-in → dòng DB → trang lân cận) và
hai invalidation cache đúng như được vẽ. Không có SSE/WS trên trang — đã xác nhận (không có realtime
hook nào được import trong `page.tsx:1-12`).

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Invalidation stock-in | bust `['admin','low-stock']` **và** `['admin','ingredients']` | `page.tsx:225` + `page.tsx:226` — key chính xác | 🟢 | — |
| Payload ghi | `{ingredient_id, type:'in', quantity, note}` | `page.tsx:218-223` — chính xác | 🟢 | — |
| Ghi server bền vững | `current_stock += qty` + INSERT `stock_movements` | `ingredient_repo.go:221-248` — xác nhận, `in`→`current_stock + ?` | 🟢 | — |
| Không realtime | "không SSE/WS trên trang; chỉ refetch" | Không `useOrderSSE`/`useAdminSSE`/`useOverviewWS`/EventSource trong `page.tsx` | 🟢 | — |
| F5 reset `range` | reset về `'today'` (state cục bộ, không persist) | `page.tsx:366` `useState`, không persister | 🟢 | — |
| Link "Xem toàn bộ kho →" | `<a href="/admin/ingredients">` thô, nav cả-trang | `page.tsx:304` — xác nhận `<a>` thô, không phải `next/link` | 🟡 | Lỗ hổng UX thật (reload toàn trang). Tài liệu *nêu đúng* (`admin_summary.md` Flag 6). Task sửa code, không phải drift tài liệu. |

---

## Trục 4 — Hành vi loading

**Kết luận:** ✅ Trung thực. Cả 6 lớp loading và cả 4 skeleton từng-query đều khớp. Self-flag quan
trọng nhất của tài liệu — **không có `isError` trên bất kỳ query nào** — được xác nhận là đúng với code.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Lớp 1 `(dashboard)/layout.tsx` | bọc trong `OrdersWSProvider`, không UI loading | `(dashboard)/layout.tsx:1-5` — chính xác | 🟢 | — |
| Lớp 2 `AuthGuard` | trả `null` khi user null | `AuthGuard.tsx:23` — `if (!user) return null` | 🟢 | — |
| Lớp 3 `RoleGuard` | "Không có quyền truy cập trang này" nếu role<MANAGER | `RoleGuard.tsx:16-19` — chính xác; nối `admin/layout.tsx:30` `minRole={Role.MANAGER}` | 🟢 | — |
| Lớp 4 `admin/loading.tsx` | spinner cam `h-8 w-8 animate-spin border-t-orange-500` | `admin/loading.tsx:2-6` — chuỗi class chính xác | 🟢 | — |
| Lớp 5 không có `loading.tsx` ở summary | file không tồn tại | xác nhận — thư mục chỉ có `page.tsx` | 🟢 | — |
| 4 skeleton (số lượng/class) | KPI 4×`h-28`, top 5×`h-8`, staff 4×`h-8`, stock 3×`h-12` | `page.tsx:65-73 / 117-120 / 169-172 / 309-312` — đều chính xác | 🟢 | — |
| `staleTime` | 60_000 ×3, 120_000 low-stock | `page.tsx:62 / 111 / 163 / 297` — chính xác | 🟢 | — |
| Nút pending StockIn | `disabled={mut.isPending}`, nhãn "Đang lưu..." | `page.tsx:280` + `page.tsx:283` — chính xác; tài liệu trích `:279`, code bắt đầu `:278` | 🟡 | Tăng dòng trích `279`→`278` |
| **Không `isError` trên mọi query** | Flag 1: skeleton nhấp nháy mãi khi lỗi mạng | `page.tsx:59 / 108 / 160 / 294` — không cái nào destructure `isError` | 🟡 | Lỗ hổng code thật — tài liệu **đúng**. Thêm `isError`→UI lỗi/retry (task code tương lai). |

---

## Trục 5 — Mô hình dữ liệu FE⇄BE

**Kết luận:** ✅ Trung thực trên mọi tuyên bố hành vi và hợp đồng. Drift ở đây thuần cơ học: số dòng
route trong `_be.md` đã cũ (khối `adminR` dịch ~13 dòng), và một câu ngoặc đơn về sub-group chỉ-admin
chưa đầy đủ.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Dòng khối route `adminR` | group `main.go:294-295`; summary `:296`, top-dishes `:297`, staff-perf `:298`, low-stock `:300`, stock-mvt `:305` | group `main.go:307-308`; summary `:309`, top-dishes `:310`, staff-perf `:311`, low-stock `:313`, stock-mvt `:318` | 🟡 | Trích lại cả 5 dòng route (+`authMW` là `:164` không phải `:151`) |
| Sub-group chỉ-admin `admIngR` | "chỉ gate `DELETE /ingredients/:id`" (`main.go:311-315`) | `main.go:323-328` gate **hai**: `DELETE /ingredients/:id` (`:326`) **và** `DELETE /training/guides/:id` (`:327`) | 🟡 | Tài liệu bỏ sót DELETE thứ 2. Không ảnh hưởng trang này (không dùng route nào). Viết lại + trích lại. |
| SQL Summary (customers/dishes_sold/revenue/active_tables) | đếm non-cancelled · `IN('delivered','paid')` · `status='completed'` · bàn live độc lập range | `analytics_repo.go:63-107` — cả 4 mệnh đề xác nhận; `active_tables` không lọc ngày `:92-96` | 🟢 | — |
| `validRange` | chỉ `week`/`month` được tôn trọng, còn lại `today` | `analytics_service.go:19-26` — chính xác | 🟢 | — |
| Top-dishes `pct` trên top-N | `PctTimes100 = qty*10000/totalQty` của dòng trả về | `analytics_repo.go:150-153` — chính xác | 🟢 | — |
| Guard limit top-dishes | `>50` reset về `5` (không clamp) | `analytics_repo.go:110-112` — `if limit<=0 \|\| limit>50 { limit=5 }` | 🟢 | — |
| Bỏ revenue chef ở staff-perf | key `revenue` vắng khi `role=="chef"` | `analytics_handler.go:72-84` — gắn có điều kiện; kiểu FE `revenue?` optional `admin.api.ts:202-208` | 🟢 | — |
| Low-stock `WHERE current_stock <= min_stock*1.2` | item tới 1.2× ngưỡng | `ingredient_repo.go:120-141` — chính xác | 🟢 | — |
| `toIngredientJSON` key camelCase | `quantity`/`warningThreshold`/`importDate`/`shelfDays`/`expiryDate`/`status` | `ingredient_handler.go:28-43` — mọi key khớp; kiểu FE `Ingredient` khớp `admin.api.ts:223-235` | 🟢 | — |
| Response stock-mvt snake_case | `{id, ingredient_id, type, quantity, note, created_at}` | `ingredient_handler.go:195-202` — chính xác | 🟢 | — |
| Stock-in không transaction | 3 stmt tuần tự, không `BEGIN` | `ingredient_repo.go:221-248` — xác nhận; `in`&`adjustment`→`current_stock + ?` | 🟢 | — |
| Không Redis trên 5 endpoint | mọi read hit MySQL live | grep sạch — không `rdb`/`redis`/`cache` ở lớp analytics/ingredient | 🟢 | — |
| Kiểu FE summary/top-dish/staff | snake_case `dishes_sold`/`active_tables`; `pct`/`qty`; `staff_id`/`full_name` | `admin.api.ts:188-208` — mọi field khớp BE JSON | 🟢 | — |
| Dòng caller FE | `admin.api.ts:210-217, 264-265, 276-277` | `getSummary :210`, `getTopDishes :213`, `getStaffPerformance :216`, `getLowStock :264`, `postStockMovement :276` | 🟢 | — |

---

## Danh Sách Hành Động (theo thứ tự ưu tiên)

| # | Loại | Hành động | File đích |
|---|---|---|---|
| 1 | 🟡 Sửa tài liệu | Trích lại 5 dòng route `adminR` (`:309/:310/:311/:313/:318`) và `authMW` (`:164`) — khối dịch ~13 dòng | `admin_summary_be.md:23-38` |
| 2 | 🟡 Sửa tài liệu | Viết lại ghi chú `admIngR`: group chỉ-admin gate **hai** DELETE (`/ingredients/:id` + `/training/guides/:id`), tại `main.go:323-328` | `admin_summary_be.md:32-33` |
| 3 | 🟡 Sửa tài liệu | Tăng dòng trích FE cũ: provenance ASCII `383`→`384`; nút StockIn `279`→`278` | `admin_summary.md:53`, `admin_summary_loading.md:155` |
| 4 | 🟡 Lỗi code | Thêm xử lý `isError` cho 4 `useQuery` để fetch lỗi hiện UI lỗi/retry, không phải skeleton nhấp nháy mãi | `summary/page.tsx:59,108,160,294` |
| 5 | 🟡 Lỗi code | Thay `<a href="/admin/ingredients">` thô bằng `<Link>` của `next/link` để tránh reload toàn trang | `summary/page.tsx:304` |

> **Ghi chú CLAUDE.md:** mục 1–3 là một task sửa-tài-liệu. Mục 4–5 là thay đổi code — mỗi mục phải được
> đăng ký thành một dòng trong `docs/tasks/MASTER_TASK.md` và ALIGN với chủ sở hữu **trước khi** chạm
> bất kỳ file nào. File so sánh này tự nó không thay đổi gì.
