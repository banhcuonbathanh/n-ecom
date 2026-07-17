# Customer Order List — Loading States · `/order`

> **TL;DR:** ✅ implemented · **unusual loading story** — the list page itself performs **no async
> fetch**, so there is no spinner and no skeleton for the card grid; it renders empty on first
> paint and fills in synchronously once a `useEffect` reads localStorage. All async loading lives
> **inside the `OrderDetailSheet` overlay**: instant-paint from cache, then `GET /orders/:id`,
> then SSE. While `order` is `null` the sheet shows a centered spinner "Đang tải đơn hàng...";
> after ≥3 failed SSE reconnects a `ConnectionErrorBanner` appears. No `loading.tsx` exists under
> `(shop)/order/` — only the shared `(shop)/loading.tsx` fires during route-level navigation.
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(shop)/order/page.tsx` · `fe/src/features/order/components/OrderDetailSheet.tsx`
> · `fe/src/hooks/useOrderSSE.ts` · `fe/src/app/(shop)/loading.tsx`
>
> Page overview → [customer_order_list.md](customer_order_list.md) ·
> BE view → [customer_order_list_be.md](customer_order_list_be.md) ·
> Cross-page data flow → [customer_order_list_crosspage_dataflow.md](customer_order_list_crosspage_dataflow.md) ·
> Scenario → [SCENARIO_ORDER_HISTORY.md](SCENARIO_ORDER_HISTORY.md)

---

## Loading Layers (outer → inner)

```
1. Route navigation
   └── (shop)/loading.tsx       → centered orange spinner, entire shop shell
       (fires on hard-navigate INTO /order; absent for client-side transitions)

2. OrderListPage mounts
   └── NO Suspense boundary
       NO isLoading state
       NO skeleton
       → renders empty list on first paint;
         useEffect fires → loadCachedOrders() → setOrders(...)
         (synchronous localStorage scan; list fills in on the next React render)

3. OrderDetailSheet opens (per tap on a card)
   └── useOrderSSE: cache read → GET /orders/:id → SSE stream
       While order === null  → centered spinner "Đang tải đơn hàng..."
       After ≥3 SSE failures → ConnectionErrorBanner (above sheet content)
```

---

### Layer 1 — Route-level spinner · `fe/src/app/(shop)/loading.tsx`

Next.js App Router renders `ShopLoading` for **the entire `(shop)` group** during server-side or
hard navigation into any shop page (including `/order`):

- A single `h-64` centered flex container; `h-8 w-8` ring with `animate-spin` and
  `border-t-orange-500`. (`(shop)/loading.tsx:1-7`)
- Not order-specific — shared by all `(shop)` routes (menu, checkout, profile, tracking).
- Does **not** fire during client-side link transitions (e.g. tapping the nav bar from `/menu`);
  those are instant because Next.js prefetches.

**Finding:** No `loading.tsx` exists under `fe/src/app/(shop)/order/` — only the group-level one.
This is correct because the page has no async server-side data to stream; a route-specific
spinner would add no value.

---

### Layer 2 — List page on mount · `fe/src/app/(shop)/order/page.tsx`

`OrderListPage` has **no `isLoading` state and no skeleton**. The card grid is populated by a
`useEffect` that runs exactly once after mount:

```
// page.tsx:33-39
const [orders, setOrders] = useState<Order[]>([])

useEffect(() => {
  setOrders(loadCachedOrders())
}, [])
```

`loadCachedOrders()` (`page.tsx:10-24`) is a **synchronous** localStorage scan: it iterates
`localStorage` keys, filters by the `'order_cache_'` prefix (`STORAGE_KEYS.ORDER_CACHE`,
`storage-keys.ts:3`), parses each JSON blob, and returns the list sorted by `created_at`
descending. The function has no `await` and makes no network call.

**Visible behaviour:**

| Paint | State | Renders |
|---|---|---|
| First render (before effect) | `orders = []` | Empty state: ShoppingBag icon + "Chưa có đơn hàng nào" (`page.tsx:75-87`) |
| After `useEffect` fires (same micro-task queue cycle, next commit) | `orders = [...]` | Card list |

On any device where the orders are cached this "empty flash" is a single browser frame — invisible
in practice. On first ever visit with no cache it is the correct persistent empty state, not a
loading state.

**No `<Suspense>` boundary** is present in `page.tsx`. The page has no `useSearchParams()` or
other SSR-suspending call, so none is needed.

---

### Layer 3 — `OrderDetailSheet` overlay · opened per card tap

When a card is tapped (`page.tsx:100 onClick={() => setSelectedOrderId(order.id)}`), the sheet
mounts and `useOrderSSE(orderId)` runs its three-phase load sequence:

#### Phase A — Instant paint from localStorage cache · `useOrderSSE.ts:33-38`

```
useEffect(() => {
  try {
    const cached = localStorage.getItem(cacheKey(orderId))
    if (cached) setOrder(JSON.parse(cached))
  } catch {}
}, [orderId])
```

`cacheKey(id)` expands to `'order_cache_' + id` (`useOrderSSE.ts:9`, `storage-keys.ts:3`).
If a cache entry exists the sheet renders the **full order detail immediately** — no spinner is
shown at all. The cached data is whatever was last written by the persist effect (`useOrderSSE.ts:41-46`).

#### Phase B — REST snapshot · `useOrderSSE.ts:54-62`

Immediately after mount a `connect()` async function fires:

```
const { data } = await api.get(`/orders/${orderId}`)
if (!stopped) setOrder(data.data)
```

This call hits `GET /api/v1/orders/:id` (traced in `customer_order_list_be.md` §1). If the
REST call returns:

| Result | Behaviour |
|---|---|
| 2xx | `setOrder(data.data)` — overwrites cache with fresh data; spinner (if showing) clears |
| 404 | `setIsNotFound(true)` and `return` — **SSE is never opened** |
| Any other error | error is swallowed; function falls through to SSE phase; spinner stays until SSE succeeds or fails |

#### Phase C — SSE stream · `useOrderSSE.ts:64-143`

After the REST snapshot, `connect()` opens an SSE stream via `fetchEventSource` to
`GET /api/v1/orders/:id/events`. The hook reconnects with **exponential backoff**:

| Config constant | Value | Source |
|---|---|---|
| `maxAttempts` | 5 | `useOrderSSE.ts:17` |
| `baseDelay` | 1 000 ms | `useOrderSSE.ts:18` |
| `maxDelay` | 30 000 ms | `useOrderSSE.ts:19` |
| `showBannerAfter` | 3 | `useOrderSSE.ts:20` |

Reconnect delays follow `min(1000 × 2^(attempt-1), 30000)` — so 1 s, 2 s, 4 s, then capped
at 30 s (`useOrderSSE.ts:136-140`). A successful `onopen` resets `attemptsRef.current = 0` and
clears the banner (`useOrderSSE.ts:76-77`).

**SSE connection error banner** (`useOrderSSE.ts:134`):

```
if (attemptsRef.current >= RECONNECT.showBannerAfter) setConnectionError(true)
```

Once `attemptsRef.current >= 3`, `connectionError` flips to `true`. The sheet renders
`<ConnectionErrorBanner />` **above the scroll area** immediately when this flag is set
(`OrderDetailSheet.tsx:202`):

```tsx
{connectionError && <ConnectionErrorBanner />}
```

The banner is from `fe/src/components/shared/ConnectionErrorBanner.tsx`. It appears even if
the sheet already has cached content visible — the user sees the order data but also the banner
warning.

#### Phase D — `order === null` spinner · `OrderDetailSheet.tsx:206-212`

When no cache entry exists AND the REST call has not yet resolved (or failed silently), `order`
is `null`. The sheet's scrollable content renders:

```tsx
{!order ? (
  <div className="flex items-center justify-center py-16">
    <div className="text-center space-y-3">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-muted-fg text-sm">Đang tải đơn hàng...</p>
    </div>
  </div>
) : (
  /* full order content */
)}
```

- `w-8 h-8` ring, `border-primary / border-t-transparent`, `animate-spin`.
- Message: `"Đang tải đơn hàng..."`.
- Located at `py-16` from the top of the scroll area (below the drag-handle / close bar).

The sheet **header area always renders** regardless of `order` state — the close button and the
drag handle div are outside the `!order` branch (`OrderDetailSheet.tsx:182-200`), so the user
can always close the sheet even while it spins.

---

## Main Content Branch (overlay) · `OrderDetailSheet.tsx:205-417`

After the spinner resolves (i.e. `order !== null`), the sheet renders full content. There is no
intermediate "partial loading" skeleton within the sheet. The content is always either:

| State | What renders |
|---|---|
| `order === null` | Spinner (`OrderDetailSheet.tsx:206-212`) |
| `order !== null` | Full detail: dish rows · summary table · money breakdown · action buttons |

The `useMemo` at `OrderDetailSheet.tsx:78-124` returns all-empty defaults when `!order`, so the
computed display values (`displayRows`, `summaryRows`, etc.) are always safe to render.

---

## Search / Interaction Gating

The list page has **no search, filter, or pagination** — no fetch is gated by user input.

The only interaction that triggers an async load is tapping a card (which mounts `OrderDetailSheet`
and triggers `useOrderSSE`). Until a card is tapped, no network traffic leaves the page.

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **No route-level `loading.tsx` for `/order`** | Only `(shop)/loading.tsx` exists — it fires on hard navigation into the route group but not on client-side transitions. For a page with a synchronous localStorage load this is correct; document this as "by design, no async data". |
| 2 | **Empty-flash on first paint** | `useState<Order[]>([])` initializes empty; the `useEffect` that calls `loadCachedOrders()` runs after the first render (`page.tsx:37-39`). There is a 1-frame "Chưa có đơn hàng nào" empty state visible before orders appear. On typical devices this is imperceptible but it is architecturally present. No skeleton is shown during this window. |
| 3 | **404 leaves the sheet spinner stuck** | `useOrderSSE` sets `isNotFound(true)` on a 404 (`useOrderSSE.ts:60`) but `OrderDetailSheet` destructures only `{ order, progress, connectionError, notification, clearNotification }` (`OrderDetailSheet.tsx:45`) — **`isNotFound` is never read**. Opening a card for a deleted or foreign order with no prior cache entry shows "Đang tải đơn hàng..." indefinitely with no error message and no way out except the close button. Flagged in `customer_order_list_be.md` §Flags row 3. |
| 4 | **Non-404 REST errors fall through to SSE** | When `GET /orders/:id` returns a non-404 error, `connect()` continues to open the SSE stream (`useOrderSSE.ts:61-63` comment: "Non-404 errors: open SSE anyway; spinner stays until SSE also fails"). If SSE then also fails repeatedly, `connectionError` eventually fires (≥3 attempts). Until then, the spinner runs with no user feedback. |
| 5 | **ConnectionErrorBanner appears over cached content** | The banner renders unconditionally above the scroll area whenever `connectionError` is true (`OrderDetailSheet.tsx:202`). If the user had a cache hit (order was painted instantly in Phase A), they see valid stale data AND a connection-error banner simultaneously. There is no logic to suppress the banner when fresh data is already displayed. |
| 6 | **No `<Suspense>` in `order/page.tsx`** | The page has no `useSearchParams()` or similar suspending call, so no Suspense is needed. This is correct; documented here to confirm it was checked. |
