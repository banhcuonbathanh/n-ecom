# Doc vs. Code — `/admin/todo-list` (Admin To-Do List)

> **Scope:** a read-only audit of the `admin_todo_list` doc-set against the running FE/Go code on
> branch `experience_claude.md_system_1_test_iphon2_change_code`, across 5 axes: ① component
> visuals · ② cross-component dataflow · ③ cross-page dataflow · ④ loading behaviour · ⑤ FE⇄BE
> data model. **Read-only — no code or docs were changed.** Produced by 5 parallel Sonnet agents;
> every 🔴 was re-verified by hand against source.
>
> **Headline:** this is a **source-faithful doc-set that documents the code *including* its bugs**
> (peer of `admin_combos` / `customer_checkout` / `admin_categories` / `staff_register`). **There
> is no doc-vs-code CONTRADICTION** — every cache key, staleTime, line-cite, endpoint, auth gate,
> object-model field, and ASCII string was confirmed. The lone 🔴 is **BUG 1 (edit creates a
> duplicate)**, a real product bug the doc already documents in three places. All other drift is
> stale line-numbers (`main.go` routes +13) and one resolvable `❓ UNVERIFIED`. Screenshots ⏳
> (stack down).
>
> Date: 2026-06-24.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 · Component visuals | ASCII + Zones table accurate; 3 cosmetic copy gaps | 0 | 3 | 6 |
| 2 · Cross-component dataflow | Exemplary — every cache key / staleTime / line-cite exact | 0 | 2 | 10 |
| 3 · Cross-page dataflow | Architecture claims all correct; stale BE line-cites | 0 | 3 | 8 |
| 4 · Loading behaviour | Branch ranges / skeleton / empty-copy all exact | 0 | 2 | 8 |
| 5 · FE⇄BE data model | Well-traced; 4 code bugs confirmed (doc-documented) | 1 | 3 | 10 |
| **Total** | **No contradiction — source-faithful set** | **1** | **8** | **14** |

> Severity key (this is a doc-vs-code audit): 🔴 = a hard contradiction **or** a real product bug
> the doc surfaces; 🟡 = real but minor (copy, undocumented label, off-by-a-few line ranges);
> 🟢 = cosmetic / stale line-number / provenance.

---

## 🔴 RAISE-MY-VOICE headline findings

**1. 🔴 BUG 1 — "Edit task" silently creates a DUPLICATE (real product bug; doc-documented, re-verified).**
A manager taps ✏️ on a task, changes a field, hits **Cập nhật** — instead of updating the row, a
**second task is POSTed** with the new values; the original is untouched, and there is **no delete
button** to remove the duplicate. Root cause traced and confirmed by hand:
- `handleModalSubmit` always calls `createTask.mutate(...)` regardless of mode and **never reads
  `editTask.id`** — `fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx:61-80`.
- `mode={editTask ? 'edit' : 'create'}` (`TodoPageClient.tsx:187`) only flips the modal title and
  the submit-button label to "Cập nhật" — it changes no API call.
- `useCreateTask` knows only `POST` (`fe/src/hooks/useTodoTasks.ts:24-33` → `admin.api.ts:289`
  `api.post('/admin/tasks', ...)`).
- There is **no `PATCH`/`PUT`/`DELETE /admin/tasks/:id`** — the router registers exactly three task
  routes: `be/cmd/server/main.go:320-322` (`GET /tasks/stats`, `GET /tasks`, `POST /tasks`). The FE
  type `UpdateTaskPayload` (`fe/src/types/task.ts`) has no API function behind it.

**Why it matters:** silent data corruption on every edit, with no UI path to undo it.
**Doc status:** NOT drift — already documented in `TODO_BUGS.md` Bug 1, `admin_todo_list_be.md`
Flag 1, and `admin_todo_list.md` Flag 1. A doc edit cannot fix it; the fix (add `PATCH
/admin/tasks/:id` + branch the edit path) needs a `MASTER_TASK.md` row.

> The other three documented code bugs (status filter dead · date-range dead · bad `staffId` → 500)
> were all re-confirmed live but are 🟡 — see Area 5.

---

## Dead / unreachable components found

- **`UpdateTaskPayload` type** (`fe/src/types/task.ts`) — declared, but no API function in
  `admin.api.ts` and no BE route consume it. Pure forward-declaration scaffolding for the missing
  PATCH path.
- **`notes` field** — present in the modal Zod schema (`CreateEditTaskModal.tsx:18`), the edit-reset
  (`:50`), and the `CreateTaskPayload` (`task.ts`), **but no `<textarea>` for `notes` is rendered**
  in the form (`CreateEditTaskModal.tsx:80-193`). It is always `undefined` at submit. Doc-flagged
  (`admin_todo_list.md` Flag 4).
- **`qualityScore`** — computed and returned by BE (`task_service.go:131,139`) and present in the FE
  type (`task.ts:35`), but **never rendered** in the per-staff table on this page
  (`TodoPageClient.tsx:115-150`). It is consumed by `/admin/staff/task-board` instead.
- **`staff_tasks.deleted_at`** (`011_staff_tasks.sql`) and **`completed_at`** columns — filtered in
  every read (`WHERE deleted_at IS NULL`) but **never written** by any task query/repo. Soft-delete
  and completion scaffolding with no write path (consistent with "no update/delete endpoint").
- **`performance_score: 0`** stub in `toStaffJSON` (`staff_handler.go:250`) — hardcoded zero, never
  consumed by this page.

---

## Area 1 — Component visuals

**Verdict:** the ASCII wireframe + Zones table are accurate — header/filter/metric/table/modal copy
all verified against source. Three cosmetic copy gaps only; the dropped a wrong agent 🔴 (see note).

| Component/Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Task-table action header | ASCII draws `HĐ` | renders full word `Hành động` — `TodoTaskTable.tsx:35` | 🟡 | Update ASCII `HĐ` → `Hành động` |
| Modal submit label (edit mode) | ASCII shows only `[Lưu công việc]` | edit mode renders `Cập nhật` — `CreateEditTaskModal.tsx:187` (`{isSubmitting ? 'Đang lưu...' : mode==='create' ? 'Lưu công việc' : 'Cập nhật'}`) | 🟡 | Note both labels in the wireframe |
| Modal "Kết thúc" label | ASCII draws `Kết thúc` (no marker) | renders `Kết thúc (tuỳ chọn)` — `CreateEditTaskModal.tsx:153` | 🟡 | Add `(tuỳ chọn)` in ASCII |
| ASCII source-cite | `TodoPageClient.tsx:93-183` | `return (` opens at `:82`; block ends `:195` | 🟢 | Cite `:82-195` |
| `notes` textarea absent | "no `notes` input field rendered" | confirmed — schema/reset/payload carry `notes` but no field in JSX `CreateEditTaskModal.tsx:80-193` | 🟢 | Doc correct (Flag 4) |
| Status filter options | "Tất cả / Chờ / Hoàn thành / Quá hạn — NO Đang làm" | confirmed `TodoFilterBar.tsx:87-91` — no `in_progress` option | 🟢 | Doc correct |
| `TaskStatusBadge` (status zone) | Zones table cites `components/shared/TaskStatusBadge` | used — imported `TodoPageClient.tsx:14`, rendered `:143` `<TaskStatusBadge status="overdue" />` | 🟢 | Doc correct |

> **Dropped a wrong agent 🔴.** An area agent flagged `TaskPriorityBadge` as "listed but unused on
> this page." The page doc never claims `TaskPriorityBadge` — its Zones table correctly cites
> `TaskStatusBadge` (verified used at `TodoPageClient.tsx:143`); priority is rendered inline via a
> `PRIORITY_LABEL` map (`TodoTaskTable.tsx:5-9`). No contradiction — finding dropped.

**Verified-matching:** header title "Danh sách Công Việc" + button "+ Tạo công việc" + `canCreate`
gate; all FilterBar labels + `[Lọc]`/`[Xóa lọc]`; all 4 metric-card labels + `grid-cols-2
md:grid-cols-4`; per-staff table 5 columns; task-table columns; priority labels (🔴 Cao / 🟡 TB /
🟢 Thấp); edit button ✏️ (table) + ✏️ Sửa (card); no delete button; modal title switch + all field
labels; completion-rate thresholds (≥80 green / ≥50 yellow / else red, `TodoPageClient.tsx:137`);
edit-creates-duplicate confirmed.

---

## Area 2 — Cross-component dataflow

**Verdict:** exemplary. Every cache key, staleTime, `enabled` gate, state-layer cite, and the
per-staff-row view-switch resolve to the exact lines the doc names. "No Zustand store" is true (only
`useAuthStore` is imported, for the role check).

| Component/Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Stats-board JSX range | "`TodoPageClient.tsx:99-153`" | outer `{!staffId && (` opens at `:93`; block ends `:154` | 🟡 | Cite `:93-154` (include the gate) |
| `notes` dead field | (Area 5 / Flag 4) | schema `:18` + reset `:50` + payload `:76`, no rendered input | 🟡 | doc-documented; see Area 5 |
| tasks invalidation key | `['admin','tasks', task.staffId, task.dueDate]` | exact — `useTodoTasks.ts:29` | 🟢 | — |
| stats invalidation key | `['admin','tasks','stats']` (prefix) | exact — `useTodoTasks.ts:30` | 🟢 | — |
| staleTimes 15/30/60s | tasks 15s, stats 30s, staff 60s | `useTodoTasks.ts:12` (15k), `:20` (30k), `TodoPageClient.tsx:38` (60k) | 🟢 | — |
| `enabled: !!staffId` | `useTodoTasks.ts:11` | exact | 🟢 | — |
| per-staff row click | `setFilters(f=>({...f, assigned_to: stat.staffId}))` `:131` | exact `TodoPageClient.tsx:131` | 🟢 | — |
| FilterBar local mirror + sync | `local` `:12`, `useEffect` `:16-18` syncs only `assigned_to` | exact `TodoFilterBar.tsx:12,16-18` | 🟢 | — |
| no optimistic update | "only invalidates, no `setQueryData`" | confirmed `useTodoTasks.ts:28-31` | 🟢 | — |

**Verified-matching:** §5 state-layer table cites; dual `onSuccess` (hook `useTodoTasks.ts:28-31` +
call-site `TodoPageClient.tsx:78`); modal invocation block `:185-193`; all type line-cites
(`task.ts:5-18`, `:39-42`, `:51-60`); all `admin.api.ts` function lines (`:283-291`).

---

## Area 3 — Cross-page dataflow

**Verdict:** every architectural claim is correct — no localStorage task key, no Zustand task store,
no SSE/WS for tasks, no update/delete route, pull-only sync, MySQL row as the only durable hub,
`/admin/staff/task-board` reads the identical endpoints. All failures are stale BE line-cites.

| Component/Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| task route lines | "`main.go:307-309`" (only GET stats/GET tasks/POST tasks) | real lines `be/cmd/server/main.go:320-322`; group+mw at `:307-308` | 🟡 | Update cites → `:320-322` |
| `status='pending'` cite | "`tasks.sql:48`" | INSERT header `:48`, `VALUES (…,'pending',…)` on `:49` | 🟡 | Cite `:48-49` |
| status ENUM cite | "`012_staff_tasks_v2.sql:6`" | `MODIFY COLUMN status ENUM(...)` is `:7` | 🟡 | Cite `:7` |
| no localStorage task key | absent | confirmed — grep `task` in `storage-keys.ts` = 0 | 🟢 | — |
| no task Zustand store | absent | confirmed — `fe/src/store/` has cart/favourites/settings/theme/training only | 🟢 | — |
| no SSE/WS for tasks | none | confirmed — grep `task` publish/broadcast in `be/internal/` = 0 | 🟢 | — |
| task-board same endpoints | `getTaskStats` `:32`, `getStaffTasks` `:40` | exact `task-board/page.tsx:32,40` + own `CreateTaskModal` `:10-12` | 🟢 | — |
| single-day server | `WHERE DATE(due_at)=?` no BETWEEN | confirmed `tasks.sql:8,26,36` | 🟢 | — |

**Verified-matching:** status lifecycle (4-value ENUM, `in_progress` added by migration 012);
created status hard-coded `pending`; durability matrix; F5 cold-start behaviour; no
cancel/reverse flow.

---

## Area 4 — Loading behaviour

**Verdict:** accurate on every structural claim — no `loading.tsx`, 5-line `page.tsx`, the two
mutually-exclusive branch ranges, the 7-block skeleton shape, both divergent empty-copy strings, the
stats-null blank guard, and "no error UI on any of the 3 queries."

| Component/Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| submit-button element range | "`CreateEditTaskModal.tsx:184-187`" | `<button` opens `:182`; `disabled={isSubmitting}` `:184`; label `:187` | 🟡 | Cite `:182-187` for the full element |
| edit-mode static label | loading doc describes only the pending label "Đang lưu..." | non-pending edit label is `Cập nhật` — `CreateEditTaskModal.tsx:187` | 🟡 | Note the 3-way ternary |
| no `loading.tsx` | absent | confirmed — folder has only `page.tsx` + `components/` | 🟢 | — |
| Branch A (stats) range | `:93-154` | exact `{!staffId && (` `:93` → `)}` `:154` | 🟢 | — |
| Branch B (tasks) range | `:157-183` | exact `{staffId && (` `:157` → `)}` `:183` | 🟢 | — |
| skeleton 7 blocks | h-8 w-48 + h-10 + h-14 ×5 | confirmed `TodoPageSkeleton.tsx:4-8` (`Array.from({length:5})`) | 🟢 | — |
| empty copy diverges | mobile "Không có công việc nào" / desktop "...cho bộ lọc này" | `TodoPageClient.tsx:169` / `TodoTaskTable.tsx:21` | 🟢 | — |
| stats-null blank | `{statsQuery.data ? (...) : null}` `:152` | exact | 🟢 | — |
| no error UI | none of 3 queries wire `isError` | confirmed — no `isError` branch in file | 🟢 | — |

**Verified-matching:** staleTimes 60k/30k/15k; `enabled: !!staffId`; both skeleton gates
(`:95-96`, `:159-160`); staff dropdown has no loading indicator.

---

## Area 5 — FE⇄BE data model

**Verdict:** well-traced. All 4 endpoint handler/service/repo/SQL cites are exact, the auth model is
correct, `taskToDTO` field mapping matches, and all 4 documented code bugs are re-confirmed live.
Drift = stale `main.go` route-group lines (+13) and one `❓` that is now resolvable.

| Component/Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| **BUG 1 — edit duplicates** | no PATCH/DELETE; edit re-POSTs | confirmed — `main.go:320-322` (3 routes only), `TodoPageClient.tsx:68` always POSTs | 🔴 | doc-documented; BE add `PATCH /admin/tasks/:id` + wire edit path (MASTER row) |
| BUG 2 — status filter dead | never sent to BE | confirmed — `getStaffTasks` builds `?staffId=&date=` only (`admin.api.ts:286`); handler reads no status (`task_handler.go:36-50`); SQL no status predicate (`tasks.sql:33-40`) | 🟡 | doc-documented; FE client-filter or add BE param |
| BUG 3 — date-range dead | single-day only | confirmed — `date = start_date ?? today` (`TodoPageClient.tsx:32`); SQL `DATE(due_at)=?` (`tasks.sql:8,26,36`) | 🟡 | doc-documented; remove `Đến ngày` or add BETWEEN |
| BUG 4 — bad `staffId` → 500 | `== sql.ErrNoRows` misses FK error | confirmed — `task_service.go:200` uses `err == sql.ErrNoRows` (not `errors.Is`); INSERT FK 1452 → `ErrInternalError` 500 `:203` | 🟡 | doc-documented; map errno 1452 → 400 |
| `qualityScore` returned? | "❓ UNVERIFIED whether BE returns this field" (`admin_todo_list.md:176`) | **RESOLVED — BE returns it**: `quality := rate/20.0` `task_service.go:131`, `QualityScore: quality` `:139`; still unrendered on this page | 🟡 | Remove the `❓ UNVERIFIED` note; mark "returned, unrendered here" |
| staffR group cite | "`main.go:280-282`" | real `:293-294` (`authMW + AtLeast("manager")`) | 🟢 | Update cite |
| adminR group cite | "`main.go:294-309`" | real group+mw `:307-308`, task routes `:320-322` | 🟢 | Update cite |
| `useTodoTasks` enabled cite | "`useTodoTasks.ts:12`" | `enabled: !!staffId` is `:11` | 🟢 | Update cite |
| `dueTimeStart/End` typing | typed `string` not `string\|undefined` (Flag 6) | confirmed `task.ts:13-14`; BE emits `""` (no `omitempty`, `task_service.go:56-57`) | 🟡 | Add `?` to type or `omitempty` on DTO |

**Verified-matching:** all 4 endpoint handler/service/SQL cites (`task_handler.go:24,36,53`;
`task_service.go:111,157,174`; `tasks.sql:1,11,33,42,47`); auth `authMW + AtLeast("manager")` on
both groups; `taskToDTO` (Title→name, AssignedTo→staffId, DueAt→dueDate); `CreateTaskPayload` field
set; Task §1 all 12 fields; `performance_score:0` stub; `listStaff` sends only `limit=100`.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug | Add `PATCH /admin/tasks/:id` (handler→service→repo + `UpdateStaffTask` query) + optional `DELETE`; branch `handleModalSubmit` on `mode==='edit'` to call it with `editTask.id` | `be/cmd/server/main.go`, `task_*.go`, `tasks.sql`, `TodoPageClient.tsx`, `admin.api.ts`, `useTodoTasks.ts` |
| 2 | 🟡 Code bug | Status filter: filter `tasksQuery.data` by `filters.status` (FE) or add BE `status` param; fold in missing `in_progress` option | `TodoFilterBar.tsx` / `admin.api.ts` / `tasks.sql` |
| 3 | 🟡 Code bug | Date-range: decide single-day (remove `Đến ngày` + 90-day guard) or real range (`BETWEEN`) | `TodoFilterBar.tsx` / `tasks.sql` |
| 4 | 🟡 Code bug | Map FK errno 1452 → 400 `INVALID_INPUT` on create | `task_repo.go` / `task_service.go` |
| 5 | 🟡 Doc fix | Resolve the `qualityScore` `❓ UNVERIFIED` → "returned by BE (`task_service.go:131,139`), not rendered here" | `admin_todo_list.md:176` |
| 6 | 🟢 Doc fix | Refresh stale BE line-cites: task routes `307-309→320-322`; staffR `280-282→293-294`; adminR `294-309→307-308`; `tasks.sql:48→48-49`; `012_staff_tasks_v2.sql:6→7`; `useTodoTasks.ts:12→11` | `_be.md`, `_crosspage_dataflow.md`, `TODO_BUGS.md` |
| 7 | 🟢 Doc fix | ASCII/copy: `HĐ`→`Hành động`; add edit-mode label `Cập nhật`; `Kết thúc (tuỳ chọn)`; ASCII source-cite `82-195`; refresh provenance branch on all 7 files | `admin_todo_list.md`, all doc-set headers |

> Per CLAUDE.md: the doc fixes (#5-7) are **one** ALIGNed task; each **code** change (#1-4) must be
> registered in `docs/tasks/MASTER_TASK.md` **before any file is touched**. This skill changed
> nothing — it only surfaced the drift.
