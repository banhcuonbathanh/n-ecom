# Admin Training — Code Bugs

> **TL;DR:** **2 code bugs** found tracing `/admin/training` on branch
> `experience_claude.md_system_1`. These are **code** bugs (the running FE and BE disagree), **not
> stale docs** — a doc edit cannot fix them; only an app-code change can. The doc skill recorded
> them; it did **not** touch app code. See the BE anchor
> [admin_training_be.md](admin_training_be.md) and the LOGIC Decision Log entry (2026-06-16).
>
> **Next step (per CLAUDE.md):** none of these are on `docs/tasks/MASTER_TASK.md` yet — a fix must
> be registered + ALIGNed before any code change. Highest impact = **Bug 1**.

---

## Severity at a Glance

| # | Bug | Severity | Surface affected | Fix side |
|---|-----|----------|------------------|----------|
| 1 | No API path ever writes `training_progress` / `quiz_attempts` → the whole progress half of the page is dead | 🔴 High | Zone D "Completion Tracking" table + Modal 2 "Chi tiết tiến trình" + manager-notes save (cross-cutting: 3 of 7 endpoints) | BE (+ a staff-facing surface) |
| 2 | `DELETE` guide is `admin`-only but the delete button shows for managers | 🟠 Med | Zone C job-guide card kebab → "Xoá" | FE (or BE) |

---

## Bug 1 — Progress + quiz data can never be created (3 dead endpoints)

**Severity:** 🔴 High · **Fix side:** BE

**Symptom (what the user sees).** A manager opens `/admin/training`, creates job guides, then scrolls
to "Completion Tracking" (Zone D) to see who has done them — it is **always** empty
("Chưa có nhân viên nào được giao hướng dẫn này."). Clicking any would-be staff row, or the card's
"View progress", opens Modal 2 which **always** reads "Nhân viên này chưa bắt đầu hướng dẫn." Typing
a manager note in that modal appears to save (debounced) but is silently lost. The entire
progress-tracking half of the page is inert no matter what staff do.

**Root cause.** Nothing in `be/` ever inserts a `training_progress` or `quiz_attempts` row:

- The sqlc queries exist — `UpsertStaffProgress`
  ([`be/query/training.sql:73-78`](../../../../../be/query/training.sql#L73-L78)) and
  `InsertQuizAttempt` ([`training.sql:94-96`](../../../../../be/query/training.sql#L94-L96)).
- The repository exposes them — `UpsertStaffProgress` / `InsertQuizAttempt` / `CountQuizAttempts`
  ([`be/internal/repository/training_repo.go:25,30,29`](../../../../../be/internal/repository/training_repo.go#L25-L30)).
- **But no service method and no route ever call them.** `TrainingService`
  ([`be/internal/service/training_service.go`](../../../../../be/internal/service/training_service.go))
  has no write path for progress/quiz, and `main.go:317-323` exposes only guide CRUD + read-only
  progress + manager-notes — there is **no `POST .../progress`, no `POST .../quiz`, no video-watch
  endpoint.** (Grep for callers of `UpsertStaffProgress`/`InsertQuizAttempt` outside the repo/db
  layers returns nothing.)

Consequences, all because `training_progress` is empty:

- **Endpoint 5** `GET /guides/:id/progress` — `ListGuideProgress`
  ([`training.sql:47-62`](../../../../../be/query/training.sql#L47-L62)) **INNER JOINs** `staff` on
  `tp.staff_id`, so an empty `training_progress` ⇒ `{data:[], total:0}` (consumed by
  [`CompletionTrackingTable.tsx:29-33`](../../../../../fe/src/components/admin/training/CompletionTrackingTable.tsx#L29-L33)).
- **Endpoint 6** `GET /staff/:staffId/progress/:guideId` — returns 404
  `TRAINING_PROGRESS_NOT_FOUND` (`training_service.go:310-313`), rendered as the empty state in
  [`TrainingProgressModal.tsx:99-102`](../../../../../fe/src/components/admin/training/TrainingProgressModal.tsx#L99-L102).
- **Endpoint 7** `PATCH …/progress/:guideId` (manager notes) — 404s on the same existence check
  (`training_service.go:333-334`); the FE save mutation has no `onError`
  ([`useTrainingQueries.ts:61-68`](../../../../../fe/src/hooks/useTrainingQueries.ts#L61-L68)) → silent.

This is the same class as the A8/A9 task-board "write-once, no update path" gap — the schema and
read side were built, the write side was not.

**Suggested fix (smallest safe change).** Decide the product surface that produces progress, then
wire it BE-side:
- Minimum to make the admin page truthful: a staff-facing **`POST /training/guides/:id/watch`**
  (calls `UpsertStaffProgress`) and **`POST /training/guides/:id/quiz`** (calls `InsertQuizAttempt`)
  — both already have queries + repo methods, so this is a service method + 2 routes + a handler.
- Until that exists, consider hiding/labelling Zone D + Modal 2 as "not yet collecting data" so the
  page does not imply tracking that cannot happen.

---

## Bug 2 — Delete button shows for managers, but `DELETE` is admin-only (403)

**Severity:** 🟠 Med · **Fix side:** FE (or BE)

**Symptom.** A **manager** (the page's minimum role) opens a job-guide card's kebab menu, taps
"Xoá", confirms the `confirm()` dialog — and nothing is removed. The request 403s and there is no
error toast, so the guide silently stays.

**Root cause.** Auth is asymmetric across the training writes:

- `DELETE /admin/training/guides/:id` is gated `AtLeast("admin")`
  ([`be/cmd/server/main.go:311-314`](../../../../../be/cmd/server/main.go#L311-L314)).
- `POST`/`PATCH` guide are gated only `AtLeast("manager")` (`main.go:319-320`), and the page shell
  is `RoleGuard minRole={Role.MANAGER}`
  ([`fe/src/app/(dashboard)/admin/layout.tsx:30`](../../../../../fe/src/app/(dashboard)/admin/layout.tsx#L30)).
- The delete button is rendered **unconditionally** — no role check
  ([`JobGuideCard.tsx:69-71`](../../../../../fe/src/components/admin/training/JobGuideCard.tsx#L69-L71)),
  and `useDeleteGuide` has no `onError`
  ([`useTrainingQueries.ts:53-59`](../../../../../fe/src/hooks/useTrainingQueries.ts#L53-L59)).

So a manager can create and edit guides but not delete them, with no UI signal explaining why.

**Suggested fix.** Product decision:
- **FE** (least surprising): hide the "Xoá" action unless the current user is `admin`, OR add an
  `onError` toast ("Chỉ quản trị viên (admin) mới được xoá hướng dẫn").
- **BE**: lower `DELETE` to `AtLeast("manager")` to match create/edit, if managers should own the
  full guide lifecycle.

---

## Cross-page note

Both bugs are training-domain-local — the endpoints are not shared with any other page (no other
route reads `training_*` tables). Bug 1's missing-write-path shape, however, **rhymes with the A8/A9
`staff_tasks` write-once gap** (see [BE_DOC_TRACKER.md](../../BE_DOC_TRACKER.md) Cross-Page Concerns):
a domain where reads/aggregations were built but the row-producing write endpoint was never wired.
