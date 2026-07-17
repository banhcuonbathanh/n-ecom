# BE_STATE.md — Backend State, Data Flow & Error Design

> Expands `PLAN.md §Architecture rules (BE layering)` into the full working design.
> Read this before any BE task (F-3, F-4, C-2, C-3, CC-2, CC-4, O-2, A-1, A-3).
> One fact one home: stack lives in `PLAN.md §Stack`; the layer/domain/platform inventory
> lives in `ARCHITECTURE.md §2`; the Redis policy in `ARCHITECTURE.md §4`. This file owns
> HOW data, transactions and errors flow through the backend.
> Visual companion: `harness/diagrams/be-state-data.html`.

---

## 1. The four kinds of backend state (and the fifth that's banned)

Every piece of backend data has exactly ONE owner. The BE twin of FE_STATE.md §1:
data living in two places (a stock count cached in a struct *and* in MySQL) is how
overselling bugs happen.

| # | Kind | Owner | Examples in this project | Never do |
|---|---|---|---|---|
| 1 | **Business state** | MySQL, via the repository layer | products, categories, carts, orders, users, stock | read/write it from a handler; keep it in Redis |
| 2 | **Cache state** | Redis, via `platform/cache` only | catalog detail/list cache, auth rate counters (A-1) | store anything that can't be rebuilt from MySQL |
| 3 | **Request state** | `context.Context` (one request's lifetime) | request id, auth claims/userID, deadline | stash it in a global; let it outlive the request |
| 4 | **Config state** | `platform/config`, read once at boot | DSNs, JWT secret, ports, TTLs | call `os.Getenv` elsewhere; mutate after boot |
| 5 | **In-process mutable state** | **BANNED** for business facts | ~~package vars holding carts/stock/sessions~~ | — the API stays stateless; kill -9 loses nothing |

Allowed in-process state is immutable wiring only: the router, parsed config, prepared
dependencies injected at startup. If a `var` at package level can change after boot and
a customer would notice losing it, it belongs in MySQL (kind 1) or Redis (kind 2).

**Decision flow for any new piece of data:**

```
Would losing it lose a business fact?        → MySQL via repository   (kind 1)
Rebuildable + only there to make reads fast? → Redis via platform/cache (kind 2)
Scoped to one request (who/trace/deadline)?  → context.Context        (kind 3)
Known at boot, never changes?                → platform/config        (kind 4)
None of the above                            → it's a local variable — keep it one
```

## 2. Request flow — one straight line

```
Caddy (/api/*)
   ▼
Gin router
   ▼
middleware chain            recover → request-log → auth (JWT verify, sets claims)
   ▼
handler/<domain>            bind DTO → shape-check → call ONE service method → write DTO
   ▼                          (errors: platform/errs writes the envelope — nothing else does)
service/<domain>            business rules · tx boundaries (§3) · Cache interface (§7)
   ▼
repository/<domain>         sqlc-generated + hand-written MySQL access
   ▼
MySQL                       the only source of truth
```

- Dependency direction is one-way; skips (handler→repository) are bugs — the layer
  contract table is `ARCHITECTURE.md §2`, machine-checked from F-4 (depguard).
- A handler calls exactly ONE service method. Orchestrating two services in a handler
  means the orchestration is business logic in the wrong layer — move it into a service
  (checkout is the worked example: its service orchestrates cart + orders repos).
- DTOs (request/response structs, json tags) live in the handler layer; sqlc row types
  never leak past the service. Every response DTO is mirrored 1:1 in
  `fe/src/lib/api/types.ts` (ARCHITECTURE.md §3, gate 8).

## 3. Transactions & consistency

**Services own transaction boundaries; repositories never Begin/Commit.** Repository
methods accept a querier (sqlc's `WithTx` pattern), so the same method runs standalone
or inside a service-opened transaction. One transaction per request, maximum; never
nested; opened as late and closed as early as possible.

| Operation | Tx? | Inside the transaction |
|---|---|---|
| place order (CC-4) | ✅ | lock lines `SELECT … FOR UPDATE` → check every line's stock → decrement → insert order + order_lines with price/name snapshot (rules 3–4) → clear cart. Any line short ⇒ rollback, `INSUFFICIENT_STOCK` |
| cancel order (O-2) | ✅ | re-check status ∈ {placed, confirmed} (rule 2) → set `cancelled` → restore stock in full (rule 3). Status moved on ⇒ rollback, `CANCEL_WINDOW_CLOSED` |
| cart merge on login (A-3) | ✅ | sum quantities per product, cap at available stock (rule 5) → delete guest cart |
| cart add / update qty (CC-2) | ✅ | read stock → upsert line capped at stock — cap check and write in one tx |
| all reads (lists, details, my-orders) | ❌ | single statements; never open a tx to read |

**Stock is only ever mutated inside a transaction** with the row locked. No
check-then-act across two requests, no compensating "fix-up" writes outside a tx.

## 4. Error design (the envelope's producing side)

One path: services return typed domain errors → the handler hands them to
`platform/errs` → it writes the Session-0 envelope `{"error":{code,message,details}}`.
Handlers never build error JSON by hand; repositories return raw errors (`sql.ErrNoRows`
etc.) and services translate them into domain errors.

| `code` | HTTP | Raised by | When |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 / 422 | handler (bind/shape) · service (field rules) | 400 = unparseable request; 422 = fields fail rules; `details[]` = `{field, issue}` |
| `UNAUTHORIZED` | 401 | auth middleware | missing/invalid/expired JWT on a protected route |
| `FORBIDDEN` | 403 | service | authenticated but not the owner (e.g. someone else's order) |
| `NOT_FOUND` | 404 | service (from `sql.ErrNoRows`) | product/order/cart line doesn't exist |
| `CONFLICT` | 409 | service | duplicate email on register; generic state conflict |
| `INSUFFICIENT_STOCK` | 409 | service (checkout/cart) | stock cap or atomic-decrement failure (rule 3) |
| `CANCEL_WINDOW_CLOSED` | 409 | service (orders) | cancel after `shipped` (rule 2) |
| `RATE_LIMITED` | 429 | auth middleware (A-1) | login/register burst — arrives with A-1, not before |
| `INTERNAL` | 500 | platform/errs fallback | anything unmapped — never leaks the Go error text |

- Codes are constants in `internal/domain/constants.go` (the ONE constants file) —
  this table is the FE contract's other half: FE branches on exactly these strings
  (`FE_STATE.md §4`). Adding a code = updating this table + constants.go + FE handling
  in the same scope contract.
- `message` is human-readable and safe for users; internals (SQL, stack traces) go to
  the request log with the request id — never into the envelope.
- 5xx are logged at error level with stack; 4xx at info — expected traffic, not incidents.

## 5. Validation tiers (mirror of the FE's Zod-vs-server split)

1. **Shape — handler.** Gin binding + validator tags: types, required, min/max, enum
   membership. Fails fast with `VALIDATION_FAILED` + `details[]` before any service call.
2. **Business — service.** Anything needing state or rules: stock caps, cancel window,
   duplicate email, price integrity. Never in handlers, never in SQL triggers.

Same limits both sides of the wire (FE Zod min qty 1 ⇔ BE tag `min=1`), but the BE is
the authority — FE validation is UX, BE validation is law (FE_STATE.md §6 already
assumes the stock-cap rejection).

## 6. Auth & request identity (feeds A-1)

- JWT arrives in the **httpOnly cookie** (decided F-5); auth middleware verifies it and
  puts typed claims into the request context — the ONLY writer of that key.
- Handlers read the identity via one typed helper (`auth.UserID(ctx)`), then pass
  `userID` to services as an **explicit parameter**. Services never dig claims out of
  context — signatures stay honest and testable.
- Guest identity is the opaque cart-token cookie (rule 5): the cart handler reads/sets
  it, the cart service receives it as a parameter — same pattern as userID.
- Passwords: bcrypt only, hash in the accounts service; the plaintext never leaves the
  register/login handler scope and is never logged.

## 7. Cache usage pattern

Policy (what's cached, keys, TTLs, degradation) is owned by `ARCHITECTURE.md §4` — read
it there. What this file adds is the code pattern:

- Cache-aside lives **in the service**: `Get` → hit ⇒ return; miss ⇒ repository →
  `Set` with TTL → return. Handlers and repositories never see the `Cache` interface.
- Every write path that mutates a cached entity calls `Del` on its keys in the same
  service method (e.g. order placement decrements stock ⇒ `Del` product detail keys).
- Cache errors are logged and swallowed — a Redis outage degrades to MySQL reads,
  never to a 5xx (`ARCHITECTURE.md §4` degradation rule).

## 8. Folder layout (extends PLAN.md §File map — exact paths)

```
be/
  cmd/api/main.go            # wiring only: config → deps → router → listen
  internal/
    handler/{catalog,cart,checkout,orders,accounts}/   # DTOs + Gin handlers
    service/{catalog,cart,checkout,orders,accounts}/   # rules, tx boundaries, cache use
    repository/{catalog,cart,checkout,orders,accounts}/ # sqlc-generated + hand-written
    domain/constants.go      # status enums, error codes, cookie names — THE one file
    platform/
      errs/                  # envelope type + writer — every handler error exits here
      middleware/            # recover, request-log, auth (JWT), rate-limit (A-1)
      cache/                 # THE only redis import; small Cache interface
      config/                # THE only os.Getenv reader
  db/
    migrations/              # numbered up/down pairs (F-3 picks the tool)
    queries/*.sql            # sqlc sources
```

## 9. Hard BE rules (violations are bugs, same weight as PLAN.md rules)

1. Layering is strict: `handler → service → repository → db`; no skips, no reverse
   imports (`ARCHITECTURE.md §2`).
2. Business facts live in MySQL only. No package-level mutable business state;
   `FLUSHALL` and `kill -9` must never lose a fact.
3. Every handler error exits via `platform/errs`; error codes come from
   `domain/constants.go`; the envelope never carries internal error text.
4. Transactions begin/commit in services only; stock mutations always run inside a
   locked transaction (§3 map).
5. Handlers validate shape, services validate business — never the other way.
6. `os.Getenv` only in `platform/config`; the redis client only in `platform/cache`.
7. Identity (userID, cart token) is passed to services as explicit parameters —
   services never read the request context for claims.
8. A response-DTO change updates `fe/src/lib/api/types.ts` in the same scope contract
   (ARCHITECTURE.md gate 8) — and if it adds an error code, §4's table too.
