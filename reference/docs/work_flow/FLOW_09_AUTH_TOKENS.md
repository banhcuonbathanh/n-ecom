# FLOW 09 — Auth Tokens & Transport Rules

> Applies to both customer (guest) and staff. These rules must never be broken.

---

## Token Storage

| Token | Who | Where Stored | Lifetime | Why |
|---|---|---|---|---|
| Guest JWT (access_token) | Customer | Zustand auth store — memory only | Session | Security — never localStorage |
| Staff access token | Staff | Zustand auth store — memory only | 24h | Security — never localStorage |
| Staff refresh token | Staff | httpOnly cookie (server-set) | 30d | JS cannot read it |

---

## Transport Rules by Connection Type

| Connection | Auth Method | Example |
|---|---|---|
| HTTP (REST) | `Authorization: Bearer <token>` header | GET /api/v1/orders |
| SSE | `Authorization: Bearer <token>` header | GET /api/v1/admin/events |
| WebSocket | `?token=<access_token>` query param | /ws/kds?token= |

**WebSocket cannot send custom headers** — query param is the only option.
**SSE can use headers** — always use Bearer, never query param.

---

## WebSocket Endpoints (query param)

| Endpoint | Who |
|---|---|
| `/ws/kds?token=` | Chef (KDS) |
| `/ws/orders-live?token=` | Cashier/Staff/Manager (POS, Overview, Payment) |

## SSE Endpoints (Bearer header)

| Endpoint | Who |
|---|---|
| `/api/v1/admin/events` | Staff+ (Admin Overview) |
| `/api/v1/orders/:id/stream` | Guest (Order Detail) |
| `/api/v1/orders/monitor/stream` | Guest (Tracking) |

---

## Token Refresh Flow (staff only)

```
Request fires → 401 response
    │
axios interceptor catches it (one retry only)
    │
POST /api/v1/auth/refresh   (sends httpOnly cookie automatically)
    │
    ├─ OK → new access_token → store in Zustand → retry original request
    │
    └─ FAIL → redirect /login
```

- Guest JWT does **not** refresh — no refresh token, session only
- Interceptor retries once — never retry twice on the same request
- Never force-redirect to `/login` on first 401 — always attempt refresh first

---

## Invariants — Never Break

1. Access tokens (guest + staff) are memory-only — never write to localStorage or a cookie
2. Staff refresh token is httpOnly — JS cannot and must not touch it
3. WS connections always use `?token=` query param — never Authorization header
4. SSE connections always use `Authorization: Bearer` — never query param
5. 401 interceptor retries once only — then redirects to login
6. Guest JWT has no refresh — on expiry, the session is over (rescan QR)

---

## Key Files

| File | Role |
|---|---|
| `fe/src/features/auth/auth.store.ts` | Token store (both staff and guest) |
| `fe/src/lib/api-client.ts` | Axios instance with Bearer interceptor + refresh retry |
| `fe/src/context/OrdersWSContext.tsx` | WS connection (uses ?token= param) |
| `docs/core/MASTER_v1.2.md §6` | Full JWT config spec |
| `docs/core/MASTER_v1.2.md §6.4` | Guest JWT rules |
| `docs/core/MASTER_v1.2.md §6.1–6.3` | Staff JWT + interceptor pattern |

---

## Related Flows

- [FLOW_01_ENTRY_POINTS.md](FLOW_01_ENTRY_POINTS.md) — where tokens are first created
- [FLOW_02_CLIENT_QR.md](FLOW_02_CLIENT_QR.md) — guest JWT usage
- [FLOW_03_STAFF_KDS.md](FLOW_03_STAFF_KDS.md) — WS uses ?token=
- [FLOW_05_ADMIN_OVERVIEW.md](FLOW_05_ADMIN_OVERVIEW.md) — SSE uses Bearer, WS uses ?token=
