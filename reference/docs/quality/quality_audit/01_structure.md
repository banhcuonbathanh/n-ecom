# FE Quality Audit — Aspect 1: Structure & Architecture

## Verdict

The codebase has a **mostly principled structure** with one genuinely good pattern at its core: all shared hooks live in `src/hooks/`, all global stores in `src/store/`, and page-to-page imports are absent. However, there are four systemic violations of the documented conventions that will compound as the codebase grows: (1) domain components belonging to a single page are placed in `src/components/<domain>/` (training, marketing, product-detail) rather than co-located with their feature, (2) two Zustand stores live inside `features/` instead of `src/store/`, (3) a `src/context/` folder exists with no documentation and is architecturally identical to what should be a hook + Zustand store, and (4) three empty or near-empty folders (`features/orders/`, `components/menu/`, `features/order/`) create a false impression of missing features. None of these cause runtime breakage today but they will make onboarding and feature development increasingly confusing.

---

## Findings

### ST-1 — Domain components scattered across `src/components/<domain>/` instead of co-located with their feature
**Severity:** 🟠 Major
**Files:**
- `src/components/admin/training/` (7 files) — used only by `app/(dashboard)/admin/training/page.tsx`
- `src/components/marketing/` (6 files) — used only by `app/(dashboard)/admin/marketing/page.tsx`
- `src/components/product-detail/` (5 files) — used only by `app/(shop)/menu/product/[id]/page.tsx`

**What's wrong:** The convention defines `src/components/shared/` for cross-page shared components and `src/components/ui/` for atoms. Domain-specific components that are consumed by exactly one page should live either inside their feature folder or co-located with the page (using Next.js `_components/` pattern, like `admin/products/_components/` does correctly). Placing them in top-level `src/components/` falsely implies they are shared cross-domain, making it unclear where to look for a component.

**Fix:** Move the three folders to co-located locations:
- `src/components/admin/training/` → `src/app/(dashboard)/admin/training/_components/`
- `src/components/marketing/` → `src/app/(dashboard)/admin/marketing/_components/`
- `src/components/product-detail/` → `src/app/(shop)/menu/product/[id]/_components/`

Update import paths in the three consuming pages. This matches the existing `_components/` pattern used by products, toppings, and ingredients pages.

**Status:** ⬜

---

### ST-2 — Two Zustand stores live inside `features/` instead of `src/store/`
**Severity:** 🟠 Major
**Files:**
- `src/features/auth/auth.store.ts` — imported by `src/lib/api-client.ts`, `src/context/OrdersWSContext.tsx`, and every auth-aware page
- `src/features/admin/summary.store.ts` — never imported anywhere (dead code — see ST-5)

**What's wrong:** The documented rule is "Stores → `src/store/` (top-level, NOT inside page folders)". `auth.store.ts` is the most widely imported file in the project (used by `api-client.ts`, guards, and dozens of pages), making it a cross-cutting concern that clearly belongs in `src/store/`. Its location inside `features/auth/` is a legacy placement that contradicts the stated rule and the `src/store/` entries for `cart.ts`, `favourites.ts`, `settings.ts`, and `theme.ts`.

**Fix:**
- Move `src/features/auth/auth.store.ts` → `src/store/auth.ts`
- Update all `@/features/auth/auth.store` import paths (approximately 15 files)
- Delete `src/features/admin/summary.store.ts` (dead — see ST-5)

**Status:** ⬜

---

### ST-3 — `src/context/` folder is undocumented and architecturally inconsistent
**Severity:** 🟠 Major
**File:** `src/context/OrdersWSContext.tsx`

**What's wrong:** The project architecture diagram in CLAUDE.md and `fe/CLAUDE.md` lists `features/`, `hooks/`, `store/`, `lib/`, `components/` — but no `context/`. The `OrdersWSContext` provides a WebSocket connection with a `subscribe(fn)` API. This is precisely what belongs in `src/hooks/` (the connection logic) backed by a Zustand store (the connected state). Using React Context here adds a context tree layer when Zustand already solves this without provider boilerplate. More critically, `WsMsg` is exported from this context file and used by `hooks/useOverviewWS.ts`, creating a cross-folder type dependency that is hard to trace.

**Fix:** Either (A) move `OrdersWSContext.tsx` to `src/hooks/useOrdersWS.ts` and document that the dashboard layout wraps children with its provider — and add `context/` to the arch diagram; or (B) convert the WS connection to a Zustand store (the cleaner option, consistent with the "client state → Zustand" rule). Minimum viable fix: add `context/` to the CLAUDE.md architecture table so its purpose is understood.

**Status:** ⬜

---

### ST-4 — Page-level `components/` folders mix naming conventions (some `_components/`, some `components/`)
**Severity:** 🟡 Minor
**Files:**
- `app/(dashboard)/admin/products/_components/` — uses underscore prefix ✅
- `app/(dashboard)/admin/toppings/_components/` — uses underscore prefix ✅
- `app/(dashboard)/admin/ingredients/_components/` — uses underscore prefix ✅
- `app/(dashboard)/admin/staff/components/` — no underscore
- `app/(dashboard)/admin/staff/task-board/components/` — no underscore
- `app/(dashboard)/admin/todo-list/components/` — no underscore
- `app/(shop)/menu/favourites/components/` — no underscore
- `app/(shop)/profile/components/` — no underscore
- `app/(shop)/tracking/components/` — no underscore

**What's wrong:** Next.js App Router convention uses `_components/` (underscore prefix) to indicate private co-located folders that are excluded from routing. Half the codebase uses `_components/`, the other half uses plain `components/`. This is inconsistent and `components/` folders without underscore are technically public route segments (though Next.js won't render them as pages without a `page.tsx`). The inconsistency creates confusion about intent.

**Fix:** Rename all `components/` folders inside `app/` to `_components/`. No logic changes needed, only folder renames and import path updates.

**Status:** ⬜

---

### ST-5 — Three dead/orphan items: `summary.store.ts`, `features/orders/`, `components/menu/`
**Severity:** 🟡 Minor
**Files:**
- `src/features/admin/summary.store.ts` — defines `useSummaryStore` but is never imported. The `summary/page.tsx` uses local `useState` for the range selector instead.
- `src/features/orders/` — contains only `.gitkeep`; the plural `orders/` folder was likely a scaffolding placeholder. The actual order feature is in `features/order/` (singular, with `OrderDetailSheet`).
- `src/components/menu/` — contains only `.gitkeep`; all menu components are correctly in `features/menu/components/`.

**What's wrong:** Dead folders with misleading names create false navigation targets. A developer searching for the order feature finds both `features/order/` (has real code) and `features/orders/` (empty), causing confusion.

**Fix:**
- Delete `src/features/admin/summary.store.ts`
- Delete `src/features/orders/` folder
- Delete `src/components/menu/` folder

**Status:** ⬜

---

### ST-6 — `src/store/trainingStore.ts` is defined but never imported
**Severity:** 🟡 Minor
**File:** `src/store/trainingStore.ts`

**What's wrong:** `useTrainingStore` is exported but never imported by any page or component. The training page (`admin/training/page.tsx`) manages its own state via local `useState` via the `useTrainingQueries` hook. The store was scaffolded but then bypassed.

**Fix:** Delete `src/store/trainingStore.ts`. If per-session training UI state ever needs to survive navigation, reintroduce then.

**Status:** ⬜

---

### ST-7 — `"use client"` directive on hook files `useTodoTasks.ts` and `useTrainingQueries.ts`
**Severity:** 🟡 Minor
**Files:**
- `src/hooks/useTodoTasks.ts` — line 1: `'use client'`
- `src/hooks/useTrainingQueries.ts` — line 1: `'use client'`

**What's wrong:** React hooks (custom or library) do not need `'use client'`. The directive has no effect on `.ts` hook files — it is only meaningful on component files imported into the React Server Component tree. Its presence is misleading: it suggests the hook cannot be used server-side, but hooks are already client-only by definition. This is cargo-cult copying of the directive from page files.

**Fix:** Remove the `'use client'` line from both files.

**Status:** ⬜

---

## What's Already Good

- **Import direction is clean.** No page imports from another page's folder. Cross-page data sharing happens correctly through stores and shared hooks.
- **`src/hooks/` discipline is strong.** All shared query/SSE/WS hooks are in `src/hooks/` — none were found embedded inside feature components or page folders.
- **Admin overview components are correctly feature-scoped.** `features/admin/components/` (WaitingSection, PrepPanel, TableList, etc.) are used exclusively by `admin/overview/page.tsx` and are not incorrectly promoted to `components/shared/`.
- **`_components/` pattern used correctly in three page folders.** The `products/`, `toppings/`, and `ingredients/` pages co-locate their components with the underscore prefix, which is the correct Next.js pattern.
- **No page-to-page imports found.** `grep` for `from '@/app` across the codebase returned zero results.
