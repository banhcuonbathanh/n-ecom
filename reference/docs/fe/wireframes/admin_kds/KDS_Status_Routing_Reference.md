# KDS (Kitchen Display) — Status Routing Reference

> Page: `fe/src/app/(dashboard)/kds/page.tsx` · URL `http://localhost:3000/kds`
> Source of truth for "which order status shows up where, with which button, under which rule"
> on the kitchen display. Every cell below is traced to current code. Last run: **2026-06-07**.

> **This page is NOT a per-status column board.** Despite the tracker note "order status → column",
> the running code renders **one responsive grid** of cards (`grid … xl:grid-cols-4`,
> [page.tsx:194](../../../../fe/src/app/(dashboard)/kds/page.tsx#L194)). Routing here = a **status
> filter** (`ACTIVE_STATUSES`) that decides whether an order is a card at all, plus per-card buttons.

---

## Live Page Snapshot (http://localhost:3000/kds, 2026-06-07)

**NOT captured.** Stack was up (FE `:3000` → 200, BE `:8080` `GET /orders` → 401 = up, auth-gated),
but the Playwright MCP browser profile was **locked** by an already-running instance
(`Browser is already in use … mcp-chrome-ef492b3`). The page is also `(dashboard)`-gated and needs a
chef+ token, so an unauthenticated navigate would redirect to login. Snapshot deferred to a run with a
free browser profile + a seeded chef session with at least one active order.

What the code *would* render (from JSX, not a live capture):
- **Empty state** when no active orders: full-screen centered `Không có đơn nào đang chờ 🍜`
  ([page.tsx:182-188](../../../../fe/src/app/(dashboard)/kds/page.tsx#L182-L188)).
- **Populated:** `h1` `KDS — Bếp`, then a card grid — one card per active order with a coloured urgency
  bar, `Bàn {table_id}` / `Mang về`, `order_number`, a status chip, elapsed `{mins} phút`, the kitchen
  item list, and the `🔍 Kiểm tra` / `Trạng thái ▼` button row.

---

## Page Layout

| Zone | Component | Title | When visible |
|---|---|---|---|
| A | `KDSPage` empty state | `Không có đơn nào đang chờ 🍜` | Only when `orders.length === 0` |
| B | Page header `<h1>` | `KDS — Bếp` | When ≥1 active order |
| C | Order-card grid | — | When ≥1 active order — one card per active order |

Per-card sub-zones (all inside Zone C, [page.tsx:203-306](../../../../fe/src/app/(dashboard)/kds/page.tsx#L203-L306)):

| Sub-zone | What it is | Title | When visible |
|---|---|---|---|
| C1 | Card header row (urgency bar · table/Mang về · order_number · status chip · elapsed mins) | — | Always (per card) |
| C2 | Kitchen-item list + `{n} món · {n} phần còn lại` footer | — | Always (per card) |
| C3 | Inline status picker (`✓ Phục vụ` · `🛍 Mang đi` · `Huỷ`) | — | Only when card is in `statusMenus` (toggled by `Trạng thái ▼`) |
| C4 | Action button row (`🔍 Kiểm tra` · `Trạng thái ▼`) | — | Always (per card) |

---

## Order DB Statuses (`orders.status`)

Source: [`DB_SCHEMA_SUMMARY.md`](../../../be/be_code_summary/DB_SCHEMA_SUMMARY.md) line 199 —
`ENUM('pending','confirmed','preparing','ready','delivered','cancelled','paid')`.

| Status | Meaning |
|---|---|
| `pending` | Chờ xác nhận — just created, not confirmed |
| `confirmed` | Đã xác nhận |
| `preparing` | Đang làm — being cooked |
| `ready` | Sẵn sàng — done, ready to serve |
| `delivered` | Đã giao — served to table |
| `cancelled` | Đã huỷ |
| `paid` | Đã thanh toán (added in migration 015) |

---

## Order Statuses — Which Section Each Appears In

The only gate is `ACTIVE_STATUSES = {pending, confirmed, preparing}`
([page.tsx:93](../../../../fe/src/app/(dashboard)/kds/page.tsx#L93)). The initial fetch is filtered to
it ([page.tsx:108-111](../../../../fe/src/app/(dashboard)/kds/page.tsx#L108-L111)); a `new_order` WS
event prepends regardless of status (BE only emits it on create, so always `pending`); an
`order_status_changed` to a non-active status **removes** the card
([page.tsx:149-154](../../../../fe/src/app/(dashboard)/kds/page.tsx#L149-L154)).

"Vietnamese label" = KDS's **own** `statusLabel` map
([page.tsx:51-61](../../../../fe/src/app/(dashboard)/kds/page.tsx#L51-L61)) — **not** the shared
`StatusBadge.tsx`. See ⚠️ label-drift concern below.

| Order Status | Vietnamese label (KDS map) | Rendered as a card? (Zone C) |
|---|---|:---:|
| `pending` | `Chờ xác nhận` | ✅ |
| `confirmed` | `Đã xác nhận` | ✅ |
| `preparing` | `Đang chuẩn bị` | ✅ |
| `ready` | `Sẵn sàng` | ❌ — excluded from initial filter; removed on `order_status_changed` |
| `delivered` | `Đã phục vụ` | ❌ |
| `cancelled` | `Đã huỷ` | ❌ — also removed live on `order_cancelled` |
| `paid` | *(no entry → falls back to raw `paid`)* | ❌ |

---

## Card — Action Buttons Per Status

KDS does **not** vary buttons by status — every active card shows the same controls. There is no
"confirm → preparing → ready" step ladder here; KDS jumps an active order straight to `ready` or
`cancelled`.

| Control | Trigger | Endpoint / effect | Next order status |
|---|---|---|---|
| Item row (whole row clickable) | `onClick` [page.tsx:234](../../../../fe/src/app/(dashboard)/kds/page.tsx#L234) | `PATCH /orders/{orderId}/items/{itemId}/status` body `{}` | — (item serve) 🚨 **broken — see below** |
| `🔍 Kiểm tra` | [page.tsx:283](../../../../fe/src/app/(dashboard)/kds/page.tsx#L283) | Toggles local `flagged` set → card border turns `border-urgent`. **No BE call.** | — |
| `Trạng thái ▼/▲` | [page.tsx:294](../../../../fe/src/app/(dashboard)/kds/page.tsx#L294) | Toggles local `statusMenus` → opens/closes C3 picker. **No BE call.** | — |
| `✓ Phục vụ` (C3) | [page.tsx:260](../../../../fe/src/app/(dashboard)/kds/page.tsx#L260) | `PATCH /orders/{orderId}/status` `{status:'ready'}` | `ready` |
| `🛍 Mang đi` (C3) | [page.tsx:266](../../../../fe/src/app/(dashboard)/kds/page.tsx#L266) | `PATCH /orders/{orderId}/status` `{status:'ready'}` | `ready` |
| `Huỷ` (C3) | [page.tsx:272](../../../../fe/src/app/(dashboard)/kds/page.tsx#L272) | `PATCH /orders/{orderId}/status` `{status:'cancelled'}` | `cancelled` |

🚨 **RISK — `✓ Phục vụ` and `🛍 Mang đi` send the identical payload** (`status:'ready'`). The two
buttons are functionally the same; "Mang đi" (takeaway) does nothing different. Likely an unfinished
intent (takeaway should branch differently, or `Phục vụ` should advance to `delivered`).

🚨 **RISK — the item-row mutation hits a route that does not exist.** `patchItemStatus`
([page.tsx:159-163](../../../../fe/src/app/(dashboard)/kds/page.tsx#L159-L163)) calls
`PATCH /orders/{orderId}/items/{itemId}/status`, but the BE only registers
`PATCH /orders/items/:id` (`UpdateItemServed`) and `PATCH /orders/items/:id/quantity`
([be/cmd/server/main.go:249-251](../../../../be/cmd/server/main.go#L249-L251)) — **no nested
`/orders/:id/items/:id/status`**. Clicking an item → **404** (toast `Không thể cập nhật món`).
Even if the path matched, the body is `{}` while `UpdateItemServed` expects `{qty_served:N}`, so the
"còn ×N → ✓ done" toggle cannot work as written. Item progress on KDS today only ever updates via the
inbound `item_progress` WS event, never from a KDS click.

---

## Zone C — Per-Card Rules

- **Urgency colour** by elapsed minutes since `created_at`
  ([page.tsx:32-49](../../../../fe/src/app/(dashboard)/kds/page.tsx#L32-L49)):
  `>20 min` → `border-urgent` / `bg-urgent`; `10–20 min` → `border-warning`; `<10 min` → neutral.
  A `🔍 Kiểm tra`-flagged card forces `border-urgent` regardless of time
  ([page.tsx:206-208](../../../../fe/src/app/(dashboard)/kds/page.tsx#L206-L208)).
- **Kitchen-item filter:** only items where `isKitchenItem(item)` render
  ([page.tsx:75-77](../../../../fe/src/app/(dashboard)/kds/page.tsx#L75-L77),
  [197](../../../../fe/src/app/(dashboard)/kds/page.tsx#L197)) — excludes a combo *header* row
  (`combo_id !== null && combo_ref_id === null`); the expanded combo children still show.
- **Per-item progress:** `rem = quantity − qty_served`; `done` when `rem ≤ 0` → green dot + strikethrough
  + `✓`; otherwise grey dot + `còn ×{rem}` chip
  ([page.tsx:227-248](../../../../fe/src/app/(dashboard)/kds/page.tsx#L227-L248)).
- **`kdsVariant` (chef hint after the dish name)**
  ([page.tsx:81-91](../../../../fe/src/app/(dashboard)/kds/page.tsx#L81-L91)):
  for a `canh` item → `có rau` if any topping name contains "rau", else `item.note` (legacy fallback),
  else `không rau`. For any other item → the topping names joined by `, ` (from `toppings_snapshot`).
- **Card footer:** `{totalItems} món · {remaining} phần còn lại`, where `remaining` sums
  `max(0, quantity − qty_served)` over kitchen items
  ([page.tsx:199](../../../../fe/src/app/(dashboard)/kds/page.tsx#L199),
  [251-253](../../../../fe/src/app/(dashboard)/kds/page.tsx#L251-L253)).
- **No sort:** cards render in array order. `new_order` **prepends** (`[order, ...prev]`); the initial
  fetch keeps BE order. There is no `updated_at`/urgency sort.
- **Card removal:** a card disappears on `patchOrderStatus` success
  ([page.tsx:168-173](../../../../fe/src/app/(dashboard)/kds/page.tsx#L168-L173)), on `order_cancelled`,
  or on `order_status_changed` to a non-active status — never on its own re-fetch (there is no refetch).

---

## What Information Comes FROM BE (reads)

### GET (TanStack Query)

| Query key | Endpoint | Params | staleTime | enabled gating |
|---|---|---|---|---|
| `['orders','kds-initial']` | `GET /orders` (BE `ListLive`, chef+) | none | `30_000` ms | none — always runs on mount |

Response normalised as `r.data?.data ?? r.data ?? []`
([page.tsx:104](../../../../fe/src/app/(dashboard)/kds/page.tsx#L104)), then filtered to
`ACTIVE_STATUSES` into local `orders` state. **Fields used per `Order`** (from
[`types/order.ts`](../../../../fe/src/types/order.ts)): `id`, `order_number`, `status`, `table_id`,
`created_at`, `items[]`. Per `OrderItem`: `id`, `combo_id`, `combo_ref_id`, `name`, `quantity`,
`qty_served`, `note`, `toppings_snapshot[]` (`{id,name,price}`). (`source`, `customer_*`,
`total_amount`, `flagged`, `unit_price` exist on the type but KDS ignores them.)

### WS (push, not a query) — `useOrdersWSContext().subscribe`

Shared connection `wss://…/ws/orders-live?token={accessToken}`
([OrdersWSContext.tsx:35-38](../../../../fe/src/context/OrdersWSContext.tsx#L35-L38)), one per browser
session, auto-reconnect with exponential backoff. KDS handles 4 message types
([page.tsx:116-156](../../../../fe/src/app/(dashboard)/kds/page.tsx#L116-L156)); BE emits exactly
these (`order_service.go` 339/543/584/736/814/935):

| WS `type` | KDS effect |
|---|---|
| `new_order` | re-`GET /orders/{order_id}`, prepend if absent, `beep()` |
| `item_progress` | patch matching item's `qty_served` (the only way item progress updates on KDS) |
| `order_cancelled` | remove the card |
| `order_status_changed` | if `status` ∉ `ACTIVE_STATUSES` → remove the card; otherwise no-op |

---

## What Information Is SENT TO BE (writes)

### `PATCH /orders/{orderId}/status` — advance/cancel an order (`patchOrderStatus`)
```json
{ "status": "ready" }      // ✓ Phục vụ  AND  🛍 Mang đi  (identical)
{ "status": "cancelled" }  // Huỷ
```
- Route exists: [be/cmd/server/main.go:237](../../../../be/cmd/server/main.go#L237)
  (`UpdateStatus`, chef+). On success: optimistically drop the card + close its picker +
  `toast.success('Đã cập nhật đơn')`; on error `toast.error('Không thể thay đổi trạng thái')`.

### `PATCH /orders/{orderId}/items/{itemId}/status` — mark item served (`patchItemStatus`)
```json
{}
```
- 🚨 **Route does NOT exist** (see RISK above) → 404 → `toast.error('Không thể cập nhật món')`.
  The real serve route is `PATCH /orders/items/:id` with `{qty_served:N}`.

KDS sends **no** order-create / add-item payload — it never imports `order-payload.ts`.

---

## How It Manages Data CROSS-PAGE

| Store / channel | Key | Persisted? | Carries across pages | File |
|---|---|---|---|---|
| `useAuthStore` | `accessToken` | **No** — memory only (Zustand) | JWT used as `?token=` for the WS URL | [`features/auth/auth.store.ts`](../../../../fe/src/features/auth/auth.store.ts) |
| `OrdersWSContext` | — | No (live socket) | Shared `/ws/orders-live` connection — one per browser session, reused by KDS/POS/admin | [`context/OrdersWSContext.tsx`](../../../../fe/src/context/OrdersWSContext.tsx) |

- **No localStorage, no cart, no order-cache handoff.** KDS holds everything in three ephemeral
  `useState` sets: `orders` (the live list), `statusMenus` (which cards have the picker open),
  `flagged` (which cards are 🔍-marked). All reset on reload.
- **End-to-end loop:** `GET /orders` (filter active) → render card grid → live WS deltas mutate the
  list (`new_order`/`item_progress`/`order_cancelled`/`order_status_changed`) → chef clicks
  `Trạng thái ▼` → `✓ Phục vụ`/`Huỷ` → `PATCH /orders/{id}/status` → card removed optimistically.

---

## Concerns (for the tracker)

1. 🚨 **Broken item-serve endpoint** — `PATCH /orders/{orderId}/items/{itemId}/status` has no BE route
   (real: `PATCH /orders/items/:id` `{qty_served}`). Clicking an item → 404. Item progress only ever
   advances via the `item_progress` WS event today.
2. 🚨 **`✓ Phục vụ` and `🛍 Mang đi` send identical `status:'ready'`** — the takeaway button does
   nothing distinct; likely unfinished.
3. ⚠️ **Label drift** — KDS uses a local `statusLabel` map, not shared `StatusBadge.tsx`:
   `preparing` = "Đang chuẩn bị" (badge: "Đang làm"), `delivered` = "Đã phục vụ" (badge: "Đã giao"),
   and `paid` has no entry (renders raw `paid`). Cross-page concern X2.
4. ⚠️ **No status step-ladder** — KDS jumps active → `ready`/`cancelled` directly; a `pending` order can
   be marked `ready` without ever passing `confirmed`/`preparing`. Confirm this matches the intended
   kitchen flow vs. Admin Overview's `pending→confirmed→preparing→ready→delivered` ladder (X3).
5. ⚠️ **Live snapshot not captured** — browser profile locked + auth-gated page (see snapshot section).
