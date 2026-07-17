# Scenario — Managing the Staff Roster — `/admin/staff`

> **TL;DR:** ✅ implemented · A narrative run through `/admin/staff`: a manager hires a new cashier,
> fixes a typo on a chef's record, deactivates someone who quit, and is stopped from deleting the
> only admin. Built on this page's real endpoints (see [admin_staff_be.md](admin_staff_be.md)) and
> its pull-only cross-page flow ([admin_staff_crosspage_dataflow.md](admin_staff_crosspage_dataflow.md)).
> Loading beats reference [admin_staff_loading.md](admin_staff_loading.md). This is a CRUD-admin
> story — it does not feed the live floor; for the lunch-rush picture see
> [SCENARIO_LUNCH_RUSH.md](../../customer/customer_menu/SCENARIO_LUNCH_RUSH.md).

---

## Cast

- **Hương** — restaurant **manager** (role `manager`, level 4), logged into the admin shell.
- **Quân** — the new hire, to be created as a **cashier**.
- **Lâm** — an existing **chef** with a misspelled name.
- **Tú** — a cashier who quit; to be deactivated.
- **(system)** — the lone **admin** account, which Hương will try and fail to delete.

## Setting

Mid-morning, before service. Hương opens **Quản trị → Nhân viên**. The admin shell's
`AuthGuard`/`RoleGuard minRole=MANAGER` confirms her role; the orange spinner (`admin/loading.tsx`)
flashes, then the page mounts and fires `GET /staff?limit=100`. The StatsBar is hidden for the
half-second the list loads ("Đang tải..."), then the table fills with the current roster.

---

## Timeline

**10:02 — Hire Quân (create).**
Hương taps **+ Thêm nhân viên**. The `AddEditStaffModal` chunk loads (dynamic import) and opens in
*add* mode. She fills username `quan_tn`, a password `Quan@2026` (the Zod schema demands ≥8 chars +
1 uppercase + 1 digit), full name, role **Thu ngân (cashier)**, ticks the **Sáng** + **Chiều**
shifts. Submit → `POST /staff`.
→ BE: role `cashier` (level 2) < her level 4 ✅, username free ✅, bcrypt, INSERT `is_active=1`.
→ 201. Toast **"Đã tạo tài khoản nhân viên"**, modal closes, list invalidates and refetches — Quân
appears. *He can now log in at `/login` immediately* (cross-page §4).

**10:05 — Fix Lâm's name (update).**
Lâm's row reads "Lam Văn". Hương taps **Sửa** → modal opens in *edit* mode (no username/password
fields — those aren't editable). She corrects the name and saves → `PATCH /staff/:id`.
→ BE: handler diffs the raw JSON, sends only `full_name`; no role change so no hierarchy check; dynamic
`UPDATE`. 200, toast **"Đã cập nhật nhân viên"**.

**10:08 — Deactivate Tú (status).**
Tú quit. Hương clicks Tú's green **Đang HĐ** pill → `PATCH /staff/:id/status {is_active:false}`.
→ BE: she isn't Tú (self-check passes), Tú is a cashier below her ✅, `UPDATE is_active=0`, then
**`Del auth:staff:<tú-id>`**. 200, toast **"Đã cập nhật trạng thái"**; the pill turns red **Vô hiệu**.
→ Downstream: if Tú still had the POS open, his *next* API call hits the auth middleware, which
re-reads MySQL (cache was Del'd) and returns 401 — he's locked out within seconds, not after the
5-min TTL (cross-page §3).

**10:10 — Try to delete the admin (blocked).**
Curious, Hương looks for a delete on the **admin** row — but `StaffTable.canDelete` hides 🗑 for any
role ≥ her level, and the route is admin-only anyway. Had an *admin* tried to delete the last admin,
the BE `CountAdmins ≤ 1` guard returns 409 `LAST_ADMIN` → toast **"Không thể xóa admin cuối cùng"**.
She also can't deactivate herself — that button is `disabled`, and the BE would return
`SELF_DEACTIVATION_FORBIDDEN`.

**10:11 — Inspect Quân (detail drawer).**
She taps **Chi tiết** on Quân → `StaffDetailDrawer` chunk loads, fires `GET /staff/:id`
(`['admin','staff',id]`, staleTime 30s), shows "Đang tải..." then the avatar + four tabs. The
**Hiệu suất** tab shows **0% · "Chưa có dữ liệu hiệu suất"** — because `performance_score` is a
hardcoded stub, not real data (be Flag 8); the real KPIs are on `/admin/summary`.

---

## Under the hood

**A — Cross-component (this page).** No shared Zustand store. The page component owns
`search/role/status/page` + modal/detail state in `useState`, holds the roster in one TanStack query
`['admin','staff']`, and **prop-drills** slices down to `StaffStatsBar`, `StaffFilterBar`,
`StaffTable`, and the two overlays. Filtering/pagination is pure client-side memo (`page.tsx:51-64`)
— that's why there's no `_crosscomponent_dataflow.md` for this page.

**B — Cross-page.** Writes land in the `staff` MySQL row + (for status/delete) Del the
`auth:staff:<id>` Redis cache. Reads fan out to: the auth middleware (every request), login,
the todo-list/task-board assignee dropdowns, and A2 staff-performance. All pull-only — see
[admin_staff_crosspage_dataflow.md](admin_staff_crosspage_dataflow.md).

**C — FE → BE sends.** `GET /staff?limit=100` (no filter params — filtered client-side);
`POST/PATCH/DELETE /staff[/…]` via `admin.api.ts:92-108`. Error codes (`USERNAME_TAKEN`,
`SELF_DEACTIVATION_FORBIDDEN`, `LAST_ADMIN`, `INSUFFICIENT_ROLE`) map to specific Vietnamese toasts;
everything else falls to "Có lỗi xảy ra".

**D — BE → FE receive / live.** No realtime for staff. A second manager's view reconciles only on
window-focus refetch. The single near-live effect is the *target's* lockout via the auth middleware.

**E — Loading & caching.** No Redis read-cache; TanStack only (`staleTime:0` list,
`refetchOnWindowFocus`, 30s drawer). Loading surfaces are spinners/text, no skeletons —
[admin_staff_loading.md](admin_staff_loading.md).

**F — Monitoring.** Standard Gin request metrics; no staff-specific telemetry. Auth-middleware
re-checks on lockout are visible only as 401s on the target's requests.

---

## One-line mental model

**This page is plain manager-gated CRUD over one MySQL table; its only "live" tentacle is the
`is_active` cache the auth middleware reads on every request — deactivate someone and they're out on
their next click, but two managers watching the roster only see each other's edits on a tab-focus
refetch.**
