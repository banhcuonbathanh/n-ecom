# 📊 HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
## Sơ Đồ Hệ Thống (System Diagrams)
> **Version:** v1.0 · Tháng 4/2026
> **Công cụ khuyến nghị:** draw.io · PlantUML · dbdiagram.io · Miro

---

## 1. Use Case Diagram

### 1.1 Tác Nhân (Actors)

| Actor | Mô Tả |
|---|---|
| **Guest (Customer)** | Khách hàng tại bàn — truy cập qua QR code |
| **Cashier** | Thu ngân — quản lý POS, xác nhận thanh toán |
| **Chef** | Nhân viên bếp — nhận và xử lý đơn qua KDS |
| **Staff** | Nhân viên đa năng — quyền tương đương Cashier + Chef |
| **Manager** | Quản lý ca — quản lý nhân viên, xem báo cáo |
| **Admin** | Quản trị viên — toàn quyền hệ thống |
| **Payment Gateway** | Hệ thống bên ngoài (VNPay, MoMo, ZaloPay) |

### 1.2 Use Cases Chính

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN                 │
│                                                                     │
│  ┌──────────────┐     ┌────────────────────────────────────────┐   │
│  │    GUEST     │────►│ UC-01: Quét QR / Xem thông tin bàn     │   │
│  │  (Customer)  │     │ UC-02: Xem menu sản phẩm               │   │
│  │              │────►│ UC-03: Thêm món vào giỏ hàng           │   │
│  │              │────►│ UC-04: Đặt món (tạo đơn hàng)          │   │
│  │              │────►│ UC-05: Theo dõi trạng thái đơn (SSE)   │   │
│  └──────────────┘     │ UC-06: Hủy đơn (< 30% done)           │   │
│                        └────────────────────────────────────────┘   │
│  ┌──────────────┐     ┌────────────────────────────────────────┐   │
│  │   CASHIER    │────►│ UC-07: Xem danh sách bàn + trạng thái  │   │
│  │              │────►│ UC-08: Tạo đơn thủ công (POS)          │   │
│  │              │────►│ UC-09: Thêm món vào đơn đang có        │   │
│  │              │────►│ UC-10: Xác nhận đơn (pending→confirmed) │   │
│  │              │────►│ UC-11: Xử lý thanh toán tiền mặt (COD) │   │
│  │              │────►│ UC-12: In hóa đơn                      │   │
│  └──────────────┘     └────────────────────────────────────────┘   │
│  ┌──────────────┐     ┌────────────────────────────────────────┐   │
│  │    CHEF      │────►│ UC-13: Xem đơn trên KDS (realtime WS)  │   │
│  │              │────►│ UC-14: Cập nhật qty_served (làm từng món)│  │
│  │              │────►│ UC-15: Mark toàn bộ item done           │   │
│  └──────────────┘     └────────────────────────────────────────┘   │
│  ┌──────────────┐     ┌────────────────────────────────────────┐   │
│  │   MANAGER    │────►│ UC-16: Quản lý nhân viên (CRUD)        │   │
│  │              │────►│ UC-17: Xem báo cáo doanh thu           │   │
│  │              │────►│ UC-18: Quản lý sản phẩm / menu         │   │
│  │              │────►│ UC-19: Rotate QR token cho bàn         │   │
│  │              │────►│ UC-20: Hủy đơn (override)              │   │
│  └──────────────┘     └────────────────────────────────────────┘   │
│  ┌──────────────┐     ┌────────────────────────────────────────┐   │
│  │    ADMIN     │────►│ UC-21: Tạo / xóa Manager               │   │
│  │              │────►│ UC-22: Xem toàn bộ log hệ thống        │   │
│  │              │────►│ UC-23: Cấu hình hệ thống               │   │
│  └──────────────┘     └────────────────────────────────────────┘   │
│  ┌──────────────┐     ┌────────────────────────────────────────┐   │
│  │  PAYMENT GW  │────►│ UC-24: Gửi webhook IPN (signed)        │   │
│  └──────────────┘     └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Activity Diagram — Luồng Đặt Món (QR Flow)

```
[Customer quét QR]
        │
        ▼
GET /tables/qr/:token
        │
   ┌────┴────┐
   │ valid?  │
   └────┬────┘
    NO  │  YES
    │   ▼
    │  Bàn có active order?
    │        │
    │    YES │   NO
    │    │   ▼   ▼
    │    │  POST /auth/guest
    │    │       │
    │    │   ┌───┴──┐
    │    │   │ Token│
    │    │   │ issue│
    │    │   └───┬──┘
    │    │       ▼
 Hiển  Hiển   Hiển thị
 thị  thị    menu /table/:id
 lỗi  "Bàn         │
      có đơn"  [Customer chọn món]
              →  POST /api/v1/orders
                      │
                 ┌─────┴──────┐
                 │   Tạo đơn  │
                 │  (pending) │
                 └─────┬──────┘
                        │
                  Broadcast WS → KDS
                        │
                  SSE stream → Customer tracking
                        │
              [Chef cập nhật qty_served]
                        │
               All items done?
                   │        │
                  NO       YES
                   │        │
              Chef tiếp    order → ready
              tục làm      Broadcast → Cashier
                                │
                        [Cashier confirm payment]
                                │
                         POST /api/v1/payments
                                │
                          order → delivered
```

---

## 3. Activity Diagram — Luồng Hủy Đơn

```
[Yêu cầu hủy đơn]
        │
        ▼
  PATCH /orders/:id/status (cancelled)
        │
   ┌────┴──────────────────────────────────┐
   │ Kiểm tra role                          │
   │ - customer: chỉ hủy đơn của mình      │
   │ - cashier/manager: hủy đơn bất kỳ     │
   └────┬──────────────────────────────────┘
        │
   ┌────┴────┐
   │ Status  │
   │hợp lệ? │  (pending/confirmed/preparing only)
   └────┬────┘
    NO  │  YES
    │   ▼
    │  Tính tỷ lệ done:
    │  SUM(qty_served) / SUM(quantity)
    │        │
    │   ┌────┴────┐
    │   │  < 30%? │
    │   └────┬────┘
    │    NO  │  YES
    │    │   ▼
  409  Cancel allowed
  ORDER_   │
  NOT_  Update status = cancelled
  CANCEL   │
  ABLE  Đã có payment?
              │         │
             YES        NO
              │         │
        Trigger refund  Kết thúc
              │
        payment → refunded
```

---

## 4. State Machine — Vòng Đời Đơn Hàng

```
                    ┌─────────┐
                    │         │
         ───────►   │ PENDING │
    (Tạo đơn)       │         │
                    └────┬────┘
                         │  cashier/system confirm
                         ▼
                    ┌─────────────┐
                    │             │
                    │  CONFIRMED  │
                    │             │
                    └──────┬──────┘
                           │  chef click nhận
                           ▼
                    ┌─────────────┐
                    │             │
                    │  PREPARING  │
                    │             │
                    └──────┬──────┘
                           │  all items qty_served = quantity
                           ▼
                    ┌──────────┐
                    │          │
                    │  READY   │◄── Auto khi KDS xong
                    │          │
                    └─────┬────┘
                          │  cashier confirm giao
                          ▼
                    ┌───────────┐
                    │           │
                    │ DELIVERED │  (terminal)
                    │           │
                    └───────────┘

Từ pending/confirmed/preparing:
─────────────────────────────►  ┌───────────────┐
   (huỷ, nếu < 30% done)       │               │
                                │  CANCELLED    │  (terminal)
                                │               │
                                └───────────────┘
```

**Bảng chuyển trạng thái:**

| Từ | Sang | Điều Kiện | Ai Được Phép |
|---|---|---|---|
| — | pending | Tạo đơn mới | customer, cashier, staff |
| pending | confirmed | Auto hoặc cashier confirm | cashier, staff, manager |
| confirmed | preparing | Chef click nhận trên KDS | chef, staff |
| preparing | ready | All items qty_served = quantity (auto) | System |
| ready | delivered | Cashier confirm giao | cashier, staff |
| pending/confirmed/preparing | cancelled | SUM(qty_served)/SUM(quantity) < 30% | customer (own), cashier, manager |

---

## 5. State Machine — Vòng Đời Thanh Toán

```
                    ┌─────────┐
                    │         │
                    │ PENDING │  (chưa tạo payment record)
                    │         │
                    └────┬────┘
                         │  order.status = ready
                         ▼
                    ┌─────────────┐
                    │             │
                    │  INITIATED  │  (payment record tạo, chờ khách quét)
                    │             │
                    └──────┬──────┘
              ┌────────────┼───────────────┐
              │            │               │
         success      webhook fails    timeout (15p)
              │            │               │
              ▼            ▼               ▼
       ┌──────────┐  ┌──────────┐   ┌──────────┐
       │          │  │          │   │          │
       │COMPLETED │  │  FAILED  │   │  EXPIRED │
       │          │  │          │   │          │
       └──────────┘  └────┬─────┘   └────┬─────┘
                          │              │
                     Retry cho phép  order → pending
                     (tối đa 3 lần)  payment mới nếu cần
```

---

## 6. ERD Sơ Lược (High-Level)

```
┌──────────┐      ┌───────────┐      ┌────────────┐
│  staff   │      │   tables  │      │ categories │
│──────────│      │───────────│      │────────────│
│ id (PK)  │      │ id (PK)   │      │ id (PK)    │
│ username │      │ name      │      │ name       │
│ role     │      │ qr_token  │      │ sort_order │
│ is_active│      │ is_active │      └─────┬──────┘
└──────────┘      └─────┬─────┘            │ 1:N
                        │ 1:N              ▼
                        ▼           ┌────────────┐
                  ┌───────────┐     │  products  │
                  │  orders   │     │────────────│
                  │───────────│     │ id (PK)    │
                  │ id (PK)   │     │category_id │
                  │ table_id  │     │ name       │
                  │ status    │     │ price      │
                  │ total_amt │     │ is_available│
                  └──┬──────┬─┘     └─────┬──────┘
                  1:N│   1:1│             │ 1:N
                     ▼      ▼             ▼
               ┌──────────┐ ┌──────────┐ ┌─────────────┐
               │order_items│ │ payments │ │   toppings  │
               │──────────│ │──────────│ │   combos    │
               │ id (PK)  │ │ id (PK)  │ │   files     │
               │ order_id │ │ order_id │ └─────────────┘
               │product_id│ │ method   │
               │ quantity │ │ status   │
               │qty_served│ │gateway_  │
               └──────────┘ │ref       │
                            └──────────┘
```

> Chi tiết đầy đủ: [BanhCuon_DB_SCHEMA_SUMMARY.md](../task/BanhCuon_DB_SCHEMA_SUMMARY.md)

---

## 7. User Flow — Hành Trình Khách Hàng (QR)

```
[Khách vào quán, ngồi vào bàn]
           │
           ▼
   [Quét QR trên bàn]
           │
           ▼
   [Trang menu hiển thị]
   - Danh mục sản phẩm
   - Combos
   - Toppings
           │
           ▼
   [Chọn món, điều chỉnh số lượng]
           │
           ▼
   [Xem giỏ hàng, nhập ghi chú]
           │
           ▼
   [Xác nhận đặt món]
           │
           ▼
   [Trang theo dõi đơn - SSE realtime]
   - Item: pending → preparing → done
   - Order: pending → confirmed → preparing → ready
           │
           ▼
   [Nhận thông báo: "Món của bạn đã sẵn sàng"]
           │
           ▼
   [Cashier phục vụ + xử lý thanh toán]
           │
      ┌────┴────┐
      │  COD    │  QR Payment (VNPay/MoMo)
      │  Tiền   │  ────────────────────────
      │  mặt   │  Khách quét QR thanh toán
      │  thanh  │  → Webhook → order delivered
      │  toán   │
      └─────────┘
```

---

## 8. User Flow — Cashier (POS)

```
[Cashier mở POS /cashier]
           │
           ▼
   [Xem bảng điều khiển bàn]
   - Bàn trống (empty)
   - Bàn có đơn (màu + trạng thái)
   - Bàn cần thanh toán (ready)
           │
    ┌──────┴───────────┐
    │                  │
  [Bàn có khách     [Tạo đơn mới
   quét QR - tự]    thủ công]
    │                  │
    └──────┬───────────┘
           ▼
   [Xem chi tiết đơn]
   - Danh sách món
   - Trạng thái từng món (KDS)
   - Tổng tiền
           │
      [Thêm món nếu cần]
           │
           ▼
   [Order → READY]
   Cashier nhận thông báo
           │
           ▼
   [Xử lý thanh toán]
   - Tiền mặt: click "Đã nhận tiền"
   - QR: hiển thị mã QR payment
           │
           ▼
   [In hóa đơn nếu cần]
           │
           ▼
   [Order → DELIVERED - hoàn tất]
```

---

> 🍜 BanhCuon System · Diagrams v1.0 · Tháng 4/2026
