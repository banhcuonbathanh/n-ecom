# KDS — Kitchen Display — `/kds`

> **TL;DR:** ✅ implemented · chef JWT (any staff ≥ chef) · Fullscreen cooking board: responsive
> grid of order cards (1–4 columns), colour-coded urgency borders by elapsed time, live updates
> over the shared dashboard WebSocket (new orders beep), tap an item line to mark one portion done
> (currently broken — 404, see Bug 1 below), inline status picker to finish ("ready") or cancel an
> order.
> BE view (endpoints, auth, caching, errors, WS events) → [staff_kds_be.md](staff_kds_be.md) ·
> Data flows → [staff_kds_crosspage_dataflow.md](staff_kds_crosspage_dataflow.md) ·
> Loading states → [staff_kds_loading.md](staff_kds_loading.md) ·
> Narrative scenario → [SCENARIO_KDS_COOK.md](SCENARIO_KDS_COOK.md) ·
> Code bugs → [KDS_BUGS.md](KDS_BUGS.md)

---

## ASCII Wireframe

Traced from `fe/src/app/(dashboard)/kds/page.tsx:190-310`.

```
┌──────────────────────────────────────────────────────────────────────┐
│ KDS — Bếp                                          (page.tsx:192)    │
├──────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────┐ │
│ │▌ Bàn <UUID>  #BC-42     │ │▌ Bàn <UUID>  #BC-40     │ │   …     │ │  ← bug: shows UUID
│ │  [Đã xác nhận]  12 phút │ │  [Đang chuẩn bị] 22 phút│ │         │ │    not table_name
│ │                         │ │  (border-urgent >20m)   │ │         │ │
│ │  ● Bánh cuốn            │ │  ● Canh mọc · có rau  ✓ │ │         │ │
│ │    · thịt   còn ×2      │ │  ● Bánh cuốn · mộc nhĩ  │ │         │ │
│ │  ● Canh mọc             │ │    còn ×1               │ │         │ │
│ │    · không rau  còn ×1  │ │                         │ │         │ │
│ │  3 món · 3 phần còn lại │ │  2 món · 1 phần còn lại │ │         │ │
│ │  ┌──inline status picker──────────────────────────┐ │ │         │ │
│ │  │ [✓ Phục vụ]  [🛍 Mang đi]  [Huỷ]             │ │ │         │ │
│ │  └────────────────────────────────────────────────┘ │ │         │ │
│ │  [🔍 Kiểm tra]  [Trạng thái ▼]                    │ │         │ │
│ └─────────────────────────┘ └─────────────────────────┘ └─────────┘ │
│                                                                      │
│  Empty-state: "Không có đơn nào đang chờ 🍜" (centred)              │
│                                       (page.tsx:184-187)            │
└──────────────────────────────────────────────────────────────────────┘

Border colours (page.tsx:32-49):
  >20 min elapsed  → border-urgent  (Tailwind token `border-urgent`)
  10–20 min        → border-warning
  <10 min          → border-border  (default)
  🔍 Kiểm tra ON  → border-urgent (always, regardless of age)

Columns (page.tsx:194):
  mobile (default) → 1 col
  sm               → 2 cols
  lg               → 3 cols
  xl               → 4 cols
```

## Zones

| Zone | Component / location | Data source |
|---|---|---|
| Page heading | `<h1>KDS — Bếp</h1>` inline (`page.tsx:192`) | static |
| Order grid | inline `orders.map()` in `page.tsx:195-308` | local `useState<Order[]>` (page.tsx:97) seeded from `GET /orders` then WS deltas |
| Card header row | inline JSX `page.tsx:211-223` | `order.table_id` (bug: should be `table_name` → KDS_BUGS.md Bug 2), `order.order_number`, `order.status`, `elapsedMins(order.created_at)` |
| Item rows | inline `kitItems.map()` `page.tsx:227-254` | `order.items` filtered via `isKitchenItem()` (page.tsx:75-77); variant label via `kdsVariant()` (page.tsx:81-91) |
| Inline status picker | conditional render when `statusMenus.has(order.id)` (`page.tsx:257-278`) | local `Set<string>` `statusMenus`; sends `PATCH /orders/:id/status` |
| Action buttons row | `page.tsx:281-304` | local toggle; `patchItemStatus` (broken) + `patchOrderStatus` mutations |
| 🔍 Kiểm tra toggle | button `page.tsx:283-292` | local `Set<string>` `flagged`; no API call |
| Trạng thái ▼ toggle | button `page.tsx:293-304` | opens/closes inline picker; local state |
| Beep | `useBeep()` Web Audio oscillator (`page.tsx:9-26`) | fires on `new_order` WS event (`page.tsx:125`) |
| WS feed | `useOrdersWSContext().subscribe` (`page.tsx:113-157`) | shared WS connection from `(dashboard)/layout.tsx:1-4` via `OrdersWSContext.tsx` |

## Key Interactions

- **Tap an item line** → `patchItemStatus.mutate()` calls
  `api.patch(\`/orders/${orderId}/items/${itemId}/status\`, {})` (`page.tsx:160-161`).
  **This is currently broken (404)** — no such route exists; the correct route is
  `PATCH /orders/items/:id` with body `{qty_served}`. Every tap produces a
  `toast.error('Không thể cập nhật món')` and `qty_served` never advances. See
  [KDS_BUGS.md Bug 1](KDS_BUGS.md#bug-1----tap-to-serve-hits-a-404-wrong-path--wrong-body).

- **Trạng thái ▼** → toggles `statusMenus` local set (`page.tsx:293-304`); shows inline picker.
  - ✓ Phục vụ → `PATCH /orders/:id/status {status:'ready'}` (`page.tsx:260`)
  - 🛍 Mang đi → same `PATCH … {status:'ready'}` (`page.tsx:266`) — both buttons send identical payload
  - Huỷ → `PATCH /orders/:id/status {status:'cancelled'}` (`page.tsx:272`)
  - On success: card removed from local state (`page.tsx:168-172`), `toast.success`. On error
    (incl. `409 INVALID_STATUS_TRANSITION`): `toast.error` (`page.tsx:173`), card stays.

- **🔍 Kiểm tra** → toggles `flagged` local set (`page.tsx:283-292`); forces `border-urgent` on
  the card (`page.tsx:207`). No API call, no persistence — local marker only.

- **New WS `new_order` event** → `GET /orders/:id` refetch, prepend card (dedup by id), audio
  beep (`page.tsx:118-128`).

- **WS `item_progress`** → bumps `qty_served` on the matching item in local state (`page.tsx:129-144`);
  visible as live `còn ×N` counter decrease even though the KDS itself cannot produce this event.

- **WS `order_cancelled`** → removes card (`page.tsx:145-148`).

- **WS `order_status_changed`** → removes card when `status ∉ {pending, confirmed, preparing}`
  (`page.tsx:149-154`); this is also how *Huỷ* via the picker disappears (status `cancelled` from
  the PATCH publishes `order_status_changed`, not `order_cancelled`).

- **Events ignored** (arrive on socket but have no `case`): `items_added`, `item_cancelled`,
  `item_updated` (`page.tsx:116-155`).

## Business Logic Used

- Order status transitions (`confirmed → preparing → ready`, who may advance) →
  [../../../02_spec/BUSINESS_RULES.md §2.2](../../../02_spec/BUSINESS_RULES.md#22-transition-permissions).
  Key KDS consequence: `→ready` is only valid from `preparing`; a card still in `confirmed` or
  `pending` will get a `409` from *Phục vụ*/*Mang đi* (see staff_kds_be.md Flag 3 for detail).

- Item progress = `qty_served` counter (no separate status column in DB) →
  [../../../02_spec/BUSINESS_RULES.md §2.4](../../../02_spec/BUSINESS_RULES.md#24-item-status-derived--no-column).
  KDS derives `còn ×N` as `quantity − qty_served` (`page.tsx:199`); `deriveItemStatus()` exists
  in `fe/src/types/order.ts:9-13` but the KDS does not call it.

- WS auth via `?token=` query param (not Authorization header) + one connection per browser
  session (shared provider in dashboard layout) →
  [../../../02_spec/BUSINESS_RULES.md §6](../../../02_spec/BUSINESS_RULES.md#6-realtime-config).

- Urgency thresholds (>20 m urgent / 10-20 m warning / <10 m normal) and KDS variant label logic
  (`kdsVariant()` — canh → "có/không rau" from `toppings_snapshot`; other items → nhân names) →
  [../../../07_business_logic/LOGIC_FE.md](../../../07_business_logic/LOGIC_FE.md) (KDS rules).

## Object Model — KDS Page (FE ⇄ BE ⇄ DB)

> Traced from source on branch `experience_claude.md_system_1`.
> Sources: `fe/src/types/order.ts` · `fe/src/context/OrdersWSContext.tsx` ·
> `fe/src/app/(dashboard)/kds/page.tsx`.
>
> **Scope:** only the shapes THIS page reads and the WS message shape it handles. The full
> Order/OrderItem pipeline (create → DB rows → response DTO) lives in
> [../../../02_spec/object/OBJECT_MODELS.md](../../../02_spec/object/OBJECT_MODELS.md) and
> [../../../02_spec/object/OBJECT_MODEL_ORDER.md](../../../02_spec/object/OBJECT_MODEL_ORDER.md) —
> not duplicated here.

```
BE (MySQL) → GET /orders or GET /orders/:id → orderJSON serializer
           → Order[] (types/order.ts) → local useState<Order[]> (page.tsx:97)
           → per-card: Order view + kitItems (filtered OrderItem[]) + kdsVariant labels
WS        → /ws/orders-live?token= → WsMsg → in-place state deltas (no re-query)
```

### §1 — WsMsg (WS event shape the page consumes)

Defined in `fe/src/context/OrdersWSContext.tsx:5-11`.

| Field | Type | Present on which events |
|---|---|---|
| `type` | `string` | all events |
| `order_id` | `string` (UUID) | all events |
| `item_id` | `string \| undefined` | `item_progress` only |
| `qty_served` | `number \| undefined` | `item_progress` only |
| `status` | `string \| undefined` | `order_status_changed` only |

Events consumed by this page: `new_order` · `item_progress` · `order_cancelled` ·
`order_status_changed`. Events ignored: `items_added` · `item_cancelled` · `item_updated`.

### §2 — Order (KDS card view)

Full Order shape (all layers, all fields) → [../../../02_spec/object/OBJECT_MODEL_ORDER.md](../../../02_spec/object/OBJECT_MODEL_ORDER.md).

Fields the KDS board actually reads (`types/order.ts:38-52`; used in `page.tsx`):

| FE field | TS type | Used at | Note |
|---|---|---|---|
| `id` | `string` | dedup, mutations | UUID |
| `order_number` | `string` | card header `page.tsx:216` | display only |
| `status` | `OrderStatus` | `statusBadgeClass` / `statusLabel` / ACTIVE_STATUSES filter `page.tsx:110,150` | — |
| `table_id` | `string \| null` | card header `page.tsx:214` | 🔴 Bug 2: renders UUID not `table_name` |
| `table_name` | `string \| null \| undefined` | ❓ UNVERIFIED: field exists on `Order` type (`order.ts:43`) but is NOT read at `page.tsx:214` | fix is `order.table_name \|\| order.table_id` |
| `created_at` | `string` (ISO-8601) | `elapsedMins()` `page.tsx:29` | urgency border + text |
| `items` | `OrderItem[]` | item rows | filtered by `isKitchenItem()` |
| `source` | `'online' \| 'qr' \| 'pos'` | not read by this page | — |
| `total_amount`, `note`, `customer_name`, `customer_phone`, `updated_at` | various | not read by this page | — |

### §3 — OrderItem (item row view)

Full OrderItem shape → [../../../02_spec/object/OBJECT_MODEL_ORDER.md](../../../02_spec/object/OBJECT_MODEL_ORDER.md).

Fields the KDS reads (`types/order.ts:15-27`; used in `page.tsx:197-254`):

| FE field | TS type | Used at | Note |
|---|---|---|---|
| `id` | `string` | tap mutation key `page.tsx:234`, WS `item_progress` match `page.tsx:136` | UUID |
| `name` | `string` | item label `page.tsx:239`; `kdsVariant` check `page.tsx:83` | — |
| `quantity` | `number` | `còn ×N` calc `page.tsx:199,228` | — |
| `qty_served` | `number` | `còn ×N` calc; WS delta target `page.tsx:138` | incremented by `item_progress` WS event |
| `toppings_snapshot` | `ToppingSnapshotEntry[] \| null` | `kdsVariant()` `page.tsx:82` | names array → "có/không rau" or nhân list |
| `note` | `string \| null` | `kdsVariant()` legacy fallback for canh `page.tsx:86` | only used if no "rau" in snapshot |
| `combo_id` | `string \| null` | `isKitchenItem()` filter `page.tsx:76` | combo header rows excluded from board |
| `combo_ref_id` | `string \| null` | `isKitchenItem()` filter `page.tsx:76` | — |
| `flagged` | `boolean` | not read by this page | — |
| `product_id`, `unit_price` | various | not read by this page | — |

`isKitchenItem(item)` (`page.tsx:75-77`): returns `false` when `combo_id !== null && combo_ref_id === null` (i.e. the combo header row with `unit_price=0`) — those rows are excluded from the board. Sub-items (`combo_ref_id` set) are included and rendered normally.

### §4 — ToppingSnapshotEntry

Defined in `fe/src/types/order.ts:1-5`.

| Field | Type | Used at |
|---|---|---|
| `id` | `string` | not read by KDS page |
| `name` | `string` | `kdsVariant()` `page.tsx:82-89`: `includes('rau')` check + nhân name list |
| `price` | `number` | not read by KDS page |

### §5 — Flags / Known Mismatches

> Full bug detail (root cause + fix suggestions) → [KDS_BUGS.md](KDS_BUGS.md).

| # | Mismatch | Source | Severity |
|---|---|---|---|
| 1 | **🔴 Tap-to-serve is permanently broken (404)** | `page.tsx:160-161` PATCHes non-existent path `/orders/${orderId}/items/${itemId}/status`; real route is `PATCH /orders/items/:id` with `{qty_served}` body (`be/cmd/server/main.go:250`). Body is also empty `{}`, which would SET `qty_served=0` even if routed. Every tap → toast error. → [KDS_BUGS.md Bug 1](KDS_BUGS.md#bug-1----tap-to-serve-hits-a-404-wrong-path--wrong-body) | 🔴 High — core feature dead |
| 2 | **🟠 Card header shows table UUID, not table name** | `page.tsx:214` renders `order.table_id` (UUID string); `order.table_name` is in the response and on the `Order` type (`order.ts:43`) but is ignored. → [KDS_BUGS.md Bug 2](KDS_BUGS.md#bug-2----card-header-shows-the-table-uuid-not-the-table-name) | 🟠 Medium — every dine-in card mislabelled |
| 3 | **`→ready` invalid from `confirmed`/`pending`** | *Phục vụ*/*Mang đi* always send `{status:'ready'}`. Valid only from `preparing` (see `order_service.go:524-530`). Tapping from earlier states returns `409`; KDS has no "Start cooking" control. → staff_kds_be.md Flag 3 | 🟡 UX gap |
| 4 | **`deriveItemStatus()` defined but unused** | `types/order.ts:9-13` exports `deriveItemStatus()`; KDS recomputes the same logic inline (`page.tsx:199,228,229`). No impact, minor dead export. | 🟢 Cosmetic |
| 5 | **`/ws/kds` endpoint is dead code** | A dedicated `/ws/kds` WS endpoint exists (`main.go:338`) with the same `orders:kds` channel, but the dashboard layout only creates `OrdersWSProvider` → `/ws/orders-live`. No FE ever connects to `/ws/kds`. → staff_kds_be.md Flag 5 | 🟢 BE dead code |
| 6 | **Three `orders:kds` events are silently ignored** | `items_added`, `item_cancelled`, `item_updated` arrive on the socket but have no `case` (`page.tsx:116-155`). Added items or per-item cancels don't live-update the board; chef sees stale counts until a reconnect. | 🟡 Live-update gap |
| 7 | **WS has no role gate** | `/ws/orders-live` (and `/ws/kds`) carry no `authMW`; any signature-valid JWT (incl. customer guest) can subscribe to `orders:kds`. → staff_kds_be.md Flag 4 | 🔴 Security |
