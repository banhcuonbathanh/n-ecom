# /page-doc-set Progress Tracker

> One source of truth for all `/page-doc-set` runs.
> A Backend View (`<page>_be.md`) = the code-accurate map of every BE endpoint a page calls,
> traced handler → service → repository → SQL, with auth, caching, errors, and flags.
> Update status + concerns after each run. Never leave a row blank after a session.
> Model file: `docs/system/08_pages/customer/customer_menu/customer_menu_be.md`
> Skill: `.claude/skills/page-doc-set/SKILL.md`

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Done — every cell traced to code, docs/system synced |
| ⚠️ | Done but has `❓ UNVERIFIED` cells / open concerns / drift to resolve |
| ❌ | Blocked — page not coded yet (🔮 PLANNED) |
| N/A | Page calls no BE endpoints (static / localStorage-only) |

---

## How to Use

1. Pick a page row below, copy its command, paste it into the prompt.
2. The skill writes `<page>_be.md`, then syncs `docs/system` (API_SPEC, DB_SCHEMA, REDIS_CACHE…),
   updates README + PAGES_INDEX, and logs any drift in the LOGIC Decision Log.
3. Update this row's **Status / Last Run / Concerns** after the run.

---

## Customer Pages

| # | Page | Route | Command | Status | Last Run | Concerns / Notes |
|---|------|-------|---------|--------|----------|-----------------|
| C1 | Menu | `/menu` | `/page-doc-set customer_menu` | ✅ | 2026-06-13 | Model file. 6 endpoints (3 GET catalog public + POST /orders + POST /orders/:id/items + GET /orders/:id). Refresh: re-traced all cells to code — handbook (REDIS_CACHE/CACHE_FLOW/API_SPEC) all match; fixed 3 service line-number offsets in _be.md (ListProducts 164, ListCategories 344, ListCombos 497). No unverified cells. |
| C2 | Welcome | `/welcome` | `/page-doc-set customer_welcome` | N/A | 2026-06-15 | **Confirmed zero BE calls — fully static server component.** Traced `app/welcome/page.tsx` (256 lines, self-contained): no `'use client'`, no hooks, no `fetch`/`api-client`, no store. **Resolved the standing question — "signature dishes likely GET /products": NO, they are the hardcoded `dishes` constant (`page.tsx:9-25`); `hours` likewise (`page.tsx:27-30`).** Every CTA is a `next/link` → `/menu` (or `#about` anchor / `/privacy-policy` / `/terms`). 6-file set: `customer_welcome.md` already current + accurate; built **SCENARIO_WELCOME.md** (land→CTA→/menu); `_be.md` / `_crosscomponent` / `_crosspage` / `_loading` all **N/A** (no BE / no shared store / no data handoff / no async fetch). No `_BUGS.md` (no FE/BE code disagreement). No handbook drift — `customer_welcome.md` matched code. 🔮 PLANNED (owner 2026-06-12): QR table banner + `/introduction`/customer-login links would make it dynamic → refresh then. 0 ❓ UNVERIFIED in the scenario (one pointer-out: `/menu` unauth-visitor behaviour is owned by the menu docs, not this page). |
| C3 | Table QR landing | `/table/:tableId` | `/page-doc-set customer_table_qr` | ⚠️ | 2026-06-15 | **1 endpoint, public, no Redis, no DB write:** `POST /auth/guest` → `AuthService.GuestLogin` (`GetTableByQRToken` raw SQL **not sqlc** + `GenerateGuestToken` 2 h stateless guest JWT `sub=guest`/`role=customer`/`table_id`). Returns `table{id,name,capacity,status}` (FE reads only id+name). Full 6-file set built (be + page existed; loading/x-page/scenario/TABLE_QR_BUGS built this run); crosscomponent = N/A (single spinner, no widgets). **⚠️ 2 code bugs → [TABLE_QR_BUGS.md](customer/customer_table_qr/TABLE_QR_BUGS.md):** (1) 🟡 FE `TABLE_HAS_ACTIVE_ORDER` branch (`page.tsx:36-38`) is **dead** — **CORRECTED this run:** `ErrTableHasActiveOrder` (`errors.go:30`) is **never returned anywhere in `be/`** (the prior "guard still fires at `POST /orders`" note was wrong); `CreateOrder` allows concurrent orders per table (`order_service.go:256-275`, `tableBusy` informational, 201+`table_busy`), so **§2.3 one-active-order is unenforced** — all 3 FE consumers dead (table_qr/TableGrid/checkout); needs product call (enforce guard vs. update rule). (2) 🟡 axios has no `timeout` + no unmount abort → hung guest call hangs spinner forever. **Doc drift FIXED:** API_SPEC guest response `{id,name}`→`{id,name,capacity,status}`. **Doc drift ANNOTATED (flagged to owner — security/spec):** BUSINESS_RULES §5.2 claims a 5 req/min rate limit (**no rate-limit middleware exists**) + a `jti` claim (`GenerateGuestToken` sets none). Robustness: axios client has no `timeout` + no unmount abort → hung guest call hangs spinner forever (BUGS Bug 2). Session is **memory-only** (auth store no persist; cart `partialize` keeps only orderNote/activeOrderId) → F5 = re-scan. 0 ❓ UNVERIFIED in anchor (1 minor ❓ in scenario: menu auth-guard for an unauth visitor pressing "Vào menu"). Logged LOGIC Decision Log 2026-06-15. |
| C4 | Product Detail | `/menu/product/:id` | `/page-doc-set customer_product_detail` | ✅ | 2026-06-14 | **1 endpoint** (read-only): `GET /products/:id` (public, no auth) → `productH.GetProduct` → `GetProductByID` + `GetToppingsByProductID` + category-name map, Redis `product:<id>` 5 min. Add-to-cart is **client-only** (Zustand `useCartStore`), no BE write; cart `items[]` is session-memory only (not persisted — F5 wipes it). Full 5-file set built (be/crosspage/loading/scenario + existing page doc); crosscomponent = N/A (widgets coordinate via local React state + props, no shared store). **Doc drift fixed:** page-doc Zone table said `GET /products` → corrected to `GET /products/:id`. No code bugs (no FE/BE event/ownership mismatch). 0 ❓ UNVERIFIED. ⚠️ Low-sev cache flag (logged, not a BUGS file): topping edit Dels `products:list` but **not** `product:<id>`, so a topping price/availability change is stale here up to 5 min. |
| C5 | Combo Detail | `/menu/combo/:id` | `/page-doc-set customer_combo_detail` | ⚠️ | 2026-06-14 | **Read-only page, 2 public cached GETs, zero BE write.** `GET /combos` (ListCombos→ListCombosAvailable, `combos:list`) + `GET /products` (ListProducts→ListProductsAvailable, `products:list`), both `is_available=1`-filtered, 5-min TTL. **No `GET /combos/:id`** — page over-fetches both whole lists and resolves combo + item names/prices client-side. Add-to-cart is pure Zustand (`addItem`); the combo cart item is **session-only — NOT persisted** (`partialize` keeps only orderNote/activeOrderId) → lost on F5. Full 6-file set built (be/crosspage/loading/scenario + existing page doc); crosscomponent = N/A (no ≥3 widgets sharing a store). **⚠️ 2 code bugs** → [COMBO_BUGS.md](customer/customer_combo_detail/COMBO_BUGS.md): (1) unavailable-combo UI unreachable (BE filters it out → "Không tìm thấy combo"); (2) unavailable sub-product shows raw UUID as name. **Page-doc drift fixed:** `customer_combo_detail.md` Zone C wireframe showed per-item prices (e.g. "(35.000đ)") the code never renders (`page.tsx:141-148` = qty badge + name only) → corrected. Minor: cart persist key is `cart-config-v3` but Zustand `version:5` (frozen literal, harmless). No **handbook** drift — API_SPEC/DB_SCHEMA/REDIS_CACHE matched code. Logged in LOGIC Decision Log 2026-06-14. |
| C6 | Favourites | `/menu/favourites` | `/page-doc-set customer_favourites` | ✅ | 2026-06-14 | **Confirmed BE-read-only — saved sets do NOT hit BE.** Whole suite (list + `/save` + `/sets`) calls exactly 2 **public** GETs: `GET /products` + `GET /combos`, both cached 5 min (`products:list`/`combos:list`), shared with C1 menu. Zero writes; favourites + named sets live in `useFavouritesStore` (localStorage). Cart hand-off → menu/checkout `POST /orders` (not this page). Handbook matched code on every cell — no drift, no `_BUGS.md`. Full 6-file set built (be/x-comp/x-page/loading/scenario + existing page doc). Note: `toggleFav` always stores qty:1/no-toppings, so menu topping choices aren't carried into a favourite. |
| C7 | Settings | `/menu/settings` | `/page-doc-set customer_settings` | N/A | 2026-06-15 | **Verified N/A — zero BE endpoints.** `page.tsx` imports only `useSettingsStore` + `useRouter` + lucide icons; no `api-client`/TanStack/mutations (`menu/settings/page.tsx:1-9`). Store is pure Zustand + `persist`→localStorage `STORAGE_KEYS.CUSTOMER_SETTINGS`, no fetch (`store/settings.ts:12-22`). Save = `setCustomerName`/`setTableLabel` to localStorage then 2 s "Đã lưu!" flash (`page.tsx:14-19`). No `_be.md` written (nothing to trace); 6-file set: only the existing `customer_settings.md` applies (be/x-comp/x-page/loading/scenario all N/A — no endpoints, single widget, no async fetch). Owner confirmed tracker-only refresh 2026-06-15. **Minor page-doc wireframe drift (not fixed, cosmetic):** doc labels "Tên của bạn"/button "💾 Lưu" vs code "Tên hiển thị"/"Lưu cài đặt" (`page.tsx:39,74`); doc omits the two helper-text lines. No code bugs, 0 ❓ UNVERIFIED. |
| C8 | Checkout | `/checkout` | `/page-doc-set customer_checkout` | ⚠️ | 2026-06-15 | **2 endpoints, both `authMW`, no Redis read-cache:** `POST /orders` (`orderH.Create`→`CreateOrder`) + post-create `GET /orders/:id` (`orderH.Get`→`GetOrder`). The `source:'online'` twin of the menu QR `TableConfirmModal` path — sends `customer_name`/`customer_phone`/`note` + `source: tableId?'qr':'online'` + `buildOrderItemsPayload(cart.items)`. **No handbook drift** — API_SPEC + DB_SCHEMA matched code on every cell. Full 6-file set: be/crosspage/loading/scenario + refreshed page doc + CHECKOUT_BUGS.md; crosscomponent = **N/A** (widgets use local RHF state; only the cart store is read by summary+submit, not ≥3 widgets sharing a store). **⚠️ 3 code bugs** → [CHECKOUT_BUGS.md](customer/customer_checkout/CHECKOUT_BUGS.md): (1) 🟠 payment-method radio is **dead** — collected, written to cart store, wiped by `clearCart`, never sent (no `orders.payment_method` column; payment set at cashier S5); (2) 🟠 `TABLE_HAS_ACTIVE_ORDER` onError branch **dead** — BE returns 201+`table_busy` & creates a parallel order, checkout reads neither → silent duplicate, no notice; (3) 🟡 latent — `source:'online'` (table-null) order 403s on `GetOrder` for a guest token. 0 ❓ UNVERIFIED in the anchor. Logged LOGIC Decision Log 2026-06-15. |
| C9 | Order List | `/order` | `/page-doc-set customer_order_list` | ⚠️ | 2026-06-14 | **List page itself calls NO BE** — renders cards from localStorage `order_cache_*` (stale until a card's detail sheet refetches). BE surface (4 endpoints) reached only via the `OrderDetailSheet` overlay, all `authMW` + table-ownership: GET /orders/:id · SSE GET /orders/:id/events · DELETE /orders/:id · DELETE /orders/items/:id. No Redis read-cache (Redis = pub/sub fan-out only). ⚠️ open code drift (logged): `item_cancelled` SSE event unhandled FE-side; 404 wedges sheet spinner (`isNotFound` never read); SSE handler does no ownership check. All 4 endpoints + overlay shared with C10 `/order/:id`. 6-file set: skipped crosscomponent (no shared store across ≥3 widgets); built be/crosspage/loading/scenario. |
| C10 | Order Detail | `/order/:id` | `/page-doc-set customer_order_detail` | ⚠️ | 2026-06-16 | **Standalone `order/[id]/page.tsx` driven by `useOrderSSE` (not the C9 overlay).** Same 4 endpoints as C9 (`GET /orders/:id` · SSE `/orders/:id/events` · `DELETE /orders/:id` · `DELETE /orders/items/:id`, all `authMW`+table-ownership, no Redis read-cache) **PLUS a 5th unique to this page**: `PATCH /orders/items/:id/quantity` (QuantityStepper → `orderH.UpdateItemQuantity`→`UpdateOrderItemQuantity`, `authMW`-only/no role gate, rejects once `qty_served>0`). API_SPEC.md:78 already documents the 5th endpoint — **no handbook drift**. **⚠️ 2 code bugs** ([ORDER_DETAIL_BUGS.md](customer/customer_order_detail/ORDER_DETAIL_BUGS.md)): (1) 🟠 quantity edit never reflects live — BE emits `item_updated` but `useOrderSSE` has no case for it + the `invalidateQueries(['order',id])` is a no-op (order is in `useState`, no such `useQuery`); (2) 🟡 `item_cancelled` unhandled (shared root w/ C9). Same hook also drops `items_added` (3rd dead event); `order_init` case is handled-but-never-published (harmless). **Differs from C9:** this page DOES read `isNotFound` → full-page not-found, so C9's "spinner forever" flag does NOT apply. FE flag (not server bug): C10 gates Huỷ-đơn on `status∈{confirmed,preparing}` (no button while `pending`) vs C9 overlay's `progress<30 && isActive`. Doc drift fixed: page-doc Zone endpoint `…/items/:id`→`…/items/:id/quantity`. Full 6-file set built; crosscomponent = N/A (no shared store across ≥3 widgets). Logged LOGIC Decision Log 2026-06-16. |
| C11 | Tracking | `/tracking` | `/page-doc-set customer_tracking` | ⚠️ | 2026-06-14 | 2 BE surfaces traced: `GET /orders/:id` (authMW, table-ownership guard, no Redis cache) + `GET /sse/order-monitor/:id` (authMW, subscribes `order:<id>`+`queue:broadcast`+`tables:broadcast`, initial snapshot via `MonitorSnapshot`→`buildMonitorPayloads`, 15s heartbeat). Read-only page, zero writes. Full 5-file set built (be/crosscomp/loading/scenario + existing page doc); crosspage = N/A (consumer, no handoff). **⚠️ Open code bugs (not doc drift):** (1) SSE status badge dead — BE emits `order_status_changed`, hook listens `order.status`; (2) `item_progress` published, not consumed; (3) queue position/ETA computed FE-side (BE sends 0); (4) `tables.status` + `reconnect()` + `showBannerAfter` are dead outputs. Logged in LOGIC Decision Log 2026-06-14. |
| C12 | Profile | `/profile` | `/page-doc-set customer_profile` | ⚠️ | 2026-06-16 | **Both endpoints are UNIMPLEMENTED in BE.** Page calls `GET /customer/profile` + `PUT /customer/profile` (note **PUT**, not the guessed PATCH), but `main.go:148-311` has **no `/customer` group** and grep finds no profile handler/service/query in `be/` → both 404 (Gin default, plain-text, not JSON contract). FE-only groundwork for the 🔮 PLANNED online customer account. Effects: GET 404 → "new profile" empty create-form (graceful); PUT 404 → save **always fails** ("Không thể lưu — kiểm tra kết nối"), `onSuccess` never runs so nothing persists to BE *or* `settings.customerName`. ⚠️ 2 code bugs → [PROFILE_BUGS.md](customer/customer_profile/PROFILE_BUGS.md): (1) 🟠 endpoints missing (build-vs-disable decision needed); (2) 🟡 save error mislabelled as a network problem. **No handbook drift** — API_SPEC/DB_SCHEMA correctly omit the nonexistent route. **Page-doc drift FIXED:** nav title "Hồ sơ"→"Thông Tin Khách Hàng"; QuickNav tiles corrected (phantom `/menu/settings` link removed; real grid = Thực Đơn/Yêu Thích/Lịch Sử Ăn/Đặt Bàn, two →`/menu`); save-label states. Full set: be + loading + scenario + bugs + refreshed page doc; crosscomponent = N/A (widgets share an HTML `form id` + props, no store), crosspage = N/A (no functional outliving write today). ❓ UNVERIFIED: the `CustomerProfile` DTO fields are FE-only/aspirational — no BE type backs them (`_be.md` Flag 3, page-doc §1); + scenario §F flags it as unverified whether Gin's global metrics middleware records these unmatched-route 404s. Logged LOGIC Decision Log 2026-06-16. |
| C13 | Landing | `/` | `/page-doc-set public_landing` | ⚠️ | 2026-06-17 | **Static marketing page; all BE traffic from 2 demo widgets. 5 Go endpoints, all public-or-self-minting, no NEW handbook drift.** Body `app/page.tsx` is a static server component. **StaffQuickLogin** → `POST /auth/login` (public, **rate-limited 5/min/IP** `auth_service.go:70-73`, seeded pw `Admin@123`, FE role→redirect). **TableGrid→SimulateBtn** "Giả lập khách" → `POST /auth/guest` → `GET /products?is_available=true` + `GET /combos` (parallel, cached `products:list`/`combos:list` 5-min) → `POST /orders` (`source:'qr'`, `created_by=NULL`, 201+`table_busy`), via **raw axios not api-client**, **inline items[] bypassing `order-payload.ts`** (2nd caller after POS). DevPanel's `/api/dev/run` is a **Next.js** route, not Go BE. **⚠️ 3 code bugs → [LANDING_BUGS.md](public/public_landing/LANDING_BUGS.md):** (1) 🔴 `/api/dev/run` (`route.ts:13-33`) `exec`s host shell (seed/build-be/build-fe) with **no auth + no NODE_ENV guard**, reachable from public `/`; (2) 🟠 Hero "Thử Menu Khách" + Footer "Demo Khách" link `/table/1` (`page.tsx:135,305,326`) → `1`≠64-char → `/auth/guest` `len=64` 400 → dead-ends on C3 error screen (table *cards* work); (3) 🟡 SimulateBtn `TABLE_HAS_ACTIVE_ORDER` branch (`TableGrid.tsx:107-113`) dead — shared root w/ C3+C8 (`ErrTableHasActiveOrder` returned by no path). Non-bug flags: `GET /products` ignores `is_available` (no-op, same as C1); `/auth/guest` unthrottled vs `/auth/login` throttled. Full set built: be + x-page + loading + scenario + bugs + refreshed page doc (fixed `../02_spec`→`../../../` link depth, added SimulateBtn flow to Zones); crosscomponent = **N/A** (3 widgets each mutate a global store independently then navigate — no shared-store coordination). 0 ❓ UNVERIFIED in anchor (siblings note 1 minor: `/table/1` BE behaviour — now resolved as the 400 in Bug 2). Logged LOGIC Decision Log 2026-06-17. |
| C14 | Introduction | `/introduction` | `/page-doc-set customer_introduction` | ❌ | — | 🔮 PLANNED — not coded; BE doc would be speculative |
| C15 | Legal | `/privacy-policy` · `/terms` | `/page-doc-set public_legal` | N/A | — | Static legal pages — no BE calls |

---

## Staff Pages

| # | Page | Route | Command | Status | Last Run | Concerns / Notes |
|---|------|-------|---------|--------|----------|-----------------|
| S1 | Login | `/login` | `/page-doc-set staff_login` | ⚠️ | 2026-06-16 | **1 endpoint, public, no read-cache:** `POST /auth/login` (`main.go:154-155`, no `authMW`) → `authH.Login` → `AuthService.Login` (`auth_service.go:69-142`): rate-limit `ratelimit:login:<ip>` 5/min fail-open (`:346-365`) → `GetStaffByUsername` (soft-delete-filtered, `auth.sql.go:138-165`) → bcrypt → `is_active` (checked after bcrypt, no timing oracle) → access JWT (HS256, 24h) + refresh cookie (httpOnly, path `/api/v1/auth`, 30d) → max-5-sessions evict → cache `auth:staff:<id>="active"` 5min. Login **always hits MySQL** (no read-cache); only Redis *writes* are the rate-limit counter + is_active cache, both documented in REDIS_CACHE.md and **fail-open**. **⚠️ 2 code bugs (FE-side, low sev) → [LOGIN_BUGS.md](staff/staff_login/LOGIN_BUGS.md):** (1) 🟡 FE Zod `password.min(6)` (`login/page.tsx:16`) looser than BE binding `min=8` (`auth_handler.go:24`) → 6–7-char password passes the form then 400s into a generic error; (2) 🟡 FE error map checks dead `AUTH_001` and has no `RATE_LIMIT_EXCEEDED`/`INVALID_INPUT` branch → throttled/under-length users see only the catch-all message. Both fix-FE-only. **Doc drift FIXED:** `API_SPEC.md:29` login response `user{…}` was missing `email` (`auth_handler.go:57`) — added, plus `min 3`/`min 8` constraints. Full 6-file set built (be + crosspage + loading + scenario + bugs; existing `staff_login.md` already current); crosscomponent = **N/A** (single RHF form, no ≥3 widgets sharing a store). 0 ❓ UNVERIFIED in the anchor (1 minor ❓ in `_be.md` Flag 4: whether a global cookie `SameSite` default exists — comment says Strict, `c.SetCookie` sets none). Logged LOGIC Decision Log 2026-06-16. |
| S2 | Register | `/register` | `/page-doc-set staff_register` | ⚠️ | 2026-06-16 | **1 endpoint, public, no Redis, no realtime:** `POST /auth/register` → `AuthService.Register` (`auth_service.go:205`) → `CreateStaffForRegister` **raw SQL INSERT** (not sqlc, `auth_repo.go:86`). **⚠️ 1 code bug → [REGISTER_BUGS.md](staff/staff_register/REGISTER_BUGS.md):** 🔴 public self-registration mints an **active `cashier` staff account** (role hardcoded, `is_active=1`, `auth_service.go:219`/`auth_repo.go:87-88`) with no auth/approval — a privilege-grant hole + FE/BE intent mismatch (FE's `customer:'/menu'` redirect is dead; every register lands on `/pos`); owner must pick: delete route · customer-only · or manager-gate. **Doc drift FIXED:** `API_SPEC.md:30` register request `full_name`→`{username,password}` only, response `id`→`{access_token,user{id,username,full_name,role,email}}`+refresh cookie. Page-doc drift FIXED (`staff_register.md` refreshed): no "Họ tên" field, no "Đăng nhập" link, not a customer path. Full 6-file set built (be + crosspage + loading + scenario + bugs + refreshed page doc); crosscomponent = N/A (single form card, RHF-local, no shared store). Non-bug flags in `_be.md`: `full_name`=username; response omits `phone` (vs Login); **no rate-limit middleware** on any `/auth` route (same gap as C3 guest). 0 ❓ UNVERIFIED in anchor (1 minor ❓ in crosspage: F5 silent re-auth-on-boot is owned by login/app-shell, not this page). Logged LOGIC Decision Log 2026-06-16. |
| S3 | KDS (Kitchen) | `/kds` | `/page-doc-set staff_kds` | ⚠️ | 2026-06-17 | Full 6-file set + KDS_BUGS.md built (be anchor + page refreshed + crosspage + loading + scenario + bugs; **crosscomponent N/A** — single page component owns board state in `useState` + the cross-page WS context, no shared store). 3 REST + 1 WS traced: `GET /orders` (**authMW + `AtLeast("chef")`** `main.go:233`; raw `ListActiveOrders` returns pending/confirmed/preparing/ready/delivered, **N+1** items+table per order, **no Redis read**); `GET /orders/:id` (**authMW**, customer-only ownership guard `order_service.go:116-120`; refetched on every `new_order` WS event); `PATCH /orders/:id/status` (**chef+**, `validTransitions` `order_service.go:524-530` → `→ready` only from `preparing` else **409**; publishes `order_status_changed` to `order:<id>`+`orders:kds` `:818`); WS `/ws/orders-live` (**no authMW/role gate**, `?token=` claims discarded `handler.go:31-40`, subscribes `orders:kds`). **No handbook drift** — API_SPEC (`PATCH /orders/items/:id`→`qty_served`; `/ws/*` JWT), BUSINESS_RULES §2.2/§2.4, REDIS_CACHE all matched code. **⚠️ 2 FE code bugs → [KDS_BUGS.md](staff/staff_kds/KDS_BUGS.md):** (1) 🔴 tap-to-serve PATCHes `/orders/:orderId/items/:itemId/status` (`kds/page.tsx:160-161`) — **no such route → 404**; real route is `PATCH /orders/items/:id` `{qty_served}` (`main.go:250`), FE body also `{}` → item progress **unservable from the KDS**, auto-ready never fires from kitchen action; (2) 🟠 card header shows `Bàn ${order.table_id}` (UUID `:214`) not the returned `table_name`. **Doc note (FIXED):** REALTIME_SSE.md WS table labelled `/ws/kds` as the KDS subscriber — corrected: KDS uses the shared `/ws/orders-live`; `/ws/kds` is identical-but-unused dead code. Flags (not bugs, in `_be.md`): `→ready` 409 from confirmed/pending (no "start cooking" control on KDS); 3 `orders:kds` events ignored (items_added/item_cancelled/item_updated); `order_status_changed` handler only **filters** non-active cards → a **staying** card's badge never live-updates; **no `setInterval`** → urgency borders/elapsed-min don't tick without a WS event; **loading-vs-empty indistinguishable** (query `isLoading` unread, page.tsx:102); WS disconnect has **no banner** (`connected` unread); `order_items.filling` dropped by migration 017 (root CLAUDE.md still lists it live). **Resolves the 2 S4 carry-over ❓:** KDS **does** use the shared `OrdersWSProvider`→`/ws/orders-live` (`(dashboard)/layout.tsx:1-4`), and on F5 the board starts empty then re-runs `GET /orders` (TanStack `staleTime` 30s). 0 ❓ UNVERIFIED in the anchor (2 minor ❓ in the scenario, both confirmed-from-code as flags above: staying-card badge + no-timer borders). Logged LOGIC Decision Log 2026-06-17. |
| S4 | POS | `/pos` | `/page-doc-set staff_pos` | ⚠️ | 2026-06-17 | Full 6-file set + POS_BUGS.md built (be anchor + crosspage + loading + scenario; page doc already current; crosscomponent **N/A** — POS keeps cart/selectedCategory/activeOrder in local `useState` in one `POSContent`, no shared store). 4 REST + 1 WS traced: `GET /categories` + `GET /products` (**public**, `categories:list`/`products:list` 5-min, `main.go:168,186`); `POST /orders` (**authMW, no role gate** `main.go:232` — cashier JWT → `created_by`=staff UUID, `table_id` NULL so table-busy skipped, `status='pending'`, **no POS branch beyond `source='pos'` enum**, server-trusted prices); `GET /orders/:id` (**authMW**, customer-only ownership guard so cashier reads any order `order_service.go:116-120`); WS `/ws/orders-live` (**no authMW/role gate** `?token=` parsed in handler, subscribes `orders:kds` `websocket/handler.go:23,31-47`). **No handbook drift** — API_SPEC/REDIS_CACHE/DB_SCHEMA/BUSINESS_RULES matched code; §2.3 table_busy already annotated + N/A here (no table_id). **WS field shape MATCHES** (BE `{type,order_id,status}` `order_service.go:788-795` = FE `WsMsg` `OrdersWSContext.tsx:5-11`) → auto-redirect wired correctly, NOT the `/tracking` `order.status` mismatch. **⚠️ 2 code bugs → [POS_BUGS.md](staff/staff_pos/POS_BUGS.md):** (1) 🟠 thin `POST /orders` response `{id,table_busy}` (`order_handler.go:121`, no `orderJSON`) consumed as full `Order` with **no follow-up GET** → waiting card + toast show **"Đơn #undefined"** every order (`pos/page.tsx:101,111`); redirect OK via `id`; (2) 🟡 "Tạo đơn mới" clears local order, no `DELETE /orders/:id` (`pos/page.tsx:124`) → mistaken order only cancellable from `/admin/overview` (maybe intended). Flags (not bugs): POS **bypasses `lib/order-payload.ts`** (products-only, no toppings/combos); `customer_phone='0000000000'` stored verbatim; WS no role gate; `order:<id>` not replayed on reconnect. **Cross-page:** `category_id` ignored by `GET /products` → POS tabs are a no-op (2nd page after C1 — see Cross-Page Concerns). ❓ UNVERIFIED: 0 in the anchor (scenario's order_number ❓ resolved → Bug 1); **crosspage doc re-traced 2026-06-17 → now 0** — the 2 prior ❓ (downstream KDS/S3: `/kds` subscribes the shared `OrdersWSProvider`, seeds from `GET /orders` filtered to `ACTIVE_STATUSES` on mount, `kds/page.tsx:93,102-110`) were resolved this run; loading doc also refreshed (added the `AuthGuard`/`RoleGuard` blank-screen outer layer). ⚠️ Companion scenario `SCENARIO_POS_WALKIN.md` (rush/concurrency angle) was generated alongside the primary `SCENARIO_POS_ORDER.md` — duplicate of the page-scenario slot; `rm` was blocked this session, so owner should remove it (or keep as a 2nd scenario). Logged LOGIC Decision Log 2026-06-16. |
| S5 | Cashier Payment | `/cashier/payment/:id` | `/page-doc-set staff_cashier_payment` | ⚠️ | 2026-06-18 | **2 REST it calls + 1 absent route + 1 WS. Payment is broken from this screen for every method (3 code bugs).** `GET /orders/:id` (**authMW, no role gate**, customer-only ownership guard → cashier reads any order; no Redis), `POST /payments` (**authMW + `AtLeast("cashier")`** `main.go:255`; `CreatePayment` `payment_service.go:63` — gate `ready`OR`delivered` else 409 `ORDER_NOT_READY`, idempotency else 409 `PAYMENT_ALREADY_EXISTS`, amount server-snapshotted; cash→complete instantly, gateways→pay/QR URL; publishes `payment_success` to `orders:kds` `:270-271`), WS `/ws/orders-live` (**no role gate**, subscribes `orders:kds`). **⚠️ 3 code bugs → [PAYMENT_BUGS.md](staff/staff_cashier_payment/PAYMENT_BUGS.md):** (1) 🔴 cash button sends `method:'cod'` but BE binding is `oneof=...cash` (`payment_handler.go:25`) → cash 400s; (2) 🔴 `POST /payments` response is thin `{id,pay_url,qr_code_url}` (`payment_handler.go:44-48`, no `status`/`amount`/`method`) consumed as full `Payment` → `payment.status` undefined kills the WS guard (`page.tsx:64`) + QR render (`:249`) → screen blank after create, `payment_success` never received, no auto-print; (3) 🟠 `PATCH /payments/:id/proof` matches no route → 404. **Doc drift FIXED:** API_SPEC.md:115 payment gate `ready`→`ready` OR `delivered`; annotated that the documented full create response is intended-contract while code returns the thin shape (Bug 2). API_SPEC method enum / ERROR_SPEC 409s / REDIS_CACHE `orders:kds` publisher all matched code. **Flags (`_be.md` 1–8):** `payment_success` on shared `orders:kds` (KDS/POS/admin ignore it — Cross-Page); WS no role gate (shared); paying a `ready` (not `delivered`) order leaves status `ready` (MarkOrderPaid only `delivered→paid`, error swallowed — status drift); gateway URL silently empty if creds unset; unused `GET /payments/:id` is the Bug-2 fix path. Full 6-file set built (be + refreshed page + crosspage + loading + scenario + bugs); crosscomponent = **N/A** (one `PaymentContent`, local `useState`, no shared store). 0 ❓ UNVERIFIED in anchor (siblings: a few minor ❓ on `/pos` re-mount query-invalidation + WS reconnect cap). Logged LOGIC Decision Log 2026-06-18. |

---

## Admin Pages

| # | Page | Route | Command | Status | Last Run | Concerns / Notes |
|---|------|-------|---------|--------|----------|-----------------|
| A1 | Overview | `/admin/overview` | `/page-doc-set admin_overview` | ⚠️ | 2026-06-14 | Full 6-file set generated. 8 endpoints traced to code (6 REST + SSE `/sse/admin` + WS `/ws/orders-live`). **No Redis read cache** — every REST read hits MySQL; Redis is pub/sub only (`orders:admin`, `orders:kds`, `order:<id>`, `queue:`/`tables:`). Auth: reads `AtLeast("cashier")`, `GET /orders/:id` authMW-only, status PATCH `AtLeast("chef")`, payments `AtLeast("cashier")`, SSE `AtLeast("manager")`. Key flags: (1) feed is `GET /orders/live` not `GET /orders` (FE doc Zone B corrected); (2) **`delivered → cancelled` Huỷ button always 409s** (not a valid transition); (3) `POST /payments` ignores FE `amount` (uses order total); (4) WS `order_updated`/`order_completed` cases dead (BE never emits); (5) **WS `/ws/orders-live` has no role gate** — any JWT (incl. customer) can subscribe; (6) `orders/history` returns `items:[]`. 2 ❓ UNVERIFIED (FE-side, in x-comp doc): whether PATCH returns order body; whether StatCards counts drop on a pure status advance. |
| A2 | Summary | `/admin/summary` | `/page-doc-set admin_summary` | ✅ | 2026-06-15 | Full set built (be/crosspage/loading/scenario + refreshed page doc; crosscomponent = N/A — 4 sections share no store, only local `range` prop). 5 endpoints traced to code, all `authMW` + `AtLeast("manager")`: 3 analytics reads (summary/top-dishes/staff-performance) + low-stock read + `POST /stock-movements` write. **No Redis** — analytics is hand-written SQL on the REDIS_CACHE do-not-cache list; client cache = TanStack Query (`staleTime` 60s/120s). No `❓ UNVERIFIED`, no code bugs. Doc drift FIXED: API_SPEC top-dishes `[{name,count,revenue}]`→`[{name,qty,pct,revenue}]` + summary response fields. 7 flags (all handled/cosmetic, none a code bug — detail in [admin_summary_be.md](admin/admin_summary/admin_summary_be.md) Flags): (1) chef rows omit `revenue` → FE shows `—`; (2) `top-dishes.pct` = share of returned top-N, not whole period; (3) `summary.active_tables` is range-agnostic/live (ignores `?range`); (4) low-stock returns items ≤`min_stock*1.2` → FE splits red/yellow client-side; (5) restock write non-transactional (insert movement + stock bump unwrapped; `adjustment` adds not sets — shared w/ A10); (6) `dishes_sold` counts `delivered`+`paid` but the KPI sub-label says only "(delivered)" — cosmetic FE wording; (7) `top-dishes` `limit`>50 resets to 5 (page always sends 5 — moot). Also this run: fixed stale KPI-card wireframe in page doc; flagged "Xem toàn bộ kho" uses `<a href>` not `next/link` (full reload). |
| A3 | Products | `/admin/products` | `/page-doc-set admin_products` | ⚠️ | 2026-06-15 | Full 6-file set + PRODUCTS_BUGS.md generated. 11 endpoints traced (reads: `GET /products/all` manager+ **uncached** + public `GET /categories`/`GET /toppings`; writes: `POST/PATCH /products` manager+, `DELETE` admin-only, `POST /files/upload` cashier+; seed-only: `POST /categories`/`/toppings`/`/staff`). Handbook (API_SPEC, REDIS_CACHE) matched code — no doc drift. **3 code bugs (not stale docs):** (1) 🔴 availability toggle is a no-op — `PATCH /products/:id/availability` reuses `UpdateProduct` (requires name/price/category_id → 400) and never writes `is_available`; the dedicated `ToggleProductAvailability` query exists but is unwired; (2) 🟡 `POST /products` drops `is_available` (SQL hardcodes 1); (3) 🟠 `DELETE` has no active-order 409 guard (dead FE branch). **3 operational flags (not bugs):** (4) the admin table's `GET /products/all` is **uncached** and resolves toppings **N+1** (one query/product) — heavier than the public `GET /products`, but correct (managers want live data); (5) the form modal's `GET /categories` + `GET /toppings` are **public** (no `authMW`) — same shared catalog endpoints the customer menu uses; (6) `POST /files/upload` writes the DB row regardless but only persists the image to disk when env `STORAGE_BASE_PATH` is set — otherwise `image_path` points at a missing file. Auth split: writes manager+ **except `DELETE` admin-only**, upload cashier+. Cache writes Del `products:list`/`categories:list`/`toppings:list`/`product:<id>` (consumed by C1 menu, C4/C5 detail, S4 POS — see Cross-Page Concerns). 1 ❓ UNVERIFIED (scenario): whether a job purges `is_orphan=1` file rows. Logged in LOGIC Decision Log 2026-06-15. |
| A4 | Combos | `/admin/combos` | `/page-doc-set admin_combos` | ⚠️ | 2026-06-18 | **5 endpoints (2 reads / 3 writes), products domain.** `GET /combos` (**public**, `main.go:216`; cache-aside `combos:list` 5-min populated from **`ListCombosAvailable`** available-only `products.sql:112` — shared key with C1 menu / C5 combo-detail) + `GET /products/all` (**manager+**, uncached + N+1 toppings, for the product-name map). Writes: `POST /combos` + `PATCH /combos/:id` **manager+** (`main.go:218-222`, PATCH binds `items required,min=2`); `DELETE /combos/:id` **admin-only** (`main.go:223-227`) — FE 🗑 **correctly gated to `role==='admin'`** (`combos/page.tsx:326`), so combos does **not** have the A5/A12 manager-delete-403 bug. All writes → `invalidateComboCaches` Dels **only** `combos:list`. **No handbook drift** — API_SPEC §combos / DB_SCHEMA / REDIS_CACHE matched code. **⚠️ 4 code bugs → [COMBOS_BUGS.md](admin/admin_combos/COMBOS_BUGS.md):** (1) 🟠 admin list calls `ListCombosAvailable` (`product_service.go:505`) → any `is_available=0` combo unmanageable; unfiltered `ListCombos` query (`products.sql:107`) **dead**, no `/combos/all` (latent — nothing sets a combo unavailable); (2) 🟠 `PATCH /combos/:id` **nulls `image_path`+`category_id` every edit** — handler omits both (`product_handler.go:400-406`), service passes empty→NULL (`product_service.go:603-610`), `in.CategoryID` a dead param (latent — FE form sends neither); (3) 🟡 combo item inserts non-transactional + swallow FK errors (`slog.Warn` `:562-564,617-619`) → partial/empty combo still 2xx; (4) 🟡 `POST /combos` looser than PATCH (`price min=0`, no item-count min `:359-365`) → API accepts free/itemless combo. Non-bug flags in `_be.md`: combos always `is_available=1` (CreateCombo hardcodes 1, **no toggle anywhere** — wireframe "Còn ●" column was drift); `DELETE` no in-use guard; `category_id` returned but unrendered; "🎲 Random combo" uses `Promise.allSettled` (`page.tsx:207`) so a failed POST is **silent** — toast still says "Đã tạo 3 combo". **FE page-doc drift FIXED** (`admin_combos.md` refreshed): removed phantom availability column + toggle claim, corrected to text "Sửa"/"Xóa" (delete admin-only), added "🎲 Random combo" button (3 parallel POSTs) + real checkbox-picker modal. Full 6-file set built (be + page + crosspage + loading + scenario + bugs); crosscomponent = **N/A** (header/table/modal via local `useState`, no shared store). 0 ❓ UNVERIFIED in the anchor (2 minor ❓ in `admin_combos.md` siblings: BE server-side ≥2-item enforcement on POST — confirmed *absent* = Bug 4; whether `uniqueProducts` de-dup-by-name `page.tsx:190-193` is intentional). Logged LOGIC Decision Log 2026-06-18. |
| A5 | Categories | `/admin/categories` | `/page-doc-set admin_categories` | ⚠️ | 2026-06-18 | **4 endpoints, products domain.** `GET /categories` (**public**, no authMW, `main.go:186`) cache-aside `categories:list` 5-min → sqlc `ListCategories` (`is_active=1 AND deleted_at IS NULL ORDER BY sort_order ASC,name ASC`). `POST`+`PATCH` **manager+** (`main.go:188-191`): dup-name raw-SQL guard → `409 DUPLICATE_NAME`, PATCH 404s if missing, both **full-replace** name/description/sort_order. `DELETE` **admin-only** (`main.go:193-196`): `CountProductsByCategory>0` (raw SQL, **products only, not combos**) → `409 CATEGORY_HAS_PRODUCTS` else soft-delete, **204 no body**. All writes → `invalidateProductCaches(ctx,"")` Dels `products:list`+`categories:list`. **⚠️ 1 FE code bug → [CATEGORIES_BUGS.md](admin/admin_categories/CATEGORIES_BUGS.md):** 🟠 "Xóa" button renders for managers (`page.tsx:131-136`, no role check) but DELETE is admin-only → 403 shown as generic toast (no 403 branch in `onError`); **same root as A12 Training Bug 2 / A3 Products** (see Cross-Page Concerns). **Doc drift FIXED:** API_SPEC.md:49-52 (GET response `[{id,name,sort_order}]`→`+description,is_active`; PATCH req `name,description`→`name,sort_order` full-replace; DELETE resp `message`→`204`); REDIS_CACHE.md:41,44 (`categories:list` invalidation +"category write"). Page-doc drift FIXED: stale "Số món" column + icon buttons removed (real = Tên/Thứ tự/action, text "Sửa"/"Xóa"). Non-bug flags: GET description/is_active unused FE-side; `is_active` write-once 1; handler comment says "PUT" (route is PATCH); delete guard combo-blind. Full 6-file set built (be + page + crosspage + loading + scenario + bugs); crosscomponent = **N/A** (single page component, local `useState`+RHF, no shared store). 0 ❓ UNVERIFIED in the anchor (4 minor ❓ in scenario/loading siblings: metrics-record-403/409, /admin/products independent refetch, customer /menu staleTime, Redis Del-failure metric). Logged LOGIC Decision Log 2026-06-18. |
| A6 | Toppings | `/admin/toppings` | `/page-doc-set admin_toppings` | ✅ | 2026-06-18 | **5 endpoints (topping CRUD lives in the products domain), handbook 100% accurate, no code bugs.** `GET /toppings` (**public**, cache-aside `toppings:list` 5-min; `ListToppings` is deleted-excluded but **NOT** availability-filtered → admin table shows "Hết" rows); `GET /products/all` (**manager+**, uncached + N+1, builds the "Áp dụng cho SP" column — shared with A3); `POST /toppings` (**manager+**, INSERT hardcodes `is_available=1`); `PATCH /toppings/:id` (**manager+**, name/price UPDATE **+ separate raw-SQL `UpdateToppingAvailability`** `product_repo.go:157` if `is_available` sent); `DELETE /toppings/:id` (**admin-only**, soft delete, **no in-use guard**). All writes → `invalidateToppingCaches` Dels `toppings:list`+`products:list` (`product_service.go:719-721`). **No handbook drift** (API_SPEC:53-56, DB_SCHEMA:103, REDIS_CACHE:38-39 all matched). **No `_BUGS.md`.** **Page-doc drift FIXED:** "in-use toppings rejected server-side" was false (BE soft-deletes unconditionally; FE only `confirm()`-warns); added the missing "Trạng thái" column + modal Có sẵn/Hết toggle to the wireframe/Zones. **Flags (in `_be.md`):** (1) `UpdateToppingAvailability` raw SQL bypasses sqlc; (2) topping write Dels list keys but **not** `product:<id>` → C4 product-detail stale ≤5 min (existing Cross-Page Concern); (3) DELETE no in-use guard, junction rows persist post-soft-delete (harmless — reads filter `deleted_at IS NULL`); (4) FE expects a 409 dup-name the BE never sends (no unique constraint on `toppings.name`) → dead FE branch. Full 6-file set built (be + refreshed page + crosspage + loading + scenario); crosscomponent = **N/A** (header/table/modal coordinate via local `useState` + props + one TanStack key, no shared store). **1 ❓ UNVERIFIED** (scenario §F: no server-side audit log of topping CRUD — grep `be/internal/**/*.go` found none). Logged LOGIC Decision Log 2026-06-18. |
| A7 | Staff | `/admin/staff` | `/page-doc-set admin_staff` | ✅ | 2026-06-18 | **6 endpoints, all `authMW`+`AtLeast("manager")` on the `/staff` group (`main.go:281`); `DELETE` nested `AtLeast("admin")` (`main.go:289`). Plain CRUD over `staff` via a hand-written repo (raw SQL, not sqlc). No Redis read-cache — only Redis write is `Del(auth:staff:<id>)` on status-change + delete to invalidate the auth is_active cache.** `GET /staff` (page sends only `?limit=100`, filters+paginates client-side → BE `role`/`search`/`is_active` params unused here), `GET /staff/:id` (drawer), `POST /staff` (hierarchy `targetLevel<callerLevel` + username-unique + bcrypt), `PATCH /staff/:id` (raw-map partial update, role-change hierarchy), `PATCH /staff/:id/status` (self-deactivation block + hierarchy + cache Del), `DELETE /staff/:id` (admin-only, self-delete block, **last-admin `CountAdmins≤1`→409**, soft-delete + cache Del). **No handbook drift** — API_SPEC.md:130-139, DB_SCHEMA.md:53-67 (no `performance_score` column → confirms hardcoded-0 stub), REDIS_CACHE.md:42,48,71,77 all matched code. **No code bugs → no `_BUGS.md`** (FE/BE agree on every route/shape/guard; mismatches are only dead defensive code + the stub). **Page-doc drift FIXED:** Zone D `GET /admin/staff`→`GET /staff?limit=100`; `PUT/PATCH`→`PATCH /staff/:id`; broken `../02_spec`/`../07_business_logic` link depth→`../../../…` (same class as C13); added sibling links. **8 non-bug flags in `_be.md`:** dead self-service guard · list filters unused here · 100-row client cap · no admin creatable/promotable (hierarchy + form omits admin) · self-status toggle fully blocked · soft-delete doesn't purge refresh_tokens (lockout still fast via middleware re-check) · DB create error→500 not 4xx · `performance_score` hardcoded-0 stub (table shows 0% all; drawer degrades gracefully). Full set built (be + crosspage + loading + scenario + refreshed page doc); crosscomponent = **N/A** (page-level `useState` + props + one shared TanStack key — prop-drilling, no Zustand store). 0 ❓ UNVERIFIED. Logged LOGIC Decision Log 2026-06-18. |
| A8 | Staff Task Board | `/admin/staff/task-board` | `/page-doc-set admin_task_board` | ⚠️ | 2026-06-15 | Full 6-file set + BUGS generated. 4 endpoints traced (`GET /admin/tasks/stats`, `GET /admin/tasks`, `POST /admin/tasks`, `GET /staff`) — all `authMW` + `AtLeast("manager")`, **no Redis** (every read hits MySQL). Handbook matched code on every cell (no API_SPEC/DB_SCHEMA fix). **⚠️ 4 code bugs ([TASK_BOARD_BUGS.md](admin/admin_task_board/TASK_BOARD_BUGS.md)):** (1) 🔴 task `status` write-once `pending` — no UPDATE query or overdue job exists, so completed/in-progress/overdue KPIs + completionRate + qualityScore + hasOverdue are permanently 0/false; (2) 🟠 `qualityScore = completionRate/20` fabricated (no quality column); (3) 🟡 invalid `assigned_to` → 500 via FK→ErrInternalError; (4) 🟡 FilterBar status options (pending/in_progress/completed) are no-ops, only `overdue` wired (always false). No ❓ UNVERIFIED in the anchor. Bug 1+3 shared with A9 todo-list (same `staff_tasks`, same missing-update root). 2 minor non-bug flags also in `_be.md`: (5) `description` is stored + round-tripped in the DTO but no page renders it (only `notes` shown); (6) the required `dueTime` is folded into `due_at` only — the expanded "Giờ" column reads the **optional** `dueTimeStart`–`dueTimeEnd`, so it can show "—" despite a time being mandatory at create. Cross-cutting gap: **no staff-facing route lets an assignee view their own tasks** (only `useTodoTasks.ts` reads `staff_tasks`, admin-side). Logged LOGIC Decision Log 2026-06-15. |
| A9 | Todo List | `/admin/todo-list` | `/page-doc-set admin_todo_list` | ⚠️ | 2026-06-15 | Full 6-file set + TODO_BUGS.md. 4 endpoints traced to code (`GET /staff` · `GET /admin/tasks/stats` · `GET /admin/tasks` · `POST /admin/tasks`), all `authMW` + `AtLeast("manager")`. **No Redis** (tasks + staff list on the do-not-cache list) and **no realtime** — pull-only via TanStack Query. Handbook BE facts (API_SPEC/DB_SCHEMA/BE_CODE_SUMMARY/REDIS_CACHE) all matched code — no domain-file edit. **Page is create-only**: ⚠️ 4 code bugs (not doc drift) — (1) 🔴 "edit" re-POSTs → duplicate task, no PATCH/DELETE route exists; (2) 🟠 status filter never sent to BE; (3) 🟠 `Đến ngày` range input dead (single-day only); (4) 🟡 bad staffId on create → 500 not 4xx. Stale wireframe (status tabs incl. "Đang làm" + 🗑 delete) refreshed to match code. Created tasks shared with `/admin/staff/task-board` (same endpoints). No ❓ UNVERIFIED in the anchor. Logged LOGIC Decision Log 2026-06-15. |
| A10 | Ingredients | `/admin/ingredients` | `/page-doc-set admin_ingredients` | ✅ | 2026-06-13 | 8 endpoints traced to code (handler/service/repo). RBAC: manager+ all except DELETE (admin only). No Redis caching. Key flags: no initial 'in' movement on create; stock update not transactional; cost_per_unit stored but not serialized; GET /:id and GET /:id/movements not called by current FE. 🔮 STOR forecast subsection added (migration 018 `avg_daily_usage`, totalImported subquery, daysRemaining/runoutDate derivation). |
| A11 | Marketing | `/admin/marketing` | `/page-doc-set admin_marketing` | ✅ | 2026-06-16 | **1 endpoint, read-only, handler-only static stub.** `GET /admin/marketing/spend?from=&to=` (`authMW`+`AtLeast("manager")`, `main.go:306`) → `marketingH.GetSpend` (`marketing_handler.go:19-80`) returns a **hardcoded `gin.H` literal** (budget 50M/spent 18.5M/spent_pct 37/roi 3.2 + 5 categories + love_score) — **no service, no repo, no SQL, no Redis**. **No handbook drift** — API_SPEC.md:184 + BE_CODE_SUMMARY.md:59,173 already mark it static. No `_BUGS.md` (intentional pre-launch stub, no FE↔BE disagreement). **Flags (intentional, not bugs):** (1) `from`/`to` accepted but **ignored** — only echoed into `date_range`; date picker refetches identical numbers (decorative filter); (2) whole endpoint hardcoded mock — no `marketing` table; (3) "Xuất báo cáo"/"+ Nhập chi tiêu" buttons = placeholder toasts, no endpoint; (4) no realtime (pull-only, TanStack 5-min staleTime). Set built: `_be.md`+`_loading.md`+`SCENARIO_MARKETING.md`; **N/A** `_crosscomponent` (props from one page-level query, no shared store) + `_crosspage` (read-only, no handoff). Surgical fix to page-doc date-filter interaction bullet. 1 ❓ UNVERIFIED (loading sibling Flag 5: whether the blank donut-during-load is intentional per design). Logged LOGIC Decision Log 2026-06-16. |
| A12 | Training | `/admin/training` | `/page-doc-set admin_training` | ⚠️ | 2026-06-16 | **7 endpoints, all `authMW`+`AtLeast("manager")` except `DELETE`=`AtLeast("admin")` (`main.go:294-323`). No Redis anywhere** — every read hits MySQL, client cache = TanStack Query only (5min guides / 2min progress). **No handbook drift** — API_SPEC.md:177-183 already lists all 7 with correct auth. Full 6-file set + BUGS on disk; this run re-verified routes + Bug 1 against code and synced roll-ups. **⚠️ 2 code bugs → [TRAINING_BUGS.md](admin/admin_training/TRAINING_BUGS.md):** (1) 🔴 **progress half is dead** — `UpsertStaffProgress`/`InsertQuizAttempt` exist (`training.sql`+`training_repo.go:25,30`) but have **zero callers** in `be/` (verified grep → repo/db only), so `training_progress`/`quiz_attempts` are never written → endpoint 5 always `{data:[]}`, endpoint 6 always 404, endpoint 7 (manager notes) 404s silently; Zone D + Modal 2 permanently inert. (2) 🟠 🗑 delete button renders for managers (`JobGuideCard.tsx:69-71`, no role check/`onError`) but `DELETE` is admin-only → silent 403. Non-bug flags (in `_be.md`): `ListGuides` returns drafts (no `published` gate), N+1 reads, dead `trainingStore.ts`, `PATCH` guide is a full replace. 0 ❓ UNVERIFIED. Logged LOGIC Decision Log 2026-06-16. |
| A13 | Storage | `/admin/storage` | `/page-doc-set admin_storage` | ❌ | — | 🔮 PLANNED — not coded; BE doc would be speculative |

---

## Copy-Paste — All Commands

> Run in dependency order or pick any. Skip ❌ (not coded) and N/A (no BE calls).

```
/page-doc-set customer_welcome
/page-doc-set customer_table_qr
/page-doc-set customer_product_detail
/page-doc-set customer_combo_detail
/page-doc-set customer_favourites
/page-doc-set customer_checkout
/page-doc-set customer_order_list
/page-doc-set customer_order_detail
/page-doc-set customer_tracking
/page-doc-set customer_profile
/page-doc-set public_landing
/page-doc-set staff_login
/page-doc-set staff_register
/page-doc-set staff_kds
/page-doc-set staff_pos
/page-doc-set staff_cashier_payment
/page-doc-set admin_overview
/page-doc-set admin_summary
/page-doc-set admin_products
/page-doc-set admin_combos
/page-doc-set admin_categories
/page-doc-set admin_toppings
/page-doc-set admin_staff
/page-doc-set admin_task_board
/page-doc-set admin_todo_list
/page-doc-set admin_ingredients
/page-doc-set admin_marketing
/page-doc-set admin_training
```

---

## Cross-Page Concerns

> BE facts that affect multiple pages — shared endpoints, cache keys, auth gates, drift found.
> Add a bullet when a run uncovers something that touches more than one page's BE doc.

- **SSE order-monitor event-type mismatch (`order.status` vs `order_status_changed`).** The
  `order:<id>` channel carries `order_status_changed` (`order_service.go:552,745`), but the FE
  `useOrderMonitorSSE` hook listens for `order.status` (`useOrderMonitorSSE.ts:67`) — so the live
  status badge never updates from SSE on **any** page using this hook (`/tracking` today; reused by
  the admin floor monitor route). `customer_menu_crosspage_dataflow.md:271,284` also lists
  `order.status` as a real wire event — it documents the broken FE expectation. Fix is code-side
  (align FE listener or BE publisher); flagged to owner, logged in LOGIC Decision Log 2026-06-14.
- **`OrderDetailSheet` + `useOrderSSE` = one shared BE surface for C9 `/order` and C10 `/order/:id`.**
  Both pages reach the identical 4 endpoints (GET /orders/:id · SSE /orders/:id/events ·
  DELETE /orders/:id · DELETE /orders/items/:id) through the same overlay + hook. The C9 trace
  (2026-06-14, [customer_order_list_be.md](customer/customer_order_list/customer_order_list_be.md))
  already covers C10's endpoint detail — when C10 runs, reuse it and zoom on the standalone-page
  differences (URL id vs tapped id, full-page vs overlay loading). **C10 run 2026-06-16 confirmed
  this and added three facts:** (a) the standalone page is **not** the `OrderDetailSheet` overlay — it
  is its own `order/[id]/page.tsx` driven directly by `useOrderSSE`, and it calls a **5th endpoint the
  overlay does not**: `PATCH /orders/items/:id/quantity` (the QuantityStepper; `authMW`-only/no role
  gate, `main.go:249`). (b) C10 **handles the 404** (`isNotFound` → full-page not-found,
  `order/[id]/page.tsx:41,155-173`), so the C9 "spinner forever" flag is **C9-only**. (c) the
  `item_cancelled` gap below extends to **`item_updated`** (the 5th endpoint's event) and
  **`items_added`** — three order-mutating events `useOrderSSE` never consumes, so any write that lands
  while a phone is open on either page is invisible until reload; plus C10's qty-mutation
  `invalidateQueries(['order',id])` is a **no-op** (order is in `useState`, no matching `useQuery`).
  See [ORDER_DETAIL_BUGS.md](customer/customer_order_detail/ORDER_DETAIL_BUGS.md). One `useOrderSSE`
  fix (re-fetch on any unhandled order-mutating event) closes the gap on **both** C9 and C10.
- **`item_cancelled` SSE event is published BE-side but unhandled by `useOrderSSE`**
  (`order_service.go:642` vs `useOrderSSE.ts:83-123`) — affects every page that renders live order
  detail via this hook (C9, C10). Logged in LOGIC Decision Log 2026-06-14.
- **Neither SSE handler replays the order's current status on (re)connect — only future deltas.**
  Redis pub/sub has no retention, and both order-SSE endpoints lean on the client having separately
  fetched `GET /orders/:id`. `StreamOrder` (`/orders/:id/events`, used by C9/C10 via `useOrderSSE`)
  emits only `event: connected` then loops on the channel — no DB read at all
  (`sse/handler.go:50,53-67`; `rdb` is its sole dependency). `StreamOrderMonitor`
  (`/sse/order-monitor/:id`, used by C11 tracking) **does** snapshot on connect, but **only** the
  `queue.update` + `tables.status` broadcast payloads — **not** the `order:<id>` status
  (`sse/monitor_handler.go:59-65`). Consequence shared by C9/C10/C11: any status change that lands
  while a phone is disconnected is lost on the order channel; the badge is correct only because of the
  separate REST fetch (and is doubly dead on C11 where the FE listener key also mismatches — see the
  first bullet). Fix is the same on both handlers: read current order state from the repo and emit it
  before the loop. Infra note — the related "browser bypasses Caddy" finding
  ([`NEXT_PUBLIC_API_URL` → :8080 direct](../00_overview/SCALABILITY_REVIEW.md)) is **deliberately not
  logged here**: it's a deploy/config fact, not a page-BE fact — it lives in
  [00_overview/SCALABILITY_REVIEW.md](../00_overview/SCALABILITY_REVIEW.md). Found 2026-06-15 while
  verifying the scalability review.
- **Catalog GETs are "available-only" everywhere — no per-id combo endpoint.** Both
  `ListProductsAvailable` and `ListCombosAvailable` filter `WHERE is_available=1 AND deleted_at IS
  NULL` (`products.sql.go:469,387`), and there is **no `GET /products/:id` for combos** (combos
  group is GET-list + manager/admin writes only, `main.go:215-227`). Consequence shared by the
  catalog-detail pages: `/menu/combo/:id` (C5) over-fetches the whole list and finds by id
  client-side, and any FE code path for an *unavailable* product/combo or an unavailable combo
  sub-item is unreachable from the public catalog (C5 [COMBO_BUGS.md](customer/customer_combo_detail/COMBO_BUGS.md)
  bugs 1–2). When C8 `/checkout` / C2 `/welcome` are traced, expect the same available-only filter
  to shape their empty/edge states. **Exception found on C4 run (2026-06-14):** `GET /products/:id`
  (`GetProductByID`, `products.sql.go:222-225`) filters **only `deleted_at IS NULL` — NOT
  `is_available`**, so unlike the menu list *and* unlike combo detail, the product-detail page **can**
  render an unavailable product. Its "Hết hàng" badge + disabled CTA (`ProductInfo.tsx:16-20`,
  `CTAFooter.tsx:19-21`) are therefore **reachable** (e.g. a favourited/deep-linked product that went
  unavailable) — the dead-UI bug that hits combo detail does **not** apply here. Logged in LOGIC
  Decision Log 2026-06-14. **A4 admin combos run (2026-06-18) extends this to the admin side:** the
  **management** page `/admin/combos` *also* reads the public `GET /combos` → `ListCombosAvailable`
  (`product_service.go:505`) — there is **no `GET /combos/all`** (contrast products' manager-only
  `/products/all`→`ListProducts` unfiltered, `main.go:173`). The unfiltered `ListCombos` query
  (`products.sql:107`) exists but is **dead/unwired**. So a hidden combo is not just invisible to
  customers — it is **unmanageable** (un-editable/un-deletable) from admin too. Latent today (nothing
  sets a combo `is_available=0`: `CreateCombo` hardcodes 1, no toggle exists), but a real wrong-query
  defect — see [COMBOS_BUGS.md Bug 1](admin/admin_combos/COMBOS_BUGS.md). A fix should add a manager
  `GET /combos/all` (mirroring products) or remove the dead query.
- **Topping-cache invalidation is asymmetric — list keys yes, `product:<id>` no.** A topping write
  (`PATCH`/`DELETE /toppings/:id`) calls `invalidateToppingCaches` which Dels only `toppings:list` +
  `products:list` (`product_service.go:719-721`) — it never Dels any `product:<id>` key. So the
  list-driven pages (C1 menu, C5 combo detail, C6 favourites — all read `products:list`) refresh
  their embedded topping data on the next request, but **C4 product-detail (the only reader of
  `product:<id>`) serves a stale topping price/availability for up to 5 min** (Redis TTL) + the FE
  5-min `staleTime`. Low severity, no `_BUGS.md`; documented in
  [customer_product_detail_be.md Flag 2](customer/customer_product_detail/customer_product_detail_be.md).
  Found during C4 run 2026-06-14. **A6 run (2026-06-18) confirms the write side:** `/admin/toppings`
  (A6) is the management UI whose create/edit/delete fire these very `invalidateToppingCaches` calls
  (`POST /toppings`, `PATCH`/`DELETE /toppings/:id` — `product_service.go:452,467,486`), so a topping
  edited there is the source of C4's staleness. A fix to invalidate `product:<id>` on topping writes
  closes it for both the A6 write side and the A3 product-form picker. See
  [admin_toppings_be.md Flag 2](admin/admin_toppings/admin_toppings_be.md) +
  [admin_toppings_crosspage_dataflow.md §2.3](admin/admin_toppings/admin_toppings_crosspage_dataflow.md).
- **`orders:kds` Redis channel is shared by KDS + Overview WS.** Both `/ws/kds` and
  `/ws/orders-live` subscribe to the same `orders:kds` channel (`websocket/handler.go:18,23`), so
  every `order_status_changed` / `item_progress` / `new_order` event reaches the KDS board **and**
  the admin live floor. A change to the published `orderEvent`/`itemEvent` shape
  (`order_service.go:789-804`) breaks **both** S3 (staff_kds) and A1 (admin_overview) BE docs at
  once. Found during A1 run 2026-06-14. **S3 run (2026-06-17) confirms + refines:** the KDS page
  connects via the shared `/ws/orders-live` (NOT `/ws/kds`, which no FE uses); it consumes exactly
  `new_order` / `item_progress` / `order_cancelled` / `order_status_changed` and **ignores**
  `items_added` / `item_cancelled` / `item_updated` (`kds/page.tsx:116-155`). Note `item_progress`
  is produced only by `UpdateItemServed` (`order_service.go:722`→`:1009`), which the KDS itself
  can't reach (tap-to-serve 404, [KDS_BUGS.md](staff/staff_kds/KDS_BUGS.md) Bug 1) — so the KDS
  never originates it, only renders it when another client serves an item. **S5 run (2026-06-18)
  adds a 4th producer + event class on this channel:** `payment_service.completePayment` publishes
  **`payment_success`** (`{type, order_id}`) to `orders:kds` (`payment_service.go:270-271`) — so the
  cashier-payment page (S5) consumes it for its print/redirect, while KDS, POS, and the admin floor
  receive `payment_success` too and silently ignore it. A change to the `orders:kds` event shape now
  touches **four** BE docs (A1, S3, S4, S5). Today S5's listener never fires anyway — the create
  response omits `status` so the WS never connects ([PAYMENT_BUGS.md](staff/staff_cashier_payment/PAYMENT_BUGS.md) Bug 2).
- **WS `/ws/orders-live` and `/ws/kds` carry no `authMW` and no role gate** — auth is `?token=`
  parsed inside the handler (`main.go:337`, `websocket/handler.go:31-47`). Any authenticated JWT
  (incl. a `customer` guest token) can subscribe to either live feed. Affects every page consuming
  the orders WS (A1 Overview, S3 KDS, **S4 POS** — `/pos` uses `/ws/orders-live` for its ready
  auto-redirect, confirmed during the S4 run 2026-06-16). Contrast SSE `/sse/admin` =
  `AtLeast("manager")`. Logged in LOGIC Decision Log 2026-06-14.
- **`GET /products` ignores `category_id` — the shared catalog filter is dead on every page that
  sends it.** The `ListProducts` handler reads no query params (`product_handler.go:42-54`), the
  service/query take no filter (`product_service.go:164`, `query/products.sql:35-38` →
  `ListProductsAvailable`), and the wired-but-unused `ListProductsByCategoryAvailable`
  (`query/products.sql:30-33`) is connected to nothing. So **C1 menu** category tabs and **S4 POS**
  (`/pos`) category tabs both re-key their TanStack query on tab change but receive the *same* full
  available list — the tabs are cosmetic, not filters. Documented as a flag on both
  [customer_menu_be.md Flag 1](customer/customer_menu/customer_menu_be.md) and
  [staff_pos_be.md Flag 1](staff/staff_pos/staff_pos_be.md); same single root, so a fix (wire the
  by-category query or filter client-side) would touch both pages. Confirmed on the 2nd page during
  the S4 run 2026-06-16.
- **POS `POST /orders` is the only order-create path that consumes the thin `{id, table_busy}`
  response directly without a follow-up `GET /orders/:id`.** The customer menu (C1) and checkout (C8)
  both re-fetch the full order after create; POS does not (`pos/page.tsx:97-99`), so the
  `order_handler.go:121` thin response (no `order_number`) surfaces as **"Đơn #undefined"** only on
  S4 — see [POS_BUGS.md](staff/staff_pos/POS_BUGS.md) Bug 1. If the BE response is ever widened to
  include `order_number`/the full order, this POS bug closes for free and the C1/C8 follow-up GET
  becomes optional. Found during the S4 run 2026-06-16.
- **Restock write + low-stock read are shared by A2 (Summary) and A10 (Ingredients).**
  `POST /admin/stock-movements` (`ingredient_handler.go:172`) and `GET /admin/ingredients/low-stock`
  (`ingredient_handler.go:70`) are reached from both `/admin/summary`'s `StockInModal` and the
  `/admin/ingredients` page. The non-transactional insert+update (`ingredient_repo.go:221-248`) and
  the `current_stock <= min_stock*1.2` low-stock filter affect both BE docs; a stock-in done on
  Summary invalidates the `['admin','ingredients']` query so the Ingredients page reflects it on
  next read (`summary/page.tsx:225-226`). No realtime — refetch-only, not pushed cross-device.
  Found during A2 run 2026-06-15.
- **A3 (Products) is the write/invalidation source for the shared catalog caches that A11-ish menu
  reads consume.** `/admin/products` writes call `invalidateProductCaches`/`invalidateToppingCaches`
  (`product_service.go:709-721`), Del-ing `products:list`/`categories:list`/`toppings:list`/`product:<id>`
  — the exact keys the **customer `/menu` (C1), product/combo detail (C4/C5), and POS (S4)** read
  from. So a product edit on A3 silently shapes those pages on their next fetch (no realtime push).
  Two A3 bugs propagate cross-page: (a) the **broken availability toggle** means a sold-out dish
  cannot be hidden — it keeps showing on `/menu` (`is_available=1` filter) and POS; (b) **DELETE has
  no active-order guard**, so a product on a live order can vanish from the menu mid-service
  (historical orders safe — items snapshot name/price). See
  [PRODUCTS_BUGS.md](admin/admin_products/PRODUCTS_BUGS.md). Found during A3 run 2026-06-15.
- **`staff_tasks` is shared by A9 (Todo List) and A8 (Task Board) — and there is NO update/delete
  query.** Both pages call the identical `GET /admin/tasks/stats`, `GET /admin/tasks`,
  `POST /admin/tasks` (+ `GET /staff`), all `authMW` + `AtLeast("manager")`, no Redis, no realtime.
  The router exposes only those three task routes (`main.go:307-309`) and `tasks.sql` defines only
  read + insert — **no `UPDATE`/soft-delete query exists**, and `CreateStaffTask` hardcodes
  `status='pending'`. Consequences ripple to both pages: (1) the modal "edit" on A9 re-POSTs and
  **creates a duplicate** with no way to delete it; (2) tasks can never advance past `pending` from
  the UI, so every completion/overdue stat on **both** A9 and A8 is permanently 0 on a live DB.
  Any future fix (add `PATCH /admin/tasks/:id` + status mutation) must update **both** BE docs.
  See [TODO_BUGS.md](admin/admin_todo_list/TODO_BUGS.md) + [TASK_BOARD_BUGS.md](admin/admin_task_board/TASK_BOARD_BUGS.md).
  Found during A9 run 2026-06-15; the A8 run (2026-06-15) confirmed the same root and added that
  on A8 the write-once status also kills `qualityScore` (fabricated as `completionRate/20`) and the
  per-staff overdue highlight — and that **no staff-facing route lets an assignee view their own
  tasks** (only `useTodoTasks.ts` reads `staff_tasks`, admin-side), so created tasks never reach the
  worker. **A12 Training (run 2026-06-16) is a third instance of the exact same "write side never
  wired" pattern** (not a shared endpoint — separate `training_*` tables): `UpsertStaffProgress` /
  `InsertQuizAttempt` queries + repo methods exist but have **zero service/handler callers**
  (`training_repo.go:25,30`), so `training_progress`/`quiz_attempts` are never written and the whole
  Zone D / Modal 2 progress-tracking half of `/admin/training` is permanently empty/404 — and like
  task-board, **there is no staff-facing surface that would produce the rows** (no watch/quiz
  endpoint). See [TRAINING_BUGS.md](admin/admin_training/TRAINING_BUGS.md) Bug 1. A general fix for
  this class is "build the row-producing write endpoint, not just the read/aggregation side."
- **`POST /auth/guest` is the session-minting source for EVERY customer page — and the session is
  memory-only.** The guest JWT + table binding minted on C3 `/table/:tableId` (`auth_service.go:281-303`)
  is the auth that C4/C5 (detail), C8 `/checkout`, C9/C10 (`/order`), C11 `/tracking` all rely on, yet
  it lives only in non-persisted Zustand (auth store has no `persist`; cart `partialize` keeps only
  `orderNote`+`activeOrderId`, `cart.ts:153`). Consequence shared by all customer pages: an **F5 / new
  tab / app restart anywhere wipes the token + tableId/tableName**, so the diner must re-scan the QR —
  there is no silent re-auth (guest JWT has no refresh, BUSINESS_RULES §5.1). Found during C3 run
  2026-06-15.
- **`TABLE_HAS_ACTIVE_ORDER` has 3 FE consumers and ZERO live producers — all 3 branches are dead.**
  (Original C3-run framing, since corrected: "emitted only on the order-create path … live on C8/POS,
  dead on C3" — that was **wrong**; see correction below. Kept for history.) Any future "scan→rejoin
  existing order" feature must add an active-order lookup to `GuestLogin` (would touch the C3 BE doc +
  this concern). See [TABLE_QR_BUGS.md](customer/customer_table_qr/TABLE_QR_BUGS.md) Bug 1. Found during C3 run 2026-06-15.
  **⚠️ Correction from the C8 `/checkout` run (2026-06-15) — code wins:** `ErrTableHasActiveOrder`
  has in fact **zero live producers**, not two. A full grep shows the constant is referenced **only**
  at `errors.go:30` and returned by **no** path — the order-create path (`CreateOrder`,
  `order_service.go:270-275`) returns `201` + an informational `table_busy:true` flag and creates a
  **parallel order**; it never returns the error. So the FE consumers on C8 `/checkout`
  (`checkout/page.tsx:79`) **and** the POS `TableGrid.tsx:107` are **both dead branches** too — not
  just C3. On checkout this means a busy-table submit silently creates a duplicate with no notice (it
  reads neither the error nor `table_busy`). See [CHECKOUT_BUGS.md](customer/customer_checkout/CHECKOUT_BUGS.md)
  Bug 2. Any fix is a product decision — most likely remove the dead FE branches and/or surface
  `table_busy`. **C3 `/table/:tableId` re-run (2026-06-15) confirms + closes the loop:** the C3 anchor,
  page doc, and the C3 Decision Log entry had each carried the same wrong "guard still holds at
  `POST /orders`" wording — all three corrected this run. Note the direction of the drift:
  **BUSINESS_RULES §2.3 *says* one-active-order (409 if violated); the *code* diverges to allow
  concurrent orders.** §2.3 is now annotated ⚠️ NOT-IN-CODE (flagged to owner — enforce the 409 guard
  vs. rewrite §2.3 to multi-order). See [TABLE_QR_BUGS.md](customer/customer_table_qr/TABLE_QR_BUGS.md) Bug 1.
  **C13 `/` (public_landing) run 2026-06-17 closes the consumer list:** the 3rd dead consumer named
  above — `TableGrid.tsx:107` — **is the SimulateBtn on the landing page `/`** (the "Giả lập khách"
  demo helper), not a separate surface. All 3 dead branches are now each owned by a traced page: C3
  (`page.tsx:36`), C8 checkout (`checkout/page.tsx:79`), C13 landing
  ([LANDING_BUGS.md](public/public_landing/LANDING_BUGS.md) Bug 3). No new consumer; the
  one-active-order product decision resolves all three at once.
- **📄 Docs-hygiene (not a BE/code fact): broken `../../` relative links to `docs/system` top-level
  dirs in several existing page docs.** From a per-page folder (`08_pages/<cat>/<page>/`) the correct
  depth to a top-level handbook dir is **`../../../`** (up 3: page → category → 08_pages → system);
  multiple existing docs use **`../../`** (up 2), which resolves to the non-existent
  `08_pages/<NN_topdir>/…` and so 404s. Confirmed broken in the **gold model**
  [customer_menu/customer_menu_be.md](customer/customer_menu/customer_menu_be.md) (e.g.
  `../../02_spec/object/OBJECT_MODEL_ORDER.md`) — likely copied into other page docs built from it.
  The **C6 favourites** set (this run) uses the correct `../../../` depth. Sibling-to-sibling links
  (`../customer_menu/…`, same-folder `customer_favourites_be.md`) are fine — only top-level-dir
  links are affected. Mechanical fix (`../../<NN_>` → `../../../<NN_>`); **not registered** in
  MASTER_TASK yet and **not** in the LOGIC Decision Log (it is doc hygiene, not code/business drift).
  Found during C6 (customer_favourites) run 2026-06-14.
- **Login IS rate-limited, guest is NOT — and the throttle lives in the service, not middleware.**
  `POST /auth/login` (S1) calls `AuthService.checkLoginRateLimit` (`auth_service.go:346-365`, Redis
  `INCR ratelimit:login:<ip>`, 5/min, fail-open) on every attempt, so the login throttle is **real** —
  contrast `POST /auth/guest` (C3 `/table/:tableId`), where BUSINESS_RULES §5.2 documents a 5 req/min
  limit that **does not exist in code** (no rate-limit middleware on any `/auth` route — same gap noted
  on the S2 register row). The distinction matters for any security/middleware audit: grepping
  `be/internal/middleware/` finds no limiter, but login is nonetheless throttled inside the service.
  All three `/auth` write endpoints (login/register/guest) are otherwise **public, no `authMW`**, and
  share the same access-JWT (24h) + refresh-cookie (30d, httpOnly, path `/api/v1/auth`) mint —
  a change to `GenerateAccessToken`/`SetRefreshCookie` touches the S1, S2, and C3 BE docs at once.
  Found during S1 (staff_login) run 2026-06-16.
- **Admin-only `DELETE` rendered to managers → silent 403 — a recurring FE class across A3, A5, A12.**
  Every admin domain that splits write auth (POST/PATCH = `AtLeast("manager")`, **DELETE =
  `AtLeast("admin")`**) renders its 🗑/"Xóa" delete affordance to all manager+ users without a role
  check, while the admin shell guard is `minRole=MANAGER` (so managers reach the page). A manager's
  delete therefore 403s, and the FE `onError` (which only special-cases the domain's 409) shows a
  generic error toast — the permission failure is mislabelled, never explained. Confirmed instances:
  **A3 Products** `DELETE /products/:id` ([PRODUCTS_BUGS.md](admin/admin_products/PRODUCTS_BUGS.md)),
  **A12 Training** `DELETE …/guides/:id` ([TRAINING_BUGS.md](admin/admin_training/TRAINING_BUGS.md) Bug 2),
  and now **A5 Categories** `DELETE /categories/:id`
  ([CATEGORIES_BUGS.md](admin/admin_categories/CATEGORIES_BUGS.md) Bug 1, `main.go:193-196` vs
  `categories/page.tsx:131-136`). One FE fix pattern resolves all three: gate the delete button on
  `role==='admin'` (or add a `403` branch to each `onError`). A future audit of every `AtLeast("admin")`
  route in `main.go` against its FE caller would find any remaining instances (A4 Combos, A6 Toppings,
  A7 Staff likely share it). Confirmed as a 3rd instance during the A5 run 2026-06-18.
  **Exceptions found (do NOT share the bug):** **A4 Combos** gates 🗑 on `role==='admin'`
  (`combos/page.tsx:326`); **A7 Staff** is also clean — `StaffTable.canDelete` (`StaffTable.tsx:61-66`)
  hides the "Xóa" button for managers *and* for any row whose role ≥ the caller's level, so a manager
  never sees a delete they'd be 403'd on. So the recurring class is A3/A5/A12, not universal.
- **Staff-table writes (A7) ripple to the auth layer + the task assignee dropdowns — pull-only except
  for the target's own lockout.** `/admin/staff` (A7) is the sole writer of the `staff` table.
  Two cross-page effects: (1) `PATCH /staff/:id/status` and `DELETE /staff/:id` call
  **`Del(auth:staff:<id>)`** (`staff_service.go:230,268`), the same `auth:staff:{id}` cache the **auth
  middleware reads on EVERY authenticated request** (`middleware/auth.go:55` → `IsStaffActive`
  `auth_service.go:315-317`), so a deactivated/deleted staff is locked out on their *next* call with
  no 5-min TTL lag (Spec1 §4.3 AC-10) — the one near-live tentacle of an otherwise pull-only page;
  fail-open if Redis is down (REDIS_CACHE.md:71,77). (2) `GET /staff` is shared by the **A8 Task Board**
  (`CreateTaskModal.tsx:41`) and **A9 Todo List** (`TodoPageClient.tsx:37`) assignee pickers, so a
  created staff becomes assignable and a deleted one disappears from the dropdowns — but a
  **deactivated** staff still appears there (the list filters `deleted_at IS NULL`, not `is_active`),
  so a manager can assign a task to a disabled account. No SSE/WS for staff — two managers' rosters
  reconcile only on window-focus refetch (`refetchOnWindowFocus`+`staleTime:0`). A change to the
  `staff` row shape or the `staffActiveKey` helper would touch the A7 BE doc, the auth/login flow, and
  the A8/A9 docs at once. See [admin_staff_crosspage_dataflow.md](admin/admin_staff/admin_staff_crosspage_dataflow.md).
  Found during A7 run 2026-06-18.
