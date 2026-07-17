> ⚠️ **DESIGN DRIFT — PANEL 1 below describes the OLD design; pending update to the new design
> ([DESIGN_PROMPT.md](DESIGN_PROMPT.md) / claude_design). Owner will update this + the
> `customer_menu.excalidraw` map later.** Stale items in the PANEL 1 plan:
> - A MenuHeader — `"Quán Bánh Cuốn · Bàn 03"` → new design: photo banner, **no table label** (the
>   "Bàn XX" pill moved into the OrderSummary header).
> - E ComboSection — `"only Tất cả"` → new design: combos **always render** (scroll-spy section, not a filter).
> - J CartBottomBar — `total()/itemCount() [Thanh toán]` → new design: **floating cart pill (count badge
>   only) + "Thanh toán" pill, bottom-right, no total**.
> - Mini MiniCartStrip `[Xem giỏ]` — verify against new design.

Output path: I'll write to docs/system/08_pages/customer/customer_menu/customer_menu.excalidraw (your folder), not the skill's default docs/fe/wireframes/ — and use a clean filename.
Scope: You asked the drawing to capture all info in all 6 md files, not just the page wireframe. So this is a multi-panel knowledge map, not a single mobile mockup.


📋 LAYOUT PLAN — Customer Menu (/menu) — full doc knowledge map
Output: docs/system/08_pages/customer/customer_menu/customer_menu.excalidraw
Device: mobile mockup + supporting architecture panels
Canvas: ~3600 × 2600px, laid out as panels left→right, top→bottom

PANEL 1 — Page Wireframe (mobile, 420px) — from customer_menu.md
  A  MenuHeader        — "Quán Bánh Cuốn · Bàn 03" | useCartStore.tableName
  Mini MiniCartStrip   — "3 món · 105.000đ [Xem giỏ]" (sticky, if cart>0)
  Banner + AddToOrderBanner (only ?add_to_order=)
  B  SearchBar         — local state → products query (≥2 chars)
  C  CategoryTabs      — GET /categories (5m stale)
  D  FavouritesRail    — favStore + products-all + combos (if favs)
  E  ComboSection      — GET /combos enriched (only "Tất cả")
  F  ProductList       — GET /products ⏳ skeleton (the only one)
  I  OrderSummary      — items[] preview + orderNote (canh SHAKE gate)
  J  CartBottomBar     — total()/itemCount() [Thanh toán] (canh dim gate)
  ClientBottomNav (shell)
  Overlays noted: CartDrawer · TableConfirmModal · ToppingModal (Phase 3)

PANEL 2 — Cross-Component Dataflow — from _crosscomponent_dataflow.md
  The 3-layer hub: TanStack Query (server) · useCartStore Zustand (client) · useState (local)
  "no arrow zone→zone" store-as-hub diagram + selectors (total/itemCount derived)
  The 9-step 11:40 order flow (QR seed → combo → nhân topping → canh row → gate → POST)

PANEL 3 — BE View — from customer_menu_be.md
  6 endpoints table (categories/products/combos GET public; orders POST/items/GET authMW)
  Auth model · Redis caching (5m TTL, keys, fail-open) · error behaviour

PANEL 4 — Object Model FE⇄BE⇄DB — from customer_menu.md §Object Model
  Category · Topping · Product · Combo (raw vs enriched) · Cart pointer
  READ/WRITE pipeline arrows

PANEL 5 — Cross-Page Dataflow — from _crosspage_dataflow.md
  in-browser hub (order_cache_<id> · activeOrderId · URL id) vs BE hub (one order row)
  status lifecycle machine · /order/[id] · /tracking · admin floor · cancellation 8a/8b
  durability matrix (▓ survives F5 / ░ dies)

PANEL 6 — Loading States — from _loading.md
  3 layers (route spinner → Suspense → per-query) · only products has skeleton
  main-content 4-state branch · search gating

PANEL 7 — Lunch Rush Scenario — from SCENARIO_LUNCH_RUSH.md
  11:40 order timeline · combo explode (₫0 header + children) · total_amount derived
  peak snapshot 12:04 (8 orders) · canh/nhân mechanism · flags

PANEL 8 — Flags / Known Mismatches (collected from all files)
  product filter params ignored by BE · null→"" convention · combo enrichment degrades ·
  no rate-limit · cancel-anytime DRIFT · stock manual

Modals (Phase 3):
  ToppingModal · CartDrawer · TableConfirmModal
