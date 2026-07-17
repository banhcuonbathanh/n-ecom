# Object Model — Category (FE ⇄ BE ⇄ DB)

> Generated 2026-06-13 · traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/types/product.ts` (`Category`) · `be/internal/handler/product_handler.go`
> (`ListCategories` serializer) · migration `002_products.sql` (`categories`).
>
> **Single home** for the Category model (Rule #9). See [OBJECT_MODELS.md](OBJECT_MODELS.md).
> Data instances → [MENU_CATALOG.md §1](MENU_CATALOG.md).

```
READ:  categories MySQL → ListCategories serializer → GET /categories → Category[] (TS, used for tabs)
WRITE: manager+ — POST/PUT /categories · DELETE = admin only
```

> A category groups products (and combos). `products.category_id` is **NOT NULL** (every product has
> one); `combos.category_id` is **nullable**. The customer menu renders one tab per category.

---

## §1 — Comparison Matrix

Legend: `—` = absent at that layer · ⚠️ = mismatch, see [§3](#3--flags--known-mismatches).

| Attribute | DB `categories` | BE→FE JSON | FE `Category` |
|---|---|---|---|
| `id` | CHAR(36) PK UUID | `string` | `string` |
| `name` | VARCHAR(100) NOT NULL | `string` | `string` |
| `description` | TEXT NULL | `string` — NULL→`""` | — ⚠️ (BE sends it, FE type omits) |
| `sort_order` | INT DEFAULT 0 | `number` | `number` |
| `is_active` | TINYINT(1) DEFAULT 1 | `boolean` | — ⚠️ (BE sends it, FE type omits) |

---

## §2 — Detail Tables

### 2.1 DB `categories` — migration `002_products.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(100) NOT NULL | e.g. "Bánh Cuốn" |
| `description` | TEXT NULL | optional blurb |
| `sort_order` | INT DEFAULT 0 | tab order on the menu |
| `is_active` | TINYINT(1) DEFAULT 1 | hidden categories stay in DB |
| `created_at` / `updated_at` | DATETIME | |
| `deleted_at` | DATETIME NULL | soft delete |

### 2.2 BE serializer — `ListCategories` (`product_handler.go`)

Returns `{ id, name, description, sort_order, is_active }`. `description` NULL is coalesced to `""`.

### 2.3 FE type — `fe/src/types/product.ts`

```ts
interface Category {
  id:         string
  name:       string
  sort_order: number   // description + is_active are sent by BE but NOT typed here
}
```

---

## §2.4 — Real object example (from the seed)

```jsonc
// DB — categories row
// id=aaaaaaaa-…-000000000001 name="Bánh Cuốn"
// description="Giò · bánh trứng · bánh cuốn — khách chọn nhân" sort_order=1 is_active=1

// BE→FE — GET /categories item
{ "id": "aaaa…0001", "name": "Bánh Cuốn",
  "description": "Giò · bánh trứng · bánh cuốn — khách chọn nhân",
  "sort_order": 1, "is_active": true }

// FE — Category (TS consumes only id/name/sort_order; extra fields ignored)
{ "id": "aaaa…0001", "name": "Bánh Cuốn", "sort_order": 1 }
```

---

## §3 — Flags / Known Mismatches

| # | Mismatch | Detail |
|---|---|---|
| 1 | **FE type narrower than wire** | BE sends `description` + `is_active`; the FE `Category` interface omits both. Harmless (extra JSON fields are ignored) but the type lies about the payload. |
| 2 | **Product FK NOT NULL, Combo FK nullable** | `products.category_id` is required; `combos.category_id` can be NULL — see [Combo §2.1](OBJECT_MODEL_COMBO.md). |
