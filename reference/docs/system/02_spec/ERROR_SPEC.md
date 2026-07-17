# Error Specification

> **TL;DR**
> Every error response follows one format: `{"error": "CODE", "message": "...", "details": {...}?}`.
> No `"success"` field. Error code is SCREAMING_SNAKE_CASE. Message is Vietnamese, human-readable.
> FE maps error codes to UI actions via a switch/interceptor — see §3.
> This file is the single in-handbook source for the error format and code catalog.

---

## 1 — Standard Error Response Format

All error responses, without exception:

```json
{
  "error":   "ERROR_CODE",
  "message": "Thông báo lỗi tiếng Việt",
  "details": {}
}
```

Rules:
- `error` — machine-readable, SCREAMING_SNAKE_CASE. Always present.
- `message` — Vietnamese, for display to users.
- `details` — optional object for additional context (e.g. field errors, related IDs).
- No `"success"` field (removed in v1.1).
- Never expose stack traces, DB error strings, or internal struct names.

Success responses use `{"data": ...}` — no `"error"` key.

---

## 2 — Full Error Code Table

| HTTP | Code | When | Notable `details` |
|---|---|---|---|
| 400 | `INVALID_INPUT` | Missing required field, wrong type, bad format, validation failure | `{"fields": [{"field": "quantity", "message": "..."}]}` |
| 401 | `MISSING_TOKEN` | No `Authorization` header on a protected route | — |
| 401 | `TOKEN_EXPIRED` | JWT `exp` claim has passed (24 h for staff) | — |
| 401 | `TOKEN_INVALID` | JWT signature invalid or malformed | — |
| 401 | `ACCOUNT_DISABLED` | Valid JWT but `is_active = 0` in DB | — |
| 401 | `INVALID_CREDENTIALS` | Wrong username OR wrong password (same error — no enumeration) | — |
| 401 | `REFRESH_TOKEN_INVALID` | Refresh token expired or revoked | — |
| 403 | `FORBIDDEN` | Valid token, role too low for the endpoint | — |
| 404 | `NOT_FOUND` | Resource does not exist in DB | — |
| 409 | `TABLE_HAS_ACTIVE_ORDER` | Creating order when table already has an active order | `{"table_id": "...", "active_order_id": "..."}` |
| 409 | `ORDER_NOT_READY` | Creating payment when `order.status ≠ ready` | — |
| 422 | `CANCEL_THRESHOLD` | Cancelling order when ≥ 30% of items already served | — |
| 409 | `PAYMENT_ALREADY_EXISTS` | Second payment create — retries must UPDATE, not INSERT | — |
| 409 | `ORDER_ALREADY_GROUPED` | Adding an order that is already in another group | — |
| 409 | `CATEGORY_HAS_PRODUCTS` | Deleting a category that still has products | — |
| 409 | `DUPLICATE_NAME` | Category name already exists | — |
| 409 | `INVENTORY_INSUFFICIENT` | Stock deduct failed — not enough ingredient | — |
| 409 | `PRODUCT_IN_USE` | Deleting a product that is in an active order | — |
| 422 | `UNSUPPORTED_FILE_TYPE` | Uploaded MIME type not in allowlist (JPEG/PNG/WebP) | — |
| 422 | `FILE_TOO_LARGE` | File exceeds 10 MB | — |
| 429 | `RATE_LIMIT_EXCEEDED` | > 5 login attempts/min from same IP | — |
| 500 | `INTERNAL_ERROR` | Unexpected server error — details logged server-side, not exposed | — |
| 500 | `COMMON_002` | Alias for `INTERNAL_ERROR` in some paths | — |

---

## 3 — Go Handler Pattern

All handlers use the `respondError` helper — never `c.JSON` with `gin.H` directly:

```go
// Simple error
respondError(c, http.StatusNotFound, "NOT_FOUND", "Không tìm thấy tài nguyên")

// Error with details
respondError(c, http.StatusConflict, "TABLE_HAS_ACTIVE_ORDER",
    "Bàn đã có đơn đang xử lý",
    gin.H{"table_id": tableID, "active_order_id": orderID})
```

AppError unwrapping at handler/service boundary:
```go
if err != nil {
    var appErr *service.AppError
    if errors.As(err, &appErr) {
        respondError(c, appErr.Status, appErr.Code, appErr.Message)
    } else {
        respondError(c, 500, "INTERNAL_ERROR", "Lỗi máy chủ nội bộ")
    }
    return
}
```

Sentinel errors in `service/errors.go` map to AppError codes:

| Sentinel | HTTP | Code |
|---|---|---|
| `ErrNotFound` | 404 | `NOT_FOUND` |
| `ErrForbidden` | 403 | `FORBIDDEN` |
| `ErrInvalidCredentials` | 401 | `INVALID_CREDENTIALS` |
| `ErrTokenExpired` | 401 | `TOKEN_EXPIRED` |
| `ErrTokenInvalid` | 401 | `TOKEN_INVALID` |
| `ErrAccountDisabled` | 401 | `ACCOUNT_DISABLED` |
| `ErrOrderAlreadyActive` | 409 | `TABLE_HAS_ACTIVE_ORDER` |
| `ErrPaymentNotReady` | 409 | `ORDER_NOT_READY` |
| `ErrCancelGuardFailed` | 422 | `CANCEL_THRESHOLD` |
| `ErrPaymentExists` | 409 | `PAYMENT_ALREADY_EXISTS` |
| `ErrFileTypeNotAllowed` | 422 | `UNSUPPORTED_FILE_TYPE` |
| `ErrFileTooLarge` | 422 | `FILE_TOO_LARGE` |
| `ErrMissingToken` | 401 | `MISSING_TOKEN` |
| `ErrRefreshTokenInvalid` | 401 | `REFRESH_TOKEN_INVALID` |

Note in middleware: use `c.AbortWithStatusJSON` (not `c.JSON`) so the handler does not run after the error is set.

---

## 4 — Frontend Integration

FE (Next.js) uses an axios response interceptor to handle error codes consistently:

```typescript
// lib/api-client.ts (pseudocode)
api.interceptors.response.use(
  res => res,
  async (err) => {
    const { error, message, details } = err.response?.data ?? {}

    switch (error) {
      case "TOKEN_EXPIRED":
        // Staff: auto-refresh silently, then retry
        // Guest (sub='guest'): redirect to QR scan page — no refresh
        return refreshAndRetry(err.config)

      case "MISSING_TOKEN":
      case "ACCOUNT_DISABLED":
        clearSession(); router.push("/login")
        break

      case "REFRESH_TOKEN_INVALID":
        clearSession(); router.push("/login?reason=session_expired")
        break

      case "FORBIDDEN":
        toast.error("Không có quyền thực hiện hành động này")
        break

      case "INVALID_INPUT":
        // Use details.fields for inline form errors (RHF setError)
        // Fall back to toast if no form context
        handleFieldErrors(details?.fields)
        break

      case "TABLE_HAS_ACTIVE_ORDER":
        router.push(`/order/${details?.active_order_id}`)
        break

      case "RATE_LIMIT_EXCEEDED":
        toast.error("Quá nhiều yêu cầu. Vui lòng thử lại sau.")
        break

      default:
        toast.error(message ?? "Đã xảy ra lỗi")
    }

    return Promise.reject(err)
  }
)
```

### INVALID_INPUT Field-Level Format

When a validation error can be mapped to specific fields, BE includes `details.fields`:

```json
{
  "error": "INVALID_INPUT",
  "message": "Dữ liệu không hợp lệ",
  "details": {
    "fields": [
      { "field": "quantity", "message": "Phải lớn hơn 0" },
      { "field": "table_id", "message": "UUID không hợp lệ" }
    ]
  }
}
```

FE (React Hook Form):
```typescript
details?.fields?.forEach(({ field, message }) => setError(field, { message }))
```

---

## 5 — Rules Summary

| Rule | Detail |
|---|---|
| 500 only for unexpected errors | Business errors (cancel guard, stock deduct) → 409/422. 500 for DB crash, panic. |
| Never expose internal details | Log `err.Error()` server-side with `slog`; return generic message to client |
| Binding errors | Use `gin.ShouldBindJSON` → fail → 400 `INVALID_INPUT` with generic message (not `err.Error()` which leaks struct names) |
| Always `AbortWithStatusJSON` in middleware | Prevents handler execution after middleware error |
| No `"success"` field | v1.1 change — error responses have only `"error"`, `"message"`, `"details"` |
| IDs always UUID strings | No integer IDs in `details` |

---

## Deep Dive Sources

| Topic | File |
|---|---|
| respondError + AppError pattern (BE side) | `../03_be/BE_TECH_SUMMARY.md §7` |
| Per-endpoint error notes | `API_SPEC.md` (same folder) |
| Security rule (SEC-05): never return raw `err.Error()` to clients | enforced via `respondError` — see `../03_be/BE_TECH_SUMMARY.md §7` |
