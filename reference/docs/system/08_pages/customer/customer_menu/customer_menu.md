# Customer Menu — `/menu`

> ✅ **DESIGN BUILT — this doc reflects the page as coded (re-verified 2026-07-15 on branch
> `docs/customer-menu-alignment`, including the FAV-2 "Suất tự tạo" work).** Zone markers below
> read "✅ NEW DESIGN — built". Doc↔code status for the whole folder → [index.md](index.md).

> **TL;DR:** ✅ implemented · guest JWT (or open browse) · The core customer page: browse
> categories, combos, saved custom suất and products, build a cart, and submit the order. With a
> table bound (QR path) checkout is a single confirm modal; without a table it routes to
> `/checkout`.
> ✅ **Online ordering is built:** on a no-table, unauthenticated visit the page auto-mints an
> online-guest token (`POST /auth/guest/online`) so an anonymous visitor can add items and place a
> `source='online'` order via `/checkout` — no QR, no login bounce.
> BE view (endpoints, auth, caching, errors) → [customer_menu_be.md](customer_menu_be.md)

---

## ASCII Wireframe — full page (browse mode)

```
┌──────────────────────────────────────────────────────────┐
│ [cover photo · h-196px · dark gradient overlay]          │ ← A MenuHeader (photo banner)
│              Quán Bánh Cuốn  (Playfair serif)            │   scrolls away — NOT sticky
├──────────────────────────────────────────────────────────┤
│ [restaurant-banner.jpg · h-44]                           │ ← A2 RestaurantBanner
│  "Bánh cuốn tươi — ngon mỗi ngày"                        │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐     │
│ │ 🔍 Tìm món nhanh...                          (✕) │     │ ← B SearchBar (300ms debounce)
│ └──────────────────────────────────────────────────┘     │
├══════════════════════════════════════════════════════════┤ ← sticky top-0 from here ↓
│ [Tất cả][Suất][Suất tự tạo][Trứng][Bánh Cuốn][Giò]…      │ ← C MenuCategoryNav (scroll-spy)
├──────────────────────────────────────────────────────────┤
│ ♥ YÊU THÍCH                                              │ ← D FavouritesRail (horizontal)
│ [📋set][🍽️suất][img fav][img fav] ▸▸▸ (scrolls →)        │   pinned sets · suất · fav items
├──────────────────────────────────────────────────────────┤
│ COMBO                                                    │ ← E ComboSection (tab = "Suất")
│ ┌────────────────────────────────────────────────┐       │
│ │ [img♡] Suất Đầy Đủ      ×1 Bánh trứng…  30.000đ│       │   full card drawing → zone E
│ │        Chi tiết          ×3 Bánh cuốn…  – 0 +  │       │
│ │                                     [Nhân thịt●]│      │
│ │                                     [Nhân mộc ○]│      │
│ └────────────────────────────────────────────────┘       │
├──────────────────────────────────────────────────────────┤
│ SUẤT TỰ TẠO                (only if ≥1 saved suất)       │ ← E2 CustomSuatSection ✅ NEW (FAV-2)
│ ┌────────────────────────────────────────────────┐       │
│ │ 🍽️ Suất của Vũ   ▸ Bánh cuốn ×3  ▸ Giò ×1      │       │
│ │ 5 món · 42.000đ                [🛒 Thêm vào giỏ]│      │
│ └────────────────────────────────────────────────┘       │
├──────────────────────────────────────────────────────────┤
│ TRỨNG · BÁNH CUỐN · GIÒ · …    (one section per          │ ← F ProductList sections
│ ┌──────────────────────────────┐ category with products) │   mobile: 1-col ProductCard
│ │ [img♡] Bánh Trứng…    9.000đ │                         │   sm+: 2/3/4-col ProductGridCard
│ │        Chi tiết        – 0 + │                         │
│ │                 [Nhân thịt ●]│                         │
│ └──────────────────────────────┘                         │
│   (canh products NEVER appear here — stepper-only)       │
├──────────────────────────────────────────────────────────┤
│ Tóm tắt đơn hàng (Bàn 04)⟳                    ⌄ Ẩn      │ ← I OrderSummary (only if cart ≥1)
│   Món đã chọn ⌄ · COMBO · MÓN LẺ · Canh stepper          │   full drawing → zone I
│   Tổng cộng · Tổng số món (bảng) ⌄ · Ghi chú             │
├──────────────────────────────────────────────────────────┤
│                                             ┌────┐       │
│                                             │🛒⑬│       │ ← J CartBottomBar — floating,
│                                             └────┘       │   fixed bottom-right, above nav
│                                        ┌───────────┐     │   (only if cart ≥1)
│                                        │ Thanh toán│     │
│                                        └───────────┘     │
├──────────────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt]           │ ← ClientBottomNav (shell layout)
└──────────────────────────────────────────────────────────┘
  Overlays: TableConfirmModal (QR checkout confirm) · CartDrawer (mounted, ⚠ no trigger — see J)
```

### Search mode (query ≥ 2 chars) — the page reshapes

```
│ 🔍 "trứng"                            (✕) │  ← B stays
│  (C MenuCategoryNav HIDDEN)               │
│  (D FavouritesRail HIDDEN)                │
│ ┌───────────────────────────────────────┐ │  flat ProductList only — no sections,
│ │ [img♡] Bánh Trứng Vàng   9.000đ – 0 + │ │  no combos, no suất tự tạo
│ └───────────────────────────────────────┘ │
│  0 results → EmptyState                   │  "Không tìm thấy món nào · Thử từ khóa khác nhé!"
   1 char → hint "Nhập ít nhất 2 ký tự", products query DISABLED (old list stays)
   ⚠ BE still ignores the `search` param (flag §6.1) — the "filtered" list is server-unfiltered
```

### Per-Zone Detail — how each zone gets & shares its data

> The block above is the *layout*. The blocks below zoom into each zone with its own drawing and
> answer two questions: **(1) where does this zone's data come from?** and **(2) how does it stay
> in sync with the others without prop-drilling?** Full mechanism →
> [customer_menu_crosscomponent_dataflow.md](customer_menu_crosscomponent_dataflow.md);
> loading behaviour → [customer_menu_loading.md](customer_menu_loading.md).

**Legend (notation used in every block):**

```
◀── reads        zone renders FROM this source        [GET /x]   TanStack Query (server state)
──▶ writes       zone mutates this source             ⚡         in-memory Zustand singleton
(local)          component useState — never shared     ⏳ skel    has a loading skeleton
```

**The one rule behind all of it:** every cart-aware zone talks to the **same `useCartStore`
singleton** — never to another zone. Catalog zones read **TanStack Query** caches. Favourites
zones read the persisted **`useFavouritesStore`**. "Is this open?" stays in **local `useState`**.
Three layers, one discipline.

```
   ⚡ useCartStore (Zustand singleton)      ⚡ useFavouritesStore (persisted)   📦 TanStack Query
   items[] · tableId · tableName ·          items[] (fav ids) · sets[]          ['categories']  5m
   orderNote · activeOrderId                (pinned) · suats[] (custom suất)    ['products-all']5m
   total() · itemCount() ← derived                ▲ toggleFav / read ▲          ['combos']      5m
        ▲ writes            reads ▲               │                  │          ['products',q] ⏳
        │                         │               │                  │                ▲
 ┌──────┴──────────┬──────────────┴────┐   ┌──────┴───────┬──────────┴──┐       reads │ (catalog)
 │ Combo/Product/  │ OrderSummary/     │   │ ♥ hearts on  │ D rail ·    │   ┌─────────┴────────┐
 │ Suat/Rail cards │ BottomBar/Drawer/ │   │ every card   │ E2 suất sec │   │ C tabs · E combos│
 │ + Canh stepper  │ ConfirmModal      │   └──────────────┴─────────────┘   │ F products · D   │
 └─────────────────┴───────────────────┘                                    └──────────────────┘
                     no arrow ever goes zone → zone
```

---

**A · MenuHeader (photo banner)** — static visual, scrolls away. ✅ NEW DESIGN — built (GAP-1).
`MenuHeader.tsx`: `h-[196px]` `next/image` cover (`/header-example.jpg`, `priority`) + dark
top→bottom gradient + Playfair (`font-display`) 27px white title. No pill bar, no "Bàn XX" label,
no login button — the table pill lives in zone I.

```
┌────────────────────────────────────────────┐
│ ░░░░░░░░ cover photo (h-196px) ░░░░░░░░░░ │   static asset — no network, no store read
│ ░░░░░░  gradient: 40% → 10% → 95%  ░░░░░░ │   gradient darkens toward the BOTTOM
│            Quán Bánh Cuốn                  │   title pinned 18px from top, text-shadow
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└────────────────────────────────────────────┘   NOT sticky — the sticky element is zone C
```

**A2 · RestaurantBanner** — second static strip directly under the header.

```
┌────────────────────────────────────────────┐
│ ░░░ /restaurant-banner.jpg (h-44) ░░░░░░░ │   plain <img>; onError → hides img and
│ ░ gradient from bottom ░░░░░░░░░░░░░░░░░░ │   falls back to a primary/30 gradient bg
│ "Bánh cuốn tươi — ngon mỗi ngày"           │   tagline bottom-left, white/90
└────────────────────────────────────────────┘
```

> 🚫 **Three components are still commented out in `page.tsx` — they do NOT render:**
> `MiniCartStrip` (sticky "n món · total · Xem giỏ" strip — was the only CartDrawer trigger),
> `AddToOrderBanner` (the `?add_to_order=` param IS still parsed and drives CartDrawer submit
> mode, but its banner UI is off) and `ActiveOrderRecoveryBanner` (resume-live-order UI; the
> store still persists `activeOrderId`). Kept as design intent — ⚠️ confirm with owner whether
> this is parked intentionally. See [index.md §3-D](index.md#3--alignment-audit-doc-vs-code).

---

**B · SearchBar** — local debounced input, lifted into the products query key.

```
┌──────────────────────────────────────────────┐
│ 🔍  Tìm món nhanh...                     (✕) │   ◀──▶ (local) useState value
└──────────────────────────────────────────────┘   300ms debounce ──▶ onSearch(value)
│ Nhập ít nhất 2 ký tự          ← hint, only when len == 1
   value feeds ──▶ 📦 ['products', searchQuery]
   len 0 or ≥2 → query enabled · len 1 → query DISABLED (no refetch, old list stays)
   len ≥2 ALSO flips the page into search mode: zone C + D + E + E2 hidden, flat list only
   (✕) appears when value non-empty → clears input → restores full sectioned menu
```

**C · MenuCategoryNav** — sticky scroll-spy nav; tabs are navigation anchors, NOT filters.
✅ NEW DESIGN — built. (`MenuCategoryNav` + `MenuSections`/`buildMenuSections`; the older
`CategoryTabs.tsx` is unused by `page.tsx`.)

```
╔══════════════════════════════════════════════════════════╗  sticky top-0 z-20, h-scrolls
║ [Tất cả][Suất][Suất tự tạo][Trứng][Bánh Cuốn][Giò][…]    ║  ◀── 📦 ['categories'] (5m stale)
╚═══════════╤══════════════════════════════════════════════╝  ◀── ⚡ favSuats.length>0 adds tab
            └ active tab: orange text + orange border-b-2 + soft orange text-glow
   Tab order = buildMenuSections(): "Suất" (if combos ≥1) → "Suất tự tạo" (if suats ≥1)
   → each category that HAS products, by category sort_order. "Tất cả" is prepended by the page.
   Tap → scrollIntoView(smooth) on the section anchor (`menu-<id>`, scroll-mt-160px).
   Scroll-spy: rAF-throttled scroll listener; active = last section whose top crossed the
   170px line; at page bottom the LAST tab is force-pinned active. No skeleton — tabs pop in.
   Hidden entirely while searching or when sections.length === 0.
```

**D · FavouritesRail** — joins the persisted favourites store against the two catalog caches.
✅ NEW DESIGN — built (extended by FAV-2: pinned sets + custom suất now ride the rail too).

```
♥ YÊU THÍCH
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│   📋    │ │ 🍽️/img  │ │ [photo] │ │ [photo] │  ▸▸ horizontal scroll (scrollbar hidden)
│      📌 │ │         │ │      ♥ │ │      ♥ │   all cards w-28, image h-20
│ Set nhà │ │ Suất Vũ │ │ Bánh…   │ │ Suất…   │
│ 4 món·＋│ │ 5 món·＋│ │ 9.000đ  │ │ 30.000đ │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
 PinnedSet    SuatRail     FavCard     FavCard
 Card         Card         (product)   (combo)
   ◀── ⚡ useFavouritesStore: sets (pinned only) · suats (all) · items (fav ids)
   ◀── 📦 props from page: allProducts (['products-all']) + enriched combos (resolve ids→objects)
   Order on the rail: pinned sets → custom suất → fav products → fav combos.
   PinnedSetCard tap  ──▶ favouriteSetToCartItems(set, …) → ⚡ addItem×n + toast "✓ Đã thêm"
   SuatRailCard tap   ──▶ resolveSuatToCart(lines, …) → ⚡ addItem×n + setCanhQty (canh lines
                          ADD onto current stepper counts); partial miss → "một số món không còn"
   FavCard body tap   ──▶ /menu/product/:id | /menu/combo/:id (Link)  ·  ♥ tap ──▶ toggleFav (remove)
   Renders when !searching AND (fav items ≥1 OR a pinned set OR suats ≥1); degrades silently
   if a fav id isn't in the caches. Deep management lives at /menu/favourites/** →
   [../customer_favourites/](../customer_favourites/).
```

---

**E · ComboCard (inside ComboSection)** — reads BE (+enrichment), writes the cart. Always renders
in the scroll flow (scroll-spy section). ✅ NEW DESIGN — built.
⚠ Naming split: the sticky tab says **"Suất"** but the in-page `<h2>` says **"Combo"**.

```
COMBO                                          ◀── 📦 [GET /combos] enriched with ['products-all']
┌──────────────────────────────────────────────────────────┐
│ ┌────────┐  Suất Đầy Đủ Trứng Chín          30.000đ      │ ← price (top of right column)
│ │ [img]♡ │  ×1 Bánh trứng chín                           │
│ │  80px  │  ×3 Bánh cuốn nhân           ┌───┐   ┌───┐    │ ← qty stepper (– disabled at 0)
│ │ ("Hết" │  ×1 Giò tai                  │ – │ 0 │ + │    │
│ │  if    │  ×1 Canh                     └───┘   └───┘    │
│ │  86'd) │                                               │
│ └────────┘  Chi tiết ──▶ /menu/combo/:id  [Nhân thịt   ●]│ ← nhân pills: MULTI-select
│                                           [Nhân mộc nhĩ○]│   filled orange = selected
└──────────────────────────────────────────────────────────┘
   ♥ ──▶ ⚡ useFavouritesStore.toggleFav(combo.id,'combo')
   [+] ──▶ ⚡ addItem({type:'combo', combo_id, toppings:selectedNhân, combo_items:[…]}) or
        updateQty(+1) if the SAME nhân-combination row already exists · flyToCart() animation
   Nhân pills — derived from the BÁNH sub-items' available toppings (dedup by id; canh excluded):
   - MULTI-select · at least one must always stay selected (last one can't be deselected)
   - Default = "Nhân thịt" ONLY (falls back to all options if no plain-thịt topping exists)
   - Selecting both = mixed suất (bánh split across the two nhân)
   cartId = `combo_<comboId>_<sortedNhânIds|plain>` → each nhân combination is its OWN cart row.
   Section hidden if combos.length === 0. Enrichment resolves combo_items → names/prices/
   toppings; missing product → raw UUID fallback (flag §6.4).
   (`ComboModal` is still mounted by the card but nothing ever opens it — dead code, GAP-4.)
```

**E2 · CustomSuatSection — "Suất tự tạo"** ✅ NEW (FAV-2) — the customer's own saved suất as a
browsable section, styled like the combo section. FE-only personal data: **no BE fetch, no
combos-DB write** — suất live in the persisted favourites store and are ordered as món-lẻ lines.

```
SUẤT TỰ TẠO                                    ◀── ⚡ useFavouritesStore.suats
┌──────────────────────────────────────────────────────────┐   ◀── allProducts prop (resolve
│ 🍽️ Suất của Vũ                                           │       lines → names/prices, incl.
│   ▸ Bánh cuốn nhân thịt × 3                              │       canh products)
│   ▸ Giò tai × 1                        (max 5 lines,     │
│   ▸ Canh (có rau) × 1                   then "và N món   │
│ ──────────────────────────────────────  khác")           │
│ 5 món · 42.000đ                     [🛒 Thêm vào giỏ]    │
└──────────────────────────────────────────────────────────┘
   [Thêm vào giỏ] ──▶ resolveSuatToCart(suat.lines, products)
     → product lines: ⚡ addItem×n (món-lẻ rows) · canh lines: ⚡ setCanhQty(current + qty)
     → toast "✓ Đã thêm" · partial miss → "(một số món không còn phục vụ)" · all miss → error
   Renders (and gets its tab) only when suats.length ≥ 1. Same add path as the D-rail suất card
   and /menu/favourites — one resolver (`lib/favourite-suat-cart.ts`), three entry points.
```

**F · ProductList** — one section per category; the *only* zone with a loading skeleton.
Two card shapes: mobile 1-col `ProductCard`, tablet/desktop grid `ProductGridCard` (2→3→4 cols).

```
TRỨNG                                          ◀── 📦 [GET /products?search&is_available] ⏳ skel
                                                    key ['products', searchQuery]
ProductCard (mobile, 1-col list):
┌──────────────────────────────────────────────────────────┐
│ ┌────────┐  Bánh Trứng Vàng                  9.000đ      │ ← price INCLUDES selected nhân
│ │ [img]♡ │  mô tả ngắn (line-clamp-2)                    │
│ │  80px  │                              ┌───┐   ┌───┐    │
│ │ ("Hết" │                              │ – │ 0 │ + │    │
│ │  if    │                              └───┘   └───┘    │
│ │  86'd) │                                               │
│ └────────┘  Chi tiết ─▶ /menu/product/:id [Nhân thịt   ●]│ ← nhân pills: SINGLE-select,
│                                           [Nhân mộc nhĩ○]│   first option pre-selected
└──────────────────────────────────────────────────────────┘

ProductGridCard (sm: 2 cols · md: 3 · lg: 4):
┌───────────────┐  image = square top, heart overlaid top-right
│ [ img    ♥ ]  │  [+]/[–] bottom-right, "Chi tiết" bottom-left
│ Bánh Trứng…   │  same nhân pills + same cartId scheme as ProductCard
│ 9.000đ        │
│ [Nhân thịt ●] │
│ Chi tiết – 0 +│
└───────────────┘
   ♥ ──▶ ⚡ toggleFav(product.id,'product') · img/name/Chi tiết ──▶ /menu/product/:id
   [+] ──▶ ⚡ addItem({type:'product', toppings:[selectedNhân]}) DIRECTLY — ✅ NO ToppingModal
        (nhân picked inline on the card; `ToppingModal.tsx` is dead code, GAP-3) · flyToCart()
   cartId = `product_<productId>_<nhânId|plain>` → each nhân choice is its own cart row.
   Canh products are filtered OUT of every card list AND search results (`isSoupName` name match
   "canh"/"nước dùng") — canh is chosen ONLY via the OrderSummary stepper (zone I).
   states: isError → "⚠ Kết nối mạng yếu" + [Thử lại] · loading → skeleton (5 rows mobile /
   8 squares grid) · no products+combos+suats → EmptyState · else → sections
```

---

**I · OrderSummary** — store read + the canh gate; owns the persisted order note. Renders only
when the cart is non-empty. ✅ NEW DESIGN — rebuilt.

```
┌──────────────────────────────────────────────────────────┐
│ Tóm tắt đơn hàng  (Bàn 04)⟳                       ⌄ Ẩn  │ ← header btn toggles whole body
│    table pill: running-border spinning orange ring       │   ◀── ⚡ tableName (only place shown)
│ ─────────────────────────────────────────────────────────│
│ MÓN ĐÃ CHỌN                                       ⌄ Ẩn  │ ← itemsOpen toggle
│  COMBO                                                   │
│   Suất Đầy Đủ Trứng Chín      – 1 +   30.000đ  🗑        │   ◀── ⚡ items[] (live preview)
│    Nhân thịt                  ← selected nhân, orange    │
│    ⌄ Chi tiết  ──────────────────────────────┐           │ ← per-combo expandable editor
│    │ Bánh trứng chín  – 1 +   9.000đ  🗑     │           │   ──▶ ⚡ updateComboItem(cartId,
│    │ Bánh cuốn nhân   – 3 +  12.000đ  🗑     │           │       name, qty) — per-line combo
│    │ Giò tai          – 1 +   8.000đ  🗑     │           │       override (canh rows excluded)
│    └─────────────────────────────────────────┘           │
│                                    Subtotal: 80.000đ     │
│  MÓN LẺ                                                  │
│   Bánh Trứng Vàng             – 2 +   18.000đ  🗑        │   ──▶ ⚡ updateQty / removeItem
│                                    Subtotal: 23.000đ     │
│  ┌ CANH ────────────────────────────────────┐            │ ← own stepper box; when 0 bowls:
│  │ ⚠ Bạn chưa chọn canh — thêm số bát…      │            │   orange running-border + warning
│  │ Bát có rau                    – 0 +      │            │   ──▶ ⚡ setCanhQty(canhCoRau.id,
│  │ Bát không rau                 – 0 +      │            │       null,'rau'|'plain', n)
│  └──────────────────────────────────────────┘            │   rows bound to the two REAL canh
│  Tổng cộng:                          103.000đ            │   products (canh_<id>_rau/_plain)
│ ─────────────────────────────────────────────────────────│
│ TỔNG SỐ MÓN (4 loại)                              ⌄ Ẩn  │ ← dishSummaryOpen toggle
│  Món            Nhân      SL   Đơn giá   Thành tiền      │   aggregated table: combos expanded
│  Bánh cuốn nhân Nhân thịt ×3   4.000đ    12.000đ         │   ×combo-qty + standalone products,
│  Bánh trứng chín Nhân thịt ×1  9.000đ     9.000đ         │   grouped by (name, nhân), sorted
│  Canh (có rau)  —         ×4   —         —               │   by qty desc; canh rows appended
│  Tổng cộng                               103.000đ        │   from the stepper counts
│ ─────────────────────────────────────────────────────────│
│ GHI CHÚ                                    ✓ Đã lưu      │ ← "Đã lưu" appears 800ms after
│ ┌───────────────────────────────────────────────┐        │   typing stops (debounced)
│ │ Nhập ghi chú cho nhà hàng...                  │        │   ◀──▶ ⚡ orderNote (persisted;
│ └───────────────────────────────────────────────┘        │   starts EMPTY — owner decision)
└──────────────────────────────────────────────────────────┘
   Three independent toggles: header (open) · "Món đã chọn" (itemsOpen — hides COMBO + MÓN LẺ +
   Canh + Tổng cộng as one block) · "Tổng số món" (dishSummaryOpen).
   Canh items (`canh_*`) are excluded from MÓN LẺ and from combo Chi tiết sub-lists — the Canh
   stepper is their single home. No "Gọi thêm" badge anywhere — ✅ NEW DESIGN (removed).
   gate: zero canh bowls → checkout tap auto-opens "Món đã chọn", scrolls the Canh box into
   view and SHAKES it (animate-canh-shake, keyed by shakeKey from the page) + error toast.
```

**J · CartBottomBar** — two stacked floating pills, fixed bottom-right above the shell nav
(`bottom-[calc(80px+safe-area)]`); render only when cart is non-empty. ✅ NEW DESIGN — built.

```
                              ┌──────┐
                              │ 🛒 ⑬│   ← cart pill (w-12 h-12) + round orange count badge
                              └──────┘   ◀── ⚡ itemCount() (Σ quantity)
                          ┌────────────┐    tap ──▶ scrollIntoView('#order-summary') (zone I)
                          │ Thanh toán │    also `data-cart-fly-target` — the fly-to-cart
                          └────────────┘    animation from every [+] button lands here
   "Thanh toán" tap ──▶ page handleCheckout():
     canh missing → pill is DIMMED (opacity-60) but STILL fires → toast + OrderSummary shake
     else: ⚡ tableId set → TableConfirmModal · tableId null → router.push('/checkout')
   NO total shown on either pill — ✅ NEW DESIGN (old full-width total bar removed).
   ⚠ The cart pill scrolls to the summary — it does NOT open the CartDrawer (see below).
```

---

**Overlay · TableConfirmModal** (QR path) — bottom-sheet confirm; fires the page's only POST.

```
┌─ Xác nhận đặt hàng ──────────────────────────┐
│ 1× Suất Đầy Đủ Trứng Chín        30.000đ     │   items ◀── ⚡ useCartStore (scrollable list)
│ 2× Bánh Trứng Vàng               18.000đ     │
│ ───────────────────────────────────────────  │
│ Tổng cộng                       103.000đ     │
│ ┌──────────────────────────────────────────┐ │
│ │ Ghi chú cho bếp (tuỳ chọn)               │ │ ← ⚠ the modal's OWN local note field —
│ └──────────────────────────────────────────┘ │   NOT the OrderSummary orderNote (flag §6.5)
│      [ Hủy ]        [ Đặt hàng ]             │
└──────────────────────────────────────────────┘
   [Đặt hàng] ──▶ buildOrderItemsPayload(items) ──▶ POST /orders
     {customer_name:'', customer_phone:'', note: modalNote|null, table_id, source:'qr', items}
   201 ⇒ GET /orders/:id → cache full order to localStorage `order_cache_<id>` →
     `table_busy` on response ⇒ info-toast "Bàn đang phục vụ khách khác…" (order still placed) →
     clearCart() → setActiveOrderId(id) → router.replace('/orders?id=<id>')   ← NOT /order/<id>
```

**Overlay · CartDrawer** — right slide-in cart editor. ⚠ **Currently unreachable on this page:**
its only opener (`MiniCartStrip`) is commented out and the J cart pill scrolls to zone I instead;
`cartOpen` is never set true. Kept wired (`?add_to_order=` submit path included) as design intent.

```
┌─ Giỏ hàng ── (Tên khách · Bàn 04) ──── [Xem đơn hàng] ✕ ┐
│ Tóm tắt đơn hàng                              13 món    │   ◀── ⚡ items[] · ⚡ settings
│ Suất Đầy Đủ… ⌄ (4 món · bấm để xem)  – 1 +  🗑  30.000đ │       store customerName
│ Bánh Trứng Vàng + Nhân thịt          – 2 +  🗑  18.000đ │   [±] ──▶ ⚡ updateQty · 🗑 removeItem
│ ────────────────────────────────────────────────────────│
│ Tổng cộng                                    103.000đ   │
│ [        Thanh toán / Thêm vào đơn hàng        ]        │ ← add_to_order mode swaps the button:
│ [           Tiếp tục chọn món                  ]        │   PATCH-style addItemsToOrder(id,
└──────────────────────────────────────────────────────────┘  buildOrderItemsPayload(items))
   normal mode: tableId → onTableCheckout() (TableConfirmModal) · else router.push('/checkout')
   add-to-order success ⇒ clearCart() → setActiveOrderId(addToOrderId) → /order/<id>
```

> `clearCart()` empties only the **draft** (`items` + `paymentMethod` + `orderNote`) and **keeps the
> identity** (`tableId` / `tableName` / `activeOrderId`) so the order stays recoverable after navigating
> away — this **overrides the old Invariant 5** (owner-approved). Right after, `setActiveOrderId(id)` points
> the cleared cart at the new order. Persistence (`partialize`) = `orderNote` + `activeOrderId` only; the
> pointer is cleared later on terminal status (`paid`/`cancelled`) by the `/order/:id` page. The order id
> also travels via URL + `order_cache_<id>` — see
> [customer_menu_crosspage_dataflow.md](customer_menu_crosspage_dataflow.md).

## Zones

| Zone | Component | Data source |
|---|---|---|
| A Header (photo banner) ✅ NEW (GAP-1) | `features/menu/MenuHeader` | static asset (`/header-example.jpg` via `next/image`); no store/network read; table pill lives in zone I |
| A2 Banner | `features/menu/RestaurantBanner` | static (`/restaurant-banner.jpg`, gradient fallback on error) |
| ~~Mini cart~~ 🚫 disabled | `features/menu/MiniCartStrip` | **commented out in `page.tsx`** — not rendered (was the CartDrawer trigger) |
| ~~Add-to-order banner~~ 🚫 disabled | `features/menu/AddToOrderBanner` | **commented out in `page.tsx`**; `?add_to_order=` param still parsed and drives CartDrawer submit mode |
| ~~Active-order recovery banner~~ 🚫 disabled | `features/menu/ActiveOrderRecoveryBanner` | **commented out in `page.tsx`** — order-recovery UI currently off |
| B Search | `features/menu/SearchBar` | local state, 300ms debounce → products query (`search` param, min 2 chars); ≥2 chars flips page into search mode |
| C Nav ✅ NEW | `features/menu/MenuCategoryNav` (+ `MenuSections`/`buildMenuSections`) | `GET /categories` (5 min stale) + `suats.length` for the extra tab; scroll-spy anchors, not filters; hidden while searching. `CategoryTabs.tsx` unused. |
| D Favourites rail ✅ NEW (FAV-2 extended) | `features/menu/FavouritesRail` | `useFavouritesStore` (fav items + pinned sets + suats) + `['products-all']` + enriched combos; one-tap add via `favourite-set-cart.ts` / `favourite-suat-cart.ts`; hidden while searching; deep management → [`../customer_favourites/`](../customer_favourites/) |
| E Combos ✅ NEW | `features/menu/ComboSection` → `ComboCard` (via `MenuSections`) | `GET /combos` enriched with `['products-all']`; heart + multi-select nhân pills (default "Nhân thịt" only); tab "Suất", heading "Combo" |
| E2 Suất tự tạo ✅ NEW (FAV-2) | `features/menu/CustomSuatSection` (via `MenuSections`) | `useFavouritesStore.suats` + `allProducts`; FE-only personal data, ordered as món-lẻ lines; renders only when ≥1 saved suất |
| F Products | `features/menu/ProductList` → `ProductCard` (mobile) / `ProductGridCard` (sm+) (via `MenuSections`) | `GET /products?search&is_available=true` (canh name-filtered out — stepper-only); inline single-select nhân pills, no modal |
| I Order summary ✅ NEW | `features/menu/OrderSummary` | `useCartStore` (items, note) + canh steppers bound to the real canh products (`canhCoRau`/`canhKhongRau` resolved by name in `page.tsx`); "Bàn 04" pill with spinning ring; note starts **empty**, debounced "Đã lưu" |
| J Floating pills ✅ NEW | `features/menu/CartBottomBar` | `useCartStore.itemCount()`; two stacked pills bottom-right, no total; cart pill = fly-to-cart target + scrolls to zone I |
| Cart drawer ⚠ no trigger | `features/menu/CartDrawer` | `useCartStore` + `useSettingsStore.customerName`; submits via `lib/order-payload.ts`; **mounted but nothing opens it on this page** |
| Confirm modal | `features/menu/TableConfirmModal` | `POST /orders` (source `qr`, no name/phone, modal-local note); success → `/orders?id=<id>` |

## Key Interactions

- Tap product/combo image, name or "Chi tiết" → `/menu/product/:id` / `/menu/combo/:id`; `[+]` adds
  to cart directly (with fly-to-cart animation) — **no ToppingModal / ComboModal** (both dead code).
- **Nhân pills on cards**: product cards = single-select (first option pre-selected); combo cards =
  multi-select, default **"Nhân thịt" only**, at least one must stay selected. Each nhân combination
  is its own cart row (`product_<id>_<nhânId|plain>` / `combo_<id>_<sortedNhânIds|plain>`).
- **Category tabs (scroll-spy)**: tapping a tab scrolls to the named section; scrolling auto-highlights
  the active tab (170px spy line, rAF-throttled; last tab pinned at page bottom). ✅ built.
- **Search mode (≥2 chars)**: nav + favourites rail + combo/suất sections hide; a flat product list
  renders; 0 hits → EmptyState. 1 char shows a hint and freezes the old list. Clearing restores all.
- **Suất tự tạo / favourites one-tap add**: pinned-set and suất cards (rail + section) add all their
  lines to the cart in one tap; suất canh lines add onto the current stepper counts; unavailable
  lines degrade with a "(một số món không còn phục vụ)" toast.
- **Floating cart pill** (🛒 + badge): appears when cart non-empty; tap **scrolls to OrderSummary**
  (`id="order-summary"`), it does NOT open the CartDrawer. ⚠ The CartDrawer currently has no
  opener on this page (MiniCartStrip commented out).
- **"Thanh toán" pill**: canh (soup) missing → pill dimmed but still tappable → toast "chọn số bát
  canh" + OrderSummary auto-expands, scrolls the Canh box into view and shakes it.
  Else: `tableId` set → TableConfirmModal (popup confirm only — no `/checkout`, no name/phone);
  no table → `router.push('/checkout')`. No total shown on the pill itself.
- **QR submit**: TableConfirmModal → `POST /orders` (source `qr`, note = the **modal's own**
  textarea) → cache to `order_cache_<id>` → `table_busy` info-toast if the table already has a
  live order → `clearCart()` + `setActiveOrderId(id)` → `router.replace('/orders?id=<id>')`.
- In `?add_to_order=` mode the CartDrawer POSTs items onto the existing order instead of creating
  one. _(Param parsed; its banner UI and the drawer trigger are both commented out.)_
- 🚫 **Order recovery (currently disabled)**: `ActiveOrderRecoveryBanner` is commented out. The
  store still persists `activeOrderId` (survives `clearCart()`); if re-enabled it revalidates via
  `GET /orders/:id` and bridges "Thêm món" into `?add_to_order=`. ⚠️ Confirm with owner.
- **Canh (soup)**: never a menu card (name-filtered), chosen only via the zone-I steppers, which
  write real cart rows `canh_<productId>_rau` / `canh_<productId>_plain` bound to the two real
  canh products resolved from `['products-all']`.
- **Online guest**: no table + no token → page silently mints `POST /auth/guest/online` once
  (retry-on-fail guard) so the visitor can order `source='online'` via `/checkout`.

## Business Logic Used

- Single order-payload builder (filling, combo overrides, canh split) → [../../07_business_logic/LOGIC_FE.md](../../07_business_logic/LOGIC_FE.md) (order payload, cart store)
- Canh-required rule + cart maths → [../../07_business_logic/LOGIC_FE.md](../../07_business_logic/LOGIC_FE.md)
- One active order per table (submit may redirect to existing order) → [../../02_spec/BUSINESS_RULES.md §2.3](../../02_spec/BUSINESS_RULES.md#23-one-active-order-per-table)
- Combo expansion on the created order → [../../02_spec/BUSINESS_RULES.md §2.5](../../02_spec/BUSINESS_RULES.md#25-combo-expansion)

---

## Object Model — Menu Page (FE ⇄ BE ⇄ DB)

> Traced from source (NOT from docs); re-verified 2026-07-15 on branch `docs/customer-menu-alignment`.
> Sources: `fe/src/types/product.ts` · `fe/src/types/cart.ts` · `fe/src/app/(shop)/menu/page.tsx` ·
> `be/internal/handler/product_handler.go` · `be/internal/service/product_service.go` ·
> migrations 002/004 (via `docs/be/be_code_summary/DB_SCHEMA_SUMMARY.md`).
>
> **Scope:** the catalog objects this page READS (Category, Product, Topping, Combo) and the cart
> objects it WRITES from. The full order WRITE pipeline (CartItem → POST /orders → DB → response)
> lives in [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) — not duplicated here.

```
READ:   categories/products/toppings/combos (MySQL) → service Details structs (Go)
        → categoryJSON / productJSON / comboJSON (response) → Category / Product / ComboRaw (TS)
        → useMemo enrichment (ComboRaw + products) → Combo / ComboItem (TS, FE-only)
WRITE:  Product/Combo + inline nhân-pill selections → CartItem (Zustand)
        → buildOrderItemsPayload → POST /orders  … → see OBJECT_MODEL_ORDER.md
```

All Go service structs use plain `string` (DB NULL collapses to `""`) and `int64` prices
(DECIMAL(10,0) VND, no decimals). All IDs are CHAR(36) UUIDs → `string` on FE.

### §1 — Category

`GET /categories` · handler `ListCategories` (inline serializer) · cached 5 min on FE.

| Attribute | DB `categories` | BE→FE JSON | FE type `Category` |
|---|---|---|---|
| `id` | CHAR(36) PK UUID | `string` | `string` |
| `name` | VARCHAR(100) NOT NULL | `string` | `string` |
| `description` | TEXT NULL | `string` — NULL→`""` | — ⚠️ sent but untyped |
| `sort_order` | INT DEFAULT 0 | `number` | `number` |
| `is_active` | TINYINT(1) DEFAULT 1 | `boolean` | — ⚠️ sent but untyped |
| `created_at`/`updated_at`/`deleted_at` | DATETIME | — (not serialized) | — |

### §2 — Topping (embedded in Product)

No standalone fetch on this page — arrives nested in every product via `productJSON`.

| Attribute | DB `toppings` | BE→FE JSON (nested) | FE type `Topping` |
|---|---|---|---|
| `id` | CHAR(36) PK UUID | `string` | `string` |
| `name` | VARCHAR(100) NOT NULL | `string` | `string` |
| `price` | DECIMAL(10,0) DEFAULT 0 | `number` (int64) | `number` |
| `is_available` | TINYINT(1) DEFAULT 1 | `boolean` | `boolean` |

Product↔Topping link: junction `product_toppings (product_id, topping_id)` — never serialized;
BE resolves it into the nested `toppings` array. On this page toppings surface as the **nhân
pills** rendered inline on product/combo cards (no modal).

### §3 — Product

> **Full Product shape (all layers) → single home [../../02_spec/object/OBJECT_MODEL_PRODUCT.md](../../02_spec/object/OBJECT_MODEL_PRODUCT.md)** (Rule #9). The matrix below is the menu-page fetch view; it mirrors the home — keep them in sync or trim to a pointer.

`GET /products` · handler `ListProducts` → service `ListProducts` → repo `ListProductsAvailable`
(only `is_available=1`, soft-deleted excluded) · serializer `productJSON` (`product_handler.go:443`).

| Attribute | DB `products` | BE service `ProductDetails` | BE→FE JSON | FE type `Product` |
|---|---|---|---|---|
| `id` | CHAR(36) PK UUID | `ID string` | `string` | `string` |
| `category_id` | CHAR(36) NOT NULL FK→categories RESTRICT | `CategoryID string` | `string` | `string` |
| `category_name` | — (join on categories.name) | `CategoryName string` | `string` | `string` |
| `name` | VARCHAR(150) NOT NULL | `Name string` | `string` | `string` |
| `description` | TEXT NULL | `Description string` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ |
| `price` | DECIMAL(10,0) NOT NULL | `Price int64` | `number` | `number` |
| `image_path` | VARCHAR(500) NULL — object path, NOT full URL | `ImagePath string` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ |
| `is_available` | TINYINT(1) DEFAULT 1 | `IsAvailable bool` | `boolean` | `boolean` |
| `sort_order` | INT DEFAULT 0 | `SortOrder int32` | `number` | `number` |
| toppings | via `product_toppings` junction | `Toppings []ToppingItem` | array of §2 objects | `Topping[]` |
| `created_at`/`updated_at`/`deleted_at` | DATETIME | — | — | — |

### §4 — Combo (two FE shapes: raw wire + enriched)

> **Full Combo shape (all layers) → single home [../../02_spec/object/OBJECT_MODEL_COMBO.md](../../02_spec/object/OBJECT_MODEL_COMBO.md)** (Rule #9). The matrix below is the menu-page fetch view; it mirrors the home — keep them in sync or trim to a pointer.

`GET /combos` · handler `ListCombos` (inline serializer) → service `ListCombos` (Redis-cached,
key `cacheKeyCombos`) → repo `ListCombosAvailable`.

| Attribute | DB `combos` | BE service `ComboDetails` | BE→FE JSON | FE wire `ComboRaw` | FE enriched `Combo` |
|---|---|---|---|---|---|
| `id` | CHAR(36) PK UUID | `ID string` | `string` | `string` | `string` |
| `category_id` | CHAR(36) NULL FK→categories SET NULL | `CategoryID string` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ | `string \| null` |
| `name` | VARCHAR(150) NOT NULL | `Name string` | `string` | `string` | `string` |
| `description` | TEXT NULL | `Description string` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ | `string \| null` |
| `price` | DECIMAL(10,0) NOT NULL | `Price int64` | `number` | `number` | `number` |
| `image_path` | VARCHAR(500) NULL — object path | `ImagePath string` | `string` — NULL→`""` ⚠️ | `string \| null` ⚠️ | `string \| null` |
| `is_available` | TINYINT(1) DEFAULT 1 | `IsAvailable bool` | `boolean` | `boolean` | `boolean` |
| `sort_order` | INT DEFAULT 0 | `SortOrder int32` | `number` | `number` | `number` |
| items | rows in `combo_items` | `Items []ComboItemDetails` | `combo_items: [{id, product_id, quantity}]` | `combo_items` (same) | `items: ComboItem[]` (enriched) |

`combo_items` per row — DB is a **static template**; at order time BE expands it into
`order_items` rows (header `unit_price`=0 + sub-items, see OBJECT_MODEL_ORDER §2.6):

| Attribute | DB `combo_items` | BE→FE JSON | FE `ComboRaw.combo_items[n]` | FE enriched `ComboItem` |
|---|---|---|---|---|
| `id` | CHAR(36) PK UUID | `string` | `string` | — (dropped) |
| `combo_id` | CHAR(36) FK→combos CASCADE | — (nested) | — | — |
| `product_id` | CHAR(36) FK→products RESTRICT | `string` | `string` | `string` |
| `product_name` | — | — | — | `string` — FE lookup in all-products map; falls back to raw id ⚠️ |
| `quantity` | INT DEFAULT 1 CHECK >0 | `number` | `number` | `number` |
| `unit_price?` | — | — | — | `number \| undefined` — FE lookup, display only |
| `toppings?` | — | — | — | `Topping[]` — FE lookup (TOP-3 enrichment) |

**Enrichment** happens in `menu/page.tsx:131-155` (`useMemo`): `ComboRaw.combo_items` is joined
against the unfiltered `GET /products` result (`products-all` query) to resolve names, prices and
available toppings. `ComboRaw` never reaches components — they receive `Combo` only.

### §5 — Cart objects (WRITE side — pointer only)

The page writes `Product`/`Combo` selections into `useCartStore` as `CartItem`
(`fe/src/types/cart.ts`) and submits via `buildOrderItemsPayload()` (`lib/order-payload.ts`).
Every attribute of `CartItem`, `ComboItemSummary`, the wire payload, BE DTOs, DB rows and the
read-back `Order`/`OrderItem` types is documented layer-by-layer in
[../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) §1–§2 — one fact, one home.

Menu-page-specific cart facts only:

- `CartItem.id` is a cart-local dedup key, never sent to BE:
  `product_<id>_<nhânId|plain>` · `combo_<id>_<sortedNhânIds|plain>` ·
  `canh_<productId>_rau|plain`. Different nhân selections = different cart rows.
- The canh-required gate (`CartBottomBar` dim + `OrderSummary` shake) checks
  `items.some(i => i.id.startsWith('canh_'))` — it keys off this id convention, not a type field.
- Canh rows are bound to the two **real** canh products (resolved from `['products-all']` by name
  match "canh"/"nước dùng" in `page.tsx`) — "Model A", so the payload carries real product ids.
- `CartItem.price` already includes the selected nhân topping — display only; BE re-snapshots
  name + unit_price server-side and never trusts client prices.
- **Suất tự tạo** never becomes a combo row: `resolveSuatToCart()` explodes a saved suất into
  ordinary `product_*`/`canh_*` rows — FE-only personal data, no combos DB write.

### §6 — Flags / Known Mismatches

| # | Mismatch | Detail |
|---|---|---|
| 1 | **`search` param ignored by BE** | FE sends `GET /products?search&is_available=true` (`menu/page.tsx:110-122`, key `['products', searchQuery]` — `category_id` is no longer sent at all) but `ListProducts` in `product_handler.go` reads **no query params** (zero `c.Query` calls). Search mode re-fetches the same unfiltered list, so "results" are only canh-filtered, not keyword-filtered. (`is_available` is harmless — service filters it anyway.) |
| 2 | **Null convention** | BE sends all nullable text columns (`description`, `image_path`, combo `category_id`) as `""`, never `null`; FE types declare `string \| null`, so `=== null` checks never match. Same as OBJECT_MODEL_ORDER flag 3. |
| 3 | **FE `Category` omits sent fields** | BE serializes `description` + `is_active` on categories; FE type drops them. Harmless today, but invisible if a tab ever needs them. |
| 4 | **Combo enrichment silently degrades** | If a combo references a product missing from the `products-all` result, `product_name` falls back to the raw UUID and `unit_price`/`toppings` are undefined (`menu/page.tsx:147-153`). No error path. |
| 5 | **Two order notes, only one is sent (QR path)** | `OrderSummary` edits the persisted `⚡ orderNote` ("Đã lưu" UX), but `TableConfirmModal` submits its **own local** `note` textarea — on the QR path the store note never reaches `POST /orders`. (`orderNote` is consumed by the `/checkout` path.) ⚠️ Confirm intended. |
| 6 | **CartDrawer has no trigger** | `CartDrawer` is mounted with full checkout + add-to-order logic, but `cartOpen` is only ever set `false` — its opener (`MiniCartStrip`) is commented out and the J cart pill scrolls to zone I instead. Dead UI until re-enabled. |
| 7 | **"Suất" tab vs "Combo" heading** | The sticky nav labels the combo section **"Suất"** (`buildMenuSections`) while `ComboSection`'s in-page `<h2>` says **"Combo"** — same section, two names. |
| 8 | **`ToppingModal` / `ComboModal` dead code** | Nhân is picked inline on cards; `ToppingModal.tsx` is unreferenced and `ComboModal` is mounted by `ComboCard` but never opened (GAP-3/GAP-4 — owner deletes later, don't touch). |
