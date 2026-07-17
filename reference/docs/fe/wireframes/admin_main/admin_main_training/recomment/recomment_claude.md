# Claude Guidelines — Admin — Staff Training

> Read this before implementing `/admin/training/page.tsx`.
> Covers: spec non-obvious points, shared component reuse, state strategy, performance, and what NOT to build without clarification.

---

## Spec Summary

- Admin creates/edits job guides (title, cover, YouTube, KPIs, role, responsible roles, published flag); marks each required or optional
- Manager assigns guides to staff, tracks per-guide completion via Zone D table
- Staff views assigned guides, watches video, completes quiz; progress stored server-side
- Role filter tabs (All / Chef / Cashier / Staff / Manager) are **client-side filters** on already-fetched data — no extra API call per tab
- Modals: M1 (Create/Edit guide form) and M2 (per-staff progress detail with quiz history + manager notes)
- **Key constraint:** "Required vs. Optional" flag and "Quiz Builder" scope are **NOT yet resolved** — do not implement these until `conccern.md` open questions are answered by the owner

---

## Shared Components — Reuse Checklist

Before building any new component, check these first:

| Component needed | Reuse from | Notes |
|------------------|-----------|-------|
| Page header with CTA | `components/shared/PageHeader.tsx` | Pass `title="Staff Training"` and a `cta` button slot |
| Error banner | `components/shared/ErrorBanner.tsx` | Network error in Zone C / Zone D |
| Empty state | `components/shared/EmptyState.tsx` | Pass `icon`, `message`, `cta` — for empty guide list and empty tracking table |
| Loading skeleton | `components/shared/Skeleton.tsx` | Match card dimensions (120×196 image + text lines) and table row height |
| Modal wrapper | `components/ui/Modal.tsx` | Base modal with focus trap, Esc close, overlay — reuse for both M1 and M2 |
| Admin sidebar | `components/shared/AdminSidebar.tsx` | Pass `activeItem="training"` prop |
| Role badge chip | Build new: `RoleBadge.tsx` | Shared between `JobGuideCard` and `CompletionTrackingTable` — extract early |

---

## State Strategy

| Data type | Where it lives | Why |
|-----------|---------------|-----|
| Guide list (Zone C) | TanStack Query `['training', 'guides', activeRole]` | Server data, cache for 5 min |
| Completion table (Zone D) | TanStack Query `['training', 'progress', guideId, page]` | Server data, paginated, 2 min stale |
| Staff progress detail (M2) | TanStack Query `['training', 'staffProgress', staffId, guideId]` | On-demand; `enabled: modalOpen` |
| Active role filter (Zone B) | Zustand `trainingStore.activeRole` | Page-session UI state — no persistence needed |
| Selected guide in Zone D | Zustand `trainingStore.selectedGuideId` | Initialized to first guide's ID on load |
| Modal open state | `useState` inside `page.tsx` | Local; never shared outside this page |
| Create/Edit form data | React Hook Form (local) | Form state belongs inside `CreateEditGuideModal` |
| Manager Notes (M2) | TanStack Mutation (debounced PATCH) | Write through; no Zustand needed |

**Do NOT use Zustand for:** server data, form state, modal content. Zustand is for UI state that must be read by multiple components (the role filter affects both Zone B and Zone C — that's why it's in the store).

---

## Performance Checklist

- [ ] Code split: `app/admin/training/` loads its own bundle via Next.js App Router automatic splitting
- [ ] Images: `next/image` with fixed `width={120} height={196}` on all card cover images — never `<img>`
- [ ] Zone C cards: if guide count > 20, add pagination or infinite scroll (unlikely for this app, but plan for it)
- [ ] Zone D table: if staff count > 50 per page, use `react-window` for virtualization
- [ ] Modal 2 fetch: `enabled: open && !!staffId` — never prefetch progress detail; only fetch when modal opens
- [ ] Manager Notes: debounce PATCH by 500ms on textarea `onChange` — do not fire a request on every keystroke
- [ ] Published toggle: optimistic update (flip immediately, revert on API error)

---

## Cross-Page Notes

- State shared with other pages: `authStore.user.role` (read-only here — determines "+ New Guide" visibility)
- Navigation **from** this page: opens M1 and M2 inline (no route change); "View Progress →" stays on page
- Navigation **to** this page: via Admin Sidebar "📚 Training" link; also reachable from Staff Management page (if assignment is done there)
- Zone D "Showing 5 of 12 staff" — staff list comes from `GET /api/v1/admin/training/guides/:id/progress`, not from the Staff Management list; they may differ if not all staff are assigned

---

## Non-Obvious Implementation Notes

- **Tab filter is NOT a query param.** `RoleFilterTabs` reads `trainingStore.activeRole` and passes it to a `.filter()` on the `guides` array returned by TanStack Query. No URL change, no new API call. This is intentional — the guide list is small (< 50 items) and does not need server-side filtering per tab.

- **`JobGuideCard` must not know about the Zustand store.** It receives `guide: JobGuide` and an `onViewProgress: (guideId: string) => void` callback. The parent (`JobGuideCardGrid` or `page.tsx`) handles the store interaction. Keep `JobGuideCard` a pure presentational component.

- **`RoleBadge` component is used in 3 places:** Zone B tabs (active style), Zone C card role chip, and Zone D table role column. Extract it early to `components/admin/training/RoleBadge.tsx` with a `ROLE_COLOR_MAP` constant — do not duplicate the color logic.

- **Modal 2 opens with context**, not a URL route. `page.tsx` holds `useState<{ staffId: string; guideId: string } | null>(null)`. Pass this as props to `TrainingProgressModal`. The modal fetches its own data internally using `useStaffProgressDetail(staffId, guideId, open)`.

- **Manager Notes save must be silent (no toast on every autosave).** Only show a success toast if the user explicitly clicks a "Save" button (if one exists). Debounced autosave should not interrupt the user's reading flow.

- **Do not render the "+ New Guide" button for Staff or Cashier roles.** Check `authStore.user.role` in `page.tsx` and conditionally render the CTA. The API will reject unauthorized POSTs anyway, but hiding the button is the correct UX pattern — not a security control.

- **Zone D dropdown initialization:** On first render, `selectedGuideId` should default to the first guide in the list returned by `['training', 'guides', 'all']`. Use `useEffect` to set it once the guide list resolves. Handle the case where the guide list is empty — Zone D should show its own empty state rather than crashing.

- **Quiz pass threshold (≥ 75%)** comes from the API — `guide.passThreshold`. Never hardcode this value in the frontend. Display it in Modal 2 as "Needs ≥ {guide.passThreshold}% to pass".

---

## Implementation Order (Suggested)

1. `types/training.ts` — define all interfaces first
2. `hooks/useTrainingQueries.ts` — set up query hooks
3. `store/trainingStore.ts` — minimal Zustand slice
4. `RoleBadge.tsx` — shared component, used everywhere
5. `JobGuideCard.tsx` + `JobGuideCardGrid.tsx` — core content zone
6. `RoleFilterTabs.tsx` — depends on `trainingStore`
7. `CompletionTrackingTable.tsx` — depends on `selectedGuideId` from store
8. `CreateEditGuideModal.tsx` — form with validation
9. `TrainingProgressModal.tsx` — complex modal; build last
10. `page.tsx` — assemble all zones

---

*Created: 2026-05-25*
