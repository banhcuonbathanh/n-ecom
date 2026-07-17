# Claude System — how this repo drives Claude

> **Purpose:** one home for *how Claude is configured, what it reads, and how to write the files that steer it.*
> If you are wondering "why does Claude read X?" or "where do I put a new rule?" — start here.

This folder is **meta**: it documents the instruction system, it is **not** itself a spec.
Business truth still lives in `docs/spec/`, `docs/core/`, `docs/contract/`.

---

## The 4 files

| File | Answers the question |
|---|---|
| [CONTEXT_MAP.md](CONTEXT_MAP.md) | *What does Claude read, in what order, for FE / BE / DevOps work?* |
| [CLAUDE_MD_GUIDE.md](CLAUDE_MD_GUIDE.md) | *How do I write or edit a `CLAUDE.md` correctly?* |
| [SKILLS_REGISTRY.md](SKILLS_REGISTRY.md) | *Which skills exist, when do they fire, what do they own?* |
| [CLEANUP_LOG.md](CLEANUP_LOG.md) | *Which docs are stale / duplicated and should be retired?* |
| [usage_review/](usage_review/README.md) | *Is the way we use Claude good? Audit + improvement plan (2026-06-11).* |

---

## The instruction hierarchy (whole repo, one glance)

```
CLAUDE.md  (root)              ← whole-repo map · phase status · 7-step workflow   [ALWAYS loaded]
   ├── fe/CLAUDE.md            ← FE-only map                                       [loaded in fe/]
   │      └── skill: frontend-nextjs  → rules/01–05  + _INDEX_*.md registries
   ├── (be/CLAUDE.md if added) ← BE-only map
   │      └── skill: backend-go        + docs/be/be_code_summary/
   └── docs/claude/CLAUDE_DEVOPS.md    ← DevOps guide
```

**Rule of the system:** each layer only owns its own scope. A value (color, TTL, endpoint, schema)
lives in exactly **one** source file — `CLAUDE.md` files and this folder only ever *point* to it.

---

*BanhCuon System · Claude System index · created 2026-06-07*
