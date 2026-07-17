# Customer Order List (`/order`) — Doc vs. Code (Detailed Audit)

> **Scope:** a read-only audit of the `customer_order_list` doc-set against the running FE/BE code on
> branch `experience_claude.md_system_1_test_iphon2_change_code`.
> **Axes (5):** ① component visuals · ② cross-component dataflow · ③ cross-page dataflow ·
> ④ loading behaviour · ⑤ FE⇄BE data model.
> **Read-only — no code or docs were changed.** This file + its VI mirror + the visual mockup + the
> shared `COMPARISON_TRACKER.md` are the only writes.
> **Method:** the FE core (`order/page.tsx`, `OrderDetailSheet.tsx`, `useOrderSSE.ts`, `cart.ts`,
> `TableConfirmModal.tsx`, `storage-keys.ts`, `types/order.ts`) was read by hand; the BE Go surface was
> traced by 1 parallel Sonnet agent; **every 🔴 was re-verified by hand** against the cited file.
> **Excluded:** Area ② (cross-component dataflow) — the page has **no** `_crosscomponent_dataflow.md`
> and no shared store of its own (it reads localStorage directly), so the axis does not apply.
> **Date:** 2026-06-20.

---

## Executive Summary

> **Headline:** this is one of the most code-accurate doc-sets in the repo — almost every `file:line`
> in `_be.md` / `_crosspage_dataflow.md` / `_loading.md` is exact, and Flags A/B/C/E correctly
> document real live code bugs. The audit found **one substantive doc drift** (Flag D is stale —
> `filling` was dropped) plus a cluster of minor line-offset / version drifts, and **re-confirmed four
> real code bugs** the doc-set already flags.

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Component visuals | Mostly accurate; overlay under-described, DishRow hides nhân/note | 0 | 2 | 4 |
| ② Cross-component dataflow | N/A — no such doc; page has no own store | — | — | — |
| ③ Cross-page dataflow | Accurate; Flag D stale; cart version + line offsets | 1 | 2 | 6 |
| ④ Loading behaviour | Fully accurate | 0 | 0 | 5 |
| ⑤ FE⇄BE data model | Handler/service/SSE exact; serializer field drift + route offsets | 0 | 3 | 7 |
| **Confirmed live code bugs** (doc accurate) | A · B · C re-verified against code | 3 | — | — |
| **Total** | | **4** | **7** | **22** |

---

## 🔴 RAISE-MY-VOICE Headline Findings (hand-verified)

1. **🔴 DOC DRIFT — Flag D is stale: `order_items.filling` no longer exists anywhere.**
   The doc-set (`_crosspage_dataflow.md` §11 Flag D + the root `CLAUDE.md` "OC-4 read views render
   filling" narrative) claims `filling` was added (OC-1, migration 016) and is a code-vs-spec drift
   because the FE type lacks it. **Code reality:** migration `017_drop_order_item_filling.sql`
   **dropped** the column — it backfills nhân (thịt/mộc nhĩ) into `toppings_snapshot` then
   `ALTER TABLE order_items DROP COLUMN filling`. The serializer emits **no** `filling`
   (`order_handler.go:358-370`); the FE `OrderItem` has **no** `filling` (`order.ts:15-27`). All three
   layers are now consistent — via `toppings_snapshot`, not `filling`. The doc is describing a world
   two migrations out of date. → **Doc fix:** rewrite Flag D to "nhân is a topping in
   `toppings_snapshot` (TOP epic, migration 017); `filling` removed."

2. **🔴 CODE BUG (doc-accurate, Flag A) — `item_cancelled` SSE event is never handled FE-side.**
   The BE publishes `type:"item_cancelled"` on `DELETE /orders/items/:id`
   (`order_service.go:642`), but `useOrderSSE`'s `switch (evt.event)` has cases only for `order_init`,
   `order_status_changed`, `order_cancelled`, `item_progress`, `order_completed`
   (`useOrderSSE.ts:83-123`) — **no `item_cancelled`**. A cancelled item is not removed live; the
   overlay relies on the local mutation toast and only reconciles on the next snapshot/reload. The
   doc-set documents this accurately → this is a **code fix**, not a doc fix.

3. **🔴 CODE BUG (doc-accurate, Flag B) — a 404 leaves the sheet spinning forever.**
   `useOrderSSE` computes and returns `isNotFound` (set at `useOrderSSE.ts:60`, returned at `:159`),
   but `OrderDetailSheet` destructures only
   `{ order, progress, connectionError, notification, clearNotification }`
   (`OrderDetailSheet.tsx:45`) — **`isNotFound` is never read**. Tapping a card for a soft-deleted or
   foreign-table order with no cache entry shows "Đang tải đơn hàng..." indefinitely
   (`OrderDetailSheet.tsx:206-212`), with no error and no exit but the close button. Doc-accurate →
   **code fix**.

4. **🔴 CODE BUG (doc-accurate, Flag C) — list cards never refresh after the overlay updates them.**
   `loadCachedOrders()` runs once in `useEffect([], [])` at mount (`order/page.tsx:37-39`). Closing
   the overlay (`setSelectedOrderId(null)`) does **not** re-scan. After the overlay's SSE loop writes
   a fresher status into `order_cache_<id>`, the list card still shows the **old** status until a
   reload. Doc-accurate → **code fix** (re-scan on overlay close).

---

## Dead / unreachable code found

- **No dead FE components** on this page — `order/page.tsx`, `OrderDetailSheet`, `useOrderSSE` are all
  reachable; `StatusBadge` and `ConnectionErrorBanner` are imported and rendered.
- **BE `item_status` is dead from this page's perspective:** the serializer emits `item_status`
  (`order_handler.go:367`) but the FE `OrderItem` type has no such field — the FE re-derives status
  client-side via `deriveItemStatus()` (`order.ts:9-13`). The field is consumed elsewhere (KDS), not
  here.
- **Migration 017's `+goose Down` is functionally dead** — it re-adds the `filling` column schema but
  cannot un-merge the backfilled topping entries (acknowledged in its own comment).

---

## Area ① — Component visuals

**Verdict:** the list-page render matches the `customer_order_list.md` ASCII closely. Two real gaps:
the `OrderDetailSheet` overlay is far richer than the one-line Zones entry, and the overlay's `DishRow`
renders no nhân/topping/note.

| Component / Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Order card | "Bàn 03 #BC-0042 [preparing] 105.000đ ▸" + progress + "3/6 phần đã ra" + time + dish preview | Matches: name/order_number/`StatusBadge`/total/chevron, active-only progress bar, "{served}/{total} phần đã ra" + `timeAgo`, dish-name preview with "+N món" (`order/page.tsx:104-144`) | 🟢 | — |
| "Xoá lịch sử" button | drawn in the header ASCII unconditionally | only rendered when `orders.length > 0` (`order/page.tsx:63-71`) | 🟢 | optional doc note |
| Empty state | "🛍 Chưa có đơn hàng nào / Quét mã QR…" | `ShoppingBag` icon + same two lines (`order/page.tsx:75-87`) | 🟢 | — |
| Progress bar | "shown only while status ∉ {delivered, cancelled}" | `isActive` gate at `order/page.tsx:95,118` | 🟢 | — |
| Detail overlay (Zones table) | one row: "`OrderDetailSheet` · slide-up detail · `GET /orders/:id`" | The overlay renders **three cards** (collapsible dish detail w/ combo grouping + per-item Huỷ; a full summary table Tên/SL/Ra/Còn/Đơn giá/Tổng + Huỷ; a money breakdown Đã dùng/Còn lại/Tổng cộng), a completed banner, a cancel-whole-order button, an add-more button, and **two modals** (notification + confirm-cancel) (`OrderDetailSheet.tsx:170-508`) | 🟡 | Doc fix: expand the overlay description / draw it in the visual mockup |
| `DishRow` content | (not specified) | renders only name + ×qty + ×served + còn ×remaining + Huỷ (`OrderDetailSheet.tsx:510-544`) — **never** `toppings_snapshot` or `note`, so post-TOP-epic nhân and item notes are invisible to the customer | 🟡 | Code: render `toppings_snapshot` (nhân) + `note` in `DishRow`. ❓ UNVERIFIED whether the product `name` already encodes nhân |

**Verified-matching:** header title + icon, card border/layout, status badge component, progress
math (combo headers filtered, `order/page.tsx:91-94`), empty-state copy.

---

## Area ③ — Cross-page dataflow

**Verdict:** the `order_cache_*` hub model, the submit-path handoff, and the durability matrix are
accurate and exactly cited. Flags A/B/C/E re-confirmed. One stale flag (D) and two minor drifts.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Flag D — `filling` | OC-1 added `filling`; missing from FE type = drift | Dropped by migration `017_drop_order_item_filling.sql`; gone from DB, serializer (`order_handler.go:358-370`), FE type (`order.ts:15-27`) | 🔴 | Doc fix — see headline #1 |
| `clearCart()` fields | wipes items, tableId, tableName, activeOrderId, paymentMethod, orderNote @ `cart.ts:89` | exact: `set({ items:[], tableId:null, tableName:null, activeOrderId:null, paymentMethod:null, orderNote:'' })` (`cart.ts:89`) | 🟢 | — |
| `partialize` | `(s)=>({orderNote, activeOrderId})` @ `cart.ts:153` | exact (`cart.ts:153`) | 🟢 | — |
| Cart persist version | "CART_CONFIG v3" / key `cart-config-v3` | key string is still `cart-config-v3` (`storage-keys.ts:6`) but persist `version: 5` with migrate steps for v<2…v<5 (`cart.ts:129-150`) | 🟡 | Doc fix: note version is 5, key name retains the v3 suffix |
| `TableConfirmModal` cache write | `:37` | `localStorage.setItem(ORDER_CACHE+id, …)` at `TableConfirmModal.tsx:37` | 🟢 | — |
| `checkout/page.tsx` cache write | `:64-70`, `:68` | not re-opened this run | ❓ UNVERIFIED | open `checkout/page.tsx` to confirm |
| `STORAGE_KEYS.CART_CONFIG` line | `storage-keys.ts:5` | actually `storage-keys.ts:6` (`ORDER_CACHE` is `:3` ✅) | 🟢 | line offset |
| "Thêm món" handoff | `setTableId`+`setActiveOrderId`+`push('/menu')` @ `OrderDetailSheet.tsx:405-409` | at `:406-408` inside the `:403-415` button | 🟢 | minor offset |
| Flag A — `item_cancelled` unhandled | accurate | confirmed `useOrderSSE.ts:83-123` (no case) vs `order_service.go:642` | 🔴 (code) | code fix — headline #2 |
| Flag B — `isNotFound` unconsumed | accurate | confirmed `OrderDetailSheet.tsx:45` vs `useOrderSSE.ts:159` | 🔴 (code) | code fix — headline #3 |
| Flag C — cards not refreshed | accurate | confirmed `order/page.tsx:37-39` mount-only | 🔴 (code) | code fix — headline #4 |
| Flag E — `clearAll` omits `setActiveOrderId` | accurate | confirmed `order/page.tsx:41-51` (no `setActiveOrderId`) | 🟢 (doc accurate) | code fix (low priority) |

**Verified-matching:** `ORDER_CACHE='order_cache_'` (`storage-keys.ts:3`), three-writer/two-reader
hub, `loadCachedOrders` scan+sort (`order/page.tsx:10-24`), `isActive` expression parity
(list `:95` / sheet `:134`), durability matrix (items/tableId/tableName memory-only via partialize).

---

## Area ④ — Loading behaviour

**Verdict:** fully accurate — every loading claim traced to code holds.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| List page has no isLoading/skeleton | synchronous localStorage scan, empty-flash 1 frame | no `isLoading`, `useEffect([])` → `loadCachedOrders()` (`order/page.tsx:33-39`) | 🟢 | — |
| Overlay instant-paint from cache | Phase A reads cache before SSE | `useOrderSSE.ts:33-38` | 🟢 | — |
| REST snapshot then SSE | Phase B `GET /orders/:id`, Phase C SSE | `useOrderSSE.ts:54-62` / `:64-143` | 🟢 | — |
| Reconnect config | max 5, base 1 s, max 30 s, banner after 3 | `RECONNECT` (`useOrderSSE.ts:16-21`); backoff `:136-140`; banner `:134` | 🟢 | — |
| `order===null` spinner | "Đang tải đơn hàng..." | `OrderDetailSheet.tsx:206-212` | 🟢 | — |
| `ConnectionErrorBanner` placement | above scroll area | `OrderDetailSheet.tsx:202` | 🟢 | — |
| `(shop)/loading.tsx` spinner classes | `h-64` / `h-8 w-8` orange ring | not re-opened this run | ❓ UNVERIFIED | open `(shop)/loading.tsx` |

---

## Area ⑤ — FE⇄BE data model

**Verdict:** handler / service / SSE citations are **exact**. The drift is in (a) the order-item
serializer field set vs the FE `OrderItem` type, and (b) a ~13-line offset on the route-group
citations.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `GET /orders/:id` handler | `orderH.Get` @ `order_handler.go:125` | exact (`order_handler.go:125`) | 🟢 | — |
| customer callerID swap | Get `:128-130`, Cancel `:189-191`, CancelItem `:203-205` | all exact | 🟢 | — |
| `GetOrder` / ownership gate | `order_service.go:106-143` / `:116-120` | exact | 🟢 | — |
| `CancelOrder` + 30 % rule | `:558-595` / `:582-588` | exact | 🟢 | — |
| `CancelOrderItem` + served reject | `:598-644` / `:630-632` | exact | 🟢 | — |
| `publishOrderEvent` fan-out | `:806-819` / `:814-818` | exact | 🟢 | — |
| `StreamOrder` + no-ownership (Flag #4) | `sse/handler.go:21-70`, heartbeat `:14`, auth `:20` | exact; no `table_id` check confirmed | 🟢 | — |
| Route group + authMW | `main.go:230-239`, `orderR.Use(authMW)` @ `:231` | group at `main.go:243`, authMW `:244` (block `:243-259`) — ~13-line offset | 🟡 | Doc fix: `:243-259` / authMW `:244` |
| `DELETE /orders/items/:id` line | `main.go:251` | actually `main.go:264`; `:251` is `DELETE /orders/:id` (Cancel) | 🟡 | Doc fix: `:264` |
| FE `OrderItem.flagged` | FE type field | declared `flagged: boolean` (`order.ts:27`) but serializer emits **no** `flagged` (`order_handler.go:358-370`) — always `undefined` at runtime | 🟡 | reconcile: drop the FE field or emit it BE-side |
| Serializer extras | (not in FE types) | emits `item_status` (`:367`) + `created_by` (`:384`), neither in FE `OrderItem`/`Order` | 🟡 | document or strip; FE ignores both |

**Verified-matching:** all four endpoints + auth model + caching ("no Redis read-cache, pub/sub
fan-out only") + error behaviour (404/403/422 mapping) as described in `_be.md`.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Doc fix | Rewrite Flag D — `filling` dropped by migration 017; nhân now lives in `toppings_snapshot` (TOP epic). Same in root `CLAUDE.md` OC-4 narrative. | `customer_order_list_crosspage_dataflow.md` §11; `CLAUDE.md` |
| 2 | 🔴 Code bug | Add an `item_cancelled` case to `useOrderSSE`'s switch (remove the item live) | `fe/src/hooks/useOrderSSE.ts:83-123` |
| 3 | 🔴 Code bug | Consume `isNotFound` in `OrderDetailSheet` — show a "không tìm thấy đơn" state instead of an endless spinner | `fe/src/features/order/components/OrderDetailSheet.tsx:45` |
| 4 | 🔴 Code bug | Re-scan `loadCachedOrders()` when the overlay closes so cards reflect SSE updates | `fe/src/app/(shop)/order/page.tsx:37-51` |
| 5 | 🟡 Code gap | Render `toppings_snapshot` (nhân) + `note` in `DishRow` so the customer sees what they ordered | `fe/src/features/order/components/OrderDetailSheet.tsx:510-544` |
| 6 | 🟡 Doc fix | Correct route citations: group `main.go:243-259`, authMW `:244`, `DELETE /orders/items/:id` `:264` | `customer_order_list_be.md` |
| 7 | 🟡 Doc fix | Note cart persist `version: 5` (key name keeps `cart-config-v3` suffix); fix `CART_CONFIG` line to `storage-keys.ts:6` | `customer_order_list_crosspage_dataflow.md` §2 |
| 8 | 🟡 Code/contract | Reconcile `OrderItem.flagged` (FE declares, BE never emits) + the BE-only `item_status`/`created_by` | `fe/src/types/order.ts`; `order_handler.go:358-388` |
| 9 | 🟢 Doc fix | `clearAll` also should call `setActiveOrderId(null)` (Flag E) — low priority | `fe/src/app/(shop)/order/page.tsx:41-51` |

> **CLAUDE.md note:** the doc fixes (#1, #6, #7) are one ALIGNed doc task. **Each code change (#2–#5,
> #8, #9) must be registered as a row in `docs/tasks/MASTER_TASK.md` before any file is touched** — this
> audit is read-only and does not start them.
