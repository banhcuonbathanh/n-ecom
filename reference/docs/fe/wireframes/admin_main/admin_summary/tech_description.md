## Technical Architecture — Admin — Tổng Kết Ngày

---

### Page Structure

- **Zones:** 8 zones (Revenue Snapshot · Sales Breakdown · Order Channels · Menu Performance · Kitchen & Ops · Staff Performance · Inventory Alerts · Shift Log) + 1 modal
- **Device target:** Desktop (1280px primary); tablet responsive at 768px; mobile not primary
- **Sticky zones:** `AdminTopNav` — `sticky top-0 z-50`
- **Modals:** M1 — `AddShiftNoteModal` (append-only; only rendered when `selectedDate === today`)
- **Layout:** Single-column scroll; Zones 2 and 4 use a 2-column internal split

---

### RBAC & Auth Rules

| Rule | Value |
|------|-------|
| **Route protection** | `AuthGuard` + `RoleGuard(['admin', 'manager'])` |
| **Allowed roles** | Admin · Manager |
| **Auth state used** | `useAuthStore.user.role` — used to confirm role before rendering page |
| **Conditional UI by role** | None currently — both Admin and Manager see identical UI |
| **Unauthorized redirect** | Unauthenticated → `/login`; wrong role → `/403` or dashboard root |

---

### Tech Stack

```
React (Next.js 14 App Router)
├── Pattern: B — Full Client ('use client' on page root)
│   └── Reason: date picker is interactive local state; data is user-scoped by date
├── State: Zustand (useAuthStore only) + useState for selectedDate
├── Data: TanStack Query
│   ├── ['admin', 'summary', date]   → GET /api/v1/admin/summary?date=
│   └── ['admin', 'shift-log', date] → GET /api/v1/admin/shift-log?date=
├── Forms: RHF + Zod (AddShiftNoteModal only)
├── Charts: Recharts (or Tremor) — HourlyRevenueChart (BarChart) + PaymentMethodPieChart (PieChart)
├── Styling: Tailwind CSS (desktop grid layout, responsive single-column at 768px)
└── Types: TypeScript strict — all zone data fully typed via DailySummary interface
```

---

### Key Implementation Patterns

**1. Component Architecture**

`page.tsx` (RSC shell, no data) → `AdminSummaryPageClient` (`'use client'`) → zone components

All 8 zone components live under `app/admin/summary/components/`. None are exported as shared — they are local to this page.

**2. State Management**

```typescript
// page-local state only — no Zustand store needed
const [selectedDate, setSelectedDate] = useState<string>(
  format(new Date(), 'yyyy-MM-dd')
)

// Both queries re-run automatically when selectedDate changes
const { data: summary, isLoading, isError } = useAdminSummary(selectedDate)
const { data: shiftLog } = useAdminShiftLog(selectedDate)
```

**3. Data Fetching Strategy**

| Query key | staleTime | refetchInterval | Reasoning |
|-----------|-----------|-----------------|-----------|
| `['admin', 'summary', date]` (today) | 30s | 300s (5 min) | Today's data changes — auto-refresh keeps it current |
| `['admin', 'summary', date]` (past) | 300s | false | Past data is immutable — no need to re-fetch |
| `['admin', 'shift-log', date]` | 30s | — | Notes invalidated manually on mutation success |

**4. Peak Hour Calculation**

The `isPeak: boolean` flag on each `HourlyRevenue` item is computed by the backend (top 2 hours by amount). The chart renders peak bars with a distinct color and ★ label. No client-side calculation needed.

**5. Past Date Guard for Shift Log Button**

```typescript
const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd')
// Zone 8 — Button only rendered when isToday
{isToday && <Button onClick={() => setModalOpen(true)}>+ Thêm Ghi Chú</Button>}
```

**6. Edge Case Handling**

- Zero-order date: `orderCount === 0` triggers EmptyState in Zones 4, 6 while KPI cards still render with 0 values
- Inventory API failure: Zone 7 shows soft error — does not block other zones
- Chart with empty data: both Recharts components handle empty arrays gracefully with a placeholder message

---

### Rendering Strategy

| Layer | What | Why |
|---|---|---|
| **RSC** | `page.tsx` — thin shell, no prefetch | Pattern B: date is local state, can't prefetch without knowing the date |
| **Client** (`'use client'`) | `AdminSummaryPageClient` — owns all zones, date picker, queries | All data depends on `selectedDate` which is runtime user state |
| **Skeleton** | `<AdminSummarySkeleton />` required | Pattern B mandates skeleton — shown during initial query load |

> Gap: First paint shows skeleton until `['admin', 'summary', today]` resolves. Since data is date-specific and user-interactive, there is no ISR path without significant complexity (ISR per date segment). Accept the skeleton flash.

Register this page in `docs/fe/wireframes/shared/_INDEX_RENDERING_STRATEGY.md` after implementing.

---

### File Organization

```
src/
├── app/admin/summary/
│   ├── page.tsx                         # RSC shell — renders AdminSummaryPageClient
│   └── components/                      # local — only this page uses these
│       ├── AdminSummaryPageClient.tsx   # 'use client' — owns date state + all zones
│       ├── AdminSummarySkeleton.tsx     # Pattern B required skeleton
│       ├── HourlyRevenueChart.tsx       # Zone 2 — bar chart
│       ├── PaymentMethodPieChart.tsx    # Zone 2 — pie chart
│       ├── OrderChannelCards.tsx        # Zone 3 — 3-up channel cards
│       ├── TopSellingList.tsx           # Zone 4 left panel
│       ├── SlowItemsAlert.tsx           # Zone 4 right panel
│       ├── StaffPerformanceTable.tsx    # Zone 6 — read-only table
│       ├── InventoryAlertList.tsx       # Zone 7 — alert rows
│       ├── ShiftLogList.tsx             # Zone 8 — log entries
│       └── AddShiftNoteModal.tsx        # Modal M1
├── hooks/
│   └── useAdminSummary.ts              # useAdminSummary + useAdminShiftLog + useAddShiftNote
└── store/
    └── auth.ts                          # useAuthStore — role check only
```

> Stores go under `src/store/` — never inside the page folder.
> Hooks go under `src/hooks/` — never inside the page folder.

---

### State Contract

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useAuthStore` | `user.role` | — | Persists across admin session | All admin pages read the same store |

> Local `selectedDate` state does not need to persist across navigation — it resets to today on each visit, which is the expected UX.

---

### Critical Implementation Notes

- **Chart library:** Use Recharts (`BarChart` + `PieChart`) — already in the FE stack if present, or install it. Tremor is an alternative. Do not build custom SVG charts.
- **`AdminSingleDatePicker`** is a new shared component — register it in `shared/_INDEX_SHARING_COMPONENT.md` before implementing. It wraps a date input with `max={today}` and a calendar popover.
- **`StaffPerformanceTable` ≠ `StaffTable`** — this is read-only with no edit/delete actions. Do not reuse `StaffTable` from `/admin/staff`; build a separate lightweight table.
- **Shift log is append-only** — no edit or delete endpoints. Do not add edit/delete UI even if the backend supports it in future.
- **`DailySummary` is one aggregate response** — all zones 1–7 share `['admin', 'summary', date]`. Do not split into multiple endpoint calls; the backend returns everything in one response to minimise waterfall.
