# ASPECT 4 — Client State / Zustand

The auth store is correctly memory-only (no `persist` middleware) — the project's most important security invariant holds. The cart store has a well-thought-out `partialize` config that keeps only `orderNote` and `activeOrderId` across page reloads, with version 5 migrate that clears all legacy canh keys. The two gaps that matter: the `theme.ts` store uses a hardcoded localStorage key `'admin-theme'` instead of the `STORAGE_KEYS` registry, and the `checkout/page.tsx` and `TableConfirmModal.tsx` each subscribe to the entire cart store with no selector, triggering re-renders on every cart mutation — on pages that already mount multiple heavy components.

---

## Findings

### CS-1 — 🟠 Major — `theme.ts` uses a hardcoded localStorage key string; violates the single-source-of-truth rule

**File:** `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/store/theme.ts` line 15

**Problem:** The persist config uses `{ name: 'admin-theme' }` — a hardcoded string literal. The project rule is explicit: *all* localStorage keys must go through `src/lib/storage-keys.ts`. If this key is ever renamed or collides with a third-party library, there is no central place to find or change it.

**Fix:** Add to `storage-keys.ts`:
```ts
ADMIN_THEME: 'admin-theme',
```
Then update `theme.ts`:
```ts
import { STORAGE_KEYS } from '@/lib/storage-keys'
persist(..., { name: STORAGE_KEYS.ADMIN_THEME })
```

---

### CS-2 — 🟠 Major — `favourites.ts` persist config has no `version` or `migrate` — schema changes will break persisted data silently

**File:** `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/store/favourites.ts` line 93

**Problem:**
```ts
persist(..., { name: STORAGE_KEYS.FAVOURITES })
```
No `version`, no `migrate`. The `FavouriteItem` interface has `id`, `type`, `qty`, `toppingIds`, and `FavouriteSet` adds `id`, `name`, `createdAt`, `items`. If any field is added or renamed in a future change, old persisted JSON is silently used as-is, potentially feeding undefined/null values into components that expect the new shape (e.g. a new required field would read as `undefined`). The cart store experienced this exact problem (stale canh keys) and required multiple migrate passes to fix. Favourites is in the same position.

**Fix:** Add a baseline persist version now, before any breaking change occurs:
```ts
persist(..., {
  name:    STORAGE_KEYS.FAVOURITES,
  version: 1,
  migrate: (persisted, fromVersion) => {
    // v1 → baseline: no transform needed yet
    return persisted as FavouritesState
  },
})
```
This establishes the migration ladder for future changes.

---

### CS-3 — 🟡 Minor — `checkout/page.tsx` subscribes to the entire cart store with no selector, causing unnecessary re-renders

**File:** `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/app/(shop)/checkout/page.tsx` line 33

**Problem:**
```ts
const cart = useCartStore()
```
`CheckoutPage` subscribed this way re-renders on **every** cart mutation — adding an item, changing a quantity, changing `orderNote`, updating `activeOrderId`. On this page the cart is read-only (the page only submits the order), so the only state actually needed is `cart.itemCount()`, `cart.items`, `cart.tableId`, and `cart.clearCart`. Subscribing to the whole store means the checkout form re-renders on any concurrent background cart update (which is unlikely but architecturally incorrect).

**Fix:** Use granular selectors:
```ts
const items         = useCartStore(s => s.items)
const tableId       = useCartStore(s => s.tableId)
const itemCount     = useCartStore(s => s.itemCount())
const clearCart     = useCartStore(s => s.clearCart)
const setPaymentMethod = useCartStore(s => s.setPaymentMethod)
```

---

### CS-4 — 🟡 Minor — `TableConfirmModal.tsx` subscribes to the entire cart store with no selector

**File:** `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/features/menu/components/TableConfirmModal.tsx` line 14

**Problem:**
```ts
const cart = useCartStore()
```
`TableConfirmModal` is rendered inside `MenuPage` — which itself already subscribes to items and tableId from the cart. The modal reads `cart.tableId`, `cart.items`, `cart.clearCart`, `cart.setActiveOrderId`. Subscribing to the whole store means this modal component re-renders on every cart interaction on the menu page (adding/removing items, typing a note), even when the modal is not open. This is the highest-traffic path in the app.

**Fix:** Same selector pattern:
```ts
const tableId       = useCartStore(s => s.tableId)
const items         = useCartStore(s => s.items)
const clearCart     = useCartStore(s => s.clearCart)
const setActiveOrderId = useCartStore(s => s.setActiveOrderId)
```

---

### CS-5 — 🟡 Minor — `settings.ts` persist config has no `version` or `migrate`

**File:** `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/store/settings.ts` lines 12–22

**Problem:** Same issue as CS-2 but for the settings store. Currently stores `customerName` and `tableLabel`. No `version`, no `migrate`. If a field is ever added (e.g. `preferredLanguage`) or `tableLabel` is renamed, old persisted data is silently hydrated without migration, potentially loading stale/incompatible values into the app.

**Fix:** Add baseline version:
```ts
persist(..., {
  name:    STORAGE_KEYS.CUSTOMER_SETTINGS,
  version: 1,
  migrate: (persisted) => persisted as SettingsState,
})
```

---

### CS-6 — 🟡 Minor — `ProductCard` and `ProductGridCard` each subscribe to the entire `items` array from `useCartStore`

**Files:**
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/features/menu/components/ProductCard.tsx` line 17
- `/Users/monghoaivu/Desktop/code/claude restaurant/fe/src/features/menu/components/ProductGridCard.tsx` line 17

**Problem:** Both components do:
```ts
const { items, addItem, updateQty } = useCartStore()
```
They only need `items` to find the current quantity of **this specific product** in the cart. Every card in the product list (up to ~20 visible at once on a tablet) re-renders whenever **any** item in the cart changes — e.g. adding or removing a completely different product triggers all 20 cards to re-render. With `React.memo` not applied to these components (Aspect 8 scope), this is a significant re-render cascade on the busiest page in the app.

**Fix:** Use a derived-value selector that only triggers re-render when the count of *this product* changes:
```ts
const qty = useCartStore(s => {
  const hit = s.items.find(i => i.product_id === product.id)
  return hit?.quantity ?? 0
})
const addItem   = useCartStore(s => s.addItem)
const updateQty = useCartStore(s => s.updateQty)
```

---

## Verified — not a finding

| Concern | Verdict |
|---|---|
| Auth store persisting access token | ✅ No `persist` middleware on `auth.store.ts` — token is memory-only |
| Server data (orders, products) cached in a Zustand store | ✅ Not found — all server data lives in TanStack Query cache |
| Direct `localStorage` calls with hardcoded key strings | ✅ Only `theme.ts` uses a hardcoded key (reported as CS-1). All other `localStorage` access goes via `STORAGE_KEYS.*` |
| `useOrderSSE` reading/writing `localStorage` outside `storage-keys.ts` | ✅ Uses `STORAGE_KEYS.ORDER_CACHE` prefix — compliant |
| State duplicated between Query cache and a store | ✅ Not found. `summary.store.ts` only holds the `range` selector value (UI state, not server data) |
| `trainingStore.ts` — UI-only state (activeRole, selectedGuideId) | ✅ Correct; no server data cached |

---

## What's already good

- Auth store has no `persist` middleware at all — the access token is guaranteed memory-only, confirming the project's most critical security invariant.
- Cart store `partialize` is precise: only `orderNote` and `activeOrderId` survive reloads; `items`, `tableId`, `tableName`, `paymentMethod` are session-only. Version 5 + `migrate` correctly clears all legacy key variants.
- `STORAGE_KEYS` is imported in every store that uses `persist` (except `theme.ts`), and all `localStorage` reads/writes in hooks and pages use the `STORAGE_KEYS` constants.
- `summary.store.ts` correctly stores only UI selection state (`range: SummaryRange`) — not the fetched summary data itself.
- `trainingStore.ts` stores only UI cursor state (selected guide/role) — not the training guide content.
