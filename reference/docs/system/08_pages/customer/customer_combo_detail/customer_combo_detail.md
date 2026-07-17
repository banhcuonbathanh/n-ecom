# Combo Detail — `/menu/combo/:id`

> **TL;DR:** ✅ implemented · guest JWT / open browse · Full-screen combo view: hero image,
> name/price/description, list of included items ("Gồm có"), quantity stepper, sticky add-to-cart
> footer. Combo data comes from `GET /combos` enriched with product names/prices from `GET /products`.

---

## ASCII Wireframe

```
┌────────────────────────────────────────────────┐
│ [←]                                            │ ← back button
├────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐ │
│ │            HERO IMAGE                      │ │ ← A
│ └────────────────────────────────────────────┘ │
│ Combo Đầy Đặn                    42.000đ       │ ← B name · availability ·
│ 1 phần bánh + 1 canh + đồ uống                 │   price · description
├────────────────────────────────────────────────┤
│ Gồm có                                         │ ← C items list
│ ×1  Bánh cuốn nhân thịt                        │   (qty badge + name only —
│ ×1  Canh mọc                                   │    code renders no per-item
│ ×1  Trà đá                                     │    price; page.tsx:141-148)
├────────────────────────────────────────────────┤
│ Số lượng        [−]  1  [+]                    │ ← D QuantityStepper (inline)
├────────────────────────────────────────────────┤
│        [ Thêm vào giỏ · 42.000đ ]              │ ← E sticky CTA footer
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt] │ ← ClientBottomNav (shell)
└────────────────────────────────────────────────┘
```

## Zones

| Zone | Component | Data source |
|---|---|---|
| A Hero | inline JSX (`next/image`) in `menu/combo/[id]/page.tsx` | combo `image_path` |
| B Info | inline JSX | `GET /combos` (find by id) |
| C Items | inline JSX list | `combo_items[]` + product names/prices from `GET /products` |
| D Quantity | inline `[−]/[+]` buttons (lucide `Minus`/`Plus`) | local state |
| E CTA | inline sticky footer | `useCartStore.addItem` (combo cart item carries `product_id` per sub-item) |

## Key Interactions

- `[−]/[+]` → combo quantity; CTA total updates live.
- **Thêm vào giỏ** → adds combo to cart (sub-item product ids threaded for the order payload),
  navigates back to `/menu`.
- Back arrow → `/menu`.
- Unavailable combo → CTA disabled.

## Business Logic Used

- Combo expansion at order time (header line `unit_price=0`, sub-items priced) →
  [../02_spec/BUSINESS_RULES.md §2.5 Combo Expansion](../02_spec/BUSINESS_RULES.md#25-combo-expansion)
- Combo cart shape + payload overrides → [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md) (order payload builder)
