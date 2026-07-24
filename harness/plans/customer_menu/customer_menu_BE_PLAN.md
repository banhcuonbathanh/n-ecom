# Customer Menu — Backend Build Plan (F-30)

> **TL;DR:** How the backend behind `/menu` actually gets built — packages, migrations,
> sqlc queries, service methods, transaction bodies, cache keys, routes, and the
> order-expansion algorithm — sliced into buildable tasks with curl receipts.
>
> **Ownership boundary (one fact one home).**
> [`customer_menu_PLAN.md §3`](customer_menu_PLAN.md) owns **WHAT** the BE exposes —
> the 6 endpoints, wire shapes, cache map, and what we did not adopt from the reference.
> This file owns **HOW** it is built and never restates that contract; it links to it.
> Same relationship as [`BE_STATE.md`](../../BE_STATE.md) (design) ⇄
> [`BE_PLAYBOOK.md`](../../BE_PLAYBOOK.md) (workmanship). Tables/columns stay in
> [`DB_SCHEMA.md`](../../DB_SCHEMA.md); task status stays in [`TASKS.md`](../../TASKS.md).
>
> Written 2026-07-24 (F-30) by reading the contract against `BE_STATE.md`,
> `BE_PLAYBOOK.md`, `DB_SCHEMA.md`, `ARCHITECTURE.md §2/§4` and `OVERALL_PLAN.md §3.4/§3.6/§3.7`.
> **The reconciliation surfaced 8 findings (§10)** — three of them (F27, F30, F31) would
> have become real bugs at build time.

---

## 1. Scope — what the backend must ship for `/menu`

The six endpoints the page consumes, in build order. Behavior/wire shapes are **not**
repeated here — each row points at its contract home.

| # | Route | Contract | Build slice (§3) |
|---|---|---|---|
| 1 | `GET /api/v1/categories` | [PLAN §3.1 #1](customer_menu_PLAN.md) · shape [§3.5](customer_menu_PLAN.md) | BE-M2 |
| 2 | `GET /api/v1/products` | [PLAN §3.1 #2](customer_menu_PLAN.md) | BE-M2 |
| 3 | `GET /api/v1/combos` | [PLAN §3.1 #3](customer_menu_PLAN.md) | BE-M3 |
| 4 | `POST /api/v1/auth/guest/online` | [PLAN §3.1 #4](customer_menu_PLAN.md) · [OVERALL_PLAN §3.4](../../OVERALL_PLAN.md) | BE-M4 |
| 5 | `POST /api/v1/orders` | [PLAN §3.1 #5](customer_menu_PLAN.md) · algorithm §7 below | BE-M6 |
| 6 | `POST /api/v1/orders/:id/items` | [PLAN §3.1 #6](customer_menu_PLAN.md) · algorithm §7.4 | BE-M6 |

> **⛔ v1 scope cut — owner ruling 2026-07-24 ([F39](../../FINDINGS.md)).** Row 4
> (`POST /auth/guest/online`) is **not built in v1**: no `/checkout` page means no online
> order means no table-less session. **BE-M4 ships one mint, not two** — `POST /auth/guest/:qr_token`
> — and BE-M6 drops the online-only branches: the `customer_name`-required validation (§5.5,
> §6.3), the `source == "online"` check in §7.1, and the `/online` half of the T-1 receipt (§9).
> `auth.MintGuestOnline` (§5.2) is not written. **Everything else is unchanged, including
> `orders.guest_id`** — the column stays (F27's ruling holds; it is also the append-mode
> ownership key for a re-scanned session) and turning the online path back on is a handler,
> not a migration.

**Also built here because the page cannot run without them:** the catalog schema +
seed (BE-M1), the QR-side guest mint `POST /auth/guest/:qr_token` (BE-M4 — the menu
page's other entry path), and the two detail reads `GET /products/:id` /
`GET /combos/:id` that C-5's `/menu/product/[id]` and `/menu/combo/[id]` consume.

**Out of scope (named so nobody builds them here):** admin/manager write endpoints
(`plans/admin_products`, `plans/admin_combos`, `plans/admin_toppings` own those),
the SSE monitor stream (R-1, `plans/customer_orders_tracking`), order reads
(`GET /orders*` → O-2), payments, and anything cart-shaped — the cart is FE-only
client state ([PLAN §4.2](customer_menu_PLAN.md)) and has **no** backend surface.

## 2. Alignment — what governs this build (read, don't restate)

| Concern | Owning doc |
|---|---|
| Endpoint behavior, wire shapes, cache map, "not adopted" | [`customer_menu_PLAN.md §3`](customer_menu_PLAN.md) |
| Layering, tx policy, error enum, validation tiers, folder layout | [`BE_STATE.md`](../../BE_STATE.md) §2–§9 |
| goose+sqlc pipeline, migration checklist, Go/Gin gotchas, seed/smoke, BE_SUMMARY | [`BE_PLAYBOOK.md`](../../BE_PLAYBOOK.md) §1–§7 |
| Tables, columns, row-type matrix, worked examples | [`DB_SCHEMA.md`](../../DB_SCHEMA.md) §4.1/§4.2/§4.3/§7/§8 |
| Layer contract table, Redis policy | [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §2, §4 |
| Guest-auth design, Redis key policy, order state machine | [`OVERALL_PLAN.md`](../../OVERALL_PLAN.md) §3.4, §3.6, §3.7 |
| Commands (build, sqlc, compose, migrate) | [`ENVIRONMENT.md §Commands`](../../ENVIRONMENT.md) |

Where a reference doc and a harness doc conflict, the harness wins. Where **two harness
docs** conflict, that is a finding — §10 has eight of them, each with a plan default so
the build is never blocked on a doc argument.

## 3. Build spine — six slices, in dependency order

Follows [`BE_PLAYBOOK.md §5`](../../BE_PLAYBOOK.md) (DDL → queries → generate → platform →
vertical slices → wiring) and the "one domain through all three layers before the next" rule.

```
F-2 skeleton ─┐
F-3 goose+sqlc├─▶ BE-M1 catalog schema+seed ─▶ BE-M2 categories+products ─▶ BE-M3 combos
F-4 errs+CI  ─┘                                          │
                                                         ▼
              BE-M4 tables+guest JWT+rate limit ─▶ BE-M5 orders schema ─▶ BE-M6 POST /orders (+append)
```

| Slice | Delivers | TASKS.md row | Blocked by |
|---|---|---|---|
| **BE-M1** | catalog migration (6 tables) + menu-complete seed | C-1 | F-3 |
| **BE-M2** | `GET /categories`, `GET /products`, `GET /products/:id` + cache-aside | C-2 | BE-M1, F-4 |
| **BE-M3** | `GET /combos`, `GET /combos/:id` | C-3 | BE-M2 |
| **BE-M4** | `tables` + `order_sequences` migration, both guest mints, rate limit, guest auth middleware | **T-1 (unregistered — §8)** | BE-M1 |
| **BE-M5** | `orders` + `order_items` migration | O-1 | BE-M1 |
| **BE-M6** | `POST /orders`, `POST /orders/:id/items` | **O-0 (unregistered — §8)** | BE-M4, BE-M5 |

Each slice is one session and ends with a curl receipt (§9). BE-M2 additionally opens
`harness/BE_SUMMARY.md` per [`BE_PLAYBOOK.md §7`](../../BE_PLAYBOOK.md).

---

## 4. Data layer

### 4.1 Migrations — exact files

Numbers assume F-3 lands `001_init`. Column specs are **not** repeated here — every
`CREATE TABLE` implements [`DB_SCHEMA.md §4`](../../DB_SCHEMA.md) verbatim, and the
per-file checklist is [`BE_PLAYBOOK.md §2`](../../BE_PLAYBOOK.md).

| File | Slice | Creates | Notes for the author |
|---|---|---|---|
| `be/db/migrations/002_catalog.sql` | BE-M1 | `categories`, `products`, `toppings`, `product_toppings`, `combos`, `combo_items` | FK order matters: categories → products → toppings → junction → combos → combo_items; `Down` drops in reverse. No `filling` column, ever ([§2 field-name law](../../DB_SCHEMA.md)) |
| `be/db/migrations/003_tables.sql` | BE-M4 | `tables`, `order_sequences` | `qr_token CHAR(64) UNIQUE`; `order_sequences(seq_date DATE PK, current_value INT)` |
| `be/db/migrations/004_orders.sql` | BE-M5 | `orders`, `order_items` | carries `chk_oi_item_type` (the row-type CHECK), `qty_served` CHECK `0..quantity`, self-FK `combo_ref_id`, and — per **F27** — `orders.guest_id CHAR(36) NULL` |

After **every** one of these: `sqlc generate && go build ./...` before writing any Go
that touches the change ([`BE_PLAYBOOK.md §1`](../../BE_PLAYBOOK.md) golden rule).

### 4.2 Seed (`be/cmd/seed`) — the menu-complete AC

C-1's acceptance criterion is stricter than TASKS.md's generic-shop wording, because
the menu page renders five card kinds from day one
([PLAN §3.2](customer_menu_PLAN.md)):

- ≥ 3 categories with distinct `sort_order` (TRỨNG · BÁNH CUỐN · GIÒ) **+ a CANH category**
- ≥ 10 products including **both canh variants** (*Canh có rau* / *Canh không rau*, ₫0)
- the ₫0 nhân topping set + `product_toppings` rows so at least one product has 2 nhân,
  one has 1, and one (Bánh Chay/Giò) has none — all three pill states are renderable
- ≥ 2 combos with `combo_items` templates that **exclude canh rows** (**F30** — otherwise
  server-side expansion double-counts the soup the FE already sends as its own line)
- ≥ 1 `tables` row seeded as *Bàn 04* with a deterministic dev `qr_token` (BE-M4)

Idempotent and re-runnable on a fresh volume ([`BE_PLAYBOOK.md §6`](../../BE_PLAYBOOK.md)).
Reuse the reference's real menu numbers so every doc, screenshot and receipt agrees on
the worked example (Bàn 04 · 103.000 đ · badge 13).

### 4.3 sqlc queries — one file per domain, every method named

`-- name:` methods read as repository calls; every read carries its soft-delete /
availability filter **in the SQL** ([`BE_PLAYBOOK.md §1`](../../BE_PLAYBOOK.md)).

**`be/db/queries/catalog.sql`** (BE-M2)

| Method | Mode | What |
|---|---|---|
| `ListCategories` | `:many` | `is_active=1 AND deleted_at IS NULL ORDER BY sort_order, name` |
| `ListAvailableProducts` | `:many` | `is_available=1 AND deleted_at IS NULL ORDER BY sort_order, name` |
| `ListProductToppingLinks` | `:many` | junction ⨝ toppings for all available products → `(product_id, id, name, price)`; the service assembles (§5.2) |
| `GetAvailableProduct` | `:one` | detail for `/menu/product/[id]`; `sql.ErrNoRows` → `NOT_FOUND` |
| `ListToppingsForProduct` | `:many` | detail-page toppings |

**`be/db/queries/combos.sql`** (BE-M3)

| Method | Mode | What |
|---|---|---|
| `ListActiveCombos` | `:many` | `is_available=1 AND deleted_at IS NULL ORDER BY sort_order` |
| `ListItemsForActiveCombos` | `:many` | all `combo_items` of active combos → `(combo_id, id, product_id, quantity)` |
| `GetActiveCombo` | `:one` | detail |
| `ListComboItems` | `:many` | items of one combo |

**`be/db/queries/orders.sql`** (BE-M6)

| Method | Mode | What |
|---|---|---|
| `ListProductsByIDs` | `:many` | snapshot source: name + price + is_available for the whole payload in ONE query |
| `ListToppingsByIDs` | `:many` | snapshot source for `toppings_snapshot` |
| `ListComboItemsByComboIDs` | `:many` | template rows for expansion (§7.2) |
| `NextOrderSequence` | `:one` | `INSERT INTO order_sequences (seq_date,current_value) VALUES (CURDATE(),1) ON DUPLICATE KEY UPDATE current_value=LAST_INSERT_ID(current_value+1)` — race-free counter (**F32**) |
| `CreateOrder` | `:exec` | app-generated UUID; `status='pending'`, `total_amount=0`, `created_by=NULL` |
| `CreateOrderItem` | `:exec` | one row per expanded line (§7.2) |
| `RecalculateOrderTotal` | `:exec` | `UPDATE orders SET total_amount=(SELECT COALESCE(SUM(unit_price*quantity),0) FROM order_items WHERE order_id=?) WHERE id=?` — header rows contribute 0 by construction |
| `GetOrderForUpdate` | `:one` | `SELECT … FOR UPDATE` — append mode |
| `GetOrder` / `ListOrderItems` | `:one`/`:many` | read-back for the 201 body |

**`be/db/queries/tables.sql`** (BE-M4): `GetTableByQRToken :one`, `GetTableByID :one`.

`emit_empty_slices: true` matters here — `[]` never renders as `null` for the three
list endpoints ([`BE_PLAYBOOK.md §1`](../../BE_PLAYBOOK.md) sqlc table).

---

## 5. Domain layer

### 5.1 Package/file inventory (exact paths — the scope contract skeleton)

Extends [`BE_STATE.md §8`](../../BE_STATE.md); `+` = new in this plan's slices.

```
be/
  cmd/api/main.go                       + routes/wiring for slices M2–M6
  cmd/seed/main.go                      + §4.2
  cmd/smoke/main.go                     + health → categories → products → combos → POST /orders
  internal/
    handler/catalog/{handler.go,dto.go} + M2/M3: 5 GET handlers, response DTOs
    handler/orders/{handler.go,dto.go}  + M6: create + append, request/response DTOs
    handler/auth/{handler.go,dto.go}    + M4: 2 guest mints (no request body)
    service/catalog/{service.go,cache.go}+ M2/M3: cache-aside + assembly
    service/orders/{service.go,expand.go}+ M6: the tx + the expansion algorithm (§7)
    service/auth/guest.go               + M4: mint from qr_token / table-less
    repository/catalog/repo.go          + thin sqlc wrappers
    repository/orders/repo.go           + thin sqlc wrappers (accept a Querier — WithTx)
    repository/tables/repo.go           + thin sqlc wrappers
    domain/constants.go                 ~ + error codes, order status enum, cookie names
    platform/cache/keys.go              + THE key builders (§5.4) — one per family
    platform/middleware/guest.go        + guest-JWT verify → typed claims in ctx
    platform/middleware/ratelimit.go    + M4: per-IP limiter on both mint routes
  db/{migrations,queries}/              + §4.1, §4.3
```

Nothing else is touched. A file not in this tree means STOP and re-scope
([`ARCHITECTURE.md §5`](../../ARCHITECTURE.md) gate 2).

### 5.2 Service methods — the contract of the middle layer

| Method | Tx | Cache | Errors it can raise |
|---|---|---|---|
| `catalog.ListCategories(ctx)` | ❌ | read `categories:list` | — (fail-open to MySQL) |
| `catalog.ListProducts(ctx)` | ❌ | read `products:list` | — |
| `catalog.GetProduct(ctx, id)` | ❌ | read `product:<id>` | `NOT_FOUND` |
| `catalog.ListCombos(ctx)` | ❌ | read `combos:list` | — |
| `catalog.GetCombo(ctx, id)` | ❌ | read `combo:<id>` | `NOT_FOUND` |
| `auth.MintGuestFromQR(ctx, qrToken)` | ❌ | — | `NOT_FOUND` (bad/inactive token), `RATE_LIMITED` (middleware) |
| `auth.MintGuestOnline(ctx)` | ❌ | — | `RATE_LIMITED` (middleware) |
| `orders.Create(ctx, guest, in)` | ✅ | none (orders are never cached) | `VALIDATION_FAILED`, `NOT_FOUND`, `FORBIDDEN` |
| `orders.AppendItems(ctx, guest, orderID, items)` | ✅ | none | + `ORDER_CLOSED` (new code — §5.5) |

`ListProducts` is **two queries assembled in Go**, not one `JSON_ARRAYAGG`: products +
topping links, joined into the response map in the service. Reason — the aggregate form
needs an sqlc `overrides` row and hand-typed JSON scanning for a payload we cache anyway;
two indexed reads on a one-restaurant catalog are cheaper than the typing risk. Same
shape for `ListCombos` + its items.

`guest` is an explicit typed parameter (`domain.GuestIdentity{GuestID, TableID, Source}`),
never dug out of `context` inside the service ([`BE_STATE.md §9`](../../BE_STATE.md) rule 7).

### 5.3 Transaction body — `POST /orders` (the only tx on this page)

One tx, opened as late as possible, holding **only writes**:

```
[outside tx]  batch-load products / toppings / combo templates  → validate → snapshot map
[BEGIN]
   NextOrderSequence            → ORD-YYYYMMDD-NNN
   CreateOrder                  → status pending, total 0
   CreateOrderItem × N          → the expansion (§7.2)
   RecalculateOrderTotal
[COMMIT]
[after]       GetOrder + ListOrderItems → 201 body
```

⚠ **This deliberately differs from [`BE_STATE.md §3`](../../BE_STATE.md)'s "place order"
row**, which locks stock rows `FOR UPDATE`. That row describes the *generic shop*
checkout; a restaurant order decrements no inventory at order time
([`OVERALL_PLAN.md §3.7`](../../OVERALL_PLAN.md) rule 3, "stock-free"), so there is
nothing to lock and the catalog reads move outside the tx. Recorded as **F33** —
`BE_STATE.md §3` gets the second row when the O phase opens.

### 5.4 Cache — key builders, TTL, invalidation entry points

The **map** (write → DEL keys) is owned by [PLAN §3.3](customer_menu_PLAN.md). What this
plan adds is where the code lives:

- `platform/cache/keys.go` holds **one builder per family** — `CategoriesListKey()`,
  `ProductsListKey()`, `ProductKey(id)`, `CombosListKey()`, `ComboKey(id)`,
  `ToppingsListKey()` — used by every reader **and** every invalidator
  ([`BE_PLAYBOOK.md §4`](../../BE_PLAYBOOK.md): the old system's stale-key bug was two
  call sites spelling one key differently).
- One TTL constant per family in the same file: `CatalogTTL = 5 * time.Minute`
  (matches the FE `staleTime` so the two staleness bounds can't drift).
- Cache-aside lives in `service/catalog` only; handlers and repositories never see the
  `Cache` interface ([`BE_STATE.md §7`](../../BE_STATE.md)).
- Errors from Redis are logged and swallowed — fail-open to MySQL.
- **Invalidation is not called from this page's code at all**: every DEL is on a write
  path owned by the admin plans. This plan's obligation is only to *export the builders*
  so those plans call the same strings. The AC that proves it lands in C-2 (a write →
  DEL → next read is fresh transcript).

Key **spelling** (`products:list`, not `v1:catalog:list:{hash}`) and the 5-min TTL follow
the four page plans; [`ARCHITECTURE.md §4`](../../ARCHITECTURE.md) still carries the older
`v1:{domain}:{entity}:{id}` / 60 s proposal → **F29**, amend it at C-2 when the Redis
policy locks.

### 5.5 Error mapping

Every code this page can emit already exists in
[`BE_STATE.md §4`](../../BE_STATE.md) except one:

| Situation | Code | HTTP | Layer |
|---|---|---|---|
| malformed JSON / bad types | `VALIDATION_FAILED` | 400 | handler (binding) |
| `quantity < 1`, unknown/unavailable product id, empty `items`, online order without name | `VALIDATION_FAILED` + `details[]` | 422 | service |
| unknown product/combo/order/table id | `NOT_FOUND` | 404 | service (from `sql.ErrNoRows`) |
| guest JWT missing/expired on a write route | `UNAUTHORIZED` | 401 | middleware |
| body `table_id` ≠ JWT `table_id`; appending to someone else's order | `FORBIDDEN` | 403 | service |
| burst on either guest mint | `RATE_LIMITED` | 429 | middleware |
| append to an order past `preparing` / cancelled | **`ORDER_CLOSED`** | 409 | service |

`ORDER_CLOSED` is a **new enum member** — it lands in `domain/constants.go`, the
[`BE_STATE.md §4`](../../BE_STATE.md) table, and `fe/src/lib/api/types.ts` in the **same**
scope contract as BE-M6 ([`BE_STATE.md §9`](../../BE_STATE.md) rule 8). Do not invent
`PRODUCT_UNAVAILABLE` — an 86'd dish is a field-level `VALIDATION_FAILED` detail
(`{field:"items[2].product_id", issue:"unavailable"}`), which is what the FE already
branches on.

---

## 6. HTTP layer

### 6.1 Routes + middleware chain

All under `/api/v1`; the global chain is `recover → request-log` for everything.

| Method | Path | + chain | Handler | Slice |
|---|---|---|---|---|
| GET | `/categories` | — | `catalog.ListCategories` | M2 |
| GET | `/products` | — | `catalog.ListProducts` | M2 |
| GET | `/products/:id` | — | `catalog.GetProduct` | M2 |
| GET | `/combos` | — | `catalog.ListCombos` | M3 |
| GET | `/combos/:id` | — | `catalog.GetCombo` | M3 |
| POST | `/auth/guest/:qr_token` | `ratelimit` | `auth.MintFromQR` | M4 |
| POST | `/auth/guest/online` | `ratelimit` | `auth.MintOnline` | M4 |
| POST | `/orders` | `guestAuth` | `orders.Create` | M6 |
| POST | `/orders/:id/items` | `guestAuth` | `orders.AppendItems` | M6 |

**No query parameters on any GET** — filtering and search are client-side
([PLAN §3.4](customer_menu_PLAN.md)); shipping params the handler ignores is the exact
docs-vs-code trap we are designing out.

### 6.2 DTOs and the gate-8 mirror

Request/response structs live in `handler/<domain>/dto.go`; sqlc row types never leak
past the service ([`BE_STATE.md §2`](../../BE_STATE.md)). Field spellings come from
[PLAN §3.5](customer_menu_PLAN.md) — `price` not `base_price`, `image_path` relative,
real `null` (never `""`) for nullable columns
([`DB_SCHEMA.md §6`](../../DB_SCHEMA.md) ruling 1).

Two rules that decide the FE's fate:

1. **`fe/src/lib/api/types.ts` is written from the curl receipt**, not from this doc —
   the receipt is the contract ([`ARCHITECTURE.md §5`](../../ARCHITECTURE.md) gate 8).
2. **The 201 body is the full order object**, including `order_number` (**F28**) — the
   thin `{id}` DTO is what produced "Đơn #undefined" in the old system.

Nullable columns → `*string` / `sql.NullString` mapped to real `null`; money is a bare
integer (`DECIMAL(10,0)` → `int64`), never a string, never a float.

### 6.3 Validation split

Handler (binding tags): `items` `required,min=1,dive`; `quantity` `required,min=1`;
ids `required,uuid4`. Service: existence + availability of every id, combo template
non-empty, online-path `customer_name` present, append-mode order state.
**Numeric gotcha:** `binding:"required"` rejects `0` — any future zero-legal number
(`qty_served`, a ₫0 price) uses `min=0` without `required`
([`BE_PLAYBOOK.md §3`](../../BE_PLAYBOOK.md) rule 1).

### 6.4 Guest auth (BE-M4)

- Both mints set the **httpOnly cookie** and return **no token in the body**
  ([PLAN §3.4](customer_menu_PLAN.md), F-5 decision). 2 h TTL.
- Claims: `{guest_id (uuid, always), table_id (uuid|null), source ('qr'|'online'), exp}`.
  `guest_id` is minted per session and is what makes an **online** order ownable —
  see **F27**, which needs `orders.guest_id` to exist for that to work.
- Verify: HMAC signing method checked **before** claims are trusted
  ([`BE_PLAYBOOK.md §3`](../../BE_PLAYBOOK.md) rule 4). Middleware is the only writer of
  the claims context key; handlers read it through one typed helper and pass the identity
  down as a parameter.
- Rate limit: per-IP, mounted on **both** mint routes from day one (the reference wrote
  the middleware and never mounted it), Redis counters, fail-open.

---

## 7. The order-create algorithm (the part that is easy to get wrong)

Implements [`DB_SCHEMA.md §4.3`](../../DB_SCHEMA.md)'s row-type matrix and the two worked
examples in its §7/§8. Everything price- or name-shaped is **server-snapshotted**; the
wire carries ids and quantities only.

### 7.1 Identity and trust boundary (before anything else)

```
claims := guest from cookie JWT
source  := claims.source            // NEVER from the body
tableID := claims.table_id          // NEVER from the body
if body.table_id != nil && *body.table_id != tableID  → FORBIDDEN     (F31)
if source == "online" && body.customer_name == ""      → VALIDATION_FAILED
```

The body's `source`/`table_id` in [PLAN §3.5](customer_menu_PLAN.md) exist for readability;
the server treats them as *assertions to check*, never as inputs. `created_by` stays
`NULL` (guest self-order — never a staff row), `guest_id` is stamped from the claim.

### 7.2 Expansion — request lines → `order_items` rows

For each request line, in payload order:

**A. Product line** (`product_id` set) → **1 standalone row**

```
name        = products[pid].name          // snapshot
unit_price  = products[pid].price         // snapshot
quantity    = line.quantity
combo_id    = NULL, combo_ref_id = NULL
toppings_snapshot = [ {id,name,price} for each line.topping_ids ]   // real values, never assumed 0
note        = line.note
```

**B. Combo line** (`combo_id` set) → **1 header row + N sub-item rows**

```
header:   product_id NULL · combo_id set · combo_ref_id NULL
          name = combos[cid].name · unit_price = 0        ← label row, prevents double-count
          quantity = line.quantity · toppings_snapshot NULL

for each template row t in combo_items[cid]:              ← from the DB template, NOT the body (F26)
   sub-item: product_id = t.product_id · combo_id NULL · combo_ref_id = header.id
             name       = products[t.product_id].name     // snapshot
             unit_price = products[t.product_id].price    // snapshot — the real charge lives here
             quantity   = t.quantity * line.quantity      ← multiply, don't copy
             toppings_snapshot = line.topping_ids ∩ product_toppings[t.product_id]   (F26, sub-question 2)
```

**Canh never rides inside a combo.** The FE strips soup lines from combo overrides and
sends the chosen variant as its own top-level product line
([`DB_SCHEMA.md §8`](../../DB_SCHEMA.md)); the BE's half of that contract is that
**seeded `combo_items` templates contain no canh rows** (**F30**) — so expansion needs no
`isSoupName` twin in Go, and no order can end up with two soups.

### 7.3 Order row, number, total

```
order_number = "ORD-" + YYYYMMDD + "-" + zeroPad3(NextOrderSequence())   // in-tx, race-free (F32)
status       = "pending"        // BE-set, never from the body
total_amount = 0 → RecalculateOrderTotal() after the last insert, same tx
```

The recalc is a single SQL statement summing `unit_price * quantity`; header rows
contribute 0 by construction, canh rows contribute 0 by price. Worked example
([`DB_SCHEMA.md §7`](../../DB_SCHEMA.md)): 2 lines → **5 rows** → ₫33,000. Use it as the
BE-M6 unit-test fixture.

**Not enforced by the BE in v1:** "every order has a canh" is an FE gate keyed off a cart
id convention ([`DB_SCHEMA.md §8`](../../DB_SCHEMA.md)) — POS, imports and tests can
legally write a canh-less order. If it must become a guarantee it is a *service*
validation, not a column; not adopted in v1.

**One-active-order-per-table** ([`OVERALL_PLAN.md §3.7`](../../OVERALL_PLAN.md) rule 4) is
still ❓ open. If the owner's hard-block default stands, it becomes a pre-insert check in
this same tx returning `409` — a ~10-line addition, so BE-M6 is not blocked on the ruling.

### 7.4 Append mode — `POST /orders/:id/items`

```
[BEGIN]
  GetOrderForUpdate(:id)                              // row lock — concurrent appends serialize
  if order.table_id != claims.table_id
     && order.guest_id != claims.guest_id  → FORBIDDEN            (needs F27's column)
  if order.status ∉ {pending, confirmed, preparing}   → ORDER_CLOSED 409
  same expansion as §7.2 → CreateOrderItem × N
  RecalculateOrderTotal
[COMMIT] → 200 with the full order object (same DTO as create)
```

The 2 h guest JWT can expire mid-flow on a long meal — that is a UX question
([PLAN §7](customer_menu_PLAN.md) ❓); the BE's answer is unconditional: expired ⇒ `401`,
no silent re-mint.

---

## 8. Task mapping — rows this build needs

Four slices land on existing rows; **two have no row yet** and must be registered before
their session starts ([CLAUDE.md](../../../CLAUDE.md) "task not in TASKS.md" rule). Row
text is drafted here so registration is a paste, not a re-derivation.

| Slice | Row | Status |
|---|---|---|
| BE-M1 | `C-1` | exists — **AC needs widening** to §4.2's menu-complete seed (combos, ₫0 toppings, both canh, canh-free templates) |
| BE-M2 | `C-2` | exists — AC already curl-shaped; add the cache hit/miss/DEL transcript + open `BE_SUMMARY.md` |
| BE-M3 | `C-3` | exists as "category list + product search" — **repurpose to combos** per [PLAN §5](customer_menu_PLAN.md) (search is client-side) |
| BE-M4 | **`T-1` (new)** | *"BE: tables + order_sequences migration, guest-JWT mint (QR + online) with httpOnly cookie, per-IP rate limit, guest auth middleware."* Deps C-1, F-4. AC: curl — cookie set on both mints, 401 without it on a protected route, 429 on burst, bad `qr_token` → 404 |
| BE-M5 | `O-1` | exists — retitle from `order_lines` to `order_items` + the CHECK-constrained row shapes ([`DB_SCHEMA.md §4.3`](../../DB_SCHEMA.md)) |
| BE-M6 | **`O-0` (new)** | *"BE: order create + append — `POST /orders`, `POST /orders/:id/items`; combo expansion, price/name snapshot, in-tx recalc, order-number sequence, ownership gates."* Deps T-1, O-1. AC: §9's transcripts incl. the ₫33,000 worked example and a `403`/`409` refusal |

Registering these two rows is **not** part of F-30 (this task ships the plan, not the
task board) — they are registered when the T/O phase opens, so the ids can't collide
with a parallel session ([F04/F25](../../FINDINGS.md)).

## 9. Verify plan — the receipts each slice owes

Logged in [`VERIFICATION.md`](../../VERIFICATION.md); tokens scrubbed
([`ENVIRONMENT.md`](../../ENVIRONMENT.md) secrets rule 4).

| Slice | Receipt |
|---|---|
| BE-M1 | `goose up` → `goose down` → `goose up` clean; seed counts (`SELECT COUNT(*)` per table) proving the §4.2 AC, incl. `SELECT … FROM combo_items ci JOIN products p … WHERE p.name LIKE 'Canh%'` returning **0 rows** (F30) |
| BE-M2 | `curl /categories`, `/products`, `/products/:id`, `/products/<unknown>` → envelope 404; Redis: `MONITOR`/`TTL` showing miss→`SET`(300 s)→hit; one admin write → `DEL` → next read fresh; `docker stop cache` → reads still 200 (fail-open) |
| BE-M3 | `curl /combos` showing ids-only `combo_items`; `/combos/:id` |
| BE-M4 | `curl -i -X POST /auth/guest/<qr_token>` → `Set-Cookie` httpOnly, no body token; same for `/online`; 6 rapid mints → `429` envelope; `POST /orders` without cookie → `401` |
| BE-M5 | migrate up/down clean; a hand-inserted combo-header row with `unit_price != 0` **rejected** by `chk_oi_item_type` |
| BE-M6 | the §7.3 worked example end to end: POST → 201 full object with `order_number`, 5 `order_items` rows matching the [`DB_SCHEMA.md §7`](../../DB_SCHEMA.md) table, `total_amount = 33000`; append round-trip; `403` on a foreign table; `409 ORDER_CLOSED` on a delivered order; `422` with `details[]` on an 86'd product |
| all | `go build ./... && go vet ./...` + `cmd/smoke` green after each compose rebuild |

Receipts double as the API contract — `fe/src/lib/api/types.ts` is written **from these
transcripts** (gate 8), never from this document.

## 10. Findings raised by this plan

Eight reconciliations; each has a plan default so no slice is blocked. Tracked as
`F26`–`F33` in [`FINDINGS.md`](../../FINDINGS.md) — that ledger owns their status.

| # | Sev | What | Plan default (build to this unless the owner rules otherwise) |
|---|---|---|---|
| **F26** | ⚠️ | **Combo line under-specified.** [`DB_SCHEMA.md §7`](../../DB_SCHEMA.md)'s payload sends a client `combo_items` override; [PLAN §3.5](customer_menu_PLAN.md) sends `combo_id + quantity + topping_ids` only. And no doc says where a combo line's `topping_ids` land | **Server expands from the DB template**; a client `combo_items` array is rejected `422` in v1 (component swapping is not a v1 feature, and accepting it lets a client author its own suất). Line toppings are snapshotted onto each expanded sub-item **whose product allows them** (junction check); the header keeps `NULL` |
| **F27** | 🚨 | **Online orders have no ownership column.** The table-less guest JWT identifies a guest, but `orders` has no place to store it ([`DB_SCHEMA.md §4.3`](../../DB_SCHEMA.md)) — so `table_id IS NULL` orders are unownable. This is precisely the old bug [`OVERALL_PLAN.md §3.4`](../../OVERALL_PLAN.md) promises to fix | Add `orders.guest_id CHAR(36) NULL` (indexed) in migration `004`; ownership = `table_id` match **or** `guest_id` match. **Schema amendment requested — not written here** ([`DB_SCHEMA.md §4.3`](../../DB_SCHEMA.md) owns it) |
| **F28** | ⚠️ | `order_number` is `NOT NULL UNIQUE` in the schema and printed by the FE ("Đơn #…"), but missing from the 201 wire shape in [PLAN §3.5](customer_menu_PLAN.md) | Include `order_number` in the create/append response DTO; the menu plan's §3.5 sample gets the field when C-2's receipt freezes shapes |
| **F29** | ⚠️ | **Cache-key + TTL drift.** [`ARCHITECTURE.md §4`](../../ARCHITECTURE.md) says `v1:{domain}:{entity}:{id}` @ 60 s; four page plans + [`OVERALL_PLAN.md §3.6`](../../OVERALL_PLAN.md) say `products:list` @ 5 min | Short names + 5 min (matches the FE `staleTime`, and four docs beat one). Amend `ARCHITECTURE.md §4` when C-2 locks the Redis policy |
| **F30** | ⚠️ | **Double-canh trap.** The FE strips soup from combos and sends it as its own line; if a seeded `combo_items` template still contains a canh row, server expansion re-adds it | Seeded templates contain **no** canh rows; C-1's receipt proves it with a 0-row query. No name-matching in Go |
| **F31** | ⚠️ | `table_id`/`source` appear in the `POST /orders` body — a client could post to another table | Both derived from the guest JWT; a body value that disagrees is `403`, never authoritative |
| **F32** | 💡 | **Order-number source.** [`DB_SCHEMA.md §4.2`](../../DB_SCHEMA.md) makes Redis primary with a DB fallback + a re-seed rule | Use the in-tx `order_sequences` upsert as the *only* source: race-free, no re-seed failure mode, ample for one restaurant. Redis counter stays a documented optimization, unbuilt |
| **F33** | ⚠️ | [`BE_STATE.md §3`](../../BE_STATE.md)'s "place order" tx row describes stock locking (generic shop); a restaurant order is stock-free, so this page's tx body differs (§5.3) | Build §5.3; add the restaurant row to `BE_STATE.md §3` when the O phase opens |

Standing flags this plan inherits and does **not** re-decide: the customer-shell theme
([F01](../../FINDINGS.md)), the `/orders` deep-link gap ([F02](../../FINDINGS.md)), the
cancel rule ([F11](../../FINDINGS.md)), and the one-active-order-per-table ruling
([`OVERALL_PLAN.md §3.7`](../../OVERALL_PLAN.md) rule 4).

---

*Written 2026-07-24 (F-30). This file owns the **build** of the menu page's backend —
slices, files, queries, service contracts, the expansion algorithm, and the receipts.
The **contract** it builds toward stays in [`customer_menu_PLAN.md §3`](customer_menu_PLAN.md);
the rules it obeys stay in the docs named in §2; task status stays in
[`TASKS.md`](../../TASKS.md).*
