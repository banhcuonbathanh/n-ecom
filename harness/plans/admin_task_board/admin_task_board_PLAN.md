# Admin Task Board — Consolidated FE + BE Build Plan (F-22)

> **TL;DR.** `/admin/staff/task-board` is the manager's daily staff-work dashboard: pick a
> date, read four KPIs, scan a per-staff table, expand a row to see that person's tasks, and
> assign new work through a modal. This plan reconciles the reference implementation
> (`reference/docs/system/08_pages/admin/admin_task_board/`, 7 docs, digested 2026-07-19)
> against the harness rules — and **designs out all four reference bugs**, the largest of
> which (`status` is write-once `pending`) renders three of the four KPIs permanently zero
> in the source system.
>
> Visual companions: [`admin_task_board_plan.html`](admin_task_board_plan.html) ·
> [`admin_task_board_how-it-works.html`](admin_task_board_how-it-works.html) ·
> [`admin_task_board_mockup-1.html`](admin_task_board_mockup-1.html)
>
> **One fact, one home.** This file is the only source of truth for the task-board page.
> The three HTML files are snapshots — on any conflict, this `.md` wins. Rules referenced
> in §2 live in their owning docs and are **linked, never restated**.

---

## 1. What the page is

A **manager+ oversight board** for staff tasks on a single chosen day.

| Aspect | Value |
|---|---|
| Route | `/admin/staff/task-board` |
| Surface | Admin (neutral F-7 tokens — **not** the customer dark/orange shell) |
| Auth | `manager+` — `manager` and `admin` only (of the 5-value `staff.role` enum) |
| Core loop | pick date → read KPIs → scan staff table → expand a row → assign a task |
| Entry paths | admin shell nav → *Nhân viên* → *Bảng công việc* |
| Out links | **+ Giao việc** modal (create task) · sibling page `/admin/todo-list` (same table) |
| Realtime | none — polling only (see §4.3) |

**Sibling page, shared spine.** `/admin/todo-list` reads the *same* `staff_tasks` table
through the *same* two read endpoints. That page has its own plan folder
(`harness/plans/admin_todo_list/`, F-20). **This plan owns the BE task contract**; the
todo-list plan links to it rather than re-deriving it. Where the two disagree, this file wins
for anything under `/admin/tasks`.

---

## 2. Alignment — concern → owning doc (READ, don't restate)

| Concern | Owning doc |
|---|---|
| FE state kinds, cache/invalidation map, loading tiers, FE folder layout, FE conventions | `harness/FE_STATE.md` |
| BE state ownership, transaction policy, error-code enum, validation tiers, BE layout | `harness/BE_STATE.md` |
| goose + sqlc workflow, migration-file standard, Go/Gin gotcha rules | `harness/BE_PLAYBOOK.md` |
| Table + column specs, conventions, field-name law | `harness/DB_SCHEMA.md` (this plan **promotes** `staff_tasks` out of its §4.7 stub — see §3.2) |
| Component visuals, tokens, button/table/modal specs | `harness/diagrams/design-system.html` |
| Redis policy (catalog cache + auth rate-limit **only**) | `harness/ARCHITECTURE.md §4` |
| Phase roadmap, RBAC, lessons register | `harness/OVERALL_PLAN.md` |
| Page-plan format & process | `harness/plans/PAGE_PLAN_GUIDE.md` |

---

## 3. BE plan

### 3.1 Endpoints

All under the `manager+`-gated `/admin` group. **5 endpoints — 3 reads + 2 writes.**
Endpoint 5 is borrowed from the staff domain (dropdown only), not owned here.

| # | Route | Auth | Phase/task | Behavior |
|---|---|---|---|---|
| 1 | `GET /admin/tasks/stats?date=` | manager+ | AD-1 | Day rollup: `metrics` (4 KPI counts) + `staffStats[]` (one row per active staff, incl. zero-task staff via LEFT JOIN) |
| 2 | `GET /admin/tasks?staffId=&date=` | manager+ | AD-1 | One staff member's tasks for the day, ordered priority (high→low) then `due_at` ASC |
| 3 | `POST /admin/tasks` | manager+ | AD-2 | Create a task; `assigned_by` = caller from JWT; returns **201** + full task |
| 4 | `PATCH /admin/tasks/:id/status` | manager+ | AD-2 | **NEW — not in the reference.** Advance status through the §3.6 transition machine; stamps `completed_at` |
| 5 | `GET /staff?limit=100` | manager+ | (staff domain) | Populates the assign-modal dropdown. Contract owned by the staff-domain plan — linked, not re-derived |

**Deferred (not v1)** — recorded so they are decisions, not omissions:
`PATCH /admin/tasks/:id` (edit fields) and `DELETE /admin/tasks/:id` (soft delete via
`deleted_at`). The reference has neither, and its todo-list page silently *duplicates* rows
because "edit" calls create (§6 row 6). We ship neither rather than half of one; the
`deleted_at` column exists from day one so the delete path is a pure additive follow-up.

### 3.2 Schema depended on — `staff_tasks` (promoted from `DB_SCHEMA.md §4.7`)

`DB_SCHEMA.md §4.7` lists `staff_tasks` as an unspec'd AD-phase stub. This plan supplies the
column spec; **the same change promotes it into `DB_SCHEMA.md`** — this table is not a second
home for it, it is the plan that fills the stub.

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID, app-generated |
| `assigned_to` | CHAR(36) NOT NULL | FK → `staff.id`; index `(assigned_to, due_at)` |
| `assigned_by` | CHAR(36) NOT NULL | FK → `staff.id`; the caller, from JWT — never from the body |
| `title` | VARCHAR(200) NOT NULL | 1–200 validated at tier 1 |
| `description` | TEXT NULL | real `null` when absent (F-16 wire rule) |
| `priority` | ENUM('high','medium','low') NOT NULL | ordered high→medium→low in queries |
| `status` | ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending' | **4 stored values — `overdue` is NOT stored** (§3.6) |
| `due_at` | DATETIME NOT NULL | the day+time the task is due; `DATE(due_at)` is the day key |
| `due_time_start` | TIME NULL | optional display window start |
| `due_time_end` | TIME NULL | optional display window end |
| `notes` | TEXT NULL | shown in the expanded row |
| `completed_at` | DATETIME NULL | stamped by endpoint 4 on → `completed`; cleared on transition away |
| `created_at` | DATETIME NOT NULL | |
| `updated_at` | DATETIME NOT NULL | |
| `deleted_at` | DATETIME NULL | soft delete; **every query filters `deleted_at IS NULL`** |

Index set: PK · `(assigned_to, due_at)` · `(due_at)` for the day rollup · FK indexes.

### 3.3 Cache map

**No Redis.** This is not an omission — it is `ARCHITECTURE.md §4` applied: Redis is scoped to
the catalog cache and auth rate-limiting only. Task reads are low-volume, manager-only, and
must never be stale against a write the same manager just made. Every read goes to MySQL.

Client-side (TanStack Query) is therefore the only cache layer:

| Key | staleTime | Refetch | Invalidated by |
|---|---|---|---|
| `['admin','tasks','stats', date]` | 30 s | `refetchInterval` 60 s | create (3), status change (4) |
| `['admin','tasks', staffId, date]` | 15 s | on expand; lazy via `enabled` | create (3), status change (4) |
| `['admin','staff']` | 5 min | on modal open | — (staff-domain writes) |

**Invalidation rule (a reference bug designed out):** a write invalidates **both** the
affected task's `dueDate` **and** the currently-filtered `filters.date`. The reference
invalidates only `task.dueDate`, so creating a task for a *different* day than the one on
screen leaves the visible KPIs stale (§6 row 5).

### 3.4 Not adopted — reference choices rejected, with reasons

| Reference choice | Ruling | Why |
|---|---|---|
| `status` write-once `pending`, no UPDATE path | **Rejected** — add endpoint 4 | Root bug: makes 3 of 4 KPIs, completion %, and the overdue highlight permanently zero. A board that cannot show progress is not a board |
| `overdue` as a **stored** enum value | **Rejected** — derive read-side | A stored `overdue` needs a sweeper job to ever be true. Deriving it (`status='pending' AND due_at < NOW()`) is correct by construction with zero moving parts — *simplicity first* |
| `qualityScore = completionRate / 20` | **Dropped entirely** | Fabricated: no quality signal is captured anywhere. It restates the completion-rate column while implying an independent measure. We do not ship invented data |
| Error code `INVALID_INPUT` | **Renamed** → `VALIDATION_FAILED` | Our enum is fixed in `BE_STATE.md §4`; the reference's code is not one of ours |
| FK rejection → 500 `INTERNAL_ERROR` | **Rejected** → 422 `VALIDATION_FAILED` | A bad `staffId` is caller error, not server error. Pre-validate the staff id exists and is active |
| `staffId` required on endpoint 2 with no ownership check | **Adopted** | Correct for an oversight board: a manager legitimately reads any staff member's tasks. Documented, not accidental |
| Status filter offering 4 values, only `overdue` wired | **Rejected** — wire all of them | See §3.5: `staffStats[]` carries per-status counts so the filter has real data to act on |
| `description` stored but never rendered | **Rejected** | Either surface it or drop it. We surface it in the expanded row under the title |
| Required `dueTime` folded into `due_at` only | **Rejected** | The reference makes a time mandatory at create, then reads the *optional* `due_time_start/end` for display, so the column can show "—" for a time the user was forced to enter. We display the `due_at` clock component and treat the window as genuinely optional |

### 3.5 Wire shapes

**1 · `GET /admin/tasks/stats?date=2026-07-19` → 200**

```json
{
  "data": {
    "metrics": { "totalTasks": 18, "pendingTasks": 5, "inProgressTasks": 4,
                 "completedTasks": 9, "overdueTasks": 2 },
    "staffStats": [
      { "staffId": "8f1c…", "staffName": "chef01", "role": "chef",
        "assignedCount": 5, "completionRate": 40,
        "byStatus": { "pending": 2, "inProgress": 1, "completed": 2, "cancelled": 0 },
        "overdueCount": 1, "hasOverdue": true }
    ]
  }
}
```

`byStatus` + `overdueCount` are **new vs the reference** — they are what makes the status
filter functional (§3.4). `qualityScore` is absent by decision. Every active, non-deleted
staff row appears even with zero tasks (LEFT JOIN), `completionRate` = 0 when no tasks.

**2 · `GET /admin/tasks?staffId=8f1c…&date=2026-07-19` → 200**

```json
{ "data": [ { "id": "3a7e…", "staffId": "8f1c…", "name": "Kiểm kê nguyên liệu",
    "description": "Đếm tồn kho tủ lạnh 2", "priority": "high", "status": "in_progress",
    "isOverdue": false, "dueDate": "2026-07-19", "dueAt": "2026-07-19T21:00:00Z",
    "dueTimeStart": null, "dueTimeEnd": null, "notes": "Báo lại quản lý sau khi xong",
    "completedAt": null, "assignedBy": "b2d0…", "createdAt": "2026-07-19T08:12:00Z" } ] }
```

`isOverdue` is server-derived (§3.6). Nullable columns serialize as real `null`, never `""`
(F-16 wire rule).

**3 · `POST /admin/tasks` → 201**

```json
{ "staffId": "8f1c…", "name": "Kiểm kê nguyên liệu", "description": "Đếm tồn kho tủ lạnh 2",
  "priority": "high", "dueAt": "2026-07-19T21:00:00Z",
  "dueTimeStart": null, "dueTimeEnd": null, "notes": "Báo lại quản lý sau khi xong" }
```

Response: the full task object from shape 2. `assignedBy` is stamped from the JWT and is
**rejected if present in the body** (tier-1 validation).

**4 · `PATCH /admin/tasks/:id/status` → 200**

```json
{ "status": "completed" }
```

Response: the full updated task object.

**Errors** — the standard envelope `{"error":{code,message,details}}` per `BE_STATE.md §4`:

| Trigger | Status | Code |
|---|---|---|
| Missing/blank `staffId` on endpoint 2; bad `date`; bad `priority`; bad `dueAt`; `name` outside 1–200 | 400 | `VALIDATION_FAILED` |
| `staffId` is not an existing **active** staff member | 422 | `VALIDATION_FAILED` |
| Task id unknown or soft-deleted | 404 | `NOT_FOUND` |
| Illegal status transition (§3.6) | 409 | `CONFLICT` |
| Caller below `manager` | 403 | `FORBIDDEN` |
| Anything else | 500 | `INTERNAL` |

### 3.6 Status model — the core correction

Stored statuses are a 4-value enum. **`overdue` is a derived display state, not a stored
value** — it is `status IN ('pending','in_progress') AND due_at < NOW()`, computed in the
read queries and returned as `isOverdue` / `overdueCount`. This removes the reference's need
for a sweeper job and makes the "Quá hạn" KPI correct the instant a deadline passes.

```
                 ┌──────────────► cancelled ◄──────────┐
                 │                                      │
   (create) → pending ──────► in_progress ──────► completed
                 │                                  │
                 └──────────────────────────────────┘   (direct complete allowed)
```

| From → To | Allowed | Note |
|---|---|---|
| `pending` → `in_progress` / `completed` / `cancelled` | ✅ | direct complete is allowed (short tasks) |
| `in_progress` → `completed` / `cancelled` / `pending` | ✅ | back to `pending` = "un-start", allowed |
| `completed` → `in_progress` / `pending` | ✅ | correcting a mis-click; clears `completed_at` |
| `completed` → `cancelled` | ❌ 409 | cancel what is already done is meaningless |
| `cancelled` → anything | ❌ 409 | terminal; assign a new task instead |
| any → itself | ✅ no-op 200 | idempotent, so a double-click is harmless |

Transition validation lives in the **service** layer (`BE_STATE.md`: handlers shape, services
decide). `completed_at` is stamped on entry to `completed` and nulled on exit.

---

## 4. FE plan

### 4.1 Route + file map

```
fe/src/app/(dashboard)/admin/staff/task-board/
  page.tsx                      — coordinator: owns all UI state, both queries
  loading.tsx                   — route skeleton mirroring the real layout   ← NEW vs reference
  components/
    TaskBoardHeader.tsx         — breadcrumb + "Giao việc" CTA
    TaskBoardFilterBar.tsx      — date · role · status · search
    TaskBoardKpiRow.tsx         — 4× KPICard, skeleton-aware
    StaffTaskTable.tsx          — staff rows + expand chevron + per-row assign
    ExpandedTaskList.tsx        — one staff member's tasks; status control; retry on error
    CreateTaskModal.tsx         — RHF + Zod form, conditionally mounted
fe/src/features/admin/tasks.api.ts   — getTaskStats · getStaffTasks · createTask · updateTaskStatus
fe/src/types/task.ts                 — Task · StaffTaskStat · TaskBoardFilters · TaskStatus
```

**No Zustand store.** Per `FE_STATE.md §1`, Zustand is for cross-page client state; everything
here is either server state (Query) or single-page UI state (`useState` in `page.tsx`). The
reference reached the same conclusion — adopted deliberately, not by inheritance.

### 4.2 State ownership

| Data | Kind | Owner |
|---|---|---|
| `filters` (date, role, status, search) | page UI state | `page.tsx useState` — read by both query keys + the client filter |
| `expandedStaffId` | page UI state | `page.tsx useState` — single value ⇒ one row open at a time |
| `modalOpen` + `defaultStaffId` | page UI state | `page.tsx useState` — modal is conditionally mounted so the form resets each open |
| Day metrics + staff rows | server state | Query `['admin','tasks','stats', date]` |
| One staff member's tasks | server state | Query `['admin','tasks', staffId, date]` (lazy) |
| Staff dropdown list | server state | Query `['admin','staff']` (modal-local) |
| Create-form fields | local form state | RHF inside `CreateTaskModal` |

**The broadcast bus is the Query cache, not props.** A write invalidates keys; every
subscriber refetches itself. No callback carries data back up the tree.

**Filter split:** `date` is a **server** filter (it re-keys both queries). `role`, `status`,
`search` are **client** filters — a `useMemo` over `staffStats[]`, no network. This is why
`byStatus` must be in the DTO (§3.5).

### 4.3 Loading strategy

Per `FE_STATE.md`'s 3-tier policy, with all six reference loading gaps closed:

- **Route tier** — a `loading.tsx` **at this segment** whose skeleton mirrors the real
  layout (header bar, filter bar, 4 KPI card shapes, 6 table rows). The reference has only
  the generic admin spinner, so the page flashes an empty region on entry.
- **Component tier** — KPI cards render **skeleton blocks**, not the literal string `'…'`.
  The staff table renders **skeleton rows** during `statsLoading` instead of vanishing
  entirely (reference gap 3: the whole region unmounts, so the page jumps).
- **Expanded row** — skeleton rows, and on error an inline message **with a retry button**
  (reference has none: the user must collapse and re-expand).
- **Modal** — the staff `<select>` is `disabled` with a "Đang tải…" option while its query is
  in flight, so a manager cannot submit into an empty list.
- **Mutation** — pessimistic. Submit button shows "Đang tạo…" and disables; the status control
  disables during its PATCH. No optimistic update: per `FE_STATE.md`, optimistic is cart-only.

**Named render branches** (the reference conflates several of these):

| Branch | Condition | Render |
|---|---|---|
| `loading` | stats query in flight | KPI + table skeletons |
| `error` | stats query failed | error panel + retry |
| `empty-day` | loaded, zero tasks that day | "Chưa có công việc nào cho ngày này" + *Giao việc* CTA |
| `empty-filter` | loaded, tasks exist, filter yields zero rows | "Không có nhân viên khớp bộ lọc" + *Xoá bộ lọc* |
| `ready` | rows > 0 | the table |

`empty-day` vs `empty-filter` are **separate branches with different copy and different
actions** — the reference shows one string for both, so a mis-set filter looks like an empty day.

### 4.4 Page behaviors (numbered → these become the acceptance criteria)

1. Entering the page loads today's date by default; the date filter shows it.
2. Changing the date re-keys both queries; KPIs and table refetch for the new day.
3. The four KPIs read `metrics` and show **real** counts — including non-zero
   `completedTasks`/`inProgressTasks`/`overdueTasks` once statuses move (§3.6).
4. The staff table lists **every active staff member**, including those with zero tasks.
5. Clicking a row expands it and lazily fetches that member's tasks for the selected date.
6. Expanding a second row collapses the first (one open at a time).
7. An expanded row shows name · description · priority · time · status · notes.
8. Changing a task's status from the expanded row calls endpoint 4 and refreshes both keys.
9. An illegal status transition surfaces the 409 as a toast; the control reverts.
10. **+ Giao việc** opens the modal with no staff pre-selected; the per-row button opens it
    pre-selected to that row's staff member.
11. Submitting the modal POSTs, closes on 201, toasts success, and refreshes the KPIs, the
    staff row counts, and the expanded list if that member is open.
12. Creating a task for a date **other than** the filtered one still refreshes the visible
    KPIs (both dates invalidated — §3.3).
13. A bad `staffId` yields a 422 with a field-level message in the modal, never a 500 toast.
14. `role` / `status` / `search` filter the table **client-side with no refetch**, and the
    status filter genuinely works for all four values.
15. The empty day and the filtered-to-zero cases show different messages and different actions.
16. An expanded-row load error shows an inline retry that refetches in place.
17. Stats auto-refresh every 60 s while the page is mounted.
18. A non-manager reaching the route gets 403 from every endpoint and an access-denied state.

---

## 5. Task mapping

| TASKS.md row | This plan's slice | Receipt type |
|---|---|---|
| AD-0 (new) | `staff_tasks` migration + sqlc queries; promote the table into `DB_SCHEMA.md` | migration up→down→up |
| AD-1 (new) | BE reads: endpoints 1 + 2, incl. derived `isOverdue` / `byStatus` | curl transcripts (populated day, empty day, bad date) |
| AD-2 (new) | BE writes: endpoints 3 + 4, transition machine, 422 staff pre-check | curl (create 201, each transition, 409 illegal, 422 bad staff) |
| AD-3 (new) | FE read half: route + skeletons + KPIs + table + expand | screenshot per §4.3 branch |
| AD-4 (new) | FE write half: modal + status control + invalidation | screenshot: create → KPIs move |

These five rows are registered when the AD phase opens — this plan is the F-22 deliverable,
not the implementation. `OVERALL_PLAN.md` owns phase sequencing; `TASKS.md` owns status.

---

## 6. Reference defects designed out

| # | Reference finding | Severity | Countermeasure here |
|---|---|---|---|
| 1 | `status` write-once `pending` — no UPDATE query, no route, no job exists. 3 of 4 KPIs, completion %, quality stars and the overdue highlight are permanently 0/false on a live DB | 🔴 | Endpoint 4 `PATCH /admin/tasks/:id/status` + the §3.6 transition machine. Status is reachable from the UI (behavior 8) |
| 2 | `overdue` stored as an enum value nothing ever sets | 🔴 | Not stored — derived read-side from `due_at < NOW()` (§3.6). No sweeper job needed |
| 3 | `qualityScore = completionRate / 20`, presented as an independent "Chất lượng ★/5.0" metric with no stored quality signal | 🟠 | Dropped from the DTO and the UI |
| 4 | Invalid `assigned_to` → FK reject → mapped to 500 `INTERNAL_ERROR`; dead `ErrNoRows` branch above it | 🟡 | Pre-validate active staff → 422 `VALIDATION_FAILED` with a field message (behavior 13) |
| 5 | Create invalidates only `task.dueDate`; KPIs go stale when it ≠ `filters.date` | 🟡 | Invalidate both dates (§3.3, behavior 12) |
| 6 | Status filter offers 4 values, only `overdue` is wired — and it is always false | 🟡 | `byStatus` counts in the stats DTO; all four values filter for real (behavior 14) |
| 7 | Sibling todo-list "edit" mode calls `createTask` → inserts a duplicate row instead of updating | 🟡 | No edit mode ships until a real `PATCH /admin/tasks/:id` exists (§3.1 deferred) |
| 8 | `description` is stored and round-trips through the DTO but no page renders it | 🟡 | Rendered in the expanded row (behavior 7) |
| 9 | `dueTime` mandatory at create but the display column reads the *optional* `dueTimeStart/End`, so it can show "—" | 🟡 | Display the `due_at` clock component; the window is genuinely optional (§3.4) |
| 10 | No `loading.tsx` at the segment; KPI loading is the literal string `'…'`; the table region unmounts entirely during load | 🟡 | Segment `loading.tsx` + skeletons everywhere (§4.3) |
| 11 | One empty-state string for both "no tasks today" and "filter yielded zero" | 🟡 | Two named branches, two messages, two actions (§4.3) |
| 12 | Expanded-row error has no retry; user must collapse and re-expand | 🟡 | Inline retry button (behavior 16) |
| 13 | Modal staff `<select>` has no loading state — submittable while empty | 🟡 | Disabled + "Đang tải…" until resolved (§4.3) |

---

## 7. Decisions + flags

**✅ Decided**

1. `overdue` is derived, never stored — 4-value stored enum (§3.6).
2. `qualityScore` does not ship. If the owner wants a quality metric, it needs a real captured
   signal (a per-task rating at completion) — that is a new feature, not a rescaled percentage.
3. No Redis for the task domain — `ARCHITECTURE.md §4` applied, not an oversight.
4. v1 ships create + status-change. Edit and delete are deferred (§3.1) rather than shipped
   half-working.
5. Admin surface uses the neutral F-7 `design-system.html` tokens (`PAGE_PLAN_GUIDE.md §7`).
6. This plan owns the `/admin/tasks` BE contract; the F-20 `admin_todo_list` plan links to it.

**⚠️ FLAG — task-id collision.** Two `TASKS.md` rows both claim **F-20** (`admin_training`
and `admin_todo_list`), written by parallel sessions sharing this working tree. Same class as
the three-way F-10 collision in `STATE.md` (Session 7). This plan took **F-22** to stay clear.
Someone must renumber one of the two F-20 rows.

**💡 SUGGESTION — staff have no surface to see their own tasks.** The reference assigns tasks
to a staff member but ships **no route** where that person can read them: both consumers of
`staff_tasks` are `manager+` gated. A manager can assign work the assignee cannot see in the
system. That is a product gap, not a bug, and it is **out of scope for this page** — but it
wants a decision before the AD phase closes. Cheapest fix: a `GET /me/tasks` endpoint plus a
panel on the staff surface.

**❓ CLARIFY — should completing a task be self-service?** Behavior 8 lets a *manager* move a
status. If the intent is that staff mark their own work done, that is the same missing surface
as the suggestion above, and endpoint 4's auth would widen from `manager+` to
"manager+ **or** the assignee". Defaulting to `manager+` only until the owner rules.

---

## 8. Verify plan

| Task | Receipt |
|---|---|
| AD-0 | `goose up` → `down` → `up` clean; `DB_SCHEMA.md` shows `staff_tasks` spec'd, not stubbed |
| AD-1 | curl: populated day, empty day, bad date → 400, non-manager → 403; a task past `due_at` shows `isOverdue: true` **without** any job running |
| AD-2 | curl: create → 201; each legal transition → 200; `completed`→`cancelled` → 409; unknown staff → 422; unknown id → 404 |
| AD-3 | screenshots: each §4.3 branch (loading / error / empty-day / empty-filter / ready) |
| AD-4 | screenshot: create a task for **tomorrow** while viewing **today** → today's KPIs still refresh (behavior 12) |

All receipts land in `harness/VERIFICATION.md`.

---

*Written 2026-07-19 (F-22) from `reference/docs/system/08_pages/admin/admin_task_board/`
(7 docs: page, `_be`, `_loading`, `_crosscomponent_dataflow`, `_crosspage_dataflow`,
`TASK_BOARD_BUGS`, scenario), digested the same day. Rules live in the docs named in §2 —
this plan links them, never restates them.*
