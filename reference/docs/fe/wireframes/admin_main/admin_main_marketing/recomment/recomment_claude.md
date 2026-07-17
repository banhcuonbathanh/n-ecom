# Claude Guidelines — Admin — Marketing

> Read this before implementing Admin — Marketing (`/admin/marketing`).

---

## Spec Summary

- `/admin/marketing` — budget tracking & campaign effectiveness dashboard for restaurant launch
- Zone B PageHeader: date range filter, export report, add spend entry
- Zone C BudgetSummary: 4 KPI cards (Tổng ngân sách · Đã chi · Còn lại · ROI)
- Zone D SpendBreakdown: spend table with progress bars + donut allocation chart
- Zone E LoveScore: 3 campaign effectiveness metrics
- Zone F CampaignTimeline: static 5-milestone launch roadmap

Key constraint: The `+ Nhập chi tiêu` modal is **not yet designed**. Do not implement it — wire the button to a `console.warn` or disabled toast until the modal spec exists.

---

## Shared Components — Reuse Checklist

> These components were classified `new (shared)` in the Component Specifications table and must be registered in `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md` before implementation starts (already done in this scaffold session).

| Component | Tier | File | Register in Index? |
|-----------|------|------|--------------------|
| `DateRangePicker` | Tier 2 shared | `components/shared/DateRangePicker.tsx` | ✅ Registered |
| `KPICard` | Tier 2 shared | `components/shared/KPICard.tsx` | ✅ Registered |
| `ProgressBar` | Tier 1 atom | `components/ui/progress-bar.tsx` | ✅ Registered |

Before building any of these: check that no equivalent already exists under a different name in the codebase (`grep -r "DateRange\|KPICard\|ProgressBar" src/components`).

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|---------------|-----|
| Date range filter | React `useState` (page-local) | Only this page uses it; no cross-page sharing needed |
| Auth / role | `useAuthStore` (Zustand) | Already global; read `role` to enforce `RoleGuard` |
| Spend data (budget, items, loveScore) | TanStack Query `useMarketingSpend` | Server data; cache for 5 min; revalidate on date change |
| Campaign milestones | Hardcoded constant in `CampaignTimeline.tsx` | Static plan data; not dynamic |

Do **not** put date range in Zustand — it would pollute global state for no benefit.

---

## Performance Checklist

- [ ] Code split: App Router automatic per page — no extra action needed
- [ ] `BudgetDonutChart` is a `'use client'` component — Recharts is browser-only; keep chart isolated to its own file
- [ ] The 5 spend rows are never > 20 items in this design — no virtualization needed
- [ ] All three Zones (C, D, E) share a **single** TanStack Query call — do not make 3 separate API calls
- [ ] Images: none on this page — no `next/image` needed
- [ ] Animations: use `transition-width` on progress bars with `prefers-reduced-motion` guard

---

## Cross-Page Notes

- State shared with other pages: `useAuthStore` (read-only on this page)
- Navigation **from** this page: AdminTopNav tabs (Tổng quan, Sản phẩm, etc.)
- Navigation **to** this page: AdminTopNav "Marketing" tab from any admin page
- Export action may call a separate endpoint — keep that in its own function, not inside the main query

---

## Non-Obvious Implementation Notes

1. **Single query, multiple zones** — `useMarketingSpend` returns `{ summary, items, loveScore }`. Pass slices to each zone component as props. Do not re-fetch per zone.

2. **Donut chart `'use client'` boundary** — The page itself can be a Server Component (RSC) but `BudgetDonutChart` must be client-side. Wrap it in its own file with `'use client'` at the top. Do not mark the whole page as client.

3. **Currency formatting is critical** — The API returns raw integers (e.g., `18500000`). Always pass through `formatVND()` before rendering. Never format inline with string templates.

4. **Progress bar color per row** — Each spend category in Zone D has a distinct progress bar color matching the donut chart segment. Use the `color` field from `MarketingSpendItem` to set `style={{ backgroundColor: item.color }}` on the progress fill. Do not hardcode colors per row.

5. **Campaign Timeline is not a data table** — It is a horizontal CSS flex layout with absolute-positioned dots on a line. Do not attempt to render it as a `<table>`. Use `flex` with relative positioning for the timeline track and dots.

6. **ROI card badge** — The badge text "Dựa trên 2.000 khách/tháng" is long. If it overflows the card at 1024px, add `truncate` and a `title` attribute for hover tooltip.

7. **Followers progress bar in Zone E** — The progress value is `(currentFollowers / targetFollowers) * 100`. This is a derived value — compute it on the FE from `loveScore.currentFollowers` and `loveScore.targetFollowers`. Do not expect the API to return `followerProgressPct` unless the BE contract explicitly includes it.

8. **RoleGuard wrapping** — Wrap the page in `RoleGuard allowedRoles={['admin', 'manager']}`. Staff (`cashier`, `kitchen`, `waiter`) should not access this page.

---
*Created: 2026-05-26*
