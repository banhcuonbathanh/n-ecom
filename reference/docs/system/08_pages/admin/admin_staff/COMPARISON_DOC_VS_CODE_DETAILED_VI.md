# So Sánh — Tài Liệu vs. Code — `/admin/staff` (Quản lý nhân viên)

> **Phạm vi:** kiểm toán chỉ-đọc bộ tài liệu `admin_staff` đối chiếu code FE/Go đang chạy, trên 4 trục
> áp dụng được — **Hiển thị component · Luồng dữ liệu xuyên trang · Hành vi loading · Mô hình dữ liệu
> FE⇄BE**. (Trục 2 *Luồng dữ liệu xuyên-component* **không** áp dụng — không có store chung của trang
> và không có `_crosscomponent_dataflow.md`; trang giữ toàn bộ state filter/modal trong `useState` cục
> bộ và chỉ đọc `useAuthStore` cho user hiện tại.) **Chỉ-đọc — không sửa code và không sửa tài liệu
> trang.** Thực hiện bởi 2 agent Sonnet song song (BE+types, FE component files); orchestrator đọc trọn
> `page.tsx` và tự tay xác minh hai phát hiện drift-trực-quan + mọi ứng viên 🔴 đối chiếu source.
> **Code thắng.** Nhánh kiểm: `experience_claude.md_system_1_test_iphon2_change_code` (bộ tài liệu viết
> trên nhánh cũ `experience_claude.md_system_1`, nên có lệch số dòng Go bên dưới). Ngày: 2026-06-21.

---

## Tóm Tắt Điều Hành

| Trục | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Hiển thị component | ✅ Logic trung thực, nhưng **wireframe ASCII đã lệch** (số thẻ StatsBar + kiểu nút hành động) | 0 | 2 | 7 |
| 3 — Luồng dữ liệu xuyên trang | ✅ Trung thực — khóa-tài-khoản qua Redis `Del` + soft-delete + lan tỏa dropdown đều xác nhận | 0 | 0 | 6 |
| 4 — Hành vi loading | ✅ Trung thực — 4 lớp + thứ tự nhánh khớp; tài liệu tự nêu đúng lỗ hổng error của drawer | 0 | 1 | 9 |
| 5 — Mô hình dữ liệu FE⇄BE | ✅ Hành vi 100% trung thực; chỉ số dòng Go cũ (+ hai dòng repo bị hoán đổi) | 0 | 5 | 25+ |
| **Tổng** | **Không có 🔴 — FE & BE khớp mọi route, shape, và guard** | **0** | **8** | **47+** |

**Kết luận một đoạn:** Lại một bộ độ trung thực cao. Mọi guard backend tài liệu tuyên bố — gate group
manager+, `DELETE` chỉ-admin, kiểm tra phân cấp role khi create/update, chặn tự-vô-hiệu-hóa, bảo vệ
admin-cuối, và `Del(auth:staff:<id>)` khóa-ngay-lập-tức — đều xác nhận nguyên văn đối chiếu source Go
hiện tại, cùng với stub `performance_score: 0` hardcode. Trích dẫn dòng FE `page.tsx` đều rơi chính
xác. **Không có 🔴**. Drift hai loại: **(a) cơ học** — số dòng Go trong `_be.md` đã cũ vì
`main.go`/`staff_service.go`/`staff_repo.go` dịch trên nhánh mới (và hai dòng repo helper,
`CountAdmins`↔`SoftDeleteStaff`, bị hoán đổi); **(b) một drift trực quan thật** — wireframe ASCII trong
`admin_staff.md` vẽ StatsBar thành năm thẻ theo-role và nút hành động thành bốn icon emoji nhóm lại,
trong khi code render bốn thẻ KPI (role breakdown gộp vào sub-label) và nút text với toggle trạng thái
ở cột riêng.

---

## NHỮNG PHÁT HIỆN PHẢI LÊN TIẾNG

**Không có.** Không có 🔴 nào được xác minh-tay. Cả hai mối lo ứng viên của agent đều được kiểm lại và
không chứa mâu thuẫn:

- `DELETE /staff/:id` **có** gate admin trong `main.go` hiện tại (`adm := staffR.Group("")` +
  `AtLeast("admin")` còn nguyên, chỉ dời chỗ). ✅
- `performance_score` **là** `0` hardcode trong `toStaffJSON` (`staff_handler.go:250`), không có cột
  backing — Flag 8 đúng. FE render field (`StaffTable.tsx:119-120`); chỉ hiện 0% vì BE luôn gửi 0.
  Tài liệu chính xác. ✅
- Mọi guard nghiệp vụ (tự-vô-hiệu, admin-cuối, phân cấp) và cả hai Redis `Del` đều hiện diện. ✅

> Kết quả trung thực: hành vi của trang khớp tài liệu. Mục "ồn ào" duy nhất là **wireframe** cũ, không
> phải luồng hỏng.

---

## Thành phần chết / không thể truy cập

- **Guard phòng thủ chết trong handler (Flag 1, xác nhận):** `GetStaff` (`staff_handler.go:60-63`) và
  `UpdateStaff` (`staff_handler.go:117-120`) mang một kiểm tra self-or-manager
  `id != callerID && !roleAtLeast(callerRole,"manager")` mà nhánh 403 **không thể tới** — group route
  đã ép manager+, nên `roleAtLeast(...,"manager")` luôn true. Di tích của path tự-sửa từng dự định.
  Việc drop `role` cho non-manager trong `UpdateStaff` (`staff_handler.go:163-165`) cũng vô hiệu vì lý
  do tương tự.
- **Chặn-tự quá-rộng (Flag 5, xác nhận):** `SetStaffStatus` từ chối *mọi* self-toggle
  (`staff_service.go:204`), không chỉ tự-vô-hiệu — vô hại, FE cũng disable nút cho self
  (`StaffTable.tsx:126`).
- **Mùi-nhỏ FE (không chết):** helper `field()` của `AddEditStaffModal` nhận tham số `name` không bao
  giờ dùng — luôn trả về cùng chuỗi class. Cosmetic.
- **Không có component zero-import.** Cả hai modal truy cập được qua `next/dynamic`; cả sáu component
  con đều được `page.tsx` import.

---

## Trục 1 — Hiển thị component

**Kết luận:** ✅ *Logic* component khớp; **wireframe ASCII trong `admin_staff.md` là phần đã lệch** —
hai zone render khác bản vẽ.

| Component / Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| `StaffPageHeader` | "Nhân viên (N)" + "+ Thêm nhân viên" | `StaffPageHeader.tsx:9-10,16` — chính xác | 🟢 | — |
| `StaffStatsBar` — **bố cục thẻ** | ASCII vẽ **5** thẻ: `Tổng · Admin · Cashier · Chef · Inactive` (`admin_staff.md:21`) | `StaffStatsBar.tsx:31-50` render **4** KPICard: `Tổng nhân viên · Đang hoạt động · Vô hiệu hóa · Theo vai trò` — số theo-role gộp vào `subLabel` thẻ thứ 4 (`:26-28,45-49`) | 🟡 | Vẽ lại ASCII Zone B thành 4 thẻ (thẻ cuối "Theo vai trò" với sub-label `chef:N · cashier:N …`) |
| `StaffFilterBar` | search + select role + select status | `StaffFilterBar.tsx:3-16` — role `chef/cashier/staff/manager/admin` (admin CÓ trong **filter**, đúng), status `active/inactive` | 🟢 | — |
| `StaffTable` — **nút hành động** | ASCII vẽ 4 icon emoji nhóm `[👁][✎][⏻][🗑]` (`admin_staff.md:27-28`) | `StaffTable.tsx:123-159` — nút **text** "Chi tiết"/"Sửa"/(điều kiện)"Xóa" ở cột cuối, và **toggle trạng thái ở CỘT RIÊNG** ("Đang HĐ"/"Vô hiệu", `:124-134`), không nhóm cùng | 🟡 | Vẽ lại hành động Zone D thành nút text + cột toggle trạng thái riêng |
| `StaffTable` — RBAC `canDelete` | ẩn 🗑 cho manager / self / role≥caller (`:61-66`) | `StaffTable.tsx:62` (`role==='manager'`), `:63` (self), `:64` (`roleLevels[role] >= callerLevel`) | 🟢 | (tài liệu trích `:64` cho self — thực ra `:63`; vặt) |
| `StaffTable` — toggle self disabled | `disabled` cho user hiện tại (`:126`) | `StaffTable.tsx:126` — `disabled={s.id === currentUserId}` | 🟢 | — |
| `StaffTable` — bar `performance_score` | Flag 8: hiện 0% cho mọi dòng (stub BE) | `StaffTable.tsx:119-120` — render `s.performance_score` (BE gửi 0 → 0%); chính xác | 🟢 | — |
| `StaffTable` — empty state | "Không có nhân viên nào phù hợp." (`:52-54`) | `StaffTable.tsx:52-53` — chính xác | 🟢 | — |
| `AddEditStaffModal` — select role bỏ `admin` | Flag 4: `<select>` bỏ admin (`:14-19`) | `AddEditStaffModal.tsx:14-19` `ROLES = chef/cashier/staff/manager`; Zod `z.enum([...])` `:23` ép | 🟢 | — |
| `StaffDetailDrawer` | `['admin','staff',id]`, `enabled`, `staleTime:30s`, "Đang tải...", [Sửa] | `StaffDetailDrawer.tsx:55,57,58,66-67,173-177` — đều chính xác (nhãn nút "Sửa thông tin") | 🟢 | — |

---

## Trục 3 — Luồng dữ liệu xuyên trang

**Kết luận:** ✅ Trung thực. Hai hub server (dòng `staff` MySQL + cache Redis `auth:staff:<id>`) và mô
hình downstream chỉ-pull (không SSE/WS) đúng như mô tả.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Khóa-ngay qua cache `Del` | status/delete `Del(auth:staff:<id>)` → request kế đọc lại MySQL | `staff_service.go:230` (status) + `:268` (delete); đọc tại `auth.go:55` → `auth_service.go:315-334` | 🟢 | — |
| Chỉ soft-delete, không cascade token | `deleted_at=NOW()`; refresh_tokens KHÔNG xóa (Flag 6) | `staff_repo.go:240-251` chỉ UPDATE; comment "revoke sessions" `staff_service.go:267` chưa làm | 🟢 | — |
| Lan tỏa dropdown | staff mới assignable; bị vô hiệu vẫn list; bị xóa biến mất | `GET /staff` lọc chỉ `deleted_at IS NULL`, không `is_active` — xác nhận `staff_repo.go:70+` | 🟢 | — |
| Invalidate khi mutation | `qc.invalidateQueries(['admin','staff'])` | `page.tsx:67` — chính xác | 🟢 | — |
| Không SSE/WS | chỉ-pull, refetch on focus | không realtime hook trong `page.tsx`; `staleTime:0 + refetchOnWindowFocus` `page.tsx:45-46` | 🟢 | — |
| Fail-open khi Redis down | `IsStaffActive` trả true khi Redis lỗi | `auth_service.go:323-325` + `_ = rdb.Del(...)` bỏ qua lỗi | 🟢 | — |

---

## Trục 4 — Hành vi loading

**Kết luận:** ✅ Trung thực. 4 lớp và thứ tự nhánh Error→Loading→empty→rows khớp. Self-flag chính của
tài liệu — **drawer chi tiết không có nhánh error** — được xác nhận.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Cấu hình list query | `staleTime:0`, `refetchOnWindowFocus:true` | `page.tsx:42-47` — chính xác | 🟢 | — |
| Nhánh error | `EmptyState` + "Thử lại" `refetch()` (`:139-153`) | `page.tsx:139-153` — chính xác | 🟢 | — |
| Dòng loading | StatsBar ẩn (`!isLoading`), bảng hiện "Đang tải..." | `page.tsx:163` + `page.tsx:173-174` — chính xác | 🟢 | — |
| Thứ tự nhánh | isError → isLoading → empty → rows | `page.tsx:139,173,176` + `StaffTable.tsx:52` empty | 🟢 | — |
| Modal pending | "Đang lưu..." khi `createMut\|editMut.isPending` | `page.tsx:155,199` + `AddEditStaffModal.tsx:206-212` (tài liệu trích `:208-211`) | 🟢 | — |
| Cấu hình drawer | `enabled:!!staffId && open`, `staleTime:30s` | `StaffDetailDrawer.tsx:57-58` — chính xác | 🟢 | — |
| **Drawer không có nhánh error** | Flag 1: `GET /staff/:id` lỗi kẹt "Đang tải..." mãi | `StaffDetailDrawer.tsx:54-66` — chỉ `isLoading \|\| !staff`, không `isError` | 🟡 | Lỗ hổng code thật — tài liệu **đúng**. Thêm nhánh `isError` cho drawer (task code tương lai). |
| Loading vs empty vs no-match | Flag 2: data rỗng và lọc-không-ra trông giống nhau | `StaffTable.tsx:52-53` một `EmptyState` cho cả hai | 🟢 | (đúng tài liệu; nit UX) |
| Refetch-on-focus im lặng | Flag 4: không chỉ báo khi refetch nền | `page.tsx:46` — chính xác | 🟢 | — |

---

## Trục 5 — Mô hình dữ liệu FE⇄BE

**Kết luận:** ✅ Mọi tuyên bố hành vi và hợp đồng xác nhận. Drift thuần lệch số dòng (nhánh tài liệu cũ
hơn nhánh hiện tại) cộng hai dòng repo bị hoán đổi.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Group route `/staff` + gate manager | `main.go:280-281` | `main.go:293-294` — câu lệnh giống hệt, dịch +13 | 🟡 | Trích lại `:293-294` |
| Sub-group `DELETE` chỉ-admin | `main.go:287-290` | `main.go:300-304` — `adm := staffR.Group("")` + `AtLeast("admin")` còn nguyên | 🟡 | Trích lại `:300-304` |
| Handler 6 endpoint | `ListStaff :26`, `GetStaff :55`, `CreateStaff :74`, `UpdateStaff :112`, `SetStaffStatus :190`, `DeleteStaff :217` | đều xác nhận tại dòng handler đã trích (`staff_handler.go`) | 🟢 | — |
| Stub `performance_score` | hardcode `0`, không cột (Flag 8) `:250` | `staff_handler.go:250` — literal `"performance_score": 0` | 🟢 | — |
| Map role-level | `customer1/chef2/cashier2/staff3/manager4/admin5` `:19-26` | `staff_service.go:19-26` — chính xác | 🟢 | — |
| Guard phân cấp create | `targetLevel >= callerLevel → ErrInsufficientRole` `:109` | `staff_service.go:109-111` — chính xác | 🟢 | — |
| Guard dual-level update | `currentLevel<callerLevel && newLevel<callerLevel` `:177` | `staff_service.go:177-179` — chính xác (dạng OR-reject) | 🟢 | — |
| Chặn tự-vô-hiệu | `callerID==targetID → ErrSelfDeactivationForbidden` `:203-205` | `staff_service.go:204-206` — chính xác, dịch +1 | 🟡 | Trích lại `:204-206` |
| Chặn tự-xóa | `callerID==targetID → ErrInsufficientRole` `:236-238` | `staff_service.go:237-239` — chính xác, dịch +1 | 🟡 | Trích lại `:237-239` |
| Guard admin-cuối | `CountAdmins<=1 → ErrLastAdmin` `:252-257` | `staff_service.go:251-258` — chính xác | 🟢 | — |
| Cả hai Redis `Del` | `:230` (status) + `:268` (delete) | `staff_service.go:230,268` — chính xác | 🟢 | — |
| Dòng repo `CountAdmins` / `SoftDeleteStaff` | `CountAdmins :240`, `SoftDeleteStaff :253` | **hoán đổi** trong code hiện tại — `SoftDeleteStaff :240-251`, `CountAdmins :253-260` | 🟡 | Đổi chỗ hai dòng trích trong tài liệu |
| Range `IsStaffActive` | `auth_service.go:315-383` | thân hàm là `:315-334`; `:367-383` là helper cache riêng | 🟡 | Thu range về `:315-334` |
| Payload FE `listStaff` | `?limit=100` `:92` | `admin.api.ts:93` — `api.get('/staff?limit=100')`, dịch +1 | 🟢 | (trích lại `:93` nếu kỹ tính) |
| Caller mutation FE | `createStaff/updateStaff/setStaffStatus/deleteStaff` `:68-108` | `admin.api.ts:98-108` — đều hiện diện | 🟢 | — |
| Kiểu FE `Staff`/`StaffRole` | field gồm `is_active/role/full_name/username/performance_score` | `fe/src/types/staff.ts:1,5-18` — khớp key `toStaffJSON` | 🟢 | — |
| Không read-cache (Redis) | mọi `GET /staff*` hit MySQL | xác nhận — Redis chỉ chạm vào auth-cache `Del` | 🟢 | — |

---

## Danh Sách Hành Động (theo thứ tự ưu tiên)

| # | Loại | Hành động | File đích |
|---|---|---|---|
| 1 | 🟡 Sửa tài liệu | Vẽ lại ASCII Zone B (StatsBar) thành **4** thẻ KPI — thẻ cuối "Theo vai trò" với sub-label `chef:N · cashier:N …` | `admin_staff.md:21` |
| 2 | 🟡 Sửa tài liệu | Vẽ lại hành động Zone D thành nút **text** (Chi tiết / Sửa / Xóa) + cột toggle trạng thái **riêng**, không phải 4 emoji nhóm | `admin_staff.md:25-29` |
| 3 | 🟡 Sửa tài liệu | Cập nhật dòng Go cũ: group `main.go` `:280-281→:293-294`, sub-group DELETE `:287-290→:300-304`; `staff_service.go` chặn-tự `:203→:204`, tự-xóa `:236-238→:237-239`; **đổi chỗ** repo `CountAdmins`/`SoftDeleteStaff`; `IsStaffActive` `:315-383→:315-334` | `admin_staff_be.md` (nhiều) |
| 4 | 🟡 Sửa tài liệu | Dòng FE vặt: `listStaff` `:92→:93`; guard tự-xóa `:64→:63`; empty state `:52-54→:52-53`; nút submit `:208-211→:206-212` | `admin_staff.md`, `admin_staff_loading.md` |
| 5 | 🟡 Lỗi code | Thêm nhánh `isError` cho `StaffDetailDrawer` để `GET /staff/:id` lỗi hiện error/đóng, không phải "Đang tải..." vĩnh viễn | `StaffDetailDrawer.tsx:54-66` |

> **Ghi chú CLAUDE.md:** mục 1–4 là một task sửa-tài-liệu. Mục 5 là thay đổi code — đăng ký thành một
> dòng trong `docs/tasks/MASTER_TASK.md` và ALIGN với chủ sở hữu **trước khi** chạm file. File so sánh
> này tự nó không thay đổi gì.
