# FE Folder Structure

> `fe/src/` — last updated 2026-05-28.
> Re-generate manually after adding files.

---

## Folder Tree

```
fe/src/
│
├── app/                              ← Next.js App Router pages
│   ├── layout.tsx                    ← Root layout (providers, globals)
│   ├── page.tsx                      ← Root redirect
│   ├── globals.css                   ← Global CSS (Tailwind base)
│   │
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx              ← Staff login
│   │
│   ├── (shop)/                       ← Customer-facing routes
│   │   ├── menu/
│   │   │   ├── page.tsx              ← Menu browsing
│   │   │   ├── settings/
│   │   │   │   └── page.tsx          ← Customer name / table label
│   │   │   ├── product/[id]/
│   │   │   │   └── page.tsx          ← Product detail
│   │   │   └── combo/[id]/
│   │   │       └── page.tsx          ← Combo detail
│   │   ├── checkout/
│   │   │   └── page.tsx              ← Cart review + order placement
│   │   └── order/
│   │       ├── page.tsx              ← Guest order list
│   │       └── [id]/
│   │           └── page.tsx          ← Order tracking (SSE)
│   │
│   ├── (dashboard)/                  ← Staff-facing routes
│   │   ├── kds/
│   │   │   └── page.tsx              ← Kitchen Display System (WS)
│   │   ├── orders/live/
│   │   │   └── page.tsx              ← Live order feed (WS)
│   │   ├── pos/
│   │   │   └── page.tsx              ← Point of Sale
│   │   ├── cashier/payment/[id]/
│   │   │   └── page.tsx              ← Payment processing
│   │   └── admin/
│   │       ├── layout.tsx            ← Admin shell (sidebar + auth guard)
│   │       ├── page.tsx              ← Admin root redirect
│   │       ├── overview/page.tsx     ← Live floor monitor (SSE + WS)
│   │       ├── products/page.tsx     ← Product CRUD
│   │       ├── categories/page.tsx   ← Category CRUD
│   │       ├── toppings/page.tsx     ← Topping CRUD
│   │       ├── combos/page.tsx       ← Combo CRUD
│   │       ├── staff/page.tsx        ← Staff CRUD
│   │       ├── ingredients/page.tsx  ← Ingredient + stock CRUD
│   │       ├── summary/page.tsx      ← Revenue / analytics
│   │       └── marketing/page.tsx    ← QR code management
│   │
│   ├── table/[tableId]/
│   │   └── page.tsx                  ← QR guest entry (POST /auth/guest)
│   ├── welcome/page.tsx              ← Welcome / splash
│   ├── privacy-policy/page.tsx       ← Static page
│   └── terms/page.tsx                ← Static page
│
├── components/
│   ├── ui/                           ← Atoms (shadcn/ui base)
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   └── progress-bar.tsx
│   │
│   ├── shared/                       ← Cross-page shared components
│   │   ├── ConnectionErrorBanner.tsx
│   │   ├── CookieConsent.tsx
│   │   ├── CustomerTopNav.tsx
│   │   ├── DateRangePicker.tsx
│   │   ├── EmptyState.tsx
│   │   ├── KPICard.tsx
│   │   ├── QuantityStepper.tsx
│   │   └── StatusBadge.tsx
│   │
│   ├── product-detail/               ← Product detail page components
│   │   ├── CTAFooter.tsx
│   │   ├── ProductDetailSkeleton.tsx
│   │   ├── ProductHeroImage.tsx
│   │   ├── ProductInfo.tsx
│   │   └── ToppingSelector.tsx
│   │
│   ├── marketing/                    ← Marketing dashboard components
│   │   ├── BudgetDonutChart.tsx
│   │   ├── BudgetSummaryCards.tsx
│   │   ├── CampaignTimeline.tsx
│   │   ├── LoveScoreSection.tsx
│   │   ├── MarketingPageHeader.tsx
│   │   └── SpendBreakdownTable.tsx
│   │
│   └── guards/                       ← Route protection
│       ├── AuthGuard.tsx
│       └── RoleGuard.tsx
│
├── features/
│   ├── auth/
│   │   ├── auth.api.ts               ← login · refresh · logout · me
│   │   └── auth.store.ts             ← useAuthStore (Zustand, memory only)
│   ├── menu/
│   │   └── components/               ← Menu-domain components
│   │       ├── CartDrawer.tsx
│   │       ├── CategoryTabs.tsx
│   │       ├── ComboCard.tsx
│   │       ├── ComboModal.tsx
│   │       ├── ProductCard.tsx
│   │       └── ToppingModal.tsx
│   ├── order/
│   │   └── components/               ← Order-domain components
│   │       └── OrderDetailSheet.tsx
│   └── admin/
│       ├── admin.api.ts              ← All admin CRUD calls
│       ├── overview.helpers.ts       ← Overview page helpers
│       ├── summary.store.ts          ← useSummaryStore (range filter)
│       └── components/
│           ├── OrderDetail.tsx
│           ├── PrepPanel.tsx
│           ├── StatCards.tsx
│           ├── TableGrid.tsx
│           └── WaitingSection.tsx
│
├── hooks/                            ← Shared realtime hooks
│   ├── useAdminSSE.ts                ← SSE: GET /sse/admin
│   ├── useMarketingSpend.ts          ← TanStack Query: GET /admin/marketing/spend
│   ├── useOrderSSE.ts                ← SSE: GET /orders/:id/events (5-retry)
│   └── useOverviewWS.ts             ← WS: /ws/kds
│
├── store/                            ← Global Zustand stores
│   ├── cart.ts                       ← useCartStore
│   ├── favourites.ts                 ← useFavouritesStore (persist: 'favourites')
│   └── settings.ts                   ← useSettingsStore (persist: 'customer-settings')
│
├── lib/
│   ├── api-client.ts                 ← Axios instance + JWT interceptor
│   ├── providers.tsx                 ← QueryClientProvider + other providers
│   ├── storage-keys.ts               ← ALL localStorage key constants (single source)
│   └── utils.ts                      ← formatVND(), cn(), etc.
│
└── types/                            ← Shared TypeScript interfaces
    ├── auth.ts
    ├── cart.ts
    ├── marketing.ts
    ├── order.ts
    ├── product.ts
    └── staff.ts
```

---

## Route Groups

| Route Group | Path prefix | Audience | Auth |
|---|---|---|---|
| `(auth)` | `/login` | Staff | Public |
| `(shop)` | `/menu`, `/checkout`, `/order/*` | Guest | Guest JWT |
| `(dashboard)` | `/kds`, `/pos`, `/cashier/*`, `/admin/*` | Staff | Staff JWT + RBAC |
| _(none)_ | `/table/:tableId`, `/welcome`, `/privacy-policy`, `/terms` | Anyone | Public |

---

## Storage Keys (`lib/storage-keys.ts`)

| Constant | Value | Used By |
|---|---|---|
| `STORAGE_KEYS.COOKIE_CONSENT` | `'cookie_consent_accepted'` | `CookieConsent.tsx` |
| `STORAGE_KEYS.ORDER_CACHE` | `'order_cache_'` (prefix) | `useOrderSSE.ts` |
| `STORAGE_KEYS.FAVOURITES` | `'favourites'` | `store/favourites.ts` |
| `STORAGE_KEYS.CUSTOMER_SETTINGS` | `'customer-settings'` | `store/settings.ts` |
| `STORAGE_KEYS.CART_CONFIG` | `'cart-config'` | cart-related (reserved) |

---

## Store Fields

> Read this section instead of opening individual store files during Phase 1 audits.
> Regenerated by `/codebase-graph fe` when any `store/*.ts` file changes.

| Store | Hook | State fields | Actions | Persist key |
|---|---|---|---|---|
| `store/cart.ts` | `useCartStore` | `items: CartItem[]` · `tableId: string\|null` · `activeOrderId: string\|null` · `paymentMethod: string\|null` | `addItem(item)` · `removeItem(id)` · `updateQty(id, qty)` · `clearCart()` · `setTableId(id)` · `setActiveOrderId(id)` · `setPaymentMethod(m)` · `total()` · `itemCount()` | none (memory only) |
| `store/favourites.ts` | `useFavouritesStore` | `ids: string[]` | `toggle(id)` · `isFavourite(id)` | `FAVOURITES` |
| `store/settings.ts` | `useSettingsStore` | `customerName: string` · `tableLabel: string` | `setCustomerName(name)` · `setTableLabel(label)` | `CUSTOMER_SETTINGS` |
| `features/auth/auth.store.ts` | `useAuthStore` | memory only — open file for fields | — | none |
| `features/admin/summary.store.ts` | `useSummaryStore` | admin range filter — open file for fields | — | none |

---

## State Layer Summary

| Layer | Tool | Persisted | Files |
|---|---|---|---|
| Server state | TanStack Query | No | per-page `useQuery` / `useMutation` |
| Auth state | Zustand (memory) | No | `features/auth/auth.store.ts` |
| Cart state | Zustand (memory) | No | `store/cart.ts` |
| Settings | Zustand + localStorage | Yes | `store/settings.ts` |
| Favourites | Zustand + localStorage | Yes | `store/favourites.ts` |
| Summary range | Zustand (memory) | No | `features/admin/summary.store.ts` |
| Forms | RHF + Zod | No | per-page |
