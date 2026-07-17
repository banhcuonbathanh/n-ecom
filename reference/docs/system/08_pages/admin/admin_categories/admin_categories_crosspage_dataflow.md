# Admin Categories — Cross-Page Data Flow (categories, after a write leaves `/admin/categories`)

> **TL;DR:** ✅ implemented.
> A category created, renamed, or deleted on `/admin/categories` is a **write that outlives the page**.
> There is no SSE/WS push, no localStorage handoff, and no shared FE store — the propagation
> mechanism is purely server-side: one MySQL `categories` row + two Redis cache keys
> (`categories:list` and `products:list`), both evicted by every category write via
> `invalidateProductCaches`. Downstream pages pick up the change only on their **next fetch**
> (worst-case staleness = FE `staleTime` + Redis rebuild; after a `DEL` the next read is always a
> miss → fresh from MySQL). Because `products:list` embeds `CategoryName` per product (via
> `enrichProduct`), renaming a category also reshapes every product response — both downstream caches
> move together.
>
> Sources traced on branch `experience_claude.md_system_1`:
> [`fe/src/app/(dashboard)/admin/categories/page.tsx`](../../../../../fe/src/app/(dashboard)/admin/categories/page.tsx) ·
> [`fe/src/features/admin/admin.api.ts`](../../../../../fe/src/features/admin/admin.api.ts) ·
> [`be/internal/service/product_service.go`](../../../../../be/internal/service/product_service.go) ·
> [`fe/src/app/(shop)/menu/page.tsx`](../../../../../fe/src/app/(shop)/menu/page.tsx) ·
> [`fe/src/app/(dashboard)/pos/page.tsx`](../../../../../fe/src/app/(dashboard)/pos/page.tsx) ·
> [`fe/src/app/(dashboard)/admin/products/_components/ProductFormModal.tsx`](../../../../../fe/src/app/(dashboard)/admin/products/_components/ProductFormModal.tsx) ·
> [`fe/src/features/menu/components/CategoryTabs.tsx`](../../../../../fe/src/features/menu/components/CategoryTabs.tsx)
>
> On-page widget flow → [admin_categories_crosscomponent_dataflow.md](admin_categories_crosscomponent_dataflow.md) ·
> Page zones + object model → [admin_categories.md](admin_categories.md) ·
> BE endpoints, caching, errors → [admin_categories_be.md](admin_categories_be.md) ·
> Loading states → [admin_categories_loading.md](admin_categories_loading.md) ·
> Scenario → [SCENARIO_CATEGORY_CRUD.md](SCENARIO_CATEGORY_CRUD.md)

---

## 0. The whole picture on one diagram

This is a cache-invalidation story, not a realtime story. There is **no SSE/WS push** for
category changes — downstream pages rebuild only on their next fetch.

```
   ┌────────────────────── ADMIN DEVICE ─────────────────────────┐
   │                                                               │
   │  /admin/categories                                            │
   │     POST /categories        ─────────────────────────────▶   │
   │     PATCH /categories/:id                              BE     │
   │     DELETE /categories/:id                            ─────   │
   │                                                        │      │
   │  qc.invalidateQueries(['admin','categories'])          │      │
   │  (TanStack Query — admin page only)                    │      │
   └────────────────────────────────────────────────────── │ ──────┘
                                                           │
   ═══════════════════════════ THE WIRE ══════════════════ │ ═══════
                                                           │
                         ┌─────────────────────────────────▼──────┐
                         │   MySQL: categories (one row)          │
                         │   + products (embeds category_name)    │
                         └──┬──────────────────────────────────┬──┘
                            │  invalidateProductCaches(ctx,"")  │
                            │  Dels (product_service.go:709-717)│
                            │   "products:list"                 │
                            │   "categories:list"               │
                            │                                   │
              ┌─────────────▼────────────┐   ┌─────────────────▼──────────────┐
              │  Redis "categories:list" │   │  Redis "products:list"         │
              │  evicted (next read is   │   │  evicted (next read rebuilds   │
              │  MySQL → fresh list)     │   │  with fresh category_name)     │
              └─────────────┬────────────┘   └─────────────────┬──────────────┘
                            │                                   │
        ┌───────────────────▼───────────────────────────────────▼──────────────┐
        │                                                                        │
        ▼                   ▼                          ▼                         ▼
 Customer /menu        Staff /pos              /admin/products            /admin/categories
 CategoryTabs          CategoryTabs            ProductFormModal             (this page)
 (public GET           (public GET             category dropdown            GET /categories
 /categories)          /categories)            (GET /categories)            ['admin','categories'])
 queryKey:             queryKey:               queryKey:
 ['categories']        ['categories']          ['categories']
 staleTime: 5 min      staleTime: 5 min        staleTime: 60 s
```

**Two things this diagram is NOT:**
- There is **no SSE/WS push** for category changes. Downstream pages receive no live signal when a
  category is created, renamed, or deleted — they pick it up only when their TanStack Query cache
  expires and they refetch.
- There is **no localStorage / persisted-store handoff**. `['admin','categories']` lives only in the
  admin page's TanStack Query instance in memory.

---

## 1. What this page writes

Every category CRUD operation calls **one of three service methods**, each of which:
1. executes the MySQL mutation, and
2. immediately calls `invalidateProductCaches(ctx, "")` — which `DEL`s both `products:list` and
   `categories:list` from Redis.

```
   CreateCategory  (product_service.go:365-379)
        MySQL INSERT categories → s.invalidateProductCaches(ctx, "")   (line 377)

   UpdateCategory  (product_service.go:387-406)
        MySQL UPDATE categories → s.invalidateProductCaches(ctx, "")   (line 404)

   DeleteCategory  (product_service.go:408-427)
        MySQL soft-DELETE categories (deleted_at) → s.invalidateProductCaches(ctx, "")  (line 425)
        (only if count of products in that category = 0 — line 419-421)
```

The cache constant values:

```go
// product_service.go:24-29
cacheKeyProductsList = "products:list"
cacheKeyCategories   = "categories:list"
```

`invalidateProductCaches` without a product `id` always deletes exactly these two keys
(`product_service.go:710`).

### Why `products:list` must also be invalidated

`ListProducts` builds its cached result by calling `enrichProduct` for each row
(`product_service.go:186`), which looks up `CategoryName` from the in-memory category map
(`product_service.go:636-639, 658`). The resulting `[]ProductDetails` — embedding
`category_name` per product — is stored as the `products:list` cache entry
(`product_service.go:189`).

If a category is renamed and only `categories:list` were evicted, the `products:list` entry would
still carry the old `category_name` until its own 5-min TTL expired. By evicting **both** keys
together, the next call to `GET /products` (public endpoint) also rebuilds from MySQL with the
updated category name.

---

## 2. The moment of handoff — cache invalidation

After each mutation the FE also fires a TanStack Query invalidation:

```javascript
// page.tsx:49 (saveMut onSuccess — create or update)
qc.invalidateQueries({ queryKey: ['admin', 'categories'] })

// page.tsx:66 (deleteMut onSuccess)
qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
```

This only refetches queries keyed `['admin','categories']` — the admin page's own list view. It
does **not** touch the `['categories']` queries on the customer menu, POS, or ProductFormModal;
those are deduped separately and will refetch only when their own `staleTime` expires.

| Write type | BE Redis keys evicted | FE queries invalidated |
|---|---|---|
| Create category | `products:list` · `categories:list` | `['admin','categories']` only |
| Update category (name or sort_order) | same | same |
| Delete category (soft) | same | same |

> Cache mechanics (TTL, `setCacheJSON`, `getCacheJSON`, `DEL` behavior) are owned by
> [docs/system/03_be/REDIS_CACHE.md](../../../03_be/REDIS_CACHE.md) — link, don't restate here.

---

## 3. Downstream surface: Customer `/menu` — CategoryTabs

The customer menu page reads `GET /categories` (public, no auth) to populate its `CategoryTabs`
component:

```javascript
// fe/src/app/(shop)/menu/page.tsx:52-56
const { data: categories = [] } = useQuery<Category[]>({
  queryKey: ['categories'],
  queryFn: () => api.get('/categories').then(r => r.data.data),
  staleTime: 5 * 60 * 1000,   // 5 minutes
})
```

The `CategoryTabs` component renders each category as a tab button (`CategoryTabs.tsx:24-36`).
After a category write on `/admin/categories`:

- The Redis `categories:list` key is evicted immediately.
- The customer's `['categories']` TanStack cache has its own 5-min `staleTime`.
- If the customer mounted `/menu` less than 5 min ago, they see the old tab list until their
  staleTime expires or they reload.
- After staleTime expires (or on mount), TanStack calls `GET /categories` → Redis miss → MySQL
  → fresh list → new 5-min cache.

**Staleness window for customer CategoryTabs:**

```
   Admin creates/renames/deletes category at T=0
        │
        ├── MySQL updated (instant)
        ├── Redis "categories:list" DEL'd (instant)
        │
        ▼
   Customer on /menu who last fetched at T=-1 min:
        staleTime=5 min → cache expires at T=4 min
        Next refetch at T=4 min → Redis miss → MySQL → fresh tabs

   Customer who navigates to /menu at T=1 min (fresh mount):
        No in-memory cache → fetches immediately → Redis miss → MySQL → fresh tabs
```

**The `products:list` side-effect on `/menu`:** the customer menu also fetches `GET /products`
(queryKey `['products', selectedCategory, searchQuery]`, staleTime 5 min). Because
`products:list` was also evicted, the next `GET /products` call rebuilds product data with the
updated `category_name` per product (`enrichProduct`, `product_service.go:658`). This matters if
any FE component renders `category_name` from the product object.

**Cross-Page Concern (cosmetic filter):** The customer menu CategoryTabs pass `category_id` to
`GET /products` via `params.category_id`, but the `ListProducts` handler ignores this parameter —
`product_handler.go` reads no query params and `ListProductsAvailable` has no WHERE on category.
The tabs are therefore cosmetic filters only (client-side appearance; full available list always
returned). This is a pre-existing flag documented in
[BE_DOC_TRACKER.md Cross-Page Concerns](../../BE_DOC_TRACKER.md) and
[customer_menu_be.md Flag 1](../customer/customer_menu/customer_menu_be.md). Category writes do
not make this worse or better.

---

## 4. Downstream surface: Staff `/pos` — CategoryTabs

The POS page uses the identical shared `CategoryTabs` component and reads `GET /categories` with
the same query key and staleTime:

```javascript
// fe/src/app/(dashboard)/pos/page.tsx:39-43
const { data: categories = [] } = useQuery<Category[]>({
  queryKey: ['categories'],
  queryFn:  () => api.get('/categories').then(r => r.data?.data ?? r.data ?? []),
  staleTime: 5 * 60 * 1000,
})
```

The POS page and the customer menu **share the same TanStack Query key** (`['categories']`). If
both are open in the same browser session, they share one in-memory cached value. A cache
invalidation from a third tab running `/admin/categories` does **not** reach them — only the
admin page's `['admin','categories']` is invalidated FE-side. The `['categories']` key in the
customer/POS pages is only updated when those pages' own staleTime expires or they remount.

**Same cosmetic-filter concern applies:** `GET /products` on the POS also ignores `category_id`
(same handler, same SQL). POS tabs re-key on `selectedCategory` (`queryKey: ['products', selectedCategory]`,
`pos/page.tsx:46`) but receive the same full available product list regardless of which tab is
selected. See [BE_DOC_TRACKER.md Cross-Page Concerns](../../BE_DOC_TRACKER.md) and
[staff_pos_be.md Flag 1](../staff/staff_pos/staff_pos_be.md).

---

## 5. Downstream surface: `/admin/products` — ProductFormModal category dropdown

The product form modal reads `GET /categories` to populate its category `<select>`:

```javascript
// fe/src/app/(dashboard)/admin/products/_components/ProductFormModal.tsx:39-43
const { data: categories = [] } = useQuery<Category[]>({
  queryKey: ['categories'],
  queryFn:  listCategories,
  staleTime: 60_000,   // 1 minute (shorter than menu/POS 5 min)
})
```

Note: the modal uses `staleTime: 60_000` (1 minute), shorter than the customer menu / POS
(5 minutes). This means that after an admin adds a new category on `/admin/categories` and
navigates to `/admin/products`, the new category appears in the modal dropdown within at most 1
minute — often immediately if the modal is newly mounted after the category write.

The modal also has a guard: if `categories.length === 0`, it renders a prompt to add categories
first (`ProductFormModal.tsx:138-139`), and the save button is disabled
(`ProductFormModal.tsx:277`). This means a category delete that empties the list blocks product
creation until a new category is added.

---

## 6. Downstream surface: `products:list` cache (indirect — category rename reshapes product responses)

This is the subtle cross-page effect unique to category writes (vs. topping or product writes).

When `ListProducts` builds the `products:list` cache, it calls `enrichProduct` per product, which
resolves `category_name` by joining the in-memory category map (`product_service.go:636-639`). The
resulting `ProductDetails.CategoryName` string is stored inside the `products:list` JSON blob
(`product_service.go:189`).

**Consequence of a category rename:**
- `invalidateProductCaches(ctx, "")` DELs both `categories:list` and `products:list`.
- The next `GET /products` (from any consumer — customer menu, POS) rebuilds `products:list` with
  the new category name embedded in each product's `category_name` field.
- Any FE consumer that displays `product.category_name` will show the updated name on the next
  fetch.
- **No consumer currently displays `category_name` from a product object in the visible UI** —
  the customer menu renders products without showing their category label (filtering is tab-based),
  and the POS similarly. The admin products page reads `GET /products/all` (uncached,
  `product_service.go:194-209`) so it always sees the live value. This means the `products:list`
  side-effect is currently a correctness guarantee for future consumers, not a visible UX change.

**Consequence of a category delete (soft):**
- The `DeleteCategory` service checks `CountProductsByCategory` first (`product_service.go:415-421`).
  If any products belong to the category, it returns `ErrCategoryHasProducts` (409) and no mutation
  occurs.
- Only if count = 0 does the delete proceed and invalidation fire.
- Therefore a deleted category has zero attached products — `products:list` will not contain any
  product with that `category_id` once the cache rebuilds.

---

## 7. Cross-device sync

There is **no realtime mechanism** for category changes. The propagation model is:

```
   Admin Device (browser A)              Other Device / Browser (B, C, …)
   ────────────────────────              ──────────────────────────────────
   Writes category
   → MySQL updated
   → Redis DEL'd (both keys)

                                         Still has stale TanStack in-memory cache
                                         → sees old data until staleTime expires
                                         → on next fetch: Redis miss → MySQL → fresh

   No WS/SSE event is emitted
   No cross-tab invalidation occurs
   No localStorage bridge
```

The **only** cross-device synchronization point is the MySQL `categories` table (durable) and the
Redis cache (ephemeral, 5-min TTL, DEL'd on write). Two staff members on two different devices
will see category changes at different times depending on when their respective TanStack caches
expire.

---

## 8. Reload (F5) behavior per page

| Page | Cold-load behavior after admin category write |
|---|---|
| `/admin/categories` | Fetches `GET /categories` via `listCategories` → Redis miss (key was evicted) → MySQL → always fresh. staleTime: 60s (`page.tsx:25`), but F5 clears TanStack cache anyway. |
| Customer `/menu` CategoryTabs | Fetches `GET /categories` → Redis miss → MySQL → fresh category list |
| Staff `/pos` CategoryTabs | Same as `/menu` — identical endpoint and query key |
| `/admin/products` ProductFormModal | Fetches `GET /categories` (when modal is opened) → Redis miss → MySQL → fresh dropdown |
| Any page displaying `product.category_name` | Fetches `GET /products` → Redis miss (`products:list` was also evicted) → MySQL with updated `category_name` |

---

## 9. Durability matrix

| Datum | Lives in | Survives F5? | Survives new device / browser? | Who reads it |
|---|---|---|---|---|
| `categories` MySQL row | BE MySQL (durable) | ✅ | ✅ | All pages, all devices — single source of truth |
| `categories:list` Redis cache | BE Redis (5-min TTL) | ✅ (until TTL or eviction) | ✅ | Customer `/menu` · Staff `/pos` · `/admin/products` modal · `/admin/categories` (via `listCategories`) |
| `products:list` Redis cache | BE Redis (5-min TTL) | ✅ (until TTL or eviction) | ✅ | Customer `/menu` products · Staff `/pos` products — embeds `category_name` per product |
| `['admin','categories']` TanStack cache | Admin browser memory | ❌ (dies on F5) | ❌ | Admin categories table only |
| `['categories']` TanStack cache | Browser memory (shared by menu + POS if same session) | ❌ (dies on F5) | ❌ | Customer menu CategoryTabs · POS CategoryTabs · ProductFormModal dropdown |
| `editItem` / `showModal` state | Local `useState` in `page.tsx:19-20` | ❌ | ❌ | Modal open/close + pre-fill on edit — evaporates on navigation |

> **The mental model in one line:** within the admin page, `['admin','categories']` is the live
> view; across all other pages and devices, the **MySQL `categories` row** is the single source of
> truth, propagated lazily through Redis cache eviction of both `categories:list` and
> `products:list`. There is no SSE/WS push, no localStorage bridge, and no cross-page store.

---

## 10. Source & rule map

| Topic | Source of truth |
|---|---|
| On-page widget flow | [admin_categories_crosscomponent_dataflow.md](admin_categories_crosscomponent_dataflow.md) |
| Page zones + wireframe + object model | [admin_categories.md](admin_categories.md) |
| BE endpoints, auth, caching, errors | [admin_categories_be.md](admin_categories_be.md) |
| Loading states | [admin_categories_loading.md](admin_categories_loading.md) |
| End-to-end CRUD narrative | [SCENARIO_CATEGORY_CRUD.md](SCENARIO_CATEGORY_CRUD.md) |
| Redis cache keys, TTL, invalidation patterns | [docs/system/03_be/REDIS_CACHE.md](../../../03_be/REDIS_CACHE.md) |
| `GET /products` ignores `category_id` (cosmetic tabs) | [BE_DOC_TRACKER.md Cross-Page Concerns](../../BE_DOC_TRACKER.md) · [customer_menu_be.md Flag 1](../customer/customer_menu/customer_menu_be.md) · [staff_pos_be.md Flag 1](../staff/staff_pos/staff_pos_be.md) |
| `invalidateProductCaches` implementation | `be/internal/service/product_service.go:709-717` |
| `enrichProduct` (embeds CategoryName in products:list) | `be/internal/service/product_service.go:627-661` |
| `ListCategories` (cache-aside, 5-min TTL) | `be/internal/service/product_service.go:344-357` |
| `CreateCategory` / `UpdateCategory` / `DeleteCategory` | `be/internal/service/product_service.go:365-427` |
| `cacheKeyCategories` / `cacheKeyProductsList` constants | `be/internal/service/product_service.go:24-29` |
| Category routes (GET public · POST/PATCH manager · DELETE admin) | `be/cmd/server/main.go:185-197` |
| Admin page write invalidations (FE) | `fe/src/app/(dashboard)/admin/categories/page.tsx:49, 66` |
| Admin page `listCategories` call | `fe/src/features/admin/admin.api.ts:7-8` |
| Customer menu `GET /categories` | `fe/src/app/(shop)/menu/page.tsx:52-56` |
| POS `GET /categories` | `fe/src/app/(dashboard)/pos/page.tsx:39-43` |
| ProductFormModal `GET /categories` | `fe/src/app/(dashboard)/admin/products/_components/ProductFormModal.tsx:39-43` |
| `CategoryTabs` component | `fe/src/features/menu/components/CategoryTabs.tsx:10-39` |
