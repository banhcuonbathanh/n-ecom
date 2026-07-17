# Claude Guidelines — Client — Chi tiết sản phẩm

> Read this before implementing `/(shop)/menu/product/[id]`.

---

## Spec Summary

- Mobile product detail page for `/(shop)/menu/product/[id]`; 5 zones, 0 modals
- Zone A: full-width hero image (390×220) via `next/image` fill + `object-cover`; animate-pulse skeleton on load
- Zone B: product name, "✓ Còn hàng" badge, price (orange), short description
- Zone C: inline 2-column topping grid (conditional on `product.toppings.length > 0`); multi-select; real-time total calculated from `price` field, not `price_delta`
- Zone D: quantity stepper ("Số lượng" label + −/1/+); reuses shared `QuantityStepper`
- Zone E: sticky bottom CTA "Thêm vào giỏ hàng · {total} ₫"; dispatches to `useCartStore`

**Key constraint:** Topping prices use the `price` field — NOT `price_delta`. This is explicitly called out in the excalidraw. Using `price_delta` would produce incorrect totals.

---

## Shared Components — Reuse Checklist

> Components marked `new (shared)` must be registered in `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md` before implementation starts.

| Component | Tier | File | Register in Index? |
|-----------|------|------|--------------------|
| `CustomerTopNav` | Tier 2 — shared | `components/shared/CustomerTopNav.tsx` | ✅ Yes — already registered in this session |
| `QuantityStepper` | Tier 2 — shared | `components/shared/QuantityStepper.tsx` | ✅ Already registered (used by client_favourite_page) |
| `Badge` | Tier 1 — UI atom | `components/ui/badge.tsx` | ✅ Already registered |

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|---------------|-----|
| Product + toppings | TanStack Query `['products', id]` | Shared server cache; ISR prefetched. Same key as Favourites page — do NOT create a new key. |
| Selected topping IDs | `useState<string[]>` (local) | Page-scoped selection — no cross-page sharing needed |
| Quantity | `useState<number>` (local, min 1) | Page-scoped — cleared when leaving page |
| Cart items | `useCartStore.addItem()` | Write-only from this page; `useCartStore` already exists |
| Session / table | `useSettingsStore` (read only) | `guestToken` check at mount; `tableLabel` for context |
| Computed total | Derived in render | `(product.price + toppingSum) × quantity` — never stored |

---

## Performance Checklist

- [ ] Code split: App Router automatic per page
- [ ] Images: `next/image` only — use `fill` + `object-cover` + `sizes="100vw"` for Zone A
- [ ] Use `aspect-[16/9] w-full` wrapper div for Zone A instead of fixed `h-[220px]`
- [ ] Lists > 20 (toppings): unlikely — typical product has ≤ 8 toppings, no virtualization needed
- [ ] API calls: TanStack Query — no useEffect+fetch combos
- [ ] ISR prefetch in `page.tsx` means zero loading flash on first paint for cached product IDs
- [ ] Animations: `prefers-reduced-motion` check on `animate-pulse` skeleton

---

## Cross-Page Notes

| Direction | Page | What's shared |
|-----------|------|---------------|
| Navigates FROM | `/(shop)/menu` | User taps ProductCard → push to this route |
| Navigates TO | `/(shop)/menu` | `router.back()` after add-to-cart (confirm this is correct) |
| Writes to | `useCartStore` | `addItem()` with product + topping selection + quantity |
| Reads from | `useSettingsStore` | `guestToken` (guard) · `tableLabel` (context) |
| Shares cache | `/(shop)/menu/favourites` | `['products', id]` key is shared — mutation by admin would refetch both |

---

## Non-Obvious Implementation Notes

1. **`price` not `price_delta`** — the excalidraw explicitly annotates "price field, not price_delta" on Zone C. Confirm in `GET /api/v1/products/:id` response shape which field name the BE uses. If BE returns `extra_price` or another name, update the `Topping` interface — do NOT assume `price_delta`.

2. **Sticky bottom on iOS** — `position: sticky; bottom: 0` with `pb-[env(safe-area-inset-bottom)]` is required for Zone E to clear the iPhone home indicator. Using `position: fixed` causes the zone to overlap the keyboard on input fields.

3. **`router.back()` edge case** — If user navigates directly to `/menu/product/[id]` without a history entry (deep link, QR shortcut), `router.back()` silently fails. Add a fallback: `window.history.length > 1 ? router.back() : router.push('/menu')`.

4. **ISR dynamic segment** — Next.js 14 generates `[id]` pages on first request then caches. If you want to pre-render popular items, add `generateStaticParams` returning top product IDs. Not required for v1.

5. **`useCartStore.addItem` payload** — pass `toppingIds: string[]` not the full topping objects. The cart reconstructs names/prices from the query cache when displaying the CartDrawer — avoids stale price snapshots in cart.

6. **Zone C total display** — The excalidraw shows "Tổng: 45,000 + 10,000 = 55,000 ₫". The recommend.md suggests simplifying this. Confirm with owner before implementing — the current verbose format may be intentionally transparent about the maths.

---
*Created: 2026-05-27*
