> Scratchpad: open questions, risks, undecided items for Admin — Staff Task List.

---

## Open Questions

- [ ] **Overlap with Staff Task Board** — `/admin/staff/task-board` already exists and manages tasks. Are these two different pages for the same data, or different features? Do they share the same BE endpoints (`GET /api/v1/admin/tasks`)? Need to confirm with owner before building the BE endpoint for this page to avoid duplicate endpoints.
- [ ] **Who can reassign a task?** — The spec says manager creates and assigns tasks. But can a manager reassign an existing task to a different staff member after creation? Not decided yet.
- [ ] **Bulk actions** — Should managers be able to mark multiple tasks complete at once (bulk checkbox)? Not in scope for v1, but the table design should leave room for it.
- [ ] **Task due time precision** — Is "HH:MM" (hour + minute) accurate enough, or do we need seconds? And does the overdue logic use server clock or client clock?
- [ ] **Notifications** — When a manager creates a task, does the assigned staff receive a push/in-app notification? Not covered in the spec yet.
- [ ] **Staff filter for Staff role** — Staff users should only see their own tasks. Does the API enforce this (server-side, preferred) or does the FE just set `staffId = loggedInUserId` silently? Spec says server enforces — confirm this.
- [ ] **Max tasks per page** — Default 15 per page assumed. Confirm with owner if this should be configurable or fixed.

---

## Risks

- **Duplicate endpoint with Staff Task Board** — If this page introduces a new API endpoint (`/api/v1/admin/tasks/list`) but the task board already uses `/api/v1/admin/tasks`, the BE may end up with two near-identical endpoints. Should align query contracts before BE build starts.
- **Optimistic checkbox UX** — If the toggle request fails and rolls back, the checkbox will visibly flicker. Acceptable for v1, but could confuse users on slow connections.
- **Date range 90-day limit** — Arbitrary limit. If a manager needs to review Q1 tasks in Q2, they will be blocked. Revisit with owner.
- **Overdue status set by BE vs. FE** — If the BE sets `status = 'overdue'` only on read (not in a background job), then a task list cached by TanStack Query for 30s might show stale "pending" statuses even when overdue. Need to clarify whether the BE updates status in the DB or computes it on-the-fly per read.

---

## Undecided

- Whether `CreateEditTaskModal` should be shared with the Staff Task Board's `CreateTaskModal` (to avoid duplication) or remain a separate local component with potentially different fields.
- Whether to add a "recurring task" feature (e.g. "clean tables every morning") — out of scope for v1, but worth noting.
- Whether the filter state should be preserved in the URL query string (e.g. `?staffId=xxx&start=2026-05-01`) for shareable links / browser back navigation.

---

## Resolved

*(Move items here once decided)*

---
*Created: 2026-05-27*
