# Customer Menu — Detailed Doc vs. Code Comparison (5 Areas)

> **Scope:** deep audit of the `customer_menu` doc-set against the real `/menu` code across 5 axes:
> (1) component visuals · (2) cross-component Zustand dataflow · (3) cross-page Zustand dataflow ·
> (4) loading behaviour · (5) FE⇄BE data model. **Read-only — no code or docs changed.**
> Produced by 5 parallel Sonnet agents; every 🔴 was re-verified by hand (file:line cited inline).
> Branch audited: `docs/customer-menu-alignment`. Date: 2026-06-25.

> ⚠️ **DIRECTION OF DRIFT HAS FLIPPED (2026-06-25).** The prior run (2026-06-20/23) treated
> `DESIGN_PROMPT.md` as a *future* design the code had not built yet ("8 rebuild gaps"). **That is no
> longer true: the code has been rebuilt** — MenuHeader is a photo banner, scroll-spy nav
> (`MenuCategoryNav` + `MenuSections`) replaced filter tabs, `CartBottomBar` is two floating pills,
> `ComboCard` nhân is multi-select, `OrderSummary` has the spinning "Bàn 04" ring and no "Gọi thêm"
> badge, and `TableConfirmModal` now calls `setActiveOrderId`. So most "🔴 rebuild gaps" are CLOSED.
> The drift now runs the other way: **`customer_menu.md` is littered with stale
> "⚠️ NEW DESIGN — code pending rebuild" markers that lie — the code is already there.** The real
> remaining items are a short list of genuine code↔design divergences (below) plus doc cleanups.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 · Component visuals | Most "rebuild gaps" are CLOSED; 3 real code divergences + stale doc markers | 3 | 6 | many ✅ |
| 2 · Cross-component dataflow | Store/selectors/canh-gate all match; 1 real note-disconnect bug | 1 | 1 | many ✅ |
| 3 · Cross-page dataflow | 201 handoff now CORRECT (was the old headline); only wording/line nits | 0 | 3 | many ✅ |
| 4 · Loading | Behaviour perfect; doc has 3 hard description errors | 3 | 4 | many ✅ |
| 5 · FE⇄BE data model | Object model accurate; nullable-type + dead-code nits only | 0 | 4 | several ✅ |

**🔴 RAISE-MY-VOICE headline findings (hand-verified):**

1. **`TableConfirmModal` discards the order note the customer typed.** The QR confirm modal keeps its
   OWN `const [note, setNote] = useState('')` ([TableConfirmModal.tsx:15](../../../../fe/src/features/menu/components/TableConfirmModal.tsx#L15))
   and POSTs `note: note.trim() || null` ([:23](../../../../fe/src/features/menu/components/TableConfirmModal.tsx#L23)).
   It never reads `cart.orderNote`. But `OrderSummary`'s GHI CHÚ textarea writes `orderNote` to the
   store via `setOrderNote` ([OrderSummary.tsx:62,300-304](../../../../fe/src/features/menu/components/OrderSummary.tsx#L62)).
   → A customer who types a note in the order summary, then taps "Thanh toán", sees an **empty**
   note box in the modal and **their note is silently dropped from the POST**. Real data loss.
   *Fix (code):* seed the modal note from the store (`useState(cart.orderNote)`) or drop the modal
   textarea and send `cart.orderNote` at POST. Register in MASTER first.

2. **`ComboSection` heading says "Combo" but the nav tab says "Suất" and the design says "SUẤT".**
   `ComboSection.tsx:16` renders `<h2>Combo</h2>` ([ComboSection.tsx:16](../../../../fe/src/features/menu/components/ComboSection.tsx#L16)),
   while `buildMenuSections` labels the same section's nav tab `'Suất'`
   ([MenuSections.tsx:29](../../../../fe/src/features/menu/components/MenuSections.tsx#L29)) and
   `DESIGN_PROMPT.md` calls it **SUẤT**. Three-way inconsistency, visible on screen.
   *Fix (code):* change the heading to "SUẤT" (or "Suất") to match the tab + design.

3. **A second, undocumented `RestaurantBanner` stacks under the photo header.** `page.tsx:131` renders
   `<RestaurantBanner />` ([page.tsx:131](../../../../fe/src/app/(shop)/menu/page.tsx#L131)) — a full
   `h-44` banner with `<img src="/restaurant-banner.jpg">` + tagline "Bánh cuốn tươi — ngon mỗi ngày"
   ([RestaurantBanner.tsx:3-21](../../../../fe/src/features/menu/components/RestaurantBanner.tsx#L3)).
   `DESIGN_PROMPT.md` has a SINGLE header banner; there is no second banner zone. The image file is
   likely absent from `/public` (an `onError` handler silently swaps in a gradient), so on screen this
   is a redundant gradient strip. *Fix:* remove it from `page.tsx`, or formally adopt it as a zone in
   the design + ship the asset. Owner decision.

**Resolved since the last run (no longer 🔴):**
- The old headline "`TableConfirmModal` does NOT call `setActiveOrderId`" is **fixed** — it is called
  at [TableConfirmModal.tsx:51](../../../../fe/src/features/menu/components/TableConfirmModal.tsx#L51).
- "Header reads `settings.tableLabel`" — gone; `MenuHeader.tsx` is store-free, a static photo banner.
- "CategoryTabs are filters, not scroll-spy" — replaced by `MenuCategoryNav` (scroll-spy anchors).

**Dead/unreachable components found:**
- `ToppingModal.tsx` — zero imports anywhere; fully dead. *(Owner deletes later — leave alone.)*
- `ComboModal` — imported & mounted by `ComboCard` but `setModalOpen(true)` is **never** called
  ([ComboCard.tsx:17,97,201-206](../../../../fe/src/features/menu/components/ComboCard.tsx#L17)); always
  renders `null`. Unreachable. *(Owner deletes later — leave alone.)*
- `CategoryTabs.tsx` — **not** dead globally (POS uses it, `/pos/page.tsx:9,255`), but dead for `/menu`.
  The menu doc's Zones table still names it as the menu component; it should name `MenuCategoryNav`.

---

## Area 1 — Component Visuals

**Verdict:** the new design is built. Most zones match; the stale "code pending rebuild" markers in
`customer_menu.md` are the dominant drift, plus 3 real code divergences (headlines 2–3 + the note
pre-fill claim).

| Component/Zone | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| A · MenuHeader | photo banner, Playfair title, no pill/table/login | exactly that (`MenuHeader.tsx:15-33`) | 🟢 | marker correct |
| Mini · MiniCartStrip | `🛒 13 món · 103.000đ [Xem giỏ →]` | orange "N món" pill + scrolling item chips + price, one tap target, no "Xem giỏ →" label (`MiniCartStrip.tsx:20-38`) | 🟡 | doc: drop the label / note implicit tap |
| Banner · RestaurantBanner | listed "static" in Zones; absent from DESIGN_PROMPT | full 2nd `h-44` banner, missing img → gradient fallback (`RestaurantBanner.tsx:3-21`, `page.tsx:131`) | 🔴 | **headline 3** — remove or adopt as a zone |
| AddToOrderBanner | `▸ Đang thêm món vào đơn #123 [Xem đơn]` | "Chọn món để thêm vào đơn hàng hiện tại" + "Xem đơn"; no order # (`AddToOrderBanner.tsx:14-25`) | 🟡 | doc: match copy |
| ActiveOrderRecoveryBanner | `Đơn hàng #123 đang xử lý — thêm món?` | matches, uses `order.order_number` (`ActiveOrderRecoveryBanner.tsx:55-70`) | 🟢 | — |
| B · SearchBar | `🔍 Tìm món nhanh...`, ≥2 chars | "Tìm món nhanh..." 300ms debounce, ≥2 gate, 1-char hint (`SearchBar.tsx:26,38-40`) | 🟢 | — |
| C · Nav | Zones names `CategoryTabs`; "code pending rebuild" | page renders `MenuCategoryNav` scroll-spy (`page.tsx:9,147-153`; `MenuCategoryNav.tsx:13-36`); `CategoryTabs` is the POS filter component | 🟡 | doc: rename zone → `MenuCategoryNav`; drop marker |
| D · FavouritesRail | "code pending rebuild"; uppercase "YÊU THÍCH" | renders on ≥1 fav, "Yêu thích" + Heart icon, tap → detail (`FavouritesRail.tsx:23-54`) | 🟡 | doc: drop marker; casing nit |
| E · ComboSection heading | "SUẤT" | `<h2>Combo</h2>` (`ComboSection.tsx:16`) while tab = "Suất" (`MenuSections.tsx:29`) | 🔴 | **headline 2** — set heading to SUẤT |
| E · ComboCard nhân | multi-select, both default, ≥1; "code pending rebuild" | multi-select Set, `toggleNhan` blocks last-deselect, heart (`ComboCard.tsx:39-57,116-198`) | 🟢 | drop marker |
| E · ComboCard items | inline "1 bánh trứng chín + 3 bánh cuốn…" | `<ul>` of `×N product_name` rows (`ComboCard.tsx:131-142`) | 🟡 | doc: redraw as list |
| F · ProductCard / GridCard | inline nhân pills, stepper, heart, no modal | matches; `ProductGridCard` is the desktop grid variant (`ProductCard.tsx:53-151`, `ProductGridCard.tsx:53-145`) | 🟢 | doc: note grid variant exists |
| I · OrderSummary — pill | "Bàn 04" spinning ring; "code pending rebuild" | `running-border` conic-gradient on tableName span (`OrderSummary.tsx:148`; `globals.css` keyframes) | 🟢 | drop marker |
| I · OrderSummary — note | textarea **pre-filled** "Gia đình (mẹ + 2…)" | `value={orderNote}`, placeholder only, starts empty (`OrderSummary.tsx:300-304`) | 🔴→doc | **owner decided NOT to pre-fill** → doc fix: note starts empty |
| I · OrderSummary — Gọi thêm | "no Gọi thêm badge" | absent (whole file) | 🟢 | drop marker |
| I · OrderSummary — Tổng số món | collapsible 5-col table | matches (`OrderSummary.tsx:240-287`) | 🟢 | — |
| J · CartBottomBar | two stacked pills, no total; "code pending rebuild" | matches (`CartBottomBar.tsx:19-41`) | 🟢 | drop marker |
| Cart drawer | "slide-up" | slides from the RIGHT (`CartDrawer.tsx:69-71`) | 🟡 | doc: fix direction |
| TableConfirmModal | "Xác nhận đặt hàng" / "Đặt hàng" + note textarea | matches copy (`TableConfirmModal.tsx:64-103`) | 🟢 | — (but see Area 2 note bug) |

**Verified-matching:** MenuHeader, ActiveOrderRecoveryBanner, SearchBar, ComboCard multi-select+heart,
ProductCard/GridCard, OrderSummary spinning ring + no-Gọi-thêm + Tổng-số-món table, CartBottomBar,
TableConfirmModal copy.

---

## Area 2 — Cross-Component Dataflow (Zustand)

**Verdict:** store shape, action names, selector formulas, the canh gate and the "no zone→zone props"
rule all match. One real bug: the note disconnect (headline 1).

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| TableConfirmModal note | builds payload from store | local `useState('')`, POSTs local note; `cart.orderNote` ignored (`TableConfirmModal.tsx:15,23`) | 🔴 | **headline 1** — seed from `cart.orderNote` or read store at POST |
| OrderSummary canh gate | doc implies `id.startsWith('canh_')` in both | here it's `totalCanh === 0` (sum of `canh_<id>_rau/plain` qty) (`OrderSummary.tsx:83-90`) | 🟡 | doc: note the structural difference (equivalent result) |
| partialize, `addItem` dedup, `total()`/`itemCount()`, `setCanhQty` sig, `clearCart` list, MenuHeader store-free, no-zone→zone | as documented | confirmed (`cart.ts:51-59,94,129-130,35,158`; `MenuHeader.tsx`) | 🟢 | — |

**Verified-matching:** partialize `{orderNote, activeOrderId}`; canh gate in `page.tsx:41`; `addItem`
dedup; `total()`/`itemCount()`; `setCanhQty` 4-arg + `canh_<id>_rau/plain`; MenuHeader store-free;
`clearCart` scope; MiniCartStrip selectors; no-zone→zone rule.

---

## Area 3 — Cross-Page Dataflow (Zustand)

**Verdict:** the big flows are correct — and the **old headline (201 handoff missing
`setActiveOrderId`) is now FIXED**. Only wording + line-number nits remain.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| 201 handoff | `clearCart() → setActiveOrderId(id) → router.replace` | exactly that (`TableConfirmModal.tsx:48,51,53`; `checkout/page.tsx` same) — **resolved** | 🟢 | — |
| "clearCart KEEPS activeOrderId" | wording in `customer_menu.md:269` / crosspage §2 | `clearCart` only resets `items/paymentMethod/orderNote` (`cart.ts:94`); it doesn't touch `activeOrderId`, and `setActiveOrderId(id)` overwrites it next line | 🟡 | doc: reword — not "kept", just not reset, then overwritten |
| CART_CONFIG key string | doc refers to "v5" | persist `version: 5` (`cart.ts:134`) but the localStorage KEY string is `'cart-config-v3'` (`storage-keys.ts:6`) | 🟡 | doc: clarify version 5 vs key string `cart-config-v3` |
| "Theo dõi" line ref | cited line 564 | actual `order/[id]/page.tsx:572` | 🟡 | doc: refresh line number |
| partialize, order_cache (3 writers / list scan), SSE stop, terminal clear, add-to-order, QR scan, admin isolation | as documented | all confirmed (`cart.ts:158`; `storage-keys.ts:3`; `order/page.tsx:10-24`; `useOrderSSE.ts:101-121`; `order/[id]/page.tsx:65-69,583`; `table/[tableId]/page.tsx:30-31`) | 🟢 | — |

**Verified-matching:** all of the above 🟢 rows.

---

## Area 4 — Loading Behaviour

**Verdict:** behaviour is perfect; the DOC has three hard description errors (a phantom query-key
segment, an omitted branch, a wrong guard condition) plus stale line numbers.

| # | Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|---|
| 1 | products queryKey | `['products', selectedCategory, searchQuery]` | `['products', searchQuery]` — no `selectedCategory` (`page.tsx:67`) | 🔴 | doc: remove `selectedCategory` segment |
| 2 | main-content branches | 3-state (error/loading/empty) | 5 branches incl. a distinct `searching` branch (`page.tsx:162-200`) | 🔴 | doc: add `searching` branch at priority 3 |
| 3 | category-empty guard | `products.length===0 && !showCombos` | `products.length===0 && combos.length===0` — no `showCombos` var (`page.tsx:190`) | 🔴 | doc: fix guard |
| 4 | query declaration order | categories→all→combos→products | categories→all→**products**→combos (`page.tsx:53,60,66,79`) | 🟡 | doc: swap rows 3/4 |
| 5–7 | stale line refs | Suspense 201-207, skeleton 151-165, empty 166-170 | Suspense 224-229, skeleton 170-183, empty 184-191 | 🟡 | doc: refresh |
| — | staleTime, enabled gate, products-only isLoading/isError/refetch, skeleton shapes, error copy, `min-h-[44px]` on Button, no-fallback Suspense, route spinner | as documented | all confirmed (`page.tsx:56,76,66,172-182,164-165,226`; `loading.tsx`) | 🟢 | — |

**Verified-matching:** staleTime (4×5m), enabled gate, products-drives-loading, both skeleton shapes,
error copy + `min-h-[44px]` Button, Suspense no-fallback, route spinner, ProductList no own skeleton.

---

## Area 5 — Data Model FE⇄BE

**Verdict:** Object Model §1–§6 accurate; only nullable-type convention + dead `buildImageURL` nits.

| Object.Attr / Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Flag 1 — product filter params | BE ignores `category_id`/`search` | `ListProducts` has zero `c.Query` calls (`product_handler.go:42-54`) | 🟢 | accurate |
| Flag 2 — null convention | BE sends `""` not `null`; FE typed `string\|null` | `enrichProduct`/`enrichCombo` collapse NULL→`""` (`product_service.go:627-695`); FE `product.ts:19-20,38-46` | 🟡 | FE: drop `\| null` (or send real null) |
| Flag 3 — Category omits fields | BE sends `description`+`is_active`; FE drops | confirmed (`product_handler.go:169-190`; `product.ts:1-5`) | 🟡 | add optional fields if ever needed |
| Flag 4 — combo enrichment degrades | missing product → raw UUID | structurally confirmed via `ComboItem` type; `page.tsx:99-102` | 🟡 | accept / add error path |
| `buildImageURL` | "object path, not full URL" | defined `product_handler.go:31-37`, **zero call sites**; raw path shipped | 🟡 | call it or delete |
| OrderItemPayload | `{product_id,combo_id,quantity,topping_ids,note?,combo_items?}` | matches `createOrderItemReq` (`order_handler.go:33-40`); XOR `:77-86`; JSON null→`""` | 🟢 | — |
| `filling` column | absent (016 add, 017 drop) | 016 adds, 017 UP drops; zero Go/FE refs | 🟢 | accurate |
| order top-level `note` | — | `""` both sides (`order_handler.go:331-334`) | 🟢 | — |

**Verified-matching:** Flag 1, Flag 3, XOR, order note `""`, `filling` absence, `ProductDetails`/
`ComboDetails` struct shapes, `combo_items` wire shape, `buildImageURL` dead, OrderItemPayload alignment.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target |
|---|---|---|---|
| 1 | 🔴 Code bug | `TableConfirmModal`: seed note from `cart.orderNote` (or read store at POST) so the typed note isn't dropped | `TableConfirmModal.tsx:15,23` |
| 2 | 🔴 Code fix | `ComboSection` heading "Combo" → "SUẤT" (match nav tab + DESIGN_PROMPT) | `ComboSection.tsx:16` |
| 3 | 🔴 Code/owner | Remove the 2nd `RestaurantBanner` (or adopt it as a design zone + ship `/restaurant-banner.jpg`) | `page.tsx:131`, `RestaurantBanner.tsx` |
| 4 | 🔴 Doc fix | Strip all stale "⚠️ NEW DESIGN — code pending rebuild" markers (C/D/E/I/J are built) | `customer_menu.md` |
| 5 | 🔴 Doc fix | Zones table: `CategoryTabs` → `MenuCategoryNav` | `customer_menu.md` |
| 6 | 🔴 Doc fix | Note is NOT pre-filled — remove the "Gia đình…" pre-fill claim (owner: keep blank) | `customer_menu.md` |
| 7 | 🔴 Doc fix | Loading: remove `selectedCategory` from queryKey; add `searching` branch; fix `!showCombos`→`combos.length===0`; swap products/combos order; refresh line refs | `customer_menu_loading.md` |
| 8 | 🟡 Doc fix | clearCart "keeps activeOrderId" wording; CART_CONFIG key `cart-config-v3` vs version 5; "Theo dõi" line 572 | `customer_menu.md`, `_crosspage_dataflow.md` |
| 9 | 🟡 Doc fix | Copy/layout: MiniCartStrip label, AddToOrderBanner copy, CartDrawer slide direction, ComboCard item list, casing (Combo/Canh/Yêu thích), OrderSummary canh-gate structure | doc-set |
| 10 | 🟡 Type fix | FE nullable types (`description`/`image_path`/combo `category_id`) → `string` | `fe/src/types/product.ts` |
| 11 | 🟡 Code cleanup | `buildImageURL` — call in serializers or delete | `product_handler.go` |
| 12 | ⬜ Deferred | dead `ToppingModal` / unreachable `ComboModal` — owner deletes later (out of scope) | `features/menu/components/` |

> Per `CLAUDE.md` (MASTER-first + scope contract): the doc fixes are one task; each code change
> (#1, #2, #3, #11) must be registered in `MASTER_TASK.md` before any file is touched.
