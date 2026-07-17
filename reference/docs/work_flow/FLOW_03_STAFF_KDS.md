# FLOW 03 — Staff KDS Flow (Kitchen Display System)

> Chef+ role only. Receives orders via WebSocket, marks items done, transitions order status.

---

## Diagram

```
/kds
    │
WS: /ws/kds?token=<access_token>   ← query param, NOT Authorization header
    │
    ├─ EVENT: new_order
    │       fetch full order → prepend to board + play beep
    │
    ├─ EVENT: item_progress
    │       update qty_served inline (no refetch)
    │
    ├─ EVENT: order_cancelled / order_status_changed (non-active status)
    │       remove order from board
    │
    └─ Staff action: click item →
            PATCH /orders/:id/items/:itemId/status
                server increments qty_served by 1
                qty_served = quantity → item "done"
                all items done → order becomes "ready" (server auto)
                │
                Manual status bump:
                PATCH /orders/:id/status
                confirmed → preparing → ready
                order removed from board on ready
```

---

## Rules

- Requires `chef` role or higher (AuthGuard + RoleGuard)
- WS connection: `GET /ws/kds?token=<access_token>` — query param only, never Authorization header
- On `new_order` WS event: fetch full order, prepend to board, play audio beep
- On `item_progress` WS event: update `qty_served` inline — no full refetch
- On `order_cancelled` or `order_status_changed` (non-active status): remove from board

## Item Done Action

```
Staff clicks item
    ↓
PATCH /api/v1/orders/:orderId/items/:itemId/status
    ↓
Server increments qty_served by 1
    ↓
qty_served = quantity → item is "done"
    ↓
All items done → order.status = "ready" (server-side auto)
```

## Manual Status Transitions (from KDS)

```
confirmed → preparing → ready
```

- `PATCH /api/v1/orders/:orderId/status { status: "<new>" }`
- Order removed from KDS board when it reaches `ready`

---

## Backend Endpoints

| Action | Method | Endpoint | Auth |
|---|---|---|---|
| Order list (initial load) | GET | `/api/v1/orders` | Chef+ |
| WS connection | WS | `/ws/kds?token=` | Chef+ |
| Mark item done | PATCH | `/api/v1/orders/:id/items/:itemId/status` | Chef+ |
| Change order status | PATCH | `/api/v1/orders/:id/status` | Chef+ |

---

## Key Files

| File | Role |
|---|---|
| `fe/src/app/(dashboard)/kds/page.tsx` | KDS board |
| `fe/src/context/OrdersWSContext.tsx` | Shared WS connection |
| `fe/src/components/guards/AuthGuard.tsx` | Redirect unauthenticated to /login |
| `fe/src/components/guards/RoleGuard.tsx` | Block insufficient role |

---

## Related Flows

- [FLOW_01_ENTRY_POINTS.md](FLOW_01_ENTRY_POINTS.md) — chef login and redirect
- [FLOW_08_ORDER_STATE_MACHINE.md](FLOW_08_ORDER_STATE_MACHINE.md) — allowed status transitions
- [FLOW_09_AUTH_TOKENS.md](FLOW_09_AUTH_TOKENS.md) — WS uses ?token= not header
