## Technical Architecture — Thông Tin Khách Hàng (`/(shop)/profile`)

### Page Structure
- Zones: A (sticky top nav) · B (avatar header) · C (personal info form) · D (quick-nav grid) · E (save CTA) · F (sticky bottom nav)
- Device target: Mobile (375–420px)
- Sticky zones: A (top-0, z-20) · F (bottom-0, z-10)
- Modals: None
- Scrollable area: B · C · D · E (between Zone A and Zone F)

---

### RBAC & Auth Rules

| Rule | Value |
|------|-------|
| **Route protection** | Customer JWT required (customer auth guard) |
| **Allowed roles** | `customer` (registered account, not guest) |
| **Auth state used** | Customer JWT in localStorage / httpOnly cookie |
| **Conditional UI by role** | Badge "✓ Thành viên" shown only when `isMember === true` |
| **Unauthorized redirect** | Unauthenticated → `/login` or QR entry flow |

> ⚠️ **Open question:** The current system uses stateless guest JWT (sub='guest', no DB). If customers are guest-only, `GET /api/v1/customer/profile` cannot return user-specific data. A registered customer account system must exist for this page to work. See `conccern.md`.

---

### Tech Stack

```
React (Next.js 14 App Router)
├── Pattern: B — Full Client ('use client' on page root)
├── State: TanStack Query (['customer', 'profile']) + useSettingsStore (sync on save)
├── Forms: RHF + Zod (Zone C only)
├── Styling: Tailwind CSS (mobile-first, max-w-[420px] centered)
└── Types: TypeScript strict — CustomerProfile · UpdateProfileForm · ClientTab
```

---

### Key Implementation Patterns

**1. Component Architecture**

```
app/(shop)/profile/
├── page.tsx                    ← 'use client'; owns query + mutation + skeleton
└── components/
    ├── ProfileAvatarHeader.tsx ← Zone B (local)
    ├── PersonalInfoForm.tsx    ← Zone C (local); owns RHF useForm
    ├── QuickNavGrid.tsx        ← Zone D (local); static card list
    └── SaveCTABar.tsx          ← Zone E (local); receives onSubmit from page

src/
├── components/shared/
│   ├── CustomerTopNav.tsx      ← Zone A (shared — existing; make cartCount optional)
│   └── ClientMainBottomNav.tsx ← Zone F (shared — new Tier 2; 5-tab main nav)
└── hooks/
    └── useCustomerProfile.ts   ← query + mutation hooks
```

**2. State Management**

```typescript
// TanStack Query — server cache
const { data: profile, isLoading } = useQuery({
  queryKey: ['customer', 'profile'],
  staleTime: 5 * 60 * 1000,
})

// RHF — local form state (Zone C only)
const form = useForm<UpdateProfileForm>({
  resolver: zodResolver(updateProfileSchema),
  defaultValues: { name: '', phone: '', address: '', email: '' },
})

// Sync after save
useEffect(() => {
  if (profile) form.reset(profile)
}, [profile])
```

**3. Data Fetching**

- `GET /api/v1/customer/profile` — fetch on mount; `staleTime: 5 min`
- `PUT /api/v1/customer/profile` — mutation on form submit
- On mutation success: invalidate `['customer', 'profile']` + sync `useSettingsStore.setCustomerName(name)`

**4. Performance**

- Pattern B (full client) — skeleton required on first paint
- No prefetch possible (user-specific data)
- Zone D (quick-nav) is static — no query, no loading state

**5. Edge Case Handling**

- 401 → redirect to login
- 404 (new user) → form renders empty; CTA label changes to "Tạo hồ sơ"
- Mutation error → toast error, form stays open
- Slow load → `<ProfilePageSkeleton />` covers all zones B–E

---

### Rendering Strategy

| Layer | What | Why |
|---|---|---|
| **ISR** | None | Profile is user-specific — cannot cache across users |
| **RSC** | `page.tsx` shell only (no prefetchQuery) | No shared server data to prefetch |
| **Client** (`'use client'`) | Zones A · B · C · D · E · F | All zones need Zustand / localStorage / user interaction |

> **Pattern B — Full Client.** `<ProfilePageSkeleton />` is required — blank screen without it.
> Register this page in `docs/fe/wireframes/shared/_INDEX_RENDERING_STRATEGY.md` after implementing.

---

### File Organization

```
src/
├── app/
│   └── (shop)/
│       └── profile/
│           ├── page.tsx                    ← 'use client', owns query/mutation/skeleton
│           └── components/
│               ├── ProfileAvatarHeader.tsx
│               ├── PersonalInfoForm.tsx
│               ├── QuickNavGrid.tsx
│               ├── SaveCTABar.tsx
│               └── ProfilePageSkeleton.tsx ← required for Pattern B
├── components/
│   ├── shared/
│   │   ├── ClientTopNav.tsx               ← new (shared) — used by all client sub-pages
│   │   └── ClientBottomNav.tsx            ← new (shared) — used by all 5 bottom-nav pages
│   └── ui/
│       ├── button.tsx                     ← existing
│       ├── input.tsx                      ← existing
│       ├── label.tsx                      ← existing
│       └── badge.tsx                      ← existing
└── hooks/
    └── useCustomerProfile.ts              ← query + mutation hooks (shared)
```

---

### State Contract

| Store | Reads | Writes | Lifecycle | Next Page |
|-------|-------|--------|-----------|-----------|
| `useSettingsStore` | `customerName` | `setCustomerName(name)` after save | Persists across session | Menu · Checkout — pre-fills order customer_name |
| `['customer', 'profile']` (TanStack) | Full profile on load | Invalidated on mutation | 5 min staleTime | None — dead end for data |

---

### Critical Implementation Notes

- **Pattern B requires skeleton** — `<ProfilePageSkeleton />` must be defined before shipping. Without it: blank white screen on every cold visit.
- **useSettingsStore sync** — after successful PUT, call `useSettingsStore.getState().setCustomerName(result.name)`. This ensures the Menu page's cart order uses the updated name without a separate fetch.
- **Phone format** — Vietnamese mobile: 10 digits, starts with `0`. Regex: `/^0\d{9}$/`. Do not accept `+84` prefix (normalise before save if needed).
- **Email is optional** — Zod: `.optional().or(z.literal(''))`. Empty string must not throw.
- **Avatar upload** — 📷 badge tap is stubbed in v1. Avatar upload API is not defined yet. Render camera badge as non-interactive until the endpoint exists (see `conccern.md`).
- **ClientBottomNav active tab** — derives active tab from `usePathname()`. Do not pass it as a prop from page.tsx — the component resolves it internally to avoid prop drilling.
