# Admin Task Board — Loading States

> **TL;DR:** ✅ implemented · how `/admin/staff/task-board` behaves while data is in flight.
> Two active loading layers: (1) a route-level spinner shared by the entire `(dashboard)/admin`
> group, (2) per-query states inside `StaffTaskBoardPage` — the stats query drives KPI text
> placeholders (`'…'`) and withholds the staff table; the expanded-row query drives an inline
> pulse message; the modal staff query silently populates a `<select>`. There is **no**
> route-level `loading.tsx` at the `task-board` segment itself — the shared admin spinner covers
> navigation.
>
> Page overview → [admin_task_board.md](admin_task_board.md)
> BE view → [admin_task_board_be.md](admin_task_board_be.md)
> Cross-component flow → [admin_task_board_crosscomponent_dataflow.md](admin_task_board_crosscomponent_dataflow.md)
> Cross-page flow → [admin_task_board_crosspage_dataflow.md](admin_task_board_crosspage_dataflow.md)

> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(dashboard)/admin/loading.tsx` ·
> `fe/src/app/(dashboard)/admin/staff/task-board/page.tsx` ·
> `fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx` ·
> `fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx` ·
> `fe/src/components/shared/KPICard.tsx` ·
> `fe/src/components/shared/EmptyState.tsx`

---

## Loading Layers (outer → inner)

```
1. Route navigation into /admin/**
       → AdminLoading (centered orange spinner, entire admin content area)
          fe/src/app/(dashboard)/admin/loading.tsx

2. StaffTaskBoardPage mounts
       → NO Suspense boundary; no lazy inner boundary
         (CreateTaskModal is dynamic-imported but mounted conditionally, not Suspense-wrapped)

3a. Stats query fires (queryKey: ['admin','tasks','stats', date])
        → KPI cards show literal '…' string; staff table region is suppressed

3b. Expanded-row query fires on row click (queryKey: ['admin','tasks', expandedStaffId, date])
        → ExpandedTaskList shows inline "Đang tải công việc…" pulse text

3c. Modal staff query fires when modal opens (queryKey: ['admin','staff'])
        → <select> shows only the placeholder option until data resolves
```

### 1 — Route-level spinner · `fe/src/app/(dashboard)/admin/loading.tsx`

Next.js App Router renders this file for the **entire `(dashboard)/admin` route group** during
server-side navigation into any admin page, including `/admin/staff/task-board`. It renders a
single centered ring:

- `h-64` flex container, `items-center justify-center`
- `h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500`
- Not task-board-specific — shared by all pages under `(dashboard)/admin/`.

There is **no** `loading.tsx` at `admin/staff/` or `admin/staff/task-board/`. The shared admin
spinner is the only route-level coverage. If navigation to this page is slow, no task-board
skeleton is shown — only the generic admin ring.

### 2 — No Suspense boundary

`StaffTaskBoardPage` (`page.tsx:18`) has no `<Suspense>` wrapper. `CreateTaskModal` is loaded
via `next/dynamic` (`page.tsx:10-12`) but is mounted conditionally (`{modalOpen && <CreateTaskModal …/>}`,
`page.tsx:131`), not wrapped in `<Suspense>`. No dynamic-import fallback is defined.

### 3a — Stats query · `page.tsx:30-35`

```
queryKey:        ['admin', 'tasks', 'stats', filters.date]   ← re-fires when date changes
queryFn:         getTaskStats(filters.date)                   ← GET /admin/tasks/stats?date=…
staleTime:       30 * 1000   (30 s)
refetchInterval: 60 * 1000   (60 s)
destructured:    { data: statsData, isLoading: statsLoading }
```

While `statsLoading === true`:

- Every `<KPICard>` renders the **literal string `'…'`** as its `value` prop (see §Main content
  branch below). This is text in the card's `<p>` element — not a skeleton pulse, not a spinner.
- The staff table region is withheld entirely (the `!statsLoading` guard prevents both the table
  and the empty-state from mounting).

### 3b — Expanded-row query · `page.tsx:38-43`

```
queryKey:  ['admin', 'tasks', expandedStaffId, filters.date]
queryFn:   getStaffTasks(expandedStaffId!, filters.date)
enabled:   !!expandedStaffId                  ← no fetch until a row is expanded
staleTime: 15 * 1000   (15 s)
destructured: { data: expandedTasks = [], isLoading: expandedLoading, isError: expandedError }
```

Loading state is handled inside `ExpandedTaskList` (`ExpandedTaskList.tsx:13-18`):

```tsx
if (isLoading) {
  return (
    <div className="px-4 py-3 text-sm text-muted-fg animate-pulse">
      Đang tải công việc…
    </div>
  )
}
```

A single `animate-pulse` text line — no per-row skeleton, no spinner icon.

### 3c — Modal staff query · `CreateTaskModal.tsx:39-44`

```
queryKey:  ['admin', 'staff']
queryFn:   listStaff()                        ← GET /staff?limit=100
staleTime: 5 * 60 * 1000   (5 min)
enabled:   open                               ← no fetch until modal opens
```

While the staff list is in flight the `<select>` renders only the placeholder option
`"Chọn nhân viên…"` (`CreateTaskModal.tsx:130`). The query exposes no `isLoading` flag to the
template — the select is silently empty until data resolves. There is no spinner or disabled
state on the select itself during this window.

If `defaultStaffId` is provided (via "Giao việc" button), `setValue` re-applies it once
`staffList.length > 0` (`CreateTaskModal.tsx:74-77`), so the pre-selection arrives after the
list loads.

---

## Main content branch · `page.tsx:87-127`

The page renders three distinct regions with their own priority-ordered states:

### Zone D — KPI row · `page.tsx:87-109`

Four `<KPICard>` components render unconditionally. The `value` prop is ternary on `statsLoading`:

| Card label | `statsLoading=true` value | `statsLoading=false` value | Source |
|---|---|---|---|
| Tổng công việc hôm nay | `'…'` | `String(metrics?.totalTasks ?? 0)` | `page.tsx:90-91` |
| Hoàn thành | `'…'` | `String(metrics?.completedTasks ?? 0)` | `page.tsx:93-94` |
| Đang thực hiện | `'…'` | `String(metrics?.inProgressTasks ?? 0)` | `page.tsx:98-99` |
| Quá hạn | `'…'` | `String(metrics?.overdueTasks ?? 0)` | `page.tsx:103-106` |

`metrics` is `statsData?.metrics` (`page.tsx:45`). When the query resolves but `metrics` is
`undefined`, each card shows `'0'` (the `?? 0` fallback). `KPICard` itself has no loading-aware
rendering — it just displays whatever `value` string is passed (`KPICard.tsx:22`).

### Zone E / G — Staff table or empty state · `page.tsx:112-127`

Four exclusive states, in evaluation order:

| # | Condition | Renders | Notes |
|---|---|---|---|
| 1 | `statsLoading === true` | **Neither table nor empty-state** — the `!statsLoading` guard is false | Both `<StaffTaskTable>` and `<EmptyState>` are suppressed during initial fetch |
| 2 | `!statsLoading && filteredStaff.length === 0` | `<EmptyState icon="📋" message="Không tìm thấy kết quả — thử đổi bộ lọc hoặc thêm công việc mới" />` | Shown for both truly-empty day and client-side filter yielding zero rows |
| 3 | `!statsLoading && filteredStaff.length > 0` | `<StaffTaskTable rows={filteredStaff} …/>` | Normal state |

`EmptyState` renders a centered flex column: icon (`text-4xl`), message (`text-sm text-muted-fg`),
`py-16` vertical padding (`EmptyState.tsx:7`). It does **not** vary its message for the
"filter-yielded-zero" case vs the "no tasks today" case — the same string is used for both
(`page.tsx:115`).

### Zone F — Expanded task list · `StaffTaskTable.tsx:142-151`, `ExpandedTaskList.tsx:12-33`

Rendered inside a `<tr colSpan={7}>` when `isExpanded === true`. Priority order:

| # | Condition | Renders |
|---|---|---|
| 1 | `isLoading === true` | `"Đang tải công việc…"` — `animate-pulse` text, `text-muted-fg` (`ExpandedTaskList.tsx:14-18`) |
| 2 | `isError === true` | `"Không thể tải công việc. Thử lại sau."` — `text-red-500`, no retry button (`ExpandedTaskList.tsx:21-25`) |
| 3 | `tasks.length === 0` | `"Không có công việc nào trong ngày này."` — `text-muted-fg` (`ExpandedTaskList.tsx:27-31`) |
| 4 | otherwise | Task sub-table (name · priority · time · status · notes) |

### Modal M1 — CreateTaskModal · `page.tsx:130-137`

The modal is conditionally mounted (`{modalOpen && <CreateTaskModal …/>}`). While `mutation.isPending`
is true the submit button shows `'Đang tạo…'` and is `disabled` (`CreateTaskModal.tsx:210-214`).
The cancel button remains active during submission.

---

## Search / Interaction Gating

| Trigger | Fetch behaviour | Notes |
|---|---|---|
| **Date filter change** (`filters.date`) | Re-keys both the stats query (`['admin','tasks','stats', date]`) and the expanded-row query (`['admin','tasks', expandedStaffId, date]`) → immediate new fetch | `page.tsx:31, 39` |
| **Role / status / search filter change** | **No fetch** — client-side `useMemo` over `allStaff` (`page.tsx:49-59`) | No loading state; filter result is instant |
| **Row expand (chevron click)** | Sets `expandedStaffId`; enables the expanded-row query (`enabled: !!expandedStaffId`) → first fetch for that staff+date | `page.tsx:41, 61-63` |
| **Row collapse** | Sets `expandedStaffId` to `null`; query goes back to `enabled: false`; cached result is retained in TanStack Query cache for `staleTime: 15s` | `page.tsx:62` |
| **"Giao việc" / "Thêm công việc" button** | Mounts `CreateTaskModal`; triggers the staff list fetch (`enabled: open`) | `page.tsx:65-73, 131` |
| **1-char search** | No gating — the search filter is pure `useMemo`; no `enabled` guard on the stats query | Unlike the menu page, no minimum-length search gate exists |

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **No task-board-specific `loading.tsx`** | Only `(dashboard)/admin/loading.tsx` covers route-level navigation. If the page segment itself is slow to load, no task-board skeleton is shown — just the generic admin spinner. |
| 2 | **KPI loading uses literal `'…'` string, not a skeleton** | During `statsLoading`, each `KPICard` displays `'…'` as plain bold text (`page.tsx:90,94,99,105`). There is no pulse animation or placeholder shape — minor visual inconsistency vs pages that use skeleton divs. |
| 3 | **Staff table region is entirely absent during `statsLoading`** | The `!statsLoading` guard on `page.tsx:112` means neither `<StaffTaskTable>` nor `<EmptyState>` mounts while the stats query is in flight. The page area below the KPI row is blank during load — no table skeleton, no shimmer rows. |
| 4 | **EmptyState message does not distinguish "no tasks today" from "filter yielded zero"** | Both cases render the same `"Không tìm thấy kết quả…"` string (`page.tsx:115`). A day with genuinely zero tasks assigned shows the same message as a misconfigured role filter. |
| 5 | **Expanded-row error has no retry action** | `ExpandedTaskList` shows `"Không thể tải công việc. Thử lại sau."` (`ExpandedTaskList.tsx:22-24`) but provides no retry button. The user must collapse and re-expand the row to trigger a re-fetch. |
| 6 | **Modal staff select has no loading indicator** | While the `listStaff` query is in flight after modal open, the `<select>` shows only `"Chọn nhân viên…"` with no spinner or disabled state. On a slow connection the user can attempt to submit before the list arrives. Zod validation catches `staffId: ''` but the UX is silent about why the list is empty. |
| 7 | **`CreateTaskModal` is dynamic-imported but has no loading fallback** | `next/dynamic` at `page.tsx:10-12` has no `loading:` option. If the chunk is not yet fetched when `modalOpen` becomes true, the modal briefly does not appear. In practice the chunk is small and pre-cached, but the gap exists. |
| 8 | **No cache detail in this file** | Redis cache behaviour and endpoint detail live in [admin_task_board_be.md](admin_task_board_be.md) per Rule #9 (one model, one home). Short summary: the stats endpoint has no server-side Redis cache; staleTime + refetchInterval are the only freshness controls. |
