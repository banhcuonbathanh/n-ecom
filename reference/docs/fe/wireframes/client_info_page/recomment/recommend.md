> UX/UI review for Thông Tin Khách Hàng. Filled from excalidraw review.

---

## ✅ UX Strengths

1. **Zone layout is clean and logical** — top-to-bottom flow: identity → data → action → navigation. No cognitive jumps.
2. **Quick-nav Zone D is a good UX pattern** — a profile page is a dead end without shortcuts; the 2×2 grid keeps users moving through the app.
3. **Sticky top + bottom nav** — customer is never lost; ← back and bottom tabs always reachable.
4. **Full-width CTA** — "Lưu Thông Tin" spans the full width with 48px height; impossible to miss on mobile.
5. **Membership badge** — immediate visual confirmation of account status reduces support questions.

---

## ⚠️ UX Recommendations

| Area | Observation | Recommendation |
|------|-------------|----------------|
| Zone A — ⚙ icon | Icon appears in excalidraw but no settings page is defined | Remove the ⚙ icon (done in spec). If logout is needed, add a text button "Đăng xuất" in Zone B below the membership badge — do not hide it in a gear icon |
| Zone B — avatar | 📷 badge implies avatar is tappable; but upload endpoint may not exist in v1 | Either remove the 📷 badge (v1) or render it greyed out with `cursor-not-allowed` and tooltip "Tính năng sắp ra mắt" |
| Zone C — field ordering | Email is last (optional field at bottom) | Good placement — required fields first, optional last. Keep this order |
| Zone C — no inline save | User must scroll to Zone E to save | Consider adding a floating "💾" FAB on Zone C focus so users don't need to scroll when keyboard is open |
| Zone D — 2 cards greyed | Lịch Sử Ăn and Đặt Bàn have grey borders (vs orange on Thực Đơn + Yêu Thích) | This is a good visual distinction but the reason is unclear to users. Consider adding a small "Sắp có" badge if these pages don't exist yet, or use consistent orange for all active destinations |
| Zone E — no cancel | No way to undo changes before saving | Add a secondary "Huỷ" link below the CTA (ghost style) that calls `form.reset()` to restore original values |
| Empty state | If no profile exists (new user), Zone C loads blank | Make first-time UX explicit: show a subtitle in Zone B "Chưa có thông tin — hãy điền vào bên dưới" and change CTA to "Tạo Hồ Sơ" |

---

## 🎨 UI & Visual Recommendations

| Element | Issue | Fix |
|---------|-------|-----|
| Avatar circle | Plain rounded rectangle in excalidraw | Use `rounded-full` (circle) in implementation — the excalidraw shows `roundness: {type: 3}` but a true circle looks better |
| "✓ Thành viên" badge | Green badge (#dcfce7 bg, #166534 text) | Use existing `<Badge variant="success">` from Tier 1 — matches system design exactly |
| Quick-nav cards — icon size | 22px emoji icons in excalidraw | Use 24px for better readability on small phones; test on 375px |
| Quick-nav arrow → | Small 14px arrows | Make arrows larger (16–18px) and use a proper icon (`ChevronRight`) instead of text arrow for consistent weight |
| Zone E background | Light orange (`#fff7ed`) background band | Keep this — it visually groups the CTA and prevents the button from blending into Zone D |
| Bottom nav — active tab | Orange color for "Hồ Sơ" icon + label | Use `text-orange-500` for active, `text-slate-400` for inactive. Add `font-medium` to active label |

---

## 🔍 Spec vs. Excalidraw Alignment

| Zone | Spec Says | Excalidraw Shows | Action |
|------|-----------|------------------|--------|
| Zone A | No ⚙ icon | ⚙ icon present (orange, top-right) | Removed from spec — confirmed with user |
| Zone B | Avatar circle (round) | Rounded rectangle (`roundness: {type: 3}`) | Use `rounded-full` in code, not the rectangular shape |
| Zone C | 4 form fields (name, phone, address, email) | 4 fields confirmed — all present | ✅ Aligned |
| Zone D | 4 quick-nav cards in 2×2 grid | 2×2 grid confirmed | ✅ Aligned; orange border on top 2 cards, grey on bottom 2 |
| Zone E | "💾 Lưu Thông Tin" CTA | Confirmed: 390px wide, 48px tall, orange | ✅ Aligned |
| Zone F | 5 tabs, "Hồ Sơ" active | 5 tabs confirmed, "Hồ Sơ" (👤) in orange | ✅ Aligned |

---

## ♿ Accessibility & Edge Cases

- [ ] Avatar change button: must have `aria-label="Đổi ảnh đại diện"` even if non-interactive in v1
- [ ] All `<Input>` fields must have matching `<Label for="...">` — no placeholder-only labels
- [ ] Error messages: use `aria-describedby` to link errors to inputs
- [ ] "Lưu Thông Tin" button: `aria-busy="true"` during loading state
- [ ] Bottom nav items: each must have `aria-label` (icon-only tabs are invisible to screen readers)
- [ ] Touch targets: all bottom nav tabs minimum `44×44px`; CTA button minimum `48px` height
- [ ] Test keyboard flow: Tab through Zone C fields → Zone E button → Zone F tabs

---

## 🚀 Recommended Next Steps

1. Confirm auth model — resolve whether registered customer accounts exist (blocker for all BE tasks)
2. Confirm avatar upload scope — remove 📷 badge or mark as "sắp ra mắt" in v1
3. Add "Huỷ" secondary button to Zone E to allow form reset without page reload
4. Confirm routes for Lịch Sử Ăn and Đặt Bàn cards in Zone D
5. Implement `ClientBottomNav` first (shared component needed by all client pages)
6. Define `ProfilePageSkeleton` before writing page.tsx (Pattern B requirement)

---
*Review date: 2026-05-27*
*Reviewed by: —*
