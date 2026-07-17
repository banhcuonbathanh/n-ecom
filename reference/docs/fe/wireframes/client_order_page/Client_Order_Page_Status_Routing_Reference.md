# Client Order Page — Status Routing Reference

> Customer-facing **order tracking** screen — header "Theo Dõi Đơn Hàng".
> One order per page; `order.status` does **not** route the order into different sections
> (it always renders one order). Instead status gates **which buttons / banners / modals appear**.
> Every cell below is traced to code — file:line in the "Source files" list.

## Source files

| What | File |
|---|---|
| Page entry (detail/tracking) | `fe/src/app/(shop)/order/[id]/page.tsx` |
| `DishRow` (inline component) | `fe/src/app/(shop)/order/[id]/page.tsx:681` |
| SSE hook (progress · notification · isNotFound) | `fe/src/hooks/useOrderSSE.ts` |
| Status badge labels | `fe/src/components/shared/StatusBadge.tsx` |
| Order + item types (FE mirror) | `fe/src/types/order.ts` (`Order`, `OrderItem`, `OrderStatus`) |
| Status enum (BE source) | `docs/be/be_code_summary/DB_SCHEMA_SUMMARY.md:199` |
| Cart store (cross-page) | `fe/src/store/cart.ts` |
| Storage keys | `fe/src/lib/storage-keys.ts` (`ORDER_CACHE`, `CART_CONFIG`) |
| API client + interceptor | `fe/src/lib/api-client.ts` |

> Sibling list page `fe/src/app/(shop)/order/page.tsx` ("Đơn hàng của bạn") shares
> `StatusBadge` + progress bar but only routes the **progress bar** by status
> (`isActive` → shown, else hidden). Not detailed here.

---

## Live Page Snapshot (`/order/[id]`, 2026-06-07)

⚠️ **Not captured this run.** The FE dev server is up (`http://localhost:3000/menu` → `200`),
but the live order screen could not be snapshotted because:

1. The Playwright MCP browser profile was already locked by another process
   (`Browser is already in use … mcp-chrome-ef492b3`) — a fresh navigation/snapshot was rejected.
2. The page needs a **real order id** in the path (`/order/<uuid>`) **and** an authenticated
   session — `useOrderSSE` calls `GET /orders/{id}` with a `Bearer` token; without both it
   renders only the **not-found** screen (`Không tìm thấy đơn hàng`, `:155`) or the
   **loading skeleton** (`!order`, `:175`), neither of which is the real status-routed UI.

**What the page renders when an order IS present** (from code, not a live capture):
sticky header "Theo Dõi Đơn Hàng" + `LIVE`/`MẤT KẾT NỐI` badge → order card (`Bàn {name}` or
`Mang về`, order number, `StatusBadge`, total, elapsed minutes, progress bar, dish rows) →
"Chi tiết món" summary table → money summary (Đã dùng / Còn lại / Tổng cộng) → conditional
completed banner / cancel button / add-more actions → modals. Re-run this section against a live
authenticated order once the browser profile is free to record real values + any console 404s.

---

## Page Layout

| Zone | Component | Title (verbatim) | When visible |
|---|---|---|---|
| A | Sticky nav header | Theo Dõi Đơn Hàng | Always — `LIVE` / `MẤT KẾT NỐI` badge driven by `connectionError` (`:281–292`) |
| B | ConnectionErrorBanner | — | Only when `connectionError` (`:295`) |
| C | Order card | Bàn {table_name} / Mang về | Always — holds `StatusBadge` + progress bar + dish rows (collapsible) (`:300`) |
| D | Dish summary table | Chi tiết món | Always — collapsible (`collapsedSummary`, `:406`) |
| E | Money summary | — (Đã dùng / Còn lại / Tổng cộng) | Always (`:519`) |
| F | Completed banner | Đơn hàng đã hoàn thành | Only `order.status === 'delivered'` (`:539`) |
| G | Cancel-whole-order button | Huỷ toàn bộ đơn hàng | Only `canCancelOrder` (`:550`) |
| H | Add-more actions | Theo dõi bàn / Thêm món / Đặt thêm món | Only when `order.table_id` present (`:560`) |
| M1 | Notification modal | (confirmed/ready/cancelled) | Only when `notification !== null` (`:587`) |
| M2 | Cancel confirm modal | Huỷ đơn hàng? / Huỷ món còn lại? / Huỷ món này? | Only when `cancelTarget !== null` (`:640`) |
| — | Not-found screen | Không tìm thấy đơn hàng | Only when `isNotFound` (`:155`) — replaces whole page |
| — | Loading skeleton | — | Only when `!order` (`:175`) — replaces whole page |

**Derived flags (the real gates):**
- `isActive = order.status !== 'delivered' && order.status !== 'cancelled'` — `:232`
- `canCancelOrder = progress < 30 && (order.status === 'confirmed' || order.status === 'preparing')` — `:233`
- `progress` = `round(servedQty / totalQty * 100)` — `useOrderSSE.ts:152` (item served counts, **not** status)

---

## Order DB Statuses (`orders.status`)

Source: `docs/be/be_code_summary/DB_SCHEMA_SUMMARY.md:199` — `ENUM('pending','confirmed','preparing','ready','delivered','cancelled','paid')`.
Transition: `pending → confirmed → preparing → ready → delivered → paid` (`:213`).

| Status | VN label (StatusBadge) | Meaning |
|---|---|---|
| `pending` | Chờ xác nhận | Created, awaiting restaurant confirm |
| `confirmed` | Đã xác nhận | Restaurant accepted |
| `preparing` | Đang làm | Being cooked |
| `ready` | Sẵn sàng | Ready to serve |
| `delivered` | Đã giao | All dishes served — order done |
| `cancelled` | Đã huỷ | Cancelled |
| `paid` | Đã thanh toán | Paid at POS |

---

## Order Status — Which Element Each Appears In

Rows = status. Columns = the **status-gated** UI elements (zones that are always visible — A,B,C,D,E — are omitted; they render at every status).

| Status | VN label | StatusBadge | Progress bar | Edit qty (stepper) | Cancel item/combo | G · Huỷ toàn bộ | F · Completed banner | H · Theo dõi bàn + Thêm món | H · Đặt thêm món |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `pending` | Chờ xác nhận | ✅ | ✅ | ✅ (if `qty_served=0`) | ✅ (if `remaining>0`) | ❌ (not confirmed/preparing) | ❌ | ✅ | ❌ |
| `confirmed` | Đã xác nhận | ✅ | ✅ | ✅ | ✅ | ✅ (if `progress<30`) | ❌ | ✅ | ❌ |
| `preparing` | Đang làm | ✅ | ✅ | ✅ | ✅ | ✅ (if `progress<30`) | ❌ | ✅ | ❌ |
| `ready` | Sẵn sàng | ✅ | ✅ | ✅ | ✅ | ❌ (not confirmed/preparing) | ❌ | ✅ | ❌ |
| `delivered` | Đã giao | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| `cancelled` | Đã huỷ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `paid` | Đã thanh toán | ✅ | ✅ | ⚠️ ✅ | ⚠️ ✅ (if `remaining>0`) | ❌ | ❌ | ⚠️ ✅ | ❌ |

- **Edit qty / Cancel item / Theo dõi bàn + Thêm món** columns are all gated on `isActive` — true for every status **except** `delivered` and `cancelled`.
- **H buttons require `order.table_id`** (take-away orders with no table show no Zone H at all).
- `Đặt thêm món` (re-order) shows for the two terminal-from-`isActive` states (`delivered`, `cancelled`) when `table_id` present.

> ⚠️ **FLAG — `paid` is treated as active.** `isActive` only excludes `delivered`/`cancelled`, so a `paid` order still renders the qty stepper, per-item Cancel, and "Thêm món". If a customer reaches this page after payment, they could still edit/cancel/add. Confirm with BE whether `paid` should be excluded from `isActive` (`[id]/page.tsx:232`).

---

## DishRow — Action Buttons / Controls Per Item

Gating is per-item, not by order status directly (but all require `isActive`).

| Control | Condition | Effect |
|---|---|---|
| QuantityStepper | `isActive && item.qty_served === 0` (`:695` `canStepper`) | `patchOrderItemQty(itemId, qty)` → `PATCH /orders/items/:id/quantity` |
| "Huỷ" (per item) | `remaining > 0 && isActive` (`:764`) | opens M2 → `DELETE /orders/items/:id` |
| "Huỷ N món còn lại của {combo}" | combo has `remaining.length > 0 && isActive` (`:364`) | opens M2 (`combo-remaining`) → multi `DELETE /orders/items/:id` |
| "Huỷ" (summary table row) | `row.remaining > 0 && isActive` (`:485`) | opens M2 (`combo-remaining`) for that product's remaining items |

> No status-**advancing** buttons on this page — the customer can only **cancel** or **adjust qty**.
> Status advances (confirm → preparing → ready → delivered) happen staff-side (KDS/Overview) and arrive here via SSE.

---

## Zone G — Cancel Whole Order — Rules

- Button "Huỷ toàn bộ đơn hàng" visible **only** when `canCancelOrder` = `progress < 30 && (status === 'confirmed' || status === 'preparing')` (`:233`, `:550`).
- ⚠️ Therefore **`pending` cannot be whole-order cancelled** from this button (only `confirmed`/`preparing` can) — pending users must cancel item-by-item.
- Opens M2 confirm → `DELETE /orders/:id` → toast "Đã huỷ đơn hàng" → redirect `/menu` (`:64–66`).

---

## M1 — Notification Modal — Rules

Driven by **SSE events** (a status *transition*), not by the stored `order.status` render. Source: `useOrderSSE.ts` `order_status_changed` / `order_cancelled`.

| `notification.kind` | Triggered by SSE | Modal content |
|---|---|---|
| `confirmed` | `order_status_changed` → `status === 'confirmed'` (carries optional `eta`) — `useOrderSSE.ts:90` | "Nhà hàng đã nhận đơn!" + ETA |
| `ready` | `order_status_changed` → `status === 'ready'` — `:93` | "Đến lượt bàn của bạn!" |
| `cancelled` | `order_status_changed` → `'cancelled'` (`:94`) **or** `order_cancelled` event (`:100`) | "Đơn hàng đã bị huỷ" |

- No modal for `preparing`, `delivered`, `paid` transitions.
- Zone F's "đã hoàn thành" banner renders from the **snapshot `order.status === 'delivered'`** (`:539`), not from a modal.
- Dismiss → `clearNotification()` sets `notification = null` (`:159`).

---

## Zone C / D / E — Per-Zone Rules

- **Zone C (Order card):** dish rows hidden when `collapsed`; combo sub-items grouped by `combo_ref_id` and individually collapsible (`collapsedCombos`). Shows `total_amount`, elapsed minutes (`minutesElapsed(created_at)`, `:235`), and `X/Y phần đã ra` + per-note counts (`noteCounts`).
- **Progress bar:** width = `progress%` (served/total qty) — independent of status; always rendered (`:323`).
- **Zone D (Chi tiết món):** one row per `product_id` (grouped, fallback key = `name`), columns SL · Ra · Còn · Đơn giá · Tổng; per-row "Huỷ" on remaining. Collapsible.
- **Zone E (Money summary):** "Đã dùng" = `unit_price × qty_served` summed; "Còn lại" row only when `remainingAmount > 0`; "Tổng cộng" = `order.total_amount`.

---

# Data Management — FROM BE · TO BE · CROSS-PAGE (traced to code)

> How the order data behind this page is fetched, stored, mutated and pushed live.
> Read-only audit — describes the code as it is today, no changes proposed.
>
> ⚠️ **Architectural note:** despite the project rule "server state → TanStack Query", this page
> has **no `useQuery`**. It is driven by the custom **`useOrderSSE`** hook
> (`fe/src/hooks/useOrderSSE.ts`), which holds the order in React `useState` (seeded from
> localStorage + REST, patched by SSE). The page's `useMutation`s call
> `queryClient.invalidateQueries(['order', id])` on success (`:59`), but **nothing populates
> that query key** — so on this screen the invalidation is a no-op; refresh comes from SSE.

## What Information Comes FROM BE (reads)

The page makes **one REST read** + opens **one SSE stream** (both inside `useOrderSSE`, not `useQuery`):

| Read | Endpoint | Params | Caching / gating | Where |
|---|---|---|---|---|
| Order snapshot (source of truth) | `GET /orders/{id}` | path `id` | fired once per `(orderId, token)` on connect; **no** `staleTime`/TanStack cache — result held in `useState`; `404` → `isNotFound` | `useOrderSSE.ts:56–60` |
| Live deltas (SSE) | `GET /orders/{id}/events` | path `id`; `Authorization: Bearer` header | reconnect: 5 attempts, exp backoff 1s→30s, banner after 3 fails | `useOrderSSE.ts:69–73` |

**Exact fields received** — one `Order` object (`fe/src/types/order.ts:44`, built by BE `orderJSON()` in `be/internal/handler/order_handler.go`):

`id` · `order_number` · `status` (`OrderStatus`) · `source` (`online|qr|pos`) · `table_id` ·
`table_name?` · `customer_name` · `customer_phone` · `total_amount` · `note` · `created_at` ·
`updated_at?` · `items[]`.

Each `items[]` entry (`order.ts:15`) carries: `id` · `product_id` · `combo_id` · `combo_ref_id` ·
`name` · `quantity` · `qty_served` · `unit_price` · `note` · `filling?` (`thit|moc_nhi|null`) ·
`toppings_snapshot[]` · `flagged`.

- **Client-side enrichment (no extra fetch):** `useMemo` (`page.tsx:79`) derives `eatenAmount`,
  `remainingAmount`, `totalQty/totalServed`, a per-`product_id` **summary** (`summaryRows`),
  combo-name map (`comboNameMap`, resolves combo header `id` → name), and `noteCounts`.
- **`item_status` is NOT a stored field** — the FE `OrderItem` has `flagged`, not `item_status`.
  Per-item progress is **re-derived** from `qty_served` vs `quantity` (`deriveItemStatus()`,
  `order.ts:9`; aggregate `progress` in `useOrderSSE.ts:152`).

**SSE delta events** (BE → Redis `order:{id}` → SSE relay; the SSE layer adds no data):

| SSE event | FE handler (`useOrderSSE.ts`) | Effect on page |
|---|---|---|
| `order_status_changed` `{status, eta?}` | `:87` patch `order.status`; raise M1 for `confirmed`/`ready`/`cancelled` | StatusBadge, gates, modal |
| `order_cancelled` | `:98` set `status='cancelled'`, M1 modal, **stop stream** | terminal |
| `item_progress` `{item_id, qty_served, …}` | `:104` patch that item's `qty_served` | progress bar, "X/Y phần", money |
| `order_init` | `:84` `setOrder(data)` | ⚠️ never emitted by BE — see flag |
| `order_completed` | `:118` set `status='delivered'`, stop stream | ⚠️ never emitted by BE — see flag |

> ⚠️ **FLAG — two FE SSE branches the BE never emits:** `order_init` (`:84`) and
> `order_completed` (`:118`). A grep of `be/internal/` shows neither string is ever published;
> `delivered` actually arrives as `order_status_changed {status:"delivered"}`, and Zone F renders
> from the snapshot `order.status`. The two handlers are dead code today. (Documenting only.)

## What Information Is SENT TO BE (writes)

Four plain axios calls via `useMutation` — the customer can only **adjust qty** or **cancel**,
never advance status. No payload-builder is involved (no `order-payload.ts` here; that builder
is used on menu/checkout, not on this tracking page).

**1 · Update item quantity** — `PATCH /orders/items/{itemId}/quantity` (`api-client.ts:72`)
```json
{ "quantity": 3 }
```
Trigger: QuantityStepper (`page.tsx:361/385`). Success → `invalidateQueries(['order',id])` (no-op here). Error → toast "Không thể cập nhật số lượng".

**2 · Cancel one item** — `DELETE /orders/items/{itemId}` (`page.tsx:69`) — empty body.
Trigger: "Huỷ" per item (M2). Success → toast "Đã huỷ món", close M2. Refresh via SSE `item`/status event.

**3 · Cancel remaining items of a combo / product group** — `DELETE /orders/items/{id}` ×N in parallel (`page.tsx:74` `Promise.all`) — empty bodies.
Trigger: "Huỷ N món còn lại…" / summary-row "Huỷ" (M2 `combo-remaining`). Success → toast "Đã huỷ các món còn lại".

**4 · Cancel whole order** — `DELETE /orders/{id}` (`page.tsx:64`) — empty body.
Trigger: Zone G (M2 `order`). Success → toast "Đã huỷ đơn hàng" → `router.push('/menu')`. Error → toast + close M2.

> **Ownership / auth:** every call carries the JWT via the axios request interceptor
> (`api-client.ts:11–13`, `Authorization: Bearer <accessToken>` from Zustand memory); SSE sends the
> same header (`useOrderSSE.ts:72`). For a guest (`role === 'customer'`) the BE checks ownership
> **by `claims.TableID`, not user id** — a guest can only touch orders on their own table.
> Mutations do **not** optimistically patch local state; UI refresh relies on the BE publishing an
> SSE event back — except whole-order cancel, which navigates away.
>
> Zone H "Thêm món" does **not** write from this page — it seeds the cart and navigates to
> `/menu?add_to_order={id}`; the actual `POST /orders/{id}/items` happens on the menu page.

## How It Manages Data CROSS-PAGE

| Store / cache | Key | Persisted? | Carries across pages | File |
|---|---|---|---|---|
| `useCartStore` | `cart-config-v3` (`STORAGE_KEYS.CART_CONFIG`) | yes — `partialize: { orderNote, activeOrderId }` only | `activeOrderId` (set here via `setActiveOrderId`) + `tableId` (in-memory) seed the cart before "Thêm món"/"Theo dõi bàn" navigation | `store/cart.ts:32,94,114` |
| `useAuthStore` | in-memory (token **never** localStorage) | no | `accessToken` → request interceptor + SSE header | `features/auth/auth.store.ts` |
| Order display cache | `order_cache_{id}` (`STORAGE_KEYS.ORDER_CACHE + id`) | yes (raw localStorage, not Zustand) | last-known order JSON → instant paint on remount before REST/SSE | `useOrderSSE.ts:9,33–46` |

- **Cart handoff (this page writes):** Zone H calls `setActiveOrderId(id)` (+ `setTableId` for
  "Thêm món") then `router.push` — so the menu page knows which open order to append to
  (`page.tsx:42–43, 564, 573–575`). `activeOrderId` survives reload via `partialize`.
- **`order_cache_{id}`** is a **display cache only** — never authoritative; overwritten by the
  next REST/SSE update (`useOrderSSE.ts:41–46`). The order itself lives in **MySQL**
  (`orders` + `order_items`); Redis holds only the pub/sub channel + daily seq counter.
- **Axios interceptor** attaches the bearer token to every read/write from this page
  (`api-client.ts:11–13`).

**End-to-end loop:**
```
mount ─▶ read localStorage(order_cache_{id}) ─▶ paint stale order (maybe)
       └▶ GET /orders/{id} ───────────────────▶ setOrder(snapshot)   [404 ⇒ not-found]
       └▶ open SSE /orders/{id}/events
             ├ item_progress         ⇒ patch items[].qty_served ⇒ progress/money update
             ├ order_status_changed  ⇒ patch status + M1 modal
             └ order_cancelled       ⇒ status=cancelled + stop
  every setOrder ⇒ write back to localStorage(order_cache_{id})
  user qty/cancel ⇒ PATCH/DELETE ⇒ BE recalc + publish ⇒ SSE patches state back
  Zone H ⇒ setActiveOrderId/setTableId (cart store) ⇒ navigate /menu?add_to_order={id}
```

---

## DishRow + Summary — full breakdown (client-side preview math)

This page has no cart, but it **re-aggregates** the fetched `items[]` into display rows — each value below traced to `file:line`.

| Block | Value | Source |
|---|---|---|
| Combo grouping | sub-items grouped by `combo_ref_id`; header row (`combo_id && !combo_ref_id`) excluded from rows, used only for the name map | `page.tsx:87–92, 238–268` |
| `eatenAmount` ("Đã dùng") | Σ `unit_price × qty_served` over non-combo-header rows | `page.tsx:96` |
| `remainingAmount` ("Còn lại") | Σ `unit_price × (quantity − qty_served)`; row shown only if `> 0` | `page.tsx:97, 525` |
| `progress` (bar + X/Y) | `round(Σqty_served / Σquantity × 100)` | `useOrderSSE.ts:152` |
| Summary row (Zone D) | grouped by `product_id` (fallback `name`): `totalQty`, `totalServed`, `remaining`, `totalMoney`, `remainingMoney`, unique toppings + notes | `page.tsx:103–134` |
| `noteCounts` | per-`note` Σ`quantity` (e.g. "rau ×3") | `page.tsx:137–142` |
| "Tổng cộng" (Zone E) | `order.total_amount` (BE-authoritative, **not** the client sum) | `page.tsx:533` |
| `filling` badge | `fillingLabel(item.filling)` → "Thịt" / "Mộc nhĩ" / "" | `order.ts:31`, `page.tsx:710` |
