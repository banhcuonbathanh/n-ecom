# BE_PLAYBOOK.md — Backend Engineering Playbook (F-11)

> Rules and procedures adopted from the old system's BE docs (`reference/docs/be`) —
> the workmanship layer under `BE_STATE.md`'s design layer. BE_STATE.md says what the
> architecture IS; this file says HOW to build inside it without repeating the old
> system's mistakes. One fact one home: layering/tx/errors/validation live in
> `BE_STATE.md`; Redis policy in `ARCHITECTURE.md §4`; old-system defects in
> `OVERALL_PLAN.md §6`; commands in `ENVIRONMENT.md`. Nothing here duplicates those —
> this file owns the data-layer workflow, code gotchas, and doc-maintenance discipline.
> Visual companion / adoption rationale: `harness/diagrams/task-F-11.html`.

---

## 1. Data-layer workflow (goose + sqlc) — feeds F-3, C-1, every schema task

The entire `internal/.../db` package is **generated, never hand-written**:

```
db/migrations/*.sql   (DDL — sqlc reads column types from the real migrations)
        +
db/queries/*.sql      (hand-written SQL, one file per domain, `-- name: X :mode`)
        │
        ▼  sqlc generate
internal/db/          (GENERATED — models · querier · *.sql.go)  ← never edit
        ▲
repository/<domain>/  (thin wrappers; services never import db/ directly)
```

**Golden rule (the old system's #1 mistake):** after ANY migration that creates,
alters, or drops a column → `sqlc generate && go build ./...` **immediately**, before
writing code that touches the change. Skipping it = phantom compile errors and failed
`SELECT *` scans one task later.

**Run order is strict:** DDL first (sqlc needs the column to exist) → query → generate
→ build. Never write a query against a column that isn't in a migration yet.

### sqlc.yaml decisions we adopt (locked unless F-3 finds a blocker)

| Setting | Value | Why |
|---|---|---|
| `schema:` | points at `db/migrations/` | schema truth = the real migrations, not a parallel schema file |
| `emit_interface` | `true` | generated `Querier` interface → services unit-test against a mock DB |
| `emit_empty_slices` | `true` | `:many` returns `[]` not `nil` → JSON arrays never render as `null` |
| `query_parameter_limit` | pick in F-3 and never change | crossing the threshold silently flips positional args ↔ Params struct on every query — churn in all repo call sites |
| `overrides` | one row per JSON/enum column | JSON columns → `json.RawMessage`, not `string` |

### Query conventions

- `-- name: <GoMethodName> :one|:many|:exec|:execrows` — method names read as
  repository calls (`GetProductByID`, `ListOrdersByUser`).
- Prefer explicit column lists over `SELECT *` when a `COALESCE`/computed field is
  involved; `COALESCE(json_col, '[]')` for nullable JSON so the Go value is never nil.
- Every read query carries the soft-delete / active filter (`deleted_at IS NULL` or
  `is_active = 1`) **in the SQL**, not re-filtered in Go.

## 2. Migration-file standard (checklist for every `db/migrations/NNN_*.sql`)

- [ ] Numbered `NNN_snake_case.sql`, `Up` + `Down` blocks; `Down` drops in reverse-FK
      order and must round-trip clean (that's the F-3/C-1 AC already).
- [ ] PKs: `CHAR(36)` UUID strings — never auto-increment ints for entities.
- [ ] Money: integer-valued `DECIMAL` in the smallest currency unit (VND ⇒ `DECIMAL(10,0)`) — never FLOAT/DOUBLE.
- [ ] Index every FK, every status column, every `created_at` used for sorting.
- [ ] `utf8mb4` + unicode collation on every table (Vietnamese text).
- [ ] CHECK constraints for invariants the type system can't express
      (`quantity > 0`, mutually-exclusive nullable FK combinations).
- [ ] A denormalized column (e.g. `orders.total_amount`) gets a comment naming its
      recalc rule, and the recalc runs in the same tx as every mutation of its inputs.
- [ ] Derivable facts get **no column at all** — status that's a function of other
      columns is computed in one Go helper + mirrored SQL predicates (old system's
      `qty_served` lesson; also lessons register #9).

## 3. Go/Gin gotcha rules (each one cost the old system a real bug)

1. **Numeric validation:** `binding:"required"` on a numeric field rejects `0`.
   Use `binding:"min=0"` (no `required`) for numbers where zero is legal (price 0,
   qty_served 0). `required` is for strings and pointers only.
2. **Middleware gets dependencies as parameters** (small interfaces), never via
   package-level globals — a nil global silently skips the check it guards.
3. **No account enumeration:** unknown user and wrong password return the same
   `UNAUTHORIZED` envelope, and the unknown-user path runs a fake bcrypt compare so
   response timing matches (~80ms).
4. **JWT parsing:** verify the signing method is HMAC *before* accepting claims;
   refresh tokens are stored as SHA-256 hashes — the raw value exists only in the
   httpOnly cookie.
5. **Never store a sentinel in an FK column:** guest/absent actor ⇒ `NULL`, not a
   magic string — FK constraints turn sentinels into 500s.
6. **DB pool is configured in code** at boot (`MaxOpenConns`/`MaxIdleConns`/
   `ConnMaxLifetime`), values noted in `ENVIRONMENT.md` when F-2 sets them.
7. **Long-lived handlers (SSE/WS, P/R phases):** every spawned goroutine gets
   `defer recover()`; heartbeat + explicit deadlines from day one.
8. **Webhook order is non-negotiable (P phase):** HMAC verify → amount matches the DB
   record → idempotency check (`status == completed` ⇒ 200 no-op) → write. Amount
   check after HMAC blocks valid-signature/wrong-amount fraud.
9. **Realtime payloads:** FE consumes what the BE *marshals*, not what a spec says —
   the generated event contract (OVERALL_PLAN §3.5) is the only source.

## 4. Caching discipline — adds on top of `ARCHITECTURE.md §4` + `BE_STATE.md §7`

- **Invalidate by `Del`, never update-in-place** — deleting is race-safe, rewriting
  the cached value on write is not.
- **One key-builder helper per key family** (`productKey(id)`), used by every reader
  AND every invalidator — the old system's stale-`is_active` bug was two call sites
  spelling the same key differently.
- **One TTL constant per cache family**, not per call site.
- **Fail-open vs fail-closed is decided per touchpoint and written down** in the
  invalidation map when C-2 locks the Redis policy. Note the trade-off we inherit:
  fail-open on rate-limit/is_active means a Redis outage weakens those controls.

## 5. BE build order (feeds F-2/F-3 — the dependency spine)

```
0 go mod init + folder tree  → 1 migrations (DDL)  → 2 sqlc.yaml + queries
→ 3 sqlc generate (db/ exists — nothing compiles before this)
→ 4 platform pkgs (config · errs · cache · middleware)
→ 5→7 per domain, vertically: repository → service → handler
→ 8 main.go wiring (config → DB → redis → repos → services → middleware → handlers → routes)
→ 9 compose + migrate-on-boot  → 10 seed + smoke
```

- **Vertical slices:** one domain through all three layers before the next (matches
  the C→CC→O phase order). Auth-style blockers first when a phase has them.
- `migrate.sh` / boot sequence waits for MySQL (ping loop) before goose runs; a BE
  that races MySQL on `docker compose up` is a bug, not a retry instruction.

## 6. Seed + smoke tooling (rule for F-2/C-1 onward)

Every phase that adds a domain keeps two one-command tools working:

- **Seed** (`cmd/seed` or `db/seed.sql`): idempotent demo data for the new tables —
  re-runnable on a fresh volume without manual steps.
- **Smoke** (`cmd/smoke`): a happy-path binary hitting the real API (health → list
  products → place order as the phases land). It's the cheapest VERIFY receipt and the
  first thing run after any compose rebuild.

## 7. Code-summary docs (the discipline that kept the old BE navigable)

`CONTEXT_MAP.md` rule 1 ("summaries over source") becomes concrete the moment real BE
code exists:

- **From C-2 onward** the harness maintains `harness/BE_SUMMARY.md`: the route table
  (method · path · auth tier), per-endpoint request/response DTO shapes + error codes,
  and the schema/Redis-key summary. Sessions read it instead of grepping Go.
- **Same-scope-contract rule:** any task that adds/changes a route, DTO, column, or
  Redis key updates BE_SUMMARY.md in the same task — a summary that can drift is worse
  than no summary (CONTEXT_MAP rule 3).
- Each summary section carries a one-line "how to re-verify" note (e.g. route count
  diffed against `main.go`) so staleness is checkable, not vibes.
- C-2's scope contract registers BE_SUMMARY.md in the doc inventory (Hard Rule 6).

---

*Adopted 2026-07-18 (F-11) from `reference/docs/be` — BE_SQLC_GUIDE · BE_BUILD_FROM_ZERO ·
BE_SYSTEM_GUIDE §8 · BE_CACHING_STRATEGY · be_code_summary/README. The reference stays
read-only source material; on any conflict, this file + BE_STATE.md win for our project.*
