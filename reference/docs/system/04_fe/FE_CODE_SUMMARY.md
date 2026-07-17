# FE Code Summary

> **TL;DR** — Concrete inventory of every Zustand store, shared query hook, lib utility,
> and reusable component. Use this as a lookup before creating anything new — the store
> or component you need almost certainly already exists.

---

## Zustand Stores

| Store | File | Persisted? | Key State |
|---|---|---|---|
| `useAuthStore` | `fe/src/features/auth/auth.store.ts` | No (memory-only) | `user`, `accessToken` |
| `useCartStore` | `fe/src/store/cart.ts` | Yes — `orderNote`, `activeOrderId` only | `items[]`, `tableId`, `tableName`, `activeOrderId`, `paymentMethod`, `orderNote` |
| `useFavouritesStore` | `fe/src/store/favourites.ts` | Yes — full store | `items[]` (FavouriteItem), `sets[]` (FavouriteSet) |
| `useSettingsStore` | `fe/src/store/settings.ts` | Yes — `CUSTOMER_SETTINGS` key | `customerName`, `tableLabel` |
| `useThemeStore` | `fe/src/store/theme.ts` | Yes — `admin-theme` key | `dark` (boolean) |
| `useTrainingStore` | `fe/src/store/trainingStore.ts` | No | `activeRole`, `selectedGuideId` |
| `useSummaryStore` | `fe/src/features/admin/summary.store.ts` | No | `range` (SummaryRange: 'today'\|'week'\|'month') |

### Cart Store — State Shape Detail

```ts
// fe/src/store/cart.ts  (persist v5 — only orderNote + activeOrderId survive reload)
interface CartState {
  items:         CartItem[]         // cart lines (product or combo)
  tableId:       string | null      // set by QR scan
  tableName:     string | null
  activeOrderId: string | null      // set after checkout — enables "add more items" flow
  paymentMethod: string | null      // UI-only, NOT sent to API
  orderNote:     string             // order-level note (persisted)
  // actions: addItem, removeItem, updateQty, updateComboItem, clearCart,
  //          setTableId, setTableName, setActiveOrderId, setPaymentMethod,
  //          setOrderNote, setCanhQty
  // computed: total(), itemCount()
}
```

> `CartItem`'s own field shape is not listed here — its single home is [OBJECT_MODEL_ORDER.md §2.1](../02_spec/object/OBJECT_MODEL_ORDER.md) (Rule #9). This block documents the store *wrapper*, not the item model.

**Key rule:** `items[]` is NOT persisted (session-only). Only `orderNote` and `activeOrderId` survive page reload. `paymentMethod` is for UI display only — never included in the POST /orders body.

### Auth Store — State Shape Detail

```ts
// fe/src/features/auth/auth.store.ts  (no persistence — memory-only for security)
interface AuthState {
  user:          User | null
  accessToken:   string | null
  setAuth:       (user: User, token: string) => void
  setAccessToken:(token: string) => void
  clearAuth:     () => void
}
```

---

## Shared Query Hooks (`fe/src/hooks/`)

| Hook | File | What it fetches | Key query key |
|---|---|---|---|
| `useOrderSSE` | `useOrderSSE.ts` | REST GET + SSE stream for one order; returns `{ order, progress, connectionError, notification }` | N/A (SSE, not TQ) |
| `useAdminSSE` | `useAdminSSE.ts` | SSE stream `/sse/admin` — fires `onNewOrder` callback on `new_order` events | N/A (SSE) |
| `useOverviewWS` | `useOverviewWS.ts` | Reads WS from `OrdersWSContext`; patches `['orders', 'live']` query cache via `setQueryData` | `['orders', 'live']` |
| `useOrderMonitorSSE` | `useOrderMonitorSSE.ts` | SSE `/sse/order-monitor/:id` — order status, queue position, table statuses | N/A (SSE) |
| `useProductDetail` | `useProductDetail.ts` | `GET /products/:id` | `['products', id]` |
| `useMarketingSpend` | `useMarketingSpend.ts` | `GET /admin/marketing/spend?from&to` | `['marketing', 'spend', dateRange]` |
| `useCustomerProfile` + `useUpdateProfile` | `useCustomerProfile.ts` | `GET /customer/profile` + `PUT` | `['customer', 'profile']` |
| `useJobGuides` + `useGuideProgress` + `useCreateGuide` + … | `useTrainingQueries.ts` | Training guides + progress | `['training', …]` |
| `useTodoTasks` + `useTaskStats` + `useCreateTask` | `useTodoTasks.ts` | Staff tasks by date | `['admin', 'tasks', …]` |

---

## Lib Utilities (`fe/src/lib/`)

| File | What it provides |
|---|---|
| `api-client.ts` | `api` — Axios instance with Bearer interceptor + 401→refresh→retry |
| `storage-keys.ts` | `STORAGE_KEYS` constant — ALL localStorage key strings (see DATA_COMMUNICATION.md) |
| `order-payload.ts` | `buildOrderItemsPayload(items)` — SINGLE builder that converts `CartItem[]` → `OrderItemPayload[]` for POST /orders |
| `providers.tsx` | `<Providers>` — wraps `QueryClientProvider` (default `staleTime: 60s, retry: 1`) |
| `utils.ts` | `cn()` (class merging), `formatVND(amount)` (formats to Vietnamese currency) |

---

## Shared Components (`fe/src/components/shared/`)

| Component | Props summary | Purpose |
|---|---|---|
| `StatusBadge` | `status: OrderStatus, className?` | Color-coded pill for order status (pending/confirmed/preparing/ready/delivered/cancelled/paid) |
| `EmptyState` | `icon?: string, message: string` | Centered empty-state placeholder with icon + text |
| `ConnectionErrorBanner` | (none) | Fixed top red banner — shown after 3+ SSE/WS failures |
| `QuantityStepper` | `value, min?, max?, onChange, size?` | +/− quantity control, 44px touch targets |
| `KPICard` | `label, value, badge?, badgeVariant?, subLabel?` | Admin KPI metric card |
| `Pagination` | `currentPage, totalPages, onPageChange` | Page navigation control |
| `CustomerTopNav` | `title, cartCount?, onBack` | Sticky top nav for client pages |
| `ClientBottomNav` | — | Bottom tab bar for client (shop) area |
| `ClientMainBottomNav` | — | Alternate bottom nav for main client pages |
| `DateRangePicker` | — | Date range selector for admin analytics |
| `TableLayoutMap` | — | Visual floor-plan grid of tables |
| `TaskPriorityBadge` | — | Priority badge for task management |
| `TaskStatusBadge` | — | Status badge for task management |
| `ThemeToggle` | — | Dark/light theme switch |
| `CookieConsent` | — | Cookie consent banner |
| `DevPanel` | — | Development tools panel (dev only) |

---

## UI Atoms (`fe/src/components/ui/`)

| Component | Notes |
|---|---|
| `button.tsx` | Primary/secondary/ghost variants |
| `card.tsx` | `Card, CardHeader, CardContent, CardFooter` |
| `input.tsx` | Styled form input |
| `label.tsx` | Form label |
| `badge.tsx` | Generic badge |
| `progress-bar.tsx` | Horizontal progress bar |

---

## Key Feature Components

### Menu (`fe/src/features/menu/components/`)
`MenuHeader` · `MiniCartStrip` · `RestaurantBanner` · `AddToOrderBanner` · `SearchBar` · `CategoryTabs` · `FavouritesRail` · `ComboSection` · `ComboCard` · `ComboModal` · `ProductList` · `ProductCard` · `ProductGridCard` · `ToppingModal` · `DrinkCustomize` · `OrderSummary` · `OrderNote` · `CartBottomBar` · `CartDrawer` · `TableConfirmModal`

### Admin (`fe/src/features/admin/components/`)
`WaitingSection` · `PrepPanel` · `TableList` · `TableGrid` · `StatCards` · `OrderDetail` · `HistoryLog` · `CancelLog` · `PaidLog`

### Guards (`fe/src/components/guards/`)
`AuthGuard` — redirects to `/login` if no session. `RoleGuard` — renders 403 if `role_value < minRole`.

---

## Deep Dive Sources

- `fe/src/store/` — all Zustand store source files
- `fe/src/hooks/` — all query hook source files
- `fe/src/lib/` — api-client, order-payload, storage-keys
- `fe/src/components/shared/` + `fe/src/components/ui/` — component source
