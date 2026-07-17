# Alignment Audit — folder docs vs `DESIGN_PROMPT.md`

> **Source of truth:** [`DESIGN_PROMPT.md`](DESIGN_PROMPT.md) (visual + worked-example spec).
> **This file is a read-only findings report** — no code or docs were changed.
> Generated 2026-06-25. Scope: every `.md` in `docs/system/08_pages/customer/customer_menu/`.
> Severity: 🔴 = directly contradicts DESIGN_PROMPT facts · 🟡 = stale / cosmetic.

The DESIGN_PROMPT baseline facts these are measured against:
- Worked example = **Bàn 04** family order, total **103.000 đ**, cart count badge **13**.
- **Suất Giò = 25.000 đ**, composition **"1 giò + 4 bánh cuốn + canh có rau"**.
- Catalog product sections use category headers **TRỨNG · BÁNH CUỐN · GIÒ · CANH** (the label **"MÓN LẺ"** is an *order-summary group*, not a catalog header).
- Real item prices: Bánh Cuốn Thịt **4.000 đ**, Canh có rau/không rau **0 đ** (there is no item "Canh mọc").

---

## 1 · Files fully aligned (no action)

| File | Note |
|---|---|
| `DESIGN_PROMPT.md` | the spec itself |
| `customer_menu_be.md` | BE/auth/cache behaviour — DESIGN_PROMPT does not cover it; no conflict |
| `customer_menu_loading.md` | loading behaviour — DESIGN_PROMPT does not cover it; no conflict |
| `index.md` | already documents these same divergences in its own §3 audit |

---

## 2 · Differences found

> **Resolution (owner decision, 2026-06-25): follow `DESIGN_PROMPT.md` in every row below.**
> The "Resolution" column is the canonical value each doc should be brought to.
>
> **✅ APPLIED 2026-06-25** — rows 1–7 edited into the source docs (row 8 `excalidraw.md` left
> untouched per owner request). The seed/BE were verified to already match DESIGN_PROMPT; only
> `MENU_CATALOG.md` §4 needed a data fix. See [§4 Resolution](#4--resolution--verified-against-the-real-seed-not-a-divergence).

| # | File | Location | DESIGN_PROMPT says | Doc says | Resolution (follow DESIGN_PROMPT) | Sev |
|---|---|---|---|---|---|---|
| 1 | `customer_menu_crosscomponent_dataflow.md` | L22–23, 35, 38, 45, 75, 179, 191, 195, 231, 245, 377, 395 | **Suất Giò = 25.000 đ** | Suất Giò = **21.000 đ** (and MiniCart "1 món · 21.000đ", total 21000) | Suất Giò = **25.000 đ** | 🔴 |
| 2 | `customer_menu_crosscomponent_dataflow.md` | L23, 63 | Suất Giò = **1 giò + 4 bánh cuốn + canh** | Suất Giò = **1 Giò · 3 Bánh Cuốn · 1 Canh** | **1 giò + 4 bánh cuốn + canh** | 🔴 |
| 3 | `SCENARIO_LUNCH_RUSH.md` | L41, 46, 63, 178, 190, 223 | Suất Giò = **25.000 đ** | Suất Giò = **₫21,000** (total_amount 21000, header math `0·1+9000·1+4000·3+0·1`) | Suất Giò = **25.000 đ** (header math → 4 bánh cuốn: `9000·1+4000·4+0 = 25000`) | 🔴 |
| 4 | `SCENARIO_LUNCH_RUSH.md` | L41, 63 | **4 bánh cuốn** per Suất Giò | **3 Bánh Cuốn** per Suất Giò | **4 bánh cuốn** | 🔴 |
| 5 | `customer_menu.md` | L102, 191, 192, 244, 255, 256, 264 | Worked example = **Bàn 04 / 103.000 đ**; items at real prices | OLD example data: **"3 món · 105.000đ"**, **"Bánh cuốn thịt 35.000đ"**, **"Canh mọc 10.000đ"** | **Bàn 04 / 103.000 đ**; Bánh Cuốn Thịt **4.000 đ**; Canh **0 đ** (no "Canh mọc") | 🔴 |
| 6 | `customer_menu.md` | L189 | catalog sections = **TRỨNG · BÁNH CUỐN · GIÒ · CANH** | product list header labelled **"MÓN LẺ"** (a summary-group label, not a catalog header) | catalog headers = **TRỨNG · BÁNH CUỐN · GIÒ · CANH** ("MÓN LẺ" kept only as the order-summary group) | 🟡 |
| 7 | `customer_menu_crosspage_dataflow.md` | L131 | **Bàn 04 / 103.000 đ** | snapshot diagram still `table_name:"03", total_amount:105000` | `table_name:"04", total_amount:103000` | 🟡 |
| 8 | `excalidraw.md` | L21, 27, 30 (PANEL 1 plan) | photo header **no table label**; combos **always render**; floating pills **no total** | "Quán Bánh Cuốn · **Bàn 03**"; ComboSection "**only Tất cả**"; CartBottomBar "**total()/itemCount() [Thanh toán]**" | photo header (**no table label**); ComboSection **always renders** (scroll-spy); floating pills **count badge only, no total** | 🟡 |

---

## 3 · Notes

- **Resolution is final — DESIGN_PROMPT wins on all four contested facts** (owner, 2026-06-25):
  1. **Suất Giò = 1 giò + 4 bánh cuốn + canh** (= **25.000 đ**). The 21.000 đ / 3-bánh-cuốn modelling
     in `crosscomponent_dataflow.md` and `SCENARIO_LUNCH_RUSH.md` is wrong; all derived totals and the
     header expansion math there should be recomputed to 4 bánh cuốn (`9000 + 4000·4 = 25.000 đ`).
  2. **Catalog sections = TRỨNG · BÁNH CUỐN · GIÒ · CANH** ("MÓN LẺ" is only an order-summary group).
  3. **Worked example = Bàn 04 / 103.000 đ** everywhere (replaces Bàn 03 / 105.000 đ / 35.000 đ / "Canh mọc").
  4. **Header = photo banner, no table label** · **combos always render** · **floating pills show no total**.
- `excalidraw.md` already carries a drift banner admitting PANEL 1 is old-design; the resolution above is
  what its update should target.
- The `COMPARISON_*` docs were **not** flagged here: they already reference the Bàn 04 / 103.000 đ
  example correctly. (`index.md §3-B/C` separately notes they lag the *code-status* decision log, which
  is a doc-vs-code issue, not a doc-vs-DESIGN_PROMPT one.)
- "⚠️ NEW DESIGN — code pending rebuild" markers in `customer_menu.md` are doc-vs-**code** status tags,
  not contradictions of DESIGN_PROMPT content, so they are out of scope for this audit (`index.md §3-A`
  already tracks them).

---

## 4 · Resolution — verified against the real seed (NOT a divergence)

> ✅ **Closed 2026-06-25.** An earlier draft of this section claimed rows 1–4 had made the narrative
> docs "doc-vs-code stale" because the seed was 21.000 đ. **That was wrong** — it trusted the *stale*
> `MENU_CATALOG.md` instead of the actual seed SQL. Checking the source settled it:

| Source | Suất Giò | Status |
|---|---|---|
| `DESIGN_PROMPT.md` | **25.000 đ** = 1 giò + **4** bánh cuốn + canh | source of truth |
| **DB seed** [`scripts/seed_real_menu.sql`](../../../../scripts/seed_real_menu.sql) + [`scripts/seed.sql`](../../../../scripts/seed.sql) | **25.000 đ** = 1 giò + **4** bánh cuốn (`9k + 4×4k = 25k`) | ✅ already matches — no change |
| BE | derives `total_amount` from `combo_items` (no hardcoded price) | ✅ data-driven — no change |
| [`../../03_be/SEED_DATA.md`](../../03_be/SEED_DATA.md) | **25.000 đ** / 4 bánh cuốn, full 5-suất lineup | ✅ already correct — no change |
| `../../02_spec/object/MENU_CATALOG.md` §4 | was **21.000 đ / 3** bánh cuốn + wrong 5-suất lineup | 🔧 **fixed 2026-06-25** to match seed |

So the rows 1–4 edits to `SCENARIO_LUNCH_RUSH.md` / `crosscomponent_dataflow.md` are **correct vs the
running code**, not stale. The only file that actually needed a data change was `MENU_CATALOG.md`, now
brought in line with the seed (= DESIGN_PROMPT).

> **Separately noted (out of scope here):** `MENU_CATALOG.md` §1–§3 (categories/products) and its
> "Products = 6" count are *also* stale vs `seed_real_menu.sql` (real menu has Bánh Cuốn Thịt · Bánh
> Cuốn Mộc Nhĩ · Bánh Chay · Canh có rau · Canh không rau, etc.). Not touched — only the combos (§4)
> were in scope for the 25.000 đ / 4-bánh-cuốn change.
