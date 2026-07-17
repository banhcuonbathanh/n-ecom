# Scenario — Chị Hương Reviews the Launch Marketing Budget

> **TL;DR:** ✅ implemented · A concrete walk-through of `/admin/marketing` told as a story. One
> manager, one GET, and a hard truth: the date-range picker is cosmetic — the BE returns the same
> constants no matter what she types. Covers the admin-shell auth gate → page load → KPI cards →
> date-range change (numbers unchanged) → "Xuất báo cáo" toast.
>
> **Sources traced (branch `experience_claude.md_system_1`):**
> `be/internal/handler/marketing_handler.go` ·
> `fe/src/hooks/useMarketingSpend.ts` ·
> `fe/src/app/(dashboard)/admin/marketing/page.tsx`
>
> **Sibling docs:**
> [admin_marketing.md](admin_marketing.md) — zones, wireframe, object model ·
> [admin_marketing_be.md](admin_marketing_be.md) — BE endpoint detail (the ground truth for every
> number cited here) ·
> [admin_marketing_loading.md](admin_marketing_loading.md) — skeleton/error states per zone

---

## The Cast

| Who | Role | Username | Job in this story |
|---|---|---|---|
| **Chị Hương** | `manager` (quán owner) | `manager1` | Checks launch marketing budget the morning before the grand opening |

No chef, no cashier, no customer — this page is visible only to `manager` and `admin` roles
(`be/cmd/server/main.go:295`, `middleware.AtLeast("manager")`).

---

## The Setting

**Morning of the grand opening, ~08:45.** The restaurant is not yet open; no orders exist yet.
Chị Hương logs in on the admin dashboard at her laptop and navigates to the Marketing tab to make
sure the launch campaign spend is on track before the 11:00 opening ceremony.

---

## The Timeline

### 08:44 — She opens `/admin/marketing` — the auth gate fires first

Chị Hương's browser is already authenticated (she logged in as `manager1` earlier in the session).
The dashboard shell — `(dashboard)/admin/layout.tsx` with `AuthGuard` + `RoleGuard minRole=MANAGER`
— runs its role check silently. Her JWT has role `manager`, which passes
`middleware.AtLeast("manager")` (`main.go:295`). She is never redirected.

Had she been logged in as a cashier (`cashier1`) or a chef, `AtLeast("manager")` would have
returned `403` and the FE `RoleGuard` would have sent her back to `/dashboard` before any GET
even fired. The page renders only for `manager` and `admin`.

### 08:44:02 — The page mounts; `getCurrentMonthRange()` seeds the date picker

Before firing any network request, `MarketingDashboardPage` calls `getCurrentMonthRange()` to
seed the `dateRange` state (`page.tsx:22-29`). On 2026-06-16 this produces:

```ts
{ from: "2026-06-01", to: "2026-06-30" }   // page.tsx:22-29
```

This becomes the initial value of the `dateRange` `useState`, which immediately enables
`useMarketingSpend` (the `enabled: !!dateRange.from && !!dateRange.to` guard at
`useMarketingSpend.ts:15`).

### 08:44:02 — The single GET fires (Zone C/D/E/F content is in flight)

TanStack Query sees no cached entry for key `['marketing', 'spend', { from: "2026-06-01", to: "2026-06-30" }]`
(`useMarketingSpend.ts:7`) and fires immediately:

```
GET /api/v1/admin/marketing/spend?from=2026-06-01&to=2026-06-30
Authorization: Bearer <manager1 JWT>
```

(`useMarketingSpend.ts:9-11` via `api.get(…)` → the single Axios instance `fe/src/lib/api-client.ts`)

While the request is in flight, `isLoading` is `true`. The page renders four `animate-pulse`
skeleton rectangles (`h-24`) in place of the KPI cards (`page.tsx:57-60`), one `h-72` skeleton
for the spend table (`page.tsx:69-70`), and three `h-28` skeletons for the love-score cards
(`page.tsx:87-89`). Zone F (the campaign timeline) is **always visible** — it is static JSX
(`CAMPAIGN_MILESTONES` constant, `page.tsx:14-20`), no skeleton, no loading state.

> Full per-zone skeleton detail → [admin_marketing_loading.md](admin_marketing_loading.md).

### 08:44:03 — The BE responds with hardcoded constants

`marketingH.GetSpend` (`marketing_handler.go:19`) runs. It reads:

```go
from := c.DefaultQuery("from", "2026-05-01")   // marketing_handler.go:20  → "2026-06-01"
to   := c.DefaultQuery("to",   "2026-05-31")   // marketing_handler.go:21  → "2026-06-30"
```

Then it builds and returns a `gin.H` literal (`marketing_handler.go:56-79`). The `from`/`to`
values appear **only** in the echoed `date_range` field (`marketing_handler.go:58`). Every other
number is a Go literal constant — they are not read from a database, a service, or Redis. The
handler struct has no injected dependencies at all (`MarketingHandler{}`,
`marketing_handler.go:10-15`).

The `200 OK` JSON that crosses the wire:

```jsonc
{
  "data": {
    "date_range": { "from": "2026-06-01", "to": "2026-06-30" },  // echoed from params
    "summary": {
      "total_budget":    50000000,   // marketing_handler.go:60
      "total_spent":     18500000,   // marketing_handler.go:61
      "total_remaining": 31500000,   // marketing_handler.go:62
      "spent_pct":       37,         // marketing_handler.go:63
      "roi":             3.2,        // marketing_handler.go:64
      "roi_base":        "Dựa trên 2.000 khách/tháng"  // marketing_handler.go:65
    },
    "items": [
      { "id": "social", "icon": "📱", "name": "Social Media Ads",
        "sub_items": ["Facebook", "Instagram", "TikTok"],
        "budget": 15000000, "spent": 8000000, "remaining": 7000000,
        "progress_pct": 53, "color": "#6366f1" },           // marketing_handler.go:24-29
      { "id": "print",  "icon": "🖨️", "name": "In ấn & Tờ rơi",
        "sub_items": ["Tờ rơi", "Banner"],
        "budget": 5000000,  "spent": 3500000, "remaining": 1500000,
        "progress_pct": 70, "color": "#f59e0b" },           // marketing_handler.go:30-35
      { "id": "kol",    "icon": "🌟", "name": "Influencer/KOL",
        "sub_items": ["Food blogger"],
        "budget": 10000000, "spent": 4000000, "remaining": 6000000,
        "progress_pct": 40, "color": "#ec4899" },           // marketing_handler.go:36-41
      { "id": "promo",  "icon": "🎁", "name": "Khuyến mãi khai trương",
        "sub_items": ["Giảm 20%", "Voucher"],
        "budget": 10000000, "spent": 2000000, "remaining": 8000000,
        "progress_pct": 20, "color": "#10b981" },           // marketing_handler.go:42-48
      { "id": "event",  "icon": "🎊", "name": "Sự kiện khai trương",
        "sub_items": ["Grand opening"],
        "budget": 10000000, "spent": 1000000, "remaining": 9000000,
        "progress_pct": 10, "color": "#f97316" }            // marketing_handler.go:49-54
    ],
    "love_score": {
      "cost_per_new_customer": 9250,           // marketing_handler.go:69
      "target_customers":      2000,           // marketing_handler.go:70
      "current_customers":     2000,           // marketing_handler.go:71
      "target_followers":      5000,           // marketing_handler.go:72
      "current_followers":     1500,           // marketing_handler.go:73
      "follower_progress_pct": 30,             // marketing_handler.go:74
      "satisfaction_score":    4.5,            // marketing_handler.go:75
      "satisfaction_max":      5.0             // marketing_handler.go:76
    }
  }
}
```

Total budget: **50,000,000 ₫**. Spent: **18,500,000 ₫** (37%). Remaining: **31,500,000 ₫**.
Expected ROI: **3.2×** based on 2,000 customers/month. Love score: cost-per-new-customer **9,250 ₫**,
follower progress **30%** (1,500 / 5,000), satisfaction **4.5/5**.

### 08:44:03 — Skeletons lift; all five zones render

`useMarketingSpend` resolves (`isLoading` → `false`, `data` populated). TanStack Query writes the
result into the `['marketing', 'spend', { from: "2026-06-01", to: "2026-06-30" }]` entry with
`staleTime: 5 * 60 * 1000` (5 min) (`useMarketingSpend.ts:14`). The skeletons disappear and
the real content mounts:

**Zone C — Budget KPI cards** (`BudgetSummaryCards`, `page.tsx:62-64`):
- "Tổng ngân sách" → ₫50,000,000
- "Đã chi" → ₫18,500,000 (37%)
- "Còn lại" → ₫31,500,000
- "ROI dự kiến" → 3.2× · "Dựa trên 2.000 khách/tháng"

**Zone D — Spend table + donut** (`SpendBreakdownTable` + `BudgetDonutChart`, `page.tsx:71-82`):
Five rows appear in the table (Social Media 53%, In ấn 70%, KOL 40%, Khuyến mãi 20%, Sự kiện
10%). The donut chart renders with `spentPct={37}` (`page.tsx:80`).

**Zone E — Love score** (`LoveScoreSection`, `page.tsx:93`):
Three metric cards show cost-per-customer (9,250 ₫), follower progress (30%/1,500 of 5,000), and
satisfaction (4.5/5).

**Zone F — Campaign timeline** (`CampaignTimeline`, `page.tsx:97`):
Always visible — renders `CAMPAIGN_MILESTONES` (`page.tsx:14-20`), a static list of 5 phases
(Tuần 1-2, Tuần 3, Tuần 4, "🎊 Khai trương", Sau khai trương). No network request, no skeleton.

Chị Hương scans the dashboard. The "In ấn & Tờ rơi" row catches her eye — 70% of that 5 million
budget is already spent, yet the grand opening is today. She makes a mental note to ask the
marketing team about the remaining 1,500,000 ₫ allocation.

### 08:51 — She changes the date range to last month — the numbers do NOT change

She uses the `MarketingPageHeader` date picker (`page.tsx:38-43`) to switch the range to
`{ from: "2026-05-01", to: "2026-05-31" }` to compare May spending.

`onDateChange` calls `setDateRange` (`page.tsx:39`). The `dateRange` state updates. TanStack Query
sees a new key — `['marketing', 'spend', { from: "2026-05-01", to: "2026-05-31" }]` — has no
cached entry, so it fires a fresh request:

```
GET /api/v1/admin/marketing/spend?from=2026-05-01&to=2026-05-31
Authorization: Bearer <manager1 JWT>
```

The BE responds with **byte-identical numbers**: `total_budget: 50000000`, `total_spent: 18500000`,
`spent_pct: 37`, and all five category rows unchanged (`marketing_handler.go:23-79` — constants).
The only thing that changes in the JSON is `"date_range": { "from": "2026-05-01", "to": "2026-05-31" }`.

**The screen looks identical.** The KPI cards, the spend table, the donut chart, the love-score
cards — all show the same figures as before. This is not a rendering bug; it is the documented
behaviour of a pre-launch stub. The date filter accepts input and fires a real network request,
but `GetSpend` ignores the params entirely (`marketing_handler.go:20-21` — `from`/`to` assigned
but never used to filter data). See [admin_marketing_be.md — Flag 1](admin_marketing_be.md).

TanStack Query now holds two cache entries (June range and May range) with identical payloads but
distinct keys. Both have a 5-minute stale window. Switching back to June instantly returns from the
L1 cache — no network round-trip.

### 08:53 — She clicks "Xuất báo cáo" — a toast appears, nothing more

She clicks the export button in the page header. `onExport` fires:

```ts
onExport={() => toast.info('Chức năng xuất báo cáo đang phát triển')}
// page.tsx:41
```

A Sonner info toast appears in the corner: *"Chức năng xuất báo cáo đang phát triển."* No file
downloads. No network request leaves the browser. There is no export endpoint — confirmed by the
BE trace in [admin_marketing_be.md — Flag 3](admin_marketing_be.md).

Similarly, "+ Nhập chi tiêu" (`onAddSpend`, `page.tsx:42`) would show *"Chức năng nhập chi tiêu
đang phát triển"* — also a placeholder toast with no write endpoint.

Chị Hương notes the export feature is not ready, closes the tab, and heads downstairs to greet
the first guests.

---

## Under the Hood

### A. Cross-component data flow (one page, all widgets share one query)

There is no Zustand store involved on this page. All five content zones receive their data from the
single `useMarketingSpend(dateRange)` call at the top of `MarketingDashboardPage` (`page.tsx:33`).
The hook's return value (`data`, `isLoading`, `isError`) is passed directly as props to each child
component:

```
useMarketingSpend(dateRange)
  ↓  data.summary  →  BudgetSummaryCards        (page.tsx:63)
  ↓  data.items    →  SpendBreakdownTable        (page.tsx:72)
  ↓  data.items    →  BudgetDonutChart           (page.tsx:80)
  ↓  data.love_score → LoveScoreSection          (page.tsx:93)
  isLoading        →  per-zone pulse skeletons   (page.tsx:57-59, 69, 87-89)
  isError          →  red error banner           (page.tsx:46-53)

CampaignTimeline   ←  CAMPAIGN_MILESTONES (static const, page.tsx:14-20)
                       no query, no props from useMarketingSpend
```

There is no cross-component shared store for this page — a single query result fans out via
prop-drilling to leaf components. Because the page has a single data source, a
`_crosscomponent_dataflow.md` is N/A for this page (marked N/A in the sibling doc set).

### B. Cross-page data flow (read-only, no handoff)

This page writes nothing that outlives the session. It is pure read; it does not mutate BE state,
does not set any Zustand store that other pages read, and does not write any `localStorage` key.
A `_crosspage_dataflow.md` is N/A for this page — confirmed in the sibling doc set.

The only cross-page concern is **auth**: the admin-shell `AuthGuard`/`RoleGuard` in the
`(dashboard)` layout enforces `minRole=MANAGER` before the page even mounts. If the stored JWT
expires between the login and this page visit, the `api-client` interceptor gets a `401` and
redirects to login — standard pattern shared by all dashboard pages.

### C. What the FE sends to the BE

One request, one shape, every page load and every date-range change:

```
GET /api/v1/admin/marketing/spend?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>
Authorization: Bearer <staff JWT>
```

Assembled by `useMarketingSpend.ts:9-11` via the shared `api` Axios instance
(`fe/src/lib/api-client.ts`). The `from`/`to` params come from `dateRange` state
(`page.tsx:32-33`), which is initialized to the current calendar month by `getCurrentMonthRange()`
(`page.tsx:22-29`) and updated by `onDateChange` in `MarketingPageHeader` (`page.tsx:39`).

No request body, no mutations, no `POST`/`PATCH`/`DELETE` ever fires from this page.

### D. What the BE sends back — static, not live

The response is the hardcoded JSON described in the timeline above. There is **no realtime path**:
no SSE stream, no WebSocket, no polling. The only way the page refreshes is a manual refetch
(the "Thử lại" button on error, `page.tsx:49`) or the TanStack Query stale-time window expiring
after 5 minutes (`useMarketingSpend.ts:14`).

Because every response is identical regardless of params, switching date ranges does not reveal new
information — it only creates additional cache entries, each holding the same constants
(`marketing_handler.go:23-77`).

### E. Loading and caching

| Event | What renders | Source |
|---|---|---|
| `isLoading = true` (first fetch or new range) | 4 pulse rectangles (KPI zone) + 1 tall pulse (table zone) + 3 pulse rectangles (love-score zone); CampaignTimeline always visible | `page.tsx:56-60, 68-70, 86-89` |
| `isError = true` | Red banner "Không thể tải dữ liệu." + "Thử lại" refetch button | `page.tsx:46-53` |
| `data.items.length === 0` (impossible with static payload, but guarded) | `EmptyState` "Chưa có hạng mục chi tiêu nào." in the table zone | `page.tsx:73-74` |
| Successful load | Full content (Zones C, D, E, F) | `page.tsx:62-97` |

**Client-side cache:** TanStack Query stores results under `['marketing', 'spend', dateRange]`
with `staleTime: 5 * 60 * 1000` (`useMarketingSpend.ts:7, 14`). Within 5 minutes of a fetch,
switching back to a previously loaded date range is instant (no network).

**Server-side cache:** none. `marketing_handler.go` has no Redis interaction; the BE is
stateless for this endpoint. Full detail → [admin_marketing_loading.md](admin_marketing_loading.md).

### F. Monitoring

There is no monitoring wired to this page or this endpoint. The general Grafana dashboard
(Prometheus scraping `:8080/metrics`) would record the GET as a normal request in the request-rate
and p95-latency panels, but there are no dedicated marketing-page alerts and no Loki log tagging
for this route. Because the handler does no DB/Redis work, its p95 latency is expected to be
negligible (single `gin.H` literal serialized to JSON).

If a `401`/`403` spike appeared (e.g. someone probing `/admin/marketing/spend` unauthenticated),
it would surface in the 5xx-error-rate panel only if the harness counts 4xx as errors — otherwise
it would be invisible without a log query in Loki.

---

## Putting A–F on One Timeline

```
Chị Hương navigates to /admin/marketing
  → (dashboard) layout: AuthGuard + RoleGuard(minRole=MANAGER) passes     (BE: authMW + AtLeast("manager"))
  → page mounts; getCurrentMonthRange() → { from: "2026-06-01", to: "2026-06-30" }  (page.tsx:22-29)
  → useMarketingSpend enabled; TanStack Query cache miss → GET fires       (C: one GET, useMarketingSpend.ts:9)
  → isLoading=true → pulse skeletons in Zones C/D/E; Zone F (timeline) always visible  (E: loading)
  → BE: marketingH.GetSpend reads from/to, builds gin.H literal, returns 200          (D: static constants)
  → isLoading=false; data written to cache key [..., { from, to }] staleTime 5min     (E: cache written)
  → BudgetSummaryCards / SpendBreakdownTable / BudgetDonutChart / LoveScoreSection render  (A: props)
  → She changes date range to May → new key, new GET, byte-identical response          (C+D: same constants)
  → She clicks "Xuất báo cáo" → toast.info() only, no network request               (page.tsx:41)
  → No writes, no store mutations, no localStorage changes                             (B: no cross-page)
  → No SSE/WS, no polling                                                              (D: no realtime)
  → Grafana records the 2 GETs as normal requests; no dedicated marketing alerts       (F: no monitoring)
```

---

## Flags Surfaced by This Scenario

| # | Flag | Where it bites |
|---|------|----------------|
| 1 | **Date filter is decorative.** `from`/`to` are accepted by the BE but never used to filter data (`marketing_handler.go:20-21`). Every date range returns identical numbers. | Chị Hương cannot actually compare May vs. June spend — both ranges show the same 18.5 M ₫. |
| 2 | **"Xuất báo cáo" and "+ Nhập chi tiêu" are placeholder toasts.** No export file, no write endpoint (`page.tsx:41-42`). | A manager expecting to download a CSV or record a new spend entry hits a dead end. |
| 3 | **TanStack Query accumulates per-range cache entries that all hold identical data.** | Not a bug — cache memory cost is negligible — but worth knowing when debugging "why does switching the date not change numbers." |

---

## The One-Line Mental Model

> **`/admin/marketing` is a read-only stub**: one GET returns the same hardcoded launch-campaign
> numbers regardless of the date range; the date picker fires real requests but the BE ignores
> the params; the two action buttons are toasts with no endpoint behind them.
