---
page: Menu (Ordering Experience) — combined as-built reference
route: /(shop)/menu/page.tsx
spec_ref: Spec_3 §4
created: 2026-06-07
updated: 2026-06-07 — ALL menu zones (incl. TableConfirmModal) extracted from page.tsx into feature components (branch Refactor-menu); page.tsx is now purely orchestration (queries + page state + zone composition).
status: ✅ As-built — documents current code exactly
combines:
  - menu_spec_ver1.md (zone/visual spec — exact classes, sticky positions, subpages, deviations)
  - Menu_Status_Routing_Reference.md (data flow — BE reads/writes, store lifetime, component tree, concerns)
---

# Menu Page — Combined Reference (As-Built)

> **Purpose:** single source documenting what is *actually implemented* at
> `http://localhost:3000/menu`. Read-from-code, not aspirational. Merges the visual/zone
> spec with the data-flow / status-routing reference. Every cell traced to code as of 2026-06-07.
>
> **Source page:** `fe/src/app/(shop)/menu/page.tsx` + `src/features/menu/components/*`
>
> **State wrapper:** `<Suspense>` → `<MenuContent>`. `MenuContent` is a pure orchestrator: it owns the 4 queries + page state and composes zone components (`MenuHeader`, `MiniCartStrip`, `RestaurantBanner`, `AddToOrderBanner`, `SearchBar`, `CategoryTabs`, `FavouritesRail`, `ComboSection`, `ProductList`, `OrderSummary`, `CartBottomBar`, `CartDrawer`, `TableConfirmModal`). No zone is inline any more.
> **Who sees it:** Customer (guest JWT from QR scan, or direct browser access)
> **Entry:** QR scan → `/table/[id]` → redirect to `/menu` | direct URL
> **?add_to_order=<id>:** activates Add-to-Order mode (banner + CartDrawer CTA changes)

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

*Combined from `menu_spec_ver1.md` + `Menu_Status_Routing_Reference.md` — 2026-06-07*
*Source files: `src/app/(shop)/menu/page.tsx` + `src/features/menu/components/*`*
