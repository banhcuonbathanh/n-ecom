| 📋
HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
SPEC 4 — Orders API (Backend)
Model: Sonnet · Branch: feat/4-orders-api · Phụ thuộc: specs/2.md + specs/1.md
Go Gin · sqlc · WebSocket · SSE · Redis Pub/Sub |
| --- |

| ℹ️  Orders API — State machine, combo expand, SSE cho customer tracking, WebSocket cho KDS và live orders. Core business logic của toàn hệ thống. |
| --- |

**Model:** Sonnet | **Branch:** `feat/4-orders-api` | **Phụ thuộc:** `specs/2.md` (Products) + `specs/1.md` (Auth)

**1. Mục Tiêu**
Xây dựng Orders API đầy đủ: tạo đơn, cập nhật trạng thái, theo dõi realtime qua SSE và WebSocket.
Đây là core business logic của hệ thống — KDS, POS, và order tracking đều phụ thuộc spec này.

**2. Phạm Vi**
| Phần | Nội Dung |
| --- | --- |
| Backend | CRUD orders, state machine, SSE stream cho customer, WS broadcast cho KDS |
| Frontend dùng | /order/[id] SSE (spec 3), /kitchen WS, /cashier POS, /orders/live WS |
| Không thuộc spec này | Payment processing (spec 5), Inventory deduction (gọi inventory service khi item done) |

**3. Database Schema**
| orders ( |
| --- |
| id               INT PK AUTO_INCREMENT, |
| table_id         VARCHAR(20),              -- null nếu order online |
| customer_name    VARCHAR(100) NOT NULL, |
| customer_phone   VARCHAR(20) NOT NULL, |
| status           ENUM('pending','confirmed','preparing','ready','delivered','cancelled') DEFAULT 'pending', |
| payment_method   ENUM('vnpay','momo','zalopay','cod') NOT NULL, |
| total_amount     DECIMAL(12,0) NOT NULL, |
| note             TEXT, |
| created_by_role  ENUM('customer','cashier','staff') NOT NULL, |
| staff_id         INT REFERENCES staff(id),  -- null nếu customer tự đặt |
| created_at       DATETIME DEFAULT NOW(), |
| updated_at       DATETIME DEFAULT NOW() ON UPDATE NOW() |
| ) |
|  |
| order_items ( |
| id               INT PK AUTO_INCREMENT, |
| order_id         INT NOT NULL REFERENCES orders(id), |
| product_id       INT REFERENCES products(id),   -- null nếu là combo item |
| combo_id         INT REFERENCES combos(id),     -- null nếu là product |
| combo_ref_id     INT REFERENCES order_items(id), -- null nếu là parent combo row |
| name             VARCHAR(200) NOT NULL,          -- snapshot tên tại thời điểm order |
| quantity         INT NOT NULL DEFAULT 1, |
| qty_served       INT NOT NULL DEFAULT 0, |
| unit_price       DECIMAL(10,0) NOT NULL,         -- snapshot giá |
| topping_snapshot JSON,                           -- snapshot toppings đã chọn |
| status           ENUM('pending','preparing','done') DEFAULT 'pending', |
| flagged          BOOLEAN DEFAULT false,           -- 🚩 flag từ bếp |
| created_at       DATETIME DEFAULT NOW() |
| ) |

| ℹ️  **Combo expand logic:** Khi order 1 Combo Gia Đình → tạo 1 row combo parent + N rows sub-items (product_id của từng món, `combo_ref_id` trỏ về combo row). Kitchen thấy từng sub-item riêng lẻ để track qty_served chính xác. |
| --- |

**4. Order State Machine**
| pending → confirmed → preparing → ready → delivered |
| --- |
| ↘ cancelled  (chỉ khi SUM(qty_served) / SUM(quantity) < 30%) |

| Transition | Who | Điều kiện |
| --- | --- | --- |
| pending → confirmed | Cashier/Staff/Manager | Manual confirm hoặc auto sau 30s |
| confirmed → preparing | Auto | Khi Chef click item đầu tiên |
| preparing → ready | Auto | Khi tất cả items đều done |
| ready → delivered | Cashier/Staff | Sau khi thanh toán xong (spec 5) |
| any → cancelled | Customer/Cashier | SUM(qty_served)/SUM(quantity) < 0.30 |

**5. API Endpoints**
**5.1 Orders CRUD**
| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| POST | /api/v1/orders | Customer/Cashier+ | Tạo đơn mới |
| GET | /api/v1/orders | Cashier+ | Danh sách orders (filter by status, date) |
| GET | /api/v1/orders/:id | Auth | Lấy chi tiết đơn (customer chỉ xem của mình) |
| PATCH | /api/v1/orders/:id/status | Cashier+ | Update order status |
| DELETE | /api/v1/orders/:id | Customer/Cashier+ | Huỷ đơn (< 30% done) |

**5.2 Order Items**
| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| POST | /api/v1/orders/:id/items | Customer/Cashier+ | Thêm món vào đơn đang active |
| PATCH | /api/v1/orders/:id/items/:itemId/status | Chef+ | Cycle status (KDS click) |
| PATCH | /api/v1/orders/:id/items/:itemId/flag | Chef+ | Toggle flag 🚩 |

**5.2.1 POST /api/v1/orders/:id/items — Thêm Món Vào Đơn Active**

**Auth:** Customer (chỉ đơn của mình) · Cashier/Staff/Manager (bất kỳ đơn active)
**Mô tả:** Thêm 1 hoặc nhiều món/combo vào đơn đang trong trạng thái `pending`, `confirmed`, hoặc `preparing`. Không tạo đơn mới — giữ nguyên 1-table-1-active-order rule.

**Request Body:**
```json
{
  "items": [
    {
      "product_id": "uuid",
      "combo_id": null,
      "quantity": 2,
      "unit_price": 55000,
      "topping_snapshot": [
        { "id": "uuid", "name": "Chả lụa", "price_delta": 10000 }
      ]
    },
    {
      "product_id": null,
      "combo_id": "uuid",
      "quantity": 1,
      "unit_price": 180000,
      "topping_snapshot": null
    }
  ]
}
```

**Validation:**
- `items` không được rỗng
- Mỗi item: `product_id` hoặc `combo_id` phải có 1 (không được cả 2 null, không được cả 2 set)
- `quantity > 0`
- `unit_price > 0`

**Status Guard (kiểm tra trước khi insert):**
- Chỉ cho phép thêm khi `order.status ∈ {pending, confirmed, preparing}`
- Nếu `order.status ∈ {ready, delivered, cancelled}` → trả **409** `ORDER_NOT_EDITABLE`

**Ownership Check:**
- Role `customer`: JWT `sub` phải match `order.guest_token` → **403** `FORBIDDEN` nếu không match
- Role `cashier`/`staff`/`manager`/`admin`: không cần kiểm tra ownership

**Response 200:**
```json
{
  "order_id": "uuid",
  "added_items_count": 3,
  "new_total_amount": 345000
}
```
> `added_items_count` = tổng số order_item rows được INSERT (combo expand ra N sub-items + 1 header → đếm tất cả)

**Error Codes:**
| HTTP | Code | Khi nào |
| --- | --- | --- |
| 404 | `ORDER_NOT_FOUND` | Order `:id` không tồn tại |
| 403 | `FORBIDDEN` | Customer thêm vào đơn của người khác |
| 409 | `ORDER_NOT_EDITABLE` | Order status ∈ {ready, delivered, cancelled} |
| 400 | validation error | items rỗng, hoặc item thiếu product_id/combo_id, quantity/unit_price ≤ 0 |

**Business Rules (theo thứ tự, trong 1 DB transaction):**
1. Fetch order → 404 `ORDER_NOT_FOUND` nếu không có
2. Ownership check (chỉ với role customer) → 403 `FORBIDDEN`
3. Status guard → 409 `ORDER_NOT_EDITABLE`
4. Với mỗi item có `combo_id`: expand combo (giống §6 Combo expand logic — tạo 1 header row + N sub-item rows với `combo_ref_id`)
5. INSERT tất cả order_item rows trong cùng 1 transaction — rollback nếu bất kỳ fail
6. Recalculate `total_amount = SUM(unit_price × quantity)` trên toàn bộ order_items → `UPDATE orders SET total_amount = ...`
7. Publish SSE event `items_added` lên Redis channel `order:{id}` (customer tracking page nhận realtime)
8. Broadcast WS event `items_added` lên `/ws/kitchen` (KDS nhận ngay — chỉ sub-items, ẩn combo header)
9. Broadcast WS event `items_added` lên `/ws/orders-live` (cashier live grid cập nhật total)

**SSE Event — Customer Tracking (`order:{id}` channel):**
```json
{
  "event": "items_added",
  "data": {
    "order_id": "uuid",
    "added_items": [
      {
        "id": "uuid",
        "name": "Bánh Cuốn Tôm",
        "quantity": 2,
        "qty_served": 0,
        "unit_price": 55000,
        "derived_status": "pending",
        "combo_id": null,
        "combo_ref_id": null,
        "topping_snapshot": [{ "name": "Chả lụa", "price_delta": 10000 }]
      }
    ],
    "new_total_amount": 345000
  }
}
```
> Gửi tất cả rows (kể cả combo header) — FE tự lọc theo display rules (§6 combo display)

**WS Event — KDS (`/ws/kitchen`):**
```json
{
  "event": "items_added",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-20260509-001",
    "table_id": "uuid",
    "added_items": [
      {
        "id": "uuid",
        "name": "Bánh Cuốn Tôm",
        "quantity": 2,
        "qty_served": 0,
        "note": null,
        "topping_snapshot": []
      }
    ]
  }
}
```
> KDS chỉ nhận sub-items (combo header rows bị lọc — `combo_ref_id IS NOT NULL` hoặc không phải combo). Giữ nhất quán với `new_order` event.

**WS Event — Orders Live (`/ws/orders-live`):**
```json
{
  "event": "items_added",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-20260509-001",
    "added_items_count": 3,
    "new_total_amount": 345000
  }
}
```

**Acceptance Criteria:**
- [ ] POST /orders/:id/items với đơn `pending/confirmed/preparing` → 200 + items inserted vào DB
- [ ] Combo trong request → expand thành header + sub-items (giống POST /orders logic)
- [ ] `total_amount` được recalculate đúng sau khi append
- [ ] Order status `ready/delivered/cancelled` → 409 `ORDER_NOT_EDITABLE`
- [ ] Customer gọi với order của người khác → 403 `FORBIDDEN`
- [ ] `items` rỗng → 400 validation error
- [ ] SSE event `items_added` được push tới customer tracking page ngay sau insert
- [ ] WS event `items_added` được broadcast tới KDS (sub-items only, không có combo header)
- [ ] WS event `items_added` được broadcast tới orders-live (summary: count + new_total)
- [ ] 1-table-1-active-order rule không thay đổi — endpoint chỉ append, không tạo order mới

**5.3 Real-time**
| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| GET | /api/v1/orders/:id/sse | Auth | SSE stream cho customer order tracking |
| WS | /api/v1/ws/kitchen | Chef+ | WebSocket: tất cả orders mới + item updates |
| WS | /api/v1/ws/orders-live | Cashier+ | WebSocket: orders live grid |

**6. Request / Response**
**POST /orders**
| // Request — Customer (guest token) hoặc Cashier |
| --- |
| { |
| "customer_name": "Nguyễn Văn A", |
| "customer_phone": "0901234567", |
| "note": "Ít cay", |
| "payment_method": "cod", |
| "table_id": "A3",          // null nếu order online |
| "items": [ |
| { |
| "product_id": 1, |
| "combo_id": null, |
| "quantity": 2, |
| "unit_price": 55000,   // base_price + topping delta — FE tính |
| "topping_snapshot": [ |
| { "id": 1, "name": "Chả lụa", "price_delta": 10000 } |
| ] |
| }, |
| { |
| "product_id": null, |
| "combo_id": 1, |
| "quantity": 1, |
| "unit_price": 180000, |
| "topping_snapshot": null |
| } |
| ] |
| } |
|  |
| // Response 201 |
| { |
| "id": 1234, |
| "status": "pending", |
| "total_amount": 290000, |
| "created_at": "2026-04-09T14:30:00Z" |
| } |

**Validation**
- Cart không được rỗng
- product_id hoặc combo_id phải có 1 (không được cả 2 null)
- unit_price > 0
- table_id nếu có: 1 bàn ĐƯỢC PHÉP có nhiều order active đồng thời (khách mới ngồi vào khi order của khách trước chưa xong) → mỗi khách theo dõi ĐƠN CỦA RIÊNG MÌNH. Create KHÔNG chặn; trả `data.table_busy=true` (chỉ để hiện thông báo ngắn "phục vụ sau"), KHÔNG còn 409 `TABLE_HAS_ACTIVE_ORDER`.
**Combo expand (trong transaction)**
| // Khi item có combo_id: |
| --- |
| // 1. Query combo_items từ DB |
| // 2. Tạo 1 order_item row cho combo (combo_id set, product_id null) |
| // 3. Tạo N sub-item rows (product_id của mỗi món, combo_ref_id = combo_item.id) |
| // 4. Kitchen sẽ thấy sub-items; customer tracking thấy cả 2 |
| //    |
| // FE display rules for combo rows: |
| //   - KDS (/kitchen): chỉ hiển thị sub-items (combo_ref_id IS NOT NULL). Ẩn header rows. |
| //   - Customer tracking (/order/[id]): hiển thị header row làm label nhóm (e.g. "Combo Gia Đình"), |
| //     sub-items indented bên dưới. |
| //   Phân biệt: header row = (combo_id IS NOT NULL AND combo_ref_id IS NULL) |
| //              sub-item  = (combo_ref_id IS NOT NULL) |

**GET /orders/:id**
| // Response 200 |
| --- |
| { |
| "id": 1234, |
| "status": "preparing", |
| "table_id": "A3", |
| "customer_name": "Nguyễn Văn A", |
| "customer_phone": "0901234567", |
| "payment_method": "cod", |
| "total_amount": 290000, |
| "note": "Ít cay", |
| "created_at": "2026-04-09T14:30:00Z", |
| "items": [ |
| { |
| "id": 1, |
| "product_id": 1, |
| "name": "Bánh Cuốn Thịt", |
| "quantity": 2, |
| "qty_served": 1, |
| "unit_price": 55000, |
| "status": "preparing", |
| "topping_snapshot": [...], |
| "flagged": false, |
| "combo_ref_id": null |
| } |
| ] |
| } |

**PATCH /orders/:id/items/:itemId/status**
| // Request — Chef click KDS |
| --- |
| // Không cần body — server tự cycle: pending → preparing → done |
| {} |
|  |
| // Response 200 |
| { |
| "item_id": 1, |
| "new_status": "done", |
| "qty_served": 2, |
| "order_status": "ready"   // nếu tất cả items done |
| } |
|  |
| // Side effects: |
| // 1. Update item status trong DB (transaction) |
| // 2. Trigger inventory deduction nếu status → done (gọi inventory service) |
| // 3. Nếu tất cả items done → auto update order.status = "ready" |
| // 4. Broadcast SSE event "item_progress" tới customer |
| // 5. Broadcast WS event tới /ws/kitchen và /ws/orders-live |

| ℹ️  **Inventory rollback:** Nếu inventory deduction thất bại → rollback cả transaction, trả **409** (không phải 500) cho KDS. KDS hiện toast "Hết nguyên liệu, không thể cập nhật". |
| --- |

**7. SSE Implementation (Go)**
| // GET /api/v1/orders/:id/sse |
| --- |
| func (h *OrderHandler) StreamOrderSSE(c *gin.Context) { |
| orderID := c.Param("id") |
|  |
| c.Header("Content-Type", "text/event-stream") |
| c.Header("Cache-Control", "no-cache") |
| c.Header("Connection", "keep-alive") |
|  |
| // Subscribe Redis Pub/Sub channel: "order:{orderID}" |
| sub := h.redis.Subscribe(ctx, fmt.Sprintf("order:%s", orderID)) |
| defer sub.Close() |
|  |
| // Send initial state |
| order := h.service.GetOrder(orderID) |
| sendSSEEvent(c, "order_init", order) |
|  |
| // Stream events |
| for msg := range sub.Channel() { |
| sendSSEEvent(c, msg.Type, msg.Payload) |
| if msg.Type == "order_completed" { return } |
| } |
| } |
|  |
| // Event types published to Redis channel "order:{orderID}": |
| // |
| // order_init — gửi ngay khi client kết nối (full order snapshot): |
| // { |
| //   "event": "order_init", |
| //   "data": { |
| //     "id": "uuid", "order_number": "ORD-20260509-001", |
| //     "status": "pending", "table_id": "uuid", |
| //     "customer_name": "Nguyễn Văn A", "total_amount": 290000, |
| //     "items": [ |
| //       { "id": "uuid", "name": "Bánh Cuốn Thịt", "quantity": 2, |
| //         "qty_served": 0, "unit_price": 55000, |
| //         "derived_status": "pending",   // derived: 0=pending, 0<x<qty=preparing, x=qty=done |
| //         "combo_id": null, "combo_ref_id": null, |
| //         "toppings_snapshot": [{"name": "Chả lụa", "price": 10000}] } |
| //     ] |
| //   } |
| // } |
| // |
| // order_status_changed — khi order.status thay đổi: |
| // { "event": "order_status_changed", "data": { "order_id": "uuid", "status": "preparing" } } |
| // |
| // item_progress — khi Chef cập nhật qty_served: |
| // { |
| //   "event": "item_progress", |
| //   "data": { |
| //     "order_id": "uuid", "item_id": "uuid", |
| //     "qty_served": 1, "quantity": 2, |
| //     "derived_status": "preparing" |
| //   } |
| // } |
| // |
| // order_completed — khi tất cả items done → order auto-ready: |
| // { "event": "order_completed", "data": { "order_id": "uuid" } } |

**8. WebSocket (Go)**
| // WS /api/v1/ws/kitchen |
| --- |
| // Hub pattern: 1 goroutine per connection |
| // |
| // new_order — khi order mới được tạo (Chef/KDS nhận ngay): |
| // { |
| //   "event": "new_order", |
| //   "data": { |
| //     "order_id": "uuid", "order_number": "ORD-20260509-001", |
| //     "table_id": "uuid", "source": "qr", |
| //     "items": [  // chỉ sub-items (combo header rows bị lọc) |
| //       { "id": "uuid", "name": "Bánh Cuốn Thịt", "quantity": 2, |
| //         "qty_served": 0, "unit_price": 55000, |
| //         "note": null, "toppings_snapshot": [...] } |
| //     ], |
| //     "created_at": "2026-05-09T10:00:00Z" |
| //   } |
| // } |
| // |
| // item_updated — khi Chef cập nhật qty_served qua KDS click: |
| // { |
| //   "event": "item_updated", |
| //   "data": { |
| //     "order_id": "uuid", "item_id": "uuid", |
| //     "qty_served": 1, "quantity": 2, |
| //     "derived_status": "preparing" |
| //   } |
| // } |
| // |
| // order_cancelled — khi order bị huỷ: |
| // { |
| //   "event": "order_cancelled", |
| //   "data": { "order_id": "uuid", "order_number": "ORD-20260509-001", "table_id": "uuid" } |
| // } |
|  |
| // WS /api/v1/ws/orders-live |
| // |
| // order_created — summary khi order mới tạo: |
| // { |
| //   "event": "order_created", |
| //   "data": { |
| //     "id": "uuid", "order_number": "ORD-20260509-001", |
| //     "table_id": "uuid", "status": "pending", |
| //     "source": "qr", "total_amount": 290000, |
| //     "created_at": "2026-05-09T10:00:00Z" |
| //   } |
| // } |
| // |
| // order_status_changed — khi order.status thay đổi: |
| // { "event": "order_status_changed", "data": { "order_id": "uuid", "status": "preparing" } } |
| // |
| // item_progress — khi qty_served thay đổi: |
| // { |
| //   "event": "item_progress", |
| //   "data": { "order_id": "uuid", "item_id": "uuid", "qty_served": 1, "quantity": 2 } |
| // } |
|  |
| // Low-stock broadcast (Manager/Admin only): |
| // Chỉ gửi tới client có role manager hoặc admin |
| // { |
| //   "event": "low_stock", |
| //   "data": { |
| //     "item_id": "uuid", "item_name": "Bột gạo", |
| //     "current_stock": 0.5, "min_stock": 2.0, "unit": "kg" |
| //   }                                                          |
| // }                                                            |
| // ⚠️  Field là min_stock — match DB column ingredients.min_stock (009_ingredients.sql) |

**9. Business Rules Quan Trọng**
| Rule | Xử lý |
| --- | --- |
| 1 bàn nhiều đơn active | Cho phép — mỗi khách 1 đơn riêng. Create trả `table_busy` (thông báo), KHÔNG chặn |
| Chỉ tạo Payment khi ready | Check trong Payment handler (spec 5) |
| Huỷ < 30% | DELETE /orders/:id kiểm tra: SUM(qty_served)/SUM(quantity) < 0.30 → 409 nếu không |
| Customer chỉ xem đơn của mình | GET /orders/:id: kiểm tra JWT sub match với order's guest token |
| Inventory deduction khi item done | Gọi inventory service trong same transaction — rollback → 409 |
| Combo expand trong transaction | Tất cả rows tạo trong 1 DB transaction — rollback nếu bất kỳ fail |

**10. File Structure**
| Backend: |
| --- |
| internal/ |
| orders/ |
| handler.go          // HTTP + SSE + WS handlers |
| service.go          // Business logic, state machine |
| hub.go              // WebSocket hub (goroutine-safe) |
| repository/ |
| orders_queries.sql  // sqlc SQL |
| orders.go           // sqlc generated |

**11. Acceptance Criteria**
- [ ] POST /orders tạo đúng order_items (kể cả combo expand)
- [ ] 1 bàn nhiều active order — create thành công + trả `table_busy=true`
- [ ] State machine đúng thứ tự — không skip
- [ ] Chef click KDS → status cycle → SSE push tới customer
- [ ] Inventory deduction thất bại → rollback → 409 (không 500)

---

## 12. Multi-Table Group (Option A — Linked Orders)

> **Schema:** `orders.group_id CHAR(36) NULL` — xem migration 008. Mỗi bàn giữ order riêng; share `group_id` để hiển thị tổng hợp cho khách và cashier.

### 12.1 Group API Endpoints

| Method | Path | Role | Mô Tả |
|---|---|---|---|
| POST | /api/v1/orders/group | Cashier+ | Tạo group: link 2+ orders lại |
| GET | /api/v1/orders/group/:groupId | Auth* | Xem toàn bộ orders trong group (combined view) |
| POST | /api/v1/orders/group/:groupId/orders | Cashier+ | Thêm order vào group đã có |
| DELETE | /api/v1/orders/group/:groupId/orders/:orderId | Cashier+ | Gỡ 1 order khỏi group (set group_id=NULL) |
| DELETE | /api/v1/orders/group/:groupId | Manager+ | Giải tán toàn bộ group |

> *Auth: Guest token hợp lệ nếu order của họ thuộc group — BE kiểm tra `orders.group_id` match.

---

### 12.2 POST /api/v1/orders/group — Tạo Group

**Auth:** Cashier+ | **Mô tả:** Cashier chọn 2+ bàn đang có active order → link lại thành 1 group.

**Request Body:**
```json
{ "order_ids": ["uuid-ban-05", "uuid-ban-07"] }
```

**Validation:**
- Tất cả `order_ids` phải tồn tại và `status IN (pending, confirmed, preparing, ready)`
- Không order nào đã thuộc group khác (`group_id IS NOT NULL`) — phải gỡ khỏi group cũ trước
- Tối thiểu 2 orders

**Response 201:**
```json
{
  "group_id": "new-uuid",
  "tables": ["Bàn 05", "Bàn 07"],
  "order_count": 2,
  "total_amount": 180000,
  "orders": [
    { "id": "uuid", "order_number": "ORD-20260429-001", "table_name": "Bàn 05", "total_amount": 95000 },
    { "id": "uuid", "order_number": "ORD-20260429-002", "table_name": "Bàn 07", "total_amount": 85000 }
  ]
}
```

**Side effects:** Publish Redis event `group:{groupId}` → `group_created` → tất cả SSE subscribers nhận cập nhật.

---

### 12.3 GET /api/v1/orders/group/:groupId — Combined View cho Khách

**Auth:** Cashier+ hoặc Guest có order trong group
**Mô tả:** Trả về toàn bộ thông tin của nhóm — đây là endpoint khách hàng dùng để xem tổng hợp.

**Response 200:**
```json
{
  "group_id": "uuid",
  "tables": ["Bàn 05", "Bàn 07"],
  "combined_status": "preparing",
  "total_amount": 180000,
  "orders": [
    {
      "id": "uuid",
      "order_number": "ORD-20260429-001",
      "table_name": "Bàn 05",
      "status": "preparing",
      "total_amount": 95000,
      "items": [
        {
          "id": "uuid",
          "name": "Bánh Cuốn Thịt",
          "quantity": 2,
          "qty_served": 1,
          "derived_status": "preparing",
          "topping_snapshot": [{ "name": "Chả lụa", "price": 10000 }],
          "note": "Ít mắm"
        }
      ]
    },
    {
      "id": "uuid",
      "order_number": "ORD-20260429-002",
      "table_name": "Bàn 07",
      "status": "confirmed",
      "total_amount": 85000,
      "items": [
        {
          "id": "uuid",
          "name": "Bánh Cuốn Tôm",
          "quantity": 3,
          "qty_served": 0,
          "derived_status": "pending",
          "topping_snapshot": null,
          "note": ""
        }
      ]
    }
  ]
}
```

**`combined_status` logic:**
| Điều Kiện | combined_status |
|---|---|
| Tất cả orders = delivered | `delivered` |
| Bất kỳ order = preparing | `preparing` |
| Bất kỳ order = confirmed | `confirmed` |
| Tất cả orders = pending | `pending` |
| Bất kỳ order = ready | `ready` |

---

### 12.4 GET /api/v1/orders/group/:groupId/events — Group SSE

**Auth:** Cashier+ hoặc Guest có order trong group
**Mô tả:** SSE stream tổng hợp — subscribe tới Redis channel của TẤT CẢ orders trong group.

```go
// GET /api/v1/orders/group/:groupId/events
func (h *OrderHandler) StreamGroupSSE(c *gin.Context) {
    groupID := c.Param("groupId")

    // Lấy tất cả orders trong group
    orders := h.service.GetOrdersByGroupID(ctx, groupID)
    channels := make([]string, len(orders))
    for i, o := range orders {
        channels[i] = fmt.Sprintf("order:%s", o.ID)
    }

    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    c.Header("X-Accel-Buffering", "no")

    // Subscribe tới tất cả channels cùng lúc
    sub := h.redis.Subscribe(ctx, channels...)
    defer sub.Close()

    // Initial state: gửi full group snapshot
    group := h.service.GetGroup(ctx, groupID)
    sendSSEEvent(c, "group_init", group)

    for msg := range sub.Channel() {
        // Re-fetch group state sau mỗi event để có combined_status mới nhất
        group := h.service.GetGroup(ctx, groupID)
        sendSSEEvent(c, msg.Type, group)
    }
}
```

**Event types:**
| Event | Khi Nào | Payload |
|---|---|---|
| `group_init` | Kết nối lần đầu | Full group object (§12.3 response) |
| `item_progress` | Chef cập nhật qty_served | Full group object (client re-render) |
| `order_status_changed` | Bất kỳ order đổi status | Full group object |
| `group_updated` | Thêm/bớt order khỏi group | Full group object |

> **FE behavior:** Khi khách hàng mở trang theo dõi đơn và `order.group_id != null`, FE subscribe vào `/orders/group/:groupId/events` thay vì (hoặc đồng thời với) `/orders/:id/events`. Hiển thị tất cả bàn trong group với label "Bàn 05", "Bàn 07".

---

### 12.5 Payment cho Group

| Tình Huống | Flow |
|---|---|
| **Thanh toán chung** (1 bill toàn nhóm) | Cashier chọn "Thanh toán nhóm" → `POST /payments/group/:groupId` → BE tạo payment cho từng order → tổng = SUM(total_amount) |
| **Thanh toán riêng** (mỗi bàn 1 bill) | Cashier xử lý từng order độc lập qua `POST /payments` như bình thường |

```
POST /api/v1/payments/group/:groupId
Auth: Cashier+
Body: { "method": "cash" | "vnpay" | "momo" | "zalopay" }

Validation:
- Tất cả orders trong group phải có status = ready
- Không order nào đã có payment completed

Response 201:
{
  "group_id": "uuid",
  "payments": [
    { "order_id": "uuid", "payment_id": "uuid", "amount": 95000 },
    { "order_id": "uuid", "payment_id": "uuid", "amount": 85000 }
  ],
  "total": 180000
}
```

---

### 12.6 Business Rules — Group

| Mã | Rule |
|---|---|
| GRP-001 | 1 order chỉ thuộc 1 group tại 1 thời điểm |
| GRP-002 | Chỉ Cashier+ tạo/sửa group — customer chỉ được xem |
| GRP-003 | Group không ảnh hưởng 1-table-1-active rule — mỗi bàn vẫn có tối đa 1 active order |
| GRP-004 | Cancel order trong group: thực hiện trên từng order riêng — không cascade sang order khác |
| GRP-005 | Khi tất cả orders trong group = delivered → group tự giải tán (group_id vẫn giữ trong DB để audit) |
| GRP-006 | Kitchen (KDS) không thay đổi — vẫn hiển thị theo từng order/bàn riêng |

---

### 12.7 Acceptance Criteria — Group

| # | Kịch Bản | Kết Quả Mong Đợi |
|---|---|---|
| AC-G1 | Cashier link Bàn 05 + Bàn 07 | group_id được set trên cả 2 orders |
| AC-G2 | Khách Bàn 05 mở order tracking | Thấy items của cả Bàn 05 và Bàn 07, labeled rõ ràng |
| AC-G3 | Chef done item ở Bàn 07 | SSE group_events push tới khách Bàn 05 và Bàn 07 |
| AC-G4 | Cashier thêm Bàn 09 vào group | Group có 3 orders, SSE notifies tất cả subscribers |
| AC-G5 | Cashier tách Bàn 07 khỏi group | Bàn 07 group_id = NULL, không còn thấy trong group view |
| AC-G6 | POST /orders/group với order đã có group_id | 409 ORDER_ALREADY_GROUPED |
| AC-G7 | Guest token Bàn 05 gọi GET /orders/group/:groupId | 200 — thấy toàn bộ group. Guest Bàn 11 (không trong group) gọi → 403 |
| AC-G8 | Thanh toán chung cả nhóm khi 1 order chưa ready | 422 GROUP_NOT_ALL_READY |
- [ ] Huỷ đơn < 30% → success; ≥ 30% → 409
- [ ] Customer không xem được đơn của người khác
- [ ] WS Kitchen nhận new_order ngay khi tạo
- [ ] SSE reconnect phía client (spec 3) hoạt động bình thường

🍜 BanhCuon System · SPEC 4 — Orders API (Backend) · ECC-Free · Tháng 4 / 2026