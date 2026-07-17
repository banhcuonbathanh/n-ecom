# client_menu_page_v2 — consolidated menu page docs

> Clean, de-duplicated replacement for `../client_menu_page/`.
> Created 2026-06-08. The old folder had **5 documents describing the same zones** (drift risk);
> this folder has **one canonical spec** + the supporting docs the FOLDER_STANDARD actually calls for.

## What's here

| File | Role |
|---|---|
| **`menu_spec.md`** | ⭐ **CANONICAL** as-built spec — zones, data sources, component tree, BE reads/writes, cross-page state, deviations, concerns, **Acceptance Criteria**. Edit this; nothing else describes the zones. |
| `business_description.md` | Customer-facing benefits (unchanged). |
| `tech_description.md` | Tech architecture — RBAC, state contract, rendering strategy. **File-org tree corrected to as-built** (`src/features/menu/components/`). |
| `how_to_use.md` | End-user step-by-step guide (unchanged). |
| `conccern.md` | Open questions (rewritten from raw scratch into the 5 real concerns). |
| `recomment/` | UX review (`recommend.md`) + Claude analysis (`recomment_claude.md`) (unchanged). |

**Visual assets are NOT duplicated** (large binaries). They stay in the old folder:
`../client_menu_page/menu_ver3_ux.excalidraw` (latest UX) and `menu_ver1_done.png`.

## Old → new mapping

| Old file (`../client_menu_page/`) | Status |
|---|---|
| `menu_wireframe_v1.md` | ➜ superseded (design wireframe, pre-build) |
| `menu_spec.md` | ➜ superseded — its 23 ACs were carried into `menu_spec.md` here |
| `menu_spec_ver1.md` | ➜ merged into `menu_spec.md` |
| `Menu_Status_Routing_Reference.md` | ➜ merged into `menu_spec.md` |
| `Menu_Reference_Combined.md` | ➜ became `menu_spec.md` (canonical) here |
| `business_description.md` · `how_to_use.md` · `tech_description.md` · `recomment/*` | ➜ kept (tech corrected) |
| `conccern.md` | ➜ rewritten |

## ⚠️ Not yet done (follow-ups, per owner decision 2026-06-08)

Index links still point at the OLD folder. When ready to make this folder live, repoint these
5 references from `menu_wireframe_v1.md` / `menu_spec.md` → `client_menu_page_v2/menu_spec.md`:

- `../shared/WIREFRAME_INDEX.md` (row 15)
- `../_MASTER.md` (Menu row, line ~34)
- `../shared/_INDEX_SHARING_COMPONENT.md` (line ~118)
- `../shared/_INDEX_STATE_MANAGEMENT.md` (line ~231)
- `../shared/_INDEX_RENDERING_STRATEGY.md` (line ~95)

The old folder can then be deleted (git keeps history) or kept as an archive.
