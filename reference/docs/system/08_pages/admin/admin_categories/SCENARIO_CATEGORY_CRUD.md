# Scenario — Chị Hoa Reorganises the Menu (Category CRUD End-to-End)

> **What this is:** one concrete run through `/admin/categories` — a manager creates a new category,
> renames an existing one, hits the silent 403 delete bug, and later (as admin) correctly deletes an
> empty seasonal category and gets blocked on a non-empty one. End-to-end: form → wire → BE → Redis
> invalidation → customer `/menu` CategoryTabs. All beats traced from source on branch
> `experience_claude.md_system_1`.
>
> **Status:** ✅ implemented (page) · 🔴 Bug 1 (manager 403 silent) — see
> [CATEGORIES_BUGS.md](CATEGORIES_BUGS.md).
>
> **Sources:**
> `fe/src/app/(dashboard)/admin/categories/page.tsx` ·
> `fe/src/features/admin/admin.api.ts:5-17` ·
> `be/internal/handler/product_handler.go:166-248` ·
> `be/internal/service/product_service.go:341-427,709-717` ·
> `be/internal/repository/product_repo.go:107-142` ·
> `be/internal/db/products.sql.go:23-36,306-310,623-632,678-692` ·
> `be/cmd/server/main.go:184-197`
>
> **Siblings:**
> [admin_categories.md](admin_categories.md) ·
> [admin_categories_be.md](admin_categories_be.md) ·
> [admin_categories_crosspage_dataflow.md](admin_categories_crosspage_dataflow.md) ·
> [admin_categories_loading.md](admin_categories_loading.md) ·
> [CATEGORIES_BUGS.md](CATEGORIES_BUGS.md)

---

## The cast

| Who | Role | JWT claim | Access |
|---|---|---|---|
| **Chị Hoa** | Manager | `role: "manager"` | Reaches `/admin/categories`; POST + PATCH allowed; DELETE → 403 |
| **Anh Tuấn** (owner) | Admin | `role: "admin"` | Full CRUD including DELETE |
| **Guest** (customer) | — | guest JWT | Reads categories via `/menu` CategoryTabs (public GET) |

---

## Setting

The restaurant opens at **10:00**. Chị Hoa arrives at **09:30** to reorganise the menu taxonomy
before the first scan of the day. She opens `http://localhost:3000/admin/categories` on her laptop.
The page is behind the admin shell (minimum role: manager, confirmed by the shell guard —
❓ UNVERIFIED shell guard role checked in layout; not traced to a line in this file).

---

## Minute-by-minute timeline

### 09:30 — Page loads · `GET /categories`

Chị Hoa opens `/admin/categories`. The page mounts and immediately fires:

```
useQuery({ queryKey: ['admin','categories'], queryFn: listCategories, staleTime: 60_000 })
          ↓
api.get('/categories')          // admin.api.ts:7-8
          ↓
GET /api/v1/categories          // no auth header needed — route is public (main.go:186)
```

**Handler** `ListCategories` (`product_handler.go:169`):

1. Service `ListCategories` (`product_service.go:344`): calls `getCacheJSON("categories:list")`.
2. Cache **hit** (another page fetched it within the 5-min TTL) → unmarshals and returns the JSON
   array directly; no DB query.
3. Handler serialises each row to `gin.H{id, name, description, sort_order, is_active}`
   (`product_handler.go:181-187`) → `200 {"data":[…]}`.

**FE receives** `r.data?.data` (`admin.api.ts:8`); TanStack Query stores it under
`['admin','categories']`; `staleTime: 60_000` (`page.tsx:25`) means no re-fetch for 60 s.

While `isLoading` is true, the page renders the loading branch:

```tsx
{isLoading ? (
  <p className="text-gray-500 text-sm">Đang tải...</p>   // page.tsx:97
```

Once `isLoading` becomes false, the table renders. Chị Hoa sees four rows:

| Tên danh mục | Thứ tự |
|---|---|
| Bánh cuốn | 1 |
| Canh | 2 |
| Đồ uống | 3 |
| Combo | 4 |

Rows are **client-sorted** by `sort_order` ASC in the browser (`page.tsx:119`):

```tsx
{[...categories].sort((a, b) => a.sort_order - b.sort_order).map(c => (
```

---

### 09:32 — Create "Món chay" · `POST /categories`

Chị Hoa clicks **+ Thêm danh mục**. `openAdd()` fires (`page.tsx:32-36`):

```ts
reset({ name: '', sort_order: 0 })
setEditItem(null)
setShowModal(true)
```

The modal opens titled **"Thêm danh mục"**. She types `Món chay` in the name field and sets
sort_order to `5`. She clicks **Lưu**.

**Zod validation** runs first (`schema`, `page.tsx:11-14`):

```ts
z.object({
  name:       z.string().min(1, 'Nhập tên danh mục').max(100),   // passes: "Món chay"
  sort_order: z.coerce.number().int().default(0),                 // passes: 5
})
```

Validation passes → `saveMut.mutate({ name: 'Món chay', sort_order: 5 })` (`page.tsx:161`).

**C — FE → BE payload:**

```jsonc
POST /api/v1/categories
Authorization: Bearer <manager JWT>   // request interceptor, api-client.ts
Content-Type: application/json
{ "name": "Món chay", "sort_order": 5 }
```

Note: `description` is **never sent** (`admin.api.ts:10`; `page.tsx:11-14` — schema has only
`name` + `sort_order`). The BE will insert `description = NULL`.

**BE path:**

1. **Handler** `CreateCategory` (`product_handler.go:199`): `c.ShouldBindJSON(&createCategoryRequest)`
   (`product_handler.go:192-196`) — `name` required, passes. Calls `svc.CreateCategory`.
2. **Service** `product_service.go:365`: `GetCategoryByName("Món chay")` via raw SQL
   (`product_repo.go:119-126`) — no existing row found, no conflict.
3. Mints UUID via `newUUID()`. Maps `description=""` → NULL. Calls `repo.CreateCategory`.
4. **SQL** `products.sql.go:23-26`:
   `INSERT INTO categories (id,name,description,sort_order,is_active) VALUES (?,?,?,?,1)`
   — `is_active` hard-coded to `1`.
5. `invalidateProductCaches(ctx,"")` (`product_service.go:709-717`): `DEL products:list` + `DEL categories:list`.
6. Handler returns `201 {"data":{"id":"<new-uuid>"}}` (`product_handler.go:214`).

**D — BE → FE response:** `saveMut.onSuccess` fires (`page.tsx:48-51`):

```ts
qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
toast.success('Đã thêm danh mục')
setShowModal(false)
```

`invalidateQueries` marks the `['admin','categories']` query stale → triggers an immediate
re-fetch → the table reloads with "Món chay" at the bottom.

---

### 09:35 — Rename "Canh" → "Canh / Súp" · `PATCH /categories/:id`

Chị Hoa clicks **Sửa** on the "Canh" row. `openEdit(c)` fires (`page.tsx:37-41`):

```ts
reset({ name: c.name, sort_order: c.sort_order })   // prefills form
setEditItem(c)
setShowModal(true)
```

The modal opens titled **"Sửa danh mục"**, pre-filled with `name="Canh"`, `sort_order=2`.
She changes the name to `Canh / Súp` and clicks **Lưu**.

Zod validates → `saveMut.mutate({ name: 'Canh / Súp', sort_order: 2 })`.

Because `editItem !== null`, the mutation calls `updateCategory(editItem.id, values)` (`page.tsx:46`):

**C — FE → BE payload:**

```jsonc
PATCH /api/v1/categories/<canh-uuid>
Authorization: Bearer <manager JWT>
{ "name": "Canh / Súp", "sort_order": 2 }
```

**BE path:**

1. **Handler** `UpdateCategory` (`product_handler.go:224`): binds `updateCategoryRequest{name, description, sort_order}` (`:217-221`). Note: handler doc-comment incorrectly says "PUT" (`:223`) — actual route is PATCH (`main.go:191`). Stale comment, behaviour correct (admin_categories_be.md Flag 5).
2. **Service** `product_service.go:387`: `GetCategoryByID(<canh-uuid>)` — found.
3. `GetCategoryByName("Canh / Súp")` excluding self — no conflict (new name is unique).
4. `repo.UpdateCategory` → SQL (`products.sql.go:678-682`):
   `UPDATE categories SET name=?, description=?, sort_order=?, updated_at=NOW() WHERE id=? AND deleted_at IS NULL`
   Full replace: `description` is rewritten to NULL because the FE never sends it (admin_categories_be.md Flag 3).
5. `invalidateProductCaches(ctx,"")` → `DEL products:list` + `DEL categories:list`.
6. Returns `200 {"message":"Cập nhật danh mục thành công"}`.

**D — BE → FE:** `saveMut.onSuccess` → `invalidateQueries(['admin','categories'])` + toast
`'Đã cập nhật danh mục'` + `setShowModal(false)`. Table refreshes; "Canh / Súp" appears.

---

### 09:38 — Chị Hoa tries to delete "Mùa hè đặc biệt" (empty seasonal) · **Bug 1 fires**

Last month, someone created a seasonal category "Mùa hè đặc biệt" that no longer has products.
Chị Hoa clicks **Xóa** next to it. The browser's native `confirm()` fires (`page.tsx:80`):

```ts
if (!confirm(`Xóa danh mục "Mùa hè đặc biệt"?`)) return
```

She clicks OK → `deleteMut.mutate(id)` (`page.tsx:81`).

**C — FE → BE payload:**

```
DELETE /api/v1/categories/<seasonal-uuid>
Authorization: Bearer <manager JWT>
(no body — id is in the URL path only)
```

**BE path:** the route `DELETE /categories/:id` is registered under a sub-group with
`authMW, middleware.AtLeast("admin")` (`main.go:194-196`). Chị Hoa's JWT has `role:"manager"`.
`AtLeast("admin")` fails → **403 Forbidden** returned by middleware before the handler is ever reached.

**D — BE → FE (Bug 1 fires):** `deleteMut.onError` (`page.tsx:69-76`):

```ts
const status = (err as { response?: { status: number } }).response?.status
if (status === 409) {
  toast.error('Không thể xóa — danh mục đang có sản phẩm.')
} else {
  toast.error('Không thể xóa danh mục')   // ← 403 falls here — mislabelled
}
```

The `403` is not `409`, so the catch-all fires: **`toast.error('Không thể xóa danh mục')`**.

The user sees a misleading toast implying a generic failure, with no hint that the action is
forbidden due to her role. The delete button was visible and clickable because the page renders
"Xóa" for all authenticated users without a role check (`page.tsx:131-136` — no `role` guard on
the button).

**This is Bug 1 in [CATEGORIES_BUGS.md](CATEGORIES_BUGS.md).** The fix would be: hide the "Xóa"
button for `role !== "admin"`, OR change the `onError` 403 branch to show
`'Bạn không có quyền xóa danh mục'`.

---

### 09:45 — Anh Tuấn (admin) deletes the empty seasonal category · `DELETE /categories/:id` ✅

Chị Hoa calls Anh Tuấn (the owner/admin). He logs in on his own machine, navigates to
`/admin/categories`, and clicks **Xóa** on "Mùa hè đặc biệt".

`confirm()` → OK → `deleteMut.mutate("<seasonal-uuid>")`.

**C — FE → BE payload (same shape):**

```
DELETE /api/v1/categories/<seasonal-uuid>
Authorization: Bearer <admin JWT>
```

**BE path:**

1. `AtLeast("admin")` passes — `role:"admin"`.
2. **Handler** `DeleteCategory` (`product_handler.go:242`): calls `svc.DeleteCategory`.
3. **Service** `product_service.go:408`: `GetCategoryByID` → found.
4. `CountProductsByCategory("<seasonal-uuid>")` → raw SQL (`product_repo.go:128-134`):
   `SELECT COUNT(*) FROM products WHERE category_id = ? AND deleted_at IS NULL` → **0** products.
5. `SoftDeleteCategory` → SQL (`products.sql.go:623-626`):
   `UPDATE categories SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL`.
6. `invalidateProductCaches(ctx,"")` → `DEL products:list` + `DEL categories:list`.
7. Handler: `c.Status(http.StatusNoContent)` (`product_handler.go:247`) → **204 No Content** (empty body).

**D — BE → FE:** `deleteMut.onSuccess` (`page.tsx:65-68`):

```ts
qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
toast.success('Đã xóa danh mục')
```

Table refreshes; "Mùa hè đặc biệt" is gone.

---

### 09:48 — Anh Tuấn tries to delete "Bánh cuốn" (has products) · 409 `CATEGORY_HAS_PRODUCTS`

Anh Tuấn mistakenly clicks **Xóa** on "Bánh cuốn" — the main product category.

Same flow → `DELETE /categories/<banh-cuon-uuid>`.

**BE path:**

1. `AtLeast("admin")` passes.
2. `GetCategoryByID` → found.
3. `CountProductsByCategory` → returns **12** (twelve products reference this category).
4. Service returns `ErrCategoryHasProducts` (`product_service.go:421`) → handler calls
   `handleServiceError` → `respondError(c, http.StatusConflict, "CATEGORY_HAS_PRODUCTS",
   "Không thể xóa — danh mục đang có sản phẩm.")`.
5. **409 Conflict** returned.

**D — BE → FE:** `deleteMut.onError`, `status === 409` branch fires (`page.tsx:71-73`):

```ts
toast.error('Không thể xóa — danh mục đang có sản phẩm.')
```

Anh Tuấn sees the correct, specific toast. The category stays.

---

### 10:00 — The new "Món chay" category appears on customer `/menu`

A customer scans Bàn 03 QR and opens `/menu`. The FE calls `GET /categories` (public). The Redis
key `categories:list` was `DEL`'d by Chị Hoa's earlier create + rename writes. The first cache-miss
hits MySQL → returns the fresh list including "Món chay" (sort_order=5) → backfills Redis for 5 min.

The customer's `CategoryTabs` component now shows a "Món chay" tab — without any page reload or
staff intervention. The cross-page propagation path:

```
PATCH / POST write
  → invalidateProductCaches(ctx,"")                   product_service.go:709-717
  → DEL categories:list (Redis)
  → next GET /categories cache-miss → MySQL
  → fresh list served
  → /menu CategoryTabs re-reads on next staleTime expiry (customer-side)
```

See [admin_categories_crosspage_dataflow.md](admin_categories_crosspage_dataflow.md) for the full
cross-page fan-out (also affects `/pos` CategoryTabs and `/admin/products` category dropdown).

---

## Under the hood

### A — Cross-component data flow

**N/A for this page.** `page.tsx` is a **single client component** — it owns all state in local
`useState` (modal open/closed, editItem) and a single RHF instance. There are no sub-components or
shared widgets that need to exchange data via store. Cross-component coordination simply does not
exist here. See [admin_categories.md §Zones](admin_categories.md) for the flat component structure.

No `admin_categories_crosscomponent_dataflow.md` was created (PAGE_FOLDER_GUIDE §1 table, column
"Required?" — only needed when the page has ≥3 interacting widgets with a shared store; this page
has zero shared widgets).

### B — Cross-page data flow

Every category write (`POST`, `PATCH`, `DELETE`) calls
`invalidateProductCaches(ctx,"")` (`product_service.go:709-717`), which `DEL`s:

- `products:list` (string key, Redis)
- `categories:list` (string key, Redis)

Pages that read `GET /categories` and will see the change on their next fetch:

| Downstream page | Component that re-reads | Trigger |
|---|---|---|
| `/menu` (customer) | `CategoryTabs` | TanStack Query staleTime expiry or refocus |
| `/pos` (cashier) | `CategoryTabs` | same |
| `/admin/products` | category dropdown in create/edit modal | `invalidateQueries(['admin','products'])` ❓ UNVERIFIED — the products page may or may not re-fetch categories independently |

No realtime push. Pages learn of category changes only on their next cache fill after the Redis key
is gone. Worst-case lag: customer page staleTime (❓ UNVERIFIED — not traced for the menu page in
this doc) + Redis TTL 5 min.

Full analysis: [admin_categories_crosspage_dataflow.md](admin_categories_crosspage_dataflow.md).

### C — FE → BE send (exact payloads)

| Action | Method + path | Request body | Notes |
|---|---|---|---|
| List | `GET /categories` | — | No auth header; public |
| Create | `POST /categories` | `{"name":"Món chay","sort_order":5}` | No `description` — FE schema never includes it (`page.tsx:11-14`, `admin.api.ts:10`) |
| Update | `PATCH /categories/<id>` | `{"name":"Canh / Súp","sort_order":2}` | Same shape as create; `description` omitted → BE stores NULL |
| Delete | `DELETE /categories/<id>` | — | id in URL path only; no body |

The form Zod schema (`page.tsx:11-14`) has only `name` and `sort_order`. `description` and
`is_active` are never sent. Every `id` is a CHAR(36) UUID string — never a number.

### D — BE → FE receive / live updates

No realtime (no SSE, no WebSocket) on this page. Category data is not pushed.

| Action | Response | FE reaction |
|---|---|---|
| `GET /categories` | `200 {"data":[…]}` | TanStack Query populates table |
| `POST /categories` | `201 {"data":{"id":"<uuid>"}}` | `onSuccess` → `invalidateQueries` → list re-fetches |
| `PATCH /categories/:id` | `200 {"message":"Cập nhật danh mục thành công"}` | same |
| `DELETE /categories/:id` | `204 No Content` (empty body) | same |

After every write the table refreshes from a fresh `GET /categories` — the new/updated/deleted row
appears within the time of one round-trip request.

### E — Loading + caching

**Loading state:**

While the initial `GET /categories` is in flight, the page renders:

```tsx
<p className="text-gray-500 text-sm">Đang tải...</p>   // page.tsx:97
```

No skeleton, no spinner component — plain text. Tracked in
[admin_categories_loading.md](admin_categories_loading.md).

**Caching layers:**

| Layer | Key | TTL | Notes |
|---|---|---|---|
| TanStack Query (browser) | `['admin','categories']` | `staleTime: 60_000` (60 s) | `page.tsx:25` |
| Redis (BE) | `categories:list` | 5 min (`productCacheTTL`, `product_service.go:21`) | cache-aside; invalidated on every write |

A category write `DEL`s the Redis key immediately. The browser's TanStack Query entry is
invalidated by `qc.invalidateQueries` in `onSuccess` — triggering a re-fetch that hits the BE
(and re-fills Redis). Next page load within 60 s serves from browser cache; next load within 5 min
serves from Redis. See [admin_categories_loading.md](admin_categories_loading.md) for the full
loading-state tree.

### F — Monitoring

**Errors worth monitoring in this scenario:**

| Beat | HTTP status | Log/metric |
|---|---|---|
| Manager delete → 403 | `403 Forbidden` (middleware short-circuit) | ❓ UNVERIFIED — middleware 403 may or may not be recorded by the metrics middleware (`be/internal/middleware/`); no line traced confirming it appears in Prometheus `http_requests_total{status="403"}` |
| Delete with products → 409 `CATEGORY_HAS_PRODUCTS` | `409 Conflict` | ❓ UNVERIFIED — `respondError` is called but whether the metrics middleware captures 4xx by code was not traced to a line |
| Duplicate name → 409 `DUPLICATE_NAME` | `409 Conflict` | ❓ UNVERIFIED — same |
| Redis `DEL` failure after write | — | logged as `slog.Warn` and swallowed (`product_service.go:709-717`); write still succeeds; no metric emitted ❓ UNVERIFIED |

The monitoring stack (Prometheus `:9090` + Grafana `:3001`) ships in `docker-compose.yml`. The two
active alerts are `HighErrorRate` (5xx > 5% over 5 min) and `SlowResponseTime` (p95 > 500 ms). A
burst of 403s from a confused manager would not trigger `HighErrorRate` (that alert targets 5xx
only). See [../../09_devops/MONITORING.md](../../09_devops/MONITORING.md) for the full config.

---

## One-line mental model

> The admin categories page is a **pure CRUD manager** where the list and form live in a single
> component, writes propagate to the public catalog via Redis cache invalidation, and the only
> surprise is that the delete button is visible to managers but the endpoint is admin-only — a
> mislabelled 403 is the only feedback they get.

---

## Flags surfaced by this scenario

| # | Flag | Detail | Severity |
|---|---|---|---|
| 1 | **Bug 1 — manager sees "Xóa" but DELETE is admin-only → silent 403** | `page.tsx:131-136` renders button unconditionally; `onError` 403 falls to catch-all `'Không thể xóa danh mục'`. See [CATEGORIES_BUGS.md](CATEGORIES_BUGS.md). | 🟠 |
| 2 | **`description` never sent; PATCH re-writes it to NULL** | FE schema has only `name`+`sort_order` (`page.tsx:11-14`); SQL is a full replace (`products.sql.go:678-682`). Harmless today (no surface reads `description`). | low |
| 3 | **Delete guard counts products only, not combos** | `CountProductsByCategory` (`product_repo.go:128-134`) checks `products.category_id`; a category used only by combos can still be soft-deleted, leaving `combos.category_id` dangling. | low |
| 4 | **403 and 409 not confirmed in Prometheus metrics** | Whether metrics middleware records 4xx by code is ❓ UNVERIFIED — not traced to a source line in this scenario. | ❓ UNVERIFIED |
| 5 | **Customer `/menu` staleTime for categories not traced here** | The lag between a write and the customer seeing the new category depends on the menu page's own `staleTime` for `GET /categories` — not verified in this file. | ❓ UNVERIFIED |
