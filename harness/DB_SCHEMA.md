# DB_SCHEMA.md — Canonical Database Design (F-16)

> **Single owner of tables, columns, and schema conventions.** Adopted by the owner
> (2026-07-18) from the reference object-model home files —
> `reference/docs/system/02_spec/object/` (`OBJECT_MODELS.md` + 8 per-model files,
> themselves traced from the old system's code, not its docs) — then **reconciled
> with our standing decisions**: every reference "Known Mismatch" flag gets an
> explicit ruling in §6. Migrations (F-3 onward) implement THIS file; if a migration
> and this file disagree, code wins and this file gets fixed in the same task
> (CLAUDE.md rule 5).
>
> Wire/DTO shapes are **not** re-listed here — per-model FE⇄wire⇄DB detail stays in
> the reference home files; our per-page wire galleries live in
> `plans/<page>/PLAN.md` (menu: `plans/customer_menu/PLAN.md §3.5`). Migration
> workmanship rules: `BE_PLAYBOOK.md §1–2`.

---

## 1. Conventions (every table, no exceptions)

Moved here from `OVERALL_PLAN.md §3.2` — this is now the home.

- **PK:** `id CHAR(36)` UUID, `DEFAULT (UUID())` — except pure junction tables
  (composite PK) and `order_sequences` (date PK).
- **Timestamps:** `created_at` / `updated_at DATETIME` on every table
  (`order_sequences` and junctions may drop `updated_at` when meaningless).
- **Soft delete:** `deleted_at DATETIME NULL` on every entity table; **every query
  filters it**. Junctions and ledgers (`stock_movements`) hard-delete via FK CASCADE.
- **Money:** `DECIMAL(10,0)` VND, no decimals. **Stock quantities:** `DECIMAL(10,3)`.
- **Booleans:** `TINYINT(1)`. **Closed sets:** ENUM. **Snapshots:** JSON.
- **Naming:** snake_case, plural table names.
- **Indexes:** every FK column + every `status` column; UNIQUE where §4 says so.
- **Derived facts get no column** (BE_PLAYBOOK migration checklist) — see
  `order_items.item_status`, ingredient `status`, `expiry_date` in §6.

## 2. Field-name law (canonical spellings — drift here caused real bugs)

Moved here from `OVERALL_PLAN.md §3.2`:

`price` (not base_price) · `image_path` relative object path (not image_url, no slug)
· `created_by` (not staff_id) · `gateway_data` (not webhook_payload) · payment status
`completed` (not success) · **no `order_items.status` column** (derived from
`qty_served` vs `quantity`) · **no `filling` column ever** (fillings are ₫0 toppings —
`plans/customer_menu/PLAN.md §3.4`).

## 3. Table inventory (~22 tables, introduced by phase)

| Phase | Tables | Spec status |
|---|---|---|
| C — catalog | `categories` `products` `toppings` `product_toppings` `combos` `combo_items` | §4.1 full |
| T — tables/guest | `tables` `order_sequences` | §4.2 full |
| O — ordering | `orders` `order_items` | §4.3 full |
| S — staff/auth | `staff` `refresh_tokens` | §4.4 full / stub |
| S·P — payments | `payments` | §4.5 stub (no reference home file — no seed data existed) |
| AD — inventory | `ingredients` `product_ingredients` `stock_movements` | §4.6 full |
| AD — workforce/files | `staff_tasks` **full** (F-22) · `training_guides` `training_progress` `file_attachments` stubs | §4.7 |

"Full" = column-complete, traced from the object spec. "Stub" = key decisions only;
column detail lands in that phase's plan page **and gets promoted into this file**
in the same task.

---

## 4. Table specs

### 4.1 Catalog (C-1 migration)

**`categories`** — home: `OBJECT_MODEL_CATEGORY.md`

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(100) NOT NULL | |
| `description` | TEXT NULL | |
| `sort_order` | INT DEFAULT 0 | menu tab order |
| `is_active` | TINYINT(1) DEFAULT 1 | hidden categories stay in DB |
| std | timestamps + `deleted_at` | |

**`products`** — home: `OBJECT_MODEL_PRODUCT.md`

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `category_id` | CHAR(36) **NOT NULL** FK→categories RESTRICT | every product has a category |
| `name` | VARCHAR(150) NOT NULL | |
| `description` | TEXT NULL | |
| `price` | DECIMAL(10,0) NOT NULL | law §2 |
| `image_path` | VARCHAR(500) NULL | relative object path, law §2 |
| `is_available` | TINYINT(1) DEFAULT 1 | list endpoints return only available |
| `sort_order` | INT DEFAULT 0 | |
| std | timestamps + `deleted_at` | |

**`toppings`** — home: `OBJECT_MODEL_TOPPING.md`

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(100) NOT NULL | |
| `price` | DECIMAL(10,0) DEFAULT 0 | seed is all ₫0 (fillings) — never assume 0 in code |
| `is_available` | TINYINT(1) DEFAULT 1 | |
| std | timestamps + `deleted_at` | |

**`product_toppings`** — junction, which toppings a product allows:
`(product_id FK→products CASCADE, topping_id FK→toppings CASCADE)` composite PK.

**`combos`** — home: `OBJECT_MODEL_COMBO.md`. Same shape as `products`
(`name` VARCHAR(150) · `description` · `price` NOT NULL = what the customer pays ·
`image_path` · `is_available` · `sort_order` · std) with **one difference**:
`category_id CHAR(36) NULL FK→categories SET NULL` — a combo need not have a category.

**`combo_items`** — static template (what's *in* the combo; never copied verbatim
into orders — see §4.3 row-type matrix):

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `combo_id` | CHAR(36) FK→combos CASCADE | |
| `product_id` | CHAR(36) FK→products RESTRICT | |
| `quantity` | INT DEFAULT 1, CHECK > 0 | |
| `created_at`/`updated_at` | DATETIME | no soft delete — template rows |

### 4.2 Tables & order numbering (T phase)

**`tables`** — home: `OBJECT_MODEL_TABLE.md`

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(50) NOT NULL | "Bàn 01" |
| `qr_token` | CHAR(64) NOT NULL **UNIQUE** | QR secret → guest JWT mint; staff-only exposure (§6 #10) |
| `capacity` | INT DEFAULT 4 | |
| `status` | ENUM('available','occupied','reserved','inactive') | flipped by order lifecycle only — never ad hoc |
| `is_active` | TINYINT(1) DEFAULT 1 | |
| std | timestamps + `deleted_at` | |

**`order_sequences`** — DB fallback for the `order_number` counter (Redis is
primary; Redis is wipeable per ARCHITECTURE §4):
`(seq_date DATE PK, current_value INT NOT NULL DEFAULT 0)`.

> **Counter re-seed rule (O phase, F-16 review):** on Redis counter miss (wipe,
> restart), the order service must re-seed the Redis counter from
> `order_sequences.current_value` **before** issuing a number — never restart at 1.
> The `UNIQUE order_number` constraint is the last line of defense, not the
> mechanism; without re-seeding, a mid-day wipe turns every new order into a
> UNIQUE-violation failure.

### 4.3 Ordering (O phase) — home: `OBJECT_MODEL_ORDER.md`

**`orders`**

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `order_number` | VARCHAR(30) **UNIQUE** | `ORD-YYYYMMDD-NNN` |
| `table_id` | CHAR(36) NULL FK→tables RESTRICT | NULL = online order |
| `guest_id` | CHAR(36) NULL, **INDEX** | **Added 2026-07-24 (F-32, closing finding F27).** The guest-session id from the JWT claim — no FK (guest sessions are not a table). Ownership of an order = `table_id` match **or** `guest_id` match, so a table-less **online** order is ownable at all; without it every `table_id IS NULL` order fails every ownership gate, which is the exact bug `OVERALL_PLAN §3.4` promises to fix. Stamped from the claim, never from the body |
| `status` | ENUM('pending','confirmed','preparing','ready','delivered','cancelled','paid') | default `pending`; BE-set, never from client; state machine in OVERALL_PLAN §3.7 |
| `source` | ENUM('online','qr','pos') | from request |
| `customer_name` | VARCHAR(100) NULL | |
| `customer_phone` | VARCHAR(20) NULL | |
| `note` | TEXT NULL | order-level note (the reference's 🔴 lost-note bug is an FE defect we designed out — `plans/customer_menu/PLAN.md`) |
| `total_amount` | DECIMAL(10,0) | denormalized — recalculated inside the same tx after every item mutation |
| `created_by` | CHAR(36) NULL FK→staff SET NULL | NULL = customer self-order; from JWT, never from body |
| `group_id` | CHAR(36) NULL | multi-table group; deliberately no hard FK |
| std | timestamps + `deleted_at` | |

**`order_items`** — server-side **snapshot** rows (client sends ids + quantities
only; BE snapshots name/price so the client can never set its own price):

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `order_id` | CHAR(36) FK→orders CASCADE | |
| `product_id` | CHAR(36) NULL FK→products | NULL on combo header row |
| `combo_id` | CHAR(36) NULL FK→combos | NULL on standalone / sub-item |
| `combo_ref_id` | CHAR(36) NULL self-FK | sub-item → its header row |
| `name` | VARCHAR(200) NOT NULL | **snapshot** at order time |
| `unit_price` | DECIMAL(10,0) NOT NULL | **snapshot**; combo header forced to **0** (label row — prevents double-count) |
| `quantity` | INT, CHECK > 0 | |
| `qty_served` | INT DEFAULT 0, CHECK 0..quantity | chef increments; item status **derived** (§2 law) |
| `toppings_snapshot` | JSON NULL | `[{id,name,price}]` frozen at order time; `is_available` deliberately dropped |
| `note` | TEXT NULL | per-item note |
| `created_at`/`updated_at` | DATETIME | no soft delete — items die with their order (CASCADE) |

Row-type matrix — enforce with CHECK `chk_oi_item_type`:

| Row type | product_id | combo_id | combo_ref_id | unit_price |
|---|---|---|---|---|
| Standalone product | ✔ | NULL | NULL | real |
| Combo **header** | NULL | ✔ | NULL | **0** |
| Combo **sub-item** | ✔ | NULL | ✔ (header id) | real |

### 4.4 Staff & auth (S phase) — home: `OBJECT_MODEL_STAFF.md`

**`staff`**

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `username` | VARCHAR(50) NOT NULL **UNIQUE** | |
| `password_hash` | VARCHAR(255) NOT NULL | bcrypt cost 12; 🔒 never serialized, ever |
| `role` | ENUM('chef','cashier','staff','manager','admin') | **5 values — reference's unused `customer` dropped** (§6 #4) |
| `full_name` | VARCHAR(100) NOT NULL | |
| `job_title` | VARCHAR(100) NULL | |
| `shifts` | JSON NULL | `["sang","chieu","toi"]` |
| `responsibilities` | TEXT NULL | |
| `phone` | VARCHAR(20) NULL | |
| `email` | VARCHAR(100) NULL | |
| `is_active` | TINYINT(1) DEFAULT 1 | |
| std | timestamps + `deleted_at` | |

> **Soft-delete × UNIQUE rule (S phase, F-16 review):** a soft-deleted row still
> occupies its UNIQUE index — deleting `chef1` then re-hiring a `chef1` would fail
> forever. On staff soft delete, the same UPDATE renames `username` to
> `<username>#deleted-<id>` (id keeps it unique; prefix keeps it readable in
> queries). Applies to any future UNIQUE column on a soft-deleted table;
> `tables.qr_token` and `orders.order_number` are exempt (random/dated values
> can't recollide).

**`refresh_tokens`** — stub (columns finalized in the S-phase auth task, design in
OVERALL_PLAN §3.4): `id` PK · `staff_id` FK→staff CASCADE · `token_hash` (hash
stored, never the token) · `expires_at` · `created_at`; max 5 rows per staff, LRU
eviction.

### 4.5 Payments (S cash · P gateways) — stub

No reference home file exists (old system had no payment seed). Locked already by
§2 law + OVERALL_PLAN §3.7: `gateway_data` JSON (not webhook_payload) · status enum
includes `completed` (not success) · one payment per order (PAYMENT_ALREADY_EXISTS
error path). Column detail lands with the S-phase cash task and is promoted here.

### 4.6 Inventory (AD phase) — home: `OBJECT_MODEL_INGREDIENT.md`

**`ingredients`**

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(150) NOT NULL | |
| `unit` | VARCHAR(30) NOT NULL | "kg", "lít", "gói" |
| `import_date` | DATE NOT NULL DEFAULT (CURDATE()) | batch import date |
| `shelf_days` | INT NOT NULL DEFAULT 90 | expiry = import_date + shelf_days, **computed, no column** |
| `current_stock` | DECIMAL(10,3) NOT NULL DEFAULT 0 | derived via movements — never written directly |
| `min_stock` | DECIMAL(10,3) NOT NULL DEFAULT 0 | low-stock threshold |
| `cost_per_unit` | DECIMAL(10,0) NOT NULL DEFAULT 0 | kept in DB; wire exposure = manager+ only, decided at AD |
| std | timestamps + `deleted_at` | |

**`product_ingredients`** — recipe/BOM junction, read-only at runtime order flow:
`(product_id FK→products CASCADE, ingredient_id FK→ingredients CASCADE)` composite
PK + `qty_used DECIMAL(10,3) NOT NULL DEFAULT 0`.

**`stock_movements`** — append-only ledger; `current_stock` updated atomically in
the same tx:

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `ingredient_id` | CHAR(36) FK→ingredients CASCADE | |
| `type` | ENUM('in','out','adjustment') NOT NULL | quantity always positive; direction in `type` |
| `quantity` | DECIMAL(10,3) NOT NULL | |
| `note` | TEXT NULL | |
| `created_by` | CHAR(36) NULL FK→staff SET NULL | |
| `created_at` | DATETIME | index `ingredient_id`, `created_at`, `created_by`; no update/delete — ledger |

### 4.7 Workforce & files (AD phase)

`training_guides`, `training_progress`, `file_attachments` — still stubs; no
object spec traced yet (reference home files don't cover them). Spec'd in their
AD-phase plan pages, promoted here in the same task, per §3.

#### `staff_tasks` — promoted by F-22 (`plans/admin_task_board/`)

Work assigned by a manager to a staff member for a given day. Read by
`/admin/staff/task-board` and `/admin/todo-list`.

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID, app-generated |
| `assigned_to` | CHAR(36) NOT NULL FK→staff | index `(assigned_to, due_at)` |
| `assigned_by` | CHAR(36) NOT NULL FK→staff | the caller, stamped from the JWT — never from the request body |
| `title` | VARCHAR(200) NOT NULL | 1–200 |
| `description` | TEXT NULL | |
| `priority` | ENUM('high','medium','low') NOT NULL | queries order high→medium→low |
| `status` | ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending' | **4 values — `overdue` is NOT stored**, it is derived read-side as `status IN ('pending','in_progress') AND due_at < NOW()` (F-22 ruling; the reference stored it and nothing ever set it) |
| `due_at` | DATETIME NOT NULL | `DATE(due_at)` is the day key; index `(due_at)` |
| `due_time_start` | TIME NULL | optional display window |
| `due_time_end` | TIME NULL | optional display window |
| `notes` | TEXT NULL | |
| `completed_at` | DATETIME NULL | stamped on entry to `completed`, nulled on exit |
| `created_at` | DATETIME NOT NULL | |
| `updated_at` | DATETIME NOT NULL | |
| `deleted_at` | DATETIME NULL | soft delete; every query filters `deleted_at IS NULL` |

Status transition rules live in `plans/admin_task_board/admin_task_board_PLAN.md §3.6`
(service-layer concern, not a schema constraint).

---

## 5. ER overview (crow's-foot, text)

```
categories 1─* products *─* toppings          (product_toppings)
categories 1─* combos   1─* combo_items *─1 products
tables     1─* orders   1─* order_items ─┐ (self-FK combo_ref_id)
staff      1─* orders (created_by)       └→ order_items (header)
staff      1─* refresh_tokens
orders     1─1 payments (P phase)
products   *─* ingredients               (product_ingredients / BOM)
ingredients 1─* stock_movements
```

---

## 6. Reference mismatch flags → our rulings

Every "§3 Flags / Known Mismatches" entry in the object specs, ruled on once:

| # | Reference flag | Ruling |
|---|---|---|
| 1 | BE sends `""` for NULL at order level but real `null` at item level; FE types lie | **Fixed by design:** nullable columns serialize as real `null` at every level; FE types come from curl receipts (gate 8, `plans/customer_menu/PLAN.md §3.5`) |
| 2 | `OrderItem.flagged` phantom FE field (no column, never sent) | **Dropped** — no column, no type. Derived/phantom fields get no home anywhere |
| 3 | `item_status` sent by BE **and** re-derived by FE | **One source:** BE derives and sends it; FE types it and does NOT re-derive (FE rule 11) |
| 4 | `staff.role` enum carries unused `customer` value | **Dropped from enum** (5 values). Customers are guest JWTs / ON-phase accounts, never staff rows |
| 5 | `performance_score` hardcoded `0` in serializer, no column | **Dropped** — serializer omits it until a real metric exists (no fake data on the wire) |
| 6 | Ingredient wire renames: `current_stock`→`quantity`, `min_stock`→`warningThreshold` | **Killed** — DTO-exact naming (FE_STATE rule 10): wire uses the DB names |
| 7 | `cost_per_unit` in DB but silently withheld from API | **Kept in DB**, exposure is a deliberate AD-phase decision (manager+ only), not an accident |
| 8 | Stock `out` silently clamps at zero (`GREATEST(0,…)`) | ⚠ **Changed (default):** below-zero `out` rejected with `VALIDATION_FAILED` — silent clamps hide miscounts. Lock in when AD opens |
| 9 | `filling` column churn (added mig 016, dropped 017) | **Never created** — §2 law; fillings are ₫0 toppings |
| 10 | `qr_token` exposed on staff `GET /tables` | **Kept staff-only**; never in any customer payload beyond the guest's own scanned table |
| 11 | `Category` FE type narrower than wire (`description`/`is_active` untyped) | **Fixed by gate 8** — FE types mirror the receipt exactly |
| 12 | Combo enrichment degrades silently (missing product → raw UUID shown) | FE concern, ruled in `plans/customer_menu/PLAN.md` (defects-designed-out table) |
| 13 | STOR forecast (`avg_daily_usage` + computed run-out) planned, not built | **Not v1** — candidate column when AD opens; forecast fields stay computed, no columns |
| 14 | Reference seeds staff credentials (`admin/admin123`…) | Dev seed only (BE_PLAYBOOK seed rule); never in prod images |
| 15 | **Combo price lives on the header** (`MENU_CATALOG.md §4`) **vs. on the sub-items** (`OBJECT_MODEL_ORDER.md §2.6` row-type matrix, code-traced) — the two reference docs say the opposite | **Code wins (rule 5): header `unit_price = 0`, sub-items carry the real price.** The contradiction is currently invisible because **all 5 seed combos are break-even** (combo price = Σ component prices), so both conventions total the same. Charge via sub-items; the header is a label row. A *discounted* combo would expose the drift (see §7 flag) — ruled here so it's a decision, not a landmine |

---

## 7. Worked example — one QR order, end to end

The row-type matrix (§4.3) and the snapshot rules are the two things people get
wrong. Here is one real order flowing through the tables, so the abstract rows are
concrete. **Every id, name, and price below is actual seed data** from
`MENU_CATALOG.md` (traced from `scripts/seed_real_menu.sql` / `seed.sql`) — short IDs
are the `…0000000N` suffix per that file's prefix guide.

**Scene.** Chị Lan scans the QR on **Bàn 05** (`tbl-05`), adds to her cart:

- **2× Bánh Cuốn Thịt** (`ccc-01`, ₫4,000) with topping *Nhân thịt mộc nhĩ* (`bbb-02`, ₫0), note "ít mắm"
- **1× Suất Giò** (`ddd-03`, combo list price ₫25,000) = 1× Giò (`ccc-07`, ₫9,000) · 4× Bánh Cuốn Thịt (`ccc-01`, ₫4,000) · 1× Canh (bundled in the template)
- …and she picks **Canh có rau** (`ccc-08`, ₫0) for the required soup — see the canh rule in §8

**What the client POSTs** (`POST /orders`) — **ids + quantities only, no names, no prices**
(§4.3: the client can never set its own price). Note the combo's `combo_items` override
does **not** list the canh — the builder strips it (`isSoupName`) so canh rides as its
own top-level line (§8):

```jsonc
{
  "source": "qr",
  "table_id": "tbl-05",
  "customer_name": "Chị Lan",
  "items": [
    { "product_id": "ccc-01", "quantity": 2, "topping_ids": ["bbb-02"], "note": "ít mắm" },
    { "combo_id": "ddd-03", "quantity": 1, "combo_items": [
        { "product_id": "ccc-07", "quantity": 1, "topping_ids": [] },
        { "product_id": "ccc-01", "quantity": 4, "topping_ids": [] } ] },
    { "product_id": "ccc-08", "quantity": 1, "topping_ids": [] }
  ]
}
```

**Row written to `orders`** — server fills everything the client didn't (and mustn't):

| id | order_number | table_id | status | source | customer_name | total_amount | created_by | group_id |
|---|---|---|---|---|---|---|---|---|
| `o1` | `ORD-20260719-007` | `tbl-05` | `pending` | `qr` | Chị Lan | **33000** | `NULL` | `NULL` |

- `order_number` — next value from the Redis counter (DB `order_sequences` re-seed fallback, §4.2); **not** client-chosen.
- `status` = `pending` — BE-set, never from the body (§4.3).
- `created_by` = `NULL` — guest self-order via QR JWT, not a staff row (§4.3).
- `total_amount` — **computed by BE**, not sent; see the sum below.

**Rows written to `order_items`** — the client's 2 line items expand to **5 rows**,
covering every row-type in the §4.3 matrix. `name`/`unit_price`/`toppings_snapshot` are
all **snapshots frozen at order time**:

| # | row type | product_id | combo_id | combo_ref_id | name (snapshot) | unit_price | qty | qty_served | toppings_snapshot |
|---|---|---|---|---|---|---|---|---|---|
| A | standalone | `ccc-01` | `NULL` | `NULL` | Bánh Cuốn Thịt | `4000` | 2 | 0 | `[{id:bbb-02,name:"Nhân thịt mộc nhĩ",price:0}]` |
| B | combo **header** | `NULL` | `ddd-03` | `NULL` | Suất Giò | **`0`** | 1 | 0 | `NULL` |
| C | combo sub-item | `ccc-07` | `NULL` | `B` | Giò | `9000` | 1 | 0 | `NULL` |
| D | combo sub-item | `ccc-01` | `NULL` | `B` | Bánh Cuốn Thịt | `4000` | 4 | 0 | `[]` |
| E | **standalone** (canh) | `ccc-08` | `NULL` | `NULL` | Canh có rau | `0` | 1 | 0 | `NULL` |

- **Row B (header) `unit_price = 0`** — the label row. Suất Giò's ₫25,000 is charged
  through its sub-items (C `9000` + D `4000×4` = `25000`), so counting the header too
  would double-charge. This is the "prevents double-count" rule made concrete. (Note the
  reference contradicts itself on *which* row holds the price — §6 #15 rules it: header 0,
  sub-items real. Every seed combo is break-even, so the total is the same either way.)
- **Row E (canh) is standalone, not a combo sub-item** — even though Suất Giò's *template*
  bundles a canh, the order builder strips it (`isSoupName`) and sends the customer's
  chosen variant as its own `combo_id = NULL` line. Canh **always** rides as its own ₫0
  row; the full "canh is mandatory" rule is §8.
- **Snapshots, not lookups** — the ₫0 topping is frozen into `toppings_snapshot` at
  order time; if its price or availability changes tomorrow, this order is unaffected
  (§2: *never assume topping price is 0 in code* — snapshot the real value).
- **Two ₫0 add-ons, two different tables — the trap.** This menu lets the customer pick
  *nhân* (thịt / mộc nhĩ) **and** whether the canh comes with *rau mùi tàu* — both free.
  But only nhân is a **topping** (rides `toppings` → `toppings_snapshot`, seed has just 2).
  *Rau mùi tàu* is **not** a topping: the canh choice is modelled as two separate
  **products** — *Canh có rau* (`ccc-08`, "canh kèm rau mùi tàu") and *Canh không rau*
  (`ccc-09`) — so row E above is a `product_id` **standalone row**, never a
  `toppings_snapshot` entry (`MENU_CATALOG.md §2`). Reaching for a "rau mùi tàu" topping
  is the mistake the seed deliberately designs out.

**`total_amount` recompute** (`recalculateTotalAmount`, run in-tx after the inserts —
header contributes nothing):

```
A  4000 × 2  =  8000
B     0 × 1  =     0   ← combo header (label row)
C  9000 × 1  =  9000  ┐ Suất Giò sub-items = 25000 = its list price ✓
D  4000 × 4  = 16000  ┘
E     0 × 1  =     0   ← canh (own standalone row, stripped from combo; §8)
             ───────
total           33000  → orders.total_amount (denormalized, §4.3)
```

**One lifecycle beat.** The chef serves one of the two bánh cuốn on row A →
`PATCH` sets `A.qty_served = 1`. There is **no `item_status` column** (§2 law): the
service *derives* it — `0`→pending, `0<n<qty`→preparing, `n=qty`→done — so row A now
reports **preparing**. The order then walks `pending→confirmed→…→paid` (state machine,
`OVERALL_PLAN §3.7`), and a single `payments` row closes it (§4.5, one payment per order).

> **⚠️ FLAG — this only balances because seed combos are break-even.** Suất Giò's list
> price (₫25,000) happens to equal the sum of its expanded sub-item prices, so charging
> via sub-items (§6 #15 ruling) lands on the right total. **All 5 seed combos share this
> property.** A *discounted* combo (list price < component sum) has no home for the
> discount under "header = 0, sub-items = real". If one is ever added, the row-type
> matrix needs an explicit ruling (candidate: header carries the discounted price and
> sub-items go to 0 — the `MENU_CATALOG.md §4` convention — or sub-items store an
> allocated price). Not a blocker today; flagged so it's a decision, not a silent bug.

---

## 8. Worked example — a party of 10, and why "canh is mandatory"

Scaling §7 up to a full table shows the two things §7 only gestured at: how canh
behaves, and where the **"every order needs a canh"** rule actually lives (spoiler:
**not** in this schema).

**Scene.** A family of 10 eats in and puts it all on **one bill** (one `orders` row).
They order:

- **5× Suất Đầy Đủ Trứng Tái** (`ddd-01`, ₫30,000) — each template = 1 Bánh Trứng Tái (`ccc-04`, ₫9,000) · 3 Bánh Cuốn Thịt (`ccc-01`, ₫4,000) · 1 Giò (`ccc-07`, ₫9,000) · 1 Canh
- **Canh for all 10** (required): **7× Canh có rau** (`ccc-08`) + **3× Canh không rau** (`ccc-09`), every bowl ₫0

### "Canh is mandatory" is a FE gate — the schema does NOT enforce it

Checkout is blocked until the cart holds a canh line. `CartBottomBar` dims and
`OrderSummary` shakes until

```ts
items.some(i => i.id.startsWith('canh_'))   // the canh-required gate
```

is true (`LOGIC_FE.md` · `customer_menu_crosscomponent_dataflow.md §6`). **Nothing in
this schema models that** — no `NOT NULL`, no CHECK, no trigger forces a canh row onto an
order. The rule is a *client* invariant keyed off an id **convention** (`canh_…`), not a
type field. Consequences worth writing down:

- **Never query the DB assuming every order has a canh.** Any path that bypasses the FE
  gate — POS, data import, tests, a future API client — can legally write a canh-less
  order. The DB trusts what it's handed.
- If canh-required ever needs to be a *true* guarantee, it becomes a **service-layer
  validation** (reject the order at `POST /orders`), not a column — there's no single
  column a CHECK could hang off (canh is one product row among many).

### Canh always rides as its own ₫0 row (stripped from every combo)

Each Suất *template* bundles a canh, but the order builder pulls it out (`isSoupName`)
and sends the customer's chosen variant as a standalone line (`combo_id = NULL`), keyed
`canh_<productId>_rau|plain` in the cart (`order-payload.ts`). So each combo expands to
a **header (₫0) + its non-canh sub-items only**, and canh appears **once per variant** as
a batched standalone row.

**What lands in `order_items`** — **22 rows**. One suất is shown expanded as the pattern
(repeats ×5), then the two canh rows:

| block | row type | product / combo | unit_price | qty | rows |
|---|---|---|---|---|---|
| Suất (×5) | combo **header** | Suất Đầy Đủ Trứng Tái (`ddd-01`) | **0** | 1 | 5 |
| ” | sub-item | Bánh Trứng Tái (`ccc-04`) | 9000 | 1 | 5 |
| ” | sub-item | Bánh Cuốn Thịt (`ccc-01`) | 4000 | 3 | 5 |
| ” | sub-item | Giò (`ccc-07`) | 9000 | 1 | 5 |
| canh | **standalone** | Canh có rau (`ccc-08`) | 0 | 7 | 1 |
| canh | **standalone** | Canh không rau (`ccc-09`) | 0 | 3 | 1 |

Per suất the sub-items sum to ₫30,000 (`9000 + 4000×3 + 9000`) = its list price (§6 #15,
break-even); canh adds ₫0.

**`total_amount`** = `5 × 30000` (suất, via sub-items) `+ 0` (all 10 canh) = **₫150,000**.

### The `group_id` beat — when 10 people outgrow one table

Tables seat 4 (`MENU_CATALOG.md §6`), so a party of 10 physically spans three. Two ways
to model it, both already in the schema (§4.3):

- **One combined bill** (above) — a single `orders` row; `table_id` = the host table (or
  `source='pos'` rung up at the counter), `group_id = NULL`.
- **Split bills, one party** — three `orders` rows, each with its own `table_id`, sharing
  one `group_id`. That column is a **soft correlation** (deliberately *no* hard FK) whose
  only job is to stitch per-table orders into one party for a combined view. No parent
  `groups` table exists; the id is generated when the party is seated.
