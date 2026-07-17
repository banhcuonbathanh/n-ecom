# Comparison Doc Tracker — Doc vs. Code

> One row per page that has a `/comparison-doc` set. Every 🔴 finding and every cross-page concern from
> a run MUST land here — no finding may live only inside a comparison file. **Code wins**; these are
> read-only audits, not fixes. The set per page = 3 files in the page folder:
> `COMPARISON_DOC_VS_CODE_DETAILED.md` (EN) · `..._DETAILED_VI.md` (VI mirror) ·
> `COMPARISON_VISUAL_MOCKUP_VI.md` (per-zone ①②③ + 📷 + 💬).
>
> Built by `/comparison-doc <page-folder-name>` — see `.claude/skills/comparison-doc/SKILL.md`.
>
> **Close-the-loop rule (2026-07-15):** a 🔴 may only move from `⏳ open` to closed by writing either a MASTER_TASK row ID (code bug → `→ P-FIX-n`) or a doc-fix commit hash (doc drift → `📝 <hash>`) in the `Fixed?` column — no third state.

| Page | Last Run | Branch | 🔴 | 🟡 | 🟢 | Files | Headline drift / concerns | Fixed? |
|---|---|---|---|---|---|---|---|---|
| customer_menu | 2026-06-25 (refresh; design overlay 2026-06-23; first run 2026-06-20) | docs/customer-menu-alignment | 7 | 18 | ~25 | [EN](customer/customer_menu/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_menu/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_menu/COMPARISON_VISUAL_MOCKUP_VI.md) | **2026-06-25 DRIFT FLIPPED: the new design is now BUILT — most "8 rebuild gaps" are CLOSED, so `customer_menu.md` is now full of STALE "⚠️ NEW DESIGN — code pending rebuild" markers that lie.** Confirmed rebuilt: MenuHeader photo-banner (store-free), scroll-spy `MenuCategoryNav`+`MenuSections` (replaced filter `CategoryTabs` — now the **POS** component), `ComboCard` multi-select nhân, `CartBottomBar` two floating pills (no total), `OrderSummary` spinning "Bàn 04" `running-border` ring + no "Gọi thêm" badge + collapsible Tổng-số-món table. **OLD HEADLINE RESOLVED:** `TableConfirmModal` 201 handoff NOW calls `setActiveOrderId` (`TableConfirmModal.tsx:51`); MenuHeader `settings.tableLabel` read removed. **3 real code divergences remain (🔴):** (1) **note data-loss** — `TableConfirmModal` keeps its own `useState('')` note + POSTs it (`:15,:23`), discarding `cart.orderNote` typed in `OrderSummary` (`OrderSummary.tsx:62`); (2) `ComboSection.tsx:16` heading "Combo" vs nav tab "Suất" (`MenuSections.tsx:29`) vs design "SUẤT"; (3) redundant 2nd `RestaurantBanner` (`page.tsx:131`, missing img → gradient) not in DESIGN_PROMPT. **Loading doc has 3 hard errors (🔴):** queryKey `['products', searchQuery]` has no `selectedCategory` (`page.tsx:67`); the `searching` branch is omitted; guard is `combos.length===0` not `!showCombos` (`page.tsx:190`). **Owner decided NOT to pre-fill the note** → the "Gia đình…" pre-fill is a doc fix (note starts empty), not a code task. **Dead code (owner defers deletion):** `ToppingModal` (0 imports), `ComboModal` (mounted, `setModalOpen(true)` never called). 🟡 nullable FE types (`description`/`image_path`/combo `category_id` → `string`), dead `buildImageURL`, CART_CONFIG key `cart-config-v3` vs persist `version:5`. Screenshots ⏳ (stack down). | → P-FIX-3 (note); doc 🔴s ⏳ |
| customer_combo_detail | 2026-06-20 | experience_claude.md_system_1_test_iphon2_change_code | 0 | 3 | 6 | [EN](customer/customer_combo_detail/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_combo_detail/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_combo_detail/COMPARISON_VISUAL_MOCKUP_VI.md) | **No 🔴 doc-vs-code contradiction — low-drift, source-traced doc-set.** Two CODE bugs re-confirmed (doc already documents them): unavailable-combo UI dead (`page.tsx:122-126,180-185`, BE filters `is_available=1`); sub-item shows raw UUID when sub-product unavailable (`page.tsx:45`). Doc drift: `_be.md` route lines stale — `GET /products` `:168→:181`, `GET /combos` `:216→:229`, combo writes `:215-227→:230-239`; Zone B ASCII draws price inline (code: separate line `page.tsx:129`); CTA copy "Thêm vào giỏ" vs real "Thêm vào giỏ hàng" | ⏳ open |
| admin_ingredients | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 3 | 6 | 9 | [EN](admin/admin_ingredients/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](admin/admin_ingredients/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](admin/admin_ingredients/COMPARISON_VISUAL_MOCKUP_VI.md) | **`_be.md` is highly source-faithful (all per-endpoint line-cites exact, all SQL bodies match); `admin_ingredients.md` (FE wireframe) drifted badly.** **🔴 #1 code bug:** the entire Nhập/Xuất stock-movement feature is **unreachable** — `StockMoveModal` (`page.tsx:28-104,218`) is gated on `modal==='move'` which nothing ever sets (only `'add'`/`'edit'` at `:182,204`); no Nhập/Xuất button in `IngredientTable` (props only `onEdit`/`onDelete` `:4-8`); own comment admits "outside main spec" (`:19`); `postStockMovement` + BE `POST /admin/stock-movements` therefore dead. **🔴 #2 doc drift:** table is **8 cols** (STT/Tên/Đơn vị/Số lượng tồn/Ngày nhập/Hạn SD/Trạng thái-badge/Thao tác `IngredientTable.tsx:57-64`) — doc ASCII draws 4 + no status badge. **🔴 #3 code bug:** `GET`/`PATCH /ingredients/:id` on missing id returns **500 not documented 404** — repo wraps `sql.ErrNoRows` with `%w` (`ingredient_repo.go:147`) but service tests `== sql.ErrNoRows` not `errors.Is` (`ingredient_service.go:69`), `handleServiceError` no ErrNoRows fallback (`respond.go:24-36`); DELETE OK (raw ErrNoRows `:216`). 🟡 FK is `ON DELETE CASCADE` not RESTRICT (`009_ingredients.sql:22-23,38`) **and** delete is soft `UPDATE deleted_at` → doc's "RESTRICT→1451→500" reasoning wrong; real risk = dangling `product_ingredients` refs, not a 500; route block `293-313→307-328`; `admIngR` sub-group also wraps `DELETE /training/guides/:id`; dead 409/422 toasts (BE emits neither). Screenshots ⏳ (stack down). | → P-FIX-7 |
| admin_summary | 2026-06-20 | experience_claude.md_system_1_test_iphon2_change_code | 0 | 5 | 40+ | [EN](admin/admin_summary/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](admin/admin_summary/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](admin/admin_summary/COMPARISON_VISUAL_MOCKUP_VI.md) | **No 🔴 — doc-set is a faithful mirror.** Every FE line-cite in `admin_summary.md`/`_loading.md`/`_crosspage_dataflow.md` matches `summary/page.tsx` exactly; all BE behavioural claims confirmed. Doc drift: `_be.md` route line-numbers stale ~13 lines (`adminR` at `main.go:307` not `:294`; `authMW` `:164` not `:151`); `admIngR` note omits 2nd DELETE (`DELETE /training/guides/:id`, `main.go:327`). Two doc-confirmed code-quality gaps (not drift): no `isError` on the 4 `useQuery` (skeleton hangs on error); raw `<a href="/admin/ingredients">` not `next/link` (`page.tsx:304`) | ⏳ open |
| customer_product_detail | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 1 | 5 | 4 | [EN](customer/customer_product_detail/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_product_detail/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_product_detail/COMPARISON_VISUAL_MOCKUP_VI.md) | **🔴 code bug:** `CTAFooter` (`fixed bottom-0`, no z-index, `CTAFooter.tsx:12`) and shell `ClientBottomNav` (`fixed bottom-0 z-20`, `(shop)/layout.tsx:12`) collide on this route → nav paints over the CTA (ASCII draws them cleanly stacked). Doc drift: nav title "Chi tiết món"→**"Chi tiết sản phẩm"**; topping zone is a 2-col card grid + total line (not a checkbox list); unavailable CTA = **"Sản phẩm tạm hết"** not "Hết hàng"; `_be.md` `main.go` anchors stale (group `:180`/GET `:182` not `:167`/`:169`). Cross-page + loading + object-model docs ✅ accurate. `CTAFooter.loading?` prop dead. Screenshots ⏳ (stack down). | → P-FIX-1 |
| admin_overview | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 6 | 16 | ~30 | [EN](admin/admin_overview/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](admin/admin_overview/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](admin/admin_overview/COMPARISON_VISUAL_MOCKUP_VI.md) | **🔴 Zone B drawn wrong:** doc draws "TẤT CẢ đơn active (pending→delivered)" + `[Huỷ]` button, code (`WaitingSection.tsx:9,55`) shows **pending only**, no Huỷ. **🔴 delivered→cancelled 409 bug:** Huỷ button on `delivered` orders (`TableList.tsx:378-385`) → `handleAction(id,'cancelled')` → invalid BE transition (`order_service.go:524-529`). **🔴 dead WS branches** `order_updated`/`order_completed` (`useOverviewWS.ts:52,67`) BE never emits. **🔴 phantom `amount`** in `createPayment` (`admin.api.ts:181`, `TableList.tsx:292`) BE ignores. **🔴 dead props** `checkedTableIds`/`onToggleCheck` declared in `TableList` (`:246,248`) never destructured (`:254`). TableGrid missing pay/cancel (`page.tsx:381-390`). BE/loading/cross-component/cross-page docs **accurate** but all `file:line` stale (main.go routes +13) + provenance branch outdated. Screenshots ⏳ (stack down). | ⏳ open |
| customer_table_qr | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 2 | 1 | 6 | [EN](customer/customer_table_qr/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_table_qr/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_table_qr/COMPARISON_VISUAL_MOCKUP_VI.md) | **Near-zero doc drift — most accurate set audited.** Both 🔴 are code/spec bugs the doc already flags, NOT doc errors: (1) `TABLE_HAS_ACTIVE_ORDER` dead in 3 FE files (`table/[tableId]/page.tsx:36`, `checkout/page.tsx:79`, `app/TableGrid.tsx:107`) — `ErrTableHasActiveOrder` (`errors.go:30`) never returned anywhere in `be/`; one-active-order rule (BUSINESS_RULES §2.3) unenforced (`order_service.go:256-275` + `order_handler.go:121` return 201+`table_busy`). (2) BUSINESS_RULES §5.2 rate-limit on `POST /auth/guest` not implemented (no middleware — `auth.go`/`metrics.go`/`rbac.go` only). 🟡 no axios timeout/abort → spinner can hang (`api-client.ts:6-9`, `page.tsx:16-44`). 🟢: storage-keys line refs (5→6, 4→3), `main.go` route refs ~+10-13 (158→171), stale provenance branch. Visual mockup: 2 zones (spinner+error) match exactly, screenshots ⏳ pending. | → P-FIX-2 |
| customer_order_list | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 4 | 7 | 22 | [EN](customer/customer_order_list/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_order_list/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_order_list/COMPARISON_VISUAL_MOCKUP_VI.md) | **One of the most code-accurate doc-sets in the repo** — almost every `file:line` in `_be.md`/`_crosspage_dataflow.md`/`_loading.md` is exact. **🔴 #1 DOC DRIFT:** Flag D stale — `order_items.filling` was **dropped** by migration `017_drop_order_item_filling.sql` (nhân backfilled into `toppings_snapshot`); gone from DB + serializer (`order_handler.go:358-370`) + FE type (`order.ts:15-27`); root `CLAUDE.md` OC-4 narrative also stale. **🔴 #2-4 CODE BUGS (doc already flags them, all re-verified):** `item_cancelled` SSE never handled FE-side (BE emits `order_service.go:642`, switch `useOrderSSE.ts:83-123` has no case); `isNotFound` returned (`useOrderSSE.ts:159`) but `OrderDetailSheet.tsx:45` never destructures it → 404 spins forever; `loadCachedOrders()` mount-only (`order/page.tsx:37-39`), overlay close (`:154`) doesn't re-scan → list cards stale after SSE update. 🟡 DishRow hides `toppings_snapshot`+`note` (`OrderDetailSheet.tsx:510-544`, **screenshot-proven**); overlay far richer (3 cards + 2 modals) than 1-line Zones entry; `OrderItem.flagged`/BE-only `item_status`+`created_by` mismatch; route-line offsets ~+13 (`main.go` group `:243-259`, `DELETE /orders/items/:id` `:264`); cart persist `version:5` (key keeps `cart-config-v3`). Screenshots ✅ captured. | ⏳ open |
| customer_order_detail | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 2 | 8 | 5 | [EN](customer/customer_order_detail/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_order_detail/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_order_detail/COMPARISON_VISUAL_MOCKUP_VI.md) | **No 🔴 doc-vs-code contradiction — high-quality source-traced doc-set** (cross-page + loading + `_be.md` all accurate). Both 🔴 are CODE bugs the doc already documents (`ORDER_DETAIL_BUGS.md` Bug 1+2 · `_be.md` Flag 1-2): (1) `item_updated` published (`order_service.go:696`) but no case in `useOrderSSE` switch (`useOrderSSE.ts:83-123`) + dead `invalidateQueries(['order',id])` (`page.tsx:59`, no such `useQuery`) → quantity edits don't reflect live; (2) `item_cancelled` (`order_service.go:642`) + `items_added` (`:516`) same gap. `useOrderMonitorSSE` handles all three (`useOrderMonitorSSE.ts:84-86`) — gap is `useOrderSSE`-specific. **Dead code confirmed:** `order_init` SSE case (`useOrderSSE.ts:84-85`, no publisher emits it) + `row.notes` collected never rendered (`page.tsx:35,111,127-128`). **Doc drift confined to `.md` wireframe (Area 1):** nav draws `[StatusBadge]` but code shows LIVE/MẤT KẾT NỐI pill (StatusBadge is in order card `page.tsx:308`); order-card header omits `total_amount`+`Ẩn/Hiện`+"Mang về"; DishRow renders topping chips + `tổng/ra/còn`, NOT per-dish "· filling"; summary header "Chi tiết món" not "Tổng hợp món"; "Theo dõi bàn" button undrawn. **Model gap (🟡):** `filling` column dropped (016→017), FE `OrderItem` has none (`types/order.ts:24`); nhân backfilled into `toppings_snapshot`, canh-rau in `note` — same as `customer_order_list` 🔴 #1. Screenshots ⏳ (stack down). | ⏳ open |
| customer_tracking | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 3 | 7 | 7 | [EN](customer/customer_tracking/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_tracking/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_tracking/COMPARISON_VISUAL_MOCKUP_VI.md) | **Textual doc-set (`_be.md`/`_loading.md`/`_crosscomponent`/`TRACKING_BUGS.md`) unusually accurate — drift is concentrated in the `customer_tracking.md` ASCII wireframe.** **🔴 (doc)** `OrderDetailCard` ASCII draws per-item cooking progress `ra 1/2`/`còn 1`; code renders priced line-items + total footer, **no progress** (`OrderDetailCard.tsx:36-64,67-74`). **🔴 (doc)** `WholeFloorPrepList` ASCII draws `▓▓▓▓░░` progress bars + a `Mang về` row; code renders position# + `tableLabel` + `StatusBadge` + order-number suffix, header "Hàng chờ phục vụ" + "{N} bàn" (`WholeFloorPrepList.tsx:27-82`). **🔴 (code bug, doc-confirmed)** live status badge dead: FE listens `case 'order.status'` (`useOrderMonitorSSE.ts:67`), BE only publishes `order_status_changed` (`order_service.go:552,:745`) — `order.status` exists only in a comment (`monitor_handler.go:17`) → badge falls back to last `GET /orders/:id` (`page.tsx:44`). **NEW this refresh:** `ServiceQueueList.tsx`+`ServiceQueueItem.tsx` are dead (0 external imports — superseded by `WholeFloorPrepList`). Also dead: `tableStatuses`/`reconnect()`/`RECONNECT.showBannerAfter` (`useOrderMonitorSSE.ts:11,82,120`). Screenshots ⏳ (stack down). | ⏳ open |
| customer_favourites | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 2 | 7 | 6 | [EN](customer/customer_favourites/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_favourites/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_favourites/COMPARISON_VISUAL_MOCKUP_VI.md) | **All drift is in the one hand-drawn `customer_favourites.md`; the 4 behavioural docs (`_crosscomponent`/`_crosspage`/`_loading`/`_be`) are a near-perfect source-traced mirror.** 🔴 #1 wireframe's `[+ Giỏ]` per-card add-to-cart (`customer_favourites.md:20-21,53`) does **not** exist — `FavouriteItemCard.tsx:8-12` has only `onRemove`+`onQtyChange`; cart add is bulk-only (`page.tsx:97-122`). 🔴 #2 both footers `fixed bottom-0 z-20` (`FavouritesFooter.tsx:12`, `save/page.tsx:103`) collide with shell `ClientBottomNav` (`fixed bottom-0 z-20`, `ClientBottomNav.tsx:48`) → nav paints over the list CTA + the entire save footer (same root as customer_product_detail 🔴; wireframe hides it, `customer_favourites.md:32-34`). 🟡 TopNav titles/filter labels/`SetCard` actions ("Áp dụng" not "Thêm vào giỏ"; rename omitted)/`_be.md` `main.go` route lines stale (`:167-168`→`:180-181`, `:215-216`→`:228-229` — service/handler cites all correct). Dead: `useFavouritesStore.addItem` (0 callers; `toggleFav` is the API). Screenshots ⏳ (stack down). | → P-FIX-1 · P-FIX-10 |
| admin_toppings | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 0 | 3 | 7 | [EN](admin/admin_toppings/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](admin/admin_toppings/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](admin/admin_toppings/COMPARISON_VISUAL_MOCKUP_VI.md) | **No 🔴 — faithful, source-accurate doc-set.** Every endpoint/handler/service/repo/SQL/migration line in `_be.md` matches Go **exactly** (handler `product_handler.go:57,253,277,298,316`; service `product_service.go:432,452,467,486`; SQL `products.sql:64-91`; migration `002_products.sql:41-60`). Doc's `Flags` already document every real code gap: dead 409 branch (`toppings.name` has **no unique key** `002_products.sql:41-52`, `CreateTopping` no dup-check → BE never sends 409, `ToppingFormModal.tsx:55-57`); raw-SQL `UpdateToppingAvailability` (`product_repo.go:156-159`, bypasses sqlc); stale `product:<id>` (topping writes Del only `toppings:list`+`products:list`, **not** `product:<id>` — `product_service.go:719-721` vs key `:213`) → customer product-detail stale ≤5min; no in-use delete guard. **Drift:** `main.go` route block stale ~+13 (toppings group `:200-212→:213-225`; `/products/all` `:173→:186`, `prodR` `:167→:180`); `_loading.md:193` links a non-existent `_crosscomponent_dataflow.md`; ASCII abbreviations ("SP"→"sản phẩm", unrendered "Hành động" header `ToppingTable.tsx:36`). Screenshots ⏳ (stack down). | ⏳ open |
| admin_products | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 4 | 36 | 85+ | [EN](admin/admin_products/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](admin/admin_products/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](admin/admin_products/COMPARISON_VISUAL_MOCKUP_VI.md) | **3 doc-drift 🔴 + 1 code-bug 🔴.** 🔴 Wireframe (`admin_products.md:18-23`) omits the whole **Topping** column (`ProductsTable.tsx:37,67-83`) + labels status "Còn hàng" vs code "Trạng thái" (`:39`). 🔴 Modal wireframe (`admin_products.md:26`) draws a "công tắc còn hàng" that **does not exist** (`ProductFormModal.tsx` — no `is_available` in schema `:15-22`/payload `:104`). 🔴 `_loading.md:88-91`+Flag 3 & `_crosscomponent.md:423-426` claim the modal lazy-loads on open, but `page.tsx:130-135` renders it **unconditionally** → chunk + 2 sub-queries (`ProductFormModal.tsx:39-48`) fire on page mount. 🔴 **Bug 1 (code)**: availability badge always 400s — `main.go:189`→`UpdateProduct` (requires name/price/category_id); `ToggleProductAvailability` (`products.sql.go:667-676`)+repo (`product_repo.go:82-84`) unwired. Bug 2 (`is_available` dropped on create, `products.sql.go:82-83`) + Bug 3 (no DELETE active-order guard → dead FE 409 `page.tsx:36-37`) re-confirmed. **Combined insight:** no working UI path to set availability (broken badge + no modal switch). Behavioural docs (`_be`/`_crosscomponent`/`_crosspage`/`_loading`) otherwise accurate; only `main.go` route lines stale (~+13). Screenshots ⏳ (stack down). | → P-FIX-6 |
| admin_staff | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 0 | 8 | 47+ | [EN](admin/admin_staff/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](admin/admin_staff/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](admin/admin_staff/COMPARISON_VISUAL_MOCKUP_VI.md) | **No 🔴 — FE & BE agree on every route, shape, and guard.** All guards confirmed: manager+ group, admin-only `DELETE`, create/update role-hierarchy, self-deactivation block, last-admin guard, `Del(auth:staff:<id>)` lockout; `performance_score: 0` is a hardcoded stub (`staff_handler.go:250`, no column — Flag 8 holds). **Genuine visual drift (doc fix):** `admin_staff.md` ASCII draws StatsBar as 5 role cards (code renders **4**, role folded into "Theo vai trò" subLabel `StaffStatsBar.tsx:31-50`) + row actions as 4 grouped emoji (code = text buttons + separate toggle column `StaffTable.tsx:123-159`). BE line-cites stale (`main.go` group `:280→:293`, DELETE sub-group `:287-290→:300-304`; `staff_service` `:203→:204`, `:236-238→:237-239`; repo `CountAdmins`↔`SoftDeleteStaff` transposed). Doc-confirmed code gap (not drift): `StaffDetailDrawer` has no `isError` branch (`:54-66`). | ⏳ open |
| customer_settings | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 1 | 4 | 4 | [EN](customer/customer_settings/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_settings/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_settings/COMPARISON_VISUAL_MOCKUP_VI.md) | **Low-drift; doc-set is a single file (`customer_settings.md`).** **🔴 doc drift (NOT a code bug):** Key Interactions claims Lưu "navigates back" — `handleSave` (`menu/settings/page.tsx:14-19`) only writes the store + shows "Đã lưu!" toast for 2s; **no navigation** (back arrow `page.tsx:26` is the only `router.back()`). ASCII copy stale: name label "Tên của bạn"→**"Tên hiển thị"** (`page.tsx:39`); save "💾 Lưu"→**"Lưu cài đặt"**/"Đã lưu!" (`page.tsx:74`); ASCII omits both helper-texts (`page.tsx:49,65`) + the saved-state toggle. Bottom-nav "Cài Đặt" tab ✅ (`ClientBottomNav.tsx:91-98`); no BE calls ✅; store persisted via `CUSTOMER_SETTINGS='customer-settings'` ✅. Areas 4 (loading) + 5 (FE⇄BE) N/A. Screenshots ⏳ (stack down). | ⏳ open |
| customer_profile | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 1 | 5 | 3 | [EN](customer/customer_profile/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_profile/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_profile/COMPARISON_VISUAL_MOCKUP_VI.md) | **Near-zero doc drift — exemplary, honest doc-set (like combo_detail/table_qr).** The lone 🔴 is a **CODE bug the doc already documents correctly**, re-verified by grep: `GET`/`PUT /customer/profile` **do not exist** — no `/customer` group in `main.go:161` (mounts only auth…ws `:167-350`), grep `customer/profile`/`profile` in `be/` = none (only staff `auth/me`). Page ships looking functional but every save 404s + toast mislabels it "kiểm tra kết nối". Areas 2 & 3 N/A (no shared store, no outliving write — `setCustomerName` exists `settings.ts:17` but gated behind dead PUT). Doc drift = minor only: `_be.md` `main.go` cites stale (v1 `:148→:161`, children `:154-311→:167-350`, omits `files`/`ws` groups); `SCENARIO` metrics-mw `:117,126→:118,:121`; Zone B ASCII draws avatar+name side-by-side (code = vertical centered `ProfileAvatarHeader.tsx:12,37`); Zone A title centered not left (`CustomerTopNav.tsx:23`). No fixed-footer collision (SaveCTABar in-flow — contrast product_detail). Screenshots ⏳ (stack down). | ⏳ open |
| admin_combos | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 0 | 3 | ~8 | [EN](admin/admin_combos/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](admin/admin_combos/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](admin/admin_combos/COMPARISON_VISUAL_MOCKUP_VI.md) | **No 🔴 doc-vs-code contradiction — high-fidelity, source-traced set (peer of customer_combo_detail/admin_summary).** Doc accurately describes the code *including* its bugs. **4 CODE bugs re-confirmed (doc already documents them, NOT drift):** (1) admin list available-only — service `ListCombos` calls `ListCombosAvailable` (`product_service.go:505`), unfiltered `ListCombos` query DEAD (`products.sql:107`), no `/combos/all` endpoint; (2) `PATCH /combos/:id` nulls `image_path`+`category_id` every edit — handler struct omits both (`product_handler.go:400-406`), service omits `ImagePath` + `category_id=""→NULL` (`product_service.go:603-610`), SQL sets both (`products.sql:132-135`); (3) item inserts non-tx + swallow FK errors (`product_service.go:563,618`); (4) `POST` validation looser than `PATCH` (price min=0/no item-min vs min=1/min=2, `product_handler.go:359-365`). **Dead BE query** `ListCombos` (`products.sql:107`), **dead response field** `is_available` (returned, never rendered/toggled), **dead service param** `UpdateComboInput.CategoryID`. Doc drift = provenance only: `providers.tsx` real path `fe/src/lib/` not `fe/src/app/` (🟡, value 60s/line right); `main.go` route lines stale ~+13 (combos group `:215-227→:228-240`, GET `:216→:229`, `/products/all` `:173→:186`); `product_name:''` `:143→:142`; stale branch in all 6 headers. Screenshots ⏳ (stack down). | ⏳ open |

| customer_welcome | 2026-06-22 | experience_claude.md_system_1_test_iphon2_change_code | 0 | 1 | 9 | [EN](customer/customer_welcome/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_welcome/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_welcome/COMPARISON_VISUAL_MOCKUP_VI.md) | **No 🔴, no code bug — one of the most accurate doc-sets in the repo (peer of customer_table_qr/customer_profile).** Fully static Server Component (`fe/src/app/welcome/page.tsx`, 256 lines): no store, no persist, no loading, no BE → Areas 2-5 genuinely N/A (doc-set says so). **SCENARIO_WELCOME.md every `file:line` EXACT** (`:32,:9-25,:27-30,:45-50,:74-79,:80-85,:112-118,:131-150,:153-158,:180-185,:205-211,:228-233,:247-251`); "256 lines" correct. Tracker's standing question resolved: **signature dishes are the static `dishes` const (`page.tsx:9-25`), NOT `GET /products`.** Lone 🟡: ASCII rounds **both** hours closings to "21h" but weekend closes **21:30** (`page.tsx:29`). 🟢: headline "—" is a `<br/>` (`:62-66`); dish names abbreviated; ASCII omits section Badge/h2/sub-`<p>` per zone; footer "Chính Sách"→`/privacy-policy` + "Điều Khoản"→`/terms` both **exist**; `/introduction` correctly absent (doc marks 🔮 PLANNED); SCENARIO provenance branch stale (`..._system_1` vs `..._test_iphon2_change_code`). Screenshots ⏳ (stack down). | ⏳ open |

| customer_checkout | 2026-06-23 (re-verified; first run 2026-06-22) | experience_claude.md_system_1_test_iphon2_change_code | 3 | 5 | 6 | [EN](customer/customer_checkout/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_checkout/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_checkout/COMPARISON_VISUAL_MOCKUP_VI.md) | **2026-06-23 refresh: all 3 🔴 hand-re-verified on the same branch — code unchanged, every finding holds.** **Source-faithful doc-set — it documents the code *including* its bugs (peer of combo_detail/order_detail/admin_combos). The only doc-vs-code CONTRADICTION is the footer.** **🔴 #1 (NEW, undocumented code bug + doc drift):** submit bar `fixed bottom-0` **no z-index** (`checkout/page.tsx:203`) under shell `ClientBottomNav` `fixed bottom-0 z-20` rendered as later sibling (`ClientBottomNav.tsx:48`, `(shop)/layout.tsx:12`) → nav paints over the "Đặt hàng" CTA; wireframe draws them cleanly stacked (`customer_checkout.md:43-45`). **Same class as customer_product_detail + customer_favourites.** **🔴 #2 (code bug, doc-documented):** `payment_method` collected (radio writes `cart.setPaymentMethod` `page.tsx:47` + Zod `page.tsx:19`) but absent from POST payload (`page.tsx:49-56`), no `orders` column, **0 grep hits** in handler/service → radio cosmetic. **🔴 #3 (code bug, doc-documented):** `ErrTableHasActiveOrder` defined (`errors.go:30`) but **returned nowhere in be/** (grep); `CreateOrder` sets `tableBusy` informational (`order_service.go:270-275`), returns `201 {id,table_busy}` (`order_handler.go:121`); FE `onError` branch (`page.tsx:79-84`) dead **and** `onSuccess` never reads `table_busy` → **silent duplicate order** (no notice, unlike menu `TableConfirmModal`). 🟡 Bug 3 latent online 403 (`order_service.go:116-119`, NULL table); dead `setPaymentMethod` write (`page.tsx:47`); name/phone/note not server-validated (`order_handler.go:62-64`); payment-zone vertical list w/ Cash LAST not 2×2 (`page.tsx:24-29`); `CART_CONFIG='cart-config-v3'` vs persist `version:5`. 🟢 `_be.md` `main.go` lines stale `:230-237→:243-249`, combo header `:398-412→:402-411`, off-by-one `page.tsx:79-83→:79-84` / `order_service.go:116-120→:115-120`, stale provenance branch. Area 2 N/A (single page.tsx). `GetOrder` uses `errors.Is(sql.ErrNoRows)` `:109` — NOT the admin_ingredients 404→500 trap. Screenshots ⏳ (stack down). | → P-FIX-2 (footer ✅ FIX-OL-1) |
| customer_introduction | 2026-06-23 | experience_claude.md_system_1_test_iphon2_change_code | 2 | 3 | 5 | [EN](customer/customer_introduction/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](customer/customer_introduction/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](customer/customer_introduction/COMPARISON_VISUAL_MOCKUP_VI.md) | **Doc-set is a single PROPOSED wireframe (`customer_introduction.md`) but the page is fully BUILT & shipped — the headline drift is the status itself.** **🔴 #1 status drift:** doc marks `🔮 PLANNED` / "proposed — owner to confirm" (`customer_introduction.md:3,6,43,53`) + `PAGES_INDEX.md:31` also `🔮 PLANNED`, yet `app/introduction/page.tsx:16-63` + 5 real components (`features/introduction/IntroHero|IntroStory|IntroGallery|IntroMap|IntroContact.tsx`) render the page. **🔴 #2 orphaned route:** nothing in `fe/src` links to `/introduction` (grep, excl. self = 0) — `/welcome` doesn't link to it; reachable by URL only (product gap, needs an entry point). Static Server Component → **Areas 2/4/5 N/A** (no store, no queries, no BE — `page.tsx:12`). 🟡 Area 1: Zones table proposes `CustomerTopNav` reuse but code rolls a bespoke `<nav>` (`page.tsx:20-36`) — reuse infeasible (`CustomerTopNav` is `'use client'` + cart icon + `onBack`, `CustomerTopNav.tsx:1,7,29`); hero + gallery + founder are intentional **placeholders** (`IntroHero.tsx:11-17`, `IntroGallery.tsx:9` = **6** static tiles not 3 swipeable, `IntroStory.tsx:36-42`); each zone richer than ASCII (extra Badge/h2/subtitle). 🟢 hours/phone/map/CTA match; map address fuller (`IntroMap.tsx:9`); **deliberately top-level (NOT `(shop)`)** so no `ClientBottomNav` collision (`page.tsx:13`). No code bugs. Screenshots ⏳ (stack down). | ⏳ open |
| staff_register | 2026-06-22 | experience_claude.md_system_1_test_iphon2_change_code | 1 | 5 | 6 | [EN](staff/staff_register/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](staff/staff_register/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](staff/staff_register/COMPARISON_VISUAL_MOCKUP_VI.md) | **No 🔴 doc-vs-code contradiction — high-fidelity, source-faithful set (peer of customer_welcome/customer_profile/admin_combos).** Lone 🔴 is a **CODE bug the doc already documents** (`REGISTER_BUGS.md` Bug 1, re-verified): public `POST /auth/register` (`main.go:169`, outside `protected` group `:173-174`) → `auth_service.go:219` hardcodes `role="cashier"` → `auth_repo.go:88` bakes `is_active=1`; FE `redirectByRole.customer:'/menu'` (`register/page.tsx:28`) is **dead** (BE always returns cashier → always `/pos`). All FE ASCII line-cites EXACT (`page.tsx:62-127`); handler `auth_handler.go:142`, service `auth_service.go:205`, repo `auth_repo.go:86` all exact. Doc drift = `_be.md` `main.go` route lines stale **+13** (route `:156→:169`, group `:154→:167`, protected `:159-164→:173-174`); `_be.md` Flag 2's "wireframe shows Họ tên" is **itself stale** (wireframe `staff_register.md:43` already states no Họ tên field); stale provenance branch. `Register` uses `errors.Is(sql.ErrNoRows)` `:210` — NOT the admin_ingredients 404→500 trap. Area 2 N/A (single form). Screenshots ⏳ (stack down). | ⏳ open |
| staff_pos | 2026-06-23 | experience_claude.md_system_1_test_iphon2_change_code | 4 | 9 | ~36 | [EN](staff/staff_pos/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](staff/staff_pos/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](staff/staff_pos/COMPARISON_VISUAL_MOCKUP_VI.md) | **The entire doc-set was traced on the PRE-"Đặt hộ" branch, so its central assumption (every POS order has `table_id=NULL` + `customer_name='Khách tại quán'`) is now FALSE.** **🔴 #1:** the whole **table-picker / "Đặt hộ"** feature is live (`TablePickerModal` `pos/page.tsx:41-97`, "Chọn/Đổi bàn" `:246-251`, table chip `:242-245`, `?table_id=&table_name=` seeding `:107-108`, occupancy via `listTables`+`listLiveOrders` `:112-125`) but `staff_pos.md` omits it all and marks it `🔮 PLANNED`; handoff originates `TableList.tsx:357`. **🔴 #2:** POS now sends `table_id` (`:184`) + `customer_name = tableName ?? 'Khách tại quán'` (`:181`) → service runs busy-lookup + stores table (`order_service.go:270-273,302-303`), so `table_busy` CAN be true and the order shows in KDS/overview table-slot zones — invalidates `staff_pos_be.md §3`/Flag 3 + `_crosspage §5/§6`. **🔴 #3:** BE doc endpoint table omits 2 live endpoints — `GET /tables` (`admin.api.ts:167`) + `GET /orders/live` (`admin.api.ts:172`). **🔴 #4 (code bug, doc-documented, re-verified):** every POS order shows **"Đơn #undefined"** — `POST /orders` returns `{id, table_busy}` only (`order_handler.go:121`), page reads `order.order_number` (`:190,:200`), `order_number:string` (`order.ts:40`) → literal `undefined` (POS_BUGS Bug 1). 🟡 `<Suspense fallback={null}>` denied by `_loading.md §2` (`pos/page.tsx:31`); loading doc lists 2 of 4 queries; "Tạo đơn mới" orphans the order (Bug 2); POS bypasses `order-payload.ts` (Flag 2). 🟢 all `main.go` route lines stale ~+13 (`/orders` `:230→:243`, POST `:232→:245`, GET/:id `:236→:249`, `/products` `:168→:180`, `/categories` `:186→:198`, ws `:339→:352`). Screenshots ⏳ (stack down). | → P-FIX-4 |
| admin_categories | 2026-06-21 | experience_claude.md_system_1_test_iphon2_change_code | 1 | 3 | 13 | [EN](admin/admin_categories/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](admin/admin_categories/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](admin/admin_categories/COMPARISON_VISUAL_MOCKUP_VI.md) | **No 🔴 doc-vs-code contradiction — low-drift, source-faithful set (peer of admin_summary/admin_staff/admin_combos).** The lone 🔴 is a **FE CODE bug the doc already documents** (`CATEGORIES_BUGS.md` Bug 1 · `admin_categories.md` Flag 7 · `_be.md` Flag 7 · `SCENARIO` 09:38): manager sees red **"Xóa"** (`page.tsx:131-136`, no role check) but `DELETE /categories/:id` is admin-only (`AtLeast("admin")` `main.go:207-210`) → 403 → `onError` catch-all `'Không thể xóa danh mục'` (`page.tsx:69-76`, only 409 special-cased) → silent, mislabelled. Same class as A12 Training Bug 2 + A3 Products. **Area-5 agent's 3 raw 🔴 downgraded** (FE `Category` omits `description`+`is_active`; `createCategory`/`updateCategory` never send `description`) — by-design, doc-accurate Flags 1+3, not contradictions. **All FE line-cites EXACT** (menu `:52-56`, POS `:39-43`, ProductFormModal `:39-43`, AuthGuard `:23`, RoleGuard `:16-20`, page query `:22-26`); cosmetic-tabs concern re-confirmed (`ListProducts` `product_handler.go:42-43` reads no `category_id`). Doc drift: `main.go` route block stale **+14** (`catR` `:184→:198`, DELETE sub-group `:193-196→:207-210`) across `_be.md`/`admin_categories.md`/`CATEGORIES_BUGS.md`/`crosspage`/`SCENARIO`; stale provenance branch on all 6 files; off-by-1 (`:99-107→:98-107`, handler serialise `:187→:188`). Screenshots ⏳ (stack down). | ⏳ open |
| staff_cashier_payment | 2026-06-22 | experience_claude.md_system_1_test_iphon2_change_code | 2 | 6 | 7 | [EN](staff/staff_cashier_payment/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](staff/staff_cashier_payment/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](staff/staff_cashier_payment/COMPARISON_VISUAL_MOCKUP_VI.md) | **No doc-vs-code CONTRADICTION — exemplary source-faithful doc-set (peer of customer_checkout/combo_detail/admin_combos): it documents the code *including* its bugs.** Both 🔴 are CODE bugs the doc already documents (`PAYMENT_BUGS.md` Bug 1+2), re-verified: **🔴 #1** `POST /payments` returns thin `{id,pay_url,qr_code_url}` (`payment_handler.go:44-48`) but FE `Payment` expects `status`/`amount`/`method` (`page.tsx:16-23`) → `payment.status===undefined` kills the cash-success branch (`page.tsx:116`), the WS effect (returns early `:64`), AND the QR render guard (`:249`) → **screen goes blank after create for every method**; fix path exists (`GET /payments/:id` `main.go:270` serves full `db.Payment`). **🔴 #2** FE sends `method:'cod'` (`page.tsx:14,52`); BE binding `oneof=vnpay momo zalopay cash` (`payment_handler.go:25`) → cash (the default) always 400s. 🟡 dead `PATCH /payments/:id/proof` (Bug 3 — grep `proof` in be/ = 0 hits; only `POST ""`/`GET /:id`/3 webhooks `main.go:267-275`); no `isError` on `GET /orders/:id` → stuck "Đang tải…" (`page.tsx:137`); Flag 6 status-drift (`MarkOrderPaid` only `delivered→paid` `order_service.go:83-86`, error swallowed `payment_service.go:265-267`); WS `/ws/orders-live` no role gate (claims discarded `websocket/handler.go:40-47`). **Dead:** QR block + WS listener + proof upload (all gated by 🔴 #1). 🟢 `main.go` lines stale ~+13 (orders `GET /:id` `:236→:249`, `POST /payments` `:256→:269`, `GET /payments/:id` `:257→:270`, WS `/orders-live` `:339→:352`); stale provenance branch. **NOT in `(shop)` → no ClientBottomNav / no fixed-footer collision.** Area 2 N/A (no shared store; local useState). Screenshots ⏳ (stack down + bugs block all flows). | → P-FIX-9 |
| staff_kds | 2026-06-22 | experience_claude.md_system_1_test_iphon2_change_code | 3 | 5 | 22 | [EN](staff/staff_kds/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](staff/staff_kds/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](staff/staff_kds/COMPARISON_VISUAL_MOCKUP_VI.md) | **Source-faithful doc-set that documents the code *including* its bugs (peer of combo_detail/order_detail/admin_combos). Area 2 N/A — no Zustand/store, all local `useState`.** The **only** true doc-vs-code contradiction: **🔴 `crosspage §1` (`:128-129`) claims active `order_status_changed` → "Badge updates, stays on board"; code `kds/page.tsx:149-154` only DROPS the card when `status ∉ ACTIVE`, never mutates `o.status` → badge stale until 30s refetch/F5.** Other 🔴 are CODE bugs the doc already documents (re-verified): **Bug 1** tap-to-serve PATCHes 5-segment `/orders/:id/items/:id/status` empty body (`page.tsx:160-161`) — no such route, real one is `PATCH /orders/items/:id {qty_served}` (`main.go:263`, NOT `:250` as `_be.md` cites — `:250` is now `PATCH /:id/status`) → 404 every tap, item-serve dead; **WS security** `/ws` group has no middleware (`main.go:350-352`), `wsHandler` discards JWT claims (`handler.go:40`) → guest token subscribes `orders:kds`. **NEW code gap:** `maybeAutoReady` calls `repo.UpdateOrderStatus` directly (`order_service.go:744-745`), bypassing the `:553` `publishMonitorBroadcast` → customer `/tracking` queue doesn't re-sort on auto-ready. **Dropped a wrong agent 🔴** (picker JSX order — ASCII `:33-36` and code `:257-278`/`:280-304` agree, picker above buttons). **Resolved `_loading.md` ❓:** `(dashboard)/layout.tsx` is 4 lines `OrdersWSProvider` only — no AuthGuard/RoleGuard, /kds relies on api-client 401. Dead: `/ws/kds` (`main.go:351`, unused), 3 ignored `orders:kds` events (`items_added`/`item_cancelled`/`item_updated` `:516/642/696`), `deriveItemStatus` export. Doc highly accurate otherwise (serializer `table_name`/`item_status`/`created_by`; `flagged` never emitted; `validTransitions`; `filling` dropped grep=0; loading.md exact). Route lines stale ~+13. Screenshots ⏳ (stack down). | → P-FIX-5 |
| admin_task_board | 2026-06-24 | experience_claude.md_system_1_test_iphon2_change_code | 6 | 16 | 13 | [EN](admin/admin_task_board/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](admin/admin_task_board/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](admin/admin_task_board/COMPARISON_VISUAL_MOCKUP_VI.md) | **Behavioural docs (`_be`/`_crosscomponent`/`_crosspage`/`_loading`) source-faithful incl. all 4 documented bugs (peer of admin_combos); drift concentrated in the hand-drawn `admin_task_board.md` ASCII + one wrong `_loading.md` claim.** **🔴 #1 (code, doc-accurate):** task status write-once `pending` — `CreateStaffTask` hardcodes `'pending'` (`tasks.sql.go:16`), **no UPDATE** in `querier.go` (grep `UPDATE staff_tasks` in be/ = 0), complete route set is 3 lines (`main.go:320-322`), no overdue job → "Hoàn thành"/"Đang thực hiện"/"Quá hạn" KPIs + `completionRate` + `qualityScore` + `hasOverdue` **permanently 0/false** (Bug 1). **🔴 #2-4 DOC DRIFT (Area 1 wireframe):** Zone D KPI labels all wrong + phantom "Chờ làm" card (real: `Tổng công việc hôm nay·Hoàn thành·Đang thực hiện·Quá hạn` `page.tsx:89,93,99,104`); Zone C draws 1 control, code renders 4 (date/role/status/search `StaffTaskFilterBar.tsx:31-58`); Zone E draws 2 cols, code renders **7** incl. fabricated "Chất lượng ★" (`StaffTaskTable.tsx:64-71`, `QualityStars:29-39`=Bug 2). **🔴 #5 DOC DRIFT (loading):** `_loading.md` says table region blank during `statsLoading`; code falls to else branch → `<StaffTaskTable rows={[]}>` renders 7-col `<thead>` (`page.tsx:112-127`, `StaffTaskTable.tsx:62-73`). **🔴 #6 (code, cross-page; doc ❓ now confirmed):** todo-list "Cập nhật" creates a **duplicate** row — `handleModalSubmit` always `createTask.mutate` (`TodoPageClient.tsx:68,187`), no `updateTask` in fe/ (grep), button "Cập nhật" (`CreateEditTaskModal.tsx:187`) — same root as Bug 1. Bugs 2/3/4 (fabricated quality, FK→500, dead status filter) re-confirmed. **Drift:** `main.go` route lines +13 (tasks `:307-309→:320-322`, `/admin` gate `:294→:308`, staff-list cite `:280-282`→ wrong group, real `:294-295`); `_be.md` "four task queries"→**five** (omits `GetDailyTaskMetrics` `querier.go:42`). Dead: `page.tsx:52-55` status filter, `task_service.go:200-201` ErrNoRows-after-INSERT, `CreateTaskModal.tsx:103` `if(!open)`, `UpdateTaskPayload` type. Screenshots ⏳ (stack down). | → P-FIX-8.1/8.2 |
| admin_todo_list | 2026-06-24 | experience_claude.md_system_1_test_iphon2_change_code | 1 | 8 | 14 | [EN](admin/admin_todo_list/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](admin/admin_todo_list/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](admin/admin_todo_list/COMPARISON_VISUAL_MOCKUP_VI.md) | **No doc-vs-code CONTRADICTION — source-faithful 7-file set documenting the code *including* its bugs (peer of admin_combos/admin_task_board/customer_checkout). The lone 🔴 is a code bug the doc already documents in 3 places.** **🔴 BUG 1 (re-verified):** edit a task → **silent duplicate** — `handleModalSubmit` always `createTask.mutate` regardless of mode + never reads `editTask.id` (`TodoPageClient.tsx:61-80`); `mode={editTask?'edit':'create'}` (`:187`) only flips title + submit label to "Cập nhật"; **no `PATCH`/`DELETE /admin/tasks/:id`** (router = 3 task routes `main.go:320-322`); `UpdateTaskPayload` (`task.ts`) has no API fn; no delete button to undo. Doc-documented (`TODO_BUGS.md` Bug 1 · `_be.md` Flag 1 · `admin_todo_list.md` Flag 1) — same root as **admin_task_board** 🔴 #1/#6 (shared `staff_tasks` no-mutation bullet). **Bugs 2/3/4 re-confirmed (🟡, doc-documented):** status filter never sent (`getStaffTasks` builds `?staffId=&date=` only `admin.api.ts:286`; SQL no status predicate `tasks.sql:33-40`); date-range dead — single-day server `WHERE DATE(due_at)=?` (`tasks.sql:8,26,36`), `end_date` dropped (`TodoPageClient.tsx:32`); bad `staffId`→500 not 4xx (`task_service.go:200` `err == sql.ErrNoRows` not `errors.Is`, INSERT FK 1452→`ErrInternalError` `:203`). **❓ RESOLVED:** `qualityScore` **IS** returned by BE (`task_service.go:131,139` `rate/20.0`), just unrendered here (drop the `❓ UNVERIFIED` at `admin_todo_list.md:176`) — consumed by admin_task_board. **Dropped a wrong agent 🔴** (`TaskPriorityBadge` "unused" — page doc correctly cites `TaskStatusBadge`, used `TodoPageClient.tsx:14,143`). Behavioural docs exemplary: every cache key (`['admin','tasks',staffId,dueDate]`+`['admin','tasks','stats']` `useTodoTasks.ts:29-30`), staleTime (15/30/60s), `enabled:!!staffId` `:11`, per-staff row→`setFilters` `:131`, branch ranges `:93-154`/`:157-183`, 7-block skeleton, both empty-copy strings EXACT. **Drift = stale BE line-cites only:** task routes `307-309→320-322`, staffR `280-282→293-294`, adminR `294-309→307-308`, `tasks.sql:48→48-49`, `012_staff_tasks_v2.sql:6→7`, `useTodoTasks.ts:12→11`; ASCII `HĐ`→`Hành động`, edit label `Cập nhật`+`Kết thúc (tuỳ chọn)` undrawn; stale provenance branch on all 7 files. **Dead:** `UpdateTaskPayload`, `notes` field (schema/reset/payload but no `<textarea>`), `qualityScore` here, `staff_tasks.deleted_at`/`completed_at` never written, `performance_score:0` stub. Area 2 = TQ cache + parent local state (no Zustand). Screenshots ⏳ (stack down). | → P-FIX-8.2 |
| staff_login | 2026-06-23 | experience_claude.md_system_1_test_iphon2_change_code | 0 | 8 | 38 | [EN](staff/staff_login/COMPARISON_DOC_VS_CODE_DETAILED.md) · [VI](staff/staff_login/COMPARISON_DOC_VS_CODE_DETAILED_VI.md) · [Mockup](staff/staff_login/COMPARISON_VISUAL_MOCKUP_VI.md) | **No 🔴 doc-vs-code contradiction — faithful, source-traced set (peer of staff_register/staff_cashier_payment/customer_combo_detail); it documents the code *including* its FE bugs.** Area 2 N/A (single RHF form). Every `_be.md` handler/service/SQL/Redis/JWT line EXACT (`Login` `auth_service.go:69-142`; rate-limit `:346-365` fail-open; is_active-after-bcrypt `:90`; max-5-sessions `:104-112`; `GetStaffByUsername` `auth.sql.go:138-165`; JWT 24h/30d `jwt.go:31-48`; errors `errors.go:24-26`). **Two ❓ resolved:** (1) **`/kds` has NO client-side guard** — `(dashboard)/layout.tsx:1-5` is OrdersWSProvider only; `kds/page.tsx`/`kds/layout.tsx` have no AuthGuard/RoleGuard (grep=0) → relies solely on api-client 401 (`api-client.ts:40-54`); doc §2 assumed `RoleGuard(CHEF)`. The doc's *other* guard guesses are CORRECT: `/pos`=`AuthGuard`+`RoleGuard(CASHIER)` (`pos/page.tsx:29-30`), `/admin`=`RoleGuard(MANAGER)` (`(dashboard)/admin/layout.tsx:29-30`), `/cashier/payment/[id]` same (`:39-40`). (2) **logout wired only on the CUSTOMER `MenuHeader.handleLogout`** (`MenuHeader.tsx:15-22`, calls `clearAuth()` `:21` after `logout()`); no staff-surface logout button anywhere. **Two doc-wording fixes:** `LOGIN_BUGS` Bug 2 says "`AUTH_001` referenced nowhere in be/" — wrong, it's emitted by `middleware/auth.go:37,45,47` for protected routes (just never by `POST /auth/login`, so the FE login branch `login/page.tsx:52` is still dead); `_be.md` Flag 4 SameSite — comment `auth.go:98` says Strict but `c.SetCookie` `:104` sets none, grep `be/` `SameSite`=only the comment → truly unset (browser default). **Both LOGIN_BUGS re-confirmed (code bugs, doc documents them):** Bug 1 FE Zod `password.min(6)` (`login/page.tsx:16`) vs BE `min=8` (`auth_handler.go:24`) → 6-7-char pwd 400s into generic msg; Bug 2 dead `AUTH_001` branch + no `RATE_LIMIT_EXCEEDED`/`INVALID_INPUT` branch. `User` type omits `email` entirely (`types/auth.ts:11-17`). Visual: 1 zone (login card) — wireframe conflates the Zod-min-6 slot with the API error. `main.go` routes stale **+13** (group `:154→:167`, `POST /login` `:155→:168`, protected `:160-163→:173-177`); stale provenance branch. Screenshots ⏳ (stack down). | ⏳ open |

## Cross-Page Concerns
<!-- findings that touch >1 page: a shared store field, a shared hook/SSE, a shared endpoint, or a bug root.
     Name the pages + the shared file:line + whether it's a doc drift or a code bug + where it's logged. -->

- **Shared cart store field `orderNote` is written on `/menu` (OrderSummary) but the QR-confirm POST path
  ignores it (code bug root, touches `/menu` + `/checkout`).** `OrderSummary` (rendered on `/menu`) writes
  `cart.orderNote` via `setOrderNote` (`OrderSummary.tsx:62,300-304`) and the field is **persisted**
  (`partialize` whitelist, `cart.ts:158`). The QR-path `TableConfirmModal` instead keeps a **local**
  `useState('')` note and POSTs that (`TableConfirmModal.tsx:15,23`), so whatever the customer typed in the
  order summary is dropped from the order. The online `/checkout` path should be checked for the same gap on
  any future checkout run. **Code bug** (seed the modal note from `cart.orderNote`, or drop the duplicate
  textarea); logged in `customer_menu/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #1. Re-verify on any
  `/checkout` run.
- **Client-side guard topology across the staff/admin shells — `/kds` is the only protected route with
  NO `AuthGuard`/`RoleGuard` (security gap + doc-drift root).** Mapped on the **staff_login** run while
  resolving its `_crosspage_dataflow.md` §2 ❓ guard table: `RoleGuard`+`AuthGuard` exist on **`/pos`**
  (`pos/page.tsx:29-30`, `minRole=CASHIER`), **`/admin/*`** (`(dashboard)/admin/layout.tsx:29-30`,
  `minRole=MANAGER`), and **`/cashier/payment/[id]`** (`cashier/payment/[id]/page.tsx:39-40`,
  `minRole=CASHIER`) — but **`/kds` has neither**: `(dashboard)/layout.tsx:1-5` is just an
  `OrdersWSProvider`, and `kds/page.tsx`/`kds/layout.tsx` contain no guard (grep=0). The KDS board's
  only protection is the api-client 401 interceptor firing after its first data query (`api-client.ts:40-54`)
  + the BE role checks. This is the **same `/kds`-unguarded fact** the **staff_kds** run noted ("layout is
  4 lines, OrdersWSProvider only, relies on api-client 401"), now confirmed as the outlier of a 4-route
  set. **Doc drift** (staff_login §2 assumed `RoleGuard(CHEF)` for /kds) **+ a code/security decision**
  (add `RoleGuard(CHEF)` to /kds?) needing a MASTER row. Logged in
  `staff_login/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #1. Re-verify on any future staff-shell run.
- **`logout()` is wired ONLY on the customer `MenuHeader` — no staff surface has a logout button
  (doc-drift + UX gap).** `logout()` (`auth.api.ts:12-13`) has exactly one caller repo-wide:
  `features/menu/components/MenuHeader.handleLogout` (`MenuHeader.tsx:15-22`), which calls `clearAuth()`
  (`:21`) after `await logout()`. Grep finds no logout call on `/pos`, `/kds`, `/admin`, or `/cashier`.
  So `staff_login_crosspage_dataflow.md` §7's staff-logout narrative is theoretical today — a logged-in
  cashier/chef/admin has no UI to end their session (only the 30-day cookie TTL or max-5-session eviction
  `auth_service.go:104-112` clears it). **Doc drift, resolves §7's ❓**; logged in
  `staff_login/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #2. Re-check when/if a staff logout control is added.
- **`AUTH_001` IS a live BE code (emitted by `middleware/auth.go:37,45,47`), contradicting `staff_login/LOGIN_BUGS.md`
  Bug 2's "referenced nowhere in be/".** It is the middleware's response for missing/expired/invalid Bearer
  tokens on **every protected route** (the 401 the `api-client` refresh interceptor reacts to). It is **never**
  returned by `POST /auth/login`, so the FE login error-map branch on `AUTH_001` (`login/page.tsx:52`) is dead
  — but the doc's phrasing is wrong. **Doc fix** (staff_login). Worth knowing for any page whose 401-handling
  references `AUTH_001`. Logged in `staff_login/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #3.

- **Shared auth store `auth.store.ts` (no-persist) + public `POST /auth/register` — staff_register is a
  WRITER, every staff surface is a reader (code bug root).** `useAuthStore` (`auth.store.ts:12-18`, **no
  `persist`** → memory-only, dies on F5) is written by `setAuth` on a successful register
  (`register/page.tsx:49`) and read by `/pos`, `/kds`, `/cashier/*`, `/admin/*` shells for
  `Authorization: Bearer`. The **public `POST /auth/register`** (`main.go:169`, outside the `protected`
  group `:173-174`, no `authMW`) unconditionally mints a `role="cashier"` + `is_active=1` staff account
  (`auth_service.go:219`, `auth_repo.go:88`) — anyone can self-mint POS/staff access; the FE
  `customer:'/menu'` redirect branch (`register/page.tsx:28`) is **dead** (BE always returns cashier →
  always `/pos`). **Code bug needing a product/security decision** (delete route · make `customer`-only ·
  or gate `AtLeast("manager")`); logged in `staff_register/REGISTER_BUGS.md` Bug 1 +
  `staff_register/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #1. The **F5-on-`/pos` silent-re-auth**
  path (does the app shell call `/auth/refresh` reading the surviving httpOnly cookie?) is `❓ UNVERIFIED`
  here — owned by `api-client`/login shell. Re-verify both on the **staff_login** run (shares the same
  store, the refresh cookie, and `issueTokens`/max-5-sessions in `auth_service.go:228-244`).
  **staff_login run (2026-06-23) RESOLVED the ❓:** the shell **does** silently re-auth on F5 via the
  surviving cookie — `api.create({withCredentials:true})` (`api-client.ts:8`) sends the path-scoped
  `refresh_token`; a 401 fires `POST /auth/refresh` → `setAccessToken` → retry (`api-client.ts:40-55`).
  On guarded routes `AuthGuard.getMe()` (`AuthGuard.tsx:14-21`) drives it; on `/kds` (unguarded — see
  next bullet) the page's first data query drives the same refresh. The no-persist store
  (`auth.store.ts:12-18`) + public cashier self-mint (`auth_service.go:219`) confirmed unchanged.
- **Shared settings store `settings.ts` — customer_settings is the ONLY writer, customer_menu is the
  reader (root of customer_menu 🔴 #1).** `useSettingsStore` (`store/settings.ts`, persisted via
  `CUSTOMER_SETTINGS='customer-settings'`) holds `customerName` + `tableLabel`. The **customer_settings**
  page is the sole place that calls `setTableLabel` (`menu/settings/page.tsx:15`); `setCustomerName` is
  also called by `useCustomerProfile.ts:51` (from a profile fetch) but `tableLabel` is **never set
  automatically** — grep confirms `setTableLabel` has no other caller. Readers: **customer_menu**
  `MenuHeader.tsx:28` (`tableLabel`) + `CartDrawer.tsx:77-79` (`customerName`+`tableLabel`). This is
  exactly why customer_menu's 🔴 #1 holds — `MenuHeader` shows `tableLabel` from this store, which stays
  **blank after a QR scan** because nothing but this manual settings page ever fills it. **No drift on
  customer_settings; the shared-store coupling is the root cause logged in customer_menu's headline #1.**
  Re-check on customer_menu + customer_checkout future runs.
  **customer_profile note:** the `setCustomerName(result.name)` writer at `useCustomerProfile.ts:51`
  lives inside `useUpdateProfile.onSuccess`, which **never runs** — the `PUT /customer/profile` it
  guards always 404s (no `/customer` BE group, `main.go:161`). So profile's intended cross-page write
  to `settings.customerName` is **dead today**; `customer_settings` remains the only live writer of the
  store. Re-check when/if the customer-profile backend is built. **Code bug (documented), not doc
  drift** — logged in `customer_profile/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #1.
- **Shared cart→order builder `order-payload.ts:27-58`** (`buildOrderItemsPayload`) — used by both
  **customer_combo_detail** (combo handoff) and **customer_menu** (CartDrawer/checkout). It is the
  single converter; a combo added on `/menu/combo/:id` rides it unchanged. **No drift** — both pages'
  docs describe it correctly; flagged here only because it's a shared dependency to re-check on either
  page's future runs.
- **Shared cart store `cart.ts` `partialize:153`** — persists only `orderNote` + `activeOrderId`;
  `items[]` is session-only. Affects **customer_combo_detail** (combo lost on F5 before submit) and
  **customer_menu** (same), and **customer_table_qr** (the airlock writes `tableId`/`tableName` here —
  also excluded from `partialize`, so an F5 anywhere downstream severs the QR session, by design).
  Doc-accurate on all three. Note the harmless mismatch: `STORAGE_KEYS.CART_CONFIG
  = 'cart-config-v3'` (`storage-keys.ts:6`) vs persist `version: 5` (`cart.ts:129`) — a frozen literal,
  not a code bug.
- **Dead `TABLE_HAS_ACTIVE_ORDER` error code + unenforced one-active-order rule (code bug, root)** —
  `ErrTableHasActiveOrder` (`be/internal/service/errors.go:30`) is defined but **never returned
  anywhere in `be/`** (grep → only the definition). Three FE files special-case it and are therefore
  **all dead**: **customer_table_qr** (`table/[tableId]/page.tsx:36`, re-scan never rejoins existing
  order), **customer_checkout** (`(shop)/checkout/page.tsx:79`), and the POS table grid
  (`app/TableGrid.tsx:107`). `CreateOrder` (`order_service.go:256-275`) treats a busy table as an
  informational `tableBusy` flag and returns `201`+`table_busy` (`order_handler.go:121`), so multiple
  concurrent orders per table are allowed — BUSINESS_RULES §2.3 is **unenforced in code**. **Code bug
  needing a product decision** (BE auto-rejoin vs. FE delete dead branches); logged in
  `customer_table_qr/TABLE_QR_BUGS.md` Bug 1 + `customer_table_qr/COMPARISON_DOC_VS_CODE_DETAILED.md`
  headline #1. Re-check on staff_pos future run. **customer_checkout run (2026-06-22) re-confirmed the
  grep (sole hit = the `errors.go:30` definition) and added a sharper angle:** on `/checkout` the dead
  branch is *doubly* harmful — `onError` (`page.tsx:79-84`) can never fire **and** `onSuccess`
  (`page.tsx:61-76`) never reads `table_busy` from the `201` body, so checkout **silently creates a
  duplicate order with no notice** (the menu `TableConfirmModal` at least toasts). Logged as
  `customer_checkout` 🔴 #3.
- **Recurring `_be.md` route-line drift in `be/cmd/server/main.go`** — **customer_combo_detail**
  (`GET /products` `:168→:181`, `GET /combos` `:216→:229`), **admin_summary** (`adminR` block
  `:294→:307`, `authMW` `:151→:164`), **customer_product_detail** (`/products` group
  `:167→:180`, `GET /:id` `:169→:182`), **customer_table_qr** (`/auth/guest` route
  `:158→:171`, `protected` group `:159-164→:173-177`, CORS `:126→:133`), and now **admin_staff**
  (`/staff` group `:280-281→:293-294`, admin `DELETE` sub-group `:287-290→:300-304`; plus
  `staff_service.go` `:203→:204`/`:236-238→:237-239` and the **transposed** repo pair
  `CountAdmins`↔`SoftDeleteStaff` `:240`/`:253`), and now **admin_combos** (combos group
  `:215-227→:228-240`, GET `/combos` `:216→:229`, POST/PATCH sub `:218-222→:231-235`, admin DELETE sub
  `:223-227→:237-239`, products group `:167-182→:180-195`, `/products/all` `:173→:186`) and now **staff_register** (`/auth/register` route `:156→:169`, `/auth` group `:154→:167`, `protected` sub-group `:159-164→:173-174` — all +13; handler/service/repo cites all exact) and now **admin_categories** (`catR` group `:184→:198`, manager POST/PATCH `:188-191→:201-205`, admin `DELETE` sub-group `:193-196→:207-210`) and now **admin_toppings** (toppings group `:200-212→:213-225`, `/products/all` `:173→:186`, `prodR` `:167→:180`) and now **admin_ingredients** (route block `:293-313→:307-328`; `adminR` group `:307`, ingredient routes `:312-318`, admin DELETE sub-group `admIngR` `:323-328`) and now **customer_checkout** (`/orders` group `:230-237→:243-249`: group `:243`, `authMW` `:244`, `POST "" :245`, `GET /:id :249`; plus `order_service.go` combo header `:398-412→:402-411` and off-by-one `:116-120→:115-120`) and now **staff_cashier_payment** (orders `GET /:id` `:236→:249`, payments group `:254-257→:267-270` with `POST ""` `:256→:269` + `GET /:id` `:257→:270`, payments incl. webhooks `:254-262→:267-275`, WS group `:337-339→:350-352` with `/orders-live` `:339→:352`; plus off-by-one `completePayment` `:252-273→:252-274`) and now **staff_login** (`/auth` group `:154→:167`, `POST /auth/login` `:155→:168`, `protected` sub-group `:160-163→:173-177` with `/logout` `:175` + `/me` `:176` — all +13; handler/service/SQL/JWT/errors cites all exact) all cite stale `main.go`/Go line numbers because the
  files grow above their route block over time. **Doc drift, not a code bug** — but a systematic one: any page
  whose `_be.md` cites `main.go` route lines should re-verify them on each run. Consider citing the
  route *group* + handler name instead of an absolute `main.go` line where possible.
- **Shared admin-only DELETE sub-group `admIngR` (`main.go:323-328`) wraps TWO routes across two pages.**
  Despite the `admIngR` name it gates both `DELETE /admin/ingredients/:id` (**admin_ingredients** endpoint 6)
  and `DELETE /admin/training/guides/:id` (**admin_training**). **admin_summary** already noted its `_be.md`
  omits the 2nd DELETE; **admin_ingredients**'s `_be.md` implies the sub-group is ingredient-only. **Doc
  drift, not a code bug** — re-verify the sub-group membership on the admin_training run; consider renaming
  the var or documenting both members.
- **Root error-mapping pattern: `%w`-wrapped `sql.ErrNoRows` + service `== sql.ErrNoRows` (not `errors.Is`)
  silently downgrades 404→500 (code bug, likely repo-wide).** On **admin_ingredients**, `GetIngredientByID`
  wraps with `fmt.Errorf("...: %w", err)` (`ingredient_repo.go:147`) but `IngredientService.GetIngredient`
  tests `err == sql.ErrNoRows` (`ingredient_service.go:69`); since `handleServiceError`
  (`be/internal/handler/respond.go:24-36`) only maps `*service.AppError` via `errors.As` and has **no
  `sql.ErrNoRows` fallback**, a wrapped not-found returns `500 COMMON_002` instead of the documented `404`
  (DELETE escapes it — `SoftDeleteIngredient` returns raw `sql.ErrNoRows`, `ingredient_repo.go:216`). The
  `==`-vs-`errors.Is` comparison against a wrapped sentinel is a pattern to grep for on every other admin
  CRUD page (**admin_categories**, **admin_toppings**, **admin_combos**, **admin_products**): any `_repo.go`
  that wraps `sql.ErrNoRows` while its `_service.go` checks it with `==` shares this 404→500 bug. Logged in
  `admin_ingredients/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #3.
- **Shared public `GET /categories` + Redis `categories:list` — admin_categories is the WRITER, 3
  surfaces are readers.** Every category write on **admin_categories** (`product_service.go:365-427`)
  calls `invalidateProductCaches(ctx,"")` (`:709-717`) → `Del`s `categories:list` **and** `products:list`
  (the latter because each product embeds `category_name` via `enrichProduct` `:627-661`). Readers of the
  **same public `GET /categories`** (`main.go:199`, no auth): **customer_menu** CategoryTabs
  (`menu/page.tsx:52-56`, `staleTime 5m`), **staff_pos** CategoryTabs (`pos/page.tsx:39-43`, `5m`), and
  **admin_products** ProductFormModal dropdown (`ProductFormModal.tsx:39-43`, `60s`). No SSE/WS, no
  localStorage — downstream pages refill only on their own `staleTime` expiry. **No drift — all three
  pages' docs describe this correctly.** Note also the **cosmetic-tabs** concern intersects here:
  `GET /products` ignores `category_id` (`ListProducts` `product_handler.go:42-43` reads no params), so
  CategoryTabs filter client-side only (already logged in BE_DOC_TRACKER / customer_menu Flag 1). Shared
  catalog contract to re-verify on admin_products, customer_menu, staff_pos future runs.
- **Shared Redis `toppings:list` + `products:list` + uncached `GET /products/all` — admin_toppings is a
  WRITER, customer/POS catalog pages are READERS, and `product:<id>` is the asymmetric stale outlier
  (code gap, doc-confirmed).** Every topping write on **admin_toppings**
  (`POST`/`PATCH`/`DELETE /toppings`) calls `invalidateToppingCaches` → `Del("toppings:list",
  "products:list")` (`product_service.go:719-721`) but **never** `Del`s `product:<id>` (the per-detail
  key built at `:213`, TTL `productCacheTTL=5m` `:21`). So a topping price/availability edit reaches
  **customer_menu** (C1) and **staff_pos** (S4) on next `GET /products` fetch, but **customer_product_detail**
  (C4, the only reader of `product:<id>`) serves a **stale topping for up to 5 min**. The product
  topping-picker on **admin_products** (A3) is the *other* writer that triggers the same staleness. Also
  shared: the **uncached manager+ N+1 `GET /products/all`** (`main.go:186`, `ListAllProducts`
  `product_service.go:194-209`) is fetched by **both admin_toppings** (to render the "Áp dụng cho sản
  phẩm" chips) **and admin_products**. **No drift — admin_toppings docs describe all of this correctly**
  (`_be.md` Flag 2 + `_crosspage_dataflow.md` §2.3); the `product:<id>` asymmetry is a **code-quality
  gap needing MASTER registration to fix** (Del `product:<id>` on topping writes). Re-check on
  customer_product_detail + admin_products future runs.
- **Admin-only `DELETE` button rendered to managers → silent mislabelled 403 (shared FE bug root).**
  **admin_categories** ships it (`page.tsx:131-136` renders "Xóa" with no role check; `DELETE
  /categories/:id` is `AtLeast("admin")` `main.go:207-210`; `onError` only handles 409 `page.tsx:69-76`)
  — **same class** as **admin_training** A12 Bug 2 and **admin_products** A3 (admin-only `DELETE` shown
  to manager+). One root, one fix pattern (hide/disable the destructive button for `role !== 'admin'`, or
  add an honest 403 branch). **Code bug** logged in `admin_categories/CATEGORIES_BUGS.md` Bug 1 +
  `COMPARISON_DOC_VS_CODE_DETAILED.md` headline #1; recommend bundling all three into one ALIGNed FE task.
- **Shared `combos:list` Redis cache + public `GET /combos` endpoint — admin_combos is the WRITER, the
  customer catalog pages are READERS.** Every combo write on **admin_combos**
  (`POST`/`PATCH`/`DELETE /combos`) calls `invalidateComboCaches` → `Del("combos:list")`
  (`product_service.go:723-724`), the **same** key + endpoint read by **customer_menu** ComboSection (C1)
  and **customer_combo_detail** (C5, which over-fetches the whole list and finds by id client-side). The
  list is rebuilt from `ListCombosAvailable` (`product_service.go:505`, `is_available=1` only) — so a
  combo admin_combos can't hide (Bug 1) is equally always-on at /menu. Pull-only, no SSE/WS. **No drift —
  all three docs describe this correctly**; flagged as a shared contract to re-verify on customer_menu's
  future run. The four combos **code bugs** (available-only list, PATCH nulling image/category,
  non-tx item inserts, create-validation gap) are logged in `admin_combos/COMBOS_BUGS.md` +
  `admin_combos/COMPARISON_DOC_VS_CODE_DETAILED.md` — already doc'd, need MASTER registration to fix.
- **Global TanStack `staleTime: 60s` lives at `fe/src/lib/providers.tsx:8`, NOT `fe/src/app/providers.tsx`
  (doc-citation drift, several pages).** `admin_combos`'s `_loading.md`/`_crosspage_dataflow.md`/`SCENARIO`
  cite `providers.tsx:8` (the SCENARIO spells the wrong dir `fe/src/app/providers.tsx:8`). The line + value
  are correct; only the directory is wrong. Any page-doc that cites `providers.tsx` for the global
  staleTime should point at `fe/src/lib/providers.tsx:8`. **Doc fix, not a code bug.**
- **Shared customer shell `(shop)/layout.tsx:11-12` renders `ClientBottomNav` (`fixed bottom-0 z-20`)
  on EVERY `(shop)` route** — affects **customer_product_detail** (a 🔴: the page's own `CTAFooter`
  is also `fixed bottom-0` with no z-index, `CTAFooter.tsx:12`, so the nav overlaps the CTA) and
  potentially any other shop page that adds its own fixed bottom bar. **Code bug on
  customer_product_detail; a layout invariant to check** on every shop page whose comparison run finds
  a sticky footer (checkout, order detail). Logged in
  `customer_product_detail/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #1. **Second confirmed instance:
  customer_favourites** has TWO offending footers — list `FavouritesFooter.tsx:12` and save
  `save/page.tsx:103`, **both** `fixed bottom-0 z-20` (here the page footers DO set `z-20`, but the nav
  is the later sibling in `(shop)/layout.tsx:10-13`, so equal z-index → nav still paints over the list
  CTA "Thêm tất cả vào giỏ hàng" and the whole save button row). Logged in
  `customer_favourites/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #2. **Third confirmed instance
  (customer_checkout run, 2026-06-22):** the checkout submit bar is `fixed bottom-0 left-0 right-0`
  with **no z-index at all** (`checkout/page.tsx:203`) — worse than favourites, which at least sets
  `z-20` — so the `z-20` nav (later sibling, `(shop)/layout.tsx:12`) unambiguously paints over the
  **"Đặt hàng · {total}" primary CTA**, a checkout-blocking bug. The checkout wireframe draws the two
  bars cleanly stacked (`customer_checkout.md:43-45`), so this is **both** a code bug and doc drift.
  Logged in `customer_checkout/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #1. **Pattern:** any
  `(shop)` page with a `fixed bottom-0` bar must offset above the ~72px nav (`bottom-[72px]`)
  regardless of z-index. Re-check on customer_order_detail's future run (last sticky-footer shop page).
- **Shared `staff` row + `GET /staff` list + `auth:staff:<id>` cache — admin_staff is the writer, 4
  surfaces are readers.** A write on **admin_staff** (`staff_service.go` endpoints 3-6) ripples to:
  (1) the **auth middleware** (`auth.go:55` → `IsStaffActive` `auth_service.go:315-334`) — a
  deactivate/delete `Del`s `auth:staff:<id>` for immediate lockout; (2) **login** (`GetStaffByUsername`
  + `is_active`); (3) the **admin_todo_list** (`TodoPageClient.tsx:37`) and **admin_task_board**
  (`CreateTaskModal.tsx:41`) assignee dropdowns (same `GET /staff`, filter `deleted_at IS NULL` only —
  so a *deactivated* staff is still assignable, doc Flag); (4) **admin_summary** staff-performance
  (different endpoint, same rows). **No drift — all doc-accurate**, but the `GET /staff` shape +
  `is_active`/`deleted_at` semantics are a shared contract to re-verify on admin_todo_list,
  admin_task_board, and staff_login future runs. Pull-only (no SSE/WS for staff).
- **Shared live-orders WS hub `useOverviewWS.ts` + `OrdersWSContext` (channel `orders:kds`)** — the
  same channel feeds **admin_overview** AND **staff_kds** (both subscribe `orders:kds`,
  `websocket/handler.go:23`). `useOverviewWS.ts:52,67` carry **dead branches** `order_updated` /
  `order_completed` that the BE never publishes (BE emits only `order_status_changed` /
  `order_cancelled` / `payment_success` / `item_*` — grep `order_service.go`/`payment_service.go`).
  **Code cleanup**, logged in `admin_overview/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #3 — re-check
  when staff_kds gets its run (it may share the same dead-event assumption). **staff_kds run
  (2026-06-22) confirms:** the KDS's OWN switch (`kds/page.tsx:117-155`) does NOT carry the
  `order_updated`/`order_completed` dead branches — only `useOverviewWS.ts:52,67` (admin) does, so the
  dead-branch cleanup is admin_overview-only. BUT the KDS shares the *other* gap: the three events
  `items_added`/`item_cancelled`/`item_updated` ARE published to `orders:kds`
  (`order_service.go:516/642/696`) and the KDS silently ignores all three (no `case`) — added/removed
  items don't live-update the board. Also re-confirmed `/ws/kds` (`main.go:351`) is dead (identical to
  `/ws/orders-live`, no FE connects) and the `/ws` group has **no role gate** (claims discarded
  `handler.go:40`) — same security root as admin_overview. **NEW (code gap, customer_tracking root):**
  `maybeAutoReady` (`order_service.go:744-745`) advances status via `repo.UpdateOrderStatus` directly,
  so it does NOT fire the `:553` `publishMonitorBroadcast` that the explicit `UpdateOrderStatus`
  service path runs → when the kitchen auto-readies an order (all items served), the customer
  **/tracking** queue + ETA do NOT re-sort. Re-check on customer_tracking's next run. Logged in
  `staff_kds/COMPARISON_DOC_VS_CODE_DETAILED.md` Area 3 + action #5.
- **`payment_success` event + WS `/ws/orders-live` are a shared cross-page contract — staff_cashier_payment
  is the sole ACTOR, KDS/POS/admin-floor are passive receivers; the WS has NO role gate (code bug, root).**
  `completePayment` publishes `{"type":"payment_success","order_id":<id>}` to the **`orders:kds`** channel
  (`payment_service.go:270-271`) — the **same** channel `KDSHandler` (`/ws/kds`) and `LiveHandler`
  (`/ws/orders-live`) both subscribe (`websocket/handler.go:18,23`, registered `main.go:351-352`). Only the
  **staff_cashier_payment** screen acts on it (toast→print→`/pos`, `page.tsx:88-92`); **staff_kds**,
  **staff_pos**, and **admin_overview** receive and silently discard it (their `useOverviewWS`/KDS handlers
  have no `payment_success` branch — same dead-branch family already logged for `useOverviewWS.ts`). A change
  to the event shape or channel name breaks all four surfaces — **Flag 4, deployment-coupling, owner decision.**
  Separately, **`/ws/orders-live` has no role gate**: `wsHandler` validates `?token=` then **discards the
  parsed claims** (`websocket/handler.go:40-47`), so any valid JWT — including a customer guest token — can
  subscribe to the live order feed. **Shared security gap across staff_cashier_payment + staff_kds + staff_pos
  + admin_overview** (`/ws/kds` is identical). **Code bug needing a MASTER row** (add a role check after JWT
  parse). Logged in `staff_cashier_payment/staff_cashier_payment_be.md` Flags 4-5 +
  `COMPARISON_DOC_VS_CODE_DETAILED.md` Area ⑤. Re-check on staff_kds / staff_pos / admin_overview future runs.
- **`completePayment` status-drift when order is `ready` not `delivered` (code bug, touches the order status
  machine).** Payment is gated to `ready` OR `delivered` (`GetOrderForPayment` `order_service.go:50`), but
  `MarkOrderPaid` only advances `delivered → paid` (`order_service.go:83-86`) — for a `ready` order it returns
  an error that `completePayment` **swallows** with a warn-log (`payment_service.go:265-267`). Result: the
  `payments` row is `completed` but `orders.status` stays `ready` → drift. The same `validTransitions` /
  status machine is shared by **admin_overview** (already ships the `delivered→cancelled` 409 bug),
  **staff_kds**, **staff_pos**. Logged as `staff_cashier_payment` Flag 6. **Code bug needing a MASTER row**;
  re-check on any page that pays a `ready` order without first marking it `delivered`.
- **TOP epic / migration `017_drop_order_item_filling.sql` made `order_items.filling` obsolete repo-wide
  (doc drift, root file affected).** The column was added by migration 016 (OC epic) then **dropped** by
  017, which backfills nhân (thịt/mộc nhĩ) into `toppings_snapshot` as a topping entry. **customer_order_list**
  Flag D + the **root `CLAUDE.md`** "OC-4 read views render filling" narrative both still describe the
  pre-017 world. All code layers are now consistent via `toppings_snapshot` (no `filling` in DB, serializer
  `order_handler.go:358-370`, or FE `order.ts:15-27`). Any order-related doc (`staff_kds`, `staff_pos`,
  `customer_tracking`, `customer_order_detail`) that mentions `filling` is stale — re-check on their runs.
  **Doc fix only**, not a code bug.
- **Shared SSE hook `useOrderSSE.ts` event-name contract is incomplete (code bug, root).** The FE switch
  (`useOrderSSE.ts:83-123`) handles `order_init` / `order_status_changed` / `order_cancelled` /
  `item_progress` / `order_completed`, but the BE also publishes **three more** the switch ignores:
  **`item_cancelled`** on `DELETE /orders/items/:id` (`order_service.go:642`), **`item_updated`** on
  `PATCH /orders/items/:id/quantity` (`:696`), and **`items_added`** on `POST /orders/:id/items` (`:516`)
  — so a cancelled item, a quantity edit, and added dishes all fail to reflect live (reconcile only on
  reload). `useOrderSSE` drives the **customer_order_detail** standalone page (its primary user — the
  stepper that fires `item_updated` is unique to it, `page.tsx:361,385`) **and** the **customer_order_list**
  overlay; the sibling **`useOrderMonitorSSE`** (customer_tracking) already handles all three
  (`useOrderMonitorSSE.ts:84-86`), so the gap is `useOrderSSE`-specific. `order_init` is also **dead** (no
  publisher emits it). The BE order-event vocabulary (`publishOrderEvent`, `order_service.go:806-819`) is
  the shared contract to re-verify. **One re-fetch-on-unhandled-event fix closes all three gaps on both
  pages.** Logged in `customer_order_list/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #2 +
  `customer_order_detail/COMPARISON_DOC_VS_CODE_DETAILED.md` headlines #1-2 + `ORDER_DETAIL_BUGS.md`.
- **NEW (staff_pos run, 2026-06-23) — the POS "Đặt hộ" feature now makes POS orders carry a real
  `table_id`, breaking the repo-wide "POS == table-less" assumption (doc drift, touches 3 pages).**
  `TableList.tsx:357` (admin overview) deep-links `router.push('/pos?table_id=…&table_name=…')`; the POS
  page seeds that into state (`pos/page.tsx:107-108`) and sends `table_id` on `POST /orders` (`:184`)
  with `customer_name = tableName ?? 'Khách tại quán'` (`:181`). Server-side `CreateOrder` then runs the
  table-busy lookup (`order_service.go:270-273`) and stores the table (`:302-303`). Consequence: a POS
  "Đặt hộ" order is no longer `table_id=NULL` — it appears in **staff_kds** as "Bàn X" (`kds/page.tsx:214`)
  and in **admin_overview** table-slot/floor zones, and `table_busy` can be `true`. The **staff_pos**
  doc-set (`staff_pos_be.md §3`/Flag 3, `staff_pos_crosspage_dataflow.md §5/§6`) still asserts the old
  table-less model — logged as staff_pos 🔴 #1/#2. **Doc drift, not a code bug**; re-verify the table-slot
  rendering on the **staff_kds** and **admin_overview** future runs.
- **Order-item serializer extras (`item_status`/`created_by`/`flagged`) — staff_pos leg re-confirmed
  (2026-06-23).** Per the existing serializer-drift concern, this run verified `fe/src/types/order.ts`
  still carries `OrderItem.flagged` (`order.ts:26`) which the BE `orderJSON` never emits, while `orderJSON`
  emits `item_status`/`created_by` (`order_handler.go:358-388`) absent from the FE type. staff_pos reads
  orders via `listLiveOrders` + `GET /orders/:id` — same `Order`/`OrderItem` shape — so the reconcile
  (FE type ⇄ serializer) is still open and now confirmed on a 2nd reader page. **Doc/type drift.**
- **Dead `TABLE_HAS_ACTIVE_ORDER` + unenforced one-active-order — staff_pos angle (2026-06-23).** The
  earlier concern flagged staff_pos for re-check: on `/pos`, a picked occupied table is **disabled in the
  picker** (`pos/page.tsx:64,69`), so the cashier is steered away client-side — but if `table_id` is sent
  anyway, `CreateOrder` still only sets the informational `tableBusy` flag (`order_service.go:270-273`) and
  returns `201 {id, table_busy}`; the POS `onSuccess` **never reads `table_busy`** (`pos/page.tsx:187-191`,
  only `order_number`), so the rule remains unenforced here too. Same root as customer_table_qr /
  customer_checkout (logged there); staff_pos adds the "picker disables occupied tables" mitigation.
- **Order item serializer extras `item_status` + `created_by` + missing `flagged` (FE⇄BE contract drift).**
  The serializer (`order_handler.go:358-388`) emits `item_status` (`:367`, consumed by **staff_kds**, not by
  customer pages which re-derive via `deriveItemStatus()` `order.ts:9-13`) and `created_by` (`:384`), neither
  in FE `OrderItem`/`Order`; conversely FE `OrderItem.flagged` (`order.ts:27`) is **never emitted** by BE →
  always `undefined`. Touches every page that reads an order item (**customer_order_list**, **staff_kds**,
  **staff_pos**, **customer_tracking**). Reconcile the `OrderItem` type vs the serializer on a future run.
- **Order status machine `validTransitions` (`order_service.go:524-529`)** is the single source for
  every status-button gate across **admin_overview** (Zone B/D), **staff_kds**, **staff_pos** and
  customer tracking. **admin_overview** ships a real bug against it: a **Huỷ** button on `delivered`
  orders (`TableList.tsx:378-385`) that the machine rejects (`delivered: {paid}` only) → guaranteed
  `409`. Any other page offering a `delivered → cancelled` action shares this bug. Logged in
  `admin_overview/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #2.
- **Admin product writes → customer `/menu` + staff `/pos` via Redis `products:list` eviction (no
  push).** **admin_products** is the writer: every create/update/delete calls `invalidateProductCaches`
  (`product_service.go:709-717`) Del'ing `products:list`/`categories:list`/`product:<id>`; the admin
  table itself is uncached (`ListAllProducts` `:194-209`). **customer_menu** + **staff_pos** are
  readers of the public `GET /products` (`ListProductsAvailable`, `is_available=1`,
  `products.sql.go:467-470`) — they pick changes up only on next fetch (staleTime 5 min). **No SSE/WS
  for catalog** (grep-confirmed). ⚠️ **Surfaced this run:** the customer menu runs a *secondary*
  `['products-all']` query (`menu/page.tsx:59-63`) fetching `/products` **without** the `is_available`
  filter that **no admin write invalidates** on the FE side — a silent staleness gap to re-check on
  customer_menu + staff_pos future runs. All doc-accurate otherwise.
- **`is_available` is unsettable from the UI (code bug root, admin_products).** Bug 1
  (`PATCH /products/:id/availability` → `UpdateProduct`, `main.go:189`) makes the table badge always
  400; the form modal has no availability control (`ProductFormModal.tsx`, no `is_available` in
  schema/payload). The fix-target query `ToggleProductAvailability` (`products.sql.go:667-676`) +
  repo wrapper (`product_repo.go:82-84`) are dead (no service caller). Because `is_available` gates the
  customer menu + POS visibility, a sold-out dish **cannot be hidden** without a seed-flow recreate or
  direct DB edit. Logged in `admin_products/PRODUCTS_BUGS.md` #1 + headline #4. **Code bug needing a
  MASTER row** before any fix.
- **`order.status` SSE event type is never published — live status badge dead (code bug, root).** The
  monitor hook `useOrderMonitorSSE.ts:67` (driving **customer_tracking**) switches on
  `case 'order.status'`, but **no BE code emits that type** — every status transition publishes
  `type:"order_status_changed"` on `order:<id>` (`order_service.go:552,:745` via `publishOrderEvent`);
  `order.status` survives only as a stale doc-comment in `monitor_handler.go:17` (and the same wrong name
  in the FE-facing event list at `monitor_handler.go:17-19`). So `orderStatus` stays `null` and the badge
  silently falls back to the last `GET /orders/:id` snapshot (`page.tsx:44`), advancing only when an
  `items_*` event happens to force a refetch. The **same `/sse/order-monitor/:id` route is reused by the
  admin floor monitor** (`REALTIME_SSE.md:135`), and **customer_menu**'s
  `customer_menu_crosspage_dataflow.md:271,284` lists `order.status` as a real wire event — it documents
  the FE's broken expectation, not the wire. **Code bug, 1-line FE fix** (`case 'order_status_changed'`);
  logged in `customer_tracking/TRACKING_BUGS.md` Bug 1 +
  `customer_tracking/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #3. Re-check on any future admin
  floor-monitor / staff_kds run that reuses the SSE monitor.

- **`/introduction` is a built-but-orphaned route, and the `/welcome` ↔ `/introduction` link is missing
  on BOTH sides (product gap + status drift, touches customer_welcome + customer_introduction).** The
  `customer_introduction` run (2026-06-23) found the page fully built (`app/introduction/page.tsx` + 5
  `features/introduction/*` components) yet **unreachable** — `grep -rn "introduction" fe/src` (excl.
  self) = 0 inbound links. The page's own back-arrow goes → `/welcome` (`page.tsx:22-28`), but `/welcome`
  has **no** link → `/introduction` — exactly as the **customer_welcome** run already noted ("/introduction
  correctly absent" from the welcome footer, when it was believed `🔮 PLANNED`). Now that the page is real,
  that absence flips from "correct" to a **missing entry point**. Two coupled actions: (a) **doc fix** —
  flip status `🔮 PLANNED → ✅` in `customer_introduction.md:3` + `PAGES_INDEX.md:31`; (b) **code/product
  decision** — add the link from `/welcome` (register in `MASTER_TASK.md` first) or document the route as
  intentionally dark. Logged in `customer_introduction/COMPARISON_DOC_VS_CODE_DETAILED.md` headlines #1-2.
- **`/introduction` and `/welcome` both sidestep the `(shop)` `ClientBottomNav` fixed-footer collision by
  being TOP-LEVEL routes (positive layout invariant).** `customer_introduction` is deliberately mounted
  outside `(shop)` (`page.tsx:13` comment) so the shared `ClientBottomNav` (`(shop)/layout.tsx:11-12`,
  `fixed bottom-0 z-20`) never renders — the same reason `customer_welcome` is collision-free. This is the
  **inverse** of the customer_product_detail / customer_favourites / customer_checkout 🔴 fixed-footer
  family: a page with its own sticky CTA avoids the bug entirely by not living under the shop shell.
  **No drift, no bug** — recorded as the clean-side data point for the fixed-footer invariant.
- **Shared `staff_tasks` table has NO mutation path beyond INSERT — root of bugs on BOTH admin_task_board
  AND admin_todo_list (code bug, task-domain root).** `querier.go` exposes 5 task methods (1 INSERT + 4
  reads, `querier.go:28,42,56-58`), **none an UPDATE/DELETE**; `CreateStaffTask` hardcodes `status='pending'`
  (`tasks.sql.go:16`); the complete task route set is 3 lines (`main.go:320-322`: stats/list/create) — no
  `PATCH /admin/tasks/:id/status`, no `DELETE`. Two consequences ripple to both consumer pages:
  (1) **admin_task_board** — every status-derived KPI/column is permanently 0/false (Bug 1); (2)
  **admin_todo_list** — the modal's "Cập nhật" (edit) button (`CreateEditTaskModal.tsx:187`) calls
  `createTask.mutate` regardless of mode (`TodoPageClient.tsx:68`, no `updateTask` anywhere in fe/ — grep)
  → editing a task **silently inserts a duplicate row**. Both surfaces are **manager+ gated** and there is
  **no read surface for the assigned staff** (no task ref in `(dashboard)/{kds,cashier,pos}` — grep). One
  BE fix (add a status-transition + update path) unblocks both pages. **Code bug needing a MASTER row**;
  logged in `admin_task_board/TASK_BOARD_BUGS.md` Bug 1 + `admin_task_board/COMPARISON_DOC_VS_CODE_DETAILED.md`
  headlines #1 + #6. Re-verify on the **admin_todo_list** future run (it shares the exact table + the
  `useTodoTasks`/`useCreateTask` hooks, `useTodoTasks.ts`).
  **admin_todo_list run (2026-06-24) CONFIRMED — unchanged:** the edit-duplicate path holds verbatim
  (`TodoPageClient.tsx:61-80` always `createTask.mutate`, `:187` label-only "Cập nhật"), route set still
  3 lines (`main.go:320-322`, grep no `PATCH`/`DELETE /admin/tasks`), `UpdateTaskPayload` (`task.ts`) still
  has no API fn, `staff_tasks.deleted_at`/`completed_at` still never written (soft-delete/completion scaffold,
  no write path). Logged in `admin_todo_list/COMPARISON_DOC_VS_CODE_DETAILED.md` headline #1 + Action #1.
  One BE fix (`PATCH /admin/tasks/:id` + status-transition + `DELETE`) still unblocks both pages.

---

## Pages — Copy-Paste Queue

> Every page folder under `08_pages/`. Copy the command, paste it, run. Mark **Status** ✅ when its
> 3-file set is done (and add its row to the table above). 33 pages · 27 done · 6 to go.

### customer/ (13)

| Status | Page | Command |
|---|---|---|
| ✅ | customer_menu | `/comparison-doc customer_menu` |
| ✅ | customer_welcome | `/comparison-doc customer_welcome` |
| ✅ | customer_table_qr | `/comparison-doc customer_table_qr` |
| ✅ | customer_introduction | `/comparison-doc customer_introduction` |
| ✅ | customer_product_detail | `/comparison-doc customer_product_detail` |
| ✅ | customer_combo_detail | `/comparison-doc customer_combo_detail` |
| ✅ | customer_favourites | `/comparison-doc customer_favourites` |
| ✅ | customer_checkout | `/comparison-doc customer_checkout` |
| ✅ | customer_order_list | `/comparison-doc customer_order_list` |
| ✅ | customer_order_detail | `/comparison-doc customer_order_detail` |
| ✅ | customer_tracking | `/comparison-doc customer_tracking` |
| ✅ | customer_profile | `/comparison-doc customer_profile` |
| ✅ | customer_settings | `/comparison-doc customer_settings` |

### staff/ (5)

| Status | Page | Command |
|---|---|---|
| ✅ | staff_login | `/comparison-doc staff_login` |
| ✅ | staff_register | `/comparison-doc staff_register` |
| ✅ | staff_kds | `/comparison-doc staff_kds` |
| ✅ | staff_pos | `/comparison-doc staff_pos` |
| ✅ | staff_cashier_payment | `/comparison-doc staff_cashier_payment` |

### admin/ (13)

| Status | Page | Command |
|---|---|---|
| ✅ | admin_overview | `/comparison-doc admin_overview` |
| ✅ | admin_summary | `/comparison-doc admin_summary` |
| ✅ | admin_products | `/comparison-doc admin_products` |
| ✅ | admin_categories | `/comparison-doc admin_categories` |
| ✅ | admin_toppings | `/comparison-doc admin_toppings` |
| ✅ | admin_combos | `/comparison-doc admin_combos` |
| ✅ | admin_ingredients | `/comparison-doc admin_ingredients` |
| ⬜ | admin_storage | `/comparison-doc admin_storage` |
| ✅ | admin_staff | `/comparison-doc admin_staff` |
| ✅ | admin_task_board | `/comparison-doc admin_task_board` |
| ✅ | admin_todo_list | `/comparison-doc admin_todo_list` |
| ⬜ | admin_training | `/comparison-doc admin_training` |
| ⬜ | admin_marketing | `/comparison-doc admin_marketing` |

### public/ (2)

| Status | Page | Command |
|---|---|---|
| ⬜ | public_landing | `/comparison-doc public_landing` |
| ⬜ | public_legal | `/comparison-doc public_legal` |

> **Run all in one go:** paste them in sequence, or batch via `/loop` —
> `/loop /comparison-doc <next ⬜ page>` and advance through the queue.
