### Stop BE / FE (local dev)

```bash
# Start whole system
./dev.sh
# Stop BE
pkill -f "go run ./cmd/server"

# Stop FE
pkill -f "next dev"

# Free the ports first, then run the script again:

docker compose stop be fe      # release :8080 and :3000
./dev.sh                       # restarts mysql/redis + local BE + local FE


# Terminal 1 — backend
cd be && set -a && source .env.local && set +a && go run ./cmd/server

# Terminal 2 — frontend
cd fe && npm run dev

```

# Dev Commands — Bánh Cuốn Restaurant

## Staff & Admin Links (localhost:3000)

### Auth

| Page  | URL                         |
| ----- | --------------------------- |
| Login | http://localhost:3000/login |

### Auto-Login Links (Dev Only)

> Open any link → auto-logs in and redirects (admin/manager → `/admin`, cashier → `/pos`, chef → `/kds`)

| Role    | Link                                         |
| ------- | -------------------------------------------- |
| Admin   | http://localhost:3000/dev-login?role=admin   |
| Manager | http://localhost:3000/dev-login?role=manager |
| Cashier | http://localhost:3000/dev-login?role=cashier |
| Chef    | http://localhost:3000/dev-login?role=chef    |
| Staff   | http://localhost:3000/dev-login?role=staff   |

### Kitchen & Floor

| Page                  | URL                               | Role    |
| --------------------- | --------------------------------- | ------- |
| KDS (Kitchen Display) | http://localhost:3000/kds         | Chef    |
| POS (Point of Sale)   | http://localhost:3000/pos         | Cashier |
| Live Orders           | http://localhost:3000/orders/live | Staff+  |

### Admin Dashboard

| Page                 | URL                                    | Role     |
| -------------------- | -------------------------------------- | -------- |
| Overview (Floor Map) | http://localhost:3000/admin/overview   | Manager+ |
| Products             | http://localhost:3000/admin/products   | Manager+ |
| Categories           | http://localhost:3000/admin/categories | Manager+ |
| Toppings             | http://localhost:3000/admin/toppings   | Manager+ |
| Combos               | http://localhost:3000/admin/combos     | Manager+ |
| Staff Management     | http://localhost:3000/admin/staff      | Admin    |
| Marketing (QR Codes) | http://localhost:3000/admin/marketing  | Manager+ |
| Summary / Reports    | http://localhost:3000/admin/summary    | Manager+ |

---

## Table QR Links

### Current QR Links (localhost)

| Table | URL                                                                                          |
| ----- | -------------------------------------------------------------------------------------------- |
| Bàn 1 | http://localhost:3000/table/c914cac8a66cf2f8d5d8682830512bf43d9e85b1480bc12a243712e52c0be1d7 |
| Bàn 2 | http://localhost:3000/table/1fce680084d98d6cabd1368306636c34aa2ce10640378350444f6475db4caeb9 |
| Bàn 3 | http://localhost:3000/table/b46af37334844f107731c3a0d6dcc6ee2bfaf31f7ff52d88bf0aa9af2ac0673d |
| Bàn 4 | http://localhost:3000/table/313e0fde49f8a752453472067747ffc53d28d24b64e51e52dc59d9274254684b |
| Bàn 5 | http://localhost:3000/table/abf43a07fdf0a099732809f5b8cc35733eda933ffe1a20e4707931a3091ba4aa |

````bash

---

## Quick Build

```bash
docker compose up -d --build be
docker compose up -d --build fe
docker compose up -d --build be fe
docker compose build --no-cache fe && docker compose up -d fe

docker compose build --no-cache fe && docker compose up -d fe

docker compose stop fe

````

---

## Health Check

```bash
# Check if BE is responding
curl -s http://localhost:8080/health || echo "BE is down"

# Check Docker container status
docker compose ps be

# Check if port 8080 is listening
lsof -i :8080
```

---

## Local Dev (Hot Reload)

```bash
# One command — starts MySQL + Redis in Docker, BE + FE locally


cd fe && npm run dev
rm -rf .next && npm run dev
# Stop the current dev server first (Ctrl+C), then:
rm -rf fe/.next
cd fe && npm run dev
Or from inside fe/:


rm -rf .next && npm run dev
lsof -ti tcp:8080 | xargs kill 2>/dev/null; docker compose up -d --build fe be

```

<details>
<summary>Manual (3 terminals)</summary>

```bash
# Terminal 1 — Infra (run once)
docker compose up -d mysql redis

# Terminal 2 — BE (stop Docker BE first)
docker compose stop be
cd be && set -a && source .env.local && set +a && go run ./cmd/server

# Terminal 3 — FE
cd fe && NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev
# or simply:
cd fe && npm run dev
```

</details>

---

## Seed Data

### Run order

> **Always run `seed.sql` first.** `seed_real_menu.sql` inserts demo orders that reference table IDs created by `seed.sql` — skipping step 1 causes a FK constraint error.

```bash
# Step 1 — full dev/demo dataset (staff + tables + placeholder menu + demo orders)
docker compose exec -T mysql mysql -uroot -prootpass banhcuon < scripts/seed.sql

# Step 2 — replace placeholder menu with the real one (run AFTER seed.sql)
docker compose exec -T mysql mysql -uroot -prootpass banhcuon < scripts/seed_real_menu.sql

# Staff accounts only — Go bcrypt version (use when MySQL is local, not Docker)
go run ./be/cmd/seed/main.go
```

### What each seed does

#### `go run ./be/cmd/seed/main.go`

Seeds 5 staff accounts only via Go + bcrypt. Password for all: `Admin@123`.

| Account | Role    |
| ------- | ------- |
| admin   | admin   |
| manager | manager |
| cashier | cashier |
| chef    | chef    |
| staff   | staff   |

#### `scripts/seed.sql`

```bash
docker compose exec -T mysql mysql -uroot -prootpass banhcuon < scripts/seed.sql
```

Seeds staff accounts and tables. Password for all: `Admin@123`.

| Account  | Role    |
| -------- | ------- |
| admin    | admin   |
| manager1 | manager |
| chef1    | chef    |
| cashier1 | cashier |

#### `scripts/seed_real_menu.sql`

```bash
docker compose exec -T mysql mysql -uroot -prootpass banhcuon < scripts/seed_real_menu.sql
```

Replaces the placeholder menu with the actual stall menu. Run after `seed.sql`. Deletes all 33333333/44444444/55555555 IDs first, then inserts:

| Table         | What                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| `categories`  | 5: Suất, Trứng, Bánh Cuốn, Giò, Canh                                         |
| `toppings`    | 2 nhân: Nhân thịt, Nhân thịt mộc nhĩ — all free                          |
| `products`    | 9: Bánh Cuốn Thịt/Mộc Nhĩ (4,000đ), Bánh Chay (2,500đ), Bánh Trứng Tái/Chín/Vàng + Giò (9,000đ), Canh có rau/không rau (free)        |
| `combos`      | 5 suất: Đầy Đủ Trứng Tái/Chín (30k), Suất Giò, Suất Trứng Tái, Suất Trứng Chín (25k)     |
| `orders`      | 5 demo orders (Bàn 01 preparing, 02 pending, 03 delivered, 04 preparing, 05 pending) |
| `order_items` | All items for those 5 orders with topping snapshots                      |

#### Delete all data

```bash
docker compose exec -T mysql mysql -uroot -prootpass banhcuon <<'SQL'
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE order_items;
TRUNCATE orders;
TRUNCATE combo_items;
TRUNCATE combos;
TRUNCATE product_toppings;
TRUNCATE toppings;
TRUNCATE products;
TRUNCATE categories;
TRUNCATE tables;
TRUNCATE staff;
SET FOREIGN_KEY_CHECKS = 1;
SQL
```

Truncates all tables in FK-safe order. Re-run `seed.sql` → `seed_real_menu.sql` after to restore.

---

# Reprint all QR URLs from the DB (e.g. after recreating tables)

go run ./be/cmd/qr/main.go

# On mobile — replace localhost with your LAN IP

FE_HOST=http://192.168.1.x:3000 go run ./be/cmd/qr/main.go

````

---

## Demo Order (Simulate QR Scan → Place Order)

Simulates a customer scanning a QR code, browsing the menu, and placing an order via the real API.

```bash
# Random table, 3 random items
go run ./be/cmd/demo_order/main.go

# Specific table
go run ./be/cmd/demo_order/main.go --table "Bàn 2"

# Specific table + number of items
go run ./be/cmd/demo_order/main.go --table "Bàn 3" --items 4
````

> Fails with `TABLE_HAS_ACTIVE_ORDER` if the table already has an active order — pick a free table or cancel/deliver the existing one first.

---

## Test Accounts

| Role                  | Username  | Password    |
| --------------------- | --------- | ----------- |
| Quản Trị Viên (admin) | `admin`   | `Admin@123` |
| Quản Lý (manager)     | `manager` | `Admin@123` |
| Thu Ngân (cashier)    | `cashier` | `Admin@123` |
| Đầu Bếp (chef)        | `chef`    | `Admin@123` |
| Nhân Viên (staff)     | `staff`   | `Admin@123` |

---

## Ports

| Service      | Port |
| ------------ | ---- |
| FE           | 3000 |
| BE           | 8080 |
| MySQL        | 3306 |
| Redis        | 6379 |
| RedisInsight | 8001 |

check fe running or not

Open http://localhost:3000 in your browser to see it.

Handy commands to check yourself anytime:

docker compose ps fe # is the container up?
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000 # 200 = serving
docker compose logs -f fe # live logs (Ctrl+C to exit)


For day-to-day FE work, use npm run dev (port 3000 now) and leave the Docker fe container stopped. Only rebuild the Docker image when you want to test the production build. When you're done, you can bring it back with docker compose start fe.