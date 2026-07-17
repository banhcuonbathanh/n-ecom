# Wireframe Folder Standard (Condensed)

> **TL;DR:** Every FE page gets a wireframe folder before any code is written. The folder holds one
> main spec (`[page]_wireframe_v1.md`), a visual (`.excalidraw` + `.png`), and supporting docs
> (business, tech, how-to-use, concerns, review). Copy the template, fill every section, use real
> Vietnamese copy. ASCII drawings of all built pages live in [`../08_pages/PAGES_INDEX.md`](../08_pages/PAGES_INDEX.md).

---

## Folder Layout

```
[page_folder]/                       ← lowercase_underscores, matches the FE route
├── [page]_wireframe_v1.md           ← Main spec (REQUIRED — always first)
├── [page].excalidraw                ← Visual wireframe (generate with /excalidraw skill)
├── [page].png                       ← PNG export — re-export after every zone change
├── business_description.md          ← User-facing description (no technical terms)
├── tech_description.md              ← Build contract: components, state, endpoints, rendering
├── how_to_use.md                    ← Step-by-step guide per zone (Vietnamese)
├── conccern.md                      ← Open questions / undecided items (never empty)
└── recomment/
    ├── recommend.md                 ← Human UX/UI review (tables, not chat)
    └── recomment_claude.md          ← AI analysis: reuse, state, performance strategy
```

---

## Required Files & What Goes in Each

| File | Must contain |
|---|---|
| `[page]_wireframe_v1.md` | ASCII wireframe with labeled zones [A], [B], [C]… (real copy, sticky/z-index noted) · Zone Mapping table · Data Sources per zone (store / query key / staleTime) · Component Specifications (`Reuse?` column — check the shared-component catalog first) · TypeScript interfaces + hook signatures · Edge Cases table · Testing checklist · Changelog |
| `tech_description.md` | Page structure + conditional rendering · **RBAC & Auth Rules table (required even for public pages)** · tech-stack tree · key implementation patterns · **Rendering Strategy table (ISR / RSC / Client per zone)** · file-organization tree (stores in `src/store/`, hooks in `src/hooks/` — never inside page folders) · **State Contract table** (reads / writes / lifecycle / next page) |
| `business_description.md` | 1-sentence purpose + 4–6 benefits + simple ordering flow. 300–500 words, no component names or API paths |
| `how_to_use.md` | One `##` per logical step; every zone covered; "Mẹo" table for offline / reload / max-quantity / empty-search / a11y |
| `conccern.md` | ≥ 3 open questions. Free-form scratchpad — not a spec |
| `recomment/` | UX strengths, recommendation tables, spec-vs-image alignment check, next steps |

**Critical rules:**
- Real Vietnamese copy in the ASCII wireframe — never "Button 1" or `[label]`
- Zone labels consistent across all tables (mapping, data, components, testing)
- The `.excalidraw` is the visual source of truth; the `.md` is the written one — if they conflict, fix the `.md`
- Every data source lists its query key; every sticky zone shows its `z-index`

---

## Minimum Viable Folder

Time-constrained? Do the main spec + the excalidraw/PNG only. Priority order:

1. `[page]_wireframe_v1.md` — required before any dev work
2. `[page].excalidraw` + `[page].png`
3. `tech_description.md` — required before a developer opens a file
4. `conccern.md` → `how_to_use.md` → `business_description.md` → `recomment/`

---

## Workflow Hooks

- Scaffold a full folder: `/wireframe <page-folder-name>` skill
- Generate the visual: `/excalidraw <page-name>` skill
- After building the page: add the dev redraw (DEV_PLAN) per [`NEW_PAGE_GUIDE.md`](NEW_PAGE_GUIDE.md) Phase 2b
- ASCII drawings of all existing pages: [`../08_pages/PAGES_INDEX.md`](../08_pages/PAGES_INDEX.md)
