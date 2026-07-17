---
page: Menu (Ordering Experience)
route: /(shop)/menu/page.tsx
spec_ref: Spec_3 §4
created: 2026-05-25
status: ✅ Built — use as reference doc
---

# Page Spec: Menu

**Route:** `/(shop)/menu/page.tsx`
**Spec ref:** `Spec_3_Menu_Checkout_UI_v2.md §4`
**Who sees it:** Customer (guest JWT, from QR scan)
**Entry:** QR scan → `/table/[id]` → redirect to `/menu`
**Exits:** Tap product name/image → `/menu/product/[id]` · Tap cart → CartDrawer · Proceed → `/checkout`

---

## Step 2 — Data Sources

| Zone | Data | Source | Update | Query key |
|------|------|--------|--------|-----------|
| A | tableLabel, customerName | `settingsStore` | Zustand | — |
| B | search results | `GET /api/v1/products?search=` | TanStack Query (debounced 300ms) | `['products', categoryId, searchQuery]` |
| C | categories | `GET /api/v1/categories` | TanStack Query | `['categories']` — staleTime 5min |
| D | favourites | `favouritesStore` | Zustand + localStorage | — |
| E | combos | `GET /api/v1/combos` | TanStack Query | `['combos']` — staleTime 5min |
| F | products | `GET /api/v1/products?is_available=true` | TanStack Query | `['products', categoryId]` — staleTime 5min |
| G | drinkConfig | `cartStore.drinkConfig` | Zustand | — |
| H | orderNote | `cartStore.orderNote` | Zustand + localStorage | — |
| I | cart items (computed) | `cartStore.items` | Zustand | — |
| J | cart total (computed) | `cartStore.total()` | Zustand | — |

---

## Step 3 — Zone Table

| Zone | Name | Visibility | Sticky / Position |
|------|------|-----------|-------------------|
| A | Header | Always | `top-0 z-20` |
| B | SearchBar | Always | `top-[52px] z-10` |
| C | CategoryTabs | Always | `top-[108px] z-10` |
| D | FavouritesRail | `selectedCategory === null` AND `favourites.length > 0` | Scrollable |
| E | ComboSection | `selectedCategory === null` | Scrollable |
| F | ProductList | Always | Scrollable |
| G | DrinkCustomize | Always | Scrollable |
| H | OrderNote | Always | Scrollable |
| I | OrderSummary | Always (collapsible) | Scrollable |
| J | CartBottomBar | `cart.itemCount > 0` | `fixed bottom-0 z-30` |

---

## Step 4 — Wireframe

```
MOBILE — 390 px wide
┌──────────────────────────────────────────────┐
│ [Zone A — Header]                             │ ← sticky top-0 z-20
│  Quán Bánh Cuốn        Bàn 3      🛒 2       │
│                         (tableLabel)  (count) │
├──────────────────────────────────────────────┤
│ [Zone B — SearchBar]                          │ ← sticky top-[52px] z-10
│  🔍 Tìm món nhanh...                    [×]  │
├──────────────────────────────────────────────┤
│ [Zone C — CategoryTabs]                       │ ← sticky top-[108px] z-10
│  [Tất cả]  Bánh Cuốn  Chả  Nước  →          │ ← horizontal scroll
├──────────────────────────────────────────────┤
│ [Zone D — FavouritesRail]  (if fav count > 0)│
│  YÊU THÍCH              [xem thêm →]         │
│  ┌─────────┐ ┌─────────┐                     │
│  │❤ Combo  │ │❤ Bánh   │  →                 │ ← horizontal scroll
│  │180,000₫ │ │45,000₫  │                     │
│  └─────────┘ └─────────┘                     │
├──────────────────────────────────────────────┤
│ [Zone E — ComboSection]  (if selectedCat=null)│
│  COMBO                                        │
│  ┌──────────────────────────────────────┐    │
│  │ [img]  Combo Gia Đình   180,000₫     │    │
│  │        2× Bánh Cuốn Thịt             │    │
│  │        1× Chả Chiên                  │    │
│  │        Chi tiết #001    [-] 1 [+] ❤  │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ [img]  Combo Tiêu Chuẩn  120,000₫   │    │
│  │        Chi tiết #002    [-] 1 [+] ❤  │    │
│  └──────────────────────────────────────┘    │
├──────────────────────────────────────────────┤
│ [Zone F — ProductList]  (1-col list)          │
│  MÓN LẺ                                       │
│  ┌──────────────────────────────────────┐    │
│  │ [img] Bánh Cuốn Thịt    45,000₫     │    │
│  │       Có thể chọn topping            │    │
│  │       Chi tiết       [+]             │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ [img] Bánh Cuốn Tôm     50,000₫     │    │
│  │       Chi tiết  [-] 1 [+]            │    │
│  └──────────────────────────────────────┘    │
│                                               │
│  (empty state — no results)                   │
│   🔍  Không tìm thấy món nào                  │
│       Thử từ khóa khác nhé!                   │
├──────────────────────────────────────────────┤
│ [Zone G — DrinkCustomize]                     │
│  NƯỚC DÙNG                                    │
│  Rau: (•) Rau nhiều  ( ) Rau vừa  ( ) Không  │
│  Số bát:  [-] 2 [+]                           │
├──────────────────────────────────────────────┤
│ [Zone H — OrderNote]                          │
│  GHI CHÚ                                      │
│  ┌──────────────────────────────────────┐    │
│  │ Nhập ghi chú cho nhà hàng...         │    │
│  └──────────────────────────────────────┘    │
├──────────────────────────────────────────────┤
│ [Zone I — OrderSummary]  (collapsible)        │
│  Tóm tắt đơn hàng              [▼ Ẩn]        │
│  ─────────────────────────────────────────   │
│  COMBO                                        │
│  • Combo Gia Đình x1         180,000₫  [▼]   │
│    · Bánh Cuốn Thịt x2                        │
│  • Combo Tiêu Chuẩn x2       240,000₫  [▶]   │
│  Subtotal:                    420,000₫        │
│  ─────────────────────────────────────────   │
│  MÓN LẺ                                       │
│  • Bánh Cuốn Thịt x1          45,000₫  [▼]   │
│  Subtotal:                     45,000₫        │
│  ─────────────────────────────────────────   │
│  TỔNG CỘNG:                   465,000₫        │
├──────────────────────────────────────────────┤
│ [Zone J — CartBottomBar]  (if itemCount > 0)  │ ← fixed bottom-0 z-30
│  [🛒 2]   Xem giỏ hàng          465,000₫     │ ← full width
└──────────────────────────────────────────────┘

─────────────────── LOADING STATE ──────────────────
┌──────────────────────────────────────────────┐
│ [A] Header (renders immediately)              │
├──────────────────────────────────────────────┤
│ [C] CategoryTabs skeleton                     │
│  ░░░░░  ░░░░░░░░  ░░░░  ░░░░░               │
├──────────────────────────────────────────────┤
│ [F] Product skeleton × 3                      │
│  ┌──────────────────────────────────────┐    │
│  │ ░░░░░░░  ░░░░░░░░░░░░░░░░░          │    │
│  │          ░░░░░░░░░░                  │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘

─────────────────── ERROR STATE ────────────────────
┌──────────────────────────────────────────────┐
│ [A] Header (renders immediately)              │
├──────────────────────────────────────────────┤
│                                               │
│   ⚠  Kết nối mạng yếu                        │
│      [Thử lại]                               │
│                                               │
└──────────────────────────────────────────────┘
```

---

## Step 5 — Component Map

| Zone | Component | Reuse? | File |
|------|-----------|--------|------|
| A | `Header` (inline) | new | `(shop)/menu/page.tsx` |
| B | `SearchBar` | new | `components/menu/SearchBar.tsx` |
| C | `CategoryTabs` | ✅ reuse → [shared/CategoryTabs] | `components/menu/CategoryTabs.tsx` |
| D | `FavouritesRail` | new | `components/menu/FavouritesRail.tsx` |
| E | `ComboCard` | ✅ reuse → [shared/ComboCard] | `components/menu/ComboCard.tsx` |
| E | `ComboModal` | ✅ reuse → [shared/ComboModal] | `components/menu/ComboModal.tsx` |
| F | `ProductCard` | ✅ reuse → [shared/ProductCard] | `components/menu/ProductCard.tsx` |
| F | `ToppingModal` | ✅ reuse → [shared/ToppingModal] | `components/menu/ToppingModal.tsx` |
| F | `EmptyState` | ✅ reuse → [shared/EmptyState] | `components/shared/EmptyState.tsx` |
| G | `DrinkCustomize` | new | `components/menu/DrinkCustomize.tsx` |
| H | `OrderNote` | new | `components/menu/OrderNote.tsx` |
| I | `OrderSummary` | new | `components/menu/OrderSummary.tsx` |
| J | `CartBottomBar` | new | `components/menu/CartBottomBar.tsx` |
| — | `CartDrawer` | ✅ reuse → [shared/CartDrawer] | `components/menu/CartDrawer.tsx` |
| — | `Button` | ✅ reuse → [shared/Button] | `components/ui/button.tsx` |

---

## Step 6 — Acceptance Criteria

```
AC-01  QR scan → /table/[id] → redirects to /menu with tableLabel set in settingsStore
AC-02  Header shows shop name, tableLabel from settingsStore, and cart item count badge
AC-03  CategoryTabs loads from GET /categories; "Tất cả" is selected by default
AC-04  Selecting a category → ProductList filters to that category; ComboSection and FavouritesRail hide
AC-05  SearchBar debounces input 300ms before triggering query; shows × clear button when typing
AC-06  Search with < 2 characters → no API call; shows "Nhập ít nhất 2 ký tự"
AC-07  Search with no results → EmptyState: "Không tìm thấy món nào · Thử từ khóa khác nhé!"
AC-08  FavouritesRail appears only when selectedCategory === null AND favourites.length > 0
AC-09  Tapping heart on ProductCard or ComboCard → toggles favourite in favouritesStore (persisted)
AC-10  ComboSection appears only when selectedCategory === null
AC-11  Tapping [+] on a product with toppings → opens ToppingModal (bottom sheet)
AC-12  Tapping [+] on a product without toppings → adds directly to cartStore; qty control shown
AC-13  Tapping product name/image → navigates to /menu/product/[id]
AC-14  CartBottomBar appears only when cartStore.itemCount > 0; shows count + total
AC-15  Tapping CartBottomBar → opens CartDrawer
AC-16  CartDrawer "Đặt hàng" → navigates to /checkout
AC-17  drinkConfig changes (Zone G) → updates cartStore.drinkConfig instantly
AC-18  orderNote (Zone H) persists across page reloads (localStorage via Zustand persist)
AC-19  OrderSummary groups items by Combo and Món lẻ; shows subtotal per group + grand total
AC-20  Product image fails → shows 🍜 placeholder (no broken image icon)
AC-21  Network error on product/category fetch → shows error state with [Thử lại] button
AC-22  All interactive elements: min touch target 44 × 44 px
AC-23  is_available: false → product card shows "Hết" overlay; [+] button disabled
```

---

## Step 7 — Task Breakdown

> One task = one component or one wiring concern. Size: fits 1 session each.

| ID | Task | AC ref | Status | File |
|----|------|--------|--------|------|
| MENU-1 | `Header` (Zone A) — shop name + tableLabel + cart badge | AC-02 | ✅ | `(shop)/menu/page.tsx` inline |
| MENU-2 | `SearchBar` (Zone B) — debounced input + clear button | AC-05 · AC-06 · AC-07 | ✅ | `components/menu/SearchBar.tsx` |
| MENU-3 | `CategoryTabs` (Zone C) — horizontal scroll + "Tất cả" default | AC-03 · AC-04 | ✅ | `components/menu/CategoryTabs.tsx` |
| MENU-4 | `FavouritesRail` (Zone D) — horizontal scroll + conditional show | AC-08 · AC-09 | 🔄 | `components/menu/FavouritesRail.tsx` |
| MENU-5 | `ComboCard` + `ComboModal` (Zone E) — combo display + add-to-cart | AC-10 | ✅ | `components/menu/ComboCard.tsx` |
| MENU-6 | `ProductCard` + `ToppingModal` (Zone F) — list + add flows + favourite | AC-11 · AC-12 · AC-13 · AC-23 | ✅ | `components/menu/ProductCard.tsx` |
| MENU-7 | `DrinkCustomize` (Zone G) — rau amount + bowl count | AC-17 | 🔄 | `components/menu/DrinkCustomize.tsx` |
| MENU-8 | `OrderNote` (Zone H) — textarea + localStorage persist | AC-18 | 🔄 | `components/menu/OrderNote.tsx` |
| MENU-9 | `OrderSummary` (Zone I) — collapsible + grouped by type | AC-19 | 🔄 | `components/menu/OrderSummary.tsx` |
| MENU-10 | `CartBottomBar` (Zone J) — fixed bottom + count + total | AC-14 · AC-15 | ✅ | `components/menu/CartBottomBar.tsx` |
| MENU-11 | Page assembly — wire all zones + TanStack Query + Zustand | AC-01 · AC-03 · AC-21 | ✅ | `(shop)/menu/page.tsx` |
| MENU-12 | Edge cases audit — skeleton loading · error state · empty state · image fallback | AC-20 · AC-21 · AC-22 | ⬜ | All above files |

---

## Edge Cases

| Scenario | Detection | UX Fallback |
|----------|-----------|-------------|
| Product image fails | `onError` on `<img>` | 🍜 placeholder, gray background |
| Category returns 0 products | `data.length === 0` | EmptyState: "Không có món nào trong nhóm này" |
| Network offline / API error | `query.isError` | Error state + [Thử lại] button (re-triggers query) |
| Search < 2 chars | `query.length < 2` | Inline hint: "Nhập ít nhất 2 ký tự" — no API call |
| Quantity > 99 | `qty > 99` | [+] disabled — tooltip "Tối đa 99 phần" |
| Product unavailable | `is_available: false` | Image overlay "Hết" + [+] disabled |
| Rapid [+] taps | — | cartStore.addItem is synchronous, no duplicates |

---

## Changelog

**v1 (2026-05-25)**
- Initial spec following HOW_TO_SPEC_v2.md format
- Replaces / distils `menu_wireframe_v1.md` (which mixed spec + implementation code)
- Tasks reflect build status from Phase 5

---

*Spec ref: `Spec_3_Menu_Checkout_UI_v2.md §4` — for business rules, API contract, and RBAC see that file.*
*Wireframe: `menu_ver1_done.excalidraw` / `menu_ver1_done.png`*
