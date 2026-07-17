# Admin Task Board — Cross-Component Data Flow (manager assigns a task, KPIs + table refresh themselves)

> **Status:** ✅ Implemented
> **Purpose:** Traces how the widgets on the single `/admin/staff/task-board` page coordinate data
> after a manager assigns a new task — with **no Zustand store** and **no prop-drilling** between
> widgets. The shared coordinator is (a) page-level `useState` lifted into `page.tsx` and passed
> down as props, plus (b) the TanStack Query cache, whose invalidation by `CreateTaskModal` is the
> mechanism that makes the KPI cards and staff table refresh themselves.
>
> **Sources traced on branch `experience_claude.md_system_1`:**
> [`page.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx) ·
> [`StaffTaskFilterBar.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskFilterBar.tsx) ·
> [`StaffTaskTable.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx) ·
> [`ExpandedTaskList.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx) ·
> [`CreateTaskModal.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx) ·
> [`BreadcrumbPageHeader.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/BreadcrumbPageHeader.tsx) ·
> [`admin.api.ts`](../../../../../fe/src/features/admin/admin.api.ts) ·
> [`types/task.ts`](../../../../../fe/src/types/task.ts)
>
> **Sibling docs:**
> [admin_task_board.md](admin_task_board.md) ·
> [admin_task_board_be.md](admin_task_board_be.md) ·
> [admin_task_board_crosspage_dataflow.md](admin_task_board_crosspage_dataflow.md) ·
> [admin_task_board_loading.md](admin_task_board_loading.md) ·
> [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md)

---

## 0. The action, in one line

> Manager clicks **"Giao việc"** on a staff row → fills the modal → submits → `CreateTaskModal`
> calls `qc.invalidateQueries` on the stats + tasks cache keys → the KPI cards and staff table
> **refetch and re-render on their own, with no prop passed from the modal back up to page.tsx.**

### The whole picture on one screen

```
          /admin/staff/task-board  (page.tsx owns all coordinator state)
┌──────────────────────────────────────────────────────────────────────────┐
│  B  BreadcrumbPageHeader                   [ Thêm công việc ]           │
│       ← props: onAddTask (sets modal open, defaultStaffId=undefined)    │
├──────────────────────────────────────────────────────────────────────────┤
│  C  StaffTaskFilterBar                                                   │
│       ← props: filters (date/role/status/search), onChange             │
│       → WRITES filters back up to page.tsx.useState via onChange()      │
├──────────────────────────────────────────────────────────────────────────┤
│  D  KPI Cards (4× KPICard — inline in page.tsx)                        │
│       ← READS: statsData?.metrics from Query cache                      │
│         key ['admin','tasks','stats', filters.date]                     │
├──────────────────────────────────────────────────────────────────────────┤
│  E  StaffTaskTable                                                       │
│       ← props: filteredStaff (client-filtered from same statsData)      │
│                expandedId, expandedTasks, isExpandedLoading/Error       │
│                onToggleExpand, onAssign                                  │
│       → WRITES expandedStaffId (via onToggleExpand)                     │
│                modal open + defaultStaffId (via onAssign)               │
│       ↳  ExpandedTaskList (child, props only, no Query calls of its own)│
│              ← props: tasks[], isLoading, isError                       │
├──────────────────────────────────────────────────────────────────────────┤
│  M1 CreateTaskModal  (conditionally mounted — {modalOpen && …})         │
│       ← props: open, defaultStaffId, onClose, onSuccess                 │
│       → POST /admin/tasks                                                │
│       → qc.invalidateQueries(['admin','tasks','stats', date])  ←── KEY  │
│       → qc.invalidateQueries(['admin','tasks', staffId, date]) ←── KEY  │
│         (no callback to page.tsx — the Query cache is the messenger)    │
└──────────────────────────────────────────────────────────────────────────┘
          │                                          ▲
          │ writes (filter changes / modal open)     │ re-render (refetch)
          ▼                                          │
┌────────────────────────────────────────────────────────────────────────┐
│              page.tsx  useState  (the coordinator)                     │
│  filters: { date, role, status, search }  ← drives both Query keys    │
│  expandedStaffId: string | null           ← gates the lazy Query       │
│  modalOpen: boolean                       ← mounts CreateTaskModal     │
│  defaultStaffId: string | undefined       ← pre-selects staff in modal │
└────────────────────────────────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
┌───────────────────┐  ┌───────────────────────────────────────────┐
│  TanStack Query   │  │  TanStack Query                           │
│  cache key:       │  │  cache key:                               │
│  ['admin','tasks',│  │  ['admin','tasks', expandedStaffId, date] │
│   'stats', date]  │  │  (enabled only when expandedStaffId set)  │
│                   │  │                                           │
│  → statsData      │  │  → expandedTasks[]                        │
│    .metrics (KPIs)│  │    (passed to StaffTaskTable → Expanded…) │
│    .staffStats[]  │  │                                           │
└───────────────────┘  └───────────────────────────────────────────┘
       ▲  invalidated by CreateTaskModal onSuccess (line 92-93)
       └──────────────────────────────────────────────────────────
```

**Read it like this:** filter changes flow from `StaffTaskFilterBar` → `page.tsx` state → both
Query keys. Row-expand clicks flow from `StaffTaskTable` → `page.tsx.expandedStaffId` → the lazy
Query. The modal submit flows to the BE, then back through Query cache invalidation — **no return
prop or callback carries the new task data back up the component tree**.

---

## 1. The cast of components

| Zone | Component | Role in this action | Data source |
|---|---|---|---|
| B Header | `BreadcrumbPageHeader` | "Thêm công việc" CTA → triggers `handleAddTask` | prop `onAddTask` from `page.tsx:70-73` |
| C Filters | `StaffTaskFilterBar` | Date / role / status / search → writes `filters` back to page | prop `onChange` → `page.tsx:19-24` |
| D KPIs | 4× `KPICard` (inline in `page.tsx:87-109`) | Reads `metrics` from stats Query; auto-refreshes after invalidation | `statsData?.metrics` from Query cache |
| E Staff table | `StaffTaskTable` | Renders `filteredStaff` rows; "Giao việc" button calls `onAssign` | props: `rows`, `expandedId`, `expandedTasks`, callbacks |
| F Task detail | `ExpandedTaskList` | Renders `Task[]` for the expanded row; pure display | props only — no Query of its own |
| M1 Modal | `CreateTaskModal` | POSTs the new task; invalidates both Query keys on success | internal RHF form; `useQueryClient` |

**The pattern:** 6 widgets, 0 props passed between peer widgets. `page.tsx` is the single coordinator:
it holds all mutable UI state and passes typed props downward. The Query cache (not a Zustand store)
is the broadcast bus for data freshness.

---

## 2. The single source — page-level `useState` + TanStack Query cache

This page has **no Zustand store**. The two coordination mechanisms are:

### 2.1 Coordinator state — exact traced shape (`page.tsx:19-27`)

```ts
// page.tsx:19-27
const [filters, setFilters] = useState<TaskBoardFilters>({
  date:   TODAY,      // "YYYY-MM-DD" — drives both Query keys
  role:   'all',
  status: 'all',
  search: '',
})
const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null)
const [modalOpen, setModalOpen] = useState(false)
const [defaultStaffId, setDefaultStaffId] = useState<string | undefined>()
```

`TaskBoardFilters` shape is in [`fe/src/types/task.ts:44-49`](../../../../../fe/src/types/task.ts).

### 2.2 Query cache — the two keys and their selectors

**Stats key** (`page.tsx:30-35`):
```ts
queryKey: ['admin', 'tasks', 'stats', filters.date]
queryFn:  () => getTaskStats(filters.date)       // GET /admin/tasks/stats?date=YYYY-MM-DD
staleTime: 30_000                                // 30 s
refetchInterval: 60_000                          // auto-poll every 60 s
```
Returns `StaffTaskStatsResponse`:
```ts
// fe/src/types/task.ts:39-42
interface StaffTaskStatsResponse {
  metrics:    DailyTaskMetrics     // → KPI cards
  staffStats: StaffTaskStat[]      // → client-filter → StaffTaskTable rows
}
```

**Lazy staff-tasks key** (`page.tsx:38-43`):
```ts
queryKey: ['admin', 'tasks', expandedStaffId, filters.date]
queryFn:  () => getStaffTasks(expandedStaffId!, filters.date)  // GET /admin/tasks?staffId=…&date=…
enabled:  !!expandedStaffId       // only fires when a row is expanded
staleTime: 15_000                 // 15 s
```
Returns `Task[]` — passed directly as prop `expandedTasks` to `StaffTaskTable`.

**Client-side filter** (no extra API call) (`page.tsx:49-59`):
```ts
const filteredStaff = useMemo(() => {
  return allStaff.filter(s => {
    if (filters.role !== 'all' && s.role !== filters.role) return false
    if (filters.status !== 'all') {
      if (filters.status === 'overdue' && !s.hasOverdue) return false
      // ⚠️ Bug 4: only 'overdue' is implemented; other status values are silently ignored
    }
    if (filters.search && !s.staffName.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })
}, [allStaff, filters])
```
See [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md) Bug 4 for the dead status filter.

---

## 3. Manager assigns a task, step by step — who writes, who reads

> **Watch both the coordinator state and the Query cache change at each beat.**

### Step 1 — Manager clicks "Giao việc" on a staff row

`StaffTaskTable` (`StaffTaskTable.tsx:134`) renders a "Giao việc" `Button` per row. Clicking it calls
`onAssign(row.staffId)`, which is `handleAssign` in `page.tsx:65-68`:

```ts
// page.tsx:65-68
function handleAssign(staffId: string) {
  setDefaultStaffId(staffId)   // pre-select this staff in the modal
  setModalOpen(true)
}
```

Coordinator state after Step 1:
```
modalOpen:       true
defaultStaffId:  "<staffId of that row>"
```

`{modalOpen && <CreateTaskModal …>}` (`page.tsx:130-137`) mounts the modal for the first time — or
re-mounts it fresh (the condition guarantees `useForm` re-initialises with the new `defaultStaffId`
each open; see comment `page.tsx:129`).

### Step 2 — Modal mounts, fetches staff list, pre-selects the staff

`CreateTaskModal` opens with `defaultStaffId` as prop. On mount it:

1. Runs `useQuery(['admin','staff'])` to populate the staff dropdown (`CreateTaskModal.tsx:39-44`).
   `staleTime: 5 min` so this usually resolves from cache instantly.
2. `useEffect` at `CreateTaskModal.tsx:57-70` resets the RHF form with `staffId: defaultStaffId`.
3. A second `useEffect` at `CreateTaskModal.tsx:73-77` re-applies the pre-selection once the staff
   list resolves (async race guard):
   ```ts
   if (open && defaultStaffId && staffList.length > 0) {
     setValue('staffId', defaultStaffId)
   }
   ```

All form field state stays **local to `CreateTaskModal`** — it never surfaces to `page.tsx`.

### Step 3 — Manager fills form and submits

`handleSubmit` calls `mutation.mutate(v)` (`CreateTaskModal.tsx:117`). The mutation (`CreateTaskModal.tsx:79-101`):

```ts
mutationFn: (v) => createTask({
  staffId:      v.staffId,
  name:         v.name,
  description:  v.description,
  priority:     v.priority as TaskPriority,
  dueDateTime:  `${v.dueDate}T${v.dueTime}:00Z`,
  dueTimeStart: v.dueTimeStart,
  dueTimeEnd:   v.dueTimeEnd,
  notes:        v.notes,
}),
```

`createTask` in `admin.api.ts:289-290` sends `POST /admin/tasks` and returns the created `Task`.
For endpoint detail (handler → service → repo → SQL) see
[admin_task_board_be.md](admin_task_board_be.md).

### Step 4 — The "no prop-drilling" broadcast: Query cache invalidation

`onSuccess` receives the created `Task` object and:

```ts
// CreateTaskModal.tsx:91-93  ← THE KEY LINES
onSuccess: (task) => {
  const date = task.dueDate
  qc.invalidateQueries({ queryKey: ['admin', 'tasks', 'stats', date] })
  qc.invalidateQueries({ queryKey: ['admin', 'tasks', task.staffId, date] })
  toast.success('Đã tạo công việc thành công')
  onSuccess()
  onClose()
},
```

These two `invalidateQueries` calls mark the two cache entries as stale. TanStack Query immediately
re-fetches any active subscriber:

| Invalidated key | Subscriber in page.tsx | What re-renders |
|---|---|---|
| `['admin','tasks','stats', date]` | `page.tsx:30-35` stats query | KPI cards (Zone D) + full staff table (Zone E) |
| `['admin','tasks', task.staffId, date]` | `page.tsx:38-43` lazy query (if that staff is expanded) | `ExpandedTaskList` row (Zone F) |

**No return prop, no callback parameter, no Zustand write.** The modal never knows anything about
KPI cards or the staff table — it only knows the cache keys. The cache subscription (React Query's
`useQuery` in `page.tsx`) does the rest.

### Step 5 — Modal closes, page re-renders with fresh data

`onClose()` from `CreateTaskModal.tsx:95` flows to `page.tsx:136`:
```ts
onClose={() => setModalOpen(false)}
```

`modalOpen = false` → `{modalOpen && <CreateTaskModal …>}` unmounts the modal (and resets form
state). Meanwhile the two re-fetches are already in flight or complete. Page re-renders with:

- `metrics.totalTasks` incremented (KPI cards update)
- The staff row's `assignedCount` incremented (staff table updates)
- If that staff was expanded: `expandedTasks` now includes the new task (ExpandedTaskList updates)

Final coordinator state:
```
modalOpen:       false
defaultStaffId:  "<staffId>"   (stale, reset on next open)
```

---

## 3b. The row-expand interaction (secondary flow)

This is the other cross-component coordination: `expandedStaffId` in `page.tsx` drives a lazy
TanStack Query, whose result flows back into `StaffTaskTable → ExpandedTaskList`.

```
StaffTaskTable
  ChevronRight button (per row)
  onClick → onToggleExpand(row.staffId)             ← StaffTaskTable.tsx:88-90
      │
      ▼
  handleToggleExpand (page.tsx:61-63):
    setExpandedStaffId(prev => prev === staffId ? null : staffId)   // toggle
      │
      ▼
  expandedStaffId changes → lazy Query becomes enabled
    queryKey: ['admin','tasks', expandedStaffId, filters.date]
    queryFn: getStaffTasks(expandedStaffId!, filters.date)
      │
      ▼
  expandedTasks, expandedLoading, expandedError → passed as props to StaffTaskTable
    → StaffTaskTable renders ExpandedTaskList only when isExpanded === true (line 142-152)
    → ExpandedTaskList renders Task[] with priority + status badges, time window, notes
```

**One-expand-at-a-time rule:** `expandedStaffId` is a single `string | null`. Expanding a new row
collapses the previous one automatically (the lazy Query for the old key stays cached but
`enabled` becomes false when `expandedStaffId` changes).

---

## 4. Three layers of state — what belongs where

| Data | Layer | Lives in | Why |
|---|---|---|---|
| Filter values (date, role, status, search) | **Parent state** | `page.tsx useState` | Shared by FilterBar (writer) and both Query keys (readers); too many dependents for local state |
| Row-expand toggle | **Parent state** | `page.tsx.expandedStaffId` | Gates the lazy Query; StaffTaskTable is a display component that must not own async side-effects |
| Modal open + pre-selected staff | **Parent state** | `page.tsx.modalOpen + defaultStaffId` | Modal is conditionally mounted from page — parent controls lifecycle |
| Daily task metrics + staff list | **Server state** | TanStack Query `['admin','tasks','stats', date]` | Fetched from BE, shared between KPI cards + staff table, no local mutation |
| Individual staff tasks | **Server state** | TanStack Query `['admin','tasks', staffId, date]` | Lazy — only fetched when a row is expanded |
| Staff dropdown list in modal | **Server state** | TanStack Query `['admin','staff']` (in modal) | Separate concern; long `staleTime` (5 min) so usually cached |
| Form fields (name, priority, dueDate…) | **Local state** | RHF inside `CreateTaskModal` | Single-widget form state; no other component reads it |
| "Modal is submitting" spinner | **Local state** | `mutation.isPending` inside `CreateTaskModal` | Single-widget UI state |

> **The rule of thumb (no Zustand on this page):** if more than one widget needs the data as
> a driver → `useState` in `page.tsx` (the coordinator). If the data lives on the server →
> TanStack Query. If it's inside one widget's current UI → local RHF / `useState`.

---

## 5. Cross-component vs cross-page boundary

This file covers cross-**component** (many widgets, one `page.tsx`). For cross-**page** flows
(e.g. how a newly-created task appears on the staff's own task list page) see
[admin_task_board_crosspage_dataflow.md](admin_task_board_crosspage_dataflow.md).

| Scope | Mechanism | Survives F5? | For this action |
|---|---|---|---|
| **Cross-component** (within page) | `page.tsx useState` + TanStack Query cache invalidation | No (in-memory) | filters, modal state, expandedStaffId, KPI + table auto-refresh |
| **Cross-page** (admin board → staff view) | BE database row (written by `POST /admin/tasks`) | ✅ (persisted in DB) | The task lives in MySQL; other pages fetch it independently |

The page has **no localStorage usage** — no `storage-keys.ts` keys are read or written here.
❓ UNVERIFIED: whether the admin layout wrapper writes any session state that survives navigation.

---

## 6. Gotchas worth remembering

- **`CreateTaskModal` is conditionally mounted, not just toggled.** `{modalOpen && <CreateTaskModal …>}`
  (`page.tsx:130-137`) means unmounting fully resets `useForm` state. This is intentional (comment
  at `page.tsx:129`) to ensure `defaultStaffId` re-initialises correctly each open. A `key` prop
  would achieve the same but the mount/unmount pattern is what's coded.

- **Invalidation uses `task.dueDate`, not `filters.date`.** If the manager creates a task for a
  different date than the current filter, the stats cache for the filtered date is **not**
  invalidated — only the created task's `dueDate` is used in `onSuccess` (`CreateTaskModal.tsx:91`).
  This is a **known subtle bug**: the KPI cards may not refresh if `filters.date ≠ task.dueDate`.
  Flagged in [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md).

- **Status filter is partially dead.** `StaffTaskFilterBar` renders four status options (`pending`,
  `in_progress`, `completed`, `overdue`) but `page.tsx:53-55` only implements the `overdue` branch.
  Selecting `pending`, `in_progress`, or `completed` has no visible effect on the table (Bug 4 in
  [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md)).

- **The lazy task query stays mounted after collapse.** When a row is collapsed
  (`expandedStaffId = null`), the query key `['admin','tasks', oldStaffId, date]` stays in the
  TanStack Query cache (staleTime 15 s). Re-expanding the same row within 15 s hits the cache
  immediately. The invalidation in `onSuccess` also reaches this cached entry if `task.staffId`
  matches.

- **Staff dropdown in modal has its own cache key `['admin','staff']`** — separate from the stats
  cache. `listStaff` calls `GET /staff?limit=100` (`admin.api.ts:93`). The modal's staff list does
  not go stale after a new staff member is added in the same session unless explicitly invalidated
  elsewhere. ❓ UNVERIFIED: whether any other page invalidates `['admin','staff']`.

- **`onSuccess` prop from page.tsx is an empty no-op.** `page.tsx:135`: `onSuccess={() => {}}`.
  The modal's `onSuccess()` call at `CreateTaskModal.tsx:95` does nothing from the page's
  perspective — the real effect is `qc.invalidateQueries` which runs before `onSuccess()`.

- **Auto-poll of 60 s** on the stats query (`page.tsx:34`). Even without a task creation, the page
  will refetch stats every minute while it's mounted.

---

## 7. The whole action on one timeline (sequence view)

```
 Manager     BreadcrumbPageHeader /    page.tsx         CreateTaskModal        TanStack       BE
             StaffTaskTable           (coordinator)     (RHF + mutation)        Query
  │               │                       │                  │                   │            │
  ├─ click "Giao việc" ──▶ onAssign ──▶ setDefaultStaffId  │                   │            │
  │               │         row.staffId   setModalOpen=true │                   │            │
  │               │                       │── mount modal ──▶ │                   │            │
  │               │                       │                  │── useQuery ───────▶ GET /staff │
  │               │                       │                  │◀── staffList ─────│            │
  │               │                       │                  │── reset(form)     │            │
  │               │                       │                  │   setValue(staffId)│           │
  │               │                       │                  │                   │            │
  ├─ fill form ─────────────────────────── │──────────────────▶ (RHF local state)│            │
  │               │                       │                  │                   │            │
  ├─ submit ────────────────────────────── │──────────────────▶ mutation.mutate()│            │
  │               │                       │                  │── POST /admin/tasks ───────────▶
  │               │                       │                  │◀── 201 Task{}  ────────────────│
  │               │                       │                  │                   │            │
  │               │                       │                  ├─ invalidate ──────▶ ['admin','tasks','stats', date]
  │               │                       │                  ├─ invalidate ──────▶ ['admin','tasks', staffId, date]
  │               │                       │                  │                   │── refetch ─▶ GET /admin/tasks/stats?date=…
  │               │                       │                  │                   │── refetch ─▶ GET /admin/tasks?staffId=…&date=…
  │               │                       │                  ├─ toast.success    │            │
  │               │                       │                  ├─ onSuccess() (no-op)           │
  │               │                       │                  ├─ onClose()        │            │
  │               │                       ◀── setModalOpen=false ────────────────┤            │
  │               │                       │── unmount modal                      │            │
  │               │                       │                  │                   │◀── statsData (new)
  │               │                       │◀────────────────────────────────────── KPI cards re-render
  │               │◀──────────────────────────────────────────────────────────── staffTable rows re-render
  │               │                       │                  │                   │◀── expandedTasks (if expanded)
  │               │◀─────────────────────────────────────────────────────────── ExpandedTaskList re-renders
  ▼
 (task now visible in KPIs, staff row count incremented, task detail visible if row was expanded)
```

---

## 8. Source & rule map

| Topic | Source of truth |
|---|---|
| Page zones, wireframe, object model | [admin_task_board.md](admin_task_board.md) |
| BE endpoints (handler → service → repo → SQL) | [admin_task_board_be.md](admin_task_board_be.md) |
| Bug 4: dead status filter + invalidation date mismatch | [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md) |
| Page coordinator state + both Query hooks | [`page.tsx:19-43`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx) |
| Cache invalidation after task creation | [`CreateTaskModal.tsx:91-93`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx) |
| Client-side filter (role/status/search) | [`page.tsx:49-59`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx) |
| Filter bar (all four controls, no Query calls) | [`StaffTaskFilterBar.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskFilterBar.tsx) |
| Staff table + row expand rendering | [`StaffTaskTable.tsx:75-158`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx) |
| Task detail display (pure, no Query) | [`ExpandedTaskList.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx) |
| API functions: getTaskStats, getStaffTasks, createTask, listStaff | [`admin.api.ts:283-290`](../../../../../fe/src/features/admin/admin.api.ts) |
| TypeScript shapes: Task, StaffTaskStat, TaskBoardFilters, StaffTaskStatsResponse | [`types/task.ts`](../../../../../fe/src/types/task.ts) |
| Cross-page data handoff (task persisted in DB → other pages) | [admin_task_board_crosspage_dataflow.md](admin_task_board_crosspage_dataflow.md) |
| Loading states (skeleton, lazy expand, modal submit) | [admin_task_board_loading.md](admin_task_board_loading.md) |

---

> **One-line mental model:** on `/admin/staff/task-board`, *`page.tsx` is the coordinator — it
> owns all UI state and passes typed props downward; the TanStack Query cache is the broadcast
> bus — `CreateTaskModal` invalidates two keys on success, and every subscriber on the page
> (KPI cards, staff table, expanded task list) refetches and re-renders without receiving a
> single prop from the modal.*
