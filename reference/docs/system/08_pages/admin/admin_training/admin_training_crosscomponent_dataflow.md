# Staff Training — Cross-Component Dataflow

> **TL;DR:** ✅ implemented. How the widgets on `/admin/training` share state **without
> prop-drilling between siblings**. The "single source" here is **not a Zustand store** —
> `fe/src/store/trainingStore.ts` is dead (imported nowhere). Coordination runs through (a) the
> **TanStack Query cache** and (b) **page-level React state lifted into `page.tsx`**. Source:
> `fe/src/app/(dashboard)/admin/training/page.tsx` · `fe/src/hooks/useTrainingQueries.ts` ·
> `fe/src/components/admin/training/*`. Page view → [admin_training.md](admin_training.md) · BE →
> [admin_training_be.md](admin_training_be.md).

---

## 0. The action, in one line

**A manager picks a role tab; the card grid and the tracking table both re-derive from the same
`guides` array; opening/editing a guide or a staff row is driven by page-level state — no widget
passes data to a sibling directly.**

```
                ┌───────────────── page.tsx (lifted React state) ─────────────────┐
                │ activeRole · editingGuide · guideModalOpen ·                     │
                │ progressModalOpen · selectedStaffId/GuideId/Name/Role            │
                └──────────────────────────────────────────────────────────────────┘
                          │ activeRole                       ▲ setSelected…/setOpen
                          ▼                                   │ (callbacks)
   RoleFilterTabs ──onRoleChange──▶ useJobGuides(activeRole) ─┤
        (Zone B)                          │ TanStack Query     │
                                          │ ['training','guides',role]
                       ┌──────────────────┴───────────────────┐
                       ▼                                       ▼
              JobGuideCardGrid (Zone C)              CompletionTrackingTable (Zone D)
              ├─ onEdit ──▶ editingGuide ──▶ Modal 1  ├─ useGuideProgress(guideId,page)
              ├─ onDelete ─▶ deleteGuide.mutate        │   ['training','progress',guideId,page]
              └─ onViewProgress ─▶ scrollIntoView      └─ row click ─▶ selectedStaffId/GuideId
                                                                   │
                                                                   ▼
                                                      TrainingProgressModal (Modal 2)
                                                      └─ useStaffProgressDetail(staffId,guideId,open)
                                                          ['training','staffProgress',…]
```

---

## 1. The cast of components

| Widget | File | Reads | Writes |
|--------|------|-------|--------|
| RoleFilterTabs (B) | `RoleFilterTabs.tsx` | `activeRole`, `guides.length` | `activeRole` via `onRoleChange` (`page.tsx:102-106`) |
| JobGuideCardGrid → JobGuideCard (C) | `JobGuideCardGrid.tsx`, `JobGuideCard.tsx` | `guides`, `isLoading` | `editingGuide`/`guideModalOpen` (edit), `deleteGuide` mutation, scroll (`onViewProgress`) |
| CompletionTrackingTable (D) | `CompletionTrackingTable.tsx` | `guides` (selector), own `useGuideProgress` | `selectedStaffId/guideId` via `onViewStaffProgress` (`page.tsx:125-129`) |
| CreateEditGuideModal (Modal 1) | `CreateEditGuideModal.tsx` | `editingGuide`, `guideModalOpen` | `createGuide`/`updateGuide` mutations (`page.tsx:138-139`) |
| TrainingProgressModal (Modal 2) | `TrainingProgressModal.tsx` | `progressDetail`, `selectedStaff*` | `useUpdateManagerNotes` mutation (debounced) |

---

## 2. The single source

### 2.1 Exact traced shape — two sources, no store

**(a) Page-level React state** (`page.tsx:17-28`):
```ts
const [activeRole, setActiveRole] = useState<StaffRole | 'all'>('all')   // :17
const [guideModalOpen, setGuideModalOpen] = useState(false)              // :20
const [editingGuide, setEditingGuide] = useState<JobGuide | null>(null)  // :21
const [progressModalOpen, setProgressModalOpen] = useState(false)        // :24
const [selectedStaffId, setSelectedStaffId] = useState('')               // :25
const [selectedGuideId, setSelectedGuideId] = useState('')               // :26
const [selectedStaffName, setSelectedStaffName] = useState('')           // :27
const [selectedStaffRole, setSelectedStaffRole] = useState<StaffRole>('staff') // :28
```

**(b) TanStack Query cache** (`useTrainingQueries.ts`):
- `['training','guides',role]` — guide list, staleTime 5 min (`:14-20`).
- `['training','progress',guideId,page]` — per-guide staff progress, staleTime 2 min, `enabled:!!guideId` (`:22-28`).
- `['training','staffProgress',staffId,guideId]` — Modal 2 detail, `enabled: open && !!staffId && !!guideId` (`:30-35`).

### 2.2 Selectors

There are no Zustand selectors (no store). Widgets "select" by either receiving the page-level
value as a prop (e.g. `activeRole`, `guides`) **or** calling the relevant query hook directly
(`CompletionTrackingTable` calls `useGuideProgress`; Modal 2 calls `useStaffProgressDetail`). The
shared `guides` array is fetched once by the page (`page.tsx:31`) and passed to both Zone C and
Zone D, so both stay in lockstep with the active role.

---

## 3. The action, step by step

- **Step 1 — Tab change.** `RoleFilterTabs.onRoleChange(value)` → `setActiveRole` (`page.tsx:105`).
  WRITES `activeRole`.
- **Step 2 — Refetch.** `useJobGuides(activeRole)` key changes → new `GET …/guides?role=` →
  cache `['training','guides',role]` updated. READS by page → `guides`.
- **Step 3 — Fan-out.** `guides` flows as a prop into **both** `JobGuideCardGrid` (`page.tsx:110-117`)
  and `CompletionTrackingTable` (`page.tsx:121-130`). Both re-render; no sibling-to-sibling prop.
- **Step 4a — Edit.** Card "Chỉnh sửa" → `onEdit(guide)` → `setEditingGuide`+`setGuideModalOpen`
  (`page.tsx:54-57`). Modal 1 reads `editingGuide` and submits `updateGuide.mutateAsync` (`:139`),
  whose `onSuccess` invalidates `['training','guides']` → Step 2 repeats.
- **Step 4b — Delete.** Card "Xoá" → `confirm()` → `deleteGuide.mutate(id)` (`page.tsx:59-62`);
  invalidates the same key. ⚠️ 403 for a manager ([Bug 2](TRAINING_BUGS.md)).
- **Step 5 — View staff progress.** Tracking row click → `onViewStaffProgress(staffId,guideId)`
  (`CompletionTrackingTable.tsx:95`) → page resolves the guide's role and sets
  `selectedStaff*`+`progressModalOpen` (`page.tsx:46-52,125-129`). Modal 2's
  `useStaffProgressDetail(staffId,guideId,open)` fires. ⚠️ always 404 ([Bug 1](TRAINING_BUGS.md)).

---

## 4. Three layers of state

| Layer | What lives here | Example |
|-------|-----------------|---------|
| Server cache (TanStack Query) | guide list + progress reads | `['training','guides',role]` |
| Page-level React state | which modal is open, which guide/staff is selected, active filter | `editingGuide`, `selectedStaffId` |
| Widget-local state | transient UI | `JobGuideCard.menuOpen`, `CompletionTrackingTable.selectedGuideId/page`, Modal 2 `notes`+debounce ref |

Nothing belongs in a Zustand store here — and indeed nothing uses `trainingStore.ts` (dead).

---

## 5. Cross-component vs cross-page

This file covers coordination **within the single `/admin/training` mount**. Once a guide is
created/edited it is written to the server DB and that data's life **across pages/devices** (there
are none that read it — sole producer/consumer; refetch-only, no realtime) is covered in
[admin_training_crosspage_dataflow.md](admin_training_crosspage_dataflow.md).

---

## 6. Gotchas worth remembering

- **`trainingStore.ts` is a trap** — it exists under `fe/src/store/` but is imported nowhere; do
  not assume the page uses it. All shared state is Query cache + `page.tsx` `useState`.
- **`guideCount` in Zone B is `guides.length`** (post-filter), so it reflects the active role's
  count, not the global total (`page.tsx:104`).
- **CompletionTrackingTable keeps its own `selectedGuideId`** (defaults to `guides[0]`,
  `CompletionTrackingTable.tsx:25`) — independent of Zone C; switching the Zone B role can leave
  the table's selected guide stale until its dropdown re-defaults.
- **"Xem tiến trình →" ≠ Modal 2** — it only scrolls (`page.tsx:42-44`); Modal 2 opens from a row.
- The whole Step 5 path is real wiring but **never has data** (Bug 1).

---

## 7. The whole action on one timeline

```
tab "Bếp" → setActiveRole('chef') → useJobGuides refetch (GET …?role=chef)
   → guides=[…] → JobGuideCardGrid render + CompletionTrackingTable render
        → card "Chỉnh sửa" → editingGuide=g, guideModalOpen=true → Modal 1
             → save → updateGuide → invalidate ['training','guides'] → refetch
        → tracking row → selectedStaff*, progressModalOpen=true → Modal 2
             → useStaffProgressDetail → (404 in practice) → empty state
```

---

## 8. Source & rule map

- Lifted state + handlers: `fe/src/app/(dashboard)/admin/training/page.tsx:17-67,102-151`
- Query keys + invalidation: `fe/src/hooks/useTrainingQueries.ts:14-69`
- Widgets: `fe/src/components/admin/training/{RoleFilterTabs:24-36, JobGuideCardGrid:22-61, JobGuideCard:54-125, CompletionTrackingTable:24-96, TrainingProgressModal:54-64}.tsx`
- Dead store: `fe/src/store/trainingStore.ts` (no importers)
- BE endpoints + auth: [admin_training_be.md](admin_training_be.md) · bugs: [TRAINING_BUGS.md](TRAINING_BUGS.md)
