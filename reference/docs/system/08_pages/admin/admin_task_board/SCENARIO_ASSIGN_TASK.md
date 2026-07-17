# Scenario — Manager Assigns a Task at Shift Start

> **TL;DR:** ✅ implemented (with critical dead-ends). One concrete run through the Admin Task Board
> end-to-end: a manager arrives, reads today's workload, expands a kitchen-staff row, and assigns a
> new task via the create modal. The scenario is honest — after the task is assigned it stays
> `pending` forever because no endpoint or job exists to advance its status. Any beat that would
> show completion, quality improvement, or overdue escalation **cannot happen in the current code**
> and is marked accordingly.
>
> **Sources traced** (branch `experience_claude.md_system_1`):
> [`page.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx) ·
> [`CreateTaskModal.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx) ·
> [`StaffTaskTable.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx) ·
> [`ExpandedTaskList.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx) ·
> [`admin.api.ts`](../../../../../fe/src/features/admin/admin.api.ts).
> BE internals traced in the sibling: [admin_task_board_be.md](admin_task_board_be.md).
>
> **Siblings:** [admin_task_board.md](admin_task_board.md) · [admin_task_board_be.md](admin_task_board_be.md) ·
> [admin_task_board_crosscomponent_dataflow.md](admin_task_board_crosscomponent_dataflow.md) ·
> [admin_task_board_crosspage_dataflow.md](admin_task_board_crosspage_dataflow.md) ·
> [admin_task_board_loading.md](admin_task_board_loading.md) · [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md)

---

## The cast

| Who | Account | Role | Why they're here |
|---|---|---|---|
| **Nguyễn Quản Lý** | `manager1` | manager | Opening shift — surveys the daily workload and assigns pending tasks |
| **Trần Đầu Bếp** | `chef01` | chef | Kitchen staff; 2 tasks already assigned from an earlier session |
| **Phạm Thu Ngân** | `cashier1` | cashier | At the register; no tasks yet today |

No customer is in this scenario — the Task Board is **manager+ only** and has no customer-facing surface.

---

## The setting

Date: **2026-06-14, 07:45**. The lunch prep shift is starting. Nguyễn Quản Lý opens the admin
dashboard on a laptop in the back office. The restaurant's BE is running on Docker Compose (port
8080); the FE dev server is on port 3000. MySQL has the `staff_tasks` table from migration
`011_staff_tasks.sql` + `012_staff_tasks_v2.sql` — Trần Đầu Bếp already has 2 `pending` tasks
inserted in a previous session.

---

## Minute-by-minute timeline

### 07:45:00 — Manager navigates to /admin/staff/task-board

Nguyễn Quản Lý clicks "Bảng công việc" in the sidebar. Next.js App Router loads
`StaffTaskBoardPage` ([page.tsx:18](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L18)).

**Immediately on mount** the component:

1. Initialises local state ([page.tsx:19-27](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L19)):
   - `filters.date` = `TODAY` = `"2026-06-14"` (ISO slice of `new Date()`)
   - `expandedStaffId` = `null` (no row expanded yet)
   - `modalOpen` = `false`

2. Fires the **stats query** ([page.tsx:30-35](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L30)):

   ```
   GET /api/v1/admin/tasks/stats?date=2026-06-14
   Authorization: Bearer <manager JWT>
   ```

   TanStack Query key: `['admin', 'tasks', 'stats', '2026-06-14']`. Cache is cold — this is the first
   visit. `staleTime` = 30 s; `refetchInterval` = 60 s ([page.tsx:33-34](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L33)).

3. The **expanded-tasks query is disabled** (`enabled: !!expandedStaffId` =
   `false` [page.tsx:41](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L41)) —
   no second request fires yet.

4. **Zone D (KPI cards) renders in skeleton state**: `statsLoading` = `true`, so each
   `KPICard.value` shows `"…"` ([page.tsx:91,94,99,104](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L91)).

5. **Zone E (staff table) is withheld** — `!statsLoading` is false so the conditional skips to no
   content ([page.tsx:112](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L112)).

   Loading detail lives in [admin_task_board_loading.md](admin_task_board_loading.md).

---

### 07:45:01 — Stats response arrives; KPIs + table fill in

The BE handler `GetTaskStats` ([task_handler.go:24](../../../../../be/internal/handler/task_handler.go#L24))
defaults the `date` param to today, runs two MySQL queries — `GetDailyTaskMetrics` then
`GetStaffTaskStats` — and returns `200`:

```jsonc
// Abbreviated — real field names from TaskDTO / StaffTaskStat
{
  "data": {
    "metrics": {
      "totalTasks":     2,   // chef01's 2 existing tasks
      "completedTasks": 0,   // ← always 0 (Bug 1 — see below)
      "inProgressTasks": 0,  // ← always 0 (Bug 1)
      "overdueTasks":   0    // ← always 0 (Bug 1)
    },
    "staffStats": [
      {
        "staffId":      "<uuid chef01>",
        "staffName":    "Trần Đầu Bếp",
        "role":         "chef",
        "assignedCount":   2,
        "completedCount":  0,   // ← always 0 (Bug 1)
        "completionRate":  0,   // ← always 0 (Bug 1)
        "qualityScore":    0.0, // ← 0 / 20.0 = 0 (Bug 2)
        "hasOverdue":   false   // ← always false (Bug 1)
      },
      {
        "staffId":      "<uuid cashier1>",
        "staffName":    "Phạm Thu Ngân",
        "role":         "cashier",
        "assignedCount": 0, "completedCount": 0,
        "completionRate": 0, "qualityScore": 0.0, "hasOverdue": false
      }
    ]
  }
}
```

> **Dead-end: Bug 1.** `completedTasks`, `inProgressTasks`, and `overdueTasks` are permanently `0`
> on a live database. The only mutation on `staff_tasks` is `CreateStaffTask`, which hardcodes
> `status = 'pending'`. There is no `UPDATE` query, no background job, and no staff-facing endpoint
> to advance a task. The "Hoàn thành / Đang thực hiện / Quá hạn" KPI cards will display `0` for
> the lifetime of the current codebase. See [TASK_BOARD_BUGS.md Bug 1](TASK_BOARD_BUGS.md).
>
> **Dead-end: Bug 2.** `qualityScore` is `completionRate / 20.0 = 0 / 20.0 = 0.0`. The "Chất lượng
> ★ 0.0 / 5.0" displayed in the table is not a real quality rating — it is the completion rate
> rescaled. See [TASK_BOARD_BUGS.md Bug 2](TASK_BOARD_BUGS.md).

TanStack Query writes the response to the `['admin', 'tasks', 'stats', '2026-06-14']` cache entry.
React re-renders: the four `KPICard` components receive real values, the
`StaffTaskTable` receives `filteredStaff` (two rows, all client-side filters at
`'all'`) ([page.tsx:49-59](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L49)).

**What the manager sees now:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Tổng công việc hôm nay   Hoàn thành   Đang thực hiện   Quá hạn │
│        2                    0              0               0     │
├──────────────┬─────────┬──────────┬───────────┬────────┬────────┤
│ Nhân viên    │ Vai trò │ Được giao│ Hoàn thành│  Tỷ lệ │ Chất… │
├──────────────┼─────────┼──────────┼───────────┼────────┼────────┤
│ ▶ Trần Đầu… │ Đầu bếp │    2     │     0     │   0%   │★ 0.0  │
│ ▶ Phạm Thu… │ Thu ngân│    0     │     0     │   0%   │★ 0.0  │
└──────────────┴─────────┴──────────┴───────────┴────────┴────────┘
```

The expand chevron (`▶`) is rendered in `StaffTaskTable`
([StaffTaskTable.tsx:90-94](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L90)).
The "Giao việc" button is in each row's `onAssign` slot
([StaffTaskTable.tsx:132-138](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L132)).

---

### 07:45:15 — Manager expands the chef row

Nguyễn Quản Lý clicks the `▶` chevron next to "Trần Đầu Bếp". This calls
`handleToggleExpand('<uuid chef01>')` ([page.tsx:61-63](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L61)):

```typescript
setExpandedStaffId(prev => (prev === staffId ? null : staffId))
// prev = null → next = '<uuid chef01>'
```

`expandedStaffId` becomes `'<uuid chef01>'`. The `enabled` guard in the second `useQuery` is now
`true` — TanStack Query fires the lazy fetch immediately:

```
GET /api/v1/admin/tasks?staffId=<uuid chef01>&date=2026-06-14
Authorization: Bearer <manager JWT>
```

TanStack Query key: `['admin', 'tasks', '<uuid chef01>', '2026-06-14']`. `staleTime` = 15 s
([page.tsx:42](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L42)).

While the request is in flight, `isExpandedLoading = true`. The `ExpandedTaskList` renders:

```
Đang tải công việc…   (animate-pulse)
```

([ExpandedTaskList.tsx:13-18](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx#L13))

The cross-component flow for this expand action is detailed in
[admin_task_board_crosscomponent_dataflow.md](admin_task_board_crosscomponent_dataflow.md).

---

### 07:45:16 — Chef's task list renders

BE handler `GetStaffTasks` ([task_handler.go:36](../../../../../be/internal/handler/task_handler.go#L36))
runs `GetStaffTasksByDate` — `WHERE assigned_to = ? AND DATE(due_at) = ? AND deleted_at IS NULL`,
ordered by priority (high → medium → low) then `due_at ASC`. Returns `200`:

```jsonc
{
  "data": [
    {
      "id": "<uuid t1>",
      "staffId": "<uuid chef01>",
      "name": "Chuẩn bị nguyên liệu sáng",
      "priority": "high",
      "status": "pending",      // ← always pending (Bug 1)
      "dueDate": "2026-06-14",
      "dueTimeStart": "07:00",
      "dueTimeEnd": "08:00",
      "notes": "Chuẩn bị bột, nhân thịt, nhân mộc nhĩ"
    },
    {
      "id": "<uuid t2>",
      "staffId": "<uuid chef01>",
      "name": "Kiểm tra kho lạnh",
      "priority": "medium",
      "status": "pending",      // ← always pending (Bug 1)
      "dueDate": "2026-06-14",
      "dueTimeStart": "",       // optional — was not filled at create
      "dueTimeEnd": "",
      "notes": ""
    }
  ]
}
```

`ExpandedTaskList` renders a sub-table with two rows:

```
┌───────────────────────────┬──────────┬──────────────┬──────────────┬─────────────┐
│ Tên công việc             │ Ưu tiên  │ Giờ          │ Trạng thái   │ Ghi chú     │
├───────────────────────────┼──────────┼──────────────┼──────────────┼─────────────┤
│ Chuẩn bị nguyên liệu sáng│  Cao     │ 07:00–08:00  │  Đang chờ    │ Chuẩn bị…  │
│ Kiểm tra kho lạnh         │  Trung…  │   —          │  Đang chờ    │   —         │
└───────────────────────────┴──────────┴──────────────┴──────────────┴─────────────┘
```

"Giờ" column: `task.dueTimeStart && task.dueTimeEnd ? '07:00–08:00' : '—'`
([ExpandedTaskList.tsx:55-58](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx#L55)).

> **Note: `description` is invisible.** Both tasks were created with `description` fields, but
> `ExpandedTaskList` only renders `notes`
> ([ExpandedTaskList.tsx:62](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx#L62)).
> `description` round-trips through the DTO but no component surfaces it. See
> [TASK_BOARD_BUGS.md Flag 5](TASK_BOARD_BUGS.md).

---

### 07:45:30 — Manager clicks "Giao việc" on the chef row

Nguyễn Quản Lý clicks the orange "Giao việc" button in Trần Đầu Bếp's row. This calls
`handleAssign('<uuid chef01>')` ([page.tsx:65-68](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L65)):

```typescript
setDefaultStaffId('<uuid chef01>')
setModalOpen(true)
```

Because the modal is conditionally mounted (`{modalOpen && <CreateTaskModal .../>}`)
([page.tsx:130-137](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L130)),
`CreateTaskModal` is now first mounted. Its `useForm` initialises with
([CreateTaskModal.tsx:49-54](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L49)):

```typescript
defaultValues: {
  staffId:  '<uuid chef01>',   // pre-selected
  priority: 'medium',
  dueDate:  '2026-06-14',
  dueTime:  '08:00',
}
```

Simultaneously the modal fires a staff-list fetch:

```
GET /api/v1/staff?limit=100
Authorization: Bearer <manager JWT>
```

Query key: `['admin', 'staff']`. `staleTime` = 5 min, `enabled: open = true`
([CreateTaskModal.tsx:39-44](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L39)).

The `useEffect` that re-applies the pre-selection ([CreateTaskModal.tsx:73-77](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L73))
runs once the staff list arrives and calls `setValue('staffId', '<uuid chef01>')` — this covers the
race where the staff list resolves *after* the initial `reset`.

An Escape-key listener is registered to close the modal
([CreateTaskModal.tsx:66-69](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L66)).

---

### 07:45:31 — Staff dropdown populates; modal is ready

`GET /staff?limit=100` returns (abbreviated):

```jsonc
{
  "data": [
    { "id": "<uuid chef01>", "full_name": "Trần Đầu Bếp", "role": "chef" },
    { "id": "<uuid cashier1>", "full_name": "Phạm Thu Ngân", "role": "cashier" },
    ...
  ]
}
```

`staffList = staffData?.data ?? []`
([CreateTaskModal.tsx:45](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L45)).
The `<select>` renders all staff as `<option>` elements
([CreateTaskModal.tsx:131-133](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L131)).
"Trần Đầu Bếp" is already selected because `staffId` was set by `defaultStaffId`.

**What the manager sees:**

```
┌─────────────────────────────────────────────┐
│ Tạo công việc mới                       [✕] │
├─────────────────────────────────────────────┤
│ Nhân viên *                                 │
│ [Trần Đầu Bếp ▼]                           │
│                                             │
│ Tên công việc *                             │
│ [____________________________________]      │
│                                             │
│ Mô tả                                       │
│ [____________________________________]      │
│ [____________________________________]      │
│                                             │
│ Ưu tiên *      │ Ngày hạn *                │
│ [Trung bình ▼] │ [2026-06-14      ]        │
│                                             │
│ Giờ hoàn thành * │ Giờ bắt đầu │ Giờ kết…│
│ [08:00          ] │ [        ] │ [      ] │
│                                             │
│ Ghi chú                                     │
│ [____________________________________]      │
│                                             │
│              [Hủy]  [Tạo công việc]         │
└─────────────────────────────────────────────┘
```

---

### 07:46:00 — Manager fills the form and submits

Nguyễn Quản Lý types:

- **Tên công việc:** "Dọn dẹp bếp sau ca sáng"
- **Ưu tiên:** "Cao" (changed from "Trung bình")
- **Giờ hoàn thành:** "12:00"
- **Giờ bắt đầu:** "11:30"
- **Giờ kết thúc:** "12:00"
- **Ghi chú:** "Lau bếp, vệ sinh dao thớt"

Clicks "Tạo công việc". RHF / Zod validates the form ([CreateTaskModal.tsx:15-25](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L15)):
all required fields present, `priority` is `'high'`, all pass.

`mutation.mutate(v)` fires ([CreateTaskModal.tsx:80-89](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L80)).
The `mutationFn` calls `createTask(body)` → `api.post('/admin/tasks', body)`:

```
POST /api/v1/admin/tasks
Authorization: Bearer <manager JWT>

{
  "staffId":      "<uuid chef01>",
  "name":         "Dọn dẹp bếp sau ca sáng",
  "description":  undefined,           // not filled — omitted
  "priority":     "high",
  "dueDateTime":  "2026-06-14T12:00:00Z",   // ${dueDate}T${dueTime}:00Z (line 85)
  "dueTimeStart": "11:30",
  "dueTimeEnd":   "12:00",
  "notes":        "Lau bếp, vệ sinh dao thớt"
}
```

> `dueDateTime` is built as `${v.dueDate}T${v.dueTime}:00Z`
> ([CreateTaskModal.tsx:85](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L85)).
> The BE service parses it as RFC3339 first, then falls back to `2006-01-02T15:04`
> ([task_service.go:183](../../../../../be/internal/service/task_service.go#L183) — traced in
> [admin_task_board_be.md §3](admin_task_board_be.md)).

While the request is in flight:
- "Tạo công việc" button shows "Đang tạo…" and is `disabled` (both `isSubmitting` and `mutation.isPending`
  are `true`)
  ([CreateTaskModal.tsx:211,214](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L211)).

---

### 07:46:01 — BE processes and responds 201

BE handler `CreateTask`
([task_handler.go:53](../../../../../be/internal/handler/task_handler.go#L53)) binds the body,
validates priority and `dueDateTime`, then calls `task_repo.CreateTask` which generates a UUID and
executes `INSERT INTO staff_tasks … status='pending'`
([tasks.sql.go:14-17](../../../../../be/internal/db/tasks.sql.go#L14) — status is **hardcoded in
the SQL**, not sent by the FE). Immediately re-reads via `GetStaffTaskByID` and returns **201**:

```jsonc
{
  "data": {
    "id":           "<uuid t3>",
    "staffId":      "<uuid chef01>",
    "name":         "Dọn dẹp bếp sau ca sáng",
    "priority":     "high",
    "status":       "pending",         // ← hardcoded, always this value
    "dueDate":      "2026-06-14",      // date portion of due_at
    "dueTimeStart": "11:30",
    "dueTimeEnd":   "12:00",
    "notes":        "Lau bếp, vệ sinh dao thớt",
    "assignedBy":   "<uuid manager1>"  // from JWT claims, not from request body
  }
}
```

The new task row in MySQL:

| column | value | source |
|---|---|---|
| `id` | `<uuid t3>` | server-generated UUID |
| `assigned_to` | `<uuid chef01>` | from request body `staffId` |
| `assigned_by` | `<uuid manager1>` | from JWT claims (caller) |
| `name` | "Dọn dẹp bếp sau ca sáng" | FE form |
| `priority` | `high` | FE form |
| `status` | `pending` | **hardcoded in SQL** — FE cannot set this |
| `due_at` | `2026-06-14 12:00:00` | parsed from `dueDateTime` |
| `due_time_start` | `11:30` | FE form (optional) |
| `due_time_end` | `12:00` | FE form (optional) |
| `notes` | "Lau bếp, vệ sinh dao thớt" | FE form |
| `description` | NULL | not sent |
| `deleted_at` | NULL | not deleted |

---

### 07:46:01 — onSuccess: invalidate, toast, close

`mutation.onSuccess` fires ([CreateTaskModal.tsx:90-96](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L90)):

```typescript
const date = task.dueDate                          // "2026-06-14"
qc.invalidateQueries({ queryKey: ['admin','tasks','stats', date] })
qc.invalidateQueries({ queryKey: ['admin','tasks', task.staffId, date] })
toast.success('Đã tạo công việc thành công')
onSuccess()   // no-op: page.tsx passes () => {}  (line 135)
onClose()     // setModalOpen(false) → unmounts modal
```

Both query keys are marked stale. TanStack Query immediately refetches in the background:

1. **`['admin','tasks','stats','2026-06-14']`** → `GET /admin/tasks/stats?date=2026-06-14` — returns
   `totalTasks: 3` (was 2; the new task counts). The "Tổng công việc hôm nay" KPI card ticks up to **3**.
   "Được giao" in Trần Đầu Bếp's row ticks up from **2 → 3**.

2. **`['admin','tasks','<uuid chef01>','2026-06-14']`** → `GET /admin/tasks?staffId=…` — returns 3
   tasks now. The expanded sub-table adds the new "Dọn dẹp bếp sau ca sáng" row.

The modal is unmounted. The success toast appears bottom-right for a few seconds.

---

### 07:46:05 — Manager reviews the updated board

The board now shows:

```
┌─────────────────────────────────────────────────────────────────┐
│ Tổng công việc hôm nay   Hoàn thành   Đang thực hiện   Quá hạn │
│        3                    0              0               0     │  ← only totalTasks moved
├──────────────┬─────────┬──────────┬───────────┬────────┬────────┤
│ Nhân viên    │ Vai trò │ Được giao│ Hoàn thành│  Tỷ lệ │ Chất… │
├──────────────┼─────────┼──────────┼───────────┼────────┼────────┤
│ ▼ Trần Đầu… │ Đầu bếp │    3     │     0     │   0%   │★ 0.0  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ Chuẩn bị nguyên liệu sáng │ Cao  │ 07:00–08:00│ Đang chờ│  │
│   │ Kiểm tra kho lạnh         │ T.bình│     —     │ Đang chờ│  │
│   │ Dọn dẹp bếp sau ca sáng   │ Cao  │ 11:30–12:00│ Đang chờ│  ← new
│   └──────────────────────────────────────────────────────────┘  │
│ ▶ Phạm Thu… │ Thu ngân│    0     │     0     │   0%   │★ 0.0  │
└──────────────┴─────────┴──────────┴───────────┴────────┴────────┘
```

**What cannot happen next — the permanent dead-end:**

Nguyễn Quản Lý refreshes the page at 12:15 to check if Trần Đầu Bếp completed "Dọn dẹp bếp sau
ca sáng". The task still shows `status: pending`. The "Hoàn thành" KPI is still `0`. The quality
stars are still `★ 0.0`. This is **not a transient loading state** — there is no mechanism to
change it:

- There is no `PUT /admin/tasks/:id` or `PATCH /admin/tasks/:id/status` endpoint.
- There is no background job or cron that sets `status = 'overdue'` when `due_at` passes.
- There is no staff-facing endpoint that lets Trần Đầu Bếp self-mark a task as done.
- The only 4 queries in `querier.go` for the task domain are:
  `CreateStaffTask`, `GetStaffTaskByID`, `GetStaffTasksByDate`, `GetDailyTaskMetrics` + `GetStaffTaskStats`.
  None of these is an UPDATE.

The manager can only assign more tasks. The board's completion and quality surfaces are permanently
decorative in the current codebase.

**See [TASK_BOARD_BUGS.md Bug 1](TASK_BOARD_BUGS.md) for the full diagnosis and suggested fix.**

> Also note: if Nguyễn Quản Lý tries the "Quá hạn" filter in the `StaffTaskFilterBar`, nothing
> happens — the filter only hides rows where `hasOverdue = false`, which is all of them (because
> `hasOverdue` depends on `status = 'overdue'`, which is never set). See
> [TASK_BOARD_BUGS.md Bug 4](TASK_BOARD_BUGS.md).

---

### 07:47:00 — 60-second background refetch

`refetchInterval: 60_000` ([page.tsx:34](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L34))
fires the stats query again automatically. If another manager in a different browser tab assigned a
task to Phạm Thu Ngân in the last minute, this refetch would pick it up. But there is **no
realtime push** — the board only learns about another manager's actions on the next 60 s tick or
after an F5. Cross-page/cross-device detail lives in
[admin_task_board_crosspage_dataflow.md](admin_task_board_crosspage_dataflow.md).

---

## Under the hood

> Mechanism homes are in the siblings. This section names *what happened in this scenario* and
> links to where the full rule is documented.

### A. Cross-component data flow (within the page)

`page.tsx` is the single owner of all state. It passes `statsData` and derived `filteredStaff`
down to `StaffTaskTable` as props; `expandedTasks` (from the lazy query) flows down to
`ExpandedTaskList` via `StaffTaskTable`. The modal receives only `defaultStaffId`, `open`, and
`onClose` / `onSuccess` callbacks — it owns its own `useForm` and `useMutation`. On success the
modal calls back up via `onClose`, then fires `qc.invalidateQueries` directly via `useQueryClient`
without touching any prop.

No Zustand store is involved in this page at all — the task domain uses TanStack Query exclusively
for server state and `useState` for UI state (which row is expanded, whether the modal is open).

Full widget-to-widget data flow: [admin_task_board_crosscomponent_dataflow.md](admin_task_board_crosscomponent_dataflow.md).

### B. Cross-page and cross-device flow

A task created here writes **one `staff_tasks` row** — there is no SSE or WebSocket event fanning
it out to any other page or device. If a second manager has the same board open, their view stays
stale until their own 60 s background refetch fires, or they F5. The task never appears on any
customer-facing page.

Full cross-page analysis: [admin_task_board_crosspage_dataflow.md](admin_task_board_crosspage_dataflow.md).

### C. FE → BE sends

This scenario produced three outbound HTTP calls:

| Beat | Call | Key sent |
|---|---|---|
| Page mount | `GET /admin/tasks/stats?date=2026-06-14` | manager JWT via Bearer |
| Row expand | `GET /admin/tasks?staffId=<chef01>&date=2026-06-14` | manager JWT |
| Modal open | `GET /staff?limit=100` | manager JWT |
| Form submit | `POST /admin/tasks` (body above) | manager JWT; `assigned_by` set server-side from claims |

All go through the shared `api` Axios instance
([admin.api.ts:283,286,289](../../../../../fe/src/features/admin/admin.api.ts#L283)) with the
`Authorization: Bearer` header injected by the request interceptor in
[`api-client.ts`](../../../../../fe/src/lib/api-client.ts). The manager never handles the token.

### D. BE → FE receive

All responses are plain JSON over HTTPS — **no SSE, no WebSocket** on this page. The BE never
pushes task updates to any connected client. The FE learns of changes only by re-fetching:
60 s background interval for stats; immediate invalidation post-create for both stats and the
expanded staff's task list.

### E. Loading and caching

| Query | Cache key | staleTime | Refetch | Who triggers |
|---|---|---|---|---|
| Stats | `['admin','tasks','stats', date]` | 30 s | every 60 s | mount + invalidation |
| Staff tasks | `['admin','tasks', staffId, date]` | 15 s | on demand | expand + invalidation |
| Staff list (modal) | `['admin','staff']` | 5 min | never (shared) | modal open |

No Redis is involved anywhere in the task domain — every query hits MySQL directly. The shortest
staleness window is the expanded task list at 15 s. The longest is the staff dropdown at 5 min.

Skeleton-to-content states and loading guard details:
[admin_task_board_loading.md](admin_task_board_loading.md).

### F. Monitoring

There is **no realtime signal** to monitor for this page. A task assignment is a single
`POST /admin/tasks` — it appears as one request-rate tick in the Grafana "BanhCuon — API
Monitoring" dashboard at `:3001`. If it produces a 500 (e.g. due to an invalid `assigned_to` UUID
triggering a FK constraint — [admin_task_board_be.md Flag 3](admin_task_board_be.md)), it shows up
in the 5xx Error Rate panel. There are no task-domain-specific alerts.

If a second manager's browser is open on the same board, it will **not** show the new task until
its 60 s `refetchInterval` fires or the page is refreshed — there is nothing to monitor that
signals "another manager just acted." This is by design (no WebSocket for admin task events), not
a monitoring gap.

---

## The one-line mental model

> The Task Board is a **static assignment ledger**: a manager can create tasks (always `pending`)
> and read today's totals, but the board can never reflect progress or completion because no code
> path exists to advance a task past `pending` — the completion, quality, and overdue columns are
> permanently zero.
