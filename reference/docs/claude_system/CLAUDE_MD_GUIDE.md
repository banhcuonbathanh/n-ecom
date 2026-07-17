# How to write a CLAUDE.md (this repo's rules)

> A `CLAUDE.md` is a **map**, not a manual. Its only job is to get Claude to the right source
> file fast, and to front-load the traps that cause silent bugs.

---

## The 6 principles

1. **Map, not manual.** Tầng-1 `CLAUDE.md` < 150 lines. **No** spec text, schema, color hex, TTLs, or business rules in it — only pointers to where those live.
2. **One fact, one home.** Every value lives in exactly one source file. The moment you copy a value into `CLAUDE.md`, you've made a second truth that will drift. Point to it instead.
3. **Layer by scope.** Root `CLAUDE.md` = whole repo. `fe/CLAUDE.md` = FE only. Skill = how to code. Registry = what exists. Each layer owns only its scope; never repeat a parent's content.
4. **Imperative + scannable.** Tables and do/don't bullets, not prose. Claude scans; it doesn't read essays.
5. **Front-load the traps.** Put the non-obvious, bug-causing rules at the top (field-name table, "IDs are string", "no hardcoded hex", auth-token storage). These earn their space.
6. **No dead links.** A "SUPERSEDED" banner that is still linked from a live `CLAUDE.md` is worse than deleting the file — it splits attention. Retire it (see [CLEANUP_LOG.md](CLEANUP_LOG.md)) or remove the link.

---

## Section template for a scoped CLAUDE.md (e.g. `fe/CLAUDE.md`)

```markdown
# <area>/CLAUDE.md
> Tầng 1 — <area> map only. Does NOT contain: business rules, hex, schema, TTLs.
> MANDATORY before code: read skill <name> (.claude/skills/<name>/SKILL.md).

## Read before code (Tầng 2)     ← table: "need X → file → section"
## Architecture (strict)         ← the non-negotiable layer/folder contract
## Critical pointers             ← the traps (front-loaded, imperative)
## Commands                      ← copy-paste run commands
## Root context                  ← link up to ../CLAUDE.md
```

---

## Smell test before you commit a CLAUDE.md edit

- [ ] Did I add a **value** (hex / number / endpoint / rule text)? → move it to the source file, point instead.
- [ ] Is anything here **already** in the parent `CLAUDE.md` or the skill? → delete the duplicate.
- [ ] Does every link resolve to a **live, non-superseded** file?
- [ ] Could a fresh session, reading only this, find the right source in **one hop**?
- [ ] Is the file still under its line budget (< 150 for Tầng 1)?

---

## Where each kind of guidance belongs

| Kind of guidance | Home |
|---|---|
| "Read this before coding in area X" | the scoped `CLAUDE.md` (map only) |
| "How to write a component/handler correctly" | the **skill** (`frontend-nextjs` / `backend-go`) |
| "What components/stores/endpoints already exist" | the **registry** (`_INDEX_*.md`, `be_code_summary/`) |
| A color, TTL, endpoint, schema field, business rule | the **source of truth** doc (MASTER / contracts / specs) |
| An automatic behavior ("from now on always…") | a **hook** in `settings.json` — not a CLAUDE.md line |

---

*BanhCuon System · CLAUDE.md authoring guide · 2026-06-07*
