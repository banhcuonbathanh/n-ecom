# Cashier Payment — Loading States · `/cashier/payment/:id`

> **TL;DR:** ✅ implemented (but payment flows are broken — see PAYMENT_BUGS.md) ·
> how `/cashier/payment/:id` behaves while data is in flight.
> Two real loading layers: (1) no route-level spinner (no `loading.tsx` in `cashier/` — the
> `(dashboard)` group has none either), (2) a combined render guard `isLoading || !order` in the
> page that shows a full-screen "Đang tải..." text during the single `GET /orders/:id` query.
> Three in-page interaction states (create-payment pending, upload-proof pending, WS awaiting)
> are documented below; the QR/WS "waiting" states are **currently unreachable** due to Bug 2.
>
> Page overview → [staff_cashier_payment.md](staff_cashier_payment.md) ·
> BE view → [staff_cashier_payment_be.md](staff_cashier_payment_be.md) ·
> Cross-page flow → [staff_cashier_payment_crosspage_dataflow.md](staff_cashier_payment_crosspage_dataflow.md) ·
> Scenario → [SCENARIO_CASHIER_BILL.md](SCENARIO_CASHIER_BILL.md) ·
> Code bugs → [PAYMENT_BUGS.md](PAYMENT_BUGS.md)
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources traced:
> `fe/src/app/(dashboard)/cashier/payment/[id]/page.tsx` ·
> `fe/src/components/guards/AuthGuard.tsx` ·
> `fe/src/components/guards/RoleGuard.tsx`

---

## Loading Layers (outer → inner)

```
1. AuthGuard resolves  → renders null (blank screen) until getMe() settles
2. RoleGuard resolves  → renders error text if role insufficient (synchronous after AuthGuard)
3. PaymentContent runs → useQuery ['order', orderId] fires; isLoading || !order → "Đang tải..."
4. Interaction states  → createPayment.isPending · uploadProof.isPending · WS backoff
```

### Layer 1 — AuthGuard · `fe/src/components/guards/AuthGuard.tsx:7-24`

`AuthGuard` wraps the entire page export (`page.tsx:39-43`). On mount it checks `useAuthStore(s => s.user)` (`:8`). If `user` is `null` (cold load or hard refresh, store is memory-only), it:

1. Renders **`null`** — a completely blank screen (`AuthGuard.tsx:23`).
2. Fires `getMe()` once (`AuthGuard.tsx:17`, guarded by `attempted.current` so it only runs once).
3. On success: calls `setAuth(u, accessToken)` → store hydrates → `user` becomes non-null → children render (`AuthGuard.tsx:18`).
4. On failure: `router.push('/login')` (`AuthGuard.tsx:19`) — the blank screen stays until navigation completes.

**What the user sees:** a completely blank white/dark page for the duration of the `GET /auth/me` round-trip. There is no spinner, no skeleton, no progress indicator.

**No route-level `loading.tsx`** exists in `fe/src/app/(dashboard)/cashier/` or the `(dashboard)` group root. The `admin/` sub-group has its own `loading.tsx` (spin ring), but cashier does not inherit it — `loading.tsx` is per-segment, not inherited upward. Therefore Next.js App Router does **not** render any route-transition spinner for `/cashier/payment/:id`.

### Layer 2 — RoleGuard · `fe/src/components/guards/RoleGuard.tsx:10-23`

Executes synchronously after `AuthGuard` resolves (i.e., after `user` is non-null). Reads `user.role` from the store and compares against `minRole = Role.CASHIER` (set at `page.tsx:40`):

- If `roleValue >= Role.CASHIER` → renders `children` (`RoleGuard.tsx:23`). No spinner, immediate.
- If `roleValue < Role.CASHIER` → renders a `<div>` with text `"Không có quyền truy cập trang này"` (`RoleGuard.tsx:17-20`), styled `text-urgent p-8 text-center font-body`. This is a **permanent terminal state** — there is no redirect, no spinner.

Roles that pass: cashier, manager, admin. Roles blocked: chef, customer. Since `RoleGuard` runs after `AuthGuard`, an unauthenticated user never reaches this layer.

### Layer 3 — Order data query · `page.tsx:56-143`

Once guards pass, `PaymentContent` (`page.tsx:47`) mounts and fires:

```
useQuery<Order>({
  queryKey: ['order', orderId],
  queryFn:  () => api.get(`/orders/${orderId}`).then(r => r.data?.data ?? r.data),
  enabled:  !!orderId,
})
```
(`page.tsx:56-60`)

The render guard at `page.tsx:137-143` is:

```tsx
if (isLoading || !order) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-muted-fg">
      Đang tải...
    </div>
  )
}
```

**What the user sees during the query:** the text `"Đang tải..."` centered on a `min-h-screen` background — no spinner, no skeleton, no order outline. The full-screen loading state occupies the entire viewport.

**No Redis cache:** `GET /orders/:id` always hits MySQL (`staff_cashier_payment_be.md §Caching`). TanStack Query holds the result client-side under `['order', orderId]` for the session; revisiting the same URL within the same session is instant if the cache entry has not been invalidated.

**`staleTime` / `gcTime`:** not set explicitly — TanStack Query v5 defaults apply (staleTime = 0, gcTime = 5 min). Every mount re-fetches in the background if the cache is stale.

### Layer 4 — Interaction-level pending states

These are in-page states that overlay individual controls, not the full page:

| State | Condition | What renders | Source |
|---|---|---|---|
| Create payment pending | `createPayment.isPending === true` | Confirm button shows `"Đang xử lý..."` + `disabled` + `opacity-40 cursor-not-allowed` | `page.tsx:239-246` |
| Upload proof pending | `uploadProof.isPending === true` | `<p className="text-muted-fg text-xs">Đang upload...</p>` below the file input | `page.tsx:275-277` |
| WS backoff reconnect | `payment.status === 'pending'`, socket closed | Reconnect fires after `Math.min(1000 * 2 ** attempts, 30_000)` ms; no UI indicator | `page.tsx:95-99` |

---

## Main Content Branch (priority-ordered)

After the guards resolve and the `isLoading || !order` gate passes, the main region renders one of the following states in priority order:

| Priority | Condition | Renders |
|---|---|---|
| 1 | `isLoading \|\| !order` (still loading or query errored) | Full-screen `"Đang tải..."` text — see Layer 3 above |
| 2 | `!payment` (no payment created yet) | Receipt card + method selector grid + primary confirm/create button |
| 3 | `payment.status === 'pending' && payment.qr_code_url` | Receipt card + QR image (`<img src={payment.qr_code_url}>`) + `"⏳ Đang chờ thanh toán..."` + optional proof-upload input — **currently unreachable (Bug 2)** |
| 4 | `payment` exists but none of the above | Receipt card only; controls region is `null` (the `else null` at `page.tsx:280`) — **currently the actual post-create state for all methods (Bug 2)** |

### Skeleton / empty-state details

- There is **no skeleton** for the receipt or method selector. Loading state is plain text only.
- There is **no explicit empty-state** for the case where `orderId` is missing (e.g. navigated directly without a valid `:id`). The query is `enabled: !!orderId` (`page.tsx:59`) — if `orderId` is falsy the query never fires, `isLoading` stays `false`, and `order` stays `undefined`, so the render guard `!order` returns the "Đang tải..." text permanently. This is a silent stuck state, not a distinct empty-state component.
- There is **no error state** for a failed `GET /orders/:id` fetch. If the network request errors, TanStack Query sets `isError = true` but the render guard `isLoading || !order` remains true (since `order` is still `undefined`) → the page is permanently stuck showing `"Đang tải..."`. See Flags #1 below.

---

## WS Waiting State (intended, currently unreachable)

The intended UX for gateway payments (VNPay/MoMo/ZaloPay) after `POST /payments`:

1. FE receives `{id, pay_url, qr_code_url}` and calls `setPayment(data)`.
2. `payment.status === 'pending'` and `payment.qr_code_url` truthy → renders the QR block with `"⏳ Đang chờ thanh toán..."` (`page.tsx:249-279`).
3. The WS effect (`page.tsx:63-108`) opens a socket to `…/ws/orders-live?token=<accessToken>` and reconnects on close with exponential backoff (cap 30 s, `page.tsx:98`). No UI indicator during backoff.
4. On `payment_success` WS message matching `orderId` → `toast.success(...)` + `window.print()` + `router.push('/pos')` (`page.tsx:88-92`).

**This entire branch is unreachable today** because `POST /payments` returns only `{id, pay_url, qr_code_url}` — no `status` field — so `payment.status` is `undefined`, the QR render condition `payment.status === 'pending'` is `false`, and the WS `payment.status !== 'pending'` guard at `page.tsx:64` causes the effect to `return` immediately. See [PAYMENT_BUGS.md Bug 2](PAYMENT_BUGS.md#bug-2----create-payment-response-omits-statusamountmethod-screen-goes-blank).

---

## Search / Interaction Gating

| Gate | Rule | Source |
|---|---|---|
| Order query enabled | `enabled: !!orderId` — query does not fire if route param is missing/empty | `page.tsx:59` |
| Confirm/create button disabled | `disabled={createPayment.isPending}` — prevents double-submit | `page.tsx:239` |
| File input → upload mutation | `onChange` fires only when `e.target.files?.[0]` is truthy (`page.tsx:271`) — no empty-file race |
| WS connection gated | Effect returns early unless `token && payment && payment.status === 'pending'` (`page.tsx:64`) — socket only opened when waiting for gateway confirmation |

---

## Flags / Known Gaps

| # | Flag | Detail |
|---|---|---|
| 1 | **No error state for `GET /orders/:id` failure** | Render guard is `isLoading \|\| !order` (`page.tsx:137`). A network error leaves `isLoading=false` and `order=undefined` — the page is permanently stuck on `"Đang tải..."` with no retry button and no error message. Affects bad `orderId`, 404, and network-down scenarios. |
| 2 | **QR / WS waiting states are unreachable today** | `POST /payments` response omits `status` ([PAYMENT_BUGS.md Bug 2](PAYMENT_BUGS.md#bug-2----create-payment-response-omits-statusamountmethod-screen-goes-blank)). The QR image block, `"⏳ Đang chờ thanh toán..."` text, and the WS reconnect loop never activate in practice. |
| 3 | **Blank screen during AuthGuard resolution** | No spinner or skeleton while `GET /auth/me` is in flight (`AuthGuard.tsx:23`). Users on slow connections see an unexplained blank page. |
| 4 | **No route-level `loading.tsx` for `cashier/`** | The `(dashboard)` root has no `loading.tsx`; the `admin/` sub-segment has one, but `cashier/` does not inherit it. Next.js renders no route-transition spinner when navigating into this page. |
| 5 | **Missing orderId → stuck "Đang tải..."** | If `orderId` is falsy, the query is disabled (`enabled: !!orderId`, `page.tsx:59`), `isLoading` stays `false`, `order` stays `undefined`, and the render guard returns `"Đang tải..."` indefinitely. No distinct empty/invalid-route state. |
| 6 | **No WS reconnect indicator** | During backoff the cashier receives no feedback that the socket is reconnecting. The "⏳ Đang chờ thanh toán..." text is static — it does not update to reflect connectivity state. (❓ UNVERIFIED — no WS status display component found in the file; confirmed the text is a static `<p>` at `page.tsx:261`.) |
| 7 | **Proof-upload pending UI unreachable** | `uploadProof.isPending` UI (`page.tsx:275-277`) lives inside the QR-pending block (priority 3 above). Since that block is unreachable (Flag 2 / Bug 2), the upload UI is never shown even if a user somehow triggered an upload. |
