> Scratchpad: open questions, risks, undecided items for Client — Chi tiết sản phẩm.

---

## Open Questions

- [ ] **Maximum quantity per item** — Excalidraw shows no upper bound on the stepper. Is there a business rule (e.g. max 10 per item)? Need to confirm with restaurant owner before implementing `max` prop on `QuantityStepper`.
- [ ] **Topping selection limit** — Can the customer select ALL toppings at once, or is there a max? No constraint visible in excalidraw or Spec_3.
- [ ] **"Add to existing order" flow** — The `CartDrawer` on the menu page supports `addToOrderId?` for adding to an open order. Does the product detail page also need to handle this case (e.g. if navigated from an order page)?
- [ ] **Back navigation after add** — Spec says `router.back()`. What if the user deep-linked directly to `/menu/product/[id]` (e.g. from a QR shortcut)? `router.back()` would go to browser history "about:blank" — should fall back to `router.push('/menu')`.
- [ ] **Out-of-stock UX** — When `is_available = false`, should the page be reachable at all? Or should the menu page filter out unavailable products before linking? If users can reach an unavailable product page, the UX is clear; if not, the route can 404.

## Risks

- **ISR stale product data** — If a product is marked out-of-stock at the restaurant but the ISR cache (300s) hasn't expired, the page will show "✓ Còn hàng" for up to 5 minutes. Consider adding `revalidatePath('/menu/product/[id]')` to the admin product update mutation on the BE.
- **Topping price drift** — If a topping price changes between when the page loads and when the customer taps "Thêm vào giỏ hàng", the cart will store the old price. Cart price vs. actual price reconciliation on order submission is not documented in Spec_3.

## Undecided

- Should `CustomerTopNav` show the current table label (`useSettingsStore.tableLabel`) anywhere, or just the back arrow + cart count? Excalidraw only shows "Chi tiết sản phẩm" as title — static string.
- Should `generateStaticParams` be used to pre-build all product detail pages at build time? Would eliminate cold-start skeleton but requires product list at build time.

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-27*
