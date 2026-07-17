# Staff Task Board — Status Routing Reference

> **Route:** `/admin/staff/task-board` · **Entry:** `fe/src/app/(dashboard)/admin/staff/task-board/page.tsx`
> Model: `docs/fe/wireframes/admin_main/admin_overview/Admin_Overview_Status_Routing_Reference.md`
> Every cell below is traced to current code (verified 2026-06-07). `❓ UNVERIFIED` marks any claim not pinned to a line.

> **⚠️ This page is a STAFF-PERFORMANCE board, not a task-status board.**
> The grid rows are **staff members** (one row per person), not tasks. Task `status`
> only appears inside the **lazy-loaded expanded sub-table (Zone F)** and as the four
> KPI counters (Zone D). There is **no per-status column/lane routing** — the four
> statuses are not split into board columns. The board does **not** mutate task status
> (no advance/complete buttons); the only write is *create task*. See the matrix below.

---

## Live Page Snapshot (`http://localhost:3000/admin/staff/task-board`, 2026-06-07)

Captured authenticated as `admin` / `Admin@123` (auth store is memory-only → direct nav
redirects to `/login` first). Screenshot: `staff-task-board.png`.

- **Header:** "Quản trị hệ thống" + light/dark toggle + left admin nav.
- **Zone B — Breadcrumb:** `Admin › Nhân viên › Bảng công việc` + orange **"Thêm công việc"** button (top-right).
- **Zone C — Filters:** date picker (`2026-06-07`), role `<select>` (Tất cả vai trò / Bếp / Thu ngân / Phục vụ / Đầu bếp / Nhân viên), status `<select>` (Tất cả trạng thái / Chờ / Đang làm / Hoàn thành / Quá hạn), search box "Tìm tên nhân viên…".
- **Zone D — KPI row (4 cards):** `Tổng công việc hôm nay = 0`, `Hoàn thành = 0 ✓`, `Đang thực hiện = 0`, `Quá hạn = 0 !`. (All 0 — no tasks seeded for today.)
- **Zone E — Staff table** with 5 seed rows, all metrics 0:
  | Nhân viên | Vai trò | Được giao | Hoàn thành | Tỷ lệ % | Chất lượng |
  |---|---|---|---|---|---|
  | Đầu Bếp | Đầu bếp | 0 | 0 | 0% | ★ 0.0 / 5.0 |
  | Nhân Viên | Nhân viên | 0 | 0 | 0% | ★ 0.0 / 5.0 |
  | Quản Lý | Quản lý | 0 | 0 | 0% | ★ 0.0 / 5.0 |
  | Quản Trị Viên | Admin | 0 | 0 | 0% | ★ 0.0 / 5.0 |
  | Thu Ngân | Thu ngân | 0 | 0 | 0% | ★ 0.0 / 5.0 |
  Each row: **"Xem công việc"** (ghost) + **"Giao việc"** (orange) + a chevron expander.
- **Zone F — expanded sub-table:** clicking "Xem công việc" on *Đầu Bếp* lazy-loaded the row's task list, which rendered the empty state **"Không có công việc nào trong ngày này."** (no tasks for the date).
- **Empty/loading:** KPI cards show `…` while `statsLoading`; table replaced by `EmptyState` (📋 "Không tìm thấy kết quả…") when `filteredStaff.length === 0`.
- **Console:** 1 error only — `GET http://localhost:8080/api/v1/auth/me → 401` (benign; the api-client refresh-token flow, fires on every authenticated page). No task-endpoint errors; stats/staff data loaded fine.

---

## Page Layout

| Zone | Component | Title (verbatim) | When visible |
|---|---|---|---|
| B | `BreadcrumbPageHeader` | `Admin › Nhân viên › Bảng công việc` (+ btn "Thêm công việc") | always |
| C | `StaffTaskFilterBar` | — (no heading) | always |
| D | `KPICard` ×4 | "Tổng công việc hôm nay" · "Hoàn thành" · "Đang thực hiện" · "Quá hạn" | always (show `…` while loading) |
| E | `StaffTaskTable` | — (table headers only) | when `!statsLoading && filteredStaff.length > 0` |
| F | `ExpandedTaskList` (inside E) | — (sub-table headers) | only for the one expanded staff row (`expandedId === row.staffId`) |
| G | `EmptyState` | "Không tìm thấy kết quả — thử đổi bộ lọc hoặc thêm công việc mới" | when `!statsLoading && filteredStaff.length === 0` |
| M1 | `CreateTaskModal` (dynamic import) | "Tạo công việc mới" | when `modalOpen` (opened by "Thêm công việc" or row "Giao việc") |

Source: [page.tsx](../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L75-L138).

---

## Task DB Statuses (`staff_tasks.status`)

| Status | Meaning |
|---|---|
| `pending` | Default on create — task assigned, not started. |
| `in_progress` | Staff has started the task (added in migration 012). |
| `completed` | Task finished (sets `completed_at`). |
| `overdue` | Past `due_at` without completion. |

Source of truth: `docs/be/be_code_summary/DB_SCHEMA_SUMMARY.md` §`staff_tasks` (`ENUM('pending','in_progress','completed','overdue')`). FE mirror: [types/task.ts:1](../../../../fe/src/types/task.ts#L1) `TaskStatus`.

---

## Task Statuses — Which Zone Each Appears In

> Rows = task status. Columns = page zones. A status appears in a zone **only if** that
> zone reads/renders it. There is **no column-per-status board** — every status that
> renders, renders inside the **same** Zone F sub-table (as a `TaskStatusBadge`).

| Status | VN label (badge) | D — KPI card | E — staff table | F — expanded list | C — status filter option |
|---|---|---|---|---|---|
| `pending` | Chờ | ❌ (no dedicated card) | ❌ (rows are staff, not tasks) | ✅ badge | ✅ "Chờ" |
| `in_progress` | Đang làm | ✅ "Đang thực hiện" (`metrics.inProgressTasks`) | ❌ | ✅ badge | ✅ "Đang làm" |
| `completed` | Hoàn thành | ✅ "Hoàn thành" (`metrics.completedTasks`) | ❌ (only aggregate `completedCount`) | ✅ badge | ✅ "Hoàn thành" |
| `overdue` | Quá hạn | ✅ "Quá hạn" (`metrics.overdueTasks`) | ⚠️ row-level only — `hasOverdue` tints the row orange + shows `!`, **not** a status badge | ✅ badge | ✅ "Quá hạn" |
| — | "Tổng công việc hôm nay" | ✅ `metrics.totalTasks` (all statuses summed) | — | — | "Tất cả trạng thái" |

Notes:
- KPI counts come from `statsData.metrics` ([page.tsx:88-108](../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L88-L108)); there is no KPI card for `pending`.
- The status badge labels are the single source in [TaskStatusBadge.tsx:4-9](../../../../fe/src/components/shared/TaskStatusBadge.tsx#L4-L9). The filter dropdown labels in [StaffTaskFilterBar.tsx:19-25](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskFilterBar.tsx#L19-L25) match them verbatim.

---

## Action Buttons Per Status — (NONE)

**This page has no status-changing buttons.** No component advances or mutates
`staff_tasks.status`. The only buttons are navigation/CRUD-create:

| Button (verbatim) | Component | Effect | Status change? |
|---|---|---|---|
| "Thêm công việc" | `BreadcrumbPageHeader` | opens `CreateTaskModal` (no pre-selected staff) | ❌ creates a task (defaults `pending` on BE) |
| "Giao việc" | `StaffTaskTable` row | opens `CreateTaskModal` pre-filled with that `staffId` | ❌ creates a task |
| "Xem công việc" / "Ẩn" | `StaffTaskTable` row | toggles Zone F expansion (`onToggleExpand`) | ❌ pure UI |
| chevron (▸/▾) | `StaffTaskTable` row | same toggle as above | ❌ pure UI |
| "Tạo công việc" / "Hủy" | `CreateTaskModal` | submit create / close | ❌ create only |

> A new task's status is **not chosen here** — `CreateTaskModal` has no status field; the BE defaults it to `pending`. To advance a task's status (pending → in_progress → completed) you must use a different surface (todo-list / staff-side), not this board.

Source: [StaffTaskTable.tsx:122-140](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L122-L140), [CreateTaskModal.tsx:15-25](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L15-L25).

---

## Zone Rules

### Zone D — KPI cards
- `totalTasks`, `completedTasks`, `inProgressTasks`, `overdueTasks` read from `statsData.metrics`; show `'…'` while `statsLoading`, else `?? 0`. ([page.tsx:88-108](../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L88-L108))
- Card badges are decorative: "Hoàn thành" `✓ success`, "Đang thực hiện" `secondary`, "Quá hạn" `! danger`.

### Zone E — `StaffTaskTable`
- **One row per staff member**, not per task. Columns: Nhân viên · Vai trò · Được giao (`assignedCount`) · Hoàn thành (`completedCount`) · Tỷ lệ % (`completionRate`) · Chất lượng (`qualityScore`) · Thao tác.
- **Row order = the order returned by the API** (`statsData.staffStats`) after client filter; no client-side sort applied. ([page.tsx:46-59](../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L46-L59))
- **Overdue tint:** rows with `hasOverdue === true` get an orange background + a bold `!` after the name. ([StaffTaskTable.tsx:80-98](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L80-L98))
- **Tỷ lệ % color thresholds:** ≥80 green · ≥50 amber · else red. ([StaffTaskTable.tsx:111-117](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L111-L117))
- **Chất lượng:** `qualityScore.toFixed(1)` as `★ N / 5.0`; if `null` → `★ —`. ([StaffTaskTable.tsx:29-39](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L29-L39))
- **Role badge** label+color from local `ROLE_LABELS`/`ROLE_COLORS` maps; unknown role falls through to raw string + neutral chip. ([StaffTaskTable.tsx:9-27](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L9-L27))

### Zone F — `ExpandedTaskList` (lazy)
- Mounts only for the single expanded row; fetched on demand (`enabled: !!expandedStaffId`). Toggling another row swaps `expandedStaffId` (only one open at a time — [page.tsx:61-63](../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L61-L63)).
- States: loading → "Đang tải công việc…"; error → "Không thể tải công việc. Thử lại sau."; empty → "Không có công việc nào trong ngày này."
- Columns: Tên công việc · Ưu tiên (`TaskPriorityBadge`) · Giờ (`dueTimeStart–dueTimeEnd`, or `dueTimeStart`, or `—`) · Trạng thái (`TaskStatusBadge`) · Ghi chú (`notes || '—'`, truncated). ([ExpandedTaskList.tsx:48-66](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx#L48-L66))

### Zone C — `StaffTaskFilterBar` (client-side only)
- All four filters are **client-side except `date`**: `role`, `status`, `search` filter `allStaff` in a `useMemo` with **no extra API call**. Only changing `date` triggers a refetch (it's in the query key). ([page.tsx:48-59](../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L48-L59))
- ⚠️ The status filter is **degenerate**: the only status value that does anything is `overdue` (filters on `s.hasOverdue`). `pending` / `in_progress` / `completed` selections **fall through and filter nothing** — because rows are staff, not tasks, and `StaffTaskStat` carries no per-status flag besides `hasOverdue`. ([page.tsx:52-55](../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L52-L55))
- `search` matches `staffName` case-insensitively; `role` matches `s.role` exactly.

---

## What Information Comes FROM BE (reads)

| Query key | Endpoint | Params | `staleTime` | `enabled` / refetch |
|---|---|---|---|---|
| `['admin','tasks','stats', date]` | `GET /admin/tasks/stats` | `?date=<YYYY-MM-DD>` | 30 s | always · `refetchInterval: 60 s` |
| `['admin','tasks', expandedStaffId, date]` | `GET /admin/tasks` | `?staffId=<id>&date=<YYYY-MM-DD>` | 15 s | `enabled: !!expandedStaffId` |
| `['admin','staff']` | `GET …listStaff` | — | 5 min | `enabled: open` (only inside `CreateTaskModal`) |

Sources: [page.tsx:30-43](../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L30-L43), [admin.api.ts:283-290](../../../../fe/src/features/admin/admin.api.ts#L283-L290), [CreateTaskModal.tsx:39-45](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L39-L45).

**Fields received — `getTaskStats` → `StaffTaskStatsResponse`** (`r.data.data`):
- `metrics`: `date`, `totalTasks`, `completedTasks`, `inProgressTasks`, `overdueTasks`
- `staffStats[]`: `staffId`, `staffName`, `role`, `assignedCount`, `completedCount`, `completionRate` (0–100), `qualityScore` (0–5.0), `hasOverdue`

**Fields received — `getStaffTasks` → `Task[]`:**
- `id`, `staffId`, `name`, `description?`, `priority`, `dueDate`, `dueTimeStart`, `dueTimeEnd`, `status`, `notes?`, `createdAt`, `updatedAt`

Source types: [types/task.ts:5-42](../../../../fe/src/types/task.ts#L5-L42). No client-side enrichment/joins — rendered as received.

---

## What Information Is SENT TO BE (writes)

Exactly **one** mutation on this page: **create task** (`POST /admin/tasks`).

`createTask(payload)` → `api.post('/admin/tasks', body)` ([admin.api.ts:289-290](../../../../fe/src/features/admin/admin.api.ts#L289-L290)). Body built in [CreateTaskModal.tsx:80-89](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L80-L89) from the RHF form (no shared payload builder — this is a plain admin form, not a cart→order path):

```json
{
  "staffId":      "<uuid from select>",
  "name":         "<tên công việc>",
  "description":  "<optional>",
  "priority":     "high | medium | low",
  "dueDateTime":  "2026-06-07T08:00:00Z",   // `${dueDate}T${dueTime}:00Z`
  "dueTimeStart": "<HH:mm optional>",
  "dueTimeEnd":   "<HH:mm optional>",
  "notes":        "<optional>"
}
```

- **No `status` field is sent** — BE defaults the new task to `pending`.
- **Validation (Zod):** `staffId`, `name` (≤200), `priority`, `dueDate`, `dueTime` required; rest optional. ([CreateTaskModal.tsx:15-25](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L15-L25))
- **On success:** invalidates `['admin','tasks','stats', task.dueDate]` and `['admin','tasks', task.staffId, task.dueDate]`, toasts "Đã tạo công việc thành công", closes modal. ([CreateTaskModal.tsx:90-97](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L90-L97))
- **On error:** generic toast "Không thể tạo công việc — thử lại" (no specific error-code handling). ([CreateTaskModal.tsx:98-100](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L98-L100))

> ⚠️ Cache-invalidation skew: `useTodoTasks.useCreateTask` (the hook in `fe/src/hooks/`) invalidates by `task.staffId, task.dueDate`, but the **modal on this page uses its own inline `useMutation`** ([CreateTaskModal.tsx:79](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L79)) — it does **not** call the shared hook. Both invalidate the same keys, so the board refreshes correctly; just note there are two create paths.

---

## How It Manages Data CROSS-PAGE

| Store | localStorage key | Persisted? | Carries across pages | File |
|---|---|---|---|---|
| `useAuthStore` | — | **No** (memory only — `accessToken` never in localStorage) | JWT access token for the axios `Authorization: Bearer` header | `fe/src/features/auth/auth.store.ts` |

- This page holds **no Zustand state of its own** — all UI state (`filters`, `expandedStaffId`, `modalOpen`, `defaultStaffId`) is local `useState` in `page.tsx`, lost on navigation.
- **No `localStorage` handoff** and **no cross-page params** — the board is self-contained; data lives entirely in the TanStack Query cache (keyed by `date` / `staffId`).
- **Auth:** axios request interceptor injects `Bearer <accessToken>` from `useAuthStore.getState()`; a 401 triggers the refresh flow, else `clearAuth()`. ([api-client.ts:11-31](../../../../fe/src/lib/api-client.ts#L11-L31)) Because the token is memory-only, a hard reload logs you out → redirect to `/login` (observed in the live snapshot).
- **End-to-end loop:** pick `date`/filters → `getTaskStats(date)` fills KPIs + staff rows → expand a row → `getStaffTasks(staffId,date)` fills Zone F → "Giao việc"/"Thêm công việc" → `POST /admin/tasks` → invalidate stats+row queries → board re-fetches in place.

---

## Concerns

1. **🚨 Status filter is mostly dead.** Selecting Chờ / Đang làm / Hoàn thành in Zone C filters nothing (only `overdue` works), because `StaffTaskStat` has no per-status flag and rows are staff, not tasks. The dropdown promises filtering it cannot deliver. ([page.tsx:52-55](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/../page.tsx#L52-L55))
2. **⚠️ Name mismatch — "board" with no columns.** Despite the name "Staff Task Board", there is no Kanban-style column-per-status layout; it's a staff-performance grid with a lazy per-staff task sub-list. The task `status` enum never drives layout.
3. **⚠️ No nav link.** The left admin nav "Công việc" points to `/admin/todo-list`, not this page; the task board is only reachable via breadcrumb/deep URL. ❓ Confirm whether this is intentional. (observed in live snapshot nav)
4. **⚠️ Two create paths.** `CreateTaskModal` uses an inline `useMutation` instead of the shared `useCreateTask` hook; both invalidate identical keys so behaviour matches, but it's duplicate logic. ([CreateTaskModal.tsx:79](../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L79) vs [useTodoTasks.ts:24-33](../../../../fe/src/hooks/useTodoTasks.ts#L24-L33))
5. **ℹ️ Benign console error:** `GET /api/v1/auth/me → 401` on load (refresh-token pattern, fires on all authed pages).
