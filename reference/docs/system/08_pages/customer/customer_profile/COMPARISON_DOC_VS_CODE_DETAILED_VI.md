# Customer Profile — So Sánh Chi Tiết Tài Liệu vs. Code (`/profile`)

> **Phạm vi:** rà soát bộ tài liệu `customer_profile` so với code FE/BE thật trên nhánh hiện tại,
> theo các trục: **(1) giao diện component · (4) hành vi loading · (5) mô hình dữ liệu FE⇄BE**.
> Mảng **2 (luồng cross-component)** và **3 (luồng cross-page)** là **N/A** —
> trang không có shared store và không có lần ghi nào tồn tại qua nhiều trang hôm nay (lần ghi duy nhất
> có chủ đích, `setCustomerName`, bị chặn sau một PUT trả 404); chính bộ tài liệu bỏ qua cả hai file
> và giải thích lý do
> ([SCENARIO_PROFILE.md §A/§B](SCENARIO_PROFILE.md)). **Chỉ đọc — KHÔNG sửa code hoặc tài liệu.**
> Thực hiện **trực tiếp** (trang nhỏ: 5 component đơn giản, 0 BE endpoint đang chạy để trace); mục 🔴
> duy nhất được **tự tay kiểm chứng lại** (grep toàn repo). Ngày: 2026-06-21.
>
> **Tóm lược:** đây là bộ tài liệu **gần như không có lệch**, giống `customer_combo_detail` /
> `customer_table_qr`. Phát hiện nghiêm trọng duy nhất — cả hai endpoint `/customer/profile` chưa được
> triển khai — là **lỗi CODE** mà bộ tài liệu **đã ghi chính xác**; lần chạy này chỉ tái xác minh, đây
> **không phải** mâu thuẫn tài liệu-vs-code.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Giao diện component | ✅ Chính xác; 2 lệch nhỏ về layout ASCII | 0 | 2 | 1 |
| 4 — Hành vi loading | ✅ Khớp hoàn toàn — cấu hình query, skeleton, ưu tiên 4 trạng thái đều khớp | 0 | 0 | 0 |
| 5 — Mô hình dữ liệu FE⇄BE | ⚠️ Tài liệu trung thực & chính xác; lỗi CODE đã ghi (backend thiếu) được tái xác minh | 1 | 3 | 2 |
| 2 — Luồng cross-component | N/A (không có shared store; đã bỏ qua đúng cách) | — | — | — |
| 3 — Luồng cross-page | N/A (không có lần ghi tồn tại qua trang; đã bỏ qua đúng cách) | — | — | — |
| **Tổng** | **Bộ tài liệu mẫu mực, trung thực** | **1** | **5** | **3** |

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG" (đã tự kiểm chứng)

**1. 🔴 LỖI CODE (đã ghi trong tài liệu — tái xác minh, KHÔNG phải lệch tài liệu): toàn bộ backend
`/customer/profile` chưa tồn tại.**
- FE gọi `GET /customer/profile` (`useCustomerProfile.ts:30`) và `PUT /customer/profile`
  (`useCustomerProfile.ts:48`), resolve theo baseURL `…/api/v1` (`api-client.ts:7`).
- **Tự tay xác minh bằng grep:** `grep -rniE "customer/profile|customerprofile|customer_profile" be/` →
  **KHÔNG CÓ KẾT QUẢ**; `grep "/customer"` trong `be/cmd/server/main.go` → **không có nhóm `/customer`**;
  `grep -ri profile be/` chỉ khớp handler staff `GET /auth/me` (`auth_handler.go:105`) và test của nó
  (`auth_test.go:237`). Không có handler, service, sqlc query, migration hay bảng nào.
- Nhóm versioned `v1 := r.Group("/api/v1")` (`main.go:161`) chỉ mount `auth · products ·
  categories · toppings · combos · orders · payments · tables · staff · admin · files · ws`
  (`main.go:167–350`). Cả hai request đều rơi vào `404 page not found` mặc định của Gin (plain text,
  không phải JSON error envelope của project — không có handler `NoRoute` tùy chỉnh nào).
- **Tại sao quan trọng:** trang xuất hiện hoàn toàn tương tác — form rỗng + nút **"Tạo hồ sơ"** đang
  bật — nhưng mọi lần lưu đều là ngõ cụt, và toast mô tả sai thành lỗi kết nối. **Đây là lỗi sản phẩm
  thật, không phải lỗi tài liệu:** [PROFILE_BUGS.md](PROFILE_BUGS.md) Bug 1,
  [customer_profile_be.md](customer_profile_be.md) Flags 1–2, và [customer_profile.md](customer_profile.md)
  Flags 1–2 đều ghi chép chính xác. Tài liệu **không** hứa hẹn quá; code mới thực hiện thiếu.
  Giải pháp = xây dựng BE *hoặc* quyết định sản phẩm để ẩn trang — một task riêng cần ALIGN theo CLAUDE.md.

> Không tìm thấy 🔴 nào khác. Bộ tài liệu trung thực: nó ghi lại backend đang thiếu thay vì giả vờ
> trang hoạt động được.

---

## Component chết / không thể tiếp cận

- **Không có component nào riêng cho trang này.** Không có component nào có zero import; tất cả năm
  zone (`ProfileAvatarHeader`, `PersonalInfoForm`, `QuickNavGrid`, `SaveCTABar`, `ProfilePageSkeleton`)
  đều được import và render bởi `page.tsx:3-8,28-74`.
- **Các *luồng* chết (đã ghi):** `useUpdateProfile.onSuccess` (`useCustomerProfile.ts:49-52`) —
  `invalidateQueries` + `setCustomerName` + success toast — không thể chạm tới vì PUT luôn trả 404.
  `setCustomerName` **có tồn tại** trong settings store (`store/settings.ts:17`), nên lần ghi cross-page
  đã được nối dây nhưng không bao giờ kích hoạt (Flag 5 vẫn còn hiệu lực). Các field `isMember`/`memberSince`
  và badge "✓ Thành viên" (`ProfileAvatarHeader.tsx:39-41`) cũng không thể tiếp cận (profile fetch trả 404).
- **Stub hiển thị nhưng bị vô hiệu (đã ghi):** badge camera — `opacity-50 cursor-not-allowed`,
  không có handler (`ProfileAvatarHeader.tsx:28-34`).

---

## Mảng 1 — Giao Diện Component

**Kết luận:** ✅ Chính xác. Các zone C/D/E render đúng như mô tả trong ASCII `customer_profile.md` +
bảng Zones. Hai lệch nhỏ về layout trong ASCII (B và A), đều thuần cosmetic.

| Component / Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Zone B — layout avatar + tên | ASCII vẽ avatar và tên **cạnh nhau** (`│ avatar │ Nguyễn Văn A`), `customer_profile.md:22-25` | Render thành **cột dọc, căn giữa**: `flex flex-col items-center` bao quanh vòng tròn avatar rồi tên bên dưới (`ProfileAvatarHeader.tsx:12,37`) | 🟡 | Vẽ lại ASCII Zone B thành stack dọc căn giữa (avatar trên, tên + badge phía dưới) |
| Zone A — căn lề tiêu đề | ASCII hiện tiêu đề ngay sau mũi tên quay lại (`[←] Thông Tin Khách Hàng`), ngụ ý căn trái, `customer_profile.md:20` | Tiêu đề **căn giữa** với `flex-1 text-center` giữa nút back và spacer (`CustomerTopNav.tsx:23,37`) | 🟡 | Ghi chú trong ASCII rằng tiêu đề được căn giữa (mũi tên trái, spacer phải) |
| Zone A — màu thanh nav | Bảng Zones: "static — title … back arrow" (không khai màu), `customer_profile.md:57` | Hardcode hex `bg-[#1e293b]` (`CustomerTopNav.tsx:14`) — vi phạm design-token theo fe/CLAUDE.md, nhưng nằm trong `CustomerTopNav` **dùng chung**, không phải component riêng của profile | 🟢 | Nằm ngoài phạm vi trang này; gắn flag cho owner shared-nav — xem ghi chú cross-component trong tracker |
| Zone B — badge camera bị vô hiệu | "camera badge: disabled (opacity-50)" `customer_profile.md:24` | `opacity-50 cursor-not-allowed`, `aria-label="Đổi ảnh (chưa khả dụng)"`, không có handler (`ProfileAvatarHeader.tsx:29-34`) | ✅ | — |
| Zone B — điều kiện badge thành viên | "membership badge: only when isMember" `customer_profile.md:25` | `{isMember && <Badge variant="success">✓ Thành viên</Badge>}` (`ProfileAvatarHeader.tsx:39-41`) | ✅ | — |
| Zone C — 4 field, thứ tự, dấu bắt buộc | name / phone / address / email (tùy chọn), `customer_profile.md:27-34` | Đúng thứ tự đó, mỗi field có dấu `*` bắt buộc trừ email "(tùy chọn)" (`PersonalInfoForm.tsx:42-119`) | ✅ | — |
| Zone D — lưới quick-nav 2×2 | 4 tile: Thực Đơn + Yêu Thích (primary), Lịch Sử Ăn + Đặt Bàn (plain), `customer_profile.md:36-42,74-79` | Mảng `CARDS`, `grid grid-cols-2`; highlighted=true cho Thực Đơn (`/menu`) + Yêu Thích (`/menu/favourites`); plain cho Lịch Sử Ăn (`/order`) + Đặt Bàn (`/menu`) (`QuickNavGrid.tsx:12-17,23`) | ✅ | — |
| Zone D — "Đặt Bàn" → `/menu` | Flag 4: cùng href với "Thực Đơn", không có route booking (`customer_profile.md:151`) | `href: '/menu'` trên cả hai (`QuickNavGrid.tsx:13,16`) | ✅ | — |
| Zone E — nhãn nút Save CTA | "nhãn thay đổi theo trạng thái": Tạo hồ sơ / 💾 Lưu Thông Tin, `customer_profile.md:44-45` | `isLoading?'Đang lưu…' : isNewProfile?'Tạo hồ sơ':'💾 Lưu Thông Tin'` (`SaveCTABar.tsx:22-31`) | ✅ | — |
| Zone E — **không** phải footer cố định | ASCII đặt nó trong luồng trên nav shell, `customer_profile.md:43-47` | Trong luồng bên trong `<main>` (`SaveCTABar.tsx:13` `px-4 pb-4 pt-2`); page dành `pb-[56px]` cho nav shell (`page.tsx:34`) — **không bị va chạm footer cố định** (đối chiếu CTAFooter 🔴 của `customer_product_detail`) | ✅ | — |

**Khớp đã xác minh:** tất cả bốn zone nội dung (B một phần, C, D, E) cùng skeleton render đúng như tài
liệu mô tả; layout cấp page (`flex flex-col min-h-screen`, `<main>` cuộn được giới hạn
`max-w-[420px]`, `pb-[56px]`) khớp `page.tsx:26-34`.

---

## Mảng 4 — Hành Vi Loading

**Kết luận:** ✅ Khớp hoàn toàn. Mọi khẳng định trong [customer_profile_loading.md](customer_profile_loading.md)
đều khớp với source — không có gì cần sửa.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Spinner cấp route | `(shop)/loading.tsx` vòng cam | `h-8 w-8 animate-spin … border-t-orange-500` (`(shop)/loading.tsx:1-7`) | ✅ | — |
| Không có loading.tsx / Suspense cấp profile | không có trong folder | folder chỉ có `page.tsx` + `components/` (xác minh bằng listing) | ✅ | — |
| `isLoading` → skeleton thay B/C/D/E; Zone A luôn hiện | `page.tsx:35-36`, Zone A ngoài nhánh | `{isLoading ? <ProfilePageSkeleton/> : …}` bên trong `<main>`; `<CustomerTopNav>` ngoài tại `page.tsx:28-31` | ✅ | — |
| Cấu hình query | key `['customer','profile']`, stale 5 phút, retry bỏ qua 401/404 | `useCustomerProfile.ts:24,33,34-38` đúng như vậy | ✅ | — |
| Ưu tiên 4 trạng thái (loading → is404 create → non-404 disabled → success không thể đạt) | `loading.md:76-84` | `page.tsx:35-36` (loading), `:72-73` (`disabled={isError && !is404}`, `isNewProfile={is404}`), success cần BE hoạt động | ✅ | — |
| Kích thước block skeleton theo zone | `loading.md:93-98` | `ProfilePageSkeleton.tsx:5-9,12-19,22-29,31-34` khớp block-for-block | ✅ | — |

---

## Mảng 5 — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** ⚠️ Tài liệu **chính xác và trung thực** — nó ghi lại rằng backend đang thiếu thay vì mô
tả một hợp đồng ma. Mục 🔴 duy nhất là lỗi CODE bên dưới (đã tái xác minh), không phải lệch tài liệu.
Các trích dẫn dòng trong `_be.md`/`SCENARIO` trỏ vào `main.go` đã lỗi thời (+13).

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| `GET`/`PUT /customer/profile` có tồn tại không? | "❌ route chưa đăng ký … không có nhóm `/customer` … grep không trả kết quả" (`customer_profile_be.md:29-37`) | **Đã xác minh** bằng grep toàn repo (KHÔNG CÓ); `main.go:161` không mount nhóm `/customer` | 🔴 | **CODE** — xây dựng BE hoặc ẩn trang (task cần ALIGN). Tài liệu đã đúng. |
| Toast khi lưu thất bại | "gán nhãn sai `Không thể lưu — kiểm tra kết nối`" (`be.md` Flag 2, Bug 2) | `onError: toast.error('Không thể lưu — kiểm tra kết nối')` (`useCustomerProfile.ts:54-56`) | 🟡 | Sửa FE 1 dòng — nhưng chỉ sau khi BE tồn tại; gộp vào fix Bug 1 |
| Hình dạng `CustomerProfile` / `UpdateProfileForm` | "chỉ có trên FE, ❓ UNVERIFIED — không có BE type nào đứng sau" (`be.md` Flag 3) | `useCustomerProfile.ts:6-22`; không có server type nào để xác nhận | 🟡 | Giữ `❓ UNVERIFIED` cho đến khi BE DTO ra đời |
| Lần ghi cross-page `setCustomerName` chết | "không bao giờ kích hoạt — bị chặn sau PUT chết" (`be.md` Flag 5) | `setCustomerName` **có tồn tại** (`store/settings.ts:17`) nhưng chỉ được gọi trong `onSuccess` (`useCustomerProfile.ts:51`), vốn không bao giờ chạy | 🟡 | Không cần làm gì — chính xác; tự giải quyết khi BE tồn tại |
| Trích dẫn dòng `main.go` của `_be.md` | v1 group `main.go:148`; children `main.go:154–311` (`be.md:32-34`, Bug1 `:42-45`) | v1 group tại **`main.go:161`** (+13); các child group trải dài **`:167` (auth) → `:350` (ws)**; danh sách cũng bỏ sót nhóm `files` (`:339`) và `ws` (`:350`) | 🟢 | Sửa tài liệu — cập nhật thành `:161` / `:167-350`; trích dẫn tên nhóm thay vì dòng tuyệt đối khi có thể |
| Trích dẫn metrics-mw trong `SCENARIO` | "global metrics middleware … `main.go:117,126`" (`SCENARIO_PROFILE.md:201`) | `r.Use(…, middleware.Metrics())` tại **`main.go:118`** (toàn engine → có chạy với `NoRoute`); `/metrics` GET tại **`:121`** (`:126` của tài liệu sai dòng) | 🟢 | Sửa tài liệu — `:118`/`:121`; `❓ UNVERIFIED` về việc nó có *ghi lại* 404 hay không có thể giữ nguyên |

**Khớp đã xác minh:** sơ đồ luồng FETCH/WRITE (`customer_profile.md:109-114`), logic create-mode `is404`,
skip `retry` 401/404, và mọi Flag trong `_be.md` và `PROFILE_BUGS.md` đều chính xác so với source.

---

## Danh Sách Việc Cần Làm (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code (quyết định) | Xây dựng backend `/customer/profile` (nhóm route + handler/service + bảng `customer_profiles` + JWT vai trò customer) **hoặc** quyết định sản phẩm để ẩn trang sau trạng thái "sắp ra mắt" | `be/cmd/server/main.go` + file BE mới — **PHẢI đăng ký vào `MASTER_TASK.md` + ALIGN trước** |
| 2 | 🟡 Code (gộp vào #1) | Phân nhánh toast lưu thất bại theo `err.response?.status` để 404 không bị gán nhãn là "kiểm tra kết nối" | `fe/src/hooks/useCustomerProfile.ts:54-56` (chỉ sau #1) |
| 3 | 🟡 Sửa tài liệu | Vẽ lại ASCII Zone B thành stack dọc căn giữa; ghi chú tiêu đề Zone A được căn giữa | `customer_profile.md:20-25` |
| 4 | 🟢 Sửa tài liệu | Cập nhật trích dẫn dòng `main.go` trong `_be.md`: v1 `:148→:161`, children `:154-311→:167-350`; thêm `files`/`ws` vào danh sách nhóm | `customer_profile_be.md:32-34,42-45` |
| 5 | 🟢 Sửa tài liệu | Sửa trích dẫn metrics-mw trong `SCENARIO` `:117,126 → :118,:121` | `SCENARIO_PROFILE.md:201` |
| 6 | 🟢 Sửa tài liệu | Cập nhật nhánh nguồn `experience_claude.md_system_1 → experience_claude.md_system_1_test_iphon2_change_code` trong header toàn bộ bộ tài liệu | tất cả `customer_profile/*` |

> Theo CLAUDE.md: các sửa tài liệu (#3–#6) là **một** doc task; **mỗi thay đổi code (#1, #2) phải
> được đăng ký vào `docs/tasks/MASTER_TASK.md` và ALIGN trước khi chạm vào bất kỳ file nào.** Skill
> này chỉ đọc — không thay đổi gì cả.
