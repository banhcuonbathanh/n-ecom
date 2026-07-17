# Admin Staff — Status Routing Reference

> **This page IS status-routed**, but the "status" is a **boolean flag** (`staff.is_active`,
> TINYINT(1)), not an enum string. It surfaces as two states — **active / inactive** — that drive
> the toggle button, the filter, the stats counts, and a status badge. There is **no multi-step
> lifecycle** (no preparing→ready→… chain) and **no SSE/realtime** — state changes are a single
> `PATCH /staff/:id/status` round-trip + query invalidation.
>
> Route: `/admin/staff` · Page entry: `fe/src/app/(dashboard)/admin/staff/page.tsx`
> Model file: `docs/fe/wireframes/admin_main/admin_overview/Admin_Overview_Status_Routing_Reference.md`
> Last verified against code: 2026-06-07

---

## Live Page Snapshot (`http://localhost:3000/admin/staff`, 2026-06-07)

**Not captured.** Stack was **up** (FE `:3000` → 200, BE `:8080/health` → 200), but the Playwright
MCP browser profile was **locked** (`Browser is already in use … mcp-chrome-ef492b3`), so no live
render/console capture was possible this run. All cells below are traced from source, not from a
live DOM. A static design render exists at `admin_main_staff.png` (wireframe, **not** live code).

> To capture next time: close the other Chrome MCP session (or run isolated), then navigate to
> `/admin/staff` authenticated as `admin`/`manager` (page is RBAC-gated).

---

## Page Layout

| Zone | Component | Title (verbatim JSX) | When visible |
|---|---|---|---|
| A | `StaffPageHeader` | `Nhân viên (N)` (N = `allStaff.length`) | Always |
| B | `StaffStatsBar` | — (4 KPI cards, no section heading) | `!isLoading` ([page.tsx:163](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L163)) |
| C | `StaffFilterBar` | — (search + 2 selects, no heading) | Always |
| D | `StaffTable` | — (column headers only) | `!isLoading` — else renders `Đang tải...` ([page.tsx:173-185](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L173-L185)) |
| E | `Pagination` | — | Always |
| M1 | `AddEditStaffModal` (dynamic) | `Thêm nhân viên` / `Sửa — <username>` | `modal !== null` ([page.tsx:37](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L37)) |
| M2 | `StaffDetailDrawer` (dynamic) | — (avatar header, no title string) | `detailId !== null` ([page.tsx:39](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L39)) |

- B and D both render only after the list query resolves; while loading, B is hidden and D shows the `Đang tải...` placeholder.
- M1/M2 are `next/dynamic` imports — code-split, mounted only when their gate opens.

---

## Staff "Status" States (`staff.is_active`, TINYINT(1) DEFAULT 1)

| State | DB value | FE type | Meaning |
|---|---|---|---|
| active | `is_active = 1` (`true`) | `StaffStatus = 'active'` ([staff.ts:2](../../../../fe/src/types/staff.ts#L2)) | Account enabled; can log in. Middleware caches via Redis `auth:staff:{id}` = `'active'`, TTL 5min. |
| inactive | `is_active = 0` (`false`) | `StaffStatus = 'inactive'` | Account disabled; login blocked. Redis cache = `'disabled'`. |

> Source: `docs/be/be_code_summary/DB_SCHEMA_SUMMARY.md` (`staff.is_active`, line 61) +
> `fe/src/types/staff.ts:2`. The FE `Staff` interface carries the raw boolean `is_active`
> ([staff.ts:15](../../../../fe/src/types/staff.ts#L15)); the `StaffStatus` string union is used
> only by the **filter** dropdown values, not stored on the entity.

---

## Status — Which Zone Each State Appears In

| State | Vietnamese label(s) | A Header | B StatsBar | C FilterBar | D Table | M2 Detail |
|---|---|---|---|---|---|---|
| active | `Đang HĐ` (table/detail badge) · `Đang hoạt động` (filter/stats) | ❌ (count only, all) | ✅ "Đang hoạt động" KPI = `filter(is_active)` | ✅ (filter option) | ✅ (if filter ≠ `inactive`) | ✅ (badge `● Đang HĐ`) |
| inactive | `Vô hiệu` (table/detail badge) · `Vô hiệu hóa` (filter/stats) | ❌ | ✅ "Vô hiệu hóa" KPI = `total − active` | ✅ (filter option) | ✅ (if filter ≠ `active`) | ✅ (badge `● Vô hiệu`) |

- **Zone A** shows only the **total** count (`allStaff.length`), status-agnostic.
- **Zone B** ([StaffStatsBar.tsx:17-19](../../../../fe/src/app/(dashboard)/admin/staff/components/StaffStatsBar.tsx#L17-L19)): `active = filter(s.is_active).length`; `inactive = total − active`. Computed over **`allStaff`** (the full list), **not** the filtered/paginated slice — counts are global.
- **Zone D** routing is driven by the client-side filter in [page.tsx:56-57](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L56-L57): `statusFilter === 'active'` drops `!is_active` rows; `=== 'inactive'` drops `is_active` rows; empty string shows both. There is **no server-side status filter** — `listStaff` always fetches `?limit=100` unfiltered.

---

## StaffTable — Action Button Per Status (status toggle)

The status-changing control is the toggle pill in the "Trạng thái" column
([StaffTable.tsx:123-135](../../../../fe/src/app/(dashboard)/admin/staff/components/StaffTable.tsx#L123-L135)).

| Current state | Button shown (verbatim) | Style | Confirm? | Sends | Next state |
|---|---|---|---|---|---|
| active | `Đang HĐ` | green pill (`bg-green-100 text-green-700`) | none | `setStaffStatus(id, false)` → `PATCH /staff/:id/status {is_active:false}` | inactive |
| inactive | `Vô hiệu` | red pill (`bg-red-100 text-red-700`) | `confirm('Kích hoạt lại nhân viên này?')` ([page.tsx:122-124](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L122-L124)) | `setStaffStatus(id, true)` | active |

- Button is **disabled** when `s.id === currentUserId` ([StaffTable.tsx:126](../../../../fe/src/app/(dashboard)/admin/staff/components/StaffTable.tsx#L126)) — you cannot toggle your own row from the UI.
- BE also enforces `SELF_DEACTIVATION_FORBIDDEN` (defense in depth, [staff_service.go:35](../../../../be/internal/service/staff_service.go#L35)); the FE maps that code to toast `Không thể vô hiệu hóa chính mình` ([page.tsx:95](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L95)).
- ⚠️ **Asymmetric confirm:** re-activating (inactive→active) prompts a `confirm()`, but **deactivating** (active→inactive) does **not** — the riskier direction is the unguarded one. Flagged as a UX concern (see Concerns).

### Other row actions (not status-routed, listed for completeness)

| Button | Visible when | Action |
|---|---|---|
| `Chi tiết` | always | opens M2 (`setDetailId(s.id)`) |
| `Sửa` | always | opens M1 in `edit` mode |
| `Xóa` | `canDelete(s)` only | `DELETE /staff/:id` after `confirm(...)` |

`canDelete` ([StaffTable.tsx:61-66](../../../../fe/src/app/(dashboard)/admin/staff/components/StaffTable.tsx#L61-L66)) — hides the delete button when: target is `manager`, OR target is self, OR `roleLevels[target] >= callerLevel` (role hierarchy `customer:1 < chef/cashier:2 < staff:3 < manager:4 < admin:5`). BE backstops with `LAST_ADMIN` ([staff_service.go:37](../../../../be/internal/service/staff_service.go#L37)) → toast `Không thể xóa admin cuối cùng`.

---

## StaffTable / StatsBar — Rules

- **Stats counts are global, filter is local:** StatsBar (B) counts over `allStaff`; the table (D) shows `filtered → paginated` (`PAGE_SIZE = 10`, [page.tsx:24](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L24)). So the "Đang hoạt động" KPI can read higher than the rows on screen.
- **No explicit sort:** rows render in the order the BE returns them (`listStaff` → `data.data`); `filtered` preserves array order and is sliced for pagination. No `sort()` anywhere in the page — so "sorted by X" is **not** claimed.
- **Search** ([page.tsx:54](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L54)): case-insensitive substring match on `full_name` **or** `username` only (not phone/email/role).
- **Filter changes reset to page 1** ([page.tsx:167-169](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L167-L169)).
- **`safePage` clamp** ([page.tsx:63](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L63)): if the active page exceeds `totalPages` after filtering, it clamps to the last page (avoids empty table).
- **No optimistic update:** the toggle mutation has no `onMutate`; the row flips only after `invalidate()` refetches (`['admin','staff']`, `staleTime: 0`).

---

## What Information Comes FROM BE (reads)

| Hook | Query key | Endpoint | Params | `staleTime` | `enabled` gating |
|---|---|---|---|---|---|
| `listStaff` ([page.tsx:42-47](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L42-L47)) | `['admin','staff']` | `GET /staff` | `?limit=100` (hardcoded) | `0` | always; `refetchOnWindowFocus: true` |
| `fetchStaffDetail` ([StaffDetailDrawer.tsx:54-59](../../../../fe/src/app/(dashboard)/admin/staff/components/StaffDetailDrawer.tsx#L54-L59)) | `['admin','staff', staffId]` | `GET /staff/:id` | path `id` | `30_000` | `!!staffId && open` |

**Fields received** — `Staff` ([staff.ts:5-19](../../../../fe/src/types/staff.ts#L5-L19)):
`id` · `username` · `full_name` · `role` (`chef\|cashier\|staff\|manager\|admin`) · `job_title` ·
`shifts[]` (`sang\|chieu\|toi`) · `responsibilities` · `phone` (nullable) · `email` (nullable) ·
**`is_active`** (the status boolean) · `performance_score` · `created_at` · `updated_at?`.

`listStaff` returns the **envelope** `StaffListResponse { data: Staff[], meta:{page,limit,total} }`
([staff.ts:28-31](../../../../fe/src/types/staff.ts#L28-L31)) and the page reads `data?.data ?? []`.
`fetchStaffDetail` unwraps `r.data.data` to a bare `Staff`.

- **No client-side enrichment/joins** — labels (role/shift) are static maps in the components; nothing is resolved against another query.
- `meta` from the list response is **ignored** — pagination is fully client-side over the ≤100 rows fetched.

---

## What Information Is SENT TO BE (writes)

Four mutations, all REST, no payload-builder (no cart/order involvement on this page).

### 1. Create — `POST /staff` ([admin.api.ts:98-99](../../../../fe/src/features/admin/admin.api.ts#L98-L99))
```json
{ "username": "chef_an", "password": "Secret123",
  "full_name": "Nguyễn Văn An", "role": "cashier",
  "job_title": "", "shifts": ["sang"], "responsibilities": "", "phone": "", "email": "" }
```
Body = RHF `createSchema` values ([AddEditStaffModal.tsx:31-36](../../../../fe/src/app/(dashboard)/admin/staff/components/AddEditStaffModal.tsx#L31-L36)). On error `USERNAME_TAKEN` → toast `Tên đăng nhập đã tồn tại`; else generic. Success → invalidate + `closeModal()`.

### 2. Edit — `PATCH /staff/:id` ([admin.api.ts:101-102](../../../../fe/src/features/admin/admin.api.ts#L101-L102))
Body = `editSchema` (same fields **minus** `username`/`password` — those are create-only). Success → invalidate + close.

### 3. Set status — `PATCH /staff/:id/status` ([admin.api.ts:104-105](../../../../fe/src/features/admin/admin.api.ts#L104-L105))
```json
{ "is_active": false }
```
The **only** status-routing write. Returns `void` (no body used). Error codes mapped: `SELF_DEACTIVATION_FORBIDDEN` → `Không thể vô hiệu hóa chính mình`, else `Không đủ quyền`.

### 4. Delete — `DELETE /staff/:id` ([admin.api.ts:107-108](../../../../fe/src/features/admin/admin.api.ts#L107-L108))
No body. Error `LAST_ADMIN` → `Không thể xóa admin cuối cùng`, else `Không đủ quyền`.

All four call `invalidate()` = `qc.invalidateQueries({ queryKey:['admin','staff'] })` on success and surface a `sonner` toast.

---

## How It Manages Data CROSS-PAGE

| Store | localStorage key | Persisted? | What it carries | File |
|---|---|---|---|---|
| `useAuthStore` | — (access token in **memory only**) | No (`partialize` excludes token per project rule) | `user.id`, `user.role` — used for self-toggle guard + `canDelete` role hierarchy | `fe/src/features/auth/auth.store.ts` |

- This page reads `useAuthStore(s => s.user)` ([page.tsx:28](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L28)) and passes `user?.id` / `user?.role` into `StaffTable` to gate the toggle (self) and delete (hierarchy).
- **No `localStorage` handoffs** (no `order_cache_*`-style cross-page payload), **no Zustand writes**, **no cross-tab persistence** of staff data — the staff list lives entirely in the TanStack Query cache (`['admin','staff']`), gone on reload.
- Access token is attached by the axios interceptor in `lib/api-client.ts` (Bearer header) per `MASTER_v1.2.md §6` — relevant because every read/write here is admin-gated.
- **End-to-end loop:** `GET /staff?limit=100` → client filter/paginate → render table + global stats → admin clicks toggle/edit/delete → `PATCH`/`POST`/`DELETE` → invalidate `['admin','staff']` → refetch → re-render. No navigation, no preview, no handoff.

---

## Concerns

| # | Concern | Where | Severity |
|---|---|---|---|
| 1 | Asymmetric confirm: re-activate prompts `confirm()`, but **deactivate has none** — the destructive direction (cutting off login) is unguarded. | [page.tsx:121-126](../../../../fe/src/app/(dashboard)/admin/staff/page.tsx#L121-L126) | ⚠️ FLAG (UX) |
| 2 | StatsBar counts over `allStaff` while the table shows a filtered/paginated slice — "Đang hoạt động" KPI can mismatch visible rows (intended, but easy to misread). | [StaffStatsBar.tsx:17-19](../../../../fe/src/app/(dashboard)/admin/staff/components/StaffStatsBar.tsx#L17-L19) | 💡 note |
| 3 | `listStaff` hardcodes `?limit=100` and ignores `meta.total`; a >100-staff stall would silently truncate. | [admin.api.ts:92-93](../../../../fe/src/features/admin/admin.api.ts#L92-L93) | ⚠️ FLAG (scale) |
| 4 | Live snapshot not captured (Playwright profile locked). Doc is code-traced only; no DOM/console verification this run. | — | ⚠️ refresh later |

---

> **CLAUDE.md note:** this page is **not** currently a "MUST READ before touching X" surface and is
> not in the Single Sources table. No change recommended unless the owner wants to elevate it.
