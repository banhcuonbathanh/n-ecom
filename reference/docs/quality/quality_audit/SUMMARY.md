# FE Quality Audit — Prioritized Summary

> **55 findings** across 8 aspects: **5 🔴 Critical · 23 🟠 Major · 27 🟡 Minor**.
> Audited 2026-06-11 (branch `experience_claude.md_system_1`). Full detail per finding (file:line + concrete fix) lives in the per-aspect report — open it before applying.
> Workflow: pick a finding top-down → read its entry in the report file → apply → `npm run build` + tests → mark its Status ✅ in the report.

## 🔴 Critical — fix first (5)

| # | ID | Report | One-line problem |
|---|---|---|---|
| 1 | SEC-1 | [05_security.md](05_security.md) | `/dev-login` + `/api/dev/run` reachable in production — login bypass with hardcoded credential and unauthenticated shell/Docker exec on the server |
| 2 | LG-1 | [07_logic.md](07_logic.md) | POS `createOrder` hand-rolls its items payload instead of `lib/order-payload.ts` — silently drops `combo_id`, `topping_ids`, `note` on all POS orders |
| 3 | LG-2 | [07_logic.md](07_logic.md) | Payment page has no `order.status === 'ready'` guard — cashier can POST /payments on pending/preparing orders (violates MASTER §4) |
| 4 | DF-1 | [02_data-fetching.md](02_data-fetching.md) | api-client 401-refresh interceptor drops concurrent requests — after token expiry, pages with parallel queries (POS, admin overview) silently fail |
| 5 | TS-1 | [06_type-safety.md](06_type-safety.md) | `StaffRole` defined 3× with diverged values; `task.ts` variant has invalid roles `kitchen`/`server` — breaks task-by-role filtering silently |

## 🟠 Major (23)

| # | ID | Report | One-line problem |
|---|---|---|---|
| 6 | SEC-3 | [05_security.md](05_security.md) | KDS page has no auth guard — direct URL access works |
| 7 | SEC-5 | [05_security.md](05_security.md) | `/orders/live` dashboard page also lacks auth guard |
| 8 | SEC-2 | [05_security.md](05_security.md) | WebSocket auth token passed in query string — leaks into access logs |
| 9 | SEC-4 | [05_security.md](05_security.md) | `youtubeUrl` rendered into `href` unvalidated — open external redirect / phishing vector |
| 10 | LG-3 | [07_logic.md](07_logic.md) | `OrderDetailSheet` cancel guard wrongly allows cancelling `ready`/`delivered` orders |
| 11 | LG-4 | [07_logic.md](07_logic.md) | `WaitingSection` action buttons diverge from the Status Routing Reference (dead `nextAction` code) |
| 12 | DF-2 | [02_data-fetching.md](02_data-fetching.md) | Admin category mutations never invalidate client-facing `['categories']` — menu/POS stale up to 5 min |
| 13 | DF-3 | [02_data-fetching.md](02_data-fetching.md) | `['products', id]` detail key collides with `['products', categoryId, search]` list key |
| 14 | DF-4 | [02_data-fetching.md](02_data-fetching.md) | Toppings mutation doesn't invalidate `['admin','products']` — ProductFormModal shows stale toppings |
| 15 | DF-5 | [02_data-fetching.md](02_data-fetching.md) | No central query-key registry — ad-hoc arrays in 20+ files (root cause of DF-2/3/4; fixing this fixes the class) |
| 16 | LD-1 | [03_loading-states.md](03_loading-states.md) | Admin combos page: fetch failure renders silently empty (no error state) |
| 17 | LD-2 | [03_loading-states.md](03_loading-states.md) | Profile page renders an empty form when the profile fetch fails |
| 18 | LD-3 | [03_loading-states.md](03_loading-states.md) | KDS initial load is a blank screen; BE-down is indistinguishable from "no orders" |
| 19 | CS-1 | [04_client-state.md](04_client-state.md) | `theme.ts` hardcodes localStorage key `'admin-theme'` (same issue as TS-9 — one fix closes both) |
| 20 | CS-2 | [04_client-state.md](04_client-state.md) | `favourites.ts` persist has no `version`/`migrate` — schema change corrupts persisted data (same class as the P-FIX-CANH bug) |
| 21 | TS-2 | [06_type-safety.md](06_type-safety.md) | `handleFormSubmit: (values: any)` in admin/staff page discards the Zod-validated form type |
| 22 | TS-3 | [06_type-safety.md](06_type-safety.md) | `useCustomerProfile` types camelCase fields with no matching BE endpoint shape |
| 23 | ST-1 | [01_structure.md](01_structure.md) | 18 single-page domain components live in shared `src/components/<domain>/` instead of their feature/page folder |
| 24 | ST-2 | [01_structure.md](01_structure.md) | Two Zustand stores live inside `features/` instead of `src/store/` |
| 25 | ST-3 | [01_structure.md](01_structure.md) | `src/context/` folder is undocumented and inconsistent with the state architecture |
| 26 | PF-1 | [08_performance.md](08_performance.md) | `ProductCard`/`ProductGridCard` re-render on every cart mutation (whole-`items` subscribe; same root as CS-6) |
| 27 | PF-2 | [08_performance.md](08_performance.md) | KDS order cards re-render on every WebSocket push |
| 28 | PF-3 | [08_performance.md](08_performance.md) | `admin/layout.tsx` is `"use client"` — forces the entire admin section client-side |

## 🟡 Minor (27)

| ID | Report | One-line problem |
|---|---|---|
| SEC-6 | [05_security.md](05_security.md) | `NEXT_PUBLIC_STORAGE_URL` silently undefined → wrong image base URL |
| SEC-7 | [05_security.md](05_security.md) | Order data in localStorage — PII survives XSS / leaks cross-tab |
| LG-5 | [07_logic.md](07_logic.md) | Cancel-button visibility differs between `order/[id]` page and `OrderDetailSheet` |
| LG-6 | [07_logic.md](07_logic.md) | `useOrderSSE`: REST snapshot and SSE stream can apply out of order on connect |
| LG-7 | [07_logic.md](07_logic.md) | No double-submit guard on `createPayment` mutation |
| DF-6 | [02_data-fetching.md](02_data-fetching.md) | KDS keeps orders in `useState` instead of the Query cache; WS mutates local state |
| DF-7 | [02_data-fetching.md](02_data-fetching.md) | SSE hooks read `NEXT_PUBLIC_API_URL` directly, bypassing the api-client base URL |
| LD-4 | [03_loading-states.md](03_loading-states.md) | No `error.tsx`/`global-error.tsx` anywhere — JS errors crash to a blank screen |
| LD-5 | [03_loading-states.md](03_loading-states.md) | Admin pages use text "Đang tải..." instead of skeletons (layout shift) |
| LD-6 | [03_loading-states.md](03_loading-states.md) | Payment page loading state is plain inline text |
| CS-3 | [04_client-state.md](04_client-state.md) | `checkout/page.tsx` subscribes to the whole cart store (no selector) |
| CS-4 | [04_client-state.md](04_client-state.md) | `TableConfirmModal` subscribes to the whole cart store |
| CS-5 | [04_client-state.md](04_client-state.md) | `settings.ts` persist has no `version`/`migrate` |
| CS-6 | [04_client-state.md](04_client-state.md) | Product cards subscribe to the entire `items` array (perf detail of PF-1) |
| TS-4 | [06_type-safety.md](06_type-safety.md) | `updateOrderStatus` accepts `status: string` instead of `OrderStatus` union |
| TS-5 | [06_type-safety.md](06_type-safety.md) | `Payment` interface is a local inline type, not in `src/types/` |
| TS-6 | [06_type-safety.md](06_type-safety.md) | `WsMsg` interface duplicated in two files |
| TS-7 | [06_type-safety.md](06_type-safety.md) | Non-null assertions on `toppings_snapshot!` inside a guard TS can't narrow |
| TS-8 | [06_type-safety.md](06_type-safety.md) | `err: any` in three mutation `onError` callbacks |
| TS-9 | [06_type-safety.md](06_type-safety.md) | `theme.ts` hardcoded storage key (duplicate of CS-1) |
| ST-4 | [01_structure.md](01_structure.md) | Page `components/` folders mix `_components/` and `components/` naming |
| ST-5 | [01_structure.md](01_structure.md) | Dead code: `summary.store.ts`, `features/orders/`, `components/menu/` |
| ST-6 | [01_structure.md](01_structure.md) | `store/trainingStore.ts` defined but never imported |
| ST-7 | [01_structure.md](01_structure.md) | `"use client"` on pure hook files |
| PF-4 | [08_performance.md](08_performance.md) | Payment QR uses `<img>` instead of `next/image` |
| PF-5 | [08_performance.md](08_performance.md) | Training cover images use `<img>` with no lazy loading |
| PF-6 | [08_performance.md](08_performance.md) | `useOrderSSE` captures a stale `token` in its reconnect closure |

## Cross-references (one fix closes several findings)

- **CS-1 = TS-9** — same hardcoded `'admin-theme'` key.
- **PF-1 ⊃ CS-6** — fixing the product-card selector fixes both.
- **DF-5 is the root cause** of DF-2/DF-3/DF-4 — introduce a central `lib/query-keys.ts` first, then the three invalidation bugs become one-line fixes.
- **LG-6 and PF-6** both live in `useOrderSSE` — fix together.
- **ST-5 + ST-6** — one dead-code sweep.

## Suggested apply order

1. **Security & money first:** SEC-1 → LG-1 → LG-2 → DF-1 → SEC-3/SEC-5.
2. **Root-cause refactors:** DF-5 (query-key registry) → then DF-2/3/4 · TS-1 (single `StaffRole`).
3. **Customer-visible UX:** LD-1/2/3 · LG-3/4.
4. **Structure moves** (mechanical, do in one sitting each): ST-1, ST-2, ST-3, ST-5/6.
5. **Polish:** remaining 🟡.
