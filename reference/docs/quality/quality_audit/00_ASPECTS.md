# FE Quality Audit — Aspects Checklist

> What this audit checks, per aspect. Each aspect has its own report file with numbered findings.
> Finding format: `<PREFIX>-<n>` · Severity (🔴 Critical / 🟠 Major / 🟡 Minor) · `file:line` · Problem → Fix.
> Apply findings one by one from `SUMMARY.md` (prioritized).

| # | Aspect | Prefix | Report | What is checked |
|---|---|---|---|---|
| 1 | Structure & Architecture | ST | `01_structure.md` | Folder conventions (hooks → `src/hooks/`, stores → `src/store/`, shared components → `src/components/shared/`); feature boundary violations; duplicate/overlapping folders (e.g. `features/order` vs `features/orders`, `components/menu` vs `features/menu/components`); import direction (no page → page imports); server vs client component split; dead files |
| 2 | Data Fetching & Server State | DF | `02_data-fetching.md` | TanStack Query only for server state (no raw fetch/useEffect fetching in components); query key consistency + central registry; invalidation correctness after mutations; staleTime/refetch config; SSE handling (reconnect, cleanup); all calls go through `lib/api-client.ts` |
| 3 | Loading / Error / Empty States | LD | `03_loading-states.md` | Every data-driven page/zone has loading UI (skeleton > spinner), error UI with retry, and empty state; no layout shift; mutation pending states (button disabled/spinner); optimistic updates have rollback; error boundaries exist |
| 4 | Client State (Zustand) | CS | `04_client-state.md` | Store shape (no server data cached in stores); persist config (partialize, version + migrate); ALL localStorage keys via `src/lib/storage-keys.ts`; no state duplicated between Query cache and store; selector usage (avoid whole-store subscribe); store sprawl |
| 5 | Security | SEC | `05_security.md` | Token handling (access token in memory only — NEVER localStorage; refresh in httpOnly cookie); role guards on dashboard routes (client guard + what BE enforces); `dangerouslySetInnerHTML` / XSS sinks; dev-only routes (`/dev-login`, `/api/dev`) reachable in prod build; secrets/env leakage to client bundle (`NEXT_PUBLIC_` misuse); open redirects; input validation before POST |
| 6 | Type Safety & Validation | TS | `06_type-safety.md` | `any` / unsafe `as` casts; API response types match `API_CONTRACT_v1.2` (snake_case fields: `image_path`, `price`, …); Zod coverage on forms AND on critical API payloads; shared types in `src/types/` vs duplicated inline; strict null handling |
| 7 | Logic Correctness | LG | `07_logic.md` | Cart math (combo header price = 0, no double count); order payload always built via `lib/order-payload.ts` (all 3 POST paths); status routing matches `Admin_Overview_Status_Routing_Reference.md`; cancel rule; payment only when `ready`; item status derived from `qty_served`; race conditions (double submit, stale closure); UUID as string everywhere |
| 8 | Performance & UX | PF | `08_performance.md` | Unnecessary client components (`"use client"` too high); missing memo on long lists (menu grid, KDS); `useEffect` misuse; image optimization (`next/image`); re-render storms from store subscribes; bundle red flags (heavy deps imported client-side) |

## Out of scope
- BE code (separate audit)
- Visual/pixel fidelity vs wireframes (covered by `/dev-page` phase 4)
- Test coverage gaps (only flags where a finding NEEDS a test to verify the fix)

## How to use
1. Read `SUMMARY.md` — findings sorted by severity.
2. Pick one finding → apply fix → run `npm run build` + relevant tests.
3. Mark the finding ✅ in its report file.
