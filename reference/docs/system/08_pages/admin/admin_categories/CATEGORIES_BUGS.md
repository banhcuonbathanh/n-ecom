# Admin Categories — Code Bugs

> **TL;DR:** **1 code bug** found tracing `/admin/categories` on branch
> `experience_claude.md_system_1`. These are **code** bugs (FE and BE disagree), **not** stale docs —
> the doc skill does not fix app code; it records them so the owner can register a fix.
> Anchor: [admin_categories_be.md](admin_categories_be.md) (Flag 7) ·
> Decision Log: [../../07_business_logic/LOGIC_INDEX.md](../../07_business_logic/LOGIC_INDEX.md).
>
> Per CLAUDE.md a fix must be **registered in `docs/tasks/MASTER_TASK.md` + ALIGNed** before any code
> change — these are **not** yet on MASTER.

---

## Severity at a Glance

| # | Bug | Severity | Surface affected | Fix side |
|---|-----|----------|------------------|----------|
| 1 | Manager sees the 🗑 "Xóa" button but `DELETE /categories/:id` is admin-only → silent, mislabelled 403 | 🟠 Med | `/admin/categories` delete (any manager, not admin) — **cross-cutting** (same class as A12 Training Bug 2, A3 Products DELETE) | FE |

---

## Bug 1 — Manager's delete button silently 403s (mislabelled "Không thể xóa danh mục")

**Symptom.** A user with the `manager` role opens `/admin/categories` (the admin shell guard is
`minRole=MANAGER`, so managers reach the page), sees the red **"Xóa"** button on every row, clicks
it, confirms the `window.confirm`, and the row does **not** disappear — they get a generic toast
**"Không thể xóa danh mục"**. Nothing tells them deletion is an admin-only action; it looks like a
server failure.

**Root cause.** The button renders unconditionally (no role check):

- FE renders "Xóa" for every row regardless of role —
  [`page.tsx:131-136`](../../../../../fe/src/app/(dashboard)/admin/categories/page.tsx#L131-L136),
  handler `handleDelete` → `deleteMut.mutate(id)`
  ([`page.tsx:79-82`](../../../../../fe/src/app/(dashboard)/admin/categories/page.tsx#L79-L82)).
- BE gates `DELETE /categories/:id` behind `authMW + middleware.AtLeast("admin")` —
  [`main.go:193-196`](../../../../../be/cmd/server/main.go#L193-L196). A manager JWT → **403** before
  the handler runs.
- The delete `onError` only special-cases **409** (`CATEGORY_HAS_PRODUCTS`); every other status
  (incl. 403) falls to the catch-all `toast.error('Không thể xóa danh mục')` —
  [`page.tsx:69-76`](../../../../../fe/src/app/(dashboard)/admin/categories/page.tsx#L69-L76). So the
  permission failure is rendered as a generic error.

This is the **same class** as A12 Training Bug 2 (delete button renders for managers, `DELETE` is
admin-only → silent 403) — see the Cross-Page Concern in
[../BE_DOC_TRACKER.md](../BE_DOC_TRACKER.md).

**Suggested fix (smallest safe change, FE side).** Pick one:

1. **Hide/disable the "Xóa" button for non-admins** — read the role from the auth store and only
   render delete when `role === 'admin'` (matches the BE gate; cleanest UX). Edit
   `page.tsx:131-136`.
2. **Or** add a `403` branch to the delete `onError` with an honest message (e.g. "Chỉ admin mới
   được xóa danh mục") — `page.tsx:69-76`. Lower effort, but still shows the button to someone who
   can't use it.

Option 1 is preferred — it removes the dead affordance instead of explaining it after the fact.

---

## Next Step

This bug is **not** yet on [`docs/tasks/MASTER_TASK.md`](../../../../tasks/MASTER_TASK.md). Per
CLAUDE.md, register + ALIGN before any code change. **Recommended:** register Bug 1 (option 1) as a
small FE task — and consider doing it together with the matching A12 Training Bug 2 and the A3
Products admin-only DELETE button, since they share one root (admin-only write rendered to managers)
and one fix pattern.
