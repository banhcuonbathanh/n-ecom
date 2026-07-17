# Admin Training — Backend View (`/admin/training`)

> **TL;DR:** ✅ implemented. The code-accurate map of every BE endpoint the Staff-Training page
> calls, traced route → handler → service → repository → SQL on branch
> `experience_claude.md_system_1`. **7 endpoints, all `authMW` + `AtLeast("manager")` except
> `DELETE` which is `AtLeast("admin")`.** No Redis anywhere — every read hits MySQL directly;
> client cache is TanStack Query only. **The progress half of the page is dead in code:** nothing
> in `be/` ever inserts a `training_progress` or `quiz_attempts` row, so endpoints 5–7 can only
> ever return empty / 404 — see [Flags](#flags) + [TRAINING_BUGS.md](TRAINING_BUGS.md).
>
> **Sources traced:**
> `be/cmd/server/main.go` (routes) ·
> `be/internal/handler/training_handler.go` ·
> `be/internal/service/training_service.go` ·
> `be/internal/repository/training_repo.go` ·
> `be/query/training.sql` ·
> `be/migrations/014_training.sql`
> **FE twin:** [admin_training.md](admin_training.md) · **Bugs:** [TRAINING_BUGS.md](TRAINING_BUGS.md)
> **FE callers:** `fe/src/features/admin/training.api.ts` · `fe/src/hooks/useTrainingQueries.ts`

---

## Endpoints Used by This Page

| # | Endpoint | Auth | Handler | Service | Repo / Query | Redis |
|---|----------|------|---------|---------|--------------|-------|
| 1 | `GET /admin/training/guides?role=` | authMW + `manager` | `ListGuides` (`training_handler.go:24`) | `ListGuides` (`training_service.go:119`) | `ListTrainingGuides` / `ListTrainingGuidesByRole` + `GetGuideRoles` per guide (N+1) | none |
| 2 | `POST /admin/training/guides` | authMW + `manager` | `CreateGuide` (`training_handler.go:39`) | `CreateGuide` (`training_service.go:169`) | `CreateTrainingGuide` + `DeleteGuideRoles`+`InsertGuideRole`×N | none |
| 3 | `PATCH /admin/training/guides/:id` | authMW + `manager` | `UpdateGuide` (`training_handler.go:87`) | `UpdateGuide` (`training_service.go:198`) | `GetTrainingGuide` + `UpdateTrainingGuide` + `DeleteGuideRoles`+`InsertGuideRole`×N | none |
| 4 | `DELETE /admin/training/guides/:id` | authMW + **`admin`** | `DeleteGuide` (`training_handler.go:135`) | `DeleteGuide` (`training_service.go:232`) | `GetTrainingGuide` + `SoftDeleteTrainingGuide` | none |
| 5 | `GET /admin/training/guides/:id/progress?page&pageSize` | authMW + `manager` | `ListGuideProgress` (`training_handler.go:146`) | `ListGuideProgress` (`training_service.go:262`) | `GetTrainingGuide` + `ListGuideProgress` + `CountGuideProgress` + `ListQuizAttempts` per row (N+1) | none |
| 6 | `GET /admin/training/staff/:staffId/progress/:guideId` | authMW + `manager` | `GetStaffProgressDetail` (`training_handler.go:175`) | `GetStaffProgressDetail` (`training_service.go:301`) | `GetTrainingGuide` + `GetStaffProgress` + `ListQuizAttempts` | none |
| 7 | `PATCH /admin/training/staff/:staffId/progress/:guideId` | authMW + `manager` | `UpdateManagerNotes` (`training_handler.go:187`) | `UpdateManagerNotes` (`training_service.go:332`) | `GetStaffProgress` + `UpdateManagerNotes` | none |

All paths are under the `/api/v1` group. Reads = #1, #5, #6 · writes = #2, #3, #4, #7.

**Route registration** — `be/cmd/server/main.go:294-323`:
```go
adminR := v1.Group("/admin")
adminR.Use(authMW, middleware.AtLeast("manager"))          // main.go:294-295
...
{
    admIngR := adminR.Group("")
    admIngR.Use(middleware.AtLeast("admin"))               // main.go:311-312
    admIngR.DELETE("/training/guides/:id", trainingH.DeleteGuide)  // main.go:314 — admin only
}
adminR.GET("/training/guides", trainingH.ListGuides)            // main.go:318
adminR.POST("/training/guides", trainingH.CreateGuide)          // main.go:319
adminR.PATCH("/training/guides/:id", trainingH.UpdateGuide)     // main.go:320
adminR.GET("/training/guides/:id/progress", trainingH.ListGuideProgress)            // main.go:321
adminR.GET("/training/staff/:staffId/progress/:guideId", trainingH.GetStaffProgressDetail)  // main.go:322
adminR.PATCH("/training/staff/:staffId/progress/:guideId", trainingH.UpdateManagerNotes)    // main.go:323
```

---

## Auth Model on This Page

- **Page shell:** `AuthGuard` + `RoleGuard minRole={Role.MANAGER}`
  (`fe/src/app/(dashboard)/admin/layout.tsx:29-30`) — only a manager-or-above JWT renders any
  `/admin/*` page, including this one.
- **All 7 endpoints require a staff JWT** (`authMW`) and `AtLeast("manager")` — there is **no public
  or guest path** in the training domain.
- **One asymmetry — `DELETE` requires `admin`** (`main.go:311-314`), while `POST`/`PATCH` writes
  require only `manager`. So a manager can **create and edit** guides but **cannot delete** one — a
  manager's delete click 403s. The FE delete button is rendered unconditionally
  (`JobGuideCard.tsx:69-71`, no role check). → [Flags](#flags) #1, [TRAINING_BUGS.md](TRAINING_BUGS.md) Bug 2.
- `created_by` on a new guide is taken from the JWT via
  `middleware.StaffIDFromContext(c)` (`training_handler.go:64`, `training_service.go:187`), stored
  as a nullable FK to `staff(id)` (`014_training.sql:14,23`). No other endpoint reads it back.

---

## Per-Endpoint Detail

### 1 · GET /admin/training/guides?role=

- **Handler** `training_handler.go:24-36`: reads optional `?role=` (`chef|cashier|staff|manager`),
  serializes each row via `guideToJSON` (`:204-221`), returns `{ "data": [...] }`.
- **Service** `training_service.go:119-148`: if `role` is empty or `"all"` → `repo.ListGuides`;
  otherwise validates via `toRole` (`:91-103`, 400 `INVALID_TRAINING_ROLE` on a bad value) →
  `repo.ListGuidesByRole`. Then **for each guide** calls `repo.GetGuideRoles` to attach
  `responsibleRoles` — an **N+1** (1 list query + 1 query per guide).
- **SQL** `ListTrainingGuides` (`training.sql:1-4`) / `ListTrainingGuidesByRole` (`:6-9`): both
  filter `WHERE deleted_at IS NULL ORDER BY created_at DESC`. `GetGuideRoles` (`:35-37`) reads the
  `training_guide_roles` join table.
- **Note:** no `published` filter — drafts (`published=0`) are returned to the admin table the same
  as published guides. → [Flags](#flags) #3.

### 2 · POST /admin/training/guides

- **Handler** `training_handler.go:39-84`: binds the full guide body (`title`+`role`
  `binding:"required"`; everything else optional). Defaults `passThreshold→75`, `maxAttempts→3`
  when sent as `0` (`:57-62`). Stamps `CreatedBy` from the JWT. **201** + `{data: guideToJSON}`.
- **Service** `training_service.go:169-196`: `toRole` validate → `uuid.New()` id →
  `repo.CreateGuide` → `setGuideRoles` (`:241-255`, deletes then re-inserts the `responsibleRoles`
  rows) → re-reads via `GetGuide` for the response.
- **SQL** `CreateTrainingGuide` (`training.sql:16-21`) inserts the 12 columns;
  `InsertGuideRole` (`:39-41`) is `INSERT IGNORE` into `training_guide_roles`.

### 3 · PATCH /admin/training/guides/:id

- **Handler** `training_handler.go:87-132`: same body shape + same `title`/`role` `required` +
  same 75/3 defaults as create. Despite being a `PATCH`, the body is a **full replace** (required
  fields), not a partial patch — the FE modal always sends the whole guide
  (`CreateEditGuideModal`). 200 + `{data}`.
- **Service** `training_service.go:198-230`: `GetGuide` existence check (404
  `TRAINING_GUIDE_NOT_FOUND` if missing) → `toRole` → `repo.UpdateGuide` → if
  `ResponsibleRoles != nil` re-set them via `setGuideRoles` → re-read.
- **SQL** `UpdateTrainingGuide` (`training.sql:23-28`) sets all editable columns + `updated_at=NOW()`
  `WHERE id=? AND deleted_at IS NULL`.

### 4 · DELETE /admin/training/guides/:id  *(admin only)*

- **Handler** `training_handler.go:135-142`: 200 + `{message: "Đã xoá hướng dẫn đào tạo"}`.
- **Service** `training_service.go:232-239`: `GetGuide` existence check (404 if missing) →
  `repo.SoftDeleteGuide`.
- **SQL** `SoftDeleteTrainingGuide` (`training.sql:30-33`) = `UPDATE … SET deleted_at=NOW()` —
  **soft delete**, the row stays. `training_guide_roles`/`training_progress` rows are NOT touched
  (their `ON DELETE CASCADE` only fires on a hard row delete, which never happens).

### 5 · GET /admin/training/guides/:id/progress?page&pageSize

- **Handler** `training_handler.go:146-172`: `page` defaults 1, `pageSize` defaults 10 and is
  clamped to `1..100` (`:150-155`); returns `{data, total, page, pageSize}`.
- **Service** `training_service.go:262-299`: `GetGuide` existence check → `ListGuideProgress`
  (paged) + `CountGuideProgress` → **for each row** `ListQuizAttempts` (N+1) to derive `quizPassed`
  (true if any attempt passed, false if attempts exist but none passed, `null` if no attempts —
  `:284-295`).
- **SQL** `ListGuideProgress` (`training.sql:47-62`) is an **INNER `JOIN staff`** on
  `tp.staff_id`, ordered by `s.full_name`. **It returns only staff that already have a
  `training_progress` row.**
- **⚠️ Dead in code:** no endpoint ever inserts a `training_progress` row (see [Flags](#flags) #2),
  so this query's result set is **always empty** → Zone D "Completion Tracking" always renders
  "Chưa có nhân viên nào được giao hướng dẫn này." [TRAINING_BUGS.md](TRAINING_BUGS.md) Bug 1.

### 6 · GET /admin/training/staff/:staffId/progress/:guideId

- **Handler** `training_handler.go:175-184`: serializes via `progressDetailToJSON` (`:236-271`),
  which computes `attemptsRemaining = maxAttempts − len(quizAttempts)` (floored at 0) and formats
  each attempt's `date` as `YYYY-MM-DD`.
- **Service** `training_service.go:301-330`: `GetGuide` (404 `TRAINING_GUIDE_NOT_FOUND`) →
  `GetStaffProgress` (404 `TRAINING_PROGRESS_NOT_FOUND` if no row) → `ListQuizAttempts`.
- **SQL** `GetStaffProgress` (`training.sql:68-71`) = single row by `(guide_id, staff_id)`.
- **⚠️ Dead in code:** since `training_progress` is never written, this **always returns 404
  `TRAINING_PROGRESS_NOT_FOUND`** → Modal 2 always shows "Nhân viên này chưa bắt đầu hướng dẫn."
  [TRAINING_BUGS.md](TRAINING_BUGS.md) Bug 1.

### 7 · PATCH /admin/training/staff/:staffId/progress/:guideId

- **Handler** `training_handler.go:187-202`: binds `{managerNotes}`, 200 + message.
- **Service** `training_service.go:332-339`: `GetStaffProgress` existence check (404 if no row) →
  `repo.UpdateManagerNotes`.
- **SQL** `UpdateManagerNotes` (`training.sql:80-83`) = `UPDATE training_progress SET manager_notes=…`.
- **⚠️ Dead in code:** the FE saves notes from Modal 2 with an 800 ms debounce
  (`TrainingProgressModal.tsx:58-64`), but because no progress row ever exists the PATCH **always
  404s**, and the mutation has no `onError` → the save fails silently.
  [TRAINING_BUGS.md](TRAINING_BUGS.md) Bug 1.

---

## Caching & Invalidation

- **No Redis at any layer** of the training domain — repo calls go straight to sqlc/MySQL. Training
  is on the analytics/admin "do-not-cache" side of `03_be/REDIS_CACHE.md` (live admin data).
- **Client cache = TanStack Query only** (`useTrainingQueries.ts`):
  - `['training','guides',role]` — `staleTime` 5 min, `gcTime` 10 min (`:14-20`).
  - `['training','progress',guideId,page]` — `staleTime` 2 min, `enabled: !!guideId` (`:22-28`).
  - `['training','staffProgress',staffId,guideId]` — `enabled: open && !!staffId && !!guideId` (`:30-35`).
- **Invalidation:** create/update/delete guide mutations all `invalidateQueries(['training','guides'])`
  (`:41,49,57`); manager-notes save invalidates `['training','staffProgress',staffId,guideId]`
  (`:66-67`). All client-side — there is **no cross-device push** (no SSE/WS in this domain), so a
  second manager's screen only updates on its next refetch.

---

## Error Behaviour

- **Bind failures** (missing `title`/`role`) → `respondError(400, "INVALID_INPUT", …)`
  (`training_handler.go:54,103,194`).
- **Service errors** map via `handleServiceError`:
  - `INVALID_TRAINING_ROLE` 400 — bad `role` filter or body role (`training_service.go:17,91-103`).
  - `TRAINING_GUIDE_NOT_FOUND` 404 — update/delete/progress on a missing/soft-deleted guide (`:15`).
  - `TRAINING_PROGRESS_NOT_FOUND` 404 — staff-progress detail / notes save with no progress row
    (`:16`) — **the always-hit path** for endpoints 6 & 7 today.
- **FE-visible states:** the guide list `isError` shows a full "Kết nối mạng yếu. Nhấn thử lại."
  retry panel (`page.tsx:69-83`); the progress table and Modal 2 fall through to their empty-state
  copy on the 404s above rather than an error toast.

---

## Flags

| # | Flag | Severity | Detail |
|---|------|----------|--------|
| 1 | **`DELETE` is `admin`-only, the rest are `manager`** | 🟠 Med (code bug) | `main.go:311-314` gates delete at `AtLeast("admin")`; the page shell + create/edit are `manager`. The 🗑 button (`JobGuideCard.tsx:69-71`) shows for managers → their click 403s with no `onError` toast. → [TRAINING_BUGS.md](TRAINING_BUGS.md) Bug 2. |
| 2 | **Progress + quiz tables are never written by any API path** | 🔴 High (code bug) | `UpsertStaffProgress` + `InsertQuizAttempt` exist in `training.sql:73-78,94-96` and the repo (`training_repo.go:25,30`) but have **zero callers** in `be/` (no service method, no route). So `training_progress`/`quiz_attempts` stay empty → endpoints 5 (empty), 6 (404), 7 (404) are dead. Zone D table + Modal 2 can only ever show their empty states. → [TRAINING_BUGS.md](TRAINING_BUGS.md) Bug 1. |
| 3 | **`ListGuides` returns drafts** | 🟡 Low | No `published` filter (`training.sql:1-4`) — `published=0` guides appear in the admin list (intended for an admin-authoring view; just note the field is informational, not a gate). |
| 4 | **N+1 reads, no batching** | 🟡 Low (ops) | `ListGuides` runs `GetGuideRoles` per guide (`training_service.go:136-140`); `ListGuideProgress` runs `ListQuizAttempts` per row (`:279-283`). Fine at current data sizes; no Redis to absorb it. |
| 5 | **`trainingStore.ts` is dead** | 🟡 Low | `fe/src/store/trainingStore.ts` exists but is imported by nothing — the page coordinates purely through the TanStack Query cache + page-level React state. |
| 6 | **`PATCH` guide is a full replace** | 🟡 Low | Endpoint 3 requires `title`+`role` and overwrites every editable column (`training.sql:23-28`) — semantically a PUT. Harmless because the FE modal always submits the full guide. |
