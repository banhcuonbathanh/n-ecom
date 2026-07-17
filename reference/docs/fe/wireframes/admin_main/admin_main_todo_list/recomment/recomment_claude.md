# Claude Guidelines — Admin — Staff Task List

> Read this before implementing `/admin/todo-list`.

---

## Spec Summary

- Admin/Manager page for assigning and tracking staff tasks with checkbox-based completion
- Manager: full CRUD on tasks for any staff. Staff: view own tasks + mark complete
- Filter by staff member, date range (max 90 days), and status
- Responsive: desktop table + mobile card list
- Pattern B — Full Client (no ISR — data is user-specific + real-time toggles)

Key constraint: **Server enforces the staff visibility rule** — a staff user's API call must only return their own tasks regardless of client-side params. Never rely on client-side `staffId` filtering alone as the security layer.

---

## Shared Components — Reuse Checklist

> All components for this page are `✅ reuse` or `new (local)`. No `new (shared)` components — nothing needs registering in `_INDEX_SHARING_COMPONENT.md`.

| Component | Tier | File | Register in Index? |
|-----------|------|------|--------------------|
| `AdminTopNav` | Tier 2 shared | `components/shared/AdminTopNav.tsx` | Already registered |
| `DateRangePicker` | Tier 2 shared | `components/shared/DateRangePicker.tsx` | Already registered |
| `TaskStatusBadge` | Tier 2 shared | `components/shared/TaskStatusBadge.tsx` | Already registered |
| `EmptyState` | Tier 2 shared | `components/shared/EmptyState.tsx` | Already registered |
| `Pagination` | Tier 2 shared | `components/shared/Pagination.tsx` | Already registered |
| `AuthGuard` | Tier 4 guard | `components/guards/AuthGuard.tsx` | Already registered |
| `RoleGuard` | Tier 4 guard | `components/guards/RoleGuard.tsx` | Already registered |
| `Button` · `Input` · `Label` · `Badge` | Tier 1 atoms | `components/ui/` | Already registered |

---

## State Strategy

| Data type | Where it lives | Why |
|---|---|---|
| Auth / role | `useAuthStore` (Zustand) | Cross-page; already exists |
| Task list | TanStack Query `['admin', 'tasks', 'todo', ...]` | Server data; invalidated on mutations |
| Staff dropdown | TanStack Query `['admin', 'staff']` | Shared with Admin — Staff page; reuse cache |
| Filter values | `useState` (local in `TodoPageClient`) | Page-scoped; no cross-page sharing needed |
| Modal open / mode / selected task | `useState` (local) | Simple UI state; Zustand overkill here |
| Task form | RHF + Zod | Form-local; never lift into Zustand |

---

## Performance Checklist

- [ ] Code split: App Router automatic per page ✅
- [ ] Images: `next/image` only (no images on this page)
- [ ] Lists: `keepPreviousData: true` on pagination to prevent blank flash
- [ ] Checkbox toggle: optimistic update via `queryClient.setQueryData` — zero perceived latency
- [ ] Staff dropdown: fetched once, `staleTime: 60s`, reuses `['admin', 'staff']` cache
- [ ] Mobile card list: no virtualization needed at 15 items/page; add if pageSize grows > 30
- [ ] `TodoPageSkeleton`: required — show 5 skeleton rows on initial load (Pattern B)

---

## Cross-Page Notes

- **State shared with other pages:** `useAuthStore` (all admin pages), `['admin', 'staff']` cache (also used by Admin — Staff page)
- **Navigation from this page:** — (no outgoing nav defined)
- **Navigation to this page:** Admin sidebar or `AdminTopNav` — confirm active tab key matches this route

---

## Non-Obvious Implementation Notes

1. **Overdue status source of truth** — `status: 'overdue'` is set by the server on read, not stored as a permanent DB field. This means TanStack Query's 30s staleTime can cause a task to appear "pending" even after its due time passes. To fix: set `refetchOnWindowFocus: true` or a short `refetchInterval` (e.g. 60s) for this query specifically.

2. **Optimistic toggle rollback** — The standard pattern:
   ```typescript
   onMutate: async (variables) => {
     await queryClient.cancelQueries({ queryKey: ['admin', 'tasks', 'todo'] })
     const snapshot = queryClient.getQueryData(['admin', 'tasks', 'todo', ...])
     queryClient.setQueryData(['admin', 'tasks', 'todo', ...], (old) => ({
       ...old,
       tasks: old.tasks.map(t => t.id === variables.id
         ? { ...t, status: variables.newStatus }
         : t
       ),
     }))
     return { snapshot }
   },
   onError: (_err, _vars, context) => {
     queryClient.setQueryData(['admin', 'tasks', 'todo', ...], context.snapshot)
   }
   ```

3. **Query key with filter params** — The full query key includes all filter params: `['admin', 'tasks', 'todo', staffId, startDate, endDate, status, page]`. When invalidating after a mutation, use `queryClient.invalidateQueries({ queryKey: ['admin', 'tasks', 'todo'] })` (partial match) to clear all paginated/filtered variants at once.

4. **Staff role UX** — When `user.role === 'staff'`, hide the staff dropdown in Zone B (no point filtering — they can only see their own tasks). The API enforces this server-side, but hiding the dropdown removes confusion.

5. **Overlap with Staff Task Board** — Check `conccern.md` before starting BE work. The task board uses `['admin', 'tasks', staffId, date]` (single-date). This page uses `['admin', 'tasks', 'todo', ...]` with a date range. Confirm whether one API endpoint can serve both or if separate endpoints are needed.

6. **Date range validation** — Validate in `TodoFilterBar` before the query fires: `endDate - startDate <= 90 days`. Use `isBefore(addDays(startDate, 90), endDate)` from `date-fns`. Show an inline error below the date inputs — do not submit the filter.

---
*Created: 2026-05-27*
