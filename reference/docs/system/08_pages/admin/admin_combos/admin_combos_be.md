# Admin Combos — Backend View — `/admin/combos`

> **TL;DR:** ✅ implemented · Combo CRUD for managers. The page calls **5 endpoints** (2 reads /
> 3 writes): `GET /combos` (public, cached) + `GET /products/all` (manager+, uncached) to build the
> table and the product-name map, then `POST /combos` (manager+), `PATCH /combos/:id` (manager+),
> `DELETE /combos/:id` (admin) for create / edit / delete. All combo writes invalidate the single
> shared `combos:list` cache key that the **customer `/menu` (C1)** also reads.
>
> **Sources traced (branch `experience_claude.md_system_1`):**
> `be/cmd/server/main.go:166-227` (routes) · `be/internal/handler/product_handler.go:56-62,326-439`
> (handlers) · `be/internal/service/product_service.go:21-27,193-209,497-625,663-695,709-740`
> (service + cache) · `be/query/products.sql:25-28,107-147` (SQL) · `be/internal/handler/respond.go`
> (error mapping) · `be/internal/service/errors.go:28` (`ErrNotFound`).
>
> FE sibling: [admin_combos.md](admin_combos.md) · object model:
> [../../02_spec/object/OBJECT_MODELS.md](../../02_spec/object/OBJECT_MODELS.md) · code bugs:
> [COMBOS_BUGS.md](COMBOS_BUGS.md).

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|----------|------|---------|---------|--------------|-------------|
| 1 | `GET /combos` | **public** | `ListCombos` `product_handler.go:327` | `ListCombos` `product_service.go:497` | `ListCombosAvailable` `products.sql:112` + `GetComboItems` `products.sql:122` (per combo) | **read+write** `combos:list` 5 min |
| 2 | `GET /products/all` | authMW + `AtLeast("manager")` | `ListAllProducts` `product_handler.go:57` | `ListAllProducts` `product_service.go:194` | `ListProducts` `products.sql:25` + `GetToppingsByProductID` (N+1) | **none** (uncached) |
| 3 | `POST /combos` | authMW + `AtLeast("manager")` | `CreateCombo` `product_handler.go:374` | `CreateCombo` `product_service.go:534` | `CreateCombo` + N×`CreateComboItem` `products.sql:128,142` | **Del** `combos:list` |
| 4 | `PATCH /combos/:id` | authMW + `AtLeast("manager")` | `UpdateCombo` `product_handler.go:409` | `UpdateCombo` `product_service.go:588` | `GetComboByID` + `UpdateCombo` + `DeleteComboItemsByComboID` + N×`CreateComboItem` `products.sql:117,132,146,142` | **Del** `combos:list` |
| 5 | `DELETE /combos/:id` | authMW + `AtLeast("admin")` | `DeleteCombo` `product_handler.go:433` | `DeleteCombo` `product_service.go:571` | `SoftDeleteCombo` `products.sql:137` | **Del** `combos:list` |

Route registration: combos group `main.go:215-227` (public GET, manager+ POST/PATCH sub-group
`:218-222`, admin DELETE sub-group `:223-227`); products group `main.go:167-182` (`/products/all`
under the manager+ sub-group `:171-173`).

---

## Auth Model on This Page

- **`GET /combos` is public** — no `authMW`, same endpoint the customer menu (C1) and combo-detail
  (C5) call. The admin page reuses it for the management table; there is **no manager-only
  "all combos" variant** (`main.go:216`).
- **`GET /products/all` is manager+** (`main.go:171-173`) — the admin-only "includes unavailable"
  product list; this is why the page imports `listProducts` → `/products/all` (`admin.api.ts:39-40`)
  rather than the public `GET /products`.
- **Writes are role-split:** `POST` / `PATCH` require `AtLeast("manager")`; **`DELETE` requires
  `AtLeast("admin")`** (`main.go:218-227`). The FE mirrors this — the 🗑 delete button only renders
  when `user.role === 'admin'` (`combos/page.tsx:46,326`).
- No guest-JWT / `created_by` semantics here (catalog management, not order creation).
- The whole `/admin/*` shell is additionally wrapped by `AuthGuard` + `RoleGuard minRole=MANAGER`
  client-side (PAGES_INDEX admin shell), so a cashier never reaches this page even though `DELETE`
  is the only server-gated-above-manager call.

---

## Per-Endpoint Detail

### 1 · GET /combos (read — list)

- Handler `product_handler.go:327-356`: calls `svc.ListCombos`, then serialises each combo to a
  `gin.H` with `id, name, description, price, image_path, is_available, sort_order, category_id,
  combo_items[]`; each item is `{id, product_id, quantity}` — **no `unit_price`, no toppings**.
  Wrapped as `{"data":[...]}`.
- Service `product_service.go:497-517`: cache-aside — reads `combos:list` JSON; on miss runs
  **`ListCombosAvailable`** (`products.sql:112-115`, `WHERE is_available=1 AND deleted_at IS NULL`)
  then `GetComboItems` per combo (`products.sql:122-126`), enriches via `enrichCombo`
  (`:663-695`), and `setCacheJSON("combos:list", …)` (5 min TTL).
- **⚠️ The unfiltered `ListCombos` query exists (`products.sql:107-110`) but is unwired** — the
  service method named `ListCombos` calls the *Available* variant, so this management table can
  only ever show `is_available=1` combos (see Flag 1 / [COMBOS_BUGS.md](COMBOS_BUGS.md) Bug 1).
- FE: `listCombos` (`admin.api.ts:128-146`) maps `combo_items → items[{product_id, product_name:'',
  quantity}]`; the page resolves `product_name` client-side from the `/products/all` map
  (`combos/page.tsx:63,291-294`).

### 2 · GET /products/all (read — product map)

- Handler `product_handler.go:57-62`: `svc.ListAllProducts`, serialised via `productJSON`.
- Service `product_service.go:194-209`: `ListProducts` (all non-deleted, **available + unavailable**)
  + `buildCategoryMap` + **N+1 `GetToppingsByProductID` per product**. **No Redis** — always hits
  MySQL (managers want live data).
- On this page the product list is used only for the name/price map (`productMap`,
  `combos/page.tsx:63`) and the modal's product picker; toppings are fetched but unused here.

### 3 · POST /combos (write — create)

- Handler `product_handler.go:358-398`: binds `createComboRequest` — `name` required, `price`
  `required,min=0`, plus `category_id, description, image_path, sort_order, items[]`; each item
  `product_id` required + `quantity required,min=1`. Bind failure → `400 INVALID_INPUT`. Returns
  `201` `{"data":{"id":…}}`.
- Service `product_service.go:534-569`: mints a UUID, `CreateCombo` insert (`products.sql:128-130`
  — **`is_available` hardcoded to `1`**, `image_path`/`category_id`/`description` as nullable), then
  loops `CreateComboItem` per item. **Item-insert failures are logged (`slog.Warn`) and swallowed,
  not returned** (`:562-564`) — non-transactional. Invalidates `combos:list` (`:567`).
- FE: built in `createMut` (`combos/page.tsx:131-145`), and also fired 3× in parallel by the
  **"🎲 Random combo"** button (`:194-229`) via `Promise.allSettled`. Client enforces **≥2 items**
  before submit (`:173-176`) — the server does not (Flag 4).

### 4 · PATCH /combos/:id (write — edit)

- Handler `product_handler.go:400-430`: binds `updateComboRequest` — `name` required, `price`
  `min=1`, **`items` `required,min=2`**, `sort_order`, `description`. **No `image_path`, no
  `category_id` field.** Returns `200` `{"message":"Cập nhật combo thành công"}`.
- Service `product_service.go:588-623`: `GetComboByID` existence check → `ErrNotFound` (404) on
  miss; `UpdateCombo` (`products.sql:132-135`) sets `category_id, name, description, price,
  image_path, sort_order`; then `DeleteComboItemsByComboID` + re-`CreateComboItem` per item
  (replace-all). Invalidates `combos:list` (`:621`).
- **⚠️ The service reads `in.CategoryID` and passes an `ImagePath`-less `UpdateComboParams`, but the
  handler never populates `category_id` *or* `image_path`** → every edit nulls both columns
  (Flag 3 / [COMBOS_BUGS.md](COMBOS_BUGS.md) Bug 2). Same swallow-on-item-error as create.

### 5 · DELETE /combos/:id (write — delete)

- Handler `product_handler.go:433-439`: `svc.DeleteCombo`, returns `204 No Content`.
- Service `product_service.go:571-577`: `SoftDeleteCombo` (`products.sql:137-140`, sets
  `deleted_at`). **No active-order / combo-in-use guard** and no existence check → deleting a
  non-existent id still returns 204 (the UPDATE simply matches 0 rows). Invalidates `combos:list`.
- FE: `handleDelete` uses a native `confirm()` then `deleteMut` (`combos/page.tsx:163-187`);
  button gated to `admin` only.

---

## Caching & Invalidation

- **`combos:list`** — String(JSON), TTL **5 min** (`productCacheTTL`, `product_service.go:21`),
  populated on read-miss by `ListCombos`→`ListCombosAvailable` (available-only), Del-ed by every
  combo write via `invalidateComboCaches` (`:723-725`, `s.rdb.Del(ctx, cacheKeyCombos)`).
- **Shared key** — this is the *same* `combos:list` the customer menu (C1) and combo-detail (C5)
  read. A manager create/edit/delete therefore refreshes the customer menu on its next fetch
  (no realtime push; both sides also have a FE `staleTime`). Owner of this fact:
  [../../03_be/REDIS_CACHE.md](../../03_be/REDIS_CACHE.md).
- `invalidateComboCaches` Dels **only** `combos:list` — it does **not** touch `products:list` or any
  `product:<id>` key (correct: a combo write changes no product row).
- `GET /products/all` is **uncached** (always MySQL + N+1 toppings).
- Cache failures fail-open: `getCacheJSON` swallows Redis errors and falls through to MySQL
  (`:727-733`); `Del` errors are logged, not fatal.

---

## Error Behaviour

- **Bind failure** (`POST`/`PATCH`) → `400 INVALID_INPUT` "Dữ liệu đầu vào không hợp lệ"
  (`product_handler.go:377,412`). FE catches in `onError` → toast "Lưu combo thất bại. Vui lòng thử
  lại." (`combos/page.tsx:144,160`).
- **Service error** → `handleServiceError` (`respond.go:24-36`): typed `*service.AppError` →
  its status/code; untyped wrapped errors (e.g. `combo: create: %w`) → **`500 COMMON_002`**.
- **`PATCH` on missing/deleted combo** → `GetComboByID` returns `sql.ErrNoRows` → `ErrNotFound`
  → `404 NOT_FOUND` (`product_service.go:589-593`, `errors.go:28`).
- **`DELETE`** never errors on a missing id (soft-delete UPDATE matches 0 rows → still 204).
- FE error states are coarse — all three mutations show the same generic toast; there is no
  per-code mapping (no 403/404/409 distinction surfaced to the manager).

---

## Flags

| # | Flag | Detail |
|---|------|--------|
| 1 | **Admin list is available-only — hidden combos are unmanageable** | `ListCombos` service calls `ListCombosAvailable` (`product_service.go:505`); the unfiltered `ListCombos` query (`products.sql:107`) is **dead**. Unlike products (`/products/all`), combos has **no "all" endpoint**, so any `is_available=0` combo vanishes from this table — uneditable/un-deletable from the UI. Latent today (no UI path sets a combo unavailable — see Flag 2). → [COMBOS_BUGS.md](COMBOS_BUGS.md) Bug 1. |
| 2 | **No combo availability toggle anywhere** | `CreateCombo` SQL hardcodes `is_available=1` (`products.sql:130`); `UpdateCombo` SQL never touches `is_available`; there is **no `ToggleComboAvailability` query/route and no FE toggle**. So combos are always available — the page-doc wireframe's "Còn ●" availability column + "availability toggle controls /menu visibility" claim are **drift** (see [admin_combos.md](admin_combos.md)). `is_available` is returned by `GET /combos` but never rendered here (dead response field). |
| 3 | **`PATCH /combos/:id` wipes `image_path` and `category_id`** | The handler's `updateComboRequest` has no `image_path`/`category_id` fields (`product_handler.go:400-406`); the service passes `in.CategoryID=""`→NULL and an `ImagePath`-less `UpdateComboParams` (`:603-610`) → the SQL sets both to NULL/empty on every edit. Harmless via this UI (the form sends neither) but a latent data-loss bug + dead service parameter. → [COMBOS_BUGS.md](COMBOS_BUGS.md) Bug 2. |
| 4 | **Create vs update validation asymmetry** | `POST` binds `price min=0` and **no item-count minimum** (`product_handler.go:359-365`); `PATCH` binds `price min=1` + `items required,min=2` (`:401-405`). The FE enforces ≥2 items for both client-side (`combos/page.tsx:173`), but the API will accept a 0-price / 0-item combo on create. → [COMBOS_BUGS.md](COMBOS_BUGS.md) Bug 4. |
| 5 | **Item writes are non-transactional & swallow errors** | Both create and update loop `CreateComboItem` and only `slog.Warn` on failure (`product_service.go:562-564,617-619`) — a bad `product_id` (FK violation) silently drops that item yet the combo still returns 2xx, leaving a partial/empty combo. → [COMBOS_BUGS.md](COMBOS_BUGS.md) Bug 3. |
| 6 | **`DELETE` has no in-use guard** | `SoftDeleteCombo` (`product_service.go:571`) deletes regardless of whether the combo is referenced by a live order. Historical orders are safe (order_items snapshot name/price), but there is no 409. Same pattern flagged on A3 products `DELETE`. |
| 7 | **`category_id` returned but unused** | `GET /combos` returns `category_id`; the FE maps it (`admin.api.ts:139`) but the page never renders or filters by it — combos have no category UI here. |

> Code bugs from this trace are catalogued in [COMBOS_BUGS.md](COMBOS_BUGS.md) (Flags 1, 3, 4, 5).
