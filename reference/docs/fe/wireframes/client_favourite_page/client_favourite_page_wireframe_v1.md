---
page: client_favourite_page
route: /(shop)/menu/favourites
created: 2026-05-27
status: Draft
---

# Page: Client — Favourites (❤ Yêu thích)
**Routes:** `/(shop)/menu/favourites` · `/(shop)/menu/favourites/save` · `/(shop)/menu/favourites/sets`
**Version:** v1
**Status:** Draft

## Spec Summary

- 3-screen mobile feature: view favourites → save as a named set → browse/apply saved sets
- Customers filter their favourited items by type (Tất cả / Món lẻ / Combo) and adjust quantities inline
- Each favourite item shows base price + selected toppings + per-portion subtotal
- "Lưu thành set mới" creates a named ordering shortcut (e.g., "Set cuối tuần")
- "Áp dụng" on a saved set merges all its items into the current cart (add on top, not replace)
- All data is `useFavouritesStore` (Zustand + localStorage) — zero new server writes; item names/prices resolved via TanStack Query on item IDs

---

## 📐 Visual Wireframe

### Screen 1 — ❤ Yêu thích  (`/(shop)/menu/favourites`)

```
┌──────────────────────────────────────────┐
│ [ZA] ← ❤ Yêu thích               🛒    │  ← sticky top-0 z-20
├──────────────────────────────────────────┤
│ [ZB] [Tất cả (3)] [Món lẻ (2)] [Combo(1)]  ← sticky top-[52px] z-10
├──────────────────────────────────────────┤
│ [ZC] scrollable items list               │
│ ┌────────────────────────────────────────┐│
│ │ [img] COMBO  Combo Gia Đình      ♥   ││  ← ♥ = active/red (un-fav on tap)
│ │        180,000₫                       ││
│ │  ───────────────────────────────────  ││
│ │  • Bánh Cuốn Nhân Thịt × 2 ..... 130k││
│ │  • Chả Lụa × 1 .................. 50k││
│ │  + Hành phi (topping) ............. 5k││
│ │  ───────────────────────────────────  ││
│ │  [−] 1 [+]                            ││
│ ├────────────────────────────────────────┤│
│ │ [img] MÓN LẺ  Bánh Cuốn Nhân Thịt ♥ ││
│ │        65,000₫/phần                   ││
│ │  ───────────────────────────────────  ││
│ │  + Hành phi ..................... 5,000₫││
│ │  + Trứng chiên ................ 10,000₫││
│ │                  Tổng/phần: 80,000₫   ││
│ │  [−] 2 [+]                            ││
│ ├────────────────────────────────────────┤│
│ │ [img] MÓN LẺ  Chả Lụa            ♥  ││
│ │        50,000₫/phần                   ││
│ │  (không có topping)                   ││
│ │  [−] 1 [+]                            ││
│ └────────────────────────────────────────┘│
├──────────────────────────────────────────┤
│ [ZD] bg #fff7ed  (footer)                │
│  📋 Xem các set đã lưu (2) →            │  ← link → Screen 3
│  [    💾 Lưu thành set mới...    ]       │  ← outline orange → Screen 2
│  [    🛒 Thêm tất cả vào giỏ hàng ]     │  ← filled orange; adds all
└──────────────────────────────────────────┘
```

---

### Screen 2 — 💾 Lưu thành set mới  (`/(shop)/menu/favourites/save`)

```
┌──────────────────────────────────────────┐
│ [ZA] ← 💾 Lưu thành set mới             │  ← sticky top-0 z-20
├──────────────────────────────────────────┤
│ [ZB] bg #fff7ed                          │
│  Đặt tên cho set này:                    │
│  ┌────────────────────────────────────┐  │
│  │ vd: Set cuối tuần, Bữa sáng...    │  │  ← Input (orange border on focus)
│  └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│ [ZC] bg #f8fafc   Tóm tắt:              │
│  ▸ Combo Gia Đình × 1  (180,000₫ combo) │
│    • Bánh Cuốn Nhân Thịt × 2 ....... 130k│
│    • Chả Lụa × 1 .................... 50k│
│    + Hành phi (topping) ............... 5k│
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│  ▸ Bánh Cuốn Nhân Thịt × 2  (65k/phần) │
│    + Hành phi × 2 ................... 10k│
│    + Trứng chiên × 2 ................ 20k│
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│  ▸ Chả Lụa × 1  (50k — không có topping)│
│  ─────────────────────────────────────  │
│                       Tổng: 265,000₫    │
├──────────────────────────────────────────┤
│ [ZD] bg #fff7ed                          │
│  [ Huỷ ]      [ 💾 Lưu set này       ]  │
└──────────────────────────────────────────┘
```

---

### Screen 3 — 📋 Các set của tôi  (`/(shop)/menu/favourites/sets`)

```
┌──────────────────────────────────────────┐
│ [ZA] ← 📋 Các set của tôi          🛒   │  ← sticky top-0 z-20
├──────────────────────────────────────────┤
│ [ZB] bg #f8fafc  saved sets list         │
│ ┌────────────────────────────────────────┐│
│ │ 📋 Set cuối tuần                      ││
│ │  ▸ Combo Gia Đình × 1  (180k)         ││
│ │     • Bánh Cuốn Nhân Thịt × 2         ││
│ │     • Chả Lụa × 1  · + Hành phi       ││
│ │  ▸ Bánh Cuốn Nhân Thịt × 2  (65k)    ││
│ │     + Hành phi × 2  •  + Trứng chiên  ││
│ │  ▸ Chả Lụa × 1  (50k — không topping) ││
│ │  3 món · 265,000₫                     ││
│ │  [🛒 Áp dụng]  [✏]  [🗑]             ││
│ ├────────────────────────────────────────┤│
│ │ 📋 Bữa sáng nhẹ                       ││
│ │  ▸ Bánh Cuốn Nhân Thịt × 1  (65k)    ││
│ │     + Trứng chiên                     ││
│ │  ▸ Nước Dùng × 1  (10k — không topping)││
│ │  2 món · 75,000₫                      ││
│ │  [🛒 Áp dụng]  [✏]  [🗑]             ││
│ └────────────────────────────────────────┘│
├──────────────────────────────────────────┤
│ [ZC] empty state — shown when sets = 0   │
│  bg #eef2ff                              │
│              ♡                           │
│         Chưa có set nào                  │
│  Về Yêu thích → điều chỉnh → lưu set    │
│        [  ← Về Yêu thích  ]             │
└──────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Screen | Zone | Component | Visibility Condition | Sticky / Position |
|--------|------|-----------|---------------------|-------------------|
| S1 | ZA | `FavouritesTopNav` | Always | sticky top-0 z-20 |
| S1 | ZB | `FavouriteFilterTabs` | Always | sticky top-[52px] z-10 |
| S1 | ZC | `FavouriteItemCard` × n | `items.length > 0`; filtered by active tab | scroll |
| S1 | ZD | `FavouritesFooter` | Always | fixed bottom-0 (or static when content is short) |
| S2 | ZA | `FavouritesTopNav` (title="💾 Lưu thành set mới") | Always | sticky top-0 z-20 |
| S2 | ZB | `SetNameInput` | Always | static |
| S2 | ZC | `FavouritesSummaryList` | Always | scroll |
| S2 | ZD | `SaveSetActions` | Always | fixed bottom-0 |
| S3 | ZA | `FavouritesTopNav` (title="📋 Các set của tôi", showCart=true) | Always | sticky top-0 z-20 |
| S3 | ZB | `SetCard` × n | `sets.length > 0` | scroll |
| S3 | ZC | `EmptyState` | `sets.length === 0` | centered in remaining viewport |

---

## 📊 Data Sources & State Management

| Screen | Zone | Data Source | Update Mechanism | Query Key | Notes |
|--------|------|-------------|------------------|-----------|-------|
| S1 | ZB | `useFavouritesStore.items` | Zustand | N/A | Count per type computed client-side |
| S1 | ZC | `useFavouritesStore.items` + item metadata | Zustand + TanStack Query | `['products', id]` · `['combos', id]` | IDs from store; names/prices from API |
| S1 | ZD | `useFavouritesStore.sets.length` | Zustand | N/A | Count badge on "Xem các set" link |
| S2 | ZB | RHF local form state | `useState` / RHF | N/A | Set name input; validated (non-empty) |
| S2 | ZC | `useFavouritesStore.items` (read-only) | Zustand | N/A | Derived; no re-fetch |
| S2 | ZD | — | — | N/A | Writes to `useFavouritesStore.addSet(name, items)` |
| S3 | ZB | `useFavouritesStore.sets` | Zustand | N/A | Full set list with item snapshots |
| S3 | ZC | `useFavouritesStore.sets` | Zustand | N/A | Empty state condition |

---

## 🧩 Component Specifications

> Before filling this table: read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md`.
> Mark each row with one of: `✅ reuse` · `new (local)` · `new (shared)`

| Screen | Zone | Component | Reuse? | File | Props / Interface |
|--------|------|-----------|--------|------|-----------------|
| All | ZA | `FavouritesTopNav` | new (local) | `app/(shop)/menu/favourites/components/FavouritesTopNav.tsx` | `title: string · showCart?: boolean · onBack: () => void` |
| S1 | ZB | `FavouriteFilterTabs` | new (local) | `app/(shop)/menu/favourites/components/FavouriteFilterTabs.tsx` | `active: FavouriteTab · counts: TabCounts · onChange: (tab) => void` |
| S1 | ZC | `FavouriteItemCard` | new (local) | `app/(shop)/menu/favourites/components/FavouriteItemCard.tsx` | `item: FavouriteItemResolved · onRemove: (id) => void · onQtyChange: (id, qty) => void` |
| S1 | ZC | `QuantityStepper` | new (shared) | `components/shared/QuantityStepper.tsx` | `value: number · min?: number · max?: number · onChange: (n) => void · size?: 'sm' \| 'md'` |
| S1 | ZD | `FavouritesFooter` | new (local) | `app/(shop)/menu/favourites/components/FavouritesFooter.tsx` | `setCount: number · onSaveSet: () => void · onAddAllToCart: () => void` |
| S1 | ZC | `Badge` | ✅ reuse | `components/ui/badge.tsx` | `variant="secondary"` for MÓN LẺ · orange custom for COMBO |
| S2 | ZB | `Input` | ✅ reuse | `components/ui/input.tsx` | Wrapped in RHF Controller; `placeholder="vd: Set cuối tuần..."` |
| S2 | ZC | `FavouritesSummaryList` | new (local) | `app/(shop)/menu/favourites/save/components/FavouritesSummaryList.tsx` | `items: FavouriteItemResolved[]` |
| S2 | ZD | `Button` | ✅ reuse | `components/ui/button.tsx` | `variant="outline"` for Huỷ · `variant="default"` for Lưu set này |
| S3 | ZB | `SetCard` | new (local) | `app/(shop)/menu/favourites/sets/components/SetCard.tsx` | `set: FavouriteSet · onApply: (id) => void · onRename: (id, name) => void · onDelete: (id) => void` |
| S3 | ZC | `EmptyState` | ✅ reuse | `components/shared/EmptyState.tsx` | `icon="♡" · message="Chưa có set nào"` |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
// store/favourites.ts — EXTENDED shape (existing store needs these additions)
type FavouriteTab = 'all' | 'product' | 'combo'

interface FavouriteItem {
  id: string                    // product_id or combo_id (UUID)
  type: 'product' | 'combo'
  qty: number                   // min: 1
  toppingIds: string[]          // selected topping UUIDs (empty array if none)
}

interface FavouriteSet {
  id: string                    // UUID generated client-side (crypto.randomUUID())
  name: string
  createdAt: string             // ISO timestamp
  items: FavouriteItem[]        // snapshot at save time — item prices/names not stored
}

interface FavouritesStore {
  items: FavouriteItem[]
  sets: FavouriteSet[]
  // actions
  addItem: (item: FavouriteItem) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  addSet: (name: string) => void   // snapshots current items
  renameSet: (id: string, name: string) => void
  deleteSet: (id: string) => void
  applySet: (id: string) => void   // merges set items into useCartStore
}

// Resolved item (store item + API metadata merged)
interface FavouriteItemResolved extends FavouriteItem {
  name: string
  imageUrl: string
  basePrice: number
  toppings: Array<{ id: string; name: string; price: number }>
  subtotalPerPortion: number    // basePrice + sum(topping prices)
}
```

### Query Configuration

```typescript
// Fetch item metadata for each favourited item ID
// Products
useQuery({
  queryKey: ['products', item.id],
  queryFn: () => fetchProduct(item.id),
  staleTime: 5 * 60 * 1000,  // 5 min — product prices rarely change mid-session
  enabled: item.type === 'product',
})

// Combos
useQuery({
  queryKey: ['combos', item.id],
  queryFn: () => fetchCombo(item.id),
  staleTime: 5 * 60 * 1000,
  enabled: item.type === 'combo',
})
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| No favourited items | `items.length === 0` | Hide ZB tabs + ZC list | Show `EmptyState` with icon ♡ + hint "Nhấn ♥ trên món ăn bất kỳ để thêm" |
| Item removed from menu (deleted product/combo) | TanStack Query returns 404 | Remove item from `useFavouritesStore.items` automatically on 404 | Toast: "Một số món không còn phục vụ đã được xoá khỏi danh sách yêu thích" |
| Set name is empty | RHF `required` validator | Disable "Lưu set này" button; show inline error | "Vui lòng đặt tên cho set" |
| Set name duplicate | Client-side check in store | Allow — sets have unique IDs, names can duplicate | No blocking; duplicate names allowed |
| Qty stepper min at 1 | `qty <= 1` check | Disable "−" button at min=1 | "−" button greyed out; use ♥ to remove entirely |
| No saved sets | `sets.length === 0` | Show ZC empty state instead of ZB | "Chưa có set nào" with CTA → back to favourites |
| Apply set when cart not empty | Always | Merge quantities (add on top, not replace) | Optional: toast "Đã thêm X món vào giỏ hàng" |
| Network error fetching item details | TanStack Query `isError` | Show item card with ID only + skeleton for name/price | Retry button; "Không thể tải thông tin món" |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Screen 1 ZB: tab filter correctly counts and filters items by type
- [ ] Screen 1 ZC: ♥ tap removes item from list immediately (Zustand update)
- [ ] Screen 1 ZC: qty stepper updates `useFavouritesStore.items[].qty`
- [ ] Screen 1 ZD: "Thêm tất cả vào giỏ" calls `useCartStore.addItems` for all current items × qty
- [ ] Screen 1 ZD: "Xem các set đã lưu" count badge matches `sets.length`
- [ ] Screen 2 ZB: cannot submit empty set name (Lưu button disabled or inline error)
- [ ] Screen 2 ZD: Lưu calls `useFavouritesStore.addSet(name)` and navigates to Screen 3
- [ ] Screen 2 ZD: Huỷ navigates back to Screen 1
- [ ] Screen 3 ZB: Áp dụng merges set items into cart (existing cart items keep their qty + set qty added)
- [ ] Screen 3 ZB: ✏ opens rename flow (inline input or modal)
- [ ] Screen 3 ZB: 🗑 calls `deleteSet(id)` and removes card immediately
- [ ] Screen 3 ZC: shown only when `sets.length === 0`

### Edge Case Tests
- [ ] Empty favourites: ZC empty state shown, ZB tabs hidden or showing zeros
- [ ] Product 404: item removed from store, toast shown
- [ ] Qty at minimum (1): "−" button disabled
- [ ] Long set name (> 50 chars): truncated with ellipsis in `SetCard`
- [ ] Set with 5+ items: scroll works within `SetCard` or items capped with "và X món khác"

### Accessibility Tests
- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] ♥ button has `aria-label="Xoá khỏi yêu thích"`
- [ ] Qty stepper buttons have `aria-label="Giảm số lượng"` / `"Tăng số lượng"`
- [ ] Keyboard: Tab → Enter → Esc (close/back)
- [ ] Focus ring visible on all interactive elements

### Cross-Device Tests
- [ ] Mobile viewport (375px) — primary target
- [ ] Tablet viewport (768px)

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| P-FAV-1 | FE | Wireframe — 3-screen flow (excalidraw + wireframe_v1.md) | ✅ | wireframes/client_favourite_page/favourites.excalidraw |
| P-FAV-2 | FE | `useFavouritesStore` — extend Zustand store (items + sets shape) | ⬜ | Screen 1 ZC data |
| P-FAV-3 | FE | `QuantityStepper` shared component | ⬜ | S1 ZC stepper |
| P-FAV-4 | FE | `FavouriteItemCard` component (img, name, price, ♥, stepper, toppings) | ⬜ | Screen 1 ZC |
| P-FAV-5 | FE | Screen 1 — `/(shop)/menu/favourites/page.tsx` assemble | ⬜ | Screen 1 full |
| P-FAV-6 | FE | Screen 2 — `/(shop)/menu/favourites/save/page.tsx` (name input + summary + save) | ⬜ | Screen 2 full |
| P-FAV-7 | FE | `SetCard` component + Screen 3 — `/(shop)/menu/favourites/sets/page.tsx` | ⬜ | Screen 3 full |

---

## 📝 Changelog

**v1 (2026-05-27)**
- Initial scaffold based on `favourites.excalidraw` (3 screens: ❤ Yêu thích, 💾 Lưu set, 📋 Các set)
- Zones documented: S1 ZA–ZD · S2 ZA–ZD · S3 ZA–ZC
- Task rows P-FAV-1 through P-FAV-7 registered

---

*Last Updated: 2026-05-27*
*Approved by: —*
*Next Review: After store extension (P-FAV-2) is confirmed*
