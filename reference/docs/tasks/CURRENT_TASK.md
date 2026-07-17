# Current Task

> **One task at a time.** Fill this in at session START. Clear or update at session END.
> **No active task?** → Open `MASTER_TASK.md`, find next `⬜` task where all `Deps` are ✅.
> **Task rules** → `GUIDE_TASK.md` · **All tasks** → `MASTER_TASK.md`

---

## Active Task

**Phase FAV — Customer Favourites Redesign (FE only).** See `MASTER_TASK.md → Phase FAV` + memory `project_fav_custom_suat_mon_le`.

- **FAV-1 ✅ COMPLETE (2026-07-04)** — verified live (docker fe :3000): segmented tabs (Yêu thích·Bộ đã lưu·Tự tạo suất), canh quick-add (badge bump + flash), live-total row (matches Σ, recomputes on stepper), two footer buttons dropped, footer↔nav collision fixed, `/build` stub. Build/tsc/lint green; vitest 107 pass / 2 pre-existing fail. **Uncommitted — run `./commit-fav1.sh`** (git blocked for Claude).
- **FAV-2-FE-1 ✅ COMPLETE (2026-07-04)** — verified live (docker fe :3000): "Tự tạo suất" builder at `menu/favourites/build/` (View C). Rows = client's **favourite products** (♥, owner decision — not all products) grouped by category + canh có/không rau (0đ). Nhân = **per-product toppings** pills (data-driven, owner Q2 — dropped mockup's global-nhân pill) + free-text ghi chú; panel opens on qty>0, collapses on 0. Live sumbar (`n món · total`); "Lưu suất này" disabled@0 (save wiring deferred → FE-2, placeholder toast for now). New `components/SuatBuilder.tsx` + rewrote `build/page.tsx`. tsc/lint/`npm run build` green. **Uncommitted — git blocked for Claude.**
- **FAV-2-FE-2 ✅ COMPLETE (2026-07-04)** — verified live via full online checkout (docker fe :3000). "Lưu suất này" → `SaveSuatModal` → **saves suất + adds to cart in one step** (owner decision). Store: `CustomSuat`/`SuatLine` + persisted `suats[]` + `addSuat`. `note?` added to `CartItem`; `order-payload.ts` emits it. **Captured POST /orders:** 3 món-lẻ rows (`combo_id:null`), nhân topping + ghi chú `note` on the bánh cuốn → 201, total 13.000đ, nothing to combos table. tsc/lint/build green; order-payload 5/5. **Uncommitted — git blocked for Claude.**
- **FAV-4 ✅ COMPLETE (2026-07-05)** — verified live (docker fe :3000, Playwright): 📌 "Ghim lên Menu". `pinned?:boolean` on `FavouriteSet` + `togglePinSet` in `favourites.ts` (deleteSet auto-drops pin). New shared `lib/favourite-set-cart.ts` (`favouriteSetToCartItems`) = single apply-to-cart builder for BOTH `/sets` Áp dụng and the rail. SetCard 📌 toggle; `FavouritesRail` renders pinned-set cards (name·n món·＋ Thêm → one-tap add + toast); menu `showFavs` gate includes pinned sets. Live: pin → rail card appears; tap → cart got the exact set (Bánh Cuốn Thịt ×2 + Bánh Trứng Chín ×1 = 17.000₫); unpin + reload → card gone, `pinned:false` persisted. **Scope: sets only** (suat pin deferred — see drift). tsc/lint/build green, vitest 107 pass / 2 pre-existing fail. **Uncommitted — git blocked for Claude.**
- **Phase FAV ✅ COMPLETE** (FAV-1 · FAV-2-FE-1 · FAV-2-FE-2 · FAV-4).
- **⚠️ Drift still open (future task):** a saved custom suất (`suats[]`) has **no display/re-order surface anywhere** — the mockup hint says "Suất tự tạo sẽ xuất hiện trong Yêu thích", but FE-2 only persists + adds-to-cart, and FAV-4 pin was scoped to **saved sets only** (suats can't be pinned because they have no card yet). A view/re-order surface for saved suất (+ optional suat-pin) is the natural next FAV task.
- **Env note:** docker `fe` container is serving :3000 (the local `npm run dev` was stopped — its `.next` was clobbered by a production build; `rm -rf fe/.next` before running `npm run dev` again).

**Also still open (owner, separate phase):** DEPLOY **D-6** — buy VPS + domain, DNS A record (tracked in `MASTER_TASK.md → Phase DEPLOY`).

---

### Previously closed

**Phase TOP — Topping Unification ✅ COMPLETE (2026-06-07).** All TOP-1→TOP-6 done & gate-green; `filling` removed from BE + FE (only a harmless `globals.css` comment remains). nhân + canh rau are now toppings. See `MASTER_TASK.md` → Phase TOP for per-task detail.

> ⚠️ **Uncommitted:** git was blocked at the harness level this session, so the work is gate-green but **not committed**. A ready-to-run per-task commit script was handed to the owner. Commit before starting new work.

---

### Previously closed (kept for reference)
No active task.

**P-WIRE-ORDER-4 ✅ COMPLETE (2026-05-31):**
- All files were already filled from a previous session but never marked ✅
- `conccern.md` (9 open questions) · `recomment/recommend.md` (UX table) · `recomment/recomment_claude.md` (AI brief) · `_INDEX_SHARING_COMPONENT.md` row added
- P-WIRE-ORDER phase is now fully ✅ COMPLETE

**P-MENU-2 ✅ COMPLETE (2026-05-31):**
- `ProductGridCard.tsx` created — vertical card, image-top, same ToppingModal logic as `ProductCard`
- `menu/page.tsx` Zone F: mobile stays 1-col list (`ProductCard`), sm+ switches to responsive grid (`ProductGridCard`): 2-col → 3-col (md) → 4-col (lg)
- Loading skeleton also responsive (matches grid breakpoints)
- P-MENU phase ✅ COMPLETE

**Next available tasks (in order):**
1. **Phase 7-7** — Payment sandbox (VNPay + MoMo via ngrok)

---

*Updated: 2026-05-31 — P-WIRE-ORDER-4 ✅ closed (was done, not marked); next → P-MENU-2 or Phase 7-7*
