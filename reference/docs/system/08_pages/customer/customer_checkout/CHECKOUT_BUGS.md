# Checkout — Known Code Bugs (found during `/page-doc-set customer_checkout`)

> **TL;DR:** 3 code-level mismatches surfaced while tracing `/checkout` against source on branch
> `experience_claude.md_system_1`. These are **code** problems (FE collects/expects things the BE
> never receives or returns), **not** stale docs — the handbook (`API_SPEC.md` / `DB_SCHEMA.md`)
> already documents the correct contract (`source`, NOT `payment_method`). None are fixed yet; the
> doc skill does not touch app code. Logged in
> [../../07_business_logic/LOGIC_INDEX.md Decision Log (2026-06-15)](../../07_business_logic/LOGIC_INDEX.md#decision-log)
> and flagged in [customer_checkout_be.md Flags 1–3](customer_checkout_be.md#flags).
>
> Source files: `fe/src/app/(shop)/checkout/page.tsx` · `fe/src/store/cart.ts` ·
> `be/internal/handler/order_handler.go` · `be/internal/service/order_service.go` ·
> `be/internal/service/errors.go`.

---

## Severity at a glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | Payment-method radio is dead — collected, then wiped, never sent | 🟠 Medium — misleading core control | `/checkout` (online-payment 🔮 PLANNED) | FE (+ BE/DB if online payment is built) |
| 2 | `TABLE_HAS_ACTIVE_ORDER` error branch never fires — duplicate order created silently | 🟠 Medium — wrong assumption, no user notice | `/checkout` (cross-cuts the order-create contract) | FE |
| 3 | `source:'online'` (table-null) order is unreadable by a guest token (403) | 🟡 Low — latent, no wired online entry | `/checkout` → `/order/:id` (same `GetOrder` guard) | BE (or accept-as-is until online ordering ships) |

---

## Bug 1 — 🟠 The payment-method radio does nothing

**Symptom.** A customer picks **💳 VNPay / 📱 MoMo / 🏦 ZaloPay** instead of 💵 Cash, taps
**Đặt hàng**, and the order is created identically to a cash order — no payment redirect, no payment
method recorded. The choice has zero effect.

**Root cause — the value is collected, written to the cart store, then immediately discarded; it is
never sent to the BE, and there is no column for it.**
- The radio is a real RHF field ([`checkout/page.tsx:24-29`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L24), `184-194`)
  and on submit it is written to the cart store via
  [`cart.setPaymentMethod(form.payment_method)`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L47).
- But the `POST /orders` body ([`page.tsx:49-56`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L49))
  contains only `customer_name`, `customer_phone`, `note`, `table_id`, `source`, `items` —
  **no `payment_method`**.
- `onSuccess` then calls [`cart.clearCart()`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L73),
  which resets `paymentMethod: null` ([`cart.ts:89`](../../../../../fe/src/store/cart.ts#L89)) — so
  the stored choice is wiped a moment after it is set.
- There is **nowhere for it to go** anyway: the `createOrderReq` DTO has no payment field
  ([`order_handler.go:59-66`](../../../../../be/internal/handler/order_handler.go#L59)) and the
  `orders` table has **no `payment_method` column** —
  [DB_SCHEMA.md:138](../../02_spec/DB_SCHEMA.md) explicitly notes "`source` … ⚠️ NOT
  `payment_method`". Payment method is recorded later as a `payments` row at the cashier screen (S5).

**Suggested fix (FE-only, smallest).** Until online payment exists, drop the non-cash options (or
mark them "sắp có"/disabled) so the control doesn't promise a flow that isn't wired. If online
payment is genuinely intended here, that is a larger BE+DB+gateway task (🔮 PLANNED) — register it
separately, don't bolt it onto a doc pass.

---

## Bug 2 — 🟠 `TABLE_HAS_ACTIVE_ORDER` branch is dead; a duplicate order is created with no notice

**Symptom.** If the table already has an open order, submitting on `/checkout` does **not** redirect
the customer to the existing order and shows **no warning** — a second, parallel order is created
silently.

**Root cause — the FE waits for an error the BE never sends.**
- FE `onError` checks `resp?.data?.error === 'TABLE_HAS_ACTIVE_ORDER'` and would
  `router.replace('/order/:active_order_id')`
  ([`page.tsx:79-85`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L79)).
- But `CreateOrder` **never returns that error.** The busy-table case is *informational*: it sets
  `tableBusy = true` ([`order_service.go:270-275`](../../../../../be/internal/service/order_service.go#L270))
  and proceeds to create the order, returning **`201`** with `data.table_busy:true`
  ([`order_handler.go:121`](../../../../../be/internal/handler/order_handler.go#L121)).
- The `ErrTableHasActiveOrder` constant exists
  ([`errors.go:30`](../../../../../be/internal/service/errors.go#L30)) but is **referenced nowhere**
  in the codebase.
- Checkout also never reads `table_busy` from the **success** body — so unlike the menu
  `TableConfirmModal` (which toasts "served after current order" on `table_busy`), checkout gives the
  customer no signal at all.

> Multiple concurrent orders per table is a **deliberate** product rule
> ([BUSINESS_RULES.md §2.3](../../02_spec/BUSINESS_RULES.md)) — so the BE behaviour is correct and
> the FE's "redirect on conflict" assumption is the wrong one. The fix is FE-side.

**Suggested fix (FE).** Delete the dead `TABLE_HAS_ACTIVE_ORDER` branch and, if a notice is wanted,
read `data.table_busy` from the `201` response (mirror `TableConfirmModal.tsx`) to toast
"phục vụ sau đơn hiện tại".

---

## Bug 3 — 🟡 An `online` (table-null) order can't be read back by a guest token

**Symptom (latent).** If a guest token (minted for a table) ends up submitting with
`source:'online'` (cart `tableId` null), the order is created but the immediate
`GET /orders/:id` re-fetch — and the subsequent `/order/:id` page — return **403** and the customer
sees an empty/forbidden order.

**Root cause — ownership is enforced by table match, and an online order has no table.**
- `GetOrder` forbids a customer-role caller unless the order's `table_id` equals the caller's
  `claims.TableID` ([`order_service.go:116-120`](../../../../../be/internal/service/order_service.go#L116);
  the customer `callerID` is set to `claims.TableID` in
  [`order_handler.go:126-130`](../../../../../be/internal/handler/order_handler.go#L126)).
- A `source:'online'` order stores `table_id = NULL`
  ([`order_service.go:301-304`](../../../../../be/internal/service/order_service.go#L301)), so
  `!o.TableID.Valid` is true → `ErrForbidden`.
- The re-fetch failure is swallowed (`onSuccess` falls back to caching the minimal body,
  [`page.tsx:69-71`](../../../../../fe/src/app/(shop)/checkout/page.tsx#L69)), but the `/order/:id`
  page's own fetch then 403s with no fallback.

**Why latent today.** There is no wired customer-login / online entry — the only customer tokens are
guest JWTs from a table scan, which would carry `source:'qr'`. The `online` branch is reachable only
in an odd intermediate state. A **staff** JWT is unaffected (`callerRole != "customer"` skips the
guard). This is the `/checkout` = 🔮 PLANNED online-ordering home; the gap must be closed when that
flow ships.

**Suggested fix (BE, when online ordering is built).** Give table-less orders a different ownership
basis (e.g. owner = `created_by` / a customer account id) so the guest/customer who placed the order
can read it. No action needed until online ordering is wired.

---

## Next step

These bugs are **not** yet on [`docs/tasks/MASTER_TASK.md`](../../../../tasks/MASTER_TASK.md). Per
CLAUDE.md a fix must be registered + ALIGNed before any code change. **Highest impact: Bug 2** (a
silent duplicate order is a live data-integrity issue on the dine-in path that reaches `/checkout`),
closely followed by **Bug 1** (a visibly misleading control). Bug 3 can wait for the online-ordering
epic. Recommend registering Bug 2 first.
