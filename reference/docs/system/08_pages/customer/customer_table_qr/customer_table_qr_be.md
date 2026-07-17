# Customer Table QR Landing — `/table/:tableId` · Backend View

> **TL;DR:** the single BE endpoint this "airlock" page calls (`POST /auth/guest`), traced
> handler → service → repository → SQL, with auth, error behaviour and flags. The page exchanges
> the URL token (`params.tableId` is the **qr_token**, not a numeric id) for a stateless 2 h guest
> JWT + the table row, stores both in Zustand **memory only**, then `router.replace('/menu')`.
> **No Redis cache, no DB write.** Traced from source on branch `experience_claude.md_system_1`
> (NOT from docs).
> Sources: `be/cmd/server/main.go` (routes) · `be/internal/handler/auth_handler.go` ·
> `be/internal/service/auth_service.go` · `be/internal/repository/auth_repo.go` ·
> `be/pkg/jwt/jwt.go` · `be/internal/handler/respond.go` · FE `fe/src/app/table/[tableId]/page.tsx`.
>
> FE view + zones → [customer_table_qr.md](customer_table_qr.md) ·
> Guest-JWT rule → [../../../02_spec/BUSINESS_RULES.md §5.2](../../../02_spec/BUSINESS_RULES.md) ·
> One-active-order rule → [../../../02_spec/BUSINESS_RULES.md §2.3](../../../02_spec/BUSINESS_RULES.md) ·
> Code bugs found this run → [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md).

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|---|---|---|---|---|---|
| 1 | `POST /auth/guest` | **public** | `authH.Guest` | `AuthService.GuestLogin` | `GetTableByQRToken` (hand-written SQL, **not** sqlc) | none |

Route registration: `be/cmd/server/main.go:158` (`authR.POST("/guest", authH.Guest)`), under the
`/auth` group `main.go:154`, all under `/api/v1` (`main.go:148`). The route sits **above** the
`authMW`-gated `protected` sub-group (`main.go:159-164`) — it is fully public.

This is the page's only BE call. On success the page writes the response into two Zustand stores in
memory (`useAuthStore.setAuth`, `useCartStore.setTableId`/`setTableName` — `page.tsx:29-31`) and
redirects; nothing is persisted to localStorage and no order/cart endpoint is hit here.

---

## Auth Model on This Page

- **`POST /auth/guest` is fully public** — no `authMW`, no role gate (`main.go:158`). It is the
  *source* of the guest session, so it cannot require one.
- **Guest JWT minted here** (`jwt.GenerateGuestToken`, `jwt.go:73-92`): `sub="guest"`,
  `role="customer"`, `table_id=<table.ID>`, `exp = now + 2h`. Signed HS256 with `JWT_SECRET`.
  Stateless — no DB row, no refresh (rule home: [BUSINESS_RULES.md §5.2](../../../02_spec/BUSINESS_RULES.md)).
- The FE stores this token in **Zustand memory only, never localStorage** (`page.tsx:29` comment +
  `useAuthStore.setAuth`) — an F5 on any later page wipes it and forces a re-scan.
- `created_by` rule: orders later created under this token are attributed to the guest/table, not a
  staff user — out of scope for this page (see [customer_menu_be.md](../customer_menu/customer_menu_be.md)).

---

## Per-Endpoint Detail

### 1 · `POST /auth/guest`

- **Handler** `Guest` (`auth_handler.go:182-207`): binds `guestRequest{ QRToken string
  \`json:"qr_token" binding:"required,len=64"\` }` (`:176-178`). A missing token **or any length ≠
  exactly 64 chars** fails binding → `400 INVALID_INPUT` "qr_token không hợp lệ (yêu cầu 64 ký
  tự)" (`:184-187`). On success calls `svc.GuestLogin` and serializes under `{"data": …}` with
  `access_token`, `expires_in`, and `table{id,name,capacity,status}` (`:195-206`). The FE unwraps
  `res.data.data` and reads only `access_token` + `table.{id,name}` (`page.tsx:20`).
- **Service** `GuestLogin` (`auth_service.go:281-303`):
  1. `repo.GetTableByQRToken(ctx, qrToken)` (`:282`). `sql.ErrNoRows` → `ErrNotFound` (→ 404);
     any other error wrapped `auth: get table by qr token: %w` (→ 500) (`:283-288`).
  2. `jwtpkg.GenerateGuestToken(table.ID)` (`:290`). Error (e.g. `JWT_SECRET` unset) wrapped → 500
     (`:291-293`).
  3. Returns `GuestLoginResult{ AccessToken, ExpiresIn: 7200, TableID, TableName, Capacity,
     TableStatus }` (`:295-302`). **No active-order check happens here** — see Flags #1.
- **Repo / SQL** `authRepo.GetTableByQRToken` (`auth_repo.go:96-106`): a **hand-written** query
  (not a sqlc-generated one):
  `SELECT id, name, qr_token, capacity, status, is_active, created_at, updated_at, deleted_at FROM
  tables WHERE qr_token = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1`. A soft-deleted or
  deactivated table returns `ErrNoRows` → 404 (Flags #4).
- **JWT** `GenerateGuestToken` (`jwt.go:73-92`): see Auth Model above. Returns an error if
  `JWT_SECRET` env is empty (`:74-77`).
- **Response shape:** `{ access_token, expires_in, table{ id, name, capacity, status } }`
  (`auth_handler.go:195-206`). The FE consumes only `access_token`, `table.id`, `table.name`;
  `expires_in`, `table.capacity`, `table.status` are returned but **ignored** (Flags #2).

---

## Caching & Invalidation

- **No Redis read cache, no write cache.** `GuestLogin` reads `tables` directly via MySQL on every
  call and the token is minted in-process. There is no cache key to invalidate.
- The only client-side "cache" is the in-memory Zustand session (auth + cart stores), gone on
  reload — see [customer_table_qr_loading.md](customer_table_qr_loading.md) and
  [customer_table_qr_crosspage_dataflow.md](customer_table_qr_crosspage_dataflow.md).

---

## Error Behaviour

- **400 `INVALID_INPUT`** — `qr_token` absent or not exactly 64 chars (`auth_handler.go:184-187`).
  FE: not `TABLE_HAS_ACTIVE_ORDER`, so it falls to the generic branch → error screen "Mã bàn không
  hợp lệ hoặc đã hết hạn. Vui lòng quét lại QR." + "Vào menu" link (`page.tsx:39-41,46-59`).
- **404 `NOT_FOUND`** — unknown / soft-deleted / deactivated table: `GetTableByQRToken` →
  `ErrNoRows` → `ErrNotFound` → `handleServiceError` (`respond.go:24-36`) → 404. FE: same generic
  error screen (it only special-cases `TABLE_HAS_ACTIVE_ORDER`).
- **500 `COMMON_002`** — any unwrapped repo error or a missing `JWT_SECRET` → `handleServiceError`
  fallback (`respond.go:34-35`). FE: same generic error screen.
- The FE has **no** loading-timeout / retry; a hung request leaves the spinner up indefinitely (see
  [customer_table_qr_loading.md](customer_table_qr_loading.md)).

---

## Flags

| # | Flag | Detail |
|---|---|---|
| 1 | **FE `TABLE_HAS_ACTIVE_ORDER` branch is dead — and the error code is dead everywhere** | `page.tsx:36-38` redirects to `/order/:active_order_id` when the guest call returns `TABLE_HAS_ACTIVE_ORDER`, but `GuestLogin` (`auth_service.go:281-303`) **never** returns it. In fact `ErrTableHasActiveOrder` (`errors.go:30`) is **defined but never returned anywhere in `be/`** (`grep -rn "ErrTableHasActiveOrder" be/` → only the definition), so the two *other* FE consumers (`TableGrid.tsx:107`, `checkout/page.tsx:79`) are **also dead**. `CreateOrder` allows concurrent orders per table — `tableBusy` is informational and "never blocks creation" (`order_service.go:256-275`; handler returns `201` + `table_busy`, `order_handler.go:121`). A re-scan mints a **fresh** guest token → `/menu`, and a second order on the same table succeeds. The one-active-order rule ([BUSINESS_RULES §2.3](../../../02_spec/BUSINESS_RULES.md#23-one-active-order-per-table)) is therefore **unenforced in code** (cross-cutting drift, flagged to owner, annotated in §2.3). → [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md) Bug 1 (🟡 Low). |
| 2 | **Response fields ignored by FE** | BE returns `expires_in`, `table.capacity`, `table.status` (`auth_handler.go:198-204`); the page reads only `access_token`, `table.id`, `table.name` (`page.tsx:20`). The token's real expiry (2 h) is known only from the JWT itself, not tracked client-side. |
| 3 | **Path param name is misleading** | The route is `/table/:tableId` and the param is `params.tableId`, but it is sent verbatim as `qr_token` (`page.tsx:18`). Combined with the `len=64` bind rule, any human-typed `/table/5` fails with 400 → error screen. The "tableId" segment is really the 64-char QR token. |
| 4 | **`is_active=0` / soft-deleted tables 404 the same as unknown tokens** | The repo query filters `is_active = 1 AND deleted_at IS NULL` (`auth_repo.go:97-98`); a deactivated table is indistinguishable from a bad token to the customer (both → generic error). |
| 5 | **Public, no rate limit** | `POST /auth/guest` has no `authMW` and **no rate-limit middleware** — none exists in the codebase (`be/internal/middleware/` has only `auth.go`, `metrics.go`, `rbac.go`; global chain is `gin.Logger(), gin.Recovery(), Metrics()` + CORS, `main.go:117,126`). [BUSINESS_RULES.md §5.2](../../../02_spec/BUSINESS_RULES.md) claims "5 req/min/IP on POST /auth/guest" — **not implemented** (drift, logged in the Decision Log; flagged to owner — a security control, not just a stale fact). |
| 6 | **Repo uses raw SQL, not sqlc** | `authRepo.GetTableByQRToken` (`auth_repo.go:96-106`) is hand-written; a parallel sqlc-style `tableRepo.GetTableByQRToken` also exists (`table_repo.go:71`) but the auth service uses its own repo. Harmless, noted for layer-rule completeness. |
