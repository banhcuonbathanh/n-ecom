# Cashier Payment — `/cashier/payment/:id`

> **TL;DR:** ✅ implemented (FE only — 3 critical BE/FE bugs block all payment paths, see Flags).
> Cashier+ guard (`AuthGuard` + `RoleGuard minRole=CASHIER`, `page.tsx:39-43`). Renders a
> printable receipt card for order `/:id`, lets the cashier pick a method (cash/VNPay/MoMo/ZaloPay),
> calls `POST /payments`, and on success `window.print()` → redirects to `/pos`. QR gateway path
> additionally opens a raw WebSocket to `/ws/orders-live?token=` waiting for `payment_success`.
> **Currently broken for every method** — see [PAYMENT_BUGS.md](PAYMENT_BUGS.md).
> BE view → [staff_cashier_payment_be.md](staff_cashier_payment_be.md) ·
> Cross-page data flow → [staff_cashier_payment_crosspage_dataflow.md](staff_cashier_payment_crosspage_dataflow.md) ·
> Loading states → [staff_cashier_payment_loading.md](staff_cashier_payment_loading.md) ·
> Scenario → [SCENARIO_CASHIER_BILL.md](SCENARIO_CASHIER_BILL.md)

---

## ASCII Wireframe

> Zones are drawn as they EXIST in code. States that are dead due to Bug 2 (blank screen after
> create) are annotated. See Flags/Known Mismatches for detail.

```
State A — Before payment created (payment === null)
┌──────────────────────────────────────────────────┐
│ [← Quay lại]  Thanh Toán Đơn #BC-0042  no-print  │ ← Header (inline JSX)
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐   │
│ │             Bánh Cuốn                      │   │ ← Receipt card
│ │         Hoá đơn thanh toán                 │   │   (visible on screen + in print)
│ │  Đơn #       BC-0042                       │   │
│ │  Bàn         03          (if table_id)     │   │
│ │  Khách       Nguyễn A    (if not default)  │   │
│ │  ─────────────────────────────────────── │   │
│ │  2× Bánh cuốn thịt            70.000đ    │   │
│ │  1× Canh mọc                  10.000đ    │   │
│ │  ─────────────────────────────────────── │   │
│ │  Tổng cộng                    80.000đ    │   │
│ │          Cảm ơn quý khách!               │   │
│ └────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────┤
│ Phương thức thanh toán             no-print      │ ← Method picker
│  [Tiền mặt ✓]  [VNPay]                           │   default 'cod' (Bug 1: BE needs 'cash')
│  [MoMo]        [ZaloPay]                         │
├──────────────────────────────────────────────────┤
│  [ Xác nhận COD / Tạo QR MoMo / … ]  no-print   │ ← Create payment button
└──────────────────────────────────────────────────┘

State B — After payment created, status==='pending' && qr_code_url set
          ⚠️ DEAD TODAY (Bug 2: thin response → status===undefined, block never renders)
┌──────────────────────────────────────────────────┐
│ (receipt card — same as above)                   │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐   │ ← QR block  no-print
│ │ Quét mã — MoMo                             │   │
│ │  ┌──────────────┐                          │   │
│ │  │  QR image    │  (224×224 from qr_code_url) │
│ │  └──────────────┘                          │   │
│ │  ⏳ Đang chờ thanh toán...                  │   │
│ └────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────┐   │ ← Proof upload  no-print
│ │ Upload ảnh xác nhận (tuỳ chọn)  [file]     │   │   (also DEAD — Bug 3: route 404)
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘

State C — After payment_success WS event (or COD status==='completed')
          ⚠️ DEAD TODAY (Bug 2 prevents both triggers)
  → toast → window.print() → router.push('/pos')

Overlay: none (no modals — all inline JSX in PaymentContent)
```

---

## Zones

| Zone | Component | Data source |
|---|---|---|
| Header | inline JSX in `cashier/payment/[id]/page.tsx:152-163` | — (back button + order number from `order.order_number`) |
| Receipt card | inline JSX `page.tsx:166-213` — `.no-print` excluded from `window.print()` | `GET /orders/:id` → TanStack `['order', orderId]` (`page.tsx:56-60`) |
| Method picker | inline 2×2 button grid `page.tsx:218-234` (`.no-print`) | local `useState<PaymentMethod>('cod')` (`page.tsx:52`) — default `'cod'` (**Bug 1**: BE requires `'cash'`) |
| Create payment button | `page.tsx:236-247` (`.no-print`) | triggers `createPayment` mutation → `POST /payments` (`page.tsx:111-123`) |
| QR block | inline `<img src={payment.qr_code_url}>` `page.tsx:249-279` (`.no-print`) | `payment.qr_code_url` from create response — **DEAD** (Bug 2: `payment.status` undefined, block never renders) |
| Proof upload | inline `<input type="file">` `page.tsx:265-273` (`.no-print`) | triggers `uploadProof` mutation → `PATCH /payments/:id/proof` — **DEAD** (inside QR block + Bug 3: route 404) |
| WS listener | `useEffect` in `page.tsx:63-108` | raw `WebSocket` to `/ws/orders-live?token=<accessToken>` — **DEAD** (Bug 2: `payment.status !== 'pending'` gate never passes) |

---

## Key Interactions

- **← Quay lại** button (`page.tsx:153-157`) → `router.back()` — normally returns to `/pos`.
- **Pick method** (`page.tsx:225-230`) → updates local `method` state. Default is `'cod'`
  (`page.tsx:52`). Label is "Tiền mặt" but the value sent is `'cod'` (Bug 1).
- **Confirm/Create button** (`page.tsx:236-247`):
  - Calls `createPayment.mutate(method)` → `POST /payments { order_id, method }` (`page.tsx:112`).
  - Button label: `'Đang xử lý...'` while pending; `'Xác nhận COD'` for `method==='cod'`;
    `'Tạo QR <label>'` for gateway methods (`page.tsx:243-246`).
  - On error: toast "Không thể tạo thanh toán" (`page.tsx:122`). Handles all BE errors the same —
    no specific text for 409 `ORDER_NOT_READY` or `PAYMENT_ALREADY_EXISTS`.
  - On success: `setPayment(data)` (`page.tsx:115`). Then:
    - If `data.status === 'completed'` (cash intended path): toast → `window.print()` →
      `/pos` (`page.tsx:116-120`). **DEAD today** — BE response omits `status`, so this branch
      never runs (Bug 2).
    - Otherwise: page waits for WS or QR block — also dead for same reason.
- **QR pending state** (`page.tsx:249`): renders when `payment.status === 'pending' && payment.qr_code_url`. **DEAD** (Bug 2). If it rendered, it would show a 224×224 `<img>`.
- **Proof upload** (`page.tsx:265-273`): `onChange` fires `uploadProof.mutate(file)` → `PATCH /payments/:id/proof` (multipart `image`). **DEAD** (inside QR block + Bug 3: no route).
- **WS `payment_success`** (`page.tsx:88-91`): `msg.type==='payment_success' && msg.order_id===orderId` → `toast.success(formatVND(paidAmount))` → `window.print()` → `router.push('/pos')`. **DEAD** (Bug 2: WS `useEffect` returns early at `payment.status !== 'pending'`, `page.tsx:64`).
- **Print** (`page.tsx:90,119`): `window.print()` — `@media print { .no-print { display:none } }` (`page.tsx:148`) hides header + controls; receipt card has no `.no-print` so it prints.

---

## Business Logic Used

- Order must be `ready` or `delivered` before payment can be created (BE service gate, not enforced in FE UI) → [../../02_spec/BUSINESS_RULES.md §4 Payment Rules](../../02_spec/BUSINESS_RULES.md#4-payment-rules)
- Payment idempotency (one non-failed payment per order) → [../../02_spec/BUSINESS_RULES.md §4](../../02_spec/BUSINESS_RULES.md#4-payment-rules)
- Allowed payment methods (`cash`/`vnpay`/`momo`/`zalopay`) and their gateway flows → [../../02_spec/BUSINESS_RULES.md §4](../../02_spec/BUSINESS_RULES.md#4-payment-rules)
- WS auth (`?token=` query param) and reconnect / exponential-backoff pattern → [../../07_business_logic/LOGIC_FE.md](../../07_business_logic/LOGIC_FE.md)
- Receipt print pattern (`window.print()` + `.no-print` class) — ❓ UNVERIFIED: no LOGIC_FE entry found for print behaviour; only source is `page.tsx:90,119,148`.

---

## Object Model

> This page owns two local TypeScript shapes: `Payment` (FE-only partial, not in `types/`) and
> `WsMsg`. It reads the shared `Order` type from `fe/src/types/order.ts`. It does **not** own the
> `Order` shape — that lives in [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md).
>
> Sources: `cashier/payment/[id]/page.tsx:14-28` · `fe/src/types/order.ts` · `fe/src/types/auth.ts`

### §1 — Order (receipt read — pointer only)

The page reads `Order` from `fe/src/types/order.ts:38-52`. Fields consumed by this page:

| Field on `Order` | Used at | Notes |
|---|---|---|
| `order_number` | `page.tsx:160,175` | receipt header + HTML `<h1>` |
| `table_id` | `page.tsx:177-181` | conditional receipt row |
| `customer_name` | `page.tsx:183-187` | conditional receipt row; hidden if `=== 'Khách tại quán'` |
| `items[].id` | `page.tsx:193` | React `key` |
| `items[].quantity` | `page.tsx:195` | line item count |
| `items[].name` | `page.tsx:195` | line item name |
| `items[].unit_price` | `page.tsx:196` | line total = `unit_price × quantity` |
| `total_amount` | `page.tsx:201` | receipt total |

Full `Order` / `OrderItem` shape → [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md).

### §2 — Payment (FE-only local interface)

Defined inline in `page.tsx:16-23`. Not exported to `fe/src/types/`. Not the same as any BE response
shape (the actual `POST /payments` response is thinner — see Bug 2).

| Field | FE type | Notes |
|---|---|---|
| `id` | `string` | payment UUID; used by `uploadProof` (`page.tsx:129`) |
| `order_id` | `string` | not consumed in render |
| `method` | `PaymentMethod` | displayed in receipt after create (`page.tsx:208`) — **DEAD** (Bug 2: method undefined) |
| `amount` | `number` | passed to `formatVND` in WS success toast (`page.tsx:66,89`) — **DEAD** (Bug 2: WS never opens) |
| `status` | `'pending' \| 'completed' \| 'failed'` | drives QR block + WS gate + cash success branch — **DEAD** (Bug 2: always `undefined`) |
| `qr_code_url` | `string \| null` | QR `<img>` src (`page.tsx:257`) — **DEAD** (Bug 2) |

Actual `POST /payments` response shape from BE (traced to `payment_handler.go:44-48`):
`{ id, pay_url, qr_code_url }` — omits `status`, `amount`, `method`.

### §3 — PaymentMethod (FE enum)

Defined `page.tsx:14`: `'vnpay' | 'momo' | 'zalopay' | 'cod'`.

| FE value | Display label (`METHOD_LABELS`) | BE required value (`payment_handler.go:25`) |
|---|---|---|
| `'cod'` | `'Tiền mặt'` | `'cash'` ← **mismatch — Bug 1** |
| `'vnpay'` | `'VNPay'` | `'vnpay'` ✅ |
| `'momo'` | `'MoMo'` | `'momo'` ✅ |
| `'zalopay'` | `'ZaloPay'` | `'zalopay'` ✅ |

### §4 — WsMsg (local interface)

Defined `page.tsx:25-28`. Shape: `{ type: string; order_id: string }`.

The relevant event: `type === 'payment_success'`, `order_id === orderId`.
Published by BE `completePayment` to channel `orders:kds` (`payment_service.go:270-271`).

### §5 — Flags / Known Mismatches

> Full bug analysis with code citations → [PAYMENT_BUGS.md](PAYMENT_BUGS.md).
> These flags explain WHY the screen behaves as it does today, not what was intended.

| # | Flag | Impact today | Fix side |
|---|---|---|---|
| **Bug 1** | FE sends `method:'cod'`; BE `oneof` requires `'cash'` (`payment_handler.go:25`; `page.tsx:14,52`) | Cash payment always → 400 → toast "Không thể tạo thanh toán". Default method is `'cod'` so the page fails on first click for most cashiers. | FE — change type + default + `METHOD_LABELS` key to `'cash'` |
| **Bug 2** | `POST /payments` returns only `{id, pay_url, qr_code_url}` (`payment_handler.go:44-48`); FE `Payment` interface expects `status`/`amount`/`method`. After create: `setPayment(data)` stores a thin object. `payment.status === undefined` → QR block render (`page.tsx:249`) never true; WS `useEffect` returns early (`page.tsx:64`); cash success branch (`page.tsx:116`) never true. **Screen goes blank after create — nothing replaces the picker for any method.** | All gateway payments: blank screen (no QR, no WS, no print, no redirect). Cash: even if Bug 1 were fixed, no toast/print/redirect. | BE preferred — widen `POST /payments` response to include `status`/`amount`/`method`. FE alternative: `GET /payments/:id` after create (`main.go:257`). |
| **Bug 3** | `PATCH /payments/:id/proof` does not exist — no route, handler, service, column, or migration (`main.go:254-262`; grep `proof` → 0 non-test hits). FE `uploadProof` (`page.tsx:125-135`) → 404. Also currently unreachable (inside QR block, dead via Bug 2). | Upload always fails. Low priority — gated behind Bug 2. | BE (build the route) or FE (remove the UI until scheduled). |
| **Flag 4** | `payment_success` is published to `orders:kds` (shared KDS/POS/admin channel, `payment_service.go:271`). A channel/message-shape change breaks KDS, POS and admin floor pages. | No current breakage but a deployment coupling risk. | Architecture decision for owner. |
| **Flag 5** | WS `/ws/orders-live` has no role gate — `?token=` is validated then discarded (`websocket/handler.go:31-47`); any valid JWT (incl. customer guest) can subscribe. Shared gap across KDS/POS/admin pages. | Security gap, not a UX bug today. | BE — add role check after JWT parse. |
| **Flag 6** | `completePayment` for a `ready` (not yet `delivered`) order: `MarkOrderPaid` only advances `delivered → paid`; for `ready` it returns an error that `completePayment` swallows (`payment_service.go:265-267`). Payment row = `completed`, order status = `ready` → drift. | Silent data inconsistency. | BE. |
| **Flag 7** | `GET /orders/:id` 404 → FE stays on "Đang tải…" spinner forever. Guard is `isLoading || !order` (`page.tsx:137`); no error state rendered. | UX dead end for invalid order IDs. | FE — add error branch. |
| **Flag 8** | Gateway `pay_url`/`qr_code_url` can be silently empty if creds/`WEBHOOK_BASE_URL` unset (`payment_service.go:108-110,122,133`). FE `<img src="">` would render broken. Independent of Bug 2. | Broken QR image when gateway setup incomplete. | BE — return error when URL build fails. |
