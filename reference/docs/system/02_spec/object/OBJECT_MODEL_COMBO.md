# Object Model — Combo (FE ⇄ BE ⇄ DB)

> Generated 2026-06-13 · traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/types/product.ts` (`Combo`, `ComboRaw`, `ComboItem`) · `be/internal/handler/product_handler.go`
> (`ListCombos` inline serializer) · migration `004_combos.sql` (`combos`, `combo_items`).
>
> **Purpose:** every attribute of the Combo object at every layer, side-by-side. This is the **single
> home** for the Combo model (Rule #9) — other docs link here and do not re-list these fields.
> See [OBJECT_MODELS.md](OBJECT_MODELS.md). For how a combo expands into `order_items` at order time
> (header row `unit_price=0` + sub-items), that belongs to the order pipeline → [OBJECT_MODEL_ORDER.md §2.6](OBJECT_MODEL_ORDER.md).

```
READ:   combos (+ combo_items template) MySQL → ComboDetails (service, Redis-cached) → comboJSON → ComboRaw (wire) → Combo (enriched, TS)
WRITE:  admin only — POST/PATCH /combos → see API_SPEC + admin_combos page
```

> **Two FE shapes.** The wire shape `ComboRaw` carries only `combo_items: [{id, product_id, quantity}]`.
> The FE then **enriches** it into `Combo` (with `items: ComboItem[]`) by joining `product_id` against
> the all-products map to resolve `product_name`, `unit_price`, and available `toppings`
> (`menu/page.tsx` `useMemo`). Components only ever receive the enriched `Combo`.

---

## §1 — Comparison Matrix (all attributes, all layers)

Legend: `—` = absent at that layer · ⚠️ = mismatch, see [§3 Flags](#3--flags--known-mismatches).

### 1A. Combo-level attributes

| Attribute | DB `combos` | BE service `ComboDetails` | BE→FE JSON | FE wire `ComboRaw` | FE enriched `Combo` |
|---|---|---|---|---|---|
| `id` | CHAR(36) PK UUID | `ID string` | `string` | `string` | `string` |
| `category_id` | CHAR(36) **NULL** FK→categories SET NULL | `CategoryID string` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ | `string \| null` |
| `name` | VARCHAR(150) NOT NULL | `Name string` | `string` | `string` | `string` |
| `description` | TEXT NULL | `Description string` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ | `string \| null` |
| `price` | DECIMAL(10,0) NOT NULL | `Price int64` | `number` | `number` | `number` |
| `image_path` | VARCHAR(500) NULL — object path | `ImagePath string` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ | `string \| null` |
| `is_available` | TINYINT(1) DEFAULT 1 | `IsAvailable bool` | `boolean` | `boolean` | `boolean` |
| `sort_order` | INT DEFAULT 0 | `SortOrder int32` | `number` | `number` | `number` |
| items | rows in `combo_items` | `Items []ComboItemDetails` | `combo_items: [{id, product_id, quantity}]` | `combo_items` (same) | `items: ComboItem[]` (enriched) |

### 1B. Combo-item attributes (the template line)

> DB `combo_items` is a **static template**. The wire sends only 3 fields; the FE enriches the rest.

| Attribute | DB `combo_items` | BE→FE JSON | FE wire `ComboRaw.combo_items[n]` | FE enriched `ComboItem` |
|---|---|---|---|---|
| `id` | CHAR(36) PK UUID | `string` | `string` | — (dropped on enrich) |
| `combo_id` | CHAR(36) FK→combos CASCADE | — (nested) | — | — |
| `product_id` | CHAR(36) FK→products RESTRICT | `string` | `string` | `string` |
| `product_name` | — | — | — | `string` — FE lookup; falls back to raw id ⚠️ |
| `quantity` | INT DEFAULT 1 CHECK >0 | `number` | `number` | `number` |
| `unit_price?` | — | — | — | `number \| undefined` — FE lookup, display only |
| `toppings?` | — | — | — | `Topping[]` — FE lookup (TOP-3 enrichment) |

---

## §2 — Detail Tables (every object, all attributes)

### 2.1 DB `combos` — migration `004_combos.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `category_id` | CHAR(36) **NULL**, FK→categories **SET NULL** | nullable (v1.1) — unlike products, a combo need not have a category |
| `name` | VARCHAR(150) NOT NULL | |
| `description` | TEXT NULL | |
| `price` | DECIMAL(10,0) NOT NULL | the combo's own list price (what the customer pays) |
| `image_path` | VARCHAR(500) NULL | relative object path. **NOT** `image_url` |
| `is_available` | TINYINT(1) DEFAULT 1 | |
| `sort_order` | INT DEFAULT 0 | added v1.1 |
| `created_at` / `updated_at` | DATETIME | |
| `deleted_at` | DATETIME NULL | soft delete |

### 2.2 DB `combo_items` — static template

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK UUID | |
| `combo_id` | CHAR(36) FK→combos CASCADE | |
| `product_id` | CHAR(36) FK→products RESTRICT | which dish is in the combo |
| `quantity` | INT DEFAULT 1, CHECK > 0 | how many of that dish |
| `created_at` / `updated_at` | DATETIME | |

> **At order time** the BE does NOT copy `combo_items` verbatim: it expands the combo into `order_items`
> rows — 1 header row (`combo_id` set, `unit_price=0`) + N sub-item rows (`combo_ref_id`=header id).
> The kitchen sees individual dishes, not the combo label. Full detail → [OBJECT_MODEL_ORDER.md §2.6](OBJECT_MODEL_ORDER.md).

### 2.3 FE types — `fe/src/types/product.ts`

```ts
// Raw shape straight off GET /combos
interface ComboRaw {
  id:           string
  category_id:  string | null   // ⚠️ BE sends "" not null
  name:         string
  description:  string | null   // ⚠️ same
  price:        number
  image_path:   string | null   // ⚠️ same
  sort_order:   number
  is_available: boolean
  combo_items:  { id: string; product_id: string; quantity: number }[]
}

// Enriched shape components actually use (product names/prices/toppings resolved)
interface Combo {
  id:           string
  category_id:  string | null
  name:         string
  description:  string | null
  price:        number
  image_path:   string | null
  sort_order:   number
  is_available: boolean
  items:        ComboItem[]      // combo_items joined against all-products map
}

interface ComboItem {
  product_id:   string
  product_name: string           // resolved; falls back to raw product_id if missing ⚠️
  quantity:     number
  unit_price?:  number           // display only
  toppings?:    Topping[]
}
```

---

## §2.4 — Real object example (same combo across layers)

```jsonc
// DB — combos row + 2 combo_items template rows
// combos: id=cb1 name="Combo bánh cuốn + chả" price=60000 category_id=NULL
// combo_items: {id=ci1, combo_id=cb1, product_id=p1, quantity=1}
//              {id=ci2, combo_id=cb1, product_id=p2, quantity=1}

// BE→FE — wire (ComboRaw); category_id NULL → ""
{
  "id": "cb1",
  "category_id": "",
  "name": "Combo bánh cuốn + chả",
  "description": "",
  "price": 60000,
  "image_path": "combos/combo-1.jpg",
  "sort_order": 0,
  "is_available": true,
  "combo_items": [
    { "id": "ci1", "product_id": "p1", "quantity": 1 },
    { "id": "ci2", "product_id": "p2", "quantity": 1 }
  ]
}

// FE — after useMemo enrichment (Combo): product_id joined against all-products map
{
  "id": "cb1", "name": "Combo bánh cuốn + chả", "price": 60000, "is_available": true,
  "items": [
    { "product_id": "p1", "product_name": "Bánh cuốn thịt", "quantity": 1, "unit_price": 35000, "toppings": [/* TOP-3 */] },
    { "product_id": "p2", "product_name": "Chả lụa",        "quantity": 1, "unit_price": 25000, "toppings": [] }
  ]
}
```

The reader follows one combo: a static DB template → minimal wire shape → enriched FE object whose
item names/prices were resolved client-side — then, at order time, expanded into `order_items`
(see the Order home file).

---

## §3 — Flags / Known Mismatches

| # | Mismatch | Detail |
|---|---|---|
| 1 | **Two FE shapes for one model** | `ComboRaw` (wire) vs `Combo` (enriched). `ComboRaw` never reaches components. Enrichment lives in `menu/page.tsx` `useMemo`. |
| 2 | **Enrichment degrades silently** | If a combo references a `product_id` missing from the `products-all` result, `product_name` falls back to the **raw UUID** and `unit_price`/`toppings` are `undefined` — no error path. |
| 3 | **Null convention** | Same `""`-not-`null` caveat as Product/Order: BE sends `category_id`, `description`, `image_path` as `""`; FE types say `string \| null`. |
| 4 | **Template ≠ order rows** | `combo_items` is a *static* template. Never assume order `total_amount` = sum of `combo_items` prices — pricing comes from the combo's own `price` and the order-time expansion (header `unit_price=0`). |
