# Admin To-Do List — Backend View — `/admin/todo-list`

> **TL;DR:** ✅ implemented · the BE twin of
> [admin_todo_list.md](admin_todo_list.md). The page calls **4 endpoints, all `authMW` +
> `AtLeast("manager")`**: `GET /staff` (assignee dropdown + per-staff stat names),
> `GET /admin/tasks/stats` (daily metrics + per-staff board), `GET /admin/tasks` (one staff
> member's tasks for one day), `POST /admin/tasks` (create). **All reads hit MySQL directly —
> no Redis cache** anywhere in the task or staff path. The page is **read + create only**: there
> is **no update and no delete task endpoint** — the "edit" modal re-POSTs and creates a duplicate
> (see [TODO_BUGS.md](TODO_BUGS.md)).
>
> **Sources traced (branch `experience_claude.md_system_1`):**
> `be/cmd/server/main.go` · `be/internal/handler/task_handler.go` · `be/internal/handler/staff_handler.go`
> · `be/internal/service/task_service.go` · `be/internal/service/staff_service.go`
> · `be/internal/repository/task_repo.go` · `be/internal/repository/staff_repo.go`
> · `be/query/tasks.sql` · `be/migrations/011_staff_tasks.sql` · `be/migrations/012_staff_tasks_v2.sql`
> · FE callers: `fe/src/features/admin/admin.api.ts` · `fe/src/hooks/useTodoTasks.ts`.
> Object model home → [../../02_spec/DB_SCHEMA.md §Staff Tasks](../../02_spec/DB_SCHEMA.md#staff-tasks--staff_tasks).

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `GET /staff?limit=100` | authMW · `AtLeast("manager")` | `StaffHandler.ListStaff` (`staff_handler.go:26`) | `StaffService.ListStaff` (`staff_service.go:61`) | `staffRepo.ListStaff` — raw dynamic SQL (`staff_repo.go:70`) | ❌ none |
| 2 | `GET /admin/tasks/stats?date=` | authMW · `AtLeast("manager")` | `TaskHandler.GetTaskStats` (`task_handler.go:24`) | `TaskService.GetTaskStats` (`task_service.go:111`) | `GetDailyTaskMetrics` + `GetStaffTaskStats` (`tasks.sql:1,11`) | ❌ none |
| 3 | `GET /admin/tasks?staffId=&date=` | authMW · `AtLeast("manager")` | `TaskHandler.GetStaffTasks` (`task_handler.go:36`) | `TaskService.GetStaffTasks` (`task_service.go:157`) | `GetStaffTasksByDate` (`tasks.sql:33`) | ❌ none |
| 4 | `POST /admin/tasks` | authMW · `AtLeast("manager")` | `TaskHandler.CreateTask` (`task_handler.go:53`) | `TaskService.CreateTask` (`task_service.go:174`) | `CreateStaffTask` → `GetStaffTaskByID` (`tasks.sql:47,42`) | ❌ none |

**Route registration:** `/staff` group — `be/cmd/server/main.go:280-282` (`staffR.Use(authMW, middleware.AtLeast("manager"))`). `/admin/tasks*` — `be/cmd/server/main.go:294-309` (`adminR.Use(authMW, middleware.AtLeast("manager"))`).

> The page calls exactly these 4. It calls **no** PATCH or DELETE for tasks — none exist in the
> router (`main.go:307-309` registers only `GET /tasks/stats`, `GET /tasks`, `POST /tasks`).

---

## Auth Model on This Page

- **Every endpoint is staff-only, manager-and-above.** Both groups apply `authMW` then
  `middleware.AtLeast("manager")` (`main.go:281`, `main.go:295`). A guest/customer JWT or a
  chef/cashier/staff JWT is rejected (403) before the handler runs. There is no public surface.
- **FE mirror:** the page wraps in the admin shell (`AuthGuard` + `RoleGuard minRole=MANAGER`,
  see [../../08_pages/PAGES_INDEX.md](../../08_pages/PAGES_INDEX.md) admin shell), and
  `TodoPageClient` independently gates the create/edit buttons behind
  `isManagerOrAdmin(user.role)` (`TodoPageClient.tsx:18,24`). So `canCreate` is FE chrome only —
  the BE `AtLeast("manager")` is the real gate.
- **`assigned_by` = the caller.** On create, the handler reads `middleware.StaffIDFromContext(c)`
  (`task_handler.go:70`) and passes it as `CallerID` → stored as `assigned_by`
  (`task_service.go:189`, `task_repo.go:106`). The FE never sends who created the task; the JWT does.
- **No ownership scoping on reads.** Any manager+ can read any staff member's tasks/stats — there
  is no "only your own team" filter. `GetStaffTasks` takes `staffId` straight from the query
  string (`task_handler.go:37`).

---

## Per-Endpoint Detail

### 1 · GET /staff?limit=100 — assignee dropdown + stat-row names

- **Handler** `staff_handler.go:26-52` — reads optional `role`, `search`, `page`, `is_active`,
  and `limit` (default 20). The page sends only `limit=100` (`admin.api.ts:93`).
- **Service** `staff_service.go:61-74` — clamps `limit` to `[1,100]` (`staff_repo.go:74`), builds
  filters, returns `{Staff, Total, Page, Limit}`.
- **Repo** `staff_repo.go:70-109` — **hand-built dynamic SQL** (not a sqlc named query): a
  `COUNT(*)` + a `SELECT … FROM staff WHERE deleted_at IS NULL [+ role/is_active/search] ORDER BY
  created_at DESC LIMIT ? OFFSET ?`. `shifts` is `COALESCE(shifts,'[]')`.
- **Serializer** `toStaffJSON` (`staff_handler.go:238`) → `{id, username, full_name, role,
  job_title, shifts, responsibilities, phone, email, is_active, performance_score:0, created_at}`.
  Response shape: `{ data: [...], meta: {page,limit,total} }`.
- **What the page uses:** only `id` + `full_name` — for the modal `<select>` and to label the
  per-staff stats rows (`TodoPageClient.tsx:41`, `CreateEditTaskModal.tsx:100`).

### 2 · GET /admin/tasks/stats?date= — daily metrics + per-staff board

- **Handler** `task_handler.go:24-33` — `date` defaults to **today** (`time.Now().Format`) when
  absent. Wraps result in `{ data: ... }`.
- **Service** `task_service.go:111-154` — parses `date` (`YYYY-MM-DD`; bad → `INVALID_INPUT` 400),
  calls two repo methods, derives `qualityScore = completionRate / 20.0` (0–5 scale,
  `task_service.go:131`).
- **Repo / SQL:**
  - `GetDailyTaskMetrics` (`tasks.sql:1-9`) — one row: `total / completed / in_progress / overdue`
    counts over `WHERE DATE(due_at)=? AND deleted_at IS NULL`.
  - `GetStaffTaskStats` (`tasks.sql:11-31`) — `staff LEFT JOIN staff_tasks` on the date; per active
    staff: `assigned_count`, `completed_count`, `completion_rate` (rounded %), `has_overdue`.
    Filters `s.deleted_at IS NULL AND s.is_active=1`, ordered by `full_name`.
- **Response** `StaffTaskStatsResponse` = `{ metrics:{date,totalTasks,completedTasks,
  inProgressTasks,overdueTasks}, staffStats:[{staffId,staffName,role,assignedCount,completedCount,
  completionRate,qualityScore,hasOverdue}] }` (`task_service.go:44-47,25-42`).
- **What the page uses:** all of `metrics` (4 stat cards) and `staffStats` rows
  (`TodoPageClient.tsx:100-148`). `qualityScore` and `role` are returned but **not rendered** here
  (they are consumed by [admin_task_board](../admin_task_board/admin_task_board.md)).

### 3 · GET /admin/tasks?staffId=&date= — one staff member's day

- **Handler** `task_handler.go:36-50` — **`staffId` is required** (missing → `INVALID_INPUT` 400,
  `task_handler.go:38-41`); `date` defaults to today.
- **Service** `task_service.go:157-171` — parses date, maps `[]db.StaffTask` → `[]TaskDTO` via
  `taskToDTO` (`task_service.go:78-102`). Note `taskToDTO` maps DB `Title→name`,
  `AssignedTo→staffId`, `DueAt→dueDate` (date only), and exposes `dueTimeStart/dueTimeEnd/notes`
  only when the nullable column is valid.
- **Repo / SQL** `GetStaffTasksByDate` (`tasks.sql:33-40`) — `SELECT * FROM staff_tasks WHERE
  assigned_to=? AND DATE(due_at)=? AND deleted_at IS NULL ORDER BY priority(high,med,low), due_at`.
- **What the page uses:** the array renders `TodoTaskTable` (desktop) / `TodoTaskCard` (mobile).
  Only shown when a staff member is selected (`enabled: !!staffId`, `useTodoTasks.ts:12`).

### 4 · POST /admin/tasks — create a task

- **Handler** `task_handler.go:53-85` — binds `{staffId(req), name(req,1..200), description,
  priority(req), dueDateTime(req), dueTimeStart, dueTimeEnd, notes}`. Injects caller as
  `CallerID`. Returns **201** `{ data: TaskDTO }`.
- **Service** `task_service.go:174-206`:
  - validates `priority ∈ {high,medium,low}` → else `INVALID_INPUT` 400.
  - parses `dueDateTime` as RFC3339, falling back to `2006-01-02T15:04`; bad → `INVALID_INPUT` 400.
  - builds `CreateTaskInput` (`AssignedBy = CallerID`) and inserts.
- **Repo / SQL** `task_repo.go:102-121` — generates a UUID, runs `CreateStaffTask` (`tasks.sql:47`)
  which inserts with `status='pending'` hard-coded, then re-reads the row via `GetStaffTaskByID`
  (`tasks.sql:42`) and returns it.
- **FE payload** (`useTodoTasks.ts:24-33`, `admin.api.ts:289`): the page folds the modal's required
  `dueTime` into `dueDateTime = "${dueDate}T${dueTime}:00Z"` (`TodoPageClient.tsx:67`) and sends
  `dueTimeStart/dueTimeEnd` only when the optional window inputs are filled.
- **Cache invalidation (FE-side):** on success, `useCreateTask` invalidates
  `['admin','tasks',staffId,dueDate]` and `['admin','tasks','stats']` (`useTodoTasks.ts:29-30`) —
  TanStack Query cache only; there is no server cache to bust.

---

## Caching & Invalidation

**No Redis on any path used by this page.** `task_service`/`task_repo` and
`staff_service`/`staff_repo` import no cache client; every read is a direct MySQL query. This is
deliberate — [REDIS_CACHE.md:48](../../03_be/REDIS_CACHE.md) lists **tasks** and the **staff list**
among the uncached, low-traffic surfaces. The only "cache" in play is the **FE TanStack Query
cache** (`staleTime`: staff 60s, stats 30s, tasks 15s — `TodoPageClient.tsx:38`,
`useTodoTasks.ts:13,20`), invalidated client-side after a create.

---

## Error Behaviour

| Trigger | Where | Response | FE-visible state |
|---|---|---|---|
| Missing `staffId` on `GET /admin/tasks` | `task_handler.go:38-41` | 400 `INVALID_INPUT` | Not hit — hook is `enabled: !!staffId` so the call never fires without one |
| Bad `date` format (stats / tasks) | `task_service.go:114,160` | 400 `INVALID_INPUT` | Query error; skeleton clears to nothing (no error toast wired) |
| Bad `priority` on create | `task_service.go:176` | 400 `INVALID_INPUT` | Modal stays open; mutation error |
| Bad `dueDateTime` on create | `task_service.go:183` | 400 `INVALID_INPUT` | Same |
| Bind failure on create (missing required field) | `task_handler.go:65` | 400 `INVALID_INPUT` | Zod blocks most of these client-side first (`CreateEditTaskModal.tsx:9-19`) |
| Bad `staffId` (FK violation) on create | INSERT fails in `CreateStaffTask` | **500 `ErrInternalError`** (`task_service.go:203`) — *not* a clean 404 | Generic failure; see Flag 3 |
| Repo read error (stats/tasks) | `task_service.go:119,124,164` | 500 `ErrInternalError` | Query error |

Error envelope + codes → [../../02_spec/ERROR_SPEC.md](../../02_spec/ERROR_SPEC.md).

---

## Flags

> Cross-reference with the FE sibling's flags in [admin_todo_list.md](admin_todo_list.md) and the
> code-bug file [TODO_BUGS.md](TODO_BUGS.md) (these are *code* bugs, not stale docs — a doc edit
> cannot fix them).

| # | Flag | Detail |
|---|---|---|
| 1 | **No update/delete endpoint exists** | Router has only `GET stats`, `GET tasks`, `POST tasks` (`main.go:307-309`). The FE modal's "edit" mode and the type's `UpdateTaskPayload` (`types/task.ts`) have **no BE counterpart**. Editing a task re-POSTs → **creates a duplicate**. 🔴 → [TODO_BUGS.md](TODO_BUGS.md) Bug 1. |
| 2 | **Status filter is never sent to BE** | `TodoFilterBar` offers a status `<select>` (`TodoFilterBar.tsx:82-91`), but `useTodoTasks(staffId, date)` and `getStaffTasks` send only `staffId`+`date` (`useTodoTasks.ts:11`, `admin.api.ts:286`). `GetStaffTasks` reads no status param. Choosing a status does nothing. → [TODO_BUGS.md](TODO_BUGS.md) Bug 2. |
| 3 | **Date-range filter is dead** | `TodoFilterBar` exposes `Từ ngày/Đến ngày` with a 90-day guard (`TodoFilterBar.tsx:20-32`), but the page collapses it to a single `date = start_date ?? today` (`TodoPageClient.tsx:32`); `end_date` is never sent. Both stats + tasks are single-day only on the server (`WHERE DATE(due_at)=?`). → [TODO_BUGS.md](TODO_BUGS.md) Bug 3. |
| 4 | **Bad `staffId` on create → 500, not 4xx** | `CreateTask` service has an `if err == sql.ErrNoRows → ErrNotFound` branch (`task_service.go:200`), but `CreateStaffTask` is an `:exec` INSERT — a FK violation on `assigned_to` returns a generic driver error, so the caller gets `ErrInternalError` 500 instead of a 400/404. The dropdown is populated from `GET /staff`, so this is only reachable with a stale id. → [TODO_BUGS.md](TODO_BUGS.md) Bug 4. |
| 5 | **`status` is server-assigned, never client-set** | `CreateStaffTask` hard-codes `status='pending'` (`tasks.sql:48`). The modal has no status field; `overdue` is derived by reads, not stored on create. Consistent — noted so a future "edit status" feature knows there is no write path today. |
| 6 | **`performance_score:0` is a stub** | `toStaffJSON` always emits `performance_score:0` (`staff_handler.go:250`). The page ignores it. Harmless here; flagged because the staff page may rely on it. |
