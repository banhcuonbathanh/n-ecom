# Admin Summary — Status Routing Reference

> **⚠️ This page has NO entity-status routing.** It is an analytics/KPI dashboard:
> no zone renders an order/table/payment *entity* by its `status`, and no button
> advances a status. So this doc is a **data-flow reference** (reads · writes · cross-page),
> not a status matrix.
>
> The one place statuses matter is **server-side aggregation**: each KPI counts only rows in
> certain statuses. That mapping is captured below (`## Order / Payment Status → KPI Mapping`)
> because it is the page's true "which status shows up where" — but it lives in BE SQL, not FE JSX.
>
> Page code: [fe/src/app/(dashboard)/admin/summary/page.tsx](../../../../../fe/src/app/(dashboard)/admin/summary/page.tsx)
> Model file: `admin_main/admin_overview/Admin_Overview_Status_Routing_Reference.md`

---

## Live Page Snapshot (http://localhost:3000/admin/summary, 2026-06-07)

**NOT captured.** FE dev server responded `200`, but the Playwright MCP browser profile is locked
(`Browser is already in use … mcp-chrome-ef492b3`) — same blocker as the `client_order_page` run.
The page is also admin-gated (RoleGuard), so a snapshot needs an authenticated admin session.

Render structure below is read from JSX, not a live screenshot. Re-run with `--isolated` (or after
closing the other Chrome MCP session) to capture real KPI values.

---

## Page Layout

| Zone | Component | Title (literal JSX) | When visible |
|---|---|---|---|
| A | `RangeSelector` | — (3 buttons: `Hôm nay` · `Tuần này` · `Tháng này`) | always (header right) |
| B | `SummaryKPICards` → 4× `KPICard` | — (4 cards, see below) | always; skeleton while `isLoading` |
| C | `TopDishesList` | `Món bán chạy` | always; skeleton/empty/list states |
| D | `StaffPerfTable` | `Hiệu suất nhân viên` | always; skeleton/empty/table states |
| E | `StockAlertList` → `StockInModal` | `Cảnh báo tồn kho` | list always; modal only when `modalIng !== null` |

Page heading (H1): `Tổng kết nhà hàng` — [page.tsx:370](../../../../../fe/src/app/(dashboard)/admin/summary/page.tsx#L370).

All four zones are **always rendered** — there is no status-gated visibility. The only conditional
UI is loading-skeleton / empty-state / error inside each zone, and the stock-in modal.

---

## Zone B — KPI Cards (the 4 metrics)

| Card label | Value source field | Sub-text (literal) | Card border |
|---|---|---|---|
| `Khách hôm nay` | `data.customers` | `lượt đặt bàn (không hủy)` | `border-blue-300` |
| `Món đã bán` | `data.dishes_sold` | `phần đã giao (delivered)` | `border-green-300` |
| `Doanh thu` | `data.revenue` (via `formatVND`) | `thanh toán completed` | `border-purple-300` |
| `Bàn đang phục vụ` | `data.active_tables` | `confirmed / preparing / ready` | `border-orange-300` |

Traced to [page.tsx:76-101](../../../../../fe/src/app/(dashboard)/admin/summary/page.tsx#L76-L101).

> ⚠️ **Label drift on "Món đã bán".** Sub-text says `phần đã giao (delivered)`, but the BE query
> counts `order.status IN ('delivered','paid')` — see mapping below. A `paid` order's items are
> included even though the label only mentions `delivered`. Cosmetic, but the count can exceed what
> the label implies. Trace: [analytics_repo.go:81](../../../../../be/internal/repository/analytics_repo.go#L81).

---

## Order / Payment Status → KPI Mapping

> This is the page's real "status routing": which entity statuses each KPI/zone counts.
> All of it lives in BE SQL — the FE only renders the aggregated number. Source:
> [be/internal/repository/analytics_repo.go](../../../../../be/internal/repository/analytics_repo.go).
> Order status enum (single source, X1): `pending · confirmed · preparing · ready · delivered · cancelled · paid`.

| Metric / Zone | Statuses counted | Date-windowed? | Trace |
|---|---|---|---|
| `customers` (B) | `orders.status != 'cancelled'` (any of the other 6) | ✅ `orders.created_at` in range | [analytics_repo.go:72-75](../../../../../be/internal/repository/analytics_repo.go#L72-L75) |
| `dishes_sold` (B) | order `status IN ('delivered','paid')` | ✅ `orders.created_at` in range | [analytics_repo.go:76-83](../../../../../be/internal/repository/analytics_repo.go#L76-L83) |
| `revenue` (B) | `payments.status = 'completed'` | ✅ `orders.created_at` in range | [analytics_repo.go:84-91](../../../../../be/internal/repository/analytics_repo.go#L84-L91) |
| `active_tables` (B) | order `status IN ('confirmed','preparing','ready')` | ❌ **live count, ignores range** | [analytics_repo.go:92-96](../../../../../be/internal/repository/analytics_repo.go#L92-L96) |
| Top dishes (C) | order `status IN ('delivered','paid')` AND `combo_ref_id IS NULL` | ✅ `orders.created_at` in range | [analytics_repo.go:121-124](../../../../../be/internal/repository/analytics_repo.go#L121-L124) |
| Staff perf — orders (D) | order `status IN ('delivered','paid')` joined on `created_by` | ✅ `orders.created_at` in range | [analytics_repo.go:168-172](../../../../../be/internal/repository/analytics_repo.go#L168-L172) |
| Staff perf — revenue (D) | `payments.status = 'completed'` | ✅ (via order join) | [analytics_repo.go:173-175](../../../../../be/internal/repository/analytics_repo.go#L173-L175) |

Range windows (`dateFilter`): `today` = `DATE = CURDATE()` · `week` = last 7 days (`INTERVAL 6 DAY`) ·
`month` = last 30 days (`INTERVAL 29 DAY`). Trace: [analytics_repo.go:51-61](../../../../../be/internal/repository/analytics_repo.go#L51-L61).

> ⚠️ **`active_tables` is not range-filtered** — it always reflects the current live floor regardless
> of the selected range (so it stays identical across Hôm nay/Tuần/Tháng). The card label
> `Bàn đang phục vụ` correctly implies "now", but it sits in a range-driven card grid; expect it to
> not move when the range changes.

---

## Zone E — Stock Alerts: derived status (NOT the `Ingredient.status` enum)

`StockAlertList` does **not** read the `Ingredient.status` field
(`in_stock | low_stock | expiring_soon | out_of_stock`, defined at
[admin.api.ts:221](../../../../../fe/src/features/admin/admin.api.ts#L221)). Instead it derives a
two-level severity purely from quantity:

| Derived level | Condition | Icon | Row bg | Button style |
|---|---|---|---|---|
| Critical | `ing.quantity < ing.warningThreshold` | 🔴 | `bg-red-50` | red outline |
| Warning | `ing.quantity >= ing.warningThreshold` | 🟡 | `bg-yellow-50` | yellow outline |

Traced to [page.tsx:318-351](../../../../../fe/src/app/(dashboard)/admin/summary/page.tsx#L318-L351).

Per-zone rules:
- The list is fed by `GET /admin/ingredients/low-stock`, which **server-side filters** to at-risk
  rows — so every row shown is already low/critical; the FE only splits red vs yellow.
- Empty state = `✅ Tất cả nguyên liệu đủ hàng` (green). No sort applied client-side; order is whatever
  the endpoint returns ([❓ UNVERIFIED] — BE sort order not checked).
- Progress bar width = `min(quantity / warningThreshold * 100, 100)%`; `warningThreshold = 0` → 100%.
- `expiring_soon` / `out_of_stock` statuses are invisible here — this zone is quantity-only. To see
  expiry-based status, use the full `/admin/ingredients` page (link `Xem toàn bộ kho →`).

---

## What Information Comes FROM BE (reads)

Four independent `useQuery` calls. No SSE/WS on this page.

| # | Hook fn | Query key | Endpoint | Params | staleTime | enabled |
|---|---|---|---|---|---|---|
| 1 | `getSummary` | `['admin','summary',range]` | `GET /admin/summary` | `range` | 60 000 ms | always |
| 2 | `getTopDishes` | `['admin','top-dishes',range]` | `GET /admin/top-dishes` | `range`, `limit=5` | 60 000 ms | always |
| 3 | `getStaffPerformance` | `['admin','staff-performance',range]` | `GET /admin/staff-performance` | `range` | 60 000 ms | always |
| 4 | `getLowStock` | `['admin','low-stock']` | `GET /admin/ingredients/low-stock` | — (**no range**) | 120 000 ms | always |

Reads 1-3 re-fetch when `range` changes (range is in the key). Read 4 is range-independent.

**Exact fields received** (from [admin.api.ts](../../../../../fe/src/features/admin/admin.api.ts)):

- `SummaryData` (#1): `customers` · `dishes_sold` · `revenue` · `active_tables` — all `number`.
- `TopDishRow[]` (#2): `name` · `qty` · `revenue` · `pct` (`number`; BE sends `pct*100`, client divides).
- `StaffPerfRow[]` (#3): `staff_id` · `full_name` · `role` · `orders_handled` · `revenue?`
  (chef rows render revenue as `—`, [page.tsx:192](../../../../../fe/src/app/(dashboard)/admin/summary/page.tsx#L192)).
- `Ingredient[]` (#4): `id` · `name` · `unit` · `quantity` · `warningThreshold` · `importDate` ·
  `shelfDays` · `expiryDate` · `status` · `createdAt` · `updatedAt`. This zone uses only
  `name · quantity · warningThreshold · unit · id`.

Client-side enrichment: none (no joins/name resolution). `TopDishRow.pct` is the only transform and it
happens BE-side (`PctTimes100`, [analytics_repo.go:23](../../../../../be/internal/repository/analytics_repo.go#L23)).

---

## What Information Is SENT TO BE (writes)

One mutation only — stock-in from the alert modal.

**`postStockMovement` — `POST /admin/stock-movements`**
([page.tsx:217-231](../../../../../fe/src/app/(dashboard)/admin/summary/page.tsx#L217-L231), builder [admin.api.ts:276](../../../../../fe/src/features/admin/admin.api.ts#L276)):

```json
{
  "ingredient_id": "<Ingredient.id>",
  "type": "in",
  "quantity": <number, RHF+Zod: positive>,
  "note": "<string, optional, max 200>"
}
```

- `type` is **hardcoded to `"in"`** — this modal only nhập hàng (the `'out' | 'adjustment'` enum values
  are never sent from this page).
- Validation: `stockSchema` (`quantity` coerced `number().positive()`, `note` optional `max(200)`),
  [page.tsx:205-208](../../../../../fe/src/app/(dashboard)/admin/summary/page.tsx#L205-L208).
- On success: invalidates `['admin','low-stock']` **and** `['admin','ingredients']` (so both this page
  and the ingredients page refresh), toast `Đã nhập hàng: {name}`, closes modal.
- On error: toast `Có lỗi xảy ra khi nhập hàng` (generic; no error-code branching).

The range selector and KPI cards send **nothing** — they only change the local `range` state, which
re-keys the three GET queries.

---

## How It Manages Data CROSS-PAGE

| Mechanism | Detail |
|---|---|
| Zustand stores | **None.** The only client state is `range` (`useState<SummaryRange>('today')`, [page.tsx:366](../../../../../fe/src/app/(dashboard)/admin/summary/page.tsx#L366)) and `modalIng` (`useState`), both component-local. |
| localStorage | **None** written/read by this page. |
| Cross-page coupling | (1) Mutation invalidates `['admin','ingredients']` → keeps the **Ingredients page** TanStack cache fresh after a stock-in. (2) Plain anchor `Xem toàn bộ kho →` to `/admin/ingredients` ([page.tsx:304](../../../../../fe/src/app/(dashboard)/admin/summary/page.tsx#L304)). |
| Auth | Reads/writes go through `lib/api-client.ts` axios instance (Bearer access-token from auth store, memory-only). Page is admin-gated by the `(dashboard)` RoleGuard. |

End-to-end loop: pick `range` (local state) → re-key 3 GET queries → render KPI/top-dishes/staff cards
+ a range-independent low-stock list → click `+ Nhập hàng` → fill modal → `POST /admin/stock-movements`
→ invalidate low-stock + ingredients caches → list refreshes in place. No navigation, no persisted state.

---

## Concerns (for the tracker)

1. ⚠️ **`dishes_sold` label drift** — card sub says `(delivered)`, BE counts `delivered`+`paid`.
2. ⚠️ **`active_tables` ignores the range** — stays constant across Hôm nay/Tuần/Tháng (live count by design, but visually inconsistent inside a range-driven grid).
3. ⚠️ **Stock list ignores `Ingredient.status` enum** — derives 🔴/🟡 from `quantity < warningThreshold` only; expiry-based statuses (`expiring_soon`/`out_of_stock`) never surface here.
4. ❓ UNVERIFIED — sort order of `/admin/ingredients/low-stock` rows (BE query not opened).
