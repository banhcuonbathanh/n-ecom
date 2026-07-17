# Scenario — Add a Combo to the Cart

> **TL;DR:** ✅ implemented · one concrete run through `/menu/combo/:id`: a guest taps a combo on the
> menu, reads what's inside, bumps the quantity, and adds it to the cart — then is bounced back to
> `/menu` to keep ordering. It is a **read-only-on-BE** flow: two cached catalog GETs in, one
> client-side cart write out, **zero** order write on this page.
> Grounded in [customer_combo_detail_be.md](customer_combo_detail_be.md) (endpoints) +
> [customer_combo_detail_crosspage_dataflow.md](customer_combo_detail_crosspage_dataflow.md) (handoff)
> + [customer_combo_detail_loading.md](customer_combo_detail_loading.md) (in-flight).
> Surrounding order story → [../customer_menu/SCENARIO_LUNCH_RUSH.md](../customer_menu/SCENARIO_LUNCH_RUSH.md).

---

## Cast

- **Linh** — a guest at table 4, browsing on her phone (guest JWT in memory from the QR scan, though
  this page needs none).
- **The combo** — "Combo Đầy Đặn" (`is_available=1`), 42.000đ, containing bánh cuốn nhân thịt + canh
  mọc + trà đá.
- **The cart store** — Zustand, in-memory `items[]` (session-only).

## Setting

Lunch. Linh is on `/menu`, taps the "Combo Đầy Đặn" card → router pushes `/menu/combo/<id>`.

## Timeline

| T | Beat | What happens |
|---|---|---|
| 0:00 | **Tap combo card** | Navigate to `/menu/combo/:id`. The `(shop)` shell (ClientBottomNav) is already painted. |
| 0:00 | **Skeleton** *(loading beat)* | The page fires two queries — `GET /combos` and `GET /products`. While `combos.isLoading`, `<ComboDetailSkeleton />` shows (hero + title + price + 3 item rows). See [loading](customer_combo_detail_loading.md). |
| 0:01 | **Combo resolves** | `combos` returns (warm `combos:list` cache → ~instant). `rawCombos.find(c => c.id === id)` locates the combo; the `products` join fills item names/prices. Zones A–E paint. |
| 0:05 | **Read "Gồm có"** | Linh sees the included items (Zone C): "×1 Bánh cuốn nhân thịt", "×1 Canh mọc", "×1 Trà đá". |
| 0:08 | **Bump quantity** | She taps `[+]` once → `qty=2`. The sticky CTA total updates live: `combo.price * qty` = 84.000đ. Pure local `useState` (`page.tsx:15`). |
| 0:10 | **Add to cart** *(handoff beat)* | Taps "Thêm vào giỏ hàng · 84.000đ". `handleAddToCart` writes one combo `CartItem` (`combo_<id>`, qty 2, `combo_items[]` carrying each sub-item's `product_id`) into the cart store, then `router.back()` → `/menu`. |
| 0:11 | **Back on /menu** | The cart badge reflects the added combo. Linh continues browsing; she'll submit the whole cart later from `/menu` (or `/checkout`). |

## Under the hood

**A — Cross-component (within this page):** minimal. The only shared state is the local `qty`
(`useState`) feeding the CTA total; there is no multi-widget store on this page, which is why it has
**no** `_crosscomponent_dataflow.md`. The one store interaction is the final `addItem`.

**B — Cross-page:** the combo cart item is the page's only handoff. It rides the cart store to
`/menu`/`/checkout`, where `buildOrderItemsPayload` converts it for `POST /orders`. The item is
**session-only — an F5 before submitting loses it**. Detail →
[crosspage](customer_combo_detail_crosspage_dataflow.md).

**C — FE → BE send:** **nothing from this page.** Add-to-cart is pure client state. The actual write
(`POST /orders`, where the combo is expanded server-side into a header line `unit_price=0` + priced
sub-item rows) happens **downstream** on `/menu` — see
[../customer_menu/SCENARIO_LUNCH_RUSH.md](../customer_menu/SCENARIO_LUNCH_RUSH.md) and
[../../02_spec/BUSINESS_RULES.md §2.5](../../02_spec/BUSINESS_RULES.md).

**D — BE → FE receive / live:** none. No SSE, no WS, no polling on this page.

**E — Loading + caching:** two GETs, both `staleTime` 5 min FE-side and Redis-cached 5 min BE-side
(`combos:list`, `products:list`). Gate is `combos.isLoading` only; `products` loads ungated → a brief
UUID-name flash on a cold deep-link. See [loading](customer_combo_detail_loading.md).

**F — Monitoring:** nothing page-specific. The catalog GETs flow through the global
`Logger, Recovery, Metrics` middleware chain (`main.go`); no per-page metric.

## Edge cases (from the trace)

- **Unavailable combo** → it never reaches the wire (`ListCombosAvailable` filters `is_available=1`),
  so the "Hết hàng" badge + disabled CTA are unreachable; Linh would instead see "Không tìm thấy
  combo." → [COMBO_BUGS.md](COMBO_BUGS.md) Bug 1.
- **Unavailable sub-product** → it drops out of `GET /products`, so that line shows a raw UUID instead
  of a name → [COMBO_BUGS.md](COMBO_BUGS.md) Bug 2.

## Mental model

> Combo detail is a **read-only catalog leaf**: it borrows two cached lists, shows one combo, and its
> only lasting act is dropping a combo into the (session-only) cart — the real order write happens
> later, on `/menu`.
