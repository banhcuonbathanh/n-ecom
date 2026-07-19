# Customer Orders & Tracking — Consolidated FE + BE Build Plan (F-25)

> **TL;DR:** One plan, one folder, for the merged customer screen `/orders` — **"Đơn hàng
> & Theo dõi"**. It does two jobs on one scroll: (1) *your* order, summary ⇄ live cooking
> detail, and (2) the *whole-floor* live queue so you can see where you stand. It is the
> downstream of the menu page: `POST /orders` lands here. FE and BE are planned together
> because this page is mostly a **realtime contract** — one SSE stream drives four
> surfaces, plus two cancel writes.
> Visual companions: [`customer_orders_tracking_plan.html`](customer_orders_tracking_plan.html)
> (the plan) · [`customer_orders_tracking_how-it-works.html`](customer_orders_tracking_how-it-works.html)
> (runtime sequences) · [`customer_orders_tracking_mockup-1.html`](customer_orders_tracking_mockup-1.html) (the UI).
> Source: `reference/docs/system/08_pages/customer/customer_orders_tracking/DESIGN_PROMPT.md`
> (the merge spec) reconciled against its two real parent pages
> `customer_tracking/` + `customer_order_list/` + `customer_order_detail/`
> (22 docs, digested 2026-07-19 by 2 Explore agents) and the harness rule set.
> **One fact one home:** this file owns the `/orders` page's scope, contract, and task
> mapping — rules stay in their owning docs (linked in §2); order tables live in
> `DB_SCHEMA.md §4.3`; the append endpoint stays owned by the menu plan.

---

## 1. What the page is

The customer's single post-order surface. A guest arrives three ways:

- **After ordering** — `POST /orders` 201 on `/menu` sets `activeOrderId` → redirect here.
- **Bottom-nav tap** — "Đơn Hàng" (this screen merges the old *Đơn Hàng* + *Theo Dõi* tabs).
- **Cold return** — reopened later; `activeOrderId` survives in the persisted cart slice,
  history survives in the device-local order cache.

Core loop: watch your order cook (status badge · queue position · per-dish served
progress) → optionally cancel a dish or the order → "Thêm món" back to the menu →
order completes. The **whole-floor queue** runs alongside it the entire time, so the
page is useful even with no active order.

Five zones, top → bottom: sticky top bar (+ connection pill) · active-order banner
(table · status · queue position · ETA) · **your order, summary ⇄ detail** (the
centerpiece) · your order history · whole-floor live queue. Shell bottom-nav underneath.

In/out links: in from `/menu` (post-201 handoff), `/table/:id` (QR), bottom nav; out to
`/menu` ("Thêm món" / "Về trang menu" fallbacks, append mode `?add_to_order=<id>`).

## 2. Alignment — what governs this page (read, don't restate)

| Concern | Owning doc |
|---|---|
| Stack + versions | `harness/PLAN.md §Stack` |
| BE layering, tx policy, error envelope, cache-aside | `harness/BE_STATE.md` |
| goose+sqlc workflow, Go/Gin gotchas | `harness/BE_PLAYBOOK.md` |
| FE state kinds, cache map, loading tiers, hard rules 1–14 | `harness/FE_STATE.md` |
| **Realtime design** (pub/sub → SSE, the 4 fixed defects, channels) | `harness/OVERALL_PLAN.md §3.5` |
| **Order lifecycle, cancel rule, price snapshot** | `harness/OVERALL_PLAN.md §3.7` |
| `orders` / `order_items` columns, row-type matrix, `qty_served` law | `harness/DB_SCHEMA.md §4.3` |
| Design tokens + components (staff/admin neutral set) | `harness/diagrams/design-system.html` (F-7) |
| Customer dark/orange shell + `formatVND()` + cart store | `harness/plans/customer_menu/customer_menu_PLAN.md` |

Reference docs are the **what**; the harness rules are the **how**. Where they conflict,
**the harness wins** and the reason is recorded in §3.4 / §7.

## 3. BE plan

### 3.1 Endpoints the page consumes (all under `/api/v1`)

| # | Route | Auth | Phase/Task | Behavior |
|---|---|---|---|---|
| 1 | `GET /orders/:id` | guest JWT + **ownership by `table_id`** | O-2 | The active order and any expanded history card. Returns the **bare full order object** (§3.5) — items carry derived `item_status` (from `qty_served` vs `quantity`; **no `status` column** — `DB_SCHEMA.md §2` law). `403` foreign order, `404` missing. **Never cached** (§3.3). |
| 2 | `GET /sse/order-monitor/:id` | guest JWT + **own-order/table gate** | **R** | **THE single stream.** On connect: `event: connected` → snapshot (`queue.update` + `tables.status`) read from MySQL → then deltas. Subscribes Redis `order:{id}` + `queue:broadcast` + `tables:broadcast`. 15 s `: keep-alive`, `retry:` directive. `401/403` = permanent, non-retryable. |
| 3 | `DELETE /orders/:id` | guest JWT + ownership | O-2 | Cancel the whole order → `204`. Allowed per the `canCancel` rule (§7 flag); soft-delete, publishes `order_cancelled`. |
| 4 | `DELETE /orders/items/:id` | guest JWT + ownership | O-2 | Cancel one dish → `204`. **Rejects an already-served item** (`qty_served >= quantity` → `422 CANCEL_THRESHOLD`). `RecalculateTotalAmount` in the **same tx**, then publishes `item_cancelled`. |
| — | `POST /orders/:id/items` | guest JWT | O | "Thêm món" append — **owned by the menu plan §3.1 #6**. Cross-linked, not re-derived. |

**Deliberately NOT consumed:** `PATCH /orders/items/:id/quantity`. This page shows a
*placed* order — quantities are read-only `×n` badges (§4.4-4). The reference's standalone
detail route wired a stepper here; the merged screen drops it (§3.4).

**No guest "my orders" list endpoint exists** — history is device-local (§3.2 / §4.2).
Errors ride the Session-0 envelope; codes from `BE_STATE.md §4`, extended per
`OVERALL_PLAN.md §3.3` (`CANCEL_THRESHOLD`, `ORDER_NOT_ACTIVE`, `TOKEN_EXPIRED`).

### 3.2 Schema this page depends on (O-1 migration scope)

Read-only against the order tables — **full column specs are canonical in
`harness/DB_SCHEMA.md §4.3`**, not restated here. What this page leans on:

- `orders` — `order_number` (`ORD-YYYYMMDD-NNN`, UNIQUE), `status` ENUM
  (`pending·confirmed·preparing·ready·delivered·cancelled·paid`, BE-set only),
  `table_id` (NULL = takeaway → "Mang về"), `total_amount` (denormalized — every
  item mutation must `RecalculateTotalAmount` in-tx), `created_at` (queue sort key).
- `order_items` — `name` + `unit_price` + `toppings_snapshot` (frozen at order time),
  `quantity`, **`qty_served`** (the entire progress model), `combo_ref_id` (self-FK:
  sub-item → its header row).
- **Row-type matrix (`DB_SCHEMA.md §4.3`) drives every list on this page:** a combo
  **header** row (`combo_id` set, `combo_ref_id` NULL, `unit_price = 0`) is excluded
  from every visible dish list *and* from all progress math; its **component** rows
  (`combo_ref_id` set) are what render.
- **No `filling` column, ever** — nhân comes from `toppings_snapshot` (₫0 toppings).
  This makes the reference's "`OrderItem` has no `filling` field" bug structurally moot.

No new tables. `order_sequences` / the Redis counter are upstream (`POST /orders`).

### 3.3 Cache & realtime map (there is no cache — that's the point)

**Orders are never cached** (`BE_STATE.md §7`, `OVERALL_PLAN.md §3.6`): MySQL is read on
every `GET /orders/:id`. Redis appears here **only as pub/sub transport**, never as a
read cache — separate client pool from the cache client (`OVERALL_PLAN.md §3.5-4`).

| Write (who) | Publishes to | This page reacts by |
|---|---|---|
| chef serves a unit (`qty_served++`) | `order:{id}` → `item_progress` | moving the dish's ra/còn + the progress bar |
| staff/customer adds items | `order:{id}` → `items_added` | refetching `['order', id]` |
| item cancelled (this page or POS) | `order:{id}` → `item_cancelled` | refetching + removing the row |
| order status transition | `order:{id}` → `order_status_changed` | live badge + the notification modal (§4.4-11) |
| order cancelled | `order:{id}` → `order_cancelled` | terminal branch, actions replaced |
| any active-order change (floor-wide) | `queue:broadcast` → `queue.update` | re-rendering the floor queue **and** the banner's position/ETA |

**Invalidation AC:** a write on one client must move the other client's screen with no
refresh — the two-client transcript in §8.

### 3.4 Not adopted from the reference (decided here, with reasons)

- ❌ **`{"data": <Order>}` wrapper** on `GET /orders/:id`. Success responses are **never
  wrapped** (menu plan §3.5; only errors ride an envelope). The reference wraps on GET but
  returns bare on POST 201 — a self-inconsistency we refuse to inherit. Ours: bare object,
  identical shape to the `POST /orders` 201, so one TS type serves both.
- ❌ **Order held in the SSE hook's `useState`.** Server data belongs to TanStack Query
  (`FE_STATE.md §1`). Ours: `['order', id]`, SSE *triggers* refetch, never *owns* the data.
- ❌ **Two implementations of the same detail view** (`OrderDetailSheet` overlay *and* the
  `/order/:id` route). One inline component, both callers (§4.1) — this alone kills the
  reference's 🔴 404-wedge bug, which existed only in the overlay copy.
- ❌ **FE-invented queue numbers** (`position = idx+1`, `ETA = idx×3`) while the BE sent
  `0` placeholders. The BE has the ordered active list at snapshot time — **it fills
  `position` + `estimated_minutes`** (one event contract, `OVERALL_PLAN.md §3.5-2`).
- ❌ **`order.status` event-name drift** — the FE listened for `order.status`, the BE
  published `order_status_changed`, so the live badge never moved. Ours: one generated
  event-contract file, **exhaustive consumer switch** (§4.4-1).
- ❌ **Ungated streams** — reference SSE checked auth but not ownership; any authed client
  could watch any order. Ours gates own-order/table (`OVERALL_PLAN.md §3.5-3`).
- ❌ **Three routes** (`/tracking`, `/order`, `/order/:id`) — merged into `/orders` (§7 flag).
- ❌ **`PATCH …/quantity` stepper** on a placed order (§3.1).

### 3.5 Wire shapes (the FE↔BE object gallery)

> Shapes get **frozen by curl receipts** when O-2/R build them (gate 8:
> `fe/src/lib/api/types.ts` is written from receipts, never guessed).

**`GET /orders/:id` → 200** — the same object `POST /orders` returns (menu plan §3.5),
plus the derived `item_status`. Combo header (`unit_price: 0`) + component rows via
`combo_ref_id`; nullable columns serialize as real `null` (F-16 decision):

```json
{ "id": "ord9…36", "order_number": "ORD-20260719-004", "status": "preparing",
  "source": "qr", "table_id": "tb04…36", "table_name": "Bàn 04",
  "note": "Gia đình (mẹ + 2 người lớn + 2 trẻ)",
  "total_amount": 103000, "created_at": "2026-07-19T11:02:00Z",
  "items": [
    { "id": "oi2…", "combo_id": "cb1…36", "name": "Suất Đầy Đủ Trứng Chín",
      "unit_price": 0, "quantity": 1, "qty_served": 0, "combo_ref_id": null,
      "item_status": "pending", "toppings_snapshot": [] },
    { "id": "oi3…", "product_id": "p12…36", "name": "Bánh Cuốn",
      "unit_price": 0, "quantity": 3, "qty_served": 2, "combo_ref_id": "oi2…",
      "item_status": "preparing",
      "toppings_snapshot": [ { "id": "t1…", "name": "Nhân thịt", "price": 0 },
                             { "id": "t2…", "name": "Mộc nhĩ",  "price": 0 } ] } ] }
```

`item_status` ∈ `pending | preparing | done` — **derived server-side** from
`qty_served` vs `quantity` and sent once; the FE types it and does **not** re-derive
(`DB_SCHEMA.md §6` ruling 3 + FE rule 11).

**`GET /sse/order-monitor/:id`** — frames are `event: <type>` + a JSON `data:` line.
Connect handshake, then snapshot, then deltas:

```
event: connected
data: {"type":"connected","order_id":"ord9…36"}

event: queue.update
data: {"type":"queue.update","total":5,"position":2,"estimated_minutes":8,
       "queue":[{"order_id":"ord7…","order_number":"ORD-20260719-001",
                 "table_label":"Bàn 01","status":"preparing","item_count":6,
                 "created_at":"2026-07-19T10:51:00Z"}, …]}

event: item_progress
data: {"type":"item_progress","order_id":"ord9…36","item_id":"oi3…",
       "qty_served":2,"quantity":3}

event: order_status_changed
data: {"type":"order_status_changed","order_id":"ord9…36","status":"ready"}
```

`position` / `estimated_minutes` are **BE-computed** (§3.4) — the banner and the floor
list therefore cannot disagree. `queue` carries only **active** statuses
(`pending·confirmed·preparing·ready`), ordered by `created_at`; a NULL `table_id`
serializes `table_label: "Mang về"`.

Remaining event types on the same stream — all handled (§4.4-1):
`items_added`, `item_updated`, `item_cancelled` (→ refetch `['order', id]`),
`order_cancelled`, `order_completed`, `tables.status`.

**`DELETE /orders/:id`** and **`DELETE /orders/items/:id`** → `204 No Content`, empty body.
Refusals ride the envelope:

```json
{ "error": { "code": "CANCEL_THRESHOLD",
             "message": "Không thể huỷ món đã phục vụ", "details": [] } }
```

**Device-local history entry** (never crosses the wire) — the bare order object above,
stored under `order_cache_<order-id>` (§4.2).

## 4. FE plan

### 4.1 Route + file map (extends `FE_STATE.md §8` — exact paths)

```
fe/src/app/(customer)/orders/
  page.tsx                  # thin RSC shell → renders the client orchestrator
  loading.tsx               # layout-mirroring skeleton (top bar + banner + card + list)
  error.tsx                 # segment retry
components/orders/
  OrdersTrackingClient.tsx  # THE orchestrator: owns the SSE hook, reads activeOrderId,
                            #   composes the five zones, owns the two overlays
  MonitoringTopBar.tsx      # sticky title + "● Đang theo dõi" / "○ Mất kết nối" pill
  TableInfoBanner.tsx       # BÀN tile · status badge · "Vị trí hàng chờ #2 trong 5 đơn"
                            #   · ETA (#1 pulses) · delivered branch · privacy toggle
  ActiveOrderCard.tsx       # the centerpiece: summary ⇄ detail switch
  OrderSummaryPanel.tsx     # "Tóm tắt đơn hàng": COMBO / MÓN LẺ groups, nhân captions,
                            #   per-combo expander, subtotals, Tổng cộng, read-only GHI CHÚ
  OrderRollupTable.tsx      # "TỔNG SỐ MÓN (n loại)" — MÓN·NHÂN·SL·ĐƠN GIÁ·THÀNH TIỀN
  OrderDetailCards.tsx      # live cooking detail: Card A dishes+bar · B table · C money
  DishRow.tsx               # tổng ×n · ra ×n · còn ×n · nhân+ghi chú caption · [Huỷ]
  OrderHistoryList.tsx      # "📋 Đơn hàng của bạn" + "🗑 Xoá lịch sử"
  OrderHistoryCard.tsx      # left-border card, active-only progress, meta, dish preview
  WholeFloorPrepList.tsx    # "Hàng chờ phục vụ [n bàn]" — the see-everyone-else zone
  CancelConfirmModal.tsx    # overlay 1 — shared by order-cancel and dish-cancel
  StatusNotificationModal.tsx # overlay 2 — status-change popup, "Đã hiểu"
components/shared/
  ConnectionErrorBanner.tsx # reused (SSE down) — not a new component
  StatusBadge.tsx           # the 6 VN status pills — ONE owner, reused by staff surfaces
hooks/useOrderMonitorSSE.ts # THE one stream hook; exhaustive event switch
queries/orders.ts           # useOrder(id) → ['order', id] · useOrderHistory() (cache reader)
lib/order-rollup.ts         # flattenAndMerge() (the "n loại" math) + progress math
lib/order-cache.ts          # ORDER_CACHE read / write / clear helpers
stores/cart.store.ts        # activeOrderId pivot — EXISTING, owned by the menu plan
```

**Not built** (reference had them, we don't): `OrderDetailSheet` (the overlay twin of the
detail — merged away), the standalone `/order/:id` route (deferred; the merged screen
covers it), the quantity stepper, `tableStatuses` rendering (the `tables.status` event is
consumed by the switch but its UI is **explicitly deferred** — not silently dropped, §7).

### 4.2 State ownership (instance of `FE_STATE.md §1` — no new kinds)

| Data | Kind | Owner |
|---|---|---|
| active order snapshot | server | TanStack Query `['order', activeOrderId]`, `staleTime: 0`, refetch driven by SSE (never polled) |
| an expanded history order | server | same key factory, `['order', <that id>]` — one cache, no second copy |
| queue · connection state · table statuses | server (stream) | `useOrderMonitorSSE` local state — the only stream owner |
| `activeOrderId` (the pivot) | client | `cart` store, persisted slice (set by `/menu` post-201, cleared by `clearCart()` **and** "Xoá lịch sử") |
| order history list | client (device-local) | `ORDER_CACHE` via `useOrderHistory()` — re-scanned on focus + after every live change |
| expanded card · privacy toggle · which modal | local | `useState` in the owning component |
| guest session | session | httpOnly cookie — cookies ride the SSE handshake, so no token in the URL |

**Why history is device-local.** There is **no guest "my orders" endpoint** — ownership is
by `table_id`, and a guest's history across table sessions has no server identity to hang
on. v1 therefore builds the list by scanning `order_cache_<id>` keys (newest first). This
is honest client state, not cached server state, so it is **not** a `FE_STATE` rule-1
violation. A server-backed history arrives with accounts (A-phase) — flagged in §7.

**How state crosses components — two mechanisms, only two** (same law as the menu page):

1. **Server data → the Query cache.** `ActiveOrderCard`, `OrderDetailCards` and an
   expanded `OrderHistoryCard` all read `useOrder(id)`; identical keys dedupe to one
   fetch. The SSE hook never holds order data — it calls `refetch()`.
2. **The stream + the pivot → the orchestrator.** `OrdersTrackingClient` holds the one
   `useOrderMonitorSSE` and passes read-only props down. Exactly **one** SSE connection
   per page (the reference opened a second stream per opened detail sheet).

**How state crosses pages:** `/menu` → here via `activeOrderId` in the persisted slice
(the id does **not** need to ride the URL); here → `/menu` via `?add_to_order=<id>` for
append mode. Live changes reconcile **back** into `ORDER_CACHE` so the history card and
the live card can never disagree (the reference's stale-list bug).

### 4.3 Loading strategy (instance of `FE_STATE.md §4–5` — three tiers, never stacked)

**Tier 1 — route:** `loading.tsx` mirrors the real layout (top bar + banner + card +
list stubs), never a centered spinner — the reference shipped a bare spinner for the whole
group. **Instant paint from cache:** the active order is seeded from `ORDER_CACHE` on
mount, so a warm return renders real content with zero skeleton, then reconciles from the
network.

**Tier 2 — component. Six named render branches, evaluated in this order:**

| # | Branch | When | UI |
|---|---|---|---|
| 1 | session expired | `401/403` on the stream or the GET | **full-screen** "Phiên làm việc hết hạn — quét lại mã QR tại bàn" + Về trang menu |
| 2 | no active order | `activeOrderId` null | friendly CTA **in the active-order zone only** — history + floor queue still render |
| 3 | active order gone | GET `404`/`403` | **scoped** "Đơn hàng không tồn tại" card + clears the orphaned pointer; the rest of the page keeps working |
| 4 | loading | GET pending, no cached copy | layout-shaped skeleton (no shift) |
| 5 | stream down | `!sseConnected` | **cosmetic only** — pill flips + `ConnectionErrorBanner`; last-known queue stays with a stale marker; page fully usable |
| 6 | data | default | the live screen |

Branch 3 is a **deliberate upgrade**: the reference made a missing order a full-screen
wedge (and in the overlay copy, an infinite spinner). Only branch 1 is fatal — losing your
order must not take the floor queue and your history down with it.

**Tier 3 — mutation:** the two cancels are **pessimistic** (`FE_STATE.md` rule 4) — confirm
in the modal → button disabled + inline "Đang huỷ…" → `204` → refetch. Never optimistic:
a cancel that the BE refuses (`CANCEL_THRESHOLD`) must not flicker the dish away first.

### 4.4 Page behaviors (the spec the AC will test)

1. **One stream, exhaustive switch.** A single `useOrderMonitorSSE` drives the connection
   pill, the status badge + queue position/ETA, per-dish progress, and the floor queue.
   Every event the BE publishes has a case; a new published type without a consumer case
   **fails CI** (`OVERALL_PLAN.md §3.5-2`). This is the single countermeasure that kills
   four reference bugs at once.
2. **Active-order banner.** BÀN tile · "Trạng thái:" + StatusBadge + "~8 phút" ·
   "Vị trí hàng chờ: #2 trong 5 đơn" · ETA line (pulses at **#1**) · `delivered` replaces
   the right side with "Đơn của bạn đã được phục vụ — Cảm ơn!" · "👁 Ẩn bàn của bạn"
   collapses the personal zone for privacy on a shared screen.
3. **Summary ⇄ detail centerpiece.** Defaults to "Tóm tắt đơn hàng" (Bàn 04 pill in a
   spinning orange ring); "Chi tiết ⌄" ⇄ "Ẩn chi tiết ⌃" reveals the three live cards.
   Groups **COMBO** / **MÓN LẺ**, per-item nhân caption in orange, per-combo "⌄ Chi tiết"
   expanding its component dishes, group subtotals, bold **Tổng cộng**.
4. **Read-only placed order.** Quantities are `×n` badges — **no steppers**; the order note
   is read-only with a "✓ Đã lưu" marker; 🗑 becomes **"Huỷ"** and appears only while
   cancel is allowed.
5. **The rollup — "TỔNG SỐ MÓN (n loại)".** Flatten every combo into component dishes,
   merge rows sharing **dish name AND nhân set**, sum quantities; `n` = distinct rows after
   merging. Combo header rows (₫0) are excluded from every dish list **and** from all
   progress math. Worked example (Bàn 04) = **7 loại**, with `Canh có rau ×7` (1 + 2 from
   combos + 4 individual) merged into one row while `Bánh Trứng Vàng` stays separate from
   the combos' `Bánh Trứng Chín`.
6. **Served progress.** Bar = `Σ qty_served / Σ quantity` over display items;
   `DishRow` shows **tổng ×n · ra ×n · còn ×n** plus its nhân + ghi chú caption
   ("↳ Nhân thịt · 'ít hành'" — the reference hid these); a served row shows **✓** in CÒN;
   footer "3/6 phần đã ra". Card C splits money into **Đã dùng / Còn lại / Tổng cộng**.
7. **History list.** "📋 Đơn hàng của bạn", newest first, from `ORDER_CACHE`: orange
   left-border card, progress bar **only while active**, meta row (served + relative time),
   3-dish preview + "+N món", tap **expands the same detail component inline**. Empty state
   = 🛍 "Chưa có đơn hàng nào" / "Quét mã QR tại bàn để bắt đầu đặt món". **"🗑 Xoá lịch
   sử" clears the cache AND the `activeOrderId` pointer** (the reference orphaned it).
8. **Whole-floor queue.** "Hàng chờ phục vụ" + "[3 bàn]" count pill; numbered rows sorted
   by order time: position · table label · StatusBadge · order number. **Your row is
   highlighted** with an orange ring + "(bàn bạn)". Only active statuses appear; takeaway
   shows "Mang về"; no progress bars here. Updates live.
9. **Queue numbers have one source.** Position and ETA come from the `queue.update`
   payload — the FE never computes them, so the banner and the floor list always agree.
10. **Cancel, two scopes, one predicate.** Per-dish "Huỷ" (`DELETE /orders/items/:id`)
    when that dish still has unserved units; whole-order "Huỷ toàn bộ đơn hàng"
    (`DELETE /orders/:id`) when `canCancel`. Both route through the one
    `CancelConfirmModal`. `canCancel` is a **single predicate in one file** so the §7 rule
    flip is a one-line change. A `422` refusal shows the envelope message in place.
11. **Status notification modal.** On a status transition: "Đơn của bạn đã được xác nhận"
    (confirmed) · "Món của bạn đã sẵn sàng!" (ready) · "Đơn đã bị huỷ" (cancelled), one
    "Đã hiểu" button. Fires from the live event, not from a poll.
12. **Actions.** "+ Thêm món" (dine-in only → `/menu?add_to_order=<id>`) and the outlined-red
    cancel; on `delivered` both are replaced by the calm "Đơn hàng đã hoàn thành" banner.
13. **Money via the one `formatVND()`** — the same function and the same glyph as the menu
    page (⚠️ glyph flag, §7). Zero-priced canh renders `0 đ`, never blank.
14. **VN-first copy**, exactly the reference strings, in one constants file; StatusBadge
    never shows a raw English status.
15. **Worked example everywhere** (docs, seeds, screenshots): **Bàn 04 · 103.000 · 7 loại**
    — the same canonical order as the menu plan, carried through to this page's receipts.

## 5. Task mapping — where this plan lands in TASKS.md

| TASKS.md row | This plan's slice | Receipt type |
|---|---|---|
| O-1 (orders schema) | §3.2 — already specified in `DB_SCHEMA.md §4.3`; **no new tables** | migrate up/down |
| O-2 (BE order read + cancel + item-edit) | §3.1 #1, #3, #4 + the `canCancel` predicate | curl: get, cancel OK, cancel refused (`CANCEL_THRESHOLD`), item cancel + total recalc |
| **R-1 (new)** — realtime platform + monitor SSE | §3.1 #2: pub/sub pkg, the one event-contract file, snapshot-on-connect, ownership gate, **BE-filled position/ETA** | two-client SSE transcript |
| **O-3 — FE `/orders`, static half** | §4 zones 3–4: active-order card, summary + rollup, detail cards, history list, cancels | mobile screenshots per §4.4 behavior |
| **R-2 (new) — FE `/orders`, live half** | §4 zones 1–2 + 5: connection pill, live badge + queue/ETA, per-dish progress, floor queue, notification modal | two-client screencap: chef serves → this screen moves |

✅ **Registered by this task (F-25).** The R phase had **no rows** in `TASKS.md`; **R-1**
(realtime platform + event contract + monitor SSE) and **R-2** (the FE live half) are now
registered under a new *Phase R — Realtime* section. **O-3 was also split**: its old row
("FE: order history + order detail with status tracking") was one row carrying two ACs —
the static half depends only on O-2, the live half is blocked on R-1. O-3 now owns the
static half only, and its row carries the split note (sizing rule: 1 session / 1 AC).

## 6. Reference defects designed out

| Ref finding | Our countermeasure |
|---|---|
| 🔴 404 / foreign order wedges the detail overlay in an infinite spinner (`isNotFound` returned, never read) | one detail component (§4.1) + branch 3 named and built (§4.3) |
| 🔴 Live status badge never advances — FE listens `order.status`, BE publishes `order_status_changed` | one event-contract file + exhaustive switch, CI-gated (§4.4-1) |
| 🟠 Per-dish cooking progress not live — `item_progress` published, no consumer case | same switch handles it (§3.3 / §4.4-6) |
| 🟠 History cards never refetch — cache scanned once, stale until a sheet is opened | re-scan on focus + reconcile live changes back into `ORDER_CACHE` (§4.2) |
| 🟠 `item_cancelled` / `items_added` published but unhandled — cancels and sibling-device appends invisible | same switch (§3.3) |
| 🟡 Queue `position`/`estimated_minutes` are FE-invented while the wire sends `0` placeholders | BE computes both; FE renders only (§3.4 / §4.4-9) |
| 🟡 SSE stream has no ownership check — any authed client can watch any order | own-order/table gate (`OVERALL_PLAN.md §3.5-3`) |
| 🟡 "Xoá lịch sử" leaves `activeOrderId` → orphaned pointer into a deleted order | clearing history clears the pointer (§4.4-7) |
| 🟡 `DishRow` hides nhân + ghi chú although both exist on the item | rendered as the caption (§4.4-6); nhân reads `toppings_snapshot`, no `filling` column (§3.2) |
| 🟡 Two implementations of one detail view drift apart (only one has the 404 branch) | one component, both callers (§4.1) |
| 🟡 Dead outputs shipped (`tableStatuses` unrendered, `reconnect()` with no button, an unused constant) | the event is handled; its UI is an explicit deferral, not silent dead code (§7) |
| 🟡 `{"data":…}` on GET but bare on POST — one endpoint pair, two envelopes | never wrap success (§3.4) |
| 🟡 No status replay on reconnect — transitions during a disconnect are lost | snapshot-on-connect (`OVERALL_PLAN.md §3.5-1`) |
| 🟡 Second SSE connection opened per detail sheet | exactly one stream per page, owned by the orchestrator (§4.2) |

## 7. Decisions + flags

- ⚠️ **FLAG — the cancel rule is still open** (`OVERALL_PLAN.md §3.7-3`, ❓ since F-9).
  Three sources disagree: the reference **code** enforces `< 30 % served` (and gives a
  `pending` order no cancel button at all), the reference **DESIGN_PROMPT** repeats the
  30 % rule, and the **owner's stated target** is "cancel any time before payment".
  **Plan default: the owner's rule** (harness wins), expressed as one `canCancel`
  predicate so the flip is a one-line change. Lock it before O-2 builds the BE gate —
  the BE and the button must never disagree.
- ⚠️ **FLAG — money glyph.** This page's DESIGN_PROMPT specifies `105.000 ₫` (U+20AB, space
  before); the menu plan locked `30.000 đ` (U+0111). `FE_STATE.md` allows exactly **one**
  `formatVND()`, so the app cannot ship both. **Plan default: the menu's `đ`** (it is
  already the canonical worked example). One constant, one file — say so and it flips
  everywhere at once. This drift is precisely what the one-formatter rule exists to catch.
- ⚠️ **FLAG — route reconciliation (touches the menu plan).** The menu plan §4.2 redirects
  post-201 to `/order/<id>`; this merged screen is **`/orders`**, pivoted on
  `activeOrderId`, so the id need not ride the URL. **Recommendation: the menu handoff
  targets `/orders`.** Not edited here — that plan owns its own handoff line, and this task
  stays surgical. Fold it in when the O-phase task wires the redirect.
- ✅ **Merge the three reference routes into one `/orders`.** `/tracking` and `/order` were
  two screens reading the same order over two stream hooks; the DESIGN_PROMPT's merge is
  the better product *and* removes a whole duplicated view.
- ✅ **History is device-local in v1** — no guest my-orders endpoint exists (§4.2). Honest
  client state, re-scanned and reconciled. 💡 Server-backed history is an A-phase (accounts)
  feature; revisit only then.
- ✅ **The active order is Query-owned; SSE only triggers refetch** — the reference's
  hook-owned `useState` copy is rejected (§3.4).
- ✅ **`tables.status` is consumed but not rendered** — the floor-table map is a deliberate
  deferral (staff surfaces own it), recorded so it can't rot into the reference's silent
  dead output.
- ❓ **CLARIFY — smooth progress vs refetch.** `item_progress` can move a dish's bar with no
  network round-trip; `items_added`/`item_cancelled` must refetch (rows change). Plan
  default: apply `item_progress` as a local cache patch, refetch on structural events.
  Confirm at R-1 — it is the difference between a smooth bar and a flicker.
- 💡 **SUGGESTION — `StatusBadge` is shared surface.** The six VN status pills are needed
  identically by KDS, POS and admin. Build it once in `components/shared/` (§4.1) rather
  than letting each surface re-style them; the reference drifted their colors per page.

## 8. Verify plan (per-task receipts, logged in `harness/VERIFICATION.md`)

- **O-2 (BE):** curl transcripts — `GET /orders/:id` (own = 200, foreign = 403, missing =
  404), `DELETE /orders/items/:id` (served = `422 CANCEL_THRESHOLD`, unserved = 204 **plus
  a `total_amount` recalc proof**), `DELETE /orders/:id` per the locked rule.
- **R-1 (realtime):** a **two-client transcript** — client A (chef) increments
  `qty_served`; client B's stream receives `item_progress` and the queue advances. Plus a
  reconnect transcript proving snapshot-on-connect replays a status changed while dropped,
  and a `403` proving the ownership gate.
- **FE rows:** mobile-viewport screenshots per §4.4 behavior — including the rollup showing
  **7 loại** for the Bàn 04 example, all six §4.3 branches (notably branch 3: the page
  survives a missing order), and a cancel round-trip.
- **This plan itself (F-25):** folder holds the four prefixed docs; the `.md` is complete;
  all three HTML companions render in both themes with no horizontal page scroll —
  receipt row dated 2026-07-19.

---

*Written by F-25 (2026-07-19) from the `customer_orders_tracking` DESIGN_PROMPT reconciled
with a 2-agent digest of its two parent page corpora. Task status lives in `TASKS.md`;
rules live in the docs in §2; order columns live in `DB_SCHEMA.md §4.3`; this file owns
only the `/orders` page's scope, contract, and mapping. The three HTML companions are
snapshots — on any conflict, this file wins.*
</content>
</invoke>
