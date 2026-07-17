---
page: admin_main_todo_list
route: /admin/todo-list
created: 2026-05-27
status: Draft
---

# Page: Admin — Staff Task List
**Route:** `/admin/todo-list`
**Version:** v1
**Status:** Draft

## Spec Summary

- Admin/Manager page for creating and tracking tasks assigned to individual staff members
- **Manager role:** create, edit, delete tasks; assign to any staff member; mark any task complete/incomplete
- **Staff role:** view only their own assigned tasks; mark own tasks complete/incomplete
- Each task row/card shows: title, assigned staff name, checkbox status, due date/time, created date, inline actions
- Filter bar: staff member dropdown, date range picker, status filter (all / pending / completed / overdue)
- Responsive: desktop shows sortable table; mobile shows stacked task cards
- Overdue tasks (past due date, status still pending) are flagged with a red badge/row tint

---

## 📐 Visual Wireframe

### Desktop (1280px+)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Zone A — Tiêu đề trang                         ← sticky top-0 z-20 │
│  [≡ AdminTopNav]    Admin — Danh sách Công Việc  [+ Tạo công việc]   │
│                                              (Manager/Admin only ↑)  │
├──────────────────────────────────────────────────────────────────────┤
│  Zone B — Bộ lọc                              ← sticky top-14 z-10  │
│  [Chọn nhân viên ▼] [Từ ngày ──── Đến ngày] [Trạng thái ▼] [Lọc]   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Zone C — Danh sách công việc                 ← scrollable          │
│  ┌────┬──────────────────────┬──────────┬────────────┬────────┬────┐ │
│  │ ☐  │ Tiêu đề              │ Nhân viên│ Hạn c.thành│ Trạng  │ .. │ │
│  ├────┼──────────────────────┼──────────┼────────────┼────────┼────┤ │
│  │ ☐  │ Chuẩn bị nguyên liệu │ Nguyễn A │ 27/05 10:00│ 🟡 Chờ│ ✏🗑│ │
│  │ ☑  │ Dọn bàn số 5         │ Trần B   │ 27/05 09:30│ ✅ Xong│ ✏🗑│ │
│  │ ☐  │ Kiểm tra kho lạnh    │ Lê C     │ 26/05 08:00│ 🔴 Hạn│ ✏🗑│ │
│  │ ☐  │ Nhập hàng sáng       │ Phạm D   │ 27/05 07:00│ 🟡 Chờ│ ✏🗑│ │
│  └────┴──────────────────────┴──────────┴────────────┴────────┴────┘ │
│                                                                      │
│  [← Trang trước]  Trang 1 / 3  [Trang tiếp →]                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

Zone D — Modal Tạo / Sửa Công Việc (Manager/Admin only)   ← overlay z-50
┌──────────────────────────────────────────┐
│  Tạo công việc mới                   [✕] │
├──────────────────────────────────────────┤
│  Tiêu đề *                               │
│  [_____________________________________] │
│                                          │
│  Giao cho *                              │
│  [Chọn nhân viên              ▼]         │
│                                          │
│  Hạn hoàn thành *                        │
│  [DD/MM/YYYY]  [HH : MM]                 │
│                                          │
│  Ghi chú                                 │
│  [_____________________________________] │
│                                          │
│              [Hủy]   [Lưu công việc]     │
└──────────────────────────────────────────┘
```

### Mobile (375px)

```
┌──────────────────────────┐
│ Zone A ← sticky top-0 z-20│
│ [≡] Danh sách CV  [+ Thêm]│
├──────────────────────────┤
│ Zone B ← sticky top-14 z-10│
│ [Nhân viên ▼][Ngày][Status]│
├──────────────────────────┤
│ Zone C — cards           │
│ ┌────────────────────┐   │
│ │ ☐ Chuẩn bị nguyên │   │
│ │   liệu sáng        │   │
│ │ 👤 Nguyễn A  🟡 Chờ│   │
│ │ 🕙 27/05  10:00    │   │
│ └────────────────────┘   │
│ ┌────────────────────┐   │
│ │ ☑ Dọn bàn số 5    │   │
│ │ 👤 Trần B  ✅ Xong │   │
│ │ 🕙 27/05  09:30    │   │
│ └────────────────────┘   │
│ [← 1 2 3 →]              │
└──────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| A | `AdminTopNav` + `TodoPageHeader` | Always visible | sticky top-0 z-20 |
| B | `TodoFilterBar` | Always visible | sticky top-14 z-10 |
| C | `TodoTaskTable` (desktop) / `TodoTaskCard` (mobile) | Always visible; `EmptyState` when no results | normal scroll |
| D | `CreateEditTaskModal` | Open when Manager clicks "+ Tạo công việc" or row "✏️ Sửa" | overlay z-50, fixed centered |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| A | `useAuthStore.user.role` | Zustand | N/A | Shows "+ Tạo" button for Manager/Admin only |
| B | Local state (filter values) | `useState` | N/A | Drives Zone C query params |
| C | TanStack Query → `GET /api/v1/admin/tasks/list` | Invalidate on create/edit/delete/toggle | `['admin', 'tasks', 'todo', staffId, startDate, endDate, status]` | Paginated; 15 per page default |
| C (staff dropdown) | TanStack Query → `GET /api/v1/admin/staff` | Invalidate on staff mutation | `['admin', 'staff']` | Reuse existing key; dropdown label only |
| D (form) | RHF + Zod | Local form state | N/A | POST / PATCH → invalidate `['admin', 'tasks', 'todo', ...]` |

---

## 🧩 Component Specifications

> Before filling this table: read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md`.
> Mark each row with one of: `✅ reuse` · `new (local)` · `new (shared)`

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|-----------------|
| A | `AdminTopNav` | ✅ reuse | `components/shared/AdminTopNav.tsx` | `activeTab: AdminTab` |
| A | `TodoPageHeader` | new (local) | `app/admin/todo-list/components/TodoPageHeader.tsx` | `canCreate: boolean · onCreateClick: () => void` |
| B | `TodoFilterBar` | new (local) | `app/admin/todo-list/components/TodoFilterBar.tsx` | `filters: TodoTaskFilter · staffList: StaffOption[] · onChange: (f) => void` |
| B | `DateRangePicker` | ✅ reuse | `components/shared/DateRangePicker.tsx` | `value: DateRange · onChange: (range) => void` |
| B | `Button` | ✅ reuse | `components/ui/button.tsx` | `variant="default"` for filter submit |
| C | `TodoTaskTable` | new (local) | `app/admin/todo-list/components/TodoTaskTable.tsx` | `tasks: TodoTask[] · canEdit: boolean · onToggle · onEdit · onDelete` |
| C | `TodoTaskCard` | new (local) | `app/admin/todo-list/components/TodoTaskCard.tsx` | `task: TodoTask · canEdit: boolean · onToggle · onEdit · onDelete` |
| C | `TaskStatusBadge` | ✅ reuse | `components/shared/TaskStatusBadge.tsx` | `status: TaskStatus` |
| C | `EmptyState` | ✅ reuse | `components/shared/EmptyState.tsx` | `message="Không có công việc nào"` |
| C | `Pagination` | ✅ reuse | `components/shared/Pagination.tsx` | `currentPage · totalPages · onPageChange` |
| D | `CreateEditTaskModal` | new (local) | `app/admin/todo-list/components/CreateEditTaskModal.tsx` | `open: boolean · mode: 'create'\|'edit' · task?: TodoTask · staffList: StaffOption[] · onClose · onSuccess` |
| D | `Input` | ✅ reuse | `components/ui/input.tsx` | — |
| D | `Label` | ✅ reuse | `components/ui/label.tsx` | — |
| D | `Button` | ✅ reuse | `components/ui/button.tsx` | submit + cancel variants |
| — | `AuthGuard` | ✅ reuse | `components/guards/AuthGuard.tsx` | Wraps page root |
| — | `RoleGuard` | ✅ reuse | `components/guards/RoleGuard.tsx` | `allowedRoles={['manager', 'admin']}` for create/edit/delete |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
type TaskStatus = 'pending' | 'completed' | 'overdue'

interface TodoTask {
  id: string
  title: string
  description?: string
  assignedStaffId: string
  assignedStaffName: string
  status: TaskStatus
  dueDate: string       // "YYYY-MM-DD"
  dueTime: string       // "HH:MM"
  createdAt: string     // ISO 8601
  completedAt?: string  // ISO 8601, set when status → completed
  createdByName: string
}

interface TodoTaskFilter {
  staffId?: string       // empty = all staff
  startDate?: string     // "YYYY-MM-DD"
  endDate?: string       // "YYYY-MM-DD"
  status?: 'all' | TaskStatus
  page?: number
}

interface StaffOption {
  id: string
  name: string
}

interface CreateTaskPayload {
  title: string
  description?: string
  assignedStaffId: string
  dueDate: string
  dueTime: string
}

interface UpdateTaskPayload extends Partial<CreateTaskPayload> {
  status?: TaskStatus
}

interface TodoTaskListResponse {
  tasks: TodoTask[]
  total: number
  page: number
  pageSize: number
}
```

### Query Configuration

```typescript
// Main task list — parameterized by filter
const useTodoTasks = (filters: TodoTaskFilter) =>
  useQuery({
    queryKey: ['admin', 'tasks', 'todo', filters.staffId, filters.startDate, filters.endDate, filters.status, filters.page],
    queryFn: () => fetchTodoTasks(filters),
    staleTime: 30_000,
    placeholderData: keepPreviousData, // smooth pagination
  })

// Staff list for dropdown — reuse existing key
const useStaffList = () =>
  useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: fetchAdminStaff,
    staleTime: 60_000,
  })

// Toggle task completion — optimistic update
const useToggleTask = () =>
  useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      patchTask(id, { status }),
    onMutate: async ({ id, status }) => {
      // cancel outgoing refetches + snapshot previous value
      await queryClient.cancelQueries({ queryKey: ['admin', 'tasks', 'todo'] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tasks', 'todo'] })
    },
  })
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| No tasks match filter | `tasks.length === 0` | Render `EmptyState` | "Không có công việc nào cho bộ lọc này" |
| Task overdue (past dueDate + still pending) | `dueDate < today && status === 'pending'` | BE sets `status = 'overdue'` on read; FE badge `🔴 Quá hạn` | Red row tint + `TaskStatusBadge` variant="overdue" |
| Staff is deleted but task remains | `assignedStaff` not in staff list | Show name as-is (stored on task) with `[Đã xóa]` suffix | Do not crash; task still shows |
| Network error on toggle | mutation `onError` | Rollback optimistic update | Toast: "Không thể cập nhật — thử lại" |
| Manager tries to edit another manager's task | RBAC check on `createdBy` field | Server returns 403 | Toast error, no UI crash |
| Staff tries to edit a task not assigned to them | `useAuthStore.user.id !== task.assignedStaffId` | Hide edit/delete buttons client-side; server enforces | No buttons shown |
| Date range too wide (> 90 days) | Client-side validation in filter | Show inline error | "Khoảng thời gian tối đa 90 ngày" |
| Empty staff list (API error) | `staffList === undefined \| []` | Disable staff dropdown | Placeholder: "Tải nhân viên thất bại" |

---

## 🧪 Testing & QA Checklist

### Functional Tests

- [ ] **Zone A** — "+ Tạo công việc" button visible for Manager/Admin, hidden for Staff
- [ ] **Zone B** — Filter by staff dropdown → Zone C re-fetches with correct staffId param
- [ ] **Zone B** — Filter by date range → Zone C re-fetches with startDate/endDate
- [ ] **Zone B** — Filter by status → Zone C shows only matching tasks
- [ ] **Zone C** — Checkbox toggle marks task completed → `TaskStatusBadge` updates immediately (optimistic)
- [ ] **Zone C** — Overdue tasks show red badge + row tint
- [ ] **Zone C** — Pagination: next/prev page works; `keepPreviousData` prevents flash
- [ ] **Zone C** — Edit button opens Zone D modal pre-filled with task data (Manager only)
- [ ] **Zone C** — Delete button shows confirmation; on confirm task is removed
- [ ] **Zone D** — Submit create form → task appears in list; modal closes
- [ ] **Zone D** — Submit edit form → task row updates; modal closes
- [ ] **Zone D** — "Hủy" closes modal without saving
- [ ] **Zone D** — Required fields (title, assigned staff, due date) blocked on empty submit

### Edge Case Tests

- [ ] Empty filter result shows `EmptyState`, not blank
- [ ] Deleted staff name still shows in existing tasks
- [ ] Network error on toggle rolls back checkbox state
- [ ] Staff user cannot see edit/delete buttons for others' tasks
- [ ] Date range > 90 days shows validation error in filter bar

### Accessibility Tests

- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] Keyboard navigation works (Tab, Enter, Esc to close modal)
- [ ] Focus visible on all interactive elements
- [ ] Checkbox has `aria-label` with task title
- [ ] Modal has `role="dialog"` + `aria-labelledby`

### Cross-Device Tests

- [ ] Mobile (375px): table collapses to card list
- [ ] Tablet (768px): table shows with fewer columns
- [ ] Desktop (1280px+): full table with all columns

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| TDL-1 | FE | Wireframe + zone table | ✅ | wireframes/admin_main/admin_main_todo_list/admin_main_todo_list_wireframe_v1.md |
| TDL-2 | FE | Build `TodoPageHeader` component | ⬜ | Zone A |
| TDL-3 | FE | Build `TodoFilterBar` with `DateRangePicker` integration | ⬜ | Zone B |
| TDL-4 | FE | Build `TodoTaskTable` (desktop) + `TodoTaskCard` (mobile) | ⬜ | Zone C |
| TDL-5 | FE | Build `CreateEditTaskModal` with RHF + Zod | ⬜ | Zone D |
| TDL-6 | FE | Wire page.tsx: query hooks + Zustand auth + Pattern B skeleton | ⬜ | page |
| TDL-7 | BE | `GET /api/v1/admin/tasks/list` endpoint with filters + pagination | ⬜ | — |
| TDL-8 | BE | `PATCH /api/v1/admin/tasks/:id/status` for checkbox toggle | ⬜ | — |

---

## 📝 Changelog

**v1 (2026-05-27)**
- Initial scaffold (spec-first / Flow B) — zones A–D planned; visual wireframe drawn

---

*Last Updated: 2026-05-27*
*Approved by: —*
*Next Review: After excalidraw zones confirmed with owner*
