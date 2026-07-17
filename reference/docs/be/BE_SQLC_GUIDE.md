# BE sqlc Data-Layer Guide

> **Version:** v1.0 · 2026-06-05 (P-BEBLUEPRINT-1)
> **Purpose:** the one missing piece for rebuilding the BE from docs alone — how the `repository → db` layer is generated.
> **Why this matters:** the entire `internal/db/` package is **generated**, never hand-written. Without this guide a rebuilder can recreate handlers/services from the other summaries but cannot reproduce the foundation they sit on.
> **Source of truth:** `be/sqlc.yaml` + `be/query/*.sql`. This doc mirrors them; if they change, update here.

---

## 0 — The data-layer pipeline

```
migrations/*.sql   (DDL — the schema sqlc reads to know column types)
        +
query/*.sql        (hand-written SQL + -- name: annotations)
        │
        ▼  sqlc generate
internal/db/        (GENERATED — models.go · querier.go · *.sql.go)  ← DO NOT EDIT
        ▲
repository/*.go     (hand-written thin wrappers that call db.Queries methods)
```

**Rule:** you write SQL in `query/`, run `sqlc generate`, and get type-safe Go in `internal/db/`. The repository layer wraps those generated methods; it never writes SQL inline.

---

## 1 — `sqlc.yaml` (verbatim — copy to a new project, change `overrides`)

```yaml
version: "2"
sql:
  - engine: "mysql"
    queries: "query/"        # input: hand-written .sql files
    schema: "migrations/"    # DDL source — sqlc reads column types from here
    gen:
      go:
        package: "db"
        out: "internal/db"           # generated code lands here
        emit_json_tags: true         # struct fields get `json:"..."` tags
        emit_prepared_queries: false
        emit_interface: true         # generates the Querier interface (enables mocking)
        emit_exact_table_names: false
        emit_empty_slices: true      # :many returns [] not nil — safer for JSON
        query_parameter_limit: 4     # ≤4 params = positional args; >4 = a Params struct
        overrides:
          - column: "staff.shifts"   # map a specific column to a custom Go type
            go_type:
              import: "encoding/json"
              type: "RawMessage"     # JSON column → json.RawMessage, not string
```

### Config decisions worth carrying to other projects

| Setting | Value | Why |
|---|---|---|
| `schema` points at `migrations/` | not a separate schema file | sqlc infers types from the real goose migrations — one source of truth for the schema |
| `emit_interface: true` | — | produces `Querier` interface so services can be unit-tested against a mock DB |
| `emit_empty_slices: true` | — | `:many` queries return `[]T{}` on no rows, never `nil` → clean JSON arrays, no null |
| `query_parameter_limit: 4` | — | **gotcha:** a query with ≤4 params generates positional Go args; the 5th param flips it to a generated `XxxParams` struct. Changing this value silently changes repository call signatures. |
| `overrides` | per-column | JSON/enum columns that shouldn't be plain `string`. `staff.shifts` → `json.RawMessage`. Add a row per such column. |

---

## 2 — `query/` file layout

One file per domain. Maps roughly to the repository files.

```
query/
├── auth.sql        → staff + refresh_tokens
├── products.sql    → products + categories + toppings + combos + combo_items + product_toppings
├── orders.sql      → orders + order_items + order_sequences
├── payments.sql    → payments
├── files.sql       → file_attachments
├── tasks.sql       → staff_tasks
└── training.sql    → training_guides + roles + progress + quiz_attempts
```

> Note: `tables`, `staff` (admin CRUD), `analytics`, and `ingredients` queries live inside the files above or are issued via other domains — the file set is by **migration group**, not 1:1 with every table. When adding a domain, create `query/<domain>.sql`.

---

## 3 — Query annotation convention (the part you must get right)

Every query is preceded by a magic comment: `-- name: <GoMethodName> :<mode>`.

| Mode | Returns | Use for |
|---|---|---|
| `:one` | single struct + `error` (`sql.ErrNoRows` if absent) | get-by-id, get-by-unique-key, COUNT |
| `:many` | slice of structs + `error` | list queries |
| `:exec` | `error` only | INSERT / UPDATE / DELETE with no returned row |
| `:execrows` | `(int64, error)` — rows affected | when you need the affected-row count |
| `:execresult` | `sql.Result` | when you need `LastInsertId` (rare here — PKs are UUIDs) |

- `<GoMethodName>` becomes the method on the generated `*Queries` type, e.g. `q.GetStaffByUsername(ctx, username)`.
- `?` placeholders bind positionally. ≤4 → individual args; >4 → a `<Name>Params` struct (see `query_parameter_limit`).
- `SELECT col_a, col_b` generates a struct of exactly those columns. `SELECT *` generates the full table model — prefer explicit columns when you need `COALESCE`/computed fields.

---

## 4 — Representative examples (verbatim from `query/auth.sql`)

These three cover every mode you'll write 90% of the time.

### `:one` — get-by-key, with COALESCE for a nullable JSON column

```sql
-- name: GetStaffByUsername :one
SELECT id, username, password_hash, email, role, full_name, phone, is_active,
       created_at, updated_at, deleted_at, job_title,
       COALESCE(shifts, '[]') AS shifts, responsibilities
FROM staff
WHERE username = ? AND deleted_at IS NULL
LIMIT 1;
```
→ `func (q *Queries) GetStaffByUsername(ctx, username string) (GetStaffByUsernameRow, error)`
Note `COALESCE(shifts, '[]') AS shifts` guarantees the `json.RawMessage` is never NULL — pairs with the `overrides` entry. Note the `WHERE deleted_at IS NULL` soft-delete filter (mandatory on every read — see DB_SCHEMA_SUMMARY).

### `:exec` — insert with server-side defaults

```sql
-- name: CreateRefreshToken :exec
INSERT INTO refresh_tokens (id, staff_id, token_hash, user_agent, ip_address, expires_at, last_used_at)
VALUES (?, ?, ?, ?, ?, ?, NOW());
```
→ `func (q *Queries) CreateRefreshToken(ctx, arg CreateRefreshTokenParams) error`
7 params (>4) ⇒ sqlc generates `CreateRefreshTokenParams{ID, StaffID, TokenHash, UserAgent, IPAddress, ExpiresAt}`. `NOW()` is server-side so it is **not** a param.

### `:many` — list, ordered

```sql
-- name: ListActiveSessionsByStaff :many
SELECT * FROM refresh_tokens
WHERE staff_id = ? AND expires_at > NOW()
ORDER BY last_used_at ASC;
```
→ `func (q *Queries) ListActiveSessionsByStaff(ctx, staffID string) ([]RefreshToken, error)`
With `emit_empty_slices: true` this returns `[]RefreshToken{}` (not nil) when there are no rows.

### `:one` returning a COUNT — also `:one`

```sql
-- name: CountActiveSessionsByStaff :one
SELECT COUNT(*) AS count FROM refresh_tokens
WHERE staff_id = ? AND expires_at > NOW();
```
→ returns `int64`. Used by the service to enforce "max 5 sessions per staff".

---

## 5 — How the repository wraps generated code

The repository is a thin pass-through that exists so the service layer never imports `db/` directly (preserves the strict layer rule). Pattern:

```go
// internal/repository/auth_repo.go
type AuthRepo struct { q *db.Queries }

func NewAuthRepo(q *db.Queries) *AuthRepo { return &AuthRepo{q: q} }

func (r *AuthRepo) GetStaffByUsername(ctx context.Context, username string) (db.GetStaffByUsernameRow, error) {
    return r.q.GetStaffByUsername(ctx, username)   // ← generated method
}
```

Transactions: open a `*sql.Tx`, call `db.New(tx)` (or `q.WithTx(tx)`) to get a `*Queries` bound to the transaction, run the writes, commit. The `recalculateTotalAmount` rule (every order_items mutation) is implemented this way — see `order_repo.go`.

---

## 6 — Generation workflow (run order matters)

```bash
# 1. Write/extend the DDL first — sqlc needs the column to exist in migrations/ to know its type
#    (edit be/migrations/0NN_*.sql)

# 2. Write the query in be/query/<domain>.sql with a -- name: annotation

# 3. Regenerate
cd be && sqlc generate

# 4. Verify it compiles (catches type drift immediately)
go build ./...
```

> **The #1 mistake:** adding a column in a migration but not running `sqlc generate`. The generated struct then lacks the field, `SELECT *` scans fail, and `go build` breaks on missing fields. Run generate **immediately** after any `ALTER`/`CREATE`/`DROP COLUMN`. (Also in BE_SYSTEM_GUIDE §8.9 + BE_DEV_GUIDE §5.)

---

## 7 — `cmd/` CLI tools (non-server binaries)

The repo ships small one-shot Go programs alongside the server. They are not part of the request path but are needed to bootstrap and exercise a fresh environment.

| Binary | Run | Purpose |
|---|---|---|
| `cmd/server` | `go run ./be/cmd/server` | The HTTP server — DI wiring, routes, jobs, graceful shutdown. Also auto-runs goose migrations on boot when `DB_DSN` is set. |
| `cmd/seed` | `go run ./be/cmd/seed/main.go` | One-shot: inserts demo accounts for every role (admin/manager/cashier/chef/staff) with bcrypt-hashed passwords. Idempotent-ish seed for a fresh DB. |
| `cmd/qr` | `go run ./be/cmd/qr/main.go` | Prints the QR URL for every active table so you can open/scan them. Reads `DB_DSN`; uses `FE_HOST` to build the URL. |
| `cmd/demo_order` | `go run ./be/cmd/demo_order/main.go [--table "Bàn 2"] [--items 4] [--api http://localhost:8080]` | End-to-end smoke: simulates a guest scanning a QR → `POST /auth/guest` → `GET /products` → `POST /orders` against the real API. |

> Reusing on another project: keep `cmd/seed` + `cmd/demo_order` — a seed script and a happy-path smoke binary make a fresh BE testable in one command each. Drop `cmd/qr` if there's no QR flow.

---

## 8 — Reuse checklist (porting the data layer to a new project)

1. Copy `sqlc.yaml`; clear the `overrides` list, then add one row per JSON/enum column in the new schema.
2. Create `migrations/` (goose) + `query/` folders. Write DDL first.
3. Adopt the `-- name: X :mode` convention from day one — pick method names that read as repository calls.
4. Mind `query_parameter_limit` — decide the threshold before writing 5-param queries, or call signatures churn.
5. `sqlc generate` → `go build ./...` after **every** schema change.
6. Keep repositories as thin wrappers; never let `service/` import `db/`.

---

*BanhCuon System · BE sqlc Data-Layer Guide · v1.0 · 2026-06-05*
