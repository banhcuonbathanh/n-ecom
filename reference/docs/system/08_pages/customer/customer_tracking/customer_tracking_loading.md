# Customer Tracking — Loading States

> **TL;DR:** ✅ implemented · how `/tracking` behaves while data is in flight.
> Two parallel tracks: (1) a TanStack query for the order detail record, with four priority-ordered
> branches including a full-page animated skeleton; (2) an SSE connection that is **non-blocking** —
> the page renders content even before SSE establishes, and shows a fixed banner when it is
> disconnected. There is **no** route-level `loading.tsx` for this page; the page owns its own
> skeleton at `page.tsx:111–123`.
>
> Page overview → [customer_tracking.md](customer_tracking.md) ·
> BE view → [customer_tracking_be.md](customer_tracking_be.md) ·
> Cross-component data flow → [customer_tracking_crosscomponent_dataflow.md](customer_tracking_crosscomponent_dataflow.md) ·
> Scenario → [SCENARIO_TRACK_ORDER.md](SCENARIO_TRACK_ORDER.md)
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(shop)/tracking/page.tsx` · `fe/src/hooks/useOrderMonitorSSE.ts` ·
> `fe/src/app/(shop)/tracking/components/MonitoringTopBar.tsx` ·
> `fe/src/app/(shop)/tracking/components/TableInfoBanner.tsx` ·
> `fe/src/app/(shop)/tracking/components/OrderDetailCard.tsx` ·
> `fe/src/app/(shop)/tracking/components/WholeFloorPrepList.tsx` ·
> `fe/src/components/shared/ConnectionErrorBanner.tsx` ·
> `fe/src/app/(shop)/loading.tsx`

---

## Loading Layers (outer → inner)

```
1. Route navigation → ShopLoading (shared (shop) spinner; not tracking-specific)
2. No tracking-level loading.tsx exists — the page manages its own skeleton
3. page.tsx guard: orderId gate (no-order fallback) — evaluated synchronously from Zustand
4. page.tsx branches: isError → 404 card | isUnauthorized → 401 card | isLoading → skeleton | live
5. SSE layer (parallel, non-blocking): sseConnected drives MonitoringTopBar dot + ConnectionErrorBanner
```

### 1 — Route-level spinner · `fe/src/app/(shop)/loading.tsx`

Next.js App Router renders this file for **the whole `(shop)` route group** during server-side
navigation into any shop page (including `/tracking`). It is a single centered spinner:

- `flex h-64 items-center justify-center` · `h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500`.
- Not tracking-specific — shared by all `(shop)` routes.

### 2 — No tracking-level route loader

`fe/src/app/(shop)/tracking/` contains **no `loading.tsx`** file. The tracking page does not
delegate its loading UI to the App Router convention; instead it renders its own skeleton inline
(see layer 4 below).

### 3 — Zustand gate (synchronous, pre-fetch) · `page.tsx:18,48–66`

Before any network request fires, the component reads `activeOrderId` from the cart store:

```
page.tsx:18   const orderId = useCartStore(s => s.activeOrderId)
page.tsx:29   enabled: !!orderId
page.tsx:48–66  if (!orderId) → full-screen "no active order" fallback
```

This is **not a loading state** — it is a guard evaluated synchronously on mount. If `orderId` is
falsy the TanStack query is never enabled and no network call is made. The screen shows a static
full-page fallback (AlertTriangle icon + "Không có đơn hàng đang hoạt động" + "Về trang menu"
button) rather than any spinner.

### 4 — Per-query state branches · `page.tsx:21–34, 69–123`

One TanStack query drives the entire order-detail region:

| Property | Value | Source |
|---|---|---|
| `queryKey` | `['order', orderId]` | `page.tsx:22` |
| `staleTime` | `0` (always stale — refetch on every mount) | `page.tsx:27` |
| `refetchOnWindowFocus` | `false` | `page.tsx:28` |
| `enabled` | `!!orderId` | `page.tsx:29` |
| 404 retry skip | `status !== 404 && count < 3` | `page.tsx:30–33` |

The page evaluates four branches in strict source order (first match wins):

| Priority | Condition | Renders | Lines |
|---|---|---|---|
| 1 | `!orderId` | Guard fallback (see layer 3) | `page.tsx:48–66` |
| 2 | `isError && !order` | 404-card fallback | `page.tsx:69–87` |
| 3 | `isUnauthorized` (from SSE hook) | 401-card fallback | `page.tsx:90–108` |
| 4 | `isLoading && !order` | **Animated skeleton** | `page.tsx:111–123` |
| 5 | otherwise | Live content | `page.tsx:125–164` |

Note on branch 2 vs branch 4: the guard is `isError && !order` — if a previous successful fetch
cached the order and then a refetch errors, `order` is still truthy and the page stays on the live
content rather than showing the error card. The 404 card only appears when no data exists yet
(`!order`).

### 5 — SSE layer (non-blocking, parallel) · `fe/src/hooks/useOrderMonitorSSE.ts`

The `useOrderMonitorSSE(orderId)` hook runs entirely in parallel with the TanStack query. It does
**not** block or gate any part of the UI:

- Initial state: `sseConnected = false`, `queueData = null`, `orderStatus = null`
  (`useOrderMonitorSSE.ts:21–23`).
- On successful `onopen`: `setSseConnected(true)`, `attemptsRef.current` reset to 0
  (`useOrderMonitorSSE.ts:60–61`).
- On auth failure (HTTP 401/403 from SSE endpoint): `setIsUnauthorized(true)`, loop stopped
  (`useOrderMonitorSSE.ts:54–58`). This **does** gate the page — see priority branch 3 above.
- On network failure: `setSseConnected(false)`, exponential backoff retry up to
  `maxAttempts = 5` (`useOrderMonitorSSE.ts:7–11`).

The `isUnauthorized` flag is the one SSE state that causes a full-screen fallback. All other SSE
states are cosmetic (banner visible, dot color changes) and never block the main content.

---

## Main Content Branch · `page.tsx:111–123` and `page.tsx:125–164`

### Skeleton · `page.tsx:111–123`

Renders when `isLoading && !order` (query in flight, no cached data). The whole page is wrapped in
`animate-pulse` and mimics the live layout:

```
min-h-screen bg-background pb-20 animate-pulse
├── sticky top bar placeholder          h-12  bg-card border-b border-border
├── max-w-lg mx-auto px-4 pt-4 space-y-3
│   ├── card placeholder 1              h-20  bg-card rounded-2xl border
│   ├── card placeholder 2              h-40  bg-card rounded-2xl border
│   └── card placeholder 3              h-36  bg-card rounded-2xl border
└── fixed bottom nav placeholder        h-14  bg-card border-t border-border fixed bottom-0
```

The skeleton approximates:
- card 1 → `TableInfoBanner` (h-20)
- card 2 → `OrderDetailCard` (h-40)
- card 3 → `WholeFloorPrepList` (h-36)

There is no per-item skeleton inside the cards — each is a single solid `bg-card` block.

### Live Content · `page.tsx:125–164`

Once `order` is present and none of the error/loading guards trigger, the live layout renders:

```
min-h-screen bg-background pb-20
├── MonitoringTopBar            (always; sseConnected drives dot color)
├── ConnectionErrorBanner       (fixed top-0, only when !sseConnected)
└── max-w-lg mx-auto px-4 pt-4 space-y-3
    ├── {order && effectiveStatus}
    │   ├── show/hide toggle button
    │   └── {showTable}
    │       ├── TableInfoBanner (queuePosition/queueTotal/estimatedMinutes from SSE — null until SSE arrives)
    │       └── OrderDetailCard
    └── {queueData && queueData.queue.length > 0}
        └── WholeFloorPrepList
```

#### Partial-data states (order loaded but SSE not yet connected)

Because the order query and SSE run in parallel, there is a window where `order` is available but
`queueData` is still `null`:

| State | `order` | `sseConnected` | `queueData` | Visible UI |
|---|---|---|---|---|
| Query in flight, SSE connecting | `undefined` | false | null | Skeleton (branch 4) |
| Order loaded, SSE still connecting | truthy | false | null | Live content; `ConnectionErrorBanner` visible; `TableInfoBanner` shows `queuePosition=null`; `WholeFloorPrepList` hidden |
| Order loaded, SSE connected | truthy | true | truthy | Full live content; banner gone |
| Order loaded, SSE disconnected (retry) | truthy | false | last value | `ConnectionErrorBanner` visible; queue data stale (last received values shown) |

`TableInfoBanner` passes `queuePosition={queueData?.position ?? null}` and omits the queue
position row when null (`page.tsx:147–148`).

`WholeFloorPrepList` is conditionally rendered: `{queueData && queueData.queue.length > 0}`
(`page.tsx:156–161`). It is fully hidden until a `queue.update` SSE event arrives with at least
one item in the queue.

#### SSE-driven visual states in `MonitoringTopBar`

`MonitoringTopBar` receives `sseConnected` as a prop (`page.tsx:127`, `MonitoringTopBar.tsx:7`):

- `sseConnected = true` → green dot `bg-success animate-pulse`, pill `bg-success/15 text-success`, label "LIVE" (`MonitoringTopBar.tsx:28–38`).
- `sseConnected = false` → gray dot `bg-muted-fg`, pill `bg-muted text-muted-fg`, label "Mất kết nối" (`MonitoringTopBar.tsx:28–38`).

`aria-live="polite"` on the header ensures screen readers announce these changes
(`MonitoringTopBar.tsx:9`).

#### `ConnectionErrorBanner` · `fe/src/components/shared/ConnectionErrorBanner.tsx`

Rendered at `page.tsx:129` when `!sseConnected`. It is a **fixed** banner (`fixed top-0 left-0 right-0
bg-red-600 text-white z-50`) that overlaps the `MonitoringTopBar`. Shows "⚠️ Mất kết nối — đang
thử lại..." with no reconnect button — the hook handles reconnect automatically. The banner
disappears the moment `sseConnected` flips back to `true`.

Note: the `useOrderMonitorSSE` constant `RECONNECT.showBannerAfter = 3`
(`useOrderMonitorSSE.ts:11`) is **defined but not currently used** to gate the banner. The banner
appears immediately on disconnect (after the first failed attempt sets `sseConnected = false`),
not only after 3 attempts. See Flags below.

#### `itemsChangedAt` — refetch trigger (not a loading state)

When SSE events `items_added`, `item_updated`, or `item_cancelled` arrive, the hook sets
`itemsChangedAt = Date.now()` (`useOrderMonitorSSE.ts:84–87`). The page's `useEffect`
(`page.tsx:40–42`) calls `refetch()`, which re-fetches the order query. During the refetch,
`isLoading` is `false` (a background refetch uses `isFetching`, not `isLoading`), so the skeleton
does **not** flash — the page shows stale data briefly then updates in place.

---

## Search / Interaction Gating

This page has no search input or filter that withholds a fetch. The one gating condition is the
`orderId` guard (layer 3): if `orderId` is absent, the query is `enabled: false` and never fires.
There is no user action that triggers the initial fetch other than having an active order in the
cart store.

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **`showBannerAfter` constant is unused** | `RECONNECT.showBannerAfter = 3` is defined at `useOrderMonitorSSE.ts:11` but never referenced in the connection logic. The `ConnectionErrorBanner` renders immediately after the first SSE failure (`!sseConnected`), not after 3 attempts. The constant is dead code. |
| 2 | **No skeleton for `WholeFloorPrepList`** | When `queueData` arrives after a delay, the section pops in with no placeholder — it is simply absent until the first `queue.update` SSE event. A pulse block would prevent layout shift. |
| 3 | **`isUnauthorized` priority vs `isError`** | Branch 3 (`isUnauthorized`, from SSE) is evaluated after branch 2 (`isError && !order`, from the HTTP query). If the HTTP query also returns 401 (not 404), `isError` fires first and renders the generic 404 card rather than the session-expired message. In practice the query's retry logic skips only 404 (`page.tsx:30–33`), so a 401 from the HTTP query would also trigger the 404 card. |
| 4 | **Stale queue data during SSE reconnect** | After SSE disconnects, `queueData` retains the last received value. `WholeFloorPrepList` continues to display potentially stale queue positions until SSE reconnects. No staleness indicator is shown. |
| 5 | **Skeleton bottom nav is a fixed placeholder** | `page.tsx:120` renders `fixed bottom-0 left-0 right-0 h-14 bg-card border-t` in the skeleton but the live page has no equivalent fixed bottom bar — the live layout uses `pb-20` for spacing. The skeleton bottom nav has no live counterpart. ❓ UNVERIFIED whether this is intentional or a skeleton misalignment. |
