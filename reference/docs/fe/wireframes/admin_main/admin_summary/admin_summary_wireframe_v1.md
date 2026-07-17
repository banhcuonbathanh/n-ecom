---
page: admin_summary
route: /admin/summary
created: 2026-05-27
status: Draft
---

# Page: Admin — Tổng Kết Ngày
**Route:** `/admin/summary`
**Version:** v1
**Status:** Draft

## Spec Summary

- Desktop-only daily operations dashboard; all zones are controlled by a single date picker (defaults to today; future dates disabled)
- Zone 1 — Revenue Snapshot: 4 KPI cards (Doanh Thu · Số Đơn · Giá Trị TB · Giờ Hoạt Động) each with delta vs. yesterday
- Zone 2 — Sales Breakdown: hourly bar chart (peak hours highlighted with ★) + payment method pie (Tiền Mặt / VNPay / MoMo)
- Zone 3 — Order Channels: 3 cards showing QR vs. POS vs. Giao Hàng split by count and percentage
- Zone 4 — Menu Performance: Top-5 bestsellers with revenue alongside low-performers, OOS items with timestamps, and top cancellation reason
- Zone 5 — Kitchen & Operations: 4 KPI cards (avg prep time · cancelled orders · slow orders >15 min · table sessions)
- Zone 6 — Staff Performance: read-only table sorted by Đơn Xử Lý descending — no CRUD, distinct from `/admin/staff`
- Zone 7 — Inventory Alerts: badge-prefixed ingredient alerts ("Hết Hàng" / "Sắp Hết") with operator action notes
- Zone 8 — Shift Log: append-only timestamped notes; "+ Thêm Ghi Chú" button hidden for past dates; opens AddShiftNoteModal

---

## 📐 Visual Wireframe

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓ Admin — Bánh Cuốn POS       [sticky top-0 z-50]       Nguyễn Admin | ⚙ Cài │  ← AdminTopNav
└────────────────────────────────────────────────────────────────────────────────────┘

  Tổng Kết Ngày                                          [📅  20/05/2026  ▼]
  ── Zone 1 — Revenue Snapshot ────────────────────────────────────────────────────
  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
  │ Doanh Thu Hôm Nay  │  │ Số Đơn Hôm Nay     │  │ Giá Trị Đơn TB     │  │ Giờ Hoạt Động      │
  │ 4,250,000 ₫        │  │ 87 đơn             │  │ 48,850 ₫           │  │ 11h 30m            │
  │ ↑ +12% hôm qua     │  │ ↑ +5 đơn hôm qua   │  │ ↑ +6% hôm qua      │  │ Ca: 08:00 – 19:30  │
  └────────────────────┘  └────────────────────┘  └────────────────────┘  └────────────────────┘

  ── Zone 2 — Sales Breakdown ─────────────────────────────────────────────────────
  ┌──────────────────────────────────────────────────────┐  ┌──────────────────────────┐
  │ Doanh Thu Theo Giờ (VNĐ)                             │  │ Phương Thức Thanh Toán   │
  │  │                                                   │  │                          │
  │  │         ████  ████                                │  │     [ PIE CHART ]        │
  │  │   ▓▓  ███████████  ████                           │  │                          │
  │  │ ▓▓▓▓▓▓███████████████████                         │  │  ■ Tiền Mặt    45%       │
  │  └─09h─10h─11h─12h★─13h─14h─17h─18h★──              │  │  ■ VNPay       35%       │
  │                                                      │  │  ■ MoMo        20%       │
  └──────────────────────────────────────────────────────┘  └──────────────────────────┘

  ── Zone 3 — Order Channels ──────────────────────────────────────────────────────
  ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
  │ Đặt Qua QR                   │  │ POS / Trực Tiếp              │  │ Giao Hàng / Khác             │
  │ 52 đơn  (60%)                │  │ 28 đơn  (32%)                │  │ 7 đơn  (8%)                  │
  └──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘

  ── Zone 4 — Menu Performance ────────────────────────────────────────────────────
  ┌────────────────────────────────────────┐  ┌────────────────────────────────────────┐
  │ 🏆 Top 5 Bán Chạy                     │  │ ⚠ Ít Bán / Đã Hết                     │
  │                                        │  │                                        │
  │ 1. Bánh Cuốn Thập Cẩm  43 · 645,000₫ │  │ ⚠  Bánh Cuốn Chay · 2 suất (thấp)    │
  │ 2. Bánh Cuốn Nhân Thịt 38 · 532,000₫ │  │ 🔴  Bún Riêu · 0 suất · Hết 14:30     │
  │ 3. Bún Bò Giò Heo      22 · 418,000₫ │  │ ⚠  Hủ Tiếu · 3 suất (thấp)           │
  │ 4. Nước Chấm Thêm      18 · 54,000₫  │  │                                        │
  │ 5. Chả Lụa             15 · 150,000₫ │  │ Đơn Bị Hủy Nhiều Nhất:                │
  │                                        │  │ Bánh Cuốn Thập Cẩm — 3 lần (hết       │
  │                                        │  │ topping)                              │
  └────────────────────────────────────────┘  └────────────────────────────────────────┘

  ── Zone 5 — Kitchen & Operations ────────────────────────────────────────────────
  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
  │ TG TB / Đơn        │  │ Đơn Bị Hủy         │  │ Đơn Chậm >15 ph.  │  │ Phiên Bàn Hôm Nay  │
  │ 8 phút             │  │ 3 đơn              │  │ 2 đơn              │  │ 45 phiên           │
  │ Trên 87 đơn        │  │ Hết món(2) Đổi ý(1)│  │ Max: 23ph (#0042) │  │ TB 1.9 đơn/phiên   │
  └────────────────────┘  └────────────────────┘  └────────────────────┘  └────────────────────┘

  ── Zone 6 — Staff Performance ───────────────────────────────────────────────────
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │ ▓ Nhân Viên        ▓ Đơn Xử Lý   ▓ Bàn Phục Vụ   ▓ Doanh Thu     ▓ Đơn Hủy  │
  │   Nguyễn Văn A       32 đơn          15 bàn          1,520,000₫        1        │
  │   Trần Thị B         28 đơn          13 bàn          1,340,000₫        2        │
  │   Lê Văn C           27 đơn          12 bàn          1,390,000₫        0        │
  └─────────────────────────────────────────────────────────────────────────────────┘

  ── Zone 7 — Nguyên Liệu / Inventory ─────────────────────────────────────────────
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │ [Hết Hàng]  Bánh Tráng — 86'd lúc 14:30. Đã thông báo khách. Đặt thêm trước ca mai. │
  │ [Sắp Hết]   Thịt Heo Xay — Còn ~1kg. Đủ đến khoảng 15:00. Kiểm tra ca chiều.       │
  │ [Sắp Hết]   Hành Lá — Còn ~300g. Kiểm tra ca tối. Ước tính cần thêm ~500g.          │
  └─────────────────────────────────────────────────────────────────────────────────┘

  ── Zone 8 — Ghi Chú Ca / Shift Log ──────────────────────────────────────────────
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │ 14:30 — Hết bánh tráng, đã thông báo toàn bộ khách đang chờ. Bếp trưởng XN.  │
  │ 16:00 — Máy in hóa đơn báo lỗi kẹt giấy. Khắc phục sau 5 phút.              │
  │                                                                                 │
  │ [＋ Thêm Ghi Chú]   ← hidden for past dates                                   │
  └─────────────────────────────────────────────────────────────────────────────────┘

  ── Modal M1 — Thêm Ghi Chú (opens from Zone 8 button) ──────────────────────────
  ┌─────────────────────────────────────────────────────┐
  │ Thêm Ghi Chú Ca                               [✕]  │
  │                                                     │
  │ Nội dung ghi chú *                                  │
  │ ┌─────────────────────────────────────────────┐     │
  │ │                                             │     │
  │ │                                             │     │
  │ └─────────────────────────────────────────────┘     │
  │ (min 5 ký tự, tối đa 500 ký tự)                     │
  │                                                     │
  │              [Hủy]  [Lưu Ghi Chú]                  │
  └─────────────────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| Nav | `AdminTopNav` | Always | sticky top-0 z-50 |
| Header | `SummaryPageHeader` + `AdminSingleDatePicker` | Always | static |
| 1 | `KPICard` ×4 (Doanh Thu · Số Đơn · Giá Trị TB · Giờ HĐ) | Always; zeros when no orders | static |
| 2 | `HourlyRevenueChart` + `PaymentMethodPieChart` | Always; empty chart state when no data | static |
| 3 | `OrderChannelCards` ×3 | Always; zeros + 0% when no orders | static |
| 4 | `TopSellingList` + `SlowItemsAlert` | Always; `EmptyState` when 0 items sold | static |
| 5 | `KPICard` ×4 (TG TB · Hủy · Chậm · Phiên Bàn) | Always; zeros when no orders | static |
| 6 | `StaffPerformanceTable` | Always; `EmptyState` when no staff clocked in | static |
| 7 | `InventoryAlertList` | Always; `EmptyState` "Không có cảnh báo" when all clear | static |
| 8 | `ShiftLogList` + `Button` | Always; `EmptyState` when no notes | static |
| M1 | `AddShiftNoteModal` | Opens on "+ Thêm Ghi Chú" click; button hidden for past dates | modal overlay z-50 |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| 1, 2, 3, 4, 5, 6, 7 | `GET /api/v1/admin/summary?date=YYYY-MM-DD` | TanStack Query; staleTime 300s (past) / 30s (today) | `['admin', 'summary', date]` | Single aggregate endpoint; refetchInterval 5 min when date = today |
| 8 | `GET /api/v1/admin/shift-log?date=YYYY-MM-DD` | TanStack Query; staleTime 30s | `['admin', 'shift-log', date]` | Separate key — notes append without refetching full summary |
| Date selector | `useState` (local) | User interaction — page component | N/A | Default: today ISO. Drives both query keys. maxDate = today |
| Auth / role | `useAuthStore` | Zustand | N/A | `RoleGuard(['admin', 'manager'])` |

---

## 🧩 Component Specifications

> Before filling this table: read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md`.
> Mark each row with one of: `✅ reuse` · `new (local)` · `new (shared)`

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|-------------------|
| Nav | `AdminTopNav` | ✅ reuse | `shared/AdminTopNav.tsx` | `activeTab: AdminTab` |
| Nav | `AuthGuard` | ✅ reuse | `guards/AuthGuard.tsx` | — |
| Nav | `RoleGuard` | ✅ reuse | `guards/RoleGuard.tsx` | `allowedRoles: ['admin', 'manager']` |
| Header | `AdminSingleDatePicker` | new (shared) | `shared/AdminSingleDatePicker.tsx` | `value: string (ISO) · onChange: (date: string) => void · maxDate?: string` |
| 1, 5 | `KPICard` | ✅ reuse | `shared/KPICard.tsx` | `label · value · badge? · valueColor? · badgeVariant?` |
| 2 | `HourlyRevenueChart` | new (local) | `app/admin/summary/components/HourlyRevenueChart.tsx` | `data: HourlyRevenue[] · peakHours: string[]` |
| 2 | `PaymentMethodPieChart` | new (local) | `app/admin/summary/components/PaymentMethodPieChart.tsx` | `data: PaymentMethodSplit[]` |
| 3 | `OrderChannelCards` | new (local) | `app/admin/summary/components/OrderChannelCards.tsx` | `qr: ChannelStat · pos: ChannelStat · other: ChannelStat` |
| 4 | `TopSellingList` | new (local) | `app/admin/summary/components/TopSellingList.tsx` | `items: TopSellingItem[]` |
| 4 | `SlowItemsAlert` | new (local) | `app/admin/summary/components/SlowItemsAlert.tsx` | `slowItems: SlowItem[] · mostCancelled?: CancelledItem` |
| 1–8 | `EmptyState` | ✅ reuse | `shared/EmptyState.tsx` | `message: string · icon?: string` |
| 6 | `StaffPerformanceTable` | new (local) | `app/admin/summary/components/StaffPerformanceTable.tsx` | `rows: StaffPerformanceRow[]` |
| 7 | `InventoryAlertList` | new (local) | `app/admin/summary/components/InventoryAlertList.tsx` | `alerts: InventoryAlert[]` |
| 7 | `Badge` | ✅ reuse | `ui/badge.tsx` | `variant: 'urgent' \| 'warning'` |
| 8 | `ShiftLogList` | new (local) | `app/admin/summary/components/ShiftLogList.tsx` | `entries: ShiftLogEntry[]` |
| 8 | `Button` | ✅ reuse | `ui/button.tsx` | `variant: default · size: default` |
| M1 | `AddShiftNoteModal` | new (local) | `app/admin/summary/components/AddShiftNoteModal.tsx` | `open: boolean · onClose: () => void · date: string · onSuccess: () => void` |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
// Main summary response — single endpoint covers Zones 1–7
interface DailySummary {
  date: string // ISO YYYY-MM-DD
  revenue: {
    total: number
    deltaPercent: number          // vs. yesterday; positive = green
    orderCount: number
    orderCountDelta: number
    avgOrderValue: number
    avgOrderValueDeltaPercent: number
    shiftHours: string            // "11h 30m"
    shiftRange: string            // "08:00 – 19:30"
  }
  hourlyRevenue: HourlyRevenue[]
  paymentSplit: PaymentMethodSplit[]
  channels: {
    qr: ChannelStat
    pos: ChannelStat
    other: ChannelStat
  }
  menuPerformance: {
    topSelling: TopSellingItem[]  // up to 5, sorted by count desc
    slowItems: SlowItem[]
    mostCancelled?: CancelledItem
  }
  kitchen: {
    avgPrepMinutes: number
    cancelledCount: number
    cancelReasons: CancelReason[]
    slowOrderCount: number
    slowOrderMax?: { minutes: number; orderId: string }
    tableSessions: number
    avgOrdersPerSession: number
  }
  staffPerformance: StaffPerformanceRow[] // sorted by ordersHandled desc by BE
  inventoryAlerts: InventoryAlert[]
}

interface HourlyRevenue {
  hour: string    // "09h", "12h" etc.
  amount: number
  isPeak: boolean // top-2 hours by volume, computed by BE
}

interface PaymentMethodSplit {
  method: 'cash' | 'vnpay' | 'momo'
  labelVi: string
  percent: number
  amount: number
}

interface ChannelStat {
  labelVi: string
  count: number
  percent: number
}

interface TopSellingItem {
  rank: number
  name: string
  count: number
  revenue: number
}

interface SlowItem {
  name: string
  count: number
  status: 'low' | 'out_of_stock'
  outOfStockAt?: string  // "14:30" — only when status = out_of_stock
}

interface CancelledItem {
  name: string
  cancelCount: number
  reason?: string
}

interface CancelReason {
  reason: string
  count: number
}

interface StaffPerformanceRow {
  staffId: string
  name: string
  ordersHandled: number
  tablesServed: number
  revenue: number
  cancelledOrders: number
}

interface InventoryAlert {
  ingredientName: string
  status: 'out_of_stock' | 'low_stock'
  note: string
  alertedAt?: string  // "14:30"
}

// Shift log — separate endpoint (Zone 8)
interface ShiftLogEntry {
  id: string
  timestamp: string    // display time "14:30"
  content: string
  authorName: string
  createdAt: string    // ISO datetime for ordering
}

// Add note form — RHF + Zod
interface AddShiftNoteForm {
  content: string   // required, min 5, max 500
}
```

### Query Configuration

```typescript
// hooks/useAdminSummary.ts
export function useAdminSummary(date: string) {
  const isToday = date === format(new Date(), 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['admin', 'summary', date],
    queryFn: () => fetchAdminSummary(date),
    staleTime: isToday ? 30_000 : 300_000,
    refetchInterval: isToday ? 300_000 : false,
  })
}

export function useAdminShiftLog(date: string) {
  return useQuery({
    queryKey: ['admin', 'shift-log', date],
    queryFn: () => fetchAdminShiftLog(date),
    staleTime: 30_000,
  })
}

export function useAddShiftNote(date: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => postShiftNote(date, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shift-log', date] })
    },
  })
}
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| Date has zero orders | `revenue.orderCount === 0` | KPI cards show 0; EmptyState in Zones 4 and 6 | "Không có đơn hàng ngày này" |
| Fewer than 5 items sold | `topSelling.length < 5` | Render only present items | List shows 1–4 rows, no padding |
| No inventory alerts | `inventoryAlerts.length === 0` | EmptyState in Zone 7 | "Không có cảnh báo nguyên liệu" |
| No shift log entries | `entries.length === 0` | EmptyState in Zone 8 | "Chưa có ghi chú ca hôm nay" |
| Network error on summary fetch | TanStack Query `isError` | Inline error with retry button | "Không thể tải dữ liệu — Thử lại" |
| Future date selected | UI validation `maxDate = today` | Disable future dates in picker | Dates after today greyed out and unselectable |
| Past date — add note | `selectedDate < today` | Hide "+ Thêm Ghi Chú" button | Button not rendered; no hover state |
| No staff clocked in | `staffPerformance.length === 0` | EmptyState in Zone 6 | "Không có nhân viên ca này" |
| All payment via one method | Only one `paymentSplit` entry | Pie renders as full circle | Legend shows 1 row; OK visually |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Zone 1: 4 KPI cards render with correct values; delta ↑ is green, ↓ is red
- [ ] Zone 2: Bar chart renders all hours; peak bars (12h★, 18h★) are visually distinct
- [ ] Zone 2: Pie legend shows 3 payment methods; percentages sum to 100%
- [ ] Zone 3: 3 channel cards render; percentages sum to 100%
- [ ] Zone 4: Top-5 list in rank order with revenue; list truncates if < 5 items sold
- [ ] Zone 4: OOS items show 🔴 with timestamp; low items show ⚠
- [ ] Zone 5: "Đơn Bị Hủy" and "Đơn Chậm" values are red when > 0
- [ ] Zone 6: Staff rows sorted by Đơn Xử Lý descending
- [ ] Zone 7: "Hết Hàng" renders `urgent` Badge; "Sắp Hết" renders `warning` Badge
- [ ] Zone 8: Log entries in chronological order (oldest first, newest last)
- [ ] Zone 8: "+ Thêm Ghi Chú" button hidden when viewing a past date
- [ ] M1: Modal opens, submits note, closes, and log list refreshes

### Edge Case Tests
- [ ] Empty date: KPI zones show 0; Zones 4, 6, 7, 8 show EmptyState
- [ ] Future date: date picker rejects selection (maxDate enforced)
- [ ] Network error: error + retry shown in affected zone

### Accessibility Tests
- [ ] All interactive elements `min-h-[44px] min-w-[44px]`
- [ ] Date picker keyboard-navigable
- [ ] Modal traps focus (Tab cycle), closes on Esc
- [ ] Charts have `aria-label` describing data

### Cross-Device Tests
- [ ] Desktop 1280px+ — all zones visible, 2-column layouts intact
- [ ] Tablet 768px — single-column fallback; charts responsive
- [ ] Mobile 375px — not primary target; no horizontal overflow

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| SUM-1 | FE | Wireframe + zone table | ✅ | wireframes/admin_main/admin_summary/admin_summary_wireframe_v1.md |
| SUM-2 | FE | `AdminSummaryPageClient` — date picker + all zone layout skeleton | ⬜ | Zones 1–8 |
| SUM-3 | FE | Zone 1 + 5 — KPICard ×8 wired to summary query | ⬜ | Zone 1, 5 |
| SUM-4 | FE | Zone 2 — HourlyRevenueChart + PaymentMethodPieChart | ⬜ | Zone 2 |
| SUM-5 | FE | Zone 3 — OrderChannelCards | ⬜ | Zone 3 |
| SUM-6 | FE | Zone 4 — TopSellingList + SlowItemsAlert | ⬜ | Zone 4 |
| SUM-7 | FE | Zone 6 — StaffPerformanceTable | ⬜ | Zone 6 |
| SUM-8 | FE | Zone 7 — InventoryAlertList | ⬜ | Zone 7 |
| SUM-9 | FE | Zone 8 — ShiftLogList + AddShiftNoteModal | ⬜ | Zone 8, M1 |
| SUM-10 | BE | `GET /api/v1/admin/summary?date=` aggregate endpoint | ⬜ | — |
| SUM-11 | BE | `GET /api/v1/admin/shift-log?date=` + `POST /api/v1/admin/shift-log` | ⬜ | — |

---

## 📝 Changelog

**v1 (2026-05-27)**
- Initial scaffold based on `admin-summary.excalidraw`
- Zones documented: Revenue Snapshot · Sales Breakdown · Order Channels · Menu Performance · Kitchen & Operations · Staff Performance · Inventory Alerts · Shift Log
- 1 modal: AddShiftNoteModal (append-only, hidden for past dates)

---

*Last Updated: 2026-05-27*
*Approved by: —*
*Next Review: After zone content reviewed with owner*
