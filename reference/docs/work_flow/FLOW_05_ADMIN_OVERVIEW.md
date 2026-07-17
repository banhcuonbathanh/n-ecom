# FLOW 05 — Admin Overview Flow (Floor View)

> Staff+ role. Dual realtime (SSE + WS). Confirms orders, monitors all tables.

---

## Diagram

```
/admin/overview
    │
Dual realtime:
    SSE: GET /api/v1/admin/events          (Authorization: Bearer header)
    WS:  /ws/orders-live?token=            (query param)
    │
Dashboard panels:
    stat cards    → revenue, total orders, pending count
    table grid    → each table: available / occupied + active order summary
    prep panel    → orders currently being prepared
    waiting list  → orders pending confirmation
    │
    ├─ WS fires new_order →
    │       popup appears with order detail
    │       "Xác nhận" → PATCH /orders/:id/status { status: "confirmed" }
    │       "Bỏ qua"   → dismiss popup, order stays pending
    │
    └─ Click table →
            view active order detail
            force-cancel option (manager only)
```

---

## Rules

- Requires `staff` role or higher (AuthGuard + RoleGuard)
- Two concurrent realtime connections run in parallel:
  - **SSE** `GET /api/v1/admin/events` — uses `Authorization: Bearer <token>` header
  - **WS** `/ws/orders-live?token=<access_token>` — uses query param, not header
- New order confirmation:
  - "Xác nhận" → `PATCH /orders/:id/status { status: "confirmed" }` — moves to kitchen
  - "Bỏ qua" → dismiss only, order stays `pending` in waiting list
- Table grid:
  - Available = no active order on that table
  - Occupied = has an active order (`pending` / `confirmed` / `preparing` / `ready`)
  - Clicking a table opens the active order detail
- Force-cancel: manager+ only — bypasses normal cancel flow

---

## Backend Endpoints

| Action | Method | Endpoint | Auth |
|---|---|---|---|
| Admin SSE | GET | `/api/v1/admin/events` | Staff+ |
| Live orders WS | WS | `/ws/orders-live?token=` | Cashier+ |
| List tables | GET | `/api/v1/tables` | Staff+ |
| Confirm order | PATCH | `/api/v1/orders/:id/status` | Cashier+ |
| Cancel order | DELETE | `/api/v1/orders/:id` | Cashier+ |

---

## Key Files

| File | Role |
|---|---|
| `fe/src/app/(dashboard)/admin/overview/page.tsx` | Overview page |
| `fe/src/hooks/useAdminSSE.ts` | SSE hook for admin events |
| `fe/src/hooks/useOverviewWS.ts` | WS hook for admin overview |
| `fe/src/context/OrdersWSContext.tsx` | Shared WS connection |
| `fe/src/components/guards/AuthGuard.tsx` | Redirect unauthenticated to /login |
| `fe/src/components/guards/RoleGuard.tsx` | Block insufficient role |

---

## Related Flows

- [FLOW_01_ENTRY_POINTS.md](FLOW_01_ENTRY_POINTS.md) — manager login and redirect
- [FLOW_07_CANCEL.md](FLOW_07_CANCEL.md) — cancel rules including force-cancel
- [FLOW_08_ORDER_STATE_MACHINE.md](FLOW_08_ORDER_STATE_MACHINE.md) — confirm transition: pending → confirmed
- [FLOW_09_AUTH_TOKENS.md](FLOW_09_AUTH_TOKENS.md) — SSE uses Bearer header, WS uses ?token=
- [FLOW_10_FLOW_INTERSECTION.md](FLOW_10_FLOW_INTERSECTION.md) — how customer QR orders appear here
