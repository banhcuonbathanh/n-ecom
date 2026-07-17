# Admin Products — Cross-Component Data Flow (manager edits a product's price)

> **Status:** ✅ implemented
> **What this is:** a deep zoom on one concrete action on `/admin/products` —
> *manager opens the edit modal for "Bánh cuốn nhân tôm" and saves a new price* — told from the
> page's point of view. It answers one question: **how do the widgets on this single page share
> the updated data without prop-drilling?**
>
> The short answer: the **single shared hub is the TanStack Query cache entry `['admin','products']`**.
> There is **no Zustand store on this page**. `page.tsx` owns the one query + the modal
> `useState`; `ProductsTable` renders the cached list; every mutation ends with
> `qc.invalidateQueries({ queryKey: ['admin','products'] })`, which causes a background refetch
> and `ProductsTable` re-renders with the new data.
>
> Traced from source on branch `experience_claude.md_system_1`:
> - [`fe/src/app/(dashboard)/admin/products/page.tsx`](../../../../../fe/src/app/(dashboard)/admin/products/page.tsx)
> - [`fe/src/app/(dashboard)/admin/products/_components/ProductsTable.tsx`](../../../../../fe/src/app/(dashboard)/admin/products/_components/ProductsTable.tsx)
> - [`fe/src/app/(dashboard)/admin/products/_components/ProductFormModal.tsx`](../../../../../fe/src/app/(dashboard)/admin/products/_components/ProductFormModal.tsx)
> - [`fe/src/app/(dashboard)/admin/products/_components/ProductPageHeader.tsx`](../../../../../fe/src/app/(dashboard)/admin/products/_components/ProductPageHeader.tsx)
> - [`fe/src/features/admin/admin.api.ts`](../../../../../fe/src/features/admin/admin.api.ts)
> - [`fe/src/types/product.ts`](../../../../../fe/src/types/product.ts)
>
> Siblings:
> [admin_products.md](admin_products.md) ·
> [admin_products_be.md](admin_products_be.md) ·
> [admin_products_crosspage_dataflow.md](admin_products_crosspage_dataflow.md) ·
> [admin_products_loading.md](admin_products_loading.md) ·
> [SCENARIO_PRODUCT_CRUD.md](SCENARIO_PRODUCT_CRUD.md)

---

## 0. The edit, in one line

> Manager clicks **"Sửa"** on "Bánh cuốn nhân tôm", changes the price from ₫45,000 to ₫48,000,
> and clicks **"Lưu"**: `ProductFormModal.saveMut` PATCHes the BE, then calls
> `qc.invalidateQueries(['admin','products'])` on success — the cache entry is marked stale,
> TanStack Query refetches `GET /products/all`, and `ProductsTable` re-renders with the new price.
> No prop travels widget-to-widget; the cache is the only hub.

### The whole picture on one screen

```
                   /admin/products  (the page)
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ A  ProductPageHeader                                          │   │
│  │   "Sản phẩm (8)"  [🌱 Dữ liệu mẫu]  [+ Thêm sản phẩm ──►]──┼──WRITES modal.open = true
│  │   ↑ reads products.length via prop from page.tsx             │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ B  ProductsTable                                              │   │
│  │   Bánh cuốn nhân tôm  │ Bánh cuốn │ 45.000đ  │ [Sửa ──────►]──WRITES modal.open=true,
│  │                                                               │   │         modal.product=p
│  │   reads products[] from prop (sourced from cache)            │   │
│  │   [Xóa] → calls onDelete(id, name) → deleteMut              │   │
│  │   [Đang bán badge] → calls onToggle(id, !is_available)       │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ C  ProductFormModal  (modal overlay — dynamic import)         │   │
│  │   Danh mục: [Bánh cuốn ▼]  ← local query ['categories']      │   │
│  │   Tên: "Bánh cuốn nhân tôm"                                   │   │
│  │   Giá: [48000] ← user edits HERE                              │   │
│  │   Topping: ☑ Hành phi  ← local query ['admin','toppings']    │   │
│  │   Image: [preview] ← local useState imagePath/imagePreview   │   │
│  │   [Huỷ]  [Lưu ─────────────────────────────────────────────►]──WRITES PATCH /products/:id
│  └───────────────────────────────────────────────────────────────┘   │
│                          │                                           │
│                          │ on success:                               │
│                          ▼ qc.invalidateQueries(['admin','products'])│
│  ┌────────────────────────────────────────────────────────────┐      │
│  │          TanStack Query cache ['admin','products']         │      │
│  │          (the single shared hub — no Zustand store)        │      │
│  │  staleTime: 30_000 ms                                      │      │
│  │  queryFn: listProducts → GET /products/all                 │      │
│  │  data: Product[]                                           │ ◄────┘
│  └────────────────────────────────────────────────────────────┘
               │                        ▲
               │ data: Product[]        │ invalidate → background refetch
               ▼ (via prop: page.tsx)   │ (all 3 mutations trigger this)
          ProductsTable                 │
         ProductPageHeader.count        │
```

**Read it like this:** clicks flow *down* into mutations (or modal state); re-renders flow *up* from
the cache. No arrow ever goes component-to-component directly — the TanStack Query cache is the
only hub.

---

## 1. The cast of components (this edit only)

| Widget | Component | Role in this action | Data source |
|---|---|---|---|
| Header | `ProductPageHeader` | shows product count; "Thêm" button | `products.length` prop from `page.tsx:122` |
| Table | `ProductsTable` | renders row; "Sửa" button triggers modal open | `products` prop from `page.tsx:123` (sourced from cache) |
| Form modal | `ProductFormModal` | fields + save mutation | own `useQuery(['categories'])`, `useQuery(['admin','toppings'])`; local `useState` for image; RHF for form |
| Page | `page.tsx` | owns the cache query + modal state | TanStack Query `['admin','products']`; `useState modal` |

**The pattern:** 3 visible widgets + the page container, **0 props passed between widgets**.
`ProductsTable` and `ProductPageHeader` receive props from `page.tsx` only; neither ever calls
the other. `ProductFormModal` has its own internal queries and communicates its outcome back to
`page.tsx` only by calling `onClose()` + triggering cache invalidation. That is the whole answer
to "how is data managed cross-component" on this page.

---

## 2. The single source: TanStack Query cache entry `['admin','products']`

The products query lives in `page.tsx:22-26`:

```ts
// page.tsx:22-26
const { data: products = [], isLoading } = useQuery<Product[]>({
  queryKey: ['admin', 'products'],
  queryFn:  listProducts,
  staleTime: 30_000,
})
```

`listProducts` calls `GET /products/all` (`admin.api.ts:39-40`). The cache entry is **the one place**
all product data lives on this page. `page.tsx` reads `products` and `isLoading` from it, then
passes them **downward by prop** to `ProductsTable` and `ProductPageHeader` — the children never
touch the cache directly.

There is deliberately **no Zustand store** on this page. The data shared between widgets (the
product list) is server state → TanStack Query is the correct home (see
`fe/CLAUDE.md §Architecture`). Modal open/close state is ephemeral UI state that does not need to
survive a page reload → `useState` in `page.tsx` is correct.

### 2.1 Exact query shape (traced)

```ts
// fe/src/types/product.ts:14-25
interface Product {
  id:            string
  category_id:   string
  category_name: string
  name:          string
  description:   string | null
  price:         number
  image_path:    string | null
  is_available:  boolean
  sort_order:    number
  toppings:      Topping[]
}
```

Full field provenance is in [admin_products_be.md §1](admin_products_be.md) (handler serializer
`productJSON` at `product_handler.go:443-460`) — not restated here per Rule #9.

### 2.2 The modal state (not cache — just `useState`)

```ts
// page.tsx:19
const [modal, setModal] = useState<{ open: boolean; product?: Product }>({ open: false })
```

`modal.open` and `modal.product` are the **only** pieces of state owned by `page.tsx` besides the
cache. They are not shared via context or Zustand; they flow directly as props into
`ProductFormModal` (`page.tsx:130-135`).

### 2.3 Form-modal-local queries (not the shared cache)

`ProductFormModal` owns **two additional queries** that are local to the modal:

| Query key | Function | `staleTime` | Source |
|---|---|---|---|
| `['categories']` | `listCategories` → `GET /categories` | 60 000 ms | `ProductFormModal.tsx:39-43` |
| `['admin','toppings']` | `listToppings` → `GET /toppings` | 60 000 ms | `ProductFormModal.tsx:44-48` |

These are **read-only catalog** queries for populating form dropdowns. They are cached separately from
`['admin','products']` and are **not invalidated** by the save mutation — they outlive any individual
edit. For endpoint detail (BE handler, cache key at BE, TTL) see [admin_products_be.md §2 and §3](admin_products_be.md).

---

## 3. "Manager edits a product's price" — step by step

> **Watch the cache.** Each step shows what the TanStack Query cache and `useState` contain at that
> moment, so you can see exactly what every widget is reading.

### Step 1 — Page mounts, cache populates

On first mount `page.tsx:22-26` fires `GET /products/all`. While `isLoading = true`,
`ProductsTable` receives `isLoading={true}` and renders `<p>Đang tải...</p>`
(`ProductsTable.tsx:17-19`). `ProductPageHeader` receives `count={0}` (the `products = []`
default).

```
CACHE AFTER STEP 1 (fetch complete)
┌──────────────────────────────────────────────────────┐
│ ['admin','products']                                 │
│   data: Product[]   (8 rows, all fields populated)   │
│   staleTime: 30 000 ms                               │
└──────────────────────────────────────────────────────┘
modal = { open: false }
```

`ProductsTable` now renders the full table (`ProductsTable.tsx:43-113`).
`ProductPageHeader` receives `count={8}`, renders "Sản phẩm (8)" (`ProductPageHeader.tsx:11`).

### Step 2 — Manager clicks "Sửa" on row "Bánh cuốn nhân tôm"

`ProductsTable.tsx:98` renders:

```tsx
// ProductsTable.tsx:97-100
<button onClick={() => onEdit(p)} ...>
  Sửa
</button>
```

`onEdit` is the prop wired in `page.tsx:126`:

```ts
// page.tsx:126
onEdit={(p) => setModal({ open: true, product: p })}
```

`setModal` updates `page.tsx` state:

```
modal = { open: true, product: { id: '<uuid>', name: 'Bánh cuốn nhân tôm', price: 45000, ... } }
```

`ProductFormModal` receives `open={true}` and `product={...}` → renders as an overlay
(`ProductFormModal.tsx:124-287`).

No cache entry changes. The table and header continue to read the same unchanged cache data.

### Step 3 — Modal mounts, pre-fills fields from the product prop

`ProductFormModal.tsx:54-72` runs a `useEffect` on `[open, mode, product, reset]`:

```ts
// ProductFormModal.tsx:56-65
if (mode === 'edit' && product) {
  reset({
    category_id:  product.category_id,
    name:         product.name,
    description:  product.description ?? '',
    price:        product.price,           // ← 45000 pre-filled here
    sort_order:   product.sort_order,
    topping_ids:  product.toppings.map(t => t.id),
  })
  setImagePath(product.image_path ?? null)
  setImagePreview(getImageUrl(product.image_path))
}
```

The form fields are sourced entirely from `product` (the prop that was set from the cache at Step 1).
The modal also fires `GET /categories` (stale check) and `GET /toppings` (stale check) to populate
the category dropdown and topping checkboxes (`ProductFormModal.tsx:39-48`).

```
CACHE (unchanged)
['admin','products']  data: Product[]  (45 000 for the edited row)
['categories']        data: Category[] (fired by ProductFormModal)
['admin','toppings']  data: Topping[]  (fired by ProductFormModal)

MODAL-LOCAL STATE (ProductFormModal)
  imagePath:    '<existing-path>'   useState:35
  imagePreview: '<blob URL>'        useState:36
  uploading:    false               useState:37

RHF form values:
  price: 45000   ← pre-filled from product prop
```

### Step 4 — Manager types "48000" in the price field

The price field is a plain RHF-controlled `<input type="number">` (`ProductFormModal.tsx:222-227`):

```tsx
// ProductFormModal.tsx:219-227
<input
  type="number"
  {...register('price')}
  ...
  placeholder="35000"
/>
```

`register('price')` wires the field to RHF. Typing `48000` updates the RHF internal state only —
**no cache change, no props change, no other widget re-renders**. The Zod schema coerces the string
to a number (`schema:19`: `z.coerce.number().min(1, ...)`).

### Step 5 — Manager clicks "Lưu" — the save mutation fires

`handleSubmit` validates the form, then calls `saveMut.mutate(values)` (`ProductFormModal.tsx:134`):

```ts
// ProductFormModal.tsx:102-108
const saveMut = useMutation({
  mutationFn: (values: FormValues) => {
    const payload = { ...values, image_path: imagePath ?? undefined }
    return mode === 'edit' && product
      ? updateProduct(product.id, payload)   // ← this branch
      : createProduct(payload)
  },
  ...
})
```

`updateProduct` (`admin.api.ts:45-47`):

```ts
// admin.api.ts:45-47
export const updateProduct = (id: string, body: Partial<CreateProductInput>): Promise<Product> =>
  api.patch(`/products/${id}`, body).then(r => r.data.data)
```

Issues `PATCH /products/:id` with `{ price: 48000, ... }`. While `saveMut.isPending = true`,
the "Lưu" button shows "Đang lưu..." and is disabled (`ProductFormModal.tsx:276-280`).

### Step 6 — BE returns 200, `onSuccess` invalidates the cache

```ts
// ProductFormModal.tsx:100
const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'products'] })

// ProductFormModal.tsx:109-113
onSuccess: () => {
  invalidate()   // ← marks ['admin','products'] stale, triggers background refetch
  toast.success('Đã cập nhật sản phẩm')
  onClose()      // ← page.tsx: setModal({ open: false })
},
```

`qc.invalidateQueries` is called with the **same key used in `page.tsx:23`** (`['admin','products']`).
TanStack Query marks the entry stale and immediately starts a background refetch of `GET /products/all`.

`onClose()` sets `modal = { open: false }`. The overlay unmounts.

### Step 7 — Refetch completes, `ProductsTable` re-renders with the new price

The background `GET /products/all` returns. TanStack Query updates the cache:

```
CACHE AFTER STEP 7
┌──────────────────────────────────────────────────────┐
│ ['admin','products']                                 │
│   data: Product[]  (price for the edited row = 48000)│
└──────────────────────────────────────────────────────┘
```

`page.tsx:22` re-reads `data`, passes updated `products` prop to `ProductsTable`.
`ProductsTable.tsx:85` renders `{formatVND(p.price)}` → shows "48.000đ".
`ProductPageHeader` receives the same `count` (unchanged) and does not visibly change.

**One invalidation, one refetch, every subscribed widget in sync.** No widget told another
widget anything directly.

---

## 4. Three layers of state — what belongs where

| Data | Layer | Lives in | Why |
|---|---|---|---|
| Product list (all rows + their toppings/categories) | **Server state** | TanStack Query `['admin','products']` | shared by table + header count; refetchable from BE |
| Categories for form dropdown | **Server state** | TanStack Query `['categories']` | public catalog; shared with customer menu |
| Toppings for form checkboxes | **Server state** | TanStack Query `['admin','toppings']` | catalog; same as above |
| "Is the modal open + which product?" | **Local UI state** | `page.tsx useState:19` | ephemeral; does not survive reload; owned by the page that spawns the modal |
| Form field values (name, price, etc.) | **Form state** | RHF inside `ProductFormModal` | single-widget; irrelevant to other components; validated before mutation |
| `imagePath` + `imagePreview` + `uploading` | **Local UI state** | `ProductFormModal useState:35-37` | upload lifecycle; single-widget |
| `seedLoading` | **Local UI state** | `page.tsx useState:20` | disable seed button during async seed; single-widget |

> **The rule of thumb:** if more than one widget needs it → TanStack Query (server state) or lift
> to `page.tsx` props. If it's "this widget's UI right now" → `useState`. If it comes from the BE
> and is shared → TanStack Query. There is no cross-widget client state on this page → no Zustand
> needed.

---

## 5. Cross-component vs cross-page (don't confuse them)

This file covers cross-**component** (widgets on one page, one browser tab). For cross-**page**
implications (e.g., how a price change here affects the customer-facing menu) see
[admin_products_crosspage_dataflow.md](admin_products_crosspage_dataflow.md).

| Scope | Mechanism | Survives F5? | For this edit |
|---|---|---|---|
| **Cross-component** (`/admin/products` widgets) | TanStack Query cache `['admin','products']` | No (in-memory) | all three widgets re-render from the single cache entry after invalidation |
| **Cross-page** (products → customer menu, KDS, etc.) | BE DB row + server cache invalidation at BE (`products:list`) | ✅ (persisted in DB) | the `PATCH /products/:id` write is what other pages eventually read |

---

## 6. The availability toggle — known broken (link only)

`ProductsTable.tsx:89` renders:

```tsx
// ProductsTable.tsx:88-91
<Badge
  ...
  onClick={() => onToggle(p.id, !p.is_available)}
>
```

`onToggle` wires to `toggleMut` in `page.tsx:44-49`:

```ts
// page.tsx:44-49
const toggleMut = useMutation({
  mutationFn: ({ id, is_available }) => toggleAvailability(id, is_available),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'products'] }),
  onError:   () => toast.error('Không thể cập nhật trạng thái'),
})
```

The FE flow is correct (same `invalidateQueries` pattern). However, the BE handler for
`PATCH /products/:id/availability` routes to the same `UpdateProduct` handler that **never reads
`is_available`** from the request body — the toggle always 400s. This bug is documented in
[PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) (referenced from [admin_products_be.md §6](admin_products_be.md)).

---

## 7. Gotchas worth remembering

- **`ProductFormModal` is dynamically imported.** `page.tsx:13-15` wraps it in `next/dynamic`:
  the modal bundle is not loaded until the first time it is opened. This means `useQuery(['categories'])`
  and `useQuery(['admin','toppings'])` inside the modal do **not** fire on page load — only when the
  modal first mounts. Cold open may show a brief loading state for those dropdowns.
- **`invalidateQueries` is called by the modal, not the page.** `ProductFormModal` holds its own
  `qc = useQueryClient()` (`ProductFormModal.tsx:33`) and calls `invalidate()` on success. The key
  string `['admin','products']` must stay in sync between `page.tsx:23` and `ProductFormModal.tsx:100`
  or the refetch will silently not fire.
- **The `products` prop is a snapshot.** `ProductsTable` and `ProductPageHeader` receive the cache
  data as a React prop. Between a mutation completing and the refetch finishing there is a moment
  when the displayed list is stale. There is no optimistic update on this page (unlike
  `admin_overview` which uses `queryClient.setQueryData`) — the edit is only reflected after the
  refetch (`GET /products/all`) returns.
- **Delete is admin-only, not manager.** `deleteMut` (`page.tsx:28-42`) calls `DELETE /products/:id`
  which requires the `admin` role. A manager who reaches this page can create/edit but will receive
  a 403 on delete. The FE does not hide the "Xóa" button based on role — the error is surfaced only
  via the 409/generic error toast. See [admin_products_be.md §Auth Model](admin_products_be.md).
- **N+1 query on `GET /products/all`.** Each page load fetches toppings per product in a loop
  server-side. On 30 s `staleTime`, this is tolerable at current scale. Documented in
  [admin_products_be.md §1](admin_products_be.md).
- **`['admin']` broad invalidation in seed.** The seed handler (`page.tsx:106`) calls
  `qc.invalidateQueries({ queryKey: ['admin'] })` — a broad invalidation that will also mark
  `['admin','toppings']` stale. This is intentional: seed creates categories, toppings, staff, and
  products in sequence, so all admin queries should refresh.

---

## 8. The whole edit on one timeline (sequence view)

```
  Manager       ProductsTable      page.tsx         ProductFormModal   TanStack Query      BE
     │                │                │                    │                │              │
     │  (page load)   │                │                    │                │              │
     │                │    useQuery    │                    │                │              │
     │                │◄──────────────┤── ['admin','products'] ─────────────► GET /products/all ─►│
     │                │                │                    │          data: Product[]      │
     │                │◄─ products[]   │                    │                │              │
     │                │   prop passed  │                    │                │              │
     │  (renders)     │                │                    │                │              │
     │                │                │                    │                │              │
     ├─ click "Sửa" ─►│                │                    │                │              │
     │                ├── onEdit(p) ──►│                    │                │              │
     │                │                ├─ setModal({open:true, product:p})   │              │
     │                │                ├──────────────────► open={true}      │              │
     │                │                │                   product={p}       │              │
     │                │                │                    │                │              │
     │                │                │                    ├─ useQuery ['categories'] ────► GET /categories
     │                │                │                    ├─ useQuery ['admin','toppings'] ► GET /toppings
     │                │                │                    ├─ reset(form) from product prop │
     │                │                │                    │                │              │
     ├─ type "48000" ─────────────────────────────────────►│ RHF local state│              │
     │                │                │                    │                │              │
     ├─ click "Lưu"  ─────────────────────────────────────►│                │              │
     │                │                │                    ├─ saveMut.mutate(values) ──────► PATCH /products/:id
     │                │                │                    │                │   200 OK     │
     │                │                │                    ├─ invalidateQueries(['admin','products'])
     │                │                │                    │                │              │
     │                │                │                    ├─ onClose() ───►│              │
     │                │                ├─ setModal({open:false})             │              │
     │                │                │                    │ (unmounts)     │              │
     │                │                │                    │           background refetch  │
     │                │                │                    │                ├── GET /products/all ►│
     │                │                │                    │          data: Product[]      │
     │                │                │   products[]       │          (price = 48000)      │
     │                │◄──────────────── prop updated ──────┤                │              │
     ├─ (sees 48.000đ)│                │                    │                │              │
```

---

## 9. Source & rule map

| Topic | Source of truth |
|---|---|
| Page zones / wireframe / object model | [admin_products.md](admin_products.md) |
| BE endpoints, auth, caching, N+1, errors | [admin_products_be.md](admin_products_be.md) |
| Known bugs (availability toggle broken) | [PRODUCTS_BUGS.md](PRODUCTS_BUGS.md) |
| Product type shape (`Product`, `Topping`, `Category`) | [`fe/src/types/product.ts`](../../../../../fe/src/types/product.ts) |
| `listProducts` / `updateProduct` / `toggleAvailability` / `uploadFile` | [`fe/src/features/admin/admin.api.ts:39-52`](../../../../../fe/src/features/admin/admin.api.ts) |
| State layers rule (Query vs Zustand vs useState) | `fe/CLAUDE.md §Architecture` |
| Cross-page implications (price change → customer menu) | [admin_products_crosspage_dataflow.md](admin_products_crosspage_dataflow.md) |
| Loading states (isLoading skeleton, modal lazy load) | [admin_products_loading.md](admin_products_loading.md) |
| End-to-end narrative | [SCENARIO_PRODUCT_CRUD.md](SCENARIO_PRODUCT_CRUD.md) |

---

> **One-line mental model:** on `/admin/products`, *the TanStack Query cache `['admin','products']`
> is the single shared hub — `page.tsx` reads it and passes the array down by props; every mutation
> (create, update, delete, toggle) ends with `invalidateQueries(['admin','products'])` so the table
> always reflects the latest BE state; the form modal is isolated with its own local queries and form
> state, communicating its result only by invalidating the shared cache key.*
