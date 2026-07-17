# Order Detail — Code Bugs (`/order/:id`)

> **TL;DR:** 2 **code** bugs found tracing `/order/:id` on branch `experience_claude.md_system_1`.
> Both are FE-side SSE-consumption gaps: the page's own write paths (quantity edit, item cancel)
> publish SSE events the page's hook never handles, **and** the quantity path's TanStack invalidation
> targets a query that doesn't exist — so neither write reflects live; the user must reload.
> These are **code** bugs, not stale docs — the `/page-doc-set` skill does **not** touch app code; it
> records them here for the owner to register + ALIGN before any fix.
> Anchor: [customer_order_detail_be.md](customer_order_detail_be.md) Flags 1–2 ·
> Decision Log: [../../../07_business_logic/LOGIC_INDEX.md](../../../07_business_logic/LOGIC_INDEX.md) (2026-06-16).

---

## Severity at a Glance

| # | Bug | Severity | Surface affected | Fix side |
|---|-----|----------|------------------|----------|
| 1 | Quantity edit never reflects live — dead SSE event **and** dead query invalidation | 🟠 Med | `/order/:id` stepper (also any page using `useOrderSSE`) | FE |
| 2 | Cancelled item stays on screen — `item_cancelled` SSE event unhandled | 🟡 Low | `/order/:id` + `/order` overlay (shared `useOrderSSE`) | FE |

Both are **cross-cutting on the hook** `useOrderSSE` (so they also affect C9 `/order`'s overlay where
the same write exists). The sibling hook `useOrderMonitorSSE` (`/tracking`) already handles both event
types — the gap is specific to `useOrderSSE`.

---

## Bug 1 — Quantity edit never reflects live (dead SSE event + dead invalidation)

**Symptom.** A guest changes a not-yet-served dish's quantity with the QuantityStepper. A toast may
appear, but the dish quantity, the per-product summary total, and "Tổng cộng" on the page **do not
change** until a full reload. On a second device watching the same order, nothing changes at all.

**Root cause — two independent misses on the same write:**

1. **Dead SSE event.** The write succeeds and the BE publishes `type:"item_updated"` to `order:<id>`:
   - Publisher: `UpdateOrderItemQuantity` → `s.publishOrderEvent(ctx, "item_updated", item.OrderID)`
     ([`be/internal/service/order_service.go:696`](../../../../../be/internal/service/order_service.go#L696)).
   - Consumer: `useOrderSSE`'s `onmessage` switch handles `order_init`, `order_status_changed`,
     `order_cancelled`, `item_progress`, `order_completed` — **no `item_updated` case**
     ([`fe/src/hooks/useOrderSSE.ts:83-123`](../../../../../fe/src/hooks/useOrderSSE.ts#L83-L123)).
2. **Dead query invalidation.** The mutation's `onSuccess` calls
   `queryClient.invalidateQueries({ queryKey: ['order', params.id] })`
   ([`fe/src/app/(shop)/order/[id]/page.tsx:59`](../../../../../fe/src/app/(shop)/order/[id]/page.tsx#L59)),
   but the order is held in `useOrderSSE`'s `useState` (seeded by `GET /orders/:id` + SSE deltas) —
   **there is no `useQuery(['order', …])` anywhere**, so the invalidation matches nothing and re-fetches
   nothing.

Because the SSE handler also does **no snapshot replay on (re)connect** (it relays only future deltas,
`sse/handler.go:50-67`), even a reconnect won't repair the view — only a fresh mount's `GET /orders/:id`
does.

**Suggested fix (FE, smallest safe change).** Either (a) add an `item_updated` case to `useOrderSSE`
that re-fetches `GET /orders/:id` (or patches `quantity` from the payload — but the current payload
carries no item fields, so a re-fetch is simplest), **or** (b) make the mutation re-seed the hook
state. Option (a) also fixes the same gap on the C9 overlay. Do **not** rely on the dead
`invalidateQueries` line — remove or repurpose it.

---

## Bug 2 — Cancelled item stays on screen (`item_cancelled` unhandled)

**Symptom.** A guest taps **Huỷ** on a dish (or "Huỷ N món còn lại của combo"). A success toast shows,
but the cancelled row **remains visible** with its old quantity until the page is reloaded; the money
summary does not drop.

**Root cause.** `DELETE /orders/items/:id` succeeds, `RecalculateTotalAmount` runs, and the BE
publishes `type:"item_cancelled"`:
- Publisher: `CancelOrderItem` → `s.publishOrderEvent(ctx, "item_cancelled", item.OrderID)`
  ([`be/internal/service/order_service.go:642`](../../../../../be/internal/service/order_service.go#L642)).
- Consumer: `useOrderSSE`'s switch has **no `item_cancelled` case**
  ([`fe/src/hooks/useOrderSSE.ts:83-123`](../../../../../fe/src/hooks/useOrderSSE.ts#L83-L123)). The
  cancel mutations don't invalidate or re-seed either (`page.tsx:68-77`).

This is the **same root** as the C9 list-page finding (customer_order_list Flag 2) — both pages share
`useOrderSSE`. Lower severity than Bug 1 only because the optimistic toast tells the user it worked.

> **Same root, third event — `items_added`.** `useOrderSSE` also has no case for `items_added`
> ([`order_service.go:516`](../../../../../be/internal/service/order_service.go#L516)), emitted when a
> guest appends dishes via "Thêm món" → `/menu?add_to_order=:id`. So a device left open on `/order/:id`
> won't show newly-added dishes live either. One `useOrderSSE` fix (re-fetch on any unhandled
> order-mutating event) closes all three gaps (`item_updated`, `item_cancelled`, `items_added`).

**Suggested fix (FE).** Add an `item_cancelled` case to `useOrderSSE` that removes the item (payload
carries `order_id` only today, so re-fetch `GET /orders/:id` or extend the publisher to include
`item_id`). One fix covers C9 + C10.

---

## Next Step

Neither bug is on `docs/tasks/MASTER_TASK.md` yet. Per CLAUDE.md, a fix must be **registered +
ALIGNed** before any code change. **Recommended first:** Bug 1 (🟠) — it is the most visible
(quantity is an explicit user action with zero live feedback) and its fix (an `item_updated` →
re-fetch case in `useOrderSSE`) naturally lets Bug 2 ride along on the same hook. Both are FE-only,
single-file changes in `fe/src/hooks/useOrderSSE.ts`.
