# Cashier Payment — Cross-Page Data Flow (`/cashier/payment/:id`)

> **TL;DR:** ✅ implemented (with known bugs — see [PAYMENT_BUGS.md](PAYMENT_BUGS.md)).
> This page is a **write-and-close** surface: it posts a payment, then either redirects immediately
> (cash — intended) or waits for a WS `payment_success` event (gateway — intended), then
> `window.print()` → `/pos`. The one durable write is a `payments` row; on completion it calls
> `MarkOrderPaid` advancing the order `delivered → paid` and publishes `payment_success` to the
> `orders:kds` Redis channel.
>
> **⚠️ CRITICAL: the intended handoff is broken on the current branch.** Cash 400s (Bug 1); the WS
> listener never connects for gateway payments because the create response is thin (Bug 2). See
> [PAYMENT_BUGS.md](PAYMENT_BUGS.md) — bugs are not yet fixed as of branch
> `experience_claude.md_system_1`.
>
> Traced from source (never from docs):
> [`fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx`](../../../../../fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx) ·
> [`be/internal/service/payment_service.go`](../../../../../be/internal/service/payment_service.go) ·
> [`be/internal/service/order_service.go`](../../../../../be/internal/service/order_service.go) ·
> [`be/internal/websocket/handler.go`](../../../../../be/internal/websocket/handler.go) ·
> [`be/cmd/server/main.go`](../../../../../be/cmd/server/main.go).
>
> Sibling files:
> [staff_cashier_payment.md](staff_cashier_payment.md) ·
> [staff_cashier_payment_be.md](staff_cashier_payment_be.md) ·
> [PAYMENT_BUGS.md](PAYMENT_BUGS.md)

---

## 0. The whole picture on one diagram

```
   ┌─────────────────────── CASHIER BROWSER ─────────────────────────────────┐
   │                                                                           │
   │                 ┌──────────── in-browser hub ─────────────┐              │
   │                 │  TanStack ['order', orderId]  (memory)   │              │
   │                 │  payment  useState             (memory)   │              │
   │                 │  method   useState             (memory)   │              │
   │                 │  orderId  URL param (/cashier/payment/:id)│              │
   │                 └─────────────────────────────────────────-┘              │
   │                     ▲ GET /orders/:id          ▲ POST /payments           │
   │                     │                          │                          │
   │   /pos ◀── router.push ◀── window.print() ◀──WS payment_success          │
   │              (on success)                      │                          │
   └──────────────────────────────────────┬─────────────────────────────────-─┘
                                          │
   ═══════════════════════ THE WIRE — BE is the hub ══════════════════════════
                                          │
                         ┌────────────────▼────────────────┐
                         │   payments row (MySQL, durable)   │
                         │   orders row  (MySQL, durable)    │
                         │   status: delivered → paid        │
                         └───────┬─────────────────────┬────┘
                                 │  Redis publish       │
                                 │  "orders:kds"        │
              ┌──────────────────▼────────────┐         │
              │  payment_success event         │         │
              │  {type:"payment_success",      │         │
              │   order_id:<id>}               │         │
              └──┬──────────────┬──────────────┘         │
                 │              │                         │
                 ▼              ▼                         ▼
      /ws/kds clients    /ws/orders-live         admin/staff WS:
      (KDS, `:338`)      clients                 /sse/admin
      → receives,        (this cashier screen,   → NO new_order ping
      IGNORES            POS, admin floor)         (order already existed)
                         → /cashier/payment/:id:
                           payment_success
                           → print + /pos
                         → /pos, /kds, admin:
                           IGNORES payment_success
```

**Legend:**
```
──▶  navigation / HTTP           ◀── WS push (server → browser)
▓  localStorage (survives F5)   ░  memory (dies on F5, dies on navigate)
```

**Read it like this:** the cashier browser has no persistent local state — everything lives in
component memory (TanStack cache, two `useState` values, the URL id). The single output is a
`payments` row in MySQL. Completion fires `MarkOrderPaid` (order row flip) and publishes one Redis
event that fans to every WS subscriber on `orders:kds`. Only this screen acts on it; KDS, POS, and
admin floor receive and silently discard it.

---

## 1. The status lifecycle every page renders against

The order status state machine is the shared backbone. This page's gate (`ready OR delivered`) and
output (`paid`) are two positions in that machine.

> Full machine and per-status table: [../../02_spec/BUSINESS_RULES.md §4](../../02_spec/BUSINESS_RULES.md#4-payment-rules).
> Order object model (all fields): [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md).

```
   pending → confirmed → preparing → ready → delivered → paid
                                       ↑
                              cashier/payment/:id can be
                              opened here (GetOrderForPayment
                              gate: ready OR delivered)
                              order_service.go:50
```

| Status | Who sets it | This page's role | Admin floor sees it? |
|---|---|---|---|
| `ready` | KDS | Allowed as payment trigger (gate passes) | ✅ — in active floor |
| `delivered` | Staff (POS/overview confirm) | Preferred trigger (MarkOrderPaid succeeds here) | ✅ — in active floor |
| `paid` | `MarkOrderPaid` on completePayment | **This page sets it** (if order was `delivered`) | ❌ — dropped from live; appears in analytics/paid log |

> **Flag 6 (status drift):** if the order is `ready` (not yet `delivered`) when payment completes,
> `MarkOrderPaid` returns an error because it only advances `delivered → paid`
> (`order_service.go:83-86`). `completePayment` swallows that error with a warn-log
> (`payment_service.go:265-267`). Result: the `payments` row is `completed`, but `orders.status`
> stays `ready` — **status drift**. Traced from `be/internal/service/order_service.go:75-87` and
> `be/internal/service/payment_service.go:252-273`. No fix on this branch.

---

## 2. The moment of handoff — what this page leaves behind

This page makes exactly two durable writes, then leaves.

```
   Cashier taps "Xác nhận COD" (or "Tạo QR …")
        │
        ▼
   POST /payments { order_id, method }   ──────────────────────────────▶  BE
        │                                                                   │
        │  (cash — intended, broken by Bug 1)                               │
        │  completePayment():                                               │
        │    ① UpdatePaymentStatus → completed (payments row)              │
        │    ② MarkOrderPaid       → orders.status = paid                 │
        │    ③ rdb.Publish("orders:kds", {"type":"payment_success",…})    │
        │                                                                   │
        │  (gateway)                                                        │
        │    ① CreatePayment → payments row (status: pending)              │
        │    on webhook call → completePayment → ①②③ above                │
        │                                                                   │
        ▼                                                                   │
   setPayment(data)  ░ component memory, not persisted                      │
        │                                                                   │
   (intended success path, currently blocked — Bug 2)                       │
   WS message payment_success ◀──────────── Redis publish ◀─────────────────┘
        │
        ▼
   window.print() → router.push('/pos')
   ░ All page state (payment, method, TanStack cache) dies on navigate.
```

| Write | Where it lands | Who reads it later | Source |
|---|---|---|---|
| `payments` row (`status: completed`, `paid_at`) | MySQL (durable) | Admin analytics, `GET /payments/:id` | `payment_service.go:254-260` |
| `orders.status = paid` | MySQL (durable) | Admin overview paid log, analytics; any `GET /orders/:id` | `order_service.go:86` |
| Redis `payment_success` event | `orders:kds` channel (ephemeral) | `/ws/orders-live` subscribers (this page, KDS, POS, admin floor) — only this page acts on it | `payment_service.go:270-271` |

After `router.push('/pos')` no in-browser state from this page survives. The only lasting artefacts
are the two MySQL rows.

---

## 3. This cashier screen — receiving the handoff it just created

The page opens a WS to `/ws/orders-live?token=` immediately after `setPayment(data)` if
`payment.status === 'pending'` (`page.tsx:64`). It listens for exactly one event type:

```typescript
// page.tsx:88-92
if (msg.type === 'payment_success' && msg.order_id === orderId) {
  toast.success(`Thanh toán thành công: ${formatVND(paidAmount)}`)
  window.print()
  router.push('/pos')
}
```

WS connection detail:
- URL: `<NEXT_PUBLIC_API_URL>/ws/orders-live?token=<accessToken>` (`page.tsx:68-71`)
- Auth: `?token=` query param; JWT parsed then claims **discarded** in handler
  (`websocket/handler.go:40-47`) — **no role gate**
- Backoff: exponential, `min(1000 × 2^attempts, 30_000)` ms (`page.tsx:98`)
- Cleanup: `stopped=true`, socket closed on effect teardown (`page.tsx:103-107`)
- Channel subscribed: `orders:kds` (`websocket/handler.go:23`)

> **This path is dead on the current branch (Bug 2).** The `payment` object stored in state has
> `status === undefined` (the create response is thin: `{id, pay_url, qr_code_url}` only —
> `payment_handler.go:44-48`). The guard `payment.status !== 'pending'` is `true`, so the effect
> returns early and the WS **never connects**. See [PAYMENT_BUGS.md](PAYMENT_BUGS.md) Bug 2.

---

## 4. `/pos` — the upstream page (where the cashier came from)

`/pos` navigates the cashier to `/cashier/payment/:id` by pushing the order id into the URL. After
payment completes, this page receives `router.push('/pos')` (`page.tsx:91, 119`).

```
   /pos
    ├── selects an order for billing
    │   router.push('/cashier/payment/<orderId>')
    │
    └── receives cashier back after print
        (full re-mount; TanStack query invalidation needed here —
         ❓ UNVERIFIED: /pos does not invalidate ['order', orderId] after redirect)
```

The `payment_success` event also reaches every other `/ws/orders-live` subscriber including any
open `/pos` tab — but `/pos` has no handler for `payment_success`
(❓ UNVERIFIED: no `/pos` WS message handler code traced; it likely connects via the shared
`useOverviewWS` hook which handles `order_status_changed`/`item_progress` but not
`payment_success`).

---

## 5. KDS (`/kds`) and admin floor (`/admin/overview`) — passive receivers

Both KDS and admin floor connect to `orders:kds` via WS (`/ws/kds` and `/ws/orders-live`
respectively — `main.go:338-339`; `websocket/handler.go:17-24`). Both subscribe the same channel.

```
   payment_success published to "orders:kds"
        │
        ├──▶ /ws/kds  (KDS clients)
        │     wsHandler subscribes "orders:kds" (handler.go:18)
        │     → message forwarded to KDS browser
        │     → KDS has NO handler for payment_success  ❓ UNVERIFIED
        │       (order disappears because status becomes paid,
        │        which is likely not in the KDS active filter)
        │
        └──▶ /ws/orders-live  (cashier, POS, admin floor)
              wsHandler subscribes "orders:kds" (handler.go:23)
              → message forwarded to all connected clients
              → admin floor useOverviewWS: no payment_success branch
                ❓ UNVERIFIED: flag — order removal from live floor is
                driven by order_status_changed (status→paid), NOT by
                payment_success directly
```

The order's disappearance from the admin live floor is driven by the `orders.status` flip to
`paid` — which fires a separate `order_status_changed` event from `UpdateOrderStatus` when
`MarkOrderPaid` succeeds. `payment_success` itself is not what removes the card.

> **Flag 4 (shared channel):** `payment_success` is published to `orders:kds`, the same channel
> KDS and admin consume for all order lifecycle events. A change to the event shape or channel name
> breaks all four surfaces simultaneously. Noted in
> [staff_cashier_payment_be.md](staff_cashier_payment_be.md) Flag 4.

---

## 6. Admin overview — paid log and analytics

Once `orders.status = paid` the order leaves the admin live floor's active set and surfaces in:

- **Paid log / Zone D:** admin overview filters for `status = paid` in its paid orders section
  (❓ UNVERIFIED: exact component + query key not traced here — see admin overview page docs)
- **Analytics (`/admin/summary`):** `GET /admin/summary` aggregates revenue including `paid`
  orders. The `payments` row's `amount` and `paid_at` feed revenue charts.

```
   orders.status = paid  (set by MarkOrderPaid, order_service.go:86)
        │
        ├── leaves ['orders','live'] active set on admin floor
        │   (active set = {pending, confirmed, preparing, ready, delivered})
        │
        └── appears in analytics endpoints:
            GET /admin/summary     → total revenue
            GET /admin/top-dishes  → dish sales counts
```

No in-browser state is shared between the cashier and admin browsers. The admin reads the updated
order row via its own REST queries or WS cache patches.

---

## 7. Multi-device sync — one payment, N screens

```
   Cashier browser                    BE / Redis                  Other clients
   ───────────────                    ──────────                  ─────────────
   POST /payments ──────────────────▶ payments row created
   (cash: completePayment             │
    runs synchronously)               ├── MarkOrderPaid ──────────────────────▶ (next poll/refetch)
                                      │   orders.status = paid
                                      │
                                      ├── payment_success ──────────────────────▶ /ws/kds clients
                                      │   published to "orders:kds"                (ignored)
                                      │   payment_service.go:270-271
                                      │                           ──────────────▶ /ws/orders-live
                                      │                                            → cashier: print+/pos
                                      │                                            → others: ignored
                                      │
                                      └── (if MarkOrderPaid succeeds)
                                          order_status_changed
                                          published to orders:kds
                                          → admin floor drops card
                                            from live set
```

```
   INVARIANT: no arrow goes browser → browser.
              All cross-device updates go device → BE → (Redis) → device.
              The BE rows (payments + orders) are the single source.
```

---

## 8. Cancellation / reverse flows

This page has no cancel flow of its own. The relevant reverse cases are:

| Scenario | Initiator | Endpoint | Effect on payment |
|---|---|---|---|
| Order cancelled **before** cashier opens this page | Staff or guest | `DELETE /orders/:id` or `PATCH /orders/:id/status {status:cancelled}` | `GetOrderForPayment` returns `ErrOrderNotReady` (status `cancelled` ≠ `ready`/`delivered`) → 409; cashier cannot pay it |
| Payment gateway timeout | Background job (`jobs.StartPaymentTimeoutWatcher`) | marks `payments.status = failed` | Idempotency check in `CreatePayment` allows retry (only rejects if existing non-`failed`) |
| Webhook reports failure | Gateway IPN → `processWebhookResult` | `UpdatePaymentStatus` → `failed` | No order status change; cashier can re-create payment |

No refund or payment reversal path exists on this branch (❓ UNVERIFIED: no reverse payment
handler found in `be/internal/handler/` grep).

---

## 9. End-to-end timeline — the payment across all pages and devices

```
   Cashier at /cashier/payment/:id        BE / Redis           Admin floor    KDS
   ─────────────────────────────────      ──────────           ───────────    ───
   │  page mounts                         │                    │              │
   │  GET /orders/:id ─────────────────▶  snapshot            │              │
   │  ◀── order{items, total, status}     │                    │              │
   │                                      │                    │              │
   │  cashier picks method                │                    │              │
   │  POST /payments ──────────────────▶  payments row created │              │
   │                                      │                    │              │
   │  (CASH — INTENDED, Bug 1 blocks it)  │                    │              │
   │    completePayment():                │                    │              │
   │      UpdatePaymentStatus=completed   │                    │              │
   │      MarkOrderPaid ───────────────▶  orders.status=paid   │              │
   │                                    ──▶ order_status_changed ──────────▶ WS patch
   │      rdb.Publish(payment_success) ──▶ orders:kds channel  │              │
   │         ◀── WS payment_success       │                 ◀── (received,   (received,
   │         toast + print + /pos         │                      ignored)     ignored)
   │                                      │                    │              │
   │  (GATEWAY — INTENDED, Bug 2 blocks WS) │                  │              │
   │    payments row status=pending        │                    │              │
   │    WS listener opens ──────────────▶  subscribes orders:kds             │
   │    (cashier shows QR)                 │                    │              │
   │    ... customer scans QR              │                    │              │
   │    gateway IPN ───────────────────▶  processWebhookResult │              │
   │                                       completePayment()    │              │
   │      MarkOrderPaid ───────────────▶  orders.status=paid   │              │
   │      rdb.Publish(payment_success) ──▶ orders:kds channel  │              │
   │         ◀── WS payment_success       │                 ◀── (received,   (received,
   │         toast + print + /pos         │                      ignored)     ignored)
   │                                      │                    │              │
   ▼ /pos (page fully unmounts; all memory state gone)
```

---

## 10. Reload (F5) behavior

Because the cashier page stores no persistent local state:

| Datum | Stored where | Survives F5? | Recovery path |
|---|---|---|---|
| Order data | TanStack `['order', orderId]` (memory) | ❌ | Re-fetches `GET /orders/:id` on mount |
| `payment` object | `useState` (memory) | ❌ | Lost — cashier sees method-picker again |
| `method` selection | `useState` (memory) | ❌ | Resets to `'cod'` (the default) |
| Order id | URL param `:id` | ✅ | Stays in URL across F5 |
| WS connection | `useRef` + `useEffect` | ❌ | Re-connects only if `payment.status === 'pending'` (but `payment` was wiped — so no reconnect) |

> **Reload consequence:** if a cashier reloads mid-QR-scan (e.g. accidental F5), the WS listener
> is gone and the auto-print/redirect will never fire for that session — even if the webhook arrives
> and sets `payments.status = completed`. The cashier would need to manually check and navigate away.
> The payment itself is durable in MySQL.

> **Idempotency guard:** re-submitting `POST /payments` after a reload returns
> `409 PAYMENT_ALREADY_EXISTS` if a non-`failed` payment exists (`payment_service.go:71-75`) — so
> double-pay is blocked.

---

## 11. Durability matrix — what survives what

| Datum | Lives in | Survives F5? | Survives navigate away? | Survives new device? |
|---|---|---|---|---|
| `method` selection | ░ useState (memory) | ❌ | ❌ | ❌ |
| `payment` response object | ░ useState (memory) | ❌ | ❌ | ❌ |
| TanStack `['order', orderId]` | ░ memory | ❌ | ❌ | ❌ |
| WS connection | ░ useRef (memory) | ❌ | ❌ | ❌ |
| `payments` row (MySQL) | BE — MySQL | ✅ | ✅ | ✅ |
| `orders.status = paid` (MySQL) | BE — MySQL | ✅ | ✅ | ✅ |
| `payment_success` Redis event | Redis pub/sub (ephemeral) | ❌ (already fired) | ❌ | ❌ |

> **Mental model in one line:** this page is a write-and-go terminal — it holds nothing, leaves two
> MySQL rows, fires one Redis event, then expects a WS echo to trigger print + redirect. Every
> in-browser datum is ░ memory; the BE rows are the only lasting artefacts.

---

## 12. Source & rule map

| Topic | Source of truth |
|---|---|
| On-page component + zone breakdown | [staff_cashier_payment.md](staff_cashier_payment.md) |
| BE endpoints, auth, caching, errors, flags | [staff_cashier_payment_be.md](staff_cashier_payment_be.md) |
| Code bugs (Bug 1 `cod`/`cash`, Bug 2 thin response, Bug 3 proof 404) | [PAYMENT_BUGS.md](PAYMENT_BUGS.md) |
| Payment business rules (gate, idempotency, timeout) | [../../02_spec/BUSINESS_RULES.md §4](../../02_spec/BUSINESS_RULES.md#4-payment-rules) |
| Order status machine (full) | [../../02_spec/BUSINESS_RULES.md §4](../../02_spec/BUSINESS_RULES.md#4-payment-rules) |
| Order object model (all fields) | [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) |
| `completePayment` + `MarkOrderPaid` | `be/internal/service/payment_service.go:252-273` · `be/internal/service/order_service.go:75-87` |
| `payment_success` publish | `be/internal/service/payment_service.go:270-271` |
| WS handler — `orders:kds` fan-out, no role gate | `be/internal/websocket/handler.go:17-24, 31-47` |
| Payment routes registration | `be/cmd/server/main.go:253-262` |
| WS routes registration | `be/cmd/server/main.go:337-339` |
| FE WS listener + backoff | `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx:63-108` |
| FE create-payment mutation + thin-response bug | `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx:110-123` |
| FE QR render guard (never fires — Bug 2) | `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx:249` |
