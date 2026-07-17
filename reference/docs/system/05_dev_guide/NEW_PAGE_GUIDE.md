# New Page Guide — Build a Page That Fits the System

> **TL;DR:** Every new page follows the same 6 phases: **Read → Wireframe → Contract → Build → Wire → Verify**.
> The page must reuse the design system, put state in its correct home, and communicate through the
> existing data channels. If you follow this guide, your page will look and behave like every other
> page in the system — that is the goal.

---

## Phase 0 — Read (15 min, no exceptions)

| Read | Why |
|---|---|
| [../04_fe/DESIGN_SYSTEM.md](../04_fe/DESIGN_SYSTEM.md) | Tokens + shared components you MUST reuse |
| [../04_fe/STATE_MANAGEMENT.md](../04_fe/STATE_MANAGEMENT.md) | Where every piece of state lives |
| [../04_fe/DATA_COMMUNICATION.md](../04_fe/DATA_COMMUNICATION.md) | How pages talk to BE and to each other |
| The flow doc in [../01_flow/](../01_flow/) your page belongs to | Page must fit the existing journey |
| [../02_spec/API_SPEC.md](../02_spec/API_SPEC.md) | Which endpoints already exist |

---

## Phase 1 — Wireframe & Spec

Create a wireframe folder for the page following [WIREFRAME_STANDARD.md](WIREFRAME_STANDARD.md)
(ASCII drawings of all existing pages: [../08_pages/PAGES_INDEX.md](../08_pages/PAGES_INDEX.md)):

```
<page_name>/
  README.md               ← interface: what this page is, zones, links to the files below
  business_description.md ← why the page exists, user goals, business rules it enforces
  tech_description.md     ← components, state, endpoints, events — the build contract
  <page>_spec.md          ← zone-by-zone spec with ACs
  <page>.excalidraw       ← drawing (use /excalidraw skill)
```

Define **zones** (header / list / panel / modal...) — each zone becomes a component.

---

## Phase 2 — Data Contract (before any UI code)

Answer these in `tech_description.md`:

1. **What does the page read?** → list endpoints from [API_SPEC.md](../02_spec/API_SPEC.md). Missing endpoint? → BE task first ([BE_CODE_SUMMARY.md](../03_be/BE_CODE_SUMMARY.md) checklist).
2. **What does the page write?** → mutations + which query keys they invalidate.
3. **Realtime?** → which SSE/WS events update which query cache ([REALTIME_SSE.md](../03_be/REALTIME_SSE.md)).
4. **Cross-page state?** → which Zustand store; new persisted keys go in `storage-keys.ts`.
5. **Status routing** — if the page renders entities by status, write the status → zone table first (generate it with the `/status-routing-reference` skill).

---

## Phase 2b — Dev Redraw (DEV_PLAN — before any UI code)

Redraw the owner's wireframe as the **developer's picture** and get the *differences* approved
before coding. The wireframe shows what the user sees; the DEV_PLAN shows what the code must
guarantee — one component file per zone box, each zone's self-guard condition, the sticky/z-index
stack, the 3 loading/error/empty states as first-class rows, and arrows = store writes.

Template + worked example: [`../06_test_build/menu_page/DEV_PLAN.md`](../06_test_build/menu_page/DEV_PLAN.md)
(§4 explains exactly how the two drawings differ and why both are needed).

Minimum contents: zone diagram with conditions · build order (dependency-sorted) · data-flow
diagram (queries → page state → store writes → the mutation).

---

## Phase 3 — Build Components (zone by zone)

For each zone:

```
1. Check src/components/shared/ and src/components/ui/  ← does it already exist? REUSE.
2. New component → place by scope:
   - used by 2+ pages        → src/components/shared/
   - atom (button, badge…)   → src/components/ui/
   - page-only               → src/features/<domain>/ or next to the page
3. Style ONLY with design tokens (DESIGN_SYSTEM.md). No new hex values.
4. Loading/error/empty states per LOADING_PATTERNS.md — every fetch shows all 3 states.
```

State placement per component (strict — [STATE_MANAGEMENT.md](../04_fe/STATE_MANAGEMENT.md)):

| Data kind | Home |
|---|---|
| Server data | TanStack Query hook in `src/hooks/` |
| Cross-page client state | Zustand store in `src/store/` |
| Single-component UI state | `useState` local |
| Form | RHF + Zod |
| Shareable view state (tab, filter) | URL `searchParams` |

---

## Phase 4 — Wire the Page

1. Create route in `src/app/...` — pick the correct layout shell (client / staff / admin).
2. Compose zone components; page file stays thin (layout + data orchestration only).
3. All API calls through `lib/api-client.ts`. Order writes through `lib/order-payload.ts`.
4. Wire SSE/WS subscriptions → invalidate/update query cache (pattern in DATA_COMMUNICATION.md).
5. Guard by role if staff/admin page (RBAC: [BUSINESS_RULES.md](../02_spec/BUSINESS_RULES.md)).

---

## Phase 5 — Verify (definition of done)

- [ ] Every AC in the page spec passes
- [ ] Loading / error / empty states visible for every fetch
- [ ] Page uses only design tokens + shared components (no one-off styles)
- [ ] No hardcoded localStorage keys, no state in the wrong home
- [ ] Realtime updates arrive without refresh (if applicable)
- [ ] Screenshot vs wireframe match + click-test every interactive element (`/dev-page` skill does Phases 3–5 automatically)
- [ ] `npm run build` clean, existing tests still pass

---

## Deep Dive Sources

- `../04_fe/FE_TECH_SUMMARY.md` + `../04_fe/FE_CODE_SUMMARY.md` — full FE guide
- `WIREFRAME_STANDARD.md` (same folder) — wireframe folder standard
- Skills: `/wireframe`, `/excalidraw`, `/dev-page`, `/status-routing-reference`
