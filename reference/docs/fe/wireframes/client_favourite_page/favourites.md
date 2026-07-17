---
page: favourites
route: /(shop)/menu/favourites
spec_ref: —
created: 2026-05-20
---

# Wireframe — Favourites (Yêu thích)

3 screens drawn side-by-side in `favourites.excalidraw` (420 px wide each, gap 80 px).

## Data Sources

| Zone | Source | Update mechanism |
|---|---|---|
| Screen 1 — item list | `favouritesStore.items[]` (Zustand + localStorage) | In-memory; persisted across sessions |
| Screen 1 — item details | `GET /api/v1/products/:id` + `GET /api/v1/combos/:id` | TanStack Query, staleTime 5 min |
| Screen 2 — save dialog | `favouritesStore.items[]` | Derived; no network call |
| Screen 3 — sets list | `favouritesStore.sets[]` (Zustand + localStorage) | In-memory; persisted across sessions |

## Screen 1 — ❤ Yêu thích (x=0)

Customers land here from the heart button on any combo / product card in the menu.

```
┌─────────────────────────────────────────┐
│  [ZA] ← ❤ Yêu thích              🛒    │  ← sticky top-0 z-20
├─────────────────────────────────────────┤
│  [ZB] [Tất cả (3)] [Món lẻ (2)] [Combo]│  ← filter tabs, sticky top-[52px]
├─────────────────────────────────────────┤
│  [ZC] scrollable list                   │
│  ┌─────────────────────────────────────┐│
│  │ [img] Combo Gia Đình  180,000₫   ♥ ││  ← ♥ = un-favourite (red)
│  │       [−]  1  [+]                  ││  ← qty stepper
│  ├─────────────────────────────────────┤│
│  │ [img] Bánh Cuốn Nhân Thịt 65,000₫ ♥││
│  │       [−]  2  [+]                  ││
│  ├─────────────────────────────────────┤│
│  │ [img] Chả Lụa  50,000₫          ♥  ││
│  │       [−]  1  [+]                  ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [ZD] footer (bg #fff7ed)               │
│  📋 Xem các set đã lưu (2) →           │  ← link to Screen 3
│  [     💾 Lưu thành set mới...     ]   │  ← outlined orange → Screen 2
│  [     🛒 Thêm tất cả vào giỏ hàng ]   │  ← orange fill; adds all items to cart
└─────────────────────────────────────────┘
```

## Screen 2 — 💾 Lưu thành set mới (x=500)

```
┌─────────────────────────────────────────┐
│  [ZA] ← 💾 Lưu thành set mới           │  ← sticky top-0 z-20
├─────────────────────────────────────────┤
│  [ZB] bg #fff7ed                        │
│  Tên set:                               │
│  ┌─────────────────────────────────────┐│
│  │ vd: Set cuối tuần, Bữa sáng...     ││  ← text input (orange border focus)
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [ZC] Tóm tắt: bg #f8fafc              │
│  • Combo Gia Đình × 1 = 180,000₫       │
│  • Bánh Cuốn Nhân Thịt × 2 = 130,000₫  │
│  • Chả Lụa × 1 = 50,000₫              │
│  ─────────────────────────────────────  │
│                     Tổng: 360,000₫     │
├─────────────────────────────────────────┤
│  [ZD] bg #fff7ed                        │
│  [ Huỷ ]  [ 💾 Lưu set này           ] │
└─────────────────────────────────────────┘
```

## Screen 3 — 📋 Các set của tôi (x=1000)

```
┌─────────────────────────────────────────┐
│  [ZA] ← 📋 Các set của tôi        🛒   │  ← sticky top-0 z-20
├─────────────────────────────────────────┤
│  [ZB] set cards list bg #f8fafc         │
│  ┌─────────────────────────────────────┐│
│  │ 📋 Set cuối tuần                   ││
│  │    3 món · 360,000₫                ││
│  │ [🛒 Áp dụng]  [✏]  [🗑]           ││
│  ├─────────────────────────────────────┤│
│  │ 📋 Bữa sáng nhẹ                    ││
│  │    2 món · 115,000₫                ││
│  │ [🛒 Áp dụng]  [✏]  [🗑]           ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  [ZC] empty state (when sets = 0)       │
│  bg #eef2ff                             │
│             ♡                           │
│        Chưa có set nào                  │
│  Về Yêu thích → điều chỉnh → lưu set   │
│       [ ← Về Yêu thích ]               │
└─────────────────────────────────────────┘
```

## Components

| Zone | Component | File | Notes |
|---|---|---|---|
| All screens ZA | Nav header | inline `page.tsx` | ← back + title + 🛒 cart |
| Screen 1 ZB | Filter tabs | `components/menu/favourites/FilterTabs.tsx` | Tất cả / Món lẻ / Combo |
| Screen 1 ZC | `FavouriteItemCard` × n | `components/menu/favourites/FavouriteItemCard.tsx` | img, name, price, ♥ un-fav, [−] qty [+] stepper |
| Screen 1 ZD | Footer actions | inline `page.tsx` | link to sets + save btn + add-all btn |
| Screen 2 ZB | Name input | inline `save/page.tsx` | controlled RHF input |
| Screen 2 ZC | Summary list | inline `save/page.tsx` | derived from store, read-only |
| Screen 2 ZD | Action buttons | inline `save/page.tsx` | Huỷ + Lưu set |
| Screen 3 ZB | `SetCard` × n | `components/menu/favourites/SetCard.tsx` | name, meta, Áp dụng / ✏ / 🗑 |
| Screen 3 ZC | Empty state | inline `sets/page.tsx` | shown when `sets.length === 0` |

## Key Rules

- **Storage:** `favouritesStore` — Zustand with `persist` to `localStorage`. No backend needed (customers are unauthenticated QR users).
- **Data model:**
  - `FavouriteItem = { id: string, type: 'product' | 'combo', qty: number }`
  - `FavouriteSet = { id: string, name: string, items: FavouriteItem[] }`
- **Áp dụng** = merge quantities into existing cart (stack, not replace). If item already in cart → add qty on top.
- **Filter tabs** filter the `items[]` list client-side — no re-fetch.
- **♥ un-favourite** removes item from `favouritesStore.items[]` immediately.
- **Qty stepper** min = 1 (can't go below 1 while item is favourited; use ♥ to remove).

## Task Rows

| ID | Owner | Task | Status | spec_ref | draw_ref |
|---|---|---|---|---|---|
| P-FAV-1 | FE | Wireframe — 3-screen flow (favourites.excalidraw + favourites.md) | ✅ | — | wireframes/favourite_page/favourites.excalidraw |
| P-FAV-2 | FE | `favouritesStore` — Zustand + persist (items + sets) | ⬜ | — | Screen 1 ZC data |
| P-FAV-3 | FE | `FavouriteItemCard` component (img, name, price, ♥, stepper) | ⬜ | — | Screen 1 ZC |
| P-FAV-4 | FE | Screen 1 — `(shop)/menu/favourites/page.tsx` assemble | ⬜ | — | Screen 1 full |
| P-FAV-5 | FE | Screen 2 — `(shop)/menu/favourites/save/page.tsx` (name input + summary + save) | ⬜ | — | Screen 2 full |
| P-FAV-6 | FE | `SetCard` component + Screen 3 — `(shop)/menu/favourites/sets/page.tsx` | ⬜ | — | Screen 3 full |
