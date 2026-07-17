# So Sánh — Tài Liệu vs. Code · `/register` (staff_register)

> **Phạm vi:** đối chiếu bộ tài liệu `staff_register` với code FE/BE đang chạy trên branch hiện tại,
> theo 5 trục: ① hình ảnh component · ② luồng dữ liệu cross-component · ③ luồng dữ liệu cross-page ·
> ④ hành vi loading · ⑤ mô hình dữ liệu FE⇄BE.
> **Chỉ đọc — không sửa bất kỳ code hay tài liệu nào.** Chỉ ghi file này, bản mirror VI, file mockup
> trực quan, và `COMPARISON_TRACKER.md`.
> **Phương pháp:** trang form đơn (129 dòng) — audit **trực tiếp** (không cần subagent); mọi 🔴 đều
> được kiểm chứng lại bằng tay từ source.
> **Branch:** `experience_claude.md_system_1_test_iphon2_change_code` · **Ngày:** 2026-06-22
> **Kết luận một dòng:** một bộ tài liệu **trung thực, bám sát source** (cùng đẳng cấp với
> `customer_welcome` / `customer_profile` / `admin_combos`) — nó mô tả code *bao gồm cả* lỗi bảo mật
> duy nhất của nó. **Không có mâu thuẫn doc-vs-code**; 🔴 duy nhất là một bug CODE mà tài liệu đã ghi nhận.

---

## Tóm Tắt Điều Hành

| Khu vực | Đánh giá | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Hình ảnh component (`staff_register.md`) | **Gần như hoàn hảo** — mọi `file:line` FE chính xác, ASCII khớp thẻ form 3 trường | 0 | 0 | 2 |
| 2 — Luồng dữ liệu cross-component | **N/A (khai báo đúng)** — một thẻ form, state RHF cục bộ, không có store của trang | 0 | 0 | 1 |
| 3 — Luồng dữ liệu cross-page (`_crosspage_dataflow.md`) | **Chính xác** — bàn giao 3 artifact + store không persist đã được xác nhận | 0 | 1 | 1 |
| 4 — Loading (`_loading.md`) | **Chính xác** — form không fetch, chỉ có trạng thái nút `isSubmitting` | 0 | 0 | 1 |
| 5 — Mô hình dữ liệu FE⇄BE (`_be.md`) | **Chính xác về hành vi; số dòng route `main.go` lệch +13** | 1 | 4 | 1 |
| **Tổng** | **Không có mâu thuẫn doc-vs-code** | **1** | **5** | **6** |

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI LÊN TIẾNG (đã kiểm chứng bằng tay)

**1. `POST /auth/register` công khai tạo ra tài khoản staff `cashier` đang hoạt động — và nhánh redirect `customer` của FE là code chết. (Bug CODE; tài liệu đã ghi nhận — `REGISTER_BUGS.md` Bug 1.)**
Đã kiểm chứng đầu-cuối từ source trên branch này:
- **Route công khai** — `authR.POST("/register", authH.Register)` tại [`main.go:169`](../../../../../be/cmd/server/main.go#L169), trong nhóm `/auth` ([`main.go:167`](../../../../../be/cmd/server/main.go#L167)), được đăng ký **trước** nhóm con `protected` ([`main.go:173-174`](../../../../../be/cmd/server/main.go#L173)) → không có `authMW`, không có role gate.
- **Role + active bị hardcode** — `CreateStaffForRegister(ctx, newUUID(), username, hash, username, "cashier")` ([`auth_service.go:219`](../../../../../be/internal/service/auth_service.go#L219)); câu INSERT của repo gán cứng `is_active` = `1` ([`auth_repo.go:87-88`](../../../../../be/internal/repository/auth_repo.go#L87)).
- **Nhánh `customer` của FE không thể tới được** — `redirectByRole` map `customer:'/menu'` ([`register/page.tsx:28`](../../../../../fe/src/app/%28auth%29/register/page.tsx#L28)) nhưng BE luôn trả `role:"cashier"` (`auth_handler.go:169`), nên đăng ký thành công luôn rơi vào `/pos` ([`register/page.tsx:48-50`](../../../../../fe/src/app/%28auth%29/register/page.tsx#L48)).

**Vì sao quan trọng:** bất kỳ ai trên internet đều có thể tự tạo quyền truy cập POS/staff chỉ với username + password — không phê duyệt, không xác minh, không rate-limit. BUSINESS_RULES §1 quy định tài khoản staff phải do manager tạo qua `/admin/staff`. Đây là **quyết định sản phẩm/bảo mật**, không phải sửa cơ học (xóa route · chỉ cho `customer` · hoặc gate sau `AtLeast("manager")`) — phải đăng ký MASTER + ALIGN trước khi đụng bất kỳ file nào.

> **Đây là 🔴 duy nhất, và nó là bug code mà bộ tài liệu đã ghi nhận đúng.** Không có claim tài liệu
> nào mâu thuẫn với code trên trang này.

---

## Component chết / không thể tới được

- **`redirectByRole.customer:'/menu'`** ([`register/page.tsx:28`](../../../../../fe/src/app/%28auth%29/register/page.tsx#L28)) — nhánh chết; BE không bao giờ trả `role:"customer"` từ `/auth/register`. (🟡 — đã ghi nhận: `staff_register.md` Flag 3 + `_be.md` Auth Model.)
- Không có code chết nào khác trên trang. Không có component zero-import (đây là một `page.tsx` tự chứa).

---

## Khu vực 1 — Hình ảnh component (ASCII + Zones `staff_register.md` vs `register/page.tsx`)

**Đánh giá: gần như hoàn hảo.** Mọi line-cite FE trong wireframe đều chính xác và ASCII khớp thẻ form 3 trường thật. Không có drift trực quan.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Khoảng dòng ASCII | "lines 62–128" | form/card trải `register/page.tsx:62-127`, file kết thúc `:129` | 🟢 | không cần — chính xác |
| Branch provenance | (header ngầm trích branch cũ) | branch thật `…_test_iphon2_change_code` | 🟢 | refresh dòng provenance |

**Đã xác nhận khớp (tất cả chính xác):** `h1` "Quán Bánh Cuốn" `:65-67`; subtitle "Tạo tài khoản mới" `:68`; Label `Tên đăng nhập` `:72-74` + Input `autoComplete="username"` `:75-80` + lỗi `:81-83`; Label `Mật khẩu` `:87-89` + Input `type=password` `autoComplete="new-password"` `:90-95` + lỗi `:96-98`; Label `Xác nhận mật khẩu` `:103-105` + Input `:106-111` + lỗi `:112-115`; Button submit `disabled={isSubmitting}` `:118-124`, nhãn đổi thành "Đang tạo tài khoản…" `:123`. Zod schema = đúng 3 trường (`username` min 3 · `password` min 6 · `confirm` refine `=== password`) `:13-20`. **Không có trường "Họ tên"** và **không có link `/login`** — cả hai đều được tài liệu nêu đúng và xác nhận trong code.

---

## Khu vực 2 — Luồng dữ liệu cross-component

**Đánh giá: N/A — khai báo đúng.** Trang là một thẻ form đơn; RHF giữ toàn bộ state trường cục bộ (`useForm` `:39-44`); store ngoài duy nhất là `useAuthStore` toàn cục (`:33`), vốn là vấn đề cross-*page* (Khu vực 3), không phải cross-component. `SCENARIO_REGISTER.md` §"Under the hood — A" nói đúng điều này.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Store chia sẻ giữa các widget | "N/A — một thẻ form, RHF cục bộ, không store chia sẻ" | chỉ `useAuthStore` (toàn cục), không có store cấp trang; RHF cục bộ `register/page.tsx:39-44` | 🟢 | không cần — chính xác |

---

## Khu vực 3 — Luồng dữ liệu cross-page (`_crosspage_dataflow.md` vs auth.store + redirect)

**Đánh giá: chính xác.** Bàn giao ba artifact (hàng `staff` bền vững · cookie refresh httpOnly · session Zustand chỉ trong bộ nhớ) và ma trận F5 không-persist đều được xác nhận trong code.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Auth store **không có persist** → mất khi F5 | "không có middleware `persist` … chỉ trong bộ nhớ" | `useAuthStore = create(...)` thuần, không `persist` ([`auth.store.ts:12-18`](../../../../../fe/src/features/auth/auth.store.ts#L12)) | 🟢 | không cần — chính xác |
| Ghi khi bàn giao | `setAuth(newUser, access_token)` rồi `router.push` | `register/page.tsx:49-50`; `setAuth` `auth.store.ts:15` | 🟢 | không cần — chính xác |
| Set cookie refresh khi thành công | `SetRefreshCookie` httpOnly | `auth_handler.go:156` | 🟢 | không cần — chính xác |
| Đường re-auth khi F5 trên `/pos` | "❓ UNVERIFIED ở đây — thuộc app shell / interceptor api-client" | không nằm trên trang này; khoảng trống trung thực | 🟢 | giải quyết ở run `staff_login` |
| Redirect luôn `/pos` | "luôn cashier → `/pos`" | BE trả `cashier` (`auth_handler.go:169`); map `register/page.tsx:25` | 🟡 | gắn với Bug 1 (nhánh `customer` chết) |

---

## Khu vực 4 — Loading & đang xử lý (`_loading.md` vs `register/page.tsx`)

**Đánh giá: chính xác.** Form không fetch: không `loading.tsx`, không `useQuery`, không Suspense — "loading" duy nhất là nút submit-đang-gửi do RHF `isSubmitting` điều khiển.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Không fetch khi mount / không spinner | "không `useQuery`, render ngay" | client component, không query; card `register/page.tsx:62-127` | 🟢 | không cần — chính xác |
| Nút submit đang gửi | nhãn → "Đang tạo tài khoản…", `disabled` | `register/page.tsx:120-123` | 🟢 | không cần — chính xác |
| Flash redirect-guard khi mount | `useEffect if(user) push(...)` | `register/page.tsx:35-37` | 🟢 | không cần — chính xác |

---

## Khu vực 5 — Mô hình dữ liệu FE⇄BE (`_be.md` vs handler / service / repo / main.go)

**Đánh giá: chính xác về hành vi; drift duy nhất là độ lệch dòng route `main.go` lặp lại (+13).** Các line-cite handler/service/repo đều chính xác; phát hiện Bug-1 và bốn Flag đều đúng.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Dòng đăng ký route | `main.go:156` (route), nhóm `:154`, protected `:159-164` | route `main.go:169`, nhóm `:167`, protected `:173-174` (**+13**) | 🟡 | trích lại dòng route (hoặc trích nhóm + tên handler) |
| Handler `Register` | `auth_handler.go:142` | chính xác — `auth_handler.go:142-174` | 🟢 | không cần |
| Service `Register` | `auth_service.go:205` | chính xác — `auth_service.go:205-225` | 🟢 | không cần |
| Repo INSERT | `auth_repo.go:86`, `is_active=1` gán cứng | chính xác — `auth_repo.go:86-93`, `:88` `is_active`→`1` | 🟢 | không cần |
| **Flag 2 — wireframe có "Họ tên"** | "`staff_register.md` có trường 'Họ tên' mà trang thật không render — doc drift" | `staff_register.md:43` **hiện tại** ghi rõ **"No 'Họ tên' field"** — wireframe đã được sửa rồi | 🟡 | claim wireframe của `_be.md` Flag 2 tự nó đã **cũ**; bỏ hoặc viết lại |
| Flag 4 — response thiếu `phone` | object user của register thiếu `phone` (Login có) | xác nhận: register `auth_handler.go:165-171` (không `phone`); Login/Me `:124-131` (có `phone`) | 🟡 | tài liệu đúng — bất đối xứng có thật |
| Flag 5 — không rate limit | route `/auth` không bị throttle; `ratelimit.go` chưa wire | xác nhận: 0 ref ratelimit trong `main.go` (grep) | 🟡 | tài liệu đúng — khoảng trống có thật |
| Flag 2 — `full_name = username` | service truyền `username` làm `full_name` | xác nhận `auth_service.go:219` | 🟢 | tài liệu đúng (theo thiết kế) |
| Flag 6 — `confirm` không gửi | chỉ POST `{username,password}` | xác nhận `auth.api.ts:30` | 🟢 | tài liệu đúng (theo thiết kế) |
| Lỗi: USERNAME_TAKEN → 409 | `ErrUsernameTaken` = AppError 409 | xác nhận `auth_service.go:208` → `staff_service.go:33` | 🟢 | tài liệu đúng |

**Đã xác nhận khớp:** binding `registerRequest` `min=3`/`min=6` (`auth_handler.go:135-138`); `201 Created` + `{access_token, user{id,username,full_name,role,email}}` (`auth_handler.go:162-173`); kiểm tra tồn tại `GetStaffByUsername` + guard `errors.Is(sql.ErrNoRows)` (`auth_service.go:206-212`) — **không** dính bẫy `==`-vs-`errors.Is` 404→500 thấy ở admin_ingredients; bcrypt hash (`:214`); `issueTokens` giới hạn max-5-session (`:236-244`).

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Bug code (quyết định sản phẩm/bảo mật) | Quyết định ý định cho `/auth/register` công khai (xóa route · chỉ `customer` · hoặc gate sau `AtLeast("manager")`); rồi xóa nhánh redirect `customer` chết của FE | `be/cmd/server/main.go:169` · `be/internal/service/auth_service.go:219` · `fe/src/app/(auth)/register/page.tsx:28` |
| 2 | 🟡 Sửa doc | Cập nhật cite route `main.go` của `_be.md` +13 (route `:156→:169`, nhóm `:154→:167`, protected `:159-164→:173-174`) | `staff_register_be.md` |
| 3 | 🟡 Sửa doc | Bỏ/viết lại claim cũ của `_be.md` Flag 2 rằng wireframe có "Họ tên" — wireframe (`staff_register.md:43`) đã ghi là không có | `staff_register_be.md` |
| 4 | 🟢 Sửa doc | Refresh branch provenance cũ (`…_system_1` → `…_test_iphon2_change_code`) trên toàn bộ doc-set | cả 6 file tài liệu |

> Theo CLAUDE.md: các sửa doc (#2–#4) là **một** task doc đã ALIGN; thay đổi code (#1) phải được đăng
> ký trong `docs/tasks/MASTER_TASK.md` và ALIGN **trước khi đụng bất kỳ file nào** — đây là quyết định
> sản phẩm/bảo mật, không phải sửa cơ học.
