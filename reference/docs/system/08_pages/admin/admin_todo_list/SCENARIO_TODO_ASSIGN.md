# Scenario — "The Morning Task Assignment" (`/admin/todo-list`)

> **Status:** ✅ implemented (with 2 known gotchas — see beats 6–7)
> **What this is:** one concrete run through `/admin/todo-list`, told as a story: a manager opens
> the page at the start of a shift, reads who is on track, assigns the day's tasks, and drills into
> one staff member. Grounded in the 4 endpoints traced in [admin_todo_list_be.md](admin_todo_list_be.md)
> (all manager+, **no Redis, no realtime**) and the flows in
> [crosscomponent](admin_todo_list_crosscomponent_dataflow.md) / [crosspage](admin_todo_list_crosspage_dataflow.md).
>
> Siblings: [page](admin_todo_list.md) · [BE](admin_todo_list_be.md) · [loading](admin_todo_list_loading.md) ·
> [bugs](TODO_BUGS.md). Source for the beats: `TodoPageClient.tsx`, `TodoFilterBar.tsx`,
> `CreateEditTaskModal.tsx`, `TodoTaskTable.tsx`, `useTodoTasks.ts`.

---

## Cast & Setting

- **Chị Lan** — store **manager**, logged in (JWT role `manager`). She owns the morning plan.
- **Bếp Hùng (chef), Thu (cashier)** — staff she assigns tasks to.
- **The screen:** `/admin/todo-list`, 7:45 AM, one laptop at the counter. No customers yet.
- **The stakes:** get every station's tasks assigned before the lunch rush, and spot anyone with
  overdue work from yesterday.

---

## Timeline — beat by beat

**07:45 — Lan opens the page (VIEW A: the stats board).**
The page mounts; with no staff selected (`staffId = null`), it shows the **per-staff stats board**.
Two reads fire in parallel: `GET /admin/tasks/stats?date=today` (the 4 metric cards + per-staff
table) and `GET /staff?limit=100` (to name the rows + fill the assignee dropdown). While stats
load she sees `TodoPageSkeleton`; staff list has no skeleton (it just fills the `<select>` when
ready). See [loading](admin_todo_list_loading.md).

**07:46 — She reads the board.**
Cards: `Tổng 12 · Hoàn thành 8 · Đang làm 3 · Quá hạn 1`. The per-staff table shows **Thu** with a
red `[quá hạn]` badge and a 57% completion rate — someone has a task left over from yesterday.

**07:47 — She assigns a new task.**
Clicks **+ Tạo công việc** → `CreateEditTaskModal` opens. She types *"Vệ sinh khu bếp"*, picks
**Bếp Hùng** from the assignee dropdown, priority **🔴 Cao**, due **today 17:00**, and hits
**Lưu công việc**. → `POST /admin/tasks`. Her own JWT becomes the task's `assigned_by`; the server
stamps `status='pending'` and returns the row (201).

**07:47 — The board updates itself (no prop-drilling).**
On success the modal closes and `useCreateTask` invalidates `['admin','tasks','stats']` +
`['admin','tasks',staffId,dueDate]`. The stats board refetches; **Bếp Hùng's "Được giao" ticks up
by one**. No page reload, no manual refresh — see [crosscomponent](admin_todo_list_crosscomponent_dataflow.md).

**07:49 — She drills into Thu (VIEW A → VIEW B).**
She clicks **Thu's** row in the stats table. `setFilters({...f, assigned_to: Thu.id})` flips the
view: now `staffId` is set, so VIEW B renders and `GET /admin/tasks?staffId=Thu&date=today` fires
(it was `enabled:false` until now). Thu's tasks render priority-sorted, the overdue one highlighted
red. The filter bar's staff dropdown syncs to "Thu" via its `useEffect`.

**07:51 — 🟠 Gotcha #1: the status filter does nothing.**
Lan tries to narrow Thu's list to just "Quá hạn" using the **Trạng thái** dropdown → **Lọc**.
Nothing changes. The status value never reaches the server — `getStaffTasks` sends only
`staffId`+`date`. ([TODO_BUGS.md](TODO_BUGS.md) Bug 2.) She shrugs and reads the full list instead.

**07:52 — 🔴 Gotcha #2: editing creates a duplicate.**
She clicks ✏️ on Thu's overdue task to push its due time to 14:00, saves. Instead of updating, a
**second task appears** — there is no update endpoint, so "edit" re-POSTs. Now Thu has two near-identical
tasks and no UI button to delete either. ([TODO_BUGS.md](TODO_BUGS.md) Bug 1 — recommended first fix.)

**07:55 — Done (mostly).** The morning's tasks are assigned. Lan makes a mental note to tell the
dev the edit button is broken.

---

## Under the hood

### A. Cross-component (one page, many widgets)
Modal → mutation → **TanStack Query cache invalidation** → stats board + task list refetch. The
shared source is the Query cache, not a store; parent `TodoPageClient` owns `filters/modalOpen/
editTask` and passes them by props. The stats-row click (`setFilters`) is the main parent→children
channel. Full trace: [crosscomponent](admin_todo_list_crosscomponent_dataflow.md).

### B. Cross-page (data outlives the page)
The created task is one MySQL `staff_tasks` row. It is also visible on
[`/admin/staff/task-board`](../admin_task_board/admin_task_board.md), which reads the same
`GET /admin/tasks` + `/stats`. Handoff is **server-side, pull-only**. Full trace:
[crosspage](admin_todo_list_crosspage_dataflow.md).

### C. FE → BE (what the page sends)
- `GET /staff?limit=100` — dropdown + stat names.
- `GET /admin/tasks/stats?date=` — VIEW A.
- `GET /admin/tasks?staffId=&date=` — VIEW B (gated on a selected staff).
- `POST /admin/tasks` — create (caller's JWT = `assigned_by`; `status='pending'`).
All manager+, all traced in [admin_todo_list_be.md](admin_todo_list_be.md).

### D. BE → FE (live / push)
**None.** There is no SSE/WS for tasks. "Live" updates are really refetches: create-invalidation
(instant, same page) or staleTime expiry (stats 30s / tasks 15s / staff 60s) / reload for other
tabs and devices. Contrast the orders pages, which do push over `/sse/*` + `/ws/*`.

### E. Loading + caching
Two mutually-exclusive `isLoading` branches (stats vs tasks), each showing `TodoPageSkeleton`; the
tasks query is interaction-gated (`enabled: !!staffId`). No Redis server cache — every read hits
MySQL. Detail: [loading](admin_todo_list_loading.md).

### F. Monitoring
No task-specific metrics/alerts traced. Errors surface as TanStack Query errors (no toast wired for
read failures); a bad `staffId` on create returns a 500 ([TODO_BUGS.md](TODO_BUGS.md) Bug 4).
`❓ UNVERIFIED` — whether any structured logging wraps the task handlers (not traced).

---

## One-line mental model

> `/admin/todo-list` is a **plan-the-shift** screen: read a per-staff stats board, assign tasks
> that land as plain MySQL rows, drill into one person — all manager+, all pull-only, and (today)
> **create-only**: edit duplicates and two filters are decorative.
