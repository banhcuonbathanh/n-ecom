# Integration & E2E Test Plan

> **Owner:** BE (P7-5.1–5.3) · FE+QA (P7-5.4)
> **Status:** P7-5.1 ✅ · P7-5.2 ⬜ · P7-5.3 ⬜ · P7-5.4 ⬜
> **MASTER rows:** P7-5.1 → P7-5.4

---

## Why Two Layers

| Layer | What it tests | Stack |
|---|---|---|
| **BE HTTP integration** (P7-5.1–5.3) | Every API endpoint + auth + SSE/WS reconnect — against a real MySQL test DB and Redis. No browser. | Go `net/http/httptest` + real DB + real Redis |
| **Full-stack E2E** (P7-5.4) | Complete user journeys from a real browser: QR scan → menu → cart → checkout → KDS → payment. | Playwright + full `docker compose up` |

BE integration tests catch broken contract between handler↔service↔DB.
E2E tests catch broken contract between FE↔BE and broken user flows.

---

## Prerequisites

### BE integration tests (P7-5.1–5.3)
```bash
# 1. Start the Docker stack (MySQL + Redis must be running)
docker compose up -d mysql redis

# 2. Create the test database (one-time)
docker compose exec mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
  -e "CREATE DATABASE IF NOT EXISTS banhcuon_test;"

# 3. Set env vars
export TEST_DB_DSN="root:secret@tcp(localhost:3306)/banhcuon_test?parseTime=true"
export TEST_REDIS_ADDR="localhost:6379"
# JWT_SECRET is auto-set by testhelper if absent
```

### Playwright E2E (P7-5.4)
```bash
# Full stack must be running
docker compose up -d

# Install Playwright (once)
cd fe && npx playwright install --with-deps

# Seed the dev DB with known accounts and tables
docker compose exec mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" banhcuon < scripts/seed.sql
```

---

## How to Run

```bash
# BE integration (auth)
go test -tags integration -v ./be/integration/...

# BE integration (specific test)
go test -tags integration -v ./be/integration/... -run TestIntegration_Login_Success

# Playwright E2E (once implemented)
cd fe && npx playwright test
cd fe && npx playwright test --ui          # interactive mode
cd fe && npx playwright test auth.spec.ts  # single spec
```

---

## P7-5.1 — Auth Integration Tests ✅

**Files created:**
- `be/internal/testhelper/testhelper.go` — shared test infrastructure
- `be/integration/auth_test.go` — 11 test cases

**What the testhelper does:**
1. Reads `TEST_DB_DSN` → skips test if not set
2. Opens `*sql.DB`, runs `goose up` (idempotent migrations)
3. Connects Redis on DB 15 (isolated from dev data)
4. Builds a real Gin router (auth routes only)
5. Starts `httptest.NewServer` with a cookie-jar `http.Client`
6. Registers `t.Cleanup` → flushes Redis DB 15, closes DB

**Test cases:**

| Test | Expected |
|---|---|
| `TestIntegration_Login_Success` | 200 + `access_token` + `refresh_token` cookie |
| `TestIntegration_Login_WrongPassword` | 401 |
| `TestIntegration_Login_MissingFields` | 400 |
| `TestIntegration_Login_RateLimit` | 401 ×5, then 429 on 6th attempt |
| `TestIntegration_Refresh_ValidCookie` | 200 + new `access_token` |
| `TestIntegration_Refresh_NoCookie` | 401 |
| `TestIntegration_Guest_ValidQRToken` | 200 + guest JWT + table info |
| `TestIntegration_Guest_InvalidToken` | 404 |
| `TestIntegration_Me_WithToken` | 200 + staff profile |
| `TestIntegration_Me_NoToken` | 401 |
| `TestIntegration_Logout` | 204 → then refresh returns 401 (token revoked) |

**Test isolation pattern:**
```
setup(t) = NewTestServer → TruncateAll → SeedAdmin
           ↑ each test starts with a clean DB
t.Cleanup = FlushDB(Redis 15) + close httptest server
           ↑ runs after each test completes
```

---

## P7-5.2 — Order + Payment Integration Tests ⬜

**Dep:** P7-5.1 ✅

**Plan:**

Extend `testhelper.go` to add a full router (including orders, payments, tables, products) and additional seed helpers:

```
SeedCategory(t, db)  →  one category row
SeedProduct(t, db)   →  one available product in that category
SeedTable(t, db)     →  already exists (for guest login)
```

**Test cases to write** (`be/integration/order_test.go`):

| Test | Scenario |
|---|---|
| `TestIntegration_CreateOrder_Success` | Guest JWT + valid product → 201 + order ID |
| `TestIntegration_CreateOrder_ComboExpand` | Combo product → order_items includes sub-items |
| `TestIntegration_CreateOrder_DuplicateTable` | Active order exists for table → 409 |
| `TestIntegration_GetOrder` | GET /orders/:id → 200 + order detail |
| `TestIntegration_CancelOrder_Under30Percent` | < 30% served → 200 cancel |
| `TestIntegration_CancelOrder_Over30Percent` | ≥ 30% served → 422 |
| `TestIntegration_UpdateItemServed` | Chef role → PATCH qty_served → 200 |
| `TestIntegration_UpdateStatus_AutoReady` | All items served → order status = ready |
| `TestIntegration_CreatePayment_Success` | Cashier + ready order → 201 payment |
| `TestIntegration_CreatePayment_OrderNotReady` | Order not ready → 422 |
| `TestIntegration_VNPayWebhook_ValidSignature` | Valid HMAC → 200 + order paid |
| `TestIntegration_VNPayWebhook_InvalidSignature` | Bad HMAC → 400 |
| `TestIntegration_VNPayWebhook_Idempotent` | Duplicate webhook → 200 (no double payment) |

**How the router grows:**

```go
// testhelper.go — replace buildAuthRouter with buildFullRouter
func buildFullRouter(sqlDB *sql.DB, rdb *redis.Client) *gin.Engine {
    // wire all repos: auth, product, order, payment, table
    // add routes: /auth/* + /orders/* + /payments/* + /products/* + /tables/*
    // skip: SSE, WS, background jobs (tested separately in P7-5.3)
}
```

---

## P7-5.3 — SSE + WS Reconnect Tests ⬜

**Dep:** P7-5.2 ✅

**Plan:** Test reconnect behavior using `http.Get` with streaming and a `context` with timeout.

**Test cases** (`be/integration/realtime_test.go`):

| Test | Scenario |
|---|---|
| `TestIntegration_SSE_OrderStream` | Connect to `GET /orders/:id/events` → receive `order.updated` event after status change |
| `TestIntegration_SSE_AdminStream` | Manager JWT → `GET /sse/admin` → receive event after order created |
| `TestIntegration_WS_KDS_Connect` | WS connect to `/ws/kds` → receive new order payload |
| `TestIntegration_WS_LiveOrders` | WS connect to `/ws/orders-live` → receive status change |

**Reconnect behavior** is tested by:
1. Connect → verify initial message received
2. Force-close the Redis pub/sub → verify the client gets EOF
3. Client reconnects (simulated) → verify it receives the next event

---

## P7-5.4 — Playwright E2E (Full Browser) ⬜

**Dep:** P7-5.1 ✅ · P7-3 ✅ (payment handler tests)
**Sessions:** 2

**Files to create:**
```
fe/e2e/
  auth.spec.ts         ← login / logout / session expire
  guest-order.spec.ts  ← QR scan → menu → cart → checkout → order page
  kds.spec.ts          ← chef logs in → sees new order → marks items served
  payment.spec.ts      ← cashier → creates payment → VNPay sandbox webhook
  admin.spec.ts        ← manager → overview → live floor → cancel order
```

**Config** (`fe/playwright.config.ts`):
```ts
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
  },
  webServer: {
    command: 'docker compose up -d',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
```

**Golden path test** (`guest-order.spec.ts`):
```
1. Navigate to /table/{qr_token}         → auto-login as guest → redirect /menu
2. Click product card                    → product detail page
3. Tap Add to cart                       → cart count = 1
4. Open cart → tap Thanh toán           → checkout form
5. Fill name + phone, pick payment       → submit
6. Assert redirect to /order/:id         → order status = pending
7. In another browser (chef):            → KDS shows the new order
8. Chef marks all items served           → order status = ready
9. Cashier creates payment               → payment status = pending_payment
10. VNPay webhook fires (mock)           → order status = paid
```

**Accounts used** (from `scripts/seed.sql`):
| Role | Username | Password |
|---|---|---|
| admin | admin | admin123 |
| manager | manager1 | manager123 |
| chef | chef1 | chef123 |
| cashier | cashier1 | cashier123 |

---

## File Map

```
be/
  internal/
    testhelper/
      testhelper.go        ← ✅ DB setup, seed helpers, router builder
  integration/
    auth_test.go           ← ✅ 11 auth endpoint tests
    order_test.go          ← ⬜ P7-5.2 (to create)
    realtime_test.go       ← ⬜ P7-5.3 (to create)

fe/
  playwright.config.ts     ← ⬜ P7-5.4 (to create)
  e2e/
    auth.spec.ts           ← ⬜ P7-5.4
    guest-order.spec.ts    ← ⬜ P7-5.4
    kds.spec.ts            ← ⬜ P7-5.4
    payment.spec.ts        ← ⬜ P7-5.4
    admin.spec.ts          ← ⬜ P7-5.4
```

---

## Constraints

- **No `t.Parallel()`** in integration tests — they share Redis DB 15; sequential only.
- **Test DB DSN** must point to a separate DB (`banhcuon_test`), never the dev DB.
- **Playwright** must run against a seeded DB — run `seed.sql` before E2E.
- Integration tests are excluded from `go test ./...` by the `integration` build tag; they only run when explicitly passed `-tags integration`.
