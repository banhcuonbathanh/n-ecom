# Admin Overview — Loading States · `/admin/overview`

> **TL;DR:** ✅ implemented · how `/admin/overview` behaves while data is in flight.
> Three async queries fire on mount — all default to `[]`, so the page renders immediately with
> empty zones and fills in as each query resolves. There is no global page skeleton.
> One route-level spinner exists (`/admin/loading.tsx`) but it covers the full admin route group,
> not the overview page specifically. Two realtime connections (WS + SSE) start after mount;
> neither blocks page render — the only loading UI they produce is a sticky red banner when WS
> disconnects (`wsConnected === false`).
>
> **Sources traced:**
> `fe/src/app/(dashboard)/admin/loading.tsx` ·
> `fe/src/app/(dashboard)/admin/overview/page.tsx` ·
> `fe/src/app/(dashboard)/admin/layout.tsx` ·
> `fe/src/components/guards/AuthGuard.tsx` ·
> `fe/src/components/guards/RoleGuard.tsx` ·
> `fe/src/features/admin/components/StatCards.tsx` ·
> `fe/src/features/admin/components/WaitingSection.tsx` ·
> `fe/src/features/admin/components/TableList.tsx` ·
> `fe/src/features/admin/components/PaidLog.tsx` ·
> `fe/src/features/admin/components/CancelLog.tsx` ·
> `fe/src/components/shared/ConnectionErrorBanner.tsx` ·
> `fe/src/hooks/useOverviewWS.ts` ·
> `fe/src/hooks/useAdminSSE.ts` ·
> `fe/src/context/OrdersWSContext.tsx`
>
> Traced from source on branch `experience_claude.md_system_1`.
>
> **Siblings:**
> [admin_overview.md](admin_overview.md) ·
> [admin_overview_be.md](admin_overview_be.md) ·
> [admin_overview_crosscomponent_dataflow.md](admin_overview_crosscomponent_dataflow.md) ·
> [admin_overview_crosspage_dataflow.md](admin_overview_crosspage_dataflow.md) ·
> [SCENARIO_OVERVIEW_FLOOR.md](SCENARIO_OVERVIEW_FLOOR.md)

---

## Loading Layers (outer → inner)

```
1. Route navigation      → AdminLoading spinner (whole /admin/* shell)
2. AdminLayout mounts    → AuthGuard: renders null until user resolves
3. AuthGuard passes      → RoleGuard: renders error string if role < MANAGER
4. Guards pass           → OverviewPage mounts; 2 queries fire immediately; 2 realtime connections start
5. Queries resolve       → zones fill in from [] → real data (no skeleton; silent fill)
```

### Layer 1 — Route-level spinner · `fe/src/app/(dashboard)/admin/loading.tsx:1-7`

Next.js App Router renders this file for **all `/admin/*` routes** during server-side navigation
into the admin section. It is a single centered spinner — not overview-specific:

- Container: `flex h-64 items-center justify-center`
- Spinner: `h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500`

This spinner is shown only during the initial route segment loading. Once the admin layout shell
has streamed, it disappears and layers 2–5 take over inside the already-mounted layout.

Note: there is no `loading.tsx` under `fe/src/app/(dashboard)/admin/overview/` nor under
`fe/src/app/(dashboard)/`. The spinner at `admin/loading.tsx` is the only route-level fallback.

### Layer 2 — AuthGuard render gate · `fe/src/components/guards/AuthGuard.tsx:23`

`AdminLayout` wraps all children in `<AuthGuard>` (`admin/layout.tsx:29`). The guard's render
contract:

```
if (!user) return null      // ← AuthGuard.tsx:23 — whole admin shell is blank
return <>{children}</>
```

On mount, if `useAuthStore` has no `user` in memory (e.g. hard reload), the guard fires a
`getMe()` call (`AuthGuard.tsx:17`). While that request is in flight, the guard returns `null` —
the admin nav header and all page content are invisible. If `getMe()` fails, the router pushes
to `/login` (`AuthGuard.tsx:19`).

There is no spinner inside `AuthGuard`. The window between mount and `getMe()` resolving shows a
blank page (or the route-level spinner if Next.js is still streaming — they overlap on hard load).

### Layer 3 — RoleGuard access check · `fe/src/components/guards/RoleGuard.tsx:16`

Nested inside `AuthGuard`, `RoleGuard` requires `minRole={Role.MANAGER}` (`admin/layout.tsx:30`).
It reads `user.role` from the Zustand auth store synchronously — no async call:

```
if (roleValue < minRole) return <div className="text-urgent …">Không có quyền truy cập…</div>
```

Because `AuthGuard` already gates on `!user`, by the time `RoleGuard` runs `user` is always
defined. The role check is therefore synchronous and immediate — no loading window.

### Layer 4 — OverviewPage mounts; queries fire · `page.tsx:104-154`

Once both guards pass, `OverviewPage` mounts. Three `useQuery` calls and two realtime connections
are set up:

| Hook / Query | `queryKey` | `staleTime` | `enabled` | Default | Fires on mount? |
|---|---|---|---|---|---|
| `listTables` | `['tables']` | 60 000 ms | always | `[]` | Yes |
| `listLiveOrders` | `['orders','live']` | 15 000 ms | always | `[]` | Yes |
| `listTodayHistory` | `['orders','history']` | 30 000 ms | `open` (local state in PaidLog / CancelLog) | `[]` | **No** — lazy |
| `useOverviewWS` | — | — | fires when `token` is set | `null` | Yes (WS connect) |
| `useAdminSSE` | — | — | fires when `token` is set | — | Yes (SSE connect) |

**Key behavior:** both always-on queries use `data = []` defaults. The page renders immediately
with empty arrays — no loading gate, no global skeleton. The zones (StatCards, WaitingSection,
TableList, PaidLog, CancelLog) all render with empty data on the first paint and fill in silently
as queries resolve.

---

## Main Content Branch — Priority-ordered States

Unlike the customer menu (which has an explicit `isLoading` branch for products), the overview
page has **no top-level loading branch**. The page body always renders all zones; each zone
degrades individually with empty state UI.

| Priority | Condition | What the user sees |
|---|---|---|
| 1 | `wsConnected === false` | `ConnectionErrorBanner` — sticky red bar at top of viewport (`page.tsx:249`) |
| 2 | `popupOrder !== null` | `NewOrderPopup` modal overlays everything (`page.tsx:252-258`) with `popupLoading` state on its confirm button |
| 3 | Normal render | Header + search bar always visible; zones A–F render with whatever data is available |

There is no condition 0 (global spinner) or "page is loading" gate. Zones A–F are always present.

---

## Per-Zone Loading and Empty States

### Zone A — StatCards · `fe/src/features/admin/components/StatCards.tsx:22-51`

`StatCards` receives `orders` (from `rawOrders` filtered to `ACTIVE`) and `tables` as props from
`page.tsx:307`. On first render both are `[]`, so every computed value is `0`:

- `occupied` → `0` (no tables have matching orders)
- `totalPending`, `totalPreparing` → `0`
- `urgent`, `warning` → `0`

The four `StatCard` tiles render immediately showing `0` values with their labels. There is no
skeleton or placeholder. The cards "snap" to real values when both queries resolve — typically
within one render cycle after the first fetch completes.

### Zone B — WaitingSection · `fe/src/features/admin/components/WaitingSection.tsx:71-75`

`WaitingSection` receives `orders` and `tables` as props. It computes `prepOrders` (filtered
to `pending` status with a matching table). When the list is empty (on first load or genuinely
quiet service), the component returns an empty-state card:

```tsx
// WaitingSection.tsx:71-75
if (prepOrders.length === 0) return (
  <div className="rounded-xl … text-center text-sm text-gray-400 …">
    Chưa có đơn hàng — quán đang yên tĩnh
  </div>
)
```

This same empty state fires on first render (queries not yet resolved) and when there are
genuinely no pending orders. There is no visual distinction between "loading" and "truly empty".

Per-row action buttons show `'...'` while that order's ID is in `loadingIds`
(`WaitingSection.tsx:198`: `{loading ? '...' : next.label}`).

### Zone C — PrepPanel · `page.tsx:327-333`

`PrepPanel` is conditional: it only renders when `kiemTraIds.size > 0`. Since `kiemTraIds`
starts as `new Set()` (`page.tsx:115`), the PrepPanel is **never visible on first load** — it
only appears after the user clicks a "Kiểm tra" (🔍) button. No loading state needed.

### Zone D — TableList · `fe/src/features/admin/components/TableList.tsx:284`

`TableList` returns `null` when `sorted.length === 0` (`TableList.tsx:284`):

```tsx
if (sorted.length === 0) return null
```

On first render when `tables = []`, the entire zone D is absent from the DOM — no empty-state
card, no skeleton, nothing. Once `['tables']` resolves, the component mounts and renders.

Per-row action buttons in `TableList` show `'...'` when `loadingIds.has(order.id)`
(`TableList.tsx:398`). The `PaymentModal` confirm button shows `'Đang xử lý...'` when its local
`loading` state is `true` (`TableList.tsx:102`).

### Zone E — PaidLog · `fe/src/features/admin/components/PaidLog.tsx:15-98`

`PaidLog` manages its own accordion with local `open` state (default `false`). Key behaviors:

- **Closed state (default on load):** renders only the accordion button header. No data is
  fetched. The badge (paid order count) is invisible because `paid.length === 0` until a fetch
  runs.
- **`enabled: open` (`PaidLog.tsx:21`):** the `['orders','history']` query fires only when
  `open` becomes `true`. Clicking the accordion header is the trigger.
- **In-flight state (`PaidLog.tsx:58-59`):** after the accordion opens, while `isLoading` is
  `true`, the expanded panel renders:
  ```tsx
  <p className="py-4 text-center text-sm text-gray-400 …">Đang tải...</p>
  ```
- **Empty state (`PaidLog.tsx:60-62`):** `paid.length === 0` after the fetch → `"Chưa có đơn
  thanh toán hôm nay"`
- **Loaded state:** the paid-orders table renders.

`staleTime` is 30 000 ms. If the user closes and reopens the accordion within 30 s, the cached
data is shown immediately (no `isLoading` flash).

### Zone F — CancelLog · `fe/src/features/admin/components/CancelLog.tsx:15-88`

Identical pattern to `PaidLog`. Both components share the **same `queryKey`**
(`['orders','history']`) and the same `queryFn` (`listTodayHistory`). TanStack Query deduplicates:
whichever accordion is opened first triggers the fetch; the other reuses the cached result.

In-flight: `"Đang tải..."` (`CancelLog.tsx:51-52`).
Empty: `"Chưa có đơn bị huỷ hôm nay"` (`CancelLog.tsx:53-55`).

---

## Realtime Connection States

### WebSocket — `useOverviewWS` · `fe/src/hooks/useOverviewWS.ts` + `fe/src/context/OrdersWSContext.tsx`

`useOverviewWS` returns the `connected` value from `OrdersWSContext`
(`useOverviewWS.ts:11,74`).

`OrdersWSContext` initializes `connected` as `useState<boolean | null>(null)`
(`OrdersWSContext.tsx:24`). The three states map to:

| Value | When | Page effect |
|---|---|---|
| `null` | WS is connecting (between `new WebSocket()` and `onopen`) | No banner — page renders normally |
| `true` | `ws.onopen` fires (`OrdersWSContext.tsx:47`) | No banner |
| `false` | `ws.onclose` fires (`OrdersWSContext.tsx:53`) | `ConnectionErrorBanner` shown (`page.tsx:249`) |

The banner is `fixed top-0 left-0 right-0 bg-red-600 text-white` — a sticky viewport overlay
(`ConnectionErrorBanner.tsx:2`). It appears only after a confirmed disconnect, not during initial
connection (`null`). The WS auto-reconnects with exponential backoff up to 30 s
(`OrdersWSContext.tsx:57`); the banner stays until `onopen` fires again.

**Critical:** `wsConnected === null` (initial connecting state) produces **no UI at all**.
The page renders its full empty-data layout during the WS handshake.

### SSE — `useAdminSSE` · `fe/src/hooks/useAdminSSE.ts`

`useAdminSSE` has **no returned state** — it fires a side effect only (`useAdminSSE.ts:17`).
There is no `connected` flag and no banner for SSE disconnection. The SSE reconnect loop runs
silently with exponential backoff (max 30 s, max 10 attempts; `useAdminSSE.ts:28,52`).

The SSE only triggers `NewOrderPopup` when a `new_order` event arrives and the fetched order has
an active status (`page.tsx:142-153`). While the popup is open, its confirm button shows
`'Đang xác nhận...'` when `popupLoading === true` (`page.tsx:93`). The button is also
`disabled={loading}` (`page.tsx:90`).

---

## Search/Interaction Gating

The search bar (`page.tsx:274-298`) does not withhold any fetch. It filters already-fetched
`orders` and `tables` arrays in memory:

```
filteredOrders = q ? orders.filter(…) : orders          // page.tsx:205-216
filteredTables = q ? tables.filter(…) : tables          // page.tsx:219-229
filteredTableOrders = q ? tableOrders.filter(…) : tableOrders  // page.tsx:231-241
```

No query is disabled by search state. There is no debounce and no re-fetch on search input.

**The only true fetch gate is the `enabled: open` on `['orders','history']`** in `PaidLog` and
`CancelLog`. Before the user opens either accordion, the history query is suppressed entirely —
no network request, no loading state, no data. This is the "withholds a fetch" case described in
PAGE_FOLDER_GUIDE §6.

---

## Flags / Known Gaps

| # | Flag | Detail |
|---|---|---|
| 1 | **No global skeleton** | The page renders all zones with `[]` data on first paint. WaitingSection shows "quán đang yên tĩnh" and TableList returns `null` until queries resolve. A first-time user cannot distinguish "loading" from "no active orders". |
| 2 | **WS connecting state is invisible** | `wsConnected === null` (initial handshake) produces no UI. The page looks fully ready even while the WS is still connecting. Only `false` triggers the banner. |
| 3 | **No SSE disconnect UI** | `useAdminSSE` does not expose a connection state. New orders delivered via SSE during a disconnect are silently missed until the SSE reconnects (max 30 s backoff, 10 attempts). No banner is shown to the admin. |
| 4 | **PaidLog / CancelLog badge invisible before first open** | Because `['orders','history']` is lazy, the paid-order count badge in the PaidLog header reads `0` until the accordion is opened. Admins may not know whether there are paid orders today without clicking. |
| 5 | **No route-level loading.tsx for overview** | `fe/src/app/(dashboard)/admin/overview/` has no `loading.tsx`. The only route-level spinner is the one at `admin/loading.tsx` which covers all `/admin/*` navigation — not just overview. There is no Suspense boundary inside `OverviewPage` itself. |
| 6 | **AuthGuard blank window** | On hard reload, `AuthGuard` returns `null` (blank page) while `getMe()` resolves. There is no skeleton, spinner, or loading text during this window. Combined with the route-level spinner disappearing before `getMe()` resolves, a hard reload produces a brief blank screen. |
| 7 | **StatCards snap from 0** | On first render all four stat cards show `0`. When the two primary queries resolve, they snap to real values in a single re-render. No transition or skeleton — minor perceived jank on slow networks. |
