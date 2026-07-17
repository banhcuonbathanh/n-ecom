# Custom Slash Commands — Usage Guide

> **Location:** `.claude/commands/` (project-level — available in this repo only)
> **How they work:** Each `.md` file in `.claude/commands/` becomes a slash command.
> The file content becomes the prompt Claude executes when you type the command.

---

## Available Commands

| Command | When to Use | What It Does |
|---|---|---|
| `/handoff` | End of every session | Reads task statuses, edits stale docs, outputs handoff summary |
| `/doc-check` | Mid-session or before starting a task | Scans docs for staleness, flags issues — read-only, no edits |
| `/doc-check [task-id]` | Before starting a specific task | Scopes the scan to one domain (e.g. `/doc-check 4.1`) |
| `/quality-check` | After completing a task or end of session | Audits last 5 sessions: commit hygiene, code rules, skipped steps, CSS safety, skeleton coverage |
| `/quality-check [N]` | When reviewing a specific number of sessions | Same audit scoped to last N sessions (e.g. `/quality-check 3`) |
| `/wireframe <folder-name>` | Before building any new FE page | Scaffolds full wireframe folder: 7 files + WIREFRAME_INDEX row. Run `/excalidraw` after. |
| `/excalidraw <folder-name>` | After `/wireframe`, once zones are planned | Draws the visual Excalidraw file. 3-phase: plan → main page → modals. |
| `/redraw <page-folder-path>` | When a page has a `recomment/recommend.md` and needs a v2 drawing | Reads v1 excalidraw + recommend.md, plans zone-level changes, draws v2 into `recomment/<name>_ver2.excalidraw`. Updates progress tracker. |
| `/redraw-all` | To loop through all 9 pages in one session | Processes one page at a time with approval gate. Reply "continue" to advance, "skip" to skip, "stop" to pause. Resumes from last ⬜ in tracker. |
| `/design` | Scaffold `docs/design/DESIGN.md` from existing tokens | Auto-reads `globals.css` + `tailwind.config.ts`, generates YAML front matter + markdown body. |
| `/design lint` | Validate `DESIGN.md` | Runs 7 rules: broken refs · primary color · WCAG contrast · orphaned tokens · typography · section order · touch target. |
| `/design export [tailwind\|css]` | Export tokens to code | Generates Tailwind `theme.extend` or CSS variables block from DESIGN.md tokens. Confirms before writing. |
| `/design diff <file1> <file2>` | Compare two DESIGN.md files | Token-level diff with regression detection. |
| `/status-routing-reference <page-folder>` | When you need a shared, code-accurate map of which status renders in which zone for an FE page | Reads the page's `page.tsx`, components, status enums, and query hooks, then writes `<Page>_Status_Routing_Reference.md`. Every cell traced to code; unverifiable cells marked `❓ UNVERIFIED`. Model: Admin_Overview_Status_Routing_Reference.md. |
| `/page-doc-set <page-folder-or-name>` | When you need the code-accurate Backend View for an FE page (which endpoints it hits + what the BE does for each) | Traces every endpoint handler → service → repo → SQL from Go source, cross-checks against all `docs/system` files, writes `<page>_be.md` (model: customer_menu_be.md), then syncs any drift back into `docs/system` + updates README.md/PAGES_INDEX.md. Unverifiable cells marked `❓ UNVERIFIED`. |
| `/comparison-doc <page-folder-name>` | When you need a code-accurate audit of where a page's **docs have drifted from the code** | Read-only 5-area audit (visuals · cross-component · cross-page · loading · FE⇄BE) fanned out across Sonnet agents. Writes 3 files in the page folder — `COMPARISON_DOC_VS_CODE_DETAILED.md` (EN), `..._DETAILED_VI.md` (VI mirror), `COMPARISON_VISUAL_MOCKUP_VI.md` (per-zone ①doc ②code ③fix + 📷 + 💬) — then rolls every 🔴 finding into `COMPARISON_TRACKER.md`. Never edits app code or the page doc-set. Model: customer_menu/. |

---

## How to Use `/handoff`

Type at the end of any work session:

```
/handoff
```

Claude will:
1. Read `docs/TASKS.md` and `CLAUDE.md` to understand session state
2. Run `git diff --stat` to see what files changed
3. Identify which documents need updating using the Step 7 rules from `docs/IMPLEMENTATION_WORKFLOW.md`
4. **Actually edit** those files (TASKS.md status, CLAUDE.md Current Work, LESSONS_LEARNED if a pattern was found)
5. Print a handoff summary block

**Example output:**
```
─────────────────────────────────────────
SESSION HANDOFF
─────────────────────────────────────────
Done this session:
  • 4.1-3 — auth_repo.go sqlc wrappers complete
  • 4.1-4 — auth_service.go Login/Refresh/Logout implemented

Docs updated:
  • docs/TASKS.md — 4.1-3 and 4.1-4 marked ✅
  • CLAUDE.md Current Work — Done/Next bullets updated

Next session starts with:
  Task 4.1-5 — Complete auth.go middleware (dependency: 4.1-4 ✅)

Flags for next session:
  ⚠️ FLAG: Redis is_active cache TTL not verified against spec — confirm 5min before 4.1-5
─────────────────────────────────────────
```

---

## How to Use `/doc-check`

Type any time to see what's stale without making changes:

```
/doc-check
```

Or scope to a specific task domain:

```
/doc-check 4.3
/doc-check 5.2
```

Claude will scan:
- TASKS.md for stale statuses (done work still marked ⬜)
- CLAUDE.md for outdated Current Work bullets
- New files that have no pointer in any CLAUDE.md
- Doc drift (spec says one thing, code does another)

**When to run it:**
- Before starting a new task — make sure you're not building on stale context
- After a long session — catch any docs that weren't updated in the flow
- Before `/handoff` — see what needs updating before the final commit

---

## File Locations

```
.claude/
└── skills/
    ├── handoff/
    │   └── SKILL.md      ← /handoff command source
    ├── doc-check/
    │   └── SKILL.md      ← /doc-check command source
    ├── excalidraw/
    │   └── SKILL.md      ← /excalidraw command source
    ├── quality-check/
    │   └── SKILL.md      ← /quality-check command source
    ├── wireframe/
    │   └── SKILL.md      ← /wireframe command source
    └── redraw/
        └── SKILL.md      ← /redraw command source
```

To add a new command: create a new folder under `.claude/skills/<name>/` containing a `SKILL.md` file.
The folder name becomes the slash command name.

---

## How Slash Commands Work (Claude Code)

Claude Code discovers skills in `.claude/skills/` when the session starts.
Each folder under `skills/` becomes a `/command-name` slash command.

- **`SKILL.md`** must be uppercase and include YAML frontmatter with a `description` field.
- **`$ARGUMENTS`** in the file content is replaced with whatever you type after the command name.
  Example: `/doc-check 4.1` → `$ARGUMENTS` = `"4.1"`
- Skills are **project-level** — only available in sessions opened in this repository.
- After creating the `.claude/skills/` directory for the first time, **restart Claude Code** once.
- After that, adding or editing skill files takes effect without restarting.

**Required SKILL.md format:**
```markdown
---
description: One sentence describing what this skill does
---

Your instructions here...
```

---

## Rule: Always End Sessions with `/handoff`

The Step 7 rule from `docs/IMPLEMENTATION_WORKFLOW.md` applies every session:

> **CLAUDE.md** = current state of the project (what's done, what's next).
> **LESSONS_LEARNED** = durable knowledge about patterns and mistakes.
> **TASKS.md** = task status (always updated after every task).

`/handoff` enforces all three in one command. Running it takes 30 seconds and prevents
the most common failure mode: starting the next session with stale context.
