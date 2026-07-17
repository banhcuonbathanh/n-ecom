# Admin To-Do List — `/admin/todo-list`

> **TL;DR:** ✅ implemented · manager+ · "Danh sách Công Việc" — team task management page.
> `page.tsx` is a thin shell; all logic lives in `TodoPageClient`. The page has **two mutually
> exclusive views**: a per-date **stats board** (4 metric cards + per-staff completion table) when
> no staff member is selected, and a **task list** (table on md+, cards on mobile) when a staff
> member is chosen. Manager/admin can create tasks; "edit" mode re-creates via `POST` (no
> PATCH/DELETE endpoint exists — see Flags). BE endpoints documented in
> [admin_todo_list_be.md](admin_todo_list_be.md). Known bugs in [TODO_BUGS.md](TODO_BUGS.md).

---

## ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ (admin shell: tab nav)                                           │
├──────────────────────────────────────────────────────────────────┤
│ Danh sách Công Việc                      [+ Tạo công việc]       │ ← TodoPageHeader
│                                           (manager+ only)        │
├──────────────────────────────────────────────────────────────────┤
│ Nhân viên [Tất cả ▾]  Từ ngày [──────]  Đến ngày [──────]       │ ← TodoFilterBar
│ Trạng thái [Tất cả ▾]                    [Lọc] [Xóa lọc]         │
│ (options: Tất cả / Chờ / Hoàn thành / Quá hạn — NO "Đang làm")  │
├──────────────────────────────────────────────────────────────────┤
│ VIEW A — no staff selected (staffId = null)                      │
│                                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │  Tổng    │ │Hoàn thành│ │ Đang làm │ │ Quá hạn  │            │ ← metrics cards
│ │   12     │ │    8     │ │    3     │ │    1     │            │   (4 cards, 2-col
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │    md:4-col)
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Nhân viên    │ Được giao │ Xong │ Tỉ lệ  │ Quá hạn         │ │ ← per-staff table
│ │ Nguyễn A     │ 5        │ 4    │ 80%    │ —               │ │   (click row →
│ │ Trần B       │ 7        │ 4    │ 57%    │ [quá hạn]       │ │    sets staffId,
│ └─────────────────────────────────────────────────────────────┘ │    switches to B)
├──────────────────────────────────────────────────────────────────┤
│ VIEW B — staff selected (staffId set)                            │
│                                                                  │
│ (md+) ┌──────────────────────────────────────────────────────┐  │ ← TodoTaskTable
│       │ Tên         │ Ưu tiên  │ Khung giờ   │ Trạng thái │ HĐ│  │
│       │ Vệ sinh bếp │ 🔴 Cao   │ 08:00–09:00 │ [quá hạn]  │ ✏️│  │
│       │ Kiểm kê     │ 🟡 TB    │ 2026-06-14  │ [chờ]      │ ✏️│  │
│       └──────────────────────────────────────────────────────┘  │
│                                                                  │
│ (<md) ┌──────────────────────────┐                              │ ← TodoTaskCard
│       │ Vệ sinh bếp   [quá hạn] │                              │   (mobile only)
│       │ 🔴 Cao  🕐 08:00–09:00   │                              │
│       │                   [✏️ Sửa]│                              │
│       └──────────────────────────┘                              │
│                                                                  │
│ (loading either view: TodoPageSkeleton — pulse bars)             │
└──────────────────────────────────────────────────────────────────┘
  Overlay: CreateEditTaskModal
  ┌────────────────────────────────────────────────┐
  │ Tạo công việc mới / Sửa công việc          [✕] │
  │ Tên công việc *  [................................] │
  │ Giao cho *       [Chọn nhân viên ▾]             │
  │ Ưu tiên *        [🟡 Trung bình ▾]              │
  │ Ngày hạn *  [──────────]  Giờ hạn * [──:──]    │
  │ Bắt đầu (tùy chọn) [──:──]  Kết thúc [──:──]  │
  │ Mô tả            [................................] │
  │                          [Hủy] [Lưu công việc]  │
  └────────────────────────────────────────────────┘
  Note: both create and edit POST /admin/tasks — no PATCH exists.
```

Source: `TodoPageClient.tsx:93-183`, `TodoFilterBar.tsx:41-110`, `TodoTaskTable.tsx:26-80`,
`TodoTaskCard.tsx:17-53`, `CreateEditTaskModal.tsx:59-194`.

---

## Zones

| Zone | Component | Data source |
|---|---|---|
| Header | `todo-list/components/TodoPageHeader` (`TodoPageHeader.tsx:6`) | no data; shows "+ Tạo công việc" button when `canCreate` (manager+) |
| Filter bar | `todo-list/components/TodoFilterBar` (`TodoFilterBar.tsx:11`) | local `TodoTaskFilter` state; staff list from `listStaff` (`GET /staff?limit=100`); apply triggers parent `onChange` |
| Metric cards (View A) | inline in `TodoPageClient.tsx:101-112` | `useTaskStats(date)` → `GET /admin/tasks/stats?date=` · `staleTime=30_000` |
| Per-staff table (View A) | inline in `TodoPageClient.tsx:115-150` | same `statsQuery.data.staffStats`; click row sets `filters.assigned_to` → switches to View B |
| Task table (View B, md+) | `todo-list/components/TodoTaskTable` (`TodoTaskTable.tsx:17`) | `useTodoTasks(staffId, date)` → `GET /admin/tasks?staffId=&date=` · `enabled: !!staffId` · `staleTime=15_000` |
| Task cards (View B, <md) | `todo-list/components/TodoTaskCard` (`TodoTaskCard.tsx:17`) | same `tasksQuery.data` |
| Modal | `todo-list/components/CreateEditTaskModal` (`CreateEditTaskModal.tsx:33`) | `useCreateTask` mutation → `POST /admin/tasks`; staff dropdown from `listStaff` |
| Skeleton | `todo-list/components/TodoPageSkeleton` (`TodoPageSkeleton.tsx:1`) | shown during `statsQuery.isLoading` (View A) or `tasksQuery.isLoading` (View B) |
| Status badge | `components/shared/TaskStatusBadge` | `task.status` value from BE |

---

## Key Interactions

- **"+ Tạo công việc"** (manager+ only, `TodoPageClient.tsx:24`): opens `CreateEditTaskModal` in
  `create` mode → user fills name, staff, priority, due date/time, optional time window +
  description → `POST /admin/tasks` → on success closes modal, invalidates
  `['admin','tasks',staffId,dueDate]` and `['admin','tasks','stats']` queries
  (`useTodoTasks.ts:28-31`).

- **Stats board → task drill-down**: clicking a row in the per-staff table
  (`TodoPageClient.tsx:131`) calls `setFilters(f => ({ ...f, assigned_to: stat.staffId }))`, which
  sets `staffId` and switches the page from View A to View B. The filter bar's staff dropdown also
  syncs via `useEffect` (`TodoFilterBar.tsx:16-18`).

- **Filter bar** (`TodoFilterBar.tsx:20-38`): changes are local until "Lọc" is pressed
  (`handleApply`). Validates date range ≤ 90 days; if exceeded shows inline error. "Xóa lọc"
  resets all fields to `{ status: 'all', page: 1 }`. Note: date range inputs set `start_date` /
  `end_date` on the filter but `useTodoTasks` only passes `date` (= `start_date ?? today`) to the
  BE — `end_date` is collected but **not forwarded** to the API call (`useTodoTasks.ts:7-14`).

- **Edit task** (manager+): row "✏️" button in table (`TodoTaskTable.tsx:65-71`) or card
  (`TodoTaskCard.tsx:40-48`) opens `CreateEditTaskModal` in `edit` mode, pre-filled from `task`
  object (`CreateEditTaskModal.tsx:39-55`). Submitting calls `handleModalSubmit` which fires
  `createTask.mutate(...)` → **POST /admin/tasks** again — this re-creates a duplicate, it does NOT
  update. See Flags/Known Mismatches below and [TODO_BUGS.md](TODO_BUGS.md).

- **No delete button**: `TodoTaskTable` renders only the "✏️" edit column (`TodoTaskTable.tsx:63`);
  there is no delete action anywhere in the UI.

- **Status filter options**: the `<select>` in `TodoFilterBar` offers `Tất cả / Chờ / Hoàn thành /
  Quá hạn` (`TodoFilterBar.tsx:87-91`). There is **no "Đang làm" option** in the filter (though
  `in_progress` is a valid `TaskStatus` in `task.ts:1` and displayed in the metric cards).

---

## Business Logic Used

- RBAC gate (manager+ to create/edit): `isManagerOrAdmin` helper
  (`TodoPageClient.tsx:18-20`), checks `role === 'manager' || role === 'admin'`. For broader RBAC
  hierarchy → [../../07_business_logic/LOGIC_FE.md](../../07_business_logic/LOGIC_FE.md) and
  [../../02_spec/BUSINESS_RULES.md §1 RBAC](../../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy).
- Task status definitions + badge colours → [../../07_business_logic/LOGIC_FE.md](../../07_business_logic/LOGIC_FE.md)
  (task hooks + `TaskStatusBadge`).
- Completion rate colour thresholds applied inline: `≥80%` green · `50-79%` yellow · `<50%` red
  (`TodoPageClient.tsx:137-139`).
- Date range cap of 90 days enforced client-side only (`TodoFilterBar.tsx:22-28`); no BE
  enforcement observed.

---

## Object Model

This page consumes two shapes from the task domain. Column definitions live in
[../../02_spec/DB_SCHEMA.md §Staff Tasks](../../02_spec/DB_SCHEMA.md) — only the FE-facing
mapping is noted here.

### §1 Task

Source: `fe/src/types/task.ts:5-18`

| FE field | FE type | Notes |
|---|---|---|
| `id` | `string` (UUID) | PK |
| `staffId` | `string` (UUID) | assigned staff |
| `name` | `string` | max 200 chars (modal validation) |
| `description` | `string \| undefined` | shown as subtitle in table, full text in card |
| `priority` | `'high' \| 'medium' \| 'low'` | rendered as emoji labels in table/card |
| `dueDate` | `string` "YYYY-MM-DD" | fallback display when no time window |
| `dueTimeStart` | `string` "HH:mm" | may be empty string; optional time window start |
| `dueTimeEnd` | `string` "HH:mm" | may be empty string; optional time window end |
| `status` | `'pending' \| 'in_progress' \| 'completed' \| 'overdue'` | drives badge + row highlight |
| `notes` | `string \| undefined` | collected in modal but not rendered in table/card |
| `createdAt` | `string` | ISO 8601 |
| `updatedAt` | `string` | ISO 8601 |

### §2 StaffTaskStatsResponse (View A)

Source: `fe/src/types/task.ts:20-42`

Two sub-shapes returned by `GET /admin/tasks/stats?date=`:

**DailyTaskMetrics** (`task.ts:20-26`): `date`, `totalTasks`, `completedTasks`,
`inProgressTasks`, `overdueTasks` — rendered in the 4 metric cards.

**StaffTaskStat** (`task.ts:28-37`): `staffId`, `staffName`, `role`, `assignedCount`,
`completedCount`, `completionRate` (0-100), `qualityScore` (0-5.0), `hasOverdue` — rendered in
the per-staff table. Note: `qualityScore` is present in the type but **not rendered** anywhere in
the current UI (`TodoPageClient.tsx:115-150`). ❓ UNVERIFIED whether BE actually returns this
field.

### §3 CreateTaskPayload

Source: `fe/src/types/task.ts:51-60`

Fields sent on `POST /admin/tasks`: `staffId`, `name`, `description?`, `priority`, `dueDateTime`
(ISO 8601 composed as `${dueDate}T${dueTime}:00Z` in `TodoPageClient.tsx:67`), `dueTimeStart?`,
`dueTimeEnd?`, `notes?`. The modal collects `notes` in the Zod schema (`CreateEditTaskModal.tsx:9`)
but the `<textarea>` in the rendered form only covers `description` — there is **no `notes` input
field** rendered (`CreateEditTaskModal.tsx:163-171`). `notes` will always be `undefined` in
submitted payloads.

### Flags / Known Mismatches

1. **Edit creates a duplicate (critical bug).** `handleModalSubmit` always calls
   `createTask.mutate(...)` → `POST /admin/tasks` regardless of `mode`
   (`TodoPageClient.tsx:68`). There is no `PATCH /admin/tasks/:id` or `DELETE /admin/tasks/:id`
   endpoint. Opening "edit" mode and submitting POSTs a new task with the same data. Tracked in
   [TODO_BUGS.md](TODO_BUGS.md).

2. **`end_date` filter collected but not sent to BE.** `TodoFilterBar` accepts an `end_date` date
   input but `useTodoTasks` only uses `start_date ?? today` as the single `date` query param
   (`useTodoTasks.ts:12`). The `end_date` value is silently ignored. Tracked in
   [TODO_BUGS.md](TODO_BUGS.md).

3. **`in_progress` not filterable.** `TaskStatus` includes `in_progress` (`task.ts:1`) and the
   stats board shows an "Đang làm" count (`TodoPageClient.tsx:104`), but the filter bar has no
   `in_progress` option (`TodoFilterBar.tsx:87-91`). Staff cannot filter their task list to show
   only in-progress tasks.

4. **`notes` field unreachable.** The modal Zod schema includes `notes` (`CreateEditTaskModal.tsx:18`)
   and `CreateTaskPayload` carries it, but no `<textarea>` for `notes` is rendered in the form.
   Notes data can be stored in DB (if set elsewhere) but can never be set from this page.

5. **`qualityScore` rendered nowhere.** Present in `StaffTaskStat` type but never displayed in
   the per-staff stats table (`TodoPageClient.tsx:115-150`).

6. **`staffId` missing from `Task` type comment.** `dueTimeStart` and `dueTimeEnd` are typed as
   `string` (not `string | undefined`) but described in comments as "may be empty" — the table and
   card treat them as potentially falsy (`TodoTaskTable.tsx:56-58`), which is correct at runtime
   but inconsistent with the type declaration (`task.ts:13-14`).

---

## Sibling Files

| File | Status |
|---|---|
| [admin_todo_list_be.md](admin_todo_list_be.md) | BE endpoints: `GET /admin/tasks/stats`, `GET /admin/tasks`, `POST /admin/tasks`, `GET /staff?limit=100` |
| [admin_todo_list_crosscomponent_dataflow.md](admin_todo_list_crosscomponent_dataflow.md) | How filter state flows from FilterBar → client → hooks → views |
| [admin_todo_list_crosspage_dataflow.md](admin_todo_list_crosspage_dataflow.md) | Task data lifetime across pages/devices |
| [admin_todo_list_loading.md](admin_todo_list_loading.md) | Skeleton + per-query loading states |
| [SCENARIO_TODO_ASSIGN.md](SCENARIO_TODO_ASSIGN.md) | End-to-end narrative: manager assigns daily tasks to kitchen staff |
| [TODO_BUGS.md](TODO_BUGS.md) | Edit-duplicate bug + dead end_date filter bug |
