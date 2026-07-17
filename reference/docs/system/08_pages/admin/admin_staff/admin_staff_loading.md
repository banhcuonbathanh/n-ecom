# Admin Staff — Loading & Data-in-Flight — `/admin/staff`

> **TL;DR:** ✅ implemented · The page has **four loading layers**: (1) the route-level
> `admin/loading.tsx` spinner during the Next.js segment transition, (2) the `AuthGuard`/`RoleGuard`
> gate that blanks the whole shell until auth resolves, (3) the **list query** `['admin','staff']`
> whose `isLoading` swaps the table for a one-line "Đang tải..." (the StatsBar is simply hidden),
> and (4) the **detail-drawer query** `['admin','staff',id]` with its own "Đang tải..." panel. There
> are **no skeletons** — every in-flight state is a centered spinner or a text line. Mutations don't
> block the page; they disable the modal submit button and toast on settle.
>
> **Sources:** [`admin/loading.tsx`](../../../../../fe/src/app/(dashboard)/admin/loading.tsx) ·
> [`admin/layout.tsx`](../../../../../fe/src/app/(dashboard)/admin/layout.tsx) ·
> [`admin/staff/page.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/page.tsx) ·
> [`StaffDetailDrawer.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/components/StaffDetailDrawer.tsx) ·
> [`AddEditStaffModal.tsx`](../../../../../fe/src/app/(dashboard)/admin/staff/components/AddEditStaffModal.tsx).
> **Siblings:** [admin_staff.md](admin_staff.md) · [admin_staff_be.md](admin_staff_be.md) ·
> [admin_staff_crosspage_dataflow.md](admin_staff_crosspage_dataflow.md).

---

## Loading Layers (outer → inner)

### 1 · Route segment spinner — `admin/loading.tsx`
Shared by **every** `/admin/*` page. While Next.js loads the `staff` segment's JS/RSC payload, it
renders a centered orange spinner inside an `h-64` box (`admin/loading.tsx:1-7`). This is brief
(client navigation between admin tabs) and is replaced the moment `staff/page.tsx` mounts.

### 2 · Auth/role gate — `AuthGuard` + `RoleGuard minRole=MANAGER`
The admin shell wraps the page (`admin/layout.tsx:29-30`). Until the auth store has hydrated and the
role is confirmed ≥ manager, the guards render their own fallback (blank/redirect) — the page
content never paints for an unauthorized or not-yet-resolved session. A non-manager is redirected
away rather than shown a loading state.

### 3 · Staff list query — `['admin','staff']`
The page's primary fetch: `useQuery({ queryKey:['admin','staff'], queryFn:listStaff, staleTime:0,
refetchOnWindowFocus:true })` (`page.tsx:42-47`). Three terminal branches, checked in this order in
the render body:

| Branch | Condition | What renders |
|--------|-----------|--------------|
| **Error** | `isError` | `EmptyState "Không tải được danh sách. Thử lại."` + a "Thử lại" button calling `refetch()` (`page.tsx:139-153`). Replaces the entire body. |
| **Loading** | `isLoading` | Header (Zone A) renders with `totalCount=0`; **StatsBar (Zone B) is hidden** (`!isLoading &&`, `page.tsx:163`); the table region shows a single centered line **"Đang tải..."** (`page.tsx:173-174`); Pagination still renders (1 page). |
| **Success** | data present | Full table of the current client-paginated slice (`page.tsx:176-185`). |

`staleTime: 0` + `refetchOnWindowFocus: true` means the list **refetches every time the tab regains
focus** — a background refetch shows no spinner (data stays on screen) but silently reconciles, so a
staff change made on another device appears when this manager tabs back (see
[crosspage §multi-device](admin_staff_crosspage_dataflow.md)).

### 4 · Detail-drawer query — `['admin','staff',id]`
Opened lazily: `StaffDetailDrawer` is a `next/dynamic` import (`page.tsx:18-20`), so the first 👁
tap also pays a one-time chunk fetch. Inside, `useQuery` is `enabled: !!staffId && open`,
`staleTime: 30s` (`StaffDetailDrawer.tsx:54-59`). While `isLoading || !staff`, the drawer body is a
centered **"Đang tải..."** at `h-48` (`StaffDetailDrawer.tsx:66-67`); on success it renders the
avatar header + the four tabs. No error branch — a failed detail fetch leaves the "Đang tải..."
panel until the user closes the drawer (Flag 1).

### M1 · Add/Edit modal — not a fetch, a mutation
`AddEditStaffModal` (also `next/dynamic`, `page.tsx:15-17`) has no query. Its only in-flight state
is the `loading` prop = `createMut.isPending || editMut.isPending` (`page.tsx:155,199`), which
disables the submit button and switches its label to **"Đang lưu..."** (`AddEditStaffModal.tsx:208-211`).
The page behind the modal is not blocked. On success the mutation `invalidate()`s `['admin','staff']`
(triggering layer 3's background refetch), toasts, and closes the modal; on error it toasts and
leaves the modal open with the user's input intact.

---

## Main content branch (priority order)

The table region (`page.tsx:172-185`) resolves in this order:

1. **`isError`** → handled earlier as a full-body replacement (retry UI) — the table region is not
   reached.
2. **`isLoading`** → "Đang tải..." text line.
3. **empty result** → `StaffTable` receives `staff=[]` and renders its own
   `EmptyState "Không có nhân viên nào phù hợp."` (`StaffTable.tsx:52-54`). This covers both "no
   staff exist" and "filters matched nothing" — they are indistinguishable (Flag 2).
4. **rows** → the table.

There is **no skeleton row** state — the gap between layer-1 spinner and the table is the plain
"Đang tải..." line.

---

## Search / interaction gating

None. The FilterBar (search/role/status) operates **purely on already-fetched data** — typing into
search does not trigger or withhold any fetch; it just re-runs the client-side `filtered` memo and
resets to page 1 (`page.tsx:51-60,167-169`). So there is no debounce, no per-keystroke request, and
no "searching…" state — results filter instantly with zero network cost. (The BE's `search`/`role`
params exist but this page never sends them — see [be Flag 2](admin_staff_be.md).)

---

## Flags / Known Gaps

| # | Gap | Detail |
|---|-----|--------|
| 1 | **Drawer has no error branch** | A failed `GET /staff/:id` (e.g. 404 after the row was deleted on another device) leaves the drawer stuck on "Đang tải..." until manually closed — `isLoading || !staff` can't tell "loading" from "errored" (`StaffDetailDrawer.tsx:66`). |
| 2 | **Loading vs empty vs no-match are three different surfaces but two of them look identical** | `isLoading` → "Đang tải..." (page-level); empty data **and** filtered-to-nothing both → the same `EmptyState` (table-level), so a manager can't tell "we have no staff" from "your filter is too narrow". |
| 3 | **StatsBar flashes in after the table** | Zone B is gated on `!isLoading` (`page.tsx:163`) while Zone D shows its own loading line — on first paint the stats bar is simply absent, then pops in. Minor layout shift, no skeleton placeholder. |
| 4 | **Refetch-on-focus is silent** | `refetchOnWindowFocus:true` + `staleTime:0` refetch the list on every focus with no visible indicator; the table shows stale rows until the refetch settles, then swaps. Fine for a low-write roster. |
