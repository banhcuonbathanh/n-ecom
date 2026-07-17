# Skills Registry — what fires when

> Skills live in `.claude/skills/<name>/SKILL.md`. Each has a `description` that decides when it auto-applies.
> User-invoked skills are called with `/<name>`. This table is the human-readable map of all of them.

---

## Stack rule skills (auto-apply when touching that code)

| Skill | Fires when you… | Owns |
|---|---|---|
| `frontend-nextjs` | write/review FE code (`fe/src/**`) | the modular FE rule router → `rules/01–05` + `_INDEX_*.md` registries |
| `backend-go` | write/review Go backend (handlers, services, repos, tests) | Go/Gin/sqlc non-obvious rules + critical patterns |
| `db-migration` | write a migration, run goose, run sqlc generate | the Goose + sqlc + MySQL sequence & gotchas |
| `order-flow` | write/review order, payment, or cancel logic (BE or FE) | the exact order-lifecycle business rules |

## Page / wireframe workflow skills (user-invoked)

| Skill | Usage |
|---|---|
| `wireframe` | `/wireframe <folder>` — scaffold a full wireframe folder for a page |
| `excalidraw` | `/excalidraw <page>` — generate the Excalidraw wireframe file |
| `redraw` | `/redraw <folder>` — redraw an existing wireframe as a v2 with recommendations |
| `redraw-all` | `/redraw-all` — loop redraw across all pages with a recommend.md |
| `dev-page` | `/dev-page <folder>` — build FE components + verify BE for a page from its wireframe |
| `status-routing-reference` | `/status-routing-reference <folder>` — generate the status→zone routing doc |
| `page-doc-set` | `/page-doc-set <page>` — generate a page's `<page>_be.md` Backend View (endpoints traced handler→service→repo→SQL), cross-check + sync all `docs/system` |
| `design` | `/design [scaffold\|lint\|export\|diff]` — manage DESIGN.md design-system spec |

## Session / quality skills (user-invoked)

| Skill | Usage |
|---|---|
| `handoff` / `hand-off` | end-of-session doc sync + handoff summary |
| `doc-check` | mid-session read-only doc staleness audit (optional task id) |
| `quality-check` | audit recent sessions for correctness / spec / commit hygiene |
| `codebase-graph` | `/codebase-graph [arch\|be\|fe\|api\|flow\|all]` — Mermaid knowledge graph |

---

## Adding a new skill

1. Create `.claude/skills/<kebab-name>/SKILL.md` with frontmatter `description:` (this string decides auto-fire).
2. Keep `SKILL.md` a **router** if it has sub-rules: index first, then `rules/*.md` read on demand (model: `frontend-nextjs`).
3. Add a row to this registry.
4. If it's user-invoked, document the `/<name>` usage and arguments here.

> See also the persistent memory note `project_skills_registry.md` for where skills live.
