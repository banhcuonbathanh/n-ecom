# BE Developer Guide — Commands & Workflow

> **Scope:** Day-to-day operational reference. Architecture, business rules, and code patterns → [`BE_SYSTEM_GUIDE.md`](BE_SYSTEM_GUIDE.md)
> **Stack:** Go 1.25 · Gin · sqlc · MySQL 8.0 · Redis Stack 7 · Goose · Docker Compose

---

## 1 — First-Time Setup

```bash
# 1. Copy env file and fill in secrets
cp .env.example .env
# Edit .env: generate JWT_SECRET with:
openssl rand -hex 32

# 2. Start full stack (MySQL + Redis + BE + FE)
docker compose up -d

# 3. Check BE is alive
curl http://localhost:8080/health
# → {"status":"ok"}

# 4. Load seed data (staff, tables, menu)
# Note: mysql is not installed locally — always use docker compose exec -T
docker compose exec -T mysql mysql -uroot -prootpass banhcuon < scripts/seed.sql

# 5. Load real menu (replaces placeholder items — run AFTER seed.sql)
docker compose exec -T mysql mysql -uroot -prootpass banhcuon < scripts/seed_real_menu.sql
```

**Default credentials after seed.sql:**

| Username   | Password     | Role    |
| ---------- | ------------ | ------- |
| `admin`    | `admin123`   | admin   |
| `manager1` | `manager123` | manager |
| `chef1`    | `chef1234`   | chef    |
| `cashier1` | `cashier123` | cashier |

---

## 2 — Docker Commands (Daily)

```bash
# Start all services (detached)
docker compose up -d

# Start + rebuild a specific service after code changes
docker compose up -d --build be
docker compose up -d --build fe

# Rebuild both
docker compose up -d --build be fe

# Tail BE logs
docker compose logs -f be

# Tail all logs
docker compose logs -f

# Stop all (keep data volumes)
docker compose down

# Stop all + delete volumes (wipes DB + Redis)
docker compose down -v

# Check running containers
docker compose ps

# Restart single service
docker compose restart be
```

---

## 3 — Local BE (Without Docker)

```bash
# Requires: Go 1.25, MySQL running locally, Redis running locally

# Set env for local run
export DB_DSN="banhcuon:yourpass@tcp(localhost:3306)/banhcuon?parseTime=true&charset=utf8mb4"
export REDIS_ADDR="localhost:6379"
export JWT_SECRET="your-secret-here"
export PORT=8080

# Run BE server
cd be && go run ./cmd/server

# Build binary
cd be && go build -o ../bin/server ./cmd/server

# Run binary
./bin/server
```

---

## 4 — Database: Migrations

```bash
# Run all pending migrations (up)
goose -dir be/migrations mysql "$DB_DSN" up

# Check migration status
goose -dir be/migrations mysql "$DB_DSN" status

# Roll back last migration
goose -dir be/migrations mysql "$DB_DSN" down

# Roll back to a specific version
goose -dir be/migrations mysql "$DB_DSN" down-to 5

# Create new migration file
goose -dir be/migrations create add_my_column sql
# → creates be/migrations/015_add_my_column.sql

# In Docker (migrations run automatically via migrate.sh on startup)
# To re-run manually:
docker compose exec be goose -dir /migrations mysql "$DB_DSN" up
```

**Migration naming convention:** `NNN_snake_case_description.sql` — next is `015_...`

---

## 5 — sqlc: Regenerate After Schema Changes

```bash
# Run this EVERY TIME a migration adds or removes a column
cd be && sqlc generate

# Then verify it compiles
go build ./...
```

**When to run:** after any `ALTER TABLE` / `CREATE TABLE` / `DROP COLUMN` in a new migration.
Without this, `SELECT *` scans fail and compile errors appear on missing struct fields.

---

## 6 — Seed Data

> `mysql` is not installed locally — always use `docker compose exec -T`.

```bash
# Load base seed (staff + tables + demo orders)
docker compose exec -T mysql mysql -uroot -prootpass banhcuon < scripts/seed.sql

# Load real menu (replaces placeholder menu — run AFTER seed.sql)
docker compose exec -T mysql mysql -uroot -prootpass banhcuon < scripts/seed_real_menu.sql

# Verify products loaded
docker compose exec -T mysql mysql -uroot -prootpass banhcuon \
  -e "SELECT name, price FROM products WHERE id LIKE 'cccc%';"

# Verify combos loaded
docker compose exec -T mysql mysql -uroot -prootpass banhcuon \
  -e "SELECT name, price FROM combos WHERE id LIKE 'dddd%';"

# Verify staff loaded
docker compose exec -T mysql mysql -uroot -prootpass banhcuon \
  -e "SELECT username, role FROM staff;"
```

**Seed file reference:**

| File                         | What it seeds                                                |
| ---------------------------- | ------------------------------------------------------------ |
| `scripts/seed.sql`           | Staff · Tables · Placeholder menu · Demo orders              |
| `scripts/seed_real_menu.sql` | Real menu (replaces placeholder) · Demo orders with real IDs |

---

## 7 — Testing

```bash
# Run all service-layer unit tests
go test ./be/internal/service/...

# Run all tests with verbose output
go test ./be/internal/... -v

# Run a single test
go test ./be/internal/service/... -run TestLogin

# Run all tests + race detector
go test -race ./be/internal/...

# Run integration tests (requires DB running)
go test ./be/integration/... -v

# Run tests with coverage
go test ./be/internal/service/... -cover

# Generate coverage report (HTML)
go test ./be/internal/... -coverprofile=coverage.out
go tool cover -html=coverage.out -o coverage.html
open coverage.html

# Check build compiles cleanly (no tests)
go build ./...

# Vet (static analysis)
go vet ./...
```

**Key test files:**

| File                                          | Tests                                                       |
| --------------------------------------------- | ----------------------------------------------------------- |
| `be/internal/service/auth_service_test.go`    | Login · RateLimit · MultiSession · AccountDisabled          |
| `be/internal/service/order_service_test.go`   | ComboExpand · DuplicateTable · CancelUnder30 · CancelOver30 |
| `be/internal/handler/payment_handler_test.go` | VNPayWebhook · BadHMAC · IdempotentWebhook                  |

---

## 8 — MySQL: Direct Access

```bash
# Open MySQL shell (Docker)
docker compose exec mysql mysql -uroot -prootpass banhcuon

# Run one-liner query
docker compose exec mysql \
  mysql -uroot -prootpass banhcuon \
  -e "SELECT id, order_number, status FROM orders LIMIT 10;"

# Dump DB
docker compose exec mysql \
  mysqldump -uroot -prootpass banhcuon > backup_$(date +%Y%m%d).sql

# Restore from dump
docker compose exec -T mysql \
  mysql -uroot -prootpass banhcuon < backup_20260603.sql

# Useful quick queries
# → active orders by table
SELECT o.order_number, t.name AS table_name, o.status
FROM orders o JOIN tables t ON o.table_id = t.id
WHERE o.status NOT IN ('delivered','cancelled');

# → products with toppings
SELECT p.name, GROUP_CONCAT(tp.name) AS toppings
FROM products p
LEFT JOIN product_toppings pt ON p.id = pt.product_id
LEFT JOIN toppings tp ON pt.topping_id = tp.id
GROUP BY p.id;
```

---

## 9 — Redis: Direct Access

```bash
# Open Redis CLI (Docker)
docker compose exec redis redis-cli

# Common Redis key patterns:
# staff:active:{id}       → is_active cache (TTL 5min)
# login_fail:{ip}         → failed login counter
# logout:{jti}            → blacklisted access token
# product:{id}            → product cache (TTL 5min)
# products:list           → product list cache (TTL 5min)
# order_seq:{YYYYMMDD}    → daily order sequence counter

# Inspect a key
redis-cli GET "staff:active:11111111-1111-1111-1111-000000000001"
redis-cli TTL "login_fail:127.0.0.1"

# List keys by pattern
redis-cli KEYS "product:*"
redis-cli KEYS "logout:*"

# Flush all (wipes cache — not dangerous for persistent data)
redis-cli FLUSHALL

# RedisInsight UI (browser)
open http://localhost:8001
```

---

## 10 — Quick API Testing (curl)

```bash
BASE="http://localhost:8080/api/v1"

# ── Auth ──────────────────────────────────────────────────────────────────────

# Login (returns access_token)
curl -s -c cookies.txt -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"cashier1","password":"cashier123"}' | jq .

# Store token in shell variable
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"cashier1","password":"cashier123"}' | jq -r .data.access_token)

# Refresh token (uses httpOnly cookie set by login)
curl -s -b cookies.txt -X POST $BASE/auth/refresh | jq .

# Me (who am I)
curl -s -H "Authorization: Bearer $TOKEN" $BASE/auth/me | jq .

# Logout
curl -s -b cookies.txt -X POST $BASE/auth/logout \
  -H "Authorization: Bearer $TOKEN"

# Guest login (scan QR table)
curl -s -X POST $BASE/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"qr_token":"a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890"}' | jq .

# ── Products ─────────────────────────────────────────────────────────────────

# List all products (public)
curl -s $BASE/products | jq .

# List categories
curl -s $BASE/categories | jq .

# List toppings (nhân)
curl -s $BASE/toppings | jq .

# List combos (suất)
curl -s $BASE/combos | jq .

# Get single product
curl -s $BASE/products/cccccccc-cccc-cccc-cccc-000000000001 | jq .

# ── Orders ────────────────────────────────────────────────────────────────────

# Create order (customer/guest)
GUEST_TOKEN=$(curl -s -X POST $BASE/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"qr_token":"a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890"}' | jq -r .data.access_token)

curl -s -X POST $BASE/orders \
  -H "Authorization: Bearer $GUEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "product_id": "cccccccc-cccc-cccc-cccc-000000000003",
        "quantity": 2,
        "toppings": [{"id":"bbbbbbbb-bbbb-bbbb-bbbb-000000000001","name":"Nhân thịt","price":0}],
        "note": ""
      }
    ]
  }' | jq .

# List live orders (staff)
curl -s -H "Authorization: Bearer $TOKEN" $BASE/orders/live | jq .

# Get order
curl -s -H "Authorization: Bearer $TOKEN" $BASE/orders/<order_id> | jq .

# Update order status (chef)
CHEF_TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"chef1","password":"chef1234"}' | jq -r .data.access_token)

curl -s -X PATCH $BASE/orders/<order_id>/status \
  -H "Authorization: Bearer $CHEF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"preparing"}' | jq .

# Cancel order
curl -s -X DELETE $BASE/orders/<order_id> \
  -H "Authorization: Bearer $TOKEN" | jq .

# ── Tables ────────────────────────────────────────────────────────────────────

# List tables (staff)
curl -s -H "Authorization: Bearer $TOKEN" $BASE/tables | jq .

# ── Health ────────────────────────────────────────────────────────────────────

curl -s http://localhost:8080/health | jq .
```

---

## 11 — Troubleshooting

| Symptom                                                 | Cause                                              | Fix                                                          |
| ------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| `sqlc: unknown column`                                  | Migration added column but `sqlc generate` not run | `cd be && sqlc generate`                                     |
| `500 INTERNAL_ERROR` on every request                   | Missing env var (JWT_SECRET, DB_DSN)               | Check `docker compose logs -f be` for the error line         |
| `dial tcp mysql:3306: no such host`                     | BE started before MySQL ready                      | `docker compose restart be` (migrate.sh retries)             |
| Login → `401 INVALID_CREDENTIALS` with correct password | Staff not in DB / wrong password hash              | Re-run `seed.sql`                                            |
| `409 TABLE_HAS_ACTIVE_ORDER`                            | Table already has a pending/preparing order        | Cancel or deliver the existing order first                   |
| Redis `WRONGTYPE` error                                 | Key type mismatch (SET vs HASH)                    | `redis-cli FLUSHALL` then restart                            |
| `422 UNSUPPORTED_FILE_TYPE`                             | Uploading non-image file                           | Only `image/jpeg · image/png · image/webp` allowed, max 10MB |
| Webhook not verifying                                   | HMAC secret mismatch                               | Check `VNPAY_HASH_SECRET` / `MOMO_SECRET_KEY` in `.env`      |
| `go build` fails after migration                        | New column in DB, old struct in `db/`              | Run `cd be && sqlc generate`                                 |

---

## 12 — Env Vars Quick Reference

| Variable            | Example                                                 | Used for                             |
| ------------------- | ------------------------------------------------------- | ------------------------------------ |
| `DB_DSN`            | `banhcuon:pass@tcp(mysql:3306)/banhcuon?parseTime=true` | MySQL connection                     |
| `REDIS_ADDR`        | `redis:6379`                                            | Redis connection (no scheme)         |
| `JWT_SECRET`        | 64-char hex                                             | Sign/verify all JWTs                 |
| `JWT_ACCESS_TTL`    | `86400`                                                 | Access token TTL in seconds (24h)    |
| `JWT_REFRESH_TTL`   | `2592000`                                               | Refresh token TTL in seconds (30d)   |
| `PORT`              | `8080`                                                  | BE listen port                       |
| `STORAGE_BASE_URL`  | `http://localhost:8080/uploads`                         | Prepended to image_path in responses |
| `STORAGE_BASE_PATH` | `/var/www/uploads`                                      | Physical file storage root           |
| `CORS_ORIGINS`      | `http://localhost:3000`                                 | Allowed FE origin                    |
| `MIGRATIONS_DIR`    | `/migrations`                                           | Path inside container                |
| `VNPAY_TMN_CODE`    | sandbox code                                            | VNPay terminal code                  |
| `VNPAY_HASH_SECRET` | sandbox secret                                          | VNPay HMAC key                       |
| `MOMO_PARTNER_CODE` | sandbox code                                            | MoMo partner code                    |
| `WEBHOOK_BASE_URL`  | `https://abc.ngrok.io`                                  | Payment gateway callback base URL    |

---

## 13 — File Structure Quick Map

```
be/
├── cmd/server/main.go          ← Entry point: DI wiring + route registration
├── internal/
│   ├── db/                     ← sqlc-generated (DO NOT EDIT)
│   ├── handler/                ← HTTP layer: bind JSON → call service → respond
│   ├── service/                ← Business logic · state machine · error mapping
│   ├── repository/             ← sqlc query wrappers · transaction helpers
│   ├── middleware/             ← auth.go · rbac.go
│   ├── sse/                    ← Server-Sent Events handlers
│   ├── websocket/              ← hub.go · client.go · handler.go
│   ├── payment/                ← vnpay.go · momo.go · zalopay.go
│   └── jobs/                   ← payment_timeout.go · file_cleanup.go
├── migrations/                 ← Goose SQL files (001–014)
├── pkg/
│   ├── jwt/                    ← GenerateAccessToken · ParseToken
│   ├── bcrypt/                 ← HashPassword(cost=12) · ComparePassword
│   └── redis/                  ← client.go · pubsub.go · bloom.go
├── query/                      ← Raw SQL for sqlc input
└── sqlc.yaml                   ← sqlc config
```

**Layer rule (strict):** `handler → service → repository → db`
No layer may skip a level or import upward.

---

_BanhCuon System · BE Dev Guide · v1.0 · 2026-06-03_
