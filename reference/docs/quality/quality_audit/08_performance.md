# Performance & UX Audit — ASPECT 8

## Verdict

The most impactful performance problem is `ProductCard` and `ProductGridCard` subscribing to the full Zustand cart store on every render — on a menu page with 20+ products, any cart change (add/remove one item) triggers a re-render of every visible card because there is no `React.memo` or selector narrowing. On the SSE-updated pages (KDS, admin overview), all cards re-render on every WebSocket push because order arrays are replaced wholesale with `setOrders(prev => ...)`. The `"use client"` over-use is moderate but not the worst offender in this stack. No heavy third-party chart libraries are imported eagerly — the donut chart is hand-rolled SVG. The main UX issues are the unoptimised payment QR `<img>` tag and a stale `NEXT_PUBLIC_STORAGE_URL` env mismatch that silently breaks all product images (also a security finding SEC-6).

---

## Findings

### PF-1 — `ProductCard` and `ProductGridCard` re-render on every cart mutation
**Status:** ⬜
**Severity:** 🟠 Major
**Files:** `fe/src/features/menu/components/ProductCard.tsx` lines 17–18; `fe/src/features/menu/components/ProductGridCard.tsx` (same pattern)

```ts
const { items, addItem, updateQty } = useCartStore()
```

Both card components subscribe to the entire `items` array from Zustand. When the user adds or removes any item, Zustand emits a new object reference for the whole store, re-rendering every `ProductCard` and `ProductGridCard` on the page. With 20–40 products visible, this is 20–40 re-renders per interaction. The cart grid also has no `React.memo` wrapper.

**Fix — two steps:**
1. Use a narrowed selector: `const cartItem = useCartStore(s => s.items.find(i => i.id === cartId))` and `const addItem = useCartStore(s => s.addItem)` separately. Zustand only re-renders if the selected value changes reference.
2. Wrap each card in `React.memo`: `export const ProductCard = React.memo(function ProductCard({ product }: Props) { … })`.

---

### PF-2 — KDS order cards re-render on every WebSocket message
**Status:** ⬜
**Severity:** 🟠 Major
**File:** `fe/src/app/(dashboard)/kds/page.tsx` lines 195–295 (the `orders.map` block)

KDS receives WebSocket messages roughly every few seconds per table. Each message replaces the `orders` array reference via `setOrders(prev => prev.map(…))`. Because each KDS ticket card is an inline JSX block (not a memoised component), all visible tickets re-render on every message even if their own order data did not change. On a busy lunch service with 8–12 simultaneous orders, this is 8–12 full DOM diffs per update.

**Fix:** Extract the KDS ticket to a `React.memo` component keyed by `order.id`. Zustand/state comparisons will prevent re-renders for unchanged orders:
```tsx
const KDSTicket = React.memo(function KDSTicket({ order, ... }: TicketProps) { ... })
```

---

### PF-3 — `admin/layout.tsx` is a `"use client"` component that wraps the entire admin section
**Status:** ⬜
**Severity:** 🟠 Major
**File:** `fe/src/app/(dashboard)/admin/layout.tsx` line 1

The admin layout is a client component containing only navigation links, a pathname check, and theme state. This forces every child admin page to be client-side, even purely static admin pages that could be server-rendered (e.g., the categories page which just fetches data). A server-component layout with a `"use client"` nav bar extracted as a separate component would allow admin pages to benefit from RSC streaming.

**Fix:** Move `AuthGuard`, `RoleGuard`, the theme toggle, and the nav bar into a `"use client"` `<AdminNav>` component. Keep the layout itself as a server component that renders `<AdminNav>{children}</AdminNav>`.

---

### PF-4 — Payment page uses `<img>` for QR code instead of `next/image`
**Status:** ⬜
**Severity:** 🟡 Minor
**File:** `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx` lines 255–259

```tsx
{/* eslint-disable-next-line @next/next/no-img-element */}
<img
  src={payment.qr_code_url}
  alt="QR thanh toán"
  className="w-56 h-56 rounded-xl border border-border"
/>
```

The raw `<img>` tag bypasses Next.js image optimisation. The `qr_code_url` is a gateway-provided URL (VNPay/MoMo/ZaloPay) at an external origin — `next/image` requires the domain to be in `next.config.js`'s `images.remotePatterns`. Since these are payment-flow images the sizing is fixed (56×56 Tailwind = 224px), making this a low-impact issue in isolation, but the eslint-disable comment acknowledges the violation.

**Fix:** Add the payment gateway CDN domains to `next.config.js` `images.remotePatterns` and use `<Image src={payment.qr_code_url} width={224} height={224} alt="QR thanh toán" />`.

---

### PF-5 — `JobGuideCard` (training page) uses `<img>` for cover images with no lazy loading
**Status:** ⬜
**Severity:** 🟡 Minor
**File:** `fe/src/components/admin/training/JobGuideCard.tsx` lines 21–30

```tsx
<img
  src={guide.coverImageUrl}
  alt={guide.title}
  className="w-full h-full object-cover"
  onError={...}
/>
```

This is a raw `<img>` with no `loading="lazy"`, no `width`/`height`, and no optimisation. The training page may display a grid of many guide cards simultaneously. Without lazy loading, all cover images (potentially served from an external URL) are fetched immediately on mount.

**Fix:** Replace with `<Image>` from `next/image` with `fill` prop (the parent has `relative h-36`), or at minimum add `loading="lazy"` to the raw `<img>`.

---

### PF-6 — `useOrderSSE` captures stale `token` in SSE closure
**Status:** ⬜
**Severity:** 🟡 Minor
**File:** `fe/src/hooks/useOrderSSE.ts` lines 48–150

The `useEffect` that opens the SSE connection has `[orderId, token]` in its dependency array. This means when the token refreshes (the interceptor calls `setAccessToken`), the effect re-fires: it tears down the existing SSE connection and opens a new one. For a 2-hour guest session with no refresh this is fine, but for staff sessions with 24-hour access tokens and automatic refresh, any 401-triggered token refresh mid-session will disconnect and reconnect the SSE stream (visible as a brief "MẤT KẾT NỐI" banner). This is more of a UX disruption than a bug.

**Fix:** Use a `tokenRef = useRef(token)` that is updated in a separate effect, and read from `tokenRef.current` inside the SSE connection closure so the effect dependency is only `[orderId]`.

---

## What's Already Good

- No heavy third-party chart libraries (Recharts, Chart.js, D3, Victory) are imported. The marketing page's donut chart is a hand-rolled SVG component (`BudgetDonutChart.tsx`), adding ~0 bundle cost.
- Heavy admin modals (`ProductFormModal`, `ToppingFormModal`, `StaffDetailDrawer`, etc.) are correctly loaded with `next/dynamic` — they do not appear in the initial JS bundle.
- Menu page product images use `next/image` with correct `fill` and `sizes` props (`ProductCard.tsx:59`, `ProductGridCard.tsx:57`), optimising LCP.
- The `useMemo` for combo enrichment in `menu/page.tsx` (lines 86–105) correctly avoids recomputing on every render.
- `OrdersWSContext` uses a stable `handlersRef` with a ref-based subscription pattern — adding/removing handlers never causes the WS connection to reconnect.
- `useCartStore` `partialize` correctly limits persistence to `orderNote` and `activeOrderId` — cart items (which can be large) are session-only and do not bloat `localStorage`.
