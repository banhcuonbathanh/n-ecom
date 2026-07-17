# System Flow — Actor Reactions Overview

> One row = one moment in the system.
> Each column = what that actor sees / does at that moment.
> Source of truth: `CLIENT_QR_FLOW.md` + `STAFF_ORDER_FLOW.md`

---

## Actor Glossary

| Label | Role | Where |
|---|---|---|
| **Client** | Customer (no login, guest JWT) | `/menu` · `/order/:id` · `/tracking` |
| **Chef** | KDS view | `/kds` |
| **Cashier** | POS + payment view | `/pos` · `/cashier/payment/:id` |
| **Manager** | Floor overview view | `/admin/overview` |

---

## Reaction Matrix

| # | Event | Who Triggers | Client | Chef `/kds` | Cashier `/pos` | Manager `/admin/overview` |
|---|---|---|---|---|---|---|
| **1** | **QR scan** | Customer | → redirected to `/menu`, guest JWT issued, tableId set | ← no change | ← no change | Table shows occupied on grid |
| **2** | **QR order submitted** | Customer | → redirected to `/order/:id`, cart cleared | 🔔 **beep** + new order card on board | ← no change | **Popup** appears: new order detail + "Xác nhận" / "Bỏ qua" |
| **3** | **POS order submitted** | Cashier | *(no client — walk-in)* | 🔔 **beep** + new order card on board | Screen shows "waiting for kitchen…" | **Popup** appears: new order detail + "Xác nhận" / "Bỏ qua" |
| **4** | **Order confirmed** *(pending → confirmed)* | Manager clicks "Xác nhận" | SSE → status badge updates to "Đã xác nhận" | Order stays on board (already visible) | ← no change | Popup dismissed, order moves to prep panel |
| **5** | **Manager skips order** | Manager clicks "Bỏ qua" | ← no change | ← no change | ← no change | Popup dismissed, order stays in waiting list |
| **6** | **Chef starts preparing** *(confirmed → preparing)* | Chef manual bump | SSE → status badge updates to "Đang chuẩn bị" | Status updated on board | ← no change | Order moves to prep panel |
| **7** | **Item marked done** *(qty_served++)* | Chef clicks item | SSE → that item shows progress update | Item count updates inline, no board refresh | ← no change | ← no change |
| **8** | **All items done → order ready** | Server auto (or chef manual) | SSE → status badge "Sẵn sàng" · `/tracking` shows ready | Order **removed** from board | WS → **auto-redirect** to `/cashier/payment/:id` | Table grid shows "ready", table highlighted |
| **9** | **COD payment** *(cash)* | Cashier | SSE → status "Đã giao" · order closed | ← no change | `toast.success` → `window.print()` → redirect `/pos` | Table returns to **available** |
| **10** | **QR payment scan** *(VNPay / MoMo / ZaloPay — customer scans code)* | Customer scans QR shown by cashier | SSE → status "Đã giao" · order closed | ← no change | WS `payment_success` → `toast.success` → `window.print()` → redirect `/pos` | Table returns to **available** |
| **11** | **Client cancels item** | Customer on `/order/:id` | Item disappears from their list | WS → item removed from board card | ← no change | ← no change |
| **12** | **Client cancels order** | Customer on `/order/:id` | Redirect → `/menu`, cart cleared | WS → order card removed from board | ← no change | Table returns to **available** |
| **13** | **Staff cancels order** | Cashier / Manager | SSE → `order_cancelled` → redirect `/menu` | WS → order card removed from board | `toast.success` on their screen | Table returns to **available** |
| **14** | **Cancel rejected** *(≥ 30% served)* | Any actor attempts cancel | `CANCEL_NOT_ALLOWED` error shown inline | ← no change | `CANCEL_NOT_ALLOWED` error shown | ← no change |
| **15** | **Table already has active order** *(QR rescan)* | Customer rescans QR | Redirect → `/order/<existing_id>` — no new order created | ← no change | ← no change | ← no change |
| **16** | **Token expired — staff** | Automatic (24h) | *(not applicable — no login)* | Interceptor silently calls `/auth/refresh` → retries request | Same as chef | Same as chef |
| **17** | **Refresh token expired — staff** | Automatic (30d) | *(not applicable)* | Redirect → `/login` | Redirect → `/login` | Redirect → `/login` |

---

## Realtime Channel per Actor

| Actor | Channel | Endpoint | Auth |
|---|---|---|---|
| Client `/order/:id` | SSE | `GET /api/v1/orders/:id/stream` | Guest JWT (Bearer header) |
| Client `/tracking` | SSE | `GET /api/v1/orders/monitor/stream` | Guest JWT (Bearer header) |
| Chef `/kds` | WebSocket | `/ws/kds?token=` | access_token as query param |
| Cashier `/pos` + `/payment` | WebSocket | `/ws/orders-live?token=` | access_token as query param |
| Manager `/admin/overview` | **SSE + WebSocket** | `/api/v1/admin/events` + `/ws/orders-live?token=` | Bearer + query param |

---

## Cancel Quick Reference

```
cancel_allowed = SUM(qty_served) / SUM(quantity) < 0.30
```

| Who | Can cancel item | Can cancel order |
|---|---|---|
| Customer | Own items only | Own order only |
| Chef | No direct cancel | No |
| Cashier | Any item | Any order |
| Manager | Any item | Any order |

All cancels → server enforces the 30% rule → 409 `CANCEL_NOT_ALLOWED` if rejected.

---

## Order Status Path

```
pending → confirmed → preparing → ready → delivered
                                       ↘ cancelled (from pending/confirmed/preparing only, if < 30%)
```

| Who moves it | Transition |
|---|---|
| Manager (Overview popup) | pending → confirmed |
| Chef (KDS manual) | confirmed → preparing |
| Chef (KDS manual or server auto) | preparing → ready |
| Server (after payment) | ready → delivered |
| Any eligible actor (< 30%) | pending / confirmed / preparing → cancelled |
