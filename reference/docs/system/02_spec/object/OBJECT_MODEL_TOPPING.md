# Object Model — Topping (FE ⇄ BE ⇄ DB)

> Generated 2026-06-13 · traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/types/product.ts` (`Topping`) · `fe/src/types/order.ts` (`ToppingSnapshotEntry`) ·
> `be/internal/handler/product_handler.go` (toppings nested in `productJSON`) · migration
> `002_products.sql` (`toppings`, `product_toppings`).
>
> **Single home** for the Topping model (Rule #9) — other docs link here, don't re-list fields.
> See [OBJECT_MODELS.md](OBJECT_MODELS.md). Data instances → [MENU_CATALOG.md §2](MENU_CATALOG.md).

```
READ:  toppings MySQL → nested under each product (productJSON.toppings[]) → Topping[] (TS)
WRITE: admin only — managed via product/topping admin endpoints
ORDER: at order time a chosen topping is COPIED into order_items.toppings_snapshot (ToppingSnapshotEntry)
```

> A topping is **not** ordered on its own — it is selected for a product (`product_toppings` says which
> toppings a product allows) and then **snapshotted** onto the order item. The live `toppings` row can
> change later; the snapshot on a placed order never does. Snapshot shape → [Order home §2](OBJECT_MODEL_ORDER.md).

---

## §1 — Comparison Matrix

Legend: `—` = absent at that layer · ⚠️ = mismatch, see [§3](#3--flags--known-mismatches).

| Attribute | DB `toppings` | BE→FE JSON (nested in product) | FE `Topping` | FE `ToppingSnapshotEntry` (on order) |
|---|---|---|---|---|
| `id` | CHAR(36) PK UUID | `string` | `string` | `string` |
| `name` | VARCHAR(100) NOT NULL | `string` | `string` | `string` |
| `price` | DECIMAL(10,0) DEFAULT 0 | `number` | `number` | `number` |
| `is_available` | TINYINT(1) DEFAULT 1 | `boolean` | `boolean` | — (not snapshotted) |
| link | `product_toppings(product_id, topping_id)` | (resolved into product) | — | — |

---

## §2 — Detail Tables

### 2.1 DB `toppings` — migration `002_products.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(100) NOT NULL | e.g. "Nhân thịt" |
| `price` | DECIMAL(10,0) DEFAULT 0 | in seed all toppings are **₫0** — cost baked into the dish |
| `is_available` | TINYINT(1) DEFAULT 1 | |
| `created_at` / `updated_at` | DATETIME | |
| `deleted_at` | DATETIME NULL | soft delete |

### 2.2 DB `product_toppings` — which toppings a product allows

| Column | Type | Notes |
|---|---|---|
| `product_id` | CHAR(36) FK→products | composite PK |
| `topping_id` | CHAR(36) FK→toppings | composite PK |

### 2.3 FE types — `fe/src/types/product.ts` + `order.ts`

```ts
interface Topping {              // menu/selection time
  id:           string
  name:         string
  price:        number
  is_available: boolean
}

interface ToppingSnapshotEntry { // frozen onto a placed order item
  id:    string
  name:  string
  price: number
}
```

---

## §2.4 — Real object example (from the seed)

```jsonc
// DB — toppings row
// id=bbbbbbbb-…-000000000001 name="Nhân thịt" price=0 is_available=1

// BE→FE — nested under a product (Giò allows nhân thịt / nhân mộc nhĩ)
{ "id": "bbbb…0001", "name": "Nhân thịt", "price": 0, "is_available": true }

// DB — once ordered, copied into order_items.toppings_snapshot (is_available dropped)
// '[{"id":"bbbb…0001","name":"Nhân thịt","price":0}]'
```

The reader follows one topping: a free "Nhân thịt" allowed on a product → selected → frozen onto the
order item as a snapshot that never changes even if the live topping is renamed or removed.

---

## §3 — Flags / Known Mismatches

| # | Mismatch | Detail |
|---|---|---|
| 1 | **`is_available` dropped on snapshot** | The order snapshot keeps only `{id, name, price}` — availability is a live concept, irrelevant once frozen. |
| 2 | **Not a top-level resource** | Toppings are never fetched on their own by the customer FE; they arrive nested inside each product. `product_toppings` decides which appear. |
| 3 | **Free in this menu** | Every seeded topping is ₫0. The schema allows a price, so don't assume `price === 0` in code. |
