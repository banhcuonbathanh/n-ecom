# Admin Summary — Backend View — `/admin/summary`

> **TL;DR:** ✅ implemented · the "Tổng kết nhà hàng" reports page. It calls **5 endpoints**:
> 4 reads (3 analytics + 1 low-stock list) and **1 write** (a stock-in movement from the restock
> modal). **Every endpoint is `authMW` + `AtLeast("manager")`** — no public/guest path. The 3
> analytics endpoints use **hand-written SQL** (no sqlc) and **no Redis** — every read hits MySQL
> live. Date range (`today`/`week`/`month`) is computed BE-side as `today` / last-7-days /
> last-30-days; an unknown range falls back to `today`.
> **Sources traced (branch `experience_claude.md_system_1`):**
> `be/cmd/server/main.go` (routes 294–305) · `be/internal/handler/analytics_handler.go` ·
> `be/internal/service/analytics_service.go` · `be/internal/repository/analytics_repo.go` ·
> `be/internal/handler/ingredient_handler.go` · `be/internal/service/ingredient_service.go` ·
> `be/internal/repository/ingredient_repo.go` ·
> FE callers `fe/src/features/admin/admin.api.ts:210-277` · `fe/src/app/(dashboard)/admin/summary/page.tsx`.
> **FE twin:** [admin_summary.md](admin_summary.md) · **Order model:** [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) · **Ingredient model:** [../../02_spec/object/OBJECT_MODEL_INGREDIENT.md](../../02_spec/object/OBJECT_MODEL_INGREDIENT.md)

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|----------|------|---------|---------|--------------|-------------|
| 1 | `GET /admin/summary?range=` | authMW · `AtLeast("manager")` | `GetSummary` `analytics_handler.go:23` | `GetSummary` `analytics_service.go:28` | raw SQL `analytics_repo.go:63` | none |
| 2 | `GET /admin/top-dishes?range=&limit=` | authMW · `AtLeast("manager")` | `GetTopDishes` `analytics_handler.go:39` | `GetTopDishes` `analytics_service.go:32` | raw SQL `analytics_repo.go:109` | none |
| 3 | `GET /admin/staff-performance?range=` | authMW · `AtLeast("manager")` | `GetStaffPerformance` `analytics_handler.go:62` | `GetStaffPerformance` `analytics_service.go:36` | raw SQL `analytics_repo.go:158` | none |
| 4 | `GET /admin/ingredients/low-stock` | authMW · `AtLeast("manager")` | `ListLowStock` `ingredient_handler.go:70` | `ListLowStock` `ingredient_service.go:63` | raw SQL `ingredient_repo.go:120` | none |
| 5 | `POST /admin/stock-movements` (write) | authMW · `AtLeast("manager")` | `CreateStockMovement` `ingredient_handler.go:172` | `CreateStockMovement` `ingredient_service.go:116` | insert + stock update `ingredient_repo.go:221` | none |

Route registration: all 5 in the `adminR := v1.Group("/admin")` block with
`adminR.Use(authMW, middleware.AtLeast("manager"))` — `main.go:294-295`; routes at
`main.go:296` (summary), `:297` (top-dishes), `:298` (staff-performance), `:300` (low-stock),
`:305` (stock-movements). None are inside the `AtLeast("admin")` sub-group (`admIngR`,
`main.go:311-315`) — that group only gates `DELETE /ingredients/:id`.

FE callers: `getSummary` / `getTopDishes` / `getStaffPerformance` / `getLowStock` /
`postStockMovement` — `admin.api.ts:210-217, 264-265, 276-277`; query keys
`['admin','summary',range]` · `['admin','top-dishes',range]` · `['admin','staff-performance',range]` ·
`['admin','low-stock']` (`summary/page.tsx:60, 110, 162, 295`).

---

## Auth Model on This Page

Uniform: **every** endpoint requires a valid staff JWT (`authMW` = `middleware.AuthRequired`,
`main.go:151`, with `is_active` check) **and** a role of at least `manager` (`AtLeast("manager")`,
`main.go:295`). Roles `manager` and `admin` pass; `chef`/`cashier`/`staff`/`customer` are rejected
`403`. There is no guest/public path on this page. The whole `/admin/*` shell is additionally
RoleGuarded `minRole=MANAGER` FE-side ([PAGES_INDEX.md](../../PAGES_INDEX.md) admin shell), so the
gate is enforced on both sides.

The write (`POST /admin/stock-movements`) records the actor: the handler reads
`middleware.StaffIDFromContext(c)` and forwards it as `CreatedBy` (`ingredient_handler.go:183-189`),
so each stock-in movement is attributed to the logged-in manager/admin.

---

## Per-Endpoint Detail

### 1 · GET /admin/summary?range=

- **Handler** `analytics_handler.go:23-36` — reads only `range` via `c.DefaultQuery("range","today")`
  (`:24`); no other params. Returns `200 {"data": {customers, dishes_sold, revenue, active_tables}}`
  built as a literal `gin.H` (`:30-35`).
- **Service** `analytics_service.go:28-30` — pass-through; normalises `range` via `validRange`
  (`:19-26`): only `week`/`month` are honoured, anything else (incl. `today` or garbage) → `today`.
- **Repo** `analytics_repo.go:63-107` — one `QueryRowContext`, raw SQL with a `dateFilter`
  substitution (`:51-61`):
  - `customers` = `COUNT(*)` of `orders` where `deleted_at IS NULL AND status != 'cancelled'` + date filter — one non-cancelled order = one customer visit.
  - `dishes_sold` = `SUM(oi.quantity)` over `order_items ⋈ orders` where `orders.status IN ('delivered','paid')` + date filter.
  - `revenue` = `SUM(CAST(p.amount AS DECIMAL))` over `payments ⋈ orders` where `payments.status = 'completed'` + date filter — cancelled/pending payments excluded.
  - `active_tables` = `COUNT(DISTINCT o.table_id)` where `status IN ('confirmed','preparing','ready')` — **range-agnostic, always a live count** (`:94-97`); see Flag 3.
- **Date filter** (`:51-61`): `today` → `DATE(created_at)=CURDATE()`; `week` → last 7 days inclusive (`INTERVAL 6 DAY`); `month` → last 30 days inclusive (`INTERVAL 29 DAY`).

### 2 · GET /admin/top-dishes?range=&limit=

- **Handler** `analytics_handler.go:39-59` — reads `range` (default `today`, `:40`) and `limit`
  (`strconv.Atoi(DefaultQuery("limit","5"))`, `:41` — parse error silently yields `0`). Returns
  `200 {"data": [{name, qty, revenue, pct}]}`; `pct = float64(PctTimes100)/100.0` (`:55`).
- **Service** `analytics_service.go:32-34` — pass-through with `validRange`.
- **Repo** `analytics_repo.go:109-156` — limit guard (`:110-112`): `limit <= 0 || limit > 50` → `5`
  (values >50 **reset to 5, not clamped**). SQL: `order_items ⋈ orders` where
  `orders.status IN ('delivered','paid') AND oi.combo_ref_id IS NULL` + date filter, `GROUP BY oi.name`,
  `ORDER BY qty DESC LIMIT ?` (`:114-128`). Combo child rows excluded; grouped by **name** not id;
  revenue = `Σ quantity × unit_price` (order-time snapshot). `PctTimes100 = qty*10000/totalQty`
  where `totalQty` = sum over the **returned top-N rows only** (`:150-154`) — see Flag 2.

### 3 · GET /admin/staff-performance?range=

- **Handler** `analytics_handler.go:62-88` — reads only `range` (`:63`). Returns
  `200 {"data": [{staff_id, full_name, role, orders_handled, revenue}]}`. **`revenue` is omitted
  from the row when `role == "chef"`** (`:72-74`) — see Flag 1.
- **Service** `analytics_service.go:36-38` — pass-through with `validRange`.
- **Repo** `analytics_repo.go:158-201` — `staff LEFT JOIN orders ON created_by=s.id AND status IN ('delivered','paid') + date filter LEFT JOIN payments ON status='completed'`, `WHERE s.deleted_at IS NULL AND s.is_active = 1 AND s.role != 'customer'`, `GROUP BY s.id`, `ORDER BY orders_handled DESC, full_name ASC` (`:161-181`). LEFT JOINs mean every active non-customer staff appears even with `orders_handled = 0, revenue = 0`.

### 4 · GET /admin/ingredients/low-stock

- **Handler** `ingredient_handler.go:70-81` — no input. Returns `200 {"data":[...]}`, each element via
  `toIngredientJSON` (`:28-43`) — **camelCase** keys: `id, name, unit, quantity (=current_stock),
  warningThreshold (=min_stock), importDate, shelfDays, expiryDate, status, createdAt, updatedAt`.
  `status` is computed at serialize time by `ingredientStatus` (`:14-26`): `0` → `out_of_stock`;
  expiry < now+7d → `expiring_soon`; `current_stock <= min_stock` → `low_stock`; else `in_stock`.
- **Service** `ingredient_service.go:63-65` — pass-through.
- **Repo** `ingredient_repo.go:120-141` — raw SQL: `WHERE deleted_at IS NULL AND current_stock <= min_stock * 1.2`,
  `ORDER BY (current_stock / GREATEST(min_stock, 0.001)) ASC` (most urgent first). The `*1.2` returns
  items within 20% above threshold, so the list includes not-yet-critical items — see Flag 4.

### 5 · POST /admin/stock-movements (write)

- **Handler** `ingredient_handler.go:172-203` — binds `{ingredient_id (required), type (required),
  quantity (required, gt=0), note}` (`:173-178`); actor from `StaffIDFromContext` → `CreatedBy`
  (`:183`). Returns `201 {"data":{id, ingredient_id, type, quantity, note, created_at}}` — **snake_case**
  (`:196-202`). This page only ever sends `type:"in"` (`summary/page.tsx:218-223`).
- **Service** `ingredient_service.go:116-131` — validates `type ∈ {in,out,adjustment}` (else
  `ErrInvalidMovementType` 400, `:117-119`); existence-checks the ingredient (else
  `ErrIngredientNotFound` 404, `:120-122`); then delegates to repo. **No DB transaction** at the
  service layer.
- **Repo** `ingredient_repo.go:221-248` — **3 sequential statements, NOT wrapped in a transaction**:
  (1) `INSERT INTO stock_movements …`; (2) `UPDATE ingredients SET current_stock = …` — `out` →
  `GREATEST(0, current_stock - qty)`, **`in` and `adjustment` both → `current_stock + qty`** (adjustment
  adds, does not set absolute); (3) re-`SELECT` the movement to return it. A failure between (1) and
  (2) leaves the movement logged but stock unchanged — see Flag 5.

---

## Caching & Invalidation

**No Redis on any of the 5 endpoints** — grep of the analytics + ingredient handler/service/repo
files returns zero `rdb`/`redis`/`cache` hits. Every read is a live MySQL query. This matches the
handbook policy: analytics/summary and ingredients are explicitly on the "do not cache" list
([../../03_be/REDIS_CACHE.md:48](../../03_be/REDIS_CACHE.md)) because they are money-critical or
low-traffic and staleness is not worth the risk.

Client-side, TanStack Query is the only cache: the 3 range queries use `staleTime: 60_000`, low-stock
`staleTime: 120_000` (`summary/page.tsx:62, 112, 163, 298`). After a successful stock-in the modal
invalidates `['admin','low-stock']` **and** `['admin','ingredients']` (`summary/page.tsx:225-226`),
so the alert list and the `/admin/ingredients` page both refetch.

---

## Error Behaviour

- **Bind failure** on the write (`POST /admin/stock-movements`) → `400 INVALID_INPUT` with the
  validation message (`ingredient_handler.go:179-181`); FE toast "Có lỗi xảy ra khi nhập hàng"
  (`summary/page.tsx:230`).
- **Service errors** map through `handleServiceError` (`respond.go:24-36`): `*AppError` → its
  status/code/message, else `500 COMMON_002`. Relevant write errors: `INVALID_MOVEMENT_TYPE` (400),
  `INGREDIENT_NOT_FOUND` (404).
- **403** if a non-manager JWT reaches any endpoint (role gate); **401** if token missing/expired
  (`authMW`). FE `/admin/*` RoleGuard normally prevents the call.
- The 4 reads have no business-error branches — they return data or `500` on a DB error; each FE
  section renders its own empty-state ("Chưa có dữ liệu…") when the array is empty, never an error
  surface (`summary/page.tsx:121-122, 173-174, 313-314`).

---

## Flags

| # | Flag | Where | Impact |
|---|------|-------|--------|
| 1 | **`staff-performance` omits `revenue` for `role=="chef"` rows.** | `analytics_handler.go:72-74` | Handled FE-side — `StaffPerfTable` renders `—` for chefs (`summary/page.tsx:192`) and `formatVND(row.revenue ?? 0)` guards the missing key. No bug, but the JSON shape is role-dependent. |
| 2 | **`top-dishes` `pct` is relative to the returned top-N rows, not the whole period.** | `analytics_repo.go:150-154` | `totalQty` sums only the LIMIT-ed rows, so the bars always sum to ~100% across the 5 shown dishes — it is **not** "% of all dishes sold". FE labels it `×{qty} · {pct}%` (`summary/page.tsx:131`); reading it as period-share would be wrong. |
| 3 | **`summary.active_tables` ignores `range`.** | `analytics_repo.go:94-97` | The subquery has no date filter — it is always a live "tables currently being served" count. Switching the range refetches but this number is identical for today/week/month. FE card label "Bàn đang phục vụ … confirmed/preparing/ready" matches; just note it is not a period metric. |
| 4 | **low-stock returns items up to `min_stock * 1.2`.** | `ingredient_repo.go:122-126` | The list includes items 0–20% **above** threshold, not only at/below it. FE then splits visually: `isCritical = quantity < warningThreshold` → 🔴 red, else 🟡 yellow (`summary/page.tsx:318`). So some rows are warnings, not yet critical — by design. |
| 5 | **Stock-in write is not transactional.** | `ingredient_repo.go:221-248` | INSERT movement + UPDATE stock are 2 separate statements with no `BEGIN`; a failure between them logs a movement without moving stock. Pre-existing, shared with [admin_ingredients_be.md](../admin_ingredients/admin_ingredients_be.md); not introduced by this page. Also: `type:"adjustment"` **adds** rather than sets absolute (`:235-237`) — this page only sends `type:"in"`, so unaffected. |
| 6 | **`dishes_sold` counts `delivered` AND `paid`; FE card sub-label says only "(delivered)".** | `analytics_repo.go` (dishes_sold clause) vs `summary/page.tsx:87` | Minor FE wording drift — the KPI is correct (delivered + paid), the caption under-describes it. Cosmetic, FE-side. |
| 7 | **`top-dishes` `limit` > 50 resets to 5 (not clamped to 50).** | `analytics_repo.go:110-112` | The page always sends `limit=5` (`admin.api.ts:213`), so unaffected; noted for any future caller. |

> All cells above are traced to source; **no `❓ UNVERIFIED`** in this anchor. These are flags /
> behavioural notes, not code bugs requiring a fix — no `SUMMARY_BUGS.md` was created this run.
