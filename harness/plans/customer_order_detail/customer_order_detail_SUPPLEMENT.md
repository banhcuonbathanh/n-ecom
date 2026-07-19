# Customer Order Detail — Supplement to the `/orders` plan (F-19)

> **TL;DR:** The customer order-detail view has **no page-plan set of its own, by
> decision.** Owner ruling 2026-07-19: the reference's standalone `/order/:id` route is
> **merged away** — detail is a *view inside* the merged `/orders` screen, whose home is
> [`../customer_orders_tracking/customer_orders_tracking_PLAN.md`](../customer_orders_tracking/customer_orders_tracking_PLAN.md).
> That plan already specifies the detail view completely (dish rows, combo grouping,
> rollup table, money card, progress, cancel scopes, status modal, the exhaustive SSE
> switch) and already designs out every defect the order-detail reference corpus
> reported. **This file exists only to own the three things the merge left unhomed** —
> it is a supplement, not a plan. Source: `reference/…/customer/customer_order_detail/`
> (8 docs, digested 2026-07-19). **One fact one home:** the detail view's contract lives
> in the `/orders` plan; this file owns only §1–§3 below.

---

## Why there is no 4-doc set here

`PAGE_PLAN_GUIDE.md §10`: *"When a page is already partly scoped inside another plan,
cross-link, don't re-derive."* A full set was drafted and **deliberately discarded** —
comparing it against the `/orders` plan showed ~90 % overlap:

| The order-detail reference's findings | Already homed in the `/orders` plan |
|---|---|
| `item_updated` / `item_cancelled` / `items_added` published but unconsumed | §4.4-1 one stream, **exhaustive switch** + §6 rows |
| `item_progress` no consumer case | §6 row |
| SSE handler does no ownership check | §6 row — own-order/table gate |
| No status replay on (re)connect | §6 row — snapshot-on-connect |
| 404 / foreign order wedges the view in a spinner | §6 row — named branch |
| Two implementations of one detail view drift apart | §6 row — one component, both callers |
| `{"data":…}` wrapper on GET only | §6 row — never wrap success |
| DishRow hides nhân + ghi chú | §6 row — rendered as caption |
| Money / rollup / progress / cancel / status-modal behavior | §4.4-2…-13 |

Re-stating any of it here would create a second home and guarantee future drift.

---

## 1. 🚨 RISK — the merge removes the only URL-addressable path to an order

**Unresolved. Needs a ruling before the O/R phases build `/orders`.**

The standalone `/order/:id` route was deep-linkable. The merged `/orders` screen selects
its order from **`activeOrderId`, which lives in the persisted client cart store**
(`/orders` plan §4.2). Those are not equivalent, and the gap is user-visible:

| Scenario | `/order/:id` (reference) | `/orders` + `activeOrderId` (merged) |
|---|---|---|
| Guest reloads their own phone | ✅ | ✅ (store is persisted) |
| Guest **shares the order link** with a table-mate | ✅ | ❌ no `activeOrderId` on that device |
| Guest **re-scans the QR on a second phone** | ✅ | ❌ |
| Staff opens a guest's order from a link | ✅ | ❌ |
| Store cleared / private tab / new browser | ✅ | ❌ **order unreachable** |

The last row is the sharp one: the order still exists and is still being cooked, but the
guest has no way back to it. Note the `/orders` plan's own §6 already flags a related
symptom — *"Xoá lịch sử leaves `activeOrderId` → orphaned pointer"* — which is the same
root cause: **client state is the only pointer to a server resource.**

**💡 Recommendation — one URL param, no new route:** `/orders?id=<uuid>`.
- Present → that order is selected (URL wins over `activeOrderId`; `FE_STATE.md` rule 2 —
  state that must survive reload/share belongs in the URL).
- Absent → today's behavior, `activeOrderId` from the store.
- Ownership is already enforced server-side by `table_id` on `GET /orders/:id`, so a
  guessed id leaks nothing — the existing 403 covers it.

This costs one search-param read and preserves every merge benefit (one screen, one
stream, one detail component). **Decide before the `/orders` FE row opens.**

## 2. ⚠️ FLAG — the quantity stepper is dropped by omission, not by ruling

The reference shipped a per-dish `QuantityStepper` on the standalone page, backed by
`PATCH /orders/items/:id/quantity` (guest-auth, rejects once `qty_served > 0`, recalcs
`total_amount` in-tx, publishes `item_updated`). It was that page's **only** endpoint the
list overlay never called.

The merged plan drops both — §4.4-4 *"Read-only placed order… no steppers"*, and the
endpoint sits in its "Not built" list. **No decision record says why.**

This may well be correct: a placed order that the kitchen has queued arguably *should* be
read-only, and "cancel the item, re-add it" already covers the intent with fewer edge
cases. But it removes a real capability, so it should be recorded as a choice:

- **Plan default (inherited): dropped.** Guests change quantity by cancelling the item
  and re-adding via "Thêm món".
- If it returns, it returns as a **view-level** affordance inside the merged detail —
  the endpoint contract above is already traced and needs no re-derivation.

⚠️ Worth noting *why* the reference's stepper was its worst bug: the write published
`item_updated`, the FE never listened, and its `invalidateQueries(['order', id])` targeted
a query that did not exist — so quantity edits silently did nothing until a reload. The
`/orders` plan's exhaustive-switch rule already makes that class of bug unrepresentable,
so **if** the stepper is reinstated, it inherits the fix for free.

## 3. ⚠️ Drift fixed — the menu plan's post-order redirect

`customer_menu_PLAN.md` routed the `POST /orders` 201 handoff to the now-deleted route
(§1 out-links and §4.2: `router.replace('/order/<id>')`). Per Hard Rule 5 (docs drift =
a bug, fixed in the same task) both spots carry a dated supersession note pointing at
`/orders`. The authoritative handoff is the `/orders` plan §1 ("After ordering — `POST
/orders` 201 sets `activeOrderId` → redirect here").

⚠️ If §1's `?id=` recommendation is adopted, that redirect becomes
`router.replace('/orders?id=<id>')` — which also makes the handoff robust without relying
on the store write having landed first.

---

## Where the rest lives

| You want | Read |
|---|---|
| The detail view's contract, behaviors, components, SSE switch | [`../customer_orders_tracking/customer_orders_tracking_PLAN.md`](../customer_orders_tracking/customer_orders_tracking_PLAN.md) |
| The order object + `POST /orders` handoff | [`../customer_menu/customer_menu_PLAN.md`](../customer_menu/customer_menu_PLAN.md) §3.5, §4.2 |
| `orders` / `order_items` columns, derived item state | `harness/DB_SCHEMA.md §4.3` |
| Realtime backbone, event contract, snapshot-on-connect | `harness/OVERALL_PLAN.md §3.5` |
| Order lifecycle + the open cancel-rule question | `harness/OVERALL_PLAN.md §3.7` |
| The raw reference corpus (code-traced) | `reference/docs/system/08_pages/customer/customer_order_detail/` |

---

*Written by F-19 (2026-07-19) from a 1-agent digest of the 8-doc reference
customer_order_detail corpus (code-traced, branch `experience_claude.md_system_1`).
The 4-doc page-plan set was drafted and discarded as duplication — see the table above.
This file owns only the deep-link gap (§1), the stepper ruling (§2), and the redirect
drift (§3); everything else lives in the docs listed under "Where the rest lives".*
