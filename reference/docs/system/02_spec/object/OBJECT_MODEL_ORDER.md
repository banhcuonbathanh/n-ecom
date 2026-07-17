# Object Model — Order Pipeline (FE ⇄ BE ⇄ DB)

> Generated 2026-06-13 · traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/types/cart.ts` · `fe/src/lib/order-payload.ts` · `fe/src/types/order.ts` ·
> `be/internal/handler/order_handler.go` · migrations 005/008/015 (via `docs/be/be_code_summary/DB_SCHEMA_SUMMARY.md`).
>
> **Purpose:** see every attribute of the Order object at every layer side-by-side, to verify the layers match.

```
WRITE:  CartItem (Zustand) → buildOrderItemsPayload → POST /orders JSON → createOrderReq (Go) → orders + order_items (MySQL)
READ:   orders + order_items (MySQL) → OrderDetails (service) → orderJSON (response) → Order / OrderItem (TS)
```

---

## §1 — Comparison Matrix (all attributes, all layers)

Legend: `—` = attribute does not exist at that layer · ⚠️ = mismatch, see [§3 Flags](#3--flags--known-mismatches).

### 1A. Order-level attributes

> The FE cart has no order-level object — `table_id`, `source`, `customer_*` are assembled per page at checkout time.

| Attribute | FE→BE request body | BE DTO `createOrderReq` | DB `orders` | BE→FE `orderJSON` | FE type `Order` |
|---|---|---|---|---|---|
| `id` | — (server-generated) | — | `id CHAR(36) PK` UUID | `id: string` | `id: string` |
| `order_number` | — (server-generated) | — | `order_number VARCHAR(30) UNIQUE` | `order_number: string` | `order_number: string` |
| `table_id` | `table_id?: string` | `TableID string` | `table_id CHAR(36) NULL` FK→tables | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ |
| `table_name` | — | — | — (join on `tables.name`) | `table_name: string` | `table_name?: string \| null` |
| `status` | — (server-set: `pending`) | — | ENUM 7 values (`paid` = mig 015) | `status: string` | `OrderStatus` union (7) |
| `source` | `source: 'online'\|'qr'\|'pos'` **req** | `Source string` oneof | ENUM('online','qr','pos') | `source: string` | `'online'\|'qr'\|'pos'` |
| `customer_name` | `customer_name?: string` | `CustomerName string` | `customer_name VARCHAR(100) NULL` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ |
| `customer_phone` | `customer_phone?: string` | `CustomerPhone string` | `customer_phone VARCHAR(20) NULL` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ |
| `note` | `note?: string` | `Note string` | `note TEXT NULL` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ |
| `total_amount` | — (server-computed) | — | `DECIMAL(10,0)` denormalized | `number` via `ParsePrice` | `total_amount: number` |
| `created_by` | — (from JWT, not body) | — | `created_by CHAR(36) NULL` FK→staff | `string` — NULL→`""` | — (not typed) |
| `group_id` | — | — | `group_id CHAR(36) NULL` (mig 008) | — (group endpoints only) | — |
| `created_at` | — | — | `DATETIME` | ISO string | `created_at: string` |
| `updated_at` | — | — | `DATETIME` | ISO string | `updated_at?: string` |
| `deleted_at` | — | — | `DATETIME NULL` soft delete | — (filtered out) | — |
| `items` | `items[]` **req min 1** | `Items []createOrderItemReq` | rows in `order_items` | `items: []` | `items: OrderItem[]` |

### 1B. Item-level attributes

| Attribute | FE `CartItem` (store) | FE `OrderItemPayload` (wire) | BE DTO `createOrderItemReq` | DB `order_items` | BE→FE item JSON | FE type `OrderItem` |
|---|---|---|---|---|---|---|
| `id` | `id: string` cart-local key | — | — | `id CHAR(36) PK` UUID | `id: string` | `id: string` |
| `type` | `'product' \| 'combo'` | — (implied by which id is set) | — | — (derived, see row-type matrix) | — | — |
| `order_id` | — | — | — (from URL/created order) | `order_id CHAR(36)` FK CASCADE | — (nested in order) | — |
| `product_id` | `product_id?: string` | `string \| null` | `ProductID string` XOR combo_id | `CHAR(36) NULL` | `string \| null` | `string \| null` |
| `combo_id` | `combo_id?: string` | `string \| null` | `ComboID string` | `CHAR(36) NULL` | `string \| null` | `string \| null` |
| `combo_ref_id` | — | — | — (server-set on expand) | `CHAR(36) NULL` self-FK | `string \| null` | `string \| null` |
| `name` | `name: string` display only | — (never sent) | — | `name VARCHAR(200)` **snapshot** | `name: string` | `name: string` |
| price | `price: number` display only | — (never sent) | — | `unit_price DECIMAL(10,0)` **snapshot**; combo header = **0** | `unit_price: number` via `ParsePrice` | `unit_price: number` |
| `quantity` | `quantity: number` | `quantity: number` | `Quantity int32` req min 1 | `quantity INT >0` | `quantity: number` | `quantity: number` |
| `qty_served` | — | — | — (separate PATCH by chef) | `qty_served INT` 0..quantity | `qty_served: number` | `qty_served: number` |
| toppings | `toppings: Topping[]` full objects | `topping_ids: string[]` ids only | `ToppingIDs []string` | `toppings_snapshot JSON` `[{id,name,price}]` | `toppings_snapshot: [] \| null` | `ToppingSnapshotEntry[] \| null` |
| `note` | — (not in CartItem) | `note?: string` | `Note string` | `note TEXT NULL` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ |
| `combo_items` | `combo_items?: ComboItemSummary[]` | `combo_items?: override[]` | `ComboItems []comboItemOverrideReq` | — (expanded into sub-item rows) | — (sub-items are rows) | — |
| `item_status` | — | — | — | — (derived from `qty_served`) | `item_status: string` | — ⚠️ FE re-derives via `deriveItemStatus()` |
| `flagged` | — | — | — | — **column does not exist** | — never sent | `flagged: boolean` ⚠️ phantom |
| `filling` | — | — | — | — **not on this branch** ⚠️ | — | — |
| `created_at`/`updated_at` | — | — | — | `DATETIME` | — (not serialized) | — |

---

## §2 — Detail Tables (every object, all attributes)

### 2.1 FE `CartItem` — Zustand cart store · `fe/src/types/cart.ts`

| Attribute | Type | Notes |
|---|---|---|
| `id` | `string` | Cart-local key: `product_<id>_<toppingIds>` \| `combo_<id>` \| `canh_<id>_rau\|plain` — never sent to BE |
| `type` | `'product' \| 'combo'` | Discriminator |
| `product_id?` | `string` | UUID, set when type=product |
| `combo_id?` | `string` | UUID, set when type=combo |
| `name` | `string` | Display only — BE re-snapshots its own name |
| `quantity` | `number` | |
| `price` | `number` | Unit price incl. toppings — display only, BE never trusts it |
| `toppings` | `Topping[]` | `{id, name, price, is_available}` |
| `combo_items?` | `ComboItemSummary[]` | See 2.2 |

### 2.2 FE `ComboItemSummary` — combo contents inside a CartItem

| Attribute | Type | Notes |
|---|---|---|
| `product_id?` | `string` | Needed to send combo content overrides at checkout |
| `product_name` | `string` | Used to strip canh sub-items from combos |
| `quantity` | `number` | |
| `unit_price?` | `number` | Display only |
| `toppings?` | `Topping[]` | TOP-3 enrichment |

### 2.3 FE→BE request — `POST /orders` body · assembled per page + `fe/src/lib/order-payload.ts`

Top level:

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `table_id` | `string` | no | omitted = online order |
| `source` | `'online' \| 'qr' \| 'pos'` | **yes** | |
| `customer_name` | `string` | no | |
| `customer_phone` | `string` | no | |
| `note` | `string` | no | Order-level note |
| `items` | `OrderItemPayload[]` | **yes, min 1** | Built ONLY by `buildOrderItemsPayload()` |

`OrderItemPayload` (each item):

| Attribute | Type | Notes |
|---|---|---|
| `product_id` | `string \| null` | Exactly one of product_id / combo_id set |
| `combo_id` | `string \| null` | |
| `quantity` | `number` | |
| `topping_ids` | `string[]` | Nhân (thịt/mộc nhĩ) + rau travel here; `[]` for combos |
| `note?` | `string` | |
| `combo_items?` | `{product_id, quantity, note?, topping_ids?}[]` | Combo overrides; canh stripped (sent as standalone rows) |

> No prices, no names on the wire — BE snapshots both server-side so the client can never set its own price.

### 2.4 BE request DTOs — `be/internal/handler/order_handler.go:26-65`

`createOrderReq`:

| Field | Go type | JSON key | Binding |
|---|---|---|---|
| `TableID` | `string` | `table_id` | optional |
| `Source` | `string` | `source` | `required,oneof=online qr pos` |
| `CustomerName` | `string` | `customer_name` | optional |
| `CustomerPhone` | `string` | `customer_phone` | optional |
| `Note` | `string` | `note` | optional |
| `Items` | `[]createOrderItemReq` | `items` | `required,min=1` |

`createOrderItemReq`:

| Field | Go type | JSON key | Binding |
|---|---|---|---|
| `ProductID` | `string` | `product_id` | XOR with combo_id (service-validated) |
| `ComboID` | `string` | `combo_id` | |
| `Quantity` | `int32` | `quantity` | `required,min=1` |
| `ToppingIDs` | `[]string` | `topping_ids` | optional |
| `Note` | `string` | `note` | optional |
| `ComboItems` | `[]comboItemOverrideReq` | `combo_items` | optional overrides |

`comboItemOverrideReq`:

| Field | Go type | JSON key | Binding |
|---|---|---|---|
| `ProductID` | `string` | `product_id` | `required`, must ∈ combo template |
| `Quantity` | `int32` | `quantity` | `required,min=1` |
| `Note` | `string` | `note` | optional |
| `ToppingIDs` | `[]string` | `topping_ids` | optional |

### 2.5 DB `orders` — migration 005 + 008 (`group_id`) + 015 (`paid`)

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `order_number` | VARCHAR(30) UNIQUE | `ORD-YYYYMMDD-NNN` — Redis counter, DB `order_sequences` fallback |
| `table_id` | CHAR(36) NULL, FK→tables RESTRICT | NULL = online |
| `status` | ENUM('pending','confirmed','preparing','ready','delivered','cancelled','paid') | default `pending` — BE-set, never from client |
| `source` | ENUM('online','qr','pos') | from request |
| `customer_name` | VARCHAR(100) NULL | |
| `customer_phone` | VARCHAR(20) NULL | |
| `note` | TEXT NULL | |
| `total_amount` | DECIMAL(10,0) | **Denormalized** — `recalculateTotalAmount` after every item mutation |
| `created_by` | CHAR(36) NULL, FK→staff SET NULL | NULL = customer self-order (from JWT, not body) |
| `group_id` | CHAR(36) NULL | Multi-table group; no hard FK |
| `created_at` / `updated_at` | DATETIME | |
| `deleted_at` | DATETIME NULL | soft delete |

### 2.6 DB `order_items` — migration 005

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `order_id` | CHAR(36) FK→orders CASCADE | |
| `product_id` | CHAR(36) NULL | NULL on combo header row |
| `combo_id` | CHAR(36) NULL | NULL on standalone / sub-item |
| `combo_ref_id` | CHAR(36) NULL self-FK | sub-item → its header row |
| `name` | VARCHAR(200) | **Snapshot** at order time |
| `unit_price` | DECIMAL(10,0) | **Snapshot**; combo header forced to **0** (label row — prevents double-count) |
| `quantity` | INT, CHECK > 0 | |
| `qty_served` | INT, CHECK 0..quantity | Chef increments; item status **derived** from this (no status column) |
| `toppings_snapshot` | JSON NULL | `[{id,name,price}]` frozen at order time |
| `note` | TEXT NULL | |
| `created_at` / `updated_at` | DATETIME | |

Row-type matrix (CHECK constraint `chk_oi_item_type`):

| Row type | product_id | combo_id | combo_ref_id | unit_price |
|---|---|---|---|---|
| Standalone product | ✔ | NULL | NULL | real |
| Combo **header** | NULL | ✔ | NULL | **0** |
| Combo **sub-item** | ✔ | NULL | ✔ header id | real |

### 2.7 BE→FE response — `orderJSON()` · `be/internal/handler/order_handler.go:318-389`

> Used by `GET /orders`, `/orders/:id`, `/orders/live`, `/orders/history`.
> Twin serializer `buildItemsJSON()` in `service/group_service.go` feeds Admin Overview SSE — keep both in sync when adding item fields.

Order level — `{"data": {...}}`:

| JSON key | Wire type | From | Transform |
|---|---|---|---|
| `id` | string | orders.id | — |
| `order_number` | string | orders.order_number | — |
| `table_id` | string | orders.table_id | NULL → `""` (empty string, not null) |
| `table_name` | string | join on tables | service enrichment |
| `status` | string | orders.status | enum → string |
| `source` | string | orders.source | enum → string |
| `customer_name` | string | orders.customer_name | NULL → `""` |
| `customer_phone` | string | orders.customer_phone | NULL → `""` |
| `note` | string | orders.note | NULL → `""` |
| `total_amount` | number | orders.total_amount | `ParsePrice` — DECIMAL string → number |
| `created_by` | string | orders.created_by | NULL → `""` |
| `created_at` / `updated_at` | string | timestamps | Go time → ISO string |
| `items` | array | order_items | below |

Item level:

| JSON key | Wire type | From | Transform |
|---|---|---|---|
| `id` | string | order_items.id | — |
| `product_id` | string \| **null** | order_items.product_id | NULL stays `null` (unlike order-level) |
| `combo_id` | string \| null | order_items.combo_id | |
| `combo_ref_id` | string \| null | order_items.combo_ref_id | |
| `name` | string | order_items.name | snapshot |
| `unit_price` | number | order_items.unit_price | `ParsePrice` |
| `quantity` | number | order_items.quantity | |
| `qty_served` | number | order_items.qty_served | |
| `item_status` | string | **derived** in service | `qty_served`: 0→pending, partial→preparing, =qty→done |
| `toppings_snapshot` | array \| null | order_items.toppings_snapshot | JSON column passthrough |
| `note` | string | order_items.note | NULL → `""` |

### 2.8 FE consumed types — `fe/src/types/order.ts`

`Order`:

| Attribute | Type | Maps from response key |
|---|---|---|
| `id` | `string` | `id` |
| `order_number` | `string` | `order_number` |
| `status` | `OrderStatus` union (7 values) | `status` |
| `source` | `'online' \| 'qr' \| 'pos'` | `source` |
| `table_id` | `string \| null` | `table_id` ⚠️ BE actually sends `""`, never null |
| `table_name?` | `string \| null` | `table_name` |
| `customer_name` | `string \| null` | ⚠️ same `""` caveat |
| `customer_phone` | `string \| null` | ⚠️ same |
| `total_amount` | `number` | `total_amount` |
| `note` | `string \| null` | ⚠️ same |
| `created_at` / `updated_at?` | `string` | timestamps |
| `items` | `OrderItem[]` | `items` |

`OrderItem`:

| Attribute | Type | Maps from response key |
|---|---|---|
| `id` | `string` | `id` |
| `product_id` | `string \| null` | `product_id` |
| `combo_id` | `string \| null` | `combo_id` — FE hides header rows (`combo_id && !combo_ref_id`) when summing |
| `combo_ref_id` | `string \| null` | `combo_ref_id` |
| `name` | `string` | `name` |
| `quantity` | `number` | `quantity` |
| `qty_served` | `number` | `qty_served` |
| `unit_price` | `number` | `unit_price` |
| `note` | `string \| null` | ⚠️ `""` caveat |
| `toppings_snapshot` | `ToppingSnapshotEntry[] \| null` | `toppings_snapshot` |
| `flagged` | `boolean` | ⚠️ phantom — never sent, no DB column |

FE re-derives item status locally via `deriveItemStatus(qty_served, quantity)` instead of typing the `item_status` the BE sends.

---

## §3 — Flags / Known Mismatches

| # | Mismatch | Detail |
|---|---|---|
| 1 | **`filling` absent on this branch** | CLAUDE.md + `BE_API_DTO.md` describe the OC epic (`order_items.filling`, migration 016) as done — that code lives on `feature/fe-wireframe-build`, NOT on `experience_claude.md_system_1`. Zero occurrences in `order_handler.go` / `order_service.go` / `order-payload.ts` here. On the OC branch, add `filling: 'thit'\|'moc_nhi'\|null` to layers 2.3–2.8. |
| 2 | **`OrderItem.flagged` is phantom** | Declared required `boolean` in `fe/src/types/order.ts` but no DB column (Issue #5) and `orderJSON` never sends it → always `undefined` at runtime. |
| 3 | **Null convention mismatch** | BE sends order-level nullables (`table_id`, `customer_name`, `note`…) as `""` but item-level nullables (`product_id`, `combo_id`…) as real `null`. FE types say `string \| null` for both, so `=== null` checks on order-level fields never match. |
| 4 | **`item_status` sent but untyped on FE** | BE serializes `item_status`; FE `OrderItem` doesn't declare it and re-derives locally. Harmless duplication, but two sources for the same fact. |
