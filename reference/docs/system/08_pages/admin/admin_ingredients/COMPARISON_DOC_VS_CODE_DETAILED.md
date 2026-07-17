# Admin Ingredients — Doc vs. Code (Detailed Audit)

> **Scope:** audit the `/admin/ingredients` doc-set (`admin_ingredients.md` + `admin_ingredients_be.md`)
> against the running FE/BE code. Axes covered: **Area 1 — Component visuals & interactions** and
> **Area 5 — FE⇄BE data model & BE behaviour**. Areas 2–4 (cross-component / cross-page / loading
> dataflow) have **no doc file** in this folder, so there is nothing to compare — page-local React
> state and the loading states are folded into Area 1.
> **Read-only — no code or docs were changed.** Produced by 1 parallel Sonnet BE-trace agent + inline
> FE tracing; **every 🔴 was re-verified by hand** against the source. Branch:
> `experience_claude.md_system_1_test_iphon2_change_code`. Stack down → screenshots pending.
> Date: 2026-06-21.

---

## Executive Summary

| Area | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 1 — Component visuals & interactions | **Heavy visual drift** — the FE doc (`admin_ingredients.md`) was never updated after the table grew to 8 columns and the Nhập/Xuất trigger was dropped | 2 | 3 | 3 |
| 5 — FE⇄BE data model & BE behaviour | **`_be.md` is highly accurate** (all per-endpoint line-cites exact, all SQL bodies match) — but hides one real error-mapping bug and one wrong FK claim | 1 | 3 | 6 |

**Net:** the BE-view doc is one of the most source-faithful in the repo; the FE-view doc has drifted
badly. Two genuine **code bugs** surfaced (not just stale docs): a dead stock-movement feature and a
broken 404→500 error mapping.

---

## 🔴 RAISE-MY-VOICE headline findings (hand-verified)

1. **🔴 CODE BUG — the entire "Nhập / Xuất / Điều chỉnh" stock-movement feature is unreachable from the
   UI.** The doc makes it the page's headline (`admin_ingredients.md:27-33` draws the `StockMoveModal`;
   the Zones table row 4 and Key-Interactions bullet "**Nhập/Xuất** → StockMoveModal → posts a movement"
   describe it as core). In code, `StockMoveModal` exists (`page.tsx:28-104`) and is gated on
   `modal === 'move'` (`page.tsx:218`), **but nothing ever sets `modal` to `'move'`** — the only setters
   are `setModal('add')` (`page.tsx:182`) and `setModal('edit')` (`page.tsx:204`). `IngredientTable`
   exposes only `onEdit`/`onDelete` props (`IngredientTable.tsx:4-8`) — there is **no "Nhập/Xuất"
   button anywhere**. The component's own comment admits it: *"kept for Nhập/Xuất flow, outside main
   spec"* (`page.tsx:19`). So `StockMoveModal` + `postStockMovement` (`admin.api.ts:276`) + the BE
   `POST /admin/stock-movements` endpoint are all dead from this page. Stock can only ever change via
   `initialQuantity` at create time.

2. **🔴 DOC DRIFT — the IngredientTable is an 8-column grid; the doc draws 4 columns.** Real header
   (`IngredientTable.tsx:57-64`): **STT · Tên nguyên liệu · Đơn vị · Số lượng tồn · Ngày nhập · Hạn SD ·
   Trạng thái · Thao tác**. The doc ASCII (`admin_ingredients.md:19-22`) draws only **Nguyên liệu · Đơn
   vị · Tồn kho · Hành động**. Entire columns the doc never mentions: an index (STT), import date (Ngày
   nhập), expiry (Hạn SD), and a **status badge** (`StatusBadge` — Còn hàng/Sắp hết/Sắp hết hạn/Hết
   hàng, `IngredientTable.tsx:16-28`) with expiring-row highlighting (`rowClass`, `:31-33`).

3. **🔴 CODE BUG — `GET`/`PATCH /admin/ingredients/:id` on a missing id returns 500, not the documented
   404.** `_be.md` §3/§5 + the Error-Behaviour table claim `sql.ErrNoRows → 404 INGREDIENT_NOT_FOUND`.
   But `GetIngredientByID` wraps the error with `%w` (`ingredient_repo.go:147`:
   `fmt.Errorf("ingredient: get: %w", err)`), while the service tests it with **`==`**, not `errors.Is`
   (`ingredient_service.go:69`). A wrapped error is never `== sql.ErrNoRows`, so the 404 branch is
   skipped; `handleServiceError` only maps `*service.AppError` (`respond.go:24-36`) and falls through to
   **500 `COMMON_002`**. `UpdateIngredient` inherits the bug through its `GetIngredient` pre-check
   (`ingredient_service.go:89`). Only **DELETE** returns a correct 404, because `SoftDeleteIngredient`
   returns raw `sql.ErrNoRows` unwrapped (`ingredient_repo.go:216`).

---

## Dead / unreachable code found

- **`StockMoveModal`** (`page.tsx:28-104`) + its trigger branch (`page.tsx:218-220`) — unreachable; no
  code sets `modal='move'` (headline #1).
- **`postStockMovement`** (`admin.api.ts:276-277`) — zero live callers (only the dead `StockMoveModal`
  imports it).
- **409 toast** "Nguyên liệu này đã tồn tại." (`page.tsx:129-131`) — defensive dead branch: the
  `ingredients` table has **no UNIQUE on `name`** (`009_ingredients.sql:2-14`), so BE never emits 409.
- **422 toast** "đang được sử dụng." (`page.tsx:155-157`) — defensive dead branch: no service-layer
  in-use guard (`ingredient_service.go:107-114`) and the FK is CASCADE (see Area 5 #2), so BE never
  emits 422.
- **BE endpoints with zero FE callers** (handlers wired, no `admin.api.ts` export): `GET
  /ingredients/:id` (used only internally), `GET /ingredients/:id/movements`, and `getLowStock`
  (`admin.api.ts:264`) which is called by `/admin/summary`, not this page. Not dead BE — just unused here.

---

## Area 1 — Component visuals & interactions

**Verdict:** the FE doc never tracked the table redesign or the dropped Nhập/Xuất trigger. Two 🔴 + the
button/label cosmetics below.

| Component / Topic | Doc says (`admin_ingredients.md`) | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| **StockMoveModal trigger** | Zones row 4 + Key-Interactions: a "**Nhập/Xuất**" button on each row opens `StockMoveModal` | No such button; `modal='move'` never set (`page.tsx:182,204` set only add/edit); branch `page.tsx:218` dead; `IngredientTable` has only `onEdit`/`onDelete` (`IngredientTable.tsx:4-8`) | 🔴 | Either wire a "Nhập/Xuất" action (set `modal='move'`) or delete the dead modal + remove the feature from the doc |
| **IngredientTable columns** | 4 cols: Nguyên liệu · Đơn vị · Tồn kho · Hành động (`:19-22`) | 8 cols: STT · Tên nguyên liệu · Đơn vị · Số lượng tồn · Ngày nhập · Hạn SD · Trạng thái · Thao tác (`IngredientTable.tsx:57-64`) | 🔴 | Redraw the ASCII with all 8 columns + the status badge |
| **Status badge** | not drawn | `StatusBadge` Còn hàng✓/Sắp hết/Sắp hết hạn/Hết hàng (`IngredientTable.tsx:16-28`); expiring rows highlighted + ⚠ on STT (`:31-33,71-73`) | 🟡 | Add the badge + ⚠ row state to the doc |
| **Row action buttons** | `[Nhập/Xuất] [✎] [🗑]` icon trio (`:21`) | text buttons "Sửa" / "Xóa" (`IngredientTable.tsx:94,102`); delete via native `confirm()` (`:98`); no Nhập/Xuất | 🟡 | Doc: text buttons, two actions, confirm() dialog |
| **Add button label** | "+ Thêm nguyên liệu" (`:16`) | "+ Thêm NL" (`StoragePageHeader.tsx:35`) | 🟡 | Doc label → "+ Thêm NL" |
| **Header layout** | title + search + add (`:16`) | matches: "Kho nguyên liệu" + search "Tìm nguyên liệu..." + add (`StoragePageHeader.tsx:12,26,35`) | 🟢 | — |
| **Loading state** | "5 pulsing rows" (`:24`) | `[...Array(5)]` pulse blocks (`page.tsx:191-195`) | 🟢 | — |
| **Search-miss empty** | "Không tìm thấy…" (`:24`) | "Không tìm thấy nguyên liệu nào." (`page.tsx:197-199`); client filter by name (`page.tsx:173`) | 🟢 | — |

**Verified-matching:** header trio, client-side name filter, 5-row skeleton, search-miss copy, the
form-modal field set (name/unit/initialQuantity/warningThreshold/importDate/shelfDays — `IngredientFormModal.tsx:8-15`),
and the dynamic import of `IngredientFormModal` (`page.tsx:15-17`) all match the doc.

---

## Area 5 — FE⇄BE data model & BE behaviour

**Verdict:** `admin_ingredients_be.md` is **highly source-faithful** — every per-endpoint
handler/service/repo line-cite is exact, every quoted SQL body matches, and the status-derivation
logic is correct. Two substantive issues: the 404→500 mapping bug (headline #3) and a wrong FK claim.

| Topic | Doc says | Code reality (file:line) | Sev | Solution |
|---|---|---|---|---|
| **404 on missing id** | `GetIngredient`/`UpdateIngredient` map `sql.ErrNoRows → 404 INGREDIENT_NOT_FOUND` | repo wraps `%w` (`ingredient_repo.go:147`); service uses `==` not `errors.Is` (`ingredient_service.go:69`); `handleServiceError` no ErrNoRows fallback (`respond.go:24-36`) → **500 COMMON_002**. DELETE OK (raw ErrNoRows, `ingredient_repo.go:216`) | 🔴 | Code: use `errors.Is` in service OR return unwrapped `sql.ErrNoRows` from repo. Then doc holds |
| **DELETE in-use FK** | "if `product_ingredients` FK were RESTRICT, MySQL 1451 → 500" | FK is **`ON DELETE CASCADE`** on both `product_ingredients` + `stock_movements` (`009_ingredients.sql:22-23,38`) — never RESTRICT; **and** delete is a soft `UPDATE deleted_at` (`ingredient_repo.go:208-210`), so CASCADE never fires. Real behaviour: silent soft-delete leaving `product_ingredients` rows pointing at a hidden ingredient | 🟡 | Fix the doc's reasoning: no 1451, no cascade on soft-delete; the gap is dangling refs, not a 500 |
| **Route block lines** | `main.go:293–313` | ingredient routes `main.go:312–318`; `adminR` group `:307`; admin-only DELETE sub-group `admIngR` `:323–328` | 🟡 | Doc → `main.go:307–328` |
| **DELETE sub-group scope** | `admIngR` wraps only the ingredient DELETE | `admIngR` also wraps `DELETE /training/guides/:id` (`main.go:323-328`) | 🟡 | Note the sub-group is shared with training |
| **Provenance branch** | header: `experience_claude.md_system_1` | current branch `experience_claude.md_system_1_test_iphon2_change_code` | 🟢 | Refresh header |
| **FE `Ingredient` type** | mirrors `toIngredientJSON` (no `costPerUnit`) | `admin.api.ts:223-235` exact match; `cost_per_unit` absent both sides | 🟢 | — |
| **Create/Update/Movement inputs** | per handler binding | `CreateIngredientInput`/`UpdateIngredientInput`/`StockMovementInput` (`admin.api.ts:237-259`) match handler tags | 🟢 | — |
| **Status derivation** | out_of_stock(0) > expiring_soon(<now+7d) > low_stock(≤min) > in_stock | exact (`ingredient_handler.go:14-26`) | 🟢 | — |
| **SQL bodies (all 8)** | quoted per endpoint | all match (`ingredient_repo.go` 102-272); `GREATEST(0, stock-qty)` for `out` (`:231-238`) | 🟢 | — |
| **Non-transactional movement** | Flag #2: insert + separate UPDATE, no txn | confirmed (`ingredient_repo.go:221-248`) | 🟢 | — |
| **`created_by` not serialized** | Flag #3 | confirmed: scanned, omitted from `gin.H` (`ingredient_handler.go:213-220`) | 🟢 | — |

**Verified-matching:** all 8 endpoint paths/verbs/handler+service+repo names, every quoted SQL,
the RBAC model (adminR `authMW`+`AtLeast("manager")`; DELETE `AtLeast("admin")`), `StaffIDFromContext`
→ `created_by`, no-Redis caching, and the `initialQuantity`-direct-write / no-initial-movement gap
(Flag #1) are all accurate to the source.

---

## Consolidated Action List (priority order)

| # | Type | Action | Target file |
|---|---|---|---|
| 1 | 🔴 Code bug | Decide: wire a "Nhập/Xuất" trigger (`setModal('move')`) **or** delete the dead `StockMoveModal` + `postStockMovement` | `fe/.../ingredients/page.tsx`, `admin.api.ts` |
| 2 | 🔴 Code bug | Fix 404 mapping: `errors.Is(err, sql.ErrNoRows)` in service (or return unwrapped from repo) | `be/internal/service/ingredient_service.go:69,101`, `repository/ingredient_repo.go:147` |
| 3 | 🔴 Doc fix | Redraw the table ASCII (8 cols + status badge + ⚠ rows); fix Zones row 4 + Key-Interactions to drop/condition Nhập/Xuất | `admin_ingredients.md` |
| 4 | 🟡 Doc fix | Correct the FK "known gap" (CASCADE not RESTRICT; soft-delete → dangling refs, not 1451/500) | `admin_ingredients_be.md` |
| 5 | 🟡 Doc fix | Route block `293–313 → 307–328`; note `admIngR` also wraps `DELETE /training/guides/:id`; refresh provenance branch | `admin_ingredients_be.md` |
| 6 | 🟡 Doc fix | Add button label "+ Thêm NL"; row actions are text "Sửa"/"Xóa" + confirm() | `admin_ingredients.md` |
| 7 | 🟢 Code cleanup | Remove dead 409/422 toast branches (BE emits neither) — or add the BE guards if the rules are wanted | `page.tsx:129-131,155-157` |

> **CLAUDE.md note:** doc fixes (#3–#6) are one ALIGNed task; each code change (#1, #2, #7) must be
> registered in `docs/tasks/MASTER_TASK.md` **before any file is touched**. This audit changed nothing.
