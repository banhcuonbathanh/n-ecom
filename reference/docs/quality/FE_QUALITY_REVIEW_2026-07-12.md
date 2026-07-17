# FE Quality Review — 2026-07-12

> Scope: last 5 sessions (FAV phase + ONLINE-4 + OBS-1), FE focus.
> Method: `/quality-check` skill — commit hygiene · task tracking · skipped steps · code rules · CSS safety · skeleton coverage.
> Limitation: all git commands were permission-blocked this session — commit list from session-start snapshot; per-commit file stats unavailable, so code checks ran on the 19 FE files named in MASTER_TASK / CURRENT_TASK session notes.

**Overall grade: 🟡 Fair — 3 ❌ issues**

| # | Issue | Severity | Fix |
|---|---|---|---|
| 1 | `build/page.tsx` — no loading/error/skeleton on 2 useQuery calls | ❌ (customer-facing) | [Solution 1](#solution-1) |
| 2 | FAV-5 tracking contradiction + live verify still pending | ❌ (process) | [Solution 2](#solution-2) |
| 3 | Commit `635d8ae "dfg"` — untraceable work | ❌ (history) | [Solution 3](#solution-3) |
| 4 | `OnlineSimulateBtn.tsx:10` — hardcoded API URL + api-client bypass | ⚠️ | [Solution 4](#solution-4) |

---

## 1. Commit Hygiene — 2/5 good

| Commit | Message | Grade |
|---|---|---|
| 0855674 | docs(obsidian): add project knowledge vault (OBS-1) | ✅ Good |
| 635d8ae | dfg | ❌ Bad |
| 1e243db | " bẻoe FAV-2-FE-1" | ⚠️ Weak (task ID present, rest gibberish) |
| b24e575 | before update code with favoirite html | ⚠️ Weak (checkpoint-style, typo) |
| 3553253 | feat(admin-overview): aggregate online orders… (ONLINE-4) | ✅ Good |

❌ `635d8ae "dfg"` cannot be mapped to any task — whatever FE work it contains is untraceable in history.

## 2. Task Tracking

| Task ID | Session status | MASTER status | Match? |
|---|---|---|---|
| OBS-1 | ✅ committed | ✅ | ✅ |
| FAV-2-FE-1 | ✅ committed | ✅ | ✅ |
| ONLINE-4 | ✅ committed | ✅ | ✅ |
| FAV-5 | not in CURRENT_TASK at all | 🔄 code-complete, live verify pending | ❌ |

- `CURRENT_TASK.md` says "Phase FAV ✅ COMPLETE (FAV-1·FAV-2-FE-1·FAV-2-FE-2·FAV-4)" — never updated for FAV-5 (added 2026-07-06). No "Stopped at" note for FAV-5's pending verify.
- `MASTER_TASK.md` phase-index row (line 48) marks Phase FAV "✅ COMPLETE" while FAV-5 in the same file is 🔄 — the summary contradicts its own detail.

## 3. Skipped Steps

- **FAV-5:** mandatory browser golden-path test NOT done ("Live verify PENDING — Playwright profile locked"). `CustomSuatSection.tsx` shipped with only tsc as the gate. Honest logging, but the step is open.
- FAV-1 / FAV-2-FE-1 / FAV-2-FE-2 / FAV-4 / ONLINE-4: live verify + gates all logged ✅.

## 4. Code Rules

- ⚠️ `fe/src/app/OnlineSimulateBtn.tsx:10` — `const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'` duplicated from `api-client.ts:7`, and the component calls raw `axios` instead of `lib/api-client.ts` (FE architecture rule: ALL API calls via api-client). Likely intentional (skip auth interceptors for the demo button), but the base-URL constant now lives in 2 places.
- All other rules clean across 19 checked files: no hex colors, no tokens in localStorage, no `image_url`/`base_price`, `formatVND` everywhere prices render, IDs are strings, storage keys via `STORAGE_KEYS` ✅.

## 5. CSS Safety

None found — no custom named `pb-*`/`pt-*` classes; `build/page.tsx` uses arbitrary-value `pb-[calc(…)]`, always valid.

## 6. Skeleton Coverage

- ❌ `fe/src/app/(shop)/menu/favourites/build/page.tsx` (new, FAV-2-FE-1): two `useQuery` calls (lines 21, 27) with NO `isLoading` branch, NO `isError` branch, NO skeleton — while fetching it renders an empty SuatBuilder (looks like zero dishes); on API error it silently shows an empty builder forever.
- ⚠️ `fe/src/app/(shop)/menu/favourites/page.tsx` (modified): same pattern — `isSuccess` used for gating only, no loading/error UI. Pre-existing, not counted.

---
---

# Solutions — ready-to-paste prompts

> Each block below is a self-contained prompt for a new Claude session. Paste one at a time, in order. Each fix is small enough for one session.

<a name="solution-1"></a>
## Solution 1 — build/page.tsx loading + error states (❌, do first)

**Why:** an API failure or slow fetch shows customers an empty "Tự tạo suất" builder with no feedback.

```text
/start-task Fix FE quality issue: add isLoading/isError/skeleton to menu/favourites/build/page.tsx

Context: docs/quality/FE_QUALITY_REVIEW_2026-07-12.md §6 flagged that
fe/src/app/(shop)/menu/favourites/build/page.tsx has two useQuery calls
(products + combos, lines 21–31) with no isLoading branch, no isError branch,
and no skeleton — during fetch it renders an empty SuatBuilder, and on API
error it silently shows an empty builder forever.

Task (FE only, 1 file unless a shared skeleton atom already exists):
1. Read .claude/skills/frontend-nextjs rules 03-data-and-state and
   04-rendering-and-loading first, and check how other (shop) pages
   (e.g. menu/page.tsx, order/[id]) render their loading + error states —
   reuse the exact same pattern/components, do not invent a new one.
2. Destructure isLoading + isError from BOTH queries in build/page.tsx.
3. isLoading (either query) → skeleton matching the page's real zones:
   top nav stays, then placeholder blocks for the grouped stepper rows and
   the sticky sumbar area.
4. isError (either query) → the project's standard error UI (same component
   the menu page uses) with a retry that refetches both queries.
5. No other behaviour changes. Do not touch SuatBuilder.tsx.

AC:
- Throttle/block /products in devtools → skeleton shows, no empty builder.
- Kill BE container → error state + retry button shows; restart BE + retry → builder loads.
- tsc --noEmit clean (2 pre-existing AuthState test errors allowed), lint clean, npm run build green.
- Live verify on docker fe :3000 with a screenshot before closing.

Also note (do NOT fix in this task, just confirm in the report):
menu/favourites/page.tsx has the same missing loading/error UI — pre-existing,
tracked separately.
```

<a name="solution-2"></a>
## Solution 2 — FAV-5 live verify + doc sync (❌)

**Why:** Phase FAV is marked ✅ COMPLETE in two places while FAV-5 is 🔄 with its mandatory browser test still pending.

```text
/start-task FAV-5 close-out: live verify "Suất tự tạo" menu section + sync task docs

Context: docs/quality/FE_QUALITY_REVIEW_2026-07-12.md §2–§3. FAV-5
(CustomSuatSection on /menu) is code-complete but its mandatory browser
golden-path test never ran (Playwright profile was locked by a stale Chrome
instance), and the tracking docs contradict each other:
- docs/tasks/CURRENT_TASK.md says "Phase FAV ✅ COMPLETE" and never mentions FAV-5
- docs/tasks/MASTER_TASK.md line 48 phase index says FAV ✅ COMPLETE while the
  FAV-5 row (line ~159) is 🔄

Task:
1. Ensure the stack is up (docker compose up -d) and Playwright can launch
   (if the profile is still locked, tell me the exact process to kill — do not
   force-kill anything yourself).
2. Browser golden path on :3000: save ≥1 custom suất via /menu/favourites/build,
   then open /menu and verify: (a) "Suất tự tạo" scroll-spy tab + section render,
   (b) one card per saved suất with name · món list · count·price,
   (c) "＋ Thêm vào giỏ" adds the exact suất lines to cart (check cart total),
   (d) with 0 saved suất the section + tab disappear. Screenshot each state.
3. If verify passes → set FAV-5 ✅ in MASTER_TASK.md (row + make line-48 phase
   index consistent) and update CURRENT_TASK.md to include FAV-5 in the Phase
   FAV completion note. If verify fails → keep 🔄, log exact failure in both
   files as "Stopped at".
4. No app-code changes unless the verify finds a real bug — if it does, STOP
   and show me before fixing.
```

<a name="solution-3"></a>
## Solution 3 — commit hygiene (❌, owner action — Claude's git is blocked)

**Why:** `635d8ae "dfg"` and two weak messages make the FAV work untraceable. Git is permission-blocked for Claude, so this one is a script for **you** to run.

```text
Claude: git is blocked for you, so generate a commit-message repair script for
me instead. Read docs/quality/FE_QUALITY_REVIEW_2026-07-12.md §1, then:

1. Run nothing — write a single script commit-fix.sh at repo root that I will
   run myself. It must FIRST check `git status` is clean and that no one has
   pushed/shared these commits (print a warning and exit if the branch is
   already on origin — rewriting shared history is not allowed).
2. The script uses git rebase with reworded messages for:
   - 635d8ae "dfg"                        → inspect `git show --stat 635d8ae`
     and propose a proper conventional message from the actual files changed
   - 1e243db " bẻoe FAV-2-FE-1"           → "feat(favourites): FAV-2-FE-1 Tự tạo suất builder view"
   - b24e575 "before update code with favoirite html" → "checkpoint: before favourites redesign (FAV phase)"
3. Print the proposed new messages for my confirmation INSIDE the script
   (read -q gate) before rewriting anything.
4. Going forward, remind me at every session close: format is
   `type(scope): TASK-ID summary` — never single words.
```

<a name="solution-4"></a>
## Solution 4 — OnlineSimulateBtn api-client bypass (⚠️, low priority)

```text
/start-task Refactor OnlineSimulateBtn.tsx off raw axios onto lib/api-client.ts

Context: docs/quality/FE_QUALITY_REVIEW_2026-07-12.md §4.
fe/src/app/OnlineSimulateBtn.tsx:10 hardcodes
`process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'`
(duplicated from lib/api-client.ts:7) and calls raw axios, violating the
"ALL API calls via lib/api-client.ts" rule.

Before coding, answer this and wait for my ALIGN: the demo button probably
uses raw axios ON PURPOSE to avoid api-client's auth interceptors while
minting a guest token. Options:
  a) export the shared BASE_URL constant from api-client.ts and keep raw
     axios here (kills the duplicate constant, keeps interceptor-free calls)
  b) use api-client for all calls if the interceptors are actually harmless
     for this flow
Recommend one after reading lib/api-client.ts's interceptors, then wait.

Scope: fe/src/lib/api-client.ts (export constant only) + fe/src/app/OnlineSimulateBtn.tsx.
AC: no `localhost` string outside api-client.ts; demo button still mints
guest token → posts online order → redirects to /orders?id= (verify live);
tsc/lint/build green.
```

---

*Generated by /quality-check on 2026-07-12 · branch `docs/customer-menu-alignment`*
