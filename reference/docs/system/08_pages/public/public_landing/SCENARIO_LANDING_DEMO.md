# Scenario — The Landing Demo Run

> **TL;DR:** ✅ implemented · A prospective restaurant owner (or developer) lands on `/`, seeds the
> demo DB, logs in as every staff role to verify access, and then runs the "Giả lập khách"
> end-to-end to watch a real order appear on `/order/<id>` and propagate to `/admin/overview`.
> Grounded in `fe/src/app/page.tsx` · `fe/src/app/StaffQuickLogin.tsx` · `fe/src/app/TableGrid.tsx` ·
> `fe/src/components/shared/DevPanel.tsx` · `fe/src/app/api/dev/run/route.ts`.
> BE endpoint traces → [public_landing_be.md](public_landing_be.md) · page zones →
> [public_landing.md](public_landing.md) · cross-page session handoff →
> [public_landing_crosspage_dataflow.md](public_landing_crosspage_dataflow.md) · loading states →
> [public_landing_loading.md](public_landing_loading.md) · known bugs →
> [LANDING_BUGS.md](LANDING_BUGS.md).

---

## The Cast

| Who | What they are doing |
|---|---|
| **Minh** | A bánh cuốn shop owner evaluating the system — not technical, but curious. |
| **Van** | A developer demoing the system to Minh; knows the seed script and wants to show each role. |

## The Setting

A laptop, browser open at `http://localhost:3000/` (or the deployed domain). `docker compose up -d`
is already running. The DB may or may not have demo data in it — that is Beat 2's job.

---

## The Timeline

### Beat 0 · 10:00 — Minh opens `/`

Van navigates to `/`. The page renders **instantly** — no spinner, no fetch, no hydration delay.
Every section is static JSX rendered server-side: the Navbar (`page.tsx:78-99`), the Hero
(`page.tsx:108-158`), the Features grid (`page.tsx:177-203`), the "How it works" steps
(`page.tsx:205-229`), the Role cards (`page.tsx:231-286`), the CTA (`page.tsx:288-312`), and the
Footer (`page.tsx:314-330`). No `loading.tsx` exists for this route; the page is a plain React
Server Component that emits pure HTML.

The only non-static widgets — `DevPanel` (Client Component, `page.tsx:104`),
`StaffQuickLogin` (`page.tsx:161`), and `TableGrid` with its `SimulateBtn` instances
(`page.tsx:173`) — arrive in the initial HTML too, but they boot their own local `useState` after
hydration. Nothing is fetched to paint the page.

> Loading contract: `❓ UNVERIFIED` — there is no `loading.tsx` next to `app/page.tsx`. For
> completeness, see [public_landing_loading.md](public_landing_loading.md).

---

### Beat 1 · 10:01 — Van clicks "Seed DB" in the DevPanel

Minh notices the amber strip below the Navbar: the **DevPanel** (`components/shared/DevPanel.tsx`).

Van explains: "This seeds the database with demo accounts and tables so the quick-login buttons
work." He clicks **Seed DB**.

**What the FE does** (`DevPanel.tsx:25-41`):

1. `setStatuses({ seed: 'running' })` — button becomes "Running…" with a spinner.
2. `fetch('/api/dev/run', { method: 'POST', body: JSON.stringify({ cmd: 'seed' }) })`
   (`DevPanel.tsx:30-34`).
3. The response `{ ok: true, output: "…" }` (or `{ ok: false, output: stderr }`) flips the status
   to `'ok'` or `'error'` and stores the shell output for the collapsible `<pre>` (`DevPanel.tsx:36-40`).

**What the Next.js route does** (`fe/src/app/api/dev/run/route.ts`):

```
POST /api/dev/run
body: { "cmd": "seed" }
```

The route (`route.ts:13-33`) resolves `cmd` in the `COMMANDS` whitelist (`route.ts:7-11`), then:

```
exec("go run ./be/cmd/seed/main.go", { cwd: REPO_ROOT, timeout: 300_000 }, callback)
```

`REPO_ROOT = path.join(process.cwd(), "..")` (`route.ts:5`) — one directory above the Next.js
app, which is the monorepo root. On success it returns `{ ok: true, output: stdout }`.

The DevPanel icon flips to a green checkmark. Van expands the output log.

> ⚠️ **Bug** — this route runs shell commands with **no authentication and no `NODE_ENV !==
> 'production'` guard** (`route.ts:13-33`). Anyone who can reach `/api/dev/run` can trigger a DB
> seed or a Docker rebuild. Full detail → [LANDING_BUGS.md](LANDING_BUGS.md) Bug 2 (🔴 High).

---

### Beat 2 · 10:02 — Van demonstrates StaffQuickLogin

Van scrolls to the **Đăng Nhập Nhanh** section (the `StaffQuickLogin` component, `page.tsx:161`).
Five buttons are rendered from the `STAFF` array (`StaffQuickLogin.tsx:8-13`):

| Button label | `username` | `redirect` |
|---|---|---|
| Quản Trị Viên | `admin` | `/admin` |
| Quản Lý | `manager` | `/admin` |
| Thu Ngân | `cashier` | `/pos` |
| Đầu Bếp | `chef` | `/kds` |
| Nhân Viên | `staff` | `/admin` |

Van clicks **"Đầu Bếp"** to show the kitchen screen.

**What happens in `handleLogin`** (`StaffQuickLogin.tsx:30-41`):

1. `setLoading('chef')` — all five buttons become disabled; the chef button shows a spinner
   (`StaffQuickLogin.tsx:62-64`).
2. `await login('chef', 'Admin@123')` (`StaffQuickLogin.tsx:34`) → which resolves to:
   `api.post('/auth/login', { username: 'chef', password: 'Admin@123' })` (`auth.api.ts:9-10`),
   going through the shared `lib/api-client.ts` axios instance with interceptors.

```
POST /api/v1/auth/login
{ "username": "chef", "password": "Admin@123" }
```

   **BE path** (traced in [public_landing_be.md §1](public_landing_be.md)):
   - Rate-limit check: 5 req/min/IP (`auth_service.go:70-73`).
   - `GetStaffByUsername` — finds the seeded `chef` row.
   - `bcrypt.Verify` — matches `Admin@123`.
   - `is_active` check — passes.
   - `GenerateAccessToken(staff.ID, "chef")` — 15-min JWT.
   - Refresh token written + httpOnly cookie set (`auth_handler.go:43`).
   - Response: `{ data: { access_token, user: { id, username, full_name, role, … } } }`.

3. `setAuth(user, access_token)` — writes the chef user and token into `useAuthStore` (Zustand,
   memory-only — never localStorage per auth rules).
4. `router.push('/kds')` (`StaffQuickLogin.tsx:36`).

Minh sees the KDS screen. Van presses Back.

Van repeats for **"Thu Ngân"** → lands on `/pos`, then Back. Then **"Quản Trị Viên"** → `/admin`.
Each click is the same pattern: `POST /auth/login` with that username, same `Admin@123` password,
different `redirect` value from `STAFF[].redirect`.

> Note: `login()` is called with a **plain `string` password** (`'Admin@123'`), hardcoded in
> `StaffQuickLogin.tsx:34`. There is no prompt — this is a demo-only widget. The seeded password
> must match exactly or login returns `401 INVALID_CREDENTIALS`.

---

### Beat 3 · 10:05 — Van runs "Giả lập khách" on Bàn 02

Van comes back to `/`. In the **Demo Nhanh** section (TableGrid, `page.tsx:163-175`), he clicks
**"Giả lập khách"** under the **Bàn 02** card.

Each table card is a pair: a `Link` to `/table/<token>` (the real QR path) and a `SimulateBtn`
(`TableGrid.tsx:138-155`). The `SimulateBtn` runs a 4-step async chain entirely in JavaScript,
without any user interaction beyond the initial click.

#### Step 1 · Guest auth ("Đang quét QR…")

`SimulateBtn` extracts `qrToken` from the table's `href`:

```
qrToken = table.href.split('/table/')[1]
// = "b2c3d4e5f6789012b2c3d4e5f6789012b2c3d4e5f6789012b2c3d4e5f6789012"
```
(`TableGrid.tsx:30`)

Then fires — via a **raw `axios` instance**, not the shared `api-client` (`TableGrid.tsx:5,11`):

```
POST /api/v1/auth/guest
{ "qr_token": "b2c3d4e5f6789012…" }
```

**BE path** (traced in [public_landing_be.md §2](public_landing_be.md)):
- `GetTableByQRToken` — hand-written SQL (not sqlc-generated), finds the `Bàn 02` row by matching
  `qr_token`.
- Mints a **guest JWT**: `sub="guest"`, `role="customer"`, `table_id=<Bàn 02 uuid>`, TTL 2 h.
- Returns `{ data: { access_token, table: { id, name } } }`.

`SimulateBtn` reads both:

```js
const { access_token, table: tableInfo } = guestRes.data.data
const headers = { Authorization: `Bearer ${access_token}` }
```
(`TableGrid.tsx:38-39`)

Status message on screen: **"Đang quét QR…"** (set at `TableGrid.tsx:34`).

#### Step 2 · Catalog fetch ("Đang tải thực đơn…")

Two requests fire **in parallel** (`TableGrid.tsx:44-47`), both carrying the guest Bearer token:

```
GET /api/v1/products?is_available=true     (param is a no-op — see ⚠️ below)
GET /api/v1/combos
```

Both are **public routes** — the guest token is accepted but not required
([public_landing_be.md §3/#4](public_landing_be.md)).

**Caching** (traced in [public_landing_be.md §Caching](public_landing_be.md)):
- Redis keys `products:list` and `combos:list`, 5-min TTL, set by `product_service.go:21`.
- If cached: no MySQL query; response in microseconds.
- If cold: DB query → backfill Redis → respond.

`SimulateBtn` reads both responses as flat arrays:

```js
const products: { id: string; price: number; name: string }[] = prodRes.data.data ?? []
const combos:   { id: string; price: number; name: string }[] = comboRes.data.data ?? []
```
(`TableGrid.tsx:49-50`)

If both arrays are empty → `status='error'`, msg `"Không có món nào"`, return early
(`TableGrid.tsx:52-54`).

> ⚠️ `is_available=true` is sent as a query param but the handler reads **no query params** —
> it always returns the available-only list via `ListProductsAvailable`. The param is a no-op.
> → [public_landing_be.md Flag 2](public_landing_be.md).

#### Step 3 · Random selection ("Đang chọn món ngẫu nhiên…")

`SimulateBtn` picks from the catalog entirely client-side (`TableGrid.tsx:59-75`):

```js
const chosenProducts = pick(products, Math.floor(Math.random() * 3) + 2)  // 2–4 products
const chosenCombos   = combos.length > 0 && Math.random() > 0.4 ? pick(combos, 1) : []
```

`pick<T>(arr, n)` (`TableGrid.tsx:17-20`) shuffles the array and returns the first `n` items —
true random on every demo run.

The `items` array is built **inline** (`TableGrid.tsx:62-75`), not via `lib/order-payload.ts`:

```js
items = [
  ...chosenProducts.map(p => ({ product_id: p.id, combo_id: null, quantity: random(1–2), topping_ids: [] })),
  ...chosenCombos.map(c  => ({ product_id: null,  combo_id: c.id,  quantity: 1,           topping_ids: [] })),
]
```

No toppings, no fillings, no combo overrides — this is valid for a random demo but deviates from
the project-mandated `buildOrderItemsPayload` builder. → [LANDING_BUGS.md](LANDING_BUGS.md) Bug 3
(structural deviation, not a runtime bug).

#### Step 4 · Place order ("Đang đặt hàng…")

```
POST /api/v1/orders
Authorization: Bearer <guest JWT>
{
  "customer_name":  "Trần Thị B",           // random from NAMES[] (TableGrid.tsx:13)
  "customer_phone": "",                      // always empty (TableGrid.tsx:82)
  "note":           "Đơn demo — giả lập khách hàng",
  "table_id":       "<uuid of Bàn 02>",     // from step 1 tableInfo.id
  "source":         "qr",
  "items": [ … ]                             // built in step 3
}
```
(`TableGrid.tsx:80-87`)

**BE path** (traced in [public_landing_be.md §5](public_landing_be.md)):
- `authMW` passes: guest JWT is valid, `role="customer"`.
- Handler validates each item: exactly one of `product_id`/`combo_id` set
  (`order_handler.go:82-85`).
- `created_by = NULL` because `role == "customer"` (`order_handler.go:90-92`).
- `CreateOrder` service: snapshots product name + price server-side (client `price` field is
  ignored), expands any combo rows, computes `total_amount = SUM(unit_price × quantity)`,
  increments the Redis `order_number` counter.
- Returns `201 { data: { id, table_busy? } }`.

`table_busy` is informational — it is set when the table already has an active order, but
`CreateOrder` **never returns `TABLE_HAS_ACTIVE_ORDER`**. The `SimulateBtn` branch at
`TableGrid.tsx:107` that catches this error code is therefore a **dead branch** —
→ [LANDING_BUGS.md](LANDING_BUGS.md) Bug 1 (🟡 Low). If Bàn 02 was busy the BE still creates a
parallel order and returns `201`.

On success (`TableGrid.tsx:89-103`):

1. `setAuth(guestUser, access_token)` — writes a synthetic guest `User` object + the step-1 token
   into `useAuthStore` (Zustand, memory-only).
2. `setTableId(tableInfo.id)` + `setTableName(tableInfo.name)` — writes into `useCartStore`.
3. `setStatus('done')`, msg `"✓ Đặt N món — đang chuyển trang…"`.
4. After 800 ms: `router.push('/order/<id>')`.

The `/order/<id>` page fetches the full order via `GET /orders/:id` and opens an SSE stream
(`GET /orders/:id/events`) — both use the guest JWT now in `useAuthStore`.

> **Session memory only.** The guest `access_token` lives in Zustand (memory). F5 on `/order/<id>`
> loses the token; the `/order` page must re-authenticate via `GET /auth/me` or the order will be
> visible but not interactive. Full handoff contract →
> [public_landing_crosspage_dataflow.md](public_landing_crosspage_dataflow.md).

---

### Beat 4 · 10:06 — Minh watches the order on `/order/<id>`

The browser lands on `/order/<id>`. The page:
1. Fetches `GET /orders/:id` for the full order snapshot.
2. Opens `GET /orders/:id/events` (SSE) to watch real-time updates.

If Van (as admin, from Beat 2) is also on `/admin/overview` in another tab, the new order appears
there immediately via the shared WebSocket (`useOverviewWS → ws/kds`) — same order, two screens.
→ [../../admin/admin_overview/admin_overview.md](../../admin/admin_overview/admin_overview.md).

---

## Under the Hood

### A — Cross-Component Data Flow (one page, many widgets)

The three interactive zones on `/` — `DevPanel`, `StaffQuickLogin`, `TableGrid` — **share no
Zustand store with each other**. Each owns pure local `useState`. There is no cross-component
coordination needed on this page: DevPanel manages `{ statuses, outputs, expanded }` locally
(`DevPanel.tsx:17-23`); StaffQuickLogin manages `{ loading, error }` locally
(`StaffQuickLogin.tsx:27-28`); `SimulateBtn` manages `{ status, msg }` locally
(`TableGrid.tsx:27-28`).

After StaffQuickLogin writes to `useAuthStore` (`StaffQuickLogin.tsx:35`) or SimulateBtn writes to
`useAuthStore` + `useCartStore` (`TableGrid.tsx:97-99`), those stores are consumed **on the
destination page** (`/kds`, `/pos`, `/admin`, `/order/:id`) — not by any widget on `/`.

### B — Cross-Page Session Handoff

StaffQuickLogin and SimulateBtn each write a session into Zustand that outlives the `/` page:

| What is written | Where | Persists across F5? |
|---|---|---|
| Staff `access_token` (StaffQuickLogin) | `useAuthStore` (memory) | ❌ — restored by `GET /auth/me` on the destination page |
| Guest `access_token` (SimulateBtn) | `useAuthStore` (memory) | ❌ — F5 on `/order/:id` loses the session |
| `tableId`, `tableName` (SimulateBtn) | `useCartStore` (partially persisted) | ✅ `tableName` persists; `items[]` are session-only |

Full durability matrix and F5 behaviour →
[public_landing_crosspage_dataflow.md](public_landing_crosspage_dataflow.md).

### C — FE → BE Sends (this scenario)

| Beat | Call | Auth | Widget | File:line |
|---|---|---|---|---|
| Beat 1 | `POST /api/dev/run` (`{ cmd: "seed" }`) | **none** | DevPanel | `DevPanel.tsx:30-34` |
| Beat 2 | `POST /api/v1/auth/login` (`chef`, `Admin@123`) | public | StaffQuickLogin | `StaffQuickLogin.tsx:34` / `auth.api.ts:9` |
| Beat 3 step 1 | `POST /api/v1/auth/guest` (`{ qr_token }`) | public | SimulateBtn | `TableGrid.tsx:37` |
| Beat 3 step 2 | `GET /api/v1/products?is_available=true` | public (guest JWT sent but unused) | SimulateBtn | `TableGrid.tsx:45` |
| Beat 3 step 2 | `GET /api/v1/combos` | public (guest JWT sent but unused) | SimulateBtn | `TableGrid.tsx:46` |
| Beat 3 step 4 | `POST /api/v1/orders` (`source:'qr'`) | guest JWT required | SimulateBtn | `TableGrid.tsx:80-87` |

All Go BE calls go to `NEXT_PUBLIC_API_URL` (default `http://localhost:8080/api/v1`,
`TableGrid.tsx:11`). StaffQuickLogin uses the shared `lib/api-client.ts` axios instance;
SimulateBtn uses a **raw `axios`** import — bypassing interceptors
([public_landing_be.md Flag 3](public_landing_be.md)).

### D — BE → FE Receive / Live

This page has **no persistent SSE or WebSocket subscription**. The only "receive" is the
synchronous JSON response to each HTTP call:

- `POST /auth/login` → `{ access_token, user }` — consumed immediately, then the page navigates away.
- `POST /auth/guest` → `{ access_token, table }` — stored in local variables for the chain.
- `GET /products` / `GET /combos` → `{ data: Product[] }` / `{ data: Combo[] }` — consumed and discarded.
- `POST /orders` → `{ id, table_busy? }` — `id` drives the `router.push`; `table_busy` is
  logged but no UI uses it on this page.

Real-time data (SSE, WebSocket) begins only after `router.push('/order/<id>')` on the destination
page.

### E — Loading + Caching

| Layer | What is cached | TTL | Owner |
|---|---|---|---|
| Next.js SSR | Entire `/` page body (static) | ∞ (no `revalidate`) | Next.js server |
| Redis `products:list` | Available products list | 5 min | `product_service.go:21` |
| Redis `combos:list` | Available combos list | 5 min | `product_service.go:21` |
| Browser TanStack Query | **Not used on this page** | — | — |

The page body never re-fetches. The catalog calls in SimulateBtn hit Redis on the first "Giả lập
khách" within a 5-min window; subsequent clicks for other tables in the same window may also hit
the cache (same Redis key). There is no `staleTime` or `useQuery` on `/` itself — those patterns
apply on `/menu`, not here.

Loading state machines per widget → [public_landing_loading.md](public_landing_loading.md).

### F — Monitoring

The burst of calls generated by this demo run is visible in Grafana (`:3001`):

- `POST /auth/login` (up to 5 times if Van tries all roles) contributes to the **Request Rate**
  panel and flips the **login rate-limit counter** in Redis.
- `POST /auth/guest` + `GET /products` + `GET /combos` + `POST /orders` (4 calls per "Giả lập
  khách" click) show as a tight cluster on the timeline.
- The resulting order appears on the Admin Overview live floor the instant the `POST /orders` 201
  lands — it is pushed to the WS channel (`ws/kds`) by the BE, updating `['orders','live']` in
  TanStack Query via `queryClient.setQueryData` in `useOverviewWS` on the admin page.
  → [../../admin/admin_overview/admin_overview.md](../../admin/admin_overview/admin_overview.md).
- If the `go run ./be/cmd/seed/main.go` in Beat 1 takes > 30 s or exits non-zero, the 500 in the
  Next.js route log will be visible in `docker compose logs -f fe`, not in the Go BE logs.

Monitoring stack home → `docs/system/09_devops/MONITORING.md`.

---

## Flags Surfaced by This Scenario

| # | Flag | Where it bites |
|---|---|---|
| 1 | **`SimulateBtn.TABLE_HAS_ACTIVE_ORDER` branch is dead** | `TableGrid.tsx:107-113` — the BE never emits this error; a busy table gets a parallel second order. → [LANDING_BUGS.md Bug 1](LANDING_BUGS.md) 🟡 Low |
| 2 | **`/api/dev/run` has no auth and no prod guard** | `route.ts:13-33` — anyone who can reach the Next.js app can seed the DB or trigger a Docker build. → [LANDING_BUGS.md Bug 2](LANDING_BUGS.md) 🔴 High |
| 3 | **SimulateBtn bypasses `buildOrderItemsPayload`** | `TableGrid.tsx:62-75` — inline `items[]` build deviates from the project rule; any shape change must remember this caller. → [LANDING_BUGS.md Bug 3](LANDING_BUGS.md) 🔵 Structural |
| 4 | **SimulateBtn uses raw `axios`, not `api-client`** | `TableGrid.tsx:5` — bypasses interceptors; misses future request/response middleware. |
| 5 | **`/table/1` shortcut may 404** | Hero CTA + Footer both link to `/table/1` (`page.tsx:135,305`); token `1` is not in the `tables[]` array. `❓ UNVERIFIED` at BE. |
| 6 | **Guest session memory-only; F5 = lost** | After Beat 3, any page refresh on `/order/:id` loses the guest token. The order is still readable (public or via re-auth), but interactive actions fail. → [public_landing_crosspage_dataflow.md](public_landing_crosspage_dataflow.md) |

---

## The One-Line Mental Model

> `/` is a **zero-fetch marketing shell** that hands off to the real system via three shortcuts:
> DevPanel seeds the world, StaffQuickLogin proves role access, and "Giả lập khách" chains
> guest-auth → catalog → order → redirect in one click — so a prospect can see a live order on
> the KDS before the coffee gets cold.
