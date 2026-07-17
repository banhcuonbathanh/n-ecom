# Staff Login `/login` — So Sánh Chi Tiết Tài Liệu vs. Code (5 Mảng)

> **Phạm vi:** rà soát sâu bộ tài liệu `staff_login` so với code FE/Go thật trên nhánh
> `experience_claude.md_system_1_test_iphon2_change_code`. Năm trục dự kiến; **Mảng 2
> (luồng cross-component) là N/A** — `/login` là một form RHF đơn, không có store dùng chung trên trang
> (bộ tài liệu đã nói rõ). Vậy **4 mảng được kiểm tra**: ① Giao diện component · ③ Cross-page / phiên
> auth · ④ Loading · ⑤ Mô hình dữ liệu FE⇄BE.
> **Chỉ đọc — không sửa code và không sửa tài liệu.** Thực hiện bởi 4 agent Sonnet chạy song song
> (Mảng 3 làm lại thủ công sau khi agent gặp giới hạn phiên); mọi mục tiêu đề đã được tổng soát viên
> Opus kiểm chứng lại theo source.
> **Kết luận trước: không có mâu thuẫn 🔴 nào giữa tài liệu và code.** Bộ tài liệu là bản sao trung
> thực, trích dẫn từ source (ngang hàng `staff_register` / `staff_cashier_payment` /
> `customer_combo_detail`) — tài liệu hóa code *bao gồm cả* các lỗi FE đã biết. Những phát hiện thực
> chất là (a) bộ tài liệu được viết trên nhánh cũ `experience_claude.md_system_1`, nên tất cả số dòng
> route trong `main.go` đều lỗi thời **+13**; (b) hai nhận định `❓ UNVERIFIED` nay đã được giải quyết —
> một trong số đó phát lộ **`/kds` hoàn toàn không có guard phía client**; (c) hai lỗi diễn đạt trong
> tài liệu (`SameSite`, "`AUTH_001` nowhere in be/`"). Ngày: 2026-06-23.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Giao diện component (`staff_login.md`) | Gần hoàn hảo; một sự nhầm lẫn wireframe | 0 | 1 | 13 |
| ③ Cross-page / phiên auth (`_crosspage_dataflow.md`) | Rất chính xác; 2 ❓ đã được giải quyết (một là khoảng trống guard thực sự) | 0 | 2 | 3 |
| ④ Loading (`_loading.md`) | Chính xác; một lỗi off-by-one | 0 | 1 | 14 |
| ⑤ Mô hình FE⇄BE (`_be.md` + `LOGIN_BUGS.md`) | Rất chính xác; số dòng route lỗi thời, 2 lỗi diễn đạt | 0 | 4 | 8 |
| **Tổng** | **Bộ tài liệu trung thực — không có 🔴 mới** | **0** | **8** | **38** |

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI "LÊN TIẾNG"

**Không có — không tồn tại mâu thuẫn cứng nào giữa tài liệu và code trên trang này.** Mọi endpoint,
bước handler/service/SQL, trường store, guard, và trạng thái loading mà tài liệu khẳng định đều đã được
xác nhận theo source. Các mục dưới đây là những phát hiện **🟡** quan trọng nhất (đã kiểm chứng thủ
công), được nêu lên vì hai trong số đó giải quyết các câu hỏi `❓ UNVERIFIED` còn mở và một là nhận xét
bảo mật thực sự:

1. **`/kds` KHÔNG có guard phía client — bảng handoff trong tài liệu đã giả định có một guard.** `_crosspage_dataflow.md`
   §2 liệt kê `chef → /kds → AuthGuard (any staff), RoleGuard(minRole=CHEF) ❓ UNVERIFIED`. **Đã giải quyết:
   sai.** `(dashboard)/layout.tsx:1-5` chỉ là `OrdersWSProvider`; `kds/page.tsx` /
   `kds/layout.tsx` **không có `AuthGuard` và không có `RoleGuard`** (grep → 0 kết quả). KDS board không
   có cổng auth/role phía client — nó hoàn toàn dựa vào bộ chặn 401 của api-client
   (`api-client.ts:40-54`) kích hoạt khi query dữ liệu đầu tiên bị từ chối. Ngược lại, hai giả định
   guard ❓ còn lại trong tài liệu đều **đúng**: `/pos` = `AuthGuard` + `RoleGuard(minRole=CASHIER)`
   (`pos/page.tsx:29-30`), `/admin` = `AuthGuard` + `RoleGuard(minRole=MANAGER)`
   (`(dashboard)/admin/layout.tsx:29-30`), `/cashier/payment/[id]` = giống POS
   (`cashier/payment/[id]/page.tsx:39-40`). **Khoảng trống tương tự đã được ghi nhận trong lần chạy `staff_kds`.**
2. **Logout chỉ được nối dây trên giao diện *customer* — không có nút logout nào cho staff.** Tài liệu §7
   để `❓ UNVERIFIED liệu call site logout có gọi clearAuth() không`. **Đã giải quyết:** người gọi duy nhất
   của `logout()` (`auth.api.ts:12-13`) là `MenuHeader.handleLogout` phía customer
   (`features/menu/components/MenuHeader.tsx:15-22`), gọi `await logout()` rồi `clearAuth()`
   tại `:21` (try/catch, không có `router.push`). Grep **không tìm thấy** lệnh gọi logout nào trên `/pos`, `/kds`, `/admin`,
   hay `/cashier`. Vì vậy, câu chuyện logout của staff trong tài liệu chỉ là lý thuyết hiện tại — một
   nhân viên không có UI để kết thúc phiên; chỉ có cookie TTL 30 ngày hoặc đăng nhập mới (đẩy session
   tối đa 5, `auth_service.go:104-112`) mới xóa được.
3. **`LOGIN_BUGS.md` Bug 2 nói quá: "`AUTH_001` không được tham chiếu ở đâu trong `be/`" là không chính xác.**
   `AUTH_001` **thực sự** được phát ra bởi auth middleware cho các route *được bảo vệ* —
   `middleware/auth.go:37,45,47` (Bearer thiếu / hết hạn / không hợp lệ). Nhánh error-map FE trên
   `AUTH_001` (`login/page.tsx:52`) vẫn **chết** vì `POST /auth/login` bản thân nó không bao giờ trả về
   nó — nhưng tài liệu nên ghi "không bao giờ được phát ra *bởi login endpoint*", không phải "nowhere in be/".
4. **`SetRefreshCookie` SameSite — comment ghi `Strict`, code không đặt gì (`_be.md` Flag 4 đã giải quyết).**
   Comment `middleware/auth.go:98` khẳng định `SameSite=Strict`; lệnh gọi `c.SetCookie(...)` tại `:104` không
   có tham số SameSite, và grep `be/` cho `SameSite` chỉ trả về **duy nhất comment đó** — không có mặc định
   toàn cục nào được cấu hình. Vậy SameSite của refresh cookie là mặc định của browser (Lax), không phải Strict.
   Khoảng trống có thật, ít ảnh hưởng; comment là một lỗi tài liệu hóa.

---

## Code chết / không thể chạm tới

- **`login/page.tsx:52` — nhánh `code === 'AUTH_001'` là code chết cho các response đăng nhập.** `POST
  /auth/login` chỉ trả về `INVALID_CREDENTIALS` / `ACCOUNT_DISABLED` / `RATE_LIMIT_EXCEEDED` /
  `INVALID_INPUT` (`errors.go:24-26` + handler bind). Vế `AUTH_001` trong OR chỉ khớp qua kiểm tra
  `INVALID_CREDENTIALS` song song → nó không bao giờ kích hoạt độc lập. (`AUTH_001` là code thực,
  nhưng nó thuộc về `middleware/auth.go`, không phải login.)
- **Fallback `redirectByRole[...] ?? '/dashboard'` (`login/page.tsx:34,48`)** — bản đồ role bao phủ tất cả
  năm role được định nghĩa; `/dashboard` là fallback không thể chạm tới cho một chuỗi role không xác định. Vô hại;
  route này có thể không tồn tại.
- Không tìm thấy code Go chết nào trong đường dẫn login.

---

## Mảng ① — Giao Diện Component

**Kết luận:** wireframe + bảng Zones trong `staff_login.md` khớp với JSX thực tế gần như từng dòng.
Tiêu đề, phụ đề, nhãn cả hai trường, lỗi Zod username, nhãn nút submit + cơ chế đổi
`isSubmitting → "Đang đăng nhập…"`, link đăng ký, việc ghi `setAuth`, và toàn bộ bản đồ
`redirectByRole` đều đã được xác nhận.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Slot lỗi inline cho trường Mật khẩu | Wireframe vẽ "Tên đăng nhập hoặc mật khẩu không đúng" là **lỗi Zod inline** dưới Mật khẩu | Đó là thông báo **API error** được đặt qua `setError('password', …)` (`login/page.tsx:53`), không phải lỗi Zod. Thông báo Zod password thực là `'Tối thiểu 6 ký tự'` (`login/page.tsx:16`) và **không được vẽ** trong wireframe | 🟡 | Wireframe nên hiển thị thông báo Zod min-6 là một hàng ⚠ riêng và gán nhãn hàng API-error riêng |
| Đổi nhãn khi đang xử lý | Chỉ ngụ ý "Đăng nhập" | `{isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}` (`login/page.tsx:107`) | 🟢 | Code đúng; tài liệu bỏ qua cơ chế đổi nhãn |
| Tiêu đề / phụ đề card | "Quán Bánh Cuốn" / "Đăng nhập để tiếp tục" | `page.tsx:65-67` / `:68` | 🟢 | Khớp |
| Nhãn trường | "Tên đăng nhập" / "Mật khẩu" | `page.tsx:72-74` / `:87` | 🟢 | Khớp |
| Lỗi Zod username | "Tối thiểu 3 ký tự" | `z.string().min(3,'Tối thiểu 3 ký tự')` `page.tsx:15` | 🟢 | Khớp |
| Giá trị min Zod | `username ≥ 3`, `password ≥ 6` | `page.tsx:15-16` | 🟢 | Khớp |
| Link đăng ký | "Chưa có tài khoản? Đăng ký" → `/register` | `<Link href="/register">` `page.tsx:112-115` | 🟢 | Khớp |
| Submit → login → setAuth | `auth.api.login` → `POST /auth/login` → `setAuth` | `page.tsx:46-47`, `auth.api.ts:9-10` | 🟢 | Khớp |
| Bản đồ chuyển hướng theo role | chef→/kds, cashier→/pos, manager/admin→/admin, customer→/menu | `redirectByRole` `page.tsx:20-26` | 🟢 | Khớp |
| Chuyển hướng khi đã đăng nhập | store có `user` → chuyển hướng role ngay lập tức | `useEffect` `page.tsx:33-35` | 🟢 | Khớp |
| Bản đồ lỗi: INVALID_CREDENTIALS/ACCOUNT_DISABLED/generic | ánh xạ tới 3 thông báo | `page.tsx:52-58` | 🟢 | Khớp (nhánh `AUTH_001` chết đã ghi nhận ở trên) |

**Đã xác nhận khớp:** bố cục card, cách dùng atom (`Input`/`Label`/`Button`), form `noValidate`,
nguồn dữ liệu (RHF + `zodResolver`).

---

## Mảng ③ — Luồng cross-page / phiên auth

**Kết luận:** tài liệu trọng yếu nhất trong bộ, và nó chắc chắn. Hai credential (access token
trong bộ nhớ Zustand, refresh token trong cookie httpOnly), bộ chặn request gắn Bearer, chuỗi
401→refresh→retry, tái hydration AuthGuard, RoleGuard, và ma trận độ bền F5 đều khớp với source.
Hai nhận định `❓ UNVERIFIED` nay đã được giải quyết (xem phần tiêu đề #1 và #2).

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Guard `/kds` | `RoleGuard(minRole=CHEF)` ❓ UNVERIFIED | **Không có guard** — `(dashboard)/layout.tsx:1-5` chỉ là OrdersWSProvider; `kds/page.tsx`/`kds/layout.tsx` không có `AuthGuard`/`RoleGuard` | 🟡 | Giải quyết ❓ trong tài liệu → "/kds: không có guard phía client; dựa vào api-client 401". Bảo mật: cân nhắc thêm `RoleGuard(CHEF)` (task ALIGNed riêng) |
| Call site logout + `clearAuth` | ❓ UNVERIFIED liệu có gọi `clearAuth()` không | Người gọi duy nhất là `MenuHeader.handleLogout` phía customer (`MenuHeader.tsx:15-22`) — gọi `clearAuth()` tại `:21` sau `logout()`; không có nút logout nào cho staff | 🟡 | Giải quyết ❓ trong tài liệu; ghi chú không có logout trên giao diện staff |
| Guard `/pos` | `RoleGuard(minRole=CASHIER)` ❓ UNVERIFIED | **Đã xác nhận** `AuthGuard`+`RoleGuard(minRole=CASHIER)` `pos/page.tsx:29-30` | 🟢 | Bỏ ❓ — giả định tài liệu đúng |
| Guard `/admin` | `RoleGuard(minRole=MANAGER)` ❓ UNVERIFIED | **Đã xác nhận** `AuthGuard`+`RoleGuard(minRole=MANAGER)` `(dashboard)/admin/layout.tsx:29-30` | 🟢 | Bỏ ❓ — giả định tài liệu đúng |
| Auth store (không persist) | `setAuth` → `set({user,accessToken})`, không localStorage | `auth.store.ts:12-18` — không có `persist`, đúng `{user,accessToken}` + setAuth/setAccessToken/clearAuth | 🟢 | Khớp |
| Bộ chặn 401 / refresh | request `:11-14`; nhánh guest `sub`; refresh `:43-44`; redirect `:49`; retry `:55`; `isRefreshing` `:17` | `api-client.ts` — request `:11-15`, guest sub `:27-37`, refresh `:43-44`, redirect `:49`, retry `:55`, `isRefreshing` `:17` (lệch 1 dòng) | 🟢 | Chỉ lệch số dòng nhỏ |
| Tái hydration AuthGuard | effect `:14-21`, `getMe`→`setAuth`, catch→`/login`, null khi `!user` `:23` | `AuthGuard.tsx:14-21,23` — chính xác | 🟢 | Khớp |
| RoleGuard | `:10-24`, `Role[user.role.toUpperCase()] ?? 0`, "Không có quyền truy cập trang này" | `RoleGuard.tsx:10-24` — chính xác | 🟢 | Khớp |
| Role enum / User type | `types/auth.ts:1-9`, CUSTOMER=1…ADMIN=5; `User` có `is_active` | `types/auth.ts:1-7` (enum), `:11-17` (`User` có `id,username,full_name,role,is_active`; **không có `email`**) | 🟢 | Dòng Role `:1-9→:1-7`; việc thiếu `email` được theo dõi ở Mảng 5 |

**Đã xác nhận khớp:** sơ đồ tổng thể §0, §1 vòng đời credential, §6 ma trận F5, §8 ma trận độ bền,
§7 luồng logout BE (`auth_handler.go` refresh/logout, `delIsActiveCache`).

**Câu hỏi cross-page trong tracker đã được giải quyết:** *shell có tái auth thầm lặng khi F5 qua cookie còn tồn tại không?*
**Có** — `withCredentials:true` (`api-client.ts:8`) gửi cookie `refresh_token` gắn theo path; một
401 kích hoạt `POST /auth/refresh` → `setAccessToken` → retry (`:40-55`). Trên route được bảo vệ,
`AuthGuard.getMe()` điều khiển cơ chế này; trên `/kds` (không được bảo vệ), query dữ liệu đầu tiên
của trang điều khiển cùng chuỗi refresh đó. Auth store dùng chung không persist + `POST /auth/register`
công khai cho cashier tự đăng ký vẫn còn như đã ghi nhận trên `staff_register`.

---

## Mảng ④ — Loading / Hành vi trong khi xử lý

**Kết luận:** chính xác. Trang thực sự không fetch gì khi mount — không có `useQuery`, không có
`loading.tsx`, không có `<Suspense>`; UI in-flight duy nhất là nút submit bị vô hiệu hóa + đổi nhãn.
Sự tương phản với `/dev-login` (màn hình đầy đủ `Loader2` + `<Suspense>` cho `useSearchParams`) là đúng.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Phạm vi dòng spinner `DevLoginInner` | `dev-login/page.tsx:56-65` | thực tế `:57-64` (nội dung khớp) | 🟡 | Cập nhật ref dòng `:56-65→:57-64` |
| Không có `loading.tsx` trong `(auth)/login/` hoặc group | chỉ có `page.tsx` | đã xác nhận — `ls (auth)/login/` = chỉ có `page.tsx`; `(auth)/` chỉ có `login/`,`register/` | 🟢 | Khớp |
| Không có `useQuery` / `<Suspense>` khi mount | không có | đã xác nhận `login/page.tsx:1-120` | 🟢 | Khớp |
| `isSubmitting` disable + opacity | `disabled`, `disabled:opacity-60` | `page.tsx:104-105` | 🟢 | Khớp |
| Flash `useEffect` khi đã đăng nhập | `:33-35` | chính xác | 🟢 | Khớp |
| Form `noValidate` | `:70` | đã xác nhận | 🟢 | Khớp |
| `/dev-login` Suspense + spinner | `:67-77`, `useSearchParams` `:18`, `Admin@123` `:31` | đã xác nhận | 🟢 | Khớp |
| `login()` axios thuần, không dùng useMutation | `auth.api.ts:9-10` | đã xác nhận | 🟢 | Khớp |

**Đã xác nhận khớp:** bảng 5 hàng Flags (không có loading.tsx, flash redirect, không có submit spinner,
polish dev-login, `RATE_LIMIT_EXCEEDED` không có thông báo FE).

---

## Mảng ⑤ — Mô hình dữ liệu FE⇄BE & dấu vết endpoint

**Kết luận:** rất chính xác. Mọi dòng handler/service/SQL/Redis/JWT trong `_be.md` đều khớp với Go.
Drift là (a) sự lỗi thời có hệ thống của số dòng route trong `main.go` (+13, tài liệu được trích dẫn trên nhánh cũ),
và (b) hai lỗi diễn đạt (`AUTH_001`, SameSite). Cả hai lỗi trong `LOGIN_BUGS` đều được xác nhận lại.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Cách diễn đạt LOGIN_BUGS Bug 2 | "`AUTH_001` không được tham chiếu ở đâu trong `be/`" | **Sai** — được phát ra bởi `middleware/auth.go:37,45,47` cho các route được bảo vệ; không bao giờ bởi `POST /auth/login` | 🟡 | Diễn đạt lại → "không bao giờ được phát ra bởi login endpoint" |
| `_be.md` Flag 4 — SameSite | comment nói Strict, code "không đặt gì", ❓ nếu có mặc định toàn cục | comment `auth.go:98`; `c.SetCookie` `:104` không đặt SameSite; grep `be/` `SameSite` = chỉ comment → thực sự không được đặt (browser mặc định Lax) | 🟡 | Bỏ ❓ (đã giải quyết); sửa comment, hoặc đặt `http.SameSiteStrictMode` (task riêng) |
| Flag 1 / Bug 1 — FE pwd `min(6)` vs BE `min(8)` | lỗi code, phía FE | `login/page.tsx:16` `.min(6)` vs `auth_handler.go:24` `min=8`; register dùng `min=6` `auth_handler.go:137` | 🟡 (tài liệu đã ghi nhận) | Nâng FE Zod lên `.min(8)` (task đã đăng ký) |
| Flag 2 / Bug 2 — Bản đồ lỗi FE | `AUTH_001` chết, không có nhánh `RATE_LIMIT_EXCEEDED`/`INVALID_INPUT` | `login/page.tsx:49-58` — đã xác nhận | 🟡 (tài liệu đã ghi nhận) | Bỏ nhánh chết, thêm 2 nhánh |
| Flag 5 — `email` trong `User` type | "FE `User` type bỏ qua nó" | `types/auth.ts:11-17` — `User` **không có trường `email`** nào | 🟡 | Ghi chú type bỏ qua `email` hoàn toàn; thêm `email?` nếu FE cần |
| Route: nhóm `/auth` | `main.go:154` | `:167` | 🟢 | +13 |
| Route: `POST /auth/login` | `main.go:155` | `:168` | 🟢 | +13 |
| Route: nhóm con `protected` | `main.go:160-163` | `:173-177` (`/logout` `:175`, `/me` `:176`) | 🟢 | +13 |
| Handler `loginRequest` + `Login` | `auth_handler.go:22-25`, `29-61`, resp `:49-60`, email NULL `:45-48` | tất cả chính xác | 🟢 | Khớp |
| Gauntlet Service `Login` | `auth_service.go:69-142`; rate-limit `:346-365`; is_active sau bcrypt `:90`; sessions `:104-112`; setIsActiveCache `:135`/`:367-376`; staffActiveKey `:43-45`; newRefreshToken `:387-395` | tất cả chính xác | 🟢 | Khớp |
| SQL `GetStaffByUsername` | `auth.sql.go:138-165`, `WHERE username=? AND deleted_at IS NULL` | chính xác | 🟢 | Khớp |
| JWT TTLs | `jwt.go:51-69` access HS256; `AccessTTL` `:31-38` 24h; `RefreshTTL` `:40-48` 30d | chính xác | 🟢 | Khớp |
| Errors | `errors.go:24-26` INVALID_CREDENTIALS/ACCOUNT_DISABLED/RATE_LIMIT_EXCEEDED 401/401/429 | chính xác | 🟢 | Khớp |
| SetRefreshCookie | `auth.go:101-105` name/path/httpOnly/maxAge/secure-on-TLS | chính xác | 🟢 | Khớp |

**Đã xác nhận khớp:** bảng Caching (cả hai Redis key fail-open), toàn bộ bảng Error Behaviour,
Flag 3 (rate-limit ở service level không phải middleware).

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🟡 Sửa tài liệu | Giải quyết ❓ §2: `/kds` **không có** AuthGuard/RoleGuard (dựa vào api-client 401); `/pos`=`RoleGuard(CASHIER)`, `/admin`=`RoleGuard(MANAGER)` đã xác nhận | `staff_login_crosspage_dataflow.md` §2 |
| 2 | 🔴 Lỗi code (quyết định) | Quyết định có nên thêm `RoleGuard(CHEF)` phía client cho `/kds` không (hiện tại chỉ có api-client 401 + kiểm tra role BE bảo vệ) — **đăng ký MASTER trước** | `kds/page.tsx` hoặc `(dashboard)/layout.tsx` |
| 3 | 🟡 Sửa tài liệu | Giải quyết ❓ §7: chỉ `MenuHeader.handleLogout` (`:15-22`) gọi `logout()`+`clearAuth()`; ghi chú không có nút logout nào trên giao diện staff | `staff_login_crosspage_dataflow.md` §7 |
| 4 | 🟡 Sửa tài liệu | Diễn đạt lại `LOGIN_BUGS` Bug 2: `AUTH_001` CÓ được phát ra bởi `middleware/auth.go:37,45,47`; đó là "không bao giờ được phát ra bởi login endpoint" | `LOGIN_BUGS.md` Bug 2 |
| 5 | 🟡 Sửa tài liệu | `_be.md` Flag 4: bỏ ❓ — SameSite đã xác nhận là không được đặt (grep `be/` = chỉ comment) | `staff_login_be.md` Flag 4 |
| 6 | 🟡 Sửa tài liệu | Cập nhật tất cả số dòng route `main.go` lỗi thời +13 (nhóm `:154→:167`, login `:155→:168`, protected `:160-163→:173-177`) và nhánh nguồn gốc refresh | `staff_login_be.md`, `_crosspage_dataflow.md`, `SCENARIO_STAFF_LOGIN.md`, `LOGIN_BUGS.md` |
| 7 | 🟡 Sửa tài liệu | Wireframe `staff_login.md`: phân biệt thông báo Zod min-6 (`Tối thiểu 6 ký tự`) với API error trong slot mật khẩu | `staff_login.md` |
| 8 | 🟡 Sửa tài liệu | `_loading.md`: spinner `DevLoginInner` `:56-65→:57-64` | `staff_login_loading.md` |
| 9 | 🔴 Lỗi code | FE login password Zod `.min(6)` → `.min(8)` để khớp với BE bind (Bug 1) — **đăng ký MASTER trước** | `(auth)/login/page.tsx:16` |
| 10 | 🔴 Lỗi code | Bản đồ lỗi FE: bỏ nhánh `AUTH_001` chết, thêm `RATE_LIMIT_EXCEEDED` + `INVALID_INPUT` (Bug 2) — **đăng ký MASTER trước** | `(auth)/login/page.tsx:49-58` |
| 11 | 🟡 Code (quyết định) | `SetRefreshCookie`: đặt `SameSite=Strict` thực sự, hoặc sửa comment (Flag 4) — **đăng ký MASTER trước** | `be/internal/middleware/auth.go:98-104` |

> Theo CLAUDE.md: các sửa tài liệu (#1,3,4,5,6,7,8) là một task tài liệu ALIGNed; mỗi thay đổi **code** (#2,9,10,11)
> phải được đăng ký trong `docs/tasks/MASTER_TASK.md` và ALIGNed **trước khi bất kỳ file nào được chỉnh sửa**.
