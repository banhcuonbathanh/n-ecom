# Admin Task Board — Tài Liệu vs. Code (Audit Chi Tiết 5 Vùng)

> **Phạm vi:** một audit chỉ-đọc đối chiếu bộ tài liệu của `/admin/staff/task-board` với code FE/Go
> đang chạy trên nhánh `experience_claude.md_system_1_test_iphon2_change_code`. Năm trục: ① giao diện
> component · ② luồng dữ liệu cross-component · ③ luồng dữ liệu cross-page · ④ hành vi loading · ⑤ mô
> hình dữ liệu FE⇄BE. **Code thắng** — mọi ô "Code thực tế" đều trace tới `file:line`; không nhớ vo.
> **Chỉ-đọc — không sửa code app, không sửa bộ tài liệu của trang.** Sản xuất bởi 2 agent Sonnet song
> song (Vùng 1–2) + 3 vùng do orchestrator trace trực tiếp (Vùng 3–5, sau khi các agent vùng chạm
> giới hạn phiên); mọi 🔴 được xác minh lại bằng tay. Ngày: 2026-06-24.

---

## Tóm Tắt Điều Hành

| Vùng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Giao diện component | **ASCII wireframe lệch nặng** — nhãn KPI, thanh lọc, cột bảng đều sai | 3 | 5 | 3 |
| 2 — Luồng dữ liệu cross-component | **Rất chính xác** — mọi state/query/key khớp; 1 sắc thái invalidation | 0 | 3 | 3 |
| 3 — Luồng dữ liệu cross-page | **Chính xác; giải quyết chính ❓ của nó thành một code bug đã xác nhận** | 1 | 2 | 2 |
| 4 — Hành vi loading | **Một mâu thuẫn thật** (khung bảng render khi load, tài liệu nói trống) | 1 | 2 | 2 |
| 5 — Mô hình dữ liệu FE⇄BE | **Bám sát code; tự document bug của mình** — chỉ số dòng route + 1 đếm sai bị cũ | 1 | 4 | 3 |
| **Tổng** | | **6** | **16** | **13** |

Bộ tài liệu hành vi (`_be.md`, `_crosscomponent`, `_crosspage`, `_loading`) chính xác bất thường — nó
document code *bao gồm cả* 4 bug (cùng đẳng cấp `customer_combo_detail` / `admin_combos`). **Độ lệch
tập trung ở wireframe ASCII vẽ tay `admin_task_board.md`** (Vùng 1) và một khẳng định sai trong
`_loading.md` (Vùng 4). Vấn đề sản phẩm đầu bảng — toàn bộ nửa thống kê của board vĩnh viễn bằng 0 — là
một CODE bug mà tài liệu đã đánh dấu đúng.

---

## NHỮNG PHÁT HIỆN PHẢI LÊN TIẾNG (đã xác minh tay)

1. **🔴 CODE BUG (tài liệu đúng) — task status ghi-một-lần `pending`; toàn bộ bề mặt thống kê chết.**
   `CreateStaffTask` hard-code `status='pending'` ([tasks.sql.go:16](../../../../../be/internal/db/tasks.sql.go#L16)); `querier.go` **không có UPDATE** trên
   `staff_tasks` ([querier.go:28,42,56-58](../../../../../be/internal/db/querier.go#L28) — `CreateStaffTask` + 4 read); grep mọi
   `UPDATE/DELETE/PATCH staff_tasks` trong `be/` ra rỗng; không route nào đẩy status
   ([main.go:320-322](../../../../../be/cmd/server/main.go#L320) là trọn bộ 3 route); không có job quét
   overdue. ⇒ trên DB thật KPI "Hoàn thành" / "Đang thực hiện" / "Quá hạn", `completionRate`,
   `qualityScore`, `hasOverdue` **vĩnh viễn 0/false**. Ghi tại
   [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md) Bug 1 — không phải drift, tài liệu đúng.

2. **🔴 DRIFT TÀI LIỆU — Zone D thẻ KPI: nhãn sai và vẽ một thẻ không tồn tại.** ASCII wireframe vẽ bốn
   thẻ `Tổng việc · Chờ làm · Đang làm · Hoàn thành` ([admin_task_board.md:19-20](admin_task_board.md)).
   Code render `Tổng công việc hôm nay · Hoàn thành · Đang thực hiện · Quá hạn`
   ([page.tsx:89,93,99,104](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L89)).
   **Không có thẻ "Chờ làm" (pending)**, và **thẻ "Quá hạn" không được vẽ**. Mọi nhãn đều sai.

3. **🔴 DRIFT TÀI LIỆU — Zone C thanh lọc: tài liệu vẽ 1 control, code render 4.** ASCII chỉ hiện
   `[📅 date ▾]` ([admin_task_board.md:17](admin_task_board.md)); `StaffTaskFilterBar` render date +
   role `<select>` + status `<select>` + tìm theo tên ([StaffTaskFilterBar.tsx:31-58]; được củng cố bởi
   `TaskBoardFilters` 4 trường [task.ts:44-49](../../../../../fe/src/types/task.ts#L44) và `useMemo`
   lọc role/status/search [page.tsx:49-59](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L49)).

4. **🔴 DRIFT TÀI LIỆU — Zone E bảng nhân viên: tài liệu vẽ 2 cột, code render 7 (gồm "Chất lượng" bịa
   ra).** ASCII vẽ `▸ chef01  5 việc  2 hoàn thành` ([admin_task_board.md:23-27](admin_task_board.md));
   `StaffTaskTable` render **7** cột: Nhân viên · Vai trò · Được giao · Hoàn thành · Tỷ lệ % · Chất lượng
   · Thao tác ([StaffTaskTable.tsx:64-71](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L64)),
   với nút Xem công việc/Ẩn + Giao việc mỗi dòng (`:122-139`) và highlight cam khi quá hạn (`:82-97`).
   Cột "Chất lượng ★ X/5.0" (`QualityStars` `:29-39`) render điểm chất lượng **bịa** (Bug 2) mà ASCII bỏ.

5. **🔴 DRIFT TÀI LIỆU — loading.md sai về vùng bảng trong lúc fetch ban đầu.** `_loading.md` mục
   "Zone E/G" trạng thái #1 + Flag 3 khẳng định khi `statsLoading` true thì **cả bảng lẫn empty-state
   đều không mount** và "vùng dưới hàng KPI trống khi load". Trong code guard là
   `{!statsLoading && filteredStaff.length === 0 ? <EmptyState/> : <StaffTaskTable rows={filteredStaff}/>}`
   ([page.tsx:112-127](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L112)). Khi
   load, `!statsLoading` là false → nhánh **else** render `<StaffTaskTable rows={[]}/>`, mà luôn render
   `<thead>` 7 cột của nó ([StaffTaskTable.tsx:62-73](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L62)).
   Vậy **khung header bảng hiện khi load** — không phải vùng trống.

6. **🔴 CODE BUG (cross-page; ❓ của tài liệu nay xác nhận) — todo-list "Cập nhật" lặng lẽ tạo dòng
   trùng.** Tài liệu suy luận đây là ❓ CHƯA XÁC MINH; xác minh lại ở đây:
   `TodoPageClient.handleModalSubmit` gọi `createTask.mutate(...)` bất kể mode edit/create
   ([TodoPageClient.tsx:68](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx#L68),
   mode nối tại `:187`), nút modal ghi **"Cập nhật"** ([CreateEditTaskModal.tsx:187](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/CreateEditTaskModal.tsx#L187)),
   nhưng grep **không thấy `updateTask`/`PATCH /admin/tasks/:id` ở đâu trong `fe/src`**. Bấm "Cập nhật"
   chèn một dòng `staff_tasks` MỚI. Cùng gốc với Bug 1 (không có đường UPDATE).

---

## Code Chết / Không Tới Được

- **`page.tsx:52-55` bộ lọc status chết hoàn toàn** — chỉ nhánh `overdue` được hiện thực (Bug 4), và
  `hasOverdue` tự nó luôn false (Bug 1). `StaffTaskStat` không có trường status mỗi-dòng
  ([task.ts:28-37](../../../../../fe/src/types/task.ts#L28)) để chạy pending/in_progress/completed.
- **`task_service.go:200-201`** — nhánh `if err == sql.ErrNoRows` sau INSERT không bao giờ chạy
  (`ExecContext` không trả `ErrNoRows`); FK reject rơi xuống `ErrInternalError` → 500 (Bug 3).
- **`CreateTaskModal.tsx:103` `if (!open) return null`** — không tới được; cha mount có điều kiện
  `{modalOpen && <CreateTaskModal …/>}` ([page.tsx:130](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L130)), nên `open` luôn true khi đã mount.
- **Type `UpdateTaskPayload`** ([task.ts:77-82](../../../../../fe/src/types/task.ts#L77)) không có nơi
  dùng — không có hàm API `updateTask` ở đâu (grep). Dấu tích của đường UPDATE vắng mặt.
- **"edit" mode của todo-list `CreateEditTaskModal`** ([CreateEditTaskModal.tsx:25,40-52,187](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/CreateEditTaskModal.tsx#L25))
  điền sẵn từ task có sẵn nhưng không có đường update → sinh ra 🔴 #6 (dòng trùng).

---

## Vùng 1 — Giao Diện Component

**Kết luận:** ASCII wireframe `admin_task_board.md` lệch nặng — 3/5 zone (C, D, E) sai về bản chất, cộng
vài lệch copy/nhãn/segment. Bảng Zones cũng bỏ sót Zone F.

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Zone B — nhãn CTA | `[+ Giao việc]` | `Thêm công việc` ([BreadcrumbPageHeader.tsx:28]) | 🟡 | Sửa ASCII thành `[+ Thêm công việc]` |
| Zone B — breadcrumb | `Nhân viên / Bảng công việc` (2 đoạn) | `['Admin','Nhân viên','Bảng công việc']` ([page.tsx:79](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L79)) | 🟢 | Thêm tiền tố `Admin /` |
| Zone C — control lọc | chỉ một date picker | date + role + status + tìm tên ([StaffTaskFilterBar.tsx:31-58]; `TaskBoardFilters` [task.ts:44-49](../../../../../fe/src/types/task.ts#L44)) | 🔴 | Vẽ cả 4 control |
| Zone D — nhãn KPI | `Tổng việc · Chờ làm · Đang làm · Hoàn thành` | `Tổng công việc hôm nay · Hoàn thành · Đang thực hiện · Quá hạn` ([page.tsx:89,93,99,104](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L89)) | 🔴 | Viết lại 4 nhãn; xóa thẻ "Chờ làm" ma |
| Zone E — cột bảng | 2 cột (`N việc`, `M hoàn thành`) | 7 cột: Nhân viên/Vai trò/Được giao/Hoàn thành/Tỷ lệ %/Chất lượng/Thao tác ([StaffTaskTable.tsx:64-71](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L64)) | 🔴 | Vẽ lại bảng 7 cột |
| Zone E — sao "Chất lượng" | không vẽ | `QualityStars` ★ X/5.0 ([StaffTaskTable.tsx:29-39,120](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L29)) | 🟡 | Thêm cột (lưu ý: giá trị bịa, Bug 2) |
| Zone E — nút mỗi dòng | không vẽ | Xem công việc/Ẩn + Giao việc mỗi dòng ([StaffTaskTable.tsx:122-139](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L122)) | 🟡 | Thêm cột thao tác |
| Zone E — highlight quá hạn | không vẽ | `bg-orange-50` + `!` khi `hasOverdue` ([StaffTaskTable.tsx:82-97](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L82)) | 🟢 | Ghi chú (chết đến khi Bug 1 fix) |
| Zone F — cột mở rộng | name · status · time (3) | Tên · Ưu tiên · Giờ · Trạng thái · Ghi chú (5) ([ExpandedTaskList.tsx:39-44](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx#L39)) | 🟡 | Thêm Ưu tiên + Ghi chú; Giờ là dải `HH:MM–HH:MM` (`:55-57`) |
| Zone F — dòng trong bảng Zones | thiếu | `ExpandedTaskList` là Zone F thật | 🟡 | Thêm dòng Zone F vào bảng Zones |
| Zone F — "inline retry" | Key Interactions nói lỗi hiện retry | text lỗi, **không có nút retry** ([ExpandedTaskList.tsx:20-25](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx#L20)) | 🟡 | Bỏ khẳng định (hoặc thêm nút retry — sửa code) |
| Zone G — EmptyState | "khi không có việc trong ngày" | kích hoạt khi `filteredStaff.length===0` sau lọc client ([page.tsx:112-116](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L112)) | 🟢 | Viết lại: zero dòng **đã lọc** |
| Modal M1 | không vẽ | modal 9 trường ([CreateTaskModal.tsx:117-217](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L117)) | 🟡 | Thêm zone modal vào ASCII |

**Đã-khớp:** nguồn dữ liệu Zone D/E (`metrics`/`staffStats` từ `getTaskStats`,
[page.tsx:45-46](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L45)); atom
KPICard + EmptyState render đúng mô tả.

---

## Vùng 2 — Luồng Dữ Liệu Cross-Component

**Kết luận:** file chính xác nhất bộ — mọi shape `useState`, query key, staleTime, `useMemo`, interface
prop, và handler khớp code chính xác. Chỉ một chi tiết chưa document và một sắc thái.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Toàn bộ state + query key | `page.tsx:19-43`, shape/key/staleTime chính xác | khớp chính xác ([page.tsx:19-43](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L19)) | 🟢 | không |
| Invalidation theo `task.dueDate` chứ không `filters.date` | đánh dấu "bug tinh tế đã biết" (KPI có thể không refresh) | xác nhận ([CreateTaskModal.tsx:91-93](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L91)) — nhưng hành vi **có lẽ đúng**: task tạo cho ngày khác không nên refresh thống kê hôm nay | 🟡 | Làm nhẹ tài liệu: chưa chắc là bug; `useTodoTasks.useCreateTask` dùng prefix `['admin','tasks','stats']` ([useTodoTasks.ts:30](../../../../../fe/src/hooks/useTodoTasks.ts#L30)) — rộng hơn, cũng ổn |
| `CreateTaskModal` là `next/dynamic` | không nhắc | code-split qua `next/dynamic` ([page.tsx:10-12](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L10)) | 🟡 | Ghi chú chunk lazy lần mở đầu |
| Bug 4 — bộ lọc status chết | chỉ `overdue` được hiện thực | xác nhận ([page.tsx:52-55](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L52)) | 🟡 | (xem Vùng 5) |
| `onSuccess` no-op + mount có điều kiện + mọi handler | dòng chính xác | tất cả xác nhận ([page.tsx:61-73,130-137](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L61)) | 🟢 | lệch nhẹ 1 dòng (`onSuccess` mở `:90` không phải `:91`) |

**Đã-khớp:** cơ chế "không Zustand, invalidation làm broadcast" đúng y tài liệu;
`ExpandedTaskList`/`StaffTaskFilterBar` thuần-props, không query riêng.

---

## Vùng 3 — Luồng Dữ Liệu Cross-Page

**Kết luận:** chính xác. Không SSE/WS/localStorage trong domain task (grep xác nhận); output bền duy
nhất là một dòng `staff_tasks` MySQL; cả hai trang tiêu thụ đều gate manager+; nhân viên không có bề
mặt đọc. Hai ❓ của tài liệu nay đã giải quyết — một thành code bug xác nhận.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Không realtime / không localStorage | không có trong domain task | grep `EventSource\|WebSocket\|localStorage` trong task-board + `useTodoTasks` = 0 | 🟢 | không |
| Không bề mặt task cho KDS/POS/cashier | grep rỗng | xác nhận: không tham chiếu task trong `(dashboard)/{kds,cashier,pos}` (grep) | 🟢 | khoảng trống sản phẩm, tài liệu đúng |
| ❓ todo-list "edit" → trùng | suy luận, CHƯA XÁC MINH | **ĐÃ XÁC NHẬN** code bug — `createTask.mutate` bất kể mode ([TodoPageClient.tsx:68,187](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx#L68)); không có `updateTask` trong `fe/src` (grep); nút "Cập nhật" ([CreateEditTaskModal.tsx:187](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/CreateEditTaskModal.tsx#L187)) | 🔴 | Bỏ ❓; đây là đầu bảng #6 |
| ❓ có ai invalidate `['admin','staff']` | CHƯA XÁC MINH | **CÓ** — chỉ trang staff CRUD ([admin/staff/page.tsx:67](../../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L67)); task board/modal không bao giờ làm | 🟡 | Giải quyết ❓; dropdown modal có thể cũ trừ khi trang staff đã chạy |
| Dòng route task `main.go` | `:307-309`; gate `/admin` `:294`; staff list `:280-282` | tasks `:320-322`, gate `/admin` manager+ `:308`, staff list `:294-295` (KHÔNG phải `:280-282` — đó là sub-group cashier của **tables**) ([main.go:294-295,308,320-322](../../../../../be/cmd/server/main.go#L294)) | 🟡 | Trích dẫn lại (+13; sửa anchor staff-list sai) |

**Đã-khớp:** `getTaskStats`/`getStaffTasks`/`createTask` ([admin.api.ts:283-290](../../../../../fe/src/features/admin/admin.api.ts#L283)),
`listStaff` ([admin.api.ts:92-93](../../../../../fe/src/features/admin/admin.api.ts#L92)); ma trận độ
bền và hành vi F5 đúng.

---

## Vùng 4 — Hành Vi Loading

**Kết luận:** phần lớn chính xác (placeholder KPI `'…'`, không Suspense, lazy expand, trạng thái submit
modal đều xác nhận) — nhưng một mâu thuẫn thật về vùng bảng trong lúc fetch ban đầu.

| Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Vùng bảng khi `statsLoading` | "không bảng lẫn empty-state mount; vùng trống" | **sai** — nhánh else render `<StaffTaskTable rows={[]}/>` → `<thead>` 7 cột hiện ([page.tsx:112-127](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L112), [StaffTaskTable.tsx:62-73](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L62)) | 🔴 | Sửa `_loading.md` Zone E/G trạng thái #1 + Flag 3 |
| KPI loading = chuỗi `'…'` | mỗi thẻ hiện `'…'` | xác nhận ([page.tsx:90,94,100,105](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L90)); `KPICard` chỉ in value ([KPICard.tsx:22](../../../../../fe/src/components/shared/KPICard.tsx#L22)) | 🟢 | không |
| Spinner admin chung; không `loading.tsx` task-board | chỉ `(dashboard)/admin/loading.tsx` | xác nhận ([admin/loading.tsx:1-7](../../../../../fe/src/app/(dashboard)/admin/loading.tsx#L1)); không `loading.tsx` dưới `staff/`/`task-board/` | 🟢 | không |
| Trạng thái dòng mở rộng (pulse/lỗi-không-retry/trống) | 4 trạng thái có thứ tự | xác nhận ([ExpandedTaskList.tsx:13-33](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx#L13)) | 🟡 | (khoảng trống retry = Vùng 1) |
| Select staff modal lặng khi load + submit `'Đang tạo…'` | như mô tả | xác nhận ([CreateTaskModal.tsx:39-44,130,211-214](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L39)) | 🟢 | không |
| EmptyState một thông điệp cả hai ca | một chuỗi | xác nhận ([page.tsx:114-116](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L114)) | 🟡 | flag đúng của tài liệu |

---

## Vùng 5 — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** bám sát code — mọi dòng handler/service/repo/SQL trích dẫn đúng *xét theo code*, và tài
liệu document cả 4 bug. Drift duy nhất là dòng route `main.go` (+13) và một đếm sai.

| Endpoint/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Bug 1 — status ghi-một-lần `pending` | 🔴, không UPDATE đâu cả | **GIỮ** — `CreateStaffTask` `'pending'` ([tasks.sql.go:16](../../../../../be/internal/db/tasks.sql.go#L16)); không UPDATE trong `querier.go`; grep không `UPDATE staff_tasks` trong `be/` | 🔴 | BE: thêm `PATCH /admin/tasks/:id/status` (đăng ký MASTER trước) |
| `querier.go` "đúng bốn task query" | 4 | thực ra **5** — thêm `GetDailyTaskMetrics` ([querier.go:28,42,56-58](../../../../../be/internal/db/querier.go#L28)); không cái nào UPDATE (Bug 1 vẫn giữ) | 🟡 | Sửa đếm `_be.md`/BUGS thành 5 |
| Bug 2 — qualityScore bịa | 🟠, `rate/20.0` | **GIỮ** ([task_service.go:131](../../../../../be/internal/service/task_service.go#L131)); không cột quality trong migration | 🟡 | BE: bỏ cột hoặc bắt rating thật |
| Bug 3 — `assigned_to` sai → 500 | 🟡, FK→`ErrInternalError`, nhánh `ErrNoRows` chết | **GIỮ** ([task_service.go:198-204](../../../../../be/internal/service/task_service.go#L198)); FK `fk_tasks_assigned_to` ([011_staff_tasks.sql:20](../../../../../be/migrations/011_staff_tasks.sql#L20)) | 🟡 | BE: pre-validate staff id → 4xx; bỏ nhánh chết |
| Bug 4 — bộ lọc status chết (FE) | 🟡, chỉ `overdue` | **GIỮ** ([page.tsx:52-55](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L52)) | 🟡 | FE: bỏ option chết hoặc thêm dữ liệu mỗi-status |
| Trace endpoint (handler→service→repo→SQL) | dòng chính xác | tất cả xác nhận ([task_handler.go:24,36,53](../../../../../be/internal/handler/task_handler.go#L24); [task_service.go:111,157,174](../../../../../be/internal/service/task_service.go#L111); [task_repo.go:102](../../../../../be/internal/repository/task_repo.go#L102)) | 🟢 | không |
| Dòng route `main.go` | tasks `:307-309`, gate `/admin` `:294-295`, staff list `:280-282`/`:282` | tasks `:320-322`, gate `:308`, staff list `:294-295` (doc `:280-282` là group cashier tables) ([main.go](../../../../../be/cmd/server/main.go#L308)) | 🟡 | Trích dẫn lại +13 trong `_be.md`/`_crosspage` |
| Migration 011 vs 012 enum status | — | 011 tạo status **không** `in_progress`; 012 `MODIFY` thêm vào ([012_staff_tasks_v2.sql:7](../../../../../be/migrations/012_staff_tasks_v2.sql#L7)) | 🟢 | ghi chú tùy chọn |
| Khớp trường FE/BE | `description` omitempty, giờ optional, `qualityScore` 0–5 | xác nhận ([task.ts:5-37](../../../../../fe/src/types/task.ts#L5) ↔ [task_service.go:33-62](../../../../../be/internal/service/task_service.go#L33)) | 🟢 | không |

**Đã-khớp:** mô hình auth (cả 4 endpoint manager+, `assigned_by`=caller), bảng lỗi, `LEFT JOIN staff`
để mọi staff active hiện, thứ tự ưu tiên `GetStaffTasksByDate`.

---

## Danh Sách Hành Động Tổng Hợp (theo ưu tiên)

| # | Loại | Hành động | File đích |
|---|---|---|---|
| 1 | 🔴 Code bug | Thêm đường chuyển status task (`PATCH /admin/tasks/:id/status` + `UpdateStaffTaskStatus` + suy ra overdue) để bề mặt thống kê có thể khác 0 | `be/internal/{handler,service,repository,db}/task*`, `be/migrations` |
| 2 | 🔴 Code bug | Ngừng todo-list "Cập nhật" tạo trùng — gate trên endpoint update (phụ thuộc đường write của #1) hoặc tắt edit đến khi có | `fe/.../todo-list/components/{TodoPageClient,CreateEditTaskModal}.tsx` |
| 3 | 🔴 Sửa tài liệu | Vẽ lại ASCII `admin_task_board.md`: Zone C 4 control · Zone D 4 nhãn KPI thật (không "Chờ làm") · Zone E 7 cột + thao tác · Zone F 5 cột + thêm Zone F vào bảng Zones | `admin_task_board.md` |
| 4 | 🔴 Sửa tài liệu | Sửa `_loading.md` Zone E/G trạng thái #1 + Flag 3: `<thead>` bảng render khi `statsLoading`, không trống | `admin_task_board_loading.md` |
| 5 | 🟡 Code bug | Map FK reject (MySQL 1452) sang 4xx + bỏ nhánh `ErrNoRows` chết khi INSERT (Bug 3) | `task_service.go:198-204` |
| 6 | 🟡 Code bug | Bỏ `qualityScore` bịa (hoặc bắt rating thật) — Bug 2 | `task_service.go:131`, `task.ts` |
| 7 | 🟡 Code bug | Bỏ 3 option lọc status chết (Bug 4) | `page.tsx:52-55`, `StaffTaskFilterBar.tsx` |
| 8 | 🟡 Sửa tài liệu | Trích dẫn lại mọi dòng route `main.go` (+13) và sửa anchor staff-list sai (`:280-282`→`:294-295`); sửa "bốn task query"→năm; giải quyết hai ❓ | `_be.md`, `_crosspage_dataflow.md`, `_crosscomponent_dataflow.md` |
| 9 | 🟡 Sửa tài liệu | Làm nhẹ "bug invalidation" `task.dueDate` (có lẽ đúng); ghi chú `next/dynamic`; CTA "Thêm công việc"; breadcrumb 3 đoạn; Zone F không nút retry | `_crosscomponent_dataflow.md`, `admin_task_board.md` |
| 10 | 🟢 Sửa tài liệu | Cập nhật nhánh provenance trên cả 6 file thành `experience_claude.md_system_1_test_iphon2_change_code` | mọi file bộ tài liệu |

> Theo CLAUDE.md: sửa tài liệu (#3, #4, #8, #9, #10) là một task tài liệu ALIGN; **mỗi thay đổi code
> (#1, #2, #5, #6, #7) phải được đăng ký trong `MASTER_TASK.md` trước khi đụng file nào.** Skill này
> không đổi code app và không đổi bộ tài liệu của trang — chỉ ghi 3 file so sánh + tracker.
