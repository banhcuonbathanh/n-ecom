> Scratchpad: open questions, risks, undecided items for Admin — Staff Training page.
> Not a formal spec — write freely. Resolve items here before finalising the wireframe.

---

## Open Questions

*(all resolved — see Resolved section below)*

---

## Risks

- [ ] **YouTube URL iframes** — Embedding YouTube via `<iframe>` requires CSP headers to allow `youtube.com`. Check `next.config.js` for `frame-src` policy before implementing card video link. If CSP blocks it, use a plain `<a>` link to open YouTube in a new tab instead.
- [ ] **Zone D scroll depth** — Zone D sits below a variable-height Zone C (400–800px). Users may not notice it. **Mitigation:** Add an anchor `<a href="#completion-tracking">` chip in Zone A header ("↓ View Tracking"), visible only when guides exist.
- [ ] **Sticky tab conflict** — Zone A `sticky top-0 z-20` + Zone B `sticky top-[92px] z-10`. If the admin layout has a global top navbar above Zone A, the offsets break. **Action before coding:** inspect `app/admin/layout.tsx` to confirm whether a top bar exists above the sidebar.
- [ ] **Race condition on published toggle** — Two admins toggling `published` simultaneously: last write wins. TanStack Query reverts the optimistic update on refetch. **Decision: accepted** — a restaurant operation team is small enough that this is not a real risk.

---

## Undecided

*(all resolved — see Resolved section below)*

---

## Resolved

### Open Questions

**1. Quiz pass threshold**
- **Decision:** `passThreshold` is a **per-guide configurable field**, NOT the same as `qualityKpiTarget`. Add a separate numeric field "Quiz Pass Threshold (%)" to Modal 1 form. Default value = 75. Range: 50–100.
- **Why separate:** `qualityKpiTarget` is a work-performance standard (e.g., "≥ 95% rating on finished dishes"). `passThreshold` is the minimum score to pass the training quiz. They measure different things.
- **FE:** Display as "Needs ≥ {guide.passThreshold}% to pass" in Modal 2. Never hardcode 75.

**2. Max quiz attempts**
- **Decision:** Default = **3 attempts per guide per staff member**, configurable per guide via a "Max Quiz Attempts" numeric field in Modal 1 (range: 1–10). Admin or Manager can reset a staff member's attempts via a "Reset attempts" button visible only to those roles in Modal 2.
- **Why:** The excalidraw shows "1 attempt remaining" with a 3-attempt scenario (Attempt 1, Attempt 2, 1 remaining = max 3). Makes sense as the default.

**3. Staff assignment flow**
- **Decision:** Guides are **auto-assigned to all active staff whose role matches `guide.role`**. No manual per-guide assignment UI is needed. When a new Chef guide is published, all staff with `role=Chef` automatically appear in Zone D's completion table with status "Not Started".
- **Why:** The excalidraw shows "Showing 5 of 12 staff" in Zone D without any "Assign" button — automatic role-based assignment is the only design consistent with the wireframe.
- **Implication:** Zone D "Showing 5 of 12 staff" means there are 12 staff with the guide's role. The Guide's `role` field (single select) drives who is assigned.

**4. "Required" vs "Optional" flag**
- **Decision:** This field was **accidentally left out of the excalidraw**. Add a "Required" toggle to Modal 1 (default: OFF = Optional). Show a "Required" red chip on cards where `required=true`, and an "Optional" gray chip on others.
- **UX rule:** Required guides must be completed before a staff member can be scheduled for shifts (business rule enforcement is on the scheduling side — not blocked in this UI, just flagged visually).

**5. Role filter logic (Zone B tabs)**
- **Decision:** Zone B tabs filter by `guide.role` (**single primary role**). A "Chef" guide appears only under the Chef tab. `responsibleRoles` in Modal 1 ("Who Is Responsible") is a separate concept listing *which named staff* own the KPI — it is NOT the filter key. The filter is always: `guides.filter(g => activeRole === 'all' || g.role === activeRole)`.
- **Why:** Each guide in the excalidraw has exactly one color-coded badge (green=Chef, blue=Cashier, purple=Staff, orange=Manager) — confirming a single primary role per guide.

**6. Published toggle behavior**
- **Decision:** Unpublished (draft) guides are **visible to Admin and Manager with a "Draft" gray overlay** on the card and a "Draft" badge replacing the role badge. Staff and Cashier roles do NOT see unpublished guides at all (API filters by `published=true` for those roles).
- **FE:** `JobGuideCard` receives `published: boolean` prop. Renders gray overlay + "Draft" badge when `!published`. The card is still interactive for Admin/Manager (Edit, Delete, View Progress still work).

**7. Pagination size (Zone D)**
- **Decision:** **10 rows per page** (not 5). The excalidraw shows 5 for the mockup demo, but 5 is too few for a real team of 10–30 staff. Fixed at 10 — not configurable from the UI.

**8. Edit/Delete card actions**
- **Decision:** **3-dot kebab menu (⋯)** at top-right corner of each `JobGuideCard`. On desktop: appears on card hover. On mobile/tablet: always visible. Menu items: "Edit" (opens Modal 1 pre-filled) and "Delete" (opens a confirmation dialog before DELETE API call). Only rendered for Admin and Manager roles.

---

### Undecided

**Card edit trigger**
- **Decision:** Resolved above — 3-dot kebab menu.

**Empty state illustration**
- **Decision:** Use the **shared `EmptyState` component** with a 📚 emoji icon and message "Chưa có hướng dẫn nào. Nhấn "+ New Guide" để tạo hướng dẫn đầu tiên." No custom SVG — keep consistent with other admin pages.

**Mobile sidebar**
- **Decision:** The hamburger button lives **inside Zone A** (top-left of the main content header bar), consistent with other admin pages. Confirm by inspecting `app/admin/layout.tsx` — the sidebar collapse trigger should already exist there.

**Manager Notes auto-save**
- **Decision:** **Debounced PATCH on `onChange` (500ms)**. Show a subtle "Saving…" / "Saved ✓" text indicator (12px, gray) in the bottom-right corner of the textarea while saving. No explicit "Save" button — the friction is unnecessary for a notes field. To prevent lost notes on fast modal close, flush the debounce immediately on modal close event (call `debouncedSave.flush()` in the modal's `onClose` handler).

---

*Created: 2026-05-25*
*Resolved: 2026-05-25*
