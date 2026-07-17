# Public Landing — Loading States · `/`

> **TL;DR:** ✅ implemented · the landing page (`/`) is a **fully static server component** — there
> is no route-level `loading.tsx`, no `<Suspense>` boundary, and no `useQuery`. The entire page body
> renders on the server and is sent as HTML; it arrives instantly with zero data fetching.
> All loading states are **interaction-triggered**: three client widgets each own a local
> `useState` machine that activates only when a user clicks a button.
>
> Page overview → [public_landing.md](public_landing.md) ·
> BE view → [public_landing_be.md](public_landing_be.md) ·
> Cross-page flow → [public_landing_crosspage_dataflow.md](public_landing_crosspage_dataflow.md) ·
> Scenario → [SCENARIO_LANDING_DEMO.md](SCENARIO_LANDING_DEMO.md)
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/page.tsx` · `fe/src/app/StaffQuickLogin.tsx` ·
> `fe/src/app/TableGrid.tsx` · `fe/src/components/shared/DevPanel.tsx`

---

## Loading Layers (outer → inner)

```
1. Route navigation  → NO loading.tsx at app/ root — no route spinner for /
2. Page mounts       → NO <Suspense> — page.tsx is a plain server component
3. Page content      → NO useQuery / async data — all JSX is static
4. Button onClick    → THREE client widgets activate their own local state machine
```

### 1 — Route-level spinner: ABSENT

There is **no** `loading.tsx` at `fe/src/app/` (the root segment). The only `loading.tsx` files in
the project are:

- `fe/src/app/(shop)/loading.tsx` — applies to `/menu`, `/checkout`, `/order/*`
- `fe/src/app/(dashboard)/admin/loading.tsx` — applies to `/admin/**`

Neither covers `/`. When a user navigates **to** `/`, Next.js App Router renders the page
immediately from the server with no spinner of any kind.

### 2 — Suspense boundary: ABSENT

`fe/src/app/page.tsx` (exported as `MarketingPage`, line 74) is a **server component** with no
`'use client'` directive. It contains no `<Suspense>`, no `useSearchParams`, and no dynamic data
import. All child client components (`StaffQuickLogin`, `TableGrid`, `DevPanel`) are imported as
standard React subtrees — they hydrate after the HTML arrives but do not suspend the server render.

### 3 — Per-query states: NONE

`page.tsx` makes zero `useQuery` / `fetch` / `axios` calls. The `features`, `tables`, `steps`,
`stats`, and role arrays (lines 13–71) are all compile-time constants. The page has **no**
`isLoading`, `isError`, or skeleton branch.

### 4 — Client-widget state machines (interaction-triggered)

The three interactive widgets embedded in the page each run their own `useState`-based loading
machine. They are documented in detail in the sections below.

---

## Widget 1 — StaffQuickLogin · `fe/src/app/StaffQuickLogin.tsx`

**State shape** (lines 27–28):

```ts
const [loading, setLoading] = useState<string | null>(null)  // username in flight, or null
const [error,   setError]   = useState<string | null>(null)  // error message, or null
```

### State machine

| State | `loading` | `error` | Button appearance | Buttons interactive? |
|---|---|---|---|---|
| **idle** | `null` | `null` | dot + label | ✅ all enabled |
| **in-flight** | `s.username` (e.g. `"admin"`) | `null` | active btn: `<Loader2 animate-spin>` + label; all others: dot + label; all `opacity-50` | ❌ `disabled={loading !== null}` (line 59) — ALL 5 buttons disabled |
| **error** | `null` | `"Đăng nhập thất bại cho <label>"` | dot + label (re-enabled); red `<p>` below grid | ✅ re-enabled |
| **navigating** | `s.username` | `null` | spinner still showing | ❌ still disabled (no reset before push) |

### Beat-by-beat trace

1. **Click** `handleLogin(s)` called (line 30).
2. `setLoading(s.username)` — e.g. `"admin"` (line 31). ALL buttons become `disabled`.
3. `setError(null)` clears any previous error (line 32).
4. `await login(s.username, 'Admin@123')` — calls `POST /auth/login` via
   `fe/src/features/auth/auth.api.ts` (import, line 4).
5. **Success path** (lines 35–36): `setAuth(user, access_token)` writes to Zustand auth store →
   `router.push(s.redirect)`. `loading` is **never reset to `null`** — the button stays in spinner
   state until navigation completes and this component unmounts.
6. **Error path** (lines 38–39): `setError(...)` sets the red message →
   `setLoading(null)` re-enables all buttons. Error text renders at line 72–74 (`text-urgent`).

### Visual detail

- Active button icon: `<Loader2 className="h-4 w-4 animate-spin" />` (line 63).
- Inactive button icon: `<span className="h-2 w-2 rounded-full bg-current opacity-70" />` (line 64).
- Disabled visual: `disabled:opacity-50` on every button (line 60).
- Error text: `<p className="mt-4 text-center text-sm text-urgent">{error}</p>` (line 73).

---

## Widget 2 — SimulateBtn · `fe/src/app/TableGrid.tsx`

One `SimulateBtn` instance per table card (line 150). Each instance is **fully independent** — its
state machine does not share any state with other instances.

**State shape** (lines 27–28):

```ts
const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
const [msg,    setMsg]    = useState('')
```

### Status machine

| `status` | `msg` | Button disabled? | Button style |
|---|---|---|---|
| `idle` | `''` | ❌ | neutral border/muted |
| `loading` | narrative string (see below) | ✅ `disabled` (line 123) | spinner + msg; neutral style |
| `done` | success or redirect string | ✅ `disabled` (line 123) | success style (`border-success/40 bg-success/10 text-success`) |
| `error` | error string | ❌ (auto-resets to `idle` after 3 s) | error style (`border-urgent/40 bg-urgent/10 text-urgent`) |

Disabled condition: `disabled={status === 'loading' || status === 'done'}` (line 123).

### Beat-by-beat trace — happy path

| Beat | Code line | `status` | `msg` |
|---|---|---|---|
| Click `simulate()` | 33 | `loading` | `'Đang quét QR...'` |
| `POST /auth/guest` resolves | 37–39 | `loading` | `'Đang tải thực đơn...'` (line 41) |
| `GET /products` + `GET /combos` resolve (parallel) | 44–47 | `loading` | `'Đang chọn món ngẫu nhiên...'` (line 56) |
| Items selected | 59–75 | `loading` | `'Đang đặt hàng...'` (line 77) |
| `POST /orders` resolves | 80–88 | `loading` | _(still `'Đang đặt hàng...'` until line 101)_ |
| Auth/cart state written | 92–99 | `done` | `'✓ Đặt N món — đang chuyển trang...'` (line 102) |
| 800 ms `setTimeout` | 103 | `done` | _(unchanged)_ → `router.push('/order/<id>')` |

### Beat-by-beat trace — TABLE_HAS_ACTIVE_ORDER branch (lines 107–113)

When the table already has an open order the BE returns `error: 'TABLE_HAS_ACTIVE_ORDER'` with
`details.active_order_id`. The catch branch:

1. Sets `status = 'done'`, `msg = 'Bàn đang có đơn — đang chuyển trang...'` (lines 109–110).
2. After 800 ms: `router.push('/order/<activeId>')` or `/menu` if no ID (line 111).
3. Returns early — the generic error block does not run.

### Beat-by-beat trace — generic error path (lines 114–116)

1. `setStatus('error')` — button changes to error style.
2. `setMsg(resp?.data?.message ?? 'Giả lập thất bại')`.
3. `setTimeout(() => { setStatus('idle'); setMsg('') }, 3000)` — auto-resets after 3 s.

### Visual detail (button JSX, lines 120–135)

- Loading icon: `<Loader2 size={11} className="animate-spin shrink-0" />` (line 131).
- Idle icon: `<Shuffle size={11} className="shrink-0" />` (line 132).
- Label: `{status === 'idle' ? 'Giả lập khách' : msg || 'Giả lập khách'}` (line 133) — the label
  narrates every step.

### BE calls in this widget

Detail traced in sibling [`public_landing_be.md`](public_landing_be.md). Summary:

| Step | Endpoint | Notes |
|---|---|---|
| 1 | `POST /auth/guest` | `{ qr_token }` — returns `access_token` + `table` |
| 2a | `GET /products?is_available=true` | catalog; cached 5 min server-side (`products:list`) |
| 2b | `GET /combos` | catalog; cached 5 min server-side (`combos:list`) |
| 3 | `POST /orders` | places the order with guest JWT |

---

## Widget 3 — DevPanel · `fe/src/components/shared/DevPanel.tsx`

**State shape** (lines 17–23):

```ts
const [statuses,  setStatuses]  = useState<Record<CmdKey, Status>>({ seed: 'idle', 'build-be': 'idle', 'build-fe': 'idle' })
const [outputs,   setOutputs]   = useState<Record<CmdKey, string>>({ seed: '', 'build-be': '', 'build-fe': '' })
const [expanded,  setExpanded]  = useState<CmdKey | null>(null)
```

`type Status = 'idle' | 'running' | 'ok' | 'error'` (line 8).

### Per-command status machine

| `Status` | Button label | Button disabled? | Icon (right of button) |
|---|---|---|---|
| `idle` | command label (e.g. `"Seed DB"`) | ❌ | none |
| `running` | `<Loader2 animate-spin /> Running` (line 69) | ✅ `disabled={statuses[key] === 'running'}` (line 65) | none (spinner is inside button) |
| `ok` | command label | ❌ | `<CheckCircle2 text-success>` (line 46) |
| `error` | command label | ❌; button variant switches to `"destructive"` (line 63) | `<XCircle text-destructive>` (line 47) |

### Beat-by-beat trace — `run(key)` (lines 25–41)

1. `setStatuses(s => ({ ...s, [key]: 'running' }))` — that button only becomes disabled/spinner.
2. `setOutputs(o => ({ ...o, [key]: '' }))` — clears previous output.
3. `setExpanded(key)` — opens the output panel for this command.
4. `fetch('/api/dev/run', { method: 'POST', body: JSON.stringify({ cmd: key }) })` (line 30).
5. **Success** (`data.ok === true`): `status → 'ok'`, `output → data.output` (lines 36–37).
6. **Success** (`data.ok === false`): `status → 'error'`, `output → data.output` (lines 36–37).
7. **Fetch throws**: `status → 'error'`, `output → String(e)` (lines 39–40).

### Output collapsible (lines 74–89)

- The chevron toggle button appears **only when `outputs[key]` is non-empty** (line 74).
- `expanded` tracks at most one open output panel at a time (a new `run()` call auto-expands its
  own key at step 3 above).
- Output panel: `<pre className="max-h-40 overflow-auto ...">` (line 86) — scrollable, max 160 px.

### Commands mapped

| `CmdKey` | Shell command shown | Route called |
|---|---|---|
| `"seed"` | `go run ./be/cmd/seed/main.go` | `POST /api/dev/run` |
| `"build-be"` | `docker compose up -d --build be` | `POST /api/dev/run` |
| `"build-fe"` | `docker compose up -d --build fe` | `POST /api/dev/run` |

The three commands are **independent** — their statuses do not share a single gate. Running
`build-be` does not disable `build-fe`.

---

## Interaction Gating

The static body of the page (Navbar, Hero, Features section, How-it-works, Roles, CTA, Footer)
renders instantly from the server with **zero fetch gating**. No content is withheld pending a
network call. There is no search bar, no debounce gate, and no `enabled:` condition anywhere on this
page (contrast: `/menu` gates the products query on `searchQuery.length`).

The only withheld work is:

| Widget | What is gated | Gate mechanism |
|---|---|---|
| StaffQuickLogin | `POST /auth/login` | `onClick` on one of the 5 role buttons |
| SimulateBtn (×11) | Full 4-step demo flow | `onClick` on the "Giả lập khách" button for that table |
| DevPanel (×3 cmds) | `POST /api/dev/run` | `onClick` on Seed / Build BE / Build FE buttons |

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **SimulateBtn: no timeout/abort on axios calls** | The four axios calls (`POST /auth/guest`, `GET /products`, `GET /combos`, `POST /orders`) have no `AbortController`, no `timeout` option, and no `axios.CancelToken`. If any call hangs indefinitely, the button stays stuck on its current `msg` string (`'Đang quét QR...'` / `'Đang tải thực đơn...'` / etc.) forever. The user must reload. Traced: `TableGrid.tsx:37,44–47,80` — no timeout param on any call. |
| 2 | **StaffQuickLogin: no loading reset on navigate** | On success, `loading` is never set back to `null` before `router.push()` (line 36). The button stays in spinner/disabled state until the component unmounts. This is intentional (avoids a re-enable flash) but means a failed navigation leaves the UI stuck. |
| 3 | **DevPanel: no in-progress guard across commands** | Each command's `running` gate is independent. There is no global "one command at a time" lock. Running `build-be` and `build-fe` simultaneously is possible and may have server-side side effects. |
| 4 | **SimulateBtn error msg falls back to generic** | `resp?.data?.message ?? 'Giả lập thất bại'` (line 115). If the BE returns an error shape without a `message` field, the user sees only the Vietnamese fallback with no diagnostic detail. |
