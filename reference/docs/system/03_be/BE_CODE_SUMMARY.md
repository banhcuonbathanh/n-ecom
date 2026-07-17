# BE Code Summary

> **TL;DR**
> `be/` contains 13 domains. Each domain follows the strict 3-file pattern: `handler/`, `service/`, `repository/`.
> sqlc-generated code lives in `be/internal/db/` — never edited by hand.
> 87 routes total under `/api/v1`, wired in `be/cmd/server/main.go`.
> To add a new endpoint: SQL query → sqlc generate → repo method → service method → handler → route.

---

## 1 — Package / Folder Map

```
be/
├── cmd/
│   ├── server/main.go       ← DI wiring, route registration, graceful shutdown, auto-migration
│   ├── seed/main.go         ← Insert demo accounts (bcrypt-hashed) for all roles
│   ├── qr/main.go           ← Print QR URLs for active tables (uses FE_HOST)
│   └── demo_order/main.go   ← E2E smoke test: guest scan → /auth/guest → /products → /orders
├── migrations/              ← Goose SQL (001–017) — DDL only
├── query/                   ← Hand-written SQL with `-- name:` annotations → sqlc input
├── sqlc.yaml                ← sqlc config (engine, gen options, column overrides)
├── integration/             ← Integration tests against real DB + Redis
└── internal/
    ├── db/                  ← sqlc-generated (DO NOT edit): models.go, querier.go, *.sql.go
    ├── handler/             ← Gin layer: parse → call service → respond
    ├── service/             ← Business logic, state machines, error mapping
    ├── repository/          ← sqlc wrappers + transaction helpers
    ├── middleware/          ← auth.go (JWT + is_active), rbac.go (AtLeast)
    ├── sse/                 ← SSE handlers (order, group, admin, order-monitor)
    ├── websocket/           ← WS hub + client + KDS/live handlers
    ├── payment/             ← Payment provider clients (VNPay, MoMo, ZaloPay HMAC)
    ├── jobs/                ← Background goroutines (payment_timeout, file_cleanup)
    └── testhelper/          ← Shared test fixtures and DB/Redis setup

pkg/
├── bcrypt/   ← HashPassword, ComparePassword (bcrypt cost=12)
├── jwt/      ← Sign, Verify, Claims struct
└── redis/    ← NewClient, Publish/Subscribe helpers
```

---

## 2 — Domain Summary

| Domain | Handler | Service | Repository | DB Tables | Redis |
|---|---|---|---|---|---|
| Auth | `auth_handler.go` | `auth_service.go` | `auth_repo.go` | staff, refresh_tokens | `auth:staff:{id}`, `ratelimit:login:{ip}` |
| Products | `product_handler.go` | `product_service.go` | `product_repo.go` | products, categories, toppings, combos | product/topping/combo/category list cache |
| Orders | `order_handler.go` | `order_service.go` | `order_repo.go` | orders, order_items, order_sequences | SSE pub/sub, `order:seq:{date}` |
| Groups | `group_handler.go` | `group_service.go` | `order_repo.go` (shared) | `orders.group_id` | SSE group pub/sub |
| Payments | `payment_handler.go` | `payment_service.go` | `payment_repo.go` | payments | payment SSE events |
| Tables | `table_handler.go` | — (direct repo) | `table_repo.go` | tables | — |
| Staff | `staff_handler.go` | `staff_service.go` | `staff_repo.go` | staff | `auth:staff:{id}` invalidation |
| Analytics | `analytics_handler.go` | `analytics_service.go` | `analytics_repo.go` | orders + payments + staff (read-only) | — |
| Ingredients | `ingredient_handler.go` | `ingredient_service.go` | `ingredient_repo.go` | ingredients, stock_movements, product_ingredients | — |
| Tasks | `task_handler.go` | `task_service.go` | `task_repo.go` | staff_tasks | — |
| Training | `training_handler.go` | `training_service.go` | `training_repo.go` | training_guides, training_guide_roles, training_progress, quiz_attempts | — |
| Marketing | `marketing_handler.go` | — (static data) | — | none (hardcoded campaign data) | — |
| Files | `file_handler.go` | — (direct repo) | `file_repo.go` | file_attachments | — |

---

## 3 — Route Table (87 routes, prefix `/api/v1` unless noted)

### Auth

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/auth/login` | public | `authH.Login` |
| POST | `/auth/register` | public | `authH.Register` |
| POST | `/auth/refresh` | public | `authH.Refresh` |
| POST | `/auth/guest` | public | `authH.Guest` |
| POST | `/auth/logout` | auth | `authH.Logout` |
| GET | `/auth/me` | auth | `authH.Me` |

### Products / Catalog

| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/products` | public | `productH.ListProducts` |
| GET | `/products/:id` | public | `productH.GetProduct` |
| GET | `/products/all` | manager+ | `productH.ListAllProducts` |
| POST | `/products` | manager+ | `productH.CreateProduct` |
| PATCH | `/products/:id` | manager+ | `productH.UpdateProduct` |
| DELETE | `/products/:id` | admin | `productH.DeleteProduct` |
| GET | `/categories` | public | `productH.ListCategories` |
| POST | `/categories` | manager+ | `productH.CreateCategory` |
| PATCH | `/categories/:id` | manager+ | `productH.UpdateCategory` |
| DELETE | `/categories/:id` | admin | `productH.DeleteCategory` |
| GET | `/toppings` | public | `productH.ListToppings` |
| POST | `/toppings` | manager+ | `productH.CreateTopping` |
| PATCH | `/toppings/:id` | manager+ | `productH.UpdateTopping` |
| DELETE | `/toppings/:id` | admin | `productH.DeleteTopping` |
| GET | `/combos` | public | `productH.ListCombos` |
| POST | `/combos` | manager+ | `productH.CreateCombo` |
| PATCH | `/combos/:id` | manager+ | `productH.UpdateCombo` |
| DELETE | `/combos/:id` | admin | `productH.DeleteCombo` |

### Orders

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/orders` | auth | `orderH.Create` |
| GET | `/orders` | chef+ | `orderH.ListLive` |
| GET | `/orders/live` | cashier+ | `orderH.ListLive` |
| GET | `/orders/history` | cashier+ | `orderH.ListHistory` |
| GET | `/orders/:id` | auth | `orderH.Get` |
| PATCH | `/orders/:id/status` | chef+ | `orderH.UpdateStatus` |
| DELETE | `/orders/:id` | auth | `orderH.Cancel` |
| GET | `/orders/:id/events` | auth | `sse.StreamOrder` (SSE) |
| POST | `/orders/:id/items` | auth | `orderH.AddItemsToOrder` |
| PATCH | `/orders/items/:id/quantity` | auth | `orderH.UpdateItemQuantity` |
| PATCH | `/orders/items/:id` | chef+ | `orderH.UpdateItemServed` |
| DELETE | `/orders/items/:id` | auth | `orderH.CancelItem` |

### Order Groups

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/orders/group` | cashier+ | `groupH.CreateGroup` |
| GET | `/orders/group/:id` | auth | `groupH.GetGroup` |
| POST | `/orders/group/:id/orders` | cashier+ | `groupH.AddToGroup` |
| DELETE | `/orders/group/:id/orders/:orderId` | cashier+ | `groupH.RemoveFromGroup` |
| DELETE | `/orders/group/:id` | manager+ | `groupH.DisbandGroup` |
| GET | `/orders/group/:id/events` | auth | `sse.StreamGroup` (SSE) |

### Payments

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/payments` | cashier+ | `paymentH.Create` |
| GET | `/payments/:id` | cashier+ | `paymentH.GetPayment` |
| POST | `/payments/webhook/vnpay` | public (HMAC) | `paymentH.VNPayWebhook` |
| POST | `/payments/webhook/momo` | public (HMAC) | `paymentH.MoMoWebhook` |
| POST | `/payments/webhook/zalopay` | public (HMAC) | `paymentH.ZaloPayWebhook` |

### Tables / QR

| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/tables/qr/:token` | public | `tableH.DecodeQR` |
| GET | `/tables` | cashier+ | `tableH.ListTables` |
| POST | `/tables` | manager+ | `tableH.CreateTable` |
| PATCH | `/tables/:id` | manager+ | `tableH.UpdateTable` |

### Staff

| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/staff` | manager+ | `staffH.ListStaff` |
| POST | `/staff` | manager+ | `staffH.CreateStaff` |
| GET | `/staff/:id` | manager+ | `staffH.GetStaff` |
| PATCH | `/staff/:id` | manager+ | `staffH.UpdateStaff` |
| PATCH | `/staff/:id/status` | manager+ | `staffH.SetStaffStatus` |
| DELETE | `/staff/:id` | admin | `staffH.DeleteStaff` |

### Admin (Analytics, Ingredients, Tasks, Training, Marketing)

| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/admin/summary` | manager+ | `analyticsH.GetSummary` |
| GET | `/admin/top-dishes` | manager+ | `analyticsH.GetTopDishes` |
| GET | `/admin/staff-performance` | manager+ | `analyticsH.GetStaffPerformance` |
| GET | `/admin/ingredients` | manager+ | `ingredientH.ListIngredients` |
| GET | `/admin/ingredients/low-stock` | manager+ | `ingredientH.ListLowStock` |
| POST | `/admin/ingredients` | manager+ | `ingredientH.CreateIngredient` |
| GET | `/admin/ingredients/:id` | manager+ | `ingredientH.GetIngredient` |
| PATCH | `/admin/ingredients/:id` | manager+ | `ingredientH.UpdateIngredient` |
| DELETE | `/admin/ingredients/:id` | admin | `ingredientH.DeleteIngredient` |
| GET | `/admin/ingredients/:id/movements` | manager+ | `ingredientH.ListStockMovements` |
| POST | `/admin/stock-movements` | manager+ | `ingredientH.CreateStockMovement` |
| GET | `/admin/marketing/spend` | manager+ | `marketingH.GetSpend` |
| GET | `/admin/tasks/stats` | manager+ | `taskH.GetTaskStats` |
| GET | `/admin/tasks` | manager+ | `taskH.GetStaffTasks` |
| POST | `/admin/tasks` | manager+ | `taskH.CreateTask` |
| GET | `/admin/training/guides` | manager+ | `trainingH.ListGuides` |
| POST | `/admin/training/guides` | manager+ | `trainingH.CreateGuide` |
| PATCH | `/admin/training/guides/:id` | manager+ | `trainingH.UpdateGuide` |
| DELETE | `/admin/training/guides/:id` | admin | `trainingH.DeleteGuide` |
| GET | `/admin/training/guides/:id/progress` | manager+ | `trainingH.ListGuideProgress` |
| GET | `/admin/training/staff/:sId/progress/:gId` | manager+ | `trainingH.GetStaffProgressDetail` |
| PATCH | `/admin/training/staff/:sId/progress/:gId` | manager+ | `trainingH.UpdateManagerNotes` |

### Realtime + Files

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/files/upload` | cashier+ | `fileH.Upload` |
| GET | `/sse/admin` | manager+ | `sse.StreamAdmin` (SSE) |
| GET | `/sse/order-monitor/:id` | auth | `sse.StreamOrderMonitor` (SSE) |
| GET | `/ws/kds` | JWT via `?token=` | `ws.KDSHandler` (WebSocket) |
| GET | `/ws/orders-live` | JWT via `?token=` | `ws.LiveHandler` (WebSocket) |
| GET | `/metrics` | public | Prometheus `promhttp.Handler` |
| GET | `/health` | public | inline |

---

## 4 — Where sqlc Lives

| Path | Contents |
|---|---|
| `be/query/*.sql` | Hand-written SQL with `-- name: FuncName :one/:many/:exec` annotations |
| `be/sqlc.yaml` | sqlc config: engine=mysql, output=`internal/db/`, column type overrides |
| `be/internal/db/models.go` | Generated row structs (e.g. `Order`, `OrderItem`, `Staff`) |
| `be/internal/db/querier.go` | Generated `Querier` interface |
| `be/internal/db/*.sql.go` | Generated query implementations |

Run `cd be && sqlc generate` after any migration that adds/removes columns. Missing this step causes `SELECT *` scan failures and compile errors.

---

## 5 — How to Add a New Endpoint (Checklist)

```
1. Write SQL query in be/query/<domain>.sql with -- name: annotation
2. Run: cd be && sqlc generate
3. Add repository method in be/internal/repository/<domain>_repo.go
   (wrap the generated db.Queries method, handle sql.ErrNoRows → ErrNotFound)
4. Add service method in be/internal/service/<domain>_service.go
   (business logic; return AppError for known errors)
5. Add handler in be/internal/handler/<domain>_handler.go
   (bind JSON → call service → respondJSON or respondError)
6. Register route in be/cmd/server/main.go with correct auth middleware
7. Update the Route Table in §3 of this file
```

---

## Deep Dive Sources

| Topic | File |
|---|---|
| Full service method index | §2 above (domain → service map) + `be/internal/service/` (Go source) |
| All env vars | `BE_TECH_SUMMARY.md §5` (same folder) |
| Request/response DTO shapes | `../02_spec/API_SPEC.md` |
| sqlc workflow | §4–§5 above |
| DI wiring skeleton | `be/cmd/server/main.go` (actual wiring) |
