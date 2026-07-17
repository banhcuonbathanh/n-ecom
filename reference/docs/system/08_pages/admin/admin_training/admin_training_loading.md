# Staff Training — Loading Behaviour

> **TL;DR:** ✅ implemented. How `/admin/training` behaves while data is in flight. **No route-level
> `loading.tsx`** (the folder holds only `page.tsx`) — all loading is per-query inside the client
> page. The guide list drives a 4-card skeleton; Zone D + Modal 2 have their own spinners but their
> only reachable terminal state is **empty/404** (no progress data ever exists — Bug 1). Source:
> `fe/src/app/(dashboard)/admin/training/page.tsx` · `JobGuideCardGrid.tsx` ·
> `CompletionTrackingTable.tsx` · `TrainingProgressModal.tsx` · `useTrainingQueries.ts`. Page →
> [admin_training.md](admin_training.md) · BE → [admin_training_be.md](admin_training_be.md).

---

## Loading Layers (outer → inner)

1. **Route-level spinner — none.** `fe/src/app/(dashboard)/admin/training/` contains only
   `page.tsx`; there is no `loading.tsx`, so Next.js shows no route Suspense fallback for this
   segment. The admin shell (`(dashboard)/admin/layout.tsx`) renders immediately; its `AuthGuard`/
   `RoleGuard` may briefly gate before the JWT/role resolves (owned by the guards, not this page).
2. **Page is `'use client'`** (`page.tsx:1`) — no server-component Suspense boundary here. The
   first paint is the static header (Zone A) + tabs (Zone B), then content fills in per query.
3. **Lazy modal chunks** — both modals are `next/dynamic` imports (`page.tsx:8-13`), so the first
   open of Modal 1 / Modal 2 incurs a one-time chunk fetch (no custom `loading` fallback given →
   nothing renders until the chunk arrives, typically imperceptible).
4. **Per-query states** (the real loading layer):
   - `useJobGuides(activeRole)` → `{ isLoading, isError }` (`page.tsx:31`).
   - `useGuideProgress(guideId,page)` inside Zone D (`CompletionTrackingTable.tsx:29`).
   - `useStaffProgressDetail(staffId,guideId,open)` inside Modal 2 (`page.tsx:36-40`).

---

## Main content branch (priority order)

The page region renders in this order:

1. **`isError` (guide list)** → full-width retry panel "Kết nối mạng yếu. Nhấn thử lại." + a
   `window.location.reload()` button (`page.tsx:69-83`). This short-circuits the whole page.
2. **`isLoading` (guide list)** → `JobGuideCardGrid` renders a **4-card pulse skeleton**
   (`JobGuideCardGrid.tsx:22-29`): four `h-72 animate-pulse` placeholders in the 2-col grid.
3. **Loaded + empty** → `JobGuideCardGrid` empty state: 📚 + "Chưa có hướng dẫn nào. Nhấn
   '+ New Guide' để bắt đầu." + a New-Guide button (`JobGuideCardGrid.tsx:32-47`).
4. **Loaded + non-empty** → the card grid; **and** Zone D mounts (gated on `guides.length > 0`,
   `page.tsx:121`).

### Zone D (CompletionTrackingTable) internal states

- `isLoading` → "Đang tải..." (`CompletionTrackingTable.tsx:67-68`).
- `isError` → red "Kết nối mạng yếu. Nhấn thử lại." (`:69-72`).
- `rows.length === 0` → "Chưa có nhân viên nào được giao hướng dẫn này." (`:73-76`) — **the
  always-reached terminal state** in practice (Bug 1).
- otherwise → the paginated table (`:78-131`).
- Note: if `guides.length === 0` the component also early-returns its own "Chưa có hướng dẫn nào để
  theo dõi tiến trình." (`:37-43`), though the page only mounts it when `guides.length > 0`.

### Modal 2 (TrainingProgressModal) internal states

- `isLoading` → "Đang tải..." (`TrainingProgressModal.tsx:97-98`).
- `!detail` → "Nhân viên này chưa bắt đầu hướng dẫn." (`:99-102`) — **the always-reached state**
  (404, Bug 1).
- otherwise → progress bar + steps + quiz history + notes (`:103-202`).

---

## Search / interaction gating

- **Zone D query is gated** `enabled: !!guideId` (`useTrainingQueries.ts:27`) — no fetch until a
  guide is selected in the dropdown (defaults to `guides[0]`, `CompletionTrackingTable.tsx:25`).
- **Modal 2 query is gated** `enabled: open && !!staffId && !!guideId` (`useTrainingQueries.ts:34`)
  — it fires only once the modal is open with both ids set, so a closed modal makes no request.
- **Role tab** does not gate — changing `activeRole` always triggers a guide refetch (new key).
- **Manager-notes save** is debounced 800 ms (`TrainingProgressModal.tsx:60-64`), not a load state.

---

## Flags / Known Gaps

1. **No `loading.tsx`** — acceptable since the page is client-rendered with per-query skeletons, but
   means the segment shows the static shell instantly with no unified fallback.
2. **Zone D / Modal 2 "loading → empty" is the only path** — because progress data is never written
   (Bug 1), users always see the spinner resolve to an empty/404 message. Link:
   [TRAINING_BUGS.md](TRAINING_BUGS.md) Bug 1.
3. **Skeleton count is fixed at 4** regardless of how many guides will load — cosmetic.
4. **Guide-list error replaces the entire page** (including the header) with the retry panel
   (`page.tsx:69-83`) — Zone A/B disappear during an error.
