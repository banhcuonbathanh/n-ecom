> UX/UI review for Admin — Staff Training. Based on excalidraw `admin-staff-training.excalidraw`.

---

## ✅ UX Strengths

1. **Role color coding is consistent** — Chef=green, Cashier=blue, Staff=purple, Manager=orange. The same colors appear on filter tabs, card badges, and completion table role pills. This creates strong visual affordance with zero learning curve.
2. **KPI context on each card** — Showing "Quality ≥ 95% rating" and "Qty ≥ 80 bánh/ca" directly on the card tells staff what success looks like before they even open the guide. Reduces confusion about performance standards.
3. **Progressive disclosure in Modal 2** — Training Steps → Quiz Attempts → Manager Notes follows a natural top-to-bottom narrative: what was done, how the quiz went, what the manager thinks. No need to hunt for information.
4. **Completion Tracking immediately below the cards** — Admin does not need to navigate away to see progress. The page tells the full story: what guides exist (Zone C) and how staff are doing (Zone D).
5. **Quiz attempt history with scores** — Showing "Attempt 1: 58% / Attempt 2: 72%" gives managers actionable data, not just a pass/fail binary.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| **Zone C — card actions** | No visible edit or delete action on the guide card | Add a 3-dot kebab menu (top-right corner of card) with "Edit" and "Delete" options. Show on hover on desktop. |
| **Zone D — guide selector** | The dropdown is the only way to switch guides in Zone D. Users may not notice it. | Add a visual label "Viewing progress for:" above the dropdown to make its purpose obvious. |
| **Zone B — count badge** | "4 guides found" is right-aligned and in muted gray (`#94a3b8`). Easy to miss. | Bump font to 13px weight-500 or move count into the active tab pill (e.g. "All (4)"). |
| **Modal 1 — YouTube field** | "YouTube URL" is a plain text input. Users may paste non-YouTube URLs. | Add inline validation feedback that checks for `youtube.com` or `youtu.be` domain immediately on blur, not just on submit. |
| **Modal 2 — "attempts remaining"** | "1 attempt remaining" shown in orange but no call to action for the admin to grant more attempts | Add a small "Reset attempts" button visible only to Admin role, inline with the "attempts remaining" text. |
| **Zone C — "required" flag** | No indication on the card whether a guide is required or optional (mentioned as a feature but not in the excalidraw) | Add a small "Required" / "Optional" chip in the top-left corner of the card image, below the role badge. |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| **"+ New Guide" button** | Good — orange CTA is prominent | Keep as-is |
| **Card cover image area** | `COVER IMG` placeholder is grey — no dimension constraint shown | Fix at `w-[120px] h-[196px]` (matches excalidraw). Use `object-fit: cover` to avoid distortion. |
| **YouTube link pill** | Red background with red text — low contrast ratio, may fail WCAG AA | Use `bg-red-50 text-red-700 border border-red-300` for better contrast (≥ 4.5:1). |
| **Zone D table header** | No visual separator between header row and data rows | Add `border-b-2 border-slate-200` on the `<thead>` bottom edge. |
| **Progress bar (Modal 2)** | Width of orange fill = `(completionPercent / 100) * trackWidth`. No label on the bar itself | Overlay `"70%"` text inside the orange fill region (white text) for quick scanning. |
| **Manager Notes textarea** | Placeholder text is the only affordance — no label above | Add `<label>Ghi chú của quản lý</label>` above the textarea for accessibility and clarity. |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|-----------------|--------|
| M1 — Required/Optional | Phase 1 input: Admin sets module as required vs. optional | No such field in the Create Guide modal | **Add to spec + modal form**: a toggle or radio "Required / Optional" |
| M1 — Quiz Questions | Phase 1 input: Quiz questions + results as data | No quiz question editor in Modal 1 | **Clarify scope**: is quiz content managed here or in a separate Quiz Builder page? |
| Zone D — Staff Assignment | Staff with no assigned training is an edge case | No "Assign" action in Zone D or Zone C | **Clarify**: assignment must be documented — which page handles it? |
| Zone C — Published state | Published toggle exists in Modal 1 | Cards do not show a "Draft" or "Unpublished" state | **Add**: unpublished cards should show a greyed-out "Draft" overlay or badge |

---

## ♿ Accessibility & Edge Cases

- [ ] Touch targets: "View Progress →" button — verify height ≥ 44px on mobile
- [ ] Keyboard navigation: Tab filter tabs (Zone B) should support Left/Right arrow key navigation (ARIA `role="tablist"`)
- [ ] Modal focus trap: Tab inside M1 and M2 must not escape to the background page
- [ ] Color-only information: Role badges use color to convey role. Add `aria-label` or visible text inside the badge (already done — "Chef", "Cashier" text present ✅)
- [ ] Progress bar in Modal 2: Add `role="progressbar" aria-valuenow={70} aria-valuemin={0} aria-valuemax={100}`
- [ ] `prefers-reduced-motion`: Modal open/close animations should be wrapped in `@media (prefers-reduced-motion: reduce)` guard

---

## 🚀 Recommended Next Steps

1. **Resolve the "Required/Optional" and "Quiz Management" scope questions** in `conccern.md` before any implementation starts — they affect the data model.
2. **Add card edit/delete actions** to the excalidraw (3-dot menu on hover) and update Zone C component spec.
3. **Document the staff assignment flow** — which page triggers it and how it links back to Zone D.
4. **Add a "Draft" visual state** to `JobGuideCard` for unpublished guides.
5. **Run WCAG contrast check** on the YouTube URL pill (red-on-red) before design is finalized.
6. **Fill Manager Notes label** in the excalidraw and update Modal 2 section in the wireframe spec.

---

*Review date: 2026-05-25*
*Reviewed by: Claude (automated review from excalidraw)*
