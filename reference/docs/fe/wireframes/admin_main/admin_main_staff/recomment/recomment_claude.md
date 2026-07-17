# Claude Guidelines — Admin — Nhân viên (`/admin/staff`)

> Read this before implementing this page.

---

## Spec Summary

- Desktop admin page for CRUD management of all staff accounts
- Route: `/admin/staff` — guarded by `AuthGuard` + `RoleGuard(['admin', 'manager'])`
- 5 zones (A–E) + 2 modals (M1 Add/Edit, M2 Detail tabbed)
- Single query `['admin', 'staff']` feeds all zones — no additional API calls for stats
- Client-side filter (search + role + status) over fetched list; paginated locally
- 3 new DB fields vs. existing staff schema: `job_title`, `shifts[]`, `responsibilities`

Key constraint: **Stats Bar (Zone B) must derive counts from the raw `staffList`, not the filtered or paginated list.** Always pass unfiltered data to `StaffStatsBar`.

---

## Shared Components — Reuse Checklist

> These `new (shared)` components must be registered in `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md` before implementation starts.

| Component | Tier | File | Register in Index? |
|-----------|------|------|--------------------|
| `Pagination` | Tier 2 shared | `components/shared/Pagination.tsx` | ✅ Yes — add to Tier 2 table |

> All other new components (`StaffStatsBar`, `StaffFilterBar`, `StaffTable`, `AddEditStaffModal`, `StaffDetailDrawer`, `StaffPageHeader`) are **new (local)** — do NOT add them to the shared index.

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|----------------|-----|
| Staff list | TanStack Query `['admin', 'staff']` | Server data; invalidated on every mutation |
| Staff detail | TanStack Query `['admin', 'staff', staffId]` | On-demand; enabled only when M2 opens |
| Auth / role | `useAuthStore` (Zustand) | Cross-page; determines Xóa button visibility |
| Search, role filter, status filter | `useState` (local) | Page-local; no cross-page sharing needed |
| Pagination page | `useState` (local) | Resets to 1 on filter change |
| Modal open + mode | `useState` (local) | `'add' | 'edit'` |
| Selected staff (edit) | `useState` (local) | `Staff | null` |
| Detail staff ID | `useState` (local) | `string | null` — drives M2 query `enabled` |
| Add/Edit form | RHF + Zod | Local to `AddEditStaffModal` — never lift to Zustand |

---

## Performance Checklist

- [ ] Code split: App Router automatic per page
- [ ] Images: no staff images in v1 — initials-only avatar (no `next/image` needed)
- [ ] Lists > 20: client-side pagination in Zone E (PAGE_SIZE=10)
- [ ] API calls: single `useQuery(['admin', 'staff'])` — no `useEffect+fetch` combos
- [ ] Filter: wrap in `useMemo` with `[staffList, search, roleFilter, statusFilter]` deps
- [ ] Search debounce: 300ms before updating `search` state to limit memo recalculation
- [ ] Animations: `prefers-reduced-motion` — skip progress bar fill animation in Zone D

---

## Cross-Page Notes

- State shared with other pages: `useAuthStore` (auth across all admin pages)
- Navigation from this page: M2 "Sửa thông tin" → opens M1 (same page); no cross-page nav
- Navigation to this page: from `AdminTopNav` "Nhân viên" tab (any admin page)
- Query key `['admin', 'staff']` is not shared with any other page — safe to invalidate freely

---

## Non-Obvious Implementation Notes

1. **Stats Bar derives from raw list, not filtered list** — always pass `staffList` (not `filteredStaff`) to `StaffStatsBar`. Filtering happens independently in the table zone only.

2. **`performance_score` is read-only** — never include it in `StaffFormData`. It will be `undefined` for new staff. In `StaffTable`, handle `score === undefined` by rendering an empty bar with "—" label.

3. **Password field edit mode** — `AddEditStaffModal` in `'edit'` mode must not render the password field at all (not just disable it). Sending an empty password to PATCH would overwrite the existing one in some BE implementations.

4. **Xóa button visibility rules** — two independent conditions where Xóa must be hidden:
   - `staff.role === 'manager'` — managers cannot be deleted via this UI
   - `staff.id === useAuthStore.getState().user?.id` — cannot self-delete
   Use a computed `canDelete(staff)` helper to centralise this logic.

5. **Shift chips in M1** — `shifts[]` is a multi-select with minimum 1. Zod schema: `z.array(z.enum(['sang', 'chieu', 'toi'])).min(1, "Chọn ít nhất 1 ca")`. Render as toggle chips (selected = orange, unselected = gray).

6. **M2 StaffDetailDrawer tab state** — use a local `useState<'info'|'performance'|'schedule'|'responsibilities'>('info')`. Do not use a router param — this is an overlay, not a page route.

7. **Invalidation after status toggle** — `PATCH /admin/staff/:id/status` mutation must invalidate `['admin', 'staff']` (list) AND `['admin', 'staff', id]` (detail). Both must be updated so Zone B counts and M2 status badge stay accurate.

8. **`Pagination` shared component** — build as `currentPage · totalPages · onPageChange` props. Do not couple it to any domain. Candidate for use in future admin pages (products, orders). Register in `_INDEX_SHARING_COMPONENT.md` first.

9. **ISR revalidate = 30** — set in `page.tsx` to match TanStack Query `staleTime: 0` behavior. The very short revalidate ensures the prefetched HTML stays roughly fresh for the rare case of immediate page load before client hydration.

---
*Created: 2026-05-26*
