# Public Landing — `/` · Backend View

> **TL;DR:** every BE endpoint the marketing/demo landing page calls, traced handler → service →
> repository → SQL, with auth, caching and error behaviour. The page **body** (`app/page.tsx`) is
> fully static; all BE traffic comes from two client widgets — **StaffQuickLogin** (one-click staff
> login) and the **TableGrid → SimulateBtn** "Giả lập khách" demo helper (a 4-call guest→menu→order
> chain). A third widget, **DevPanel**, calls a **Next.js** route (`/api/dev/run`), **not** the Go
> BE — see Flags. Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/auth_handler.go` ·
> `be/internal/service/auth_service.go` · `be/internal/handler/order_handler.go` ·
> `be/internal/service/order_service.go` · `be/internal/handler/product_handler.go` ·
> `be/internal/service/product_service.go` · FE `fe/src/app/page.tsx` ·
> `fe/src/app/StaffQuickLogin.tsx` · `fe/src/app/TableGrid.tsx` ·
> `fe/src/components/shared/DevPanel.tsx` · `fe/src/app/api/dev/run/route.ts`.
>
> FE view + zones → [public_landing.md](public_landing.md) ·
> Cross-page session handoff → [public_landing_crosspage_dataflow.md](public_landing_crosspage_dataflow.md) ·
> In-flight states → [public_landing_loading.md](public_landing_loading.md) ·
> Narrative → [SCENARIO_LANDING_DEMO.md](SCENARIO_LANDING_DEMO.md) ·
> Code bugs found this run → [LANDING_BUGS.md](LANDING_BUGS.md) ·
> Order write pipeline → [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) ·
> RBAC / role redirect → [../../02_spec/BUSINESS_RULES.md §1](../../../02_spec/BUSINESS_RULES.md).

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `POST /auth/login` | **public** | `authH.Login` | `AuthService.Login` | `GetStaffByUsername` + session tx | none (login rate-limit key only) |
| 2 | `POST /auth/guest` | **public** | `authH.Guest` | `AuthService.GuestLogin` | `GetTableByQRToken` (hand-written SQL, **not** sqlc) | none |
| 3 | `GET /products?is_available=true` | **public** | `productH.ListProducts` | `ListProducts` | `ListProductsAvailable` | `products:list` |
| 4 | `GET /combos` | **public** | `productH.ListCombos` | `ListCombos` | `ListCombosAvailable` | `combos:list` |
| 5 | `POST /orders` | authMW (guest JWT OK) | `orderH.Create` | `OrderService.CreateOrder` | tx: insert order + items | — |

Route registration: `be/cmd/server/main.go:155` (`/auth/login`), `:158` (`/auth/guest`), `:168`
(`GET /products`), `:216` (`GET /combos`), `:231-232` (orders group `authMW` + `POST ""`). All under
`/api/v1` (`main.go:148`).

**Which widget calls which:**
- **StaffQuickLogin** (`StaffQuickLogin.tsx:34`) → #1 only, via `auth.api.login()` (`auth.api.ts:9-10`,
  the shared `lib/api-client.ts` axios instance).
- **TableGrid → SimulateBtn** "Giả lập khách" (`TableGrid.tsx:32-118`) → the chain #2 → #3 + #4
  (parallel) → #5, via a **raw `axios`** instance (`TableGrid.tsx:5,11`), **not** the shared
  api-client.
- The static **table-name links** and the Hero/Footer "Thử Menu Khách" / "Demo Khách" buttons are
  plain `next/link`s to `/table/:token` (`page.tsx:47-57,135,305,326`) — they call **no** BE here;
  the guest exchange happens on the `/table/:tableId` page (see [C3](../customer/customer_table_qr/customer_table_qr_be.md)).
- **DevPanel** (`DevPanel.tsx:30`) → `POST /api/dev/run` — a **Next.js** route, not the Go BE
  (Flags #5).

---

## Auth Model on This Page

- **All five Go endpoints are reachable without a prior session** — the page is the public entry
  point, so every call it makes is either public or mints its own token:
  - **#1 `POST /auth/login`** is public (`main.go:155`, above the `protected` sub-group
    `:159-164`). It is the *source* of a staff session — it returns an access token + sets an
    httpOnly refresh cookie (`auth_handler.go:43`).
  - **#2 `POST /auth/guest`** is public (`main.go:158`). It mints the **guest** JWT
    (`sub="guest"`, `role="customer"`, `table_id`, 2 h) — full detail in
    [C3 `customer_table_qr_be.md`](../customer/customer_table_qr/customer_table_qr_be.md).
  - **#3/#4 catalog GETs** are fully public (`main.go:168,216`) — no `authMW`. SimulateBtn sends
    the freshly-minted guest token as a `Bearer` header anyway (`TableGrid.tsx:39`), but the
    routes do not require it.
  - **#5 `POST /orders`** requires `authMW` (`main.go:231`). The guest JWT from #2 satisfies it;
    because the caller role is `customer`, the handler stores `created_by = NULL`
    (`order_handler.go:90-92`).
- **Role-based redirect after #1** is FE-side: `StaffQuickLogin.STAFF[].redirect` maps
  admin/manager/staff → `/admin`, cashier → `/pos`, chef → `/kds` (`StaffQuickLogin.tsx:9-13`).
  The BE only returns the `role` string (`auth_handler.go:56`); it does not redirect. RBAC home:
  [BUSINESS_RULES §1](../../../02_spec/BUSINESS_RULES.md).
- **Seeded demo credentials** are hardcoded FE-side: every quick-login button posts password
  `Admin@123` (`StaffQuickLogin.tsx:34`) against usernames `admin`/`manager`/`cashier`/`chef`/`staff`.
  These rely on the seed (`go run ./be/cmd/seed/main.go`, triggerable from DevPanel) having created
  those accounts.

---

## Per-Endpoint Detail

### 1 · `POST /auth/login` (StaffQuickLogin)

- **Handler** `Login` (`auth_handler.go:29-61`): binds `loginRequest{ Username (required,min=3),
  Password (required,min=8) }` (`:22-25`). Bind failure → `400 INVALID_INPUT` (`:32`). On success
  calls `svc.Login(ctx, username, password, c.ClientIP(), userAgent)` (`:37`), sets the httpOnly
  refresh cookie (`:43`), and returns `data.{ access_token, user{ id, username, full_name, role,
  email } }` (`:49-60`). The FE reads only `user` + `access_token` (`auth.api.ts:9-10`,
  `StaffQuickLogin.tsx:34`).
- **Service** `Login` (`auth_service.go:69-`):
  1. **Login rate-limit — `checkLoginRateLimit(ctx, ipAddr)`: 5 req/min per IP** (`:70-73`). This
     is the one place a real rate limit exists (contrast `/auth/guest`, which has none — Flags #4).
  2. `repo.GetStaffByUsername` (`:76`); `sql.ErrNoRows` → `ErrInvalidCredentials` (same error as a
     bad password — no user-enumeration oracle, `:78-80`).
  3. `bcryptpkg.Verify` (`:85`) → `ErrInvalidCredentials` on mismatch.
  4. `is_active` checked **after** bcrypt (timing-oracle defence) → `ErrAccountDisabled` (`:90-92`).
  5. `jwtpkg.GenerateAccessToken(staff.ID, role)` (`:95`).
  6. Refresh token minted + capped at `maxSessions` (5) — oldest session deleted if at limit
     (`:101-112`) — then persisted (`CreateRefreshToken`, `:123+`).
- **Cache:** none for the response. The only Redis touch is the login rate-limit counter key.

### 2 · `POST /auth/guest` (SimulateBtn step 1)

Full trace lives in [C3 `customer_table_qr_be.md` §1](../customer/customer_table_qr/customer_table_qr_be.md).
Here SimulateBtn sends `{ qr_token }` extracted from the table card's href
(`TableGrid.tsx:30,37`) and reads `data.{ access_token, table{ id, name } }` (`:38`). Same
hand-written `GetTableByQRToken` SQL, same stateless 2 h guest JWT, **no Redis, no DB write**.

### 3 · `GET /products?is_available=true` (SimulateBtn step 2)

Full trace → [C1 `customer_menu_be.md` §2](../customer/customer_menu/customer_menu_be.md). SimulateBtn
sends `params: { is_available: true }` + the guest `Bearer` header (`TableGrid.tsx:45`), but the
handler **reads no query params** (Flags #2) — it always returns the cached available list. The FE
reads `data` as `{ id, price, name }[]` (`:49`).

### 4 · `GET /combos` (SimulateBtn step 2, parallel)

Full trace → [C1 `customer_menu_be.md` §3](../customer/customer_menu/customer_menu_be.md). Cached
`combos:list`, available-only. FE reads `data` as `{ id, price, name }[]` (`TableGrid.tsx:50`).

### 5 · `POST /orders` (SimulateBtn step 4 — `source:'qr'`)

- FE builds the payload **inline in SimulateBtn**, **not** through `lib/order-payload.ts`
  (`TableGrid.tsx:62-87`): 2–4 random products + 0–1 random combo, each
  `{ product_id|combo_id, quantity, topping_ids: [] }`; header `customer_name` = random Vietnamese
  name, `customer_phone: ''`, `note: 'Đơn demo — giả lập khách hàng'`, `table_id` from the guest
  response, `source: 'qr'`. ⚠️ This is the **second** order-create caller that bypasses the single
  `buildOrderItemsPayload` builder (the first is POS — see [Flags #3](#flags)).
- **Handler** `Create` (`order_handler.go:` → `:106-121`): validates product/combo XOR per item
  (`:82-85`), sets `created_by=NULL` for the guest (`:90-92`), calls `CreateOrder`, returns
  `201` + `data.{ id, table_busy }` (`:121`).
- **Service** `CreateOrder` (`order_service.go:262-352`): snapshots name/price server-side, expands
  combos, computes `total_amount`; `order_number` from the Redis counter with DB fallback. Full DTO
  + DB mapping → [OBJECT_MODEL_ORDER §2.3–§2.7](../../02_spec/object/OBJECT_MODEL_ORDER.md).
  **`table_busy` is informational only and never blocks creation** — a busy table still gets a
  parallel order (`:269-275`, comment `:256-261`).
- After success SimulateBtn re-issues `setAuth(guestUser, access_token)` +
  `setTableId/setTableName` into Zustand (`TableGrid.tsx:91-99`) and `router.push('/order/<id>')`
  (`:103`). No `GET /orders/:id` is called here — the destination `/order/:id` page fetches it.

---

## Caching & Invalidation

- **Auth (#1, #2):** no Redis read-cache. `Login` reads MySQL every call; the only Redis touch is
  the **login rate-limit counter** (5/min/IP, `auth_service.go:70-73`). `GuestLogin` reads `tables`
  directly, mints the token in-process.
- **Catalog (#3, #4):** shared 5-min TTL keys `products:list` / `combos:list`
  (`product_service.go:21`), invalidated write-side by admin product/combo mutations (see
  [A3 PRODUCTS_BUGS / cross-page concerns](../admin/admin_products/admin_products_be.md)). Cache
  failures are non-fatal (fall through to MySQL). Same keys the customer `/menu` reads — a SimulateBtn
  demo hits exactly the customer catalog path.
- **Orders (#5):** no read-cache; only the `order_number` Redis counter is touched on write.

---

## Error Behaviour

- **#1 `POST /auth/login`:**
  - `400 INVALID_INPUT` — username < 3 or password < 8 chars (`auth_handler.go:32`).
  - `401 INVALID_CREDENTIALS` — unknown user or wrong password (`auth_service.go:79,86`).
  - `403 ACCOUNT_DISABLED` — valid password but `is_active=0` (`auth_service.go:91`).
  - `429` (rate-limit) — > 5 login attempts/min/IP (`auth_service.go:71`).
  - FE: any failure → inline red text `"Đăng nhập thất bại cho <label>"` and the buttons re-enable
    (`StaffQuickLogin.tsx:37-40`) — the specific code/message is **not** surfaced.
- **#2 `POST /auth/guest`:** `400` (bad/!=64-char token) · `404` (unknown/soft-deleted table) ·
  `500` (missing `JWT_SECRET`) — see [C3 Error Behaviour](../customer/customer_table_qr/customer_table_qr_be.md).
- **#3/#4 catalog GETs:** bind/service errors → `respondError`; SimulateBtn treats an **empty**
  product+combo result as a soft error: `status='error'`, msg `"Không có món nào"`
  (`TableGrid.tsx:52-54`).
- **#5 `POST /orders`:** `400 INVALID_INPUT` on bind / XOR failure; service errors via
  `handleServiceError`. SimulateBtn catches everything and shows `resp.data.message ?? 'Giả lập
  thất bại'`, then auto-resets to idle after 3 s (`TableGrid.tsx:114-117`).
- SimulateBtn additionally branches on `resp.data.error === 'TABLE_HAS_ACTIVE_ORDER'`
  (`TableGrid.tsx:107`) — **a dead branch** (see Flags #1 / [LANDING_BUGS.md](LANDING_BUGS.md) Bug 1).

---

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **SimulateBtn `TABLE_HAS_ACTIVE_ORDER` branch is dead** | `TableGrid.tsx:107-113` redirects to the table's `active_order_id` when `POST /orders` returns `TABLE_HAS_ACTIVE_ORDER`, but `ErrTableHasActiveOrder` (`errors.go:30`) is **never returned anywhere in `be/`** (grep → definition only). `CreateOrder` returns `201` + informational `table_busy` and creates a **parallel** order (`order_service.go:269-275`). So a "giả lập khách" on a busy table silently makes a second order and navigates to it. This is the **same dead-branch root** as C3 (`page.tsx:36`) and C8 checkout (`checkout/page.tsx:79`) — cross-cutting. → [LANDING_BUGS.md](LANDING_BUGS.md) Bug 1 (🟡 Low). |
| 2 | **`GET /products` ignores `is_available` (and all query params)** | SimulateBtn sends `params:{is_available:true}` (`TableGrid.tsx:45`) but the handler reads zero query params — it always returns the cached available-only list (`ListProductsAvailable`). The param is a no-op; the filtering is already implicit in the query. Same flag as [customer_menu_be.md Flag 1](../customer/customer_menu/customer_menu_be.md). |
| 3 | **SimulateBtn bypasses the single `order-payload.ts` builder** | The project rule is "every cart→order payload goes through `buildOrderItemsPayload`" (`fe/CLAUDE.md`), but SimulateBtn hand-builds `items[]` inline (`TableGrid.tsx:62-87`). Harmless here (random demo data, no toppings/combo overrides), but it is a **second** divergent caller alongside POS (S4) — any change to the order item shape must remember this path. |
| 4 | **`/auth/login` is rate-limited; `/auth/guest` is not** | `Login` enforces 5 req/min/IP (`auth_service.go:70-73`); `GuestLogin` has no limit and **no rate-limit middleware exists** in the codebase (global chain = `Logger, Recovery, Metrics` + CORS). A page that exposes both a one-click login *and* a one-click guest+order on a public URL leans entirely on the login counter; the simulate chain is unthrottled. |
| 5 | **DevPanel calls a Next.js route that runs shell commands with NO auth and NO prod guard** | `POST /api/dev/run` (`api/dev/run/route.ts:13-33`) `exec`s one of three whitelisted commands (`go run ./be/cmd/seed/main.go`, `docker compose up -d --build be|fe`) on the host with a 5-min timeout. It checks **only** that `cmd` is in the whitelist — **no authentication, no `NODE_ENV !== 'production'` gate, no CSRF**. This is a Next.js route (outside the Go BE, so not in the endpoints table above), reachable from the public landing page `/`. → [LANDING_BUGS.md](LANDING_BUGS.md) Bug 2 (🔴 High — must not ship to prod). |
| 6 | **Hardcoded demo data** | Quick-login password `Admin@123` (`StaffQuickLogin.tsx:34`) and the table QR tokens (`page.tsx:47-57`) are baked into the FE. The buttons fail if the DB was not seeded with those accounts/tables. `table_busy` is response-only and never appears on `GET /orders/:id` (same as [customer_menu_be.md Flag 3](../customer/customer_menu/customer_menu_be.md)). |
