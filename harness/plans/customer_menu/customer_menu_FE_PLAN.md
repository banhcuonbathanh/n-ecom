# Customer Menu — Frontend Build Plan (F-31)

> **TL;DR:** How the frontend of `/menu` actually gets built — slices, exact files,
> token + copy constants, store contracts, query hooks, component/prop inventory,
> the payload-builder algorithm, and the screenshot receipts — in the order a
> session can ship them.
>
> **Ownership boundary (one fact one home).**
> [`customer_menu_PLAN.md §4`](customer_menu_PLAN.md) owns **WHAT** the page does —
> the route/file map, state ownership table, the three loading tiers, and the
> 12 numbered behaviors. This file owns **HOW** it is built and never restates that
> spec; it links to it. Exact twin of the relationship
> [`customer_menu_BE_PLAN.md`](customer_menu_BE_PLAN.md) (F-30) has with §3.
>
> Written 2026-07-24 (F-31) by reading §4 against `FE_STATE.md`, `PLAN.md §Stack`,
> `diagrams/design-system.html`, the folder's `_mockup-1.html`, and the sibling
> plans that own shared pieces (`customer_favourites`, `customer_orders_tracking`).
> **The reconciliation surfaced 4 findings (§10)** — two of them (F34, F36) would
> have become real bugs or a blocked session at build time.

---

## 1. Scope — what the frontend must ship for `/menu`

| # | Surface | Spec home | Build slice (§3) |
|---|---|---|---|
| 1 | `/menu` route shell + RSC prefetch + `loading`/`error` | [PLAN §4.1](customer_menu_PLAN.md) · [§4.3 tier 1](customer_menu_PLAN.md) | FE-M1 |
| 2 | Sectioned menu: header, scroll-spy nav, product/combo cards, nhân pills | [PLAN §4.4](customer_menu_PLAN.md) #1, #3, #9 | FE-M2 |
| 3 | Search mode + favourites rail + custom-suất section | [PLAN §4.4](customer_menu_PLAN.md) #2 · [`customer_favourites`](../customer_favourites/customer_favourites_PLAN.md) | FE-M3 |
| 4 | Cart store + `OrderSummary` + `CartBottomBar` + the canh gate | [PLAN §4.2](customer_menu_PLAN.md) · [§4.4](customer_menu_PLAN.md) #4–#7 | FE-M4 |
| 5 | `/menu/product/[id]` + `/menu/combo/[id]` + prefetch-on-hover | [PLAN §4.1](customer_menu_PLAN.md) · [§4.3 tier 1](customer_menu_PLAN.md) | FE-M5 |
| 6 | `TableConfirmModal` → `POST /orders`, append mode, post-order handoff | [PLAN §4.4](customer_menu_PLAN.md) #8 · [§4.2](customer_menu_PLAN.md) | FE-M6 |

**Also built here because the page cannot run without them:** the customer shell
(`app/(customer)/layout.tsx` — **currently unowned, §10 F36**), the token layer that
makes the dark/orange shell real, the VN copy constants file, `formatVND()`,
`buildImageURL()`, and the typed catalog/orders API modules.

**Out of scope (named so nobody builds them here):** `/checkout` (online path — its own
page, unplanned), the `/orders` screen and everything SSE
([`customer_orders_tracking`](../customer_orders_tracking/customer_orders_tracking_PLAN.md)),
the favourites *hub* routes (`/menu/favourites|save|sets` — F-24 owns those; this page
builds only the rail and the heart toggle that write the same store), and every admin
surface. Also **not built in v1**: `CartDrawer`, `MiniCartStrip`, recovery banners, and the
four dead reference components ([PLAN §4.1](customer_menu_PLAN.md)).

## 2. Alignment — what governs this build (read, don't restate)

| Concern | Owning doc |
|---|---|
| Page behavior, file map, state-ownership table, loading tiers | [`customer_menu_PLAN.md §4`](customer_menu_PLAN.md) |
| State kinds + decision flow, data flow, cache policy, error tiers, RSC/client split, forms, FE folder layout, **hard rules 1–14** | [`FE_STATE.md`](../../FE_STATE.md) §1–§9 |
| Stack + pinned versions | [`PLAN.md §Stack`](../../PLAN.md) |
| Token names, component specimens, button state matrix | [`diagrams/design-system.html`](../../diagrams/design-system.html) (F-7) |
| The API this page consumes (shapes, codes) | [`customer_menu_PLAN.md §3`](customer_menu_PLAN.md) — frozen by [BE_PLAN §9](customer_menu_BE_PLAN.md) receipts |
| Favourites store shape (`items`/`sets`/`suats`) | [`customer_favourites_PLAN.md`](../customer_favourites/customer_favourites_PLAN.md) |
| Post-order destination + the `?id=` question | [`customer_order_detail_SUPPLEMENT.md §1`](../customer_order_detail/customer_order_detail_SUPPLEMENT.md) |
| Commands (dev, build, lint) | [`ENVIRONMENT.md §Commands`](../../ENVIRONMENT.md) |

Where a reference doc and a harness doc conflict, the harness wins. Where **two harness
docs** conflict, that is a finding — §10 has four, each with a plan default so no slice
is ever blocked on a doc argument.

## 3. Build spine — six slices, in dependency order

```
F-2 skeleton ─┐
F-4 api client├─▶ FE-M1 route shell + catalog queries ─▶ FE-M2 sections + cards ─▶ FE-M3 search + rail
F-7 tokens   ─┘                    │                                                      │
                                   ▼                                                      ▼
                          FE-M5 detail pages                    FE-M4 cart store + summary + canh gate
                                                                                          │
                                                          BE-M4 guest JWT ─▶ FE-M6 confirm → POST /orders
```

| Slice | Delivers | TASKS.md row | Blocked by |
|---|---|---|---|
| **FE-M1** | `(customer)` shell + tokens + copy + `/menu` RSC prefetch + `loading`/`error` + the 3 catalog hooks | **C-4a** (split — §8) | F-2, F-4, BE-M2/M3 receipts |
| **FE-M2** | `MenuHeader`, `MenuCategoryNav` (scroll-spy), `ProductList`/`ProductCard`, `ComboSection`, nhân pills | **C-4b** (split — §8) | FE-M1 |
| **FE-M3** | `SearchBar` + search mode, `FavouritesRail`, `CustomSuatSection`, favourites store | **C-6** (favourites row) | FE-M2 |
| **FE-M4** | `cart.store.ts`, `OrderSummary`, `CartBottomBar`, canh stepper + gate | **T-2 (unregistered — §8)** | FE-M2 |
| **FE-M5** | `/menu/product/[id]`, `/menu/combo/[id]`, prefetch-on-hover | `C-5` | FE-M2 |
| **FE-M6** | `TableConfirmModal`, `lib/order-payload.ts`, append mode, post-201 handoff | **O-0F (unregistered — §8)** | FE-M4, BE-M4, BE-M6 |

Each slice is one session and ends with a mobile-viewport screenshot receipt (§9).
**FE-M1 cannot start before BE-M2/BE-M3 have produced their curl receipts** — `types.ts`
is written from the transcript, never from a doc ([ARCHITECTURE §5](../../ARCHITECTURE.md)
gate 8). That single edge is why the FE spine trails the BE spine by two slices.

---

## 4. Foundation layer

### 4.1 Route files — exact paths

Numbers assume F-2 lands the Next skeleton. Every segment ships all three files
([FE_STATE §9](../../FE_STATE.md) rule 3) — a segment with no `error.tsx` does not merge.

| File | Slice | What |
|---|---|---|
| `fe/src/app/(customer)/layout.tsx` | FE-M1 | **The customer shell** — dark/orange token scope, VN `lang`, viewport meta, `providers.tsx` boundary. Unowned before this plan (**F36**) |
| `fe/src/app/(customer)/menu/page.tsx` | FE-M1 | RSC: prefetch the 3 catalog queries in parallel → `HydrationBoundary` |
| `…/menu/loading.tsx` · `…/menu/error.tsx` | FE-M1 | layout-shaped skeleton (banner + nav strip + rail + card grid) · segment retry |
| `…/menu/product/[id]/{page,loading,error}.tsx` | FE-M5 | detail + its own layout-shaped skeleton (cold-URL case) |
| `…/menu/combo/[id]/{page,loading,error}.tsx` | FE-M5 | same |

### 4.2 Tokens + copy — the two constants files

**Tokens.** [FE_STATE §9](../../FE_STATE.md) rule 8 forbids raw hex and raw palette
classes, so the dark/orange shell must exist as *semantic token values* before any card
is styled. F-7's names (`--ds-primary`, `--ds-surface`, `--ds-ink`, `--ds-muted`,
`--ds-border`, …) stay; the `(customer)` layout scope re-binds their **values**:

| Token | Customer value | Source |
|---|---|---|
| `--ds-primary` | `#f97316` | reference orange — the only bright color |
| `--ds-surface` | `#0b0f17` | reference bg |
| `--ds-on-primary` / `--ds-ink` / `--ds-muted` / `--ds-border` | dark-shell scale | mockup `:root` |
| display face | Playfair Display (title only) | mockup `--serif` |

Admin/staff surfaces keep F-7's neutral values untouched — that is the whole point of
re-binding at the layout scope rather than editing the token file.
⚠ **Gated on F01** ([FINDINGS](../../FINDINGS.md)): plan default = dark/orange, as
[PLAN §7](customer_menu_PLAN.md) already states. If the owner picks blue, this table is
the only thing that changes — no component edits. That is the reason for the indirection.

**Copy.** One file `fe/src/lib/copy/menu.vn.ts` holds every Vietnamese string
([PLAN §4.4](customer_menu_PLAN.md) #10) — "Quán Bánh Cuốn", "Tìm món nhanh…",
"Thanh toán", "SUẤT", "SUẤT TỰ TẠO", "Chi tiết", "TỔNG SỐ MÓN", "Hết", the canh-gate
toast. No i18n framework. The 3-way "Combo"/"Suất"/"SUẤT" drift the reference shipped is
structurally impossible once nav + heading read the same constant.

### 4.3 API + types + query layer

| File | Slice | Notes for the author |
|---|---|---|
| `fe/src/lib/api/client.ts` | F-4 | THE fetch wrapper; `credentials:'include'` (the guest cookie), envelope → `ApiError{status,code,message,details}` |
| `fe/src/lib/api/types.ts` | FE-M1 | **Written from the BE-M2/M3 curl receipts** (gate 8). `price`/`image_path` spellings, real `null` never `""`, ids always `string`, money `number` |
| `fe/src/lib/api/catalog.ts` | FE-M1 | `getProducts()`, `getCategories()`, `getCombos()`, `getProduct(id)`, `getCombo(id)` — **no params**, [PLAN §3.4](customer_menu_PLAN.md) |
| `fe/src/lib/api/orders.ts` | FE-M6 | `createOrder(body)`, `appendOrderItems(id, items)` |
| `fe/src/queries/keys.ts` | FE-M1 | add `combos` + `combo(id)`; drop the params from `products` and the `cart` key (**F35**) |
| `fe/src/queries/catalog.ts` | FE-M1 | `useProducts` / `useCategories` / `useCombos` / `useProduct` / `useCombo` — `staleTime` **5 min** on all five (matches the Redis TTL) |
| `fe/src/lib/format.ts` | FE-M1 | `formatVND()` — the **only** money renderer ([FE_STATE §9](../../FE_STATE.md) rule 9). Glyph gated on **F12**; plan default `30.000 đ` |
| `fe/src/lib/image.ts` | FE-M1 | `buildImageURL(path)` from `NEXT_PUBLIC_API_BASE_URL` — rule 14. Defined-and-never-called is the exact reference defect; SELF-REVIEW greps for call sites |

---

## 5. State layer

### 5.1 File inventory (exact paths — the scope-contract skeleton)

Extends [FE_STATE §8](../../FE_STATE.md); `+` = new in this plan's slices.
This tree **is** the scope contract for every slice below. A file not in it means
STOP and re-scope ([ARCHITECTURE §5](../../ARCHITECTURE.md) gate 2).

```
fe/src/
  app/(customer)/layout.tsx            + M1  the shell (tokens scope)
  app/(customer)/menu/…                + M1/M5  §4.1
  lib/
    api/{client,types,catalog,orders}.ts + §4.3
    copy/menu.vn.ts                    + M1  every VN string
    format.ts · image.ts               + M1  formatVND · buildImageURL
    menu-sections.ts                   + M2  buildMenuSections() + isCanhProduct()  (F34)
    order-payload.ts                   + M6  THE buildOrderItemsPayload() — §7
  queries/{keys,catalog}.ts            + M1
  stores/cart.store.ts                 + M4
  stores/favourites.store.ts           + M3  shape owned by customer_favourites plan
  components/menu/
    MenuHeader.tsx · MenuCategoryNav.tsx        + M2
    ProductList.tsx · ProductCard.tsx           + M2
    ComboSection.tsx · NhanPills.tsx            + M2
    SearchBar.tsx · FavouritesRail.tsx
      · CustomSuatSection.tsx                   + M3
    OrderSummary.tsx · CartBottomBar.tsx        + M4
    TableConfirmModal.tsx                       + M6
  components/ui/{Skeleton,EmptyState,ErrorSlot}.tsx  + M1 (shared, not menu-specific)
```

### 5.2 Store contracts — the two client stores

Kinds and owners are settled in [PLAN §4.2](customer_menu_PLAN.md); what this plan adds
is the **shape a session types in**.

**`cart.store.ts`** (FE-M4)

| Member | Kind | Notes |
|---|---|---|
| `lines: CartLine[]` | state | `CartLine = {lineId, kind:'product'\|'combo'\|'canh', refId, quantity, toppingIds[], note?}` |
| `orderNote: string` | state | written by `OrderSummary`, read by `TableConfirmModal` at POST time — the reference's 🔴 lost-note bug |
| `tableId` / `tableName` | state | identity, survives `clearCart()` |
| `activeOrderId: string \| null` | state | append target (**F37** — URL wins over this) |
| `addItem` / `setQuantity` / `removeLine` / `clearCart` / `setOrderNote` | actions | `addItem` dedups on `lineId` (§7.1) — no scan-and-merge logic |
| `total()` / `itemCount()` / `canhCount()` | **selectors** | never stored ([FE_STATE §9](../../FE_STATE.md) rule 11) |

`partialize` persists only `{orderNote, activeOrderId, tableId, tableName}`; versioned
storage key + `migrate` fn from day one ([PLAN §4.2](customer_menu_PLAN.md)).

**`favourites.store.ts`** (FE-M3) — `{items[], sets[], suats[]}`, fully persisted,
device-local. **Shape is owned by**
[`customer_favourites_PLAN.md`](../customer_favourites/customer_favourites_PLAN.md);
this page builds the store file + the heart toggle + the rail that read it, and
re-derives nothing.

### 5.3 Derivations — computed, never stored

Every one of these is a pure function or a selector, because a stored copy is drift by
construction ([FE_STATE §9](../../FE_STATE.md) rule 11):

| Value | Where | Input |
|---|---|---|
| menu sections + their order | `buildMenuSections()` | categories (`sort_order`) + products, canh excluded (**F34**) |
| cart total · item count · canh count | store selectors | `lines` + the products query |
| search results | component-local `useMemo` | `?q=` + products (client-side, ≥ 2 chars) |
| "is this favourited" | favourites selector | `favourites.items` |
| combo component names/prices | `ComboSection` join | `combo_items` ids ⨝ the **already-cached** products query — never a second fetch, never props threaded |
| active nav tab | `IntersectionObserver` in `MenuCategoryNav` | scroll position |

---

## 6. Component layer

### 6.1 Inventory + prop contracts

Server/client split per [FE_STATE §5](../../FE_STATE.md): push `'use client'` to the
leaves. `page.tsx` is RSC; everything below with a handler or a hook is a client leaf.

| Component | `'use client'` | Props (the contract) | Reads |
|---|---|---|---|
| `MenuHeader` | no | `—` | copy constants |
| `MenuCategoryNav` | yes | `sections: {id,label}[]` | — (own observer) |
| `SearchBar` | yes | `—` | `?q=` via `useSearchParams` |
| `ProductList` | yes | `section: MenuSection` | `useProducts` |
| `ProductCard` | yes | `product: Product` | favourites + cart stores |
| `NhanPills` | yes | `toppings: Topping[]`, `mode: 'single'\|'multi'`, `value`, `onChange` | — (controlled) |
| `ComboSection` | yes | `—` | `useCombos` + `useProducts` (the join) |
| `FavouritesRail` | yes | `—` | favourites store + both catalog queries |
| `CustomSuatSection` | yes | `—` | favourites store (`suats`) |
| `OrderSummary` | yes | `—` | cart store + `useProducts` |
| `CartBottomBar` | yes | `—` | cart store selectors |
| `TableConfirmModal` | yes | `open`, `onOpenChange` | cart store (incl. `orderNote`) + the create mutation |

**No component takes cart or catalog data as a prop.** Distant components talk through
the store or the Query cache — the two mechanisms [PLAN §4.2](customer_menu_PLAN.md)
names, and no third. Prop-drilling cart state is how the reference lost the order note.

### 6.2 Render-branch matrix

[PLAN §4.3](customer_menu_PLAN.md) names five branches; this is where each one is *built*.
"Docs said 3 branches, code had 5" is a listed reference defect — so the matrix is the AC.

| Branch | Owner | Built in |
|---|---|---|
| loading (`isPending`, no cache) | in-place `Skeleton` per section | FE-M1 |
| error (any of the 3 queries failed) | **one** `ErrorSlot` — "⚠ Kết nối mạng yếu" + Thử lại | FE-M1 |
| empty (query ok, section has no items) | `EmptyState` | FE-M2 |
| searching (`?q=` ≥ 2) | flat list or no-match empty state | FE-M3 |
| data | sectioned menu | FE-M2 |

One error slot for all three catalog queries, not per-section silence — the reference let
a failed categories fetch render as an empty section, which reads as "closed kitchen".

---

## 7. The payload builder (the part that is easy to get wrong)

The FE twin of [BE_PLAN §7](customer_menu_BE_PLAN.md). The BE snapshots names and prices;
the FE's whole job is to send **ids and quantities only**, correctly grouped.

### 7.1 Line-id algebra (why `addItem` needs no merge logic)

```
product line : product_<productId>_<nhanId|plain>
combo line   : combo_<comboId>_<sortedNhanIds.join('-')|plain>
canh line    : canh_<productId>_<rau|plain>
```

The id **is** the dedup key: same dish + same nhân = same `lineId` = quantity increments;
one different nhân = a new row. This is the whole reason each filling combination gets its
own cart row without a single comparison in `addItem`.

### 7.2 `buildOrderItemsPayload()` — one builder, three callers

Callers: `TableConfirmModal` (QR path), `/checkout` (online path), append mode. **Three
call sites, one function** — divergent inline builders are how wire shapes drift.

```
for each cart line:
  kind 'product' → { product_id, quantity, topping_ids }
  kind 'canh'    → { product_id, quantity }                  // no toppings, ₫0
  kind 'combo'   → { combo_id,  quantity, topping_ids }      // ids only
                   ↑ canh lines are NEVER emitted inside a combo line
```

**The canh contract, both halves.** The FE emits every soup as its own top-level product
line and never inside a combo; the BE's half is that seeded `combo_items` templates carry
no canh rows ([BE_PLAN §4.2](customer_menu_BE_PLAN.md), F30). Break either half and the
guest is charged for two soups. The builder therefore filters by
**`isCanhProduct()` → category, not name** (**F34**).

Never on the wire: `name`, `price`, `unit_price`, `total`, `source`, `table_id`
(the last two are asserted by the BE from the JWT and `403` on disagreement —
[BE_PLAN §7.1](customer_menu_BE_PLAN.md)).

### 7.3 The post-201 handoff

```
onSuccess(order):                      // pessimistic — FE_STATE rule 4
  queryClient.setQueryData(keys.order(order.id), order)
  cart.setActiveOrderId(order.id)      // BEFORE the navigation
  cart.clearCart()                     // keeps tableId/tableName/orderNote identity fields
  router.replace('/orders')            // ⚠ becomes '/orders?id=' if F02 is adopted
```

The ordering dependency on line 2→4 is exactly the fragility
[`customer_order_detail_SUPPLEMENT.md §1`](../customer_order_detail/customer_order_detail_SUPPLEMENT.md)
writes up; adopting `?id=` deletes it. **Decide before FE-M6 opens** (F02).

On error the modal stays open, shows the envelope's `message`, and the cart is untouched —
branch on `ApiError.code`, never on message text ([FE_STATE §9](../../FE_STATE.md) rule 5).
The codes this modal can see: `VALIDATION_FAILED` (422 — an 86'd dish arrives as
`details[].field = "items[2].product_id"`, highlight that line), `UNAUTHORIZED` (401 —
expired guest JWT → re-scan prompt), `FORBIDDEN`, `ORDER_CLOSED` (409, append mode only).

---

## 8. Task mapping — rows this build needs

Two slices land on existing rows; **C-4 splits** (its own plan already predicted it), and
**two rows do not exist yet**. Row text is drafted here so registration is a paste.

| Slice | Row | Status |
|---|---|---|
| FE-M1 | **`C-4a` (split)** | *"FE: customer shell + menu route — `(customer)` layout w/ dark-orange token scope, RSC prefetch of the 3 catalog queries, layout-shaped `loading.tsx`/`error.tsx`, the api/types/query layer written from the C-2/C-3 receipts."* Deps C-2, C-3, F-2, F-4 |
| FE-M2 | **`C-4b` (split)** | *"FE: sectioned menu — header, scroll-spy nav, product/combo cards, nhân pills, all 5 render branches."* Deps C-4a |
| FE-M3 | `C-6` | exists as the favourites row ([F-24](../customer_favourites/customer_favourites_PLAN.md)) — the rail + search land with it |
| FE-M4 | **`T-2` (new)** | *"FE: cart store + on-page cart surfaces — `cart.store.ts` (persisted, versioned), `OrderSummary` line editor + canh stepper + rollup, `CartBottomBar`, the canh gate."* Deps C-4b. AC: screenshots + store unit tests |
| FE-M5 | `C-5` | exists — retitle to `/menu/product/[id]` + `/menu/combo/[id]` + prefetch-on-hover |
| FE-M6 | **`O-0F` (new)** | *"FE: order confirm + append — `TableConfirmModal` reading `cart.orderNote`, the one `buildOrderItemsPayload()`, the post-201 handoff, `?add_to_order=` append mode."* Deps T-2, T-1, O-0. AC: note round-trip + a 422 refusal rendered on the right line |

Registering `T-2`/`O-0F` is **not** part of F-31 (this task ships the plan, not the task
board) — they are registered when the T/O phase opens, alongside BE_PLAN §8's `T-1`/`O-0`,
so ids can't collide with a parallel session ([F04/F25](../../FINDINGS.md)).

## 9. Verify plan — the receipts each slice owes

Logged in [`VERIFICATION.md`](../../VERIFICATION.md). FE receipts are **mobile-viewport
screenshots** (390 × 844) plus, where named, a store unit test.

| Slice | Receipt |
|---|---|
| FE-M1 | first paint with **no spinner** on a warm server; `loading.tsx` streamed (throttled); the error branch with the BE stopped; `npm run build && npm run lint` green |
| FE-M2 | the sectioned menu on the seeded catalog; a tab tap scroll-spying; the three nhân states (2 pills / 1 pill / none); the "Hết" overlay on an 86'd dish; an empty category |
| FE-M3 | 1-char hint → 2-char flat results → no-match empty → ✕ restores sections; the rail with a pinned set |
| FE-M4 | add → same dish + different nhân makes a **second** row; the rollup table; the canh gate (dim → toast → auto-open → shake); `partialize` proof — reload keeps the note, drops the lines; store unit tests for the §7.1 id algebra |
| FE-M5 | both detail pages from a cold URL + a warm hover-prefetch navigation |
| FE-M6 | **the note round-trip** (type in OrderSummary → POST body carries it); the worked example (Bàn 04 · 103.000 đ · badge 13) posting to a 201; a `422` rendered on the offending line; append mode via `?add_to_order=` |
| all | design-token grep: **zero** raw hex / raw palette classes in `components/menu/`; `buildImageURL` has call sites |

The worked example is the same one the BE receipts use — one set of numbers across docs,
seeds, screenshots and transcripts.

## 10. Findings raised by this plan

Four reconciliations; each has a plan default so no slice is blocked. Tracked as
`F34`–`F37` in [`FINDINGS.md`](../../FINDINGS.md) — that ledger owns their status.

| # | Sev | What | Plan default (build to this unless the owner rules otherwise) |
|---|---|---|---|
| **F34** | 🚨 | **Canh is identified by name on the FE.** [PLAN §4.4](customer_menu_PLAN.md) #4 filters soup out of lists, search and combo payloads via `isSoupName()` — a string match. Meanwhile [BE_PLAN §4.2](customer_menu_BE_PLAN.md) seeds a real **CANH category**, and the BE deliberately refuses name-matching in Go. So the two sides identify the same business rule by different means, and renaming a dish in `/admin/products` silently breaks the canh gate, the double-canh guard, and the payload builder at once | Replace `isSoupName()` with **`isCanhProduct(p) = p.category_id === CANH_CATEGORY_ID`**, resolved once from the categories query. The FE stops string-matching, both sides key off the same seeded fact, and an admin rename is harmless |
| **F35** | ⚠️ | **`keys.ts` + cache policy are pre-pivot.** [FE_STATE §2](../../FE_STATE.md)'s factory types `products` with `{page, category, q}` and carries a `cart: ['cart']` key; [§3](../../FE_STATE.md) gives products a 60 s `staleTime` and maps mutations onto `['cart']`. This page ships **no query params** ([PLAN §3.4](customer_menu_PLAN.md)), **no server cart** (client store since the F-9 pivot), 5-min staleness, and needs a `combos` key that doesn't exist | Build the factory as: `products`, `product(id)`, `categories`, `combos`, `combo(id)`, `order(id)` — no params, no `cart`. `staleTime` 5 min on all catalog queries. Amend `FE_STATE §2/§3` at C-4a, the way C-2 amends `ARCHITECTURE §4` for the BE's twin drift (F29) |
| **F36** | ⚠️ | **The customer shell has no owner.** Every customer plan (menu, favourites, orders) renders "on the dark/orange shell", but no plan's file map contains `app/(customer)/layout.tsx` — and [FE_STATE §9](../../FE_STATE.md) rule 8 forbids the raw hex that would let a component fake it. The first FE session would have discovered it had to invent an unscoped file | This plan claims it: built in **FE-M1** (§4.1/§4.2) as the token-scope boundary, and cross-linked from the sibling customer plans rather than rebuilt |
| **F37** | 💡 | **Append mode has two sources of truth** — the URL (`?add_to_order=<id>`, [PLAN §4.4](customer_menu_PLAN.md) #8) and the persisted store (`cart.activeOrderId`, §4.2). They can disagree after a stale tab, a second phone, or a cleared store | **URL wins** when present; the store is the fallback for a same-device return. Same principle as the F02 `?id=` recommendation — shareable state lives in the URL ([FE_STATE §9](../../FE_STATE.md) rule 2) |

Standing decisions this plan inherits and does **not** re-decide: the shell theme
([F01](../../FINDINGS.md) — default dark/orange), the `/orders` deep-link gap
([F02](../../FINDINGS.md) — changes one line in §7.3), the money glyph
([F12](../../FINDINGS.md) — `formatVND()` owns it either way), and cart-items persistence
(session-only, a one-line `partialize` change if the owner wants otherwise).

---

*Written 2026-07-24 (F-31). This file owns the **build** of the menu page's frontend —
slices, files, token/copy/store/query contracts, component props, the payload builder, and
the receipts. The **behavior** it builds toward stays in
[`customer_menu_PLAN.md §4`](customer_menu_PLAN.md); the rules it obeys stay in the docs
named in §2; task status stays in [`TASKS.md`](../../TASKS.md).*
