---
page: overview
route: /admin/overview
spec_ref: Spec_9 §2
created: 2026-05-04
---

# Wireframe — Admin Overview (Tổng quan sàn)

## Data Sources

| Zone | Source | Update mechanism |
|---|---|---|
| ZoneA — StatCards | derived from `orders` query | recomputed on every query refetch |
| ZoneB — WaitingSection | `useQuery(['orders','live'])` staleTime 15s | + WS push `new_order` · `order_status_changed` |
| ZoneC — PrepPanel | derived from `checkedTableIds` Set × `orders` | client state (Zustand/useState) |
| ZoneD — TableGrid | `useQuery(['tables'])` staleTime 60s + `useQuery(['orders','live'])` | + WS push all message types |
| ZoneE — OrderDetail (inside TableCard) | same orders query | WS `item_progress` updates `qty_served` in place |
| ZoneF — WebSocket handler | `GET /ws/orders-live?token=` | auto-reconnect exponential backoff |

---

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [ZoneA — StatCards]                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐ │
│  │ Bàn đang     │ │ Món chờ làm  │ │ Món đang làm │ │ Khẩn  │ │
│  │ phục vụ      │ │ (pending cnt)│ │ (prep cnt)   │ │ cấp / │ │
│  │ count        │ │              │ │              │ │ Cảnh  │ │
│  │              │ │              │ │              │ │ báo   │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  [ZoneB — WaitingSection]  "N bàn chờ xác nhận"                │
│  (shown only when pending orders exist)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [WaitingCard — per pending order]                        │  │
│  │  table name · order number · capacity · elapsed (amber)  │  │
│  │  dish list with quantities                               │  │
│  │  ┌─────────────┐                                        │  │
│  │  │ 🔍 Kiểm tra │ (toggle → activates ZoneC for table)   │  │
│  │  └─────────────┘                                        │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │  │
│  │  │ ✓ Phục vụ   │ │ 🥡 Mang đi  │ │     Huỷ      │    │  │
│  │  │ (green)      │ │ (blue)       │ │ (red/light)  │    │  │
│  │  │ → confirmed  │ │ → confirmed  │ │ → cancelled  │    │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘    │  │
│  │  disabled while loadingIds.has(orderId)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [ZoneC — PrepPanel]                                            │
│  (shown ONLY when checkedTableIds.size > 0)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [Per-table section — collapsible, click header to toggle]│  │
│  │   table name · order number · status badge               │  │
│  │   dish rows: dot (grey/yellow/green) · còn ×N or ✓ xong │  │
│  │   notes in italic orange                                 │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ [Tổng cần làm — summary]                                 │  │
│  │   one row per distinct dish across all checked orders    │  │
│  │   table labels · total remaining (indigo badge ×N)       │  │
│  │   sorted by remaining qty desc                           │  │
│  │   "Tất cả món đã ra hết." if nothing left                │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  [ZoneD — TableGrid]  all tables                               │
│  sorted: occupied first, then alpha by name (vi-VN locale)     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ...        │
│  │ [TableCard]  │ │ [TableCard]  │ │ [TableCard]  │            │
│  │ OCCUPIED     │ │ OCCUPIED     │ │ AVAILABLE    │            │
│  │ border-color │ │              │ │ border-gray  │            │
│  │ by urgency   │ │              │ │ empty state  │            │
│  │              │ │              │ │ icon +"Chưa  │            │
│  │ [ZoneE       │ │ [ZoneE       │ │  có đơn"     │            │
│  │ OrderDetail] │ │ OrderDetail] │ │              │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Zone E — OrderDetail (inside each occupied TableCard)

```
┌────────────────────────────────────────────────┐
│  ORD-001              [status badge]  14 phút  │
│                                      HH:MM     │
├────────────────────────────────────────────────┤
│  2/5 phần đã ra                           40%  │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░  (progress)  │
├────────────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────────┐  ┌───────────┐ │
│  │    2    │  │      1       │  │     2     │ │
│  │  Chờ   │  │  Đang làm   │  │  Đã ra   │ │
│  └─────────┘  └──────────────┘  └───────────┘ │
├────────────────────────────────────────────────┤
│  ● Bánh Cuốn Thịt         còn ×1  0/2         │
│  ● Bún Bò Huế (prep)      còn ×1  1/2 (yellow)│
│  ● Nước Chanh (done)      ✓ xong  2/2 (green) │
├────────────────────────────────────────────────┤
│  ┌───────────────┐   ┌──────────────────────┐  │
│  │ 🔍 Kiểm tra  │   │    Hoàn thành        │  │
│  │ (indigo tog.) │   │  (green, status=ready│  │
│  └───────────────┘   │   → delivered)       │  │
│                      └──────────────────────┘  │
│                      ┌──────────────────────┐  │
│                      │       Huỷ            │  │
│                      │ (red, confirmed|      │  │
│                      │  preparing|ready      │  │
│                      │  → cancelled)         │  │
│                      └──────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

## Urgency Border Logic (TableCard)

| Condition | Class |
|---|---|
| No active order (available) | `border-gray-200` |
| Active order < 10 min | `border-orange-400` |
| Active order 10–20 min | `border-yellow-400` |
| Active order > 20 min | `border-red-400` |

Timer ticks every 30s via `setInterval`.

---

## WebSocket (ZoneF) — Message Types Handled

| Type | Action |
|---|---|
| `new_order` | append to orders list |
| `item_progress` | update `qty_served` on matching item |
| `order_status_changed` | update order status; remove if not in ACTIVE set |
| `order_updated` | replace order in list |
| `order_cancelled` | remove order from list |
| `order_completed` | remove order from list |

WS URL: `GET /ws/orders-live?token={accessToken}`
Auth: query param (not header) per `docs/core/MASTER_v1.2.md §5`.

---

## Components

| Zone | Component | spec_ref | Shared? |
|---|---|---|---|
| ZoneA | `StatCards` | Spec_9 §2.2 | page-specific |
| ZoneB | `WaitingSection` | Spec_9 §2.4 | page-specific |
| ZoneB leaf | `WaitingCard` | Spec_9 §2.4 | page-specific |
| ZoneC | `PrepPanel` | Spec_9 §2.5 | page-specific |
| ZoneD | `TableGrid` | Spec_9 §2.6 | page-specific |
| ZoneD leaf | `TableCard` | Spec_9 §2.3 + §2.6 | page-specific |
| ZoneE | `OrderDetail` | Spec_9 §2.6 | page-specific |
| ZoneF | `useOverviewWS` hook | Spec_9 §2.1 | page-specific |
| page | `overview/page.tsx` | Spec_9 §2 | — |

---

## Task Rows (copy into TASKS.md)

| ID | Domain | Task | Status | spec_ref | draw_ref |
|---|---|---|---|---|---|
| 9-1 | FE | `admin.api.ts` — add `listTables`, `listLiveOrders`, `updateOrderStatus` with real axios calls (no mock) | ⬜ | Spec_9 §2.1 §4 | wireframes/overview.md ZoneF |
| 9-2 | FE | `useOverviewWS` hook — WS connect/reconnect + 6 message type handlers → mutates TanStack Query cache | ⬜ | Spec_9 §2.1 | wireframes/overview.md ZoneF |
| 9-3 | FE | `StatCards` component — 4 cards derived from live orders (tables served, pending items, preparing items, urgency) | ⬜ | Spec_9 §2.2 | wireframes/overview.md ZoneA |
| 9-4 | FE | `WaitingCard` + `WaitingSection` — pending order cards with Kiểm tra toggle + 3 action buttons (disabled during loading) | ⬜ | Spec_9 §2.4 | wireframes/overview.md ZoneB |
| 9-5 | FE | `PrepPanel` — conditional panel (checkedTableIds > 0), collapsible per-table sections + Tổng cần làm summary | ⬜ | Spec_9 §2.5 | wireframes/overview.md ZoneC |
| 9-6 | FE | `OrderDetail` — progress bar + mini counters + item list with status dots + Hoàn thành / Huỷ / Kiểm tra buttons | ⬜ | Spec_9 §2.6 | wireframes/overview.md ZoneE |
| 9-7 | FE | `TableCard` + `TableGrid` — urgency border, occupied-first sort (vi-VN), empty state | ⬜ | Spec_9 §2.3 §2.6 | wireframes/overview.md ZoneD |
| 9-8 | FE | `overview/page.tsx` — assemble all zones, flip USE_MOCK=false, wire useOverviewWS, 30s timer tick | ⬜ | Spec_9 §2 | wireframes/overview.md |
