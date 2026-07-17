# Claude Guidelines — Admin — Staff Task Board

> Read this before implementing `/admin/staff/task-board`.

---

## Spec Summary

- Desktop task management board for Admin + Manager roles
- 7 zones (A–G) + 1 modal (M1 — Create Task)
- Zone D: 4 KPI cards (Total / Completed / In Progress / Overdue)
- Zone E: staff table with per-person completion rate % and quality score ★/5.0; overdue rows highlighted orange
- Zone F: expandable task sub-table per staff row (lazy-fetched on expand)
- Modal M1: Create Task form with 5 fields; pre-fills Staff Member when opened via "Assign" button

Key constraint: **only one staff row can be expanded at a time**. Zone F is lazy-fetched — prefetch on row hover to reduce latency. Pattern B (Full Client) — no ISR, no RSC split.

---

## Shared Components — Reuse Checklist

> These are `new (shared)` components identified in the Reuse Audit. **Register in `_INDEX_SHARING_COMPONENT.md` before implementation starts** (already done in Session 1).

| Component | Tier | File | Register in Index? |
|-----------|------|------|--------------------|
| `TaskStatusBadge` | Tier 2 — Shared | `components/shared/TaskStatusBadge.tsx` | ✅ already registered |
| `TaskPriorityBadge` | Tier 2 — Shared | `components/shared/TaskPriorityBadge.tsx` | ✅ already registered |

**Build these two components first** — both `StaffTaskTable` (Zone E) and `ExpandedTaskList` (Zone F) depend on them. If you start with the table before the badges exist, you'll need to stub and then replace.

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|---------------|-----|
| `user.role` | `useAuthStore` (Zustand) | Shared across all admin pages — already set at login |
| Filter state (date, role, status, search) | `useState` in `page.tsx` | Page-local; no other page reads these values |
| `expandedStaffId` | `useState` in `page.tsx` | Drives Zone F visibility; must reset when filter date changes |
| `createModalOpen` + `defaultStaffId` | `useState` in `page.tsx` | Controls Modal M1; `defaultStaffId` differentiates "Assign" vs "+ Add Task" entry point |
| Task stats + staff rows | TanStack Query `['admin', 'tasks', 'stats', date]` | Server data, shared cache key per date |
| Per-staff task list | TanStack Query `['admin', 'tasks', staffId, date]` | Lazy — `enabled: !!staffId`; fetched only when a row is expanded |
| Staff dropdown in M1 | TanStack Query `['admin', 'staff']` | Reuses existing cache; 5 min staleTime is correct |
| Form data in M1 | RHF + Zod | Local to CreateTaskModal — never lift to Zustand |

**Do NOT create a `useTaskBoardStore`** — all state is page-local and does not escape this page. Zustand for page-local state is over-engineering.

---

## Performance Checklist

- [ ] Code split: App Router automatic per page route
- [ ] `StaffTaskBoardSkeleton` defined before page ships (Pattern B requirement — see `_INDEX_RENDERING_STRATEGY.md`)
- [ ] Zone F prefetch on hover: call `queryClient.prefetchQuery(['admin', 'tasks', staffId, date], ...)` in `onMouseEnter` on the "View Tasks" button
- [ ] `useMemo` for client-side filtered rows: `applyFilters(data?.staffStats ?? [], filters)` — filter runs on every render otherwise
- [ ] `refetchInterval: 60_000` — do not lower; 30s causes visible table re-renders while admin is reading
- [ ] TaskStatusBadge and TaskPriorityBadge — pure components, no hooks → React memoises automatically. No `React.memo()` wrapper needed
- [ ] Images: none on this page — N/A
- [ ] Lists > 20: if staff count exceeds 20, add `Pagination` (already in shared index) — do not add virtual scrolling speculatively

---

## Cross-Page Notes

- **State shared with other pages:** `useAuthStore` (read-only here) · `['admin', 'staff']` query key (shared with Admin — Staff page)
- **Navigation from this page:** → Admin — Staff (`/admin/staff`) via breadcrumb "Staff" link · → other admin sections via AdminTopNav
- **Navigation to this page:** → from AdminTopNav "Staff" tab or sidebar link · → potentially from Admin — Staff page "View Task Board" action
- **Cache invalidation note:** When `createTask` mutation succeeds, invalidate `['admin', 'tasks', 'stats', date]` (always) + `['admin', 'tasks', staffId, date]` (only if `expandedStaffId === variables.staffId`, to avoid re-fetching collapsed rows)

---

## Non-Obvious Implementation Notes

1. **Two-entry-point modal pattern.** `CreateTaskModal` takes `defaultStaffId?: string`. When `undefined`, the Staff Member dropdown starts empty (entry via "+ Add Task"). When a string, the dropdown pre-selects that staff (entry via row "Assign" button). The `useEffect` inside the modal must watch `defaultStaffId` and call `setValue('staffId', defaultStaffId)` when it changes. Reset on modal close (`onClose` → `reset()`).

2. **Expand toggle — only one at a time.** `handleToggleExpand(staffId)` must check if `expandedStaffId === staffId` — if yes, set to `null` (collapse). If no, set to `staffId` (expand, implicitly collapsing any previously open row). This is not a race condition — React `setState` is synchronous here.

3. **expandedStaffId should reset when filter date changes.** If a row is expanded for date A and the user changes the filter to date B, the expansion should close (the expanded staff's tasks for date B have not been fetched yet and would show stale Zone F data). Add `useEffect(() => setExpandedStaffId(null), [filters.date])`.

4. **Overdue flag is backend-computed.** Never compute overdue on the FE. The `hasOverdue: boolean` field on `StaffTaskStat` is the single source of truth. If you compute it from task due times on the FE, timezone drift and clock differences between client and server will cause inconsistency.

5. **Quality score null guard.** New staff have `qualityScore: null`. Render `<span className="text-slate-400 text-sm">★ —</span>` — NEVER `★ 0.0`. A zero would imply a poor rating, which is factually incorrect and unfair to the staff member.

6. **`['admin', 'staff']` cache in Modal M1.** If the admin navigates directly to `/admin/staff/task-board` without visiting `/admin/staff` first in the session, the `['admin', 'staff']` cache will be empty. The staff dropdown inside Modal M1 will show a loading spinner until the fetch completes. This is acceptable but worth noting in QA testing. Add a skeleton row to the dropdown during loading.

7. **Zone B breadcrumb is sticky at `top-[56px]`.** Zone A is `height: 56px` and sticky. Zone B must be `sticky top-[56px]` — if Zone A height ever changes, Zone B offset breaks. Document this coupling in a comment in Zone B's component file.

---

*Created: 2026-05-26*
