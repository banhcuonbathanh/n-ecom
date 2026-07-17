| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
MASTER.docx — Single Source of Truth
v1.2  ·  ECC-Free  ·  Next.js 14  ·  Go Gin  ·  MySQL 8.0  ·  Redis Stack  ·  Tháng 4/2026
Thay đổi từ v1.1: §4.1 +order_items status (Issue #5 Approach B) · §6.4 Guest Token (Issue #7) |
| --- |

| ℹ️ Hai thay đổi chính trong v1.2: (1) §4.1 document cách derive order_items status từ qty_served — KHÔNG dùng column riêng. (2) §6.4 định nghĩa Guest JWT stateless cho QR customer. Tất cả sections khác giữ nguyên từ v1.1. |
| --- |

# §4 — BUSINESS RULES
| ℹ️  SINGLE SOURCE. Mọi spec chỉ reference §4 — không copy business rule vào spec file. |
| --- |

## §4.1 — Order State Machine
| Happy Path:   pending → confirmed → preparing → ready → delivered |
| --- |
| Cancel Path:  pending / confirmed / preparing → cancelled  (nếu < 30%) |

| Transition | Từ | Sang | Điều Kiện | Role Được Phép |
| --- | --- | --- | --- | --- |
| Tạo đơn | — | pending | Không có order active cùng table | customer, cashier, staff |
| Xác nhận | pending | confirmed | Auto hoặc cashier confirm | cashier, staff, manager |
| Bắt đầu làm | confirmed | preparing | Bếp click nhận | chef, staff |
| Hoàn thành | preparing | ready | Tất cả items done | chef, staff |
| Giao xong | ready | delivered | Cashier confirm giao | cashier, staff |
| Huỷ đơn | pending/confirmed/preparing | cancelled | SUM(qty_served)/SUM(quantity) < 30% | customer (own), cashier, manager |

### §4.1.1 — order_items Status (Issue #5 — Approach B Resolved)
| ✅  DECISION: Approach B adopted. Không thêm migration 008. Status được DERIVE từ qty_served tại service/query layer — không có ENUM column riêng. |
| --- |

**Derive formula (áp dụng trong mọi nơi cần item status — BE service, FE TypeScript, KDS display):**

| // Go (service layer)
func itemStatus(qtyServed, quantity int32) string {
  switch {
  case qtyServed == 0:               return "pending"
  case qtyServed < quantity:          return "preparing"
  default:                            return "done"
  }
}

// TypeScript (FE)
const itemStatus = (qtyServed: number, quantity: number): ItemStatus => {
  if (qtyServed === 0)          return 'pending'
  if (qtyServed < quantity)     return 'preparing'
  return 'done'
}

// SQL — filter by status (NO column, use qty_served math)
-- pending items:    WHERE qty_served = 0
-- preparing items:  WHERE qty_served > 0 AND qty_served < quantity
-- done items:       WHERE qty_served = quantity |
| --- |

| Derived Status | Condition | KDS Color | Ghi Chú |
| --- | --- | --- | --- |
| pending | qty_served = 0 | #1F2937 (card bg) | Chưa bếp nhận |
| preparing | 0 < qty_served < quantity | #FCD34D (warning) | Đang làm một phần |
| done | qty_served = quantity | #3DB870 (success) | Hoàn thành |

| 🚨  QUAN TRỌNG: Tuyệt đối KHÔNG tạo column status trên order_items. Không tạo migration 008. Nếu cần query theo status, dùng điều kiện qty_served như bảng SQL trên. Index composite (order_id, qty_served, quantity) đã đủ performant. |
| --- |

## §4.2 — Cancel Rule
**📐  Formula: cancel_allowed = SUM(qty_served) / SUM(quantity) < 0.30**

❌  Từ chối: Nếu >= 30% món đã được làm xong → không được huỷ
✅  Hoàn tiền: Cancel thành công → trigger payment refund nếu đã thanh toán

## §4.3 — Payment Rules
| Rule | Chi Tiết |
| --- | --- |
| Thời điểm tạo payment | Chỉ tạo payment record khi order.status = ready (hoặc delivered) |
| 4 phương thức | VNPay QR │ MoMo QR │ ZaloPay QR │ Tiền mặt COD |
| Gateway ref | Lưu gateway_ref từ VNPay/MoMo/ZaloPay để đối soát |
| Webhook | Mỗi gateway có webhook endpoint riêng — verify signature trước khi update |
| Idempotency | Duplicate webhook → check payment_status trước khi update — không update 2 lần |
| Tiền mặt | Cashier xác nhận thủ công — không có webhook |

## §4.4 — Inventory Rules (Phase 2)
⏰  Deduct timing: Trừ kho khi order_item.qty_served tăng (chef confirm từng món)
⚠️  Low stock alert: Alert khi quantity <= reorder_point
🚫  Out of stock: Tự động set product.is_available = false khi hết nguyên liệu chính

## §4.5 — One Active Order Rule
**📏  Rule: 1 table tối đa 1 order với status IN (pending, confirmed, preparing, ready)**
✅  Check: Trước khi tạo order mới: query xem table có active order không → reject nếu có
💡  Note: delivered và cancelled không tính là active

# §6 — AUTH & JWT CONFIG
## §6.1 — Token Config
| Token | TTL | Storage | Ghi Chú |
| --- | --- | --- | --- |
| Access Token (Staff) | 24 giờ | Memory (Zustand) — KHÔNG localStorage | Gửi trong Authorization: Bearer header |
| Refresh Token (Staff) | 30 ngày | httpOnly cookie | Tự động gửi — không accessible từ JS |
| Guest JWT (Customer) | 2 giờ | Memory (Zustand) — KHÔNG localStorage | Stateless — không lưu DB, không refresh |
| Redis blacklist | TTL = remaining access TTL | Redis SET logout:{jti} | Logout → add jti vào blacklist |

## §6.2 — JWT Payload (Staff)
| sub   staff_id  : UUID của staff
role  role      : customer | chef | cashier | staff | manager | admin
jti   token ID  : UUID — dùng cho blacklist khi logout
exp   unix ts   : Access: now+24h  │  Refresh: now+30d |
| --- |

## §6.3 — FE Interceptor Pattern
1  Request: Attach access token vào mọi request
2  401 response: Interceptor tự động call /auth/refresh
3  Refresh thành công: Lưu access token mới, retry original request
4  Refresh thất bại: Clear token, redirect về /login
❌  KHÔNG: Dùng localStorage cho access token — XSS risk

## §6.4 — Guest Token (Issue #7 Resolved — QR Customer Auth)
| ✅  DECISION: Stateless short-lived JWT — không lưu vào refresh_tokens hoặc bất kỳ DB table nào. Guest token chỉ dùng cho QR customers tại bàn. |
| --- |

### Guest JWT Payload
| {
  "sub":      "guest",           // fixed string — NOT a staff UUID
  "role":     "customer",         // RBAC: customer permissions only
  "table_id": "<table UUID>",    // which table this guest is at
  "jti":      "<UUID>",           // unique per token
  "exp":      now + 7200           // 2 hours TTL
} |
| --- |

### Guest Auth Flow
| Bước | Action | Output |
| --- | --- | --- |
| 1 | Customer quét QR → GET /api/v1/tables/qr/:token | table info confirmed |
| 2 | FE gọi POST /api/v1/auth/guest với { qr_token } | { access_token: <guest JWT> } |
| 3 | FE lưu guest JWT vào Zustand (memory only) | — |
| 4 | FE dùng guest JWT để POST /orders với table_id từ JWT payload | order created |
| 5 | Hết 2h → JWT expire → customer quét lại QR | new guest JWT |

### Guest Token Rules
| Rule | Chi Tiết |
| --- | --- |
| Không lưu DB | Stateless hoàn toàn — BE chỉ sign và verify, không query refresh_tokens |
| Không có refresh | Không có /auth/refresh cho guest. Hết hạn → scan QR lại |
| Rate limit QR endpoint | 10 req/min per IP trên GET /tables/qr/:token — ngăn brute-force |
| Rate limit guest auth | 5 req/min per IP trên POST /auth/guest |
| Scope hạn chế | Guest JWT chỉ cho phép: POST /orders (table_id phải match), GET /orders/:id (own only) |
| Không cần blacklist | Token stateless + TTL ngắn → logout không cần thiết |
| RBAC middleware | Kiểm tra role = 'customer' + sub = 'guest' để phân biệt với staff customer role |

| ⚠️  QUAN TRỌNG: Middleware phải phân biệt 'guest customer' (sub='guest', có table_id) vs 'staff customer' (sub=UUID staff). POST /orders phải validate table_id trong JWT match table_id trong request body khi source='qr'. |
| --- |

| 🍜  BanhCuon System  ·  MASTER.docx  ·  v1.2  ·  ECC-Free  ·  Tháng 4/2026  ·  Issue #5 (Approach B) + Issue #7 (Guest JWT) RESOLVED |
| --- |
