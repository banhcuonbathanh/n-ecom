# Rendering Strategy — Honest Comparison (all pages)

> Compares `_INDEX_RENDERING_STRATEGY.md` (breadth — all 16 pages) against
> `client_menu_page_v2/tech_description.md` (depth — menu only).
> Verdict: they are **not competitors** — different altitudes of the same strategy.

---

## 1. What each doc is

| | `_INDEX_RENDERING_STRATEGY.md` | `tech_description.md` |
|---|---|---|
| Coverage | **All 16 pages** + decision tree + gap log | **1 page** (menu) |
| Depth per page | 1 row (pattern · revalidate · prefetches · skeleton flag) | Zone-by-zone (A–J) + code + state contract + RBAC |
| Answers "which pattern?" | ✅ every page | ✅ menu only |
| Answers "how do I build it?" | ❌ | ✅ |
| Scales to a new page | ✅ add one row | ❌ needs a full doc per page |

The index is the **map**; tech_description is the **blueprint for one building**.
Keep both — index = registry/source of truth, one tech_description per page as it's built.

---

## 2. Pattern audit — is each page's choice correct?

| Page | Chosen | Verdict | Note |
|---|---|---|---|
| Menu | A / 300s | ✅ | High-traffic storefront, shared data |
| Admin Products | A / 30s | ✅ | Shared table; 30s good for admin freshness |
| Admin Staff | A / 30s | ✅ | Shared list |
| Admin Storage | A / 60s | ✅ | Low-churn ingredient list |
| Admin Topping | A / 60s | ✅ | Shared list |
| Product Detail | A / 300s | ✅ | Cacheable per id |
| Staff Task Board | B | ✅ | Real-time board |
| Admin Overview | B | ✅ | Live floor (WS) |
| Restaurant Monitor | B | ✅ | SSE |
| Order Tracking | B | ✅ | SSE |
| Client Info / Profile | B | ✅ | User-specific |
| Favourites S1/S2/S3 | B | ✅ | 100% localStorage — can't ISR |
| Tổng Kết Ngày | B | ✅ | `selectedDate` is runtime state |
| **Staff Task List** | **B** | ⚠️ borderline | Shared data + `staleTime: 30s` = Pattern A signature. Either correct to A or document why it's user-scoped. |

**15/16 choices are sound.** The decision tree holds up across the whole app.

---

## 3. Cross-cutting finding (only visible at all-pages scope)

- **Skeleton column is `❌ not yet` for every one of the 16 pages.**
- For the **7 Pattern B pages**, the missing skeleton is rated **High** impact 4× (Overview, Order Tracking, Task Board, Tổng Kết Ngày) — blank screen on **every** cold visit, not an edge case.
- For **Pattern A pages**, no skeleton = a flash on any ISR cache miss.

So the real story across all pages is **not** "A vs B" (those calls are mostly right).
It is: **the strategy is well-classified but not yet implemented** — skeletons are the universal missing piece, concentrated as High severity on the Pattern B pages.

---

## 4. Verdict

- For reasoning about **all pages** → the **index is strictly better** (only doc with the coverage).
- For implementing the **menu** → **tech_description is better** (index row is too thin to build from).
- They are complementary, not rival. Don't choose — keep both at their altitudes.

**Next step that matters most:** close the one gap spanning all 16 rows — define the Pattern B skeletons, starting with the 4 High-severity pages (Overview, Order Tracking, Task Board, Tổng Kết Ngày). Then resolve the Staff Task List = B classification.
