# Customer Favourites — `/menu/favourites` (+ `/save`, `/sets`) · Backend View

> **TL;DR:** the favourites suite is a **read-only catalog consumer** — it calls exactly **two
> public GETs** (`GET /products`, `GET /combos`) to resolve hearted ids/sets into displayable
> cards, and writes **nothing** to the backend. All favourites + saved-sets state lives in
> `useFavouritesStore` (localStorage); cart adds are local and only reach the BE later at
> checkout (a different page). Both endpoints are the same cached catalog reads the menu page
> uses. Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/product_handler.go` ·
> `be/internal/service/product_service.go`.
>
> FE view + zones → [customer_favourites.md](customer_favourites.md) ·
> Same endpoints, fuller trace (with the menu's write paths) → [../customer_menu/customer_menu_be.md](../customer_menu/customer_menu_be.md) ·
> Loading states → [customer_favourites_loading.md](customer_favourites_loading.md) ·
> Cross-page state → [customer_favourites_crosspage_dataflow.md](customer_favourites_crosspage_dataflow.md)

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `GET /products` | public | `productH.ListProducts` (`product_handler.go:42`) | `ListProducts` (`product_service.go:164`) | `ListProductsAvailable` (`product_service.go:173`) | `cacheKeyProductsList` (`products:list`), TTL 5 min |
| 2 | `GET /combos` | public | `productH.ListCombos` (`product_handler.go:327`) | `ListCombos` (`product_service.go:497`) | `ListCombosAvailable` (`product_service.go:505`) | `cacheKeyCombos` (`combos:list`), TTL 5 min |

Route registration: `be/cmd/server/main.go:167-168` (`prodR := v1.Group("/products")` →
`prodR.GET("", productH.ListProducts)`) and `:215-216` (`comboR := v1.Group("/combos")` →
`comboR.GET("", productH.ListCombos)`). Both under `/api/v1`, no middleware on the GET.

All three sub-pages — list (`favourites/page.tsx:25-35`), save (`favourites/save/page.tsx:26-34`),
and sets (`favourites/sets/page.tsx:60-68`) — call **only** these same two GETs, with identical
TanStack query keys (`['products-all']`, `['combos']`) and `staleTime: 5 * 60 * 1000`.

---

## Auth Model on This Page

- **Both endpoints are fully public** — no `authMW` on either GET route (`main.go:168`, `:216`
  are bare `.GET("")` on the route group, no auth in the chain). A guest with no token can open
  the favourites suite and see resolved cards.
- The page **issues no writes**, so the guest JWT (`sub='guest'`, `table_id`) is never exercised
  here — favourites and saved sets persist client-side only. The JWT is first needed later, when
  the cart these pages fill is submitted via `POST /orders` on the menu/checkout page.
- Catalog **mutations** (`POST`/`PATCH`/`DELETE` on `/products`, `/combos`) are staff-only and
  not reachable from this page (`main.go:174-181`, `:220-226`).

---

## Per-Endpoint Detail

### 1 · `GET /products`

- Handler `ListProducts` (`product_handler.go:42-54`): **reads no query params** — it calls
  `h.svc.ListProducts(c.Request.Context())` with nothing else, then serializes each product
  through `productJSON` (`product_handler.go:443`). The favourites store carries `toppingIds`,
  and the page resolves the matching topping objects FE-side from `p.toppings`
  (`favourites/page.tsx:56-58`) — the BE applies no per-request filtering.
- Service `ListProducts` (`product_service.go:164-191`): Redis `cacheKeyProductsList` hit →
  unmarshal + return; miss → repo `ListProductsAvailable` (`is_available=1`, soft-deleted
  excluded), toppings resolved per product via `GetToppingsByProductID`, enriched, then
  `setCacheJSON`.
- **Favourites-specific use:** the page joins the store's `items[]` ids against this list and
  **drops any favourite whose id is no longer present** (`favourites/page.tsx:41-48`) — a product
  removed/soft-deleted server-side disappears from the catalog payload, so the favourite is
  auto-pruned client-side with a toast. The BE has no knowledge of this; it just returns the
  current available set.

### 2 · `GET /combos`

- Service `ListCombos` (`product_service.go:497-517`): Redis `cacheKeyCombos` hit → return; miss
  → repo `ListCombosAvailable` + `GetComboItems` per combo → enriched → `setCacheJSON`.
- Inline serializer (`product_handler.go:327`): combo fields + `combo_items:
  [{id, product_id, quantity}]` — **ids only**. The favourites pages resolve each
  `combo_items[].product_id` to a human name by looking it up in the **products** list
  (`favourites/page.tsx:71-74`, `favourites/sets/page.tsx:38-41`), falling back to
  `'Món không rõ tên'` / the raw id when a referenced product is missing — hence both GETs are
  always fetched together.

---

## Caching & Invalidation

- Both reads share the single catalog TTL `productCacheTTL = 5 * time.Minute`
  (`product_service.go:21`), matching the FE TanStack `staleTime` of 5 min — so worst-case
  staleness for a favourite's name/price/availability is ~10 min end-to-end.
- Keys touched by this page: `cacheKeyProductsList` (`products:list`) · `cacheKeyCombos`
  (`combos:list`). The page never writes, so it never invalidates — invalidation is driven only
  by staff catalog mutations (`invalidateProductCaches` / `invalidateComboCaches`).
- Cache failures are non-fatal: `getCacheJSON`/`setCacheJSON` swallow Redis errors and fall
  through to MySQL — the favourites suite survives a Redis outage.
- Full caching deep-dive (shared with the menu) → [../../../10_caching/CACHE_FLOW_E2E.md](../../../10_caching/CACHE_FLOW_E2E.md) ·
  [../../../03_be/REDIS_CACHE.md](../../../03_be/REDIS_CACHE.md).

---

## Error Behaviour

- Service errors → `handleServiceError` (`product_handler.go:45`) maps to the standard codes
  (pattern → [../../../02_spec/ERROR_SPEC.md](../../../02_spec/ERROR_SPEC.md)). With no inputs to validate, a 400 is essentially
  unreachable on these two reads.
- FE failure handling is soft: both queries default to `[]` (`favourites/page.tsx:25,31`). On a
  failed/empty fetch the page renders the **EmptyState** ("Nhấn ♥ trên món ăn bất kỳ để thêm")
  rather than an error banner — a network failure is visually indistinguishable from "no
  favourites yet" on this page. See [customer_favourites_loading.md](customer_favourites_loading.md).

---

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **Whole suite is BE-read-only** | Favourites + saved sets never reach the backend — they live in `useFavouritesStore` (localStorage key `STORAGE_KEYS.FAVOURITES`, `store/favourites.ts:92`). There is no "save favourites to my account" endpoint; clearing storage / switching device loses them. This is why the tracker's "confirm whether saved-sets hit BE" resolves to **no**. |
| 2 | **Availability is inferred, not queried** | The page learns a favourite is gone only because the cached `GET /products`/`GET /combos` payloads omit it (`favourites/page.tsx:41-48`) — there is no per-id availability check. A favourite can therefore show stale for up to ~10 min (TTL + staleTime) before it is pruned. |
| 3 | **`GET /products` ignores all query params** | Same BE behaviour as the menu — the handler makes zero `c.Query` calls (`product_handler.go:42-54`). The favourites suite never sends params anyway, so this is inert here but worth noting it cannot ask the BE to filter by topping/availability. Cross-ref [../customer_menu/customer_menu_be.md](../customer_menu/customer_menu_be.md) Flag 1. |
| 4 | **Combo `product_id`s resolved against products, not the combo payload** | `GET /combos` returns ids only; names come from the `GET /products` join (`favourites/page.tsx:71-74`). If a combo references a now-unavailable product, that line shows `'Món không rõ tên'` (list) / the raw id (sets) — a cosmetic gap, not a BE error. |

> No `_BUGS.md` for this page — the trace found no FE/BE code disagreement (no SSE, no writes, no
> unconsumed events). Drift check: `docs/system` already matches code (verified against the menu
> BE anchor and REDIS_CACHE).
