## Technical Architecture — Admin — Staff Training

### Page Structure
- **Zones:** Nav sidebar (sticky) + A (Page Header, sticky) + B (Role Filter Tabs, sticky) + C (Job Guide Card Grid, scrollable) + D (Completion Tracking Table, scrollable)
- **Modals:** M1 — Create/Edit Job Guide; M2 — Staff Training Progress Detail
- **Device target:** Desktop-first (responsive down to 768px tablet; sidebar collapses on mobile)
- **Conditional rendering:** "+ New Guide" button and card edit/delete actions — hidden for non-Admin/Manager roles (RBAC check on render, not just API)
- **Scrollable area:** Zone C + Zone D; Zone Nav/A/B are sticky

### Tech Stack

```
React (Next.js 14 App Router)
├── State: Zustand (trainingStore: activeRole, selectedGuideId)
├── Data: TanStack Query
│   ├── ['training', 'guides', role]            ← Zone C
│   ├── ['training', 'progress', guideId, page] ← Zone D
│   └── ['training', 'staffProgress', staffId, guideId] ← Modal 2
├── Forms: React Hook Form + Zod              ← Modal 1
├── Styling: Tailwind CSS (desktop 2-col grid, tablet 1-col)
└── Types: TypeScript strict — interfaces in types/training.ts
```

### Key Implementation Patterns

**1. Component Architecture**

```
app/admin/training/
├── page.tsx                      ← assembles all zones; wraps with providers
└── components/
    └── (co-located or in src/components/admin/training/)
        ├── RoleFilterTabs.tsx
        ├── JobGuideCardGrid.tsx
        ├── JobGuideCard.tsx
        ├── CompletionTrackingTable.tsx
        ├── CreateEditGuideModal.tsx
        └── TrainingProgressModal.tsx
```

Shared components to reuse (check before building):
- `components/shared/AdminSidebar.tsx` — navigation sidebar
- `components/shared/EmptyState.tsx` — empty guide list / empty progress table
- `components/shared/ErrorBanner.tsx` — network error states
- `components/shared/Skeleton.tsx` — loading placeholders for cards and table rows
- `components/ui/Modal.tsx` — base modal wrapper (focus trap, overlay, Esc close)

**2. State Management**

```typescript
// store/trainingStore.ts
interface TrainingStore {
  activeRole: 'all' | 'Chef' | 'Cashier' | 'Staff' | 'Manager';
  selectedGuideId: string;           // for Zone D dropdown
  setActiveRole: (role) => void;
  setSelectedGuideId: (id) => void;
}
// NOTE: Do NOT persist to localStorage — these are page-session UI states only
```

Role filter state lives in Zustand (not URL params) because the filter is ephemeral and does not need to survive page refresh or sharing.

**3. Data Fetching Strategy**

```typescript
// Zone C — guide cards
queryKey: ['training', 'guides', activeRole]
staleTime: 5 * 60 * 1000  // 5 min — guides change infrequently

// Zone D — completion table (paginated)
queryKey: ['training', 'progress', guideId, page]
staleTime: 2 * 60 * 1000  // 2 min — progress changes more often

// Modal 2 — per-staff progress detail
queryKey: ['training', 'staffProgress', staffId, guideId]
enabled: modalOpen && !!staffId && !!guideId  // fetch only when modal opens
staleTime: 30 * 1000  // 30s — fresh data needed when reviewing a specific staff member
```

**4. Form Handling (Modal 1)**

```typescript
// Zod schema for Create/Edit Guide form
const guideSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  role: z.enum(['Chef', 'Cashier', 'Staff', 'Manager']),
  description: z.string().optional(),
  coverImageUrl: z.string().url('URL ảnh không hợp lệ').optional().or(z.literal('')),
  youtubeUrl: z.string().url('URL YouTube không hợp lệ').optional().or(z.literal('')),
  qualityKpiTarget: z.string().optional(),
  quantityKpiTarget: z.string().optional(),
  responsibleRoles: z.array(z.enum(['Chef', 'Cashier', 'Staff', 'Manager'])).min(1, 'Chọn ít nhất 1 vai trò'),
  published: z.boolean(),
});
```

On save: `POST /api/v1/admin/training/guides` (create) or `PATCH /api/v1/admin/training/guides/:id` (edit). Invalidate `['training', 'guides']` query on success.

**5. Performance**

- Card images: use `next/image` with `width={120} height={196}` — never raw `<img>`
- Zone D table: if staff count > 50 rows per page, consider `react-window` for virtualization
- Modal 2 quiz attempt table: always small (< 10 rows) — no virtualization needed
- Manager Notes field in Modal 2: debounced PATCH (500ms) on textarea blur — avoid chatty saves

**6. Edge Case Handling**

- Empty guide list: `JobGuideCardGrid` checks `guides.length === 0` → renders `EmptyState` with CTA to open Modal 1
- Empty completion table: `CompletionTrackingTable` checks `rows.length === 0` → renders "Chưa có nhân viên nào được giao hướng dẫn này."
- Image error: `onError` on each card's `<Image>` → swap `src` to `/placeholder-training.svg`
- Role color coding: derive from `role` field using a `ROLE_COLOR_MAP` constant — not hardcoded in each component

```typescript
const ROLE_COLOR_MAP: Record<StaffRole, { badge: string; text: string }> = {
  Chef:    { badge: 'border-green-600 bg-green-50',   text: 'text-green-700' },
  Cashier: { badge: 'border-blue-500 bg-blue-50',     text: 'text-blue-700'  },
  Staff:   { badge: 'border-purple-500 bg-purple-50', text: 'text-purple-700'},
  Manager: { badge: 'border-orange-500 bg-orange-50', text: 'text-orange-700'},
};
```

### File Organization

```
src/
├── app/admin/training/
│   └── page.tsx
├── components/admin/training/
│   ├── RoleFilterTabs.tsx
│   ├── JobGuideCardGrid.tsx
│   ├── JobGuideCard.tsx
│   ├── CompletionTrackingTable.tsx
│   ├── CreateEditGuideModal.tsx
│   └── TrainingProgressModal.tsx
├── hooks/
│   └── useTrainingQueries.ts      ← shared query hooks (NOT in page folder)
├── store/
│   └── trainingStore.ts           ← Zustand slice (NOT in page folder)
└── types/
    └── training.ts                ← all Training interfaces
```

### Critical Implementation Notes

- **UUID only** — `JobGuide.id` and all entity IDs must be `string` UUIDs. Never use numeric IDs in the UI.
- **RBAC on "+ New Guide"** — Read `authStore.user.role`; only render the button if role is `admin` or `manager`. Do not rely solely on API 403 responses for UI hiding.
- **Quiz pass threshold** — The threshold (e.g. 75%) comes from the API (`passThreshold` field on the guide), not hardcoded in the frontend.
- **Attempts remaining** — Display and disable retry button based on `attemptsRemaining` from the progress API. Never compute this client-side.
- **Published toggle** — Use optimistic update: flip locally, then PATCH. Revert if PATCH fails.
- **Tab filter is client-side** — `RoleFilterTabs` filters the already-fetched `guides` array via `trainingStore.activeRole`. Do NOT fire a new API call on each tab click.
