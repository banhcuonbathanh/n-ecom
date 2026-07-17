# How to Write a Page Spec — v2

> Replaces `HOW_TO_SPEC.md` (v1).
>
> **Changes from v1:**
> - No code blocks inside spec files (code belongs in the codebase)
> - Shared component check added as an explicit step
> - Task sizing rules added inline
> - 6 steps instead of 7 (Draw merged into Zones)

---

## The 6 Steps

```
Step 1       Step 2       Step 3       Step 4       Step 5       Step 6
NAME    →   DATA    →   ZONES   →   WIREFRAME →  COMPONENTS →  AC + TASKS
+ route     sources      table       (ASCII)       MAP           rows
```

**Step 4 is mandatory.**
No drawing = no shared understanding = implementation drift.
Always draw before writing AC or task rows.

---

## Step 1 — Name the Page

Write one sentence: what does this page do for the user?

Then pin:

| Field | Example |
|-------|---------|
| Route | `/menu/page.tsx` |
| Who sees it | Customer (guest JWT) |
| Entry point | QR scan → `/table/[id]` → redirect here |
| Exit points | Cart → `/checkout` · Product name → `/menu/product/[id]` |

---

## Step 2 — Data Sources Table

Before drawing anything, answer: *where does each piece of data come from?*

| Data | Source | Update mechanism | Query key |
|------|--------|-----------------|-----------|
| Product list | `GET /api/v1/products` | TanStack Query | `['products', categoryId]` |
| Cart items | `cartStore` | Zustand (in-memory + persisted) | — |
| Local toggle state | `useState` | Component-local | — |

**Rule:** every API source needs a loading state + error state drawn in Step 4.

---

## Step 3 — Zone Table

Divide the screen top → bottom. Every zone gets a name, data source, and interactions.

| Zone | Name | Data source | Interaction | Sticky / Position |
|------|------|-------------|-------------|-------------------|
| A | Header | `settingsStore` | cart badge tap | `top-0 z-20` |
| B | SearchBar | local state + API | debounced input | `top-[52px] z-10` |
| C | CategoryTabs | `GET /categories` | tap → filter | `top-[108px] z-10` |
| … | … | … | … | Scrollable |

---

## Step 4 — ASCII Wireframe

Draw the happy path first. Then loading state. Then error state.

**Box rules:** use `┌ ┐ └ ┘ ├ ┤ ─ │` · label every zone `[Zone X — Name]`
· use real field names (not "Lorem ipsum") · mark computed values with `=`
· mark conditional zones with `(if ...)`

```
MOBILE — 390 px wide
┌────────────────────────────────────────┐
│ [Zone A — Header]                      │ ← sticky top-0
│  Quán Bánh Cuốn     Bàn 3    🛒 2     │
├────────────────────────────────────────┤
│ [Zone B — SearchBar]                   │
│  🔍 Tìm món nhanh...                  │
├────────────────────────────────────────┤
│ …                                      │
└────────────────────────────────────────┘

LOADING STATE:
┌────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← skeleton
│ ░░░░░░░░░░░░░░                         │
└────────────────────────────────────────┘

ERROR STATE:
┌────────────────────────────────────────┐
│   ⚠ Không tải được                     │
│   [Thử lại]                            │
└────────────────────────────────────────┘
```

---

## Step 5 — Component Map

**Check `shared/_INDEX_SHARING_COMPONENT.md` first. Reuse before creating.**

| Zone | Component | Reuse? | File |
|------|-----------|--------|------|
| A | `Header` | new | `[page]/page.tsx` inline |
| B | `SearchBar` | new | `components/menu/SearchBar.tsx` |
| J | `Button` | ✅ reuse → [shared/Button] | `components/ui/button.tsx` |
| — | `StatusBadge` | ✅ reuse → [shared/StatusBadge] | `components/shared/StatusBadge.tsx` |

---

## Step 6 — AC + Task Rows

### Acceptance Criteria

Concrete and testable. No prose.

```
AC-1   [trigger] → [expected outcome]
AC-2   If [condition] → [expected outcome]
AC-3   [component] shows [state] when [data condition]
```

### Task Rows

One task = one component OR one wiring concern (query, store slice, page assembly).
If a task touches 3+ files → split it.

| ID | Task | AC ref | Status | File |
|----|------|--------|--------|------|
| X-1 | `ComponentName` — short description | AC-1 · AC-2 | ⬜ | `path/to/file.tsx` |
| X-2 | Page assembly — wire zones + queries | AC-1 → AC-N | ⬜ | `[route]/page.tsx` |

**Status values:** ⬜ not started · 🔄 in progress · ✅ done · ⏸ blocked

---

## File naming convention

```
docs/fe/wireframes/
  [page-folder]/
    [page]_spec.md          ← this file (follow steps 1–6 above)
    [page]_vN.excalidraw    ← visual wireframe (Excalidraw)
    [page]_vN.png           ← exported PNG for quick preview
  shared/
    _INDEX_SHARING_COMPONENT.md
```

---

## What does NOT go in a spec file

| Do not put | Put it here instead |
|-----------|---------------------|
| TypeScript interfaces | `fe/src/types/` |
| Zustand store implementation | `fe/src/store/` |
| TanStack Query hook code | `fe/src/hooks/` |
| Business rules (cancel policy, RBAC) | `docs/core/MASTER_v1.2.md` |
| API endpoint details | `docs/contract/API_CONTRACT_v1.2.md` |

---

*File: `docs/fe/wireframes/HOW_TO_SPEC_v2.md` — v2 · 2026-05-25*
