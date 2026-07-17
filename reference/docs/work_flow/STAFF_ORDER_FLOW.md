# STAFF ORDER FLOW — Single Source of Truth

> **MANDATORY:** Any code that touches staff order management — table status, order confirm, item progress, cancel, bill, payment — MUST reference this file and preserve every rule below. Do NOT change this flow without updating this doc first and getting owner approval.

---

## Role Hierarchy (RBAC)

```
Customer < Chef < Cashier < Staff < Manager < Admin
```

| Role | What they can do in this flow |
|---|---|
| Chef | KDS only — mark items done, update order to preparing/ready |
| Cashier | POS + payment — create walk-in orders, process bill |
| Staff | Everything Cashier can do + cancel orders/items |
| Manager | Everything Staff can do + view overview, confirm/force-cancel any order |
| Admin | Full access |

---

## Flow Overview

```
Staff login → /login
    ↓ access token (24h memory) + refresh cookie (30d httpOnly)
    ↓
    ├── Chef goes to → /kds  (Kitchen Display System)
    │       ↓
    │   Receives new orders via WebSocket (beep alert)
    │       ↓
    │   Marks each item done (PATCH /orders/:id/items/:itemId/status)
    │       ↓
    │   All items done → order auto-signals ready
    │       ↓
    │   Can change order status manually (confirmed → preparing → ready)
    │
    ├── Cashier/Staff goes to → /pos  (Point of Sale)
    │       ↓
    │   Browses menu, builds cart, creates walk-in order
    │   POST /orders  { source: "pos", customer_name: "Khách tại quán" }
    │       ↓
    │   Waits — WS notifies when kitchen marks order "ready"
    │       ↓
    │   Auto-redirect → /cashier/payment/:id
    │
    └── Manager/Staff goes to → /admin/overview  (Floor View)
            ↓
        Sees all tables + live order status via SSE + WS
            ↓
        Confirms new orders (pending → confirmed)
            ↓
        Can force-cancel, view detail, call for service

─────────────────────────────────────────

CASHIER PAYMENT FLOW (shared by POS + QR orders):
    /cashier/payment/:id
        ↓
    Select payment method: COD | VNPay | MoMo | ZaloPay
        ↓
    POST /payments  { order_id, method }
        ├── COD → payment created as "completed" → print receipt → back to /pos
        └── QR method → payment "pending" → show QR code
                ↓
            WS listens for "payment_success" event
                ↓
            Auto: print receipt → back to /pos
```

---

## Step-by-Step Rules (DO NOT CHANGE)

### Step 1 — Staff Login
- Page: `fe/src/app/(auth)/login/page.tsx`
- Calls: `POST /api/v1/auth/login` with `{ username, password }`
- On success:
  - Store `access_token` in **Zustand auth store (memory only)** — NEVER localStorage
  - `refresh_token` set as httpOnly cookie by server — JS cannot read it
  - Redirect based on role:
    - `chef` → `/kds`
    - `cashier` / `staff` → `/pos`
    - `manager` / `admin` → `/admin/overview`
- On 401: show inline error, stay on login
- Token lifecycle: access 24h, refresh 30d. On 401 → interceptor calls `/auth/refresh` once → retry. If refresh fails → `/login`

### Step 2 — KDS (Chef view at `/kds`)
- Requires: `chef` role or higher (AuthGuard + RoleGuard)
- Connects to shared WS: `GET /ws/kds?token=<access_token>` (query param, not header)
- On WS `new_order` event: fetches full order, prepends to list, plays audio beep
- On WS `item_progress`: updates `qty_served` inline without refetch
- On WS `order_cancelled` / `order_status_changed` (non-active status): removes order from board

**Item done action:**
- Staff clicks item → `PATCH /api/v1/orders/:orderId/items/:itemId/status`
- Server increments `qty_served` by 1; when `qty_served = quantity` → item is "done"
- When all items done → order becomes `ready` (server-side auto or manual)

**Order status change (manual):**
- `PATCH /api/v1/orders/:orderId/status` with `{ status: "<new>" }`
- Allowed transitions from KDS: confirmed → preparing, preparing → ready
- On success: order removed from KDS board

### Step 3 — POS (Cashier/Staff at `/pos`)
- Requires: `cashier` role or higher
- Staff browses products by category (same `/products` API as menu)
- Adds items to local cart (component state — NOT Zustand, NOT localStorage)
- Submit: `POST /api/v1/orders` with:
  ```json
  {
    "customer_name":  "Khách tại quán",
    "customer_phone": "0000000000",
    "source":         "pos",
    "items": [{ "product_id": "...", "quantity": 1 }]
  }
  ```
- On success: `activeOrder` set, cart cleared, screen shows "waiting for kitchen"
- WS watches for `order_status_changed` where `status = "ready"` for this order
- Auto-redirect to `/cashier/payment/:id` when ready
- Staff can also manually click "Đến thanh toán" to go early

### Step 4 — Admin Overview (Manager+ at `/admin/overview`)
- Requires: `staff` role or higher
- Dual realtime: SSE (`/admin/events`) + WS (`/ws/orders-live?token=`) in parallel
- Shows: stat cards (revenue, orders, pending count), table grid, prep panel, waiting list
- **New order popup**: when WS fires `new_order` → popup appears with order detail
  - "Xác nhận" button → `PATCH /api/v1/orders/:id/status { status: "confirmed" }`
  - "Bỏ qua" → dismiss popup only, order stays pending
- **Table grid**: shows each table's status (available / occupied) and active order
  - Clicking a table → view active order detail

### Step 5 — Cancel (Dish-level and Order-level)

**Cancel rule (from `docs/core/MASTER_v1.2.md §4.2`):**
```
cancel_allowed = SUM(qty_served) / SUM(quantity) < 0.30
```
- < 30% served → cancel allowed
- >= 30% served → server rejects with 409

**Cancel single item** (customer OR staff):
- `DELETE /api/v1/orders/items/:itemId`
- UI: shown as per-item cancel button in `/order/:id`

**Cancel remaining combo items** (customer OR staff):
- Multiple `DELETE /api/v1/orders/items/:itemId` calls in parallel
- UI: "huỷ các món còn lại" in combo section

**Cancel entire order** (customer own order OR cashier/staff/manager):
- `DELETE /api/v1/orders/:orderId`
- Allowed from status: `pending`, `confirmed`, `preparing` (if < 30% rule passes)
- On success (client): redirect to `/menu`
- On success (staff): remove from board / show success toast
- If payment already made: server triggers refund flow

**Who can cancel what:**

| Actor | Can cancel item | Can cancel order | Condition |
|---|---|---|---|
| Customer (guest) | Own order items only | Own order only | < 30% served |
| Chef | Via KDS status update only | No direct cancel | — |
| Cashier | Any order | Any order | < 30% served |
| Staff | Any order | Any order | < 30% served |
| Manager | Any order | Any order | < 30% served |

### Step 6 — Bill and Payment (at `/cashier/payment/:id`)
- Requires: `cashier` role or higher
- Displays full order receipt: order number, table, items, total
- Staff selects payment method and clicks confirm

**COD (tiền mặt):**
- `POST /api/v1/payments` with `{ order_id, method: "cod" }`
- Server responds with `status: "completed"` immediately
- FE: `toast.success` → `window.print()` (browser print dialog for receipt) → redirect `/pos`

**QR methods (VNPay / MoMo / ZaloPay):**
- `POST /api/v1/payments` with `{ order_id, method: "vnpay" | "momo" | "zalopay" }`
- Server creates pending payment, returns `qr_code_url`
- FE shows QR code to customer
- WS listens for `payment_success` where `order_id` matches
- On WS event: `toast.success` → `window.print()` → redirect `/pos`

**Upload proof (optional for QR):**
- `PATCH /api/v1/payments/:paymentId/proof` with `multipart/form-data` (image field)
- Used when staff manually confirms a screenshot from customer

**Payment timing rule (from `docs/core/MASTER_v1.2.md §4.3`):**
- Payment record is only created when `order.status = ready` or `delivered`
- Attempting payment on a non-ready order → reject at server

---

## State & Auth Rules

| Data | Where Stored | Why |
|---|---|---|
| Staff access token | Zustand auth store (memory) | Security — never localStorage |
| Staff refresh token | httpOnly cookie (server-set) | JS cannot access it |
| POS cart | Component local state (`useState`) | Single-session, no persistence needed |
| KDS order board | Component state, rebuilt from WS | Always fresh from server |
| Overview tables/orders | TanStack Query + WS/SSE patches | Server is source of truth |

---

## Key Files — Must Read Before Touching This Flow

| File | Role |
|---|---|
| `fe/src/app/(auth)/login/page.tsx` | Staff login |
| `fe/src/app/(dashboard)/kds/page.tsx` | KDS — chef order/item status |
| `fe/src/app/(dashboard)/pos/page.tsx` | POS — cashier walk-in orders |
| `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx` | Bill + payment |
| `fe/src/app/(dashboard)/admin/overview/page.tsx` | Floor view — table status + confirm |
| `fe/src/app/(shop)/order/[id]/page.tsx` | Cancel logic (shared with client) |
| `fe/src/features/auth/auth.store.ts` | Staff auth token store |
| `fe/src/components/guards/AuthGuard.tsx` | Redirects unauthenticated to /login |
| `fe/src/components/guards/RoleGuard.tsx` | Blocks insufficient role |
| `fe/src/context/OrdersWSContext.tsx` | Shared WS connection (one per session) |
| `fe/src/hooks/useAdminSSE.ts` | SSE hook for admin overview |
| `fe/src/hooks/useOverviewWS.ts` | WS hook for admin overview |
| `docs/core/MASTER_v1.2.md §4.1` | Order state machine + transitions |
| `docs/core/MASTER_v1.2.md §4.2` | Cancel rule (< 30% formula) |
| `docs/core/MASTER_v1.2.md §4.3` | Payment timing rules |
| `docs/core/MASTER_v1.2.md §6.1–6.3` | Staff JWT config + interceptor pattern |

---

## Invariants — Never Break These

1. **Staff token is memory-only** — access token lives in Zustand, never touches localStorage.
2. **Refresh is automatic** — the axios interceptor retries on 401 silently; never force-redirect to login on first 401.
3. **POS cart is component state** — do not move it to Zustand or localStorage; it dies with the component intentionally.
4. **WS uses `?token=` query param** — not `Authorization` header (WebSocket API limitation).
5. **SSE uses `Authorization: Bearer` header** — not query param.
6. **Cancel requires < 30% check** — the server enforces it, but FE must show the correct error (`CANCEL_NOT_ALLOWED`) rather than a generic one.
7. **COD completes immediately** — no WS wait, print receipt right after `POST /payments` response.
8. **Payment only on `ready` orders** — do not allow FE to navigate to `/cashier/payment/:id` for non-ready orders unless overridden by manager.
9. **One active order per table** — enforced server-side; FE must handle `TABLE_HAS_ACTIVE_ORDER` error gracefully.

---

## Backend Endpoints Used in This Flow

| Step | Method | Endpoint | Role Required |
|---|---|---|---|
| Staff login | POST | `/api/v1/auth/login` | Public |
| Refresh token | POST | `/api/v1/auth/refresh` | Public (cookie) |
| Logout | POST | `/api/v1/auth/logout` | Any auth |
| KDS order list | GET | `/api/v1/orders` | Chef+ |
| KDS WS | WS | `/ws/kds?token=` | Chef+ |
| Mark item done | PATCH | `/api/v1/orders/:id/items/:itemId/status` | Chef+ |
| Change order status | PATCH | `/api/v1/orders/:id/status` | Chef+ |
| Create POS order | POST | `/api/v1/orders` | Cashier+ |
| Live orders WS | WS | `/ws/orders-live?token=` | Cashier+ |
| Admin SSE | GET | `/api/v1/admin/events` | Staff+ |
| List tables | GET | `/api/v1/tables` | Staff+ |
| Confirm order | PATCH | `/api/v1/orders/:id/status` | Cashier+ |
| Cancel item | DELETE | `/api/v1/orders/items/:itemId` | Owner or Cashier+ |
| Cancel order | DELETE | `/api/v1/orders/:id` | Owner or Cashier+ |
| Create payment | POST | `/api/v1/payments` | Cashier+ |
| Upload proof | PATCH | `/api/v1/payments/:id/proof` | Cashier+ |
