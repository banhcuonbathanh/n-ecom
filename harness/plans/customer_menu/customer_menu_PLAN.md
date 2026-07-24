# Customer Menu Page — Consolidated FE + BE Build Plan (F-15)

> **TL;DR:** One plan, one folder, for the customer-facing menu page (`/menu`) — the
> highest-traffic surface of the restaurant platform. FE and BE sides are planned
> together here because the page is a contract: catalog reads (public, cached),
> a client-side cart (Zustand), and the order-creation handoff (guest JWT).
> Visual companions: [`customer_menu_plan.html`](customer_menu_plan.html) (the plan),
> [`customer_menu_how-it-works.html`](customer_menu_how-it-works.html) (runtime walkthrough
> — end-to-end sequences) and [`customer_menu_mockup-1.html`](customer_menu_mockup-1.html)
> (the UI). **Backend build plan:**
> [`customer_menu_BE_PLAN.md`](customer_menu_BE_PLAN.md) (F-30, 2026-07-24) — how §3's
> contract gets built: slices, migrations, sqlc queries, service/tx bodies, the order
> expansion algorithm, receipts.
> Source: `reference/docs/system/08_pages/customer/customer_menu/` (16 docs, digested
> 2026-07-18 by 2 Explore agents) reconciled with `OVERALL_PLAN.md` phases C/T/O and
> the F-5/F-8/F-11/F-12 rule sets. **One fact one home:** this file owns the menu
> page's scope, contract, and task mapping — rules stay in their owning docs (linked).

---

## 1. What the page is

Mobile-first menu for a dine-in bánh cuốn restaurant. A guest lands here two ways:

- **QR path** — scanned `/table/:id` first (T phase): guest JWT carries `table_id`;
  ordering posts to the table.
- **Online path** — arrived directly: a table-less guest JWT is minted silently
  (`POST /auth/guest/online`); checkout collects name/phone.

Core loop on the page: browse categories/combos → build a cart (client-only) →
confirm → `POST /orders` → redirected to live order tracking. The menu page also
re-enters in **append mode** (`?add_to_order=<id>`) to add items to an active order.

In/out links: in from `/` (landing), `/table/:id` (QR airlock), the `/orders` screen
("Gọi thêm" → append); out to `/menu/product/:id`, `/menu/combo/:id`, `/checkout`
(online path), `/orders` (after POST).

> **Superseded 2026-07-19 (F-19).** This section originally routed to `/order/:id`.
> That route is **merged away** — order detail is now a view inside `/orders`
> ([`../customer_orders_tracking/customer_orders_tracking_PLAN.md`](../customer_orders_tracking/customer_orders_tracking_PLAN.md)).
> ⚠ If the `?id=` recommendation in
> [`../customer_order_detail/customer_order_detail_SUPPLEMENT.md`](../customer_order_detail/customer_order_detail_SUPPLEMENT.md) §1
> is adopted, the target becomes `/orders?id=<id>`.

## 2. Alignment — what governs this page (read, don't restate)

| Concern | Owning doc |
|---|---|
| Stack + versions | `harness/PLAN.md §Stack` |
| BE layering, tx policy, error envelope | `harness/BE_STATE.md` |
| goose+sqlc workflow, Go/Gin gotchas | `harness/BE_PLAYBOOK.md` |
| FE state kinds, cache map, loading tiers, hard rules 1–14 | `harness/FE_STATE.md` |
| Design tokens + commerce components | `harness/diagrams/design-system.html` (F-7) |
| Product scope, phase roadmap, lessons register | `harness/OVERALL_PLAN.md` (F-9) |
| Redis policy | `harness/ARCHITECTURE.md §4` + `OVERALL_PLAN.md §3.6` |

Reference docs are the **what**; the harness rules above are the **how**. Where they
conflict, the harness wins (established F-9 pattern — e.g. cookie JWT beats the
reference's memory-token + `Authorization` header).

## 3. BE plan

> **Contract only.** This section owns *what* the backend exposes. *How* it is built —
> build slices, migration/query/file inventory, service + transaction bodies, the combo
> expansion algorithm, per-slice curl receipts — is owned by
> [`customer_menu_BE_PLAN.md`](customer_menu_BE_PLAN.md) (F-30), which also logs the
> 8 contract reconciliations it found (F26–F33 in `FINDINGS.md`).

### 3.1 Endpoints the page consumes (all under `/api/v1`)

| # | Route | Auth | Phase/Task | Behavior |
|---|---|---|---|---|
| 1 | `GET /categories` | public | C-2 | Redis `categories:list`, 5-min TTL. Fields: `id, name, description, sort_order, is_active`. |
| 2 | `GET /products` | public | C-2 | Redis `products:list`. Only `is_available=1`, soft-delete filtered; toppings joined via `product_toppings`. **Deliberately no query params in v1** — filtering/search is client-side (§4.4); manager surfaces use `GET /products/all` (uncached, role-scoped — FE rule 13). |
| 3 | `GET /combos` | public | C-3 | Redis `combos:list`. Combo + `combo_items: [{id, product_id, quantity}]` — **ids only**; FE joins names/prices from the products query (one source of truth, no duplicated product payloads). |
| 4 | `POST /auth/guest/online` | public, rate-limited | T | No body → sets 2 h guest-JWT **httpOnly cookie** (table-less, `source='online'`). Reference returned `{access_token}` for a memory store — **not adopted** (F-5 cookie decision; OVERALL_PLAN §3.4). |
| 5 | `POST /orders` | guest JWT | O | Cart → order: server-side price/name snapshot, `toppings_snapshot JSON`, combo expansion (header row `unit_price=0` + component rows via `combo_ref_id`), `RecalculateTotalAmount` in the same tx. Returns the **full order object** (lesson 7: thin `{id}` DTOs caused "Đơn #undefined"). |
| 6 | `POST /orders/:id/items` | guest JWT | O | Append mode; same items payload; recalc total in tx. |

Errors ride the Session-0 envelope; codes from `BE_STATE.md §4` (extended per phase).

### 3.2 Schema this page depends on (C-1 migration scope)

Catalog 6 tables — full column specs now canonical in `harness/DB_SCHEMA.md §4.1`
(F-16; conventions in its §1, field-name law in its §2):

- `categories` — `name, description, sort_order, is_active`
- `products` — `name, description, price, image_path, category_id, is_available`
  (field-name law: `price` not base_price, `image_path` relative not URL)
- `toppings` — `name, price` (bánh cuốn fillings are **₫0 toppings** — e.g. nhân thịt,
  mộc nhĩ; the reference's `filling` column was added in migration 016 and dropped
  in 017 — we never add it)
- `product_toppings` — junction
- `combos`, `combo_items` — `combo_items: {combo_id, product_id, quantity}` template
- Seed (C-1 AC): ≥ 10 products / ≥ 3 categories **+ ≥ 2 combos + the ₫0 topping set**
  so the menu page renders every card type from day one.

Order-side tables (`orders`, `order_items` with `qty_served`, `combo_ref_id`,
`toppings_snapshot`, CHECK-constrained row shapes, **no item `status` column** —
derived state, FE rule 11's BE twin) belong to the O-phase task, columns in
`harness/DB_SCHEMA.md §4.3`, state machine in `OVERALL_PLAN.md §3.7`.

### 3.3 Cache map (the C-2/C-3 AC — covers the old blind spot)

| Write | DEL keys |
|---|---|
| product create/update/delete/availability | `products:list`, `product:<id>` |
| topping write | `toppings:list`, `products:list`, **every `product:<id>` joined to it** (old system's stale-product bug) |
| combo write | `combos:list` |
| category write | `categories:list`, `products:list` |

Cache-aside in services only, 5-min TTL, fail-open to MySQL (`BE_STATE.md §7`).
Orders are never cached.

### 3.4 Not adopted from the reference BE (decided here)

- ❌ `filling` column (016/017 churn) — fillings are ₫0 toppings, snapshot covers it.
- ❌ Bearer-token responses / `?token=` streams — cookie JWT (F-5, kills SEC-02).
- ❌ Ghost query params on `GET /products` (reference handler documented but ignored
  them — a docs-vs-code trap). We ship **no** params rather than fake ones; server-side
  filtering arrives only if the catalog outgrows client-side (💡 flag, §7).
- ❌ Unwired rate-limit middleware — ours mounts on both guest-mint routes from day one.

### 3.5 Wire shapes (the FE↔BE object gallery)

> Contract shapes from this plan — field spellings get **frozen by curl receipts**
> when C-2/C-3/O build them (gate 8: `fe/src/lib/api/types.ts` is written from
> receipts, never guessed — kills the reference's `""` vs `null` mismatch).
> Success responses are never wrapped; only errors ride the envelope.

**`GET /categories` → 200**

```json
[ { "id": "c1a2…36", "name": "BÁNH CUỐN", "description": "…",
    "sort_order": 2, "is_active": true } ]
```

**`GET /products` → 200** — toppings pre-joined; `price` (never `base_price`) is a
bare VND integer (`DECIMAL(10,0)`); `image_path` relative (FE rule 14 builds the URL):

```json
[ { "id": "p12…36", "name": "Bánh cuốn trứng", "description": "…",
    "price": 35000, "image_path": "products/banh-cuon-trung.jpg",
    "category_id": "c1a2…36", "is_available": true,
    "toppings": [ { "id": "t1…", "name": "Nhân thịt", "price": 0 },
                  { "id": "t2…", "name": "Mộc nhĩ",  "price": 0 } ] } ]
```

The ₫0 toppings **are** the nhân pills — no `filling` field, ever (§3.4).

**`GET /combos` → 200** — ids only; FE joins names/prices from the products cache:

```json
[ { "id": "cb1…36", "name": "Suất đầy đủ", "price": 55000,
    "image_path": "combos/suat-day-du.jpg", "is_active": true,
    "combo_items": [ { "id": "ci1…", "product_id": "p12…36", "quantity": 2 } ] } ]
```

**`POST /auth/guest/online`** — the object is deliberately absent: empty request;
the response payload is a `Set-Cookie` (httpOnly guest JWT, 2 h, `source='online'`).
No `{access_token}` body (§3.4).

**`POST /orders` request** — built only by `buildOrderItemsPayload()`; **no prices,
no names on the wire** (rule 5 — the server snapshots both); canh lines stripped
from combo overrides by the builder:

```json
{ "source": "qr", "table_id": "tb04…36", "note": "ít hành",
  "items": [
    { "product_id": "p12…36", "quantity": 2, "topping_ids": ["t1…"] },
    { "combo_id": "cb1…36", "quantity": 1, "topping_ids": ["t1…", "t2…"] },
    { "product_id": "p_canh_rau…", "quantity": 2 } ] }
```

Online path: `source:"online"` + name/phone from `/checkout`. Append mode posts the
same `items` array to `POST /orders/:id/items`.

**`POST /orders` → 201** — the **full order object** (lesson 7: thin `{id}` DTOs
caused "Đơn #undefined"). Combos come back expanded — header row `unit_price: 0` +
component rows via `combo_ref_id`; item state derives from `qty_served` (no item
`status` field); `name`/`unit_price`/`toppings_snapshot` are frozen copies:

```json
{ "id": "ord9…36", "status": "pending", "source": "qr",
  "table_id": "tb04…36", "table_name": "Bàn 04", "note": "ít hành",
  "total_amount": 103000, "created_at": "2026-07-18T11:02:00Z",
  "items": [
    { "id": "oi1…", "product_id": "p12…36", "name": "Bánh cuốn trứng",
      "unit_price": 35000, "quantity": 2, "qty_served": 0, "combo_ref_id": null,
      "toppings_snapshot": [ { "name": "Nhân thịt", "price": 0 } ] },
    { "id": "oi2…", "combo_id": "cb1…36", "name": "Suất đầy đủ",
      "unit_price": 0, "quantity": 1, "qty_served": 0, "combo_ref_id": null,
      "toppings_snapshot": [] },
    { "id": "oi3…", "product_id": "p12…36", "name": "Bánh cuốn trứng",
      "unit_price": 35000, "quantity": 2, "qty_served": 0, "combo_ref_id": "oi2…",
      "toppings_snapshot": [ { "name": "Nhân thịt", "price": 0 } ] } ] }
```

**Every error, every endpoint — one envelope** (`BE_STATE.md §4` owns the code
table; FE branches only on codes the BE actually emits):

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Số lượng không hợp lệ",
             "details": [ { "field": "items[0].quantity", "issue": "min=1" } ] } }
```

`client.ts` turns the envelope into a thrown `ApiError{status, code, message,
details}` — no component ever sees a raw `Response`. The cart line object never
crosses the wire at all — it's FE-only (§4.2's id scheme).

## 4. FE plan

### 4.1 Route + file map (extends `FE_STATE.md §8` — exact paths)

```
fe/src/app/(customer)/menu/
  page.tsx              # RSC: prefetch products/categories/combos → HydrationBoundary
  loading.tsx           # menu-shaped skeleton (header + rail + card grid)
  error.tsx             # segment retry
  product/[id]/page.tsx # product detail (C-5)
  combo/[id]/page.tsx   # combo detail (combo modal is DEAD in reference — page won)
components/menu/
  MenuHeader.tsx        # 196px photo banner, gradient, serif title — ONE banner only
  MenuCategoryNav.tsx   # THE only sticky element: scroll-spy anchor tabs (not filters)
  SearchBar.tsx         # ≥2-char client-side filter; search mode reshapes the page
  FavouritesRail.tsx    # rail: pinned set + custom suất + fav product/combo cards
  ComboSection.tsx      # "SUẤT" section — combo cards, nhân multi-select (≥1, thịt default)
  CustomSuatSection.tsx # "SUẤT TỰ TẠO" — device-local custom suất, one-tap add
  ProductList.tsx / ProductCard.tsx   # category sections; nhân single-select pill; heart
  OrderSummary.tsx      # on-page cart panel: line editor, canh stepper, rollup table,
                        #   note input (writes cart.orderNote), table pill
  CartBottomBar.tsx     # two floating pills: cart count → scrolls to summary · Thanh toán
  TableConfirmModal.tsx # QR path: confirm → POST /orders (reads cart.orderNote — fixes ref 🔴 bug)
stores/cart.store.ts    # T-phase task (already licensed in FE_STATE §9 rule 7)
stores/favourites.store.ts   # {items[], sets[], suats[]} — all device-local, FE-only
queries/catalog.ts      # useProducts / useCategories / useCombos (keys from keys.ts)
lib/order-payload.ts    # THE one buildOrderItemsPayload() — 3 callers, 1 builder
lib/menu-sections.ts    # buildMenuSections() + isSoupName() — section + canh logic
```

Not ported (dead or disabled in the reference's own final audit): `ToppingModal`,
`ComboModal`, `CategoryTabs`, `RestaurantBanner` (2nd banner — removed by decision),
`MiniCartStrip`, `CartDrawer` (no trigger — cart edits live in OrderSummary),
recovery/add-to-order banners (⏸ owner-pending in the reference; revisit in O phase).

### 4.2 State ownership (instance of `FE_STATE.md §1` — no new kinds)

| Data | Kind | Owner |
|---|---|---|
| products / categories / combos | server | TanStack Query, `staleTime` 5 min (matches Redis TTL) |
| search text | URL (`?q=`) | FE rule 2 — shareable, survives reload |
| cart lines, tableId/Name, activeOrderId, orderNote | client | `cart` store (Zustand, persisted) |
| favourites | client | `favourites` store (persisted, device-local) |
| modal/drawer open | local | `useState` |
| guest session | session | httpOnly cookie + server verify — no auth store |

Cart store contract (adopted from the reference, adapted):
- Line ids encode the nhân variant — `product_<id>_<nhânId|plain>` /
  `combo_<id>_<sortedNhânIds|plain>` / `canh_<productId>_<rau|plain>` — so every
  filling combination is its own row and `addItem` dedups naturally; canh lines are
  stripped from combo overrides by the payload builder so the BE never double-expands.
- `total()` / `itemCount()` are **selectors, never stored** (FE rule 11).
- `partialize`: persist only `{orderNote, activeOrderId, tableId, tableName}` —
  cart items are session-only; versioned storage key with migrate fn.
- After `POST /orders` 201: cache order → `clearCart()` **keeps identity fields** +
  `setActiveOrderId(id)` → `router.replace('/orders')` (reference GAP-2 decision).
  > **Superseded 2026-07-19 (F-19).** Target was `/order/:id` until that route was
  > merged into `/orders`. ⚠ The redirect now depends on `setActiveOrderId(id)` having
  > landed first — the fragility written up in
  > [`../customer_order_detail/customer_order_detail_SUPPLEMENT.md`](../customer_order_detail/customer_order_detail_SUPPLEMENT.md) §1,
  > whose `?id=` fix (`router.replace('/orders?id=<id>')`) also removes that ordering
  > dependency. Decide before the `/orders` FE row opens.

**How state crosses components (same page) — two mechanisms, only two:**

1. **Server data → the Query cache.** `MenuCategoryNav`, `ComboSection`,
   `ProductList` all call the same hooks from `queries/catalog.ts`; identical keys
   dedupe to one fetch. This is also the combo join: the combo payload is ids-only,
   so `ComboSection` joins names/prices from the already-cached products query —
   never a second copy, never props threaded down.
2. **Cart/favourites → the Zustand stores.** Distant components (a card deep in a
   section, `CartBottomBar`, `TableConfirmModal`) communicate only through the
   store — no prop drilling, no context providers, no component-owned copies. The
   reference's 🔴 bug (§6) was exactly a violation of this: the modal kept
   `orderNote` in its own `useState` and dropped what OrderSummary wrote.
   Derived values (`total()`, `itemCount()`) are selectors, so they can't go stale.

Everything else (modal open, expander open) stays `useState` in its owning
component — deliberately **not** shared.

**How state crosses pages:**

- **Menu → product/combo detail:** nothing is passed. The detail page reads the id
  from the route param and hits the same Query cache (prefetched on card hover).
  The cart store is global, so the cart survives navigation for free.
- **Menu → order page:** the handoff after `POST /orders` 201 (above) — the order
  id travels in the **URL**, table identity travels in the **persisted store slice**.
- **RSC → client:** `page.tsx` prefetches the three catalog queries and hands them
  over via `HydrationBoundary`; client components hydrate the same cache (zero
  spinners on first paint, §4.3).

**New state during C-4/C-5?** Run `FE_STATE.md §1`'s decision flow — API → Query;
survives reload/share → URL; form → RHF; >1 distant component → Zustand; otherwise
`useState`. Zustand is the last resort: this page needs exactly the two stores
above, and Query data is never copied into a store (FE rule 1's "never").

### 4.3 Loading strategy (instance of `FE_STATE.md §4–5` — three tiers, never stacked)

**Tier 1 — route (first paint):**

- RSC `page.tsx` prefetches all three catalog queries in parallel →
  `HydrationBoundary` → client hydrates the same cache = **zero-spinner first paint**
  on warm servers; `loading.tsx` streams while the RSC awaits.
- `loading.tsx` skeleton **mirrors the real layout** (header banner + nav strip +
  rail + card grid), never a centered spinner. **Deliberate upgrade over the
  reference**, which shipped a centered route spinner, skeleton-gated only the
  products query, and let failed categories/combos render as silently-empty sections.
- Detail pages (`/menu/product/[id]`, `/menu/combo/[id]`): `prefetchQuery` on card
  hover/touchstart → navigation lands on cached data; each segment has its own
  layout-shaped `loading.tsx` for the cold-URL case.

**Tier 2 — component (query states). Five render branches, all named, all built:**

| Branch | When | UI |
|---|---|---|
| loading | `isPending`, no cached data | in-place section skeletons (no layout shift) |
| error | any catalog query failed | one inline slot: "⚠ Kết nối mạng yếu" + Thử lại (covers all three queries — not per-section silence) |
| empty | query ok, category has no items | dedicated empty state, not a spinner, not an error |
| searching | `?q=` ≥ 2 chars | flat filtered list or "no match" empty state (§4.4 B2) |
| data | default | sectioned menu |

- `staleTime` 5 min matches the Redis TTL — background `isFetching` keeps old data
  visible (no flash, no skeleton re-entry); refetch-on-focus stays ON so a menu left
  open on a table tablet self-heals after an admin 86's a dish.
- Card images: relative `image_path` → `buildImageURL()` (FE rule 14), native
  `loading="lazy"` below the fold, fixed aspect-ratio box so cards never reflow.

**Tier 3 — mutation:** none on this page for the cart — add-to-cart is pure client
state (instant, fly-to-cart animation is the only feedback). The page's first server
write is `POST /orders` (pessimistic, FE rule 4): the confirm button in
TableConfirmModal goes disabled + inline "Đang gửi…" — never a full-page overlay;
on error the modal stays open with the envelope message and the cart untouched.

### 4.4 Page behaviors (the spec the AC will test)

1. **Anchors, not filters:** every section always renders on one scrollable page —
   tab order `Tất cả · SUẤT · SUẤT TỰ TẠO · <categories by sort_order>` (TRỨNG ·
   BÁNH CUỐN · GIÒ). Tab tap smooth-scrolls to the section; scrolling spies the
   active tab (orange text + underline). The nav is the page's only sticky element.
2. **Search mode (≥ 2 chars):** reshapes the page — hides nav/rail/combo sections,
   renders one flat filtered list (client-side) or the empty state; 1 char shows a
   "Nhập ít nhất 2 ký tự" hint; ✕ restores the sectioned menu.
3. **Nhân (filling) pills, inline on cards:** product cards **single-select**
   (first option pre-selected; Bánh Chay/Giò have none) · combo cards
   **multi-select** ("Nhân thịt" default, last one can't be deselected). Each
   combination = its own cart row (§4.2 id scheme). No modal, ever.
4. **Canh is never a card:** soup products are filtered out of lists and search
   (`isSoupName`) and chosen only via the OrderSummary stepper — two rows bound to
   the two real canh products (có rau / không rau).
5. **Canh gate:** zero canh bowls → "Thanh toán" pill dims but still fires → error
   toast + auto-open the cart list + scroll-and-shake the canh box.
6. **Cart surfaces:** on-page `OrderSummary` (line editor, per-combo "Chi tiết"
   expander, "TỔNG SỐ MÓN" rollup table, table pill) + `CartBottomBar`'s two
   floating pills (count badge, no total) — one store, selectors only.
7. **Order note:** typed in OrderSummary → `cart.orderNote` → **read by
   TableConfirmModal at POST time** (the reference's silent-loss bug, designed out);
   starts empty (owner-locked — no pre-fill).
8. **Two checkout paths:** table bound → TableConfirmModal → `POST /orders`
   (`source:'qr'`); no table → `/checkout` (online form, `source:'online'`).
   Append mode: `?add_to_order=<id>` → `POST /orders/:id/items`.
9. **Cards:** price VND via `formatVND()` in the reference's format (`30.000 đ`),
   favourite heart (toggle only, stopPropagation), qty stepper, "Hết" overlay when
   86'd, fly-to-cart animation on add.
10. **VN-first copy:** all strings Vietnamese, exactly the reference's (digest §9
    string set — "Quán Bánh Cuốn", "Tìm món nhanh...", "Thanh toán", …), one
    constants file, no i18n framework yet (OVERALL_PLAN §9.4 default).
11. **Images:** API sends relative `image_path`; FE builds the URL (FE rule 14) —
    the reference defined `buildImageURL` and then never called it; ours is called
    or it doesn't merge.
12. **Worked example everywhere** (docs, seeds, screenshots): Bàn 04 · 103.000 đ ·
    badge 13 (the reference's canonical numbers).

## 5. Task mapping — where this plan lands in TASKS.md

The page ships across existing phase rows (no new phases invented; rows get
restaurant-skinned per `OVERALL_PLAN.md §8`):

| TASKS.md row | This plan's slice | Receipt type |
|---|---|---|
| C-1 (schema+seed) | §3.2 tables + seed incl. combos/₫0 toppings | migrate up/down + seed counts |
| C-2 (BE list/detail) | §3.1 #1–2 + §3.3 cache map + invalidation AC | curl transcripts (hit/miss/DEL) |
| C-3 (BE categories/search → **combos/toppings**) | §3.1 #3 | curl: combos with items |
| C-4 (FE menu page) | §4 everything except cart writes: shell, nav, sections, cards, favourites, search | screenshots (mobile viewport) |
| C-5 (FE product detail) | `/menu/product/[id]` + `/menu/combo/[id]` + prefetch-on-hover | screenshots |
| T-phase cart task | `cart.store.ts` + drawer/bottom-bar/strip + canh gate | screenshots + store unit tests |
| T-phase guest auth | §3.1 #4 cookie mint + rate limit | curl: cookie set, 429 on burst |
| O-phase order create | §3.1 #5–6 + TableConfirmModal + append mode | curl + 2-client screenshot |

Sizing: each row keeps the 1-session/1–2-file/1-AC rule; C-4 is the biggest and may
split (shell+nav+cards / cart surfaces) when it opens — decided at registration.

## 6. Reference defects designed out (menu-page slice of `OVERALL_PLAN.md §6`)

| Ref finding | Our countermeasure |
|---|---|
| 🔴 TableConfirmModal drops `cart.orderNote` (own useState) | modal reads the store; AC includes a note round-trip |
| "Combo"/"Suất"/"SUẤT" 3-way naming drift | one VN copy constant, used by nav + heading |
| Duplicate `RestaurantBanner` stacked under header | one banner in MenuHeader, none in page body |
| `buildImageURL` defined, never called → raw paths shipped | FE rule 14 enforced at SELF-REVIEW |
| BE `""` vs FE `string\|null` type mismatch | DTO-mirror gate 8: FE types come from curl receipts |
| Docs said 3 render branches, code had 5 | §4.3 names all five; loading doc written from code |
| Ghost query params on `GET /products` | no params in v1 (§3.4) |
| Dead components shipped (ToppingModal, ComboModal, CategoryTabs) | never ported (§4.1) |

## 7. Decisions + flags

- ⚠️ **FLAG — customer-surface theme.** The reference DESIGN_PROMPT (visual source of
  truth, owner-locked there) is **dark + warm orange** (`#0b0f17` bg, `#f97316` the
  only bright color, Playfair Display serif title) — but our F-7 design system set
  brand primary `#2B59D9` harness blue with "owner may swap hue before C-4".
  **Plan default: the customer shell adopts the reference's dark/orange as its
  semantic token values** (staff/admin surfaces keep F-7's neutral system); the hue
  swap lands as one token change in the C-4 task. Say so before C-4 if blue should win.
- ✅ **Client-side filtering/search in v1** — a one-restaurant menu is small (~tens
  of items); one cached `products:list` + client filter beats param plumbing (the
  reference sent `?search=` and the BE ignored it — we ship no ghost params).
  💡 Revisit only if catalog size or multi-branch changes the math.
- ✅ **CartDrawer / MiniCartStrip / recovery banners: not built in v1** — the
  reference's own final page disabled all of them (drawer has no trigger); cart
  editing lives in OrderSummary. Re-opened, if ever, by the O-phase recovery task.
- ✅ **Combo payload = ids only**, FE joins from the products cache (reference shape
  kept — it's the no-duplication choice).
- ✅ **Canh gate + ₫0-topping fillings** adopted as business rules of the house menu.
- ✅ **Cookie JWT everywhere** (F-5) — supersedes the reference's memory token; the
  "F5 wipes the session, re-scan the QR" defect disappears structurally.
- ⚠️ **Cart-items persistence**: reference persists only note+activeOrderId (items
  die with the tab). Kept — table sessions are short; full-cart persistence is a
  one-line `partialize` change if the owner wants it.
- ❓ **Append-mode auth window**: adding items to a 1.5 h-old order with a 2 h JWT
  can expire mid-flow; UX for re-mint lands in the O-phase task (default: toast +
  re-scan prompt, per reference tracking behavior).

## 8. Verify plan (per-task receipts, logged in `harness/VERIFICATION.md`)

- BE rows: curl transcripts incl. cache hit/miss headers and post-write DEL proof.
- FE rows: mobile-viewport screenshots per behavior in §4.4 + a note round-trip.
- Cross: one two-client transcript (menu POST → order page SSE) when O/R land.
- This plan itself (F-15): folder exists, MD complete, `plan.html` renders both
  themes — receipt row dated 2026-07-18.

---

*Written by F-15 (2026-07-18) from a 2-agent digest of the reference customer_menu
corpus. Task status lives in `TASKS.md`; rules live in the docs in §2; this file owns
only the menu page's scope, contract, and mapping.*
