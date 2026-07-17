| 💳
HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
SPEC 5 — Payment + Webhooks
Model: Opus · Branch: feat/5-payment-webhooks · Phụ thuộc: specs/4.md (Orders API)
VNPay · MoMo · ZaloPay · COD · HMAC Signature · WebSocket |
| --- |

| ⚠️  ⚠️  LUÔN confirm trước khi chạy bất kỳ code payment — ảnh hưởng tiền thật. Payment 4 phương thức, webhook HMAC verify, POS Cashier UI, in hoá đơn. |
| --- |

**Model:** Opus | **Branch:** `feat/5-payment-webhooks` | **Phụ thuộc:** `specs/4.md` (Orders API phải có trước)

**1. Mục Tiêu**
Xây dựng hệ thống thanh toán 4 phương thức: VNPay, MoMo, ZaloPay QR, và Tiền mặt COD.
Bao gồm webhook handler, payment status tracking, và POS UI cho Cashier.
| 🔴 ⛔ **LUÔN confirm trước khi chạy bất kỳ code payment** — ảnh hưởng tiền thật. |
| --- |

**2. Phạm Vi**
| Phần | Nội Dung |
| --- | --- |
| Backend | Payment API, webhook handlers (VNPay/MoMo/ZaloPay), signature verification |
| Frontend | /cashier POS layout, /cashier/payment/[id] QR display, upload ảnh xác nhận |
| Không thuộc | Refund flow, reconciliation báo cáo (Phase 2) |

**3. Business Rule Tuyệt Đối**
| ℹ️  **Payment chỉ được tạo khi `order.status = 'ready'`** |
| --- |

| ℹ️  Cashier không thể tạo payment cho đơn đang `pending`, `confirmed`, hoặc `preparing`. |
| --- |

**4. Database Schema**
| payments ( |
| --- |
| id              INT PK AUTO_INCREMENT, |
| order_id        INT NOT NULL UNIQUE REFERENCES orders(id),  -- 1 order 1 payment |
| method          ENUM('vnpay','momo','zalopay','cod') NOT NULL, |
| amount          DECIMAL(12,0) NOT NULL, |
| status          ENUM('pending','success','failed','refunded') DEFAULT 'pending', |
| gateway_ref     VARCHAR(255),    -- transaction ID từ gateway (null cho COD) |
| qr_code_url     VARCHAR(500),    -- URL ảnh QR (VNPay/MoMo/ZaloPay) |
| proof_image_url VARCHAR(500),    -- Cashier upload ảnh chuyển khoản |
| webhook_payload JSON,            -- Raw webhook body từ gateway |
| paid_at         DATETIME,        -- null cho đến khi success |
| created_at      DATETIME DEFAULT NOW(), |
| updated_at      DATETIME DEFAULT NOW() ON UPDATE NOW() |
| ) |

**5. Payment Flow**
**5.1 COD (Tiền Mặt)**
| Cashier xác nhận nhận tiền |
| --- |
| → POST /payments { method: "cod", order_id } |
| → Tạo payment.status = "success" ngay |
| → Update order.status = "delivered" |
| → Return { payment_id, status: "success" } |

**5.2 VNPay / MoMo / ZaloPay (QR)**
| Cashier chọn phương thức QR |
| --- |
| → POST /payments { method: "vnpay", order_id } |
| → Backend gọi gateway API → nhận QR code URL + gateway_ref |
| → Lưu payment.status = "pending", qr_code_url, gateway_ref |
| → Return { payment_id, qr_code_url } |
|  |
| Cashier hiển thị QR cho khách quét |
| → Khách quét QR + thanh toán |
| → Gateway gọi webhook → POST /webhooks/vnpay (hoặc /momo, /zalopay) |
| → Backend verify signature |
| → Update payment.status = "success", paid_at = NOW() |
| → Update order.status = "delivered" |
| → Broadcast WS event "payment_success" tới cashier client |

**5.3 Upload Ảnh Xác Nhận (tuỳ chọn)**
| Cashier upload ảnh chuyển khoản |
| --- |
| → PATCH /payments/:id/proof { image: multipart/form-data } |
| → Lưu vào file_attachments, update payment.proof_image_url |

**6. API Endpoints**
**6.1 Payments**
| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| POST | /api/v1/payments | Cashier+ | Tạo payment cho order ready |
| GET | /api/v1/payments/:id | Cashier+ | Lấy payment status + QR URL |
| PATCH | /api/v1/payments/:id/proof | Cashier+ | Upload ảnh xác nhận |
| GET | /api/v1/payments/:id/status | Cashier+ | Poll status (fallback nếu WS không available) |

**6.2 Webhooks (Public — Không Auth, Dùng Signature)**
| Method | Path | Role | Mô tả |
| --- | --- | --- | --- |
| POST | /api/v1/webhooks/vnpay | Public | VNPay IPN callback |
| POST | /api/v1/webhooks/momo | Public | MoMo IPN callback |
| POST | /api/v1/webhooks/zalopay | Public | ZaloPay callback |

**7. Request / Response**
**POST /payments**
| // Request |
| --- |
| { |
| "order_id": 1234, |
| "method": "vnpay" |
| } |
|  |
| // Validation: |
| // - order.status MUST be "ready" → 409 nếu không |
| // - order chưa có payment → 409 nếu đã có |
| // - method phải khớp với order.payment_method |
|  |
| // Response 201 — COD |
| { |
| "id": 1, |
| "order_id": 1234, |
| "method": "cod", |
| "amount": 290000, |
| "status": "success", |
| "qr_code_url": null |
| } |
|  |
| // Response 201 — QR (VNPay/MoMo/ZaloPay) |
| { |
| "id": 1, |
| "order_id": 1234, |
| "method": "vnpay", |
| "amount": 290000, |
| "status": "pending", |
| "qr_code_url": "https://sandbox.vnpay.vn/qr/..." |
| } |

**Webhook Handler (VNPay example)**
| // POST /api/v1/webhooks/vnpay |
| --- |
| func (h *PaymentHandler) VNPayWebhook(c *gin.Context) { |
| var payload VNPayIPN |
| c.BindJSON(&payload) |
|  |
| // 1. Verify signature HMAC-SHA512 |
| if !verifyVNPaySignature(payload, cfg.VNPayHashSecret) { |
| c.JSON(200, gin.H{"RspCode": "97", "Message": "Invalid signature"}) |
| return |
| } |
|  |
| // 2. Kiểm tra amount khớp với payment.amount |
| // 3. Idempotency: nếu payment đã success → return 200 luôn (không process lại) |
| // 4. Update payment.status = "success", gateway_ref, webhook_payload, paid_at |
| // 5. Update order.status = "delivered" |
| // 6. Broadcast WS event tới cashier |
|  |
| // VNPay yêu cầu response 200 với RspCode "00" để confirm nhận webhook |
| c.JSON(200, gin.H{"RspCode": "00", "Message": "Confirm Success"}) |
| } |

**Webhook Signature Verification**
| // VNPay: HMAC-SHA512 của query string sorted alphabetically (excluding vnp_SecureHash) |
| --- |
| func verifyVNPaySignature(params map[string]string, hashSecret string) bool { |
| // Sort keys → join "key=value&..." → HMAC-SHA512 → compare với vnp_SecureHash |
| } |
|  |
| // MoMo: HMAC-SHA256 của signature string theo format MoMo docs |
| func verifyMoMoSignature(payload MoMoWebhook, secretKey string) bool {} |
|  |
| // ZaloPay: HMAC-SHA256 với key = app_key |
| func verifyZaloPaySignature(payload ZaloPayCallback, key1 string) bool {} |

**8. WebSocket Events (Payment)**
| // Sau khi webhook success → broadcast tới cashier WS |
| --- |
| type PaymentSuccessEvent struct { |
| Type      string `json:"type"`       // "payment_success" |
| OrderID   int    `json:"order_id"` |
| PaymentID int    `json:"payment_id"` |
| Amount    int64  `json:"amount"` |
| Method    string `json:"method"` |
| } |
|  |
| // Cashier client nhận event → toast "Thanh toán thành công" → redirect /cashier |

**9. Frontend — `/cashier` POS**
**9.1 Layout**
| ┌─────────────────────────────────────────────────────┐ |
| --- |
| │  POS — Thu Ngân                  [Tạo Đơn Mới]      │ |
| ├───────────────────────┬─────────────────────────────┤ |
| │  Browse Menu          │  Đơn hiện tại                │ |
| │                       │                             │ |
| │  [Tất cả] [Bánh Cuốn]│  ┌─────────────────────────┐│ |
| │                       │  │ 2x Bánh Cuốn Thịt       ││ |
| │  ┌──────┐  ┌──────┐   │  │              90,000 ₫   ││ |
| │  │ tên  │  │ tên  │   │  │ 1x Combo Gia Đình       ││ |
| │  │ giá  │  │ giá  │   │  │             180,000 ₫   ││ |
| │  │[Add] │  │[Add] │   │  └─────────────────────────┘│ |
| │  └──────┘  └──────┘   │                             │ |
| │                       │  Tổng: 270,000 ₫            │ |
| │  ┌──────┐  ┌──────┐   │                             │ |
| │  │ tên  │  │ tên  │   │  [  Thanh Toán  ]           │ |
| │  │ giá  │  │ giá  │   │  → /cashier/payment/[id]    │ |
| │  │[Add] │  │[Add] │   │                             │ |
| │  └──────┘  └──────┘   │  [Bàn: A3    ▼] (optional) │ |
| └───────────────────────┴─────────────────────────────┘ |

**9.2 Tạo Đơn Offline (Cashier)**
| // Cashier dùng lại Zustand cart store từ spec 3 |
| --- |
| // Nhưng không cần form customer — điền tắt: |
| const cashierOrder = { |
| customer_name: "Khách tại quán", |
| customer_phone: "0000000000", |
| payment_method: selectedMethod, |
| table_id: selectedTable ?? null, |
| items: cartStore.items.map(...) |
| } |
|  |
| // POST /orders → nhận order_id |
| // Nếu order.status chưa "ready" → chef phải làm xong |
| // Khi "ready" → Cashier navigate /cashier/payment/[id] |

**9.3 Role Guard**
| // Chỉ Cashier, Staff, Manager, Admin |
| --- |
| <RoleGuard minRole="cashier"> |
| <CashierPage /> |
| </RoleGuard> |

**10. Frontend — `/cashier/payment/[id]`**
**10.1 Layout**
| ┌─────────────────────────────────────┐ |
| --- |
| │  ← Quay lại    Thanh Toán Đơn #1234 │ |
| ├─────────────────────────────────────┤ |
| │  Tổng tiền:  270,000 ₫              │ |
| │  Phương thức: VNPay                 │ |
| ├─────────────────────────────────────┤ |
| │  ┌─────────────────────────────────┐│ |
| │  │                                 ││ |
| │  │         [QR CODE IMAGE]         ││  ← <img src={qr_code_url} /> |
| │  │                                 ││ |
| │  └─────────────────────────────────┘│ |
| │  Quét mã QR để thanh toán           │ |
| ├─────────────────────────────────────┤ |
| │  Trạng thái: ⏳ Đang chờ thanh toán  │  ← Update realtime qua WS |
| │                                     │ |
| │  [Upload ảnh xác nhận (tuỳ chọn)] ] │ |
| ├─────────────────────────────────────┤ |
| │  [  Xác nhận COD  ] ← chỉ cho COD  │ |
| └─────────────────────────────────────┘ |

**10.2 Real-time Status (WebSocket)**
| // Dùng chung WS connection của /cashier layout |
| --- |
| // Lắng nghe event "payment_success" với đúng payment_id |
|  |
| useEffect(() => { |
| const handler = (event: PaymentSuccessEvent) => { |
| if (event.payment_id === paymentId) { |
| toast.success(`Thanh toán thành công: ${formatVND(event.amount)}`) |
| printReceipt()   // Window.print() |
| router.push('/cashier') |
| } |
| } |
| cashierWS.on('payment_success', handler) |
| return () => cashierWS.off('payment_success', handler) |
| }, [paymentId]) |

**10.3 In Hoá Đơn**
| // Window.print() với print stylesheet |
| --- |
| // Print stylesheet: ẩn navigation, chỉ hiện receipt content |
| // Receipt content: |
| // - Logo + tên quán |
| // - Số đơn, bàn, ngày giờ |
| // - List items + giá |
| // - Tổng cộng |
| // - Phương thức thanh toán |
| // - "Cảm ơn quý khách!" |
|  |
| function printReceipt() { |
| window.print() |
| } |
|  |
| // CSS: @media print { .no-print { display: none } } |

**10.4 Upload Ảnh Xác Nhận**
| // Optional — Cashier upload ảnh chuyển khoản cho QR payments |
| --- |
| const uploadProof = useMutation({ |
| mutationFn: (file: File) => { |
| const formData = new FormData() |
| formData.append('image', file) |
| return api.patch(`/payments/${paymentId}/proof`, formData, { |
| headers: { 'Content-Type': 'multipart/form-data' } |
| }) |
| }, |
| onSuccess: () => toast.success('Đã lưu ảnh xác nhận'), |
| onError: () => toast.error('Upload thất bại') |
| }) |

**11. Security Requirements**
| Requirement | Chi tiết |
| --- | --- |
| Webhook endpoints | Không auth JWT — dùng signature verification |
| Signature verification | Thực hiện TRƯỚC khi xử lý bất kỳ business logic |
| Idempotency | Webhook có thể gọi nhiều lần — check payment.status trước khi update |
| Amount verification | So sánh webhook amount với payment.amount trong DB |
| Secret keys | Lưu trong env vars — KHÔNG hardcode |
| Webhook logs | Lưu raw webhook_payload vào DB cho audit |
| HTTPS only | Webhook URL phải HTTPS (Caddy tự config) |

**12. Environment Variables**
| # VNPay |
| --- |
| VNPAY_TMN_CODE=... |
| VNPAY_HASH_SECRET=... |
| VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html |
|  |
| # MoMo |
| MOMO_PARTNER_CODE=... |
| MOMO_ACCESS_KEY=... |
| MOMO_SECRET_KEY=... |
| MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create |
|  |
| # ZaloPay |
| ZALOPAY_APP_ID=... |
| ZALOPAY_KEY1=... |
| ZALOPAY_KEY2=... |
| ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create |
|  |
| # Webhook base URL (phải HTTPS, gateway dùng để callback) |
| WEBHOOK_BASE_URL=https://banhcuon.example.com |

**13. File Structure**
| Backend: |
| --- |
| internal/ |
| payments/ |
| handler.go          // Payment CRUD + webhook handlers |
| service.go          // Payment business logic |
| gateways/ |
| vnpay.go          // VNPay API client + signature |
| momo.go           // MoMo API client + signature |
| zalopay.go        // ZaloPay API client + signature |
|  |
| Frontend: |
| src/ |
| app/ |
| cashier/ |
| page.tsx                    // /cashier — POS layout |
| payment/ |
| [id]/ |
| page.tsx                // /cashier/payment/[id] |
| components/ |
| cashier/ |
| POSMenu.tsx                 // Cột trái: browse menu |
| POSCart.tsx                 // Cột phải: order summary |
| QRDisplay.tsx               // QR code image + status |
| ProofUpload.tsx             // Upload ảnh xác nhận |
| ReceiptPrint.tsx            // Print layout |

**14. Acceptance Criteria**
**Backend**
- [ ] POST /payments từ chối nếu order.status ≠ "ready" → 409
- [ ] COD → payment.status = "success" + order.status = "delivered" ngay lập tức
- [ ] QR (VNPay/MoMo/ZaloPay) → trả qr_code_url, status = "pending"
- [ ] Webhook verify signature HMAC đúng — reject nếu sai
- [ ] Webhook idempotent — gọi 2 lần không tạo 2 payment
- [ ] Amount mismatch → log + reject webhook
- [ ] Raw webhook_payload lưu vào DB
- [ ] WS broadcast "payment_success" tới cashier sau webhook
**Frontend**
- [ ] /cashier layout 2 cột, Cashier/Staff/Manager/Admin only
- [ ] Tạo đơn offline, gửi POST /orders
- [ ] /cashier/payment/[id] hiện QR code đúng
- [ ] WS nhận "payment_success" → toast + auto print + redirect
- [ ] COD button xác nhận trực tiếp
- [ ] Upload ảnh xác nhận hoạt động (multipart)
- [ ] Window.print() ra đúng receipt layout (không có navigation)

🍜 BanhCuon System · SPEC 5 — Payment + Webhooks · ECC-Free · Tháng 4 / 2026