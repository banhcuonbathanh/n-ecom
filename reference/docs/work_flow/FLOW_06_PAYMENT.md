# FLOW 06 — Payment Flow

> Cashier+ role. Shared by both POS walk-in orders and QR customer orders.
> Payment only allowed when order.status = "ready" or "delivered".

---

## Diagram

```
/cashier/payment/:id
    │
Display: order number, table, items, subtotal, total
    │
Select payment method:
    │
    ├─ COD (tiền mặt)
    │       POST /payments { order_id, method: "cod" }
    │       server responds immediately → status: "completed"
    │       toast.success → window.print() → redirect /pos
    │
    └─ QR method (VNPay | MoMo | ZaloPay)
            POST /payments { order_id, method: "vnpay"|"momo"|"zalopay" }
            server returns { qr_code_url, status: "pending" }
            FE shows QR code to customer
                │
            WS listens for payment_success { order_id }
                │
                match → toast.success → window.print() → redirect /pos
                │
            Optional: staff uploads proof screenshot
            PATCH /payments/:paymentId/proof  (multipart/form-data, image field)
```

---

## Rules

- Requires `cashier` role or higher
- Page must only be reachable when `order.status = "ready"` or `"delivered"`
  - Do not navigate here for non-ready orders unless manager overrides
  - Server also enforces this — non-ready orders → 422 reject
- Displays full order receipt: order number, table, items, total

## COD (Cash) Rules

- `POST /api/v1/payments { order_id, method: "cod" }`
- Server responds with `status: "completed"` immediately — no async wait
- After response: `toast.success` → `window.print()` (browser print dialog) → redirect `/pos`
- No WS wait needed

## QR Payment Rules (VNPay / MoMo / ZaloPay)

- `POST /api/v1/payments { order_id, method: "vnpay"|"momo"|"zalopay" }`
- Server creates pending payment record, returns `qr_code_url`
- FE renders QR code image for customer to scan
- WS (`/ws/orders-live?token=`) listens for `payment_success` event where `order_id` matches
- On WS event: `toast.success` → `window.print()` → redirect `/pos`

## Proof Upload (optional)

- Used when staff manually verifies a customer screenshot of payment
- `PATCH /api/v1/payments/:paymentId/proof` with `multipart/form-data` (field: `image`)
- Marks payment as verified

---

## Backend Endpoints

| Action | Method | Endpoint | Auth |
|---|---|---|---|
| Create payment | POST | `/api/v1/payments` | Cashier+ |
| Upload proof | PATCH | `/api/v1/payments/:id/proof` | Cashier+ |
| Live orders WS (for payment_success) | WS | `/ws/orders-live?token=` | Cashier+ |

---

## Key Files

| File | Role |
|---|---|
| `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx` | Payment page |
| `fe/src/context/OrdersWSContext.tsx` | Shared WS for payment_success event |

---

## Related Flows

- [FLOW_04_STAFF_POS.md](FLOW_04_STAFF_POS.md) — POS creates the order that routes here
- [FLOW_08_ORDER_STATE_MACHINE.md](FLOW_08_ORDER_STATE_MACHINE.md) — order must be "ready" before payment
- [FLOW_09_AUTH_TOKENS.md](FLOW_09_AUTH_TOKENS.md) — WS uses ?token= not header
