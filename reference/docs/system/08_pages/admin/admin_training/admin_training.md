# Staff Training — `/admin/training`

> **TL;DR:** ✅ implemented. Manager-facing page to author **job guides** (title, role, video,
> KPI targets, pass rules) and — in theory — track each staff member's completion. The authoring
> half (Zones B/C + Modal 1) works end-to-end; the **tracking half (Zone D + Modal 2) is inert
> in code** because no API path ever records progress/quiz data ([TRAINING_BUGS.md](TRAINING_BUGS.md)
> Bug 1). Backend detail → [admin_training_be.md](admin_training_be.md). Source traced:
> `fe/src/app/(dashboard)/admin/training/page.tsx` + `fe/src/components/admin/training/*`.

---

## ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────┐
│ Đào tạo nhân viên                              [+ New Guide]   │  ← A  Page Header (sticky)
│ Quản lý hướng dẫn và theo dõi tiến trình                       │
├──────────────────────────────────────────────────────────────┤
│ (Tất cả) (Bếp) (Thu ngân) (Nhân viên) (Quản lý)   N hướng dẫn │  ← B  RoleFilterTabs (sticky)
├──────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐                          │
│  │ [cover]  ⋮    │  │ [cover]  ⋮    │                          │  ← C  JobGuideCardGrid
│  │ [role] "Nháp" │  │ [role]        │     (2-col grid)         │
│  │ Title         │  │ Title         │                          │
│  │ ▶ Xem video   │  │ ▶ Xem video   │                          │
│  │ 📊 KPI 🎯 KPI │  │ 📊 KPI        │                          │
│  │ Xem tiến trình│  │ Xem tiến trình│                          │
│  └───────────────┘  └───────────────┘                          │
├──────────────────────────────────────────────────────────────┤
│ Completion Tracking — <guide>          [guide selector ▼]      │  ← D  CompletionTrackingTable
│ ┌──────────────────────────────────────────────────────────┐  │     (only if guides.length>0)
│ │ Nhân viên │ Vai trò │ Đã xem │ Quiz │ Cập nhật │ Trạng thái│  │
│ │  … (always empty in practice — see Bug 1) …               │  │
│ └──────────────────────────────────────────────────────────┘  │
│ Hiển thị 1–N trong M nhân viên              ← 1 2 3 →           │
└──────────────────────────────────────────────────────────────┘

Overlays (lazy via next/dynamic):
  • Modal 1 — CreateEditGuideModal   (+ New Guide / card "Chỉnh sửa")
  • Modal 2 — TrainingProgressModal  (card "Xem tiến trình →" / tracking-row click)
```

Wrapped by the **admin shell** (`(dashboard)/admin/layout.tsx` — AuthGuard + RoleGuard
`minRole=MANAGER` + tab nav). See [PAGES_INDEX.md](../../PAGES_INDEX.md) "Admin shell".

---

## Zones

| Zone | Component (`fe/src/...`) | Data source |
|------|--------------------------|-------------|
| A · Page Header | inline in `app/(dashboard)/admin/training/page.tsx:87-99` | static; "+ New Guide" → opens Modal 1 |
| B · Role Filter Tabs | `components/admin/training/RoleFilterTabs.tsx` | local `activeRole` state; count = `guides.length` |
| C · Job Guide Cards | `components/admin/training/JobGuideCardGrid.tsx` → `JobGuideCard.tsx` | `useJobGuides(activeRole)` → **`GET /admin/training/guides?role=`** ([be](admin_training_be.md#1--get-admintrainingguidesrole)) |
| D · Completion Tracking | `components/admin/training/CompletionTrackingTable.tsx` | `useGuideProgress(guideId,page)` → **`GET /admin/training/guides/:id/progress`** — ⚠️ always empty ([Bug 1](TRAINING_BUGS.md)) |
| Modal 1 · Create/Edit Guide | `components/admin/training/CreateEditGuideModal.tsx` | **`POST`/`PATCH /admin/training/guides`** |
| Modal 2 · Staff Progress | `components/admin/training/TrainingProgressModal.tsx` | `useStaffProgressDetail` → **`GET /admin/training/staff/:staffId/progress/:guideId`** + notes `PATCH` — ⚠️ always 404 ([Bug 1](TRAINING_BUGS.md)) |

All endpoint internals (auth, service, SQL) live in the BE twin — do not restate them here.

---

## Key Interactions

- **Tap a role tab** (`RoleFilterTabs.tsx:24-36`) → sets `activeRole` → `useJobGuides` refetches; Zone C grid **and** Zone D table both re-derive from the new `guides` array.
- **"+ New Guide"** (header or empty-state, `page.tsx:64-67,93-98`) → opens Modal 1 with `editingGuide=null`.
- **Card kebab "⋮" → "Chỉnh sửa"** (`JobGuideCard.tsx:61-66`) → opens Modal 1 prefilled (`editingGuide=guide`).
- **Card kebab "⋮" → "Xoá"** (`JobGuideCard.tsx:67-72`) → `confirm()` then `deleteGuide.mutate(id)` (`page.tsx:59-62`). ⚠️ 403s for a manager — delete is admin-only ([Bug 2](TRAINING_BUGS.md)).
- **Card "Xem tiến trình →"** (`JobGuideCard.tsx:120-125`) → `handleViewProgress` just smooth-scrolls to Zone D (`page.tsx:42-44`); it does **not** open Modal 2.
- **Click a tracking-table row** (`CompletionTrackingTable.tsx:91-96`) → `handleViewStaffProgress` → opens Modal 2 for that staff+guide (`page.tsx:46-52`).
- **Modal 2 manager-notes textarea** (`TrainingProgressModal.tsx:194-200`) → 800 ms debounced `PATCH …/progress` (⚠️ always 404, silent — Bug 1).
- **Zone C draft overlay** "Nháp" shows when `!guide.published` (`JobGuideCard.tsx:37-43`).

---

## Business Logic Used

- **RBAC** — page gated `minRole=MANAGER`; guide writes are `manager`, **delete is `admin`** → see [../../../02_spec/BUSINESS_RULES.md](../../../02_spec/BUSINESS_RULES.md) (RBAC) and the [BE auth model](admin_training_be.md#auth-model-on-this-page). Do not restate the role hierarchy here.
- **Training domain model + pass rules** (`passThreshold`, `maxAttempts`, soft-delete) → owned by the schema [../../../02_spec/DB_SCHEMA.md](../../../02_spec/DB_SCHEMA.md) (`training_*` tables) and [LOGIC_BE.md](../../../07_business_logic/LOGIC_BE.md).
- **Caching/realtime** — none server-side; client cache + invalidation rules → [admin_training_be.md](admin_training_be.md#caching--invalidation). Cross-device behaviour → [admin_training_crosspage_dataflow.md](admin_training_crosspage_dataflow.md).

---

## Object Model

Only the shapes this page owns are listed; full FE types in `fe/src/types/training.ts`.

### §1 JobGuide (Zone C card)

FE `JobGuide` (`types/training.ts:3-18`) ⇄ BE `guideToJSON` (`training_handler.go:204-221`) ⇄ DB `training_guides` (`014_training.sql:2-24`):

| FE field | BE JSON | DB column | Notes |
|----------|---------|-----------|-------|
| `id` | `id` | `id` CHAR(36) | UUID |
| `title` | `title` | `title` | required |
| `role` | `role` | `role` ENUM | primary role (drives Zone B filter) |
| `description` | `description` | `description` | nullable |
| `coverImageUrl` | `coverImageUrl` | `cover_image_url` | nullable |
| `youtubeUrl` | `youtubeUrl` | `youtube_url` | "▶ Xem video" link |
| `qualityKpiTarget` / `quantityKpiTarget` | same | `quality_/quantity_kpi_target` | KPI chips |
| `passThreshold` | `passThreshold` | `pass_threshold` | default 75 |
| `maxAttempts` | `maxAttempts` | `max_attempts` | default 3 |
| `published` | `published` | `published` | `false` ⇒ "Nháp" overlay |
| `responsibleRoles` | `responsibleRoles` | `training_guide_roles` (join) | secondary role chips |
| `createdAt` / `updatedAt` | same | `created_at` / `updated_at` | — |

### §2 StaffProgressRow / StaffProgressDetail (Zone D + Modal 2)

`StaffProgressRow` (`types/training.ts:22-31`) and `StaffProgressDetail` (`:40-52`) map to
`training_progress` + `quiz_attempts` (`014_training.sql:34-61`). **Field shapes are owned by the
BE serializers** `progressRowToJSON` / `progressDetailToJSON` (`training_handler.go:223-271`) — see
the [BE per-endpoint detail](admin_training_be.md#5--get-admintrainingguidesidprogresspagepagesize).
⚠️ These objects are never populated in practice (Bug 1).

### Flags / Known Mismatches

1. **🔴 Tracking half is dead** — Zone D + Modal 2 + manager-notes can only ever show empty/404
   states; no API writes `training_progress`/`quiz_attempts`. [TRAINING_BUGS.md](TRAINING_BUGS.md) Bug 1.
2. **🟠 Delete button shows for managers but `DELETE` is admin-only** → silent 403, no `onError`
   toast. [TRAINING_BUGS.md](TRAINING_BUGS.md) Bug 2.
3. **`trainingStore.ts` is dead** — `fe/src/store/trainingStore.ts` is imported by nothing; the page
   coordinates via TanStack Query cache + page-level React state (see
   [admin_training_crosscomponent_dataflow.md](admin_training_crosscomponent_dataflow.md)).
4. **"Xem tiến trình →"** on a card does NOT open Modal 2 — it only scrolls to Zone D
   (`page.tsx:42-44`). Modal 2 opens only from a tracking-row click.
5. **`ListGuides` returns drafts** — `published=0` guides appear in Zone C with a "Nháp" overlay;
   there is no publish gate on the list.
