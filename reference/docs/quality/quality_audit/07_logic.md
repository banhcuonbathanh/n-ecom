# Logic Correctness Audit — ASPECT 7

## Verdict

The core order-payload path is solid: all three cart-driven POST paths (menu `TableConfirmModal`, `CheckoutPage`, and `CartDrawer` add-to-order) correctly import and use `buildOrderItemsPayload`. Cart math is integer-safe. The combo model (header price = 0, sub-items carry real prices) and the `qty_served`-derived item status are both respected. The most significant logic bugs are: (1) the cancel-button guard in `OrderDetailSheet` is looser than the business rule — it shows "Cancel" for `pending` orders even though the rule only allows cancel on `pending/confirmed/preparing`, and it does not exclude `ready`/`delivered`; (2) the payment page has no FE-side guard on `order.status === 'ready'` — cashiers can attempt to create a payment for any status; and (3) the POS `createOrder` mutation hand-rolls its own items array instead of using `buildOrderItemsPayload`, violating the single-builder rule.

---

## Findings

### LG-1 — POS `createOrder` hand-rolls items payload — violates single-builder rule
**Status:** ⬜
**Severity:** 🔴 Critical
**File:** `fe/src/app/(dashboard)/pos/page.tsx` lines 92–97

```ts
items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
```

The POS cart uses its own local `PosCartItem[]` type (not `CartItem`) and builds its payload inline, completely bypassing `buildOrderItemsPayload`. The inline payload omits `combo_id`, `topping_ids`, `note`, and `combo_items` overrides. In a POS-only flow where only standalone products (no combos, no toppings) are ordered this may function, but it silently diverges from the canonical builder and will break if POS ever supports combos or nhân selection. The CLAUDE.md mandate is explicit: "MỌI payload cart→order PHẢI đi qua `src/lib/order-payload.ts`".

**Fix:** Refactor `PosCartItem` to extend or convert to `CartItem`, then call `buildOrderItemsPayload(posCart as CartItem[])`. Alternatively add a thin adapter in `order-payload.ts` for the simple POS case that at minimum passes `topping_ids: []` and `combo_id: null`.

---

### LG-2 — Payment page has no FE guard on `order.status === 'ready'`
**Status:** ⬜
**Severity:** 🔴 Critical
**File:** `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx` lines 215–248

MASTER §4.3 states: "Chỉ tạo payment record khi order.status = ready (hoặc delivered)". The payment page renders the "Xác nhận COD" / "Tạo QR" button and calls `POST /payments` regardless of `order.status`. A cashier can navigate directly to `/cashier/payment/<id>` for a `pending` or `preparing` order and trigger payment creation. The BE should reject this, but the FE never shows an error state or early return — it just surfaces the "Không thể tạo thanh toán" toast if BE rejects.

**Fix:** Add a guard before rendering payment controls:
```tsx
const isPayable = order.status === 'ready' || order.status === 'delivered'
if (!isPayable) {
  return <div className="text-urgent p-8 text-center">Đơn chưa sẵn sàng — chờ bếp hoàn thành</div>
}
```

---

### LG-3 — `OrderDetailSheet` cancel guard includes `ready` and `delivered` orders
**Status:** ⬜
**Severity:** 🟠 Major
**File:** `fe/src/features/order/components/OrderDetailSheet.tsx` line 135

```ts
const canCancelOrder = progress < 30 && isActive
// isActive = status !== 'delivered' && status !== 'cancelled'
```

This shows the cancel button for `ready` orders. MASTER §4.1 cancel rule allows cancel only for `pending`, `confirmed`, `preparing` (and < 30%). A `ready` order has all items done — `progress` is 100% (qty_served = qty), so `progress < 30` would be false in practice. However, the intent is wrong: if for any reason `qty_served` fields are stale or 0 on a `ready` order, the cancel button appears and the API call fires. Compare with the correct implementation in `order/[id]/page.tsx` line 233 which explicitly checks `(order.status === 'confirmed' || order.status === 'preparing')`.

**Fix:** Change line 135 to match the `order/[id]/page.tsx` implementation:
```ts
const canCancelOrder = progress < 30 && (order?.status === 'confirmed' || order?.status === 'preparing' || order?.status === 'pending')
```

---

### LG-4 — `WaitingSection` action buttons diverge from Status Routing Reference
**Status:** ⬜
**Severity:** 🟠 Major
**File:** `fe/src/features/admin/components/WaitingSection.tsx` lines 9, 14–21

The Status Routing Reference (Zone B) states WaitingSection shows ONLY `pending` orders. The component correctly filters `PREP_STATUSES = Set(['pending'])` at line 9 and 55, so the list is correct. However the `nextAction()` function (lines 14–21) handles `confirmed`, `preparing`, and `ready` cases — returning buttons for those statuses even though no such orders are displayed in Zone B. These buttons are dead code today, but if the filter is ever relaxed (e.g., during a bug fix), the wrong zone would show non-pending transitions. More concretely, the Status Routing Reference specifies Zone B action: `pending → confirmed` only. The extra entries in `nextAction` inside WaitingSection are misleading.

**Fix:** Scope `nextAction` in `WaitingSection.tsx` to only handle `pending` (returning `null` for other statuses), matching the documented Zone B contract. Keep the full `nextAction` only in `OrderDetail.tsx` and `PrepPanel.tsx` where all transitions are valid.

---

### LG-5 — `OrderDetailSheet` cancel-order also shows for `pending` status — inconsistent with `order/[id]/page.tsx`
**Status:** ⬜
**Severity:** 🟡 Minor
**File:** `fe/src/features/order/components/OrderDetailSheet.tsx` line 135 vs `fe/src/app/(shop)/order/[id]/page.tsx` line 233

`order/[id]/page.tsx`: `canCancelOrder = progress < 30 && (status === 'confirmed' || status === 'preparing')` — excludes `pending`.
`OrderDetailSheet.tsx`: `canCancelOrder = progress < 30 && isActive` — includes `pending`.

The business rule (MASTER §4.1) allows cancelling `pending`. The `order/[id]` implementation is therefore the stricter but wrong one: it denies cancel on `pending`. Both files should align. The correct rule is: cancel allowed when `status ∈ {pending, confirmed, preparing}` AND `progress < 30`.

**Fix:** In `order/[id]/page.tsx` line 233, add `pending` to the status check:
```ts
const canCancelOrder = progress < 30 &&
  (order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing')
```

---

### LG-6 — Race condition in `useOrderSSE`: REST snapshot and SSE stream can reorder
**Status:** ⬜
**Severity:** 🟡 Minor
**File:** `fe/src/hooks/useOrderSSE.ts` lines 54–66

The hook performs a REST `GET /orders/${orderId}` to seed the order state, then opens an SSE stream. Between the REST call completing and the SSE connection opening, the server may push SSE events. If the SSE events arrive before `setOrder(data.data)` at line 57 runs (async scheduling), the order state will be overwritten with stale REST data, losing intermediate SSE updates. This is unlikely but possible in high-latency scenarios.

**Fix:** Seed from REST and SSE in a coordinated way: store a "seeded at" timestamp alongside the REST response and ignore SSE events with an older `updated_at` than the seed — or simply accept that the SSE `item_progress` events are idempotent patches and won't corrupt state.

---

### LG-7 — Double-submit protection missing on `createPayment` mutation in payment page
**Status:** ⬜
**Severity:** 🟡 Minor
**File:** `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx` lines 237–248

The "Xác nhận COD" / "Tạo QR" button disables correctly via `disabled={createPayment.isPending}`. However, if the network hangs and the mutation resolves after the component re-renders (e.g., after a browser back/forward), there is no `useRef` guard like `checkout/page.tsx` uses (`submitted.current`). For a payment of potentially thousands of VND, a double-create would create two `pending` payment records. The BE should handle idempotency, but the FE has no protection.

**Fix:** Add a `const paid = useRef(false)` guard and set it to `true` in `onSuccess`; disable the button when `paid.current || createPayment.isPending`.

---

## What's Already Good

- All three canonical cart-to-order POST paths use `buildOrderItemsPayload`: `TableConfirmModal` (`fe/src/features/menu/components/TableConfirmModal.tsx:26`), `CheckoutPage` (`fe/src/app/(shop)/checkout/page.tsx:55`), and `CartDrawer` add-to-order (`fe/src/features/menu/components/CartDrawer.tsx:31`).
- Combo header items are correctly filtered from display views: `order/[id]/page.tsx` and `order/page.tsx` both filter with `filter(i => !(i.combo_id && !i.combo_ref_id))`.
- Item status is correctly derived from `qty_served` throughout: `useOrderSSE` progress (`lines 152–157`), KDS `done` flag (`kds/page.tsx` line 228), and order display — no invented `status` field.
- Cart total is integer-only: `price * quantity` where `price` is always an integer VND amount from the server; no float arithmetic.
- `TableConfirmModal` and `CheckoutPage` both have `isPending` disable states on their submit buttons plus `useRef` guards to prevent navigation races.
- `canh` items are correctly represented as standalone `CartItem`s with `product_id`, passing through `buildOrderItemsPayload` as normal product rows.
