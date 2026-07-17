# KDS — Known Code Bugs (found during `/page-doc-set staff_kds`)

> **TL;DR:** 2 live code bugs surfaced while tracing `/kds` against source on branch
> `experience_claude.md_system_1`. These are **code** mismatches, not stale docs — the handbook
> (`API_SPEC.md` / `REALTIME_SSE.md`) already documents the correct route + response shape; the FE
> diverges from it. Neither is fixed yet; the doc skill does not touch app code. Per CLAUDE.md a
> fix must be registered in `MASTER_TASK.md` + ALIGNed before any code change. Logged in
> [../../07_business_logic/LOGIC_INDEX.md Decision Log (2026-06-16)](../../07_business_logic/LOGIC_INDEX.md#decision-log)
> and flagged in [staff_kds_be.md Flags 1–2](staff_kds_be.md#flags).
>
> Source files: `fe/src/app/(dashboard)/kds/page.tsx` · `be/cmd/server/main.go` ·
> `be/internal/handler/order_handler.go` · `be/internal/service/order_service.go`.

---

## Severity at a glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | Tap-to-serve PATCHes a non-existent route → 404; item progress unservable from the KDS | 🔴 High — core feature dead | `/kds` (also any future per-item serve UI) | FE |
| 2 | Card header shows the table **UUID** instead of `table_name` | 🟠 Medium — every card mislabelled | `/kds` | FE |

---

## Bug 1 — 🔴 Tap-to-serve hits a 404 (wrong path + wrong body)

**Symptom.** A chef taps an item line to mark one portion served. Nothing advances — `còn ×N`
never drops, no line strikes through — and a `Không thể cập nhật món` toast fires on every tap.
The order can therefore never auto-transition to `ready` from kitchen action (`maybeAutoReady`
fires only when `qty_served` reaches `quantity`).

**Root cause — route mismatch, compounded by an empty body.**
- The FE mutation PATCHes a **5-segment** path:
  [`kds/page.tsx:160-161`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L160) →
  `api.patch(\`/orders/${orderId}/items/${itemId}/status\`, {})` →
  `PATCH /orders/<orderId>/items/<itemId>/status`.
- No such route is registered. The only item-status route is the **3-segment**
  `PATCH /orders/items/:id` (item id only) →
  [`main.go:250`](../../../../../be/cmd/server/main.go#L250)
  `v1.PATCH("/orders/items/:id", authMW, middleware.AtLeast("chef"), orderH.UpdateItemServed)`.
  Gin matches none of `/orders/:id/status` (`:237`), `/orders/items/:id` (`:250`), etc. → **404**;
  the mutation's `onError` toast fires ([`kds/page.tsx:162`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L162)).
- Even if the path were corrected, the body is `{}`. `UpdateItemServed` binds
  `{qty_served int32 \`binding:"min=0"\`}`
  ([`order_handler.go:236`](../../../../../be/internal/handler/order_handler.go#L236)) and **SETs**
  (not increments) `qty_served`
  ([`order_service.go:701-714`](../../../../../be/internal/service/order_service.go#L701)) — an empty
  body would set `qty_served = 0`.

**Consequence.** The `item_progress` event the KDS listens for
([`kds/page.tsx:129-144`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L129)) is only ever
produced by `UpdateItemServed` ([`order_service.go:722`→`:1009`](../../../../../be/internal/service/order_service.go#L722)).
Since the KDS can't reach that endpoint, the KDS never originates item progress (it would still
*display* progress if another correctly-wired client served the item).

**Suggested fix (FE).** Point the mutation at the real route and send the incremented absolute
value (the item carries the current `qty_served`):
```ts
// kds/page.tsx — patchItemStatus
mutationFn: ({ itemId, qtyServed, quantity }: {...}) =>
  api.patch(`/orders/items/${itemId}`, { qty_served: Math.min(qtyServed + 1, quantity) }),
```
The mutation must thread `item.qty_served` + `item.quantity` from the tapped row
([`kds/page.tsx:228,234`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L228)); `orderId` is not
part of the BE route. `UpdateItemServed` then publishes `item_progress` and runs `maybeAutoReady`.

---

## Bug 2 — 🟠 Card header shows the table UUID, not the table name

**Symptom.** Every order card's header reads `Bàn <uuid>` (e.g. `Bàn 5f3a...`) instead of the
friendly table label (`Bàn 03`) the wireframe shows.

**Root cause.** The KDS renders the raw foreign key:
[`kds/page.tsx:214`](../../../../../fe/src/app/(dashboard)/kds/page.tsx#L214) →
`{order.table_id ? \`Bàn ${order.table_id}\` : 'Mang về'}`. But `GET /orders` / `GET /orders/:id`
already resolve and return `table_name` (`orderJSON` resolves it via
`tableRepo.GetTableByID`, [`order_handler.go` serializer](../../../../../be/internal/handler/order_handler.go#L318);
service [`order_service.go:137,164`](../../../../../be/internal/service/order_service.go#L137)). The
FE simply reads the wrong field.

**Suggested fix (FE).** Use `order.table_name` (fall back to `table_id` only if empty):
```ts
{order.table_id ? `Bàn ${order.table_name || order.table_id}` : 'Mang về'}
```
Confirm `table_name` is on the FE `Order` type (`fe/src/types/order.ts`); add it if missing.

---

## Next step

Neither bug is on [`docs/tasks/MASTER_TASK.md`](../../../../tasks/MASTER_TASK.md) yet. Per CLAUDE.md a
fix must be **registered + ALIGNed** before any code change. **Recommended first:** Bug 1 — it
disables the KDS's primary action (marking food served) and silently blocks auto-ready. Bug 2 is a
1-field display fix that can ride along. Both are **FE-only** changes.
