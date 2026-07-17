# Page Folder Guide — Generate a Full Page Doc Set

> **TL;DR:** The gold-standard page folder is
> [`customer/customer_menu/`](customer/customer_menu/). It holds **6 files** that together fully
> document one FE page: the page itself, its BE view, two data-flow views, its loading states, and
> a narrative scenario. This guide is the recipe to produce that **same 6-file set** for any other
> page. **One model, one home (Rule #9):** never re-describe a fact that already lives in another
> file — link to it.

---

## 0. Before You Start (every file, no exceptions)

- **Code wins.** Every claim is traced from source on the current branch, **not** from docs. When
  a doc and the code disagree, the code is right — fix the doc and flag the drift.
- **Cite the source.** Every section names the file (and line range where useful) it came from,
  e.g. `menu/page.tsx:144-179`. Relative links from the page folder back to `fe/`/`be/` look like
  `../../../../../fe/src/...`.
- **Stay in your lane.** A page file lists *which* endpoints/components it uses; it does **not**
  re-document an object model's fields — link to its home in
  [../02_spec/object/OBJECT_MODELS.md](02_spec/object/OBJECT_MODELS.md) (e.g. Order →
  `OBJECT_MODEL_ORDER.md`).
- **TL;DR header on every file:** a blockquote with status (✅ implemented · 🔮 PLANNED), a
  one-line purpose, the source files traced, and links to the sibling files in the set.
- **Naming:** all files are prefixed with the page's folder slug, e.g. `customer_checkout.md`,
  `customer_checkout_be.md`. The folder slug matches the [PAGES_INDEX.md](PAGES_INDEX.md) row.

---

## 1. The 6 Files (what to build, in order)

| # | File | What it answers | Required? | Generator |
|---|---|---|---|---|
| 1 | `<page>.md` | What is this page — wireframe, zones, object model, business logic | **Always** | `/page-doc-set` Widen agent (guide §2) |
| 2 | `<page>_be.md` | Every BE endpoint the page calls, traced handler→service→repo→SQL | If page calls BE | `/page-doc-set` anchor (guide §3) |
| 3 | `<page>_crosscomponent_dataflow.md` | How widgets on **this one page** share data (no prop-drilling) | If page has ≥3 interacting widgets + shared store | `/page-doc-set` Widen agent (guide §4) |
| 4 | `<page>_crosspage_dataflow.md` | How this page's data lives **across other pages/devices** | If page hands data off (writes that outlive the page) | `/page-doc-set` Widen agent (guide §5) |
| 5 | `<page>_loading.md` | How the page behaves while data is in flight | If page fetches async data | `/page-doc-set` Widen agent (guide §6) |
| 6 | `SCENARIO_<PAGE>.md` | A narrative beat exercising **this page** end-to-end | Always — built around this page's own flows | `/page-doc-set` Widen agent (guide §7) |

> **One command builds the whole set:** `/page-doc-set <page-folder>` writes the `_be.md` anchor in
> session, then **spawns one subagent per remaining file** (#1, #3–#6), each following the matching
> section of this guide. Build order is handled for you — every file links back to #1 by its known
> filename, so the Widen agents run in parallel. #6 is a **page-specific** scenario named after the
> page's primary flow (e.g. `SCENARIO_MENU_ORDER.md`); it may link out to a shared scenario
> (e.g. `SCENARIO_LUNCH_RUSH.md`) rather than duplicate it.

---

## 2. File 1 — `<page>.md` (the page itself)

Model: [customer_menu.md](customer/customer_menu/customer_menu.md). Section skeleton:

```
# <Page Title> — `<route>`
> TL;DR (status · one-line purpose · 🔮 PLANNED note if any · link to _be.md)

## ASCII Wireframe        — boxed layout, each zone annotated "← A ZoneName", overlays listed below
## Zones                  — table: Zone | Component (features/<x>/<Name>) | Data source
## Key Interactions       — bullet list of taps/gestures → what they do
## Business Logic Used    — bullets linking to ../07_business_logic/* (do NOT restate the rule)
## Object Model           — only shapes THIS page owns; §-numbered; pointer-only to OBJECT_MODELS
   ### §1 … §N            — per object: FE shape ⇄ BE field ⇄ DB column, plus Flags/Known Mismatches
```

Rules: trace the wireframe from the real `page.tsx` + its components (✅ pages) — mark 🔮 PLANNED
zones as "proposed, owner to confirm". The Zones table is the contract; keep it in lockstep with
the drawing. End the object model with a **Flags / Known Mismatches** subsection.

## 3. File 2 — `<page>_be.md` (backend view)

**Run the `/page-doc-set <page-folder>` skill** — it produces this file to spec and syncs facts back
into `docs/system`. Model: [customer_menu_be.md](customer/customer_menu/customer_menu_be.md).
Section skeleton it generates:

```
## Endpoints Used by This Page   — table: # | Endpoint | Auth | Handler | Service | Repo/Query | Redis cache
## Auth Model on This Page       — which routes are public vs authMW, guest-JWT behaviour
## Per-Endpoint Detail           — ### per endpoint: service path, caching, serializer, line refs
## Caching & Invalidation
## Error Behaviour
## Flags
```

Every row traced to Go source (`be/cmd/server/main.go` routes + handler/service/repo files).

## 4. File 3 — `<page>_crosscomponent_dataflow.md` (one page, many widgets)

Model:
[customer_menu_crosscomponent_dataflow.md](customer/customer_menu/customer_menu_crosscomponent_dataflow.md).
Pick **one concrete order/action** and trace how the page's widgets share its data through the
store — **no props passed between widgets**. Section skeleton:

```
## 0. The <action>, in one line   + "whole picture on one screen" ASCII (widgets → store → widgets)
## 1. The cast of components       — table of the widgets touched by this action
## 2. The single source            — the Zustand/Query store; ### 2.1 exact traced shape; ### 2.2 selectors
## 3. <action>, step by step        — ### Step 1..N: who WRITES, who READS, at each beat
## 4. Three layers of state         — what belongs in store vs query vs local
## 5. Cross-component vs cross-page  — explicit boundary (links to file #4)
## 6. Gotchas worth remembering
## 7. The whole action on one timeline (sequence view)
## 8. Source & rule map             — every file:line + business rule cited
```

Traced from the store + payload-builder source (e.g. `fe/src/store/*.ts`, `fe/src/lib/*.ts`).

## 5. File 4 — `<page>_crosspage_dataflow.md` (across pages & devices)

Model:
[customer_menu_crosspage_dataflow.md](customer/customer_menu/customer_menu_crosspage_dataflow.md).
Answers: once this page hands its data off, how is it shared across the pages/devices that outlive
it? Identify the **hubs** (in-browser: localStorage cache + persisted store + URL id; server: the
one BE row + SSE/WS). Section skeleton:

```
## 0. The whole picture on one diagram   — browser hub ↔ THE WIRE ↔ server hub
## 1. The status lifecycle every page renders against
## 2. The moment of handoff — what this page leaves behind
## 3..N One section per downstream surface (detail page · list · tracking · admin/staff)
## Multi-device sync — one tap, N screens move
## Cancellation / reverse flows — initiators, endpoints, fan-out
## End-to-end timeline (all pages + devices)
## Reload (F5) behavior per page
## Durability matrix — what survives what
## Source & rule map
```

Traced from the SSE/WS hooks + storage-keys + types (`fe/src/hooks/useOrder*SSE.ts`,
`fe/src/lib/storage-keys.ts`, `fe/src/types/*.ts`).

## 6. File 5 — `<page>_loading.md` (data-in-flight behaviour)

Model: [customer_menu_loading.md](customer/customer_menu/customer_menu_loading.md). Section
skeleton:

```
## Loading Layers (outer → inner)   — numbered list: route spinner → Suspense → per-query states
### per layer                       — file:line, what renders, why
## Main content branch              — the priority-ordered states the main region renders
### skeleton / empty-state details
## Search/interaction gating        — any input that withholds a fetch
## Flags / Known Gaps
```

Traced from `loading.tsx`, the page's `<Suspense>`, and each `useQuery`'s `isLoading`/default.

## 7. File 6 — `SCENARIO_<PAGE>.md` (page-specific narrative)

Build a scenario **around this page's own flows** — one concrete run through the page, end to end,
grounded in the endpoints traced in its `_be.md` and the flows in its `_crosscomponent` /
`_crosspage` files. Name it after the page's primary action, e.g.
`SCENARIO_MENU_ORDER.md` (`customer_menu`), `SCENARIO_KDS_COOK.md` (`staff_kds`),
`SCENARIO_CASHIER_BILL.md` (`staff_cashier_payment`). Model:
[SCENARIO_LUNCH_RUSH.md](customer/customer_menu/SCENARIO_LUNCH_RUSH.md). A scenario has: a cast, a
setting, a minute-by-minute timeline of beats, then an "Under the hood" section (A=cross-component,
B=cross-page, C=FE→BE send, D=BE→FE receive/live, E=loading+caching, F=monitoring) and a one-line
mental model. Each `_dataflow.md` file links into the scenario beat it zooms on.

**Don't duplicate a shared scenario.** If a broader scenario (e.g. `SCENARIO_LUNCH_RUSH.md`)
already exercises this page as part of a bigger story, the page scenario should **zoom in on this
page's beat** and link out to the shared one for the surrounding context, per Rule #9 (one model,
one home).

---

## 8. Done Checklist (per page folder)

- [ ] `<page>.md` exists; wireframe + Zones table match real `page.tsx`.
- [ ] `<page>_be.md` generated via `/page-doc-set`; every endpoint traced to Go source.
- [ ] `_crosscomponent` + `_crosspage` flow files (if the page qualifies — §1 table).
- [ ] `_loading.md` (if the page fetches async data).
- [ ] `SCENARIO_<PAGE>.md` — page-specific narrative built around this page's own flows.
- [ ] Every file: TL;DR header, source citations, links to its siblings, no duplicated facts.
- [ ] [PAGES_INDEX.md](PAGES_INDEX.md) row updated with the page + its `[BE]` link.
- [ ] [BE_DOC_TRACKER.md](BE_DOC_TRACKER.md) updated if a `_be.md` was added.
- [ ] Drift found vs code → flagged to owner, not silently "fixed" in the doc only.
