# Admin Marketing — `/admin/marketing`

> **TL;DR:** ✅ implemented · manager+ · Marketing **spend dashboard**: date-range header, budget
> KPI cards, spend-breakdown table + donut chart, "love score" effectiveness metrics, and a static
> campaign timeline (pre-opening weeks → khai trương → post). Data via `useMarketingSpend(dateRange)`.
> ⚠ Note: older docs describe this page as "QR code generation per table" — the code is a spend
> dashboard; table QR links currently live on the `/` landing demo grid.

---

## ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ (admin shell: tab nav)                                           │
├──────────────────────────────────────────────────────────────────┤
│ B  Marketing   [01/06/2026 – 30/06/2026 ▾]  [Xuất BC][+ Chi tiêu]│ ← MarketingPageHeader
├──────────────────────────────────────────────────────────────────┤
│ C  ┌Ngân sách┐ ┌Đã chi┐ ┌Còn lại┐ ┌% Sử dụng┐                    │ ← BudgetSummaryCards
│    │ 50.000k │ │32.000k│ │18.000k│ │  64%    │                    │
├──────────────────────────────────────────────────────────────────┤
│ D  ┌─SpendBreakdownTable──────────────┐  ┌─BudgetDonutChart─┐    │
│    │ Hạng mục      Ngân sách   Đã chi │  │      ◔ 64%       │    │
│    │ Social Ads     15.000k   12.000k │  │   (per-category  │    │
│    │ Tờ rơi          5.000k    4.500k │  │    segments)     │    │
│    │ KOL/Seeding    10.000k    8.000k │  └──────────────────┘    │
│    └──────────────────────────────────┘                          │
├──────────────────────────────────────────────────────────────────┤
│ E  LoveScoreSection — 3 effectiveness metric cards               │
├──────────────────────────────────────────────────────────────────┤
│ F  CampaignTimeline                                              │
│    [Tuần 1-2]──[Tuần 3]──[Tuần 4]──[🎊 Khai trương]──[Sau KT]    │
└──────────────────────────────────────────────────────────────────┘
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| B Header | `components/marketing/MarketingPageHeader` | local `DateRange` state (defaults to current month) |
| C KPI cards | `components/marketing/BudgetSummaryCards` | `useMarketingSpend(dateRange)` → `data.summary` |
| D Table | `components/marketing/SpendBreakdownTable` | `data.items` |
| D Donut | `components/marketing/BudgetDonutChart` | `data.items` + `summary.spent_pct` |
| E Love score | `components/marketing/LoveScoreSection` | `data.love_score` |
| F Timeline | `components/marketing/CampaignTimeline` | static `CAMPAIGN_MILESTONES` in page file |

## Key Interactions

- Change date range → refetches, but the BE **ignores** `from`/`to` (echoes them into `date_range`
  only) — the numbers are hardcoded constants, so the window has no visible effect. See
  [admin_marketing_be.md](admin_marketing_be.md) Flag 1.
- **Xuất báo cáo** / **+ Nhập chi tiêu** → currently toast "đang phát triển" (placeholders).
- Error → inline red banner with **Thử lại** (refetch); empty items → `EmptyState`.

## Business Logic Used

- Marketing spend hook + loading/empty patterns → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (marketing dashboard)
- Manager+ access via admin shell → [../02_spec/BUSINESS_RULES.md §1 RBAC](../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy)
