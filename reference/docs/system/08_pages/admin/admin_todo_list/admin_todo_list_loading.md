# Admin Todo List — Loading States

> **TL;DR:** ✅ implemented · how `/admin/todo-list` behaves while data is in flight. No route
> `loading.tsx` and no `<Suspense>` boundary — all loading branches are handled inline by
> `isLoading` flags inside `TodoPageClient`. Two mutually exclusive main-content branches:
> (a) no staff selected → `statsQuery.isLoading` gates the stats board; (b) staff selected →
> `tasksQuery.isLoading` gates the task list. The staff dropdown query (`['admin','staff']`) has
> no skeleton and is never awaited before render. The tasks query is interaction-gated and does
> not fire until a staff member is picked.
>
> Page overview → [admin_todo_list.md](admin_todo_list.md) · BE view → [admin_todo_list_be.md](admin_todo_list_be.md)
>
> Traced from source on branch `experience_claude.md_system_1` (NOT from docs).
> Sources: `fe/src/app/(dashboard)/admin/todo-list/page.tsx` ·
> `fe/src/app/(dashboard)/admin/todo-list/components/TodoPageClient.tsx` ·
> `fe/src/app/(dashboard)/admin/todo-list/components/TodoPageSkeleton.tsx` ·
> `fe/src/hooks/useTodoTasks.ts` · `fe/src/features/admin/admin.api.ts`

---

## Loading Layers (outer → inner)

```
1. Route loading.tsx  → DOES NOT EXIST for this route (see §1)
2. Suspense boundary  → NONE (no useSearchParams or streaming — page.tsx is a thin wrapper)
3. Per-query states   → handled inline in TodoPageClient via isLoading flags (see §2)
```

### 1 — No route-level spinner

`fe/src/app/(dashboard)/admin/todo-list/` contains only `page.tsx` and `components/` — there is
**no `loading.tsx`** in this folder and no `loading.tsx` in any ancestor `(dashboard)` route group
that would apply here. During Next.js App Router navigation into this route, the browser shows no
framework-provided loading indicator.

`page.tsx:1-5` is a 5-line thin wrapper:

```tsx
import { TodoPageClient } from './components/TodoPageClient'

export default function TodoListPage() {
  return <TodoPageClient />
}
```

No `<Suspense>` wrapper, no `loading.tsx`, no `generateStaticParams`. All async work is
client-side TanStack Query.

### 2 — Per-query states inside `TodoPageClient`

`TodoPageClient.tsx` fires **three** TanStack Query calls on mount. Only two have visible loading
UI; the third (staff list) silently populates a dropdown.

| # | Hook / queryKey | `staleTime` | `enabled` | Loading UI | Source |
|---|---|---|---|---|---|
| 1 | `useQuery(['admin','staff'])` via `listStaff` | 60 000 ms | always | **none** — `<select>` populates when it resolves | `TodoPageClient.tsx:35-39` |
| 2 | `useTaskStats(date)` → `['admin','tasks','stats',date]` | 30 000 ms | always | `<TodoPageSkeleton/>` (stats branch, §3a) | `TodoPageClient.tsx:44` · `useTodoTasks.ts:16-21` |
| 3 | `useTodoTasks(staffId,date)` → `['admin','tasks',staffId,date]` | 15 000 ms | `!!staffId` | `<TodoPageSkeleton/>` (tasks branch, §3b) | `TodoPageClient.tsx:47` · `useTodoTasks.ts:7-13` |

`staleTime` means: within the window a revisit does NOT re-trigger `isLoading = true`; the cached
data is shown immediately. After the window expires, a background refetch runs but does not set
`isLoading` (only `isFetching`) — so the skeleton does **not** flash on background refreshes.

---

## Main content branch · `TodoPageClient.tsx:93-183`

The main content area below the filter bar renders one of **two mutually exclusive branches**,
keyed on whether `staffId` is set (`filters.assigned_to ?? null`). The two branches never overlap.

### Branch A — No staff selected (`!staffId`) · lines 93-154

Renders the **stats board** (daily metrics + per-staff table).

| Order | Condition | Renders | Line |
|---|---|---|---|
| 1 | `statsQuery.isLoading` | `<TodoPageSkeleton/>` | `95-96` |
| 2 | `statsQuery.data` (truthy) | metrics grid + per-staff table | `97-152` |
| 3 | otherwise (`data` is `undefined`/`null`) | **nothing** (renders `null`) | `152` |

The `{statsQuery.data ? (...) : null}` guard means a failed or empty-data stats fetch renders a
completely blank content area — no error banner, no empty message. See Flags §1.

### Branch B — Staff selected (`staffId` truthy) · lines 157-183

Renders the **task list** for the selected staff member.

| Order | Condition | Renders | Line |
|---|---|---|---|
| 1 | `tasksQuery.isLoading` | `<TodoPageSkeleton/>` | `159-160` |
| 2 | `!tasksQuery.isLoading` | mobile cards + desktop table (possibly empty) | `161-182` |

Unlike Branch A, Branch B has **no error state** — a failed tasks query silently renders the
empty-state UI (zero-length array via `tasksQuery.data ?? []`).

---

## Skeleton · `TodoPageSkeleton.tsx:1-11`

Both branches reuse the **same single skeleton component** — there is no separate skeleton for
stats vs. tasks.

```
animate-pulse, space-y-3
  ├── h-8  w-48  bg-gray-200 rounded   ← title-bar placeholder
  ├── h-10       bg-gray-200 rounded   ← filter/header row placeholder
  └── h-14 × 5  bg-gray-200 rounded   ← 5 row placeholders
```

The skeleton is **not** responsive (no mobile/desktop variants). It renders at full container
width regardless of viewport. Total: 7 placeholder blocks (`1 + 1 + 5`).

---

## Empty states (post-load, data resolved)

### Tasks empty (Branch B, no tasks for selected staff + date)

| Viewport | Message | Location |
|---|---|---|
| Mobile (`md:hidden`) | `"Không có công việc nào"` | `TodoPageClient.tsx:169` |
| Desktop (`hidden md:block`) | `"Không có công việc nào cho bộ lọc này"` | `TodoTaskTable.tsx:21` |

The two viewports show **different** empty-state copy for the same zero-task condition.

### Stats null (Branch A, stats fetch returned no data)

No message — the `{statsQuery.data ? (...) : null}` guard renders nothing. No "no data"
placeholder exists (`TodoPageClient.tsx:152`).

---

## Search/interaction gating · `useTodoTasks.ts:11`

```ts
enabled: !!staffId,
```

The tasks query (`['admin','tasks',staffId,date]`) is **never fired** until `staffId` is non-null.
`staffId` is derived from `filters.assigned_to ?? null` (`TodoPageClient.tsx:31`), which starts
as `null` (no staff pre-selected, `TodoPageClient.tsx:26`).

The user must pick a staff member from the `<TodoFilterBar>` dropdown to trigger the first fetch.
Until then:

- Branch B (`{staffId && ...}`) is not rendered at all.
- Branch A (stats board) is always visible on first load.
- The staff dropdown itself is populated by the staff-list query (`['admin','staff']`, `staleTime: 60_000`), which fires unconditionally on mount — but the page does **not** wait for it before rendering; the `<select>` starts empty and populates when the query resolves.

There is **no search input** that gates a fetch on character count (unlike `/menu` which gates on
`searchQuery.length >= 2`). The filter bar exposes date + staff dropdowns, not a text search box.

---

## Create mutation pending · `CreateEditTaskModal.tsx:184-187` · `TodoPageClient.tsx:193`

When the "Lưu công việc" / "Cập nhật" button is clicked:

- `createTask.mutate(...)` is called → `createTask.isPending` becomes `true`.
- `isSubmitting={createTask.isPending}` is passed to `<CreateEditTaskModal>`.
- Inside the modal: the submit button is `disabled={isSubmitting}` and its label changes to
  `"Đang lưu..."` while `isSubmitting` is true (`CreateEditTaskModal.tsx:184-187`).
- On success: `setModalOpen(false)` closes the modal; TanStack Query invalidates
  `['admin','tasks',staffId,date]` and `['admin','tasks','stats']` → the stats and tasks queries
  refetch in the background without triggering `isLoading` (cached data stays visible until new
  data lands).

The modal itself has no skeleton — it either shows the form or the "Đang lưu..." disabled button.

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|---|---|
| 1 | **No error UI for any query** | `statsQuery` error renders nothing (Branch A falls through to `null`). `tasksQuery` error renders the empty-state UI. Staff-list error leaves the dropdown empty with no message. None of the three queries wires `isError` to an error banner or retry button. |
| 2 | **Stats null = blank page section** | `{statsQuery.data ? (...) : null}` — if the BE returns `null`/`undefined` for stats (e.g. no tasks exist for today), the entire content area is blank. There is no "no data yet" placeholder. |
| 3 | **Single skeleton for two conceptually different states** | `<TodoPageSkeleton/>` is used identically for both a stats-board load and a task-list load. The shape (7 rows) does not match either destination layout, so there is layout shift when data resolves. |
| 4 | **No `loading.tsx` — no navigation indicator** | Users navigating from another admin page to `/admin/todo-list` see no framework loading indicator. If the JS bundle is not cached, the transition is a blank flash. |
| 5 | **Mobile/desktop empty-state copy diverges** | Same zero-task condition shows two different strings. See "Empty states" section above. |
| 6 | **Staff dropdown has no loading indicator** | The `useQuery(['admin','staff'])` result is used immediately as `staffData?.data ?? []`. If the staff list has not resolved yet, the dropdown is empty with no spinner or placeholder — user cannot tell if it is loading or genuinely empty. |
