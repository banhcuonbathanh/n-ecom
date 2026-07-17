# Combo Detail — `/menu/combo/:id` · Backend View

> **TL;DR:** every BE endpoint this page calls, traced handler → service → repository → SQL, with
> auth, caching and error behaviour. Traced from source on branch
> `experience_claude.md_system_1` (NOT from docs). **The page is read-only** — it calls two public,
> cached catalog GETs and does its add-to-cart entirely client-side (Zustand); it never writes to
> the BE.
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/product_handler.go` ·
> `be/internal/service/product_service.go` · `be/internal/db/products.sql.go` ·
> `fe/src/app/(shop)/menu/combo/[id]/page.tsx`.
>
> FE view + zones → [customer_combo_detail.md](customer_combo_detail.md) ·
> Combo object shapes (raw wire ⇄ enriched) → [customer_menu.md §4](../customer_menu/customer_menu.md#4--combo-two-fe-shapes-raw-wire--enriched) ·
> Order write pipeline (where the combo cart item is later expanded) → [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) ·
> Code bugs this trace found → [COMBO_BUGS.md](COMBO_BUGS.md)

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `GET /combos` | public | `productH.ListCombos` | `ListCombos` | `ListCombosAvailable` + `GetComboItems` | `combos:list` |
| 2 | `GET /products` | public | `productH.ListProducts` | `ListProducts` | `ListProductsAvailable` + `GetToppingsByProductID` | `products:list` |

Route registration: `GET /combos` → `be/cmd/server/main.go:216`; `GET /products` →
`be/cmd/server/main.go:168`. Both under `/api/v1`, both **outside** any `authMW`/role group.

**There is no `GET /combos/:id` endpoint.** The combos route group only registers `GET ""` plus
manager/admin writes (`main.go:215-227`). This page fetches the **whole** combo list and the
**whole** product list, then resolves the one combo + its item names/prices **client-side**
(`menu/combo/[id]/page.tsx:30-50`). See Flags 1 & 2.

## Auth Model on This Page

- **Both GETs are fully public** — no `authMW` on either route (`main.go:168,216`). The page renders
  for an anonymous browser; no guest JWT is required to view a combo.
- The page issues **zero authenticated requests** — add-to-cart writes only to the in-memory cart
  store (`useCartStore.addItem`, `page.tsx:60-69`); the BE write (`POST /orders`) happens later on
  `/menu`, not here.
- Catalog **mutations** are staff-only and not used by this page: combo writes `AtLeast("manager")`,
  deletes `AtLeast("admin")` (`main.go:217-227`).

## Per-Endpoint Detail

### 1 · `GET /combos`

- Handler `ListCombos` (`product_handler.go:327-356`): reads **no** query params; serializes inline.
- Service `ListCombos` (`product_service.go:497-517`): Redis `combos:list` hit → unmarshal & return;
  miss → repo `ListCombosAvailable` (`product_service.go:505`) then `GetComboItems` per combo
  (`:512`) → `enrichCombo` → cache set (`:515`).
- Query `ListCombosAvailable` (`be/internal/db/products.sql.go:385-389`):
  `WHERE is_available = 1 AND deleted_at IS NULL ORDER BY sort_order ASC, name ASC` — **unavailable
  combos are excluded from the wire entirely** (drives Flag 3 / [COMBO_BUGS.md](COMBO_BUGS.md) Bug 1).
- Serializer (inline, `product_handler.go:333-354`): combo fields + `combo_items:
  [{id, product_id, quantity}]` — **ids only**, no product name/price. The FE resolves names/prices
  by joining against `GET /products` (`page.tsx:33-48`).

### 2 · `GET /products`

- Handler `ListProducts` (`product_handler.go:42-54`): reads **no** query params; serializes each
  product via `productJSON`.
- Service `ListProducts` (`product_service.go:164-191`): Redis `products:list` hit → return; miss →
  repo `ListProductsAvailable` (`:173`), toppings resolved per product via
  `GetToppingsByProductID` (`:185`), category map built (`:178`) → cache set (`:189`).
- Query `ListProductsAvailable` (`be/internal/db/products.sql.go:467-470`):
  `WHERE is_available = 1 AND deleted_at IS NULL` — **unavailable products are excluded**. This page
  uses the result only to build a `product_id → {name, price}` map for the combo's sub-items
  (`page.tsx:33`); an unavailable sub-product falls out of the map → drives
  [COMBO_BUGS.md](COMBO_BUGS.md) Bug 2.
- Serializer `productJSON` (`product_handler.go:443-460`) — full product shape; the combo page reads
  only `id`, `name`, `price` from it.

## Caching & Invalidation

- One shared TTL: `productCacheTTL = 5 * time.Minute` (`product_service.go:21`) — matches the FE
  TanStack `staleTime` of 5 min on both queries (`page.tsx:21,27`), so worst-case end-to-end
  staleness is ~10 min.
- Keys used by this page: `combos:list` · `products:list` (constants `product_service.go:25,27`).
- Invalidation is write-triggered, not TTL-only: combo mutations call `invalidateComboCaches`,
  product/category mutations `invalidateProductCaches` — none reachable from this read-only page.
- Cache failures are non-fatal: `getCacheJSON`/`setCacheJSON` swallow Redis errors and fall through
  to MySQL, so the combo page survives a Redis outage.

## Error Behaviour

- Neither endpoint binds a request body or params, so there is no `400 INVALID_INPUT` path on this
  page; service errors map via `handleServiceError` (`product_handler.go:45,329`).
- **Not-found is a client-side concept here.** Because there is no `GET /combos/:id`, a missing combo
  is never a BE 404 — it is the FE `rawCombos.find(...)` returning `undefined`, which renders the
  "Không tìm thấy combo" block (`page.tsx:86-93`). `isError` from the `combos` query (a real network
  failure) renders the **same** block.
- The `products` query has no visible error UI on this page — on failure it defaults to `[]`
  (`page.tsx:24`), so combo sub-items silently lose their names/prices (see Bug 2).

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **No `GET /combos/:id` — page over-fetches the whole catalog** | The page loads the entire combo list (`GET /combos`) and finds the one by id client-side (`page.tsx:31`). No per-id endpoint exists (`main.go:215-227`). Acceptable at this catalog size but means a deep-link to `/menu/combo/:id` pays for the full list + full product list on every cold load. |
| 2 | **Combo item names/prices are resolved FE-side, not by BE** | `GET /combos` returns `combo_items` as ids only (`product_handler.go:337-341`); the page joins them against `GET /products` to get `product_name`/`unit_price` (`page.tsx:33-48`). The two queries can be independently stale (5-min TTL each). |
| 3 | **Unavailable-combo UI is unreachable** | `ListCombosAvailable` filters `is_available = 1` (`products.sql.go:387`), so a combo with `is_available=false` never reaches the wire. The page's "Hết hàng" badge (`page.tsx:122-126`) and disabled/"Combo tạm hết" CTA (`page.tsx:183-185`) therefore **can never fire** for a catalog combo — it shows "Không tìm thấy combo" instead. Code bug → [COMBO_BUGS.md](COMBO_BUGS.md) Bug 1. |
| 4 | **Unavailable sub-product → UUID shown as name** | `ListProductsAvailable` excludes unavailable products (`products.sql.go:469`); when a combo's sub-item points at one, the FE map misses and falls back to the raw `product_id` UUID as the display name (`page.tsx:45`), with `unit_price` undefined. Code bug → [COMBO_BUGS.md](COMBO_BUGS.md) Bug 2. |
| 5 | **Page issues no authenticated/write request** | Add-to-cart is pure client state (`useCartStore.addItem`, `page.tsx:60-69`). The combo cart item carries `combo_items[]` with `product_id`/`unit_price`/`quantity` so the later `POST /orders` (on `/menu`, via `order-payload.ts`) can expand & price it. This page never calls `POST /orders` itself. |
