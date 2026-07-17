# Scenario — Cashier Bills a Table (Cash + Gateway Paths, With Current Bug Reality)

> **TL;DR:** ✅ implemented (FE code exists, BE endpoints exist) — **but all payment paths are
> broken on branch `experience_claude.md_system_1`** due to three code bugs. This scenario narrates
> both the **intended** flow and the **actual** behaviour, beat by beat.
>
> **Status:** `experience_claude.md_system_1` (2026-06-18)
> **Source files traced:**
> [`fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx`](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx) ·
> [`be/internal/handler/payment_handler.go`](../../../../../be/internal/handler/payment_handler.go) ·
> [`be/internal/service/payment_service.go`](../../../../../be/internal/service/payment_service.go) ·
> [`be/internal/service/order_service.go`](../../../../../be/internal/service/order_service.go) ·
> [`be/internal/websocket/handler.go`](../../../../../be/internal/websocket/handler.go) ·
> [`be/cmd/server/main.go`](../../../../../be/cmd/server/main.go)
>
> Sibling files:
> [staff_cashier_payment.md](staff_cashier_payment.md) ·
> [staff_cashier_payment_be.md](staff_cashier_payment_be.md) ·
> [staff_cashier_payment_crosspage_dataflow.md](staff_cashier_payment_crosspage_dataflow.md) ·
> [PAYMENT_BUGS.md](PAYMENT_BUGS.md)
>
> Upstream POS context (how the cashier arrives here) →
> [../staff_pos/SCENARIO_POS_ORDER.md](../staff_pos/SCENARIO_POS_ORDER.md)
>
> Loading states → `staff_cashier_payment_loading.md` (not yet generated — ❓ UNVERIFIED sibling)

---

## The Cast

| Who | Username | Role | Job this beat |
|---|---|---|---|
| **Phạm Thu Ngân** | `cashier1` | cashier | Settles the bill for Bàn 03 after the lunch rush |
| **Customer at Bàn 03** | — | guest (no login) | Finished eating; ready to pay |
| **BE server** | — | system | Validates order status, creates payment, publishes event |
| **Payment gateway** | — | external (MoMo sandbox) | Issues QR code, fires webhook on scan |

---

## The Setting

The lunch rush is winding down. **Bàn 03** ordered `ORD-20260618-016`: 2× Suất Đầy Đủ Trứng Tái
(₫60,000 total). The chef has served all dishes and the KDS pushed the order to `ready`. The
customer waves for the bill.

Phạm Thu Ngân is at the POS screen (`/pos`). She taps the order card for Bàn 03 → the POS
navigates her to `/cashier/payment/<orderId>`. That upstream navigation is told in full in
[../staff_pos/SCENARIO_POS_ORDER.md](../staff_pos/SCENARIO_POS_ORDER.md); this scenario picks up
the moment the payment page mounts.

---

## Timeline — Beat by Beat

### T+0:00 — Payment page mounts

**What the cashier sees:**
The browser navigates to `/cashier/payment/<orderId>`. The page is wrapped in `AuthGuard` +
`RoleGuard minRole=CASHIER` (`page.tsx:39-43`). Ngân is logged in as a cashier, so both guards pass
and `PaymentContent` mounts.

**Under the hood — receipt fetch:**
`useQuery<Order>` fires `GET /orders/<orderId>` via `api.get(...)` (`page.tsx:56-59`). While the
query is in flight, the guard `isLoading || !order` (`page.tsx:137`) renders:
```
Đang tải...
```
centered on a full-screen background. No skeleton, no receipt card yet.

→ See cross-page data flow zoom: [staff_cashier_payment_crosspage_dataflow.md §2](staff_cashier_payment_crosspage_dataflow.md#2-the-moment-of-handoff--what-this-page-leaves-behind)

---

### T+0:01 — Receipt card renders

**`GET /orders/:id` returns.** Handler `orderH.Get` (`order_handler.go:125-137`) reads cashier
claims from context, sets `callerRole = "cashier"`, passes to `svc.GetOrder`. The ownership guard
is skipped for non-customer roles (`order_service.go:116-120`), so Ngân can read any order. The
service runs `GetOrderByID` + `GetOrderItemsByOrderID` and returns a full `Order`.

**What the cashier sees (State A):**
```
← Quay lại   Thanh Toán Đơn #ORD-20260618-016   (no-print header)

┌─────────────────────────────────────────┐
│            Bánh Cuốn                    │
│        Hoá đơn thanh toán               │
│  Đơn #    ORD-20260618-016              │
│  Bàn      Bàn 03                        │
│  ─────────────────────────────────────  │
│  2× Suất Đầy Đủ Trứng Tái   60.000đ   │
│  ─────────────────────────────────────  │
│  Tổng cộng                  60.000đ    │
│        Cảm ơn quý khách!               │
└─────────────────────────────────────────┘

Phương thức thanh toán
  [Tiền mặt ✓]   [VNPay]
  [MoMo]         [ZaloPay]

[ Xác nhận COD ]
```

**Key data bindings (all traced to `page.tsx`):**
- `order.order_number` → `#ORD-20260618-016` (`page.tsx:160,175`)
- `order.table_id` → `Bàn 03` (rendered because truthy, `page.tsx:177-181`)
- `order.items[]` → each row: `{quantity}× {name}  {formatVND(unit_price × quantity)}` (`page.tsx:192-198`)
- `order.total_amount` → `60.000đ` (`page.tsx:201`)
- Default method: `useState<PaymentMethod>('cod')` (`page.tsx:52`) — button label "Xác nhận COD"
- `payment` state: `null` → method-picker block shown (`page.tsx:216`)

The receipt card carries **no `.no-print` class** — it will appear in print (`page.tsx:166`).
The header, method picker, and button are `.no-print` (`page.tsx:152,217`).

---

### T+0:10 — Ngân picks "Tiền mặt" (Cash) and taps "Xác nhận COD"

The customer says they'll pay cash. "Tiền mặt" is already selected (it's the default). Ngân taps
the button.

**What the cashier sees:**
Button text switches to "Đang xử lý..." and is disabled (`createPayment.isPending === true`,
`page.tsx:239-246`).

**The mutation fires:**
```typescript
// page.tsx:110-113
api.post('/payments', { order_id: orderId, method: selectedMethod })
// → { order_id: "<uuid>", method: "cod" }
```

**INTENDED behaviour (if Bug 1 were fixed):**
The BE handler `paymentH.Create` (`payment_handler.go:29-49`) binds `createPaymentReq`; the
`method` binding is `required,oneof=vnpay momo zalopay cash`. The service `CreatePayment` runs:
1. `GetOrderForPayment` confirms the order is `ready` or `delivered`
   (`order_service.go:50` — ❓ UNVERIFIED: exact line; service call at `payment_service.go:68`).
2. Idempotency check: `GetPaymentByOrderID` — no existing non-`failed` payment → proceed.
3. `repo.CreatePayment` — snapshots `amount = order.TotalAmount` server-side (₫60,000). Cash gets
   no `expires_at`.
4. `completePayment` runs immediately for `cash`: sets `payments.status = completed`, `paid_at`,
   calls `MarkOrderPaid` (`delivered → paid`), publishes
   `{"type":"payment_success","order_id":"<uuid>"}` to Redis channel `orders:kds`
   (`payment_service.go:270-271`).
5. Handler responds `{data:{id, pay_url:"", qr_code_url:null}}` (`payment_handler.go:44-48`).

**ACTUAL behaviour (Bug 1 — `cod` vs `cash`):**
The BE binding `oneof=vnpay momo zalopay cash` (`payment_handler.go:25`) does not include `cod`.
`ShouldBindJSON` fails → `400 INVALID_INPUT` (`payment_handler.go:31-34`). The `onError` callback
fires → `toast.error('Không thể tạo thanh toán')` (`page.tsx:122`).

```
Result: toast "Không thể tạo thanh toán" flashes. Button reverts to "Xác nhận COD".
        The payment page remains in State A. No payment created.
```

→ Full bug analysis: [PAYMENT_BUGS.md §Bug 1](PAYMENT_BUGS.md#bug-1--cash-button-sends-cod-backend-only-accepts-cash)

---

### T+0:10 (alternate path) — Ngân tries MoMo gateway instead

Seeing the cash failure, Ngân taps "MoMo" in the method picker (`page.tsx:225-230`; `method` state
updates to `'momo'`). Button label changes to "Tạo QR MoMo" (`page.tsx:246`). She taps it.

**Mutation fires:**
```typescript
api.post('/payments', { order_id: orderId, method: 'momo' })
```

**`'momo'` is in the BE `oneof` list** — binding succeeds. The service creates a `payments` row
(`status: pending`, `expires_at: now+15min`), calls the MoMo gateway, builds a `pay_url` and
`qr_code_url`. Handler responds:
```json
{ "data": { "id": "<paymentUUID>", "pay_url": "https://pay.momo.vn/…", "qr_code_url": "https://…/qr.png" } }
```

**`onSuccess` fires** (`page.tsx:114-123`):
```typescript
setPayment(data)  // data = { id, pay_url, qr_code_url }  — NO status, amount, method
if (data.status === 'completed') { … }   // undefined !== 'completed' → branch skipped
```

**INTENDED behaviour (if Bug 2 were fixed):**
`setPayment` stores a full `Payment` with `status: 'pending'`, `amount: 60000`, `method: 'momo'`.
The QR-pending block renders (`page.tsx:249` — `payment.status === 'pending' && payment.qr_code_url` is true):
- A 224×224 QR image (`<img src={payment.qr_code_url}>`).
- Text "⏳ Đang chờ thanh toán..."
- The proof-upload `<input type="file">`.

Simultaneously, the WS `useEffect` (`page.tsx:63-108`) reacts to the new `payment` state:
`payment.status === 'pending'` → the guard passes → a `WebSocket` connects to
`<NEXT_PUBLIC_API_URL>/ws/orders-live?token=<accessToken>` and subscribes to the `orders:kds`
Redis channel (`websocket/handler.go:22-23`).

**ACTUAL behaviour (Bug 2 — thin create response):**
The stored `payment` is `{ id, pay_url, qr_code_url }`. `payment.status === undefined`.

- QR block: `payment.status === 'pending' && payment.qr_code_url` → `undefined === 'pending'` is
  `false` → **block never renders** (`page.tsx:249`).
- WS effect: dependency array `[token, payment, orderId, router]` fires; first line:
  `if (!token || !payment || payment.status !== 'pending') return` — `undefined !== 'pending'`
  → **early return; WS never opens** (`page.tsx:64`).

```
Result: the method picker and "Tạo QR MoMo" button disappear (payment !== null, so the
        !payment block at page.tsx:216 no longer renders). Nothing replaces them.
        Screen shows only the receipt card. No QR, no "Đang chờ…", no WS listener.
        The cashier is stuck: no way to know if the customer paid, no print, no redirect.
```

→ Full bug analysis: [PAYMENT_BUGS.md §Bug 2](PAYMENT_BUGS.md#bug-2--create-payment-response-omits-statusamountmethod-screen-goes-blank)

---

### T+0:10 (alternate — INTENDED gateway success, both bugs fixed)

*This beat describes the intended flow; it does not execute on the current branch.*

The QR is shown. Ngân turns the screen toward the customer. The customer opens the MoMo app and
scans. MoMo fires a webhook to `POST /api/v1/payments/webhook/momo`. The BE handler
`processWebhookResult` validates the signature and calls `completePayment`:
1. `UpdatePaymentStatus` → `payments.status = completed`, `paid_at = now`.
2. `MarkOrderPaid` → `orders.status = paid` (if order was `delivered`; see Flag 6 for the `ready`
   drift case in `payment_service.go:265-267`).
3. `rdb.Publish("orders:kds", {"type":"payment_success","order_id":"<uuid>"})` (`payment_service.go:270-271`).

The cashier's open WS (`/ws/orders-live?token=`) receives the message. FE handler:
```typescript
// page.tsx:88-92
if (msg.type === 'payment_success' && msg.order_id === orderId) {
  toast.success(`Thanh toán thành công: ${formatVND(paidAmount)}`)   // paidAmount captured in closure
  window.print()
  router.push('/pos')
}
```
`window.print()` triggers the browser print dialog. The `@media print` rule hides every `.no-print`
element (`page.tsx:148`) — header, method picker, button, QR block — leaving only the receipt card.
After print, `router.push('/pos')` unmounts the page and all component memory is gone.

→ Cross-page: [staff_cashier_payment_crosspage_dataflow.md §3](staff_cashier_payment_crosspage_dataflow.md#3-this-cashier-screen--receiving-the-handoff-it-just-created)
→ Multi-device fan-out: [staff_cashier_payment_crosspage_dataflow.md §7](staff_cashier_payment_crosspage_dataflow.md#7-multi-device-sync--one-payment-n-screens)

---

### T+0:11 — Proof upload (INTENDED, gateway path)

*Also unreachable today — inside the QR block that never renders (Bug 2), AND the route does not
exist (Bug 3).*

In the intended flow, while waiting for the customer to scan, Ngân could photograph the screen for
audit. The file input fires `uploadProof.mutate(file)`:
```typescript
// page.tsx:125-135
api.patch(`/payments/${payment?.id}/proof`, form, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
```
**ACTUAL behaviour:** `PATCH /payments/:id/proof` returns Gin's default 404 (plain text). Toast
"Upload thất bại" fires. The route, handler, service, query, and any `proof_image_path` DB column
are absent from `be/` (grep `proof` → 0 non-test hits, `be/cmd/server/main.go:254-262`).

→ [PAYMENT_BUGS.md §Bug 3](PAYMENT_BUGS.md#bug-3--patch-paymentsidproof-route-does-not-exist)

---

### T+0:12 — POS receives payment_success (passive, gateway path — INTENDED)

The `payment_success` event is published to `orders:kds`. Every `/ws/orders-live` subscriber
receives it. The cashier's own page acts on it (toast + print + `/pos`). Any other open `/pos` tab
**receives the event but has no handler for `payment_success`** and silently discards it
(❓ UNVERIFIED: no `/pos` WS `payment_success` branch traced — see
[staff_cashier_payment_crosspage_dataflow.md §4](staff_cashier_payment_crosspage_dataflow.md#4-pos--the-upstream-page-where-the-cashier-came-from)).

The order's removal from the admin live floor is driven by a **separate** `order_status_changed`
event when `MarkOrderPaid` succeeds and `orders.status` flips to `paid` (not by `payment_success`
itself — see [staff_cashier_payment_crosspage_dataflow.md §5](staff_cashier_payment_crosspage_dataflow.md#5-kds-kds-and-admin-floor-adminoverview--passive-receivers)).

---

### T+0:12 — /pos re-mounts (INTENDED, either path)

After `router.push('/pos')`:
- All component state from this page (`payment`, `method`, TanStack `['order', orderId]`) dies.
- The POS screen re-mounts and should reflect the paid order. Whether it invalidates
  `['order', orderId]` on mount is ❓ UNVERIFIED (no `/pos` query-invalidation code traced for this
  path — see [staff_cashier_payment_crosspage_dataflow.md §4](staff_cashier_payment_crosspage_dataflow.md#4-pos--the-upstream-page-where-the-cashier-came-from)).
- Bàn 03 is now `available` (table status flipped by `MarkOrderPaid` → order `paid`, table freed).

---

## Under the Hood — Six Lenses

### A. Cross-component data flow (this one page)

This page has **no Zustand store** — all state is local to `PaymentContent`:

```
                useQuery ['order', orderId]
                    │
                    ▼
               order (TanStack, memory)
                    │
             ┌──────┴────────────┐
             ▼                   ▼
       Receipt card         method picker
       (read-only)          (useState 'cod')
                                 │
                                 ▼
                       createPayment mutation
                                 │
                                 ▼
                          payment (useState)
                          ┌──────┴─────────────────────────┐
                          ▼                                 ▼
                    QR block                       WS useEffect
                    (payment.status==='pending'    (payment.status==='pending'
                     && qr_code_url)               → opens WebSocket)
                    ⚠️ DEAD (Bug 2)               ⚠️ DEAD (Bug 2)
```

No props pass between zones. No shared store is written. The only inter-zone communication is
through two `useState` values: `order` (from TanStack) and `payment` (from mutation response).
Both are memory-only; neither is persisted.

> Full zoom: `staff_cashier_payment_crosscomponent_dataflow.md` (not yet generated —
> ❓ UNVERIFIED sibling; the page qualifies — §1 table in PAGE_FOLDER_GUIDE §1 — but the file does
> not exist in the folder as of 2026-06-18).

### B. Cross-page data flow

This page produces two durable writes and one ephemeral event, then redirects:

| Write | Durable? | Who reads it later |
|---|---|---|
| `payments` row (`status:completed`, `paid_at`, `amount`) | ✅ MySQL | Admin analytics, `GET /payments/:id` |
| `orders.status = paid` | ✅ MySQL | Admin overview paid log, analytics, any `GET /orders/:id` |
| Redis `payment_success` event on `orders:kds` | ❌ ephemeral pub/sub | This cashier's WS listener (acts); KDS / POS / admin floor WS (receive, ignore) |

All in-browser state (TanStack cache, `useState`) dies on `router.push('/pos')`. The URL `orderId`
is the only cross-page identifier. The POS knew this id before navigating here; after return it
can re-fetch if it needs fresh data.

> Full diagram + durability matrix: [staff_cashier_payment_crosspage_dataflow.md §11](staff_cashier_payment_crosspage_dataflow.md#11-durability-matrix--what-survives-what)

### C. FE → BE sends

| What | Shape | Bug |
|---|---|---|
| `GET /orders/:id` | no body; auth from `Authorization: Bearer` (axios interceptor, `api-client.ts`) | — |
| `POST /payments` | `{ order_id: string, method: PaymentMethod }` (`page.tsx:112`) | Bug 1: `method:'cod'` rejected by BE `oneof=…cash` |
| `PATCH /payments/:id/proof` | `FormData {image: File}` multipart (`page.tsx:129-131`) | Bug 3: route does not exist → 404 |
| WS `/ws/orders-live?token=` | no body; auth via `?token=` query param (`page.tsx:70-71`) | Bug 2 prevents the socket from ever opening |

All HTTP calls go through `api` (the shared Axios instance at `fe/src/lib/api-client.ts`). The WS
is a raw `new WebSocket(url)` — it cannot use the Axios instance (WS is not HTTP).

The BE endpoint list that actually exists vs. what the FE calls:
```
POST /api/v1/payments             ← exists (main.go:256)
GET  /api/v1/payments/:id         ← exists (main.go:257) — not called by this page
PATCH /api/v1/payments/:id/proof  ← DOES NOT EXIST (Bug 3)
GET  /api/v1/ws/orders-live       ← exists (main.go:339) — blocked by Bug 2
```

### D. BE → FE receives / live updates

| What | Transport | FE handler | Real today? |
|---|---|---|---|
| `Order` receipt data | HTTP JSON `GET /orders/:id` → TanStack | `page.tsx:56-60` — `useQuery` → `order` state | ✅ works |
| Create payment response | HTTP JSON `POST /payments` → `onSuccess(data)` | `page.tsx:114` — `setPayment(data)` | ⚠️ partial: id/pay_url/qr_code_url arrive; status/amount/method absent (Bug 2) |
| `payment_success` WS event | `ws://…/ws/orders-live` → `ws.onmessage` | `page.tsx:84-92` — toast + print + redirect | ❌ WS never opens (Bug 2) |

**Reconnect strategy** (intended, for gateway path):
```
ws.onclose → if (!stopped) attempts++; setTimeout(connect, min(1000 × 2^attempts, 30000))
// page.tsx:95-98 — capped at 30s
```
Five-attempt cap is **❓ UNVERIFIED** (the code has no explicit attempt limit; `attempts` increments
indefinitely; the 30 s cap is real but there is no stop-after-N logic in `page.tsx:78-100`).

### E. Loading + caching

| State | What renders | Source |
|---|---|---|
| `isLoading === true` (pre-receipt) | Full-screen "Đang tải…" (no skeleton) | `page.tsx:137-143` |
| `!order` after error | Same "Đang tải…" forever (no error branch) | `page.tsx:137` — **Flag 7** in `staff_cashier_payment_be.md` |
| `createPayment.isPending` | Button disabled, text "Đang xử lý…" | `page.tsx:239` |
| `uploadProof.isPending` | Inline text "Đang upload…" | `page.tsx:275-277` |

No Redis read-cache on any endpoint this page uses (`staff_cashier_payment_be.md §Caching`).
TanStack `['order', orderId]` default `staleTime` (60 s) — no custom override in `useQuery`
(`page.tsx:56-60`). No `loading.tsx` route segment exists for this folder (❓ UNVERIFIED:
`find fe/src/app/(dashboard)/cashier/payment -name loading.tsx` — not checked).

> Cross-reference: `staff_cashier_payment_loading.md` (not yet generated —
> ❓ UNVERIFIED sibling).

### F. Monitoring

The `POST /payments` call and the WS upgrade are both visible in the monitoring stack
(`docker-compose.yml` → Prometheus `:9090` + Grafana `:3001`):

- **Request Rate panel:** the `POST /payments` burst from each cashier landing (one per table
  paying) is a single short spike — low volume, high business value.
- **5xx Error Rate:** a gateway credentialing failure (`payment_service.go:108-110,122,133`
  silently logs but doesn't 5xx the create call — the 400 from Bug 1 shows as 4xx, below the
  `HighErrorRate` alert threshold of 5%).
- **Bug 1 signature in logs:** repeated `400` on `POST /payments` from cashier sessions →
  `docker compose logs -f be | grep "INVALID_INPUT"`.
- **Bug 2 signature:** WS connections from cashier IPs are absent from logs even during active
  payment sessions (the socket never opens) → `docker compose logs -f be | grep "ws/orders-live"`.

> Monitoring config: [`monitoring/`](../../../../../monitoring/) ·
> Rule home: [../../09_devops/MONITORING.md](../../09_devops/MONITORING.md).

---

## Putting It All on One Timeline

```
T+0:00  cashier navigates from /pos → /cashier/payment/<orderId>
         AuthGuard + RoleGuard(CASHIER) pass  (page.tsx:39-43)
         useQuery fires GET /orders/:id        (page.tsx:56-59)
         → "Đang tải…"

T+0:01  GET /orders/:id returns Order
         receipt card renders; method='cod' default; payment=null
         → State A (picker + button visible)

T+0:10  cashier taps "Xác nhận COD"
         POST /payments { order_id, method: 'cod' }   ← Bug 1 method value
         → BE: binding fails, 400 INVALID_INPUT
         → onError: toast "Không thể tạo thanh toán"
         → stays in State A  (DEAD END for cash on this branch)

T+0:12  cashier switches to MoMo, taps "Tạo QR MoMo"
         POST /payments { order_id, method: 'momo' }  ← 'momo' accepted
         → BE: payments row created (status:pending), MoMo QR built
         → response: { id, pay_url, qr_code_url }     ← Bug 2: no status/amount/method
         → setPayment({ id, pay_url, qr_code_url })
         → data.status === 'completed' → false → skip cash-complete branch
         → picker block (!payment) gone; QR block (status==='pending') never renders
         → WS useEffect: payment.status !== 'pending' → early return, socket never opens
         → BLANK SCREEN (only receipt card remains)  (DEAD END for gateway on this branch)

--- (INTENDED path, bugs fixed) ---

T+0:12  (intended) QR renders; WS opens to /ws/orders-live?token=
T+0:45  customer scans MoMo QR; gateway fires webhook POST /payments/webhook/momo
         BE: processWebhookResult → completePayment
           UpdatePaymentStatus → completed; paid_at = now   (payment_service.go:254-260)
           MarkOrderPaid → orders.status = paid              (order_service.go:86)
           rdb.Publish("orders:kds", {"type":"payment_success","order_id":"<id>"})  (:270-271)
T+0:45  WS onmessage: type==='payment_success' && order_id matches
           toast.success("Thanh toán thành công: 60.000đ")  (page.tsx:89)
           window.print()                                    (page.tsx:90)
           router.push('/pos')                               (page.tsx:91)
T+0:46  /pos mounts; all cashier payment page state gone
         Bàn 03: available   (order paid, table freed)
         orders:kds subscribers: KDS, POS, admin floor each receive payment_success → ignore
         admin floor drops Bàn 03 card on next order_status_changed event (status→paid)
```

---

## Flags Surfaced by This Scenario

| # | Flag | Where it bites | Fix side |
|---|---|---|---|
| **Bug 1** | FE sends `method:'cod'`; BE binding requires `'cash'` (`payment_handler.go:25`; `page.tsx:14,52`) | Cash always 400s; default method is `'cod'` → first tap always fails | FE — one-line fix |
| **Bug 2** | `POST /payments` response omits `status`/`amount`/`method` (`payment_handler.go:44-48`) | All gateway payments: blank screen after create; WS never opens; no QR; no print; no redirect | BE preferred (widen response) or FE (re-fetch `GET /payments/:id` after create) |
| **Bug 3** | `PATCH /payments/:id/proof` route does not exist (`main.go:254-262`) | Upload always 404s; also unreachable today (inside dead QR block) | BE (build route) or FE (remove UI) |
| **Flag 4** | `payment_success` published to shared `orders:kds` channel | Message-shape change breaks KDS, POS, admin simultaneously (`payment_service.go:270-271`) | Architecture decision |
| **Flag 5** | WS `/ws/orders-live` has no role gate (`websocket/handler.go:31-47`) | Any valid JWT (incl. guest customer) can subscribe | BE — add role check after JWT parse |
| **Flag 6** | `MarkOrderPaid` only advances `delivered → paid`; swallows error for `ready` orders (`payment_service.go:265-267`) | Payment completes but `orders.status` stays `ready` — status drift | BE |
| **Flag 7** | `GET /orders/:id` error → `isLoading || !order` guard stays true forever; no error UI (`page.tsx:137`) | Dead-end spinner on invalid order IDs | FE |

> Full analysis with exact line citations → [PAYMENT_BUGS.md](PAYMENT_BUGS.md).
> These bugs are not yet registered in `docs/tasks/MASTER_TASK.md` as of 2026-06-18 (per
> PAYMENT_BUGS.md §Next Step).

---

## The One-Line Mental Model

> **This page is a write-and-close terminal:** it reads the order snapshot once, posts a payment,
> expects the BE to echo `payment_success` over WS (gateway) or return `status:completed`
> immediately (cash), then `window.print()` and leaves — but on this branch, cash 400s on the
> first click and gateway payments leave the screen blank, so **no method currently works**.
