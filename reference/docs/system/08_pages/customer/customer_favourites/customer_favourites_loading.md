# Customer Favourites Suite — Loading States

> **TL;DR:** ✅ implemented · how `/menu/favourites`, `/menu/favourites/save`, and
> `/menu/favourites/sets` behave while data is in flight. All three pages share the same two
> TanStack Query calls (`['products-all']` and `['combos']`), both with `staleTime: 5 min` and
> `defaultData: []`. **There is no skeleton, no spinner, and no error banner on any of these
> pages** — a cold load, an empty favourites list, and a BE failure are all visually
> indistinguishable until both queries resolve.
>
> Page overview → [customer_favourites.md](customer_favourites.md) ·
> BE view (endpoints + cache TTL) → [customer_favourites_be.md](customer_favourites_be.md) ·
> Component wiring → [customer_favourites_crosscomponent_dataflow.md](customer_favourites_crosscomponent_dataflow.md) ·
> Cross-page state → [customer_favourites_crosspage_dataflow.md](customer_favourites_crosspage_dataflow.md) ·
> Scenario → [SCENARIO_FAVOURITES.md](SCENARIO_FAVOURITES.md)
>
> Traced from source on branch `experience_claude.md_system_1`. Sources:
> `fe/src/app/(shop)/loading.tsx` ·
> `fe/src/app/(shop)/menu/favourites/page.tsx` ·
> `fe/src/app/(shop)/menu/favourites/save/page.tsx` ·
> `fe/src/app/(shop)/menu/favourites/sets/page.tsx` ·
> `fe/src/store/favourites.ts`

---

## Loading Layers (outer → inner)

```
1. Route navigation  → ShopLoading (centered orange spinner, whole shop shell)
2. Page mounts       → no Suspense boundary, no page-level fallback
3. Two useQuery calls fire simultaneously → products-all + combos
   Both default to [] → page renders from store state immediately
   Items pop in silently once both queries resolve
```

### 1 — Route-level spinner · `fe/src/app/(shop)/loading.tsx:1-7`

Next.js App Router renders this file for the **entire `(shop)` route group** during navigation
into any shop route, including all three favourites pages. It is a plain centered spinner:

- Container: `flex h-64 items-center justify-center`.
- Indicator: `h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500`.
- Not favourites-specific — shared by every `(shop)` page.

This layer covers the navigation gap only. Once the page component mounts, this spinner
disappears and control passes to layer 3.

### 2 — Suspense boundary

There is **no `<Suspense>` wrapper** on any of the three favourites pages. None of them call
`useSearchParams()` or any other suspending hook, so no Suspense boundary is needed or present.

### 3 — Per-query states (all three pages)

All three pages issue the same two `useQuery` calls:

| Query | `queryKey` | `queryFn` | `staleTime` | Default value |
|---|---|---|---|---|
| All products | `['products-all']` | `GET /products` → `r.data.data` | `5 * 60 * 1000` ms | `[]` |
| All combos | `['combos']` | `GET /combos` → `r.data.data` | `5 * 60 * 1000` ms | `[]` |

Sources:
- `favourites/page.tsx:25-35`
- `favourites/save/page.tsx:26-36`
- `favourites/sets/page.tsx:60-69`

Neither query destructures `isLoading`, `isFetching`, or `isError`. Both default to `[]`. The
pages render immediately from the persisted Zustand store (`useFavouritesStore`) and overlay
resolved product/combo data once it arrives. There is no skeleton, no placeholder card, and no
per-query error banner on any of the three pages.

**Endpoint details and cache TTL are not restated here — see
[customer_favourites_be.md](customer_favourites_be.md).**

---

## Main Content Branch — `/menu/favourites` (`page.tsx`)

The primary favourites page renders exactly one of two top-level states based on `resolvedItems`
— the `flatMap` output that cross-references store ids against whichever products/combos have
already resolved:

| Order | Condition | Renders | Source |
|---|---|---|---|
| 1 | `resolvedItems.length === 0` | `<EmptyState icon="♡" message="Nhấn ♥ trên món ăn bất kỳ để thêm" />` | `page.tsx:128-129` |
| 2 | `resolvedItems.length > 0` | `<FavouriteFilterTabs>` + list of `<FavouriteItemCard>` per filtered item | `page.tsx:131-143` |

`<FavouritesFooter>` (set count + action buttons) is rendered **outside** this branch on every
render, unconditionally — `page.tsx:146-151`.

### The empty-state conflation problem

`resolvedItems` is built by `flatMap` with an early-return `[]` for any id that does not yet
appear in `allProducts` or `allCombos` (`page.tsx:52-85`). During the window when both queries
are still in flight, **every stored favourite id silently resolves to nothing**, so
`resolvedItems.length === 0` is always `true`.

The result is that the page shows the EmptyState message — "Nhấn ♥ trên món ăn bất kỳ để
thêm" — during three visually identical situations:

1. **Cold load** — queries in flight, data not yet arrived.
2. **Genuinely empty** — the user has no saved favourites.
3. **Fetch failed** — both queries swallowed errors to `[]`; ids can never resolve.

There is no spinner, no "Loading…" text, and no error banner to distinguish these three states.

---

## Stale-removal `useEffect` guard · `page.tsx:38-50`

Once both queries have settled (`productsLoaded && combosLoaded`), a `useEffect` fires and
removes any stored favourite whose id no longer exists in the catalogue:

```ts
// page.tsx:38-50
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
  toast.warning('Một số món không còn phục vụ đã được xoá khỏi danh sách yêu thích')
}, [productsLoaded, combosLoaded])
```

The guard `if (!productsLoaded || !combosLoaded) return` ensures the effect **does not fire
until both queries succeed**. This prevents premature pruning: if only products have resolved,
combo ids are not falsely treated as stale. The dependency array contains only `[productsLoaded,
combosLoaded]` — the effect runs once per mount when both flip to `true`.

This is the **only** place in the suite that uses `isSuccess` (`productsLoaded`/`combosLoaded`)
— the other two pages do not check query success at all.

---

## Main Content Branch — `/menu/favourites/save` (`save/page.tsx`)

The save-set page also resolves favourites via `flatMap` (`save/page.tsx:38-71`) using the same
pattern. While queries are in flight:

- The name input field renders immediately (it does not depend on query data).
- `<FavouritesSummaryList items={resolvedItems} />` receives an empty `[]` until both queries
  resolve. For an empty list it still renders its container — the "Tóm tắt:" heading, no item
  rows (the `items.map` is empty), and a `Tổng: 0đ` total (`reduce` over `[]` →
  `FavouritesSummaryList.tsx:10,14-44`). So mid-load the summary box looks like a zero-total
  stub rather than a spinner.
- The "💾 Lưu set này" button is disabled until the form is valid (`isValid` from RHF), not
  gated on query state — `save/page.tsx:111-118`. A user could technically save an empty set if
  they type a name before queries resolve.

---

## Main Content Branch — `/menu/favourites/sets` (`sets/page.tsx`)

The sets page gates on `sets.length` from the Zustand store, **not** on query state:

| Order | Condition | Renders | Source |
|---|---|---|---|
| 1 | `sets.length === 0` | Blue empty panel + `<EmptyState icon="♡" message="Chưa có set nào">` + back button | `sets/page.tsx:104-116` |
| 2 | `sets.length > 0` | List of `<SetCard>` per saved set | `sets/page.tsx:118-132` |

`resolveItems()` (`sets/page.tsx:14-53`) is called **per set on every render** inside the `.map`
loop. While queries are in flight, each `SetCard` receives a `resolvedItems=[]` (every id drops
via `flatMap`). For an empty `resolvedItems`, `SetCard` still renders the card chrome: the set
name (`📋 {set.name}`), no item-summary rows (the `.slice(0,5).map` is empty), and a footer that
reads **`{set.items.length} món · 0đ`** — note the count comes from the **snapshot**
`set.items.length`, not from `resolvedItems`, so a card shows e.g. "3 món · 0đ" while data loads,
then fills its item lines once the queries return (`SetCard.tsx:20,49,55-79`). No explicit
loading signal is shown.

---

## Stale Cache (within 5-minute window)

All three pages share query keys `['products-all']` and `['combos']` with the menu page
(`fe/src/app/(shop)/menu/page.tsx` uses the same keys and the same `staleTime`). If the user
navigates from `/menu` → `/menu/favourites` within 5 minutes of the menu's last fetch, **both
queries are served from the TanStack Query in-memory cache instantly** — no network request
fires and `isSuccess` (`productsLoaded`, `combosLoaded`) is already `true` on first render.
The empty-state window described above is effectively zero duration in this case.

If the app is cold-opened directly at `/menu/favourites`, both queries fire in parallel on mount
and the empty-state window lasts until both settle (one RTT each, concurrent).

---

## State Table (what the user sees at each phase)

| Phase | `/menu/favourites` | `/menu/favourites/save` | `/menu/favourites/sets` |
|---|---|---|---|
| Navigation in progress | Orange spinner (route-level `loading.tsx`) | Orange spinner | Orange spinner |
| Page mounted, queries in flight | EmptyState "Nhấn ♥…" (resolvedItems=[]) | Summary list empty; name input active | SetCard list with empty resolved items (if sets exist); EmptyState if sets=0 |
| Both queries resolved, items present | FavouriteFilterTabs + FavouriteItemCard list | FavouritesSummaryList populated | SetCard list populated with names/prices |
| Both queries resolved, no items | EmptyState "Nhấn ♥…" | FavouritesSummaryList empty | EmptyState "Chưa có set nào" (if sets=0) |
| Fetch error (either query) | EmptyState "Nhấn ♥…" — **indistinguishable from empty** | FavouritesSummaryList empty | SetCard resolved items stay empty — **no error shown** |
| Revisit within 5 min of menu visit | Items appear immediately (cache hit) | Summary appears immediately | SetCard items appear immediately |

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **Empty, loading, and error are visually identical on `/menu/favourites`** | `resolvedItems.length === 0` is true during all three conditions. No spinner, no error banner, no "Loading…" text. A network failure is silent. Source: `page.tsx:128-129`. |
| 2 | **No loading gate on save/sets pages** | `save/page.tsx` and `sets/page.tsx` do not destructure `isLoading` or `isSuccess`. The summary list and SetCard content silently arrive after the queries return, with no visual feedback to the user. |
| 3 | **Save-set button not gated on query state** | A user who types a set name before queries resolve can save a set that captures items that will show as empty. The `isValid` RHF gate only checks the name field — `save/page.tsx:111-118`. |
| 4 | **`FavouritesSummaryList` shows a `Tổng: 0đ` stub while loading** | With `items=[]` it renders the "Tóm tắt:" heading + no rows + a zero total — not a spinner (`FavouritesSummaryList.tsx:10,14-44`). |
| 5 | **`SetCard` footer count comes from the snapshot, not resolved data** | While `resolvedItems=[]`, the footer still reads `{set.items.length} món · 0đ` (count from the snapshot `set.items`, price from resolved → 0), then item lines fill in once queries return (`SetCard.tsx:20,55-79`). |
| 6 | **staleTime shared with menu — no favourites-specific cache** | All three pages piggyback on the menu's query cache. If the menu cache is evicted (e.g. app backgrounded long enough) all three pages hit the cold-load state on the next visit. This is by design but there is no separate TTL for the favourites context. |
