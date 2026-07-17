## Technical Architecture — Admin — Nhân viên (`/admin/staff`)

### Page Structure
- Zones: A (PageHeader), B (StatsBar), C (FilterBar), D (StaffTable), E (Pagination)
- Modals: M1 (AddEditStaffModal), M2 (StaffDetailDrawer)
- Device target: Desktop (1100px layout, `max-w-[1100px] mx-auto`)
- Sticky zones: TopNav only (sticky top-0 z-50)
- All data in B, C, D, E derives from a single `['admin', 'staff']` query — no extra API calls

### RBAC & Auth Rules

| Rule | Value |
|------|-------|
| **Route protection** | `AuthGuard` + `RoleGuard(['admin', 'manager'])` |
| **Allowed roles** | Admin · Manager |
| **Auth state used** | `useAuthStore.user.role` · `useAuthStore.user.id` |
| **Conditional UI by role** | Xóa button hidden for `role === 'manager'` rows; also hidden when `staff.id === currentUser.id` |
| **Unauthorized redirect** | → `/admin/login` (AuthGuard) or 403 page (RoleGuard) |

### Tech Stack

```
React (Next.js 14 App Router)
├── State: Zustand (useAuthStore) + local useState for filters/modals
├── Data: TanStack Query (['admin', 'staff'] · ['admin', 'staff', id])
├── Forms: React Hook Form + Zod (AddEditStaffModal)
├── Styling: Tailwind CSS (desktop grid layout, badge variants, progress bar)
└── Types: Staff · StaffFormData · StaffStats · PaginationProps
```

### Key Implementation Patterns

**1. Component Architecture**
- `page.tsx` (RSC) — prefetch `['admin', 'staff']`, render HydrationBoundary
- `StaffPageClient.tsx` (`'use client'`) — owns all state, filter logic, modal open/close
- All child components receive data and callbacks as props — no internal queries

**2. State Management**

```typescript
// All local — no new Zustand store needed
const [search, setSearch] = useState('')
const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all')
const [statusFilter, setStatusFilter] = useState<StaffStatus | 'all'>('all')
const [page, setPage] = useState(1)
const [modalOpen, setModalOpen] = useState(false)
const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
const [detailStaffId, setDetailStaffId] = useState<string | null>(null)

const PAGE_SIZE = 10

// Derived filter — run client-side
const filteredStaff = useMemo(() =>
  staffList
    .filter(s => search === '' || s.full_name.includes(search) || s.username.includes(search))
    .filter(s => roleFilter === 'all' || s.role === roleFilter)
    .filter(s => statusFilter === 'all' || s.status === statusFilter),
  [staffList, search, roleFilter, statusFilter]
)

const paginatedStaff = filteredStaff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
const totalPages = Math.ceil(filteredStaff.length / PAGE_SIZE)
```

**3. Data Fetching Strategy**
- Single query `['admin', 'staff']` feeds ALL zones (title count, stats, table, pagination)
- `refetchOnWindowFocus: true` — data refreshes whenever admin tabs back to this window
- Detail query `['admin', 'staff', staffId]` enabled only when M2 opens
- All mutations invalidate `['admin', 'staff']` on success — stats and table update together

**4. Performance**
- Client-side filter runs in `useMemo` — no re-fetch on every keystroke
- Search debounced 300ms before `setSearch` to avoid excessive memo recalculation
- Page resets to 1 when any filter changes

**5. Edge Cases**
- Empty state: `StaffTable` renders `EmptyState` when `paginatedStaff.length === 0`
- Delete guard: hide Xóa button for `role === 'manager'` and `id === currentUser.id`
- Confirm before delete: `window.confirm` or a small confirmation popover (avoid full modal)

### Rendering Strategy

| Layer | What | Why |
|---|---|---|
| **ISR** (`revalidate: 30`) | `['admin', 'staff']` prefetched in `page.tsx` | Admin table data; short revalidate because staff changes are infrequent but still possible |
| **RSC** | `page.tsx` — prefetch + HydrationBoundary | No per-user server data needed; same staff list for all admins |
| **Client** (`'use client'`) | Zones A–E, M1, M2 (`StaffPageClient.tsx`) | Zustand auth · filter state · modal open/close · form interactions |

> Gap: Stats bar counts depend on the **full** list (not the current page). If the API paginates server-side in future, stats will need a separate summary endpoint. Currently safe because all staff are fetched in a single call.

Register this page in `docs/fe/wireframes/shared/_INDEX_RENDERING_STRATEGY.md` after implementing.

### File Organization

```
src/
├── app/
│   └── admin/
│       └── staff/
│           ├── page.tsx                    # RSC — prefetch + HydrationBoundary
│           └── components/
│               ├── StaffPageClient.tsx     # 'use client' — owns all state
│               ├── StaffPageHeader.tsx     # Zone A
│               ├── StaffStatsBar.tsx       # Zone B — wraps KPICard × 3 + role breakdown
│               ├── StaffFilterBar.tsx      # Zone C
│               ├── StaffTable.tsx          # Zone D — table rows + action buttons
│               ├── AddEditStaffModal.tsx   # M1 — RHF + Zod
│               └── StaffDetailDrawer.tsx   # M2 — 4-tab read-only
├── hooks/
│   └── useStaffQueries.ts                  # all query + mutation hooks for staff
├── store/
│   └── auth.ts                             # useAuthStore (existing)
└── components/
    └── shared/
        └── Pagination.tsx                  # new shared — register in index
```

### State Contract

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useAuthStore` | `user.role` · `user.id` | — | Persistent across admin session | Any admin page |

### Critical Implementation Notes
- `performance_score` is read-only — derived server-side from order history; never include in StaffFormData
- Password field only appears in add mode (M1); hide completely in edit mode
- `shifts[]` is stored as an array: `['sang', 'chieu']` — render as chip group, min 1 selected enforced by Zod
- The Xóa button for Quản lý rows must be hidden (not disabled) to avoid confusion about why it can't be clicked
- Stats counts in Zone B derive from the **full unfiltered list** — recalculate from raw `staffList`, not `filteredStaff`
