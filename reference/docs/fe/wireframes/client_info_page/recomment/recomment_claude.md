# Claude Guidelines — Thông Tin Khách Hàng

> Read this before implementing `/(shop)/profile`.

---

## Spec Summary

- Mobile customer profile page (420px) — 6 zones, 0 modals, Pattern B rendering
- Key constraint: **customer account system must exist** (registered customer JWT, not guest JWT) for `GET/PUT /api/v1/customer/profile` to work. Do not start CI-8/CI-9 until this is confirmed.
- Form (Zone C) uses RHF + Zod — do not lift form state to Zustand
- On save: invalidate `['customer', 'profile']` AND sync `useSettingsStore.setCustomerName()`
- Two new shared components introduced here: `ClientTopNav` + `ClientBottomNav` — build these first; other client pages (menu, favourites, history) will reuse them

---

## Shared Components — Reuse Checklist

> These are the `new (shared)` components from the Component Specifications table. Register in `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md` before implementation starts.

| Component | Tier | File | Register in Index? |
|-----------|------|------|--------------------|
| `CustomerTopNav` | Tier 2 — Shared | `components/shared/CustomerTopNav.tsx` | Already registered — make `cartCount` optional |
| `ClientMainBottomNav` | Tier 2 — Shared | `components/shared/ClientMainBottomNav.tsx` | ✅ Yes — new |

> **Note:** `CustomerTopNav` already exists (`used by: client_product_detail`). Its `cartCount: number` prop must be changed to `cartCount?: number` so profile page can use it without a cart count. This is a non-breaking change — existing callers can keep passing it.

**ClientMainBottomNav:**
```typescript
// No props — derives active tab from usePathname() internally
// Distinct from ClientBottomNav (3-tab monitoring page variant)
type ClientMainTab = 'home' | 'menu' | 'favourites' | 'history' | 'profile'
```

> **Important:** `ClientMainBottomNav` must NOT accept `activeTab` as a prop. Derive it from `usePathname()` inside the component. Avoids prop drilling across all 5 main client pages.
> Do NOT confuse with `ClientBottomNav` (3-tab: menu · favourites · refresh) — that is the monitoring page's nav bar, not this one.

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|----------------|-----|
| Customer profile (name, phone, address, email, isMember) | TanStack Query `['customer', 'profile']` | Server-owned, user-specific — not Zustand |
| Form values during edit | RHF `useForm` (local to `PersonalInfoForm`) | Form state does not cross component boundary |
| `customerName` (for order pre-fill) | `useSettingsStore.customerName` | Read by Menu/checkout flow; sync here after save |
| Active bottom nav tab | Derived from `usePathname()` in `ClientBottomNav` | No store needed |
| Loading / isPending | TanStack Query `isLoading` / `isPending` | No Zustand needed |

---

## Build Order (recommended)

1. **CI-1:** Make `cartCount` optional in `CustomerTopNav` (shared/CustomerTopNav.tsx) — one-line change, non-breaking.
2. **CI-2:** `ClientMainBottomNav` — 5 tabs, `usePathname()` for active state. Write unit test for active tab detection.
3. **CI-8 / CI-9:** Confirm + implement BE endpoints (cannot continue FE without API)
4. **CI-3:** `ProfileAvatarHeader` — show avatar placeholder + membership badge. Avatar upload is stubbed.
5. **CI-4:** `PersonalInfoForm` — RHF + Zod, 4 fields, inline validation messages
6. **CI-5:** `QuickNavGrid` + static `QuickNavCard` (no state; just `next/link`)
7. **CI-6:** `SaveCTABar` — receives `onSubmit` + `isLoading` from page
8. **CI-7:** Wire in `page.tsx` — add `ProfilePageSkeleton`, connect query + mutation

---

## Performance Checklist

- [ ] Pattern B: `<ProfilePageSkeleton />` defined before page ships
- [ ] TanStack Query `staleTime: 5 * 60 * 1000` on profile query — profile data does not change often
- [ ] `next/link` for all Zone D quick-nav cards — no `onClick` + `router.push()` combos
- [ ] Avatar image: `next/image` if real URL; placeholder if null
- [ ] No `useEffect` + `fetch` — all data via TanStack Query

---

## Cross-Page Notes

- **State shared with other pages:** `useSettingsStore.customerName` — updated here, read by Menu + Checkout for order pre-fill
- **Navigation from this page:** Zone D → `/(shop)/menu` · `/(shop)/favourites` · `/(shop)/history` · `/(shop)/reservation` (routes need confirmation)
- **Navigation to this page:** Zone F "Hồ Sơ" tab from any client page that uses `ClientBottomNav`

---

## Non-Obvious Implementation Notes

- **`form.reset(profile)` on data load** — call `form.reset()` inside a `useEffect` that fires when `profile` data becomes available. Without this, the form renders empty even when data exists.
- **New customer (404 response)** — handle `404` from `GET /api/v1/customer/profile` as a valid state (new user, no profile yet). Do not show an error page. Render empty form + change CTA label to "Tạo Hồ Sơ".
- **useSettingsStore.setCustomerName** — check if this action exists before adding. Current store shape: `{ tableLabel, customerName, guestToken }`. If no setter exists, add `setCustomerName: (name: string) => void` to the store.
- **Zone D cards: greyed vs orange** — the excalidraw uses orange border for Thực Đơn + Yêu Thích and grey for Lịch Sử + Đặt Bàn. This may indicate those 2 pages don't exist yet. Implement with a `highlighted?: boolean` prop on `QuickNavCard` and confirm with owner.
- **Bottom nav pb-safe** — add `pb-safe` (env(safe-area-inset-bottom)) to `ClientBottomNav` for iPhone notch support. This is easy to forget and causes content to sit behind the home indicator.

---
*Created: 2026-05-27*
