# Loading Patterns

> **TL;DR** — All loading/error/empty states follow a consistent pattern. TanStack Query's
> `isLoading` / `isError` drives data states. Empty lists use `<EmptyState>`. SSE/WS connection
> failures show `<ConnectionErrorBanner>` after 3 retries. Buttons show `disabled` + spinner
> during mutations. No `Suspense` boundaries are used at the page level.

---

## TanStack Query — Standard Data State Pattern

Every data-fetching component follows the same three guards before rendering content:

```tsx
const { data, isLoading, isError } = useQuery({
  queryKey: ['products', categoryId],
  queryFn:  () => api.get('/products').then(r => r.data.data),
  staleTime: 5 * 60 * 1000,
})

// 1. Loading state — skeleton or spinner
if (isLoading) return <LoadingSkeleton />

// 2. Error state — error message or retry button
if (isError) return (
  <EmptyState icon="⚠️" message="Không thể tải dữ liệu. Kiểm tra kết nối." />
)

// 3. Empty state — friendly message
if (!data?.length) return (
  <EmptyState message="Chưa có sản phẩm nào." />
)

// 4. Normal render
return <ProductList products={data} />
```

---

## EmptyState Component

Used for loading error, no data, and no search results. Single source of truth for empty visuals.

```tsx
// fe/src/components/shared/EmptyState.tsx
interface Props {
  icon?:    string    // default: '🍜'
  message:  string
}
// Usage:
<EmptyState message="Chưa có đơn hàng nào." />
<EmptyState icon="⚠️" message="Không thể tải dữ liệu." />
```

---

## Loading Skeletons

There is no shared `<Skeleton>` primitive. Each page implements its own inline skeleton using Tailwind `animate-pulse`:

```tsx
// Example pattern (product card skeleton)
function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-lg p-4 animate-pulse">
      <div className="h-32 bg-muted rounded mb-3" />
      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
      <div className="h-3 bg-muted rounded w-1/4" />
    </div>
  )
}
```

Admin pages (products, staff, categories) typically show a simple `"Đang tải..."` text span rather than a full skeleton grid — this is an area where the codebase is inconsistent.

---

## SSE Reconnect UX

Both SSE hooks (`useOrderSSE`, `useOrderMonitorSSE`, `useAdminSSE`) share the same exponential backoff config:

```ts
const RECONNECT = {
  maxAttempts:     5,
  baseDelay:       1000,    // ms — doubles each retry
  maxDelay:        30_000,  // ms cap
  showBannerAfter: 3,       // show ConnectionErrorBanner after 3 failures
}
```

When `attempts >= showBannerAfter`, the component renders `<ConnectionErrorBanner>`:

```tsx
// fe/src/components/shared/ConnectionErrorBanner.tsx
export function ConnectionErrorBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 text-sm z-50">
      ⚠️ Mất kết nối — đang thử lại...
    </div>
  )
}

// Usage in order tracking page:
const { order, connectionError } = useOrderSSE(orderId)
return (
  <>
    {connectionError && <ConnectionErrorBanner />}
    {/* ... */}
  </>
)
```

`useOrderMonitorSSE` also exposes a `reconnect()` callback and `isUnauthorized` flag for cases where the token expired mid-session (auth failures stop retries immediately rather than exponentially retrying).

---

## Button Pending States

Mutations use the `isPending` (TanStack Query v5) flag to disable and visually indicate loading:

```tsx
const mutation = useMutation({
  mutationFn: (payload) => api.post('/orders', payload).then(r => r.data.data),
  onSuccess:  () => { cartStore.clearCart(); router.push(`/order/${data.id}`) },
})

<button
  onClick={() => mutation.mutate(payload)}
  disabled={mutation.isPending}
  className="bg-primary text-white h-11 px-6 rounded-lg disabled:opacity-60"
>
  {mutation.isPending ? 'Đang gửi...' : 'Đặt hàng'}
</button>
```

The pattern is consistent across checkout, POS, and admin CRUD forms.

---

## Optimistic Updates

The cart store provides instant UI feedback before any API call — adding an item to the cart updates the Zustand store immediately (no network wait). This is implicit optimism: the store update is local and the API call happens separately.

No explicit TanStack Query `optimisticUpdate` / `onMutate` rollback pattern is used in the current codebase. Admin CRUD operations (product create/update) wait for the server response before showing success.

**Menu ISR (client_menu_page):** The menu `page.tsx` uses `export const revalidate = 300` (5-minute ISR) and prefetches categories/products/combos via `HydrationBoundary`. This means the first paint contains pre-rendered data — no loading state for menu content on first load.

---

## Suspense

No React `<Suspense>` boundaries are used at the page or layout level. All loading states are handled inline with `isLoading` guards as shown above.

---

## WebSocket UX (KDS / Overview)

WebSocket-connected pages (`/kds`, `/admin/overview`) use `useOverviewWS` which reads connection status from `OrdersWSContext`:

```ts
const connected = useOverviewWS()  // returns boolean | null
// null = connecting, true = connected, false = disconnected
```

The KDS page plays a short Web Audio API beep on `new_order` events (no external dep). Reconnect uses the same exponential backoff as SSE.

---

## Realtime Order Progress Bar

`useOrderSSE` computes progress as a memo:

```ts
const progress = useMemo(() => {
  if (!order?.items?.length) return 0
  const total  = order.items.reduce((s, i) => s + i.quantity, 0)
  const served = order.items.reduce((s, i) => s + i.qty_served, 0)
  return total === 0 ? 0 : Math.round((served / total) * 100)
}, [order])
// Rendered with <ProgressBar value={progress} />
```

---

## Deep Dive Sources

- `fe/src/components/shared/EmptyState.tsx` — empty state component
- `fe/src/components/shared/ConnectionErrorBanner.tsx` — SSE error banner
- `fe/src/hooks/useOrderSSE.ts` — SSE backoff + progress computation
- `fe/src/hooks/useOrderMonitorSSE.ts` — auth-aware SSE with reconnect()
- `fe/src/components/ui/progress-bar.tsx` — progress bar atom
- `fe/src/app/(shop)/menu/page.tsx` — ISR + HydrationBoundary pattern in production (described in §Menu ISR above)
