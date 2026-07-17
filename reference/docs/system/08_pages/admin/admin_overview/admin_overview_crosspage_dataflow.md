# Admin Overview — Cross-Page Data Flow (the floor, across pages & devices)

> **What this is:** the **cross-page** companion to
> [admin_overview_crosscomponent_dataflow.md](admin_overview_crosscomponent_dataflow.md).
> That file answered *"how do the widgets on the overview page share one cache?"* — this one
> answers the next question: **when the manager confirms / advances / cancels / collects payment
> on this page, where does that change travel — to the KDS, to the customer's `/order/<id>` and
> `/tracking` screens, and to other managers' browsers?**
>
> The trap this file clears up: unlike the customer's `/menu`, the admin overview page leaves
> behind **no browser-local handoff** — no `localStorage`, no persisted store, no URL id. Its
> **only** durable output is the mutated **BE order row** (`PATCH /orders/:id/status`,
> `POST /payments`). Everything else on this page is **memory-only** server-state
> (`['orders','live']`, `['tables']`, `['orders','history']` TanStack caches) that dies on F5 and
> is re-fetched. So for this page the **server hub is the whole story**, and the page is a *mutator
> + projector* of it.
>
> Traced from source on branch `experience_claude.md_system_1`:
> [`fe/src/app/(dashboard)/admin/overview/page.tsx`](../../../../../fe/src/app/(dashboard)/admin/overview/page.tsx) ·
> [`fe/src/hooks/useOverviewWS.ts`](../../../../../fe/src/hooks/useOverviewWS.ts) ·
> [`fe/src/hooks/useAdminSSE.ts`](../../../../../fe/src/hooks/useAdminSSE.ts) ·
> [`fe/src/context/OrdersWSContext.tsx`](../../../../../fe/src/context/OrdersWSContext.tsx) ·
> [`fe/src/features/admin/admin.api.ts`](../../../../../fe/src/features/admin/admin.api.ts) ·
> [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts).
> BE endpoints + channels → [admin_overview_be.md](admin_overview_be.md).

---

## 0. The whole picture on one diagram

```
  ┌──────── ONE MANAGER'S BROWSER (overview page) ────────┐
  │   memory-only hub (dies on F5, NO localStorage)       │
  │   ░ ['orders','live']    TanStack   "the live floor"  │
  │   ░ ['tables']           TanStack   "the room"        │
  │   ░ ['orders','history'] TanStack   "today's logs"    │
  │        ▲ write(optimistic)      ▲ read(every zone)    │
  │        │                        │                     │
  │   PATCH /orders/:id/status ─────┤  POST /payments ────┤
  │        │  (confirm/advance/cancel)   (cash → paid)    │
  └────────┼────────────────────────────────────┼────────┘
           │                                     │
  ═════════╪═════ THE WIRE — the BE is the only hub ══════╪═══════════
           ▼                                     ▼
       ┌────────────────────────────────────────────┐
       │   one  order  row    MySQL (durable)        │
       │   order.id · status · total_amount          │   Redis pub/sub (loudspeakers):
       └──┬───────────────┬───────────────┬──────────┘   • orders:kds      (WS — KDS + overview)
   admin  │      KDS       │   customer    │   monitor      • orders:admin    (SSE — new_order ping)
   ◀ WS ──┤   ◀ WS ────────┤   ◀ SSE ──────┤   ◀ SSE ─       • order:<id>      (SSE — per order)
  orders: │  orders:kds    │  order:<id>   │  queue:/tables:  • queue:broadcast / tables:broadcast
   kds    │  (cook board)  │ (/order/<id>) │  (/tracking)
```

**Read it like this:** everything *inside the box* is one manager's browser holding three
**memory** TanStack caches (no `▓ localStorage` anywhere — contrast the customer side, which
persists `order_cache_<id>` + `activeOrderId`). Everything *below the double line* is the BE. The
manager's actions write the BE row; Redis then fans the change out to four audiences over four
channels — **including back to this same browser** (the overview WS) so optimistic writes get
reconciled.

```
   LEGEND  ──▶ HTTP / navigation     ◀── SSE/WS push (server → browser)
           ░ memory (dies on F5)     ▓ localStorage (none on this page)
```

---

## 1. The status lifecycle this page renders & drives

This page is where most transitions are **initiated**. The same `OrderStatus` enum
([`order.ts:29`](../../../../../fe/src/types/order.ts)) drives every badge and every zone filter:

```
              (popup ✓ / Zone B)   (Zone B/D ›)    (Zone B/D ›)    (Zone B/D ›)
  POST /orders      │                  │               │               │
       │  pending ─────▶ confirmed ───────▶ preparing ────▶ ready ────────▶ delivered
       │     │                                                               │
       │     └──────────── cancelled ◀── PATCH status (pending/confirmed/    ▼
       │                              preparing only — NOT delivered)       paid
       ▼                                                            POST /payments (cash)
```

| Status | Set from this page by | Zone it lives in | In `['orders','live']`? |
|---|---|---|---|
| `pending` | (arrives via SSE/WS) → popup | A counts · B | ✅ active |
| `confirmed` | popup ✓ / Zone B/D advance | A · B · D | ✅ active |
| `preparing` | Zone B/D advance | A · B · D | ✅ active |
| `ready` | Zone B/D advance | B · D | ✅ active |
| `delivered` | Zone B/D advance | B · D (pay/cancel buttons) | ✅ active *(until paid)* |
| `cancelled` | Zone B/D **Huỷ** | **F** CancelLog | ❌ dropped from live |
| `paid` | Zone D **Đã thanh toán** | **E** PaidLog | ❌ dropped from live |

> The `ACTIVE` set `{pending,confirmed,preparing,ready,delivered}` is enforced **twice**: in
> `useOverviewWS` ([`useOverviewWS.ts:8`](../../../../../fe/src/hooks/useOverviewWS.ts)) and again as
> the page-level filter ([`page.tsx:26,135`](../../../../../fe/src/app/(dashboard)/admin/overview/page.tsx)).
> The valid-transition machine itself lives on the BE
> (`order_service.go:524-530`) — see [admin_overview_be.md §5](admin_overview_be.md).

---

## 2. The moment of handoff — what this page leaves behind

This is the seam, and it is **deliberately thin**. Where the customer `/menu` leaves three browser
writes (`order_cache_<id>`, `activeOrderId`, `clearCart`), the overview page leaves **one server
write and zero browser writes that outlive the page**:

```
  Zone B/D button ──▶ PATCH /orders/:id/status { status }      (or POST /payments for cash)
       │
       │   ① optimistic: queryClient.setQueryData(['orders','live'], …)   ░ memory only
       │   ② BE writes orders.status (+ publishes order_status_changed)   ← the durable handoff
       │   ③ WS order_status_changed echoes back → reconciles ① or drops  ░ memory only
       ▼
  (no router navigation, no localStorage, no persisted store)
```

| # | Write | Where it lands | Who reads it later | Source |
|---|---|---|---|---|
| ① | `setQueryData(['orders','live'], …)` | ░ memory (this tab) | this page's own zones, until F5 | [`page.tsx:179-183`](../../../../../fe/src/app/(dashboard)/admin/overview/page.tsx) |
| ② | `UPDATE orders SET status` + Redis publish | **BE row (durable)** + `orders:kds`/`order:<id>` | KDS · customer detail · tracking · other admins | `order_service.go:548-553` (→ [be doc §5](admin_overview_be.md)) |
| ③ | WS `order_status_changed` echo | ░ memory (this tab) | reconciles ①; drops if not `ACTIVE` | [`useOverviewWS.ts:51-64`](../../../../../fe/src/hooks/useOverviewWS.ts) |

> **Why no browser handoff?** The overview page never *owns* an order across a navigation — it is a
> always-on dashboard, not a wizard. Its continuity comes from re-fetching `['orders','live']` and
> from the WS, not from anything it stashes. That is the single biggest difference from the customer
> cross-page story.

---

## 3. `['orders','live']` — the in-browser projection (memory, self-healing via WS)

The live floor cache is written in **four** places and read by **every zone**. Unlike the
customer's `order_cache_<id>`, it is **not** persisted — an F5 wipes it and it is rebuilt from
`GET /orders/live`.

```
   WRITERS                                          READERS (all zones)
   ───────────────────────────────────              ──────────────────────────────
   GET /orders/live (initial + 15s)  ──┐            ┌── StatCards  (A counts)
   useOverviewWS new_order (prepend) ──┤            ├── WaitingSection (B list)
   useAdminSSE  new_order (prepend)  ──┼──▶ ░ ──────┼── PrepPanel  (C: kiemTra ∩ pending)
   handleAction optimistic (patch)   ──┤  ['orders' ├── TableList / TableGrid (D)
   WS order_status_changed (patch/drop)┘   ,'live'] └── search filters (B+D)
```

**The self-healing loop** — the subtle part: a button writes the new status **optimistically**
before the PATCH resolves, and the WS echo is what makes it authoritative (or corrects it):

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │  manager clicks "› confirmed"                                         │
   │     │ ① setQueryData → status:'confirmed'  ──▶ zone repaints instantly │
   │     │ ② PATCH /orders/:id/status            ──▶ BE writes + publishes   │
   │     │ ③ WS order_status_changed             ──▶ patch (or drop if !ACTIVE)
   │     ▼                                                                  │
   │  on PATCH error: toast only — ① is NOT rolled back (see Flags)         │
   │  the 15s staleTime refetch is the eventual safety net                  │
   └──────────────────────────────────────────────────────────────────────┘
```

> The cached object is the full `Order` ([`order.ts:38`](../../../../../fe/src/types/order.ts)).
> Zone E/F instead read a **separate** cache `['orders','history']` (paid+cancelled today), fetched
> lazily on accordion open — see [admin_overview_be.md §3](admin_overview_be.md) and
> [admin_overview_loading.md](admin_overview_loading.md).

---

## 4. The four downstream surfaces — one BE row, four projections

A status change on this page never touches another browser directly. It mutates the BE row, and
Redis fans it out over four channels to four audiences. **No arrow goes browser → browser.**

```
   MANAGER taps "› ready" on order A (overview)
        │ PATCH /orders/A/status {ready}
        ▼
   BE: UPDATE orders.status=ready  ──▶  Redis publish  (order_service.go:548-553)
        │
        ├─ orders:kds ───────▶ ① KDS board (/kds)              order moves column     WS
        ├─ orders:kds ───────▶ ② THIS + other overview tabs    ['orders','live'] patch WS
        ├─ order:<A> ────────▶ ③ customer /order/A             "sẵn sàng" toast        SSE
        └─ queue:/tables: ──▶ ④ customer /tracking             queue/floor re-renders  SSE
```

| # | Surface | Channel (FE hook) | What it does with `order_status_changed` | Owner doc |
|---|---|---|---|---|
| 1 | **KDS** `/kds` | WS `orders:kds` | re-columns the cook board | [../../staff/staff_kds/staff_kds.md](../../staff/staff_kds/staff_kds.md) |
| 2 | **Other overview tabs** | WS `orders:kds` ([`useOverviewWS.ts`](../../../../../fe/src/hooks/useOverviewWS.ts)) | patch / drop from `['orders','live']` | this page |
| 3 | **Customer detail** `/order/<id>` | SSE `order:<id>` | status badge + toast, writes back `order_cache_<id>` | [../../customer/customer_order_detail/customer_order_detail.md](../../customer/customer_order_detail/customer_order_detail.md) |
| 4 | **Customer tracking** `/tracking` | SSE `queue:`/`tables:` monitor | queue position + floor re-render | [../../customer/customer_tracking/customer_tracking.md](../../customer/customer_tracking/customer_tracking.md) |

> The overview WS handler also recognises `item_progress` (a cook serving +1 on the KDS), patching
> `qty_served` on the matching item in `['orders','live']`
> ([`useOverviewWS.ts:34-49`](../../../../../fe/src/hooks/useOverviewWS.ts)) — so the manager sees
> kitchen progress without acting.

---

## 5. The new-order doorbell — two channels, same prepend

A brand-new customer order reaches this page over **two** independent channels, both ending in a
prepend to `['orders','live']`. They are not redundant: **only SSE pops the confirm modal.**

```
   customer POST /orders ──▶ BE creates row (pending) ──▶ Redis publish
        │                                                   │
        │   orders:admin (SSE)  ──▶ useAdminSSE  ──▶ GET /orders/:id ──▶ prepend + NewOrderPopup ✓
        │   orders:kds   (WS)   ──▶ useOverviewWS ─▶ GET /orders/:id ──▶ prepend (no popup)
        ▼
   both guard with ACTIVE.has(status) + dedup (find by id) before inserting
```

| Channel | Hook | Auth | Extra effect | Source |
|---|---|---|---|---|
| SSE `/sse/admin` | `useAdminSSE` | Bearer header, **`AtLeast("manager")`** | fires `NewOrderPopup` | [`useAdminSSE.ts:30-48`](../../../../../fe/src/hooks/useAdminSSE.ts) · [be §7](admin_overview_be.md) |
| WS `/ws/orders-live` | `useOverviewWS` | `?token=` (no role gate) | silent cache prepend | [`useOverviewWS.ts:21-31`](../../../../../fe/src/hooks/useOverviewWS.ts) · [be §8](admin_overview_be.md) |

> Manager clicks **✓ Xác nhận** in the popup → `PATCH /orders/:id/status {confirmed}`
> ([`page.tsx:162`](../../../../../fe/src/app/(dashboard)/admin/overview/page.tsx)); **Bỏ qua**
> just closes it (the order stays `pending` in Zone B). Both channels keep working if the other
> drops — see [admin_overview_loading.md](admin_overview_loading.md) for the connection states.

---

## 6. Payment — the order leaves the live floor for the log

Cash collection is the one cross-page write that is **terminal** for the live cache. It crosses
into the `['orders','history']` cache and onto the KDS:

```
   manager (Zone D, delivered order) ──▶ PaymentModal (2 checkboxes) ──▶ POST /payments {cash}
        │                                                                    │
        │   onPaymentDone(orderId):                                          ▼
        │   ① ['orders','live'].filter(o.id ≠ orderId)   ░ drop from floor   BE: payment row +
        │   ② invalidateQueries(['orders','history'])    ░ refetch Zone E    order.status=paid
        │                                                                    │ publish payment_success
        ▼                                                                    └──▶ orders:kds → KDS
   Zone E PaidLog shows it (status==='paid', updated_at=today)
```

- The amount is **not** taken from the FE — the BE uses `order.total_amount`
  (`payment_service.go:89`); the `amount` the modal sends is ignored. See
  [admin_overview_be.md §6 + Flag 3](admin_overview_be.md).
- Source: [`page.tsx:370-374`](../../../../../fe/src/app/(dashboard)/admin/overview/page.tsx) (cache
  drop + invalidate) · [`TableList.tsx:286-300`](../../../../../fe/src/features/admin/components/TableList.tsx)
  (the `createPayment` call).

---

## 7. Cancellation — admin initiates, the customer finds out over SSE

This is the cross-device case in full: the guest is passively watching `/order/<id>` when the
manager pulls the order. The two initiators (customer vs admin) use **different endpoints** but
converge on the same `order_cancelled` broadcast — the customer-side half of this story lives in
[customer_order_detail_crosspage_dataflow](../../customer/customer_order_detail/) ; here is the
admin half:

```
   ADMIN overview (Zone B/D "Huỷ")          BE / Redis             CUSTOMER (watching /order/<id>)
   ───────────────────────────────          ──────────             ──────────────────────────────
   onCancel → handleAction(id,'cancelled')   │                      │
        │ PATCH /orders/:id/status ────────▶ status=cancelled       │
        │ optimistic: ['orders','live']      │── order_status_changed (publish order:<id>) ─▶
        │   patched → WS drops (!ACTIVE)      │                      │  • setOrder(cancelled)
        │ → moves to Zone F CancelLog         │                      │  • "Nhà hàng đã huỷ đơn" modal
        ▼                                     │                      │  • SSE loop STOPS
   live floor no longer shows it             │                      ▼
```

> ⚠ **The delivered-order trap.** Zone D renders a **Huỷ** button on `delivered` orders
> ([`TableList.tsx:378-385`](../../../../../fe/src/features/admin/components/TableList.tsx)), but
> `delivered → cancelled` is not a valid BE transition (`order_service.go:524-530`) — the PATCH
> returns `409 INVALID_STATUS_TRANSITION` and the generic catch toast hides the cause. A delivered
> order can only go to `paid`. Full write-up: [admin_overview_be.md Flag 2](admin_overview_be.md).
> Cancel works correctly from `pending`/`confirmed`/`preparing`.

---

## 8. Multi-device sync — one manager tap, four screens move

```
   THE INVARIANT:  no arrow goes browser → browser.
                   Every cross-device update is  browser → BE → (Redis) → browser.
                   The BE order row is the single source; orders:kds / order:<id> /
                   orders:admin / queue:/tables: are just its loudspeakers.

   manager taps "› preparing" (order A)
        │ PATCH /orders/A/status
        ▼
   BE order.status=preparing  ──▶ Redis publish ──┬─▶ KDS column moves            (WS orders:kds)
                                                   ├─▶ this + other overviews patch (WS orders:kds)
                                                   ├─▶ customer /order/A bar fills  (SSE order:A)
                                                   └─▶ customer /tracking re-renders (SSE queue:/tables:)
```

---

## 9. Reload (F5) behavior — this page recovers from the BE, nothing else

Because this page persists **nothing**, an F5 is the simplest case in the whole system: drop all
memory caches, re-fetch from the BE, reconnect the realtime channels.

```
   PAGE            HAS URL id?   SOURCE OF TRUTH ON RELOAD              RESULT
   ─────────────   ───────────   ────────────────────────────────────  ──────────────────────────
   admin overview  no            REST: GET /tables + GET /orders/live   full recovery from BE
                                 + WS/SSE reconnect                     (history lazy on open)
   (contrast)
   /order/<id>     YES           ▓ order_cache → REST → SSE             recovers from localStorage+URL
   /tracking       no            ▓ activeOrderId (persisted)            recovers IF a followed order
```

> Local UI state that **does** die on F5 and does **not** recover: `kiemTraIds` (Zone C selections),
> `checkedTableIds`, `searchQuery`, `viewMode`, the open/closed state of PaidLog/CancelLog — all
> plain `useState` ([`page.tsx:108-115`](../../../../../fe/src/app/(dashboard)/admin/overview/page.tsx)).
> This is fine: they are workspace toggles, not data.

---

## 10. Durability matrix — what survives what

| Datum | Lives in | Survives F5? | Survives new device? | Scope |
|---|---|---|---|---|
| `['orders','live']`, `['tables']`, `['orders','history']` | ░ TanStack (memory) | ❌ refetched | ❌ | overview tab only |
| `kiemTraIds` / `checkedTableIds` / `searchQuery` / `viewMode` | ░ `useState` | ❌ | ❌ | overview tab only |
| **the order row + status** | **BE (MySQL)** | ✅ | ✅ | every page, every device |
| payment row | **BE (MySQL)** | ✅ | ✅ | Zone E + receipts |
| realtime deltas | Redis pub/sub (ephemeral) | n/a (re-derived) | ✅ (any subscriber) | all live surfaces |

> **The mental model in one line:** the overview page is a **stateless projector + mutator of the
> BE order row** — it holds nothing durable of its own; it PATCHes the one shared row, and Redis
> fans every change out to the KDS and the customer's screens. Cross-page continuity here is *all*
> server, *zero* browser.

---

## 11. Source & rule map

| Topic | Source of truth |
|---|---|
| On-page (cross-component) flow | [admin_overview_crosscomponent_dataflow.md](admin_overview_crosscomponent_dataflow.md) |
| Page zones / wireframe / object model | [admin_overview.md](admin_overview.md) |
| BE endpoints, auth, caching, errors, flags | [admin_overview_be.md](admin_overview_be.md) |
| Loading / connection states | [admin_overview_loading.md](admin_overview_loading.md) |
| Full floor narrative | [SCENARIO_OVERVIEW_FLOOR.md](SCENARIO_OVERVIEW_FLOOR.md) |
| KDS cook board (downstream) | [../../staff/staff_kds/staff_kds.md](../../staff/staff_kds/staff_kds.md) |
| Customer order detail (downstream) | [../../customer/customer_order_detail/customer_order_detail.md](../../customer/customer_order_detail/customer_order_detail.md) |
| Customer tracking (downstream) | [../../customer/customer_tracking/customer_tracking.md](../../customer/customer_tracking/customer_tracking.md) |
| `Order` / `OrderItem` / status types | [`fe/src/types/order.ts`](../../../../../fe/src/types/order.ts) |
| Admin live orders WS + new-order SSE | [`fe/src/hooks/useOverviewWS.ts`](../../../../../fe/src/hooks/useOverviewWS.ts) · [`useAdminSSE.ts`](../../../../../fe/src/hooks/useAdminSSE.ts) |
| Status transitions + cancel/payment rules | [../../../02_spec/BUSINESS_RULES.md](../../../02_spec/BUSINESS_RULES.md) · [../../../07_business_logic/LOGIC_BE.md](../../../07_business_logic/LOGIC_BE.md) |
| Realtime config (channels, reconnect) | [../../../02_spec/BUSINESS_RULES.md §6](../../../02_spec/BUSINESS_RULES.md#6-realtime-config) |
