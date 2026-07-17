# Admin Task Board — Doc vs. Code (Detailed 5-Area Audit)

> **Scope:** a read-only doc-vs-code audit of the `/admin/staff/task-board` doc-set against the running
> FE/Go code on branch `experience_claude.md_system_1_test_iphon2_change_code`. Five axes: ① component
> visuals · ② cross-component dataflow · ③ cross-page dataflow · ④ loading behaviour · ⑤ FE⇄BE data
> model. **Code wins** — every "Code reality" cell is traced to `file:line`; nothing recalled.
> **Read-only — no app code and no page doc-set was changed.** Produced by 2 parallel Sonnet audit
> agents (Areas 1–2) + 3 areas traced inline by the orchestrator (Areas 3–5, after the area agents hit
> a session limit); all 🔴 re-verified by hand. Date: 2026-06-24.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals | **Wireframe ASCII drifted hard** — KPI labels, filter bar, table columns all wrong | 3 | 5 | 3 |
| 2 — Cross-component dataflow | **Highly accurate** — every state/query/key matches; 1 subtle invalidation nuance | 0 | 3 | 3 |
| 3 — Cross-page dataflow | **Accurate; resolves its own ❓ into a confirmed code bug** | 1 | 2 | 2 |
| 4 — Loading behaviour | **One real contradiction** (table chrome renders during load, doc says blank) | 1 | 2 | 2 |
| 5 — FE⇄BE data model | **Source-faithful; documents its own bugs** — only route lines + a miscount stale | 1 | 4 | 3 |
| **Total** | | **6** | **16** | **13** |

The behavioural doc-set (`_be.md`, `_crosscomponent`, `_crosspage`, `_loading`) is unusually accurate —
it documents the code *including* its 4 bugs (peer of `customer_combo_detail` / `admin_combos`). **The
drift is concentrated in the hand-drawn `admin_task_board.md` wireframe ASCII** (Area 1) and one wrong
claim in `_loading.md` (Area 4). The headline product problem — the entire stats half of the board is
permanently zero — is a CODE bug the doc already flags correctly.

---

## 🔴 RAISE-MY-VOICE Headline Findings (hand-verified)

1. **🔴 CODE BUG (doc-accurate) — task status is write-once `pending`; the whole stats surface is dead.**
   `CreateStaffTask` hard-codes `status='pending'` ([tasks.sql.go:16](../../../../../be/internal/db/tasks.sql.go#L16)); `querier.go` exposes **no UPDATE** on `staff_tasks`
   ([querier.go:28,42,56-58](../../../../../be/internal/db/querier.go#L28) — `CreateStaffTask` + 4 reads); grep for any
   `UPDATE/DELETE/PATCH staff_tasks` in `be/` returns nothing; no route advances status
   ([main.go:320-322](../../../../../be/cmd/server/main.go#L320) is the complete 3-route set); no overdue
   sweep job. ⇒ on a live DB "Hoàn thành" / "Đang thực hiện" / "Quá hạn" KPIs, `completionRate`,
   `qualityScore`, and `hasOverdue` are **permanently 0/false**. Logged in
   [TASK_BOARD_BUGS.md](TASK_BOARD_BUGS.md) Bug 1 — not drift, the doc is correct.

2. **🔴 DOC DRIFT — Zone D KPI cards: labels are wrong and a card that doesn't exist is drawn.** The
   wireframe ASCII draws four cards `Tổng việc · Chờ làm · Đang làm · Hoàn thành`
   ([admin_task_board.md:19-20](admin_task_board.md)). The code renders `Tổng công việc hôm nay ·
   Hoàn thành · Đang thực hiện · Quá hạn` ([page.tsx:89,93,99,104](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L89)).
   There is **no "Chờ làm" (pending) card**, and the **"Quá hạn" card is undrawn**. Every label is wrong.

3. **🔴 DOC DRIFT — Zone C filter bar: doc draws 1 control, code renders 4.** ASCII shows only
   `[📅 date ▾]` ([admin_task_board.md:17](admin_task_board.md)); `StaffTaskFilterBar` renders date +
   role `<select>` + status `<select>` + name search ([StaffTaskFilterBar.tsx:31-58]; corroborated by
   the 4-field `TaskBoardFilters` [task.ts:44-49](../../../../../fe/src/types/task.ts#L44) and the
   role/status/search `useMemo` [page.tsx:49-59](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L49)).

4. **🔴 DOC DRIFT — Zone E staff table: doc draws 2 columns, code renders 7 (incl. the fabricated
   "Chất lượng").** ASCII draws `▸ chef01  5 việc  2 hoàn thành` ([admin_task_board.md:23-27](admin_task_board.md));
   `StaffTaskTable` renders **7** columns: Nhân viên · Vai trò · Được giao · Hoàn thành · Tỷ lệ % ·
   Chất lượng · Thao tác ([StaffTaskTable.tsx:64-71](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L64)),
   with per-row Xem công việc/Ẩn + Giao việc buttons (`:122-139`) and an orange overdue highlight (`:82-97`).
   The "Chất lượng ★ X/5.0" column (`QualityStars` `:29-39`) renders the **fabricated** quality score
   (Bug 2) that the ASCII omits entirely.

5. **🔴 DOC DRIFT — loading.md is wrong about the table region during initial fetch.** `_loading.md`
   §"Zone E/G" state #1 + Flag 3 claim that while `statsLoading` is true **neither the table nor the
   empty-state mounts** and "the page area below the KPI row is blank during load." In code the guard is
   `{!statsLoading && filteredStaff.length === 0 ? <EmptyState/> : <StaffTaskTable rows={filteredStaff}/>}`
   ([page.tsx:112-127](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L112)). While
   loading, `!statsLoading` is false → the **else** branch renders `<StaffTaskTable rows={[]}/>`, which
   always renders its 7-column `<thead>` ([StaffTaskTable.tsx:62-73](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L62)).
   So the table **header chrome shows during load** — not a blank area.

6. **🔴 CODE BUG (cross-page; doc's ❓ now confirmed) — todo-list "Cập nhật" silently creates a
   duplicate row.** The doc inferred this as ❓ UNVERIFIED; re-verified here:
   `TodoPageClient.handleModalSubmit` calls `createTask.mutate(...)` regardless of edit/create mode
   ([TodoPageClient.tsx:68](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx#L68),
   mode wired at `:187`), the modal button reads **"Cập nhật"** ([CreateEditTaskModal.tsx:187](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/CreateEditTaskModal.tsx#L187)),
   yet grep finds **no `updateTask`/`PATCH /admin/tasks/:id` anywhere in `fe/src`**. Clicking "Cập nhật"
   inserts a NEW `staff_tasks` row. Same root as Bug 1 (no UPDATE path).

---

## Dead / Unreachable Code Found

- **`page.tsx:52-55` status filter is wholly dead** — only the `overdue` branch is implemented (Bug 4),
  and `hasOverdue` is itself always false (Bug 1). `StaffTaskStat` has no per-row status field
  ([task.ts:28-37](../../../../../fe/src/types/task.ts#L28)) to power pending/in_progress/completed.
- **`task_service.go:200-201`** — the `if err == sql.ErrNoRows` branch after an INSERT can never fire
  (`ExecContext` never returns `ErrNoRows`); a FK rejection falls through to `ErrInternalError` → 500 (Bug 3).
- **`CreateTaskModal.tsx:103` `if (!open) return null`** — unreachable; the parent conditionally mounts
  the modal `{modalOpen && <CreateTaskModal …/>}` ([page.tsx:130](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L130)), so `open` is always true when mounted.
- **`UpdateTaskPayload` type** ([task.ts:77-82](../../../../../fe/src/types/task.ts#L77)) has no consumer
  — there is no `updateTask` API function anywhere (grep). A vestige of the absent UPDATE path.
- **todo-list `CreateEditTaskModal` "edit" mode** ([CreateEditTaskModal.tsx:25,40-52,187](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/CreateEditTaskModal.tsx#L25))
  pre-fills from an existing task but has no update path → produces 🔴 #6 (duplicate row).

---

## Area 1 — Component Visuals

**Verdict:** the `admin_task_board.md` wireframe ASCII has drifted hard — 3 of 5 zones (C, D, E) are
materially wrong, plus several copy/label/segment mismatches. The Zones table also omits Zone F.

| Component/Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Zone B — CTA label | `[+ Giao việc]` | `Thêm công việc` ([BreadcrumbPageHeader.tsx:28]) | 🟡 | Fix ASCII to `[+ Thêm công việc]` |
| Zone B — breadcrumb | `Nhân viên / Bảng công việc` (2 segs) | `['Admin','Nhân viên','Bảng công việc']` ([page.tsx:79](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L79)) | 🟢 | Add `Admin /` prefix |
| Zone C — filter controls | one date picker only | date + role + status + name search ([StaffTaskFilterBar.tsx:31-58]; `TaskBoardFilters` [task.ts:44-49](../../../../../fe/src/types/task.ts#L44)) | 🔴 | Draw all 4 controls |
| Zone D — KPI labels | `Tổng việc · Chờ làm · Đang làm · Hoàn thành` | `Tổng công việc hôm nay · Hoàn thành · Đang thực hiện · Quá hạn` ([page.tsx:89,93,99,104](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L89)) | 🔴 | Rewrite all 4 card labels; delete phantom "Chờ làm" |
| Zone E — table columns | 2 cols (`N việc`, `M hoàn thành`) | 7 cols: Nhân viên/Vai trò/Được giao/Hoàn thành/Tỷ lệ %/Chất lượng/Thao tác ([StaffTaskTable.tsx:64-71](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L64)) | 🔴 | Redraw the 7-col table |
| Zone E — "Chất lượng" stars | not drawn | `QualityStars` ★ X/5.0 ([StaffTaskTable.tsx:29-39,120](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L29)) | 🟡 | Add column (note: fabricated value, Bug 2) |
| Zone E — row actions | not drawn | Xem công việc/Ẩn + Giao việc per row ([StaffTaskTable.tsx:122-139](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L122)) | 🟡 | Add action column |
| Zone E — overdue highlight | not drawn | `bg-orange-50` + `!` when `hasOverdue` ([StaffTaskTable.tsx:82-97](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L82)) | 🟢 | Note in doc (dead until Bug 1) |
| Zone F — expanded columns | name · status · time (3) | Tên · Ưu tiên · Giờ · Trạng thái · Ghi chú (5) ([ExpandedTaskList.tsx:39-44](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx#L39)) | 🟡 | Add Ưu tiên + Ghi chú; time is a range `HH:MM–HH:MM` (`:55-57`) |
| Zone F — Zones table row | absent | `ExpandedTaskList` is a real Zone F | 🟡 | Add Zone F row to the Zones table |
| Zone F — "inline retry" | Key Interactions says error shows inline retry | error text, **no retry button** ([ExpandedTaskList.tsx:20-25](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx#L20)) | 🟡 | Drop the claim (or add a retry button — code change) |
| Zone G — EmptyState | "when no tasks for the day" | fires on `filteredStaff.length===0` after client filter ([page.tsx:112-116](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L112)) | 🟢 | Reword: zero **filtered** rows |
| Modal M1 | not drawn | 9-field modal ([CreateTaskModal.tsx:117-217](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L117)) | 🟡 | Add a modal zone to ASCII |

**Verified-matching:** Zone D/E data sources (`metrics`/`staffStats` from `getTaskStats`,
[page.tsx:45-46](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L45)); KPICard +
EmptyState shared atoms render as described.

---

## Area 2 — Cross-Component Data Flow

**Verdict:** the most accurate file in the set — every `useState` shape, query key, staleTime, `useMemo`,
prop interface, and handler matches the code exactly. Only one undocumented detail and one nuance.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| All state + query keys | `page.tsx:19-43`, exact shapes/keys/staleTimes | exact match ([page.tsx:19-43](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L19)) | 🟢 | none |
| Invalidation keys on `task.dueDate` not `filters.date` | flagged as "known subtle bug" (KPIs may not refresh) | confirmed ([CreateTaskModal.tsx:91-93](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L91)) — but behaviour is arguably **correct**: a task created for another date shouldn't refresh today's stats | 🟡 | Soften the doc: not clearly a bug; `useTodoTasks.useCreateTask` uses prefix `['admin','tasks','stats']` ([useTodoTasks.ts:30](../../../../../fe/src/hooks/useTodoTasks.ts#L30)) — broader, also fine |
| `CreateTaskModal` is `next/dynamic` | not mentioned | code-split via `next/dynamic` ([page.tsx:10-12](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L10)) | 🟡 | Note first-open lazy chunk |
| Bug 4 — status filter dead | only `overdue` honoured | confirmed ([page.tsx:52-55](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L52)) | 🟡 | (see Area 5) |
| `onSuccess` no-op + conditional mount + all handlers | exact lines | all confirmed ([page.tsx:61-73,130-137](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L61)) | 🟢 | minor off-by-1 cite (`onSuccess` opens `:90` not `:91`) |

**Verified-matching:** the "no Zustand, invalidation-as-broadcast" mechanism is exactly as documented;
`ExpandedTaskList`/`StaffTaskFilterBar` are pure-props with no queries of their own.

---

## Area 3 — Cross-Page Data Flow

**Verdict:** accurate. No SSE/WS/localStorage in the task domain (grep-confirmed); the only durable
output is a `staff_tasks` MySQL row; both consumer pages are manager+ gated; staff have no read surface.
The doc's two ❓ are now resolved — one into a confirmed code bug.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| No realtime / no localStorage | none in task domain | grep `EventSource\|WebSocket\|localStorage` in task-board + `useTodoTasks` = 0 | 🟢 | none |
| No task surface for KDS/POS/cashier | grep-empty | confirmed: no task ref in `(dashboard)/{kds,cashier,pos}` (grep) | 🟢 | product gap, doc-accurate |
| ❓ todo-list "edit" → duplicate | inferred, UNVERIFIED | **CONFIRMED** code bug — `createTask.mutate` regardless of mode ([TodoPageClient.tsx:68,187](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx#L68)); no `updateTask` in `fe/src` (grep); button "Cập nhật" ([CreateEditTaskModal.tsx:187](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/CreateEditTaskModal.tsx#L187)) | 🔴 | Remove ❓; this is headline #6 |
| ❓ does anyone invalidate `['admin','staff']` | UNVERIFIED | **YES** — only the staff CRUD page ([admin/staff/page.tsx:67](../../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L67)); the task board/modal never does | 🟡 | Resolve the ❓; modal dropdown can be stale unless staff page ran |
| `main.go` task route lines | `:307-309`; `/admin` gate `:294`; staff list `:280-282` | tasks `:320-322`, `/admin` manager+ `:308`, staff list `:294-295` (NOT `:280-282` — that's the **tables** cashier sub-group) ([main.go:294-295,308,320-322](../../../../../be/cmd/server/main.go#L294)) | 🟡 | Re-cite (+13; fix the wrong staff-list anchor) |

**Verified-matching:** `getTaskStats`/`getStaffTasks`/`createTask` ([admin.api.ts:283-290](../../../../../fe/src/features/admin/admin.api.ts#L283)),
`listStaff` ([admin.api.ts:92-93](../../../../../fe/src/features/admin/admin.api.ts#L92)); the durability
matrix and F5 behaviour are correct.

---

## Area 4 — Loading Behaviour

**Verdict:** mostly accurate (literal `'…'` KPI placeholders, no Suspense, lazy expand, modal submit
states all confirmed) — but one real contradiction about the table region during initial fetch.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Table region during `statsLoading` | "neither table nor empty-state mounts; area is blank" | **wrong** — else branch renders `<StaffTaskTable rows={[]}/>` → 7-col `<thead>` shows ([page.tsx:112-127](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L112), [StaffTaskTable.tsx:62-73](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L62)) | 🔴 | Fix `_loading.md` Zone E/G state #1 + Flag 3 |
| KPI loading = literal `'…'` | each card shows `'…'` | confirmed ([page.tsx:90,94,100,105](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L90)); `KPICard` just prints value ([KPICard.tsx:22](../../../../../fe/src/components/shared/KPICard.tsx#L22)) | 🟢 | none |
| Shared admin spinner; no task-board `loading.tsx` | only `(dashboard)/admin/loading.tsx` | confirmed ([admin/loading.tsx:1-7](../../../../../fe/src/app/(dashboard)/admin/loading.tsx#L1)); no `loading.tsx` under `staff/`/`task-board/` | 🟢 | none |
| Expanded-row states (pulse/error-no-retry/empty) | 4 ordered states | confirmed ([ExpandedTaskList.tsx:13-33](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/ExpandedTaskList.tsx#L13)) | 🟡 | (retry gap = Area 1) |
| Modal staff select silent while loading + submit `'Đang tạo…'` | as described | confirmed ([CreateTaskModal.tsx:39-44,130,211-214](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx#L39)) | 🟢 | none |
| EmptyState single message both cases | one string | confirmed ([page.tsx:114-116](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L114)) | 🟡 | doc-accurate flag |

---

## Area 5 — FE⇄BE Data Model

**Verdict:** source-faithful — every handler/service/repo/SQL line cites correctly *as code*, and the
doc documents all 4 bugs. The only drift is the `main.go` route lines (+13) and one miscount.

| Endpoint/Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Bug 1 — status write-once `pending` | 🔴, no UPDATE anywhere | **HOLDS** — `CreateStaffTask` `'pending'` ([tasks.sql.go:16](../../../../../be/internal/db/tasks.sql.go#L16)); no UPDATE in `querier.go`; grep no `UPDATE staff_tasks` in `be/` | 🔴 | BE: add `PATCH /admin/tasks/:id/status` (MASTER row first) |
| `querier.go` "exactly four task queries" | 4 | actually **5** — adds `GetDailyTaskMetrics` ([querier.go:28,42,56-58](../../../../../be/internal/db/querier.go#L28)); none an UPDATE (Bug 1 still holds) | 🟡 | Fix `_be.md`/BUGS count to 5 |
| Bug 2 — qualityScore fabricated | 🟠, `rate/20.0` | **HOLDS** ([task_service.go:131](../../../../../be/internal/service/task_service.go#L131)); no quality column in migrations | 🟡 | BE: drop column or capture real rating |
| Bug 3 — invalid `assigned_to` → 500 | 🟡, FK→`ErrInternalError`, dead `ErrNoRows` | **HOLDS** ([task_service.go:198-204](../../../../../be/internal/service/task_service.go#L198)); FK `fk_tasks_assigned_to` ([011_staff_tasks.sql:20](../../../../../be/migrations/011_staff_tasks.sql#L20)) | 🟡 | BE: pre-validate staff id → 4xx; drop dead branch |
| Bug 4 — status filter dead (FE) | 🟡, only `overdue` | **HOLDS** ([page.tsx:52-55](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L52)) | 🟡 | FE: remove dead options or add per-status data |
| Endpoint traces (handler→service→repo→SQL) | exact lines | all confirmed ([task_handler.go:24,36,53](../../../../../be/internal/handler/task_handler.go#L24); [task_service.go:111,157,174](../../../../../be/internal/service/task_service.go#L111); [task_repo.go:102](../../../../../be/internal/repository/task_repo.go#L102)) | 🟢 | none |
| `main.go` route lines | tasks `:307-309`, `/admin` gate `:294-295`, staff list `:280-282`/`:282` | tasks `:320-322`, gate `:308`, staff list `:294-295` (doc's `:280-282` is the tables cashier group) ([main.go](../../../../../be/cmd/server/main.go#L308)) | 🟡 | Re-cite +13 across `_be.md`/`_crosspage` |
| Migration 011 vs 012 status enum | n/a | 011 created status **without** `in_progress`; 012 `MODIFY` added it ([012_staff_tasks_v2.sql:7](../../../../../be/migrations/012_staff_tasks_v2.sql#L7)) | 🟢 | optional note |
| FE/BE field agreement | `description` omitempty, times optional, `qualityScore` 0–5 | confirmed ([task.ts:5-37](../../../../../fe/src/types/task.ts#L5) ↔ [task_service.go:33-62](../../../../../be/internal/service/task_service.go#L33)) | 🟢 | none |

**Verified-matching:** auth model (all 4 endpoints manager+, `assigned_by`=caller), error table, the
`LEFT JOIN staff` so every active staff row appears, `GetStaffTasksByDate` priority ordering.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug | Add a task status-transition path (`PATCH /admin/tasks/:id/status` + `UpdateStaffTaskStatus` + overdue derivation) so the stats surface can ever be non-zero | `be/internal/{handler,service,repository,db}/task*`, `be/migrations` |
| 2 | 🔴 Code bug | Stop todo-list "Cập nhật" creating duplicates — gate on update endpoint (depends on #1's write path) or disable edit until it exists | `fe/.../todo-list/components/{TodoPageClient,CreateEditTaskModal}.tsx` |
| 3 | 🔴 Doc fix | Redraw `admin_task_board.md` ASCII: Zone C 4 controls · Zone D real 4 KPI labels (no "Chờ làm") · Zone E 7 columns + actions · Zone F 5 columns + add Zone F to Zones table | `admin_task_board.md` |
| 4 | 🔴 Doc fix | Fix `_loading.md` Zone E/G state #1 + Flag 3: table `<thead>` renders during `statsLoading`, not blank | `admin_task_board_loading.md` |
| 5 | 🟡 Code bug | Map FK rejection (MySQL 1452) to 4xx + remove dead `ErrNoRows` INSERT branch (Bug 3) | `task_service.go:198-204` |
| 6 | 🟡 Code bug | Drop fabricated `qualityScore` (or capture a real rating) — Bug 2 | `task_service.go:131`, `task.ts` |
| 7 | 🟡 Code bug | Remove the 3 dead status-filter options (Bug 4) | `page.tsx:52-55`, `StaffTaskFilterBar.tsx` |
| 8 | 🟡 Doc fix | Re-cite all `main.go` route lines (+13) and fix the wrong staff-list anchor (`:280-282`→`:294-295`); correct "four task queries"→five; resolve the two ❓ | `_be.md`, `_crosspage_dataflow.md`, `_crosscomponent_dataflow.md` |
| 9 | 🟡 Doc fix | Soften the `task.dueDate` "invalidation bug" (arguably correct); note `next/dynamic`; CTA "Thêm công việc"; breadcrumb 3 segments; Zone F has no retry button | `_crosscomponent_dataflow.md`, `admin_task_board.md` |
| 10 | 🟢 Doc fix | Update provenance branch on all 6 files to `experience_claude.md_system_1_test_iphon2_change_code` | all doc-set files |

> Per CLAUDE.md: doc fixes (#3, #4, #8, #9, #10) are one ALIGNed doc task; **each code change (#1, #2,
> #5, #6, #7) must be registered in `MASTER_TASK.md` before any file is touched.** This skill changed no
> app code and no page doc-set — it only wrote the 3 comparison files + the tracker.
