| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
SYSTEM DESCRIPTION — Mô Tả Hệ Thống
v1.0  ·  Dành cho AI & Developer  ·  Go Gin · Next.js 14 · MySQL 8.0 · Redis Stack  ·  Tháng 4/2026 |
| --- |

| ℹ️  Tài liệu này mô tả đầy đủ kiến trúc, luồng nghiệp vụ, và convention của hệ thống — đủ để bất kỳ AI hoặc dev nào implement từng task mà không cần đọc thêm tài liệu khác. |
| --- |

| Section 1 — Tổng Quan Kiến Trúc |
| --- |

| Layer | Technology | Ghi Chú |
| --- | --- | --- |
| Frontend | Next.js 14 App Router · TypeScript · Tailwind · Zustand | SSR + client state |
| Backend | Go 1.22 · Gin · sqlc · database/sql | High-performance REST + WebSocket |
| Database | MySQL 8.0 + Redis Stack 7 (Bloom filter) | Relational + cache + pub/sub |
| Realtime | WebSocket (Go channels) + SSE (Redis Pub/Sub) | KDS bếp + Order tracking |
| Auth | JWT Access 24h + Refresh 30d httpOnly + RBAC 6 roles |  |
| Payment | VNPay · MoMo · ZaloPay QR + Tiền mặt COD | 4 phương thức |
| Deploy | Docker + Docker Compose + Caddy (HTTPS auto) | Production VPS |

**1.1 — Project Layout**
| root/
├── sqlc.yaml              ← config sqlc (sinh Go code từ SQL)
├── query/                 ← SQL queries annotated cho sqlc
├── migrations/            ← DDL source of truth (goose format)
└── be/
    ├── go.mod
    ├── internal/
    │   ├── db/            ← sqlc generated (KHÔNG sửa tay)
    │   ├── handler/       ← HTTP handlers (Gin)
    │   ├── service/       ← business logic
    │   └── repository/    ← wraps sqlc Querier
    └── pkg/
        ├── jwt/           ← JWT sign + verify
        └── bcrypt/        ← password hash |
| --- |

| Section 2 — Database & Migrations |
| --- |

| ℹ️  migrations/*.sql là DDL source of truth duy nhất. Specs và docs chỉ reference — không lặp lại DDL. sqlc đọc migrations/ để sinh Go code. |
| --- |

**2.1 — Thứ Tự Migration (có FK dependency)**
| File | Tables | Domain | Ghi Chú |
| --- | --- | --- | --- |
| 001_auth.sql | staff, refresh_tokens | Auth & Staff | Chạy ĐẦU TIÊN — mọi bảng FK về staff |
| 002_products.sql | categories, products, toppings, product_toppings | Menu | categories FK bởi combos |
| 003_tables.sql | tables | Bàn ăn | Phải có trước 005_orders (FK table_id) |
| 004_combos.sql | combos, combo_items | Combo | Depends: categories + products |
| 005_orders.sql | order_sequences, orders, order_items | Đơn hàng | Core — depends on tất cả bên trên |
| 006_payments.sql | payments | Thanh toán | Depends: orders |
| 007_files.sql | file_attachments | File upload | Depends: staff |

**2.2 — Nguyên Tắc Schema Quan Trọng**
| Rule | Chi Tiết |
| --- | --- |
| ID type | CHAR(36) DEFAULT (UUID()) — tuyệt đối không dùng INT AUTO_INCREMENT |
| Giá tiền | DECIMAL(10,0) — VND không có thập phân, tránh float rounding bug |
| Ảnh / file | Lưu object_path (relative) — ghép full URL khi serve: STORAGE_BASE_URL + object_path |
| Soft delete | deleted_at DATETIME NULL — mọi query thêm WHERE deleted_at IS NULL |
| Boolean | TINYINT(1) — MySQL convention; sqlc override → Go bool |
| JSON columns | json.RawMessage — giữ raw bytes, service layer unmarshal khi cần |
| order_items type | CHECK constraint đảm bảo mỗi row thuộc 1 trong 3 loại: standalone / combo header / combo sub-item |
| total_amount | DENORMALIZED trên bảng orders — phải gọi recalculateTotalAmount() sau mọi mutation order_items |

| 🚨  RISK: total_amount denormalization: nếu bất kỳ code path nào quên gọi recalculateTotalAmount() sau khi mutate order_items, payment sẽ charge sai tiền — silent bug nguy hiểm. |
| --- |

| Section 3 — sqlc Setup |
| --- |

| ℹ️  sqlc đọc migrations/*.sql + query/*.sql → sinh Go code vào be/internal/db/. Dev KHÔNG viết raw query string trong Go — chỉ dùng sqlc generated methods. |
| --- |

**3.1 — sqlc.yaml (đặt tại root)**
| version: "2"
sql:
  - engine: "mysql"
    queries: "query/"
    schema:  "migrations/"
    gen:
      go:
        package: "db"
        out:     "be/internal/db"
        emit_interface:              true   # Querier interface → mock trong tests
        emit_result_struct_pointers: true
        null_style: "sql"                   # sql.NullString cho nullable columns
        overrides:
          - db_type: "decimal"              # DECIMAL(10,0) → shopspring/decimal
            go_type:  "github.com/shopspring/decimal.Decimal"
          - db_type: "tinyint(1)"           # MySQL boolean
            go_type:  "bool"
          - db_type: "json"                 # toppings_snapshot, gateway_data
            go_type:  "encoding/json.RawMessage" |
| --- |

**3.2 — Lý Do Các Type Overrides**
| Override | DB Type | Lý Do |
| --- | --- | --- |
| shopspring/decimal | DECIMAL(10,0) | Giá VND không có thập phân — float64 gây rounding bug |
| bool | tinyint(1) | MySQL dùng tinyint(1) cho boolean — sqlc default map sang int8, không phải bool |
| json.RawMessage | json | Giữ raw JSON bytes — service layer tự unmarshal khi cần (toppings_snapshot, gateway_data) |

**3.3 — Generated Output (be/internal/db/)**
| File Generated | Nội Dung |
| --- | --- |
| db.go | DBTX interface (chấp nhận *sql.DB hoặc *sql.Tx) + New() constructor |
| models.go | Go structs cho mọi table — field types match overrides trong sqlc.yaml |
| auth.sql.go | Typed query methods + Querier interface (do emit_interface: true) |
| orders.sql.go | Typed methods cho orders + order_items queries |
| ...sql.go | Một file per query/*.sql — DO NOT EDIT tay |

**3.4 — Thứ Tự Chạy**
| # 1. Đảm bảo migrations/001–007.sql đã tồn tại
# 2. Cài sqlc
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# 3. Cài shopspring/decimal
cd be && go get github.com/shopspring/decimal

# 4. Chạy generate từ ROOT (không phải từ bên trong be/)
cd .. && sqlc generate

# 5. Verify output
ls be/internal/db/   # Expected: db.go  models.go  auth.sql.go  ...

# 6. Build check — phải compile clean
cd be && go build ./... |
| --- |

| Section 4 — Auth & JWT |
| --- |

**4.1 — Luồng Login**
| Bước | Action | Ghi Chú |
| --- | --- | --- |
| 1 | Client POST username + password |  |
| 2 | BE compare bcrypt (cost=12) | Không phân biệt "sai username" vs "sai password" → cùng trả INVALID_CREDENTIALS |
| 3 | Tạo Access Token JWT 24h | Lưu memory Zustand phía FE — tuyệt đối không localStorage |
| 4 | Tạo Refresh Token random 32 bytes → SHA256 hex | Lưu DB column token_hash. Raw token → httpOnly cookie |
| 5 | Nếu staff có >= 5 session active | Xóa session cũ nhất (theo last_used_at) trước khi insert mới |

**4.2 — JWT Payload**
| Field | Type / Value | Mô Tả |
| --- | --- | --- |
| sub | UUID string (hoặc "guest") | Staff UUID. Với QR customer: cố định string "guest" |
| role | customer|chef|cashier|staff|manager|admin | RBAC role — dùng trong middleware |
| jti | UUID string | Unique token ID — dùng cho Redis blacklist khi logout |
| exp | Unix timestamp | Access: now+24h | Refresh: now+30d |
| table_id | UUID string (chỉ Guest JWT) | Bàn mà QR customer đang ngồi — validate khi POST /orders |

**4.3 — Auth Middleware (mọi request authenticated)**
| // Bước 1: Parse + verify JWT signature (HMAC-SHA256)
//         Chặn algorithm confusion: verify t.Method == SigningMethodHMAC
// Bước 2: Check Redis blacklist  logout:{jti}
//         Nếu có → 401 TOKEN_INVALID (đã logout)
// Bước 3: Check is_active từ Redis cache (TTL 5 phút)
//         Cache key: auth:staff:{staff_id}
//         Cache miss → query DB → set cache
//         Nếu is_active = false → 401 ACCOUNT_DISABLED
// Bước 4: Set vào gin.Context
//         c.Set("staff_id", claims.Sub)
//         c.Set("role",     claims.Role)

// KHI ADMIN DEACTIVATE:
// staffService.Deactivate() → DEL auth:staff:{id} ngay
// → Cache miss ở request tiếp theo → DB query → phát hiện disabled
// → Hiệu lực gần như tức thì (không cần đợi 5 phút TTL) |
| --- |

| 🚨  RISK: Không check is_active qua Redis = staff bị disable vẫn dùng được access token còn lại trong 24h. Middleware PHẢI query DB (qua cache) sau mỗi JWT verify. |
| --- |

**4.4 — RBAC Hierarchy**
| admin  ⊃  manager  ⊃  staff  ⊃  (chef | cashier)  |  customer (isolated)

// customer không thuộc staff hierarchy — không có quyền gì trên staff endpoints

// Middleware patterns:
RequireRole("admin", "manager")    // whitelist cụ thể
AtLeastRole("staff")               // role >= staff trong hierarchy
RequireOwner()                     // chỉ owner resource hoặc admin/manager

// ❌ KHÔNG hardcode role check trong handler — luôn dùng middleware |
| --- |

**4.5 — Guest JWT (QR Customer)**
| ℹ️  Guest JWT: stateless, TTL 2h, KHÔNG lưu DB. Khi hết hạn → quét lại QR, không gọi /auth/refresh. FE detect 401 với sub="guest" → redirect /table/:qr_token. |
| --- |

| Rule | Chi Tiết |
| --- | --- |
| Stateless | BE chỉ sign và verify — không insert vào refresh_tokens hay bất kỳ bảng nào |
| Không refresh | Hết hạn → customer quét lại QR → POST /auth/guest → nhận guest JWT mới |
| Scope hạn chế | Chỉ POST /orders (table_id phải match JWT) + GET /orders/:id (own only) |
| Validate table | POST /orders source="qr": table_id trong request PHẢI match table_id trong JWT payload |
| Rate limit | 5 req/min per IP trên POST /auth/guest — ngăn brute-force |

| Section 5 — Orders Business Logic |
| --- |

**5.1 — State Machine**
| pending → confirmed → preparing → ready → delivered
              ↘ cancelled  (chỉ khi SUM(qty_served)/SUM(quantity) < 0.30) |
| --- |

| Transition | Từ | Sang | Điều Kiện | Role Được Phép |
| --- | --- | --- | --- | --- |
| Tạo đơn | — | pending | Không có order active cùng bàn | customer, cashier, staff |
| Xác nhận | pending | confirmed | Auto hoặc cashier confirm | cashier, staff, manager |
| Bắt đầu | confirmed | preparing | Chef click item đầu tiên | chef, staff |
| Hoàn thành | preparing | ready | Tất cả items qty_served = quantity | chef, staff |
| Giao xong | ready | delivered | Cashier confirm giao | cashier, staff |
| Huỷ đơn | pending / confirmed / preparing | cancelled | SUM(qty_served) / SUM(quantity) < 0.30 | customer (own), cashier, manager |

**5.2 — Item Status (Derive — KHÔNG column riêng)**
| ℹ️  KHÔNG tạo column status trên order_items. Status được DERIVE từ qty_served tại service/query layer. BE tính và include trong response + SSE payload — FE không cần derive lại. |
| --- |

| // Go (service layer)
func itemStatus(qtyServed, quantity int32) string {
  switch {
  case qtyServed == 0:             return "pending"
  case qtyServed < quantity:       return "preparing"
  default:                         return "done"
  }
}

// TypeScript (FE)
const itemStatus = (qtyServed: number, quantity: number) => {
  if (qtyServed === 0)        return "pending"
  if (qtyServed < quantity)   return "preparing"
  return "done"
}

// SQL filter (dùng qty_served math — không có column status)
-- pending:    WHERE qty_served = 0
-- preparing:  WHERE qty_served > 0 AND qty_served < quantity
-- done:       WHERE qty_served = quantity |
| --- |

**5.3 — Combo Expand**
| ℹ️  Khi order chứa combo_id: BE tạo 1 header row + N sub-item rows trong cùng 1 DB transaction. Rollback nếu bất kỳ step thất bại. |
| --- |

| Row Type | product_id | combo_id | combo_ref_id | Mô Tả |
| --- | --- | --- | --- | --- |
| Standalone product | NOT NULL | NULL | NULL | Món đơn lẻ |
| Combo header | NULL | NOT NULL | NULL | Dòng đại diện combo |
| Combo sub-item | NOT NULL | NULL | NOT NULL | Món con của combo — combo_ref_id = ID header row |

**5.4 — One Active Order Per Table**
| // TRƯỚC KHI tạo order mới — check bắt buộc:
SELECT COUNT(*) FROM orders
WHERE table_id = ?
  AND status IN ("pending","confirmed","preparing","ready")
  AND deleted_at IS NULL

// Nếu count > 0 → 409 TABLE_HAS_ACTIVE_ORDER
// delivered và cancelled không tính là active |
| --- |

| Section 6 — Payment & Webhooks |
| --- |

**6.1 — Rules Tuyệt Đối**
| Rule | Chi Tiết |
| --- | --- |
| Thời điểm tạo payment | Chỉ tạo payment record khi order.status = "ready" → 409 ORDER_NOT_READY nếu sai |
| 1 order 1 payment row | UNIQUE(order_id) — retry phải UPDATE existing row (attempt_count++), không INSERT mới |
| Webhook idempotent | Check payment.status = "completed" TRƯỚC KHI xử lý bất kỳ business logic — webhook gọi nhiều lần là bình thường |
| Verify signature trước | HMAC verify là bước ĐẦU TIÊN — trước mọi DB query hay business logic |
| Amount verify | So sánh webhook amount với payment.amount trong DB — reject nếu không khớp |
| Không hard delete | deleted_at là cơ chế xóa duy nhất — hard delete bị block ở application layer (audit trail) |
| gateway_data | Lưu raw webhook payload vào JSON column — KHÔNG expose ra API response |

**6.2 — Webhook Endpoints**
| Gateway | Endpoint | HMAC Algorithm |
| --- | --- | --- |
| VNPay | POST /api/v1/payments/webhook/vnpay | HMAC-SHA512 của query string sorted alphabetically |
| MoMo | POST /api/v1/payments/webhook/momo | HMAC-SHA256 per MoMo docs |
| ZaloPay | POST /api/v1/payments/webhook/zalopay | HMAC-SHA256 với key = key1 |

| Section 7 — Realtime: WebSocket & SSE |
| --- |

**7.1 — WebSocket — KDS Bếp (/ws/kds)**
| Config | Value | Ghi Chú |
| --- | --- | --- |
| Endpoint | ws://{host}/api/v1/ws/kds | Chef và Cashier+ kết nối |
| Auth | ?token={jwt} query param | WS browser không set header được |
| Role filtering | Hub filter theo role trước khi broadcast | Chef+ nhận KDS events, Cashier+ nhận live-grid events |
| Ping/pong | 30s interval | Client gửi ping — server pong |
| Reconnect | Exponential backoff: 1s→2s→4s→max 30s | Tối đa 5 lần, hiện banner sau 3 lần thất bại |

**7.2 — SSE — Order Tracking (/orders/:id/events)**
| Config | Value | Ghi Chú |
| --- | --- | --- |
| Auth | Authorization: Bearer header | SSE hỗ trợ header (khác WS) |
| Redis channel | order:{order_id}:events | BE publish, SSE handler subscribe |
| Initial event | order_init gửi ngay khi connect | FE không cần call GET riêng |
| Heartbeat | : keep-alive mỗi 15s | Comment format — prevent proxy timeout |
| Event types | order_status_changed, item_progress, order_completed |  |

**7.3 — WS/SSE Reconnect Config (dùng chung)**
| const WS_RECONNECT = {
  maxAttempts:     5,
  baseDelay:       1000,    // ms, tăng x2 mỗi lần retry (exponential backoff)
  maxDelay:        30_000,  // ms cap
  showBannerAfter: 3,       // lần thất bại trước khi hiện "Mất kết nối"
}

// Áp dụng cho: /kitchen (WS), /orders/live (WS), /order/[id] (SSE) |
| --- |

| Section 8 — Error Contract |
| --- |

| ℹ️  Mọi error response PHẢI theo format chuẩn. Không exception. Handler dùng helper respondError() — không viết gin.H{} trực tiếp. |
| --- |

**8.1 — Format Chuẩn**
| // SUCCESS
{ "data": { ... }, "message": "optional" }

// ERROR — không có field "success"
{
  "error":   "SCREAMING_SNAKE_CODE",   // machine-readable
  "message": "Thông báo tiếng Việt",   // cho user đọc
  "details": {}                         // optional context cho FE
}

// ❌ KHÔNG expose: stack trace, DB error, internal server details
// ❌ KHÔNG dùng: "msg", "err", "success" fields |
| --- |

**8.2 — Error Code Registry**
| HTTP | Error Code | Khi Nào |
| --- | --- | --- |
| 401 | MISSING_TOKEN | Không có Authorization header |
| 401 | TOKEN_EXPIRED | JWT access token hết hạn 24h → FE gọi /auth/refresh |
| 401 | TOKEN_INVALID | Chữ ký JWT sai hoặc format lỗi |
| 401 | ACCOUNT_DISABLED | JWT hợp lệ nhưng is_active = false trong DB |
| 401 | INVALID_CREDENTIALS | Login sai username hoặc password |
| 401 | REFRESH_TOKEN_INVALID | /auth/refresh fail → FE redirect /login |
| 403 | FORBIDDEN | Token hợp lệ nhưng role không đủ quyền (RBAC) |
| 404 | NOT_FOUND | Resource không tồn tại |
| 409 | TABLE_HAS_ACTIVE_ORDER | 1 bàn chỉ được 1 ACTIVE order cùng lúc |
| 409 | ORDER_NOT_READY | Tạo payment khi order.status ≠ ready |
| 409 | CANCEL_THRESHOLD | Huỷ đơn khi >= 30% qty đã served |
| 409 | PAYMENT_ALREADY_EXISTS | Order đã có payment đang pending hoặc paid |
| 409 | INVENTORY_INSUFFICIENT | Deduct kho thất bại — rollback |
| 422 | UNSUPPORTED_FILE_TYPE | Upload file MIME không được phép |
| 422 | FILE_TOO_LARGE | File vượt 10MB |
| 429 | RATE_LIMIT_EXCEEDED | Vượt 60 req/min/IP |
| 500 | INTERNAL_ERROR | Lỗi server không xác định — log server-side, KHÔNG expose chi tiết |

| Section 9 — Frontend Patterns & Conventions |
| --- |

**9.1 — State Management Rules**
| Loại State | Tool | Ghi Chú |
| --- | --- | --- |
| Server state (API data) | TanStack Query v5 | cache, refetch, invalidate — KHÔNG useState cho API data |
| Client state (cart, session) | Zustand v4 | in-memory — không persist localStorage |
| Form state | React Hook Form + Zod | validate trước submit |
| Token storage | Zustand memory ONLY | TUYỆT ĐỐI không localStorage — XSS risk |

**9.2 — API Call Patterns**
| // GET → TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ["orders", id],
  queryFn:  () => api.get(`/orders/${id}`).then(r => r.data),
})

// POST/PATCH/DELETE → useMutation
const mutation = useMutation({
  mutationFn: (payload) => api.post("/orders", payload),
  onSuccess:  () => queryClient.invalidateQueries(["orders"]),
  onError:    (err) => toast.error(err.response?.data?.message),
})

// Tất cả calls qua /lib/api.ts — JWT tự động attach
// 401 TOKEN_EXPIRED → gọi /auth/refresh → retry 1 lần → redirect /login
// 401 TOKEN_EXPIRED + isGuest → redirect /table/:qr_token (KHÔNG refresh) |
| --- |

**9.3 — Loading / Error / Empty States**
| State | Pattern | KHÔNG Làm |
| --- | --- | --- |
| Loading | <Skeleton> component | KHÔNG dùng spinner (trừ button submit) |
| Empty | <EmptyState icon={...} message="..." /> | KHÔNG để trống màn hình |
| API Error | toast.error(message) | KHÔNG alert() hoặc console.log |
| Form validation | Inline text đỏ ngay dưới field | KHÔNG toast cho form validation |

**9.4 — Utility Functions (/lib/utils.ts)**
| Function | Output Ví Dụ | Dùng Cho |
| --- | --- | --- |
| formatVND(amount) | "1.200.000 ₫" | Mọi giá tiền hiển thị ra UI — bắt buộc |
| formatDateTime(date) | "14:30 · 09/04/2026" | Thời gian tạo đơn, log |
| formatDate(date) | "09/04/2026" | Ngày trong báo cáo, filter |
| formatPercent(n) | "12,5%" | Progress, ROI, tỉ lệ |
| cn(...classes) | merged classes | Merge Tailwind classes an toàn (clsx + tailwind-merge) |

| Section 10 — File Upload & Cleanup |
| --- |

| Step | Action | Ghi Chú |
| --- | --- | --- |
| 1. Upload | POST /api/v1/files/upload → nhận object_path | File tạo với is_orphan = 1 |
| 2. Link | Lưu object_path vào record entity (product, order...) | Set is_orphan = 0, entity_type, entity_id |
| 3. Cleanup | Job chạy mỗi 6h — xóa WHERE is_orphan=1 AND created_at < NOW() - 24H | Tránh file rác tích lũy |

| ℹ️  Không lưu full URL vào DB — chỉ lưu object_path (relative). Full URL = STORAGE_BASE_URL (env var) + object_path. Khi migrate storage chỉ cần đổi 1 env var. |
| --- |

| 🍜  BanhCuon System  ·  SYSTEM DESCRIPTION  ·  v1.0  ·  AI & Dev Reference  ·  Tháng 4/2026 |
| --- |
