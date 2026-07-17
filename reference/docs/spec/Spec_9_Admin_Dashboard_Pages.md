# Spec 9 — Admin Dashboard: Overview + Marketing Pages

> **Version:** v1.0 · 2026-05-03
> **Status:** ✅ BUILT — both pages deployed and verified via Playwright
> **Access:** Manager+ (`minRole={Role.MANAGER}`) — enforced by `AdminLayout` AuthGuard + RoleGuard

---

## 1. Admin Layout

**File:** `fe/src/app/(dashboard)/admin/layout.tsx`

Tab navigation (in order):

| Tab | URL | Description |
|---|---|---|
| Tổng quan | `/admin/overview` | Live floor view + order management |
| Sản phẩm | `/admin/products` | Product CRUD |
| Danh mục | `/admin/categories` | Category CRUD |
| Topping | `/admin/toppings` | Topping CRUD |
| Nhân viên | `/admin/staff` | Staff CRUD |
| Marketing | `/admin/marketing` | QR codes + product catalogue |

Active tab: `border-orange-500 text-orange-600`. Inactive: `text-gray-500`.

---

## 2. Overview Page — Tổng quan sàn

**File:** `fe/src/app/(dashboard)/admin/overview/page.tsx`
**URL:** `/admin/overview`
**Role:** Manager+

### 2.1 Data Sources

| Source | Hook | Refresh |
|---|---|---|
| Tables list | `useQuery(['tables'])` | staleTime 60s |
| Live orders | `useQuery(['orders','live'])` | staleTime 15s |
| Real-time updates | WebSocket `/ws/orders-live?token=` | auto-reconnect exponential backoff |

> `USE_MOCK = true` flag in file — switch to `false` to use real API. Mock data covers all 5 order statuses and urgency tiers.

WS message types handled: `new_order` · `item_progress` · `order_status_changed` · `order_updated` · `order_cancelled` · `order_completed`.

Active statuses kept in UI: `pending` · `confirmed` · `preparing` · `ready`.

### 2.2 Stat Cards (top row)

4 cards:

| Card | Value |
|---|---|
| Bàn đang phục vụ | count of tables with active order |
| Món chờ làm | sum of `pending` items across all orders |
| Món đang làm | sum of `preparing` items across all orders |
| Khẩn cấp / Cảnh báo | `>20min count / 10–20min count` |

`itemCounts()` helper derives pending/preparing/done from `qty_served` (no status column).

### 2.3 Urgency Color Coding (border on TableCard)

| Condition | Border color |
|---|---|
| No order (empty) | `border-gray-200` |
| < 10 min elapsed | `border-orange-400` |
| 10–20 min elapsed | `border-yellow-400` |
| > 20 min elapsed | `border-red-400` |

Timer ticks every 30 seconds (`setInterval`).

### 2.4 Waiting Tables Section ("N bàn chờ xác nhận")

Shows all orders with `status === 'pending'`, sorted by elapsed time.

Each card displays:
- Table name + order number + capacity
- Elapsed time (amber colored)
- Dish list with quantities

**Action buttons (3-col grid):**

| Button | Color | Action |
|---|---|---|
| ✓ Phục vụ | green | `PATCH /orders/:id/status` → `confirmed` |
| 🥡 Mang đi | blue | `PATCH /orders/:id/status` → `confirmed` (take-away context) |
| Huỷ | red/light | `PATCH /orders/:id/status` → `cancelled` → remove from list |

Buttons disabled while `loadingIds.has(orderId)` (350ms mock delay, real API otherwise).

**Kiểm tra button** (above action buttons):
- Inactive: `bg-indigo-50 text-indigo-700` · label `🔍 Kiểm tra`
- Active: `bg-indigo-500 text-white` · label `✓ Đang xem`
- Clicking toggles `checkedTableIds` Set for that table.

### 2.5 Danh sách cần chuẩn bị (PrepPanel)

Shown **only when `checkedTableIds.size > 0`** (standalone section below waiting area).

Driven by `checkedOrders = checkedTableIds → orderByTable lookup`.

**Per-table section** (collapsible, click header to toggle):
- Table name + order number + status badge
- Dish rows with status dot (grey=chờ / yellow=đang làm / green=xong) and `còn ×N` or `✓ xong` badge
- Notes shown in italic orange

**Tổng cần làm (summary section)** at the bottom:
- One row per distinct dish name across all checked orders
- Shows which tables need it + total remaining quantity (indigo badge `×N`)
- Sorted by remaining qty descending
- Only counts `quantity - qty_served > 0` (not yet fully served)
- "Tất cả món đã ra hết." if everything is served

### 2.6 All-Tables Grid

Below the waiting section. Sorted: occupied tables first, then alphabetically by name (Vietnamese locale).

Empty state: centre icon + "Chưa có đơn".

Each `TableCard` (occupied) renders `OrderDetail` which shows:
- Order number + status badge + elapsed time
- Progress bar (`servedQty / totalQty × 100%`)
- 3 mini counters: Chờ / Đang làm / Đã ra
- Item list with status dots and `qty_served/quantity`
- **Kiểm tra** toggle button (same behaviour as 2.4)
- **Hoàn thành** (green) — only when `status === 'ready'` → `delivered`
- **Huỷ** (red/light) — when `status` in `confirmed | preparing | ready` → `cancelled`

### 2.7 Order Status Machine (for reference)

```
pending → confirmed → preparing → ready → delivered
                ↘          ↘         ↘
                         cancelled
```

From the overview page, transitions triggered:
- `pending → confirmed` (Phục vụ / Mang đi)
- `pending → cancelled` (Huỷ on pending card)
- `confirmed | preparing → cancelled` (Huỷ in OrderDetail)
- `ready → delivered` (Hoàn thành in OrderDetail)

---

## 3. Marketing Page — QR & Catalogue

**File:** `fe/src/app/(dashboard)/admin/marketing/page.tsx`
**URL:** `/admin/marketing`
**Role:** Manager+

### 3.1 QR Code Section

Generates table QR codes for `TABLE_COUNT = 10` tables.

Each `TableQRCard`:
- URL: `{window.location.origin}/table/{tableNo}`
- QR rendered via `react-qr-code` library (`QRCode` component, size 120px)
- **Copy** button — copies URL to clipboard, shows green ✓ for 2s, toast via `sonner`
- **SVG** button — downloads `qr-ban-{N}.svg`
- **Print** button (section level) — `window.print()` targeting print-specific CSS

### 3.2 Product Catalogue Section

Queries `listProducts()`, `listCategories()`, `listToppings()` via TanStack Query.

Displays:
- Category list with product counts
- Product cards: name, price (formatVND), availability badge, image if present
- Topping list with prices

Used for: printing menus, visual reference for staff.

### 3.3 Dependencies

```json
"react-qr-code": "^2.x",
"lucide-react": "^0.x"
```

Both already in `fe/package.json`.

---

## 4. API Endpoints Used (this spec)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/tables` | List all tables |
| GET | `/api/v1/orders/live` | Active orders snapshot |
| PATCH | `/api/v1/orders/:id/status` | Change order status |
| WS | `/ws/orders-live?token=` | Real-time order events |

`updateOrderStatus(id, status)` added to `fe/src/features/admin/admin.api.ts`.
