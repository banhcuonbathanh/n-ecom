# Admin Toppings — `/admin/toppings` · Backend View

> **TL;DR:** every BE endpoint the toppings page calls, traced handler → service → repository →
> SQL, with auth, caching and error behaviour. Topping CRUD lives inside the **products domain**
> (one handler/service/repo trio). Traced from source on branch `experience_claude.md_system_1`
> (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/product_handler.go` ·
> `be/internal/service/product_service.go` · `be/internal/repository/product_repo.go` ·
> `be/internal/db/products.sql.go` · `be/query/products.sql` · `be/migrations/002_products.sql`.
>
> FE view + zones → [admin_toppings.md](admin_toppings.md) ·
> Cross-page (write fan-out to menu/product detail/POS) → [admin_toppings_crosspage_dataflow.md](admin_toppings_crosspage_dataflow.md) ·
> Loading behaviour → [admin_toppings_loading.md](admin_toppings_loading.md) ·
> DB field names → [../../../02_spec/DB_SCHEMA.md](../../../02_spec/DB_SCHEMA.md)

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `GET /toppings` | **public** | `productH.ListToppings` (`product_handler.go:253`) | `ListToppings` (`product_service.go:432`) | `repo.ListToppings` → sqlc `ListToppings` (`products.sql:64`) | `toppings:list` (read + set) |
| 2 | `GET /products/all` | authMW + `AtLeast("manager")` | `productH.ListAllProducts` (`product_handler.go:57`) | `ListAllProducts` (`product_service.go:194`) | `repo.ListProducts` + `GetToppingsByProductID` per product (**N+1**) | **none — uncached** |
| 3 | `POST /toppings` | authMW + `AtLeast("manager")` | `productH.CreateTopping` (`product_handler.go:277`) | `CreateTopping` (`product_service.go:452`) | `repo.CreateTopping` → sqlc `CreateTopping` (`products.sql:79`) | Del `toppings:list` + `products:list` |
| 4 | `PATCH /toppings/:id` | authMW + `AtLeast("manager")` | `productH.UpdateTopping` (`product_handler.go:298`) | `UpdateTopping` (`product_service.go:467`) | `GetToppingByID` + `UpdateTopping` (sqlc) **+ `UpdateToppingAvailability` (raw SQL, `product_repo.go:157`)** | Del `toppings:list` + `products:list` |
| 5 | `DELETE /toppings/:id` | authMW + `AtLeast("admin")` | `productH.DeleteTopping` (`product_handler.go:316`) | `DeleteTopping` (`product_service.go:486`) | `repo.SoftDeleteTopping` → sqlc `SoftDeleteTopping` (`products.sql:88`) | Del `toppings:list` + `products:list` |

Route registration: toppings group `be/cmd/server/main.go:200-212`; the page also borrows the
products group's manager-only `GET /products/all` at `main.go:173` (inside `prodR` at `:167`).
All under `/api/v1`.

---

## Auth Model on This Page

- **`GET /toppings` (1) is fully public** — registered on the bare `topR` group before any
  middleware (`main.go:201`). The same endpoint backs the customer-side topping reads; the admin
  page is just another caller. No token is needed to *read* the topping list.
- **`GET /products/all` (2) is manager+** (`main.go:171-173`) — the page uses it only to build the
  "Áp dụng cho sản phẩm" column (which products embed each topping). This is the **uncached**
  manager twin of the public `GET /products`; full trace lives in
  [admin_products_be.md](../admin_products/admin_products_be.md).
- **Writes split by role:** create + update are **manager+** (`main.go:203-206`); **delete is
  admin-only** (`main.go:208-211`). Same auth shape as categories and products.
- No guest-JWT path here — this is a back-office page behind the admin shell
  (`AuthGuard` + `RoleGuard minRole=MANAGER`, see [PAGES_INDEX.md](../../PAGES_INDEX.md) admin shell).

---

## Per-Endpoint Detail

### 1 · `GET /toppings`

- Service `ListToppings` (`product_service.go:432-445`): Redis `toppings:list` hit → unmarshal &
  return; miss → repo `ListToppings` → cache set. TTL is the shared `productCacheTTL = 5*time.Minute`
  (`product_service.go:21`).
- Query `ListToppings` (`products.sql:64-67`): `SELECT * FROM toppings WHERE deleted_at IS NULL
  ORDER BY name ASC` — **returns soft-deleted-excluded toppings regardless of `is_available`** (so
  the admin table shows "Hết" toppings too, unlike the customer-facing `ListToppingsAvailable`).
- Serialized inline in the handler (`product_handler.go:259-268`): `{id, name, price (via
  service.ParsePrice — DECIMAL→int64), is_available}`. Returned under `{"data": [...]}`.

### 2 · `GET /products/all`

- Service `ListAllProducts` (`product_service.go:194-209`): **no Redis** — calls `repo.ListProducts`
  (all products incl. unavailable), builds the category map, then resolves toppings **one query per
  product** via `GetToppingsByProductID` (N+1). Enriched by `enrichProduct` (`:627`).
- The page reads only `product.toppings[]` from each row to build the topping → product-names map
  (`toppings/page.tsx:31-41`). Heavier than the public `GET /products`, but managers want live
  (uncached) data. Full detail in [admin_products_be.md](../admin_products/admin_products_be.md).

### 3 · `POST /toppings`

- Handler binds `createToppingRequest{Name (required), Price (min=0, int64)}`
  (`product_handler.go:271-274`); bind failure → `400 INVALID_INPUT`.
- Service `CreateTopping` (`product_service.go:452-459`): mints a UUID, calls `repo.CreateTopping`
  (`name`, `formatPrice(price)`), then `invalidateToppingCaches`.
- Query `CreateTopping` (`products.sql:79-81`): `INSERT INTO toppings (id, name, price, is_available)
  VALUES (?, ?, ?, 1)` — **`is_available` is hardcoded `1`**. The FE create body sends only
  `{name, price}` (`admin.api.ts:59`), so a new topping is always available; the modal's status
  toggle only matters on edit.
- Response: `201` `{"data": {"id": "<uuid>"}}` (`product_handler.go:288`).

### 4 · `PATCH /toppings/:id`

- Handler binds `updateToppingRequest{Name (required), Price (min=0), IsAvailable *bool (optional)}`
  (`product_handler.go:291-313`).
- Service `UpdateTopping` (`product_service.go:467-484`): first `GetToppingByID` → `sql.ErrNoRows`
  maps to `ErrNotFound` (→ 404). Then `UpdateTopping` (name + price). **Only if `IsAvailable != nil`**
  does it call `UpdateToppingAvailability` — a separate write.
- ⚠️ `UpdateToppingAvailability` (`product_repo.go:156-159`) is **raw `ExecContext` SQL, not a sqlc
  query** (`UPDATE toppings SET is_available=?, updated_at=NOW() WHERE id=? AND deleted_at IS NULL`).
  It has no generated `db.*` wrapper. Works correctly; flagged as a layer-purity exception (see
  Flags). The FE edit body always sends `is_available` (`admin.api.ts:62`,
  `ToppingFormModal.tsx:47`), so this second write fires on every edit.
- Response: `200` `{"message": "Cập nhật topping thành công"}`.

### 5 · `DELETE /toppings/:id`

- Service `DeleteTopping` (`product_service.go:486-492`): calls `repo.SoftDeleteTopping`, then
  `invalidateToppingCaches`. **No "is in use" guard** — the topping is soft-deleted unconditionally
  regardless of how many products link it (see Flags 3).
- Query `SoftDeleteTopping` (`products.sql:88-91`): `UPDATE toppings SET deleted_at=NOW(),
  updated_at=NOW() WHERE id=? AND deleted_at IS NULL`. Soft delete only — the row stays, filtered
  out of all list reads by `deleted_at IS NULL`.
- Response: `204 No Content` (`product_handler.go:321`).

---

## Caching & Invalidation

- **Read cache:** only `GET /toppings` is cached (`toppings:list`, 5-min TTL). `GET /products/all`
  is **uncached** (manager wants live data).
- **Write invalidation:** all three writes call `invalidateToppingCaches`
  (`product_service.go:719-721`) → `rdb.Del(toppings:list, products:list)`. It deletes the topping
  list **and** the product list (products embed toppings in their JSON), but **not** any
  `product:<id>` detail key — see Flags 2 + the cross-page topping-cache asymmetry in
  [BE_DOC_TRACKER.md](../../BE_DOC_TRACKER.md#cross-page-concerns).
- Cache failures are non-fatal: `getCacheJSON`/`setCacheJSON` swallow Redis errors and fall through
  to MySQL (`product_service.go:727+`).

---

## Error Behaviour

- Bind failures (missing `name`, negative `price`) → `400 INVALID_INPUT` via `respondError`
  (`product_handler.go:280,301`; pattern → [../../../02_spec/ERROR_SPEC.md](../../../02_spec/ERROR_SPEC.md)).
- Service errors → `handleServiceError` mapping: `UpdateTopping` on a missing/deleted id →
  `ErrNotFound` → **404**. Create/Delete have no not-found pre-check.
- **409 on create** is what the FE expects for a duplicate name (`ToppingFormModal.tsx:56-57` →
  sets a field error "Tên topping đã tồn tại"), but **no uniqueness constraint or duplicate check
  exists** in `CreateTopping` or the `toppings` table (`migrations/002_products.sql:41-52` — no
  unique key on `name`). So the 409 branch is currently **unreachable** — duplicate names insert
  silently. FE-side dead branch, not a server bug (see Flags 4).
- FE delete failure → toast "Xóa topping thất bại" (`toppings/page.tsx:49`); save non-409 failure →
  toast "Có lỗi xảy ra" (`ToppingFormModal.tsx:59`).

---

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **`UpdateToppingAvailability` is raw SQL, not sqlc** | `product_repo.go:157` runs `ExecContext` directly instead of a generated query — the only topping write that bypasses sqlc. Correct, but inconsistent with the layer rule (handler→service→repo→sqlc). Same pattern as auth's `GetTableByQRToken`/register inserts. |
| 2 | **Topping write invalidation is asymmetric** | Writes Del `toppings:list` + `products:list` but **never** `product:<id>` (`product_service.go:719-721`). So the customer **product-detail** page (`/menu/product/:id`, only reader of `product:<id>`) serves a stale topping price/availability for up to 5 min after an edit here. Cross-page concern already logged for C4 — see [BE_DOC_TRACKER.md Cross-Page Concerns](../../BE_DOC_TRACKER.md#cross-page-concerns) + [admin_toppings_crosspage_dataflow.md](admin_toppings_crosspage_dataflow.md). |
| 3 | **`DELETE` has no "in use" guard** | `DeleteTopping` soft-deletes unconditionally (`product_service.go:486-492`); there is **no server-side rejection** of an in-use topping. The FE only shows a JS `confirm()` warning that N products will be unlinked (`toppings/page.tsx:52-58`) — it does not block. The `product_toppings` FK is `ON DELETE CASCADE` (`002_products.sql:60`) but the CASCADE never fires on a **soft** delete, so junction rows for the deleted topping remain in the DB — harmless because every read joins `WHERE t.deleted_at IS NULL`. (The page doc's "in-use toppings rejected server-side" line was **wrong** — corrected this run.) |
| 4 | **FE expects a 409 on duplicate name that the BE never sends** | `ToppingFormModal.tsx:56-57` maps a 409 to "Tên topping đã tồn tại", but `toppings.name` has no unique constraint and `CreateTopping` does no duplicate check (`002_products.sql:41-52`, `product_service.go:452`) — duplicate names insert as separate rows. Dead FE branch; low severity. |
| 5 | **`GET /products/all` is shared with `/admin/products` (A3)** | Both pages call the same uncached manager+ N+1 endpoint (`main.go:173`); a heavy product list is fetched here purely to render the "Áp dụng cho sản phẩm" chips. Owner of that endpoint's detail is [admin_products_be.md](../admin_products/admin_products_be.md). |
