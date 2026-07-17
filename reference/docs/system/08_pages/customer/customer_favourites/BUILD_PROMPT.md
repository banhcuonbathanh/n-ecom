# Build Prompt — Favourites redesign (FE only) → paste into a fresh session

> Copy the block below into a **new Claude Code session** (model: **Sonnet**). It implements the
> favourites redesign from the mockup. **FE only — no Backend, no DB migration.**
> Design source of truth: `docs/system/08_pages/customer/customer_favourites/claude_design/favourites.html`
> + `docs/system/08_pages/customer/customer_favourites/DESIGN_PROMPT.md`.

---

## PROMPT (copy from here)

You are a senior co-developer on the BanhCuon restaurant project. **Read `CLAUDE.md` first**, then this whole prompt. Follow the project's own workflow exactly — do **not** write app code until you have registered MASTER_TASK rows and I confirm the scope (ALIGN).

### What we're building
The customer **Favourites** page redesign. The visual + behaviour spec is already drawn:
- Rendered mockup (open it): `docs/system/08_pages/customer/customer_favourites/claude_design/favourites.html`
- Written spec: `docs/system/08_pages/customer/customer_favourites/DESIGN_PROMPT.md`
- Page doc-set (behaviour truth): `docs/system/08_pages/customer/customer_favourites/customer_favourites.md`

**Scope is FE only. No Backend or DB changes.** If any task seems to need a BE/DB change, STOP and flag it — don't do it.

### Existing code to work within (read before editing)
- Page: `fe/src/app/(shop)/menu/favourites/page.tsx` (+ `save/` and `sets/` sub-pages)
- Components: `fe/src/app/(shop)/menu/favourites/components/` — `FavouriteItemCard.tsx`, `FavouritesFooter.tsx`, `FavouriteFilterTabs.tsx`, `FavouritesTopNav.tsx`
- Stores: `fe/src/store/favourites.ts` (persisted), `fe/src/store/cart.ts`
- Payload builder (single source): `fe/src/lib/order-payload.ts`
- Storage keys: `fe/src/lib/storage-keys.ts` (no hardcoded localStorage strings)
- Shell nav: `ClientBottomNav` injected by `(shop)/layout.tsx`
- Use the `frontend-nextjs` skill for the rules; `order-flow` skill for FAV-2's payload.

### The three tasks (register each as a MASTER_TASK row, sized < 100k tokens)

**FAV-1 — Favourites list: canh quick-add + live total + drop 2 footer buttons.** (Small)
- Add a "Canh — thêm nhanh" block under the favourite cards: two rows (Canh có rau / Canh không rau, 0 đ) each with a "＋ Thêm" button that adds one soup straight to the cart (additive) and flashes "✓ Đã thêm" ~1s. Always visible regardless of the active filter.
- Add a live-total row in the footer above the CTA: "n món · Tổng: <total> đ", summing each favourite card's qty × price, recomputed on stepper change / un-favourite.
- Remove the two footer buttons "Xem set đã lưu" and "Lưu thành set" — keep only "🛒 Thêm tất cả vào giỏ". (Saved sets reached via the top segmented tab / existing nav only.)
- **Also fix the known bug:** `FavouritesFooter` and `ClientBottomNav` both `fixed bottom-0 z-20` collide — offset the footer above the 64–72px nav (or raise z-index) so the CTA is not hidden. See `COMPARISON_VISUAL_MOCKUP_VI.md` Zone 1.
- **AC:** canh adds to cart & badge bumps; total updates live and matches the sum; only the one CTA remains; CTA fully tappable above the nav; existing tests still pass.

**FAV-2 — "Tự tạo suất" (custom-combo builder).** (Large — the main task)
- New sub-view/route under favourites (e.g. `menu/favourites/build/`) matching View C of the mockup: grouped component steppers (Bánh cuốn / Trứng / Giò / Canh), a global "Nhân mặc định (bánh cuốn)" pill group, and **per-trứng options** (when qty > 0): a "Nhân thịt / Nhân mộc nhĩ" pill group **+ a free-text ghi chú input** (placeholder "vd: nhân để ngoài bánh, ít hành..."). A sticky bottom summary bar with live "n món · total" and a "Lưu suất này" button opening the save-as-set modal.
- **The ghi chú is a plain note** carried on the order via the existing order/item note mechanism — DO NOT add a DB field for it. Confirm where notes already flow (`order-payload.ts` / order create contract) and reuse that.
- **POST /orders mapping (owner decision):** when the built suất has **1 distinct dish** → send it as a **món lẻ** (single product line, with its quantity); when it has **≥2 distinct dishes** → send it as a **combo** (combo header + combo_items overrides), routed through `lib/order-payload.ts` (the single builder). Do not create a second POST path.
  - ⚠️ Edge to confirm with owner before coding: "distinct dish" = distinct product type (not total quantity), and the boundary is 1 vs ≥2. Owner phrased it "trên 2 món = combo, 1 món = món lẻ" — confirm 2-dish case = combo.
- **AC:** building ≥2 dishes and ordering produces a correct combo order (total matches, no double-count — see the OC epic's combo total fix); a 1-dish build produces a món-lẻ order; trứng notes appear on the order for staff; runs through the one payload builder.

**FAV-4 — 📌 "Ghim lên Menu".** (Medium)
- A pin toggle on each saved set (and optionally custom suất) in the "Bộ đã lưu" view. When pinned, the set surfaces as a quick-select card in the menu's "YÊU THÍCH" rail for one-tap re-add. Pin state persisted in `favourites.ts`. Touches the menu page rail — read `customer_menu` doc-set first.
- **AC:** pinning a set makes it appear in the menu rail; tapping it re-adds the set to cart; unpin removes it; state survives reload.

### Order of work
Do **FAV-1 first** (smallest, no risk, visible win) and verify it before starting FAV-2. FAV-1 / FAV-2 / FAV-4 are independent — they may be split across parallel Sonnet sub-agents once each has a MASTER_TASK row and an agreed scope contract.

### Definition of done (per task)
Follow `/finish-task`: ACs demonstrated, VERIFY gate run (`docker compose up -d --build fe`, click the flow), only scoped files changed, code-vs-doc drift logged, MASTER_TASK row updated. Commit messages in proper format (no "dfg"-style messages).

## (end prompt)

---

### Notes for the owner (not part of the prompt)
- Run the design commit first: `bash commit-favourites-design.sh`.
- This prompt tells the new session to register MASTER_TASK + ALIGN before coding — that gate is intentional, don't let it skip.
- If you want a single agent instead of 3 parallel ones, just tell that session to do FAV-1 → FAV-2 → FAV-4 in sequence.
