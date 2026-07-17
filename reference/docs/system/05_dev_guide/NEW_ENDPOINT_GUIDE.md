# New Endpoint Guide — Add a BE Endpoint That Fits the System

> **TL;DR:** Every new endpoint follows the same path: **Contract → DB → Query → Repo → Service
> → Handler → Route → Docs**. Contract first (API_SPEC + ERROR_SPEC), `sqlc generate` after any
> schema change, and `errors.Is(err, sql.ErrNoRows)` — never `==` — at the repo/service boundary.

---

## 1 — Decide the Contract First

Add/confirm the row in [`../02_spec/API_SPEC.md`](../02_spec/API_SPEC.md) (method, path, auth
level, request/response fields) and any new error codes in
[`../02_spec/ERROR_SPEC.md`](../02_spec/ERROR_SPEC.md) §2. Auth levels: `public / auth /
cashier+ / chef+ / manager+ / admin` (`API_SPEC.md` Conventions).

## 2 — DB Change Needed?

Goose migration (see [`.claude/skills/db-migration/SKILL.md`](../../../.claude/skills/db-migration/SKILL.md)):

```
be/migrations/NNN_description.sql     ← next number after current highest
-- +goose Up
ALTER TABLE ingredients ADD COLUMN notes TEXT;
-- +goose Down
ALTER TABLE ingredients DROP COLUMN notes;
```

```bash
goose -dir be/migrations mysql "$DB_DSN" up
cd be && sqlc generate      # MANDATORY after any ADD/DROP COLUMN
```

IDs are always `CHAR(36)` UUID strings. Most tables soft-delete via `deleted_at IS NULL` or
`is_active = 1` — every list/get query must filter accordingly.

## 3 — Query Layer (sqlc)

Write SQL in `be/query/<domain>.sql` with a `-- name: FuncName :one/:many/:exec` annotation,
then `cd be && sqlc generate`. Skipping this breaks `SELECT *` scans at runtime or fails the
build — generated structs in `be/internal/db/models.go` won't have the new field.

## 4 — Repository Layer

Add the method in `be/internal/repository/<domain>_repo.go`. If a lookup can return "not found,"
check with `errors.Is`, not `==` — repo methods wrap lower errors with `%w`:

```go
// repo: return Ingredient{}, fmt.Errorf("ingredient: get: %w", err)   // err may be sql.ErrNoRows

if errors.Is(err, sql.ErrNoRows) { ... }   // ✅ survives %w wrapping
if err == sql.ErrNoRows { ... }            // ❌ never matches once wrapped
```

This exact mistake is live today in `be/internal/service/ingredient_service.go` (lines 69, 101,
108 use `err == sql.ErrNoRows`) against `GetIngredientByID`, which wraps with
`fmt.Errorf("ingredient: get: %w", err)` in `ingredient_repo.go:147` — the check never fires and
a missing ingredient returns `500 INTERNAL_ERROR` instead of `404`. Do not repeat it.

## 5 — Service Layer

Business rules live here, not in the handler or repo. Check
[`../07_business_logic/`](../07_business_logic/) first (Rule #8 — one home per rule). Map known
error cases to `AppError` so the handler can unwrap them cleanly.

## 6 — Handler + DTO

`handler/<domain>_handler.go`: bind JSON, call the service, respond. No business logic, no
direct DB access (`BE_TECH_SUMMARY.md §2`).

```go
result, err := svc.DoSomething(ctx, input)
if err != nil {
    var appErr *service.AppError
    if errors.As(err, &appErr) {
        respondError(c, appErr.Status, appErr.Code, appErr.Message)
    } else {
        respondError(c, 500, "INTERNAL_ERROR", "Lỗi máy chủ nội bộ")
    }
    return
}
respondSuccess(c, http.StatusOK, result)
```

Binding tags: `required` only for non-empty strings or non-nil pointers — never on numerics
(`Price int64 \`binding:"required,min=0"\`` rejects a valid `price=0`; use `binding:"min=0"`).

## 7 — Route Registration

Register in `be/cmd/server/main.go`, inside the group matching the required auth level — a group
sets auth once (e.g. `adminR := v1.Group("/admin"); adminR.Use(authMW,
middleware.AtLeast("manager"))`). A stricter route inside that group (e.g. admin-only delete)
gets its own nested sub-group with `.Use(middleware.AtLeast("admin"))` — see the `admIngR`
sub-group around the `/admin` routes in `main.go`.

## 8 — Cache Invalidation (if applicable)

If the endpoint reads/writes a cached list (`products:list`, `toppings:list`, `combos:list`,
`categories:list`, `product:{id}`, `auth:staff:{id}`), follow
[`../03_be/REDIS_CACHE.md`](../03_be/REDIS_CACHE.md) — cache-aside only; every write must `Del`
the affected keys. Never cache orders, order items, payments, analytics, ingredients, staff
list, tables, training, or tasks.

## 9 — Realtime (if a write should push to clients)

Publish to the matching Redis channel per [`../03_be/REALTIME_SSE.md`](../03_be/REALTIME_SSE.md)
(e.g. `order:{id}` for order tracking, `orders:kds` for KDS) — only if clients are already
watching this state.

## 10 — Test + Build

```bash
go test ./be/internal/service/... -run TestYourNewThing
cd be && sqlc generate && go build ./...
```

## 11 — Update Docs on DONE

- [ ] Row in [`../02_spec/API_SPEC.md`](../02_spec/API_SPEC.md)
- [ ] Route Table in [`../03_be/BE_CODE_SUMMARY.md`](../03_be/BE_CODE_SUMMARY.md) §3
- [ ] Path in `docs/api/openapi.yaml` (Swagger UI at `:8090`)
- [ ] The `_be.md` of any page in [`../08_pages/`](../08_pages/) that will call this endpoint

---

## Common Mistakes

- `err == sql.ErrNoRows` instead of `errors.Is(err, sql.ErrNoRows)` — breaks once the repo wraps
  with `%w` (real bug, see §4).
- Forgetting cache invalidation after a write to a cached list — stale data up to 5 min TTL.
- Route added and working, but `BE_CODE_SUMMARY.md` §3 / `API_SPEC.md` left stale.
- Looser validation on POST than PATCH for the same field — keep `binding` tags consistent.
- `required` on a numeric field — silently rejects legitimate `0` (free topping, zero stock).
- Business logic leaking into handler or repository instead of service — breaks the layer
  contract in `BE_TECH_SUMMARY.md §2`.

---

## Deep Dive Sources

- [`../03_be/BE_TECH_SUMMARY.md`](../03_be/BE_TECH_SUMMARY.md) — layer rules, middleware, JWT/RBAC
- [`../03_be/BE_CODE_SUMMARY.md`](../03_be/BE_CODE_SUMMARY.md) §5 — the short checklist this guide expands
- `.claude/skills/db-migration/SKILL.md` — full migration sequence + field-name gotchas
- `.claude/skills/backend-go/SKILL.md` — error codes table, RBAC roles, SSE/WS patterns
