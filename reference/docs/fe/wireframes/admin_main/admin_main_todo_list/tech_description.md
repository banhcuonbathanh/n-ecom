## Technical Architecture — Admin — Staff Task List

### Page Structure

- Zones: A (header), B (filter bar), C (task table/card list), D (create/edit modal)
- Device target: responsive — desktop table + mobile card list
- Sticky zones: A (top-0 z-20), B (top-14 z-10)
- Modals: D — `CreateEditTaskModal` (manager/admin only)

---

### RBAC & Auth Rules

| Rule | Value |
|------|-------|
| **Route protection** | `AuthGuard` + `RoleGuard(['manager', 'admin', 'staff'])` |
| **Allowed roles** | Manager · Admin (full CRUD) · Staff (view own + toggle own) |
| **Auth state used** | `useAuthStore.user.id` · `useAuthStore.user.role` |
| **Conditional UI by role** | "+ Tạo công việc" button — hidden for Staff. Edit/Delete buttons — hidden for Staff on any row. For Staff: only own tasks returned by API. |
| **Unauthorized redirect** | Unauthenticated → `/login`. Wrong role (e.g. Guest) → `/403` |

---

### Tech Stack

```
React (Next.js App Router)
├── State: Zustand (useAuthStore) — auth/role gating
├── Data: TanStack Query
│   ├── ['admin', 'tasks', 'todo', staffId, startDate, endDate, status, page]
│   └── ['admin', 'staff'] — staff dropdown population (reuse)
├── Forms: RHF + Zod — CreateEditTaskModal
├── Styling: Tailwind CSS (responsive table → card breakpoint at md:)
└── Types: TypeScript strict — TodoTask · TodoTaskFilter · CreateTaskPayload
```

---

### Key Implementation Patterns

**1. Component Architecture**

Page root (`page.tsx`) is an RSC that wraps `TodoPageClient` in `AuthGuard` + `RoleGuard`. All interactive work is inside `TodoPageClient` (`'use client'`). Filter state, modal state, and pagination live in `useState` local to `TodoPageClient` — no Zustand store needed.

**2. State Management**

```typescript
// TodoPageClient.tsx — all local state
const [filters, setFilters] = useState<TodoTaskFilter>({
  staffId: undefined,
  startDate: undefined,
  endDate: undefined,
  status: 'all',
  page: 1,
})
const [modalOpen, setModalOpen] = useState(false)
const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
const [selectedTask, setSelectedTask] = useState<TodoTask | null>(null)
```

**3. Data Fetching Strategy**

- Main task list: `['admin', 'tasks', 'todo', ...filterParams]` — `staleTime: 30s`. Use `keepPreviousData` on page change to avoid flash between pages.
- Staff dropdown: `['admin', 'staff']` — `staleTime: 60s`. Shared with Admin — Staff page.
- Task toggle: `useMutation` with optimistic update. On checkbox click, update the cached task status before server responds. Roll back on error.
- On create/edit/delete success: `queryClient.invalidateQueries({ queryKey: ['admin', 'tasks', 'todo'] })` to refetch current filter.

**4. Performance**

- `keepPreviousData: true` on pagination to prevent blank flash between pages.
- Staff dropdown loaded once on mount; no re-fetch unless staff list is mutated.
- Optimistic checkbox toggle: zero perceived latency for the most frequent interaction.
- Mobile card list: no virtualization needed below 50 items; add if pageSize grows beyond 30.

**5. Responsive Strategy**

```typescript
// TodoPageClient.tsx
const isMobile = useMediaQuery('(max-width: 767px)')
return isMobile ? <TodoTaskCard ... /> : <TodoTaskTable ... />
```

Or use Tailwind: `<TodoTaskTable className="hidden md:block" />` + `<TodoTaskCard className="block md:hidden" />`.

**6. Edge Case Handling**

- Overdue detection: server sets `status = 'overdue'` when `dueDate < now && status = 'pending'`. FE reads and shows `TaskStatusBadge` accordingly — no client-side date arithmetic.
- Deleted staff: `assignedStaffName` stored on task at creation time. If staff is deleted, the name still displays.

---

### Rendering Strategy

| Layer | What | Why |
|---|---|---|
| **Pattern B — Full Client** | `page.tsx` is a thin RSC shell; all data loaded client-side | Task data is user-specific (staff see only own tasks) + real-time checkbox interactions make ISR inappropriate |
| **Skeleton** | `TodoPageSkeleton` — 5 placeholder card rows | Required for Pattern B; shown during initial query load |
| **Client (`'use client'`)** | Zones A · B · C · D | All zones need Zustand auth + dynamic filter interaction |

> Gap: Staff dropdown could be prefetched server-side with ISR (it changes rarely), reducing the dropdown load wait. Add `prefetchQuery(['admin', 'staff'])` in `page.tsx` as a Pattern A partial optimization.

Register this page in `docs/fe/wireframes/shared/_INDEX_RENDERING_STRATEGY.md` after implementing.

---

### File Organization

```
src/
├── app/admin/todo-list/
│   ├── page.tsx                          # RSC shell — AuthGuard + RoleGuard + TodoPageClient
│   └── components/
│       ├── TodoPageClient.tsx            # 'use client' — owns all state + query hooks
│       ├── TodoPageHeader.tsx            # Zone A — title + "+ Tạo" CTA
│       ├── TodoFilterBar.tsx             # Zone B — staff/date/status filters
│       ├── TodoTaskTable.tsx             # Zone C — desktop table
│       ├── TodoTaskCard.tsx              # Zone C — mobile card
│       ├── CreateEditTaskModal.tsx       # Zone D — RHF + Zod form
│       └── TodoPageSkeleton.tsx          # Loading skeleton (Pattern B required)
├── hooks/
│   └── useTodoTasks.ts                   # TanStack Query wrapper for task list
└── store/
    └── auth.ts                           # useAuthStore (existing, no changes)
```

---

### State Contract

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useAuthStore` | `user.id` · `user.role` | — | Persists across all admin pages | — |
| Local `filters` | — | Updated on filter bar change | Cleared on page unmount | — |
| Local `selectedTask` | — | Set on row "Edit" click | Cleared on modal close | — |

---

### Critical Implementation Notes

- `staffId` filter: when `undefined`, the API returns all staff tasks (manager view). When set to the logged-in user's ID, returns their own tasks (staff view). The API enforces this — do not rely on client-side filtering alone.
- Date range max: 90 days. Validate in `TodoFilterBar` before updating query params.
- Optimistic toggle: use `queryClient.setQueryData` to flip task status locally, then confirm on server response. `onError` must rollback using the snapshot captured in `onMutate`.
- `CreateEditTaskModal` form schema: `dueTime` must be validated as "HH:MM" 24h format via Zod `.regex(/^([01]\d|2[0-3]):[0-5]\d$/)`.
- Do not create a new Zustand store for this page — all filter and modal state is local.
