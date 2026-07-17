# Claude Guidelines — Client Favourites

> Read this before implementing any of the 3 Favourites screens.

---

## Spec Summary

- 3-screen mobile feature: ❤ Yêu thích → 💾 Lưu set → 📋 Các set
- All data lives in `useFavouritesStore` (Zustand + localStorage); item metadata fetched via TanStack Query
- `QuantityStepper` is a new shared component — build it first, it unblocks `FavouriteItemCard`
- `useFavouritesStore` must be extended (existing store only tracks IDs — new shape adds qty, toppingIds, sets)
- No backend calls for writes; only reads from existing `/api/v1/products/:id` and `/api/v1/combos/:id`

Key constraint: **All 3 pages are Pattern B (Full Client)**. Each page.tsx must have `'use client'` at the top and a skeleton component for the loading state.

---

## Shared Components — Reuse Checklist

> Components classified `new (shared)` in the Component Specifications table. Register in `_INDEX_SHARING_COMPONENT.md` before implementation starts.

| Component | Tier | File | Register in Index? |
|-----------|------|------|--------------------|
| `QuantityStepper` | Tier 2 — shared | `components/shared/QuantityStepper.tsx` | ✅ Yes — already registered in this scaffold |

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|---------------|-----|
| Favourite item IDs + qty + toppings | `useFavouritesStore.items` (Zustand + localStorage) | User-specific, cross-session, no server needed |
| Saved sets (name + item snapshot) | `useFavouritesStore.sets` (Zustand + localStorage) | Same as above — purely client-side feature |
| Item metadata (name, price, toppings list) | TanStack Query `['products', id]` / `['combos', id]` | API data — shared cache, staleTime 5 min |
| Set name input | RHF local state | Form-only, not lifted to store |
| Active filter tab (S1 ZB) | `useState` (local) | Does not cross pages |

---

## Store Extension — Critical Notes

The existing `useFavouritesStore` in `store/favourites.ts` only persists favourite IDs. Before adding any UI:

1. Add a `_version: number` field to the persisted state.
2. In the `persist` config, add an `onRehydrateStorage` migration guard:
   ```typescript
   onRehydrateStorage: () => (state) => {
     if (!state || state._version !== CURRENT_VERSION) {
       // reset to empty — old format is incompatible
       return { items: [], sets: [], _version: CURRENT_VERSION }
     }
   }
   ```
3. Use the localStorage key defined in `src/lib/storage-keys.ts` (add `FAVOURITES_STORE = 'favourites-store'` there).

---

## `QuantityStepper` — Build Spec

```typescript
// components/shared/QuantityStepper.tsx
interface QuantityStepperProps {
  value: number
  min?: number        // default: 1
  max?: number        // default: 99
  onChange: (n: number) => void
  size?: 'sm' | 'md' // sm = 28px buttons, md = 32px buttons
  disabled?: boolean
}
```

- "−" button: `disabled` when `value <= min`
- "+" button: `disabled` when `value >= max`
- Value display: `role="spinbutton"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Min touch target: pad to 44×44 via `p-2` or explicit `min-w-[44px]`

---

## `applySet` — Implementation Contract

`applySet(setId)` must:
1. Find `sets.find(s => s.id === setId)`
2. For each `item` in `set.items`: call `useCartStore.addItem({ id: item.id, type: item.type, qty: item.qty, toppingIds: item.toppingIds })`
3. The cart `addItem` action must merge (add qty if item already exists), not replace
4. After applying: navigate to `/(shop)/menu` (or let the calling component decide)

---

## Performance Checklist

- [ ] Code split: App Router automatic per page — each screen is a separate `page.tsx`
- [ ] Images: `next/image` with `placeholder="blur"` for `FavouriteItemCard` thumbnails
- [ ] Item metadata queries: use `useQueries` (parallel) not sequential `useQuery` calls — avoids waterfall when favourites list is long
- [ ] Store updates (qty, remove): optimistic — update store immediately, no loading state needed
- [ ] Animations: `prefers-reduced-motion` check before adding any qty transition

---

## Cross-Page Notes

- State shared with other pages: `useFavouritesStore.items` is written by `ProductCard`/`ComboCard` on the menu page (♥ toggle). These pages must use the same store.
- Navigation **to** this page: from Menu page (♥ icon in header or dedicated nav link)
- Navigation **from** this page:
  - S1 → S2 via "Lưu thành set mới"
  - S1 → S3 via "Xem các set đã lưu"
  - S3 "Áp dụng" → navigates to `/(shop)/menu` (cart updated)
  - All screens ← back to previous screen / menu

---

## Non-Obvious Implementation Notes

- **`FavouriteItemResolved` is not stored** — derive it at render time by merging `store.items[i]` with TanStack Query results. Do not persist resolved metadata to localStorage (prices can change).
- **Sets store item snapshots, not resolved data** — `FavouriteSet.items[]` contains `FavouriteItem` (IDs + qty + toppingIds), not names or prices. Screen 3 must re-resolve names/prices from TanStack Query, same as Screen 1.
- **Screen 2 total = sum of (basePrice + topping prices) × qty for each item** — must be computed from resolved items, not from a stored total.
- **`useQueries` pattern** — import from `@tanstack/react-query`; pass `queries` array built from `store.items`. Each query result maps back to its item by index.
- **Do not add a `useEffect` + `fetch` combo** for item metadata — use `useQuery` exclusively to stay consistent with the rest of the project.

---
*Created: 2026-05-27*
