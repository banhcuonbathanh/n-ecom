# Object Model — Ingredient (FE ⇄ BE ⇄ DB)

> Generated 2026-06-13 · traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/internal/repository/ingredient_repo.go` (hand-written SQL, struct `Ingredient`, `StockMovement`) ·
> `be/internal/handler/ingredient_handler.go` (`toIngredientJSON` serializer) ·
> migration `009_ingredients.sql` (`ingredients`, `product_ingredients`, `stock_movements`) +
> `010_ingredients_dates.sql` (`import_date`, `shelf_days` columns) ·
> `fe/src/features/admin/admin.api.ts` (`Ingredient`, `IngredientStatus`).
>
> **Single home** for the Ingredient model (Rule #9). See [OBJECT_MODELS.md](OBJECT_MODELS.md).
> Recipe/BOM link to products → [OBJECT_MODEL_PRODUCT.md](OBJECT_MODEL_PRODUCT.md).
> Data instances → [MENU_CATALOG.md](MENU_CATALOG.md).
> Order flow that consumes stock → `docs/work_flow/STAFF_ORDER_FLOW.md`.

```
READ:  ingredients MySQL + stock_movements MySQL → toIngredientJSON → GET /admin/ingredients → Ingredient (FE)
WRITE: manager+ — POST .../ingredients (create + initial-stock 'in' movement) · PATCH .../ingredients/:id
STOCK: POST /admin/stock-movements (type in/out/adjustment) → current_stock updated atomically in same tx
BOM:   product_ingredients links a Product to its required Ingredients (recipe/BOM — read-only at runtime)
```

> An `Ingredient` is an inventory item (e.g. "Bột bánh cuốn", "Thịt lợn"). `current_stock` is **never
> edited directly** — it is always derived by applying `stock_movements`. `status` is a **computed**
> field on the BE serializer, not stored in DB. `cost_per_unit` is in DB but **not serialized** to FE
> in the current release.

---

## §1 — Comparison Matrix

Legend: `—` = absent at that layer · ⚠️ = mismatch, see [§3](#3--flags--known-mismatches).

| Attribute | DB `ingredients` | BE struct `Ingredient` | BE→FE JSON (`toIngredientJSON`) | FE `Ingredient` |
|---|---|---|---|---|
| `id` | CHAR(36) PK UUID | `ID string` | `id string` | `id: string` |
| `name` | VARCHAR(150) NOT NULL | `Name string` | `name string` | `name: string` |
| `unit` | VARCHAR(30) NOT NULL | `Unit string` | `unit string` | `unit: string` |
| `import_date` | DATE NOT NULL DEFAULT CURDATE() | `ImportDate time.Time` | `importDate "YYYY-MM-DD"` | `importDate: string` |
| `shelf_days` | INT NOT NULL DEFAULT 90 | `ShelfDays int` | `shelfDays number` | `shelfDays: number` |
| `current_stock` | DECIMAL(10,3) DEFAULT 0 | `CurrentStock float64` | `quantity number` ⚠️ | `quantity: number` ⚠️ |
| `min_stock` | DECIMAL(10,3) DEFAULT 0 | `MinStock float64` | `warningThreshold number` ⚠️ | `warningThreshold: number` ⚠️ |
| `cost_per_unit` | DECIMAL(10,0) DEFAULT 0 | `CostPerUnit int64` | — (not serialized) ⚠️ | — |
| `created_at` / `updated_at` | DATETIME | `CreatedAt / UpdatedAt time.Time` | `createdAt / updatedAt` | `createdAt: string · updatedAt?: string` |
| `deleted_at` | DATETIME NULL | — | — | — |
| `expiryDate` | — (computed) | — | `expiryDate "YYYY-MM-DD"` (= importDate + shelfDays) | `expiryDate: string` |
| `status` | — (computed) | — | `status string` (4-state logic, see §2.3) | `status: IngredientStatus` |

### Stock-movement attributes (`stock_movements`)

| Attribute | DB `stock_movements` | BE struct `StockMovement` | BE→FE JSON |
|---|---|---|---|
| `id` | CHAR(36) PK UUID | `ID string` | `id string` |
| `ingredient_id` | CHAR(36) FK→ingredients CASCADE | `IngredientID string` | `ingredient_id string` |
| `type` | ENUM('in','out','adjustment') NOT NULL | `Type string` | `type string` |
| `quantity` | DECIMAL(10,3) NOT NULL | `Quantity float64` | `quantity number` |
| `note` | TEXT NULL | `Note sql.NullString` | `note string \| null` |
| `created_by` | CHAR(36) NULL FK→staff SET NULL | `CreatedBy sql.NullString` | — (omitted from wire) ⚠️ |
| `created_at` | DATETIME | `CreatedAt time.Time` | `created_at string` |

---

## §2 — Detail Tables

### 2.1 DB `ingredients` — migrations `009_ingredients.sql` + `010_ingredients_dates.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(150) NOT NULL | e.g. "Bột bánh cuốn", "Thịt lợn xay" |
| `unit` | VARCHAR(30) NOT NULL | e.g. "kg", "lít", "gói" |
| `import_date` | DATE NOT NULL DEFAULT (CURDATE()) | Added in migration 010; date the batch was imported |
| `shelf_days` | INT NOT NULL DEFAULT 90 | Added in migration 010; how many days the batch stays safe |
| `current_stock` | DECIMAL(10,3) NOT NULL DEFAULT 0 | Derived via movements — never write directly |
| `min_stock` | DECIMAL(10,3) NOT NULL DEFAULT 0 | Low-stock threshold; `ListLowStock` returns rows where `current_stock <= min_stock * 1.2` |
| `cost_per_unit` | DECIMAL(10,0) NOT NULL DEFAULT 0 | VND per unit; in DB but not exposed on current API |
| `created_at` / `updated_at` | DATETIME | |
| `deleted_at` | DATETIME NULL | Soft delete |

### 2.2 DB `product_ingredients` — migration `009_ingredients.sql` (BOM / recipe)

| Column | Type | Notes |
|---|---|---|
| `product_id` | CHAR(36) FK→products CASCADE | Composite PK |
| `ingredient_id` | CHAR(36) FK→ingredients CASCADE | Composite PK |
| `qty_used` | DECIMAL(10,3) NOT NULL DEFAULT 0 | How much of the ingredient one serving of the product uses |

> `product_ingredients` is a **recipe/BOM** link — it records how much of each ingredient goes into
> one unit of a [Product](OBJECT_MODEL_PRODUCT.md). This table is read-only at runtime order flow;
> no service reads it during order create. Full product shape → [OBJECT_MODEL_PRODUCT.md](OBJECT_MODEL_PRODUCT.md).

### 2.3 DB `stock_movements` — migration `009_ingredients.sql` (ledger)

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `ingredient_id` | CHAR(36) FK→ingredients CASCADE | |
| `type` | ENUM('in','out','adjustment') NOT NULL | `in` = nhập kho; `out` = xuất kho; `adjustment` = kiểm kê |
| `quantity` | DECIMAL(10,3) NOT NULL | Always positive; direction encoded in `type` |
| `note` | TEXT NULL | Optional freetext |
| `created_by` | CHAR(36) NULL FK→staff SET NULL | Staff who recorded the movement; SET NULL if staff deleted |
| `created_at` | DATETIME | Indexes: `ingredient_id`, `created_at`, `created_by` |

> `CreateStockMovement` (repository) updates `current_stock` atomically in the same SQL:
> - `type='out'` → `current_stock = GREATEST(0, current_stock - qty)` (floor at zero)
> - `type='in'` or `'adjustment'` → `current_stock = current_stock + qty`

### 2.4 BE serializer — `ingredient_handler.go` (`toIngredientJSON`)

Fields emitted (current release):

| JSON key | Source | Notes |
|---|---|---|
| `id` | `ingredients.id` | |
| `name` | `ingredients.name` | |
| `unit` | `ingredients.unit` | |
| `quantity` | `ingredients.current_stock` | ⚠️ DB name ≠ JSON key |
| `warningThreshold` | `ingredients.min_stock` | ⚠️ DB name ≠ JSON key |
| `importDate` | `ingredients.import_date` | Formatted `"YYYY-MM-DD"` |
| `shelfDays` | `ingredients.shelf_days` | |
| `expiryDate` | `import_date + shelf_days` | Computed in serializer; formatted `"YYYY-MM-DD"` |
| `status` | Computed (see logic below) | Not stored in DB |
| `createdAt` / `updatedAt` | `ingredients.created_at / updated_at` | |

**`status` computation (serializer logic, NOT stored):**

```
if current_stock == 0          → "out_of_stock"
else if expiryDate < now+7d    → "expiring_soon"
else if current_stock <= min_stock → "low_stock"
else                           → "in_stock"
```

**Not serialized:** `cost_per_unit` (in DB but withheld from current API response — see §3 flag #2).

### 2.5 FE type — `fe/src/features/admin/admin.api.ts`

```ts
type IngredientStatus = 'in_stock' | 'low_stock' | 'expiring_soon' | 'out_of_stock'

interface Ingredient {
  id:               string
  name:             string
  unit:             string
  quantity:         number          // = current_stock (⚠️ renamed)
  warningThreshold: number          // = min_stock (⚠️ renamed)
  importDate:       string          // "YYYY-MM-DD"
  shelfDays:        number
  expiryDate:       string          // "YYYY-MM-DD" — computed by BE
  status:           IngredientStatus
  createdAt:        string
  updatedAt?:       string
}
```

### 2.6 Endpoints (all `manager+` RBAC)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/ingredients` | List all ingredients |
| GET | `/api/v1/admin/ingredients/low-stock` | List where `current_stock <= min_stock * 1.2` |
| GET | `/api/v1/admin/ingredients/:id` | Single ingredient |
| POST | `/api/v1/admin/ingredients` | Create ingredient (records initial 'in' movement) |
| PATCH | `/api/v1/admin/ingredients/:id` | Update metadata (not stock — use movements for that) |
| DELETE | `/api/v1/admin/ingredients/:id` | Soft delete |
| POST | `/api/v1/admin/stock-movements` | Record in/out/adjustment (updates current_stock atomically) |
| GET | `/api/v1/admin/ingredients/:id/movements` | List movement ledger for one ingredient |

---

## §2.4 — Real object example (one ingredient across layers)

```jsonc
// DB — ingredients row
// id="aaa-…-001" name="Bột bánh cuốn" unit="kg"
// import_date="2026-06-01" shelf_days=30
// current_stock=12.500 min_stock=5.000 cost_per_unit=25000

// DB — one stock_movements row for this ingredient
// id="mmm-…-001" ingredient_id="aaa-…-001" type="in" quantity=15.000
// note="Nhập lô tháng 6" created_by="staff-…-001" created_at="2026-06-01 08:00:00"

// BE→FE — toIngredientJSON response (cost_per_unit withheld; status computed)
{
  "id": "aaa-…-001",
  "name": "Bột bánh cuốn",
  "unit": "kg",
  "quantity": 12.5,               // = current_stock
  "warningThreshold": 5.0,        // = min_stock
  "importDate": "2026-06-01",
  "shelfDays": 30,
  "expiryDate": "2026-07-01",     // import_date + shelf_days
  "status": "in_stock",           // 12.5 > 5.0 and expiryDate > now+7d
  "createdAt": "2026-06-01T08:00:00Z",
  "updatedAt": "2026-06-01T08:00:00Z"
}

// BE→FE — stock movement item in GET .../movements response
{ "id": "mmm-…-001", "ingredient_id": "aaa-…-001", "type": "in",
  "quantity": 15.0, "note": "Nhập lô tháng 6", "created_at": "2026-06-01T08:00:00Z" }

// FE — Ingredient (admin.api.ts) — mirrors the JSON 1-to-1; no enrichment step
```

The reader follows one ingredient: raw DB columns → serializer renames + computed fields → wire JSON →
FE type. Note the `current_stock → quantity` and `min_stock → warningThreshold` rename across the layer
boundary.

---

## §3 — Flags / Known Mismatches

| # | Mismatch | Detail |
|---|---|---|
| 1 | **DB name ≠ JSON key (two fields)** | `current_stock` serialized as `quantity`; `min_stock` serialized as `warningThreshold`. The FE type uses the JSON names, not the DB names. Do not conflate them when writing queries or migration scripts. |
| 2 | **`cost_per_unit` withheld** | Column exists in DB and in the `Ingredient` struct (`CostPerUnit int64`) but `toIngredientJSON` does not emit it. Not available to FE in the current release. |
| 3 | **`status` is computed, not stored** | `status` is derived by `toIngredientJSON` every time the ingredient is fetched — it is not a DB column. The `expiring_soon` boundary is hard-coded at 7 days in the serializer. |
| 4 | **`created_by` omitted from movement wire** | `stock_movements.created_by` is stored and indexed in DB, and present in `StockMovement` struct, but the BE movement JSON response does not include it. Staff attribution is DB-level only. |
| 5 | **`out` floor is zero** | `type='out'` movements use `GREATEST(0, current_stock - qty)` — stock cannot go negative even if the requested quantity exceeds current stock. No error is raised; the remainder is silently clamped. |
| 6 | **No FE enrichment** | Unlike [Combo](OBJECT_MODEL_COMBO.md), the FE `Ingredient` is a direct mirror of the JSON — no client-side joins or enrichment step. |

---

## §4 — STOR (Planned) — Daily Usage + Run-out Forecast 🔮

> **DOES NOT EXIST IN CODE.** Everything in this section is a planned extension — no migration, no
> serializer field, no FE type field has been written yet. Label: **STOR** (Stock + Forecast).
> When implemented, remove this notice and update the header sources list.

### Planned DB change — migration 018 (not yet created)

```sql
-- 018_ingredient_avg_daily_usage.sql
ALTER TABLE ingredients
  ADD COLUMN avg_daily_usage DECIMAL(10,3) NOT NULL DEFAULT 0
    COMMENT 'Đơn vị tiêu thụ trung bình mỗi ngày — set thủ công bởi admin';
```

`avg_daily_usage` is owner-maintained (not auto-computed from movements). A value of `0` means
"chưa ước tính" — forecast fields will return `null` in that case.

### Planned serializer fields added to `toIngredientJSON`

| JSON key | Computation | Notes |
|---|---|---|
| `avgDailyUsage` | `ingredients.avg_daily_usage` | Direct from new column |
| `totalImported` | `COALESCE(SUM(quantity), 0)` over `stock_movements WHERE type='in'` | Includes the initial 'in' movement that POST /ingredients records for `initialQuantity` |
| `daysRemaining` | `avgDailyUsage > 0 ? floor(currentStock / avgDailyUsage) : null` | `null` → "Chưa ước tính" |
| `runoutDate` | `avgDailyUsage > 0 ? today + daysRemaining days : null` | `null` when `avgDailyUsage == 0` |

### Planned FE type extension

```ts
// Additions to Ingredient interface (PLANNED — not in code yet)
interface Ingredient {
  // … existing fields …
  avgDailyUsage:  number           // 0 = chưa ước tính
  totalImported:  number           // sum of all 'in' movements
  daysRemaining:  number | null    // null if avgDailyUsage == 0
  runoutDate:     string | null    // "YYYY-MM-DD" | null
}
```

### Planned create/update input change

POST `/admin/ingredients` and PATCH `/admin/ingredients/:id` gain an `avgDailyUsage` field
(number, optional, defaults to `0`).

### Example with STOR fields (planned wire shape)

```jsonc
// 🔮 PLANNED — not real yet
{
  "id": "aaa-…-001",
  "name": "Bột bánh cuốn",
  "quantity": 12.5,
  "warningThreshold": 5.0,
  "avgDailyUsage": 0.5,           // owner entered: 0.5 kg/day
  "totalImported": 15.0,          // sum of 'in' movements
  "daysRemaining": 25,            // floor(12.5 / 0.5)
  "runoutDate": "2026-07-08",     // 2026-06-13 + 25 days
  "status": "in_stock"
}
// If avgDailyUsage == 0 → daysRemaining: null, runoutDate: null
```
