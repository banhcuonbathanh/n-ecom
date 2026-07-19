# Customer Favourites Suite — Consolidated FE + BE Build Plan (F-24)

> **TL;DR:** One plan, one folder, for the customer-facing **favourites suite** — three
> small routes (`/menu/favourites` · `/menu/favourites/save` · `/menu/favourites/sets`)
> that let a returning guest re-order "the usual" without hunting the menu. The whole
> suite is **BE-read-only**: it calls exactly the **two cached catalog GETs the menu page
> already owns** (`GET /products`, `GET /combos`) to resolve hearted ids/sets into cards,
> and writes **nothing** to the backend — favourites and saved sets live in
> `favourites.store.ts` (localStorage). Because the contract is a strict subset of the
> menu's, this plan **cross-links** the menu plan instead of re-deriving it (F-15).
> Visual companions: [`customer_favourites_plan.html`](customer_favourites_plan.html) (the plan),
> [`customer_favourites_how-it-works.html`](customer_favourites_how-it-works.html) (runtime),
> [`customer_favourites_mockup-1.html`](customer_favourites_mockup-1.html) (the UI).
> Source: `reference/docs/system/08_pages/customer/customer_favourites/` (10 docs incl.
> `customer_favourites.md`, `_be.md`, `_loading.md`, `_crosspage_dataflow.md`,
> `SCENARIO_FAVOURITES.md`, `DESIGN_PROMPT.md`; digested 2026-07-19) reconciled with the
> menu plan and the F-5/F-8/F-11/F-12/F-16 rule sets. **One fact one home:** this file owns
> the favourites suite's scope, contract, and task mapping — rules stay in their owning docs.

---

## 1. What the page is

A **re-order hub** for the dine-in bánh cuốn app. The guest never *creates* a favourite
here — the heart is toggled on `/menu` (product card, combo card, favourites rail) and
lands in the persisted store. The suite *reads that back* and turns it into a filled cart.

Three routes, one persisted store, one shared `(customer)` shell (the fixed 5-tab
`ClientBottomNav`, "Yêu Thích" active):

- **`/menu/favourites`** — the hearted list (products + combos, mixed), filter tabs
  (Tất cả / Món lẻ / Combo), per-card `[+ Giỏ]`, a bulk `Thêm tất cả vào giỏ` footer.
- **`/menu/favourites/save`** — a RHF+Zod form: name the current favourites as a set.
- **`/menu/favourites/sets`** — saved sets; `Thêm vào giỏ` re-applies a whole set in one
  tap (skipping items no longer on the menu); rename / delete.

**Core loop:** open Favourites → (auto-prune anything 86'd) → adjust qty / filter →
bulk-add or apply a set → cart badge bumps → check out via the **menu's** `/menu`
TableConfirmModal / `/checkout`. This suite is a **bridge**: it consumes heart toggles
from `/menu` and produces a cart for the order pipeline — it owns neither endpoint of
that journey.

In/out links: in from `/menu` (heart toggles + `[Yêu Thích]` nav tab); within-suite
list ⇄ save ⇄ sets (no params — each route re-reads the store); out to the **cart on
`/menu`** (hand-off target) → `/checkout` / `POST /orders` (owned by the menu plan).

## 2. Alignment — what governs this suite (read, don't restate)

| Concern | Owning doc |
|---|---|
| The two catalog endpoints + their cache/invalidation | **`plans/customer_menu/customer_menu_PLAN.md §3`** (this suite is a read-only subset) |
| Stack + versions | `harness/PLAN.md §Stack` |
| BE layering, tx policy, error envelope | `harness/BE_STATE.md` |
| FE state kinds, cache map, loading tiers, hard rules 1–14 | `harness/FE_STATE.md` |
| Favourites/cart store shapes + storage keys | `favourites.store.ts` / `cart.store.ts` (declared in the menu plan §4.1; shapes below in §4.2) |
| Design tokens + commerce components | `harness/diagrams/design-system.html` (F-7) |
| Customer shell palette (dark + orange) | menu plan §7 FLAG (the shell hex is locked there) |
| Schema (catalog tables) | `harness/DB_SCHEMA.md §4.1` |
| Product scope, phase roadmap | `harness/OVERALL_PLAN.md` (F-9) |

Reference docs are the **what**; the harness rules above are the **how**. Where they
conflict, the harness wins. **The single most important alignment here: the favourites
suite adds no new BE surface** — every endpoint, cache key, and wire shape it uses is
already owned by the menu plan; this plan only *points* at them.

## 3. BE plan

### 3.1 Endpoints the suite consumes (all under `/api/v1`)

The suite is a **read-only catalog consumer** — two public GETs, zero writes:

| # | Route | Auth | Phase/Task | Behavior |
|---|---|---|---|---|
| 1 | `GET /products` | public | C-2 (already built) | Redis `products:list`, 5-min TTL; only `is_available=1`, soft-delete filtered; toppings pre-joined. **Identical call the menu page makes.** |
| 2 | `GET /combos` | public | C-3 (already built) | Redis `combos:list`, 5-min TTL; `combo_items:[{id,product_id,quantity}]` — **ids only**; FE joins names/prices from the products query. |

There is **no favourites endpoint** — no `POST /favourites`, no "save to account". The
full trace (menu plan §3.1) proves both routes are bare `.GET("")` on their groups with
no middleware; a token-less guest can open the whole suite.

### 3.2 Schema this suite depends on

**None new.** It reads the same catalog tables the menu plan's C-1 migration already
covers (`products`, `toppings`, `product_toppings`, `combos`, `combo_items`) — full
column specs in `harness/DB_SCHEMA.md §4.1`. Favourites + saved sets are **not persisted
server-side**: there is no `favourites` table and this plan proposes none (see §7). They
live only in the browser's localStorage (`favourites.store.ts`).

### 3.3 Cache map (nothing to invalidate here)

The suite **never writes**, so it **never invalidates**. It piggybacks entirely on the
menu's `products:list` / `combos:list` keys (invalidated only by staff catalog mutations —
menu plan §3.3). Worst-case staleness for a favourite's name / price / **availability** is
~10 min end-to-end (5-min Redis TTL + 5-min TanStack `staleTime`). Cache failures are
non-fatal (fail-open to MySQL); the suite survives a Redis outage.

### 3.4 Not adopted from the reference

- ❌ **No "empty ≡ loading ≡ error" conflation** — the reference collapsed all three into
  one blank EmptyState because `resolvedItems` is `[]` while queries are in flight (ref
  `_loading.md` Flags 1–2). We **design this out** (§4.3): distinct loading / error /
  empty branches, gated on `isPending` / `isError`, not on `resolvedItems.length`.
- ❌ **No footer hidden behind the fixed bottom nav** — a real bug in the reference build.
  Ours reserves ~72px bottom padding so the CTA always clears `ClientBottomNav` (§4.4 B8).
- ❌ **No save-empty-set escape hatch** — the reference gated its save button only on the
  name field (`isValid`), so a user could save a set before queries resolved and capture
  an empty snapshot (ref `_loading.md` Flag 3). Ours also gates on `resolvedItems.length > 0`.
- ❌ **No server-side favourites persistence** — kept device-local (reference behavior;
  §7 flag on the account-sync option).

### 3.5 Wire shapes

**Identical to the menu plan §3.5** — the suite consumes `GET /products` → 200 and
`GET /combos` → 200 in exactly the shapes frozen there (products with pre-joined ₫0
toppings; combos with `combo_items` ids only). **Not restated here — one shape, one home**
(menu plan §3.5). The only favourites-specific data structures are **FE-only, never on the
wire** — the store shapes in §4.2.

## 4. FE plan

### 4.1 Route + file map (extends the menu plan §4.1)

```
fe/src/app/(customer)/menu/favourites/
  page.tsx              # RSC shell → the hearted list (client island reads the store)
  loading.tsx           # list-shaped skeleton (filter tabs + card rows) — NOT a bare spinner
  error.tsx             # segment retry
  save/page.tsx         # RHF+Zod "name this set" form
  save/loading.tsx      # form-shaped skeleton
  sets/page.tsx         # saved-sets list
  sets/loading.tsx      # set-card skeleton
components/favourites/
  FavouritesTopNav.tsx    # [←] · "❤ Yêu Thích" · 🛒 count badge · [Lưu bộ]
  FavouriteFilterTabs.tsx # Tất cả (n) / Món lẻ (n) / Combo (n) — local tab state
  FavouriteItemCard.tsx   # thumb · type badge · name · price · filled-heart (un-fav) · qty stepper · [+ Giỏ]
  FavouritesFooter.tsx    # live-total row + primary "🛒 Thêm tất cả vào giỏ" CTA (NEW: total row)
  CanhQuickAdd.tsx        # NEW (deferred): "Canh — thêm nhanh" two 0₫ rows (§7)
  FavouritesEmptyState.tsx# outline heart + "Chưa có món yêu thích nào" + "Xem Menu"
  SetCard.tsx             # 📋 name · ≤5 component lines · "n món · <total>" · Áp dụng / ✏ / 🗑
  FavouritesSummaryList.tsx # save page: "Tóm tắt:" resolved rows + Tổng
  SaveSetModal.tsx        # shared overlay: name input + summary + Huỷ / Lưu
stores/favourites.store.ts  # {items[], sets[], suats[]} — ALL device-local, FE-only (menu plan §4.1)
queries/catalog.ts          # useProducts / useCombos — THE SAME hooks the menu uses (no new keys)
lib/favourites-resolve.ts   # resolveFavourites() + resolveSet() — join store ids → catalog, drop-if-absent
lib/cart-from-favourites.ts # buildCartItemsFromFavourites() → feeds the ONE cart store (menu plan §4.2)
```

`favourites.store.ts` was already licensed in the menu plan §4.1 (`{items[], sets[],
suats[]}`); this plan is where its `sets[]` and `suats[]` slices are actually specified
(§4.2). No new query keys — `queries/catalog.ts` is shared with the menu, so navigating
`/menu → /menu/favourites` within 5 min is a **cache hit, zero spinner**.

**Not ported / deferred** (reference's own gaps or NEW-in-design-only): the reference's
two extra footer buttons ("Lưu thành set" / "Xem set đã lưu" inline) are dropped — saving
is reached only via the TopNav `[Lưu bộ]` (DESIGN_PROMPT decision). `CanhQuickAdd`, the
live-total row, the "Tự tạo suất" builder, and 📌 "Ghim lên Menu" pinning are **NEW
proposals** in the DESIGN_PROMPT, not in today's code — each gets a flagged/deferred row
(§5 / §7), not v1 scope.

### 4.2 State ownership (instance of `FE_STATE.md §1` — no new kinds)

| Data | Kind | Owner |
|---|---|---|
| products / combos | server | TanStack Query, `staleTime` 5 min (shared keys w/ menu) |
| filter tab (Tất cả/Món/Combo) | local | `useState` in the list page |
| favourites `items[]` + saved `sets[]` | client | `favourites` store (Zustand, **persisted** localStorage `favourites`) |
| set-name form | form | RHF + Zod (`name: min 1`) |
| cart lines (hand-off target) | client | `cart` store (menu plan §4.2 — **items session-only**) |
| save modal open | local | `useState` |
| guest session | session | httpOnly cookie — **never exercised here** (read-only page) |

**Favourites store contract** (the FE-only shapes — never cross the wire):

```ts
type FavouriteItem = { id: string; type: 'product' | 'combo'; qty: number; toppingIds: string[] }
type FavouriteSet  = { id: string; name: string; items: FavouriteItem[]; createdAt: number }
// store: { items: FavouriteItem[]; sets: FavouriteSet[]; suats: CustomSuat[] }
//   toggleFav(id, type) · updateQty(id, qty) · removeItem(id)
//   addSet(name) snapshots items[] → sets[] · renameSet(id,name) · removeSet(id)
```

- **Adopted-with-a-flag:** `toggleFav` stores `{qty:1, toppingIds:[]}` regardless of what
  the guest configured on the menu card — the topping/qty selection is **dropped at toggle
  time** (ref `_crosspage_dataflow.md` Flag). Kept for v1 (a favourite is "the dish", not
  "the exact configured line"); qty is editable here afterward. Revisit-flag in §7.
- `total()` / `itemCount()` / filtered counts are **selectors, never stored** (FE rule 11).
- `partialize`: persist the **whole `{items, sets, suats}` tree** (survives browser
  restart) — unlike the cart, whose `items[]` are session-only. This asymmetry is the
  point: a saved set outlives the tab; the cart it fills does not (re-apply after restart).

**How state crosses — two mechanisms, only two** (same discipline as the menu plan §4.2):

1. **Server data → the Query cache.** All three routes call the same `useProducts` /
   `useCombos` from `queries/catalog.ts`; identical keys dedupe to one fetch and reuse the
   menu's warm cache. The combo→product-name join happens FE-side against the products
   cache (combos are ids-only) — never a second copy.
2. **Favourites/cart → the Zustand stores.** The three routes share the **one persisted
   favourites store** — within-suite navigation needs **no params**, each page re-reads on
   mount. The hand-off to checkout writes into the **one cart store** (additive — "add all"
   / "apply set" append, they don't replace). No prop drilling, no context.

**How state crosses pages:** `/menu` heart → persisted store → suite reads it back;
suite → cart store → `/menu` TableConfirmModal / `/checkout` drains it into `POST /orders`
(owned by the menu plan). Nothing travels in the URL between these routes.

### 4.3 Loading strategy (instance of `FE_STATE.md §4–5` — the reference's key defect fixed)

The reference shipped **no skeleton, no spinner, no error banner** on any of the three
pages; `resolvedItems` is `[]` while queries fly, so cold-load, genuinely-empty, and
fetch-failed were **visually identical** (ref `_loading.md` Flags 1–2). We fix it:

**Tier 1 — route:** each route has a **layout-shaped `loading.tsx`** (filter-tabs + card
rows for the list; form skeleton for save; set-card rows for sets) — never the reference's
bare centered `(shop)/loading.tsx` spinner.

**Tier 2 — component. Four named branches, gated on query state, not on `resolvedItems`:**

| Branch | When | UI |
|---|---|---|
| loading | `isPending` (no cached data) | in-place skeleton rows (no layout shift) |
| error | either catalog query `isError` | inline "⚠ Kết nối mạng yếu" + Thử lại — **not** a blank empty state |
| empty | queries ok **and** `resolvedItems.length === 0` | `FavouritesEmptyState` ("Chưa có món yêu thích nào" + Xem Menu) |
| data | queries ok, items present | filter tabs + card list |

- Because keys are shared with the menu, the common path (`/menu → favourites` within
  5 min) is a **cache hit → data branch on first render**, zero spinner (ref confirms this
  is effectively instant). The named loading/error branches matter only on a **cold direct
  open** of `/menu/favourites`.
- **Stale auto-prune** stays: a `useEffect` gated on `productsLoaded && combosLoaded`
  removes any favourite/set item whose id is absent from the (refreshed) catalog and fires
  the toast *"Một số món không còn phục vụ đã được xoá khỏi danh sách yêu thích."* The
  guard prevents premature pruning while only one query has resolved.

**Tier 3 — mutation:** none reaches the BE. Un-favourite, qty change, save-set, and
add-to-cart are all pure client-store writes (instant; the only feedback is the card
disappearing / the cart badge bumping / a `✓ Đã thêm` flash). The first server write in
the whole journey is `POST /orders`, which happens on `/menu` — **not this suite**.

### 4.4 Page behaviors (the spec the AC will test)

1. **Read-only, local-first:** the suite issues only `GET /products` + `GET /combos` and
   **zero writes**; every action (un-heart, qty, save set, add-to-cart) is a local store
   mutation. Opening it with no guest token still renders resolved cards.
2. **Resolve + auto-prune:** store `items[]` ids are joined against the catalog; any id
   absent from the payload is dropped and a single toast fires (after **both** queries
   settle). Combo component names resolve from the **products** list; a missing referenced
   product shows `Món không rõ tên` (cosmetic, not an error).
3. **Filter tabs:** Tất cả / Món lẻ / Combo, each with a **live count**; active = solid
   orange; filters the list client-side. Counts are selectors over `resolvedItems`.
4. **Card = the remove + re-add control:** the **filled orange heart un-favourites** and
   removes the card (it is *not* add-to-cart, stopPropagation); a qty stepper (default 1)
   edits the line; `[+ Giỏ]` adds **that** card to the cart.
5. **Bulk add:** footer `🛒 Thêm tất cả vào giỏ` turns every resolved favourite into a
   `CartItem` and pushes it **additively** (existing cart survives). Cart badge updates.
6. **Save a set:** TopNav `[Lưu bộ]` → `/menu/favourites/save`; RHF+Zod (`name` min 1)
   **and** `resolvedItems.length > 0` gate the submit; `addSet(name)` snapshots `items[]`
   into the **persisted** `sets[]` → routes to `/menu/favourites/sets`.
7. **Apply / manage a set:** `SetCard` `🛒 Áp dụng` resolves the snapshot against the live
   catalog (silently skipping removed items) and adds all to cart; `✏` renames inline;
   `🗑` deletes. Empty sets page → dedicated empty state (gated on `sets.length`, not query).
8. **Footer clears the shell nav:** the CTA / live-total row sit **above** the fixed 5-tab
   `ClientBottomNav` (~72px bottom padding) — never hidden behind it (reference bug fixed).
9. **Distinct load/empty/error** (§4.3): the three are never conflated — a network failure
   shows the error branch, not the empty state.
10. **VN-first copy:** all strings Vietnamese, exactly the reference's ("Yêu Thích",
    "Thêm tất cả vào giỏ", "Bộ đã lưu", "Nhấn ♥ trên món ăn bất kỳ để thêm", …); one
    constants file, no i18n framework yet.
11. **Currency:** `formatVND()` → `35.000 đ` (dot thousands, lowercase đ, space); zero-price
    items show `0 đ`. Same helper as the menu.
12. **Worked example everywhere** (docs, seeds, screenshots): **3 favourites** — Bánh Cuốn
    Thịt (Món lẻ, 4.000 đ) · Bánh Trứng Vàng (Món lẻ, 9.000 đ) · Combo Đầy Đặn (Combo,
    42.000 đ) — and **2 saved sets** — "📋 Sáng thứ 7" (3 món · 88.000 đ) · "📋 Cả nhà"
    (5 món · 152.000 đ). These numbers stay consistent across every doc and screenshot.

## 5. Task mapping — where this suite lands in TASKS.md

The suite ships across existing customer-phase FE rows (no new phases invented). Its BE
contract is **already delivered** by the menu's C-2/C-3 rows — it adds no BE row.

| TASKS.md row | This plan's slice | Receipt type |
|---|---|---|
| C-2 / C-3 (BE catalog reads) | §3.1 #1–2 — **already built**; suite only consumes | (menu plan's curl receipts cover it) |
| T-phase cart task | `cart.store.ts` — the hand-off target (menu plan §4.2) | (menu plan's store tests cover it) |
| **C-6 (FE favourites suite)** — *new row, registered when it opens* | §4 v1: list (resolve + prune + filter + heart-remove + qty + [+ Giỏ] + bulk add), save form, sets (apply/rename/delete), 4 loading branches | mobile-viewport screenshots per §4.4 behavior + a resolve/prune round-trip |
| **C-7 (FE favourites NEW features)** — *deferred, owner-gated* | canh quick-add block · live-total row · "Tự tạo suất" builder (`suats[]` + per-egg nhân + free-text note) · 📌 Ghim lên Menu pinning | screenshots (built only after owner keeps the §7 proposals) |

Sizing: C-6 keeps the 1-session/1–2-file/1-AC rule and may split (list / save+sets) at
registration. C-7 is explicitly **out of v1** until the owner rules on the §7 proposals.

## 6. Reference defects designed out

| Ref finding | Our countermeasure |
|---|---|
| Empty ≡ loading ≡ error — all render the blank EmptyState (`_loading.md` F1) | four named branches gated on `isPending`/`isError`, not `resolvedItems.length` (§4.3) |
| Footer CTA hidden behind the fixed bottom nav (`DESIGN_PROMPT` "real bug") | ~72px bottom padding; AC checks the CTA clears `ClientBottomNav` (§4.4 B8) |
| Save button gated only on name → can save an empty set (`_loading.md` F3) | submit also gated on `resolvedItems.length > 0` (§3.4, §4.4 B6) |
| `SetCard` shows "n món · 0đ" stub while loading (`_loading.md` F5) | set-card skeleton in `sets/loading.tsx`; count+price appear together once resolved |
| Network failure is silent (indistinguishable from empty) (`_loading.md` F1) | explicit error branch + Thử lại (§4.3) |
| Two redundant footer buttons + 3-way naming | one `[Lưu bộ]` in TopNav; one VN copy constant (§4.1) |
| toppings/qty dropped at toggle time (`_crosspage_dataflow.md` Flag) | kept for v1 (favourite = the dish) but **documented** as a §7 decision, not a silent gap |

## 7. Decisions + flags

- ✅ **BE-read-only, subset of the menu contract** — no favourites endpoint, no new cache
  keys, no schema. The plan cross-links the menu plan §3 rather than restating it.
- ✅ **Favourites persisted, cart session-only** — the deliberate asymmetry (a set outlives
  the tab; the cart it fills does not). Adopted from the reference.
- ✅ **Read-only ⇒ loading/error branches are the whole FE story** — the reference's blank
  states are the one real thing to fix; §4.3 is this plan's highest-value slice.
- ⚠️ **FLAG — favourites are device-local, not account-synced.** Clearing storage or
  switching device loses them; there is no "save favourites to my account" (no accounts in
  v1). If the owner wants cross-device favourites, that needs a `favourites` table + a
  `POST/GET /favourites` pair + auth — a **new BE surface**, out of this plan's read-only
  scope. Say so before C-6 if account-sync should be in v1.
- ⚠️ **FLAG — `toggleFav` drops toppings/qty.** A favourite is always `{qty:1,
  toppingIds:[]}`, so re-adding it loses the exact filling the guest picked on the menu.
  Kept for v1 (simplest, matches reference); one-line fix if the owner wants faithful
  re-add (carry the configured line into the favourite).
- 💡 **SUGGESTION — the DESIGN_PROMPT's NEW features are a genuine upgrade but out of v1
  scope.** Canh quick-add, live-total row, the **"Tự tạo suất" custom-combo builder**
  (`suats[]` + per-egg nhân pills + a free-text kitchen note, **no new DB field**), and
  📌 **"Ghim lên Menu"** pinning are all FE-only and would make the hub much stickier.
  They're captured as the deferred **C-7** row (§5); recommend building them **after** the
  v1 suite ships and the owner eyeballs `mockup-1.html`. The store already reserves a
  `suats[]` slice for the builder.
- ❓ **CLARIFY — customer shell palette.** Same open question as the menu plan §7: the
  mockup uses the reference dark/orange shell; if the owner swaps to F-7 harness blue
  before C-4, this suite inherits that one token change (no rework here).

## 8. Verify plan (per-task receipts, logged in `harness/VERIFICATION.md`)

- **This plan (F-24):** folder holds the 4 slug-prefixed docs; `.md` is the sole source of
  truth (each HTML footer says so); both HTML themes render (light + dark, toggle wins);
  no horizontal page scroll — receipt row dated 2026-07-19.
- **C-6 (when built):** mobile-viewport screenshots per §4.4 behavior — the resolve+prune
  round-trip (heart on menu → appears here → 86 the dish → auto-pruned with toast), the
  four loading branches (cold open, error via offline, empty, data), the footer clearing
  the bottom nav, a save→apply set cycle. No curl rows — the suite adds no BE surface (the
  menu plan's C-2/C-3 curl transcripts already prove the two GETs).
- **C-7 (if built):** screenshots of the NEW features after the owner keeps the §7 proposals.

---

*Written by F-24 (2026-07-19) from a digest of the reference customer_favourites corpus,
reconciled with the F-15 menu plan (shared catalog contract) and the F-5/F-8/F-16 rules.
Task status lives in `TASKS.md`; rules live in the docs in §2; the BE contract lives in the
menu plan §3; this file owns only the favourites suite's scope, mapping, and FE-only shapes.*
