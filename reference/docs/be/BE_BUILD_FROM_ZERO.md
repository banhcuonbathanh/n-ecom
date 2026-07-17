# BE Build From Zero — Ordered Scaffold Checklist

> **Version:** v1.0 · 2026-06-05 (P-BEBLUEPRINT-2)
> **Purpose:** turn `docs/be/` from a *maintenance map* into a *repeatable build blueprint*. Follow top to bottom to scaffold this BE (or a like-shaped one) from an empty folder.
> **Each step links the doc that fills it** — this file is the spine; the detail lives in the existing summaries.
> **Stack assumed:** Go 1.25 · Gin · sqlc · MySQL 8.0 · Redis Stack 7 · Goose · Docker Compose.

---

## Build order at a glance

```
0 init module → 1 migrations → 2 sqlc setup → 3 generate db/
  → 4 pkg/ utils → 5 repository → 6 service → 7 handler
  → 8 middleware → 9 main.go wiring → 10 jobs + realtime
  → 11 Docker + migrate.sh → 12 seed + smoke
```

Dependencies are strict: each step compiles on the ones above it. Don't jump ahead — a service can't be written before its repo, a repo can't exist before `sqlc generate`.

---

## 0 — Project init

```bash
go mod init <module>        # e.g. banhcuon
mkdir -p be/{cmd/server,internal/{db,handler,service,repository,middleware},pkg,migrations,query}
```

- Layer rule (enforce from line 1): `handler → service → repository → db`. No upward imports, no skipping. → **BE_STRUCTURE.md → Layer Rules**
- Pick the folder tree now. → **BE_STRUCTURE.md → Folder Tree**

---

## 1 — Migrations (DDL first — everything reads from here)

Write goose migrations in run order. sqlc infers column types from these, so they come before any query.

- All tables, columns, types, FKs, indexes, Redis key plan. → **DB_SCHEMA_SUMMARY.md**
- Run order + dependency graph (e.g. `003_tables` before `005_orders`). → **DB_SCHEMA_SUMMARY.md → Migration Run Order**

### Migration file anatomy (verbatim template — `005_orders.sql`)

Copy this shape for every migration. Note: `-- +goose Up` / `-- +goose Down` blocks, `CHAR(36) DEFAULT (UUID())` PKs, `DECIMAL(10,0)` for VND, soft-delete `deleted_at`, an index on every FK/status/created_at, CHECK constraints, and a `Down` that drops in reverse-FK order.

```sql
-- +goose Up
CREATE TABLE IF NOT EXISTS order_sequences (
    id       INT  NOT NULL AUTO_INCREMENT,
    date_key DATE NOT NULL,
    last_seq INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_order_sequences_date_key (date_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    id             CHAR(36)      NOT NULL DEFAULT (UUID()),
    order_number   VARCHAR(30)   NOT NULL,
    table_id       CHAR(36)      NULL DEFAULT NULL,
    status         ENUM('pending','confirmed','preparing','ready','delivered','cancelled') NOT NULL DEFAULT 'pending',
    source         ENUM('online','qr','pos') NOT NULL DEFAULT 'online',
    customer_name  VARCHAR(100)  NULL DEFAULT NULL,
    customer_phone VARCHAR(20)   NULL DEFAULT NULL,
    note           TEXT          NULL,
    total_amount   DECIMAL(10,0) NOT NULL DEFAULT 0,   -- DENORMALIZED: recalc after every item mutation
    created_by     CHAR(36)      NULL DEFAULT NULL,     -- NOT staff_id
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at     DATETIME      NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_order_number (order_number),
    KEY idx_orders_table_status (table_id, status),     -- 1-table-1-active-order check
    KEY idx_orders_status (status),
    KEY idx_orders_created_at (created_at),
    KEY idx_orders_created_by (created_by),
    KEY idx_orders_deleted_at (deleted_at),
    CONSTRAINT fk_orders_table      FOREIGN KEY (table_id)   REFERENCES `tables` (id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES staff    (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
    id                CHAR(36)      NOT NULL DEFAULT (UUID()),
    order_id          CHAR(36)      NOT NULL,
    product_id        CHAR(36)      NULL DEFAULT NULL,
    combo_id          CHAR(36)      NULL DEFAULT NULL,
    combo_ref_id      CHAR(36)      NULL DEFAULT NULL,   -- self-ref → combo sub-items
    name              VARCHAR(200)  NOT NULL,            -- snapshot at order time
    unit_price        DECIMAL(10,0) NOT NULL,            -- snapshot at order time
    quantity          INT           NOT NULL DEFAULT 1 CHECK (quantity > 0),
    qty_served        INT           NOT NULL DEFAULT 0 CHECK (qty_served >= 0),
    toppings_snapshot JSON          NULL,
    note              TEXT          NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_order_items_order_id (order_id),
    KEY idx_order_items_combo_ref_id (combo_ref_id),
    CONSTRAINT fk_order_items_order     FOREIGN KEY (order_id)     REFERENCES orders      (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product   FOREIGN KEY (product_id)   REFERENCES products    (id) ON DELETE RESTRICT,
    CONSTRAINT fk_order_items_combo     FOREIGN KEY (combo_id)     REFERENCES combos      (id) ON DELETE RESTRICT,
    CONSTRAINT fk_order_items_combo_ref FOREIGN KEY (combo_ref_id) REFERENCES order_items (id) ON DELETE CASCADE,
    -- order_items has NO status / NO flagged column — status is DERIVED from qty_served.
    -- 3 valid item types (MySQL 8.0.16+):
    CONSTRAINT chk_oi_item_type CHECK (
        (product_id IS NOT NULL AND combo_id IS NULL     AND combo_ref_id IS NULL    ) OR
        (product_id IS NULL     AND combo_id IS NOT NULL AND combo_ref_id IS NULL    ) OR
        (product_id IS NOT NULL AND combo_id IS NULL     AND combo_ref_id IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- +goose Down
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS order_sequences;
```

---

## 2 — sqlc setup + 3 — generate `internal/db/`

- `sqlc.yaml` config, `query/` conventions, `-- name: X :mode` annotations, the 3 example queries, and the generate workflow. → **BE_SQLC_GUIDE.md** (the companion doc — do this before any repository)

```bash
cd be && sqlc generate && go build ./...   # internal/db/ now exists; nothing else compiles without it
```

---

## 4 — `pkg/` reusable utilities (no `internal/` imports)

Build these before services — services depend on them.

| Package | Provides | Spec |
|---|---|---|
| `pkg/jwt` | Sign/Verify access + refresh, Claims struct. **Verify `SigningMethodHMAC` before parsing.** | **BE_SYSTEM_GUIDE.md §5** (payload shapes) · **BE_ENV_CONFIG.md** (`JWT_SECRET`, TTLs) |
| `pkg/bcrypt` | `HashPassword(cost=12)` · `ComparePassword` | **BE_SYSTEM_GUIDE.md §5** (login flow, fake-hash timing defense) |
| `pkg/redis` | `client.go` (New + health) · `pubsub.go` (Publish/Subscribe) · `bloom.go` (existence filter) | **DB_SCHEMA_SUMMARY.md → Redis Key Schema** |

---

## 5 → 7 — repository → service → handler (per domain, in epic order)

Build one domain fully through all three layers before the next. Order: **Auth → Products → Orders+SSE → WebSocket → Payments → Supporting (QR/Tables/Files) → Admin**.

- Epic-by-epic plan, "read first" list, and per-domain critical rules. → **BE_SYSTEM_GUIDE.md §10**
- What each layer may/may not import. → **BE_STRUCTURE.md → Layer Rules**
- Request/response field shapes + per-endpoint error codes. → **BE_API_DTO.md**
- Service & repository method names to implement per domain. → **CODEBASE_GRAPH_BE.md → Service/Repository Index**
- Business rules (order state machine, cancel <30%, payment-only-when-ready, 1-table-1-order). → **BE_SYSTEM_GUIDE.md §4**
- Copy-paste patterns (`respondError`, `AppError` unwrap, SSE headers, WS query-param auth, webhook verify order, guest-JWT NULL `created_by`). → **BE_SYSTEM_GUIDE.md §8**

> Auth is the blocker — build it first; everything else needs the middleware + token flow it produces.

---

## 8 — Middleware

- `auth.go` — Bearer extract → ParseClaims → Redis blacklist check → inject context. Inject deps explicitly (Redis/checker as params, never globals). → **BE_SYSTEM_GUIDE.md §8.11**
- `rbac.go` — `AtLeast("role")` against the hierarchy `guest < cashier < chef < manager < admin`. → **BE_STRUCTURE.md → RBAC** + **BE_SYSTEM_GUIDE.md §3**
- Middleware order: `Logger → Recovery → CORS → RateLimit → Auth → RBAC → Handler`. → **BE_SYSTEM_GUIDE.md §9**

---

## 9 — `main.go` wiring (the assembly point)

DI order: Config → DB pool → Redis → Repos → Services (inject interfaces) → Middleware + Hub → Handlers → Routes → graceful shutdown. Full skeleton with every route group:

- → **BE_SYSTEM_GUIDE.md §9** (DI skeleton) + **BE_STRUCTURE.md → Route Table** (all 87 routes, auth level each)
- Every config value via `os.Getenv` — no hardcoded config. → **BE_ENV_CONFIG.md**
- DB pool is fixed in code: `MaxOpenConns=25 · MaxIdleConns=5 · ConnMaxLifetime=5m`.

```bash
go build ./... && go run ./be/cmd/server   # then: curl localhost:8080/health → {"status":"ok"}
```

---

## 10 — Background jobs + realtime

- `jobs/payment_timeout.go` (ticker 60s → expire pending payments) · `jobs/file_cleanup.go` (delete orphan files >24h). Started as goroutines in main.go. → **BE_STRUCTURE.md → Background Jobs**
- SSE (`order:{id}`, `group:{id}`, admin, order-monitor) + WebSocket hub (KDS, orders-live). Redis pub/sub is the backbone. → **BE_STRUCTURE.md → Realtime Architecture**

---

## 11 — Docker + migrate.sh (DevOps boundary)

These live outside `docs/be/` (DevOps owns them) but are required to run the build:

- `Dockerfile` (multi-stage Go build) · `docker-compose.yml` (MySQL + Redis health checks + BE + FE + Caddy).
- `scripts/migrate.sh` — wait for MySQL (ping loop) → `goose up` → exec server. On boot the server also auto-runs migrations when `DB_DSN` is set (`MIGRATIONS_DIR`, default `/migrations`).
- `.env.example` — all vars from **BE_ENV_CONFIG.md**.

```bash
docker compose up -d --build be && docker compose logs -f be
```

---

## 12 — Seed + smoke (prove it works)

- `cmd/seed` → demo accounts (all roles) · `scripts/seed.sql` + `seed_real_menu.sql` → tables + menu. → **BE_SQLC_GUIDE.md §7** + **BE_DEV_GUIDE.md §1, §6**
- `cmd/demo_order` → end-to-end guest order against the live API (`POST /auth/guest → GET /products → POST /orders`).
- curl recipes per endpoint + troubleshooting table. → **BE_DEV_GUIDE.md §10, §11**

```bash
go run ./be/cmd/seed/main.go
docker compose exec -T mysql mysql -uroot -prootpass banhcuon < scripts/seed_real_menu.sql
go run ./be/cmd/demo_order/main.go --table "Bàn 1"
```

---

## Done = all green

- [ ] `go build ./...` clean · `go vet ./...` clean
- [ ] `curl /health` → `{"status":"ok"}`
- [ ] Login → access token + refresh cookie; 6th bad attempt → `429`
- [ ] Guest order placed end-to-end via `cmd/demo_order`
- [ ] `go test ./be/internal/service/...` green (auth · order · payment)
- [ ] All 87 routes registered (diff route count vs **BE_STRUCTURE.md → Route Table**)

---

*BanhCuon System · BE Build From Zero · v1.0 · 2026-06-05*
