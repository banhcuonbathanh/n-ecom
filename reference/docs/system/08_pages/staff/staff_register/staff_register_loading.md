# Register — Loading & In-Flight Behaviour

> **TL;DR:** ✅ implemented · `/register` fetches **nothing on mount** — it is a pure form with one
> async write (`POST /auth/register`). So there is no route spinner, no Suspense, no skeleton; the
> only "loading" state is the submit-in-flight button. This file documents that one state plus the
> mount redirect-guard flash.
> Anchor: [staff_register_be.md](staff_register_be.md) · FE view: [staff_register.md](staff_register.md) ·
> crosspage: [staff_register_crosspage_dataflow.md](staff_register_crosspage_dataflow.md) ·
> scenario: [SCENARIO_REGISTER.md](SCENARIO_REGISTER.md).

---

## Loading Layers (outer → inner)

1. **Route spinner / `loading.tsx`** — none. The `(auth)` group has no `loading.tsx` covering
   `/register`, and the page is a client component with no server data fetch
   (`register/page.tsx:1` `'use client'`). Nothing blocks first paint.
2. **Suspense / query states** — none. The page has **no `useQuery`** and no data fetch on mount;
   the card renders immediately and fully.
3. **Mount redirect guard** — `useEffect(() => { if (user) router.push(...) }, [user])`
   (`register/page.tsx:35-37`). If a logged-in user lands here, the form paints for one frame and
   is then replaced by the role redirect. Not a spinner, but a brief flash worth noting.

## Main content branch

The card (`register/page.tsx:62-127`) renders synchronously: title, subtitle, three inputs
(`Tên đăng nhập`, `Mật khẩu`, `Xác nhận mật khẩu`), and the submit button. There is no
empty/skeleton/error branch on load because there is nothing to load.

## The one in-flight state — submit

Driven by RHF's `isSubmitting` (`register/page.tsx:43`):

| Phase | What renders | Source |
|---|---|---|
| idle | button label "Đăng ký", enabled | `register/page.tsx:118-124` |
| submitting | button label **"Đang tạo tài khoản…"**, `disabled` (`disabled:opacity-60`) | `register/page.tsx:120-123` |
| success | (no UI change) → `setAuth` then `router.push` to `/pos` | `register/page.tsx:48-50` |
| error | button re-enabled; inline field error set via `setError` — `USERNAME_TAKEN` → on `username`, else generic on `confirm` | `register/page.tsx:51-59` |

`isSubmitting` stays true for the full duration of the `await register(...)` call, so a slow network
keeps the button disabled and labelled "Đang tạo tài khoản…" — the only progress indicator.

## Input gating

Client-side validation gates the request, not a fetch: Zod blocks submit until `username` ≥ 3,
`password` ≥ 6, and `password === confirm` (`register/page.tsx:13-20`). A failed refinement shows
the inline Zod message and no request is made.

## Flags / Known Gaps

- **No loading spinner of any kind on mount** — correct for a fetch-free form, but means the
  redirect-guard (logged-in user) shows a one-frame form flash before redirecting.
- **No optimistic UI / no toast** — success is communicated only by the navigation away to `/pos`;
  there is no "Tạo tài khoản thành công" confirmation. (Behavioural note, not a bug.)
- The error path never shows a top-level banner — all errors are funnelled to a field-level
  message (`username` or `confirm`), per `register/page.tsx:54-58`.
