# Comparison — Doc vs. Code · `customer_product_detail` (`/menu/product/:id`)

> **Scope:** a read-only audit of this page's doc-set against the running FE/BE code, across the
> applicable axes: **① component visuals · ③ cross-page dataflow · ④ loading · ⑤ FE⇄BE data model**.
> Axis ② (cross-component dataflow) does **not apply** — this page has no shared store; its widgets
> coordinate through local React state (`selectedToppingIds`, `qty`) in `page.tsx`, which is why the
> folder has no `_crosscomponent_dataflow.md`.
>
> **Read-only — no code and no page-doc was changed.** This file + its VI mirror + the visual mockup +
> the shared `COMPARISON_TRACKER.md` are the only writes.
> **Code wins:** every "Code reality" cell is traced from source on branch
> `experience_claude.md_system_1_test_iphon2_change_code`; the one 🔴 was re-verified by hand. Done
> inline (small page: 1 BE endpoint, 5 components, no shared store, no SSE) — no subagents spawned.
> Date: 2026-06-21.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals | ⚠️ Several real drifts; one hard conflict | 1 | 4 | 3 |
| 3 — Cross-page dataflow | ✅ Accurate — traces match code 1:1 | 0 | 0 | 0 |
| 4 — Loading behaviour | ✅ Accurate — including the dead-prop flag | 0 | 0 | 0 |
| 5 — FE⇄BE data model | ✅ Object model matches; line anchors stale | 0 | 1 | 1 |
| **Total** | | **1** | **5** | **4** |

---

## 🔴 RAISE-MY-VOICE headline findings (hand-verified)

1. **Two competing `fixed bottom-0` bars on this route — the CTA and the global tab bar collide.**
   The page's ASCII (`customer_product_detail.md:32-34`) draws the **CTAFooter** and the
   **ClientBottomNav** as two cleanly *stacked* bars. In code they are **both anchored to the same
   bottom strip**:
   - `CTAFooter` → `fixed bottom-0 left-0 right-0 … pb-safe-4`, **no z-index** (`CTAFooter.tsx:12`).
   - `ClientBottomNav` → `fixed bottom-0 left-0 right-0 z-20 …`, rendered by the shell on **every**
     `(shop)` route including this one (`fe/src/app/(shop)/layout.tsx:12`, `ClientBottomNav.tsx:48`).

   Because both pin to `bottom-0` and the nav carries `z-20` while the CTA has no stacking context,
   the bottom tab bar paints **over** the "Thêm vào giỏ hàng" button — they do not stack, they
   overlap. The page's `pb-32` spacer (`page.tsx:90`) and the layout's `pb-[72px]` pad
   (`layout.tsx:11`) clear scrolling content but do **not** separate the two fixed bars from each
   other. **This is a real visual/product bug, not just stale docs** — the primary CTA of the detail
   page can be obscured by the tab bar. (Exact pixel overlap needs a screenshot — stack is down;
   the CSS conflict itself is confirmed from source.)
   → Fix is a **code** change (lift the CTA above the nav, e.g. `bottom-[72px]`, or hide the nav on
   the detail route) and must be registered in `MASTER_TASK.md` first.

---

## Dead / unreachable components found

- **`CTAFooter` `loading?` prop is dead on this branch.** `CTAFooter` accepts `loading?: boolean`
  and uses it for `aria-label` + `disabled` (`CTAFooter.tsx:6,15-16`), but the only call site
  (`page.tsx:98-102`) never passes it — `handleAddToCart` is a synchronous Zustand write +
  `router.back()`. Already documented as `customer_product_detail_loading.md` Flag 1; re-confirmed.

---

## Area 1 — Component visuals

**Verdict:** ⚠️ The data-bearing zones (Hero, Info, Quantity) match, but the **ToppingSelector** and
**CTAFooter** drew differently in code than the ASCII, and the two bottom bars collide (🔴 above).

| Component / Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| CTA vs bottom nav | ASCII stacks `CTAFooter` then `ClientBottomNav` as two clean bars (`customer_product_detail.md:32-34`) | both `fixed bottom-0`; CTA has no z-index (`CTAFooter.tsx:12`), nav is `z-20` and shell-rendered every route (`(shop)/layout.tsx:12`, `ClientBottomNav.tsx:48`) → overlap | 🔴 | **Code:** separate the bars (CTA `bottom-[72px]` or hide nav here) — register in MASTER. Then redraw ASCII. |
| Nav title | `[←]  Chi tiết món` (`customer_product_detail.md:16`) | `title="Chi tiết sản phẩm"` (`page.tsx:52`) | 🟡 | Update ASCII to "Chi tiết sản phẩm". |
| ToppingSelector heading | `Topping (chọn thêm)` (`customer_product_detail.md:26`) | `Chọn topping (chọn nhiều · thêm vào giá)` (`ToppingSelector.tsx:25-27`) | 🟡 | Update doc heading text. |
| ToppingSelector layout | vertical checkbox list, one topping per row (`customer_product_detail.md:27-28`) | **2-column grid of bordered cards** (`grid grid-cols-2`, `ToppingSelector.tsx:29`) + a running **total summary line** `Tổng: base + sum = …` when ≥1 selected (`ToppingSelector.tsx:63-67`) — not in ASCII | 🟡 | Redraw zone C as a 2-col card grid; add the total line. |
| CTA unavailable text | "CTA disabled with **'Hết hàng'** state" (`customer_product_detail.md:57`) | renders **"Sản phẩm tạm hết"** when `!isAvailable` (`CTAFooter.tsx:21`) | 🟡 | Update doc to the real string. |
| Availability badge | B-zone is `(name · price · desc · availability)` — generic (`customer_product_detail.md:24,45`) | renders a `Badge` "✓ Còn hàng" / "Hết hàng" (`ProductInfo.tsx:16-20`) | 🟢 | Show the badge in the ASCII. |
| Zones table omits nav | Zones table lists Nav, A–E, Skeleton only (`customer_product_detail.md:41-49`); ASCII draws `ClientBottomNav` as "(shell)" | `ClientBottomNav` is rendered by `(shop)/layout.tsx:12` on this route | 🟢 | Add a Zones row for the shell bottom-nav. |
| Hero richness | ASCII is a bare "HERO IMAGE" block (`customer_product_detail.md:18-22`) | adds a top gradient overlay + 2-letter fallback when no/broken image (`ProductHeroImage.tsx:27-34`) | 🟢 | Note the gradient + fallback in doc. |

**Verified-matching:** Hero aspect `aspect-[390/220]` (`ProductHeroImage.tsx:15` = doc), `QuantityStepper`
`min=1` with disabled `[−]` at the floor (`QuantityStepper.tsx:12,20-22` = doc), live total in CTA
(`page.tsx:31,99` = doc), topping toggle updates total (`ToppingSelector.tsx:12-18` = doc), unavailable
toppings shown disabled not filtered (`ToppingSelector.tsx:37,48` = `_be.md` Flag 3).

---

## Area 3 — Cross-page dataflow

**Verdict:** ✅ Accurate. `customer_product_detail_crosspage_dataflow.md` traces match the code 1:1 —
no drift found.

**Verified-matching (every claim checked):**
- Handoff builds one `CartItem` `id = product_<id>_<sortedToppingIds|plain>`, `type:'product'`,
  FE-priced `unitPrice` (`page.tsx:33-46` = doc §1).
- `addItem` dedups on `CartItem.id`, incrementing quantity on a match (`cart.ts:50-60` = doc §2).
- `partialize` persists **only** `{ orderNote, activeOrderId }`; `items[]` / `tableId` / `tableName`
  are session-memory only and lost on F5 (`cart.ts:153` = doc §5, Durability matrix).
- Persist target `STORAGE_KEYS.CART_CONFIG = 'cart-config-v3'`, Zustand `version: 5`
  (`storage-keys.ts:6`, `cart.ts:128-129` = doc §5 — both the key **and** the version 5 are correct).
- Standalone product → `{ product_id, combo_id:null, quantity, topping_ids: toppings.map(t=>t.id) }`
  via the single `buildOrderItemsPayload` (`order-payload.ts:46-54` = doc §4).
- No SSE / BroadcastChannel / BE cart — multi-device shares nothing pre-order (= doc §6).

---

## Area 4 — Loading behaviour

**Verdict:** ✅ Accurate, including its own flags. `customer_product_detail_loading.md` matches code.

**Verified-matching:**
- Three mutually-exclusive branches `isLoading → Skeleton`, `isError → panel`, `product → content`
  (`page.tsx:57,59-69,71-104` = doc table).
- `ProductDetailSkeleton` = 4 zones, fixed 2×2 topping grid regardless of real topping count
  (`ProductDetailSkeleton.tsx:5,8-19,22-29,32-39` = doc).
- `useProductDetail` `queryKey ['products', id]`, `staleTime 5m`, `enabled: !!id`
  (`useProductDetail.ts:6-11` = doc Hook Semantics).
- Generic error copy "Không tìm thấy sản phẩm." for all failures, no retry (`page.tsx:61` = doc Flag 3).
- **Dead `loading?` prop on `CTAFooter`** confirmed (`CTAFooter.tsx:6,15-16` vs call site
  `page.tsx:98-102` = doc Flag 1) — see Dead-code list above.

---

## Area 5 — FE⇄BE data model

**Verdict:** ✅ Object model matches exactly. Only the BE doc's **main.go line anchors** have drifted
(the file shifted ~13 lines since the trace) — content is right, line numbers are stale.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Route line anchors | route at `main.go:169`, group at `:167`, mgr/adm subgroups `:170-182` (`_be.md:23-26,42`) | group `main.go:180`, `GET /:id` `main.go:182`, mgr block `:183-190`, adm block `:191-194` | 🟡 | Refresh the `main.go` line numbers in `_be.md`. |
| Provenance branch | headers say branch `experience_claude.md_system_1` (`_be.md:6`, others) | current branch `experience_claude.md_system_1_test_iphon2_change_code` | 🟢 | Bump branch in provenance headers on next doc refresh. |

**Verified-matching:**
- `productJSON` emits exactly `id, name, price, description, image_path, is_available, sort_order,
  category_id, category_name, toppings[]` (`product_handler.go:448-459`) = FE `Product` type
  (`types/product.ts:14-25`) = `_be.md` Response shape.
- Topping JSON `{id, name, price, is_available}` (`product_handler.go:446`) = FE `Topping`
  (`types/product.ts:7-12`).
- `GetProduct` flow: Redis `product:<id>` hit → unmarshal → return; miss → `GetProductByID`
  (`ErrNoRows → ErrNotFound`) → `buildCategoryMap` → `GetToppingsByProductID` → `enrichProduct` →
  `setCacheJSON` (`product_service.go:212-234`) = `_be.md` Per-Endpoint Detail.
- Cache key `product:<id>` + `productCacheTTL = 5m` (`product_service.go:21,213`) = doc.
- Topping-edit does **not** bust `product:<id>` (`invalidateToppingCaches` Dels only
  toppings/products lists, `product_service.go:719-721`) = `_be.md` Flag 2 (real code gap, not drift).

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug | Separate the two `fixed bottom-0` bars — lift `CTAFooter` above the nav (`bottom-[72px]`) or suppress `ClientBottomNav` on `/menu/product/:id` | `fe/src/components/product-detail/CTAFooter.tsx` or `fe/src/app/(shop)/layout.tsx` |
| 2 | 🟡 Doc fix | Redraw zone C ASCII as a 2-col card grid + total line; fix nav title → "Chi tiết sản phẩm"; topping heading; unavailable CTA text "Sản phẩm tạm hết" | `customer_product_detail.md` |
| 3 | 🟡 Doc fix | Refresh `main.go` line anchors (group 180 / GET 182 / mgr 183-190 / adm 191-194) | `customer_product_detail_be.md` |
| 4 | 🟢 Doc fix | Add ClientBottomNav row to Zones table; add availability badge + hero gradient/fallback to ASCII; bump provenance branch | `customer_product_detail.md`, all `_*.md` headers |

> Per CLAUDE.md: the doc fixes (#2–#4) are **one** ALIGNed doc task; the code change (#1) must be
> registered in `MASTER_TASK.md` **before any file is touched**. This skill changed neither.
