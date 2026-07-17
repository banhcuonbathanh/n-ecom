---
page: admin_staff_training
route: /admin/training/page.tsx
created: 2026-05-25
status: Draft
---

# Page: Admin — Staff Training
**Route:** `/admin/training/page.tsx`
**Version:** v1
**Status:** Draft

## Spec Summary

- Admin creates and manages job guide cards (title, cover image, YouTube URL, role, KPI targets); marks each required or optional
- Manager assigns guides to staff, tracks team progress via Completion Tracking table
- Staff views assigned guides, watches videos, and completes quizzes to mark progress
- Role filter tabs (All / Chef / Cashier / Staff / Manager) narrow the guide card grid
- Two modals: **Modal 1** — Create/Edit Job Guide form; **Modal 2** — per-staff Training Progress Detail with quiz attempt history and manager notes
- Edge cases: empty guide library (no guides created yet), staff with no assigned training

---

## 📐 Visual Wireframe

```text
┌─────────┬────────────────────────────────────────────────────────────────┐
│  [Nav]  │  [A] Page Header                              ← sticky top-0 z-20
│ Sidebar │  "Staff Training"  ·  subtitle                                  │
│ ────── │  "+ New Guide" ────────────────────────────────────────────────  │
│  📚    │────────────────────────────────────────────────────────────────  │
│Training │  [B] Role Filter Tabs               ← sticky top-[92px] z-10   │
│  📊    │  [ All ] [ Chef ] [ Cashier ] [ Staff ] [ Manager ]  4 guides   │
│Dashbrd │────────────────────────────────────────────────────────────────  │
│  👥    │  [C] Job Guide Cards (scrollable 2×2 grid)                       │
│ Staff  │  ┌──────────────────────────┐  ┌──────────────────────────┐      │
│  🍽   │  │ [IMG] 🟢 Chef            │  │ [IMG] 🔵 Cashier         │      │
│ Menu   │  │ Kỹ Thuật Làm Bánh Cuốn  │  │ Quy Trình Thu Ngân & POS │      │
│  🔲    │  │ description lines…       │  │ description lines…        │      │
│  QR   │  │ ▶ YouTube link           │  │ ▶ YouTube link            │      │
│  📈    │  │ 👤 Chef An, Chef Binh   │  │ 👤 Cashier Nam, Lan       │      │
│Reports │  │ Quality ≥95%  Qty 80/ca  │  │ Quality 0 sai  Qty 30/ca │      │
│  ⚙️   │  │        [View Progress →] │  │       [View Progress →]   │      │
│Setting │  └──────────────────────────┘  └──────────────────────────┘      │
│        │  ┌──────────────────────────┐  ┌──────────────────────────┐      │
│        │  │ [IMG] 🟣 Staff           │  │ [IMG] 🟠 Manager         │      │
│        │  │ Kỹ Năng Phục Vụ Bàn     │  │ Quản Lý Ca & Giám Sát    │      │
│        │  │ description lines…       │  │ description lines…        │      │
│        │  │ ▶ YouTube link           │  │ ▶ YouTube link            │      │
│        │  │ 👤 Staff Mai, Staff Hoa  │  │ 👤 Manager Thành          │      │
│        │  │ Quality ≥4.5★  Qty 20bàn │  │ Quality 0 s/c  Qty 100%   │      │
│        │  │        [View Progress →] │  │       [View Progress →]   │      │
│        │  └──────────────────────────┘  └──────────────────────────┘      │
│        │────────────────────────────────────────────────────────────────  │
│        │  [D] Completion Tracking                                          │
│        │  Title: "Completion Tracking — Kỹ Thuật Làm Bánh Cuốn"           │
│        │  Dropdown: [ Kỹ Thuật Làm Bánh Cuốn ▼ ]                         │
│        │  ┌────────────┬────────┬─────────┬────────────┬──────────┬──────┐│
│        │  │ Staff Name │  Role  │ Watched │ Quiz Passed│Last Act. │Status││
│        │  ├────────────┼────────┼─────────┼────────────┼──────────┼──────┤│
│        │  │ N.V. An    │ Chef   │  100%   │ ✓ Passed  │2026-05-20│  ✅  ││
│        │  │ T.T. Bình  │ Chef   │   75%   │ ✗ Failed  │2026-05-22│  🟡  ││
│        │  │ Lê Văn Nam │Cashier │   40%   │  — N/A    │2026-05-18│  🟡  ││
│        │  │ P.T. Mai   │ Staff  │    0%   │  — N/A    │    —     │  ⬜  ││
│        │  │ H.V. Minh  │ Chef   │  100%   │ ✓ Passed  │2026-05-21│  ✅  ││
│        │  └────────────┴────────┴─────────┴────────────┴──────────┴──────┘│
│        │  Showing 5 of 12 staff · 2 Completed · 2 In Progress · 1 Not Str│
│        │  Pagination: ← 1 2 3 →                                           │
└─────────┴────────────────────────────────────────────────────────────────┘

──── Modal 1 — Create / Edit Job Guide (dark overlay) ─────────────────────
┌──────────────────────────────────────────────────────────────────────┐
│  Create Job Guide                                             [✕]    │
│  Title *  [__________________________________________]               │
│  Role *   [ Select role...  ▼ ]                                      │
│  Description  [textarea]                                             │
│  Cover Image URL  [______________________________________]            │
│  YouTube URL      [______________________________________]            │
│  Quality KPI Target [________]   Quantity KPI Target [________]      │
│  Who Is Responsible *  [ Chef ×   Cashier ×   + Add role... ]        │
│  Published  [🟢 toggle ON]                                           │
│  ─────────────────────────────────────────────────────────────────  │
│                                           [Cancel]  [Save Guide]     │
└──────────────────────────────────────────────────────────────────────┘

──── Modal 2 — Staff Training Progress Detail (dark overlay) ──────────────
┌──────────────────────────────────────────────────────────────────────┐
│  Training Progress Detail                                     [✕]    │
│  Nguyễn Văn An  ·  Chef                                              │
│  Guide: Kỹ Thuật Làm Bánh Cuốn                                       │
│  ████████████░░░░░░░░  70% completed (orange progress bar)           │
│  Training Steps:                                                      │
│   ✓  Watch Video    — Done · 2026-05-18                              │
│   ✓  Take Quiz      — Attempted · 2026-05-22                         │
│   ○  Complete       — Pending — needs to pass quiz                   │
│  Quiz Attempts:                                                       │
│  ┌───────────┬────────────┬───────┬────────┐                         │
│  │ Attempt   │    Date    │ Score │ Result │                         │
│  ├───────────┼────────────┼───────┼────────┤                         │
│  │ Attempt 1 │ 2026-05-20 │  58%  │ Failed │                         │
│  │ Attempt 2 │ 2026-05-22 │  72%  │ Failed │                         │
│  └───────────┴────────────┴───────┴────────┘                         │
│  Needs ≥ 75% to pass · 1 attempt remaining                           │
│  Manager Notes: [Add coaching notes for this staff member...]        │
│  ─────────────────────────────────────────────────────────────────  │
│                                                             [Close]   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Zone Mapping

| Zone | Component | Visibility Condition | Sticky / Position |
|------|-----------|---------------------|-------------------|
| **Nav** | `AdminSidebar` | Always | `sticky top-0 left-0 h-screen z-30` |
| **A** | `TrainingPageHeader` | Always | `sticky top-0 z-20` |
| **B** | `RoleFilterTabs` | Always | `sticky top-[92px] z-10` |
| **C** | `JobGuideCardGrid` | Always (empty state when no guides) | Scrollable |
| **D** | `CompletionTrackingTable` | Always (below card grid) | Scrollable |
| **M1** | `CreateEditGuideModal` | When "+ New Guide" or edit icon clicked | `fixed inset-0 z-50` |
| **M2** | `TrainingProgressModal` | When "View Progress →" clicked | `fixed inset-0 z-50` |

---

## 📊 Data Sources & State Management

| Zone | Data Source | Update Mechanism | Query Key | Notes |
|------|-------------|------------------|-----------|-------|
| **Nav** | `authStore.user` | Zustand | N/A | Current user role controls nav visibility |
| **A** | Static | — | N/A | Title always "Staff Training"; "+ New Guide" → opens M1 |
| **B** | `trainingStore.activeRole` | Zustand (local filter) | N/A | Client-side filter; no API call on tab switch |
| **C** | `GET /api/v1/admin/training/guides` | TanStack Query | `['training', 'guides', activeRole]` | `staleTime: 5min`; filtered by `?role=` param |
| **D** | `GET /api/v1/admin/training/guides/:id/progress` | TanStack Query | `['training', 'progress', guideId]` | Paginated; refetch on guide dropdown change |
| **M1** | Form state (RHF + Zod) | Local | N/A | POST `/api/v1/admin/training/guides` or PATCH `/:id` |
| **M2** | `GET /api/v1/admin/training/staff/:staffId/progress/:guideId` | TanStack Query | `['training', 'staffProgress', staffId, guideId]` | On-demand; fetched when modal opens |

---

## 🧩 Component Specifications

| Zone | Component | File | Requirement | Props / Interface |
|------|-----------|------|-------------|-----------------|
| **Nav** | `AdminSidebar` | `components/shared/AdminSidebar.tsx` | Active item = Training | `activeItem: string` |
| **A** | `TrainingPageHeader` | `app/admin/training/page.tsx` (inline) | Show title + CTA | Inline |
| **B** | `RoleFilterTabs` | `components/admin/training/RoleFilterTabs.tsx` | 5 tabs + count badge | `RoleFilterTabsProps` |
| **C** | `JobGuideCardGrid` | `components/admin/training/JobGuideCardGrid.tsx` | 2-col grid; empty state | `JobGuideCardGridProps` |
| **C** | `JobGuideCard` | `components/admin/training/JobGuideCard.tsx` | Cover img, badge, KPIs, CTA | `JobGuideCardProps` |
| **D** | `CompletionTrackingTable` | `components/admin/training/CompletionTrackingTable.tsx` | Guide dropdown, paginated table | `CompletionTrackingTableProps` |
| **M1** | `CreateEditGuideModal` | `components/admin/training/CreateEditGuideModal.tsx` | RHF form, Zod validation | `CreateEditGuideModalProps` |
| **M2** | `TrainingProgressModal` | `components/admin/training/TrainingProgressModal.tsx` | Timeline, quiz attempts table, notes | `TrainingProgressModalProps` |

---

## 👨‍💻 Developer Implementation Details

### TypeScript Contracts

```typescript
// types/training.ts

export type StaffRole = 'Chef' | 'Cashier' | 'Staff' | 'Manager';

export interface JobGuide {
  id: string;               // UUID — NEVER number
  title: string;
  role: StaffRole;
  description: string;
  coverImageUrl: string;
  youtubeUrl: string;
  qualityKpiTarget: string; // e.g. "≥ 95% rating"
  quantityKpiTarget: string; // e.g. "≥ 80 bánh/ca"
  responsibleRoles: StaffRole[];
  published: boolean;
  createdAt: string;        // ISO 8601
  updatedAt: string;
}

export type TrainingStatus = 'Completed' | 'In Progress' | 'Not Started';

export interface StaffProgressRow {
  staffId: string;
  staffName: string;
  role: StaffRole;
  watchedPercent: number;   // 0–100
  quizPassed: boolean | null; // null = not attempted
  lastActivity: string | null; // ISO date or null
  status: TrainingStatus;
}

export interface QuizAttempt {
  attemptNumber: number;
  date: string;
  score: number; // 0–100
  passed: boolean;
}

export interface StaffProgressDetail {
  staffId: string;
  staffName: string;
  role: StaffRole;
  guideId: string;
  guideTitle: string;
  completionPercent: number;
  steps: {
    id: string;
    label: string;
    completed: boolean;
    completedAt: string | null;
    notes: string;
  }[];
  quizAttempts: QuizAttempt[];
  passThreshold: number; // e.g. 75
  attemptsRemaining: number;
  managerNotes: string;
}
```

### Query Configuration

```typescript
// hooks/useTrainingQueries.ts

export const useJobGuides = (role?: StaffRole) =>
  useQuery({
    queryKey: ['training', 'guides', role ?? 'all'],
    queryFn: () => fetchGuides(role),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

export const useGuideProgress = (guideId: string, page: number) =>
  useQuery({
    queryKey: ['training', 'progress', guideId, page],
    queryFn: () => fetchGuideProgress(guideId, page),
    staleTime: 2 * 60 * 1000,
    enabled: !!guideId,
  });

export const useStaffProgressDetail = (staffId: string, guideId: string, open: boolean) =>
  useQuery({
    queryKey: ['training', 'staffProgress', staffId, guideId],
    queryFn: () => fetchStaffProgressDetail(staffId, guideId),
    enabled: open && !!staffId && !!guideId,
  });
```

### Store Slice

```typescript
// store/trainingStore.ts

interface TrainingStore {
  activeRole: StaffRole | 'all';
  selectedGuideId: string;
  setActiveRole: (role: StaffRole | 'all') => void;
  setSelectedGuideId: (id: string) => void;
}
```

---

## ⚠️ Edge Cases & Fallbacks

| Scenario | Detection | Dev Action | UX Fallback |
|----------|-----------|------------|-------------|
| **No guides exist** | `guides.length === 0` | Show empty state component | "Chưa có hướng dẫn nào. Nhấn "+ New Guide" để bắt đầu." |
| **Staff has no assignment** | `progress rows = 0` | Show empty state in Zone D | "Chưa có nhân viên nào được giao hướng dẫn này." |
| **Cover image fails** | `onError` on `<img>` | Swap to placeholder | Gray rect + 📚 icon |
| **YouTube URL invalid** | Zod `.url()` in form | Block save, show error | "URL YouTube không hợp lệ" inline error |
| **Quiz score below threshold** | `score < passThreshold` | Show red Failed badge | "Cần ≥ X% để pass · N lần thử còn lại" |
| **No attempts remaining** | `attemptsRemaining === 0` | Disable retry; show manager note | "Đã hết lượt thi. Liên hệ quản lý để mở lại." |
| **Network offline** | `query.isError` | Show error banner | "Kết nối mạng yếu. Nhấn thử lại." |
| **No permission (non-admin tries to create)** | API returns 403 | Hide "+ New Guide" CTA | Button not rendered for Staff/Cashier roles |

---

## 🧪 Testing & QA Checklist

### Functional Tests
- [ ] **Zone B:** Clicking each tab filters Zone C cards correctly; count badge updates
- [ ] **Zone C:** Cards show correct role color badge (Chef=green, Cashier=blue, Staff=purple, Manager=orange)
- [ ] **Zone C:** "View Progress →" opens Modal 2 with correct staff+guide context
- [ ] **Zone C → M1:** "+ New Guide" opens Modal 1 with blank form; edit icon pre-fills form
- [ ] **Zone D:** Guide dropdown switches the completion table to the selected guide
- [ ] **Zone D:** Pagination works; "Showing X of Y" count is accurate
- [ ] **M1:** Form validation fires on submit (Title required, Role required, Responsible required)
- [ ] **M1:** Published toggle saves and reflects on card immediately (optimistic update)
- [ ] **M2:** Progress bar % matches `completionPercent` from API
- [ ] **M2:** Quiz attempt history shows all attempts with correct score and result
- [ ] **M2:** Manager Notes saves on blur (debounced PATCH)

### Edge Case Tests
- [ ] No guides → empty state shown in Zone C with CTA
- [ ] No staff assigned → empty state shown in Zone D
- [ ] Cover image 404 → placeholder shows
- [ ] Quiz with 0 attempts remaining → retry disabled, manager note visible
- [ ] Network offline → error banner in Zone C and Zone D

### Accessibility Tests
- [ ] All interactive elements have `min-h-[44px] min-w-[44px]`
- [ ] Modal focus trap: Tab cycles within modal; Esc closes
- [ ] Role filter tabs: keyboard arrow navigation
- [ ] Color badges have accessible labels (not color-only)

### Cross-Device Tests
- [ ] Desktop (1280px+) — 2-column card grid, full sidebar
- [ ] Tablet (768px) — 1-column card grid or condensed sidebar
- [ ] Mobile (375px) — collapsed sidebar (hamburger), single-column cards

---

## 📋 Task Rows

| ID | Owner | Task | Status | Draw Ref |
|----|-------|------|--------|----------|
| P-TRAINING-1 | FE | Wireframe + zone table | ✅ | wireframes/admin_main/admin_main_training/ |
| P-TRAINING-2 | FE | `RoleFilterTabs` component | ⬜ | Zone B |
| P-TRAINING-3 | FE | `JobGuideCard` + `JobGuideCardGrid` | ⬜ | Zone C |
| P-TRAINING-4 | FE | `CompletionTrackingTable` + pagination | ⬜ | Zone D |
| P-TRAINING-5 | FE | `CreateEditGuideModal` (RHF + Zod) | ⬜ | Modal 1 |
| P-TRAINING-6 | FE | `TrainingProgressModal` (timeline + quiz history) | ⬜ | Modal 2 |
| P-TRAINING-7 | FE | `app/admin/training/page.tsx` — assemble | ⬜ | All zones |

---

## 📝 Changelog

**v1 (2026-05-25)**
- Initial scaffold based on `admin-staff-training.excalidraw`
- 4 main zones (Nav, A, B, C, D) + 2 modals documented
- All TypeScript contracts, query hooks, and store slice defined

---

*Last Updated: 2026-05-25*
*Approved by: —*
*Next Review: After excalidraw zones confirmed and task rows added to MASTER_TASK.md*
