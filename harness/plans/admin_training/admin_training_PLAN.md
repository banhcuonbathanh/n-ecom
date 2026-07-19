# Admin Training Page — Consolidated FE + BE Build Plan (F-26)

> **TL;DR:** One plan, one folder, for the manager-facing staff-training page
> (`/admin/training`) — the AD-phase surface where a manager **authors job guides**
> (title, role, video, KPI targets, pass rules) and **tracks who completed them**.
> FE and BE are planned together because this page is a contract: guide CRUD (staff
> JWT, manager+), a role-filtered read, and a per-staff progress read that **only
> works if a staff-facing write path exists** — the single most important decision
> in this plan (§7).
> Visual companions: [`admin_training_plan.html`](admin_training_plan.html) (the plan),
> [`admin_training_how-it-works.html`](admin_training_how-it-works.html) (runtime),
> [`admin_training_mockup-1.html`](admin_training_mockup-1.html) (the UI).
> Source: `reference/docs/system/08_pages/admin/admin_training/` (7 docs) +
> `reference/docs/fe/wireframes/admin_main/admin_main_training/` (6 docs), digested
> 2026-07-19, reconciled with `OVERALL_PLAN.md` phase AD, `DB_SCHEMA.md §4.7`, and the
> F-5/F-8/F-11/F-12 rule sets. **One fact one home:** this file owns the training
> page's scope, contract, and task mapping — rules stay in their owning docs (linked).

---

## 1. What the page is

Desktop-first admin surface for a bánh cuốn restaurant's staff onboarding. A manager
lands from the admin shell nav (`/admin/*`, gated `minRole=manager`).

**Core loop:** author a job guide (role, video, KPI targets, pass rules) → publish it →
watch the completion table fill as staff of that role watch the video and take the quiz
→ leave a coaching note on anyone who fails.

The page has **two halves**, and the reference only ever shipped one:

- **Authoring half** (guide CRUD) — worked end-to-end in the reference. ✅ adopt.
- **Tracking half** (completion table + per-staff detail + manager notes) — **inert in
  the reference**: no API path ever wrote `training_progress`/`quiz_attempts`, so 3 of
  its 7 endpoints could only return empty/404 forever (§6 Bug 1). Our plan makes this
  half conditional on the staff-facing write path shipping with it (§7 decision 1).

**Entry paths:** admin shell nav only. **In/out links:** in from `/admin` (overview);
out to nothing — training is the **sole producer and consumer** of `training_*` data.
No other page reads these tables. A staff-facing "my training" surface does not exist
in the reference and is the missing half we scope in §3.1 #8–9.

**Audience note** (`business_description.md`): guides are per-position (Bếp · Thu ngân ·
Phục vụ · Quản lý); staff consume them through a separate role-scoped surface, never
this page.

## 2. Alignment — what governs this page (read, don't restate)

| Concern | Owning doc |
|---|---|
| Stack + versions | `harness/PLAN.md §Stack` |
| BE layering, tx policy, error envelope, error codes | `harness/BE_STATE.md` |
| goose+sqlc workflow, Go/Gin gotchas, N+1 discipline | `harness/BE_PLAYBOOK.md` |
| FE state kinds, cache map, loading tiers, hard rules 1–14 | `harness/FE_STATE.md` |
| Design tokens + admin components (**neutral F-7 set, NOT the customer dark/orange shell**) | `harness/diagrams/design-system.html` (F-7) |
| Table columns, `staff.role` enum, soft-delete×UNIQUE rule | `harness/DB_SCHEMA.md` (§4.6 staff · §4.7 workforce stubs) |
| Redis policy (why training is **not** cached) | `harness/ARCHITECTURE.md §4` + `OVERALL_PLAN.md §3.6` |
| AD-phase scope, RBAC surface map, lessons register | `harness/OVERALL_PLAN.md` (F-9) |

Reference docs are the **what**; the harness rules above are the **how**. Where they
conflict, the harness wins (established F-9 pattern — e.g. cookie JWT beats the
reference's memory-token + `Authorization` Bearer interceptor).

## 3. BE plan

### 3.1 Endpoints (all under `/api/v1`)

Manager-facing reads/writes (#1–#5) plus the **staff-facing write path (#6–#7)** the
reference never built, without which #4/#5 are dead on arrival (§6 Bug 1).

| # | Route | Auth | Phase/Task | Behavior |
|---|---|---|---|---|
| 1 | `GET /admin/training/guides?role=` | staff JWT, `manager+` | AD-T2 | Optional `role` ∈ `chef\|cashier\|staff\|manager`; `all`/empty → no filter. Returns guides + `responsible_roles` in **one JOIN'd query** (reference ran an N+1 — §3.4). Drafts included (admin authoring view). Soft-deleted excluded. |
| 2 | `POST /admin/training/guides` | staff JWT, `manager+` | AD-T2 | Create. `title`+`role` required; `pass_threshold` default 75 (range 50–100), `max_attempts` default 3 (range 1–10). `created_by` from the JWT identity **passed as a service parameter** (BE_STATE §3 — never dug out of context in the service). 201 + full guide object. |
| 3 | `PUT /admin/training/guides/:id` | staff JWT, `manager+` | AD-T2 | **Full replace — named `PUT`, not `PATCH`.** The reference called it `PATCH` while requiring every field and overwriting every column (§3.4). 404 `TRAINING_GUIDE_NOT_FOUND`. |
| 4 | `DELETE /admin/training/guides/:id` | staff JWT, **`manager+`** | AD-T2 | Soft delete (`deleted_at=NOW()`). **Lowered from the reference's `admin`-only gate** — same role that creates/edits deletes (§7 decision 3, kills Bug 2). |
| 5 | `GET /admin/training/guides/:id/progress?page&pageSize` | staff JWT, `manager+` | AD-T3 | **Roster-first, not progress-first.** Driven by `staff LEFT JOIN training_progress` over all active staff whose `role = guide.role` — so every assigned staff member appears, "Chưa bắt đầu", from day one (§3.4 — the reference's INNER JOIN made this permanently empty). `pageSize` default 10, clamped 1–100. Quiz verdict aggregated in the **same query**, not per-row. |
| 6 | `GET /admin/training/staff/:staffId/progress/:guideId` | staff JWT, `manager+` | AD-T3 | Per-staff detail: watched %, quiz attempt history, attempts remaining, manager notes. Returns a **zeroed "not started" object, not a 404**, when no progress row exists (§3.4). |
| 7 | `PUT /admin/training/staff/:staffId/progress/:guideId/notes` | staff JWT, `manager+` | AD-T3 | Manager notes. **Upserts** the progress row so a note can be left before the staff member starts (reference 404'd — §6). |
| 8 | `POST /training/guides/:id/watch` | staff JWT, **any staff role** | AD-T4 | **The missing write path.** Body `{watched_percent}`; upserts `training_progress`, monotonic (never decreases a high-water mark). Role-scoped: a staff member writes only their own row (`staff_id` from the JWT, never from the body). |
| 9 | `POST /training/guides/:id/quiz` | staff JWT, **any staff role** | AD-T4 | Records a quiz attempt: `{score}` → server computes `passed = score >= guide.pass_threshold`, assigns `attempt_number`, and **rejects past `max_attempts`** with `TRAINING_ATTEMPTS_EXHAUSTED`. Attempt insert + progress upsert in **one tx** (BE_STATE §3). |
| 10 | `GET /training/my-guides` | staff JWT, any staff role | AD-T4 | The staff's own published guides + their progress. Feeds the staff-facing surface; **published-only** (drafts never leak to staff — §3.4). |

Errors ride the Session-0 envelope; codes from `BE_STATE.md §4` plus three training
codes: `INVALID_TRAINING_ROLE` (400), `TRAINING_GUIDE_NOT_FOUND` (404),
`TRAINING_ATTEMPTS_EXHAUSTED` (409).

**Response shape law:** success payloads are **never wrapped** — an array endpoint
returns a bare array, a paged endpoint returns `{data, total, page, page_size}`,
a single object returns the object. Only errors ride the envelope. This structurally
kills the reference's 🚨 unwrap inconsistency (`r.data` on one call, `r.data.data` on
its five siblings — a silent-`undefined` trap; §6).

### 3.2 Schema this page depends on (AD-phase migration)

`DB_SCHEMA.md §4.7` currently **stubs** `training_guides` / `training_progress` with no
columns. This plan proposes the column set for that promotion; **`DB_SCHEMA.md` wins
once written** — when AD opens, these move there and this section shrinks to a link.

- `training_guides` — `title`, `role` (ENUM, the 5-value `staff.role` set from
  `DB_SCHEMA.md §4.6`), `description`, `cover_image_path`, `youtube_url`,
  `quality_kpi_target`, `quantity_kpi_target`, `pass_threshold` (default 75),
  `max_attempts` (default 3), `published` (TINYINT), `created_by` (nullable FK →
  `staff.id`), `created_at`, `updated_at`, `deleted_at`
  (field-name law: `cover_image_path` **relative**, not `coverImageUrl` — FE rule 14
  builds the URL, same as `products.image_path`)
- `training_guide_roles` — junction (`guide_id`, `role`) for the secondary
  "who is responsible" chips
- `training_progress` — `guide_id`, `staff_id`, `watched_percent` (INT 0–100),
  `manager_notes`, `created_at`, `updated_at`; UNIQUE `(guide_id, staff_id)`
- `quiz_attempts` — `guide_id`, `staff_id`, `attempt_number`, `score`, `passed`,
  `created_at`

**No `status` column anywhere** — completion status is **derived** from
`watched_percent` + the latest attempt's `passed` (§4.4 B5). This is the reference's
one genuinely good call and it matches FE rule 11 (derived-not-stored) and its BE twin.

Soft delete: guides only. Per `DB_SCHEMA.md §4.4`, note that the reference's
`ON DELETE CASCADE` on progress rows **never fires** (soft delete is an UPDATE) — so
a re-published guide keeps its history, which is what we want.

### 3.3 Cache map

**Training is not cached server-side.** Live admin data sits on the do-not-cache side
of `ARCHITECTURE.md §4` (Redis = catalog cache + auth rate-limit only). Reads go
straight to sqlc/MySQL. Adopted from the reference — it made the same call.

Client cache only (TanStack Query, `FE_STATE.md §3`):

| Write | Invalidates |
|---|---|
| guide create / update / delete | `['training','guides']` (all role variants) |
| manager notes save | `['training','staffProgress',staffId,guideId]` + `['training','progress',guideId]` |
| staff watch / quiz (staff surface) | that surface's own keys; the manager's table converges on **refetch, not push** (§3.4) |

### 3.4 Not adopted from the reference (decided here)

- ❌ **INNER JOIN progress-first roster** — `ListGuideProgress` INNER JOIN'd
  `training_progress`, so a staff member with no progress row was invisible. Combined
  with Bug 1 this made the table permanently empty. **Ours LEFT JOINs from the staff
  roster** (§3.1 #5), so the table is truthful even before any staff activity.
- ❌ **404 as an empty state** — endpoints 6 and 7 404'd when no progress row existed,
  and the FE rendered that 404 as copy. A missing progress row is a **legitimate zero
  state, not an error**; ours returns a zeroed object and upserts on notes.
- ❌ **`PATCH` that is a full replace** — renamed `PUT` (§3.1 #3). Honest verbs
  (FE rule 12 HTTP-method parity has a BE twin).
- ❌ **`DELETE` gated `admin` while create/edit are `manager`** — the asymmetry that
  produced a silent 403 behind a visible button. Lowered to `manager` (§7 decision 3).
- ❌ **Bearer token from a memory store** — cookie JWT (F-5). The reference's axios
  interceptor read the token from Zustand memory, so F5 logged the manager out.
- ❌ **N+1 reads** — `GetGuideRoles` per guide and `ListQuizAttempts` per progress row.
  Ours JOINs/aggregates in one query each (`BE_PLAYBOOK.md` caching-discipline rules).
- ❌ **Wrapped success payloads + inconsistent unwrapping** (§3.1 response-shape law).
- ❌ **Drafts visible to staff** — `ListGuides` had no `published` filter. Fine for the
  admin authoring view (kept), but the staff endpoint #10 is published-only.

### 3.5 Wire shapes (the FE↔BE object gallery)

> Contract shapes from this plan — field spellings get **frozen by curl receipts** when
> the AD rows build them (gate 8: FE types are written from receipts, never guessed).
> Success responses are never wrapped; only errors ride the envelope.

**`GET /admin/training/guides?role=chef` → 200** — bare array; `cover_image_path`
relative (FE rule 14 builds the URL):

```json
[ { "id": "tg1a…36", "title": "Cuốn bánh đúng cách", "role": "chef",
    "description": "Kỹ thuật tráng và cuốn bánh cho ca sáng.",
    "cover_image_path": "training/cuon-banh.jpg",
    "youtube_url": "https://youtu.be/xxxxxxxxxxx",
    "quality_kpi_target": "≥ 95% bánh đạt chuẩn",
    "quantity_kpi_target": "40 suất/giờ",
    "pass_threshold": 75, "max_attempts": 3, "published": true,
    "responsible_roles": ["chef", "manager"],
    "created_at": "2026-07-19T02:01:00Z", "updated_at": "2026-07-19T02:05:00Z" } ]
```

**`POST` / `PUT /admin/training/guides` request** — the full guide; `created_by` is
**never on the wire** (server takes it from the JWT):

```json
{ "title": "Cuốn bánh đúng cách", "role": "chef",
  "description": "Kỹ thuật tráng và cuốn bánh cho ca sáng.",
  "cover_image_path": "training/cuon-banh.jpg",
  "youtube_url": "https://youtu.be/xxxxxxxxxxx",
  "quality_kpi_target": "≥ 95% bánh đạt chuẩn", "quantity_kpi_target": "40 suất/giờ",
  "pass_threshold": 75, "max_attempts": 3, "published": true,
  "responsible_roles": ["chef", "manager"] }
```

**`GET /admin/training/guides/:id/progress?page=1&pageSize=10` → 200** — the paged
envelope; **every active staff member of the guide's role appears**, whether or not they
have started (`watched_percent: 0`, `quiz_passed: null` = "Chưa bắt đầu"):

```json
{ "data": [
    { "staff_id": "st1…36", "staff_name": "Nguyễn Văn Bếp", "staff_role": "chef",
      "watched_percent": 100, "quiz_passed": true,  "last_activity": "2026-07-19T03:20:00Z" },
    { "staff_id": "st2…36", "staff_name": "Trần Thị Bánh", "staff_role": "chef",
      "watched_percent": 40,  "quiz_passed": null,  "last_activity": "2026-07-19T03:02:00Z" },
    { "staff_id": "st3…36", "staff_name": "Lê Văn Mới",   "staff_role": "chef",
      "watched_percent": 0,   "quiz_passed": null,  "last_activity": null } ],
  "total": 12, "page": 1, "page_size": 10 }
```

`last_activity` is real `null` when absent — never `""` (F-16 wire-serialization
ruling, kills the reference's `""` vs `null` mismatch).

**`GET /admin/training/staff/:staffId/progress/:guideId` → 200** — zeroed, not 404,
when nothing has started:

```json
{ "staff_id": "st2…36", "staff_name": "Trần Thị Bánh", "staff_role": "chef",
  "guide_id": "tg1a…36", "guide_title": "Cuốn bánh đúng cách",
  "watched_percent": 40, "pass_threshold": 75, "max_attempts": 3,
  "attempts_remaining": 2, "manager_notes": "Cần luyện thêm phần tráng bánh.",
  "quiz_attempts": [ { "attempt_number": 1, "score": 60, "passed": false,
                       "created_at": "2026-07-19T03:02:00Z" } ] }
```

**`POST /training/guides/:id/quiz` request/201** — score in, verdict out (the FE never
decides pass/fail — the server owns the rule):

```json
{ "score": 80 }
→ { "attempt_number": 2, "score": 80, "passed": true, "attempts_remaining": 1 }
```

**Every error, every endpoint — one envelope** (`BE_STATE.md §4` owns the code table):

```json
{ "error": { "code": "TRAINING_ATTEMPTS_EXHAUSTED",
             "message": "Bạn đã hết lượt làm bài kiểm tra.",
             "details": [ { "field": "attempts", "issue": "max=3" } ] } }
```

`client.ts` turns the envelope into a thrown `ApiError{status, code, message, details}`.

## 4. FE plan

### 4.1 Route + file map (extends `FE_STATE.md §8`)

```
fe/src/app/(admin)/admin/training/
  page.tsx              # RSC: prefetch guides → HydrationBoundary
  loading.tsx           # layout-mirroring skeleton (header + tabs + 4 cards + table)
  error.tsx             # segment retry — scoped, NOT a full-page takeover
components/admin/training/
  RoleFilterTabs.tsx    # Tất cả · Bếp · Thu ngân · Nhân viên · Quản lý + count
  JobGuideCardGrid.tsx  # grid + skeleton + empty state
  JobGuideCard.tsx      # cover, role badge, "Nháp" overlay, KPI chips, video link, kebab
  CompletionTrackingTable.tsx  # roster table + guide selector + server pagination
  TrainingStatusBadge.tsx      # THE one place the 4 derived statuses render (§4.4 B5)
  GuideFormModal.tsx    # create/edit — RHF + Zod, full-object submit
  StaffProgressModal.tsx# per-staff detail: steps, quiz history, manager notes
queries/training.ts     # useJobGuides / useGuideProgress / useStaffProgressDetail + mutations
lib/training-status.ts  # deriveTrainingStatus() + deriveSteps() — pure, unit-tested
lib/capabilities.ts     # can('training.delete', role) — ONE source for gate + button
```

Not ported (dead in the reference's own audit): `trainingStore.ts` (a Zustand store
imported by nothing — §4.2 explains why it stays unbuilt), the unused English
`TrainingStatus` 3-state type (§6).

### 4.2 State ownership (instance of `FE_STATE.md §1` — no new kinds)

| Data | Kind | Owner |
|---|---|---|
| guides / progress rows / staff detail | server | TanStack Query (`staleTime` 5 min guides · 2 min progress) |
| active role tab, selected guide, page | **URL** (`?role=&guide=&page=`) | FE rule 2 — shareable + survives F5 |
| modal open, editing guide, selected staff | local | `useState` in `page.tsx` (lifted, not drilled) |
| guide form fields | form | RHF + Zod (`FE_STATE.md §1`) |
| staff session | session | httpOnly cookie + server verify — no auth store |

**No Zustand on this page.** Run `FE_STATE.md §1`'s decision flow and every value lands
elsewhere: server data → Query, filter/selection → URL, modal flags → `useState`.
The reference shipped `trainingStore.ts` and then never imported it — a trap for the
next reader. We don't build it (Zustand is the last resort, FE rule 1).

**Upgrade over the reference:** it held `activeRole` and the selected guide in
`useState`, so F5 reset the tab and a filtered view could not be shared or linked.
Ours are URL params — the same rule that governs the menu page's `?q=`.

**How state crosses components:** one fetch of `guides` in `page.tsx` fans out as a prop
to both the card grid and the tracking table, so both re-derive from the same array and
can never disagree about the active role. Modal opens are lifted page state + callbacks
— no sibling-to-sibling props, no context, no store.

### 4.3 Loading strategy (instance of `FE_STATE.md §4–5` — three tiers, never stacked)

**Tier 1 — route:** RSC `page.tsx` prefetches the guides query → `HydrationBoundary` →
zero-spinner first paint; `loading.tsx` streams while the RSC awaits and **mirrors the
real layout** (header + tab strip + card grid + table), never a centered spinner.
The reference had **no `loading.tsx` at all** and was `'use client'` top-to-bottom.

**Tier 2 — component. Five render branches, all named, all built:**

| Branch | When | UI |
|---|---|---|
| loading | `isPending`, no cached data | card-shaped skeletons + table row skeletons (no layout shift) |
| error | guides query failed | **inline retry panel inside the content region** — header + tabs stay put |
| empty | no guides for this role | 📚 empty state + "+ Tạo hướng dẫn" CTA |
| not-started | guides exist, no staff activity yet | roster table renders every assigned staff as "Chưa bắt đầu" — **a real state, not an error** |
| data | default | grid + populated table |

- **Deliberate upgrade:** the reference's guide-list error **replaced the entire page**
  including the header and tabs (`page.tsx:69-83`), and its only recovery was
  `window.location.reload()`. Ours scopes the error to the content region and retries
  the query, not the document.
- Skeleton count matches the **last known guide count** (falls back to 4), not a
  hardcoded 4.
- Cover images: relative `cover_image_path` → `buildImageURL()` (FE rule 14), native
  lazy loading, fixed aspect-ratio box.

**Tier 3 — mutation (pessimistic, FE rule 4):** save button disabled + inline "Đang
lưu…"; on error the modal **stays open** with the envelope message and the form intact.
Manager notes: 500 ms debounce + **flush on modal close** (prevents the lost-note race)
+ a "Đang lưu… / Đã lưu ✓" indicator. **Every mutation has an `onError`** — the
reference had none on any of its four, so create/update/delete/notes all failed
silently (§6).

### 4.4 Page behaviors (the spec the AC will test)

1. **Role tabs filter, they don't navigate.** `Tất cả · Bếp · Thu ngân · Nhân viên ·
   Quản lý` filter on the guide's **single primary `role`**; the count chip shows the
   filtered count. `responsible_roles` is a *separate* concept (secondary chips) and is
   **never** the filter key. Tab state lives in `?role=`.
2. **Guide cards** show cover (📚 fallback on missing/broken), primary role badge,
   `responsible_roles` pills, KPI chips (`📊 quality`, `🎯 quantity`, each only if set),
   a "▶ Xem video" link opening YouTube in a new tab, and a kebab (⋯) with Sửa / Xoá.
3. **Draft overlay:** `published === false` → dimmed cover + "Nháp" badge. Drafts are
   visible to manager+ in this authoring view and **invisible to staff** (§3.1 #10).
4. **Create/edit** open the same modal (RHF + Zod): `title` + `role` required;
   `pass_threshold` 50–100 default 75; `max_attempts` 1–10 default 3;
   `responsible_roles` ≥ 1; URLs valid-or-empty. Submit sends the whole object (§3.5).
   **One threshold range, one constant** — the reference's Zod said 1–100 while its own
   decision log said 50–100 (§6).
5. **Completion status is derived, never stored** — one `deriveTrainingStatus()`, one
   `TrainingStatusBadge`, four **visually distinct** states:

   | Status | Condition | Badge |
   |---|---|---|
   | `Hoàn thành` | `quiz_passed === true` | ✅ green |
   | `Chưa qua quiz` | `quiz_passed === false` | ❌ **red** |
   | `Đang học` | `quiz_passed === null && watched_percent > 0` | 🟡 amber |
   | `Chưa bắt đầu` | `quiz_passed === null && watched_percent === 0` | ⬜ neutral |

   The reference collapsed "failed quiz" and "still watching" into the **same 🟡 icon**,
   distinguishable only by a `title=` tooltip — the two states a manager most needs to
   tell apart (§6). Ours gives failure its own colour.
6. **The tracking table is a roster**, not an activity log: every active staff member
   whose role matches the guide appears, sorted by name, "Chưa bắt đầu" until they act.
   Columns: Nhân viên · Vai trò · Đã xem (bar + %) · Quiz · Cập nhật · Trạng thái.
   Server-paginated at 10/page; the footer reads "Hiển thị 1–10 trong 12 nhân viên".
7. **Guide selection is single-sourced.** The table's guide is `?guide=`, defaulting to
   the first guide of the active role. Changing the role tab **re-defaults the table's
   guide** — the reference kept a second independent `selectedGuideId` inside the table,
   so switching tabs could leave it showing a guide not in the current filter (§6).
8. **"Xem tiến trình →" on a card selects that guide** in the table and scrolls to it.
   In the reference it only scrolled, leaving the table on a different guide — the
   button appeared to do nothing.
9. **Row click → staff detail modal** with the row's real `staff_name` and `staff_role`
   (the reference passed an empty name and recovered the role from the *guide*, so the
   modal header was blank — §6). The modal shows a 3-step checklist (Xem video ≥100% ·
   Làm bài kiểm tra · Hoàn thành), quiz attempt history (số lần · điểm · đạt/không),
   `attempts_remaining`, and the manager-notes textarea.
10. **Delete is capability-gated, once.** `can('training.delete', role)` drives **both**
    the kebab item's visibility and the expectation of the BE gate; a role that cannot
    delete never sees the action. The reference rendered it unconditionally and let the
    403 die silently (§6 Bug 2).
11. **VN-first copy** — all strings Vietnamese, one constants file, no i18n framework
    yet (`OVERALL_PLAN.md §9.4` default). Page title "Đào tạo nhân viên", sub "Quản lý
    hướng dẫn và theo dõi tiến trình".
12. **Worked example everywhere** (docs, seeds, screenshots): guide "Cuốn bánh đúng
    cách" · role Bếp · 12 chef staff · 1 hoàn thành / 1 đang học / 10 chưa bắt đầu.

## 5. Task mapping — where this plan lands in TASKS.md

Training is an **AD-phase** surface (`OVERALL_PLAN.md §8`, `workforce` domain). The
Phase-4 ⛔ "Admin" row is un-deferred when AD opens; these rows get registered then —
they do **not** exist in `TASKS.md` yet.

| Proposed row | This plan's slice | Receipt type |
|---|---|---|
| AD-T1 (schema) | §3.2 four tables promoted into `DB_SCHEMA.md §4.7` + seed (1 guide + 12 chef staff) | migrate up/down + seed counts |
| AD-T2 (BE guide CRUD) | §3.1 #1–4 + the one-query JOIN for `responsible_roles` | curl: list/filter, create, replace, soft-delete, 404s |
| AD-T3 (BE progress reads) | §3.1 #5–7 + the LEFT-JOIN roster + notes upsert | curl: roster shows un-started staff; zeroed detail; note round-trip |
| AD-T4 (BE staff write path) | §3.1 #8–10 — **the half the reference never built** | curl: watch → % rises; quiz → verdict; 4th attempt 409 |
| AD-T5 (FE authoring half) | §4.1 grid/tabs/modal, §4.4 B1–B4, B10–B11 | screenshots + Zod validation cases |
| AD-T6 (FE tracking half) | §4.1 table/status/detail modal, §4.4 B5–B9 | screenshots per status + note flush test |

Sizing: each row keeps the 1-session / 1–2-file / 1-AC rule. **AD-T4 is a hard
dependency of AD-T6** — see §7 decision 1.

## 6. Reference defects designed out

| Ref finding | Severity | Our countermeasure |
|---|---|---|
| 🔴 **Bug 1** — no API path writes `training_progress`/`quiz_attempts`; 3 of 7 endpoints permanently dead | High | §3.1 #8–9 build the staff write path; **AD-T6 may not ship without AD-T4** (§7) |
| 🟠 **Bug 2** — delete button visible to managers, `DELETE` gated `admin` → silent 403 | Med | Gate lowered to `manager` **and** one `can()` capability drives both button and expectation (B10) |
| `ListGuideProgress` INNER JOINs progress → un-started staff invisible | High | Roster-first LEFT JOIN from `staff` (§3.1 #5) |
| 404 used as the empty state (endpoints 6, 7) | Med | Zeroed object + notes upsert (§3.4) |
| 🚨 Unwrap inconsistency: `r.data` on one call, `r.data.data` on five | High | Success payloads never wrapped (§3.1 response-shape law) |
| Status icon collapses "Chưa qua quiz" + "Đang học" into one 🟡 | Med | Four visually distinct badges, failure in red (B5) |
| Dead `TrainingStatus` English 3-state type vs live VN 4-state labels | Low | One derived status module, one label set (§4.1) |
| Dead `trainingStore.ts` (imported nowhere) | Low | Never built — URL + Query + `useState` cover it (§4.2) |
| `activeRole` / selected guide in `useState` → lost on F5, unshareable | Med | URL params (§4.2) |
| Table keeps a second independent `selectedGuideId` → stale on tab switch | Med | Single source `?guide=`, re-defaults with the role (B7) |
| "Xem tiến trình →" only scrolls, doesn't select the guide | Med | Selects **and** scrolls (B8) |
| Modal 2 receives an empty `staffName`; role taken from the guide | Low | Row's real `staff_name`/`staff_role` passed (B9) |
| No `onError` on any of the 4 mutations → silent failures | Med | Every mutation handles error; modal stays open (§4.3) |
| Guide-list error replaces the whole page; recovery = `window.location.reload()` | Med | Scoped `error.tsx` + query retry (§4.3) |
| No `loading.tsx`; fixed 4-card skeleton | Low | Layout-mirroring route skeleton, count-aware (§4.3) |
| N+1: roles per guide, quiz attempts per row | Low | One JOIN / one aggregate each (§3.4) |
| `PATCH` that is semantically a full replace | Low | Renamed `PUT` (§3.1 #3) |
| `pass_threshold` range drift: Zod 1–100 vs decision log 50–100 | Low | One constant, 50–100 (B4) |
| Bearer token from memory store → F5 logs the manager out | Med | httpOnly cookie JWT (F-5) |

## 7. Decisions + flags

1. 🚨 **RISK — the tracking half must not ship alone.** The reference's page *looks*
   like it tracks training and records nothing; a manager trusted an empty table for as
   long as it shipped. **Decision: AD-T6 (tracking UI) is blocked on AD-T4 (staff
   watch/quiz endpoints).** If AD-T4 slips, AD-T6 ships **without** the tracking half
   rather than with an inert one. This is the single most consequential call in the
   plan and the reason the staff-facing endpoints are scoped here at all — they are not
   this page's UI, but they are this page's **truth condition**.
2. ✅ **Roster-first progress** — the table lists every assigned staff member from the
   roster, so it is useful (and honest) from the first render, even at zero activity.
3. ✅ **`DELETE` lowered to `manager`.** The role that authors a guide owns its
   lifecycle, and delete is a reversible soft delete. The alternative (hide the button
   for managers) keeps a capability split with no product rationale. Either way the
   `can()` helper keeps button and gate in sync — 💡 say so if delete should stay
   admin-only and only the FE gate changes.
4. ✅ **Auto-assignment by role, no assignment UI.** A guide is assigned to all active
   staff whose `role` matches `guide.role` (reference decision log §3, consistent with
   its "Showing 5 of 12 staff" wireframe). No per-guide picker in v1.
5. ✅ **No Redis, no realtime.** Live admin data is do-not-cache; two managers converge
   by refetch, not push. A second manager sees a new guide on their next refetch
   (staleTime 5 min or window refocus). Adopted from the reference deliberately —
   ⚠️ if the AD phase adds an admin-wide SSE channel, training is a candidate consumer,
   not a driver.
6. ⚠️ **FLAG — `training_*` tables are `DB_SCHEMA.md §4.7` stubs.** §3.2 proposes their
   columns; the moment AD-T1 opens, those columns move to `DB_SCHEMA.md` and §3.2
   becomes a link. Until then this is the only place they are written down — a
   temporary second home, closed by AD-T1.
7. ⚠️ **FLAG — CSP and YouTube.** The reference flagged that embedding YouTube needs a
   `frame-src` allowance. **Plan default: no iframe** — the card links out to YouTube in
   a new tab, so no CSP change is needed. Revisit only if in-page playback becomes a
   requirement (it would also make watch-% tracking far more accurate, §8 note).
8. ❓ **CLARIFY — how is `watched_percent` measured?** With an out-of-page YouTube link
   (decision 7) the platform cannot observe watch time; `POST …/watch` would be driven
   by a manual "Tôi đã xem xong" confirmation (honest but self-reported), whereas an
   embedded player could report real progress. **Default: self-reported confirmation**,
   because it ships without CSP work and without the YouTube IFrame API. Decide before
   AD-T4.
9. 💡 **SUGGESTION — deferred reference proposals.** Its decision log proposed a
   `required` (bắt buộc) toggle gating shift scheduling, and a "Reset attempts" button
   for managers. Both are coherent but neither exists in the reference schema or code.
   **Deferred** — register as their own AD rows if the owner wants them; the schema in
   §3.2 leaves room for `required` as an additive column.

## 8. Verify plan (per-task receipts, logged in `harness/VERIFICATION.md`)

- **AD-T1:** migrate up/down clean; seed inserts 1 guide + 12 chef staff.
- **AD-T2:** curl transcripts — list (all + `?role=chef`), create 201, replace 200,
  soft-delete 200 then absent from list, 404 on a deleted id, 400 on a bad role.
- **AD-T3:** curl — roster returns 12 rows with 10 at `watched_percent: 0` **before any
  progress row exists** (the anti-Bug-1 receipt); zeroed detail object; note round-trip.
- **AD-T4:** curl — watch raises %, monotonic on a lower resend; quiz returns the
  server-computed verdict; the 4th attempt 409s `TRAINING_ATTEMPTS_EXHAUSTED`.
- **AD-T5/T6:** desktop-viewport screenshots per §4.4 behavior; one screenshot showing
  all four status badges distinct; a note-flush test (type → close modal → reopen).
- **This plan (F-26):** folder holds the 4 prefixed docs, all three HTML render in both
  themes, no horizontal page scroll — receipt row dated 2026-07-19.

---

*Written by F-26 (2026-07-19) from a 13-doc digest of the reference admin_training
corpus (`08_pages/admin/admin_training/` + `fe/wireframes/admin_main/admin_main_training/`).
Task status lives in `TASKS.md`; rules live in the docs in §2; this file owns only the
training page's scope, contract, and mapping.*
