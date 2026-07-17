# Admin Task Board — `/admin/staff/task-board`

> **TL;DR:** ✅ implemented · manager+ · Per-staff task dashboard under the staff section:
> breadcrumb header with CTA, filter bar (date), KPI row (task stats), and a staff table where
> expanding a row loads that staff member's tasks for the selected date.

---

## ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ (admin shell: tab nav)                                           │
├──────────────────────────────────────────────────────────────────┤
│ B  Nhân viên / Bảng công việc              [+ Giao việc]         │ ← BreadcrumbPageHeader
├──────────────────────────────────────────────────────────────────┤
│ C  [📅 12/06/2026 ▾]  (filters)                                  │ ← StaffTaskFilterBar
├──────────────────────────────────────────────────────────────────┤
│ D  ┌Tổng việc┐ ┌Chờ làm┐ ┌Đang làm┐ ┌Hoàn thành┐                 │ ← KPICard ×4
│    │   18    │ │   5   │ │   4    │ │    9     │                 │
├──────────────────────────────────────────────────────────────────┤
│ E  ┌──────────────────────────────────────────────────────────┐  │ ← StaffTaskTable
│    │ ▸ chef01      5 việc   2 hoàn thành                      │  │
│    │ ▾ cash02      4 việc   3 hoàn thành                      │  │
│    │    · Kiểm kê nguyên liệu   [đang làm]   21:00            │  │
│    │    · Lau quầy thu ngân     [hoàn thành] 18:00            │  │
│    │ ▸ manager     2 việc   1 hoàn thành                      │  │
│    └──────────────────────────────────────────────────────────┘  │
│ G  (empty state when no tasks for the day → EmptyState)          │
└──────────────────────────────────────────────────────────────────┘
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| B Header | `task-board/components/BreadcrumbPageHeader` | — |
| C Filters | `task-board/components/StaffTaskFilterBar` | local `TaskBoardFilters` (date) |
| D KPIs | `components/shared/KPICard` ×4 | `getTaskStats` (`['admin','tasks','stats', date]`) |
| E Table | `task-board/components/StaffTaskTable` | staff rows + expanded `getStaffTasks` (`['admin','tasks', staffId, date]`) |
| G Empty | `components/shared/EmptyState` | — |

## Key Interactions

- Change date → KPIs + table refetch for that day.
- Click a staff row → expands and lazily fetches that staff member's tasks (separate query per
  expansion); error shows an inline retry.
- **+ Giao việc** CTA → create-task flow (shared with [`/admin/todo-list`](../admin_todo_list/admin_todo_list.md)).

## Business Logic Used

- Task stats/queries → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (task hooks)
- Staff list scope → [../02_spec/BUSINESS_RULES.md §1 RBAC](../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy)
