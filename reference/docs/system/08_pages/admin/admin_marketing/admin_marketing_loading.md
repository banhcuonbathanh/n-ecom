# Admin Marketing — Loading States

> **TL;DR:** ✅ implemented · documents how `/admin/marketing` behaves while data is in flight.
> Two layers: (1) a route-level spinner shared across the entire `(dashboard)/admin/` group during
> navigation, (2) per-zone inline `animate-pulse` skeletons inside the page driven by the **single
> shared `isLoading`** from `useMarketingSpend`. There is **no** `<Suspense>` boundary and **no**
> marketing-specific `loading.tsx`. Zone F (`CampaignTimeline`) renders immediately — it receives
> static compile-time data and is never gated by any query state.
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(dashboard)/admin/loading.tsx` ·
> `fe/src/app/(dashboard)/admin/marketing/page.tsx` ·
> `fe/src/hooks/useMarketingSpend.ts` ·
> `fe/src/components/marketing/*.tsx` ·
> `fe/src/components/shared/EmptyState.tsx`.
>
> Page overview → [admin_marketing.md](admin_marketing.md) · BE view → [admin_marketing_be.md](admin_marketing_be.md)

---

## Loading Layers (outer → inner)

```
1. Route navigation  → AdminLoading spinner (whole admin shell)
2. MarketingDashboardPage mounts → single useMarketingSpend query fires
3. Per-zone branches → each zone reads the shared isLoading; renders skeleton or real content
```

No `<Suspense>` exists anywhere in this page or route.  
No `loading.tsx` exists inside `fe/src/app/(dashboard)/admin/marketing/` (only `page.tsx`).

### 1 — Route-level spinner · `fe/src/app/(dashboard)/admin/loading.tsx:1-7`

Next.js App Router renders this for the **entire `(dashboard)/admin/` route group** during
server-side navigation into any admin page (including `/admin/marketing`).

- `h-64` centered flex container · `h-8 w-8` ring, `animate-spin`, `border-t-orange-500`.
- Not marketing-specific — shared by all `admin/` routes.
- Shown only during page transition; dismissed the moment `MarketingDashboardPage` mounts.

### 2 — Single query · `fe/src/hooks/useMarketingSpend.ts:5-16`

Once the page mounts, one TanStack Query is started:

| Property | Value | Source |
|---|---|---|
| `queryKey` | `['marketing', 'spend', dateRange]` | `useMarketingSpend.ts:7` |
| `queryFn` | `GET /admin/marketing/spend?from=&to=` | `useMarketingSpend.ts:9-13` |
| `staleTime` | `5 * 60 * 1000` (5 min) | `useMarketingSpend.ts:14` |
| `enabled` | `!!dateRange.from && !!dateRange.to` | `useMarketingSpend.ts:15` |

The page destructures `{ data, isLoading, isError, refetch }` from this single call
(`page.tsx:33`). **All five zones read the same `isLoading` boolean** — there is no per-zone
independent query.

### 3 — Per-zone inline skeletons · `page.tsx:56-97`

When `isLoading === true`, each data zone renders an `animate-pulse` placeholder instead of its
real component. Zone F is excluded — it is not gated at all (see below).

| Zone | Skeleton HTML | Lines |
|---|---|---|
| C — KPI cards | `grid grid-cols-2 lg:grid-cols-4` · 4 × `h-24 animate-pulse rounded-xl bg-muted` | `page.tsx:57-61` |
| D — Spend table | single `h-72 animate-pulse rounded-xl bg-muted` (full-width flex-1 column) | `page.tsx:69-71` |
| E — Love score | `grid gap-4 sm:grid-cols-3` · 3 × `h-28 animate-pulse rounded-xl bg-muted` | `page.tsx:87-90` |
| F — Timeline | **none** — `<CampaignTimeline milestones={CAMPAIGN_MILESTONES} />` always rendered | `page.tsx:97` |

Zone D's donut chart (`BudgetDonutChart`) has an additional gate: it is rendered only when
`!isLoading && data?.items && data.items.length > 0` (`page.tsx:78`). During loading it is
simply absent (no skeleton for the donut panel).

---

## Main content branch

After the query resolves, each zone picks its state independently. Priority order per zone:

### Zone B — Header (`MarketingPageHeader`) · `page.tsx:38-43`

Always rendered — no loading gate. The `DateRangePicker` inside it is always interactive.

### Error banner · `page.tsx:46-53`

Rendered when `isError === true` (regardless of loading state). Inline red banner:
`rounded-xl border border-red-200 bg-red-50` with a `Thử lại` button that calls `refetch()`.
This is **page-level** — it appears above all zones simultaneously. It does not replace zone
skeletons; once `isError` is true after a resolved query, `isLoading` is `false`, so zones
fall through to their empty / null branches.

### Zone C — Budget KPI cards · `page.tsx:56-64`

| Order | Condition | Renders |
|---|---|---|
| 1 | `isLoading` | 4 × `h-24` pulse cards |
| 2 | `data?.summary` truthy | `<BudgetSummaryCards summary={data.summary} />` |
| 3 | otherwise (`null`) | nothing |

### Zone D — Spend table + donut chart · `page.tsx:66-83`

Left column (table):

| Order | Condition | Renders |
|---|---|---|
| 1 | `isLoading` | `h-72` pulse block |
| 2 | `data?.items && data.items.length > 0` | `<SpendBreakdownTable items={data.items} />` |
| 3 | `!isError` (empty items, no error) | `<EmptyState message="Chưa có hạng mục chi tiêu nào." />` |
| 4 | `isError` | `null` |

Right column (donut):

| Condition | Renders |
|---|---|
| `!isLoading && data?.items && data.items.length > 0` | `<BudgetDonutChart …/>` in `w-full lg:w-64` wrapper |
| otherwise | nothing (no skeleton for donut) |

### Zone E — Love score · `page.tsx:86-94`

| Order | Condition | Renders |
|---|---|---|
| 1 | `isLoading` | 3 × `h-28` pulse cards |
| 2 | `data?.love_score` truthy | `<LoveScoreSection loveScore={data.love_score} />` |
| 3 | otherwise | nothing |

### Zone F — Campaign timeline · `page.tsx:96-98`

`<CampaignTimeline milestones={CAMPAIGN_MILESTONES} />` is **always rendered**. The
`CAMPAIGN_MILESTONES` array is a compile-time constant defined at `page.tsx:14-20` (5 milestones
with hardcoded labels, activities, and colors). It never fetches data and has no loading state.

### Empty-state details

Only Zone D shows an `EmptyState` component (`page.tsx:73-75`). It renders when the query
resolves successfully with `data.items` being absent or empty, AND when `isError` is false.

`EmptyState` (`fe/src/components/shared/EmptyState.tsx:6-13`):
- Default icon: `🍜`
- Message: `"Chưa có hạng mục chi tiêu nào."`
- Layout: `flex-col items-center justify-center py-16 gap-3`, `text-4xl` icon, `text-sm text-muted-fg` message.

Zones C and E show nothing (not an `EmptyState`) when data is absent — they fall to `null`.

---

## Search/Interaction Gating

### Date-range picker re-triggers the full page · `page.tsx:32-33, 38-43`

The `<DateRangePicker>` inside `MarketingPageHeader` calls `setDateRange` on change
(`page.tsx:39`). This updates the `dateRange` state, which changes the `queryKey`
(`['marketing', 'spend', dateRange]`). A new queryKey means a new query fetch — TanStack Query
sets `isLoading = true` for the uncached range, re-entering all five zone skeletons
simultaneously.

Cached ranges (previously fetched within 5 min, `staleTime: 5 * 60 * 1000`) resolve
immediately from cache — `isLoading` stays `false` and zones render with stale data.

### `enabled` guard · `useMarketingSpend.ts:15`

`enabled: !!dateRange.from && !!dateRange.to` — the query is disabled if either bound is
absent. In practice this never fires: `getCurrentMonthRange()` (`page.tsx:22-29`) always
returns a fully-populated `{ from, to }` as the `useState` initial value, and the picker
cannot clear both fields to empty simultaneously. The guard is defensive only.

### Export and AddSpend buttons · `page.tsx:41-42`

Both trigger `toast.info(…)` only — no fetch, no loading state change.

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **No donut skeleton** | When `isLoading`, the right-side `BudgetDonutChart` panel is simply absent — no pulse placeholder. On a cold load the left column shows a `h-72` skeleton while the right side is blank, creating an asymmetric layout until data arrives. `page.tsx:78`. |
| 2 | **Zone C and E show nothing on empty data** | If the API returns `summary: null` or `love_score: null`, zones C and E silently render nothing (no `EmptyState`, no message). A blank section with no explanation may confuse users. `page.tsx:62-64, 92-94`. |
| 3 | **No `<Suspense>` / no marketing `loading.tsx`** | The page is a `'use client'` component; it does not use `useSearchParams` or any server component that would require `<Suspense>`. The admin route-level `loading.tsx` is the only navigation fallback. If the admin group's `loading.tsx` is removed, there is no per-page fallback. |
| 4 | **Shared `isLoading` — no progressive reveal** | All data zones re-enter their skeleton state together on every date-range change. There is no opportunity for zones backed by cached partial data to stay rendered while others reload. |
| 5 | **`BudgetDonutChart` has no loading or empty skeleton** | `❓ UNVERIFIED` — no design spec was found confirming that the blank-right-panel behavior during load is intentional. The code is clear (`page.tsx:78`) but no AC or wireframe comment addresses it. |
