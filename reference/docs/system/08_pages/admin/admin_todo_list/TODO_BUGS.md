# To-Do List — Known Code Bugs (found during `/page-doc-set admin_todo_list`)

> **TL;DR:** 4 live code bugs surfaced while tracing `/admin/todo-list` against source on branch
> `experience_claude.md_system_1`. These are **code** mismatches, not stale docs — a doc edit
> cannot fix them. The page ships a full create/edit/filter UI, but the backend only supports
> **read + create**: editing a task silently creates a duplicate, and two of the filter controls
> are wired to nothing. None are fixed yet; the doc skill does not touch app code. Logged in
> [../../07_business_logic/LOGIC_INDEX.md Decision Log (2026-06-14)](../../07_business_logic/LOGIC_INDEX.md#decision-log)
> and flagged in [admin_todo_list_be.md Flags 1–4](admin_todo_list_be.md#flags).
>
> Source files: `fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx` ·
> `.../CreateEditTaskModal.tsx` · `.../TodoFilterBar.tsx` · `.../TodoTaskTable.tsx` ·
> `fe/src/hooks/useTodoTasks.ts` · `fe/src/features/admin/admin.api.ts` ·
> `be/cmd/server/main.go` · `be/internal/handler/task_handler.go` · `be/internal/service/task_service.go`.

---

## Severity at a glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | "Edit" a task → creates a **duplicate** (no PATCH endpoint) | 🔴 High — silent data corruption | `/admin/todo-list` modal; data also seen on `/admin/staff/task-board` | BE (add PATCH) + FE (route edit to it) |
| 2 | Status filter `<select>` is never sent to the server | 🟠 Medium — control does nothing | `/admin/todo-list` filter bar | FE (or BE add `status` param) |
| 3 | Date-range (`Từ ngày / Đến ngày`) filter is dead — single day only | 🟠 Medium — control does nothing | `/admin/todo-list` filter bar | FE + BE (range query) |
| 4 | Bad `staffId` on create → 500 instead of 4xx | 🟡 Low — wrong status code | `POST /admin/tasks` | BE |

---

## Bug 1 — 🔴 "Edit task" creates a duplicate instead of updating

**Symptom.** A manager clicks ✏️ on a task row, changes the name/priority/time in the modal, and
hits **Cập nhật**. Instead of updating the row, a **second task is created** with the new values;
the original is untouched. The list now shows two tasks. (Delete is not offered at all — the
wireframe's `🗑` does not exist in code, so there is no way to remove the duplicate from the UI.)

**Root cause — the edit path re-POSTs; no update endpoint exists.**
- The modal opens in edit mode and prefills the row
  ([`CreateEditTaskModal.tsx:39-51`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/CreateEditTaskModal.tsx#L39)),
  but submit is wired to one handler regardless of mode:
  [`TodoPageClient.tsx:61-80`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx#L61)
  → `handleModalSubmit` always calls `createTask.mutate(...)`. It never reads `editTask.id`.
- `useCreateTask` only knows `POST`
  ([`useTodoTasks.ts:24-33`](../../../../../fe/src/hooks/useTodoTasks.ts#L24) →
  [`admin.api.ts:289`](../../../../../fe/src/features/admin/admin.api.ts#L289) `api.post('/admin/tasks', ...)`).
- There is **no `PATCH`/`PUT`/`DELETE /admin/tasks/:id` route** — the router registers only
  `GET /tasks/stats`, `GET /tasks`, `POST /tasks`
  ([`main.go:307-309`](../../../../../be/cmd/server/main.go#L307)). The FE type `UpdateTaskPayload`
  ([`types/task.ts`](../../../../../fe/src/types/task.ts)) has no API function behind it.

**Suggested fix (smallest safe change).** Two parts, BE first:
1. **BE:** add `PATCH /admin/tasks/:id` (handler→service→repo + an `UpdateStaffTask` query) under
   the existing `adminR` (`AtLeast("manager")`) group; and optionally `DELETE /admin/tasks/:id`
   (soft-delete via the existing `deleted_at` column — already in the schema, `011_staff_tasks.sql`).
2. **FE:** add `updateTask(id, payload)` to `admin.api.ts` + a `useUpdateTask` hook, and branch
   `handleModalSubmit` on `mode === 'edit'` to call it with `editTask.id`.

Until then, the safest stopgap is to **disable edit mode** (hide the ✏️ button) so no duplicates
are created.

---

## Bug 2 — 🟠 Status filter is wired to nothing

**Symptom.** In the filter bar, picking a status (`Chờ / Hoàn thành / Quá hạn`) and pressing
**Lọc** changes nothing — the task list is identical for every status value.

**Root cause.** The status value is held in filter state
([`TodoFilterBar.tsx:82-91`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoFilterBar.tsx#L82),
applied at [`:31`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoFilterBar.tsx#L31)),
but the task query never reads it:
`useTodoTasks(staffId, date)` passes only those two args
([`TodoPageClient.tsx:47`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx#L47)),
and `getStaffTasks` builds `/admin/tasks?staffId=&date=` with **no status**
([`admin.api.ts:286`](../../../../../fe/src/features/admin/admin.api.ts#L286)). The handler
`GetStaffTasks` reads only `staffId` + `date`
([`task_handler.go:36-42`](../../../../../be/internal/handler/task_handler.go#L36)) and the SQL has
no status predicate ([`tasks.sql:33-40`](../../../../../be/query/tasks.sql#L33)).

**Suggested fix.** Cheapest is **FE-only**: filter `tasksQuery.data` by `filters.status` before
rendering. Cleaner is **BE**: add an optional `status` param to `GetStaffTasks` + the query and
thread it through `getStaffTasks`.

> Note: the filter `<select>` omits `in_progress` (`TodoFilterBar.tsx:87-90`) even though it is a
> valid `TaskStatus`. Fold that into whichever fix is chosen.

---

## Bug 3 — 🟠 Date-range filter is dead; server is single-day only

**Symptom.** The bar exposes `Từ ngày` and `Đến ngày` with a "max 90 days" validation, implying a
range query. In reality only `Từ ngày` (start date) has any effect; `Đến ngày` is ignored and the
list/stats always cover exactly one day.

**Root cause.** The page derives a single `date` and drops `end_date`:
`const date = filters.start_date ?? today`
([`TodoPageClient.tsx:32`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx#L32)),
then both hooks take that one date. Server-side every query is `WHERE DATE(due_at) = ?`
([`tasks.sql:8,26,36`](../../../../../be/query/tasks.sql#L8)) — there is no `BETWEEN`. The 90-day
guard in [`TodoFilterBar.tsx:20-32`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoFilterBar.tsx#L20)
validates a range that is never used.

**Suggested fix.** Decide the intended contract with the owner first. Either **remove** the
`Đến ngày` input + 90-day guard (single-day is the real behaviour), **or** make it real: add a
range variant to the queries (`DATE(due_at) BETWEEN ? AND ?`) + service + `getStaffTasks/getTaskStats`
signatures + the hooks. Removing is the smaller, safer change.

---

## Bug 4 — 🟡 Bad `staffId` on create returns 500 instead of 4xx

**Symptom.** Creating a task for a non-existent / deleted staff id fails with a generic 500 rather
than a clean validation error.

**Root cause.** `CreateTask` service has an `if err == sql.ErrNoRows → ErrNotFound` guard
([`task_service.go:200-202`](../../../../../be/internal/service/task_service.go#L200)), but the
repo runs `CreateStaffTask` as an `:exec` INSERT
([`task_repo.go:105-116`](../../../../../be/internal/repository/task_repo.go#L105)). A foreign-key
violation on `assigned_to` (`fk_tasks_assigned_to`, `011_staff_tasks.sql:19`) surfaces as a generic
driver error — not `sql.ErrNoRows` — so the service falls through to `ErrInternalError` 500
([`task_service.go:203`](../../../../../be/internal/service/task_service.go#L203)).

**Severity is low** because the modal's `<select>` is populated from `GET /staff`
([`CreateEditTaskModal.tsx:99-103`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/CreateEditTaskModal.tsx#L99)),
so a bad id is only reachable with a stale list or a direct API call.

**Suggested fix (BE).** Detect the FK violation (MySQL error 1452) in the repo or service and map
it to `NewAppError(400, "INVALID_INPUT", "Nhân viên không tồn tại")`, or pre-check the staff id
exists before insert.

---

## Next step

None of these are on [`docs/tasks/MASTER_TASK.md`](../../../../tasks/MASTER_TASK.md) yet. Per
CLAUDE.md, a fix must be **registered + ALIGNed** before any code change — this doc only records
them.

**Recommended first:** **Bug 1** (🔴) — it silently corrupts data every time a manager uses the
edit button, and the fix (add `PATCH /admin/tasks/:id` + wire the edit path) also unblocks the
intended edit/delete UX. Bugs 2–3 are "controls that lie" and can be batched as a filter-bar
cleanup; Bug 4 is a small BE polish.
