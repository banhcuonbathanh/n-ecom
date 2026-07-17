# Scenario — Re-ordering "the usual" from Favourites

> **Status:** ✅ implemented · one concrete end-to-end run through the favourites suite.
> **Who:** Chị Lan, a regular, scanned her table QR last week and hearted a few dishes. Today she
> wants the same meal without hunting through the menu again.
> Branch traced: `experience_claude.md_system_1`. Every beat cites the code that drives it.
>
> This zooms in on **this page's beat**. The order it ends up creating is the menu/checkout flow —
> for that downstream BE write see [../customer_menu/customer_menu_be.md](../customer_menu/customer_menu_be.md).
> Siblings: [page](customer_favourites.md) · [BE](customer_favourites_be.md) ·
> [x-component](customer_favourites_crosscomponent_dataflow.md) ·
> [x-page](customer_favourites_crosspage_dataflow.md) · [loading](customer_favourites_loading.md)

---

## Cast (real code)

| Thing | Where |
|---|---|
| Favourites list page | `fe/src/app/(shop)/menu/favourites/page.tsx` |
| Save-as-set page | `fe/src/app/(shop)/menu/favourites/save/page.tsx` |
| Saved-sets page | `fe/src/app/(shop)/menu/favourites/sets/page.tsx` |
| Favourites store (persisted) | `fe/src/store/favourites.ts` |
| Cart store (hand-off target) | `fe/src/store/cart.ts` |
| Catalog reads | `GET /products` · `GET /combos` (both public, cached 5 min) → [customer_favourites_be.md](customer_favourites_be.md) |

---

## Beat 1 — She opens Favourites (the two reads fire)

Lan taps **[Yêu Thích]** in the bottom nav → `/menu/favourites`. The page mounts and fires its two
TanStack queries: `GET /products` (key `['products-all']`) and `GET /combos` (key `['combos']`),
both `staleTime: 5 * 60 * 1000` (`favourites/page.tsx:25-35`).

Because she was just browsing `/menu`, both queries are **served from the TanStack cache** — same
keys, within 5 min — so no network round-trip and no spinner. The cards render immediately. (Cold
path + loading/empty/error states → [customer_favourites_loading.md](customer_favourites_loading.md).)

Her three hearted items resolve: store `items[]` ids are joined against the catalog payloads
(`favourites/page.tsx:52-85`). Each shows as a `FavouriteItemCard` with name, price, and a
**[+ Giỏ]** button.

> Note: every favourite shows **qty 1, no toppings** — that's how `toggleFav` stored them
> (`store/favourites.ts:88`), regardless of what she'd configured on the menu card. She bumps the
> bánh cuốn to ×2 with the card stepper (`updateQty`, `favourites/page.tsx:22`).

---

## Beat 2 — One item is gone (silent auto-prune)

One of her hearted dishes was taken off the menu since last week. It is simply **absent** from the
`GET /products` payload, so:

1. `resolvedItems` drops it (the `if (!p) return []` branch, `favourites/page.tsx:53-54`).
2. The mount `useEffect` — which only runs once **both** `productsLoaded && combosLoaded`
   (`favourites/page.tsx:38-50`) — finds it stale, calls `removeItem`, and fires a toast:
   *"Một số món không còn phục vụ đã được xoá khỏi danh sách yêu thích."*

No BE call drove this — it's pull + 5-min cache TTL (see
[customer_favourites_crosspage_dataflow.md](customer_favourites_crosspage_dataflow.md) cross-page concerns).

---

## Beat 3 — She bulk-adds to the cart

Lan taps **[Thêm tất cả vào giỏ]** in the footer → `handleAddAllToCart`
(`favourites/page.tsx:97-122`). Each resolved favourite is turned into a `CartItem`
(`product_<id>_<sortedToppingIds>` / `combo_<id>` key) and pushed via `addToCart`
(`store/cart.ts` `addItem`). The cart badge updates.

The adds are **additive** — if she already had something in the cart it stays. The cart `items[]`
are session-only (`store/cart.ts:151`), which is fine: she's checking out now.

---

## Beat 4 (optional) — She saves this as a set for next time

Before checking out she taps **[Lưu bộ]** → `/menu/favourites/save`. She types *"Bữa sáng quen"*
into the RHF+Zod form (`name: min 1`, `favourites/save/page.tsx:14`) and taps **[Lưu set này]**.
`onSubmit` calls `addSet('Bữa sáng quen')` (`favourites/save/page.tsx:73-74`), which snapshots the
current `items[]` into `sets[]` (`store/favourites.ts:62-70`) — **persisted to localStorage**, so
it survives a browser restart — then routes to `/menu/favourites/sets`.

Next visit she can skip Beats 1–3 entirely: the sets page resolves the snapshot against the live
catalog and **[Thêm vào giỏ]** on the `SetCard` re-applies the whole set in one tap
(`handleApplySet`, `favourites/sets/page.tsx:72-98`), silently skipping any item no longer on the
menu (`resolveItems`, `favourites/sets/page.tsx:36-41`).

---

## Beat 5 — Hand-off to the order pipeline

The favourites suite's job ends at the cart. Lan opens the cart on `/menu`, confirms her table in
`TableConfirmModal`, and the cart is normalised by `lib/order-payload.ts` into a single
`POST /orders`. That BE write — snapshotting, combo expansion, one-active-order rule — is **not**
this page's concern; it's traced in [../customer_menu/customer_menu_be.md](../customer_menu/customer_menu_be.md)
(endpoints 4–6).

---

## What this scenario proves about the page

- The favourites suite issues **only two public read endpoints** and **zero writes** — every
  "action" (heart, save set, add to cart) is local store state. → [customer_favourites_be.md](customer_favourites_be.md)
- Freshness is bounded by the shared 5-min catalog cache, not by any favourites-specific call.
- It is a **bridge**: consumes heart toggles from `/menu`, produces a cart for `/checkout`. →
  [customer_favourites_crosspage_dataflow.md](customer_favourites_crosspage_dataflow.md)
