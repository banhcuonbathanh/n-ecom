# Admin Task Board — Backend View — `/admin/staff/task-board`

> **TL;DR:** ✅ implemented · **manager+ only**. The BE twin of
> [admin_task_board.md](admin_task_board.md). This page calls **4 endpoints** (3 reads + 1 write),
> all under the `manager+`-gated `/admin` group (plus the `/staff` list used by the create modal).
> Every read hits **MySQL directly — no Redis cache anywhere** in the task domain.
> **Biggest gotcha:** task `status` is write-once `pending` — no endpoint or job ever advances a
> task to `in_progress`/`completed`/`overdue`, so the entire stats surface (3 of the 4 KPIs,
> completion %, quality stars, overdue highlight) is **permanently zero on a live DB**. See
> [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md).
>
> **Sources traced** (branch `experience_claude.md_system_1`):
> `be/cmd/server/main.go` · `be/internal/handler/task_handler.go` ·
> `be/internal/service/task_service.go` · `be/internal/repository/task_repo.go` ·
> `be/internal/db/tasks.sql.go` · `be/migrations/011_staff_tasks.sql` ·
> `be/migrations/012_staff_tasks_v2.sql`.
> FE callers: [admin.api.ts](../../../../../fe/src/features/admin/admin.api.ts) ·
> [page.tsx](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx).
> Object/field home: [DB_SCHEMA.md §Staff Tasks](../../../02_spec/DB_SCHEMA.md) ·
> [API_SPEC.md §Admin — Tasks](../../../02_spec/API_SPEC.md).

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|----------|------|---------|---------|--------------|-------------|
| 1 | `GET /admin/tasks/stats?date=` | manager+ | `GetTaskStats` ([task_handler.go:24](../../../../../be/internal/handler/task_handler.go#L24)) | `GetTaskStats` ([task_service.go:111](../../../../../be/internal/service/task_service.go#L111)) | `GetDailyMetrics`+`GetStaffStats` → sqlc `GetDailyTaskMetrics` ([tasks.sql.go:66](../../../../../be/internal/db/tasks.sql.go#L66)) + `GetStaffTaskStats` ([tasks.sql.go:140](../../../../../be/internal/db/tasks.sql.go#L140)) | **none** |
| 2 | `GET /admin/tasks?staffId=&date=` | manager+ | `GetStaffTasks` ([task_handler.go:36](../../../../../be/internal/handler/task_handler.go#L36)) | `GetStaffTasks` ([task_service.go:157](../../../../../be/internal/service/task_service.go#L157)) | `GetTasksByStaffDate` → sqlc `GetStaffTasksByDate` ([tasks.sql.go:181](../../../../../be/internal/db/tasks.sql.go#L181)) | **none** |
| 3 | `POST /admin/tasks` | manager+ | `CreateTask` ([task_handler.go:53](../../../../../be/internal/handler/task_handler.go#L53)) | `CreateTask` ([task_service.go:174](../../../../../be/internal/service/task_service.go#L174)) | `CreateTask` → sqlc `CreateStaffTask` ([tasks.sql.go:32](../../../../../be/internal/db/tasks.sql.go#L32)) + `GetStaffTaskByID` ([tasks.sql.go:84](../../../../../be/internal/db/tasks.sql.go#L84)) | **none** |
| 4 | `GET /staff?limit=100` | manager+ | `staffH.ListStaff` ([main.go:282](../../../../../be/cmd/server/main.go#L282)) | staff domain | staff list query | **none** |

Route registration: tasks at [main.go:307-309](../../../../../be/cmd/server/main.go#L307); staff list at
[main.go:280-282](../../../../../be/cmd/server/main.go#L280). Endpoint #4 belongs to the **staff
domain** (shared with [admin_staff](../admin_staff/admin_staff.md)); only its route + auth are
traced here — it is used solely to populate the create-task modal's staff dropdown.

---

## Auth Model on This Page

- **Every endpoint is `manager+`.** The `/admin` group applies `authMW` + `middleware.AtLeast("manager")`
  to all children ([main.go:294-295](../../../../../be/cmd/server/main.go#L294)); the `/staff` group
  is gated identically ([main.go:280-281](../../../../../be/cmd/server/main.go#L280)). There is **no**
  public, guest-JWT, or `cashier`/`chef` access to any task endpoint.
- **No per-staff ownership scoping.** `GET /admin/tasks?staffId=` lets any manager read **any** staff
  member's tasks — intended for an admin oversight board, not a self-service view. There is no check
  that the caller is the assigned staff.
- **`assigned_by` is the caller.** On create, the service stamps `AssignedBy = middleware.StaffIDFromContext(c)`
  ([task_handler.go:70](../../../../../be/internal/handler/task_handler.go#L70) →
  [task_service.go:189](../../../../../be/internal/service/task_service.go#L189)). `assigned_to` comes
  from the request body (`staffId`).

---

## Per-Endpoint Detail

### 1 · GET /admin/tasks/stats?date=YYYY-MM-DD

- **Handler** ([task_handler.go:24](../../../../../be/internal/handler/task_handler.go#L24)): `date`
  defaults to today (`time.Now().Format("2006-01-02")`) if the query param is absent. Returns
  `{"data": StaffTaskStatsResponse}`.
- **Service** ([task_service.go:111](../../../../../be/internal/service/task_service.go#L111)): parses
  the date (bad format → 400 `INVALID_INPUT`), then issues **two** queries —
  `GetDailyMetrics` (the KPI row) and `GetStaffStats` (the table rows).
- **`metrics`** comes from sqlc `GetDailyTaskMetrics` ([tasks.sql.go:48-57](../../../../../be/internal/db/tasks.sql.go#L48)):
  `COUNT(*)` total + three `SUM(CASE WHEN status = …)` buckets over `WHERE DATE(due_at) = ? AND deleted_at IS NULL`.
- **`staffStats`** comes from sqlc `GetStaffTaskStats` ([tasks.sql.go:107-128](../../../../../be/internal/db/tasks.sql.go#L107)):
  a `LEFT JOIN staff … staff_tasks` so **every active, non-deleted staff row appears** even with zero
  tasks; `completion_rate` = `ROUND(100 * completed / COUNT(t.id))` (0 when no tasks); `has_overdue`
  = `MAX(status='overdue')`.
- **`qualityScore` is synthetic** — the service derives it as `completionRate / 20.0`
  ([task_service.go:131](../../../../../be/internal/service/task_service.go#L131)). There is **no
  stored quality rating**; the "Chất lượng ★ X/5.0" column is just the completion rate rescaled.
  See Flags / [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md) Bug 2.

### 2 · GET /admin/tasks?staffId=&date=YYYY-MM-DD

- **Handler** ([task_handler.go:36](../../../../../be/internal/handler/task_handler.go#L36)): `staffId`
  is **required** — empty → 400 `INVALID_INPUT` ("staffId là bắt buộc"). `date` defaults to today.
- **Service** ([task_service.go:157](../../../../../be/internal/service/task_service.go#L157)): parses
  the date, calls `GetTasksByStaffDate`, maps each `db.StaffTask` → `TaskDTO` via `taskToDTO`
  ([task_service.go:78](../../../../../be/internal/service/task_service.go#L78)).
- **Query** sqlc `GetStaffTasksByDate` ([tasks.sql.go:171-179](../../../../../be/internal/db/tasks.sql.go#L171)):
  `WHERE assigned_to = ? AND DATE(due_at) = ? AND deleted_at IS NULL`, ordered by priority
  (high→medium→low) then `due_at ASC`.
- **`dueDate`** in the DTO is `due_at` truncated to `YYYY-MM-DD`; `dueTimeStart`/`dueTimeEnd` are the
  separate optional display strings (may be empty) — **not** derived from `due_at`'s clock component.

### 3 · POST /admin/tasks

- **Handler** ([task_handler.go:53](../../../../../be/internal/handler/task_handler.go#L53)): binds
  `{staffId, name, description, priority, dueDateTime, dueTimeStart, dueTimeEnd, notes}`. `staffId`,
  `name` (1–200), `priority`, `dueDateTime` are `binding:"required"`; bind failure → 400 `INVALID_INPUT`.
  Returns **201** `{"data": TaskDTO}`.
- **Service** ([task_service.go:174](../../../../../be/internal/service/task_service.go#L174)):
  validates priority ∈ {high,medium,low} (else 400); parses `dueDateTime` as RFC3339, falling back to
  `2006-01-02T15:04` (else 400). FE sends `${dueDate}T${dueTime}:00Z`
  ([CreateTaskModal.tsx:85](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L85)).
- **Repo** ([task_repo.go:102](../../../../../be/internal/repository/task_repo.go#L102)): generates a
  UUID, `INSERT … status='pending'` (hardcoded in the SQL,
  [tasks.sql.go:14-17](../../../../../be/internal/db/tasks.sql.go#L14)), then re-reads via
  `GetStaffTaskByID` to return the full row.
- **No availability / FK pre-check.** If `assigned_to` is not a real staff id, the `fk_tasks_assigned_to`
  constraint ([011_staff_tasks.sql:20](../../../../../be/migrations/011_staff_tasks.sql#L20)) rejects the
  insert → the repo returns a driver error → the service maps any non-`ErrNoRows` error to
  `ErrInternalError` → **500** (not a 400/422). See Flags.

### 4 · GET /staff?limit=100 (create-modal dropdown)

- Registered at [main.go:282](../../../../../be/cmd/server/main.go#L282), `manager+`. Returns the active
  staff list the modal renders as `<option>`s
  ([CreateTaskModal.tsx:131-133](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L131)).
  Full handler→service→repo trace lives in the staff-domain BE doc — not duplicated here (Rule #9).

---

## Caching & Invalidation

- **No Redis.** `TaskService` and `taskRepo` hold no cache client; every read executes its sqlc query
  against MySQL on each call. There is nothing to invalidate server-side.
- **Client-side cache only** (TanStack Query): the stats query keys on
  `['admin','tasks','stats', date]` (staleTime 30 s, `refetchInterval` 60 s); the expanded query keys
  on `['admin','tasks', staffId, date]` (staleTime 15 s, lazy via `enabled`). After a successful
  create, the modal invalidates **both** keys for the new task's date
  ([CreateTaskModal.tsx:92-93](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L92)).
  Detail in [admin_task_board_loading.md](admin_task_board_loading.md) and
  [admin_task_board_crosscomponent_dataflow.md](admin_task_board_crosscomponent_dataflow.md).

---

## Error Behaviour

| Trigger | Status | Code | Source |
|---|---|---|---|
| POST body fails binding | 400 | `INVALID_INPUT` | [task_handler.go:65](../../../../../be/internal/handler/task_handler.go#L65) |
| `GET /admin/tasks` without `staffId` | 400 | `INVALID_INPUT` | [task_handler.go:39](../../../../../be/internal/handler/task_handler.go#L39) |
| Bad `date` format (stats / tasks) | 400 | `INVALID_INPUT` | [task_service.go:114](../../../../../be/internal/service/task_service.go#L114), [:160](../../../../../be/internal/service/task_service.go#L160) |
| Bad `priority` | 400 | `INVALID_INPUT` | [task_service.go:176](../../../../../be/internal/service/task_service.go#L176) |
| Bad `dueDateTime` | 400 | `INVALID_INPUT` | [task_service.go:183](../../../../../be/internal/service/task_service.go#L183) |
| `assigned_to` not a real staff (FK reject) | **500** | `INTERNAL_ERROR` | [task_service.go:203](../../../../../be/internal/service/task_service.go#L203) |
| Any underlying query error | 500 | `INTERNAL_ERROR` | [task_service.go:119](../../../../../be/internal/service/task_service.go#L119), [:124](../../../../../be/internal/service/task_service.go#L124), [:164](../../../../../be/internal/service/task_service.go#L164) |

FE-visible states: the create modal shows a `toast.error` on any failure
([CreateTaskModal.tsx:98-100](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L98));
the expanded row shows an inline "Không thể tải công việc" on read error
([ExpandedTaskList.tsx:20-25](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx#L20)).
Error→toast mapping per [ERROR_SPEC.md](../../../02_spec/ERROR_SPEC.md).

---

## Flags

> Code bugs (FE/BE disagree or contradict intent) are detailed in
> **[TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md)** — this section cross-references them.

| # | Flag | Detail |
|---|------|--------|
| 1 | **Task status is write-once `pending`** | No endpoint or job ever sets `in_progress`/`completed`/`overdue`. The only mutations on `staff_tasks` are `CreateStaffTask` (always `'pending'`) — confirmed: `querier.go` exposes only 4 task queries, none an UPDATE. ⇒ on a live DB the KPIs "Hoàn thành"/"Đang thực hiện"/"Quá hạn", `completionRate`, `qualityScore`, and `hasOverdue` are **all permanently 0/false**. → **[TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md) Bug 1** (🔴, BE — missing endpoint). |
| 2 | **`qualityScore` is fabricated** | `quality := completionRate / 20.0` ([task_service.go:131](../../../../../be/internal/service/task_service.go#L131)). No stored quality column exists. The "Chất lượng" stars are completion rate in disguise. → **Bug 2** (🟠, BE). |
| 3 | **Invalid `assigned_to` → 500, not 4xx** | FK rejection is mapped to `ErrInternalError` ([task_service.go:203](../../../../../be/internal/service/task_service.go#L203)). The dead `sql.ErrNoRows` branch above it ([:200](../../../../../be/internal/service/task_service.go#L200)) never fires for an INSERT. → **Bug 3** (🟡, BE). |
| 4 | **Status FilterBar control is mostly dead (FE)** | `StaffTaskFilterBar` offers pending/in_progress/completed/overdue, but `page.tsx` only honours `overdue` ([page.tsx:52-54](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L52)) — and `overdue` filters on `hasOverdue`, which (per Flag 1) is always false. The other three options no-op. → **Bug 4** (🟡, FE). |
| 5 | `description` is stored but never shown | The modal sends both `description` and `notes`; `ExpandedTaskList` renders only `notes` ([ExpandedTaskList.tsx:62](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx#L62)). `description` round-trips through the DTO (`omitempty`) but no page surfaces it. |
| 6 | Required `dueTime` is not stored as its own field | The modal requires `dueTime`, but it is only folded into `due_at`; the expanded "Giờ" column reads the **optional** `dueTimeStart`–`dueTimeEnd`, so it can show "—" even though a time was mandatory at create. |
