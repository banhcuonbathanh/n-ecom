# FLOW 10 — How Client and Staff Flows Intersect

> Shows where a customer action produces a staff-visible event and vice versa.

---

## Intersection Diagram

```
CUSTOMER SIDE                              STAFF SIDE
─────────────────────────────────────────────────────────────

Customer scans QR → /table/:qr_token
    │
    POST /orders (source: "qr")
    │
    ├──────────────────────────────────────► KDS board (/kds)
    │                                            │ WS: new_order event
    │                                            │ Chef sees order + beep
    │                                            │ Chef marks items done
    │
    ├──────────────────────────────────────► Admin Overview (/admin/overview)
    │                                            │ WS: new_order event
    │                                            │ Manager sees popup
    │                                            │ "Xác nhận" → confirmed
    │
    │                                        KDS: all items done
    │                                            │ order → "ready"
    │                                            │
    │                                        POS or Cashier sees ready
    │                                            │
    │                                        /cashier/payment/:id
    │                                            │ COD or QR payment
    │
    │◄──────────────────────────────────────── WS: payment_success
    │
Customer sees status update
via SSE (/order/:id or /tracking)
```

---

## Event Mapping

| Customer Action | Staff Receives |
|---|---|
| POST /orders (QR) | WS `new_order` → KDS board + Admin Overview popup |
| Cancel item/order | WS `order_cancelled` → removed from KDS + Overview |
| Add more items | WS `new_order` update → KDS refreshes |

| Staff Action | Customer Sees |
|---|---|
| Confirm order (pending → confirmed) | SSE update on /order/:id |
| Chef marks item done (qty_served++) | SSE `item_progress` on /order/:id |
| Chef marks order ready | SSE `order_status_changed` on /order/:id + /tracking |
| Payment completed | SSE update — order status → delivered |
| Staff cancels order | SSE `order_cancelled` on /order/:id → redirect /menu |

---

## Realtime Protocol by Role

| Page | Protocol | Endpoint |
|---|---|---|
| Customer /order/:id | SSE | `/api/v1/orders/:id/stream` |
| Customer /tracking | SSE | `/api/v1/orders/monitor/stream` |
| Chef /kds | WS | `/ws/kds?token=` |
| Cashier /pos | WS | `/ws/orders-live?token=` |
| Cashier /cashier/payment | WS | `/ws/orders-live?token=` (listens for payment_success) |
| Manager /admin/overview | SSE + WS | `/api/v1/admin/events` + `/ws/orders-live?token=` |

---

## Shared Endpoints (used by both sides)

| Endpoint | Customer uses | Staff uses |
|---|---|---|
| `GET /api/v1/products` | Browse menu | POS product list |
| `GET /api/v1/orders/:id` | Order detail | Order detail (overview, KDS) |
| `DELETE /api/v1/orders/items/:itemId` | Cancel own item | Cancel any item |
| `DELETE /api/v1/orders/:id` | Cancel own order | Cancel any order |

---

## One Active Order Per Table — Shared Enforcement

- Rule lives in server: one `pending/confirmed/preparing/ready` order per table at a time
- Customer hits `TABLE_HAS_ACTIVE_ORDER` → redirected to existing order (no duplicate created)
- Staff in Overview sees the active order on the table grid
- New QR scan for the same table → same redirect until existing order is `delivered` or `cancelled`

---

## Related Flows

- [FLOW_02_CLIENT_QR.md](FLOW_02_CLIENT_QR.md) — full customer journey
- [FLOW_03_STAFF_KDS.md](FLOW_03_STAFF_KDS.md) — chef side of intersection
- [FLOW_04_STAFF_POS.md](FLOW_04_STAFF_POS.md) — cashier side
- [FLOW_05_ADMIN_OVERVIEW.md](FLOW_05_ADMIN_OVERVIEW.md) — manager side
- [FLOW_06_PAYMENT.md](FLOW_06_PAYMENT.md) — payment completion closes the loop
- [FLOW_08_ORDER_STATE_MACHINE.md](FLOW_08_ORDER_STATE_MACHINE.md) — status transitions that trigger events
- [FLOW_09_AUTH_TOKENS.md](FLOW_09_AUTH_TOKENS.md) — different auth per side
