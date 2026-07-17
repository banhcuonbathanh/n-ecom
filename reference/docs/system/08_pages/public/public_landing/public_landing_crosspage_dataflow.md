# Public Landing (`/`) — Cross-Page Data Flow

> **Status:** ✅ Implemented  
> **What this is:** the landing page performs **writes that outlive it** — once it hands off to a
> downstream page the store state and (in the SimulateBtn path) a durable server order row drive
> every page that follows. This file answers *"where does that data go, and how long does it survive?"*  
> **Sources traced:** branch `experience_claude.md_system_1`  
> [`fe/src/app/StaffQuickLogin.tsx`](../../../../../fe/src/app/StaffQuickLogin.tsx) ·
> [`fe/src/app/TableGrid.tsx`](../../../../../fe/src/app/TableGrid.tsx) ·
> [`fe/src/features/auth/auth.store.ts`](../../../../../fe/src/features/auth/auth.store.ts) ·
> [`fe/src/store/cart.ts`](../../../../../fe/src/store/cart.ts) ·
> [`fe/src/lib/storage-keys.ts`](../../../../../fe/src/lib/storage-keys.ts) ·
> [`fe/src/types/auth.ts`](../../../../../fe/src/types/auth.ts)  
> **Siblings:** [public_landing.md](public_landing.md) · [public_landing_be.md](public_landing_be.md) ·
> [public_landing_loading.md](public_landing_loading.md) · [SCENARIO_LANDING_DEMO.md](SCENARIO_LANDING_DEMO.md)

---

## 0. The whole picture on one diagram

Two independent handoff paths originate on `/`:

```
   ┌───────────────── PATH A — StaffQuickLogin ───────────────────────────────┐
   │                                                                           │
   │  /  (landing)                                                             │
   │   │  handleLogin(role)                                                    │
   │   │  POST /auth/login  ──▶ { user, access_token }                         │
   │   │  setAuth(user, access_token)  ──▶  ░ auth store (memory)             │
   │   │  router.push(<redirect>)                                              │
   │   ▼                                                                       │
   │   admin/manager/staff  ──▶  /admin       (reads ░ auth store)            │
   │   cashier              ──▶  /pos         (reads ░ auth store)            │
   │   chef                 ──▶  /kds         (reads ░ auth store)            │
   │                                                                           │
   │   ⚠ F5 anywhere downstream = auth store wiped = 401 bounce               │
   └───────────────────────────────────────────────────────────────────────────┘

   ┌───────────────── PATH B — SimulateBtn ("Giả lập khách") ────────────────┐
   │                                                                           │
   │  /  (landing)                                                             │
   │   │  POST /auth/guest  ──▶ { access_token, table: { id, name } }         │
   │   │  GET  /products (is_available=true)                                  │
   │   │  GET  /combos                                                         │
   │   │  POST /orders  ──────────────────────────────────▶ ▓ server order row│
   │   │    ←── 201 { id, …, status:"pending" }             (durable MySQL)   │
   │   │                                                                       │
   │   │  setAuth(guestUser, access_token)  ──▶  ░ auth store (memory)        │
   │   │  setTableId(tableInfo.id)          ──▶  ░ cart store (memory only)   │
   │   │  setTableName(tableInfo.name)      ──▶  ░ cart store (memory only)   │
   │   │  setTimeout 800ms                                                     │
   │   │  router.push('/order/<id>')                                           │
   │   ▼                                                                       │
   │   /order/<id>  reads ▓ order row via GET /orders/:id + SSE               │
   │   /admin/overview  reads ▓ order row via new_order SSE ping + WS         │
   │                                                                           │
   │   ⚠ F5 on /order/<id> = auth store wiped — page recovers via URL id      │
   │     but any API call needing auth (cancel, add-items) fails → bounce     │
   │     F5 on /admin = session lost → bounce to login                        │
   └───────────────────────────────────────────────────────────────────────────┘
```

```
   LEGEND  ░ memory — dies on F5 (Zustand store, no persist)
           ▓ durable — survives F5 (localStorage · MySQL)
           ──▶ navigation / HTTP write        ◀── SSE/WS push (server → browser)
```

---

## 1. The auth store — memory-only, no `persist`

`auth.store.ts` ([lines 1–18](../../../../../fe/src/features/auth/auth.store.ts)) creates the store
with a plain `create<AuthState>()` — **no `persist` middleware, no localStorage write**:

```typescript
// auth.store.ts:12-18
export const useAuthStore = create<AuthState>((set) => ({
  user:        null,
  accessToken: null,
  setAuth:        (user, accessToken) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth:      () => set({ user: null, accessToken: null }),
}))
```

`setAuth(user, access_token)` writes the `User` object + JWT into the **in-memory** Zustand store.
A hard refresh (`F5`) destroys both. No token is written to localStorage or a cookie by the FE —
the `/auth/refresh` endpoint exists (`auth.api.ts:18`) and the BE may set a
`HttpOnly` refresh-token cookie, but the FE landing-page handoff relies on the in-memory
`accessToken` surviving navigation, not a rehydration loop.

> The "access token: Zustand memory ONLY" rule is documented in
> `docs/core/MASTER_v1.2.md §6` (project-wide rule, not landing-page specific).

---

## 2. Path A — StaffQuickLogin handoff

### 2.1 What `handleLogin` writes

`StaffQuickLogin.tsx` ([lines 30–41](../../../../../fe/src/app/StaffQuickLogin.tsx)):

```
  handleLogin(s)
    └─ POST /auth/login   (username=<role>, password='Admin@123')
         └─ { user, access_token }
              └─ setAuth(user, access_token)   ──▶ ░ auth store
                   └─ router.push(s.redirect)
```

Role → redirect mapping (lines 9–13):

| Label | role | username | redirect |
|---|---|---|---|
| Quản Trị Viên | `admin` | `admin` | `/admin` |
| Quản Lý | `manager` | `manager` | `/admin` |
| Thu Ngân | `cashier` | `cashier` | `/pos` |
| Đầu Bếp | `chef` | `chef` | `/kds` |
| Nhân Viên | `staff` | `staff` | `/admin` |

### 2.2 What the downstream pages receive

The downstream staff pages (`/admin`, `/pos`, `/kds`) receive **only** the Zustand auth store.
There is no durable server write beyond the BE session row (created by `/auth/login`) and the
browser's refresh-token cookie (set by BE, if applicable). The FE side of the handoff is
**entirely client-side, memory-only**.

```
   STORE STATE THE INSTANT BEFORE router.push(<redirect>)
   ┌───────────────────────────────────────────────────────┐
   │  ░ auth store (memory):                                │
   │      user: { id, username, full_name, role, is_active }│
   │      accessToken: "<JWT>"                              │
   │                                                        │
   │  ░ cart store (memory): unchanged (no writes)          │
   │  ▓ cart store (persisted): unchanged                   │
   │  ▓ localStorage: no auth keys written                  │
   └───────────────────────────────────────────────────────┘
```

### 2.3 F5 behavior on downstream staff pages

Because the auth store is memory-only, a hard refresh on any staff page wipes `user` and
`accessToken`. The downstream page's `AuthGuard` / `RoleGuard` finds `accessToken === null` and
redirects to `/login` (or `/`). The user must click the role button again.

| Page | F5 result |
|---|---|
| `/admin` | auth store = null → bounced to login |
| `/pos` | auth store = null → bounced to login |
| `/kds` | auth store = null → bounced to login |

❓ UNVERIFIED — the exact guard component and redirect target (login vs `/`) for each staff page
was not traced in this session. The bounce behaviour is consistent with the `AuthGuard` pattern
documented in `fe/src/components/guards/AuthGuard.tsx` but the line was not read.

---

## 3. Path B — SimulateBtn ("Giả lập khách") handoff

### 3.1 The five-step sequence

`TableGrid.tsx`, `SimulateBtn.simulate()` ([lines 32–103](../../../../../fe/src/app/TableGrid.tsx)):

```
  Step 1 — guest auth
    POST /auth/guest  { qr_token }
    ← { access_token, table: { id, name } }

  Step 2 — fetch menu (parallel)
    GET /products?is_available=true
    GET /combos
    (both with Authorization: Bearer <access_token>)

  Step 3 — random item selection (in-memory only, no store write)
    pick 2–4 products + 0–1 combo

  Step 4 — place order
    POST /orders  { customer_name, customer_phone:'', note:'Đơn demo…',
                    table_id, source:'qr', items:[ … ] }
    ← { id, …, status:'pending' }   ──▶  ▓ durable order row born on server

  Step 5 — set client state + navigate
    setAuth(guestUser, access_token)   ──▶ ░ auth store
    setTableId(tableInfo.id)           ──▶ ░ cart store (memory only)
    setTableName(tableInfo.name)       ──▶ ░ cart store (memory only)
    setTimeout 800ms
    router.push('/order/<id>')
```

### 3.2 The synthetic guest `User` object

Lines 92–96 of `TableGrid.tsx` construct a synthetic `User` that matches the `User` type
([`types/auth.ts:11-17`](../../../../../fe/src/types/auth.ts)):

```typescript
const guestUser: User = {
  id: '',                        // empty — guest has no user row in users table
  username: 'guest',
  full_name: `Bàn ${tableInfo.name}`,
  role: 'customer',
  is_active: true,
}
```

This object is written into the auth store and read by downstream pages that need `user.full_name`
or `user.role`. An empty `id` means any "lookup by user id" would fail — this is intentional for
the demo path.

### 3.3 What the cart store persists vs not

`cart.ts` ([lines 153](../../../../../fe/src/store/cart.ts)):

```typescript
partialize: (s) => ({ orderNote: s.orderNote, activeOrderId: s.activeOrderId }),
```

Storage key: `STORAGE_KEYS.CART_CONFIG = 'cart-config-v3'`
([`storage-keys.ts:6`](../../../../../fe/src/lib/storage-keys.ts)), store version `5`.

| Field | `partialize` included? | Survives F5? |
|---|---|---|
| `orderNote` | ✅ | ✅ |
| `activeOrderId` | ✅ | ✅ |
| `items` | ❌ | ❌ |
| `tableId` | ❌ | ❌ |
| `tableName` | ❌ | ❌ |
| `paymentMethod` | ❌ | ❌ |

`setTableId` and `setTableName` (lines 91–92) write into the in-memory portion of the cart store.
They are **not** in `partialize` — a hard refresh on any downstream page clears them. The
`/order/<id>` page does not need `tableId` because the order row already carries `table_name`.

### 3.4 The server order row — the durable hub

`POST /orders` at step 4 creates the **one durable fact** this handoff produces. The order row
(MySQL, id = UUID) is the single hub that connects:

- the guest's `/order/<id>` (reads via `GET /orders/:id` + SSE)
- the admin overview (`/admin/overview`) (learns via `new_order` SSE ping, then `GET /orders/:id`)
- the KDS (learns via Redis pub/sub → orders WS)

For full endpoint traces see the sibling BE doc:
[public_landing_be.md](public_landing_be.md).  
For how `/order/<id>` and `/admin/overview` consume this row, see:
- [../../customer/customer_order_detail/customer_order_detail_be.md](../../customer/customer_order_detail/customer_order_detail_be.md)
- [../../admin/admin_overview/admin_overview_be.md](../../admin/admin_overview/admin_overview_be.md)

### 3.5 TABLE_HAS_ACTIVE_ORDER — the alternative handoff

If the table already has a live order when SimulateBtn fires (`POST /orders` → `TABLE_HAS_ACTIVE_ORDER`),
the component skips the order-create and navigates directly to the active order
([`TableGrid.tsx:107–112`](../../../../../fe/src/app/TableGrid.tsx)):

```
  catch TABLE_HAS_ACTIVE_ORDER
    └─ active_order_id = resp.data.details.active_order_id
         └─ router.push(activeId ? '/order/<activeId>' : '/menu')
```

In this branch: **no `setAuth`, no `setTableId`, no `setTableName`** are called before the push.
The guest reaches `/order/<activeId>` without a valid auth store — any SSE subscription or
API call that requires the Bearer token will immediately fail with `401`.

❓ UNVERIFIED — whether `/order/<id>` degrades gracefully (shows cached order data without
re-authing) or is blocked entirely in this fallback path. The `useOrderSSE` hook behaviour on a
null `accessToken` was not traced in this session.

---

## 4. Contrast — Path A vs Path B

| Dimension | Path A (StaffQuickLogin) | Path B (SimulateBtn) |
|---|---|---|
| **Server write** | `POST /auth/login` session row (BE) | `POST /orders` order row (BE) |
| **Durable cross-page hub** | none (FE only — auth store) | the `orders` row (MySQL) |
| **Auth store written?** | ✅ real `User` + JWT | ✅ synthetic guest `User` + guest JWT |
| **Cart store written?** | ❌ no writes | ✅ `tableId` + `tableName` (memory only) |
| **localStorage written?** | ❌ no FE writes | ❌ no FE writes (order row lives on BE) |
| **F5 on destination** | bounce to login — no recovery | `/order/<id>` recovers via URL id; API auth fails |
| **Downstream pages** | `/admin`, `/pos`, `/kds` | `/order/<id>`, `/admin/overview` (via BE) |
| **Handoff type** | pure client-side session inject | client session inject + durable server order |

---

## 5. State snapshot at the moment of each `router.push`

### Path A snapshot (immediately before `router.push(s.redirect)`)

```
   ░ auth store:  { user: <real User>, accessToken: "<JWT>" }
   ░ cart store:  { items:[], tableId:null, tableName:null, … }   ← unchanged
   ▓ cart store (localStorage 'cart-config-v3'):  { orderNote, activeOrderId }  ← unchanged
   ▓ localStorage:  no new keys written
```

### Path B snapshot (immediately before `router.push('/order/<id>')`)

```
   ░ auth store:  { user: guestUser, accessToken: "<guest JWT>" }
   ░ cart store:  { items:[], tableId:"<uuid>", tableName:"<name>", … }
   ▓ cart store (localStorage 'cart-config-v3'):  { orderNote, activeOrderId }  ← unchanged
   ▓ localStorage:  no new keys written by FE
   ▓ BE (MySQL):   orders row { id:"<uuid>", status:"pending", table_id, items:[…] }
```

---

## 6. Reload (F5) behavior — landing page and downstream

| Page | Has URL id? | Auth store on cold load | Result |
|---|---|---|---|
| `/` (landing) | n/a | null (no auth required) | renders fully — no auth needed |
| `/admin` (after Path A) | no | ░ wiped → null | bounce to login |
| `/pos` (after Path A) | no | ░ wiped → null | bounce to login |
| `/kds` (after Path A) | no | ░ wiped → null | bounce to login |
| `/order/<id>` (after Path B) | **YES** | ░ wiped → null | page can paint from `GET /orders/:id` (public? ❓) but auth-gated actions fail |

> **The one asymmetry:** `/order/<id>` carries the order id in its URL, so it can re-fetch the
> order row from the BE on reload without the store. Whether `GET /orders/:id` is guest-authenticated
> or public on an F5 (where the guest JWT is gone) depends on the API auth model — see
> [public_landing_be.md](public_landing_be.md) §Auth Model and the customer order-detail BE doc.

---

## 7. Durability matrix — what survives what

| Datum | Lives in | Survives F5? | Survives new device? | Written by landing? |
|---|---|---|---|---|
| `user` + `accessToken` (staff) | ░ auth store (memory) | ❌ | ❌ | Path A — `setAuth()` |
| `user` + `accessToken` (guest) | ░ auth store (memory) | ❌ | ❌ | Path B — `setAuth()` |
| `tableId` / `tableName` | ░ cart store (memory, not in `partialize`) | ❌ | ❌ | Path B — `setTableId/Name()` |
| `orderNote` | ▓ cart store, key `cart-config-v3` | ✅ | ❌ (per-browser) | not written by landing |
| `activeOrderId` | ▓ cart store, key `cart-config-v3` | ✅ | ❌ (per-browser) | not written by landing |
| **the order row** | **▓ BE (MySQL)** | ✅ | ✅ | **Path B — `POST /orders`** |

> **Key insight:** the landing page writes **only memory** on the FE side. Its one durable artifact
> is the BE order row produced by Path B. The staff auth handoff has no durable FE state at all —
> a reload on any staff page requires re-authenticating.

---

## 8. Source & rule map

| Topic | Source |
|---|---|
| StaffQuickLogin login + redirect logic | [`fe/src/app/StaffQuickLogin.tsx:8–41`](../../../../../fe/src/app/StaffQuickLogin.tsx) |
| SimulateBtn full simulation flow | [`fe/src/app/TableGrid.tsx:32–117`](../../../../../fe/src/app/TableGrid.tsx) |
| Auth store shape (no persist) | [`fe/src/features/auth/auth.store.ts:1–18`](../../../../../fe/src/features/auth/auth.store.ts) |
| Cart store + `partialize` | [`fe/src/store/cart.ts:40–156`](../../../../../fe/src/store/cart.ts) |
| Storage key `cart-config-v3` | [`fe/src/lib/storage-keys.ts:6`](../../../../../fe/src/lib/storage-keys.ts) |
| `User` type shape | [`fe/src/types/auth.ts:11–17`](../../../../../fe/src/types/auth.ts) |
| BE endpoints (5 endpoints landing calls) | [public_landing_be.md](public_landing_be.md) |
| Customer order-detail BE | [../../customer/customer_order_detail/customer_order_detail_be.md](../../customer/customer_order_detail/customer_order_detail_be.md) |
| Admin overview BE | [../../admin/admin_overview/admin_overview_be.md](../../admin/admin_overview/admin_overview_be.md) |
| Order object model | [../../02_spec/object/OBJECT_MODEL_ORDER.md](../../02_spec/object/OBJECT_MODEL_ORDER.md) |
| RBAC role hierarchy + role-redirect rules | [../../../02_spec/BUSINESS_RULES.md](../../../02_spec/BUSINESS_RULES.md) |
| Access token memory-only rule | `docs/core/MASTER_v1.2.md §6` |
| Cross-page flow of the order after landing handoff | [../../customer/customer_menu/customer_menu_crosspage_dataflow.md](../../customer/customer_menu/customer_menu_crosspage_dataflow.md) §3–§7 |
