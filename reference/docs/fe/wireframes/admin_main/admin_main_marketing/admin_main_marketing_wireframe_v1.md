---
page: admin_main_marketing
route: /admin/marketing
created: 2026-05-26
status: Draft
---

# Page: Admin — Marketing
**Route:** `/admin/marketing`
**Version:** v1
**Status:** Draft

## Spec Summary

- `/admin/marketing` — budget tracking & campaign effectiveness dashboard for new restaurant launch
- Zone B PageHeader: date range filter (01/05–31/05/2026), export report, and "+ Nhập chi tiêu" (add spend) button
- Zone C BudgetSummary: 4 KPI cards — Tổng ngân sách 50M₫ · Đã chi tiêu 18.5M₫ (37%) · Còn lại 31.5M₫ (63%) · ROI dự kiến 3.2×
- Zone D SpendBreakdown: 5 spend category rows (Social Media Ads · In ấn & Tờ rơi · Influencer/KOL · Khuyến mãi · Sự kiện) with inline progress bars + donut chart "Phân bổ ngân sách"
- Zone E LoveScore: campaign effectiveness metrics — 9.250₫/khách mới · mục tiêu 5.000 followers (30%) · điểm hài lòng 4.5/5.0⭐
- Zone F CampaignTimeline: 5-milestone horizontal launch roadmap (Tuần 1-2 → Tuần 3 → Tuần 4 → Khai trương → Sau khai trương)

---

## 📐 Visual Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ZONE A — AdminTopNav                               ← sticky top-0 z-20      │
│  Quản trị hệ thống │ Tổng quan  Tổng kết  Sản phẩm  Combo  Danh mục        │
│                    │ Topping  Nhân viên  Kho nguyên liệu  [Marketing ▃▃▃]   │
│                    │                                         ^^^orange       │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE B — PageHeader                                                          │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ Marketing — Khai trương nhà hàng mới                                  │   │
│ │ Theo dõi ngân sách & hiệu quả chiến dịch marketing                    │   │
│ │                           [📅 01/05–31/05/2026] [↓Xuất BC] [+Nhập ₫] │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE C — BudgetSummary (4 KPI cards)                                         │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│ │Tổng ngân sách│  │ Đã chi tiêu  │  │   Còn lại    │  │ ROI dự kiến  │    │
│ │50.000.000 ₫  │  │18.500.000 ₫🟠│  │31.500.000 ₫🟢│  │    3.2×  🟣  │    │
│ │[Kế hoạch]    │  │[37%]         │  │[63% ngân sách│  │[2.000 khách] │    │
│ └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE D — SpendBreakdown         GET /api/v1/admin/marketing/spend            │
│ ┌─────────────────────────────────────────────┐ ┌───────────────────────┐  │
│ │  Hạng mục        │Ngân sách│Đã chi│Còn lại│%%│ │   Phân bổ ngân sách  │  │
│ ├──────────────────┼─────────┼──────┼───────┼──┤ │     ╭───────╮        │  │
│ │📱 Social Media    │ 15.000M │8.000M│7.000M │██│ │     │ 37%   │        │  │
│ │   FB·IG·TikTok   │         │      │       │  │ │     │ đã chi│        │  │
│ │🖨️  In ấn & Tờ rơi│  5.000M │3.500M│1.500M │██│ │     ╰───────╯        │  │
│ │   Tờ rơi·Banner  │         │      │       │  │ │ ● Social Ads    30%  │  │
│ │🌟 Influencer/KOL  │ 10.000M │4.000M│6.000M │█ │ │ ● In ấn         10%  │  │
│ │   Food blogger   │         │      │       │  │ │ ● Influencer    20%  │  │
│ │🎁 Khuyến mãi KT  │ 10.000M │2.000M│8.000M │█ │ │ ● Khuyến mãi   20%  │  │
│ │   Giảm 20%·Voucher│        │      │       │  │ │ ● Sự kiện       20%  │  │
│ │🎊 Sự kiện KT     │ 10.000M │1.000M│9.000M │  │ └───────────────────────┘  │
│ │   Grand opening  │         │      │       │  │                            │
│ ├──────────────────┼─────────┼──────┼───────┼──┤                            │
│ │ Tổng cộng        │ 50.000M │18.5M │31.5M  │  │                            │
│ └─────────────────────────────────────────────┘                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE E — LoveScore (chỉ số hiệu quả chiến dịch)                              │
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐   │
│ │💰 Chi phí/Khách mới  │  │❤️ Mục tiêu Followers  │  │⭐ Điểm hài lòng  │   │
│ │   9.250 ₫/khách      │  │       5.000           │  │   4.5 / 5.0 ⭐   │   │
│ │ Mục tiêu: 2.000/tháng│  │[▓▓▓▓░░░░░░░░░] 30%   │  │ chất lượng+KM+UX │   │
│ │ chi 18,5M            │  │ đã đạt: 1.500         │  │                  │   │
│ └──────────────────────┘  └──────────────────────┘  └──────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE F — CampaignTimeline (lộ trình 5 tuần khai trương)                      │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ Lộ trình chiến dịch — 5 tuần khai trương                             │   │
│ │                                                                       │   │
│ │  Tuần 1-2    Tuần 3      Tuần 4   🎊Khai trương  Sau khai trương     │   │
│ │    ●──────────●──────────●────────────◉──────────────●               │   │
│ │  Social Ads  Seeding KOL  Tạo buzz  Sự kiện lớn  Retargeting         │   │
│ │  Tờ rơi      Influencer   Teaser    Khuyến mãi   Loyalty+Review      │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|----------------------|-------------------|
| A | `AdminTopNav` | Always visible | sticky top-0 z-20 |
| B | `MarketingPageHeader` | Always visible | static, below nav |
| C | `BudgetSummaryCards` (4× `KPICard`) | Always visible | static |
| D | `SpendBreakdownTable` + `BudgetDonutChart` | Always visible; table shows skeleton on load | static |
| E | `LoveScoreSection` (3× metric card) | Always visible | static |
| F | `CampaignTimeline` | Always visible | static, bottom of page |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| A | `useAuthStore` (Zustand) | On login | — | Reads role to guard access |
| B | `useDateRangeStore` or local state | User picks range; triggers refetch | — | Default: current month |
| C | `GET /api/v1/admin/marketing/spend` | TanStack Query; staleTime 5 min | `['marketing', 'spend', dateRange]` | Summary derived from spend items |
| D | `GET /api/v1/admin/marketing/spend` | Same query as Zone C | `['marketing', 'spend', dateRange]` | Shared query; split view |
| E | `GET /api/v1/admin/marketing/spend` | Same query as Zone C | `['marketing', 'spend', dateRange]` | loveScore field in response |
| F | Static / hardcoded | None — campaign plan data | — | Timeline is fixed plan, not live data |

---

## 🧩 Component Specifications

> Before filling this table: read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md`.
> Mark each row with one of: `✅ reuse` · `new (local)` · `new (shared)`

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|-------------------|
| A | `AdminTopNav` | ✅ reuse | `components/shared/AdminTopNav.tsx` | `activeTab="marketing"` |
| — | `AuthGuard` | ✅ reuse | `components/guards/AuthGuard.tsx` | — |
| — | `RoleGuard` | ✅ reuse | `components/guards/RoleGuard.tsx` | `allowedRoles={['admin', 'manager']}` |
| — | `useAuthStore` | ✅ reuse | `store/auth.ts` | — |
| B | `MarketingPageHeader` | new (local) | `components/marketing/MarketingPageHeader.tsx` | `title · subtitle · dateRange · onDateChange · onExport · onAddSpend` |
| B | `DateRangePicker` | new (shared) | `components/shared/DateRangePicker.tsx` | `value: DateRange · onChange: (range) => void · placeholder?` |
| B | `Button` | ✅ reuse | `components/ui/button.tsx` | variant="outline" · variant="default" (orange) |
| C | `BudgetSummaryCards` | new (local) | `components/marketing/BudgetSummaryCards.tsx` | `summary: MarketingBudgetSummary` |
| C | `KPICard` | new (shared) | `components/shared/KPICard.tsx` | `label · value · badge? · valueColor?` |
| C | `Badge` | ✅ reuse | `components/ui/badge.tsx` | variant="success" · "warning" · "secondary" |
| D | `SpendBreakdownTable` | new (local) | `components/marketing/SpendBreakdownTable.tsx` | `items: MarketingSpendItem[]` |
| D | `ProgressBar` | new (shared) | `components/ui/progress-bar.tsx` | `value: number · max?: number · color?: string · className?` |
| D | `BudgetDonutChart` | new (local) | `components/marketing/BudgetDonutChart.tsx` | `items: MarketingSpendItem[] · totalBudget: number · spentPct: number` |
| E | `LoveScoreSection` | new (local) | `components/marketing/LoveScoreSection.tsx` | `loveScore: MarketingLoveScore` |
| E | `ProgressBar` | new (shared) | `components/ui/progress-bar.tsx` | reused for follower progress |
| F | `CampaignTimeline` | new (local) | `components/marketing/CampaignTimeline.tsx` | `milestones: CampaignMilestone[]` |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
interface MarketingSpendItem {
  id: string;
  icon: string;
  name: string;
  subItems: string[];       // e.g. ["Facebook", "Instagram", "TikTok"]
  budget: number;           // VND
  spent: number;            // VND
  remaining: number;        // VND
  progressPct: number;      // 0–100
  color: string;            // hex for chart segment
}

interface MarketingBudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  spentPct: number;         // e.g. 37
  roi: number;              // multiplier, e.g. 3.2
  roiBase: string;          // "Dựa trên 2.000 khách/tháng"
}

interface MarketingLoveScore {
  costPerNewCustomer: number;   // VND
  targetCustomers: number;
  currentCustomers: number;
  targetFollowers: number;
  currentFollowers: number;
  followerProgressPct: number;  // derived: currentFollowers / targetFollowers * 100
  satisfactionScore: number;    // e.g. 4.5
  satisfactionMax: number;      // e.g. 5.0
}

interface CampaignMilestone {
  id: string;
  label: string;            // "Tuần 1-2"
  activities: string[];     // ["Social Ads", "Tờ rơi"]
  isKeyEvent: boolean;      // true = larger dot, orange color (Khai trương)
  color: string;            // tailwind color token e.g. "bg-orange-500"
}

interface MarketingSpendResponse {
  dateRange: { from: string; to: string };  // ISO date strings
  summary: MarketingBudgetSummary;
  items: MarketingSpendItem[];
  loveScore: MarketingLoveScore;
}
```

### Query Configuration

```typescript
// hooks/useMarketingSpend.ts
export function useMarketingSpend(dateRange: DateRange) {
  return useQuery({
    queryKey: ['marketing', 'spend', dateRange],
    queryFn: () => apiClient.get<MarketingSpendResponse>(
      '/api/v1/admin/marketing/spend',
      { params: { from: dateRange.from, to: dateRange.to } }
    ),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    enabled: !!dateRange.from && !!dateRange.to,
  });
}
```

### Campaign Timeline

The timeline milestones are **static plan data** — not fetched from API. Define as a constant in the component file:

```typescript
const CAMPAIGN_MILESTONES: CampaignMilestone[] = [
  { id: 'w1', label: 'Tuần 1-2', activities: ['Social Ads', 'Tờ rơi'], isKeyEvent: false, color: 'bg-slate-500' },
  { id: 'w3', label: 'Tuần 3', activities: ['Seeding KOL', 'Influencer'], isKeyEvent: false, color: 'bg-violet-600' },
  { id: 'w4', label: 'Tuần 4', activities: ['Tạo buzz', 'Teaser video'], isKeyEvent: false, color: 'bg-slate-500' },
  { id: 'open', label: '🎊 Khai trương', activities: ['Sự kiện lớn', 'Khuyến mãi'], isKeyEvent: true, color: 'bg-orange-500' },
  { id: 'post', label: 'Sau khai trương', activities: ['Retargeting', 'Loyalty + Review'], isKeyEvent: false, color: 'bg-slate-400' },
];
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| API load in progress | `isLoading === true` | Show skeleton cards | Skeleton on KPI cards + table rows |
| API error / network offline | `isError === true` | Log error, display banner | "Không thể tải dữ liệu. Thử lại." with retry button |
| Empty spend list (no items) | `items.length === 0` | Render `EmptyState` in table area | "Chưa có hạng mục chi tiêu nào." |
| All budget spent (remaining = 0) | `totalRemaining <= 0` | No blocking; display fact | Còn lại card shows "0 ₫" with red badge "Hết ngân sách" |
| Budget overrun (spent > budget) | `spent > budget` on any item | Highlight row in red | Row text color red; badge "Vượt ngân sách" |
| Date range: no data for period | `items.length === 0` after date change | Same as empty list above | EmptyState with date context |
| Non-admin/manager role | `RoleGuard` check fails | Redirect to `/admin` | — |
| Export fails | HTTP error on export endpoint | Toast error | "Xuất báo cáo thất bại. Thử lại." |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Zone A: AdminTopNav renders with "Marketing" tab active (orange underline)
- [ ] Zone B: Date picker defaults to current month; changing date triggers refetch
- [ ] Zone B: "↓ Xuất BC" button triggers export action
- [ ] Zone B: "+ Nhập chi tiêu" button opens add-spend form (TBD — not in current excalidraw)
- [ ] Zone C: 4 KPI cards render correct values from API response
- [ ] Zone C: Percentage badges show correct colors (green ≤ 50% spent, amber 50–80%, red > 80%)
- [ ] Zone D: Table renders all 5 spend rows with correct budget/spent/remaining values
- [ ] Zone D: Progress bars fill proportionally to spentPct per row
- [ ] Zone D: Donut chart segments match item percentages; center label = overall spentPct
- [ ] Zone D: Total row sums all items correctly
- [ ] Zone E: LoveScore metrics render correctly (cost, followers progress, satisfaction)
- [ ] Zone E: Followers progress bar shows currentFollowers/targetFollowers × 100
- [ ] Zone F: Timeline renders 5 milestones; Khai trương dot is larger and orange

### Edge Case Tests
- [ ] Loading state: skeletons appear while API pending
- [ ] Error state: error banner + retry button shown on API failure
- [ ] Empty spend list: EmptyState renders in Zone D table area
- [ ] Budget overrun: row highlights in red when spent > budget for a category

### Accessibility Tests
- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] Keyboard navigation: Tab, Enter, Esc work on date picker and buttons
- [ ] Focus visible on all interactive elements
- [ ] Chart has aria-label describing the donut chart data

### Cross-Device Tests
- [ ] Desktop (1280px+) — primary layout
- [ ] Tablet (768px) — table may need horizontal scroll
- [ ] Mobile (375px) — KPI cards stack vertically; table horizontally scrollable

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| MKTG-1 | FE | Wireframe + zone table | ✅ | wireframes/admin_main/admin_main_marketing/admin_main_marketing_wireframe_v1.md |
| MKTG-2 | FE | AdminTopNav integration (Zone A) | ⬜ | Zone A |
| MKTG-3 | FE | PageHeader + DateRangePicker (Zone B) | ⬜ | Zone B |
| MKTG-4 | FE | BudgetSummaryCards / KPICard atoms (Zone C) | ⬜ | Zone C |
| MKTG-5 | FE | SpendBreakdownTable + ProgressBar (Zone D left) | ⬜ | Zone D |
| MKTG-6 | FE | BudgetDonutChart (Zone D right) | ⬜ | Zone D |
| MKTG-7 | FE | LoveScoreSection (Zone E) | ⬜ | Zone E |
| MKTG-8 | FE | CampaignTimeline (Zone F) | ⬜ | Zone F |
| MKTG-9 | BE | GET /api/v1/admin/marketing/spend endpoint | ⬜ | Zone D label |

---

## 📝 Changelog

**v1 (2026-05-26)**
- Initial scaffold based on `admin-main-marketing.excalidraw`
- Zones documented: A (AdminTopNav) · B (PageHeader) · C (BudgetSummary) · D (SpendBreakdown+DonutChart) · E (LoveScore) · F (CampaignTimeline)
- No modals found in excalidraw

---

*Last Updated: 2026-05-26*
*Approved by: —*
*Next Review: After zone content reviewed with owner*
