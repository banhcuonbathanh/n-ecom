---
page: client_info_page
route: /(shop)/profile
created: 2026-05-27
status: Draft
---

# Page: Thông Tin Khách Hàng
**Route:** `/(shop)/profile`
**Version:** v1
**Status:** Draft

## Spec Summary

- Mobile-first customer profile page (420px) — khách hàng xem và chỉnh sửa thông tin cá nhân
- Zone A: sticky top nav với nút ← quay lại, tiêu đề "Thông Tin Khách Hàng" — không có icon ⚙ (removed; no settings page defined)
- Zone B: avatar tròn với badge 📷 đổi ảnh, hiển thị tên và badge "✓ Thành viên"
- Zone C: form 4 trường — Họ và tên *, Số điện thoại *, Số nhà / Địa chỉ *, Email (optional) — RHF + Zod
- Zone D: 2×2 grid quick-nav cards linking to Thực Đơn · Yêu Thích · Lịch Sử Ăn · Đặt Bàn
- Zone E: CTA "💾 Lưu Thông Tin" — calls PUT /api/v1/customer/profile on submit
- Zone F: sticky bottom nav 5 tabs — Trang Chủ · Thực Đơn · Yêu Thích · Lịch Sử · Hồ Sơ (active, orange)

---

## 📐 Visual Wireframe

```
┌──────────────────────────────────────────────┐ ← sticky top-0 z-20
│  ←   Thông Tin Khách Hàng                    │  Zone A — ClientTopNav
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│                                              │
│             ┌────────────┐                  │
│             │  👤   📷  │ ← camera badge    │  Zone B — ProfileAvatarHeader
│             └────────────┘                  │
│              Nguyễn Văn A                    │
│           ╔════════════════╗                 │
│           ║  ✓ Thành viên  ║  (green badge)  │
│           ╚════════════════╝                 │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  Họ và tên *                                 │
│ ┌──────────────────────────────────────────┐ │
│ │ Nguyễn Văn A                             │ │  Zone C — PersonalInfoForm
│ └──────────────────────────────────────────┘ │
│  Số điện thoại (SDT) *                       │
│ ┌──────────────────────────────────────────┐ │
│ │ 0912 345 678                             │ │  ← orange border (focused state)
│ └──────────────────────────────────────────┘ │
│  Số nhà / Địa chỉ *                          │
│ ┌──────────────────────────────────────────┐ │
│ │ 123 Đường Lê Lợi, Q.1, TP.HCM           │ │
│ └──────────────────────────────────────────┘ │
│  Email                                        │
│ ┌──────────────────────────────────────────┐ │
│ │ nguyenvana@email.com                     │ │  ← muted color (optional field)
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  Khám phá thêm                               │
│ ┌─────────────────┐  ┌─────────────────┐     │
│ │ 🍽️ Thực Đơn   → │  │ ❤️ Yêu Thích  → │     │  Zone D — QuickNavGrid
│ │ Xem & đặt món   │  │ Món đã lưu      │     │  (2×2 grid, orange border on
│ └─────────────────┘  └─────────────────┘     │   Thực Đơn + Yêu Thích)
│ ┌─────────────────┐  ┌─────────────────┐     │
│ │ 📋 Lịch Sử Ăn → │  │ 🏠 Đặt Bàn    → │     │  (grey border on
│ │ Các lần ghé thăm│  │ Đặt bàn về nhà  │     │   Lịch Sử + Đặt Bàn)
│ └─────────────────┘  └─────────────────┘     │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────┐ │  Zone E — SaveCTABar
│ │          💾  Lưu Thông Tin               │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐ ← sticky bottom-0 z-10
│   🏠        🍽️      ❤️       📋      👤     │  Zone F — ClientBottomNav
│  Trang     Thực    Yêu     Lịch    Hồ Sơ    │  (Hồ Sơ = orange, active)
│  Chủ       Đơn    Thích    Sử               │
└──────────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| A | `ClientTopNav` | Always visible | `sticky top-0 z-20` |
| B | `ProfileAvatarHeader` | Always visible | Static |
| C | `PersonalInfoForm` | Always visible | Static, scrollable |
| D | `QuickNavGrid` | Always visible | Static |
| E | `SaveCTABar` | Always visible | Static |
| F | `ClientBottomNav` | Always visible | `sticky bottom-0 z-10` |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| B | TanStack Query → `GET /api/v1/customer/profile` | Invalidate on save mutation | `['customer', 'profile']` | Displays name + isMember flag |
| C | TanStack Query → `GET /api/v1/customer/profile` | Pre-populate form via `reset()` after data loads | `['customer', 'profile']` | Same query as Zone B; form managed by RHF |
| C | RHF + Zod (form state) | Local — `useForm<UpdateProfileForm>` | N/A | PUT mutation on submit |
| D | Static / router links | N/A | N/A | No API call; `next/link` navigation only |
| E | Form submit trigger | Calls `PUT /api/v1/customer/profile` | Invalidates `['customer', 'profile']` | Also syncs `useSettingsStore.customerName` on success |
| F | `useSettingsStore` (activeTab) | Zustand | N/A | Highlights "Hồ Sơ" tab |

---

## 🧩 Component Specifications

> Read `docs/fe/wireframes/shared/_INDEX_SHARING_COMPONENT.md` before editing this table.

| Zone | Component | Reuse? | File | Props / Interface |
|------|-----------|--------|------|-----------------|
| A | `CustomerTopNav` | ✅ reuse | `components/shared/CustomerTopNav.tsx` | `title: string · cartCount?: number · onBack: () => void` — note: `cartCount` must be made optional; no cart on profile page |
| B | `ProfileAvatarHeader` | new (local) | `app/(shop)/profile/components/ProfileAvatarHeader.tsx` | `name: string · isMember: boolean · onAvatarChange?: () => void` |
| B | `Badge` | ✅ reuse | `components/ui/badge.tsx` | `variant="success"` — "✓ Thành viên" |
| C | `PersonalInfoForm` | new (local) | `app/(shop)/profile/components/PersonalInfoForm.tsx` | `defaultValues: UpdateProfileForm · onSubmit: (data) => void · isLoading: boolean` |
| C | `Input` | ✅ reuse | `components/ui/input.tsx` | Standard text input |
| C | `Label` | ✅ reuse | `components/ui/label.tsx` | Field labels |
| D | `QuickNavGrid` | new (local) | `app/(shop)/profile/components/QuickNavGrid.tsx` | `cards: QuickNavCardData[]` |
| E | `SaveCTABar` | new (local) | `app/(shop)/profile/components/SaveCTABar.tsx` | `isLoading: boolean · disabled: boolean` |
| E | `Button` | ✅ reuse | `components/ui/button.tsx` | `variant="default" size="lg"` — full width |
| F | `ClientMainBottomNav` | new (shared) | `components/shared/ClientMainBottomNav.tsx` | none — derives `activeTab` from `usePathname()` internally |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
// Customer profile shape from API
interface CustomerProfile {
  id: string
  name: string
  phone: string
  address: string
  email?: string
  isMember: boolean
  memberSince?: string      // ISO date string
  avatarUrl?: string
}

// Form values (Zod schema target)
interface UpdateProfileForm {
  name: string
  phone: string
  address: string
  email?: string
}

// Quick-nav card data
interface QuickNavCardData {
  icon: string
  title: string
  subtitle: string
  href: string
  highlighted?: boolean     // orange border vs grey border
}

// Bottom nav tab type
type ClientTab = 'home' | 'menu' | 'favourites' | 'history' | 'profile'
```

### Zod Validation Schema

```typescript
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)'),
  address: z.string().min(5, 'Địa chỉ quá ngắn'),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
})
```

### Query Configuration

```typescript
// Fetch profile
const { data, isLoading } = useQuery({
  queryKey: ['customer', 'profile'],
  queryFn: () => apiClient.get<CustomerProfile>('/api/v1/customer/profile'),
  staleTime: 5 * 60 * 1000,   // 5 min — profile changes rarely
})

// Update profile
const { mutate, isPending } = useMutation({
  mutationFn: (data: UpdateProfileForm) =>
    apiClient.put('/api/v1/customer/profile', data),
  onSuccess: (result) => {
    queryClient.invalidateQueries({ queryKey: ['customer', 'profile'] })
    useSettingsStore.getState().setCustomerName(result.name)  // sync store
    toast.success('Đã lưu thông tin!')
  },
})
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| Profile API returns 401 | HTTP 401 | Redirect to `/login` or re-auth flow | Toast "Phiên đăng nhập hết hạn" |
| Profile not found (404) | HTTP 404 | Show empty form (new profile flow) | Form pre-fills empty, CTA = "Tạo hồ sơ" |
| Network offline during save | Mutation error | Show error toast | "Không thể lưu — kiểm tra kết nối" |
| Phone number invalid format | Zod validation | Inline field error | "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)" |
| Empty required field on submit | Zod validation | Inline field error, prevent submit | Highlight field red |
| Avatar upload fails | Upload error | Silent fallback to current avatar | Keep existing avatar, no crash |
| Profile loads slow (>1s) | `isLoading: true` | Show `<ProfilePageSkeleton />` | Skeleton shimmer for all zones |
| Duplicate phone on save | HTTP 409 from BE | Show inline error on phone field | "Số điện thoại đã được đăng ký" |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] Zone A: ← button navigates back to previous page
- [ ] Zone B: avatar circle renders with 📷 badge; placeholder shown if no avatar
- [ ] Zone B: "✓ Thành viên" badge visible when `isMember === true`; hidden when false
- [ ] Zone C: form pre-populates with API data on load
- [ ] Zone C: Zod validation fires on submit — required fields block submit
- [ ] Zone C: phone regex rejects non-10-digit and non-0-prefix numbers
- [ ] Zone E: "Lưu Thông Tin" button calls PUT mutation on valid submit
- [ ] Zone E: button shows loading state during mutation
- [ ] Zone D: all 4 quick-nav cards navigate to correct routes
- [ ] Zone F: "Hồ Sơ" tab highlighted orange; other tabs grey

### Edge Case Tests
- [ ] Offline — save mutation shows error toast, no crash
- [ ] 401 response — redirect to login
- [ ] Empty profile (new user) — form renders blank without error
- [ ] Long name/address — text truncates gracefully within input

### Accessibility Tests
- [ ] All inputs have associated `<Label>` (for + id)
- [ ] Save button `min-h-[48px]` touch target
- [ ] Bottom nav tabs each `min-w-[44px]`
- [ ] Focus ring visible on all interactive elements
- [ ] Error messages linked to inputs via `aria-describedby`

### Cross-Device Tests
- [ ] Mobile viewport (375px) — no horizontal overflow
- [ ] Tablet viewport (768px) — max-width container centered
- [ ] No layout shift when keyboard opens on mobile

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| CI-1 | FE | Create `ClientTopNav` shared component | ⬜ | wireframes/client_info_page/client_info_page_wireframe_v1.md Zone A |
| CI-2 | FE | Create `ClientBottomNav` shared component | ⬜ | wireframes/client_info_page/client_info_page_wireframe_v1.md Zone F |
| CI-3 | FE | Build `ProfileAvatarHeader` (Zone B) | ⬜ | wireframes/client_info_page/client_info_page_wireframe_v1.md Zone B |
| CI-4 | FE | Build `PersonalInfoForm` with RHF + Zod (Zone C) | ⬜ | wireframes/client_info_page/client_info_page_wireframe_v1.md Zone C |
| CI-5 | FE | Build `QuickNavGrid` + `QuickNavCard` (Zone D) | ⬜ | wireframes/client_info_page/client_info_page_wireframe_v1.md Zone D |
| CI-6 | FE | Build `SaveCTABar` + wire mutation (Zone E) | ⬜ | wireframes/client_info_page/client_info_page_wireframe_v1.md Zone E |
| CI-7 | FE | Wire all zones into `page.tsx` + skeleton | ⬜ | wireframes/client_info_page/client_info_page_wireframe_v1.md |
| CI-8 | BE | Implement `GET /api/v1/customer/profile` | ⬜ | — |
| CI-9 | BE | Implement `PUT /api/v1/customer/profile` | ⬜ | — |

---

## 📝 Changelog

**v1 (2026-05-27)**
- Initial scaffold based on `client_info.excalidraw`
- Zones A–F documented: ClientTopNav · ProfileAvatarHeader · PersonalInfoForm · QuickNavGrid · SaveCTABar · ClientBottomNav
- ⚙ icon removed from Zone A (no settings page defined — see conccern.md)
- Backend API assumed at `GET/PUT /api/v1/customer/profile` (not yet in API contract — flagged)

---

*Last Updated: 2026-05-27*
*Approved by: —*
*Next Review: After customer profile API endpoints confirmed with backend*
