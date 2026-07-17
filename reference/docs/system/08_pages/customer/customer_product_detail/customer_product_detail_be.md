# Customer Product Detail — `/menu/product/:id` · Backend View

> **TL;DR:** the single BE endpoint this page calls (`GET /products/:id`), traced
> handler → service → repository → SQL, with auth, caching and error behaviour. Add-to-cart is
> **100% client-side** (Zustand `useCartStore`) — no BE write happens on this page. Traced from
> source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/product_handler.go` ·
> `be/internal/service/product_service.go` · `be/internal/repository/product_repo.go` ·
> `be/internal/db/products.sql.go` · FE `fe/src/hooks/useProductDetail.ts`.
>
> FE view + zones → [customer_product_detail.md](customer_product_detail.md) ·
> Object shapes (Product · Topping, all layers) → [customer_menu.md §3](../customer_menu/customer_menu.md#3--product) ·
> Caching siblings → [../customer_menu/customer_menu_be.md](../customer_menu/customer_menu_be.md) (same `product:<id>` key family).

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `GET /products/:id` | **public** | `productH.GetProduct` | `ProductService.GetProduct` | `GetProductByID` + `GetToppingsByProductID` (+ `ListCategories` for the name map) | `product:<id>` (5 min) |

Route registration: `be/cmd/server/main.go:169` (`prodR.GET("/:id", productH.GetProduct)`),
under the `/products` group `be/cmd/server/main.go:167`, all under `/api/v1`. No middleware on
this route — it sits **above** the `authMW`-gated manager/admin sub-groups
(`main.go:170-182`).

This is the page's only BE call. "Thêm vào giỏ" (`page.tsx:33-46`) writes to `useCartStore.addItem`
in memory only — there is **no** order/cart endpoint hit here; the order is created later from
`/menu` or `/checkout` (see [customer_menu_be.md](../customer_menu/customer_menu_be.md)).

---

## Auth Model on This Page

- **`GET /products/:id` is fully public** — no `authMW`, no role gate. The detail page renders for
  an unauthenticated visitor exactly as for a guest-JWT diner; the guest token from
  `/table/:tableId` is irrelevant to this read.
- The same path is **overloaded** for staff writes — `PATCH /products/:id`,
  `PATCH /products/:id/availability` (`AtLeast("manager")`, `main.go:175-176`) and
  `DELETE /products/:id` (`AtLeast("admin")`, `main.go:181`) — but none of those are called by
  this customer page.

---

## Per-Endpoint Detail

### 1 · `GET /products/:id`

- **Handler** `GetProduct` (`product_handler.go:72-80`): reads the path param `id`
  (`c.Param("id")`), calls `svc.GetProduct`, serializes via `productJSON`
  (`product_handler.go:443-460`) under `{"data": …}`. The FE unwraps `r.data.data`
  (`useProductDetail.ts:8`).
- **Service** `GetProduct` (`product_service.go:212-234`):
  1. Redis `product:<id>` hit → `json.Unmarshal` → return (`:213-219`).
  2. Miss → repo `GetProductByID` (`:221`). `sql.ErrNoRows` → `ErrNotFound` (→ 404); other errors
     wrapped (→ 500).
  3. Builds the category-name map via `buildCategoryMap` → repo `ListCategories` (`:229`,
     `:697-707`) and loads toppings via repo `GetToppingsByProductID` (`:230`).
  4. `enrichProduct` (`:627-661`) assembles `ProductDetails` (NULL description/image → `""`,
     category name resolved, toppings mapped to `{id,name,price,is_available}`).
  5. `setCacheJSON` writes `product:<id>` with `productCacheTTL` (5 min) (`:232`).
- **Repo / SQL**:
  - `GetProductByID` (`product_repo.go:70-72` → `products.sql.go:222-245`):
    `SELECT … FROM products WHERE id = ? AND deleted_at IS NULL LIMIT 1` — soft-deleted products
    return `ErrNoRows` → 404.
  - `GetToppingsByProductID` (`product_repo.go:94-96` → `products.sql.go:268-296`):
    `… FROM toppings t INNER JOIN product_toppings pt ON pt.topping_id = t.id
    WHERE pt.product_id = ? AND t.deleted_at IS NULL ORDER BY t.name ASC` — returns **all**
    attached toppings regardless of `is_available`; the unavailable ones are surfaced and only
    *disabled* in the FE `ToppingSelector` (`ToppingSelector.tsx:37,48`).
- **Response shape** = `ProductJSON` (`product_handler.go:443-460`): `id, name, price, description,
  image_path, is_available, sort_order, category_id, category_name, toppings[]`. Matches FE
  `Product` type (`fe/src/types/product.ts:14-25`). `price` and topping `price` are int64 VND
  (`parsePrice` of the MySQL `DECIMAL(10,0)` string).

---

## Caching & Invalidation

- **Key:** `product:<id>` (`fmt.Sprintf("product:%s", id)`, `product_service.go:213`), TTL
  `productCacheTTL = 5 * time.Minute` (`:21`). Same family as the catalog keys documented in
  [REDIS_CACHE.md](../../03_be/REDIS_CACHE.md).
- **Populated** lazily on the first miss of `GetProduct` (`:232`).
- **Invalidated** write-triggered by `invalidateProductCaches(ctx, id)` (`:709-717`), which Dels
  `products:list` + `categories:list` + `product:<id>`. It is called by CreateProduct (`:276`),
  UpdateProduct (`:328`, also the `/availability` PATCH which reuses `UpdateProduct`), and
  DeleteProduct (`:337`).
- **Failure behaviour:** `getCacheJSON`/`setCacheJSON` (`:727-743`) swallow Redis errors and fall
  through to MySQL — the detail page survives a Redis outage (just uncached).
- **End-to-end staleness:** FE `useProductDetail` adds `staleTime: 5 * 60 * 1000`
  (`useProductDetail.ts:9`) on top of the 5-min Redis TTL — worst case a price edit is visible
  ~10 min later, before any tab refocus refetch. See Flags #2 for the topping-edit gap.

---

## Error Behaviour

- **404** — unknown or soft-deleted `id`: `GetProductByID` → `ErrNoRows` → `ErrNotFound` →
  `handleServiceError` maps to 404. FE `isError` branch renders "Không tìm thấy sản phẩm." +
  "Quay lại menu" (`page.tsx:59-69`).
- **5xx** — any other repo error is wrapped (`product: get: %w`) → `handleServiceError` → 500;
  same FE `isError` branch.
- **No bind/validation step** — the only input is a path param, so there is no `400 INVALID_INPUT`
  path on this endpoint.

---

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **Detail page does zero BE writes** | "Thêm vào giỏ" only calls `useCartStore.addItem` (`page.tsx:33-46`); the cart line is keyed `product_<id>_<sortedToppingIds>` and priced FE-side (`page.tsx:28-31`). The server never sees this action — pricing/availability are re-snapshotted only at order-create time on `/menu`/`/checkout`. |
| 2 | **A topping edit does NOT bust `product:<id>`** | `invalidateToppingCaches` (`product_service.go:719-721`) Dels only `toppings:list` + `products:list` — **not** any `product:<id>` key. So after an admin edits a topping's price/availability (`PATCH/DELETE /toppings/:id`), this detail page can serve a **stale topping price or availability for up to 5 min** (Redis TTL) on top of the FE 5-min `staleTime`. REDIS_CACHE.md only claims topping writes Del `products:list`, so the handbook is accurate — this is a real code gap, not doc drift. |
| 3 | **Unavailable toppings are returned, not filtered** | `GetToppingsByProductID` has no `is_available` filter (`products.sql.go:268-272`); the FE renders them disabled (`ToppingSelector.tsx:37,48`). A topping toggled unavailable mid-session still appears (greyed) until the cache expires. |
| 4 | **`category_name` is computed per request** | `GetProduct` always runs `buildCategoryMap` (a `ListCategories` read) on a cache miss purely to fill `category_name` (`product_service.go:229,636-639`), even though the detail page (`ProductInfo.tsx`) never renders the category. Harmless (categories are themselves cached), noted for completeness. |
| 5 | **Public read, no rate limit** | Like the rest of the catalog GETs, this route has no `authMW` and no rate-limit middleware in the global chain — Redis caching is the only pressure valve (same posture as [customer_menu_be.md](../customer_menu/customer_menu_be.md) Flag 2). |
