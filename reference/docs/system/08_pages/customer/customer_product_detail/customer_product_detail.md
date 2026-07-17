# Product Detail — `/menu/product/:id`

> **TL;DR:** ✅ implemented · guest JWT / open browse · Full-screen product view: hero image,
> name/price/description, optional topping selector, quantity stepper, and a sticky add-to-cart
> footer. Reached by tapping a product card on `/menu`.
>
> Doc set: [BE](customer_product_detail_be.md) · [crosspage](customer_product_detail_crosspage_dataflow.md) ·
> [loading](customer_product_detail_loading.md) · [scenario](SCENARIO_PRODUCT_ADD.md).

---

## ASCII Wireframe

```
┌────────────────────────────────────────────────┐
│ [←]  Chi tiết món                              │ ← CustomerTopNav
├────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐ │
│ │                                            │ │
│ │            HERO IMAGE                      │ │ ← A ProductHeroImage
│ │                                            │ │
│ └────────────────────────────────────────────┘ │
│ Bánh Cuốn Nhân Thịt              35.000đ       │ ← B ProductInfo
│ Bánh tráng tay, nhân thịt mộc nhĩ …            │   (name · price · desc · availability)
├────────────────────────────────────────────────┤
│ Topping (chọn thêm)                            │ ← C ToppingSelector
│ ☐ Chả lụa            +10.000đ                  │   (only when product has toppings)
│ ☐ Hành phi            +5.000đ                  │
├────────────────────────────────────────────────┤
│ Số lượng        [−]  2  [+]                    │ ← D QuantityStepper
├────────────────────────────────────────────────┤
│        [ Thêm vào giỏ · 80.000đ ]              │ ← E CTAFooter (sticky)
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ← ClientBottomNav (shell)
└────────────────────────────────────────────────┘
  Loading: ProductDetailSkeleton (same layout, pulsing blocks)
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| Nav | `components/shared/CustomerTopNav` | — |
| A Hero | `components/product-detail/ProductHeroImage` | `useProductDetail(id)` hook → `GET /products/:id` |
| B Info | `components/product-detail/ProductInfo` | same query |
| C Toppings | `components/product-detail/ToppingSelector` | product `toppings[]` |
| D Quantity | `components/shared/QuantityStepper` | local state |
| E CTA | `components/product-detail/CTAFooter` | local state total → `useCartStore.addItem` |
| Skeleton | `components/product-detail/ProductDetailSkeleton` | shown while loading |

## Key Interactions

- Toggle topping checkboxes → live total in CTA footer updates.
- `[−]/[+]` stepper → quantity (min 1).
- **Thêm vào giỏ** → adds item (with selected toppings) to `useCartStore`, navigates back to `/menu`.
- Back arrow → previous page (`/menu`).
- Unavailable product → CTA disabled with "Hết hàng" state.

## Business Logic Used

- Cart item shape (toppings, price math) → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (cart store)
- Topping price snapshot rules at order time → [../02_spec/BUSINESS_RULES.md §2 Order Rules](../02_spec/BUSINESS_RULES.md#2-order-rules)
