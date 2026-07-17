# Admin Task Board — Cross-Page Data Flow

> **TL;DR:** ✅ implemented · **manager+ only** · `/admin/staff/task-board`.
> This page's only durable output is **a row inserted into the `staff_tasks` MySQL table** via
> `POST /admin/tasks`. That row outlives the page and is the sole cross-page hub — there is **no
> SSE, no WebSocket, no localStorage persistence** in this domain. Two admin pages read the same
> table; no customer or kitchen-staff page does. Task status is write-once `pending` — see
> [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md) Bug 1 for why the lifecycle is permanently frozen.
>
> Sources traced on branch `experience_claude.md_system_1`:
> [`fe/src/app/(dashboard)/admin/staff/task-board/page.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx) ·
> [`fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx) ·
> [`fe/src/features/admin/admin.api.ts`](../../../../../fe/src/features/admin/admin.api.ts) ·
> [`fe/src/types/task.ts`](../../../../../fe/src/types/task.ts) ·
> [`fe/src/hooks/useTodoTasks.ts`](../../../../../fe/src/hooks/useTodoTasks.ts)
>
> Sibling files: [admin_task_board.md](admin_task_board.md) ·
> [admin_task_board_be.md](admin_task_board_be.md) ·
> [admin_task_board_crosscomponent_dataflow.md](admin_task_board_crosscomponent_dataflow.md) ·
> [admin_task_board_loading.md](admin_task_board_loading.md) ·
> [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md)

---

## 0. The whole picture on one diagram

```
   ┌─────────────────────── BROWSER A (manager's device) ───────────────────────┐
   │                                                                              │
   │   /admin/staff/task-board                                                    │
   │     │  getTaskStats  ──── GET /admin/tasks/stats?date= ────────────────────▶│
   │     │  getStaffTasks ──── GET /admin/tasks?staffId=&date= ──────────────────▶│
   │     │                                                                        │
   │     └─ CreateTaskModal                                                       │
   │          │  form submit ── POST /admin/tasks ──────────────────────────────▶│
   │          │                                                                   │
   │          │  on 201: qc.invalidateQueries(['admin','tasks','stats', date])    │
   │          │          qc.invalidateQueries(['admin','tasks', staffId, date])   │
   │          └─ ▶ both queries re-fetch   (same browser, same TanStack client)  │
   │                                                                              │
   └──────────────────────────────────────┬───────────────────────────────────────┘
                                           │  POST /admin/tasks
   ═══════════════════════ THE WIRE ═══════════════════════════════════════════════
                                           │
                               ┌───────────▼────────────┐
                               │   staff_tasks row        │   MySQL (durable, no Redis)
                               │   id · assigned_to       │   status = 'pending' (write-once)
                               │   title · priority       │   assigned_by · due_at
                               │   due_time_start/end     │   created_at · deleted_at
                               └──────┬──────────────────┘
                                      │
              same table, different query   │
                                      │
   ┌──────────────────────────────────▼──────────────────────────────────────────┐
   │  BROWSER B — same or different manager, same or different browser tab         │
   │                                                                               │
   │  /admin/todo-list                                                             │
   │     │  useTodoTasks  ──── GET /admin/tasks?staffId=&date= ──────────────────▶│
   │     │  useTaskStats  ──── GET /admin/tasks/stats?date= ─────────────────────▶│
   │     └─ sees the new row ONLY after its own refetch (staleTime 15 s / 30 s)   │
   └───────────────────────────────────────────────────────────────────────────────┘
```

**Read it like this.** The task board sits entirely above the double line; the only thing it
deposits below is a `staff_tasks` MySQL row. The downstream todo-list page lives in a completely
separate browser context — it shares **no TanStack query cache, no localStorage key, and no
realtime channel** with the task board. The new row becomes visible there only after its own
polling interval elapses or the manager manually refreshes.

There is **no fan-out** to any kitchen-staff page (KDS, POS, cashier) or any customer/shop page.
See [§4](#4-gap-staff-have-no-surface-to-see-their-own-tasks) for the notable gap this creates.

```
   LEGEND   ──▶ HTTP request (polling, not pushed)
            No SSE · No WS · No localStorage · No realtime of any kind in this domain.
```

---

## 1. The status lifecycle every page renders against

Unlike the order domain, the task lifecycle is **frozen**. There is only one writable status value
in any live database: `pending`.

```
   POST /admin/tasks ──▶ INSERT status='pending'
                                │
                                │   (no transition path exists)
                                │
                         pending  ────────────────────────────  pending forever
```

The `TaskStatus` type in [`fe/src/types/task.ts:1`](../../../../../fe/src/types/task.ts#L1)
declares four values — `pending`, `in_progress`, `completed`, `overdue` — but three of them are
unreachable on a live database:

- There is **no `UPDATE` query** on `staff_tasks` anywhere in `be/internal`. The sqlc `querier`
  exposes exactly four task methods and none is an update
  ([`be/internal/db/querier.go:28,56-58`](../../../../../be/internal/db/querier.go#L28)
  — referenced in [admin_task_board_be.md](admin_task_board_be.md)).
- There is **no background job** that flips `pending` rows to `overdue` once `due_at < NOW()`.
- The only writer is `CreateStaffTask`, which hardcodes `status='pending'`
  ([`be/internal/db/tasks.sql.go:14-17`](../../../../../be/internal/db/tasks.sql.go#L14)).

**Consequence for every page that reads `staff_tasks`:** the "Hoàn thành", "Đang thực hiện",
and "Quá hạn" KPIs; the `completionRate`; the `qualityScore`; and the `hasOverdue` highlight
are **all permanently 0 / false** on a live database. This is the root bug.

Cross-reference: [TASK_BOARD_BUGS.md Bug 1](TASK_BOARD_BUGS.md#bug-1--task-status-can-never-leave-pending) (🔴 High).

| Status value | Reachable? | Set by | Any page ever shows it? |
|---|---|---|---|
| `pending` | ✅ | `POST /admin/tasks` (hardcoded) | Yes — every task ever created |
| `in_progress` | ❌ | nothing | Never |
| `completed` | ❌ | nothing | Never |
| `overdue` | ❌ | nothing | Never (stored value; no job or mutation sets it) |

---

## 2. The moment of handoff — what this page leaves behind

The handoff is the modal's `onSuccess` callback. When `POST /admin/tasks` returns 201, the modal:

1. Receives the full `TaskDTO` (the newly created row re-read via `GetStaffTaskByID`).
2. Calls `qc.invalidateQueries({ queryKey: ['admin','tasks','stats', date] })`.
3. Calls `qc.invalidateQueries({ queryKey: ['admin','tasks', task.staffId, date] })`.
4. Fires `toast.success('Đã tạo công việc thành công')` and closes.

Source: [`CreateTaskModal.tsx:90-96`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L90).

```
   POST /admin/tasks ──▶ 201 { id, staffId, name, priority, status:'pending', dueDate, … }
        │
        ├── ① staff_tasks row in MySQL       ← the ONLY durable artifact; everything else is transient
        │
        ├── ② TanStack cache invalidated     ← same-browser refetch triggered
        │       ['admin','tasks','stats', date]
        │       ['admin','tasks', staffId, date]
        │
        └── ③ nothing else                  ← no localStorage write, no SSE push, no WS event
```

| Artifact | Where it lives | Who reads it later | Durable? |
|---|---|---|---|
| `staff_tasks` MySQL row | BE database | Task board (stats + expanded list) · Todo-list page | ✅ survives F5, new tab, other device |
| TanStack cache invalidation | Same browser, same TanStack client | Same page's two queries | ❌ memory-only; does not propagate to other tabs or browsers |
| Toast notification | Same browser, same page | Nobody (display only) | ❌ |

> **One model, one home.** For the full `staff_tasks` field list, see
> [`docs/system/02_spec/DB_SCHEMA.md §Staff Tasks`](../../../02_spec/DB_SCHEMA.md). For endpoint
> detail (handler → service → repo → SQL), see [admin_task_board_be.md](admin_task_board_be.md).

---

## 3. Downstream surface A — this page itself (later visit or different manager's browser)

When a manager reloads the task board — or opens it in a different browser — the page re-fetches
both queries from scratch, reading the MySQL `staff_tasks` table directly. No browser-to-browser
synchronisation exists.

```
   Manager A creates a task (browser A)
        │
        │   POST /admin/tasks ──▶ MySQL row written
        │
        │   TanStack invalidates cache in browser A ──▶ browser A re-fetches → sees new row
        │
   Manager B opens /admin/staff/task-board (browser B)
        │
        │   GET /admin/tasks/stats?date=   ──▶ MySQL (reads the new row) ──▶ stats updated
        │   GET /admin/tasks?staffId=…      ──▶ MySQL (reads the new row) ──▶ task list updated
        │
        └─  ✅ Browser B sees the new task — but ONLY because it issued its own HTTP request.
            There is no push; manager B only learns about the new task when their browser polls.
```

**Poll cadence** (task board page):
- Stats query: staleTime 30 s, `refetchInterval` 60 s
  ([`page.tsx:33-35`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L33)).
- Expanded staff task list: staleTime 15 s, **no `refetchInterval`** — only re-fetches when the
  row is expanded or a cache invalidation fires
  ([`page.tsx:38-43`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L38)).

**Maximum staleness in manager B's browser: ~60 seconds** (the stats auto-refresh interval). The
expanded task list can be stale indefinitely unless manager B collapses and re-expands the row or
navigates away and back.

---

## 4. Downstream surface B — `/admin/todo-list` (A9 page)

The todo-list page reads the **same two endpoints** (`GET /admin/tasks/stats` and
`GET /admin/tasks`) via the shared [`useTodoTasks` / `useTaskStats` hooks](../../../../../fe/src/hooks/useTodoTasks.ts).

```
   POST /admin/tasks (task board) ──▶ staff_tasks row in MySQL
                                           │
                                           │   (no cross-page cache invalidation)
                                           │
   /admin/todo-list (any browser)          │
     │   useTaskStats  ──── GET /admin/tasks/stats?date= ──▶ sees new task at its own staleTime (30 s)
     └   useTodoTasks  ──── GET /admin/tasks?staffId=&date= ──▶ sees new task at its own staleTime (15 s)
```

Key differences from the task board:

| Aspect | Task board | Todo-list |
|---|---|---|
| Stats query staleTime | 30 s + 60 s refetchInterval | 30 s, **no refetchInterval** |
| Task list staleTime | 15 s (lazy, expand-gated) | 15 s, fires when `staffId` is selected |
| Cache invalidation on create | ✅ invalidates both keys | ✅ same (`useCreateTask` hook in [`useTodoTasks.ts:25-32`](../../../../../fe/src/hooks/useTodoTasks.ts#L25)) |
| Edit mode | ❌ no update endpoint | ⚠️ "edit" mode opens the modal but calls `createTask.mutate()` — creates a duplicate, not an update (❓ UNVERIFIED: this is an inferred consequence of the missing UPDATE endpoint; confirm against [`TodoPageClient.tsx:61-79`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx#L61)) |
| Delete | ❌ no delete endpoint | ❌ same |

> The todo-list page's `CreateEditTaskModal` has an `edit` mode
> ([`CreateEditTaskModal.tsx:25`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/CreateEditTaskModal.tsx#L25))
> that pre-populates fields from an existing task. However, `TodoPageClient.handleModalSubmit`
> calls `createTask.mutate(...)` regardless of mode
> ([`TodoPageClient.tsx:68`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx#L68)).
> Since there is no `PATCH /admin/tasks/:id` endpoint, clicking "Cập nhật" inserts a **new row**
> rather than updating the existing one. This is a downstream consequence of
> [TASK_BOARD_BUGS.md Bug 1](TASK_BOARD_BUGS.md#bug-1--task-status-can-never-leave-pending).

Cross-link: [admin_todo_list.md](../admin_todo_list/admin_todo_list.md).

---

## 4. Gap — staff have no surface to see their own tasks

This is a notable architectural gap. The `assigned_to` column on `staff_tasks` records which staff
member a task belongs to, but **no FE route lets that staff member view their own tasks**.

Verified by exhaustive route scan:

- `(dashboard)/kds/` — no task reference (confirmed: grep returns empty)
- `(dashboard)/cashier/` — no task reference
- `(dashboard)/pos/` — no task reference
- `(dashboard)/orders/` — no task reference
- `(shop)/` — no task reference (customer-facing; out of scope)

The only two FE pages that consume `staff_tasks` are both **manager+ gated**:
- `/admin/staff/task-board` — requires `manager+` (`middleware.AtLeast("manager")`
  at [`be/cmd/server/main.go:294`](../../../../../be/cmd/server/main.go#L294))
- `/admin/todo-list` — same gate

**An assigned kitchen staff / cashier / server has no UI to see tasks assigned to them.** The
manager assigns the task but the employee cannot check it in the system. This is a product gap,
not a bug in the data model — the row is written correctly; there is simply no read surface for
the intended recipient.

---

## Multi-device sync

**There is no realtime sync.** No SSE channel, no WebSocket, no localStorage broadcast exists
in the task domain.

Multi-device behaviour reduces to: **each browser polls independently**. A task created in one
browser becomes visible in another browser's task board or todo-list only when that browser's
TanStack Query staleTime expires and it re-issues the GET. Maximum lag: ~60 s (the stats
`refetchInterval`). The expanded task list on a row that has not been collapsed has no automatic
refresh after the initial load — it must be re-triggered by collapsing and re-expanding, or by
navigating away and back.

---

## Cancellation / reverse flows

**There is no cancellation or reverse flow.** No `DELETE /admin/tasks/:id` endpoint exists, and
no `PATCH /admin/tasks/:id/status` endpoint exists (the complete task route set is three lines at
[`be/cmd/server/main.go:307-309`](../../../../../be/cmd/server/main.go#L307), traced in
[admin_task_board_be.md](admin_task_board_be.md)).

Once a `staff_tasks` row is inserted, **it cannot be deleted, cancelled, or status-changed through
the application**. The row is permanent until a direct database operation removes it.

This section does not apply further — there are no initiators, no endpoints, and no fan-out to
document.

---

## End-to-end timeline (task board + downstream pages)

```
   Manager                 /admin/staff/task-board          MySQL            /admin/todo-list
   (browser A)             (browser A)                      staff_tasks      (browser B, any time)
        │                       │                              │                    │
        ├─ opens page ──────────▶ GET /admin/tasks/stats?date= ──────────────────▶  │
        │                       │◀─ { metrics:{0,0,0,0}, staffStats:[…] }            │
        │                       │  GET /admin/tasks?staffId=X ──────────────────────▶│
        │                       │◀─ []  (no tasks yet)                               │
        │                       │                              │                    │
        ├─ opens modal ─────────▶ staff list GET /staff?limit=100                   │
        │                       │◀─ staffList (for dropdown)                        │
        │                       │                              │                    │
        ├─ submits form ─────────▶ POST /admin/tasks ──────────────────────────────▶│
        │                       │                         INSERT row                │
        │                       │◀─ 201 { id, …, status:'pending' }                 │
        │                       │  qc.invalidateQueries(['admin','tasks','stats',…]) │
        │                       │  qc.invalidateQueries(['admin','tasks', X, …])     │
        │                       │  toast.success ── modal closes                    │
        │                       │                              │                    │
        │                       │  ──re-fetch stats ──────────────────────────────▶ │
        │                       │◀─ { metrics:{total:1, completed:0, …} }           │
        │                       │  ──re-fetch tasks for X ──────────────────────────▶
        │                       │◀─ [{ id, name, status:'pending', … }]             │
        │                       │                              │                    │
        │  (up to ~60 s later)  │                              │  poll: GET stats ──▶│
        │                       │                              │◀─ total:1          │
        │                       │                              │  poll: GET tasks ──▶│
        │                       │                              │◀─ [{ status:'pending' }]
        │                       │                              │                    │
        ▼  (task never changes) ▼                              ▼  (status stays pending forever)
```

---

## Reload (F5) behavior per page

Because neither page uses localStorage for task data, an F5 is a clean slate — all data comes
from the BE:

| Page | On reload | Recovery |
|---|---|---|
| `/admin/staff/task-board` | Both queries re-fire; filter state (`date`, `role`, `status`, `search`) is **lost** (React `useState`, not persisted) | ✅ data recovered from BE; ❌ filter position and expanded row reset to defaults |
| `/admin/todo-list` | Same — filter state lost; queries re-fire | ✅ data recovered from BE; ❌ filter position reset |
| Any other page | No task data cached or stored | N/A — no task surface |

There is **no in-browser hub** (no localStorage key, no persisted store) in the task domain.
Every reload is a fresh network fetch.

---

## Durability matrix

| Datum | Lives in | Survives F5? | Survives new tab / device? | Scope |
|---|---|---|---|---|
| Filter state (date, role, search, expanded row) | React `useState` (memory) | ❌ | ❌ | Per page, per session |
| TanStack query cache | Memory | ❌ | ❌ | Same browser tab only |
| Cache invalidation signal from `POST` | Memory (same TanStack client) | ❌ | ❌ | Same browser tab only |
| **`staff_tasks` row** | **MySQL (BE)** | ✅ | ✅ | **Every page, every device** |

> **The mental model in one line:** the task board's browser state is entirely throwaway — the
> MySQL row is the only durable fact. Every page (task board or todo-list) independently polls the
> BE to see it; nothing is pushed, nothing is shared between browsers.

---

## Source & rule map

| Topic | Source of truth |
|---|---|
| On-page (cross-component) data flow | [admin_task_board_crosscomponent_dataflow.md](admin_task_board_crosscomponent_dataflow.md) |
| Page zones / wireframe / object model | [admin_task_board.md](admin_task_board.md) |
| BE endpoints traced handler→service→repo→SQL | [admin_task_board_be.md](admin_task_board_be.md) |
| Loading states / skeleton / error states | [admin_task_board_loading.md](admin_task_board_loading.md) |
| Code bugs (Bug 1 — frozen status, Bug 2–4) | [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md) |
| Downstream todo-list page | [admin_todo_list/admin_todo_list.md](../admin_todo_list/admin_todo_list.md) |
| `staff_tasks` table field names | [`docs/system/02_spec/DB_SCHEMA.md §Staff Tasks`](../../../02_spec/DB_SCHEMA.md) |
| `Task` / `TaskStatus` / `CreateTaskPayload` types | [`fe/src/types/task.ts`](../../../../../fe/src/types/task.ts) |
| API functions (`getTaskStats`, `getStaffTasks`, `createTask`) | [`fe/src/features/admin/admin.api.ts:283-290`](../../../../../fe/src/features/admin/admin.api.ts#L283) |
| Shared todo-list hooks | [`fe/src/hooks/useTodoTasks.ts`](../../../../../fe/src/hooks/useTodoTasks.ts) |
| Task route registration | [`be/cmd/server/main.go:307-309`](../../../../../be/cmd/server/main.go#L307) |
