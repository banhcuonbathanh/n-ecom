# BE Audit 03 — Database Schema & Queries
> BE Quality Audit — 2026-06-11 — branch experience_claude.md_system_1

## Summary

The schema is structurally solid: correct integer currency (DECIMAL(10,0)), full FK coverage with appropriate ON DELETE actions, composite indexes on the hottest lookup paths, and migration Down blocks on every file. Five issues were found. Two are **MAJOR** correctness hazards (a missing column in a hand-rolled scan that leaves `group_id` always NULL at runtime, and a TOCTOU race on payment creation with no row-lock). Two are **MINOR** performance issues (DATE() function defeat of `idx_tasks_due_at` and OFFSET pagination on `orders` growing slower with every row added). One is a **SUGGESTION** (per-item product/topping lookup loops during order creation). No schema data-type violations were found.

Severity breakdown: 🔴 CRITICAL 0 · 🟠 MAJOR 2 · 🟡 MINOR 2 · 💡 SUGGESTION 1

---

## Findings

### D-01 [🟠 MAJOR] `ListActiveOrders` scan omits `group_id` — always NULL in Go struct

- **Where:** `be/internal/repository/order_repo.go:187-201`
- **Problem:**
  ```sql
  SELECT id, order_number, table_id, status, source, customer_name, customer_phone,
         note, total_amount, created_by, created_at, updated_at, deleted_at
  FROM orders ...
  ```
  The hand-rolled query selects 13 columns and scans them into 13 fields of `db.Order`. The `group_id` column (added in migration `008_order_groups.sql`) is absent from the SELECT list. The `db.Order` struct has `GroupID sql.NullString` at position 14 (after `Status`), so every `o.GroupID` returned by `ListActiveOrders` is always the zero value (null). `ListTodayHistory` (line 210–228) has the same defect — identical 13-column hand-written query.
- **Why it matters:** `buildMonitorPayloads` (order_service.go:834) calls `ListActiveOrders` to build the floor-monitor SSE snapshot. Any code that reads `o.GroupID` from these results will silently use null even for grouped orders. Group display on the admin floor view will be broken without any error.
- **Fix:** Add `group_id` to both hand-rolled query SELECT lists and add `&o.GroupID` as the 14th Scan argument. Alternatively, migrate these two queries into `query/orders.sql` and re-run `sqlc generate` so the compiler catches column drift automatically.

---

### D-02 [🟠 MAJOR] Payment creation TOCTOU race — no row lock between check and insert

- **Where:** `be/internal/service/payment_service.go:71-93`
- **Problem:**
  ```go
  // Idempotency: reject if payment already exists for this order.
  if existing, err := s.repo.GetPaymentByOrderID(ctx, in.OrderID); err == nil {
      if existing.Status != db.PaymentsStatusFailed {
          return CreatePaymentResult{}, ErrPaymentAlreadyExists
      }
  }
  // ... then immediately:
  if err := s.repo.CreatePayment(ctx, ...); err != nil { ... }
  ```
  There is no transaction and no `SELECT ... FOR UPDATE` between the existence check and the insert. Two concurrent cashier taps on "Pay" (or a mobile client double-submit) can both pass the check simultaneously and both reach `CreatePayment`. Because `payments.order_id` has a `UNIQUE` constraint, the second insert will get a duplicate-key DB error that propagates as a generic 500 to the client — not `ErrPaymentAlreadyExists`. The schema comment says "retries must UPDATE, never INSERT" but the code does not enforce this with locking.
- **Why it matters:** This is a real-money path. A race produces a user-visible 500 error during cashier payment. Under normal load this is a near-zero probability event, but it becomes likely under load testing or on slow networks where retries are common.
- **Fix:** Wrap the check + insert in a transaction with `SELECT ... FOR UPDATE` on the payment row (by order_id), or use `INSERT ... ON DUPLICATE KEY UPDATE` semantics so the DB atomically guards the uniqueness. Example:
  ```sql
  INSERT INTO payments (id, order_id, method, status, amount, expires_at)
  VALUES (?, ?, ?, 'pending', ?, ?)
  ON DUPLICATE KEY UPDATE attempt_count = attempt_count + 1;
  ```

---

### D-03 [🟡 MINOR] `DATE()` wrapper defeats index on `staff_tasks.due_at` and `orders.updated_at`

- **Where:**
  - `be/query/tasks.sql:8` — `WHERE DATE(due_at) = ?`
  - `be/query/tasks.sql:36` — `AND DATE(due_at) = ?`
  - `be/internal/repository/order_repo.go:215` — `AND DATE(updated_at) = CURDATE()`
  - `be/internal/repository/analytics_repo.go:55-59` — `DATE(o.created_at) >= DATE_SUB(...)` / `DATE(o.created_at) = CURDATE()`
- **Problem:** Wrapping a column in `DATE()` makes MySQL unable to use a B-tree range scan on that column's index. The entire table must be scanned and the expression evaluated per row. `idx_tasks_due_at` on `due_at` and `idx_orders_created_at` on `created_at` are both wasted.
- **Why it matters:** At low volume (a restaurant) this is unlikely to cause visible slowness today, but it is a latent bug: analytics queries and the daily-metrics query grow O(n) with the total row count rather than being bounded by the day's data.
- **Fix:** Rewrite as a range predicate so the index can be used:
  ```sql
  -- Instead of: DATE(due_at) = ?
  WHERE due_at >= ? AND due_at < DATE_ADD(?, INTERVAL 1 DAY)

  -- Instead of: DATE(updated_at) = CURDATE()
  WHERE updated_at >= CURDATE() AND updated_at < CURDATE() + INTERVAL 1 DAY

  -- Instead of: DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
  WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
  ```

---

### D-04 [🟡 MINOR] OFFSET pagination on `orders` table will degrade with age

- **Where:** `be/query/orders.sql:18-21` (ListAllOrders) and `be/query/orders.sql:24-27` (ListOrdersByStatus)
  ```sql
  SELECT * FROM orders WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?;
  SELECT * FROM orders WHERE status = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?;
  ```
- **Problem:** MySQL must read and discard the first N rows for every OFFSET page. After 12 months of operation (e.g. 50 orders/day × 365 = ~18 000 rows), fetching page 180 means discarding 1 800 rows on every request. The `idx_orders_created_at` index helps MySQL sort cheaply, but the discard cost still scales linearly.
- **Why it matters:** The admin order history list will gradually slow down. This is currently low-risk given restaurant scale (~50 orders/day), but it will become noticeable at page 100+ (1 000+ rows scanned and discarded per request).
- **Fix:** Replace OFFSET with keyset (cursor) pagination: pass the `created_at` + `id` of the last seen row and use `WHERE created_at < ? OR (created_at = ? AND id < ?)`. This keeps page cost O(1) regardless of history depth.

---

### D-05 [💡 SUGGESTION] Per-item product/topping DB lookups during order creation — unbatched

- **Where:** `be/internal/service/order_service.go:285-300` (`CreateOrder`) and `order_service.go:376-387` (`buildToppingsSnapshot`)
- **Problem:**
  ```go
  for _, item := range in.Items {
      if item.ComboID != "" {
          // expandCombo → GetComboByID + GetComboItems + loop: GetProductByID per sub-item
      } else {
          // buildProductRow → GetProductSnapshot (GetProductByID)
          // buildToppingsSnapshot → loop: GetToppingSnapshot (GetToppingByID) per topping ID
      }
  }
  ```
  A 5-item order with 2 toppings each makes roughly 5 + 10 = 15 sequential DB round-trips before the INSERT. For a combo with 3 sub-items and 2 toppings per sub-item: 1 (combo) + 1 (combo_items) + 3 (products) + 6 (toppings) = 11 trips. All of these hit the product Redis cache (products:list, product:{id}) on warm paths, so real latency is low — but cold-start (after cache flush) hits DB serially.
- **Why it matters:** Not a production risk at current scale. Cache hit rate on product lookups is near 100% in practice (5-min TTL, menu rarely changes). Flag this as a future refactor: if the product cache is ever removed, order creation latency will increase proportionally with item count.
- **Fix (when needed):** Batch-load products and toppings by ID list in a single `SELECT ... WHERE id IN (...)` before the loop. The existing `GetComboItems` query already returns all sub-items in one shot; the same pattern can apply to products and toppings.

---

## What is GOOD (keep doing)

- **FK coverage is complete.** Every foreign key is declared with appropriate `ON DELETE` behaviour (CASCADE for child data, RESTRICT for business-critical references, SET NULL for audit-friendly soft links). No orphan risk found.
- **Currency type discipline.** All money columns use `DECIMAL(10,0)` — never FLOAT. The Go service correctly converts these to `int64` via `ParsePrice`/`parsePrice`. No rounding hazards.
- **Every migration has a Down block.** All 17 migrations include reversible Down SQL. Migration 017 documents the known limitation (backfilled topping data cannot be perfectly reversed) — this is acceptable and honest.
- **Composite index on hot order path.** `idx_orders_table_status (table_id, status)` in `005_orders.sql` directly serves `GetActiveOrderByTable` (the one-active-order check run on every new order for a table).
- **Transactions on write paths.** `CreateOrderWithItems` and `AppendOrderItems` wrap INSERT + RecalculateTotalAmount in a single DB transaction, preventing `total_amount` drift from partial writes.
- **Soft delete consistency.** Every table that needs soft delete has `deleted_at` and every query that reads from those tables includes `AND deleted_at IS NULL`. No missed filter found.
- **order_items item-type CHECK constraint.** The `chk_oi_item_type` CHECK constraint enforces the three-way exclusivity rule (standalone / combo header / combo sub-item) at the DB level — a strong correctness guard that survives any future service refactor.
- **Migration charset consistency.** All 17 migrations use `utf8mb4 COLLATE utf8mb4_unicode_ci` consistently — no charset mixing found.
