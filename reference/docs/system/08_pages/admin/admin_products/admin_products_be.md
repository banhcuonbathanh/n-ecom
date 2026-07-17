# Admin Products — `/admin/products` · Backend View

> **TL;DR:** every BE endpoint the admin Products page calls, traced handler → service →
> repository → SQL, with auth, caching and error behaviour. Traced from source on branch
> `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/product_handler.go` ·
> `be/internal/service/product_service.go` · `be/internal/repository/product_repo.go` ·
> `be/internal/db/products.sql.go` · `be/internal/handler/staff_handler.go` ·
> `be/internal/handler/file_handler.go`.
>
> FE view + zones → [admin_products.md](admin_products.md) ·
> Product object shape → [../../../02_spec/object/OBJECT_MODELS.md](../../../02_spec/object/OBJECT_MODELS.md) ·
> **Code bugs this trace found → [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md)** (3 bugs — availability toggle is a no-op).

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `GET /products/all` | authMW + manager+ | `productH.ListAllProducts` | `ListAllProducts` | `ListProducts` (all rows, incl. unavailable) | **none — uncached** |
| 2 | `GET /categories` | **public** | `productH.ListCategories` | `ListCategories` | `ListCategories` (active only) | `categories:list` |
| 3 | `GET /toppings` | **public** | `productH.ListToppings` | `ListToppings` | `ListToppings` (all non-deleted) | `toppings:list` |
| 4 | `POST /products` | authMW + manager+ | `productH.CreateProduct` | `CreateProduct` | `CreateProduct` + `AttachToppingToProduct` | invalidates `products:list`+`categories:list`+`product:<id>` |
| 5 | `PATCH /products/:id` | authMW + manager+ | `productH.UpdateProduct` | `UpdateProduct` | `GetProductByID` + `UpdateProduct` (+ topping replace) | same invalidation |
| 6 | `PATCH /products/:id/availability` | authMW + manager+ | `productH.UpdateProduct` ⚠️ **same handler** | `UpdateProduct` | `UpdateProduct` — **`is_available` never touched** | same invalidation |
| 7 | `DELETE /products/:id` | authMW + **admin+** | `productH.DeleteProduct` | `DeleteProduct` | `SoftDeleteProduct` | same invalidation |
| 8 | `POST /files/upload` | authMW + cashier+ | `fileH.Upload` | — (handler → repo directly) | `CreateFileAttachment` (`is_orphan=1`) | none |
| 9 | `POST /categories` *(seed only)* | authMW + manager+ | `productH.CreateCategory` | `CreateCategory` | `CreateCategory` | invalidates `products:list`+`categories:list` |
| 10 | `POST /toppings` *(seed only)* | authMW + manager+ | `productH.CreateTopping` | `CreateTopping` | `CreateTopping` | invalidates `toppings:list`+`products:list` |
| 11 | `POST /staff` *(seed only)* | authMW + manager+ | `staffH.CreateStaff` | `CreateStaff` | raw `INSERT INTO staff` | none |

Route registration: `be/cmd/server/main.go:167-181` (products group + manager/admin sub-groups),
`:185-196` (categories), `:200-211` (toppings), `:280-290` (staff), `:326-328` (files). All under
`/api/v1`. Endpoints 9–11 fire **only** from the `🌱 Dữ liệu mẫu` seed button
([page.tsx:56-113](../../../../../fe/src/app/(dashboard)/admin/products/page.tsx#L56-L113)) —
not part of normal CRUD.

## Auth Model on This Page

The whole `/admin/*` shell is gated FE-side by `AuthGuard + RoleGuard minRole=MANAGER`
([PAGES_INDEX.md](../../PAGES_INDEX.md) admin shell). BE-side the gates per route are:

- **Reads split:** `GET /products/all` is **manager+** (`main.go:172-173`), but the two catalog
  GETs the form modal uses — `GET /categories` (`main.go:186`) and `GET /toppings`
  (`main.go:201`) — are **fully public** (no `authMW`). A logged-in manager always satisfies
  both; the public GETs are shared with the customer menu.
- **Writes are manager+** (create/update/availability) via `mgr.Use(authMW, AtLeast("manager"))`
  (`main.go:172`), **except DELETE which is admin-only** (`adm.Use(authMW, AtLeast("admin"))`,
  `main.go:180-181`). A manager can create/edit but **cannot delete** a product.
- **Image upload is cashier+** (`main.go:327`) — a lower bar than the page itself; fine, since
  only managers reach the page.
- `created_by` / staff identity is read from the JWT inside `fileH.Upload` (`uploaded_by`,
  `file_handler.go:81`) and `staffH.CreateStaff` (caller role for hierarchy check,
  `staff_handler.go:92`); product writes do not stamp an author.

## Per-Endpoint Detail

### 1 · `GET /products/all`

- Handler `ListAllProducts` (`product_handler.go:57-69`): no params/body; serializes each row with
  `productJSON` (`product_handler.go:443-460`) → `{id, name, price, description, image_path,
  is_available, sort_order, category_id, category_name, toppings[]}`.
- Service `ListAllProducts` (`product_service.go:194-209`): **uncached** — goes straight to repo,
  unlike the public `ListProducts` (`:166`) which reads `products:list`. Builds a category map via
  `buildCategoryMap` (`:198`, `:697-707`) and resolves toppings **per product** with
  `GetToppingsByProductID` in a loop (`:205`) — an N+1 query, topping-fetch errors silently
  discarded. So the admin table always pays a full DB read on a 30 s `staleTime`
  ([page.tsx:25](../../../../../fe/src/app/(dashboard)/admin/products/page.tsx#L25)).
- Repo `ListProducts` → `products.sql.go:432` — `WHERE deleted_at IS NULL ORDER BY sort_order,
  name` (no `is_available` filter, so unavailable rows show).

### 2 · `GET /categories` (form dropdown)

- Service `ListCategories` (`product_service.go:344-357`): Redis `categories:list` hit → return;
  miss → repo `ListCategories` → cache set (TTL 5 min).
- Repo SQL (`products.sql.go:306`): `WHERE is_active = 1 AND deleted_at IS NULL` — active only.
- Serialized inline (`product_handler.go:169-190`): `{id, name, description, sort_order,
  is_active}`. (FE `Category` type only reads `id, name, sort_order`.)

### 3 · `GET /toppings` (form checkboxes)

- Service `ListToppings` (`product_service.go:432-445`): Redis `toppings:list` hit → return; miss →
  repo `ListToppings` (`products.sql.go:549` — **all** non-deleted, NOT `is_available`-filtered) →
  cache set.
- Inline serializer (`product_handler.go:253-269`): `{id, name, price, is_available}`; price parsed
  from DB decimal string via `ParsePrice` (`:264`).

### 4 · `POST /products`

- Handler `CreateProduct` (`product_handler.go:94-121`) binds `createProductRequest` (`:82-91`):
  `name` (required), `price` (required, min 0), `category_id` (required), `description`,
  `image_path`, `topping_ids[]`, `is_available *bool`, `sort_order`. Returns `201 {data:{id}}`.
- Service `CreateProduct` (`product_service.go:249-278`): new UUID, insert, then attach each
  `topping_id` via `AttachToppingToProduct` (`INSERT IGNORE`, `products.sql.go:14`), then
  `invalidateProductCaches`.
- ⚠️ **`is_available` is silently dropped** — the sqlc `CreateProduct` INSERT hardcodes
  `is_available = 1` (`products.sql.go:82-83`) and `CreateProductParams` has no such field. The
  handler computes `in.IsAvailable` (`:108-113`) but the service never forwards it. Harmless on
  this page (FE `CreateProductInput` never sends it) but a latent bug → [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #2.

### 5 · `PATCH /products/:id`

- Handler `UpdateProduct` (`product_handler.go:134-155`) binds `updateProductRequest` (`:123-131`):
  `name`/`price`/`category_id` **required**, `topping_ids *[]string` (nil = don't change). Returns
  `200 {message}`.
- Service `UpdateProduct` (`product_service.go:292-330`): GET guard first (`ErrNotFound`→404 if
  missing), `UpdateProduct` SQL sets category/name/description/price/image_path/sort_order
  (`products.sql.go:723-726` — **not** `is_available`); if `topping_ids != nil`,
  `ClearProductToppings` then re-attach. Then `invalidateProductCaches`.

### 6 · `PATCH /products/:id/availability` — ⚠️ BROKEN (no-op)

- Route `main.go:176` points at the **same `productH.UpdateProduct` handler** as `PATCH /:id`.
- FE `toggleAvailability` ([admin.api.ts:51-52](../../../../../fe/src/features/admin/admin.api.ts#L51-L52))
  PATCHes with body `{ is_available }` only — but `updateProductRequest` requires `name`, `price`,
  `category_id` (`product_handler.go:124-126`), so `ShouldBindJSON` fails → **400 INVALID_INPUT**.
  Even if it bound, `UpdateProductInput` has no `is_available` field and the SQL never updates the
  column. Clicking the availability badge therefore always errors → FE toast "Không thể cập nhật
  trạng thái" ([page.tsx:48](../../../../../fe/src/app/(dashboard)/admin/products/page.tsx#L48)).
- A purpose-built sqlc query `ToggleProductAvailability` (`products.sql.go:667-676`) and repo
  wrapper (`product_repo.go:82-84`) **exist but are wired to nothing** in the service layer
  (verified: no service call site). This is the intended fix target. Full detail →
  [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #1. API_SPEC line 47 documents the **intended** contract
  (`is_available` → `message`), which the code does not honor.

### 7 · `DELETE /products/:id` (admin only)

- Handler `DeleteProduct` (`product_handler.go:158-164`): `204 No Content`.
- Service `DeleteProduct` (`product_service.go:333-339`): calls `SoftDeleteProduct`
  (`products.sql.go:651` — `UPDATE … SET deleted_at = NOW()`) then invalidates caches. **No
  pre-flight guard** — no check for the product being on an active order.
- ⚠️ FE catches `409` with a specific toast "Sản phẩm đang có đơn hàng đang xử lý, không thể xoá"
  ([page.tsx:36-37](../../../../../fe/src/app/(dashboard)/admin/products/page.tsx#L36-L37)), but no
  BE path emits that 409 — the branch is dead and the soft-delete always succeeds →
  [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #3.

### 8 · `POST /files/upload` (image upload)

- Handler `fileH.Upload` (`file_handler.go:38-98`) — **no service layer**, calls the file repo
  directly. Wraps body in `MaxBytesReader` (`maxFileSize = 10<<20` = 10 MB, `:19`), reads
  multipart field `file`, rejects `>10 MB` with `422 FILE_TOO_LARGE` (`:48-51`), sniffs
  content-type from first 512 bytes and allows only `image/jpeg`/`png`/`webp` (`:21-25`), else
  `422 UNSUPPORTED_FILE_TYPE`.
- `object_path = "uploads/<uuid><ext>"` (`:64-66`). Saved to local disk under env
  `STORAGE_BASE_PATH` via `SaveUploadedFile` (`:68-79`); **if the env is unset the bytes are
  silently discarded** and only the DB row is written. Inserts `CreateFileAttachment` with
  `is_orphan = 1` (`files.sql.go:13`, `uploaded_by` = caller JWT). Returns `201 {data:{id,
  object_path}}` — the modal then sends `object_path` as `image_path` on create/update
  ([ProductFormModal.tsx:89-104](../../../../../fe/src/app/(dashboard)/admin/products/_components/ProductFormModal.tsx#L89-L104)).

### 9–11 · Seed-only writes (`POST /categories` · `POST /toppings` · `POST /staff`)

Fire only from the `🌱 Dữ liệu mẫu` button ([page.tsx:56-113](../../../../../fe/src/app/(dashboard)/admin/products/page.tsx#L56-L113)),
all via `Promise.allSettled` so partial failure is tolerated.

- `CreateCategory` (`product_service.go:365-379`): name-conflict guard → `ErrCategoryNameConflict`
  (409); insert (`is_active=1`); `invalidateProductCaches(ctx,"")` Dels `products:list`+`categories:list`.
- `CreateTopping` (`product_service.go:452-458`): insert (`is_available=1`); `invalidateToppingCaches`
  Dels `toppings:list`+`products:list`.
- `CreateStaff` (`staff_service.go:103-146`): role-validity + hierarchy check (caller level must
  exceed target), username-conflict guard, **bcrypt hash cost 12** (`bcrypt.go:21`), raw
  `INSERT INTO staff` (`staff_repo.go:160-169`), returns the created row (no password hash) via
  `toStaffJSON`. No Redis touch.

## Caching & Invalidation

- Shared TTL `productCacheTTL = 5 * time.Minute` (`product_service.go:21`).
- Keys: `products:list` · `categories:list` · `toppings:list` · `product:<id>`. The admin table's
  `GET /products/all` is **not** one of these — it is always a live DB read (uncached by design,
  so a manager sees writes immediately rather than within the 5-min window).
- `invalidateProductCaches` (`product_service.go:709-717`) Dels `products:list`+`categories:list`
  (+`product:<id>` when an id is passed) — fired by every product **and** category write.
  `invalidateToppingCaches` (`:719-721`) Dels `toppings:list`+`products:list` (products embed
  toppings). So a product edit on this page refreshes the **customer** menu caches, not the admin
  table (which is already uncached). Matches [../../../03_be/REDIS_CACHE.md](../../../03_be/REDIS_CACHE.md) lines 37-44.
- FE then `invalidateQueries(['admin','products'])` after each write
  ([page.tsx:31,47](../../../../../fe/src/app/(dashboard)/admin/products/page.tsx#L31); the seed
  invalidates the whole `['admin']` family, [page.tsx:106](../../../../../fe/src/app/(dashboard)/admin/products/page.tsx#L106)).
- Redis failures are non-fatal: `getCacheJSON`/`setCacheJSON` swallow errors and fall through to MySQL.

## Error Behaviour

- Bind failures → `400 INVALID_INPUT` via `respondError` (`product_handler.go:97,137`).
- Service errors → `handleServiceError` (`handler/respond.go:24-36`) unpacks `*service.AppError`
  (`ErrNotFound`→404, `ErrCategoryNameConflict`→409); untyped → 500 `COMMON_002`.
- FE-visible: create/update 409 → inline "Tên sản phẩm đã tồn tại" on the name field
  ([ProductFormModal.tsx:116-117](../../../../../fe/src/app/(dashboard)/admin/products/_components/ProductFormModal.tsx#L116-L117));
  delete 409 → a toast that **never actually fires** (no BE 409, see Flag 3); availability PATCH →
  always 400 → "Không thể cập nhật trạng thái" (Flag 1); image upload failure → "Không thể tải ảnh
  lên".

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | 🔴 **Availability toggle is a no-op** | `PATCH /products/:id/availability` reuses `UpdateProduct`, which (a) requires `name`/`price`/`category_id` so the FE's `{is_available}`-only body 400s, and (b) never writes `is_available` even if bound. The dedicated `ToggleProductAvailability` query exists but is unwired. Code bug (BE) → [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #1. |
| 2 | 🟡 **`POST /products` drops `is_available`** | Handler accepts `is_available *bool` but the sqlc INSERT hardcodes `is_available=1` (`products.sql.go:82-83`); the field never reaches SQL. A product can't be created hidden. Latent — FE never sends it → [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #2. |
| 3 | 🟠 **DELETE has no active-order guard** | FE handles a `409` "đang có đơn hàng" but `DeleteProduct` soft-deletes unconditionally — no such 409 is ever emitted. Dead FE branch + a product on a live order can vanish from the menu mid-service (historical orders are safe — items snapshot name/price) → [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #3. |
| 4 | ⚠️ **Admin table is uncached + N+1 toppings** | `GET /products/all` skips the `products:list` cache and resolves toppings one query per product. Correct (managers want fresh data) but heavier than the public `GET /products`. |
| 5 | ⚠️ **Form GETs are public** | `GET /categories` and `GET /toppings` carry no `authMW` — same shared public catalog endpoints the customer menu uses. |
| 6 | ⚠️ **Image bytes dropped if `STORAGE_BASE_PATH` unset** | `fileH.Upload` writes the DB row regardless but only persists the file to disk when the env is set — otherwise `image_path` points at a file that does not exist. |
