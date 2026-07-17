# Scenario — Tổng kết cuối ngày (End-of-Day Summary Review)

> **TL;DR:** ✅ implemented · A concrete, end-to-end run through `/admin/summary` — chị Hương
> (manager role) opens the page at the end of a lunch shift, reads the KPI cards, switches the
> date range to "Tuần này", scans top dishes and staff performance, then spots a critical low-stock
> item and restocks it via the `StockInModal`.
>
> **Sources traced (branch `experience_claude.md_system_1`):**
> `fe/src/app/(dashboard)/admin/summary/page.tsx` · `fe/src/features/admin/admin.api.ts:210-277` ·
> `be/internal/handler/analytics_handler.go` · `be/internal/handler/ingredient_handler.go` ·
> `be/internal/repository/analytics_repo.go` · `be/internal/repository/ingredient_repo.go`
>
> **Sibling files:**
> [admin_summary.md](admin_summary.md) ·
> [admin_summary_be.md](admin_summary_be.md) ·
> [admin_summary_crosspage_dataflow.md](admin_summary_crosspage_dataflow.md) ·
> [admin_summary_loading.md](admin_summary_loading.md)
>
> For the surrounding lunch-rush context (who ordered what, how tables filled, stock drawdown) that
> sets the stage for Hương's review → [../../customer/customer_menu/SCENARIO_LUNCH_RUSH.md](../../customer/customer_menu/SCENARIO_LUNCH_RUSH.md).

---

## The cast

| Who | Username | Role | Job this scene |
|---|---|---|---|
| **Nguyễn Thị Hương** | `manager1` | manager | Reviews the lunch-shift numbers, restocks a critical ingredient |
| **Lê Đầu Bếp** | `chef1` | chef | Already cooked the orders; appears in the staff-performance table |
| **Phạm Thu Ngân** | `cashier1` | cashier | Already ran POS payments; appears in the staff-performance table |

## The setting

13:35, end of the lunch shift. The lunch rush is over (see [SCENARIO_LUNCH_RUSH.md](../../customer/customer_menu/SCENARIO_LUNCH_RUSH.md) for how those orders unfolded). Hương sits at the manager terminal and navigates to `/admin/summary` to review the day's numbers before the kitchen wind-down.

---

## Minute-by-minute timeline

### 13:35 — Login + navigation

Hương opens the browser and types `/login`. She enters `manager1` credentials. The auth response
sets a staff JWT in `useAuthStore` (Zustand, memory-only — never localStorage, per
`docs/core/MASTER_v1.2.md §6`).

She navigates to `/admin/summary`. The admin shell's `RoleGuard` (`fe/src/components/guards/RoleGuard.tsx`)
checks `minRole=MANAGER` before rendering. Her `manager` role passes; a `cashier` or `chef` navigating
here would be redirected at the FE layer (and would also hit `403` at the BE layer — `middleware.AtLeast("manager")`,
`be/cmd/server/main.go:295`).

### 13:35:01 — Four sections skeleton in independently

`SummaryPage` mounts (`page.tsx:365`). The first thing it renders:

```tsx
// page.tsx:366
const [range, setRange] = useState<SummaryRange>('today')
```

`range` starts as `'today'`. The four child components mount **simultaneously** — each fires its own
`useQuery` call independently:

| Section component | Query key | Endpoint fired | staleTime |
|---|---|---|---|
| `SummaryKPICards` (`page.tsx:58`) | `['admin','summary','today']` | `GET /admin/summary?range=today` | 60 000 ms |
| `TopDishesList` (`page.tsx:107`) | `['admin','top-dishes','today']` | `GET /admin/top-dishes?range=today&limit=5` | 60 000 ms |
| `StaffPerfTable` (`page.tsx:159`) | `['admin','staff-performance','today']` | `GET /admin/staff-performance?range=today` | 60 000 ms |
| `StockAlertList` (`page.tsx:292`) | `['admin','low-stock']` | `GET /admin/ingredients/low-stock` | 120 000 ms |

While in-flight, each section independently renders its own `animate-pulse` skeleton
(`page.tsx:66-72, 117-120, 169-172, 309-311`). They pop in as they resolve — the sections that
finish first show real content while others are still skeletonised. This is **staggered pop-in**,
not a coordinated splash screen (no page-level `Promise.all`).

All four requests carry `Authorization: Bearer <manager JWT>` from the Axios request interceptor
(`fe/src/lib/api-client.ts`). The BE verifies `authMW` + `AtLeast("manager")` on every route
(`main.go:294-295`) before executing the handler.

### 13:35:03 — Hương reads the KPI cards

The four cards resolve and replace their skeletons:

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────┐
│ Khách hôm nay│ │ Món đã bán   │ │ Doanh thu    │ │ Bàn đang      │
│      86      │ │    240       │ │  4.250.000đ  │ │ phục vụ       │
│ lượt đặt bàn │ │ phần đã giao │ │ thanh toán   │ │      3        │
│ (không hủy)  │ │ (delivered)  │ │  completed   │ │ confirmed/    │
└──────────────┘ └──────────────┘ └──────────────┘ │ preparing/    │
                                                    │ ready         │
                                                    └───────────────┘
```

What each number means in the DB (traced from `analytics_repo.go:63-107`):

- **Khách hôm nay = 86** — `COUNT(*)` of `orders WHERE deleted_at IS NULL AND status != 'cancelled' AND DATE(created_at) = CURDATE()`. One non-cancelled order = one customer visit. Cancelled orders (e.g. the Bàn 05 order from the lunch rush) are excluded.
- **Món đã bán = 240** — `SUM(oi.quantity)` from `order_items JOIN orders WHERE orders.status IN ('delivered','paid') AND date filter`. This counts both `delivered` and `paid` statuses — though the card sub-label reads "phần đã giao (delivered)" (`page.tsx:87`), which under-describes it. See [admin_summary.md Flag 2](admin_summary.md#flags--known-mismatches).
- **Doanh thu = 4.250.000đ** — `SUM(CAST(p.amount AS DECIMAL))` from `payments WHERE status='completed'` + date filter. Pending or failed payments are excluded. Formatted via `formatVND()` (`page.tsx:92`).
- **Bàn đang phục vụ = 3** — `COUNT(DISTINCT o.table_id) WHERE status IN ('confirmed','preparing','ready')`. **This is always a live count — no date filter** (`analytics_repo.go:94-97`). Switching the range picker does not change this number. Hương is seeing right now: 3 tables still active at 13:35.

> **Note:** The "Khách hôm nay" label is static even when the range is not `today` — the value
> updates correctly (BE applies the range filter to the `customers` count), but the label wording
> does not change. See [admin_summary.md Flag 1](admin_summary.md#flags--known-mismatches) and
> [admin_summary_be.md Flag 3](admin_summary_be.md#flags).

### 13:36 — Hương switches the range to "Tuần này"

She clicks the "Tuần này" button in the `RangeSelector` (`page.tsx:24-42`). This fires:

```tsx
// page.tsx:366
setRange('week')
```

`range` is plain `useState` — **no Zustand store, no URL param**. It lives only in `SummaryPage`'s
component state and is passed down as a prop to three child components:
`SummaryKPICards`, `TopDishesList`, `StaffPerfTable`. `StockAlertList` receives no `range` prop
(`page.tsx:381`) and is untouched by this change.

The three range-keyed queries all refetch because their `queryKey` arrays include `range` as the
third element:

```
['admin','summary','week']        → GET /admin/summary?range=week
['admin','top-dishes','week']     → GET /admin/top-dishes?range=week&limit=5
['admin','staff-performance','week'] → GET /admin/staff-performance?range=week
```

While refetching, each of those three sections re-enters its skeleton state. The "Cảnh báo tồn
kho" (`StockAlertList`) does **not** re-skeleton — its `staleTime: 120_000` (`page.tsx:297`) is
still fresh, and the `['admin','low-stock']` query is range-independent.

On the BE, `validRange` (`analytics_service.go:19-26`) maps `'week'` to the `INTERVAL 6 DAY`
date filter: `created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)` — the last 7 days inclusive.

The week-period responses pop in. The KPI cards now show 7-day totals. The "Bàn đang phục vụ"
count is still 3 — the live-count subquery has no date filter regardless of the range parameter.

### 13:37 — Hương scans "Món bán chạy"

The `TopDishesList` section shows the top-5 dishes for the week:

```
#1  Bánh cuốn thịt       ×820  ·  82.0%  ▓▓▓▓▓▓▓▓▓▓   8.200.000đ
#2  Canh mọc             ×95   ·  9.5%   ▓▓           950.000đ
#3  Giò                  ×42   ·  4.2%   ▓            378.000đ
#4  Bánh chay            ×28   ·  2.8%   ▓            0đ
#5  Trứng chín           ×15   ·  1.5%   ▓            135.000đ
```

Each row renders `×{qty} · {pct.toFixed(1)}%` and `formatVND(revenue)` (`page.tsx:131, 140`).
The progress bar width is `Math.min(row.pct, 100)` (`page.tsx:134`).

A point worth noting: the `pct` values shown here sum to ~100% across the 5 displayed dishes —
because the BE computes `pct = qty * 10000 / totalQty` where `totalQty` is the sum of only those
5 returned rows, not all dishes in the period (`analytics_repo.go:150-154`). Hương is reading
"% of the top 5", not "% of all dishes sold this week". See [admin_summary_be.md Flag 2](admin_summary_be.md#flags).

Combo child rows are excluded from the counts — the BE query filters `oi.combo_ref_id IS NULL`
(`analytics_repo.go:114`), so sub-items inside a combo do not inflate the dish count.

### 13:37:30 — Hương scans "Hiệu suất nhân viên"

`StaffPerfTable` shows every active non-customer staff, ordered by `orders_handled DESC, full_name ASC`
(`analytics_repo.go:177-181`):

```
Tên nhân viên     Vai trò    Đơn xử lý    Doanh thu
──────────────────────────────────────────────────────
Lê Đầu Bếp       Bếp              62          —
Phạm Thu Ngân     Thu ngân         41    4.250.000đ
Nguyễn Thị Hương  Quản lý           0            0đ
```

The `—` for "Lê Đầu Bếp" is rendered at `page.tsx:192`:
```tsx
{row.role === 'chef' ? '—' : formatVND(row.revenue ?? 0)}
```
This is purely an FE decision — the BE actually omits `revenue` from the JSON object for chef
rows (`analytics_handler.go:72-74`), so `row.revenue` is `undefined` for chefs. The `??` guard
is defensive, but the `role === 'chef'` check fires first.

Every active, non-customer staff member appears in this table even with zero orders, because the
BE repo uses `LEFT JOIN` (`analytics_repo.go:161-181`). Hương herself appears with `orders_handled: 0`
and `revenue: 0đ` — she has not handled any orders today as manager.

### 13:38 — Hương spots a critical low-stock item

The "Cảnh báo tồn kho" section is still showing the results from the fresh initial load (within
its `staleTime: 120_000`). The list shows two items:

```
🔴 Mộc nhĩ      còn 0.2 kg / min 1 kg    [ + Nhập hàng ]
   ▓▓ (red bar)

🟡 Bột bánh cuốn còn 6.0 kg / min 5 kg    [ + Nhập hàng ]
   ▓▓▓▓▓▓▓▓▓▓▓▓ (yellow bar)
```

The BE query (`ingredient_repo.go:120-141`) returns any ingredient where
`current_stock <= min_stock * 1.2`, ordered most urgent first
(`ORDER BY current_stock / GREATEST(min_stock, 0.001) ASC`). So both rows appear:
`Mộc nhĩ` at 0.2/1 = 20% of threshold, and `Bột bánh cuốn` at 6.0/5 = 120% (the upper boundary).

The 🔴/🟡 split is computed FE-side (`page.tsx:318`):
```tsx
const isCritical = ing.quantity < ing.warningThreshold   // 0.2 < 1.0 → true → red
```

Hương focuses on the 🔴 `Mộc nhĩ` row. She clicks "+ Nhập hàng".

### 13:38:30 — StockInModal opens

`StockAlertList` holds the modal trigger in local state (`page.tsx:293`):
```tsx
const [modalIng, setModalIng] = useState<Ingredient | null>(null)
```

Clicking the button sets `modalIng` to the selected ingredient object and `StockInModal` mounts
as a fixed overlay (`page.tsx:358`, `page.tsx:234`).

The modal shows:
- **Nguyên liệu:** "Mộc nhĩ" — read-only input (`page.tsx:245-248`)
- **Số lượng nhập (kg):** empty number input, `step="0.001"` (`page.tsx:252-259`)
- **Ghi chú:** optional text input, max 200 chars (`stockSchema` `page.tsx:205-208`)

Hương types `2` in the quantity field and adds a note: "Nhập hàng sau ca trưa".

### 13:39 — Submit → POST /admin/stock-movements

She clicks "✓ Xác nhận nhập". The form passes `zodResolver(stockSchema)` validation
(`quantity > 0` → passes). `useMutation.mutate` fires (`page.tsx:217-231`):

```ts
// admin.api.ts:276-277
postStockMovement({
  ingredient_id: "<uuid Mộc nhĩ>",
  type: 'in',
  quantity: 2,
  note: 'Nhập hàng sau ca trưa',
})
// → POST /admin/stock-movements
// Authorization: Bearer <manager JWT>
```

The button shows "Đang lưu..." while `mut.isPending` is true (`page.tsx:283`).

**On the BE** (`ingredient_handler.go:172-203`):
1. Handler binds the JSON (`ingredient_handler.go:173-178`), reads actor via `StaffIDFromContext(c)` → `CreatedBy = "<uuid manager1>"` (`ingredient_handler.go:183`).
2. Service validates `type ∈ {in,out,adjustment}` (`ingredient_service.go:117-119`), checks the ingredient exists (`ingredient_service.go:120-122`).
3. Repo executes **3 sequential SQL statements** (`ingredient_repo.go:221-248`) — **not wrapped in a transaction**:
   - `INSERT INTO stock_movements (ingredient_id, type, quantity, note, created_by, created_at)` → logs the movement
   - `UPDATE ingredients SET current_stock = current_stock + 2 WHERE id = "<uuid Mộc nhĩ>"` → `0.2 + 2 = 2.2 kg`
   - Re-`SELECT` the movement row to build the response
4. Returns `201 {"data": {id, ingredient_id, type, quantity, note, created_at}}` — **snake_case** (`ingredient_handler.go:196-202`).

> The stock update is **not transactional** ([admin_summary_be.md Flag 5](admin_summary_be.md#flags)).
> If the INSERT succeeds but the UPDATE fails (e.g. a DB timeout), the movement is logged but
> `current_stock` stays at 0.2 kg. This is a pre-existing risk shared with the admin_ingredients
> page — nothing introduced by this scenario.

### 13:39:02 — Success: toast + cache invalidation + modal close

`onSuccess` fires (`page.tsx:224-229`):

```tsx
qc.invalidateQueries({ queryKey: ['admin', 'low-stock'] })       // page.tsx:225
qc.invalidateQueries({ queryKey: ['admin', 'ingredients'] })      // page.tsx:226
toast.success(`Đã nhập hàng: Mộc nhĩ`)                          // page.tsx:227
onClose()                                                          // page.tsx:228
```

Two cache keys are invalidated:
- `['admin','low-stock']` — causes `StockAlertList`'s `useQuery` to refetch immediately. Since `Mộc nhĩ` is now at 2.2 kg (still below `min_stock * 1.2 = 1.2 kg`... actually now 2.2 > 1.2 so it leaves the list), the item disappears from the alert panel.

Actually tracing the math: `current_stock = 2.2`, `min_stock = 1`, `min_stock * 1.2 = 1.2`. Since `2.2 > 1.2`, `Mộc nhĩ` no longer satisfies the WHERE clause (`ingredient_repo.go:122`: `current_stock <= min_stock * 1.2`). The 🔴 row disappears. `Bột bánh cuốn` remains at 🟡 (6.0 ≤ 6.0).

- `['admin','ingredients']` — invalidates the `/admin/ingredients` page's query cache. When Hương (or anyone else) navigates to that page, it will refetch with the updated `current_stock = 2.2 kg`. Cross-page handoff detail → [admin_summary_crosspage_dataflow.md](admin_summary_crosspage_dataflow.md).

The modal closes, the toast "Đã nhập hàng: Mộc nhĩ" appears at the top of the screen. The `StockAlertList` skeleton flashes briefly while refetching, then the panel shows only one row: `🟡 Bột bánh cuốn`.

### 13:39:15 — End of review

Hương is done. She has confirmed the day's revenue, identified the top seller, noted that Lê Đầu Bếp handled 62 orders (the chef row shows no revenue — by design), and addressed the only critical stock alert. She navigates away.

---

## Under the hood — how the data actually moves

> Sources: `fe/src/app/(dashboard)/admin/summary/page.tsx` ·
> `fe/src/features/admin/admin.api.ts` · `be/internal/handler/analytics_handler.go` ·
> `be/internal/handler/ingredient_handler.go` · `be/internal/repository/analytics_repo.go` ·
> `be/internal/repository/ingredient_repo.go`

### A. Cross-component (this page) — thin; range prop fan-out; no store

This page has **no Zustand store**. The only shared state is `range` (a plain `useState` in
`SummaryPage`, `page.tsx:366`) passed as a prop to `SummaryKPICards`, `TopDishesList`, and
`StaffPerfTable`. `StockAlertList` takes no prop — it is hard-wired to `['admin','low-stock']`.

Each section component owns its own `useQuery`. There is no cross-component subscription pattern;
the sections do not communicate with each other. The only coupling is the prop fan-out from the
parent range state.

Full component layout → [admin_summary.md §Zones](admin_summary.md#zones).

### B. Cross-page — the restock handoff to /admin/ingredients

The one write on this page (`POST /admin/stock-movements`) creates a `stock_movements` row and
bumps `ingredients.current_stock` in MySQL. This DB change is surfaced on `/admin/ingredients` via
two mechanisms:

1. **TanStack Query cache invalidation** — `qc.invalidateQueries(['admin','ingredients'])` (`page.tsx:226`)
   marks the ingredients list query stale. The next navigation to `/admin/ingredients` triggers a
   fresh `GET /admin/ingredients` fetch that reflects the updated `current_stock`.
2. **Low-stock list refresh** — `qc.invalidateQueries(['admin','low-stock'])` (`page.tsx:225`)
   causes the `StockAlertList` on this page to immediately refetch, removing items that are no
   longer below threshold.

There is no SSE/WS — cross-device sync is refetch-only. If a second manager tab is open on
`/admin/ingredients`, it does not update until it refetches (either manually or on `staleTime`
expiry).

Full cross-page surface → [admin_summary_crosspage_dataflow.md](admin_summary_crosspage_dataflow.md).

### C. FE → BE send — the 5 endpoints

All requests go through the single Axios instance (`fe/src/lib/api-client.ts`) with `Authorization: Bearer` injected by the request interceptor.

| # | Call | FE source | BE handler | What travels on the wire |
|---|------|-----------|-----------|--------------------------|
| 1 | `GET /admin/summary?range=today` | `admin.api.ts:210-211` | `analytics_handler.go:23` | `range` query param only |
| 2 | `GET /admin/top-dishes?range=today&limit=5` | `admin.api.ts:213-214` | `analytics_handler.go:39` | `range` + `limit` params |
| 3 | `GET /admin/staff-performance?range=today` | `admin.api.ts:216-217` | `analytics_handler.go:62` | `range` query param only |
| 4 | `GET /admin/ingredients/low-stock` | `admin.api.ts:264-265` | `ingredient_handler.go:70` | no params |
| 5 | `POST /admin/stock-movements` | `admin.api.ts:276-277` | `ingredient_handler.go:172` | `{ingredient_id, type:"in", quantity, note?}` |

No prices, no IDs constructed client-side for the reads. The write body is explicit — the FE picks
`type:"in"` always (`page.tsx:220`); the actor is injected BE-side from the JWT.

Full endpoint traces → [admin_summary_be.md](admin_summary_be.md).

### D. BE → FE receive / live — no SSE/WS; refetch-only

**This page has no SSE or WebSocket connection.** All data arrives via polling/stale-time
expiry or explicit cache invalidation. There is no `useOrderSSE`, no `useOverviewWS`, no event
stream of any kind on `/admin/summary`.

If an order is paid or a stock level changes while Hương has the page open, she will see the
updated numbers only when a query refetches (after `staleTime` expires or after a mutation
invalidates a key). This is deliberate — analytics summaries are not live dashboards and the
system does not guarantee sub-minute freshness here.

Contrast with `/admin/overview` (the live floor page) which does use WebSocket (`useOverviewWS`).

### E. Loading + caching — staggered skeletons; staleTime; no Redis

**No Redis on any of the 5 endpoints** — grep of analytics + ingredient handler/service/repo
returns zero `rdb`/`redis`/`cache` references ([admin_summary_be.md §Caching](admin_summary_be.md#caching--invalidation)).
Every read is a live MySQL query.

**Client-side cache (TanStack Query only):**

| Query key | staleTime | When invalidated |
|---|---|---|
| `['admin','summary',range]` | 60 000 ms (`page.tsx:62`) | Never explicitly — expires naturally |
| `['admin','top-dishes',range]` | 60 000 ms (`page.tsx:111`) | Never explicitly — expires naturally |
| `['admin','staff-performance',range]` | 60 000 ms (`page.tsx:163`) | Never explicitly — expires naturally |
| `['admin','low-stock']` | 120 000 ms (`page.tsx:297`) | `qc.invalidateQueries` on stock-in success (`page.tsx:225`) |
| `['admin','ingredients']` | ❓ UNVERIFIED — this key lives in `/admin/ingredients/page.tsx`, not here | Invalidated by this page's mutation (`page.tsx:226`) |

**Skeleton behaviour:** each section independently renders `animate-pulse` rectangles while
`isLoading` is true. No page-level loading guard — sections pop in as they resolve.

Loading behaviour detail → [admin_summary_loading.md](admin_summary_loading.md) (if created; file
not present in the folder as of this writing — ❓ UNVERIFIED that `admin_summary_loading.md` exists).

### F. Monitoring

No page-specific monitoring on `/admin/summary`. The stock-in POST (`POST /admin/stock-movements`)
is a standard write and its success/failure rate is captured by the Grafana "Request Rate" and
"5xx Error Rate" panels along with all other BE endpoints.

If the analytics SQL runs slow (e.g. `analytics_repo.go` full-table scans on a large `orders`
table), it would surface on the Grafana "p95 Response Time" panel. Alert threshold: `SlowResponseTime`
fires if `p95 > 500ms` over 5 min.

Monitoring stack: Prometheus `:9090` + Loki + Grafana `:3001`, shipped in the same
`docker-compose.yml`. Configs in `monitoring/`. Triage: Grafana panels → container logs
(`docker compose logs -f be`) → Prometheus alerts.

---

## One-line mental model

> **Hương reads rolled-up numbers** (orders → analytics SQL → KPI cards + ranked lists) and
> **acts on one alert** (stock below threshold → StockInModal → `POST /admin/stock-movements` →
> DB stock bump → two cache invalidations) — **all via plain HTTP, no live stream, no Redis**.
