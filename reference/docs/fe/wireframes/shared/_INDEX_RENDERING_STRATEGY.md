# Rendering Strategy Index

> Check here **before** choosing how to render a new page.
> Register your page here **after** implementing its rendering strategy.
> One row per page — update when strategy changes.

---

## How to decide

| Question | Yes → | No → |
|---|---|---|
| Does the page have API data that doesn't change per user (menus, lists, tables)? | **Pattern A** | next question |
| Is all data user-specific or real-time (SSE/WebSocket)? | **Pattern B** | next question |
| Does the server need to decide what to render before the client loads (auth redirect, role-gated HTML)? | **Pattern C** | **Pattern B** |

---

## Pattern Library

### Pattern A — ISR + RSC + HydrationBoundary ✅ recommended for data pages

Best for: pages with shared API data that doesn't change per user — menus, categories, combos, product lists, admin tables.

```tsx
// page.tsx — Server Component
export const revalidate = 300  // match TanStack Query staleTime

export default async function Page() {
  const queryClient = new QueryClient()
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: ['resource'], queryFn: fetchResource }),
  ])
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageClient />  {/* 'use client' — owns all Zustand + interactions */}
    </HydrationBoundary>
  )
}
```

**Result:** Zero loading flash on first paint. TanStack Query is pre-hydrated from HTML.
**Tradeoff:** Requires a separate `PageClient` component. `page.tsx` cannot read Zustand or localStorage.
**revalidate rule:** Set equal to the TanStack Query `staleTime` for the same resource — they must agree.

---

### Pattern B — Full Client (`'use client'` on page root)

Best for: pages where all data is user-specific (order history, personal settings) or real-time (KDS, order tracking via SSE).

```tsx
'use client'
export default function Page() {
  const { data, isLoading } = useQuery({ queryKey: ['resource'], queryFn: ... })
  if (isLoading) return <PageSkeleton />
  return <PageContent data={data} />
}
```

**Result:** Skeleton visible on first paint. Simpler architecture, no RSC split needed.
**Tradeoff:** Loading flash on every cold visit. No HTML pre-population.
**Skeleton required:** Must define a `<PageSkeleton />` component — do not leave undefined.

---

### Pattern C — SSR per request (rare)

Best for: pages that must redirect or gate content server-side before the client loads (auth walls, role-specific HTML baked in).

```tsx
// page.tsx — Server Component, no revalidate
import { redirect } from 'next/navigation'
export default async function Page() {
  const session = await getSession()
  if (!session) redirect('/login')
  const data = await fetchUserSpecificData(session.userId)
  return <PageContent initialData={data} />
}
```

**Result:** Server decides what to render per request. No loading flash. Auth enforced at HTML level.
**Tradeoff:** Every request hits the server — no static caching. Use only when client-side auth check is insufficient.

---

## 📋 Page Directory

> **One row per page.** Add a row when you finalize a page's rendering strategy.
> **Skeleton defined?** — ✅ if a `<Skeleton />` component exists for the loading state. Required for Pattern B; recommended for Pattern A zones that wait on client data.
> **RSC prefetches** — list exact TanStack Query keys passed to `prefetchQuery` in `page.tsx`.

| Page | Route | Pattern | ISR revalidate | RSC prefetches | Client zones | Skeleton defined? | Source |
|------|-------|---------|----------------|----------------|--------------|-------------------|--------|
| Menu | `/(shop)/menu` | A — ISR + RSC | 300s | `['categories']` · `['products', null, undefined]` · `['combos']` | A–J (all) | ❌ not yet | [menu_wireframe_v1.md](../client_menu_page/menu_wireframe_v1.md) |
| Admin — Products | `/admin/products` | A — ISR + RSC | 30s | `['admin', 'products']` · `['categories']` · `['admin', 'toppings']` | Nav · A · B · M1 | ❌ not yet | [admin_main_product_wireframe_v1.md](../admin_main/admin_main_product/admin_main_product_wireframe_v1.md) |
| Admin — Staff | `/admin/staff` | A — ISR + RSC | 30s | `['admin', 'staff']` | A · B · C · D · E · M1 · M2 | ❌ not yet | [admin_main_staff_wireframe_v1.md](../admin_main/admin_main_staff/admin_main_staff_wireframe_v1.md) |
| Admin — Storage | `/admin/storage` | A — ISR + RSC | 60s | `['admin', 'ingredients']` | C · D · E | ❌ not yet | [admin_main_storage_wireframe_v1.md](../admin_main/admin_main_storage/admin_main_storage_wireframe_v1.md) |
| Admin — Staff Task Board | `/admin/staff/task-board` | B — Full Client | N/A | none | A · B · C · D · E · F · G | ❌ not yet | [admin_main_staff_task_boad_wireframe_v1.md](../admin_main/admin_main_staff_task_boad/admin_main_staff_task_boad_wireframe_v1.md) |
| Admin — Staff Task List | `/admin/todo-list` | B — Full Client | N/A | none | A · B · C · D | ❌ not yet | [admin_main_todo_list_wireframe_v1.md](../admin_main/admin_main_todo_list/admin_main_todo_list_wireframe_v1.md) |
| Admin — Topping | `/admin/toppings` | A — ISR + RSC | 60s | `['admin', 'toppings']` | A · B · C · D | ❌ not yet | [admin_main_topping_wireframe_v1.md](../admin_main/admin_main_topping/admin_main_topping_wireframe_v1.md) |
| Client — Favourites (S1) | `/(shop)/menu/favourites` | B — Full Client | N/A | none | ZA · ZB · ZC · ZD | ❌ not yet | [client_favourite_page_wireframe_v1.md](../client_favourite_page/client_favourite_page_wireframe_v1.md) |
| Client — Favourites (S2) | `/(shop)/menu/favourites/save` | B — Full Client | N/A | none | ZA · ZB · ZC · ZD | ❌ not yet | [client_favourite_page_wireframe_v1.md](../client_favourite_page/client_favourite_page_wireframe_v1.md) |
| Client — Favourites (S3) | `/(shop)/menu/favourites/sets` | B — Full Client | N/A | none | ZA · ZB · ZC | ❌ not yet | [client_favourite_page_wireframe_v1.md](../client_favourite_page/client_favourite_page_wireframe_v1.md) |
| Admin — Tổng Kết Ngày | `/admin/summary` | B — Full Client | N/A | none | Zones 1–8 | ❌ not yet | [admin_summary_wireframe_v1.md](../admin_main/admin_summary/admin_summary_wireframe_v1.md) |
| Client — Product Detail | `/(shop)/menu/product/[id]` | A — ISR + RSC | 300s | `['products', id]` | NAV · A · B · C · D · E | ❌ not yet | [client_product_detail_wireframe_v1.md](../client_product_detail/client_product_detail_wireframe_v1.md) |
| Client — Restaurant Monitor | `/(shop)/tracking` | B — Full Client | N/A | none | A · B · C · D · E · F | ❌ not yet | [client_tracking_wireframe_v1.md](../client_tracking/client_tracking_wireframe_v1.md) |
| Admin — Overview | `/admin/overview` | B — Full Client | N/A | none | Nav · A · B · C · D | ❌ not yet | [admin_overview_wireframe_v1.md](../admin_main/admin_overview/admin_overview_wireframe_v1.md) |
| Client — Info | `/(shop)/profile` | B — Full Client | N/A | none | A · B · C · D · E · F | ❌ not yet | [client_info_page_wireframe_v1.md](../client_info_page/client_info_page_wireframe_v1.md) |
| Client — Order Tracking | `/(shop)/order/[id]` | B — Full Client | N/A | none | Nav · C1 · 1 · 2 · 3 · 4 · 5 · 6 · Modal A · Modal B | ❌ not yet | [client_order_page_wireframe_v1.md](../client_order_page/client_order_page_wireframe_v1.md) |

---

## Known Gaps (update as discovered)

| Page | Gap | Impact |
|------|-----|--------|
| Menu | No `prefetchQuery` on category tab hover → each tab tap waits for a network round-trip | Medium — noticeable on slow connections |
| Menu | No skeleton defined for Zone C (category tabs), Zone E (combos), Zone F (product grid) | Medium — flash of empty on first paint if ISR cache misses |
| All Pattern B pages | Must define `<PageSkeleton />` before shipping | High — blank screen without it |
| Admin — Staff Task Board | Zone F (ExpandedTaskList) is lazy-fetched on row expand → loading spinner visible on expand click. Prefetch on row hover (`queryClient.prefetchQuery`) to hide this gap | Low-Medium — noticeable on slow connections |
| Admin — Overview | No `OverviewSkeleton` defined — blank screen during initial REST hydration + WS connect (~500ms). Must define before shipping. | High — all zones are client-rendered |
| Admin — Staff Task List | `['admin', 'tasks', 'todo', ...]` has `staleTime: 30s`. Overdue status computed on BE read — a cached response can show "pending" for an overdue task. Set `refetchOnWindowFocus: true` as a mitigation. | Low — only visible after a tab switch |
| Client — Favourites S1/S3 | Item metadata (`['products', id]` · `['combos', id]`) fetched client-side per item — brief loading flash per card on cold visit when localStorage has many items. Pre-warm not in scope for v1. | Low-Medium — noticeable if > 5 items favourited |
| Admin — Tổng Kết Ngày | Pattern B — skeleton visible on every cold visit; ISR not possible because `selectedDate` is runtime user state. `<AdminSummarySkeleton />` required before SUM-2 ships. | Medium — skeleton flash on every visit; acceptable for a management dashboard |
| Client — Restaurant Monitor | SSE connection opens ~200–400ms after mount → queue/table data lags one tick on first render. `<MonitoringSkeleton />` required; show until both `useQuery` resolves AND first SSE event received. Also: iOS Safari kills EventSource when screen locks — add `visibilitychange` reconnect handler. | Medium — blank monitoring zones on cold visit without skeleton; SSE drop silently on iOS |
| Client — Order Tracking | SSE disconnect + reconnect may miss events during the gap — stale item counts shown until next SSE tick. Mitigation: `refetchOnWindowFocus: true` on `useQuery`, OR `queryClient.invalidateQueries(['order', orderId])` inside `useOrderSSE` reconnect handler. `<OrderPageSkeleton />` not yet built — blank screen on every cold visit until it ships. | High — skeleton required before shipping; reconnect gap is Medium on slow/mobile networks |
