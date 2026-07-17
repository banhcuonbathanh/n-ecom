# Admin Staff — Backend View — `/admin/staff`

> **TL;DR:** ✅ implemented · **6 endpoints, all `authMW` + `AtLeast("manager")`** (one route group),
> with **`DELETE` additionally `AtLeast("admin")`**. Plain CRUD over the `staff` table via a
> **hand-written repo (raw SQL, not sqlc)**. **No Redis read-cache anywhere** — every read hits
> MySQL; the only Redis touch is a *write*: `Del(auth:staff:<id>)` to invalidate the auth middleware's
> `is_active` cache after a (de)activation or delete. Business guards live in the service:
> role-hierarchy (`target level < caller level`), username-uniqueness, self-deactivation block, and
> last-admin protection.
>
> **Sources traced (branch `experience_claude.md_system_1`):**
> [`be/cmd/server/main.go:280-291`](../../../../../be/cmd/server/main.go) ·
> [`be/internal/handler/staff_handler.go`](../../../../../be/internal/handler/staff_handler.go) ·
> [`be/internal/service/staff_service.go`](../../../../../be/internal/service/staff_service.go) ·
> [`be/internal/repository/staff_repo.go`](../../../../../be/internal/repository/staff_repo.go) ·
> [`be/internal/handler/respond.go`](../../../../../be/internal/handler/respond.go) ·
> [`be/internal/service/auth_service.go:40-44`](../../../../../be/internal/service/auth_service.go) (`staffActiveKey`).
> FE callers: [`fe/src/features/admin/admin.api.ts:68-108`](../../../../../fe/src/features/admin/admin.api.ts) ·
> [`fe/src/app/(dashboard)/admin/staff/page.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/page.tsx).
>
> **FE sibling:** [admin_staff.md](admin_staff.md) · **Object model:** staff has no dedicated
> OBJECT_MODEL doc — fields owned by [DB_SCHEMA.md `staff`](../../../02_spec/DB_SCHEMA.md) ·
> **RBAC home:** [BUSINESS_RULES.md §1](../../../02_spec/BUSINESS_RULES.md).

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|----------|------|---------|---------|--------------|-------------|
| 1 | `GET /staff` | manager+ | `ListStaff` `staff_handler.go:26` | `ListStaff` `staff_service.go:61` | `staffRepo.ListStaff` raw SQL `staff_repo.go:70` (COUNT + paged SELECT) | none (read hits MySQL) |
| 2 | `GET /staff/:id` | manager+ | `GetStaff` `staff_handler.go:55` | `GetStaff` `staff_service.go:78` | `GetStaffByID` raw SQL `staff_repo.go:132` | none |
| 3 | `POST /staff` | manager+ | `CreateStaff` `staff_handler.go:74` | `CreateStaff` `staff_service.go:103` | `GetStaffByUsername` + `CreateStaff` INSERT `staff_repo.go:146,160` | none |
| 4 | `PATCH /staff/:id` | manager+ | `UpdateStaff` `staff_handler.go:112` | `UpdateStaff` `staff_service.go:160` | `GetStaffByID` + `UpdateStaff` dynamic UPDATE `staff_repo.go:172` | none |
| 5 | `PATCH /staff/:id/status` | manager+ | `SetStaffStatus` `staff_handler.go:190` | `SetStaffStatus` `staff_service.go:203` | `GetStaffByID` + `SetStaffActiveByID` UPDATE `staff_repo.go:227` | **Del `auth:staff:<id>`** `staff_service.go:230` |
| 6 | `DELETE /staff/:id` | **admin** | `DeleteStaff` `staff_handler.go:217` | `DeleteStaff` `staff_service.go:236` | `GetStaffByID` + `CountAdmins` + `SoftDeleteStaff` UPDATE `staff_repo.go:240,253` | **Del `auth:staff:<id>`** `staff_service.go:268` |

**Route registration:** [`be/cmd/server/main.go:280-291`](../../../../../be/cmd/server/main.go) —
`staffR := v1.Group("/staff")` with `staffR.Use(authMW, middleware.AtLeast("manager"))` (line 281);
endpoints 1-5 hang off that group; endpoint 6 is in a nested `adm := staffR.Group("")` with
`adm.Use(middleware.AtLeast("admin"))` (lines 287-290).

> ⚠️ The page's FE client calls these as `/staff*` (e.g. `api.get('/staff?limit=100')`,
> `admin.api.ts:92-108`) — **not** `/admin/staff`. The FE sibling doc's Zone D source cell said
> `GET /admin/staff`; corrected this run (Step 6 drift).

---

## Auth Model on This Page

- **Every route requires a staff JWT with role ≥ manager** (`authMW` + `AtLeast("manager")` on the
  whole `/staff` group, `main.go:281`). The admin shell already gates the page at
  `RoleGuard minRole=MANAGER`, so the FE only ever reaches here as manager/admin.
- **`DELETE /staff/:id` requires role ≥ admin** (`main.go:289`). The FE mirrors this defensively:
  `StaffTable.canDelete` hides the 🗑 button for managers and for any row whose role ≥ the caller's
  level (`StaffTable.tsx:61-66`). A manager who somehow issued the call would get a 403 from the
  route gate before the handler runs.
- **Handler-level self-service checks are present but unreachable from this page.** `GetStaff`
  (`staff_handler.go:60`) and `UpdateStaff` (`staff_handler.go:117`) allow `id == callerID` even
  for non-managers (`if id != callerID && !roleAtLeast(callerRole,"manager")` → 403). Because the
  route group already requires manager+, `roleAtLeast(callerRole,"manager")` is always true here, so
  the forbidden branch never fires and the self-exception is dead defensive code (a self-service
  "edit my own profile" path that no current route exposes to chef/cashier). See Flag 1.
- **No guest-JWT path.** `created_by`/ownership semantics do not apply — staff rows are not
  owner-scoped; any manager sees and edits any row below their level.

---

## Per-Endpoint Detail

### 1 · `GET /staff`

- **Handler** `staff_handler.go:26-52` reads `role`, `search`, `page` (default 1), `limit`
  (default 20), and optional `is_active` (`"true"`/`"1"` → `*bool`). Serializes each row with
  `toStaffJSON` (`staff_handler.go:238`) into `{data:[StaffJSON], meta:{page,limit,total}}`.
- **Service** `staff_service.go:61-75` clamps `page≥1` and `limit∈[1,100]` (else 20), delegates to
  the repo.
- **Repo** `staff_repo.go:70-130` builds a dynamic `WHERE deleted_at IS NULL [+ role +
  is_active + (username LIKE ? OR full_name LIKE ?)]`, runs a `SELECT COUNT(*)` then a paged
  `SELECT … ORDER BY created_at DESC LIMIT ? OFFSET ?`. **Raw SQL, not sqlc.**
- **What this page actually sends:** `GET /staff?limit=100` only (`admin.api.ts:92`) — **no `role`,
  `search`, or `is_active`**. The page's FilterBar filters the returned 100 rows **client-side**
  (`page.tsx:51-60`) and paginates 10/page client-side. So the BE filter params are real but unused
  by this page (Flag 2), and >100 staff would be silently truncated (Flag 3).

### 2 · `GET /staff/:id`

- **Handler** `staff_handler.go:55-71` → self-or-manager guard (dead here, see Auth Model) →
  `toStaffDetailJSON` (adds `updated_at` over `toStaffJSON`).
- **Service** `staff_service.go:78-87` maps `sql.ErrNoRows` → `ErrStaffNotFound` (404
  `STAFF_NOT_FOUND`).
- **Repo** `GetStaffByID` `staff_repo.go:132-144` — `WHERE id=? AND deleted_at IS NULL`.
- **Caller:** the detail drawer `fetchStaffDetail` (`StaffDetailDrawer.tsx:54-59`), its own query
  key `['admin','staff',staffId]`, `staleTime 30s`, fired only when the drawer opens.

### 3 · `POST /staff`

- **Handler** `staff_handler.go:74-109` binds `username (min3,max50)`, `password (min8)`,
  `full_name (min2,max100)`, `role (required)` + optional `job_title`, `shifts[]`,
  `responsibilities`, `phone`, `email`; bind failure → 400 `INVALID_INPUT`. `shifts[]` is
  JSON-marshalled to a string (`marshalShifts`).
- **Service** `staff_service.go:103-146` enforces, in order:
  1. `validStaffRoles[role]` (chef/cashier/staff/manager/admin) else `ErrInvalidRole` (400).
  2. **Hierarchy:** `targetLevel >= callerLevel` → `ErrInsufficientRole` (403). Levels
     `customer1 · chef/cashier2 · staff3 · manager4 · admin5` (`staff_service.go:19-26`). So a
     manager can create chef/cashier/staff only; an admin can create up to manager — **nobody can
     create another admin through this endpoint** (admin level 5 ≥ admin level 5). See Flag 4.
  3. Username uniqueness via `GetStaffByUsername` → `ErrUsernameTaken` (409) when a row exists.
  4. bcrypt hash, then `repo.CreateStaff` INSERT (`is_active=1`, `created_at=NOW()`).
- **Returns** 201 `{data: StaffJSON}` of the created row.

### 4 · `PATCH /staff/:id`

- **Handler** `staff_handler.go:112-187` decodes the body into a `map[string]json.RawMessage` to
  distinguish "field omitted" from "field set to empty" — only keys present in the body are turned
  into non-nil `*string` pointers (`shifts` tracked via `ShiftsProvided`). A non-manager attempting
  a `role` change has it silently dropped (`req.Role = nil`, line 163) — dead here since callers are
  manager+.
- **Service** `staff_service.go:160-199`: loads target (404 if missing); if `role` is changing,
  validates it and enforces **both** `currentLevel < callerLevel` **and** `newLevel < callerLevel`
  (`staff_service.go:177`) else `ErrInsufficientRole` — you cannot edit someone at/above your level,
  nor promote anyone to at/above your level.
- **Repo** `UpdateStaff` `staff_repo.go:172-225` builds a dynamic `SET` list from the non-nil
  fields (`shifts=''` → SQL NULL); if only `updated_at` would change it short-circuits to a re-read;
  `RowsAffected==0` → `sql.ErrNoRows` → 404.
- **Returns** 200 `{data: StaffDetailJSON}`.

### 5 · `PATCH /staff/:id/status`

- **Handler** `staff_handler.go:190-214` binds `{is_active bool}`; returns a **thin** body
  `{data:{id,is_active,updated_at}}` (not the full staff object).
- **Service** `staff_service.go:203-233`:
  1. **`callerID == targetID` → `ErrSelfDeactivationForbidden` (403)** — blocks toggling *your own*
     status in either direction (Flag 5).
  2. load target (404 if missing); **hierarchy** `targetLevel >= callerLevel` → `ErrInsufficientRole`.
  3. `SetStaffActiveByID` UPDATE, then **`rdb.Del(auth:staff:<id>)`** so the auth middleware's
     `is_active` cache re-reads MySQL on the target's next request (a just-disabled staff is locked
     out within their token's life, not after the 5-min TTL). Returns the re-fetched full row.

### 6 · `DELETE /staff/:id` (admin only)

- **Handler** `staff_handler.go:217-226` → returns `{message:"Tài khoản đã bị xóa"}` (no `data`).
- **Service** `staff_service.go:236-270`:
  1. **`callerID == targetID` → `ErrInsufficientRole`** (can't delete yourself).
  2. load target (404 if missing).
  3. **Last-admin guard:** if target role is `admin`, `CountAdmins` (active, non-deleted) ≤ 1 →
     `ErrLastAdmin` (409).
  4. `SoftDeleteStaff` (`deleted_at = NOW()`), then **`rdb.Del(auth:staff:<id>)`**.
- **Soft delete only** — the row stays in MySQL with `deleted_at` set; every staff query filters
  `deleted_at IS NULL`, and `refresh_tokens` cascade is **not** triggered by a soft delete (the
  comment "revoke sessions" at `staff_service.go:267` is aspirational — only the is_active cache is
  cleared; existing access tokens remain valid until expiry, mitigated by the cache Del forcing the
  middleware's `IsStaffActive` re-check which now returns false). See Flag 6.

---

## Caching & Invalidation

- **No read-cache.** Staff list + detail are on the REDIS_CACHE.md "do-not-cache" list
  ([REDIS_CACHE.md:48](../../../03_be/REDIS_CACHE.md)) — every `GET /staff*` reads MySQL directly.
  Client-side caching is TanStack Query only: the list query `['admin','staff']` runs with
  `staleTime: 0` + `refetchOnWindowFocus: true` (`page.tsx:42-47`); the detail query
  `['admin','staff',id]` with `staleTime: 30s` (`StaffDetailDrawer.tsx:54-59`).
- **Only Redis write = `Del(auth:staff:<id>)`** on status-change (endpoint 5) and delete
  (endpoint 6), via the shared `staffActiveKey` helper (`auth_service.go:40-44`). This is the
  **auth `is_active` cache** (`auth:staff:{id}` = `'active'`/`'disabled'`, 5-min TTL, written by
  `IsStaffActive` on miss — [REDIS_CACHE.md:42](../../../03_be/REDIS_CACHE.md)), **not** a staff-page
  read-cache. Deleting/deactivating thus has a cross-page effect on the auth middleware (see
  [admin_staff_crosspage_dataflow.md](admin_staff_crosspage_dataflow.md)).
- **Fail-open:** `IsStaffActive` returns `true` if Redis is down (REDIS_CACHE.md:71), and all the
  `Del` calls ignore their error (`_ = s.rdb.Del(...)`). A Redis blip therefore briefly weakens the
  just-disabled-staff lockout — the deliberate availability-over-strictness trade-off documented in
  REDIS_CACHE.md:77.

---

## Error Behaviour

Envelope is `{"error": CODE, "message": "..."}` (`respond.go:14-20`); typed `service.AppError`s map
1:1 via `handleServiceError`, untyped errors fall to 500 `COMMON_002` (`respond.go:24-36`). The FE
reads `err.response.data.error` (`page.tsx:73,94,103`), so the codes line up.

| Code | HTTP | Raised by | FE handling on this page |
|------|------|-----------|--------------------------|
| `INVALID_INPUT` | 400 | bind failure (create/update/status) `staff_handler.go:87,136,197` | create → generic "Có lỗi xảy ra" (not specifically mapped) |
| `INVALID_ROLE` | 400 | bad `role` value `staff_service.go:38,105,171` | generic toast |
| `USERNAME_TAKEN` | 409 | duplicate username on create `staff_service.go:33,115` | **"Tên đăng nhập đã tồn tại"** (`page.tsx:74-75`) |
| `INSUFFICIENT_ROLE` | 403 | hierarchy guard on create/update/status/self-delete `staff_service.go:36` | status/delete → **"Không đủ quyền"**; create → generic |
| `SELF_DEACTIVATION_FORBIDDEN` | 403 | toggling own status `staff_service.go:35,205` | **"Không thể vô hiệu hóa chính mình"** (`page.tsx:95`) — but the FE also `disabled`s the toggle for the current user (`StaffTable.tsx:126`), so this rarely surfaces |
| `LAST_ADMIN` | 409 | deleting the last active admin `staff_service.go:37,256` | **"Không thể xóa admin cuối cùng"** (`page.tsx:104`) |
| `STAFF_NOT_FOUND` | 404 | missing/soft-deleted id on get/update/status/delete `staff_service.go:34` | not specifically mapped → generic toast |
| `AUTH_003` | 403 | handler self-or-manager guard (dead here) `staff_handler.go:61,118` | n/a (unreachable) |
| `COMMON_002` | 500 | untyped error (e.g. invalid bcrypt/DB) | generic toast |
| — | 500 | **bad FK / DB error on create** (no specific mapping) | generic toast — see Flag 7 |

The list query's `isError` renders an `EmptyState` + a "Thử lại" retry button (`page.tsx:139-153`).

---

## Flags

| # | Flag | Severity | Detail |
|---|------|----------|--------|
| 1 | **Dead self-service guard** | cosmetic | `GetStaff`/`UpdateStaff` allow `id==callerID` for non-managers, but the route group is manager+, so the branch never fires (`staff_handler.go:60,117`). Leftover from a planned self-edit path. |
| 2 | **List filter params unused by this page** | low | BE `GET /staff` honours `role`/`search`/`is_active` (`staff_handler.go:27-36`), but the page sends only `?limit=100` and filters the result set client-side (`page.tsx:51-60`). The server filters work — they are just not exercised here. |
| 3 | **100-row client cap** | low | `listStaff` hard-codes `?limit=100` (`admin.api.ts:92`) and paginates client-side; a roster >100 silently shows only the newest 100. Moot for a single stall. |
| 4 | **No admin can be created/promoted here** | by-design | Create requires `targetLevel < callerLevel` and update requires `newLevel < callerLevel` (`staff_service.go:109,177`), so an admin (level 5) can reach manager at most. The form's role `<select>` also omits `admin` (`AddEditStaffModal.tsx:14-19`). New admins must be seeded/migrated, never minted from this page. |
| 5 | **Self-status toggle fully blocked** | cosmetic | `SetStaffStatus` returns `SELF_DEACTIVATION_FORBIDDEN` for *any* self-toggle, not just deactivation (`staff_service.go:204`). Harmless (you're active to be calling) and the FE disables the button for self anyway (`StaffTable.tsx:126`). |
| 6 | **Soft delete doesn't revoke refresh tokens** | low | The "revoke sessions" comment (`staff_service.go:267`) is unimplemented — only `auth:staff:<id>` is Del'd. A deleted staff's existing access token works until expiry; the cache Del makes the middleware's next `IsStaffActive` re-read MySQL (now soft-deleted → treated inactive), so practical lockout is fast, but `refresh_tokens` rows are not purged. |
| 7 | **Bad FK / DB error → 500, not 4xx** | low | An invalid `role` is caught (`INVALID_ROLE`), but other DB-layer failures on create/update surface as untyped errors → `COMMON_002` 500, shown to the manager as the generic toast. |
| 8 | **`performance_score` is a hardcoded stub** | low | `toStaffJSON` always returns `performance_score: 0` (`staff_handler.go:250`) — there is **no `performance_score` column** in `staff` ([DB_SCHEMA.md staff](../../../02_spec/DB_SCHEMA.md)). The table renders a literal 0% progress bar for every employee (`StaffTable.tsx:119-120`); the detail drawer is gentler, showing "Chưa có dữ liệu hiệu suất" when 0 (`StaffDetailDrawer.tsx:137-139`). No backing data exists — analytics lives in `GET /admin/staff-performance` (A2 Summary), a different endpoint. Not a `_BUGS.md` item: it's an intentional stub gracefully degraded, akin to the marketing mock. |

> No `_BUGS.md` for this page: the FE and BE agree on every route, shape, and guard — the only
> mismatches are the dead defensive code (Flag 1/5) and the stubbed `performance_score` (Flag 8),
> none of which break a user flow.
