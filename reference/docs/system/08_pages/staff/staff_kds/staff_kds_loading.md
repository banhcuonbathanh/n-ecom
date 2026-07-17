# KDS — Kitchen Display — Loading States · `/kds`

> **TL;DR:** ✅ implemented (with a critical gap) · how `/kds` behaves while data is in flight.
> Two layers only: (1) **no route-level spinner** exists for the `(dashboard)` group or `kds/`
> specifically — Next.js shows a plain blank during navigation; (2) a single TanStack query
> seeds local state and its `isLoading` flag is **never read** — so the loading window and a
> genuinely-empty board are **completely indistinguishable**: both render the same
> "Không có đơn nào đang chờ 🍜" message. After the first data arrives the board is WS-driven;
> there are no per-card spinners or inline indicators.
>
> Page overview → [staff_kds.md](staff_kds.md) ·
> BE view → [staff_kds_be.md](staff_kds_be.md) ·
> Cross-page data flow → [staff_kds_crosspage_dataflow.md](staff_kds_crosspage_dataflow.md) ·
> Narrative scenario → [SCENARIO_KDS_COOK.md](SCENARIO_KDS_COOK.md) ·
> Code bugs → [KDS_BUGS.md](KDS_BUGS.md)

> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(dashboard)/kds/page.tsx` ·
> `fe/src/context/OrdersWSContext.tsx` ·
> `fe/src/app/(dashboard)/layout.tsx`.

---

## Loading Layers (outer → inner)

```
1. Route navigation → (no loading.tsx exists for (dashboard) or kds/) → blank screen
2. KDSPage mounts  → useQuery fires; initial is undefined → orders = [] → EMPTY STATE shown
3. useQuery resolves → useEffect seeds orders[] → board renders OR stays at empty state
```

### 1 — Route-level spinner · DOES NOT EXIST

There is **no** `loading.tsx` in `fe/src/app/(dashboard)/kds/` and **no** `loading.tsx` in
`fe/src/app/(dashboard)/`. Confirmed by directory listing: only `page.tsx` exists in `kds/`
and only `layout.tsx` exists in `(dashboard)/`.

The only route-level loading file in the codebase is `fe/src/app/(shop)/loading.tsx` (for the
customer shop routes). Dashboard routes — including `/kds` — get **no App Router loading UI
during client-side navigation**. The browser renders a blank/stale shell until the page JS
hydrates.

The `(dashboard)` layout (`fe/src/app/(dashboard)/layout.tsx:1-5`) wraps children only in
`<OrdersWSProvider>` — no `<Suspense>`, no `AuthGuard`, no `RoleGuard`. Any auth/role protection
happens at a different layer (❓ UNVERIFIED — the actual auth guard location was not traced in
this pass; the layout itself has none).

### 2 — Single async query · `kds/page.tsx:102-106`

`KDSPage` fires one `useQuery`:

```
queryKey:  ['orders', 'kds-initial']
queryFn:   GET /orders  →  api.get('/orders').then(r => r.data?.data ?? r.data ?? [])
staleTime: 30_000 ms
```

Source: `../../../../../fe/src/app/(dashboard)/kds/page.tsx:102-106`.

Key behaviour: the destructure is `const { data: initial } = useQuery(…)` — **only `data` is
destructured**. `isLoading`, `isError`, `isFetching`, and `error` are all **ignored** at the
call site (page.tsx:102). There is no skeleton, no spinner, no error branch wired to this query.

The query hits `GET /orders` with no Redis cache on the BE side — every call goes to MySQL.
The 30-second `staleTime` is the only client-side guard against redundant fetches.
See [staff_kds_be.md](staff_kds_be.md) §Endpoints, row #1 for the full handler → service →
repository → SQL trace and the absence of Redis caching.

### 3 — Local state seed · `kds/page.tsx:108-111`

```ts
useEffect(() => {
  if (!initial) return
  setOrders((initial as Order[]).filter(o => ACTIVE_STATUSES.has(o.status)))
}, [initial])
```

Source: `../../../../../fe/src/app/(dashboard)/kds/page.tsx:108-111`.

`orders` is initialised to `[]` at mount (`useState<Order[]>([])`). Until `initial` resolves
from the query, `orders` stays `[]`. The `useEffect` does **not** run until `initial` is
defined (the `if (!initial) return` guard at line 109). After the effect runs, `orders` is set
to the filtered active orders from the API response.

---

## Main Content Branch · `kds/page.tsx:182-188`

The component has a **single** top-level branch before the main grid:

```ts
if (orders.length === 0) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-fg text-xl">Không có đơn nào đang chờ 🍜</p>
    </div>
  )
}
```

Source: `../../../../../fe/src/app/(dashboard)/kds/page.tsx:182-188`.

This branch renders the same output for **three distinct situations**:

| Situation | `orders.length` | What renders |
|---|---|---|
| Query still in flight (loading) | `0` | "Không có đơn nào đang chờ 🍜" |
| Query succeeded, no active orders | `0` | "Không có đơn nào đang chờ 🍜" |
| Query failed (`isError`) | `0` (effect never ran) | "Không có đơn nào đang chờ 🍜" |

All three are **visually and functionally identical**. See Flags §1 for the full impact.

The priority-ordered states the main region can be in:

| Priority | Condition | Renders |
|---|---|---|
| 1 | `orders.length === 0` (any cause) | Centered empty-state message (page.tsx:182-188) |
| 2 | `orders.length > 0` | Responsive card grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4` (page.tsx:194) |

### Empty-state details · `kds/page.tsx:182-188`

- Full-screen centering: `min-h-screen bg-background flex items-center justify-center`
- Single `<p>` element: `text-muted-fg text-xl`, content `"Không có đơn nào đang chờ 🍜"`
- No retry button, no error message, no "loading…" indicator, no spinner.

### Skeleton

There is **no skeleton** for the KDS board. No pulse placeholders, no card outlines, no shimmer
effect at any loading stage. The page goes directly from the empty-state message to the full
card grid when `useEffect` populates `orders`.

---

## WS Connection State · `fe/src/context/OrdersWSContext.tsx`

The shared WS context tracks three connection states:

| Value | When | Source |
|---|---|---|
| `null` | Initial — no connection attempt yet | `useState<boolean \| null>(null)` at `OrdersWSContext.tsx:24` |
| `true` | `ws.onopen` fires | `OrdersWSContext.tsx:47` |
| `false` | `ws.onclose` fires; exponential-backoff reconnect scheduled | `OrdersWSContext.tsx:53-57` |

Reconnect: `Math.min(1000 * 2 ** (attempts - 1), 30_000)` ms — capped at 30 seconds.
Source: `../../../../../fe/src/context/OrdersWSContext.tsx:57`.

The WS connects immediately on mount provided `token` is truthy
(`OrdersWSContext.tsx:33: if (!token) return`).

**The KDS page does not consume `connected`.** `useOrdersWSContext()` returns `{ connected,
subscribe }` but `kds/page.tsx:114` destructures **only** `subscribe`:

```ts
const { subscribe } = useOrdersWSContext()
```

Source: `../../../../../fe/src/app/(dashboard)/kds/page.tsx:114`.

There is no connection banner, no "reconnecting…" indicator, and no degraded-mode UI on the KDS
board when the WS is down or reconnecting. A `false`/`null` `connected` state is silently
absorbed — the chef sees no indication that live updates have stopped.

---

## New-Order Inline Fetch · `kds/page.tsx:118-128`

When a `new_order` WS event arrives, the page does an inline `GET /orders/:id` to fetch the
full order object before adding it to the board:

```ts
case 'new_order': {
  try {
    const { data } = await api.get(`/orders/${msg.order_id}`)
    const order: Order = data?.data ?? data
    setOrders(prev =>
      prev.find(o => o.id === order.id) ? prev : [order, ...prev]
    )
    beep()
  } catch { /* skip */ }
  break
}
```

Source: `../../../../../fe/src/app/(dashboard)/kds/page.tsx:118-128`.

There is **no loading indicator** for this secondary fetch. The new order card simply appears
(and the beep sounds) when `GET /orders/:id` resolves. If the call fails, the catch block
silently discards the event — the card never appears and the beep is not emitted.

---

## Search / Interaction Gating

The KDS page has **no search bar and no filter input**. All displayed orders are determined
server-side by `GET /orders` (which returns active orders for the active kitchen) and then
filtered client-side to `ACTIVE_STATUSES` (`pending`, `confirmed`, `preparing`).
Source: `../../../../../fe/src/app/(dashboard)/kds/page.tsx:93, 110`.

There are no inputs that gate or defer a fetch on this page.

---

## Flags / Known Gaps

| # | Gap | Detail | Source |
|---|---|---|---|
| 1 | **Loading = empty state (indistinguishable)** | `isLoading` is never read (page.tsx:102 destructures only `data`). While the query is in flight, `orders` is `[]` and the board shows "Không có đơn nào đang chờ 🍜" — the same message a truly-empty kitchen sees. A chef cannot tell whether the board is loading, empty, or broken. | `page.tsx:97, 102, 182` |
| 2 | **No error state** | `isError` and `error` are not destructured. A network failure, 401, or 500 from `GET /orders` leaves `orders` at `[]` and renders the empty-state message with no retry button, no error toast, and no diagnostic. | `page.tsx:102` |
| 3 | **No WS-disconnection banner** | `connected` from `OrdersWSContext` is available (`OrdersWSContext.tsx:71`) but not consumed by the KDS page (`page.tsx:114`). When the WS drops and reconnects (up to 30 s gap), the chef sees no indication — new orders that arrive during the gap depend on the `new_order` WS event; orders created during the blackout are missed until the next full `GET /orders` (which only fires on staleTime expiry: 30 s). | `page.tsx:114`, `OrdersWSContext.tsx:24, 53-57` |
| 4 | **No route-level spinner** | No `loading.tsx` exists for `(dashboard)/` or `(dashboard)/kds/`. Navigating to `/kds` shows a blank screen until the page hydrates. | confirmed: only `(dashboard)/admin/loading.tsx` and `(shop)/loading.tsx` exist |
| 5 | **No skeleton** | No pulse placeholders at any loading stage; the board jumps from the centered empty-state string directly to the full card grid. | `page.tsx:182-194` |
| 6 | **Inline new-order fetch silently dropped on error** | `catch { /* skip */ }` at page.tsx:126 means a transient network error during the inline `GET /orders/:id` silently loses a new order from the board until the next WS event or staleTime reload. | `page.tsx:118-128` |
