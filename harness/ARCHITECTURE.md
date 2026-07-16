# ARCHITECTURE.md — Components & Alignment Blueprint (F-6)

> Owner of truth for: **component inventory, layer contracts, FE↔BE interaction,
> Redis policy, and the alignment-enforcement gates.**
> Stack, domains, business rules and the file map stay in `PLAN.md` — this file
> never repeats them, it links. Visual version: `harness/diagrams/architecture.html`.

---

## 1. Runtime components — 5 containers, one entry door

| # | Component | Port | Responsibility | Talks to | Never does |
|---|---|---|---|---|---|
| 1 | **Caddy** (reverse proxy) | 80 | Single public entry. Routes `/api/*` → Go API, everything else → Next.js | Go API, Next.js | business logic, auth decisions |
| 2 | **Go API** (Gin) | 8080 | ALL business logic, validation, auth, the error envelope | MySQL, Redis | rendering HTML |
| 3 | **Next.js FE** | 3000 | Rendering + UX state. SSR pages fetch from the Go API | Go API only | touching MySQL/Redis, business rules |
| 4 | **MySQL 8** | 3306 | **The only source of truth** — every business fact lives here | — | — |
| 5 | **Redis 7** | 6379 | Disposable accelerator: cache + ephemeral counters (§4) | — | holding data that can't be rebuilt from MySQL |

Two hard consequences, worth stating once:
- **FE never talks to MySQL or Redis.** Its entire world is `/api/*` over HTTP.
- **`redis-cli FLUSHALL` must never lose a business fact.** If losing a key loses
  data, that data was in the wrong store — that's a bug.

## 2. Backend internal structure — 4 layers × 5 domains + platform packages

### Layers (strict, from PLAN.md §Architecture rules — repeated here only as contracts)

| Layer | Package | May do | Must NOT do |
|---|---|---|---|
| handler | `internal/handler/` | parse/validate request shape, call ONE service method, write response or error envelope | business rules, SQL, touch Redis |
| service | `internal/service/` | business rules (stock, cancel window, merge), orchestrate repos, use the `Cache` interface | parse HTTP, write SQL strings |
| repository | `internal/repository/` | sqlc-generated + hand-written MySQL access | business rules, HTTP, Redis |
| db | `db/queries/*.sql` + migrations | SQL sources of the repository layer | — |

Dependency direction is one-way: `handler → service → repository → db`.
A lower layer importing a higher one, or a skip (handler→repository), is a bug.

### Domain modules (one folder per domain in each layer)

| Domain | Owns | Key service responsibilities |
|---|---|---|
| catalog | products, categories, search | list/detail/search reads; the only v1 Redis-cached domain |
| cart | guest+user carts | add/update/remove, stock-cap, merge-on-login (PLAN rule 5) |
| checkout | order placement | address validation, price snapshot, atomic stock decrement (rules 3–4) — orchestrates cart + orders repos, owns no tables |
| orders | orders, order_lines, lifecycle | my-orders, detail, cancel window + stock restore (rules 1–3) |
| accounts | users, auth | register/login, bcrypt, JWT issue/verify |

### Platform packages (cross-cutting, no domain logic)

| Package | Responsibility |
|---|---|
| `internal/platform/errs` | the ONE error-envelope type + writer — every handler error goes through it |
| `internal/platform/middleware` | auth (JWT), request logging, panic recovery |
| `internal/platform/cache` | the ONLY package importing the redis client; exposes a small `Cache` interface (Get/Set/Del + TTL) |
| `internal/platform/config` | env parsing — the only reader of `os.Getenv` |
| `internal/domain/constants.go` | status enums, cookie names, error codes — one file (PLAN §Architecture rules) |

## 3. FE ↔ BE interaction contract

- **One API client** — `fe/src/lib/api/` is the only module that calls `fetch`.
  Components/hooks import typed functions from it, never raw fetch.
- **Base URL:** browser calls hit relative `/api/*` (Caddy routes them);
  SSR/server components call the internal compose DNS name `http://be:8080`
  (env `API_INTERNAL_URL`). One switch, inside the client, nowhere else.
- **Errors:** the client parses the envelope `{"error":{code,message,details}}`
  in ONE place and throws a typed `ApiError{code, message, details}`. UI code
  switches on `code`, never on message strings or raw status.
- **Types:** request/response DTOs live in `fe/src/lib/api/types.ts`, mirroring
  the Go DTOs 1:1. When a BE task changes a DTO, updating this file is part of
  the same task's scope contract — that is the FE/BE sync mechanism.
- **State handling** (cache keys, loading/error policy, stores) is owned by
  `FE_STATE.md` — read that, not this file, for FE-internal structure.
- **Auth:** JWT from A-1, carried in an httpOnly cookie — never JS-readable
  (decided F-5, see `FE_STATE.md` + STATE.md 2026-07-17).

## 4. Redis policy 💡 *proposal — owner may adjust before C-2 starts*

**Principle: Redis is a disposable accelerator, never a system of record.**

| Rule | Detail |
|---|---|
| v1 uses | (a) **catalog read cache** — cache-aside in the catalog service: product detail + list pages. (b) **rate limiting** on auth endpoints — arrives with A-1, not before. Nothing else in v1. |
| Explicit non-uses | cart (MySQL, cookie token — PLAN rule 5) · sessions (JWT is stateless) · orders/stock (transactional, MySQL only) |
| Access | only `platform/cache` imports the redis client; services use the `Cache` interface; handlers and repositories never see Redis |
| Keys | `v1:{domain}:{entity}:{id}` — e.g. `v1:catalog:product:42`, `v1:catalog:list:{filterhash}` |
| TTL | short by default (60 s catalog); TTL-first expiry, plus explicit `Del` on any write path that mutates the cached entity |
| Degradation | Redis down ⇒ log + fall through to MySQL. A cache outage slows the shop, never breaks it. Every cached path must work with the cache stubbed out. |

## 5. Alignment — how the structure stays aligned

Alignment is not good intentions; it is **gates**. Each mechanism below fires at
a specific moment, and skipping it is a Hard-Rule violation, not a style choice.

| # | Gate | Fires when | What it prevents |
|---|---|---|---|
| 1 | **Docs as law** — PLAN.md rules + this file; one fact, one home (CONTEXT_MAP rule 3) | READ step of every task | two sessions holding different pictures of the system |
| 2 | **Scope contract** — exact files listed before code; extra file ⇒ STOP | PLAN/REPORT steps | sprawl, accidental cross-domain edits |
| 3 | **Layer contract check** — §2 table reviewed against the diff | SELF-REVIEW step | layer skipping, redis/sql imports in the wrong package |
| 4 | **Single-file choke points** — one API client, one error writer, one constants file per side, one cache adapter | by construction | drift by duplication; N copies of an enum |
| 5 | **Receipts** — curl/screenshot proof logged in VERIFICATION.md; curl transcripts double as the living API contract | VERIFY step | "works on my telling" ✅s; FE building against an imagined API |
| 6 | **CI** (F-4) — build + test on push; then `depguard`/import-boundary lint so §2's arrows are machine-checked | every push | layering decaying silently as code grows |
| 7 | **Drift rule** (Hard Rule 5) — code wins, doc fixed in the same task | any mismatch noticed | docs poisoning future sessions' context |
| 8 | **DTO mirror rule** (§3) — BE DTO change ⇒ `types.ts` in same scope contract | any contract-touching task | FE/BE shape mismatch |

**Per-task alignment checklist (run at SELF-REVIEW):**
1. Every changed file was in the scope contract.
2. No import crosses a layer arrow in §2 (grep `internal/handler` for `repository|redis`, etc.).
3. Errors leave handlers only via `platform/errs`.
4. New enum/constant landed in the ONE constants file (each side), nowhere else.
5. If a DTO changed → `types.ts` changed in the same diff.
6. If code contradicted a harness doc → doc fixed, noted in STATE.md.

## 6. Diagrams

- `harness/diagrams/architecture.html` — visual version of this file: container
  map, layer flow, add-to-cart sequence with Redis, alignment-gate board.
