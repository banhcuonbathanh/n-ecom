# Admin Staff — `/admin/staff`

> **TL;DR:** ✅ implemented · manager+ · Staff account management: header with add button, stats
> bar, filter bar (search/role/status), paginated table (10/page, client-side), add/edit modal and
> a detail drawer. Mutations: create, update, activate/deactivate, delete — with guard errors
> (`SELF_DEACTIVATION_FORBIDDEN`, `LAST_ADMIN`, `USERNAME_TAKEN`).
> **Backend view → [admin_staff_be.md](admin_staff_be.md)** · loading → [admin_staff_loading.md](admin_staff_loading.md)
> · cross-page → [admin_staff_crosspage_dataflow.md](admin_staff_crosspage_dataflow.md)
> · scenario → [SCENARIO_STAFF_MANAGE.md](SCENARIO_STAFF_MANAGE.md).

---

## ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ (admin shell: tab nav)                                           │
├──────────────────────────────────────────────────────────────────┤
│ A  Nhân viên (12)                            [+ Thêm nhân viên]  │ ← StaffPageHeader
├──────────────────────────────────────────────────────────────────┤
│ B  ┌Tổng: 12┐ ┌Admin: 1┐ ┌Cashier: 4┐ ┌Chef: 5┐ ┌Inactive: 2┐    │ ← StaffStatsBar
├──────────────────────────────────────────────────────────────────┤
│ C  🔍[Tìm tên/username]  [Vai trò ▾]  [Trạng thái ▾]             │ ← StaffFilterBar
├──────────────────────────────────────────────────────────────────┤
│ D  ┌──────────────────────────────────────────────────────────┐  │ ← StaffTable
│    │ Họ tên      Username  Vai trò   Trạng thái   Hành động   │  │
│    │ Ng. Văn A   chef01    chef      ● active   [👁][✎][⏻][🗑]│  │
│    │ Tr. Thị B   cash02    cashier   ○ inactive [👁][✎][⏻][🗑]│  │
│    └──────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│ E              ◀ 1 [2] 3 ▶                                       │ ← Pagination
└──────────────────────────────────────────────────────────────────┘
  Overlays: M1 AddEditStaffModal (form: name, username, password, role)
            M2 StaffDetailDrawer (full profile + [Sửa])
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| A Header | `staff/components/StaffPageHeader` | total count |
| B Stats | `staff/components/StaffStatsBar` | derived from full list |
| C Filters | `staff/components/StaffFilterBar` | local state (client-side filter) |
| D Table | `staff/components/StaffTable` | `GET /staff?limit=100` (`listStaff`, staleTime 0) |
| E Pagination | `components/shared/Pagination` | client-side, 10/page |
| M1 Modal | `staff/components/AddEditStaffModal` (dynamic import) | `createStaff` / `updateStaff` |
| M2 Drawer | `staff/components/StaffDetailDrawer` (dynamic import) | staff detail |

## Key Interactions

- **+ Thêm nhân viên** → M1 in add mode → `POST` (`USERNAME_TAKEN` → toast).
- Row **✎** (or **Sửa** from drawer) → M1 in edit mode → `PATCH /staff/:id` update.
- Row **⏻** toggle → confirm (when re-activating) → `setStaffStatus`; deactivating yourself is
  rejected (`SELF_DEACTIVATION_FORBIDDEN` toast).
- Row **🗑** → `confirm()` → `deleteStaff`; deleting the last admin is rejected (`LAST_ADMIN`).
- Row **👁** → M2 detail drawer.
- Filters reset to page 1; error state shows `EmptyState` + retry.

## Business Logic Used

- Role hierarchy + who can manage whom → [../../../02_spec/BUSINESS_RULES.md §1 RBAC](../../../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy)
- Account guard rules (self-deactivation, last admin) → [../../../02_spec/BUSINESS_RULES.md §1 RBAC](../../../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy)
- Admin query/mutation patterns → [../../../07_business_logic/LOGIC_FE.md](../../../07_business_logic/LOGIC_FE.md) (admin CRUD pattern)
