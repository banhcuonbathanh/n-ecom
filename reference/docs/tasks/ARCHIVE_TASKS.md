# Archived Completed Tasks

> Tasks moved here from `MASTER_TASK.md` once their phase reached ✅ COMPLETE.
> These are historical record only — do not update, do not re-open tasks here.

---

## Phase 9 — Overview Page (Real API + Component Extraction) ✅

> **Owner:** FE | **Completed:** 2026-05
> **Spec:** `docs/spec/Spec_9_Admin_Dashboard_Pages.md §2`

| ID | Owner | Task | Status |
|---|---|---|---|
| P9-1 | FE | `admin.api.ts` — verify `listTables`, `listLiveOrders`, `updateOrderStatus` use real axios calls | ✅ |
| P9-2 | FE | `useOverviewWS` hook — WS connect/reconnect + 6 message type handlers → mutate TanStack Query cache | ✅ |
| P9-3 | FE | `StatCards` component — 4 stat cards derived from live orders | ✅ |
| P9-4 | FE | `WaitingCard` + `WaitingSection` — pending order cards with Kiểm tra toggle + 3 action buttons | ✅ |
| P9-5 | FE | `PrepPanel` — conditional panel, collapsible per-table + Tổng cần làm summary | ✅ |
| P9-6 | FE | `OrderDetail` — progress bar + 3 mini counters + item list + action buttons | ✅ |
| P9-7 | FE | `TableCard` + `TableGrid` — urgency border, occupied-first sort | ✅ |
| P9-8 | FE | `overview/page.tsx` — assemble all zones, wire `useOverviewWS`, 30s timer tick | ✅ |

---

## Phase P-PD — Product Detail Page ✅

> **Owner:** FE | **Completed:** 2026-05
> **Spec:** `docs/spec/Spec_3_Menu_Checkout_UI_v2.md §4`
> **Route:** `fe/src/app/(shop)/menu/product/[id]/page.tsx`

| ID | Owner | Task | Status |
|---|---|---|---|
| P-PD-1 | FE | Read Spec_3 §4 + verify `GET /products/:id` response shape + cart store `addItem` signature | ✅ |
| P-PD-2 | FE | Route file + Zone A (HeroImage) + Zone B (name, badge, price, desc) + loading skeleton | ✅ |
| P-PD-3 | FE | Zone C — ToppingSelector: multi-select checkboxes, live running total | ✅ |
| P-PD-4 | FE | Zone D — QtyStepper + Zone E — sticky CTA footer → add to Zustand cart store | ✅ |
| P-PD-5 | FE | Browser test: golden path + edge cases (no toppings, unavailable product) | ✅ |

---

## Phase P-UX2 — Customer UX Enhancements ✅

> **Owner:** FE | **Completed:** 2026-05

| ID | Owner | Task | Status |
|---|---|---|---|
| P-UX2-1 | FE | Favourites feature: `useFavouritesStore` (Zustand + localStorage persist) + heart toggle on `ProductCard` + `ComboCard` | ✅ |
| P-UX2-2 | FE | Combo detail page `/menu/combo/[id]` + explicit "Detail" link on `ComboCard` | ✅ |
| P-UX2-3 | FE | Customer settings page `/menu/settings` — display name + table label in localStorage | ✅ |

---

## Phase P11 — Add Items to Existing Order ✅

> **Owner:** Full (BE + FE) | **Completed:** 2026-05
> **Spec:** `docs/spec/Spec_4_Orders_API.md §5.2`
> **Goal:** `POST /api/v1/orders/:id/items` — append items to active order without creating a new order

| ID | Owner | Task | Status |
|---|---|---|---|
| P11-1 | BA | Add `POST /api/v1/orders/:id/items` to Spec4 §5.2 — request/response shape, validation, error codes, business rules | ✅ |
| P11-2 | BE | `AppendOrderItems` SQL + `UpdateOrderTotalAmount` SQL; `sqlc generate`; repo interface + impl | ✅ |
| P11-3 | BE | `AddItemsToOrder` service method — status guard, ownership, combo expand, recalc, SSE+WS publish | ✅ |
| P11-4 | BE | `AddItemsToOrder` handler + route `POST /api/v1/orders/:id/items` with `AuthRequired` middleware | ✅ |
| P11-5 | BE | `TestAddItems_Success` + `TestAddItems_StatusReady_Blocked` + `TestAddItems_WrongOwner` | ✅ |
| P11-6 | FE | `addItemsToOrder` in `api-client.ts` + "Thêm món" button on order page + menu `add_to_order` query param flow | ✅ |

---

## Phase P-ARCH — FE Architecture Groundwork ✅

> **Owner:** FE + Docs | **Completed:** 2026-05

| ID | Owner | Task | Status |
|---|---|---|---|
| P-ARCH-1 | FE | Create `src/lib/storage-keys.ts` — single source for all localStorage key constants; update 6 files to import from it | ✅ |
| P-ARCH-2 | Docs | Correct `menu_wireframe_v1.md` wrong file paths; fix `useCombos enabled` flag; update `_TEMPLATE.md` | ✅ |

---

## Phase P-DIAGRAM — Full System Interaction Map ✅

> **Owner:** Docs | **Completed:** 2026-05

| ID | Owner | Task | Status |
|---|---|---|---|
| P-DIAGRAM-1 | Docs | `docs/fe/wireframes/flow-full-system-journey.excalidraw` — 4-lane swimlane (Customer·Chef·Cashier·Manager) + 6 cross-actor realtime arrows | ✅ |

---

## Phase P-FIX — Modal Wiring (Spec Compliance Fix) ✅

> **Owner:** FE | **Completed:** 2026-05
> **Spec:** `docs/spec/Spec_3_Menu_Checkout_UI_v2.md §4.3 §4.4 §4.5`

| ID | Owner | Task | Status |
|---|---|---|---|
| P-FIX-1 | FE | Wire `ToppingModal` into `ProductCard` — remove inline topping chips | ✅ |
| P-FIX-2 | FE | Wire `ComboModal` into `ComboCard` — first click opens modal, subsequent stepper works | ✅ |

---

## Phase P-ORDER-TOPPING — Order Page Topping Display ✅

> **Owner:** FE + BE | **Completed:** 2026-05
> **Problem:** `order_items.toppings_snapshot` stored only `{ id }` — name/price missing

| ID | Owner | Task | Status |
|---|---|---|---|
| P-ORDER-TOPPING-1 | BE | `GetToppingSnapshot` in `ProductLookup` + enrich `buildProductRow` + stub in mock | ✅ |
| P-ORDER-TOPPING-2 | FE | `ToppingSnapshotEntry` type + render topping chips (name + price) in `DishRow` | ✅ |

---

## Phase P-FIX-MOCK — Fix order_service_test mockOrderRepo ✅

> **Owner:** BE | **Completed:** 2026-05
> **Problem:** `mockOrderRepo` missing `AppendOrderItems` → test file failed to compile

| ID | Owner | Task | Status |
|---|---|---|---|
| P-FIX-MOCK-1 | BE | Add `appendOrderItemsFn` field + `AppendOrderItems` stub to `mockOrderRepo` | ✅ |

---

## Phase P-GRAPH-ENRICH — Enrich Codebase Graphs for /dev-page ✅

> **Owner:** Docs | **Completed:** 2026-05

| ID | Owner | Task | Status |
|---|---|---|---|
| P-GRAPH-ENRICH-1 | Docs | Enrich `CODEBASE_GRAPH_BE.md` — Route Index + Service Index + Repository Index tables | ✅ |
| P-GRAPH-ENRICH-2 | Docs | Enrich `CODEBASE_GRAPH_FE.md` — Component Index + Store Field Index + Storage Keys Index | ✅ |

---

## Phase 7 — Completed Sub-Tasks ✅

> Remaining Phase 7 tasks live in `MASTER_TASK.md`. Only completed sub-tasks archived here.

| ID | Task | Status |
|---|---|---|
| P7-1.1 | Test scaffolding + TestLogin_WrongPassword + TestLogin_RateLimitAfter5Fails | ✅ |
| P7-1.2 | TestMultiSessionLogin + TestLogoutSingleSession | ✅ |
| P7-1.3 | TestAccountDisabledImmediate + TestTokenRotation | ✅ |
| P7-1.5 | Fix Spec4 §7 SSE payloads + §8 WS payloads + §3 combo display + align min_stock | ✅ |
| P7-2.1 | TestCreateOrder_ComboExpand + TestCreateOrder_DuplicateTable | ✅ |
| P7-2.2 | TestCancelOrder_Under30Percent + TestCancelOrder_Over30Percent | ✅ |
| P7-2.3 | TestItemStatusCycle + TestAutoReadyWhenAllItemsDone | ✅ |
| P7-3 | TestVNPayWebhook (4 cases) + TestCreatePayment_OrderNotReady | ✅ |
| P7-4 | FE store tests (cart + utils — 6 test cases) | ✅ |
| P7-5.1 | Integration test setup + all auth API endpoints | ✅ |
| P7-5.2 | Order + payment API endpoints integration tests (21/21 pass) | ✅ |
| P7-5.3 | SSE + WS reconnect behavior tests (8/8 pass) | ✅ |
| P7-6 | `scripts/seed.sql` — categories, products, toppings, combos, staff, tables | ✅ |
| P7-E2E-0 | Fix dev DB seed + verify login for all 4 accounts | ✅ |
| P7-E2E-1 | Re-run full Playwright suite — 9/9 pass | ✅ |
| P7-9 | `/privacy-policy` + `/terms` pages + cookie consent banner; PCI-DSS verified | ✅ |
