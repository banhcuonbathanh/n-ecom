# Doc-vs-Code Comparison — Favourites Suite (`/menu/favourites` · `/save` · `/sets`)

> **Scope:** an honest, code-traced audit of the `customer_favourites` doc-set against the running FE
> code, across 5 axes: ① component visuals · ② cross-component dataflow · ③ cross-page dataflow ·
> ④ loading behaviour · ⑤ FE⇄BE data model.
> **Read-only — no code or docs were changed.** This file surfaces drift; fixing it is a separate
> ALIGNed task (MASTER-first per CLAUDE.md).
> Audited **inline by the Opus orchestrator** (small page — 9 files + 1 store, ~640 LOC total — so no
> fan-out per the skill's "a small page can be done inline" rule); every 🔴 re-verified by re-opening
> the cited file.
> **Code wins.** Every "Code reality" cell cites `file:line` on branch
> `experience_claude.md_system_1_test_iphon2_change_code`. Anything not pinnable to a line → `❓ UNVERIFIED`.
> **Date:** 2026-06-21.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals | **Drifted** — wireframe draws a non-existent per-card CTA + mislabels several controls | 2 | 6 | 1 |
| 2 — Cross-component dataflow | **Faithful** — every `file:line` in `_crosscomponent_dataflow.md` matches code | 0 | 0 | 1 |
| 3 — Cross-page dataflow | **Faithful** — consumer/producer call sites all accurate | 0 | 0 | 2 |
| 4 — Loading behaviour | **Faithful** — empty/loading/error conflation correctly documented | 0 | 0 | 1 |
| 5 — FE⇄BE data model | **Mostly faithful** — service/handler cites correct; only `main.go` route lines stale | 0 | 1 | 1 |
| **Total** | — | **2** | **7** | **6** |

The deep behavioural docs (`_crosscomponent_dataflow.md`, `_crosspage_dataflow.md`, `_loading.md`,
`_be.md`, `SCENARIO_FAVOURITES.md`) are a **high-fidelity, source-traced mirror** — they were clearly
written by reading the code, and their line cites land almost perfectly. **All drift is concentrated
in the one hand-drawn file, `customer_favourites.md`** (wireframe ASCII + Zones table + Key
Interactions), plus the usual stale `main.go` route numbers in `_be.md`.

---

## 🔴 RAISE-MY-VOICE Headline Findings (hand-verified)

### 🔴 1 — The wireframe's `[+ Giỏ]` per-card "add this item to cart" button does not exist

`customer_favourites.md:20-21` draws a **`[+ Giỏ]`** button on every `FavouriteItemCard`, and the Key
Interactions line states it outright:

> `customer_favourites.md:53` — "**[+ Giỏ]** per card → add that item to cart"

**Code reality:** `FavouriteItemCard` has **no add-to-cart control**. Its props are
`{ item, onRemove, onQtyChange }` only (`FavouriteItemCard.tsx:8-12`); it renders a remove-heart
(`FavouriteItemCard.tsx:46-52`) and a `QuantityStepper` (`FavouriteItemCard.tsx:82-88`) — nothing
else. The list page wires only those two callbacks (`page.tsx:134-141`: `onRemove={removeItem}`,
`onQtyChange={updateQty}`). The **only** path into the cart on this page is the bulk footer button
`handleAddAllToCart` (`page.tsx:97-122`, `FavouritesFooter.tsx:25-30`). There is no per-item add
anywhere in the suite. **A documented user interaction has zero code behind it.**

### 🔴 2 — Two `fixed bottom-0` footers collide with the shell `ClientBottomNav` (overlap bug)

The wireframe draws `FavouritesFooter` as the clean bottom-most bar and explicitly hides the global
nav: *"Omitted from the wireframe above to keep the 3-panel view compact"* (`customer_favourites.md:32-34`).

**Code reality:** the favourites pages live under `app/(shop)/menu/favourites/`, so
`(shop)/layout.tsx` wraps them and renders `ClientBottomNav` — **`fixed bottom-0 left-0 right-0 z-20`**
(`ClientBottomNav.tsx:48`) — *after* `{children}` in document order (`(shop)/layout.tsx:10-13`). Both
page footers are **also** `fixed bottom-0 left-0 right-0 z-20`:
- list: `FavouritesFooter.tsx:12`
- save: `save/page.tsx:103`

With **equal `z-20`**, the later-painted element wins — and the nav is the later sibling — so
`ClientBottomNav` (~56-72px tall) paints **on top of** the bottom of each footer:
- **List page:** the footer is ~172px (3 stacked buttons); the nav covers its bottom ~72px — exactly
  where the primary CTA **"🛒 Thêm tất cả vào giỏ hàng"** sits (`FavouritesFooter.tsx:25-30`).
- **Save page:** the footer is a single ~68px button row (`save/page.tsx:103-119`); the ~56-72px nav
  covers nearly all of it — **"Huỷ" / "💾 Lưu set này" are largely hidden behind the nav.**

Neither footer offsets itself above the nav (no `bottom-[72px]`; the page padding `pb-[156px]`
`page.tsx:125` only clears *scroll* content, not the fixed nav). This is the **same shared-layout
invariant** flagged as a 🔴 on `customer_product_detail` (CTAFooter vs ClientBottomNav) and called out
in the tracker's cross-page concerns. **Code bug — real visual collision the wireframe hides.**
*(Code-traced CSS-stacking inference; screenshots ⏳ pending — stack is down.)*

---

## Dead / Unreachable Components Found

- **`useFavouritesStore.addItem`** (`favourites.ts:49-52`) — **zero callers.** The public add path is
  `toggleFav` (used by `ProductCard.tsx:70`, `ComboCard.tsx:95`, `FavouritesRail.tsx:36,47`). Every
  other `addItem(` in the repo is `useCartStore.addItem` (product/combo detail pages, grid cards). The
  favourites `addItem` is declared in the interface (`favourites.ts:33`) and implemented but never
  invoked. `_crosscomponent_dataflow.md §6` half-acknowledges this ("`toggleFav` is the public API")
  but still documents `addItem` as live store surface (`:114`). **Dead code.**

---

## Area 1 — Component Visuals

**Verdict: Drifted.** The hand-drawn wireframe + Zones table + Key Interactions in
`customer_favourites.md` carry the two 🔴s above plus a cluster of copy/control mislabels. Every
component's *real* render was traced.

| Component / Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `FavouriteItemCard` CTA | `[+ Giỏ]` per card adds that item to cart (`customer_favourites.md:20-21,53`) | No add button; props `onRemove`+`onQtyChange` only (`FavouriteItemCard.tsx:8-12`); cart add is bulk-only (`page.tsx:97-122`) | 🔴 | Delete `[+ Giỏ]` from ASCII + Key Interactions, OR build a per-card add (product decision) |
| List + save footers vs shell nav | Footer is the clean bottom bar; nav "omitted… to keep compact" (`customer_favourites.md:32-34`) | Both footers `fixed bottom-0 z-20` (`FavouritesFooter.tsx:12`, `save/page.tsx:103`) collide with `ClientBottomNav` `fixed bottom-0 z-20` (`ClientBottomNav.tsx:48`) | 🔴 | Offset footers above the 72px nav (`bottom-[72px]`) or raise z-index; then redraw with nav shown |
| List TopNav right slot | `[Lưu bộ]` button top-right (`customer_favourites.md:15`) | Cart icon (`showCart`), not a save button (`FavouritesTopNav.tsx:26-37`); "Lưu bộ" lives in the **footer** (`FavouritesFooter.tsx:19-24`) | 🟡 | Redraw top-right as 🛒 badge; move "Lưu bộ" to footer in ASCII |
| List footer | One button `[Thêm tất cả vào giỏ]` (`customer_favourites.md:27-28`) | Three buttons: "📋 Xem các set đã lưu (N)", "💾 Lưu thành set mới…", "🛒 Thêm tất cả vào giỏ hàng" (`FavouritesFooter.tsx:13-30`) | 🟡 | Draw all three footer buttons |
| List TopNav title | "Yêu Thích" (`customer_favourites.md:15`) | `"❤ Yêu thích"` (`page.tsx:126`) | 🟡 | Match copy |
| Save TopNav title | "Lưu bộ yêu thích" (`customer_favourites.md:15`) | `"💾 Lưu thành set mới"` (`save/page.tsx:80`) | 🟡 | Match copy |
| Sets TopNav title | "Bộ đã lưu" (`customer_favourites.md:15`) | `"📋 Các set của tôi"` (`sets/page.tsx:102`) | 🟡 | Match copy |
| Filter tab label | `[Món]`, no counts (`customer_favourites.md:17`) | `Món lẻ` + per-tab count `(N)` (`FavouriteFilterTabs.tsx:18,37`) | 🟡 | "Món" → "Món lẻ"; add `(N)` counts |
| `SetCard` actions | `[Thêm vào giỏ] [Xoá]` (`customer_favourites.md:23,55-56`) | "Áp dụng" (cart icon) + inline **rename** (pencil) + delete (trash) (`SetCard.tsx:81-101`) | 🟡 | "Thêm vào giỏ"→"Áp dụng"; add the rename action; doc omits it entirely |
| Save ZD buttons | `[Lưu bộ] [Huỷ]` (`customer_favourites.md:23`) | "Huỷ" (left) + "💾 Lưu set này" (right) (`save/page.tsx:104-118`) | 🟢 | Fix order + copy |

**Verified-matching:** TopNav back-button + sticky header (`FavouritesTopNav.tsx:11-24`); item-card
image / type-badge / price-`/phần` / topping & combo-item detail / qty stepper
(`FavouriteItemCard.tsx:18-89`); `FavouritesSummaryList` "Tóm tắt:" + per-item rows + total
(`FavouritesSummaryList.tsx:9-45`); sets empty-state panel + back button (`sets/page.tsx:104-116`);
the 3-panel layout structure overall.

---

## Area 2 — Cross-Component Dataflow

**Verdict: Faithful.** `_crosscomponent_dataflow.md` is essentially a 1:1 trace of the code. Every
spot-checked cite holds.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Store mutations table | addItem 49-51 · removeItem 54-55 · updateQty 57-60 · addSet 62-69 · renameSet 72-75 · deleteSet 77-79 · isFavourite 80-81 · toggleFav 83-90 (`_crosscomponent_dataflow.md:114-121`) | **All exact** (`favourites.ts:49,54,57,62,72,77,80,83`) | 🟢 | — (none) |
| Resolve / filter / counts | `page.tsx:52-85 / 87-89 / 91-95` (`_crosscomponent_dataflow.md:152-165`) | Exact (`page.tsx:52-85,87-89,91-95`) | 🟢 | — |
| `handleAddAllToCart` | `page.tsx:97-122` builds `product_<id>_<sortedToppingIds>` / `combo_<id>` (`_crosscomponent_dataflow.md:287-306`) | Exact (`page.tsx:99-119`) | 🟢 | — |
| TopNav reads cart only | `useCartStore.itemCount()` `cart.ts:125` (`_crosscomponent_dataflow.md:80`) | Exact (`FavouritesTopNav.tsx:12`, `cart.ts:125`) | 🟢 | — |
| `addSet` snapshots `[...s.items]` | `favourites.ts:67` frozen snapshot (`_crosscomponent_dataflow.md:362,418`) | Exact (`favourites.ts:68`) | 🟢 | — |

**Verified-matching:** the entire "two stores as hubs, no widget-to-widget" model; the stale-removal
`useEffect` dependency-array caveat (`page.tsx:49-50` `eslint-disable`); combo `toppings: []` hardcode
(`page.tsx:118`, `sets/page.tsx:94`).

---

## Area 3 — Cross-Page Dataflow

**Verdict: Faithful.** Consumer (heart toggles on `/menu`) and producer (cart hand-off) call sites are
all accurate.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Consumer toggle sites | `ProductCard.tsx:70`, `ComboCard.tsx:95`, `FavouritesRail.tsx:36,47` (`_crosspage_dataflow.md:42-44`) | **All exact** (verified by grep) | 🟢 | — |
| `toggleFav` drops qty/toppings | inserts `{id,type,qty:1,toppingIds:[]}` `favourites.ts:88` (`_crosspage_dataflow.md:46-51`) | Exact (`favourites.ts:88`) | 🟢 | — |
| Cart `items[]` session-only | `store/cart.ts:151` (`_crosspage_dataflow.md:28`) | Off-by-2: partialize at `cart.ts:153` (`items[]` not in whitelist) | 🟢 | Update line `:151`→`:153` |
| Favourites persist key | `STORAGE_KEYS.FAVOURITES='favourites'` `favourites.ts:92`, `storage-keys.ts:4` (`_crosspage_dataflow.md:27`) | Exact (`favourites.ts:92`, `storage-keys.ts:4`) | 🟢 | — |

**Verified-matching:** the persisted-favourites / session-cart asymmetry; additive "apply set" /
"add all" semantics (`cart.ts:50` dedup); within-suite `router.push` navigation cites
(`page.tsx:148-149`, `save/page.tsx:75`).

---

## Area 4 — Loading Behaviour

**Verdict: Faithful.** `_loading.md` correctly documents the suite's defining quirk — that
empty / cold-load / fetch-error are visually identical — and every cite lands.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Shop route spinner | `(shop)/loading.tsx:1-7` centered orange spinner (`_loading.md:35-42`) | Exact (`(shop)/loading.tsx`, `border-t-orange-500`) | 🟢 | — |
| Empty/loading/error conflation | `resolvedItems.length===0` in all 3 cases; no spinner/error (`_loading.md:90-104,207`) | Exact (`page.tsx:128-129`, `flatMap` drops unresolved `page.tsx:52-85`) | 🟢 | — (doc correctly flags as a code-quality gap) |
| Stale-removal guard | `page.tsx:38-50`, deps `[productsLoaded,combosLoaded]` (`_loading.md:108-132`) | Exact (`page.tsx:38-50`) | 🟢 | — |
| SetCard footer count from snapshot | `{set.items.length} món` not resolved (`_loading.md:170-172,211`) | Exact (`SetCard.tsx:79`) | 🟢 | — |

**Verified-matching:** the `isSuccess` (`productsLoaded`/`combosLoaded`) is the only success-gate in
the suite; save/sets pages do not destructure `isLoading`/`isError`; `FavouritesSummaryList` zero-total
stub (`FavouritesSummaryList.tsx:10`).

---

## Area 5 — FE⇄BE Data Model

**Verdict: Mostly faithful.** `_be.md` correctly identifies the suite as a read-only consumer of two
public GETs, and its handler/service/serializer cites are all accurate. The **only** drift is the
recurring stale `main.go` route line numbers.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `main.go` route lines | `GET /products` `:167-168`, `GET /combos` `:215-216`; auth `:168`/`:216`; mutations `:174-181`/`:220-226` (`_be.md:23-28,38-45`) | Stale ~+13: products group `:180`, GET `:181`; combos group `:228`, GET `:229`; mutations `:184-`/`:231-239` (`main.go`) | 🟡 | Re-cite to current lines, or cite route *group + handler name* instead of absolute `main.go` line |
| Handler / service / serializer cites | `ListProducts product_handler.go:42` / `product_service.go:164`; `ListCombos :327`/`:497`; `productJSON :443`; `ListProductsAvailable :173`; `ListCombosAvailable :505` (`_be.md:23-24,53-71`) | **All exact** (`product_handler.go:42,327,443`; `product_service.go:164,173,497,505`) | 🟢 | — |

**Verified-matching:** both GETs public (no `authMW` on the bare `.GET("")`); 5-min `productCacheTTL`
(`product_service.go:21`) = FE `staleTime`; FE soft-fails both queries to `[]` so a fetch error renders
EmptyState (Flag in `_be.md:96-104`); combo `product_id`s resolved against the products list, with
fallback `'Món không rõ tên'` (list, `page.tsx:73`) — **note** the sets page uses the raw id as
fallback instead (`sets/page.tsx:40`), exactly as `_be.md` Flag 4 documents.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Doc fix | Remove the `[+ Giỏ]` per-card button from the ASCII + Key Interactions (no code behind it) | `customer_favourites.md:20-21,53` |
| 2 | 🔴 Code bug | Fix the footer↔`ClientBottomNav` overlap on list + save pages (offset above 72px nav or raise z-index) | `FavouritesFooter.tsx:12`, `save/page.tsx:103` |
| 3 | 🟡 Doc fix | Redraw list TopNav (cart badge, not `[Lưu bộ]`) + draw all 3 footer buttons + show the global nav | `customer_favourites.md:13-34` |
| 4 | 🟡 Doc fix | Match all three TopNav titles + filter labels ("Món"→"Món lẻ" + counts) | `customer_favourites.md:15,17` |
| 5 | 🟡 Doc fix | `SetCard` actions: "Thêm vào giỏ"→"Áp dụng"; add the rename action | `customer_favourites.md:23,55-56` |
| 6 | 🟡 Doc fix | Refresh `_be.md` `main.go` route lines (`:167-168`→`:180-181`, `:215-216`→`:228-229`, etc.) | `customer_favourites_be.md:23-45` |
| 7 | 🟢 Doc fix | Zones-table method name `saveSet`→`addSet`; `cart.ts:151`→`:153` | `customer_favourites.md:46`, `_crosspage_dataflow.md:28` |
| 8 | 🟢 Code cleanup | Remove dead `useFavouritesStore.addItem` (zero callers) or note why kept | `favourites.ts:33,49-52` |
| 9 | 🟢 Doc fix | Bump provenance branch in all doc files to `…_test_iphon2_change_code` | all `customer_favourites/*.md` |

> Per CLAUDE.md: doc fixes (#1, #3-7, #9) are **one** ALIGNed task. Each code change (#2, #8) must be
> registered as its own row in `docs/tasks/MASTER_TASK.md` **before any file is touched**.
