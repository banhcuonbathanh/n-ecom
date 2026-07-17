# Admin To-Do List — So Sánh Chi Tiết Tài Liệu vs. Code (`/admin/todo-list`)

> **Phạm vi:** rà soát sâu bộ tài liệu `admin_todo_list` so với code FE/Go thực tế trên nhánh
> `experience_claude.md_system_1_test_iphon2_change_code`, theo 5 trục: ① giao diện component ·
> ② luồng dữ liệu cross-component · ③ luồng dữ liệu cross-page · ④ hành vi loading · ⑤ mô hình
> dữ liệu FE⇄BE. **Chỉ đọc — KHÔNG sửa code hoặc tài liệu.** Thực hiện bởi 5 agent Sonnet chạy
> song song; các mục 🔴 đã được **tự tay kiểm chứng lại** so với source.
>
> **Tiêu đề:** đây là **bộ tài liệu trung thành với source, ghi nhận code *bao gồm cả* các lỗi của
> nó** (tương đương `admin_combos` / `customer_checkout` / `admin_categories` / `staff_register`).
> **Không có MÂU THUẪN nào giữa tài liệu và code** — mọi cache key, staleTime, file:line, endpoint,
> cổng auth, field mô hình đối tượng, và chuỗi ASCII đều đã được xác nhận. Mục 🔴 duy nhất là
> **LỖI 1 (sửa tạo bản sao)**, một lỗi sản phẩm thực sự mà tài liệu đã ghi nhận ở ba chỗ. Phần
> còn lại là số dòng cũ (`main.go` routes +13) và một `❓ CHƯA XÁC NHẬN` có thể giải quyết được.
> Ảnh màn hình ⏳ (stack down).
>
> Ngày: 2026-06-24.

---

## Tóm Tắt Điều Hành

| Mảng | Kết luận | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 · Giao diện component | ASCII + bảng Zones chính xác; 3 lỗi cosmetic copy | 0 | 3 | 6 |
| 2 · Luồng cross-component | Xuất sắc — mọi cache key / staleTime / file:line đều chính xác | 0 | 2 | 10 |
| 3 · Luồng cross-page | Các luận điểm kiến trúc đều đúng; BE line-cite cũ | 0 | 3 | 8 |
| 4 · Hành vi loading | Phạm vi nhánh / skeleton / empty-copy đều chính xác | 0 | 2 | 8 |
| 5 · Mô hình FE⇄BE | Được truy vết tốt; 4 lỗi code đã xác nhận (có trong tài liệu) | 1 | 3 | 10 |
| **Tổng** | **Không có mâu thuẫn — bộ tài liệu trung thành với source** | **1** | **8** | **14** |

> Chú giải mức độ (đây là rà soát doc-vs-code): 🔴 = mâu thuẫn trực tiếp **hoặc** lỗi sản phẩm
> thực sự mà tài liệu phản ánh; 🟡 = thực có nhưng nhỏ (copy, nhãn chưa ghi, phạm vi dòng lệch
> vài dòng); 🟢 = cosmetic / số dòng cũ / nguồn gốc.

---

## 🔴 NHỮNG PHÁT HIỆN PHẢI LÊN TIẾNG

**1. 🔴 LỖI 1 — "Sửa task" âm thầm tạo BẢN SAO (lỗi sản phẩm thực sự; đã ghi trong tài liệu, đã kiểm chứng lại).**
Một manager bấm ✏️ vào task, thay đổi một trường, bấm **Cập nhật** — thay vì cập nhật hàng đó, một
**task thứ hai được POST** với giá trị mới; task gốc không thay đổi, và **không có nút xóa** để xóa
bản sao. Nguyên nhân gốc đã được truy vết và xác nhận bằng tay:
- `handleModalSubmit` luôn gọi `createTask.mutate(...)` bất kể mode và **không bao giờ đọc
  `editTask.id`** — `fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx:61-80`.
- `mode={editTask ? 'edit' : 'create'}` (`TodoPageClient.tsx:187`) chỉ thay tiêu đề modal và
  nhãn nút submit thành "Cập nhật" — không thay đổi gì về API call.
- `useCreateTask` chỉ biết `POST` (`fe/src/hooks/useTodoTasks.ts:24-33` → `admin.api.ts:289`
  `api.post('/admin/tasks', ...)`).
- **Không có `PATCH`/`PUT`/`DELETE /admin/tasks/:id`** — router đăng ký đúng ba route task:
  `be/cmd/server/main.go:320-322` (`GET /tasks/stats`, `GET /tasks`, `POST /tasks`). Kiểu FE
  `UpdateTaskPayload` (`fe/src/types/task.ts`) không có hàm API nào hỗ trợ phía sau.

**Tại sao quan trọng:** dữ liệu bị hỏng âm thầm ở mỗi lần sửa, không có đường dẫn UI nào để hoàn tác.
**Trạng thái tài liệu:** KHÔNG phải drift — đã được ghi trong `TODO_BUGS.md` Bug 1, `admin_todo_list_be.md`
Flag 1, và `admin_todo_list.md` Flag 1. Sửa tài liệu không thể khắc phục được; bản sửa (thêm `PATCH
/admin/tasks/:id` + phân nhánh đường sửa) cần một dòng trong `MASTER_TASK.md`.

> Ba lỗi code được ghi nhận còn lại (status filter chết · date-range chết · `staffId` xấu → 500)
> đều đã được kiểm chứng lại trực tiếp nhưng là 🟡 — xem Mảng 5.

---

## Dead / code không dùng được

- **Kiểu `UpdateTaskPayload`** (`fe/src/types/task.ts`) — đã khai báo, nhưng không có hàm API
  trong `admin.api.ts` và không có BE route nào sử dụng. Chỉ là scaffolding khai báo trước cho
  đường PATCH còn thiếu.
- **Trường `notes`** — có mặt trong Zod schema của modal (`CreateEditTaskModal.tsx:18`), edit-reset
  (`:50`), và `CreateTaskPayload` (`task.ts`), **nhưng không có `<textarea>` nào cho `notes` được
  render** trong form (`CreateEditTaskModal.tsx:80-193`). Luôn là `undefined` khi submit. Đã ghi
  trong tài liệu (`admin_todo_list.md` Flag 4).
- **`qualityScore`** — được tính và trả về bởi BE (`task_service.go:131,139`) và có trong kiểu FE
  (`task.ts:35`), nhưng **không bao giờ được render** trong bảng per-staff trên trang này
  (`TodoPageClient.tsx:115-150`). Được sử dụng bởi `/admin/staff/task-board` thay thế.
- **`staff_tasks.deleted_at`** (`011_staff_tasks.sql`) và **cột `completed_at`** — được lọc trong
  mọi lệnh đọc (`WHERE deleted_at IS NULL`) nhưng **không bao giờ được ghi** bởi bất kỳ query/repo
  task nào. Scaffolding soft-delete và hoàn thành không có đường ghi (nhất quán với "không có
  endpoint update/delete").
- **Stub `performance_score: 0`** trong `toStaffJSON` (`staff_handler.go:250`) — hardcoded zero,
  không được sử dụng bởi trang này.

---

## Mảng 1 — Giao Diện Component

**Kết luận:** wireframe ASCII + bảng Zones chính xác — header/filter/metric/table/modal copy đều
đã được kiểm chứng với source. Chỉ có ba lỗi cosmetic copy; một agent đã bị loại bỏ nhầm 🔴 (xem
ghi chú).

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Header cột hành động bảng task | ASCII vẽ `HĐ` | render từ đầy đủ `Hành động` — `TodoTaskTable.tsx:35` | 🟡 | Cập nhật ASCII `HĐ` → `Hành động` |
| Nhãn submit modal (chế độ sửa) | ASCII chỉ hiện `[Lưu công việc]` | chế độ sửa render `Cập nhật` — `CreateEditTaskModal.tsx:187` (`{isSubmitting ? 'Đang lưu...' : mode==='create' ? 'Lưu công việc' : 'Cập nhật'}`) | 🟡 | Ghi cả hai nhãn trong wireframe |
| Nhãn "Kết thúc" của modal | ASCII vẽ `Kết thúc` (không ký hiệu) | render `Kết thúc (tuỳ chọn)` — `CreateEditTaskModal.tsx:153` | 🟡 | Thêm `(tuỳ chọn)` vào ASCII |
| Cite nguồn ASCII | `TodoPageClient.tsx:93-183` | `return (` mở tại `:82`; block kết thúc `:195` | 🟢 | Cite `:82-195` |
| `notes` textarea vắng mặt | "không có input field `notes` nào được render" | xác nhận — schema/reset/payload có `notes` nhưng không có field trong JSX `CreateEditTaskModal.tsx:80-193` | 🟢 | Tài liệu đúng (Flag 4) |
| Tùy chọn status filter | "Tất cả / Chờ / Hoàn thành / Quá hạn — KHÔNG có Đang làm" | xác nhận `TodoFilterBar.tsx:87-91` — không có option `in_progress` | 🟢 | Tài liệu đúng |
| `TaskStatusBadge` (zone status) | Bảng Zones cite `components/shared/TaskStatusBadge` | được dùng — import `TodoPageClient.tsx:14`, render `:143` `<TaskStatusBadge status="overdue" />` | 🟢 | Tài liệu đúng |

> **Đã loại bỏ một phát hiện sai của agent 🔴.** Một area agent đánh dấu `TaskPriorityBadge` là
> "được liệt kê nhưng không dùng trên trang này." Tài liệu trang không hề nhắc đến
> `TaskPriorityBadge` — bảng Zones của nó chính xác cite `TaskStatusBadge` (đã xác nhận được dùng
> tại `TodoPageClient.tsx:143`); priority được render inline qua map `PRIORITY_LABEL`
> (`TodoTaskTable.tsx:5-9`). Không có mâu thuẫn — phát hiện bị loại.

**Khớp đúng:** tiêu đề trang "Danh sách Công Việc" + nút "+ Tạo công việc" + cổng `canCreate`; tất
cả nhãn FilterBar + `[Lọc]`/`[Xóa lọc]`; tất cả 4 nhãn metric-card + `grid-cols-2 md:grid-cols-4`;
bảng per-staff 5 cột; các cột task-table; nhãn priority (🔴 Cao / 🟡 TB / 🟢 Thấp); nút sửa ✏️
(bảng) + ✏️ Sửa (card); không có nút xóa; chuyển đổi tiêu đề modal + tất cả nhãn field; ngưỡng
completion-rate (≥80 xanh / ≥50 vàng / else đỏ, `TodoPageClient.tsx:137`); sửa-tạo-bản-sao đã
xác nhận.

---

## Mảng 2 — Luồng Cross-Component

**Kết luận:** xuất sắc. Mọi cache key, staleTime, cổng `enabled`, cite state-layer, và chuyển
đổi view per-staff-row đều khớp với đúng dòng mà tài liệu nêu. "Không có Zustand store" là đúng
(chỉ import `useAuthStore` để kiểm tra role).

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Phạm vi JSX stats-board | "`TodoPageClient.tsx:99-153`" | `{!staffId && (` ngoài cùng mở tại `:93`; block kết thúc `:154` | 🟡 | Cite `:93-154` (bao gồm cả cổng) |
| Trường `notes` chết | (Mảng 5 / Flag 4) | schema `:18` + reset `:50` + payload `:76`, không có input render | 🟡 | đã ghi trong tài liệu; xem Mảng 5 |
| Key invalidation tasks | `['admin','tasks', task.staffId, task.dueDate]` | chính xác — `useTodoTasks.ts:29` | 🟢 | — |
| Key invalidation stats | `['admin','tasks','stats']` (prefix) | chính xác — `useTodoTasks.ts:30` | 🟢 | — |
| staleTimes 15/30/60s | tasks 15s, stats 30s, staff 60s | `useTodoTasks.ts:12` (15k), `:20` (30k), `TodoPageClient.tsx:38` (60k) | 🟢 | — |
| `enabled: !!staffId` | `useTodoTasks.ts:11` | chính xác | 🟢 | — |
| Click per-staff row | `setFilters(f=>({...f, assigned_to: stat.staffId}))` `:131` | chính xác `TodoPageClient.tsx:131` | 🟢 | — |
| Mirror cục bộ FilterBar + sync | `local` `:12`, `useEffect` `:16-18` chỉ sync `assigned_to` | chính xác `TodoFilterBar.tsx:12,16-18` | 🟢 | — |
| Không optimistic update | "chỉ invalidate, không `setQueryData`" | xác nhận `useTodoTasks.ts:28-31` | 🟢 | — |

**Khớp đúng:** §5 cite bảng state-layer; dual `onSuccess` (hook `useTodoTasks.ts:28-31` +
call-site `TodoPageClient.tsx:78`); block invocation modal `:185-193`; tất cả cite dòng kiểu
(`task.ts:5-18`, `:39-42`, `:51-60`); tất cả dòng hàm `admin.api.ts` (`:283-291`).

---

## Mảng 3 — Luồng Cross-Page

**Kết luận:** mọi luận điểm kiến trúc đều đúng — không có localStorage task key, không có Zustand
task store, không có SSE/WS cho tasks, không có route update/delete, đồng bộ pull-only, MySQL row
là hub duy nhất bền vững, `/admin/staff/task-board` đọc cùng endpoint. Tất cả lỗi đều là BE
line-cite cũ.

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Dòng task route | "`main.go:307-309`" (chỉ GET stats/GET tasks/POST tasks) | dòng thực tế `be/cmd/server/main.go:320-322`; group+mw tại `:307-308` | 🟡 | Cập nhật cite → `:320-322` |
| Cite `status='pending'` | "`tasks.sql:48`" | INSERT header `:48`, `VALUES (…,'pending',…)` tại `:49` | 🟡 | Cite `:48-49` |
| Cite status ENUM | "`012_staff_tasks_v2.sql:6`" | `MODIFY COLUMN status ENUM(...)` là `:7` | 🟡 | Cite `:7` |
| Không có localStorage task key | vắng mặt | xác nhận — grep `task` trong `storage-keys.ts` = 0 | 🟢 | — |
| Không có Zustand store task | vắng mặt | xác nhận — `fe/src/store/` chỉ có cart/favourites/settings/theme/training | 🟢 | — |
| Không có SSE/WS cho tasks | không | xác nhận — grep `task` publish/broadcast trong `be/internal/` = 0 | 🟢 | — |
| task-board cùng endpoint | `getTaskStats` `:32`, `getStaffTasks` `:40` | chính xác `task-board/page.tsx:32,40` + `CreateTaskModal` riêng `:10-12` | 🟢 | — |
| Server single-day | `WHERE DATE(due_at)=?` không BETWEEN | xác nhận `tasks.sql:8,26,36` | 🟢 | — |

**Khớp đúng:** vòng đời status (ENUM 4 giá trị, `in_progress` thêm bởi migration 012); status tạo
hardcoded `pending`; ma trận bền vững; hành vi cold-start F5; không có luồng hủy/hoàn tác.

---

## Mảng 4 — Hành Vi Loading

**Kết luận:** chính xác trên mọi luận điểm cấu trúc — không có `loading.tsx`, `page.tsx` 5 dòng,
hai phạm vi nhánh loại trừ lẫn nhau, hình dạng skeleton 7 block, cả hai chuỗi empty-copy khác
nhau, cổng blank stats-null, và "không có error UI trên cả 3 query."

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| Phạm vi phần tử submit-button | "`CreateEditTaskModal.tsx:184-187`" | `<button` mở `:182`; `disabled={isSubmitting}` `:184`; nhãn `:187` | 🟡 | Cite `:182-187` cho phần tử đầy đủ |
| Nhãn tĩnh chế độ sửa | tài liệu loading chỉ mô tả nhãn pending "Đang lưu..." | nhãn sửa không-pending là `Cập nhật` — `CreateEditTaskModal.tsx:187` | 🟡 | Ghi chú ternary 3 chiều |
| Không có `loading.tsx` | vắng mặt | xác nhận — thư mục chỉ có `page.tsx` + `components/` | 🟢 | — |
| Phạm vi Nhánh A (stats) | `:93-154` | chính xác `{!staffId && (` `:93` → `)}` `:154` | 🟢 | — |
| Phạm vi Nhánh B (tasks) | `:157-183` | chính xác `{staffId && (` `:157` → `)}` `:183` | 🟢 | — |
| Skeleton 7 block | h-8 w-48 + h-10 + h-14 ×5 | xác nhận `TodoPageSkeleton.tsx:4-8` (`Array.from({length:5})`) | 🟢 | — |
| Empty copy phân kỳ | mobile "Không có công việc nào" / desktop "...cho bộ lọc này" | `TodoPageClient.tsx:169` / `TodoTaskTable.tsx:21` | 🟢 | — |
| Stats-null blank | `{statsQuery.data ? (...) : null}` `:152` | chính xác | 🟢 | — |
| Không có error UI | cả 3 query không wire `isError` | xác nhận — không có nhánh `isError` trong file | 🟢 | — |

**Khớp đúng:** staleTimes 60k/30k/15k; `enabled: !!staffId`; cả hai cổng skeleton (`:95-96`,
`:159-160`); dropdown staff không có chỉ báo loading.

---

## Mảng 5 — Mô Hình Dữ Liệu FE⇄BE

**Kết luận:** được truy vết tốt. Tất cả 4 cite endpoint handler/service/repo/SQL đều chính xác, mô
hình auth đúng, ánh xạ field `taskToDTO` khớp, và tất cả 4 lỗi code được ghi nhận đều được xác
nhận lại trực tiếp. Drift = dòng route-group `main.go` cũ (+13) và một `❓` giờ có thể giải quyết.

| Component/Chủ đề | Tài liệu nói | Code thực tế (file:line) | Mức | Giải pháp |
|---|---|---|---|---|
| **LỖI 1 — sửa tạo bản sao** | không có PATCH/DELETE; sửa re-POST | xác nhận — `main.go:320-322` (chỉ 3 route), `TodoPageClient.tsx:68` luôn POST | 🔴 | đã ghi trong tài liệu; BE thêm `PATCH /admin/tasks/:id` + wire đường sửa (MASTER row) |
| LỖI 2 — status filter chết | không bao giờ gửi đến BE | xác nhận — `getStaffTasks` xây `?staffId=&date=` thôi (`admin.api.ts:286`); handler không đọc status (`task_handler.go:36-50`); SQL không có predicate status (`tasks.sql:33-40`) | 🟡 | đã ghi trong tài liệu; FE client-filter hoặc thêm BE param |
| LỖI 3 — date-range chết | chỉ single-day | xác nhận — `date = start_date ?? today` (`TodoPageClient.tsx:32`); SQL `DATE(due_at)=?` (`tasks.sql:8,26,36`) | 🟡 | đã ghi trong tài liệu; xóa `Đến ngày` hoặc thêm BETWEEN |
| LỖI 4 — `staffId` xấu → 500 | `== sql.ErrNoRows` bỏ sót lỗi FK | xác nhận — `task_service.go:200` dùng `err == sql.ErrNoRows` (không phải `errors.Is`); INSERT FK 1452 → `ErrInternalError` 500 `:203` | 🟡 | đã ghi trong tài liệu; ánh xạ errno 1452 → 400 |
| `qualityScore` có được trả về không? | "❓ CHƯA XÁC NHẬN BE trả về field này" (`admin_todo_list.md:176`) | **ĐÃ GIẢI QUYẾT — BE trả về**: `quality := rate/20.0` `task_service.go:131`, `QualityScore: quality` `:139`; vẫn không render trên trang này | 🟡 | Xóa ghi chú `❓ CHƯA XÁC NHẬN`; đánh dấu "đã trả về, không render tại đây" |
| Cite staffR group | "`main.go:280-282`" | thực tế `:293-294` (`authMW + AtLeast("manager")`) | 🟢 | Cập nhật cite |
| Cite adminR group | "`main.go:294-309`" | group+mw thực tế `:307-308`, task routes `:320-322` | 🟢 | Cập nhật cite |
| Cite `useTodoTasks` enabled | "`useTodoTasks.ts:12`" | `enabled: !!staffId` là `:11` | 🟢 | Cập nhật cite |
| Kiểu `dueTimeStart/End` | được type `string` không phải `string\|undefined` (Flag 6) | xác nhận `task.ts:13-14`; BE emit `""` (không có `omitempty`, `task_service.go:56-57`) | 🟡 | Thêm `?` vào type hoặc `omitempty` trên DTO |

**Khớp đúng:** tất cả 4 cite endpoint handler/service/SQL (`task_handler.go:24,36,53`;
`task_service.go:111,157,174`; `tasks.sql:1,11,33,42,47`); auth `authMW + AtLeast("manager")` trên
cả hai group; `taskToDTO` (Title→name, AssignedTo→staffId, DueAt→dueDate); bộ field
`CreateTaskPayload`; Task §1 tất cả 12 field; stub `performance_score:0`; `listStaff` chỉ gửi
`limit=100`.

---

## Danh Sách Hành Động Tổng Hợp (theo thứ tự ưu tiên)

| # | Loại | Hành động | File mục tiêu |
|---|---|---|---|
| 1 | 🔴 Lỗi code | Thêm `PATCH /admin/tasks/:id` (handler→service→repo + query `UpdateStaffTask`) + `DELETE` tùy chọn; phân nhánh `handleModalSubmit` theo `mode==='edit'` để gọi nó với `editTask.id` | `be/cmd/server/main.go`, `task_*.go`, `tasks.sql`, `TodoPageClient.tsx`, `admin.api.ts`, `useTodoTasks.ts` |
| 2 | 🟡 Lỗi code | Status filter: lọc `tasksQuery.data` theo `filters.status` (FE) hoặc thêm BE param `status`; bổ sung option `in_progress` còn thiếu | `TodoFilterBar.tsx` / `admin.api.ts` / `tasks.sql` |
| 3 | 🟡 Lỗi code | Date-range: quyết định single-day (xóa `Đến ngày` + guard 90 ngày) hoặc range thực (`BETWEEN`) | `TodoFilterBar.tsx` / `tasks.sql` |
| 4 | 🟡 Lỗi code | Ánh xạ FK errno 1452 → 400 `INVALID_INPUT` khi tạo | `task_repo.go` / `task_service.go` |
| 5 | 🟡 Sửa tài liệu | Giải quyết `❓ CHƯA XÁC NHẬN` của `qualityScore` → "được BE trả về (`task_service.go:131,139`), không render tại đây" | `admin_todo_list.md:176` |
| 6 | 🟢 Sửa tài liệu | Cập nhật BE line-cite cũ: task routes `307-309→320-322`; staffR `280-282→293-294`; adminR `294-309→307-308`; `tasks.sql:48→48-49`; `012_staff_tasks_v2.sql:6→7`; `useTodoTasks.ts:12→11` | `_be.md`, `_crosspage_dataflow.md`, `TODO_BUGS.md` |
| 7 | 🟢 Sửa tài liệu | ASCII/copy: `HĐ`→`Hành động`; thêm nhãn chế độ sửa `Cập nhật`; `Kết thúc (tuỳ chọn)`; cite nguồn ASCII `82-195`; cập nhật nhánh provenance trên tất cả 7 file | `admin_todo_list.md`, tất cả header bộ tài liệu |

> Theo `CLAUDE.md`: các bản sửa tài liệu (#5-7) là **một** task ALIGN; mỗi thay đổi **code** (#1-4)
> phải được đăng ký vào `docs/tasks/MASTER_TASK.md` **trước khi chạm vào bất kỳ file nào**. Skill
> này không thay đổi gì — chỉ làm nổi bật drift.
