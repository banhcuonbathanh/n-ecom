# Admin Staff — Cross-Page & Cross-Device Data Flow — `/admin/staff`

> **TL;DR:** ✅ implemented · A staff write on this page **outlives the page** in two server hubs:
> the **`staff` MySQL row** (single source of truth) and the **`auth:staff:<id>` Redis cache** that
> the auth middleware reads on every request. There is **no SSE/WS** for staff — every downstream
> surface is **pull-only** (REST + TanStack Query refetch). The four things a write changes
> elsewhere: (1) the **auth middleware** locks out a deactivated/deleted account on its next request
> (no 5-min lag — the cache is Del'd), (2) **login** accepts a freshly created account / rejects a
> disabled one, (3) the **todo-list & task-board assignee dropdowns** (`GET /staff`) gain/lose the
> person, (4) **staff-performance** (A2 Summary) reports against the same rows. Cross-device sync
> between two managers is "tab-back-to-refetch", not live.
>
> **Sources:** [`admin/staff/page.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/page.tsx) ·
> [`admin.api.ts:92-108`](../../../../../fe/src/features/admin/admin.api.ts) ·
> [`staff_service.go`](../../../../../be/internal/service/staff_service.go) ·
> [`middleware/auth.go:55`](../../../../../be/internal/middleware/auth.go) ·
> [`auth_service.go:315-383`](../../../../../be/internal/service/auth_service.go) ·
> consumers [`todo-list/.../TodoPageClient.tsx:37`](../../../../../fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx) ·
> [`task-board/.../CreateTaskModal.tsx:41`](../../../../../fe/src/app/(dashboard)/admin/staff/task-board/components/CreateTaskModal.tsx).
> **Siblings:** [admin_staff.md](admin_staff.md) · [admin_staff_be.md](admin_staff_be.md) ·
> [admin_staff_loading.md](admin_staff_loading.md). **RBAC:** [BUSINESS_RULES.md §1](../../../02_spec/BUSINESS_RULES.md).

---

## 0. The whole picture on one diagram

```
   BROWSER (manager A's tab)                 THE WIRE              SERVER
 ┌─────────────────────────────┐          (REST only —      ┌──────────────────────────────┐
 │ TanStack cache              │           no SSE/WS)        │  staff MySQL row  ◀── single  │
 │  ['admin','staff']  (list)  │  ──POST/PATCH/DELETE──▶     │   source of truth             │
 │  ['admin','staff',id] (one) │  ◀──{data}/{message}──      │   (soft-delete: deleted_at)   │
 │ auth store: current user    │                            │                               │
 │  (memory only, no persist)  │  ──GET /staff (refetch)──▶  │  auth:staff:<id> Redis cache  │
 └─────────────────────────────┘    on focus / invalidate   │   'active'/'disabled' 5-min   │
            ▲                                                │   ▲ Del'd on status/delete    │
            │ refetchOnWindowFocus + staleTime:0             └───┼──────────────────────────-─┘
            │ (pull — no push)                                   │ read on EVERY authed request
            │                                                    ▼
   ┌────────┴─────────┐                              ┌───────────────────────────┐
   │ manager B's tab  │  same pull model             │ auth middleware (auth.go) │ → 401 if disabled
   │ todo-list / task │  GET /staff dropdown         │ login (GetStaffByUsername)│ → ok / ErrAccountDisabled
   │ -board dropdowns │                              │ staff-performance (A2)    │ → KPI rows
   └──────────────────┘                              └───────────────────────────┘
```

No persisted browser hub: the staff list is **not** in localStorage and **not** in a Zustand store —
it lives only in this tab's TanStack cache and is re-fetched from MySQL on demand. F5 = full re-fetch.

---

## 1. The state every consumer renders against

A staff row's two fields that ripple outward:

- **`is_active`** — the gate the auth middleware enforces. Flipping it (endpoint 5) is the only
  staff write with a *real-time-ish* downstream effect, because the Redis `Del` forces the
  middleware's next `IsStaffActive` read to hit MySQL.
- **`deleted_at`** — soft-delete (endpoint 6). Every staff query filters `deleted_at IS NULL`, so a
  deleted row vanishes from **all** lists (this page, dropdowns, performance) at once; it does **not**
  cascade to `refresh_tokens` (see [be Flag 6](admin_staff_be.md)).

`role`, `full_name`, `shifts`, etc. ripple only through the list/dropdown reads — no auth effect.

---

## 2. The moment of handoff — what this page leaves behind

On a successful mutation the page calls `qc.invalidateQueries(['admin','staff'])` (`page.tsx:67`),
which refreshes **only this tab's** list. The durable handoff is entirely server-side:

| Write | Server effect that outlives the page |
|-------|--------------------------------------|
| `POST /staff` | new `staff` row, `is_active=1` → immediately log-in-able + assignable |
| `PATCH /staff/:id` | row mutated (name/role/shifts/contact) → next read everywhere reflects it |
| `PATCH /staff/:id/status` | `is_active` flipped **+ `auth:staff:<id>` Del'd** → middleware re-checks on next request |
| `DELETE /staff/:id` | `deleted_at` set **+ cache Del'd** → row disappears from every list; account locked out |

---

## 3. Downstream surface — Auth middleware (every authenticated request)

The middleware calls `checker.IsStaffActive(claims.Subject)` on each request (`auth.go:55`), which
reads `auth:staff:<id>` from Redis (5-min TTL) and falls back to a DB read on miss
(`auth_service.go:315-317`). Because endpoints 5 & 6 **Del** that key, the *very next* request from
the affected staff re-reads MySQL and sees `is_active=0` / soft-deleted → **lockout is immediate, not
TTL-delayed** (the explicit guarantee in `auth_service_test.go:320`, Spec1 §4.3 AC-10). Fail-open: if
Redis is down, `IsStaffActive` returns `true` (REDIS_CACHE.md:71), so a just-disabled staff could act
until their access token expires — the deliberate availability trade-off.

## 4. Downstream surface — Login (`POST /auth/login`)

A staff created here can immediately authenticate: login reads `GetStaffByUsername` and checks
`is_active`. A deactivated account fails login / refresh with `ErrAccountDisabled`
(`auth_extra_test.go:78`). This is the loop that makes "create cashier → they log in at `/login` →
land on `/pos`" work end-to-end (see [staff_login crosspage](../../staff/staff_login/staff_login_crosspage_dataflow.md)).

## 5. Downstream surface — Task assignment dropdowns (`GET /staff`)

The **todo-list** (`TodoPageClient.tsx:37`) and **task-board** (`CreateTaskModal.tsx:41`) assignee
pickers call the same `listStaff`. So:
- A newly created staff appears as an assignable target on next dropdown open.
- A **deactivated** staff still appears (the list filters only `deleted_at IS NULL`, not
  `is_active`) → a manager can assign a task to a disabled account (Flag 1).
- A **deleted** staff disappears from the dropdown, but any `staff_tasks` already assigned to them
  keep the FK (no cascade on soft-delete) → orphaned-looking task rows (cross-links to the
  task-board's "no staff-facing task view" gap, [TASK_BOARD_BUGS.md](../admin_task_board/TASK_BOARD_BUGS.md)).

## 6. Downstream surface — Staff performance (A2 Summary)

`GET /admin/staff-performance` (a *different* endpoint, [admin_summary_be.md](../admin_summary/admin_summary_be.md))
aggregates orders by `created_by` against these staff rows. Note this page's own
`performance_score` is a hardcoded `0` stub ([be Flag 8](admin_staff_be.md)) — the real per-staff
KPIs live only on A2, not here.

---

## Multi-device sync — one edit, N screens

No push. If manager A deactivates a cashier, manager B's open `/admin/staff` tab keeps showing the
stale row until B's tab regains focus (`refetchOnWindowFocus: true` + `staleTime: 0`,
`page.tsx:45-46`) or B navigates. The **affected cashier's** own device, by contrast, is cut off on
its very next API call (auth middleware, §3) — so the enforcement is live for the target even though
the *admin views* are pull-only.

## Reverse / cancellation flows

- **Reactivate:** `PATCH /staff/:id/status {is_active:true}` — same path, re-Dels the cache, login
  works again. The FE confirms before re-activating (`page.tsx:122-124`).
- **No un-delete:** soft-delete has no UI inverse; restoring a deleted account needs a DB edit.
- **No self-harm:** you cannot deactivate or delete your own account (`SELF_DEACTIVATION_FORBIDDEN` /
  `ErrInsufficientRole`, [be §5/§6](admin_staff_be.md)); the FE also disables the self toggle/delete
  (`StaffTable.tsx:64,126`).

## End-to-end timeline (create → use → disable)

```
Manager A  POST /staff (cashier "an")           → staff row, is_active=1
   │
   ▼
"an"      /login  → GetStaffByUsername ok        → access JWT, lands /pos
   │
   ▼  (works for hours — middleware reads auth:staff:an = 'active')
Manager A  PATCH /staff/an/status {false}        → is_active=0 + Del auth:staff:an
   │
   ▼
"an"      next /pos API call → middleware IsStaffActive → MISS → DB read=false → 401
Manager B  (tab focus) GET /staff refetch        → sees "an" as Vô hiệu
```

## Reload (F5) behaviour per page

| Page | On F5 |
|------|-------|
| `/admin/staff` (this) | Auth re-check (guards), then `GET /staff?limit=100` re-fetch — no cached list survives (no persist) |
| todo-list / task-board | Re-fetch `GET /staff` for the dropdown on next open |
| affected staff's app | Their token is in memory only → F5 forces re-auth; if disabled, login/refresh fails |

## Durability matrix

| Datum | Survives F5? | Survives logout? | Home |
|-------|--------------|------------------|------|
| staff list (`['admin','staff']`) | ❌ refetched | ❌ | TanStack cache (memory) |
| `staff` row | ✅ | ✅ | MySQL (single source) |
| `auth:staff:<id>` | ✅ until TTL/Del | ✅ | Redis (derived from MySQL) |
| current user identity | ❌ (memory) | ❌ | auth store |

## Source & rule map

- Write paths + guards → [admin_staff_be.md](admin_staff_be.md) (endpoints 3-6).
- Auth middleware read → `be/internal/middleware/auth.go:55` + `auth_service.go:315-383`.
- is_active cache contract → [REDIS_CACHE.md:42,71,77](../../../03_be/REDIS_CACHE.md).
- RBAC hierarchy → [BUSINESS_RULES.md §1](../../../02_spec/BUSINESS_RULES.md).
- Assignee-dropdown consumers → [admin_task_board_be.md](../admin_task_board/admin_task_board_be.md) ·
  [admin_todo_list_be.md](../admin_todo_list/admin_todo_list_be.md).
