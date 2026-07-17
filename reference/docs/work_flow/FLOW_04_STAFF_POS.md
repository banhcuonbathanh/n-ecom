# FLOW 04 — Staff POS Flow (Point of Sale)

> Cashier+ role only. Creates walk-in orders, waits for kitchen, routes to payment.

---

## Diagram

```
/pos
    │
Browse products by category (GET /products — same API as customer menu)
Add to cart → component local state only (NOT Zustand, NOT localStorage)
    │
Submit →
POST /orders {
    customer_name: "Khách tại quán",
    customer_phone: "0000000000",
    source: "pos",
    items: [{ product_id, quantity }]
}
    │
activeOrder set → cart cleared → screen shows "waiting for kitchen"
    │
WS: /ws/orders-live?token= watches for order_status_changed { status: "ready" }
    │
    ├─ "ready" WS event → auto-redirect /cashier/payment/:id
    │
    └─ staff clicks "Đến thanh toán" manually → /cashier/payment/:id
```

---

## Rules

- Requires `cashier` role or higher (AuthGuard + RoleGuard)
- Products loaded via `GET /api/v1/products` — same endpoint as customer menu
- Cart lives in **component local state only** (`useState`) — not Zustand, not localStorage
  - It dies when the component unmounts — intentional, single-session only
- Order source must be `"pos"` (not `"qr"`)
- `customer_name` is always `"Khách tại quán"`, `customer_phone` is always `"0000000000"`
- After submit: `activeOrder` is set in component state, cart is cleared
- WS listens for `order_status_changed` where `status = "ready"` for this specific order
- Auto-redirect to `/cashier/payment/:id` when ready
- Staff can manually click "Đến thanh toán" before the WS event (early)

---

## Backend Endpoints

| Action | Method | Endpoint | Auth |
|---|---|---|---|
| Load products | GET | `/api/v1/products` | Cashier+ |
| Create order | POST | `/api/v1/orders` | Cashier+ |
| Live orders WS | WS | `/ws/orders-live?token=` | Cashier+ |

---

## Key Files

| File | Role |
|---|---|
| `fe/src/app/(dashboard)/pos/page.tsx` | POS page — cart + order submit |
| `fe/src/context/OrdersWSContext.tsx` | Shared WS connection |
| `fe/src/components/guards/AuthGuard.tsx` | Redirect unauthenticated to /login |
| `fe/src/components/guards/RoleGuard.tsx` | Block insufficient role |

---

## Related Flows

- [FLOW_01_ENTRY_POINTS.md](FLOW_01_ENTRY_POINTS.md) — cashier login and redirect
- [FLOW_06_PAYMENT.md](FLOW_06_PAYMENT.md) — what happens at /cashier/payment/:id
- [FLOW_08_ORDER_STATE_MACHINE.md](FLOW_08_ORDER_STATE_MACHINE.md) — order must reach "ready" before payment
- [FLOW_09_AUTH_TOKENS.md](FLOW_09_AUTH_TOKENS.md) — WS uses ?token= not header
