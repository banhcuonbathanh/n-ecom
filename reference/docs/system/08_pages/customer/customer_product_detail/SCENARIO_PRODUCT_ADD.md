# Scenario — Customizing One Dish on the Product Detail Page

> **TL;DR:** ✅ implemented · one concrete run through `/menu/product/:id`: a diner opens a dish,
> reads it, toggles toppings, bumps the quantity, and taps "Thêm vào giỏ hàng" — landing back on
> `/menu` with the line in their cart. Grounded in the page's single traced endpoint
> (`GET /products/:id`) and its one handoff (a `CartItem` into `useCartStore`).
> Traced from source on branch `experience_claude.md_system_1`.
> Anchors: BE → [customer_product_detail_be.md](customer_product_detail_be.md) ·
> cross-page → [customer_product_detail_crosspage_dataflow.md](customer_product_detail_crosspage_dataflow.md) ·
> loading → [customer_product_detail_loading.md](customer_product_detail_loading.md) ·
> page → [customer_product_detail.md](customer_product_detail.md).
> This scenario zooms in on the **detail-page beat**; the surrounding order story (submit → kitchen →
> tracking) is the shared menu scenario
> [../customer_menu/SCENARIO_LUNCH_RUSH.md](../customer_menu/SCENARIO_LUNCH_RUSH.md).

---

## Cast

- **Linh** — a diner at table 5, already holding a guest JWT from scanning the table QR.
- **`/menu`** — the catalog she is browsing (cart drawer + bottom-nav badge).
- **`/menu/product/:id`** — the detail page, this scenario's stage.
- **`ProductService.GetProduct`** + Redis `product:<id>` — the only backend Linh touches here.

## Setting

Lunch. Linh has nothing in her cart yet. She taps the **Bánh Cuốn Nhân Thịt** card on `/menu`.

---

## Timeline — beat by beat

**00:00 — Tap the card.** Next.js navigates to `/menu/product/<id>`. The shared `(shop)/loading.tsx`
orange spinner flashes during navigation (`loading.tsx:1-7`). The client component
`ProductDetailPage` mounts and fires `useProductDetail(id)` (`page.tsx:22`).

**00:00.2 — Skeleton.** While `isLoading` is true the page shows `ProductDetailSkeleton`
(`page.tsx:57`) — hero block, name/price/description bars, a 2×2 topping grid, a stepper row. The
`CustomerTopNav` (back arrow + cart badge) is already painted above it (`page.tsx:51-55`). Loading
detail → [customer_product_detail_loading.md](customer_product_detail_loading.md).

**00:00.3 — The one fetch.** `GET /api/v1/products/<id>` hits the public route (`main.go:169`).
`GetProduct` checks Redis `product:<id>` (`product_service.go:213`); on the lunch-rush first hit it
**misses**, so the service reads `GetProductByID` + `GetToppingsByProductID`, builds the category
map, enriches, and writes the 5-min cache (`product_service.go:221-232`). Response: `id, name,
price, description, image_path, is_available, sort_order, category_id, category_name, toppings[]`
(`product_handler.go:443-460`). Full chain → [customer_product_detail_be.md](customer_product_detail_be.md).

**00:00.4 — Content paints.** `product` is now truthy; the skeleton is replaced by hero, info
(name + "✓ Còn hàng" badge + 35.000đ + description), the `ToppingSelector` (rendered because
`product.toppings.length > 0`, `page.tsx:80`), the quantity stepper, and the sticky CTA footer
reading "Thêm vào giỏ hàng · 35.000đ" (`page.tsx:71-104`).

**00:08 — Linh adds Chả lụa (+10.000đ).** She ticks the topping checkbox. `ToppingSelector.toggle`
updates the page's local `selectedToppingIds` state (`page.tsx:19,84`). The page recomputes
`unitPrice = 35.000 + 10.000 = 45.000` and `total = unitPrice * qty` (`page.tsx:28-31`); the CTA
footer live-updates to "· 45.000đ". No network call — pure local state.

**00:14 — Bumps quantity to 2.** The `QuantityStepper` `[+]` sets local `qty = 2` (`page.tsx:93`).
`total` becomes `45.000 × 2 = 90.000`; the footer shows "· 90.000đ".

**00:18 — "Thêm vào giỏ hàng".** `handleAddToCart` (`page.tsx:33-46`) builds one `CartItem`:
`id = product_<id>_<chaLuaId>`, `type:'product'`, `quantity:2`, `price:45.000`,
`toppings:[Chả lụa]`. It calls `useCartStore.addItem` (`cart.ts:50-60`) — a new line (no existing id
match) is appended **in memory**. Then `router.back()` returns her to `/menu`.

**00:18.1 — Back on `/menu`.** The CartDrawer and the bottom-nav cart badge read the shared Zustand
store and already show the new line + count — no refetch, because the store is one in-tab singleton.
Cross-page detail → [customer_product_detail_crosspage_dataflow.md](customer_product_detail_crosspage_dataflow.md).

> If Linh had instead pressed **F5** before submitting her order, the cart line would vanish —
> `items[]` is not persisted (`cart.ts:153`). Only `orderNote` + `activeOrderId` survive a reload.

---

## Under the hood

- **A · Cross-component (this page).** No shared store *within* the page — the widgets coordinate
  through local React state (`selectedToppingIds`, `qty`) in `page.tsx` passed as props
  (ToppingSelector, QuantityStepper, CTAFooter). That is why there is **no** `_crosscomponent`
  file for this page.
- **B · Cross-page.** The only outlived write is the `CartItem` into `useCartStore`, consumed by
  `/menu` + `/checkout` →
  [customer_product_detail_crosspage_dataflow.md](customer_product_detail_crosspage_dataflow.md).
- **C · FE → BE send.** Exactly one request: `GET /products/:id`. Add-to-cart sends **nothing** to
  the server.
- **D · BE → FE receive / live.** No realtime. One JSON response; no SSE/WS on this page.
- **E · Loading + caching.** Route spinner → skeleton → content
  ([…_loading.md](customer_product_detail_loading.md)); Redis `product:<id>` 5 min + FE `staleTime`
  5 min — a revisit within 5 min skips the skeleton entirely.
- **F · Monitoring.** Nothing page-specific; the GET is covered by the global request metrics
  middleware (`main.go` global chain).

## One-line mental model

> The product detail page is a **read-once, write-local** screen: one cached `GET /products/:id` in,
> one in-memory cart line out — the server only learns what Linh chose later, when `/menu` or
> `/checkout` posts the order.
