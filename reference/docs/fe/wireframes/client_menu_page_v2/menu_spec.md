---
page: Menu (Ordering Experience)
route: /(shop)/menu/page.tsx
spec_ref: Spec_3 §4
created: 2026-06-07
updated: 2026-06-08 — promoted to the single canonical page spec; Acceptance Criteria appended; Detailed Workflow (Event Flow) section added.
status: ✅ As-built — documents current code exactly · CANONICAL
canonical: true
supersedes:
  - ../client_menu_page/menu_wireframe_v1.md  (design wireframe, pre-build)
  - ../client_menu_page/menu_spec.md          (design spec — ACs carried over below)
  - ../client_menu_page/menu_spec_ver1.md     (as-built zone spec — merged here)
  - ../client_menu_page/Menu_Status_Routing_Reference.md  (data flow — merged here)
assets:  # binaries not duplicated — live in the old folder
  - ../client_menu_page/menu_ver3_ux.excalidraw   (latest UX wireframe)
  - ../client_menu_page/menu_ver1_done.png        (PNG export)
---

# Menu Page — Canonical Spec (As-Built)

> **Purpose:** THE single source documenting what is *actually implemented* at
> `http://localhost:3000/menu`. Read-from-code, not aspirational. Every cell traced to code
> as of 2026-06-07. Replaces the four older menu docs listed in `supersedes:` above — do not
> edit those; edit this file.
>
> **Source page:** `fe/src/app/(shop)/menu/page.tsx` + `src/features/menu/components/*`
>
> **State wrapper:** `<Suspense>` → `<MenuContent>`. `MenuContent` is a pure orchestrator: it owns the 4 queries + page state and composes zone components (`MenuHeader`, `MiniCartStrip`, `RestaurantBanner`, `AddToOrderBanner`, `SearchBar`, `CategoryTabs`, `FavouritesRail`, `ComboSection`, `ProductList`, `OrderSummary`, `CartBottomBar`, `CartDrawer`, `TableConfirmModal`). No zone is inline any more.
> **Who sees it:** Customer (guest JWT from QR scan, or direct browser access)
> **Entry:** QR scan → `/table/[id]` → redirect to `/menu` | direct URL
> **?add_to_order=<id>:** activates Add-to-Order mode (banner + CartDrawer CTA changes)

---

## 📌 Summary (read this first)

**What this doc is:** the one canonical, read-from-code spec for the customer **Menu** page
(`/(shop)/menu`). If you only read this section you'll understand the page; drop into the detailed
sections below only when you need exact classes, props, or payloads.

**What the page is:** a mobile-first **catalog + cart builder**. The customer arrives by QR scan
(or direct URL), browses categories / combos / món lẻ, customizes (filling, canh, toppings, note),
and places one order. It **creates** an order but never reads order status back.

**The 8 things to know:**

| # | Fact |
|---|---|
| 1 | **Rendering:** Pattern B — **Full Client** (`'use client'`); all 4 queries run client-side. *(The shared index says Pattern A — that's drift; see §Rendering.)* |
| 2 | **Reads from BE:** 4 `GET` queries — `categories` · `products` (all) · `products` (filtered) · `combos`. Combos enriched client-side from the all-products list. |
| 3 | **Writes to BE:** exactly **one** mutation — `POST /orders` (source `qr`) from `TableConfirmModal`. Nothing else is sent. |
| 4 | **State:** global **Zustand** (`cart` · `favourites` · `settings`) + **TanStack Query** cache + page-local `useState` lifted to `MenuContent` and passed down by props. No zone-to-zone calls. |
| 5 | **Layout:** ~12 zones (A header → J cart bar) + 2 modals (CartDrawer, TableConfirmModal). All extracted into `features/menu/components/`; `page.tsx` only orchestrates. |
| 6 | **Checkout fork:** QR table (`tableId` set) → `TableConfirmModal`; no table → `/checkout`. Blocked with a shake when canh bowls = 0. |
| 7 | **Persistence:** cart `orderNote` + `activeOrderId` persist to localStorage; `items` / `tableId` / `drinkConfig` are session-only (reset on reload). |
| 8 | **Open risks:** toppings unselectable from the list card + not shown in the summary; "nhân" modeled two ways (filling vs topping). See §Concerns + **§Improvement Strategy** (prioritized backlog + migration plan). |

**Where to go next (section map):**

| If you want… | Go to |
|---|---|
| **End-to-end runtime flow** (load → favourite → add → checkout) | **§Detailed Workflow (Event Flow)** |
| Zone-by-zone components, classes, props | §Per-Zone / Per-Component Spec · §Component Tree |
| Exactly what's fetched / sent to BE | §What Comes FROM BE · §What Is SENT TO BE |
| In-page + cross-component state | §State Management |
| ISR/RSC vs client, loading/skeletons | §Rendering & Loading Strategy |
| Reusable / shared components | §Shared Components |
| Cross-page handoffs (Menu → Order) | §How It Manages Data CROSS-PAGE |
| Testable behaviours | §Acceptance Criteria |
| Known issues / decisions pending | §Concerns |

---

## ⚠️ This Page Has NO Entity-Status Routing

`/menu` is a **catalog + cart builder** — it never reads an order / table / payment `status`
and never renders status into a zone. There is no status × zone matrix to build.

| Concept | What this page does | Status routing? |
|---|---|---|
| Products | filtered by `is_available=true` (catalog availability flag) | ❌ flag, not a status flow |
| Orders | **creates** one via `POST /orders`; never reads order `status` back | ❌ write-only |
| Tables | reads `tableId`/`tableName` from cart store (set by QR scan elsewhere) | ❌ no `tables.status` read |
| Payment | not touched on this page | ❌ |

The only status-shaped value handled is the `TABLE_HAS_ACTIVE_ORDER` **error code** on order
create → redirect. That is error handling, not status rendering.

---

## Live Page Snapshot (http://localhost:3000/menu, 2026-06-07)

What actually renders right now (empty cart):

- **Header:** "Quán Bánh Cuốn" + table label slot · icons: Yêu thích · Cài đặt · Đơn hàng · Giỏ hàng
- **Banner:** "Bánh cuốn tươi — ngon mỗi ngày" (image 404 → gradient fallback)
- **Category tabs:** Tất cả · Bánh Cuốn · Canh · Suất / Combo
- **Combo section (5):**
  | Combo | Price | Items |
  |---|---|---|
  | Suất Đầy Đủ Trứng Chín | 30.000 ₫ | ×1 Bánh Trứng Chín · ×1 Giò · ×3 Bánh Cuốn · ×1 Canh |
  | Suất Đầy Đủ Trứng Tái | 30.000 ₫ | ×1 Bánh Trứng Tái · ×1 Giò · ×3 Bánh Cuốn · ×1 Canh |
  | Suất Giò | 21.000 ₫ | ×1 Giò · ×3 Bánh Cuốn · ×1 Canh |
  | Suất Trứng Bánh Không | 21.000 ₫ | ×1 Bánh Trứng Vàng · ×3 Bánh Cuốn · ×1 Canh |
  | Bánh Chay | 12.000 ₫ | ×3 Bánh Cuốn · ×1 Canh |
- **Món lẻ section (6):** Canh (**0 ₫**) · Giò (9.000 ₫) · Bánh Trứng Tái (9.000 ₫) · Bánh Trứng Chín (9.000 ₫) · Bánh Trứng Vàng (9.000 ₫) · Bánh Cuốn (4.000 ₫)
- Every combo & product card has **Nhân thịt / Nhân thịt mộc nhĩ** filling toggles + qty stepper.
- **Cart drawer:** empty → "Giỏ hàng trống", Thanh toán disabled.
- **Tóm tắt đơn hàng (OrderSummary):** not shown — it returns `null` while the cart is empty.

---

## Data Sources (actual)

| Zone | Data | Query key | Source | staleTime |
|------|------|-----------|--------|-----------|
| A | `tableLabel` | — | `useSettingsStore` (Zustand) | — |
| A | `favItems.length` | — | `useFavouritesStore` (Zustand) | — |
| A | `hasOrders` | — | `localStorage` scan for `STORAGE_KEYS.ORDER_CACHE*` keys on mount | — |
| B | search query | `['products', selectedCategory, searchQuery]` | `GET /products?search=&is_available=true` | 5min |
| C | categories | `['categories']` | `GET /categories` | 5min |
| D | favItems | — | `useFavouritesStore.items` | — |
| D | allProducts | `['products-all']` | `GET /products` (unfiltered) | 5min |
| E | rawCombos | `['combos']` | `GET /combos` | 5min |
| E | combos (enriched) | — | `useMemo` over `rawCombos + allProducts` | — |
| F | products (filtered) | `['products', selectedCategory, searchQuery]` | `GET /products?category_id=&is_available=true` | 5min |
| G | drinkConfig | — | `useCartStore.drinkConfig` (persisted to localStorage) | — |
| I | cart items | — | `useCartStore.items` | — |
| I | orderNote | — | `useCartStore.orderNote` (persisted to localStorage) | — |
| J | itemCount, total | — | `useCartStore.itemCount()`, `useCartStore.total()` | — |

**Combo enrichment:** `rawCombos` + `allProducts` are merged client-side via `useMemo`.
`combo.items[]` gets `product_name` and `unit_price` resolved from the all-products map.
This is why `products-all` is fetched even though it isn't rendered directly.

**CartStore persistence** (`STORAGE_KEYS.CART_CONFIG`):
Persisted fields: `drinkConfig`*, `orderNote`, `activeOrderId`.
NOT persisted: `items`, `tableId`, `tableName` (session-only).

> *See the cross-page nuance below: `drinkConfig` resets to 0 on reload (migration v4) so a stale
> order's canh count never resurfaces.

---

## Page Layout / Zone Table (actual)

| Zone | Component | Title (verbatim) | Visibility | Position |
|------|-----------|------------------|-----------|----------|
| A | `<MenuHeader>` | Quán Bánh Cuốn | Always | `sticky top-0 z-20` |
| A-strip | `<MiniCartStrip>` | — | `itemCount > 0` (self-guards) | `sticky top-[57px] z-10` |
| banner | `<RestaurantBanner>` | Bánh cuốn tươi — ngon mỗi ngày | Always (gradient fallback on 404) | Static, below header |
| add-order | `<AddToOrderBanner>` | Chọn món để thêm vào đơn hàng hiện tại | `?add_to_order` param present (self-guards) | Static, below banner |
| B | `<SearchBar>` | — | Always | `sticky top-[52px] z-10` (own sticky) |
| C | `<CategoryTabs>` | — | Always | `sticky top-[108px] z-10` (own sticky) |
| D | `<FavouritesRail>` | Yêu thích | `selectedCategory === null && favItems.length > 0` | Scrollable |
| E | `<ComboSection>` (wraps `<ComboCard>` ×N) | Combo | `selectedCategory === null && combos.length > 0` (self-guards) | Scrollable |
| F | `<ProductList>` (wraps `<ProductCard>` / `<ProductGridCard>`) | Món lẻ | Always (or EmptyState) | Scrollable |
| G | `<DrinkCustomize>` | — | `hasCombo \|\| hasNuocDung` in cart | Scrollable |
| I | `<OrderSummary>` (includes note) | Tóm tắt đơn hàng | `items.length > 0` (else returns `null`) | Scrollable |
| J | `<CartBottomBar>` | Thanh toán | `itemCount > 0` (self-guards) | `fixed bottom-6 left-4 right-4 z-30` |
| modal | `<CartDrawer>` | Giỏ hàng | Controlled by `cartOpen` state | Slide-in from right, `z-50` |
| modal | `<TableConfirmModal>` | Xác nhận đặt hàng | Controlled by `confirmOpen` state (QR flow) | Full-screen overlay, `z-50` |

> Content area also has 3 mutually-exclusive states before E/F render: `isError` → "Kết nối mạng yếu" + retry · `isLoading` → skeletons · empty → `EmptyState`.
>
> **Note on Zone H:** Zone H (OrderNote) does not exist as a separate component on this page.
> The note textarea lives inside `<OrderSummary>` at the bottom of its open section.

---

## Component Tree (what renders inside what)

```
MenuPage (page.tsx)                         ← Suspense boundary only
└── MenuContent                             ← orchestrator: 4 TanStack queries + page state, composes zones
    ├── MenuHeader          (Zone A)        ← reads settings/favourites/cart; props: hasOrders, onCartClick
    │   ├── Heart link → /menu/favourites   (badge = favItems.length)
    │   ├── Settings link → /menu/settings
    │   ├── "Đơn hàng" button → /order      (dot when hasOrders)
    │   └── "Giỏ hàng" button → onCartClick (badge = itemCount)
    ├── MiniCartStrip       (A-strip)       ← self-guards itemCount()===0; prop: onClick
    ├── RestaurantBanner    (banner)        ← <img>, 404 → gradient fallback; no props
    ├── AddToOrderBanner    (add-order)     ← self-guards !orderId; props: orderId, onViewOrder
    ├── SearchBar           (Zone B)        ← leaf, debounced 300ms
    ├── CategoryTabs        (Zone C)        ← leaf, "Tất cả" + N category tabs
    ├── FavouritesRail      (Zone D)        ← only when no category + favs>0
    │   └── FavCard ×N                      ← internal sub-component
    ├── ComboSection        (Zone E)        ← self-guards (!visible || combos=0); props: combos, visible
    │   └── ComboCard ×N                    ← only when no category + combos>0
    │       └── ComboModal                  ← child modal (built but NOT opened — see note)
    ├── ProductList         (Zone F)        ← self-guards products=0; props: products, withComboHeading
    │   ├── ProductCard ×N      (<sm)       ← mobile 1-col list
    │   │   └── ToppingModal    (requireSingle) ← opens on "+" only if hasToppings
    │   └── ProductGridCard ×N  (≥sm)       ← desktop/tablet grid variant
    │       └── ToppingModal    (multi-select)
    ├── OrderSummary        (Zone I)        ← returns null when cart empty
    │   └── ItemGroup ×(1–2)                ← "COMBO" + "MÓN LẺ" groups
    │       └── QtyControls ×N              ← stepper + delete (per line & sub-item)
    ├── CartBottomBar       (Zone J)        ← self-guards itemCount()===0; props: onCheckout, dimmed
    ├── CartDrawer          (modal)         ← right slide-over
    └── TableConfirmModal   (modal)         ← TableConfirmModal.tsx; prop: onClose; reads cart store; QR checkout
```

> **Loading/error/empty branches stay in `MenuContent`** (page-level query orchestration, per rule 04): `isError` → retry, `loadingProducts` → skeletons, empty → `EmptyState`. Only the data zones (E/F) are extracted; the orchestration is not.

**Sibling components in `features/menu/components/` NOT rendered on `/menu`:** `DrinkCustomize.tsx`
(used inline as Zone G only when `hasCombo || hasNuocDung`) and `OrderNote.tsx`. `/menu` uses
`OrderSummary`'s own inline canh stepper + note textarea instead; these are standalone equivalents
used on other surfaces (checkout/cart). Documented at the end for completeness.

---

## Detailed Workflow (Event Flow) — Load → Favourite → Build Cart → Checkout

> The sections above describe the page *statically* (zones, data, props). This section traces what
> actually happens *at runtime*, step by step, from the user's first action to the order being saved.
> Every step is traced to a file + line. The single rule that makes it all hang together:
> **no zone calls another zone — they communicate only through the Zustand stores (cart/favourites/settings)
> or through page-local `useState` lifted to `MenuContent` and passed down as props.** A component writes
> to a store; every other component subscribed to that store re-renders automatically.

### ① Page Load (cold visit)

```
MenuPage (page.tsx:207)  →  <Suspense>  →  <MenuContent>
```

1. **Mount.** `MenuContent` (page.tsx:27) reads `?add_to_order` from the URL (`searchParams.get`, line 30) → `addToOrderId`. Initializes 6 page-local `useState`: `selectedCategory=null`, `cartOpen=false`, `confirmOpen=false`, `hasOrders=false`, `searchQuery=''`, `canhShakeKey=0` (lines 31-36).
2. **Active-order probe.** A mount-only `useEffect` (lines 38-41) scans `localStorage` for any key starting with `STORAGE_KEYS.ORDER_CACHE` → `setHasOrders(found)`. Drives the "Đơn hàng" dot in `MenuHeader`.
3. **Store subscriptions.** `MenuContent` subscribes to `useCartStore` (`tableId`, `drinkConfig`, line 43) and `useFavouritesStore` (`favItems`, line 47). `canhMissing = drinkConfig.bowls === 0` is recomputed on every render (line 46). On a fresh load `drinkConfig` is **always `{bowls:0, vegBowls:0}`** because cart `partialize` (cart.ts:114) does not persist it.
4. **4 queries fire** (lines 58-89), all client-side (Pattern B):
   - `['categories']`, `['products-all']`, `['combos']` → always enabled.
   - `['products', selectedCategory, searchQuery]` → gated by `enabled: searchQuery.length === 0 || >= 2` (line 82).
5. **Combo enrichment** (`useMemo`, lines 92-111): `rawCombos` joined against `allProducts` → each `combo.items[]` gets `product_name`, `unit_price`, `toppings`. This is why `products-all` is fetched even though it isn't rendered directly. `nhanOptions` later derive from these sub-item `toppings`.
6. **Visibility flags** computed each render: `showCombos = selectedCategory===null && combos.length>0` (line 113), `showFavs = selectedCategory===null && favItems.length>0` (line 114).
7. **Render order** (lines 116-203): Header → MiniCartStrip → Banner → AddToOrderBanner → SearchBar → CategoryTabs → (FavouritesRail) → `<main>` content branch (`isError` → `loadingProducts` skeletons → empty `EmptyState` → ComboSection + ProductList) → OrderSummary → CartBottomBar → CartDrawer → (TableConfirmModal).
   - **First paint sequence** (Pattern B, no SSR HTML): blank → skeleton (`loadingProducts`) → content once queries resolve. `OrderSummary` and `CartBottomBar` render **nothing** while the cart is empty (each self-guards on `items.length`/`itemCount()`).

### ② Tapping the ❤ Favourite button

Heart button lives on `ProductCard` (line 90-96), `ComboCard` (line 94-100), `ProductGridCard`, and `FavCard`.

```
onClick → toggleFav(id, type)               (favourites.ts:83-90)
        → store removes (if present) or appends { id, type, qty:1, toppingIds:[] }
        → persists FULL store to localStorage["favourites"]   (no partialize)
        → every subscriber re-renders:
            • the card's own ❤  (fav = isFavourite(id,type)) flips filled/outline
            • MenuHeader badge  (favItems.length) increments
            • FavouritesRail    appears when favItems.length crosses 0→1  (only if selectedCategory===null)
```

- **No cart write. No BE call.** Favourites are a purely client-side, fully-persisted list — independent of the cart and of any order. (favourites.ts:43-93, persisted under `STORAGE_KEYS.FAVOURITES`, **no** `partialize` so the whole store survives reloads.)
- The favourite entry stores only `{id, type, qty, toppingIds}` — **not** price/name. The `/menu/favourites` page re-resolves those from the product/combo queries when rendering.

### ③ Adding a COMBO (with nhân choice)

`ComboCard.tsx` holds **one** local `useState`: `nhanId` (line 18). Everything else is derived.

1. **Nhân options** (lines 29-37): flattened from the combo's non-canh sub-item `toppings`, deduped by id, `is_available` only. Canh's "Rau" topping is excluded — it's driven by the global canh stepper, not here.
2. **Selected nhân** (line 40): `nhanOptions.find(id===nhanId) ?? nhanOptions[0]` (defaults to first).
3. **Cart line identity** (line 42): `cartId = combo_${combo.id}_${selectedNhan?.id ?? 'plain'}`. **Changing the nhân pill changes `cartId`** → a different nhân = a different cart line. `qty` (line 44) reads back from the store by that id.
4. **Tap a nhân pill** (line 165): `setNhanId(nhan.id)` → re-renders the card → `cartId`/`qty` recompute. Pure local; the cart is untouched until [+].
5. **Tap [+]** → `handleAdd` (lines 50-71):
   - `qty === 0` → `addItem({ id:cartId, type:'combo', combo_id, name, quantity:1, price:combo.price, toppings:[selectedNhan], combo_items:[full snapshot of product_id/name/qty/unit_price/toppings] })`.
   - `qty > 0` → `updateQty(cartId, qty+1)` (just bump quantity).
6. **Tap [−]** (line 141): `updateQty(cartId, qty-1)`; cart store drops the line when quantity hits 0 (cart.ts:61 `.filter(quantity>0)`).
7. `ComboModal` exists but is **dead** — `modalOpen` is never set true (handleAdd adds directly).

### ④ Adding a MÓN LẺ product

**`ProductCard` (mobile `<sm`)** — `ProductCard.tsx`:
- `hasToppings = availableToppings.length > 0` (line 24); `totalQty` aggregates **all** variants of the product (line 28).
- **Tap [+]** (line 146): `hasToppings ? setModalOpen(true) : handleDirectAdd`.
  - `handleDirectAdd` (lines 50-67): `cartId = product_${id}_plain`; `addItem(...toppings:[])` if new, else `updateQty(+1)`.
  - **ToppingModal → confirm** `handleModalConfirm(selected)` (lines 34-48): `cartId = product_${id}_${sortedToppingIds}`, `price = base + Σ topping.price`, `addItem({..., toppings:selected})`. *(`requireSingle` → one topping acts as the nhân.)*
- **Tap [−]** `handleMinus` (lines 69-72): decrements the **last** variant.

**`ProductGridCard` (`≥sm`)** uses a multi-select `ToppingModal` and a trailing-underscore direct-add key (`product_${id}_`) — see §Per-Zone. Same store calls.

> ⚠️ **Known divergence (Concern #3/#5, IMP-1):** `ProductCard` actually adds via a `filling`-less path here, while the product **detail** page records nhân as a topping. The two surfaces can produce different cart lines for the same dish. Treat the live `hasToppings` value as authoritative.

### ⑤ How the add propagates: Component → Zustand → OrderSummary (and siblings)

This is the heart of the cross-component story. **No card ever calls `OrderSummary`.** The path is:

```
ProductCard/ComboCard  ──addItem()──►  useCartStore (cart.ts:42-52)
                                           │ set() mutates items[]
                                           │ (dedup by id: existing → quantity += ; new → append)
                                           ▼
              ┌──────────────┬──────────────┬───────────────┬──────────────┐
        OrderSummary    MiniCartStrip   CartBottomBar    MenuHeader     CartDrawer
        (re-renders     (chips +        (appears once    (cart badge    (item list,
         live)           count)          itemCount>0)     itemCount)      if open)
```

Every one of those components calls `useCartStore(...)` independently, so Zustand's `set()` re-renders all of them in the same tick. What `OrderSummary` does with the new `items` (OrderSummary.tsx):
- `items.length === 0` guard lifts (line 45) → the panel mounts.
- Splits `combos` / `products` by `type` (lines 47-48); computes `comboTotal`/`productTotal`.
- Builds `productPriceMap` (lines 53-64) from standalone product prices + combo sub-item `unit_price`.
- Builds **`dishSummary`** (lines 67-95): aggregates dishes keyed by `name|toppingKey`, **excludes canh** (lines 72,80), then **re-adds canh from `drinkConfig`** split into "có rau"/"không rau" (lines 91-93) — so the on-screen "Tổng số món" matches the eventual POST payload exactly.
- "Tổng cộng" = `total()` = Σ `price × quantity` (cart.ts:90).

**Editing inside OrderSummary** (all write back to the same store, same propagation):
- Line qty −/+/🗑 → `updateQty` / `removeItem` (lines 333-335).
- Combo "Xem chi tiết" → expand → sub-item −/+/🗑 → `updateComboItem(comboCartId, productName, qty)` (lines 358-360), which **recomputes the combo's price** by `unit_price × delta` (cart.ts:64-79).

### ⑥ The Canh stepper (global, drives the checkout gate)

The canh steppers render inline in `OrderSummary` (lines 161-191), **not** as line items:
- −/+ → `setVal` → `setDrinkConfig({ bowls, vegBowls })` (lines 163-169).
- `drinkConfig` is **session-only** (cart.ts:114 `partialize` omits it; migration v4 deletes any stale persisted value, cart.ts:105-108) — it always starts at 0 on reload so a previous order's canh count never resurfaces.
- `MenuContent` reads `drinkConfig.bowls` → `canhMissing` (page.tsx:46). When `bowls === 0`: OrderSummary shows the amber warning + running-border (lines 158-159), and `CartBottomBar` receives `dimmed` (page.tsx:193).

### ⑦ The note (persisted)

`OrderSummary` note textarea → `handleNoteChange` (lines 29-34): `setOrderNote(value)` immediately + a debounced 800ms "✓ Đã lưu". `orderNote` **is** persisted (cart.ts:114 partialize) — it survives reloads even though `items` do not (see IMP-6 for that inconsistency).

### ⑧ Tapping "Thanh toán" (checkout)

```
CartBottomBar tap  →  onCheckout  →  handleCheckout()   (page.tsx:49-56)
```

`handleCheckout` owns the entire routing decision:

| Condition | What happens | Code |
|---|---|---|
| `canhMissing` (`drinkConfig.bowls === 0`) | **BLOCK.** `setCanhShakeKey(k+1)` + `toast.error('Vui lòng chọn số bát canh…')`, return. The bumped `canhShakeKey` flows to `OrderSummary`'s `shakeKey` prop → `useEffect` (OrderSummary.tsx:17-27) scrolls to + shakes the Canh block. | page.tsx:50-54 |
| `tableId` set (QR flow) | `setConfirmOpen(true)` → mounts `TableConfirmModal` | page.tsx:55 |
| no `tableId` (online flow) | `router.push('/checkout')` (collects name/phone there) | page.tsx:55 |

> The CartDrawer footer "Thanh toán" reaches the same fork via the `onTableCheckout` prop (`() => setConfirmOpen(true)`, page.tsx:199) for the QR branch.

### ⑨ Order create — the one and only mutation

`TableConfirmModal.tsx` → `submitOrder` mutation (lines 18-57):

```
POST /orders {
  customer_name:'', customer_phone:'',          // always empty from QR menu
  note: <modal note> || null,
  table_id: cart.tableId,
  source: 'qr',
  items: buildOrderItemsPayload(cart.items, cart.drinkConfig)   // order-payload.ts — the single builder
}
```

`buildOrderItemsPayload` (order-payload.ts:26-80) applies the **3 rules** that mirror OrderSummary's preview exactly:
1. **Combo** → `combo_items` overrides (non-canh dishes only; nhán carried as `topping_ids`).
2. **Filling/nhân** → `topping_ids` on standalone products + combo sub-items.
3. **Canh** → global rows from `drinkConfig`, split có rau (carries Rau `topping_id`) / không rau (`topping_ids:[]`); **never** inside a combo.

**Outcomes** (lines 30-56):

| Result | Action |
|---|---|
| Success | `GET /orders/:id` → cache full order to `localStorage["order_cache_<id>"]` → `cart.clearCart()` → `router.replace('/order/:id')` (replace, not push, to keep the auth token alive in Zustand) |
| `TABLE_HAS_ACTIVE_ORDER` | `toast.info` + `router.replace('/order/<active_order_id>')` |
| other error | `toast.error(message ?? 'Đặt hàng thất bại')` |

After success the cart is empty again, `drinkConfig` resets, and the next visit's mount-effect (step ①.2) finds the new `order_cache_` key → lights the "Đơn hàng" dot. **The page never reads the order status back — it only creates.**

---

## Per-Zone / Per-Component Spec

Legend: **Opens** = child modal/overlay it can mount · **Expand** = collapsible regions inside · **Store** = Zustand reads/writes.

### Zone A — Header
**File:** `MenuHeader.tsx` · **Props:** `hasOrders` · `onCartClick` · **Sticky:** `top-0 z-20` · reads `settings`/`favourites`/`cart` stores directly

Left side:
- Shop name: `Quán Bánh Cuốn` (hardcoded h1, `font-display text-xl`)
- Table label: `settingsStore.tableLabel` shown as `text-xs text-muted-fg` below name (only if set)

Right side (flex gap-2), 4 interactive controls:
1. **Heart icon button** → `/menu/favourites` — `Heart size=18`; filled red if `favItems.length > 0`, faded if 0. Badge: absolute `-top-1 -right-1`, red circle, count (capped "9+").
2. **Settings icon button** → `/menu/settings` — `Settings size=18 text-muted-fg`.
3. **"Đơn hàng" button** → `router.push('/order')` — `ClipboardList size=16`, label hidden on `< sm`. Active-order dot `w-2.5 h-2.5 bg-primary rounded-full` when `hasOrders` prop true (page computes it in `page.tsx:134-137` by scanning `localStorage` for `STORAGE_KEYS.ORDER_CACHE*` keys, then passes the flag down).
4. **Cart button** → `setCartOpen(true)` — `ShoppingCart size=16`, count badge only if `count > 0`, opens `CartDrawer`.

### Zone A-strip — Mini Cart Strip
**File:** `MiniCartStrip.tsx` · **Props:** `onClick` · **Sticky:** `top-[57px] z-10` · **Visible:** self-guards `itemCount() === 0 → null`. Clicking the strip calls `onClick` (→ `setCartOpen(true)`).
- Pill: `{count} món` (bg-primary text-white rounded-full)
- Horizontal scroll of item chips: `{item.name} ×{item.quantity}` (bg-muted rounded-full, no wrap)
- Right: total formatted with `formatVND(total())`

### Restaurant Banner
**File:** `RestaurantBanner.tsx` · **Props:** none · **Visible:** Always · **Height:** `h-44`
- `<img src="/restaurant-banner.jpg">` with `object-cover`; on error image hidden, parent gets `bg-gradient-to-br from-primary/30 to-background`
- Gradient overlay: `bg-gradient-to-t from-background/70 to-transparent`
- Bottom-left tagline: `"Bánh cuốn tươi — ngon mỗi ngày"` (text-white/90 text-sm)

### Add-to-Order Banner
**File:** `AddToOrderBanner.tsx` · **Props:** `orderId` · `onViewOrder` · **Visible:** self-guards `!orderId → null` (page passes `searchParams.get('add_to_order')`)
- `mx-4 mt-3` card with `bg-primary/10 border border-primary/30 rounded-xl`
- `PlusCircle` icon + "Chọn món để thêm vào đơn hàng hiện tại" + "Xem đơn" link → `/order/{addToOrderId}`
- When active, CartDrawer CTA changes from "Thanh toán" to "Thêm vào đơn hàng" (calls `addItemsToOrder` mutation).

### Zone B — SearchBar
**File:** `SearchBar.tsx` · **Props:** `onSearch(query)`
- Sticky `top-[52px] z-10`; local `value`; `useEffect` debounces 300ms before calling `onSearch`.
- Clear `×` appears when `value.length > 0`; hint "Nhập ít nhất 2 ký tự" when `0 < len < 2`.
- Query guard in page.tsx: `enabled: searchQuery.length === 0 || searchQuery.length >= 2`.
- Min touch target: `min-h-[44px]` on input, `min-w/h-[44px]` on clear button. **Store:** none.

### Zone C — CategoryTabs
**File:** `CategoryTabs.tsx` · **Props:** `categories[]` · `selected` · `onSelect`
- Sticky `top-[108px] z-10`. First tab "Tất cả" → `onSelect(null)` + one tab per category.
- Active: `border-b-2 border-primary text-primary`; inactive: `border-transparent text-muted-fg`.
- Horizontal scroll: `overflow-x-auto` container, `min-w-max` inner. Pure controlled — no state, no store.

### Zone D — FavouritesRail
**File:** `FavouritesRail.tsx` · **Props:** `products[]` · `combos[]`
- **Visible:** `selectedCategory === null && (favProducts.length > 0 || favCombos.length > 0)`. Returns `null` if none.
- Section header "Yêu thích" (uppercase, muted-fg). Horizontal scroll `flex gap-3 overflow-x-auto px-4 scrollbar-hide`.
- **Sub-component `FavCard`** (internal): `w-28`, image `h-20`, `next/image` fill, fallback emoji 🍜. Entire card is a `<Link href="/menu/favourites">` (NOT product detail). Heart button top-right `bg-white/80 rounded-full`, always filled red, calls `toggleFav`. Name (`line-clamp-1`) + price (`formatVND`).
- **Store:** favourites (`items`, `toggleFav`). No cart, no BE.

### Zone E — ComboSection → ComboCard (the model the rest follow)
**Wrapper:** `ComboSection.tsx` · **Props:** `combos: Combo[]` · `visible` · self-guards `!visible || combos.length === 0 → null`. Renders the "Combo" section header + one `<ComboCard>` per combo.

**`ComboCard`** — `ComboCard.tsx` · **Props:** `combo: Combo` (enriched, with `items[]`)
- Section header "Combo" (uppercase, muted-fg, `text-sm`) lives on the `ComboSection` wrapper. Layout horizontal `bg-card rounded-xl flex gap-3 p-3 shadow-sm`.
- Image `w-20 h-20`, `next/image` fill, fallback 🍱; "Hết" overlay if `!combo.is_available`.
- Combo items list **always visible**: `×{qty}` badge + product name per item (one `<li>` per dish).
- **Interactive parts (3):**
  1. ❤ favourite toggle (top-right of image).
  2. Qty stepper (−/value/+); − calls `updateQty`, + calls `handleAdd` (first press `addItem` with full `combo_items` snapshot, later presses increment). `[+]` only when qty === 0.
  3. **Nhân pills** — single-select "Nhân thịt" / "Nhân thịt mộc nhĩ" (local state `filling`), data-driven from sub-items' available toppings (canh excluded). Cart key `combo_{combo.id}_{filling}` → different nhân = different cart line.
- "Chi tiết" link → `/menu/combo/[id]`. Disabled when `!combo.is_available`.
- **Child modal `ComboModal`:** mounted but `modalOpen` is never set true → dead in current code (`handleAdd` adds directly).
- **Store:** cart (`items`, `addItem`, `updateQty`) + favourites.

### ComboModal
**File:** `ComboModal.tsx` · **Props:** `combo` · `open` · `onClose` · `onConfirm`
- Full-screen overlay: image, name, price, plain `qty x name` list, Đóng / "Thêm combo vào giỏ". Disabled when `!is_available`. **Currently unreachable** (parent never opens it). No state, no store.

### Zone F — ProductList (dual layout)
**Wrapper:** `ProductList.tsx` · **Props:** `products: Product[]` · `withComboHeading` · self-guards `products.length === 0 → null`.
- Section header "Món lẻ" rendered only when `withComboHeading` (i.e. ComboSection is also visible).
- Mobile (`< sm`): `<ProductCard>` — horizontal list card
- Tablet/Desktop (`sm+`): `<ProductGridCard>` — responsive grid (2→3→4 cols)

**`ProductCard` (mobile <sm)** — `ProductCard.tsx` · **Props:** `product: Product`
- Layout horizontal flex, `bg-card rounded-xl p-3 shadow-sm`. Image `w-20 h-20` fill, fallback 🍜; "Hết" overlay if `!is_available`. Image + name link to `/menu/product/[id]`.
- Heart button top-right. Name + price row. Description `line-clamp-2 text-xs` (if present).
- **Filling selector:** "Nhân thịt" / "Nhân thịt mộc nhĩ" pills (local state). Cart key `product_{product.id}_{filling}`.
- **Child modal `ToppingModal` (`requireSingle`):** opens on "+" only when `hasToppings`; else "+" does `handleDirectAdd` (cart-id `product_<id>_plain`). ⚠️ See Concern #3 — `hasToppings` was hardcoded `false` in an earlier audit; treat live value as authoritative.
- **Qty:** `totalQty` aggregates all variants of the product; − removes from the last variant.
- **Store:** cart + favourites.

**`ProductGridCard` (≥sm grid)** — `ProductGridCard.tsx` · **Props:** `product: Product`
- Layout `bg-card rounded-xl overflow-hidden flex flex-col`, square image `aspect-square`. Smaller stepper buttons (`w-6 h-6`).
- `hasToppings` computed from `product.toppings` → opens **`ToppingModal` (multi-select, no `requireSingle`)** when true.
- **No filling selector** (unlike ProductCard). Three add-control branches: hasToppings → "+" opens modal · no toppings & qty 0 → "+" direct add · no toppings & qty>0 → inline −/qty/+ stepper. Cart key for direct add `product_{product.id}_` (trailing underscore — differs from ProductCard's `_plain`).
- **Store:** cart + favourites.

**`ToppingModal`** — `ToppingModal.tsx` · **Props:** `product` · `open` · `onClose` · `onConfirm(selected[])` · `requireSingle?`
- **State:** `selected: Set<id>`. `requireSingle` → radio (replace); else checkbox (toggle). Lists available toppings + price, live total `product.price + Σ topping.price`. Confirm disabled when `requireSingle` and selection ≠ 1. Returns selected toppings to parent (parent does the `addItem`). No store, no BE.

**Empty / loading / error states (Zone F):**
- Search ≥ 2 chars, no results → "Không tìm thấy món nào · Thử từ khóa khác nhé!"
- Category selected, no products + no combos → "Không có món nào trong danh mục này" (`<EmptyState>`)
- Loading skeleton: mobile 5× `h-24 animate-pulse` (1 col); tablet+ 8× `aspect-square animate-pulse` (grid)
- Error: "⚠ Kết nối mạng yếu" + "Thử lại" → `refetch()`

### Zone G — DrinkCustomize
**File:** `DrinkCustomize.tsx` · **Props:** `embedded?`
- **Visible:** `hasCombo || hasNuocDung` where `hasCombo = items.some(i => i.type === 'combo')` and `hasNuocDung = items.some(i => i.type === 'product' && i.name.toLowerCase().includes('nước dùng'))`. Returns `null` otherwise.
- Two `<Stepper>` controls: "Bát có rau" → `drinkConfig.vegBowls` (0–99); "Bát không rau" → `drinkConfig.bowls - drinkConfig.vegBowls` (0–99). Setting either recalculates `bowls = vegBowls + nonVegBowls` → `setDrinkConfig`.
- `embedded` wrapper: normal `mx-4 mt-4 bg-card rounded-xl p-4 shadow-sm`; embedded `border-t border-border px-5 py-4`.

> **Note:** On `/menu` the canh steppers are rendered inline inside `OrderSummary` (see below), so the
> standalone `DrinkCustomize` is the equivalent used on other surfaces.

### Zone I — OrderSummary (most complex)
**File:** `OrderSummary.tsx` · **Props:** `embedded?` · `shakeKey?` (parent bumps `shakeKey` to scroll-to + shake the Canh block when checkout is blocked)
- **Returns `null` when cart empty** (line 45) — that's why it's invisible on the live empty page.
- Header "Tóm tắt đơn hàng" toggles `open` (Ẩn/Hiện); shows `tableName` chip when a table is set.
- **Sub-components (internal):** `ItemGroup` (titled group + per-line rows + subtotal) and `QtyControls` (−/value/+/🗑 + optional price).
- **Collapsible regions:**
  1. **Whole panel** — Ẩn/Hiện toggle.
  2. **COMBO / MÓN LẺ lines** — each combo line "Xem chi tiết / Ẩn chi tiết" → editable sub-items (`updateComboItem` recomputes combo price). Each row: name (+ filling badge if `item.filling` set), qty stepper, price `item.price × item.quantity`, delete 🗑. Subtotal per group.
  3. **Tổng cộng** — grand total `total()` = Σ `price × quantity`.
  4. **Canh block** — always-visible steppers (Bát có rau / Bát không rau, `w-6 h-6`); amber warning "⚠ Bạn chưa chọn canh…" + running-border when `bowls === 0`; `shakeKey` scroll+shake target.
  5. **Tổng số món** — `dishSummaryOpen` toggle; table Món · Nhân · SL · Đơn giá · Thành tiền, sorted desc by qty, total row.
  6. **Ghi chú** — inline textarea (2 rows, placeholder "Nhập ghi chú cho nhà hàng…"), debounced "✓ Đã lưu" after 800ms → `setOrderNote`.
- **Store:** cart — reads `items, total, tableName, drinkConfig, orderNote`; writes via `setDrinkConfig, setOrderNote, updateQty, removeItem, updateComboItem`. 100% client-side, sends nothing to BE. (Full data rules below.)

### Zone J — CartBottomBar
**File:** `CartBottomBar.tsx` · **Props:** `onCheckout` · `dimmed` · **Visible:** self-guards `itemCount() === 0 → null` · **Position:** `fixed bottom-6 left-4 right-4 z-30` (16px side margins, not full-width)
- Single button: left pill `{count}` (bg-white/20 text-white) · center "Thanh toán" · right `formatVND(total())`. `dimmed` only dims the bar (opacity-60); the tap still fires so the page can warn.
- **On tap:** calls `onCheckout` → the page's `handleCheckout` (`page.tsx:145-152`) owns the routing decision: `canhMissing` (`drinkConfig.bowls === 0`) → bump `shakeKey` + toast (block); else `tableId` set → open `TableConfirmModal`; no `tableId` → `router.push('/checkout')` (online flow collects name/phone there).

### CartDrawer (modal)
**File:** `CartDrawer.tsx` · **Props:** `open` · `onClose` · `addToOrderId?` · `onTableCheckout?`
- Slides in from right (`translate-x-full` → `translate-x-0`), `max-w-sm`, `z-50`. Backdrop `fixed inset-0 z-40 bg-black/50`.
- Header: "Giỏ hàng" title, `customerName · tableLabel` sub-line (if set), "Xem đơn hàng" chip when `activeOrderId` set → `/order`, × close.
- Body (scrollable): empty → "Giỏ hàng trống"; each item: name, combo-items collapsible (`expandedCombos: Set`, Chevron; collapsed → "N món · bấm để xem"), toppings list inline, price, −/qty/+ + 🗑 (`updateQty` / `removeItem`).
- **Footer — two mutually-exclusive CTAs:** add-to-order mode (`addToOrderId` set) → **"Thêm vào đơn hàng"** (`addItemsToOrder` mutation → POST add-items → toast + `/order/{addToOrderId}`); else → **"Thanh toán"** (`tableId` → `onTableCheckout()` opens TableConfirmModal; else `/checkout`). Plus "Tiếp tục chọn món" → `onClose()`.
- **Store:** cart (full) + settings. **BE write:** `addItemsToOrder` (only in add-to-order mode).

### TableConfirmModal (modal)
**File:** `TableConfirmModal.tsx` · **Props:** `onClose` · reads `cart` store + `router` internally · **Visible:** `confirmOpen === true` (opened by Zone J or CartDrawer)
- Full-screen overlay `fixed inset-0 z-50 bg-black/60`, `items-end sm:items-center`; card `bg-card rounded-2xl max-w-sm p-5`.
- Content: title "Xác nhận đặt hàng" · scrollable item list (max-h-52) `{qty}× {name}` + price · grand total (bold) · note textarea "Ghi chú cho bếp (tuỳ chọn)" · buttons "Hủy" + "Đặt hàng".
- The page's **only order-create mutation**: `POST /orders` (source `qr`) via `buildOrderItemsPayload`. (Full request/response below.)

### Not rendered on `/menu` (folder siblings)
- **`DrinkCustomize.tsx`** — see Zone G; used inline only when `hasCombo || hasNuocDung`, otherwise OrderSummary's inline canh block is used.
- **`OrderNote.tsx`** — standalone note textarea with debounced "Đã lưu" badge. `/menu` uses OrderSummary's inline note instead.

---

## What Comes FROM BE (reads) — TanStack Query → `GET`

Four queries in page.tsx:144-175. All go through `lib/api-client.ts` (axios) → `GET /api/v1/...`.

| # | Query key | Endpoint | staleTime | Gating |
|---|---|---|---|---|
| 1 | `['categories']` | `GET /categories` | 5 min | always |
| 2 | `['products-all']` | `GET /products` | 5 min | always |
| 3 | `['products', cat, search]` | `GET /products?category_id=&search=&is_available=true` | 5 min | `enabled` only when search len `=== 0` or `>= 2` |
| 4 | `['combos']` | `GET /combos` | 5 min | always |

**Exact fields received** (from `fe/src/types/product.ts`):
- **Category** → `id` · `name` · `sort_order`
- **Product** → `id` · `category_id` · `category_name` · `name` · `description` · `price` · `image_path` · `is_available` · `sort_order` · `toppings[]` (each: `id` · `name` · `price` · `is_available`)
- **ComboRaw** (from `/combos`) → `id` · `category_id` · `name` · `description` · `price` · `image_path` · `sort_order` · `is_available` · `combo_items[]` (each: `id` · `product_id` · `quantity` — **no name, no price**)

**Client-side enrichment** (page.tsx:178-196): raw `combo_items` carry only `product_id`+`quantity`, so a `useMemo` joins them against `products-all` to resolve `product_name` + `unit_price` → the enriched `Combo.items[]`.

---

## What Is SENT TO BE (write) — the only mutation

`TableConfirmModal` → `useMutation` → `POST /orders` (TableConfirmModal.tsx:18-57). This is the **only** request this page sends.

**Request body** (TableConfirmModal.tsx:20-28):

```jsonc
POST /orders
{
  "customer_name":  "",            // always empty from menu (QR flow)
  "customer_phone": "",            // always empty from menu (QR flow)
  "note":           "<orderNote>", // free text or null
  "table_id":       "<tableId>",   // from cart store (QR scan)
  "source":         "qr",
  "items":          [ /* OrderItemPayload[] — see below */ ]
}
```

**Each `items[]` entry** = `OrderItemPayload` (built by `lib/order-payload.ts`):

```jsonc
{
  "product_id":  "uuid | null",   // null for combos
  "combo_id":    "uuid | null",   // null for standalone products
  "quantity":    1,
  "topping_ids": ["uuid", ...],
  "note":        "Có rau | Không rau",   // canh rows only
  "filling":     "thit | moc_nhi | ''",  // products & combo sub-items
  "combo_items": [ { "product_id": "uuid", "quantity": 1, "filling": "thit" } ]  // combo overrides
}
```

**`buildOrderItemsPayload` — the 3 rules (single source of truth for ALL checkout paths):**
1. **Combo** → emitted with `combo_items` overrides (per-dish qty + the combo's `filling`); canh dishes stripped out of the combo.
2. **Filling** (`thit`/`moc_nhi`) → carried on standalone products and combo sub-items.
3. **Canh** → global, driven by the CANH stepper (`drinkConfig`), split into `note:'Có rau'` / `note:'Không rau'` rows referencing the resolved canh `product_id`; **never** inside a combo.

**Response handling:**

| Outcome | Action | Code |
|---|---|---|
| Success | `GET /orders/:id` → cache to `localStorage["order_cache_<id>"]` → `clearCart()` → `router.replace('/order/:id')` | TableConfirmModal.tsx:30-45 |
| `TABLE_HAS_ACTIVE_ORDER` | toast "Bàn này đang có đơn chưa hoàn tất…" + `router.replace('/order/<active_order_id>')` | TableConfirmModal.tsx:46-54 |
| other error | `toast.error(message ?? 'Đặt hàng thất bại')` | TableConfirmModal.tsx:55 |

---

## Tóm tắt đơn hàng (Zone I — OrderSummary) — full data breakdown

**100% client-side**: reads the cart store, sends nothing to BE. Returns `null` when cart empty (line 45).
Header shows "Tóm tắt đơn hàng" + the `tableName` chip when a table is set. Blocks derived live from `useCartStore`:

| Block | Shows | Source |
|---|---|---|
| **COMBO / MÓN LẺ groups** | each cart line · qty stepper · delete · combo expand → editable sub-items · per-line subtotal | `items` split by `type` (lines 47-48) |
| **Tổng cộng** | grand total | `total()` = Σ `price × quantity` (cart.ts:90) |
| **Canh** | Bát có rau / Bát không rau steppers; amber warning + running-border when `bowls === 0` | `drinkConfig` (lines 144-188) |
| **Tổng số món** | table: Món · Nhân · SL · Đơn giá · Thành tiền · per-type rows + grand total | derived `dishSummary` (lines 67-91) |
| **Ghi chú** | free-text note → writes `orderNote`; debounced "Đã lưu ✓" after 800ms | lines 240-257 |

**Non-obvious rules (all traced):**
- **Canh excluded** from "Tổng số món" aggregation (name contains "canh"/"nước dùng", lines 72 & 78) and re-added from `drinkConfig` split có rau / không rau (lines 87-89) — so the preview matches the POST payload **exactly**.
- **Aggregation key = `name|filling`** (lines 73, 79) → "Bánh Cuốn nhân thịt" and "nhân mộc nhĩ" count as separate rows.
- **Đơn giá** comes from `productPriceMap` (product lines + combo sub-item `unit_price`); rows with no known price show `—` (this is why the 0₫ Canh shows blank pricing). Filling display: "Thịt", "Mộc nhĩ", or "—".
- **Combo sub-item qty edit** → `updateComboItem` recomputes the combo's price by `unit_price × delta` (cart.ts:64-79).
- **Filling badge** per line: `thit` → "Nhân thịt", `moc_nhi` → "Nhân thịt mộc nhĩ" (lines 317-321).
- `shakeKey` prop scrolls to + shakes the Canh block when checkout is blocked (lines 17-27).

---

## How It Manages Data CROSS-PAGE

State is split by lifetime across **3 Zustand stores + localStorage**:

| Store | localStorage key | Persisted | Carries across pages | File |
|---|---|---|---|---|
| cart | `cart-config-v3` | **partial** — `orderNote` + `activeOrderId` only | items / tableId / drinkConfig live in memory | `store/cart.ts` |
| settings | `customer-settings` | full | `customerName`, `tableLabel` (header subtitle) | `store/settings.ts` |
| favourites | `favourites` | full | heart badge + Zone D rail | `store/favourites.ts` |

**Critical nuance — cart `partialize` (cart.ts:114):** `items`, `tableId`, `drinkConfig` are deliberately **NOT** persisted. `drinkConfig` (canh count) only makes sense relative to the current (non-persisted) cart, so it resets to 0 on reload instead of resurfacing a stale order's value (migration v4 deletes any old persisted value, cart.ts:105-108).

**Handoffs:**
- **Menu → Order:** after POST, the full order is fetched and written to `localStorage["order_cache_<id>"]` (TableConfirmModal.tsx:37); `/order/:id` reads that cache. The header "Đơn hàng" dot lights when any `order_cache_` key exists (computed `page.tsx:134-137`, rendered via `MenuHeader`'s `hasOrders` prop).
- **Auth token = Zustand memory only** (never localStorage). `router.replace` (not full nav) keeps the token alive across navigation (page.tsx:60).
- **Axios interceptors** (`lib/api-client.ts`): request injects `Bearer` token; 401 → auto-refresh, **but** guests (`sub==='guest'`) and QR contexts (`tableId` set) skip refresh and bounce to `/menu` instead of `/login` (lines 28-49).

**End-to-end loop:** TanStack Query reads catalog (cached 5 min) → user builds cart in Zustand (memory) → OrderSummary previews it live → `buildOrderItemsPayload` serializes it once → `POST /orders` → fetched-back order cached in localStorage → `router.replace('/order/:id')`. No order/table/payment **status** is ever read here.

---

## State Management (in-page + cross-component)

> **Canonical registry:** [`../shared/_INDEX_STATE_MANAGEMENT.md`](../shared/_INDEX_STATE_MANAGEMENT.md) — reuse the stores
> and query keys registered there; never invent a duplicate key for the same resource.

**Layers used on this page** (per the index's State Layers table):

| Layer | Tool | What lives here on `/menu` |
|---|---|---|
| Global client state | **Zustand** | `useCartStore` · `useFavouritesStore` · `useSettingsStore` (cross-page — see index §Global Zustand Stores) |
| Server cache | **TanStack Query** | `['categories']` · `['products-all']` · `['products', cat, search]` · `['combos']` (see index §Server Cache Keys) |
| UI-only local state | **`useState`** | owned by `MenuContent`, passed down by props (below) |
| Form state (RHF+Zod) | — | **not used** on this page; the only text input (note) writes straight to `useCartStore` |

**Page-local state — owned by `MenuContent`** (`page.tsx:30-37`), lifted to the orchestrator and pushed down as props (this is the cross-component channel — zones do not talk to each other directly):

| Local state | Type | Drives | Consumed by |
|---|---|---|---|
| `selectedCategory` | `string \| null` | product/combo filtering + D/E visibility | CategoryTabs, ComboSection, ProductList, FavouritesRail |
| `searchQuery` | `string` | `['products', cat, search]` query (debounced in SearchBar) | SearchBar, ProductList |
| `cartOpen` | `boolean` | CartDrawer open | MenuHeader, MiniCartStrip, CartBottomBar → CartDrawer |
| `confirmOpen` | `boolean` | TableConfirmModal open (QR flow) | CartBottomBar / CartDrawer → TableConfirmModal |
| `hasOrders` | `boolean` | "Đơn hàng" active dot (scans `localStorage` for `ORDER_CACHE*`) | MenuHeader |
| `canhShakeKey` | `number` | bumped to scroll-to + shake the Canh block when checkout is blocked | OrderSummary (`shakeKey` prop) |
| `addToOrderId` | `string \| undefined` | from `?add_to_order` param → Add-to-Order mode | AddToOrderBanner, CartDrawer |

**Cross-component communication:** all shared mutable state is either (a) **global Zustand** (any zone subscribes directly — cart/favourites/settings) or (b) **lifted to `MenuContent`** and passed by props. No context, no event bus, no zone-to-zone calls.

> ⚠️ **Index reconciliation needed** (don't trust silently): the index's §Server Cache Keys lists
> `['categories']` at `60s` but §Per-Page (Menu) and this page use `5 min` — pick one. Also
> `['products-all']` (the unfiltered fetch used for combo enrichment) is **not registered** in the
> index — add it. The index's Per-Page Menu row also omits `cartOpen/confirmOpen/hasOrders/canhShakeKey`.

---

## Rendering & Loading Strategy

> **Canonical patterns:** [`../shared/_INDEX_RENDERING_STRATEGY.md`](../shared/_INDEX_RENDERING_STRATEGY.md) (Pattern A/B/C definitions).

**As-built = Pattern B (Full Client).** `page.tsx` is `'use client'` (line 1); all 4 queries run
client-side via `useQuery` inside `MenuContent`; there is **no** `revalidate`, `HydrationBoundary`,
`dehydrate`, or `prefetchQuery`. The `<Suspense>` wrapper (page.tsx:209) has no `fallback`.

> 🚨 **DRIFT — index says Pattern A.** `_INDEX_RENDERING_STRATEGY.md` row 15 records Menu as
> "Pattern A — ISR + RSC, revalidate 300s, RSC prefetches `['categories']`·`['products',…]`·`['combos']`",
> and `tech_description.md` shows the same aspirational RSC `page.tsx`. **Neither matches the code.**
> Either migrate the page to Pattern A (add an RSC shell that prefetches, keep `MenuContent` as the client child)
> or correct the index row to Pattern B. Until then, treat **Pattern B** as the truth for this page.

**Runtime loading / error / empty states** (all client-side, inside `MenuContent`):

| State | Trigger | UI |
|---|---|---|
| Loading | `loadingProducts` | skeletons — mobile 5× `h-24`, tablet+ 8× `aspect-square` (`animate-pulse`) |
| Error | `isError` on products | "⚠ Kết nối mạng yếu" + "Thử lại" → `refetch()` |
| Empty | 0 results | `<EmptyState>` — "Không tìm thấy món nào…" (search) / "Không có món nào trong danh mục này" (category) |

**Known gaps** (from the index's Known Gaps table — carried here so they aren't lost):
- No `prefetchQuery` on category-tab hover → each tab tap waits a network round-trip.
- No skeleton for Zone C (tabs), Zone E (combos), Zone F (grid) → flash of empty on cold paint.
- Because the page is Pattern B (not the claimed Pattern A), **every cold visit shows a loading flash** —
  there is no server-pre-hydrated HTML.

---

## Shared Components (reuse)

> **Canonical registry:** [`../shared/_INDEX_SHARING_COMPONENT.md`](../shared/_INDEX_SHARING_COMPONENT.md) — check before building; register after.

**Reused on `/menu` (from the index):**

| Component | Tier | File | Used where |
|---|---|---|---|
| `Button` | UI atom | `components/ui/button.tsx` | `page.tsx` (error-state "Thử lại", CTAs) |
| `EmptyState` | Shared | `components/shared/EmptyState.tsx` | Zone F empty/no-result states |

**Menu feature components this page OWNS that the index marks reusable elsewhere** (Tier 3 — `components/menu/` → now `features/menu/components/`): `ProductCard` · `ComboCard` · `CategoryTabs` · `CartDrawer` · `ToppingModal` · `ComboModal`.

> ⚠️ **Reuse opportunity:** the menu feature components import **no** design-system atoms (verified —
> they use raw Tailwind). The custom −/qty/+ steppers (`w-6 h-6`) duplicate the shared
> **`QuantityStepper`** (`shared/QuantityStepper.tsx`, already used by favourites + product-detail), and the
> "Hết" / filling pills could use **`Badge`**. Adopting these would unify touch-target + a11y behaviour.
>
> ⚠️ **Index row is stale:** the Page Directory row for Menu (line 118) still lists pre-refactor names
> (`Header`, `FavoritesRail`, `ProductGridCard`, `NướcDùngCustomize`, `OrderNoteInput`, `CartFAB`) and links to
> the superseded `menu_wireframe_v1.md`. Update it to the as-built names + this spec when the indexes are repointed.

---

## Subpages (part of this route group)

| Route | File | Purpose |
|-------|------|---------|
| `/menu/settings` | `(shop)/menu/settings/page.tsx` | Customer name + table label editor |
| `/menu/favourites` | `(shop)/menu/favourites/page.tsx` | Full favourites list with filter tabs + add-all-to-cart |
| `/menu/favourites/sets` | `(shop)/menu/favourites/sets/page.tsx` | Browse saved favourite sets |
| `/menu/favourites/save` | `(shop)/menu/favourites/save/page.tsx` | Save current favourites as a named set |
| `/menu/product/[id]` | `(shop)/menu/product/[id]/page.tsx` | Product detail |
| `/menu/combo/[id]` | `(shop)/menu/combo/[id]/page.tsx` | Combo detail |

---

## Component File Map

| Component | File |
|-----------|------|
| `MenuContent` (page) | `src/app/(shop)/menu/page.tsx` |
| `TableConfirmModal` | `src/features/menu/components/TableConfirmModal.tsx` |
| `MenuHeader` (Zone A) | `src/features/menu/components/MenuHeader.tsx` |
| `MiniCartStrip` (A-strip) | `src/features/menu/components/MiniCartStrip.tsx` |
| `RestaurantBanner` (banner) | `src/features/menu/components/RestaurantBanner.tsx` |
| `AddToOrderBanner` (add-order) | `src/features/menu/components/AddToOrderBanner.tsx` |
| `SearchBar` | `src/features/menu/components/SearchBar.tsx` |
| `CategoryTabs` | `src/features/menu/components/CategoryTabs.tsx` |
| `FavouritesRail` + `FavCard` | `src/features/menu/components/FavouritesRail.tsx` |
| `ComboSection` (Zone E wrapper) | `src/features/menu/components/ComboSection.tsx` |
| `ComboCard` | `src/features/menu/components/ComboCard.tsx` |
| `ProductList` (Zone F wrapper) | `src/features/menu/components/ProductList.tsx` |
| `ProductCard` | `src/features/menu/components/ProductCard.tsx` |
| `ProductGridCard` | `src/features/menu/components/ProductGridCard.tsx` |
| `ToppingModal` | `src/features/menu/components/ToppingModal.tsx` |
| `CartBottomBar` (Zone J) | `src/features/menu/components/CartBottomBar.tsx` |
| `ComboModal` | `src/features/menu/components/ComboModal.tsx` |
| `DrinkCustomize` | `src/features/menu/components/DrinkCustomize.tsx` |
| `OrderSummary` | `src/features/menu/components/OrderSummary.tsx` |
| `CartDrawer` | `src/features/menu/components/CartDrawer.tsx` |
| `EmptyState` | `src/components/shared/EmptyState.tsx` |

---

## Key Deviations from menu_spec.md (original spec)

| Topic | Old spec | Actual code |
|-------|----------|-------------|
| Header right buttons | Cart badge only | Heart icon + Settings icon + Orders button + Cart button |
| Mini Cart Strip | Not in spec | Exists: sticky item chips below header when cart has items |
| Restaurant Banner | Not in spec | Full-width `h-44` image with gradient + tagline |
| Add-to-Order mode | Not in spec | Banner + CartDrawer CTA switch when `?add_to_order=` param |
| Zone G visibility | Always visible | Only visible when `hasCombo \|\| hasNuocDung` |
| Zone G controls | Rau amount + bowl count | Two steppers: "Bát có rau" + "Bát không rau" |
| Zone H (OrderNote) | Separate component | Merged into bottom of OrderSummary |
| Zone I (OrderSummary) | Combo + Món lẻ groups + total | + embedded canh steppers + dish aggregate table + ghi chú |
| Zone J label | "Xem giỏ hàng" | "Thanh toán" |
| Zone J position | `fixed bottom-0` full-width | `fixed bottom-6 left-4 right-4` (with margins) |
| Zone J behavior | Always → CartDrawer | `tableId` set → TableConfirmModal; no tableId → `/checkout` |
| TableConfirmModal | Not in spec | Full order confirm flow with POST /orders + error handling |
| CartDrawer footer CTA | "Đặt hàng" → `/checkout` | "Thanh toán" or "Thêm vào đơn hàng" (add-to-order mode) |
| ProductCard filling | Not in spec | Nhân thịt / Nhân thịt mộc nhĩ selector (cart key includes filling) |
| ProductCard toppings | Opens ToppingModal | `hasToppings = false` hardcoded — modal never opens (see Concern #3) |
| ProductGridCard | Not in spec | Separate grid card component for tablet/desktop |
| FavouritesRail link | Product detail page | All cards link to `/menu/favourites` |
| Subpages | Not in spec | `/menu/settings`, `/menu/favourites*`, `/menu/product/[id]`, `/menu/combo/[id]` |

---

## Concerns (from live check, 2026-06-07)

1. **`restaurant-banner.jpg` → 404** (`RestaurantBanner.tsx`) — falls back to gradient (works as designed). Add the asset to `fe/public/` if a real photo was intended.
2. **Canh product price = `0 ₫`** in catalog — confirm intentional (free/included). Surfaces as `—` in the "Tổng số món" Đơn giá column and is easy to miss.

### Topping recording — selection vs. "Tóm tắt đơn hàng" (verified 2026-06-07)

> **Data-model mismatch:** in the DB seed (`scripts/seed_real_menu.sql`) "Nhân thịt"/"Nhân thịt mộc nhĩ"
> are **toppings** (`bbbbbbbb-…0001/0002`, price 0) linked to every bánh, and "Rau mùi tàu" is a
> **topping** for Canh (`…0003`). But the FE invents a separate `filling` field (thit/moc_nhi) and
> a separate `drinkConfig` veg/noveg note for rau. So the same concept is modeled two ways.

3. **🚨 Toppings unselectable from the menu list.** `ProductCard.tsx` hardcodes `hasToppings = false`, so the topping hint never shows and `ToppingModal` (fully built) is dead code on `/menu`. The "+" always adds `toppings: []`. Toppings can only be chosen on the product **detail** page (`ToppingSelector`).
4. **🚨 Toppings never rendered in "Tóm tắt đơn hàng".** `OrderSummary` shows name + `filling` badge + qty only; `item.toppings` is read nowhere. "Tổng số món" keys rows by `name|filling` (OrderSummary.tsx:73,79). Price *includes* topping cost so totals are right, but the customer cannot see *which* toppings. Toppings still reach BE via `topping_ids` (order-payload.ts:60).
5. **⚠️ Two add paths disagree.** Menu card → `filling:'thit'`, `toppings:[]`, cart-id `product_<id>_<filling>`. Detail page → `toppings:[Nhân thịt]`, **no `filling`**, cart-id `product_<id>_<toppingKey|'plain'>`. Same product added from the two surfaces yields different cart lines + different metadata, and "nhân" is recorded as a topping in one and as `filling` in the other.

---

## 🔧 Improvement Strategy (Source-of-Truth Backlog)

> Added 2026-06-08 from a strategic review of this spec against the page's stated goals:
> **good rendering strategy · clean cross-component data · clean cross-page data · clean BE contract.**
> Each item = problem → impact → fix → scope. Priority order is the recommended execution order.
> The §Concerns above record *what is wrong*; this section records *what to do about it*.
> **When an item is implemented, update the matching §/AC and flip its row here to ✅.**

**What is already healthy (do not "fix"):**
- ✅ One mutation, one payload builder (`order-payload.ts`) feeding all 3 checkout paths → the
  "preview == POST payload exactly" invariant. Keep it. (§What Is SENT TO BE)
- ✅ State split by lifetime: global mutable → Zustand; page-local UI → `useState` lifted to
  `MenuContent` → props down; no zone-to-zone calls. Structure is correct. (§State Management)

### Prioritized backlog

| # | Severity | Finding | Impact | Fix | Files / layer | Status |
|---|---|---|---|---|---|---|
| **IMP-1** | 🚨 correctness | **"Nhân" double-modeled** (filling vs topping). Menu card → `filling:'thit'`, `toppings:[]`, cart-id `product_<id>_<filling>`; detail page → `toppings:[Nhân thịt]`, no `filling`, cart-id `product_<id>_<toppingKey\|'plain'>`. (Concern #5) | Same dish from 2 surfaces = **duplicate cart lines + inconsistent data to the kitchen**. Inconsistent key suffix (`_plain` vs trailing `_`) is the same drift. | Pick ONE model (DB seed treats nhân as a **topping** → topping model is the likely source of truth). Make both surfaces + the cart-id key builder agree. | `ProductCard.tsx` · `ProductGridCard.tsx` · product-detail · `store/cart.ts` (cart-id) · `order-payload.ts` | ⬜ |
| **IMP-2** | 🚨 perf/race | **`products-all` fetched only to enrich combos** client-side (`useMemo` joins `combo_items` → name+price). (§Data Sources) | Whole catalog downloaded twice; combo price can flash blank/stale until `products-all` resolves. | Move enrichment to BE: `GET /combos` returns `combo_items` with `product_name` + `unit_price`. Delete the query + the `useMemo`. | BE `/combos` handler+service · `page.tsx` (drop `['products-all']` + enrichment) | ⬜ |
| **IMP-3** | 🚨 UX | **Pattern B (full client) on the QR landing page.** Every cold visit = blank → skeleton → content; no server-pre-hydrated HTML. (§Rendering DRIFT) | Worst first-paint on the most-seen customer screen. | Migrate to **Pattern A**: RSC shell `prefetchQuery(['categories'],['combos'],['products'])` → `dehydrate` → `<HydrationBoundary>` → keep `MenuContent` as the `'use client'` child unchanged. | `(shop)/menu/page.tsx` (split RSC shell + client child) | ⬜ |
| **IMP-4** | 🚨 contract | **Toppings invisible in OrderSummary.** `item.toppings` read nowhere; only name + filling badge + qty shown. (Concern #4) | Violates the page's own "preview = saved order" promise — customer can't see which toppings they chose (they still reach BE via `topping_ids`). | Render each line's `item.toppings` in the COMBO/MÓN LẺ rows and in "Tổng số món". | `OrderSummary.tsx` | ⬜ |
| **IMP-5** | 🚨 bug | **Toppings unselectable from the list card.** `ProductCard.tsx` hardcodes `hasToppings = false` → `ToppingModal` is dead code on `/menu` (<sm); "+" always adds `toppings:[]`. (Concern #3, AC-11) | Mobile customers can't pick toppings except via detail page. Folds into IMP-1's model decision. | Drive `hasToppings` from real `product.toppings`; align with IMP-1 model. | `ProductCard.tsx` | ⬜ |
| **IMP-6** | ⚠️ UX/data | **Persistence split is inconsistent:** `orderNote` persists but `items` do not. (§Cross-Page) | On mobile QR (screen-lock / app-switch / reload) the half-built cart is wiped, but a now-orphan note survives. | Decide one rule: either persist `items` too (with a version/TTL guard like the drinkConfig v4 migration) OR drop `orderNote` from persistence. `drinkConfig`-resets-to-0 reasoning stays valid. | `store/cart.ts` (`partialize`) | ⬜ |
| **IMP-7** | ⚠️ hygiene | **`order_cache_<id>` keys never pruned;** `hasOrders` scans them on every mount. (§Cross-Page) | Unbounded localStorage growth on shared/repeat devices; slower scan over time. | Add a cap or TTL sweep when writing a new cache entry. | `TableConfirmModal.tsx` (write) · `page.tsx` (scan) | ⬜ |
| **IMP-8** | ℹ️ docs | **staleTime drift:** index says `['categories'] = 60s`, this page uses `5min`. Also `['products-all']` not registered in the index; index Per-Page Menu row omits `cartOpen/confirmOpen/hasOrders/canhShakeKey`. (§State Management) | Index and as-built disagree. | Reconcile `_INDEX_STATE_MANAGEMENT.md` to match this spec (or delete `['products-all']` via IMP-2, which moots it). | `../shared/_INDEX_STATE_MANAGEMENT.md` | ⬜ |

### Sequencing notes
- **IMP-1 + IMP-5** are one decision (the nhân model) — do them together; IMP-4 then renders whatever model wins.
- **IMP-2 and IMP-3** are independent of the data-model work and of each other — either can go first; doing IMP-2 first shrinks the query set IMP-3's RSC shell must prefetch.
- **IMP-6 / IMP-7 / IMP-8** are small, low-risk, batchable.
- Each item is sized to fit the < 100k-token / 1-session rule; register a `MASTER_TASK.md` row before starting any.

---

## Acceptance Criteria

> Carried over from the original design spec (`../client_menu_page/menu_spec.md`).
> ✅ = matches as-built · ⚠️ = as-built differs from the original AC (note inline).

```
AC-01  QR scan → /table/[id] → redirects to /menu with tableLabel set in settingsStore        ✅
AC-02  Header shows shop name, tableLabel from settingsStore, and cart item count badge         ✅
AC-03  CategoryTabs loads from GET /categories; "Tất cả" is selected by default                 ✅
AC-04  Selecting a category → ProductList filters; ComboSection + FavouritesRail hide           ✅
AC-05  SearchBar debounces input 300ms before query; shows × clear button when typing           ✅
AC-06  Search with < 2 characters → no API call; shows "Nhập ít nhất 2 ký tự"                   ✅
AC-07  Search with no results → EmptyState: "Không tìm thấy món nào · Thử từ khóa khác nhé!"    ✅
AC-08  FavouritesRail appears only when selectedCategory === null AND favItems.length > 0       ✅
AC-09  Tapping heart on ProductCard/ComboCard → toggles favourite (persisted)                   ✅
AC-10  ComboSection appears only when selectedCategory === null (and combos.length > 0)         ✅
AC-11  Tapping [+] on a product with toppings → opens ToppingModal                              ⚠️ only on ProductGridCard (≥sm). ProductCard (<sm) hardcodes hasToppings=false → modal never opens. See Concern #3.
AC-12  Tapping [+] on a product without toppings → adds directly to cart; qty control shown     ✅
AC-13  Tapping product name/image → navigates to /menu/product/[id]                             ✅
AC-14  CartBottomBar appears only when itemCount > 0; shows count + total                       ✅
AC-15  Tapping CartBottomBar → checkout flow                                                    ⚠️ QR (tableId set) → TableConfirmModal; no tableId → /checkout. Blocked with shake when canh bowls === 0.
AC-16  CartDrawer footer CTA proceeds to order                                                  ⚠️ label "Thanh toán" (or "Thêm vào đơn hàng" in add-to-order mode), not "Đặt hàng".
AC-17  drinkConfig changes → updates cartStore.drinkConfig instantly                            ✅ (canh steppers inline in OrderSummary; Zone G only when hasCombo||hasNuocDung)
AC-18  orderNote persists across reloads (localStorage via Zustand persist)                     ✅
AC-19  OrderSummary groups items by Combo and Món lẻ; subtotal per group + grand total          ✅ (+ canh block + "Tổng số món" table + note)
AC-20  Product image fails → shows 🍜 placeholder (no broken image icon)                         ✅
AC-21  Network error on product/category fetch → error state with [Thử lại] button              ✅
AC-22  All interactive elements: min touch target 44 × 44 px                                    ✅
AC-23  is_available: false → product card shows "Hết" overlay; [+] disabled                     ✅
```

**As-built ACs (behaviour not in the original design spec):**

```
AC-24  Combo/product cards show "Nhân thịt / Nhân thịt mộc nhĩ" pills; cart key includes filling     ✅
AC-25  Canh count = 0 → amber warning in OrderSummary; checkout blocked + Canh block shakes     ✅
AC-26  TableConfirmModal (QR flow): "Đặt hàng" → POST /orders → /order/:id; TABLE_HAS_ACTIVE_ORDER → redirect to active order  ✅
AC-27  ?add_to_order=<id> → Add-to-Order banner shows; CartDrawer CTA = "Thêm vào đơn hàng"      ✅
```

---

*Canonical as-built spec. Merged from `menu_spec_ver1.md` + `Menu_Status_Routing_Reference.md`, ACs from `menu_spec.md` — 2026-06-08*
*Source files: `src/app/(shop)/menu/page.tsx` + `src/features/menu/components/*`*
