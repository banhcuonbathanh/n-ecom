# Tracking — Known Code Bugs (found during `/page-doc-set customer_tracking`)

> **TL;DR:** 4 live code bugs surfaced while tracing `/tracking` against source on branch
> `experience_claude.md_system_1`. These are **code** mismatches, not stale docs — the handbook
> (`REALTIME_SSE.md` / `API_SPEC.md`) already documents the correct names. None are fixed yet;
> the doc skill does not touch app code. Logged in
> [../../07_business_logic/LOGIC_INDEX.md Decision Log (2026-06-14)](../../07_business_logic/LOGIC_INDEX.md#decision-log)
> and flagged in [customer_tracking_be.md Flags 1–6](customer_tracking_be.md).
>
> Source files: `fe/src/hooks/useOrderMonitorSSE.ts` · `fe/src/app/(shop)/tracking/page.tsx` ·
> `be/internal/service/order_service.go` · `be/internal/sse/monitor_handler.go`.

---

## Severity at a glance

| # | Bug | Severity | Surface affected | Fix side |
|---|---|---|---|---|
| 1 | Live status badge never updates from SSE (`order.status` vs `order_status_changed`) | 🔴 High — core feature dead | `/tracking` + admin floor monitor (same hook/route) | FE (or BE) — 1 line |
| 2 | `item_progress` events published but not consumed | 🟠 Medium — partial live data | `/tracking` | FE |
| 3 | Queue position / ETA are FE-computed; BE sends `0` placeholders | 🟡 Low — works, but misleading contract | `/tracking` | BE or accept-as-is |
| 4 | Dead outputs: `tableStatuses`, `reconnect()`, `RECONNECT.showBannerAfter` | 🟡 Low — dead code / missing UI | `/tracking` | FE |

---

## Bug 1 — 🔴 Live order-status badge is dead on `/tracking`

**Symptom.** A guest watching `/tracking` does **not** see the status badge advance when the
kitchen moves the order `pending → confirmed → preparing → ready`. The badge only changes if an
item is separately added/updated/cancelled (which forces a REST refetch), or on a manual reload.

**Root cause — event-type mismatch.**
- BE publishes every status transition as `type:"order_status_changed"` on the `order:<id>`
  channel — [`order_service.go:552`](../../../../../be/internal/service/order_service.go#L552)
  (status update) and [`:745`](../../../../../be/internal/service/order_service.go#L745) (auto-ready),
  via `publishOrderEvent` ([`:806-819`](../../../../../be/internal/service/order_service.go#L806)).
- The FE monitor hook only handles `case 'order.status'`
  ([`useOrderMonitorSSE.ts:67-69`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts#L67)) to set
  `orderStatus`. `"order_status_changed"` never matches that case, so `orderStatus` stays `null`.
- The page then renders `effectiveStatus = orderStatus ?? order?.status`
  ([`page.tsx:44`](../../../../../fe/src/app/(shop)/tracking/page.tsx#L44)) — i.e. it silently falls
  back to the **last `GET /orders/:id` snapshot**, which is only refetched on `items_*` events
  ([`page.tsx:40-42`](../../../../../fe/src/app/(shop)/tracking/page.tsx#L40)).

**Cross-cutting.** The same `/sse/order-monitor/:id` route + the same broken listener pattern is
reused by the admin floor monitor (`REALTIME_SSE.md:135`). The stale doc
`customer/customer_menu/customer_menu_crosspage_dataflow.md:271,284` lists `order.status` as a real
wire event — it documents the FE's broken expectation, not the wire.

**Suggested fix (FE, 1 line).** In `useOrderMonitorSSE.ts`, change the case to match the publisher:
```ts
case 'order_status_changed':
  if (data.status) setOrderStatus(data.status as OrderStatus)
  break
```
⚠️ Verify the payload field — `publishOrderEvent` marshals `orderEvent{Type, OrderID, Status, …}`
([`order_service.go:806-813`](../../../../../be/internal/service/order_service.go#L806)), so
`data.status` is correct. (Alternative: align the BE to emit `order.status` — but `order_status_changed`
is the name already used by KDS/POS/admin, so fixing the FE listener is the smaller, safer change.)

---

## Bug 2 — 🟠 `item_progress` published but not consumed → cooking progress not live

**Symptom.** Per-item progress (e.g. "ra 1/2" in `OrderDetailCard`) does not move in real time as
the chef serves portions; it only updates when a whole item is added/updated/cancelled (which
triggers a refetch), not on each qty-served increment.

**Root cause.** `publishItemEvent` emits `type:"item_progress"` on `order:<id>` on every
qty-served change
([`order_service.go:998-1010`](../../../../../be/internal/service/order_service.go#L998)), but the
monitor hook's switch has no `item_progress` case
([`useOrderMonitorSSE.ts:66-89`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts#L66)) — only
`items_added` / `item_updated` / `item_cancelled` trigger `setItemsChangedAt` → refetch.

**Suggested fix (FE).** Add an `item_progress` case that bumps `itemsChangedAt` (cheap: reuses the
existing refetch path), or apply the `qty_served` delta from the payload to local state for a
zero-refetch update.

---

## Bug 3 — 🟡 Queue position / ETA are FE-computed; BE sends placeholders

**Symptom.** Not a user-visible defect today, but a misleading contract: the `queue.update`
payload's `position` and `estimatedMinutes` are always `0` on the wire.

**Root cause.** `buildMonitorPayloads` builds `queuePayload` with `Position`/`EstimatedMinutes`
left at their zero value
([`order_service.go:875-928`](../../../../../be/internal/service/order_service.go#L875)). The FE
recomputes them client-side: `position = idx+1`, `estimatedMinutes = idx*3`
([`useOrderMonitorSSE.ts:70-79`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts#L70)).

**Suggested action.** Either drop the unused BE fields from the payload (avoid implying they carry
data), or compute them server-side so every consumer agrees. Low priority — current behaviour is
correct, just duplicated/misleading.

---

## Bug 4 — 🟡 Dead outputs in the monitor hook

**Symptom.** Three hook outputs / constants are defined but never wired:
- `tableStatuses` — updated on `tables.status` events
  ([`useOrderMonitorSSE.ts:81-82`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts#L81)) and
  returned ([`:120`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts#L120)), but `page.tsx:36`
  never destructures it → the floor table-grid the BE pushes is invisible on `/tracking`.
- `reconnect()` — returned ([`:120`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts#L120)) but
  not destructured in `page.tsx`; `ConnectionErrorBanner` is display-only, so there is no
  "Thử lại" button for the guest.
- `RECONNECT.showBannerAfter = 3` ([`:11`](../../../../../fe/src/hooks/useOrderMonitorSSE.ts#L11))
  is never referenced — the banner shows immediately on `!sseConnected`
  ([`page.tsx:129`](../../../../../fe/src/app/(shop)/tracking/page.tsx#L129)), not after 3 attempts.

**Suggested action.** Decide intent per item: render `tableStatuses` (or drop it), wire
`reconnect()` to a retry button on the banner (or drop it), and either honour `showBannerAfter` or
delete the dead constant.

---

## Next step

These are not yet on `docs/tasks/MASTER_TASK.md`. Per CLAUDE.md, a fix task must be registered +
ALIGNed before any code change. Recommended first task: **Bug 1** (highest impact, ~1-line FE
change), then batch Bugs 2 & 4 (same hook file).
