# Customer Menu (`/menu`) — Folder Index & Doc↔Code Tracker

> **Purpose of this file:** a single map of every doc + asset in this folder — what each one holds,
> what it is the source of truth for, and **whether it currently matches the live code**.
> Use it to decide *which doc to trust* and *which doc is stale* when updating `/menu`.
>
> **Branch traced:** `docs/customer-menu-alignment` ·
> **Last index refresh:** 2026-07-06 (code re-verified against
> `fe/src/app/(shop)/menu/page.tsx` + every file in `fe/src/features/menu/components/` + BE routes).
>
> ⚠️ **The single biggest thing to know:** the two anchor docs — **`customer_menu.md`** (rewritten
> 2026-07-06 with per-component drawings + flags §6.1–§6.8) and **`customer_menu_be.md`** (online-guest
> endpoint + `filling` traced) — are now **aligned with code**. The remaining alignment debt lives in
> the three **flow docs** (cross-component / cross-page / loading), which predate the **FAV-2
> "Suất tự tạo"** work and the **search-mode page reshape**, and in the historical `COMPARISON_*` set.
> See [§3 Alignment audit](#3--alignment-audit-doc-vs-code) and
> [§4 Code-state table](#4--current-doccode-state-what-to-align).

---

## 0 · TL;DR — what is stale right now (read this first)

| Priority | Doc | Why it's stale vs. current code |
|---|---|---|
| ✅ done | `customer_menu.md` | **Rewritten 2026-07-06** — full wireframe + a drawing per component, FAV-2 suất section, search mode, nhân defaults, canh Model A, flags §6.1–§6.8. Trust it. |
| ✅ done | `customer_menu_be.md` | Has `POST /auth/guest/online`, the `source=online` write path and the `filling` / combo-override notes on `POST /orders`. |
| 🔴 P1 | `customer_menu_crosspage_dataflow.md` | Documents the **recovery banner / add-to-order** resume flow as live — those components are **commented out** in `page.tsx` today. Also predates the QR-success redirect change (`/orders?id=<id>`, not `/order/<id>`). |
| 🟡 P2 | `customer_menu_crosscomponent_dataflow.md` | Store-sharing model still right, but predates: `useFavouritesStore.suats` (custom suất) + `resolveSuatToCart` one-tap add, the canh **Model A** rows bound to real products, inline nhân pills (no ToppingModal), and the two-notes split (flag §6.5). |
| 🟡 P2 | `customer_menu_loading.md` | Predates the 4-query fan-out (`categories` / `products-all` / `products,q` / `combos`) and the **search-mode reshape** (nav + rail + combo/suất sections hidden while searching). |
| 🟡 P2 | `COMPARISON_*` docs (EN + VI + VISUAL) | One+ revisions behind — still mark built zones as 🔴 pending. Historical decision logs; do not treat as current code state. |
| 🟢 P3 | `SCENARIO_LUNCH_RUSH.md` | Provenance copy with broken sibling links (see §3-G). Narrative only. |

**Net:** the *page* docs (zones, wireframe, object model, BE view) are current; the **flow docs**
are the remaining alignment debt. Nothing here changes code — it tells you which `.md` to fix.

---

## 1 · Read order (fastest path to "what do I change?")

| # | Read this | To answer |
|---|---|---|
| 1 | [customer_menu.md](customer_menu.md) | Zones, full wireframe + per-component drawings, object model, key interactions, known flags (§6). ✅ current. |
| 2 | [customer_menu_be.md](customer_menu_be.md) | Endpoints + auth + caching the page calls (incl. online-guest). ✅ current. |
| 3 | the dataflow + loading docs | How state moves on-page, across pages, and while loading (⚠️ lag code — see §0). |
| 4 | [../customer_favourites/](../customer_favourites/) | The FavouritesRail / Suất tự tạo target — its own doc-set (builder, sets, suất, save). |
| 5 | [DESIGN_PROMPT.md](DESIGN_PROMPT.md) | What the page is *supposed* to look like (new design = the built spec). |
| 6 | [COMPARISON_DISCUSSION.md](COMPARISON_DISCUSSION.md) | Historical decision log GAP-1…GAP-10 (context, not current code). |

---

## 2 · Every file, described

### Core page doc-set (6-file gold standard)

| File | What it holds | Source of truth for | Aligned w/ code? |
|---|---|---|---|
| [customer_menu.md](customer_menu.md) | Full-page + search-mode ASCII wireframes, **a drawing per component** (header, search, nav, rail, combo/suất/product cards, order summary, pills, both overlays), Zones table, Key Interactions, **Object Model** (Category/Topping/Product/Combo/Cart), flags §6.1–§6.8 | Page zones + FE⇄BE⇄DB object shapes | ✅ **rewritten 2026-07-06** — traced component-by-component |
| [customer_menu_be.md](customer_menu_be.md) | Endpoints traced handler→service→repo→SQL (incl. `POST /auth/guest/online`), auth model, Redis caching, error behaviour, `filling`/combo-override notes | BE behaviour of `/menu` | ✅ current |
| [customer_menu_crosscomponent_dataflow.md](customer_menu_crosscomponent_dataflow.md) | How widgets share `useCartStore` with no prop-drilling; store shape; one-builder payload | On-page (cross-**component**) state flow | 🟡 predates suats/`resolveSuatToCart`, canh Model A, inline nhân pills, two-notes split (§3-C) |
| [customer_menu_crosspage_dataflow.md](customer_menu_crosspage_dataflow.md) | After POST: `order_cache_<id>` + `activeOrderId` + URL id, status lifecycle, SSE/WS, cancellation | Cross-**page** order state (`/menu`→order/admin) | 🔴 describes recovery-banner / add-to-order resume as **live** — **commented out** in code; QR redirect target changed (§3-D) |
| [customer_menu_loading.md](customer_menu_loading.md) | 3 loading layers, queries, main-content state branch, search gating | Loading behaviour | 🟡 predates the 4-query fan-out + search-mode reshape (§3-E) |
| [SCENARIO_LUNCH_RUSH.md](SCENARIO_LUNCH_RUSH.md) | Narrative of one lunch hour using seed data | Animates the object models end-to-end | 🟢 provenance copy; broken sibling links (§3-G) |

### Design + comparison docs (historical — not current code state)

| File | What it holds | Aligned? |
|---|---|---|
| [DESIGN_PROMPT.md](DESIGN_PROMPT.md) | The new-design build prompt (visual system, layout, favourite behaviour, confirm modal) | ✅ = the built spec (predates FAV-2 suất section) |
| [COMPARISON_DOC_VS_CODE_DETAILED.md](COMPARISON_DOC_VS_CODE_DETAILED.md) | Deep 5-area audit, exec summary, action list | 🔴 **lags** — still lists built zones as "pending" (historical) |
| [COMPARISON_DOC_VS_CODE_DETAILED_VI.md](COMPARISON_DOC_VS_CODE_DETAILED_VI.md) | Vietnamese mirror of the above | 🔴 same staleness as its EN twin |
| [COMPARISON_VISUAL_MOCKUP_VI.md](COMPARISON_VISUAL_MOCKUP_VI.md) | Per-zone ① doc ② real code ASCII ③ fix + screenshots | 🟡 several zone headings still tagged 🔴 "chờ rebuild" though built |
| [COMPARISON_DISCUSSION.md](COMPARISON_DISCUSSION.md) | Decision log GAP-1…GAP-10: proposal → decision → status | 🟡 historical — the GAP set predates the online-guest + favourites/FAV-2 work |
| [STRUCTURE.md](STRUCTURE.md) · [FINAL_PLAN.md](FINAL_PLAN.md) · [ALIGNMENT_VS_DESIGN_PROMPT.md](ALIGNMENT_VS_DESIGN_PROMPT.md) | Planning / structure notes from the rebuild effort | 🟡 historical planning docs |

### Assets (not docs)

| Asset | What it is |
|---|---|
| `customer_menu.excalidraw` | Multi-panel doc knowledge map (wireframe + dataflow + BE + object model + loading + scenario). `excalidraw.md` is its plan. `.bak` = previous version. ⚠️ predates online-guest + favourites + FAV-2. |
| `excalidraw.md` | Plan/notes for the excalidraw map — self-describes as old-design / pending update. |
| `claude_design/` | The new-design HTML+Tailwind artifact + `header-example.jpg`. **Visual source of truth.** |
| `Untitled-2026-05-03-2145.png` | Stray 14 MB image — provenance unclear (cleanup candidate). |

---

## 3 · Alignment audit (doc vs code)

> Concrete inconsistencies to resolve so the folder matches code.
> Severity: 🔴 contradicts current code · 🟡 incomplete / lags · 🟢 cosmetic / provenance · ✅ resolved.

**A — ✅ RESOLVED (2026-07-06): `customer_menu.md` fully rewritten from code.**
Old issues (stale "pending rebuild" banner, wrong `CategoryTabs` name, "PLANNED" online ordering,
thin zone D) are gone. The doc now also carries the drift that surfaced in this pass: FAV-2
"Suất tự tạo" section, search-mode reshape, combo nhân default = "Nhân thịt" only, inline nhân
pills (no modals), canh Model A, QR redirect `/orders?id=<id>`, and flags §6.5–§6.8.

**B — ✅ RESOLVED: `customer_menu_be.md` covers the online-guest path.**
`POST /auth/guest/online` (endpoint 4) is in the table with the `source='online'` write path and
the `filling` / combo-override notes on `POST /orders` (OC epic, migration 016).

**C — 🟡 `crosscomponent_dataflow.md` predates four cart mechanics.**
The store-sharing model is still right, but it predates: **(1)** canh **Model A** — stepper rows
bound to the two real canh products (`canh_<productId>_rau|plain`, resolved by name from
`products-all`); **(2)** **favourite-set AND custom-suất → cart** merges (`favouriteSetToCartItems`,
`resolveSuatToCart` — suất canh lines ADD onto stepper counts); **(3)** inline nhân pills writing
nhân into `CartItem.toppings` + the nhân-encoded cart ids (no ToppingModal/ComboModal);
**(4)** the **two-notes split** — `OrderSummary.orderNote` (persisted) vs `TableConfirmModal`'s own
local note, only the latter is sent on the QR path (customer_menu.md flag §6.5). → Add all four.

**D — 🔴 `crosspage_dataflow.md` documents disabled features as live.**
In `page.tsx` the **`ActiveOrderRecoveryBanner`**, **`AddToOrderBanner`**, and **`MiniCartStrip`**
are all **commented out** — and with MiniCartStrip gone the **CartDrawer has no trigger at all**
(customer_menu.md flag §6.6). The doc still narrates the recovery / add-to-order resume flow as the
live experience. Also stale: QR success now lands on **`/orders?id=<id>`** (order-list page with id
param), not `/order/<id>`. → Mark disabled (or restore in code — owner decision), note
`?add_to_order=` is still parsed, fix the redirect target.

**E — 🟡 `loading.md` query fan-out + search mode.**
`page.tsx` runs four catalog queries — `categories`, `products-all` (combo-name lookup +
FavouritesRail + canh resolution), `products` (key `['products', searchQuery]`, enabled at
`length===0 || length>=2`), `combos`. Searching (≥2 chars) also **reshapes the page**: nav, rail
and combo/suất sections hide; a flat list (or EmptyState) renders. → Name `products-all`, the
`enabled` gate, and the search-mode branch.

**F — ✅ RESOLVED: FavouritesRail + Suất tự tạo documented with cross-links.**
Zone D now covers all four rail card types (pinned set / suất / fav product / fav combo) and the
new zone E2 covers `CustomSuatSection`; both cross-link deep coverage to
[`../customer_favourites/`](../customer_favourites/) instead of duplicating.

**G — 🟢 `SCENARIO_LUNCH_RUSH.md` provenance + broken links.** It is a copy of the global
`02_spec/object/SCENARIO_LUNCH_RUSH.md`; its links to `MENU_CATALOG.md`, `OBJECT_MODEL_ORDER.md`, etc.
resolve to siblings that don't exist in this folder. → Keep one copy and fix links, or replace with a
pointer.

---

## 4 · Current doc↔code state (what to align)

> Verified against live `fe/src/app/(shop)/menu/page.tsx`, every file in
> `fe/src/features/menu/components/`, and BE routes on **2026-07-06**. This is the authoritative
> "what changed since the docs were written" table.

| Area | Current code state (verified) | Doc that needs the edit |
|---|---|---|
| **Online-guest ordering** | ✅ built — `POST /auth/guest/online` mints a guest token on no-table visits; no-table checkout routes to `/checkout` and posts a `source=online` order | ✅ done in `customer_menu.md` + `customer_menu_be.md` |
| **FAV-2 "Suất tự tạo"** | ✅ built — `useFavouritesStore.suats`; own menu section (`CustomSuatSection`) + tab + rail cards; one-tap add via `resolveSuatToCart` (món-lẻ + canh rows, FE-only, no combos write) | ✅ done in `customer_menu.md`; still missing in `crosscomponent_dataflow.md` + `loading.md` (section/tab appears without any fetch) |
| **Search-mode reshape** | ✅ built — ≥2 chars hides nav + rail + combo/suất sections, flat list or EmptyState; 1 char = hint + frozen query | ✅ done in `customer_menu.md`; add to `loading.md` |
| **Nhân pills, no modals** | ✅ built — product cards single-select (first pre-selected), combo cards multi-select default **"Nhân thịt" only** (≥1 enforced); cart ids encode the nhân choice; `ToppingModal`/`ComboModal` dead | ✅ done in `customer_menu.md` (flags §6.8); add to `crosscomponent_dataflow.md` |
| **Recovery / add-to-order / mini-cart banners** | 🚫 commented out in `page.tsx`; `?add_to_order=` still parsed; **CartDrawer consequently unreachable** (flag §6.6) | `customer_menu_crosspage_dataflow.md` |
| **QR submit result** | ✅ `POST /orders` (modal-local note — flag §6.5) → `order_cache_<id>` → `table_busy` toast path → `router.replace('/orders?id=<id>')` | ✅ done in `customer_menu.md`; fix redirect + note in `crosspage_dataflow.md` |
| **Canh (soup) = stepper-only, Model A** | ✅ built — hidden from cards/search (`isSoupName`); stepper rows bound to the two real canh products; `canhMissing` gate dims pill + shakes summary | ✅ done in `customer_menu.md`; add Model A to `crosscomponent_dataflow.md` |
| **Scroll-spy nav** | ✅ built — `MenuCategoryNav` + `MenuSections`/`buildMenuSections` (170px spy line, rAF, bottom pin); `CategoryTabs` unused | ✅ done in `customer_menu.md` |
| **FavouritesRail** | ✅ expanded — pinned sets + suất + fav items; one-tap add; links to `/menu/favourites/**` | ✅ done in `customer_menu.md` (zone D) + cross-link |
| **Order payload builder** | ✅ single `fe/src/lib/order-payload.ts` (filling · combo overrides · canh split) used by menu/checkout/add-to-order | already noted — keep |
| **`GET /products` ignores `search`** | 🟡 unchanged — zero `c.Query` calls in `ListProducts`; FE no longer sends `category_id` at all | flagged in `customer_menu.md` §6.1 + `be.md` — keep |
| **Dead code** | 🟠 `ToppingModal.tsx`, `ComboModal.tsx`, `DrinkCustomize.tsx`, `OrderNote.tsx`, `CategoryTabs.tsx`, `MiniCartStrip.tsx` present but unused/unreachable (owner deletes later — don't touch) | note only — do not document as live |

**Net for the next doc-alignment session:** fix the one 🔴 item (`crosspage_dataflow.md` — disabled
banners + redirect), then the two 🟡 flow gaps (`crosscomponent_dataflow.md`, `loading.md`).
The COMPARISON set stays historical. No code changes required — though flags §6.5 (two notes) and
§6.6 (CartDrawer unreachable) are owner decisions waiting to happen.

---

## 5 · Source-of-truth map (one fact, one home)

| Fact | Home |
|---|---|
| Visual / design intent | `DESIGN_PROMPT.md` + `claude_design/…/Menu Ban Cuon.dc.html` |
| Page zones + per-component drawings + object model + known flags | `customer_menu.md` |
| BE endpoints / auth / cache | `customer_menu_be.md` |
| On-page state flow | `customer_menu_crosscomponent_dataflow.md` |
| Cross-page order state | `customer_menu_crosspage_dataflow.md` |
| Loading behaviour | `customer_menu_loading.md` |
| **Favourites builder / sets / suất / save** | [`../customer_favourites/`](../customer_favourites/) (own doc-set) |
| Online-guest auth | `be` route `POST /auth/guest/online` (`authH.OnlineGuest`) |
| Order write pipeline (full) | `../../02_spec/object/OBJECT_MODEL_ORDER.md` |
| Business rules (canh, combo, cancel) | `../../07_business_logic/LOGIC_FE.md` · `LOGIC_BE.md` |
| Historical gap decisions | `COMPARISON_DISCUSSION.md` (context only) |
