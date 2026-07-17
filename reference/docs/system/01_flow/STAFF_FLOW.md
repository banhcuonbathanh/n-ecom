# Staff Flow — Login to Payment Confirm

> **TL;DR:** Staff log in once; role determines immediate redirect (chef → KDS cooking board,
> cashier → POS, manager → Overview). The chef's job is **cooking**: take confirmed orders through
> `preparing ("cooking") → ready` on the KDS. The three staff surfaces (KDS, POS, Overview) all
> feed into the same `/cashier/payment/:id` endpoint. WebSocket is the realtime backbone for all
> staff screens. 🔮 PLANNED: the cashier can also order on a customer's behalf at POS (customers
> with no phone).
>
> Status markers: ✅ implemented · 🔮 PLANNED (owner decision 2026-06-12, not in code yet) ·
> ⚠️ DRIFT (target rule differs from current code).

---

## Role Hierarchy

```
admin  ⊃  manager  ⊃  staff  ⊃  cashier  |  chef
```

| Role | Primary Screen | What They Can Do |
|---|---|---|
| `chef` | `/kds` | **Cooking** — mark items done, move order through `confirmed → preparing ("cooking") → ready` |
| `cashier` | `/pos` | Create walk-in orders, process payment |
| `staff` | `/pos` | Everything cashier can + cancel any order/item |
| `manager` | `/admin/overview` | Everything staff can + confirm orders, force-cancel, view all tables |
| `admin` | `/admin/overview` | Full access |

---

## Flow Overview

```
POST /api/v1/auth/login { username, password }
    │ access_token → Zustand memory only
    │ refresh_token → httpOnly cookie (JS cannot read)
    │
    Role redirect:
    │   chef      → /kds
    │   cashier/staff → /pos
    │   manager/admin → /admin/overview
    │
    ┌─────────────────────────────────────────────────────────────┐
    │ CHEF: /kds — COOKING                                        │
    │   WS /ws/kds?token= ← receives new_order events            │
    │   Beep alert → order appears on board                      │
    │   Start cooking: PATCH /orders/:id/status { "preparing" }  │
    │   Cooking each item → PATCH /orders/:id/items/:itemId/status│
    │     └─ qty_served++ ; all done → order "ready"             │
    │   Manual: PATCH /orders/:id/status { status: "ready" }     │
    └─────────────────────────────────────────────────────────────┘
    │
    ┌─────────────────────────────────────────────────────────────┐
    │ CASHIER: /pos                                               │
    │   Browse products (same /products API as menu)             │
    │   Build cart (component state, NOT Zustand, NOT localStorage)│
    │   POST /orders { source:"pos", customer_name:"Khách tại quán" }│
    │   🔮 PLANNED: order on customer's behalf — cashier logs in │
    │     / creates the session for a customer with no phone     │
    │   WS watches for order_status_changed { status:"ready" }   │
    │   Auto-redirect → /cashier/payment/:id                     │
    └─────────────────────────────────────────────────────────────┘
    │
    ┌─────────────────────────────────────────────────────────────┐
    │ MANAGER: /admin/overview                                    │
    │   Dual realtime: SSE /api/v1/admin/events                  │
    │                + WS /ws/orders-live?token=                 │
    │   WS new_order → popup "Xác nhận" / "Bỏ qua"              │
    │   "Xác nhận" → PATCH /orders/:id/status { confirmed }      │
    │   Table grid: click table → view active order              │
    └─────────────────────────────────────────────────────────────┘
    │
    /cashier/payment/:id  (Cashier+ role required)
    │   Display: order number, table, items, total
    │   Select method → confirm
    │
    COD:   POST /payments { method:"cod" } → completed immediately
           toast → window.print() → /pos
    │
    QR:    POST /payments { method:"vnpay"|"momo"|"zalopay" }
           returns qr_code_url + status:"pending"
           Show QR code to customer
           WS /ws/orders-live listens for payment_success
           On event: toast → window.print() → /pos
```

---

## Step Table

| # | Step | Actor | FE Page | BE Endpoint | State Change |
|---|---|---|---|---|---|
| 1 | Login | Staff | `/login` | `POST /api/v1/auth/login` | access_token → Zustand; refresh_token → httpOnly cookie |
| 2 | 401 on any request | FE interceptor | — | `POST /api/v1/auth/refresh` | new access_token → Zustand; retry original request |
| 3 | KDS connects | Chef | `/kds` | `WS /ws/kds?token=` | order board populated |
| 4 | New order arrives | Chef | `/kds` | WS `new_order` event | order prepended; audio beep |
| 5 | Start cooking | Chef | `/kds` | `PATCH /orders/:id/status` | order → `preparing` ("cooking") |
| 6 | Cooking: mark item done | Chef | `/kds` | `PATCH /orders/:id/items/:itemId/status` | `qty_served++` |
| 7 | All items cooked | System | — | auto | order → `ready`; WS pushes update |
| 8 | POS: build order | Cashier | `/pos` | `GET /api/v1/products` | cart in component state |
| 9 | POS: submit order | Cashier | `/pos` | `POST /api/v1/orders` | order → `pending`; cart cleared |
| 9b | POS: order on customer's behalf 🔮 PLANNED | Cashier | `/pos` | TBD | cashier logs in / creates the session for a phone-less customer and orders for them |
| 10 | Kitchen ready | WS | `/pos` | WS `order_status_changed` (ready) | auto-redirect → `/cashier/payment/:id` |
| 11 | Confirm order | Manager | `/admin/overview` | `PATCH /orders/:id/status` | order → `confirmed` |
| 12 | COD payment | Cashier | `/cashier/payment/:id` | `POST /api/v1/payments { method:"cod" }` | payment → `completed`; order → `delivered` |
| 13 | QR payment | Cashier | `/cashier/payment/:id` | `POST /api/v1/payments { method:"vnpay"... }` | payment → `pending`; QR code shown |
| 14 | QR payment confirmed | WS | — | WS `payment_success` | toast → print → `/pos` |
| 15 | Upload proof | Cashier | `/cashier/payment/:id` | `PATCH /api/v1/payments/:id/proof` | payment marked verified |
| 16 | Cancel item/order | Staff+ | any order view | `DELETE /orders/items/:itemId` or `DELETE /orders/:id` | item/order removed — current code: < 30% rule (⚠️ DRIFT, see below) |
| 17 | Logout | Any staff | — | `POST /api/v1/auth/logout` | jti → Redis blacklist; Zustand cleared |

---

## Realtime Protocol by Staff Screen

| Screen | Protocol | Endpoint | Events |
|---|---|---|---|
| KDS `/kds` | WebSocket | `/ws/kds?token=` | `new_order`, `item_progress`, `order_cancelled`, `order_status_changed` |
| POS `/pos` | WebSocket | `/ws/orders-live?token=` | `order_status_changed` (ready), `payment_success` |
| Payment `/cashier/payment/:id` | WebSocket | `/ws/orders-live?token=` | `payment_success` |
| Overview `/admin/overview` | SSE + WebSocket | `/api/v1/admin/events` + `/ws/orders-live?token=` | `new_order`, `order_status_changed`, table updates |

**Why `?token=` for WS:** Browser WebSocket API cannot set custom headers; query param is the only option. SSE uses `Authorization: Bearer` header as normal.

---

## Cancel Permissions Summary

**Target rule (owner decision 2026-06-12):** a customer can cancel items or the whole order at
**any time before payment is completed**. ⚠️ DRIFT — BE change pending.

**Current code behaviour** (still enforced today):

| Actor | Cancel Item | Cancel Order | Condition (current code) |
|---|---|---|---|
| Customer (guest) | Own order only | Own order only | < 30% served — target: anytime before payment ⚠️ DRIFT |
| Chef | Via KDS status update only | No direct cancel | — |
| Cashier | Any order | Any order | < 30% served |
| Staff | Any order | Any order | < 30% served |
| Manager | Any order | Any order | < 30% served |

Full rule detail: [ORDER_STATE_MACHINE.md — cancel rules](ORDER_STATE_MACHINE.md#cancel-rules).

---

## Auth & State Rules

| Data | Where Stored | Reason |
|---|---|---|
| Staff access token | Zustand `authStore` — **memory only** | XSS prevention |
| Staff refresh token | httpOnly cookie (server-set) | JS cannot read it |
| POS cart | Component `useState` — NOT Zustand, NOT localStorage | Single-session; dies with the component intentionally |
| KDS order board | Component state, rebuilt from WS | Always fresh from server |
| Overview tables/orders | TanStack Query + WS/SSE patches | Server is source of truth |

---

## Invariants — Never Break

1. Staff access token is **memory-only** — never touches localStorage.
2. **Refresh is automatic** — interceptor retries on 401 silently; never force-redirect to `/login` on first 401.
3. **POS cart is component state** — do not move it to Zustand or localStorage.
4. **WS uses `?token=`** — not `Authorization` header.
5. **SSE uses `Authorization: Bearer`** — not query param.
6. **COD completes immediately** — no WS wait; print receipt right after `POST /payments` response.
7. **Payment only on `ready` orders** — do not navigate to `/cashier/payment/:id` for non-ready orders.
8. **One active order per table** — FE must handle `TABLE_HAS_ACTIVE_ORDER` gracefully.

---

## Deep Dive Sources

| File | Purpose |
|---|---|
| `../07_business_logic/LOGIC_INDEX.md` | Business-logic index — consult + update before changing staff flows |
| [PAYMENT_FLOW.md](PAYMENT_FLOW.md) | Payment flow detail |
| `../02_spec/BUSINESS_RULES.md §6` | WS vs SSE token transport rules |
| [ORDER_STATE_MACHINE.md](ORDER_STATE_MACHINE.md) | Order state machine + transitions |
| `../02_spec/BUSINESS_RULES.md §3` | Cancel rule (target vs current code) |
| `../02_spec/BUSINESS_RULES.md §5` | Staff JWT config + interceptor pattern |
