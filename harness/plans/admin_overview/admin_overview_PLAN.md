# Admin Overview page — Consolidated FE + BE Build Plan (F-17)

> **TL;DR:** One plan, one folder, for the staff-facing **live floor command centre**
> (`/admin/overview`) — the default admin landing page. Unlike the customer menu (cached
> public reads + a client cart), this page is a **realtime projection of active orders**:
> the manager confirms incoming orders, advances kitchen statuses, takes cash payment, and
> frees tables, all from one always-on screen. FE and BE are planned together because the
> page is a realtime contract — an SSE delta stream mutating one TanStack Query cache.
> Visual companions: [`admin_overview_plan.html`](admin_overview_plan.html) (the plan),
> [`admin_overview_how-it-works.html`](admin_overview_how-it-works.html) (runtime
> sequences), and [`admin_overview_mockup-1.html`](admin_overview_mockup-1.html) (the UI on
> the neutral F-7 shell). Source: `reference/docs/system/08_pages/admin/admin_overview/`
> (10 docs, digested 2026-07-19 by 2 Explore agents) reconciled with `OVERALL_PLAN.md`
> phases O/R/AD, `BE_STATE.md`, `FE_STATE.md`, and the F-5 cookie-auth decision.
> **One fact one home:** this file owns the overview page's scope, contract, and task
> mapping — rules stay in their owning docs (linked in §2).

---

## 1. What the page is

Staff-only **floor dashboard** for a dine-in bánh cuốn restaurant, always open on a
counter tablet. `/admin` redirects here; it is tab 0 ("Tổng quan") of the admin shell,
which is guarded `AuthGuard` + `RoleGuard(minRole = manager)` — the human is always a
manager/admin.

Core loop (one order's life, watched live):

1. New order fires in over the realtime stream → **NewOrderPopup** → manager confirms
   (`pending → confirmed`).
2. Chef (on `/staff/kds`) advances `confirmed → preparing → ready` — the board updates
   live via the same stream, **no HTTP round-trip on this page**.
3. Manager advances `ready → delivered`.
4. Manager takes **cash** payment (`delivered → paid`) → the table frees to *Trống*.
5. The order drops off the live board into Zone E (Paid log).

In/out links: **in** from `/admin` (redirect) + the admin tab-nav; **out** to `/pos`
("Đặt hộ" — order on behalf from an empty table), the full `OrderDetail` view, and
`/order/:id` is the **customer-facing counterpart** (same DB write, different realtime
channel — the cross-device story in §4.5). The admin bottom-nav (11 sections) is shell
chrome, outside this page's scope.

## 2. Alignment — what governs this page (read, don't restate)

| Concern | Owning doc |
|---|---|
| Stack + versions | `harness/PLAN.md §Stack` |
| BE layering, tx policy, error envelope, cache-aside, **orders-never-cached** | `harness/BE_STATE.md` |
| goose+sqlc workflow, N+1 rule, Go/Gin gotchas | `harness/BE_PLAYBOOK.md` |
| FE state kinds, cache map, loading tiers, optimistic policy, hard rules 1–14 | `harness/FE_STATE.md` |
| Design tokens + components (neutral F-7 — **admin surface**) | `harness/diagrams/design-system.html` |
| Order state machine, realtime design, cancel rule, lessons register | `harness/OVERALL_PLAN.md §3.7 / §4` |
| Redis policy (pub/sub here, not cache) | `harness/ARCHITECTURE.md §4` |
| orders / order_items / tables / payments columns | `harness/DB_SCHEMA.md §4.3–§4.5` |

Reference docs are the **what**; the harness rules above are the **how**. Where they
conflict, the harness wins (established F-9 pattern — e.g. cookie JWT beats the
reference's `Authorization: Bearer` + `?token=` streams).

## 3. BE plan

### 3.1 Endpoints the page consumes (all under `/api/v1`)

| # | Route | Auth | Phase/Task | Behavior |
|---|---|---|---|---|
| 1 | `GET /tables` | staff (`AtLeast cashier`) | AD | `id, name, capacity, status, is_active, qr_token`; soft-delete filtered, `ORDER BY name`. **Not cached** — small table, live status. |
| 2 | `GET /orders/live` | staff (`AtLeast cashier`) | AD | Active orders `status IN (pending,confirmed,preparing,ready,delivered)`, `ORDER BY created_at ASC`, enriched with `items[]` + `table_name`. **One query with a JOIN/`IN` fetch — no N+1** (BE_PLAYBOOK; the reference did N+1 per order). The one shared cache bus (`['orders','live']`). |
| 3 | `GET /orders/history` | staff (`AtLeast cashier`) | AD | `status IN (paid,cancelled) AND DATE(updated_at)=CURDATE()`, `ORDER BY updated_at DESC`. Returns **`items:[]` deliberately** — the logs show totals only (§7 decision). |
| 4 | `GET /orders/:id` | staff (any) — customer restricted to own `table_id` (FE rule 13) | O | Full order + items with **derived `item_status`** (`pending/preparing/done` from `qty_served` vs `quantity` — no stored item status), + `table_name`. Fired on the `new_order` delta before the popup. |
| 5 | `PATCH /orders/:id/status` | staff (`AtLeast chef`) | R | Body `{status}`. Validates `validTransitions` (§3.4); `UPDATE … SET status, updated_at` in a tx; **publishes one delta** to the SSE channel. Invalid → `409 INVALID_STATUS_TRANSITION` with a **specific message** (fixes the reference's generic toast that hid the cause). |
| 6 | `POST /payments` | staff (`AtLeast cashier`) | P (cash path = O/COD) | Body `{order_id, method}` **only** — no `amount` (server reads `order.total_amount`; menu rule 5's twin). Order must be `ready`/`delivered`. `cash`: synchronous `completePayment` → `MarkOrderPaid` (`delivered → paid`) → publishes `payment_success`. Returns `201 {id, pay_url, qr_code_url}`. |
| 7 | `GET /sse/admin` (**SSE**) | **cookie JWT** + `AtLeast manager` | R | **The single realtime channel** (§3.4). Emits every board delta — `new_order`, `order_status_changed`, `item_progress`, `order_cancelled`, `payment_success` — as `{type, order_id, …}` frames + a 15 s keep-alive. Replaces the reference's split SSE-doorbell **+** ungated `WS /ws/orders-live?token=`. |

Errors ride the Session-0 envelope; codes from `BE_STATE.md §4` (`INVALID_STATUS_TRANSITION`
added for #5).

### 3.2 Schema this page depends on (columns canonical in `DB_SCHEMA.md`)

- `tables` — `name, capacity, status, is_active, qr_token` (`DB_SCHEMA.md §4.4`)
- `orders` — `order_number, status, source, table_id, customer_name, total_amount,
  created_at, updated_at` (`§4.3`); status enum + machine in `OVERALL_PLAN.md §3.7`
- `order_items` — `quantity, qty_served, combo_ref_id, toppings_snapshot` — **no item
  `status` column** (derived, FE rule 11's BE twin) (`§4.3`)
- `payments` — `order_id, method, amount, status, paid_at` (`§4.5`, P-phase stub today)

No new columns invented here. Amount lives on the order (snapshotted at create) and the
payment row — never sent by the client.

### 3.3 Cache map — **there isn't one** (the key difference from the menu plan)

Orders are **never cached** (`BE_STATE.md §7`). Every read on this page hits MySQL
directly; **Redis is pub/sub only** here — the SSE channel's fan-out bus, not a
cache-aside store. So there is no invalidation map to get wrong (the menu plan's whole
§3.3 collapses to one rule): freshness comes from (a) the SSE push and (b) short
`staleTime` safety-net polls (§4.3), never from a TTL'd catalog blob.

### 3.4 Not adopted from the reference BE (decided here)

- ❌ **Two realtime channels.** The reference ran an SSE doorbell (`orders:admin`, manager
  role, Bearer header) **and** a WS board (`orders:kds`, `?token=`, **no role gate** — any
  parseable JWT incl. `customer` connects; the digest's Flag 5). We collapse to **one
  cookie-JWT, manager-gated SSE stream** carrying every delta (§3.1 #7). Kills the SEC hole
  structurally (same family as the menu's `?token=` SEC-02) and deletes the reference's two
  dead WS switch cases (`order_updated`, `order_completed` — never published).
- ❌ **`Authorization: Bearer` / `?token=` auth on the stream** — cookie JWT (F-5).
- ❌ **Client-supplied `amount` on `POST /payments`** — dead weight the BE ignored; the
  server is the only authority on the charge (rule 5).
- ❌ **N+1 enrichment** on `GET /orders/live` — one batched fetch (BE_PLAYBOOK).
- ❌ **Delivered→cancelled path** — never existed in `validTransitions`; the UI button that
  called it always 409'd (D1). We don't add the transition; we remove the button (§4.4 B3).

### 3.5 Wire shapes (the FE↔BE object gallery)

> Contract shapes from this plan — field spellings get **frozen by curl receipts** when the
> AD/R/O rows build them (gate 8: `types.ts` written from receipts, never guessed). Success
> responses are never wrapped; only errors ride the envelope.

**`GET /tables` → 200**

```json
[ { "id": "tb03…36", "name": "Bàn 03", "capacity": 4, "status": "occupied",
    "is_active": true, "qr_token": "qr_ab12…" } ]
```

**`GET /orders/live` → 200** — active orders, items joined, `table_name` enriched:

```json
[ { "id": "ord43…36", "order_number": "BC-43", "status": "confirmed",
    "source": "qr", "table_id": "tb03…36", "table_name": "Bàn 03",
    "customer_name": null, "total_amount": 70000,
    "created_at": "2026-07-19T09:45:00Z", "updated_at": "2026-07-19T09:47:00Z",
    "items": [
      { "id": "oi1…", "name": "Bánh cuốn trứng", "quantity": 2, "qty_served": 0,
        "combo_ref_id": null, "toppings_snapshot": [ { "name": "Nhân thịt", "price": 0 } ] },
      { "id": "oi2…", "name": "Trứng", "quantity": 1, "qty_served": 0,
        "combo_ref_id": null, "toppings_snapshot": [] } ] } ]
```

`item_status` (`pending/preparing/done`) is **derived** from `qty_served` vs `quantity`,
not stored — the FE helper computes it (§4.4 B6).

**`GET /orders/history` → 200** — logs, **`items` always empty** (totals only):

```json
[ { "id": "ord41…36", "order_number": "BC-41", "status": "paid", "table_name": "Bàn 01",
    "total_amount": 120000, "created_at": "2026-07-19T04:30:00Z",
    "updated_at": "2026-07-19T05:05:00Z", "note": null, "items": [] } ]
```

**`PATCH /orders/:id/status`** — request `{ "status": "confirmed" }`; **200** returns the
updated order (same shape as one `/orders/live` element) so the optimistic patch reconciles
against a real object, not a thin `{id}` (lesson 7).

**`POST /payments` request** — no `amount`, ever:

```json
{ "order_id": "ord43…36", "method": "cash" }
```

**`POST /payments` → 201**

```json
{ "id": "pay1…36", "pay_url": null, "qr_code_url": null }
```

`cash` completes synchronously (`pay_url`/`qr_code_url` null); gateway methods (P phase)
return a redirect/QR.

**SSE frame (`GET /sse/admin`)** — one envelope for every delta the board consumes:

```
event: connected
data: {}

event: message
data: { "type": "order_status_changed", "order_id": "ord43…36", "status": "preparing" }

event: message
data: { "type": "item_progress", "order_id": "ord43…36", "item_id": "oi1…",
        "qty_served": 2, "quantity": 4 }
```

Types: `new_order` (→ FE fetches `GET /orders/:id`, then popup), `order_status_changed`,
`item_progress`, `order_cancelled`, `payment_success`.

**Every error, every endpoint — one envelope** (`BE_STATE.md §4` owns the codes):

```json
{ "error": { "code": "INVALID_STATUS_TRANSITION",
             "message": "Đơn đã giao chỉ có thể chuyển sang Đã thanh toán",
             "details": [ { "field": "status", "issue": "delivered→cancelled not allowed" } ] } }
```

`client.ts` throws `ApiError{status, code, message, details}` — the specific message is what
lets the UI say *why* a transition failed (fixes D5's generic toast).

## 4. FE plan

### 4.1 Route + file map (extends `FE_STATE.md §8` — exact paths)

```
fe/src/app/(admin)/overview/
  page.tsx              # CSR client page: owns the 2 eager queries + the SSE hook;
                        #   the ONLY bridge between the cache and the zones (props down,
                        #   onAction up); owns page-local useState + the 3 selection sets
  loading.tsx           # dashboard-shaped skeleton (header + KPI row + table grid)
                        #   — DELIBERATE upgrade: reference had only a route spinner
components/admin/overview/
  OverviewHeader.tsx    # title + animated Live dot (bound to SSE connected state)
  OverviewSearchBar.tsx # client-side filter over Zone B + Zone D (order#/id/name/table)
  ConnectionBanner.tsx  # sticky red bar when the SSE stream is down
  NewOrderPopup.tsx     # SSE new_order → confirm/dismiss overlay
  StatCards.tsx         # Zone A — 4 derived KPI cards + 30 s urgency timer
  TableSection.tsx      # Zone D shell: owns viewMode; renders D1→D2→(B)→D4→D3
  ViewToggleHeader.tsx  # Zone D1 — list/grid toggle (dumb; parent owns viewMode)
  DishSummaryStrip.tsx  # Zone D2 — floor-wide dish aggregate ("Tổng món") + preview Δ
  WaitingSection.tsx    # Zone B — pending-ONLY confirmation queue (fixes D5)
  ConfirmedPrepList.tsx # Zone D4 — confirmed-order prep rollup (excl. canh/giò)
  TableList.tsx         # Zone D3 list — 1 row/table; pay/cancel on delivered rows
  TableGrid.tsx         # Zone D3 grid — 1 card/table; pay/cancel wired too (fixes gap)
  PrepPanel.tsx         # Zone C — only when kiemTraIds.size > 0
  PaidLog.tsx           # Zone E — collapsed accordion, lazy history
  CancelLog.tsx         # Zone F — collapsed accordion, shares the history query
  OrderDetail.tsx       # shared expand card: progress bar + per-item served counts
  PaymentModal.tsx      # two-checkbox cash gate → POST /payments {order_id, method}
  TableDetailDrawer.tsx # right-slide drawer: item list + total + "Xem đầy đủ →"
queries/admin-orders.ts # useLiveOrders / useTables / useTodayHistory (keys from keys.ts)
hooks/useAdminStream.ts # the ONE SSE hook → setQueryData(['orders','live']); connected flag
lib/overview-helpers.ts # itemStatus, itemCounts, toppingLabel, elapsedMins, urgencyBorder,
                        #   summarizeTableDishes — pure derivations, no state
```

Not ported (dead / duplicated in the reference's own audit): the WS hook
`useOverviewWS` + `OrdersWSContext` (folded into `useAdminStream`), the dead props
`checkedTableIds`/`onToggleCheck` on `TableList` (D4), and `TABLE_ACTIVE` (a redundant
duplicate of `ACTIVE` — one set, §4.2).

### 4.2 State ownership (instance of `FE_STATE.md §1` — no new kinds)

| Data | Kind | Owner |
|---|---|---|
| live orders | server | TanStack Query `['orders','live']`, `staleTime` 15 s — **the shared realtime bus** |
| tables | server | TanStack Query `['tables']`, `staleTime` 60 s |
| today's history (paid + cancelled) | server | TanStack Query `['orders','history']`, `staleTime` 30 s, **`enabled: accordionOpen`** (lazy) |
| SSE connected? | session | `useAdminStream` return flag (drives ConnectionBanner + Live dot) |
| `loadingIds` (orders mid-PATCH) | local | `page.tsx` useState → props down to disable buttons |
| `kiemTraIds` (order ids) | local | `page.tsx` → Zone C PrepPanel + Tổng-món Δ preview |
| `checkedTableIds` (table ids) | local | `page.tsx` → per-table "đã kiểm" mark |
| `prepPreviewIds` (order ids) | local | `page.tsx` → Zone D4 amber ⊕ column |
| `searchQuery`, `viewMode`, `popupOrder`, `now` | local | `page.tsx` useState |

**No Zustand / Redux on this page** (digest-confirmed) — server-state + `page.tsx`
useState + one SSE hook is the whole model. `page.tsx` is the single bridge: it owns all
queries, derives the filtered arrays, and passes them **down as props**; writes flow **up**
via `onAction` callbacks. Zero peer-to-peer widget state.

**Realtime propagation — one path, not two:**

```
GET /sse/admin (cookie JWT, manager) ──> useAdminStream
    new_order            → GET /orders/:id → prepend to ['orders','live'] + setPopupOrder
    order_status_changed → patch or (status∉ACTIVE) drop from ['orders','live']
    item_progress        → patch item.qty_served
    order_cancelled      → drop from ['orders','live']
    payment_success      → drop from ['orders','live']
```

**Write path (`handleAction`) — optimistic WITH rollback (fixes the reference gap):**

```
add id → loadingIds  →  await PATCH /orders/:id/status
  success → setQueryData patch (reconciled by the returned order)
  error   → ROLLBACK the optimistic patch + toast the SPECIFIC ApiError.message
  finally → remove id from loadingIds
```

The reference applied the optimistic write and did **no** rollback (relied on the 15 s
refetch), so a rejected transition briefly flashed the wrong status on the board. We roll
back — and the button only offers **valid** next transitions (§4.4 B3), so the 409 path is
unreachable in normal use anyway.

### 4.3 Loading strategy (instance of `FE_STATE.md §4–5` — three tiers, never stacked)

**Tier 1 — route (first paint):**

- CSR page; all three queries default to `[]` so the page paints instantly with empty
  zones and fills in. `loading.tsx` renders a **dashboard-shaped skeleton** (header + KPI
  row + table grid) — a **deliberate upgrade** over the reference's single centered
  `/admin/loading.tsx` spinner (which covered all `/admin/*` and skeleton-gated nothing).
- `AuthGuard`/`RoleGuard` resolve the manager gate before the page mounts.

**Tier 2 — component (query + stream states). Named render branches, all built:**

| Branch | When | UI |
|---|---|---|
| connecting | SSE state `null`, queries pending | skeleton zones (not a blank window — fixes the reference's blank AuthGuard gap) |
| disconnected | SSE state `false` | sticky `ConnectionBanner` "Mất kết nối thời gian thực…" + board stays on last data |
| new-order | `popupOrder != null` | `NewOrderPopup` overlay |
| empty | query ok, zone has no rows | per-zone empty copy ("Chưa có đơn hàng — quán đang yên tĩnh"), not a spinner |
| data | default | zones A–F |

- `['orders','live']` `staleTime` 15 s is the **safety-net poll**; the SSE push is the
  primary freshness source, so the poll rarely does visible work.
- The 30 s `now` timer re-renders urgency borders (`>20′` red / `10–20′` amber) with **zero
  network** — pure client re-derivation.
- History (`['orders','history']`) is **lazy** — no fetch until an accordion opens
  (`enabled: open`); Zone E and Zone F share the key so opening one warms the other.

**Tier 3 — mutation:** status advance + payment are the only writes. **Optimistic +
rollback** for status (§4.2); payment is **pessimistic** (FE rule 4) — the PaymentModal
confirm disables + shows "Đang xử lý…", never a full-page overlay, and on error the modal
stays open with the envelope message and the order untouched.

### 4.4 Page behaviors (the spec the AC will test)

1. **Board = a projection of `['orders','live']`.** Every zone reads the same filtered
   slice of one cache; the SSE stream mutates that cache via `setQueryData`; no zone owns
   its own copy of an order.
2. **New-order doorbell.** SSE `new_order` → fetch `GET /orders/:id` → `NewOrderPopup`
   (order #, table, kitchen items, total) → **Xác nhận** PATCHes `pending → confirmed` and
   closes; **Bỏ qua** dismisses without a write.
3. **Status advance = transition-validated buttons.** Each row offers only the **valid**
   next status from the machine (§3.4); cancel appears only on `pending/confirmed/preparing`
   — **never a Huỷ on a delivered order** (D1 designed out). Delivered rows offer only
   *Đã thanh toán 💰*.
4. **Search filters Zone B + Zone D together**, client-side, on
   `order_number`/id/`customer_name`/table name — no debounce, no refetch; header shows
   "N đơn · M bàn phù hợp".
5. **Zone A KPIs are derived** from orders with a real `table_id` + tables + `now`:
   *Bàn đang phục vụ* `occupied/total`, *Món chờ làm* Σ pending, *Món đang làm* Σ preparing,
   *Khẩn cấp/Cảnh báo* `urgent/warning` (a **ratio**, red bg when urgent > 0). None stored.
6. **Zone B = pending-only confirmation queue** (fixes D5: the reference doc drew it as a
   multi-status queue with a phantom Huỷ button the code never rendered). Row shows
   urgency-bordered table, order #, elapsed, remaining count, 🔍 Kiểm tra + one confirm
   button; `item_status` derives from `qty_served`.
7. **Zone D** — `DishSummaryStrip` floor-wide dish aggregate (chips `Bánh ×10 …`, `+Δ`
   preview from 🔍 tables) → `ConfirmedPrepList` prep rollup (confirmed orders, **excl.
   canh/giò**, TỔNG row) → `TableList`/`TableGrid` toggle. **Both list and grid can pay and
   cancel** (the reference wired those only into the list — gap closed).
8. **Zone C `PrepPanel` renders only when `kiemTraIds.size > 0`** — aggregates remaining
   dishes of 🔍-marked pending orders; canh (♨) pinned last with có/không-rau breakdown.
9. **Cash payment gate.** `PaymentModal` shows the total + two checkboxes ("Khách đã đưa
   tiền" + "Nhân viên đã nhận đủ"); confirm enabled only when **both** ticked; posts
   `{order_id, method:'cash'}` (no amount) → on 201 drops the order from `['orders','live']`,
   invalidates `['orders','history']`, frees the table to *Trống*.
10. **Zones E/F are collapsed accordions**, lazy — badge counts read from the history query
    only after first open (matches the code; the reference doc wrongly drew them always-open).
11. **Connection banner.** SSE down → sticky red bar; board holds last data; auto-reconnect
    with backoff; the Live dot goes grey.
12. **Role-gated, one channel.** Page is manager+; endpoints are role-scoped (FE rule 13);
    the realtime feed is a **single cookie-JWT SSE stream** — no `?token=` WS, no second
    channel.
13. **Worked example everywhere** (docs, seeds, screenshots): **floor 3 / 8 bàn · Bàn 03 ·
    order #BC-43 · Bánh cuốn trứng ×2 + Trứng ×1 = 70.000 đ · 3 món** (our canonical set,
    fixing the reference's own numeric drift across its wireframes).

## 5. Task mapping — where this plan lands in TASKS.md

Admin is **Session-0 deferred** (`OVERALL_PLAN.md` phase **AD**), so these are the AD-phase
rows this plan will seed when the phase opens; the realtime and payment slices overlap the
**R** and **P** phases and cross-link there rather than duplicating.

| Future TASKS.md row | This plan's slice | Receipt type |
|---|---|---|
| AD-1 (BE reads) | §3.1 #1–4: `GET /tables`, `/orders/live` (no N+1), `/orders/history`, `/orders/:id` | curl transcripts + row counts |
| R-phase (realtime) | §3.1 #5 `PATCH …/status` + `validTransitions` + §3.1 #7 the **one SSE channel** (cookie JWT, manager) | curl: valid + 409 transition; SSE frame capture |
| P-phase (payment, cash first) | §3.1 #6 `POST /payments` cash path → `MarkOrderPaid` | curl: cash → paid; table freed |
| AD-2 (FE overview shell) | §4 zones A/D/E/F + header/search/skeleton + `useAdminStream` | screenshots (tablet viewport) |
| AD-3 (FE order actions) | Zone B/C, `OrderDetail`, status buttons, `PaymentModal`, optimistic+rollback | screenshots + 2-client (KDS↔overview) |

Sizing: each row keeps the 1-session / 1–2-file / 1-AC rule; AD-2 is the biggest and may
split (shell+zones / realtime wiring) at registration.

## 6. Reference defects designed out (overview slice of `OVERALL_PLAN.md §6`)

| Ref finding | Our countermeasure |
|---|---|
| 🔴 D1 — *Huỷ* button on delivered orders always 409s (`delivered→cancelled` not in the machine); generic toast hides the cause | Button offers only **valid** transitions (§4.4 B3); no cancel past `preparing`; `INVALID_STATUS_TRANSITION` carries a **specific** message |
| 🔴 D2 — two dead WS switch cases (`order_updated`, `order_completed`) the BE never publishes | One SSE hook with only the five real delta types (§4.2) |
| 🔴 D3 — phantom `amount` on `POST /payments`, silently ignored by the BE | `{order_id, method}` only; server owns the charge (rule 5, §3.4) |
| 🔴 D4 — dead `checkedTableIds`/`onToggleCheck` props declared, passed, never used | Props removed; `checkedTableIds` is a real page-owned set with a real mark |
| 🔴 D5 — Zone B drawn as a multi-status queue with a phantom Huỷ button | Zone B is a **pending-only** queue; plan.html + mockup drawn from behavior, not the stale doc |
| Two realtime channels; WS `?token=` has **no role gate** (any customer JWT connects) | One cookie-JWT, manager-gated SSE stream (§3.4) — SEC hole gone structurally |
| Optimistic status write with **no rollback** → wrong status flashes on reject | Optimistic **+ rollback** (§4.2) |
| N+1 order enrichment on the live list | One batched fetch (§3.4) |
| `TABLE_ACTIVE` duplicate of `ACTIVE`; `now`/branches under-documented | One `ACTIVE` set; all render branches named (§4.3) |
| TableGrid can't pay/cancel (only TableList wired) | Both views wired (§4.4 B7) |

## 7. Decisions + flags

- ✅ **One SSE channel, cookie JWT, manager-gated** — supersedes the reference's SSE+WS
  split and its ungated `?token=` WS. A dashboard only *receives* deltas, so a single
  server→client SSE stream is the right primitive (WS's bidirectionality was unused).
- ✅ **Orders never cached; Redis pub/sub only on this page** (`BE_STATE.md §7`) — there is
  no cache-invalidation map to get wrong (the menu plan's §3.3 has no analog here).
- ✅ **`items:[]` on `GET /orders/history` kept** — the paid/cancel logs show totals and
  timestamps only; fetching line items for a log nobody drills into is waste. Drill-down
  uses `GET /orders/:id` on demand.
- ✅ **Optimistic status advance + rollback**; **pessimistic payment** (FE rule 4). Status
  advance is high-frequency floor UX and deserves the snappy path; a rollback + valid-only
  buttons make it safe.
- ✅ **Admin surface = neutral F-7 tokens** (`design-system.html`), **not** the customer
  dark/orange shell — the mockup is theme-aware (adapts to the viewer's light/dark).
- ⚠️ **FLAG — cash-payment phase.** v1 is COD (`OVERALL_PLAN.md` §Payment deferred), so the
  cash path of `POST /payments` must land in the **O/AD** window even though gateways are
  P-phase. The plan scopes cash-only now; `pay_url`/`qr_code_url` stay null until P.
- ❓ **CLARIFY — cancel rule.** `OVERALL_PLAN.md §3.7` still lists the cancel rule as an
  open ❓. This plan assumes cancel is valid from `pending/confirmed/preparing` only (the
  reference machine). Lock it in when the O phase opens; if the house wants delivered-cancel
  (comp/void), it's a new transition + an audit reason, not a silent 409.
- ⚠️ **FLAG — N+1 on the live list.** The reference enriched each order with a separate
  query. Our AD-1 AC requires one batched fetch; call it out at build so it doesn't creep
  back.

## 8. Verify plan (per-task receipts, logged in `harness/VERIFICATION.md`)

- BE rows: curl transcripts for #1–6 incl. a **valid** and a **rejected** status transition
  (409 with the specific code), a cash payment → `paid` → freed table, and an SSE frame
  capture proving the single channel emits all five delta types.
- FE rows: tablet-viewport screenshots per behavior §4.4 (esp. B3 no-Huỷ-on-delivered, B6
  pending-only Zone B, B9 two-checkbox gate) + a 2-client transcript (a KDS PATCH updates
  the overview board with no overview HTTP call).
- This plan itself (F-17): folder exists, MD complete, all three HTML companions render in
  both themes — receipt row dated 2026-07-19.

---

*Written by F-17 (2026-07-19) from a 2-agent digest of the reference
`reference/docs/system/08_pages/admin/admin_overview/` corpus (10 docs), reconciled with
`OVERALL_PLAN.md` phases O/R/AD/P, `BE_STATE.md`, `FE_STATE.md`, and the F-5 cookie-auth
decision. Task status lives in `TASKS.md`; rules live in the docs in §2; this file owns only
the overview page's scope, contract, and mapping.*
