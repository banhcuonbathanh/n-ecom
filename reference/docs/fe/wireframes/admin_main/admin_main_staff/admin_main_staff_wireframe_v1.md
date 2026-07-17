---
page: admin_main_staff
route: /admin/staff
spec_ref: Spec_7_Staff_Management.md
created: 2026-05-26
status: Draft
---

# Page: Admin — Nhân viên (Staff Management)
**Route:** `/admin/staff`
**Version:** v1
**Status:** Draft

## Spec Summary

- Desktop admin CRUD page for managing all staff accounts; guards: `AuthGuard` + `RoleGuard(['admin', 'manager'])`
- Stats bar (Zone B) derives 4 KPI cards directly from the same `GET /admin/staff` list — no extra API call
- Client-side filtering in Zone C: search by name/username, filter by Vai trò (role), filter by Trạng thái — all over the fetched list
- Staff table (Zone D) shows role-colored badge, multi-shift chips, orange progress bar, status badge, and Chi tiết / Sửa / Xóa actions; Xóa hidden for Quản lý role
- Modal M1 (Add/Edit): 9 fields — 3 new vs. existing API: `job_title`, `shifts[]`, `responsibilities`
- Modal M2 (Chi tiết): read-only tabbed drawer — Thông tin / Hiệu suất / Lịch làm việc / Trách nhiệm
- Pagination (Zone E): server-side paging via `page` param; stats bar counts derived from full list before pagination

---

## 📐 Visual Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  TOP NAV  (bg #1e293b, h=48, sticky top-0 z-50)                                 │
│  "Quản trị hệ thống"  Tổng quan · Tổng kết · Sản phẩm · Combo · Danh mục      │
│  · Topping · [Nhân viên ← active, orange underline] · Marketing                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ZONE A — PageHeader  (h=52, card, bg #fff, border #e2e8f0)                     │
│  "Nhân viên (8)"                           [+ Thêm nhân viên] (orange btn)     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ZONE B — StatsBar  (h=88, 4 cards side-by-side, gap-4)                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐  │
│  │ Tổng NV      │ │ Đang HĐ      │ │ Vô hiệu      │ │ Theo vai trò          │  │
│  │     8        │ │     6        │ │     2        │ │ Bếp:2 · Thu ngân:2    │  │
│  │              │ │  (green)     │ │  (red)       │ │ NV:3 · QL:1           │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ZONE C — FilterBar  (h=44, card, bg #fff)                                      │
│  [🔍 Tìm tên / username...  (input w=370)] [Vai trò ▾ w=150] [Trạng thái ▾ w=160]│
├─────────────────────────────────────────────────────────────────────────────────┤
│  ZONE D — StaffTable  (GET /admin/staff, scrollable)                            │
│  ┌─────┬──────────────┬───────────┬──────────┬───────────┬───────────┬────────┐ │
│  │ Avt │ Tên đầy đủ  │ Username  │ Vai trò  │ Ca làm    │ Hiệu suất │ Status │ │
│  ├─────┼──────────────┼───────────┼──────────┼───────────┼───────────┼────────┤ │
│  │ NV  │ Nguyễn Văn An│ chef_an  │ [Bếp]   │ Sáng Chiều│ ████░ 85%│[Đang HĐ]│[Chi tiết][Sửa][Xóa]│
│  │ TL  │ Trần Thị Lan │cashier_lan│[Thu ngân]│ Chiều Tối │ ████░ 72%│[Đang HĐ]│[Chi tiết][Sửa][Xóa]│
│  │ LT  │ Lê Minh Tuấn │staff_tuan │ [NV]    │ Sáng      │ ██░░░ 45%│[Vô hiệu]│[Chi tiết][Sửa][Xóa]│
│  │ PM  │ Phạm Thị Mai │ mgr_mai  │ [QL]    │ S+C+T     │ █████ 91%│[Đang HĐ]│[Chi tiết][Sửa]     │
│  └─────┴──────────────┴───────────┴──────────┴───────────┴───────────┴────────┘ │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ZONE E — Pagination  (h=44, card, bg #fff)                                     │
│                          [←]  [1 (active, orange)]  [2]  [→]                   │
└─────────────────────────────────────────────────────────────────────────────────┘

MODAL M1 — Thêm / Sửa nhân viên  (w=500, overlay)
┌──────────────────────────────────────────────────┐
│  Thêm nhân viên                              [✕] │
│  ──────────────────────────────────────────────  │
│  [Username ──────────────] [Mật khẩu ──────────] │
│  [Tên đầy đủ ─────────────────────────────────]  │
│  [Vai trò  ▾ ────────────] [Vị trí công việc ─]  │
│  Ca làm việc:                                    │
│  [✓ Sáng (orange)]  [✓ Chiều (orange)]  [Tối]   │
│  Trách nhiệm / Mô tả công việc:                  │
│  [textarea ─────────────────────────────────── ] │
│  [Số điện thoại ─────────] [Email ────────────]  │
│  ──────────────────────────────────────────────  │
│       [Huỷ]                  [Tạo tài khoản]    │
└──────────────────────────────────────────────────┘

MODAL M2 — Chi tiết nhân viên  (w=590, overlay)
┌──────────────────────────────────────────────────────────┐
│  [👤 60×60 avatar]  Nguyễn Văn An                   [✕] │
│                     [Bếp badge]  [● Đang HĐ badge]       │
│  ────────────────────────────────────────────────────    │
│  [Thông tin (active)] [Hiệu suất] [Lịch làm việc] [Trách nhiệm] │
│  ────────────────────────────────────────────────────    │
│  Username:      chef_an          Vai trò:   Bếp          │
│  Vị trí:        Bếp trưởng       Ca làm:    [Sáng][Chiều]│
│  SĐT:           0901 234 567     Email: an@banhcuon.vn   │
│  Ngày tạo:      01/03/2026                               │
│  ────────────────────────────────────────────────────    │
│  Hiệu suất (preview, faded):                             │
│  Tổng đơn: 1,240  Đánh giá: ★★★★☆  Đúng giờ: 92%  Nghỉ: 2/12 │
│  ────────────────────────────────────────────────────    │
│  Lịch làm (preview):  Ca Sáng 06:00–14:00  T2 T3 T4 T5 T6│
│  ────────────────────────────────────────────────────    │
│  Trách nhiệm (preview): • Chế biến bánh cuốn ... ...     │
│  ────────────────────────────────────────────────────    │
│  [Sửa thông tin (orange)]          [Đóng]                │
└──────────────────────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| TopNav | `AdminTopNav` | Always | sticky top-0 z-50 |
| A | `StaffPageHeader` | Always | static, below nav |
| B | `StaffStatsBar` | Always (derived from staff list) | static |
| C | `StaffFilterBar` | Always | static |
| D | `StaffTable` | Always; `EmptyState` when 0 results | static, scrollable |
| E | `Pagination` | When totalPages > 1 | static |
| M1 | `AddEditStaffModal` | When add or edit button clicked | modal overlay, z-50 |
| M2 | `StaffDetailDrawer` | When "Chi tiết" button clicked | modal overlay, z-50 |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| A | Derived from staff list count | N/A | `['admin', 'staff']` | Title count is `staffList.length` |
| B | Derived from staff list | Invalidate on mutation | `['admin', 'staff']` | Counts filtered client-side from full list |
| C | Local `useState` (search, role, status) | User input | N/A | Client-side filter over fetched list |
| D | `GET /api/v1/admin/staff` | Refetch on window focus; invalidate on mutation | `['admin', 'staff']` | Filtered + paginated client-side |
| E | Derived from filtered list length | Same as D | `['admin', 'staff']` | Client-side page count |
| M1 | RHF + Zod; POST/PATCH on submit | `useMutation` → invalidate `['admin', 'staff']` | `['admin', 'staff']` | Edit mode pre-fills from selected staff |
| M2 | `GET /api/v1/admin/staff/:id` | On demand when drawer opens | `['admin', 'staff', id]` | `enabled: !!selectedStaffId` |

---

## 🧩 Component Specifications

> Before filling this table: read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md`.
> Mark each row with one of: `✅ reuse` · `new (local)` · `new (shared)`

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|------------------|
| TopNav | `AdminTopNav` | ✅ reuse | `shared/AdminTopNav.tsx` | `activeTab: 'staff'` |
| TopNav | `AuthGuard` | ✅ reuse | `guards/AuthGuard.tsx` | — |
| TopNav | `RoleGuard` | ✅ reuse | `guards/RoleGuard.tsx` | `allowedRoles: ['admin', 'manager']` |
| A | `StaffPageHeader` | new (local) | `app/admin/staff/components/StaffPageHeader.tsx` | `totalCount: number · onAdd: () => void` |
| B | `StaffStatsBar` | new (local) | `app/admin/staff/components/StaffStatsBar.tsx` | `staffList: Staff[]` |
| B | `KPICard` | ✅ reuse | `shared/KPICard.tsx` | Used for Tổng NV, Đang HĐ, Vô hiệu cards |
| C | `StaffFilterBar` | new (local) | `app/admin/staff/components/StaffFilterBar.tsx` | `search · onSearch · role · onRole · status · onStatus` |
| C | `Input` | ✅ reuse | `ui/input.tsx` | Search input inside filter bar |
| D | `StaffTable` | new (local) | `app/admin/staff/components/StaffTable.tsx` | `staff: Staff[] · onDetail · onEdit · onDelete · currentUserRole` |
| D | `Badge` | ✅ reuse | `ui/badge.tsx` | Role badges + status badges in rows |
| D | `ProgressBar` | ✅ reuse | `ui/progress-bar.tsx` | `value={performanceScore}` per row |
| D | `Button` | ✅ reuse | `ui/button.tsx` | Chi tiết / Sửa / Xóa action buttons |
| D | `EmptyState` | ✅ reuse | `shared/EmptyState.tsx` | `message="Không có nhân viên nào"` |
| E | `Pagination` | new (shared) | `shared/Pagination.tsx` | `currentPage · totalPages · onPageChange` |
| M1 | `AddEditStaffModal` | new (local) | `app/admin/staff/components/AddEditStaffModal.tsx` | `open · mode · staff? · onClose` |
| M2 | `StaffDetailDrawer` | new (local) | `app/admin/staff/components/StaffDetailDrawer.tsx` | `open · staffId · onClose · onEdit` |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
type StaffRole = 'chef' | 'cashier' | 'staff' | 'manager'
type StaffStatus = 'active' | 'inactive'
type ShiftSlot = 'sang' | 'chieu' | 'toi'

interface Staff {
  id: string                    // UUID
  username: string
  full_name: string
  role: StaffRole
  job_title?: string            // e.g. "Bếp trưởng"
  shifts: ShiftSlot[]           // new field
  responsibilities?: string     // new field, max 500 chars
  phone?: string
  email?: string
  status: StaffStatus
  performance_score: number     // 0–100, read-only, derived
  created_at: string            // ISO date
}

interface StaffFormData {
  username: string              // min 3, a-z0-9_-
  password: string              // add mode only; min 8, 1 upper, 1 digit
  full_name: string             // min 2
  role: StaffRole
  job_title?: string
  shifts: ShiftSlot[]           // multi-select
  responsibilities?: string
  phone?: string
  email?: string                // optional email format
}

interface StaffStats {
  total: number
  active: number
  inactive: number
  byRole: Record<StaffRole, number>
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}
```

### Query Configuration

```typescript
// Staff list — shared across all zones on page
useQuery({
  queryKey: ['admin', 'staff'],
  queryFn: () => fetchAdminStaff(),
  staleTime: 0,              // refetch on every window focus
  refetchOnWindowFocus: true,
})

// Staff detail — enabled only when drawer opens
useQuery({
  queryKey: ['admin', 'staff', staffId],
  queryFn: () => fetchStaffDetail(staffId!),
  enabled: !!staffId,
  staleTime: 30_000,
})

// Add staff
useMutation({
  mutationFn: (data: StaffFormData) => postAdminStaff(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] }),
})

// Edit staff
useMutation({
  mutationFn: ({ id, data }: { id: string; data: Partial<StaffFormData> }) =>
    patchAdminStaff(id, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] }),
})

// Toggle status
useMutation({
  mutationFn: ({ id, status }: { id: string; status: StaffStatus }) =>
    patchAdminStaffStatus(id, status),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] }),
})

// Delete staff
useMutation({
  mutationFn: (id: string) => deleteAdminStaff(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] }),
})
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| Empty staff list | `staffList.length === 0` | Render `EmptyState` in Zone D | "Không có nhân viên nào. Thêm nhân viên đầu tiên." |
| No results after filter | Filtered list = 0, raw list > 0 | Render `EmptyState` with different message | "Không tìm thấy nhân viên phù hợp." + clear filter button |
| Network error on load | TanStack Query `isError` | Log error; show error banner | "Không tải được danh sách. Thử lại." with retry button |
| Duplicate username on create | API returns 409 | Show field-level error from RHF | Highlight Username field: "Username đã tồn tại" |
| Delete Manager role | `staff.role === 'manager'` | Hide Xóa button in `StaffTable` | Button not rendered (no disabled state needed) |
| Delete self (current user) | `staff.id === authStore.user.id` | Hide or disable Xóa button | "Không thể xóa tài khoản đang đăng nhập" |
| Status toggle on inactive staff | Click status badge | Confirm dialog before PATCH | "Kích hoạt lại nhân viên này?" |
| Offline submit | navigator.onLine = false | Catch network error in mutation | Toast: "Mất kết nối. Vui lòng thử lại." |
| Detail tab (Hiệu suất/Lịch) empty | `performance_score === undefined` | Show faded placeholder | "Chưa có dữ liệu hiệu suất" |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Zone A: title shows correct staff count matching table rows
- [ ] Zone B: Tổng NV = active + inactive; Đang HĐ = active count; Vô hiệu = inactive count
- [ ] Zone B: Theo vai trò breakdown sums to Tổng NV
- [ ] Zone C: search by partial name filters Zone D rows in real time
- [ ] Zone C: search by partial username filters Zone D rows
- [ ] Zone C: Vai trò dropdown filters to selected role only
- [ ] Zone C: Trạng thái dropdown shows active/inactive rows only
- [ ] Zone C: combined filters work together (AND logic)
- [ ] Zone D: role badge color matches role (Bếp=red, Thu ngân=blue, NV=green, QL=purple)
- [ ] Zone D: progress bar width matches performance_score value
- [ ] Zone D: "Xóa" button absent for rows where role = 'manager'
- [ ] Zone D: "Chi tiết" opens M2 with correct staff data
- [ ] Zone D: "Sửa" opens M1 pre-filled with correct staff data
- [ ] Zone D: "Xóa" shows confirmation before delete
- [ ] Zone E: pagination updates Zone D to correct page
- [ ] M1 (add): all 9 fields validate correctly per Zod schema
- [ ] M1 (add): successful POST closes modal and refreshes list
- [ ] M1 (edit): form pre-filled from selected staff; password field hidden
- [ ] M1: shift chips toggle correctly (multi-select, min 1 required)
- [ ] M2: all 4 tabs render without error
- [ ] M2: "Sửa thông tin" button closes M2 and opens M1 with same staff

### Edge Case Tests
- [ ] Empty list: EmptyState shown in Zone D
- [ ] Filter yields 0 results: EmptyState with different message shown
- [ ] Delete last staff: list shows EmptyState after deletion
- [ ] Duplicate username: field error shown, modal stays open
- [ ] Network error on load: error state shown with retry

### Accessibility Tests
- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] Keyboard navigation works (Tab, Enter, Esc to close modal)
- [ ] Focus visible on all interactive elements
- [ ] Role badges have `aria-label` describing the role in full

### Cross-Device Tests
- [ ] Desktop viewport (1280px+) — primary target
- [ ] Tablet viewport (1024px) — table columns readable
- [ ] Mobile (375px) — table scrolls horizontally; modals full-screen

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| Staff-1 | FE | Scaffold page + AdminTopNav + Zone A header | ⬜ | wireframes/admin_main/admin_main_staff/admin_main_staff_wireframe_v1.md |
| Staff-2 | FE | Zone B StatsBar (KPICard × 3 + role breakdown) | ⬜ | — |
| Staff-3 | FE | Zone C FilterBar (search + dropdowns, client filter) | ⬜ | — |
| Staff-4 | FE | Zone D StaffTable (all columns, perf bar, badges, actions) | ⬜ | — |
| Staff-5 | FE | Zone E Pagination (shared component) | ⬜ | — |
| Staff-6 | FE | Modal M1 AddEditStaffModal (RHF + Zod, 9 fields) | ⬜ | — |
| Staff-7 | FE | Modal M2 StaffDetailDrawer (4 tabs) | ⬜ | — |

---

## 📝 Changelog

**v1 (2026-05-26)**
- Initial scaffold based on `admin-main-staff.excalidraw`
- Zones documented: A (PageHeader), B (StatsBar), C (FilterBar), D (StaffTable), E (Pagination)
- Modals documented: M1 (Thêm/Sửa — 9 fields), M2 (Chi tiết — 4 tabs)
- New shared component identified: `Pagination`

---

*Last Updated: 2026-05-26*
*Approved by: —*
*Next Review: After zone content reviewed with owner*
