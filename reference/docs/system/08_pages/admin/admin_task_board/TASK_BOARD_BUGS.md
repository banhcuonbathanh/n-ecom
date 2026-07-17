# Task Board — Code Bugs Found While Tracing the BE View

> **TL;DR:** **4 code bugs** surfaced while tracing
> [admin_task_board_be.md](admin_task_board_be.md) on branch `experience_claude.md_system_1`.
> These are **code bugs, not stale docs** — the FE and BE code disagree with each other or with
> clear intent, and a doc edit cannot fix them; only an app-code change can. The doc skill does not
> touch app code. Logged once in the
> [LOGIC Decision Log](../../../07_business_logic/LOGIC_INDEX.md). **Per CLAUDE.md, none of these is
> yet on [MASTER_TASK.md](../../../../tasks/MASTER_TASK.md)** — a fix must be registered + ALIGNed
> before any code change.

---

## Severity at a glance

| # | Bug | Severity | Surface affected | Fix side |
|---|-----|----------|------------------|----------|
| 1 | Task status is write-once `pending` — no mutation path exists | 🔴 High | **Entire board** — 3 of 4 KPIs, completion %, quality stars, overdue highlight (cross-cutting: also breaks A9 todo-list, same table) | BE |
| 2 | `qualityScore` is fabricated from completion rate | 🟠 Med | "Chất lượng ★/5.0" column | BE |
| 3 | Invalid `assigned_to` returns 500 instead of a 4xx | 🟡 Low | Create-task modal error toast | BE |
| 4 | Status filter control is dead (only `overdue` is wired, and it's always false) | 🟡 Low | Filter bar | FE |

---

## Bug 1 — Task status can never leave `pending`

**Symptom.** On a live database every task created through the UI stays `pending` forever, so the
board reads: "Hoàn thành" = 0, "Đang thực hiện" = 0, "Quá hạn" = 0, every staff row shows
`completionRate` 0 %, quality "★ 0.0 / 5.0", and the orange overdue highlight / "!" badge never
appears. The board looks permanently empty of progress even after work is done.

**Root cause.** There is **no UPDATE on `staff_tasks` anywhere in the codebase**. The only writer is
`CreateStaffTask`, which hardcodes the status:

```sql
INSERT INTO staff_tasks (id, title, …, status, …) VALUES (?, …, 'pending', …)
```
— [tasks.sql.go:14-17](../../../../../be/internal/db/tasks.sql.go#L14).

`querier.go` exposes exactly four task queries — `CreateStaffTask`, `GetStaffTaskByID`,
`GetStaffTaskStats`, `GetStaffTasksByDate`
([querier.go:28,56-58](../../../../../be/internal/db/querier.go#L28)) — **none is an UPDATE**. No
route advances status ([main.go:307-309](../../../../../be/cmd/server/main.go#L307) is the complete
task route set), and no background job flips `due_at < now()` rows to `overdue` (grep for `overdue`
across `be/internal` finds only the enum definition and read-side `SUM(CASE …)` aggregates). Yet the
stats queries and the whole FE board are built entirely around those unreachable status values
([tasks.sql.go:51-53](../../../../../be/internal/db/tasks.sql.go#L51),
[page.tsx:88-108](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L88)).

**Suggested fix (BE, smallest safe first).** Add a `PATCH /admin/tasks/:id/status` endpoint
(handler → service validating the transition → a new sqlc `UpdateStaffTaskStatus`, setting
`completed_at` when moving to `completed`). Separately, an `overdue` sweep (a job, or compute it
read-side: `status='pending' AND due_at < NOW()`) is needed for the "Quá hạn" KPI to ever be
non-zero — note the stats query currently keys on a **stored** `overdue` status, so either a writer
or a read-side derivation must be chosen.

---

## Bug 2 — "Quality" stars are just the completion rate, rescaled

**Symptom.** The "Chất lượng" column always equals `completionRate / 20` (e.g. 80 % completion →
"★ 4.0 / 5.0"). It is not an independent measure of work quality, so it adds no information beyond
the "Tỷ lệ %" column already shown next to it.

**Root cause.** The service fabricates it:

```go
quality := rate / 20.0   // task_service.go:131
```
— [task_service.go:130-131](../../../../../be/internal/service/task_service.go#L130). There is **no
quality column** on `staff_tasks` ([011_staff_tasks.sql](../../../../../be/migrations/011_staff_tasks.sql),
[012_staff_tasks_v2.sql](../../../../../be/migrations/012_staff_tasks_v2.sql)) and no rating capture
anywhere. The FE renders it as a distinct metric
([StaffTaskTable.tsx:29-39,119-121](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskTable.tsx#L29)).

**Suggested fix (BE).** Either (a) capture a real per-task quality rating (new column + write path)
and aggregate it, or (b) drop `qualityScore` from the DTO and the column until a real signal exists,
to stop implying data the system does not have. (b) is the smaller, honest change.

---

## Bug 3 — Assigning to a non-existent staff returns 500

**Symptom.** If `staffId` in the create payload is not a real staff id, the modal shows the generic
"Không thể tạo công việc — thử lại" toast and the server logs a 500, rather than a clear validation
error.

**Root cause.** The `fk_tasks_assigned_to` constraint
([011_staff_tasks.sql:20](../../../../../be/migrations/011_staff_tasks.sql#L20)) rejects the insert;
the repo returns the driver error; the service maps every non-`ErrNoRows` error to
`ErrInternalError` → 500 ([task_service.go:198-204](../../../../../be/internal/service/task_service.go#L198)).
The `if err == sql.ErrNoRows` branch just above is **dead** for an `ExecContext` INSERT (it never
returns `ErrNoRows`).

**Suggested fix (BE).** Pre-validate that `assigned_to` is an existing active staff id (a cheap
`GetStaffByID`) and return 400/422 `INVALID_INPUT` when not; or detect the MySQL FK error (1452) and
map it to a 4xx. Remove the dead `ErrNoRows` branch.

---

## Bug 4 — The status filter dropdown does nothing (except a no-op `overdue`)

**Symptom.** Choosing "Chờ", "Đang làm", or "Hoàn thành" in the filter bar changes nothing on the
staff table; "Quá hạn" also shows no effect (because `hasOverdue` is always false — Bug 1).

**Root cause.** `page.tsx`'s client-side filter only branches on `overdue`
([page.tsx:51-55](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/page.tsx#L51)); the
other three status values fall through and return every row. The control offers four statuses
([StaffTaskFilterBar.tsx:19-25](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/StaffTaskFilterBar.tsx#L19)).
Note the rows are **per-staff aggregates**, so a per-status filter only makes sense as "staff who
have ≥1 task in that status" — which the stats DTO does not currently expose per status.

**Suggested fix (FE, after Bug 1).** Either remove the non-functional status options, or extend the
stats DTO with per-status counts and implement the filter against them. Low priority until Bug 1
makes any non-`pending` status reachable.

---

## Next step

None of these is on [MASTER_TASK.md](../../../../tasks/MASTER_TASK.md). Per CLAUDE.md a fix must be
registered + ALIGNed before code changes. **Recommended first:** **Bug 1** — it is the root cause
that makes the entire stats half of the page (and the A9 todo-list board) dead, and Bugs 2 and 4
are only worth fixing once status can actually move. Offer to register it.
