# Staff POS `/pos` — Doc vs. Code Comparison (Detailed)

> **Scope:** the `staff_pos` doc-set (`staff_pos.md`, `staff_pos_be.md`,
> `staff_pos_crosspage_dataflow.md`, `staff_pos_loading.md`, `POS_BUGS.md`) vs. the running code on
> branch **`experience_claude.md_system_1_test_iphon2_change_code`**.
> Five axes: ① component visuals · ③ cross-page dataflow · ④ loading · ⑤ FE⇄BE data model.
> (Axis ② cross-component dataflow is **N/A** — the page holds its order in local `useState`
> `PosCartItem[]`, not a shared store; no `_crosscomponent_dataflow.md` exists.)
> **Read-only audit — no app code and no page-doc was changed.** Produced by 3 parallel Sonnet
> agents (areas 1/3/4) + the orchestrator (area 5 inline); every 🔴 re-verified by hand against
> source. Date: **2026-06-23**.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Component visuals | **Badly drifted** — the whole table-picker / "Đặt hộ" feature is missing from the wireframe | 5 | 7 | 6 |
| ③ Cross-page dataflow | **Drifted** — architecture sound, but the `table_id=NULL` assumption is now false repo-wide | 3 | 5 | 10 |
| ④ Loading | **Mostly accurate** — denies a real `<Suspense>` and lists only 2 of 4 queries | 1 | 3 | 12 |
| ⑤ FE⇄BE data model | **Drifted** — BE doc written pre-"Đặt hộ"; omits 2 live endpoints, asserts stale facts | 3 | 3 | 8 |

**Root cause of almost all drift:** the entire doc-set was traced on an **earlier branch
(`experience_claude.md_system_1`)** — *before* the **table-picker + "Đặt hộ" (order-on-behalf)**
feature was added. The doc still describes POS as a pure walk-in, table-less flow and marks
order-on-behalf as `🔮 PLANNED`. That feature now ships, and it invalidates the doc-set's central
assumption that **every POS order has `table_id = NULL` and `customer_name = 'Khách tại quán'`.**

---

## 🔴 RAISE-MY-VOICE Headline Findings (hand-verified)

1. **The whole table-picker / "Đặt hộ" feature is live code, but the doc marks it `🔮 PLANNED` and
   omits it entirely.** `staff_pos.md` TL;DR says *"🔮 PLANNED: order on a customer's behalf"* and its
   ASCII + Zones draw a plain two-pane POS with no table UI. The code ships all of it:
   `TablePickerModal` (`pos/page.tsx:41-97`), a "Chọn bàn / Đổi bàn" header button (`:246-251`), a
   table-name chip (`:242-245`), occupancy computed from `listTables` + `listLiveOrders`
   (`:112-125`), and query-param seeding `?table_id=&table_name=` (`:107-108`). The handoff
   originates at **`TableList.tsx:357`** (`router.push('/pos?table_id=…&table_name=…')`). This is the
   single biggest drift on the page.

2. **The doc's "POS orders always have `table_id = NULL` and `customer_name = 'Khách tại quán'`" is now
   FALSE — and the falsehood cascades to KDS + admin-overview.** When a table is picked, the page sends
   `...(tableId ? { table_id: tableId } : {})` (`pos/page.tsx:184`) and
   `customer_name: tableName ?? 'Khách tại quán'` (`:181`). Server-side, `CreateOrder` then runs the
   table-busy lookup (`GetActiveOrderByTable`, `order_service.go:270-273`) and stores the real
   `table_id` (`:302-303`) — so a POS "Đặt hộ" order can have `table_busy = true` and a non-NULL table.
   `staff_pos_be.md §3` ("`table_id` absent → lookup skipped → stored NULL → `table_busy` always
   false", Flag 3), and `staff_pos_crosspage_dataflow.md §5/§6` (POS orders "never appear in any
   table-slot/floor-grid zone") are all wrong for "Đặt hộ" orders, which carry a real table and the
   **table name as `customer_name`**.

3. **The BE doc's endpoint table is incomplete — it omits 2 of the page's 7 live endpoints.**
   `staff_pos_be.md` "Endpoints Used by This Page" lists 5 rows but the page now also calls
   **`GET /tables`** (`listTables`, `admin.api.ts:167-168`, occupancy source) and **`GET /orders/live`**
   (`listLiveOrders`, `admin.api.ts:172-173`, staleTime 15s) on every mount. Neither appears in the BE
   doc, the loading doc's query table, or the cross-page source map.

4. **CODE BUG (still real, doc-documented): every POS order shows "Đơn #undefined".** `POST /orders`
   returns only `{data:{id, table_busy}}` (`order_handler.go:121`) — no `order_number`. The page
   consumes that thin object as a full `Order` and reads `order.order_number` in the success toast
   (`pos/page.tsx:190`) and the waiting-card header (`:200`); `Order.order_number` is typed `string`
   (`types/order.ts:40`) but the runtime value is `undefined` → both render the literal text
   `undefined`. The redirect still works (it uses `id`). Already logged as **`POS_BUGS.md` Bug 1**;
   re-confirmed on this branch. One-line FE fix: follow the create with `GET /orders/:id` (the pattern
   menu/checkout already use).

> **Notable 🟡 (not promoted to a headline):** `staff_pos_loading.md §2` claims "*no `<Suspense>`*",
> but `pos/page.tsx:31` wraps `POSContent` in `<Suspense fallback={null}>` (required by
> `useSearchParams()`). UX is identical (fallback is `null`), so it is a literal contradiction with no
> user impact.

---

## Dead / Unreachable Components Found

- **None.** `POSPage`, `TablePickerModal`, and `POSContent` are all reachable. The POS WS effect
  handles only `order_status_changed` and silently ignores the other event types that arrive on the
  shared `orders:kds` socket (`new_order`, `item_progress`, `order_cancelled`, …) — this is **by
  design**, not dead code (see Area 3, §8 gap).

---

## Area ① — Component Visuals

**Verdict:** badly drifted — the wireframe predates the table-picker feature and omits it wholesale;
the two-pane skeleton it does draw is otherwise directionally correct.

| Component/Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| **TablePickerModal** | Absent; TL;DR marks order-on-behalf `🔮 PLANNED` | Fully implemented + rendered: 3-col table grid, "Có khách"/"Trống" states, occupied tables disabled, "Khách vãng lai" fallback (`pos/page.tsx:41-97`, opened at `:226`) | 🔴 | Drop `🔮 PLANNED`; add a TablePickerModal zone row |
| **"Chọn bàn / Đổi bàn" header button** | Not drawn | Always-visible header button; label flips on `tableName` (`pos/page.tsx:246-251`) | 🔴 | Add to ASCII + Key Interactions |
| **Table-name chip in header** | Not mentioned | Conditional `bg-primary/10` badge when `tableName` set (`pos/page.tsx:242-245`) | 🔴 | Document the conditional chip |
| **"Đặt hộ" query-param seeding** | Not described | `tableId`/`tableName` seeded from `?table_id=&table_name=` (`pos/page.tsx:107-108`) | 🔴 | Add to entry-points / Key Interactions |
| **Occupancy queries (tables + liveOrders)** | No Zones row | `['tables']` + `['orders','live']` drive `occupiedTableIds` (`pos/page.tsx:112-125`) | 🔴 | Add two Zones rows |
| **Product grid columns** | ASCII draws 3 cols | `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (`pos/page.tsx:262`) | 🟡 | Add responsive footnote |
| **Order line-item layout** | `35.000đ [−]2[+]` inline | Name+price stacked left, stepper right (`pos/page.tsx:293-308`) | 🟡 | Redraw as two-line row |
| **"Tạo Đơn →" loading state** | `[ Tạo Đơn → ]` | `'Đang tạo...'` + disabled while `createOrder.isPending` (`pos/page.tsx:319-323`) | 🟡 | Note loading copy |
| **"Xoá đơn" visibility** | Always shown | Only renders when `cart.length > 0` (`pos/page.tsx:325-333`) | 🟡 | Note conditional |
| **Unavailable "Hết" label** | Dimmed card only | Dimmed + in-card red `text-urgent` "Hết" (`pos/page.tsx:264-274`) | 🟡 | Note the label |
| **Waiting-state button layout** | Stacked vertically | Side-by-side `flex gap-3` (`pos/page.tsx:205-218`) | 🟡 | Redraw side-by-side |
| **POST body fields** | `customer_name:'Khách tại quán'` | Also `customer_phone:'0000000000'`, optional `table_id`, `customer_name = tableName ?? …` (`pos/page.tsx:181-186`) | 🟡 | Document full payload |
| Empty-cart copy `"Chọn món từ menu"` | Quoted literal | Exact (`pos/page.tsx:289`) | 🟢 | — |
| Waiting card copy | "…sẽ tự chuyển…" | "…bạn sẽ được chuyển đến thanh toán tự động." (`pos/page.tsx:203`) | 🟢 | Minor copy |
| CategoryTabs | plain tab row | `sticky top-[108px] z-10` (`CategoryTabs.tsx:12`) | 🟢 | Impl detail |
| AuthGuard / RoleGuard | named in Zones | `getMe()`→`/login`; "Không có quyền…" fallback (`AuthGuard.tsx`, `RoleGuard.tsx:17-20`) | 🟢 | — |

**Verified-matching:** two-pane layout · reused `CategoryTabs` · `[−]/[+]` steppers (qty 0 removes
line) · "Tạo Đơn →" text · waiting card with order number + `⏳ Bếp đang chuẩn bị...` + two buttons ·
WS `order_status_changed` → `router.push('/cashier/payment/:id')` on `ready` · `AuthGuard`+`RoleGuard
minRole=CASHIER` · local `PosCartItem[]` state.

---

## Area ③ — Cross-Page Dataflow

**Verdict:** the fire-and-forget memory model, no-localStorage guarantee, shared WS hub, and
downstream handoff chain are correctly described — but 3 hard contradictions all flow from the
unmodeled "Đặt hộ" feature, and most cited line numbers are stale by ~60-130 lines.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| **"Đặt hộ" handoff INTO `/pos`** | Handoff exists but originator unnamed | Sole originator `TableList.tsx:357`; read at `pos/page.tsx:107-108` | 🟡 | Name `TableList.tsx` in source map |
| **`table_id=NULL` for all POS orders** | §5/§6 assert every POS order has `table_id=NULL` | "Đặt hộ" sends real `table_id` (`pos/page.tsx:184`); stored non-NULL (`order_service.go:302-303`) | 🔴 | Split walk-in (NULL) vs "Đặt hộ" (table) cases |
| **`customer_name` always `'Khách tại quán'`** | §5 hardcoded literal | `tableName ?? 'Khách tại quán'` (`pos/page.tsx:181`) — table name sent when picked | 🔴 | Correct §5; flag KDS/overview deductions |
| **POS orders never appear in table-slot/floor zones** | §6 | "Đặt hộ" orders carry `table_id` → DO appear in those zones (root `TableList.tsx:357`) | 🔴 | Update §6 |
| **WS early-return when no active order** | `pos/page.tsx:56` | `if (!activeOrder) return` at `pos/page.tsx:144` | 🟡 | Fix line number |
| **Auto-redirect / manual buttons** | lines `:66 / :118 / :125` | redirect `:154`, "Đến thanh toán" `:207`, "Tạo đơn mới" `:213` | 🟡 | Fix line numbers |
| **§8 cancel handling** | POS re-fetches on cancel; `status≠ready`→no redirect | POS only re-fetches on `order_status_changed`; a cancel emits `order_cancelled` → POS waiting screen silently stalls, no re-fetch | 🟡 | Correct §8 |
| WS channel / shape · `OrdersWSProvider` in layout · payment page own WS · no POS localStorage | §2/§3/§4 | All confirmed (`OrdersWSContext.tsx`, `(dashboard)/layout.tsx:4`, `storage-keys.ts:1-7` — no POS key) | 🟢 | — |

**Verified-matching:** no-localStorage guarantee · `OrdersWSProvider` in dashboard layout · payment
page opens its own WS + returns `router.push('/pos')` · KDS/overview `ACTIVE` status sets · WS message
guards (`pos/page.tsx:147-148`).

---

## Area ④ — Loading Behaviour

**Verdict:** the "no skeleton / silent-empty / blank auth screen" picture is accurate; two
contradictions — a denied `<Suspense>` and an under-counted query table.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| **`<Suspense>` boundary** | §2: "None — not wrapped in `<Suspense>`" | `<Suspense fallback={null}>` wraps `POSContent` (`pos/page.tsx:31`), required by `useSearchParams()` | 🔴 | Correct §2 |
| **Query inventory** | §3 lists only categories + products | 4 queries fire: `['tables']` 60s + `['orders','live']` 15s also (`pos/page.tsx:112-121`) | 🔴 | Add the 2 occupancy queries |
| **`createOrder` error** | not documented | `onError → toast.error('Không thể tạo đơn hàng')` (`pos/page.tsx:192`) | 🟡 | Document the toast |
| **Global TanStack defaults** | not mentioned | `staleTime:60s, retry:1` (`lib/providers.tsx:8`) | 🟡 | Note global default |
| AuthGuard blank `return null` · RoleGuard denied render · no `loading.tsx` · no `isLoading`/`isError` destructure · silent-empty-on-failure · `isPending` button · waiting screen · CategoryTabs layout-shift · no `enabled` gate | §2-§4 | All confirmed (`AuthGuard.tsx:23`, `RoleGuard.tsx:17-20`, `CategoryTabs.tsx:13-38`, `pos/page.tsx:127-139,262-278,319-323`) | 🟢 | — |

**Verified-matching:** blank auth screen · no route `loading.tsx` · every query defaults `[]` on
failure (network error == empty catalog) · `Đang tạo...` disabled button · waiting card replaces
layout · WS-triggered `GET /orders/:id` has no spinner.

---

## Area ⑤ — FE⇄BE Data Model

**Verdict:** `staff_pos_be.md` was traced on the pre-"Đặt hộ" branch — its endpoint table is
incomplete and several behavioural assertions are now stale. The pipeline it *does* cover
(server-trusted prices, atomic tx, `order:seq` numbering) is accurate; all `main.go` route lines drift
~+13.

| Endpoint/Field | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| **`GET /tables`** (occupancy) | absent from endpoint table | `listTables` → `GET /tables` (`admin.api.ts:167-168`); group `main.go:278` | 🔴 | Add endpoint row |
| **`GET /orders/live`** (occupancy) | absent from endpoint table | `listLiveOrders` → `GET /orders/live` (`admin.api.ts:172-173`); route `main.go:247`, cashier+ | 🔴 | Add endpoint row |
| **`table_id` on POST** | §3 "table_id absent → NULL, busy-lookup skipped, `table_busy` always false" | sent when picked (`pos/page.tsx:184`); busy-lookup runs (`order_service.go:270-273`); stored (`:302-303`) | 🔴 | Rewrite §3 table_id paragraph |
| **`customer_name`** | Flag 3: always `'Khách tại quán'` | `tableName ?? 'Khách tại quán'` (`pos/page.tsx:181`) | 🟡 | Correct Flag 3 |
| **Bug 1 — POST response** | Flag 6 / Bug 1: returns `{id, table_busy}`, POS shows "Đơn #undefined" | confirmed `order_handler.go:121`; read at `pos/page.tsx:190,200`; `order_number:string` `order.ts:40` | 🔴 | Code fix (register MASTER) |
| **POS bypasses `order-payload.ts`** | Flag 2 | confirmed inline `{product_id, quantity}` (`pos/page.tsx:185`) | 🟡 | doc-accurate; consistency gap |
| **Serializer extras** | not modelled | `orderJSON` emits `item_status`/`created_by` (`order_handler.go:358-388`) absent from FE type; FE `OrderItem.flagged` (`order.ts:26`) never emitted | 🟡 | Reconcile type vs serializer |
| **Route line numbers** | `/products :168`, `/categories :186`, orders group `:230`, POST `:232`, GET/:id `:236`, ws `:339` | real: `:180`, `:198`, `:243`, `:245`, `:249`, `:352` | 🟢 | Refresh all `main.go` cites (+~13) |
| `source:'pos'`→`OrdersSourcePos` · status `pending` (no skip-confirm) · server-trusted prices · atomic tx · `order:seq` numbering · `new_order` publish · public catalog GETs | §3 | All confirmed (`order_service.go:262,278,317,322-349`) | 🟢 | — |

**Verified-matching:** `source:'pos'` enum mapping · POS starts `pending` (waiting screen is FE-only) ·
server reads prices via snapshot · one-tx persist · `created_by` = cashier UUID · WS field names match
(`type`/`order_id` on `orders:kds`).

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Doc fix | Drop `🔮 PLANNED`; add TablePickerModal + "Chọn/Đổi bàn" + table chip + "Đặt hộ" seeding + occupancy queries to ASCII/Zones/Key-Interactions | `staff_pos.md` |
| 2 | 🔴 Doc fix | Rewrite the `table_id`/`customer_name`/`table_busy` paragraphs — POS orders CAN carry a real table; correct §3 + Flag 3 | `staff_pos_be.md` |
| 3 | 🔴 Doc fix | Add `GET /tables` + `GET /orders/live` endpoint rows; refresh all `main.go` route lines (+~13) | `staff_pos_be.md` |
| 4 | 🔴 Doc fix | Correct §5/§6 (POS "Đặt hộ" orders DO appear in table-slot/floor zones; KDS shows "Bàn X"); fix stale line numbers | `staff_pos_crosspage_dataflow.md` |
| 5 | 🔴 Doc fix | Acknowledge `<Suspense fallback={null}>`; list all 4 queries; document `createOrder` `onError` toast | `staff_pos_loading.md` |
| 6 | 🔴 Code bug | Fix "Đơn #undefined": follow `POST /orders` with `GET /orders/:id` before `setActiveOrder` (or widen POST response) | `fe/src/app/(dashboard)/pos/page.tsx` (POS_BUGS Bug 1) |
| 7 | 🟡 Code/product | "Tạo đơn mới" orphans the active order — decide cancel-vs-keep | `pos/page.tsx` (POS_BUGS Bug 2) |
| 8 | 🟡 Code | Reconcile FE `OrderItem` type vs `orderJSON` serializer (`item_status`/`created_by`/`flagged`) | `fe/src/types/order.ts` |

> Per CLAUDE.md: the doc fixes (1-5) are one ALIGNed doc task; **each code change (6-8) must be
> registered in `MASTER_TASK.md` before any file is touched.** This skill is read-only and changed
> neither app code nor the page doc-set.
