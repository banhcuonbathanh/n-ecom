# FE Pages Index — Every Page, One Wireframe

> **TL;DR:** Complete inventory of every frontend page (Next.js App Router). Each page has its own
> file in this folder containing an ASCII wireframe, zone→component table, key interactions, and
> links to business logic. Status markers: ✅ implemented · 🔮 PLANNED (owner decision 2026-06-12,
> not in code yet). Grouped by role: Customer → Staff → Admin.

---

## How to Read This Folder

- **One file per page.** The ASCII wireframe in each file is the shared visual contract between
  owner and Claude — change the page, update the drawing.
- Wireframes of ✅ pages are traced from the real `page.tsx` + its components.
  Wireframes of 🔮 pages are **proposed — owner to confirm**.
- Customer pages are mobile-first (one column, bottom tab bar).
  Staff/Admin pages are desktop (tab nav header, wide tables).
- **One model, one home (Rule #9).** A page file lists *which* endpoints it calls and the *zone →
  component* mapping — it must **not** re-describe an object model's fields. Link to the model's
  home file in [../02_spec/object/OBJECT_MODELS.md](../02_spec/object/OBJECT_MODELS.md) instead (e.g. Order →
  [OBJECT_MODEL_ORDER.md](../02_spec/object/OBJECT_MODEL_ORDER.md)).

---

## Customer Pages (public / guest JWT)

| Route | Status | Purpose | File |
|---|---|---|---|
| `/` | ✅ | Marketing/demo landing — feature tour, table QR shortcuts, staff quick login | [public_landing.md](public/public_landing/public_landing.md) · [BE](public/public_landing/public_landing_be.md) · [x-page](public/public_landing/public_landing_crosspage_dataflow.md) · [loading](public/public_landing/public_landing_loading.md) · [scenario](public/public_landing/SCENARIO_LANDING_DEMO.md) · [bugs](public/public_landing/LANDING_BUGS.md) |
| `/welcome` | ✅ | Restaurant-branded welcome page — hero, story, signature dishes, hours, "Xem thực đơn" CTA | [customer_welcome.md](customer/customer_welcome/customer_welcome.md) · [scenario](customer/customer_welcome/SCENARIO_WELCOME.md) · _(static — no BE/dataflow/loading docs)_ |
| `/introduction` | 🔮 PLANNED | Dedicated about-the-restaurant page — story, photos, map, hours, contact | [customer_introduction.md](customer/customer_introduction/customer_introduction.md) |
| `/table/:tableId` | ✅ | QR landing — exchanges QR token for guest JWT, redirects to `/menu` | [customer_table_qr.md](customer/customer_table_qr/customer_table_qr.md) · [BE](customer/customer_table_qr/customer_table_qr_be.md) · [x-page](customer/customer_table_qr/customer_table_qr_crosspage_dataflow.md) · [loading](customer/customer_table_qr/customer_table_qr_loading.md) · [scenario](customer/customer_table_qr/SCENARIO_TABLE_SCAN.md) · [bugs](customer/customer_table_qr/TABLE_QR_BUGS.md) |
| `/menu` | ✅ | Browse products + combos, build cart, submit order | [customer_menu.md](customer/customer_menu/customer_menu.md) · [BE](customer/customer_menu/customer_menu_be.md) |
| `/menu/product/:id` | ✅ | Product detail — hero image, toppings, quantity, add to cart | [customer_product_detail.md](customer/customer_product_detail/customer_product_detail.md) · [BE](customer/customer_product_detail/customer_product_detail_be.md) · [crosspage](customer/customer_product_detail/customer_product_detail_crosspage_dataflow.md) · [loading](customer/customer_product_detail/customer_product_detail_loading.md) · [scenario](customer/customer_product_detail/SCENARIO_PRODUCT_ADD.md) |
| `/menu/combo/:id` | ✅ | Combo detail — included items, quantity, add to cart | [customer_combo_detail.md](customer/customer_combo_detail/customer_combo_detail.md) · [BE](customer/customer_combo_detail/customer_combo_detail_be.md) · [crosspage](customer/customer_combo_detail/customer_combo_detail_crosspage_dataflow.md) · [loading](customer/customer_combo_detail/customer_combo_detail_loading.md) · [scenario](customer/customer_combo_detail/SCENARIO_COMBO_ADD.md) · [bugs](customer/customer_combo_detail/COMBO_BUGS.md) |
| `/menu/favourites` (+ `/save`, `/sets`) | ✅ | Favourites list, save-as-set form, saved sets | [customer_favourites.md](customer/customer_favourites/customer_favourites.md) · [BE](customer/customer_favourites/customer_favourites_be.md) · [x-comp](customer/customer_favourites/customer_favourites_crosscomponent_dataflow.md) · [x-page](customer/customer_favourites/customer_favourites_crosspage_dataflow.md) · [loading](customer/customer_favourites/customer_favourites_loading.md) · [scenario](customer/customer_favourites/SCENARIO_FAVOURITES.md) |
| `/menu/settings` | ✅ | Local display preferences (name, table label) | [customer_settings.md](customer/customer_settings/customer_settings.md) |
| `/checkout` | ✅ | Non-table order form — name/phone/payment method (online path) | [customer_checkout.md](customer/customer_checkout/customer_checkout.md) · [BE](customer/customer_checkout/customer_checkout_be.md) · [crosspage](customer/customer_checkout/customer_checkout_crosspage_dataflow.md) · [loading](customer/customer_checkout/customer_checkout_loading.md) · [scenario](customer/customer_checkout/SCENARIO_CHECKOUT_ORDER.md) · [bugs](customer/customer_checkout/CHECKOUT_BUGS.md) |
| `/order` | ✅ | Order history list (from localStorage cache) | [customer_order_list.md](customer/customer_order_list/customer_order_list.md) · [BE](customer/customer_order_list/customer_order_list_be.md) · [crosspage](customer/customer_order_list/customer_order_list_crosspage_dataflow.md) · [loading](customer/customer_order_list/customer_order_list_loading.md) · [scenario](customer/customer_order_list/SCENARIO_ORDER_HISTORY.md) |
| `/order/:id` | ✅ | Live order detail via SSE — item progress, cancel, add more | [customer_order_detail.md](customer/customer_order_detail/customer_order_detail.md) · [BE](customer/customer_order_detail/customer_order_detail_be.md) · [crosspage](customer/customer_order_detail/customer_order_detail_crosspage_dataflow.md) · [loading](customer/customer_order_detail/customer_order_detail_loading.md) · [scenario](customer/customer_order_detail/SCENARIO_ORDER_DETAIL.md) · [bugs](customer/customer_order_detail/ORDER_DETAIL_BUGS.md) |
| `/tracking` | ✅ | Live table/queue monitoring view via SSE | [customer_tracking.md](customer/customer_tracking/customer_tracking.md) · [BE](customer/customer_tracking/customer_tracking_be.md) · [crosscomp](customer/customer_tracking/customer_tracking_crosscomponent_dataflow.md) · [loading](customer/customer_tracking/customer_tracking_loading.md) · [scenario](customer/customer_tracking/SCENARIO_TRACK_ORDER.md) |
| `/profile` | ✅ | Customer profile — avatar, personal info form, quick nav (⚠️ BE endpoints unimplemented — see bugs) | [customer_profile.md](customer/customer_profile/customer_profile.md) · [BE](customer/customer_profile/customer_profile_be.md) · [loading](customer/customer_profile/customer_profile_loading.md) · [scenario](customer/customer_profile/SCENARIO_PROFILE.md) · [bugs](customer/customer_profile/PROFILE_BUGS.md) |
| `/privacy-policy` · `/terms` | ✅ | Static legal pages | [public_legal.md](public/public_legal/public_legal.md) |

> 🔮 PLANNED (cross-cutting): **online-ordering entry** — customer login + order from home
> (pickup/delivery). Touches `/welcome`, `/menu`, `/checkout`. Noted inside those page files.

## Staff Pages (role: chef / cashier / staff)

| Route | Status | Purpose | File |
|---|---|---|---|
| `/login` | ✅ | Staff login form — role-based redirect after auth | [staff_login.md](staff/staff_login/staff_login.md) · [BE](staff/staff_login/staff_login_be.md) · [x-page](staff/staff_login/staff_login_crosspage_dataflow.md) · [loading](staff/staff_login/staff_login_loading.md) · [scenario](staff/staff_login/SCENARIO_STAFF_LOGIN.md) · [bugs](staff/staff_login/LOGIN_BUGS.md) |
| `/register` | ✅ | Account registration form (creates a cashier staff account) | [staff_register.md](staff/staff_register/staff_register.md) · [BE](staff/staff_register/staff_register_be.md) · [x-page](staff/staff_register/staff_register_crosspage_dataflow.md) · [loading](staff/staff_register/staff_register_loading.md) · [scenario](staff/staff_register/SCENARIO_REGISTER.md) · [bugs](staff/staff_register/REGISTER_BUGS.md) |
| `/kds` | ✅ | Kitchen Display System — live cooking board (WS) | [staff_kds.md](staff/staff_kds/staff_kds.md) · [BE](staff/staff_kds/staff_kds_be.md) · [x-page](staff/staff_kds/staff_kds_crosspage_dataflow.md) · [loading](staff/staff_kds/staff_kds_loading.md) · [scenario](staff/staff_kds/SCENARIO_KDS_COOK.md) · [bugs](staff/staff_kds/KDS_BUGS.md) |
| `/pos` | ✅ | POS — cashier builds walk-in orders | [staff_pos.md](staff/staff_pos/staff_pos.md) · [BE](staff/staff_pos/staff_pos_be.md) · [x-page](staff/staff_pos/staff_pos_crosspage_dataflow.md) · [loading](staff/staff_pos/staff_pos_loading.md) · [scenario](staff/staff_pos/SCENARIO_POS_ORDER.md) · [bugs](staff/staff_pos/POS_BUGS.md) |
| `/cashier/payment/:id` | ✅ | Bill + payment method + QR + print receipt (⚠️ payment broken from this screen — see bugs) | [staff_cashier_payment.md](staff/staff_cashier_payment/staff_cashier_payment.md) · [BE](staff/staff_cashier_payment/staff_cashier_payment_be.md) · [x-page](staff/staff_cashier_payment/staff_cashier_payment_crosspage_dataflow.md) · [loading](staff/staff_cashier_payment/staff_cashier_payment_loading.md) · [scenario](staff/staff_cashier_payment/SCENARIO_CASHIER_BILL.md) · [bugs](staff/staff_cashier_payment/PAYMENT_BUGS.md) |
| `/orders/live` | ⚠ stub | Placeholder only — renders a TODO line; superseded by `/admin/overview` | — (no wireframe; no UI) |
| `/dev-login` | ✅ dev-only | Auto-login helper for development (spinner, no UI to design) | — (noted in [staff_login.md](staff/staff_login/staff_login.md)) |

## Admin Pages (role: manager / admin — all share the admin tab-nav shell)

| Route | Status | Purpose | File |
|---|---|---|---|
| `/admin` | ✅ | Redirect → `/admin/overview` (no UI) | — |
| `/admin/overview` | ✅ | Live floor — stat cards, active orders, tables, paid/cancel logs | [admin_overview.md](admin/admin_overview/admin_overview.md) · [BE](admin/admin_overview/admin_overview_be.md) · [x-comp](admin/admin_overview/admin_overview_crosscomponent_dataflow.md) · [x-page](admin/admin_overview/admin_overview_crosspage_dataflow.md) · [loading](admin/admin_overview/admin_overview_loading.md) · [scenario](admin/admin_overview/SCENARIO_OVERVIEW_FLOOR.md) |
| `/admin/summary` | ✅ | Reports — revenue KPIs, top dishes, staff performance, low-stock alerts | [admin_summary.md](admin/admin_summary/admin_summary.md) · [BE](admin/admin_summary/admin_summary_be.md) · [x-page](admin/admin_summary/admin_summary_crosspage_dataflow.md) · [loading](admin/admin_summary/admin_summary_loading.md) · [scenario](admin/admin_summary/SCENARIO_SUMMARY_REVIEW.md) |
| `/admin/products` | ✅ | Product CRUD | [admin_products.md](admin/admin_products/admin_products.md) · [BE](admin/admin_products/admin_products_be.md) · [x-comp](admin/admin_products/admin_products_crosscomponent_dataflow.md) · [x-page](admin/admin_products/admin_products_crosspage_dataflow.md) · [loading](admin/admin_products/admin_products_loading.md) · [scenario](admin/admin_products/SCENARIO_PRODUCT_CRUD.md) · [bugs](admin/admin_products/PRODUCTS_BUGS.md) |
| `/admin/combos` | ✅ | Combo CRUD | [admin_combos.md](admin/admin_combos/admin_combos.md) · [BE](admin/admin_combos/admin_combos_be.md) · [x-page](admin/admin_combos/admin_combos_crosspage_dataflow.md) · [loading](admin/admin_combos/admin_combos_loading.md) · [scenario](admin/admin_combos/SCENARIO_COMBOS_CRUD.md) · [bugs](admin/admin_combos/COMBOS_BUGS.md) |
| `/admin/categories` | ✅ | Category CRUD | [admin_categories.md](admin/admin_categories/admin_categories.md) · [BE](admin/admin_categories/admin_categories_be.md) · [x-page](admin/admin_categories/admin_categories_crosspage_dataflow.md) · [loading](admin/admin_categories/admin_categories_loading.md) · [scenario](admin/admin_categories/SCENARIO_CATEGORY_CRUD.md) · [bugs](admin/admin_categories/CATEGORIES_BUGS.md) |
| `/admin/toppings` | ✅ | Topping CRUD | [admin_toppings.md](admin/admin_toppings/admin_toppings.md) · [BE](admin/admin_toppings/admin_toppings_be.md) · [x-page](admin/admin_toppings/admin_toppings_crosspage_dataflow.md) · [loading](admin/admin_toppings/admin_toppings_loading.md) · [scenario](admin/admin_toppings/SCENARIO_TOPPING_CRUD.md) |
| `/admin/staff` | ✅ | Staff account CRUD — roles, activate/deactivate | [admin_staff.md](admin/admin_staff/admin_staff.md) · [BE](admin/admin_staff/admin_staff_be.md) · [x-page](admin/admin_staff/admin_staff_crosspage_dataflow.md) · [loading](admin/admin_staff/admin_staff_loading.md) · [scenario](admin/admin_staff/SCENARIO_STAFF_MANAGE.md) |
| `/admin/staff/task-board` | ✅ | Per-staff task board — KPIs + expandable task table | [admin_task_board.md](admin/admin_task_board/admin_task_board.md) · [BE](admin/admin_task_board/admin_task_board_be.md) · [x-comp](admin/admin_task_board/admin_task_board_crosscomponent_dataflow.md) · [x-page](admin/admin_task_board/admin_task_board_crosspage_dataflow.md) · [loading](admin/admin_task_board/admin_task_board_loading.md) · [scenario](admin/admin_task_board/SCENARIO_ASSIGN_TASK.md) · [bugs](admin/admin_task_board/TASK_BOARD_BUGS.md) |
| `/admin/todo-list` | ✅ | Team to-do tasks — filter, cards/table, create/edit modal | [admin_todo_list.md](admin/admin_todo_list/admin_todo_list.md) · [BE](admin/admin_todo_list/admin_todo_list_be.md) · [x-comp](admin/admin_todo_list/admin_todo_list_crosscomponent_dataflow.md) · [x-page](admin/admin_todo_list/admin_todo_list_crosspage_dataflow.md) · [loading](admin/admin_todo_list/admin_todo_list_loading.md) · [scenario](admin/admin_todo_list/SCENARIO_TODO_ASSIGN.md) · [bugs](admin/admin_todo_list/TODO_BUGS.md) |
| `/admin/ingredients` | ✅ | Ingredient list + stock in/out movements | [admin_ingredients.md](admin/admin_ingredients/admin_ingredients.md) · [BE](admin/admin_ingredients/admin_ingredients_be.md) |
| `/admin/storage` | 🔮 PLANNED | Full inventory management — low-stock warnings, link availability to menu, run-out forecast (Tổng nhập / Dùng/ngày / Dự kiến hết — 🔮 STOR) | [admin_storage.md](admin/admin_storage/admin_storage.md) |
| `/admin/marketing` | ✅ | Marketing spend dashboard — budget KPIs, breakdown, campaign timeline | [admin_marketing.md](admin/admin_marketing/admin_marketing.md) · [BE](admin/admin_marketing/admin_marketing_be.md) · [loading](admin/admin_marketing/admin_marketing_loading.md) · [scenario](admin/admin_marketing/SCENARIO_MARKETING.md) |
| `/admin/training` | ✅ | Staff training — job guides + completion tracking | [admin_training.md](admin/admin_training/admin_training.md) · [BE](admin/admin_training/admin_training_be.md) · [x-comp](admin/admin_training/admin_training_crosscomponent_dataflow.md) · [x-page](admin/admin_training/admin_training_crosspage_dataflow.md) · [loading](admin/admin_training/admin_training_loading.md) · [scenario](admin/admin_training/SCENARIO_TRAINING_SETUP.md) · [bugs](admin/admin_training/TRAINING_BUGS.md) |

---

## Shared Shells (drawn once, referenced by every page file)

**Customer shell** — `(shop)/layout.tsx` wraps every customer page with `ClientBottomNav`:

```
┌────────────────────────────────────────┐
│              (page content)            │
├────────────────────────────────────────┤
│ [Menu] [Đơn Hàng] [Yêu Thích]          │  ← ClientBottomNav (fixed)
│        [Theo Dõi] [Cài Đặt]            │     /menu /order /menu/favourites
└────────────────────────────────────────┘     /tracking /menu/settings
```

**Admin shell** — `(dashboard)/admin/layout.tsx` wraps every `/admin/*` page
(AuthGuard + RoleGuard minRole=MANAGER + ThemeToggle):

```
┌──────────────────────────────────────────────────────────────┐
│ Quản trị hệ thống                              [ThemeToggle] │
│ Tổng quan·Tổng kết·Sản phẩm·Combo·Danh mục·Topping·Nhân viên │  ← tab nav
│ ·Công việc·Kho nguyên liệu·Marketing·Đào tạo                 │
├──────────────────────────────────────────────────────────────┤
│                       (page content)                         │
└──────────────────────────────────────────────────────────────┘
```

> 🔮 PROPOSED — a **mobile bottom bar** for admin (5 tabs + "Thêm" sheet), modelled on
> `ClientBottomNav`: [admin/ADMIN_BOTTOM_NAV.md](admin/ADMIN_BOTTOM_NAV.md). Not in code yet.

**Dashboard shell** — `(dashboard)/layout.tsx` wraps `/kds`, `/pos`, `/cashier/*`, `/admin/*`
with `OrdersWSProvider` (one shared WebSocket per browser session — no visual chrome).

---

## Deep Dive

- Component catalog + tokens → [../04_fe/DESIGN_SYSTEM.md](../04_fe/DESIGN_SYSTEM.md)
- End-to-end journeys → [../01_flow/CLIENT_FLOW.md](../01_flow/CLIENT_FLOW.md) · [../01_flow/STAFF_FLOW.md](../01_flow/STAFF_FLOW.md)
- Build a new page → [../05_dev_guide/NEW_PAGE_GUIDE.md](../05_dev_guide/NEW_PAGE_GUIDE.md)
