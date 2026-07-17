# 🍜 BanhCuon System — Database Schema Summary
> **Version:** Migrations 001–015 · MySQL 8.0 · ECC-Free · Tháng 6/2026
> **Purpose:** Single-page reference for all Phase 1 SQL migrations. Read this before any DB query or schema work.
> **Source of truth:** `migrations/*.sql` — specs only reference, never repeat DDL.

---

## 📋 Migration Run Order (REQUIRED)

```
001_auth.sql
002_products.sql
003_tables.sql            ← must run BEFORE 005_orders
004_combos.sql
005_orders.sql
006_payments.sql
007_files.sql
008_order_groups.sql      ← adds orders.group_id
009_ingredients.sql       ← ingredients · product_ingredients · stock_movements
010_ingredients_dates.sql ← adds ingredients.import_date + shelf_days
011_staff_tasks.sql       ← staff_tasks
012_staff_tasks_v2.sql    ← adds priority/notes/due_time + status enum
013_staff_profile_fields.sql ← adds staff.job_title/shifts/responsibilities
014_training.sql          ← training_guides · training_guide_roles · training_progress · quiz_attempts
015_add_paid_status.sql   ← adds orders.status 'paid'
```

Tool: Goose (`-- +goose Up / Down` blocks in each file)

---

## Global Conventions

| Rule | Detail |
|---|---|
| **Primary Keys** | `CHAR(36) DEFAULT (UUID())` — never AUTO_INCREMENT |
| **Timestamps** | Every table: `created_at`, `updated_at`. Mutable tables: `deleted_at` (soft delete) |
| **Soft delete** | `deleted_at DATETIME NULL` — always query `WHERE deleted_at IS NULL` |
| **Currency** | `DECIMAL(10,0)` — VND has no decimal. Never FLOAT |
| **File paths** | Store `object_path` (relative). Full URL = `STORAGE_BASE_URL` + `object_path` |
| **Indexes** | Every FK column, `status`, `created_at`, `is_active`, `deleted_at` |
| **Naming** | `snake_case`. Tables: plural |

---

## 001_auth.sql

### `staff`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `username` | VARCHAR(50) UNIQUE NOT NULL | |
| `password_hash` | VARCHAR(255) NOT NULL | bcrypt cost=12 |
| `email` | VARCHAR(100) NULL | v1.1 — password reset |
| `role` | ENUM('customer','chef','cashier','staff','manager','admin') DEFAULT 'cashier' | Role hierarchy: admin ⊃ manager ⊃ staff ⊃ (chef\|cashier) — customer isolated |
| `full_name` | VARCHAR(100) NOT NULL | |
| `job_title` | VARCHAR(100) NULL | **migration 013** — display title (free text) |
| `shifts` | JSON NULL | **migration 013** — work shift schedule |
| `responsibilities` | TEXT NULL | **migration 013** — role responsibilities |
| `phone` | VARCHAR(20) NULL | |
| `is_active` | TINYINT(1) DEFAULT 1 | Middleware checks via Redis cache TTL 5min |
| `created_at`, `updated_at` | DATETIME | |
| `deleted_at` | DATETIME NULL | Soft delete |

⚠️ `customer` in role ENUM is ambiguous — online/QR customers may be anonymous. Clarify with BA before implementing RequireRole().

### `refresh_tokens`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `staff_id` | CHAR(36) NOT NULL | FK → staff(id) ON DELETE CASCADE |
| `token_hash` | CHAR(64) UNIQUE NOT NULL | SHA256 hex of raw token |
| `user_agent` | VARCHAR(255) NULL | |
| `ip_address` | VARCHAR(45) NULL | IPv6 max 45 chars |
| `expires_at` | DATETIME NOT NULL | NOW() + 30 days |
| `last_used_at` | DATETIME NULL | v1.2 NEW — updated on each /auth/refresh |
| `created_at` | DATETIME | |

Business logic:
- Redis is **fast-path**; DB is **fallback** on Redis miss
- Service layer enforces **max 5 active sessions per staff** — delete oldest by `last_used_at ASC`
- Stale session: `last_used_at < NOW() - INTERVAL 7 DAY`

---

## 002_products.sql

### `categories`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(100) NOT NULL | |
| `description` | TEXT NULL | |
| `sort_order` | INT DEFAULT 0 | |
| `is_active` | TINYINT(1) DEFAULT 1 | |
| `created_at`, `updated_at`, `deleted_at` | DATETIME | |

No `slug` column — was never in migration.

### `products`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `category_id` | CHAR(36) NOT NULL | FK → categories ON DELETE RESTRICT |
| `name` | VARCHAR(150) NOT NULL | |
| `description` | TEXT NULL | |
| `price` | DECIMAL(10,0) NOT NULL | ⚠️ NOT `base_price` |
| `image_path` | VARCHAR(500) NULL | ⚠️ object_path NOT full URL. NOT `image_url` |
| `is_available` | TINYINT(1) DEFAULT 1 | Toggle: sold out today |
| `sort_order` | INT DEFAULT 0 | |
| `created_at`, `updated_at`, `deleted_at` | DATETIME | |

No `slug` column.

### `toppings`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(100) NOT NULL | |
| `price` | DECIMAL(10,0) DEFAULT 0 | ⚠️ NOT `price_delta` |
| `is_available` | TINYINT(1) DEFAULT 1 | |
| `created_at`, `updated_at`, `deleted_at` | DATETIME | |

### `product_toppings` (Junction M:N)
| Column | Type | Notes |
|---|---|---|
| `product_id` | CHAR(36) | FK → products ON DELETE CASCADE |
| `topping_id` | CHAR(36) | FK → toppings ON DELETE CASCADE |

PK: composite `(product_id, topping_id)`

---

## 003_tables.sql (v1.2)

### `tables`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(50) UNIQUE NOT NULL | e.g. "Ban 01" |
| `qr_token` | CHAR(64) UNIQUE NOT NULL | Random hex. Regenerating invalidates all printed QRs for that table |
| `capacity` | INT DEFAULT 4 | |
| `status` | ENUM('available','occupied','reserved','inactive') DEFAULT 'available' | v1.2 NEW |
| `is_active` | TINYINT(1) DEFAULT 1 | |
| `created_at`, `updated_at`, `deleted_at` | DATETIME | |

⚠️ Phase 1 uses `available` and `inactive` only. Do NOT build logic relying on `occupied` being accurate until Phase 2.

Required by: `005_orders.sql` (FK `orders.table_id → tables.id`)

---

## 004_combos.sql (v1.1)

### `combos`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `category_id` | CHAR(36) NULL | v1.1 NEW — FK → categories ON DELETE SET NULL |
| `name` | VARCHAR(150) NOT NULL | |
| `description` | TEXT NULL | |
| `price` | DECIMAL(10,0) NOT NULL | |
| `image_path` | VARCHAR(500) NULL | object_path — NOT `image_url` |
| `is_available` | TINYINT(1) DEFAULT 1 | |
| `sort_order` | INT DEFAULT 0 | v1.1 NEW |
| `created_at`, `updated_at`, `deleted_at` | DATETIME | |

### `combo_items` (Static template)
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `combo_id` | CHAR(36) NOT NULL | FK → combos ON DELETE CASCADE |
| `product_id` | CHAR(36) NOT NULL | FK → products ON DELETE RESTRICT |
| `quantity` | INT DEFAULT 1 CHECK (> 0) | |
| `created_at`, `updated_at` | DATETIME | |

Design: `combo_items` is a **static template**. At order time, BE expands combo into individual `order_items` rows linked by `combo_ref_id`. Kitchen sees individual dishes, not the combo label.

---

## 005_orders.sql (v1.2)

### `order_sequences` (Fallback counter)
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | |
| `date_key` | DATE UNIQUE NOT NULL | |
| `last_seq` | INT DEFAULT 0 | |

Primary path: Redis `INCR order_seq:{YYYYMMDD}` TTL 2 days → `ORD-YYYYMMDD-NNN`
Fallback: `INSERT ... ON DUPLICATE KEY UPDATE last_seq = last_seq + 1`

### `orders`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `order_number` | VARCHAR(30) UNIQUE NOT NULL | Format: `ORD-YYYYMMDD-NNN` |
| `table_id` | CHAR(36) NULL | FK → tables ON DELETE RESTRICT. NULL = online/delivery |
| `status` | ENUM('pending','confirmed','preparing','ready','delivered','cancelled','paid') DEFAULT 'pending' | `paid` added in **migration 015** |
| `source` | ENUM('online','qr','pos') DEFAULT 'online' | ⚠️ NOT `payment_method` |
| `customer_name` | VARCHAR(100) NULL | |
| `customer_phone` | VARCHAR(20) NULL | |
| `note` | TEXT NULL | |
| `total_amount` | DECIMAL(10,0) DEFAULT 0 | ⚠️ DENORMALIZED — must recalculate after every order_items mutation |
| `created_by` | CHAR(36) NULL | FK → staff ON DELETE SET NULL. NULL = customer self-order. ⚠️ NOT `staff_id` |
| `group_id` | CHAR(36) NULL | **v1.2 NEW (migration 008)** — shared UUID for multi-table group (Option A). NULL = standalone order. No FK — application-level constraint. |
| `created_at`, `updated_at`, `deleted_at` | DATETIME | |

Composite index: `idx_orders_table_status (table_id, status)` — used for One Active Order check.

State machine:
```
pending → confirmed → preparing → ready → delivered → paid
                     ↘ cancelled  (only if SUM(qty_served)/SUM(quantity) < 0.30)
```
`paid` (migration 015) is the terminal state after payment is completed.

🚨 `total_amount` drift: service MUST call `recalculateTotalAmount(orderId)` after every mutation or payment will charge wrong amount.

### `order_items`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `order_id` | CHAR(36) NOT NULL | FK → orders ON DELETE CASCADE |
| `product_id` | CHAR(36) NULL | NULL if combo header line |
| `combo_id` | CHAR(36) NULL | NULL if standalone product |
| `combo_ref_id` | CHAR(36) NULL | Self-ref FK → order_items. NULL = standalone or header |
| `name` | VARCHAR(200) NOT NULL | **Snapshot** at order time |
| `unit_price` | DECIMAL(10,0) NOT NULL | **Snapshot** at order time |
| `quantity` | INT DEFAULT 1 CHECK (> 0) | |
| `qty_served` | INT DEFAULT 0 CHECK (>= 0 AND <= quantity) | Chef increments as items are done |
| `toppings_snapshot` | JSON NULL | Snapshot of selected toppings at order time |
| `note` | TEXT NULL | |
| `created_at`, `updated_at` | DATETIME | |

3 valid item types enforced by `chk_oi_item_type` CHECK constraint (v1.2 — requires MySQL 8.0.16+):

| Type | product_id | combo_id | combo_ref_id |
|---|---|---|---|
| Standalone product | NOT NULL | NULL | NULL |
| Combo header line | NULL | NOT NULL | NULL |
| Combo sub-item | NOT NULL | NULL | NOT NULL |

⚠️ `order_items.status` and `order_items.flagged` do NOT exist in migration. Derive status from `qty_served`: 0 = pending, 0 < x < quantity = preparing, x = quantity = done.

---

## 008_order_groups.sql (v1.0)

> Additive migration — adds `group_id` to `orders`. See full SQL: [008_order_groups.sql.md](task1_database/Ver%202/008_order_groups.sql.md)

| Column Added | Type | Notes |
|---|---|---|
| `group_id` | CHAR(36) NULL | Shared UUID across orders in a multi-table group. NULL = standalone. |

Index added: `idx_orders_group_id (group_id)` — supports `WHERE group_id = ?` lookup.

---

## 006_payments.sql (v1.2)

### `payments`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `order_id` | CHAR(36) UNIQUE NOT NULL | FK → orders ON DELETE RESTRICT. **1 payment per order** |
| `method` | ENUM('vnpay','momo','zalopay','cash') NOT NULL | |
| `status` | ENUM('pending','completed','failed','refunded') DEFAULT 'pending' | ⚠️ `completed` NOT `success` |
| `amount` | DECIMAL(10,0) NOT NULL | |
| `attempt_count` | INT DEFAULT 1 | v1.2 NEW — incremented on each retry |
| `gateway_ref` | VARCHAR(150) NULL | vnp_TxnRef / orderId / app_trans_id |
| `gateway_data` | JSON NULL | Raw webhook payload. ⚠️ NOT `webhook_payload` |
| `refunded_amount` | DECIMAL(10,0) NULL | v1.2 NEW — NULL = no refund; set on cancel |
| `expires_at` | DATETIME NULL | NULL for cash; 15 min for online |
| `paid_at` | DATETIME NULL | Gateway confirm timestamp |
| `created_at`, `updated_at` | DATETIME | |
| `deleted_at` | DATETIME NULL | v1.2 NEW — soft delete (audit compliance, never hard delete) |

Business rules:
- Payment created **only when** `order.status = ready`
- `UNIQUE(order_id)` → retries must **UPDATE** existing row, never INSERT
- Verify HMAC signature **before** any business logic
- `deleted_at` is the only removal mechanism — hard delete is blocked

---

## 007_files.sql (v1.1)

### `file_attachments`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `object_path` | VARCHAR(500) NOT NULL | Relative path in storage bucket |
| `original_name` | VARCHAR(255) NOT NULL | Original filename from user |
| `mime_type` | VARCHAR(100) NOT NULL | e.g. `image/jpeg` |
| `size_bytes` | BIGINT DEFAULT 0 | |
| `uploaded_by` | CHAR(36) NULL | FK → staff ON DELETE SET NULL. NULL = anonymous |
| `is_orphan` | TINYINT(1) DEFAULT 1 | 1 = not yet linked → eligible for cleanup |
| `entity_type` | VARCHAR(50) NULL | v1.1 NEW — `'order'`\|`'payment'`\|`'staff'`\|NULL |
| `entity_id` | CHAR(36) NULL | v1.1 NEW — polymorphic ref (intentionally NOT a hard FK) |
| `created_at`, `updated_at` | DATETIME | |

Cleanup job (`file_cleanup.go`) every 6h: `DELETE WHERE is_orphan=1 AND created_at < NOW() - INTERVAL 24 HOUR`

App constraint: when `is_orphan=0` → both `entity_type` AND `entity_id` MUST be set.

---

## 009_ingredients.sql (+ 010 dates)

### `ingredients`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `name` | VARCHAR(150) NOT NULL | |
| `unit` | VARCHAR(30) NOT NULL | e.g. `kg`, `lít`, `cái` |
| `import_date` | DATE NOT NULL DEFAULT (CURDATE()) | **migration 010** |
| `shelf_days` | INT NOT NULL DEFAULT 90 | **migration 010** — expiry = import_date + shelf_days |
| `current_stock` | DECIMAL(10,3) NOT NULL DEFAULT 0 | ⚠️ 3 decimals, not currency |
| `min_stock` | DECIMAL(10,3) NOT NULL DEFAULT 0 | Low-stock threshold |
| `cost_per_unit` | DECIMAL(10,0) NOT NULL DEFAULT 0 | VND |
| `created_at`, `updated_at`, `deleted_at` | DATETIME | Soft delete |

### `product_ingredients` (Junction M:N — recipe/BOM)
| Column | Type | Notes |
|---|---|---|
| `product_id` | CHAR(36) | FK → products ON DELETE CASCADE |
| `ingredient_id` | CHAR(36) | FK → ingredients ON DELETE CASCADE |
| `qty_used` | DECIMAL(10,3) NOT NULL DEFAULT 0 | Per 1 product unit |

PK: composite `(product_id, ingredient_id)`

### `stock_movements` (Audit log — append only)
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `ingredient_id` | CHAR(36) NOT NULL | FK → ingredients ON DELETE CASCADE |
| `type` | ENUM('in','out','adjustment') NOT NULL | |
| `quantity` | DECIMAL(10,3) NOT NULL | Signed by intent; `type` distinguishes direction |
| `note` | TEXT NULL | |
| `created_by` | CHAR(36) NULL | FK → staff ON DELETE SET NULL |
| `created_at` | DATETIME | No `updated_at`/`deleted_at` — immutable log |

---

## 011_staff_tasks.sql (+ 012 v2)

### `staff_tasks`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `title` | VARCHAR(200) NOT NULL | |
| `description` | TEXT NULL | |
| `assigned_to` | CHAR(36) NOT NULL | FK → staff ON DELETE RESTRICT |
| `assigned_by` | CHAR(36) NOT NULL | FK → staff ON DELETE RESTRICT |
| `status` | ENUM('pending','in_progress','completed','overdue') DEFAULT 'pending' | `in_progress` added in **migration 012** |
| `priority` | ENUM('high','medium','low') NOT NULL DEFAULT 'medium' | **migration 012** |
| `notes` | TEXT NULL | **migration 012** |
| `due_at` | DATETIME NOT NULL | |
| `due_time_start` | VARCHAR(5) NULL | **migration 012** — `"HH:MM"` |
| `due_time_end` | VARCHAR(5) NULL | **migration 012** — `"HH:MM"` |
| `completed_at` | DATETIME NULL | |
| `created_at`, `updated_at`, `deleted_at` | DATETIME | Soft delete |

---

## 014_training.sql

### `training_guides`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `title` | VARCHAR(200) NOT NULL | |
| `role` | ENUM('chef','cashier','staff','manager') NOT NULL | Primary target role |
| `description` | TEXT NULL | |
| `cover_image_url` | VARCHAR(500) NULL | |
| `youtube_url` | VARCHAR(500) NULL | |
| `quality_kpi_target` | VARCHAR(200) NULL | |
| `quantity_kpi_target` | VARCHAR(200) NULL | |
| `pass_threshold` | INT NOT NULL DEFAULT 75 | Quiz pass % |
| `max_attempts` | INT NOT NULL DEFAULT 3 | |
| `published` | TINYINT(1) NOT NULL DEFAULT 0 | |
| `created_by` | CHAR(36) NULL | FK → staff ON DELETE SET NULL |
| `created_at`, `updated_at`, `deleted_at` | DATETIME | Soft delete |

### `training_guide_roles` (Junction — multi-role targeting)
| Column | Type | Notes |
|---|---|---|
| `guide_id` | CHAR(36) | FK → training_guides ON DELETE CASCADE |
| `role` | ENUM('chef','cashier','staff','manager') | |

PK: composite `(guide_id, role)`

### `training_progress`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `guide_id` | CHAR(36) NOT NULL | FK → training_guides ON DELETE CASCADE |
| `staff_id` | CHAR(36) NOT NULL | FK → staff ON DELETE CASCADE |
| `watched_percent` | INT NOT NULL DEFAULT 0 | |
| `manager_notes` | TEXT NULL | |
| `created_at`, `updated_at` | DATETIME | |

UNIQUE: `(guide_id, staff_id)` — one progress row per staff per guide.

### `quiz_attempts`
| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `progress_id` | CHAR(36) NOT NULL | FK → training_progress ON DELETE CASCADE |
| `score` | INT NOT NULL | |
| `passed` | TINYINT(1) NOT NULL DEFAULT 0 | |
| `attempted_at` | DATETIME | |
| `created_at` | DATETIME | No soft delete — immutable attempt log |

---

## 🔑 Redis Key Schema

> **Verified against code 2026-06-05** (grep of every `rdb.Get/Set/Del/Incr/Expire/Publish` in `be/internal/service`). Strategy + fail-open behavior: [`BE_CACHING_STRATEGY.md`](../BE_CACHING_STRATEGY.md).
> Redis is accelerator-only — every key has an authoritative copy in MySQL.

### Caches (cache-aside, delete-on-write)

| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `product:{id}` | String (JSON) | 5min | Single enriched product |
| `products:list` | String (JSON) | 5min | Product list — invalidated by product **or** topping write |
| `toppings:list` | String (JSON) | 5min | Topping list |
| `combos:list` | String (JSON) | 5min | Combo list |
| `categories:list` | String (JSON) | 5min | Category list |
| `auth:staff:{id}` | String `'active'/'disabled'` | 5min | is_active cache for AuthMiddleware (fail-open on Redis down) |

### Counters

| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `ratelimit:login:{ip}` | Counter | 60s | Login rate limit — `Incr`; `> 5` ⇒ `RATE_LIMIT_EXCEEDED` (fail-open) |
| `order:seq:{YYYYMMDD}` | Counter | 25h | Order number `ORD-YYYYMMDD-NNN`; DB `order_sequences` is the fallback |

### Pub/Sub channels (ephemeral — not cache)

| Channel | Purpose |
|---|---|
| `order:{id}` | SSE order tracking |
| `group:{id}` | SSE group view |
| `orders:kds` | KDS new-order feed |
| `orders:admin` | Admin floor monitor |
| `queue:broadcast` · `tables:broadcast` | Order-monitor queue + table updates |

> ⚠️ **Removed (documented before, but NOT in code):** `refresh_token:{hash}` and `auth:refresh:…` — refresh tokens live in the MySQL `refresh_tokens` table, not Redis · `payment_timeout:{id}` — the timeout job polls the DB on a 60s ticker, no keyspace notifications · `table_order:{table_id}` — the 1-active-order check uses the `idx_orders_table_status` DB index · `bloom:*` — `BFAdd`/`BFExists` exist in `pkg/redis/bloom.go` but have **zero call sites** (dead code; see BE_CACHING_STRATEGY §5).

---

## 🔗 FK Dependency Graph

```
staff ──────────────────────────────────────┐
  └──→ refresh_tokens              orders.created_by (SET NULL)
                                      ↑          ↑
categories ──→ products ──────────────┘          │
     ↑              └──→ product_toppings      tables
     └──→ combos           └──→ toppings
              └──→ combo_items
                    │
                    └─(expand at order time)──→ order_items
                                                  │  ↑
                                  orders ──────────┘  │ (combo_ref_id self-ref)
                                    │
                                payments (UNIQUE order_id)

staff ──→ file_attachments (polymorphic via entity_type + entity_id)

products ──→ product_ingredients ──→ ingredients ──→ stock_movements
                                                          ↑
staff ──→ stock_movements.created_by (SET NULL) ──────────┘

staff ──→ staff_tasks (assigned_to + assigned_by, both RESTRICT)

staff ──→ training_guides.created_by (SET NULL)
training_guides ──→ training_guide_roles
            └──→ training_progress ──→ quiz_attempts
                       ↑
staff ─────────────────┘ (training_progress.staff_id CASCADE)
```

---

## ⚠️ Critical Gotchas — Read Before Coding

| ❌ Wrong | ✅ Correct |
|---|---|
| `id INT` / `uint64` in Go | `id CHAR(36)` — always UUID string |
| `base_price` | `price` (products) |
| `price_delta` | `price` (toppings) |
| `image_url` | `image_path` (object_path, relative) |
| `staff_id` on orders | `created_by` |
| `webhook_payload` | `gateway_data` |
| Payment status `'success'` | `'completed'` |
| `orders.payment_method` | Does not exist — it's `payments.method` |
| INSERT payment on retry | UPDATE existing row — UNIQUE constraint on `order_id` |
| `order_items.status` column | Does not exist — derive from `qty_served` |
| `order_items.flagged` column | Does not exist — pending Issue #5 decision |
| `slug` on products/categories | Does not exist in any migration |
| Hard delete payments | Blocked — use `deleted_at` only |

---

*🍜 BanhCuon System · DB_SCHEMA_SUMMARY.md · Compiled from migrations 001–015 · Tháng 6/2026*
