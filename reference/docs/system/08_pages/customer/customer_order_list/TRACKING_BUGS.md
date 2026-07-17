# Order List — Known Code Bugs (found during `/page-doc-set customer_order_list`)

> **TL;DR:** 4 live code bugs (+2 out-of-scope notes) surfaced while tracing `/order` and its
> `OrderDetailSheet` overlay against source on branch `experience_claude.md_system_1`. These are
> **code** mismatches, not stale docs — the handbook (`REALTIME_SSE.md` / `API_SPEC.md`) already
> documents the correct names. None are fixed yet; the doc skill does not touch app code. Logged in
> [../../07_business_logic/LOGIC_INDEX.md Decision Log (2026-06-14)](../../07_business_logic/LOGIC_INDEX.md#decision-log)
> and flagged in [customer_order_list_be.md Flags 1–5](customer_order_list_be.md).
> The same `OrderDetailSheet` + `useOrderSSE` pair powers `/order/:id` (C10), so Bugs 2–4 apply there too.
>
> Source files: `fe/src/app/(shop)/order/page.tsx` · `fe/src/features/order/components/OrderDetailSheet.tsx` ·
> `fe/src/hooks/useOrderSSE.ts` · `fe/src/store/cart.ts` · `be/internal/service/order_service.go` ·
> `be/internal/sse/handler.go`.

---

## Severity at a glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | 404 / foreign order wedges the overlay spinner forever (`isNotFound` never read) | 🔴 High — dead-end UX | `/order` overlay + `/order/:id` | FE |
| 2 | List cards never refetch → stale until the detail sheet is opened | 🟠 Medium — stale data | `/order` list grid | FE |
| 3 | `item_cancelled` SSE event published but not consumed → cancel not live | 🟠 Medium — partial live data | `/order` overlay + `/order/:id` | FE |
| 4 | SSE stream handler does no ownership check (`authMW` only) | 🟡 Low — auth gap | every page using `/orders/:id/events` | BE |
| 5 | `clearAll()` leaves `activeOrderId` in the persisted cart store (out of scope) | 🟡 Low — orphaned state | `/order` → `/menu` / `/tracking` | FE |
| 6 | `OrderItem` type / customer `DishRow` has no `filling` field (out of scope — OC epic) | 🟡 Low — missing detail | `/order` overlay + `/order/:id` | FE |

---

## Bug 1 — 🔴 A 404 (or foreign order) wedges the overlay on its spinner

**Symptom.** Tapping a card whose order was deleted/paid-away on the server (or belongs to another
table) shows "Đang tải đơn hàng..." **forever** — no error, no empty state, no close prompt.

**Root cause.** `useOrderSSE` detects the 404 and sets `isNotFound`
([`useOrderSSE.ts:59-61`](../../../../../fe/src/hooks/useOrderSSE.ts#L59)), and returns it
([`:159`](../../../../../fe/src/hooks/useOrderSSE.ts#L159)). But `OrderDetailSheet` destructures only
`{ order, progress, connectionError, notification, clearNotification }`
([`OrderDetailSheet.tsx:45`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx#L45))
— it never reads `isNotFound`. With `order` left `null`, the render falls into the spinner branch
([`:206-212`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx#L206)) with no exit.

**Suggested fix (FE).** Destructure `isNotFound` and render a "Không tìm thấy đơn hàng" state (with a
close button) when it is true.

---

## Bug 2 — 🟠 List cards never refetch → stale until the sheet is opened

**Symptom.** A card's `status`, `total_amount`, and `qty_served` can be out of date (e.g. order
served/cancelled on another device) and stay wrong until the user taps it open.

**Root cause.** The list reads the localStorage cache **once** on mount —
`useEffect(() => setOrders(loadCachedOrders()), [])`
([`order/page.tsx:37-39`](../../../../../fe/src/app/(shop)/order/page.tsx#L37)) — and never opens a
socket or refetches. `loadCachedOrders` just scans `order_cache_*` keys
([`:10-24`](../../../../../fe/src/app/(shop)/order/page.tsx#L10)). Freshness only arrives when the
overlay's `GET /orders/:id` + SSE run; closing the overlay does **not** re-scan localStorage either.

**Suggested fix (FE).** Re-scan on overlay close (and/or on window focus), or open a lightweight
poll/SSE for any active orders in the list. Low-risk: reuse `loadCachedOrders()` in the
`onClose`/`visibilitychange` handler.

---

## Bug 3 — 🟠 `item_cancelled` published but not consumed → cancel not live

**Symptom.** When an item is cancelled (by this user on another device, or by staff), the dish does
not disappear from the open sheet in real time; it only reconciles on the next REST snapshot/reload.

**Root cause.** `DELETE /orders/items/:id` publishes `type:"item_cancelled"` on the `order:<id>`
channel via `publishOrderEvent`
([`order_service.go:642`](../../../../../be/internal/service/order_service.go#L642),
publisher [`:806-819`](../../../../../be/internal/service/order_service.go#L806)), but the FE event
switch has **no `item_cancelled` case** — it handles only `order_init`, `order_status_changed`,
`order_cancelled`, `item_progress`, `order_completed`
([`useOrderSSE.ts:83-123`](../../../../../fe/src/hooks/useOrderSSE.ts#L83)). The local mutation only
shows a toast and closes the confirm modal
([`OrderDetailSheet.tsx:64-73`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx#L64))
— it never refetches or patches `order`.

**Suggested fix (FE).** Add an `item_cancelled` case that removes the item from `order.items` (or
triggers a refetch). Mirrors the existing `item_progress` patch path.

---

## Bug 4 — 🟡 SSE stream handler does no ownership check

**Symptom.** Any authenticated client (any valid guest/staff JWT) that knows an order id can
subscribe to its live event stream, regardless of which table the order belongs to.

**Root cause.** `StreamOrder` is mounted behind `authMW` only
([`main.go:239`](../../../../../be/cmd/server/main.go#L239)) and the handler itself performs no
`table_id` ownership comparison — it just subscribes to `order:<id>`
([`sse/handler.go:21-70`](../../../../../be/internal/sse/handler.go#L21)). The REST `GET /orders/:id`
and both `DELETE` paths **do** enforce table ownership
([`order_service.go:116-120`](../../../../../be/internal/service/order_service.go#L116)) — the SSE
path is the odd one out.

**Suggested action (BE).** Resolve the order's `table_id` in `StreamOrder` and reject with 403 when a
`role=="customer"` caller's `table_id` does not match — same rule the REST handlers already apply.

---

## Bug 5 — 🟡 (out of scope) `clearAll()` leaves `activeOrderId` in the cart store

**Symptom.** "Xoá lịch sử" wipes the order cache but the persisted cart store still points at a
now-cacheless `activeOrderId` — `/tracking` / "Thêm món" can then reference an order with no cache.

**Root cause.** `clearAll()` removes only `order_cache_*` keys
([`order/page.tsx:41-51`](../../../../../fe/src/app/(shop)/order/page.tsx#L41)); it does not call
`setActiveOrderId(null)`/`clearCart()`. `activeOrderId` is persisted in the cart store
([`cart.ts:46`](../../../../../fe/src/store/cart.ts#L46), persisted via `persist` at
[`:41`](../../../../../fe/src/store/cart.ts#L41); only `clearCart` zeros it,
[`:89`](../../../../../fe/src/store/cart.ts#L89)). Out of this run's scope — note only.

---

## Bug 6 — 🟡 (out of scope) `OrderItem` type / customer `DishRow` has no `filling`

**Symptom.** The OC epic added `order_items.filling` (migration 016) and wired it into admin views,
but the customer order detail does not show it.

**Root cause.** `fe/src/types/order.ts` `OrderItem`
([`order.ts:15-27`](../../../../../fe/src/types/order.ts#L15)) has no `filling` field, and
`DishRow` renders `item.name` only
([`OrderDetailSheet.tsx:512-544`](../../../../../fe/src/features/order/components/OrderDetailSheet.tsx#L512)).
Out of this run's scope — belongs to the OC epic follow-up, not the order-list page doc. Note only.

---

## Next step

These are not yet on `docs/tasks/MASTER_TASK.md`. Per CLAUDE.md, a fix task must be registered +
ALIGNed before any code change. Recommended first task: **Bug 1** (highest impact, small FE change),
then batch Bugs 2 & 3 (same `OrderDetailSheet`/`useOrderSSE` pair, also fixes `/order/:id`).
