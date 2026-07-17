# Scenario — An Online Order Submitted at `/checkout`

> **Status: 🔮 PLANNED** — `/checkout` is the future home of the online (`source:'online'`,
> `table_id:null`) ordering path. The code exists and runs, but no wired customer-login / online
> entry point exists today; the only customer tokens are guest JWTs minted from a QR table scan
> (those carry `source:'qr'`). This scenario traces **the code path as it stands**, highlighting
> three real bugs in the beats where they bite.
>
> **Purpose:** show one concrete run through `/checkout` — cart already built on `/menu`, customer
> fills name + phone + payment method, taps "Đặt hàng", order created, localStorage written, cart
> cleared, navigate to `/order/<id>`. Each beat is grounded in source lines, not recalled from
> memory.
>
> **Sources traced:**
> - [`fe/src/app/(shop)/checkout/page.tsx`](../../../../../fe/src/app/(shop)/checkout/page.tsx)
> - [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts)
> - [`fe/src/lib/order-payload.ts`](../../../../../fe/src/lib/order-payload.ts)
> - [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts)
>
> **BE trace (do not restate here):** [customer_checkout_be.md](customer_checkout_be.md)
>
> **Sibling files:**
> [customer_checkout.md](customer_checkout.md) ·
> [customer_checkout_be.md](customer_checkout_be.md) ·
> [customer_checkout_crosspage_dataflow.md](customer_checkout_crosspage_dataflow.md) ·
> [customer_checkout_loading.md](customer_checkout_loading.md) ·
> [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md)
>
> **Surrounding context (the prior menu/cart story):** this scenario picks up where
> [SCENARIO_LUNCH_RUSH.md](../customer_menu/SCENARIO_LUNCH_RUSH.md) §12:01 leaves off —
> "Two takeaway customers order from the website. `source:'online'`, `table_id:null`." We zoom in
> on exactly how that submit works through `/checkout`.

---

## 👤 The cast

| Who | Role | Device |
|---|---|---|
| **Minh** | Customer, ordering takeaway online (no QR scan, no table) | Mobile browser |
| **Lê Đầu Bếp** | Chef — will receive the new order on KDS once it lands | Kitchen tablet |
| **Grafana/Prometheus** | Monitoring — captures the burst from Minh's submit | Server-side |

> ⚠️ In practice today, Minh has no wired path to reach `/checkout` without first scanning a
> table QR (which would mint a guest JWT with a `tableId` claim). The scenario assumes the future
> online-ordering flow where a customer either logs in or receives a non-table guest token.
> This caveat is the root of Bug 3 — traced at **12:01:47** below.

## 🏠 The setting

Date: 2026-06-15, 12:01. Minh has navigated to the restaurant's website, browsed `/menu`, and
added items to the cart without scanning any QR. Cart state (`cart.ts:42-48`):

```
items:      [1× Suất Giò (combo), 1× Canh có rau (standalone)]
tableId:    null       ← no QR scan
tableName:  null
activeOrderId: null
paymentMethod: null
orderNote:  ''
```

`cart.itemCount()` returns `2` and `cart.total()` returns `21000`
(`cart.ts:124-125`). On `/menu` Minh tapped "Tiến hành đặt hàng" and
`router.push('/checkout')` fired.

---

## ⏱️ The timeline

### 12:01:00 — Minh arrives at `/checkout`

The `useEffect` guard fires (`page.tsx:36-38`):

```ts
useEffect(() => {
  if (!submitted.current && cart.itemCount() === 0) router.replace('/menu')
}, [cart, router])
```

`cart.itemCount()` returns `2` — guard does not trigger. The page renders its three sections:

1. **Order summary** — lists `cart.items` with name + toppings + price per line
   (`page.tsx:112-132`). `formatVND(total)` shows `₫21,000`.
2. **Contact form** — name input (`page.tsx:147-155`), phone input (`page.tsx:157-166`),
   optional note textarea (`page.tsx:169-176`). No default values for name/phone.
3. **Payment method** — four radio options rendered from `PAYMENT_OPTIONS`
   (`page.tsx:24-29`, `page.tsx:184-194`): VNPay · MoMo · ZaloPay · Cash COD.
   Default value: `'cash'` (`page.tsx:43`).

Fixed footer shows `Đặt hàng · ₫21,000` (`page.tsx:211-212`).

### 12:01:20 — Minh types name and phone

Minh types **"Nguyễn Văn Minh"** in the name field and **"0912345678"** in the phone field.
React Hook Form tracks these via `register` (`page.tsx:40-43`). Zod schema (`page.tsx:15-20`):

```ts
const schema = z.object({
  customer_name:   z.string().min(2, 'Vui lòng nhập tên').max(100),
  customer_phone:  z.string().regex(/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ'),
  note:            z.string().max(500).optional(),
  payment_method:  z.enum(['vnpay', 'momo', 'zalopay', 'cash']),
})
```

`"0912345678"` passes `^(0|\+84)[0-9]{9}$` — nine digits after the leading `0`. RHF validates
on submit (no `mode: 'onChange'` set), so no errors show yet.

### 12:01:30 — Minh picks 💳 VNPay

Minh taps the VNPay radio. The field value shifts to `'vnpay'`. The radio is a real controlled
field wired via `register('payment_method')` (`page.tsx:189`). The UI shows VNPay selected.

> 🚨 **Bug 1 begins here — [CHECKOUT_BUGS.md Bug 1](CHECKOUT_BUGS.md#bug-1----the-payment-method-radio-does-nothing)**
> The selection is real inside RHF, but it will have zero downstream effect. The submit handler
> writes it to the cart store (`cart.setPaymentMethod`), the POST body never includes it, and
> `clearCart()` wipes it immediately after. The radio is purely decorative today.

### 12:01:45 — Minh taps "Đặt hàng"

`handleSubmit(d => submitOrder.mutate(d))` fires (`page.tsx:137`). Zod validates the form
synchronously:

- `customer_name`: `"Nguyễn Văn Minh"` — length ≥ 2 ✅
- `customer_phone`: `"0912345678"` — matches regex ✅
- `note`: absent (optional) ✅
- `payment_method`: `'vnpay'` — valid enum member ✅

All pass. `submitOrder.mutate(form)` is called. The button flips to `"Đang đặt hàng..."` and
`disabled={true}` (`page.tsx:207-212`) — no double-submit possible.

### 12:01:45 — mutationFn executes

`mutationFn` (`page.tsx:46-59`) runs in order:

**Step 1 — write payment method to store** (`page.tsx:47`):
```ts
cart.setPaymentMethod(form.payment_method)   // stores 'vnpay' in paymentMethod field
```
`setPaymentMethod` (`cart.ts:94`): `set({ paymentMethod: method })`. The store now holds
`paymentMethod: 'vnpay'`. This is the only moment `'vnpay'` exists anywhere meaningful — it will
be wiped at 12:01:47.

**Step 2 — build the payload** (`page.tsx:49-56`):

```ts
const payload = {
  customer_name:  'Nguyễn Văn Minh',
  customer_phone: '0912345678',
  note:           null,
  table_id:       cart.tableId ?? null,         // → null (no QR scan)
  source:         cart.tableId ? 'qr' : 'online',  // → 'online'
  items: buildOrderItemsPayload(cart.items),
}
```

`buildOrderItemsPayload` (`order-payload.ts:27-58`) iterates `cart.items`:
- Item 1: `type === 'combo'` (Suất Giò) → combo row: `product_id: null`,
  `combo_id: <uuid>`, `quantity: 1`, `topping_ids: []`, `combo_items` listing Giò + Bánh Cuốn
  (canh filtered out by `isSoupName` check, `order-payload.ts:13-14,35`).
- Item 2: `type === 'product'` (Canh có rau) → standalone row: `product_id: <uuid Canh>`,
  `combo_id: null`, `quantity: 1`, `topping_ids: [<rau topping id>]`.

Final payload sent to BE — note: **no `payment_method` field**:

```jsonc
{
  "customer_name":  "Nguyễn Văn Minh",
  "customer_phone": "0912345678",
  "note":           null,
  "table_id":       null,
  "source":         "online",
  "items": [
    { "product_id": null, "combo_id": "<uuid Suất Giò>", "quantity": 1,
      "topping_ids": [],
      "combo_items": [
        { "product_id": "<uuid Giò>",       "quantity": 1, "topping_ids": ["<uuid nhân>"] },
        { "product_id": "<uuid Bánh Cuốn>", "quantity": 3, "topping_ids": ["<uuid nhân>"] }
      ]
    },
    { "product_id": "<uuid Canh>", "combo_id": null, "quantity": 1,
      "topping_ids": ["<uuid rau>"] }
  ]
}
```

**Step 3 — `api.post('/orders', payload)`** (`page.tsx:58`):
The Axios instance fires `POST /api/v1/orders` with `Authorization: Bearer <guest JWT>` injected
by the request interceptor. ❓ UNVERIFIED: exact interceptor line in `lib/api-client.ts` (file
not read in this pass — pattern confirmed by `customer_checkout_be.md §Auth Model`).

### 12:01:46 — BE receives the POST

Full trace: [customer_checkout_be.md §POST /orders](customer_checkout_be.md#1--post-orders-the-submit). Summary:

- Handler binds `createOrderReq` (`order_handler.go:69`). `source:'online'` passes
  `oneof=online qr pos`. Per-item XOR guard passes.
- `claims.Role == "customer"` → `created_by` forced to `""` → stored as `NULL`
  (`order_handler.go:88-92`).
- Service `CreateOrder` (`order_service.go:262`): no active order on this table (no table, so no
  busy-table check fires → `tableBusy = false`).
- Combo expands: header `unit_price=0` + sub-items carrying `combo_ref_id`.
- `recalculateTotalAmount`: `0×1 + 9000×1 + 4000×3 + 0×1 = ₫21,000`.
- Publishes `new_order` → KDS receives it; admin monitor broadcast fires (Lê Đầu Bếp sees the
  new ticket appear on his KDS screen in real time via Redis pub/sub fan-out).
- Handler returns **`201 {data: {id: "<uuid>", table_busy: false}}`**.

### 12:01:47 — FE `onSuccess` runs

`onSuccess(data)` (`page.tsx:61-75`):

**Step 1** — `submitted.current = true` (`page.tsx:62`). Disables the empty-cart redirect.

**Step 2** — extract `order.id` from `data?.data` (`page.tsx:63-64`).

**Step 3** — post-create re-fetch (`page.tsx:65-71`):

```ts
const { data: fullRes } = await api.get(`/orders/${order.id}`)
const fullOrder = fullRes?.data ?? order
localStorage.setItem(`${STORAGE_KEYS.ORDER_CACHE}${order.id}`, JSON.stringify(fullOrder))
```

`STORAGE_KEYS.ORDER_CACHE` is the prefix string `'order_cache_'` (`storage-keys.ts:3`), so the
key written is `order_cache_<uuid>`.

> 🚨 **Bug 3 fires here — [CHECKOUT_BUGS.md Bug 3](CHECKOUT_BUGS.md#bug-3----an-online-table-null-order-cant-be-read-back-by-a-guest-token)**
>
> `GET /orders/<id>` returns **403** for a customer-role token on a table-null order.
> `GetOrder`'s ownership guard (`order_service.go:116-120`) checks `o.TableID == callerID`
> where `callerID = claims.TableID` for customers; `table_id = NULL` means
> `!o.TableID.Valid` is true → `ErrForbidden`.
>
> The `try/catch` at `page.tsx:69-71` swallows this 403 and falls back to caching the minimal
> body (just `{id, table_busy:false}`) instead of the full order.
>
> The `/order/:id` tracking page then calls `GET /orders/:id` itself and also receives **403** —
> the customer sees an empty or forbidden order. **Latent today** (no wired online entry); must
> be fixed before the online-ordering flow ships (BE-side ownership fix for table-null orders).

**Step 4** — clear cart (`page.tsx:73`):

```ts
cart.clearCart()
```

`clearCart` (`cart.ts:89`):
```ts
set({ items: [], tableId: null, tableName: null, activeOrderId: null, paymentMethod: null, orderNote: '' })
```

`paymentMethod` resets to `null` — the `'vnpay'` value set in Step 1 of `mutationFn` is now
gone. Bug 1 lifecycle completes: VNPay was selected, briefly stored, never sent, erased.

Note: `clearCart` also wipes `activeOrderId`. Unlike `TableConfirmModal` (menu QR path), this
page never calls `setActiveOrderId` after a successful submit — ❓ UNVERIFIED whether this is
intentional. The "Đặt thêm món" add-to-order flow on `/menu` reads `activeOrderId`; if it is
never set here, add-to-order is implicitly unavailable for orders placed via `/checkout`.

See [customer_checkout_crosspage_dataflow.md](customer_checkout_crosspage_dataflow.md) for the
full map of what `clearCart` wipes vs. what persists.

**Step 5** — navigate (`page.tsx:75`):

```ts
router.replace(order?.id ? `/order/${order.id}` : '/order')
```

`router.replace` (not `push`) — no history entry for `/checkout`. Minh lands on `/order/<uuid>`.
The `order_cache_<uuid>` in localStorage is what that page uses for its instant first paint.
Under Bug 3, only the minimal `{id}` body is cached, and the tracking page's own fetch also 403s.

### 12:01:47 — What did NOT happen (Bug 2)

The `onError` handler (`page.tsx:77-87`) would check:

```ts
if (resp?.data?.error === 'TABLE_HAS_ACTIVE_ORDER') {
  submitted.current = true
  const activeId = resp?.data?.details?.active_order_id
  router.replace(activeId ? `/order/${activeId}` : '/order')
  return
}
```

> 🚨 **Bug 2 — [CHECKOUT_BUGS.md Bug 2](CHECKOUT_BUGS.md#bug-2----table_has_active_order-branch-is-dead-a-duplicate-order-is-created-with-no-notice)**
>
> This branch is dead. `CreateOrder` **never** returns `TABLE_HAS_ACTIVE_ORDER`. The busy-table
> case internally sets `tableBusy = true` and returns **`201`** with `data.table_busy:true`
> (`order_handler.go:121`). `ErrTableHasActiveOrder` is defined (`errors.go:30`) but referenced
> nowhere in the codebase.
>
> In Minh's run this does not bite (no table → no busy-table check). But if a QR customer
> somehow reached `/checkout` for a table with an active order, the 201 silently creates a
> **second parallel order** with no warning — unlike `TableConfirmModal` on `/menu` which toasts
> on `table_busy` from the success body. The fix is FE-side: delete the dead branch; read
> `data.table_busy` from the 201 response if a notice is wanted.

---

## 🔧 Under the hood

### A. Cross-component data flow (one page)

All three interactive sections — order summary, contact form, payment radios — live in one
`'use client'` component (`page.tsx:1`). State is local, not Zustand:

```
useCartStore (read-only)  ─▶  Order summary section (items, total)
useForm / zodResolver     ─▶  Contact section + Payment radios
useMutation submitOrder   ─▶  Fixed footer button (pending state, disabled)
submitted ref             ─▶  useEffect guard + onSuccess/onError (prevents double-redirect)
```

The page writes to `useCartStore` only twice: `setPaymentMethod` before the POST, `clearCart`
after success. It never calls `setActiveOrderId`. There is **no `customer_checkout_crosscomponent_dataflow.md`**
— it is N/A for this page: the widgets coordinate through a local RHF form plus a single read of the
cart store, not a multi-writer shared store (per the page-doc-set call, same as C4/C9/C11).

### B. Cross-page data flow

What `/checkout` leaves behind after Minh submits:

| What | Mechanism | Survives F5? |
|---|---|---|
| `order_cache_<id>` | `localStorage` key `'order_cache_' + id` (`storage-keys.ts:3`) | ✅ — consumed by `/order/:id` for instant paint |
| Cart items, tableId, paymentMethod | `useCartStore` → wiped by `clearCart()` (`cart.ts:89`) | ❌ — gone |
| `orderNote`, `activeOrderId` | Both in `clearCart` set → `''` / `null` (`cart.ts:89`) — wiped even though they are normally persisted | ❌ — gone after `clearCart` |
| Order `id` | In the URL `/order/<id>` via `router.replace` (`page.tsx:75`) | ✅ — URL survives F5 |

Full cross-page map: [customer_checkout_crosspage_dataflow.md](customer_checkout_crosspage_dataflow.md).

### C. FE → BE send

One POST, one immediate GET:

```
api.post('/orders', payload)          → POST /api/v1/orders     (authMW, returns 201)
api.get(`/orders/${order.id}`)        → GET  /api/v1/orders/:id (authMW, returns 200 or 403)
```

Both go through the single Axios instance with the `Authorization: Bearer` interceptor. No
prices or names travel from the cart to the payload — `buildOrderItemsPayload` sends only ids +
quantities (`order-payload.ts:27-58`). BE snapshots `name` + `unit_price` server-side.

Full endpoint trace (handler → service → repo → SQL):
[customer_checkout_be.md](customer_checkout_be.md).

### D. BE → FE receive / live

**Synchronous return:** `POST /orders` → `201 {data: {id, table_busy}}` (`order_handler.go:121`).
`onSuccess` uses only `data.data.id` — it never reads `table_busy` (Bug 2 context).

**Post-create re-fetch:** `GET /orders/:id` → full `OrderJSON` on success; 403 under Bug 3.

**Realtime (after navigation):** Once on `/order/:id`, `useOrderSSE` drives live updates via
`GET /orders/:id/events` SSE. `/checkout` itself has **no SSE** — it is a pure write-then-redirect
page. The `new_order` Redis pub/sub fan-out (fired during `CreateOrder`,
`order_service.go:348-350`) is invisible to `/checkout` — it targets KDS + admin WS connections.

No Redis read cache is involved at any point on this page. Both endpoints hit MySQL directly.
See [customer_checkout_be.md §Caching](customer_checkout_be.md#caching--invalidation).

### E. Loading + caching

`/checkout` fetches **no async data on mount** — it reads the cart from Zustand synchronously.
No Suspense boundary, no loading skeleton. Loading states the page owns:

| State | Trigger | What renders |
|---|---|---|
| Guard redirect | `cart.itemCount() === 0` and `!submitted.current` | `return null` then `router.replace('/menu')` (`page.tsx:37`, `page.tsx:92`) |
| Submit pending | `submitOrder.isPending === true` | Button text `"Đang đặt hàng..."`, button `disabled` (`page.tsx:207-211`) |
| Zod validation error | Field fails schema | Inline `<p className="text-xs text-urgent">` below the field (`page.tsx:152-154`, `165-167`) |
| Toast error | `onError` for non-dead errors | `toast.error(message)` (`page.tsx:86`) |

The `order_cache_<id>` written in `onSuccess` is consumed by `/order/:id` for its instant
first-paint — that caching belongs to the tracking page's loading strategy.
See [customer_checkout_loading.md](customer_checkout_loading.md).

### F. Monitoring

The `POST /orders` from Minh's submit appears in Grafana (`:3001`) on the "Request Rate" panel.
The `new_order` Redis publish and subsequent SSE fan-out to KDS/admin WebSocket are pub/sub (not
HTTP) and do not generate additional HTTP metrics. A slow combo expansion or a DB retry on the
`uq_orders_order_number` unique-violation would show as p95 latency on the "p95 Response Time"
panel.

Alert thresholds: `HighErrorRate` (5xx > 5% over 5 min) · `SlowResponseTime` (p95 > 500 ms
over 5 min). The 403 on the post-create re-fetch (Bug 3) is a **4xx** — it does not trip
`HighErrorRate`. It is silent in monitoring.
Monitoring stack: `docs/system/09_devops/MONITORING.md`.

---

## Putting A–F on one timeline (Minh's order)

```
12:01:00  arrive at /checkout
           → useEffect guard: itemCount()=2, passes (E: no redirect)
           → page renders: summary + form + radios (cart read synchronously) (A: cross-component)

12:01:20  type name + phone (RHF tracks, no network)

12:01:30  pick VNPay radio → form.payment_method = 'vnpay'
           → 🚨 Bug 1 begins: choice collected but will be discarded (A: RHF field)

12:01:45  tap "Đặt hàng" → handleSubmit → zodResolver validates (all pass)
           → submitOrder.mutate(form) → button disabled + "Đang đặt hàng..." (E: pending)
           → cart.setPaymentMethod('vnpay')          ← pointlessly writes to store (A: store write)
           → buildOrderItemsPayload(cart.items)       ← one builder, two items (C: payload build)
           → api.post('/orders', payload)             ← no payment_method in body (C: one client)

12:01:46  BE: bind → validate → CreateOrder service
           → no table → tableBusy=false
           → expandCombo: header unit_price=0 + sub-item rows
           → recalculateTotalAmount → ₫21,000
           → INSERT orders + order_items (one TX)
           → publish new_order → KDS + admin WS update                    (D: realtime out)
           → return 201 {id, table_busy:false}

12:01:47  onSuccess fires
           → submitted.current = true
           → api.get('/orders/<id>')                  ← post-create re-fetch    (C+D)
           → 🚨 Bug 3: GET /orders/:id → 403 (table_id=NULL fails ownership guard)
           → catch: localStorage.setItem('order_cache_<id>', minimal {id} body) (B: cross-page)
           → cart.clearCart()
             ← items/tableId/paymentMethod/activeOrderId/orderNote all wiped    (A+B)
             ← 'vnpay' is gone: Bug 1 lifecycle complete
           → router.replace('/order/<id>')                                        (B: cross-page)

           (Bug 2 note: TABLE_HAS_ACTIVE_ORDER dead onError branch never fires
            — irrelevant this run since there is no table, but would bite a QR
            customer who somehow reached /checkout for a table with an active order)

12:01:47+ /order/<id> renders
           → reads order_cache_<id> → incomplete (Bug 3: only {id} cached)
           → own GET /orders/:id → 403 (Bug 3) → customer sees forbidden/empty order

🔮 PLANNED happy path (once Bug 3 fixed + real customer token exists):
           → full order painted instantly from cache (no spinner)               (E: instant paint)
           → useOrderSSE opens GET /orders/:id/events                           (D: realtime in)
           → chef increments qty_served → item_progress SSE → progress bar moves
```

---

## 🐛 Bugs surfaced by this scenario

| # | Beat | Bug | Severity | Detail |
|---|---|---|---|---|
| 1 | 12:01:30 (radio pick) + 12:01:45 (`setPaymentMethod`) + 12:01:47 (`clearCart`) | Payment-method radio collected, stored, never sent to BE, wiped | 🟠 Medium | [CHECKOUT_BUGS.md Bug 1](CHECKOUT_BUGS.md#bug-1----the-payment-method-radio-does-nothing) |
| 2 | 12:01:47 (`onError` branch never reached) | `TABLE_HAS_ACTIVE_ORDER` check dead; busy table creates duplicate order silently | 🟠 Medium | [CHECKOUT_BUGS.md Bug 2](CHECKOUT_BUGS.md#bug-2----table_has_active_order-branch-is-dead-a-duplicate-order-is-created-with-no-notice) |
| 3 | 12:01:47 (post-create re-fetch + `/order/:id`) | `source:'online'`/`table_id:null` order returns 403 for customer-role token; tracking page shows empty/forbidden | 🟡 Low (latent) | [CHECKOUT_BUGS.md Bug 3](CHECKOUT_BUGS.md#bug-3----an-online-table-null-order-cant-be-read-back-by-a-guest-token) |

---

## ❓ UNVERIFIED cells

| Item | Why unverified |
|---|---|
| Exact line in `lib/api-client.ts` where the `Authorization: Bearer` header is injected | File not read in this pass — pattern confirmed from `customer_checkout_be.md §Auth Model` |
| Whether `/checkout` intentionally omits `setActiveOrderId` (vs. `TableConfirmModal` which sets it) | `page.tsx` never calls `setActiveOrderId`; may be an oversight or intentional for the online-order path — needs owner confirmation |

---

## 🧠 The one-line mental model

> `/checkout` is the **write gate** for online orders: it collects contact info, builds the
> payload via `buildOrderItemsPayload`, fires one POST, caches the response, clears the cart, and
> routes out — but three bugs (a dead payment radio, a dead busy-table redirect branch, and a
> table-null ownership gap on re-read) mean the full happy path does not complete end-to-end
> until the 🔮 online-ordering epic closes them.
