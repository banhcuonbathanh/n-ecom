# Customer Checkout — Loading / Data-in-Flight States

> **TL;DR:** ✅ implemented · `/checkout` is a **mutation page**, not a data-fetch page. It has no
> `loading.tsx` of its own, no `<Suspense>`, and no `useQuery`. Its only async surface is a single
> `useMutation` (submitOrder). The "loading" story is therefore thin: one shared route spinner that
> can appear on initial navigation, one disabled button state while the POST is in flight, and a
> silent fire-and-forget GET refetch inside `onSuccess`. No skeletons, no per-field spinners, no
> content placeholders exist on this page — that is intentional given it renders from local cart
> state only.
>
> Page overview → [customer_checkout.md](customer_checkout.md) ·
> BE view → [customer_checkout_be.md](customer_checkout_be.md) ·
> Cross-page flow → [customer_checkout_crosspage_dataflow.md](customer_checkout_crosspage_dataflow.md) ·
> Scenario → [SCENARIO_CHECKOUT_ORDER.md](SCENARIO_CHECKOUT_ORDER.md) ·
> Bugs → [CHECKOUT_BUGS.md](CHECKOUT_BUGS.md)
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Primary source: `../../../../../fe/src/app/(shop)/checkout/page.tsx` ·
> Store: `../../../../../fe/src/store/cart.ts` ·
> Route spinner: `../../../../../fe/src/app/(shop)/loading.tsx`

---

## Loading Layers (outer → inner)

```
1. Route navigation   → ShopLoading spinner (shared across all (shop) routes)
2. Suspense           → NONE — no <Suspense> in checkout/page.tsx
3. Data fetch         → NONE — no useQuery on mount
4. Mutation in flight → submit button disabled + label change only
```

This page is shallower than `/menu`: layers 2 and 3 do not exist.

---

### Layer 1 — Route-level spinner · `fe/src/app/(shop)/loading.tsx:1-7`

Next.js App Router renders `ShopLoading` for the **entire `(shop)` route group** during
server-side navigation into `/checkout` (e.g. a hard load of the URL).

- Renders a `flex h-64 items-center justify-center` container with a single
  `h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500` div.
- This is **not** checkout-specific — it is shared with `/menu`, `/order/:id`, and any other
  `(shop)` route. There is **no `loading.tsx`** inside `fe/src/app/(shop)/checkout/` — confirmed
  by directory listing (folder contains only `page.tsx`).
- On a client-side navigation from `/menu` via `router.push('/checkout')`, this spinner
  typically does **not** appear — Next.js handles the transition without a server round-trip, so
  the page component mounts directly.

### Layer 2 — Suspense boundary

**Does not exist.** `checkout/page.tsx` contains no `<Suspense>` wrapper. The page does not call
`useSearchParams()` or any hook that requires a Suspense boundary. No `Suspense` import appears
anywhere in the file (`page.tsx:1-217`).

### Layer 3 — Data fetch on mount

**Does not exist.** The page imports `useMutation` but no `useQuery` (`page.tsx:7` — only
`useMutation` imported from `@tanstack/react-query`). All content displayed on mount (cart items,
totals, payment options) comes from the Zustand cart store (`useCartStore`, `page.tsx:33`), which
is backed by `localStorage` via `persist` middleware (`cart.ts:41-156`). No network call fires on
mount.

Note: the `persist` middleware only saves `orderNote` and `activeOrderId` — not `items`
(`cart.ts:153`). So `cart.items` is always session-memory; a hard reload with an empty array
triggers the empty-cart guard (see State 1 below).

### Layer 4 — Mutation in flight · `page.tsx:45-88`, `page.tsx:204-213`

The only async operation is `submitOrder`, a `useMutation` wrapping `POST /orders`.

While `submitOrder.isPending` is `true` (`page.tsx:207`):

- The fixed-bottom submit button receives `disabled={submitOrder.isPending}` (`page.tsx:207`).
- The button label switches: `submitOrder.isPending ? 'Đang đặt hàng...' : \`Đặt hàng · ${formatVND(total)}\`` (`page.tsx:210-212`).
- The button applies `disabled:opacity-60` via Tailwind (`page.tsx:208`) — visual dimming only,
  no spinner icon.
- **No other UI element changes.** The form fields, order summary, contact section, and payment
  radio grid remain fully visible with no overlay, no blur, and no additional spinner.

---

## Main Content Branch (priority-ordered states)

The page renders exactly one of the following outcomes, evaluated top-to-bottom:

| Priority | Condition | What renders | Source |
|---|---|---|---|
| 1 | `!submitted.current && cart.itemCount() === 0` | `null` (blank screen while redirecting to `/menu`) | `page.tsx:92` |
| 2 | `submitOrder.isPending` | Full page visible; submit button disabled + "Đang đặt hàng..." label | `page.tsx:207-212` |
| 3 | `onSuccess` fires | `cart.clearCart()` then `router.replace('/order/<id>')` — page unmounts | `page.tsx:62-75` |
| 4 | `onError` — `TABLE_HAS_ACTIVE_ORDER` (DEAD branch) | Would call `router.replace('/order/<active_id>')`, but this branch never fires | `page.tsx:79-83` |
| 5 | `onError` — any other error | `toast.error(message)` — page stays mounted, button re-enables | `page.tsx:86` |
| 6 | otherwise (idle, cart non-empty) | Full checkout form with no loading state | `page.tsx:94-216` |

### State 1 — Empty-cart guard · `page.tsx:36-38` and `page.tsx:92`

Two code paths enforce the empty-cart guard:

**`useEffect` (post-mount)** (`page.tsx:36-38`):

```js
useEffect(() => {
  if (!submitted.current && cart.itemCount() === 0) router.replace('/menu')
}, [cart, router])
```

**Early return (render phase)** (`page.tsx:92`):

```js
if (!submitted.current && cart.itemCount() === 0) return null
```

Same condition fires synchronously before the JSX tree is evaluated. An empty-cart visit renders
**nothing** — a blank screen for the brief window before `router.replace` completes. There is no
skeleton, no "redirecting…" copy, and no spinner during this window.

`submitted.current` is a `useRef(false)` (`page.tsx:34`) set to `true` in both `onSuccess`
(`page.tsx:62`) and the `TABLE_HAS_ACTIVE_ORDER` branch of `onError` (`page.tsx:80`). This flag
prevents the guard from firing after a successful submit — `onSuccess` calls `cart.clearCart()`
(`page.tsx:73`), which zeroes `items` (`cart.ts:89`); without the flag, that would immediately
redirect back to `/menu` before `router.replace('/order/...')` could fire.

`itemCount()` sums `item.quantity` across `cart.items` (`cart.ts:125`). Because `items` is not
persisted (`cart.ts:153`), a hard reload of `/checkout` always lands on an empty array, the guard
fires, and the user is sent to `/menu`.

### State 3 — onSuccess: fire-and-forget GET refetch · `page.tsx:61-75`

After `POST /orders` returns 201:

1. `submitted.current = true` (`page.tsx:62`) — disarms the empty-cart guard.
2. If `order.id` is present, fires `GET /orders/<id>` via `api.get(...)` (`page.tsx:66`).
   - On success: writes the full order JSON to `localStorage` under
     `` `${STORAGE_KEYS.ORDER_CACHE}${order.id}` `` (resolves to `order_cache_<id>` per
     `storage-keys.ts:3`) (`page.tsx:68`).
   - On failure: swallows the error silently and falls back to caching the minimal POST response
     body (`page.tsx:70`). **No spinner and no error UI are shown to the user.**
3. `cart.clearCart()` resets items, tableId, tableName, activeOrderId, paymentMethod, orderNote
   (`page.tsx:73`; `cart.ts:89`).
4. `router.replace(order?.id ? '/order/<id>' : '/order')` (`page.tsx:75`).

There is no loading state for the GET refetch. The user sees the submit button disabled for the
combined duration of the POST + GET before navigation fires.

### State 4 — `TABLE_HAS_ACTIVE_ORDER` onError branch (dead code) · `page.tsx:79-83`

The FE checks `resp?.data?.error === 'TABLE_HAS_ACTIVE_ORDER'` and would set
`submitted.current = true` then `router.replace('/order/<active_id>')`. However, the BE never
returns this error on `POST /orders` — it returns `201` with `table_busy: true` in the response
body instead. This branch can never fire. See [CHECKOUT_BUGS.md Bug 2](CHECKOUT_BUGS.md) for the
full root cause. No loading or redirect state is produced here in practice.

---

## Search / Interaction Gating

There is no search input on this page and no fetch gated by user interaction before submit. All
form fields (name, phone, note, payment radio) are local RHF state and trigger no network
requests. The only fetch-gating on the page is the submit button's `disabled` attribute during
`isPending` (`page.tsx:207`).

RHF + Zod validation (`page.tsx:40-43`) runs synchronously on form submit; field errors appear
inline (`page.tsx:152-154`, `page.tsx:163-165`, `page.tsx:195-197`) without any async operation.

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **No checkout-specific `loading.tsx`** | Confirmed absent — the folder holds only `page.tsx`. If the parent `(shop)/loading.tsx` is removed, there will be no spinner at all during hard navigation to `/checkout`. |
| 2 | **No submit-pending spinner icon** | The button dims (`opacity-60`) and its label changes, but there is no animated spinner. On a slow connection a user has no animated feedback that the request is in flight beyond the dimmed button. |
| 3 | **Blank screen on empty cart with no copy** | The null-render + redirect window shows a blank white screen. On a slow device the blank may be perceptible before navigation completes. |
| 4 | **Fire-and-forget GET failure is silent** | If `GET /orders/<id>` fails after a successful POST (e.g. 403 for a source=`online` order — see [CHECKOUT_BUGS.md Bug 3](CHECKOUT_BUGS.md)), the failure is swallowed. The user is navigated to `/order/:id` where the tracking page must recover from a thin cache. No toast or indicator is shown. |
| 5 | **`TABLE_HAS_ACTIVE_ORDER` onError branch never fires** | `page.tsx:79-83` would redirect on this error code, but the BE never emits it. The branch is dead code. Detailed in [CHECKOUT_BUGS.md Bug 2](CHECKOUT_BUGS.md). |
| 6 | **Hard reload on `/checkout` always redirects to `/menu`** | Cart `items` are not persisted (`cart.ts:153` — only `orderNote` + `activeOrderId` survive). A reload empties `items`, the guard fires, and all form input is lost. This is intentional (session-only cart) but means no reload-safe state on this page. |
