# Customer Profile — `/profile`

> **TL;DR:** ✅ FE implemented · ⚠️ backend missing — both endpoints (`GET /customer/profile` and
> `PUT /customer/profile`) return Gin's default 404; the page always loads in "new profile" (create)
> mode and Save can never succeed today. This is FE-only groundwork for the 🔮 PLANNED online
> customer account (order from home / pickup / delivery).
> Sources traced: `fe/src/app/(shop)/profile/page.tsx` · `fe/src/hooks/useCustomerProfile.ts` · all
> five `profile/components/` files.
> BE view (missing endpoint reality, full trace) → [customer_profile_be.md](customer_profile_be.md)
> Bugs → [PROFILE_BUGS.md](PROFILE_BUGS.md)
> Loading states → [customer_profile_loading.md](customer_profile_loading.md)
> Scenario → [SCENARIO_PROFILE.md](SCENARIO_PROFILE.md)

---

## ASCII Wireframe

```
┌────────────────────────────────────────────────┐
│ [←] Thông Tin Khách Hàng                       │ ← A CustomerTopNav   (page.tsx:28-31)
├────────────────────────────────────────────────┤
│            ┌──────────┐                        │
│            │  avatar  │  Nguyễn Văn A          │ ← B ProfileAvatarHeader
│            │  [📷🚫]  │  ✓ Thành viên          │   camera badge: disabled (opacity-50)
│            └──────────┘                        │   membership badge: only when isMember
├────────────────────────────────────────────────┤
│  Họ và tên *                                   │ ← C PersonalInfoForm  (4 fields, RHF+Zod)
│  [ Nguyễn Văn A _____________________ ]        │
│  Số điện thoại *                               │
│  [ 0912 345 678 ______________________ ]       │
│  Số nhà / Địa chỉ *                            │
│  [ 123 Đường Lê Lợi, Q.1, TP.HCM _____ ]      │
│  Email (tùy chọn)                              │
│  [ nguyenvana@email.com ______________ ]       │
├────────────────────────────────────────────────┤
│  Khám phá thêm                                 │ ← D QuickNavGrid (2×2 grid)
│  ┌──────────────┐ ┌──────────────┐             │
│  │ 🍽️ Thực Đơn  │ │ ❤️ Yêu Thích │  (primary) │
│  └──────────────┘ └──────────────┘             │
│  ┌──────────────┐ ┌──────────────┐             │
│  │ 📋 Lịch Sử Ăn│ │ 🏠 Đặt Bàn  │  (plain)   │
│  └──────────────┘ └──────────────┘             │
├────────────────────────────────────────────────┤
│  [ 💾 Lưu Thông Tin ]                          │ ← E SaveCTABar  (label changes by state)
│  (or: [ Tạo hồ sơ ] when is404 / new profile) │
├────────────────────────────────────────────────┤
│ [Menu][Đơn Hàng][Yêu Thích][Theo Dõi][Cài Đặt]│ ← ClientBottomNav (shell — (shop)/layout.tsx)
└────────────────────────────────────────────────┘
  Loading state: ProfilePageSkeleton — animate-pulse blocks for all 5 zones
                 (ProfilePageSkeleton.tsx:1-37)
```

## Zones

| Zone | Component | File | Data source |
|---|---|---|---|
| A Nav | `components/shared/CustomerTopNav` | `page.tsx:28-31` | static — title `"Thông Tin Khách Hàng"`, back arrow calls `router.back()` |
| B Avatar | `profile/components/ProfileAvatarHeader` | `ProfileAvatarHeader.tsx:10-45` | `useCustomerProfile` → `profile.name`, `profile.isMember`, `profile.avatarUrl` |
| C Form | `profile/components/PersonalInfoForm` | `PersonalInfoForm.tsx:24-122` | `useCustomerProfile` → `UpdateProfileForm` default values; submits via `onSubmit` → `useUpdateProfile` mutation |
| D Quick nav | `profile/components/QuickNavGrid` | `QuickNavGrid.tsx:12-17` | static `CARDS` array (4 tiles) |
| E Save CTA | `profile/components/SaveCTABar` | `SaveCTABar.tsx:11-36` | `useUpdateProfile` mutation (`isPending`, `isNewProfile` flag) |
| Skeleton | `profile/components/ProfilePageSkeleton` | `ProfilePageSkeleton.tsx:1-37` | shown while `isLoading === true` (`page.tsx:35-36`) |
| Shell nav | `ClientBottomNav` (injected by `(shop)/layout.tsx`) | — | — |

## Key Interactions

- **Back arrow** (Zone A) → `router.back()` (`page.tsx:30`).
- **Edit form fields** (Zone C) → RHF tracks local state; Zod validates on submit
  (`PersonalInfoForm.tsx:10-15`, rules: name ≥ 2 chars, phone `^0\d{9}$`, address ≥ 5 chars,
  email optional but validated when non-empty).
- **Save / Create** (Zone E) → triggers `<form id="profile-form">` submit via `type="submit"
  form="profile-form"` (`SaveCTABar.tsx:16-17`); calls `useUpdateProfile` mutation →
  `PUT /customer/profile` — **currently 404s** (see BE view and Flags).
- **Quick-nav tiles** (Zone D):
  - "Thực Đơn" → `/menu` (highlighted; `QuickNavGrid.tsx:13`)
  - "Yêu Thích" → `/menu/favourites` (highlighted; `QuickNavGrid.tsx:14`)
  - "Lịch Sử Ăn" → `/order` (plain; `QuickNavGrid.tsx:15`)
  - "Đặt Bàn" → `/menu` (plain; `QuickNavGrid.tsx:16` — same href as "Thực Đơn"; no dedicated
    booking route exists yet)
- **Avatar camera badge** (Zone B) — rendered but non-interactive: `opacity-50 cursor-not-allowed`,
  `aria-label="Đổi ảnh (chưa khả dụng)"` (`ProfileAvatarHeader.tsx:29-34`). No upload handler.
- **Membership badge** (Zone B) — `<Badge variant="success">✓ Thành viên</Badge>` shown only when
  `profile.isMember === true` (`ProfileAvatarHeader.tsx:39-41`). Today this is never truthy
  (profile fetch 404s).
- **Error gate on Save** — if the query errored but it is NOT a 404 (`page.tsx:19, 72`), the Save
  button is `disabled`; if it IS a 404 (profile missing = new customer), the button is enabled with
  label "Tạo hồ sơ" and `isNewProfile=true`.

## Business Logic Used

- Profile fetch/update hooks (query key `['customer','profile']`, stale 5 min, no retry on 401/404)
  → [`../../../07_business_logic/LOGIC_FE.md`](../../../07_business_logic/LOGIC_FE.md)
- Customer role isolation (never part of staff hierarchy, no RBAC elevation)
  → [`../../../02_spec/BUSINESS_RULES.md §1 RBAC`](../../../02_spec/BUSINESS_RULES.md#1-rbac-role-hierarchy)
- 🔮 PLANNED online customer account (login from home, pickup/delivery order flow) extends this page
  → [`../../../02_spec/BUSINESS_RULES.md §5 JWT / Auth Rules`](../../../02_spec/BUSINESS_RULES.md#5-jwt--auth-rules)

---

## Object Model — Customer Profile Page (FE shapes only)

> Traced from `fe/src/hooks/useCustomerProfile.ts` and `fe/src/app/(shop)/profile/` on branch
> `experience_claude.md_system_1`. **This page owns only the `CustomerProfile` and
> `UpdateProfileForm` FE shapes.** No BE handler, service, repo, or DB column exists today —
> see [customer_profile_be.md](customer_profile_be.md) for the full missing-endpoint trace.
>
> Do NOT re-describe Order/Cart fields here — those live in the Order/Cart object models.

```
FETCH:  GET /customer/profile → 404 (no BE route) → useCustomerProfile isError+is404=true
                                                  → page renders in "new profile" mode
WRITE:  UpdateProfileForm (Zone C) → PUT /customer/profile → 404 (no BE route)
                                   → onError toast "Không thể lưu — kiểm tra kết nối"
```

### §1 — CustomerProfile (read shape)

Defined at `useCustomerProfile.ts:6-15`. This is the expected wire shape when the endpoint exists.
Today the query always errors (404).

| Field | FE type | Expected BE JSON key | Notes |
|---|---|---|---|
| `id` | `string` | `id` | UUID string |
| `name` | `string` | `name` | — |
| `phone` | `string` | `phone` | — |
| `address` | `string` | `address` | — |
| `email` | `string \| undefined` | `email` | optional |
| `isMember` | `boolean` | `isMember` | membership status — never truthy today (endpoint missing) |
| `memberSince` | `string \| undefined` | `memberSince` | ISO date string; optional |
| `avatarUrl` | `string \| undefined` | `avatarUrl` | optional; avatar upload is also stubbed (see §3) |

### §2 — UpdateProfileForm (write / submit shape)

Defined at `useCustomerProfile.ts:17-22`. This is what the RHF form collects and the mutation
sends in the PUT body. Zod schema is in `PersonalInfoForm.tsx:10-15`.

| Field | FE type | Zod rule | Form label | Required? |
|---|---|---|---|---|
| `name` | `string` | `min(2, 'Tên phải có ít nhất 2 ký tự')` | "Họ và tên" | ✅ required |
| `phone` | `string` | `regex(/^0\d{9}$/)` | "Số điện thoại" | ✅ required |
| `address` | `string` | `min(5, 'Địa chỉ quá ngắn')` | "Số nhà / Địa chỉ" | ✅ required |
| `email` | `string \| undefined` | `.email().optional().or(z.literal(''))` | "Email (tùy chọn)" | ❌ optional |

### §3 — Flags / Known Mismatches

| # | Flag | Detail | Source |
|---|---|---|---|
| 1 | 🔴 **`GET /customer/profile` does not exist** | No `/customer` route group registered in `be/cmd/server/main.go`. Gin returns its default 404 JSON. The page always enters "new profile" mode (`is404=true`). Full trace → [customer_profile_be.md](customer_profile_be.md). Bugs → [PROFILE_BUGS.md](PROFILE_BUGS.md). | `useCustomerProfile.ts:30` · `page.tsx:19,73` |
| 2 | 🔴 **`PUT /customer/profile` does not exist** | Same reason as #1. Mutation fires and immediately fails → `onError` toast "Không thể lưu — kiểm tra kết nối". Save can never succeed. | `useCustomerProfile.ts:47-48` · `SaveCTABar.tsx:29-30` |
| 3 | ⚠️ **Avatar upload stubbed** | Camera/upload badge rendered with `opacity-50 cursor-not-allowed`. No upload handler, no `onChange`, no API call. Comment in source: "stubbed for v1 — badge non-interactive until upload API exists". | `ProfileAvatarHeader.tsx:28-34` |
| 4 | ⚠️ **"Đặt Bàn" tile → `/menu` (same as "Thực Đơn")** | Two tiles share the same `href: '/menu'`. No dedicated booking/table-reservation route exists. The subtitle "Đặt bàn về nhà" implies a future feature. | `QuickNavGrid.tsx:13,16` |
| 5 | ⚠️ **`isMember` / `memberSince` never populated** | Both fields come from the profile fetch which always 404s. The "✓ Thành viên" badge in Zone B is unreachable in the current build. | `ProfileAvatarHeader.tsx:39-41` · `useCustomerProfile.ts:12-13` |
