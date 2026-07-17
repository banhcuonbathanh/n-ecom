# Comparison — Doc vs. Code — `/admin/staff` (Quản lý nhân viên)

> **Scope:** a read-only audit of the `admin_staff` doc-set against the running FE/Go code, across
> 4 applicable axes — **Component visuals · Cross-page dataflow · Loading behaviour · FE⇄BE data
> model**. (Area 2 *Cross-component dataflow* does **not** apply — there is no shared page store and no
> `_crosscomponent_dataflow.md`; the page holds all filter/modal state in local `useState` and only
> reads `useAuthStore` for the current user.) **Read-only — no code and no page-doc was changed.**
> Produced by 2 parallel Sonnet agents (BE+types, FE component files); the orchestrator read `page.tsx`
> in full and hand-verified the two visual-drift findings + every 🔴 candidate against source.
> **Code wins.** Branch audited: `experience_claude.md_system_1_test_iphon2_change_code` (the doc-set
> was authored on the older `experience_claude.md_system_1`, hence the Go line-number drift below).
> Date: 2026-06-21.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals | ✅ Logic faithful, but the **ASCII wireframe drifted** (StatsBar card count + action-button style) | 0 | 2 | 7 |
| 3 — Cross-page dataflow | ✅ Faithful — Redis `Del` lockout + soft-delete + dropdown ripple all confirmed | 0 | 0 | 6 |
| 4 — Loading behaviour | ✅ Faithful — 4 layers + branch order match; doc correctly self-flags the drawer error gap | 0 | 1 | 9 |
| 5 — FE⇄BE data model | ✅ Behaviour 100% faithful; only Go line-numbers stale (+ two repo lines transposed) | 0 | 5 | 25+ |
| **Total** | **No 🔴 — FE & BE agree on every route, shape, and guard** | **0** | **8** | **47+** |

**One-paragraph verdict:** Another high-fidelity set. Every backend guard the docs claim — the
manager+ group gate, the admin-only `DELETE`, the create/update role-hierarchy checks, the
self-deactivation block, the last-admin protection, and the `Del(auth:staff:<id>)` immediate-lockout —
is confirmed verbatim against current Go source, as is the hardcoded `performance_score: 0` stub. The
FE `page.tsx` line-citations all land exactly. There is **no 🔴**. The drift is two-flavoured:
**(a) mechanical** — the `_be.md` Go line numbers are stale because `main.go`/`staff_service.go`/
`staff_repo.go` shifted on the newer branch (and two repo helper lines, `CountAdmins`↔`SoftDeleteStaff`,
are transposed); **(b) one genuine visual drift** — the `admin_staff.md` ASCII wireframe draws the
StatsBar as five per-role cards and the row actions as four grouped emoji icons, while the code renders
four KPI cards (role breakdown folded into a sub-label) and text buttons with the status toggle in its
own column.

---

## 🔴 RAISE-MY-VOICE headline findings

**None.** No hand-verified 🔴. Both agents' candidate concerns were re-checked and held no
contradiction:

- `DELETE /staff/:id` **is** admin-gated in current `main.go` (the `adm := staffR.Group("")` +
  `AtLeast("admin")` is intact, just moved). ✅
- `performance_score` **is** a hardcoded `0` in `toStaffJSON` (`staff_handler.go:250`) with no backing
  column — Flag 8 holds. The FE renders the field (`StaffTable.tsx:119-120`); it shows 0% only because
  the BE always sends 0. Doc accurate. ✅
- Every business guard (self-deactivation, last-admin, hierarchy) and both Redis `Del`s are present. ✅

> Honest result: the page's behaviour matches its docs. The only "loud" item is a stale **wireframe**,
> not a broken flow.

---

## Dead / unreachable components found

- **Dead defensive guards in handlers (doc Flag 1, confirmed):** `GetStaff` (`staff_handler.go:60-63`)
  and `UpdateStaff` (`staff_handler.go:117-120`) carry a `id != callerID && !roleAtLeast(callerRole,
  "manager")` self-or-manager check whose 403 branch is **unreachable** — the route group already
  forces manager+, so `roleAtLeast(...,"manager")` is always true. Leftover from a planned self-edit
  path. The non-manager `role`-drop in `UpdateStaff` (`staff_handler.go:163-165`) is inert for the same
  reason.
- **Over-broad self-block (doc Flag 5, confirmed):** `SetStaffStatus` rejects *any* self-toggle
  (`staff_service.go:204`), not just self-deactivation — harmless, FE also disables the button for self
  (`StaffTable.tsx:126`).
- **FE micro-smell (not dead):** `AddEditStaffModal`'s `field()` helper accepts a `name` arg it never
  uses — always returns the same class string. Cosmetic.
- **No zero-import components.** Both modals are reachable via `next/dynamic`; all six child components
  are imported by `page.tsx`.

---

## Area 1 — Component visuals

**Verdict:** ✅ The component *logic* matches; the **ASCII wireframe in `admin_staff.md` is the part
that drifted** — two zones render differently from the drawing.

| Component / Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `StaffPageHeader` | "Nhân viên (N)" + "+ Thêm nhân viên" | `StaffPageHeader.tsx:9-10,16` — exact | 🟢 | — |
| `StaffStatsBar` — **card layout** | ASCII draws **5** cards: `Tổng · Admin · Cashier · Chef · Inactive` (`admin_staff.md:21`) | `StaffStatsBar.tsx:31-50` renders **4** KPICards: `Tổng nhân viên · Đang hoạt động · Vô hiệu hóa · Theo vai trò` — per-role counts folded into the 4th card's `subLabel` (`:26-28,45-49`) | 🟡 | Redraw the Zone B ASCII as 4 cards (last = "Theo vai trò" with `chef:N · cashier:N …` sub-label) |
| `StaffFilterBar` | search + role select + status select | `StaffFilterBar.tsx:3-16` — roles `chef/cashier/staff/manager/admin` (admin IS in the **filter**, correctly), status `active/inactive` | 🟢 | — |
| `StaffTable` — **action buttons** | ASCII draws 4 grouped emoji icons `[👁][✎][⏻][🗑]` (`admin_staff.md:27-28`) | `StaffTable.tsx:123-159` — **text** buttons "Chi tiết"/"Sửa"/(cond.)"Xóa" in the last column, and the **status toggle is a SEPARATE column** ("Đang HĐ"/"Vô hiệu", `:124-134`), not grouped with them | 🟡 | Redraw Zone D actions as text buttons + a separate status-toggle column |
| `StaffTable` — `canDelete` RBAC | hides 🗑 for managers / self / role≥caller (`:61-66`) | `StaffTable.tsx:62` (`role==='manager'`), `:63` (self), `:64` (`roleLevels[role] >= callerLevel`) | 🟢 | (doc cites `:64` for self — actually `:63`; trivial) |
| `StaffTable` — self toggle disabled | `disabled` for current user (`:126`) | `StaffTable.tsx:126` — `disabled={s.id === currentUserId}` | 🟢 | — |
| `StaffTable` — `performance_score` bar | Flag 8: shows a literal 0% for every row (BE stub) | `StaffTable.tsx:119-120` — renders `s.performance_score` (BE sends 0 → 0%); accurate | 🟢 | — |
| `StaffTable` — empty state | "Không có nhân viên nào phù hợp." (`:52-54`) | `StaffTable.tsx:52-53` — exact | 🟢 | — |
| `AddEditStaffModal` — role select omits `admin` | Flag 4: `<select>` omits admin (`:14-19`) | `AddEditStaffModal.tsx:14-19` `ROLES = chef/cashier/staff/manager`; Zod `z.enum([...])` `:23` enforces | 🟢 | — |
| `StaffDetailDrawer` | `['admin','staff',id]`, `enabled`, `staleTime:30s`, "Đang tải...", [Sửa] | `StaffDetailDrawer.tsx:55,57,58,66-67,173-177` — all exact (button label "Sửa thông tin") | 🟢 | — |

---

## Area 3 — Cross-page dataflow

**Verdict:** ✅ Faithful. The two server hubs (the `staff` MySQL row + the `auth:staff:<id>` Redis
cache) and the pull-only (no SSE/WS) downstream model are exactly as described.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Immediate lockout via cache `Del` | status/delete `Del(auth:staff:<id>)` → next request re-reads MySQL | `staff_service.go:230` (status) + `:268` (delete); read at `auth.go:55` → `auth_service.go:315-334` | 🟢 | — |
| Soft-delete only, no token cascade | `deleted_at=NOW()`; refresh_tokens NOT purged (Flag 6) | `staff_repo.go:240-251` UPDATE only; "revoke sessions" comment `staff_service.go:267` unimplemented | 🟢 | — |
| Dropdown ripple | new staff assignable; deactivated still listed; deleted vanishes | `GET /staff` filters `deleted_at IS NULL` only, not `is_active` — confirmed `staff_repo.go:70+` | 🟢 | — |
| Invalidate on mutation | `qc.invalidateQueries(['admin','staff'])` | `page.tsx:67` — exact | 🟢 | — |
| No SSE/WS | pull-only, refetch on focus | no realtime hook in `page.tsx`; `staleTime:0 + refetchOnWindowFocus` `page.tsx:45-46` | 🟢 | — |
| Fail-open if Redis down | `IsStaffActive` returns true on Redis error | `auth_service.go:323-325` + `_ = rdb.Del(...)` ignores error | 🟢 | — |

---

## Area 4 — Loading behaviour

**Verdict:** ✅ Faithful. The 4 layers and the Error→Loading→empty→rows branch order match. The doc's
key self-flag — the **detail drawer has no error branch** — is confirmed.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| List query config | `staleTime:0`, `refetchOnWindowFocus:true` | `page.tsx:42-47` — exact | 🟢 | — |
| Error branch | `EmptyState` + "Thử lại" `refetch()` (`:139-153`) | `page.tsx:139-153` — exact | 🟢 | — |
| Loading line | StatsBar hidden (`!isLoading`), table shows "Đang tải..." | `page.tsx:163` + `page.tsx:173-174` — exact | 🟢 | — |
| Branch order | isError → isLoading → empty → rows | `page.tsx:139,173,176` + `StaffTable.tsx:52` empty | 🟢 | — |
| Modal pending | "Đang lưu..." on `createMut\|editMut.isPending` | `page.tsx:155,199` + `AddEditStaffModal.tsx:206-212` (doc cites `:208-211`) | 🟢 | — |
| Drawer config | `enabled:!!staffId && open`, `staleTime:30s` | `StaffDetailDrawer.tsx:57-58` — exact | 🟢 | — |
| **Drawer has no error branch** | Flag 1: failed `GET /staff/:id` stays on "Đang tải..." forever | `StaffDetailDrawer.tsx:54-66` — only `isLoading \|\| !staff`, no `isError` | 🟡 | Real code gap — doc **correct**. Add an `isError` branch to the drawer (future code task). |
| Loading vs empty vs no-match | Flag 2: empty data and filtered-to-nothing look identical | `StaffTable.tsx:52-53` single `EmptyState` for both | 🟢 | (doc-accurate; UX nit) |
| Refetch-on-focus silent | Flag 4: no indicator on background refetch | `page.tsx:46` — accurate | 🟢 | — |

---

## Area 5 — FE⇄BE data model

**Verdict:** ✅ Every behavioural and contract claim confirmed. Drift is purely line-number staleness
(the doc's branch predates the current one) plus two transposed repo line refs.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `/staff` route group + manager gate | `main.go:280-281` | `main.go:293-294` — identical statements, shifted +13 | 🟡 | Re-cite `:293-294` |
| Admin-only `DELETE` sub-group | `main.go:287-290` | `main.go:300-304` — `adm := staffR.Group("")` + `AtLeast("admin")` intact | 🟡 | Re-cite `:300-304` |
| 6-endpoint handlers | `ListStaff :26`, `GetStaff :55`, `CreateStaff :74`, `UpdateStaff :112`, `SetStaffStatus :190`, `DeleteStaff :217` | all confirmed at the cited handler lines (`staff_handler.go`) | 🟢 | — |
| `performance_score` stub | hardcoded `0`, no column (Flag 8) `:250` | `staff_handler.go:250` — `"performance_score": 0` literal | 🟢 | — |
| Role-level map | `customer1/chef2/cashier2/staff3/manager4/admin5` `:19-26` | `staff_service.go:19-26` — exact | 🟢 | — |
| Create hierarchy guard | `targetLevel >= callerLevel → ErrInsufficientRole` `:109` | `staff_service.go:109-111` — exact | 🟢 | — |
| Update dual-level guard | `currentLevel<callerLevel && newLevel<callerLevel` `:177` | `staff_service.go:177-179` — exact (OR-reject form) | 🟢 | — |
| Self-deactivation block | `callerID==targetID → ErrSelfDeactivationForbidden` `:203-205` | `staff_service.go:204-206` — exact, shifted +1 | 🟡 | Re-cite `:204-206` |
| Self-delete block | `callerID==targetID → ErrInsufficientRole` `:236-238` | `staff_service.go:237-239` — exact, shifted +1 | 🟡 | Re-cite `:237-239` |
| Last-admin guard | `CountAdmins<=1 → ErrLastAdmin` `:252-257` | `staff_service.go:251-258` — exact | 🟢 | — |
| Both Redis `Del`s | `:230` (status) + `:268` (delete) | `staff_service.go:230,268` — exact | 🟢 | — |
| Repo `CountAdmins` / `SoftDeleteStaff` lines | `CountAdmins :240`, `SoftDeleteStaff :253` | **transposed** in current code — `SoftDeleteStaff :240-251`, `CountAdmins :253-260` | 🟡 | Swap the two doc line refs |
| `IsStaffActive` range | `auth_service.go:315-383` | function body is `:315-334`; `:367-383` are separate cache helpers | 🟡 | Tighten range to `:315-334` |
| FE `listStaff` payload | `?limit=100` `:92` | `admin.api.ts:93` — `api.get('/staff?limit=100')`, shifted +1 | 🟢 | (re-cite `:93` if pedantic) |
| FE mutation callers | `createStaff/updateStaff/setStaffStatus/deleteStaff` `:68-108` | `admin.api.ts:98-108` — all present | 🟢 | — |
| FE `Staff`/`StaffRole` types | fields incl. `is_active/role/full_name/username/performance_score` | `fe/src/types/staff.ts:1,5-18` — all match `toStaffJSON` keys | 🟢 | — |
| No read-cache (Redis) | every `GET /staff*` hits MySQL | confirmed — only Redis touch is the auth-cache `Del` | 🟢 | — |

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🟡 Doc fix | Redraw the Zone B (StatsBar) ASCII as **4** KPI cards — last card "Theo vai trò" with a `chef:N · cashier:N …` sub-label | `admin_staff.md:21` |
| 2 | 🟡 Doc fix | Redraw the Zone D row actions as **text** buttons (Chi tiết / Sửa / Xóa) + a **separate** status-toggle column, not 4 grouped emoji | `admin_staff.md:25-29` |
| 3 | 🟡 Doc fix | Refresh stale Go line-cites: `main.go` group `:280-281→:293-294`, DELETE sub-group `:287-290→:300-304`; `staff_service.go` self-block `:203→:204`, self-delete `:236-238→:237-239`; **swap** repo `CountAdmins`/`SoftDeleteStaff`; `IsStaffActive` `:315-383→:315-334` | `admin_staff_be.md` (multiple) |
| 4 | 🟡 Doc fix | Minor FE line-cites: `listStaff` `:92→:93`; self-delete guard `:64→:63`; empty state `:52-54→:52-53`; submit button `:208-211→:206-212` | `admin_staff.md`, `admin_staff_loading.md` |
| 5 | 🟡 Code bug | Add an `isError` branch to `StaffDetailDrawer` so a failed `GET /staff/:id` shows an error/close, not a permanent "Đang tải..." | `StaffDetailDrawer.tsx:54-66` |

> **CLAUDE.md note:** items 1–4 are a single doc-fix task. Item 5 is a code change — register it as a
> row in `docs/tasks/MASTER_TASK.md` and ALIGN with the owner **before** touching the file. This
> comparison file changes nothing on its own.
