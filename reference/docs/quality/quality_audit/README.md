# FE Quality Audit — docs/fe/quality_audit/

> One-time FE code-quality audit (task **P-FEQA**, 2026-06-11). Read-only — no code was changed.
> 55 findings: 5 🔴 · 23 🟠 · 27 🟡.

## Files

| File | What it is |
|---|---|
| [SUMMARY.md](SUMMARY.md) | **Start here** — all findings prioritized, apply-order worklist + suggested batches |
| [00_ASPECTS.md](00_ASPECTS.md) | The 8 aspects checked, finding-ID prefixes, severity definitions |
| [01_structure.md](01_structure.md) | ST — folder conventions, duplicate/dead folders, server/client split |
| [02_data-fetching.md](02_data-fetching.md) | DF — TanStack Query keys, invalidation, api-client, SSE |
| [03_loading-states.md](03_loading-states.md) | LD — loading/error/empty coverage per page (incl. coverage table) |
| [04_client-state.md](04_client-state.md) | CS — Zustand stores, persist configs, storage-keys compliance |
| [05_security.md](05_security.md) | SEC — tokens, dev backdoors, route guards, XSS, env exposure |
| [06_type-safety.md](06_type-safety.md) | TS — `any`/casts, contract typing, Zod coverage, duplicated types |
| [07_logic.md](07_logic.md) | LG — cart math, payload builder, status routing, business rules |
| [08_performance.md](08_performance.md) | PF — re-renders, `"use client"` placement, images |

## Workflow for applying a finding

1. Pick the next unchecked item in [SUMMARY.md](SUMMARY.md) (top to bottom).
2. Read its full entry in the aspect report (file:line + concrete fix).
3. Apply the fix → `npm run build` + relevant tests.
4. Mark Status ✅ in the aspect report and tick the box in SUMMARY.md.

Each finding is independently applicable unless its SUMMARY entry says otherwise (DF-5 before DF-2/3/4; duplicates CS-1=TS-9, CS-6=PF-1 are fixed once).
