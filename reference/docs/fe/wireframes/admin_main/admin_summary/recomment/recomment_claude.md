# Claude Guidelines — Admin — Tổng Kết Ngày

> Read this before implementing `/admin/summary`.

---

## Spec Summary

- Desktop-only daily operations dashboard controlled by a single date picker (today default; future disabled)
- 8 zones: Revenue KPIs · Hourly chart + Payment pie · Order channels · Menu top/slow · Kitchen KPIs · Staff table · Inventory alerts · Shift log
- Pattern B (Full Client) — date is interactive local state; no ISR possible
- 1 modal: AddShiftNoteModal — append-only, hidden for past dates
- Allowed roles: Admin · Manager

Key constraint: **`DailySummary` is one aggregate response** — all zones 1–7 share a single TanStack Query key `['admin', 'summary', date]`. Do not split into per-zone API calls.

---

## Shared Components — Reuse Checklist

> Components classified `new (shared)` in the Component Specifications table.
> Register in `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md` before implementation starts.

| Component | Tier | File | Register in Index? |
|-----------|------|------|--------------------|
| `AdminSingleDatePicker` | Tier 2 — shared | `shared/AdminSingleDatePicker.tsx` | ✅ Yes — add to Tier 2 table |

All other new components are `new (local)` under `app/admin/summary/components/`.

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|----------------|-----|
| `selectedDate` | `useState` (local, page component) | Date changes affect only this page — no cross-page state needed |
| Summary data (Zones 1–7) | TanStack Query `['admin', 'summary', date]` | Server cache shared across date values; staleTime differs for today vs. past |
| Shift log (Zone 8) | TanStack Query `['admin', 'shift-log', date]` | Separate key — mutations (add note) invalidate only this, not the full summary |
| Auth / role | `useAuthStore` (Zustand) | Global — role check for `RoleGuard` |
| Add note form | RHF + Zod (local to `AddShiftNoteModal`) | Form state never needs to escape the modal |

---

## Implementation Order (recommended)

Follow this order to avoid blocked work:

1. **SUM-2** — `AdminSummaryPageClient` shell + date picker + zone layout (all zones render as loading skeletons)
2. **SUM-10 / SUM-11** — BE endpoints (can run in parallel with SUM-3 onwards)
3. **SUM-3** — Zone 1 + 5 KPI cards (reuse `KPICard`)
4. **SUM-5** — Zone 3 Order Channel Cards (simple, no chart library needed)
5. **SUM-7** — Zone 6 Staff Performance Table (simple read-only table)
6. **SUM-8** — Zone 7 Inventory Alert List (Badge + text)
7. **SUM-9** — Zone 8 Shift Log + AddShiftNoteModal
8. **SUM-4** — Zone 2 Charts (last — requires chart library install; most complex)
9. **SUM-6** — Zone 4 Menu Performance panels

---

## Performance Checklist

- [ ] Code split: automatic via App Router page boundary
- [ ] Images: none on this page — no `next/image` needed
- [ ] Charts: use `dynamic(() => import('./HourlyRevenueChart'), { ssr: false })` to avoid SSR issues with Recharts
- [ ] Skeleton: `<AdminSummarySkeleton />` must be defined before SUM-2 ships — Pattern B requires it
- [ ] `staleTime` must differ for today vs. past dates — use the `isToday` check in `useAdminSummary`
- [ ] `prefers-reduced-motion`: pass `isAnimationActive={false}` to Recharts when motion is reduced

---

## Cross-Page Notes

- **State shared with other pages:** `useAuthStore` only (role read)
- **Navigation from this page:** None — this is a terminal report page, no outbound nav from zone actions
- **Navigation to this page:** Admin sidebar or top nav "Tổng Kết Ngày" link; also accessible via direct URL `/admin/summary`

---

## Non-Obvious Implementation Notes

- **`StaffPerformanceTable` is NOT `StaffTable`** — do not reuse or extend the staff management table from `/admin/staff`. This table is read-only, has different columns, and has no edit/delete actions. Build a new, simple `<table>` component.
- **Chart SSR issue** — Recharts uses browser APIs (`window`, `ResizeObserver`). Wrap chart components with `dynamic(..., { ssr: false })` or they will crash during Next.js server rendering.
- **`AddShiftNoteModal` hidden for past dates** — the condition `selectedDate < today` must disable the button at the component level, not just visually hide it. The mutation hook should also reject calls with a past date as an extra guard.
- **Peak bars** — `isPeak: boolean` comes from the backend. The FE chart must read this flag directly from `HourlyRevenue.isPeak` rather than recomputing top-2 on the client. If the API doesn't include this flag, fall back to client-side sort and flag top 2.
- **Zone 7 soft failure** — If `inventoryAlerts` is missing from the summary response (e.g., storage service is down), Zone 7 should show a soft error ("Không thể tải dữ liệu nguyên liệu") without blocking the rest of the page. Use optional chaining `summary?.inventoryAlerts ?? []` and handle the empty array with EmptyState.
- **Shift log order** — Log entries should render oldest-first, newest-last (chronological). The BE should return them sorted by `createdAt` asc. Do not reverse client-side unless the API returns them desc.

---
*Created: 2026-05-27*
