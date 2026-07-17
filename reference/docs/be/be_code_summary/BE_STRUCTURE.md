# BE Folder Structure

> `be/` — last updated 2026-06-05 (P-BEDOC-1).
> Re-generate manually after adding files. Verify against `be/cmd/server/main.go` route registrations.

---

## Folder Tree

```
be/
│
├── cmd/                                ← Entry points (one main.go each)
│   ├── server/main.go                  ← HTTP server: DI wiring, routes, jobs, graceful shutdown (auto-runs migrations on boot)
│   ├── seed/main.go                    ← One-shot: insert demo accounts for all roles (bcrypt-hashed)
│   ├── qr/main.go                      ← Print QR URLs for active tables (uses FE_HOST)
│   └── demo_order/main.go              ← E2E smoke: guest scan → /auth/guest → /products → /orders
│
├── migrations/                         ← Goose SQL (001–015) — DDL; sqlc reads column types from here
├── query/                              ← Hand-written SQL + `-- name:` annotations → sqlc input (see BE_SQLC_GUIDE.md)
├── sqlc.yaml                           ← sqlc config (engine, gen options, column overrides)
│
├── integration/                        ← Integration tests (hit real DB + Redis)
│   ├── auth_test.go
│   ├── helpers_test.go
│   ├── order_test.go
│   └── realtime_test.go
│
├── internal/
│   │
│   ├── db/                            ← sqlc generated — DO NOT EDIT BY HAND
│   │   ├── db.go                      ← DBTX interface + New()
│   │   ├── models.go                  ← Generated DB row structs
│   │   ├── querier.go                 ← Generated Querier interface
│   │   ├── auth.sql.go                ← staff + refresh_tokens queries
│   │   ├── files.sql.go               ← files queries
│   │   ├── orders.sql.go              ← orders + order_items + order_sequences queries
│   │   ├── payments.sql.go            ← payments queries
│   │   └── products.sql.go            ← products + categories + toppings + combos queries
│   │
│   ├── handler/                       ← Gin layer: parse request → call service → respond
│   │   ├── respond.go                 ← respondJSON() + respondError() helpers
│   │   ├── auth_handler.go            ← Login · Refresh · Guest · Logout · Me
│   │   ├── product_handler.go         ← Products · Categories · Toppings · Combos CRUD
│   │   ├── order_handler.go           ← Create · List · Get · UpdateStatus · Cancel · AddItems · UpdateItemServed
│   │   ├── payment_handler.go         ← Create · GetPayment · VNPay/MoMo/ZaloPay webhooks
│   │   ├── group_handler.go           ← CreateGroup · GetGroup · AddToGroup · RemoveFromGroup · DisbandGroup
│   │   ├── staff_handler.go           ← ListStaff · CreateStaff · GetStaff · UpdateStaff · SetStatus · Delete
│   │   ├── table_handler.go           ← ListTables · CreateTable · UpdateTable · DecodeQR
│   │   ├── analytics_handler.go       ← GetSummary · GetTopDishes · GetStaffPerformance
│   │   ├── marketing_handler.go       ← GetSpend (static campaign data — no DB)
│   │   ├── ingredient_handler.go      ← Ingredient + StockMovement CRUD
│   │   ├── task_handler.go            ← GetTaskStats · GetStaffTasks · CreateTask (staff_tasks)
│   │   ├── training_handler.go        ← Guides CRUD · ListGuideProgress · StaffProgressDetail · UpdateManagerNotes
│   │   └── file_handler.go            ← Upload (multipart)
│   │
│   ├── service/                       ← Business logic — no gin, fully testable
│   │   ├── deps.go                    ← Shared interfaces / dependency types
│   │   ├── errors.go                  ← Sentinel errors (ErrNotFound, ErrUnauthorized …)
│   │   ├── auth_service.go            ← Login · Refresh · GuestToken · Logout · Me
│   │   ├── auth_service_test.go
│   │   ├── product_service.go         ← Products · Categories · Toppings · Combos + Redis cache
│   │   ├── order_service.go           ← Place order · Status transitions · Cancel · SSE publish
│   │   ├── order_service_test.go
│   │   ├── payment_service.go         ← Create payment · Webhook confirm · Timeout logic
│   │   ├── payment_service_test.go
│   │   ├── group_service.go           ← Group CRUD + SSE publish
│   │   ├── staff_service.go           ← Staff CRUD + active/inactive toggle
│   │   ├── analytics_service.go       ← Revenue summary · Top dishes · Staff performance
│   │   ├── ingredient_service.go      ← Ingredient CRUD + low-stock + stock movements
│   │   ├── task_service.go            ← Staff task stats + per-staff tasks + create
│   │   └── training_service.go        ← Guide CRUD + role targeting + progress + quiz attempts
│   │
│   ├── repository/                    ← sqlc wrappers: DB calls only, no business logic
│   │   ├── auth_repo.go
│   │   ├── product_repo.go
│   │   ├── order_repo.go
│   │   ├── payment_repo.go
│   │   ├── staff_repo.go
│   │   ├── table_repo.go
│   │   ├── analytics_repo.go
│   │   ├── ingredient_repo.go
│   │   ├── task_repo.go
│   │   ├── training_repo.go
│   │   └── file_repo.go
│   │
│   ├── middleware/
│   │   ├── auth.go                    ← AuthRequired: JWT parse + is_active check
│   │   └── rbac.go                    ← AtLeast("role"): role hierarchy enforcement
│   │
│   ├── sse/                           ← Server-Sent Events (Redis pub/sub → HTTP stream)
│   │   ├── handler.go                 ← StreamOrder: GET /orders/:id/events
│   │   ├── group_handler.go           ← StreamGroup: GET /orders/group/:id/events
│   │   ├── admin_handler.go           ← StreamAdmin: GET /sse/admin
│   │   └── monitor_handler.go         ← StreamOrderMonitor: GET /sse/order-monitor/:id
│   │
│   ├── websocket/                     ← WebSocket hub for KDS + live orders
│   │   ├── hub.go                     ← Hub: register · unregister · broadcast
│   │   ├── client.go                  ← Client: read/write pumps
│   │   └── handler.go                 ← KDSHandler · LiveHandler (upgrade + subscribe)
│   │
│   ├── payment/                       ← Payment provider clients (HMAC sign/verify)
│   │   ├── vnpay.go                   ← VNPay redirect URL builder + webhook verifier
│   │   ├── momo.go                    ← MoMo API v2 + HMAC-SHA256
│   │   └── zalopay.go                 ← ZaloPay + HMAC-SHA256
│   │
│   ├── jobs/                          ← Background goroutines (started in main.go)
│   │   ├── payment_timeout.go         ← Poll DB every 60 s → expire pending payments
│   │   └── file_cleanup.go            ← Poll DB → delete orphaned upload files
│   │
│   └── testhelper/
│       └── testhelper.go              ← Shared test utilities (DB setup, fixtures)
│
└── pkg/                               ← Reusable packages — no import cycle allowed
    ├── bcrypt/
    │   └── bcrypt.go                  ← HashPassword · ComparePassword
    ├── jwt/
    │   └── jwt.go                     ← Sign · Verify · Claims struct
    └── redis/
        ├── client.go                  ← NewClient() + health check
        ├── pubsub.go                  ← Publish · Subscribe helpers
        └── bloom.go                   ← Bloom filter (token reuse detection)
```

---

## Layer Rules (strict)

```
handler → service → repository → db (sqlc)
```

| Layer | Allowed imports | Forbidden |
|---|---|---|
| `handler/` | `service/`, `middleware/`, gin | `repository/`, `db/` directly |
| `service/` | `repository/`, `pkg/`, stdlib | gin, `db/` directly |
| `repository/` | `db/`, stdlib | `service/`, `handler/` |
| `pkg/` | stdlib only | anything in `internal/` |

---

## Route Table

> Source of truth: `be/cmd/server/main.go`. 87 registered routes. Prefix `/api/v1` unless noted.

| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/metrics` | public | Prometheus `promhttp.Handler` |
| GET | `/health` | public | inline |
| POST | `/api/v1/auth/login` | public | `authH.Login` |
| POST | `/api/v1/auth/register` | public | `authH.Register` |
| POST | `/api/v1/auth/refresh` | public | `authH.Refresh` |
| POST | `/api/v1/auth/guest` | public | `authH.Guest` |
| POST | `/api/v1/auth/logout` | auth | `authH.Logout` |
| GET | `/api/v1/auth/me` | auth | `authH.Me` |
| GET | `/api/v1/products` | public | `productH.ListProducts` |
| GET | `/api/v1/products/:id` | public | `productH.GetProduct` |
| GET | `/api/v1/products/all` | manager+ | `productH.ListAllProducts` |
| POST | `/api/v1/products` | manager+ | `productH.CreateProduct` |
| PATCH | `/api/v1/products/:id` | manager+ | `productH.UpdateProduct` |
| PATCH | `/api/v1/products/:id/availability` | manager+ | `productH.UpdateProduct` |
| DELETE | `/api/v1/products/:id` | admin | `productH.DeleteProduct` |
| GET | `/api/v1/categories` | public | `productH.ListCategories` |
| POST | `/api/v1/categories` | manager+ | `productH.CreateCategory` |
| PATCH | `/api/v1/categories/:id` | manager+ | `productH.UpdateCategory` |
| DELETE | `/api/v1/categories/:id` | admin | `productH.DeleteCategory` |
| GET | `/api/v1/toppings` | public | `productH.ListToppings` |
| POST | `/api/v1/toppings` | manager+ | `productH.CreateTopping` |
| PATCH | `/api/v1/toppings/:id` | manager+ | `productH.UpdateTopping` |
| DELETE | `/api/v1/toppings/:id` | admin | `productH.DeleteTopping` |
| GET | `/api/v1/combos` | public | `productH.ListCombos` |
| POST | `/api/v1/combos` | manager+ | `productH.CreateCombo` |
| PATCH | `/api/v1/combos/:id` | manager+ | `productH.UpdateCombo` |
| DELETE | `/api/v1/combos/:id` | admin | `productH.DeleteCombo` |
| POST | `/api/v1/orders` | auth | `orderH.Create` |
| GET | `/api/v1/orders` | chef+ | `orderH.ListLive` |
| GET | `/api/v1/orders/live` | cashier+ | `orderH.ListLive` |
| GET | `/api/v1/orders/history` | cashier+ | `orderH.ListHistory` |
| GET | `/api/v1/orders/:id` | auth | `orderH.Get` |
| PATCH | `/api/v1/orders/:id/status` | chef+ | `orderH.UpdateStatus` |
| DELETE | `/api/v1/orders/:id` | auth | `orderH.Cancel` |
| GET | `/api/v1/orders/:id/events` | auth | `sse.StreamOrder` (SSE) |
| POST | `/api/v1/orders/:id/items` | auth | `orderH.AddItemsToOrder` |
| PATCH | `/api/v1/orders/items/:id/quantity` | auth | `orderH.UpdateItemQuantity` |
| PATCH | `/api/v1/orders/items/:id` | chef+ | `orderH.UpdateItemServed` |
| DELETE | `/api/v1/orders/items/:id` | auth | `orderH.CancelItem` |
| POST | `/api/v1/orders/group` | cashier+ | `groupH.CreateGroup` |
| GET | `/api/v1/orders/group/:id` | auth | `groupH.GetGroup` |
| POST | `/api/v1/orders/group/:id/orders` | cashier+ | `groupH.AddToGroup` |
| DELETE | `/api/v1/orders/group/:id/orders/:orderId` | cashier+ | `groupH.RemoveFromGroup` |
| DELETE | `/api/v1/orders/group/:id` | manager+ | `groupH.DisbandGroup` |
| GET | `/api/v1/orders/group/:id/events` | auth | `sse.StreamGroup` (SSE) |
| POST | `/api/v1/payments` | cashier+ | `paymentH.Create` |
| GET | `/api/v1/payments/:id` | cashier+ | `paymentH.GetPayment` |
| POST | `/api/v1/payments/webhook/vnpay` | public (HMAC) | `paymentH.VNPayWebhook` |
| POST | `/api/v1/payments/webhook/momo` | public (HMAC) | `paymentH.MoMoWebhook` |
| POST | `/api/v1/payments/webhook/zalopay` | public (HMAC) | `paymentH.ZaloPayWebhook` |
| GET | `/api/v1/tables/qr/:token` | public | `tableH.DecodeQR` |
| GET | `/api/v1/tables` | cashier+ | `tableH.ListTables` |
| POST | `/api/v1/tables` | manager+ | `tableH.CreateTable` |
| PATCH | `/api/v1/tables/:id` | manager+ | `tableH.UpdateTable` |
| GET | `/api/v1/staff` | manager+ | `staffH.ListStaff` |
| POST | `/api/v1/staff` | manager+ | `staffH.CreateStaff` |
| GET | `/api/v1/staff/:id` | manager+ | `staffH.GetStaff` |
| PATCH | `/api/v1/staff/:id` | manager+ | `staffH.UpdateStaff` |
| PATCH | `/api/v1/staff/:id/status` | manager+ | `staffH.SetStaffStatus` |
| DELETE | `/api/v1/staff/:id` | admin | `staffH.DeleteStaff` |
| GET | `/api/v1/admin/summary` | manager+ | `analyticsH.GetSummary` |
| GET | `/api/v1/admin/top-dishes` | manager+ | `analyticsH.GetTopDishes` |
| GET | `/api/v1/admin/staff-performance` | manager+ | `analyticsH.GetStaffPerformance` |
| GET | `/api/v1/admin/ingredients` | manager+ | `ingredientH.ListIngredients` |
| GET | `/api/v1/admin/ingredients/low-stock` | manager+ | `ingredientH.ListLowStock` |
| POST | `/api/v1/admin/ingredients` | manager+ | `ingredientH.CreateIngredient` |
| GET | `/api/v1/admin/ingredients/:id` | manager+ | `ingredientH.GetIngredient` |
| PATCH | `/api/v1/admin/ingredients/:id` | manager+ | `ingredientH.UpdateIngredient` |
| GET | `/api/v1/admin/ingredients/:id/movements` | manager+ | `ingredientH.ListStockMovements` |
| POST | `/api/v1/admin/stock-movements` | manager+ | `ingredientH.CreateStockMovement` |
| DELETE | `/api/v1/admin/ingredients/:id` | admin | `ingredientH.DeleteIngredient` |
| GET | `/api/v1/admin/marketing/spend` | manager+ | `marketingH.GetSpend` |
| GET | `/api/v1/admin/tasks/stats` | manager+ | `taskH.GetTaskStats` |
| GET | `/api/v1/admin/tasks` | manager+ | `taskH.GetStaffTasks` |
| POST | `/api/v1/admin/tasks` | manager+ | `taskH.CreateTask` |
| GET | `/api/v1/admin/training/guides` | manager+ | `trainingH.ListGuides` |
| POST | `/api/v1/admin/training/guides` | manager+ | `trainingH.CreateGuide` |
| PATCH | `/api/v1/admin/training/guides/:id` | manager+ | `trainingH.UpdateGuide` |
| DELETE | `/api/v1/admin/training/guides/:id` | admin | `trainingH.DeleteGuide` |
| GET | `/api/v1/admin/training/guides/:id/progress` | manager+ | `trainingH.ListGuideProgress` |
| GET | `/api/v1/admin/training/staff/:staffId/progress/:guideId` | manager+ | `trainingH.GetStaffProgressDetail` |
| PATCH | `/api/v1/admin/training/staff/:staffId/progress/:guideId` | manager+ | `trainingH.UpdateManagerNotes` |
| POST | `/api/v1/files/upload` | cashier+ | `fileH.Upload` |
| GET | `/api/v1/sse/admin` | manager+ | `sse.StreamAdmin` (SSE) |
| GET | `/api/v1/sse/order-monitor/:id` | auth | `sse.StreamOrderMonitor` (SSE) |
| GET | `/api/v1/ws/kds` | JWT via query | `ws.KDSHandler` (WebSocket) |
| GET | `/api/v1/ws/orders-live` | JWT via query | `ws.LiveHandler` (WebSocket) |

---

## Background Jobs

| Job | File | Trigger | Action |
|---|---|---|---|
| Payment timeout | `jobs/payment_timeout.go` | Ticker every 60 s | Expire `pending` payments past deadline → publish SSE |
| File cleanup | `jobs/file_cleanup.go` | Ticker | Delete `files` rows with no product reference + remove from disk |

---

## Realtime Architecture

```
Redis Pub/Sub
    │
    ├── order:{id}     → SSE stream  → GET /orders/:id/events       (guest tracks order)
    ├── group:{id}     → SSE stream  → GET /orders/group/:id/events (cashier group view)
    ├── admin          → SSE stream  → GET /sse/admin                (admin floor monitor)
    └── kds / live     → WebSocket   → /ws/kds · /ws/orders-live    (KDS + POS live feed)
```

---

## RBAC Role Hierarchy

```
guest < cashier < chef < manager < admin
```

`middleware.AtLeast("role")` checks that the JWT claim role is ≥ the required level.
Guest tokens use `sub='guest'` and bypass the active-staff check.
