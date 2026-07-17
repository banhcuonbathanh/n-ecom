# Admin Todo List — Cross-Page Data Flow (a created task, across pages & devices)

> **Status:** ✅ implemented
> **What this is:** once `/admin/todo-list` writes a task, where does that data live and which
> other pages/devices see it? Short answer: the **only durable hub is the MySQL `staff_tasks`
> row**. There is **no realtime, no localStorage, no client store** for tasks — cross-page and
> cross-device sync is **pull-only** (next fetch / staleTime expiry / reload). The same data is
> read by [`/admin/staff/task-board`](../admin_task_board/admin_task_board.md), which calls the
> identical endpoints.
>
> **Sources traced (branch `experience_claude.md_system_1`):**
> `fe/src/hooks/useTodoTasks.ts` · `fe/src/features/admin/admin.api.ts` ·
> `fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx` ·
> `fe/src/app/(dashboard)/admin/staff/task-board/page.tsx` · `fe/src/lib/storage-keys.ts`
> (no task key) · `fe/src/types/task.ts` · `be/query/tasks.sql` · `be/migrations/011_staff_tasks.sql`
> + `012_staff_tasks_v2.sql`.
> Siblings: [page](admin_todo_list.md) · [BE](admin_todo_list_be.md) ·
> [crosscomponent](admin_todo_list_crosscomponent_dataflow.md) · [loading](admin_todo_list_loading.md) ·
> [scenario](SCENARIO_TODO_ASSIGN.md) · [bugs](TODO_BUGS.md). Object model →
> [../../02_spec/DB_SCHEMA.md §Staff Tasks](../../02_spec/DB_SCHEMA.md#staff-tasks--staff_tasks).

---

## 0. The whole picture on one diagram

```
        BROWSER HUB (per tab, volatile)              THE WIRE              SERVER HUB (durable)
  ┌───────────────────────────────────────┐                       ┌──────────────────────────┐
  │ TanStack Query cache                   │   POST /admin/tasks   │ MySQL: staff_tasks row   │
  │  ['admin','tasks','stats',date]  (30s) │ ───────────────────▶  │  id, title, assigned_to, │
  │  ['admin','tasks',staffId,date]  (15s) │                       │  assigned_by, priority,  │
  │  ['admin','staff']               (60s) │   GET /admin/tasks    │  status='pending',       │
  │                                        │   GET /admin/tasks/   │  due_at, due_time_*,     │
  │ local React state (TodoPageClient):    │       stats           │  notes, deleted_at NULL  │
  │  filters · modalOpen · editTask        │ ◀───────────────────  │                          │
  └───────────────────────────────────────┘   GET /staff?limit    └──────────────────────────┘
        │                                                                      ▲
        │  NO localStorage key for tasks                                       │ same 3 read endpoints
        │  NO Zustand task store                                              │
        │  NO SSE / WS  →  no push                                ┌──────────────────────────┐
        ▼                                                         │ /admin/staff/task-board  │
   reload (F5) = cold refetch from server                        │  getTaskStats/getStaffTasks│
                                                                  └──────────────────────────┘
```

The browser side holds **nothing durable** for tasks: the TanStack Query cache is in-memory and
dies on reload; there is no task key in `fe/src/lib/storage-keys.ts` and no task store in
`fe/src/store/`. Every truth about a task lives in the one MySQL row.

---

## 1. The status lifecycle every page renders against

`staff_tasks.status` — `ENUM('pending','in_progress','completed','overdue')`
(`be/migrations/012_staff_tasks_v2.sql:6`, cross-checked in
[DB_SCHEMA.md:218](../../02_spec/DB_SCHEMA.md)).

```
   pending ──▶ in_progress ──▶ completed
      └──────────────────────▶ overdue   (a pending/in_progress task past its due_at)
```

- **Created tasks always start `pending`** — hard-coded in `CreateStaffTask`
  (`be/query/tasks.sql:48` `… status) VALUES (…, 'pending', …)`).
- ⚠️ **There is no BE write path to advance status today.** No `PATCH /admin/tasks/:id` exists
  (`be/cmd/server/main.go:307-309` registers only `GET stats`, `GET tasks`, `POST tasks`). So
  `in_progress`/`completed` can only appear via direct DB writes or a seeder; the UI cannot move a
  task forward. `overdue` is computed by the read queries' `status='overdue'` checks, not written
  on create. See [TODO_BUGS.md](TODO_BUGS.md) Bug 1 (no update/delete endpoint).

---

## 2. The moment of handoff — what this page leaves behind

When the manager hits **Lưu công việc**, `TodoPageClient.handleModalSubmit`
(`TodoPageClient.tsx:61-80`) → `useCreateTask` → `POST /admin/tasks`. The handoff is exactly **one
new MySQL row**:

| Left behind | Value | Source |
|---|---|---|
| `id` | server-generated UUID | `task_repo.go:104` |
| `assigned_to` | the chosen staff id | modal `<select>` → `staffId` |
| `assigned_by` | **the caller's JWT id** (not sent by FE) | `task_handler.go:70` `StaffIDFromContext` |
| `status` | `'pending'` (hard-coded) | `tasks.sql:48` |
| `due_at` | `${dueDate}T${dueTime}:00Z` parsed RFC3339 | `TodoPageClient.tsx:67`, `task_service.go:178` |

Nothing is persisted browser-side. After the create, the page does NOT navigate — it stays and
**re-reads its own write** via cache invalidation (that same-page refresh is documented in
[admin_todo_list_crosscomponent_dataflow.md](admin_todo_list_crosscomponent_dataflow.md) §3 — not
repeated here).

---

## 3. Downstream surface — `/admin/staff/task-board`

The task board is the one **other page** that reads the same data. It calls the **identical
endpoints** through the same API functions:

- `getTaskStats(date)` → `GET /admin/tasks/stats` (`task-board/page.tsx:32`)
- `getStaffTasks(staffId, date)` → `GET /admin/tasks` (`task-board/page.tsx:40`)
- it also has its own `CreateTaskModal` → `createTask` (`task-board/components/CreateTaskModal.tsx:12`)

So a task created on `/admin/todo-list` appears on `/admin/staff/task-board` for the same
**date + assignee**, and vice-versa. There is no shared cache key coordination between the two
pages beyond both using `['admin','tasks',…]` — but since they are separate route mounts, the
**handoff is server-side**: page B sees page A's task on its next fetch, not instantly.

> The two pages are BE-twins on tasks. The endpoint detail is traced once in
> [admin_todo_list_be.md](admin_todo_list_be.md) — when the task-board page-doc set is built, it
> should reuse that trace.

---

## 4. Multi-device / multi-admin sync — pull-only, no push

There is **no SSE and no WebSocket** for tasks (unlike orders, which use `/sse/*` + `/ws/*`). So:

- Manager X creates a task on laptop A. Manager Y on laptop B does **not** see it pushed.
- Y sees it only when their TanStack Query data goes stale and refetches — `staleTime` is
  **stats 30s, tasks 15s, staff 60s** (`TodoPageClient.tsx:38`, `useTodoTasks.ts:13,20`) — or on a
  manual reload, or when Y triggers a refetch (changes filter / re-focuses, per default Query
  behaviour).
- This is acceptable for a low-traffic admin planning screen; it is called out in
  [REDIS_CACHE.md:48](../../03_be/REDIS_CACHE.md) as a deliberately uncached, low-traffic surface.

---

## 5. Cancellation / reverse flows

**None exist.** There is no delete or status-revert endpoint for tasks. The schema has a
`deleted_at` column (`011_staff_tasks.sql`) ready for soft-delete, but no query/route uses it for
writes. The "edit" button does not reverse anything — it creates a duplicate
([TODO_BUGS.md](TODO_BUGS.md) Bug 1).

---

## 6. End-to-end timeline (all pages + devices)

```
T0  Laptop A (/admin/todo-list)   POST /admin/tasks ───────▶ MySQL: new staff_tasks row (pending)
T0+ Laptop A                       invalidate ['admin','tasks','stats'] + ['admin','tasks',sid,date]
                                   → stats board refetch → assignee "Được giao" +1   (instant, same page)
T?  Laptop B (/admin/todo-list)    no push; sees new task on next refetch (≤30s stats / ≤15s tasks) or F5
T?  Laptop B (/admin/staff/task-board)  getStaffTasks(assignee, date) → row appears in that staff's list
```

---

## 7. Reload (F5) behavior per page

| Page | After F5 |
|---|---|
| `/admin/todo-list` | Cold start: stats board refetches for today; no filter/selection survives (all state is in-memory `useState`, no URL params, no storage). Lands back on VIEW A (no staff selected). |
| `/admin/staff/task-board` | Cold refetch of `getTaskStats(date)`; expanded staff resets. |

Nothing is restored from the browser — every page rebuilds purely from the server row.

---

## 8. Durability matrix — what survives what

| Datum | Survives re-render | Survives route change | Survives F5 | Survives across devices |
|---|---|---|---|---|
| The task itself (MySQL row) | ✅ | ✅ | ✅ | ✅ (server) |
| Query cache (`['admin','tasks',…]`) | ✅ | ⚠️ until GC / staleTime | ❌ | ❌ |
| `filters` / `editTask` / `modalOpen` (local state) | ✅ | ❌ | ❌ | ❌ |
| Selected staff (VIEW A↔B toggle) | ✅ | ❌ | ❌ | ❌ |

The single source of durable truth is the **MySQL row**; everything browser-side is volatile.

---

## 9. Source & rule map

| Claim | Source |
|---|---|
| 4 endpoints, manager+, no Redis | [admin_todo_list_be.md](admin_todo_list_be.md) |
| Same endpoints read by task-board | `fe/src/app/(dashboard)/admin/staff/task-board/page.tsx:32,40` |
| No task localStorage key | `fe/src/lib/storage-keys.ts` (absent) |
| No task client store | `fe/src/store/` (absent) |
| `status` enum + lifecycle | `be/migrations/012_staff_tasks_v2.sql:6`; [DB_SCHEMA.md:218](../../02_spec/DB_SCHEMA.md) |
| Created status hard-coded `pending` | `be/query/tasks.sql:48` |
| No update/delete route | `be/cmd/server/main.go:307-309`; [TODO_BUGS.md](TODO_BUGS.md) Bug 1 |
| staleTime values | `TodoPageClient.tsx:38`, `useTodoTasks.ts:13,20` |
| Uncached surface (deliberate) | [REDIS_CACHE.md:48](../../03_be/REDIS_CACHE.md) |
