# Graphs Index

> Read this file first. Use the decision table to pick which graph file(s) to open next.
> Do NOT read all graph files — each one is large. Read only what the task needs.

---

## Files

| File | Contains | Freshness |
|------|----------|-----------|
| `FE_STRUCTURE.md` | FE folder tree · Store Fields (interface fields per store) · Storage Keys table · Route Groups · State Layer Summary | Manual — update header date after editing |
| `BE_STRUCTURE.md` | BE folder tree (handler / service / repo / db layer per domain) | Manual — update header date after editing |
| `CODEBASE_GRAPH_FE.md` | Mermaid: page → store → BE endpoint connections (what is already wired in each page) | Auto — `/codebase-graph fe` or `/codebase-graph refresh` |
| `CODEBASE_GRAPH_BE.md` | Mermaid: handler → service → repo → DB table per domain | Auto — `/codebase-graph be` or `/codebase-graph refresh` |
| `CODEBASE_GRAPH.md` | Mermaid: full system arch + FE↔BE API map + user journey sequence diagrams | Auto — `/codebase-graph arch` / `api` / `flow` |

---

## Decision Table — which file to open

| Task | Files to read | Skip |
|------|--------------|------|
| `/dev-page` Phase 1 audit (FE page) | `FE_STRUCTURE.md` | all others |
| Check if a FE component file exists | `FE_STRUCTURE.md` (Folder Tree) | all others |
| Check store interface fields | `FE_STRUCTURE.md` (Store Fields) | all others |
| Check localStorage key constants | `FE_STRUCTURE.md` (Storage Keys) | all others |
| Understand which stores/endpoints a page already wires | `CODEBASE_GRAPH_FE.md` ⚠️ verify against page.tsx | all others |
| Look up a BE handler / service / repo file path | `BE_STRUCTURE.md` | all others |
| Understand BE domain wiring (handler → service → repo) | `CODEBASE_GRAPH_BE.md` | all others |
| System-level orientation / onboarding | `CODEBASE_GRAPH.md` | all others |
| Adding a new FE page or store | `FE_STRUCTURE.md` (to find correct folder) | all others |
| Adding a new BE domain | `BE_STRUCTURE.md` (to find correct folder) | all others |

---

## Freshness Warning

`CODEBASE_GRAPH_FE.md` and `CODEBASE_GRAPH_BE.md` are auto-generated — they can drift from reality.
Always verify a specific claim from these files against the actual source file before acting on it.

`FE_STRUCTURE.md` and `BE_STRUCTURE.md` are manually maintained — check the `> last updated` date at the top.
If older than 7 days and you changed code in that session, run `/codebase-graph refresh` before trusting the Store Fields or folder tree.
