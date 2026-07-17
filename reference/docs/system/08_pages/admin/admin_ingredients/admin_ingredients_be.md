# Admin Ingredients — `/admin/ingredients` · Backend View

> **TL;DR:** every BE endpoint the ingredients page calls, traced handler → service → repository →
> SQL, with auth/RBAC, caching, and error behaviour. Traced from source on branch
> `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes, lines 293–313) ·
> `be/internal/handler/ingredient_handler.go` ·
> `be/internal/service/ingredient_service.go` ·
> `be/internal/repository/ingredient_repo.go`.
>
> FE view + zones → [admin_ingredients.md](admin_ingredients.md) ·
> Object shape → [../../02_spec/object/OBJECT_MODEL_INGREDIENT.md](../../../02_spec/object/OBJECT_MODEL_INGREDIENT.md) ·
> API contract → [../../02_spec/API_SPEC.md](../../../02_spec/API_SPEC.md)

---

## Endpoints Used by This Page

| # | Endpoint | Auth / RBAC | Handler | Service | Repo method | Tables touched |
|---|---|---|---|---|---|---|
| 1 | `GET /admin/ingredients` | authMW + manager+ | `ingredientH.ListIngredients` | `ListIngredients` | `ListIngredients` | `ingredients` (read) |
| 2 | `GET /admin/ingredients/low-stock` | authMW + manager+ | `ingredientH.ListLowStock` | `ListLowStock` | `ListLowStock` | `ingredients` (read) |
| 3 | `GET /admin/ingredients/:id` | authMW + manager+ | `ingredientH.GetIngredient` | `GetIngredient` | `GetIngredientByID` | `ingredients` (read) |
| 4 | `POST /admin/ingredients` | authMW + manager+ | `ingredientH.CreateIngredient` | `CreateIngredient` | `CreateIngredient` | `ingredients` (write) |
| 5 | `PATCH /admin/ingredients/:id` | authMW + manager+ | `ingredientH.UpdateIngredient` | `UpdateIngredient` | `UpdateIngredient` | `ingredients` (write) |
| 6 | `DELETE /admin/ingredients/:id` | authMW + **admin only** | `ingredientH.DeleteIngredient` | `DeleteIngredient` | `SoftDeleteIngredient` | `ingredients` (soft delete) |
| 7 | `POST /admin/stock-movements` | authMW + manager+ | `ingredientH.CreateStockMovement` | `CreateStockMovement` | `CreateStockMovement` | `stock_movements` (write) + `ingredients` current_stock (write) |
| 8 | `GET /admin/ingredients/:id/movements` | authMW + manager+ | `ingredientH.ListStockMovements` | `ListStockMovements` | `ListStockMovements` | `stock_movements` (read) |

Route registration: `be/cmd/server/main.go:293–313`. All under `/api/v1/admin`.

---

## Auth / RBAC Model

- **All 8 endpoints sit inside the `adminR` group** (`v1.Group("/admin")`), which applies
  `authMW` (JWT required) and `middleware.AtLeast("manager")` before any handler runs.
  `manager` and `admin` roles pass; `chef`/`cashier`/`staff` are rejected with 403.
- **Exception — DELETE** (`endpoint 6`): a nested `admIngR` sub-group adds
  `middleware.AtLeast("admin")`, so only the `admin` role can hard-delete (soft delete)
  an ingredient. Manager gets 403 on DELETE even though they can do all other writes.
- The `POST /admin/stock-movements` handler reads the caller's staff ID from the JWT via
  `middleware.StaffIDFromContext(c)` and stores it in `stock_movements.created_by` (nullable).

---

## Per-Endpoint Detail

### 1 · `GET /admin/ingredients`

- Handler `ListIngredients` (`ingredient_handler.go:56-67`): calls service, maps each row
  through `toIngredientJSON`, returns `{"data": [...]}`.
- Service `ListIngredients` (`ingredient_service.go:59-61`): direct pass-through to repo — no
  caching layer.
- Repo `ListIngredients` (`ingredient_repo.go:102-118`):
  ```sql
  SELECT id, name, unit, import_date, shelf_days, current_stock, min_stock,
         cost_per_unit, created_at, updated_at
  FROM   ingredients
  WHERE  deleted_at IS NULL
  ORDER  BY name ASC
  ```
- **Response item fields** (via `toIngredientJSON`):
  `id, name, unit, quantity` (=`current_stock`), `warningThreshold` (=`min_stock`),
  `importDate` (YYYY-MM-DD), `shelfDays`, `expiryDate` (=`import_date + shelf_days`, YYYY-MM-DD),
  `status` (derived: see §Status Logic), `createdAt`, `updatedAt`.
- Note: `cost_per_unit` is stored in DB and in `repository.Ingredient` but is **NOT** in
  `toIngredientJSON` — it is not serialized to the wire today.
- **FE:** `listIngredients()` in `admin.api.ts`; TanStack query key `['admin','ingredients']`,
  `staleTime: 60 s` (inferred from FE page — no Redis caching on this endpoint).

### 2 · `GET /admin/ingredients/low-stock`

- Handler `ListLowStock` (`ingredient_handler.go:70-81`): same structure as endpoint 1.
- Service `ListLowStock` (`ingredient_service.go:63-65`): direct pass-through to repo.
- Repo `ListLowStock` (`ingredient_repo.go:120-141`):
  ```sql
  SELECT ...
  FROM   ingredients
  WHERE  deleted_at IS NULL
    AND  current_stock <= min_stock * 1.2
  ORDER  BY (current_stock / GREATEST(min_stock, 0.001)) ASC
  ```
  Rows are ordered by how close to zero they are (most critical first). `GREATEST(..., 0.001)`
  prevents division-by-zero when `min_stock = 0`.
- **FE:** `getLowStock()` in `admin.api.ts`. Called from the `/admin/summary` low-stock banner;
  the ingredients page itself does not call this endpoint today — it is listed here because it
  uses the same handler and will be wired into the planned `/admin/storage` page (zone B).

### 3 · `GET /admin/ingredients/:id`

- Handler `GetIngredient` (`ingredient_handler.go:84-91`): reads `:id` param, passes to service,
  returns single object via `toIngredientJSON`.
- Service `GetIngredient` (`ingredient_service.go:67-73`): calls `GetIngredientByID`; maps
  `sql.ErrNoRows` → `ErrIngredientNotFound` (404 `INGREDIENT_NOT_FOUND`).
- Repo `GetIngredientByID` (`ingredient_repo.go:143-150`):
  ```sql
  SELECT ... FROM ingredients WHERE id = ? AND deleted_at IS NULL LIMIT 1
  ```
- **FE:** no direct call from the ingredients page today — `admin.api.ts` does not export
  `getIngredient(id)`. The endpoint exists in BE and is used internally by `UpdateIngredient`
  and `CreateStockMovement` for existence checks.

### 4 · `POST /admin/ingredients`

- Handler `CreateIngredient` (`ingredient_handler.go:94-125`): binds JSON; validates
  `importDate` string to `time.Time` (YYYY-MM-DD format); calls service; returns 201.
- **Request body fields:** `name` (required, max 150), `unit` (required, max 30),
  `importDate` (required, YYYY-MM-DD), `shelfDays` (required, min 1), `initialQuantity`
  (optional float64, defaults to 0), `warningThreshold` (optional float64, defaults to 0).
- Service `CreateIngredient` (`ingredient_service.go:75-86`): generates UUID; maps
  `InitialQuantity` → `CurrentStock` and `WarningThreshold` → `MinStock`; calls repo.
  Note: `initialQuantity` is written directly to `ingredients.current_stock` — **no initial
  stock movement is recorded at create time** (see §Flags / Assumptions).
- Repo `CreateIngredient` (`ingredient_repo.go:152-161`):
  ```sql
  INSERT INTO ingredients
    (id, name, unit, import_date, shelf_days, current_stock, min_stock, cost_per_unit,
     created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  ```
  After insert, immediately re-fetches via `GetIngredientByID` and returns the full row.
- **FE:** `createIngredient(body)` in `admin.api.ts`; called from `IngredientFormModal`.

### 5 · `PATCH /admin/ingredients/:id`

- Handler `UpdateIngredient` (`ingredient_handler.go:128-160`): all body fields optional
  (pointer types); validates `importDate` string if provided; calls service.
- **Request body fields (all optional):** `name`, `unit`, `importDate`, `shelfDays`,
  `warningThreshold`. (Note: `WarningThreshold` in the FE `UpdateIngredientInput` maps
  to `MinStock` in the DB.)
- Service `UpdateIngredient` (`ingredient_service.go:88-105`): first calls `GetIngredient`
  to confirm existence (returns 404 if not found); then calls repo update; maps
  `sql.ErrNoRows` → `ErrIngredientNotFound`.
- Repo `UpdateIngredient` (`ingredient_repo.go:163-205`): builds a dynamic
  `SET ... WHERE id = ? AND deleted_at IS NULL` updating only the supplied fields plus
  `updated_at = NOW()`. If no fields supplied (empty patch), skips the UPDATE and re-fetches.
  Returns `sql.ErrNoRows` if rows affected = 0.
- **FE:** `updateIngredient(id, body)` in `admin.api.ts`; called from `IngredientFormModal`
  in edit mode.

### 6 · `DELETE /admin/ingredients/:id`

- Handler `DeleteIngredient` (`ingredient_handler.go:163-169`): admin-only (sub-group RBAC).
  Returns `{"message": "Nguyên liệu đã được xóa"}` on success.
- Service `DeleteIngredient` (`ingredient_service.go:107-114`): calls `SoftDeleteIngredient`;
  maps `sql.ErrNoRows` → `ErrIngredientNotFound`.
- Repo `SoftDeleteIngredient` (`ingredient_repo.go:207-219`):
  ```sql
  UPDATE ingredients
  SET    deleted_at = ?, updated_at = NOW()
  WHERE  id = ? AND deleted_at IS NULL
  ```
  Returns `sql.ErrNoRows` if the row was already deleted or never existed.
- **FE:** `deleteIngredient(id)` in `admin.api.ts`; called from the trash icon in
  `IngredientTable`. Note: the FE shows this button to all manager+ users even though the BE
  rejects non-admin callers with 403.
- **In-use constraint:** there is no explicit FK-check guard in the service today. If
  `ingredients` had a FK reference from `product_ingredients` with RESTRICT, the DB would
  return a MySQL error 1451; `handleServiceError` would fall through to 500 (`COMMON_002`) —
  not a clean 422. This is a known gap (see §Flags).

### 7 · `POST /admin/stock-movements`

- Handler `CreateStockMovement` (`ingredient_handler.go:172-203`): binds JSON; reads
  `StaffIDFromContext`; calls service; returns 201 with the new movement row.
- **Request body fields:** `ingredient_id` (required), `type` (required: `"in"` | `"out"` |
  `"adjustment"`), `quantity` (required, `> 0`), `note` (optional string).
- Service `CreateStockMovement` (`ingredient_service.go:116-131`): validates `type` oneof
  (returns `ErrInvalidMovementType` on mismatch); verifies ingredient exists; calls repo.
- Repo `CreateStockMovement` (`ingredient_repo.go:221-248`):
  1. Inserts into `stock_movements`.
  2. Updates `ingredients.current_stock`:
     - `"out"` → `GREATEST(0, current_stock - quantity)` (floor at 0, never negative)
     - `"in"` / `"adjustment"` → `current_stock + quantity`
  3. Re-fetches the movement row and returns it.
  These two steps are **not wrapped in a transaction** in the current code — a partial failure
  (movement inserted but stock not updated) is possible under concurrent write pressure
  (see §Flags).
- **Response fields:** `id, ingredient_id, type, quantity, note, created_at`.
- **FE:** `postStockMovement(body)` in `admin.api.ts`; called from the local `StockMoveModal`
  in `page.tsx`. After success, TanStack Query invalidates `['admin','ingredients']` so the
  list refreshes with the new `quantity`.

### 8 · `GET /admin/ingredients/:id/movements`

- Handler `ListStockMovements` (`ingredient_handler.go:206-224`): reads `:id` param; returns
  array of movement objects.
- Service `ListStockMovements` (`ingredient_service.go:133-135`): calls repo with `limit = 50`.
- Repo `ListStockMovements` (`ingredient_repo.go:250-272`):
  ```sql
  SELECT id, ingredient_id, type, quantity, note, created_by, created_at
  FROM   stock_movements
  WHERE  ingredient_id = ?
  ORDER  BY created_at DESC
  LIMIT  ?
  ```
- **Response fields per item:** `id, ingredient_id, type, quantity, note, created_at`.
  (`created_by` is scanned server-side but is NOT emitted in the JSON — the handler builds
  `gin.H` without it.)
- **FE:** this endpoint is **not called by the current `/admin/ingredients` page**. It is listed
  here because the BE is implemented and the planned `/admin/storage` movement log (zone D)
  will use it. No `admin.api.ts` export exists today.

---

## Status Derivation Logic

`toIngredientJSON` computes `expiryDate = import_date + shelf_days` and passes it to
`ingredientStatus` (`ingredient_handler.go:14-26`):

| Priority | Condition | Status value |
|---|---|---|
| 1 | `current_stock == 0` | `out_of_stock` |
| 2 | `expiryDate < now + 7 days` | `expiring_soon` |
| 3 | `current_stock <= min_stock` | `low_stock` |
| 4 | (else) | `in_stock` |

Note: `expiring_soon` takes precedence over `low_stock` — an item can be both low and expiring,
but the status shows `expiring_soon`.

---

## Caching

- **No Redis caching** on any ingredient endpoint. Confirmed: `ingredient_service.go` imports
  no cache client; `ingredient_handler.go` sets no cache headers. The low-stock banner on
  `/admin/summary` and the ingredient list are both uncached at the BE layer.
- **FE TanStack Query:** `listIngredients` uses `staleTime: 60 s` (observed in page component).
  After any mutation (create / update / delete / stock movement) the FE explicitly invalidates
  `['admin','ingredients']`, so the list always refreshes immediately post-write.

---

## Error Behaviour

| Error | HTTP | Code | Triggered by |
|---|---|---|---|
| Missing / invalid bind fields | 400 | `INVALID_INPUT` | `ShouldBindJSON` failure in handler; also invalid `importDate` format |
| Ingredient not found | 404 | `INGREDIENT_NOT_FOUND` | `GetIngredient` / `UpdateIngredient` / `DeleteIngredient` when `sql.ErrNoRows` |
| Invalid movement type | 400 | `INVALID_MOVEMENT_TYPE` | `CreateStockMovement` when `type` ∉ {in, out, adjustment} |
| Unauthorized (wrong role) | 403 | _(Gin middleware, no body code)_ | Non-manager calling any endpoint; non-admin calling DELETE |
| Unauthenticated | 401 | _(authMW)_ | Missing or invalid JWT |
| DB / internal error | 500 | `COMMON_002` | Unhandled `error` from repo (e.g. DB down, unhandled MySQL constraint) |

**Known gap:** a 409 duplicate-name error and a 422 in-use-on-delete error are listed in the
FE interactions as expected UI states, but the BE does not emit them as typed `AppError` today:
- **409 duplicate:** the `ingredients` table has no UNIQUE constraint on `name` in the current
  schema — duplicates are allowed at the DB level. The FE shows the 409 toast defensively.
- **422 in-use:** the `product_ingredients` FK (if RESTRICT) would surface as MySQL 1451 → 500
  `COMMON_002`, not a clean 422. No service-layer guard exists.

---

## Flags / Assumptions

| # | Flag | Detail |
|---|---|---|
| 1 | **`initialQuantity` written directly, no initial movement** | `CreateIngredient` sets `current_stock = initialQuantity` via INSERT; it does NOT insert a `type='in'` stock movement. This means `Σ stock_movements WHERE type='in'` ≠ total imported when the ingredient was created with a non-zero initial quantity. The 🔮 STOR forecast's `totalImported` field assumes an initial 'in' movement is recorded — that would require a code change at create time. |
| 2 | **Stock update is not transactional** | `CreateStockMovement` inserts the movement row then issues a separate UPDATE on `ingredients.current_stock` — not in a DB transaction. A crash between the two leaves the log and the stock count out of sync. |
| 3 | **`created_by` not in movement response** | The handler serializes `created_by` as part of `Scan` but omits it from the `gin.H` JSON — it cannot be displayed in a movement log without a BE change. |
| 4 | **`cost_per_unit` stored but not exposed** | `repository.Ingredient` has `CostPerUnit int64`; it is scanned and stored but `toIngredientJSON` does not include it. The FE `Ingredient` type has no `costPerUnit` field. |
| 5 | **`GET /ingredients/:id` and `GET /ingredients/:id/movements` not called by the current FE page** | Both endpoints are implemented in BE. The detail GET is used internally by the service; the movements GET is intended for the planned storage page. No `admin.api.ts` export exists for either. |

---

## 🔮 PLANNED (STOR) — Forecast Extension

> Everything below is **not in code today**. Labels: 🔮 PLANNED / STOR (migration 018).
> See also: [admin_storage.md](../admin_storage/admin_storage.md) (zone C / §Business Logic Used).

### New DB column — migration 018

```sql
ALTER TABLE ingredients
  ADD COLUMN avg_daily_usage DECIMAL(10,3) NOT NULL DEFAULT 0
  COMMENT 'Owner-set estimate of daily consumption in the ingredient unit';
```

### New API fields on ingredient responses

| Field | Derivation | Null when |
|---|---|---|
| `avgDailyUsage` | `ingredients.avg_daily_usage` (float) | — (always present, default 0) |
| `totalImported` | `SELECT SUM(quantity) FROM stock_movements WHERE ingredient_id = ? AND type = 'in'` subquery | no 'in' movements (returns 0) |
| `daysRemaining` | `floor(current_stock / avg_daily_usage)` | `avg_daily_usage = 0` → null |
| `runoutDate` | `today + daysRemaining` (ISO date string) | null when `daysRemaining` null |

`totalImported` is a derived aggregate — it requires either an extra SQL join/subquery per row in
`ListIngredients` or a second query (N+1 risk). Recommended: a single `LEFT JOIN` subquery in
`ListIngredients`:

```sql
SELECT i.*, COALESCE(m.total_in, 0) AS total_imported
FROM   ingredients i
LEFT   JOIN (
         SELECT ingredient_id, SUM(quantity) AS total_in
         FROM   stock_movements
         WHERE  type = 'in'
         GROUP  BY ingredient_id
       ) m ON m.ingredient_id = i.id
WHERE  i.deleted_at IS NULL
ORDER  BY i.name ASC
```

### create-time initial 'in' movement

To make `totalImported` accurate from day one, `CreateIngredient` must be updated to insert a
`stock_movements` row of `type = 'in'` for `initialQuantity` (when > 0) inside a DB transaction,
then set `current_stock = initialQuantity` from the movement rather than directly. This also
fixes Flag #2 (non-transactional stock update) for the create path.

### PATCH extension for `avgDailyUsage`

`UpdateIngredientInput` gains an optional `avgDailyUsage float64` field; the handler binds it,
the service passes it through, and the repo includes `avg_daily_usage = ?` in the dynamic SET.
`runoutDate` / `daysRemaining` are computed in `toIngredientJSON` (no DB column — pure derivation).

### FE changes summary (for cross-reference; FE detail → admin_storage.md)

- `Ingredient` type gains `avgDailyUsage`, `totalImported`, `daysRemaining`, `runoutDate`.
- `UpdateIngredientInput` gains optional `avgDailyUsage`.
- `IngredientFormModal` gains a "Sử dụng mỗi ngày" number input.
- Stock table gains 3 columns: "Tổng nhập", "Dùng/ngày", "Dự kiến hết"
  (run-out date + days-left badge; "—" when `avgDailyUsage = 0`).
