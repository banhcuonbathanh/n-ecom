# POS — Known Code Bugs (found during `/page-doc-set staff_pos`)

> **TL;DR:** 2 code-level issues surfaced while tracing `/pos` against source on branch
> `experience_claude.md_system_1`. These are **code** mismatches/gaps, not stale docs — the doc
> skill does not touch app code, so they are recorded here for the owner to register + ALIGN before
> any fix. Logged in
> [../../07_business_logic/LOGIC_INDEX.md Decision Log (2026-06-16)](../../07_business_logic/LOGIC_INDEX.md#decision-log)
> and cross-linked from [staff_pos_be.md Flags](staff_pos_be.md#flags).
>
> Source files: `fe/src/app/(dashboard)/pos/page.tsx` · `be/internal/handler/order_handler.go` ·
> `fe/src/types/order.ts`.

---

## Severity at a glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | POS waiting card + success toast show **"Đơn #undefined"** — `POST /orders` returns only `{id, table_busy}`, POS reads `.order_number` with no follow-up GET | 🟠 Medium — visible on **every** POS order; redirect still works | `/pos` waiting screen + toast | FE (or BE) |
| 2 | **"Tạo đơn mới"** clears the active order locally with **no cancel** — a mistaken POS order is orphaned (still live on BE, no POS path to remove it) | 🟡 Low — design gap, order stays valid | `/pos` waiting screen | FE (+ product decision) |

---

## Bug 1 — 🟠 "Đơn #undefined" on the POS waiting screen

**Symptom.** After the cashier taps **Tạo Đơn →**, the success toast reads `Đã tạo đơn #undefined`
and the waiting card header reads `Đơn #undefined` — the order number is never shown. The order is
created correctly and the auto-redirect to `/cashier/payment/:id` still works (it uses the id, not
the number).

**Root cause — thin POST response consumed as a full `Order`.**
- `POST /orders` returns **only** `{data:{id, table_busy}}` —
  [`order_handler.go:121`](../../../../../be/internal/handler/order_handler.go#L121). It does **not**
  use the `orderJSON` serializer and carries no `order_number`, `status`, or items.
- POS treats that thin object as a full `Order`: `onSuccess: (order: Order) => { setActiveOrder(order)
  ... }` ([`pos/page.tsx:97-99`](../../../../../fe/src/app/(dashboard)/pos/page.tsx#L97)), then reads
  `order.order_number` in the toast ([`:101`](../../../../../fe/src/app/(dashboard)/pos/page.tsx#L101))
  and `activeOrder.order_number` in the card ([`:111`](../../../../../fe/src/app/(dashboard)/pos/page.tsx#L111)).
- `Order.order_number` is typed `string` ([`types/order.ts:40`](../../../../../fe/src/types/order.ts#L40)),
  but the runtime value is `undefined` → template literal renders the literal text `undefined`.
- **POS-specific:** the customer menu/checkout paths avoid this by issuing a follow-up
  `GET /orders/:id` after create and caching the full order (see
  [customer_menu_be.md §6](../../customer/customer_menu/customer_menu_be.md)); POS skips that step.

**Suggested fix (smallest safe change, FE).** In `createOrder.onSuccess`, follow the create with a
`GET /orders/:id` (using the returned `id`) and `setActiveOrder` to the full order — mirroring the
established menu/checkout pattern. Alternative (BE): widen the `POST /orders` response to include
`order_number`. The FE follow-up is the lower-risk change and reuses an existing pattern.

---

## Bug 2 — 🟡 "Tạo đơn mới" orphans the active order

**Symptom.** On the waiting screen, **Tạo đơn mới** returns the cashier to the build view, but the
order they just created is silently dropped from the POS UI. If the order was a mistake, there is no
way to cancel it **from POS** — it stays `pending` on the BE, continues to the kitchen, and appears
on `/admin/overview` and `/kds` until someone cancels it there.

**Root cause.** The button only clears local state:
`onClick={() => setActiveOrder(null)}` ([`pos/page.tsx:124`](../../../../../fe/src/app/(dashboard)/pos/page.tsx#L124)).
There is no `DELETE /orders/:id` call. The active order lives only in `useState` (not persisted), so
once cleared the POS forgets the id entirely.

**Note — may be intended.** For a busy stall this is reasonable: the first order keeps cooking while
the cashier starts the next. The gap is only the *mistaken-order* case. So this is a **product
decision**, not an obvious defect.

**Suggested fix (product decision first).** Either (a) leave as-is and document that mistaken POS
orders are cancelled from `/admin/overview`; or (b) add a confirm + optional `DELETE /orders/:id`
when the order is still `pending`. Register + ALIGN before coding.

---

## Next step

Neither bug is on [`docs/tasks/MASTER_TASK.md`](../../../../tasks/MASTER_TASK.md) yet. Per CLAUDE.md a
fix must be registered + ALIGNed before any code change. **Highest impact = Bug 1** (visible on every
POS order, one-line FE fix). Recommend registering Bug 1 first.
