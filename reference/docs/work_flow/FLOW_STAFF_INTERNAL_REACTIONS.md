# Staff Internal Operations — Actor Reactions Overview

> One row = one internal admin/management action.
> Each column = what that staff role sees or can do at that moment.
> Complements `FLOW_OVERVIEW_REACTIONS.md` (which covers order lifecycle).

---

## Actor Glossary

| Label | Role | Where |
|---|---|---|
| **Admin** | Full access — manages everyone including managers | `/admin/*` |
| **Manager** | Manages chef / cashier / staff. Cannot touch manager/admin accounts | `/admin/*` |
| **Chef** | Kitchen only — sees menu/product changes via KDS | `/kds` |
| **Cashier** | POS only — sees product changes on POS menu | `/pos` |
| **Client** | Customer — sees menu changes on next page load | `/menu` |

**Hierarchy rule:** You can only create/edit/deactivate accounts with role ≤ your role − 1.

---

## A — Product & Menu Operations

| # | Event | Who Can Trigger | Admin | Manager | Chef `/kds` | Cashier `/pos` | Client `/menu` |
|---|---|---|---|---|---|---|---|
| **A1** | **Product added** | Admin · Manager | Sees new product in product list | Sees new product in product list | New product appears in next order card (if ordered) | New product appears in POS menu immediately | New product appears on menu on next page load |
| **A2** | **Product edited** *(name / price / image)* | Admin · Manager | Sees updated product | Sees updated product | Item names/prices update on board for new orders | POS menu updates immediately | Menu updates on next page load |
| **A3** | **Product deactivated / deleted** | Admin · Manager | Product removed from list | Product removed from list | No new orders can include this item | Item disappears from POS menu | Item disappears from menu |
| **A4** | **Topping added** | Admin · Manager | Sees new topping in topping list | Sees new topping in topping list | ← no direct change | Topping appears as option when building order | Topping appears on product detail |
| **A5** | **Topping edited / removed** | Admin · Manager | Sees change in topping list | Sees change in topping list | ← no direct change | POS topping list updates | Menu topping list updates on reload |
| **A6** | **Category added / edited** | Admin · Manager | Sees new category tab in product list | Sees new category tab | ← no direct change | New tab appears on POS product list | New tab appears on menu |
| **A7** | **Combo created** | Admin · Manager | Sees new combo | Sees new combo | Combo items appear on KDS card when ordered | Combo selectable on POS | Combo visible on menu |
| **A8** | **Combo edited / removed** | Admin · Manager | Change reflected in combo list | Change reflected | Affects how items group on KDS card | POS combo list updates | Menu combo list updates |

---

## B — Staff Account Management

| # | Event | Who Can Trigger | Admin `/admin/staff` | Manager `/admin/staff` | Target Staff member | Other Staff |
|---|---|---|---|---|---|---|
| **B1** | **Staff account created** *(chef / cashier / staff)* | Admin · Manager | Sees new row in staff list | Sees new row in staff list | Receives credentials (offline / out-of-band) — can now log in | ← no change |
| **B2** | **Manager account created** | Admin only | Sees new row in staff list | ❌ cannot do this | Receives credentials — can now log in | ← no change |
| **B3** | **Staff role changed** | Admin (any) · Manager (only if target role ≤ manager−1) | Sees updated role badge | Sees updated role badge (if allowed) | Next login redirect changes to match new role | ← no change |
| **B4** | **Staff account deactivated** *(soft delete)* | Admin · Manager (if target role < own) | Account hidden from list, not deleted | Account hidden from list | Current session invalidated on next 401 — redirected to `/login` | ← no change |
| **B5** | **Manager tries to manage another manager** | Manager | ← no change | 403 `INSUFFICIENT_ROLE` shown — blocked | ← no change | ← no change |
| **B6** | **Staff session list viewed** | Admin · Manager · Staff (own only) | Can view all sessions | Can view sessions of lower-role staff | Can view own sessions | ← no change |
| **B7** | **Staff session revoked** | Admin · Manager (target role < own) | Session revoked immediately | Session revoked | Next request → 401 → interceptor fails refresh → redirect `/login` | ← no change |

---

## C — Table & QR Code Management (Marketing)

| # | Event | Who Can Trigger | Admin | Manager | Chef `/kds` | Cashier `/pos` | Client |
|---|---|---|---|---|---|---|---|
| **C1** | **New table added** | Admin · Manager | New table row in marketing page | New table row | ← no change | ← no change | ← no change |
| **C2** | **QR code generated for table** | Admin · Manager | QR code shown — can download / print | QR code shown — can download / print | ← no change | ← no change | Can scan new QR → enters system for that table |
| **C3** | **QR code regenerated** *(old QR invalidated)* | Admin · Manager | New QR shown, old QR no longer works | New QR shown | ← no change | ← no change | Old QR scan → `INVALID_QR_TOKEN` error · must use new QR |
| **C4** | **Product catalogue printed** | Admin · Manager | `window.print()` — browser print dialog with full product list + images | `window.print()` — same | ← no change | ← no change | ← no change |

---

## D — Training Management

| # | Event | Who Can Trigger | Admin | Manager `/admin/training` | Target Staff | Other Staff |
|---|---|---|---|---|---|---|
| **D1** | **Training module created** | Admin · Manager | Sees new module in list | Sees new module in list — can assign to staff | ← no direct notification | ← no change |
| **D2** | **Training assigned to staff** | Admin · Manager | Assignment visible in tracking table | Assignment visible | Can see their training queue | ← no change |
| **D3** | **Staff marks training complete** | The assigned staff member | Completion visible in table | Status badge updates to ✅ in `CompletionTrackingTable` | Own progress shown | ← no change |
| **D4** | **Manager reviews training progress** | Manager (read) | Full view | Opens `TrainingProgressModal` → 3-step timeline + quiz attempts | ← no change | ← no change |
| **D5** | **Manager adds note to training** | Manager | Note visible | Note saved via `PATCH /training/:id/progress` — visible in modal | Can see manager note | ← no change |
| **D6** | **Training filtered by role** | Admin · Manager | See all roles | Filter tabs (Zone B): All / Chef / Cashier / Staff | ← no change | ← no change |

---

## E — Overview & Monitoring (Internal Staff View)

| # | Event | Who Can Trigger | Admin | Manager `/admin/overview` | Chef `/kds` | Cashier `/pos` |
|---|---|---|---|---|---|---|
| **E1** | **"Kiểm tra" toggled on a table** | Manager | ← no change | Table marked — prep panel appears below with that table's items | ← no change | ← no change |
| **E2** | **Prep panel reviewed** | Manager | ← no change | `PrepPanel` shows all items for checked tables — checklist for kitchen | ← no change | ← no change |
| **E3** | **Stat cards refreshed** *(every 30 s)* | Automatic | ← no change | 4 cards update: tables serving / items waiting / items preparing / urgent | ← no change | ← no change |
| **E4** | **Table urgency colour changes** | Automatic (elapsed time) | ← no change | Table border: orange (<10 min) → yellow (10–20 min) → red (>20 min) | ← no change | ← no change |
| **E5** | **"Mang đi" confirmed** | Manager | ← no change | Order confirmed with take-away context → same as standard confirm | Order appears on board | ← no change |

---

## F — Inventory / Storage Management (`/admin/storage`)

> Route: `/(dashboard)/admin/storage` · Guard: `AuthGuard + RoleGuard(['admin', 'manager'])`
> Chef · Cashier · Staff have **no access** to this page.

| # | Event | Who Can Trigger | Admin `/admin/storage` | Manager `/admin/storage` | Chef | Cashier | Staff |
|---|---|---|---|---|---|---|---|
| **F1** | **Ingredient added** | Admin · Manager | New row appears in ingredient table immediately | New row appears in ingredient table immediately | ❌ no access | ❌ no access | ❌ no access |
| **F2** | **Ingredient edited** *(name / quantity / unit / import date / shelf days)* | Admin · Manager | Row updates inline | Row updates inline | ❌ no access | ❌ no access | ❌ no access |
| **F3** | **Ingredient deleted** | Admin only | Row removed from table | ❌ blocked — delete button hidden for Manager | ❌ no access | ❌ no access | ❌ no access |
| **F4** | **Ingredient status computed** *(fresh / expiring / expired)* | Automatic (server: `importDate + shelfDays`) | Status badge shown in table | Status badge shown in table | ❌ no access | ❌ no access | ❌ no access |
| **F5** | **Filter by status applied** | Admin · Manager | Table filters to selected status | Table filters to selected status | ❌ no access | ❌ no access | ❌ no access |

---

## G — Staff Task List / Todo (`/admin/todo`)

> Route: `/(dashboard)/admin/todo` · Guard: `AuthGuard + RoleGuard(['admin', 'manager', 'staff'])`
> Chef · Cashier have **no access**. Staff can only view and toggle their own tasks.

| # | Event | Who Can Trigger | Admin `/admin/todo` | Manager `/admin/todo` | Staff `/admin/todo` | Chef | Cashier |
|---|---|---|---|---|---|---|---|
| **G1** | **Task created** | Admin · Manager | Task appears in table — all columns editable | Task appears in table — all columns editable | ← no change (own tasks only shown) | ❌ no access | ❌ no access |
| **G2** | **Task assigned to staff member** | Admin · Manager | Assignment row shown with assignee name | Assignment row shown with assignee name | If assigned to self → appears in own list | ❌ no access | ❌ no access |
| **G3** | **Task status toggled** *(pending ↔ done)* | Admin · Manager (any task) · Staff (own task only) | Checkbox updates instantly (optimistic) | Checkbox updates instantly (optimistic) | Checkbox on own task only | ❌ no access | ❌ no access |
| **G4** | **Task edited** *(title / due date / priority)* | Admin · Manager | Edit modal opens — all fields | Edit modal opens — all fields | ❌ edit button hidden | ❌ no access | ❌ no access |
| **G5** | **Task deleted** | Admin · Manager | Row removed | Row removed | ❌ delete button hidden | ❌ no access | ❌ no access |
| **G6** | **Filter applied** *(by status / assignee / date)* | Admin · Manager | Table filters globally | Table filters globally | Filters apply to own tasks only | ❌ no access | ❌ no access |
| **G7** | **Stats row clicked** *(e.g. "3 overdue")* | Admin · Manager | Filter bar syncs to that status automatically | Filter bar syncs to that status automatically | ← N/A | ❌ no access | ❌ no access |

---

## H — Staff Task Board (`/admin/staff-task-board`)

> Route: `/(dashboard)/admin/staff-task-board` · Guard: `AuthGuard + RoleGuard(['admin', 'manager'])`
> Chef · Cashier · Staff have **no access** to this page.

| # | Event | Who Can Trigger | Admin `/admin/staff-task-board` | Manager `/admin/staff-task-board` | Chef | Cashier | Staff |
|---|---|---|---|---|---|---|---|
| **H1** | **Task created and assigned to a staff member** | Admin · Manager | New task appears under that staff's expanded row | New task appears under that staff's expanded row | ❌ no access | ❌ no access | ❌ no access |
| **H2** | **Staff row expanded** *(click to show daily tasks)* | Admin · Manager | `ExpandedRow` renders for that `staffId` + date | Same | ❌ no access | ❌ no access | ❌ no access |
| **H3** | **Date filter changed** | Admin · Manager | All staff task rows reload for the new date | All staff task rows reload for the new date | ❌ no access | ❌ no access | ❌ no access |
| **H4** | **Metrics row refreshed** *(total / done / pending / overdue)* | Automatic on data load | 4 metric cards update | 4 metric cards update | ❌ no access | ❌ no access | ❌ no access |
| **H5** | **Filter by staff / role applied** | Admin · Manager | Table narrows to matching staff rows | Table narrows to matching staff rows | ❌ no access | ❌ no access | ❌ no access |
| **H6** | **Staff pre-selected in CreateTaskModal** *(click "+" on a row)* | Admin · Manager | Modal opens with that staff pre-filled | Modal opens with that staff pre-filled | ❌ no access | ❌ no access | ❌ no access |

---

## I — Revenue Summary (`/admin/summary`)

> Route: `/(dashboard)/admin/summary` · Guard: `AuthGuard + RoleGuard(['admin', 'manager'])`
> Chef · Cashier · Staff have **no access** to this page.

| # | Event | Who Can Trigger | Admin `/admin/summary` | Manager `/admin/summary` | Chef | Cashier | Staff |
|---|---|---|---|---|---|---|---|
| **I1** | **Date range filter applied** | Admin · Manager | Revenue charts and tables reload for selected range | Revenue charts and tables reload for selected range | ❌ no access | ❌ no access | ❌ no access |
| **I2** | **Revenue data loaded** | Automatic on page mount | Charts render: revenue by day / category / product | Same | ❌ no access | ❌ no access | ❌ no access |
| **I3** | **Export / print triggered** | Admin · Manager | `window.print()` or download — browser dialog | Same | ❌ no access | ❌ no access | ❌ no access |

---

## Permission Matrix Summary

| Operation | Admin | Manager | Staff | Cashier | Chef | Client |
|---|---|---|---|---|---|---|
| Product / Topping / Combo CRUD | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Category CRUD | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create staff (chef/cashier/staff) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create manager | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Deactivate staff (role < own) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Change role (role < own − 1) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Generate / regenerate QR | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign training | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Complete own training | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View staff sessions | ✅ (all) | ✅ (lower role) | ✅ (own only) | ✅ (own only) | ✅ (own only) | ❌ |
| Revoke staff session | ✅ | ✅ (lower role) | ❌ | ❌ | ❌ | ❌ |
| Ingredient CRUD (add / edit) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ingredient delete | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create / edit / delete todo tasks | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Toggle own todo task status | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View todo task board (all staff) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create / assign staff board tasks | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View revenue summary | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Related Files

| File | Covers |
|---|---|
| [FLOW_OVERVIEW_REACTIONS.md](FLOW_OVERVIEW_REACTIONS.md) | Order lifecycle — how client + staff react per order event |
| [FLOW_01_ENTRY_POINTS.md](FLOW_01_ENTRY_POINTS.md) | Login + role-based redirect |
| [FLOW_09_AUTH_TOKENS.md](FLOW_09_AUTH_TOKENS.md) | Token storage + session rules |
| `docs/spec/Spec_7_Staff_Management.md` | Staff CRUD API full spec |
| `docs/spec/Spec_9_Admin_Dashboard_Pages.md` | Admin pages spec (overview + marketing) |
| `docs/spec/Spec_2_Products_API_v2_CORRECTED.md` | Product / topping / combo API spec |
| `docs/fe/wireframes/admin_main/admin_main_storage/tech_description.md` | Storage page RBAC + component spec |
| `docs/fe/wireframes/admin_main/admin_main_todo_list/tech_description.md` | Todo list page RBAC + component spec |
| `docs/fe/wireframes/admin_main/admin_main_staff_task_boad/tech_description.md` | Staff task board RBAC + component spec |
| `docs/fe/wireframes/admin_main/admin_summary/tech_description.md` | Revenue summary RBAC + component spec |
| `docs/core/MASTER_v1.2.md §3` | Authoritative RBAC role hierarchy — resolve any conflict here |
