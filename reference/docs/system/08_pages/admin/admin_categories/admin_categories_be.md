# Admin Categories — Backend View (`/admin/categories`)

> **TL;DR:** ✅ implemented · the BE twin of [admin_categories.md](admin_categories.md). Category CRUD —
> **4 endpoints, 1 read + 3 writes.** The read (`GET /categories`) is **public** and Redis-cached
> (`categories:list`, 5 min) — the *same* shared catalog endpoint the customer `/menu` and `/pos`
> `CategoryTabs` consume. Writes split auth: **POST/PATCH = manager+, DELETE = admin-only**. Every
> write calls `invalidateProductCaches(ctx,"")` → Dels `products:list` + `categories:list`. No
> realtime. **Code bugs:** 1 → [CATEGORIES_BUGS.md](CATEGORIES_BUGS.md) (manager sees the 🗑 button
> but DELETE is admin-only → silent 403).
>
> **Sources traced (branch `experience_claude.md_system_1`):**
> `be/cmd/server/main.go:184-197` (routes) ·
> `be/internal/handler/product_handler.go:166-248` ·
> `be/internal/service/product_service.go:341-427,709-743` ·
> `be/internal/repository/product_repo.go:107-142` ·
> `be/internal/db/products.sql.go:23-36,306-310,623-632,678-692` ·
> `be/internal/handler/respond.go` · `be/internal/service/errors.go:28,37-38` ·
> FE: `fe/src/app/(dashboard)/admin/categories/page.tsx` ·
> `fe/src/features/admin/admin.api.ts:5-17` · `fe/src/types/product.ts:1-5`.
>
> Object model home: categories are a leaf catalog object — fields live in
> [../../02_spec/DB_SCHEMA.md](../../02_spec/DB_SCHEMA.md) (`categories` table). This doc does not
> restate them (Rule #9).

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|----------|------|---------|---------|--------------|-------------|
| 1 | `GET /categories` | **public** | `ListCategories` `product_handler.go:169` | `ListCategories` `product_service.go:344` | `ListCategories` → sqlc `ListCategories` `products.sql.go:306` | **read+write** `categories:list` 5 min |
| 2 | `POST /categories` | authMW + `AtLeast("manager")` | `CreateCategory` `product_handler.go:199` | `CreateCategory` `product_service.go:365` | `GetCategoryByName` (raw SQL `product_repo.go:119`) + `CreateCategory` → sqlc `products.sql.go:23` | **invalidate** `products:list`+`categories:list` |
| 3 | `PATCH /categories/:id` | authMW + `AtLeast("manager")` | `UpdateCategory` `product_handler.go:224` | `UpdateCategory` `product_service.go:387` | `GetCategoryByID` + `GetCategoryByName` + `UpdateCategory` → sqlc `products.sql.go:678` | **invalidate** `products:list`+`categories:list` |
| 4 | `DELETE /categories/:id` | authMW + `AtLeast("admin")` | `DeleteCategory` `product_handler.go:242` | `DeleteCategory` `product_service.go:408` | `GetCategoryByID` + `CountProductsByCategory` (raw SQL `product_repo.go:128`) + `SoftDeleteCategory` → sqlc `products.sql.go:623` | **invalidate** `products:list`+`categories:list` |

Route registration: `be/cmd/server/main.go:184-197` — `catR := v1.Group("/categories")`; `GET` is
registered on the bare group (no middleware), `POST`/`PATCH` on a sub-group with
`authMW, middleware.AtLeast("manager")`, `DELETE` on a sub-group with
`authMW, middleware.AtLeast("admin")`.

FE call sites: `fe/src/features/admin/admin.api.ts` — `listCategories` (`GET /categories`,
`:7-8`), `createCategory` (`POST /categories`, `:10-11`), `updateCategory` (`PATCH /categories/:id`,
`:13-14`), `deleteCategory` (`DELETE /categories/:id`, `:16-17`). All wired through TanStack Query
in `admin/categories/page.tsx` (query key `['admin','categories']`).

---

## Auth Model on This Page

- **`GET /categories` is public** — no `authMW`, no role gate (`main.go:186`). It is the *same*
  endpoint the customer menu and POS `CategoryTabs` hit; the admin page just re-keys its TanStack
  query as `['admin','categories']`. So categories created/edited here are visible to anyone on the
  next cache fill (see [Caching](#caching--invalidation) + the cross-page doc).
- **POST / PATCH = manager or above** (`AtLeast("manager")`, `main.go:188-191`). The staff JWT's
  `role` claim must be `manager` or `admin`.
- **DELETE = admin only** (`AtLeast("admin")`, `main.go:194-196`). A **manager cannot delete a
  category** — the request 403s. The admin shell guard is `minRole=MANAGER`
  ([PAGES_INDEX shell note](../PAGES_INDEX.md)), so a manager *reaches* this page and *sees* the 🗑
  button, but the call fails → **[CATEGORIES_BUGS.md](CATEGORIES_BUGS.md) Bug 1**.
- No guest-JWT / `created_by` semantics here — categories are not owned, there is no audit column
  written by these endpoints.

---

## Per-Endpoint Detail

### 1 · GET /categories

- **Handler** `product_handler.go:169-190`: calls `svc.ListCategories`, then serialises each row to
  `gin.H{id, name, description, sort_order, is_active}` and returns `{"data": [...]}` (200).
  The `description` `sql.NullString` is flattened to `""` when NULL (`:177-180`).
- **Service** `product_service.go:344-357`: **cache-aside** — `getCacheJSON("categories:list")`;
  on hit, unmarshal and return; on miss, `repo.ListCategories` then `setCacheJSON` (5 min TTL,
  `productCacheTTL` `:21`).
- **Repo/SQL** `ListCategories` `products.sql.go:306-310`:
  `WHERE is_active = 1 AND deleted_at IS NULL ORDER BY sort_order ASC, name ASC`. So soft-deleted
  and `is_active=0` rows never appear. (No endpoint toggles `is_active` — it is effectively always
  `1`; see Flag 4.)
- **FE consumption:** the page reads only `id`, `name`, `sort_order` (`Category` type
  `types/product.ts:1-5`); `description` + `is_active` in the response are **unused** (Flag 1). The
  page re-sorts client-side by `sort_order` anyway (`page.tsx:119`).

### 2 · POST /categories

- **Handler** `product_handler.go:199-215`: binds `{name(required), description, sort_order}`
  (`createCategoryRequest` `:192-196`); bind failure → `400 INVALID_INPUT`. On success →
  `201 {"data":{"id": <uuid>}}`.
- **Service** `product_service.go:365-379`: duplicate-name guard via `GetCategoryByName` — if a
  non-deleted category with that name exists → `ErrCategoryNameConflict` (409 `DUPLICATE_NAME`).
  Mints a UUID (`newUUID()`), maps empty `description` → NULL, inserts, then
  `invalidateProductCaches(ctx,"")`.
- **Repo/SQL** `CreateCategory` `products.sql.go:23-26`:
  `INSERT INTO categories (id,name,description,sort_order,is_active) VALUES (?,?,?,?,1)` —
  **`is_active` hard-coded to 1**; `GetCategoryByName` is **raw SQL** (`product_repo.go:119-126`),
  not sqlc.
- **FE:** sends only `{name, sort_order}` (`schema` `page.tsx:11-14`, `admin.api.ts:10`) — never
  `description`, so created categories always have NULL description.

### 3 · PATCH /categories/:id

- **Handler** `product_handler.go:224-239`: binds `updateCategoryRequest{name(required),
  description, sort_order}` (`:217-221`); bind failure → `400 INVALID_INPUT`. Success →
  `200 {"message":"Cập nhật danh mục thành công"}`. ⚠️ The handler doc-comment says
  *"handles PUT /categories/:id"* (`:223`) but the registered route is **PATCH** (`main.go:191`) —
  stale comment, not a behaviour bug (Flag 5).
- **Service** `product_service.go:387-406`: `GetCategoryByID` first → `sql.ErrNoRows` mapped to
  `ErrNotFound` (404 `NOT_FOUND`); then `GetCategoryByName` excluding self
  (`existing.ID != id`) → `ErrCategoryNameConflict` (409). Then `repo.UpdateCategory`,
  then invalidate.
- **Repo/SQL** `UpdateCategory` `products.sql.go:678-682`:
  `UPDATE categories SET name=?, description=?, sort_order=?, updated_at=NOW() WHERE id=? AND
  deleted_at IS NULL` — a **full replace of all three columns** (no partial/`COALESCE`). Because the
  FE never sends `description`, every edit re-writes `description` to NULL (Flag 3) — harmless today
  since no surface renders it.

### 4 · DELETE /categories/:id

- **Handler** `product_handler.go:242-248`: calls `svc.DeleteCategory`; success →
  **`204 No Content`** (empty body, `c.Status(http.StatusNoContent)` `:247`).
- **Service** `product_service.go:408-427`: `GetCategoryByID` → `ErrNotFound` if gone; then
  `CountProductsByCategory(id)` — if `> 0` → `ErrCategoryHasProducts`
  (**409 `CATEGORY_HAS_PRODUCTS`**, message *"Không thể xóa — danh mục đang có sản phẩm."*); else
  `SoftDeleteCategory`, then invalidate.
- **Repo/SQL:** `CountProductsByCategory` is **raw SQL** (`product_repo.go:128-134`):
  `SELECT COUNT(*) FROM products WHERE category_id = ? AND deleted_at IS NULL` — only **products**
  block deletion; **combos** referencing the category (`combos.category_id`) are *not* counted, so a
  category used only by combos can still be soft-deleted (Flag 6). `SoftDeleteCategory`
  `products.sql.go:623-626`: `UPDATE … SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL`.
- **Auth:** admin-only — see [Bug 1](CATEGORIES_BUGS.md).

---

## Caching & Invalidation

- **Read cache:** `categories:list` — String(JSON), TTL 5 min (`productCacheTTL`,
  `product_service.go:21,355`). Cache-aside in `ListCategories`. Owned/documented in
  [../../03_be/REDIS_CACHE.md](../../03_be/REDIS_CACHE.md).
- **Invalidation:** all three writes call `invalidateProductCaches(ctx,"")`
  (`product_service.go:709-717`) which `Del`s **`products:list` + `categories:list`** (with `id=""`
  it does **not** touch any `product:<id>` key). So a category write also clears the **products**
  list cache — correct, because products embed their `category_name` (`enrichProduct`
  `product_service.go:637`). Cache-invalidation failures are logged (`slog.Warn`) and swallowed —
  the write still succeeds.
- **Cross-page reach:** the invalidated `categories:list` is the key read by the customer `/menu`
  and `/pos` `CategoryTabs` and the `/admin/products` form modal — a category change here reshapes
  those pages on their next fetch (no realtime push). See
  [admin_categories_crosspage_dataflow.md](admin_categories_crosspage_dataflow.md).

---

## Error Behaviour

| Trigger | Service error | HTTP / code | FE handling |
|---|---|---|---|
| Bind fails (missing `name`) | — (handler) | `400 INVALID_INPUT` | save mutation `onError` → catch-all `toast.error('Có lỗi xảy ra')` (`page.tsx:57`); RHF Zod `name.min(1)` blocks empty name before submit |
| Duplicate name (create/update) | `ErrCategoryNameConflict` | `409 DUPLICATE_NAME` | `onError` status===409 → `setError('name', 'Tên danh mục đã tồn tại.')` inline (`page.tsx:55-56`) |
| Update/delete missing id | `ErrNotFound` | `404 NOT_FOUND` | save: catch-all toast; delete: catch-all `'Không thể xóa danh mục'` |
| Delete a category with products | `ErrCategoryHasProducts` | `409 CATEGORY_HAS_PRODUCTS` | delete `onError` status===409 → `toast.error('Không thể xóa — danh mục đang có sản phẩm.')` (`page.tsx:71-72`) |
| **Manager deletes (no admin role)** | — (middleware) | **`403`** | delete `onError` falls to catch-all `'Không thể xóa danh mục'` — **mislabelled** ([Bug 1](CATEGORIES_BUGS.md)) |
| Untyped/DB error | wrapped `fmt.Errorf` | `500 COMMON_002` | catch-all toast |

Error contract + `respondError`/`handleServiceError` mapping:
[../../02_spec/ERROR_SPEC.md](../../02_spec/ERROR_SPEC.md) · `be/internal/handler/respond.go`.

---

## Flags

| # | Flag | Evidence | Severity |
|---|------|----------|----------|
| 1 | **`description` + `is_active` returned by `GET` but unused FE-side.** Handler serialises 5 fields (`product_handler.go:181-187`); FE `Category` type has only `{id,name,sort_order}` (`types/product.ts:1-5`) — the two extra fields are dead on this page. | handler vs FE type | cosmetic |
| 2 | **`GET /categories` is public** — same shared catalog endpoint as customer `/menu` + `/pos`; admin page just re-keys the query. A category change here is publicly visible after cache refill. | `main.go:186` | by-design |
| 3 | **PATCH is a full replace; FE never sends `description`** → every edit re-writes `description` to NULL. Harmless today (no surface renders category description). | `products.sql.go:678-682` vs `page.tsx:11-14` | low |
| 4 | **`is_active` is write-once `1` / dead.** Insert hard-codes `1` (`products.sql.go:25`); no endpoint toggles it; `ListCategories` filters `is_active=1`. Only `deleted_at` (soft-delete) hides a category. | `products.sql.go:25,308` | low |
| 5 | **Handler doc-comment says "PUT"** for the update endpoint, but the route is **PATCH** (`main.go:191`) — stale comment, behaviour correct. | `product_handler.go:223` | cosmetic |
| 6 | **Delete guard counts products only, not combos.** `CountProductsByCategory` checks `products.category_id`; a category referenced solely by `combos.category_id` can still be soft-deleted (combo keeps a dangling `category_id`). | `product_repo.go:128-134` | low |
| 7 | **Manager sees 🗑 but DELETE is admin-only → silent 403.** → **code bug**, see [CATEGORIES_BUGS.md](CATEGORIES_BUGS.md) Bug 1. Same class as A12 Training Bug 2. | `main.go:194-196` vs `page.tsx:131-136` | 🟠 |

> Code bugs found this run are documented in **[CATEGORIES_BUGS.md](CATEGORIES_BUGS.md)** (these are
> app-code disagreements a doc edit cannot fix). Doc drift fixed this run is in the
> [LOGIC Decision Log](../../07_business_logic/LOGIC_INDEX.md).
