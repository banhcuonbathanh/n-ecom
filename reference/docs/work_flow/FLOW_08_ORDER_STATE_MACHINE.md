# FLOW 08 — Order State Machine

> Authoritative transitions for order status. Source: `docs/core/MASTER_v1.2.md §4.1`

---

## State Diagram

```
                    ┌─────────┐
                    │ pending │  ← order created (QR or POS)
                    └────┬────┘
                         │  PATCH /orders/:id/status { status: "confirmed" }
                         │  Actor: manager/staff via overview popup
                         ▼
                   ┌───────────┐
                   │ confirmed │  ← visible on KDS
                   └─────┬─────┘
                         │  PATCH /orders/:id/status { status: "preparing" }
                         │  Actor: chef via KDS
                         ▼
                   ┌───────────┐
                   │ preparing │
                   └─────┬─────┘
                         │  PATCH /orders/:id/status { status: "ready" }
                         │  Actor: chef (manual) OR server auto (all items done)
                         ▼
                    ┌───────┐
                    │ ready │  ← triggers /cashier/payment/:id redirect
                    └───┬───┘
                        │  POST /payments → payment completed
                        ▼
                  ┌───────────┐
                  │ delivered │
                  └───────────┘

    ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

    From pending, confirmed, preparing (if < 30% served):
                        │
                        ▼  DELETE /orders/:id
                  ┌───────────┐
                  │ cancelled │
                  └───────────┘
```

---

## Transition Table

| From | To | Actor | Endpoint |
|---|---|---|---|
| pending | confirmed | Manager/Staff | `PATCH /orders/:id/status` |
| pending | cancelled | Any (< 30%) | `DELETE /orders/:id` |
| confirmed | preparing | Chef | `PATCH /orders/:id/status` |
| confirmed | cancelled | Cashier+ (< 30%) | `DELETE /orders/:id` |
| preparing | ready | Chef (manual or auto) | `PATCH /orders/:id/status` |
| preparing | cancelled | Cashier+ (< 30%) | `DELETE /orders/:id` |
| ready | delivered | System (after payment) | via `POST /payments` |

---

## Item-Level Status

```
Item qty_served starts at 0

Chef clicks item → PATCH /orders/:id/items/:itemId/status
                → server increments qty_served by 1

qty_served = quantity → item is "done"
All items "done" → order auto-transitions to "ready"
```

---

## Rules

- `ready` and `delivered` cannot be cancelled
- Payment is only allowed when order is `ready` or `delivered`
- Cancel requires `< 30%` of total items served across the entire order
- KDS allowed transitions: `confirmed → preparing → ready`
- Server enforces all transitions — invalid transitions return 422

---

## Related Flows

- [FLOW_03_STAFF_KDS.md](FLOW_03_STAFF_KDS.md) — chef transitions (confirmed → preparing → ready)
- [FLOW_05_ADMIN_OVERVIEW.md](FLOW_05_ADMIN_OVERVIEW.md) — manager transitions (pending → confirmed)
- [FLOW_06_PAYMENT.md](FLOW_06_PAYMENT.md) — payment only on ready/delivered
- [FLOW_07_CANCEL.md](FLOW_07_CANCEL.md) — cancel from pending/confirmed/preparing
