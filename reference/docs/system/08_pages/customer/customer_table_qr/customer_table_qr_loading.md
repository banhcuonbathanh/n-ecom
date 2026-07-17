# Customer Table QR Landing — Loading States · `/table/:tableId`

> **TL;DR:** ✅ implemented · this page **is** the loading experience — its entire body is a
> loading/error UI with no persistent content zone. On mount a single `useEffect` fires
> `POST /auth/guest`; the page then resolves to one of two real terminal states: in-flight spinner
> (default), or an error screen. A third branch (`TABLE_HAS_ACTIVE_ORDER` redirect) exists in the
> code but is dead — the BE endpoint never emits that error code. State is local `useState` —
> **not** TanStack Query, so there is no `isLoading`/`staleTime`/retry machinery. There is **no**
> `loading.tsx`, no `<Suspense>`, and no request timeout — a hung request leaves the spinner up
> indefinitely.
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources:
> `fe/src/app/table/[tableId]/page.tsx` ·
> `fe/src/lib/api-client.ts` ·
> `fe/src/store/cart.ts:153`
>
> Siblings:
> Page overview → [customer_table_qr.md](customer_table_qr.md) ·
> BE view → [customer_table_qr_be.md](customer_table_qr_be.md) ·
> Cross-page flow → [customer_table_qr_crosspage_dataflow.md](customer_table_qr_crosspage_dataflow.md) ·
> Scenario → [SCENARIO_TABLE_SCAN.md](SCENARIO_TABLE_SCAN.md) ·
> Bugs → [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md)

---

## Loading Layers (outer → inner)

```
1. No parent route-level loading.tsx  — /table/[tableId] is NOT inside (shop)/; no shared spinner
2. No loading.tsx at /table/[tableId]/ — only page.tsx exists in that directory
3. No <Suspense> in page.tsx          — 'use client' component; useEffect drives everything
4. useEffect on mount                 → api.post('/auth/guest', { qr_token: params.tableId })
   ├─ success                         → router.replace('/menu')        (spinner stays until unmount)
   ├─ TABLE_HAS_ACTIVE_ORDER error    → router.replace('/order/:id'|'/menu')  [DEAD — see Gap 2]
   └─ any other error                 → setError(...) → error screen renders
   (in-flight, default)               → full-screen spinner ("Đang tải menu…")
```

### Layer 1 — No parent route-level spinner

`fe/src/app/table/[tableId]/` is **not** nested under `(shop)/` or any other layout group that
provides a `loading.tsx`. The `(shop)/loading.tsx` file exists but covers only pages inside the
`(shop)/` group — `/table/[tableId]` is at the root `/table/` segment, outside any named group.
No shared spinner wraps this route during Next.js navigation.

### Layer 2 — No route-specific `loading.tsx`

The directory `fe/src/app/table/[tableId]/` holds **only `page.tsx`** — confirmed by directory
listing. No `loading.tsx`, no `layout.tsx`, no `error.tsx`. The App Router has no file-convention
fallback for this route beyond the page itself.

### Layer 3 — Local `useState` drives all UI · `page.tsx:14`

`TablePage` is a `'use client'` component (`page.tsx:1`). All visible state is one local variable:

```ts
// page.tsx:14
const [error, setError] = useState<string | null>(null)
```

The component renders either the error screen (when `error !== null`) or the spinner (when
`error === null`, the default on mount). There is no TanStack Query hook — `isLoading`,
`staleTime`, and automatic retry do not apply. This is a deliberate choice: the page is a
one-shot airlock, not a data-fetching page.

### Layer 4 — `useEffect` triggers the BE call · `page.tsx:16-44`

```ts
// page.tsx:16-44
useEffect(() => {
  api.post('/auth/guest', { qr_token: params.tableId })
    .then((res) => {
      const { access_token, table } = res.data.data
      // … setAuth, setTableId, setTableName …
      router.replace('/menu')
    })
    .catch((err) => {
      const code = err?.response?.data?.error
      if (code === 'TABLE_HAS_ACTIVE_ORDER') {
        const activeId = err?.response?.data?.details?.active_order_id
        router.replace(activeId ? `/order/${activeId}` : '/menu')
      } else {
        setError('Mã bàn không hợp lệ hoặc đã hết hạn. Vui lòng quét lại QR.')
      }
    })
}, [params.tableId])   // eslint-disable-line react-hooks/exhaustive-deps (page.tsx:43-44)
```

The dependency array is `[params.tableId]` (line 44). The effect fires once on mount; params are
stable for a given URL. There is no cleanup function and no `AbortController` — navigating away
during flight does not cancel the in-flight `POST`.

---

## Main Content Branch · `page.tsx:46-66`

The page renders exactly **two** mutually exclusive JSX branches, evaluated in priority order.
(A third branch exists in the `.catch` but is dead — see below.)

| Priority | Condition | What renders | Source lines |
|---|---|---|---|
| 1 | `error !== null` | Error screen (⚠️ icon + message + "Vào menu" button) | `page.tsx:46-59` |
| 2 | `error === null` (default) | Full-screen spinner + "Đang tải menu…" label | `page.tsx:61-66` |

There is no explicit success state — on a successful BE response the page calls
`router.replace('/menu')` at `page.tsx:32` and the component unmounts before React renders another
frame. The spinner is the last thing the customer sees before the redirect.

### State 1 — Error screen · `page.tsx:46-59`

Rendered when `setError` has been called (any `.catch` branch other than `TABLE_HAS_ACTIVE_ORDER`,
which is dead — see Gap 2).

```tsx
// page.tsx:46-59
if (error) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-4">
      <span className="text-4xl">⚠️</span>
      <p className="text-urgent text-center text-sm">{error}</p>
      <button
        onClick={() => router.replace('/menu')}
        className="text-primary text-sm underline"
      >
        Vào menu
      </button>
    </div>
  )
}
```

- Layout: `min-h-screen`, vertically and horizontally centered (`flex flex-col items-center
  justify-center`), `px-6 gap-4`.
- Icon: `⚠️` at `text-4xl`.
- Message text: always `"Mã bàn không hợp lệ hoặc đã hết hạn. Vui lòng quét lại QR."` for every
  error that reaches the `else` branch (`page.tsx:40`). BE-side error mapping (400/404/500 →
  this same string) → see `customer_table_qr_be.md §Error Behaviour` (not restated here).
- Button: `"Vào menu"` calls `router.replace('/menu')` — pushes the customer to the unauthenticated
  menu. No retry of the QR exchange is offered.
- No `isLoading`-based disable, no debounce — the button is unconditionally enabled.

### State 2 — In-flight spinner (default) · `page.tsx:61-66`

Rendered from mount until `setError` fires or the component unmounts on redirect. This is the
page's **default and dominant state** — the spinner shows for the entire `POST /auth/guest`
round-trip, then stays until `router.replace('/menu')` completes unmounting the component.

```tsx
// page.tsx:61-66
return (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    <p className="text-muted-fg text-sm">Đang tải menu…</p>
  </div>
)
```

- Layout: `min-h-screen`, centered, `gap-4`.
- Spinner: `w-10 h-10` ring, `border-4 border-primary border-t-transparent`, `rounded-full
  animate-spin`.
- Label: `"Đang tải menu…"` in `text-muted-fg text-sm`.
- No skeleton (there is nothing structural to skeleton — the page has no content zones of its own).
- No empty state — the spinner is never followed by a "nothing here" message; errors get the error
  screen.

### State 3 — `TABLE_HAS_ACTIVE_ORDER` redirect branch · `page.tsx:36-38` — DEAD

```ts
// page.tsx:36-38
if (code === 'TABLE_HAS_ACTIVE_ORDER') {
  const activeId = err?.response?.data?.details?.active_order_id
  router.replace(activeId ? `/order/${activeId}` : '/menu')
}
```

This branch exists in the FE but **`POST /auth/guest` never returns `TABLE_HAS_ACTIVE_ORDER`**.
`AuthService.GuestLogin` (`be/internal/service/auth_service.go:281-303`) performs only a
`GetTableByQRToken` lookup followed by `GenerateGuestToken` — no active-order check, no emission
of this error code. The lines `page.tsx:36-38` are unreachable on any real request. A re-scan of a
table with a live order mints a fresh guest JWT and redirects to `/menu` as if the table were free.

See [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md) Bug 1 for the full analysis and suggested fix options.

---

## API Client Timeout · `fe/src/lib/api-client.ts:6-9`

```ts
// api-client.ts:6-9
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1',
  withCredentials: true,
})
```

The `axios.create` call sets **no `timeout` option**. Axios's default `timeout` is `0` (disabled —
the request waits indefinitely for a response). There is no global timeout interceptor anywhere in
`api-client.ts` (lines 1-75 fully read). A slow or hung `POST /auth/guest` leaves the spinner up
with no automatic escape hatch for the customer.

See [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md) Bug 2 for analysis and the suggested `AbortController`
fix.

---

## Search / Interaction Gating

There are no user-driven inputs on this page — no search field, no form, no filter. Nothing to
gate. The only interactive element is the `"Vào menu"` button on the error screen
(`page.tsx:51-55`), which is unconditionally enabled from the moment the error state renders.

The `useEffect` is gated on `params.tableId` (`page.tsx:44`), but in practice the route only
matches when the URL segment is present, so `params.tableId` is always a non-empty string.

---

## Session Durability on Reload

The auth token written at `page.tsx:29` (`useAuthStore.setAuth`) is **memory-only** —
`useAuthStore` uses no persistence layer (auth tokens are never localStorage per
`docs/core/MASTER_v1.2.md §6`). The cart store persists only `orderNote` and `activeOrderId` via
`partialize` (`fe/src/store/cart.ts:153`); `tableId` and `tableName` (set at `page.tsx:30-31`) are
**not** in the `partialize` pick and are also memory-only.

Consequence: every F5 on any downstream page (`/menu`, `/order/:id`, `/checkout`) wipes the guest
session entirely — `tableId` and `accessToken` are gone. The spinner resets cold on any revisit to
`/table/:tableId`, whether the customer's first scan or a hard reload mid-session.

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **No timeout — spinner can hang indefinitely** | `axios.create` at `api-client.ts:6` sets no `timeout`. A slow, stalled, or never-responding `POST /auth/guest` leaves the full-screen spinner up with no escape except the browser back button or a hard reload. No visible indication that something is wrong. → [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md) Bug 2 |
| 2 | **`TABLE_HAS_ACTIVE_ORDER` branch is dead code** | `page.tsx:36-38` handles this error code, but `GuestLogin` (`auth_service.go:281-303`) never emits it. The lines are unreachable; a customer re-scanning a table with a live order silently gets a new guest session and lands on `/menu`. → [TABLE_QR_BUGS.md](TABLE_QR_BUGS.md) Bug 1 |
| 3 | **No retry on error** | The error screen (`page.tsx:46-59`) offers only a `"Vào menu"` escape, not a retry of the QR exchange. A transient 500 or network hiccup forces the customer to physically re-scan the QR code. |
| 4 | **No abort on unmount** | `useEffect` at `page.tsx:16-44` has no cleanup function and no `AbortController`. If the customer navigates away while the POST is in-flight, the promise may still call `setError` or `router.replace` on an unmounted component (React 18 suppresses the warning, but the router navigation side-effect can still fire). |
| 5 | **No `loading.tsx` at this route** | There is no App Router `loading.tsx` for `/table/[tableId]/` — confirmed by directory listing (`page.tsx` only). During client-side navigation to this URL, Next.js has no framework-level fallback; the page manages its own spinner via `useState`. Intentional, but no SSR-phase loading signal if the route is ever accessed server-side. |
| 6 | **F5 mid-session always clears guest session** | Both `accessToken` and `tableId` are memory-only (see Session Durability above). A reload on `/menu` or any downstream page leaves the customer without a guest identity — they must re-navigate to `/table/:tableId` or re-scan the physical QR code. By design per `docs/core/MASTER_v1.2.md §6`, but a UX gap worth flagging. |
