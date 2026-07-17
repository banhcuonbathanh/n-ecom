# Customer Profile — Backend View (`/profile`)

> **TL;DR:** ⚠️ **The two endpoints this page calls do not exist in the backend.** `/profile`
> (`fe/src/app/(shop)/profile/page.tsx`) reads `GET /customer/profile` and writes
> `PUT /customer/profile` via `useCustomerProfile` / `useUpdateProfile`
> (`fe/src/hooks/useCustomerProfile.ts`). Tracing `be/cmd/server/main.go` shows **no `/customer`
> route group and no profile handler/service/query anywhere in `be/`** — so both requests fall
> through to Gin's default `404 page not found` (plain text, **not** the project's JSON error
> contract). The page is **FE-only groundwork** for the 🔮 PLANNED online customer account
> (order-from-home); its "save" can never succeed today.
>
> **Sources traced (branch `experience_claude.md_system_1`):**
> `be/cmd/server/main.go` (route registration) · whole `be/` tree (grep for `profile` / `customer`) ·
> `fe/src/hooks/useCustomerProfile.ts` · `fe/src/lib/api-client.ts` ·
> `fe/src/app/(shop)/profile/page.tsx`.
>
> **Links:** FE sibling → [customer_profile.md](customer_profile.md) ·
> code bugs → [PROFILE_BUGS.md](PROFILE_BUGS.md) ·
> loading → [customer_profile_loading.md](customer_profile_loading.md) ·
> scenario → [SCENARIO_PROFILE.md](SCENARIO_PROFILE.md) ·
> RBAC / JWT → [../../../02_spec/BUSINESS_RULES.md](../../../02_spec/BUSINESS_RULES.md).

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis cache |
|---|----------|------|---------|---------|--------------|-------------|
| 1 | `GET /customer/profile` (R) | ❌ **route not registered** — token attached by interceptor but never reaches middleware | ❌ none | ❌ none | ❌ none | none |
| 2 | `PUT /customer/profile` (W) | ❌ **route not registered** | ❌ none | ❌ none | ❌ none | none |

**Route registration:** the API mounts a single versioned group `v1 := r.Group("/api/v1")`
(`be/cmd/server/main.go:148`). Its children are `auth`, `products`, `categories`, `toppings`,
`combos`, `orders`, `payments`, `tables`, `staff`, `admin` (`main.go:154–311`). **There is no
`/customer` group and no `/profile` route on any group.** A repo-wide grep for `profile` in `be/`
returns only staff `GET /auth/me` references (`auth_handler.go:105`, `integration/auth_test.go:237`),
and a grep for `customer/profile` / `CustomerProfile` / `customer_profile` returns **nothing**.

**Full request path the FE forms:** `api-client` baseURL is
`http://localhost:8080/api/v1` (`fe/src/lib/api-client.ts:7`), so the calls resolve to
`GET /api/v1/customer/profile` and `PUT /api/v1/customer/profile`
(`useCustomerProfile.ts:30,48`) — both unmatched.

---

## Auth Model on This Page

There is **no auth model to describe**, because no route exists to gate.

- The shared axios interceptor attaches `Authorization: Bearer <accessToken>` when the auth store
  holds a token (`api-client.ts:11–15`). For a QR/guest session that token is the guest JWT; for a
  fresh browser it is absent.
- Because the path matches no route, Gin returns `404` **before** any `authMW` / role middleware
  runs. The token is therefore irrelevant — an authenticated request and an anonymous one both 404.
- The 401-refresh branch in the response interceptor (`api-client.ts:24–56`, incl. the guest
  `sub === 'guest'` exception) is **not** triggered here: a missing route is a `404`, not a `401`,
  so no refresh/redirect is attempted.

> When the online-account feature is built (🔮 PLANNED), this page's endpoints would need a
> `customer`-role JWT distinct from the staff hierarchy — see
> [../../../02_spec/BUSINESS_RULES.md](../../../02_spec/BUSINESS_RULES.md) §1 RBAC / §5 JWT.

---

## Per-Endpoint Detail

### 1 · `GET /customer/profile` — read profile

- **FE caller:** `useCustomerProfile()` (`useCustomerProfile.ts:26–40`) — a TanStack Query with
  `queryKey ['customer','profile']`, `staleTime` 5 min, and `retry` that **skips retry on 401/404**
  (`useCustomerProfile.ts:34–38`).
- **BE:** none. The request 404s at the router.
- **Observed behaviour:** the query resolves to `isError: true` with `error.response.status === 404`.
  `page.tsx:19` reads exactly this: `is404 = error?.response?.status === 404`. So the page treats the
  missing backend as **"no profile yet"** and renders an empty form in *create* mode (see Error
  Behaviour). No retry storm — the 404 short-circuits `retry`.
- **Expected DTO (FE-side only, never returned by any BE code):** `CustomerProfile`
  `{ id, name, phone, address, email?, isMember, memberSince?, avatarUrl? }`
  (`useCustomerProfile.ts:6–15`). ❓ UNVERIFIED against BE — no server type exists to confirm field
  names/shape; these are aspirational FE types.

### 2 · `PUT /customer/profile` — update profile

- **FE caller:** `useUpdateProfile()` (`useCustomerProfile.ts:42–58`) — mutation sends the RHF form
  body `{ name, phone, address, email? }` (`UpdateProfileForm`, `useCustomerProfile.ts:17–22`;
  validated by the Zod schema in `PersonalInfoForm.tsx:10–15`).
- **BE:** none. The request 404s at the router.
- **Observed behaviour:** the mutation always rejects → `onError` fires the toast
  `"Không thể lưu — kiểm tra kết nối"` (`useCustomerProfile.ts:54–56`). `onSuccess` **never runs**,
  so `queryClient.invalidateQueries` and `setCustomerName(result.name)` (`useCustomerProfile.ts:49–52`)
  never execute — i.e. nothing is persisted to the BE *or* to the settings store. The "Lưu Thông Tin /
  Tạo hồ sơ" button is therefore permanently non-functional for its stated purpose.

---

## Caching & Invalidation

- **Redis:** none — there is no server handler to cache, and no key is read or written for this page.
- **Client cache (TanStack Query):** `['customer','profile']`, `staleTime` 5 min
  (`useCustomerProfile.ts:24,33`). Because the only fetch 404s, the cache holds an error, not data.
- **Intended invalidation (dead today):** `useUpdateProfile.onSuccess` would
  `invalidateQueries(['customer','profile'])` (`useCustomerProfile.ts:50`) — never reached, since the
  PUT never succeeds.

---

## Error Behaviour

- **Bind / validation:** all field validation is **client-side** (Zod in `PersonalInfoForm.tsx:10–15`:
  name ≥2 chars, phone `^0\d{9}$`, address ≥5 chars, email optional). No server validation exists.
- **404 (the GET):** swallowed deliberately by the page — `is404` flips the UI into *create* mode:
  - `SaveCTABar` renders with label `"Tạo hồ sơ"` and stays **enabled** (`page.tsx:69–74`:
    `disabled={isError && !is404}` → `false` when `is404`).
  - The form renders with empty defaults (`profile` is `undefined`, so `defaultValues` is `undefined`
    → RHF empties — `page.tsx:49–58`, `PersonalInfoForm.tsx:32`).
- **Non-404 error (the GET):** any other error (e.g. network down) sets `disabled = true` on the save
  bar, locking the page (`page.tsx:72`).
- **PUT failure:** generic toast `"Không thể lưu — kiểm tra kết nối"` (`useCustomerProfile.ts:55`).
  This message implies a transient connectivity problem, but the real cause is a permanently missing
  endpoint — misleading to the user (see [PROFILE_BUGS.md](PROFILE_BUGS.md)).
- **Error contract mismatch:** even when these endpoints are built, note that an *unmatched* Gin route
  returns plain-text `404 page not found`, **not** the project
  [ERROR_SPEC](../../../02_spec/ERROR_SPEC.md) JSON envelope. The FE only inspects
  `error.response.status`, so it copes — but no `code`/`message` body is available.

---

## Flags

| # | Flag | Evidence | Severity |
|---|------|----------|----------|
| 1 | **Both endpoints are unimplemented.** `GET`/`PUT /customer/profile` have no route, handler, service, or query in `be/`. Every load 404s; every save fails. The page is FE-only groundwork for the 🔮 PLANNED online account. → **code bug**, see [PROFILE_BUGS.md](PROFILE_BUGS.md) Bug 1. | `main.go:148–311` (no `/customer` group); grep `profile`/`customer/profile` in `be/` = none | 🟠 Med |
| 2 | **Save failure is mislabelled as a connectivity issue.** The PUT 404 surfaces as `"Không thể lưu — kiểm tra kết nối"`, hiding that the feature simply doesn't exist server-side. | `useCustomerProfile.ts:54–56` | 🟡 Low |
| 3 | **`CustomerProfile` / `UpdateProfileForm` shapes are FE-only and unverified.** No BE type backs `{ id, isMember, memberSince, avatarUrl, … }`; field names are aspirational. ❓ UNVERIFIED. | `useCustomerProfile.ts:6–22` | 🟡 Low |
| 4 | **Avatar upload is a visible-but-disabled stub** — the camera badge is `opacity-50 cursor-not-allowed`; there is no upload endpoint for customer avatars (the only upload route is staff-side `POST /files/upload`, manager-gated). | `ProfileAvatarHeader.tsx:28–34`; `main.go` files group | 🟡 Low |
| 5 | **`setCustomerName` cross-write never fires.** The only intended write that outlives this page (`settings.customerName`) is in `onSuccess`, which the dead PUT never reaches — so this page has **no functional cross-page handoff** today (why `_crosspage_dataflow.md` is N/A). | `useCustomerProfile.ts:49–52` | 🟡 Low |

> See the FE sibling [customer_profile.md](customer_profile.md) for the zone→component map and the
> page-doc drift fixed in this run; all code-level defects above are detailed in
> [PROFILE_BUGS.md](PROFILE_BUGS.md).
