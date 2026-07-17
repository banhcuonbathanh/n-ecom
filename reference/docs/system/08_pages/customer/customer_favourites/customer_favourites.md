# Favourites Suite — `/menu/favourites` · `/menu/favourites/save` · `/menu/favourites/sets`

> **TL;DR:** ✅ implemented · guest (local-only state) · Three small pages forming one feature:
> a favourites list (hearted products/combos), a "save current favourites as a named set" form,
> and a saved-sets page that re-adds a whole set to the cart in one tap. Favourites live in
> `useFavouritesStore` (localStorage) — no backend writes.

---

## ASCII Wireframes

```
/menu/favourites                       /menu/favourites/save              /menu/favourites/sets
┌──────────────────────────┐           ┌──────────────────────────┐       ┌──────────────────────────┐
│ [←] Yêu Thích   [Lưu bộ] │ ←TopNav   │ [←] Lưu bộ yêu thích     │       │ [←] Bộ đã lưu            │
├──────────────────────────┤           ├──────────────────────────┤       ├──────────────────────────┤
│ [Tất cả][Món][Combo]     │ ←Filter   │ Tên bộ: [___________]    │ ←ZB   │ ┌──────────────────────┐ │
├──────────────────────────┤  Tabs     ├──────────────────────────┤       │ │ Bộ "Sáng thứ 7"      │ │
│ ┌──────────────────────┐ │           │ Danh sách món trong bộ   │ ←ZC   │ │ 3 món · 88.000đ      │ │
│ │ ♥ Bánh cuốn thịt     │ │ ←Item     │ • Bánh cuốn thịt   ×1    │       │ │ [Thêm vào giỏ] [Xoá] │ │
│ │   35.000đ  [+ Giỏ]   │ │  Card     │ • Canh mọc         ×2    │       │ └──────────────────────┘ │
│ ├──────────────────────┤ │           ├──────────────────────────┤       │ ┌──────────────────────┐ │
│ │ ♥ Combo Đầy Đặn      │ │           │ [ Lưu bộ ]  [ Huỷ ]      │ ←ZD   │ │ Bộ "Cả nhà"  …       │ │
│ │   42.000đ  [+ Giỏ]   │ │           └──────────────────────────┘       │ └──────────────────────┘ │
│ └──────────────────────┘ │                                              │  (empty → EmptyState)    │
├──────────────────────────┤                                              └──────────────────────────┘
│ FavouritesFooter         │
│ [Thêm tất cả vào giỏ]    │
└──────────────────────────┘
```

> All three sub-pages live under `(shop)/layout.tsx`, so the shared
> `[Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt]` **ClientBottomNav** is fixed at the bottom of
> each (the "Yêu Thích" tab is active). Omitted from the wireframe above to keep the 3-panel view compact.

## Zones

| Page | Zone | Component | Data source |
|---|---|---|---|
| list | TopNav | `favourites/components/FavouritesTopNav` | — |
| list | Filter tabs | `FavouriteFilterTabs` | local tab state (`FavouriteTab`) |
| list | Item cards | `FavouriteItemCard` | `useFavouritesStore` resolved against `GET /products` + `GET /combos` |
| list | Footer | `FavouritesFooter` | `useCartStore` bulk add |
| save | Name input ZB | RHF + Zod form in `save/page.tsx` | local form |
| save | Summary ZC | `save/components/FavouritesSummaryList` | resolved favourites |
| save | Actions ZD | inline buttons | `useFavouritesStore.saveSet` |
| sets | Set cards | `sets/components/SetCard` | `useFavouritesStore.sets` resolved against products/combos |
| all | Shell nav | `ClientBottomNav` (injected by `(shop)/layout.tsx`) | — |

## Key Interactions

- Heart toggles on `/menu` populate the store; this page lists them filtered by Tất cả / Món / Combo.
- **[+ Giỏ]** per card → add that item to cart · **Thêm tất cả vào giỏ** → bulk add.
- **Lưu bộ** (TopNav) → `/menu/favourites/save`; submit form → set saved → `/menu/favourites/sets`.
- Set card **Thêm vào giỏ** → resolves set items to current products (skips removed/unavailable),
  adds all to cart; **Xoá** removes the set.
- Items no longer on the menu are dropped on resolve, with a toast.

## Business Logic Used

- Favourites/sets store shape + localStorage keys → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (favourites store, storage keys)
- Re-added items still flow through the single payload builder at checkout → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (order payload)
- Availability check against menu → [../02_spec/BUSINESS_RULES.md §2 Order Rules](../02_spec/BUSINESS_RULES.md#2-order-rules)
