# Admin Staff Page — Consolidated FE + BE Build Plan (F-23)

> **TL;DR:** `/admin/staff` is the **staff-account roster** — the one screen where a
> manager creates, edits, deactivates and deletes staff logins. Six endpoints, all
> manager+ gated, plain CRUD over the `staff` table with three business guards
> (role-hierarchy, username-uniqueness, last-admin). It is the **account-lifecycle
> origin** of the whole platform: every staff JWT, every POS/KDS session, and every
> assignee dropdown downstream begins with a row created here.
>
> Visual companions: [`admin_staff_plan.html`](admin_staff_plan.html) ·
> [`admin_staff_how-it-works.html`](admin_staff_how-it-works.html) ·
> [`admin_staff_mockup-1.html`](admin_staff_mockup-1.html).
>
> **Source digested:** `reference/docs/system/08_pages/admin/admin_staff/`
> (`admin_staff.md` · `_be.md` · `_loading.md` · `_crosspage_dataflow.md`), digest
> date **2026-07-19**. The reference is a *north star, not a spec* — §3.4 and §6
> record every place we depart from it.
>
> **One fact one home:** this file owns the admin-staff page's scope, contract and
> behavior spec. Every *rule* it obeys lives in the doc named in §2 — linked, never
> restated.

---

## 1. What the page is

**Route:** `/admin/staff` · **Surface:** admin · **Gate:** staff JWT, role ≥ `manager`.

The roster screen. One table of every non-deleted staff account, with filters, and
four row actions (view · edit · toggle active · delete). Two overlays: an add/edit
modal and a detail drawer.

| | |
|---|---|
| **Entry paths** | admin shell tab nav → `/admin/staff`; deep link (filters restore from URL, §4.2) |
| **Core loop** | filter/search the roster → act on a row (edit / toggle / delete) or `+ Thêm nhân viên` → mutation → list refetches |
| **Links out** | none — this page is a leaf; its *effects* travel server-side (§4.5) |
| **Links in** | admin nav; (AD phase) task-board / to-do-list assignee pickers read the same list endpoint |

**Why it matters beyond itself.** A write here changes two server hubs that outlive
the page: the **`staff` MySQL row** (single source of truth) and the
**`auth:staff:<id>` Redis key** the auth middleware reads on every authenticated
request. Deactivating a cashier logs them out of the POS on their *next* API call.
That cross-surface consequence is the subject of §4.5 and of `_how-it-works.html §06`.

**Not in scope here** (separate plans, cross-link don't re-derive):
staff *login* (`staff_login`), per-staff KPIs (`admin_summary` —
`GET /admin/staff-performance` is a different endpoint), task assignment
(`admin_task_board` F-22 / `admin_todo_list` F-20), training progress
(`admin_training` F-20).

---

## 2. Alignment — what governs this page (read, don't restate)

| Concern | Owning doc |
|---|---|
| `staff` table columns, role enum, soft-delete×UNIQUE rename rule | [`DB_SCHEMA.md §4.4`](../../DB_SCHEMA.md) |
| Error-code enum + envelope shape | [`BE_STATE.md §4`](../../BE_STATE.md) |
| Transaction policy, validation tiers, auth identity as explicit params | [`BE_STATE.md §3, §5, §6`](../../BE_STATE.md) |
| goose+sqlc pipeline, migration checklist, Go/Gin gotchas | [`BE_PLAYBOOK.md §1–2`](../../BE_PLAYBOOK.md) |
| Redis policy (what may be cached at all) | [`ARCHITECTURE.md §4`](../../ARCHITECTURE.md) |
| FE state kinds, cache map, loading tiers, hard FE rules 1–14 | [`FE_STATE.md`](../../FE_STATE.md) |
| Neutral admin design tokens + component specs | [`diagrams/design-system.html`](../../diagrams/design-system.html) |
| Phase roadmap, lessons register | [`OVERALL_PLAN.md`](../../OVERALL_PLAN.md) |
| Page-plan format itself | [`PAGE_PLAN_GUIDE.md`](../PAGE_PLAN_GUIDE.md) |

**RBAC note.** The role *hierarchy* is a business rule with no harness home yet
(the reference keeps it in `BUSINESS_RULES.md §1`). This plan **proposes** the level
table in §3.6 and flags it (§7 ⚠️-2) for promotion into `OVERALL_PLAN.md §3` when the
S phase opens — so it gets one home rather than being copied into every staff page.

---

## 3. BE plan

### 3.1 Endpoints the page consumes (all under `/api/v1`)

Route group `/staff`, `authMW` + `AtLeast("manager")` on the whole group; the
`DELETE` sits in a nested group additionally requiring `AtLeast("admin")`.

| # | Route | Auth | Phase/task | Behavior |
|---|---|---|---|---|
| 1 | `GET /staff` | manager+ | S-3 | List, **server-filtered + server-paged**: `role`, `search`, `is_active`, `page`, `limit`. Returns `{data:[Staff], meta:{page,limit,total}}` |
| 2 | `GET /staff/:id` | manager+ | S-3 | One row + `updated_at`. 404 if missing or soft-deleted |
| 3 | `POST /staff` | manager+ | S-4 | Create. Guards: valid role → hierarchy → username unique → bcrypt → INSERT. 201 `{data:Staff}` |
| 4 | `PATCH /staff/:id` | manager+ | S-4 | Partial update. Only keys present in the body change (§3.7). Hierarchy guard on both current and new role. 200 `{data:Staff}` |
| 5 | `PATCH /staff/:id/status` | manager+ | S-4 | `{is_active:bool}`. Self-toggle blocked, hierarchy guard, **+ auth-cache invalidation + refresh-token revoke** (§3.3). Returns the full row |
| 6 | `DELETE /staff/:id` | **admin** | S-4 | Soft delete + username rename + last-admin guard + cache invalidation + token revoke. 200 `{data:{id}}` |

**Stats are derived, not fetched.** The reference's stats bar (total / per-role /
inactive counts) is computed client-side from the full list. With server-side paging
(§3.4-b) that becomes wrong — page 2 of 5 can't count the roster. So `GET /staff`
returns a `meta.counts` block (§3.5) computed in the same query as the total.
This is the one place we *add* to the reference contract rather than trim it.

### 3.2 Schema this page depends on

Owned by [`DB_SCHEMA.md §4.4`](../../DB_SCHEMA.md) — **not restated here.** The page
touches exactly two tables:

- **`staff`** — every column is read; `password_hash` is 🔒 **never serialized**
  (DB_SCHEMA §4.4). Writes: all columns except `id`/`created_at`.
- **`refresh_tokens`** — write-only from this page: rows for the target staff are
  **deleted** on deactivate and on delete (§3.3, the fix for reference Flag 6).

No migration is owned by this plan — `staff` lands with the S-phase auth task
(the same task that seeds the first `admin`, DB_SCHEMA §6 #14).

### 3.3 Cache & side-effect map (the S-4 acceptance criteria)

Per [`ARCHITECTURE.md §4`](../../ARCHITECTURE.md), Redis is catalog-cache +
auth-rate-limit only. **The staff roster is never read-cached** — every `GET /staff*`
hits MySQL. The only Redis touch is a *write*:

| Write | MySQL effect | Redis effect | `refresh_tokens` effect |
|---|---|---|---|
| `POST /staff` | INSERT, `is_active=1` | — | — |
| `PATCH /staff/:id` | UPDATE changed cols | — | — |
| `PATCH /staff/:id/status` | `is_active` flipped | **`DEL auth:staff:<id>`** | **DELETE all rows** when deactivating |
| `DELETE /staff/:id` | `deleted_at=NOW()` + username rename | **`DEL auth:staff:<id>`** | **DELETE all rows** |

The `DEL` forces the auth middleware's next `IsStaffActive` check to re-read MySQL,
so lockout is **immediate, not TTL-delayed**. Deleting the refresh-token rows closes
the reference's unrevoked-session hole (§6 row 6).

⚠️ **Fail-open is inherited, deliberately.** `IsStaffActive` returns `true` when Redis
is down (ARCHITECTURE §4), so a Redis blip briefly weakens the just-disabled lockout.
Availability-over-strictness, consistent with the rest of the platform — but now
bounded by the token revoke, which is a MySQL write and therefore blip-proof.

### 3.4 Not adopted from the reference BE (decided here)

| # | Reference did | We do | Why |
|---|---|---|---|
| a | Hand-written raw-SQL repo (`staff_repo.go`) | **goose + sqlc**, generated queries | [`BE_PLAYBOOK.md §1`](../../BE_PLAYBOOK.md) golden rule — no hand-rolled SQL layer |
| b | FE sends `?limit=100`, filters + paginates **client-side**; BE filter params exist but go unused | **Server-side** filter + page; FE sends `role`/`search`/`is_active`/`page`/`limit` from the URL | Kills the silent 100-row truncation (ref Flag 3) and honours [`FE_STATE.md §9 rule 2`](../../FE_STATE.md) (URL owns filter/page/search) |
| c | Error envelope `{"error":CODE,"message":…}` | Our `{"error":{code,message,details}}` | Session-0 contract, [`BE_STATE.md §4`](../../BE_STATE.md) |
| d | 9 page-specific error codes (`USERNAME_TAKEN`, `LAST_ADMIN`, …) | Mapped onto our 9-code enum + a `details[].issue` discriminator (§3.6) | One enum for the whole platform; see ⚠️-1 |
| e | Dead self-service guard (`id==callerID` branch, unreachable under a manager+ group) | **Dropped** | Dead code by construction; a real self-profile route is an ON-phase decision, not a leftover branch |
| f | `performance_score: 0` hardcoded into every staff payload | **Not serialized at all** | No such column exists (DB_SCHEMA §6 #13 dropped phantom fields). Real KPIs live on `GET /admin/staff-performance` (admin_summary) |
| g | Soft delete leaves `username` occupying the UNIQUE index | Soft delete **renames** to `<username>#deleted-<id>` in the same UPDATE | [`DB_SCHEMA.md §4.4`](../../DB_SCHEMA.md) soft-delete×UNIQUE rule — otherwise re-hiring `chef1` fails forever |
| h | Soft delete leaves `refresh_tokens` rows live ("revoke sessions" was an aspirational comment) | Same tx deletes them | §3.3 — closes a real auth hole |

### 3.5 Wire shapes (the FE↔BE object gallery)

⚠️ **Contract-pending.** These are the designed shapes; they become binding when the
S-3/S-4 curl receipts land in `VERIFICATION.md` (gate 8, `ARCHITECTURE.md`).

**`Staff` object** — the one shape every endpoint returns. Field names are the DB
column names (DB_SCHEMA field-name law); nullable columns serialize as real `null`,
never `""` (DB_SCHEMA §6).

```jsonc
{
  "id": "9f1c…",            // string, always
  "username": "chef01",
  "role": "chef",            // chef | cashier | staff | manager | admin
  "full_name": "Nguyễn Văn A",
  "job_title": "Bếp chính",  // null when unset
  "shifts": ["sang", "chieu"],// JSON array; null when unset — NOT a string
  "responsibilities": null,
  "phone": "0901234567",
  "email": null,
  "is_active": true,
  "created_at": "2026-07-19T08:30:00Z",
  "updated_at": "2026-07-19T08:30:00Z"   // detail (#2) + update (#4) only
}
```
> `password_hash` never appears. 🔒 Enforced by the DTO, not by hoping.

**#1 `GET /staff?role=chef&search=an&is_active=true&page=1&limit=20`**
```jsonc
{
  "data": [ /* Staff… */ ],
  "meta": {
    "page": 1, "limit": 20, "total": 12,
    "counts": { "total": 12, "active": 10, "inactive": 2,
                "by_role": { "admin": 1, "manager": 1, "cashier": 4, "chef": 5, "staff": 1 } }
  }
}
```
> `meta.counts` is roster-wide (ignores `page`/`limit`, respects nothing else) — it
> feeds the stats bar, which must not change as you page. See §3.1.

**#3 `POST /staff`** — request:
```jsonc
{ "username": "cash02", "password": "…", "full_name": "Trần Thị B",
  "role": "cashier", "job_title": null, "shifts": ["toi"],
  "responsibilities": null, "phone": null, "email": null }
```
→ `201 {"data": Staff}`. `password` is write-only and never echoed.

**#4 `PATCH /staff/:id`** — only the keys present are changed:
```jsonc
{ "full_name": "Trần Thị Bích", "shifts": null }
```
> `"shifts": null` **clears** the column; omitting `shifts` **leaves it alone**. That
> distinction is the whole reason this is a PATCH (§3.7).

**#5 `PATCH /staff/:id/status`** → request `{"is_active": false}` → `200 {"data": Staff}`
(the **full** row — the reference returned a thin `{id,is_active,updated_at}`, which
forced the FE to patch its cache by hand; returning the full row lets the FE replace
the row wholesale).

**#6 `DELETE /staff/:id`** → `200 {"data":{"id":"9f1c…"}}` (the reference returned a
bare Vietnamese `message` with no `data`; an id lets the FE evict precisely).

**Error envelope** (BE_STATE §4) — e.g. duplicate username:
```jsonc
{ "error": { "code": "CONFLICT", "message": "Tên đăng nhập đã tồn tại",
             "details": [ { "field": "username", "issue": "taken" } ] } }
```

### 3.6 Guards, roles, and the error mapping

**Role levels** (proposed home: `OVERALL_PLAN.md §3` — see ⚠️-2):

| role | level |
|---|---|
| `chef` · `cashier` | 2 |
| `staff` | 3 |
| `manager` | 4 |
| `admin` | 5 |

Three guards, all in the **service** layer (BE_STATE §5 — business rules never in
handlers, never in SQL):

1. **Hierarchy** — you may only act on a target *strictly below* your level, and may
   only assign a role *strictly below* your level. Consequence: **no admin can be
   created or promoted through this page** (admin 5 ≮ admin 5). Adopted from the
   reference deliberately — admins are seeded by migration, never minted from the UI.
2. **Username uniqueness** — checked before insert; the UNIQUE index is the backstop.
3. **Last admin** — deleting the final active, non-deleted `admin` is refused.
4. **No self-harm** — you cannot toggle your own status or delete your own account.

**Error mapping** — reference code → our [`BE_STATE.md §4`](../../BE_STATE.md) enum:

| Reference code | Ours | HTTP | `details[].issue` | FE toast (VN) |
|---|---|---|---|---|
| `INVALID_INPUT` | `VALIDATION_FAILED` | 400 | per field | field-level, in the modal |
| `INVALID_ROLE` | `VALIDATION_FAILED` | 422 | `role: invalid` | field-level |
| `USERNAME_TAKEN` | `CONFLICT` | 409 | `username: taken` | "Tên đăng nhập đã tồn tại" |
| `LAST_ADMIN` | `CONFLICT` | 409 | `role: last_admin` | "Không thể xóa admin cuối cùng" |
| `INSUFFICIENT_ROLE` | `FORBIDDEN` | 403 | `role: hierarchy` | "Không đủ quyền" |
| `SELF_DEACTIVATION_FORBIDDEN` | `FORBIDDEN` | 403 | `id: self` | "Không thể thao tác trên chính mình" |
| `STAFF_NOT_FOUND` | `NOT_FOUND` | 404 | — | "Không tìm thấy nhân viên" |
| `AUTH_003` | — | — | — | **dropped** (dead code, §3.4-e) |
| `COMMON_002` | `INTERNAL` | 500 | — | generic |

### 3.7 The PATCH semantics (a real design constraint)

`PATCH /staff/:id` must distinguish three cases per field: **omitted** (leave),
**`null`** (clear), **value** (set). A plain struct-bind cannot — a missing string and
an empty string both arrive as `""`. The reference solved this by decoding into
`map[string]json.RawMessage` and building `*string` pointers; we keep that approach
(it is correct), implemented per [`BE_PLAYBOOK.md §2`](../../BE_PLAYBOOK.md) gotcha
rules. **AC:** `PATCH {"job_title": null}` clears the column; `PATCH {}` is a no-op
that still returns 200 with the unchanged row.

---

## 4. FE plan

### 4.1 Route + file map (extends [`FE_STATE.md §8`](../../FE_STATE.md))

```
fe/src/app/(dashboard)/admin/staff/
  page.tsx                     RSC shell — reads searchParams, prefetches list, HydrationBoundary
  loading.tsx                  table-shaped skeleton (FE_STATE §9 rule 3) — NOT a bare spinner
  error.tsx                    segment error boundary + reset()
  StaffPageClient.tsx          'use client' — owns URL param sync + overlay open/close
  components/
    StaffPageHeader.tsx        title + total + [+ Thêm nhân viên]
    StaffStatsBar.tsx          5 stat tiles from meta.counts
    StaffFilterBar.tsx         search (debounced) · role select · status select
    StaffTable.tsx             rows + the 4 row actions + per-row permission logic
    StaffRowActions.tsx        👁 ✎ ⏻ 🗑 with per-row enable/disable + tooltips
    AddEditStaffModal.tsx      dynamic import — RHF + Zod, add & edit modes
    StaffDetailDrawer.tsx      dynamic import — detail query, 4 tabs
    ConfirmDialog.tsx          shared? → promote to components/shared if it exists
features/admin/staff/
  staff.api.ts                 the 6 typed callers
  staff.queries.ts             useStaffList / useStaffDetail + the 4 mutations
  staff.keys.ts                key factory (FE_STATE §9 rule 6)
  staff.schema.ts              Zod: create/edit forms (mirrors BE tags, §5 validation)
  staff.types.ts               Staff DTO mirror (FE_STATE §9 rule 10 — string ids)
```

### 4.2 State ownership (instance of [`FE_STATE.md §1`](../../FE_STATE.md) — no new kinds)

| Data | Kind | Owner |
|---|---|---|
| staff list + `meta.counts` | server | TanStack `['admin','staff','list',{filters}]` |
| one staff detail | server | TanStack `['admin','staff','detail',id]`, `staleTime 30s`, enabled only while the drawer is open |
| `search` · `role` · `is_active` · `page` | **URL** | `searchParams` — FE_STATE §9 rule 2. Back button and shared links reproduce the view |
| which overlay is open + its target id | local | `StaffPageClient` `useState` — deliberately *not* the URL (§7 💡-1) |
| form field values | local | React Hook Form inside the modal |
| current user identity (for self-row checks) | server→auth | the existing auth store; read-only here |

**No Zustand slice.** Nothing here is cross-page client state (FE_STATE §9 rule 7).

**Cache map — what each mutation invalidates:**

| Mutation | Invalidates |
|---|---|
| create | `['admin','staff','list']` (all filter combos) |
| update | `['admin','staff','list']` + `['admin','staff','detail',id]` |
| status toggle | same as update |
| delete | `['admin','staff','list']` + **remove** `['admin','staff','detail',id]` |

All four are **pessimistic** — [`FE_STATE.md §9 rule 4`](../../FE_STATE.md) reserves
optimistic updates for cart mutations. An account change is not a place to guess.

### 4.3 Loading strategy (instance of [`FE_STATE.md §4–5`](../../FE_STATE.md))

Four layers, and **five named render branches** — the reference had four layers but
collapsed three of its states into two surfaces (ref loading-Flag 2). Named branches
are the countermeasure:

| Branch | Condition | Renders |
|---|---|---|
| `loading` | first load, no data | **table-shaped skeleton** (header + 10 ghost rows + stats-tile ghosts) — never a bare "Đang tải…" |
| `error` | list query failed | inline error panel + `Thử lại` → `refetch()`; filters stay usable |
| `empty-roster` | `meta.counts.total === 0` | "Chưa có nhân viên nào" + a **primary `+ Thêm nhân viên` CTA** |
| `empty-filtered` | `total > 0` but this filter matched 0 | "Không có nhân viên khớp bộ lọc" + a **`Xóa bộ lọc` CTA** |
| `rows` | data present | the table |

The `empty-roster` / `empty-filtered` split is the single highest-value fix on this
page: the reference showed one `EmptyState` for both, so a manager could not tell
"we have no staff" from "your filter is too narrow."

Other layer rules:
- **Stats bar reserves its height** while loading (ghost tiles), so it does not pop in
  and shift the table (ref loading-Flag 3).
- **Detail drawer has an error branch** — a failed `GET /staff/:id` (e.g. the row was
  deleted on another device) shows "Không tải được. Thử lại / Đóng", never a stuck
  spinner (ref loading-Flag 1).
- **Background refetch is visible** — a subtle top progress bar while a focus-triggered
  refetch is in flight, so silently-stale rows are not mistaken for fresh ones
  (ref loading-Flag 4).
- **Search is debounced 300 ms** and drives a server query (§3.4-b), so unlike the
  reference there *is* an in-flight state — the table dims rather than unmounting,
  keeping the previous page visible (`placeholderData: keepPreviousData`).

### 4.4 Page behaviors (the spec the AC will test)

1. Page renders only for role ≥ manager; a lower role is redirected by the shell guard, never shown a flash of content.
2. List loads server-filtered and server-paged from the URL params; a deep link reproduces filters, page and search exactly.
3. Stats bar shows roster-wide counts from `meta.counts` and does **not** change when you page.
4. Search debounces 300 ms, resets to page 1, and keeps the previous rows visible (dimmed) while in flight.
5. Role and status filters reset to page 1 and are reflected in the URL.
6. The five render branches (§4.3) are mutually exclusive and each is individually reachable.
7. `+ Thêm nhân viên` opens the modal in add mode; role `<select>` offers only roles strictly below the caller's level.
8. Create with a taken username surfaces "Tên đăng nhập đã tồn tại" **on the username field**, and the modal stays open with input intact.
9. Create success closes the modal, toasts, and the new row appears after the list invalidate.
10. Row ✎ opens the modal in edit mode, prefilled; the password field is absent in edit mode (password change is a separate S-phase concern, §7 ❓-1).
11. `PATCH` sends only changed keys; clearing an optional field sends explicit `null` and the column is cleared (§3.7).
12. Row ⏻ toggles status; **re-activating asks for confirmation**, deactivating asks for confirmation *and* names the consequence ("… sẽ bị đăng xuất khỏi mọi thiết bị").
13. Your own row's ⏻ and 🗑 are disabled with a tooltip explaining why — the 403 is the backstop, not the UX.
14. A row at or above your level has ✎/⏻/🗑 disabled with a tooltip; 🗑 is hidden entirely for managers (admin-only route).
15. Row 🗑 opens a **typed-confirmation** dialog (not a native `confirm()`), naming the account.
16. Deleting the last admin is refused with "Không thể xóa admin cuối cùng" and the row stays.
17. Row 👁 opens the detail drawer, which fetches its own detail and has loading **and** error branches.
18. Deleting a staff whose drawer is open closes the drawer and evicts its detail cache.
19. Every mutation is pessimistic: the button shows a pending state, the table does not change until the server confirms.
20. A deactivated or deleted staff is locked out on their next API call, and their refresh tokens are gone (§3.3) — verified by the S-4 receipt, not by this page's UI.

### 4.5 What this page leaves behind (cross-surface effects)

No SSE/WS — every downstream surface is pull-only. A write here is felt in four places:

| Surface | Effect |
|---|---|
| **Auth middleware** (every authed request) | `DEL auth:staff:<id>` → next request re-reads MySQL → deactivated/deleted staff gets 401 immediately |
| **Login / refresh** | a created account can log in at once; a deactivated one is refused; its refresh tokens are gone (§3.3) |
| **Assignee dropdowns** (task-board F-22, to-do-list F-20) | read the same `GET /staff`; gains/loses the person. ⚠️ they must send `is_active=true` — see §6 row 9 |
| **Staff performance** (admin_summary) | aggregates orders by `created_by` against these rows |

**Multi-device:** two managers' tabs do **not** sync live. Manager B sees A's change on
tab-focus refetch. The *affected staff* is cut off immediately (auth middleware).
That asymmetry is intended and is drawn in `_how-it-works.html §06`.

---

## 5. Task mapping — where this plan lands in TASKS.md

The `staff` table and its CRUD belong to the **S phase** (DB_SCHEMA §4.4); the admin
screen belongs to the **AD phase** (OVERALL_PLAN roadmap). This plan **proposes** the
rows below — `TASKS.md` owns their status and they get registered when the S phase
opens, not now.

| Proposed row | Slice of this plan | Receipt type |
|---|---|---|
| S-1 | `staff` migration + seed first admin (DB_SCHEMA §4.4, §6 #14) | migrate up/down clean; seeded admin can log in |
| S-2 | Auth: login/refresh/middleware + `auth:staff:<id>` cache + `refresh_tokens` | curl: login → JWT; disabled account refused |
| S-3 | BE read side — endpoints #1, #2 (filters, paging, `meta.counts`) | curl transcripts: filtered list, page 2, counts stable across pages, detail, 404 |
| S-4 | BE write side — endpoints #3–#6 + all four guards + §3.3 side effects | curl: create, duplicate→409, hierarchy→403, self-toggle→403, last-admin→409, delete→soft+rename+tokens gone |
| AD-1 | FE roster: shell, URL params, table, filters, stats, 5 branches (§4.3) | screenshot per branch; deep-link reproduces view |
| AD-2 | FE overlays: add/edit modal + detail drawer + confirm dialogs | screenshot: create, edit, field-level 409, drawer error branch |

**Dependency note:** AD-1/AD-2 cannot start before S-3/S-4 — this is a pure-CRUD page
with no useful mock-first path.

---

## 6. Reference defects designed out

| # | Reference finding | Countermeasure here |
|---|---|---|
| 1 | Dead self-service guard (`id==callerID` unreachable under a manager+ group) | Dropped (§3.4-e); a real self-profile route is an explicit ON-phase decision |
| 2 | BE filter params (`role`/`search`/`is_active`) exist but the page never sends them | FE sends them from the URL (§3.4-b) |
| 3 | `?limit=100` hard-coded + client paging → a roster >100 silently truncates | Server-side paging; no client cap (§3.4-b) |
| 4 | Self-status toggle blocked in *both* directions with a "deactivation" error name | Guard kept (correct), message renamed to "Không thể thao tác trên chính mình" (§3.6) |
| 5 | `SELF_DEACTIVATION_FORBIDDEN` rarely surfaces because the FE disables the button — untested path | Both kept, and behavior 13 asserts the tooltip *and* the 403 backstop |
| 6 | Soft delete never revokes `refresh_tokens` ("revoke sessions" was an aspirational comment) | Same-tx `DELETE FROM refresh_tokens WHERE staff_id=?` on deactivate and delete (§3.3) |
| 7 | DB errors on create surface as untyped 500s | Validation tiers per BE_STATE §5; unmapped errors still 500 but never leak Go text |
| 8 | `performance_score: 0` hardcoded — no such column; renders a 0% bar for everyone | Not serialized (§3.4-f); the drawer links to admin_summary for real KPIs |
| 9 | Deactivated staff still appear in assignee dropdowns (list filters `deleted_at` only, not `is_active`) | `is_active` is a real query param (§3.1); **consumer plans must send `is_active=true`** — noted in §4.5 and cross-linked from F-20/F-22 |
| 10 | Detail drawer has no error branch — a failed fetch sticks on "Đang tải…" forever | Named error branch (§4.3) |
| 11 | Loading / empty-roster / empty-filtered collapse into two surfaces | Five named, mutually exclusive branches (§4.3) |
| 12 | Stats bar hidden while loading, then pops in (layout shift) | Ghost tiles reserve the height (§4.3) |
| 13 | `refetchOnWindowFocus` + `staleTime:0` refetch silently; stale rows look fresh | Visible background-refetch indicator (§4.3) |
| 14 | No skeletons anywhere — every in-flight state is a spinner or a text line | Layout-shaped skeleton in `loading.tsx` (FE_STATE §9 rule 3) |
| 15 | Native `confirm()` for delete | Typed-confirmation dialog naming the account (behavior 15) |
| 16 | Soft delete leaves `username` holding the UNIQUE index — re-hiring the same username fails forever | `<username>#deleted-<id>` rename in the same UPDATE (§3.4-g, DB_SCHEMA §4.4) |
| 17 | Status endpoint returns a thin `{id,is_active,updated_at}`; delete returns a bare `message` | Both return enough to reconcile the cache (§3.5) |

---

## 7. Decisions + flags

**✅ Decided in this plan**

1. Server-side filter + paging, URL-owned (§3.4-b) — reverses the reference's client-side approach.
2. `meta.counts` added to the list response so the stats bar survives paging (§3.1).
3. Refresh-token revocation on deactivate *and* delete (§3.3) — a genuine hole closed.
4. No admin creatable or promotable from this page; admins are seeded (§3.6) — adopted from the reference on purpose.
5. All mutations pessimistic (§4.2).
6. `performance_score` never serialized (§3.4-f).
7. Overlay state stays in React, not the URL (§4.2) — see 💡-1.

**⚠️ FLAGS**

- **⚠️-1 — Two different 409s share one code.** Our 9-code enum maps both
  `USERNAME_TAKEN` and `LAST_ADMIN` to `CONFLICT`, so the FE must branch on
  `code` **plus** `details[0].issue`. That still satisfies FE_STATE §9 rule 5 (branch
  on structured data, never message text), but it is a widening of the contract.
  *Alternative:* add two codes to `BE_STATE.md §4`. **Recommendation: keep the
  discriminator** — the enum is a platform-wide contract and should not grow a code
  per page. Owner may flip this before S-4.
- **⚠️-2 — RBAC hierarchy has no harness home.** The role-level table (§3.6) is
  proposed here but will be needed by every staff/admin page. It should move to
  `OVERALL_PLAN.md §3` when the S phase opens, with this plan linking it. Left as a
  flag rather than silently creating a second home (one fact, one home).
- **⚠️-3 — Fail-open weakens lockout.** Inherited from ARCHITECTURE §4 (§3.3).
  Now bounded by the token revoke, but a Redis outage still leaves a live access
  token valid until expiry. Accept, or shorten access-token TTL at S-2.

**💡 SUGGESTIONS**

- **💡-1 — Overlay state in the URL?** Putting the open drawer/modal in the URL
  (`?view=<id>`) would make a staff record deep-linkable and the back button close the
  overlay. Not adopted for v1 (adds param-sync complexity to a leaf admin screen), but
  it is cheap to add later and would be a genuine UX win. Owner's call.
- **💡-2 — Bulk deactivate.** Seasonal rosters make "select N → deactivate" plausible.
  Out of scope for v1; noted so the table's row model is built selection-ready.

**❓ CLARIFY**

- **❓-1 — Password reset.** The reference's edit mode has no password field, and no
  endpoint changes a password. So a manager cannot reset a forgotten staff password —
  a real operational gap. Is that a v1 gap we accept, or does S-4 need
  `PATCH /staff/:id/password`? **Assumed for now:** accepted gap, admin resets via DB.
- **❓-2 — Reactivating a soft-deleted account.** Soft delete has no UI inverse; the
  username has been renamed (§3.4-g), so restoring needs a DB edit. Acceptable, or
  does the roster need a "deleted" filter + restore action? **Assumed:** acceptable.

---

## 8. Verify plan (receipts logged in [`harness/VERIFICATION.md`](../../VERIFICATION.md))

| Task | Receipt |
|---|---|
| S-3 | curl transcripts: unfiltered list · `role=chef` · `search=` hit + miss · `is_active=false` · page 2 · `meta.counts` identical across two pages · detail 200 · detail 404 |
| S-4 | curl: create 201 · duplicate username 409 + `details.issue=taken` · manager creating a manager 403 · self status-toggle 403 · last-admin delete 409 · delete 200 → row has `deleted_at` **and** renamed username **and** zero `refresh_tokens` rows · `auth:staff:<id>` absent from Redis |
| AD-1 | screenshots of all five render branches (§4.3) · a deep link reproducing filters+page · stats stable across paging |
| AD-2 | screenshots: add modal, edit modal prefilled, field-level 409 on username, typed delete confirm, drawer loading branch, drawer error branch |
| F-23 (this plan) | all four files render in both themes; no horizontal page scroll — screenshot receipt |

---

*Written 2026-07-19 by the engineer in charge (F-23), reconciling
`reference/docs/system/08_pages/admin/admin_staff/` (digested 2026-07-19) against the
harness docs listed in §2. The rules live in those docs — this plan links them and
never restates them. On any conflict with the three HTML companions, **this file wins.***
