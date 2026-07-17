---
page: admin_main_staff_task_boad
route: /admin/staff/task-board
created: 2026-05-26
status: Draft
---

# Page: Admin — Staff Task Board
**Route:** `/admin/staff/task-board`
**Version:** v1
**Status:** Draft

## Spec Summary

- Desktop dashboard (1200px) for Admin + Manager to assign and monitor daily staff tasks
- KPI row shows at-a-glance daily counts: Total Tasks / Completed ✓ / In Progress / Overdue !
- Staff table lists every active staff member with per-person completion rate % and quality score ★/5.0
- Overdue rows highlighted in orange (#fff7ed) for immediate visual attention; row is expandable (▼)
- Expanded row reveals individual task sub-table: Task Name · Priority (HIGH/MEDIUM/LOW) · Due Time · Status · Notes
- "Assign" button per row opens CreateTaskModal; "+ Add Task" in header also opens same modal
- Filter bar: date picker · role dropdown · status dropdown · staff name search (client-side filter over fetched data)
- Staff can view and update their own task status (from staff-facing view); this page is the admin management view

---

## 📐 Visual Wireframe

```
┌────────────────────────────────────────────────────────────────────────────────────┐  ← sticky top-0 z-50
│ Zone A — AdminTopNav                                                               │
│  BanhCuon Admin     Dashboard   Staff   Orders   Products   Reports     [Admin]   │
└────────────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────────────┐  ← sticky top-[56px] z-40
│ Zone B — BreadcrumbPageHeader                                                      │
│  Admin  >  Staff  >  Task Board                          [+ Add Task] (orange CTA) │
└────────────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────────────┐
│ Zone C — FilterBar                                                                 │
│  Date                    Role                 Status          Search               │
│  [2026-05-24        ]    [All Roles  ▾]       [All Status ▾]  [Search staff name…] │
└────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│  Zone D — MetricsRow (4 × KPICard)                                                 │
│        32        │  │       18 ✓       │  │       10         │  │      4 !        │
│  Total Tasks     │  │  Completed       │  │  In Progress     │  │  Overdue        │
│     Today        │  │  (green)         │  │  (indigo)        │  │  (red)          │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └─────────────────┘
┌────────────────────────────────────────────────────────────────────────────────────┐
│ Zone E — StaffTable                                                                │
│  Staff Member     Role       Assigned  Completed  Rate %  Quality Score  Actions  │
│  ─────────────────────────────────────────────────────────────────────────────── │
│  Nguyen Van A    [Kitchen]   8         6          75%     [★ 4.8 / 5.0]  [View Tasks] [Assign] │
│  Tran Thi B      [Cashier]   5         5          100%    [★ 5.0 / 5.0]  [View Tasks] [Assign] │
│  Le Van C        [Server]    10        5          50%     [★ 3.5 / 5.0]  [View Tasks] [Assign] │
│  ▼ Pham Thi D   [Kitchen]   9         2          22%     [★ 2.1 / 5.0]  [Hide Tasks] [Assign] │ ← orange highlight
│ ┌──────────────────────────────────────────────────────────────────────────────┐  │
│ │ Zone F — ExpandedRow (visible because row is expanded ▼)                    │  │
│ │  Task Name                        Priority  Due Time      Status     Notes  │  │
│ │  Chuan bi bot banh cuon buoi sang [HIGH]    07:00–08:00  [In Progress] Chua xong luc 8h │
│ │  Don dep bep sau ca sang          [MEDIUM]  11:30–12:00  [Pending]    —     │  │
│ │  Kiem tra & bo sung nguyen lieu   [LOW]     14:00–14:30  [Pending]    —     │  │
│ └──────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────┘

Zone G — EmptyState (replaces Zone E when filters return 0 results):
┌────────────────────────────────────────────────────────────────────────────────────┐
│                          [ No tasks found ]                                        │
│         Try adjusting your filters or add new tasks for staff members              │
└────────────────────────────────────────────────────────────────────────────────────┘

Modal M1 — Create Task (triggered by "+ Add Task" or any "Assign" button):
┌────────────────────────────────────────┐
│ Create New Task                    [✕] │
│ ──────────────────────────────────── │
│ Staff Member *                         │
│ [Select staff member             ▾]    │
│                                        │
│ Task Name *                            │
│ [e.g. Don dep bep sau ca sang    ]     │
│                                        │
│ Description                            │
│ [Optional notes or instructions…  ]    │
│ [                                  ]   │
│                                        │
│ Priority *            Due Date & Time *│
│ [High/Medium/Low ▾]  [2026-05-24 14:00]│
│                                        │
│ Notes                                  │
│ [Any additional notes (optional)…  ]   │
│ ──────────────────────────────────── │
│                   [Cancel] [Create Task] │
└────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| A | `AdminTopNav` | Always visible | `sticky top-0 z-50` |
| B | `BreadcrumbPageHeader` | Always visible | `sticky top-[56px] z-40` |
| C | `StaffTaskFilterBar` | Always visible | Static, below B |
| D | `StaffMetricsRow` (4× `KPICard`) | Always visible | Static |
| E | `StaffTaskTable` | Visible when results exist | Static |
| F | `ExpandedTaskList` | Visible inside a row when `expandedStaffId === row.staffId` | Inline within Zone E row |
| G | `EmptyState` | Visible when Zone E has 0 rows after filter | Replaces Zone E |
| M1 | `CreateTaskModal` | Open when `createModalOpen === true` | Fixed overlay, `z-50` |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| D | TanStack Query → `GET /api/v1/admin/tasks/stats?date=` | Refetch every 30s + on mutation | `['admin', 'tasks', 'stats', date]` | Returns DailyTaskMetrics — drives all 4 KPI cards |
| E | TanStack Query → `GET /api/v1/admin/tasks/stats?date=` | Same as Zone D | `['admin', 'tasks', 'stats', date]` | Same payload includes per-staff rows; client-side filter by role/status/search |
| F | TanStack Query → `GET /api/v1/admin/tasks?staffId=&date=` | Fetched on row expand; `enabled: !!expandedStaffId` | `['admin', 'tasks', staffId, date]` | Lazy-fetched; prefetch on row hover to reduce latency gap |
| A | `useAuthStore.user.role` | Zustand | N/A | Used by `AdminTopNav` to show active user chip |
| C | `useState` (local) | User interaction | N/A | `selectedDate · selectedRole · selectedStatus · searchQuery` |
| M1 | `useAuthStore` + `GET /api/v1/admin/staff` | Zustand + TanStack Query | `['admin', 'staff']` | Staff dropdown reuses existing staff list cache |

---

## 🧩 Component Specifications

> Before filling this table: read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md`.
> Mark each row with one of: `✅ reuse` · `new (local)` · `new (shared)`

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|-----------------|
| A | `AdminTopNav` | ✅ reuse | `shared/AdminTopNav.tsx` | `activeTab: AdminTab` (set to `'staff'`) |
| B | `BreadcrumbPageHeader` | new (local) | `app/admin/staff/task-board/components/BreadcrumbPageHeader.tsx` | `breadcrumbs: string[]` · `onAddTask: () => void` |
| C | `StaffTaskFilterBar` | new (local) | `app/admin/staff/task-board/components/StaffTaskFilterBar.tsx` | `filters: TaskBoardFilters` · `onChange: (f) => void` |
| D | `KPICard` ×4 | ✅ reuse | `shared/KPICard.tsx` | `label · value · badge? · valueColor?` |
| E | `StaffTaskTable` | new (local) | `app/admin/staff/task-board/components/StaffTaskTable.tsx` | `rows: StaffTaskStat[]` · `expandedId: string \| null` · `onToggleExpand: (id) => void` · `onAssign: (staffId) => void` |
| E | `Badge` (role chip) | ✅ reuse | `ui/badge.tsx` | `variant: 'warning' \| 'default' \| 'success'` (Kitchen/Cashier/Server) |
| E | `TaskStatusBadge` | new (shared) | `shared/TaskStatusBadge.tsx` | `status: TaskStatus` |
| F | `ExpandedTaskList` | new (local) | `app/admin/staff/task-board/components/ExpandedTaskList.tsx` | `tasks: Task[]` · `isLoading: boolean` |
| F | `TaskPriorityBadge` | new (shared) | `shared/TaskPriorityBadge.tsx` | `priority: TaskPriority` |
| F | `TaskStatusBadge` | new (shared) | `shared/TaskStatusBadge.tsx` | `status: TaskStatus` |
| G | `EmptyState` | ✅ reuse | `shared/EmptyState.tsx` | `message: "No tasks found"` |
| M1 | `CreateTaskModal` | new (local) | `app/admin/staff/task-board/components/CreateTaskModal.tsx` | `open: boolean` · `defaultStaffId?: string` · `onClose: () => void` · `onSuccess: () => void` |
| M1 | `Button` | ✅ reuse | `ui/button.tsx` | `variant: 'default' \| 'ghost'` — Cancel + Create Task |
| M1 | `Input` | ✅ reuse | `ui/input.tsx` | Task Name field |
| M1 | `Label` | ✅ reuse | `ui/label.tsx` | All form labels |
| — | `AuthGuard` | ✅ reuse | `guards/AuthGuard.tsx` | Wraps page |
| — | `RoleGuard` | ✅ reuse | `guards/RoleGuard.tsx` | `allowedRoles: ['admin', 'manager']` |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
// Task statuses — distinct from OrderStatus
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'
type TaskPriority = 'high' | 'medium' | 'low'
type StaffRole = 'kitchen' | 'cashier' | 'server' | 'manager' | 'admin'

interface DailyTaskMetrics {
  date: string           // "YYYY-MM-DD"
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
}

interface StaffTaskStat {
  staffId: string
  staffName: string
  role: StaffRole
  assignedCount: number
  completedCount: number
  completionRate: number   // 0–100
  qualityScore: number     // 0–5.0
  hasOverdue: boolean      // drives orange row highlight
  // metrics + staff stats returned in same API call as DailyTaskMetrics
}

interface StaffTaskStatsResponse {
  metrics: DailyTaskMetrics
  staffStats: StaffTaskStat[]
}

interface Task {
  id: string
  staffId: string
  name: string
  description?: string
  priority: TaskPriority
  dueDate: string          // "YYYY-MM-DD"
  dueTimeStart: string     // "HH:mm"
  dueTimeEnd: string       // "HH:mm"
  status: TaskStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

interface TaskBoardFilters {
  date: string             // "YYYY-MM-DD", defaults to today
  role: StaffRole | 'all'
  status: TaskStatus | 'all'
  search: string
}

interface CreateTaskInput {
  staffId: string
  name: string
  description?: string
  priority: TaskPriority
  dueDateTime: string      // ISO datetime
  notes?: string
}
```

### Query Configuration

```typescript
// Zone D + E — daily stats + staff list
function useStaffTaskStats(date: string) {
  return useQuery<StaffTaskStatsResponse>({
    queryKey: ['admin', 'tasks', 'stats', date],
    queryFn: () => apiFetch(`/admin/tasks/stats?date=${date}`),
    staleTime: 30 * 1000,      // 30s — task statuses change frequently
    refetchInterval: 60 * 1000, // background refetch every 60s
  })
}

// Zone F — individual staff tasks, lazy on row expand
function useStaffTasks(staffId: string | null, date: string) {
  return useQuery<Task[]>({
    queryKey: ['admin', 'tasks', staffId, date],
    queryFn: () => apiFetch(`/admin/tasks?staffId=${staffId}&date=${date}`),
    enabled: !!staffId,
    staleTime: 15 * 1000, // 15s — status updates by staff are frequent
  })
}

// M1 — staff dropdown reuses existing cache
function useStaffList() {
  return useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: () => apiFetch('/admin/staff'),
    staleTime: 5 * 60 * 1000, // 5 min — staff list rarely changes
  })
}

// Create task mutation
function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) => apiFetch('/admin/tasks', { method: 'POST', body: input }),
    onSuccess: (_, variables) => {
      const date = variables.dueDateTime.slice(0, 10)
      queryClient.invalidateQueries({ queryKey: ['admin', 'tasks', 'stats', date] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'tasks', variables.staffId, date] })
    },
  })
}
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| No tasks for selected date | `staffStats.every(s => s.assignedCount === 0)` | Render Zone G EmptyState | "No tasks found — try a different date or add new tasks" |
| Filter returns 0 staff rows | `filteredStaff.length === 0` | Render Zone G EmptyState | Same EmptyState with "Try adjusting your filters" |
| Staff row expand fails (network) | `useStaffTasks` returns error | Show inline error inside ExpandedTaskList | "Could not load tasks. Tap to retry." |
| Metrics API error | `useStaffTaskStats` returns error | Show skeleton / error state for Zone D | KPICards show "—" with error indicator |
| Create task fails (validation) | RHF Zod schema error | Highlight invalid fields inline | Field-level error messages below each input |
| Create task fails (server error) | `useMutation` onError | Toast: "Không thể tạo nhiệm vụ — thử lại" | Modal stays open, form data preserved |
| Staff member deactivated during the day | API returns staff with `active: false` | Exclude from `StaffTaskFilterBar` role dropdown | Existing tasks remain visible; "Assign" disabled |
| Quality score missing (new staff) | `qualityScore === null` | Render "★ —" | Badge shows muted "★ —" in grey |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Zone A: AdminTopNav shows "Staff" tab as active
- [ ] Zone B: Breadcrumb shows "Admin > Staff > Task Board"; "+ Add Task" opens Modal M1
- [ ] Zone C: Date filter change re-fetches `['admin', 'tasks', 'stats', date]` with new date
- [ ] Zone C: Role/Status/Search filters apply client-side without new API call
- [ ] Zone D: KPI values match aggregated Zone E row data
- [ ] Zone E: Overdue rows (hasOverdue: true) render with orange background
- [ ] Zone E: Click "View Tasks" on any row expands Zone F; click "Hide Tasks" collapses it
- [ ] Zone E: Click "Assign" on any row opens Modal M1 with that staff pre-selected
- [ ] Zone F: ExpandedTaskList shows tasks for selected staff; loads only on expand
- [ ] Zone F: `TaskPriorityBadge` and `TaskStatusBadge` render correct colors per value
- [ ] Zone G: EmptyState shown when all filters return 0 staff rows
- [ ] Modal M1: All required fields (*) block submission when empty
- [ ] Modal M1: Successful create closes modal, invalidates cache, updates Zone D + E counts
- [ ] Modal M1: Cancel closes modal without side effects

### Edge Case Tests
- [ ] Date = today's date → metrics reflect live updates from staff
- [ ] No staff on selected date → Zone G renders
- [ ] Staff with `qualityScore === null` → renders "★ —"
- [ ] Expand two rows simultaneously → only one row can be expanded at a time (toggle behavior)
- [ ] Create task API error → modal stays open, toast shown, form data preserved

### Accessibility Tests
- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] Keyboard navigation works (Tab, Enter, Esc closes Modal M1)
- [ ] Focus visible on all interactive elements
- [ ] `aria-expanded` on expandable rows (Zone E)
- [ ] Role badges and status badges have `aria-label`

### Cross-Device Tests
- [ ] Desktop (1280px+) — primary target, full table visible
- [ ] Tablet (768px) — table scrolls horizontally; KPI row 2×2 grid
- [ ] Mobile (375px) — not primary; KPI stacked 1 col, table scrollable

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| STB-1 | FE | Wireframe + zone table | ✅ | wireframes/admin_main/admin_main_staff_task_boad/admin_main_staff_task_boad_wireframe_v1.md |
| STB-2 | FE | `StaffTaskFilterBar` component | ⬜ | Zone C |
| STB-3 | FE | `StaffTaskTable` component + expandable rows | ⬜ | Zone E |
| STB-4 | FE | `ExpandedTaskList` + `TaskPriorityBadge` + `TaskStatusBadge` | ⬜ | Zone F |
| STB-5 | FE | `CreateTaskModal` (RHF + Zod) | ⬜ | Modal M1 |
| STB-6 | FE | Page assembly + query hooks + guards | ⬜ | Full page |
| STB-7 | BE | `GET /api/v1/admin/tasks/stats` endpoint | ⬜ | Zone D + E |
| STB-8 | BE | `GET /api/v1/admin/tasks` endpoint | ⬜ | Zone F |
| STB-9 | BE | `POST /api/v1/admin/tasks` endpoint | ⬜ | Modal M1 |

---

## 📝 Changelog

**v1 (2026-05-26)**
- Initial scaffold based on `staff-task-board.excalidraw`
- Zones documented: A (AdminTopNav) · B (BreadcrumbPageHeader) · C (FilterBar) · D (MetricsRow) · E (StaffTable) · F (ExpandedRow) · G (EmptyState)
- Modal documented: M1 (Create Task — 5 required fields)
- TypeScript contracts: DailyTaskMetrics · StaffTaskStat · Task · TaskBoardFilters · CreateTaskInput
- New shared components identified: TaskStatusBadge · TaskPriorityBadge

---

*Last Updated: 2026-05-26*
*Approved by: —*
*Next Review: After tech_description.md and conccern.md completed (Session 2)*
