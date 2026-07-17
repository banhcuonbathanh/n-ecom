# Object Model — Product (FE ⇄ BE ⇄ DB)

> Generated 2026-06-13 · traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/types/product.ts` · `be/internal/handler/product_handler.go` (`productJSON`) ·
> migration `002_products.sql` (`products`, `toppings`, `product_toppings`).
>
> **Purpose:** every attribute of the Product object at every layer, side-by-side, so the layers can
> be verified against each other. This is the **single home** for the Product model (Rule #9) — other
> docs link here and do not re-list these fields. See [OBJECT_MODELS.md](OBJECT_MODELS.md).

```
READ:   products (+ product_toppings → toppings) MySQL → ProductDetails (service) → productJSON (response) → Product (TS)
WRITE:  admin only — POST/PATCH /products (key fields: name, price, category_id, topping_ids[]) → see API_SPEC + admin_products page
```

> Product is **read-mostly** for customers (catalog browse). The customer never writes a Product —
> writes are admin CRUD only. This file documents the canonical read shape in full; the write DTOs
> are summarized in [API_SPEC.md](../API_SPEC.md) and [../08_pages/admin/admin_products/admin_products.md](../../08_pages/admin/admin_products/admin_products.md).

---

## §1 — Comparison Matrix (all attributes, all layers)

Legend: `—` = absent at that layer · ⚠️ = mismatch, see [§3 Flags](#3--flags--known-mismatches).

| Attribute | DB `products` | BE service `ProductDetails` | BE→FE JSON `productJSON` | FE type `Product` |
|---|---|---|---|---|
| `id` | CHAR(36) PK UUID | `ID string` | `string` | `string` |
| `category_id` | CHAR(36) NOT NULL FK→categories RESTRICT | `CategoryID string` | `string` | `string` |
| `category_name` | — (join on `categories.name`) | `CategoryName string` | `string` | `string` |
| `name` | VARCHAR(150) NOT NULL | `Name string` | `string` | `string` |
| `description` | TEXT NULL | `Description string` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ |
| `price` | DECIMAL(10,0) NOT NULL | `Price int64` | `number` | `number` |
| `image_path` | VARCHAR(500) NULL — **object path, NOT full URL** | `ImagePath string` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ |
| `is_available` | TINYINT(1) DEFAULT 1 | `IsAvailable bool` | `boolean` | `boolean` |
| `sort_order` | INT DEFAULT 0 | `SortOrder int32` | `number` | `number` |
| `toppings` | via `product_toppings` junction → `toppings` rows | `Toppings []ToppingItem` | array of Topping objects (§2.2) | `Topping[]` |
| `created_at`/`updated_at`/`deleted_at` | DATETIME (`deleted_at` = soft delete) | — | — (not serialized) | — |

---

## §2 — Detail Tables (every object, all attributes)

### 2.1 DB `products` — migration `002_products.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID, `DEFAULT (UUID())` |
| `category_id` | CHAR(36) NOT NULL, FK→categories RESTRICT | every product belongs to a category |
| `name` | VARCHAR(150) NOT NULL | |
| `description` | TEXT NULL | |
| `price` | DECIMAL(10,0) NOT NULL | VND, no decimals. **NOT** `base_price` |
| `image_path` | VARCHAR(500) NULL | relative object path. **NOT** `image_url`, no slug column |
| `is_available` | TINYINT(1) DEFAULT 1 | list endpoint returns only `is_available=1` |
| `sort_order` | INT DEFAULT 0 | display order |
| `created_at` / `updated_at` | DATETIME | |
| `deleted_at` | DATETIME NULL | soft delete — filtered out everywhere |

### 2.2 Topping (nested in every product) — DB `toppings` + `product_toppings`

> Toppings have no standalone customer fetch — they arrive nested inside each product via `productJSON`.

| Attribute | DB `toppings` | BE→FE JSON (nested) | FE type `Topping` |
|---|---|---|---|
| `id` | CHAR(36) PK UUID | `string` | `string` |
| `name` | VARCHAR(100) NOT NULL | `string` | `string` |
| `price` | DECIMAL(10,0) DEFAULT 0 | `number` (int64) | `number` |
| `is_available` | TINYINT(1) DEFAULT 1 | `boolean` | `boolean` |

Product↔Topping link: junction `product_toppings (product_id, topping_id)`, both FK CASCADE — never
serialized directly; BE resolves it into the nested `toppings` array.

### 2.3 FE type `Product` — `fe/src/types/product.ts`

```ts
interface Product {
  id:            string
  category_id:   string
  category_name: string
  name:          string
  description:   string | null   // ⚠️ BE sends "" not null — see §3
  price:         number
  image_path:    string | null   // ⚠️ same; relative object path, prepend storage base URL
  is_available:  boolean
  sort_order:    number
  toppings:      Topping[]
}
```

---

## §2.4 — Real object example (same product across layers)

```jsonc
// DB — products row + 2 product_toppings links
// id=p1 category_id=c1 name="Bánh cuốn thịt" price=35000
// image_path="products/banh-cuon-thit.jpg" is_available=1 sort_order=0

// BE→FE — productJSON response (toppings resolved from junction; NULLs → "")
{
  "id": "p1",
  "category_id": "c1",
  "category_name": "Bánh cuốn",
  "name": "Bánh cuốn thịt",
  "description": "",
  "price": 35000,
  "image_path": "products/banh-cuon-thit.jpg",
  "is_available": true,
  "sort_order": 0,
  "toppings": [
    { "id": "t1", "name": "Thịt", "price": 0, "is_available": true },
    { "id": "t2", "name": "Mộc nhĩ", "price": 5000, "is_available": true }
  ]
}

// FE — consumed as Product; image_path needs the storage base URL prepended to render
```

---

## §3 — Flags / Known Mismatches

| # | Mismatch | Detail |
|---|---|---|
| 1 | **Null convention** | BE serializes nullable strings (`description`, `image_path`) as `""`, never `null`. FE `Product` types them `string \| null`, so `=== null` checks never match — same caveat as the Order model. |
| 2 | **`image_path` is not a URL** | It's a relative object path; the FE must prepend the storage base URL before rendering. Easy to mistake for a full `image_url`. |
| 3 | **Toppings list is availability-filtered upstream, not per-product** | `is_available` exists on both product and topping; a product can be available while a nested topping is not. |
