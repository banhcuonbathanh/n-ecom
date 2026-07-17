# Customer Favourites — Cross-Component Data Flow ("add all to cart" in depth)

> **Status:** ✅ implemented  
> **What this is:** a deep zoom on the central cross-component story of the favourites suite —
> *a guest bulk-adds their saved favourites to the cart* — told from the **three-page suite's point
> of view** (`/menu/favourites`, `/menu/favourites/save`, `/menu/favourites/sets`). It answers one
> question: **how do the widgets on and across these three pages share state through the two stores,
> without prop-drilling?**
>
> Siblings in this set:
> - [customer_favourites.md](customer_favourites.md) — zones, wireframe, object model.
> - [customer_favourites_be.md](customer_favourites_be.md) — the two BE endpoints traced.
> - [customer_favourites_crosspage_dataflow.md](customer_favourites_crosspage_dataflow.md) — how
>   favourites + cart data survive across navigations and devices.
> - [customer_favourites_loading.md](customer_favourites_loading.md) — loading and empty states.
> - [SCENARIO_FAVOURITES.md](SCENARIO_FAVOURITES.md) — end-to-end narrative.
>
> Traced from source on branch `experience_claude.md_system_1`:  
> [`fe/src/store/favourites.ts`](../../../../../fe/src/store/favourites.ts) ·
> [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) ·
> [`fe/src/app/(shop)/menu/favourites/page.tsx`](../../../../../fe/src/app/(shop)/menu/favourites/page.tsx) ·
> [`fe/src/app/(shop)/menu/favourites/save/page.tsx`](../../../../../fe/src/app/(shop)/menu/favourites/save/page.tsx) ·
> [`fe/src/app/(shop)/menu/favourites/sets/page.tsx`](../../../../../fe/src/app/(shop)/menu/favourites/sets/page.tsx) ·
> [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts)

---

## 0. The action, in one line

> A guest opens Favourites, sees their saved items, adjusts quantities on a couple of cards, then
> taps **"Thêm tất cả vào giỏ hàng"** — all resolved items land in the cart in one shot.

The whole story before any byte leaves the browser: the `useFavouritesStore` (persisted in
`localStorage`) is the single source of items and sets; `useCartStore` is the write target; the
TanStack Query cache (`GET /products` + `GET /combos`) is the hydration layer that bridges raw stored
IDs to display-ready cards.

### The whole picture on one screen

```
                    /menu/favourites  (list page)
┌─────────────────────────────────────────────────────────────────┐
│  FavouritesTopNav   "❤ Yêu thích"         🛒 [count badge] ◀──┐ │
├─────────────────────────────────────────────────────────────────┤ │
│  FavouriteFilterTabs  [Tất cả (3)]  [Món lẻ (2)]  [Combo (1)] │ │
│                         ↑ counts from resolvedItems            │ │
├─────────────────────────────────────────────────────────────────┤ │
│  FavouriteItemCard × N   ──writes qty──▶  useFavouritesStore   │ │
│                           ──writes remove─▶                    │ │
├─────────────────────────────────────────────────────────────────┤ │
│  FavouritesFooter   [📋 Sets (2)]  [💾 Lưu set]  [🛒 Thêm tất cả]│
│                                               │                │ │
│                   handleAddAllToCart ─────────┼──writes──▶ useCartStore ──┘
└─────────────────────────────────────────────────────────────────┘
             ↑ resolvedItems built from:
    ┌─────────────────────────────────────────────────┐
    │      TanStack Query (server state)              │
    │  ['products-all']  GET /products  5-min stale   │
    │  ['combos']        GET /combos    5-min stale   │
    └─────────────────────────────────────────────────┘
             ↑ hydrates
    ┌─────────────────────────────────────────────────┐
    │    useFavouritesStore  (Zustand + persist)      │
    │    key: STORAGE_KEYS.FAVOURITES = 'favourites'  │
    │    items[]  sets[]                              │
    └─────────────────────────────────────────────────┘
```

**Read it like this:** taps flow *down* into the stores (`writes`); renders flow *up* out of the
stores (`reads`). The resolve step (IDs → display cards) bridges the persisted store to the live
catalog. No arrow ever goes widget-to-widget.

---

## 1. The cast of components

| Page | Component | Role | Store access |
|---|---|---|---|
| `/menu/favourites` | `FavouritesPage` (page.tsx) | orchestrator; builds `resolvedItems`, `filteredItems`, `counts`; owns `handleAddAllToCart`; runs stale-removal `useEffect` | reads `useFavouritesStore.items` + `sets`; writes `removeItem`, `updateQty`; writes `useCartStore.addItem` |
| `/menu/favourites` | `FavouritesTopNav` | sticky header; shows cart badge | reads `useCartStore.itemCount()` (`cart.ts:125`) |
| `/menu/favourites` | `FavouriteFilterTabs` | tab bar; shows per-tab counts | pure presentational — receives `counts` prop from page; tab active state is page-local `useState` |
| `/menu/favourites` | `FavouriteItemCard` | one item row; shows name/image/toppings/qty stepper; remove button | pure presentational — receives `item`, `onRemove`, `onQtyChange` from page |
| `/menu/favourites` | `FavouritesFooter` | fixed bottom; "Thêm tất cả", "Lưu set", "Xem sets" buttons | pure presentational — receives callbacks from page |
| `/menu/favourites/save` | `SaveSetPage` | name input + summary; calls `addSet` on submit | reads `useFavouritesStore.items`; writes `useFavouritesStore.addSet` |
| `/menu/favourites/save` | `FavouritesSummaryList` | read-only display of resolved items + total | pure presentational — receives `items: FavouriteItemResolved[]` prop |
| `/menu/favourites/sets` | `SetsPage` | lists saved sets; owns `handleApplySet` | reads `useFavouritesStore.sets`; writes `renameSet`, `deleteSet`; writes `useCartStore.addItem` |
| `/menu/favourites/sets` | `SetCard` | one set card; shows items, total, rename/delete/apply actions | receives `set`, `resolvedItems`, `onApply`, `onRename`, `onDelete` from page; rename UI uses local `useState` |

**The pattern:** presentational leaf components hold zero store bindings. All store reads and writes
are centralised in the three page components. Props flow **down** (page → widget), store mutations
flow **up** (tap → page callback → store). No widget reaches into a store directly except the two
pages and `FavouritesTopNav` (cart badge only).

---

## 2. The two stores — single sources

### 2.1 `useFavouritesStore` (the favourites hub)

Defined at [`fe/src/store/favourites.ts:43`](../../../../../fe/src/store/favourites.ts).

Full store shape and field definitions live in
[`../../../07_business_logic/LOGIC_FE.md`](../../../07_business_logic/LOGIC_FE.md) — the summary here
is the cross-component contract only.

```
useFavouritesStore  (Zustand + persist)
├── items: FavouriteItem[]          ← persisted; the guest's saved item IDs + qty + toppingIds
│   each FavouriteItem: { id, type: 'product'|'combo', qty (min:1), toppingIds: string[] }
├── sets:  FavouriteSet[]           ← persisted; named snapshots of items[]
│   each FavouriteSet: { id (UUID), name, createdAt (ISO), items: FavouriteItem[] }
│
├── writes (mutations)
│   addItem(item)     → dedup by id+type; if exists, no-op  (favourites.ts:49–51)
│   removeItem(id)    → filter items by id                  (favourites.ts:54–55)
│   updateQty(id,qty) → map items; Math.max(1,qty)          (favourites.ts:57–60)
│   addSet(name)      → snapshot current items[] into new set (favourites.ts:62–69)
│   renameSet(id,n)   → map sets                            (favourites.ts:72–75)
│   deleteSet(id)     → filter sets                         (favourites.ts:77–79)
│   isFavourite(id,t) → read-only predicate                 (favourites.ts:80–81)
│   toggleFav(id,t)   → add or remove by id+type            (favourites.ts:83–90)
│
└── persistence key: STORAGE_KEYS.FAVOURITES = 'favourites'  (storage-keys.ts:4)
    (entire state persisted — items + sets survive reload)
```

> `STORAGE_KEYS.FAVOURITES` is `'favourites'` — confirmed at
> [`fe/src/lib/storage-keys.ts:4`](../../../../../fe/src/lib/storage-keys.ts).

### 2.2 `useCartStore` (the cart target)

Defined at [`fe/src/store/cart.ts:40`](../../../../../fe/src/store/cart.ts).

The cart store shape and persistence rules are the canonical fact in
[`../../../07_business_logic/LOGIC_FE.md`](../../../07_business_logic/LOGIC_FE.md). For this page the
only relevant surface is:

```
useCartStore
├── addItem(CartItem) → dedup by id (quantity bump if exists)  (cart.ts:50–60)
├── itemCount()       → Σ quantity (selector, computed on read) (cart.ts:125)
│
└── persistence: items[] is NOT persisted (session-only)
    partialize: only { orderNote, activeOrderId } survive reload  (cart.ts:153)
```

### 2.3 Selectors: how counts and the filter derive from store state

`FavouritesPage` computes three derived values **inline** (not in the store) each render:

```ts
// page.tsx:52–85  — resolve step: store IDs → display cards
const resolvedItems: FavouriteItemResolved[] = items.flatMap(item => { … })

// page.tsx:87–89  — filter: local activeTab state gates resolvedItems
const filteredItems = activeTab === 'all'
  ? resolvedItems
  : resolvedItems.filter(i => i.type === activeTab)

// page.tsx:91–95  — counts: derived from resolvedItems (post-resolve, post-stale-removal)
const counts = {
  all:     resolvedItems.length,
  product: resolvedItems.filter(i => i.type === 'product').length,
  combo:   resolvedItems.filter(i => i.type === 'combo').length,
}
```

`counts` is passed as a prop to `FavouriteFilterTabs` — the tab component never touches the store.
Counts reflect only items that **resolved** (i.e., still exist in the catalog), not raw `items.length`.

---

## 3. "Add all to cart", step by step — who writes, who reads

### Step 1 — Page mount: store IDs hydrate against the catalog

On mount, `FavouritesPage` fires two TanStack queries in parallel:

```
useQuery(['products-all'])  →  GET /products   staleTime: 5 min  (page.tsx:25–29)
useQuery(['combos'])        →  GET /combos     staleTime: 5 min  (page.tsx:31–35)
```

Both queries use the **same queryKeys** as `/menu/page.tsx`, so if the guest came from the menu
page the data is already in-cache — **no network round trip**. If cold, both fire concurrently.

```
STORE SNAPSHOT AT STEP 1
┌─────────────────────────────────────────────────────┐
│ useFavouritesStore (loaded from localStorage)       │
│  items: [                                           │
│    { id:"<product-A>", type:"product", qty:2, toppingIds:["<t1>"] },
│    { id:"<combo-B>",   type:"combo",   qty:1, toppingIds:[]       },
│  ]                                                  │
│  sets:  [ { id:"<s1>", name:"Bữa sáng", items:[…] } ]
└─────────────────────────────────────────────────────┘
```

### Step 2 — Stale-removal: dead IDs are pruned automatically

When both queries succeed (`productsLoaded && combosLoaded`), a `useEffect` runs once
([`page.tsx:38–50`](../../../../../fe/src/app/(shop)/menu/favourites/page.tsx)):

```ts
useEffect(() => {
  if (!productsLoaded || !combosLoaded) return
  const currentItems = useFavouritesStore.getState().items
  const stale = currentItems.filter(item =>
    item.type === 'product'
      ? !allProducts.some(p => p.id === item.id)
      : !allCombos.some(c => c.id === item.id)
  )
  if (stale.length === 0) return
  stale.forEach(item => removeItem(item.id))
  toast.warning('Một số món không còn phục vụ đã được xoá …')
}, [productsLoaded, combosLoaded])
```

`removeItem` writes into `useFavouritesStore` → store updates → page re-renders →
`resolvedItems` shrinks → `FavouriteFilterTabs` counts update — all without any prop-passing.

> **Note:** the `useEffect` dependency array only lists `[productsLoaded, combosLoaded]` (booleans),
> not `allProducts`/`allCombos`. This is safe because the flags only flip once (false → true) per
> mount, but it means the stale check won't re-run if the catalog changes mid-session without a
> remount. The `// eslint-disable-next-line` comment at `page.tsx:49` acknowledges this.

### Step 3 — Resolve: raw FavouriteItem[] → FavouriteItemResolved[]

After hydration, each `items[]` entry is joined against the catalog inline at
[`page.tsx:52–85`](../../../../../fe/src/app/(shop)/menu/favourites/page.tsx):

| Item type | Resolved from | Produces |
|---|---|---|
| `product` | `allProducts.find(x => x.id === item.id)` | `name`, `imageUrl`, `basePrice`, `selectedToppings` (filtered by `toppingIds`), `subtotalPerPortion = basePrice + Σ topping.price` |
| `combo` | `allCombos.find(x => x.id === item.id)` | `name`, `imageUrl`, `basePrice`, `comboItems` (names via nested product lookup), `subtotalPerPortion = basePrice` |

`FavouriteItemResolved` is the hydrated type declared at
[`fe/src/store/favourites.ts:21–28`](../../../../../fe/src/store/favourites.ts). Items that fail
the `find` (stale, but not yet pruned in this render) are silently dropped via `flatMap`.

### Step 4 — Filter tabs gate the displayed list

`activeTab` is **page-local** `useState<FavouriteTab>('all')` (`page.tsx:20`). It is never stored
in either Zustand store. `FavouriteFilterTabs` receives `counts` and `onChange` as props; it emits
`onChange(tab.key)` on click, which calls `setActiveTab` in the page — a standard lifted-state
pattern:

```
Guest taps "Món lẻ" tab
  → FavouriteFilterTabs.onChange('product')
  → setActiveTab('product')   [page-local useState]
  → filteredItems re-derived  → FavouriteItemCard list re-renders
  → counts displayed in tab labels stay the same (they come from resolvedItems, not filteredItems)
```

`FavouriteItemCard` is a **pure presentational component** — it renders whatever `item` prop it
receives and emits `onRemove(item.id)` or `onQtyChange(item.id, n)`. The page owns the callbacks:

```ts
// page.tsx:134–141
filteredItems.map(item => (
  <FavouriteItemCard
    key={item.id}
    item={item}
    onRemove={removeItem}       ← useFavouritesStore.removeItem
    onQtyChange={updateQty}     ← useFavouritesStore.updateQty
  />
))
```

When the guest taps remove on a card: `removeItem(id)` writes the store → items[] shrinks →
`resolvedItems` recomputes → `filteredItems` recomputes → the card disappears → `counts` update →
`FavouriteFilterTabs` re-renders with new counts → `FavouritesTopNav` is unaffected (it only reads
`useCartStore`, not the favourites store).

When the guest changes qty on a card: `updateQty(id, qty)` writes the store → `Math.max(1, qty)`
clamps minimum → `resolvedItems` re-resolves with the new qty (qty propagates via `...item` spread
at `page.tsx:59`/`page.tsx:76`) → `FavouritesSummaryList` (on `/save`) would reflect this on its
next render.

### Step 5 — "Thêm tất cả vào giỏ hàng" (the main cross-store write)

`FavouritesFooter` receives `onAddAllToCart` as a prop. The handler lives in the page
([`page.tsx:97–122`](../../../../../fe/src/app/(shop)/menu/favourites/page.tsx)):

```ts
const handleAddAllToCart = () => {
  resolvedItems.forEach(item => {
    const cartItem: CartItem = item.type === 'product'
      ? {
          id:       `product_${item.id}_${item.toppingIds.sort().join('-')}`,
          type:     'product', product_id: item.id,
          name:     item.name, quantity: item.qty,
          price:    item.subtotalPerPortion,
          toppings: item.selectedToppings.map(t => ({ id: t.id, name: t.name, price: t.price, is_available: true })),
        }
      : {
          id:       `combo_${item.id}`,
          type:     'combo', combo_id: item.id,
          name:     item.name, quantity: item.qty,
          price:    item.basePrice,
          toppings: [],
        }
    addToCart(cartItem)   // useCartStore.addItem
  })
}
```

Key points:
- Iterates `resolvedItems` (not `filteredItems`) — **all** favourites go to cart regardless of
  active tab. Filtering only controls the list view.
- Cart ID convention for products: `product_<id>_<sorted-toppingIds>` — same id = same logical
  line → dedup (quantity bump via `cart.ts:50–59`).
- Cart ID for combos: `combo_<id>` — no toppings included. The combo's `price` is `basePrice`
  (not subtotal-with-toppings) because combos have `selectedToppings: []` at
  `page.tsx:80`/`favourites.ts:27`.
- After each `addToCart`, `useCartStore.itemCount()` recomputes → `FavouritesTopNav` badge
  updates immediately.

```
STORE SNAPSHOT AFTER STEP 5  (2 products + 1 combo added)
┌─────────────────────────────────────────────────────┐
│ useCartStore.items (in memory, NOT persisted)       │
│  [                                                  │
│    { id:"product_<A>_<t1>", type:'product', qty:2, … },
│    { id:"combo_<B>",        type:'combo',   qty:1, … },
│  ]                                                  │
│  itemCount(): 3    total(): <sum>                   │
└─────────────────────────────────────────────────────┘
   ↑ causes FavouritesTopNav badge to show "3"
   (useFavouritesStore is unchanged)
```

### Step 6 — SetCard "Áp dụng" (the set-driven cart push)

On `/menu/favourites/sets`, `SetsPage` owns `handleApplySet`:

```ts
// sets/page.tsx:72–98
const handleApplySet = (set: FavouriteSet) => {
  const resolved = resolveItems(set.items, allProducts, allCombos)  // local helper, same logic as page.tsx
  resolved.forEach(item => {
    const cartItem: CartItem = … // identical construction to handleAddAllToCart
    addToCart(cartItem)           // useCartStore.addItem
  })
}
```

`SetCard` receives `onApply` as a prop and calls `onApply(set.id)` on button tap
([`SetCard.tsx:82–86`](../../../../../fe/src/app/(shop)/menu/favourites/sets/components/SetCard.tsx)).
The page maps each `sets[]` entry to a `SetCard`, resolving items inline before passing them down:

```ts
// sets/page.tsx:119–128
{sets.map(set => {
  const resolved = resolveItems(set.items, allProducts, allCombos)
  return <SetCard key={set.id} set={set} resolvedItems={resolved} onApply={…} onRename={…} onDelete={…} />
})}
```

Note: `sets[]` items are a **snapshot** taken at save time (`addSet` copies `[...s.items]` at
[`favourites.ts:67`](../../../../../fe/src/store/favourites.ts)). If the current `items[]` list
changed after the set was saved, the set's items are unaffected — apply always uses the frozen
snapshot, not the live store.

### Step 7 — SaveSet: `addSet` snapshots the live list

On `/menu/favourites/save`, `SaveSetPage` reads `useFavouritesStore.items` directly, resolves them
for preview, and on form submit calls `addSet(name)`:

```ts
// save/page.tsx:73–76
const onSubmit = (data: FormData) => {
  addSet(data.name.trim())       // useFavouritesStore.addSet
  router.push('/menu/favourites/sets')
}
```

`addSet` snapshots the current `items[]` into a new `FavouriteSet` entry with a `crypto.randomUUID()`
id ([`favourites.ts:62–69`](../../../../../fe/src/store/favourites.ts)). After `router.push`, the
sets page mounts and reads the updated `sets[]` from the persisted store.

---

## 4. Three layers of state — what belongs where

| Data | Layer | Lives in | Why |
|---|---|---|---|
| Saved item IDs, qty, toppingIds | **Client state (persisted)** | `useFavouritesStore` (localStorage `'favourites'`) | user preference; must survive reload |
| Named sets (snapshots) | **Client state (persisted)** | `useFavouritesStore.sets[]` (same key) | user preference; must survive reload |
| Active filter tab (`'all'` / `'product'` / `'combo'`) | **Local state** | `page.tsx` `useState<FavouriteTab>` | single-page UI; no sibling widget needs it directly |
| SetCard rename in-progress flag + input value | **Local state** | `SetCard.tsx` `useState` | single-widget UI; never shared |
| Catalog (product/combo data) | **Server state** | TanStack Query `['products-all']` + `['combos']` | shared, cacheable, never user-owned |
| Cart lines | **Client state (session)** | `useCartStore.items[]` (not persisted — `cart.ts:153`) | session-only by design; shared across many pages |

---

## 5. Cross-component vs cross-page (explicit boundary)

This file covers cross-**component** (widgets on the favourites suite sharing through stores).
For how the favourites store and cart state persist across navigation, devices, and reloads see
[customer_favourites_crosspage_dataflow.md](customer_favourites_crosspage_dataflow.md).

| Scope | Mechanism | Survives F5? | Key constraint |
|---|---|---|---|
| **Cross-component** (within the favourites suite) | `useFavouritesStore` singleton + `useCartStore` singleton | n/a (in-memory subscriptions) | no props between siblings; stores are the hubs |
| **Cross-page** (favourites → cart → order) | `localStorage` (`'favourites'` key) + in-memory `useCartStore.items[]` | favourites: ✅ · cart items: ❌ | cart items are session-only; only the order id crosses to `/order/:id` |

---

## 6. Gotchas worth remembering

- **`items[]` in `useFavouritesStore` are raw IDs only** — `qty`, `toppingIds`, but no names or
  prices. Every render that needs display data must resolve against the TanStack Query cache. If
  queries are not yet loaded, `resolvedItems` is `[]` (flatMap drops the `!find` cases) and the
  empty state is shown. (`page.tsx:52–85`)

- **`addSet` snapshots, not references.** `sets[].items` is `[...s.items]` at save time
  (`favourites.ts:67`). Edits to `items[]` after saving do not update existing sets. Apply always
  uses the frozen snapshot. This is intentional — sets are "saved states", not live views.

- **"Thêm tất cả" iterates `resolvedItems`, not `filteredItems`.** A guest filtering to "Combo"
  and tapping "Add all" will push products too. This is expected behaviour — the footer acts on the
  full list. (`page.tsx:97–122`)

- **Duplicate resolve logic across three pages.** `page.tsx`, `save/page.tsx`, and `sets/page.tsx`
  all contain functionally identical `resolvedItems` derivation. `sets/page.tsx` extracts it into a
  local `resolveItems()` helper function (`sets/page.tsx:14–53`); the other two inline the same
  logic. This is a code-duplication smell — see Drift section below.

- **`addItem` in favourites is a no-op on duplicate.** `toggleFav` is the public API for
  toggling; `addItem` guards with `if (s.items.some(i => i.id === item.id && i.type === item.type)) return s`
  (`favourites.ts:50–51`). Two products with the same `id` but different types are treated as
  different items (id + type composite key).

- **`updateQty` clamps to minimum 1.** `Math.max(1, qty)` at `favourites.ts:59`. The
  `QuantityStepper` component passed to `FavouriteItemCard` enforces this with `min={1}` prop as
  well, so qty never reaches 0 — removal is explicit via the Heart button only.

- **Cart ID for products encodes sorted toppingIds.** `product_<id>_<t1-t2-...>` at
  `page.tsx:101`. Two adds with the same product but different topping selections produce different
  cart lines (different ids → no dedup). Two adds with the same product + same toppings bump
  quantity via the `useCartStore.addItem` dedup logic. (`cart.ts:50–59`)

- **Combos carry no toppings in the cart push.** `toppings: []` is hard-coded in both
  `handleAddAllToCart` (`page.tsx:118`) and `handleApplySet` (`sets/page.tsx:93`). Combo topping
  selection is not supported in the favourites suite — `selectedToppings: []` is always set for
  combos in the resolve step (`page.tsx:80`).

---

## 7. The whole action on one timeline (sequence view)

```
Guest         FavouritesPage       useFavouritesStore     TanStack Query     useCartStore    TopNav
  │                 │                     │                     │                 │             │
  ├─ navigate ──────▶                     │                     │                 │             │
  │                 ├─ reads items+sets ─▶│ (from localStorage) │                 │             │
  │                 ├─ fires queries ─────┼─────────────────────▶ GET /products   │             │
  │                 │                     │                     │ GET /combos      │             │
  │                 │                     │                     ▼ (maybe cached)  │             │
  │                 ├─◀─ data returned ───┼─────────────────────┤                 │             │
  │                 ├─ stale useEffect ──▶│ removeItem(stale)   │                 │             │
  │                 ├─ resolvedItems ←────┼──join items[] with catalog data       │             │
  │                 ├─ counts ←──────────▶│ derived from resolvedItems            │             │
  │                 │                     │                                        │             │
  ├─ tap qty+──────▶│ onQtyChange(id, n) ▶│ updateQty(id, n)   │                 │             │
  │                 │                     │ Math.max(1, n)       │                 │             │
  │                 ├─ resolvedItems re-derives with new qty                       │             │
  │                 │                                                               │             │
  ├─ tap remove ───▶│ onRemove(id)        ▶ removeItem(id)      │                 │             │
  │                 ├─ resolvedItems shrinks, counts update, tab re-renders        │             │
  │                 │                                                               │             │
  ├─ tap tab ──────▶│ setActiveTab        │ (local useState)    │                 │             │
  │                 ├─ filteredItems re-derived                                    │             │
  │                 │                                                               │             │
  ├─ tap "Thêm tất cả"                                                             │             │
  │          ──────▶│ handleAddAllToCart  │                     │                 │             │
  │                 │  forEach resolvedItems                     │                 │             │
  │                 │  → build CartItem ──┼─────────────────────┼──▶ addItem(x)   │             │
  │                 │  → addToCart(x)     │                     │    (×N items)   │             │
  │                 │                     │                     │                 ▼             │
  │                 │                     │                     │           itemCount()         │
  │                 │                     │                     │           recomputes ─────────▶│
  │                 │                     │                     │                          badge │
  │                 │                     │                     │                          update│
  ▼
(favourites store unchanged; cart now has all favourites)
```

---

## 8. Source & rule map

| Topic | Source of truth |
|---|---|
| Page zones / wireframe / object model | [customer_favourites.md](customer_favourites.md) |
| BE endpoints (GET /products, GET /combos) | [customer_favourites_be.md](customer_favourites_be.md) |
| Favourites store shape + persistence | [`fe/src/store/favourites.ts`](../../../../../fe/src/store/favourites.ts) |
| Cart store shape + persistence rules | [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) |
| localStorage key constants | [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) |
| `FavouriteItemResolved` type | [`fe/src/store/favourites.ts:21–28`](../../../../../fe/src/store/favourites.ts) |
| List page orchestration (resolve, filter, counts, handlers) | [`fe/src/app/(shop)/menu/favourites/page.tsx`](../../../../../fe/src/app/(shop)/menu/favourites/page.tsx) |
| Save-set page | [`fe/src/app/(shop)/menu/favourites/save/page.tsx`](../../../../../fe/src/app/(shop)/menu/favourites/save/page.tsx) |
| Sets list page + handleApplySet | [`fe/src/app/(shop)/menu/favourites/sets/page.tsx`](../../../../../fe/src/app/(shop)/menu/favourites/sets/page.tsx) |
| SetCard (rename local state + apply) | [`fe/src/app/(shop)/menu/favourites/sets/components/SetCard.tsx`](../../../../../fe/src/app/(shop)/menu/favourites/sets/components/SetCard.tsx) |
| State layers (Query / Zustand / useState) | [04_fe/STATE_MANAGEMENT.md](../../../04_fe/STATE_MANAGEMENT.md) |
| Business-logic rules (cart, favourites, RBAC) | [07_business_logic/LOGIC_FE.md](../../../07_business_logic/LOGIC_FE.md) |
| Cross-page data flow (persistence, handoff) | [customer_favourites_crosspage_dataflow.md](customer_favourites_crosspage_dataflow.md) |
| End-to-end narrative | [SCENARIO_FAVOURITES.md](SCENARIO_FAVOURITES.md) |

---

> **One-line mental model:** the favourites suite has **two stores as hubs** — `useFavouritesStore`
> (persisted) holds the guest's saved IDs, and `useCartStore` (session) is the target; every
> widget on every sub-page reads or writes one of those two stores, never each other. The resolve
> step (TanStack Query cache) is the bridge that turns raw IDs into display cards, and
> `handleAddAllToCart` / `handleApplySet` are the valves that drain the resolved list into the cart.
