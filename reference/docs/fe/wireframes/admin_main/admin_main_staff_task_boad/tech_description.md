## Technical Architecture — Admin — Staff Task Board

### Page Structure
- Zones: A (AdminTopNav) · B (BreadcrumbPageHeader) · C (FilterBar) · D (MetricsRow) · E (StaffTable) · F (ExpandedRow — conditional) · G (EmptyState — conditional)
- Device target: desktop (1200px primary)
- Sticky zones: A (`top-0 z-50`) · B (`top-[56px] z-40`)
- Modals: M1 — CreateTaskModal (fixed overlay `z-50`)
- Conditional zones: F shown only when `expandedStaffId === row.staffId`; G shown only when filtered staff list is empty

---

### RBAC & Auth Rules

| Rule | Value |
|------|-------|
| **Route protection** | `AuthGuard` + `RoleGuard(['admin', 'manager'])` |
| **Allowed roles** | Admin · Manager |
| **Auth state used** | `useAuthStore.user.role` — read in AdminTopNav for user chip display |
| **Conditional UI by role** | Both Admin and Manager can create and assign tasks. Role-based restrictions within task editing TBD (see conccern.md) |
| **Unauthorized redirect** | → `/login` (AuthGuard handles this) |

---

### Tech Stack

```
React (Next.js App Router)
├── State:   Zustand (useAuthStore only — auth/role)
│            useState — all filter + UI state (local, page-scoped)
├── Data:    TanStack Query
│            ├── ['admin', 'tasks', 'stats', date]  → Zone D + E (refetchInterval 60s)
│            ├── ['admin', 'tasks', staffId, date]  → Zone F (lazy, enabled: !!expandedStaffId)
│            └── ['admin', 'staff']                 → M1 staff dropdown (reuse existing cache)
├── Forms:   RHF + Zod (CreateTaskModal — 4 required fields)
├── Styling: Tailwind CSS (desktop table layout, orange overdue highlight #fff7ed)
└── Types:   TypeScript — DailyTaskMetrics · StaffTaskStat · Task · TaskBoardFilters · CreateTaskInput
```

---

### Key Implementation Patterns

**1. Component Architecture**

`page.tsx` is a full client component (`'use client'`). It owns the top-level state (`selectedDate`, `expandedStaffId`, `createModalOpen`, `defaultStaffId`) and passes down via props. No context providers needed — prop drill is shallow (2 levels max).

```
page.tsx
├── AdminTopNav (shared)
├── BreadcrumbPageHeader        ← receives onAddTask
├── StaffTaskFilterBar          ← receives filters + onChange
├── Zone D: 4× KPICard (shared) ← receives metrics from query
├── StaffTaskTable              ← receives rows, expandedId, onToggle, onAssign
│   └── ExpandedTaskList        ← receives staffId + date; owns its own useStaffTasks query
└── CreateTaskModal             ← receives open + defaultStaffId + onClose + onSuccess
```

**2. State Management**

All filter and UI state is `useState` — no Zustand store for this page. Only `useAuthStore` crosses page boundaries.

```typescript
// page.tsx
const [filters, setFilters] = useState<TaskBoardFilters>({
  date: todayISO(),
  role: 'all',
  status: 'all',
  search: '',
})
const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null)
const [createModalOpen, setCreateModalOpen] = useState(false)
const [defaultStaffId, setDefaultStaffId] = useState<string | undefined>()

function handleToggleExpand(staffId: string) {
  // only one row expanded at a time
  setExpandedStaffId(prev => prev === staffId ? null : staffId)
}

function handleAssign(staffId: string) {
  setDefaultStaffId(staffId)
  setCreateModalOpen(true)
}
```

**3. Data Fetching Strategy**

```typescript
// Zones D + E — stats with background refresh
const { data, isLoading } = useQuery<StaffTaskStatsResponse>({
  queryKey: ['admin', 'tasks', 'stats', filters.date],
  queryFn: () => apiFetch(`/admin/tasks/stats?date=${filters.date}`),
  staleTime: 30_000,
  refetchInterval: 60_000,
})

// Derived: apply client-side filters (role · status · search) over fetched stats
const filteredRows = useMemo(() =>
  applyFilters(data?.staffStats ?? [], filters),
  [data, filters]
)

// Zone F — lazy per-staff tasks (inside ExpandedTaskList component)
const { data: tasks, isLoading } = useQuery<Task[]>({
  queryKey: ['admin', 'tasks', staffId, date],
  queryFn: () => apiFetch(`/admin/tasks?staffId=${staffId}&date=${date}`),
  enabled: !!staffId,
  staleTime: 15_000,
})

// M1 — staff dropdown reuses existing cache (no extra fetch if Admin — Staff was visited)
const { data: staffList } = useQuery({
  queryKey: ['admin', 'staff'],
  queryFn: () => apiFetch('/admin/staff'),
  staleTime: 5 * 60_000,
})
```

**4. Performance**

- Prefetch Zone F on row hover: `queryClient.prefetchQuery(['admin', 'tasks', staffId, date], ...)`
- `useMemo` for `filteredRows` — avoids re-filtering on every render (filter is client-side)
- `refetchInterval: 60_000` on stats — background refresh without user action
- `TaskStatusBadge` and `TaskPriorityBadge` should be pure components (no hooks) — React memoises automatically

**5. Edge Case Handling**

- `hasOverdue: true` → row receives `className="bg-[#fff7ed]"` (orange). Driven by API flag, not computed on FE.
- `qualityScore === null` → render `<span className="text-slate-400">★ —</span>` — never "★ 0.0"
- Empty filter result → `filteredRows.length === 0` → render `<EmptyState message="No tasks found" />`
- API error on stats → show error banner + retry button (do not silently fail — KPI row would be invisible)

---

### Rendering Strategy

| Layer | What | Why |
|---|---|---|
| **ISR** | None | Task data is date-scoped and staff update statuses throughout the day — ISR would serve stale data |
| **RSC** | `page.tsx` is `'use client'` — no RSC split | All state (filters, expand, modal) must live on client; no server prefetch needed |
| **Client** (`'use client'`) | All zones A–G + M1 | Zustand / useState / user interaction / TanStack Query |

**Pattern B — Full Client.** Skeleton required: `StaffTaskBoardSkeleton` (4 KPI placeholders + 3 table row placeholders).

> Gap: Zone F (`ExpandedTaskList`) loads lazily on expand click → visible spinner on slow connections. Fix: `queryClient.prefetchQuery` on `onMouseEnter` of the row expand button.

Register this page in `docs/fe/wireframes/shared/_INDEX_RENDERING_STRATEGY.md` ✅ (done in Session 1).

---

### File Organization

```
src/
├── app/
│   └── admin/staff/task-board/
│       ├── page.tsx                         ← 'use client' · RoleGuard · filter state · skeleton
│       └── components/
│           ├── BreadcrumbPageHeader.tsx     ← breadcrumb + "+ Add Task" CTA
│           ├── StaffTaskFilterBar.tsx       ← date · role · status · search inputs
│           ├── StaffTaskTable.tsx           ← table shell · row rendering · expand toggle
│           ├── ExpandedTaskList.tsx         ← sub-table · useStaffTasks · loading/error states
│           └── CreateTaskModal.tsx          ← RHF + Zod · useMutation · staff dropdown
├── hooks/
│   ├── useStaffTaskStats.ts                 ← ['admin', 'tasks', 'stats', date]
│   └── useStaffTasks.ts                     ← ['admin', 'tasks', staffId, date]
└── components/
    └── shared/
        ├── TaskStatusBadge.tsx              ← pending · in_progress · completed · overdue
        └── TaskPriorityBadge.tsx            ← high · medium · low
```

> `hooks/` and `shared/` are top-level — never put them inside the page folder.

---

### State Contract

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useAuthStore` | `user.role` — to display active user chip in AdminTopNav | — | Set at login; persists across all admin pages | Shared across all admin pages |

Local state (page.tsx only — does not cross page boundaries):

| State | Type | Purpose |
|-------|------|---------|
| `filters.date` | `string` | Selected date for all queries |
| `filters.role` | `StaffRole \| 'all'` | Client-side role filter |
| `filters.status` | `TaskStatus \| 'all'` | Client-side status filter |
| `filters.search` | `string` | Client-side staff name search |
| `expandedStaffId` | `string \| null` | Which staff row is currently expanded (max 1) |
| `createModalOpen` | `boolean` | CreateTaskModal visibility |
| `defaultStaffId` | `string \| undefined` | Pre-fills Staff Member in CreateTaskModal when opened via "Assign" |

---

### Critical Implementation Notes

- Only one row can be expanded at a time — `handleToggleExpand` sets `expandedStaffId` to `null` if the same row is clicked again
- `CreateTaskModal` has two entry points: "+ Add Task" (no pre-fill) and "Assign" button (pre-fills `defaultStaffId`) — the `defaultStaffId` prop controls this
- Task `status: 'overdue'` is computed server-side (dueDateTime < now AND status ≠ completed) — the FE never computes overdue; it only reads the flag
- `refetchInterval: 60_000` on stats query — setting it lower (e.g. 10s) would cause visible table re-renders while the user is reading; 60s is the right balance
- Quality score `null` guard is non-negotiable — new staff have no score yet and "★ 0.0" would be misleading
- On `createTask` success: invalidate BOTH `['admin', 'tasks', 'stats', date]` AND `['admin', 'tasks', staffId, date]` — the second only if `expandedStaffId === variables.staffId`, otherwise it re-fetches unnecessarily
