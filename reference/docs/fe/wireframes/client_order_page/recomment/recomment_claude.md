---
page: client_order_page
type: AI architecture brief
updated: 2026-05-28
audience: Developer implementing the page (Claude or human)
---

# Claude Architecture Brief — Client Order Tracking Page

> This file answers: "If I hand this spec to Claude to implement, what does Claude need to know that isn't in the main wireframe doc?"
> Read `client_order_page_wireframe_v1.md` + `tech_description.md` first, then this file.

---

## 1. Non-Obvious Constraints

- **Pattern B — no ISR.** `page.tsx` must have `'use client'` at the top. Do NOT add `export const revalidate`. The orderId is a runtime URL param; server pre-rendering is impossible.
- **`staleTime: 0` is intentional.** The order query must always consider itself stale so SSE events can patch it via `queryClient.setQueryData`. Do not raise staleTime.
- **SSE drives the cache, not the query.** The primary update mechanism is `useOrderSSE` patching the cache. `useQuery` is for initial load + reconnect resync only.
- **No writes to global Zustand stores.** This page reads `useSettingsStore` but writes nothing to it. All mutations go directly to the API; the SSE event that follows updates the cache. Do not add cart or settings mutations here.
- **`qtyRemaining = qtyOrdered − qtyServed`** — compute this client-side from the API response. Do not trust a `qtyRemaining` field from the API; it may drift if events are missed.

---

## 2. Component Reuse Strategy

All new components are **page-local** (`app/(shop)/order/[id]/components/`). Zero shared components are introduced by this page.

Shared components to wire in:
| Component | Import path | Usage |
|-----------|-------------|-------|
| `ConnectionErrorBanner` | `components/shared/ConnectionErrorBanner.tsx` | Zone C1 — show on `sseStatus === 'error'` |
| `StatusBadge` | `components/shared/StatusBadge.tsx` | Nav area — render order status label |
| `QuantityStepper` | `components/shared/QuantityStepper.tsx` | Zone 1 — drink/soup items only (`hasQuantityStepper: true`) |
| `Button` | `components/ui/button.tsx` | Zone 5 (red outline), Zone 6 (orange), Modal B confirm/cancel |
| `Badge` | `components/ui/badge.tsx` | `còn×N` labels (`variant='warning'`), `✓ xong` (`variant='success'`) |

---

## 3. SSE Architecture Pattern

This is the same SSE pattern as `client_tracking` and `admin_overview`. Follow the same approach:

```tsx
// hooks/useOrderTracking.ts — single entry point for all order data
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

- `useOrderSSE` **already exists** in the codebase. Wire it; don't rewrite it.
- The `applyPatch` function should do a shallow merge of the SSE patch into the existing query data. For `item_update` events, find the item by `itemId` and update `qtyServed` only.
- On `order_confirmed` SSE event: set `showConfirmedModal = true` via local state (do NOT put this in Zustand).
- On `order_delivered`: set `order.status = 'delivered'` in the cache via `setQueryData`.

---

## 4. Skeleton — Required Before Shipping

`<OrderPageSkeleton />` is **not yet built** and is a hard blocker for Pattern B.

Build it as a series of gray rounded rectangles matching the zone layout:
1. Nav bar skeleton (dark bg, back arrow shape, pill shape right)
2. Order card skeleton (header row + 3 item stubs + progress bar shape)
3. Table skeleton (4 row stubs with column placeholders)
4. Money card skeleton (3 line stubs)
5. Two button stubs at the bottom

```tsx
// components/OrderPageSkeleton.tsx
export function OrderPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-24 animate-pulse">
      <div className="h-10 bg-gray-200 rounded-lg w-full" /> {/* nav */}
      <div className="h-48 bg-gray-200 rounded-xl w-full" /> {/* order card */}
      <div className="h-40 bg-gray-200 rounded-xl w-full" /> {/* table */}
      <div className="h-24 bg-gray-200 rounded-xl w-full" /> {/* money card */}
      <div className="h-10 bg-gray-200 rounded-lg w-full" /> {/* zone 5/6 */}
    </div>
  )
}
```

---

## 5. Cancel Flow — Step by Step

Modal B handles both item cancel and whole-order cancel from the same component. The `cancelTarget` local state type determines which variant renders:

```
User taps Huỷ (item)
  → setCancelTarget({ type: 'item', itemId, itemName })
  → Modal B opens with "Huỷ món X?" copy

User taps Huỷ toàn bộ (Zone 5)
  → setCancelTarget({ type: 'whole' })
  → Modal B opens with "Huỷ toàn bộ đơn?" copy

Modal B confirm tapped
  → if type === 'item': call cancelItem mutation
  → if type === 'whole': call cancelOrder mutation
  → on success: queryClient.invalidateQuery(['order', orderId])
  → on error: toast error, item NOT removed from UI (no optimistic update)
  → setCancelTarget(null) → Modal B closes

Modal B "Giữ lại" tapped
  → setCancelTarget(null) → Modal B closes, no action
```

**Important:** Do NOT use optimistic updates for cancel. The server is the source of truth; only remove items when the mutation succeeds and the SSE event confirms.

---

## 6. State Contract Summary

```
Reads from global state:
  useSettingsStore → tableLabel (nav display) · guestToken (API auth + SSE auth)

Writes to global state:
  NONE

Local state (page.tsx or OrderPageContent):
  isCardCollapsed: boolean
  comboCollapsed: Record<string, boolean>     // keyed by comboId
  cancelTarget: CancelTarget | null
  showConfirmedModal: boolean

Server cache (TanStack Query):
  ['order', orderId]   staleTime: 0, refetchOnWindowFocus: true
  Patched in-place by useOrderSSE on each SSE event
```

---

## 7. Cross-Page Notes

- `['order', orderId]` is shared with `client_tracking`. If the monitoring page is open in another tab, both will receive SSE updates independently. This is fine — no coordination needed.
- `useSettingsStore.guestToken` must be present before this page renders. If absent (expired or null), redirect to QR scan entry at the hook level before any query fires.
- Zone 6 "＋ Thêm món" should navigate to `/(shop)/menu` with `activeOrderId` passed via search params or via `useCartStore.activeOrderId`. Confirm the handoff mechanism with the Menu page implementation before building this zone.

---

## 8. Implementation Checklist

```
[ ] page.tsx — 'use client'; imports useOrderTracking; shows OrderPageSkeleton on isLoading
[ ] OrderTrackingNav — LIVE pill color: green=connected, red/grey=error/connecting
[ ] ConnectionErrorBanner — wired to sseStatus === 'error'
[ ] OrderCard — Zone 1 card; collapse toggle; progress bar color switches green at 100%
[ ] ComboSection — collapse per combo; passes onCancel to OrderItemRow
[ ] OrderItemRow — còn×N badge; ✓ xong badge; Huỷ button → opens Modal B; QuantityStepper for drinks
[ ] ToppingChip — name + extraPrice display; max 2 visible + overflow
[ ] DishSummaryTable — Zone 2 table; all columns from wireframe
[ ] MoneySummaryCard — Zone 3; Đã dùng · Còn lại · Tổng cộng; Tổng = text-lg font-semibold
[ ] CompletedBanner — Zone 4; green border + bg; shown when status === 'delivered'
[ ] Zone 5 — red outline Button; shown when progress < 30% AND status is active
[ ] Zone 6 — orange Button; shown when tableId !== null
[ ] OrderConfirmedModal — Modal A; auto-opens on SSE order_confirmed; dismissed by user
[ ] CancelConfirmModal — Modal B; two variants (item · whole); no optimistic update
[ ] OrderPageSkeleton — required before shipping; mirrors zone layout
[ ] useOrderTracking hook — wraps useQuery + useOrderSSE
[ ] Redirect if guestToken absent/expired → QR scan page
[ ] iOS visibilitychange reconnect handler inside useOrderSSE
```
