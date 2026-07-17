# Scenario — A Manager's Topping Day (Add · Edit · Toggle · Delete)

> **TL;DR:** ✅ implemented · A concrete run through the four CRUD flows on `/admin/toppings`:
> Chị Lan adds a new topping "Trứng ốp la" (₫15,000), edits an existing topping's price, toggles one
> topping to "Hết" via the edit modal (the table has no inline toggle), and an admin soft-deletes an
> unused topping. Every beat is grounded in the BE anchor
> ([admin_toppings_be.md](admin_toppings_be.md)) and traced to the real FE source.
>
> **No `_crosscomponent_dataflow.md` exists for this page** — widget coordination is intentionally
> thin (local `useState` + props + one shared TanStack Query key), which does not meet the ≥3
> interacting widgets + shared store threshold (§1 table, PAGE_FOLDER_GUIDE.md §1). See section A.
>
> **Siblings:** [admin_toppings.md](admin_toppings.md) · [admin_toppings_be.md](admin_toppings_be.md) ·
> [admin_toppings_crosspage_dataflow.md](admin_toppings_crosspage_dataflow.md) ·
> [admin_toppings_loading.md](admin_toppings_loading.md)

---

## The Cast

| Who | Role | What they do today |
|---|---|---|
| **Chị Lan** | `manager` | Adds "Trứng ốp la", edits a price, toggles a topping to "Hết" |
| **Anh Đức** | `admin` | Deletes an unused topping that no product references |

## The Setting

A Wednesday morning before the lunch rush. The kitchen just started serving fried eggs as a topping
option. **"Trứng ốp la"** (fried egg) will cost ₫15,000. Meanwhile, an old topping is overpriced and
needs a trim, another topping needs to be marked temporarily unavailable ("Hết"), and one unused
topping from a failed experiment is being cleaned up by the admin.

---

## The Timeline

### 09:05 — Chị Lan opens the Toppings page

Chị Lan logs in as `manager` and navigates to `/admin/toppings`. The page shell renders in two
parallel queries:

```
// page.tsx:19-23
useQuery(['admin', 'toppings'], listToppings, { staleTime: 60_000 })
  → GET /api/v1/toppings          (public — no auth required, main.go:201)

// page.tsx:25-29
useQuery(['admin', 'products'], listProducts, { staleTime: 60_000 })
  → GET /api/v1/products/all      (manager+, main.go:173)
```

The **toppings query** hits the Redis `toppings:list` key (5-min TTL,
`product_service.go:432-445`). If warm, it returns in milliseconds; if cold, it falls through to
`SELECT * FROM toppings WHERE deleted_at IS NULL ORDER BY name ASC`
(`products.sql:64-67`) and backfills the cache.

The **products query** is **uncached** every time (`product_service.go:194-209` — no Redis read).
It calls `repo.ListProducts` then resolves toppings for **each product individually** (N+1 via
`GetToppingsByProductID`). The page uses the product data only to build the
`productNames: Map<string, string[]>` lookup (`page.tsx:31-41`) that powers the
"Áp dụng cho sản phẩm" chips in each topping row (`ToppingTable.tsx:41-51`).

While toppings are still loading, `ToppingTable` renders the plain text guard:

```tsx
// ToppingTable.tsx:15-17
if (isLoading) {
  return <p className="text-muted-fg text-sm">Đang tải...</p>
}
```

There is **no loading guard on the products query** — the "Áp dụng cho sản phẩm" column flashes
"Chưa gắn sản phẩm" (`ToppingTable.tsx:57`) on every product chip until `products` resolves.
Detail → [admin_toppings_loading.md](admin_toppings_loading.md).

Once both queries resolve, `ToppingPageHeader` shows the count (`ToppingPageHeader.tsx:8`) and
the table fills with rows: **Tên topping · Áp dụng cho sản phẩm · Giá thêm · Trạng thái · actions**.

---

### 09:08 — Beat 1: Add "Trứng ốp la" (₫15,000)

Chị Lan clicks **"+ Thêm topping"** in `ToppingPageHeader` (`ToppingPageHeader.tsx:10-17`).

In `page.tsx`, `openAdd` fires (`page.tsx:61-64`):

```ts
// page.tsx:61-64
const openAdd = () => {
  setEditTopping(null)   // no existing topping — create mode
  setShowModal(true)
}
```

`ToppingFormModal` is `next/dynamic` code-split (`page.tsx:10-12`) — it loads lazily on first
open. The modal mounts in **add mode** (`isEdit = !!topping = false`). Its `useEffect` fires on
`open=true, topping=null` and resets the form to defaults (`ToppingFormModal.tsx:33-40`):

```ts
// ToppingFormModal.tsx:33-40
useEffect(() => {
  if (!open) return
  if (topping) {
    reset({ name: topping.name, price: topping.price, isAvailable: topping.is_available })
  } else {
    reset({ name: '', price: 0, isAvailable: true })   // add mode defaults
  }
}, [open, topping, reset])
```

Chị Lan fills in:

| Field | Value |
|---|---|
| Tên topping | "Trứng ốp la" |
| Giá thêm | 15000 |
| Trạng thái toggle | stays ON (green, "Có sẵn") |

Zod validates on submit (`ToppingFormModal.tsx:11-15`): `name` must be non-empty + ≤100 chars,
`price` must be `≥ 0` (a ₫0 topping is valid — "Miễn phí"). She clicks **"Lưu topping"**.

`saveMut` fires (`ToppingFormModal.tsx:44-62`). Because `isEdit = false`, the branch calls
`createTopping`:

```ts
// ToppingFormModal.tsx:46-48
mutationFn: (values: FormValues) =>
  isEdit && topping
    ? updateTopping(topping.id, { name: values.name, price: values.price, is_available: values.isAvailable })
    : createTopping({ name: values.name, price: values.price })
```

Note: **`isAvailable` is NOT sent in the create body** — `createTopping` takes only `{name, price}`
(`admin.api.ts:59`). The BE hardcodes `is_available = 1` in the INSERT:

```sql
-- products.sql:79-81 (via admin_toppings_be.md §3)
INSERT INTO toppings (id, name, price, is_available) VALUES (?, ?, ?, 1)
```

The modal's status toggle is **ignored on create**; it only matters on edit.

**Wire:** `POST /api/v1/toppings` with `Authorization: Bearer <manager JWT>`:

```json
{ "name": "Trứng ốp la", "price": 15000 }
```

BE handler `CreateTopping` (`product_handler.go:277`) binds and validates (name required,
price ≥ 0), mints a UUID, inserts the row, then calls `invalidateToppingCaches`
(`product_service.go:719-721`) → `DEL toppings:list, products:list` from Redis.

**Response:** `201 { "data": { "id": "<new-uuid>" } }` (`product_handler.go:288`).

`onSuccess` in the modal (`ToppingFormModal.tsx:49-52`):

```ts
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['admin', 'toppings'] })
  toast.success('Đã thêm topping')
  onClose()
}
```

The `['admin','toppings']` query refetches (`GET /toppings` — cache was DEL'd by BE, so this is a
fresh MySQL read). The new "Trứng ốp la" row appears in the table. Chị Lan sees the
sonner toast "Đã thêm topping" at the bottom of the screen.

> **Note on duplicate names:** The modal maps a `409` response to a field error "Tên topping đã
> tồn tại" (`ToppingFormModal.tsx:56-57`). However, `toppings.name` has **no unique constraint**
> in the DB (`002_products.sql:41-52`) and `CreateTopping` does no duplicate check — duplicate
> names insert silently as separate rows. The 409 branch is currently **unreachable**.
> ([admin_toppings_be.md Flag 4](admin_toppings_be.md#flags))

---

### 09:14 — Beat 2: Edit an existing topping's price

Chị Lan notices "Nhân thịt" is listed at ₫0 (free) but the kitchen now charges ₫2,000 for extra
meat. She clicks **"Sửa"** on that row.

In `ToppingTable`, the edit button calls `onEdit(t)` (`ToppingTable.tsx:73`). In `page.tsx`,
`openEdit` fires (`page.tsx:66-69`):

```ts
// page.tsx:66-69
const openEdit = (t: Topping) => {
  setEditTopping(t)
  setShowModal(true)
}
```

`ToppingFormModal` mounts (or re-opens) with `topping = <Nhân thịt object>`. The `useEffect`
fires and pre-fills the form:

```ts
reset({ name: "Nhân thịt", price: 0, isAvailable: true })
```

Chị Lan changes `price` from `0` to `2000` and leaves the toggle green. She clicks "Lưu topping".

`saveMut` branches to `updateTopping` (`ToppingFormModal.tsx:47`):

```ts
updateTopping(topping.id, { name: "Nhân thịt", price: 2000, is_available: true })
```

**Wire:** `PATCH /api/v1/toppings/:id` with `Authorization: Bearer <manager JWT>`:

```json
{ "name": "Nhân thịt", "price": 2000, "is_available": true }
```

BE `UpdateTopping` (`product_service.go:467-484`):
1. `GetToppingByID` — guard: missing id → `ErrNotFound` → 404.
2. `UpdateTopping` (sqlc) — updates `name` and `price`.
3. `IsAvailable != nil` → calls `UpdateToppingAvailability` (`product_repo.go:156-159`):
   `UPDATE toppings SET is_available=?, updated_at=NOW() WHERE id=? AND deleted_at IS NULL`
   (raw `ExecContext`, not sqlc — [admin_toppings_be.md Flag 1](admin_toppings_be.md#flags)).
4. `invalidateToppingCaches` → `DEL toppings:list, products:list`.

**Response:** `200 { "message": "Cập nhật topping thành công" }`.

`onSuccess`: invalidates `['admin','toppings']`, toast "Đã cập nhật topping", closes modal.
The "Nhân thịt" row now shows "+2.000đ" in the price column.

> **Price isolation:** existing `order_items.toppings_snapshot` rows that recorded "Nhân thịt" at
> ₫0 are **not rewritten** — the snapshot is frozen at order time (BUSINESS_RULES §2). Past orders
> keep their ₫0 price. Only new orders going forward will see ₫2,000.

---

### 09:20 — Beat 3: Toggle "Hành phi" to "Hết"

The kitchen has run out of crispy shallots. Chị Lan wants to mark "Hành phi" as "Hết"
(unavailable) so it no longer appears selectable on the customer menu.

**There is no inline toggle in `ToppingTable`.** The `Trạng thái` column renders a
non-clickable `<Badge>` (`ToppingTable.tsx:65-68`):

```tsx
<Badge variant={t.is_available ? 'success' : 'muted'}>
  {t.is_available ? 'Có sẵn' : 'Hết'}
</Badge>
```

Unlike the Products page (`ProductsTable.tsx:87-93` — which has an `onClick` on its badge,
though that path is broken), the Toppings table badge has **no `onClick`**. To change availability,
a manager must click **"Sửa"** and use the toggle inside `ToppingFormModal`.

Chị Lan clicks **"Sửa"** on "Hành phi". The modal pre-fills with `isAvailable: true`. She
clicks the toggle button (`ToppingFormModal.tsx:101-111`) — it flips the `isAvailable` field value
from `true` to `false` via `setValue('isAvailable', !isAvailable)`. The toggle turns grey with label
"Hết".

She clicks "Lưu topping". `saveMut` sends:

```json
{ "name": "Hành phi", "price": 0, "is_available": false }
```

BE runs the same `PATCH /toppings/:id` path as Beat 2. The `IsAvailable` pointer is non-nil
(`false`), so `UpdateToppingAvailability` fires:

```sql
UPDATE toppings SET is_available=0, updated_at=NOW() WHERE id=? AND deleted_at IS NULL
```

`invalidateToppingCaches` DELs `toppings:list` + `products:list`. However, **`product:<id>` keys
are NOT invalidated** ([admin_toppings_be.md Flag 2](admin_toppings_be.md#flags)). This means:

- Customer `/menu` (C1) and `/pos` (S4) — both call `GET /products` which reads `products:list`,
  which was just DEL'd → next fetch goes to MySQL → sees `is_available=0` on "Hành phi" → topping
  no longer offered in those flows.
- But the customer **product-detail** page (`/menu/product/:id`, C4) reads `product:<id>` cache,
  which was NOT invalidated. It may serve stale data (showing "Hành phi" as selectable) for up to
  5 minutes after this edit. → [admin_toppings_crosspage_dataflow.md](admin_toppings_crosspage_dataflow.md).

Back in the admin table: `onSuccess` invalidates `['admin','toppings']`, which refetches
`GET /toppings` (public, cache miss → MySQL → sees `is_available=0`). The "Hành phi" row badge
flips to grey "Hết". Toast: "Đã cập nhật topping".

---

### 09:28 — Beat 4: Admin Anh Đức deletes an unused topping

An old experiment topping "Bơ lạc" is not attached to any product and has never been used in an
order. Chị Lan cannot delete it — **DELETE is admin-only** (`DELETE /toppings/:id` is in the
`atopR` group with `AtLeast("admin")`, `main.go:208-211`). A manager request would return 403.

Anh Đức (role `admin`) opens `/admin/toppings`. He sees "Bơ lạc" with
`productNames.get(t.id) = []` — the "Áp dụng cho sản phẩm" column shows "Chưa gắn sản phẩm".

He clicks **"Xóa"**. In `page.tsx`, `handleDelete` fires (`page.tsx:52-59`):

```ts
// page.tsx:52-59
const handleDelete = (t: Topping) => {
  const linked = productNames.get(t.id) ?? []
  const warning = linked.length > 0
    ? ` Topping này đang áp dụng cho ${linked.length} sản phẩm. Xóa sẽ gỡ liên kết.`
    : ''
  if (!confirm(`Xóa topping "${t.name}"?${warning}`)) return
  deleteMut.mutate(t.id)
}
```

Because `linked.length = 0`, the `confirm` dialog shows simply: `Xóa topping "Bơ lạc"?`

Anh Đức confirms. `deleteMut.mutate(t.id)` fires (`page.tsx:43-50`):

```ts
const deleteMut = useMutation({
  mutationFn: deleteTopping,
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['admin', 'toppings'] })
    toast.success('Đã xóa topping')
  },
  onError: () => toast.error('Xóa topping thất bại. Vui lòng thử lại.'),
})
```

**Wire:** `DELETE /api/v1/toppings/:id` with `Authorization: Bearer <admin JWT>` (no body).

BE `DeleteTopping` (`product_service.go:486-492`) calls `repo.SoftDeleteTopping` →
`UPDATE toppings SET deleted_at=NOW(), updated_at=NOW() WHERE id=? AND deleted_at IS NULL`
(`products.sql:88-91`). The row stays in MySQL but all reads filter it out by
`WHERE deleted_at IS NULL`. Then `invalidateToppingCaches` → `DEL toppings:list, products:list`.

**Response:** `204 No Content` (`product_handler.go:321`).

`onSuccess`: invalidates `['admin','toppings']` → refetch → "Bơ lạc" row disappears. Toast:
"Đã xóa topping".

> **Realism — deleting an IN-USE topping:** if Anh Đức had deleted "Nhân thịt" instead (linked to
> multiple products), the `confirm` dialog would have read:
> `Xóa topping "Nhân thịt"? Topping này đang áp dụng cho 3 sản phẩm. Xóa sẽ gỡ liên kết.`
> The BE has **no server-side guard** — the soft-delete fires unconditionally
> ([admin_toppings_be.md Flag 3](admin_toppings_be.md#flags)). The `product_toppings` junction rows
> for the soft-deleted topping remain in the DB (the `ON DELETE CASCADE` on the FK only fires on a
> **hard** delete, not a `deleted_at` soft delete). Those junction rows are harmless because every
> topping-list read joins `WHERE t.deleted_at IS NULL`, so the product's topping chip would disappear
> immediately. Past orders keep their snapshotted topping name + price in `toppings_snapshot` JSON —
> they are never rewritten (BUSINESS_RULES §2).

---

## Under the Hood

### A. Cross-Component Data Flow (one page, multiple widgets)

This page has **no `_crosscomponent_dataflow.md`** because widget coordination is thin enough to
live inline. Three widgets share data — `ToppingPageHeader`, `ToppingTable`, and
`ToppingFormModal` — but they do so via **local `useState` + props, not a Zustand store**:

```
ToppingPageHeader
  count={toppings.length}   ─┐
  onAdd={openAdd}           ─┤                             page.tsx local state
                              │  useState(editTopping)   ──▶ ToppingFormModal.open/topping
ToppingTable                  │  useState(showModal)    ──┘
  toppings={toppings}       ─┤
  productNames={productNames}─┤  TanStack Query ['admin','toppings']
  onEdit={openEdit}         ─┤    ── refetch on every write invalidation
  onDelete={handleDelete}   ─┘
```

- `editTopping: Topping | null` and `showModal: boolean` are `useState` on `page.tsx:16-17`.
  `openAdd()` sets `editTopping=null, showModal=true`; `openEdit(t)` sets `editTopping=t, showModal=true`.
  `closeModal()` resets both. No Zustand store is involved.
- After any write, `onSuccess` calls `qc.invalidateQueries({ queryKey: ['admin','toppings'] })`
  (`ToppingFormModal.tsx:50` for save; `page.tsx:46` for delete). This marks the shared
  `['admin','toppings']` key stale, triggering a refetch that updates `ToppingTable` and the count
  in `ToppingPageHeader`.
- The products query (`['admin','products']`) is **never invalidated by a topping write** — the
  "Áp dụng cho sản phẩm" column reflects the last fetch and only updates when that query's own
  `staleTime: 60_000` expires or the page remounts.
- `ToppingFormModal` is `next/dynamic` code-split (`page.tsx:10-12`): the JS bundle for the modal
  loads on first open, not on page load.

### B. Cross-Page Data Flow (downstream surfaces)

Every topping write calls `invalidateToppingCaches` (`product_service.go:719-721`) which DELs
`toppings:list` + `products:list` from Redis. The new/edited topping then propagates to:

| Surface | Redis key read | Propagates? | Delay |
|---|---|---|---|
| Customer `/menu` (C1) | `products:list` | ✅ on next fetch | immediate after DEL |
| POS `/pos` (S4) | `products:list` | ✅ on next fetch | immediate after DEL |
| Admin `/admin/products` product-form picker (A3) | `products:list` (uncached on admin — goes to MySQL) | ✅ always live | immediate |
| Customer product-detail `/menu/product/:id` (C4) | `product:<id>` | ⚠️ **STALE** up to 5 min | `product:<id>` NOT invalidated by topping writes |

There is **no SSE or WS event** when the topping catalogue changes — all propagation is pull-only
(next HTTP request after cache expiry or DEL).

Full cross-page detail → [admin_toppings_crosspage_dataflow.md](admin_toppings_crosspage_dataflow.md).

### C. FE → BE: What travels on the wire

| Beat | Endpoint | Body sent | Never sent by FE |
|---|---|---|---|
| Initial load | `GET /toppings` | — | — |
| Product column | `GET /products/all` | — | — |
| Add topping | `POST /toppings` | `{ name, price }` | `is_available` (hardcoded `1` by BE INSERT) |
| Edit topping | `PATCH /toppings/:id` | `{ name, price, is_available }` | — |
| Delete topping | `DELETE /toppings/:id` | — (id in URL only) | — |

All calls go through the shared Axios instance (`fe/src/lib/api-client.ts`). The request
interceptor injects `Authorization: Bearer <token>` from `useAuthStore` automatically. The
`GET /toppings` read is public and works without a token, but the admin page is behind
`AuthGuard + RoleGuard minRole=MANAGER`, so in practice the manager token is always present.

### D. BE → FE: What comes back

| Endpoint | HTTP | Response body | FE action |
|---|---|---|---|
| `GET /toppings` | 200 | `{ data: [{ id, name, price, is_available }] }` | populates ToppingTable |
| `GET /products/all` | 200 | `{ data: [{ id, name, toppings: [...] }] }` | builds `productNames` map only |
| `POST /toppings` | 201 | `{ data: { id: "<uuid>" } }` | invalidate `['admin','toppings']`, toast, close modal |
| `PATCH /toppings/:id` | 200 | `{ message: "Cập nhật topping thành công" }` | invalidate `['admin','toppings']`, toast, close modal |
| `DELETE /toppings/:id` | 204 | *(no body)* | invalidate `['admin','toppings']`, toast success |

**No optimistic updates.** After every write, the page waits for the `invalidateQueries` +
refetch cycle before showing the updated row — there is no local state patch.

On error: save non-409 → `toast.error('Có lỗi xảy ra, vui lòng thử lại')`
(`ToppingFormModal.tsx:59`); save 409 → field error "Tên topping đã tồn tại" on the name input
(`ToppingFormModal.tsx:56-57`) — currently unreachable (see Flag 4 in BE anchor); delete failure
→ `toast.error('Xóa topping thất bại. Vui lòng thử lại.')` (`page.tsx:49`).

### E. Loading + Caching

Detail → [admin_toppings_loading.md](admin_toppings_loading.md). Key points for this scenario:

- **Initial table load:** `isLoading` from `useQuery(['admin','toppings'])` drives `ToppingTable`'s
  `"Đang tải..."` text (`ToppingTable.tsx:15-17`). No skeleton — plain text only.
- **`staleTime: 60_000`** for both toppings and products (`page.tsx:22, 28`). After any write,
  `invalidateQueries` bypasses `staleTime` and forces an immediate refetch.
- **`GET /toppings` is Redis-cached (5 min TTL)** on the BE (`product_service.go:432-445`). A write
  that DELs `toppings:list` guarantees a fresh MySQL read on the next FE fetch.
- **`GET /products/all` is uncached** on the BE (`product_service.go:194` — no Redis hit, direct to
  `ListProducts` SQL). This is intentional for manager-facing live data, at the cost of N+1 topping
  queries per product row.
- **`ToppingFormModal` is code-split** (`page.tsx:10-12`) — the modal JS bundle loads lazily on
  first open, then stays warm. No visible delay after the first beat.
- **"Áp dụng cho sản phẩm" column has no loading gate:** if `products` is still fetching when
  `toppings` resolves, every row shows "Chưa gắn sản phẩm" until the products query settles. The
  column does not block table render.

### F. Monitoring

All four CRUD operations in this scenario are observable on Grafana (`:3001`,
"BanhCuon — API Monitoring") as spikes in the Request Rate panel:

- `POST /toppings` (Beat 1) — small body, fast write. Nominal.
- Two `PATCH /toppings/:id` (Beats 2 and 3) — each triggers two DB writes (name/price then
  availability, via separate queries). Still fast in practice.
- `DELETE /toppings/:id` (Beat 4) — single soft-delete + cache DEL. Nominal.

**Toasts the manager sees (sonner):**

| Action | Toast on success | Toast on error |
|---|---|---|
| Add | "Đã thêm topping" | "Có lỗi xảy ra, vui lòng thử lại" (or field error on 409) |
| Edit | "Đã cập nhật topping" | "Có lỗi xảy ra, vui lòng thử lại" |
| Delete | "Đã xóa topping" | "Xóa topping thất bại. Vui lòng thử lại." |

**Server-side audit log of topping changes: ❓ UNVERIFIED.** A grep across
`be/internal/` for `audit`, `AuditLog`, `ActivityLog`, and `change_log` returns no results.
The `002_products.sql` migration creates only `toppings` and `product_toppings` tables — no audit
table. The `product_service.go` logs only slog warnings on cache failures (`product_service.go:715`),
not business-event mutations. **Conclusion: no server-side audit log exists for topping CRUD
operations** — changes are not traceable after the fact in the DB. This is flagged `❓ UNVERIFIED`
only for the outer possibility of a logging middleware not found in the grep scope.

The `HighErrorRate` alert (5xx > 5% over 5 min) would fire on persistent BE failures; a 400 from
a bad create body would not trigger it (non-5xx). The 409 branch is unreachable today.

Triage path if a write fails in production:
`Grafana panels → Container Logs (Loki) → docker compose logs -f be` → check for
`ShouldBindJSON failed` or Redis `invalidateToppingCaches` errors.

---

## Putting A–F on One Timeline (Chị Lan's full morning)

```
09:05 Chị Lan opens /admin/toppings
  → useQuery(['admin','toppings'])                             (E: staleTime 60s)
  → GET /toppings  (public, Redis cache-aside, 5-min TTL)
  → useQuery(['admin','products'])                             (E: uncached, N+1)
  → GET /products/all (manager+, no Redis)
  → ToppingTable renders; productNames map built               (A: props from page)

09:08 clicks "+ Thêm topping"
  → openAdd() → setEditTopping(null), setShowModal(true)       (A: local state)
  → ToppingFormModal mounts (dynamic import, first load)       (E: code-split)
  → useEffect reset({ name:'', price:0, isAvailable:true })
  → fills "Trứng ốp la" / 15000 → submit
  → saveMut: createTopping({ name, price })                    (C: no isAvailable sent)
  → POST /toppings { "name":"Trứng ốp la","price":15000 }
  → BE: INSERT is_available=1 hardcoded
  → 201 { data: { id } }                                       (D: response)
  → invalidateQueries(['admin','toppings']) → refetch           (A: table updates)
  → DEL toppings:list + products:list (Redis)                  (B: cross-page)
  → toast "Đã thêm topping"                                    (F: monitoring)

09:14 clicks "Sửa" on Nhân thịt
  → openEdit(t) → setEditTopping(t), setShowModal(true)        (A: local state)
  → ToppingFormModal useEffect reset with existing values
  → changes price 0 → 2000 → submit
  → saveMut: updateTopping(id, { name, price:2000, is_available:true })
  → PATCH /toppings/:id { name, price, is_available }          (C: all three sent)
  → BE: UpdateTopping (name+price) + UpdateToppingAvailability (raw SQL)
  → 200 { message }                                            (D: response)
  → invalidate + refetch → "+2.000đ" in table                  (A: table updates)
  → past order toppings_snapshot unchanged (price isolation)   (B: cross-page)

09:20 clicks "Sửa" on Hành phi
  → ToppingFormModal opens with isAvailable:true
  → clicks toggle → setValue('isAvailable', false)
  → PATCH /toppings/:id { name, price:0, is_available:false }  (C: toggle via edit)
  → BE: UpdateToppingAvailability → is_available=0
  → DEL toppings:list + products:list — NOT product:<id>       (B: C4 stale up to 5min)
  → 200 → invalidate → badge flips to grey "Hết"              (D: response)
  → toast "Đã cập nhật topping"                                (F: monitoring)

09:28 Admin Anh Đức clicks "Xóa" on Bơ lạc
  → handleDelete: linked=[] → confirm("Xóa topping...")       (A: no warning text)
  → confirms → deleteMut.mutate(id)
  → DELETE /toppings/:id (admin+ only, 403 for manager)        (C: id in URL only)
  → SoftDeleteTopping: UPDATE SET deleted_at=NOW()
  → 204 No Content                                             (D: response)
  → invalidate → row gone; DEL toppings:list + products:list   (B: cross-page)
  → toast "Đã xóa topping"                                     (F: monitoring)
```

---

## The One-Line Mental Model

> The Toppings page is a **manager-gated catalogue editor with admin-only delete**: add/edit/toggle
> works correctly via the modal (unlike the Products page's broken inline toggle), but availability
> changes propagate to C4 (product-detail) with up to 5-minute staleness, and deleting an in-use
> topping is blocked only by a JS confirm — the BE soft-deletes unconditionally.

---

## Flags Surfaced by This Scenario

| # | Flag | Beat | Detail |
|---|---|---|---|
| 1 | **No inline availability toggle in ToppingTable** | Beat 3 | The `Trạng thái` badge has no `onClick`. Toggling requires opening "Sửa" and using the modal toggle. (The Products page has an inline badge click — though it 400s — but the Toppings page does not.) |
| 2 | **`product:<id>` not invalidated on topping edit** | Beat 3 | `invalidateToppingCaches` DELs `toppings:list` + `products:list` but never `product:<id>`. Customer product-detail (C4) serves stale topping data for up to 5 min. → [admin_toppings_be.md Flag 2](admin_toppings_be.md#flags) |
| 3 | **DELETE has no server-side in-use guard** | Beat 4 | JS `confirm()` warns the manager; BE soft-deletes unconditionally. Junction rows in `product_toppings` persist post-soft-delete (CASCADE fires only on hard delete). Past orders' `toppings_snapshot` is unaffected. → [admin_toppings_be.md Flag 3](admin_toppings_be.md#flags) |
| 4 | **FE expects 409 on duplicate name that BE never sends** | Beat 1 | `toppings.name` has no unique DB constraint; `CreateTopping` has no duplicate check. The modal's 409 field-error branch is unreachable. → [admin_toppings_be.md Flag 4](admin_toppings_be.md#flags) |
| 5 | **New toppings always created `is_available=1`** | Beat 1 | The modal's status toggle is ignored on create; `createTopping` never sends `isAvailable`. BE INSERT hardcodes `is_available=1`. → [admin_toppings_be.md §3](admin_toppings_be.md#3--post-toppings) |
| 6 | ❓ UNVERIFIED — no server-side audit log | F section | No audit table or mutation log found in BE source for topping CRUD. Changes are not traceable in the DB after the fact. Grep scope: `be/internal/**/*.go`. |
