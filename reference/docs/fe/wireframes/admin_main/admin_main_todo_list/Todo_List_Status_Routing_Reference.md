# Todo List (Admin) — Status Routing Reference

> Page: `fe/src/app/(dashboard)/admin/todo-list/page.tsx` → renders `TodoPageClient`.
> URL: `http://localhost:3000/admin/todo-list` (admin dashboard, role-gated).
> Entity: `staff_tasks` (task status routing). **This page READS and DISPLAYS task statuses
> but never CHANGES them** — there is no status-advance button and no update endpoint
> (see Concerns). Generated 2026-06-07. Every cell traced to current code.

---

## Live Page Snapshot (http://localhost:3000/admin/todo-list, 2026-06-07)

**NOT captured.** FE dev server is up (`curl http://localhost:3000/ → 200`), but the
Playwright MCP browser profile is locked by an already-running Chrome instance
(`Browser is already in use … mcp-chrome-ef492b3`) — same blocker as the
`client_order_page` run. The page also requires an authenticated admin/manager session.
Snapshot deferred; all sections below are traced from source, not from a render.

---

## Page Layout

| Zone | Component | Title (literal JSX) | When visible |
|---|---|---|---|
| A | `TodoPageHeader` | `Danh sách Công Việc` | Always. `+ Tạo công việc` button only if `canCreate` (role manager/admin). |
| B | `TodoFilterBar` | — (no heading; labels: Nhân viên / Từ ngày / Đến ngày / Trạng thái) | Always. |
| C | Stats board (inline in `TodoPageClient`) | metric cards `Tổng`/`Hoàn thành`/`Đang làm`/`Quá hạn` + per-staff table (`Nhân viên`/`Được giao`/`Xong`/`Tỉ lệ`/`Quá hạn`) | When **no staff selected** (`!staffId`). Skeleton while `statsQuery.isLoading`. |
| D | `TodoTaskTable` (desktop ≥md) / `TodoTaskCard` list (mobile <md) | — (table headers: `Tên`/`Ưu tiên`/`Khung giờ`/`Trạng thái`/`Hành động`) | When **a staff member is selected** (`staffId` truthy). Skeleton while `tasksQuery.isLoading`. |
| E | `CreateEditTaskModal` | `Tạo công việc mới` / `Sửa công việc` | When `modalOpen` (opened by header create button or row ✏️). |

- `staffId = filters.assigned_to ?? null`; `date = filters.start_date ?? today` — `TodoPageClient.tsx:31-32`.
- Zone C ⇄ Zone D are mutually exclusive, toggled solely by whether a staff is selected — `TodoPageClient.tsx:93,157`.

---

## Task DB Statuses (`staff_tasks.status`)

Source: `docs/be/be_code_summary/DB_SCHEMA_SUMMARY.md:356` — `ENUM('pending','in_progress','completed','overdue') DEFAULT 'pending'` (`in_progress` added in migration 012). FE mirror: `fe/src/types/task.ts:1` `TaskStatus`.

| Status | Meaning |
|---|---|
| `pending` | Created, not started. Default on insert. |
| `in_progress` | Staff has started the task (`in_progress` added migration 012). |
| `completed` | Task done (`completed_at` set BE-side). |
| `overdue` | Past `due_at` and not completed. **Stored value** — queried directly as `WHERE status = 'overdue'` (`be/internal/db/tasks.sql.go:53,118`), not derived on read by this page. |

---

## Task Statuses — Which Zone Each Appears In

Rows = each status. Columns = the zones from Page Layout that render status.
Zone A/B/E carry no per-task status, so they are omitted.

| Status | VN label (`TaskStatusBadge`) | Zone C — metric cards | Zone C — per-staff table | Zone D — task list (badge) |
|---|---|---|---|---|
| `pending` | `Chờ` | ✅ counted in `Tổng` only | ❌ (not a column) | ✅ badge `Chờ` |
| `in_progress` | `Đang làm` | ✅ card `Đang làm` (`metrics.inProgressTasks`) | ❌ | ✅ badge `Đang làm` |
| `completed` | `Hoàn thành` | ✅ card `Hoàn thành` (`metrics.completedTasks`) | ✅ `Xong` count + `Tỉ lệ` % | ✅ badge `Hoàn thành` + name `line-through` |
| `overdue` | `Quá hạn` | ✅ card `Quá hạn` (`metrics.overdueTasks`) | ✅ `Quá hạn` col → `TaskStatusBadge status="overdue"` when `hasOverdue`; row tinted red | ✅ badge `Quá hạn` + row tinted red |

- Zone C metric cards = aggregate counts, not per-row badges — `TodoPageClient.tsx:101-106`.
- Zone C per-staff table only renders a status **badge** for `overdue` (via `stat.hasOverdue`); all other staff stats are numeric — `TodoPageClient.tsx:141-145`.
- Zone D renders `TaskStatusBadge` for every task regardless of status — `TodoTaskTable.tsx:61`, `TodoTaskCard.tsx:24`.
- `TaskStatusBadge` has a config entry for all 4 statuses — `TaskStatusBadge.tsx:4-9`.

---

## Action Buttons Per Status

**No status-changing buttons exist on this page.** The only per-row action is edit:

| Status | Button shown | Effect | Next status |
|---|---|---|---|
| any (all 4) | `✏️` (table) / `✏️ Sửa` (card) — only if `canEdit` (manager/admin) | `onEdit(task)` → opens `CreateEditTaskModal` in edit mode | **none** — task status is never advanced from this page |

- `canEdit` is passed as `canCreate` = role ∈ {manager, admin} — `TodoPageClient.tsx:24,166,174`.
- 🚨 Edit is non-functional for updates — see Concern #2.

---

## Zone C (Stats board) — Rules

- Visible only when no staff selected; `statsQuery = useTaskStats(date)` runs **always** (no `enabled` gate) — `TodoPageClient.tsx:44`.
- Metric cards iterate a fixed 4-tuple from `statsQuery.data.metrics`: `totalTasks`, `completedTasks`, `inProgressTasks`, `overdueTasks` — `TodoPageClient.tsx:101-106`.
- Per-staff rows from `statsQuery.data.staffStats`; each row is clickable → `setFilters(f => ({...f, assigned_to: stat.staffId}))`, which switches the page into Zone D for that staff — `TodoPageClient.tsx:127-131`.
- Completion rate color thresholds: ≥80 green, ≥50 yellow, else red — `TodoPageClient.tsx:137`.
- A staff row with `hasOverdue` gets a red row tint — `TodoPageClient.tsx:130`.
- `qualityScore` exists on `StaffTaskStat` (`types/task.ts:35`) but is **not rendered** in any column.

## Zone D (Task list) — Rules

- Renders only when `staffId` truthy; `tasksQuery = useTodoTasks(staffId, date)` is `enabled: !!staffId` — `useTodoTasks.ts:11`.
- `overdue` row → red background; `completed` → name `line-through text-muted-fg` — `TodoTaskTable.tsx:42,45`, `TodoTaskCard.tsx:19,21`.
- Time column: `dueTimeStart [– dueTimeEnd]` if a window exists, else falls back to `dueDate` — `TodoTaskTable.tsx:56-58`.
- Priority shown via local `PRIORITY_LABEL` map (`🔴 Cao` / `🟡 TB` / `🟢 Thấp`) — `TodoTaskTable.tsx:5-9`. Not a status; not sortable.
- No client-side sort or filter applied — list is rendered in BE order as received.

---

## What Information Comes FROM BE (reads)

| Query key | Endpoint | Params | `staleTime` | `enabled` |
|---|---|---|---|---|
| `['admin','staff']` | `GET /admin/staff` (`listStaff`) | — | 60_000 | always |
| `['admin','tasks','stats',date]` | `GET /admin/tasks/stats?date=YYYY-MM-DD` (`getTaskStats`) | `date` | 30_000 | always |
| `['admin','tasks',staffId,date]` | `GET /admin/tasks?staffId=&date=YYYY-MM-DD` (`getStaffTasks`) | `staffId`, `date` | 15_000 | `!!staffId` |

Endpoints traced to `fe/src/features/admin/admin.api.ts:283-290`; hooks `useTodoTasks.ts:7-22`; staff query `TodoPageClient.tsx:35-39`.

**Fields received:**

- `getStaffTasks` → `Task[]` (`types/task.ts:5-18`): `id`, `staffId`, `name`, `description?`, `priority`, `dueDate` (`YYYY-MM-DD`), `dueTimeStart` (`HH:mm`, may be ""), `dueTimeEnd`, `status`, `notes?`, `createdAt`, `updatedAt`.
- `getTaskStats` → `StaffTaskStatsResponse` (`types/task.ts:39-42`):
  - `metrics: DailyTaskMetrics` = `date`, `totalTasks`, `completedTasks`, `inProgressTasks`, `overdueTasks`.
  - `staffStats: StaffTaskStat[]` = `staffId`, `staffName`, `role`, `assignedCount`, `completedCount`, `completionRate` (0–100), `qualityScore` (0–5.0), `hasOverdue`.
- `listStaff` → `{ data: Staff[] }`; page uses `s.id` + `s.full_name` only for the staff dropdowns — `TodoPageClient.tsx:40-41`, `CreateEditTaskModal.tsx:100-102`.

No client-side enrichment/joins — staff names in Zone C come from the stats payload (`stat.staffName`), not from a join with `listStaff`.

---

## What Information Is SENT TO BE (writes)

Exactly **one** write — task creation.

### `POST /admin/tasks` (`createTask`)

Body type `CreateTaskPayload` (`types/task.ts:51-60`), assembled in `handleModalSubmit` (`TodoPageClient.tsx:61-80`):

```json
{
  "staffId":      "<uuid>",
  "name":         "Lau sàn khu bếp",
  "priority":     "high | medium | low",
  "dueDateTime":  "2026-06-07T09:00:00Z",
  "dueTimeStart": "09:00",
  "dueTimeEnd":   "11:00",
  "description":  "optional",
  "notes":        "optional"
}
```

- `dueDateTime` is built as `` `${values.dueDate}T${values.dueTime}:00Z` `` — `TodoPageClient.tsx:67`.
- Optional fields collapse to `undefined` when empty (`values.x || undefined`) — `TodoPageClient.tsx:73-76`.
- Success: `onSuccess` closes the modal (`setModalOpen(false)`) — `TodoPageClient.tsx:78`; the mutation also invalidates `['admin','tasks',task.staffId,task.dueDate]` and `['admin','tasks','stats']` — `useTodoTasks.ts:29-30`.
- No error handling beyond default mutation state; no toast and no error-code branch on this page.

**No update / complete / delete / status-advance request is sent.** BE exposes only the 3 task routes (`be/cmd/server/main.go:307-309`); `admin.api.ts` defines only `getTaskStats`, `getStaffTasks`, `createTask`.

---

## How It Manages Data CROSS-PAGE

| Store | localStorage key | Persisted? | What it carries | File |
|---|---|---|---|---|
| `useAuthStore` | (token in memory only) | role/user not persisted to LS for tokens (per `MASTER §6`) | reads `user.role` → gates `canCreate` | `fe/src/features/auth/auth.store.ts` |

- The page keeps all task filters/UI state in React `useState` (`filters`, `modalOpen`, `editTask`) — `TodoPageClient.tsx:26-28`; nothing is persisted to `localStorage` and nothing is handed off to another page.
- TanStack Query cache (`['admin','tasks',...]`, `['admin','tasks','stats',...]`) is the only cross-component state; invalidation after create re-fetches both the stats board and the per-staff list — `useTodoTasks.ts:28-31`.
- Cross-page link: the per-staff stats row click does **not** navigate — it stays on the page and swaps Zone C → Zone D via `setFilters` — `TodoPageClient.tsx:131`.
- End-to-end loop: fetch stats (always) → optionally pick staff (row click or dropdown) → fetch that staff's tasks → create task via modal → invalidate → re-fetch. No navigation, no handoff.

---

## Concerns

1. ⚠️ **Status filter dropdown is dead.** `TodoFilterBar` lets the user pick `Trạng thái`
   (`all`/`Chờ`/`Hoàn thành`/`Quá hạn`), but `TodoPageClient` calls
   `useTodoTasks(staffId, date)` — `filters.status` is **never** passed to the query or the
   endpoint. The dropdown has no effect on results. (`TodoPageClient.tsx:47`,
   `useTodoTasks.ts:7`, `admin.api.ts:286`.) Note it also omits `in_progress` as an option.

2. 🚨 **Edit mode silently creates a duplicate.** Row ✏️ opens `CreateEditTaskModal` in
   `edit` mode, but `handleModalSubmit` **always** calls `createTask.mutate` regardless of
   mode (`TodoPageClient.tsx:68`). There is no `updateTask` in `admin.api.ts` and no
   `PATCH/PUT /admin/tasks/:id` route in BE. Editing an existing task POSTs a new one.

3. ⚠️ **No way to advance task status from this page.** `pending → in_progress → completed`
   transitions (and `overdue`) are set elsewhere (BE / staff task board); this admin page
   only reads them. If the only status-change surface is the staff task board, confirm an
   admin can actually drive a task to completion.

4. ⚠️ **Date range is single-date in effect.** `end_date` is collected and only used for a
   90-day span validation (`TodoFilterBar.tsx:21-28`); the actual query uses
   `date = filters.start_date ?? today` only (`TodoPageClient.tsx:32`). The "Đến ngày" input
   does not widen the result set.

5. ⚠️ **`page` filter + `qualityScore` unused.** `TodoTaskFilter.page` is set to 1 but no
   pagination is wired; `StaffTaskStat.qualityScore` is fetched but never rendered.

---

## Cross-Page Status Notes

- `staff_tasks.status` enum (`pending`/`in_progress`/`completed`/`overdue`) and its VN labels
  (`Chờ`/`Đang làm`/`Hoàn thành`/`Quá hạn`) are shared with the **Staff Task Board** (A9) via
  the single-source `TaskStatusBadge.tsx`. Any board reference must use the identical 4 values
  and labels. This is **not** the order-status enum (X1) — keep them separate.
