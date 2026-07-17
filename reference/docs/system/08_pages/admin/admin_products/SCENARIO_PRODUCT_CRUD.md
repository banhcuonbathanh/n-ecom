# Scenario — A Manager's Product Day (Add · Edit · Toggle · Delete)

> **TL;DR:** ✅ implemented · A concrete run through the four CRUD flows on `/admin/products`:
> Chị Hương adds a new product with an image, edits an existing product's price, tries (and fails)
> to toggle a dish to "Hết hàng", and an admin soft-deletes an old product. Every beat is grounded
> in the BE anchor ([admin_products_be.md](admin_products_be.md)) and FE source.
>
> **Key bug surfaced:** the availability toggle always 400s — see Beat 3 and
> [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #1.
>
> **Siblings:** [admin_products.md](admin_products.md) · [admin_products_be.md](admin_products_be.md) ·
> [admin_products_crosscomponent_dataflow.md](admin_products_crosscomponent_dataflow.md) ·
> [admin_products_crosspage_dataflow.md](admin_products_crosspage_dataflow.md) ·
> [admin_products_loading.md](admin_products_loading.md) · [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md)

---

## The Cast

| Who | Role | What they do today |
|---|---|---|
| **Chị Hương** | `manager` | Adds a new dish, edits a price, tries to mark a dish sold-out |
| **Anh Đức** | `admin` | Deletes an old product that is no longer on the menu |

## The Setting

A Tuesday morning before the lunch rush. The shop has just received a new bánh cuốn variety: **"Bánh
cuốn trứng vịt lộn"** (duck-egg bánh cuốn) at ₫55,000. The manager Chị Hương wants to add it to
the menu, bump the price of an existing dish, mark a slow-seller as "Hết hàng" — and Admin Anh Đức
is going to clean up an old product that no longer exists in the kitchen.

---

## The Timeline

### 09:12 — Chị Hương opens the Products page

Chị Hương logs in as `manager` and navigates to `/admin/products`. The page shell renders
`ProductPageHeader` + `ProductsTable`.

**What fires on mount:**

```
useQuery(['admin','products'], listProducts, { staleTime: 30_000 })
  → GET /api/v1/products/all   (manager+ required, main.go:172-173)
```

`listProducts` (`admin.api.ts:39-40`) hits `GET /products/all` — an **uncached** full-table read
(`product_service.go:194-209`). The BE resolves toppings per product via one query per row (the N+1
noted in [admin_products_be.md §1](admin_products_be.md#1--get-productsall)). The result populates
`ProductsTable` with every non-deleted product, including unavailable ones — because
`ListProducts` SQL uses `WHERE deleted_at IS NULL` with no `is_available` filter
(`products.sql.go:432`).

`staleTime: 30_000` (`page.tsx:25`) means a soft-stale refetch happens after 30 seconds — a
manager sees fresh data within half a minute of any write.

---

### 09:15 — Beat 1: Add a new product (two-step: upload then create)

Chị Hương clicks **"+ Thêm sản phẩm"** (`ProductPageHeader` → `page.tsx:119`). The `ProductFormModal`
mounts lazily (`dynamic()` import, `page.tsx:13-15`) in `mode='add'`.

**Step 1 — Image upload**

She picks the photo from her phone. The hidden `<input type="file" accept="image/jpeg,image/png,image/webp">`
triggers `handleImageChange` (`ProductFormModal.tsx:83-98`):

```
uploadFile(file)                          (admin.api.ts:31-37)
  → POST /api/v1/files/upload             (cashier+, main.go:327)
     Content-Type: multipart/form-data
     field: "file"
```

BE handler `fileH.Upload` (`file_handler.go:38-98`) validates:
- Max 10 MB (`maxFileSize = 10<<20`, `file_handler.go:19`)
- Content-type: only `image/jpeg` / `image/png` / `image/webp` sniffed from the first 512 bytes
  (`file_handler.go:21-25`)

On success the file lands at `uploads/<uuid>.jpg` on disk (under `STORAGE_BASE_PATH`). The DB row is
written via `CreateFileAttachment` with `is_orphan = 1` (`files.sql.go:13`). The response is:

```json
{ "data": { "id": "<uuid>", "object_path": "uploads/<uuid>.jpg" } }
```

The modal stores `object_path` in local `imagePath` state (`ProductFormModal.tsx:90`). A preview
renders above the upload button (`ProductFormModal.tsx:183-189`). The form is not yet submitted — the
image upload and form submit are decoupled.

> ⚠️ **Flag:** if `STORAGE_BASE_PATH` is unset, the bytes are silently discarded; only the orphan DB
> row is written, leaving `image_path` pointing at a non-existent file —
> [admin_products_be.md Flag 6](admin_products_be.md#flags).

**Step 2 — Fill form and save**

Chị Hương fills in the form:

| Field | Value |
|---|---|
| Danh mục | "Bánh cuốn" (from `GET /categories` dropdown) |
| Tên sản phẩm | "Bánh cuốn trứng vịt lộn" |
| Mô tả | "Bánh cuốn đặc biệt nhân trứng vịt lộn" |
| Giá | 55000 |
| Thứ tự | 5 |
| Topping áp dụng | "Hành phi" (checkbox, from `GET /toppings`) |

Zod validates the form (`ProductFormModal.tsx:15-22`) — `price` must be `> 0`, `name` non-empty,
`category_id` non-empty.

On submit, `saveMut` fires (`ProductFormModal.tsx:102-122`):

```
createProduct({ category_id, name, description, price, sort_order, topping_ids, image_path })
  (admin.api.ts:42-43)
  → POST /api/v1/products    (manager+, main.go:170)
    Authorization: Bearer <manager JWT>
    { "category_id": "<id>", "name": "Bánh cuốn trứng vịt lộn",
      "description": "Bánh cuốn đặc biệt nhân trứng vịt lộn",
      "price": 55000, "sort_order": 5,
      "topping_ids": ["<id hành phi>"],
      "image_path": "uploads/<uuid>.jpg" }
```

BE handler `CreateProduct` (`product_handler.go:94-121`) binds the body. `is_available` is **not**
in `CreateProductInput` (`admin.api.ts:21-29`), so the new product is created with `is_available=1`
hardcoded in the sqlc INSERT (`products.sql.go:82-83`). The service:
1. Generates a new UUID.
2. Inserts into `products`.
3. Attaches `topping_id` via `AttachToppingToProduct` (`INSERT IGNORE`, `products.sql.go:14`).
4. Calls `invalidateProductCaches` (`product_service.go:709-717`) — DELs `products:list`,
   `categories:list`, and `product:<id>` from Redis.

Response: `201 { data: { id: "<new-uuid>" } }`.

**FE side:** `onSuccess` (`ProductFormModal.tsx:109-112`) calls `invalidate()` →
`qc.invalidateQueries({ queryKey: ['admin','products'] })` → the `['admin','products']` query
refetches `GET /products/all`. The toast shows "Đã thêm sản phẩm". The modal closes.
The new dish now appears in the `ProductsTable` row list.

---

### 09:22 — Beat 2: Edit an existing product's price

Chị Hương spots "Bánh cuốn nhân thịt" — the price was ₫40,000 but it needs bumping to ₫45,000. She
clicks **"Sửa"** (`ProductsTable.tsx:98-101`).

`page.tsx:125` calls `setModal({ open: true, product: p })`. `ProductFormModal` mounts in
`mode='edit'` with the product pre-filled via `useEffect` → `reset({...})` (`ProductFormModal.tsx:54-72`):

```ts
reset({
  category_id:  product.category_id,
  name:         product.name,          // "Bánh cuốn nhân thịt"
  description:  product.description ?? '',
  price:        product.price,          // 40000 → Chị Hương types 45000
  sort_order:   product.sort_order,
  topping_ids:  product.toppings.map(t => t.id),
})
```

She changes `price` to `45000` and submits. `saveMut` branches to `updateProduct`:

```
updateProduct(product.id, { category_id, name, description, price: 45000, sort_order, topping_ids, image_path })
  (admin.api.ts:45-46)
  → PATCH /api/v1/products/:id    (manager+, main.go:174)
    { "category_id": "...", "name": "Bánh cuốn nhân thịt",
      "price": 45000, ... }
```

BE handler `UpdateProduct` (`product_handler.go:134-155`) binds `updateProductRequest` — `name`,
`price`, `category_id` are all **required** (`product_handler.go:124-126`). The service runs a GET
guard first (`product_service.go:292-330`): if the product does not exist → `ErrNotFound` → 404.
Otherwise `UpdateProduct` SQL (`products.sql.go:723-726`) sets `name / description / price /
image_path / sort_order / category_id` — **`is_available` is not touched by this SQL**. Toppings
are cleared and re-attached if `topping_ids` is not nil. Caches invalidated.

Response: `200 { message: "product updated" }`.

> **Price isolation guarantee:** the new price ₫45,000 will appear on all *future* orders, but every
> `order_items.unit_price` row was snapshotted at the time the original order was placed — existing
> orders keep their ₫40,000 price forever. See
> [admin_products.md §Business Logic](admin_products.md#business-logic-used).

FE: `qc.invalidateQueries({ queryKey: ['admin','products'] })` refetches the table. Toast: "Đã cập
nhật sản phẩm".

---

### 09:28 — Beat 3: Toggle availability — the failing badge (Bug #1)

Chị Hương sees "Bánh cuốn chay" is running low in the kitchen. She wants to mark it **"Hết hàng"**
before the lunch crowd arrives. In `ProductsTable` the availability column renders a clickable
`<Badge>` (`ProductsTable.tsx:87-93`):

```tsx
<Badge
  variant={p.is_available ? 'success' : 'muted'}
  onClick={() => onToggle(p.id, !p.is_available)}  // !true = false
  className="cursor-pointer hover:opacity-75 transition-opacity"
>
  {p.is_available ? 'Đang bán' : 'Hết hàng'}
</Badge>
```

Clicking it calls `toggleMut.mutate({ id, is_available: false })` (`page.tsx:44-49`), which fires:

```
toggleAvailability(id, false)   (admin.api.ts:51-52)
  → PATCH /api/v1/products/:id/availability
    Authorization: Bearer <manager JWT>
    { "is_available": false }
```

**What happens on BE:**

The route `PATCH /products/:id/availability` (`main.go:176`) is **wired to the same handler** as
`PATCH /products/:id` — `productH.UpdateProduct` (`product_handler.go:134-155`). That handler
binds `updateProductRequest`, which marks `name`, `price`, and `category_id` as required
(`product_handler.go:124-126`). The body `{ "is_available": false }` contains none of those
fields, so `c.ShouldBindJSON(&req)` fails → **400 INVALID_INPUT** is returned immediately.

Even if the body somehow satisfied validation, `UpdateProductInput` has no `is_available` field and
the SQL never updates the column (`products.sql.go:723-726`). The dedicated query
`ToggleProductAvailability` (`products.sql.go:667-676`) and its repo wrapper
(`product_repo.go:82-84`) exist but are connected to nothing in the service layer.

**On FE:** `toggleMut.onError` fires:

```ts
onError: () => toast.error('Không thể cập nhật trạng thái')   // page.tsx:48
```

The badge stays green "Đang bán". No optimistic update, no rollback needed. The dish keeps selling.

> **This is a real, active bug.** A manager cannot mark any dish "Hết hàng" via the UI. The fix
> requires a dedicated service method, a new `updateProductAvailabilityInput`, and wiring
> `ToggleProductAvailability` into the service. Full detail → [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #1.

---

### 09:35 — Beat 4: Admin Anh Đức deletes an old product

"Canh chua" was removed from the kitchen months ago. Chị Hương cannot delete it — **DELETE is
admin-only** (`DELETE /products/:id` is in the `adm` group: `authMW + AtLeast("admin")`,
`main.go:180-181`). Any manager `DELETE` attempt would return 403.

Anh Đức (role `admin`) logs in and navigates to the same page. He clicks **"Xóa"** on "Canh chua".
The browser confirms (`window.confirm`, `page.tsx:52-53`):

```
"Xóa sản phẩm "Canh chua"?"
```

On confirm, `deleteMut.mutate(id)` fires:

```
deleteProduct(id)   (admin.api.ts:48-49)
  → DELETE /api/v1/products/:id    (admin+, main.go:180-181)
    Authorization: Bearer <admin JWT>
```

BE handler `DeleteProduct` (`product_handler.go:158-164`) calls `service.DeleteProduct`
(`product_service.go:333-339`) → `SoftDeleteProduct` (`products.sql.go:651`:
`UPDATE products SET deleted_at = NOW() WHERE id = ?`). Caches invalidated.

Response: `204 No Content`.

> **No active-order guard.** The FE has a `409` handler with a message "Sản phẩm đang có đơn hàng
> đang xử lý, không thể xoá" (`page.tsx:36-37`), but the BE never emits a 409 — the soft-delete
> always succeeds unconditionally. If an active order references this product, the order history is
> safe (items snapshot `name`/`price` at order time), but the product would disappear from any live
> menu fetch. Full detail → [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #3.

**FE:** `deleteMut.onSuccess` → `qc.invalidateQueries({ queryKey: ['admin','products'] })` →
`GET /products/all` refetches. Toast: "Đã xóa sản phẩm". "Canh chua" row disappears.

---

## Under the Hood

### A. Cross-Component Data Flow (one page, multiple widgets)

Three widgets must stay synchronized during these four beats: `ProductPageHeader` (product count),
`ProductsTable` (rows), and `ProductFormModal` (dropdowns + checkboxes). They do **not** pass
props to each other — they share the TanStack Query cache:

```
ProductFormModal
  useQuery(['categories'], listCategories)  ─┐
  useQuery(['admin','toppings'], listToppings) ─┤
                                              │
ProductsTable                               TanStack Query cache
  reads products[] from page.tsx            │
  (passed as props from useQuery)           │
                                            │
page.tsx                                    │
  useQuery(['admin','products'], listProducts) ─┘
  useMutation → onSuccess → qc.invalidateQueries
```

When `saveMut` or `deleteMut` succeeds, `invalidateQueries(['admin','products'])` marks the cache
stale. The query refetches in the background, and `ProductsTable` re-renders with the new list.
`ProductFormModal`'s category and topping queries are cached separately (`staleTime: 60_000`) and
are not invalidated by product writes.

Full cross-component detail → [admin_products_crosscomponent_dataflow.md](admin_products_crosscomponent_dataflow.md).

### B. Cross-Page Data Flow (downstream surfaces)

When Chị Hương adds "Bánh cuốn trứng vịt lộn" or Anh Đức deletes "Canh chua", the change reaches
the customer-facing `/menu` and `/pos` via **Redis cache invalidation**, not a realtime push:

1. `invalidateProductCaches` DELs `products:list` + `categories:list` + `product:<id>` from Redis.
2. The next `GET /products` request (customer menu, POS) misses the Redis cache → falls through to
   MySQL → sees the updated catalogue.
3. In the browser, `['products']` queries have `staleTime: 5min` by default — the new product may
   not appear for a customer already on the menu page until they navigate away and back (or the
   stale window expires).

**There is no realtime push** — no SSE/WS event fires when the product catalogue changes.
The propagation delay is: BE write → Redis DEL (immediate) → next HTTP request (within 5 min).

Full cross-page detail → [admin_products_crosspage_dataflow.md](admin_products_crosspage_dataflow.md).

### C. FE → BE: What travels on the wire

| Beat | Endpoint | Key fields sent | Never sent by FE |
|---|---|---|---|
| Image upload | `POST /files/upload` | multipart `file` field | — |
| Add product | `POST /products` | `category_id`, `name`, `price`, `description`, `sort_order`, `topping_ids`, `image_path` | `is_available` (FE `CreateProductInput` omits it — always created as `is_available=1`) |
| Edit price | `PATCH /products/:id` | all required fields: `category_id`, `name`, `price` + optionals | `is_available` (not in `CreateProductInput`) |
| Toggle | `PATCH /products/:id/availability` | `{ is_available: false }` only | `name`, `price`, `category_id` (missing → 400) |
| Delete | `DELETE /products/:id` | — (id in URL) | — |

All calls go through `api` (the shared Axios instance at `fe/src/lib/api-client.ts`). The request
interceptor injects `Authorization: Bearer <token>` from `useAuthStore` automatically.

### D. BE → FE: What comes back

| Endpoint | Response | FE action |
|---|---|---|
| `POST /files/upload` | `201 { data: { id, object_path } }` | store `object_path` in modal local state → send on form submit |
| `POST /products` | `201 { data: { id } }` | invalidate `['admin','products']`, toast, close modal |
| `PATCH /products/:id` | `200 { message }` | invalidate `['admin','products']`, toast, close modal |
| `PATCH /products/:id/availability` | **400 INVALID_INPUT** | `onError` toast "Không thể cập nhật trạng thái" |
| `DELETE /products/:id` | `204 No Content` | invalidate `['admin','products']`, toast success |

There is no SSE or WS on this page. All feedback is one-shot HTTP.

### E. Loading + Caching

Full loading state detail → [admin_products_loading.md](admin_products_loading.md). Key points for
this scenario:

- **Initial table load:** `isLoading` from `useQuery(['admin','products'])` drives
  `ProductsTable`'s `"Đang tải..."` text (`ProductsTable.tsx:18`). No skeleton — plain text.
- **`staleTime: 30_000`** (`page.tsx:25`) — the admin table is considered fresh for 30 s after a
  load. Writes always immediately trigger `invalidateQueries`, so the post-write refetch is not
  gated by `staleTime`.
- **`staleTime: 60_000`** for categories and toppings inside the modal (`ProductFormModal.tsx:42-48`)
  — these are rarely edited, so a 1-minute cache is acceptable.
- **Admin table is uncached on BE:** `GET /products/all` bypasses the `products:list` Redis key
  (`product_service.go:194` — no cache hit, goes straight to `ListProducts` SQL). This is by design:
  managers see writes immediately. The tradeoff is an N+1 topping query per product on every load.
- **Image upload is decoupled:** the 201 from `POST /files/upload` updates local modal state
  (`imagePath`, `imagePreview`) instantly; it does not invalidate any TanStack Query key. The orphan
  `is_orphan=1` DB row is cleaned up only if the product is never saved (no automated cleanup exists
  — ❓ UNVERIFIED: whether a background job purges orphan file rows).

### F. Monitoring

The four CRUD requests in this scenario are observable on Grafana (`:3001`, "BanhCuon — API
Monitoring") as four spikes in the Request Rate panel. The image upload (`POST /files/upload`) is
the heaviest — a 10 MB file saturates the 500 ms `SlowResponseTime` alert threshold if disk I/O is
slow. The 400 from the availability toggle appears as a non-5xx response, so it does **not** trigger
the `HighErrorRate` alert (5xx > 5%) — it fails silently from the monitoring perspective.

Triage path if a create fails in production:
`Grafana panels → Container Logs (Loki) → docker compose logs -f be` → check for
`ShouldBindJSON failed` or `invalidateProductCaches` Redis errors.

---

## Putting A–F on One Timeline (Chị Hương's full morning)

```
09:12 Chị Hương opens /admin/products
  → useQuery(['admin','products'])
  → GET /products/all (uncached, N+1 toppings) → table renders      (E: loading)

09:15 clicks "+ Thêm sản phẩm"
  → ProductFormModal mounts (dynamic import, mode='add')             (A: modal opens)
  → useQuery(['categories']) + useQuery(['admin','toppings']) warm   (E: staleTime 60s)
  → picks image → POST /files/upload (multipart) → object_path saved (C: upload)
  → fills form → submit → POST /products (manager+)                  (C: create)
  → 201 → invalidateQueries(['admin','products']) → table refetches  (D: response)
  → BE: DEL products:list, categories:list from Redis                (B: cross-page)
  → customer /menu next fetch picks up new dish (within 5 min)       (B: propagation)

09:22 clicks "Sửa" on Bánh cuốn nhân thịt
  → ProductFormModal opens mode='edit', reset() pre-fills fields     (A: edit modal)
  → changes price 40k → 45k → submit → PATCH /products/:id          (C: update)
  → 200 → invalidate → table refetches                               (D: response)
  → existing order_items.unit_price untouched (price snapshot rule)  (B: isolation)

09:28 clicks "Đang bán" badge on Bánh cuốn chay
  → toggleMut.mutate({ id, is_available: false })                    (C: toggle)
  → PATCH /products/:id/availability { is_available: false }
  → BE: ShouldBindJSON fails (name/price/category_id missing)
  → 400 INVALID_INPUT                                                 (D: error)
  → onError toast "Không thể cập nhật trạng thái"                   (A: toast only)
  → badge stays green "Đang bán"   ← BUG #1

09:35 Admin Anh Đức clicks "Xóa" on Canh chua
  → confirm dialog → deleteMut.mutate(id)                            (A: confirm)
  → DELETE /products/:id (admin+ only)                               (C: delete)
  → SoftDeleteProduct: UPDATE SET deleted_at = NOW() (no order guard)(D: 204)
  → invalidate → table refetches → row gone                          (A: table)
  → BE: DEL caches → /menu & /pos see change on next fetch           (B: cross-page)
```

---

## The One-Line Mental Model

> The admin Products page is a **manager-gated catalogue editor**: add/edit is always-on (manager+),
> delete is admin-only, but **availability toggle is silently broken** — the badge clicks, the 400
> fires, and the dish keeps selling until the BE bug is fixed.

---

## Flags Surfaced by This Scenario

| # | Flag | Beat | Detail |
|---|---|---|---|
| 1 | **Availability toggle is a no-op (400)** | Beat 3 | `PATCH /availability` reuses `UpdateProduct` handler; `{is_available}`-only body fails required-field validation. `ToggleProductAvailability` query exists but unwired. → [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #1 |
| 2 | **New products always created `is_available=1`** | Beat 1 | `CreateProductInput` never sends `is_available`; sqlc INSERT hardcodes it. Latent — no FE exposure yet. → [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #2 |
| 3 | **DELETE has no active-order guard (dead FE 409 branch)** | Beat 4 | FE handles 409 "Sản phẩm đang có đơn hàng", but BE never emits it. A live-order product can be soft-deleted. → [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) #3 |
| 4 | **Image bytes silently dropped if `STORAGE_BASE_PATH` unset** | Beat 1 | Orphan DB row written; file not persisted; `image_path` points at nothing. → [admin_products_be.md Flag 6](admin_products_be.md#flags) |
| 5 | **No realtime push for catalogue changes** | B section | Customer `/menu` and `/pos` see new/deleted products only after their next HTTP fetch (within 5 min after Redis DEL). → [admin_products_crosspage_dataflow.md](admin_products_crosspage_dataflow.md) |
| 6 | ❓ UNVERIFIED | E section | Whether a background job purges `is_orphan=1` file rows whose parent product was never saved — not found in the codebase scan. |
