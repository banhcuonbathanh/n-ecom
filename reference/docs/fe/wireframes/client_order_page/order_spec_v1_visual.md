---
page: Order Tracking (Theo Dõi Đơn Hàng) — VISUAL SHORT SPEC v1
route: /(shop)/order/[id]/page.tsx
created: 2026-06-11
updated: 2026-06-11   # verified line-by-line against fe source (post-TOP epic — no filling field)
status: companion to Client_Order_Page_Status_Routing_Reference.md (canonical routing table) — diagram-first summary
reads_with: ./Client_Order_Page_Status_Routing_Reference.md   # status→UI gating detail lives there
---

# Order Tracking Page — v1 Visual Spec (the short one)

> **Read this to *understand* the page in 5 minutes.** For the full status→element routing
> table → [Client_Order_Page_Status_Routing_Reference.md](./Client_Order_Page_Status_Routing_Reference.md).
>
> **What the page is:** the **read side** of `/menu` — a mobile-first **live order tracker**.
> The menu page creates the order; this page watches it cook. One order per page (`/order/<uuid>`),
> driven by **one REST snapshot + one SSE stream**. The customer can only **adjust qty** or
> **cancel** — every status advance happens staff-side (KDS/Overview) and arrives here via SSE.

> ⚠️ **Staleness note on the canonical companion:** the routing reference is dated **2026-06-07 —
> pre-TOP epic**. It still documents `item.filling` / `fillingLabel()` (its last table row) and a
> "skeleton not built" gap. Both are outdated: `filling` no longer exists anywhere in FE src
> (migration 017 — nhân lives ONLY in `toppings_snapshot`), and the skeleton **is built**
> (`page.tsx:175-229`). Everything in THIS file is re-verified against today's code.

---

## 1 · Component Map

Unlike `/menu` (brain + dumb zones), this page is a **monolith**: one `page.tsx` holds all
zones inline, plus one local component (`DishRow`, `page.tsx:681`). All live data comes from
ONE hook — `useOrderSSE` — everything else is derived in a single `useMemo` (`page.tsx:79-145`).

```
OrderPage (page.tsx — 'use client', Pattern B)
│   useOrderSSE(id) → { order, progress, connectionError, isNotFound, notification }
│
├─ Sticky header ........ A   ← back + "Theo Dõi Đơn Hàng" + LIVE / MẤT KẾT NỐI pill (:273)
├─ ConnectionErrorBanner  B   ← only when connectionError (:295)                    [shared]
├─ Order card ........... C   ← Bàn X · order# · StatusBadge · total · elapsed · Ẩn/Hiện (:300)
│   ├─ progress bar           width = progress% (served/total qty — NOT status)     (:321)
│   ├─ combo sections ×N      grouped by combo_ref_id, each collapsible            (:334)
│   │   ├─ DishRow ×N (indent)
│   │   └─ [Huỷ N món còn lại của <combo>]   when remaining>0 && isActive          (:364)
│   ├─ DishRow ×N             standalone items (món lẻ + canh)                     (:380)
│   └─ "X/Y phần đã ra" + note counts ("rau ×3")                                   (:391)
├─ Dish summary table ... D   ← "Chi tiết món": 1 row per product_id · SL/Ra/Còn/giá (:406)
├─ Money summary ........ E   ← Đã dùng / Còn lại (only if >0) / Tổng cộng          (:519)
├─ Completed banner ..... F   ← only status === 'delivered'                         (:539)
├─ [Huỷ toàn bộ đơn hàng] G   ← only canCancelOrder (progress<30 + confirmed|preparing) (:550)
├─ Action row ........... H   ← only when order.table_id:                           (:560)
│       isActive  → [Theo dõi bàn → /tracking] + [Thêm món → /menu?add_to_order=id]
│       terminal  → [Đặt thêm món → /menu]
├─ Notification modal ... M1  ← SSE-driven: confirmed / ready / cancelled           (:587)
└─ Cancel confirm modal . M2  ← cancelTarget: item / combo-remaining / order        (:640)

FULL-PAGE replacements (mutually exclusive, before anything above):
  isNotFound → "Không tìm thấy đơn hàng" + [Về trang menu]                          (:155)
  !order     → skeleton (nav + card + table + money + button, animate-pulse)        (:175)
```

**The three derived gates** (everything status-related hangs off these — `page.tsx:232-235`):

```
isActive       = status !== 'delivered' && status !== 'cancelled'   ← ⚠️ 'paid' counts as active
canCancelOrder = progress < 30 && (status === 'confirmed' || status === 'preparing')
progress       = round(Σ qty_served / Σ quantity × 100)             ← useOrderSSE.ts:152 (qty, not status)
```

**Per-DishRow gates** (`page.tsx:694-695, 759`):

```
canStepper = isActive && item.qty_served === 0     → QuantityStepper (min 1)
[Huỷ]      = isActive && remaining > 0             → opens M2
nhân/toppings = toppings_snapshot chips (name + price if >0) — NO filling badge (TOP epic)
```

---

## 2 · Shared Components (reuse before you build)

> Registry: [`../shared/_INDEX_SHARING_COMPONENT.md`](../shared/_INDEX_SHARING_COMPONENT.md)

```
ALREADY SHARED (used here)              OWNED here, page-local
┌──────────────────────────────┐       ┌──────────────────────────────┐
│ StatusBadge (7 status labels)│       │ DishRow (inline, page.tsx:681)│
│ ConnectionErrorBanner        │       │ M1 / M2 modals (inline JSX)   │
│ QuantityStepper (size="sm")  │       │ skeleton (inline JSX)         │
└──────────────────────────────┘       └──────────────────────────────┘
```

✅ This page already uses the shared `QuantityStepper` that the menu feature duplicates —
it is the *reference consumer*. Nothing here needs extraction today; DishRow is too
page-specific (ra/còn badges + cancel slot) to share.

---

## 3 · Loading Strategy

```
COLD VISIT (Pattern B, but with a localStorage warm-paint trick)

  blank ──► cached order? ──► PAINT STALE ORDER instantly (localStorage order_cache_<id>)
  │             │ no cache
  │             ▼
  │         skeleton (animate-pulse — nav + card + table + money + button)
  ▼
  GET /orders/:id ──► setOrder(snapshot) ──► real content
       │ 404 → isNotFound → full-page "Không tìm thấy đơn hàng"
       │ other error → skeleton stays, SSE opens anyway (may still recover)
       ▼
  SSE /orders/:id/events ──► live patches forever (or until terminal event)
```

The cache-seed (`useOrderSSE.ts:33-38`) means a RETURNING visitor never sees the skeleton —
they see the last-known order instantly, then SSE/REST corrects it. Skeleton appears only on
the genuinely-first visit per order id.

---

## 4 · Local Data Management (in-page state)

This page **owns no global state**. Server truth lives in `useOrderSSE`'s `useState`;
the page adds only collapse/modal UI state. It WRITES to `useCartStore` exactly twice,
both as navigation handoffs (§5).

```
SERVER TRUTH (useState inside useOrderSSE — NOT TanStack Query, see ⚠️ §6)
┌──────────────────┬──────────────────────────────────────────────────┐
│ order            │ the Order snapshot — seeded by cache+REST,        │
│                  │ patched in place by SSE events                    │
│ progress         │ derived: round(served/total × 100)                │
│ connectionError  │ true after 3 failed SSE reconnects → banner+pill  │
│ isNotFound       │ REST 404 → full-page replacement                  │
│ notification     │ {kind: confirmed|ready|cancelled} → M1 modal      │
└──────────────────┴──────────────────────────────────────────────────┘

PAGE-LOCAL (useState in OrderPage)
┌──────────────────┬──────────────────────┬───────────────────────────┐
│ cancelTarget     │ which M2 flavour      │ item / combo-remaining / order │
│ collapsed        │ Zone C dish rows      │ Ẩn/Hiện on the order card │
│ collapsedSummary │ Zone D table          │ Ẩn/Hiện on Chi tiết món   │
│ collapsedCombos  │ Set<combo_ref_id>     │ per-combo toggle in Zone C│
└──────────────────┴──────────────────────┴───────────────────────────┘
```

No RHF/Zod, no cart, no form — the only inputs are steppers and buttons.

### 4a · The ONE aggregation `useMemo` (page.tsx:79-145) — read-side math

Everything the zones render is derived here from `order.items[]` in one pass:

```
order.items[]
   │ filter OUT combo headers (combo_id && !combo_ref_id) — they carry unit_price 0
   ▼                                  └─► comboNameMap: header.id → header.name
displayRows (children + món lẻ + canh)
   ├─ eatenAmount      = Σ unit_price × qty_served              → Zone E "Đã dùng"
   ├─ remainingAmount  = Σ unit_price × (quantity − qty_served) → Zone E "Còn lại"
   ├─ totalQty / totalServed                                    → "X/Y phần đã ra"
   ├─ summaryRows      = group by product_id (fallback name):    → Zone D table
   │     totalQty · totalServed · remaining · totalMoney ·
   │     remainingMoney · remainingItemIds · unique toppings · unique notes
   └─ noteCounts       = per-note Σ quantity ("rau ×3")          → Zone C footer
```

Render-time regrouping (`page.tsx:238-268`): `displayRows` → ordered `sections[]` —
a `combo` section per `combo_ref_id` (items + name from `comboNameMap`) interleaved with
`standalone` items, **in first-appearance order** (the BE array is UUID-sorted, so the
grouping is rebuilt here; never trust array order — same rule as menu spec §6f).

---

## 5 · Cross-Page Data (what survives, what doesn't)

```
┌──────────────────┬──────────────────────┬──────────────────────────────────────┐
│ store / cache    │ key                   │ this page…                            │
├──────────────────┼──────────────────────┼──────────────────────────────────────┤
│ order_cache_<id> │ raw localStorage      │ READS on mount (warm paint) +         │
│                  │ (STORAGE_KEYS.        │ WRITES on every setOrder — display    │
│                  │  ORDER_CACHE + id)    │ cache only, never authoritative       │
│ useCartStore     │ cart-config (partial) │ WRITES setActiveOrderId / setTableId  │
│                  │                       │ as the Zone H navigation handoff      │
│ useAuthStore     │ memory ONLY           │ READS accessToken → REST + SSE header │
└──────────────────┴──────────────────────┴──────────────────────────────────────┘
```

**Handoffs OUT of this page (Zone H, `page.tsx:560-583`):**

```
[Theo dõi bàn]   setActiveOrderId(id)                    → /tracking
[Thêm món]       setTableId(table_id) + setActiveOrderId(id) → /menu?add_to_order=<id>
                  └─ the actual POST /orders/:id/items happens ON THE MENU PAGE, not here
[Đặt thêm món]   setTableId(table_id) + setActiveOrderId(null) → /menu   (fresh order)
[Huỷ toàn bộ] ✓  router.push('/menu')   (cache row for the dead order stays — see §7)
[←] back         router.back()  ⚠️ no fallback — deep-link visitors with no history go nowhere useful
```

**Handoff INTO this page:** `/menu`'s TableConfirmModal pre-warms `order_cache_<id>` right
after POST (menu spec §6c) — so the redirect into this page paints instantly.

---

## 6 · Backend — Load · Send · Receive · Errors

> ⚠️ **Architectural drift (documented, not fixed):** project rule says "server state →
> TanStack Query", but this page has **no `useQuery`**. `useOrderSSE` holds the order in
> `useState`. The mutations call `invalidateQueries(['order', id])` on success — a **no-op**,
> since nothing populates that key. Refresh after a write relies entirely on the BE
> publishing an SSE event back.

All HTTP goes through `lib/api-client.ts` (axios + Bearer interceptor + global 401 handling —
same as menu spec §6d: guest 401 → bounce to `/menu`). The SSE stream uses
`@microsoft/fetch-event-source` so it can send the same `Authorization: Bearer` **header**
(native EventSource can't).

### 6a · LOADING (reads) — one REST + one stream (both inside useOrderSSE)

```
│ GET /orders/:id          │ once per (orderId, token) │ → setOrder(snapshot) · 404 → isNotFound │
│ GET /orders/:id/events   │ SSE, Bearer header        │ → live patches below                    │

reconnect policy (useOrderSSE.ts:16-21):
  5 attempts · exp backoff 1s → 2s → 4s → 8s → 16s (cap 30s)
  ≥3 failures → connectionError=true → banner + MẤT KẾT NỐI pill
  ≥5 failures → GIVES UP permanently — no recovery until full page reload  ⚠️
```

**SSE events → what they patch** (`useOrderSSE.ts:83-123`):

```
order_status_changed {status, eta?} → patch order.status
                                      status confirmed → M1 "Nhà hàng đã nhận đơn!" (+ETA)
                                      status ready     → M1 "Đến lượt bàn của bạn!"
                                      status cancelled → M1 "Đơn hàng đã bị huỷ"
                                      (preparing / delivered / paid → silent patch, no modal)
order_cancelled                     → status='cancelled' + M1 + STOP stream (terminal)
item_progress {item_id, qty_served} → patch that item's qty_served
                                      → progress bar · ra/còn badges · Zone E money all re-derive
order_init / order_completed        → ☠️ DEAD branches — BE never emits either string
                                      ('delivered' arrives as order_status_changed)
```

Zone F's "đã hoàn thành" banner renders from the **snapshot** `order.status === 'delivered'`,
not from a modal — there is deliberately no modal for delivered.

### 6b · SENDING (writes) — 4 mutations, all "shrink-only"

The customer can never advance status. No payload builder involved (`order-payload.ts` is a
menu/checkout concern — this page sends ids, not cart lines).

```
1 · qty     PATCH  /orders/items/:itemId/quantity   {"quantity": 3}
            trigger: DishRow stepper (only while qty_served===0)            (page.tsx:56)
2 · item    DELETE /orders/items/:itemId             (empty body)
            trigger: DishRow [Huỷ] → M2 'item'                              (page.tsx:68)
3 · multi   DELETE /orders/items/:id ×N (Promise.all)
            trigger: combo "Huỷ N món còn lại…" / Zone D row [Huỷ] → M2     (page.tsx:73)
4 · order   DELETE /orders/:id
            trigger: Zone G → M2 'order' → toast → router.push('/menu')     (page.tsx:63)
```

**Ownership:** guest tokens are checked BE-side by `claims.TableID`, not user id —
a guest can only touch orders on their own table.

### 6c · RECEIVING + error handling (mutation callbacks)

```
            ┌─ onSuccess ────────────────────────────────────────────────┐
            │ qty:    invalidateQueries(['order',id])   ← no-op (see ⚠️ §6)│
            │ item:   toast "Đã huỷ món"          + close M2              │
            │ multi:  toast "Đã huỷ các món còn lại" + close M2           │
            │ order:  toast "Đã huỷ đơn hàng"     → router.push('/menu')  │
            │ NONE of them patch local state — the screen updates only    │
            │ when the BE publishes the resulting SSE event back          │
            └────────────────────────────────────────────────────────────┘
            ┌─ onError ──────────────────────────────────────────────────┐
            │ toast.error(BE message ?? VN fallback) + close M2           │
            │ item stays on screen — no optimistic removal to roll back   │
            └────────────────────────────────────────────────────────────┘
```

### 6d · Three error surfaces — don't confuse them

| Where | Trigger | What the user sees |
|---|---|---|
| **REST 404** (read) | bad/deleted order id | full-page "Không tìm thấy đơn hàng" + [Về trang menu] |
| **SSE drops** | ≥3 failed reconnects | red banner + header pill flips to MẤT KẾT NỐI (page still usable, just stale) |
| **Mutation error** (write) | PATCH/DELETE fails | toast.error with BE message; nothing removed |

### 6e · Worked Example — the menu spec's 107k order, now on the READ side

Same captured order as menu spec §6f (`6c39ea8a…`, Bàn 2, 16 item rows = 3 combo headers +
8 children + 3 món lẻ + 2 canh, `total_amount 107 000`). This page receives that GET response
and renders:

```
comboNameMap: 3 headers (unit_price 0) → names only, EXCLUDED from rows
displayRows:  13 rows → totalQty = (1+1+3)+(1+3)+(1+3)+(1+2+1+1)+(2+3) = 23 phần

Zone C: 3 collapsible combo sections + 4 standalone DishRows + 2 canh DishRows
        each row: nhân chip from toppings_snapshot ("+ Nhân thịt") · ra ×0 · còn ×N · [Huỷ]
Zone D: grouped by product_id → e.g. Giò appears ONCE (combo child + món lẻ merged: SL 2)
Zone E: Đã dùng 0đ (0 phần) · Còn lại 107.000đ (23 phần chưa ra) · Tổng cộng 107.000đ
```

Kitchen serves combo 1 fully + the 2 canh rau (7 phần) → `item_progress` ×4 arrive:

```
progress = round(7/23 × 100) = 30  →  canCancelOrder (progress<30) flips FALSE
                                       Zone G disappears at exactly this moment ⚠️
Đã dùng  = 9000+9000+4000×3 + 0×2 (canh) = 30.000đ (7 phần)
Còn lại  = 77.000đ (16 phần chưa ra) · Tổng cộng unchanged 107.000đ (BE-authoritative)
```

Note `Tổng cộng` is always `order.total_amount` straight from BE — the client sums
(`eatenAmount + remainingAmount`, Zone D `summaryGrandTotal`) are display math that happens
to agree because combo headers are 0 (OC epic rule).

---

## 7 · Sibling page — `/order` (list, "Đơn hàng của bạn")

`fe/src/app/(shop)/order/page.tsx` — **no network at all**: it scans localStorage for
`order_cache_*` keys and renders one card per cached order (StatusBadge + progress bar when
`isActive`, same derivations). It is a history-of-this-device view, with a clear-all that
removes the cache keys. Tapping a card → `/order/<id>` (which then re-validates via REST —
a deleted order 404s into not-found).

---

## 8 · Top Risks

```
STILL OPEN
🚨 OT-1  'paid' is treated as ACTIVE (isActive only excludes delivered/cancelled) —
         a paid order still shows steppers, per-item Huỷ and "Thêm món" (page.tsx:232).
         Confirm with BE whether paid should be terminal on this screen.
⚠️ OT-2  Writes don't update the screen by themselves: no optimistic patch + the
         invalidateQueries is a no-op → after PATCH qty / DELETE item the UI shows the old
         data until the BE's SSE event lands. item_progress only patches qty_served — if the
         BE has no event for qty/cancel changes, the row is stale until reload.
⚠️ OT-3  SSE gives up after 5 reconnect attempts — permanently dead stream (MẤT KẾT NỐI)
         until manual reload. iOS Safari screen-lock kills the stream and burns attempts;
         no visibilitychange re-connect handler exists (same gap flagged in conccern.md).
⚠️ OT-4  Back button = bare router.back() — a deep-link visitor (SSE notification, shared
         link) has no history; needs a /menu fallback (conccern.md §Navigation).
⚠️ OT-5  Whole-order cancel button requires confirmed|preparing — a 'pending' order can
         NOT be cancelled in one tap; customers must cancel item-by-item.
☠️ OT-6  Dead SSE branches order_init + order_completed in useOrderSSE (BE never emits
         either) — safe to delete, documented since the 06-07 routing reference.

RESOLVED (verified 2026-06-11)
✅ Skeleton built (page.tsx:175-229) — the "blank screen on cold visit" blocker from
   tech_description.md / conccern.md is gone (plus the order_cache warm-paint, §3).
✅ filling fully removed (TOP epic, migration 017) — DishRow + Zone D render nhân from
   toppings_snapshot chips; OrderItem type carries no filling field.
✅ Cancel-fail rollback concern (conccern.md) — moot: there is no optimistic removal,
   onError just toasts; the item never left the screen.
```

---

*Short visual companion to the canonical
[Client_Order_Page_Status_Routing_Reference.md](./Client_Order_Page_Status_Routing_Reference.md)
(status→UI routing) — note its `filling` row + "skeleton not built" claim predate the TOP epic.
Write-side counterpart: [../client_menu_page_v2/menu_spec_v3_visual.md](../client_menu_page_v2/menu_spec_v3_visual.md).*
