## Technical Architecture — Admin — Marketing

### Page Structure
- Zones: A (AdminTopNav sticky) · B (PageHeader) · C (BudgetSummaryCards) · D (SpendBreakdown: table + donut chart side-by-side) · E (LoveScoreSection) · F (CampaignTimeline)
- Device target: Desktop (1100px layout width)
- Sticky zones: Zone A (`top-0 z-20`)
- Modals: None in current spec — "+ Nhập chi tiêu" action TBD (see conccern.md)
- Scrollable: full page scroll; Zone A stays fixed

### Tech Stack

```
React (Next.js 14 App Router)
├── State: Zustand (useAuthStore) + local date range state (React useState)
├── Data: TanStack Query v5 — single query ['marketing', 'spend', dateRange]
│         staleTime: 5 min · refetch on dateRange change
├── Charts: Recharts (DonutChart) or similar — wrap in client component
├── Styling: Tailwind CSS v3 — desktop-first grid layout
└── Types: TypeScript strict — MarketingSpendResponse, MarketingSpendItem,
           MarketingBudgetSummary, MarketingLoveScore, CampaignMilestone
```

### Key Implementation Patterns

**1. Component Architecture**

All marketing components live in `components/marketing/`. Three components are proposed as shared (register in `_INDEX_SHARING_COMPONENT.md` before building):
- `DateRangePicker` → `components/shared/DateRangePicker.tsx`
- `KPICard` → `components/shared/KPICard.tsx`
- `ProgressBar` → `components/ui/progress-bar.tsx`

Local-only components:
- `MarketingPageHeader`, `BudgetSummaryCards`, `SpendBreakdownTable`, `BudgetDonutChart`, `LoveScoreSection`, `CampaignTimeline`

**2. State Management**

```typescript
// Date range is page-local state — does not need Zustand
const [dateRange, setDateRange] = useState<DateRange>({
  from: startOfMonth(new Date()).toISOString(),
  to: endOfMonth(new Date()).toISOString(),
});

// Auth is global
const { user, role } = useAuthStore();
```

**3. Data Fetching**

Single API call shares data across Zones C, D, and E. Do not make separate calls per zone.

```typescript
// hooks/useMarketingSpend.ts
export function useMarketingSpend(dateRange: DateRange) {
  return useQuery({
    queryKey: ['marketing', 'spend', dateRange],
    queryFn: () => apiClient.get<MarketingSpendResponse>(
      '/api/v1/admin/marketing/spend',
      { params: { from: dateRange.from, to: dateRange.to } }
    ),
    staleTime: 5 * 60 * 1000,
    enabled: !!dateRange.from && !!dateRange.to,
  });
}
```

**4. Chart Library**

Use Recharts `PieChart` + `Cell` for the donut chart. The donut centre label (37% đã chi) is an absolute-positioned `<div>` overlay, not a native Recharts label.

```tsx
// BudgetDonutChart.tsx — client component (chart needs browser)
'use client';
import { PieChart, Pie, Cell } from 'recharts';
```

**5. Currency Formatting**

All VND values must be formatted consistently:

```typescript
// lib/format.ts — reuse existing or add
export const formatVND = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
// Output: "18.500.000 ₫"
```

**6. Campaign Timeline**

Static constant — no API call. Define in `CampaignTimeline.tsx` directly. Horizontal timeline built with CSS `flex` + absolute-positioned dots on a horizontal line.

### File Organization

```
src/
├── app/
│   └── admin/
│       └── marketing/
│           └── page.tsx              ← RSC wrapper; RoleGuard + AuthGuard + Suspense
├── components/
│   ├── marketing/
│   │   ├── MarketingPageHeader.tsx
│   │   ├── BudgetSummaryCards.tsx
│   │   ├── SpendBreakdownTable.tsx
│   │   ├── BudgetDonutChart.tsx      ← 'use client' (Recharts)
│   │   ├── LoveScoreSection.tsx
│   │   └── CampaignTimeline.tsx
│   ├── shared/
│   │   ├── AdminTopNav.tsx           ← existing, pass activeTab="marketing"
│   │   ├── DateRangePicker.tsx       ← NEW shared
│   │   └── KPICard.tsx               ← NEW shared
│   └── ui/
│       └── progress-bar.tsx          ← NEW atom
├── hooks/
│   └── useMarketingSpend.ts
└── lib/
    └── format.ts                     ← formatVND (add if not present)
```

### Critical Notes

- `BudgetDonutChart` **must** be a `'use client'` component — Recharts does not run on the server.
- `CampaignTimeline` milestones are **static** — do not fetch from API. Any future customization should be feature-gated.
- All monetary values in the API response are raw integers in VND (not divided by 100). Format with `formatVND()`.
- The `+ Nhập chi tiêu` button's modal is **not yet designed** — wire the click handler to a `console.warn` or toast until the modal spec is written (see conccern.md).
- `DateRangePicker` should support keyboard input (ISO date) as well as visual calendar selection — needed for accessibility.
