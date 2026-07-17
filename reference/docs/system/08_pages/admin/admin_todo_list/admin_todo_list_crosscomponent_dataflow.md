# Admin Todo List — Cross-Component Data Flow (manager creates a task, widgets update)

> **Status:** ✅ implemented
> **What this is:** a deep zoom on one concrete action on `/admin/todo-list` —
> *a manager fills in `CreateEditTaskModal` and saves a new task* — told from the page's
> point of view. It answers one question: **how do the widgets on this single page share
> that new task without prop-drilling?**
>
> The short answer: there is **no Zustand store** on this page. The two shared mechanisms are:
> 1. **TanStack Query cache** — the `useCreateTask` mutation invalidates two cache keys, which
>    causes `useTaskStats` and `useTodoTasks` to refetch; every widget that reads those hooks
>    then re-renders automatically.
> 2. **Parent local state in `TodoPageClient`** — `filters`, `modalOpen`, and `editTask` are
>    owned by the parent and passed **down by props** to children; callbacks are lifted **up**
>    from children to the parent. The most important cross-widget link is the per-staff row
>    click: it calls `setFilters(f => ({...f, assigned_to: stat.staffId}))`, which switches
>    the entire view from the stats board to the task table and syncs `TodoFilterBar` via a
>    `useEffect`.
>
> Traced from source on branch `experience_claude.md_system_1`:
> - [`fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx)
> - [`fe/src/app/(dashboard)/admin/todo-list/components/TodoFilterBar.tsx`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoFilterBar.tsx)
> - [`fe/src/app/(dashboard)/admin/todo-list/components/TodoTaskTable.tsx`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoTaskTable.tsx)
> - [`fe/src/app/(dashboard)/admin/todo-list/components/TodoTaskCard.tsx`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoTaskCard.tsx)
> - [`fe/src/app/(dashboard)/admin/todo-list/components/CreateEditTaskModal.tsx`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/CreateEditTaskModal.tsx)
> - [`fe/src/app/(dashboard)/admin/todo-list/components/TodoPageHeader.tsx`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoPageHeader.tsx)
> - [`fe/src/hooks/useTodoTasks.ts`](../../../../../fe/src/hooks/useTodoTasks.ts)
> - [`fe/src/features/admin/admin.api.ts`](../../../../../fe/src/features/admin/admin.api.ts) (tasks section, lines 279–291)
> - [`fe/src/types/task.ts`](../../../../../fe/src/types/task.ts)
>
> Siblings:
> [admin_todo_list.md](admin_todo_list.md) ·
> [admin_todo_list_be.md](admin_todo_list_be.md) ·
> [admin_todo_list_crosspage_dataflow.md](admin_todo_list_crosspage_dataflow.md)

---

## 0. The action, in one line

> A manager taps **"+ Tạo công việc"**, fills in `CreateEditTaskModal`, and saves: `TodoPageClient`
> calls `useCreateTask.mutate(...)`, which POSTs to `POST /admin/tasks`, and on success
> **invalidates two Query cache keys** — `['admin','tasks',staffId,date]` and
> `['admin','tasks','stats']` — causing the stats board metric cards, the per-staff table, and
> (if a staff member is already selected) the task list table to **all refetch and re-render without
> any prop being passed between them**.

### The whole picture on one screen

```
                  /admin/todo-list  (the page)
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  TodoPageHeader ─── "Danh sách Công Việc"  [+ Tạo công việc] ──WRITES──┐ │
│                                                                     │   │ │
│  TodoFilterBar ─── staff dropdown · date · status · [Lọc] ──────── │ ──┼─│──▶ setFilters (in parent)
│    (has local mirror + useEffect sync on filters.assigned_to)       │   │ │
│                                                                     │   │ │
│  ┌──────────────────────────────────────────────────────────────┐   │   │ │
│  │  Stats Board  (shown when filters.assigned_to is null)       │   │   │ │
│  │  ┌──────────────────────────────────────────────────┐        │   │   │ │
│  │  │  Metric cards: Tổng · Hoàn thành · Đang làm · Quá hạn    │   │   │ │
│  │  │  ← reads useTaskStats(date) ────────────────────────────◀──────REFETCH
│  │  └──────────────────────────────────────────────────┘        │   │   │ │
│  │  ┌──────────────────────────────────────────────────┐        │   │   │ │
│  │  │  Per-staff table row (click) ──────────────────────────▶ setFilters(assigned_to)
│  │  │  ← reads useTaskStats(date).staffStats ─────────────────◀──────REFETCH
│  │  └──────────────────────────────────────────────────┘        │   │   │ │
│  └──────────────────────────────────────────────────────────────┘   │   │ │
│                                                                     │   │ │
│  ┌──────────────────────────────────────────────────────────────┐   │   │ │
│  │  Task List  (shown when filters.assigned_to is set)           │   │   │ │
│  │  TodoTaskTable (desktop) / TodoTaskCard (mobile)             │   │   │ │
│  │  ← reads useTodoTasks(staffId, date) ────────────────────────◀──────REFETCH
│  └──────────────────────────────────────────────────────────────┘   │   │ │
│                                                                     ▼   │ │
│  CreateEditTaskModal ─── form (RHF+Zod) ─── [Lưu công việc] ───WRITES──┘ │
│                          onSubmit lifted to TodoPageClient                │
└──────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┴──────────────────────────┐
              │         TanStack Query cache                      │
              │                                                   │
              │  ['admin','tasks', staffId, date]                 │
              │    Task[]  (staleTime 15 s)                       │
              │    ← useCreateTask.onSuccess invalidates this key │
              │                                                   │
              │  ['admin','tasks','stats', date]                  │
              │    StaffTaskStatsResponse  (staleTime 30 s)       │
              │    ← useCreateTask.onSuccess invalidates this key │
              │                                                   │
              │  ['admin','staff']                                │
              │    StaffListResponse  (staleTime 60 s)            │
              │    (NOT invalidated on task create)               │
              └───────────────────────────────────────────────────┘
                    ▲ invalidated by useCreateTask.onSuccess
                    │ read by useTodoTasks + useTaskStats hooks
                    └─ TodoPageClient owns both useQuery calls and passes data as props
```

**Read it like this:** the `CreateEditTaskModal` does not know about the stats board or the task
table — it only calls `onSubmit`. `TodoPageClient` is the single orchestrator: it owns all state,
all hooks, and all callback wiring. The Query cache is the one shared medium that lets the stats
board and the task list update in response to a create without any direct coupling.

---

## 1. The cast of components

| Component | Source file | Role in the create-task action |
|---|---|---|
| `TodoPageHeader` | `TodoPageHeader.tsx:6` | renders the `[+ Tạo công việc]` button; calls `onCreateClick` prop (lifted up to `TodoPageClient.handleOpenCreate`) |
| `CreateEditTaskModal` | `CreateEditTaskModal.tsx:33` | owns the RHF+Zod form; calls `onSubmit` prop on valid submit (lifted up to `TodoPageClient.handleModalSubmit`); reads `isSubmitting` prop to disable the submit button |
| `TodoPageClient` | `TodoPageClient.tsx:22` | the **only orchestrator**: owns `filters`, `modalOpen`, `editTask` local state; calls `useCreateTask`, `useTaskStats`, `useTodoTasks`; wires every child via props + callbacks |
| `TodoFilterBar` | `TodoFilterBar.tsx:11` | has its **own local `filters` mirror** (`local` state, line 12); syncs `assigned_to` from parent via `useEffect` (lines 16–18); calls `onChange` prop to lift filter changes up |
| Stats board (inline in `TodoPageClient`) | `TodoPageClient.tsx:99–153` | reads `statsQuery.data` directly from `useTaskStats` result; renders metric cards + per-staff table; per-staff row click calls `setFilters` (line 131) |
| `TodoTaskTable` | `TodoTaskTable.tsx:17` | desktop task list; receives `tasks[]` + `canEdit` + `onEdit` as props; calls `onEdit` to lift edit action up |
| `TodoTaskCard` | `TodoTaskCard.tsx:17` | mobile task card; same props pattern as `TodoTaskTable` |

**The pattern:** 7 components, 0 props passed between peer widgets. `TodoPageClient` is the hub
that receives callbacks upward and distributes data downward. The Query cache is the only mechanism
that makes the stats board and task list update in response to a mutation without any direct
coupling between them.

---

## 2. The single source: TanStack Query cache (not a Zustand store)

This page has **no Zustand store**. The shared server state lives entirely in the TanStack Query
cache. `TodoPageClient` owns all three `useQuery`/`useMutation` calls and is the sole intermediary
between the cache and the child components.

```
                  ❌ what we DON'T have         ✅ what we DO have
                  (Zustand store)               (Query cache + parent local state)

                  useCartStore (example)          TodoPageClient
                  ─── global singleton             ─── owns useTaskStats + useTodoTasks
                  ─── any component reads it       ─── derives data, passes as props
                  ─── no prop needed               ─── children get arrays, not hooks
                                                   ─── mutation invalidates cache keys
                                                      → both hooks refetch automatically
```

### 2.1 The exact cache shapes (traced)

**`['admin','tasks','stats', date]` entry** — a `StaffTaskStatsResponse`:

```ts
interface StaffTaskStatsResponse {
  metrics:    DailyTaskMetrics     // totalTasks · completedTasks · inProgressTasks · overdueTasks
  staffStats: StaffTaskStat[]      // one row per staff member
}

interface StaffTaskStat {
  staffId:        string
  staffName:      string
  role:           string
  assignedCount:  number
  completedCount: number
  completionRate: number           // 0–100
  qualityScore:   number           // 0–5.0
  hasOverdue:     boolean
}
```
`fe/src/types/task.ts:20–42`

This key is populated by `useTaskStats(date)` → `getTaskStats(date)` → `GET /admin/tasks/stats?date={date}`.
`useTodoTasks.ts:16-21` · `admin.api.ts:283-284`

**`['admin','tasks', staffId, date]` entry** — a `Task[]`:

```ts
interface Task {
  id:           string
  staffId:      string
  name:         string
  description?: string
  priority:     'high' | 'medium' | 'low'
  dueDate:      string        // "YYYY-MM-DD"
  dueTimeStart: string        // "HH:mm" (may be empty)
  dueTimeEnd:   string        // "HH:mm" (may be empty)
  status:       'pending' | 'in_progress' | 'completed' | 'overdue'
  notes?:       string
  createdAt:    string
  updatedAt:    string
}
```
`fe/src/types/task.ts:5-18`

This key is populated by `useTodoTasks(staffId, date)` → `getStaffTasks(staffId, date)` →
`GET /admin/tasks?staffId={staffId}&date={date}`.
`useTodoTasks.ts:7-13` · `admin.api.ts:286-287`

**Query is gated:** `useTodoTasks` has `enabled: !!staffId` (`useTodoTasks.ts:11`), so no fetch
fires until a staff member is selected.

**`['admin','staff']` entry** — used only for dropdown population; not affected by task mutations.
`TodoPageClient.tsx:35-40`

### 2.2 The invalidation keys — the cross-widget link after create

`useCreateTask` (`useTodoTasks.ts:24-33`) is the mutation:

```ts
export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(payload),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ['admin', 'tasks', task.staffId, task.dueDate] })
      qc.invalidateQueries({ queryKey: ['admin', 'tasks', 'stats'] })
    },
  })
}
```
`useTodoTasks.ts:24-33`

Two invalidations fire on every successful create:

| Invalidated key | Hook refetched | Widget updated |
|---|---|---|
| `['admin','tasks', task.staffId, task.dueDate]` | `useTodoTasks(staffId, date)` | `TodoTaskTable` / `TodoTaskCard` (if that staff + date is currently selected) |
| `['admin','tasks','stats']` (prefix match — invalidates all `['admin','tasks','stats',*]`) | `useTaskStats(date)` | metric cards + per-staff table |

No `setQueryData` is used — the page relies entirely on refetch (not optimistic update).

---

## 3. A manager creates a task, step by step — who writes, who reads

### Step 1 — Manager taps "[+ Tạo công việc]" in TodoPageHeader

`TodoPageHeader` renders the button when `canCreate` prop is true:
```tsx
{canCreate && (
  <button onClick={onCreateClick} …>+ Tạo công việc</button>
)}
```
`TodoPageHeader.tsx:10-17`

`onCreateClick` is wired to `TodoPageClient.handleOpenCreate`:
```ts
function handleOpenCreate() {
  setEditTask(null)
  setModalOpen(true)
}
```
`TodoPageClient.tsx:51-54`

Two local state updates: `editTask = null` (create mode, not edit), `modalOpen = true`.

### Step 2 — CreateEditTaskModal renders and the manager fills the form

`TodoPageClient` passes `open`, `mode`, `task`, `staffList`, `onClose`, `onSubmit`, `isSubmitting`
down to `CreateEditTaskModal`:
```tsx
<CreateEditTaskModal
  open={modalOpen}
  mode={editTask ? 'edit' : 'create'}
  task={editTask}
  staffList={staffList}
  onClose={() => setModalOpen(false)}
  onSubmit={handleModalSubmit}
  isSubmitting={createTask.isPending}
/>
```
`TodoPageClient.tsx:185-193`

`CreateEditTaskModal` owns its own RHF+Zod form state locally (`useForm`). On `open && mode === 'create'`,
a `useEffect` resets the form to defaults (`priority: 'medium'`, today's date).
`CreateEditTaskModal.tsx:39-55`

The form fields, validation schema, and submission are fully internal to `CreateEditTaskModal`. It
does not know about the cache or the filter state.

### Step 3 — Manager submits: form → onSubmit → handleModalSubmit → mutation

On valid submit, RHF calls `onSubmit` with the validated `FormValues`. This is `TodoPageClient.handleModalSubmit`:

```ts
function handleModalSubmit(values: { … }) {
  const dueDateTime = `${values.dueDate}T${values.dueTime}:00Z`
  createTask.mutate({
    staffId:     values.staffId,
    name:        values.name,
    priority:    values.priority,
    dueDateTime,
    …
  }, {
    onSuccess: () => setModalOpen(false),
  })
}
```
`TodoPageClient.tsx:61-80`

`createTask` is the `useCreateTask()` mutation result (`TodoPageClient.tsx:49`).
`createTask.isPending` becomes `true`, which propagates down to `CreateEditTaskModal.isSubmitting`
to disable the submit button and show "Đang lưu...".

### Step 4 — POST /admin/tasks fires

`useCreateTask` calls `createTask(payload)`:
```ts
export const createTask = (body: CreateTaskPayload): Promise<Task> =>
  api.post('/admin/tasks', body).then(r => r.data.data)
```
`admin.api.ts:289-291`

The returned `Task` carries `task.staffId` and `task.dueDate` (e.g. `"2026-06-14"`), which the
`onSuccess` handler uses to build the exact invalidation key.

For BE internals (handler → service → repo → SQL), see [admin_todo_list_be.md](admin_todo_list_be.md).

### Step 5 — onSuccess: two cache invalidations fire

```ts
onSuccess: (task) => {
  qc.invalidateQueries({ queryKey: ['admin', 'tasks', task.staffId, task.dueDate] })
  qc.invalidateQueries({ queryKey: ['admin', 'tasks', 'stats'] })
},
```
`useTodoTasks.ts:28-31`

TanStack Query marks both matching cache entries as stale and triggers background refetches:

- `['admin','tasks', <staffId>, <dueDate>]` → `getStaffTasks` refetches → `useTodoTasks` result
  updates → `TodoPageClient` re-renders → new `tasks[]` prop flows to `TodoTaskTable` / `TodoTaskCard`.
  (Only relevant if `filters.assigned_to === task.staffId` and `date === task.dueDate`; if a
  different staff or date is selected, the refetch still happens in the background but doesn't
  affect the visible task list.)
- `['admin','tasks','stats']` (prefix match) → `getTaskStats` refetches → `useTaskStats` result
  updates → `TodoPageClient` re-renders → metric cards and per-staff table show updated counts.

### Step 6 — Modal closes; UI reflects the new task

The per-mutation `onSuccess` in `handleModalSubmit` (`TodoPageClient.tsx:78`) calls
`setModalOpen(false)`, dismissing the modal.

If the manager was viewing the stats board (no staff selected), they will see the per-staff row for
the assigned staff show an incremented `assignedCount` once the stats refetch completes. If the
manager had already selected that staff member's task list, the new task appears in `TodoTaskTable`
/ `TodoTaskCard`.

---

## 4. The cross-widget view-switch link: per-staff row click → filter → both children sync

This is the page's main cross-component channel that does **not** involve a mutation or the modal.

### The mechanic

Clicking a row in the per-staff table calls:
```ts
onClick={() => setFilters(f => ({ ...f, assigned_to: stat.staffId }))}
```
`TodoPageClient.tsx:131`

This one `setFilters` call causes three things simultaneously:

1. **Stats board hides.** The condition `{!staffId && (…)}` (`TodoPageClient.tsx:93`) evaluates
   `false`, unmounting the stats board.
2. **Task list shows.** The condition `{staffId && (…)}` (`TodoPageClient.tsx:157`) evaluates
   `true`, mounting `TodoTaskTable` / `TodoTaskCard` with data from `useTodoTasks(staffId, date)`.
3. **`TodoFilterBar` syncs its own local `assigned_to` dropdown** via a `useEffect`:
   ```ts
   useEffect(() => {
     setLocal(f => ({ ...f, assigned_to: filters.assigned_to }))
   }, [filters.assigned_to])
   ```
   `TodoFilterBar.tsx:16-18`
   This keeps the staff dropdown in the filter bar consistent with the view, even though the
   user clicked a stats row rather than choosing from the dropdown directly.

This is a **one-way sync**: parent `filters.assigned_to` → `TodoFilterBar` local mirror. The
reverse path is `TodoFilterBar.handleApply → onChange(local)` → `setFilters` in parent. They do
not form a cycle because `handleApply` is only called on explicit button click.

---

## 5. Three layers of state — what belongs where

| Data | Layer | Lives in | File:line | Why |
|---|---|---|---|---|
| Task list for selected staff + date | **Server state** | TanStack Query `['admin','tasks', staffId, date]` | `useTodoTasks.ts:7-13` | BE-authoritative; invalidated after mutations |
| Daily stats + per-staff metrics | **Server state** | TanStack Query `['admin','tasks','stats', date]` | `useTodoTasks.ts:16-21` | BE-authoritative; invalidated after mutations |
| Staff list for dropdowns | **Server state** | TanStack Query `['admin','staff']` | `TodoPageClient.tsx:35-40` | stable; staleTime 60 s; NOT invalidated on task create |
| Active filter (staff, date, status, page) | **Local state** | `filters: TodoTaskFilter` | `TodoPageClient.tsx:26` | drives which cache keys are queried; not persisted |
| Modal open/closed | **Local state** | `modalOpen: boolean` | `TodoPageClient.tsx:27` | ephemeral UI; single widget |
| Task being edited | **Local state** | `editTask: Task \| null` | `TodoPageClient.tsx:28` | ephemeral UI; controls modal `mode` prop |
| Filter bar's pending (unapplied) inputs | **Local state** | `local: TodoTaskFilter` in `TodoFilterBar` | `TodoFilterBar.tsx:12` | widget-internal mirror; only promoted to parent on [Lọc] click |
| Date range validation error | **Local state** | `dateError: string` in `TodoFilterBar` | `TodoFilterBar.tsx:13` | widget-internal UI only |
| Form values while filling modal | **Local state** | RHF `useForm` state inside `CreateEditTaskModal` | `CreateEditTaskModal.tsx:34` | form-local; discarded on close |
| Mutation in-flight flag | **Derived** | `createTask.isPending` from `useMutation` | `TodoPageClient.tsx:49` | used to disable submit button; passed as `isSubmitting` prop |

> **The rule of thumb for this page:** if more than one widget needs it → it lives in
> `TodoPageClient` as local state passed down as props. If it comes from the BE and needs to
> update when a task is created → TanStack Query cache. If it is "this widget's own transient UI"
> → component-local `useState`. **There is no Zustand store.** The only client state that crosses
> component boundaries is `filters`, `modalOpen`, and `editTask` in `TodoPageClient`.

---

## 5. Cross-component vs cross-page boundary

This file covers cross-**component** (many widgets, one page tab). Cross-**page** (how a task
created here is visible on `/admin/staff/task-board` and on a staff member's own view) is covered
in [admin_todo_list_crosspage_dataflow.md](admin_todo_list_crosspage_dataflow.md).

| Scope | Mechanism | Survives F5? | For a created task |
|---|---|---|---|
| **Cross-component** (widgets on `/admin/todo-list`) | TanStack Query cache invalidation + parent local state props | No (in-memory; refetch on mount) | stats board and task list refetch after `POST /admin/tasks` succeeds; no prop passes between peer widgets |
| **Cross-page** (task-board, staff own view, other admin tabs) | The task row persisted in the DB; other pages fetch it on mount or on their own polling interval | Yes (DB row) | A task created here appears on `/admin/staff/task-board` on next fetch; no real-time push between pages — see cross-page doc |

---

## 6. Gotchas worth remembering

- **No optimistic update.** `useCreateTask` does not call `queryClient.setQueryData` — it only
  invalidates. The stats and task list update only after the refetch completes. While the refetch
  is in flight, the old data is shown (not a spinner, because `isLoading` is `false` on a
  background refetch of an existing entry). `useTodoTasks.ts:28-31`

- **Invalidation is by prefix, not exact key for stats.** `qc.invalidateQueries({ queryKey:
  ['admin','tasks','stats'] })` (`useTodoTasks.ts:30`) matches all entries whose key starts with
  that array, including `['admin','tasks','stats', anyDate]`. This means changing the `date`
  filter and then creating a task will invalidate stats for every date in cache, not just the
  currently displayed one. This is safe but slightly over-broad.

- **Task list invalidation is by exact key.** `['admin','tasks', task.staffId, task.dueDate]`
  (`useTodoTasks.ts:29`) is exact — it only invalidates the list for the staff member and date
  the task was assigned to, not for the currently displayed staff/date if they differ. If the
  manager creates a task for Staff A on tomorrow and is currently viewing Staff B's list today,
  Staff B's visible list is NOT refetched (correct behaviour).

- **`enabled: !!staffId` means task list never fetches when stats board is shown.**
  `useTodoTasks.ts:11`. The task list hook fires only after a staff member is selected (either via
  the filter bar or a stats row click).

- **`TodoFilterBar` has a local mirror, not a two-way bind.** The `useEffect` at
  `TodoFilterBar.tsx:16-18` only syncs `assigned_to` from parent to local — not all filter fields.
  If the parent resets `status` or `start_date`, `TodoFilterBar`'s local dropdowns will NOT update
  until the user clicks [Xóa lọc] (which calls `handleReset` → `onChange(reset)` → parent
  `setFilters`). This is by design (filter bar guards user's in-progress edits) but can look
  inconsistent.

- **`createTask.isPending` is the only cross-widget flight flag.** There is no `loadingIds` set
  like in `admin_overview`. If two managers somehow triggered simultaneous creates, the
  `isSubmitting` spinner would not distinguish between them. In practice, one modal = one in-flight
  request at a time.

- **Modal `onSuccess` and mutation `onSuccess` are both called.** `createTask.mutate(…, { onSuccess:
  () => setModalOpen(false) })` (`TodoPageClient.tsx:77-79`) adds a per-call `onSuccess` on top
  of the global `onSuccess` in `useCreateTask`. Both fire: cache invalidation runs first (from the
  hook), then `setModalOpen(false)` runs (from the call site). Order is guaranteed by TanStack
  Query's mutation lifecycle.

---

## 7. The whole action on one timeline (sequence view)

```
  Manager    TodoPageHeader   TodoPageClient       CreateEditTaskModal   TQ Cache              BE
     │              │               │                      │                │                   │
     │  tap [+ Tạo] │               │                      │                │                   │
     ├─────────────►│               │                      │                │                   │
     │        onCreateClick()       │                      │                │                   │
     │              ├──────────────►│                      │                │                   │
     │              │    setEditTask(null)                  │                │                   │
     │              │    setModalOpen(true)                 │                │                   │
     │              │               │── modalOpen=true prop▶│                │                   │
     │              │               │                      │ reset form      │                   │
     │  fills form  │               │                      │                │                   │
     │──────────────────────────────┼─────────────────────►│                │                   │
     │  taps [Lưu]  │               │                      │                │                   │
     │              │               │                      │ handleSubmit()  │                   │
     │              │               │◄── onSubmit(values) ─┤                │                   │
     │              │    handleModalSubmit(values)          │                │                   │
     │              │               │── isSubmitting=true prop▶             │                   │
     │              │               │                      │ [Đang lưu...]  │                   │
     │              │      createTask.mutate(payload) ──────┼────────────────┼── POST /admin/tasks►│
     │              │               │                      │                │  201 {Task}        │
     │              │               │                      │                │◄───────────────────┤
     │              │   onSuccess(task):                    │                │                   │
     │              │     invalidate ['admin','tasks', staffId, dueDate] ──►│ mark stale        │
     │              │     invalidate ['admin','tasks','stats']           ──►│ mark stale        │
     │              │               │                      │                │                   │
     │              │               │                      │         background refetch          │
     │              │               │                      │  GET /admin/tasks/stats?date=…  ─►│
     │              │               │                      │  GET /admin/tasks?staffId=…    ─►│
     │              │               │                      │                │◄── Task[]         │
     │              │               │                      │                │◄── StatsResponse  │
     │              │               │── statsQuery.data updated             │                   │
     │              │               │   metric cards + per-staff table re-render                │
     │              │               │── tasksQuery.data updated (if staff selected)             │
     │              │               │   TodoTaskTable / TodoTaskCard re-render                  │
     │              │   setModalOpen(false) ───────────────┤                │                   │
     │              │               │── modalOpen=false prop▶               │                   │
     │              │               │                      │ modal unmounts  │                   │
     ▼                                                                                          │
  (stats board shows updated counts; task list shows new task if that staff+date is selected)
```

---

## 8. Source & rule map

| Topic | Source of truth | File:line |
|---|---|---|
| Page zones / wireframe / object model | [admin_todo_list.md](admin_todo_list.md) | — |
| BE endpoints (POST /admin/tasks, GET /admin/tasks/stats, GET /admin/tasks) | [admin_todo_list_be.md](admin_todo_list_be.md) | — |
| Cross-page flow (task visible on task-board, other pages) | [admin_todo_list_crosspage_dataflow.md](admin_todo_list_crosspage_dataflow.md) | — |
| `useCreateTask` mutation + cache keys + invalidation | `useTodoTasks.ts` | `useTodoTasks.ts:24-33` |
| `useTodoTasks` hook (task list query) | `useTodoTasks.ts` | `useTodoTasks.ts:7-13` |
| `useTaskStats` hook (stats query) | `useTodoTasks.ts` | `useTodoTasks.ts:16-21` |
| `TodoPageClient` — orchestrator, local state, all callback wiring | `TodoPageClient.tsx` | `TodoPageClient.tsx:22-196` |
| `handleModalSubmit` (form values → mutation) | `TodoPageClient.tsx` | `TodoPageClient.tsx:61-80` |
| `handleOpenCreate` / `handleEdit` (modal open/mode control) | `TodoPageClient.tsx` | `TodoPageClient.tsx:51-58` |
| Per-staff row click → view switch | `TodoPageClient.tsx` | `TodoPageClient.tsx:131` |
| `TodoFilterBar` local mirror + `useEffect` sync | `TodoFilterBar.tsx` | `TodoFilterBar.tsx:12-18` |
| `TodoFilterBar.handleApply` (local → parent via `onChange`) | `TodoFilterBar.tsx` | `TodoFilterBar.tsx:20-32` |
| `TodoPageHeader` create button | `TodoPageHeader.tsx` | `TodoPageHeader.tsx:10-17` |
| `CreateEditTaskModal` RHF form + reset on open | `CreateEditTaskModal.tsx` | `CreateEditTaskModal.tsx:34-55` |
| `TodoTaskTable` — desktop task list (props only, no hooks) | `TodoTaskTable.tsx` | `TodoTaskTable.tsx:17` |
| `TodoTaskCard` — mobile task card (props only, no hooks) | `TodoTaskCard.tsx` | `TodoTaskCard.tsx:17` |
| `createTask` API function | `admin.api.ts` | `admin.api.ts:289-291` |
| `getStaffTasks` API function | `admin.api.ts` | `admin.api.ts:286-287` |
| `getTaskStats` API function | `admin.api.ts` | `admin.api.ts:283-284` |
| `Task` type | `fe/src/types/task.ts` | `task.ts:5-18` |
| `CreateTaskPayload` type | `fe/src/types/task.ts` | `task.ts:51-60` |
| `TodoTaskFilter` type | `fe/src/types/task.ts` | `task.ts:64-71` |
| `StaffTaskStatsResponse` type | `fe/src/types/task.ts` | `task.ts:39-42` |

---

> **One-line mental model:** on `/admin/todo-list`, `TodoPageClient` is the single orchestrator —
> it owns all local state (`filters`, `modalOpen`, `editTask`), all three Query hooks, and all
> callback wiring; when a task is created, `useCreateTask.onSuccess` invalidates two cache keys
> and both the stats board and the task list refetch automatically, with no prop ever crossing
> between peer widgets.
