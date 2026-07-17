# BE Quality Audit — Structure & Patterns
> BE Quality Audit — 2026-06-11 — branch experience_claude.md_system_1

## Summary

The backend is well-structured overall: strict handler→service→repository→db layering is respected throughout, AppError unwrapping is consistent, transaction helpers are used for all multi-step mutations, and middleware dependencies are properly injected via interfaces. No direct DB calls exist in handlers and no gin imports exist in services.

Four issues require fixing before go-live: a data race in the WebSocket hub that mutates a shared map under a read lock (CRITICAL), a copy-paste bug where `LiveHandler` subscribes to the wrong Redis channel (MAJOR), `binding:"required"` on `int64 price` fields that reject free products (MAJOR), and `err == sql.ErrNoRows` comparisons that break wrapped errors (MINOR). Everything else is cosmetic or a suggestion.

Counts by severity: 1 CRITICAL, 3 MAJOR, 5 MINOR, 2 SUGGESTION.

---

## Findings

### S-01 [🔴 CRITICAL] WebSocket hub mutates map under read lock — data race

- **Where:** `be/internal/websocket/hub.go:47-57`
- **Problem:**
  ```go
  case message := <-h.broadcast:
      h.mu.RLock()
      for client := range h.clients {
          select {
          case client.send <- message:
          default:
              close(client.send)
              delete(h.clients, client)  // ← WRITE under RLock
          }
      }
      h.mu.RUnlock()
  ```
- **Why it matters:** `delete(h.clients, client)` is a write to the map. Holding `RLock` while writing is undefined behaviour in Go — concurrent `register` / `unregister` cases (which acquire `Lock`) can race against this, causing a crash or silent map corruption. `go test -race` will flag this.
- **Fix:** Promote to `h.mu.Lock()` / `h.mu.Unlock()` for the broadcast case, or collect the full-buffer clients in a slice and delete them after `RUnlock()`.

---

### S-02 [🟠 MAJOR] `LiveHandler` subscribes to `orders:kds` instead of `orders:live`

- **Where:** `be/internal/websocket/handler.go:22-23`
- **Problem:**
  ```go
  func LiveHandler(hub *Hub, rdb *redis.Client) gin.HandlerFunc {
      return wsHandler(hub, rdb, "orders:kds")  // copy-paste: should be "orders:live"
  }
  ```
- **Why it matters:** The POS live-orders screen (`GET /ws/orders-live`, cashier role) receives the KDS kitchen feed instead of its own channel. Events published to `orders:live` are silently dropped. The KDS screen receives every event twice (two subscribers on `orders:kds`).
- **Fix:** Change the argument to `"orders:live"` and ensure order events are also published to `orders:live` when relevant.

---

### S-03 [🟠 MAJOR] `binding:"required"` on `int64 price` fields rejects price=0

- **Where:** `be/internal/handler/product_handler.go:84,125,360`
- **Problem:**
  ```go
  Price int64 `json:"price" binding:"required,min=0"`
  ```
  `required` on a numeric type treats `0` as the zero-value and rejects it with 400. A free combo or a 0-VND special item cannot be created.
- **Why it matters:** This is explicitly called out in the project's backend skill as a critical gotcha. The same pattern appears in `createProductRequest` (line 84), `updateProductRequest` (line 125), and `createComboRequest` (line 360).
- **Fix:**
  ```go
  Price int64 `json:"price" binding:"min=0"`  // remove "required"
  ```

---

### S-04 [🟠 MAJOR] WebSocket endpoints lack RBAC — any valid JWT (including customer) can connect

- **Where:** `be/internal/websocket/handler.go:40-47`
- **Problem:**
  ```go
  _, err := jwtpkg.ParseToken(token)
  if err != nil { ... abort ... }
  // No role check after this — customer JWT passes straight through
  ```
  `GET /ws/kds` is documented as Chef+ and `GET /ws/orders-live` as Cashier+, but only token validity is checked; the role claim is never inspected.
- **Why it matters:** A guest with a valid customer JWT can subscribe to the full kitchen feed (dish names, quantities, order status for every table).
- **Fix:** Parse the claims, extract the role, and enforce `roleLevel[claims.Role] >= roleLevel["chef"]` (KDS) / `roleLevel["cashier"]` (live) before upgrading the connection.

---

### S-05 [🟡 MINOR] `err == sql.ErrNoRows` instead of `errors.Is` — breaks wrapped errors

- **Where:** `be/internal/service/group_service.go:29,52,92`; `be/internal/service/ingredient_service.go:69,101,108`; `be/internal/service/training_service.go:152,199,233,263,303,311,333`; `be/internal/service/task_service.go:200`
- **Problem:**
  ```go
  if err == sql.ErrNoRows {   // ← equality, not errors.Is
  ```
  If a driver or wrapper wraps the error, this check silently misses it and falls through to a generic 500. Correct form throughout the rest of the codebase is `errors.Is(err, sql.ErrNoRows)`.
- **Fix:** Replace all `err == sql.ErrNoRows` with `errors.Is(err, sql.ErrNoRows)`.

---

### S-06 [🟡 MINOR] `CancelOrderItem` and `UpdateOrderItemQuantity` perform delete/update + recalculate non-atomically

- **Where:** `be/internal/service/order_service.go:634-640` (CancelOrderItem); `be/internal/service/order_service.go:688-694` (UpdateOrderItemQuantity)
- **Problem:**
  ```go
  s.repo.DeleteOrderItem(ctx, itemID)         // step 1 — no transaction
  s.repo.RecalculateTotalAmount(ctx, orderID) // step 2 — separate call
  ```
  If the process crashes between step 1 and step 2, the order total is permanently stale. Contrast with `AppendOrderItems` (correctly atomic in `order_repo.go:122-162`) and `CreateOrderWithItems` (also correct).
- **Fix:** Add `DeleteItemAndRecalculate` and `UpdateItemQtyAndRecalculate` transactional helpers to `OrderRepository`, mirroring `AppendOrderItems`.

---

### S-07 [🟡 MINOR] Auth middleware uses a single generic error code `AUTH_001` for all auth failures

- **Where:** `be/internal/middleware/auth.go:37,45,47`
- **Problem:** The project's own error contract (SKILL.md) specifies `MISSING_TOKEN` (no header), `TOKEN_EXPIRED` (exp passed), and separate codes. The middleware collapses all three to `AUTH_001`. A client developer or the FE cannot distinguish "no token" from "token expired" without parsing the message string.
- **Fix:** Use the canonical codes from the error contract:
  ```go
  case header missing:   "MISSING_TOKEN"
  case jwtpkg.ErrTokenExpired: "TOKEN_EXPIRED"
  default:               "INVALID_TOKEN"
  ```

---

### S-08 [🟡 MINOR] `CancelOrder` returns `ErrCancelThreshold` for wrong-status guard

- **Where:** `be/internal/service/order_service.go:578-580`; same pattern at line 679
- **Problem:**
  ```go
  default:
      return ErrCancelThreshold  // wrong: this is a status guard, not a 30% check
  ```
  When an order is in `ready` or `paid` state and a cancel is attempted, the client receives `CANCEL_THRESHOLD` (422). The client shows the wrong error message ("already 30% served"). The same wrong sentinel is returned by `UpdateOrderItemQuantity:679` for "order not editable".
- **Fix:** Add `ErrOrderNotCancellable = NewAppError(409, "ORDER_NOT_CANCELLABLE", "Đơn hàng không thể huỷ ở trạng thái này")` and use it for the status guard.

---

### S-09 [🟡 MINOR] CORS middleware accepts only a single origin string (no multi-origin support)

- **Where:** `be/cmd/server/main.go:122-127`
- **Problem:**
  ```go
  corsOrigins := os.Getenv("CORS_ORIGINS")
  c.Header("Access-Control-Allow-Origin", corsOrigins)
  ```
  If `CORS_ORIGINS` contains multiple comma-separated origins (e.g. staging + production), the header is set verbatim to the entire string, which browsers reject. There is also no `Vary: Origin` header.
- **Fix:** Split `corsOrigins` by comma, match `c.Request.Header.Get("Origin")` against the list, echo the matched origin, and add `c.Header("Vary", "Origin")`.

---

### S-10 [💡 SUGGESTION] All handlers inject concrete `*service.Foo` — unit testing handlers requires a real service

- **Where:** every file in `be/internal/handler/` (e.g. `order_handler.go:14`, `payment_handler.go:15`)
- **Problem:** Handlers accept concrete service pointers. Handler-level unit tests require constructing a full service with mock repos.
- **Fix:** Define minimal service interfaces consumed by each handler (same pattern used between PaymentService and OrderService via `OrderReader`/`OrderWriter`). This is a suggestion, not a blocker — the integration tests cover the full stack.

---

### S-11 [💡 SUGGESTION] `SearchActiveOrders` does in-memory filtering over a full DB scan

- **Where:** `be/internal/service/order_service.go:194-213`
- **Problem:** Every search request loads ALL active orders + ALL their items into memory, then filters in Go. For a busy floor this is acceptable (dozens of orders), but it's technically unbounded.
- **Fix:** Add a `q` parameter to `ListActiveOrders` repo method and push the filter to SQL (`WHERE order_number LIKE ? OR ...`). Low priority for current scale.

---

## What is GOOD (keep doing)

- **Strict layer boundaries:** no gin imports in service, no DB calls in handlers — consistently enforced in every domain.
- **AppError unwrapping pattern:** `handleServiceError` correctly uses `errors.As` and never leaks internal error text to clients.
- **Transaction correctness for the main paths:** `CreateOrderWithItems` and `AppendOrderItems` correctly wrap insert + recalculate in a single tx with deferred rollback.
- **Dependency injection via interfaces:** `OrderReader`/`OrderWriter`, `ProductLookup`, `IsActiveChecker`, `orderRedisClient`, `paymentRedisClient` — all correctly defined by the consumer, not the provider.
- **Middleware injection:** `AuthRequired(IsActiveChecker)` receives the checker as an explicit interface, preventing silent skip of the `is_active` check.
- **SSE hygiene:** all four SSE handlers use `context.WithCancel(c.Request.Context())`, defer `pubsub.Close()`, defer `ticker.Stop()`, and select on `ctx.Done()` — no goroutine leaks.
- **WebSocket ping/pong and write deadlines:** `writePump` correctly sets `WriteDeadline` before every write and sends a periodic `PingMessage`; `readPump` sets `SetReadDeadline` and extends it on pong.
- **Combo header unit_price=0:** `expandCombo` correctly sets `UnitPrice: formatPrice(0)` on the header row to prevent double-counting in `RecalculateTotalAmount`.
- **Idempotent `MarkOrderPaid` / `MarkOrderDelivered`:** both check for the already-in-target-status case and return nil — safe against duplicate webhook delivery.
- **Rate-limit implementation in AuthService:** per-IP Redis INCR + 60s TTL with same error for not-found vs wrong password (no oracle).
- **Graceful shutdown:** `http.Server.Shutdown` with 10s context, `jobCancel()` deferred — background jobs receive signal to stop cleanly.
