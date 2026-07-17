# Customer Profile — Loading States

> **TL;DR:** ✅ implemented · how `/profile` behaves while data is in flight. Two layers:
> (1) a route-level spinner during navigation (shared `(shop)/loading.tsx`), (2) a per-query
> `isLoading` branch inside the page — while loading, `<ProfilePageSkeleton/>` replaces zones
> B/C/D/E; Zone A (top nav) is always visible. There is **no** `loading.tsx` in the profile
> folder and **no** `<Suspense>` on this page.
>
> **Critical:** the backend endpoint `GET /customer/profile` does not exist; the query always
> resolves to a 404 error. After loading completes the page enters the 404-as-new-profile branch
> (empty create-form, save enabled). This is the normal post-loading state today.
>
> Page overview → [customer_profile.md](customer_profile.md) ·
> BE view + missing endpoint detail → [customer_profile_be.md](customer_profile_be.md) ·
> Bugs → [PROFILE_BUGS.md](PROFILE_BUGS.md) ·
> Scenario → [SCENARIO_PROFILE.md](SCENARIO_PROFILE.md)
>
> Traced from source on branch `experience_claude.md_system_1`.
> Sources: `fe/src/app/(shop)/loading.tsx:1-7` · `fe/src/app/(shop)/profile/page.tsx:1-80` ·
> `fe/src/app/(shop)/profile/components/ProfilePageSkeleton.tsx:1-37` ·
> `fe/src/hooks/useCustomerProfile.ts:26-39`

---

## Loading Layers (outer → inner)

```
1. Route navigation  → ShopLoading  (centered orange spinner, whole shop shell)
2. ProfilePage mounts → no Suspense, no profile-level loading.tsx
3. useCustomerProfile fires → isLoading=true → <ProfilePageSkeleton/> replaces zones B/C/D/E
```

### 1 — Route-level spinner · `fe/src/app/(shop)/loading.tsx:1-7`

Next.js App Router renders this for the **entire `(shop)` route group** during server-side
navigation into any shop page (including `/profile`). It is a single centered spinner:

- `h-64` flex container, centered · `h-8 w-8` ring, `animate-spin`, `border-t-orange-500`.
- Not profile-specific — shared by all `(shop)` routes. No skeleton, no layout chrome.

This layer is active only during the navigation transition (hydration hand-off). Once
`ProfilePage` mounts, the route spinner is gone.

### 2 — No profile-level `loading.tsx`, no `<Suspense>`

Confirmed by directory listing: `fe/src/app/(shop)/profile/` contains only `page.tsx` and
`components/`. There is no `loading.tsx` file in this folder and no `<Suspense>` boundary inside
`page.tsx`. The route-level spinner (layer 1) is the only inter-page transition UI.

### 3 — Per-query state · `fe/src/app/(shop)/profile/page.tsx:16,35-36`

`ProfilePage` destructures `{ data: profile, isLoading, isError, error }` from
`useCustomerProfile()` (`fe/src/hooks/useCustomerProfile.ts:26-39`). While `isLoading` is `true`
the page renders `<ProfilePageSkeleton/>` in place of all content zones. Zone A
(`<CustomerTopNav>`) renders **outside** the `isLoading` branch (`page.tsx:28-31`) and is
therefore always visible — the back-button header never disappears.

Query configuration (`useCustomerProfile.ts:27-39`):

| Setting | Value | Line |
|---|---|---|
| `queryKey` | `['customer', 'profile']` | `useCustomerProfile.ts:24` |
| `staleTime` | 5 min (`5 * 60 * 1000`) | `useCustomerProfile.ts:33` |
| `retry` logic | skips retry on 401 or 404; retries up to 2× for other errors | `useCustomerProfile.ts:34-38` |

Because the endpoint does not exist, the query fires, receives a 404, and skips retries immediately
(`retry` returns `false` for 404 — `useCustomerProfile.ts:36`). The `isLoading` window is very
short (one round-trip, no retries).

---

## Main content branch · `fe/src/app/(shop)/profile/page.tsx:35-76`

After `isLoading` resolves, the page renders one of three states in priority order:

| Priority | Condition | What renders | Notes |
|---|---|---|---|
| 1 | `isLoading === true` | `<ProfilePageSkeleton/>` — zones B/C/D/E replaced | `page.tsx:35-36` |
| 2 (today's normal) | `isError && is404` | Zones B/C/D/E with **empty** defaults; save bar shows "Tạo hồ sơ", enabled | `page.tsx:19,69-74`; `profile` is `undefined`, all fields `??''` / `??false` |
| 3 | `isError && !is404` | Zones B/C/D/E with empty defaults; save bar **disabled** (`disabled={true}`) | `page.tsx:72`; non-404 error, e.g. network failure |
| 4 (never today) | `!isLoading && !isError` | Zones B/C/D/E populated with real profile data | Would require a working BE endpoint |

State 2 ("priority 2") is the **normal post-loading state** on this branch because
`GET /customer/profile` 404s on the current backend. See
[customer_profile_be.md](customer_profile_be.md) and [PROFILE_BUGS.md](PROFILE_BUGS.md) for
the missing endpoint detail.

### Skeleton details · `fe/src/app/(shop)/profile/components/ProfilePageSkeleton.tsx:1-37`

`<ProfilePageSkeleton/>` uses `animate-pulse` (`Tailwind`'s CSS pulse) on a wrapping `<div>`.
It mirrors all four content zones with `bg-muted` blocks:

| Zone | Skeleton elements | Source lines |
|---|---|---|
| **Zone B** — Avatar header | `w-24 h-24 rounded-full` avatar circle · `h-4 w-32` name line · `h-5 w-24 rounded-full` member badge pill | `ProfilePageSkeleton.tsx:5-9` |
| **Zone C** — Personal info form | 4 identical field blocks, each: `h-3.5 w-28` label + `h-10 w-full rounded-lg` input bar | `ProfilePageSkeleton.tsx:12-19` |
| **Zone D** — Quick nav grid | `h-3.5 w-24` section label + 2×2 grid of `h-16 rounded-xl` nav card blocks | `ProfilePageSkeleton.tsx:22-29` |
| **Zone E** — Save CTA bar | Single `h-12 w-full rounded-xl` button block | `ProfilePageSkeleton.tsx:31-34` |

All blocks use `bg-muted` (design-token color, no hardcoded hex). The skeleton fully covers
the scrollable content area while leaving Zone A (top nav) untouched.

### Empty-state (is404 branch)

When `is404` is `true` there is no explicit "empty" component — the real zones B/C/D/E render
with empty/default values:

- Zone B: `name=""`, `isMember=false` (no avatar) — `page.tsx:40-44` (`profile?.name ?? ''`).
- Zone C: `<PersonalInfoForm>` receives `defaultValues={undefined}` since `profile` is `undefined` — `page.tsx:49-60`.
- Zone D: `<QuickNavGrid/>` renders unconditionally (no profile data dependency) — `page.tsx:64-66`.
- Zone E: `<SaveCTABar isNewProfile={true} disabled={false}>` — `page.tsx:69-74`. The save button reads "Tạo hồ sơ" when `isNewProfile` is `true`, else "💾 Lưu Thông Tin" — confirmed `SaveCTABar.tsx:30`.

---

## Search / Interaction Gating

This page has **no search input** and **no interaction-gated fetch**. `useCustomerProfile()` fires
unconditionally on mount with no `enabled` condition. There is no debounce, no lazy-load trigger,
and no user action required to initiate the fetch.

The mutation `useUpdateProfile()` (`useCustomerProfile.ts:42-57`) fires only on explicit form
submit and is independent of the loading flow.

---

## Flags / Known Gaps

| # | Flag | Detail |
|---|---|---|
| 1 | **404 = normal state** | The BE endpoint `GET /customer/profile` does not exist; every page load ends in the 404 branch (priority 2 above). The "success" branch (priority 4) is unreachable today. See [PROFILE_BUGS.md](PROFILE_BUGS.md). |
| 2 | **Zone A always visible** | `<CustomerTopNav>` renders outside the `isLoading` branch (`page.tsx:28-31`). The back button and title are present even during the skeleton and error states — intentional. |
| 3 | **No loading.tsx in profile folder** | There is no profile-specific `loading.tsx`. The `(shop)/loading.tsx` spinner is the only inter-page transition UI. If a slow network causes a long hydration, there is no profile-specific skeleton shown during that window. |
| 4 | **Short loading window** | Because the 404 retry is skipped immediately (`useCustomerProfile.ts:36`), `isLoading` resolves in one RTT. On slow connections the skeleton may flash briefly before the 404 branch appears. |
| 5 | **SaveCTABar label states** | `SaveCTABar.tsx:22-31` renders "Đang lưu…" (`isLoading`), else "Tạo hồ sơ" (`isNewProfile`), else "💾 Lưu Thông Tin". Confirmed from source. |
| 6 | **Mutation loading state** | `useUpdateProfile()` exposes `isPending` which is passed to Zone C (`<PersonalInfoForm isLoading={isPending}>`) and Zone E (`<SaveCTABar isLoading={isPending}>`). This is a separate in-flight state from `isLoading` and not covered by `<ProfilePageSkeleton/>`. |
