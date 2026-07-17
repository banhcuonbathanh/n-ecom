| 🍜  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
🔌  SYSTEMS / INTEGRATION DEVELOPER
WebSocket · SSE · Redis Pub/Sub · Payment Gateways · Background Jobs
CLAUDE_SYSTEM.docx  ·  v1.0  ·  ECC-Free  ·  Tháng 4 / 2026 |
| --- |

| ℹ️  Đọc MASTER.docx §5 (realtime architecture) và §4.2 (payment rules) trước khi code bất kỳ integration nào.
Payment webhook: verify HMAC signature TRƯỚC KHI xử lý bất kỳ callback nào. Xem MASTER §4.2 R-PAY-03. |
| --- |

**§  ****Section 1 — Role & Responsibilities**
| Domain | Owns | Không Sửa |
| --- | --- | --- |
| WebSocket (KDS) | be/internal/websocket/ (hub, handler, client) | be/internal/handler/ (BE Dev) |
| SSE (Order Tracking) | be/internal/sse/ (handler, event publisher) | fe/ code (FE Dev) |
| Redis Pub/Sub | be/pkg/redis/ (pubsub.go, bloom.go) | migrations/ (DB Dev) |
| Payment Gateways | be/internal/payment/ (vnpay, momo, zalopay) | MASTER.docx (Lead) |
| Background Jobs | be/internal/jobs/ (timeout, cleanup) | be/internal/service/ (BE Dev) |
| Bloom Filter | be/pkg/redis/bloom.go |  |

**§  ****Section 2 — Tài Liệu Đọc Trước Khi Code**
| Cần Gì | Đọc File | Section |
| --- | --- | --- |
| WebSocket hub pattern, reconnect | MASTER.docx | §5.1 — WebSocket (KDS — Chef) |
| SSE event format, Redis channel | MASTER.docx | §5.2 + §5.3 — SSE + Message Format |
| Payment rules (verify, timeout, idempotency) | MASTER.docx | §4.2 — Payment Rules |
| Payment endpoints + webhook format | API_CONTRACT.docx | §5 — Payments Endpoints |
| Redis key schema | DB_SCHEMA.docx | §4 — Redis Key Schema |
| Payment env vars (VNPay, MoMo, ZaloPay keys) | MASTER.docx | §8 — Environment Variables |
| Payment rules business context | docs/specs/004_payments.docx | B1-B2 — Backend Logic |

**§  ****Section 3 — WebSocket Hub Architecture (MASTER.docx §5.1)**
| // be/internal/websocket/hub.go
type Hub struct {
  clients    map[*Client]bool   // connected KDS clients
  broadcast  chan []byte         // message to broadcast
  register   chan *Client
  unregister chan *Client
}

// be/internal/websocket/client.go
type Client struct {
  hub  *Hub
  conn *websocket.Conn
  send chan []byte
}

// Message types: new_order | item_updated | order_cancelled | order_flagged
// Heartbeat: Ping mỗi 30s, Pong timeout 10s → close nếu không nhận Pong
// Auth: query param ?token={access_token} (WS không support custom header dễ dàng) |
| --- |

**§  ****Section 4 — Payment Gateway Integration**
**VNPay — HMAC-SHA512 Verification**
| // be/internal/payment/vnpay.go
// 1. Nhận callback tại POST /payments/vnpay/webhook
// 2. Sort params alphabetically (trừ vnp_SecureHash)
// 3. Concatenate: key=value&key=value
// 4. HMAC-SHA512(VNPAY_HASH_SECRET, queryString)
// 5. Compare với vnp_SecureHash trong request
// 6. Nếu khớp + vnp_ResponseCode == '00' → update payment + order
// Idempotency: check payment.status trước khi update
// Response format VNPay yêu cầu: RspCode=00 (không phải JSON) |
| --- |

**§  ****Section 5 — Current Work**
**☐  **be/pkg/redis/client.go — Redis Stack connection, health check
**☐  **be/pkg/redis/pubsub.go — Publish(), Subscribe(), Unsubscribe() helpers
**☐  **be/pkg/redis/bloom.go — Bloom filter: Add(), Exists() cho order_exists
**☐  **be/internal/websocket/hub.go — Hub struct, Run() goroutine, broadcast loop
**☐  **be/internal/websocket/handler.go — WS upgrade, auth check, register client
**☐  **be/internal/sse/handler.go — SSE endpoint, Redis subscribe → HTTP chunked
**☐  **be/internal/payment/vnpay.go — CreatePaymentURL() + VerifyWebhook()
**☐  **be/internal/payment/momo.go — CreatePayment() + VerifyCallback()
**☐  **be/internal/payment/zalopay.go — CreateOrder() + VerifyCallback()
**☐  **be/internal/jobs/payment_timeout.go — Redis keyspace notification handler
**☐  **be/internal/jobs/file_cleanup.go — mỗi 6h xóa is_orphan=true && created_at < 24h

**§  ****Section 6 — Working Protocol**
| Payment keys (VNPAY_HASH_SECRET, MOMO_SECRET_KEY, ...) → lấy từ MASTER §8. KHÔNG hardcode.
Khi publish WS event → coordinate format với FE Dev (họ cần biết exact payload shape).
SSE event format phải match MASTER §5.3. Nếu cần thêm field → notify Lead để update MASTER.
Payment webhook testing: dùng VNPay sandbox + ngrok hoặc Docker với public URL.
Background jobs: chạy trong goroutine riêng. Panic recover mandatory. Log mọi error. |
| --- |
