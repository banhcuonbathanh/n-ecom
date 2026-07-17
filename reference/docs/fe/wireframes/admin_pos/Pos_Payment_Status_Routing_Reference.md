# POS / Payment — Status Routing Reference

> Maps every order + payment status to the zone/component that renders it, the action
> buttons per state, and the page's full data flow (reads · writes · cross-page state).
> Every cell is traced to current code. Model file:
> `docs/fe/wireframes/admin_main/admin_overview/Admin_Overview_Status_Routing_Reference.md`.
>
> **Scope:** the POS flow spans **two routes**, both gated `RoleGuard minRole={Role.CASHIER}`:
> - **POS** — [`fe/src/app/(dashboard)/pos/page.tsx`](../../../../fe/src/app/(dashboard)/pos/page.tsx) — browse menu → build cart → create order → wait for kitchen.
> - **Payment** — [`fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx`](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx) — receipt → pick method → pay → print → back to POS.
>
> Wireframe: `docs/fe/wireframes/admin_pos/flow-pos-payment.excalidraw` (PNG: `pos+payment_work_flow.png`).

---

## Live Page Snapshot — NOT captured

The live render was **not** captured:

- At write time the stack was up (FE `:3000` → 200, BE `:8080/api/v1/categories` → 200) but the
  Playwright MCP tools had not yet registered, so no browser snapshot could be taken.
- When the Playwright tools did become available, the FE dev server was no longer reachable
  (`net::ERR_CONNECTION_REFUSED` on `http://localhost:3000/pos`).
- Both `/pos` and `/cashier/payment/[id]` are wrapped in `AuthGuard` + `RoleGuard minRole={Role.CASHIER}`,
  so even when up, an unauthenticated navigate redirects to `/login` — a real snapshot needs a
  logged-in cashier token plus (for the payment page) a real order id at `status = ready`.

All cells below are traced to source, not to a live render. Re-run with the FE dev server up and an
authenticated cashier session to add the ground-truth snapshot.

---

## Page Layout — POS (`/pos`)

The POS page renders **one of two mutually-exclusive screens**, gated on local `activeOrder` state
(not on a fetched status field):

| Zone | Component | Title (verbatim) | When visible |
|---|---|---|---|
| A | Left panel — menu browse (`CategoryTabs` + product grid) | `POS — Thu Ngân` | `activeOrder === null` (browse screen) |
| B | Right panel — order summary (inline cart) | `Đơn hiện tại` | `activeOrder === null` (browse screen) |
| C | Waiting card | `⏳ Bếp đang chuẩn bị...` | `activeOrder !== null` (after order created) |

- Zones A + B render together as the two-column browse layout ([page.tsx:135-223](../../../../fe/src/app/(dashboard)/pos/page.tsx#L135-L223)).
- Zone C **replaces** A+B entirely once an order is created ([page.tsx:107-133](../../../../fe/src/app/(dashboard)/pos/page.tsx#L107-L133)).

## Page Layout — Payment (`/cashier/payment/[id]`)

| Zone | Component | Title (verbatim) | When visible |
|---|---|---|---|
| D | Receipt card | `Bánh Cuốn` / `Hoá đơn thanh toán` | always (after order loads) |
| E | Method picker + pay button | `Phương thức thanh toán` | `payment === null` (not yet created) |
| F | QR + upload-proof card | `Quét mã — <method>` | `payment.status === 'pending' && payment.qr_code_url` |

- Header `Thanh Toán Đơn #<order_number>` + `← Quay lại` always shown (hidden in print) ([payment/[id]/page.tsx:152-162](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L152-L162)).
- While `isLoading || !order` → full-screen `Đang tải...` only ([payment/[id]/page.tsx:137-143](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L137-L143)).

---

## Order DB Statuses (`orders.status`)

Source: `docs/be/be_code_summary/DB_SCHEMA_SUMMARY.md` (`orders.status`, migration 015 added `paid`).

| Status | Meaning |
|---|---|
| `pending` | Just created — POS orders start here (no auto-confirm). |
| `confirmed` | Staff/KDS accepted. |
| `preparing` | Kitchen cooking. |
| `ready` | All items done — **the only status that auto-redirects POS → Payment**. |
| `delivered` | Served to customer. |
| `cancelled` | Voided. |
| `paid` | Terminal — payment completed. |

BE transition map (`order_service.go:512-520`): `preparing → {ready, cancelled}`, `ready → {delivered}`.
→ `ready` is reached only from `preparing`; the POS waiting screen depends on KDS advancing the order.

## Payment DB Statuses (`payments.status`)

Source: `DB_SCHEMA_SUMMARY.md` (`payments.status`) — **⚠️ `completed`, NOT `success`**.

| Status | Meaning |
|---|---|
| `pending` | Payment row created, awaiting gateway confirm (QR methods). |
| `completed` | Paid — triggers receipt print + redirect to `/pos`. |
| `failed` | Gateway rejected. |
| `refunded` | Reversed (set on cancel). |

FE `Payment.status` type is narrower: `'pending' | 'completed' | 'failed'` ([payment/[id]/page.tsx:21](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L21)) — `refunded` is not modelled on this page.

---

## Order Statuses — Which Zone Each Appears In

The POS flow does **not** render an order-status chip anywhere. The active order's status drives
**side-effects** (which screen shows, whether to auto-redirect), not a visible label. The matrix
below records where each status has an effect.

| Status | Vietnamese label | Zone A/B (browse) | Zone C (POS waiting) | Zone D (receipt) | Effect |
|---|---|---|---|---|---|
| `pending` | — (not shown) | ❌ | ✅ (order sits here after create) | ✅ (if opened) | Waiting card holds until `ready`. |
| `confirmed` | — | ❌ | ✅ | ✅ | Still waiting (no auto-action). |
| `preparing` | — | ❌ | ✅ | ✅ | Still waiting. |
| `ready` | — | ❌ | ✅ → **auto-redirect** | ✅ | WS `order_status_changed`+`status==='ready'` → push to Payment ([page.tsx:64-67](../../../../fe/src/app/(dashboard)/pos/page.tsx#L64-L67)). |
| `delivered` | — | ❌ | ❌ | ✅ | No POS handling. |
| `cancelled` | — | ❌ | ⚠️ stuck | ✅ | **No handling — waiting card never clears** (see Concerns). |
| `paid` | — | ❌ | ❌ | ✅ | Terminal; reached via Payment page. |

> The order status is read **imperatively** on the POS page — there is no status badge component.
> Zone C displays only `order_number` ([page.tsx:111](../../../../fe/src/app/(dashboard)/pos/page.tsx#L111)), never the status string.

## Payment Statuses — Which Zone Each Appears In

| Status | Zone E (method picker) | Zone F (QR/upload) | Effect |
|---|---|---|---|
| `null` (no payment yet) | ✅ | ❌ | Choose method + pay. |
| `pending` (+ `qr_code_url`) | ❌ | ✅ | Show QR, wait for WS `payment_success`. |
| `completed` | ❌ | ❌ | Toast + `window.print()` + `router.push('/pos')` ([:116-120](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L116-L120)). |
| `failed` | ❌ | ❌ | **No UI branch** — `payment` set but neither E nor F renders (dead-end, see Concerns). |

---

## Zone B (POS order summary) — Action Buttons Per Status

| Trigger | Button label | Effect | Resulting status |
|---|---|---|---|
| cart not empty | `Tạo Đơn →` | `POST /orders` → `setActiveOrder`, clear cart, toast `Đã tạo đơn #<n>` | new order `pending` |
| cart not empty | `Xoá đơn` | `setCart([])` — local only, no BE | — |
| product tile | (tile click) | `addToCart(product)` — local; disabled if `!is_available` | — |
| qty `−` / `+` | `−` / `+` | `updateQty` — local; qty 0 removes the line | — |

## Zone C (POS waiting card) — Action Buttons Per Status

| Button label | Effect | Resulting status |
|---|---|---|
| `Đến thanh toán` | `router.push('/cashier/payment/<id>')` — manual jump, no status change | unchanged |
| `Tạo đơn mới` | `setActiveOrder(null)` → back to browse; **does not cancel the order** | unchanged |
| _(none — WS side-effect)_ | order reaches `ready` → toast + auto `router.push('/cashier/payment/<id>')` | unchanged (read-only) |

## Zone E (Payment method picker) — Action Buttons Per Status

| Button label | Sends | Effect |
|---|---|---|
| `Tiền mặt` / `VNPay` / `MoMo` / `ZaloPay` | — | `setMethod(m)` — local selection only |
| `Xác nhận COD` (when method=`cod`) | `POST /payments {order_id, method:'cod'}` | if resp `completed` → toast + print + `/pos`. **🚨 `cod` rejected by BE — see Concerns** |
| `Tạo QR <method>` (QR methods) | `POST /payments {order_id, method}` | resp `pending` + `qr_code_url` → renders Zone F |

## Zone F (Payment QR/upload) — Actions

| Action | Sends | Effect |
|---|---|---|
| file input | `PATCH /payments/<payment.id>/proof` (multipart `image`) | toast `Đã lưu ảnh xác nhận` |
| _(WS side-effect)_ | — | WS `payment_success` + `order_id` match → toast + `window.print()` + `router.push('/pos')` ([:88-92](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L88-L92)) |

---

## Zone Rules

**Zone A (menu browse, POS)**
- Products fetched per `selectedCategory` (no client filter); `null` category = all products.
- Tile is `disabled` when `!p.is_available`; shows red `Hết` label. Price via `formatVND`.

**Zone B (order summary, POS)**
- Cart is **local `useState<PosCartItem[]>`** — it does **NOT** use the shared `cart.ts` Zustand store.
- `cartTotal = Σ price × quantity` computed inline ([page.tsx:88](../../../../fe/src/app/(dashboard)/pos/page.tsx#L88)).
- Cart line carries only `{product_id, name, quantity, price}` — **no filling / combo / toppings / note** (see Concerns).
- `Tạo Đơn →` disabled when cart empty or mutation pending.

**Zone C (POS waiting)**
- Watches WS only while `activeOrder` is set; resubscribes when `activeOrder` changes ([page.tsx:55-70](../../../../fe/src/app/(dashboard)/pos/page.tsx#L55-L70)).
- On every `order_status_changed` for the active id it **refetches** `GET /orders/:id` and checks `status === 'ready'` — it trusts the fetched status, not the WS payload's `status` field.

**Zone D (receipt, Payment)**
- `Bàn` row renders `order.table_id` (raw UUID), not `table_name` ([:177-182](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L177-L182)).
- `Khách` row hidden when name is the POS placeholder `Khách tại quán`.
- Line total = `unit_price × quantity`; grand total = `order.total_amount` (BE-computed).
- Print: inline `@media print` hides `.no-print`; receipt card stays visible.

**Zone F (QR, Payment)**
- WS listener only attaches while `payment.status === 'pending'` ([:64](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L64)).
- Upload proof is optional and does not advance status.

---

## What Information Comes FROM BE (reads)

### POS (`/pos`)
| Query key | Endpoint | Params | staleTime | enabled |
|---|---|---|---|---|
| `['categories']` | `GET /categories` | — | 5 min | always |
| `['products', selectedCategory]` | `GET /products` | `{category_id}` if selected | 5 min | always |
| _(imperative)_ | `GET /orders/:id` | path id | — | only inside WS handler when active order's status changes |

- `Category[]` fields used: `id`, `name` (via `CategoryTabs`).
- `Product[]` fields used: `id`, `name`, `price`, `is_available`, `category_id`.
- `Order` fields used (waiting + redirect): `id`, `order_number`, `status`.

### Payment (`/cashier/payment/[id]`)
| Query key | Endpoint | Params | enabled |
|---|---|---|---|
| `['order', orderId]` | `GET /orders/:id` | path id | `!!orderId` |

- `Order` fields used: `order_number`, `table_id`, `customer_name`, `items[]` (`id`, `quantity`, `name`, `unit_price`), `total_amount`.
- `Payment` (from `POST` response, held in local state): `id`, `order_id`, `method`, `amount`, `status`, `qr_code_url`.

---

## What Information Is SENT TO BE (writes)

### POS — `POST /orders` ([page.tsx:90-104](../../../../fe/src/app/(dashboard)/pos/page.tsx#L90-L104))
```json
{
  "customer_name":  "Khách tại quán",
  "customer_phone": "0000000000",
  "source":         "pos",
  "items": [ { "product_id": "<uuid>", "quantity": 2 } ]
}
```
- `items[]` is built **inline** (`cart.map`), **bypassing `lib/order-payload.ts`** — see Concerns.
- `customer_name` / `customer_phone` are hardcoded placeholders.
- Success → `setActiveOrder(order)`, clear cart, toast `Đã tạo đơn #<order_number>`. Error → toast `Không thể tạo đơn hàng`.

### Payment — `POST /payments` ([payment/[id]/page.tsx:110-123](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L110-L123))
```json
{ "order_id": "<uuid>", "method": "cod" }
```
- `method ∈ {cod, vnpay, momo, zalopay}` (FE). **🚨 BE binding requires `oneof=vnpay momo zalopay cash`** (`payment_handler.go:25`) → `cod` is rejected.
- Success + `status==='completed'` → toast + `window.print()` + `/pos`. Error → toast `Không thể tạo thanh toán`.
- BE rule: a payment row may be created **only when `order.status = ready`** (`DB_SCHEMA_SUMMARY.md` line 280).

### Payment — `PATCH /payments/:id/proof` ([payment/[id]/page.tsx:125-135](../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx#L125-L135))
- multipart form, field `image` (the uploaded file). Success → toast `Đã lưu ảnh xác nhận`.

---

## How It Manages Data CROSS-PAGE

| Store / channel | Key | Persisted? | Carries across pages | File |
|---|---|---|---|---|
| `useAuthStore` (Zustand) | access token in **memory only** | no (per project rule) | Bearer/`?token=` for API + WS | `fe/src/features/auth/auth.store.ts` |
| `OrdersWSContext` (shared WS) | `ws/orders-live?token=` | n/a (live socket) | order/payment events to subscribers | `fe/src/context/OrdersWSContext.tsx` |
| URL param | `/cashier/payment/<orderId>` | n/a | order id POS → Payment | router push |
| **(none — POS cart)** | — | **not persisted** | local `useState`, lost on reload | — |

- **No Zustand cart store and no `localStorage` handoff** on POS — the cart lives entirely in component
  state; a page reload before `Tạo Đơn →` loses it.
- WS auth uses `?token=` query param; both pages rebuild `wss://…/ws/orders-live` from `NEXT_PUBLIC_API_URL`.
- BE WS events are **confirmed real**: `order_status_changed` (`order_service.go:543,736`), `payment_success` (`payment_service.go:270`).

### End-to-end loop
`browse (GET /products) → add to local cart → POST /orders (source=pos) → waiting card → KDS advances
to ready → WS order_status_changed → auto push /cashier/payment/:id → GET /orders/:id → POST /payments
→ (COD: completed → print | QR: pending → scan → WS payment_success) → print + push /pos`.

---

## Concerns

| # | Severity | Concern |
|---|---|---|
| 1 | 🚨 RISK | **COD payment is broken.** FE default method is `cod` and sends `{method:'cod'}`, but BE binding is `oneof=vnpay momo zalopay cash` (`payment_handler.go:25`). Cash payment — the primary in-store path — will 400. Fix: FE should send `cash` (and key `METHOD_LABELS` on `cash`). |
| 2 | ⚠️ FLAG | **POS bypasses the single order-payload builder.** `page.tsx:96` builds `items[]` inline instead of `lib/order-payload.ts` (`buildOrderItemsPayload`), which CLAUDE.md mandates. POS orders therefore cannot carry `filling`, combo overrides, toppings, or per-item note — they will diverge from menu/checkout/KDS once OC fields matter. |
| 3 | ⚠️ FLAG | **Cancelled active order leaves POS stuck.** Zone C only auto-acts on `ready`; if the order is cancelled while waiting, the card never clears — cashier must hit `Tạo đơn mới` manually. |
| 4 | ⚠️ FLAG | **`failed` payment is a dead-end.** When `POST /payments` returns `failed` (or a pending non-QR), neither Zone E nor F renders (`:249-280` only handle `pending && qr_code_url`); the cashier sees the receipt with no retry control. |
| 5 | 💡 SUGGESTION | Receipt shows raw `order.table_id` UUID as `Bàn` (`:177-182`) — should use `table_name`. |
| 6 | 💡 SUGGESTION | POS cart is unpersisted local state — a reload loses the in-progress order. Consider the shared cart store or a localStorage draft. |

---

## Cross-Page Notes

- **X1 (order enum):** uses the canonical 7 values — pending·confirmed·preparing·ready·delivered·cancelled·paid. ✅
- **X2 (labels):** POS renders **no** order-status labels (effect-only), so it introduces no order-label drift. Payment-method labels are POS-local (`METHOD_LABELS`), and the `cod`/`cash` key is the X-new concern #1 above.
- **X3 (transitions):** POS does not advance order status; it only reads `ready` and triggers navigation. Payment advances order → `paid` indirectly via BE on `payment_success`.
- **X4 (`paid` active):** not surfaced here — the Payment page treats `completed` as terminal (print + leave); it never re-reads order status after pay.
