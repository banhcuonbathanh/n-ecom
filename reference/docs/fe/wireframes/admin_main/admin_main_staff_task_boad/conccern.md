> Scratchpad: open questions, risks, undecided items for Admin — Staff Task Board.

---

## Open Questions

- [ ] **Edit task UI not in excalidraw.** Owner confirmed tasks can be edited after creation, but Zone F shows no "Edit" button on individual task rows. Is editing done inline (click cell → input appears), via a separate Edit modal, or not available from this page (only from a dedicated task detail page)? This is a blocker for STB-3 (StaffTaskTable).

- [ ] **Delete task.** Can a task be deleted from this view? If yes, where does the delete action appear — in Zone F's task row, or only in a detail view? Needs to be in the spec before STB-3 starts.

- [ ] **Manager scope restriction.** Can a Manager assign tasks to any staff member, or only to staff within their own team/role? If scoped, the `StaffTaskFilterBar` and `CreateTaskModal` staff dropdown must filter by the logged-in manager's team. Currently the spec treats Admin and Manager identically.

- [ ] **Quality Score data model.** Zone E shows ★/5.0 quality scores per staff. Where does this number come from? Options: (a) supervisor manually rates each completed task, (b) auto-computed from some order/task completion metric, (c) separate performance review system. The answer determines whether this is a read-only field or writable from this page.

- [ ] **Staff table pagination.** If there are 20+ active staff, does Zone E paginate (using the existing `Pagination` shared component) or scroll infinitely? Excalidraw shows no pagination controls.

- [ ] **Bulk assign.** Is there a way to assign the same task to multiple staff at once (e.g. "all Kitchen staff: prep bánh cuốn")? Not in excalidraw but common in task management tools.

- [ ] **Empty "+ Add Task" flow.** When opened from the header "+ Add Task" button (not "Assign"), the Staff Member dropdown is empty. Should it auto-focus the Staff Member field, or show all staff pre-listed? Small UX detail but affects modal implementation.

- [ ] **Task date scope.** CreateTaskModal shows a single "Due Date & Time" field. Can a task be assigned for a different date than the currently selected filter date? Or is the task always created for the viewed date?

---

## Risks

- **No real-time task status update.** The current design uses `refetchInterval: 60s` for Zone D/E — staff status changes (e.g. staff marks a task "Completed" on their screen) will not appear to the admin until the next poll. For a busy restaurant at peak hours, a 60-second lag could matter. SSE/WebSocket would fix this but adds architectural complexity.

- **Large staff roster.** If Zone E loads 30+ rows without pagination, the initial render will be heavy, especially with color-coded rows and quality score badges. No virtual scrolling is currently planned.

- **Overdue row is client-side styled, server-side driven.** The `hasOverdue` flag comes from the API. If the backend computes overdue incorrectly (timezone mismatch, stale data), the visual highlight will be wrong. The backend `dueDateTime` timezone handling needs explicit agreement.

- **`['admin', 'staff']` cache sharing.** CreateTaskModal reuses the existing `['admin', 'staff']` cache from Admin — Staff page. If Admin — Staff has not been visited this session, Modal M1 will trigger a fresh fetch of the entire staff list when the modal first opens, causing a visible dropdown loading state.

---

## Undecided

- Whether to add an "Edit Task" action to Zone F task rows (pending answer on open questions above)
- Whether Zone E should paginate or use virtual scrolling for large staff counts
- Whether `refetchInterval` should be reduced to 30s (more live) or increased to 120s (less load)

---

## Resolved

*(Move items here once decided)*

- ✅ Route: `/admin/staff/task-board`
- ✅ Roles: Admin + Manager can create and assign tasks
- ✅ Tasks can be edited after creation (UI TBD — see open questions)
- ✅ Staff can update their own task status from their own screen (staff-facing view)
- ✅ Rendering strategy: Pattern B (Full Client) — task data is too dynamic for ISR

---

*Created: 2026-05-26*
