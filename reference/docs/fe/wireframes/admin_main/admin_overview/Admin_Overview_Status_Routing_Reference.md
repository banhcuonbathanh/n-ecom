# Admin Overview — Status Routing Reference

## Page Layout

| Zone | Component | Title | When visible |
|---|---|---|---|
| A | StatCards | — | Always |
| ONLINE | OnlineOrdersSection | Đơn online | Only when ≥1 active order has `source='online'` — these orders have NO table so Zone B never shows them (SĐT · địa chỉ · Chỉ đường Google Maps · badge thanh toán · giờ lấy · nút chuyển trạng thái + Hủy). Zone D **list view** (TableList) ALSO shows them as ONE aggregate virtual-table row "🛵 Đơn online" (ONLINE-4): count badge + per-status count chips + oldest-order urgency time/border; "Xem N đơn" expands to one compact sub-row per order (#suffix · customer · status badge with advance/pay+cancel actions · elapsed · Xong double-tap, hidden when `payment_status='completed'` to avoid double cash payment; row click opens drawer). No "Đặt hộ" (no table_id). Confirmed online orders' dishes flow into D4 "Đơn hàng cần làm" (it filters by status, not table). TableGrid (grid view) still table-keyed → never shows them |
| B | WaitingSection | Danh sách bàn cần chuẩn bị | Always — all active orders **with a valid table** (`table_id` ∈ tables) |
| C | PrepPanel | Danh sách món ăn cần chuẩn bị | Only when 🔍 Kiểm tra is active on a row |
| D | Table view | — | Always |
| E | PaidLog | Đơn đã thanh toán hôm nay | Collapsible — `paid` orders from today |
| F | CancelLog | Đơn đã huỷ hôm nay | Collapsible — `cancelled` orders from today |

---

## Table DB Statuses (`tables.status`)

| Status | Meaning |
|---|---|
| `available` | Empty, no active order |
| `occupied` | Has an active order in progress |
| `reserved` | Reserved (not yet seated) |
| `inactive` | Disabled / not in use |

---

## Order Statuses — Which Section Each Appears In

| Order Status | Vietnamese label | StatCards | WaitingSection (Zone B) | PrepPanel (Zone C) | Table view (Zone D) | PaidLog (Zone E) | CancelLog (Zone F) |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `pending` | Chờ xác nhận | ✅ | ✅ | ✅ (if kiemTra active) | ✅ | ❌ | ❌ |
| `confirmed` | Đã xác nhận | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `preparing` | Đang làm | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `ready` | Sẵn sàng phục vụ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `delivered` | Đã giao | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `cancelled` | Đã huỷ | — | ❌ | ❌ | ❌ | ❌ | ✅ |
| `paid` | Đã thanh toán | — | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## WaitingSection — Action Buttons Per Status

| Order Status | Button shown | Next status |
|---|---|---|
| `pending` | Xác nhận | `confirmed` |
| `confirmed` | Bắt đầu làm | `preparing` |
| `preparing` | Sẵn sàng | `ready` |
| `ready` | Đã giao | `delivered` |

---

## PrepPanel — Rules

- Only shows orders with status `pending` (from kiemTra-selected table)
- Bulk action button always shows **"Xác nhận"** → advances all to `confirmed`
- Dishes disappear immediately after confirming (optimistic update)
- All other status transitions handled in **Table view (Zone D)**

---

## Zone E — PaidLog Rules

- Shows only `paid` orders created **today** (midnight → now)
- Sorted by `updated_at DESC` (most recent first — payment time)
- Columns: Bàn · Mã đơn · Tổng tiền · Giờ tạo · Giờ thanh toán · Ghi chú
- "Giờ thanh toán" = `updated_at` (the moment the order was marked paid)
- "Ghi chú" = `note` field (free-text left by customer/staff at order creation)
- Collapsed by default; toggle to expand

---

## Zone F — CancelLog Rules

- Shows only `cancelled` orders created **today** (midnight → now)
- Sorted by `updated_at DESC` (most recent first — cancellation time)
- Columns: Bàn · Mã đơn · Tổng tiền · Giờ tạo · Giờ huỷ · Ghi chú
- "Giờ huỷ" = `updated_at` (the moment the order was cancelled)
- "Ghi chú" = `note` field (free-text left by customer/staff at order creation)
- **No `cancel_reason` field exists** — use `note` + elapsed time as signal
- Collapsed by default; toggle to expand
- Purpose: let staff/manager spot patterns in cancellations and improve operations
