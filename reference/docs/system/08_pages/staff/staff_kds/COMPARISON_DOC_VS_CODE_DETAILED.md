# KDS (Kitchen Display) — Doc vs. Code, Detailed Comparison

> **Scope:** audits the `staff_kds` doc-set (`staff_kds.md`, `staff_kds_be.md`,
> `staff_kds_crosspage_dataflow.md`, `staff_kds_loading.md`, `KDS_BUGS.md`, `SCENARIO_KDS_COOK.md`)
> against the running code on branch `experience_claude.md_system_1_test_iphon2_change_code`.
> 5 axes: ① component visuals · ② cross-component dataflow (**N/A — no Zustand/shared store; all
> state is local `useState`**) · ③ cross-page dataflow · ④ loading behaviour · ⑤ FE⇄BE data model.
> **Read-only — no code or docs were changed.** Produced by 2 parallel Sonnet agents (Areas 1, 3) +
> orchestrator inline tracing (Areas 4, 5); every 🔴 re-verified by hand against source.
> Code is the source of truth — where doc and code disagree, the code wins and that disagreement is
> the finding. Date: 2026-06-22.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Component visuals | Wireframe is accurate; minor omissions (urgency bar/text colour, caret flip) | 0 | 2 | 11 |
| ② Cross-component dataflow | **N/A** — KDS has no Zustand store, no shared selectors, no localStorage; all state is local `useState` | — | — | — |
| ③ Cross-page dataflow | One real contradiction (badge claim); rest is a faithful, source-traced map | 1 | 2 | 5 |
| ④ Loading behaviour | `staff_kds_loading.md` is exact; one ❓ now resolved (no auth guard) | 0 | 1 | 4 |
| ⑤ FE⇄BE data model | `_be.md` documents the code *including* its bugs; route line-cites drifted | 0 | 2 | 6 |

**Bottom line.** Like `customer_combo_detail` / `customer_order_detail` / `admin_combos`, the KDS
doc-set is a **source-faithful mirror that documents the code including its bugs** — `KDS_BUGS.md`,
the `_be.md` Flags, and `staff_kds.md` §5 already name every real code defect. The **only genuine
doc-vs-code contradiction** is in `staff_kds_crosspage_dataflow.md §1`, which claims the KDS updates
an order's status badge live on `order_status_changed`; the code never does. Everything else flagged
🔴 below is a **doc-confirmed code bug** the audit re-verified, not a doc error.

---

## 🔴 RAISE-MY-VOICE headline findings (hand-verified)

1. **🔴 DOC DRIFT — KDS does NOT update the status badge live; `crosspage §1` says it does.**
   `staff_kds_crosspage_dataflow.md:128-129` (§1 table) claims `confirmed` and `preparing`
   `order_status_changed` events → *"Badge updates, stays on board."* The code's WS handler
   (`kds/page.tsx:149-154`) only **drops** the card when `status ∉ ACTIVE_STATUSES`; it **never
   mutates `o.status`** for an active transition. So when an order goes `confirmed → preparing`
   while it sits on the board, the badge stays **stale** until the next `GET /orders` (staleTime 30s)
   or F5. This is a real doc-vs-code contradiction **and** a minor live-update UX gap. *(The main
   `staff_kds.md:98-99` Key-Interactions entry is accurate — it only describes the removal case; the
   overstatement is confined to the cross-page table.)*

2. **🔴 CODE BUG (doc-confirmed) — tap-to-serve hits a 404; item progress is unservable from the KDS.**
   The item-row `onClick` PATCHes a **5-segment** path
   `/orders/${orderId}/items/${itemId}/status` (`kds/page.tsx:160-161`) with an empty body `{}`.
   **No such route exists** — confirmed: the only item routes are the 3-segment
   `/orders/items/:id/quantity` (`main.go:262`), `/orders/items/:id` (`main.go:263`,
   `UpdateItemServed`, `AtLeast("chef")`), `/orders/items/:id` DELETE (`main.go:264`) → Gin 404 →
   `toast.error('Không thể cập nhật món')` every tap. The KDS's core action (mark a portion served)
   is dead, and `maybeAutoReady` can therefore never fire from kitchen action. Documented at
   `KDS_BUGS.md` Bug 1 / `staff_kds_be.md` Flag 1 — re-verified, still holds.

3. **🔴 SECURITY (doc-confirmed) — the live WS has no role gate; a customer guest token can subscribe
   to `orders:kds`.** The `/ws` group is registered with **zero middleware** (`main.go:350-352`); auth
   is a `?token=` query param parsed inside `wsHandler` and the claims are **discarded**
   (`_, err := jwtpkg.ParseToken(token)`, `websocket/handler.go:40`). Any signature-valid, unexpired
   JWT — including a `customer` guest token — receives every order event on the floor. Shared
   cross-page concern with `admin_overview` (same channel). Documented at `staff_kds_be.md` Flag 4 /
   `staff_kds_crosspage_dataflow.md §11` — re-verified.

> **Dropped on hand-verification:** an Area-1 agent raised a 🔴 claiming the ASCII draws the inline
> status picker *below* the Kiểm tra/Trạng thái action row while the code renders it *above*. Re-read
> of both: the ASCII (`staff_kds.md:33-36`) draws the picker block **above** the action row, and the
> JSX renders the picker (`:257-278`) **above** the action buttons (`:280-304`). They **agree** — no
> contradiction. (Recorded so the next refresh doesn't re-raise it.)

---

## Dead / unreachable code found

- **`/ws/kds` endpoint is dead** — registered at `main.go:351` (`KDSHandler`), identical to
  `LiveHandler` (`/ws/orders-live`, `:352`) on the same `orders:kds` channel
  (`websocket/handler.go:17-24`); no FE ever connects to it (`OrdersWSContext.tsx:38` uses
  `/ws/orders-live`). `staff_kds_be.md` Flag 5 already notes this. 🟢
- **Three `orders:kds` events have no KDS handler** — `items_added` (`order_service.go:516`),
  `item_cancelled` (`:642`), `item_updated` (`:696`) reach the socket but the KDS switch
  (`kds/page.tsx:117-155`) has no `case` for them → silently dropped. `staff_kds.md`/`_be.md` Flag 6
  already note this. 🟡
- **`useOverviewWS.ts:52,67` dead branches** `order_updated` / `order_completed` — the **admin
  overview** subscriber on the *same* `orders:kds` channel carries two cases the BE never publishes
  (grep `be/` = 0). The KDS's own switch has no such branches; this is the cross-page concern flagged
  for the staff_kds run in the tracker (admin_overview headline #3). 🟢
- **`deriveItemStatus()` (`fe/src/types/order.ts:9-13`) is exported but the KDS recomputes the same
  logic inline** (`kds/page.tsx:199,228,229`). Minor dead export. `staff_kds.md` §5 Flag 4. 🟢
- **`order_init` SSE/WS event** is not relevant here (KDS uses WS not `useOrderSSE`); no KDS impact.

---

## Area ① — Component visuals

**Verdict:** the ASCII wireframe + Zones table in `staff_kds.md` are accurate. Two minor visual
elements are omitted from the drawing; the `table_id`-UUID header is a doc-confirmed code bug, not
drift.

| Component/Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Card header table label | Doc flags it as a bug: renders `order.table_id` (UUID), should be `table_name` (`staff_kds.md:25,62,170`) | `kds/page.tsx:214` `order.table_id ? \`Bàn ${order.table_id}\` : 'Mang về'` — UUID rendered, `table_name` ignored | 🟠 | **Code bug (doc-confirmed), not drift.** Code fix: `Bàn ${order.table_name ?? order.table_id}` (see headline #2-adjacent / `KDS_BUGS.md` Bug 2) |
| Urgency vertical bar | Border-colour block (`staff_kds.md:43-47`) describes only `urgencyBorderClass` | A coloured `w-1 h-5` bar left of the table label renders on every card via `urgencyBarClass(mins)` (`kds/page.tsx:212`, fn `:39-43`) | 🟡 | Add the urgency bar to the ASCII header row |
| Elapsed-time colour | Not mentioned in the border block | The "{mins} phút" text is colour-coded via `urgencyTextClass(mins)` (`kds/page.tsx:220`, fn `:45-49`) | 🟡 | Note the elapsed-time colour in the doc |
| Trạng thái caret | ASCII shows only `Trạng thái ▼` (`staff_kds.md:36,67`) | Caret flips: `Trạng thái {isStatusOpen ? '▲' : '▼'}` (`kds/page.tsx:301`) | 🟢 | Add the ▲/▼ flip note |
| Picker vs action-row order | ASCII draws picker above action row (`staff_kds.md:33-36`) | Picker `:257-278` renders above action buttons `:280-304` | 🟢 | **Matches** — agent's 🔴 dropped |

**Verified-matching:** grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
(`kds/page.tsx:194`); heading "KDS — Bếp" (`:192`); empty-state "Không có đơn nào đang chờ 🍜"
(`:185`); card header fields order_number/status-badge/elapsed (`:211-222`); item rows name +
`kdsVariant` label + `còn ×N`/`✓` (`:227-248`); summary "N món · M phần còn lại" (`:251-253`);
picker labels `✓ Phục vụ`/`🛍 Mang đi`/`Huỷ` and identical `{status:'ready'}` payload for both serve
buttons (`:260,266,272`); 🔍 Kiểm tra local-only toggle forcing `border-urgent` (`:206-208,283-291`);
status badge label map (`:51-61`).

---

## Area ③ — Cross-page dataflow

**Verdict:** the cross-page map is a faithful, source-traced description of the `orders:kds` fan-out.
The lone contradiction is the §1 "badge updates" claim (headline #1). One genuine code gap surfaced:
auto-ready skips the monitor broadcast.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `order_status_changed` for active transitions | §1 table: `confirmed`/`preparing` → "Badge updates, stays on board" (`crosspage:128-129`) | Handler only drops card when `status ∉ ACTIVE`; never mutates `o.status` for active transitions (`kds/page.tsx:149-154`) → stale badge until refetch/F5 | 🔴 | Fix doc to say "card stays; badge NOT updated live (stale until 30s refetch/F5)" — and/or add a status-patch branch in code |
| `maybeAutoReady` → monitor broadcast | §5/§8 imply the customer `/tracking` queue updates whenever the KDS advances any order; `publishMonitorBroadcast` "called on every `UpdateOrderStatus`" (`crosspage:243-246`) | `maybeAutoReady` calls `s.repo.UpdateOrderStatus` **directly** (`order_service.go:744`) then only `publishOrderEvent` (`:745`) — it **bypasses** the service-level `publishMonitorBroadcast` at `:553` | 🟡 | Code gap (affects customer_tracking, not KDS render): add `publishMonitorBroadcast` in `maybeAutoReady`, or scope the doc claim to the explicit status path |
| Three ignored `orders:kds` events | §0 channel list omits `items_added`/`item_cancelled`/`item_updated`; Flag 6 documents them ignored | Published at `order_service.go:516/642/696`; no KDS `case` (`kds/page.tsx:117-155`) | 🟡 | Doc-confirmed live-update gap; add the three types to the §0 channel list (note: ignored by FE) |
| Admin `useOverviewWS` dead branches | Not in KDS doc (cross-page concern) | `useOverviewWS.ts:52,67` `order_updated`/`order_completed` — BE never publishes (grep `be/`=0) | 🟢 | Cross-page cleanup (admin_overview headline #3); KDS switch has no such branches |
| WS no role gate | §11: `?token=` parsed, claims discarded; any JWT subscribes (`main.go:337`, `handler.go:40`) | Confirmed `main.go:350-352` (no middleware), `handler.go:40` `_, err := jwtpkg.ParseToken` | 🟢 (line drift `:337→:350`) | Security bug correctly documented (headline #3) |
| `/ws/kds` dead | Flag 5: registered, identical, never consumed | `main.go:351` `KDSHandler`; FE uses `/ws/orders-live` (`OrdersWSContext.tsx:38`) | 🟢 | Doc-accurate |

**Verified-matching:** WS URL `/ws/orders-live?token=` (`OrdersWSContext.tsx:38`);
`(dashboard)/layout.tsx` wraps only `<OrdersWSProvider>` (4 lines); KDS handles exactly
`new_order`/`item_progress`/`order_cancelled`/`order_status_changed` (`kds/page.tsx:117-155`);
dedup by id on `new_order` (`:122-123`); `ACTIVE_STATUSES={pending,confirmed,preparing}` (`:93`);
admin `ACTIVE` adds `ready`,`delivered` (`useOverviewWS.ts:8`); POS subscribes
(`pos/page.tsx:142`); no KDS storage key (`storage-keys.ts:1-7`); `publishOrderEvent` →
`order:<id>` + `orders:kds` (`order_service.go:814-818`); `publishItemEvent` (`:998-1009`);
guest `DELETE`→`order_cancelled` (`:593`) vs PATCH cancel→`order_status_changed` (`:552`).

---

## Area ④ — Loading behaviour

**Verdict:** `staff_kds_loading.md` is exact — every claim re-confirmed against `kds/page.tsx`. The
file's one honest `❓ UNVERIFIED` (auth-guard location) is now resolved.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Route-level auth guard | §1 `❓ UNVERIFIED` — "the actual auth guard location was not traced" | `(dashboard)/layout.tsx` renders only `<OrdersWSProvider>` (4 lines) — **no AuthGuard/RoleGuard**; `kds/page.tsx` has none either. /kds renders for anyone; protection is only the api-client 401 on `GET /orders` (`AtLeast("chef")`) | 🟡 | **Resolves the ❓:** no client-side route guard; note it (and that an unauthorised visitor sees the empty-state, not a redirect) |

**Verified-matching:** `isLoading`/`isError` never destructured — only `data`
(`kds/page.tsx:102`); loading = empty = error all render "Không có đơn nào đang chờ 🍜"
(`:182-188`); `staleTime: 30_000` (`:105`); `useEffect` seed `if (!initial) return`
(`:108-111`); `connected` not consumed (`:114` destructures only `subscribe`); inline new-order
`GET /orders/:id` with silent `catch{}` (`:118-128`); no `loading.tsx` for `(dashboard)/` or
`kds/` — only `(shop)/loading.tsx` + `(dashboard)/admin/loading.tsx` exist; no skeleton.

---

## Area ⑤ — FE⇄BE data model

**Verdict:** `staff_kds_be.md` documents every endpoint, the serializer, and the bugs accurately; the
only drift is stale `main.go` line numbers — one of which now points at the **wrong route**.

| Endpoint/Field/Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `UpdateItemServed` route line | `_be.md` cites `PATCH /orders/items/:id` at `main.go:250` | `:250` is now `PATCH /:id/status` (UpdateStatus); `UpdateItemServed` is at `main.go:263` | 🟡 | More than cosmetic — the cite now points at the wrong route; update to `:263` |
| `/orders` route block lines | group `:230-240`, authMW `:231`, WS `:337-339` | group `:243`, authMW `:244`, `GET ""` ListLive+chef `:246`, `GET /:id` (no role gate) `:249`, `PATCH /:id/status`+chef `:250`, WS group `:350-352` | 🟢 | Refresh line numbers (~+13) |
| 5-segment item route exists? | Bug 1: no such route | Confirmed — only `:262-264` 3-segment item routes; `/orders/:orderId/items/:itemId/status` matches nothing → 404 | 🟢 | Doc-accurate (headline #2) |
| Serializer fields | `table_name` resolved + returned; `item_status` derived; `flagged` never emitted | `order_handler.go:377` `table_name`, `:367` `item_status`, `:384` `created_by`; FE `OrderItem.flagged` (`order.ts:26`) never serialized → always `undefined` | 🟢 | Doc-accurate (§3/§5); `item_status`/`created_by` are BE-only extras not in FE types |
| `validTransitions` | `preparing→ready` only; invalid → 409 | `order_service.go` map: `pending→{confirmed,cancelled}`, `confirmed→{preparing,cancelled}`, `preparing→{ready,cancelled}`, `ready→{delivered}`, `delivered→{paid}` | 🟢 | Doc-accurate (Flag 3) |
| `UpdateItemServed` semantics | binds `{qty_served}` min=0, absolute SET, rejects `>quantity` | `order_service.go:701-723` SETs via `UpdateQtyServed`, rejects `<0\|\|>quantity` → `ErrInvalidInput`; missing id → `errors.Is(sql.ErrNoRows)→ErrNotFound` (proper 404) | 🟢 | Doc-accurate; **not** the admin_ingredients 404→500 trap |
| `filling` column | Flag 7: added by 016, dropped by 017; not in response | grep `filling` in `be/internal/db|service|handler` = 0 hits | 🟢 | Doc-accurate |

**Verified-matching:** `AtLeast("chef")` gate on `GET /orders` (`main.go:246`) and
`PATCH /:id/status` (`:250`); `GET /:id` has no extra role gate (`:249`); `UpdateItemServed`
gated chef (`:263`); serializer shape (`order_handler.go:318-389`); `itemStatus()` derivation;
`maybeAutoReady` only flips when `status==preparing` and all items served (`order_service.go:726-746`).

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug | Point tap-to-serve at `PATCH /orders/items/:id` with `{qty_served: min(qty_served+1, quantity)}`; thread `item.qty_served`+`item.quantity` | `fe/src/app/(dashboard)/kds/page.tsx:159-163` |
| 2 | 🔴 Code bug (security) | Add `authMW` + role gate to the `/ws` group (or validate parsed claims in `wsHandler`) | `be/cmd/server/main.go:350-352`, `be/internal/websocket/handler.go:40` |
| 3 | 🟠 Code bug | Render `order.table_name ?? order.table_id` in the card header | `fe/src/app/(dashboard)/kds/page.tsx:214` |
| 4 | 🔴 Doc fix | Correct `crosspage §1` table: active-status `order_status_changed` keeps the card but does **not** update the badge live | `staff_kds_crosspage_dataflow.md:128-129` |
| 5 | 🟡 Code gap | Add `publishMonitorBroadcast` in `maybeAutoReady` so customer `/tracking` re-sorts on auto-ready | `be/internal/service/order_service.go:726-746` |
| 6 | 🟡 Code gap | Add KDS `case`s (or refetch-on-unhandled-event) for `items_added`/`item_cancelled`/`item_updated` | `fe/src/app/(dashboard)/kds/page.tsx:117-155` |
| 7 | 🟡 Doc fix | Fix `_be.md` `UpdateItemServed` cite `:250→:263`; refresh `/orders` route lines (~+13); add the urgency bar/text colour + caret flip to `staff_kds.md`; note no route-level auth guard in `_loading.md` | the doc-set |
| 8 | 🟢 Code cleanup | Remove `/ws/kds` dead endpoint and `useOverviewWS` `order_updated`/`order_completed` dead branches | `main.go:351`, `useOverviewWS.ts:52,67` |

> Per CLAUDE.md: the doc fixes (#4, #7) are **one** ALIGNed doc task; **each** code change (#1, #2,
> #3, #5, #6, #8) must be registered in `docs/tasks/MASTER_TASK.md` and ALIGNed **before** any file
> is touched. This skill changed nothing — it only surfaces the drift.
