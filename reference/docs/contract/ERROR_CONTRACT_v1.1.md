| 📋  HỆ THỐNG QUẢN LÝ QUÁN BÁNH CUỐN
ERROR CONTRACT — Định Nghĩa Chuẩn Error Response
v1.1  ·  Go Gin · REST API · HTTP Status Codes · Error Code Registry  ·  Tháng 4/2026
Thay đổi từ v1.0: Là SINGLE SOURCE duy nhất — MASTER.docx §7 và API_CONTRACT Section 11 đã được xoá |
| --- |

| File này là cross-spec contract — được đọc bởi MỌI spec và mọi handler. Trước khi viết BẤT KỲ error response nào, đọc file này trước. ERROR_CONTRACT.docx là SINGLE SOURCE duy nhất cho error codes — không định nghĩa error codes ở MASTER.docx hay API_CONTRACT. |
| --- |

# Section 1 — Standard Error Response Format
**TẤT CẢ error response trong hệ thống PHẢI tuân theo format sau. Không exception.**

| {
  "error":   "ERROR_CODE",    ← machine-readable, SCREAMING_SNAKE_CASE
  "message": "Thông báo lỗi", ← tiếng Việt, cho user đọc
  "details": {}               ← optional, object thêm context
}

// KHÔNG có field "success" — v1.1: đã thống nhất bỏ hoàn toàn |
| --- |

| Quy tắc bắt buộc:
• Luôn dùng "error" (không phải "msg", "message" ở level gốc, hay "err")
• error code là SCREAMING_SNAKE_CASE — ví dụ: TOKEN_EXPIRED (không phải tokenExpired)
• message là tiếng Việt, readable cho người dùng
• details là optional — chỉ dùng khi cần thêm context để FE xử lý logic
• Không bao giờ expose stack trace, DB error, hay internal server details
• KHÔNG có field "success" trong error response (v1.1 change) |
| --- |

## 1.1 Ví Dụ Chuẩn
| // ✅ ĐÚNG — format chuẩn v1.1
{
  "error": "TABLE_HAS_ACTIVE_ORDER",
  "message": "Bàn số 5 đã có đơn đang xử lý. Vui lòng hoàn thành đơn hiện tại.",
  "details": {
    "table_id": "7f3d2b1a-...",
    "active_order_id": "a1b2c3d4-..."
  }
}

// ❌ SAI — các format không được dùng
{ "msg": "error" }                     // sai field name
{ "message": "unauthorized" }           // thiếu "error" code
{ "err": "TOKEN_EXPIRED" }              // sai field name
{ "error": "tokenExpired" }             // sai case (phải SCREAMING_SNAKE)
{ "success": false, "error": "..." }    // KHÔNG có "success" field (v1.1) |
| --- |

# Section 2 — HTTP Status → Error Code Mapping
**Bảng này là nguồn sự thật duy nhất cho HTTP status code và error code tương ứng.**

| HTTP | Error Code | Khi Nào Dùng | Ví Dụ |
| --- | --- | --- | --- |
| 400 | INVALID_INPUT | Thiếu field bắt buộc, sai format, type mismatch | Thiếu "items" trong POST /orders |
| 401 | MISSING_TOKEN | Không có Authorization header | Request không có Bearer token |
| 401 | TOKEN_EXPIRED | JWT access token hết hạn (24h) → FE gọi /auth/refresh | exp claim đã qua |
| 401 | TOKEN_INVALID | Chữ ký JWT sai, format không hợp lệ | Token bị tamper hoặc sai secret |
| 401 | ACCOUNT_DISABLED | JWT hợp lệ nhưng is_active=false trong DB | Admin deactivate staff |
| 401 | INVALID_CREDENTIALS | Login sai username hoặc password | POST /auth/login fail |
| 401 | REFRESH_TOKEN_INVALID | Refresh token hết hạn hoặc đã bị revoke | /auth/refresh fail → redirect /login |
| 403 | FORBIDDEN | Token hợp lệ nhưng role không đủ quyền (RBAC) | Chef cố gọi Manager+ endpoint |
| 404 | NOT_FOUND | Resource không tồn tại trong DB | GET /orders/550e8400-... |
| 409 | TABLE_HAS_ACTIVE_ORDER | 1 bàn chỉ được 1 ACTIVE order cùng lúc | Tạo order khi bàn đã có pending order |
| 409 | ORDER_NOT_READY | Tạo payment khi order.status ≠ ready | POST /payments khi order đang preparing |
| 409 | CANCEL_THRESHOLD | Huỷ đơn khi >= 30% qty đã served | DELETE /orders/:id khi 2/3 món done |
| 409 | INVENTORY_INSUFFICIENT | Deduct kho thất bại — không đủ nguyên liệu | PATCH /orders/items/:id khi kho hết |
| 409 | PRODUCT_IN_USE | Xóa product đang có trong active order | DELETE /products/:id |
| 409 | PAYMENT_ALREADY_EXISTS | Order đã có payment đang pending hoặc paid | Double-create payment |
| 422 | UNSUPPORTED_FILE_TYPE | Upload file MIME không được phép | Upload .exe hay .svg |
| 422 | FILE_TOO_LARGE | File vượt 10MB | Upload ảnh 15MB |
| 429 | RATE_LIMIT_EXCEEDED | Vượt rate limit (60 req/min/IP) | Brute force login |
| 500 | INTERNAL_ERROR | Lỗi server không xác định — log server-side, KHÔNG expose chi tiết | DB connection drop, panic |
| 200 + SSE `error` event | CHAT_001 | Trợ lý AI chưa cấu hình / không khả dụng (thiếu ANTHROPIC_API_KEY) — /chat đã mở stream nên lỗi đi qua event, không qua HTTP status | POST /chat khi BE không có API key |
| 400 / 403 / 404 | CHAT_002 | Pending action không hợp lệ khi confirm: 404 không còn pending · 403 sai session/caller · 400 dữ liệu pending hỏng hoặc loại action không hỗ trợ | POST /chat/confirm với action_id sai |
| 200 + SSE `error` event | CHAT_003 | Model từ chối yêu cầu hoặc gọi Anthropic API thất bại giữa stream | Anthropic API lỗi khi đang chat |

# Section 3 — Go Handler Pattern
**Tất cả handlers phải dùng helper function chuẩn. Không viết gin.H{} trực tiếp mỗi nơi.**

## 3.1 Helper Functions (internal/handler/errors.go)
| // internal/handler/errors.go
func respondError(c *gin.Context, status int, code, message string, details ...any) {
    body := gin.H{"error": code, "message": message}
    if len(details) > 0 && details[0] != nil {
        body["details"] = details[0]
    }
    c.AbortWithStatusJSON(status, body)
}

// ✅ ĐÚNG — dùng helper
respondError(c, 401, "TOKEN_EXPIRED", "Token đã hết hạn, vui lòng làm mới")
respondError(c, 409, "TABLE_HAS_ACTIVE_ORDER", "Bàn số 5 đã có đơn",
    gin.H{"table_id": "7f3d...", "active_order_id": "a1b2..."})

// ❌ SAI — không dùng trực tiếp
c.JSON(401, gin.H{"message": "unauthorized"})   // sai format
c.JSON(500, gin.H{"error": err.Error()})         // expose internal error |
| --- |

## 3.2 Sentinel Error → HTTP Mapping
| Sentinel Error | HTTP Code | Error Code | Ghi Chú |
| --- | --- | --- | --- |
| ErrNotFound | 404 | NOT_FOUND | Record không tồn tại trong DB |
| ErrForbidden | 403 | FORBIDDEN | Role không đủ quyền |
| ErrInvalidCredentials | 401 | INVALID_CREDENTIALS | Login sai username/password |
| ErrTokenExpired | 401 | TOKEN_EXPIRED | JWT hết 24h |
| ErrTokenInvalid | 401 | TOKEN_INVALID | Signature sai hoặc format lỗi |
| ErrAccountDisabled | 401 | ACCOUNT_DISABLED | is_active=false |
| ErrOrderAlreadyActive | 409 | TABLE_HAS_ACTIVE_ORDER | 1 bàn 1 active order |
| ErrPaymentNotReady | 409 | ORDER_NOT_READY | Order chưa ready |
| ErrCancelGuardFailed | 409 | CANCEL_THRESHOLD | >= 30% đã served |
| ErrStockInsufficient | 409 | INVENTORY_INSUFFICIENT | Kho không đủ — deduct rollback |
| ErrPaymentExists | 409 | PAYMENT_ALREADY_EXISTS | Payment đã tồn tại |
| ErrFileTypeNotAllowed | 422 | UNSUPPORTED_FILE_TYPE | MIME không được phép |
| ErrFileTooLarge | 422 | FILE_TOO_LARGE | File > 10MB |
| ErrMissingToken | 401 | MISSING_TOKEN | Không có Authorization header |
| ErrRefreshTokenInvalid | 401 | REFRESH_TOKEN_INVALID | Refresh token hết hạn hoặc bị revoke → redirect /login |

# Section 4 — Frontend Integration
**Frontend (Next.js) phải parse đúng format và handle từng error code một cách nhất quán.**

| // lib/api.ts — axios interceptor xử lý error
// refreshAndRetry: gọi POST /auth/refresh, cập nhật header, retry request gốc
// ⚠️  GUEST EXCEPTION: nếu decoded token có sub='guest' → KHÔNG gọi refresh
//    → redirect /table/:tableId để quét lại QR
api.interceptors.response.use(
  res => res,
  async (err) => {
    const { error, message, details } = err.response?.data ?? {}

    switch (error) {
      case "TOKEN_EXPIRED":
        // Staff: tự động refresh — không show toast
        // Guest: redirect về QR scan page (xem GUEST EXCEPTION ở trên)
        return refreshAndRetry(err.config)

      case "MISSING_TOKEN":
        clearSession()
        router.push("/login")
        break

      case "ACCOUNT_DISABLED":
        clearSession()
        router.push("/login?reason=disabled")
        break

      case "REFRESH_TOKEN_INVALID":
        clearSession()
        router.push("/login?reason=session_expired")
        break

      case "FORBIDDEN":
        toast.error("Không có quyền thực hiện hành động này")
        break

      case "INVALID_INPUT":
        // details.fields chứa mảng lỗi cho từng field — dùng trong form
        // Ví dụ: [{ field: "quantity", message: "Phải lớn hơn 0" }]
        // Nếu không có form context, show toast
        toast.error(message ?? "Dữ liệu không hợp lệ")
        break

      case "TABLE_HAS_ACTIVE_ORDER":
        // Redirect tới đơn đang active (details chứa UUID)
        const orderId = details?.active_order_id
        router.push(`/order/${orderId}`)
        break

      case "INVENTORY_INSUFFICIENT":
        // KDS: toast với variant đặc biệt (xem design tokens MASTER §2)
        toast.error(message, { variant: "inventory-alert" })
        break

      case "RATE_LIMIT_EXCEEDED":
        toast.error("Quá nhiều yêu cầu. Vui lòng thử lại sau.")
        break

      default:
        toast.error(message ?? "Đã xảy ra lỗi")
    }

    return Promise.reject(err)
  }
) |
| --- |

## 4.1 INVALID_INPUT — Field-Level Error Format

| // BE luôn trả details.fields khi lỗi validation có thể map tới field cụ thể
// FE dùng để hiện lỗi inline trong form (React Hook Form + setError)

// Ví dụ response 400 INVALID_INPUT:
{
  "error": "INVALID_INPUT",
  "message": "Dữ liệu không hợp lệ",
  "details": {
    "fields": [
      { "field": "quantity",  "message": "Phải lớn hơn 0" },
      { "field": "table_id",  "message": "UUID không hợp lệ" }
    ]
  }
}

// FE (React Hook Form):
const { fields } = err.response.data.details ?? {}
fields?.forEach(({ field, message }) => setError(field, { message })) |
| --- |

# Section 5 — Quy Tắc Bổ Sung
| Quy Tắc | Chi Tiết |
| --- | --- |
| 500 chỉ cho unexpected errors | Business errors (deduct fail, cancel guard) → 409. 500 chỉ khi DB crash, panic, external service timeout |
| Không expose internal details | Không bao giờ trả err.Error() từ Go trong response 500 — log server-side bằng slog, trả generic message |
| Validation errors → 400 | Dùng gin.ShouldBindJSON → validate → nếu fail trả 400 INVALID_INPUT với details listing các field lỗi |
| Luôn dùng AbortWithStatusJSON | Trong middleware dùng c.AbortWithStatusJSON() — không dùng c.JSON() vì handler vẫn chạy sau đó |
| Rate limit → 429 | Middleware ulule/limiter tự trả 429, nhưng body phải theo format chuẩn — override default response |
| KHÔNG có "success" field | v1.1: Đã bỏ field "success": false khỏi error response. Chỉ có "error" + "message" + "details" |
| IDs luôn là UUID string | v1.1: Mọi ID trong details phải là UUID string — không dùng integer ID |

*📋  BanhCuon System  ·  ERROR CONTRACT  ·  v1.1  ·  SINGLE SOURCE  ·  Tháng 4/2026*