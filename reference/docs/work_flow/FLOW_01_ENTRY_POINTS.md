# FLOW 01 — Entry Points

> Both customer and staff enter the system through separate paths with different auth mechanisms.

---

## Diagram

```
CUSTOMER                              STAFF
    |                                     |
QR Scan → /table/:qr_token          /login (username + password)
    |                                     |
POST /auth/guest { qr_token }       POST /auth/login { username, password }
    |                                     |
Guest JWT → Zustand memory only     Access token → Zustand memory only
tableId → cartStore                 Refresh token → httpOnly cookie (JS can't read)
    |                                     |
    ↓                              Role-based redirect:
/menu                               chef        → /kds
                                    cashier     → /pos
                                    staff       → /pos
                                    manager     → /admin/overview
                                    admin       → /admin/overview
```

---

## Customer Entry Rules

- URL: `/table/:qr_token`
- Calls `POST /api/v1/auth/guest` with `{ qr_token }`
- On success: receives `{ access_token, table: { id, name } }`
  - `access_token` → Zustand auth store (memory only, NEVER localStorage)
  - `table.id` → `cartStore.tableId`
  - `table.name` → `cartStore.tableName`
  - Redirect to `/menu`
- On `TABLE_HAS_ACTIVE_ORDER`: redirect to `/order/<active_order_id>`
- On other error: show inline error, no redirect

## Staff Entry Rules

- URL: `/login`
- Calls `POST /api/v1/auth/login` with `{ username, password }`
- On success:
  - `access_token` → Zustand auth store (memory only, NEVER localStorage)
  - `refresh_token` set as httpOnly cookie by server — JS cannot read it
- On 401: show inline error, stay on login page
- Token lifecycle: access 24h, refresh 30d

---

## Key Files

| File | Role |
|---|---|
| `fe/src/app/table/[tableId]/page.tsx` | Customer QR entry |
| `fe/src/app/(auth)/login/page.tsx` | Staff login |
| `fe/src/features/auth/auth.store.ts` | Auth token store (both) |
| `fe/src/store/cart.ts` | tableId + tableName set here on guest auth |

---

## Related Flows

- [FLOW_02_CLIENT_QR.md](FLOW_02_CLIENT_QR.md) — what happens after customer enters
- [FLOW_03_STAFF_KDS.md](FLOW_03_STAFF_KDS.md) — chef path after login
- [FLOW_04_STAFF_POS.md](FLOW_04_STAFF_POS.md) — cashier path after login
- [FLOW_05_ADMIN_OVERVIEW.md](FLOW_05_ADMIN_OVERVIEW.md) — manager path after login
- [FLOW_09_AUTH_TOKENS.md](FLOW_09_AUTH_TOKENS.md) — token storage and refresh rules
