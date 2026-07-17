# Onboarding — Frontend Developer

> Read this first. Then open `docs/fe/FE_SYSTEM_GUIDE.md` and go.

---

## Your Stack

Next.js 14 App Router · TypeScript strict · Tailwind CSS v3 · Zustand v4 · TanStack Query v5 · React Hook Form + Zod · Axios

## Your Entry Point

**`docs/fe/FE_SYSTEM_GUIDE.md`** — start every session here. It has the full epic list, scaffold state, design tokens, code patterns, and what to read per domain.

## State Ownership (memorize this)

| Data type | Where it lives | Never do this |
|---|---|---|
| Server data (products, orders) | TanStack Query `useQuery` | `useState` + `useEffect` + `fetch` |
| Auth token, cart | Zustand store | `localStorage` · React Context |
| Forms | React Hook Form + Zod | `useState` per field |
| API calls | `lib/api-client.ts` only | raw `fetch` · direct `axios.get()` |
| Page auth guard | `AuthGuard` component | manual redirect in each page |
| Prices | `formatVND()` from `lib/utils.ts` | `.toLocaleString()` |

## Phase Status (as of 2026-05-06)

| Phase | Status |
|---|---|
| Phase 5 — Frontend (auth, menu, checkout, KDS, POS) | ✅ COMPLETE |
| Phase 8 — Admin Dashboard | ✅ COMPLETE |
| Phase 7 — Testing + Go-Live | ⬜ NEXT |
| Phase 9 — Live data wiring | ⬜ NEXT |

**Next tasks:** open `docs/TASKS.md` → Phase 7 or Phase 9 → first ⬜ task with all dependencies ✅.

## What's Already Done (do not recreate)

- `fe/src/lib/api-client.ts` — Axios instance with interceptors (attach token, handle 401 refresh)
- `fe/src/store/auth-store.ts` — Zustand auth store with `accessToken`, `user`, `setAuth`, `logout`
- `fe/src/app/(auth)/login/` — login page + `AuthGuard`
- `fe/src/app/menu/` — QR menu + cart + checkout
- `fe/src/app/kds/` — Kitchen Display System (compact cards, status cycle)
- `fe/src/app/pos/` — POS + payment flow
- `fe/src/app/admin/` — Overview, Marketing (QR codes), Staff management
- `fe/src/app/layout.tsx` + `globals.css` + `tailwind.config.ts` — done
- `fe/src/components/ui/` — badge, button, card, input, label — done

## FE Pre-Task Phase (mandatory for any new FE feature)

Before creating task rows or writing code for a **new FE page or multi-component feature**, run Step 0:

```
Step 0a → READ spec end-to-end (mark every screen, component, data source)
Step 0b → DRAW wireframe (label zones [ComponentName] + data source per zone)
Step 0c → DECOMPOSE into task rows (1 task per component, spec_ref + draw_ref required)
Step 0d → ALIGN wireframe with user before writing code
```

Full rules: **`docs/base/LESSONS_LEARNED_v3.md` Phần 7** (§7.4 FE task checklist · §7.5 split signals)

Visual: `docs/doc_structure/claude_decision_workflow.excalidraw`

**FE task row format:**

```
| ID  | Domain | Task                     | Status | spec_ref    | draw_ref                      |
|-----|--------|--------------------------|--------|-------------|-------------------------------|
| 9-1 | FE     | PrepPanel component      | ⬜     | Spec_9 §3.2 | wireframes/overview.md zone-B |
```

A task with no `spec_ref` is **not ready to start**. Trace back to spec first.

## Key Rules

| Rule | Why |
|---|---|
| Never hardcode hex colors | Use Tailwind token names from `tailwind.config.ts` |
| `formatVND()` for all prices | Consistent VND formatting |
| Access token lives in Zustand only (memory) | Prevents XSS via localStorage |
| All API calls through `api-client.ts` | Centralized auth headers + error handling |
| Design tokens from `docs/core/MASTER_v1.2.md §2` | Single source of truth |
| All IDs typed as `string`, never `number` | UUIDs are strings |
| WS token via query param (not Authorization header) | Browser WebSocket API cannot set custom headers |

## Branch Naming

`feature/fe-001-auth-ui` · `fix/login-form-validation`

## Useful Commands

```bash
cd fe && npm run dev          # :3000
npm run build                 # check for TS errors
docker compose up -d --build fe
```
