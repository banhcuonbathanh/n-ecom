# Scenario — The Scan (QR → Guest JWT → /menu)

> **TL;DR:** ✅ implemented · a diner sits down, aims their phone at the QR sticker on the table,
> and lands on `/menu` — ready to order — in under a second. This scenario zooms on the **airlock
> beat**: `fe/src/app/table/[tableId]/page.tsx` exchanges the 64-char token in the URL for a 2 h
> stateless guest JWT and table binding, writes both to Zustand memory, then redirects.
> Traced from source on branch `experience_claude.md_system_1`.
> Sources: `fe/src/app/table/[tableId]/page.tsx` · `fe/src/features/auth/auth.store.ts` ·
> `fe/src/store/cart.ts` · [customer_table_qr_be.md](customer_table_qr_be.md).
>
> BE endpoint traced in full → [customer_table_qr_be.md](customer_table_qr_be.md) ·
> FE zones → [customer_table_qr.md](customer_table_qr.md) ·
> Cross-page state → [customer_table_qr_crosspage_dataflow.md](customer_table_qr_crosspage_dataflow.md) ·
> Loading states → [customer_table_qr_loading.md](customer_table_qr_loading.md) ·
> Bugs found on this page → [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md) ·
> Surrounding lunch-rush context → [../customer_menu/SCENARIO_LUNCH_RUSH.md](../customer_menu/SCENARIO_LUNCH_RUSH.md) §B.

---

## Cast

- **Hòa** — a solo diner sitting down at Bàn 03, phone in hand.
- **`/table/<64-char-qr_token>`** — the airlock URL opened by the QR sticker on the table.
- **`POST /auth/guest`** (public) — the single BE call; full trace in
  [customer_table_qr_be.md](customer_table_qr_be.md).
- **`AuthService.GuestLogin`** + **`GetTableByQRToken`** — BE service + hand-written SQL repo
  (`auth_service.go:281-303` · `auth_repo.go:96-106`).
- **`useAuthStore`** + **`useCartStore`** — the two Zustand stores that receive the result
  (`auth.store.ts:12-18` · `cart.ts:40-156`).

## Setting

Tuesday lunch. Hòa sits at **Bàn 03**, picks up her phone, and scans the small QR sticker
affixed to the table card. The browser opens a URL whose path segment is the 64-character
`qr_token` that was generated when staff provisioned the table.

---

## Timeline — beat by beat

**00:00 — Scan.** The device's camera app (or native QR reader) resolves the sticker and
opens the restaurant's PWA at `/table/<64-char-qr_token>`. Next.js renders the
`TablePage` client component (`page.tsx:9`). No route-level spinner exists for this URL
(there is no sibling `loading.tsx`), so the browser's own navigation indicator is all that
shows.

**00:00.1 — Mount + fire.** `useEffect` runs immediately after first render
(`page.tsx:16-44`). While the `POST /auth/guest` call is in-flight the component renders
the **only** non-error UI it has: a CSS spinner (`w-10 h-10 border-4 … animate-spin`) and
the copy "Đang tải menu…" (`page.tsx:62-66`). There is no timeout guard — a hung request
leaves the spinner up indefinitely (see
[customer_table_qr_loading.md](customer_table_qr_loading.md) Flags).

**00:00.1 — The one request.**

```
POST /api/v1/auth/guest
Content-Type: application/json
{ "qr_token": "<64-char token from params.tableId>" }
```

Sent through the shared Axios instance `api` (`lib/api-client.ts`). No `Authorization`
header — the endpoint is fully public (`main.go:158`; sits above the `authMW`-gated
`protected` sub-group). The `qr_token` binding rule on the handler requires **exactly 64
characters** (`auth_handler.go:176-178`); any shorter or longer string fails immediately
with `400 INVALID_INPUT` before the service is even called.

**00:00.15 — BE: validate + mint.**

1. `authH.Guest` binds the body → calls `svc.GuestLogin(ctx, qrToken)`
   (`auth_handler.go:182-191`).
2. `AuthService.GuestLogin` calls `repo.GetTableByQRToken(ctx, qrToken)` — hand-written
   SQL: `SELECT … FROM tables WHERE qr_token = ? AND is_active = 1 AND deleted_at IS NULL
   LIMIT 1` (`auth_repo.go:97-98`). `sql.ErrNoRows` → `ErrNotFound`; any other DB error →
   500.
3. On a live row: `jwtpkg.GenerateGuestToken(table.ID)` (`jwt.go:73-92`) mints a 2 h
   HS256 JWT: `sub="guest"`, `role="customer"`, `table_id=<table.ID>`, `exp=now+7200`.
   Stateless — **no DB write, no Redis write**.
4. Returns `{ access_token, expires_in:7200, table{id,name,capacity,status} }`.
   Full chain → [customer_table_qr_be.md §Per-Endpoint Detail](customer_table_qr_be.md).

**00:00.2 — FE: store + redirect.**

```ts
// page.tsx:20-32
const { access_token, table } = res.data.data
const guestUser: User = {
  id: '', username: 'guest',
  full_name: `Bàn ${table.name}`,
  role: 'customer', is_active: true,
}
setAuth(guestUser, access_token)   // useAuthStore — memory only, never localStorage
setTableId(table.id)               // useCartStore — memory only (not in partialize)
setTableName(table.name)           // useCartStore — memory only
router.replace('/menu')            // replaces history; back-button cannot return to /table/…
```

`useAuthStore.setAuth` writes `{ user, accessToken }` into Zustand memory
(`auth.store.ts:15`). No `persist` middleware on this store — the token **never touches
`localStorage`** (XSS protection rule; home: `docs/core/MASTER_v1.2.md §6`).

`useCartStore.setTableId` / `setTableName` write into `cart.ts` state. `partialize`
(`cart.ts:153`) persists only `{ orderNote, activeOrderId }` — so `tableId` and
`tableName` are also **session-only** and are lost on F5.

`router.replace('/menu')` replaces the `/table/…` entry in the history stack so the back
button does not return to the airlock.

**00:00.3 — Hòa lands on `/menu`.** With a valid guest JWT in `useAuthStore` and
`tableId` + `tableName` in `useCartStore`, she can browse the menu, build a cart, and
submit an order attributed to Bàn 03. The Axios request interceptor (`api-client.ts`) will
automatically inject `Authorization: Bearer <access_token>` on every subsequent call.

For what happens next (cart → order → tracking), see the surrounding story:
[../customer_menu/SCENARIO_LUNCH_RUSH.md §11:40 beat](../customer_menu/SCENARIO_LUNCH_RUSH.md).

---

## Edge beats

### Bad / expired token

Hòa's colleague scans a weathered sticker whose `qr_token` has been rotated (table
deactivated and re-provisioned). The URL token is a valid 64-char string, so binding
passes. `GetTableByQRToken` hits `sql.ErrNoRows` → `ErrNotFound` → `handleServiceError`
→ `404 NOT_FOUND` (`respond.go:24-36`).

In the `.catch` branch (`page.tsx:34-42`): `err.response.data.error` is `"NOT_FOUND"`, not
`"TABLE_HAS_ACTIVE_ORDER"`, so the page falls to the `else`:

```ts
setError('Mã bàn không hợp lệ hoặc đã hết hạn. Vui lòng quét lại QR.')
```

The spinner is replaced by an error screen: a ⚠️ icon, the error copy, and a **"Vào menu"**
button that calls `router.replace('/menu')` (`page.tsx:46-58`). Pressing "Vào menu" without
a valid guest session lands on `/menu` with no auth — the behavior there is
❓ UNVERIFIED (no auth guard traced on the menu route for this scenario; see
[customer_table_qr_crosspage_dataflow.md](customer_table_qr_crosspage_dataflow.md)).

The same 404 path fires for a soft-deleted table (`deleted_at IS NOT NULL`) or a
deactivated one (`is_active = 0`) — they are indistinguishable from an unknown token to
the customer ([customer_table_qr_be.md Flag #4](customer_table_qr_be.md)).

A token shorter or longer than 64 chars (e.g., a human-typed `/table/5`) hits `400
INVALID_INPUT` from the binding rule before the service is called
(`auth_handler.go:184-187`; [customer_table_qr_be.md Flag #3](customer_table_qr_be.md)) —
same error screen.

### The dead `TABLE_HAS_ACTIVE_ORDER` branch

The FE `.catch` explicitly handles `code === 'TABLE_HAS_ACTIVE_ORDER'`
(`page.tsx:36-38`): it would redirect to `/order/<active_order_id>` so a re-scanning diner
joins their existing order rather than creating a second one.

**This branch is dead — and so is the guard.** `GuestLogin` (`auth_service.go:281-303`) never emits
`ErrTableHasActiveOrder`, and in fact `ErrTableHasActiveOrder` (`errors.go:30`) is **never returned
anywhere in `be/`**. `CreateOrder` (`order_service.go:256-275`) treats an existing active order as
informational only (`tableBusy` flag) and "never blocks creation" — `POST /orders` returns `201` +
`table_busy`, not a 409. So a diner who re-scans gets a **fresh guest JWT**, lands on `/menu`, and can
create a **second concurrent order on the same table** with no guard. The one-active-order rule
(BUSINESS_RULES §2.3) is unenforced in code (drift, flagged to owner).

Full analysis: [TABLE_QR_BUGS.md Bug 1](TABLE_QR_BUGS.md) (🟡 Low priority — no guard exists; the
re-scan UX never rejoins the existing order).

### F5 mid-session wipes everything

If Hòa refreshes the browser at any point after the scan — on `/menu`, while viewing her
order, anywhere — both Zustand stores reset to their initial values:

- `useAuthStore`: `{ user: null, accessToken: null }` — guest JWT gone.
- `useCartStore`: `{ items: [], tableId: null, tableName: null, … }` — cart and table
  binding gone. Only `{ orderNote, activeOrderId }` survive because they are in
  `partialize` (`cart.ts:153`).

The Axios interceptor will find no token → requests go out without `Authorization` →
protected endpoints return `401`. To recover, **Hòa must re-scan the QR sticker**. There
is no "resume session" flow and no refresh token for guests.

See durability detail →
[customer_table_qr_crosspage_dataflow.md §Reload behavior](customer_table_qr_crosspage_dataflow.md).

---

## Under the hood

### A · Cross-component (this page)

This page has **no** inter-widget data sharing — it renders exactly one thing at a time:
either the spinner+copy or the error screen. There are no shared sub-components. That is
why there is no `_crosscomponent_dataflow.md` for this page: the whole component is 67
lines and all state is local `useState<string|null>` for `error`, plus the two Zustand
writes at the end.

### B · Cross-page

The only durable output of this page is the two memory-only Zustand writes:

| Written here | Store | Key persisted? | Consumed by |
|---|---|---|---|
| `accessToken` | `useAuthStore` | ❌ memory only | Every subsequent API call via Axios interceptor |
| `user` (`guestUser`) | `useAuthStore` | ❌ memory only | Any component reading `user.full_name` |
| `tableId` | `useCartStore` | ❌ not in `partialize` | `POST /orders` payload · cart bar label |
| `tableName` | `useCartStore` | ❌ not in `partialize` | Menu header display ("Bàn 03") |

Full cross-page lifecycle →
[customer_table_qr_crosspage_dataflow.md](customer_table_qr_crosspage_dataflow.md).

### C · FE → BE send

Exactly one request leaves the browser from this page:

```
POST /api/v1/auth/guest
Body: { "qr_token": "<64 chars>" }
Auth: none (public route)
```

No prices, no user IDs, no session cookies. The body carries only the opaque token. On
`router.replace('/menu')` this page is unmounted and never fires again during the session.

### D · BE → FE receive / live

One synchronous JSON response:

```jsonc
{ "data": {
    "access_token": "<2h HS256 JWT>",
    "expires_in":   7200,
    "table": { "id": "<uuid>", "name": "03", "capacity": 6, "status": "available" }
} }
```

`expires_in` and `table.capacity`/`table.status` are returned but **ignored** by the FE
(`page.tsx:20` reads only `access_token` + `table.id` + `table.name`;
[customer_table_qr_be.md Flag #2](customer_table_qr_be.md)).

No SSE, no WebSocket, no polling on this page.

### E · Loading + caching

- **No route-level `loading.tsx`** for `/table/[tableId]/` — the component renders the
  CSS spinner itself while the POST is in-flight.
- **No TanStack Query** — the call is a raw `api.post(…).then(…).catch(…)` in a `useEffect`
  (`page.tsx:16-44`). There is no retry, no timeout, no `staleTime`.
- **No Redis, no HTTP cache** — the BE reads MySQL directly on every scan; the token is
  minted in-process. Latency = one MySQL round-trip + JWT sign.
- The guest JWT has a **2 h wall-clock expiry** known only from the JWT payload itself; the
  FE tracks no `expiresAt`.

Full loading-state detail →
[customer_table_qr_loading.md](customer_table_qr_loading.md).

### F · Monitoring

No page-specific instrumentation. The `POST /auth/guest` call is counted by the global
Prometheus metrics middleware (`main.go:117` — `gin.Logger()` + `Metrics()`). A spike in
4xx on this endpoint (bad tokens, deactivated tables) or a p95 > 500 ms alert would surface
on the "BanhCuon — API Monitoring" Grafana dashboard at `:3001`.

Rate-limiting gap: `POST /auth/guest` has **no rate-limit middleware** — none exists in
`be/internal/middleware/` ([customer_table_qr_be.md Flag #5](customer_table_qr_be.md)).
An unusual burst of requests to this public endpoint would only be visible as a request-rate
spike in Grafana, not blocked.

---

## One-line mental model

> `/table/<token>` is a **one-shot airlock**: one public POST, one JWT minted in memory,
> one redirect — the page does nothing else and leaves nothing on disk; lose the tab and the
> whole session evaporates.
