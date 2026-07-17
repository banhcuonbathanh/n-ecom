# Scenario — Chị Hoa Tries to Save Her Profile

> **TL;DR:** 🔮 PLANNED — FE groundwork for future online customer accounts. This scenario walks
> through the full `/profile` experience as it actually exists today: a well-built form that hits two
> non-existent endpoints (`GET /customer/profile` and `PUT /customer/profile`), so nothing ever
> saves. The missing-endpoint detail lives in [customer_profile_be.md](customer_profile_be.md) and
> [PROFILE_BUGS.md](PROFILE_BUGS.md) — this file tells the story.
>
> Sources traced: `fe/src/app/(shop)/profile/page.tsx` · `fe/src/hooks/useCustomerProfile.ts` ·
> `fe/src/app/(shop)/profile/components/PersonalInfoForm.tsx` · `SaveCTABar.tsx` ·
> `ProfilePageSkeleton.tsx`
>
> Siblings: [customer_profile.md](customer_profile.md) · [customer_profile_be.md](customer_profile_be.md) ·
> [PROFILE_BUGS.md](PROFILE_BUGS.md) · [customer_profile_loading.md](customer_profile_loading.md)

---

## The Cast

| Who | Device | Role in this story |
|---|---|---|
| **Chị Hoa** | iPhone, Safari | First-time customer who just ordered via QR and wants to save her details |

## The Setting

A Tuesday afternoon. Chị Hoa has just eaten at the restaurant and received a "Bạn có thể lưu thông
tin để đặt hàng online" prompt (hand-written, on the receipt). She opens `/profile` on her phone,
expecting a standard account screen.

---

## The Timeline

### T+0:00 — Page opens, skeleton appears

Chị Hoa taps the profile link. The browser hits `/profile`. `page.tsx` renders immediately
(`'use client'`). `useCustomerProfile()` fires `GET /customer/profile` (`useCustomerProfile.ts:29-31`).
While the query is in-flight, `isLoading` is `true` (`page.tsx:16`) and the page renders
`<ProfilePageSkeleton />` (`page.tsx:35-36`): four grey pulse bars for the form fields, a circle for
the avatar, a grey button strip at the bottom (`ProfilePageSkeleton.tsx:1-37`).

The skeleton covers all five zones (B through E), exactly as the real page would look once loaded.

### T+0:01 — GET 404, skeleton drops, empty form appears

The API call reaches Gin. There is no `/customer` route group registered in
`be/cmd/server/main.go` (confirmed: `grep customer main.go` returns nothing). Gin returns its
default 404 JSON.

Back in the hook: `retry` checks the status (`useCustomerProfile.ts:34-38`):

```ts
retry: (failCount, err) => {
  const status = err?.response?.status
  if (status === 401 || status === 404) return false   // ← 404 skips all retries
  return failCount < 2
}
```

No retry fires. `isLoading` becomes `false`; `isError` becomes `true`; `error.response.status`
is `404`. `data` (profile) is `undefined`.

`page.tsx` drops the skeleton and renders the full page. Because `profile` is `undefined`,
`PersonalInfoForm` receives `defaultValues={undefined}` (`page.tsx:49-57`), so the form resets to
all-empty strings (`PersonalInfoForm.tsx:32`): name `""`, phone `""`, address `""`, email `""`.

`page.tsx:19` computes `is404 = true`. This flows into `SaveCTABar` as `isNewProfile={true}`
(`page.tsx:73`), so the button reads **"Tạo hồ sơ"** — not "Lưu Thông Tin" (`SaveCTABar.tsx:30`).

The `disabled` prop on `SaveCTABar` is `isError && !is404` → `true && !true` → **`false`**
(`page.tsx:72`). The button is enabled. The form looks ready to use.

### T+0:30 — Chị Hoa fills in her details

She types:
- Họ và tên: "Hoa Nguyễn"
- Số điện thoại: "0912345678"
- Địa chỉ: "45 Nguyễn Trãi, Q.1, TP.HCM"
- Email: "hoa@email.com" (optional, she fills it anyway)

`PersonalInfoForm` validates on submit via `zodResolver(schema)` (`PersonalInfoForm.tsx:11-15`,
`30`). All four fields pass: name ≥ 2 chars, phone matches `/^0\d{9}$/`, address ≥ 5 chars, email
is valid. No inline error messages appear.

She taps **"Tạo hồ sơ"**.

### T+0:31 — Button submits the form; PUT 404; error toast fires

`SaveCTABar`'s button carries `form={FORM_ID}` (`SaveCTABar.tsx:16`). The HTML `form` element in
`PersonalInfoForm` has `id={formId}` (`PersonalInfoForm.tsx:40`). Tapping the button submits that
form without prop-drilling — the only coordination between the two components is the shared
`FORM_ID` constant (`page.tsx:12`) and the HTML `form` attribute.

`handleSubmit` in `page.tsx:21-23` calls `updateProfile(data)`. The mutation fires
`PUT /customer/profile` with `{ name, phone, address, email }` (`useCustomerProfile.ts:47-48`).

Same result as the GET: no `/customer` route in `main.go`, Gin 404. `onSuccess` never runs
(`useCustomerProfile.ts:49-52`): no `invalidateQueries`, no `setCustomerName`, no success toast.

`onError` runs (`useCustomerProfile.ts:54-56`):

```ts
onError: () => {
  toast.error('Không thể lưu — kiểm tra kết nối')
}
```

A red toast appears at the bottom of the screen: **"Không thể lưu — kiểm tra kết nối"**. The
button spinner stops. The form still shows her typed values (RHF holds local state), but nothing
has been written anywhere.

### T+0:32 — Chị Hoa is confused and gives up

The form looks filled, the button is still enabled, but the toast says "kiểm tra kết nối". She
tries once more — same red toast. She closes the browser tab.

### Next visit — form is empty again

She returns tomorrow. The page re-runs `GET /customer/profile` → 404 again (no server, no
persistence). `data` is still `undefined`. `defaultValues` is still `undefined`. The form is
empty. There is no local storage fallback: the profile hook uses TanStack Query with no
`initialData` or `placeholderData` from localStorage. The `['customer', 'profile']` cache entry
holds an error, not data (`useCustomerProfile.ts:27-39`). Nothing from her previous visit survives.

---

## Under the Hood

### A. Cross-component coordination (within the page)

No Zustand store is involved. The only coordination between the two interactive widgets
(`PersonalInfoForm` and `SaveCTABar`) is the HTML `form id` mechanism:

```
page.tsx         const FORM_ID = 'profile-form'    (page.tsx:12)
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
PersonalInfoForm                  SaveCTABar
  <form id={formId} …>             <Button type="submit" form={formId} …>
  (PersonalInfoForm.tsx:40)         (SaveCTABar.tsx:16)
```

When Chị Hoa taps "Tạo hồ sơ", the browser finds `<form id="profile-form">` anywhere in the DOM
and submits it. No prop-drilling, no shared store. The query hook (`useCustomerProfile`,
`useUpdateProfile`) is the other shared element — `page.tsx` reads `isLoading`/`isError`/`data`
from the query and passes them down to both children as plain props.

This is why there is no `customer_profile_crosscomponent_dataflow.md`: the widget count and
interaction pattern do not meet the §1 threshold (≥3 interacting widgets + shared store).

### B. Cross-page data flow

None today. The only intended outliving write was `setCustomerName(result.name)` in `onSuccess`
(`useCustomerProfile.ts:51`) — writing to `useSettingsStore` so other pages (e.g. the top nav)
can greet Chị Hoa by name. Because `onSuccess` is gated behind the PUT's 200 response — which
never arrives — `setCustomerName` never fires. No data escapes this page.

This is why there is no `customer_profile_crosspage_dataflow.md`.

### C. FE → BE: what the page sends (and why it fails)

| Call | Payload | Actual result |
|---|---|---|
| `GET /customer/profile` | — | Gin 404 (no `/customer` route group in `main.go`) |
| `PUT /customer/profile` | `{ name, phone, address, email }` | Gin 404 (same reason) |

For the full missing-endpoint trace, see [customer_profile_be.md](customer_profile_be.md) and
[PROFILE_BUGS.md](PROFILE_BUGS.md).

### D. BE → FE: what the page receives (and what live updates look like)

`GET /customer/profile` → 404. No profile data is ever received.

`PUT /customer/profile` → 404. No mutation response is ever received.

There is no realtime on this page (no SSE, no WebSocket). The page is entirely pull-based, and the
pull fails.

### E. Loading and caching

| State | What renders | Source |
|---|---|---|
| `isLoading = true` | `<ProfilePageSkeleton />` — full-page pulse animation | `page.tsx:35-36`; `ProfilePageSkeleton.tsx:1-37` |
| `isLoading = false`, `is404 = true` | Empty form + "Tạo hồ sơ" button enabled | `page.tsx:38-76`; `SaveCTABar.tsx:30` |
| `isLoading = false`, `isError = true` but not 404 | Same form, button **disabled** | `page.tsx:72`: `disabled={isError && !is404}` |

TanStack Query key `['customer', 'profile']` (`useCustomerProfile.ts:24`) has `staleTime: 5 * 60 * 1000`
(`useCustomerProfile.ts:33`). On a 404, the cache holds an error object for 5 minutes — not data.
A tab reload re-triggers the query immediately because a cached error is not treated as fresh data.
Chị Hoa's second tap on "Tạo hồ sơ" during the same session uses the same mutation instance;
there is no debounce.

For the full skeleton-to-content transition detail, see
[customer_profile_loading.md](customer_profile_loading.md).

### F. Monitoring

Little to observe server-side. Because there is no `/customer` route handler, the 404s are Gin's
default `NoRoute` responses, so no application-level handler/service log lines are emitted.
❓ UNVERIFIED whether the **global** metrics middleware (registered engine-wide, `main.go:117,126`)
still records these unmatched requests — Gin's engine-level middleware generally runs for `NoRoute`
404s, so a request *may* appear in the access/metrics path even though no domain handler executes.
From the **domain** BE's perspective (handler → service → repo), Chị Hoa's visit never happened.

---

## One-Line Mental Model

> `/profile` is a fully wired form talking to endpoints that don't exist yet — it looks like an
> account screen but every save is a silent dead end until the `🔮 PLANNED` `/customer` route group
> is added to the backend.
