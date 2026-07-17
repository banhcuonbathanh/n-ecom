# Admin Summary — `/admin/summary`

> **TL;DR:** ✅ implemented · manager+ · "Tổng kết nhà hàng" reports page.
> Range switcher (today / week / month) is local `useState` — no Zustand store.
> Four KPI cards ("Khách hôm nay", "Món đã bán", "Doanh thu", "Bàn đang phục vụ") +
> top-dishes ranked list + staff performance table + low-stock alert list with a quick
> stock-in modal. Each section is its own `useQuery` with its own skeleton.
> Source: `fe/src/app/(dashboard)/admin/summary/page.tsx`.
> BE view (endpoints, auth, caching, errors) → [admin_summary_be.md](admin_summary_be.md)
> Related siblings: [admin_summary_crosspage_dataflow.md](admin_summary_crosspage_dataflow.md) ·
> [admin_summary_loading.md](admin_summary_loading.md) ·
> [SCENARIO_SUMMARY_REVIEW.md](SCENARIO_SUMMARY_REVIEW.md)

---

## ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────┐
│ (admin shell: tab nav)                                               │
├──────────────────────────────────────────────────────────────────────┤
│ Tổng kết nhà hàng       [Hôm nay] [Tuần này] [Tháng này] ← range   │  ← Range selector
├──────────────────────────────────────────────────────────────────────┤
│ A ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │
│   │ Khách hôm nay│ │ Món đã bán   │ │ Doanh thu    │ │Bàn đang   │ │
│   │     86       │ │    240       │ │  4.250.000đ  │ │phục vụ    │ │
│   │lượt đặt bàn  │ │phần đã giao  │ │thanh toán    │ │    3      │ │
│   │(không hủy)   │ │(delivered)   │ │completed     │ │confirmed/ │ │
│   └──────────────┘ └──────────────┘ └──────────────┘ │preparing/ │ │
│                                                        │ready      │ │
│                                                        └───────────┘ │
├──────────────────────┬───────────────────────────────────────────────┤
│ B  Món bán chạy      │ C  Hiệu suất nhân viên                       │
│  #1 Bánh cuốn thịt   │  Tên nhân viên  Vai trò  Đơn xử lý  Doanh thu│
│     ×120 · 50%  ▓▓▓▓▓│  Nguyễn An      Bếp          45     —       │
│     4.200.000đ       │  Trần Bình       Thu ngân     41  2.150.000đ │
│  #2 Canh mọc         │  (chef rows show "—" for revenue)            │
│     ×95 · 39%  ▓▓▓▓  │                                               │
│     950.000đ         │                                               │
│  (top 5, bars show   │                                               │
│  % of top-N rows)    │                                               │
├──────────────────────┴───────────────────────────────────────────────┤
│ D  Cảnh báo tồn kho                      Xem toàn bộ kho →          │
│    🔴 Mộc nhĩ   còn 0.2 kg / min 1 kg    [ + Nhập hàng ]           │
│       ▓▓ (red bar — below threshold)                                 │
│    🟡 Tôm tươi  còn 1.1 kg / min 1 kg    [ + Nhập hàng ]           │
│       ▓▓▓▓▓▓▓▓▓ (yellow bar — within 1.2× threshold)               │
│    [ StockInModal: ingredient name (read-only) / qty input / note ] │
└──────────────────────────────────────────────────────────────────────┘
  Overlay: StockInModal (fixed overlay, RHF + Zod, posts stock-in movement)
```

`page.tsx:365-383`

---

## Zones

| Zone | Component (all inline in `admin/summary/page.tsx`) | Data source |
|---|---|---|
| Range selector | `RangeSelector` (`page.tsx:24-42`) | local `useState<SummaryRange>('today')` (`page.tsx:366`) — no Zustand |
| A KPI cards | `SummaryKPICards` (`page.tsx:58-103`) | `['admin','summary',range]` query (`page.tsx:60`) |
| B Top dishes | `TopDishesList` (`page.tsx:107-147`) | `['admin','top-dishes',range]` query (`page.tsx:109`) |
| C Staff performance | `StaffPerfTable` (`page.tsx:159-201`) | `['admin','staff-performance',range]` query (`page.tsx:161`) |
| D Low stock alert | `StockAlertList` (`page.tsx:292-361`) | `['admin','low-stock']` query — **range-independent** (`page.tsx:294`) |
| StockInModal (overlay) | `StockInModal` (`page.tsx:211-290`) | RHF + Zod (`stockSchema` `page.tsx:205-209`); `POST /admin/stock-movements`; on success invalidates `['admin','low-stock']` + `['admin','ingredients']` (`page.tsx:225-226`) |

---

## Key Interactions

- Switch range tab → `setRange` → all 3 range-keyed queries refetch (low-stock is not range-keyed and
  does not refetch on range change). `page.tsx:366-383`
- **"+ Nhập hàng"** button on any low-stock row (`page.tsx:342-351`) → sets `modalIng` state →
  opens `StockInModal` overlay.
- `StockInModal` submit (`page.tsx:218-231`) → validates qty > 0 (`stockSchema`) → `POST /admin/stock-movements`
  with `type:"in"` → on success: toast, invalidate `low-stock` + `ingredients`, close modal.
- **"Xem toàn bộ kho →"** link (`page.tsx:304`) → `<a href="/admin/ingredients">` hard-navigation
  (not `next/link`).
- Each of the 4 data sections renders its own animate-pulse skeleton while `isLoading` is true;
  empty-states per section when the array is empty (`page.tsx:121-122, 173-174, 313-314`).
- `formatVND` applied to KPI card revenue value (`page.tsx:92`) and top-dishes revenue cell
  (`page.tsx:140`); staff revenue (`page.tsx:192`) — `formatVND(row.revenue ?? 0)`.

---

## Business Logic Used

- Revenue counts only completed payments; cancelled orders are excluded →
  [../../07_business_logic/LOGIC_FE.md](../../07_business_logic/LOGIC_FE.md) and
  [../../02_spec/BUSINESS_RULES.md](../../02_spec/BUSINESS_RULES.md) (§ Payment / Cancel rules).
  BE detail: `revenue = SUM(payments.amount WHERE payments.status='completed')` →
  [admin_summary_be.md §1](admin_summary_be.md#1--get-adminsummaryrange).
- Low-stock threshold includes items up to 1.2× `min_stock` — split into 🔴/🟡 FE-side (see
  Flags below); no business rule doc owns this threshold — it is hard-coded in the BE repo query
  (`ingredient_repo.go:122`). Reference: [admin_summary_be.md Flag 4](admin_summary_be.md#flags).
- Stock-in movement (`type:"in"`) adds to `current_stock` (not absolute set) →
  [../../07_business_logic/LOGIC_FE.md](../../07_business_logic/LOGIC_FE.md) (inventory rules).

---

## Object Model

> This page **owns no object model** — it is a read-aggregation + a single write
> (stock-in movement). It consumes two domain models:
>
> - **Order / OrderItem metrics** (customers, dishes_sold, revenue, active_tables, top-dishes,
>   staff orders_handled / revenue) →
>   [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md)
> - **Ingredient** (name, unit, quantity, warningThreshold) and **StockMovement** (ingredient_id,
>   type, quantity, note, created_by) →
>   [../../02_spec/object/OBJECT_MODEL_INGREDIENT.md](../../02_spec/object/OBJECT_MODEL_INGREDIENT.md)
>
> Do not restate field definitions here — consult the above homes.

### Flags / Known Mismatches

Cross-reference [admin_summary_be.md Flags](admin_summary_be.md#flags) for the full BE-side flag set.
FE-specific and FE-vs-BE drift items:

| # | Flag | Detail | Source |
|---|------|--------|--------|
| 1 | **"Khách hôm nay" label is static regardless of range** | The KPI card label always reads "Khách hôm nay" even when `range=week` or `range=month` (`page.tsx:78`). The value is correct (BE counts non-cancelled orders for the selected range), but the label is misleading for week/month views. | `page.tsx:78` vs `admin_summary_be.md §1 (customers clause)` |
| 2 | **"Món đã bán" sub-label says "(delivered)" but BE counts delivered + paid** | The card sub-label reads "phần đã giao (delivered)" (`page.tsx:87`), but the BE `dishes_sold` clause is `status IN ('delivered','paid')` (`analytics_repo.go:dishes_sold`). Delivered-only wording is an under-description. | `page.tsx:86-88` vs `admin_summary_be.md Flag 6` |
| 3 | **Low-stock 🔴/🟡 split is FE-side only** | The BE query returns all items with `current_stock <= min_stock * 1.2` (`ingredient_repo.go:122`). The red/yellow split (`isCritical = ing.quantity < ing.warningThreshold`) happens entirely in `StockAlertList` (`page.tsx:318`) — BE has no concept of "yellow warning" vs "red critical". | `page.tsx:317-319` |
| 4 | **`top-dishes` `pct` is relative to top-N rows, not all dishes** | FE displays `{row.pct.toFixed(1)}%` (`page.tsx:131`); BE computes `pct` against `totalQty` of the returned LIMIT rows only, not the full period. Bars always sum to ~100% across the displayed 5 dishes — see `admin_summary_be.md Flag 2`. | `page.tsx:131` vs `analytics_repo.go:150-154` |
| 5 | **`active_tables` is range-agnostic (live count)** | The KPI card for "Bàn đang phục vụ" is always a live snapshot regardless of selected range — BE subquery has no date filter. Switching range refetches but the value does not change. See `admin_summary_be.md Flag 3`. | `page.tsx:95-100` vs `analytics_repo.go:94-97` |
| 6 | **"Xem toàn bộ kho →" uses `<a>` not `next/link`** | `page.tsx:304` uses a raw `<a href="/admin/ingredients">` rather than Next.js `<Link>`, causing a full-page navigation instead of client-side routing. | `page.tsx:304` |
