# Admin To-Do List — Consolidated FE + BE Build Plan (F-20)

> **TL;DR.** `/admin/todo-list` is the manager's **plan-the-shift** screen: read a per-date
> stats board, drill into one staff member, and — the part no other page owns — **author
> tasks** through a create/edit modal. It is `manager+` only, pull-only (no realtime), and
> reads MySQL directly (no Redis).
>
> **This page is the sibling of `/admin/staff/task-board` (F-22) and shares its entire data
> layer.** The `staff_tasks` table, endpoints 1–3 + 5, the status transition machine and the
> cache map are **owned by** [`../admin_task_board/admin_task_board_PLAN.md`](../admin_task_board/admin_task_board_PLAN.md)
> and promoted into [`../../DB_SCHEMA.md §4.7`](../../DB_SCHEMA.md). This plan **links them and
> re-derives nothing.** What it owns: the two-view shell, the filter bar, the authoring modal,
> and the one new endpoint that authoring requires (`PATCH /admin/tasks/:id`, §3.1).
>
> Visual companions: [`admin_todo_list_plan.html`](admin_todo_list_plan.html) ·
> [`admin_todo_list_how-it-works.html`](admin_todo_list_how-it-works.html) ·
> [`admin_todo_list_mockup-1.html`](admin_todo_list_mockup-1.html).
> Source digested: `reference/docs/system/08_pages/admin/admin_todo_list/` (10 docs), 2026-07-19.
> **One fact one home:** rules live in the docs named in §2; this file owns only this page's plan.

---

## 1. What the page is

| | |
|---|---|
| Route | `/admin/todo-list` ("Danh sách Công Việc") |
| Surface | Admin — **neutral F-7 tokens** ([`design-system.html`](../../diagrams/design-system.html)), *not* the customer dark/orange shell |
| Auth | `manager+` on every endpoint; `AuthGuard` + `RoleGuard minRole=MANAGER` on the shell |
| Realtime | **None.** Pull-only — invalidate-on-write + `staleTime` expiry |
| Server cache | **None.** Direct MySQL ([`ARCHITECTURE.md §4`](../../ARCHITECTURE.md) scopes Redis to catalog + auth) |

**Core loop.** Manager opens the page at shift start → reads the day's rollup and who is behind
→ assigns the day's work → drills into one person to check their list.

**Two mutually exclusive views**, keyed on whether a staff member is selected:

- **View A — stats board** (`staffId == null`, the landing state): 4 KPI cards + a per-staff
  completion table. Clicking a staff row selects them → flips to View B.
- **View B — task list** (`staffId != null`): that person's tasks for the date, as a table on
  `md+` and cards below.

**In/out links.** In: admin shell tab nav. Out: the same `staff_tasks` rows surface on
[`/admin/staff/task-board`](../admin_task_board/admin_task_board_PLAN.md) — handoff is
**server-side pull-only**, no shared client state.

### 1.1 ⚠️ FLAG — this page overlaps `admin_task_board` by ~80%

Both pages are `manager+`, read the same four endpoints, render the same KPI rollup and the same
per-staff drill-down. The **only** capability unique to `/admin/todo-list` is **task authoring**
(the create/edit modal); the only capability unique to `/admin/staff/task-board` is **status
advancement** (`PATCH /admin/tasks/:id/status`). Two pages, one dataset, split by verb.

Recorded as a flag, not resolved here — see §7 `⚠️ FLAG 1` for the three options and the
recommendation. **No code is affected until the owner rules**, because both plans build against
the same contract either way.

---

## 2. Alignment — concern → owning doc (READ, don't restate)

| Concern | Owning doc |
|---|---|
| `staff_tasks` columns, indexes, soft delete | [`DB_SCHEMA.md §4.7`](../../DB_SCHEMA.md) (promoted by F-22) |
| Endpoints 1–3, 5 · wire shapes · status machine · cache map | [`admin_task_board_PLAN.md §3`](../admin_task_board/admin_task_board_PLAN.md) |
| Error-code enum, tx policy, validation tiers, handler/service split | [`BE_STATE.md`](../../BE_STATE.md) |
| sqlc/goose workflow, migration checklist, Go/Gin gotchas | [`BE_PLAYBOOK.md`](../../BE_PLAYBOOK.md) |
| State kinds, query-key factory, loading tiers, FE hard rules | [`FE_STATE.md`](../../FE_STATE.md) |
| Tokens, buttons, forms, modal/overlay specs | [`design-system.html`](../../diagrams/design-system.html) |
| Redis scope, layer contracts, alignment gates | [`ARCHITECTURE.md`](../../ARCHITECTURE.md) |
| AD-phase scope and roadmap | [`OVERALL_PLAN.md §AD`](../../OVERALL_PLAN.md) |
| Page-plan format itself | [`PAGE_PLAN_GUIDE.md`](../PAGE_PLAN_GUIDE.md) |

---

## 3. BE plan

### 3.1 Endpoints

**Four are borrowed, one is new.** Borrowed endpoints are listed for traceability only — their
contract, wire shape and phase live in [`admin_task_board_PLAN.md §3.1/§3.5`](../admin_task_board/admin_task_board_PLAN.md).

| # | Route | Auth | Task | Owned by | Used for |
|---|---|---|---|---|---|
| 1 | `GET /admin/tasks/stats?date=` | manager+ | AD-1 | F-22 | View A — KPI cards + per-staff table |
| 2 | `GET /admin/tasks?staffId=&date=` | manager+ | AD-1 | F-22 | View B — one staff member's day |
| 3 | `POST /admin/tasks` | manager+ | AD-2 | F-22 | Modal, `create` mode |
| 5 | `GET /staff?limit=100` | manager+ | (staff domain) | staff-domain plan | Assignee dropdown + stat-row names |
| **6** | **`PATCH /admin/tasks/:id`** | **manager+** | **AD-3** | **← this plan** | **Modal, `edit` mode — the page's reason to exist** |

> Endpoint 4 (`PATCH /admin/tasks/:id/status`) exists in the contract but this page does not
> call it — status advancement is the task-board's verb. Listed here only so the numbering
> matches the sibling plan.

#### Endpoint 6 — `PATCH /admin/tasks/:id` (new, owned here)

**Why this plan promotes it.** F-22 deferred field-editing as "a pure additive follow-up" —
correct for a board that only advances status. But this page's modal *is* create **and edit**;
the reference shipped that edit button wired to `POST`, so every edit **silently inserted a
duplicate** with no delete button to undo it (🔴 `TODO_BUGS.md` Bug 1 — their own
recommended-first fix). Shipping the button without the endpoint reproduces the bug; shipping
the page without the button leaves it a create-only form the sibling board already outclasses.
So the endpoint lands with the page that needs it.

| Aspect | Spec |
|---|---|
| Route | `PATCH /admin/tasks/:id` under the existing `manager+` `/admin` group |
| Body | Partial: `{ name?, description?, priority?, dueAt?, dueTimeStart?, dueTimeEnd?, notes? }` — every field optional; absent = unchanged |
| Not settable | `status` (endpoint 4 owns it) · `assignedBy` (JWT-stamped, immutable) · `assignedTo` (**see ruling below**) |
| Validation | Same tier-1 rules as create: `name` 1–200, `priority ∈ {high,medium,low}`, `dueAt` RFC3339. Empty body → `422 VALIDATION_FAILED` |
| Not found / soft-deleted | `404 NOT_FOUND` (filter `deleted_at IS NULL`) |
| Response | `200` + the full updated task object (same shape as endpoint 2's array element) |
| Side effects | `updated_at` refreshed. **No** `completed_at` write — that is endpoint 4's job |

**Ruling — `assignedTo` is not patchable.** Re-assigning a task is a different intent from
correcting its fields, and it silently moves a row between two people's boards. v1 = cancel +
re-create. Revisit if the owner asks for hand-off. *(Simplicity first; recorded so it is a
decision, not an omission.)*

**Still deferred:** `DELETE /admin/tasks/:id`. The `deleted_at` column exists from day one
(F-22 §3.2), so soft delete stays a pure additive follow-up. Not shipped because nothing in
this page's flow requires it once edit works correctly — the reference only needed a delete to
clean up the duplicates its broken edit created. **Fix the cause, not the symptom.**

### 3.2 Schema depended on

`staff_tasks` — **already promoted** into [`DB_SCHEMA.md §4.7`](../../DB_SCHEMA.md) by F-22.
This plan adds **no columns**: `PATCH` writes only existing ones (`title`, `description`,
`priority`, `due_at`, `due_time_start`, `due_time_end`, `notes`, `updated_at`).
Also read: `staff` (id, full_name, role, is_active) for the dropdown and stat rows.

### 3.3 Cache map

Server: **none** (§1). Client (TanStack Query) — keys and staleTimes are
[F-22 §3.3](../admin_task_board/admin_task_board_PLAN.md); this plan adds one invalidation row:

| Write | Invalidates |
|---|---|
| `PATCH /admin/tasks/:id` (endpoint 6) | `['admin','tasks', staffId, date]` **and** `['admin','tasks','stats', date]` — for **both** the task's old `dueDate` and the currently-filtered date |

**Both dates, always.** F-22 designed this rule out of the reference for create; editing makes
it sharper — a patch that *moves* a task's due date changes the KPI rollup on two different
days. Invalidating only the new date leaves yesterday's board stale.

### 3.4 Not adopted — reference choices rejected

F-22 §3.4 already rules on the shared contract (stored `overdue`, `qualityScore`, error codes,
FK→500). Those rulings **apply here unchanged and are not repeated**. This plan adds:

| Reference choice | Ruling | Why |
|---|---|---|
| "Edit" mode wired to `POST /admin/tasks` | **Rejected** — endpoint 6 | Silent duplicate insert on every edit; their own 🔴 Bug 1 |
| Status `<select>` in the filter bar that is never sent | **Rejected** — filter client-side (§4.4 b7) | A control that does nothing is worse than no control. Data is already in hand |
| Status filter omitting `in_progress` | **Rejected** — offer all 5 | `in_progress` is a real status shown in the KPI cards; excluding it from the filter is an oversight, not a design |
| `Từ ngày / Đến ngày` range + 90-day guard, server single-day | **Rejected** — one date picker | Server is `WHERE DATE(due_at)=?` by design. We remove the input rather than fake a range (their own Bug 3: "removing is the smaller, safer change") |
| `notes` in the payload with no input rendered | **Rejected** — render the field | Either surface it or drop it. The column exists and the expanded row shows it |
| `dueTime` mandatory at create | **Rejected** — follow F-22 | Reference forces a time then displays the *optional* window, so a forced value can render "—" |
| Single shared skeleton for both views | **Rejected** — per-view skeletons (§4.3) | One 7-row skeleton for a 4-card board *and* a table guarantees layout shift |

### 3.5 Wire shapes

Endpoints 1, 2, 3, 5 → [F-22 §3.5](../admin_task_board/admin_task_board_PLAN.md). New here:

**6 · `PATCH /admin/tasks/3a7e…` → 200**

```jsonc
// request — partial; only what changed
{ "name": "Kiểm kê nguyên liệu tủ 2", "priority": "medium", "dueAt": "2026-07-19T14:00:00Z" }
```

```json
{
  "data": {
    "id": "3a7e…", "staffId": "8f1c…", "name": "Kiểm kê nguyên liệu tủ 2",
    "description": "Đếm tồn kho tủ lạnh 2", "priority": "medium", "status": "in_progress",
    "isOverdue": false, "dueDate": "2026-07-19", "dueAt": "2026-07-19T14:00:00Z",
    "dueTimeStart": null, "dueTimeEnd": null, "notes": "Báo lại quản lý sau khi xong",
    "completedAt": null, "assignedBy": "b2d0…", "updatedAt": "2026-07-19T09:20:00Z"
  }
}
```

Nullable columns serialize as real `null`, never `""` (F-16 wire rule). Error envelope →
[`BE_STATE.md §4`](../../BE_STATE.md).

---

## 4. FE plan

### 4.1 Route + file map

```
fe/src/app/(dashboard)/admin/todo-list/
├── page.tsx                        # thin server shell → <TodoPageClient/>
├── loading.tsx                     # ← NEW: route skeleton (reference had none)
└── components/
    ├── TodoPageClient.tsx          # owns filters · modal state · the A/B view switch
    ├── TodoFilterBar.tsx           # staff · date · status  (no date range — §3.4)
    ├── TodoStatsBoard.tsx          # View A: KPI cards + per-staff table
    ├── TodoTaskTable.tsx           # View B, md+
    ├── TodoTaskCard.tsx            # View B, <md
    ├── TaskFormModal.tsx           # create + edit; branches on mode (§4.4 b5)
    ├── TodoStatsSkeleton.tsx       # ← NEW: mirrors the card+table layout
    └── TodoTasksSkeleton.tsx       # ← NEW: mirrors the table layout
fe/src/hooks/useAdminTasks.ts       # shared with task-board — useTaskStats · useStaffTasks
                                    #   · useCreateTask · useUpdateTask ← NEW
```

**Shared, not duplicated:** the hooks file and `TaskStatusBadge` are the same modules the
task-board uses. Per [`FE_STATE.md §9`](../../FE_STATE.md) there is one query-key factory —
this page must not invent a second key shape for the same data.

### 4.2 State ownership

| Data | Kind | Owner |
|---|---|---|
| `filters` (staffId · date · status) | UI state | `TodoPageClient` `useState` — **not** the URL in v1 (see ⚠️ FLAG 2) |
| `modalOpen` · `editTask` | UI state | `TodoPageClient` `useState` |
| Task stats for a date | Server cache | TanStack Query `['admin','tasks','stats',date]` |
| One staff member's tasks | Server cache | TanStack Query `['admin','tasks',staffId,date]` |
| Staff list | Server cache | TanStack Query `['admin','staff']` |
| Form field values | Form state | RHF + Zod inside `TaskFormModal` |
| Selected staff | **Derived** | `filters.staffId` — the A/B switch reads it; never stored twice ([`FE_STATE.md §9`](../../FE_STATE.md) derived-not-stored) |

No Zustand: nothing here crosses a route boundary.

### 4.3 Loading strategy — named branches

The reference conflated **loading / empty / error** into "render nothing" (its `loading.md`
Flags 1–2: a failed stats fetch renders a blank page section; a failed task fetch renders the
*empty* state). Every branch is named and distinct here:

| View | `isLoading` | `isError` | empty | success |
|---|---|---|---|---|
| A — stats | `<TodoStatsSkeleton/>` (4 card blocks + table rows) | error panel + **Thử lại** | "Chưa có công việc nào cho ngày này" + **+ Tạo công việc** CTA | cards + table |
| B — tasks | `<TodoTasksSkeleton/>` (table rows) | error panel + **Thử lại** | "Không có công việc nào cho bộ lọc này" — **one string, both viewports** | table / cards |
| dropdown | disabled `<select>` + "Đang tải…" | disabled + "Không tải được nhân viên" | — | populated |

Route tier: `loading.tsx` added (reference had none → blank flash on navigation).
Background refetches use `isFetching`, never `isLoading` — the skeleton must not flash on a
`staleTime` expiry.

### 4.4 Page behaviors — the acceptance criteria

1. Landing with no staff selected renders **View A**; the tasks query does **not** fire
   (`enabled: !!staffId`).
2. Clicking a per-staff row sets `filters.staffId` → flips to **View B** → the tasks query
   fires for the first time; the filter-bar dropdown reflects the selection.
3. Clearing the staff selection returns to **View A**.
4. **+ Tạo công việc** (manager+ only) opens the modal in `create` mode; submit `POST`s,
   closes on 201, and both KPI cards and the visible list refresh with no page reload.
5. **✏️** opens the modal in `edit` mode pre-filled; submit `PATCH`es endpoint 6 and **updates
   the row in place — the list length does not change.** (The reference's 🔴 Bug 1, inverted
   into an AC.)
6. Editing a task's due date to another day updates the KPI rollup on **both** the old and the
   new date (§3.3).
7. The status filter narrows the visible list, including `in_progress`; every option changes
   what is rendered.
8. Changing the date refetches both views for that date.
9. A non-manager reaching the route is blocked by `RoleGuard`; the create/edit affordances are
   absent, and the BE rejects a forged call with `403`.
10. Every loading / empty / error branch in §4.3 is reachable and visually distinct.
11. `description` and `notes` entered in the modal are persisted and rendered back.
12. A `PATCH` against a deleted task surfaces the `404` as an inline modal error, not a blank.

---

## 5. Task mapping

| TASKS.md row | Slice | Receipt |
|---|---|---|
| AD-1 | Endpoints 1–2 + `staff_tasks` migration | *(F-22 — shared, not rebuilt here)* |
| AD-2 | Endpoints 3–4 | *(F-22 — shared)* |
| **AD-3** | **Endpoint 6 `PATCH /admin/tasks/:id`** + sqlc query + service validation | curl: patch one field → 200 changed; empty body → 422; unknown id → 404 |
| **AD-4** | FE `/admin/todo-list` — shell, filter bar, View A/B switch, skeletons | screenshot: View A, View B, each loading/empty/error branch |
| **AD-5** | FE `TaskFormModal` create + edit wired to 3 and 6 | screenshot: edit changes a row in place, list length unchanged (b5) |

Rows AD-3…AD-5 are **not yet in `TASKS.md`** — they belong to the AD phase, which opens after
Phase F. Registered when AD opens, per the sizing rule (1–2 files + 1 AC each).

---

## 6. Reference defects designed out

| # | Finding (reference) | Sev | Countermeasure |
|---|---|---|---|
| 1 | "Edit" calls `POST` → **duplicate row**, no delete to undo | 🔴 | Endpoint 6 `PATCH` + modal branches on mode (§3.1, b5) |
| 2 | Status filter never sent to the server — control does nothing | 🟠 | Client-side filter over data already in hand (§4.4 b7) |
| 3 | Date-range inputs + 90-day guard, but server is single-day | 🟠 | Range removed; one date picker matching the real contract (§3.4) |
| 4 | Bad `staffId` on create → `500` | 🟡 | Pre-validate staff exists + is active → `422 VALIDATION_FAILED` (F-22 §3.4) |
| 5 | `in_progress` missing from the filter though shown in KPIs | 🟠 | All 5 options offered (§3.4) |
| 6 | `notes` in schema + payload, **no input rendered** — always `undefined` | 🟠 | Field rendered; value persisted and displayed (b11) |
| 7 | `qualityScore` returned, rendered nowhere; derived as `rate/20` | 🟡 | Dropped from the contract entirely (F-22 §3.4 — invented data) |
| 8 | Failed stats fetch → **blank page section**, no message | 🟠 | Named error branch + retry (§4.3) |
| 9 | Failed tasks fetch → renders the **empty** state (lies) | 🟠 | Error ≠ empty; separate branches (§4.3) |
| 10 | One 7-row skeleton for both views → layout shift | 🟡 | Per-view skeletons mirroring each layout (§4.3) |
| 11 | No `loading.tsx` → blank flash on navigation | 🟡 | Route-level skeleton added (§4.1) |
| 12 | Mobile and desktop show **different** empty-state copy | 🟡 | One string for one condition (§4.3) |
| 13 | Staff dropdown empty while loading, indistinguishable from "no staff" | 🟡 | Disabled + "Đang tải…" (§4.3) |
| 14 | `dueTimeStart/End` typed non-optional but empty at runtime | 🟡 | Real `null` + optional types (F-16 wire rule) |

---

## 7. Decisions + flags

**✅ Decided**

1. **Endpoint 6 `PATCH /admin/tasks/:id` ships with this page** — F-22 deferred it; authoring
   is this page's purpose and the button is unshippable without it (§3.1).
2. **`assignedTo` is not patchable** — re-assignment is a separate intent; v1 = cancel + re-create.
3. **`DELETE` stays deferred** — it existed in the reference's backlog only to clean up
   duplicates that endpoint 6 now prevents. `deleted_at` is ready when a real need appears.
4. **Date range removed, not implemented** — matches the real single-day server contract.
5. **Status filtering is client-side** — the day's rows are already loaded; a server round-trip
   would add a param to two endpoints for zero benefit at this data volume.
6. **Hooks and `TaskStatusBadge` are shared with the task-board**, not copied.

**⚠️ FLAG 1 — `admin_todo_list` and `admin_task_board` are ~80% the same page (§1.1).**
Options: **(a)** ship both as planned — two entry points, split by verb (author vs advance);
**(b)** merge into one `/admin/tasks` screen with authoring *and* status advancement;
**(c)** demote one to a link. **Recommendation: (b)** — one screen, both verbs, half the FE
surface, and no "which page do I open?" for the manager. Both plans build the identical
contract, so this is a **FE-only decision and can wait until AD opens** — no work is blocked
and nothing is wasted either way. Owner ruling requested before AD-4.

**⚠️ FLAG 2 — filters are component state, not URL state.** [`FE_STATE.md`](../../FE_STATE.md)
gives the URL ownership of filter/page/search on customer surfaces. Kept local here because an
admin day-view is not shared or deep-linked, and the reference had no URL sync either. If the
owner wants shareable filtered views ("look at Thu's overdue list"), promote
`?staffId=&date=&status=` to the URL — a contained change inside `TodoPageClient`.

**💡 SUGGESTION — the KPI cards should link, not just count.** Clicking "Quá hạn 2" filtering
the board to overdue staff is one `setFilters` call and turns a static readout into navigation.
Deferred to AD-4; noted so it is not lost.

**❓ CLARIFY — is `overdue` a filterable status?** It is *derived*, not stored (F-22 ruling), so
filtering by it means `isOverdue == true`, not `status == 'overdue'`. The UI should present all
5 chips uniformly; §4.4 b7 assumes yes. Flagging because it is a contract subtlety a future
implementer could get wrong.

---

## 8. Verify plan

| Task | Receipt → [`VERIFICATION.md`](../../VERIFICATION.md) |
|---|---|
| AD-3 | curl transcript: `PATCH` one field → 200 with changed value + fresh `updatedAt`; empty body → 422; unknown/soft-deleted id → 404; non-manager JWT → 403 |
| AD-4 | Screenshots: View A, View B, and each named branch of §4.3 (loading · empty · error) in both themes |
| AD-5 | Screenshot pair proving b5: task row before/after an edit — **values change, row count does not** |
| This plan (F-20) | Both HTML companions render in light + dark with no horizontal page scroll |

---

*Written by the engineer-in-charge, 2026-07-19, from
`reference/docs/system/08_pages/admin/admin_todo_list/` (10 docs) reconciled against the harness.
The shared task contract is owned by [`../admin_task_board/admin_task_board_PLAN.md`](../admin_task_board/admin_task_board_PLAN.md)
and [`../../DB_SCHEMA.md §4.7`](../../DB_SCHEMA.md) — linked, never restated. Rules live in the
docs listed in §2. This `.md` is the source of truth; the three HTML companions are snapshots
and lose on any conflict.*
</content>
