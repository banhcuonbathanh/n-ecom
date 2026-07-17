# Customer Menu — Page Structure

Component map of the Customer Menu page (the QR-scan ordering screen), with an ASCII
layout mockup for each piece. Every component name links to its source code.

Entry point: [page.tsx](../../../../../fe/src/app/(shop)/menu/page.tsx) — `MenuPage` → `MenuContent` (wrapped in `<Suspense>`)

---

## Tree

```
MenuPage  [page.tsx]  → Suspense → MenuContent
│
├─ MenuHeader                   ── Zone A: top bar (logo · table badge · cart icon)
├─ RestaurantBanner             ── stall hero strip
│
├─ SearchBar                    ── Zone B: search (≥2 chars ⇒ flat filtered list)
│
├─ MenuCategoryNav              ── Zone C: scroll-spy category tabs (hidden while searching)
├─ FavouritesRail               ── Zone D: saved favourites (only if any & not searching)
│
├─ main
│   ├─ (isError)   → "Kết nối mạng yếu" + [Thử lại]
│   ├─ (loading)   → skeleton grid
│   ├─ (searching) → ProductList   OR  EmptyState ("Không tìm thấy món nào")
│   ├─ (empty)     → EmptyState ("Không có món nào trong danh mục này")
│   └─ MenuSections             ── Zone E+F: all sections render, scroll-spied
│   │     ├─ ProductList  → ProductCard (mobile/list) · ProductGridCard (grid)
│   │     └─ ComboSection → ComboCard
│   │
│   └─ OrderSummary             ── Zone I: cart lines + Canh stepper + note  (#order-summary)
│         └─ OrderNote
│
├─ CartBottomBar                ── Zone J: sticky checkout bar (dimmed until Canh chosen)
├─ CartDrawer                   ── slide-in cart panel
└─ TableConfirmModal            ── QR-table checkout confirm (only when confirmOpen)
```

---

## Full-page layout

```
┌──────────────────────────────────────────────────────────────┐
│ 🍽 Bánh Cuốn                    [Bàn 3]            🛒 2        │  ← MenuHeader (Zone A)
├──────────────────────────────────────────────────────────────┤
│            Quán Bánh Cuốn — ảnh / mô tả                       │  ← RestaurantBanner
├──────────────────────────────────────────────────────────────┤
│ 🔍 Tìm món...                                                 │  ← SearchBar (Zone B)
├──────────────────────────────────────────────────────────────┤
│ [Tất cả] [Bánh cuốn] [Combo] [Đồ uống]                       │  ← MenuCategoryNav (Zone C)
├──────────────────────────────────────────────────────────────┤
│ ❤ Món yêu thích   [Bánh thịt] [Combo A] →                    │  ← FavouritesRail (Zone D)
├──────────────────────────────────────────────────────────────┤
│ ── Bánh cuốn ──────────────────────────────────────────────  │  ← MenuSections (Zone E)
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│ │ProductCard│ │ProductCard│ │ProductCard│   (+ ComboSection)  │  ← Zone F = combos
│ └──────────┘ └──────────┘ └──────────┘                       │
│ ── Combo ──────────────────────────────────────────────────  │
│ ┌──────────┐ ┌──────────┐                                    │
│ │ ComboCard│ │ ComboCard│                                    │
│ └──────────┘ └──────────┘                                    │
├──────────────────────────────────────────────────────────────┤
│ ┌── Đơn của bạn (OrderSummary, Zone I) ────────────────────┐ │
│ │ • Bánh cuốn thịt   ×2            60.000đ                  │ │
│ │ • Canh:  [−] 2 [+]   (stepper, required)                 │ │
│ │ Ghi chú: ____________________   (OrderNote)              │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ [ Xem đơn ]              Tổng 70.000đ      [ Thanh toán ]     │  ← CartBottomBar (Zone J)
└──────────────────────────────────────────────────────────────┘
   Overlays: CartDrawer (slide-in) · TableConfirmModal (QR table confirm)
```

---

## Per-component mockups

### Zone A — MenuHeader
[MenuHeader.tsx](../../../../../fe/src/features/menu/components/MenuHeader.tsx)
```
┌──────────────────────────────────────────────────┐
│ 🍽 Bánh Cuốn              [Bàn 3]        🛒 2     │
└──────────────────────────────────────────────────┘
```

### RestaurantBanner
[RestaurantBanner.tsx](../../../../../fe/src/features/menu/components/RestaurantBanner.tsx)
```
┌──────────────────────────────────────────────────┐
│        Quán Bánh Cuốn — hero image / mô tả        │
└──────────────────────────────────────────────────┘
```

### Zone B — SearchBar
[SearchBar.tsx](../../../../../fe/src/features/menu/components/SearchBar.tsx)
```
┌──────────────────────────────────────────────────┐
│ 🔍 Tìm món...                               [×]  │
└──────────────────────────────────────────────────┘
   ≥2 chars ⇒ flat filtered ProductList (tabs + favourites hidden)
```

### Zone C — MenuCategoryNav
[MenuCategoryNav.tsx](../../../../../fe/src/features/menu/components/MenuCategoryNav.tsx)
```
[Tất cả] [Bánh cuốn] [Combo] [Đồ uống]      ← active tab follows scroll (scroll-spy)
   Hidden while searching. Click tab → smooth-scroll to that section.
```

### Zone D — FavouritesRail
[FavouritesRail.tsx](../../../../../fe/src/features/menu/components/FavouritesRail.tsx)
```
❤ Món yêu thích                                   [Xem tất cả →]
[ Bánh thịt ] [ Combo A ] [ Trứng ]  →            ← horizontal scroll
   Shown only when favourites exist AND not searching.
```

### Zone E+F — MenuSections (wrapper)
[MenuSections.tsx](../../../../../fe/src/features/menu/components/MenuSections.tsx)  — renders [ProductList](../../../../../fe/src/features/menu/components/ProductList.tsx) per section + [ComboSection](../../../../../fe/src/features/menu/components/ComboSection.tsx)
```
── Bánh cuốn ───────────────────────────────────
┌──────────┐ ┌──────────┐ ┌──────────┐
│ProductCard│ │ProductCard│ │ProductCard│
└──────────┘ └──────────┘ └──────────┘
── Combo ───────────────────────────────────────
┌──────────┐ ┌──────────┐
│ ComboCard│ │ ComboCard│
└──────────┘ └──────────┘
   onActiveChange → drives MenuCategoryNav active tab.
```

### ProductCard / ProductGridCard
[ProductCard.tsx](../../../../../fe/src/features/menu/components/ProductCard.tsx) (mobile/list row) · [ProductGridCard.tsx](../../../../../fe/src/features/menu/components/ProductGridCard.tsx) (grid cell)
```
┌────────────────────────────────────────────┐
│ [img]  Bánh cuốn thịt                       │
│        Mô tả ngắn...            30.000đ  [+] │
└────────────────────────────────────────────┘
```

### ComboCard
[ComboCard.tsx](../../../../../fe/src/features/menu/components/ComboCard.tsx)
```
┌────────────────────────────────────────────┐
│ [img]  Combo A                              │
│        2 Bánh + 1 Trứng         70.000đ  [+]│
└────────────────────────────────────────────┘
```

### Zone I — OrderSummary
[OrderSummary.tsx](../../../../../fe/src/features/menu/components/OrderSummary.tsx)  — anchor `#order-summary`; embeds [OrderNote](../../../../../fe/src/features/menu/components/OrderNote.tsx)
```
┌── Đơn của bạn ─────────────────────────────┐
│ • Bánh cuốn thịt   ×2            60.000đ    │  ← line items (qty ± · remove)
│ • Canh:   [ − ]  2  [ + ]   (bắt buộc)      │  ← Canh stepper (có rau / không rau)
│ Ghi chú: ________________________________  │  ← OrderNote
│                              Tổng  70.000đ  │
└────────────────────────────────────────────┘
   Canh is stepper-only — never a menu card. Checkout blocked until ≥1 bát canh
   (shakeKey shakes the stepper + toast on empty).
```

### Zone J — CartBottomBar
[CartBottomBar.tsx](../../../../../fe/src/features/menu/components/CartBottomBar.tsx)
```
[ Xem đơn ]              Tổng 70.000đ      [ Thanh toán ]
   Sticky bottom. `dimmed` until Canh chosen.
   onViewSummary → scroll to #order-summary · onCheckout → confirm modal or /checkout.
```

### CartDrawer (slide-in)
[CartDrawer.tsx](../../../../../fe/src/features/menu/components/CartDrawer.tsx)
```
                           ┌─ Giỏ hàng ──────────┐
                           │ • Bánh cuốn  ×2      │
                           │ • Trứng      ×1      │
                           │ ───────────────────  │
                           │ Tổng       70.000đ   │
                           │ [ Thanh toán ]       │
                           └──────────────────────┘
```

### TableConfirmModal (QR table checkout)
[TableConfirmModal.tsx](../../../../../fe/src/features/menu/components/TableConfirmModal.tsx)
```
┌─ Xác nhận đặt món — Bàn 3 ─────┐
│ Bạn đang đặt cho Bàn 3.        │
│ Nhân viên sẽ phục vụ tại bàn.  │
│ [ Huỷ ]      [ Xác nhận đặt ]  │
└────────────────────────────────┘
   Shown only when a tableId exists (QR scan) and the customer taps checkout.
```

---

## Components → code (quick links)

| Zone | Component | Code | Rendered |
|---|---|---|---|
| A | `MenuHeader` | [MenuHeader.tsx](../../../../../fe/src/features/menu/components/MenuHeader.tsx) | always |
| — | `RestaurantBanner` | [RestaurantBanner.tsx](../../../../../fe/src/features/menu/components/RestaurantBanner.tsx) | always |
| B | `SearchBar` | [SearchBar.tsx](../../../../../fe/src/features/menu/components/SearchBar.tsx) | always |
| C | `MenuCategoryNav` | [MenuCategoryNav.tsx](../../../../../fe/src/features/menu/components/MenuCategoryNav.tsx) | when not searching & sections exist |
| D | `FavouritesRail` | [FavouritesRail.tsx](../../../../../fe/src/features/menu/components/FavouritesRail.tsx) | when favourites exist & not searching |
| E | `MenuSections` | [MenuSections.tsx](../../../../../fe/src/features/menu/components/MenuSections.tsx) | default menu state |
| E | `ProductList` | [ProductList.tsx](../../../../../fe/src/features/menu/components/ProductList.tsx) | inside `MenuSections` + search results |
| E | `ProductCard` | [ProductCard.tsx](../../../../../fe/src/features/menu/components/ProductCard.tsx) | inside `ProductList` (list) |
| E | `ProductGridCard` | [ProductGridCard.tsx](../../../../../fe/src/features/menu/components/ProductGridCard.tsx) | inside `ProductList` (grid) |
| F | `ComboSection` | [ComboSection.tsx](../../../../../fe/src/features/menu/components/ComboSection.tsx) | inside `MenuSections` |
| F | `ComboCard` | [ComboCard.tsx](../../../../../fe/src/features/menu/components/ComboCard.tsx) | inside `ComboSection` |
| I | `OrderSummary` | [OrderSummary.tsx](../../../../../fe/src/features/menu/components/OrderSummary.tsx) | always (`#order-summary`) |
| I | `OrderNote` | [OrderNote.tsx](../../../../../fe/src/features/menu/components/OrderNote.tsx) | inside `OrderSummary` |
| J | `CartBottomBar` | [CartBottomBar.tsx](../../../../../fe/src/features/menu/components/CartBottomBar.tsx) | always |
| — | `CartDrawer` | [CartDrawer.tsx](../../../../../fe/src/features/menu/components/CartDrawer.tsx) | overlay (open state) |
| — | `TableConfirmModal` | [TableConfirmModal.tsx](../../../../../fe/src/features/menu/components/TableConfirmModal.tsx) | overlay (confirmOpen) |
| — | `EmptyState` | [EmptyState.tsx](../../../../../fe/src/components/shared/EmptyState.tsx) | empty / no-results |

---

## Supporting (non-component) code

| What | Code |
|---|---|
| Cart store (`items`, `tableId`, `tableName`, `total`, `setCanhQty`, `orderNote`, `updateComboItem`…) | [store/cart.ts](../../../../../fe/src/store/cart.ts) |
| Favourites store (`items`) | [store/favourites.ts](../../../../../fe/src/store/favourites.ts) |
| Section builder (`buildMenuSections`, `sectionDomId`, `ALL_SECTION_ID`) | [MenuSections.tsx](../../../../../fe/src/features/menu/components/MenuSections.tsx) |
| API client (`/categories`, `/products`, `/combos`) | [lib/api-client.ts](../../../../../fe/src/lib/api-client.ts) |

---

## Notes

- **Canh (soup) is never a menu card.** It is filtered out of the browsable list/search
  (`isSoupName`) and chosen only via the `OrderSummary` stepper. Checkout is blocked until
  at least 1 bát canh is in the cart.
- **Search overrides sections:** a query (≥2 chars) shows a flat filtered `ProductList`
  with no tabs / favourites rail; clearing it restores the full sectioned menu.
- **Present in code but NOT rendered here:** `MiniCartStrip`, `AddToOrderBanner`,
  `ActiveOrderRecoveryBanner` are imported but commented out in `page.tsx`.
  `CategoryTabs`, `ToppingModal`, `ComboModal`, `DrinkCustomize` are not wired into this
  page (legacy/dead — owner removes later).
- The ASCII mockups are schematic — numbers/labels are illustrative, not live data.
```

