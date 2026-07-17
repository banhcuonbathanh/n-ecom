---
page: Menu (Ordering Experience) — v1 as-built
route: /(shop)/menu/page.tsx
spec_ref: Spec_3 §4
created: 2026-06-04
status: ✅ As-built — documents current code exactly
---

# Page Spec: Menu — Version 1 (As-Built)

> **Purpose:** documents what is *actually implemented* at `http://localhost:3000/menu`.
> This is a read-from-code spec, not a design spec. No aspirational content.

**Route:** `/(shop)/menu/page.tsx`  
**State wrapper:** `<Suspense>` → `<MenuContent>`  
**Who sees it:** Customer (guest JWT from QR scan, or direct browser access)  
**Entry:** QR scan → `/table/[id]` → redirect to `/menu` | direct URL  
**?add_to_order=<id>:** activates Add-to-Order mode (banner + CartDrawer CTA changes)

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

**CartStore persistence** (`STORAGE_KEYS.CART_CONFIG`):  
Persisted fields: `drinkConfig`, `orderNote`, `activeOrderId`.  
NOT persisted: `items`, `tableId`, `tableName` (session-only).

---

## Zone Table (actual)

| Zone | Component | Visibility | Position |
|------|-----------|-----------|----------|
| A | Header (inline in page.tsx) | Always | `sticky top-0 z-20` |
| A-strip | Mini Cart Strip (inline) | `itemCount > 0` | `sticky top-[57px] z-10` |
| banner | Restaurant Banner (inline) | Always | Static, below header |
| add-order | Add-to-Order Banner (inline) | `?add_to_order` param present | Static, below banner |
| B | `<SearchBar>` | Always | `sticky top-[52px] z-10` (own sticky) |
| C | `<CategoryTabs>` | Always | `sticky top-[108px] z-10` (own sticky) |
| D | `<FavouritesRail>` | `selectedCategory === null && favItems.length > 0` | Scrollable |
| E | `<ComboCard>` list | `selectedCategory === null && combos.length > 0` | Scrollable |
| F | `<ProductCard>` / `<ProductGridCard>` | Always (or EmptyState) | Scrollable |
| G | `<DrinkCustomize>` | `hasCombo || hasNuocDung` in cart | Scrollable |
| I | `<OrderSummary>` (includes note) | `items.length > 0` | Scrollable |
| J | CartBottomBar (inline) | `itemCount > 0` | `fixed bottom-6 left-4 right-4 z-30` |
| modal | `<CartDrawer>` | Controlled by `cartOpen` state | Slide-in from right, `z-50` |
| modal | `<TableConfirmModal>` | Controlled by `confirmOpen` state | Full-screen overlay, `z-50` |

> **Note:** Zone H (OrderNote) from the old spec does not exist as a separate component.  
> The note textarea lives inside `<OrderSummary>` at the bottom of its collapsed section.

---

## Zone A — Header

**File:** inline in `(shop)/menu/page.tsx`  
**Sticky:** `top-0 z-20`

Left side:
- Shop name: `Quán Bánh Cuốn` (hardcoded h1, `font-display text-xl`)
- Table label: `settingsStore.tableLabel` shown as `text-xs text-muted-fg` below name (only if set)

Right side (flex gap-2):
1. **Heart icon button** → links to `/menu/favourites`
   - Icon: `Heart size=18`; filled red if `favItems.length > 0`, faded if 0
   - Badge: absolute `-top-1 -right-1`, red circle, count (capped "9+")
2. **Settings icon button** → links to `/menu/settings`
   - Icon: `Settings size=18 text-muted-fg`
3. **"Đơn hàng" button** → `router.push('/order')`
   - Icon: `ClipboardList size=16`
   - Label: "Đơn hàng" (hidden on `< sm`)
   - Active-order dot: absolute `w-2.5 h-2.5 bg-primary rounded-full` if `hasOrders === true`
4. **Cart button** → `setCartOpen(true)`
   - Icon: `ShoppingCart size=16`
   - Badge: absolute, count pill, only if `count > 0`

---

## Zone A-strip — Mini Cart Strip

**File:** inline in `(shop)/menu/page.tsx`  
**Sticky:** `top-[57px] z-10` (immediately below header)  
**Visible:** only when `itemCount > 0`

Clicking the strip calls `setCartOpen(true)`.

Content:
- Pill: `{count} món` (bg-primary text-white rounded-full)
- Horizontal scroll of item chips: `{item.name} ×{item.quantity}` (bg-muted rounded-full, no wrap)
- Right: total formatted with `formatVND(total())`

---

## Restaurant Banner

**File:** inline in `(shop)/menu/page.tsx`  
**Visible:** Always  
**Height:** `h-44`

- `<img src="/restaurant-banner.jpg">` with `object-cover`
- On error: image is hidden, parent gets `bg-gradient-to-br from-primary/30 to-background`
- Gradient overlay: `bg-gradient-to-t from-background/70 to-transparent`
- Bottom-left tagline: `"Bánh cuốn tươi — ngon mỗi ngày"` (text-white/90 text-sm)

---

## Add-to-Order Banner

**File:** inline in `(shop)/menu/page.tsx`  
**Visible:** only when `searchParams.get('add_to_order')` is non-null

- `mx-4 mt-3` card with `bg-primary/10 border border-primary/30 rounded-xl`
- `PlusCircle` icon + "Chọn món để thêm vào đơn hàng hiện tại"
- "Xem đơn" link → `/order/{addToOrderId}`

When this mode is active, CartDrawer CTA changes from "Thanh toán" to "Thêm vào đơn hàng" (calls `addItemsToOrder` mutation).

---

## Zone B — SearchBar

**File:** `src/features/menu/components/SearchBar.tsx`  
**Props:** `onSearch: (query: string) => void`

- Sticky: `top-[52px] z-10` (its own sticky, inside `<SearchBar>`)
- Debounce: 300ms (`setTimeout`)
- Clear button (×): appears when `value.length > 0`
- Hint: "Nhập ít nhất 2 ký tự" shown when `0 < value.length < 2`
- Query guard in page.tsx: `enabled: searchQuery.length === 0 || searchQuery.length >= 2`
- Min touch target: `min-h-[44px]` on input, `min-w/h-[44px]` on clear button

---

## Zone C — CategoryTabs

**File:** `src/features/menu/components/CategoryTabs.tsx`  
**Props:** `categories`, `selected`, `onSelect`

- Sticky: `top-[108px] z-10`
- First tab: "Tất cả" (calls `onSelect(null)`)
- Active style: `border-b-2 border-primary text-primary`
- Inactive style: `border-transparent text-muted-fg`
- Horizontal scroll: `overflow-x-auto` on container, `min-w-max` on inner div

---

## Zone D — FavouritesRail

**File:** `src/features/menu/components/FavouritesRail.tsx`  
**Props:** `products: Product[]`, `combos: Combo[]`

**Visible:** `selectedCategory === null && (favProducts.length > 0 || favCombos.length > 0)`

- Section header: "Yêu thích" (uppercase, muted-fg)
- Horizontal scroll: `flex gap-3 overflow-x-auto px-4 scrollbar-hide`
- Each `FavCard`:
  - Size: `w-28`, image `h-20`, `relative`
  - Entire card is a `<Link href="/menu/favourites">` (not to product detail)
  - Image: `next/image` fill, fallback emoji 🍜
  - Heart button (top-right): `bg-white/80 rounded-full`, always filled red (is-favourite), calls `toggleFav`
  - Shows name (`line-clamp-1`) and price (`formatVND`)

---

## Zone E — ComboSection

**Visible:** `selectedCategory === null && combos.length > 0`  
**Section header:** "Combo" (uppercase, muted-fg, `text-sm`)

**File:** `src/features/menu/components/ComboCard.tsx`  
**Props:** `combo: Combo`

Each `ComboCard` layout (horizontal, `bg-card rounded-xl flex gap-3 p-3 shadow-sm`):
- Image: `w-20 h-20`, `next/image` fill, fallback 🍱; "Hết" overlay if `!combo.is_available`
- Heart button: top-right of image, toggles favourite
- Name + price row
- Combo items list (always visible): `×{qty}` badge + product name per item
- **Filling selector:** two pill buttons — "Nhân thịt" / "Nhân thịt mộc nhĩ" (local state `filling`)
  - Cart key: `combo_{combo.id}_{filling}`
- "Chi tiết" link → `/menu/combo/[id]`
- Qty stepper: [−] n [+] when qty > 0; [+] only when qty === 0
- Disabled when `!combo.is_available`

`<ComboModal>` is wired but `handleAdd` is called directly — modal renders but is never opened from this card.

---

## Zone F — ProductList

**Section header:** "Món lẻ" (only shown when ComboSection is also visible)

**Dual layout:**
- Mobile (`< sm`): `<ProductCard>` — horizontal list card
- Tablet/Desktop (`sm+`): `<ProductGridCard>` — responsive grid (2→3→4 cols)

### ProductCard (mobile)

**File:** `src/features/menu/components/ProductCard.tsx`

Layout: horizontal flex, `bg-card rounded-xl p-3 shadow-sm`

- Image: `w-20 h-20`, `next/image` fill, fallback 🍜; "Hết" overlay if `!is_available`
- Image + name are links to `/menu/product/[id]`
- Heart button: top-right of image
- Name + price row
- Description: `line-clamp-2 text-xs` (shown if present)
- **Filling selector:** "Nhân thịt" / "Nhân thịt mộc nhĩ" pill buttons (local state)
  - Cart key: `product_{product.id}_{filling}`
- `hasToppings` is **hardcoded `false`** — ToppingModal never opens from this card
- "Chi tiết" link → `/menu/product/[id]`
- Qty stepper or add [+] button (same pattern as ComboCard)

### ProductGridCard (tablet/desktop)

**File:** `src/features/menu/components/ProductGridCard.tsx`

Layout: `bg-card rounded-xl overflow-hidden flex flex-col`, square image `aspect-square`

- `hasToppings`: computed from `product.toppings` — opens `<ToppingModal>` when true
- No filling selector (unlike ProductCard)
- Cart key: `product_{product.id}_` (no filling suffix)
- Smaller stepper buttons (`w-6 h-6`)

### Empty state

- Search query ≥ 2 chars, no results: "Không tìm thấy món nào · Thử từ khóa khác nhé!"
- Category selected, no products + no combos: "Không có món nào trong danh mục này"
- Component: `<EmptyState>` from `src/components/shared/EmptyState.tsx`

### Loading skeleton

- Mobile: 5× `h-24 animate-pulse` cards (1 col)
- Tablet+: 8× `aspect-square animate-pulse` cards (grid)

### Error state

- "⚠ Kết nối mạng yếu" + "Thử lại" button → calls `refetch()`

---

## Zone G — DrinkCustomize

**File:** `src/features/menu/components/DrinkCustomize.tsx`  
**Props:** `embedded?: boolean`

**Visible:** `hasCombo || hasNuocDung` where:
- `hasCombo = items.some(i => i.type === 'combo')`
- `hasNuocDung = items.some(i => i.type === 'product' && i.name.toLowerCase().includes('nước dùng'))`

Returns `null` if neither condition is met.

Two `<Stepper>` controls:
1. "Bát có rau" → `drinkConfig.vegBowls` (min 0, max 99)
2. "Bát không rau" → `drinkConfig.bowls - drinkConfig.vegBowls` (min 0, max 99)

Setting either recalculates `bowls = vegBowls + nonVegBowls` and calls `setDrinkConfig`.

`embedded` prop changes wrapper class:
- Normal: `mx-4 mt-4 bg-card rounded-xl p-4 shadow-sm`
- Embedded: `border-t border-border px-5 py-4`

---

## Zone H — Order Note

> **There is no standalone OrderNote component used in menu/page.tsx.**

The note textarea is embedded inside `<OrderSummary>` at the bottom of its open state:
- Textarea: 2 rows, placeholder "Nhập ghi chú cho nhà hàng..."
- Auto-save indicator: "✓ Đã lưu" (green, appears 800ms after last keystroke)
- Persisted via `cartStore.setOrderNote` → Zustand persist → localStorage

---

## Zone I — OrderSummary

**File:** `src/features/menu/components/OrderSummary.tsx`  
**Props:** `embedded?: boolean`

**Visible:** `items.length > 0` (returns null otherwise)

Collapsible via header button ("Ẩn" / "Hiện").  
Shows `tableName` badge if `cartStore.tableName` is set.

When open, contains four sub-sections:

### 1. Item groups

**COMBO** group and **MÓN LẺ** group (each only if items exist in that type).

Each item row:
- Name (with filling badge if `item.filling` is set)
- Qty stepper: [−] n [+] (via `updateQty`)
- Price: `item.price × item.quantity`
- Delete: `<Trash2>` (via `removeItem`)

Combo items: collapsible sub-list via "Xem chi tiết" / "Ẩn chi tiết" toggle.  
Each combo sub-item has its own qty stepper + delete (via `updateComboItem`).

Subtotal line per group.

### 2. Grand total line

`Tổng cộng:` + `formatVND(total())`

### 3. Canh (soup bowls) section

Embedded canh controls (mirrors DrinkCustomize):
- Warning: "⚠ Bạn chưa chọn canh — thêm số bát bên dưới nếu cần." (amber, only if `bowls === 0`)
- Two inline steppers: "Bát có rau" / "Bát không rau" (smaller buttons `w-6 h-6`)

### 4. Tổng số món (dish aggregate table)

Collapsible section ("Tổng số món (N loại)").

Aggregates all dish names across products + combo items into a table:
- Columns: Món | Nhân | SL | Đơn giá | Thành tiền
- Filling display: "Thịt", "Mộc nhĩ", or "—"
- Sorted descending by qty
- Total row at bottom

### 5. Ghi chú

Textarea + auto-save "✓ Đã lưu" indicator (see Zone H).

---

## Zone J — CartBottomBar

**File:** inline in `(shop)/menu/page.tsx`  
**Visible:** `itemCount > 0`  
**Position:** `fixed bottom-6 left-4 right-4 z-30` (not full-width; has 16px side margins)

Single button:
- Left: pill `{count}` (bg-white/20 text-white)
- Center: "Thanh toán"
- Right: `formatVND(total())`

**On tap:**
- `tableId` is set → opens `<TableConfirmModal>`
- `tableId` is null → `router.push('/checkout')`

---

## CartDrawer

**File:** `src/features/menu/components/CartDrawer.tsx`  
**Props:** `open`, `onClose`, `addToOrderId?`, `onTableCheckout?`

Slides in from right (`translate-x-full` → `translate-x-0`), `max-w-sm`, `z-50`.  
Backdrop: `fixed inset-0 z-40 bg-black/50`.

Header:
- "Giỏ hàng" title
- `customerName · tableLabel` sub-line (if set)
- "Xem đơn hàng" button if `activeOrderId` is set → `router.push('/order')`
- × close button

Body (scrollable):
- Empty: "Giỏ hàng trống"
- Each item: name, combo-items collapsible, toppings list, price, qty stepper + delete

Footer:
- Total line
- **Normal mode:** "Thanh toán" → `handleCheckout` (same tableId logic as Zone J)
- **Add-to-Order mode** (`addToOrderId` set): "Thêm vào đơn hàng" → `addItemsToOrder` mutation → toast + `router.push('/order/{addToOrderId}')`
- "Tiếp tục chọn món" → `onClose()`

---

## TableConfirmModal

**File:** inline in `(shop)/menu/page.tsx`  
**Visible:** when `confirmOpen === true` (opened by Zone J or CartDrawer)

- Full-screen overlay (`fixed inset-0 z-50 bg-black/60`), `items-end sm:items-center`
- Card: `bg-card rounded-2xl max-w-sm p-5`

Content:
- Title: "Xác nhận đặt hàng"
- Scrollable item list (max-h-52): `{qty}× {name}` + formatted price per item
- Grand total row (bold)
- Note textarea: "Ghi chú cho bếp (tuỳ chọn)"
- Two buttons: "Hủy" + "Đặt hàng"

Mutation: `POST /orders` with `{ customer_name: '', customer_phone: '', note, table_id, source: 'qr', items }`

On success:
1. Fetches full order via `GET /orders/{id}`
2. Caches to `localStorage[STORAGE_KEYS.ORDER_CACHE + order.id]`
3. `cart.clearCart()`
4. `router.replace('/order/{id}')`

On `TABLE_HAS_ACTIVE_ORDER` error: `router.replace('/order/{active_order_id}')` silently.  
On other errors: `toast.error(message)`

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
| `TableConfirmModal` | `src/app/(shop)/menu/page.tsx` (inline) |
| `SearchBar` | `src/features/menu/components/SearchBar.tsx` |
| `CategoryTabs` | `src/features/menu/components/CategoryTabs.tsx` |
| `FavouritesRail` + `FavCard` | `src/features/menu/components/FavouritesRail.tsx` |
| `ProductCard` | `src/features/menu/components/ProductCard.tsx` |
| `ProductGridCard` | `src/features/menu/components/ProductGridCard.tsx` |
| `ToppingModal` | `src/features/menu/components/ToppingModal.tsx` |
| `ComboCard` | `src/features/menu/components/ComboCard.tsx` |
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
| ProductCard toppings | Opens ToppingModal | `hasToppings = false` hardcoded — modal never opens |
| ProductGridCard | Not in spec | Separate grid card component for tablet/desktop |
| FavouritesRail link | Product detail page | All cards link to `/menu/favourites` |
| Subpages | Not in spec | `/menu/settings`, `/menu/favourites*`, `/menu/product/[id]`, `/menu/combo/[id]` |

---

*Generated from source code — 2026-06-04*  
*Source files: `src/app/(shop)/menu/page.tsx` + `src/features/menu/components/*`*
