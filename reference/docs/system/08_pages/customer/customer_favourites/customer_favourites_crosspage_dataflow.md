# Customer Favourites — Cross-Page Data Flow

> **Status:** ✅ implemented
> **What this is:** how the favourites suite (`/menu/favourites` + `/save` + `/sets`) **exchanges
> state with other pages**. It owns no server state of its own — it is a **consumer** of writes
> made on `/menu` (the heart toggles) and a **producer** that hands a filled cart off to the order
> pipeline (`/menu` TableConfirmModal → `/checkout` → `POST /orders`). All hand-offs travel through
> two Zustand stores; one is persisted across sessions, one is not.
>
> Branch traced: `experience_claude.md_system_1`. Code wins — every claim cited to `file:line`.
>
> Siblings: [customer_favourites.md](customer_favourites.md) ·
> [BE endpoints](customer_favourites_be.md) ·
> [cross-component flow](customer_favourites_crosscomponent_dataflow.md) ·
> [loading](customer_favourites_loading.md) · [SCENARIO_FAVOURITES.md](SCENARIO_FAVOURITES.md)
>
> Store shapes + storage keys live in [../../../07_business_logic/LOGIC_FE.md](../../../07_business_logic/LOGIC_FE.md) (favourites store · cart store) —
> linked, not restated here (one model, one home). The downstream order pipeline is owned by
> [../customer_menu/customer_menu_crosspage_dataflow.md](../customer_menu/customer_menu_crosspage_dataflow.md).

---

## The Two State Vehicles

| Store | Persist key | Persisted across sessions? | Role for this page |
|---|---|---|---|
| `useFavouritesStore` | `STORAGE_KEYS.FAVOURITES` = `favourites` (`store/favourites.ts:92`, `lib/storage-keys.ts:4`) | **Yes** — whole `{items, sets}` tree persisted (`store/favourites.ts:43-93`) | the page's own data; written upstream on `/menu`, read here |
| `useCartStore` | `STORAGE_KEYS.CART_CONFIG` = `cart-config-v3` (`store/cart.ts:128`, `lib/storage-keys.ts:6`) | **Config yes, `items[]` no** — items are session-only (`store/cart.ts:151`) | hand-off target; this page pushes resolved favourites into it |

The asymmetry matters: a saved favourite/set **survives a browser restart**, but the cart it fills
**does not** (cart `items[]` are session-only) — re-applying a set after a restart is expected.

---

## Inbound — favourites suite as a CONSUMER

Nothing on the three favourites pages creates a favourite. The heart is toggled **on other pages**
and lands in the persisted store; the favourites list simply reads `items[]` back.

| Source page | Writer call site | Store mutation | What favourites reads |
|---|---|---|---|
| `/menu` product card | `features/menu/components/ProductCard.tsx:70` → `toggleFav(product.id, 'product')` | append/remove `items[]` (`store/favourites.ts:83-90`) | resolved into a card on the list |
| `/menu` combo card | `features/menu/components/ComboCard.tsx:95` → `toggleFav(combo.id, 'combo')` | same | same |
| `/menu` favourites rail | `features/menu/components/FavouritesRail.tsx:36,47` → `toggleFav` | same | same |

**Flag — toppings/qty are dropped at toggle time.** `toggleFav` always inserts
`{ id, type, qty: 1, toppingIds: [] }` (`store/favourites.ts:88`) regardless of what the user had
configured on the menu card. So a favourite is always quantity 1 with no toppings, even though the
`FavouriteItem` shape supports `toppingIds` (`store/favourites.ts:7-12`). The list page can still
edit qty afterwards (`updateQty`, `favourites/page.tsx:22`), but the topping selection from the
menu is never carried into the favourite.

```
/menu (ProductCard / ComboCard / FavouritesRail)
        │  toggleFav(id, type)
        ▼
useFavouritesStore.items[]  ──persist──► localStorage["favourites"]
        │  (read on mount)
        ▼
/menu/favourites · /save · /sets   ← this suite
```

---

## Outbound — favourites suite as a PRODUCER (hand-off to the order pipeline)

The favourites suite writes into the **cart**, never directly to the BE. The cart is then drained
by the menu/checkout pages into a single `POST /orders` (the BE write is documented in the menu BE
anchor, not here).

| Trigger | Call site | What it pushes | Destination |
|---|---|---|---|
| List "Thêm tất cả vào giỏ" | `favourites/page.tsx:97-122` `handleAddAllToCart` | every resolved favourite → `CartItem` → `addToCart` | cart store |
| Set "Thêm vào giỏ" | `favourites/sets/page.tsx:72-98` `handleApplySet` | one set's resolved items → `addToCart` per item | cart store |
| Save a set | `favourites/save/page.tsx:73-75` `addSet(name.trim())` | snapshot of current `items[]` → `sets[]` | favourites store (persisted) |

```
/menu/favourites  handleAddAllToCart ─┐
/menu/favourites/sets  handleApplySet ─┤─► useCartStore.addItem
                                       │        │
                                       │        ▼
                                       │   cart (items[] session-only)
                                       │        │
                                       ▼        ▼
                              /menu TableConfirmModal  /checkout
                                       │        │
                                       └────────┴──► POST /orders  (see customer_menu_be.md)
```

Both hand-offs build the `CartItem` inline (`product_<id>_<sortedToppingIds>` / `combo_<id>` keys,
`favourites/page.tsx:99-119`, `sets/page.tsx:75-96`). The eventual cart→order payload is
normalised by the single builder `lib/order-payload.ts` at submit time — owned by
[../../../07_business_logic/LOGIC_FE.md](../../../07_business_logic/LOGIC_FE.md) (order payload); not re-described here.

---

## Within-suite navigation (same store, three routes)

The three routes share one persisted store, so navigation needs no params — each page re-reads the
store on mount:

- list **[Lưu bộ]** → `router.push('/menu/favourites/save')` (`favourites/page.tsx:149`)
- save submit → `addSet` then `router.push('/menu/favourites/sets')` (`favourites/save/page.tsx:74-75`)
- list **[Xem bộ đã lưu]** → `router.push('/menu/favourites/sets')` (`favourites/page.tsx:148`)

No state is passed in the URL; the destination reads `useFavouritesStore` directly.

---

## Cross-page concerns

- **Stale-favourite pruning is a side effect of the catalog reads, not a cross-page signal.** When
  the list page mounts and the cached `GET /products`/`GET /combos` no longer contain a favourited
  id, the favourite is removed (`favourites/page.tsx:41-48`). This means an admin deleting a
  product on `/admin/products` *eventually* prunes it from every guest's favourites — but only
  after that guest reopens the list and the 5-min catalog cache has refreshed. There is no push;
  it is pull + TTL. See [customer_favourites_be.md](customer_favourites_be.md) Flag 2.
- **The cart is shared mutable state.** "Add all" / "apply set" **appends** to whatever the guest
  already has in the cart — it does not replace it. A guest who applies two sets gets both
  (`addItem` is additive, `store/cart.ts`). Owned by the cart store; noted here because the
  hand-off is cross-page.
