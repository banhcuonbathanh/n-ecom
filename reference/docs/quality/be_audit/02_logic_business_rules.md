# BE Quality Audit — Business Logic & Rules
> BE Quality Audit — 2026-06-11 — branch experience_claude.md_system_1

## Summary

The core order state machine, cancel threshold enforcement, and payment idempotency are all correctly implemented. However, two CRITICAL bugs will silently corrupt production data: cash payments (and any payment on a `ready` order) leave the order permanently stuck at `ready` status because `completePayment` calls `MarkOrderPaid` which requires `delivered` — the error is logged but swallowed. Second, concurrent duplicate webhook delivery has no row-level lock and can produce double `completed` writes before the idempotency check runs. The 1-table-1-active-order rule is intentionally relaxed to an informational flag without owner confirmation, which diverges from the project spec.

Counts by severity: 2 CRITICAL, 2 MAJOR, 4 MINOR.

---

## Findings

### L-01 [🔴 CRITICAL] Cash payment leaves order permanently stuck at `ready` — status never advances to `paid`

- **Where:** `be/internal/service/payment_service.go:99` (cash path) and `265-267` (completePayment)
- **Problem:**
  ```go
  // CreatePayment — cash path (line 99):
  _ = s.completePayment(ctx, paymentID, in.OrderID, "", nil)

  // completePayment (line 265):
  if err := s.orderWriter.MarkOrderPaid(ctx, orderID); err != nil {
      slog.WarnContext(ctx, "payment: mark order paid failed", ...)
      // ← error is logged and silently discarded
  }
  ```
  `GetOrderForPayment` (line 50) allows creating a payment when `status = 'ready' OR 'delivered'`. But `MarkOrderPaid` (order_service.go:83) requires `status = 'delivered'` exactly:
  ```go
  if o.Status != db.OrdersStatusDelivered {
      return fmt.Errorf("order: cannot mark paid, status is %s", o.Status)
  }
  ```
  For a cash payment on a `ready` order: payment row is set to `completed`, but the order stays at `ready` forever. The cashier sees "payment complete" on the client while the floor monitor still shows the table as active.
- **Why it matters:** Silent data inconsistency — paid orders remain in the "active" list, the table appears occupied, and the cashier cannot create a new order for that table. Affects every cash payment where the cashier skips the deliver step.
- **Fix option A (minimal):** In `completePayment`, call `MarkOrderDelivered` before `MarkOrderPaid` — `MarkOrderDelivered` is already idempotent:
  ```go
  _ = s.orderWriter.MarkOrderDelivered(ctx, orderID)   // no-op if already delivered
  if err := s.orderWriter.MarkOrderPaid(ctx, orderID); err != nil {
      return fmt.Errorf("payment: mark order paid: %w", err)  // now also return it
  }
  ```
- **Fix option B (also needed):** Do not swallow the `MarkOrderPaid` error — return it so the caller knows the payment completed but the order status update failed.

---

### L-02 [🔴 CRITICAL] Duplicate webhook delivery has no row-level lock — double-completion race

- **Where:** `be/internal/service/payment_service.go:213-248`
- **Problem:**
  ```go
  pmt, err := s.repo.GetPaymentByOrderID(ctx, orderID)  // read
  ...
  if pmt.Status == db.PaymentsStatusCompleted {          // idempotency check
      return nil
  }
  ...
  return s.completePayment(ctx, pmt.ID, ...)             // write
  ```
  Payment gateways can fire the IPN/webhook more than once within milliseconds of each other. Between the `GetPaymentByOrderID` read and the `UpdatePaymentStatus` write, a second webhook goroutine can read `status='pending'` (idempotency check passes for both) and both proceed to call `completePayment`. The `payments` table has no transaction and no `SELECT FOR UPDATE`, so both writes succeed:
  - Two `UpdatePaymentStatus` rows are written (last-write-wins on the DB UPDATE is safe for payment itself).
  - But `MarkOrderDelivered` / `MarkOrderPaid` may be called twice, publishing two `payment_success` SSE events.
- **Why it matters:** Double SSE publish is cosmetic but the lack of a mutex around the read-check-write means in theory a refund could be triggered twice for a future refund endpoint. The immediate risk is confusing double-events on the cashier screen.
- **Fix:** Wrap the read-check-write in a DB transaction with `SELECT ... FOR UPDATE` on the payment row, or use an optimistic `UPDATE payments SET status='completed' WHERE id=? AND status='pending'` and check rows-affected before proceeding.

---

### L-03 [🟠 MAJOR] `CreateOrder` no longer enforces 1-table-1-active-order — spec violation

- **Where:** `be/internal/service/order_service.go:259-274`
- **Problem:**
  ```go
  // "Informational only: does the table already have another active order?"
  if in.TableID != "" {
      if _, qErr := s.repo.GetActiveOrderByTable(ctx, tableID); qErr == nil {
          tableBusy = true   // never blocks — order is ALWAYS created
      }
  }
  ```
  The comment says "informational only" and the code confirms it: creation always succeeds regardless of `tableBusy`. The order-flow spec (SKILL.md) states: "Check before INSERT into orders — If violated → 409 TABLE_HAS_ACTIVE_ORDER".
- **Why it matters:** Multiple simultaneous orders on the same table means the total_amount on any later payment covers only the newest order; the kitchen sees duplicate pending orders; the cashier must manually reconcile. The FE relies on the 409 to redirect to the existing order.
- **Note:** The CLAUDE.md session notes say this was intentionally relaxed ("A new guest sits down while a previous guest's order is still open"). If this is the new policy, the spec must be updated and the SKILL.md rule must be changed. As-is, the BE and the spec contradict each other.
- **Fix (if spec is the source of truth):** Return `ErrTableHasActiveOrder` when `tableBusy = true` instead of continuing silently.

---

### L-04 [🟠 MAJOR] `CreateGroup` is not atomic — TOCTOU race allows same order in two groups

- **Where:** `be/internal/service/group_service.go:25-46`
- **Problem:**
  ```go
  // Phase 1: validate all orders (no lock)
  for _, id := range orderIDs {
      o, err := s.orderRepo.GetOrderByID(ctx, id)
      if o.GroupID.Valid { return "", ErrAlreadyGrouped }
  }
  // Phase 2: assign group_id (different calls, different connection)
  groupID := newUUID()
  for _, id := range orderIDs {
      s.orderRepo.SetOrderGroupID(ctx, id, groupID)
  }
  ```
  Between phase 1 and phase 2 there is no transaction or lock. Two concurrent `CreateGroup` requests that share even one order ID will both pass the validation phase, then both assign different `group_id` values — the second write wins silently, leaving a corrupted group state.
- **Why it matters:** Table grouping for a shared bill is a cashier operation; two cashiers acting simultaneously on a busy night can produce an invisible integrity violation.
- **Fix:** Run the validation + assignment in a single DB transaction. Since `SetOrderGroupID` is an individual repo call, add a `CreateGroupTx(ctx, orderIDs, groupID)` repo method that uses `BeginTx` and validates + updates inside it.

---

### L-05 [🟡 MINOR] `maybeAutoReady` can publish duplicate `order_status_changed` events under concurrent `UpdateItemServed` calls

- **Where:** `be/internal/service/order_service.go:727-746`
- **Problem:**
  ```go
  func (s *OrderService) maybeAutoReady(ctx context.Context, orderID string) {
      served, total, err := s.repo.SumQtyServedAndQuantity(ctx, orderID)
      if served < total { return }
      o, err := s.repo.GetOrderByID(ctx, orderID)
      if err != nil || o.Status != db.OrdersStatusPreparing { return }
      s.repo.UpdateOrderStatus(ctx, db.OrdersStatusReady, orderID)
      s.publishOrderEvent(...)
  }
  ```
  Two concurrent chef clicks on the last items can both see `served == total` and `status == preparing` (before either write completes). Both call `UpdateOrderStatus` — MySQL serialises the UPDATEs so the second is a no-op at DB level, but both goroutines reach `publishOrderEvent`, firing the event twice.
- **Why it matters:** Duplicate `order_status_changed:ready` events will briefly show the order as "ready" twice on the KDS/admin screens. No data corruption.
- **Fix:** Change `UpdateOrderStatus` to conditional: `UPDATE orders SET status='ready' WHERE id=? AND status='preparing'` and only publish the event if `rowsAffected == 1`.

---

### L-06 [🟡 MINOR] `UpdateItemServed` does not reject `qty_served > item.Quantity` until DB call

- **Where:** `be/internal/service/order_service.go:710-712`
- **Problem:**
  ```go
  if newQtyServed < 0 || newQtyServed > item.Quantity {
      return ErrInvalidInput
  }
  ```
  This guard is actually correct. However, `item.Quantity` is read before the guard and there is no concurrent-update check. A chef setting `qty_served = 5` on an item where another cashier just changed `quantity = 3` (via `UpdateOrderItemQuantity`) would correctly be rejected — but only if the item read is fresh. Because `GetOrderItemByID` is outside any transaction, there is a brief window where the guard passes but the DB constraint should catch it.
- **Why it matters:** Cosmetic — the worst outcome is a warning log and an incorrect `qty_served`. The guard itself is correct so this is documentation-level.
- **Fix:** Document the inherent race in a comment; no code change required.

---

### L-07 [🟡 MINOR] Payment timeout job does not publish SSE events for expired payments

- **Where:** `be/internal/jobs/payment_timeout.go:37-48`
- **Problem:**
  ```go
  result, err := sqlDB.ExecContext(ctx,
      `UPDATE payments SET status = 'failed' ... WHERE status = 'pending' AND expires_at < NOW()`)
  ```
  The batch UPDATE correctly expires payments but never publishes Redis events to notify any connected client (guest tracking their payment, cashier watching the screen) that the payment timed out.
- **Why it matters:** Guest on the payment page sees no feedback; they may retry with the expired payment. The cashier screen does not auto-refresh.
- **Fix:** After the bulk UPDATE, query the affected payment IDs and publish a `payment_expired` event to `orders:kds` for each. Or move the expiry logic into a service method that has access to `rdb`.

---

### L-08 [🟡 MINOR] `GetOrderForPayment` allows payment creation on `delivered` orders — potential double-payment after refund

- **Where:** `be/internal/service/order_service.go:50`
- **Problem:**
  ```go
  if o.Status != db.OrdersStatusReady && o.Status != db.OrdersStatusDelivered {
      return OrderPaymentView{}, ErrOrderNotReady
  }
  ```
  The `CreatePayment` idempotency check (payment_service.go:71-74) only blocks if an existing payment with `status != 'failed'` exists. After a payment is set to `failed` (e.g. VNPay timeout), a second payment can be created for an order that is already `delivered`. This is the intended retry flow, but if the first payment's webhook later arrives (gateway retries), two `completed` payments exist for one order.
- **Why it matters:** The spec says idempotency must check `payment.status` before any write (SKILL.md) — this is done, but the combination of retry + late webhook means money is collected twice. The amount-mismatch guard at line 230-236 is the only safeguard.
- **Fix:** In `processWebhookResult`, after the idempotency check, also verify `pmt.ID == expected_payment_id` (the one just created) before marking completed. Or add a unique constraint on `payments.order_id` allowing only one non-failed payment per order at a time.

---

## What is GOOD (keep doing)

- **Order state machine is correctly defined and enforced:** `validTransitions` map (order_service.go:524-530) covers all valid paths; `isValidTransition` rejects any other move with a 409.
- **Cancel threshold calculation is correct:** `SUM(qty_served) / SUM(quantity) >= 0.30` (line 586) with integer overflow-safe int64 arithmetic; correctly returns `ErrCancelThreshold` (422 UnprocessableEntity).
- **Combo header unit_price=0 rule enforced:** `expandCombo` (line 402) explicitly sets `UnitPrice: formatPrice(0)` on the header row with a comment explaining the double-count risk.
- **Payment HMAC verification is first:** all three webhook handlers (VNPay, MoMo, ZaloPay) verify the signature before any DB read — correct per spec.
- **Webhook idempotency check present:** `processWebhookResult` checks `pmt.Status == completed` before any write.
- **Amount verification against DB record:** gateway-reported amount is cross-checked against `pmt.Amount` (line 230-236); mismatches are rejected with 400 AMOUNT_MISMATCH.
- **Money is stored and computed in int64 VND throughout:** `formatPrice`/`ParsePrice` use `strconv.FormatInt`/`ParseFloat`+`math.Round`; no float64 is used for monetary totals or payments. (Ingredient quantities use float64 which is appropriate for physical units.)
- **`RecalculateTotalAmount` called inside every atomic transaction for the primary paths:** `CreateOrderWithItems` (repo line 115) and `AppendOrderItems` (repo line 148) both call it inside the same `BeginTx`.
- **Order ownership check for customers is consistent:** all mutating paths (Get, Cancel, AddItems, CancelItem, UpdateItemQuantity) correctly use `table_id` as the guest identity, not the staff `sub` claim.
- **Soft-delete is used everywhere** (orders, payments, products, categories) — hard-delete is not exposed by any handler, so audit trail is preserved.
- **`generateOrderNumber` has collision retry logic:** up to 3 attempts with a unique-constraint check on `uq_orders_order_number` (order_service.go:332-346).
