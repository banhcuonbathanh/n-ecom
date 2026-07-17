## Technical Architecture — Client Favourites (3 screens)

### Page Structure
- **Screen 1** — `/(shop)/menu/favourites`: 4 zones (ZA sticky z-20, ZB sticky z-10, ZC scroll, ZD footer)
- **Screen 2** — `/(shop)/menu/favourites/save`: 4 zones (ZA sticky z-20, ZB static form, ZC scroll summary, ZD fixed actions)
- **Screen 3** — `/(shop)/menu/favourites/sets`: 3 zones (ZA sticky z-20, ZB scroll list, ZC empty state)
- Device target: Mobile (375–420px)
- Sticky stack: ZA top-0 z-20, ZB top-[52px] z-10

---

### RBAC & Auth Rules

| Rule | Value |
|------|-------|
| **Route protection** | None |
| **Allowed roles** | Guest (unauthenticated QR customer) |
| **Auth state used** | None — page does not read `useAuthStore` |
| **Conditional UI by role** | None |
| **Unauthorized redirect** | N/A |

---

### Tech Stack

```
React (Next.js App Router) — Pattern B (Full Client)
├── State: Zustand (useFavouritesStore + useCartStore) + localStorage persistence
├── Data: TanStack Query — ['products', id] · ['combos', id]  (item metadata only)
├── Forms: RHF + Zod — Screen 2 set name input
├── Styling: Tailwind CSS (mobile-first, sticky zones)
└── Types: TypeScript strict — FavouriteItem · FavouriteSet · FavouriteItemResolved
```

---

### Key Implementation Patterns

**1. Component Architecture**
- Each screen is a separate `page.tsx` under the `favourites/` route group
- Local components live in `app/(shop)/menu/favourites/components/` (shared across all 3 screens)
- `QuantityStepper` extracted to `components/shared/` — reusable in cart and checkout
- `FavouriteItemCard` uses the resolved item shape (store item + API metadata merged)

**2. State Management**

```typescript
// store/favourites.ts — extended shape
interface FavouritesStore {
  items: FavouriteItem[]       // { id, type, qty, toppingIds[] }
  sets: FavouriteSet[]         // { id, name, createdAt, items[] }
  addItem: (item: FavouriteItem) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  addSet: (name: string) => void      // snapshots current items[]
  renameSet: (id: string, name: string) => void
  deleteSet: (id: string) => void
  applySet: (setId: string) => void   // merges set.items into useCartStore
}
// persist middleware: key = 'favourites-store' → see src/lib/storage-keys.ts
```

**3. Data Fetching Strategy**
- Item IDs come from `useFavouritesStore.items`
- Metadata (name, price, toppings) fetched per item via TanStack Query
- `enabled: true` always — items are fetched when the page mounts
- `staleTime: 5 min` — product/combo prices rarely change mid-session
- `FavouriteItemResolved` is computed by merging store item + query result

**4. Performance**
- Item metadata queries run in parallel (`useQueries` or individual `useQuery` per item)
- `QuantityStepper` changes are optimistic — store updates immediately, no debounce needed
- Screen 2 summary is derived from store synchronously — no query needed

**5. UX Enhancements**
- Qty "−" disabled at min=1; remove via ♥ tap
- "Lưu set này" button disabled until set name is non-empty (RHF `isValid`)
- After applying a set, navigate to `/(shop)/menu` (cart updated, user continues ordering)

**6. Edge Case Handling**
- 404 on product/combo: remove from `items` automatically, show toast
- Empty `items[]`: hide ZB tabs, show empty state in ZC
- Empty `sets[]`: show ZC empty state on Screen 3

---

### Rendering Strategy

| Layer | What | Why |
|---|---|---|
| **ISR** | N/A | No shared-data prefetch — all data is user-specific (localStorage) |
| **RSC** | N/A | Pattern B — no server component needed |
| **Client** (`'use client'`) | All zones S1–S3 | Zustand + localStorage + user interaction; no static data |

> Pattern B — Full Client. All 3 pages must define a `<FavouritesSkeleton />` component.
> Gap: item metadata (names/prices) is fetched client-side → brief loading flash per card on cold visit. Pre-warm by reading `useFavouritesStore.items` in a layout-level effect is out of scope for v1.

Register these pages in `docs/fe/wireframes/shared/_INDEX_RENDERING_STRATEGY.md` after implementing.

---

### File Organization

```
src/
├── app/(shop)/menu/favourites/
│   ├── page.tsx                        ← Screen 1 (Full Client)
│   ├── save/
│   │   └── page.tsx                    ← Screen 2 (Full Client)
│   ├── sets/
│   │   └── page.tsx                    ← Screen 3 (Full Client)
│   └── components/
│       ├── FavouritesTopNav.tsx        ← shared across 3 screens
│       ├── FavouriteFilterTabs.tsx     ← S1 ZB
│       ├── FavouriteItemCard.tsx       ← S1 ZC
│       ├── FavouritesFooter.tsx        ← S1 ZD
│       ├── FavouritesSummaryList.tsx   ← S2 ZC
│       └── SetCard.tsx                 ← S3 ZB
├── components/
│   ├── shared/
│   │   └── QuantityStepper.tsx         ← new shared component
│   └── ui/
│       ├── button.tsx                  ← reuse
│       ├── badge.tsx                   ← reuse
│       └── input.tsx                   ← reuse
├── store/
│   └── favourites.ts                   ← extend existing store
└── lib/
    └── storage-keys.ts                 ← add FAVOURITES_STORE key here
```

---

### State Contract

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useFavouritesStore` | `items` · `sets` | `removeItem` · `updateQty` · `addSet` · `deleteSet` · `renameSet` | Created at first ♥ tap on menu; persists across sessions | `applySet` writes to `useCartStore` → cart/checkout |
| `useCartStore` | — | `addItems(set.items)` via `applySet` | Cart already exists from menu flow | Checkout page reads updated cart |

---

### Critical Implementation Notes
- `FavouriteItem.id` is a UUID matching `product.id` or `combo.id` from the API — do not use display-order index as ID
- `FavouriteSet.id` must be `crypto.randomUUID()` generated client-side at save time
- `addSet` takes a snapshot of current `items[]` — future changes to favourites do not retroactively update saved sets
- `applySet` merges quantities: if item already in cart → `existingQty + set.qty`; do not replace
- localStorage key must be defined in `src/lib/storage-keys.ts`, not hardcoded as a string literal in the store
- `QuantityStepper` must be accessible: `aria-label` on both buttons; `role="spinbutton"` on the value display
