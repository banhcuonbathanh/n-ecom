# FLOW 07 — Cancel Flow

> Shared between customer (client) and staff. Server enforces all rules.
> Source of truth for cancel rule: `docs/core/MASTER_v1.2.md §4.2`

---

## Cancel Rule

```
cancel_allowed = SUM(qty_served) / SUM(quantity) < 0.30

< 30% served  → cancel allowed
>= 30% served → server rejects with 409 CANCEL_NOT_ALLOWED
```

---

## Who Can Cancel What

| Actor | Can cancel item | Can cancel order | Condition |
|---|---|---|---|
| Customer (guest) | Own order items only | Own order only | < 30% served |
| Chef | Via KDS status update only | No direct cancel | — |
| Cashier | Any order | Any order | < 30% served |
| Staff | Any order | Any order | < 30% served |
| Manager | Any order | Any order | < 30% served |

---

## Cancel Single Item

```
DELETE /api/v1/orders/items/:itemId
    │
    ├─ OK → item removed from order
    │
    └─ 409 CANCEL_NOT_ALLOWED → show specific error, not generic
```

- UI: per-item cancel button in `/order/:id`
- Available to both customer and staff

## Cancel Remaining Combo Items

```
"huỷ các món còn lại" button
    │
Multiple DELETE /api/v1/orders/items/:itemId calls in parallel
    │
All removed → order updated
```

## Cancel Entire Order

```
DELETE /api/v1/orders/:orderId
    │
Allowed from status: pending, confirmed, preparing
    (ready and delivered cannot be cancelled)
    │
< 30% rule must also pass
    │
    ├─ OK (client path) → redirect /menu
    │
    ├─ OK (staff path) → remove from board / show success toast
    │
    └─ payment already made → server triggers refund flow
```

---

## Error Handling

- Server returns `409 CANCEL_NOT_ALLOWED` when >= 30% served
- FE must show the specific `CANCEL_NOT_ALLOWED` error message
- Never show a generic error for this case
- Source: `docs/contract/ERROR_CONTRACT_v1.1.md`

---

## Backend Endpoints

| Action | Method | Endpoint | Auth |
|---|---|---|---|
| Cancel single item | DELETE | `/api/v1/orders/items/:itemId` | Owner or Cashier+ |
| Cancel entire order | DELETE | `/api/v1/orders/:id` | Owner or Cashier+ |

---

## Key Files

| File | Role |
|---|---|
| `fe/src/app/(shop)/order/[id]/page.tsx` | Cancel UI for customer (shared with staff view) |
| `docs/core/MASTER_v1.2.md §4.2` | Cancel rule formula — authoritative |
| `docs/contract/ERROR_CONTRACT_v1.1.md` | CANCEL_NOT_ALLOWED error code |

---

## Related Flows

- [FLOW_02_CLIENT_QR.md](FLOW_02_CLIENT_QR.md) — customer cancel from order detail
- [FLOW_03_STAFF_KDS.md](FLOW_03_STAFF_KDS.md) — chef has no direct cancel
- [FLOW_05_ADMIN_OVERVIEW.md](FLOW_05_ADMIN_OVERVIEW.md) — manager force-cancel from overview
- [FLOW_08_ORDER_STATE_MACHINE.md](FLOW_08_ORDER_STATE_MACHINE.md) — which statuses allow cancel
