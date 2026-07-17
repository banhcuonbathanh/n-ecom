# Scenario — A Manager Builds the Combo Catalogue

> **TL;DR:** ✅ implemented · One concrete session on `/admin/combos`: Trần Quản Lý (manager) opens
> the page, creates a combo manually, seeds three random combos at once, edits one, and finally an
> admin colleague deletes a stale one. Every beat is grounded in
> [`fe/src/app/(dashboard)/admin/combos/page.tsx`](../../../../../fe/src/app/(dashboard)/admin/combos/page.tsx)
> (the single source component) and the traced BE endpoints in
> [`admin_combos_be.md`](admin_combos_be.md).
>
> Siblings: [admin_combos.md](admin_combos.md) · [admin_combos_be.md](admin_combos_be.md) ·
> [COMBOS_BUGS.md](COMBOS_BUGS.md) · ❓ `admin_combos_crosspage_dataflow.md` (not yet generated) ·
> ❓ `admin_combos_loading.md` (not yet generated).
>
> Money in VND (₫). Date: 2026-06-17.

---

## The cast

| Who | Username | Role | Job today |
|-----|----------|------|-----------|
| **Trần Quản Lý** | `manager1` | manager | Builds the combo catalogue — can create and edit |
| **Nguyễn Admin** | `admin1` | admin | Cleans up a stale combo — the only one who can delete |

---

## The setting

It's a Tuesday morning, 09:15. The restaurant opens at 10:00. Trần Quản Lý wants to have three new
combo options live on the customer menu before the first guests scan their QR codes. The existing
product catalogue (Bánh Cuốn thịt, Bánh Cuốn mộc nhĩ, Giò, Canh, Trà đá, …) is already set up.
One stale "Combo Test" from last week's demo is cluttering the list.

---

## The timeline

### 09:15 — Opening the page: two queries fire

Trần Quản Lý navigates to `/admin/combos` inside the admin shell.

**Client-side auth checks first.** The admin shell's `AuthGuard` (checks `useAuthStore` — in-memory
JWT, never localStorage) and `RoleGuard minRole=MANAGER` pass because `manager1` has role `manager`.
These are client-side React components; the actual role enforcement on writes is server-side
(see §C below).

**Two `useQuery` calls mount simultaneously** (`page.tsx:54-61`):

| Query key | Fn | Endpoint | Auth | Cache |
|-----------|-----|----------|------|-------|
| `['admin','combos']` | `listCombos` | `GET /combos` | **public** | `combos:list` Redis 5 min (service/product_service.go:21,498) |
| `['admin','products']` | `listProducts` | `GET /products/all` | authMW + `AtLeast("manager")` | **none** — always MySQL (product_service.go:194-209) |

Both use the global TanStack Query `staleTime: 60 * 1000` (1 min) from `providers.tsx:8` — no
per-query override on this page. Because Trần Quản Lý hasn't visited this page today, both caches
are cold.

`GET /combos` → service `ListCombos` (`product_service.go:497-517`): Redis miss → queries
`ListCombosAvailable` (`products.sql:112-115`, `WHERE is_available=1 AND deleted_at IS NULL`) →
N calls to `GetComboItems` (`products.sql:122-126`) → `setCacheJSON("combos:list", …, 5 min)`.

> ⚠️ **Flag (Bug 1 — [COMBOS_BUGS.md](COMBOS_BUGS.md) Bug 1):** `ListCombos` in the service
> **always calls the available-only query** (`product_service.go:505`). Any combo with
> `is_available=0` would be invisible here. Latent today because no UI path sets `is_available=0`.

`GET /products/all` → `ListAllProducts` (`product_service.go:194-209`): always MySQL, **N+1
`GetToppingsByProductID` per product**. Toppings are fetched but this page never renders them —
the product list is used only as a name/price lookup map (`page.tsx:63`):

```ts
// page.tsx:63
const productMap = Object.fromEntries(products.map(p => [p.id, p]))
```

**What renders.** Zone C table (`page.tsx:255-342`) shows the existing combos. For each row, retail
total and savings are computed **client-side** — the BE never sends these (`page.tsx:275-279`):

```ts
// page.tsx:275-279
const rowRetail = combo.items.reduce((sum, item) => {
  const p = productMap[item.product_id]
  return sum + (p ? p.price * item.quantity : 0)
}, 0)
const rowSavings = rowRetail - combo.price
```

Product names in the combo pills (`page.tsx:294`) also resolve client-side via `productMap`;
`GET /combos` only returns `product_id` in each `combo_item`, never `product_name`
(`product_handler.go:337-341`, `admin.api.ts:140-144`).

The header shows `Combo (N)` where N = `combos.length` (`page.tsx:237`). "Combo Test" from last
week is visible in the list (it is available). "Xóa" (delete) button is **absent** for
Trần Quản Lý — the button only renders when `user?.role === 'admin'` (`page.tsx:46,326`).

---

### 09:18 — "+ Thêm combo": the manager creates "Combo Gia Đình"

Trần Quản Lý clicks "+ Thêm combo". `openAdd()` fires (`page.tsx:78-84`):
- `reset({ name: '', price: 0, description: '', sort_order: 0 })` — RHF state cleared
- `setSelectedItems({})`, `setEditingCombo(null)`, `setModalMode('add')`

Zone D — `ComboFormModal` mounts (`page.tsx:345`).

**Inside the modal.** The product picker (`page.tsx:411-473`) renders `uniqueProducts` — products
de-duplicated by name (`page.tsx:190-192`). Trần Quản Lý ticks two products:

- "Bánh Cuốn thịt" ×2
- "Giò" ×1

`toggleProduct(id)` adds each to `selectedItems` (`page.tsx:114-124`). The item-count badge
appears: "(2 món đã chọn)" (`page.tsx:392`). The orange summary block (`page.tsx:477-495`) shows:

```
Bánh Cuốn thịt ×2   ₫16.000
Giò ×1               ₫9.000
──────────────────────────────
Tổng giá lẻ          ₫25.000
```

The price label shows the suggestion `— gợi ý: ₫22.000`
(`Math.round(25000 * 0.9 / 1000) * 1000` = `₫22.000`, `page.tsx:504`).

Trần Quản Lý types `₫22.000` into the price field. The savings hint appears below:
`✓ Tiết kiệm ₫3.000 so với giá lẻ (₫25.000)` (`page.tsx:515-519`).

He names it "Combo Gia Đình", leaves description blank, keeps sort_order 0. Clicks "Lưu combo".

**Submit flow.** `onSubmit` fires (`page.tsx:172-182`):
1. `Object.keys(selectedItems).length` = 2 → passes the ≥2 guard (`page.tsx:173`)
2. `modalMode === 'add'` → `createMut.mutate(values)` (`page.tsx:180`)

`createMut` sends (`page.tsx:131-145`, `admin.api.ts:148-149`):

```
POST /combos
Authorization: Bearer <manager JWT>
{
  "name": "Combo Gia Đình",
  "price": 22000,
  "description": "",
  "sort_order": 0,
  "items": [
    { "product_id": "<uuid Bánh Cuốn thịt>", "quantity": 2 },
    { "product_id": "<uuid Giò>",            "quantity": 1 }
  ]
}
```

No `image_path`, no `category_id` — the form has no such fields.

**BE path.** Handler `CreateCombo` (`product_handler.go:374-398`) binds `createComboRequest` —
`name` required, `price required,min=0` (note: `min=0` not `min=1` — Bug 4 in
[COMBOS_BUGS.md](COMBOS_BUGS.md)), items each `product_id required` + `quantity required,min=1`.

Service `CreateCombo` (`product_service.go:534-569`):
- Mints a UUID (`id`)
- `CreateCombo` SQL insert (`products.sql:128-130`) — **`is_available` is hardcoded to `1`**
- Loops `CreateComboItem` for each item (`products.sql:142-146`)

> ⚠️ **Flag (Bug 3 — [COMBOS_BUGS.md](COMBOS_BUGS.md) Bug 3):** if a `product_id` FK fails
> (e.g. typo via direct API call), `CreateComboItem` logs `slog.Warn` and **swallows the error**
> (`product_service.go:562-564`). The combo header is already written; the response is still `201`.
> The manager sees "Đã tạo combo" but the combo has missing items. This bug path is not reachable
> via the modal (the product picker only offers valid ids from `GET /products/all`), but it is
> reachable via direct API.

- `invalidateComboCaches(ctx)` → `s.rdb.Del(ctx, "combos:list")` (`product_service.go:567,723-724`)
- Returns the new `id`

Handler responds `201 {"data":{"id":"<new-uuid>"}}`.

**FE response.** `createMut.onSuccess` (`page.tsx:139-143`):
```ts
qc.invalidateQueries({ queryKey: ['admin', 'combos'] })
toast.success('Đã tạo combo')
closeModal()
```

`invalidateQueries` marks `['admin','combos']` stale → TanStack Query immediately refetches
`GET /combos`. This time the Redis cache is cold (just Del-ed), so the BE re-queries MySQL →
re-caches. The table re-renders with "Combo Gia Đình" visible.

---

### 09:22 — "🎲 Random combo": three combos created in parallel

Trần Quản Lý clicks "🎲 Random combo" (`page.tsx:194-229`). The button disables (`randomLoading:
true`, `page.tsx:199`). Three templates are defined inline:

```ts
// page.tsx:201-205
const templates = [
  { count: 2, qtyRange: [1, 2], discount: 0.12 },   // 12% off retail
  { count: 3, qtyRange: [1, 2], discount: 0.15 },   // 15% off retail
  { count: 2, qtyRange: [2, 2], discount: 0.10 },   // 10% off retail
]
```

`Promise.allSettled` fires three `createCombo` calls **simultaneously** (`page.tsx:207`). For each
template:
1. `pickRandom(uniqueProducts, tpl.count)` — random shuffle, slice
2. Quantities picked from `qtyRange`
3. `retail = sum(p.price * qty)` (client-side, from `productMap`)
4. `price = Math.round(retail * (1 - discount) / 1000) * 1000` — rounded to nearest ₫1.000
5. Name picked from `COMBO_NAMES` pool avoiding duplicates (`page.tsx:27-35`), e.g. "Combo Bữa
   Sáng", "Combo Văn Phòng", "Combo Tiết Kiệm"

Three concurrent `POST /combos` hit the BE. Each triggers its own `CreateCombo` service call
(no transactions across the three) and its own `invalidateComboCaches`. Because `Promise.allSettled`
is used (not `Promise.all`), if one create fails the other two still resolve — the failure is
silently absorbed (the `catch` block at `page.tsx:224` only fires if `allSettled` itself throws,
which it never does).

After all three settle (`page.tsx:222-223`):
```ts
qc.invalidateQueries({ queryKey: ['admin', 'combos'] })
toast.success('Đã tạo 3 combo ngẫu nhiên!')
```

A single `invalidateQueries` fires regardless of individual successes/failures. The table refetches
and shows up to 3 new rows. `randomLoading` resets to `false` (`page.tsx:227`).

---

### 09:25 — "Sửa": editing "Combo Bữa Sáng" to adjust price

Trần Quản Lý clicks "Sửa" on "Combo Bữa Sáng" (`page.tsx:321-325`). `openEdit(combo)` fires
(`page.tsx:86-99`):
- `reset({ name: combo.name, price: combo.price, description: combo.description ?? '', sort_order: combo.sort_order })`
- Rebuilds `selectedItems` from `combo.items` (`page.tsx:93-94`):
  ```ts
  combo.items.forEach(i => { items[i.product_id] = i.quantity })
  ```
- `setEditingCombo(combo)`, `setModalMode('edit')`

The modal reopens pre-filled. The product picker shows the combo's existing products checked with
their saved quantities. `modalMode === 'edit'` so the header reads "Sửa combo" (`page.tsx:351`).

Trần Quản Lý changes the price from ₫34.000 to ₫31.000 (a slightly deeper discount). Leaves
products and quantities unchanged. Clicks "Lưu combo".

`onSubmit` → `editMut.mutate(values)` (`page.tsx:177-178`). The mutation calls `updateCombo`
(`admin.api.ts:151-152`):

```
PATCH /combos/<uuid Combo Bữa Sáng>
Authorization: Bearer <manager JWT>
{
  "name": "Combo Bữa Sáng",
  "price": 31000,
  "description": "",
  "sort_order": 1,
  "items": [
    { "product_id": "<uuid Bánh Cuốn thịt>", "quantity": 1 },
    { "product_id": "<uuid Giò>",            "quantity": 1 }
  ]
}
```

No `image_path`, no `category_id` — the PATCH request struct has no such fields
(`product_handler.go:400-406`).

**BE path.** Handler `UpdateCombo` (`product_handler.go:409-430`): binds `updateComboRequest` —
`name required`, `price min=1`, **`items required,min=2`** (server-side). Service `UpdateCombo`
(`product_service.go:588-623`):
1. `GetComboByID` existence check → would 404 if deleted
2. `UpdateCombo` SQL (`products.sql:132-135`): sets `category_id, name, description, price, sort_order`

> ⚠️ **Flag (Bug 2 — [COMBOS_BUGS.md](COMBOS_BUGS.md) Bug 2):** `UpdateComboInput` has no
> `ImagePath` field (`product_service.go:579-586`); the service builds `UpdateComboParams` with
> `ImagePath` absent (zero-value → NULL) and passes `in.CategoryID = ""` → `sql.NullString{}` →
> NULL. **Every edit nulls both `image_path` and `category_id` in the DB** regardless of what they
> were before. Latent today because the form never sets either field, so there is nothing to wipe.

3. `DeleteComboItemsByComboID` — wipes all existing items
4. `CreateComboItem` ×N — re-inserts items (same swallow-on-error as create,
   `product_service.go:617-619`)
5. `invalidateComboCaches(ctx)` → Del `combos:list`
6. Returns nil → handler responds `200 {"message":"Cập nhật combo thành công"}`

`editMut.onSuccess` (`page.tsx:155-160`):
```ts
qc.invalidateQueries({ queryKey: ['admin', 'combos'] })
toast.success('Đã cập nhật combo')
closeModal()
```

The table row for "Combo Bữa Sáng" now shows ₫31.000 with an updated savings badge.

---

### 09:30 — "Xóa": admin deletes "Combo Test"

Nguyễn Admin (`admin1`, role `admin`) opens `/admin/combos` on another browser. Because
`user?.role === 'admin'` is true (`page.tsx:46`), the "Xóa" button renders alongside every combo
row (`page.tsx:326-333`). Trần Quản Lý's session also has the page open but sees no "Xóa" buttons.

Nguyễn Admin clicks "Xóa" on "Combo Test". `handleDelete(id, "Combo Test")` fires (`page.tsx:184-187`):

```ts
if (!confirm(`Xóa combo "Combo Test"?`)) return
deleteMut.mutate(id)
```

The native browser `confirm()` dialog appears. Nguyễn Admin confirms.

`deleteMut` calls `deleteCombo(id)` → `DELETE /combos/<uuid>` (`admin.api.ts:154`).

**BE path.** Handler `DeleteCombo` (`product_handler.go:433-439`): calls `svc.DeleteCombo`.
Service `DeleteCombo` (`product_service.go:571-577`): `SoftDeleteCombo` (`products.sql:137-140`,
sets `deleted_at = NOW()`). **No active-order guard, no existence check** — a DELETE on a
non-existent id still returns 204 (the UPDATE matches 0 rows). `invalidateComboCaches(ctx)` →
Del `combos:list`.

Handler responds `204 No Content`.

`deleteMut.onSuccess` (`page.tsx:165-169`):
```ts
qc.invalidateQueries({ queryKey: ['admin', 'combos'] })
toast.success('Đã xóa combo')
```

"Combo Test" disappears from the table on Nguyễn Admin's next render. Trần Quản Lý's tab also
refetches on its next stale window (or on next focus-triggered refetch) and the row is gone there
too — no realtime push; both sessions poll independently.

---

### 09:31 — Cross-page payoff: the new combos appear on `/menu`

A customer scans the QR code on Bàn 03 and opens the customer `/menu`. The `ComboSection` on the
menu page fetches `GET /combos` (the same public endpoint, same `combos:list` Redis key). The
`invalidateComboCaches` calls above have already Del-ed the key, so this fresh fetch bypasses
Redis, queries MySQL, and re-populates the cache with all four new combos ("Combo Gia Đình",
"Combo Bữa Sáng", "Combo Văn Phòng", "Combo Tiết Kiệm") plus whatever pre-existed (minus
"Combo Test", which is now soft-deleted).

The customer can now tap "Combo Gia Đình" → add to cart → submit order. At order time, the BE
service `CreateOrder` explodes the combo into DB rows: one header row (`unit_price=0`,
`combo_id=<uuid>`) + sub-item rows for Bánh Cuốn thịt ×2 and Giò ×1, each carrying real
`unit_price` (snapshotted from the product catalogue, never from the FE). The combo's price
(₫22.000) lives only on `orders.total_amount`, computed server-side as `SUM(unit_price × quantity)`
— the ₫0 header avoids double-counting.

---

## Under the hood — A through F

### A. Cross-component data flow

**N/A for this page.** The whole page is one `'use client'` component (`page.tsx:1`). There is no
store shared between sibling widgets because there are no sibling widgets: the table and the modal
are both inline JSX in the same function. All state that coordinates them is **local React
`useState`**:

| State variable | Type | Purpose | Line |
|----------------|------|---------|------|
| `modalMode` | `'add' \| 'edit' \| null` | whether/which modal is open | `page.tsx:48` |
| `editingCombo` | `Combo \| null` | which combo is being edited | `page.tsx:49` |
| `selectedItems` | `Record<string,number>` | product ids → quantities in the picker | `page.tsx:50` |
| `itemsError` | `string \| null` | ≥2-item validation message | `page.tsx:51` |
| `randomLoading` | `boolean` | disables the random button while 3 POSTs are in flight | `page.tsx:52` |
| RHF `reset/watch` | — | form field values, wired via `useForm` | `page.tsx:65-70` |

No `useCartStore`, no `useAuthStore` write, no `useAdminStore`. The only shared read is
`useAuthStore(s => s.user)` (`page.tsx:45`) to check `isAdmin` for the delete button visibility.
Cross-component flow does not apply.

### B. Cross-page data flow

Every combo write (create / edit / delete) calls `invalidateComboCaches` on the BE
(`product_service.go:567,575,621`) which Del-s **`combos:list`** — the same Redis key consumed by:

- **Customer `/menu` (C1)** — `ComboSection` fetches `GET /combos` on mount; its TanStack Query
  cache goes stale on next focus/window event and refetches, getting the updated list.
- **Customer `/menu/combo/:id` (C5)** — combo detail page fetches the same endpoint for the single
  combo.

There is no WebSocket push; both customer-facing pages pull on their own schedule. Worst-case
staleness = FE TanStack Query default staleTime (60 s, `providers.tsx:8`) + Redis TTL (5 min,
`product_service.go:21`) ≈ **6 minutes** before an un-visited customer tab sees the new combo.
A freshly opened tab sees it immediately (cold fetch → Redis cold → MySQL).

Full cross-page mapping: ❓ UNVERIFIED — `admin_combos_crosspage_dataflow.md` does not yet exist.
The above is derived from the shared `combos:list` cache key as traced in
[admin_combos_be.md](admin_combos_be.md) §Caching & Invalidation.

### C. FE → BE send (the three write endpoints)

All three mutations go through the single Axios instance `api` (`lib/api-client.ts`), which
injects the `Authorization: Bearer <JWT>` header automatically via request interceptor.

| Action | Method + path | Request body fields | Source |
|--------|--------------|---------------------|--------|
| Create | `POST /combos` | `name, price, description?, sort_order?, items[{product_id, quantity}]` | `admin.api.ts:148-149`; handler `product_handler.go:374`; service `product_service.go:534` |
| Edit | `PATCH /combos/:id` | `name, price, description?, sort_order?, items[{product_id, quantity}] (min 2)` | `admin.api.ts:151-152`; handler `product_handler.go:409`; service `product_service.go:588` |
| Delete | `DELETE /combos/:id` | no body | `admin.api.ts:154`; handler `product_handler.go:433`; service `product_service.go:571` |

Full per-endpoint detail: [admin_combos_be.md](admin_combos_be.md) §Per-Endpoint Detail.

### D. BE → FE receive (no realtime)

This page has **no SSE or WebSocket subscription**. All updates are pull-based:

- Reads: `useQuery` polls on mount + stale/refocus (global 60 s staleTime, `providers.tsx:8`).
- Writes: `invalidateQueries({ queryKey: ['admin','combos'] })` in each mutation's `onSuccess`
  marks the query stale and triggers an immediate refetch (`page.tsx:140,156,166`).
- Product list: `['admin','products']` is never invalidated by combo writes (correct — no product
  row changes).

There is no optimistic update: the table row only appears after the refetch resolves (typically
< 200 ms on local Docker, but visible as a brief "flash" on slow connections).

### E. Loading and caching

| Query | staleTime | BE cache | Cold-path cost |
|-------|-----------|----------|----------------|
| `GET /combos` (`['admin','combos']`) | 60 s (global default, `providers.tsx:8`) | Redis `combos:list` 5 min (`product_service.go:21`) | MySQL `ListCombosAvailable` + N×`GetComboItems` (N = combo count) |
| `GET /products/all` (`['admin','products']`) | 60 s (global default) | **none** | MySQL `ListProducts` + N+1 `GetToppingsByProductID` |

While `isLoading` is true (first render, cache cold): Zone C shows `<p>Đang tải...</p>`
(`page.tsx:257`). If the combos list is empty after load: `<EmptyState icon="🍱" …/>` (`page.tsx:259`).
The "Lưu combo" submit button is disabled (`isPending`, `page.tsx:543`) while a mutation is
in-flight — prevents double-submit.

❓ UNVERIFIED — `admin_combos_loading.md` does not yet exist. The above is derived directly from
`page.tsx:54-61,231,256-260,543`.

### F. Monitoring

Combo writes are plain HTTP — they appear in the standard Grafana dashboard (`:3001`) as request
rate spikes on the `POST /combos` and `PATCH /combos/:id` routes, and in Loki container logs
(`docker compose logs -f be`).

The one invisible failure mode: **swallowed combo-item insert errors (Bug 3)**. When a
`CreateComboItem` FK violation is silently dropped (`product_service.go:562-564`), the only
evidence is a `slog.Warn` line in the BE structured logs. The manager's UI shows "Đã tạo combo"
and the request metric records a `201` — **nothing surfaces the partial-item failure in Grafana or
to the manager's browser**. To catch this: `grep "combo: create item failed" <loki-query>` or
watch for combos with zero items in the table ("Chưa có sản phẩm" pill, `page.tsx:299`).

Monitoring home: [../../09_devops/MONITORING.md](../../09_devops/MONITORING.md); live configs in
[`monitoring/`](../../../../../monitoring/).

---

## The whole session on one timeline

```
09:15  navigate /admin/combos
         → AuthGuard + RoleGuard (client-side) pass
         → useQuery['admin','combos']  → GET /combos    (Redis miss → MySQL → cache 5min)    [parallel]
         → useQuery['admin','products'] → GET /products/all (uncached → MySQL N+1)            [parallel]
         → table renders; retail/savings computed client-side; no "Xóa" button (manager)

09:18  click "+ Thêm combo"
         → openAdd() → setModalMode('add'), reset(), setSelectedItems({})
         → pick 2 products → selectedItems updated; retailTotal & savings re-derived live
         → price hint shown: Math.round(25000 * 0.9 / 1000) * 1000 = ₫22.000
         → submit (≥2 guard passes) → createMut → POST /combos (manager JWT)
         → BE: CreateCombo insert + 2×CreateComboItem + Del combos:list
         → 201 {id} → invalidateQueries['admin','combos'] → refetch → toast "Đã tạo combo"

09:22  click "🎲 Random combo"
         → Promise.allSettled([POST /combos, POST /combos, POST /combos])  ← 3 concurrent
           • template 0: 2 products, 12% off → price = Math.round(retail*0.88/1000)*1000
           • template 1: 3 products, 15% off → price = Math.round(retail*0.85/1000)*1000
           • template 2: 2 products ×2 qty,  10% off → price = Math.round(retail*0.90/1000)*1000
         → each BE call: CreateCombo + items + Del combos:list (3 separate Del calls)
         → allSettled resolves → invalidateQueries['admin','combos'] → refetch → toast "Đã tạo 3 combo ngẫu nhiên!"

09:25  click "Sửa" on "Combo Bữa Sáng"
         → openEdit(combo) → setModalMode('edit'), reset(combo fields), selectedItems from combo.items
         → change price → submit (editMut) → PATCH /combos/:id (manager JWT)
         → BE: GetComboByID + UpdateCombo SQL (⚠️ nulls image_path/category_id) + DeleteComboItems + re-CreateComboItems + Del combos:list
         → 200 → invalidateQueries + toast "Đã cập nhật combo"

09:30  Nguyễn Admin clicks "Xóa" on "Combo Test" (button visible because role=admin)
         → confirm("Xóa combo 'Combo Test'?") → confirmed
         → deleteMut → DELETE /combos/:id (admin JWT)
         → BE: SoftDeleteCombo (sets deleted_at) + Del combos:list
         → 204 → invalidateQueries + toast "Đã xóa combo"

09:31  customer scans QR → /menu ComboSection → GET /combos (Redis cold) → new combos visible
         → customer orders "Combo Gia Đình" → POST /orders → combo explodes:
           header (unit_price=0) + Bánh Cuốn thịt ×2 + Giò ×1 (real prices snapshotted)
           orders.total_amount = SUM = ₫22.000 (no double-count)
```

---

## Flags surfaced by this scenario

| # | Flag | Where it bites |
|---|------|----------------|
| 1 | **Admin list is available-only** | Any `is_available=0` combo vanishes from the management table — uneditable/undeletable via UI. Detail: [COMBOS_BUGS.md Bug 1](COMBOS_BUGS.md#bug-1--admin-management-list-shows-only-is_available1-combos). |
| 2 | **PATCH nulls image_path + category_id every edit** | Silent data loss if those fields are ever populated. Detail: [COMBOS_BUGS.md Bug 2](COMBOS_BUGS.md#bug-2--patch-combosid-nulls-image_path-and-category_id-on-every-edit). |
| 3 | **Item inserts swallow FK errors** | Partial combo (missing items) reports 2xx; only visible in server slog. Detail: [COMBOS_BUGS.md Bug 3](COMBOS_BUGS.md#bug-3--combo-item-inserts-are-non-transactional-and-swallow-errors). |
| 4 | **POST /combos accepts price=0 + 0 items** | Looser server-side validation than PATCH. FE ≥2-item guard (`page.tsx:173`) compensates for UI callers. Detail: [COMBOS_BUGS.md Bug 4](COMBOS_BUGS.md#bug-4--post-combos-validation-is-looser-than-patch). |
| 5 | **No realtime sync between admin tabs** | Trần Quản Lý's tab doesn't see Nguyễn Admin's delete until its own query goes stale (up to 60 s). Pull-only; no SSE/WS on this page. |
| 6 | **Promise.allSettled absorbs individual failures silently** | If one of the 3 random-combo POSTs fails, the toast still says "Đã tạo 3 combo ngẫu nhiên!" — the table might show only 1 or 2 new rows. `page.tsx:207,222-223`. |
| 7 | **"Combo availability" toggle is drift** | `admin_combos.md` wireframe references "Còn ●" availability column and a toggle; **neither exists in code** — `is_available` is returned by the API but never rendered or toggled on this page (`admin_combos_be.md` Flag 2). |

---

## One-line mental model

> The manager **assembles** a combo from existing products (names/prices from `GET /products/all`,
> client-side math for retail + savings hint), **saves it** via `POST`/`PATCH`/`DELETE` (each Del-s
> `combos:list`), and the customer `/menu` sees the result on its next pull — no push, no
> double-counting, no image support yet.
