# Admin Overview — Doc vs. Code (Detailed Audit)

> **Scope:** a read-only audit of the `/admin/overview` page doc-set against the **running FE/Go
> code** on branch `experience_claude.md_system_1_test_iphon2_change_code`. Five axes:
> ① component visuals · ② cross-component dataflow · ③ cross-page dataflow · ④ loading behaviour ·
> ⑤ FE⇄BE data model. **Read-only — no code or docs were changed.** Produced by 5 parallel Sonnet
> agents; every 🔴 was re-verified by hand against the cited `file:line`.
>
> **Code wins.** Every "Code reality" cell is traced from source, not recalled. The whole doc-set
> carries the older provenance branch `experience_claude.md_system_1` — this audit re-traced against
> the current `..._test_iphon2_change_code` branch, so most line numbers drifted (see Area 5).
>
> Date: 2026-06-21.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| ① Component visuals | **Drifted** — Zone B drawn wrong; TableGrid missing actions | 2 | 4 | many |
| ② Cross-component dataflow | **Accurate** — one dead-prop bug | 1 | 3 | many |
| ③ Cross-page dataflow | **Accurate** — confirms delivered→cancelled bug + dead WS branches | 1 | 2 | many |
| ④ Loading behaviour | **Accurate** — only line-range drift | 0 | 3 | many |
| ⑤ FE⇄BE data model | **Accurate chains, two real code smells** | 2 | 4 | many |

**Totals: 🔴 6 (deduped to 4 distinct root findings) · 🟡 16 · 🟢 ~30 (mostly stale line refs + branch provenance).**

The BE-view, loading, and dataflow docs are remarkably faithful — their only systemic problem is
**stale `file:line` refs** (the docs were written one branch back; main.go routes alone shifted ~+13
lines). The real product-affecting findings are concentrated in **Area 1 (Zone B is drawn as
something it is not)** and **Area 5 (two dead code paths the FE carries: phantom `amount`, dead WS
events)** — plus the **delivered→cancelled 409 bug** that three separate docs already flag and the
code still ships.

---

## 🔴 RAISE-MY-VOICE — headline findings (hand-verified)

1. **Zone B is drawn as "all active orders (pending→delivered)" with a `[Huỷ]` button — the code
   renders ONLY `pending` orders and has no Huỷ button.**
   `admin_overview.md:26-27` ASCII says *"WaitingSection — TẤT CẢ đơn active (pending→delivered)"*
   with row buttons `[Xác nhận][Kiểm tra][Huỷ]`, and the Zones table (`admin_overview.md:49`) labels
   Zone B "all active orders". But `WaitingSection.tsx:9` is `PREP_STATUSES = new Set(['pending'])`
   and `WaitingSection.tsx:55` filters `PREP_STATUSES.has(o.status) && o.table_id && tableMap.has(...)`
   — confirmed/preparing/ready/delivered never appear. The only row buttons are 🔍 Kiểm tra
   (`WaitingSection.tsx:186`) and a single status-advance button (`WaitingSection.tsx:195-200`) —
   **no Huỷ**. The real header is "Danh sách bàn cần chuẩn bị" (`WaitingSection.tsx:101`). The page
   JSX comment `{/* Zone B — all active orders */}` (`page.tsx:309`) is itself misleading. *Why it
   matters:* the wireframe promises a queue and a cancel action that do not exist; a reader trusts a
   picture that is wrong.

2. **Zone D offers a "Huỷ" button on `delivered` orders, but `delivered → cancelled` is not a valid
   BE transition — every click 409s.** `TableList.tsx:378-385` renders a red **Huỷ ✕** button when
   `order.status === 'delivered'`, wired `onCancel?.(order.id)` → `page.tsx:376-378`
   `handleAction(orderId, 'cancelled')` → `PATCH /orders/:id/status {cancelled}`. The BE
   `validTransitions` map (`order_service.go:524-529`) has `delivered: {paid}` only — no `cancelled`.
   The PATCH returns `409 INVALID_STATUS_TRANSITION` (`order_service.go:544`) and the generic catch
   toast "Không thể cập nhật trạng thái" (`page.tsx:184-185`) hides the cause. *Already flagged in
   `admin_overview_be.md` Flag 2 + `admin_overview_crosspage_dataflow.md` §7 — still in the code.*
   A delivered order can only go to `paid`.

3. **`useOverviewWS` handles two WS events the BE never publishes — dead branches.**
   `useOverviewWS.ts:52` (`case 'order_updated'`) and `useOverviewWS.ts:67` (`case 'order_completed'`)
   are live `switch` cases. A grep of the BE shows the only events published to `orders:kds` are
   `order_status_changed` (`order_service.go:552,745`), `order_cancelled` (`order_service.go:593`),
   `payment_success` (`payment_service.go:270`), plus the `item_*` family — **never** `order_updated`
   or `order_completed`. Both branches are unreachable on this branch. (`admin_overview_be.md` Flag 4
   guessed this for `order_updated`; confirmed here, and `order_completed` is dead too.)

4. **The FE sends a phantom `amount` on `POST /payments` that the BE silently ignores.**
   `admin.api.ts:181` types `createPayment(body: { order_id; method; amount: number })` and
   `TableList.tsx:289-293` passes `amount: order.total_amount`. The BE bind struct `createPaymentReq`
   (`payment_handler.go:23-26`) has only `OrderID` + `Method` — no `amount` — and computes the charge
   from `order.TotalAmount` server-side (`payment_service.go:89`). The FE field is dead weight that
   gives a false impression the client controls the charged amount. (`admin_overview_be.md` Flag 3.)

---

## Dead / unreachable code found

- **`useOverviewWS.ts:52` `case 'order_updated'`** — BE never publishes this type → unreachable.
- **`useOverviewWS.ts:67` `case 'order_completed'`** — BE never publishes this type → unreachable.
  (`order_cancelled` on the same line-66 case label *is* real and correctly handled.)
- **`TableList.tsx:246,248`** — props `checkedTableIds` and `onToggleCheck` are declared in
  `TableListProps` but **not destructured** in the implementation (`TableList.tsx:253-254`), so the
  page passes them (`page.tsx:367-369`) and they are silently dropped. No checkbox behaviour exists
  in TableList.
- **`admin.api.ts:181` `amount: number`** — sent on every cash payment, ignored by the BE bind.

---

## Area ① — Component visuals

**Verdict:** Drifted. Zone B is the worst offender (drawn as a multi-status queue with a cancel
button it does not have); TableGrid quietly lacks the pay/cancel actions the doc says Zone D has.

| Component/Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Zone B scope | "TẤT CẢ đơn active (pending→delivered)" (`admin_overview.md:26,49`) | `PREP_STATUSES = new Set(['pending'])` — pending-only; needs `table_id` (`WaitingSection.tsx:9,55`); header "Danh sách bàn cần chuẩn bị" (`WaitingSection.tsx:101`) | 🔴 | Redraw Zone B as the pending-confirmation queue it is; fix the `page.tsx:309` comment |
| Zone B `[Huỷ]` button | wireframe row `[Xác nhận][Kiểm tra][Huỷ]` (`admin_overview.md:26`) | only 🔍 (`WaitingSection.tsx:186`) + advance (`:195-200`); no cancel button exists | 🔴 | Remove `[Huỷ]` from the Zone B wireframe |
| Zone D TableGrid actions | "TableList / TableGrid — … hành động (thanh toán xong / huỷ)" (`admin_overview.md:51`) | page passes `onPaymentDone`/`onCancel` only to `TableList` (`page.tsx:370-379`); `TableGrid` gets neither (`page.tsx:381-390`) → grid can't pay/cancel | 🟡 | Clarify doc that pay/cancel live in the **list** view only, or wire them into TableGrid |
| Zone A 4th card | single value "1" under "Khẩn cấp/Cảnh báo" (`admin_overview.md:21-22`) | renders `{urgent} / {warning}` ratio + sub-text ">20 phút / 10–20 phút" (`StatCards.tsx:44-49`) | 🟡 | Update wireframe to "X / Y" |
| Zone E/F always-visible | ASCII draws E (PaidLog) + F (CancelLog) as permanent sections (`admin_overview.md:36-37`) | both are **collapsed accordions** by default (`PaidLog.tsx:16`, `CancelLog.tsx:15` `useState(false)`) | 🟡 | Draw E/F as collapsed accordions |
| Zone D Huỷ status gate | "hành động … huỷ" implies any active row | Huỷ rendered only on `delivered` (`TableList.tsx:368,378-385`) | 🟡 | Note Huỷ appears only at `delivered` (and see headline #2 — it 409s) |
| NewOrderPopup | "Đơn hàng mới!" + `[Bỏ qua]` + `[✓ Xác nhận nhận đơn]` + items + total | exact: `page.tsx:49,85-88,92-94`; kitchen-item filter `page.tsx:42`; total `page.tsx:78` | 🟢 | matches |
| Zone C PrepPanel | "xem món + filling trước khi nhận", pending∩kiemTra gate | filling via `toppingLabel` (`PrepPanel.tsx:157-161`, `overview.helpers.ts:54-68`); gate `page.tsx:327-329` | 🟢 | matches |

**Verified-matching:** Zone A stat-card labels & data source, Zone C PrepPanel (gate + filling
column + advance-all button), Zone D list/grid toggle, Zone E/F columns & shared-query data source,
NewOrderPopup (title + both buttons + total + kitchen-item filter), search bar, ConnectionErrorBanner
placement, 30 s timer.

---

## Area ② — Cross-component dataflow

**Verdict:** Accurate. The shared-hub model (`['orders','live']` via `setQueryData`, no Zustand,
props down / callbacks up) is correct field-for-field. One dead-prop bug.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| TableList uses `checkedTableIds` | §4 state table implies TableList consumes `checkedTableIds` | declared `TableList.tsx:246,248` but **not destructured** (`:253-254`); silently dropped | 🔴 | Remove the props (and the page-side pass at `page.tsx:367-369`) or implement the checkbox |
| `order_status_changed` case cite | `useOverviewWS.ts:51-63` | actual `useOverviewWS.ts:51-64` | 🟡 | bump cite to `:51-64` |
| `OrdersWSContext` provider cite | `OrdersWSContext.tsx:22-75` | provider runs to `:82` (`useOrdersWSContext` at `:77-81`) | 🟡 | bump cite to `:22-82` |
| `now` in state summary | §0 intro list omits `now` | `now` is state at `page.tsx:108` (refreshed 30 s) | 🟡 | add `now` to the §0 summary list |
| shared hub `['orders','live']` | the one hub, mutated via `setQueryData` | `page.tsx:130-134,147,163,179`; `useOverviewWS.ts:16` | 🟢 | matches |
| no Zustand on this page | claimed | confirmed — no zustand import in page or children | 🟢 | matches |
| `Order`/`OrderItem`/`Table` shapes | quoted at `order.ts:38-52`, `:15-27`, `admin.api.ts:159-165` | exact field-for-field match (no `filling` added to `OrderItem`) | 🟢 | matches |
| helper line ranges | `overview.helpers.ts` 7-9/11-22/54-68/81-94/3-5/96-101 | all exact | 🟢 | matches |

**Verified-matching:** the single-hub `['orders','live']` pattern, all 8 page-local state vars
(incl. `now` at `:108`), absence of Zustand, all three type shapes, all seven helper ranges,
`handleAction` optimistic-write block (`page.tsx:174-189`), `handleConfirmPopup` parallel path
(`:158-172`), `PREP_STATUSES` (`WaitingSection.tsx:9`), PaidLog/CancelLog lazy history fetch.

---

## Area ③ — Cross-page dataflow

**Verdict:** Accurate. The "zero browser writes, BE row is the only durable handoff" thesis holds
(grep confirms no localStorage/persist). It also independently confirms the delivered→cancelled bug
and surfaces the dead WS branches.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| delivered Huỷ → 409 | flagged trap (`crosspage §7`, `TableList.tsx:378-385`) | confirmed `TableList.tsx:378-384` → `page.tsx:376-378` → invalid BE transition (`order_service.go:524-529`) | 🔴 | Disable/remove Huỷ on `delivered`; see headline #2 |
| WS switch cases enumerated | doc names `new_order`, `item_progress`, `order_status_changed` | also live: `order_updated` (`:52`), `order_cancelled` (`:66`), `order_completed` (`:67`) — two are dead (headline #3) | 🟡 | Doc should enumerate all 6 cases + mark the dead ones |
| `TABLE_ACTIVE` duplicate set | doc mentions only `ACTIVE` | `page.tsx:27` defines `TABLE_ACTIVE` identical to `ACTIVE`; feeds `tableOrders` (`:136`) | 🟡 | Note the redundant second set (candidate simplification) |
| zero localStorage / persist | "no browser writes that outlive the page" | grep clean across page + hooks + context; `storage-keys.ts` has no overview key | 🟢 | matches |
| ACTIVE enforced twice | `useOverviewWS.ts:8` + `page.tsx:26,135` | exact | 🟢 | matches |
| `item_progress` patch | patches `qty_served` | `useOverviewWS.ts:34-48` | 🟢 | matches |
| PATCH error = toast only, no rollback | claimed | `page.tsx:184-185` catch is toast-only | 🟢 | matches |
| `onPaymentDone` drop+invalidate | `page.tsx:370-374` | exact | 🟢 | matches |
| new-order over SSE+WS, dedup by id | both prepend, SSE-only popup | `page.tsx:142-153` + `useOverviewWS.ts:21-30` | 🟢 | matches |

**Verified-matching:** zero-persistence thesis, double ACTIVE enforcement, `item_progress` /
`order_status_changed` patch-vs-drop, SSE popup + dedup, no-rollback-on-error, `onPaymentDone`,
`onCancel` wiring.

---

## Area ④ — Loading behaviour

**Verdict:** Accurate. Every staleTime, `enabled` gate, empty-state copy string, guard contract, and
the WS tri-state are correct. Only nits are multi-line cites that point at single-line strings.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| PaidLog empty cite | "60-62" | single line `PaidLog.tsx:61` | 🟡 | bump cite to `:61` |
| CancelLog in-flight cite | "51-52" | single line `CancelLog.tsx:52` | 🟡 | bump cite to `:52` |
| CancelLog empty cite | "53-55" | single line `CancelLog.tsx:54` | 🟡 | bump cite to `:54` |
| staleTimes 60k/15k/30k | claimed | `page.tsx:127,133`; `PaidLog.tsx:22`/`CancelLog.tsx:22` | 🟢 | matches |
| `['orders','history']` `enabled: open` | lazy in both logs | `PaidLog.tsx:21`, `CancelLog.tsx:21` | 🟢 | matches |
| AuthGuard null/getMe/login | `:23/:17/:19` | exact | 🟢 | matches |
| RoleGuard MANAGER synchronous | `RoleGuard.tsx:16`, `layout.tsx:30` | exact | 🟢 | matches |
| WS tri-state + banner-on-false | `OrdersWSContext.tsx:24,47,53` + `page.tsx:249` | exact | 🟢 | matches |
| no `overview/loading.tsx` | only `admin/loading.tsx` | confirmed (orange spinner `loading.tsx:4`) | 🟢 | matches |

**Verified-matching:** all staleTimes, all `enabled` gates, every empty/in-flight copy string, both
guard contracts, WS null/true/false mapping, SSE no-returned-state + reconnect (max 30 s, 10
attempts), TableList `return null` on empty, absence of an overview-level `loading.tsx`.

---

## Area ⑤ — FE⇄BE data model

**Verdict:** The handler→service→repo chains, auth gates, `validTransitions`, payment DTO and
SSE/WS routing are all correct. **Every `file:line` is stale** (routes shifted ~+13 in main.go) and
two real code smells exist (phantom `amount`, dead WS events).

| Endpoint/Flag | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Phantom `amount` (Flag 3) | "amount ignored by BE" | FE DTO has `amount` (`admin.api.ts:181`), sent (`TableList.tsx:292`); BE bind has none (`payment_handler.go:23-26`) | 🔴 | Drop `amount` from the FE type & call |
| Dead WS events (Flag 4) | guessed `order_updated`/`order_completed` legacy | confirmed dead: BE publishes neither (grep `order_service.go`/`payment_service.go`); FE cases `useOverviewWS.ts:52,67` | 🔴 | Remove the two dead cases |
| main.go route lines | group :231, /live :234, /history :235, /:id :236, /:id/status :237, tables :265-270, payments :254-256, sse :331, ws :337-339 | actual: group :243, /live :247, /history :248, /:id :249, /:id/status :250, tables :278-284, payments :267-269, sse :344, ws :350-352 | 🟡 | Re-cite all main.go line numbers |
| `GET /orders` chef alias | not mentioned | `main.go:246` `GET ""` `AtLeast("chef")` → same `ListLive` handler | 🟡 | Add the alias row |
| FE `Table` omits `is_active` | type lists 5 fields | BE returns `is_active` (`table_handler.go:41`); FE type drops it (`admin.api.ts:159-165`) | 🟡 | Add `is_active?` to FE `Table` if needed |
| WS no role gate (Flag 5) | any valid token connects | `main.go:350-352` group has no authMW; handler parses token only (`websocket/handler.go:40-46`) | 🟡 | confirmed; policy decision |
| auth gates 1–8 | per-endpoint roles | all correct (cashier/cashier/cashier/any/chef/cashier/manager/none) | 🟢 | matches |
| `validTransitions` | pending→confirmed\|cancelled … delivered→paid | exact (`order_service.go:524-529`) | 🟢 | matches |
| payment cash flow | amount=TotalAmount, completePayment, publish payment_success | `payment_service.go:89,99,270-271` | 🟢 | matches |
| history no items (Flag 6) | `ListTodayHistory` fetches no items | confirmed (`order_service.go:174-190`) | 🟢 | matches |

**Verified-matching:** all 8 endpoint auth gates, full handler→service→repo chains, `validTransitions`
table, payment DTO (no amount field), `GET /tables` SQL columns, SSE-admin publishes only `new_order`,
WS subscribes `orders:kds`, history-returns-no-items.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug | Disable/remove the **Huỷ** button on `delivered` orders (it always 409s) | `fe/.../TableList.tsx:378-385` + `page.tsx:376-378` |
| 2 | 🔴 Code cleanup | Remove dead WS cases `order_updated` + `order_completed` | `fe/src/hooks/useOverviewWS.ts:52,67` |
| 3 | 🔴 Code cleanup | Drop the phantom `amount` from `createPayment` type + call site | `fe/.../admin.api.ts:181`, `TableList.tsx:292` |
| 4 | 🔴 Code cleanup | Remove unused `checkedTableIds`/`onToggleCheck` from `TableList` (or implement) | `fe/.../TableList.tsx:246,248` + `page.tsx:367-369` |
| 5 | 🔴 Doc fix | Redraw Zone B as the pending-only confirmation queue; delete the `[Huỷ]` button from the wireframe | `admin_overview.md:21-49` |
| 6 | 🟡 Doc fix | Re-cite every stale `file:line` (main.go routes +13, WS/PaidLog/CancelLog/provider ranges) + update provenance branch to `..._test_iphon2_change_code` | all 5 `admin_overview_*.md` |
| 7 | 🟡 Doc fix | Note TableGrid lacks pay/cancel; draw E/F as collapsed accordions; fix Zone A "X / Y" card | `admin_overview.md` |
| 8 | 🟡 Doc fix | Enumerate all 6 WS switch cases (mark the 2 dead); note `TABLE_ACTIVE` duplicate + `GET /orders` chef alias | `admin_overview_crosspage_dataflow.md`, `admin_overview_be.md` |

> **CLAUDE.md note:** the doc fixes (rows 5–8) are one ALIGNed task. Each **code** change (rows 1–4)
> must be registered as its own row in `docs/tasks/MASTER_TASK.md` **before any file is touched** —
> this audit changed nothing.
