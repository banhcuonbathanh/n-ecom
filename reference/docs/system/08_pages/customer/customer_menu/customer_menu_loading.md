# Customer Menu — Loading States

> **TL;DR:** ✅ implemented · how `/menu` behaves while data is in flight. Three layers:
> (1) a route-level spinner during navigation, (2) a `Suspense` boundary for `useSearchParams`,
> (3) per-query states inside the page — only the **products** query renders a skeleton; the rest
> default to `[]` and render nothing until they arrive.
> Page overview → [customer_menu.md](customer_menu.md) · BE view → [customer_menu_be.md](customer_menu_be.md)

> Traced from source on branch `experience_claude.md_system_1_test_iphon2_change_code` (NOT from docs).
> Sources: `fe/src/app/(shop)/loading.tsx` · `fe/src/app/(shop)/menu/page.tsx`.

---

## Loading Layers (outer → inner)

```
1. Route navigation → ShopLoading (centered orange spinner, whole shop shell)
2. MenuPage mounts  → <Suspense> fallback (empty) wraps MenuContent — for useSearchParams
3. MenuContent runs → 4 TanStack queries fire; only `products` drives a visible skeleton
```

### 1 — Route-level spinner · `fe/src/app/(shop)/loading.tsx`

Next.js App Router renders this for the **entire `(shop)` route group** during server-side
navigation into any shop page (including `/menu`). It is a single centered spinner:

- `h-64` centered flex container · `h-8 w-8` ring, `animate-spin`, `border-t-orange-500`.
- Not menu-specific — shared by all `(shop)` routes. No skeleton, no layout.

### 2 — Suspense boundary · `menu/page.tsx:201-207`

`MenuPage` wraps `MenuContent` in `<Suspense>` with **no `fallback` prop** (empty fallback).
Required because `MenuContent` calls `useSearchParams()` (`?add_to_order=`), which suspends during
SSR/prerender. In practice the route-level spinner (layer 1) covers this window; the empty
fallback is effectively invisible.

### 3 — Per-query states · `MenuContent`

The page fires four `useQuery` calls, all `staleTime: 5 * 60 * 1000` (no re-loading spinner on
revisit within 5 min). Only one has a visible loading UI:

| Query | `queryKey` | Default | Loading UI | Notes |
|---|---|---|---|---|
| Categories | `['categories']` | `[]` | **none** | `CategoryTabs` renders empty until data arrives |
| All products | `['products-all']` | `[]` | **none** | feeds combo enrichment + `FavouritesRail`; silent |
| Combos | `['combos']` | `[]` | **none** | `ComboSection` hidden until non-empty (`combos.length > 0`) |
| **Products (filtered)** | `['products', selectedCategory, searchQuery]` | `[]` | **skeleton** (see below) | the only query that gates the main content area |

Only `products` destructures `isLoading: loadingProducts` and branches the `<main>` content.
The other three degrade silently to empty UI — there is **no** combined "page loading" gate, so
tabs/combos/favourites can pop in slightly after the product grid.

---

## Main content branch · `menu/page.tsx:144-179`

The `<main>` region renders exactly one of four states, in priority order:

| Order | Condition | Renders |
|---|---|---|
| 1 | `isError` (products query failed) | "⚠ Kết nối mạng yếu" + **Thử lại** button (`refetch()`), `min-h-[44px]` |
| 2 | `loadingProducts` | **Skeleton** (below) |
| 3 | `products.length === 0 && !showCombos` | `EmptyState` — message depends on search (see below) |
| 4 | otherwise | `ComboSection` + `ProductList` |

`OrderSummary`, `CartBottomBar`, `MenuHeader`, `MiniCartStrip`, `SearchBar`, `CategoryTabs` render
**outside** this branch — they are always present (not gated by `loadingProducts`).

### Products skeleton · `menu/page.tsx:151-165`

Responsive pulse placeholders (`bg-card rounded-xl animate-pulse`):

- **Mobile** (`sm:hidden`): 5 cards, `h-24`, single column (`flex-col gap-3`).
- **Tablet/Desktop** (`hidden sm:grid`): 8 cards, `aspect-square`, `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3`.

### Empty-state messages · `menu/page.tsx:166-170`

- Search active (`searchQuery.length >= 2`): `"Không tìm thấy món nào · Thử từ khóa khác nhé!"`
- Otherwise (empty category): `"Không có món nào trong danh mục này"`

---

## Search gating (no loading on 1-char query) · `menu/page.tsx:76`

The products query is `enabled: searchQuery.length === 0 || searchQuery.length >= 2`. A 1-char
search **disables** the query — it does not refetch and does not show the skeleton; the previous
results stay on screen until the 2nd character (or the box is cleared).

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **No skeleton for tabs/combos/favourites** | Only `products` has a loading UI. On a cold load, the product skeleton can show while `CategoryTabs` is still empty, so tabs and the combo section pop in afterward — minor layout shift. |
| 2 | **Error gate is products-only** | `isError`/`refetch` come from the `products` query alone. A failed `categories`, `combos`, or `products-all` fetch shows **no** error and silently renders empty (e.g. no combos, broken combo names) — see [customer_menu.md](customer_menu.md) §6 flag 4. |
| 3 | **Empty Suspense fallback** | `<Suspense>` has no `fallback`; it relies on the route-level spinner covering the suspense window. If that assumption changes, there is no menu-specific fallback. |
