# Staff Login — Loading States · `/login`

> **TL;DR:** ✅ implemented · how `/login` behaves while its one mutation is in flight.
> This is a **thin loading story** — the page fetches **no data on mount**. There is no
> `useQuery`, no skeleton screen, no route-level `loading.tsx`, and no `<Suspense>` boundary on
> this route. The only in-flight UI is a disabled submit button with a label swap. A
> second micro-state (already-logged-in redirect flash) exists but has no visual treatment.
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(auth)/login/page.tsx` · `fe/src/app/dev-login/page.tsx` ·
> `fe/src/features/auth/auth.api.ts` · `fe/src/features/auth/auth.store.ts`.
>
> Page overview → [staff_login.md](staff_login.md) ·
> BE view (error codes, rate limits) → [staff_login_be.md](staff_login_be.md) ·
> Session handoff (token/cookie across pages) → [staff_login_crosspage_dataflow.md](staff_login_crosspage_dataflow.md) ·
> Code bugs found → [LOGIN_BUGS.md](LOGIN_BUGS.md)

---

## Loading Layers (outer → inner)

```
1. Route navigation → NO route-level loading.tsx (does not exist for (auth) group)
2. Page mount       → NO Suspense boundary (no useSearchParams or async component)
3. Submit mutation  → isSubmitting (RHF) — disables button + label swap ONLY
```

This page has **one layer only** — the submit mutation state. The outer two layers that exist
for `/menu` (route spinner + Suspense) are **absent** here, by design: the login page has
nothing to show while navigating in, and nothing that requires `useSearchParams` on the page.

### 1 — Route-level spinner · `(auth)/login/loading.tsx`

**Does not exist.** Confirmed: the `(auth)/login/` folder contains only `page.tsx`:

```
fe/src/app/(auth)/login/
└── page.tsx      ← only file; no loading.tsx, no layout.tsx
```

There is also no `loading.tsx` at the `(auth)/` group level. Next.js App Router performs a
synchronous client-side render for this page; the browser's built-in tab spinner is the only
navigation indicator. No custom loading UI fires when a user navigates to `/login`.

### 2 — Suspense boundary

N/A — login fetches no data on mount. `login/page.tsx` does not call `useSearchParams()` or
any other hook that suspends. No `<Suspense>` is used anywhere in the file
(`fe/src/app/(auth)/login/page.tsx:1-120`).

### 3 — Submit mutation · `login/page.tsx:102-108`

The only in-flight state is the submit mutation managed by React Hook Form's `isSubmitting`.

**What triggers it:** RHF sets `isSubmitting = true` automatically for the duration of the
`onSubmit` async handler (`login/page.tsx:44-59`). The handler calls `login()` from
`auth.api.ts` (`login/page.tsx:46`), which is a plain `axios.post('/auth/login', ...)` — **no
TanStack Query, no `useMutation`**, just a direct `await`
(`fe/src/features/auth/auth.api.ts:9-10`).

**What renders while `isSubmitting` is true** (`login/page.tsx:102-108`):

```tsx
<Button
  type="submit"
  disabled={isSubmitting}
  className="w-full bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
>
  {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
</Button>
```

| Property | Value while in flight |
|---|---|
| `disabled` | `true` — prevents double-submit |
| `opacity` | `0.6` via `disabled:opacity-60` Tailwind class |
| Button label | swaps to `"Đang đăng nhập…"` |
| Spinner / overlay | **none** |
| Form fields | still interactive (not disabled) |
| Error messages | cleared until the next submit cycle (RHF clears on submit) |

When the mutation settles: on success, `router.push(...)` fires (`login/page.tsx:48`) and the
page unmounts — `isSubmitting` never returns to `false` on the same mount. On error,
`setError('password', { message: … })` fires (`login/page.tsx:53-58`), RHF resets
`isSubmitting` to `false`, the button re-enables, and the error message renders under the
password field.

---

## Already-logged-in redirect flash · `login/page.tsx:33-35`

A `useEffect` runs after mount:

```tsx
useEffect(() => {
  if (user) router.push(redirectByRole[user.role] ?? '/dashboard')
}, [user, router])
```

**The flash:** if the Zustand auth store (`fe/src/features/auth/auth.store.ts:12-18`) already
holds a `user` (e.g., the staff reloaded the tab but a token refresh ran before navigating
back to `/login`), the full login form **paints for one frame** before `router.push` fires.
This is standard React `useEffect` timing — effects run after the first paint.

**No visual treatment:** there is no "Redirecting…" overlay, no spinner, no loading state. The
form renders fully for one frame (~16 ms at 60 fps) then vanishes. In practice, this is
imperceptible, and the Zustand store is memory-only (no localStorage persistence for `user`),
so the scenario only arises if the user has a valid token refresh and navigates back manually.

---

## Dev-only contrast: `/dev-login` · `fe/src/app/dev-login/page.tsx`

The `/dev-login?role=<role>` route is a **developer shortcut** on a **different route** (`/dev-login`,
not `/login`) that calls the **same** `POST /auth/login` endpoint but has a richer loading story:

### `DevLoginPage` — full-screen spinner (`dev-login/page.tsx:67-77`)

```tsx
export default function DevLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-fg" />
      </div>
    }>
      <DevLoginInner />
    </Suspense>
  )
}
```

The outer `<Suspense>` fallback renders a `Loader2` (lucide) full-screen spinner while the
inner component (`DevLoginInner`) hydrates — required because `DevLoginInner` calls
`useSearchParams()` (`dev-login/page.tsx:18`), which suspends during SSR/prerender.

### `DevLoginInner` — auto-login spinner (`dev-login/page.tsx:56-65`)

When a valid `role=` query param is present and the `login()` call is in flight:

```tsx
<div className="min-h-screen bg-background flex items-center justify-center">
  <div className="flex flex-col items-center gap-3 text-muted-fg">
    <Loader2 className="h-6 w-6 animate-spin" />
    <p className="text-sm">Đang đăng nhập {account?.label ?? role}…</p>
  </div>
</div>
```

This is a full-screen `Loader2` spinner with a "Đang đăng nhập \<role label\>…" message below
it — for example "Đang đăng nhập Thu Ngân…" for `cashier`. The spinner shows from page mount
until `login()` resolves and `router.replace(account.redirect)` fires. There is no `isSubmitting`
toggle here — the whole page body IS the loading state.

### Contrast summary

| Aspect | `/login` (production) | `/dev-login` (dev-only) |
|---|---|---|
| Route | `(auth)/login/page.tsx` | `dev-login/page.tsx` (outside auth group) |
| `loading.tsx` | none | none |
| `<Suspense>` | none | yes — wraps inner (for `useSearchParams`) |
| Spinner while in-flight | none (button text only) | full-screen `Loader2` |
| In-flight trigger | user submits the form | page mount auto-fires `login()` |
| API called | same `POST /auth/login` | same `POST /auth/login` (password `Admin@123`) |
| Error UI | inline field error under password | full-screen error card + role list links |

---

## Per-query `isLoading` states

N/A — login fetches no data on mount. There are no `useQuery` calls in `login/page.tsx` or
any component it renders. The only async call is the submit mutation (`auth.api.ts:9-10`),
which is governed by RHF `isSubmitting`, not TanStack Query.

---

## Skeleton screens

N/A — login fetches no data on mount. There is no content to skeleton-load; the form is
static markup rendered immediately on mount.

---

## Search / interaction gating

N/A — login fetches no data on mount. The only "gating" behavior is standard RHF field
validation: the `noValidate` attribute on the `<form>` (`login/page.tsx:70`) disables native
browser validation, handing full control to RHF + Zod. The submit handler is guarded by
`zodResolver` — if `username < 3` or `password < 6` the form does not submit and no network
call fires. This is synchronous validation, not a loading state.

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **No `loading.tsx` for the `(auth)` group** | Neither `(auth)/loading.tsx` nor `(auth)/login/loading.tsx` exists. A slow navigation to `/login` shows the browser spinner only. This is generally acceptable for a login page (no heavy data to fetch) but is worth knowing when designing any navigation-aware transition. |
| 2 | **Already-logged-in redirect paints the form for one frame** | The `useEffect` redirect (`login/page.tsx:33-35`) runs after the first paint. No loading overlay suppresses the form during this frame. Not user-visible at normal frame rates, but a more robust approach is a `null` early return before the form JSX when `user` is truthy. |
| 3 | **No spinner on submit** | The button text swap to "Đang đăng nhập…" is the only feedback during the mutation. On slow networks, the user has no other visual indicator (no spinner, no progress bar, no overlay). Acceptable for a login page but worth flagging for UX. |
| 4 | **`/dev-login` is more polished than `/login` for in-flight UI** | The dev page has a full-screen spinner + `<Suspense>`; the production page has neither. If the production login ever needs a richer loading state, `/dev-login/page.tsx` is the model to follow. |
| 5 | **`RATE_LIMIT_EXCEEDED` has no specific FE message** | The BE returns `429 RATE_LIMIT_EXCEEDED` after > 5 attempts per IP per 60 s (`staff_login_be.md` § Error Behaviour). The FE error map (`login/page.tsx:52-58`) has no branch for this code — it falls through to the generic "Đã xảy ra lỗi, vui lòng thử lại". The user sees no indication they are throttled. → [LOGIN_BUGS.md](LOGIN_BUGS.md) Bug 2. |
