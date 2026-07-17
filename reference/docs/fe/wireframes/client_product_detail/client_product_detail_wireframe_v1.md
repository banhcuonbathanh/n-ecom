---
page: client_product_detail
route: /(shop)/menu/product/[id]
spec_ref: Spec_3 §4
created: 2026-05-27
status: Draft
---

# Page: Client — Chi tiết sản phẩm
**Route:** `/(shop)/menu/product/[id]`
**Version:** v1
**Status:** Draft

## Spec Summary

- Mobile product detail page for `/(shop)/menu/product/[id]`; 5 zones, 0 modals
- Zone A: full-width hero image (390×220) via `next/image` fill + `object-cover`; animate-pulse skeleton on load
- Zone B: product name, "✓ Còn hàng" badge, price (orange), short description
- Zone C: inline 2-column topping grid (conditional on `product.toppings.length > 0`); multi-select; real-time total calculated from `price` field, not `price_delta`
- Zone D: quantity stepper ("Số lượng" label + −/1/+); reuses shared `QuantityStepper`
- Zone E: sticky bottom CTA "Thêm vào giỏ hàng · {total} ₫"; dispatches to `useCartStore`

---

## 📐 Visual Wireframe

```
┌─────────────────────────────────────────────┐  ← sticky top-0 z-20
│  ←   Chi tiết sản phẩm            🛒 3      │  Zone NAV (#1e293b)
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│                                             │
│    [ product.image_path — next/image fill   │  Zone A — HeroImage
│      object-cover  390 × 220 px ]           │
│                                             │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Bánh Cuốn Nhân Tôm Thịt    [✓ Còn hàng]   │
│ 45,000 ₫                                    │  Zone B — ProductInfo
│ Bánh cuốn nhân tôm tươi + thịt xay, ăn     │
│ kèm chả quế và nước chấm đặc biệt.         │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐  ← only if toppings.length > 0
│ Chọn topping  (chọn nhiều · thêm vào giá)   │
│ ┌────────────────┐  ┌────────────────┐      │
│ │ □ Hành phi     │  │ □ Chả quế      │      │
│ │   + 5,000 ₫    │  │   + 8,000 ₫    │      │  Zone C — ToppingSelector
│ └────────────────┘  └────────────────┘      │
│ ┌────────────────┐  ┌────────────────┐      │
│ │ ✓ Tôm khô ←   │  │ □ Trứng chiên  │      │
│ │   + 10,000 ₫   │  │   + 7,000 ₫    │      │
│ └────────────────┘  └────────────────┘      │
│ ─────────────────────────────────────────── │
│ Tổng: 45,000 + 10,000 = 55,000 ₫           │
│ (updates realtime · price field)            │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Số lượng                    [ − ]  1  [ + ] │  Zone D — QtyStepper
└─────────────────────────────────────────────┘
                                            ↕ scroll area ends
┌─────────────────────────────────────────────┐  ← sticky bottom-0 z-20
│  [ Thêm vào giỏ hàng  ·  55,000 ₫       ]  │  Zone E — CTAFooter
└─────────────────────────────────────────────┘
```

**Loading state** (`isLoading = true`): all zones A–E replaced with grey `animate-pulse` rectangles (`ProductDetailSkeleton`).

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| NAV | `CustomerTopNav` | Always | sticky top-0 z-20 |
| A | `ProductHeroImage` | Always (shows skeleton while loading) | static, below nav |
| B | `ProductInfo` | Always (shows skeleton while loading) | static |
| C | `ToppingSelector` | `product.toppings.length > 0` only | static |
| D | `QtyStepper` (uses `QuantityStepper`) | Always | static |
| E | `CTAFooter` | Always | sticky bottom-0 z-20 |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| A | TanStack Query | Refetch on stale | `['products', id]` | `product.image_path` |
| B | TanStack Query | Refetch on stale | `['products', id]` | `name` · `price` · `description` · `is_available` |
| C | TanStack Query + `useState` | Selection via checkbox tap | `['products', id]` (toppings[]) + `selectedToppingIds` | `price` field per topping — NOT `price_delta` |
| D | `useState` | Stepper button tap | N/A | `quantity: number`, min=1, no documented max |
| E | Computed | Re-derived on every C/D change | N/A | `total = (product.price + sum(selected topping prices)) × quantity` |

---

## 🧩 Component Specifications

> Before filling this table: read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md`.
> Mark each row with one of: `✅ reuse` · `new (local)` · `new (shared)`

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|-----------------|
| NAV | `CustomerTopNav` | new (shared) | `components/shared/CustomerTopNav.tsx` | `title: string · cartCount: number · onBack: () => void` |
| A | `ProductHeroImage` | new (local) | `components/product-detail/ProductHeroImage.tsx` | `src: string · alt: string` |
| B | `ProductInfo` | new (local) | `components/product-detail/ProductInfo.tsx` | `product: ProductDetail` |
| B | `Badge` | ✅ reuse | `components/ui/badge.tsx` | `variant="success"` — "✓ Còn hàng" / `variant="urgent"` — "Hết hàng" |
| C | `ToppingSelector` | new (local) | `components/product-detail/ToppingSelector.tsx` | `toppings: Topping[] · selected: string[] · basePrice: number · onChange: (ids: string[]) => void` |
| D | `QuantityStepper` | ✅ reuse | `components/shared/QuantityStepper.tsx` | `value={quantity} min={1} onChange={setQuantity}` |
| E | `CTAFooter` | new (local) | `components/product-detail/CTAFooter.tsx` | `total: number · loading?: boolean · onAddToCart: () => void` |
| all | `ProductDetailSkeleton` | new (local) | `components/product-detail/ProductDetailSkeleton.tsx` | — (used in loading state) |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```ts
interface Topping {
  id: string
  name: string
  price: number         // full price to add — NOT a delta
}

interface ProductDetail {
  id: string
  name: string
  description: string
  price: number
  image_path: string
  is_available: boolean
  toppings: Topping[]
  category_id: string
}

// Page-local state
interface ProductDetailState {
  selectedToppingIds: string[]   // Topping.id values
  quantity: number               // min 1
}

// Derived total (computed, not stored)
// total = (product.price + selectedToppings.reduce((s, t) => s + t.price, 0)) * quantity

// Cart item dispatched on CTA tap
interface AddToCartPayload {
  productId: string
  name: string
  price: number           // unit price AFTER toppings
  quantity: number
  toppingIds: string[]
  imageUrl: string
}
```

### Query Configuration

```ts
// hooks/useProductDetail.ts
export function useProductDetail(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => fetchProduct(id),
    staleTime: 5 * 60 * 1000,   // 300s — matches ISR revalidate
    enabled: !!id,
  })
}
```

### Cart Dispatch (on CTA tap)

```ts
// Calls useCartStore.addItem — do NOT duplicate cart logic in this page
const handleAddToCart = () => {
  addItem({
    productId: product.id,
    name: product.name,
    price: unitPriceWithToppings,
    quantity,
    toppingIds: selectedToppingIds,
    imageUrl: product.image_path,
  })
  router.back()   // return to menu after add
}
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| Product not found (404) | Query returns null / 404 | `notFound()` in page.tsx | Next.js 404 page |
| Product unavailable | `is_available === false` | Disable CTA button | Badge "Hết hàng" (urgent variant); CTA greyed out |
| No toppings | `toppings.length === 0` | Hide Zone C entirely | Only Zones A, B, D, E shown |
| Image load error | `onError` on `<Image>` | Show placeholder bg | Grey rectangle with product name initials |
| Network offline | Query throws | Show error toast | Previous cached data stays visible |
| Quantity at minimum (1) | `quantity <= 1` | Disable "−" button | `QuantityStepper` handles this via `min={1}` prop |
| Route accessed without QR/session | No `guestToken` in `useSettingsStore` | Redirect to QR entry | `router.replace('/qr')` |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Zone A: hero image renders from `product.image_path`; skeleton shows while loading
- [ ] Zone B: name, price, description, availability badge all render correctly
- [ ] Zone C: hidden when `toppings.length === 0`; shown otherwise
- [ ] Zone C: selecting a topping updates the total price in Zone C and Zone E in real time
- [ ] Zone C: multiple toppings can be selected simultaneously
- [ ] Zone C: total uses `price` field (not `price_delta`) for each selected topping
- [ ] Zone D: "−" disabled at quantity = 1; "+" increments correctly
- [ ] Zone E: CTA label shows correct total matching Zone C total × quantity
- [ ] Zone E: tapping CTA dispatches to `useCartStore` and navigates back

### Edge Case Tests
- [ ] `is_available = false` → CTA disabled, "Hết hàng" badge shown
- [ ] Product with 0 toppings → Zone C not rendered
- [ ] Image URL broken → grey placeholder shown (no broken image icon)
- [ ] `quantity = 1` → "−" button is disabled (no decrement below 1)
- [ ] No session (no guestToken) → redirect to `/qr`

### Accessibility Tests
- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] Topping checkboxes are keyboard-navigable (Tab + Space to toggle)
- [ ] Stepper buttons have `aria-label="Giảm số lượng"` / `aria-label="Tăng số lượng"`
- [ ] CTA button has `aria-label` when loading
- [ ] Focus visible on all interactive elements

### Cross-Device Tests
- [ ] Mobile viewport (375px) — primary target
- [ ] Tablet viewport (768px)
- [ ] Desktop (1280px+) — centered max-w container

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| CPD-1 | FE | Scaffold `ProductDetailSkeleton` + page.tsx (ISR) | ⬜ | wireframes/client_product_detail/client_product_detail_wireframe_v1.md |
| CPD-2 | FE | Zone A — `ProductHeroImage` | ⬜ | Zone A |
| CPD-3 | FE | Zone B — `ProductInfo` + `Badge` reuse | ⬜ | Zone B |
| CPD-4 | FE | Zone C — `ToppingSelector` (inline, real-time total) | ⬜ | Zone C |
| CPD-5 | FE | Zone D — `QuantityStepper` reuse + Zone E — `CTAFooter` (sticky) | ⬜ | Zone D · E |
| CPD-6 | FE | `CustomerTopNav` shared component + register in shared index | ⬜ | NAV zone |

---

## 📝 Changelog

**v1 (2026-05-27)**
- Initial scaffold based on `product-detail.excalidraw`
- Zones documented: NAV · A (HeroImage) · B (ProductInfo) · C (ToppingSelector) · D (QtyStepper) · E (CTAFooter)
- Loading skeleton pattern documented
- `QuantityStepper` + `Badge` marked as reuse; `CustomerTopNav` registered as new (shared)

---

*Last Updated: 2026-05-27*
*Approved by: —*
*Next Review: After zone content reviewed with owner*
