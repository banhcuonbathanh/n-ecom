## Technical Architecture Overview

### **Page Structure**
- **10 Zones (A-J)** with layered sticky positioning (`z-10` to `z-30`)
- **Conditional rendering** based on `selectedCategory` and cart state
- **Scrollable content area** between fixed header and bottom FAB

### **Tech Stack**
```
React (Next.js App Router)
├── State: Zustand (cart, user settings) + localStorage persistence
├── Data: TanStack Query (categories, products, combos)
├── Styling: Tailwind CSS (sticky positioning, responsive grid)
└── Types: TypeScript interfaces for all components
```

### **Key Implementation Patterns**

**1. Component Architecture**
- Modular components per zone (`SearchBar`, `ComboCard`, `ProductGridCard`, etc.)
- Props-driven with strict TypeScript contracts
- Inline toppings configuration without modal dialogs

**2. State Management**
```typescript
// Centralized cart store with persistence
cartStore: {
  items: CartItem[]
  drinkConfig: DrinkConfig
  orderNote: string
  // Actions: addItem, updateQuantity, updateToppings
}
```

**3. Data Fetching Strategy**
```typescript
// TanStack Query with 5min staleTime
- Categories: ['categories']
- Products: ['products', categoryId, searchQuery]  
- Combos: ['combos'] (always fetched, conditionally shown)
```

**4. Rendering Strategy**

| Layer | What | Why |
|---|---|---|
| **ISR** (`revalidate: 300`) | `categories` · `products` (default, all) · `combos` | Data changes at admin update cadence, not per request — static build + 5min revalidation matches `staleTime` |
| **Server Component (RSC)** | `page.tsx` only — prefetches all 3 queries, renders no UI | Passes data via `HydrationBoundary` so TanStack Query is pre-hydrated on client |
| **Client Component** | Every zone (A–J) — all read Zustand, localStorage, or have user interaction | `tableLabel`, `guestToken`, cart state, favorites are browser-only — cannot be server-rendered |

```tsx
// app/(shop)/menu/page.tsx — Server Component
export const revalidate = 300

export default async function MenuPage() {
  const queryClient = new QueryClient()
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: fetchCategories }),
    queryClient.prefetchQuery({ queryKey: ['products', null, undefined], queryFn: fetchProducts }),
    queryClient.prefetchQuery({ queryKey: ['combos'], queryFn: fetchCombos }),
  ])
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MenuClient /> {/* 'use client' — owns all Zustand reads and interactions */}
    </HydrationBoundary>
  )
}
```

**Zone-level rendering decisions:**

| Zone | Rendering | Reason |
|---|---|---|
| A — Header | Client | reads `settingsStore.tableLabel` + `cart.itemCount` (Zustand) |
| B — SearchBar | Client | local debounce state + onChange |
| C — CategoryTabs | Client | selected tab state triggers new product query |
| D — FavoritesRail | Client | reads `localStorage` (browser-only) |
| E — ComboSection | Client | topping checkboxes, quantity, favorites toggle |
| F — ProductGrid | Client | category-dependent refetch + add-to-cart |
| G — DrinkCustomize | Client | writes `cartStore.drinkConfig` |
| H — OrderNote | Client | writes `cartStore.orderNote` + localStorage |
| I — OrderSummary | Client | computed from `cartStore.items` |
| J — CartFAB | Client | computed `total + itemCount` |

**Result:** Zero loading flash on first paint — categories/products/combos arrive in HTML. Client TanStack Query hydrates from server state and refetches in background after `staleTime`.

**Gap:** Category tab tap fires a new `['products', categoryId]` query with no prefetch — add `queryClient.prefetchQuery` on tab hover/focus to eliminate the per-category wait.

**5. Performance Optimizations**
- **Debounced search** (300ms) to prevent API spam
- **Optimistic UI updates** for cart actions with rollback on error
- **Memoized computed values** (`itemCount`, `total`)
- **Conditional queries** (combos hidden when category selected)

**5. UX Enhancements**
- **Progressive disclosure**: Collapsible order summary, expandable combo details
- **Immediate feedback**: Toast notifications, button state changes
- **Accessibility**: 44px touch targets, ARIA labels, keyboard navigation, reduced motion support

**6. Edge Case Handling**
- Image fallbacks → placeholder SVG
- Network errors → retry banners
- Empty states → contextual CTAs
- Quantity limits (max 99) → disabled buttons

### **File Organization**
```
src/
├── app/(shop)/menu/
│   ├── page.tsx                    # Main page composing zones
│   └── components/                 # local — only menu uses these
│       ├── SearchBar.tsx
│       ├── CategoryTabs.tsx        # → promoted to shared if reused
│       ├── FavoritesRail.tsx
│       ├── ComboCard.tsx           # → promoted to shared if reused
│       ├── ProductGridCard.tsx
│       ├── DrinkCustomize.tsx
│       ├── OrderNote.tsx
│       ├── OrderSummary.tsx
│       └── CartFAB.tsx
├── hooks/                          # top-level — NOT inside page folder
│   └── useMenuQueries.ts
└── store/                          # top-level — NOT inside page folder
    └── cart.ts
```

---

### **State Contract**

> Which global stores this page reads vs. writes, and what it hands off to the next page.

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useCartStore` | `items` · `total` · `itemCount` | `addItem` · `updateQuantity` · `updateToppings` · `clearCart` | localStorage-persisted; `clearCart` called after order submitted | Order page reads `items` from this store |
| `useFavouritesStore` | `favouriteIds` | `toggle(id)` | localStorage-persisted; survives reload | Not passed — stays in store |
| `useSettingsStore` | `tableLabel` · `customerName` · `guestToken` | — | Set by QR scan entry flow; read-only on menu page | Order page reads `guestToken` for auth header |

---

### **RBAC & Auth Rules**

| Rule | Value |
|------|-------|
| **Route protection** | None — public route, no guard |
| **Allowed roles** | Guest (QR scan) · any authenticated user |
| **Auth state used** | `guestToken` from `useSettingsStore` (attached to API requests as bearer token) |
| **Conditional UI by role** | None — all zones visible to all users |
| **Unauthorized redirect** | N/A — but missing `guestToken` → redirect to QR scan entry page |

---

### **Critical Implementation Notes**
- **UUID for cart items** (never use numeric IDs)
- **Price formatting** client-side (raw numbers in state)
- **Version mismatch detection** for concurrent cart edits
- **Auto-collapse** order summary after 10s inactivity
- **Sticky stack management** (3 zones competing for top position)

This architecture prioritizes **performance** (caching, debouncing), **maintainability** (modular components, strict types), and **UX** (immediate feedback, accessibility).