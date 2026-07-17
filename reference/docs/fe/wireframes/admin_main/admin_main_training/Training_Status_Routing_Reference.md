# Training (Đào tạo nhân viên) — Status Routing Reference

> **Page:** `fe/src/app/(dashboard)/admin/training/page.tsx` → mounted at `/admin/training`
> **Run date:** 2026-06-07 · **Model:** `Admin_Overview_Status_Routing_Reference.md`
>
> ⚠️ **There is NO stored entity-status column for training.** No table has a `status` enum.
> The "completion status" shown on this page (Hoàn thành / Đang học / Chưa qua quiz / Chưa bắt đầu)
> is **derived client-side** in `CompletionTrackingTable.tsx` from two raw fields —
> `training_progress.watched_percent` (INT) + `quiz_attempts.passed` (the latest, surfaced as
> `quizPassed: boolean | null`). The guide-level `published` (TINYINT) is a **draft/published**
> flag, not a lifecycle status. This doc therefore documents the **derived** status routing plus
> the full data flow.

---

## Live Page Snapshot (`http://localhost:3000/admin/training`, 2026-06-07)

❓ **NOT captured.** FE responds `200` but the Playwright Chrome profile was locked
(`Browser is already in use … mcp-chrome-ef492b3`) — the same blocker logged for the
`client_order_page` run. Stack is up; re-run with `--isolated` to capture. All cells below are
traced to source, not to a render.

---

## Page Layout

| Zone | Component | Title (literal JSX) | When visible |
|------|-----------|---------------------|--------------|
| A | inline `<div>` in `page.tsx:88` | `Đào tạo nhân viên` (+ sub `Quản lý hướng dẫn và theo dõi tiến trình`) | Always (sticky `top-0`) |
| B | `RoleFilterTabs` (`page.tsx:102`) | — (5 filter pills, no heading) | Always (sticky `top-[92px]`) |
| C | `JobGuideCardGrid` → `JobGuideCard` (`page.tsx:110`) | — (no heading; cards) | Always — shows skeleton / empty-state / card grid |
| D | `CompletionTrackingTable` (`page.tsx:123`) | `Completion Tracking — {guide.title}` | **Only when `guides.length > 0`** (`page.tsx:121`) |
| M1 | `CreateEditGuideModal` (`page.tsx:134`, `dynamic()`) | `Tạo hướng dẫn` / `Chỉnh sửa hướng dẫn` | When `guideModalOpen` |
| M2 | `TrainingProgressModal` (`page.tsx:143`, `dynamic()`) | `Chi tiết tiến trình` | When `progressModalOpen` |

- Zone A `+ New Guide` button and Zone C empty-state `+ New Guide` both call `handleNewGuide` (opens M1 with `editingGuide = null`).
- Error state: if `useJobGuides` errors, `page.tsx:69` short-circuits the whole page to a full-screen "Kết nối mạng yếu. Nhấn thử lại." + reload button — zones B/C/D are **not** rendered.

---

## Derived Completion Statuses (computed, not stored)

Source of truth for the raw fields: `training_progress.watched_percent` + latest `quiz_attempts.passed`
(`docs/be/be_code_summary/DB_SCHEMA_SUMMARY.md` §014). FE mirror: `StaffProgressRow`
(`types/training.ts:22`) carries `watchedPercent: number` + `quizPassed: boolean | null`.

Derivation in `CompletionTrackingTable.tsx:6-17`:

| Derived status (label) | Icon | Condition (exact) | Source |
|------------------------|------|-------------------|--------|
| `Hoàn thành` | ✅ | `quizPassed === true` | `statusLabel:13` / `statusIcon:7` |
| `Chưa qua quiz` | 🟡 | `quizPassed === false` | `statusLabel:14` / `statusIcon:8` |
| `Đang học` | 🟡 | `quizPassed === null` **and** `watchedPercent > 0` | `statusLabel:15` / `statusIcon:8` |
| `Chưa bắt đầu` | ⬜ | `quizPassed === null` **and** `watchedPercent === 0` | `statusLabel:16` / `statusIcon:9` |

> ⚠️ **`statusIcon` and `statusLabel` use different branch orders.** The icon collapses
> `Chưa qua quiz` (failed) and `Đang học` (watching) into the **same** 🟡 — only the
> `title=` tooltip (`statusLabel`) distinguishes them. So a "failed quiz" and "still watching"
> row look identical at a glance.

> ⚠️ **`TrainingStatus = 'Completed' | 'In Progress' | 'Not Started'`** is declared in
> `types/training.ts:20` but **used nowhere** (grep: 1 hit, the declaration). The live UI uses
> the Vietnamese 4-state labels above, not this 3-state English enum. Dead type / label drift.

---

## Guide Publish State (draft vs published — `training_guides.published`)

| State | Value | UI on `JobGuideCard` |
|-------|-------|----------------------|
| Published | `published === true` | normal cover, no overlay |
| Draft | `published === false` | dark overlay + `Nháp` badge over cover (`JobGuideCard.tsx:37-43`) |

Toggled in M1 via the `Đã xuất bản` switch (`CreateEditGuideModal.tsx:264-280`). Not a filter — drafts still appear in the grid.

---

## Completion Status — Which Zone Each Appears In

| Derived status | VN label | Zone C (cards) | Zone D (table) | Modal 2 (detail) |
|----------------|----------|:--------------:|:--------------:|:----------------:|
| Hoàn thành | `Hoàn thành` | ❌ | ✅ (✅ + `✓ Passed`) | ✅ (steps + quiz history) |
| Chưa qua quiz | `Chưa qua quiz` | ❌ | ✅ (🟡 + `✗ Failed`) | ✅ |
| Đang học | `Đang học` | ❌ | ✅ (🟡 + `— N/A`) | ✅ |
| Chưa bắt đầu | `Chưa bắt đầu` | ❌ | ✅ (⬜ + `— N/A`) | ✅ (or "chưa bắt đầu" empty msg) |

- **Zone C never renders completion status** — cards are guide-level (title, role, KPI, draft/published), they carry no per-staff progress.
- **Quiz column** (Zone D, `CompletionTrackingTable.tsx:110-117`) is a separate render of the same `quizPassed`: `null → "— N/A"`, `true → "✓ Passed"` (green), `false → "✗ Failed"` (red).
- Modal 2 shows "Nhân viên này chưa bắt đầu hướng dẫn." when `detail` is `undefined` (`TrainingProgressModal.tsx:99-101`).

---

## Modal 2 (`TrainingProgressModal`) — Derived Steps Per Progress

The 3-step checklist is derived in `deriveSteps` (`TrainingProgressModal.tsx:18-43`):

| Step | Label | `done` condition | Note when done / not |
|------|-------|------------------|----------------------|
| 1 | `Xem video` | `watchedPercent >= 100` | `Đã xem` / `Chưa xem` |
| 2 | `Làm bài kiểm tra` | `quizAttempts.length > 0` | `Đã thử` / `Chưa thử` |
| 3 | `Hoàn thành` | `quizAttempts.some(a => a.passed)` | `Đạt` / `Cần qua quiz` |

> Note step 1 requires `>= 100`, but the table's `Đang học` triggers at `watchedPercent > 0`.
> A staff at 40% reads as `Đang học` in the table but shows step 1 **not done** in the modal — consistent, just different thresholds.

---

## Action Buttons Per Zone (no status-advance — CRUD + navigation only)

This page has **no status-transition buttons** (unlike Overview/KDS). Buttons are guide CRUD,
notes, filtering, and navigation. Listed for completeness:

| Zone / Component | Button (literal) | Action | Trace |
|------------------|------------------|--------|-------|
| A header | `+ New Guide` | open M1, `editingGuide=null` | `page.tsx:93` → `handleNewGuide` |
| B tabs | `Tất cả`/`Bếp`/`Thu ngân`/`Nhân viên`/`Quản lý` | `setActiveRole` → refetch `useJobGuides(role)` | `RoleFilterTabs.tsx:24` |
| C card kebab | `Chỉnh sửa` | open M1 with guide | `JobGuideCard.tsx:63` → `handleEdit` |
| C card kebab | `Xoá` | `confirm()` → `deleteGuide.mutate(id)` | `JobGuideCard.tsx:69` → `handleDelete` (`page.tsx:59`) |
| C card CTA | `Xem tiến trình →` | scroll to `#completion-tracking` | `JobGuideCard.tsx:122` → `handleViewProgress` |
| C empty | `+ New Guide` | open M1 | `JobGuideCardGrid.tsx:42` |
| D selector | `<select>` of guides | `setSelectedGuideId` + `setPage(1)` | `CompletionTrackingTable.tsx:56` |
| D row click | (whole `<tr>`) | open M2 for `(staffId, guideId)` | `CompletionTrackingTable.tsx:95` → `onViewStaffProgress` |
| D footer | `←` / page `N` / `→` | `setPage` → refetch progress | `CompletionTrackingTable.tsx:141-165` |
| M1 | `Lưu hướng dẫn` | create or update guide | `CreateEditGuideModal.tsx:291` |
| M1 | `Huỷ` / `✕` | close | `CreateEditGuideModal.tsx:284,110` |
| M2 | `Ghi chú quản lý` textarea | debounced (800ms) save notes | `TrainingProgressModal.tsx:58-64` |
| M2 | `Đóng` / `✕` | close | `TrainingProgressModal.tsx:206,88` |

---

## Zone D (`CompletionTrackingTable`) — Rules

- **Default selected guide** = `guides[0]?.id` (`:25`). Changing the `<select>` resets `page` to 1 (`:57`).
- **Columns:** Nhân viên · Vai trò · Đã xem (progress bar + `%`) · Quiz · Cập nhật · Trạng thái (icon w/ tooltip).
- **`Cập nhật`** = `lastActivity` formatted `toLocaleDateString('vi-VN')`, `—` if falsy (`:118-123`).
- **Pagination** is server-side: `pageSize = 10`, `totalPages = ceil(total/pageSize)` (`:33`). Footer count = `(page-1)*pageSize+1 … min(page*pageSize, total) trong {total} nhân viên`.
- **States:** loading → "Đang tải...", error → "Kết nối mạng yếu. Nhấn thử lại.", empty → "Chưa có nhân viên nào được giao hướng dẫn này." (`:67-76`).
- Page renders Zone D only if `guides.length > 0`; the component's own `guides.length === 0` guard (`:37`) is therefore dead in this page.
- ⚠️ `onViewStaffProgress` passes an **empty `staffName`** (`page.tsx:127`) — Modal 2 header shows a blank name; the staff's role is recovered from the guide (`guide.role`), **not** from the row's `staffRole`.

---

## Zone C (`JobGuideCard`) — Rules

- Cover image falls back to a 📚 emoji on missing URL or `onError` (`:25-34`).
- `responsibleRoles` rendered as `RoleBadge` pills; primary `role` badge sits top-left over the cover.
- KPI chips: `📊 {qualityKpiTarget}` and `🎯 {quantityKpiTarget}`, each shown only if non-empty.
- YouTube link `▶ Xem video hướng dẫn` opens `youtubeUrl` in a new tab; shown only if set.

---

## What Information Comes FROM BE (reads)

| Hook | Query key | Endpoint | Params | staleTime | enabled |
|------|-----------|----------|--------|-----------|---------|
| `useJobGuides` | `['training','guides',role]` | `GET /admin/training/guides` | `?role=` (omitted when `all`) | 5 min | always |
| `useGuideProgress` | `['training','progress',guideId,page]` | `GET /admin/training/guides/{guideId}/progress` | `?page&pageSize=10` | 2 min | `!!guideId` |
| `useStaffProgressDetail` | `['training','staffProgress',staffId,guideId]` | `GET /admin/training/staff/{staffId}/progress/{guideId}` | — | (default) | `open && !!staffId && !!guideId` |

Base URL: `process.env.NEXT_PUBLIC_API_URL ?? http://localhost:8080/api/v1` (`lib/api-client.ts:7`).

**Fields received** (from `types/training.ts`):

- **`JobGuide`** (guides list, unwrapped via `r.data?.data ?? []`): `id, title, role, description, coverImageUrl, youtubeUrl, qualityKpiTarget, quantityKpiTarget, passThreshold, maxAttempts, responsibleRoles[], published, createdAt, updatedAt`.
- **`GuideProgressPage`** (progress list, unwrapped via `r.data` — the **whole** envelope, not `.data.data`): `{ data: StaffProgressRow[], total, page, pageSize }`. Each `StaffProgressRow`: `id, guideId, staffId, staffName, staffRole, watchedPercent, quizPassed (bool|null), lastActivity`.
- **`StaffProgressDetail`** (detail, unwrapped via `r.data.data`): `staffId, guideId, guideName, watchedPercent, passThreshold, maxAttempts, attemptsRemaining, managerNotes, quizAttempts[] {attemptNumber,date,score,passed}, createdAt, updatedAt`.

> ⚠️ **Unwrap inconsistency:** `listGuideProgress` returns `r.data` (top-level paginated envelope) while every other call returns `r.data.data`. Confirm the BE wraps the paginated list **without** the extra `data` layer, or the table silently gets `undefined` rows. (`training.api.ts:33` vs `:14,18,21,39`.)

No client-side joins beyond `guides.find(g => g.id === guideId)` to recover a guide's `role`/`title` for the modal + header.

---

## What Information Is SENT TO BE (writes)

### Create guide — `useCreateGuide`
`POST /admin/training/guides` · body built in `CreateEditGuideModal.onSubmit` (`:72-85`):
```json
{
  "title": "string",
  "role": "chef|cashier|staff|manager",
  "description": "string?",
  "coverImageUrl": "string?",
  "youtubeUrl": "string?",
  "qualityKpiTarget": "string?",
  "quantityKpiTarget": "string?",
  "passThreshold": 75,
  "maxAttempts": 3,
  "published": false,
  "responsibleRoles": ["chef", "..."]
}
```
Zod rules (`:13-25`): `title` required; `role` required enum; `coverImageUrl`/`youtubeUrl` must be a URL or `''`; `passThreshold` 1–100 (default 75); `maxAttempts` 1–10 (default 3); `responsibleRoles` ≥ 1. onSuccess → `invalidateQueries(['training','guides'])`.

### Update guide — `useUpdateGuide`
`PATCH /admin/training/guides/{id}` · **same body shape** as create (full object, not a partial). onSuccess → invalidate `['training','guides']`.

### Delete guide — `useDeleteGuide`
`DELETE /admin/training/guides/{id}` · no body · gated behind `confirm('Xoá hướng dẫn này?')` (`page.tsx:60`). onSuccess → invalidate `['training','guides']`.

### Update manager notes — `useUpdateManagerNotes`
`PATCH /admin/training/staff/{staffId}/progress/{guideId}` · body `{ "managerNotes": "string" }` (`training.api.ts:46`). Fired **debounced 800ms** on textarea change (`TrainingProgressModal.tsx:61`). onSuccess → invalidate `['training','staffProgress',staffId,guideId]`.

> No optimistic updates anywhere — all four mutations rely on invalidate-and-refetch.
> No toast/error UI on mutation failure (create/update/delete/notes silently no-op on reject); only the **read** path has an error screen.

---

## How It Manages Data CROSS-PAGE

| Store | localStorage key | Persisted? | Carries across pages | File |
|-------|------------------|-----------|----------------------|------|
| `useTrainingStore` (zustand) | — | No (memory only, no `persist`) | `activeRole`, `selectedGuideId` | `store/trainingStore.ts` |

> ⚠️ **`useTrainingStore` is declared but never imported by the page or any component**
> (the page holds `activeRole` in local `useState` instead — `page.tsx:17`). It carries nothing
> cross-page today; dead store.

- **No cross-page handoff.** Training is fully self-contained — no `localStorage` cache keys, no navigation payloads, no SSE/WS. All state lives in React local state + TanStack Query cache (in-memory, `gcTime` 10 min for guides).
- **Auth:** standard `api-client` axios interceptor attaches the Bearer access token (Zustand memory) on every `/admin/training/*` call; route is under `(dashboard)/admin` so it inherits `AuthGuard` + admin `RoleGuard` from the admin layout.
- **End-to-end loop:** `useJobGuides(role)` → render cards (Zone C) → pick a guide in Zone D `<select>` → `useGuideProgress` paginated rows → click a row → `useStaffProgressDetail` → Modal 2 → edit notes → `PATCH …/progress/{guideId}` → invalidate → refetch.

---

## Concerns Summary

| # | Severity | Concern |
|---|----------|---------|
| 1 | ⚠️ FLAG | No stored status enum — completion status is derived; icon 🟡 conflates "failed quiz" and "still watching" (only tooltip differs). |
| 2 | ⚠️ FLAG | `TrainingStatus` type (`types/training.ts:20`) is dead — UI uses VN 4-state labels, type is unused 3-state English. |
| 3 | ⚠️ FLAG | `useTrainingStore` is a dead store — page uses local `useState`, store imported nowhere. |
| 4 | 🚨 RISK | Unwrap inconsistency: `listGuideProgress` returns `r.data` while siblings return `r.data.data` — verify BE envelope shape for the paginated list. |
| 5 | ⚠️ FLAG | Zone D row passes empty `staffName` to Modal 2 (`page.tsx:127`) → blank name in modal header; staff role taken from guide, not row. |
| 6 | ⚠️ FLAG | Mutations have no error/toast UI — create/update/delete/notes silently no-op on failure. |
| 7 | ❓ | Live snapshot not captured (Playwright profile locked). Re-run with `--isolated`. |
