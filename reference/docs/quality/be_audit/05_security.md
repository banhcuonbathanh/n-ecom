# Security Audit
> BE Quality Audit — 2026-06-11 — branch experience_claude.md_system_1

## Summary

The backend has a solid security foundation: JWT algorithm is pinned (HMAC-only, alg=none rejected), bcrypt cost=12, refresh tokens are hashed before storage, HMAC signatures are verified before processing any payment webhook payload, and server errors are not exposed to clients via a clean `handleServiceError` wrapper. Seven issues were found: two major (no rate limiting on `/auth/register`; WebSocket token in query param logged by `gin.Logger`), and five minor-to-suggestion level (no refresh token rotation; no RBAC check in WebSocket; SSE order stream has no ownership guard for customers; `err.Error()` exposed in validation messages; `/metrics` endpoint unauthenticated). No hardcoded production secrets were found in `.go` files; the committed `.env` at project root contains a weak `JWT_SECRET` string (`devsecret` is in `be/.env.local`, not committed). **Total: 0 critical, 2 major, 4 minor, 1 suggestion.**

---

## Findings

### SEC-01 [🟠 MAJOR] No rate limiting on POST /auth/register
- **Where:** `be/internal/service/auth_service.go:205-225` · `be/cmd/server/main.go:156`
- **Problem:**
  ```go
  // auth_service.go:205 — Register has NO ratelimit check
  func (s *AuthService) Register(ctx context.Context, username, password, ipAddr, userAgent string) (LoginResult, error) {
      _, err := s.repo.GetStaffByUsername(ctx, username)
      ...
      hash, err := bcryptpkg.Hash(password) // bcrypt at cost=12 per request
  ```
  The `Register` handler is a public, unauthenticated endpoint (`authR.POST("/register", authH.Register)` — no `authMW`). `Login` has a 5 req/min IP rate limit, but `Register` has none. Bcrypt at cost=12 makes each call CPU-intensive (~300ms+).
- **Why it matters:** An attacker can hammer `/auth/register` to flood the database with junk accounts and burn server CPU, effectively a DoS. Staff accounts created this way receive `role=cashier` which is a real low-privilege foothold.
- **Fix:** Either (a) protect `/auth/register` with `authMW + AtLeast("manager")` (staff self-registration should probably not be public), or (b) add the same IP rate-limit check used in `Login` (`checkLoginRateLimit`) at the top of `Register`. If public registration is intentional by design, option (b) is the minimum.

---

### SEC-02 [🟠 MAJOR] WebSocket JWT token in query param logged by gin.Logger
- **Where:** `be/internal/websocket/handler.go:31` · `be/cmd/server/main.go:117`
- **Problem:**
  ```go
  // websocket/handler.go:31
  token := c.Query("token")  // ?token=<ACCESS_JWT>
  // main.go:117
  r.Use(gin.Logger(), ...)   // default logger writes full request URL including query string
  ```
  Browser WebSocket APIs cannot set custom headers, so the access JWT is passed as `?token=<JWT>` in the URL. Gin's default logger writes the full request URI to stdout, which includes the raw JWT. This token will appear in:
  - Container/process logs (stdout, `docker compose logs`)
  - Any reverse proxy access log (Caddy, nginx) that logs the full URI
  - Log aggregation systems (Grafana Loki, CloudWatch, etc.)
- **Why it matters:** Anyone with read access to logs can extract valid staff access tokens and replay them up to their TTL (24h default).
- **Fix:** Replace `gin.Logger()` with a custom logger that redacts the `token` query param for WebSocket upgrade requests. Alternatively, implement the short-lived ticket pattern: issue a one-time opaque code via a protected REST endpoint, then exchange it for a WS connection server-side.

---

### SEC-03 [🟡 MINOR] WebSocket endpoints bypass is_active check and RBAC
- **Where:** `be/internal/websocket/handler.go:40-47` · `be/cmd/server/main.go:337-339`
- **Problem:**
  ```go
  // websocket/handler.go:40-47
  _, err := jwtpkg.ParseToken(token)
  if err != nil { ... abort ... }
  // No is_active check, no role check
  conn, err := upgrader.Upgrade(...)
  ```
  The `/ws/kds` and `/ws/orders-live` handlers parse the JWT but skip (1) the `IsStaffActive` Redis/DB check and (2) any role-level enforcement. The comment says "Chef+" for KDS, but no `AtLeast("chef")` guard is applied.
- **Why it matters:** A deactivated staff member whose token has not yet expired can connect to the KDS WebSocket and observe live kitchen orders. A cashier (level 2) can connect to the same stream a chef would see, violating the intended role separation.
- **Fix:** Either route WS through `authMW` (requires passing a query-to-header adapter) or inline the same two checks in `wsHandler`: call `authSvc.IsStaffActive(ctx, claims.Subject)` and verify `claims.Role` meets the minimum role for that channel.

---

### SEC-04 [🟡 MINOR] SSE order stream has no ownership check for customers
- **Where:** `be/internal/sse/handler.go:21-70` · `be/cmd/server/main.go:239`
- **Problem:**
  ```go
  // sse/handler.go:41-42
  channel := fmt.Sprintf("order:%s", orderID)
  pubsub := rdb.Subscribe(ctx, channel)
  // No check: does this order belong to this customer's table?
  ```
  The route is inside `orderR` which has `authMW`, so a valid JWT is required. However, once authenticated as a customer, any customer can subscribe to the SSE stream of any order ID they can guess/enumerate. There is no validation that `claims.TableID == order.table_id` as `GetOrder` enforces (see `order_service.go:116-119`).
- **Why it matters:** A customer at table 1 can poll order status updates from table 2's orders by guessing UUIDs (impractical for random UUIDs, but a vulnerability nonetheless). For guests with `sub="guest"`, all tables share the same `sub`, so the only isolation is the table_id in the claim.
- **Fix:** In `StreamOrder`, extract `claims` from the context and, for `role=="customer"`, fetch the order and verify `order.table_id == claims.TableID` before subscribing to the Redis channel, mirroring the logic in `order_service.go:116`.

---

### SEC-05 [🟡 MINOR] Raw `err.Error()` from validation bindings exposed to clients
- **Where:** `be/internal/handler/staff_handler.go:87,136,197` · `be/internal/handler/ingredient_handler.go:104,137,180` · `be/internal/handler/training_handler.go:54,103,194`
- **Problem:**
  ```go
  // staff_handler.go:87
  if err := c.ShouldBindJSON(&req); err != nil {
      respondError(c, http.StatusBadRequest, "INVALID_INPUT", err.Error())
  ```
  Gin's binding errors include internal field names and Go struct tag metadata, e.g. `"Key: 'CreateStaffInput.Username' Error:Field validation for 'Username' failed on the 'min' tag"`. This leaks internal data model structure.
- **Why it matters:** Information disclosure. An attacker learns the internal type/field names and validation rules, lowering the bar for crafting targeted payloads.
- **Fix:** Replace `err.Error()` with a generic fixed string like `"Dữ liệu đầu vào không hợp lệ"` for all binding errors, consistent with other handlers (e.g., `auth_handler.go:33`, `order_handler.go:72`).

---

### SEC-06 [🟡 MINOR] No refresh token rotation on /auth/refresh
- **Where:** `be/internal/service/auth_service.go:144-178`
- **Problem:**
  ```go
  // auth_service.go:168 — updates last_used but does NOT issue a new refresh token
  if err := s.repo.UpdateRefreshTokenLastUsed(ctx, tokenHash); err != nil { ... }
  accessToken, err := jwtpkg.GenerateAccessToken(staff.ID, string(staff.Role))
  return accessToken, nil  // same refresh token continues to work
  ```
  Every call to `/auth/refresh` reuses the same refresh token. There is no rotation (issue new token + revoke old on each refresh cycle).
- **Why it matters:** If a refresh token is stolen from a cookie (e.g., via a CSRF attack, network tap, or log exposure from SEC-02), the attacker can silently refresh access tokens indefinitely. Rotation means a stolen token used by the attacker would invalidate the victim's session, making theft detectable.
- **Fix:** On each `/auth/refresh` call: (1) delete the old token hash, (2) generate and persist a new refresh token, (3) update the `Set-Cookie` header. This is RFC-style "refresh token rotation".

---

### SEC-07 [💡 SUGGESTION] /metrics endpoint is unauthenticated and publicly accessible
- **Where:** `be/cmd/server/main.go:120-121`
- **Problem:**
  ```go
  // main.go:120-121
  r.GET("/metrics", gin.WrapH(promhttp.Handler()))
  ```
  The Prometheus `/metrics` endpoint is mounted on the public router without any authentication middleware. The comment says "scraped by Prometheus, not proxied through Caddy", but this is only enforced by Caddy's `handle /api/*` block — the BE port (8080) is still directly reachable inside Docker or from the host.
- **Why it matters:** Prometheus metrics expose HTTP request counts per path, response codes, and latency. An attacker who reaches `:8080/metrics` directly (or if Caddy is misconfigured) gets a map of API usage patterns, error rates, and timing information useful for fingerprinting and timing attacks.
- **Fix:** Either (a) bind the metrics endpoint to a separate internal port not exposed outside Docker, or (b) add IP allowlist middleware (localhost/internal subnet only), or (c) require `Authorization: Bearer` with a scrape token. Option (a) is cleanest.

---

## Verified OK (keep doing)

- **JWT algorithm pinned:** `pkg/jwt/jwt.go:101` — `if _, ok := t.Method.(*gojwt.SigningMethodHMAC); !ok { return nil, fmt.Errorf("unexpected signing method") }` — alg=none and RSA confusion attacks rejected.
- **JWT secret from env, not hardcoded:** `pkg/jwt/jwt.go:52-55` — `os.Getenv("JWT_SECRET")` — returns error if empty, never falls back to a default.
- **Access token TTL:** 24h default (configurable via `JWT_ACCESS_TTL`). Reasonable for a restaurant POS context.
- **bcrypt cost=12:** `pkg/bcrypt/bcrypt.go:12` — appropriate cost factor.
- **Refresh tokens hashed before storage:** `auth_service.go:387-399` — SHA-256 of random 32 bytes stored in DB; raw token sent to client in httpOnly cookie. Token theft from DB does not yield usable tokens.
- **Timing-safe bcrypt compare:** `pkg/bcrypt/bcrypt.go:31` — uses `bcrypt.CompareHashAndPassword`, which is constant-time.
- **Same error for wrong username vs wrong password:** `auth_service.go:78-82` — `ErrInvalidCredentials` returned for both cases; no username enumeration oracle.
- **is_active enforced per request:** `middleware/auth.go:54-59` — checked on every non-customer request with Redis cache (5min TTL) + DB fallback.
- **Login brute-force rate limiting:** `auth_service.go:346-365` — 5 attempts/min per IP via Redis INCR.
- **Payment webhook HMAC verification first:** `handler/payment_handler.go:81, 104, 128` — signature verified before any business logic is executed, for all three gateways.
- **Payment amount mismatch guard:** `payment_service.go:230-236` — gateway-reported amount compared to DB-stored amount; rejects on mismatch.
- **Payment idempotency:** `payment_service.go:71-75` and `processWebhookResult:222-224` — duplicate payment/webhook calls short-circuit cleanly.
- **Server errors not leaked:** `handler/respond.go:24-36` — `handleServiceError` wraps untyped errors as `COMMON_002` with no internal detail.
- **CORS not wildcard:** `main.go:122-136` — single origin from `CORS_ORIGINS` env var, defaulting to `localhost:3000`.
- **No fmt.Sprintf-built SQL with user data:** `ingredient_repo.go:194` uses `fmt.Sprintf` to build the SET clause, but only with **hardcoded column name strings** from the `sets` slice — user-controlled values are always bound as `?` parameters. This is not an injection risk.
- **IDOR order ownership:** `order_service.go:116-119` (GetOrder), `469:476-479` (AddItems), `569-571` (Cancel) — all three operations check `order.table_id == callerID` for customers.
- **Staff role hierarchy enforced:** `staff_service.go:107-111` — cannot create/promote to a role >= caller's level.
- **No file upload path traversal:** `file_handler.go:65-66` — filename is replaced by a server-generated UUID; only extension from `header.Filename` is used.
- **MIME type sniffed server-side:** `file_handler.go:54-60` — reads first 512 bytes and calls `http.DetectContentType`; allowlist is enforced on the detected type, not the client-supplied Content-Type header.
- **File upload size capped:** `file_handler.go:39` — `http.MaxBytesReader` at 10MB+1024.
- **Secrets from env, not hardcoded:** All payment secrets (`VNPAY_HASH_SECRET`, `MOMO_SECRET_KEY`, `ZALOPAY_KEY1/KEY2`) and `JWT_SECRET` read via `os.Getenv` with explicit empty-check guards.
- **Panic recovery present:** `main.go:117` — `gin.Recovery()` middleware installed globally.
- **No passwords/tokens written to structured logs:** slog calls in service layer log only error objects, never raw credentials.
