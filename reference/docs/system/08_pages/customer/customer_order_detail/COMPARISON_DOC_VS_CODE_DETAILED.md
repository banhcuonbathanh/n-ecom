# Customer Order Detail — Detailed Doc vs. Code Comparison (4 Areas)

> **Scope:** deep audit of the `customer_order_detail` doc-set against the real `/order/:id` code across
> the applicable axes: (1) component visuals · (3) cross-page Zustand/SSE dataflow · (4) loading
> behaviour · (5) FE⇄BE data model. **Area 2 (cross-component dataflow) is N/A** — this page has no
> `_crosscomponent_dataflow.md`, and it renders almost entirely from one file (`order/[id]/page.tsx`)
> plus the `useOrderSSE` hook, so its store interactions are cross-page (Area 3).
> **Read-only — no code or docs changed.** Done **inline** (no subagents): the page is two source files
> (`page.tsx` 783 lines + `useOrderSSE.ts` 160 lines) + shared atoms, fully read into context — fanning
> out would only re-read what was already traced. 🔴 items re-verified by hand (greps cited inline).
> Branch audited: `experience_claude.md_system_1_test_iphon2_change_code`.
> Date: 2026-06-21.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 · Component visuals | **Wireframe (`.md`) is the stale file** — code richer than drawn | 0 | 5 | 4 |
| 3 · Cross-page dataflow | **Accurate** — partialize, cache, nav writes, SSE table all match | 0 | 0 | many ✅ |
| 4 · Loading behaviour | **Essentially perfect** — skeleton, branches, reconnect all confirmed | 0 | 0 | 1 |
| 5 · FE⇄BE data model | Accurate; `_be.md` Flags 1–5 still hold; 1 model gap (`filling`) | 0 | 2 | several ✅ |
| (cross-cutting) Code bugs | **2 already-documented FE bugs re-confirmed** (doc is correct) | 2 | 1 | — |

> **Headline of this run:** unlike `customer_menu`, this doc-set has **no 🔴 doc-vs-code
> contradiction**. The 2 🔴 below are **CODE bugs the doc-set already documents honestly** in
> `ORDER_DETAIL_BUGS.md` + `_be.md` Flags 1–2 — so the doc *wins/agrees*, it is not drifted. Drift is
> confined to the `customer_order_detail.md` ASCII/Zones wireframe (Area 1).

**🔴 RAISE-MY-VOICE headline findings (hand-verified — CODE bugs, doc already correct):**
1. **Quantity edit never reflects live.** The stepper fires `PATCH /orders/items/:id/quantity`; BE
   publishes `type:"item_updated"` (`order_service.go:696`), but `useOrderSSE`'s `onmessage` switch has
   **no `item_updated` case** (`useOrderSSE.ts:83-123` handles only `order_init`,
   `order_status_changed`, `order_cancelled`, `item_progress`, `order_completed`). The mutation's
   `onSuccess` `invalidateQueries({queryKey:['order',params.id]})` (`page.tsx:59`) is a **no-op** — no
   `useQuery(['order',…])` exists anywhere. New qty + recalculated total only appear after a full
   reload. (Doc home: `ORDER_DETAIL_BUGS.md` Bug 1 · `_be.md` Flag 1.)
2. **Cancelled item stays on screen.** `DELETE /orders/items/:id` publishes `type:"item_cancelled"`
   (`order_service.go:642`); `useOrderSSE` has **no `item_cancelled` case** (`useOrderSSE.ts:83-123`),
   and the cancel mutations don't re-seed (`page.tsx:68-77`). The row stays until reload. The sibling
   `items_added` (`order_service.go:516`) is the **same gap** (🟡) — a device left open won't show
   dishes added via "Thêm món". Contrast: `useOrderMonitorSSE` (the `/tracking` hook) **does** handle
   all three (`useOrderMonitorSSE.ts:84-86`). (Doc home: `ORDER_DETAIL_BUGS.md` Bug 2 · `_be.md` Flag 2.)

**Dead/unreachable code found:**
- **`order_init` SSE case is dead** (`useOrderSSE.ts:84-85`). No publisher emits `order_init` — `grep
  'publishOrderEvent(ctx, "'` over `order_service.go` returns only `new_order`, `items_added`,
  `order_status_changed`(×2), `order_cancelled`, `item_cancelled`, `item_updated`. The SSE handler
  sends `connected`, never `order_init` (`sse/handler.go:50`). The REST snapshot seeds state instead.
  (`_be.md` Flag 5 already suspected this — now **confirmed dead**.)
- **`row.notes` is computed but never rendered.** The summary memo collects per-product notes into
  `SummaryRow.notes` (`page.tsx:35,111,127-128`), but the summary-table JSX (`page.tsx:434-499`) renders
  `row.toppings` only — `row.notes` is never read. Dead computed value.

---

## Area 1 — Component Visuals

**Verdict:** `customer_order_detail.md`'s ASCII + Zones table is the least-maintained file in the set.
The live page renders more than the wireframe draws (total in the order-card header, a collapse toggle,
a "Theo dõi bàn" button, a takeout fallback), and some labels/sources are mis-drawn. None is a
data-source bug of the `MenuHeader` class — all are wireframe-copy drift.

| Component | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| **Nav right slot** | ASCII draws `[StatusBadge]`; Zones table row "Nav + status → `components/shared/StatusBadge`" (`customer_order_detail.md:20,55`) | Nav right slot is the **connection pill** "LIVE" / "MẤT KẾT NỐI" (`page.tsx:282-292`). `StatusBadge` actually lives **inside the order card** (`page.tsx:308`), not the nav | 🟡 | Redraw nav: right = LIVE/MẤT KẾT NỐI pill; move StatusBadge to the order-card row. (The `_loading.md` already documents the pill correctly.) |
| **Order-card header** | `┃ Bàn 03  #BC-0042  [preparing]  12 phút` (`customer_order_detail.md:23`) | Also renders **`total_amount`** (`formatVND`, `page.tsx:310`) and an **`Ẩn`/`Hiện` collapse toggle** (`page.tsx:312-318`); table cell falls back to **"Mang về"** when `table_name` is null (`page.tsx:304-306`) | 🟡 | Add total + collapse toggle + "Mang về" fallback to the ASCII. |
| **DishRow** | `● Bánh cuốn thịt · thịt  ra 1/1  ✓` / `● Canh mọc · có rau  còn 1 [Huỷ]` (`customer_order_detail.md:26-28`) | Toppings render as **chip pills** `+ {name}` below the name, not inline "· thịt" (`page.tsx:711-724`); the per-dish **`note`/filling is NOT rendered at all** in DishRow; right side shows three segments `tổng ×N · ra ×N · còn ×N` / `✓ xong` (`page.tsx:739-756`); stepper sits on its own line with a "Số lượng:" label (`page.tsx:726-736`) | 🟡 | Redraw DishRow: topping chips below name; drop the per-dish "· filling" label (it's only aggregated — see next row); show `tổng/ra/còn` segments + `✓ xong`. |
| **Per-dish filling label ("· thịt"/"· có rau")** | ASCII puts filling on each dish row; footer "2 có rau · 1 không rau" (`customer_order_detail.md:26-29`) | Split across two carriers: **nhân ("thịt") → `toppings_snapshot`** chip below the name (rendered, `page.tsx:711-724`); **canh "có rau" → `note`**, rendered **only as an aggregate** `noteCounts` line under the dish list (`page.tsx:391-400`), never per row | 🟡 | Doc: nhân = topping chip; canh-rau = aggregate footer, not a per-dish suffix. |
| **Summary table** | Header "Tổng hợp món (toggle)"; footer "Còn lại / Tổng" (`customer_order_detail.md:31,35-36`) | Header label is **"Chi tiết món"** (`page.tsx:413`); columns `Tên món · SL · Ra · Còn · Đơn giá · Tổng` (`page.tsx:423-431`); footer is **"Tổng tiền còn lại"** + **"Tổng tất cả món"** (`page.tsx:505,510`); per-product **"Huỷ"** button on the right when remaining>0 (`page.tsx:484-497`) | 🟡 | Fix header label + footer labels; note the per-row Huỷ. |
| **Bottom buttons** | Only `[Huỷ đơn hàng]` + `[+ Gọi thêm món]` (`customer_order_detail.md:43-44`) | A **"Theo dõi bàn"** button (`MapPin`, `page.tsx:563-569`) renders left of the add button while `isActive`; the add button label is **"Thêm món"** / **"Đặt thêm món"** (not "Gọi thêm món") and the whole row is gated on `order.table_id` (`page.tsx:560-581`) | 🟢 | Add "Theo dõi bàn"; fix the add-button label + table_id gate. |
| **Money-summary labels** | "Đã ăn / Chưa ra / Tổng cộng" (`customer_order_detail.md:38-40`) | "Đã dùng (N phần) / Còn lại (N phần chưa ra) / Tổng cộng" (`page.tsx:521-533`); the "Còn lại" row only renders when `remainingAmount > 0` (`page.tsx:525`) | 🟢 | Update labels + note the conditional row. |
| **Done marker / combo header** | dish done = `✓`; combo = name only (`customer_order_detail.md:25,26`) | done = **"✓ xong"** (`page.tsx:754`); combo header shows **"{n} món"** count + chevron (`page.tsx:343-348`) | 🟢 | Cosmetic. |
| **Completed banner** | `✓ banner "Đơn đã hoàn tất" (delivered only)` (`customer_order_detail.md:42`) | Real copy: **"Đơn hàng đã hoàn thành"** + subtitle, green card, `delivered` only (`page.tsx:539-547`) | 🟢 | Cosmetic copy fix. |

**Verified-matching:** progress bar (`page.tsx:321-324`), collapsible combo group (`page.tsx:336-376`),
cancel-whole-order button gating on `canCancelOrder` (`page.tsx:550-557`), notification modal
confirmed/ready/cancelled (`page.tsx:587-637`), cancel-confirm modal (`page.tsx:640-674`), and
**`ClientBottomNav`** — the doc's bottom-tab-bar row is **correct**: it is rendered once by the shell
`(shop)/layout.tsx:12`, not by the page.

---

## Area 3 — Cross-Page Dataflow (Zustand + SSE)

**Verdict:** `customer_order_detail_crosspage_dataflow.md` is **accurate end-to-end** — every store
field, key, persist rule, navigation write, and SSE-handling claim traces clean. One of its two
self-flagged `❓ UNVERIFIED` items can now be **resolved**.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `order_init` publisher (doc `❓ UNVERIFIED`, §6 note) | "may be dead code" | **Confirmed dead** — no `publishOrderEvent(ctx,"order_init",…)` anywhere (`order_service.go` grep); handler sends only `connected` (`sse/handler.go:50`) | 🟢 | Upgrade the doc note from ❓ to "confirmed dead"; flag the FE case for removal. |
| partialize whitelist | `{ orderNote, activeOrderId }` | exactly (`cart.ts:153`) | 🟢 | No action. |
| `setTableId` memory-only / `setActiveOrderId` persisted / `clearCart` resets `activeOrderId` | as documented | `cart.ts:91,93,89` — `setTableId` not in partialize; `clearCart` sets `activeOrderId:null` | 🟢 | No action. |
| Storage keys | `ORDER_CACHE='order_cache_'`, `CART_CONFIG='cart-config-v3'` | exactly (`storage-keys.ts:3,6`) | 🟢 | No action. |
| 3 nav-button writes (Theo dõi bàn / Thêm món / Đặt thêm món) | write table in §2b | match `page.tsx:560-581`: "Theo dõi bàn" sets only `activeOrderId`; "Thêm món" sets `tableId`+`activeOrderId`; "Đặt thêm món" sets `tableId`+`activeOrderId=null` | 🟢 | No action. |
| SSE event table (§6) — handled vs missed | `item_cancelled`/`item_updated`/`items_added` unhandled; rest handled | exactly — switch at `useOrderSSE.ts:83-123` | 🟢 | No action (this is the bug surface; see headlines). |
| `useOrderMonitorSSE` handles `item_updated`+`item_cancelled` (§3 note) | as documented | `useOrderMonitorSSE.ts:84-86` also handles `items_added` | 🟢 | No action. |

> The doc's second `❓ UNVERIFIED` (whether `/menu` guards an already-cancelled `activeOrderId` after a
> whole-order cancel, §7 note) is **out of scope for this page** — it lives on `/menu`. Left as-is.

---

## Area 4 — Loading Behaviour

**Verdict:** `customer_order_detail_loading.md` is **essentially perfect** — the three-branch priority
order, the skeleton structure (line-for-line), the connection pill, the `ConnectionErrorBanner`, and
the reconnect constants all match. Zero behavioural drift.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| Branch priority | `isNotFound` → `!order` skeleton → live | exactly (`page.tsx:155,175,270`) | ✅ | — |
| Skeleton sections | nav + order card + table + money + button | exactly (`page.tsx:177-227`) | ✅ | — |
| Reconnect constants | maxAttempts 5 · baseDelay 1000 · maxDelay 30000 · showBannerAfter 3 | exactly (`useOrderSSE.ts:16-21`) | ✅ | — |
| Connection pill copy | "LIVE" / "MẤT KẾT NỐI" | exactly (`page.tsx:282-292`) | ✅ | — |
| `invalidateQueries` no-op (Flag 2) | dead | confirmed (`page.tsx:59`, no `useQuery`) | ✅ | — |
| `_loading.md` source list cites `(shop)/loading.tsx` for the route spinner | route-level spinner exists | shell now pads via `pb-[calc(72px+…)]` in `(shop)/layout.tsx`; `loading.tsx` still the route spinner (unverified this run — not on the audited path) | 🟢 | Optional: re-confirm `(shop)/loading.tsx` shape on a future run. |

---

## Area 5 — Data Model FE⇄BE

**Verdict:** `customer_order_detail_be.md` is a **strong, source-traced file** — the 5-endpoint table,
the auth-by-table model, the caching/error sections, and Flags 1–5 are accurate and still true. One FE
model gap surfaced around `filling`.

| Object.Attr | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| `OrderItem.filling` | CLAUDE.md OC-1/OC-4 narrative says a `filling` column exists and "order/[id] DishRow renders filling" | **The `filling` column was dropped** — `016_add_order_item_filling.sql` then `017_drop_order_item_filling.sql`. FE `OrderItem` has **no `filling` field** (only `note`, `types/order.ts:24`); serializer emits no `filling` (`order_handler.go`, only `Note`+toppings_snapshot); `page.tsx` grep → 0 `filling` hits. **Nhân (thịt/mộc nhĩ) was backfilled into `toppings_snapshot`** → rendered as DishRow chips (`page.tsx:711-724`); **canh "có rau"/"không rau" rides in `note`** → shown only as aggregate `noteCounts` (`page.tsx:391-400`). Same finding as `customer_order_list` 🔴 #1 | 🟡 | Doc fix: the CLAUDE.md OC narrative + any "renders filling" claim are stale — say nhân lives in `toppings_snapshot`, canh-rau in `note`; there is no `filling` field. |
| `note` rendering | per-dish note implied in wireframe | `note` rendered only in aggregate (`page.tsx:391-400`); collected into `row.notes` but **never displayed** (`page.tsx:127-128` vs JSX `:434-499`) | 🟡 | Doc fix (Area 1) + flag `row.notes` as dead computed (Code cleanup). |
| `patchOrderItemQty` endpoint | `PATCH /orders/items/:id/quantity` body `{quantity}` | exactly (`api-client.ts:72-73`) | 🟢 | No action. |
| 5-endpoint set + `item_updated` unique to this page | as documented | `publishOrderEvent` lines confirm 696/642/516/552/593/348/745 (`order_service.go`) | 🟢 | No action. |
| `OrderItem` shape | `id, product_id?, combo_id?, combo_ref_id?, name, quantity, qty_served, unit_price, note?, toppings_snapshot?, flagged` | exactly (`types/order.ts:15-27`) — incl. `flagged: boolean` | 🟢 | No action (`flagged` is read by no Area-1 zone; harmless). |

**Verified-matching:** the `_be.md` 5-endpoint table, auth-by-table ownership gates, the SSE
no-ownership-check + no-replay flags (3–4), and the `item_updated`/`item_cancelled` dead-end flags (1–2,
5) — all confirmed against `useOrderSSE.ts` + `order_service.go` greps.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug | Add an `item_updated` case to `useOrderSSE` (re-fetch `GET /orders/:id` or patch) so quantity edits reflect live; remove the dead `invalidateQueries` | `fe/src/hooks/useOrderSSE.ts`, `fe/src/app/(shop)/order/[id]/page.tsx:59` |
| 2 | 🔴 Code bug | Add an `item_cancelled` case (and ride `items_added`) to `useOrderSSE` so cancels/adds reflect live — one re-fetch-on-unhandled-event fix closes all three; also fixes the C9 overlay | `fe/src/hooks/useOrderSSE.ts` |
| 3 | 🟡 Doc fix | Rewrite `customer_order_detail.md` Area-1 drift: nav pill (not StatusBadge), order-card total + collapse + "Mang về", DishRow chips + `tổng/ra/còn` + no per-dish filling, summary "Chi tiết món"/footer labels, "Theo dõi bàn" button, money-card labels | `customer_order_detail.md` |
| 4 | 🟡 Code cleanup | Remove dead `order_init` SSE case + dead `row.notes` computed value | `useOrderSSE.ts:84-85`, `order/[id]/page.tsx:35,111,127-128` |
| 5 | 🟡 Model fix | Decide `filling`: add it to the FE `OrderItem` type + render, or document it as folded into `note` | `fe/src/types/order.ts`, `customer_order_detail.md` / `_be.md` |
| 6 | 🟢 Doc nit | Resolve `_crosspage_dataflow.md` §6 `order_init` ❓ → "confirmed dead"; optional `(shop)/loading.tsx` re-confirm | doc-set |

> Per `CLAUDE.md` (MASTER-first + scope contract): the doc fixes (#3, #5-doc, #6) are **one** task; each
> code change (#1, #2, #4, #5-code) must be registered in `MASTER_TASK.md` before any file is touched.
> Bugs #1–#2 are already tracked in `ORDER_DETAIL_BUGS.md` but **not yet on `MASTER_TASK.md`**.
