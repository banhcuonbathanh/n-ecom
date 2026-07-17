> Dành cho: Frontend engineers building `/(shop)/order/[id]`.
> Source: `CURRENT_TASK.md` pre-computed facts (extracted from `order_ver2.excalidraw` 2026-05-27).

---

# Tech Description: Client — Order Tracking

**Route:** `/(shop)/order/[id]`
**Pattern:** B — Full Client (`'use client'` on page root)
**Device:** Mobile (420px)

---

## RBAC

| Dimension | Value |
|-----------|-------|
| Auth guard | None — no `AuthGuard` or `RoleGuard` wrapper |
| Allowed role | Guest — QR-linked session |
| Role-conditional UI | None — all zones visible to all guests (conditional zones are data-driven, not role-driven) |
| Auth state used | `useSettingsStore` → `guestToken` (Bearer on API/SSE), `tableLabel` (display only) |
| Unauthorized redirect | Guest token expired → redirect to QR scan page (or `/`) |

No role hierarchy check is needed. The only protection is a valid `guestToken` in `useSettingsStore`. If absent or expired, redirect at the hook level before rendering.

---

## Rendering Strategy — Pattern B

All data is order-specific (tied to a `orderId` URL param) and receives realtime updates via SSE. ISR is not viable — the page cannot be pre-rendered without knowing the orderId, and the data mutates continuously during the order lifecycle.

```tsx
'use client'

export default function OrderPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useOrderTracking(params.id)
  if (isLoading) return <OrderPageSkeleton />
  return <OrderPageContent data={data} orderId={params.id} />
}
```

| Property | Value |
|----------|-------|
| `'use client'` | Yes — on `page.tsx` itself |
| ISR revalidate | N/A |
| RSC prefetch | None |
| Skeleton | `<OrderPageSkeleton />` — **required** (Pattern B, status: ❌ not yet built) |
| SSE integration | `useOrderSSE(orderId)` — patches `['order', orderId]` cache via `queryClient.setQueryData` |

---

## TypeScript Interfaces

```typescript
type OrderStatus = 'pending' | 'active' | 'delivered' | 'cancelled'

interface ToppingDisplay {
  name: string
  extraPrice: number  // 0 if free
}

interface OrderItemDisplay {
  id: string
  name: string
  qtyOrdered: number
  qtyServed: number
  qtyRemaining: number
  unitPrice: number
  totalPrice: number
  toppings: ToppingDisplay[]
  isInCombo: boolean
  isDone: boolean
  hasQuantityStepper: boolean  // true for drink/soup items
}

interface ComboSectionData {
  comboId: string
  comboName: string
  items: OrderItemDisplay[]
  isCollapsed: boolean
}

interface OrderCardData {
  orderId: string
  tableLabel: string
  orderNumber: string
  status: OrderStatus
  totalPrice: number
  elapsedMinutes: number
  progressPercent: number
  combos: ComboSectionData[]
  standaloneItems: OrderItemDisplay[]
  partsServed: number
  partsTotal: number
}

interface MoneyBreakdown {
  servedAmount: number
  remainingAmount: number
  grandTotal: number
  partsServed: number
  partsRemaining: number
}

// Modal B cancel target — covers both item-level and whole-order cancel
type CancelTarget =
  | { type: 'item'; itemId: string; itemName: string }
  | { type: 'whole' }
```

---

## Query Hooks

### `useOrderTracking` (new hook)

File: `src/hooks/useOrderTracking.ts`

Wraps `useQuery` + `useOrderSSE`. This is the single entry point for all order data on this page.

```typescript
export function useOrderTracking(orderId: string) {
  const queryClient = useQueryClient()
  const { guestToken } = useSettingsStore()

  const query = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId, guestToken),
    staleTime: 0,
    refetchOnWindowFocus: true,  // catch missed events on reconnect
  })

  useOrderSSE(orderId, {
    onEvent: (patch) => {
      queryClient.setQueryData(['order', orderId], (prev) => applyPatch(prev, patch))
    },
  })

  return query
}
```

**SSE reconnect gap:** On disconnect + reconnect, `refetchOnWindowFocus: true` ensures the query re-fetches to catch any events missed during the gap. Alternatively, trigger `queryClient.invalidateQueries(['order', orderId])` manually inside `useOrderSSE`'s reconnect handler.

### `useOrderSSE` (existing hook)

Already exists in the codebase. Wire it to patch `['order', orderId]` in queryClient on each event.

| SSE Event | Payload | Cache action |
|-----------|---------|--------------|
| `order_confirmed` | — | Set `showConfirmedModal = true` (local state) |
| `item_update` | `{ itemId, qtyServed }` | `setQueryData` — patch item in cache |
| `order_ready` | — | `setQueryData` — set status to `delivered` |
| `order_delivered` | — | `setQueryData` — set status to `delivered` |

---

## File Organization Tree

```
src/
├── app/(shop)/order/[id]/
│   ├── page.tsx                    ← 'use client'; Pattern B root
│   └── components/
│       ├── OrderTrackingNav.tsx    ← Nav: back button + LIVE pill (new, local)
│       ├── OrderCard.tsx           ← Zone 1: collapsible card (new, local)
│       ├── ComboSection.tsx        ← Zone 1: combo group inside OrderCard (new, local)
│       ├── OrderItemRow.tsx        ← Zone 1: single item row + còn×N + Huỷ + stepper (new, local)
│       ├── ToppingChip.tsx         ← Zone 1 + 2: small topping label chip (new, local)
│       ├── DishSummaryTable.tsx    ← Zone 2: summary table (new, local)
│       ├── MoneySummaryCard.tsx    ← Zone 3: money breakdown card (new, local)
│       ├── CompletedBanner.tsx     ← Zone 4: green completion banner (new, local)
│       ├── OrderConfirmedModal.tsx ← Modal A: SSE push on order_confirmed (new, local)
│       ├── CancelConfirmModal.tsx  ← Modal B: item + whole-order cancel (new, local)
│       └── OrderPageSkeleton.tsx  ← Pattern B skeleton (new, local) — ❌ not yet built
├── hooks/
│   └── useOrderTracking.ts        ← wraps useQuery + useOrderSSE (new)
└── store/
    └── settings.ts                ← useSettingsStore (already exists — read-only here)
```

---

## Component Reuse Audit

| Component | Reuse? | Source |
|-----------|--------|--------|
| `ConnectionErrorBanner` | ✅ reuse | `shared/ConnectionErrorBanner.tsx` — Tier 2 |
| `StatusBadge` | ✅ reuse | `shared/StatusBadge.tsx` — order statuses |
| `QuantityStepper` | ✅ reuse | `shared/QuantityStepper.tsx` — Tier 2 |
| `Button` | ✅ reuse | `ui/button.tsx` — Tier 1 |
| `Badge` | ✅ reuse | `ui/badge.tsx` — Tier 1 |
| `OrderTrackingNav` | new (local) | `components/OrderTrackingNav.tsx` |
| `OrderCard` | new (local) | `components/OrderCard.tsx` |
| `ComboSection` | new (local) | `components/ComboSection.tsx` |
| `OrderItemRow` | new (local) | `components/OrderItemRow.tsx` |
| `ToppingChip` | new (local) | `components/ToppingChip.tsx` |
| `DishSummaryTable` | new (local) | `components/DishSummaryTable.tsx` |
| `MoneySummaryCard` | new (local) | `components/MoneySummaryCard.tsx` |
| `CompletedBanner` | new (local) | `components/CompletedBanner.tsx` |
| `OrderConfirmedModal` | new (local) | `components/OrderConfirmedModal.tsx` |
| `CancelConfirmModal` | new (local) | `components/CancelConfirmModal.tsx` |
| `OrderPageSkeleton` | new (local) | `components/OrderPageSkeleton.tsx` |
| `useSettingsStore` | ✅ reuse | `store/settings.ts` — tableLabel · guestToken |

**No new shared components.** All new components are page-local (`app/(shop)/order/[id]/components/`).

---

## Local State

| Variable | Type | Purpose |
|----------|------|---------|
| `isCardCollapsed` | `boolean` | Zone 1 collapse toggle (↕ button on card header) |
| `comboCollapsed` | `Record<string, boolean>` | Per-combo collapse state (keyed by `comboId`) |
| `cancelTarget` | `CancelTarget \| null` | Drives Modal B — set on any Huỷ tap; cleared on modal close |
| `showConfirmedModal` | `boolean` | Drives Modal A — set to `true` on `order_confirmed` SSE event |

---

## State Contract

> What this page reads and writes to global state. Local state is not listed.

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useSettingsStore` | `tableLabel` · `guestToken` | none | Set at QR scan; read-only here | — |

**No mutations to global stores.** All actions (cancel, qty update) go directly to the API; the SSE event that follows patches the TanStack Query cache.

---

## Known Rendering Gap

| Gap | Impact | Mitigation |
|-----|--------|------------|
| SSE disconnect + reconnect may miss events during the gap | Medium — stale item counts shown until next event | `refetchOnWindowFocus: true` on the query; alternatively `queryClient.invalidateQueries(['order', orderId])` inside `useOrderSSE`'s reconnect handler |
| `<OrderPageSkeleton />` not yet built | High — blank screen on cold visit (Pattern B) | Must build before shipping |

---

*Version: v1 · Created: 2026-05-27*
