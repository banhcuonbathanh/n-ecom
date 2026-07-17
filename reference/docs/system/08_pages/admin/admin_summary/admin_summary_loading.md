# Admin Summary — Loading States · `/admin/summary`

> **TL;DR:** ✅ implemented · How `/admin/summary` behaves while data is in flight.
> Four independent `useQuery` calls each carry their own inline skeleton — there is **no** shared
> Suspense boundary and no single page spinner. Sections load progressively; the page shows a
> staggered fill as each query resolves independently. One additional interaction-loading state
> covers the StockIn modal submit.
>
> Page overview → [admin_summary.md](admin_summary.md) ·
> BE view (cache/staleTime detail) → [admin_summary_be.md](admin_summary_be.md) ·
> Cross-page data flow → [admin_summary_crosspage_dataflow.md](admin_summary_crosspage_dataflow.md) ·
> Scenario → SCENARIO_SUMMARY_REVIEW.md
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(dashboard)/admin/summary/page.tsx` ·
> `fe/src/app/(dashboard)/admin/loading.tsx` ·
> `fe/src/app/(dashboard)/admin/layout.tsx` ·
> `fe/src/app/(dashboard)/layout.tsx` ·
> `fe/src/components/guards/AuthGuard.tsx` ·
> `fe/src/components/guards/RoleGuard.tsx`

---

## Loading Layers (outer → inner)

```
1. (dashboard)/layout.tsx     → no loading UI; wraps in OrdersWSProvider only
2. AuthGuard                  → renders null (blank) while user is not yet in Zustand store
3. RoleGuard                  → renders access-denied message if role < MANAGER (not a spinner)
4. admin/loading.tsx           → route-level orange spinner (entire admin shell, navigation only)
5. summary/page.tsx            → NO route loading.tsx at this segment (confirmed — file does not exist)
6. Four per-query skeletons    → each widget owns its own inline animate-pulse skeleton
```

### Layer 1 — `(dashboard)/layout.tsx` · `fe/src/app/(dashboard)/layout.tsx:1-5`

Wraps all dashboard pages (KDS, cashier, admin) in `<OrdersWSProvider>`. No loading UI of any
kind — it renders children immediately.

### Layer 2 — `AuthGuard` · `fe/src/components/guards/AuthGuard.tsx:23`

`AuthGuard` is the outermost guard in `admin/layout.tsx:29`. While `user` is `null` (i.e. the
`getMe()` API call has not resolved yet), `AuthGuard` returns `null` — a blank white screen, no
spinner. On success `setAuth` populates Zustand and the children mount. On failure `router.push('/login')` fires.

This blank period is the longest loading state a cold-load user observes — it covers the entire
`getMe()` round-trip.

### Layer 3 — `RoleGuard` · `fe/src/components/guards/RoleGuard.tsx:16-23`

`RoleGuard` wraps all admin children with `minRole={Role.MANAGER}` (`admin/layout.tsx:30`). If the
authenticated user's role is below MANAGER (e.g. `chef`, `cashier`, `staff`), it renders a
`"Không có quyền truy cập trang này"` message — not a loading state but an access-denial gate. No
spinner is shown here.

### Layer 4 — Route-level spinner · `fe/src/app/(dashboard)/admin/loading.tsx:1-7`

Next.js App Router renders this file for the **entire `/admin/` route group** during navigation
between admin pages. It is a centered orange spinner:

- `h-64` centered flex container · `h-8 w-8 animate-spin rounded-full`
- `border-4 border-gray-200 border-t-orange-500`
- Shared by all admin routes. Not summary-specific.

This spinner fires only on **navigation into the segment** (Next.js streaming). It does NOT fire
on in-page data re-fetches.

### Layer 5 — No route `loading.tsx` at the summary segment

`fe/src/app/(dashboard)/admin/summary/` contains **only `page.tsx`** — no `loading.tsx` exists at
this route segment. Confirmed via `find`:

```
fe/src/app/(dashboard)/admin/summary/page.tsx   ← only file
```

Therefore: no Suspense fallback is provided at this segment level. Layer 4 (`admin/loading.tsx`)
is the innermost route-level spinner. When the summary page JS chunk loads, the spinner disappears
and the page shell renders immediately, at which point the four per-query skeletons (Layer 6) take
over.

### Layer 6 — Four independent per-query skeletons · `summary/page.tsx`

All four queries fire in parallel on mount. Each sub-component owns its own `isLoading` branch
with an inline `animate-pulse` skeleton — there is no combined Suspense boundary, no `<Suspense>`
wrapper anywhere in `summary/page.tsx`.

See [Main content branch](#main-content-branch) below for the per-query detail.

---

## Main Content Branch

The page mounts four components: `SummaryKPICards`, `TopDishesList`, `StaffPerfTable`, and
`StockAlertList`. Each runs its own `useQuery` independently. There is no shared gate — sections
render their data-state as soon as **their own** query resolves, producing a progressive/staggered
fill.

### Priority order each section renders: `isLoading → empty → data`

| # | Component | `queryKey` | `staleTime` | Loading skeleton | Empty state | Data |
|---|---|---|---|---|---|---|
| 1 | `SummaryKPICards` | `['admin','summary',range]` | 60 000 ms | 4 grey cards `h-28 animate-pulse rounded-xl bg-muted` in a 2-col/4-col grid | *(not possible — shape always includes all 4 fields)* | 4 `KPICard` blocks |
| 2 | `TopDishesList` | `['admin','top-dishes',range]` | 60 000 ms | 5 rows `h-8 animate-pulse rounded bg-muted` | `"Chưa có dữ liệu trong kỳ này"` (centered, `py-8`, `text-sm text-muted-fg`) | ranked list with progress bars |
| 3 | `StaffPerfTable` | `['admin','staff-performance',range]` | 60 000 ms | 4 rows `h-8 animate-pulse rounded bg-muted` | `"Chưa có dữ liệu"` (centered, `py-8`, `text-sm text-muted-fg`) | `<table>` with 4 columns |
| 4 | `StockAlertList` | `['admin','low-stock']` | 120 000 ms | 3 rows `h-12 animate-pulse rounded-lg bg-muted` | `"✅ Tất cả nguyên liệu đủ hàng"` (`text-green-600`, `py-6`) | alert rows with progress bars + "Nhập hàng" buttons |

Source line ranges:

| Component | `isLoading` skeleton | `data.length === 0` empty state | Source |
|---|---|---|---|
| `SummaryKPICards` | lines 65–73 | N/A (data always present) | `summary/page.tsx:59-73` |
| `TopDishesList` | lines 117–120 | line 121–122 | `summary/page.tsx:107-122` |
| `StaffPerfTable` | lines 169–172 | lines 173–174 | `summary/page.tsx:159-174` |
| `StockAlertList` | lines 309–312 | lines 313–314 | `summary/page.tsx:292-314` |

### Key insight — progressive/staggered fill

Because each component is a sibling in the render tree with no shared Suspense boundary, their
`useQuery` calls race independently. Whichever query resolves first replaces its skeleton with
data while the others may still be pulsing. In practice the typical resolution order on a warm
network is: KPI cards → Top dishes and Staff perf (tied, same staleTime) → Stock alerts (longer
staleTime, may already be fresh). The page never shows a unified "loading" state.

---

## Range-Switch Re-fetch Behaviour

The `range` state (`useState<SummaryRange>('today')`, `summary/page.tsx:366`) is embedded in
three of the four `queryKey` arrays. When the user taps a `RangeSelector` button:

| Query | Re-keyed on range switch? | Behaviour on switch |
|---|---|---|
| `['admin','summary',range]` | **Yes** | Re-enters `isLoading`; skeleton re-appears until new data arrives |
| `['admin','top-dishes',range]` | **Yes** | Re-enters `isLoading`; skeleton re-appears |
| `['admin','staff-performance',range]` | **Yes** | Re-enters `isLoading`; skeleton re-appears |
| `['admin','low-stock']` | **No** — no `range` in key | Does NOT reload; existing cached data stays; skeleton never re-appears |

The stock-alert panel therefore remains static while the other three panels pulse simultaneously
on a range switch — another form of staggered fill.

---

## Search / Interaction Gating

There is no search input or query-gating on this page. The only interaction-loading state is
the **StockIn modal submit**:

### StockIn modal pending state · `summary/page.tsx:278-284`

When the user submits the "Nhập hàng" form, `useMutation.isPending` disables the submit button
and changes its label:

```tsx
// summary/page.tsx:279-283
<button
  type="submit"
  disabled={mut.isPending}
  className="... disabled:opacity-50"
>
  {mut.isPending ? 'Đang lưu...' : '✓ Xác nhận nhập'}
</button>
```

- Button shows `"Đang lưu..."` while the POST is in flight.
- `disabled={mut.isPending}` prevents double-submit.
- On `onSuccess` (`summary/page.tsx:224-229`): invalidates `['admin','low-stock']` and
  `['admin','ingredients']`, shows a success toast, and closes the modal. The `StockAlertList`
  re-fetches automatically; its skeleton briefly re-appears.
- On `onError` (`summary/page.tsx:230`): toast error; modal stays open.

This is an **interaction-loading** state, not an initial page load state.

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **No `isError` handling in any section** | None of the four `useQuery` calls destructure `isError`. A failed network request produces no error UI — the skeleton simply stays pulsing indefinitely (TanStack Query will retry, but there is no user-visible error state or retry button). If retries exhaust, the component remains in skeleton. |
| 2 | **`AuthGuard` renders blank, not a spinner** | On a cold load (no Zustand user), `AuthGuard` returns `null` — a blank screen — while `getMe()` resolves. This is the longest perceived loading time but is invisible to the user. `admin/loading.tsx` is a navigation-only spinner and does NOT cover this blank period. |
| 3 | **No `loading.tsx` at summary segment** | `fe/src/app/(dashboard)/admin/summary/loading.tsx` does not exist. Only `admin/loading.tsx` (one level up) fires during navigation. A future route-level skeleton for the summary segment would need a dedicated file here. |
| 4 | **`SummaryKPICards` has no empty state** | The component does not handle `data === undefined` differently from `data` with zero values — it renders `0` for each KPI. If the BE returns an error and TanStack Query exhausts retries, `data` stays `undefined` and the component shows four `0`-value cards, not a skeleton or error message (since `isError` is not checked). |
| 5 | **staleTime for caching** | `staleTime: 60_000` (KPI/top-dishes/staff) and `staleTime: 120_000` (stock) mean navigating away and back within those windows shows stale data without re-fetching. See [admin_summary_be.md](admin_summary_be.md) for per-endpoint cache detail. |
