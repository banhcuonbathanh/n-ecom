# Table QR Landing — `/table/:tableId`

> **TL;DR:** ✅ implemented · public → guest JWT · Invisible "airlock" page the customer lands on
> after scanning a QR sticker. Sends the 64-char QR token to `POST /auth/guest`, stores the
> returned guest JWT + table binding in Zustand **memory only**, then `router.replace('/menu')`.
> Customer sees only a spinner or an error screen — there are no interactive widgets.
>
> Source traced: `fe/src/app/table/[tableId]/page.tsx` · `fe/src/features/auth/auth.store.ts` ·
> `fe/src/store/cart.ts` · branch `experience_claude.md_system_1`.
>
> Doc set: [BE](customer_table_qr_be.md) · [crosspage](customer_table_qr_crosspage_dataflow.md) ·
> [loading](customer_table_qr_loading.md) · [scenario](SCENARIO_TABLE_SCAN.md).
> Cross-component file: **N/A** — single page component, no widget interactions.
> Bugs: [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md).

---

## ASCII Wireframe

```
Loading state (normal — sub-second):          Error state (bad/expired/deactivated token):
┌──────────────────────────────┐              ┌──────────────────────────────┐
│                              │              │                              │
│                              │              │             ⚠️               │ ← inline JSX
│         ◌                    │              │  Mã bàn không hợp lệ hoặc    │   page.tsx:49-50
│   (spinner, border-primary,  │              │  đã hết hạn. Vui lòng quét   │
│    border-t-transparent,     │              │  lại QR.                     │
│    animate-spin)             │              │                              │
│                              │              │      Vào menu  (button)      │ ← page.tsx:51-56
│     Đang tải menu…           │              │                              │
│                              │              └──────────────────────────────┘
└──────────────────────────────┘
   page.tsx:62-66 (spinner)
```

No layout shell, no nav, no bottom bar — this page renders full-screen in both states.

---

## Zones

| Zone | Component / file:line | Data source |
|---|---|---|
| Spinner | inline JSX · `page.tsx:61-66` | shown while `POST /auth/guest` is in flight |
| Error screen | inline JSX · `page.tsx:46-59` | `error` local state set on `.catch` (`page.tsx:40`) |
| Auth write | `useAuthStore.setAuth` · `auth.store.ts:15` | response `access_token` + built guest user (`page.tsx:21-29`) |
| Table write | `useCartStore.setTableId` / `setTableName` · `cart.ts:91-92` | response `table.id`, `table.name` (`page.tsx:30-31`) |

---

## Key Interactions

- **On mount** (`useEffect`, dep `[params.tableId]`, `page.tsx:16-44`):
  - `api.post('/auth/guest', { qr_token: params.tableId })` — the URL segment is the 64-char QR
    token, sent verbatim (`page.tsx:18`).
  - **Success** → build a guest `User` object client-side (`page.tsx:21-28`), call
    `setAuth(guestUser, access_token)` (memory only, `page.tsx:29`), call
    `setTableId(table.id)` + `setTableName(table.name)` (`page.tsx:30-31`), then
    `router.replace('/menu')` (`page.tsx:32`).
  - **Error `TABLE_HAS_ACTIVE_ORDER`** → `router.replace(activeId ? /order/${activeId} : '/menu')`
    (`page.tsx:36-38`). **This branch is DEAD** — `GuestLogin` never emits this error. See
    Flags §1 and [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md) Bug 1.
  - **Any other error** → `setError('Mã bàn không hợp lệ hoặc đã hết hạn. Vui lòng quét lại
    QR.')` (`page.tsx:40`).
- **"Vào menu" button** (`page.tsx:51-56`) → `router.replace('/menu')` — navigates to menu even
  without a valid session (guest can browse, but order creation will fail downstream).
- There is no loading timeout and no retry — a hung network request leaves the spinner up
  indefinitely (see [customer_table_qr_loading.md](customer_table_qr_loading.md)).

---

## Business Logic Used

- Guest JWT (2 h, stateless, `sub="guest"`, `role="customer"`, `table_id`) →
  [../02_spec/BUSINESS_RULES.md §5.2](../02_spec/BUSINESS_RULES.md#52-guest-jwt-payload). The
  token is minted BE-side and stored FE-side in Zustand memory only — never localStorage.
- One active order per table → [../../../02_spec/BUSINESS_RULES.md §2.3](../../../02_spec/BUSINESS_RULES.md#23-one-active-order-per-table).
  ⚠️ **This rule is NOT enforced in code** — neither at guest login nor at `POST /orders`.
  `CreateOrder` allows concurrent orders per table (`tableBusy` is informational, never blocks —
  `order_service.go:256-275`) and `ErrTableHasActiveOrder` is never returned anywhere in `be/`.
  Drift flagged to owner; see [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md) Bug 1.
- FE auth-store + cart-store bootstrap (guest session, table binding) →
  [../07_business_logic/LOGIC_FE.md](../07_business_logic/LOGIC_FE.md).

---

## Object Model

This page owns almost no object shape. It reads the `POST /auth/guest` response and immediately
distributes it into two stores. Full field-level detail lives in
[customer_table_qr_be.md](customer_table_qr_be.md) (response shape, handler line refs).

### §1 Guest-Login Response (consumed, not owned)

The FE destructures `res.data.data` at `page.tsx:20`:

```
{
  access_token: string        // JWT; stored in useAuthStore.accessToken (memory)
  expires_in:   number        // 7200 (ignored by FE — page.tsx:20 does not read it)
  table: {
    id:       string          // stored in useCartStore.tableId (cart.ts:91)
    name:     string          // stored in useCartStore.tableName (cart.ts:92)
    capacity: number          // ignored by FE
    status:   string          // ignored by FE
  }
}
```

BE response field detail and handler line refs → [customer_table_qr_be.md §Per-Endpoint Detail](customer_table_qr_be.md).
Object model roots → [../../../02_spec/object/OBJECT_MODELS.md](../../../02_spec/object/OBJECT_MODELS.md).

### §2 Guest User Shape (built client-side)

Assembled in `page.tsx:22-27`, not returned by BE:

```typescript
{
  id:        ''           // empty — guest has no DB user row (page.tsx:23)
  username:  'guest'      // (page.tsx:24)
  full_name: `Bàn ${table.name}`   // e.g. "Bàn A1" (page.tsx:25)
  role:      'customer'   // (page.tsx:26)
  is_active: true         // (page.tsx:27)
}
```

Written to `useAuthStore` via `setAuth(guestUser, access_token)` (`auth.store.ts:15`). The store
has **no `persist` middleware** (`auth.store.ts:12` — bare `create`, no `persist` wrapper) →
entirely memory-only, wiped on F5.

### §3 Table Binding Written to Cart Store

Two scalar fields written at `page.tsx:30-31`, sourced from `table` in the response:

| Cart field | Setter | Persisted? | Source |
|---|---|---|---|
| `tableId` | `setTableId(table.id)` | **No** — `partialize` at `cart.ts:153` persists only `orderNote` + `activeOrderId` | `page.tsx:30` |
| `tableName` | `setTableName(table.name)` | **No** — same reason | `page.tsx:31` |

On F5, both fields reset to `null` (`cart.ts:44-45`) — customer must re-scan.

---

### Flags / Known Mismatches

| # | Flag | Severity | Detail |
|---|---|---|---|
| 1 | **`TABLE_HAS_ACTIVE_ORDER` branch is DEAD (everywhere)** | 🟡 Low (misleading code) | `page.tsx:36-38` checks for `TABLE_HAS_ACTIVE_ORDER` and redirects to `/order/:active_order_id`, but `AuthService.GuestLogin` (`auth_service.go:281-303`) **never returns this error**. In fact `ErrTableHasActiveOrder` (`errors.go:30`) is **never returned anywhere in `be/`** — the other two FE consumers (`TableGrid.tsx:107`, `checkout/page.tsx:79`) are dead too, and a re-scan mints a fresh JWT → `/menu`, allowing a second concurrent order on the table. → [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md) Bug 1. |
| 2 | **`:tableId` param name is misleading** | 🔵 Info | The route segment is named `tableId` (route: `app/table/[tableId]/page.tsx`, param: `params.tableId`) but its value is the **64-char `qr_token`**, sent verbatim to `POST /auth/guest { qr_token }` (`page.tsx:18`). A human-typed URL like `/table/5` fails validation (`len=64` binding rule on BE) → generic error screen. The name implies a numeric table id, but it is the QR token. |
| 3 | **Memory-only session — F5 = re-scan** | 🔵 Info | Neither the guest JWT nor the table binding survives a page reload. `useAuthStore` has no `persist` wrapper (`auth.store.ts:12`). The cart `partialize` (`cart.ts:153`) persists only `orderNote` and `activeOrderId` — `tableId` and `tableName` are excluded. After F5 anywhere in the customer flow, the customer is unauthenticated and table-unbound; all customer routes that require a guest JWT will fail until the QR is re-scanned. |
| 4 | **`expires_in`, `table.capacity`, `table.status` ignored** | 🔵 Info | BE returns three extra fields (`auth_handler.go:198-204`); FE reads only `access_token`, `table.id`, `table.name` (`page.tsx:20`). The token's real 2 h expiry is not tracked client-side — there is no proactive refresh or expiry warning. |
| 5 | **No loading timeout / no retry** | 🔵 Info | A hung `POST /auth/guest` leaves the spinner indefinitely; there is no `AbortController` timeout or retry in `page.tsx`. Detail → [customer_table_qr_loading.md](customer_table_qr_loading.md). |
