# Cashier Payment — Code Bugs

> **TL;DR:** 3 code bugs found tracing `/cashier/payment/:id` on branch
> `experience_claude.md_system_1`. **These are *code* bugs, not stale docs — the `/page-doc-set`
> skill does not touch app code.** Together they mean **payment cannot be completed from this screen
> for any method**: cash 400s, and gateway payments leave the screen blank (no QR, no WS, no
> auto-print). Links: [staff_cashier_payment_be.md](staff_cashier_payment_be.md) (BE anchor) ·
> LOGIC Decision Log entry 2026-06-17.

---

## Severity at a Glance

| # | Bug | Severity | Surface affected | Fix side |
|---|-----|----------|------------------|----------|
| 1 | Cash button sends `method:'cod'`; BE binding requires `cash` → 400 | 🔴 High | Cash payment (the default + most-used method) | FE |
| 2 | `POST /payments` response omits `status`/`amount`/`method` → QR block + WS listener never activate | 🔴 High | All gateway payments (VNPay/MoMo/ZaloPay) + cash success branch | BE (or FE) |
| 3 | `PATCH /payments/:id/proof` route does not exist → 404 | 🟠 Med | Proof-of-payment upload (also unreachable today via Bug 2) | BE (build) or FE (remove) |

---

## Bug 1 — Cash button sends `cod`, backend only accepts `cash`

**Symptom.** Cashier picks "Tiền mặt" (the default method) and taps **Xác nhận COD** → toast
"Không thể tạo thanh toán". Cash payment never succeeds.

**Root cause.** FE `PaymentMethod = 'vnpay' | 'momo' | 'zalopay' | 'cod'` with default `'cod'`
([page.tsx:14,52](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L14)); the
mutation posts `{ order_id, method: 'cod' }`
([page.tsx:111-113](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L111)).
The BE binding is `Method string binding:"required,oneof=vnpay momo zalopay cash"`
([payment_handler.go:25](../../../../../be/internal/handler/payment_handler.go#L25)) — `cod` is not
in the set, so `ShouldBindJSON` fails → `400 INVALID_INPUT`
([payment_handler.go:31-34](../../../../../be/internal/handler/payment_handler.go#L31)). The DB enum
is also `cash` (`PaymentsMethodCash = "cash"`,
[models.go:111](../../../../../be/internal/db/models.go#L111)).

**Suggested fix (smallest, FE).** Use `'cash'` instead of `'cod'` in the FE `PaymentMethod` type,
default, and `METHOD_LABELS` key (keep the "Tiền mặt" label). One-line type/string change; no BE
change needed.

---

## Bug 2 — Create-payment response omits `status`/`amount`/`method`; screen goes blank

**Symptom.** After creating a gateway payment (VNPay/MoMo/ZaloPay) the controls disappear and
**nothing replaces them** — no QR image, no "Đang chờ thanh toán…", and the cashier is never
auto-redirected/printed when the webhook confirms. (Cash's instant-success toast/print also never
fires.)

**Root cause.** `POST /payments` returns only `{data:{id, pay_url, qr_code_url}}`
([payment_handler.go:44-48](../../../../../be/internal/handler/payment_handler.go#L44)), but the FE
`Payment` interface expects `status`, `amount`, and `method`
([page.tsx:16-23](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L16)) and
`setPayment(data)` stores the thin object as if it were complete
([page.tsx:114-115](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L114)). With
`payment.status === undefined`:
- the cash instant-complete branch `data.status === 'completed'` is never true
  ([page.tsx:116](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L116));
- the WS effect returns early at `payment.status !== 'pending'`
  ([page.tsx:64](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L64)) → the
  socket **never opens** → the `payment_success` event published by
  [payment_service.go:270-271](../../../../../be/internal/service/payment_service.go#L270) is never
  received;
- the QR-pending render branch `payment.status === 'pending' && payment.qr_code_url` is false
  ([page.tsx:249](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L249)) → no QR;
- the success toast would show `formatVND(undefined)`
  ([page.tsx:66,89](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L66)) and the
  receipt shows `METHOD_LABELS[undefined]`
  ([page.tsx:208](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L208)).

**Suggested fix.** BE side (preferred): have `Create` return the full payment object —
`status`, `amount`, `method`, `qr_code_url`, `pay_url` — so the FE branches work as written. The
`db.Payment` row already carries all of these (`GetPayment` serves it,
[payment_handler.go:52-59](../../../../../be/internal/handler/payment_handler.go#L52)). FE
alternative: after `POST /payments`, `GET /payments/:id`
([main.go:257](../../../../../be/cmd/server/main.go#L257)) and use that as the `Payment`. Either
unblocks the QR + WS + cash-success paths in one change.

---

## Bug 3 — `PATCH /payments/:id/proof` route does not exist

**Symptom.** Uploading a payment-proof screenshot always fails ("Upload thất bại").

**Root cause.** `uploadProof` PATCHes multipart `image` to `/payments/:id/proof`
([page.tsx:125-135](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L125)), but
the payments group exposes only `POST ""`, `GET "/:id"`, and the three public webhooks
([main.go:254-262](../../../../../be/cmd/server/main.go#L254)). There is no `proof` handler,
service, query, or `payments.proof*` column anywhere in `be/` (grep `proof` → 0 non-test hits) →
Gin returns its default `404` (plain text, not the JSON error contract). The upload UI is also
**currently unreachable** because it lives inside the QR-pending block that never renders (Bug 2).

**Suggested fix.** Decide intent: either build `PATCH /payments/:id/proof` (route + handler +
service + a `payments.proof_image_path` column via a migration + sqlc), or remove the proof-upload
UI from the page until the feature is scheduled. Lower priority — gated behind Bug 2 anyway.

---

## Next Step

These bugs are **not yet on** [`docs/tasks/MASTER_TASK.md`](../../../../../docs/tasks/MASTER_TASK.md).
Per CLAUDE.md a fix must be registered + ALIGNed before any code change. **Recommended first:
Bug 2** (BE response widening) — it unblocks gateway QR, the WS auto-complete, *and* the cash
success branch in a single change; pair it with **Bug 1** (one-line FE `cod`→`cash`) so cash works
end-to-end. Bug 3 last (or remove the UI).
